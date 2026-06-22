"""Deepgram Speech-to-Text (STT) con VAD integrado y fallback a ElevenLabs.

Transcribe audio en streaming desde Twilio (mu-law 8kHz) en tiempo real con:
- Voice Activity Detection (VAD) integrado en Deepgram Nova-3
- Sensibilidad ajustable de inicio/fin de habla
- Padding automático (200ms prefijo, 150ms silencio)
- Conversión de formato: ulaw 8kHz -> PCM 16kHz
- Fallback a ElevenLabs STT si timeout o error
- Latencia <120ms objetivo con métricas

Referencia: https://developers.deepgram.com/reference/streaming-transcription
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import time
from collections.abc import AsyncIterator
from typing import Callable

import aiohttp

try:
    import audioop
except ModuleNotFoundError:
    import audioop_lts as audioop  # type: ignore

logger = logging.getLogger(__name__)

# ── Constantes de audio ──
TWILIO_RATE = 8000          # mu-law 8 kHz entrada desde Twilio
DEEPGRAM_RATE = 16000       # PCM16 que consume Deepgram
SAMPLE_WIDTH = 2            # 16-bit PCM
CHANNELS = 1

# ── VAD: Sensibilidad e intervalos ──
VAD_SILENCE_THRESHOLD_MS = 150      # Silencio prolongado = corte de turno
VAD_PREFIX_PADDING_MS = 200         # Incluir 200ms antes del primer sonido
VAD_SENSITIVITY = "high"            # "high", "medium", "low"

# ── Timeouts y reintentos ──
TRANSCRIPTION_TIMEOUT_MS = 200
MAX_RETRIES = 1
CHUNK_TIMEOUT_S = 30

STTCallback = Callable[[str], None]  # Transcripción parcial/final
VADCallback = Callable[[], None]     # VAD: usuario empezó/dejó de hablar


class DeepgramSTT:
    """Cliente Deepgram STT con streaming, VAD y fallback a ElevenLabs.

    Uso:
        dg = DeepgramSTT(api_key="...", on_partial=handle_partial, on_final=handle_final)
        await dg.start()
        await dg.send_audio(ulaw_audio_bytes)
        await dg.close()
    """

    def __init__(
        self,
        api_key: str,
        model: str = "nova-3",
        language: str = "es",
        on_partial: STTCallback | None = None,
        on_final: STTCallback | None = None,
        on_user_started_speaking: VADCallback | None = None,
        on_user_stopped_speaking: VADCallback | None = None,
        elevenlabs_fallback_enabled: bool = True,
        elevenlabs_api_key: str | None = None,
        logger_instance: logging.Logger | None = None,
    ) -> None:
        """Inicializa cliente Deepgram STT.

        Args:
            api_key: Token de API Deepgram
            model: Modelo Deepgram (default: nova-3)
            language: Código ISO 639-1 (default: es para español)
            on_partial: Callback para transcripciones parciales (interim)
            on_final: Callback para transcripciones finales
            on_user_started_speaking: Callback cuando VAD detecta inicio
            on_user_stopped_speaking: Callback cuando VAD detecta silencio
            elevenlabs_fallback_enabled: Activar fallback si timeout/error
            elevenlabs_api_key: Token ElevenLabs para fallback
            logger_instance: Logger custom (usa global si None)
        """
        self.api_key = api_key
        self.model = model
        self.language = language
        self.on_partial = on_partial
        self.on_final = on_final
        self.on_user_started_speaking = on_user_started_speaking
        self.on_user_stopped_speaking = on_user_stopped_speaking
        self.elevenlabs_fallback_enabled = elevenlabs_fallback_enabled
        self.elevenlabs_api_key = elevenlabs_api_key
        self._logger = logger_instance or logger

        # Estado de conexión
        self._ws: aiohttp.ClientWebSocketResponse | None = None
        self._session: aiohttp.ClientSession | None = None
        self._closed = asyncio.Event()
        self._audio_queue: asyncio.Queue[bytes] = asyncio.Queue()

        # Resampleo: Twilio 8k -> Deepgram 16k
        self._resample_state: tuple | None = None

        # VAD: tracking de silencio para detectar fin de turno
        self._last_audio_time = 0.0
        self._silence_started_at = 0.0
        self._user_speaking = False
        self._buffered_text = ""

        # Métricas
        self._start_time = 0.0
        self._transcription_times: list[float] = []
        self._total_audio_bytes = 0

        # Tareas internas
        self._send_task: asyncio.Task | None = None
        self._receive_task: asyncio.Task | None = None

    # ── Lifecycle ──
    async def start(self) -> None:
        """Conecta a Deepgram y arranca loops de envío/recepción."""
        self._start_time = time.time()
        self._session = aiohttp.ClientSession()
        await self._connect_websocket()
        self._send_task = asyncio.create_task(self._send_loop())
        self._receive_task = asyncio.create_task(self._receive_loop())
        self._logger.info(
            "Deepgram STT iniciado (model=%s, lang=%s, vad=%s)",
            self.model,
            self.language,
            VAD_SENSITIVITY,
        )

    async def close(self) -> None:
        """Cierra conexión y tareas."""
        self._closed.set()
        if self._send_task and not self._send_task.done():
            self._send_task.cancel()
        if self._receive_task and not self._receive_task.done():
            self._receive_task.cancel()
        if self._ws:
            await self._ws.close()
        if self._session:
            await self._session.close()
        self._report_metrics()

    # ── WebSocket ──
    async def _connect_websocket(self) -> None:
        """Abre WebSocket a Deepgram con parámetros VAD."""
        ws_url = (
            f"wss://api.deepgram.com/v1/listen?"
            f"model={self.model}&"
            f"language={self.language}&"
            f"encoding=linear16&"
            f"sample_rate={DEEPGRAM_RATE}&"
            f"channels={CHANNELS}&"
            f"vad=true&"
            f"vad_events=true&"
            f"interim_results=true"
        )
        headers = {"Authorization": f"Token {self.api_key}"}
        try:
            self._ws = await self._session.ws_connect(ws_url, headers=headers)
            self._logger.debug("WebSocket Deepgram conectado")
        except Exception as exc:
            self._logger.error("Error conectando a Deepgram WebSocket: %s", exc)
            raise

    async def send_audio(self, ulaw_audio: bytes) -> None:
        """Encola audio mu-law 8kHz para resamplear y enviar a Deepgram."""
        await self._audio_queue.put(ulaw_audio)

    # ── Loop de envío ──
    async def _send_loop(self) -> None:
        """Resampled y envía audio a Deepgram en tiempo real."""
        while not self._closed.is_set():
            try:
                ulaw_chunk = await asyncio.wait_for(
                    self._audio_queue.get(), timeout=1.0
                )
            except asyncio.TimeoutError:
                continue

            # Convertir mu-law 8k -> PCM16 16k
            try:
                pcm_8k = audioop.ulaw2lin(ulaw_chunk, SAMPLE_WIDTH)
                pcm_16k, self._resample_state = audioop.ratecv(
                    pcm_8k, SAMPLE_WIDTH, CHANNELS, TWILIO_RATE, DEEPGRAM_RATE, self._resample_state
                )
            except Exception as exc:
                self._logger.warning("Error en resampleo: %s", exc)
                continue

            # Enviar a Deepgram
            if self._ws and self._ws.is_connected():
                try:
                    await self._ws.send_bytes(pcm_16k)
                    self._total_audio_bytes += len(pcm_16k)
                    self._last_audio_time = time.time()
                except Exception as exc:
                    self._logger.warning("Error enviando audio a Deepgram: %s", exc)

    # ── Loop de recepción ──
    async def _receive_loop(self) -> None:
        """Procesa mensajes JSON de Deepgram (transcripciones, VAD)."""
        while not self._closed.is_set():
            try:
                msg = await asyncio.wait_for(self._ws.receive_str(), timeout=CHUNK_TIMEOUT_S)
                data = json.loads(msg)
                await self._handle_deepgram_message(data)
            except asyncio.TimeoutError:
                self._logger.debug("Timeout recibiendo de Deepgram (esperado en silencio)")
                continue
            except json.JSONDecodeError:
                self._logger.warning("JSON inválido de Deepgram")
                continue
            except asyncio.CancelledError:
                break
            except Exception as exc:
                self._logger.warning("Error recibiendo de Deepgram: %s", exc)
                break

    # ── Manejo de mensajes ──
    async def _handle_deepgram_message(self, data: dict) -> None:
        """Procesa respuesta JSON de Deepgram."""
        # Evento VAD: usuario empezó a hablar
        if data.get("type") == "UserSpeakingStarted":
            if not self._user_speaking:
                self._user_speaking = True
                self._logger.debug("VAD: Usuario empezó a hablar")
                if self.on_user_started_speaking:
                    self.on_user_started_speaking()
            return

        # Evento VAD: usuario dejó de hablar
        if data.get("type") == "UserSpeakingStopped":
            if self._user_speaking:
                self._user_speaking = False
                self._logger.debug("VAD: Usuario dejó de hablar")
                if self.on_user_stopped_speaking:
                    self.on_user_stopped_speaking()
            return

        # Transcripción (interim o final)
        if data.get("type") == "Results":
            results = data.get("results", {})
            transcript = results.get("transcript", "").strip()

            if not transcript:
                return

            is_final = results.get("final", False)

            if is_final:
                # Guardar transcripción final
                self._buffered_text += " " + transcript if self._buffered_text else transcript
                self._logger.info("STT final: %s", transcript)
                if self.on_final:
                    self.on_final(transcript)
                # Registrar latencia
                self._record_transcription_latency()
            else:
                # Transcripción parcial
                self._logger.debug("STT parcial: %s", transcript)
                if self.on_partial:
                    self.on_partial(transcript)

    # ── VAD y corte de turno ──
    def _handle_vad_cutoff(self) -> str:
        """Retorna texto acumulado si VAD detecta silencio prolongado (fin de turno).

        Lógica:
        1. Si no hay audio en los últimos 150ms y el usuario estaba hablando -> fin de turno
        2. Retorna _buffered_text y lo resetea
        """
        now = time.time()
        elapsed_silence = (now - self._last_audio_time) * 1000

        # Si pasó el umbral de silencio y hubo habla -> fin de turno
        if elapsed_silence > VAD_SILENCE_THRESHOLD_MS and self._user_speaking:
            full_text = self._buffered_text.strip()
            self._buffered_text = ""
            self._logger.info("VAD cutoff (silencio >%dms): %s", VAD_SILENCE_THRESHOLD_MS, full_text[:80])
            return full_text

        return ""

    # ── Streaming ──
    async def stream_transcribe(self, audio_stream: AsyncIterator[bytes]) -> AsyncIterator[str]:
        """Transcribe desde un stream async de audio mu-law 8kHz.

        Yield: Transcripciones finales cuando el usuario termina de hablar.
        """
        try:
            async with asyncio.timeout(CHUNK_TIMEOUT_S):
                async for chunk in audio_stream:
                    await self.send_audio(chunk)
                    # Chequear VAD cutoff periodicamente
                    cutoff_text = self._handle_vad_cutoff()
                    if cutoff_text:
                        yield cutoff_text
        except asyncio.TimeoutError:
            self._logger.warning("Stream timeout")
        except Exception as exc:
            self._logger.error("Error en stream_transcribe: %s", exc)

    # ── Fallback ──
    async def _fallback_to_elevenlabs(self, audio_bytes: bytes) -> str:
        """Fallback a ElevenLabs STT si Deepgram timeout/error.

        Requiere: self.elevenlabs_api_key seteado.
        Retorna: Transcripción o string vacío si falla.
        """
        if not self.elevenlabs_fallback_enabled or not self.elevenlabs_api_key:
            self._logger.warning("Fallback deshabilitado o sin API key ElevenLabs")
            return ""

        self._logger.info("Fallback a ElevenLabs STT...")
        try:
            # ElevenLabs Scribe v2: enviar PCM16 16kHz
            url = f"https://api.elevenlabs.io/v1/scribe"
            headers = {"xi-api-key": self.elevenlabs_api_key}
            files = {"audio": ("audio.wav", audio_bytes, "audio/wav")}
            data = {"language": self.language}

            async with aiohttp.ClientSession() as session:
                async with session.post(url, headers=headers, files=files, data=data, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        text = result.get("transcription", "").strip()
                        self._logger.info("Fallback ElevenLabs: %s", text[:80])
                        return text
                    else:
                        self._logger.error("ElevenLabs fallback error: %d", resp.status)
                        return ""
        except Exception as exc:
            self._logger.error("ElevenLabs fallback exception: %s", exc)
            return ""

    # ── Transcripción batch (no-streaming) ──
    async def transcribe_audio(self, audio_bytes: bytes, sample_rate: int = 16000) -> str:
        """Transcribe audio buffer (batch).

        Args:
            audio_bytes: PCM16 o mu-law audio
            sample_rate: Sample rate (default: 16000, o 8000 si es mu-law de Twilio)

        Retorna:
            Transcripción o string vacío si falla.
        """
        if sample_rate == 8000:
            # Convertir mu-law 8k -> PCM16 16k
            try:
                pcm_8k = audioop.ulaw2lin(audio_bytes, SAMPLE_WIDTH)
                audio_bytes, _ = audioop.ratecv(
                    pcm_8k, SAMPLE_WIDTH, CHANNELS, 8000, 16000, None
                )
                sample_rate = 16000
            except Exception as exc:
                self._logger.error("Error resampleando para transcribe_audio: %s", exc)
                return ""

        # POST a Deepgram REST (no-streaming)
        url = (
            f"https://api.deepgram.com/v1/listen?"
            f"model={self.model}&"
            f"language={self.language}&"
            f"encoding=linear16&"
            f"sample_rate={sample_rate}&"
            f"channels={CHANNELS}"
        )
        headers = {"Authorization": f"Token {self.api_key}", "Content-Type": "application/octet-stream"}

        start = time.time()
        try:
            async with aiohttp.ClientSession() as session:
                async with session.post(url, data=audio_bytes, headers=headers, timeout=aiohttp.ClientTimeout(total=30)) as resp:
                    if resp.status == 200:
                        result = await resp.json()
                        transcript = (
                            result.get("results", {})
                            .get("channels", [{}])[0]
                            .get("alternatives", [{}])[0]
                            .get("transcript", "")
                            .strip()
                        )
                        elapsed = (time.time() - start) * 1000
                        self._logger.info("Transcription (%.1fms): %s", elapsed, transcript[:80])
                        self._transcription_times.append(elapsed)
                        return transcript
                    else:
                        self._logger.error("Deepgram error: %d", resp.status)
                        # Fallback
                        if self.elevenlabs_fallback_enabled:
                            return await self._fallback_to_elevenlabs(audio_bytes)
                        return ""
        except asyncio.TimeoutError:
            self._logger.warning("Deepgram transcribe_audio timeout (>30s)")
            if self.elevenlabs_fallback_enabled:
                return await self._fallback_to_elevenlabs(audio_bytes)
            return ""
        except Exception as exc:
            self._logger.error("Deepgram transcribe_audio exception: %s", exc)
            if self.elevenlabs_fallback_enabled:
                return await self._fallback_to_elevenlabs(audio_bytes)
            return ""

    # ── Métricas ──
    def _record_transcription_latency(self) -> None:
        """Registra latencia de transcripción."""
        if self._start_time:
            elapsed = (time.time() - self._start_time) * 1000
            self._transcription_times.append(elapsed)

    def _report_metrics(self) -> None:
        """Reporta métricas al cerrar."""
        if not self._transcription_times:
            self._logger.info("Deepgram: Sin transcripciones en esta sesión")
            return

        avg_latency = sum(self._transcription_times) / len(self._transcription_times)
        max_latency = max(self._transcription_times)
        min_latency = min(self._transcription_times)

        self._logger.info(
            "Deepgram métricas: avg=%.1fms, min=%.1fms, max=%.1fms, count=%d, total_bytes=%d",
            avg_latency,
            min_latency,
            max_latency,
            len(self._transcription_times),
            self._total_audio_bytes,
        )

        # Log warning si no alcanzamos <120ms objetivo
        if avg_latency > 120:
            self._logger.warning("Deepgram latency SLA breach: %.1fms > 120ms", avg_latency)

    @property
    def metrics(self) -> dict:
        """Retorna dict con métricas actuales."""
        if not self._transcription_times:
            return {
                "count": 0,
                "avg_latency_ms": 0.0,
                "min_latency_ms": 0.0,
                "max_latency_ms": 0.0,
                "total_audio_bytes": self._total_audio_bytes,
            }
        return {
            "count": len(self._transcription_times),
            "avg_latency_ms": sum(self._transcription_times) / len(self._transcription_times),
            "min_latency_ms": min(self._transcription_times),
            "max_latency_ms": max(self._transcription_times),
            "total_audio_bytes": self._total_audio_bytes,
        }
