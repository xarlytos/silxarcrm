"""Test de que la config de VAD se construye con los settings (sin tocar la red)."""
from __future__ import annotations

import pytest


def test_vad_config_usa_settings():
    pytest.importorskip("google.genai")
    from app.config import settings
    from app.gemini.live_session import _vad_config

    cfg = _vad_config()
    assert cfg.silence_duration_ms == settings.vad_silence_ms
    assert cfg.prefix_padding_ms == settings.vad_prefix_padding_ms
    # Las sensibilidades resolvieron a un enum válido (no None).
    assert cfg.start_of_speech_sensitivity is not None
    assert cfg.end_of_speech_sensitivity is not None
