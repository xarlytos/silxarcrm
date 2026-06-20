"""Nurture Engine — Post-call workflow automatizado.

Procesa cada llamada terminada para:
1. Analizar sentimiento del transcript
2. Calcular score BANT (Budget, Authority, Need, Timeline: 0-100)
3. Generar follow-ups personalizados según outcome
4. Programar recordatorios Triple Lock (si agendó demo)
5. Activar no-show recovery (si no asiste a demo)
6. Enviar webhook enriquecido al backend
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.conversation.state import CallContext

logger = logging.getLogger(__name__)


@dataclass
class PostCallResult:
    """Resultado del procesamiento post-llamada."""

    emotion: str
    engagement_score: int  # 0-100
    frustration_level: int  # 0-10
    bant_score: dict[str, int]  # budget, authority, need, timeline (0-25 cada uno)
    action_items: list[str]
    follow_up_type: str  # demo_agendada, interes, rechazo_suave, optout
    recordatorios_programados: int
    whatsapp_enviado: bool


# ============================================================
# 1. Análisis de sentimiento (heurístico, zero-llm-cost)
# ============================================================

EMOTION_KEYWORDS = {
    "interesado": ["interesado", "me interesa", "suena bien", "cuéntame", "vale la pena", "sí", "claro", "va", "dale"],
    "neutro": ["ok", "entendido", "gracias", "mhm", "aja"],
    "desinteresado": ["no me interesa", "no gracias", "ahorita no", "estoy bien", "paso"],
    "molesto": ["molesto", "estoy ocupado", "no me llames", "incomodo", "fastidiado", "basta"],
}

OBJECTION_KEYWORDS = {
    "precio": ["caro", "costoso", "no tengo presupuesto", "no puedo pagar", "muy caro"],
    "tiempo": ["no tengo tiempo", "estoy ocupado", "no puedo ahorita", "llámame después"],
    "sistema_existente": ["ya tenemos", "ya uso", "ya tengo", "usamos otro", "tenemos sistema"],
    "no_decide": ["no decido", "pregúntale a", "mi jefe", "mi esposa", "mi socio"],
}


def _analyze_sentiment(transcript: list[dict[str, str]]) -> tuple[str, int, int]:
    """Analiza sentimiento del transcript. Retorna (emotion, engagement_score, frustration).

    Engagement score: 0-100 basado en señales de interés, duración, preguntas.
    Frustration: 0-10 basado en palabras de molestia.
    """
    all_text = " ".join(t.get("text", "").lower() for t in transcript)
    if not all_text:
        return "neutro", 30, 0

    # Emoción principal
    scores = {emotion: 0 for emotion in EMOTION_KEYWORDS}
    for emotion, keywords in EMOTION_KEYWORDS.items():
        for kw in keywords:
            scores[emotion] += all_text.count(kw)

    emotion = max(scores, key=scores.get)
    if scores[emotion] == 0:
        emotion = "neutro"

    # Engagement: turnos + palabras clave de interés + preguntas
    turnos = len(transcript)
    preguntas = all_text.count("?")
    interes_signals = scores.get("interesado", 0)
    engagement = min(100, turnos * 8 + preguntas * 5 + interes_signals * 10 + 20)

    # Frustración
    frustration = 0
    frustration_words = ["molesto", "estoy harto", "basta", "no me llames", "quítame", "incomodo", "fastidiado", "enojado", "furioso"]
    for fw in frustration_words:
        if fw in all_text:
            frustration += 2
    frustration = min(10, frustration)

    return emotion, engagement, frustration


# ============================================================
# 2. Lead Score BANT (0-100)
# ============================================================

def _calculate_bant(
    transcript: list[dict[str, str]],
    ctx: "CallContext",
    emotion: str,
    engagement: int,
) -> dict[str, int]:
    """Calcula score BANT basado en la conversación.

    Budget (0-25): ¿mencionó presupuesto? ¿resistencia a precio?
    Authority (0-25): ¿es decision maker? ¿mencionó que decide?
    Need (0-25): ¿dolor identificado y quantificado?
    Timeline (0-25): ¿urgencia mencionada? ¿quiere resolver pronto?
    """
    all_text = " ".join(t.get("text", "").lower() for t in transcript)

    budget = 0
    if "presupuesto" in all_text or "precio" in all_text or "cuánto cuesta" in all_text:
        budget = 15  # Mencionó precio = tiene presupuesto en mente
    if any(x in all_text for x in ["caro", "costoso", "no puedo pagar"]):
        budget = 8  # Resistencia = menor score
    if ctx.outcome == "demo_agendada":
        budget = 20  # Agendó = probablemente tiene presupuesto

    authority = 0
    if any(x in all_text for x in ["yo decido", "yo me encargo", "yo soy el dueño", "yo administro"]):
        authority = 20
    if any(x in all_text for x in ["no decido", "pregúntale a", "mi jefe", "mi esposo", "mi esposa", "mi socio"]):
        authority = 8
    if ctx.outcome == "demo_agendada":
        authority = max(authority, 18)

    need = 0
    if ctx.outcome == "demo_agendada":
        need = 22
    elif emotion == "interesado":
        need = 18
    elif engagement > 50:
        need = 15
    if any(x in all_text for x in ["perdemos", "pierdo", "problema", "dolor", "necesito", "urgente"]):
        need = min(25, need + 5)

    timeline = 0
    if any(x in all_text for x in ["esta semana", "mañana", "pronto", "urgente", "ya", "ahorita"]):
        timeline = 20
    if any(x in all_text for x in ["después", "más adelante", "no es el momento", "en unos meses"]):
        timeline = 5
    if ctx.outcome == "demo_agendada":
        timeline = 22

    return {
        "budget": min(25, budget),
        "authority": min(25, authority),
        "need": min(25, need),
        "timeline": min(25, timeline),
    }


# ============================================================
# 3. Extraer action items
# ============================================================

def _extract_action_items(
    transcript: list[dict[str, str]],
    ctx: "CallContext",
) -> list[str]:
    """Extrae action items del transcript."""
    items = []
    all_text = " ".join(t.get("text", "").lower() for t in transcript)

    if ctx.outcome == "demo_agendada":
        items.append("Enviar confirmación WhatsApp con link de demo")
        items.append("Programar recordatorios Triple Lock (3d-1d-1h)")

    if "envíame" in all_text or "mándame" in all_text or "me envías" in all_text:
        items.append("Enviar info solicitada por WhatsApp/email")

    if any(x in all_text for x in ["llámame después", "llámame mañana", "llámame la próxima semana"]):
        items.append("Programar callback según horario solicitado")

    if any(x in all_text for x in ["no decido", "pregúntale a", "mi jefe", "mi socio"]):
        items.append("Identificar y contactar al decision maker")

    if "rechazado" in (ctx.outcome or "").lower() or "optout" in (ctx.outcome or "").lower():
        items.append("Marcar lead como RECHAZADO, no contactar por 60 días")

    if not items:
        items.append("Actualizar lead con notas de llamada")

    return items


# ============================================================
# 4. Determinar tipo de follow-up
# ============================================================

def _determine_follow_up(ctx: "CallContext", emotion: str) -> str:
    """Determina el tipo de follow-up según outcome y emoción."""
    outcome = ctx.outcome or "completada"

    if outcome == "demo_agendada":
        return "demo_agendada"
    if outcome == "optout" or outcome == "rechazado":
        return "optout"
    if outcome == "transferido":
        return "transferido"
    if emotion == "interesado":
        return "interes"
    if emotion == "desinteresado":
        return "rechazo_suave"
    return "neutro"


# ============================================================
# 5. Enviar WhatsApp follow-up
# ============================================================

async def _send_follow_up_whatsapp(
    ctx: "CallContext",
    follow_up_type: str,
    bant: dict[str, int],
) -> bool:
    """Envía WhatsApp de follow-up según el tipo."""
    from app.telephony.twilio_client import send_whatsapp

    if not ctx.phone:
        return False

    nombre = ctx.prospect.get("nombre") if ctx.prospect else ""
    empresa = ctx.business_name or "su negocio"
    config = ctx.agent_config

    # Seleccionar tipo de mensaje
    if follow_up_type == "demo_agendada":
        tipo = "confirmacion_demo"
    elif follow_up_type == "interes":
        tipo = "info_seguimiento"
    elif follow_up_type == "rechazo_suave":
        tipo = "puerta_abierta"
    elif follow_up_type == "optout":
        tipo = "despedida"
    else:
        tipo = "info"

    # Para mensajes personalizados, construir desde config
    if tipo in ["info_seguimiento", "puerta_abierta"]:
        body = _build_whatsapp_custom_message(tipo, nombre, empresa, config)
        result = await send_whatsapp(ctx.phone, tipo, config=config, custom_body=body)
    else:
        result = await send_whatsapp(ctx.phone, tipo, config=config)

    return result.get("status") == "enviado"


def _build_whatsapp_custom_message(
    tipo: str, nombre: str, empresa: str, config=None
) -> str:
    """Construye un mensaje WhatsApp personalizado usando la config del software."""
    company_name = config.company_name if config else "GestPro"
    sender = config.whatsapp_sender_name if config else "Mariana"

    if tipo == "info_seguimiento":
        return (
            f"¡Hola {nombre}! Soy {sender} de {company_name}. "
            f"Como acordamos, te envío más información sobre cómo {empresa} "
            f"puede dejar de perder citas y recuperar ingresos. "
            f"Cualquier duda, aquí estoy. 😊"
        )
    elif tipo == "puerta_abierta":
        return (
            f"Hola {nombre}. Entiendo que ahorita no es el momento para {empresa}. "
            f"Sin problema — te deseo mucho éxito. "
            f"Te dejo mi WhatsApp por si algún día te interesa. Aquí estoy. 👋"
        )
    return f"Hola, soy {sender} de {company_name}. Aquí estoy si necesitas algo."


# ============================================================
# 6. Programar recordatorios Triple Lock
# ============================================================

async def _schedule_triple_lock(ctx: "CallContext", fecha_demo: str) -> int:
    """Programa recordatorios Triple Lock si hay demo agendada.

    3 días antes: Email personalizado
    1 día antes: WhatsApp + SMS
    1 hora antes: WhatsApp
    """
    from datetime import datetime, timedelta
    from app.crm import postgres_repo

    if not ctx.lead_id or not fecha_demo:
        return 0

    try:
        fecha = datetime.fromisoformat(fecha_demo.replace("Z", "+00:00"))
    except ValueError:
        logger.warning("Fecha de demo inválida: %s", fecha_demo)
        return 0

    ahora = datetime.now(fecha.tzinfo)
    count = 0

    recordatorios = [
        (fecha - timedelta(days=3), "email_valor", "email"),
        (fecha - timedelta(days=1), "recordatorio_24h", "whatsapp"),
        (fecha - timedelta(hours=1), "recordatorio_1h", "whatsapp"),
    ]

    for when, action, canal in recordatorios:
        if when > ahora:
            try:
                await postgres_repo.create_activation_log(
                    lead_id=ctx.lead_id,
                    action=action,
                    scheduled_at=when,
                    metadata={
                        "canal": canal,
                        "tipo": "triple_lock_demo",
                        "fecha_demo": fecha_demo,
                    },
                )
                count += 1
            except Exception as exc:
                logger.warning("Error programando recordatorio %s: %s", action, exc)

    return count


# ============================================================
# 7. No-show recovery
# ============================================================

async def _schedule_no_show_recovery(ctx: "CallContext", fecha_demo: str) -> None:
    """Programa la secuencia de recuperación post no-show.

    Si el lead no asiste a la demo, se dispara:
    - T+10 min: Llamada de reconexión
    - T+15 min: WhatsApp
    - T+1h: Email
    - T+3d: Re-engagement
    """
    from datetime import datetime, timedelta
    from app.crm import postgres_repo

    if not ctx.lead_id or not fecha_demo:
        return

    try:
        fecha = datetime.fromisoformat(fecha_demo.replace("Z", "+00:00"))
    except ValueError:
        return

    recovery_actions = [
        (fecha + timedelta(minutes=10), "no_show_llamada", "llamada"),
        (fecha + timedelta(minutes=15), "no_show_whatsapp", "whatsapp"),
        (fecha + timedelta(hours=1), "no_show_email", "email"),
        (fecha + timedelta(days=3), "no_show_reengagement", "email_whatsapp"),
    ]

    for when, action, canal in recovery_actions:
        try:
            await postgres_repo.create_activation_log(
                lead_id=ctx.lead_id,
                action=action,
                scheduled_at=when,
                metadata={
                    "canal": canal,
                    "tipo": "no_show_recovery",
                    "fecha_demo": fecha_demo,
                    "phone": ctx.phone,
                },
            )
        except Exception as exc:
            logger.warning("Error programando no-show recovery %s: %s", action, exc)


# ============================================================
# 8. Actualizar lead en CRM
# ============================================================

async def _update_lead_post_call(
    ctx: "CallContext",
    result: PostCallResult,
) -> None:
    """Actualiza el lead en el CRM con datos enriquecidos post-llamada."""
    from app.crm import postgres_repo

    if not ctx.lead_id:
        return

    # Determinar nuevo estado
    nuevo_estado = None
    descripcion = ""

    if ctx.outcome == "demo_agendada":
        nuevo_estado = "INTERESADO"
        descripcion = f"Demo agendada via llamada AI. BANT: {result.bant_score}"
    elif ctx.outcome == "transferido":
        nuevo_estado = "CALIFICADO"
        descripcion = f"Lead transfirió a humano. BANT: {result.bant_score}"
    elif ctx.outcome == "rechazado" or ctx.outcome == "optout":
        nuevo_estado = "RECHAZADO"
        descripcion = f"Lead rechazó/optout. Emoción: {result.emotion}"
    elif result.emotion == "interesado":
        nuevo_estado = "EN_SEGUIMIENTO"
        descripcion = f"Interés mostrado en llamada AI. BANT: {result.bant_score}"
    elif result.follow_up_type == "neutro":
        nuevo_estado = "CONTACTADO"
        descripcion = "Llamada AI completada, sin interés claro"

    if nuevo_estado:
        try:
            await postgres_repo.update_lead_estado_post_llamada(
                lead_id=ctx.lead_id,
                nuevo_estado=nuevo_estado,
                descripcion=descripcion,
                agente_id=ctx.agente_id,
            )
        except Exception as exc:
            logger.warning("Error actualizando lead post-call: %s", exc)


# ============================================================
# 9. Webhook enriquecido al backend
# ============================================================

async def _notify_backend_enriched(
    ctx: "CallContext",
    result: PostCallResult,
    stream_sid: str | None,
) -> None:
    """Notifica al backend Express con datos enriquecidos post-call."""
    from app.config import settings

    if not settings.backend_webhook_url:
        return

    try:
        import httpx

        payload = {
            "event": "call_ended_enriched",
            "callSid": ctx.call_sid,
            "streamSid": stream_sid,
            "phone": ctx.phone,
            "softwareId": ctx.software_id,
            "leadId": ctx.lead_id,
            "outcome": ctx.outcome,
            "transcript": ctx.transcript,
            "durationS": int(ctx.elapsed_s()),
            "emotion": result.emotion,
            "engagementScore": result.engagement_score,
            "frustrationLevel": result.frustration_level,
            "bantScore": result.bant_score,
            "actionItems": result.action_items,
            "followUpType": result.follow_up_type,
            "recordatoriosProgramados": result.recordatorios_programados,
            "timestamp": __import__("time").strftime("%Y-%m-%dT%H:%M:%SZ", __import__("time").gmtime()),
        }

        await httpx.AsyncClient(timeout=10).post(
            f"{settings.backend_webhook_url}/api/llamadas/webhook/ai",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Agent-Secret": settings.backend_webhook_secret,
            },
        )
        logger.info("Webhook enriquecido enviado para call_sid=%s", ctx.call_sid)
    except Exception as exc:
        logger.warning("No se pudo enviar webhook enriquecido: %s", exc)


# ============================================================
# PROCESAMIENTO PRINCIPAL POST-CALL
# ============================================================

async def process_post_call(
    ctx: "CallContext",
    stream_sid: str | None = None,
    fecha_demo: str | None = None,
) -> PostCallResult:
    """Procesa una llamada terminada: análisis, scoring, follow-ups, recordatorios.

    Args:
        ctx: CallContext con toda la información de la llamada
        stream_sid: streamSid de Twilio (para referencia)
        fecha_demo: fecha ISO de la demo agendada (si aplica)

    Returns:
        PostCallResult con todos los datos del procesamiento
    """
    logger.info("Procesando post-call para call_sid=%s outcome=%s", ctx.call_sid, ctx.outcome)

    # 1. Análisis de sentimiento
    emotion, engagement, frustration = _analyze_sentiment(ctx.transcript)

    # 2. BANT score
    bant = _calculate_bant(ctx.transcript, ctx, emotion, engagement)

    # 3. Action items
    action_items = _extract_action_items(ctx.transcript, ctx)

    # 4. Tipo de follow-up
    follow_up_type = _determine_follow_up(ctx, emotion)

    # 5. Enviar WhatsApp follow-up (0-2h)
    whatsapp_enviado = await _send_follow_up_whatsapp(ctx, follow_up_type, bant)

    # 6. Programar Triple Lock si agendó demo
    recordatorios = 0
    if ctx.outcome == "demo_agendada" and fecha_demo:
        recordatorios = await _schedule_triple_lock(ctx, fecha_demo)
        # También programar no-show recovery (por si no asiste)
        await _schedule_no_show_recovery(ctx, fecha_demo)

    # 7. Actualizar lead en CRM
    result = PostCallResult(
        emotion=emotion,
        engagement_score=engagement,
        frustration_level=frustration,
        bant_score=bant,
        action_items=action_items,
        follow_up_type=follow_up_type,
        recordatorios_programados=recordatorios,
        whatsapp_enviado=whatsapp_enviado,
    )

    await _update_lead_post_call(ctx, result)

    # 8. Notificar backend con datos enriquecidos
    await _notify_backend_enriched(ctx, result, stream_sid)

    logger.info(
        "Post-call completado: emotion=%s engagement=%d bant=%s follow_up=%s recordatorios=%d",
        emotion, engagement, bant, follow_up_type, recordatorios,
    )

    return result
