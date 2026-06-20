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
        "ts": time.time(),
    }
