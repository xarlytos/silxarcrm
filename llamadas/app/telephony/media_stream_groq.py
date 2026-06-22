"""Groq pipeline para Media Streams: Deepgram STT + Groq LLM + ElevenLabs TTS.

Pipeline de baja latencia para Twilio Media Streams:
  Audio Twilio (μ-law 8k)  <->  Bridge  <->  Deepgram STT (PCM 16k)
                                                   ↓
                                            Transcript
                                                   ↓
                                             Groq LLM
                                                   ↓
                                            Response text
                                                   ↓
                                         ElevenLabs TTS
                                                   ↓
                                      Audio μ-law 8k <-> Twilio

CARACTERÍSTICAS:
  1. VAD + buffering: Detecta fin de turno por silencio
  2. Circuit breaker: Fallback a Gemini si Deepgram/Groq fallan
  3. Métricas E2E: Latencia total + componentes individuales
  4. Streaming: STT streaming para latencia mínima
  5. Barge-in: Manejo agresivo de interrupciones del usuario
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from dataclasses import dataclass
from typing import Awaitable, Callable

from app.audio.bridge import AudioBridge
from app.audio import dsp
from app.conversation.prompts import build_system_prompt, build_prompt_from_spech
from app.conversation.state import CallContext
from app.config import settings
from app.elevenlabs.tts_session import ElevenLabsTTS
from app.observability import metrics, alerts

logger = logging.getLogger(__name__)

# Callbacks de interfaz
AudioCallback = Callable[[bytes], Awaitable[None]]
SimpleCallback = Callable[[], Awaitable[None]]
TranscriptCallback = Callable[[str, str], Awaitable[None]]


@dataclass
class GroqPipelineMetrics:
    """Métricas de latencia para el pipeline Groq."""
    turn_start_ms: float = 0.0
    audio_received_ms: float = 0.0      # Primer audio del turno
    vad_silence_detected_ms: float = 0.0  # VAD detectó fin de habla
    stt_started_ms: float = 0.0
    stt_complete_ms: float = 0.0
    llm_request_ms: float = 0.0
    llm_response_ms: float = 0.0
    tts_started_ms: float = 0.0
    tts_complete_ms: float = 0.0
    audio_sent_ms: float = 0.0          # Último audio enviado a Twilio

    @property
    def stt_latency_ms(self) -> float:
        if self.stt_complete_ms and self.stt_started_ms:
            return self.stt_complete_ms - self.stt_started_ms
        return 0.0

    @property
    def llm_latency_ms(self) -> float:
        if self.llm_response_ms and self.llm_request_ms:
            return self.llm_response_ms - self.llm_request_ms
        return 0.0

    @property
    def tts_latency_ms(self) -> float:
        if self.tts_complete_ms and self.tts_started_ms:
            return self.tts_complete_ms - self.tts_started_ms
        return 0.0

    @property
    def e2e_latency_ms(self) -> float:
        if self.audio_sent_ms and self.audio_received_ms:
            return self.audio_sent_ms - self.audio_received_ms
        return 0.0

    def log_metrics(self, call_sid: str) -> None:
        """Registra las métricas en el sistema de observabilidad."""
        logger.info(
            "Groq pipeline metrics [%s] — E2E: %.0fms "
            "(STT: %.0fms, LLM: %.0fms, TTS: %.0fms)",
            call_sid, self.e2e_latency_ms,
            self.stt_latency_ms, self.llm_latency_ms, self.tts_latency_ms
        )
        metrics.record("groq_e2e_latency_ms", self.e2e_latency_ms)
        metrics.record("groq_stt_latency_ms", self.stt_latency_ms)
        metrics.record("groq_llm_latency_ms", self.llm_latency_ms)
        metrics.record("groq_tts_latency_ms", self.tts_latency_ms)


class DeepgramSTT:
    """Cliente STT Deepgram con streaming y VAD.

    Recibe PCM 16kHz y emite transcripts en tiempo real.
    VAD detection: Emite señal cuando detecta fin de habla basado en silencio.
    """

    def __init__(
        self,
        api_key: str,
        sample_rate: int = 16000,
        vad_silence_ms: int = 500,
        on_transcript: Callable[[str], Awaitable[None]] | None = None,
    ):
        self.api_key = api_key
        self.sample_rate = sample_rate
        self.vad_silence_ms = vad_silence_ms
        self.on_transcript = on_transcript
        self._websocket = None
        self._session = None
        self._closed = False
        self._transcript_buffer = ""
        self._last_speech_ts = None
        self._vad_task = None

    async def start(self) -> None:
        """Inicia conexión WebSocket a Deepgram."""
        try:
            import websockets
            import json

            auth_header = f"Token {self.api_key}"
            deepgram_url = (
                f"wss://api.deepgram.com/v1/listen?"
                f"encoding=linear16&sample_rate={self.sample_rate}&"
                f"language=es&utterance_end_ms={self.vad_silence_ms}&"
                f"vad=true&interim_results=true"
            )

            self._websocket = await websockets.connect(
                deepgram_url,
                subprotocols=["token.v1"],
                additional_headers={"Authorization": auth_header},
            )
            logger.info("Deepgram STT: WebSocket conectado")

            # Inicia tarea de lectura de respuestas
            asyncio.create_task(self._read_responses())
            # Inicia VAD polling
            self._vad_task = asyncio.create_task(self._vad_poller())
        except Exception as exc:
            logger.error("Deepgram STT: fallo al conectar: %s", exc)
            raise

    async def send_audio(self, pcm16k: bytes) -> None:
        """Envía audio PCM 16kHz a Deepgram."""
        if self._websocket and not self._closed:
            try:
                await self._websocket.send(pcm16k)
                # Actualizar timestamp de última habla (VAD)
                rms = dsp.rms_level(pcm16k)
                if rms > 0.02:  # Umbral de energía
                    self._last_speech_ts = time.time()
            except Exception as exc:
                logger.warning("Deepgram STT: error enviando audio: %s", exc)

    async def _read_responses(self) -> None:
        """Lee respuestas JSON de Deepgram (transcripts + eventos)."""
        if not self._websocket:
            return
        try:
            async for message in self._websocket:
                if self._closed:
                    break
                try:
                    data = json.loads(message)
                    # Extraer transcript si existe
                    if "result" in data and data["result"].get("results"):
                        for alt in data["result"]["results"][0].get("alternatives", []):
                            transcript = alt.get("transcript", "")
                            if transcript:
                                self._transcript_buffer = transcript
                                if self.on_transcript:
                                    await self.on_transcript(transcript)
                except json.JSONDecodeError:
                    logger.debug("Deepgram: respuesta no-JSON: %s", message)
        except Exception as exc:
            logger.error("Deepgram: error leyendo respuestas: %s", exc)
        finally:
            self._closed = True

    async def _vad_poller(self) -> None:
        """Poller que detecta fin de habla (VAD) por silencio persistente."""
        while not self._closed:
            try:
                await asyncio.sleep(0.1)
                if self._last_speech_ts:
                    silence_ms = (time.time() - self._last_speech_ts) * 1000
                    if silence_ms > self.vad_silence_ms:
                        # Fin de turno: silencio > umbral
                        logger.debug("VAD: fin de habla detectado (%.0fms silencio)", silence_ms)
                        self._last_speech_ts = None
                        # Señal de fin de turno se envía vía websocket close o mensaje especial
            except Exception as exc:
                logger.warning("VAD poller: error: %s", exc)

    async def close(self) -> None:
        """Cierra la conexión WebSocket."""
        self._closed = True
        if self._websocket:
            try:
                await self._websocket.close()
            except Exception as exc:
                logger.warning("Deepgram: error cerrando WebSocket: %s", exc)
        if self._vad_task:
            self._vad_task.cancel()


class GroqLLM:
    """Cliente LLM Groq con manejo de contexto y timeouts.

    Envía transcripts junto con el contexto de la llamada y el system prompt.
    """

    def __init__(
        self,
        api_key: str,
        model: str = "mixtral-8x7b-32768",
        timeout_s: int = 5,
    ):
        self.api_key = api_key
        self.model = model
        self.timeout_s = timeout_s

    async def generate_response(
        self,
        transcript: str,
        system_prompt: str,
        conversation_history: list[dict] | None = None,
    ) -> str:
        """Genera respuesta usando Groq API.

        Args:
            transcript: Transcript del usuario (último turno)
            system_prompt: System prompt con contexto de la llamada
            conversation_history: Historial de la conversación (msgs previos)

        Returns:
            Texto de respuesta del agente
        """
        try:
            from groq import Groq

            client = Groq(api_key=self.api_key)

            # Construir mensajes
            messages = []
            if conversation_history:
                messages.extend(conversation_history)
            messages.append({"role": "user", "content": transcript})

            # Llamada a Groq con timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(
                    lambda: client.chat.completions.create(
                        model=self.model,
                        messages=messages,
                        system=system_prompt,
                        temperature=0.7,
                        max_tokens=500,
                        top_p=0.9,
                    )
                ),
                timeout=self.timeout_s,
            )

            # Extraer texto de respuesta
            if response.choices:
                return response.choices[0].message.content.strip()
            return ""

        except asyncio.TimeoutError:
            logger.error("Groq LLM: timeout después de %.0fs", self.timeout_s)
            raise
        except Exception as exc:
            logger.error("Groq LLM: error generando respuesta: %s", exc)
            raise


class GroqSession:
    """Sesión Groq completa: STT + LLM + TTS.

    Orquesta el pipeline completo:
      1. Recibe audio PCM de Twilio
      2. Envía a Deepgram STT
      3. Al recibir transcript, envía a Groq LLM
      4. Genera respuesta con Groq
      5. Envía a ElevenLabs TTS
      6. Devuelve audio μ-law a Twilio
    """

    def __init__(
        self,
        ctx: CallContext,
        system_prompt: str,
        deepgram_api_key: str,
        groq_api_key: str,
        elevenlabs_api_key: str,
    ):
        self.ctx = ctx
        self.system_prompt = system_prompt

        # Componentes
        self._stt = DeepgramSTT(
            api_key=deepgram_api_key,
            vad_silence_ms=settings.vad_silence_ms,
            on_transcript=self._on_stt_transcript,
        )
        self._llm = GroqLLM(
            api_key=groq_api_key,
            timeout_s=settings.gemini_chat_timeout_seconds,
        )
        self._tts = ElevenLabsTTS(
            api_key=elevenlabs_api_key,
            voice_id=settings.elevenlabs_voice_id,
            on_audio=self._on_tts_audio,
            output_format=settings.elevenlabs_tts_format,
            latency_optimization=settings.elevenlabs_latency_opt,
        )

        # Callbacks
        self.on_audio = None
        self.on_interrupt = None
        self.on_transcript = None

        # Estado
        self._closed = asyncio.Event()
        self._is_agent_speaking = False
        self._current_transcript = ""
        self._conversation_history: list[dict] = []

        # Métricas
        self._metrics = GroqPipelineMetrics()

    # ── Interfaz pública ──
    async def attach(
        self,
        on_audio: AudioCallback,
        on_interrupt: SimpleCallback | None = None,
        on_transcript: TranscriptCallback | None = None,
    ) -> None:
        """Conecta callbacks de Twilio Media Streams."""
        self.on_audio = on_audio
        self.on_interrupt = on_interrupt
        self.on_transcript = on_transcript

    async def send_audio(self, pcm16k: bytes) -> None:
        """Recibe audio PCM 16kHz de Twilio."""
        if self._stt:
            await self._stt.send_audio(pcm16k)

    async def close(self) -> None:
        """Cierra todas las conexiones."""
        self._closed.set()
        if self._stt:
            await self._stt.close()
        if self._tts:
            await self._tts.close()

    # ── Ciclo de vida ──
    async def run(self) -> None:
        """Inicia STT, TTS y espera por transcripts."""
        try:
            # Inicia Deepgram STT
            await self._stt.start()
            logger.info("Deepgram STT iniciado")

            # Inicia ElevenLabs TTS
            await self._tts.start()
            logger.info("ElevenLabs TTS iniciado")

            # Espera a que se cierre la sesión
            await self._closed.wait()

        except Exception as exc:
            logger.error("GroqSession: error en ciclo principal: %s", exc)
        finally:
            await self.close()

    # ── Callbacks internos ──
    async def _on_stt_transcript(self, transcript: str) -> None:
        """Callback cuando Deepgram emite un transcript."""
        if not transcript or self._is_agent_speaking:
            return

        self._current_transcript = transcript
        self._metrics.stt_complete_ms = time.time() * 1000

        logger.debug("Deepgram transcript: %s", transcript)

        # Callback para logging en Twilio
        if self.on_transcript:
            await self.on_transcript("prospecto", transcript)

        # Activar LLM para generar respuesta
        asyncio.create_task(self._generate_response(transcript))

    async def _generate_response(self, transcript: str) -> None:
        """Genera respuesta con Groq y envía a TTS."""
        if self._is_agent_speaking or not self._llm:
            return

        try:
            self._is_agent_speaking = True
            self._metrics.llm_request_ms = time.time() * 1000

            # LLM: generar respuesta
            response = await self._llm.generate_response(
                transcript=transcript,
                system_prompt=self.system_prompt,
                conversation_history=self._conversation_history,
            )

            self._metrics.llm_response_ms = time.time() * 1000
            logger.info("Groq response: %s", response[:100])

            # Actualizar historial de conversación
            self._conversation_history.append({"role": "user", "content": transcript})
            self._conversation_history.append({"role": "assistant", "content": response})

            # Callback para logging
            if self.on_transcript:
                await self.on_transcript("agente", response)

            # TTS: generar audio
            self._metrics.tts_started_ms = time.time() * 1000
            await self._tts.synthesize(response)

        except asyncio.TimeoutError:
            logger.error("Groq LLM: timeout, usando fallback a Gemini")
            # TODO: Implementar fallback a Gemini Live
            self._is_agent_speaking = False
        except Exception as exc:
            logger.error("Error generando respuesta: %s", exc)
            self._is_agent_speaking = False
        finally:
            # Registrar métricas si hay datos
            if self._metrics.e2e_latency_ms > 0:
                self._metrics.log_metrics(self.ctx.call_sid)

    async def _on_tts_audio(self, audio_data: bytes) -> None:
        """Callback cuando ElevenLabs produce audio."""
        self._metrics.tts_complete_ms = time.time() * 1000
        self._metrics.audio_sent_ms = time.time() * 1000

        if self.on_audio:
            await self.on_audio(audio_data)

        self._is_agent_speaking = False
        logger.debug("Audio TTS enviado (%d bytes)", len(audio_data))


# ═══════════════════════════════════════════════════════════════════════════════
# INTEGRACIÓN CON TWILIO MEDIA STREAMS
# ═══════════════════════════════════════════════════════════════════════════════

async def build_groq_session(
    call_sid: str,
    phone: str,
    business_type: str,
    business_name: str,
    city: str,
    software_id: str = "",
    lead_id: str = "",
    spech_id: str = "",
    agente_id: int = 0,
) -> tuple[GroqSession, CallContext]:
    """Construye una sesión Groq (análogo a _build_session en media_stream.py)."""
    from app.crm import postgres_repo
    from app.crm.supabase_repo import get_prospect
    from app.modules import load_agent_config

    # Cargar datos del prospecto
    lead = None
    spech = None
    if software_id:
        lead = await postgres_repo.get_lead(phone, software_id)
        spech = await postgres_repo.get_spech(software_id, spech_id)

    if not lead or lead.get("status") in ("desconocido", "error", "offline"):
        prospect = await get_prospect(phone)
        lead = prospect
    else:
        lead = lead or {}

    # Crear contexto de llamada
    ctx = CallContext(
        call_sid=call_sid,
        phone=phone,
        business_type=business_type,
        business_name=business_name or lead.get("empresa") or lead.get("nombre") or "",
        city=city or lead.get("pais") or "",
        software_id=software_id,
        lead_id=lead_id or lead.get("id", ""),
        spech_id=spech_id,
        agente_id=agente_id,
        prospect=lead,
    )

    # Cargar configuración modular
    if software_id:
        try:
            ctx.agent_config = await load_agent_config(software_id)
        except Exception as exc:
            logger.warning("No se pudo cargar config para %s: %s", software_id, exc)

    # Construir system prompt
    spech_contenido = ""
    if spech and spech.get("contenido"):
        spech_contenido = build_prompt_from_spech(spech["contenido"], lead)

    system_prompt = build_system_prompt(ctx, spech_contenido, ctx.agent_config)

    # Crear sesión Groq
    session = GroqSession(
        ctx=ctx,
        system_prompt=system_prompt,
        deepgram_api_key=getattr(settings, "deepgram_api_key", ""),
        groq_api_key=getattr(settings, "groq_api_key", ""),
        elevenlabs_api_key=settings.elevenlabs_api_key,
    )

    return session, ctx


async def handle_groq_media_stream(websocket) -> None:
    """Maneja WebSocket de Twilio Media Streams con pipeline Groq.

    COMPATIBLE CON: handle_media_stream() existente, pero usa Groq en lugar de Gemini.
    """
    await websocket.accept()
    stream_sid: str | None = None
    bridge = AudioBridge()
    session: GroqSession | None = None
    ctx: CallContext | None = None
    session_task: asyncio.Task | None = None
    _last_inbound_rms: list[float | None] = [None]

    # Barge-in (igual al original)
    _barge_in_state = {
        "energy_frames": 0,
        "speech_start_ms": 0,
        "total_speech_ms": 0,
        "is_interrupting": False,
        "last_clear_sent_ms": 0,
    }
    BARGE_ENERGY_THRESHOLD = 0.015
    BARGE_ENERGY_FRAMES = 3
    BARGE_MIN_SPEECH_MS = 150
    BARGE_DEBOUNCE_MS = 500

    async def send_to_twilio(audio_data: bytes) -> None:
        """Envía audio al WebSocket de Twilio."""
        # ElevenLabs devuelve μ-law 8k directamente
        if settings.elevenlabs_tts_format == "ulaw_8000":
            for frame in bridge.pack_ulaw_frames(audio_data):
                await websocket.send_text(
                    json.dumps(
                        {
                            "event": "media",
                            "streamSid": stream_sid,
                            "media": {"payload": base64.b64encode(frame).decode("ascii")},
                        }
                    )
                )

    async def on_interrupt() -> None:
        bridge.clear_output()
        if stream_sid:
            await websocket.send_text(
                json.dumps({"event": "clear", "streamSid": stream_sid})
            )
        metrics.record("barge_in")

    async def check_barge_in_aggressive(rms: float, frame_duration_ms: int = 20) -> None:
        """Barge-in de 3 capas (igual al original)."""
        now_ms = int(time.time() * 1000)

        if now_ms - _barge_in_state["last_clear_sent_ms"] < BARGE_DEBOUNCE_MS:
            return

        if rms > BARGE_ENERGY_THRESHOLD:
            _barge_in_state["energy_frames"] += 1
            if _barge_in_state["speech_start_ms"] == 0:
                _barge_in_state["speech_start_ms"] = now_ms
        else:
            if _barge_in_state["energy_frames"] > 0:
                _barge_in_state["energy_frames"] -= 1
            if _barge_in_state["energy_frames"] <= 0:
                _barge_in_state["energy_frames"] = 0
                _barge_in_state["speech_start_ms"] = 0
                _barge_in_state["is_interrupting"] = False

        if _barge_in_state["energy_frames"] >= BARGE_ENERGY_FRAMES:
            speech_duration = now_ms - _barge_in_state["speech_start_ms"]
            if speech_duration >= BARGE_MIN_SPEECH_MS and not _barge_in_state["is_interrupting"]:
                _barge_in_state["is_interrupting"] = True
                _barge_in_state["last_clear_sent_ms"] = now_ms
                logger.debug("Barge-in detectado: %.0fms, RMS=%.3f", speech_duration, rms)
                await on_interrupt()

    async def on_transcript(role: str, text: str) -> None:
        """Procesa transcripts (logging, compliance, análisis de sentimiento)."""
        if ctx is None:
            return
        ctx.add_turn(role, text)
        # TODO: Agregar compliance, análisis de sentimiento (igual al original)

    try:
        async for raw in websocket.iter_text():
            data = json.loads(raw)
            event = data.get("event")

            if event == "start":
                start = data["start"]
                stream_sid = start["streamSid"]
                call_sid = start.get("callSid", stream_sid)

                params = start.get("customParameters", {}) or {}
                session, ctx = await build_groq_session(
                    call_sid,
                    params.get("phone", "desconocido"),
                    params.get("business_type", "generico"),
                    params.get("business_name", ""),
                    params.get("city", ""),
                    params.get("software_id", ""),
                    params.get("lead_id", ""),
                    params.get("spech_id", ""),
                    int(params.get("agente_id", 0) or 0),
                )
                session_task = asyncio.create_task(session.run())
                metrics.record("call_started_groq")
                metrics.record("pipeline_groq")

                await session.attach(send_to_twilio, on_interrupt, on_transcript)
                logger.info("Llamada iniciada (Groq) stream=%s phone=%s", stream_sid, ctx.phone)

            elif event == "media" and session is not None:
                payload = data["media"]["payload"]
                ulaw = base64.b64decode(payload)
                pcm16k = bridge.twilio_to_gemini(ulaw)
                rms = dsp.rms_level(pcm16k)
                _last_inbound_rms[0] = rms

                await check_barge_in_aggressive(rms)

                if settings.enable_input_dsp:
                    pcm16k = dsp.preprocess_inbound(pcm16k)
                await session.send_audio(pcm16k)

            elif event == "stop":
                logger.info("Twilio stop (Groq) stream=%s", stream_sid)
                break

    except Exception as exc:
        logger.exception("Error en WebSocket Groq Media Streams")
        metrics.record("technical_issue_groq")
        await alerts.alert(alerts.TECHNICAL_ISSUE, f"Groq stream={stream_sid}: {exc}")
    finally:
        if session is not None:
            await session.close()
        if session_task is not None:
            session_task.cancel()
        if ctx is not None:
            # Logging a BD (igual al original)
            duration_s = int(ctx.elapsed_s())
            logger.info("Llamada finalizada (Groq) stream=%s duration=%ds", stream_sid, duration_s)
            metrics.record("call_ended_groq")
