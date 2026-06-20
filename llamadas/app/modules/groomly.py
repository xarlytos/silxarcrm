"""Configuracion del agente de voz para Groomly (Espana).

Kit LEGO: Ana — asesora comercial espanola, elegante y profesional.
Mercado: Peluquerias y salones de belleza en Espana.
Moneda: EUR
Playbook: Free Value First → Demo
"""
from __future__ import annotations

from app.modules.case_study_repository import CaseStudy, CaseStudyRepository
from app.modules.config_compliance import ComplianceConfig
from app.modules.config_identity import IdentityConfig
from app.modules.config_product import ProductConfig
from app.modules.config_voice import VoiceConfig
from app.modules.sales_playbook import SalesPlaybook, PlaybookStage
from app.modules.types import AgentConfig


def get_config() -> AgentConfig:
    """Devuelve la configuracion completa de Groomly."""

    identity = IdentityConfig(
        agent_name="Ana",
        agent_gender="femenino",
        agent_accent="es-ES",
        agent_tone="elegante_profesional",
        agent_experience_years=5,
    )

    product = ProductConfig(
        company_name="Groomly",
        product_name="Groomly Pro",
        product_description="Software de gestion para peluquerias y salones de belleza en Espana",
        target_vertical="peluquerias y salones de belleza",
        target_audience="duenos de peluquerias y salones",
        currency="EUR",
        currency_symbol="EUR",
        market_country="es",
        market_city_examples="Madrid, Barcelona, Valencia, Sevilla, Bilbao",
        price_monthly=49,
    )

    playbook = SalesPlaybook(
        playbook_id="groomly_free_value_v1",
        name="Free Value First → Demo",
        description="Entregar analisis gratuito, capturar email, agendar demo",
        version="v1",
        stages=[
            PlaybookStage(
                id="pattern_interrupt",
                name="Pattern Interrupt",
                objective="Ganar atencion hablando de clientas que desaparecen",
                duration_hint="5-8 seg",
                key_points=["Tono elegante pero cercano", "Hablar de 'clientas' no 'clientes'"],
                transitions={"engaged": "discovery", "rejected": "gatekeeper_or_exit"},
            ),
            PlaybookStage(
                id="discovery",
                name="Discovery",
                objective="Descubrir dolor: clientas que no regresan, estilistas, coordinacion",
                duration_hint="30-60 seg",
                transitions={"pain_confirmed": "quantify", "gatekeeper": "gatekeeper_mode"},
            ),
            PlaybookStage(
                id="quantify",
                name="Quantify Pain",
                objective="Hacer que calcule su perdida en EUR",
                duration_hint="15-20 seg",
                transitions={"quantified": "value_offer"},
            ),
            PlaybookStage(
                id="value_offer",
                name="Value Offer",
                objective="Ofrecer auditoria web personalizada",
                duration_hint="10-20 seg",
                transitions={"email_captured": "demo_close"},
            ),
            PlaybookStage(
                id="demo_close",
                name="Demo Close",
                objective="Agendar demo de 15 minutos",
                duration_hint="15-20 seg",
                transitions={"demo_agendada": "exit"},
            ),
            PlaybookStage(
                id="exit",
                name="Exit",
                objective="Despedida elegante reafirmando valor",
                duration_hint="5-8 seg",
            ),
        ],
        scripts={
            "pattern_interrupt": [
                "{{nombre}}? Llamo porque algo que veo mucho en peluquerias de {{ciudad}} es que captan una clienta, le dan un servicio excelente... y luego esa clienta desaparece. No porque no quiera volver, sino porque nadie le recuerda que existe. Eso le pasa en {{empresa}}?",
            ],
            "discovery": [
                "Una pregunta rapida: cuantas citas le cancelan a la semana sin avisar? El promedio anda en 3-4.",
                "Y cuando alguien cancela de ultimo momento, logra rellenar ese hueco con otra clienta?",
            ],
            "demo_close": [
                "Mire, mejor se lo muestro en una demo rapidita de 15 minutos. Le late manana a las 11am o jueves a las 3pm?",
            ],
            "whatsapp": {
                "info": "Hola! Soy Elena de Groomly. Te envio la informacion que pediste sobre como organizar tu peluqueria. Te gustaria agendar una demo de 15 min?",
                "confirmacion_demo": "Hola {{nombre}}! Confirmo tu demo de Groomly para el {{fecha}} a las {{hora}}. Te va a encantar ver como funciona. Link: {{link}}",
                "auditoria_web": "Hola {{nombre}}! He preparado una auditoria personalizada para {{empresa}}. Puedes ver cuantas citas pierdes al mes comparado con otras peluquerias de tu ciudad: {{link}}",
            },
        },
        quantification={"enabled": True, "ask_for_numbers": True, "currency_in_message": True},
        value_offer={"enabled": True, "type": "auditoria_web", "delivery": "whatsapp"},
        gatekeeper={"max_turns": 2, "script": "Perfecto, no se preocupe. Justamente por eso le envio el analisis por WhatsApp — asi el dueno lo ve en el movil cuando tenga un momento. Es gratis y sin compromiso. Me confirma el numero de WhatsApp del salon?", "fallback": "email_request"},
    )

    compliance = ComplianceConfig(
        disclosure_text="Soy Ana, asistente virtual de Groomly. Te ayudo a agendar una demo con nuestro equipo. Te parece?",
        call_hour_start=9,
        call_hour_end=20,
        call_days_allowed="1,2,3,4,5,6",
        timezone="Europe/Madrid",
    )

    voice = VoiceConfig(
        twilio_cnam_name="Groomly",
        caller_id_strategy="static",
    )

    case_repo = CaseStudyRepository([
        CaseStudy(
            id="gr_001",
            tipo_negocio="peluqueria",
            empresa="Peluqueria Glamour",
            ciudad="Madrid",
            pais="es",
            resultado="recuperaron 35% de clientas que no volvian",
            metrica_destacada="aumento de 1.200 EUR/mes en citas recuperadas",
            testimonial="Antes las clientas venian una vez y desaparecian. Ahora el sistema les recuerda cuando les toca tinte o corte y vuelven solas.",
            tiempo_a_resultado="2 meses",
            tags=["retencion", "tinte", "recordatorios"],
        ),
        CaseStudy(
            id="gr_002",
            tipo_negocio="peluqueria",
            empresa="Salon Belleza Natural",
            ciudad="Barcelona",
            pais="es",
            resultado="organizaron agenda de 3 estilistas sin confusiones",
            metrica_destacada="cero dobles reservas desde la implementacion",
            testimonial="Con tres estilistas era un caos. Ahora cada una ve su agenda en su movil y las clientas reservan con quien prefieren.",
            tiempo_a_resultado="1 mes",
            tags=["agenda", "estilistas", "reservas-online"],
        ),
    ])

    return AgentConfig(
        identity=identity,
        product=product,
        playbook=playbook,
        compliance=compliance,
        voice=voice,
        case_study_repo=case_repo,
        software_id="groomly",
        playbook_id="groomly_free_value_v1",
    )
