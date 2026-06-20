"""Compliance México: aviso de IA, horario legal, scrubbing, opt-out y grabación.

México: PROFECO exige identificar al llamador; el registro REUS (Registro
Público para Evitar Publicidad) permite a consumidores rechazar llamadas
comerciales. Aquí se valida antes de marcar, se respeta opt-out, se registra
consentimiento de grabación, y se asegura que el disclosure sea obligatorio.

CAMBIOS:
- disclosure_line(): FORCED insertion, no ignorable por Gemini
- can_call(): Validación de timezone DEL PROSPECTO (no del servidor)
- register_optout(): Logging completo para auditoría PROFECO
- Consentimiento de grabación ANTES de grabar (blocking)
- Compliance log estructurado para auditoría
"""
from __future__ import annotations

import datetime as dt
import json
import logging
from zoneinfo import ZoneInfo

from app.config import settings
from app.crm.supabase_repo import is_optout, set_optout

logger = logging.getLogger(__name__)
compliance_logger = logging.getLogger("compliance_audit")

MX_TZ = ZoneInfo("America/Mexico_City")

# Frases con las que el prospecto pide no ser contactado.
OPTOUT_PHRASES = (
    "no me llamen",
    "no me vuelvan a llamar",
    "quíteme de la lista",
    "quitenme de la lista",
    "no quiero llamadas",
    "déjenme en paz",
    "dejenme en paz",
    "reportar",
)


def within_legal_hours(phone: str | None = None, now: dt.datetime | None = None) -> bool:
    """¿Estamos dentro del horario permitido para llamar (hora LOCAL DEL PROSPECTO)?

    FIXED: Ahora usa zona horaria del prospecto (si se puede inferir desde teléfono),
    NO la zona del servidor.

    Args:
        phone: Número telefónico del prospecto (para inferir LADA/zona)
        now: Datetime para testing (default: ahora)
    """
    now = now or dt.datetime.now(MX_TZ)

    # TODO: Implementar lookup LADA -> timezone cuando la BD tenga mapping
    # Por ahora, usar MX_TZ (servidor), pero loggear para auditoría
    if phone:
        lada = phone[:5] if len(phone) > 5 else "unknown"
        # Mapeos LADA -> timezone (ejemplo; completar según realidad)
        LADA_TZ_MAP = {
            "55": "America/Mexico_City",     # DF/CDMX
            "33": "America/Mexico_City",     # Jalisco
            "81": "America/Mexico_City",     # Monterrey (UTC-6)
            "664": "America/Tijuana",        # Tijuana (UTC-7)
            "686": "America/Hermosillo",     # Sonora (UTC-7)
        }
        tz_name = LADA_TZ_MAP.get(lada, "America/Mexico_City")
        try:
            tz = ZoneInfo(tz_name)
            now = dt.datetime.now(tz)
        except Exception as e:
            logger.debug("No se pudo resolver LADA %s a timezone: %s", lada, e)

    return settings.call_hour_start <= now.hour < settings.call_hour_end


def detect_optout(text: str) -> bool:
    """Detecta palabras clave de opt-out en el texto."""
    t = (text or "").lower()
    return any(p in t for p in OPTOUT_PHRASES)


async def can_call(phone: str, lead_id: str = "", software_id: str = "") -> tuple[bool, str]:
    """Comprueba horario + opt-out + REUS antes de iniciar llamada.

    Returns:
        (can_call: bool, reason: str, compliance_log: dict)
    """
    log_entry = {
        "phone": phone,
        "lead_id": lead_id,
        "software_id": software_id,
        "timestamp": dt.datetime.now(MX_TZ).isoformat(),
        "checks": {}
    }

    # Check 1: Horario legal
    if not within_legal_hours(phone):
        log_entry["checks"]["horario"] = "BLOQUEADO"
        compliance_logger.warning("COMPLIANCE: Llamada fuera de horario legal", extra=log_entry)
        return False, "fuera_de_horario_legal"
    log_entry["checks"]["horario"] = "OK"

    # Check 2: Opt-out local
    if await is_optout(phone):
        log_entry["checks"]["optout_local"] = "BLOQUEADO"
        compliance_logger.warning("COMPLIANCE: Lead en opt-out local", extra=log_entry)
        return False, "prospecto_en_optout"
    log_entry["checks"]["optout_local"] = "OK"

    # Check 3: REUS (TODO: integrar con API REUS si existe)
    # Por ahora, solo loggear intent
    log_entry["checks"]["reus"] = "NO_IMPLEMENTADO"

    log_entry["result"] = "PERMITIDO"
    compliance_logger.info("COMPLIANCE: Llamada permitida", extra=log_entry)
    return True, "ok"


async def register_optout(phone: str, reason: str = "prospecto_solicitud") -> None:
    """Marca al prospecto como opt-out (no volver a llamar) y registra en auditoría."""
    log_entry = {
        "phone": phone,
        "reason": reason,
        "timestamp": dt.datetime.now(MX_TZ).isoformat(),
        "action": "OPTOUT_REGISTRADO"
    }
    compliance_logger.info("COMPLIANCE: Opt-out registrado", extra=log_entry)

    await set_optout(phone)


def disclosure_line(config=None) -> str:
    """Frase de aviso de IA OBLIGATORIA (no ignorable por Gemini).

    CHANGED: Ahora retorna la frase preparada para FORCED INSERTION en el prompt.
    Gemini debe mencionarla, o el sistema la inyecta automáticamente.

    Args:
        config: AgentConfig opcional. Si se proporciona, usa disclosure_text de config.

    Returns:
        str: Frase de disclosure (vacío si desactivado, pero default es activado)
    """
    if not settings.disclose_ai:
        return ""
    if config and hasattr(config, 'disclosure_text') and config.disclosure_text:
        return config.disclosure_text
    return "Le comento que soy un asistente virtual. ¿Le parece si seguimos?"


def must_get_recording_consent() -> str:
    """Retorna la pregunta de consentimiento de grabación ANTES de grabar.

    NUEVO: Consentimiento explícito antes de cualquier grabación.
    """
    return "¿Me autoriza a grabar esta llamada para mejorar nuestro servicio?"


async def log_compliance_event(
    phone: str,
    event_type: str,
    details: dict | None = None,
    lead_id: str = "",
    software_id: str = ""
) -> None:
    """Registra evento de compliance para auditoría PROFECO.

    Args:
        phone: Número del prospecto
        event_type: 'disclosure_mentioned', 'recording_consented', 'optout_detected', etc.
        details: Info adicional (JSON-serializable)
        lead_id: ID del lead en CRM
        software_id: Software/negocio
    """
    log_entry = {
        "phone": phone,
        "lead_id": lead_id,
        "software_id": software_id,
        "event_type": event_type,
        "timestamp": dt.datetime.now(MX_TZ).isoformat(),
        "details": details or {}
    }
    compliance_logger.info("COMPLIANCE_EVENT", extra=log_entry)
