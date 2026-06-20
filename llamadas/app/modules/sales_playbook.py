"""Sales Playbook: la estrategia comercial independiente del software.

El Playbook define COMO se vende (funnel, scripts, objeciones).
El Software define A QUE se vende (producto, precio, vertical).

Un mismo software puede probar multiples playbooks (A/B testing).
Un mismo playbook puede usarse en multiples softwares (reutilizacion).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PlaybookStage:
    """Una etapa del funnel de ventas."""

    id: str  # ej: "pattern_interrupt", "discovery", "quantify", "value_offer", "demo"
    name: str  # Nombre legible
    objective: str  # Que se busca en esta etapa
    duration_hint: str  # "5-8 seg", "30-60 seg"
    key_points: list[str] = field(default_factory=list)
    prohibitions: list[str] = field(default_factory=list)
    transitions: dict[str, str] = field(default_factory=dict)  # {"yes": "next_stage", "no": "handle_objection"}


@dataclass
class SalesPlaybook:
    """Guion de ventas completo, versionable y reusable.

    Un software puede tener:
    - playbook_id = "free_value_v3" (produccion)
    - playbook_test_id = "direct_demo_v1" (A/B test)
    """

    playbook_id: str = "default"
    name: str = "PRO-V.O.I.S.E. Standard"
    description: str = "Free Value First → Demo"
    version: str = "v1"

    # Funnel de ventas: lista ordenada de etapas
    stages: list[PlaybookStage] = field(default_factory=list)

    # Scripts por etapa (anti-monotonia: multiples variantes por etapa)
    scripts: dict[str, Any] = field(default_factory=dict)
    # Ejemplo:
    # {
    #   "pattern_interrupt": ["script_a", "script_b", "script_c"],
    #   "discovery": ["pregunta_1", "pregunta_2"],
    #   "demo_close": ["close_a", "close_b"],
    # }

    # Manejadores de objeciones por tipo
    objection_handlers: dict[str, Any] = field(default_factory=dict)
    # Ejemplo:
    # {
    #   "precio": {"framework": "LAER", "script": "..."},
    #   "ya_tengo_sistema": {"framework": "LAER", "script": "..."},
    # }

    # Gatekeeper: estrategia especifica para recepcionistas
    gatekeeper: dict[str, Any] = field(default_factory=dict)
    # {
    #   "max_turns": 2,
    #   "script": "...",
    #   "fallback": "email_request",
    # }

    # Config de quantificacion
    quantification: dict[str, Any] = field(default_factory=dict)
    # {
    #   "enabled": True,
    #   "ask_for_numbers": True,
    #   "currency_in_message": True,
    # }

    # Config de la oferta de valor (free value)
    value_offer: dict[str, Any] = field(default_factory=dict)
    # {
    #   "enabled": True,
    #   "type": "auditoria_web",  # o "pdf", "video", "calculadora"
    #   "delivery": "whatsapp",   # o "email", "sms"
    # }

    # A/B test metadata
    ab_test: dict[str, Any] | None = None
    # {
    #   "experiment_id": "exp_001",
    #   "variant": "A",  # o "B"
    #   "parent_playbook_id": "free_value_v2",
    # }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SalesPlaybook":
        """Crea un playbook desde un dict (respuesta JSON del backend)."""
        stages_raw = data.get("stages", [])
        stages = [PlaybookStage(**s) if isinstance(s, dict) else s for s in stages_raw]

        return cls(
            playbook_id=data.get("playbook_id", "default"),
            name=data.get("name", "Standard"),
            description=data.get("description", ""),
            version=data.get("version", "v1"),
            stages=stages,
            scripts=data.get("scripts", {}),
            objection_handlers=data.get("objection_handlers", {}),
            gatekeeper=data.get("gatekeeper", {}),
            quantification=data.get("quantification", {}),
            value_offer=data.get("value_offer", {}),
            ab_test=data.get("ab_test"),
        )

    def get_stage(self, stage_id: str) -> PlaybookStage | None:
        """Obtiene una etapa por ID."""
        for stage in self.stages:
            if stage.id == stage_id:
                return stage
        return None

    def get_scripts_for_stage(self, stage_id: str) -> list[str]:
        """Obtiene los scripts disponibles para una etapa."""
        return self.scripts.get(stage_id, [])

    def get_random_script(self, stage_id: str) -> str:
        """Obtiene un script aleatorio para una etapa (anti-monotonia)."""
        import random
        scripts = self.get_scripts_for_stage(stage_id)
        if scripts:
            return random.choice(scripts)
        return ""

    def get_objection_handler(self, objection_type: str) -> dict[str, Any]:
        """Obtiene el manejador para un tipo de objecion."""
        return self.objection_handlers.get(objection_type, {})

    @property
    def stage_ids(self) -> list[str]:
        """Lista de IDs de etapas en orden."""
        return [s.id for s in self.stages]


# ── Playbooks predefinidos (templates) ──

def playbook_free_value_first() -> SalesPlaybook:
    """Playbook 'Free Value First' (el que usa SmartDental)."""
    return SalesPlaybook(
        playbook_id="free_value_v1",
        name="Free Value First → Demo",
        description="No vender en la primera llamada. Entregar valor gratuito, capturar email, agendar demo.",
        version="v1",
        stages=[
            PlaybookStage(
                id="pattern_interrupt",
                name="Pattern Interrupt",
                objective="Ganar atencion en 5-8 segundos con un dato especifico del nicho",
                duration_hint="5-8 seg",
                key_points=["NO decir 'Hola soy X de Y'", "Usar dato del nicho del prospecto", "Hablar de SU problema, no de nuestro producto"],
                prohibitions=["NO mencionar precio", "NO mencionar producto"],
                transitions={"engaged": "discovery", "rejected": "gatekeeper_or_exit"},
            ),
            PlaybookStage(
                id="discovery",
                name="Discovery SPIN",
                objective="Descubrir el dolor del prospecto mediante preguntas Situacion-Problema-Implicacion",
                duration_hint="30-60 seg",
                key_points=["70% prospecto habla, 30% agente", "Preguntar situacion: como maneja citas?", "Preguntar problema: cuantas se cancelan?", "Preguntar implicacion: que impacto tiene?"],
                transitions={"pain_confirmed": "quantify", "no_pain": "value_offer_early", "gatekeeper": "gatekeeper_mode"},
            ),
            PlaybookStage(
                id="quantify",
                name="Quantify Pain",
                objective="Hacer que el prospecto calcule EL MISMO su perdida economica",
                duration_hint="15-20 seg",
                key_points=["NUNCA imponer numeros", "SIEMPRE dejar que el prospecto diga las cifras", "Usar 'Hice bien la cuenta?' como validacion"],
                transitions={"quantified": "value_offer", "unclear": "discovery"},
            ),
            PlaybookStage(
                id="value_offer",
                name="Value Offer",
                objective="Ofrecer el analisis gratuito y capturar email/telefono",
                duration_hint="10-20 seg",
                key_points=["Ofrecer auditoria web interactiva personalizada", "NO enviar PDF", "Enviar por WhatsApp (85% tasa de apertura)"],
                transitions={"email_captured": "demo_close", "more_interest": "demo_close", "not_now": "exit_with_value"},
            ),
            PlaybookStage(
                id="demo_close",
                name="Demo Close",
                objective="Agendar demo de 15 minutos con 2 opciones de horario",
                duration_hint="15-20 seg",
                key_points=["Ofrecer 2 opciones (no 'cuando quiere?')", "Usar 'Ya te agende' como asuncion", "Pedir confirmacion de WhatsApp como micro-compromiso"],
                transitions={"demo_agendada": "exit", "no_demo": "exit_with_value"},
            ),
            PlaybookStage(
                id="exit",
                name="Exit with Expectation",
                objective="Despedirse reafirmando valor y proximo paso",
                duration_hint="5-8 seg",
                key_points=["Repetir el valor: 'dejar de perder esas citas'", "Confirmar que envia WhatsApp/email AHORA", "Sonar apurado si el prospecto suena ocupado"],
            ),
        ],
        quantification={"enabled": True, "ask_for_numbers": True, "currency_in_message": True},
        value_offer={"enabled": True, "type": "auditoria_web", "delivery": "whatsapp"},
        gatekeeper={"max_turns": 2, "fallback": "email_request"},
    )


def playbook_direct_demo() -> SalesPlaybook:
    """Playbook 'Direct Demo' (para softwares con trial gratuito)."""
    return SalesPlaybook(
        playbook_id="direct_demo_v1",
        name="Direct Demo → Trial",
        description="Ir directo a la demo porque el producto tiene trial gratuito de 14 dias.",
        version="v1",
        stages=[
            PlaybookStage(
                id="pattern_interrupt",
                name="Pattern Interrupt",
                objective="Ganar atencion con un dato del nicho",
                duration_hint="5-8 seg",
                transitions={"engaged": "discovery"},
            ),
            PlaybookStage(
                id="discovery",
                name="Quick Discovery",
                objective="Confirmar que tiene el problema en 2-3 preguntas",
                duration_hint="20-30 seg",
                transitions={"pain_confirmed": "trial_offer", "no_pain": "exit"},
            ),
            PlaybookStage(
                id="trial_offer",
                name="Trial Offer",
                objective="Ofrecer trial gratuito de 14 dias sin tarjeta",
                duration_hint="15-20 seg",
                key_points=["Enfasis en 'sin tarjeta'", "Enfasis en 'cancelas cuando quieras'", "Ofrecer demo corta si no quiere trial"],
                transitions={"trial_accepted": "exit", "demo_preferred": "demo_close", "rejected": "exit"},
            ),
            PlaybookStage(
                id="demo_close",
                name="Demo Close",
                objective="Agendar demo de 10 minutos",
                duration_hint="10-15 seg",
                transitions={"demo_agendada": "exit"},
            ),
            PlaybookStage(
                id="exit",
                name="Exit",
                objective="Despedida reafirmando proximo paso",
                duration_hint="5-8 seg",
            ),
        ],
        quantification={"enabled": False},
        value_offer={"enabled": True, "type": "trial_14d", "delivery": "email"},
        gatekeeper={"max_turns": 2, "fallback": "trial_link"},
    )


def playbook_roi_first() -> SalesPlaybook:
    """Playbook 'ROI First' (para softwares B2B de alto valor)."""
    return SalesPlaybook(
        playbook_id="roi_first_v1",
        name="ROI First → Demo",
        description="Cuantificar ROI desde el minuto 1 para justificar el precio.",
        version="v1",
        stages=[
            PlaybookStage(
                id="pattern_interrupt",
                name="Pattern Interrupt with ROI",
                objective="Abrir con un dato de ROI del nicho",
                duration_hint="5-8 seg",
                key_points=["'Negocios como el suyo recuperan X al mes con...'"],
                transitions={"engaged": "roi_quantify"},
            ),
            PlaybookStage(
                id="roi_quantify",
                name="ROI Quantification",
                objective="Hacer que el prospecto calcule su ROI en 60 segundos",
                duration_hint="45-60 seg",
                key_points=["Calcular ahorro mensual vs precio del software", "Si ROI > 3x, pasar a demo directa"],
                transitions={"roi_positive": "demo_close", "roi_unclear": "value_offer", "roi_negative": "exit"},
            ),
            PlaybookStage(
                id="demo_close",
                name="Demo Close",
                objective="Agendar demo mostrando exactamente como se ve el ROI",
                duration_hint="15-20 seg",
            ),
            PlaybookStage(
                id="value_offer",
                name="Value Offer",
                objective="Si ROI no es claro, enviar calculadora interactiva",
                duration_hint="10-15 seg",
            ),
            PlaybookStage(
                id="exit",
                name="Exit",
                objective="Despedida",
                duration_hint="5-8 seg",
            ),
        ],
        quantification={"enabled": True, "ask_for_numbers": True, "focus_on_roi": True},
        value_offer={"enabled": True, "type": "calculadora_roi", "delivery": "whatsapp"},
    )
