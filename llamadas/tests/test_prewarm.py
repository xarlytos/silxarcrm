"""Tests de las optimizaciones de latencia: pre-carga de prospecto y attach."""
from __future__ import annotations

from app.conversation.prompts import build_system_prompt
from app.conversation.state import CallContext
from app.gemini.live_session import GeminiLiveSession


def test_prompt_incluye_datos_prospecto_precargados():
    ctx = CallContext(
        call_sid="c1",
        phone="+5215511112222",
        business_type="dentista",
        prospect={"status": "cliente_recurrente", "notas": "ya tuvo una demo en marzo"},
    )
    sp = build_system_prompt(ctx)
    # Los datos del CRM viajan en el prompt -> no hace falta consultar_crm en vivo.
    assert "cliente_recurrente" in sp


def test_prompt_sin_prospecto_dice_sin_historial():
    ctx = CallContext(call_sid="c2", phone="+52")
    assert "sin historial" in build_system_prompt(ctx)


async def test_attach_vuelca_audio_precalentado_y_fija_callbacks():
    ctx = CallContext(call_sid="c3", phone="+52")
    # Sesión "pre-calentada": creada sin callbacks reales todavía.
    s = GeminiLiveSession(ctx=ctx, system_prompt="x")
    assert s.on_audio is None
    # Simula audio producido antes de adjuntar (debería bufferearse).
    s._pre_attach_audio.extend([b"aa", b"bb"])

    recibido: list[bytes] = []

    async def collector(chunk: bytes) -> None:
        recibido.append(chunk)

    await s.attach(collector)
    assert recibido == [b"aa", b"bb"]  # se volcó el buffer
    assert s._pre_attach_audio == []
    assert s.on_audio is collector
