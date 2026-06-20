"""Orquestador del WebSocket de Twilio Media Streams.

Une los tres extremos durante una llamada:
  Twilio (mu-law 8k)  <->  AudioBridge  <->  GeminiLiveSession (PCM 16k/24k)

Eventos de Twilio manejados: `start` (metadatos + parámetros), `media` (audio
entrante), `stop` (fin). Hacia Twilio enviamos `media` (frames de 20 ms) y
`clear` (vaciar reproducción en un barge-in).
"""
from __future__ import annotations

import asyncio
import base64
import json
import logging
import time

from app.audio.bridge import AudioBridge
from app.audio import dsp
from app.compliance.mx import detect_optout, register_optout
from app.conversation.prompts import build_system_prompt, build_prompt_from_spech
from app.conversation.signals import analyze_turn
from app.conversation.state import CallContext, ConversationStore
from app.config import settings
from app.crm import postgres_repo
from app.crm.supabase_repo import get_prospect, log_call as log_call_supabase
from app.modules import load_agent_config
from app.elevenlabs.hybrid_session import HybridSession
from app.gemini.live_session import GeminiLiveSession
from app.observability import alerts, metrics
from app.telephony.twilio_client import transfer_call
from app.post_call.nurture_engine import process_post_call

logger = logging.getLogger(__name__)

_store = ConversationStore(settings.redis_url)

# Registro de sesiones pre-calentadas, indexado por CallSid de Twilio. Se llena
# en /voice (al contestar) y se consume en /media (al abrir el WebSocket).
_warm: dict[str, dict] = {}
_warm_lock = asyncio.Lock()
# Si /media nunca reclama la sesión (llamada caída), se cierra tras este TTL.
WARM_TTL_S = 45


async def _build_session(
    call_sid: str,
    phone: str,
    business_type: str,
    business_name: str,
    city: str,
    software_id: str = "",
    lead_id: str = "",
    spech_id: str = "",
    agente_id: int = 0,
) -> tuple[GeminiLiveSession | HybridSession, CallContext]:
    """Crea ctx + sesión, pre-cargando los datos del prospecto y spech en el prompt."""
    # Intentar cargar desde PostgreSQL compartido
    lead = None
    spech = None
    if software_id:
        lead = await postgres_repo.get_lead(phone, software_id)
        spech = await postgres_repo.get_spech(software_id, spech_id)

    # Fallback a Supabase legacy
    if not lead or lead.get("status") in ("desconocido", "error", "offline"):
        prospect = await get_prospect(phone)
        lead = prospect
    else:
        lead = lead or {}

    ctx = CallContext(
        call_sid=call_sid,
        phone=phone,
        business_type=business_type,
        business_name=business_name or lead.get("empresa") or lead.get("nombre") or "",
        city=city or lead.get("pais") or "",
        software_id=software_id,
        lead_id=lead_id or lead.get("id", ""),
        spech_id=spech_id,
        agente_id=agente_id,
        prospect=lead,
    )

    # Cargar configuración modular del software (sistema LEGO)
    if software_id:
        try:
            ctx.agent_config = await load_agent_config(software_id)
        except Exception as exc:
            logger.warning("No se pudo cargar config para %s: %s", software_id, exc)

    # Construir prompt con spech del CRM si existe
    spech_contenido = ""
    if spech and spech.get("contenido"):
        spech_contenido = build_prompt_from_spech(spech["contenido"], lead)

    system_prompt = build_system_prompt(ctx, spech_contenido, ctx.agent_config)

    # Selector de pipeline
    use_elevenlabs = (
        settings.voice_pipeline == "elevenlabs"
        and settings.elevenlabs_api_key
    )

    if use_elevenlabs:
        logger.info("Usando pipeline híbrido ElevenLabs para call_sid=%s", call_sid)
        session = HybridSession(ctx=ctx, system_prompt=system_prompt)
    else:
        logger.info("Usando pipeline Gemini Live para call_sid=%s", call_sid)
        session = GeminiLiveSession(ctx=ctx, system_prompt=system_prompt)

    return session, ctx


async def prewarm_session(
    call_sid: str,
    phone: str,
    business_type: str = "generico",
    business_name: str = "",
    city: str = "",
    software_id: str = "",
    lead_id: str = "",
    spech_id: str = "",
    agente_id: int = 0,
) -> None:
    """Pre-calienta la conexión a Gemini al contestar (desde /voice).

    Arranca el handshake con Gemini mientras Twilio termina de montar el Media
    Stream, de modo que cuando llegue el primer audio la sesión ya esté lista.
    """
    if not call_sid or not phone:
        return
    async with _warm_lock:
        if call_sid in _warm:
            return
    try:
        session, ctx = await _build_session(
            call_sid, phone, business_type, business_name, city,
            software_id, lead_id, spech_id, agente_id,
        )
    except Exception:  # noqa: BLE001
        logger.exception("Fallo pre-calentando sesión %s", call_sid)
        return
    task = asyncio.create_task(session.run())
    async with _warm_lock:
        _warm[call_sid] = {"session": session, "task": task, "ctx": ctx, "ts": time.time()}
    metrics.record("session_prewarmed")
    asyncio.create_task(_expire_warm(call_sid))


async def _expire_warm(call_sid: str) -> None:
    await asyncio.sleep(WARM_TTL_S)
    async with _warm_lock:
        entry = _warm.pop(call_sid, None)
    if entry:
        logger.info("Sesión pre-calentada %s expiró sin usarse; cerrando", call_sid)
        await entry["session"].close()
        entry["task"].cancel()


async def _claim_warm(call_sid: str) -> dict | None:
    async with _warm_lock:
        return _warm.pop(call_sid, None)


async def _notify_backend(event: str, ctx: CallContext, extra: dict | None = None) -> None:
    """Notifica al backend Express vía webhook del estado de la llamada."""
    if not settings.backend_webhook_url:
        return
    try:
        import httpx

        payload = {
            "event": event,
            "callSid": ctx.call_sid,
            "phone": ctx.phone,
            "softwareId": ctx.software_id,
            "leadId": ctx.lead_id,
            "outcome": ctx.outcome,
            "transcript": ctx.transcript,
            "durationS": int(ctx.elapsed_s()),
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }
        if extra:
            payload.update(extra)

        await httpx.AsyncClient(timeout=10).post(
            f"{settings.backend_webhook_url}/api/llamadas/webhook/ai",
            json=payload,
            headers={
                "Content-Type": "application/json",
                "X-Agent-Secret": settings.backend_webhook_secret,
            },
        )
    except Exception as exc:
        logger.warning("No se pudo notificar al backend: %s", exc)


async def handle_media_stream(websocket) -> None:
    """Maneja una conexión WebSocket de Twilio Media Streams (una llamada)."""
    await websocket.accept()
    stream_sid: str | None = None
    bridge = AudioBridge()
    session: GeminiLiveSession | HybridSession | None = None
    ctx: CallContext | None = None
    session_task: asyncio.Task | None = None
    # Último nivel RMS de entrada (lista de 1 para mutar desde callbacks anidados).
    _last_inbound_rms: list[float | None] = [None]
    # Flag para saber si usamos pipeline ElevenLabs (μ-law directo)
    _use_elevenlabs: list[bool] = [False]

    # === BARGE-IN DE 3 CAPAS (agresivo para reducir latencia percibida) ===
    _barge_in_state = {
        "energy_frames": 0,
        "speech_start_ms": 0,
        "total_speech_ms": 0,
        "is_interrupting": False,
        "last_clear_sent_ms": 0,
    }
    BARGE_ENERGY_THRESHOLD = 0.015  # Umbral de energía para detectar voz
    BARGE_ENERGY_FRAMES = 3         # Frames consecutivos para trigger
    BARGE_MIN_SPEECH_MS = 150       # Mínimo para considerar interrupción real
    BARGE_DEBOUNCE_MS = 500         # No enviar clear más de 1 vez cada 500ms

    async def send_to_twilio(audio_data: bytes) -> None:
        """Envía audio al WebSocket de Twilio. Soporta PCM (Gemini) y μ-law directo (ElevenLabs)."""
        if _use_elevenlabs[0] and settings.elevenlabs_tts_format == "ulaw_8000":
            # ElevenLabs ya devuelve μ-law 8k, solo hay que framear
            for frame in bridge.pack_ulaw_frames(audio_data):
                await websocket.send_text(
                    json.dumps(
                        {
                            "event": "media",
                            "streamSid": stream_sid,
                            "media": {"payload": base64.b64encode(frame).decode("ascii")},
                        }
                    )
                )
        else:
            # Pipeline original: PCM 24k -> μ-law 8k
            for frame in bridge.gemini_to_twilio_frames(audio_data):
                await websocket.send_text(
                    json.dumps(
                        {
                            "event": "media",
                            "streamSid": stream_sid,
                            "media": {"payload": base64.b64encode(frame).decode("ascii")},
                        }
                    )
                )

    async def on_interrupt() -> None:
        # Barge-in: vaciar lo encolado y pedir a Twilio que corte la reproducción.
        bridge.clear_output()
        if stream_sid:
            await websocket.send_text(
                json.dumps({"event": "clear", "streamSid": stream_sid})
            )
        metrics.record("barge_in")

    async def check_barge_in_aggressive(rms: float, frame_duration_ms: int = 20) -> None:
        """Barge-in de 3 capas: detecta interrupción del usuario temprano.

        Capa 1: Energía VAD > umbral por N frames consecutivos
        Capa 2: Duración mínima de habla > 150ms
        Capa 3: Debounce (no enviar clear más de 1 vez cada 500ms)
        """
        now_ms = int(time.time() * 1000)

        # Debounce: no enviar clear tan frecuentemente
        if now_ms - _barge_in_state["last_clear_sent_ms"] < BARGE_DEBOUNCE_MS:
            return

        # Capa 1: Detección de energía
        if rms > BARGE_ENERGY_THRESHOLD:
            _barge_in_state["energy_frames"] += 1
            if _barge_in_state["speech_start_ms"] == 0:
                _barge_in_state["speech_start_ms"] = now_ms
        else:
            # Reset si hay silencio
            if _barge_in_state["energy_frames"] > 0:
                _barge_in_state["energy_frames"] -= 1
            if _barge_in_state["energy_frames"] <= 0:
                _barge_in_state["energy_frames"] = 0
                _barge_in_state["speech_start_ms"] = 0
                _barge_in_state["is_interrupting"] = False

        # Capa 2: Confirmar duración mínima
        if _barge_in_state["energy_frames"] >= BARGE_ENERGY_FRAMES:
            speech_duration = now_ms - _barge_in_state["speech_start_ms"]
            if speech_duration >= BARGE_MIN_SPEECH_MS and not _barge_in_state["is_interrupting"]:
                _barge_in_state["is_interrupting"] = True
                _barge_in_state["last_clear_sent_ms"] = now_ms
                logger.debug("Barge-in agresivo detectado: %.0fms de habla, RMS=%.3f", speech_duration, rms)
                await on_interrupt()

    async def on_transcript(role: str, text: str) -> None:
        if ctx is None:
            return
        ctx.add_turn(role, text)

        # ═══ COMPLIANCE: Detectar respuesta de consentimiento de grabación ═══
        if (
            ctx.recording_consent_pending
            and not ctx.recording_consented
            and role == "prospecto"
        ):
            # Palabras de consentimiento
            consent_keywords = (
                "sí", "si", "vale", "claro", "ok", "de acuerdo", "perfecto",
                "adelante", "está bien", "no hay problema", "claro que sí"
            )
            # Palabras de rechazo
            reject_keywords = (
                "no", "nah", "no gracias", "prefiero no", "sin grabar",
                "no me grabes", "no autorizo"
            )

            text_lower = text.lower().strip()

            if any(kw in text_lower for kw in consent_keywords):
                ctx.recording_consent_pending = False
                ctx.recording_consented = True
                logger.info(
                    "COMPLIANCE: Consentimiento de grabación OTORGADO para %s",
                    ctx.phone
                )
                # Log compliance
                from app.compliance.mx import log_compliance_event
                await log_compliance_event(
                    phone=ctx.phone,
                    event_type="recording_consented",
                    details={"response": text[:100]},
                    lead_id=ctx.lead_id,
                    software_id=ctx.software_id,
                )

            elif any(kw in text_lower for kw in reject_keywords):
                ctx.recording_consent_pending = False
                ctx.recording_consented = False
                logger.warning(
                    "COMPLIANCE: Prospecto RECHAZÓ consentimiento de grabación para %s",
                    ctx.phone,
                )
                # Log compliance: Rechazo
                from app.compliance.mx import log_compliance_event
                await log_compliance_event(
                    phone=ctx.phone,
                    event_type="recording_consent_rejected",
                    details={"response": text[:100]},
                    lead_id=ctx.lead_id,
                    software_id=ctx.software_id,
                )
                # Opcionalmente: mensaje al agente para que respete
                logger.info("COMPLIANCE: Grabar = False para esta llamada")

        # Conversación sostenida (señal de embudo): >30s con varios turnos.
        if ctx.turns == 4:
            metrics.record("conversation_30s")

        if role == "prospecto":
            if detect_optout(text):
                ctx.outcome = "optout"
                await register_optout(ctx.phone, reason="detected_in_call")
                # LOG compliance: Opt-out detected
                from app.compliance.mx import log_compliance_event
                await log_compliance_event(
                    phone=ctx.phone,
                    event_type="optout_detected",
                    details={"text": text[:100], "turn": ctx.turns},
                    lead_id=ctx.lead_id,
                    software_id=ctx.software_id
                )

            sig = analyze_turn(text, rms=_last_inbound_rms[0])
            ctx.emotion = sig.emotion
            ctx.apply_frustration(sig.frustration_delta)
            if sig.emotion == "interesado":
                metrics.record("interes")
            if ctx.frustration >= settings.frustration_alert_threshold:
                metrics.record("sentimiento_negativo")
                await alerts.alert(alerts.NEGATIVE_SENTIMENT, f"{ctx.phone}: frustración {ctx.frustration}/10")

        await _store.save(ctx)

    try:
        async for raw in websocket.iter_text():
            data = json.loads(raw)
            event = data.get("event")

            if event == "start":
                start = data["start"]
                stream_sid = start["streamSid"]
                call_sid = start.get("callSid", stream_sid)

                warm = await _claim_warm(call_sid)
                if warm is not None:
                    # Sesión ya conectada durante el timbre: handshake fuera del
                    # camino crítico.
                    session, ctx, session_task = warm["session"], warm["ctx"], warm["task"]
                    metrics.record("session_warm_hit")
                else:
                    params = start.get("customParameters", {}) or {}
                    session, ctx = await _build_session(
                        call_sid,
                        params.get("phone", "desconocido"),
                        params.get("business_type", "generico"),
                        params.get("business_name", ""),
                        params.get("city", ""),
                        params.get("software_id", ""),
                        params.get("lead_id", ""),
                        params.get("spech_id", ""),
                        int(params.get("agente_id", 0) or 0),
                    )
                    session_task = asyncio.create_task(session.run())
                    metrics.record("session_cold_start")

                metrics.record("call_started")

                # Detectar pipeline activo
                if isinstance(session, HybridSession):
                    _use_elevenlabs[0] = True
                    metrics.record("pipeline_elevenlabs")
                else:
                    _use_elevenlabs[0] = False
                    metrics.record("pipeline_gemini")

                # Cablea los callbacks reales (Twilio) a la sesión.
                await session.attach(send_to_twilio, on_interrupt, on_transcript)

                # ═══ COMPLIANCE: Solicitar consentimiento de grabación ═══
                # ANTES de grabar, preguntar si autoriza grabar la llamada
                # (requisito legal: GDPR, CCPA, normativas MX)
                from app.compliance.mx import must_get_recording_consent, log_compliance_event

                recording_consent_q = must_get_recording_consent()
                ctx.recording_consent_pending = True  # Flag para saber si ya preguntamos
                ctx.recording_consented = False        # Respuesta del prospecto

                logger.info(
                    "COMPLIANCE: Esperando consentimiento de grabación para %s",
                    ctx.phone
                )

                logger.info("Llamada iniciada stream=%s phone=%s", stream_sid, ctx.phone)

            elif event == "media" and session is not None:
                payload = data["media"]["payload"]
                ulaw = base64.b64decode(payload)
                pcm16k = bridge.twilio_to_gemini(ulaw)
                rms = dsp.rms_level(pcm16k)
                _last_inbound_rms[0] = rms

                # Barge-in agresivo de 3 capas: detectar interrupción por energía
                # antes de que STT/LLM confirmen (ahorra 100-300ms de latencia percibida)
                await check_barge_in_aggressive(rms)

                if settings.enable_input_dsp:
                    pcm16k = dsp.preprocess_inbound(pcm16k)
                await session.send_audio(pcm16k)

            elif event == "stop":
                logger.info("Twilio envió stop para stream=%s", stream_sid)
                break

    except Exception as exc:  # noqa: BLE001
        logger.exception("Error en el WebSocket de Media Streams")
        metrics.record("technical_issue")
        await alerts.alert(alerts.TECHNICAL_ISSUE, f"stream={stream_sid}: {exc}")
    finally:
        if session is not None:
            await session.close()
        if session_task is not None:
            session_task.cancel()
        if ctx is not None:
            # Transferencia a humano si se solicitó durante la llamada.
            if ctx.transfer_requested and settings.human_transfer_number:
                transfer_call(ctx.call_sid, settings.human_transfer_number)
                await alerts.alert(alerts.TRANSFER_NEEDED, f"{ctx.phone}: {ctx.transfer_reason}")
            if ctx.outcome == "demo_agendada":
                await alerts.alert(alerts.HOT_LEAD, f"{ctx.phone}: demo agendada")
            if ctx.elapsed_s() >= settings.long_call_seconds:
                await alerts.alert(alerts.LONG_CALL, f"{ctx.phone}: {ctx.elapsed_s():.0f}s (posible interés alto)")
            metrics.record(f"outcome_{ctx.outcome}")

            # Guardar en PostgreSQL compartido (primario) o Supabase (legacy fallback)
            duration_s = int(ctx.elapsed_s())
            if ctx.software_id:
                await postgres_repo.log_call(
                    call_sid=ctx.call_sid,
                    phone=ctx.phone,
                    outcome=ctx.outcome,
                    transcript=ctx.transcript,
                    duration_s=duration_s,
                    software_id=ctx.software_id,
                    lead_id=ctx.lead_id,
                    metadata={"emotion": ctx.emotion, "frustration": ctx.frustration, "turns": ctx.turns},
                )
            await log_call_supabase(ctx)
            await _store.save(ctx)

            # === POST-CALL WORKFLOW (Nurture Engine) ===
            # Extraer fecha de demo si fue agendada (del metadata de la llamada)
            fecha_demo = None
            try:
                if ctx.outcome == "demo_agendada" and ctx.metadata:
                    fecha_demo = (ctx.metadata or {}).get("demo_fecha")
            except Exception:
                pass

            try:
                from app.post_call.nurture_engine import process_post_call
                await process_post_call(ctx, stream_sid=stream_sid, fecha_demo=fecha_demo)
            except Exception as exc:
                logger.warning("Error en post-call workflow: %s", exc)

            # Notificar al backend Express (webhook básico de compatibilidad)
            await _notify_backend("call_ended", ctx, {"streamSid": stream_sid})
        logger.info("Llamada finalizada stream=%s", stream_sid)
