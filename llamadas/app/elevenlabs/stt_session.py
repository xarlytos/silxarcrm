"""Sesión STT con ElevenLabs Scribe v2 Realtime (WebSocket).

Recibe audio PCM 16kHz y emite transcripciones en tiempo real con VAD integrado.
Soporta interrupciones (barge-in) mediante detección de inicio de habla del usuario.

Referencia: https://elevenlabs.io/docs/api-reference/scribe-v2-realtime
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Awaitable, Callable

logger = logging.getLogger(__name__)

STTCallback = Callable[[str], Awaitable[None]]          # texto transcrito
VADCallback = Callable[[], Awaitable[None]]              # usuario empezó a hablar (barge-in)
TurnCallback = Callable[[str], Awaitable[None]]         # turno finalizado (texto completo)


class ElevenLabsScribe:
    """WebSocket cliente para ElevenLabs Scribe v2 Realtime STT."""

    def __init__(
        self,
        api_key: str,
        language_code: str = "es",
        on_partial: STTCallback | None = None,
        on_final: STTCallback | None = None,
        on_user_started_speaking: VADCallback | None = None,
        on_user_stopped_speaking: VADCallback | None = None,
        on_turn_finalized: TurnCallback | None = None,
        sample_rate: int = 16000,
    ) -> None:
        self.api_key = api_key
        self.language_code = language_code
        self.sample_rate = sample_rate
        self.on_partial = on_partial
        self.on_final = on_final
        self.on_user_started_speaking = on_user_started_speaking
        self.on_user_stopped_speaking = on_user_stopped_speaking
        self.on_turn_finalized = on_turn_finalized

        self._ws = None
        self._closed = asyncio.Event()
        self._audio_queue: asyncio.Queue[bytes] = asyncio.Queue()
        self._buffered_text = ""
        self._is_speaking = False
        self._send_task: asyncio.Task | None = None

    # ── URL de conexión ──
    def _ws_url(self) -> str:
        return (
            f"wss://api.elevenlabs.io/v1/scribe-v2/realtime?"
            f"language_code={self.language_code}&"
            f"sample_rate={self.sample_rate}"
        )

    # ── Ciclo de vida ──
    async def start(self) -> None:
        """Conecta el WebSocket y arranca las tareas de envío/recepción."""
        import websockets

        headers = {"xi-api-key": self.api_key}
        logger.info("Conectando a ElevenLabs Scribe v2...")
        self._ws = await websockets.connect(self._ws_url(), extra_headers=headers)
        logger.info("Conectado a ElevenLabs Scribe v2")

        self._send_task = asyncio.create_task(self._send_loop())
        try:
            await self._receive_loop()
        finally:
            if self._send_task and not self._send_task.done():
                self._send_task.cancel()
            if self._ws:
                await self._ws.close()

    async def close(self) -> None:
        self._closed.set()
        if self._send_task and not self._send_task.done():
            self._send_task.cancel()
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass

    async def send_audio(self, pcm16: bytes) -> None:
        """Encola audio PCM16 para enviar a ElevenLabs."""
        await self._audio_queue.put(pcm16)

    # ── Loops internos ──
    async def _send_loop(self) -> None:
        """Drena la cola de audio y envía a ElevenLabs en chunks."""
        while not self._closed.is_set():
            try:
                chunk = await asyncio.wait_for(self._audio_queue.get(), timeout=0.5)
            except asyncio.TimeoutError:
                continue
            if self._ws and self._ws.open:
                try:
                    await self._ws.send(chunk)
                except Exception as exc:
                    logger.warning("Error enviando audio a STT: %s", exc)

    async def _receive_loop(self) -> None:
        """Procesa mensajes del servidor: transcripciones, VAD, fin de turno."""
        while not self._closed.is_set():
            try:
                msg = await asyncio.wait_for(self._ws.recv(), timeout=1.0)
                data = json.loads(msg)
                await self._handle_message(data)
            except asyncio.TimeoutError:
                continue
            except json.JSONDecodeError:
                logger.warning("Mensaje JSON inválido de ElevenLabs STT")
                continue
            except Exception as exc:
                logger.warning("Error recibiendo de ElevenLabs STT: %s", exc)
                break

    async def _handle_message(self, data: dict) -> None:
        """Dispacha según el tipo de mensaje de ElevenLabs Scribe v2."""
        msg_type = data.get("type")

        # Usuario empezó a hablar (detección VAD) -> posible barge-in
        if msg_type == "user_started_speaking":
            self._is_speaking = True
            logger.debug("VAD: usuario empezó a hablar")
            if self.on_user_started_speaking:
                await self.on_user_started_speaking()

        # Usuario dejó de hablar
        elif msg_type == "user_stopped_speaking":
            self._is_speaking = False
            logger.debug("VAD: usuario dejó de hablar")
            if self.on_user_stopped_speaking:
                await self.on_user_stopped_speaking()

        # Transcripción parcial (intermedia)
        elif msg_type == "partial":
            text = data.get("text", "")
            if text and self.on_partial:
                await self.on_partial(text)

        # Transcripción final de un segmento
        elif msg_type == "final":
            text = data.get("text", "")
            if text:
                self._buffered_text += " " + text if self._buffered_text else text
                if self.on_final:
                    await self.on_final(text)

        # Turno completo finalizado (todo lo que dijo el usuario en este turno)
        elif msg_type == "turn_finalized":
            full_text = self._buffered_text.strip()
            self._buffered_text = ""
            logger.info("STT turno finalizado: %s", full_text[:80])
            if full_text and self.on_turn_finalized:
                await self.on_turn_finalized(full_text)

        # Error del servidor
        elif msg_type == "error":
            logger.error("Error de ElevenLabs STT: %s", data.get("message", "unknown"))
