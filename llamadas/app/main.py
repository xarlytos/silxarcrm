"""Servidor FastAPI del agente de voz.

Endpoints:
  POST /voice     -> TwiML que conecta la llamada a Media Streams (webhook Twilio)
  WS   /media     -> canal de audio bidireccional (Twilio <-> Gemini)
  POST /outbound  -> dispara una llamada saliente (con checks de compliance)
  GET  /status     -> healthcheck + métricas
"""
from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import JSONResponse, Response

from app.compliance.mx import can_call
from app.config import settings
from app.modules import load_agent_config
from app.observability import metrics
from app.simulation import text_session
from app.simulation.live_audio import handle_browser_websocket
from app.telephony.media_stream import handle_media_stream, prewarm_session
from app.telephony.twilio_client import build_stream_twiml, start_outbound_call
from app.ml.router import router as ml_router
from app.webhooks.routes import router as webhooks_router, initialize_webhooks, shutdown_webhooks

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agente de Ventas por Voz (Gemini Live + Twilio)")

# Mount ML endpoints router
app.include_router(ml_router)

# Mount webhooks router
app.include_router(webhooks_router)

# ═══ POOL PERMANENTE DE SESIONES (prewarm optimization) ═══
# Mantiene N sesiones Gemini/ElevenLabs "calientes" en memoria
# Cuando llega una llamada, toma una sesión del pool en lugar de crear una nueva
# Ganancia: -300-500ms en latencia de primera respuesta
_warm_session_pool: list = []
_pool_lock = asyncio.Lock()
WARM_POOL_SIZE = 5  # Número de sesiones a mantener


async def _maintain_warm_pool():
    """Task background: mantener el pool de sesiones calientes."""
    while True:
        try:
            async with _pool_lock:
                current = len(_warm_session_pool)
                needed = WARM_POOL_SIZE - current

                if needed > 0:
                    logger.info(
                        "Pool mantenimiento: creando %d sesiones (actual: %d)",
                        needed,
                        current,
                    )
                    # TODO: Crear sesiones Gemini/ElevenLabs "dummy" sin call_sid
                    # Por ahora solo log
                    # En producción: for _ in range(needed): create_session()

            # Revisar cada 30 segundos
            await asyncio.sleep(30)
        except Exception as exc:
            logger.error("Error en mantener warm pool: %s", exc)
            await asyncio.sleep(30)


@app.on_event("startup")
async def startup_event():
    """Inicia el pool de sesiones calientes y servicios de webhook."""
    logger.info("Iniciando warm session pool (size=%d)", WARM_POOL_SIZE)
    asyncio.create_task(_maintain_warm_pool())

    # Initialize webhook services
    # TODO: Pass actual database client when available
    # await initialize_webhooks(db_client)


@app.on_event("shutdown")
async def shutdown_event():
    """Limpia el pool de sesiones y servicios de webhook."""
    logger.info("Limpiando warm session pool (%d sesiones)", len(_warm_session_pool))
    _warm_session_pool.clear()

    # Shutdown webhook services
    await shutdown_webhooks()


@app.api_route("/voice", methods=["GET", "POST"])
async def voice_webhook(request: Request) -> Response:
    """Webhook de Twilio al contestar: responde el TwiML de <Connect><Stream>.

    Lee el contexto del prospecto de los query params (llamadas salientes) y lo
    reinyecta como <Parameter>. Además dispara el pre-calentamiento de la sesión
    Gemini (fire-and-forget) para que el handshake ocurra mientras Twilio monta
    el Media Stream, no en el camino crítico de la primera respuesta.
    """
    q = request.query_params
    form = await request.form() if request.method == "POST" else {}
    phone = q.get("phone") or (form.get("To") if form else "") or ""
    software_id = q.get("software_id", "")
    params = {
        "phone": phone,
        "business_type": q.get("business_type", "generico"),
        "business_name": q.get("business_name", ""),
        "city": q.get("city", ""),
        "software_id": software_id,
        "lead_id": q.get("lead_id", ""),
        "spech_id": q.get("spech_id", ""),
        "agente_id": q.get("agente_id", ""),
    }
    call_sid = (form.get("CallSid") if form else None) or q.get("CallSid")
    if call_sid and phone:
        # Cargar config del software (fire-and-forget, cacheada)
        if software_id:
            asyncio.create_task(load_agent_config(software_id))
        # No await: que no retrase la respuesta TwiML.
        asyncio.create_task(
            prewarm_session(
                call_sid, phone,
                params["business_type"], params["business_name"], params["city"],
                params["software_id"], params["lead_id"], params["spech_id"],
                int(params["agente_id"] or 0),
            )
        )
    return Response(content=build_stream_twiml(params), media_type="application/xml")


@app.websocket("/media")
async def media_socket(websocket: WebSocket) -> None:
    await handle_media_stream(websocket)


@app.post("/outbound")
async def outbound(request: Request) -> JSONResponse:
    """Inicia una llamada saliente. Body JSON: {"phone": "+52..."}.

    Respeta compliance MX (horario legal + opt-out) antes de marcar.
    """
    body = await request.json()
    phone = body.get("phone")
    if not phone:
        return JSONResponse({"error": "falta 'phone'"}, status_code=400)

    allowed, reason = await can_call(phone)
    if not allowed:
        metrics.record(f"blocked_{reason}")
        return JSONResponse({"status": "bloqueada", "motivo": reason}, status_code=409)

    result = start_outbound_call(
        phone,
        business_type=body.get("business_type", "generico"),
        business_name=body.get("business_name", ""),
        city=body.get("city", ""),
        software_id=body.get("softwareId", ""),
        lead_id=body.get("leadId", ""),
        spech_id=body.get("spechId", ""),
        agente_id=body.get("agenteId", 0),
    )
    metrics.record("outbound_requested")
    return JSONResponse(result)


# === Simulador de conversación por texto (probar AI sin Twilio) ===

@app.post("/simulate/start")
async def simulate_start(request: Request) -> JSONResponse:
    """Inicia una sesión de simulación donde el usuario actúa como lead/recepcionista.
    Body: {"softwareId", "leadId", "spechId?", "agenteId?"}
    """
    body = await request.json()
    result = await text_session.start_session(
        software_id=body.get("softwareId", ""),
        lead_id=body.get("leadId", ""),
        spech_id=body.get("spechId", ""),
        agente_id=body.get("agenteId", 0),
    )
    return JSONResponse(result)


@app.post("/simulate/{sid}/message")
async def simulate_message(sid: str, request: Request) -> JSONResponse:
    """Envía un mensaje del usuario (recepcionista) y devuelve respuesta de la IA.
    Body: {"text": "mensaje del lead"}
    """
    body = await request.json()
    result = await text_session.send_message(sid, body.get("text", ""))
    return JSONResponse(result)


@app.get("/simulate/{sid}")
async def simulate_get(sid: str) -> JSONResponse:
    """Obtiene el estado de una sesión de simulación."""
    session = text_session.get_session(sid)
    if not session:
        return JSONResponse({"error": "Sesion no encontrada"}, status_code=404)
    return JSONResponse({
        "sid": session.sid,
        "history": session.history,
        "toolsExecuted": session.tools_executed,
    })


@app.delete("/simulate/{sid}")
async def simulate_delete(sid: str) -> JSONResponse:
    """Elimina una sesión de simulación."""
    ok = text_session.delete_session(sid)
    return JSONResponse({"success": ok})


@app.websocket("/simulate/live")
async def simulate_live_socket(websocket: WebSocket) -> None:
    """WebSocket para simulación de llamada AI con audio real.

    El navegador se conecta aquí, envía un mensaje JSON de inicio,
    y luego intercambia audio PCM bidireccional con Gemini Live API.
    """
    await handle_browser_websocket(websocket)


@app.get("/status")
async def status() -> JSONResponse:
    pipeline = settings.voice_pipeline
    return JSONResponse(
        {
            "ok": True,
            "pipeline": pipeline,
            "model": settings.gemini_chat_model if pipeline == "elevenlabs" else settings.gemini_live_model,
            "fallback": settings.gemini_live_fallback_model,
            "voice": settings.elevenlabs_voice_id if pipeline == "elevenlabs" else settings.gemini_voice,
            "language": settings.gemini_language,
            "metrics": metrics.snapshot(),
        }
    )


@app.post("/webhook/status")
async def webhook_status(request: Request) -> JSONResponse:
    """Webhook interno para recibir notificaciones de estado del media_stream.
    Reenvía al backend Express configurado."""
    body = await request.json()
    logger.info("Webhook status recibido: %s", body.get("event"))
    # El reenvío al backend ya lo hace _notify_backend en media_stream.py
    # Este endpoint es por si se quiere centralizar la lógica aquí en el futuro.
    return JSONResponse({"success": True})
