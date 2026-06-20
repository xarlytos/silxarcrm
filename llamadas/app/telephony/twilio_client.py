"""Cliente Twilio: iniciar llamadas salientes, TwiML, AMD y WhatsApp."""
from __future__ import annotations

import logging
from urllib.parse import urlencode
from xml.sax.saxutils import quoteattr

from app.config import settings

logger = logging.getLogger(__name__)

_client = None


def _get_client():
    global _client
    if _client is not None:
        return _client
    if not settings.twilio_account_sid or not settings.twilio_auth_token:
        return None
    from twilio.rest import Client

    _client = Client(settings.twilio_account_sid, settings.twilio_auth_token)
    return _client


def build_stream_twiml(params: dict[str, str] | None = None) -> str:
    """TwiML que conecta la llamada al WebSocket de Media Streams.

    <Connect><Stream> abre un canal bidireccional de audio mu-law 8 kHz. Los
    <Parameter> viajan en el evento `start.customParameters` del WebSocket, así
    la sesión sabe a quién llama (teléfono, nicho, ciudad).
    """
    param_tags = "".join(
        f'\n      <Parameter name={quoteattr(k)} value={quoteattr(str(v))} />'
        for k, v in (params or {}).items()
        if v
    )
    return f"""<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Connect>
    <Stream url="{settings.media_ws_url}">{param_tags}
    </Stream>
  </Connect>
</Response>"""


def _select_caller_id(to_number: str) -> str:
    """Selecciona el número de salida según la estrategia configurada.

    Si caller_id_strategy == 'dynamic' y hay números MX configurados,
    selecciona el número por LADA del lead.
    """
    import json

    if settings.caller_id_strategy != "dynamic" or not settings.twilio_mx_numbers:
        return settings.twilio_from_number

    try:
        mx_numbers = json.loads(settings.twilio_mx_numbers)
    except json.JSONDecodeError:
        return settings.twilio_from_number

    # Extraer LADA del número mexicano (+52 XX...)
    if to_number.startswith("+52") and len(to_number) >= 5:
        # Intentar LADA de 2 dígitos (CDMX, GDL, MTY)
        lada2 = to_number[3:5]
        if lada2 in mx_numbers:
            return mx_numbers[lada2]
        # Intentar LADA de 3 dígitos
        lada3 = to_number[3:6]
        if lada3 in mx_numbers:
            return mx_numbers[lada3]

    return settings.twilio_from_number


def start_outbound_call(
    to_number: str,
    business_type: str = "generico",
    business_name: str = "",
    city: str = "",
    software_id: str = "",
    lead_id: str = "",
    spech_id: str = "",
    agente_id: int = 0,
) -> dict:
    """Inicia una llamada saliente con detección de contestador (AMD).

    El contexto del prospecto viaja como query params al webhook /voice, que los
    reinyecta como <Parameter> del <Stream>.
    """
    client = _get_client()
    if client is None:
        logger.warning("[offline] Twilio sin credenciales; no se llamó a %s", to_number)
        return {"status": "offline", "to": to_number}

    # Seleccionar número de salida (estático o dinámico por LADA)
    from_number = _select_caller_id(to_number)
    if not from_number:
        logger.error("No hay número de salida configurado")
        return {"status": "error", "to": to_number, "error": "No hay número de salida"}

    query_params = {
        "phone": to_number,
        "business_type": business_type,
        "business_name": business_name,
        "city": city,
    }
    if software_id:
        query_params["software_id"] = software_id
    if lead_id:
        query_params["lead_id"] = lead_id
    if spech_id:
        query_params["spech_id"] = spech_id
    if agente_id:
        query_params["agente_id"] = str(agente_id)

    query = urlencode(query_params)
    call = client.calls.create(
        to=to_number,
        from_=from_number,
        url=f"https://{settings.public_host}/voice?{query}",
        machine_detection="DetectMessageEnd",  # AMD: distingue humano/buzón
        async_amd="true",
        record=True,
    )
    return {"status": "iniciada", "sid": call.sid, "to": to_number, "from": from_number}


def transfer_call(call_sid: str, to_number: str) -> dict:
    """Redirige una llamada en curso a un humano."""
    client = _get_client()
    if client is None:
        return {"status": "offline"}
    twiml = f'<?xml version="1.0" encoding="UTF-8"?><Response><Dial>{to_number}</Dial></Response>'
    client.calls(call_sid).update(twiml=twiml)
    return {"status": "transferida", "to": to_number}


async def send_whatsapp(
    to_number: str,
    tipo: str,
    config=None,
    custom_body: str = "",
) -> dict:
    """Envía un WhatsApp de seguimiento usando plantillas por tipo.

    Args:
        to_number: Número destino
        tipo: Tipo de mensaje (info, confirmacion_demo, despedida, etc.)
        config: AgentConfig opcional para usar templates del software
        custom_body: Mensaje personalizado (si se proporciona, anula templates)
    """
    # Templates genéricos (fallback)
    plantillas = {
        "info": "¡Hola! Aquí la info que le comenté.",
        "link_prueba": "Aquí su prueba gratis de 15 días, sin tarjeta.",
        "confirmacion_demo": "¡Listo! Tu demo quedó agendada. Te envío recordatorio antes de la reunión. ¡Nos vemos!",
        "despedida": "Gracias por tu tiempo. Si cambias de opinión, aquí estoy.",
        "info_seguimiento": "¡Hola! Como acordamos, te envío más información. Cualquier duda, aquí estoy. 😊",
        "puerta_abierta": "Hola. Entiendo que ahorita no es el momento. Sin problema — te deseo mucho éxito. Te dejo mi WhatsApp por si algún día te interesa. 👋",
        "recordatorio_24h": "¡Hola! Te recordamos que mañana tienes tu demo. ¿Confirmas que vas a poder asistir? 👍",
        "recordatorio_1h": "¡Hola! En 1 hora comienza tu demo. ¿Todo listo? Te espero ahí 🙂",
        "no_show_recovery": "Hola! Parece que la conexión nos jugó una mala pasada hoy. No pasa nada. ¿Reagendamos para esta semana o prefieres una demo grabada?",
        "break_up": "Hola. Hace unos días hablamos. No te voy a seguir molestando. Solo quería dejarte esto: tenemos una demo grabada de 10 min donde muestro exactamente cómo negocios similares recuperan hasta 30% de citas perdidas. Si en algún momento te interesa, aquí está el link.",
    }

    if custom_body:
        body = custom_body
    elif config and config.whatsapp_templates:
        # Usar templates del software
        body = config.get_whatsapp_template(tipo, plantillas.get(tipo, plantillas["info"]))
    else:
        body = plantillas.get(tipo, plantillas["info"])

    # CNAM/branding desde config si está disponible
    from_number = settings.twilio_from_number
    if config and config.twilio_from_number:
        from_number = config.twilio_from_number
    elif config and config.twilio_cnam_name:
        # Si no hay número específico, usar el general
        pass

    client = _get_client()
    if client is None:
        logger.info("[offline] WhatsApp %s -> %s: %s", tipo, to_number, body)
        return {"status": "offline", "tipo": tipo}
    try:
        client.messages.create(
            from_=f"whatsapp:{from_number}",
            to=f"whatsapp:{to_number}",
            body=body,
        )
        return {"status": "enviado", "tipo": tipo}
    except Exception as exc:  # noqa: BLE001
        logger.warning("Fallo WhatsApp (%s)", exc)
        return {"status": "error", "error": str(exc)}
