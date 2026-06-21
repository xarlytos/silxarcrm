"""MEJORA 3: Coaching Automático - Post-call analysis y next actions"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from enum import Enum
from datetime import datetime, timedelta

logger = logging.getLogger(__name__)


class LeadScoreLevel(Enum):
    COLD = "cold"      # 0-30
    WARM = "warm"      # 30-70
    HOT = "hot"        # 70+


@dataclass
class LeadScore:
    """Score del prospect después de llamada"""
    score: int  # 0-100
    confidence: float  # 0-1: cuán seguro estamos
    level: LeadScoreLevel
    components: dict  # breakdown por factor


@dataclass
class NextAction:
    """Acción automática post-llamada"""
    channel: str  # "llamada", "whatsapp", "email", "sms", "none"
    timing_hours: int  # Cuándo contactar
    priority: str  # "HIGH", "MEDIUM", "LOW", "NONE"
    message_template: str  # Qué enviar
    follow_up_type: str  # "demo", "objection_handling", "nurturing", etc


@dataclass
class PostCallAnalysis:
    """Análisis completo post-llamada"""
    call_id: str
    lead_score: LeadScore
    sentiment: str  # "muy_negativo", "negativo", "neutral", "positivo", "muy_positivo"
    probability_to_close: float  # 0-1 (pero honesto: basado en score + sentiment, no inventado)
    next_action: NextAction
    timestamp: datetime = None


class CoachingEngine:
    """Engine de análisis post-llamada y automatización de acciones"""

    def __init__(self, db_client):
        self.db = db_client

    async def analyze_call(
        self,
        call_id: str,
        transcript: str,
        outcome: str  # "cierre", "reagendar", "no_interesado", "en_progreso"
    ) -> PostCallAnalysis:
        """Análisis completo de una llamada"""

        # 1. Calcular lead score
        lead_score = await self._calculate_lead_score(transcript)

        # 2. Detectar sentimiento
        sentiment = await self._analyze_sentiment(transcript)

        # 3. Calcular probabilidad de cierre (honesta)
        prob_to_close = self._calculate_probability(lead_score, sentiment)

        # 4. Decidir próxima acción
        next_action = self._determine_next_action(lead_score, sentiment, prob_to_close)

        analysis = PostCallAnalysis(
            call_id=call_id,
            lead_score=lead_score,
            sentiment=sentiment,
            probability_to_close=prob_to_close,
            next_action=next_action,
            timestamp=datetime.now()
        )

        logger.info(
            f"Call {call_id}: score={lead_score.score}, "
            f"sentiment={sentiment}, next_action={next_action.channel}"
        )

        return analysis

    async def _calculate_lead_score(self, transcript: str) -> LeadScore:
        """Calcular lead score con breakdown de componentes"""

        score = 0
        components = {}
        confidence = 0
        num_factors = 0

        # Factor 1: ENGAGEMENT (cuánto habló el prospect)
        engagement_score = self._score_engagement(transcript)
        score += engagement_score
        components["engagement"] = engagement_score
        confidence += 0.9 if engagement_score > 20 else 0.3
        num_factors += 1

        # Factor 2: INTEREST SIGNALS
        interest_score = self._score_interest_signals(transcript)
        score += interest_score
        components["interest_signals"] = interest_score
        confidence += 0.85 if interest_score > 25 else 0.2
        num_factors += 1

        # Factor 3: OBJECTION HANDLING
        objection_score = self._score_objection_handling(transcript)
        score += objection_score
        components["objection_handling"] = objection_score
        confidence += 0.8 if objection_score > 15 else 0.3
        num_factors += 1

        # Factor 4: COMMITMENT
        commitment_score = self._score_commitment(transcript)
        score += commitment_score
        components["commitment"] = commitment_score
        confidence += 0.9 if commitment_score > 5 else 0.2
        num_factors += 1

        # Normalizar confianza
        avg_confidence = confidence / num_factors if num_factors > 0 else 0

        # Determinar nivel
        if score >= 70:
            level = LeadScoreLevel.HOT
        elif score >= 30:
            level = LeadScoreLevel.WARM
        else:
            level = LeadScoreLevel.COLD

        return LeadScore(
            score=min(score, 100),
            confidence=avg_confidence,
            level=level,
            components=components
        )

    def _score_engagement(self, transcript: str) -> int:
        """Prospect habló mucho = interés"""
        # Simplificado: contar palabras del prospect
        prospect_words = len(transcript.split())  # TODO: Parse real transcript
        if prospect_words > 1000:
            return 30
        elif prospect_words > 500:
            return 20
        else:
            return 5

    def _score_interest_signals(self, transcript: str) -> int:
        """Palabras/frases de interés"""
        interest_keywords = [
            "me interesa", "cuándo", "cómo funciona",
            "cuál es el precio", "demostración", "próximos pasos"
        ]
        count = sum(1 for kw in interest_keywords if kw in transcript.lower())
        return min(count * 10, 40)

    def _score_objection_handling(self, transcript: str) -> int:
        """¿Se superaron objeciones?"""
        objections = sum(1 for word in ["pero", "sin embargo", "es caro"] if word in transcript.lower())
        if objections == 0:
            return 20
        # Simplificado: asumir que si hay objeciones pero sigue hablando, se superaron
        return 15 if objections < 3 else 5

    def _score_commitment(self, transcript: str) -> int:
        """¿Se comprometió a próximo paso?"""
        commitment_signals = ["vamos", "adelante", "ok", "perfecto", "demostración"]
        if any(sig in transcript.lower() for sig in commitment_signals):
            return 10
        return 0

    async def _analyze_sentiment(self, transcript: str) -> str:
        """Analizar sentimiento del prospect"""
        # TODO: Implementar con Gemini
        # Simplificado para ahora
        if "me encanta" in transcript.lower() or "perfecto" in transcript.lower():
            return "muy_positivo"
        elif "me interesa" in transcript.lower():
            return "positivo"
        elif "no sé" in transcript.lower() or "mmm" in transcript.lower():
            return "negativo"
        else:
            return "neutral"

    def _calculate_probability(self, lead_score: LeadScore, sentiment: str) -> float:
        """Probabilidad honesta basada en score + sentiment"""

        base_rate = 0.25  # 25% baseline

        # Multiplicador por lead score (0.3x - 2.0x)
        score_mult = 0.3 + (lead_score.score / 100) * 1.7

        # Multiplicador por sentimiento
        sentiment_mult = {
            "muy_negativo": 0.3,
            "negativo": 0.6,
            "neutral": 1.0,
            "positivo": 1.3,
            "muy_positivo": 1.5,
        }.get(sentiment, 1.0)

        probability = base_rate * score_mult * sentiment_mult

        # Aplicar confianza (si no estamos seguros, bajar probabilidad)
        probability = probability * lead_score.confidence

        return min(0.99, max(0.01, probability))

    def _determine_next_action(
        self,
        lead_score: LeadScore,
        sentiment: str,
        probability: float
    ) -> NextAction:
        """Decidir próxima acción automáticamente"""

        if lead_score.level == LeadScoreLevel.HOT and probability >= 0.5:
            return NextAction(
                channel="llamada",
                timing_hours=24,
                priority="HIGH",
                message_template="demo_intro",
                follow_up_type="demo"
            )

        elif lead_score.level == LeadScoreLevel.WARM:
            return NextAction(
                channel="whatsapp",
                timing_hours=24,
                priority="MEDIUM",
                message_template="objection_handling",
                follow_up_type="follow_up"
            )

        elif lead_score.level == LeadScoreLevel.COLD:
            return NextAction(
                channel="email",
                timing_hours=72,
                priority="LOW",
                message_template="nurturing",
                follow_up_type="nurturing"
            )

        else:
            return NextAction(
                channel="none",
                timing_hours=720,
                priority="NONE",
                message_template="",
                follow_up_type="none"
            )

    async def execute_next_action(
        self,
        prospect_id: str,
        next_action: NextAction
    ) -> bool:
        """Ejecutar acción automáticamente"""

        if next_action.channel == "none":
            return True  # No hacer nada

        scheduled_time = datetime.now() + timedelta(hours=next_action.timing_hours)

        logger.info(
            f"Scheduling {next_action.channel} for {prospect_id} "
            f"at {scheduled_time} (priority: {next_action.priority})"
        )

        # TODO: Implementar scheduling en BD
        # Por ahora solo loguear

        return True
