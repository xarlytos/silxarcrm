"""Métricas en proceso (contadores + latencia). Ligero, sin dependencias.

Para producción se exportarían a Prometheus/StatsD; aquí mantenemos un snapshot
en memoria para `/status` y para análisis post-llamada.
"""
from __future__ import annotations

import logging
import threading
import time
from collections import defaultdict, deque

logger = logging.getLogger(__name__)

_lock = threading.Lock()
_counters: dict[str, int] = defaultdict(int)
_latencies: list[float] = []

# Circuit breaker por latencia por componente
_component_latencies: dict[str, deque[float]] = {
    "gemini_stt": deque(maxlen=10),
    "gemini_llm": deque(maxlen=10),
    "elevenlabs_tts": deque(maxlen=10),
    "bridge_processing": deque(maxlen=10),
    "network_rtt": deque(maxlen=10),
}
_circuit_breaker_active: dict[str, bool] = {
    "gemini_stt": False,
    "gemini_llm": False,
    "elevenlabs_tts": False,
}

# Umbrales de circuit breaker (ms)
_CIRCUIT_THRESHOLDS_MS = {
    "gemini_stt": 500,
    "gemini_llm": 800,
    "elevenlabs_tts": 300,
}


def record(event: str, n: int = 1) -> None:
    with _lock:
        _counters[event] += n


def record_latency(seconds: float) -> None:
    """Latencia audio-in -> primer audio-out (objetivo < 0.8 s)."""
    with _lock:
        _latencies.append(seconds)


def record_component_latency(component: str, ms: float) -> None:
    """Registra latencia de un componente específico para circuit breaker."""
    if component in _component_latencies:
        with _lock:
            _component_latencies[component].append(ms)
            # Verificar circuit breaker
            window = list(_component_latencies[component])
            if len(window) >= 5:
                p50 = sorted(window)[len(window) // 2]
                threshold = _CIRCUIT_THRESHOLDS_MS.get(component, float('inf'))
                was_active = _circuit_breaker_active.get(component, False)
                is_active = p50 > threshold
                _circuit_breaker_active[component] = is_active
                if is_active and not was_active:
                    logger.warning(
                        "CIRCUIT BREAKER ACTIVADO: %s latencia P50=%.0fms > umbral=%dms",
                        component, p50, threshold
                    )
                elif not is_active and was_active:
                    logger.info("CIRCUIT BREAKER DESACTIVADO: %s volviendo a normal", component)


def is_circuit_breaker_active(component: str) -> bool:
    """Verifica si el circuit breaker está activo para un componente."""
    with _lock:
        return _circuit_breaker_active.get(component, False)


# ═══ RATE LIMITING DETECTION ═══
_rate_limit_window: deque[float] = deque(maxlen=100)  # Últimos 100 intentos
_rate_limit_threshold: int = 5  # Alertar si >5 en 1 minuto


def record_rate_limit_hit() -> None:
    """Registra un error 429 (rate limit) de una API."""
    import time
    with _lock:
        _rate_limit_window.append(time.time())
        _counters["rate_limit_hit"] += 1


def get_rate_limit_count_last_minute() -> int:
    """Retorna cuántos rate limits en el último minuto."""
    import time
    now = time.time()
    with _lock:
        recent = sum(1 for t in _rate_limit_window if now - t < 60)
    return recent


def is_rate_limit_critical() -> bool:
    """Retorna True si hay demasiados rate limits (> umbral)."""
    return get_rate_limit_count_last_minute() >= _rate_limit_threshold


def get_component_latency_stats(component: str) -> dict:
    """Retorna estadísticas de latencia de un componente."""
    with _lock:
        window = list(_component_latencies.get(component, []))
    if not window:
        return {"p50_ms": None, "p95_ms": None, "samples": 0}
    sorted_window = sorted(window)
    return {
        "p50_ms": round(sorted_window[len(sorted_window) // 2], 1),
        "p95_ms": round(sorted_window[int(len(sorted_window) * 0.95)], 1) if len(sorted_window) >= 5 else None,
        "samples": len(window),
    }


def _rate(num: int, den: int) -> float | None:
    return round(num / den, 3) if den else None


def conversion_rates(c: dict[str, int]) -> dict:
    """Calcula las tasas del embudo a partir de los contadores."""
    started = c.get("call_started", 0)
    return {
        "conversacion_30s": _rate(c.get("conversation_30s", 0), started),
        "interes": _rate(c.get("interes", 0), started),
        "demo_agendada": _rate(c.get("outcome_demo_agendada", 0), started),
        "transferencia": _rate(c.get("outcome_transferido", 0), started),
        "optout": _rate(c.get("outcome_optout", 0), started),
    }


def snapshot() -> dict:
    with _lock:
        lat = list(_latencies)
        counters = dict(_counters)

    avg = round(sum(lat) / len(lat), 3) if lat else None
    p95 = round(sorted(lat)[int(len(lat) * 0.95)], 3) if len(lat) >= 20 else None

    # ═══ COMPLIANCE METRICS ═══
    # Tasa de disclosure (cuántas veces se mencionó que es IA)
    calls_started = counters.get("call_started", 1)
    disclosure_events = counters.get("compliance_disclosure_mentioned", 0)
    disclosure_rate = round(disclosure_events / calls_started, 2) if calls_started > 0 else 0

    # Recording consent
    recording_consents = counters.get("compliance_recording_consented", 0)
    recording_rate = round(recording_consents / calls_started, 2) if calls_started > 0 else 0

    # Opt-outs detectados
    optouts = counters.get("outcome_optout", 0)

    # Rate limits
    rate_limit_hits = get_rate_limit_count_last_minute()

    return {
        "counters": counters,
        "rates": conversion_rates(counters),
        "latency_avg_s": avg,
        "latency_p95_s": p95,
        "circuit_breaker": dict(_circuit_breaker_active),
        "component_stats": {
            comp: get_component_latency_stats(comp)
            for comp in _component_latencies
        },
        "compliance": {
            "disclosure_rate": disclosure_rate,  # % de calls que mencionan IA
            "recording_consent_rate": recording_rate,  # % de calls consentidos
            "optout_detections": optouts,
            "rate_limit_hits_last_minute": rate_limit_hits,
        },
        "cache": {
            "hits": _counters.get("cache_hit", 0),  # Respuestas desde cache
        },
        "ts": time.time(),
    }
