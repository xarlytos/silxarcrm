"""Alertas a Slack para eventos accionables (hot-lead, transfer, fallos)."""
from __future__ import annotations

import logging

import httpx

from app.config import settings

logger = logging.getLogger(__name__)


async def alert(kind: str, message: str) -> None:
    """Envía una alerta a Slack. No-op si no hay webhook configurado."""
    text = f":telephone_receiver: *{kind}* — {message}"
    if not settings.slack_webhook_url:
        logger.info("[alerta:%s] %s", kind, message)
        return
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            await client.post(settings.slack_webhook_url, json={"text": text})
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo enviando alerta a Slack (%s)", exc)


# Tipos de alerta accionables (referencia para los llamadores).
HOT_LEAD = "hot_lead"
NEGATIVE_SENTIMENT = "sentimiento_negativo"
TRANSFER_NEEDED = "transferencia"
LONG_CALL = "llamada_larga"
TECHNICAL_ISSUE = "fallo_tecnico"
COST_SPIKE = "pico_de_costo"
