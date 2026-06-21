"""
Coaching Automático Post-Llamada — Implementación Completa
Sistema de análisis, scoring y decisión de acciones post-call

Componentes:
1. ScoreCalculator: E, I, O, LS, Sentiment, P(Close)
2. DecisionEngine: Matriz de decisión → Best Action
3. ActionScheduler: Programar activaciones
4. CoachingOrchestrator: Pipeline completo
"""

from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import TYPE_CHECKING, Any, Optional
import math

if TYPE_CHECKING:
    from app.conversation.state import CallContext

logger = logging.getLogger(__name__)


# ═══════════════════════════════════════════════════════════════════════════
# ENUMS Y TIPOS
# ═══════════════════════════════════════════════════════════════════════════


class ActionType(Enum):
    """Tipos de acciones post-call."""
    TRIPLE_LOCK = "triple_lock"
    CALL_24H = "call_24h"
    EMAIL_EDUCATIVO = "email_educativo"
    NURTURE_SUAVE = "nurture_suave"
    ARCHIVE = "archive"


class SentimentType(Enum):
    """Clasificación de sentimiento."""
    MUY_NEGATIVO = -2
    NEGATIVO = -1
    NEUTRO = 0
    POSITIVO = 1
    MUY_POSITIVO = 2


class LeadTemperature(Enum):
    """Clasificación de temperatura del lead."""
    FRIO = "frio"              # LS < 35
    COOL = "cool"              # LS 35-49
    WARM = "warm"              # LS 50-69
    HOT = "hot"                # LS 70-79
    ULTRA_HOT = "ultra_hot"    # LS 80-100


# ═══════════════════════════════════════════════════════════════════════════
# DATACLASSES
# ═══════════════════════════════════════════════════════════════════════════


@dataclass
class EngagementMetrics:
    """Métricas de engagement."""
    turns: int = 0
    prospect_words: int = 0
    questions: int = 0
    interruptions: int = 0
    pain_matches: int = 0

    def calculate_score(self) -> int:
        """Calcula engagement score (0-100)."""
        score = (
            (self.turns * 3) +
            (self.prospect_words * 0.1) +
            (self.questions * 2) +
            (self.interruptions * 1.5) +
            (self.pain_matches * 5)
        )
        return min(100, int(score))


@dataclass
class InterestSignals:
    """Señales de interés detectadas."""
    signals: dict[str, int] = field(default_factory=dict)

    def calculate_score(self) -> int:
        """Suma todas las señales de interés (0-100)."""
        return min(100, sum(self.signals.values()))


@dataclass
class ObjectionMetrics:
    """Métricas de manejo de objeciones."""
    total_objections: int = 0
    objections_handled: int = 0
    continued_after_rejection: bool = False

    def calculate_score(self) -> int:
        """Calcula objection handling score (0-100)."""
        if self.total_objections == 0:
            return 75 if self.continued_after_rejection else 0

        handled_ratio = self.objections_handled / self.total_objections
        base_score = handled_ratio * 75
        continuation_bonus = 25 if self.continued_after_rejection else 0

        return min(100, int(base_score + continuation_bonus))


@dataclass
class CoachingAnalysis:
    """Resultado completo del análisis post-call."""
    call_id: str
    lead_id: str
    call_date: datetime

    # Scores
    engagement_score: int
    interest_score: int
    objection_handling_score: int
    lead_score: int
    lead_temperature: LeadTemperature

    # Sentiment
    sentiment: SentimentType
    frustration_level: int  # 0-10

    # Probabilidad
    probability_to_close: float  # 0-1

    # Señales
    pain_points: list[str] = field(default_factory=list)
    objections: list[str] = field(default_factory=list)
    interest_keywords: list[str] = field(default_factory=list)

    # Decisión
    recommended_action: ActionType
    action_reason: str

    # Timing
    action_scheduled_at: datetime | None = None

    # Metadata
    metadata: dict[str, Any] = field(default_factory=dict)


# ═══════════════════════════════════════════════════════════════════════════
# 1. SCORE CALCULATOR
# ═══════════════════════════════════════════════════════════════════════════


class ScoreCalculator:
    """Calcula todos los scores (E, I, O, LS, Sentiment, P(Close))."""

    # Palabras clave por emoción
    EMOTION_KEYWORDS = {
        "muy_positivo": ["perfectamente", "me encanta", "necesito esto ya", "eso es exacto"],
        "positivo": ["interesante", "cuéntame más", "va", "dale", "gracias", "me interesa"],
        "neutral": ["ok", "entiendo", "mhm", "aja", "gracias"],
        "negativo": ["no", "no gracias", "ahorita no", "estoy ocupado", "uff"],
        "muy_negativo": ["molesto", "basta", "no me llames", "mierda"],
    }

    # Señales de interés
    INTEREST_TRIGGERS = {
        "precio_mencionado": (["cuánto cuesta", "precio", "presupuesto", "caro"], 8),
        "interes_verbal": (["me interesa", "suena bien", "va", "dale"], 10),
        "demo_solicitada": (["hazme una demo", "quiero ver", "muestrame"], 20),
        "urgencia": (["hoy", "mañana", "esta semana", "urgente", "ya"], 15),
        "autoridad": (["yo decido", "yo me encargo", "yo soy dueño"], 12),
        "necesidad_cuantificada": (["pierdo x", "cuesta $", "perdemos"], 15),
        "objecion_superada": ([], 13),
    }

    # Probabilidades Bayesianas (LR: Likelihood Ratios)
    BAYESIAN_RATIOS = {
        "engagement_high": 3.75,      # E > 70
        "engagement_medium": 0.51,    # E 50-70
        "interest_high": 5.33,        # I > 60
        "interest_medium": 0.40,      # I 40-60
        "sentiment_positive": 2.60,
        "sentiment_neutral": 0.40,
        "demo_agendada": 9.20,
        "objection_handled": 2.33,
        "duration_long": 3.78,        # > 5 min
    }

    # Probabilidad prior (baseline)
    PRIOR_CLOSE_RATE = 0.12  # 12% baseline

    def __init__(self):
        pass

    def calculate_engagement(self, metrics: EngagementMetrics) -> int:
        """Calcula Engagement Score (E)."""
        return metrics.calculate_score()

    def calculate_interest(
        self,
        transcript: list[dict[str, str]],
        detected_signals: dict[str, bool] | None = None
    ) -> int:
        """Calcula Interest Signals Score (I)."""
        if not detected_signals:
            detected_signals = self._detect_interest_signals(transcript)

        score = 0
        for signal_name, is_present in detected_signals.items():
            if is_present and signal_name in self.INTEREST_TRIGGERS:
                _, points = self.INTEREST_TRIGGERS[signal_name]
                score += points

        return min(100, score)

    def calculate_objection_handling(self, metrics: ObjectionMetrics) -> int:
        """Calcula Objection Handling Score (O)."""
        return metrics.calculate_score()

    def calculate_lead_score(
        self,
        engagement: int,
        interest: int,
        objection: int
    ) -> int:
        """Calcula Lead Score integrado: LS = E×0.40 + I×0.35 + O×0.25."""
        ls = (engagement * 0.40) + (interest * 0.35) + (objection * 0.25)
        return int(min(100, max(0, ls)))

    def classify_temperature(self, lead_score: int) -> LeadTemperature:
        """Clasifica temperatura del lead basada en LS."""
        if lead_score >= 80:
            return LeadTemperature.ULTRA_HOT
        elif lead_score >= 70:
            return LeadTemperature.HOT
        elif lead_score >= 50:
            return LeadTemperature.WARM
        elif lead_score >= 35:
            return LeadTemperature.COOL
        else:
            return LeadTemperature.FRIO

    def calculate_sentiment(
        self,
        transcript: list[dict[str, str]],
        engagement: int,
        interest: int,
        pain_quantified: bool = False
    ) -> SentimentType:
        """Calcula sentimiento del prospect con ajustes contextuales."""
        # Raw sentiment
        sentiment_raw = self._calculate_sentiment_raw(transcript)

        # Ajustes contextuales
        adjustments = 0

        if engagement < 30 and len(transcript) < 10:
            adjustments -= 0.5

        if interest > 60 and pain_quantified:
            adjustments += 0.3

        final_score = sentiment_raw + adjustments

        # Mapear a enum
        if final_score >= 1.5:
            return SentimentType.MUY_POSITIVO
        elif final_score >= 0.5:
            return SentimentType.POSITIVO
        elif final_score >= -0.5:
            return SentimentType.NEUTRO
        elif final_score >= -1.5:
            return SentimentType.NEGATIVO
        else:
            return SentimentType.MUY_NEGATIVO

    def calculate_frustration(self, transcript: list[dict[str, str]]) -> int:
        """Calcula frustration level (0-10)."""
        frustration_words = [
            "molesto", "harto", "basta", "no me llames",
            "incomodo", "fastidiado", "enojado", "furioso"
        ]

        all_text = " ".join(t.get("text", "").lower() for t in transcript)
        count = sum(all_text.count(word) for word in frustration_words)

        return min(10, count * 2)

    def calculate_probability_to_close(
        self,
        engagement: int,
        interest: int,
        sentiment: SentimentType,
        outcome: str,
        duration_seconds: int,
        prior_rate: float | None = None
    ) -> float:
        """Calcula P(Close) usando Naive Bayes."""
        if prior_rate is None:
            prior_rate = self.PRIOR_CLOSE_RATE

        # Recolectar likelihood ratios
        lr_total = 1.0

        # Engagement
        if engagement >= 70:
            lr_total *= self.BAYESIAN_RATIOS["engagement_high"]
        elif engagement >= 50:
            lr_total *= self.BAYESIAN_RATIOS["engagement_medium"]

        # Interest
        if interest >= 60:
            lr_total *= self.BAYESIAN_RATIOS["interest_high"]
        elif interest >= 40:
            lr_total *= self.BAYESIAN_RATIOS["interest_medium"]

        # Sentiment
        if sentiment == SentimentType.POSITIVO or sentiment == SentimentType.MUY_POSITIVO:
            lr_total *= self.BAYESIAN_RATIOS["sentiment_positive"]
        elif sentiment == SentimentType.NEUTRAL:
            lr_total *= self.BAYESIAN_RATIOS["sentiment_neutral"]

        # Demo agendada
        if outcome == "demo_agendada":
            lr_total *= self.BAYESIAN_RATIOS["demo_agendada"]

        # Duration
        if duration_seconds > 300:  # > 5 min
            lr_total *= self.BAYESIAN_RATIOS["duration_long"]

        # Calcular posterior usando log-odds
        log_odds = math.log(prior_rate / (1 - prior_rate)) + math.log(lr_total)
        ptc = 1 / (1 + math.exp(-log_odds))

        # Aplicar multiplicadores por outcome
        if outcome == "demo_agendada":
            ptc = min(0.95, ptc * 2.5)
        elif outcome == "rechazado":
            ptc = max(0.01, ptc * 0.05)
        elif outcome == "transferido":
            ptc = min(0.90, ptc * 1.8)

        return round(ptc, 4)

    # ─── Métodos privados ───

    def _detect_interest_signals(self, transcript: list[dict[str, str]]) -> dict[str, bool]:
        """Detecta señales de interés en el transcript."""
        all_text = " ".join(t.get("text", "").lower() for t in transcript)

        signals = {}
        for signal_name, (keywords, _) in self.INTEREST_TRIGGERS.items():
            signals[signal_name] = any(kw in all_text for kw in keywords)

        return signals

    def _calculate_sentiment_raw(self, transcript: list[dict[str, str]]) -> float:
        """Calcula sentimiento raw a partir de keywords."""
        prospect_text = " ".join(
            t.get("text", "").lower()
            for t in transcript
            if t.get("role") == "prospect"
        )

        if not prospect_text:
            return 0.0

        scores = {}
        for emotion, keywords in self.EMOTION_KEYWORDS.items():
            count = sum(prospect_text.count(kw) for kw in keywords)
            scores[emotion] = count

        # Mapear a valores
        emotion_values = {
            "muy_positivo": 2.0,
            "positivo": 1.0,
            "neutral": 0.0,
            "negativo": -1.0,
            "muy_negativo": -2.0,
        }

        total_weighted = sum(
            count * emotion_values[emotion]
            for emotion, count in scores.items()
        )

        total_count = sum(scores.values())
        if total_count == 0:
            return 0.0

        return total_weighted / total_count


# ═══════════════════════════════════════════════════════════════════════════
# 2. DECISION ENGINE
# ═══════════════════════════════════════════════════════════════════════════


class DecisionEngine:
    """Decide la mejor acción basada en perfil del lead."""

    # Matriz de decisión
    DECISION_MATRIX = [
        # (LS_min, LS_max, sentiment, outcome, action)
        (80, 100, lambda s: s >= 0, "demo_agendada", ActionType.TRIPLE_LOCK),
        (75, 79, lambda s: s >= 0, "demo_agendada", ActionType.TRIPLE_LOCK),
        (70, 79, lambda s: s >= 1, None, ActionType.CALL_24H),
        (65, 69, lambda s: s >= 0, None, ActionType.EMAIL_EDUCATIVO),
        (55, 64, lambda s: s >= -1, None, ActionType.EMAIL_EDUCATIVO),
        (45, 54, lambda s: s >= -1, None, ActionType.NURTURE_SUAVE),
        (35, 44, lambda s: True, None, ActionType.NURTURE_SUAVE),
        (0, 35, lambda s: True, None, ActionType.ARCHIVE),
    ]

    def select_best_action(
        self,
        lead_score: int,
        sentiment: SentimentType,
        outcome: str | None = None,
        objection_type: str | None = None,
    ) -> ActionType:
        """Selecciona la mejor acción según matriz de decisión."""
        sentiment_value = sentiment.value if isinstance(sentiment, SentimentType) else sentiment

        for ls_min, ls_max, sentiment_check, outcome_check, action in self.DECISION_MATRIX:
            if not (ls_min <= lead_score <= ls_max):
                continue

            if not sentiment_check(sentiment_value):
                continue

            if outcome_check is not None and outcome != outcome_check:
                continue

            return action

        # Fallback
        return ActionType.ARCHIVE

    def get_action_reason(
        self,
        action: ActionType,
        lead_score: int,
        sentiment: SentimentType,
        objection_type: str | None = None,
    ) -> str:
        """Genera una razón legible para la acción."""
        reasons = {
            ActionType.TRIPLE_LOCK: f"Lead HOT (LS={lead_score}) con demo agendada. Máxima prioridad.",
            ActionType.CALL_24H: f"Lead CÁLIDO (LS={lead_score}) con interés. Seguimiento inmediato por llamada.",
            ActionType.EMAIL_EDUCATIVO: f"Lead WARM (LS={lead_score}). Enviar contenido educativo."
                                        + (f" (Objeción: {objection_type})" if objection_type else ""),
            ActionType.NURTURE_SUAVE: f"Lead COOL (LS={lead_score}). Secuencia de nurturing sin presión.",
            ActionType.ARCHIVE: f"Lead FRIO (LS={lead_score}). No contactar. Revisar en 60 días.",
        }
        return reasons.get(action, "Acción desconocida")


# ═══════════════════════════════════════════════════════════════════════════
# 3. ACTION SCHEDULER
# ═══════════════════════════════════════════════════════════════════════════


class ActionScheduler:
    """Programa activaciones en la base de datos."""

    async def schedule_triple_lock(
        self,
        lead_id: str,
        demo_date: datetime,
        phone: str | None = None,
        email: str | None = None,
    ) -> list[str]:
        """
        Programa recordatorios Triple Lock.
        Returns: lista de log_ids creados
        """
        from app.crm import postgres_repo

        log_ids = []

        # Email T-3 días
        email_time = demo_date - timedelta(days=3)
        if email:
            log_id = await postgres_repo.create_activation_log(
                lead_id=lead_id,
                action="triple_lock_3d",
                scheduled_at=email_time,
                metadata={
                    "channel": "email",
                    "type": "warmup",
                    "subject": "¡Recordatorio: Tu demo de GestPro en 3 días!",
                    "message": f"Hola, Te recordamos que en 3 días tienes tu demo de GestPro.",
                },
            )
            log_ids.append(log_id)

        # WhatsApp T-1 día
        wa_time = demo_date - timedelta(days=1)
        if phone:
            log_id = await postgres_repo.create_activation_log(
                lead_id=lead_id,
                action="triple_lock_1d",
                scheduled_at=wa_time,
                metadata={
                    "channel": "whatsapp",
                    "type": "confirmation",
                    "phone": phone,
                    "message": f"¡Hola! Mañana a las [HORA] tu demo de GestPro. ¿Confirmas que vas a poder asistir? 👍",
                },
            )
            log_ids.append(log_id)

        # WhatsApp T-1 hora
        wa_time_final = demo_date - timedelta(hours=1)
        if phone:
            log_id = await postgres_repo.create_activation_log(
                lead_id=lead_id,
                action="triple_lock_1h",
                scheduled_at=wa_time_final,
                metadata={
                    "channel": "whatsapp",
                    "type": "final_reminder",
                    "phone": phone,
                    "message": f"¡Hola! En 1 hora comienza tu demo de GestPro. ¿Todo listo? Te espero ahí 🙂",
                },
            )
            log_ids.append(log_id)

        logger.info(f"TRIPLE_LOCK programado para lead {lead_id}: {len(log_ids)} recordatorios")
        return log_ids

    async def schedule_call_24h(
        self,
        lead_id: str,
        phone: str,
        lead_data: dict[str, Any],
    ) -> str:
        """Programa llamada outbound a las 24 horas."""
        from app.crm import postgres_repo

        log_id = await postgres_repo.create_activation_log(
            lead_id=lead_id,
            action="outbound_call_24h",
            scheduled_at=datetime.now() + timedelta(hours=24),
            metadata={
                "channel": "phone",
                "type": "outbound_call",
                "phone": phone,
                "script": "objection_handling",
                "goal": "agendar_demo_o_pasar_humano",
                "lead_score": lead_data.get("lead_score"),
            },
        )
        logger.info(f"CALL_24H programada para lead {lead_id}")
        return log_id

    async def schedule_email_educativo(
        self,
        lead_id: str,
        email: str,
        objection_type: str | None = None,
    ) -> str:
        """Programa email educativo personalizado."""
        from app.crm import postgres_repo

        # Templates por tipo de objeción
        templates = {
            "precio": {
                "subject": "¿Cuánto ahorra realmente con automatización?",
                "body": """Hola,

Entiendo que el precio es un factor importante. Déjame compartir esto:

SCENARIO:
- Tu negocio pierde 5 citas/semana
- Cita promedio: $300
- Pérdida mensual: $6000

CON GESTPRO (€99/mes):
- Recuperas 30% de citas = $1800/mes
- ROI: $1800 vs €99 = 1818% retorno
- Se paga en menos de 1 semana

¿Quieres ver cómo funciona?

Un abrazo,
Mariana — GestPro
""",
            },
            "ocupado": {
                "subject": "Solo 10 minutos — demo express de GestPro",
                "body": """Hola,

Entiendo que estás ocupado. Tengo una solución:

Demo de 10 minutos donde muestro EXACTAMENTE
cómo otros dentistas recuperan citas perdidas.

¿Te queda mejor:
- Martes 3pm
- Jueves 10am
- Viernes 2pm

Escoge y listo.

Un abrazo,
Mariana — GestPro
""",
            },
        }

        template = templates.get(objection_type, templates["precio"])

        log_id = await postgres_repo.create_activation_log(
            lead_id=lead_id,
            action="email_educativo",
            scheduled_at=datetime.now() + timedelta(hours=24),
            metadata={
                "channel": "email",
                "type": "educational",
                "email": email,
                "subject": template["subject"],
                "body": template["body"],
                "objection": objection_type,
            },
        )
        logger.info(f"EMAIL_EDUCATIVO programado para lead {lead_id}")
        return log_id

    async def schedule_nurture_sequence(
        self,
        lead_id: str,
        email: str,
    ) -> list[str]:
        """Programa secuencia de nurturing (3 emails en 3 semanas)."""
        from app.crm import postgres_repo

        emails = [
            {
                "week": 1,
                "subject": "¿Cómo otros dentistas recuperan 30% de citas?",
                "body": "Case study: Consultorio X en CDMX recuperó $18k/mes automatizando recordatorios...",
            },
            {
                "week": 2,
                "subject": "¿Verdad que pierdes citas?",
                "body": "Stats: 1 de cada 3 clientes cancela sin avisar. Pero hay solución...",
            },
            {
                "week": 3,
                "subject": "Última oportunidad: Demo gratis de GestPro",
                "body": "Si algún día quieres explorar, aquí está el link. Te deseo mucho éxito.",
            },
        ]

        log_ids = []
        for email_data in emails:
            log_id = await postgres_repo.create_activation_log(
                lead_id=lead_id,
                action=f"nurture_email_week_{email_data['week']}",
                scheduled_at=datetime.now() + timedelta(weeks=email_data["week"]),
                metadata={
                    "channel": "email",
                    "type": "nurture",
                    "email": email,
                    "subject": email_data["subject"],
                    "body": email_data["body"],
                },
            )
            log_ids.append(log_id)

        logger.info(f"NURTURE_SEQUENCE programada para lead {lead_id}: {len(log_ids)} emails")
        return log_ids

    async def schedule_archive(
        self,
        lead_id: str,
        reason: str = "low_score",
    ) -> None:
        """Marca lead como archivado (no contactar por 60 días)."""
        from app.crm import postgres_repo

        await postgres_repo.update_lead_status(
            lead_id=lead_id,
            status="ARCHIVED",
            archived_until=datetime.now() + timedelta(days=60),
            archived_reason=reason,
        )
        logger.info(f"ARCHIVE: lead {lead_id} no contactar por 60 días (reason: {reason})")


# ═══════════════════════════════════════════════════════════════════════════
# 4. COACHING ORCHESTRATOR (PIPELINE COMPLETO)
# ═══════════════════════════════════════════════════════════════════════════


class CoachingOrchestrator:
    """Orquesta el pipeline completo de coaching post-call."""

    def __init__(self):
        self.calculator = ScoreCalculator()
        self.decision_engine = DecisionEngine()
        self.scheduler = ActionScheduler()

    async def process_post_call(
        self,
        call_context: "CallContext",
        engagement_metrics: EngagementMetrics | None = None,
        objection_metrics: ObjectionMetrics | None = None,
    ) -> CoachingAnalysis:
        """
        Procesa una llamada completada: análisis, scoring, decisión, scheduling.

        Args:
            call_context: CallContext con información de la llamada
            engagement_metrics: Métricas de engagement (opcional, se detecta si no se provee)
            objection_metrics: Métricas de objeciones (opcional)

        Returns:
            CoachingAnalysis con todos los resultados
        """
        logger.info(f"🎯 Iniciando post-call coaching para call_id={call_context.call_id}")

        # PASO 1: Extrae métricas (si no se proveen)
        if engagement_metrics is None:
            engagement_metrics = self._extract_engagement_metrics(call_context)

        if objection_metrics is None:
            objection_metrics = self._extract_objection_metrics(call_context)

        # PASO 2: Calcula scores
        logger.info("📊 Calculando scores...")
        engagement = self.calculator.calculate_engagement(engagement_metrics)
        interest = self.calculator.calculate_interest(call_context.transcript)
        objection = self.calculator.calculate_objection_handling(objection_metrics)
        lead_score = self.calculator.calculate_lead_score(engagement, interest, objection)
        temperature = self.calculator.classify_temperature(lead_score)

        # PASO 3: Analiza sentimiento
        logger.info("😊 Analizando sentimiento...")
        sentiment = self.calculator.calculate_sentiment(
            call_context.transcript,
            engagement,
            interest,
            pain_quantified=self._detect_pain_quantified(call_context),
        )
        frustration = self.calculator.calculate_frustration(call_context.transcript)

        # PASO 4: Calcula P(Close)
        logger.info("🎯 Calculando probabilidad de cierre...")
        ptc = self.calculator.calculate_probability_to_close(
            engagement=engagement,
            interest=interest,
            sentiment=sentiment,
            outcome=call_context.outcome or "completada",
            duration_seconds=call_context.duration_seconds or 0,
        )

        # PASO 5: Decide acción
        logger.info("🚀 Decidiendo próxima acción...")
        action = self.decision_engine.select_best_action(
            lead_score=lead_score,
            sentiment=sentiment,
            outcome=call_context.outcome,
        )
        reason = self.decision_engine.get_action_reason(
            action, lead_score, sentiment,
            objection_type=objection_metrics.total_objections > 0 and "objeción" or None
        )

        # PASO 6: Crea análisis
        analysis = CoachingAnalysis(
            call_id=call_context.call_id,
            lead_id=call_context.lead_id,
            call_date=datetime.now(),
            engagement_score=engagement,
            interest_score=interest,
            objection_handling_score=objection,
            lead_score=lead_score,
            lead_temperature=temperature,
            sentiment=sentiment,
            frustration_level=frustration,
            probability_to_close=ptc,
            pain_points=self._extract_pain_points(call_context),
            objections=self._extract_objections(call_context),
            interest_keywords=self._extract_interest_keywords(call_context),
            recommended_action=action,
            action_reason=reason,
        )

        # PASO 7: Programa acciones
        logger.info(f"💾 Programando acciones ({action.value})...")
        await self._schedule_action(analysis, call_context)

        logger.info(
            f"✅ Post-call completado: LS={lead_score} "
            f"sentiment={sentiment.name} ptc={ptc:.1%} action={action.value}"
        )

        return analysis

    # ─── Métodos privados ───

    def _extract_engagement_metrics(self, ctx: "CallContext") -> EngagementMetrics:
        """Extrae métricas de engagement del contexto."""
        # Contar palabras del prospect
        prospect_words = sum(
            len(t.get("text", "").split())
            for t in ctx.transcript
            if t.get("role") == "prospect"
        )

        # Contar preguntas del prospect
        prospect_text = " ".join(
            t.get("text", "")
            for t in ctx.transcript
            if t.get("role") == "prospect"
        )
        questions = prospect_text.count("?")

        return EngagementMetrics(
            turns=len(ctx.transcript) // 2,
            prospect_words=prospect_words,
            questions=questions,
            interruptions=0,  # Detectar desde VAD
            pain_matches=len(self._extract_pain_points(ctx)),
        )

    def _extract_objection_metrics(self, ctx: "CallContext") -> ObjectionMetrics:
        """Extrae métricas de objeciones del contexto."""
        objections = self._extract_objections(ctx)
        return ObjectionMetrics(
            total_objections=len(objections),
            objections_handled=len(objections),  # Simplificado
            continued_after_rejection=ctx.outcome != "rechazado",
        )

    def _extract_pain_points(self, ctx: "CallContext") -> list[str]:
        """Extrae puntos de dolor mencionados."""
        pain_keywords = [
            "pierde", "pierdo", "pierden", "citas",
            "cancelan", "olvidan", "frustrant", "problema",
            "dolor", "necesit", "urgente", "perdemo"
        ]

        all_text = " ".join(t.get("text", "").lower() for t in ctx.transcript)

        found_pains = []
        if any(kw in all_text for kw in ["pierde", "pierdo", "cancelan"]):
            found_pains.append("pierde_citas_semanales")
        if any(kw in all_text for kw in ["$", "dinero", "costo", "ingresos", "pérdida"]):
            found_pains.append("perdida_monetaria")
        if "frustrat" in all_text:
            found_pains.append("frustacion")

        return found_pains

    def _extract_objections(self, ctx: "CallContext") -> list[str]:
        """Extrae objeciones mencionadas."""
        all_text = " ".join(t.get("text", "").lower() for t in ctx.transcript)

        objections = []
        if any(kw in all_text for kw in ["caro", "costo", "precio", "presupuesto"]):
            objections.append("precio")
        if any(kw in all_text for kw in ["ya usamo", "ya tene", "otro sistema"]):
            objections.append("sistema_existente")
        if any(kw in all_text for kw in ["no decid", "mi jefe", "mi boss"]):
            objections.append("no_decision_maker")
        if any(kw in all_text for kw in ["ocupado", "no tengo tiempo", "luego"]):
            objections.append("falta_tiempo")

        return objections

    def _extract_interest_keywords(self, ctx: "CallContext") -> list[str]:
        """Extrae palabras clave de interés."""
        all_text = " ".join(t.get("text", "").lower() for t in ctx.transcript)

        keywords = []
        if "demo" in all_text or "mostrar" in all_text:
            keywords.append("demo_solicitada")
        if any(kw in all_text for kw in ["precio", "cuánto", "costo"]):
            keywords.append("precio_mencionado")
        if any(kw in all_text for kw in ["interesa", "suena bien", "va", "dale"]):
            keywords.append("interes_verbal")
        if any(kw in all_text for kw in ["hoy", "mañana", "esta semana", "urgente"]):
            keywords.append("urgencia")

        return keywords

    def _detect_pain_quantified(self, ctx: "CallContext") -> bool:
        """Detecta si el prospect cuantificó el dolor ($, %, números)."""
        all_text = " ".join(t.get("text", "") for t in ctx.transcript)

        has_number = any(str(i) in all_text for i in range(10))
        has_money = "$" in all_text or "€" in all_text or "pesos" in all_text
        has_pain_kw = any(kw in all_text.lower() for kw in ["pierde", "perdida", "costo"])

        return has_number and (has_money or has_pain_kw)

    async def _schedule_action(
        self,
        analysis: CoachingAnalysis,
        ctx: "CallContext",
    ) -> None:
        """Programa la acción recomendada."""
        action = analysis.recommended_action

        if action == ActionType.TRIPLE_LOCK:
            demo_date = ctx.demo_scheduled_for or datetime.now() + timedelta(days=3)
            await self.scheduler.schedule_triple_lock(
                lead_id=ctx.lead_id,
                demo_date=demo_date,
                phone=ctx.phone,
                email=ctx.email,
            )

        elif action == ActionType.CALL_24H:
            if ctx.phone:
                await self.scheduler.schedule_call_24h(
                    lead_id=ctx.lead_id,
                    phone=ctx.phone,
                    lead_data={"lead_score": analysis.lead_score},
                )

        elif action == ActionType.EMAIL_EDUCATIVO:
            if ctx.email:
                objection = analysis.objections[0] if analysis.objections else None
                await self.scheduler.schedule_email_educativo(
                    lead_id=ctx.lead_id,
                    email=ctx.email,
                    objection_type=objection,
                )

        elif action == ActionType.NURTURE_SUAVE:
            if ctx.email:
                await self.scheduler.schedule_nurture_sequence(
                    lead_id=ctx.lead_id,
                    email=ctx.email,
                )

        elif action == ActionType.ARCHIVE:
            await self.scheduler.schedule_archive(
                lead_id=ctx.lead_id,
                reason="low_score",
            )


# ═══════════════════════════════════════════════════════════════════════════
# INTERFAZ PÚBLICA
# ═══════════════════════════════════════════════════════════════════════════


# Instancia global
_coaching_orchestrator = CoachingOrchestrator()


async def analyze_post_call(
    call_context: "CallContext",
) -> CoachingAnalysis:
    """
    Interfaz pública: Procesa una llamada completada.

    Uso:
        analysis = await analyze_post_call(call_context)
        print(f"Lead Score: {analysis.lead_score}")
        print(f"Action: {analysis.recommended_action.value}")
    """
    return await _coaching_orchestrator.process_post_call(call_context)
