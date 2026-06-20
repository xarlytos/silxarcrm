"""Simulador de conversación AI por texto.

Permite probar el agente de ventas sin Twilio: el usuario actúa como el lead
(recepcionista) y la IA responde por texto usando el mismo pipeline de prompts,
tools y conocimiento que el modo voz.

Sesiones se mantienen en memoria (dict) con TTL de 30 min.
"""
from __future__ import annotations

import json
import logging
import time
import uuid
from dataclasses import dataclass, field
from typing import Any

from app.config import settings
from app.conversation.prompts import build_system_prompt, build_prompt_from_spech
from app.crm import postgres_repo
from app.gemini import tools as tools_module
from app.knowledge.rag import find_success_case
from app.modules import load_agent_config

logger = logging.getLogger(__name__)

_sessions: dict[str, "TextSession"] = {}
SESSION_TTL_S = 1800  # 30 min


@dataclass
class TextSession:
    sid: str
    software_id: str
    lead_id: str
    spech_id: str
    agente_id: int
    lead: dict[str, Any]
    spech: dict[str, Any] | None
    history: list[dict[str, str]] = field(default_factory=list)
    created_at: float = field(default_factory=time.time)
    last_at: float = field(default_factory=time.time)
    tools_executed: list[dict] = field(default_factory=list)

    def is_expired(self) -> bool:
        return time.time() - self.last_at > SESSION_TTL_S

    def add_message(self, role: str, text: str) -> None:
        self.history.append({"role": role, "text": text, "timestamp": time.time()})
        self.last_at = time.time()


def _cleanup_expired() -> None:
    expired = [sid for sid, s in _sessions.items() if s.is_expired()]
    for sid in expired:
        del _sessions[sid]


async def start_session(
    software_id: str,
    lead_id: str,
    spech_id: str = "",
    agente_id: int = 0,
) -> dict[str, Any]:
    """Inicia una sesión de simulación."""
    _cleanup_expired()

    lead = await postgres_repo.get_lead_by_id(lead_id)
    if not lead:
        # Intentar buscar por telefono
        lead = {"id": lead_id, "nombre": "Desconocido", "telefono": "", "empresa": "", "pais": ""}

    spech = await postgres_repo.get_spech(software_id, spech_id or None) if software_id else None

    sid = str(uuid.uuid4())[:12]
    session = TextSession(
        sid=sid,
        software_id=software_id,
        lead_id=lead_id,
        spech_id=spech_id,
        agente_id=agente_id,
        lead=lead,
        spech=spech,
    )

    # Generar primer mensaje de la IA (Mariana saluda)
    first_response = await _generate_ai_message(session, init=True)
    session.add_message("agente", first_response)

    _sessions[sid] = session
    return {
        "sid": sid,
        "lead": {k: v for k, v in lead.items() if k in ("id", "nombre", "telefono", "empresa", "pais")},
        "spech": spech,
        "firstMessage": first_response,
    }


async def send_message(sid: str, text: str) -> dict[str, Any]:
    """Envía un mensaje del usuario (recepcionista) y devuelve la respuesta de la IA."""
    session = _sessions.get(sid)
    if not session:
        return {"error": "Sesion no encontrada o expirada"}

    session.add_message("prospecto", text)

    ai_text = await _generate_ai_message(session)
    session.add_message("agente", ai_text)

    return {
        "sid": sid,
        "aiMessage": ai_text,
        "history": session.history,
        "toolsExecuted": session.tools_executed,
    }


async def _generate_ai_message(session: TextSession, init: bool = False) -> str:
    """Genera una respuesta de la IA usando Gemini en modo texto."""
    if not settings.gemini_api_key:
        return "[offline] Gemini API key no configurada."

    try:
        from google import genai
        from google.genai import types
    except ImportError:
        return "[offline] google-genai no disponible."

    # Construir system prompt (mismo que modo voz)
    from app.conversation.state import CallContext, SalesState

    ctx = CallContext(
        call_sid=f"sim-{session.sid}",
        phone=session.lead.get("telefono", ""),
        business_type="generico",
        business_name=session.lead.get("empresa") or session.lead.get("nombre") or "",
        city=session.lead.get("pais") or "",
        software_id=session.software_id,
        lead_id=session.lead_id,
        spech_id=session.spech_id,
        agente_id=session.agente_id,
        prospect=session.lead,
    )

    # Cargar configuración modular del software
    if session.software_id:
        try:
            ctx.agent_config = await load_agent_config(session.software_id)
        except Exception as exc:
            logger.warning("No se pudo cargar config para simulacion %s: %s", session.software_id, exc)

    spech_contenido = ""
    if session.spech and session.spech.get("contenido"):
        spech_contenido = build_prompt_from_spech(session.spech["contenido"], session.lead)

    system_prompt = build_system_prompt(ctx, spech_contenido, ctx.agent_config)

    # Historial como contenido
    contents = []
    if init:
        # Primera interacción: solo el system prompt, Gemini genera saludo
        contents.append(types.Content(
            role="user",
            parts=[types.Part(text="(La llamada acaba de conectar. El prospecto está al teléfono. Saluda y presentate brevemente.)")],
        ))
    else:
        # Incluir historial previo
        for msg in session.history:
            role = "user" if msg["role"] == "prospecto" else "model"
            contents.append(types.Content(
                role=role,
                parts=[types.Part(text=msg["text"])],
            ))

    # Function declarations (mismas que modo voz)
    declarations = []
    for tool in tools_module.TOOL_DECLARATIONS:
        declarations.append(types.FunctionDeclaration(
            name=tool["name"],
            description=tool["description"],
            parameters=types.Schema(
                type="object",
                properties={
                    k: types.Schema(type="string")
                    for k in tool.get("parameters", {}).get("properties", {}).keys()
                },
            ),
        ))

    client = genai.Client(api_key=settings.gemini_api_key)

    # Usar modelo de texto estable (no live) para el simulador
    text_model = settings.gemini_live_fallback_model.replace("-native-audio-latest", "").replace("-native-audio", "")
    if "-live" in text_model or "flash" not in text_model:
        text_model = "gemini-2.5-flash"

    response = client.models.generate_content(
        model=text_model,
        contents=contents,
        config=types.GenerateContentConfig(
            system_instruction=system_prompt,
            tools=[types.Tool(function_declarations=declarations)],
            temperature=0.7,
            max_output_tokens=1024,
        ),
    )

    # Manejar function calls
    result_text = ""
    if response.candidates and response.candidates[0].content.parts:
        for part in response.candidates[0].content.parts:
            if part.function_call:
                fc = part.function_call
                tool_result = await _execute_tool(fc.name, dict(fc.args or {}), session)
                session.tools_executed.append({
                    "tool": fc.name,
                    "args": dict(fc.args or {}),
                    "result": tool_result,
                })
                # Segunda pasada con el resultado de la tool
                contents.append(types.Content(
                    role="model",
                    parts=[types.Part(function_call=fc)],
                ))
                contents.append(types.Content(
                    role="user",
                    parts=[types.Part(
                        text=f"[RESULTADO DE {fc.name}]: {json.dumps(tool_result, ensure_ascii=False)}"
                    )],
                ))
                response2 = client.models.generate_content(
                    model=text_model,
                    contents=contents,
                    config=types.GenerateContentConfig(
                        system_instruction=system_prompt,
                        temperature=0.7,
                        max_output_tokens=1024,
                    ),
                )
                if response2.candidates and response2.candidates[0].content.parts:
                    result_text = response2.candidates[0].content.parts[0].text or ""
                else:
                    result_text = ""
                break
            elif part.text:
                result_text += part.text

    return result_text or "Mmm... disculpe, ¿me repite?"


async def _execute_tool(name: str, args: dict, session: TextSession) -> dict:
    """Ejecuta una tool de forma simulada (sin side-effects reales en dev)."""
    logger.info("Tool ejecutada en simulacion: %s(%s)", name, args)

    if name == "consultar_crm":
        return {"status": "ok", "lead": session.lead}

    if name == "buscar_caso_de_exito":
        tipo = args.get("tipo_negocio", "generico")
        result = await find_success_case(tipo, "")
        return {"caso": result or f"Un negocio de {tipo} redujo cancelaciones un 40%."}

    if name == "calcular_roi":
        try:
            citas = int(args.get("citas_por_semana", 20))
            precio = float(args.get("precio_promedio_cita", 30))
            cancel = int(args.get("cancelaciones_por_semana", 5))
            ahorro = cancel * precio * 4  # mensual
            return {"ahorro_mensual": ahorro, "roi": f"Ahorra ${ahorro}/mes solo en cancelaciones."}
        except (ValueError, TypeError):
            return {"error": "Datos invalidos"}

    if name == "comparar_con_competidor":
        herramienta = args.get("herramienta_actual", "Excel")
        return {
            "diferencias": [
                f"{herramienta} solo agenda. Nosotros tambien recordamos, cobramos y seguimos a clientes.",
                f"Migracion gratis desde {herramienta}.",
            ]
        }

    if name == "agendar_demo":
        fecha = args.get("fecha", "por confirmar")
        return {"status": "demo_agendada", "fecha": fecha, "nota": "(simulado)"}

    if name == "enviar_whatsapp":
        return {"status": "enviado", "tipo": args.get("tipo", "info")}

    if name == "transferir_humano":
        return {"status": "transferido", "nota": "Un humano se pondra en contacto."}

    return {"error": f"Tool {name} no implementada en simulacion"}


def get_session(sid: str) -> TextSession | None:
    return _sessions.get(sid)


def delete_session(sid: str) -> bool:
    if sid in _sessions:
        del _sessions[sid]
        return True
    return False
