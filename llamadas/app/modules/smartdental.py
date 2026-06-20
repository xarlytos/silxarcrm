"""Configuracion del agente de voz para SmartDental (Espana).

Kit LEGO: Carlos — asesor comercial espanol, profesional y cercano.
Mercado: Clinicas dentales en Espana.
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
    """Devuelve la configuracion completa de SmartDental con la nueva arquitectura."""

    # ── 1. Identity: quien es Carlos ──
    identity = IdentityConfig(
        agent_name="Carlos",
        agent_gender="masculino",
        agent_accent="es-ES",
        agent_tone="profesional_cercano",
        agent_experience_years=4,
        elevenlabs_voice_id="ErXwobaYiN019PkySvjV",  # Antoni — espanol castellano
    )

    # ── 2. Product: que se vende ──
    product = ProductConfig(
        company_name="SmartDental",
        product_name="SmartDental",
        product_description="Software de gestion para clinicas dentales en Espana",
        target_vertical="clinicas dentales",
        target_audience="duenos de clinicas dentales",
        currency="EUR",
        currency_symbol="EUR",
        market_country="es",
        market_city_examples="Madrid, Barcelona, Valencia, Sevilla, Malaga",
        price_monthly=59,
    )

    # ── 3. Playbook: como se vende ──
    playbook = SalesPlaybook(
        playbook_id="smartdental_free_value_v1",
        name="Free Value First → Demo",
        description="Entregar analisis gratuito, capturar email, agendar demo de 15 min",
        version="v1",
        stages=[
            PlaybookStage(
                id="pattern_interrupt",
                name="Pattern Interrupt",
                objective="Ganar atencion con dato especifico del sector dental",
                duration_hint="5-8 seg",
                key_points=["Usar dato dental especifico", "NO mencionar producto ni precio"],
                transitions={"engaged": "discovery", "rejected": "gatekeeper_or_exit"},
            ),
            PlaybookStage(
                id="discovery",
                name="Discovery SPIN",
                objective="Descubrir dolor: pacientes que no regresan, cancelaciones",
                duration_hint="30-60 seg",
                transitions={"pain_confirmed": "quantify", "gatekeeper": "gatekeeper_mode"},
            ),
            PlaybookStage(
                id="quantify",
                name="Quantify Pain",
                objective="Hacer que el doctor calcule su perdida en EUR",
                duration_hint="15-20 seg",
                key_points=["NUNCA imponer numeros", "SIEMPRE 'Hice bien la cuenta?'"],
                transitions={"quantified": "value_offer"},
            ),
            PlaybookStage(
                id="value_offer",
                name="Value Offer",
                objective="Ofrecer auditoria web dental personalizada",
                duration_hint="10-20 seg",
                transitions={"email_captured": "demo_close"},
            ),
            PlaybookStage(
                id="demo_close",
                name="Demo Close",
                objective="Agendar demo de 15 min con 2 opciones",
                duration_hint="15-20 seg",
                transitions={"demo_agendada": "exit"},
            ),
            PlaybookStage(
                id="exit",
                name="Exit",
                objective="Despedida reafirmando valor y envio inmediato",
                duration_hint="5-8 seg",
            ),
        ],
        scripts={
            "pattern_interrupt": [
                "{{nombre}}? Se que esta ocupado, le prometo que solo le robo 30 segundos. Estoy haciendo un estudio con clinicas dentales en {{ciudad}} y encontre un dato que me preocupa: el 42% de pacientes que hacen una limpieza no vuelven en los 6 meses siguientes — no porque no quieran, sino porque nadie les recuerda. Eso le suena familiar en {{empresa}}?",
            ],
            "discovery": [
                "Una pregunta rapida: cuantas citas les cancelan a la semana sin avisar? El promedio anda en 4 o 5, no?",
                "Y ahorita como le recuerdan a los pacientes sus citas? WhatsApp a mano uno por uno?",
            ],
            "demo_close": [
                "Mire, mejor se lo muestro en una demo rapidita de 15 minutos. Le late manana a las 11am o jueves a las 3pm?",
            ],
            "whatsapp": {
                "info": "Hola! Soy Mariana de SmartDental. Te envio la informacion que pediste sobre como organizar tu clinica dental. Te gustaria agendar una demo de 15 min?",
                "confirmacion_demo": "Hola {{nombre}}! Confirmo tu demo de SmartDental para el {{fecha}} a las {{hora}}. Te va a encantar ver como funciona. Link: {{link}}",
                "despedida": "Hola {{nombre}}! Fue un gusto hablar contigo. Te envio el resumen de SmartDental. Quedo atenta por si tienes alguna duda.",
                "auditoria_web": "Hola {{nombre}}! He preparado una auditoria personalizada para {{empresa}}. Puedes ver cuantas citas pierdes al mes comparado con el promedio de tu provincia: {{link}}",
            },
        },
        quantification={"enabled": True, "ask_for_numbers": True, "currency_in_message": True},
        value_offer={"enabled": True, "type": "auditoria_web", "delivery": "whatsapp"},
        gatekeeper={"max_turns": 2, "script": "Perfecto, no se preocupe. Justamente por eso le envio el analisis por WhatsApp — asi el doctor lo ve en el movil cuando tenga un momento. Es gratis y sin compromiso. Me confirma el numero de WhatsApp de la clinica?", "fallback": "email_request"},
    )

    # ── 4. Compliance: reglas de Espana ──
    compliance = ComplianceConfig(
        disclosure_text="Soy Carlos, asistente inteligente de SmartDental. Te ayudo a agendar una demo con nuestro equipo. Te parece?",
        call_hour_start=9,
        call_hour_end=20,
        call_days_allowed="1,2,3,4,5,6",
        timezone="Europe/Madrid",
    )

    # ── 5. Voice: telefonia ──
    voice = VoiceConfig(
        twilio_cnam_name="SmartDental",
        caller_id_strategy="static",
    )

    # ── 6. Case Studies: repositorio de casos dentales ──
    case_repo = CaseStudyRepository([
        CaseStudy(
            id="sd_001",
            tipo_negocio="dentista",
            empresa="Clinica Dental Sonrisa Perfecta",
            ciudad="Madrid",
            pais="es",
            resultado="redujeron no-shows de 35% a 8% en 3 meses",
            metrica_destacada="recuperaron 127 citas perdidas = 38.100 EUR/ano",
            testimonial="Antes perdimos 2-3 pacientes por semana que no venian a su revision. Ahora el sistema les recuerda automaticamente y hemos recuperado casi todas.",
            tiempo_a_resultado="3 meses",
            tags=["no-shows", "recordatorios", "whatsapp"],
        ),
        CaseStudy(
            id="sd_002",
            tipo_negocio="dentista",
            empresa="Dental Plus",
            ciudad="Valencia",
            pais="es",
            resultado="duplicaron citas recurrentes con recordatorios automaticos",
            metrica_destacada="agenda llena 3 semanas por delante",
            testimonial="Implementamos recordatorios de limpiezas cada 6 meses y recuperamos pacientes que dabamos por perdidos.",
            tiempo_a_resultado="2 meses",
            tags=["retencion", "limpiezas", "recordatorios"],
        ),
        CaseStudy(
            id="sd_003",
            tipo_negocio="dentista",
            empresa="Dental Blanquea",
            ciudad="Barcelona",
            pais="es",
            resultado="bajaron de 20 a 7 abandonos de tratamientos al mes",
            metrica_destacada="sin invertir mas en publicidad",
            testimonial="Los recordatorios de revisiones automaticos hicieron que nuestros pacientes de ortodoncia completaran el tratamiento.",
            tiempo_a_resultado="4 meses",
            tags=["abandonos", "ortodoncia", "seguimiento"],
        ),
    ])

    # ── 7. Montar AgentConfig ──
    return AgentConfig(
        identity=identity,
        product=product,
        playbook=playbook,
        compliance=compliance,
        voice=voice,
        case_study_repo=case_repo,
        software_id="smartdental",
        playbook_id="smartdental_free_value_v1",
    )
