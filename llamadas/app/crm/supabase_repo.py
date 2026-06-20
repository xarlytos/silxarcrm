"""Acceso al CRM (Supabase). Degrada a no-op si faltan credenciales.

Tablas esperadas en Supabase:
  prospects(phone PK, business_name, business_type, city, status, optout bool, notes)
  call_logs(call_sid PK, phone, outcome, transcript jsonb, duration_s, created_at)
"""
from __future__ import annotations

import logging
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not settings.supabase_url or not settings.supabase_service_key:
        return None
    try:
        from supabase import create_client

        _client = create_client(settings.supabase_url, settings.supabase_service_key)
    except Exception as exc:  # noqa: BLE001
        logger.warning("No se pudo iniciar Supabase (%s); CRM en modo offline", exc)
        _client = None
    return _client


async def get_prospect(phone: str) -> dict[str, Any]:
    client = _get_client()
    if client is None:
        return {"phone": phone, "status": "desconocido", "historial": "sin datos (offline)"}
    try:
        res = client.table("prospects").select("*").eq("phone", phone).limit(1).execute()
        rows = res.data or []
        return rows[0] if rows else {"phone": phone, "status": "nuevo"}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo get_prospect (%s)", exc)
        return {"phone": phone, "status": "error"}


async def is_optout(phone: str) -> bool:
    client = _get_client()
    if client is None:
        return False
    try:
        res = client.table("prospects").select("optout").eq("phone", phone).limit(1).execute()
        rows = res.data or []
        return bool(rows and rows[0].get("optout"))
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo is_optout (%s)", exc)
        return False


async def set_optout(phone: str) -> None:
    client = _get_client()
    if client is None:
        logger.info("[offline] opt-out registrado para %s", phone)
        return
    try:
        client.table("prospects").upsert(
            {"phone": phone, "optout": True, "status": "optout"}
        ).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo set_optout (%s)", exc)


async def log_demo(phone: str, fecha: str) -> None:
    logger.info("Demo agendada para %s el %s", phone, fecha)


async def log_call(ctx) -> None:
    """Guarda el resultado y transcripción de la llamada."""
    client = _get_client()
    payload = {
        "call_sid": ctx.call_sid,
        "phone": ctx.phone,
        "outcome": ctx.outcome,
        "transcript": ctx.transcript,
        "duration_s": None,
    }
    if client is None:
        logger.info("[offline] call_log: %s -> %s", ctx.call_sid, ctx.outcome)
        return
    try:
        client.table("call_logs").upsert(payload).execute()
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo log_call (%s)", exc)
