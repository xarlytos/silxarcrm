"""Tests del pipeline híbrido ElevenLabs STT + Gemini Chat + ElevenLabs TTS.

Mockea todos los componentes externos (ElevenLabs, Gemini) para probar la
lógica de negocio del orquestador sin conexiones de red.
"""
from __future__ import annotations

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.conversation.classifier import IntentClassification
from app.conversation.state import CallContext
from app.conversation.state_engine import SalesState, CallGoal
from app.elevenlabs.hybrid_session import HybridSession


# ─── Inicialización ───

class TestHybridSessionInit:
    def test_init_defaults(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="Soy Laura de Peluguau")
        assert session.ctx == ctx
        assert session.base_system_prompt == "Soy Laura de Peluguau"
        assert session.on_audio is None
        assert session.on_interrupt is None
        assert session.on_transcript is None
        assert session._closed.is_set() is False

    def test_init_with_callbacks(self, ctx):
        audio_cb = AsyncMock()
        interrupt_cb = AsyncMock()
        transcript_cb = AsyncMock()
        session = HybridSession(
            ctx=ctx,
            system_prompt="test",
            on_audio=audio_cb,
            on_interrupt=interrupt_cb,
            on_transcript=transcript_cb,
        )
        assert session.on_audio == audio_cb
        assert session.on_interrupt == interrupt_cb
        assert session.on_transcript == transcript_cb


# ─── Ciclo de vida básico ───

@pytest.mark.asyncio
class TestHybridSessionLifecycle:
    async def test_attach_cables_callbacks_and_drains_pre_attach(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        audio_cb = AsyncMock()
        session._pre_attach_audio.append(b"audio1")
        session._pre_attach_audio.append(b"audio2")

        await session.attach(audio_cb, on_interrupt=AsyncMock(), on_transcript=AsyncMock())

        assert session.on_audio == audio_cb
        audio_cb.assert_any_call(b"audio1")
        audio_cb.assert_any_call(b"audio2")
        assert session._pre_attach_audio == []

    async def test_send_audio_delegates_to_stt(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        session._stt = MagicMock()
        session._stt.send_audio = AsyncMock()

        await session.send_audio(b"pcm_data")

        session._stt.send_audio.assert_awaited_once_with(b"pcm_data")

    async def test_send_audio_noop_when_stt_none(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        # _stt es None por defecto — no debe crashar
        await session.send_audio(b"pcm_data")

    async def test_close_sets_closed_and_closes_components(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        session._stt = MagicMock()
        session._stt.close = AsyncMock()
        session._tts = MagicMock()
        session._tts.close = AsyncMock()

        await session.close()

        assert session._closed.is_set() is True
        session._stt.close.assert_awaited_once()
        session._tts.close.assert_awaited_once()

    async def test_close_handles_none_components(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        # _stt y _tts son None — no debe crashar
        await session.close()
        assert session._closed.is_set() is True


# ─── Classifier híbrido (_should_classify) ───

class TestShouldClassify:
    """Tests de la lógica de decisión sobre cuándo invocar al classifier."""

    def test_always_classify_first_two_turns(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        ctx.turns = 0
        assert session._should_classify("hola") is True
        ctx.turns = 1
        assert session._should_classify("sí, dígame") is True
        ctx.turns = 2
        assert session._should_classify("me interesa") is True

    def test_periodic_every_three_turns(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        ctx.turns = 3
        assert session._should_classify("neutral text") is True
        ctx.turns = 6
        assert session._should_classify("neutral text") is True
        ctx.turns = 9
        assert session._should_classify("neutral text") is True

    def test_skip_when_no_heuristic_match(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        ctx.turns = 4
        ctx.last_emotion = "neutro"
        ctx.sales_state.turnos_en_stage = 1
        with patch("app.conversation.signals.detect_objection", return_value=False):
            with patch("app.conversation.signals.analyze_turn") as mock_analyze:
                mock_analyze.return_value = MagicMock(emotion="neutro")
                assert session._should_classify("buenos días") is False

    def test_classify_on_objection_detected(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        ctx.turns = 4
        with patch("app.conversation.signals.detect_objection", return_value=True):
            assert session._should_classify("es muy caro") is True

    def test_classify_on_emotion_change(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        ctx.turns = 4
        ctx.last_emotion = "neutro"
        with patch("app.conversation.signals.detect_objection", return_value=False):
            with patch("app.conversation.signals.analyze_turn") as mock_analyze:
                mock_analyze.return_value = MagicMock(emotion="molesto")
                assert session._should_classify("ya basta") is True

    def test_classify_when_stuck_in_stage(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        ctx.turns = 4
        ctx.sales_state.turnos_en_stage = 3
        with patch("app.conversation.signals.detect_objection", return_value=False):
            with patch("app.conversation.signals.analyze_turn") as mock_analyze:
                mock_analyze.return_value = MagicMock(emotion="neutro")
                assert session._should_classify("no sé") is True


# ─── Flujo de turno completo (on_stt_turn_finalized) ───

@pytest.mark.asyncio
class TestTurnFinalized:
    async def test_turn_updates_context_and_calls_llm(
        self, ctx_with_state, mock_classifier, mock_state_engine, mock_master_llm,
        mock_gemini_chat, mock_metrics, mock_settings,
    ):
        """Flujo completo: STT finaliza turno → clasifica → state engine → LLM."""
        session = HybridSession(ctx=ctx_with_state, system_prompt="test")
        session._stt = MagicMock()
        session._tts = MagicMock()
        session._llm = mock_gemini_chat[1]
        session._classifier = mock_classifier[1]
        session._state_engine = mock_state_engine[1]
        session._master = mock_master_llm[1]

        transcript_cb = AsyncMock()
        session.on_transcript = transcript_cb

        await session._on_stt_turn_finalized("me interesa, ¿cuánto cuesta?")

        # El turno se registró en el contexto
        assert ctx_with_state.turns == 1
        assert ctx_with_state.transcript[-1]["role"] == "prospecto"

        # Classifier fue invocado (turno 0 <= 2)
        session._classifier.classify.assert_awaited_once()

        # State engine actualizó
        session._state_engine.update.assert_called_once()

        # LLM recibió el mensaje
        session._llm.send_message.assert_awaited_once_with("me interesa, ¿cuánto cuesta?")

    async def test_turn_skips_classifier_when_not_needed(
        self, ctx_with_state, mock_classifier, mock_state_engine, mock_master_llm,
        mock_gemini_chat, mock_metrics, mock_settings,
    ):
        """Si _should_classify devuelve False, reusa clasificación cacheada."""
        session = HybridSession(ctx=ctx_with_state, system_prompt="test")
        session._stt = MagicMock()
        session._tts = MagicMock()
        session._llm = mock_gemini_chat[1]
        session._classifier = mock_classifier[1]
        session._state_engine = mock_state_engine[1]
        session._master = mock_master_llm[1]

        # Simular que ya hay una clasificación previa
        prev = IntentClassification(intencion="neutro", confidence=0.7, emocion="neutro")
        session._last_classification = prev
        ctx_with_state.turns = 5  # > 2, no es turno múltiplo de 3

        with patch.object(session, "_should_classify", return_value=False):
            await session._on_stt_turn_finalized("sí, claro")

        # No invocó al classifier — reusó cache
        assert not session._classifier.classify.called

        # Pero igual actualizó state engine con la clasificación cacheada
        session._state_engine.update.assert_called_once()
        args = session._state_engine.update.call_args[0]
        # La clasificación cacheada se pasa con confidence reducida
        assert args[1].confidence == pytest.approx(0.56, rel=0.01)  # 0.7 * 0.8

    async def test_critical_event_triggers_master_blocking(
        self, ctx_with_state, mock_classifier, mock_state_engine, mock_master_llm,
        mock_gemini_chat, mock_settings,
    ):
        """Eventos críticos (agendando) bloquean esperando al Maestro."""
        from app.conversation.classifier import IntentClassification

        session = HybridSession(ctx=ctx_with_state, system_prompt="test")
        session._stt = MagicMock()
        session._tts = MagicMock()
        session._llm = mock_gemini_chat[1]
        session._state_engine = mock_state_engine[1]
        session._master = mock_master_llm[1]

        # Override classifier para devolver intención crítica
        classifier_mock = MagicMock()
        classifier_mock.classify = AsyncMock(return_value=IntentClassification(
            intencion="agendando",
            tags=["pregunta_demo"],
            confidence=0.9,
            emocion="interesado",
        ))
        session._classifier = classifier_mock

        # Override should_regenerate_brief para decir que SÍ necesita regenerar
        session._master.should_regenerate_brief = AsyncMock(return_value=(True, "agendando detectado"))

        await session._on_stt_turn_finalized("sí, agendemos para mañana")

        # Maestro regeneró brief en modo blocking
        session._master.regenerate_brief.assert_awaited_once()

    async def test_normal_turn_uses_cached_brief(
        self, ctx_with_state, mock_classifier, mock_state_engine, mock_master_llm,
        mock_gemini_chat, mock_settings,
    ):
        """Turno normal: Voz responde con brief caché, Maestro no bloquea."""
        session = HybridSession(ctx=ctx_with_state, system_prompt="test")
        session._stt = MagicMock()
        session._tts = MagicMock()
        session._llm = mock_gemini_chat[1]
        session._state_engine = mock_state_engine[1]
        session._master = mock_master_llm[1]

        # No necesita regenerar brief
        session._master.should_regenerate_brief = AsyncMock(return_value=(False, ""))

        await session._on_stt_turn_finalized("cuéntame más")

        # Maestro NO regeneró brief
        assert not session._master.regenerate_brief.called

        # LLM sí recibió el mensaje
        session._llm.send_message.assert_awaited_once_with("cuéntame más")


# ─── Barge-in ───

@pytest.mark.asyncio
class TestBargeIn:
    async def test_user_started_speaking_cancels_tts_and_interrupts(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        session._tts = MagicMock()
        session._tts.cancel = AsyncMock()
        interrupt_cb = AsyncMock()
        session.on_interrupt = interrupt_cb

        await session._on_user_started_speaking()

        session._tts.cancel.assert_awaited_once()
        interrupt_cb.assert_awaited_once()
        assert session._is_agent_speaking is False

    async def test_user_started_speaking_no_tts_no_crash(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        # _tts es None
        await session._on_user_started_speaking()
        assert session._is_agent_speaking is False


# ─── Callbacks de TTS ───

@pytest.mark.asyncio
class TestTTSCallbacks:
    async def test_on_tts_audio_forwards_to_callback(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        audio_cb = AsyncMock()
        session.on_audio = audio_cb

        await session._on_tts_audio(b"audio_chunk")

        audio_cb.assert_awaited_once_with(b"audio_chunk")

    async def test_on_tts_audio_buffers_when_no_callback(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        session.on_audio = None

        await session._on_tts_audio(b"audio_chunk")

        assert session._pre_attach_audio == [b"audio_chunk"]


# ─── Callbacks de LLM ───

@pytest.mark.asyncio
class TestLLMCallbacks:
    async def test_on_llm_transcript_adds_turn(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        transcript_cb = AsyncMock()
        session.on_transcript = transcript_cb

        await session._on_llm_transcript("agente", "¡Hola! Soy Laura de Peluguau")

        assert ctx.transcript[-1] == {"role": "agente", "text": "¡Hola! Soy Laura de Peluguau"}
        transcript_cb.assert_awaited_once_with("agente", "¡Hola! Soy Laura de Peluguau")

    async def test_on_llm_text_chunk_forwards_to_tts(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        session._tts = MagicMock()
        session._tts.send_text = AsyncMock()

        await session._on_llm_text_chunk("Hola, ")
        await session._on_llm_text_chunk("¿cómo está?")

        assert session._tts.send_text.call_count == 2

    async def test_on_llm_tool_call_executes_tools(self, ctx):
        session = HybridSession(ctx=ctx, system_prompt="test")
        session._llm = MagicMock()
        session._llm.send_tool_result = AsyncMock()
        session._tts = MagicMock()
        session._tts.flush = AsyncMock()

        tool_calls = [
            {"name": "consultar_crm", "args": {"telefono": "+5215512345678"}, "id": "tool_1"},
        ]

        with patch("app.elevenlabs.hybrid_session.tools_mod.execute_tool") as mock_execute:
            mock_execute.return_value = {"phone": "+5215512345678", "nombre": "Juan"}
            await session._on_llm_tool_call(tool_calls)

        session._tts.flush.assert_awaited_once()
        session._llm.send_tool_result.assert_awaited_once()


# ─── Run (ciclo de vida completo) ───

@pytest.mark.asyncio
class TestRun:
    async def test_run_initializes_components(
        self, ctx, mock_elevenlabs_scribe, mock_elevenlabs_tts, mock_gemini_chat,
        mock_master_llm, mock_strategist, mock_settings,
    ):
        """run() inicializa TTS, STT y LLM, y genera brief inicial."""
        session = HybridSession(ctx=ctx, system_prompt="test")

        # Mock internal tasks to complete immediately
        tts_instance = mock_elevenlabs_tts[1]
        stt_instance = mock_elevenlabs_scribe[1]

        async def tts_done():
            return None
        async def stt_done():
            return None

        tts_instance.start = AsyncMock(side_effect=tts_done)
        stt_instance.start = AsyncMock(side_effect=stt_done)

        # Patch the component constructors so they use our mocks
        with patch.object(session, "_master", mock_master_llm[1]):
            await session.run()

        # Brief inicial fue generado
        mock_master_llm[1].generate_initial_brief.assert_awaited_once()

    async def test_run_with_strategist_enabled(
        self, ctx, mock_elevenlabs_scribe, mock_elevenlabs_tts, mock_gemini_chat,
        mock_master_llm, mock_strategist, mock_settings,
    ):
        """Cuando strategist_enabled=True, genera pre-call strategy."""
        mock_settings.strategist_enabled = True

        session = HybridSession(ctx=ctx, system_prompt="test")
        tts_instance = mock_elevenlabs_tts[1]
        stt_instance = mock_elevenlabs_scribe[1]

        async def tts_done():
            return None
        async def stt_done():
            return None

        tts_instance.start = AsyncMock(side_effect=tts_done)
        stt_instance.start = AsyncMock(side_effect=stt_done)

        with patch.object(session, "_master", mock_master_llm[1]):
            with patch.object(session, "_strategist", mock_strategist[1]):
                await session.run()

        mock_strategist[1].generate_pre_call_strategy.assert_awaited_once()
