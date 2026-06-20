"""State Engine probabilístico — máquina de estados comercial NO determinista.

Las transiciones NO son duras. Cada estado tiene probabilidades de
saltar a otros estados. El prospecto puede estar en múltiples estados
a la vez (ej: solution_aware + problem_aware + interested).

Diseño: stage + next_stages_probs + confidence + tags
"""
from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.conversation.classifier import IntentClassification

logger = logging.getLogger(__name__)


# ── Stages del funnel ──
SALES_STAGES = [
    "saludo",
    "discovery",
    "problem_aware",
    "solution_aware",
    "qualified",
    "closing",
    "exit",
]

# ── Objetivo por stage ──
STAGE_OBJECTIVES = {
    "saludo": "presentarte brevemente y pedir permiso para hablar",
    "discovery": "descubrir si tienen un dolor real (cancelaciones, recordatorios)",
    "problem_aware": "cuantificar el dolor y que el lead lo reconozca",
    "solution_aware": "explicar brevemente cómo GestPro resuelve ese dolor",
    "qualified": "confirmar que tiene interés y autoridad para decidir",
    "closing": "agendar una demo de 15 minutos con día y hora concretos",
    "exit": "despedirse amablemente, ofrecer WhatsApp con info",
}

# ── Preguntas sugeridas por stage ──
STAGE_QUESTIONS = {
    "saludo": "¿Le agarro en buen momento?",
    "discovery": "¿Cuántas citas les cancelan a la semana?",
    "problem_aware": "¿Eso les representa pérdida de ingresos mensual?",
    "solution_aware": "¿Le gustaría ver cómo funciona en una demo corta?",
    "qualified": "¿Usted sería quien decidiría si lo implementan?",
    "closing": "¿Le queda mejor mañana a las 3 o pasado en la mañana?",
    "exit": "Le envío info por WhatsApp por si cambia de opinión. ¿Le parece?",
}

# ── Alertas por stage ──
STAGE_ALERTS = {
    "saludo": ["no_vender_todavía", "solo_presentar"],
    "discovery": ["no_mencionar_precio", "escuchar_más_que_hablar"],
    "problem_aware": ["no_presionar", "validar_dolor"],
    "solution_aware": ["no_cerrar_venta", "solo_agendar_demo"],
    "qualified": ["confirmar_autoridad", "no_negociar"],
    "closing": ["ser_concreto_con_fecha", "confirmar_por_whatsapp"],
    "exit": ["no_insistir", "despedirse_amable"],
}


@dataclass
class CallGoal:
    """Meta global de la llamada + progreso del funnel."""

    goal: str = "book_demo"           # meta de la llamada
    progress: float = 0.0             # 0.0-1.0 progreso hacia la meta
    risk_of_loss: float = 0.5         # 0.0-1.0 riesgo de perder el lead
    turns_without_progress: int = 0   # turnos sin avance en progress
    total_value_signals: int = 0      # señales de valor acumuladas

    def update(self, old_stage: str, new_stage: str, classification, turn_count: int = 0) -> None:
        """Actualiza progreso basado en transición de stage.

        FRENO: No permite forzar cierre antes del turno 3.
        Progress solo sube si hay múltiples señales de valor.
        """
        # Progreso por stage (con freno temprano)
        stage_progress = {
            "saludo": 0.05,
            "discovery": 0.15,
            "problem_aware": 0.30,
            "solution_aware": 0.50,
            "qualified": 0.70,
            "closing": 0.90,
            "exit": 0.0,
        }
        old_p = stage_progress.get(old_stage, 0)
        new_p = stage_progress.get(new_stage, 0)

        # ═══ OPTIMIZACIÓN CICLO 2: Freno inteligente (2.3) ═══
        # Antes: freno hardcodeado en turno 3 siempre
        # Ahora: freno solo si hay pocas señales (inteligente)
        if new_stage == "closing" and turn_count < 3:
            # CONTAR SEÑALES DE VALOR (hot lead detection):
            intent = getattr(classification, "intencion", "neutro")
            conf = getattr(classification, "confidence", 0)
            pain = self.pain_detected if hasattr(self, 'pain_detected') else False

            signal_count = sum([
                pain,                              # prospecto mencionó problema
                intent == "agendando",             # quiere agendar
                conf > 0.8,                        # clasificador seguro
            ])

            # Si tiene 2+ señales fuertes → permitir cierre (hot lead)
            # Si tiene < 2 → aplicar freno (débil, esperar más info)
            if signal_count < 2:
                # Débil: aplicar freno
                new_p = min(new_p, 0.40)
                self.risk_of_loss = min(0.7, self.risk_of_loss + 0.15)
            else:
                # Fuerte: freno ligero (permite avance pero controlado)
                new_p = min(new_p, 0.80)
                logger.info(
                    "CICLO 2: Hot lead en turno %d (%d señales). "
                    "Permitiendo cierre temprano.",
                    turn_count, signal_count
                )

        if new_p > old_p:
            # Avanzó en el funnel
            # Progress solo sube si hay señales de valor suficientes
            if self._should_increase_progress(new_stage, classification):
                self.progress = max(self.progress, new_p)
                self.total_value_signals += 1
                self.risk_of_loss = max(0.1, self.risk_of_loss - 0.15)
            else:
                # Avanzó pero sin señales sólidas → progreso moderado
                self.progress = max(self.progress, new_p * 0.7)
                self.risk_of_loss = max(0.2, self.risk_of_loss - 0.05)
            self.turns_without_progress = 0
        elif new_p < old_p:
            # Retrocedió (objeción, cambio de tema)
            self.turns_without_progress += 1
            self.risk_of_loss = min(0.9, self.risk_of_loss + 0.10)
        else:
            # Mismo stage
            self.turns_without_progress += 1
            if self.turns_without_progress > 3:
                self.risk_of_loss = min(0.9, self.risk_of_loss + 0.05)

        # Ajustar por intención
        intent = getattr(classification, "intencion", "neutro")
        if intent == "agendando":
            self.progress = max(self.progress, 0.95)
            self.risk_of_loss = 0.05
        elif intent == "rechazando":
            self.risk_of_loss = min(0.95, self.risk_of_loss + 0.30)
        elif intent == "interesado":
            self.total_value_signals += 1
            self.risk_of_loss = max(0.1, self.risk_of_loss - 0.10)

    def _should_increase_progress(self, new_stage: str, classification) -> bool:
        """Decide si el progreso debe aumentar basado en señales de valor.

        Freno: progress solo sube si hay múltiples señales de valor.
        """
        intent = getattr(classification, "intencion", "neutro")
        tags = set(classification.tags)

        # Señales de valor positivas
        value_signals = [
            "dolor_alto" in tags,
            "es_decisor" in tags,
            "pregunta_demo" in tags,
            intent == "interesado",
            intent == "agendando",
        ]

        # Necesita al menos 2 señales para subir progreso rápido
        return sum(value_signals) >= 2 or intent == "agendando"

    def to_prompt_section(self) -> str:
        lines = [
            "=== META DE LA LLAMADA ===",
            f"Objetivo: {self.goal}",
            f"Progreso: {self.progress:.0%}",
            f"Riesgo de pérdida: {self.risk_of_loss:.0%}",
        ]
        if self.turns_without_progress > 2:
            lines.append(f"ALERTA: {self.turns_without_progress} turnos sin avance → subir urgencia")
        if self.risk_of_loss > 0.7:
            lines.append("ALERTA: Riesgo alto. Ofrecer WhatsApp y cerrar amable.")
        if self.progress > 0.7:
            lines.append("ALERTA: Lead caliente. Ser concreto, agendar ya.")
        lines.append("=== FIN META ===")
        return "\n".join(lines)


@dataclass
class SalesState:
    """Estado comercial probabilístico: stage + next_stages_probs + confidence + tags.

    NO es determinista. El prospecto puede estar en múltiples estados
    simultáneamente con diferentes probabilidades.
    """

    stage: str = "saludo"
    confidence: float = 0.5
    tags: list[str] = field(default_factory=list)

    # Flags rápidos (decisionales)
    pain_detected: bool = False
    has_software: bool = False
    is_decision_maker: bool = False
    wants_demo: bool = False
    is_rejecting: bool = False
    needs_human: bool = False
    objecion_activa: str = ""

    # Probabilidades de próximos estados (NO lineal)
    next_stages: dict[str, float] = field(default_factory=dict)

    # Historial de estados
    stage_history: list[str] = field(default_factory=list)
    turnos_en_stage: int = 0
    objeciones_count: int = 0

    def to_prompt_section(self) -> str:
        """Convierte el estado en instrucciones para el conversador."""
        lines = [
            "=== ESTRATEGIA DE VENTA ===",
            f"Estado actual: {self.stage} (confianza: {self.confidence:.0%})",
            f"Objetivo: {STAGE_OBJECTIVES.get(self.stage, '')}",
        ]
        if self.next_stages:
            probs = ", ".join(f"{s}={p:.0%}" for s, p in sorted(self.next_stages.items(), key=lambda x: -x[1])[:3])
            lines.append(f"Próximos estados probables: {probs}")
        if self.tags:
            lines.append(f"Tags detectados: {', '.join(self.tags)}")
        if self.objecion_activa:
            lines.append(f"Objeción activa: {self.objecion_activa}")
        alerts = STAGE_ALERTS.get(self.stage, [])
        if alerts:
            lines.append(f"ALERTAS: {' | '.join(alerts)}")
        lines.append(f"Próxima pregunta sugerida: {STAGE_QUESTIONS.get(self.stage, '')}")
        lines.append("=== FIN ESTRATEGIA ===")
        return "\n".join(lines)

    def advance_stage(self, new_stage: str) -> None:
        """Cambia de stage y registra historial."""
        if new_stage != self.stage:
            self.stage_history.append(self.stage)
            self.stage = new_stage
            self.turnos_en_stage = 0
            self.next_stages = {}  # resetear probabilidades
            logger.info("Stage: %s -> %s (tags=%s)", self.stage_history[-1], new_stage, self.tags)
        self.turnos_en_stage += 1


class StateEngine:
    """Motor de estados comercial probabilístico con hysteresis."""

    # Hysteresis: mínimo de turnos en un stage antes de permitir cambio
    MIN_TURNS_BEFORE_TRANSITION = 2
    # Excepciones donde hysteresis NO aplica (eventos irreversibles)
    HYSTERESIS_EXCEPTIONS = {"agendando", "rechazando", "pidiendo_humano"}

    def update(
        self,
        state: SalesState,
        classification: "IntentClassification",
        call_goal: CallGoal,
        turn_count: int = 0,
    ) -> tuple[SalesState, CallGoal, str]:
        """Actualiza estado y meta basado en clasificación.

        Retorna: (state, call_goal, reasoning)
        """
        old_stage = state.stage
        reason = "no_change"

        # ── Actualizar tags ──
        state.tags = list(set(state.tags + classification.tags))

        # ── Actualizar flags ──
        if "tiene_software" in classification.tags:
            state.has_software = True
        if "dolor_alto" in classification.tags:
            state.pain_detected = True
        if "es_decisor" in classification.tags:
            state.is_decision_maker = True
        if "pregunta_demo" in classification.tags:
            state.wants_demo = True
        if classification.nueva_objecion != "ninguna":
            state.objecion_activa = classification.nueva_objecion
            state.objeciones_count += 1

        # ── Calcular probabilidades de próximos estados ──
        next_probs = self._compute_next_stage_probs(state, classification)
        state.next_stages = next_probs

        # ── Decidir transición (probabilística + hysteresis) ──
        most_likely = max(next_probs.items(), key=lambda x: x[1])
        target_stage, prob = most_likely

        # ¿Aplicar hysteresis?
        # NO aplicar en excepciones (agendando, rechazando, humano)
        # NO aplicar si estamos en saludo (primeros turnos)
        apply_hysteresis = (
            classification.intencion not in self.HYSTERESIS_EXCEPTIONS
            and state.stage not in ("saludo", "exit")
            and state.turnos_en_stage < self.MIN_TURNS_BEFORE_TRANSITION
        )

        if target_stage != state.stage and prob > 0.6:
            if apply_hysteresis:
                # Hysteresis activa: mantener estado actual pero mostrar intención
                state.confidence = min(0.95, prob)
                state.turnos_en_stage += 1
                reason = f"hysteresis_blocked: intent={classification.intencion} target={target_stage} (turn {state.turnos_en_stage}/{self.MIN_TURNS_BEFORE_TRANSITION})"
            else:
                state.advance_stage(target_stage)
                reason = f"transition: {old_stage} -> {target_stage} (prob={prob:.2f}, intent={classification.intencion})"
        elif target_stage == state.stage and prob > 0.7:
            state.confidence = min(0.95, prob)
            state.turnos_en_stage += 1
            reason = f"stay: {state.stage} (prob={prob:.2f})"
        else:
            state.confidence = max(0.3, prob)
            state.turnos_en_stage += 1
            reason = f"uncertain: {state.stage} (prob={prob:.2f})"

        # ── Actualizar meta de llamada (con freno) ──
        call_goal.update(old_stage, state.stage, classification, turn_count)

        return state, call_goal, reason

    def _compute_next_stage_probs(
        self,
        state: SalesState,
        classification: "IntentClassification",
    ) -> dict[str, float]:
        """Calcula probabilidades de cada próximo estado.

        No impone un funnel rígido. Permite múltiples caminos.

        OPTIMIZACIÓN CICLO 2 (2.1): Multiplicar por factores CRM
        - decision_maker → más probable closing (-50% discovery)
        - conversion_rate alto → más probable closing
        - intentos fallidos → más probable exit
        """
        probs = {stage: 0.05 for stage in SALES_STAGES}  # base uniforme
        probs[state.stage] = 0.20  # probabilidad de quedarse

        # ═══ FACTORES CRM ═══
        # Extraer datos del prospecto si están disponibles
        prospect_data = getattr(self, 'prospect_data', {})
        is_decision_maker = prospect_data.get('is_decision_maker', False)
        conversion_rate = prospect_data.get('conversion_rate', 0.2)  # default 20%
        attempts_failed = prospect_data.get('attempts_failed', 0)

        # Multiplicadores (ponytail: simples pesos, sin complejidad)
        crm_multiplier = 1.0
        if is_decision_maker:
            crm_multiplier *= 1.4  # Decision maker = +40% closing
        if conversion_rate > 0.3:
            crm_multiplier *= 1.2  # High conversion = +20% closing
        if attempts_failed > 2:
            crm_multiplier *= 1.1  # Multiple failures = +10% exit

        intent = classification.intencion
        conf = classification.confidence

        # RECHAZO → exit muy probable
        if intent == "rechazando":
            probs["exit"] = 0.60 * conf + 0.20
            probs[state.stage] = 0.15

        # AGENDA → closing muy probable
        elif intent == "agendando":
            probs["closing"] = 0.70 * conf + 0.20
            probs[state.stage] = 0.10

        # PIDE HUMANO → qualified
        elif intent == "pidiendo_humano":
            probs["qualified"] = 0.60 * conf + 0.20
            probs["closing"] = 0.15

        # INTERESADO
        elif intent == "interesado":
            if state.pain_detected:
                # Tiene dolor + interés → closing o solution_aware
                probs["closing"] = 0.35 * conf
                probs["solution_aware"] = 0.30 * conf
                probs["qualified"] = 0.20 * conf
            else:
                # Interesado pero sin dolor confirmado → solution_aware
                probs["solution_aware"] = 0.40 * conf
                probs["problem_aware"] = 0.25 * conf
            probs[state.stage] = 0.20

        # PIDIENDO INFO
        elif intent == "pidiendo_info":
            probs["solution_aware"] = 0.45 * conf
            probs["qualified"] = 0.20 * conf
            probs[state.stage] = 0.25

        # NEUTRO
        elif intent == "neutro":
            # Probabilidad de mantener estado actual es alta
            probs[state.stage] = 0.50
            # Pequeña probabilidad de avanzar si hay señales previas
            if state.pain_detected and state.stage == "discovery":
                probs["problem_aware"] = 0.25

        # Ajustar por stage actual (momentum)
        if state.stage == "saludo" and intent in ("neutro", "interesado"):
            probs["discovery"] = max(probs["discovery"], 0.40)
        elif state.stage == "discovery" and state.pain_detected:
            probs["problem_aware"] = max(probs["problem_aware"], 0.35)
        elif state.stage == "problem_aware" and state.pain_detected:
            probs["solution_aware"] = max(probs["solution_aware"], 0.35)
        elif state.stage == "solution_aware" and intent == "interesado":
            probs["qualified"] = max(probs["qualified"], 0.35)
        elif state.stage == "qualified" and state.is_decision_maker:
            probs["closing"] = max(probs["closing"], 0.40)

        # ═══ APLICAR MULTIPLICADORES CRM ═══
        # Decision maker = más probable closing, menos probable discovery
        if is_decision_maker:
            probs["closing"] *= 1.5
            probs["discovery"] *= 0.7  # menos discovery, directo a closing

        # High conversion rate = más probable closing
        if conversion_rate > 0.3:
            probs["closing"] *= 1.2

        # Intentos fallidos = más probable exit (trata como "fría")
        if attempts_failed > 2:
            probs["exit"] *= 1.3
            probs["closing"] *= 0.8  # menos optimista

        # Normalizar a suma = 1.0
        total = sum(probs.values())
        if total > 0:
            probs = {k: v / total for k, v in probs.items()}

        return probs
