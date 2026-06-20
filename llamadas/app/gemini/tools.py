"""Function calling del agente: declaraciones y ejecución de las 8 herramientas.

Las declaraciones son dicts JSON-schema puros (sin depender del SDK de Gemini),
de modo que se pueden testear y reutilizar. `live_session` las convierte a los
tipos de `google.genai`. La ejecución (`execute_tool`) despacha a los módulos de
CRM, RAG, agendado, WhatsApp y transferencia, recibiendo el contexto de la
llamada para conocer el teléfono/estado actuales.
"""
from __future__ import annotations

import logging
from typing import TYPE_CHECKING, Any

if TYPE_CHECKING:
    from app.conversation.state import CallContext

logger = logging.getLogger(__name__)


def _get_config(ctx: "CallContext"):
    """Obtiene la config del software desde el contexto, o una genérica."""
    if ctx.agent_config is not None:
        return ctx.agent_config
    from app.modules.base import get_config
    return get_config()


# --- Declaraciones (JSON schema estilo OpenAPI que entiende Gemini) ---
TOOL_DECLARATIONS: list[dict[str, Any]] = [
    {
        "name": "consultar_crm",
        "description": "Obtiene el historial e información del prospecto a partir de su teléfono.",
        "parameters": {
            "type": "object",
            "properties": {"telefono": {"type": "string"}},
            "required": ["telefono"],
        },
    },
    {
        "name": "buscar_caso_de_exito",
        "description": "Busca un caso de éxito real y relevante para el tipo de negocio del prospecto.",
        "parameters": {
            "type": "object",
            "properties": {
                "tipo_negocio": {
                    "type": "string",
                    "description": "veterinaria, peluqueria_canina, dentista, gimnasio, entrenador, yoga, terapeuta",
                },
                "ciudad": {"type": "string"},
            },
            "required": ["tipo_negocio"],
        },
    },
    {
        "name": "calcular_roi",
        "description": "Calcula el retorno de inversión estimado para convencer al prospecto con números.",
        "parameters": {
            "type": "object",
            "properties": {
                "citas_por_semana": {"type": "number"},
                "precio_promedio_cita": {"type": "number"},
                "cancelaciones_por_semana": {"type": "number"},
            },
            "required": ["citas_por_semana", "precio_promedio_cita", "cancelaciones_por_semana"],
        },
    },
    {
        "name": "comparar_con_competidor",
        "description": "Compara nuestro software con la herramienta que ya usa el prospecto.",
        "parameters": {
            "type": "object",
            "properties": {
                "herramienta_actual": {"type": "string"},
                "tipo_negocio": {"type": "string"},
            },
            "required": ["herramienta_actual"],
        },
    },
    {
        "name": "agendar_demo",
        "description": "Agenda una demostración cuando el prospecto acepta. Devuelve confirmación.",
        "parameters": {
            "type": "object",
            "properties": {
                "telefono": {"type": "string"},
                "fecha": {"type": "string", "description": "ISO 8601, p.ej. 2026-06-02T15:00:00"},
                "nombre": {"type": "string"},
            },
            "required": ["telefono", "fecha"],
        },
    },
    {
        "name": "enviar_whatsapp",
        "description": "Envía un WhatsApp de seguimiento (info, link de prueba, confirmación de demo, enlace de auditoría web).",
        "parameters": {
            "type": "object",
            "properties": {
                "telefono": {"type": "string"},
                "tipo": {
                    "type": "string",
                    "description": "info, link_prueba, confirmacion_demo, despedida, auditoria_web",
                },
            },
            "required": ["telefono", "tipo"],
        },
    },
    {
        "name": "transferir_humano",
        "description": "Transfiere la llamada a un vendedor humano (hot lead o el prospecto lo pide).",
        "parameters": {
            "type": "object",
            "properties": {
                "razon": {"type": "string"},
                "nivel_interes": {"type": "integer"},
            },
            "required": ["razon"],
        },
    },
    {
        "name": "pre_call_brief",
        "description": "Genera un brief inteligente del lead antes de llamar. Usa datos del CRM + historial + dolor probable.",
        "parameters": {
            "type": "object",
            "properties": {
                "telefono": {"type": "string", "description": "Teléfono del lead (opcional, usa el de la llamada si no se provee)"},
            },
            "required": [],
        },
    },
    {
        "name": "generar_auditoria_web",
        "description": "Genera una auditoría web interactiva personalizada para la clínica del prospecto. La página incluye estadísticas de su provincia, comparativa con clínicas similares, calculadora de pérdidas, y un CTA para agendar demo. Devuelve una URL única.",
        "parameters": {
            "type": "object",
            "properties": {
                "nombre_clinica": {"type": "string", "description": "Nombre de la clínica dental"},
                "ciudad": {"type": "string", "description": "Ciudad/provincia de la clínica"},
                "telefono": {"type": "string", "description": "Teléfono del lead (para personalizar la URL)"},
                "citas_semana": {"type": "number", "description": "Citas por semana que mencionó el prospecto"},
                "valor_cita": {"type": "number", "description": "Valor promedio de la cita en euros"},
                "no_show_pct": {"type": "number", "description": "Porcentaje estimado de no-shows (ej: 25 para 25%)"},
            },
            "required": ["nombre_clinica", "ciudad", "telefono"],
        },
    },
    {
        "name": "social_proof_match",
        "description": "Encuentra el caso de éxito más relevante para el prospecto actual. Match por nicho, ciudad cercana y tamaño similar.",
        "parameters": {
            "type": "object",
            "properties": {
                "nicho": {"type": "string"},
                "ciudad": {"type": "string"},
                "tamano_estimado": {"type": "string", "description": "pequeno, mediano, grande"},
                "dolor": {"type": "string", "description": "Dolor principal identificado en la llamada"},
            },
            "required": ["nicho"],
        },
    },
    {
        "name": "trial_close",
        "description": "Verifica el nivel de interés del prospecto antes de intentar agendar la demo. Devuelve la pregunta exacta a hacer.",
        "parameters": {
            "type": "object",
            "properties": {
                "etapa": {
                    "type": "string",
                    "description": "Etapa actual de la conversación: discovery, quantification, pre_cierre",
                },
                "dolor_identificado": {"type": "string"},
                "costo_mensual_estimado": {"type": "number"},
            },
            "required": ["etapa"],
        },
    },
    {
        "name": "quantificar_dolor",
        "description": "Calcula el costo económico del problema basado en inputs del prospecto (cantidad de citas/sesiones perdidas por semana y valor unitario). Devuelve costo semanal, mensual y anual con mensaje natural para la conversación.",
        "parameters": {
            "type": "object",
            "properties": {
                "nicho": {"type": "string", "description": "veterinaria, peluqueria_canina, dentista, gimnasio, entrenador, yoga, terapeuta, salud, servicios, generico"},
                "cantidad_por_semana": {"type": "number", "description": "Número de citas/sesiones/clientes perdidos por semana"},
                "valor_unitario": {"type": "number", "description": "Valor promedio de cada cita/sesión en moneda local"},
            },
            "required": ["nicho"],
        },
    },
    {
        "name": "recordatorio_demo",
        "description": "Programa la secuencia Triple Lock de recordatorios para una demo agendada: 3 días antes (email), 1 día antes (WhatsApp+SMS), 1 hora antes (WhatsApp).",
        "parameters": {
            "type": "object",
            "properties": {
                "telefono": {"type": "string"},
                "fecha_demo": {"type": "string", "description": "Fecha y hora de la demo en ISO 8601"},
                "nombre_lead": {"type": "string"},
                "email": {"type": "string"},
                "link_meeting": {"type": "string"},
            },
            "required": ["telefono", "fecha_demo", "nombre_lead"],
        },
    },
]

TOOL_NAMES = {t["name"] for t in TOOL_DECLARATIONS}


async def execute_tool(name: str, args: dict[str, Any], ctx: "CallContext") -> dict[str, Any]:
    """Ejecuta una herramienta por nombre y devuelve un dict (la respuesta que se
    le entrega de vuelta a Gemini como functionResponse)."""
    # Imports diferidos para evitar dependencias circulares y permitir testear
    # las declaraciones sin levantar CRM/RAG.
    from app.crm.supabase_repo import get_prospect, log_demo
    from app.knowledge.rag import find_success_case, compare_competitor
    from app.compliance.mx import register_optout  # noqa: F401 (uso futuro)

    telefono = args.get("telefono") or ctx.phone

    try:
        if name == "consultar_crm":
            return await get_prospect(telefono)

        if name == "buscar_caso_de_exito":
            return await find_success_case(args["tipo_negocio"], args.get("ciudad"))

        if name == "calcular_roi":
            return _calcular_roi(args)

        if name == "comparar_con_competidor":
            return await compare_competitor(
                args["herramienta_actual"], args.get("tipo_negocio", ctx.business_type)
            )

        if name == "agendar_demo":
            from app.crm.calcom import book_demo

            try:
                # Intento 1: Cal.com
                result = await book_demo(telefono, args["fecha"], args.get("nombre"))
                await log_demo(telefono, args["fecha"])
                ctx.outcome = "demo_agendada"
                return result
            except Exception as exc:
                # FALLBACK: Si Cal.com falla, guardar pendiente y confirmar por WhatsApp
                logger.warning("Cal.com falló, activando fallback: %s", exc)
                try:
                    # Guardar como "demo pendiente de confirmación por WhatsApp"
                    await log_demo(telefono, args["fecha"], status="pendiente")

                    # Enviar WhatsApp con mensaje alternativo
                    from app.telephony.twilio_client import send_whatsapp
                    await send_whatsapp(
                        telefono,
                        "confirmacion_demo_fallback"
                    )

                    ctx.outcome = "demo_agendada"
                    return {
                        "status": "pending",
                        "mensaje": (
                            f"Te enviaremos la confirmación de la demo por WhatsApp. "
                            f"La demo está abierta para {args.get('fecha', 'las próximas horas')}."
                        ),
                        "fallback": "Cal.com no disponible, confirmar por WhatsApp",
                    }
                except Exception as fallback_exc:
                    logger.exception("Fallback también falló: %s", fallback_exc)
                    # Último recurso: guardar en BD sin confirmar
                    return {
                        "status": "error",
                        "error": "No se pudo agendar ahora, pero guardaremos tu interés",
                        "instruccion": "Ofrecer WhatsApp de seguimiento",
                    }

        if name == "enviar_whatsapp":
            from app.telephony.twilio_client import send_whatsapp

            return await send_whatsapp(telefono, args["tipo"])

        if name == "transferir_humano":
            ctx.transfer_requested = True
            ctx.transfer_reason = args["razon"]
            ctx.outcome = "transferido"
            return {"status": "transfiriendo", "razon": args["razon"]}

        if name == "pre_call_brief":
            return await _pre_call_brief(telefono, ctx)

        if name == "quantificar_dolor":
            return _quantificar_dolor(args, ctx)

        if name == "generar_auditoria_web":
            return await _generar_auditoria_web(args, ctx)

        if name == "social_proof_match":
            return await _social_proof_match(args, ctx)

        if name == "trial_close":
            return _trial_close(args, ctx)

        if name == "recordatorio_demo":
            return await _recordatorio_demo(args, ctx)

    except Exception as exc:  # noqa: BLE001 — devolvemos el error como dato a Gemini
        logger.exception("Fallo ejecutando tool %s", name)
        return {"error": f"No se pudo ejecutar {name}: {exc}"}

    return {"error": f"Herramienta desconocida: {name}"}


def _calcular_roi(args: dict[str, Any]) -> dict[str, Any]:
    citas = float(args["citas_por_semana"])
    precio = float(args["precio_promedio_cita"])
    cancel = float(args["cancelaciones_por_semana"])
    # Supuesto: recuperamos ~70% de cancelaciones evitables con recordatorios.
    recuperadas = cancel * 0.7
    ingreso_mensual_recuperado = round(recuperadas * precio * 4.3, 2)
    return {
        "cancelaciones_recuperadas_semana": round(recuperadas, 1),
        "ingreso_mensual_recuperado": ingreso_mensual_recuperado,
        "mensaje": (
            f"Recuperando ~{recuperadas:.0f} citas/semana a ${precio:.0f}, "
            f"son ~${ingreso_mensual_recuperado:.0f} al mes que hoy se pierden."
        ),
    }


# ============================================================
# TOOL 1: pre_call_brief — Brief inteligente del lead
# ============================================================

async def _pre_call_brief(telefono: str, ctx: "CallContext") -> dict[str, Any]:
    """Genera un brief completo del lead antes de llamar."""
    from app.crm import postgres_repo

    lead = None
    historial = []

    if ctx.software_id:
        try:
            lead = await postgres_repo.get_lead(telefono, ctx.software_id)
            # Intentar cargar historial de interacciones
            historial = await postgres_repo.get_lead_historial(
                lead.get("id", ""), limit=5
            ) if lead else []
        except Exception as exc:
            logger.warning("No se pudo cargar lead para brief: %s", exc)

    if not lead:
        return {
            "brief": "Lead no encontrado en CRM. Usar conversación estándar.",
            "dolor_probable": "citas perdidas y recordatorios manuales",
            "spech_recomendado": "PRO-V.O.I.S.E. Standard",
        }

    config = _get_config(ctx)
    nicho = ctx.business_type or "generico"
    nombre = lead.get("nombre") or ""
    empresa = lead.get("empresa") or lead.get("business_name") or "su negocio"
    ciudad = lead.get("pais") or lead.get("ciudad") or ""

    # Dolor probable: primero de config, luego fallback por nicho
    pain_points = config.pain_points or {}
    dolor_probable = pain_points.get("dolor_principal")
    if not dolor_probable:
        dolores = {
            "veterinaria": "no-shows de 25-30% en citas, recordatorios manuales",
            "peluqueria_canina": "cancelaciones de último momento sin rellenar huecos",
            "dentista": "pacientes que no regresan a controles, agenda desordenada",
            "gimnasio": "abandono de membresías, falta de seguimiento",
            "entrenador": "clientes que faltan a sesiones y no hay compromiso",
            "yoga": "tiempo perdido coordinando horarios por WhatsApp",
            "terapeuta": "agenda desordenada entre sesiones individuales y talleres",
            "generico": "citas perdidas y recordatorios manuales",
            "salud": "pacientes que no regresan, no-shows en citas",
            "servicios": "clientes que se van a la competencia, falta de seguimiento",
        }
        dolor_probable = dolores.get(nicho, dolores["generico"])

    # Historial formateado
    historial_txt = ""
    if historial:
        historial_txt = "\n".join(
            f"- {h.get('tipo', 'contacto')}: {h.get('descripcion', '')}"
            for h in historial[:3]
        )

    vertical = config.target_vertical or nicho.replace('_', ' ')
    contexto_spech = (
        f"{vertical.title()} en {ciudad}. "
        f"Problema probable: {dolor_probable}."
    )

    free_value = config.free_value_offer or (
        f"una auditoría web interactiva con estadísticas de {ciudad or 'su provincia'}"
    )

    return {
        "nombre": nombre,
        "empresa": empresa,
        "ciudad": ciudad,
        "nicho": nicho,
        "dolor_probable": dolor_probable,
        "historial": historial_txt or "Sin historial previo",
        "contexto_spech": contexto_spech,
        "spech_recomendado": "PRO-V.O.I.S.E. Standard",
        "brief": (
            f"Vas a llamar a {nombre} de {empresa} ({ciudad}). "
            f"Es una {vertical}. "
            f"Dolor probable: {dolor_probable}. "
            f"Usa el framework PRO-V.O.I.S.E. "
            f"El 'free value' es {free_value}. "
            f"NO enviar PDF. Enviar enlace por WhatsApp."
        ),
    }


# ============================================================
# TOOL 2: quantificar_dolor — Calculadora de costo del problema
# ============================================================

def _quantificar_dolor(args: dict[str, Any], ctx: "CallContext") -> dict[str, Any]:
    """Calcula el costo económico del problema basado en inputs del prospecto."""
    config = _get_config(ctx)
    nicho = args.get("nicho", "servicios")
    cantidad = float(args.get("cantidad_por_semana", 0))
    valor_unitario = float(args.get("valor_unitario", 0))

    # Defaults por nicho si el prospecto no da valores (en moneda local)
    moneda = config.currency_symbol
    defaults = {
        "veterinaria": {"valor_default": 500, "mensaje": "citas que se pierden"},
        "peluqueria_canina": {"valor_default": 350, "mensaje": "citas canceladas"},
        "dentista": {"valor_default": 800, "mensaje": "citas no-show"},
        "gimnasio": {"valor_default": 600, "mensaje": "abandonos de membresía"},
        "entrenador": {"valor_default": 400, "mensaje": "sesiones perdidas"},
        "yoga": {"valor_default": 350, "mensaje": "clases canceladas"},
        "terapeuta": {"valor_default": 500, "mensaje": "sesiones no-show"},
        "salud": {"valor_default": 600, "mensaje": "pacientes que no regresan"},
        "servicios": {"valor_default": 1000, "mensaje": "clientes perdidos"},
        "generico": {"valor_default": 500, "mensaje": "citas perdidas"},
    }

    default = defaults.get(nicho, defaults["generico"])
    if valor_unitario <= 0:
        valor_unitario = default["valor_default"]

    costo_semanal = cantidad * valor_unitario
    costo_mensual = costo_semanal * 4.3
    costo_anual = costo_mensual * 12

    mensaje = (
        f"Si son {cantidad:.0f} {default['mensaje']} por semana, "
        f"a {valor_unitario:,.0f} {moneda} cada una... eso son "
        f"{costo_mensual:,.0f} {moneda} al mes. "
        f"¿Hice bien la cuenta?"
    )

    framing_roi = (
        f"Con {config.company_name}, por cada 100 {moneda} invertidos, "
        f"nuestros clientes de {nicho.replace('_', ' ')} recuperan entre "
        f"300 y 500 {moneda} en {default['mensaje']}. "
        f"¿Tendría sentido recuperar esos {costo_mensual:,.0f} {moneda}?"
    )

    return {
        "costo_semanal": round(costo_semanal, 2),
        "costo_mensual": round(costo_mensual, 2),
        "costo_anual": round(costo_anual, 2),
        "cantidad": cantidad,
        "valor_unitario": valor_unitario,
        "mensaje": mensaje,
        "framing_roi": framing_roi,
    }


# ============================================================
# TOOL 3: social_proof_match — Matching de caso de éxito
# ============================================================

async def _social_proof_match(args: dict[str, Any], ctx: "CallContext") -> dict[str, Any]:
    """Encuentra el caso de éxito más relevante para el prospecto."""
    from app.knowledge.rag import find_success_case

    config = _get_config(ctx)
    nicho = args.get("nicho", "generico")
    ciudad = args.get("ciudad", "")
    dolor = args.get("dolor", "")

    # Primero buscar en los casos de éxito de la config
    config_cases = config.success_cases or []
    if isinstance(config_cases, list) and config_cases:
        # Filtrar por nicho/ciudad si hay match
        for caso in config_cases:
            caso_nicho = caso.get("tipo", "")
            if nicho in caso_nicho or caso_nicho in nicho:
                empresa = caso.get("empresa", "un cliente similar")
                ciudad_caso = caso.get("ciudad", config.market_city_examples.split(",")[0].strip())
                resultado = caso.get("resultado", "mejoró su gestión")
                metrica = caso.get("metrica_destacada", "resultados significativos")
                testimonial = caso.get("testimonial", "")
                tiempo = caso.get("tiempo_a_resultado", "poco tiempo")
                pais = "México" if config.market_country == "mx" else "España"
                mensaje_natural = (
                    f"Mira, {empresa} en {ciudad_caso} ({pais}) — que es una "
                    f"{nicho.replace('_', ' ')} de tamaño similar — logró "
                    f"{resultado} en solo {tiempo}. "
                )
                if testimonial:
                    mensaje_natural += f"Y lo que me dijo el dueño fue: '{testimonial}'"
                return {
                    "empresa": empresa, "ciudad": ciudad_caso, "resultado": resultado,
                    "metrica": metrica, "testimonial": testimonial, "tiempo": tiempo,
                    "mensaje_natural": mensaje_natural, "encontrado": True,
                }

    # Fallback: buscar en RAG
    caso = await find_success_case(nicho, ciudad)
    pais = "México" if config.market_country == "mx" else "España"

    if not caso or caso.get("status") in ("desconocido", "error", "offline"):
        return {
            "mensaje_natural": (
                f"Tenemos varios clientes de {nicho.replace('_', ' ')} en {pais} que "
                f"han visto resultados similares. Se los muestro en la demo."
            ),
            "encontrado": False,
        }

    empresa = caso.get("empresa", "un cliente similar")
    ciudad_caso = caso.get("ciudad", pais)
    resultado = caso.get("resultado", "mejoró su gestión")
    metrica = caso.get("metrica_destacada", "resultados significativos")
    testimonial = caso.get("testimonial", "")
    tiempo = caso.get("tiempo_a_resultado", "poco tiempo")

    mensaje_natural = (
        f"Mira, {empresa} en {ciudad_caso} — que es una "
        f"{nicho.replace('_', ' ')} de tamaño similar — logró "
        f"{resultado} en solo {tiempo}. "
    )
    if testimonial:
        mensaje_natural += f"Y lo que me dijo el dueño fue: '{testimonial}'"

    return {
        "empresa": empresa, "ciudad": ciudad_caso, "resultado": resultado,
        "metrica": metrica, "testimonial": testimonial, "tiempo": tiempo,
        "mensaje_natural": mensaje_natural, "encontrado": True,
    }


# ============================================================
# TOOL 4: trial_close — Verificación de interés
# ============================================================

def _trial_close(args: dict[str, Any], ctx: "CallContext") -> dict[str, Any]:
    """Ejecuta un trial close adaptativo basado en la etapa de la llamada."""
    config = _get_config(ctx)
    moneda = config.currency_symbol
    etapa = args.get("etapa", "discovery")
    dolor = args.get("dolor_identificado", "")
    costo = args.get("costo_mensual_estimado", 0)
    nombre = ctx.prospect.get("nombre") or ""
    empresa = ctx.business_name or "su negocio"

    trial_closes = {
        "discovery": {
            "mensaje": (
                f"{nombre}, si pudiéramos resolver lo de {dolor or 'las citas perdidas'}, "
                f"¿eso tendría impacto en {empresa}?"
            ),
            "si": "proceder_a_quantification",
            "no": "pivot_dolor",
            "tal_vez": "explorar_mas",
        },
        "quantification": {
            "mensaje": (
                f"{nombre}, si te mostráramos una forma de recuperar esos "
                f"{costo:,.0f} {moneda} mensuales sin complicarte la vida, "
                f"¿valdría la pena una demo rápida de 15 minutos?"
            ),
            "si": "proceder_a_agendar",
            "no": "manejar_objecion",
            "tal_vez": "social_proof",
        },
        "pre_cierre": {
            "mensaje": (
                f"{nombre}, viendo lo que lograron negocios similares al tuyo y "
                f"que tu situación es parecida, ¿te gustaría ver cómo "
                f"funciona específicamente para {empresa}?"
            ),
            "si": "proceder_a_agendar",
            "no": "objecion_final",
            "tal_vez": "urgencia_legitima",
        },
    }

    selected = trial_closes.get(etapa, trial_closes["discovery"])

    return {
        "mensaje": selected["mensaje"],
        "transiciones": {
            "si": selected["si"],
            "no": selected["no"],
            "tal_vez": selected["tal_vez"],
        },
    }


# ============================================================
# TOOL 5: recordatorio_demo — Triple Lock
# ============================================================

async def _recordatorio_demo(args: dict[str, Any], ctx: "CallContext") -> dict[str, Any]:
    """Programa la secuencia Triple Lock de recordatorios para una demo agendada."""
    from datetime import datetime, timedelta
    from app.crm import postgres_repo

    config = _get_config(ctx)
    telefono = args.get("telefono") or ctx.phone
    fecha_demo_str = args.get("fecha_demo", "")
    nombre = args.get("nombre_lead", ctx.prospect.get("nombre") or "")
    email = args.get("email", "")
    link = args.get("link_meeting", "")
    company = config.company_name
    sender = config.whatsapp_sender_name

    try:
        fecha_demo = datetime.fromisoformat(fecha_demo_str.replace("Z", "+00:00"))
    except ValueError:
        return {"error": "Formato de fecha inválido. Usar ISO 8601."}

    ahora = datetime.now(fecha_demo.tzinfo)
    recordatorios = []

    # T-3 días: Email con valor anticipado
    tres_dias = fecha_demo - timedelta(days=3)
    if tres_dias > ahora:
        recordatorios.append({
            "when": tres_dias.isoformat(),
            "canal": "email",
            "tipo": "valor_anticipado",
            "contenido": {
                "asunto": f"{nombre}, preparando tu demo de {company}",
                "cuerpo": (
                    f"Hola {nombre},\n\n"
                    f"Tu demo de {company} es el {fecha_demo.strftime('%d/%m')} a las {fecha_demo.strftime('%H:%M')}.\n\n"
                    f"Para aprovechar al máximo, te recomiendo tener a mano:\n"
                    f"- Tu agenda actual (para comparar)\n"
                    f"- Lista de 3 problemas que más te fastidian\n"
                    f"{f'- Link: {link}' if link else ''}\n\n"
                    f"Nos vemos pronto,\n{sender}"
                ),
            },
        })

    # T-1 día: WhatsApp + SMS
    un_dia = fecha_demo - timedelta(days=1)
    if un_dia > ahora:
        recordatorios.append({
            "when": un_dia.isoformat(),
            "canal": "whatsapp",
            "tipo": "recordatorio_24h",
            "contenido": {
                "mensaje": (
                    f"¡Hola {nombre}! Te recordamos que mañana "
                    f"{fecha_demo.strftime('%d/%m')} a las {fecha_demo.strftime('%H:%M')} tenemos tu demo "
                    f"de {company}. Te va a encantar ver cómo puedes organizar tu negocio.\n\n"
                    f"{f'Link: {link}' if link else ''}\n\n"
                    f"¿Confirmas que vas a poder asistir? 👍"
                ),
            },
        })

    # T-1 hora: WhatsApp
    una_hora = fecha_demo - timedelta(hours=1)
    if una_hora > ahora:
        recordatorios.append({
            "when": una_hora.isoformat(),
            "canal": "whatsapp",
            "tipo": "recordatorio_1h",
            "contenido": {
                "mensaje": (
                    f"¡Hola {nombre}! En 1 hora comienza tu demo de "
                    f"{company} ({fecha_demo.strftime('%H:%M')}).\n\n"
                    f"{f'Link de acceso: {link}' if link else ''}\n\n"
                    f"¿Todo listo? Te espero ahí 🙂"
                ),
            },
        })

    # Guardar recordatorios en la base de datos para que el scheduler los procese
    if ctx.software_id and ctx.lead_id:
        try:
            for rec in recordatorios:
                await postgres_repo.create_activation_log(
                    lead_id=ctx.lead_id,
                    action=f"recordatorio_demo_{rec['tipo']}",
                    scheduled_at=datetime.fromisoformat(rec["when"]),
                    metadata={
                        "canal": rec["canal"],
                        "contenido": rec["contenido"],
                        "telefono": telefono,
                        "email": email,
                    },
                )
        except Exception as exc:
            logger.warning("No se pudieron guardar recordatorios en DB: %s", exc)

    return {
        "recordatorios_programados": len(recordatorios),
        "proximo_recordatorio": recordatorios[0]["when"] if recordatorios else None,
        "canales": list({r["canal"] for r in recordatorios}),
        "triple_lock_activado": len(recordatorios) >= 2,
    }


# ============================================================
# TOOL 6: generar_auditoria_web — Auditoría interactiva por provincia
# ============================================================

async def _generar_auditoria_web(args: dict[str, Any], ctx: "CallContext") -> dict[str, Any]:
    """Genera una URL única de auditoría web personalizada para el prospecto."""
    import hashlib
    import time

    config = _get_config(ctx)
    moneda = config.currency_symbol

    nombre_negocio = args.get("nombre_clinica", args.get("nombre_negocio", "Su Negocio"))
    ciudad = args.get("ciudad", "")
    telefono = args.get("telefono") or ctx.phone
    citas_semana = float(args.get("citas_semana", 0))
    valor_cita = float(args.get("valor_cita", 0))
    no_show_pct = float(args.get("no_show_pct", 25))

    # Datos de referencia por provincia/ciudad (adaptables por config)
    stats_default = {"no_show_media": 25, "negocios_muestra": 50, "perdida_media_anual": 49000}
    stats_provincia = {
        "madrid": {"no_show_media": 22, "negocios_muestra": 127, "perdida_media_anual": 45200},
        "barcelona": {"no_show_media": 24, "negocios_muestra": 98, "perdida_media_anual": 48100},
        "valencia": {"no_show_media": 26, "negocios_muestra": 64, "perdida_media_anual": 51800},
        "sevilla": {"no_show_media": 28, "negocios_muestra": 45, "perdida_media_anual": 54600},
        "malaga": {"no_show_media": 25, "negocios_muestra": 38, "perdida_media_anual": 49300},
        "alicante": {"no_show_media": 27, "negocios_muestra": 31, "perdida_media_anual": 51200},
        "murcia": {"no_show_media": 29, "negocios_muestra": 22, "perdida_media_anual": 55800},
        "zaragoza": {"no_show_media": 23, "negocios_muestra": 19, "perdida_media_anual": 46700},
        "cdmx": {"no_show_media": 28, "negocios_muestra": 200, "perdida_media_anual": 65000},
        "guadalajara": {"no_show_media": 26, "negocios_muestra": 85, "perdida_media_anual": 52000},
        "monterrey": {"no_show_media": 24, "negocios_muestra": 95, "perdida_media_anual": 58000},
        "default": stats_default,
    }

    ciudad_key = ciudad.lower().replace("á", "a").replace("é", "e").replace("í", "i").replace("ó", "o").replace("ú", "u") if ciudad else "default"
    stats = stats_provincia.get(ciudad_key, stats_provincia["default"])

    # Cálculos personalizados
    citas_mes = citas_semana * 4.3 if citas_semana > 0 else stats["negocios_muestra"] * 4.3
    # Default valor cita: 75€ para España, 500$ para México
    default_valor = 500 if config.market_country == "mx" else 75
    valor_cita_calculado = valor_cita if valor_cita > 0 else default_valor
    no_show_real = no_show_pct if no_show_pct > 0 else stats["no_show_media"]
    citas_perdidas_mes = round(citas_mes * (no_show_real / 100), 1)
    perdida_mensual = round(citas_perdidas_mes * valor_cita_calculado, 2)
    perdida_anual = round(perdida_mensual * 12, 2)
    recuperable_anual = round(perdida_anual * 0.65, 2)

    # Generar URL única con hash
    hash_base = f"{telefono}:{time.time()}:{nombre_negocio}"
    token = hashlib.sha256(hash_base.encode()).hexdigest()[:16]

    # URL base de la auditoría (desde config o default)
    base_url = config.auditoria_base_url or f"https://auditoria.{config.company_name.lower()}.com"
    url_auditoria = f"{base_url}/a/{token}"

    # Guardar datos de la auditoría en CRM para tracking
    if ctx.software_id and ctx.lead_id:
        try:
            from app.crm import postgres_repo
            await postgres_repo.guardar_auditoria(
                lead_id=ctx.lead_id,
                token=token,
                url=url_auditoria,
                datos={
                    "nombre_negocio": nombre_negocio,
                    "ciudad": ciudad,
                    "citas_semana": citas_semana,
                    "valor_cita": valor_cita,
                    "no_show_pct": no_show_pct,
                    "perdida_mensual_estimada": perdida_mensual,
                    "perdida_anual_estimada": perdida_anual,
                    "recuperable_anual": recuperable_anual,
                    "stats_ciudad": stats,
                },
            )
        except Exception as exc:
            logger.warning("No se pudo guardar auditoría en CRM: %s", exc)

    # Mensaje natural para que el agente diga en la llamada
    vertical = config.target_vertical
    mensaje = (
        f"{nombre_negocio} — he preparado una auditoría personalizada con datos de "
        f"{vertical} en {ciudad or 'su zona'}. Puede ver cuántas citas pierde al mes comparado "
        f"con el promedio de la zona, y una calculadora para ver cuánto podría recuperar. "
        f"Le envío el enlace por WhatsApp y lo tiene en 10 segundos."
    )

    return {
        "url": url_auditoria,
        "token": token,
        "mensaje_para_agente": mensaje,
        "perdida_mensual_estimada": perdida_mensual,
        "perdida_anual_estimada": perdida_anual,
        "recuperable_anual": recuperable_anual,
        "stats_ciudad": stats,
        "ciudad": ciudad,
    }

