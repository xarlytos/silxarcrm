"""Fixtures compartidos para tests del sistema de llamadas."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass, field
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.conversation.state import CallContext
from app.conversation.state_engine import SalesState, CallGoal


# ─── Helpers ───

@pytest.fixture
def ctx() -> CallContext:
    """CallContext base para tests."""
    return CallContext(
        call_sid="CA_test_123",
        phone="+5215512345678",
        business_type="veterinaria",
        business_name="Clínica Patitas",
        city="Guadalajara",
        software_id="peluguau",
        lead_id="lead_456",
    )


@pytest.fixture
def ctx_with_state(ctx) -> CallContext:
    """CallContext con SalesState inicializado."""
    ctx.sales_state = SalesState(stage="discovery")
    ctx.call_goal = CallGoal(progress=0.15)
    return ctx


# ─── Mocks de componentes externos ───

@pytest.fixture
def mock_elevenlabs_scribe():
    """Mock de ElevenLabsScribe."""
    with patch("app.elevenlabs.hybrid_session.ElevenLabsScribe") as m:
        instance = m.return_value
        instance.start = AsyncMock()
        instance.close = AsyncMock()
        instance.send_audio = AsyncMock()
        yield m, instance


@pytest.fixture
def mock_elevenlabs_tts():
    """Mock de ElevenLabsTTS."""
    with patch("app.elevenlabs.hybrid_session.ElevenLabsTTS") as m:
        instance = m.return_value
        instance.start = AsyncMock()
        instance.close = AsyncMock()
        instance.send_text = AsyncMock()
        instance.flush = AsyncMock()
        instance.cancel = AsyncMock()
        yield m, instance


@pytest.fixture
def mock_gemini_chat():
    """Mock de GeminiChatSession (el LLM Voz)."""
    with patch("app.elevenlabs.hybrid_session.GeminiChatSession") as m:
        instance = m.return_value
        instance.send_message = AsyncMock()
        instance.send_tool_result = AsyncMock()
        instance.close = AsyncMock()
        yield m, instance


@pytest.fixture
def mock_classifier():
    """Mock de MiniClassifier."""
    from app.conversation.classifier import IntentClassification
    with patch("app.elevenlabs.hybrid_session.MiniClassifier") as m:
        instance = m.return_value
        instance.classify = AsyncMock(return_value=IntentClassification(
            intencion="interesado",
            tags=["dolor_alto", "pregunta_demo"],
            confidence=0.85,
            emocion="interesado",
        ))
        yield m, instance


@pytest.fixture
def mock_state_engine():
    """Mock de StateEngine."""
    with patch("app.elevenlabs.hybrid_session.StateEngine") as m:
        instance = m.return_value
        new_state = SalesState(stage="problem_aware", confidence=0.7)
        new_goal = CallGoal(progress=0.35)
        instance.update = MagicMock(return_value=(new_state, new_goal, "transition: discovery -> problem_aware"))
        yield m, instance


@pytest.fixture
def mock_master_llm():
    """Mock de MasterLLM."""
    from app.conversation.master_llm import ConversationBrief
    with patch("app.elevenlabs.hybrid_session.MasterLLM") as m:
        instance = m.return_value
        brief = ConversationBrief(
            objetivo="Cuantificar el dolor del prospecto",
            estrategia="quantification",
            stage_target="problem_aware",
        )
        instance.generate_initial_brief = AsyncMock(return_value=brief)
        instance.should_regenerate_brief = AsyncMock(return_value=(False, ""))
        instance.regenerate_brief = AsyncMock(return_value=brief)
        yield m, instance


@pytest.fixture
def mock_strategist():
    """Mock de Strategist."""
    with patch("app.elevenlabs.hybrid_session.Strategist") as m:
        instance = m.return_value
        instance.generate_pre_call_strategy = AsyncMock()
        instance.handle_exception = AsyncMock()
        yield m, instance


@pytest.fixture
def mock_genai_client():
    """Mock del cliente google.genai para GeminiLiveSession."""
    with patch("app.gemini.live_session.genai.Client") as m:
        client = m.return_value
        session_mock = AsyncMock()
        client.aio.live.connect = AsyncMock(return_value=session_mock)
        yield m, client, session_mock


@pytest.fixture
def mock_metrics():
    """Mock del módulo de métricas para no contaminar estadísticas de tests."""
    with patch("app.elevenlabs.hybrid_session.metrics") as m:
        yield m


@pytest.fixture
def mock_settings():
    """Mock de settings con valores de test."""
    with patch("app.elevenlabs.hybrid_session.settings") as m:
        m.elevenlabs_api_key = "test_key"
        m.elevenlabs_voice_id = "test_voice"
        m.elevenlabs_tts_format = "ulaw_8000"
        m.elevenlabs_latency_opt = 0
        m.elevenlabs_stt_language = "es"
        m.elevenlabs_stt_sample_rate = 16000
        m.voice_pipeline = "elevenlabs"
        m.strategist_enabled = False
        m.gemini_chat_model = "gemini-3.1-flash-lite"
        m.gemini_api_key = "test_gemini_key"
        yield m
