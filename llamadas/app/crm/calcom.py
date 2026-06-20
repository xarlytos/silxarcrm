"""Agendado de demos vía Cal.com. Degrada a confirmación local si no hay API key."""
from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)

CALCOM_API = "https://api.cal.com/v1"


async def book_demo(phone: str, fecha_iso: str, nombre: str | None = None) -> dict:
    if not settings.calcom_api_key or not settings.calcom_event_type_id:
        logger.info("[offline] demo confirmada localmente: %s @ %s", phone, fecha_iso)
        return {"status": "confirmada", "fecha": fecha_iso, "modo": "offline"}
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(
                f"{CALCOM_API}/bookings",
                params={"apiKey": settings.calcom_api_key},
                json={
                    "eventTypeId": int(settings.calcom_event_type_id),
                    "start": fecha_iso,
                    "responses": {"name": nombre or "Prospecto", "notes": f"Tel: {phone}"},
                    "timeZone": "America/Mexico_City",
                    "language": "es",
                },
            )
            resp.raise_for_status()
            return {"status": "confirmada", "fecha": fecha_iso}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo Cal.com (%s); confirmación manual", exc)
        return {"status": "pendiente_confirmar", "fecha": fecha_iso, "error": str(exc)}
