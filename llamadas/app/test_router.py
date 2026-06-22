"""Tests for PipelineRouter - intent detection, pipeline selection, metrics."""

import asyncio
import pytest
from datetime import datetime

from router import (
    PipelineRouter,
    Intent,
    Pipeline,
    RoutingDecision,
    RouterConfig,
    IntentDetector,
    PipelineSelector,
    IntentMatch,
    RouteMetrics,
)


# ═══ INTENT DETECTION TESTS ═══

class TestIntentDetector:
    """Test intent detection with keyword matching."""

    @pytest.fixture
    def detector(self):
        config = RouterConfig()
        return IntentDetector(config)

    def test_budget_intent_presupuesto(self, detector):
        """Detect budget intent from 'presupuesto' keyword."""
        intent_match = detector.detect("¿Cuál es vuestro presupuesto?")
        assert intent_match.intent == Intent.BUDGET_ASK
        assert intent_match.confidence >= 0.85
        assert len(intent_match.keywords_matched) > 0

    def test_budget_intent_precio(self, detector):
        """Detect budget intent from 'precio' keyword."""
        intent_match = detector.detect("¿Cuál es el precio del servicio?")
        assert intent_match.intent == Intent.BUDGET_ASK
        assert intent_match.confidence >= 0.85

    def test_budget_intent_cuanto_cuesta(self, detector):
        """Detect budget intent from 'cuanto cuesta' phrase."""
        intent_match = detector.detect("¿Cuánto cuesta tu solución?")
        assert intent_match.intent == Intent.BUDGET_ASK
        assert intent_match.confidence >= 0.85

    def test_objection_intent_caro(self, detector):
        """Detect objection from 'caro' keyword."""
        intent_match = detector.detect("Me parece muy caro")
        assert intent_match.intent == Intent.OBJECTION
        assert intent_match.confidence >= 0.85

    def test_objection_intent_competencia(self, detector):
        """Detect objection from 'competencia' keyword."""
        intent_match = detector.detect("¿Cómo se compara con la competencia?")
        assert intent_match.intent == Intent.OBJECTION
        assert intent_match.confidence >= 0.85

    def test_timeline_intent_cuando(self, detector):
        """Detect timeline intent from 'cuándo' keyword."""
        intent_match = detector.detect("¿Cuándo puedo empezar?")
        assert intent_match.intent == Intent.TIMELINE
        assert intent_match.confidence >= 0.85

    def test_timeline_intent_urgente(self, detector):
        """Detect timeline intent from 'urgente' keyword."""
        intent_match = detector.detect("Necesito una solución urgente")
        assert intent_match.intent == Intent.TIMELINE
        assert intent_match.confidence >= 0.85

    def test_timeline_intent_demo(self, detector):
        """Detect timeline intent from 'demo' keyword."""
        intent_match = detector.detect("¿Puedo ver una demo?")
        assert intent_match.intent == Intent.TIMELINE
        assert intent_match.confidence >= 0.85

    def test_negotiation_intent_descuento(self, detector):
        """Detect negotiation intent from 'descuento' keyword."""
        intent_match = detector.detect("¿Hay descuento disponible?")
        assert intent_match.intent == Intent.NEGOTIATION
        assert intent_match.confidence >= 0.85

    def test_strategy_intent_comparar(self, detector):
        """Detect strategy intent from 'comparar' keyword."""
        intent_match = detector.detect("¿Cómo se compara tu ROI?")
        assert intent_match.intent == Intent.STRATEGY
        assert intent_match.confidence >= 0.85

    def test_unknown_intent_generic(self, detector):
        """Unknown intent for generic conversation."""
        intent_match = detector.detect("Hola, cómo estás?")
        assert intent_match.intent == Intent.UNKNOWN
        assert intent_match.confidence < 0.6

    def test_intent_case_insensitive(self, detector):
        """Intent detection is case-insensitive."""
        intent_match1 = detector.detect("PRESUPUESTO")
        intent_match2 = detector.detect("presupuesto")
        assert intent_match1.intent == intent_match2.intent

    def test_intent_with_whitespace(self, detector):
        """Handle leading/trailing whitespace."""
        intent_match = detector.detect("  ¿Cuál es el precio?  ")
        assert intent_match.intent == Intent.BUDGET_ASK

    def test_message_excerpt_truncation(self, detector):
        """Message excerpt truncated to 100 chars."""
        long_message = "x" * 150
        intent_match = detector.detect(long_message)
        assert len(intent_match.message_excerpt) <= 103  # 100 + "..."


# ═══ PIPELINE SELECTION TESTS ═══

class TestPipelineSelector:
    """Test pipeline selection logic."""

    @pytest.fixture
    def selector(self):
        config = RouterConfig(use_hybrid_routing=False)
        return PipelineSelector(config)

    @pytest.fixture
    def hybrid_selector(self):
        config = RouterConfig(use_hybrid_routing=True, groq_traffic_percentage=70)
        return PipelineSelector(config)

    def test_budget_intent_routes_to_groq(self, selector):
        """Budget intent routes to Groq."""
        pipeline, reason = selector.select(Intent.BUDGET_ASK, 0.9)
        assert pipeline == Pipeline.GROQ
        assert reason == RoutingDecision.INTENT_MATCH

    def test_timeline_intent_routes_to_groq(self, selector):
        """Timeline intent routes to Groq."""
        pipeline, reason = selector.select(Intent.TIMELINE, 0.9)
        assert pipeline == Pipeline.GROQ
        assert reason == RoutingDecision.INTENT_MATCH

    def test_objection_intent_routes_to_gemini(self, selector):
        """Objection intent routes to Gemini."""
        pipeline, reason = selector.select(Intent.OBJECTION, 0.9)
        assert pipeline == Pipeline.GEMINI
        assert reason == RoutingDecision.INTENT_MATCH

    def test_negotiation_intent_routes_to_gemini(self, selector):
        """Negotiation intent routes to Gemini."""
        pipeline, reason = selector.select(Intent.NEGOTIATION, 0.9)
        assert pipeline == Pipeline.GEMINI
        assert reason == RoutingDecision.INTENT_MATCH

    def test_unknown_intent_routes_to_groq(self, selector):
        """Unknown intent defaults to Groq."""
        pipeline, reason = selector.select(Intent.UNKNOWN, 0.3)
        assert pipeline == Pipeline.GROQ
        assert reason == RoutingDecision.INTENT_MATCH

    def test_hybrid_routing_groq_percentage(self, hybrid_selector):
        """Hybrid routing respects traffic percentage (70% Groq)."""
        groq_count = 0
        gemini_count = 0

        for i in range(100):
            pipeline, _ = hybrid_selector.select(Intent.BUDGET_ASK, 0.9, user_id_hash=str(i))
            if pipeline == Pipeline.GROQ:
                groq_count += 1
            else:
                gemini_count += 1

        # Should approximate 70/30 split
        assert groq_count >= 65  # Allow ±5% variance
        assert gemini_count <= 35

    def test_hybrid_routing_deterministic_user_hash(self, hybrid_selector):
        """Hybrid routing is deterministic per user_id."""
        pipeline1, _ = hybrid_selector.select(Intent.BUDGET_ASK, 0.9, user_id_hash="user_123")
        pipeline2, _ = hybrid_selector.select(Intent.BUDGET_ASK, 0.9, user_id_hash="user_123")
        assert pipeline1 == pipeline2  # Same user always gets same pipeline

    def test_complex_intent_ignores_traffic_percentage(self, hybrid_selector):
        """Complex intents always go to Gemini, ignoring traffic %."""
        pipeline, reason = hybrid_selector.select(Intent.OBJECTION, 0.9)
        assert pipeline == Pipeline.GEMINI
        assert reason == RoutingDecision.INTENT_MATCH


# ═══ MAIN ROUTER TESTS ═══

class TestPipelineRouter:
    """Test main router orchestration."""

    @pytest.fixture
    def router(self):
        config = RouterConfig(
            use_hybrid_routing=True,
            groq_traffic_percentage=70,
            fallback_to_gemini=True,
            enable_metrics=True,
        )
        return PipelineRouter(config)

    @pytest.mark.asyncio
    async def test_route_to_pipeline_budget_intent(self, router):
        """Route message with budget intent."""
        result = await router.route_to_pipeline("¿Cuál es vuestro presupuesto?")
        assert result in ["groq", "gemini"]  # Hybrid, so both possible

    @pytest.mark.asyncio
    async def test_route_to_pipeline_objection_intent(self, router):
        """Route message with objection intent to Gemini."""
        result = await router.route_to_pipeline("Me parece muy caro")
        assert result == "gemini"

    @pytest.mark.asyncio
    async def test_route_with_context_user_id(self, router):
        """Route with user_id context for deterministic allocation."""
        result1 = await router.route_to_pipeline(
            "¿Cuál es vuestro presupuesto?",
            context={"user_id": "user_123"}
        )
        result2 = await router.route_to_pipeline(
            "¿Cuál es vuestro presupuesto?",
            context={"user_id": "user_123"}
        )
        assert result1 == result2

    @pytest.mark.asyncio
    async def test_route_with_groq_rate_limit(self, router):
        """Fallback to Gemini when Groq is rate-limited."""
        result = await router.route_to_pipeline(
            "¿Cuál es vuestro presupuesto?",
            context={"groq_rate_limited": True}
        )
        assert result == "gemini"

    @pytest.mark.asyncio
    async def test_route_with_both_rate_limited_raises(self, router):
        """Raise error when both pipelines are rate-limited."""
        with pytest.raises(ValueError):
            await router.route_to_pipeline(
                "¿Cuál es vuestro presupuesto?",
                context={
                    "groq_rate_limited": True,
                    "gemini_rate_limited": True,
                }
            )

    @pytest.mark.asyncio
    async def test_metrics_recorded(self, router):
        """Metrics are recorded for each route."""
        await router.route_to_pipeline("¿Cuándo puedo empezar?")
        metrics = router.get_metrics()
        assert len(metrics) == 1
        assert metrics[0]["detected_intent"] == "timeline"
        assert metrics[0]["selected_pipeline"] in ["groq", "gemini"]

    @pytest.mark.asyncio
    async def test_metrics_buffer_overflow(self, router):
        """Metrics buffer removes oldest when full."""
        config = RouterConfig(metrics_buffer_size=5)
        small_router = PipelineRouter(config)

        for i in range(10):
            await small_router.route_to_pipeline(f"Message {i}")

        metrics = small_router.get_metrics()
        assert len(metrics) == 5  # Buffer limited to 5

    def test_get_metrics_with_filters(self, router):
        """Get metrics with optional filters."""
        router.metrics_buffer = [
            RouteMetrics(
                timestamp=datetime.now(),
                user_message="Message 1",
                detected_intent=Intent.BUDGET_ASK,
                intent_confidence=0.9,
                selected_pipeline=Pipeline.GROQ,
                routing_reason=RoutingDecision.INTENT_MATCH,
                latency_ms=10.0,
            ),
            RouteMetrics(
                timestamp=datetime.now(),
                user_message="Message 2",
                detected_intent=Intent.OBJECTION,
                intent_confidence=0.85,
                selected_pipeline=Pipeline.GEMINI,
                routing_reason=RoutingDecision.INTENT_MATCH,
                latency_ms=15.0,
            ),
        ]

        all_metrics = router.get_metrics()
        assert len(all_metrics) == 2

        budget_metrics = router.get_metrics(intent_filter=Intent.BUDGET_ASK)
        assert len(budget_metrics) == 1
        assert budget_metrics[0]["detected_intent"] == "budget_ask"

        objection_metrics = router.get_metrics(intent_filter=Intent.OBJECTION)
        assert len(objection_metrics) == 1
        assert objection_metrics[0]["detected_intent"] == "objection"

    def test_get_stats(self, router):
        """Get high-level routing statistics."""
        router.metrics_buffer = [
            RouteMetrics(
                timestamp=datetime.now(),
                user_message="Message 1",
                detected_intent=Intent.BUDGET_ASK,
                intent_confidence=0.9,
                selected_pipeline=Pipeline.GROQ,
                routing_reason=RoutingDecision.INTENT_MATCH,
                latency_ms=10.0,
            ),
            RouteMetrics(
                timestamp=datetime.now(),
                user_message="Message 2",
                detected_intent=Intent.OBJECTION,
                intent_confidence=0.85,
                selected_pipeline=Pipeline.GEMINI,
                routing_reason=RoutingDecision.INTENT_MATCH,
                latency_ms=20.0,
            ),
            RouteMetrics(
                timestamp=datetime.now(),
                user_message="Message 3",
                detected_intent=Intent.TIMELINE,
                intent_confidence=0.88,
                selected_pipeline=Pipeline.GROQ,
                routing_reason=RoutingDecision.FALLBACK,
                latency_ms=25.0,
                fallback_triggered=True,
                fallback_from=Pipeline.GEMINI,
            ),
        ]

        stats = router.get_stats()
        assert stats["total_routes"] == 3
        assert stats["pipeline_distribution"]["groq"]["count"] == 2
        assert stats["pipeline_distribution"]["gemini"]["count"] == 1
        assert stats["intent_distribution"]["budget_ask"]["count"] == 1
        assert stats["fallback_count"] == 1
        assert stats["fallback_rate"] == 33.3
        assert stats["latency_stats_ms"]["avg"] == 15.0
        assert stats["latency_stats_ms"]["max"] == 25.0

    def test_rate_limit_status_update(self, router):
        """Update rate-limit status."""
        router.set_rate_limit_status(Pipeline.GROQ, True)
        assert router._groq_rate_limited is True

        router.set_rate_limit_status(Pipeline.GEMINI, True)
        assert router._gemini_rate_limited is True

        router.set_rate_limit_status(Pipeline.GROQ, False)
        assert router._groq_rate_limited is False


# ═══ CONFIG TESTS ═══

class TestRouterConfig:
    """Test configuration."""

    def test_default_config(self):
        """Default config values."""
        config = RouterConfig()
        assert config.use_hybrid_routing is True
        assert config.groq_traffic_percentage == 70
        assert config.fallback_to_gemini is True
        assert config.min_intent_confidence == 0.6

    def test_custom_config(self):
        """Custom config values."""
        config = RouterConfig(
            use_hybrid_routing=False,
            groq_traffic_percentage=50,
            fallback_to_gemini=False,
            enable_latency_alerts=False,
        )
        assert config.use_hybrid_routing is False
        assert config.groq_traffic_percentage == 50
        assert config.fallback_to_gemini is False
        assert config.enable_latency_alerts is False


# ═══ INTEGRATION TESTS ═══

class TestIntegration:
    """End-to-end integration tests."""

    @pytest.mark.asyncio
    async def test_full_routing_flow_budget(self):
        """Full flow: message → intent → pipeline."""
        router = PipelineRouter(RouterConfig(use_hybrid_routing=False))
        result = await router.route_to_pipeline("¿Cuál es tu presupuesto mensual?")
        assert result == "groq"

        metrics = router.get_metrics()
        assert len(metrics) == 1
        assert metrics[0]["detected_intent"] == "budget_ask"
        assert metrics[0]["selected_pipeline"] == "groq"

    @pytest.mark.asyncio
    async def test_full_routing_flow_objection(self):
        """Full flow with objection intent."""
        router = PipelineRouter(RouterConfig(use_hybrid_routing=False))
        result = await router.route_to_pipeline("Es demasiado caro comparado con la competencia")
        assert result == "gemini"

        metrics = router.get_metrics()
        assert metrics[0]["detected_intent"] == "objection"
        assert metrics[0]["selected_pipeline"] == "gemini"

    @pytest.mark.asyncio
    async def test_multiple_routes_accumulate_metrics(self):
        """Multiple routes accumulate in metrics buffer."""
        router = PipelineRouter()

        messages = [
            "¿Cuánto cuesta?",  # budget
            "Me parece caro",  # objection
            "¿Cuándo puedo empezar?",  # timeline
        ]

        for msg in messages:
            await router.route_to_pipeline(msg)

        all_metrics = router.get_metrics()
        assert len(all_metrics) == 3

        stats = router.get_stats()
        assert stats["total_routes"] == 3


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
