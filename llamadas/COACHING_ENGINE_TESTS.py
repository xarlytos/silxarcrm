"""
Test Suite para Coaching Engine Post-Call

Valida:
1. Cálculos de scores (E, I, O, LS)
2. Detección de sentimiento
3. Probabilidad Bayesiana
4. Selección de acciones
5. Caso real: Dr. Carlos López
"""

import pytest
from datetime import datetime, timedelta
from COACHING_ENGINE_IMPLEMENTACION import (
    ScoreCalculator,
    DecisionEngine,
    EngagementMetrics,
    ObjectionMetrics,
    InterestSignals,
    SentimentType,
    LeadTemperature,
    ActionType,
)


# ═══════════════════════════════════════════════════════════════════════════
# TEST: Score Calculator
# ═══════════════════════════════════════════════════════════════════════════


class TestScoreCalculator:
    """Tests para cálculo de scores."""

    @pytest.fixture
    def calculator(self):
        return ScoreCalculator()

    def test_engagement_score_basic(self, calculator):
        """Valida cálculo básico de engagement."""
        metrics = EngagementMetrics(
            turns=5,
            prospect_words=85,
            questions=3,
            interruptions=1,
            pain_matches=2,
        )

        score = calculator.calculate_engagement(metrics)

        # Expected: 5×3 + 85×0.1 + 3×2 + 1×1.5 + 2×5 = 41
        expected = min(100, int(15 + 8.5 + 6 + 1.5 + 10))
        assert 39 <= score <= 43, f"Expected ~41, got {score}"

    def test_engagement_score_capping(self, calculator):
        """Valida que engagement capped en 100."""
        metrics = EngagementMetrics(
            turns=100,
            prospect_words=1000,
            questions=50,
            interruptions=10,
            pain_matches=50,
        )

        score = calculator.calculate_engagement(metrics)
        assert score == 100, f"Score should be capped at 100, got {score}"

    def test_interest_signals_detection(self, calculator):
        """Valida detección de señales de interés."""
        transcript = [
            {"role": "prospect", "text": "Me interesa, cuéntame más"},
            {"role": "prospect", "text": "¿Cuánto cuesta?"},
            {"role": "prospect", "text": "Hazme una demo"},
        ]

        score = calculator.calculate_interest(transcript)

        # me interesa(+10) + precio(+8) + demo(+20) ≈ 38
        assert 35 <= score <= 40, f"Expected ~38, got {score}"

    def test_objection_handling_all_handled(self, calculator):
        """Valida puntuación cuando todas las objeciones se manejan."""
        metrics = ObjectionMetrics(
            total_objections=2,
            objections_handled=2,
            continued_after_rejection=True,
        )

        score = calculator.calculate_objection_handling(metrics)

        # (2/2) × 75 + 25 = 100
        assert score == 100, f"Expected 100, got {score}"

    def test_objection_handling_partial(self, calculator):
        """Valida puntuación con manejo parcial."""
        metrics = ObjectionMetrics(
            total_objections=3,
            objections_handled=1,
            continued_after_rejection=False,
        )

        score = calculator.calculate_objection_handling(metrics)

        # (1/3) × 75 + 0 = 25
        expected = int((1/3) * 75)
        assert score == expected, f"Expected ~25, got {score}"

    def test_lead_score_formula(self, calculator):
        """Valida fórmula integrada de LS."""
        # LS = E×0.40 + I×0.35 + O×0.25
        e, i, o = 68, 70, 100
        ls = calculator.calculate_lead_score(e, i, o)

        expected = int((68 * 0.40) + (70 * 0.35) + (100 * 0.25))
        # Expected: 27 + 24 + 25 = 76
        assert 75 <= ls <= 78, f"Expected ~76, got {ls}"

    def test_temperature_classification(self, calculator):
        """Valida clasificación de temperatura."""
        test_cases = [
            (90, LeadTemperature.ULTRA_HOT),
            (75, LeadTemperature.HOT),
            (60, LeadTemperature.WARM),
            (40, LeadTemperature.COOL),
            (20, LeadTemperature.FRIO),
        ]

        for score, expected_temp in test_cases:
            temp = calculator.classify_temperature(score)
            assert temp == expected_temp, f"Score {score}: expected {expected_temp}, got {temp}"

    def test_sentiment_very_positive(self, calculator):
        """Valida detección de sentimiento muy positivo."""
        transcript = [
            {"role": "prospect", "text": "Me encanta perfectamente! Eso es exacto lo que necesito."},
        ]

        sentiment = calculator.calculate_sentiment(transcript, 50, 50)
        assert sentiment in (
            SentimentType.POSITIVO,
            SentimentType.MUY_POSITIVO,
        ), f"Expected positivo, got {sentiment}"

    def test_sentiment_negative(self, calculator):
        """Valida detección de sentimiento negativo."""
        transcript = [
            {"role": "prospect", "text": "No gracias, estoy ocupado, no tengo tiempo."},
        ]

        sentiment = calculator.calculate_sentiment(transcript, 20, 10)
        assert sentiment in (
            SentimentType.NEGATIVO,
            SentimentType.NEUTRO,
        ), f"Expected negativo/neutro, got {sentiment}"

    def test_frustration_detection(self, calculator):
        """Valida detección de frustración."""
        transcript = [
            {"role": "prospect", "text": "Estoy molesto, basta, no me llames más!"},
        ]

        frustration = calculator.calculate_frustration(transcript)
        assert frustration > 5, f"Expected frustration > 5, got {frustration}"

    def test_ptc_hot_lead(self, calculator):
        """Valida P(Close) alto para hot lead."""
        ptc = calculator.calculate_probability_to_close(
            engagement=80,
            interest=75,
            sentiment=SentimentType.POSITIVO,
            outcome="demo_agendada",
            duration_seconds=500,
        )

        assert 0.70 <= ptc <= 1.0, f"Expected high P(Close), got {ptc}"

    def test_ptc_cold_lead(self, calculator):
        """Valida P(Close) bajo para cold lead."""
        ptc = calculator.calculate_probability_to_close(
            engagement=20,
            interest=15,
            sentiment=SentimentType.NEGATIVO,
            outcome="rechazado",
            duration_seconds=60,
        )

        assert 0.0 <= ptc <= 0.20, f"Expected low P(Close), got {ptc}"

    def test_ptc_with_demo_multiplier(self, calculator):
        """Valida que demo agendada multiplica P(Close)."""
        ptc_no_demo = calculator.calculate_probability_to_close(
            engagement=60,
            interest=60,
            sentiment=SentimentType.NEUTRAL,
            outcome="interes",
            duration_seconds=300,
        )

        ptc_demo = calculator.calculate_probability_to_close(
            engagement=60,
            interest=60,
            sentiment=SentimentType.NEUTRAL,
            outcome="demo_agendada",
            duration_seconds=300,
        )

        assert ptc_demo > ptc_no_demo * 1.5, f"Demo should multiply P(Close)"


# ═══════════════════════════════════════════════════════════════════════════
# TEST: Decision Engine
# ═══════════════════════════════════════════════════════════════════════════


class TestDecisionEngine:
    """Tests para decision engine."""

    @pytest.fixture
    def engine(self):
        return DecisionEngine()

    def test_action_ultra_hot_demo(self, engine):
        """Valida acción para lead ULTRA_HOT con demo."""
        action = engine.select_best_action(
            lead_score=85,
            sentiment=SentimentType.MUY_POSITIVO,
            outcome="demo_agendada",
        )

        assert action == ActionType.TRIPLE_LOCK, f"Expected TRIPLE_LOCK, got {action}"

    def test_action_hot_without_demo(self, engine):
        """Valida acción para lead HOT sin demo."""
        action = engine.select_best_action(
            lead_score=72,
            sentiment=SentimentType.POSITIVO,
            outcome=None,
        )

        assert action == ActionType.CALL_24H, f"Expected CALL_24H, got {action}"

    def test_action_warm(self, engine):
        """Valida acción para lead WARM."""
        action = engine.select_best_action(
            lead_score=60,
            sentiment=SentimentType.NEUTRO,
            outcome=None,
        )

        assert action == ActionType.EMAIL_EDUCATIVO, f"Expected EMAIL_EDUCATIVO, got {action}"

    def test_action_cool(self, engine):
        """Valida acción para lead COOL."""
        action = engine.select_best_action(
            lead_score=40,
            sentiment=SentimentType.NEGATIVO,
            outcome=None,
        )

        assert action == ActionType.NURTURE_SUAVE, f"Expected NURTURE_SUAVE, got {action}"

    def test_action_frio(self, engine):
        """Valida acción para lead FRIO."""
        action = engine.select_best_action(
            lead_score=20,
            sentiment=SentimentType.MUY_NEGATIVO,
            outcome="rechazado",
        )

        assert action == ActionType.ARCHIVE, f"Expected ARCHIVE, got {action}"

    def test_action_reason_generation(self, engine):
        """Valida generación de razones."""
        reason = engine.get_action_reason(
            ActionType.TRIPLE_LOCK,
            lead_score=80,
            sentiment=SentimentType.POSITIVO,
        )

        assert "HOT" in reason, f"Reason should mention lead temperature"
        assert "demo" in reason.lower(), f"Reason should mention demo"


# ═══════════════════════════════════════════════════════════════════════════
# TEST: Caso Real - Dr. Carlos López
# ═══════════════════════════════════════════════════════════════════════════


class TestDrCarlosLopez:
    """Test del caso real: Dr. Carlos López, Consultorio Sonrisa Blanca."""

    @pytest.fixture
    def calculator(self):
        return ScoreCalculator()

    @pytest.fixture
    def decision_engine(self):
        return DecisionEngine()

    @pytest.fixture
    def transcript(self):
        """Transcript real de la llamada."""
        return [
            {
                "role": "agent",
                "text": "¡Hola! ¿Hablo con Carlos?",
            },
            {
                "role": "prospect",
                "text": "Sí, dime.",
            },
            {
                "role": "agent",
                "text": "Oye, te agarro en buen momento? Son 2 minutos.",
            },
            {
                "role": "prospect",
                "text": "Sí, claro, adelante, dime.",
            },
            {
                "role": "agent",
                "text": "Perfecto. Mira, yo soy Mariana de GestPro. Te llamo porque la mayoría de dentistas pierden entre 5 y 7 citas a la semana por olvidos. ¿Es tu caso?",
            },
            {
                "role": "prospect",
                "text": "Sí, la verdad es que sí. Pierdo citas... capaz no 7, pero 4 o 5 a la semana es fijo. Es frustrante.",
            },
            {
                "role": "agent",
                "text": "Vaya. ¿Y eso cuánta pérdida te representa al mes?",
            },
            {
                "role": "prospect",
                "text": "Oof, mira... una cita con nosotros, bueno, la mayoría son limpiezas, eso vale $50 USD. Entonces $50 × 5 citas = $250 a la semana, $1000 al mes. Es bastante para la dentistería pequeña.",
            },
            {
                "role": "agent",
                "text": "Eso es interesante, porque hay una solución. GestPro automatiza los recordatorios por WhatsApp, SMS y email. Muchos clientes dicen que recuperan 30% de esas citas perdidas.",
            },
            {
                "role": "prospect",
                "text": "Hmm, suena bien. ¿Y cómo funciona exactamente?",
            },
            {
                "role": "agent",
                "text": "Es simple. Nosotros integramos con tu agenda, y 3 días, 1 día y 1 hora antes de la cita, mandamos recordatorios automáticos. El paciente confirma o reprograma desde WhatsApp.",
            },
            {
                "role": "prospect",
                "text": "Interesante. ¿Y cuánto cuesta?",
            },
            {
                "role": "agent",
                "text": "Tenemos tres planes: Básico €49/mes para hasta 100 pacientes, Profesional €99/mes para hasta 500, y Premium €199/mes con soporte prioritario. La mayoría de dentistas como tú están en el Profesional.",
            },
            {
                "role": "prospect",
                "text": "€99 no está mal. ¿Cuánto tiempo tarda el setup?",
            },
            {
                "role": "agent",
                "text": "Setup son 30 minutos. Nosotros hacemos todo. Después tú solo configuras qué dice el recordatorio.",
            },
            {
                "role": "prospect",
                "text": "Dale, me interesa. ¿Cómo agendamos una demo?",
            },
            {
                "role": "agent",
                "text": "Perfecto. Te dejo una demo de 15 minutos donde vemos exactamente cómo funciona en tiempo real. ¿Te queda bien el miércoles 25 a las 3 de la tarde?",
            },
            {
                "role": "prospect",
                "text": "Miércoles a las 3... sí, me queda bien. Apunta.",
            },
            {
                "role": "agent",
                "text": "Anotado. Te envío un WhatsApp con el link de la videollamada. ¿Está este número?",
            },
            {
                "role": "prospect",
                "text": "Sí, perfectamente.",
            },
            {
                "role": "agent",
                "text": "Dale, nos vemos el miércoles. ¡Que tengas un excelente día!",
            },
            {
                "role": "prospect",
                "text": "Tú también, gracias!",
            },
        ]

    def test_engagement_score(self, calculator, transcript):
        """Valida engagement score del Dr. Carlos."""
        # Contar de verdad
        turns = len([t for t in transcript if t["role"] == "prospect"])
        prospect_words = sum(
            len(t["text"].split()) for t in transcript if t["role"] == "prospect"
        )
        questions = sum(
            t["text"].count("?") for t in transcript if t["role"] == "prospect"
        )

        metrics = EngagementMetrics(
            turns=turns,
            prospect_words=prospect_words,
            questions=questions,
            interruptions=0,
            pain_matches=2,  # "pierde citas", "frustrante"
        )

        score = calculator.calculate_engagement(metrics)
        print(f"Engagement: {score}")

        # Expected: ~65-75
        assert 60 <= score <= 80, f"Expected ~68, got {score}"

    def test_interest_score(self, calculator, transcript):
        """Valida interest score del Dr. Carlos."""
        score = calculator.calculate_interest(transcript)
        print(f"Interest: {score}")

        # Expected: ~60-75
        assert 55 <= score <= 80, f"Expected ~70, got {score}"

    def test_objection_handling_score(self, calculator):
        """Valida objection handling del Dr. Carlos."""
        metrics = ObjectionMetrics(
            total_objections=0,  # No hubo objeciones reales
            objections_handled=0,
            continued_after_rejection=True,
        )

        score = calculator.calculate_objection_handling(metrics)
        print(f"Objection Handling: {score}")

        # Sin objeciones pero continuó interesado
        assert score > 50, f"Expected decent score, got {score}"

    def test_lead_score_integrated(self, calculator, transcript):
        """Valida LS integrado."""
        # Engagement
        turns = len([t for t in transcript if t["role"] == "prospect"])
        prospect_words = sum(
            len(t["text"].split()) for t in transcript if t["role"] == "prospect"
        )
        questions = sum(
            t["text"].count("?") for t in transcript if t["role"] == "prospect"
        )

        eng_metrics = EngagementMetrics(
            turns=turns,
            prospect_words=prospect_words,
            questions=questions,
            interruptions=0,
            pain_matches=2,
        )

        # Scores
        engagement = calculator.calculate_engagement(eng_metrics)
        interest = calculator.calculate_interest(transcript)
        objection = calculator.calculate_objection_handling(
            ObjectionMetrics(total_objections=0, objections_handled=0, continued_after_rejection=True)
        )

        # LS
        ls = calculator.calculate_lead_score(engagement, interest, objection)
        print(f"Lead Score: {ls} (E={engagement}, I={interest}, O={objection})")

        # Expected: ~76
        assert 70 <= ls <= 85, f"Expected ~76, got {ls}"

    def test_sentiment(self, calculator, transcript):
        """Valida sentimiento del Dr. Carlos."""
        sentiment = calculator.calculate_sentiment(transcript, 68, 70, pain_quantified=True)
        print(f"Sentiment: {sentiment}")

        # Expected: POSITIVO
        assert sentiment in (
            SentimentType.POSITIVO,
            SentimentType.MUY_POSITIVO,
        ), f"Expected positivo, got {sentiment}"

    def test_ptc(self, calculator):
        """Valida P(Close) del Dr. Carlos."""
        ptc = calculator.calculate_probability_to_close(
            engagement=68,
            interest=70,
            sentiment=SentimentType.POSITIVO,
            outcome="demo_agendada",
            duration_seconds=442,  # 7m 20s
        )
        print(f"P(Close): {ptc:.1%}")

        # Expected: ~95%
        assert 0.85 <= ptc <= 1.0, f"Expected ~0.95, got {ptc}"

    def test_recommended_action(self, decision_engine):
        """Valida acción recomendada."""
        action = decision_engine.select_best_action(
            lead_score=76,
            sentiment=SentimentType.POSITIVO,
            outcome="demo_agendada",
        )
        print(f"Action: {action.value}")

        # Expected: TRIPLE_LOCK
        assert action == ActionType.TRIPLE_LOCK, f"Expected TRIPLE_LOCK, got {action}"

    def test_full_scenario(self, calculator, decision_engine, transcript):
        """Test completo del Dr. Carlos López."""
        # Calcs
        turns = len([t for t in transcript if t["role"] == "prospect"])
        prospect_words = sum(
            len(t["text"].split()) for t in transcript if t["role"] == "prospect"
        )
        questions = sum(
            t["text"].count("?") for t in transcript if t["role"] == "prospect"
        )

        engagement = calculator.calculate_engagement(
            EngagementMetrics(
                turns=turns,
                prospect_words=prospect_words,
                questions=questions,
                interruptions=0,
                pain_matches=2,
            )
        )

        interest = calculator.calculate_interest(transcript)

        objection = calculator.calculate_objection_handling(
            ObjectionMetrics(
                total_objections=0,
                objections_handled=0,
                continued_after_rejection=True,
            )
        )

        lead_score = calculator.calculate_lead_score(engagement, interest, objection)
        temperature = calculator.classify_temperature(lead_score)

        sentiment = calculator.calculate_sentiment(transcript, engagement, interest, pain_quantified=True)
        frustration = calculator.calculate_frustration(transcript)

        ptc = calculator.calculate_probability_to_close(
            engagement=engagement,
            interest=interest,
            sentiment=sentiment,
            outcome="demo_agendada",
            duration_seconds=442,
        )

        action = decision_engine.select_best_action(
            lead_score=lead_score,
            sentiment=sentiment,
            outcome="demo_agendada",
        )

        # Assertions
        print(f"\n╔════════════════════════════════════════╗")
        print(f"║  DR. CARLOS LÓPEZ — FULL ANALYSIS      ║")
        print(f"╠════════════════════════════════════════╣")
        print(f"║ Engagement:       {engagement:3d}/100         ║")
        print(f"║ Interest:         {interest:3d}/100         ║")
        print(f"║ Objection:        {objection:3d}/100         ║")
        print(f"║ Lead Score:       {lead_score:3d}/100  ({temperature.value})   ║")
        print(f"║ Sentiment:        {sentiment.name:15s}  ║")
        print(f"║ Frustration:      {frustration:3d}/10          ║")
        print(f"║ P(Close):         {ptc*100:5.1f}%        ║")
        print(f"║ Action:           {action.value:15s}  ║")
        print(f"╚════════════════════════════════════════╝\n")

        assert 70 <= lead_score <= 85
        assert temperature == LeadTemperature.HOT
        assert sentiment == SentimentType.POSITIVO
        assert 0.85 <= ptc <= 1.0
        assert action == ActionType.TRIPLE_LOCK


if __name__ == "__main__":
    pytest.main([__file__, "-v", "-s"])
