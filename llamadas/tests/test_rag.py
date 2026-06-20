"""Tests del RAG: fallback por substring cuando no hay embeddings disponibles."""
from __future__ import annotations

import pytest

from app.knowledge import rag


@pytest.fixture(autouse=True)
def _force_substring(monkeypatch):
    # Sin embeddings: _embed devuelve None -> fuerza el camino de fallback.
    async def _no_embed(_texts):
        return None

    monkeypatch.setattr(rag, "_embed", _no_embed)
    monkeypatch.setattr(rag, "_index", None)
    yield


async def test_find_success_case_fallback_por_tipo():
    res = await rag.find_success_case("gimnasio")
    assert "FitZone" in res["caso"]
    assert res["precio_justo"] == 59


async def test_find_success_case_desconocido_no_rompe():
    res = await rag.find_success_case("tipo_inexistente")
    assert "caso" in res and res["caso"]


async def test_compare_competitor_calendly():
    res = await rag.compare_competitor("uso Calendly")
    assert any("Calendly" in d for d in res["diferencias"])
