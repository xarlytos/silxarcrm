"""Configuracion del agente de voz para Peluguau (Mexico).

Kit LEGO: Laura — asesora comercial mexicana, calida y cercana.
Mercado: Peluquerias caninas en Mexico.
Moneda: MXN
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
    """Devuelve la configuracion completa de Peluguau."""

    identity = IdentityConfig(
        agent_name="Laura",
        agent_gender="femenino",
        agent_accent="es-MX",
        agent_tone="calida_cercana",
        agent_experience_years=3,
    )

    product = ProductConfig(
        company_name="Peluguau",
        product_name="Peluguau Pro",
        product_description="Software de gestion para peluquerias caninas en Mexico",
        target_vertical="peluquerias caninas",
        target_audience="duenos de peluquerias caninas",
        currency="MXN",
        currency_symbol="$/pesos",
        market_country="mx",
        market_city_examples="CDMX, Guadalajara, Monterrey, Puebla, Queretaro",
        price_monthly=299,
    )

    playbook = SalesPlaybook(
        playbook_id="peluguau_free_value_v1",
        name="Free Value First → Demo",
        description="Entregar analisis gratuito, capturar WhatsApp, agendar demo",
        version="v1",
        stages=[
            PlaybookStage(
                id="pattern_interrupt",
                name="Pattern Interrupt",
                objective="Ganar atencion con dato de cancelaciones en temporada alta",
                duration_hint="5-8 seg",
                key_points=["Muletillas mexicanas naturales", "Tuteo amigable", "Hablar de 'huecos' y 'temporada alta'"],
                transitions={"engaged": "discovery", "rejected": "gatekeeper_or_exit"},
            ),
            PlaybookStage(
                id="discovery",
                name="Discovery",
                objective="Descubrir dolor: cancelaciones de ultimo momento, lista de espera",
                duration_hint="30-60 seg",
                transitions={"pain_confirmed": "quantify", "gatekeeper": "gatekeeper_mode"},
            ),
            PlaybookStage(
                id="quantify",
                name="Quantify Pain",
                objective="Hacer que calcule su perdida en pesos mexicanos",
                duration_hint="15-20 seg",
                transitions={"quantified": "value_offer"},
            ),
            PlaybookStage(
                id="value_offer",
                name="Value Offer",
                objective="Ofrecer analisis gratuito por WhatsApp",
                duration_hint="10-20 seg",
                transitions={"whatsapp_captured": "demo_close"},
            ),
            PlaybookStage(
                id="demo_close",
                name="Demo Close",
                objective="Agendar demo corta",
                duration_hint="15-20 seg",
                transitions={"demo_agendada": "exit"},
            ),
            PlaybookStage(
                id="exit",
                name="Exit",
                objective="Despedida calida y envio de WhatsApp",
                duration_hint="5-8 seg",
            ),
        ],
        scripts={
            "pattern_interrupt": [
                "{{nombre}}? Llamo porque en temporada alta, las peluquerias caninas en {{ciudad}} pierden entre 15-20% de citas por cancelaciones de ultimo momento — y el peor problema no es la cancelacion, es que no logran rellenar ese hueco a tiempo. Eso te pasa en {{empresa}}?",
            ],
            "discovery": [
                "Oye, cuando alguien cancela a las 9am para una cita a las 11am, logras avisarle a alguien de tu lista de espera?",
                "Cuanto tiempo pierdes tu o tu equipo solo en coordinar citas por WhatsApp?",
            ],
            "demo_close": [
                "Mira, mejor te lo muestro en una demo rapidita de 15 minutos. Te late manana a las 11am o jueves a las 3pm?",
            ],
            "whatsapp": {
                "info": "Hola! Soy Sofia de Peluguau. Te envio la informacion que pediste sobre como organizar tu peluqueria canina. Te gustaria agendar una demo de 15 min?",
                "confirmacion_demo": "Hola {{nombre}}! Confirmo tu demo de Peluguau para el {{fecha}} a las {{hora}}. Te va a encantar ver como funciona. Link: {{link}}",
                "auditoria_web": "Hola {{nombre}}! Preparé un analisis personalizado para {{empresa}}. Puedes ver cuantas citas pierdes al mes comparado con otras peluquerias de tu ciudad: {{link}}",
            },
        },
        quantification={"enabled": True, "ask_for_numbers": True, "currency_in_message": True},
        value_offer={"enabled": True, "type": "auditoria_web", "delivery": "whatsapp"},
        gatekeeper={"max_turns": 2, "script": "Perfecto, no te preocupes. Justamente por eso le envio el analisis por WhatsApp — asi el dueno lo ve en el cel cuando tenga un momento. Es gratis y sin compromiso. Me confirmas el numero de WhatsApp de la peluqueria?", "fallback": "email_request"},
    )

    compliance = ComplianceConfig(
        disclosure_text="Soy Laura, asistente virtual de Peluguau. Te ayudo a agendar una demo con nuestro equipo. Te parece?",
        call_hour_start=9,
        call_hour_end=19,
        call_days_allowed="1,2,3,4,5,6",
        timezone="America/Mexico_City",
    )

    voice = VoiceConfig(
        twilio_cnam_name="Peluguau",
        caller_id_strategy="static",
    )

    case_repo = CaseStudyRepository([
        CaseStudy(
            id="pg_001",
            tipo_negocio="peluqueria_canina",
            empresa="Peluqueria Canina Peludos",
            ciudad="Guadalajara",
            pais="mx",
            resultado="duplicaron citas usando lista de espera automatica",
            metrica_destacada="pasaron de perder 6 citas/semana a solo 1",
            testimonial="Antes cuando alguien cancelaba, el hueco se quedaba vacio. Ahora el sistema avisa automaticamente al siguiente de la lista de espera.",
            tiempo_a_resultado="1 mes",
            tags=["lista-de-espera", "cancelaciones", "temporada-alta"],
        ),
        CaseStudy(
            id="pg_002",
            tipo_negocio="peluqueria_canina",
            empresa="Spa Canino Luna",
            ciudad="CDMX",
            pais="mx",
            resultado="redujeron cancelaciones de ultimo momento en 70%",
            metrica_destacada="recordatorios automaticos por WhatsApp y SMS",
            testimonial="Nuestros clientes ya no olvidan las citas. El sistema les recuerda un dia antes y el dia de la cita.",
            tiempo_a_resultado="2 meses",
            tags=["recordatorios", "whatsapp", "sms"],
        ),
    ])

    return AgentConfig(
        identity=identity,
        product=product,
        playbook=playbook,
        compliance=compliance,
        voice=voice,
        case_study_repo=case_repo,
        software_id="peluguau",
        playbook_id="peluguau_free_value_v1",
    )
