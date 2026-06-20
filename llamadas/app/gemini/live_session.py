"""Sesión con Gemini Live API: audio bidireccional, barge-in y tool calling.

Diseño: una `GeminiLiveSession` por llamada. Recibe PCM16 16 kHz (ya convertido
por el AudioBridge), reenvía a Gemini, y entrega de vuelta:
  - chunks de audio PCM16 24 kHz  -> callback `on_audio`
  - señal de interrupción (barge-in) -> callback `on_interrupt`
  - transcripciones -> callback `on_transcript`
Las tool calls se ejecutan vía `app.gemini.tools.execute_tool` y se responden
en la misma sesión.

El SDK `google-genai` se importa de forma diferida para que el resto del paquete
(tests de tools/audio) no requiera la dependencia instalada.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Awaitable, Callable

from app.config import settings
from app.gemini import tools as tools_mod
from app.gemini.model_provider import default_plan, is_transient_error, sleep_backoff
from app.observability import metrics

logger = logging.getLogger(__name__)

AudioCallback = Callable[[bytes], Awaitable[None]]
SimpleCallback = Callable[[], Awaitable[None]]
TranscriptCallback = Callable[[str, str], Awaitable[None]]  # (rol, texto)


def _vad_config():
    """VAD afinado para latencia: menos silencio de fin de turno => responde antes.

    Solo ajusta el *endpointing* (cuándo Gemini decide que el usuario terminó);
    no toca la calidad de la voz. Ver settings.vad_* para calibrar.
    """
    from google.genai import types

    start_sens = getattr(
        types.StartSensitivity, f"START_SENSITIVITY_{settings.vad_start_sensitivity.upper()}"
    )
    end_sens = getattr(
        types.EndSensitivity, f"END_SENSITIVITY_{settings.vad_end_sensitivity.upper()}"
    )
    return types.AutomaticActivityDetection(
        start_of_speech_sensitivity=start_sens,
        end_of_speech_sensitivity=end_sens,
        prefix_padding_ms=settings.vad_prefix_padding_ms,
        silence_duration_ms=settings.vad_silence_ms,
    )


def _build_genai_config(system_prompt: str):
    """Construye LiveConnectConfig con voz nativa, idioma, VAD y tools."""
    from google.genai import types

    function_declarations = [
        types.FunctionDeclaration(
            name=t["name"], description=t["description"], parameters=t["parameters"]
        )
        for t in tools_mod.TOOL_DECLARATIONS
    ]

    return types.LiveConnectConfig(
        response_modalities=["AUDIO"],
        system_instruction=types.Content(parts=[types.Part(text=system_prompt)]),
        speech_config=types.SpeechConfig(
            voice_config=types.VoiceConfig(
                prebuilt_voice_config=types.PrebuiltVoiceConfig(voice_name=settings.gemini_voice)
            ),
            language_code=settings.gemini_language,
        ),
        # VAD automático afinado: Gemini detecta turnos e interrupciones.
        realtime_input_config=types.RealtimeInputConfig(
            automatic_activity_detection=_vad_config()
        ),
        # Llamadas largas (>15 min): comprime el contexto en vez de cortar.
        context_window_compression=types.ContextWindowCompressionConfig(
            sliding_window=types.SlidingWindow()
        ),
        tools=[types.Tool(function_declarations=function_declarations)],
        output_audio_transcription=types.AudioTranscriptionConfig(),
        input_audio_transcription=types.AudioTranscriptionConfig(),
    )


class GeminiLiveSession:
    def __init__(
        self,
        ctx,  # CallContext
        system_prompt: str,
        on_audio: AudioCallback | None = None,
        on_interrupt: SimpleCallback | None = None,
        on_transcript: TranscriptCallback | None = None,
    ) -> None:
        self.ctx = ctx
        self.system_prompt = system_prompt
        # Los callbacks pueden adjuntarse después (pre-calentamiento): la sesión
        # se conecta a Gemini mientras suena el timbre y, al abrir el WebSocket
        # de Twilio, se cablean los callbacks reales con `attach()`.
        self.on_audio = on_audio
        self.on_interrupt = on_interrupt
        self.on_transcript = on_transcript

        self._session = None
        self._client = None
        self._closed = asyncio.Event()
        self._audio_in: asyncio.Queue[bytes] = asyncio.Queue()
        # Audio producido antes de adjuntar callbacks (debería ser nulo: Gemini
        # no emite hasta recibir audio, que solo llega tras `attach`).
        self._pre_attach_audio: list[bytes] = []

        # Medición de latencia por turno: ts del último audio del usuario y si
        # ya registramos el primer audio de la respuesta en curso.
        self._last_user_audio_ts: float | None = None
        self._turn_first_audio_seen = False

    async def attach(
        self,
        on_audio: AudioCallback,
        on_interrupt: SimpleCallback | None = None,
        on_transcript: TranscriptCallback | None = None,
    ) -> None:
        """Cablea los callbacks reales a una sesión (pre-calentada) y vuelca el
        audio que se hubiera producido antes de adjuntar."""
        self.on_interrupt = on_interrupt
        self.on_transcript = on_transcript
        self.on_audio = on_audio
        if self._pre_attach_audio:
            for chunk in self._pre_attach_audio:
                await on_audio(chunk)
            self._pre_attach_audio.clear()

    async def send_audio(self, pcm16k: bytes) -> None:
        """Encola audio del prospecto (PCM16 16 kHz) hacia Gemini."""
        await self._audio_in.put(pcm16k)

    async def close(self) -> None:
        self._closed.set()

    async def run(self) -> None:
        """Bucle principal: conecta con reintentos/fallback y procesa la sesión."""
        plan = default_plan()
        attempt = 0
        for model in plan.ordered():
            while attempt < 4 and not self._closed.is_set():
                try:
                    await self._run_once(model)
                    return  # terminó limpiamente
                except Exception as exc:  # noqa: BLE001
                    if not is_transient_error(exc):
                        logger.exception("Error no recuperable en sesión Gemini")
                        raise
                    logger.warning("Error transitorio (%s); reintentando…", exc)
                    await sleep_backoff(attempt)
                    attempt += 1
            logger.warning("Agotados reintentos con %s; probando fallback", model)
            attempt = 0
        raise RuntimeError("No se pudo establecer sesión Gemini Live con ningún modelo")

    async def _run_once(self, model: str) -> None:
        from google import genai

        if self._client is None:
            self._client = genai.Client(api_key=settings.gemini_api_key)
        config = _build_genai_config(self.system_prompt)

        logger.info("Conectando a Gemini Live (%s)", model)
        async with self._client.aio.live.connect(model=model, config=config) as session:
            self._session = session
            sender = asyncio.create_task(self._pump_audio_in())
            try:
                await self._receive_loop()
            finally:
                sender.cancel()

    async def _pump_audio_in(self) -> None:
        """Drena la cola de audio entrante y la envía a Gemini en tiempo real."""
        from google.genai import types

        while not self._closed.is_set():
            chunk = await self._audio_in.get()
            self._last_user_audio_ts = time.perf_counter()
            await self._session.send_realtime_input(
                audio=types.Blob(data=chunk, mime_type="audio/pcm;rate=16000")
            )

    async def _receive_loop(self) -> None:
        """Procesa los mensajes del servidor: audio, transcripción, barge-in, tools."""
        async for response in self._session.receive():
            if self._closed.is_set():
                break

            server_content = getattr(response, "server_content", None)

            # Barge-in: el usuario interrumpió mientras el agente hablaba.
            if server_content and getattr(server_content, "interrupted", False):
                if self.on_interrupt:
                    await self.on_interrupt()

            # Audio de salida (PCM16 24 kHz).
            if getattr(response, "data", None):
                # Latencia de respuesta: del último audio del usuario al primer
                # audio del agente en este turno.
                if not self._turn_first_audio_seen and self._last_user_audio_ts is not None:
                    metrics.record_latency(time.perf_counter() - self._last_user_audio_ts)
                    self._turn_first_audio_seen = True
                if self.on_audio is None:
                    self._pre_attach_audio.append(response.data)
                else:
                    await self.on_audio(response.data)

            # Fin de turno del agente: reiniciar para medir el siguiente.
            if server_content and getattr(server_content, "turn_complete", False):
                self._turn_first_audio_seen = False

            # Transcripciones (si el callback está configurado).
            if self.on_transcript and server_content:
                out_t = getattr(server_content, "output_transcription", None)
                if out_t and getattr(out_t, "text", None):
                    await self.on_transcript("agente", out_t.text)
                in_t = getattr(server_content, "input_transcription", None)
                if in_t and getattr(in_t, "text", None):
                    await self.on_transcript("prospecto", in_t.text)

            # Tool calls.
            tool_call = getattr(response, "tool_call", None)
            if tool_call and getattr(tool_call, "function_calls", None):
                await self._handle_tool_calls(tool_call.function_calls)

    async def _handle_tool_calls(self, function_calls) -> None:
        from google.genai import types

        responses = []
        for fc in function_calls:
            args = dict(fc.args or {})
            result = await tools_mod.execute_tool(fc.name, args, self.ctx)
            responses.append(
                types.FunctionResponse(id=fc.id, name=fc.name, response=result)
            )
        await self._session.send_tool_response(function_responses=responses)
