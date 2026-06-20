"""Puente de audio Twilio <-> Gemini Live.

Twilio Media Streams entrega/recibe audio G.711 **mu-law a 8 kHz**, en frames
de 20 ms (160 bytes), codificado en base64. Gemini Live espera PCM de 16-bit:
**16 kHz a la entrada** y emite **24 kHz a la salida**.

Este modulo aisla toda la conversion de formato y el reempaquetado en frames de
20 ms. El resampleo usa ``audioop.ratecv``, que mantiene estado de filtro entre
chunks (imprescindible en streaming para no introducir clicks en las fronteras).
"""
from __future__ import annotations

try:  # audioop fue removido del stdlib en Python 3.13; audioop-lts lo reemplaza.
    import audioop  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    import audioop_lts as audioop  # type: ignore

# Formatos de cada extremo.
TWILIO_RATE = 8000          # mu-law 8 kHz
GEMINI_IN_RATE = 16000      # PCM16 que consume Gemini
GEMINI_OUT_RATE = 24000     # PCM16 que produce Gemini
SAMPLE_WIDTH = 2            # PCM 16-bit = 2 bytes/muestra
CHANNELS = 1

# Twilio envia/espera frames de 20 ms. A 8 kHz mu-law => 160 bytes/frame.
TWILIO_FRAME_BYTES = 160


class AudioBridge:
    """Convierte audio entre Twilio (mu-law 8k) y Gemini (PCM 16k/24k).

    Una instancia por llamada: guarda el estado de ``ratecv`` de cada direccion
    y el residuo de bytes para emitir frames de 160 bytes exactos a Twilio.
    """

    def __init__(self) -> None:
        # Estado de resampleo (debe persistir entre chunks de la misma llamada).
        self._in_state = None   # 8k -> 16k
        self._out_state = None  # 24k -> 8k
        # Buffer de salida hacia Twilio (mu-law 8k) pendiente de framear.
        self._out_buffer = bytearray()

    # ---------- Twilio -> Gemini ----------
    def twilio_to_gemini(self, ulaw_8k: bytes) -> bytes:
        """mu-law 8 kHz -> PCM16 16 kHz."""
        pcm_8k = audioop.ulaw2lin(ulaw_8k, SAMPLE_WIDTH)
        pcm_16k, self._in_state = audioop.ratecv(
            pcm_8k, SAMPLE_WIDTH, CHANNELS, TWILIO_RATE, GEMINI_IN_RATE, self._in_state
        )
        return pcm_16k

    # ---------- Gemini -> Twilio ----------
    def gemini_to_twilio_frames(self, pcm_24k: bytes) -> list[bytes]:
        """PCM16 24 kHz -> lista de frames mu-law 8 kHz de 160 bytes.

        Acumula en un buffer y solo emite frames completos de 20 ms; el residuo
        queda para la siguiente llamada. Usa ``flush()`` al terminar para vaciar.
        """
        pcm_8k, self._out_state = audioop.ratecv(
            pcm_24k, SAMPLE_WIDTH, CHANNELS, GEMINI_OUT_RATE, TWILIO_RATE, self._out_state
        )
        ulaw_8k = audioop.lin2ulaw(pcm_8k, SAMPLE_WIDTH)
        self._out_buffer.extend(ulaw_8k)
        return self._drain_full_frames()

    def _drain_full_frames(self) -> list[bytes]:
        frames: list[bytes] = []
        while len(self._out_buffer) >= TWILIO_FRAME_BYTES:
            frames.append(bytes(self._out_buffer[:TWILIO_FRAME_BYTES]))
            del self._out_buffer[:TWILIO_FRAME_BYTES]
        return frames

    def flush(self) -> list[bytes]:
        """Emite el residuo final, rellenando con silencio mu-law (0xFF)."""
        if not self._out_buffer:
            return []
        pad = TWILIO_FRAME_BYTES - (len(self._out_buffer) % TWILIO_FRAME_BYTES)
        if pad != TWILIO_FRAME_BYTES:
            self._out_buffer.extend(b"\xff" * pad)
        return self._drain_full_frames()

    def clear_output(self) -> None:
        """Vacia el audio en cola hacia Twilio (barge-in: el usuario interrumpio).

        No resetea el estado de ``ratecv`` para no perder continuidad si el
        agente retoma la palabra; solo descarta el audio aun no enviado.
        """
        self._out_buffer.clear()

    # ---------- ElevenLabs mu-law directo -> Twilio ----------
    def pack_ulaw_frames(self, ulaw_data: bytes) -> list[bytes]:
        """Empaqueta mu-law ya en 8kHz en frames de 160 bytes para Twilio.

        Usado cuando ElevenLabs TTS devuelve mu-law directamente (output_format=ulaw_8000).
        """
        self._out_buffer.extend(ulaw_data)
        return self._drain_full_frames()
