"""Tests para GroqAgent (unit + integration).

Para correr:
  pytest app/test_groq_client.py -v
  pytest app/test_groq_client.py::test_latency_tracking -v (específico)
"""
from __future__ import annotations

import asyncio
import pytest
from unittest.mock import AsyncMock, patch, MagicMock

from app.groq_client import GroqAgent, LatencyMetrics


class TestGroqAgent:
    """Unit tests para GroqAgent."""

    @pytest.fixture
    def agent(self):
        """Create GroqAgent instance for testing."""
        return GroqAgent(
            api_key="test-key-1234567890abcdef",
            model="mixtral-8x7b-32768",
            timeout_seconds=8,
        )

    def test_init_valid(self):
        """Test initialization with valid API key."""
        agent = GroqAgent(api_key="test-key")
        assert agent.api_key == "test-key"
        assert agent.model == "mixtral-8x7b-32768"
        assert agent.timeout_seconds == 8

    def test_init_missing_api_key(self):
        """Test initialization fails without API key."""
        with pytest.raises(ValueError, match="API key is required"):
            GroqAgent(api_key="")

    def test_init_custom_model(self):
        """Test initialization with custom model."""
        agent = GroqAgent(
            api_key="test-key",
            model="llama-70b-8192",
            timeout_seconds=10,
        )
        assert agent.model == "llama-70b-8192"
        assert agent.timeout_seconds == 10

    @pytest.mark.asyncio
    async def test_generate_response_success(self, agent):
        """Test successful response generation."""
        context = {
            "prospect_name": "Juan",
            "company": "Clínica Sonrisa",
            "niche": "dentista",
            "call_duration_ms": 5000,
            "sentiment": "positive",
            "pain_identified": True,
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Exacto, eso es el problema"}}],
                "usage": {"completion_tokens": 10},
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            response_text, metrics = await agent.generate_response(
                user_message="¿Y cuántas citas se te pierden a la semana?",
                context=context,
                stage="discovery",
            )

            assert isinstance(response_text, str)
            assert isinstance(metrics, LatencyMetrics)
            assert metrics.tokens_generated == 10
            assert metrics.ttft_ms > 0

    @pytest.mark.asyncio
    async def test_generate_response_timeout_fallback(self, agent):
        """Test fallback on timeout."""
        context = {
            "prospect_name": "María",
            "company": "Dentist Plus",
            "niche": "dentista",
            "call_duration_ms": 2000,
            "sentiment": "neutral",
            "pain_identified": False,
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_post.side_effect = asyncio.TimeoutError()

            response_text, metrics = await agent.generate_response(
                user_message="Hola, ¿quién eres?",
                context=context,
                stage="greeting",
            )

            # Should return fallback response
            assert isinstance(response_text, str)
            assert "SmartDental" in response_text or "Carlos" in response_text

    @pytest.mark.asyncio
    async def test_generate_response_rate_limit(self, agent):
        """Test handling of rate limit (429)."""
        context = {
            "prospect_name": "Pedro",
            "company": "Clínica ABC",
            "niche": "dentista",
            "call_duration_ms": 1000,
            "sentiment": "positive",
            "pain_identified": False,
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = MagicMock()
            mock_response.status_code = 429
            mock_response.text = "Rate limit exceeded"
            mock_response.raise_for_status.side_effect = Exception("429")

            # First call hits rate limit, should retry or raise
            response_text, metrics = await agent.generate_response(
                user_message="¿Cuál es el presupuesto?",
                context=context,
                stage="budget",
            )

            # Should use fallback if retries exhausted
            assert isinstance(response_text, str)

    def test_build_system_prompt_greeting(self, agent):
        """Test system prompt building for greeting stage."""
        context = {
            "prospect_name": "Luis",
            "company": "Dentista Luis",
            "niche": "dentista",
            "call_duration_ms": 0,
            "sentiment": "neutral",
            "pain_identified": False,
        }

        prompt = agent._build_system_prompt("greeting", context)

        assert "Carlos" in prompt
        assert "SmartDental" in prompt
        assert "patrón" in prompt or "pattern" in prompt
        assert "dentista" in prompt

    def test_build_system_prompt_discovery(self, agent):
        """Test system prompt building for discovery stage."""
        context = {
            "prospect_name": "Ana",
            "company": "Peluquería Ana",
            "niche": "peluqueria_canina",
            "call_duration_ms": 15000,
            "sentiment": "neutral",
            "pain_identified": False,
        }

        prompt = agent._build_system_prompt("discovery", context)

        assert "DISCOVERY" in prompt
        assert "dolor" in prompt or "pain" in prompt
        assert "pregunta" in prompt or "question" in prompt

    def test_build_system_prompt_budget(self, agent):
        """Test system prompt building for budget stage."""
        context = {
            "prospect_name": "Carlos",
            "company": "Clínica XYZ",
            "niche": "dentista",
            "call_duration_ms": 30000,
            "sentiment": "positive",
            "pain_identified": True,
            "budget_range": "50-150 EUR",
        }

        prompt = agent._build_system_prompt("budget", context)

        assert "BUDGET" in prompt
        assert "presupuesto" in prompt or "budget" in prompt
        assert "precio" in prompt or "price" in prompt

    def test_build_system_prompt_demo(self, agent):
        """Test system prompt building for demo stage."""
        context = {
            "prospect_name": "Roberto",
            "company": "Clínica Roberto",
            "niche": "dentista",
            "call_duration_ms": 60000,
            "sentiment": "positive",
            "pain_identified": True,
            "budget_range": "50-150 EUR",
        }

        prompt = agent._build_system_prompt("demo", context)

        assert "DEMO" in prompt
        assert "calendario" in prompt or "calendar" in prompt
        assert "15 min" in prompt or "horario" in prompt

    def test_build_fallback_response_all_stages(self, agent):
        """Test fallback responses are generated for all stages."""
        context = {
            "prospect_name": "Test",
            "company": "Test Company",
            "niche": "dentista",
        }

        stages = ["greeting", "discovery", "budget", "timeline", "demo", "closing"]

        for stage in stages:
            fallback = agent._build_fallback_response(stage, context)
            assert isinstance(fallback, str)
            assert len(fallback) > 0
            assert "Test" in fallback or "SmartDental" in fallback

    @pytest.mark.asyncio
    async def test_latency_tracking(self, agent):
        """Test latency metrics are recorded correctly."""
        context = {
            "prospect_name": "Latency Test",
            "company": "Test Corp",
            "niche": "dentista",
            "call_duration_ms": 5000,
            "sentiment": "neutral",
            "pain_identified": False,
        }

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_response = MagicMock()
            mock_response.json.return_value = {
                "choices": [{"message": {"content": "Test response"}}],
                "usage": {"completion_tokens": 15},
            }
            mock_post.return_value.__aenter__.return_value = mock_response

            response_text, metrics = await agent.generate_response(
                user_message="Test message",
                context=context,
                stage="discovery",
            )

            # Verify latency metrics
            assert metrics.ttft_ms > 0
            assert metrics.total_time_ms >= metrics.ttft_ms
            assert metrics.tokens_generated > 0
            assert metrics.tokens_per_second >= 0

    @pytest.mark.asyncio
    async def test_context_manager(self):
        """Test GroqAgent as async context manager."""
        async with GroqAgent(api_key="test-key") as agent:
            assert agent.api_key == "test-key"
            # Agent should be properly initialized

        # After exit, client should be closed (no error on re-close)


class TestLatencyMetrics:
    """Unit tests para LatencyMetrics."""

    def test_latency_metrics_creation(self):
        """Test LatencyMetrics dataclass."""
        metrics = LatencyMetrics(
            ttft_ms=45.5,
            total_time_ms=120.3,
            tokens_generated=25,
            tokens_per_second=200.0,
        )

        assert metrics.ttft_ms == 45.5
        assert metrics.total_time_ms == 120.3
        assert metrics.tokens_generated == 25
        assert metrics.tokens_per_second == 200.0


# Integration tests (require real API key, skipped by default)
class TestGroqAgentIntegration:
    """Integration tests against real Groq API."""

    @pytest.mark.skipif(
        True,  # Skip by default; set to False + export GROQ_API_KEY to run
        reason="Requires real Groq API key",
    )
    @pytest.mark.asyncio
    async def test_real_api_call(self):
        """Test against real Groq API (requires GROQ_API_KEY env var)."""
        import os

        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            pytest.skip("GROQ_API_KEY not set")

        agent = GroqAgent(api_key=api_key)

        context = {
            "prospect_name": "Integration Test",
            "company": "Test Company",
            "niche": "dentista",
            "call_duration_ms": 5000,
            "sentiment": "positive",
            "pain_identified": True,
        }

        response_text, metrics = await agent.generate_response(
            user_message="¿Cuánto cuesta exactamente?",
            context=context,
            stage="budget",
        )

        assert isinstance(response_text, str)
        assert len(response_text) > 0
        assert metrics.ttft_ms > 0
        assert metrics.ttft_ms < GroqAgent.TARGET_TTFT_MS * 3  # Allow 3x margin

        await agent.close()
