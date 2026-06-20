"""RAG sobre la base de conocimiento (casos de éxito y objeciones).

Búsqueda semántica con `gemini-embedding-001`: al primer uso se embeben todos
los casos de `seed_data` y se cachean en memoria; cada consulta se embebe y se
rankea por similitud coseno. Si no hay API key o falla, cae a un filtro por
tipo de negocio (substring) para no romper la llamada.

La comparación con competidores sigue siendo determinista (catálogo curado),
porque ahí la exactitud importa más que la semántica.
"""
from __future__ import annotations

import asyncio
import logging

from app.config import settings
from app.knowledge.seed_data import COMPETITOR_COMPARISONS, SUCCESS_CASES

logger = logging.getLogger(__name__)

# Índice en memoria: lista de (vector, caso). Se construye una sola vez.
_index: list[tuple[list[float], dict]] | None = None
_index_lock = asyncio.Lock()
_client = None  # cliente genai cacheado (evita recrearlo en cada embedding)


def _genai_client():
    global _client
    if _client is None:
        from google import genai

        _client = genai.Client(api_key=settings.gemini_api_key)
    return _client


def _case_text(case: dict) -> str:
    return f"{case['tipo_negocio']}. {case['dolor']} {case['caso']} objeción: {case['objecion_comun']}"


async def _embed(texts: list[str]) -> list[list[float]] | None:
    if not settings.gemini_api_key:
        return None
    try:
        client = _genai_client()
        # embed_content es síncrono; lo sacamos del event loop.
        resp = await asyncio.to_thread(
            client.models.embed_content, model=settings.embedding_model, contents=texts
        )
        return [e.values for e in resp.embeddings]
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo generando embeddings (%s); RAG en modo substring", exc)
        return None


def _cosine(a: list[float], b: list[float]) -> float:
    import math

    dot = sum(x * y for x, y in zip(a, b))
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return dot / (na * nb) if na and nb else 0.0


async def _ensure_index() -> None:
    global _index
    if _index is not None:
        return
    async with _index_lock:
        if _index is not None:
            return
        vectors = await _embed([_case_text(c) for c in SUCCESS_CASES])
        if vectors is None:
            _index = []  # marca "sin embeddings": se usará el fallback
        else:
            _index = list(zip(vectors, SUCCESS_CASES))
            logger.info("Índice RAG construido con %d casos embebidos", len(_index))


def _format(case: dict) -> dict:
    return {
        "caso": case["caso"],
        "dolor": case["dolor"],
        "precio_justo": case["precio_justo"],
        "objecion_comun": case["objecion_comun"],
    }


def _substring_match(tipo_negocio: str) -> dict:
    tipo = (tipo_negocio or "").lower().strip()
    matches = [c for c in SUCCESS_CASES if c["tipo_negocio"] == tipo]
    return _format((matches or SUCCESS_CASES[:1])[0])


async def find_success_case(tipo_negocio: str, ciudad: str | None = None) -> dict:
    """Devuelve el caso de éxito más relevante (semántico, con fallback)."""
    await _ensure_index()
    if not _index:  # sin embeddings disponibles
        return _substring_match(tipo_negocio)

    query = f"{tipo_negocio} {ciudad or ''}".strip()
    qvec = await _embed([query])
    if not qvec:
        return _substring_match(tipo_negocio)

    best = max(_index, key=lambda pair: _cosine(qvec[0], pair[0]))
    return _format(best[1])


async def compare_competitor(herramienta_actual: str, tipo_negocio: str | None = None) -> dict:
    key = (herramienta_actual or "").lower().strip()
    for name, data in COMPETITOR_COMPARISONS.items():
        if name in key:
            return data
    return {
        "diferencias": [
            f"A diferencia de {herramienta_actual}, GestPro junta agenda, recordatorios por WhatsApp, cobros y CRM en uno.",
        ],
        "caso_exito": "Negocios similares ahorraron tiempo y dejaron de perder citas al unificar todo en GestPro.",
    }


async def reindex_to_pgvector() -> int:
    """Genera embeddings de SUCCESS_CASES y los persiste en Supabase/pgvector.

    Tabla esperada: kb_cases(id, tipo_negocio, texto, payload jsonb, embedding vector(3072)).
    No-op si faltan credenciales. Devuelve nº de filas indexadas.
    """
    if not settings.gemini_api_key:
        logger.warning("Sin GEMINI_API_KEY; no se pueden generar embeddings.")
        return 0
    vectors = await _embed([_case_text(c) for c in SUCCESS_CASES])
    if vectors is None:
        return 0
    if not settings.supabase_url or not settings.supabase_service_key:
        logger.info("Embeddings generados (%d) pero sin Supabase; quedan en RAG local.", len(vectors))
        # Aprovechamos para poblar el índice en memoria.
        global _index
        _index = list(zip(vectors, SUCCESS_CASES))
        return 0
    try:
        from supabase import create_client

        client = create_client(settings.supabase_url, settings.supabase_service_key)
        rows = [
            {
                "tipo_negocio": c["tipo_negocio"],
                "texto": _case_text(c),
                "payload": c,
                "embedding": v,
            }
            for v, c in zip(vectors, SUCCESS_CASES)
        ]
        client.table("kb_cases").upsert(rows).execute()
        logger.info("Indexados %d casos en pgvector", len(rows))
        return len(rows)
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo subiendo a pgvector (%s)", exc)
        return 0
