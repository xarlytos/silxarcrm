"""WebSocket proxy entre navegador y Gemini Live API para simulación de llamadas.

El navegador envía/recibe audio PCM directamente:
  - Entrada (navegador → Gemini): PCM 16-bit LE, mono, 16 kHz
  - Salida (Gemini → navegador): PCM 16-bit LE, mono, 24 kHz

Control vía mensajes JSON:
  - start: inicia la sesión con lead + spech
  - stop: termina la llamada
  - transcript, interrupt, tool_call: eventos del servidor
"""
from __future__ import annotations

import asyncio
import json
import logging

from fastapi import WebSocket

from app.config import settings
from app.conversation.prompts import build_system_prompt, build_prompt_from_spech
from app.conversation.state import CallContext
from app.crm import postgres_repo
from app.elevenlabs.hybrid_session import HybridSession
from app.gemini.live_session import GeminiLiveSession
from app.modules import load_agent_config
from app.observability import metrics

logger = logging.getLogger(__name__)

# Tamaño de chunk de audio que enviamos al navegador (frames de ~20ms a 24kHz)
# Gemini devuelve chunks arbitrarios; acumulamos y enviamos cuando tenemos
# al menos este tamaño para evitar stuttering.
OUTPUT_CHUNK_BYTES = 960  # ~20ms de PCM16 24kHz mono


async def handle_browser_websocket(websocket: WebSocket) -> None:
    """Maneja una conexión WebSocket del navegador para simular una llamada AI."""
    await websocket.accept()

    session: GeminiLiveSession | HybridSession | None = None
    session_task: asyncio.Task | None = None
    _out_buffer = bytearray()  # acumulador de audio saliente
    _use_elevenlabs: list[bool] = [False]

    async def _send_json(data: dict) -> None:
        try:
            await websocket.send_text(json.dumps(data))
        except Exception as exc:
            logger.warning("No se pudo enviar JSON al navegador: %s", exc)

    async def _send_binary(data: bytes) -> None:
        try:
            await websocket.send_bytes(data)
        except Exception as exc:
            logger.warning("No se pudo enviar audio al navegador: %s", exc)

    async def on_audio(audio_data: bytes) -> None:
        """Callback: audio del agente → navegador.

        Gemini Live devuelve PCM 24kHz.
        ElevenLabs puede devolver μ-law 8kHz o PCM según configuración.
        El navegador espera PCM (Web Audio API).
        """
        if _use_elevenlabs[0] and settings.elevenlabs_tts_format == "ulaw_8000":
            # Convertir μ-law 8k a PCM 24k para el navegador
            try:
                import audioop
                pcm_8k = audioop.ulaw2lin(audio_data, 2)
                pcm_24k, _ = audioop.ratecv(pcm_8k, 2, 1, 8000, 24000, None)
                _out_buffer.extend(pcm_24k)
            except Exception as exc:
                logger.warning("Error convirtiendo μ-law a PCM para navegador: %s", exc)
                return
        else:
            _out_buffer.extend(audio_data)

        # Enviar en chunks de ~20ms para que el navegador no se quede sin buffer
        while len(_out_buffer) >= OUTPUT_CHUNK_BYTES:
            chunk = bytes(_out_buffer[:OUTPUT_CHUNK_BYTES])
            del _out_buffer[:OUTPUT_CHUNK_BYTES]
            await _send_binary(chunk)

    async def on_interrupt() -> None:
        """Callback: barge-in detectado."""
        _out_buffer.clear()
        await _send_json({"type": "interrupt"})
        metrics.record("barge_in")

    async def on_transcript(role: str, text: str) -> None:
        """Callback: transcripción del turno."""
        await _send_json({"type": "transcript", "role": role, "text": text})

    try:
        # --- Esperar mensaje de inicio ---
        raw = await websocket.receive_text()
        msg = json.loads(raw)
        if msg.get("type") != "start":
            await _send_json({"type": "error", "message": "Se esperaba mensaje 'start'"})
            return

        software_id = msg.get("softwareId", "")
        lead_id = msg.get("leadId", "")
        spech_id = msg.get("spechId", "")

        # --- Cargar datos del lead ---
        lead = await postgres_repo.get_lead_by_id(lead_id)
        if not lead and msg.get("phone"):
            lead = await postgres_repo.get_lead(msg["phone"], software_id)
        if not lead:
            lead = {
                "id": lead_id,
                "nombre": "Desconocido",
                "telefono": msg.get("phone", ""),
                "empresa": "",
                "pais": "",
                "estado": "NUEVO",
            }

        spech = None
        if software_id:
            spech = await postgres_repo.get_spech(software_id, spech_id or None)

        # --- Construir contexto y prompt ---
        ctx = CallContext(
            call_sid=f"sim-live-{id(websocket)}",
            phone=lead.get("telefono", ""),
            business_type="generico",
            business_name=lead.get("empresa") or lead.get("nombre") or "",
            city=lead.get("pais") or "",
            software_id=software_id,
            lead_id=lead_id,
            spech_id=spech_id,
            agente_id=0,
            prospect=lead,
        )

        # Cargar configuración modular del software
        if software_id:
            try:
                ctx.agent_config = await load_agent_config(software_id)
            except Exception as exc:
                logger.warning("No se pudo cargar config para live_audio %s: %s", software_id, exc)

        spech_contenido = ""
        if spech and spech.get("contenido"):
            spech_contenido = build_prompt_from_spech(spech["contenido"], lead)

        system_prompt = build_system_prompt(ctx, spech_contenido, ctx.agent_config)

        # --- Crear sesión según pipeline configurado ---
        use_elevenlabs = (
            settings.voice_pipeline == "elevenlabs"
            and settings.elevenlabs_api_key
        )

        if use_elevenlabs:
            _use_elevenlabs[0] = True
            session = HybridSession(
                ctx=ctx,
                system_prompt=system_prompt,
                on_audio=on_audio,
                on_interrupt=on_interrupt,
                on_transcript=on_transcript,
            )
            logger.info("Simulación con pipeline ElevenLabs para lead=%s", lead_id)
        else:
            _use_elevenlabs[0] = False
            session = GeminiLiveSession(
                ctx=ctx,
                system_prompt=system_prompt,
                on_audio=on_audio,
                on_interrupt=on_interrupt,
                on_transcript=on_transcript,
            )
            logger.info("Simulación con pipeline Gemini Live para lead=%s", lead_id)

        session_task = asyncio.create_task(session.run())
        await _send_json({"type": "status", "status": "connected"})
        logger.info("Simulación de audio iniciada para lead=%s", lead_id)

        # --- Bucle de recepción de audio del navegador ---
        while True:
            data = await websocket.receive()
            if "bytes" in data:
                # Audio PCM 16kHz del navegador → Gemini
                await session.send_audio(data["bytes"])
            elif "text" in data:
                text_msg = json.loads(data["text"])
                if text_msg.get("type") == "stop":
                    break
            else:
                break

    except Exception as exc:
        logger.exception("Error en simulación de audio")
        try:
            await _send_json({"type": "error", "message": str(exc)})
        except Exception:
            pass
    finally:
        # --- Cierre limpio ---
        if session is not None:
            await session.close()
        if session_task is not None:
            session_task.cancel()
            try:
                await session_task
            except asyncio.CancelledError:
                pass

        # Vaciar buffer restante
        if _out_buffer:
            try:
                await _send_binary(bytes(_out_buffer))
            except Exception:
                pass

        logger.info("Simulación de audio finalizada")
