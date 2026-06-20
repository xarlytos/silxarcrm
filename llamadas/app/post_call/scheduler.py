"""Scheduler para recordatorios Triple Lock y no-show recovery.

Procesa activation_logs pendientes y ejecuta las acciones programadas:
- Enviar WhatsApp
- Enviar email (vía backend Express)
- Disparar llamada de recovery

Se ejecuta periódicamente (cada 1-5 minutos) o puede llamarse manualmente.
"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Any

from app.config import settings
from app.crm import postgres_repo

logger = logging.getLogger(__name__)


async def process_pending_activations() -> dict[str, Any]:
    """Procesa todos los activation_logs pendientes que deben ejecutarse ahora.

    Returns:
        dict con estadísticas del procesamiento: {"processed": N, "failed": N, "by_type": {...}}
    """
    ahora = datetime.now()
    logs = await postgres_repo.get_pending_activation_logs(
        before=ahora,
        limit=100,
    )

    stats = {"processed": 0, "failed": 0, "by_type": {}}

    for log in logs:
        log_id = log.get("id", "")
        action = log.get("action", "")
        metadata = log.get("metadata") or {}

        try:
            success = await _execute_activation(action, metadata)
            if success:
                await postgres_repo.mark_activation_log_executed(log_id)
                stats["processed"] += 1
                stats["by_type"][action] = stats["by_type"].get(action, 0) + 1
            else:
                await postgres_repo.mark_activation_log_executed(
                    log_id, error="Fallo al ejecutar acción"
                )
                stats["failed"] += 1
        except Exception as exc:
            logger.exception("Error procesando activation log %s: %s", log_id, exc)
            await postgres_repo.mark_activation_log_executed(log_id, error=str(exc))
            stats["failed"] += 1

    logger.info("Scheduler: processed=%d failed=%d", stats["processed"], stats["failed"])
    return stats


async def _execute_activation(action: str, metadata: dict) -> bool:
    """Ejecuta una acción de activación según su tipo.

    Actions soportados:
    - recordatorio_24h, recordatorio_1h: WhatsApp
    - email_valor: Email (vía backend webhook)
    - no_show_whatsapp: WhatsApp de recovery
    - no_show_email: Email de recovery
    - no_show_reengagement: Email + WhatsApp re-engagement
    """
    canal = metadata.get("canal", "")
    telefono = metadata.get("telefono", "")
    email = metadata.get("email", "")
    contenido = metadata.get("contenido", {})

    if action.startswith("recordatorio_") and canal == "whatsapp":
        return await _send_whatsapp_reminder(telefono, action, contenido)

    if action == "email_valor":
        return await _send_email_reminder(email, contenido)

    if action.startswith("no_show_"):
        if canal == "whatsapp":
            return await _send_whatsapp_no_show(telefono, action)
        if canal == "email":
            return await _send_email_no_show(email, action)
        if canal == "email_whatsapp":
            ok_email = await _send_email_no_show(email, action) if email else True
            ok_wa = await _send_whatsapp_no_show(telefono, action) if telefono else True
            return ok_email and ok_wa

    if action == "no_show_llamada":
        # Disparar llamada de recovery
        return await _trigger_recovery_call(telefono, metadata)

    logger.warning("Acción de activación desconocida: %s", action)
    return False


async def _send_whatsapp_reminder(telefono: str, action: str, contenido: dict) -> bool:
    """Envía WhatsApp de recordatorio."""
    from app.telephony.twilio_client import _get_client

    if not telefono:
        return False

    client = _get_client()
    if client is None:
        logger.info("[offline] WhatsApp reminder %s -> %s", action, telefono)
        return True  # Modo offline: no es fallo

    body = contenido.get("mensaje", "")
    if not body:
        # Mensajes por defecto
        if action == "recordatorio_24h":
            body = "¡Hola! Te recordamos que mañana tienes tu demo de GestPro. ¿Confirmas que vas a poder asistir? 👍"
        elif action == "recordatorio_1h":
            body = "¡Hola! En 1 hora comienza tu demo de GestPro. ¿Todo listo? Te espero ahí 🙂"
        else:
            body = "Hola, soy Mariana de GestPro. Te recordamos tu demo. ¡Nos vemos pronto!"

    try:
        client.messages.create(
            from_=f"whatsapp:{settings.twilio_from_number}",
            to=f"whatsapp:{telefono}",
            body=body,
        )
        logger.info("WhatsApp reminder enviado: %s -> %s", action, telefono)
        return True
    except Exception as exc:
        logger.warning("Fallo WhatsApp reminder %s: %s", action, exc)
        return False


async def _send_email_reminder(email: str, contenido: dict) -> bool:
    """Envía email de recordatorio vía backend Express."""
    if not email:
        return True  # No hay email = no es fallo

    if not settings.backend_webhook_url:
        logger.info("[offline] Email reminder -> %s", email)
        return True

    try:
        import httpx

        payload = {
            "event": "email_reminder",
            "to": email,
            "subject": contenido.get("asunto", "Recordatorio de tu demo GestPro"),
            "body": contenido.get("cuerpo", ""),
        }

        await httpx.AsyncClient(timeout=10).post(
            f"{settings.backend_webhook_url}/api/webhooks/email-reminder",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        logger.info("Email reminder enviado: %s", email)
        return True
    except Exception as exc:
        logger.warning("Fallo email reminder: %s", exc)
        return False


async def _send_whatsapp_no_show(telefono: str, action: str) -> bool:
    """Envía WhatsApp de no-show recovery."""
    from app.telephony.twilio_client import _get_client

    if not telefono:
        return False

    client = _get_client()
    if client is None:
        return True

    mensajes = {
        "no_show_whatsapp": (
            "Hola! Soy Mariana de GestPro. Parece que la conexión nos jugó "
            "una mala pasada hoy. No pasa nada. Te dejo 2 opciones:\n"
            "1. Reagendar para esta semana\n"
            "2. Te envío una demo grabada de 10 min que puedes ver cuando quieras\n"
            "¿Cuál prefieres?"
        ),
        "no_show_reengagement": (
            "Hola! Hace unos días teníamos agendada una demo de GestPro. "
            "Se que estás ocupado, pero quería dejarte esto: tenemos una demo "
            "grabada de 10 min donde muestro exactamente cómo negocios similares "
            "recuperan hasta 30% de citas perdidas. Si en algún momento te interesa, "
            "aquí está el link. Un abrazo, Mariana — GestPro"
        ),
    }

    body = mensajes.get(action, "Hola, soy Mariana de GestPro. ¿Podemos reagendar tu demo?")

    try:
        client.messages.create(
            from_=f"whatsapp:{settings.twilio_from_number}",
            to=f"whatsapp:{telefono}",
            body=body,
        )
        logger.info("WhatsApp no-show enviado: %s -> %s", action, telefono)
        return True
    except Exception as exc:
        logger.warning("Fallo WhatsApp no-show: %s", exc)
        return False


async def _send_email_no_show(email: str, action: str) -> bool:
    """Envía email de no-show recovery."""
    if not email:
        return True

    if not settings.backend_webhook_url:
        return True

    try:
        import httpx

        asunto = "Reagendemos tu demo de GestPro"
        cuerpo = (
            "Hola,\n\n"
            "Soy Mariana de GestPro. Parece que la conexión nos jugó "
            "una mala pasada hoy. No pasa nada.\n\n"
            "Te dejo 2 opciones:\n"
            "1. Reagendar para esta semana: responde a este email\n"
            "2. Demo grabada de 10 min: la puedes ver cuando quieras\n\n"
            "¿Cuál prefieres?\n\n"
            "Un abrazo,\nMariana — GestPro"
        )

        if action == "no_show_reengagement":
            asunto = "Demo grabada de GestPro — 10 min que pueden cambiar tu negocio"
            cuerpo = (
                "Hola,\n\n"
                "Te escribo porque noté que no tuvimos chance de conectar. "
                "Sin problema — sé que estás ocupado.\n\n"
                "No te voy a seguir molestando. Solo quería dejarte esto: "
                "tenemos una demo grabada de 10 min donde muestro exactamente "
                "cómo negocios similares recuperan hasta 30% de citas perdidas.\n\n"
                "Si en algún momento te interesa, aquí está el link.\n\n"
                "Si no es el momento, también está perfecto. Te deseo mucho éxito.\n\n"
                "Un abrazo,\nMariana — GestPro"
            )

        payload = {
            "event": "email_no_show",
            "to": email,
            "subject": asunto,
            "body": cuerpo,
        }

        await httpx.AsyncClient(timeout=10).post(
            f"{settings.backend_webhook_url}/api/webhooks/email-reminder",
            json=payload,
            headers={"Content-Type": "application/json"},
        )
        logger.info("Email no-show enviado: %s -> %s", action, email)
        return True
    except Exception as exc:
        logger.warning("Fallo email no-show: %s", exc)
        return False


async def _trigger_recovery_call(telefono: str, metadata: dict) -> bool:
    """Dispara una llamada de recovery post no-show."""
    if not telefono:
        return False

    logger.info("Triggering recovery call to %s", telefono)

    try:
        from app.telephony.twilio_client import start_outbound_call

        result = start_outbound_call(
            to_number=telefono,
            business_type=metadata.get("business_type", "generico"),
            business_name=metadata.get("business_name", ""),
            software_id=metadata.get("software_id", ""),
            lead_id=metadata.get("lead_id", ""),
        )
        return result.get("status") in ("iniciada", "offline")
    except Exception as exc:
        logger.warning("Fallo recovery call: %s", exc)
        return False
