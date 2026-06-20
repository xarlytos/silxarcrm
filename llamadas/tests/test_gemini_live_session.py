"""Tests de GeminiLiveSession: pipeline nativo audio bidireccional.

Mockea el SDK de google-genai para probar la lógica de conexión,
recepción de mensajes y tool calling sin API keys ni red.
"""
from __future__ import annotations

import asyncio
from typing import Any
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

from app.conversation.state import CallContext
from app.gemini.live_session import GeminiLiveSession


# ─── Helpers ───

class AsyncIteratorMock:
    """Mock de async iterator para simular respuestas de Gemini Live."""

    def __init__(self, items: list) -> None:
        self._items = items
        self._index = 0

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self._index >= len(self._items):
            raise StopAsyncIteration
        item = self._items[self._index]
        self._index += 1
        return item


def _fake_response(**kwargs) -> MagicMock:
    """Crea un objeto response falso con los atributos que necesitamos."""
    resp = MagicMock()
    for key, value in kwargs.items():
        setattr(resp, key, value)
    return resp


def _fake_server_content(**kwargs) -> MagicMock:
    """Crea un objeto server_content falso."""
    sc = MagicMock()
    for key, value in kwargs.items():
        setattr(sc, key, value)
    return sc


# ─── Inicialización ───

class TestGeminiLiveSessionInit:
    def test_init_defaults(self, ctx):
        session = GeminiLiveSession(ctx=ctx, system_prompt="Soy Carlos")
        assert session.ctx == ctx
        assert session.system_prompt == "Soy Carlos"
        assert session.on_audio is None
        assert session.on_interrupt is None
        assert session.on_transcript is None
        assert session._closed.is_set() is False
        assert session._client is None

    def test_init_with_callbacks(self, ctx):
        audio_cb = AsyncMock()
        session = GeminiLiveSession(
            ctx=ctx,
            system_prompt="test",
            on_audio=audio_cb,
        )
        assert session.on_audio == audio_cb


# ─── Ciclo de vida básico ───

@pytest.mark.asyncio
class TestGeminiLiveSessionLifecycle:
    async def test_attach_cables_callbacks_and_drains_pre_attach(self, ctx):
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        audio_cb = AsyncMock()
        interrupt_cb = AsyncMock()
        transcript_cb = AsyncMock()
        session._pre_attach_audio.append(b"audio1")

        await session.attach(audio_cb, interrupt_cb, transcript_cb)

        assert session.on_audio == audio_cb
        assert session.on_interrupt == interrupt_cb
        assert session.on_transcript == transcript_cb
        audio_cb.assert_any_call(b"audio1")
        assert session._pre_attach_audio == []

    async def test_send_audio_enqueues(self, ctx):
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        await session.send_audio(b"pcm_data")

        # Verificar que el audio se encoló
        assert session._audio_in.qsize() == 1
        assert await session._audio_in.get() == b"pcm_data"

    async def test_close_sets_closed(self, ctx):
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        await session.close()
        assert session._closed.is_set() is True


# ─── Recepción de mensajes ───

@pytest.mark.asyncio
class TestReceiveLoop:
    async def test_audio_response_forwards_to_callback(self, ctx):
        """Audio de Gemini se reenvía al callback on_audio."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        audio_cb = AsyncMock()
        session.on_audio = audio_cb

        resp = _fake_response(data=b"pcm_audio_chunk")
        resp.server_content = None
        resp.tool_call = None

        session._session = MagicMock()
        session._session.receive = MagicMock(return_value=AsyncIteratorMock([resp]))
        session._session.send_tool_response = AsyncMock()

        await session._receive_loop()

        audio_cb.assert_awaited_once_with(b"pcm_audio_chunk")

    async def test_turn_complete_resets_latency_flag(self, ctx):
        """turn_complete reinicia _turn_first_audio_seen para medir siguiente turno."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        session._turn_first_audio_seen = True

        sc = _fake_server_content(turn_complete=True)
        resp = _fake_response(server_content=sc)
        resp.data = None
        resp.tool_call = None

        session._session = MagicMock()
        session._session.receive = MagicMock(return_value=AsyncIteratorMock([resp]))
        session._session.send_tool_response = AsyncMock()

        await session._receive_loop()

        assert session._turn_first_audio_seen is False

    async def test_interrupted_triggers_on_interrupt(self, ctx):
        """Barge-in de Gemini (interrupted) llama al callback on_interrupt."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        interrupt_cb = AsyncMock()
        session.on_interrupt = interrupt_cb

        sc = _fake_server_content(interrupted=True)
        resp = _fake_response(server_content=sc)
        resp.data = None
        resp.tool_call = None

        session._session = MagicMock()
        session._session.receive = MagicMock(return_value=AsyncIteratorMock([resp]))
        session._session.send_tool_response = AsyncMock()

        await session._receive_loop()

        interrupt_cb.assert_awaited_once()

    async def test_output_transcription_forwards_to_callback(self, ctx):
        """Transcripción del agente se reenvía a on_transcript."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        transcript_cb = AsyncMock()
        session.on_transcript = transcript_cb

        out_t = MagicMock()
        out_t.text = "Hola, soy Carlos de SmartDental"
        sc = _fake_server_content(output_transcription=out_t)
        sc.input_transcription = None  # Evitar que MagicMock cree mock implícito
        resp = _fake_response(server_content=sc)
        resp.data = None
        resp.tool_call = None

        session._session = MagicMock()
        session._session.receive = MagicMock(return_value=AsyncIteratorMock([resp]))
        session._session.send_tool_response = AsyncMock()

        await session._receive_loop()

        transcript_cb.assert_awaited_once_with("agente", "Hola, soy Carlos de SmartDental")

    async def test_input_transcription_forwards_to_callback(self, ctx):
        """Transcripción del usuario se reenvía a on_transcript."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        transcript_cb = AsyncMock()
        session.on_transcript = transcript_cb

        in_t = MagicMock()
        in_t.text = "Sí, me interesa"
        sc = _fake_server_content(input_transcription=in_t)
        sc.output_transcription = None  # Evitar que MagicMock cree mock implícito
        resp = _fake_response(server_content=sc)
        resp.data = None
        resp.tool_call = None

        session._session = MagicMock()
        session._session.receive = MagicMock(return_value=AsyncIteratorMock([resp]))
        session._session.send_tool_response = AsyncMock()

        await session._receive_loop()

        transcript_cb.assert_awaited_once_with("prospecto", "Sí, me interesa")

    async def test_receive_loop_breaks_when_closed(self, ctx):
        """_receive_loop termina cuando _closed está seteado."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        session._closed.set()

        session._session = MagicMock()

        await session._receive_loop()

        # No se llamó a receive porque closed estaba seteado al inicio del loop
        # (la condición del for es checked en cada iteración)


# ─── Tool calls ───

@pytest.mark.asyncio
class TestToolCalls:
    async def test_handle_tool_calls_executes_and_responds(self, ctx):
        """Tool calls se ejecutan y se responden a Gemini."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        session._session = MagicMock()
        session._session.send_tool_response = AsyncMock()

        fc = MagicMock()
        fc.name = "consultar_crm"
        fc.args = {"telefono": "+5215512345678"}
        fc.id = "tool_1"

        with patch("app.gemini.live_session.tools_mod.execute_tool") as mock_execute:
            mock_execute.return_value = {"phone": "+5215512345678", "nombre": "Juan"}
            await session._handle_tool_calls([fc])

        mock_execute.assert_awaited_once_with("consultar_crm", {"telefono": "+5215512345678"}, ctx)
        session._session.send_tool_response.assert_awaited_once()

    async def test_handle_multiple_tool_calls(self, ctx):
        """Múltiples tool calls se ejecutan en batch."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        session._session = MagicMock()
        session._session.send_tool_response = AsyncMock()

        fc1 = MagicMock()
        fc1.name = "consultar_crm"
        fc1.args = {"telefono": "+5215512345678"}
        fc1.id = "tool_1"

        fc2 = MagicMock()
        fc2.name = "calcular_roi"
        fc2.args = {"citas_por_semana": 40, "precio_promedio_cita": 30, "cancelaciones_por_semana": 10}
        fc2.id = "tool_2"

        with patch("app.gemini.live_session.tools_mod.execute_tool") as mock_execute:
            mock_execute.side_effect = [
                {"phone": "+5215512345678"},
                {"ingreso_mensual_recuperado": 903.0},
            ]
            await session._handle_tool_calls([fc1, fc2])

        assert mock_execute.call_count == 2
        session._session.send_tool_response.assert_awaited_once()


# ─── Pump audio ───

@pytest.mark.asyncio
class TestPumpAudio:
    async def test_pump_audio_sends_to_gemini(self, ctx):
        """Audio de la cola se envía a Gemini con formato correcto."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        session._session = MagicMock()
        session._session.send_realtime_input = AsyncMock()

        with patch("google.genai.types") as mock_types:
            mock_types.Blob = MagicMock(return_value="blob_mock")

            await session._audio_in.put(b"pcm_chunk")

            # Cancelar el pump después de procesar un chunk
            async def pump_and_stop():
                task = asyncio.create_task(session._pump_audio_in())
                await asyncio.sleep(0.05)
                await session.close()
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass

            await pump_and_stop()

            # Verificar que se envió al menos un chunk
            session._session.send_realtime_input.assert_called()
            call_kwargs = session._session.send_realtime_input.call_args[1]
            assert "audio" in call_kwargs


# ─── Latency tracking ───

@pytest.mark.asyncio
class TestLatencyTracking:
    async def test_first_audio_records_latency(self, ctx):
        """El primer chunk de audio de respuesta registra latencia."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")
        session._last_user_audio_ts = 1000.0
        session._turn_first_audio_seen = False

        audio_cb = AsyncMock()
        session.on_audio = audio_cb

        with patch("app.gemini.live_session.metrics") as mock_metrics:
            resp = _fake_response(data=b"audio")
            resp.server_content = None
            resp.tool_call = None

            session._session = MagicMock()
            session._session.receive = MagicMock(return_value=AsyncIteratorMock([resp]))
            session._session.send_tool_response = AsyncMock()

            await session._receive_loop()

            mock_metrics.record_latency.assert_called_once()
            assert session._turn_first_audio_seen is True


# ─── Run con reintentos ───

@pytest.mark.asyncio
class TestRunWithRetries:
    async def test_run_success_on_first_attempt(self, ctx):
        """run() conecta exitosamente a la primera."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")

        with patch("app.gemini.live_session.default_plan") as mock_plan:
            mock_plan.return_value.ordered = MagicMock(return_value=["gemini-3.1-flash-live-preview"])

            # Mock _run_once para que termine sin error
            with patch.object(session, "_run_once", new=AsyncMock()):
                await session.run()

    async def test_run_retries_on_transient_error(self, ctx):
        """run() reintenta en error transitorio antes de rendirse."""
        session = GeminiLiveSession(ctx=ctx, system_prompt="test")

        with patch("app.gemini.live_session.default_plan") as mock_plan:
            mock_plan.return_value.ordered = MagicMock(return_value=["model-1"])

            with patch("app.gemini.live_session.is_transient_error", return_value=True):
                with patch("app.gemini.live_session.sleep_backoff", new=AsyncMock()):
                    call_count = 0
                    async def failing_run_once(model):
                        nonlocal call_count
                        call_count += 1
                        raise ConnectionError("Simulated transient error")

                    with patch.object(session, "_run_once", side_effect=failing_run_once):
                        with pytest.raises(RuntimeError, match="No se pudo establecer"):
                            await session.run()

                        assert call_count == 4
