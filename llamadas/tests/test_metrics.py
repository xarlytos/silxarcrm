"""Tests de las tasas de conversión y del snapshot de métricas."""
from __future__ import annotations

from app.observability import metrics


def test_conversion_rates():
    counters = {
        "call_started": 100,
        "conversation_30s": 60,
        "interes": 20,
        "outcome_demo_agendada": 10,
        "outcome_transferido": 5,
        "outcome_optout": 3,
    }
    r = metrics.conversion_rates(counters)
    assert r["conversacion_30s"] == 0.6
    assert r["interes"] == 0.2
    assert r["demo_agendada"] == 0.1
    assert r["transferencia"] == 0.05


def test_rates_sin_llamadas_no_divide_por_cero():
    r = metrics.conversion_rates({})
    assert r["demo_agendada"] is None


def test_snapshot_incluye_rates_y_latencia():
    metrics.record("call_started", 2)
    metrics.record_latency(0.6)
    snap = metrics.snapshot()
    assert "rates" in snap
    assert snap["latency_avg_s"] is not None
