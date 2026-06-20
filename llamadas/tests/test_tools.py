"""Tests de las function-tools: declaraciones + ejecución (modo offline)."""
from __future__ import annotations

import pytest

from app.conversation.state import CallContext
from app.gemini import tools


def _ctx() -> CallContext:
    return CallContext(call_sid="CA_test", phone="+5215512345678", business_type="gimnasio")


def test_all_declarations_have_required_fields():
    for decl in tools.TOOL_DECLARATIONS:
        assert decl["name"]
        assert decl["description"]
        assert decl["parameters"]["type"] == "object"


def test_tool_names_match():
    assert "transferir_humano" in tools.TOOL_NAMES
    assert "agendar_demo" in tools.TOOL_NAMES
    # El objetivo es solo agendar demos: no debe existir tool de negociación/descuento.
    assert "generar_descuento" not in tools.TOOL_NAMES
    assert len(tools.TOOL_DECLARATIONS) == 12


@pytest.mark.asyncio
async def test_calcular_roi_math():
    ctx = _ctx()
    res = await tools.execute_tool(
        "calcular_roi",
        {"citas_por_semana": 40, "precio_promedio_cita": 30, "cancelaciones_por_semana": 10},
        ctx,
    )
    # 10 cancelaciones * 0.7 recuperadas * $30 * 4.3 semanas = 903.0
    assert res["ingreso_mensual_recuperado"] == pytest.approx(903.0, rel=0.01)


@pytest.mark.asyncio
async def test_buscar_caso_de_exito_offline():
    res = await tools.execute_tool("buscar_caso_de_exito", {"tipo_negocio": "gimnasio"}, _ctx())
    assert "FitZone" in res["caso"]
    assert res["precio_justo"] == 59


@pytest.mark.asyncio
async def test_comparar_competidor_calendly():
    res = await tools.execute_tool(
        "comparar_con_competidor", {"herramienta_actual": "Calendly", "tipo_negocio": "gimnasio"}, _ctx()
    )
    assert any("Calendly" in d for d in res["diferencias"])


@pytest.mark.asyncio
async def test_transferir_humano_sets_context():
    ctx = _ctx()
    res = await tools.execute_tool("transferir_humano", {"razon": "hot lead"}, ctx)
    assert res["status"] == "transfiriendo"
    assert ctx.transfer_requested is True
    assert ctx.outcome == "transferido"


@pytest.mark.asyncio
async def test_consultar_crm_offline_does_not_crash():
    res = await tools.execute_tool("consultar_crm", {"telefono": "+5215511112222"}, _ctx())
    assert res["phone"] == "+5215511112222"


@pytest.mark.asyncio
async def test_unknown_tool_returns_error():
    res = await tools.execute_tool("no_existe", {}, _ctx())
    assert "error" in res
