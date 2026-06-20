"""Utilidades de DSP ligeras para limpiar el audio entrante (mono PCM16).

Mantiene dependencias mínimas (solo numpy). El noise-suppression pesado tipo
RNNoise es opcional y se documenta como mejora futura; aquí cubrimos lo que da
mejor relación esfuerzo/beneficio en telefonía: medir nivel (para VAD/AGC) y un
control de ganancia automático suave para nivelar voces altas/bajas.
"""
from __future__ import annotations

import numpy as np

SAMPLE_WIDTH = 2  # PCM16


def _to_array(pcm: bytes) -> np.ndarray:
    return np.frombuffer(pcm, dtype=np.int16).astype(np.float32)


def rms_level(pcm: bytes) -> float:
    """Nivel RMS normalizado [0, 1] del chunk PCM16. Útil para VAD/energía."""
    if not pcm:
        return 0.0
    samples = _to_array(pcm)
    if samples.size == 0:
        return 0.0
    rms = float(np.sqrt(np.mean(samples**2)))
    return min(rms / 32768.0, 1.0)


def is_speech(pcm: bytes, threshold: float = 0.02) -> bool:
    """VAD por energía (heurístico). Gemini hace su propio VAD; esto sirve para
    métricas locales (ruido de fondo, detección de silencio prolongado)."""
    return rms_level(pcm) >= threshold


def auto_gain(pcm: bytes, target_rms: float = 0.12, max_gain: float = 4.0) -> bytes:
    """AGC suave: acerca el nivel al objetivo sin recortar (clipping)."""
    if not pcm:
        return pcm
    samples = _to_array(pcm)
    level = float(np.sqrt(np.mean(samples**2))) / 32768.0
    if level < 1e-5:
        return pcm
    gain = min(target_rms / level, max_gain)
    out = np.clip(samples * gain, -32768, 32767).astype(np.int16)
    return out.tobytes()


def noise_gate(pcm: bytes, floor: float = 0.01) -> bytes:
    """Atenúa los tramos por debajo del umbral (ruido de fondo en silencios).

    Gate suave: no silencia de golpe (evita 'pumping'); reduce el ruido cuando
    no hay voz para que el VAD de Gemini no se confunda con tráfico/perros.
    """
    if not pcm:
        return pcm
    samples = _to_array(pcm)
    level = float(np.sqrt(np.mean(samples**2))) / 32768.0
    if level >= floor:
        return pcm
    out = (samples * 0.3).astype(np.int16)  # -10 dB aprox en tramos de ruido
    return out.tobytes()


def preprocess_inbound(pcm: bytes) -> bytes:
    """Cadena de entrada opcional: noise gate + AGC. Úsese solo si hay ruido."""
    return auto_gain(noise_gate(pcm))
