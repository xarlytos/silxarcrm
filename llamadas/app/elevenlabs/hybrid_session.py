"""Orquesta STT (ElevenLabs) + Classifier Híbrido + State Engine Probabilístico
+ Conversador (Flash) + TTS (ElevenLabs).

Arquitectura de 4 capas:
  1. ElevenLabs STT → texto
  2. Classifier Híbrido (Flash) → solo cuando hay cambio significativo
  3. State Engine Probabilístico → stage + next_stages_probs + confidence
  4. Conversador (Flash) → naturaliza estrategia en texto humano
  5. ElevenLabs TTS → audio

Filosofía: LLM es NATURALIZADOR, no DECISOR.
"""
from __future__ import annotations

import asyncio
import logging
import time
from typing import Awaitable, Callable

from app.config import settings
from app.conversation.classifier import MiniClassifier, IntentClassification
from app.conversation.state_engine import CallGoal, StateEngine, SalesState
from app.conversation.strategist import Strategist
from app.conversation.master_llm import MasterLLM
from app.conversation.emotional_response import EmotionalToneAdjuster
from app.conversation.memory_consistency import ConversationConsistency
from app.elevenlabs.stt_session import ElevenLabsScribe
from app.elevenlabs.tts_session import ElevenLabsTTS
from app.gemini.chat_session import GeminiChatSession
from app.gemini import tools as tools_mod
from app.observability.decision_log import DecisionLogger
from app.observability import metrics

logger = logging.getLogger(__name__)

AudioCallback = Callable[[bytes], Awaitable[None]]
SimpleCallback = Callable[[], Awaitable[None]]
TranscriptCallback = Callable[[str, str], Awaitable[None]]


class HybridSession:
    """Pipeline híbrido: STT → Classifier (híbrido) → State Engine → LLM → TTS."""

    def __init__(
        self,
        ctx,
        system_prompt: str,
        on_audio: AudioCallback | None = None,
        on_interrupt: SimpleCallback | None = None,
        on_transcript: TranscriptCallback | None = None,
    ) -> None:
        self.ctx = ctx
        self.base_system_prompt = system_prompt
        self.on_audio = on_audio
        self.on_interrupt = on_interrupt
        self.on_transcript = on_transcript

        self._stt: ElevenLabsScribe | None = None
        self._tts: ElevenLabsTTS | None = None
        self._llm: GeminiChatSession | None = None

        self._closed = asyncio.Event()
        self._pre_attach_audio: list[bytes] = []

        # Latencia
        self._last_user_audio_ts: float | None = None
        self._turn_first_audio_seen = False

        # Estado
        self._is_agent_speaking = False
        self._current_agent_text = ""

        # Arquitectura dual LLM: Maestro (Pro) + Voz (Flash)
        self._classifier = MiniClassifier()
        self._state_engine = StateEngine()
        self._strategist = Strategist()
        self._master = MasterLLM()
        self._decision_logger = DecisionLogger(ctx.call_sid)

        # Cache de última clasificación (para no re-clasificar cada turno)
        self._last_classification: IntentClassification | None = None
        # Brief del Maestro (guía estratégica para el Voz)
        self._current_brief = None

        # ═══ FIX 4 + 5: Emotional Mirroring + Memory Consistency ═══
        self._emotional_adjuster = EmotionalToneAdjuster()
        self._conversation_consistency = ConversationConsistency()

    # ── Interfaz pública ──
    async def attach(
        self,
        on_audio: AudioCallback,
        on_interrupt: SimpleCallback | None = None,
        on_transcript: TranscriptCallback | None = None,
    ) -> None:
        self.on_audio = on_audio
        self.on_interrupt = on_interrupt
        self.on_transcript = on_transcript
        if self._pre_attach_audio:
            for chunk in self._pre_attach_audio:
                await on_audio(chunk)
            self._pre_attach_audio.clear()

    async def send_audio(self, pcm16k: bytes) -> None:
        if self._stt:
            await self._stt.send_audio(pcm16k)

    async def close(self) -> None:
        self._closed.set()
        if self._stt:
            await self._stt.close()
        if self._tts:
            await self._tts.close()

    # ── Ciclo de vida principal ──
    async def run(self) -> None:
        """Arranca las conexiones y genera estrategia pre-call."""
        try:
            # 0. Generar brief inicial del Maestro (visión estratégica)
            try:
                initial_brief = await self._master.generate_initial_brief(
                    ctx=self.ctx,
                    sales_state=self.ctx.sales_state,
                    call_goal=self.ctx.call_goal,
                )
                self._current_brief = initial_brief
                logger.info("Master: brief inicial generado → estrategia=%s objetivo=%s",
                           initial_brief.estrategia, initial_brief.objetivo)
            except Exception as exc:
                logger.warning("Master: fallo al generar brief inicial: %s", exc)

            # 0b. Generar estrategia pre-call (legacy, opcional)
            if settings.strategist_enabled:
                initial_state = await self._strategist.generate_pre_call_strategy(
                    lead=self.ctx.prospect,
                    business_type=self.ctx.business_type,
                )
                self.ctx.sales_state = initial_state
                logger.info("Pre-call strategy: stage=%s tags=%s", initial_state.stage, initial_state.tags)

            # 1. Iniciar TTS
            self._tts = ElevenLabsTTS(
                api_key=settings.elevenlabs_api_key,
                voice_id=settings.elevenlabs_voice_id,
                on_audio=self._on_tts_audio,
                output_format=settings.elevenlabs_tts_format,
                latency_optimization=settings.elevenlabs_latency_opt,
            )
            tts_task = asyncio.create_task(self._tts.start())

            # 2. Iniciar STT
            self._stt = ElevenLabsScribe(
                api_key=settings.elevenlabs_api_key,
                language_code=settings.elevenlabs_stt_language,
                on_partial=self._on_stt_partial,
                on_final=self._on_stt_final,
                on_user_started_speaking=self._on_user_started_speaking,
                on_user_stopped_speaking=self._on_user_stopped_speaking,
                on_turn_finalized=self._on_stt_turn_finalized,
                sample_rate=settings.elevenlabs_stt_sample_rate,
            )
            stt_task = asyncio.create_task(self._stt.start())

            # 3. Iniciar LLM
            self._llm = GeminiChatSession(
                ctx=self.ctx,
                system_prompt=self.base_system_prompt,
                on_text_chunk=self._on_llm_text_chunk,
                on_tool_call=self._on_llm_tool_call,
                on_transcript=self._on_llm_transcript,
                sales_state=self.ctx.sales_state,
                call_goal=self.ctx.call_goal,
            )

            done, pending = await asyncio.wait(
                [tts_task, stt_task],
                return_when=asyncio.FIRST_COMPLETED,
            )
            for task in pending:
                task.cancel()
            for task in done:
                if task.exception():
                    raise task.exception()

        except Exception:
            logger.exception("Error en HybridSession")
            raise

    # ── Classifier híbrido: ¿cuándo clasificar? ──
    def _should_classify(self, text: str) -> bool:
        """Decide si es necesario invocar al classifier en este turno.

        OPTIMIZACIÓN CICLO 2 (1.2): Clasificación selectiva
        Antes: cada 3 turnos (periódico)
        Ahora: solo si hay cambio REAL (objeción, emoción, estancado)
        Ganancia: -50ms baseline
        """
        # Siempre clasificar los primeros 2 turnos
        if self.ctx.turns <= 2:
            return True

        # CAMBIOS REALES (heurísticas baratas):

        # 1. ¿hay objeción nueva?
        from app.conversation.signals import detect_objection
        if detect_objection(text):
            return True

        # 2. ¿cambio de emoción?
        from app.conversation.signals import analyze_turn
        sig = analyze_turn(text)
        if sig.emotion != self.ctx.last_emotion and sig.emotion != "neutro":
            return True

        # 3. ¿estancado 3+ turnos?
        if self.ctx.sales_state.turnos_en_stage > 3:
            return True

        # Sin clasificación: usar cached
        return False

    # ── Callbacks internos ──

    async def _on_tts_audio(self, audio: bytes) -> None:
        if not self._turn_first_audio_seen and self._last_user_audio_ts is not None:
            metrics.record_latency(time.perf_counter() - self._last_user_audio_ts)
            self._turn_first_audio_seen = True

        if self.on_audio is None:
            self._pre_attach_audio.append(audio)
        else:
            await self.on_audio(audio)

    async def _on_stt_partial(self, text: str) -> None:
        logger.debug("STT partial: %s", text)

    async def _on_stt_final(self, text: str) -> None:
        logger.debug("STT final segment: %s", text)

    async def _on_user_stopped_speaking(self) -> None:
        logger.debug("VAD: usuario dejó de hablar")

    async def _on_stt_turn_finalized(self, text: str) -> None:
        """Turno completo del usuario finalizado.

        Arquitectura dual LLM:
        ─────────────────────────────────────────────────────────────
        Paso 1: Clasificar intención (Flash, ~100ms)
        Paso 2: Actualizar State Engine (<1ms)
        Paso 3: ¿Evento crítico? → Maestro (Pro, ~500ms) regenera brief
                → Voz (Flash, ~150ms) responde con brief nuevo
        Paso 3b: Turno normal → Voz responde con brief caché (~150ms)
                → Maestro regenera en background para próximo turno
        ─────────────────────────────────────────────────────────────
        """
        self._last_user_audio_ts = time.perf_counter()
        self._turn_first_audio_seen = False
        self._is_agent_speaking = True
        self._current_agent_text = ""

        # Iniciar log de decisión
        self._decision_logger.start_turn(self.ctx.turns, text)

        # 1. Actualizar CallContext
        self.ctx.add_turn("prospecto", text)

        # ═══ FIX 5: Memory Consistency (Tier 3: -50%) ═══
        # Extraer hechos de lo que el prospecto acaba de decir
        self._conversation_consistency.update(text, self.ctx.turns)

        # 2. ¿Invocar classifier?
        classifier_start = time.perf_counter()
        classifier_invoked = self._should_classify(text)
        if classifier_invoked:
            recent_turns = self.ctx.transcript[-5:]
            classification = await self._classifier.classify(text, recent_turns)
            self._last_classification = classification
            self.ctx.last_emotion = classification.emocion
            classifier_latency_ms = int((time.perf_counter() - classifier_start) * 1000)
            logger.debug("Classifier invoked: intencion=%s", classification.intencion)
        else:
            classification = self._last_classification
            if classification is None:
                classification = IntentClassification(emocion=self.ctx.last_emotion, confidence=0.3)
            else:
                classification = IntentClassification(
                    intencion=classification.intencion,
                    tags=classification.tags,
                    confidence=classification.confidence * 0.8,
                    nueva_objecion=classification.nueva_objecion,
                    emocion=classification.emocion,
                )
            classifier_latency_ms = 0
            logger.debug("Classifier skipped (reusing cached): intencion=%s", classification.intencion)

        self._decision_logger.log_classification(classification, classifier_invoked, classifier_latency_ms)

        # 3. State Engine probabilístico
        state_before = self.ctx.sales_state
        call_goal_before = self.ctx.call_goal
        self.ctx.sales_state, self.ctx.call_goal, reasoning = self._state_engine.update(
            self.ctx.sales_state, classification, self.ctx.call_goal, self.ctx.turns
        )

        self._decision_logger.log_state_transition(
            state_before=state_before,
            state_after=self.ctx.sales_state,
            call_goal=self.ctx.call_goal,
            reason=reasoning,
        )

        # 4. Verificar excepciones
        if classification.intencion == "agendando":
            await self._strategist.handle_exception(
                self.ctx.sales_state, "hot_lead", {"text": text}
            )
        elif classification.intencion == "rechazando" and classification.confidence > 0.8:
            await self._strategist.handle_exception(
                self.ctx.sales_state, "opt_out", {"text": text}
            )
        elif classification.intencion == "pidiendo_humano":
            await self._strategist.handle_exception(
                self.ctx.sales_state, "transfer_request", {"text": text}
            )

        # Log con probabilidades
        next_probs = self.ctx.sales_state.next_stages
        top3 = sorted(next_probs.items(), key=lambda x: -x[1])[:3] if next_probs else []
        probs_str = ", ".join(f"{s}={p:.0%}" for s, p in top3)

        logger.info(
            "Turno %d: intencion=%s stage=%s(conf=%.0f%%) goal_progress=%.0f%% risk=%.0f%% | next=%s",
            self.ctx.turns,
            classification.intencion,
            self.ctx.sales_state.stage,
            self.ctx.sales_state.confidence,
            self.ctx.call_goal.progress,
            self.ctx.call_goal.risk_of_loss,
            probs_str,
        )

        # ═══════════════════════════════════════════════════════════════
        # 5. ARQUITECTURA DUAL: Maestro decide si regenera brief
        # ═══════════════════════════════════════════════════════════════
        needs_new_brief, brief_reason = await self._master.should_regenerate_brief(
            turno=self.ctx.turns,
            text=text,
            classification=classification,
            sales_state=self.ctx.sales_state,
            last_brief=self._current_brief,
        )

        if needs_new_brief:
            logger.info("Master: regenerando brief → %s (NUNCA BLOQUEA)", brief_reason)

            # ═══ OPTIMIZACIÓN CRÍTICA (CICLO 2): NUNCA BLOQUEAR LA VOZ ═══
            # Antes: eventos críticos bloqueaban esperando brief nuevo (300-500ms)
            # Ahora: SIEMPRE background. Voz responde CON BRIEF ANTERIOR en < 200ms
            #
            # Evento crítico (agendando/rechazando):
            #   → Voz responde CON BRIEF ACTUAL (listo, no espera)
            #   → Maestro regenera en BACKGROUND con prioridad
            #   → Para turno N+1, brief nuevo YA está listo
            #
            # Evento normal:
            #   → Voz responde CON BRIEF ACTUAL
            #   → Maestro regenera en background
            #   → Para próximo turno, brief actualizado
            #
            # RESULTADO: NUNCA esperamos, siempre respondemos rápido (~150ms)

            is_critical = classification.intencion in ("agendando", "rechazando", "pidiendo_humano")

            # SIEMPRE background (incluso crítico). Prioridad determina si esperar en próx turno
            asyncio.create_task(self._regenerate_brief_background(
                classification=classification,
                is_critical=is_critical,  # Maestro sabe si es urgente
            ))
            logger.info("Master: brief regenerando en background (prioridad=%s)",
                       "ALTA" if is_critical else "normal")
        else:
            # ═══ OPTIMIZACIÓN CICLO 2 (1.5): Reutilizar brief (sin regenerar) ═══
            # Si should_regenerate_brief() retorna False:
            # → stage no cambió → brief sigue siendo válido
            # → NO llamar a Maestro (ahorrar 300-500ms)
            # → Usar self._current_brief tal como está
            # Ganancia: -270ms en ~30% de turnos (cuando stage es estable)
            logger.debug("Master: brief reutilizado (stage estable, sin Maestro)")

        # 6. Actualizar LLM (Voz) con el brief y enviar mensaje
        if self._llm:
            self._llm.sales_state = self.ctx.sales_state
            self._llm.call_goal = self.ctx.call_goal
            # Inyectar brief del Maestro en el Voz
            self._llm.current_brief = self._current_brief
            await self._llm.send_message(text)

        # 7. Finalizar log
        self._decision_logger.end_turn()

    async def _regenerate_brief_background(self, classification, is_critical: bool = False) -> None:
        """Regenera el brief del Maestro en background (no bloquea la respuesta).

        OPTIMIZACIÓN CICLO 2:
        - is_critical=True → Prioridad ALTA (hot lead, opt-out, transfer)
          El Voz del turno N usa brief anterior, pero para turno N+1
          el brief crítico DEBE estar listo
        - is_critical=False → Prioridad normal

        FIX 4: Emotional Mirroring
        - Después de generar el brief, ajustarlo según emoción del prospecto
        """
        try:
            # Cuando es crítico, la regeneración es prioritaria
            # (el Voz del PRÓXIMO turno necesita este brief)
            brief = await self._master.regenerate_brief(
                ctx=self.ctx,
                historial=self.ctx.transcript,
                sales_state=self.ctx.sales_state,
                call_goal=self.ctx.call_goal,
                classification=classification,
                turno=self.ctx.turns,
            )

            # ═══ FIX 4: Emotional Mirroring (Tier 2: +5-10%) ═══
            # Ajustar el brief según la emoción detectada
            if classification:
                turns_since_emotion_changed = 0  # TODO: calcular desde last_emotion
                brief = self._emotional_adjuster.adjust_brief(
                    brief,
                    classification,
                    turns_since_emotion_changed,
                )
                logger.info("Brief ajustado por emoción: %s → tono=%s",
                           classification.emocion, brief.tono)

            self._current_brief = brief
            priority_label = "CRÍTICO" if is_critical else "normal"
            logger.info("Master: brief background actualizado [%s] → estrategia=%s",
                       priority_label, brief.estrategia)
        except Exception as exc:
            logger.warning("Master: fallo regeneración background: %s", exc)

    async def _on_user_started_speaking(self) -> None:
        logger.info("Barge-in detectado")
        if self._tts:
            await self._tts.cancel()
        if self.on_interrupt:
            await self.on_interrupt()
        self._is_agent_speaking = False
        self._turn_first_audio_seen = False
        metrics.record("barge_in")

    async def _on_llm_transcript(self, role: str, text: str) -> None:
        self.ctx.add_turn(role, text)
        if self.on_transcript:
            await self.on_transcript(role, text)
        # Loggear respuesta del agente en el último evento
        self._decision_logger.log_agent_response(text)

    async def _on_llm_text_chunk(self, text: str) -> None:
        if self._tts:
            await self._tts.send_text(text, flush=False)

    async def _on_llm_tool_call(self, function_calls: list[dict]) -> None:
        """Ejecuta tool calls en PARALELO para reducir latencia.

        OPTIMIZACIÓN: Si hay N tools, ejecutarlas concurrentemente.
        - Antes (secuencial): 200ms + 300ms + 150ms = 650ms
        - Después (paralelo): max(200, 300, 150) = 300ms
        - Ganancia: -350ms
        """
        tool_names = [fc["name"] for fc in function_calls]
        logger.info("Tool calls (parallelizado): %s", tool_names)
        if self._tts:
            await self._tts.flush()

        # ═══ EJECUTAR TOOLS EN PARALELO ═══
        async def execute_single_tool(fc):
            result = await tools_mod.execute_tool(fc["name"], fc["args"], self.ctx)
            return {"name": fc["name"], "result": result, "id": fc.get("id")}

        try:
            # Ejecutar todos los tools concurrentemente
            results = await asyncio.gather(
                *[execute_single_tool(fc) for fc in function_calls],
                return_exceptions=False,
            )
        except Exception as exc:
            logger.exception("Error ejecutando tools en paralelo: %s", exc)
            # Fallback: ejecutar secuencialmente si hay error
            results = []
            for fc in function_calls:
                result = await tools_mod.execute_tool(fc["name"], fc["args"], self.ctx)
                results.append({"name": fc["name"], "result": result, "id": fc.get("id")})

        # Loggear tools usadas
        self._decision_logger.log_agent_response("", tools_used=tool_names)
        if self._llm:
            await self._llm.send_tool_result(results)
