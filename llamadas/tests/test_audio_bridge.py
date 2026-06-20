"""Tests del puente de audio: tasas de muestreo y framing de 20 ms."""
from __future__ import annotations

import math

from app.audio.bridge import (
    AudioBridge,
    GEMINI_IN_RATE,
    TWILIO_FRAME_BYTES,
    TWILIO_RATE,
)

try:
    import audioop  # type: ignore
except ModuleNotFoundError:  # pragma: no cover
    import audioop_lts as audioop  # type: ignore


def _sine_ulaw_8k(ms: int, freq: int = 440) -> bytes:
    """Genera un tono senoidal en mu-law 8 kHz de la duración pedida."""
    n = int(TWILIO_RATE * ms / 1000)
    pcm = bytearray()
    for i in range(n):
        val = int(20000 * math.sin(2 * math.pi * freq * i / TWILIO_RATE))
        pcm += int(val).to_bytes(2, "little", signed=True)
    return audioop.lin2ulaw(bytes(pcm), 2)


def test_inbound_upsamples_8k_to_16k():
    bridge = AudioBridge()
    ulaw = _sine_ulaw_8k(20)  # 20 ms -> 160 muestras a 8k
    pcm16k = bridge.twilio_to_gemini(ulaw)
    # 16 kHz => ~2x muestras. PCM16 = 2 bytes/muestra => ~640 bytes (±filtro).
    samples = len(pcm16k) // 2
    expected = int(160 * GEMINI_IN_RATE / TWILIO_RATE)
    assert abs(samples - expected) <= 4


def test_outbound_frames_are_exactly_160_bytes():
    bridge = AudioBridge()
    # 200 ms de PCM16 a 24 kHz (silencio).
    pcm_24k = b"\x00\x00" * int(24000 * 0.2)
    frames = bridge.gemini_to_twilio_frames(pcm_24k)
    assert frames, "debería emitir al menos un frame"
    assert all(len(f) == TWILIO_FRAME_BYTES for f in frames)
    # 200 ms a 8 kHz => 1600 bytes mu-law => 10 frames de 160 bytes.
    assert len(frames) == 10


def test_outbound_buffers_partial_frames():
    bridge = AudioBridge()
    # 25 ms a 24 kHz: tras resamplear a 8 kHz son ~200 bytes => 1 frame + residuo.
    pcm_24k = b"\x00\x00" * int(24000 * 0.025)
    frames = bridge.gemini_to_twilio_frames(pcm_24k)
    assert len(frames) == 1
    # El residuo sale con flush, rellenado a 160 bytes.
    tail = bridge.flush()
    assert all(len(f) == TWILIO_FRAME_BYTES for f in tail)


def test_clear_output_drops_pending_audio():
    bridge = AudioBridge()
    bridge.gemini_to_twilio_frames(b"\x00\x00" * int(24000 * 0.005))  # residuo < 1 frame
    bridge.clear_output()
    assert bridge.flush() == []
