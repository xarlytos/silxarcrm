"""Sesión TTS con ElevenLabs Flash v2.5 (streaming WebSocket).

ElevenLabs Flash v2.5: ultra-low latency TTS (~75ms time-to-first-audio).
Referencia: https://elevenlabs.io/docs/api-reference/flash-v2-5

Estrategia de streaming:
- El LLM genera texto token-por-token.
- Este TTS consume texto tan pronto como llega (no espera respuesta completa).
- Buffer mínimo (20 chars) para balancear TTFA vs prosodia.
- Primer chunk se envía INMEDIATAMENTE para mínima latencia percibida.
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
from typing import Awaitable, Callable

logger = logging.getLogger(__name__)

AudioCallback = Callable[[bytes], Awaitable[None]]


class ElevenLabsTTS:
    """WebSocket cliente para ElevenLabs Flash v2.5 streaming TTS."""

    def __init__(
        self,
        api_key: str,
        voice_id: str,
        on_audio: AudioCallback,
        sample_rate: int = 8000,
        output_format: str = "ulaw_8000",
        model_id: str = "eleven_flash_v2_5",
        latency_optimization: int = 0,
    ) -> None:
        self.api_key = api_key
        self.voice_id = voice_id
        self.on_audio = on_audio
        self.sample_rate = sample_rate
        self.output_format = output_format
        self.model_id = model_id
        self.latency_optimization = latency_optimization

        self._ws = None
        self._closed = asyncio.Event()
        self._cancelled = False
        self._pending_text = ""
        self._send_task: asyncio.Task | None = None
        self._audio_format = output_format  # "ulaw_8000", "pcm_16000", etc.
        self._is_first_chunk = True  # Para enviar el primer texto inmediatamente

    def _ws_url(self) -> str:
        return (
            f"wss://api.elevenlabs.io/v1/text-to-speech/{self.voice_id}/stream?"
            f"output_format={self.output_format}&"
            f"sample_rate={self.sample_rate}"
        )

    async def start(self) -> None:
        """Conecta y arranca el loop de recepción de audio."""
        import websockets

        headers = {"xi-api-key": self.api_key}
        logger.info("Conectando a ElevenLabs TTS (voice=%s, format=%s)...", self.voice_id, self.output_format)
        self._ws = await websockets.connect(self._ws_url(), extra_headers=headers)
        logger.info("Conectado a ElevenLabs TTS")

        # Enviar configuración inicial optimizada para Flash v2.5 + español + telefonía
        config = {
            "type": "setup",
            "model_id": self.model_id,
            "voice_settings": {
                "stability": 0.35,          # Menor estabilidad = más expresivo/natural
                "similarity_boost": 0.60,   # Balance claridad/naturalidad
                "style": 0.0,               # Sin exageración (mejor para telefonía)
                "use_speaker_boost": True,  # Mejora claridad y presencia de voz
                "speed": 1.05,              # Ligeramente más rápido = más dinámico
            },
            "generation_config": {
                "latency_optimization": self.latency_optimization,
            },
        }
        await self._ws.send(json.dumps(config))
        logger.info(
            "TTS configurado: model=%s latency_opt=%d voice=%s format=%s",
            self.model_id, self.latency_optimization, self.voice_id, self.output_format
        )

        await self._receive_loop()

    async def close(self) -> None:
        self._closed.set()
        if self._send_task and not self._send_task.done():
            self._send_task.cancel()
        if self._ws:
            try:
                await self._ws.close()
            except Exception:
                pass

    async def send_text(self, text: str, flush: bool = False) -> None:
        """Envía texto para sintetizar en streaming token-by-token.

        Optimizado para Gemini 3.1 Flash-Lite (~380-400 T/s):
        - El LLM genera texto tan rápido que el TTS puede empezar casi inmediatamente.
        - Primer chunk: se envía INMEDIATAMENTE (no espera acumulación).
        - Chunks siguientes: buffer de 15 chars (mínimo para prosodia decente).
        - ElevenLabs Flash v2.5 (~75ms TTFA) comienza a hablar mientras el LLM aún genera.
        """
        if self._cancelled:
            return
        self._pending_text += text

        # Enviar inmediatamente el primer chunk para TTFA mínimo (~75ms)
        if self._is_first_chunk and self._pending_text:
            await self._flush_pending()
            self._is_first_chunk = False
            return

        # Para chunks subsiguientes: buffer mínimo gracias a Flash-Lite (~380-400 T/s)
        if flush:
            await self._flush_pending()
        elif len(self._pending_text) >= 15:
            # Buffer agresivo de 15 chars: Flash-Lite genera tan rápido
            # que no necesitamos acumular más para buena prosodia
            await self._flush_pending()
        elif any(c in self._pending_text for c in ".;!?,"):
            # Pausa natural detectada — enviar para mejor prosodia
            await self._flush_pending()

    async def flush(self) -> None:
        """Fuerza el envío de cualquier texto pendiente."""
        await self._flush_pending()

    async def _flush_pending(self) -> None:
        if not self._pending_text or not self._ws or not self._ws.open:
            return
        text = self._pending_text
        self._pending_text = ""
        try:
            # ElevenLabs WebSocket API: enviar texto con try_trigger_generation=True
            # para iniciar síntesis tan pronto como sea posible.
            await self._ws.send(json.dumps({
                "type": "text",
                "text": text + " ",  # Espacio final ayuda a TTS con phrasing
                "try_trigger_generation": True,
            }))
        except Exception as exc:
            logger.warning("Error enviando texto a TTS: %s", exc)

    async def cancel(self) -> None:
        """Cancela la generación en curso (barge-in). Descarta audio pendiente."""
        logger.info("Cancelando TTS (barge-in)")
        self._cancelled = True
        self._pending_text = ""
        self._is_first_chunk = True  # Reset: siguiente texto se envía inmediatamente
        if self._ws and self._ws.open:
            try:
                await self._ws.send(json.dumps({"type": "cancel"}))
            except Exception:
                pass
        # Reset para permitir nueva generación tras un breve delay
        await asyncio.sleep(0.05)
        self._cancelled = False

    async def _receive_loop(self) -> None:
        while not self._closed.is_set():
            try:
                msg = await asyncio.wait_for(self._ws.recv(), timeout=1.0)
                data = json.loads(msg)
                await self._handle_message(data)
            except asyncio.TimeoutError:
                continue
            except json.JSONDecodeError:
                logger.warning("Mensaje JSON inválido de ElevenLabs TTS")
                continue
            except Exception as exc:
                logger.warning("Error recibiendo de ElevenLabs TTS: %s", exc)
                break

    async def _handle_message(self, data: dict) -> None:
        msg_type = data.get("type")

        if msg_type == "audio":
            audio_b64 = data.get("audio", "")
            if audio_b64 and self.on_audio:
                try:
                    audio_bytes = base64.b64decode(audio_b64)
                    await self.on_audio(audio_bytes)
                except Exception as exc:
                    logger.warning("Error decodificando audio TTS: %s", exc)

        elif msg_type == "generation_canceled":
            logger.debug("Generación TTS cancelada por servidor")

        elif msg_type == "error":
            logger.error("Error de ElevenLabs TTS: %s", data.get("message", "unknown"))
