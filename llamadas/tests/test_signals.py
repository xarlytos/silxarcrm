"""Tests del clasificador de señales (emoción + caos) y del estado de frustración."""
from __future__ import annotations

from app.conversation.signals import analyze_turn
from app.conversation.state import CallContext


def test_detecta_molesto_y_sube_frustracion():
    s = analyze_turn("ya basta, esto es spam, no me moleste")
    assert s.emotion == "molesto"
    assert s.frustration_delta == 2


def test_detecta_interesado_y_baja_frustracion():
    s = analyze_turn("me interesa, ¿cuánto cuesta?")
    assert s.emotion == "interesado"
    assert s.frustration_delta == -1


def test_detecta_ocupado():
    assert analyze_turn("ahora no, estoy con un cliente").emotion == "ocupado"


def test_detecta_caos_manejando():
    assert analyze_turn("es que voy manejando").chaos == "manejando"


def test_neutro_por_defecto():
    s = analyze_turn("buenos días")
    assert s.emotion == "neutro"
    assert s.chaos is None


def test_frustracion_se_acota_0_10():
    ctx = CallContext(call_sid="x", phone="+52")
    for _ in range(10):
        ctx.apply_frustration(2)
    assert ctx.frustration == 10
    ctx.apply_frustration(-100)
    assert ctx.frustration == 0
