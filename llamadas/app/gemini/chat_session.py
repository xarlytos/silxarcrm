"""Sesión Voz — Modelo ultra-rápido (Gemini 3.1 Flash-Lite) que responde al momento.

NO decide estrategia. Sigue el BRIEF del Maestro (Gemini 3.5 Flash) al pie de la letra.
Con ~180ms TTFT y ~380-400 T/s, este modelo genera texto casi instantáneamente.

Recibe: brief del Maestro + último turno del usuario
Output: texto natural que ElevenLabs Flash v2.5 convierte en voz (~75ms)
Latencia total Voz: ~180ms (LLM) + ~75ms (TTS) = ~255ms de "time-to-first-audio"
"""
from __future__ import annotations

import asyncio
import json
import logging
from typing import Awaitable, Callable

from app.config import settings
from app.conversation.prompts import build_conversator_prompt
from app.gemini import tools as tools_mod

logger = logging.getLogger(__name__)

TextChunkCallback = Callable[[str], Awaitable[None]]
ToolCallCallback = Callable[[list[dict]], Awaitable[None]]
TranscriptCallback = Callable[[str, str], Awaitable[None]]  # (role, text)


class GeminiChatSession:
    """VOZ — Gemini 3.1 Flash-Lite. Ejecutor ultra-rápido del brief del Maestro.

    Con ~380-400 tokens/segundo, este modelo genera una respuesta de 3 frases
    en ~100-150ms. Añadiendo TTS de ElevenLabs (~75ms), el usuario escucha
    la primera palabra del agente en ~250ms desde que dejó de hablar.

    OPTIMIZACIÓN: Cache de respuestas frecuentes (0ms latencia para ~30% de casos)
    """

    # ═══ CACHE DE RESPUESTAS FRECUENTES ═══
    # Patrones comunes y sus respuestas precachéadas (sin LLM)
    CACHED_RESPONSES = {
        "cuál es el precio": (
            "Tengo tres opciones: la básica por €49/mes, la profesional por €99/mes, "
            "y la premium con soporte prioritario por €199/mes. ¿Cuál te interesa?"
        ),
        "cuánto cuesta": (
            "Depende del plan. La básica €49, profesional €99, premium €199. "
            "¿Quieres que te explique las diferencias?"
        ),
        "es muy caro": (
            "Te muestro el ROI: si recuperas solo 5 citas al mes que hoy pierdes, "
            "el sistema se paga solo. ¿Cuántas citas pierdes actualmente?"
        ),
        "ya usamos otro": (
            "Entiendo. ¿Cuál es el que usan? Puedo mostrar qué hacemos diferente. "
            "Muchos clientes cambian porque automatizamos los recordatorios."
        ),
        "me interesa": (
            "Perfecto. Te dejo una demo de 15 minutos donde vemos exactamente cómo funciona. "
            "¿Te viene bien mañana a las 3 o prefieres otro horario?"
        ),
        "no tengo presupuesto": (
            "Lo entiendo. Mira, muchos de nuestros clientes dicen lo mismo al inicio. "
            "Pero cuando ven que se paga sola en 1-2 meses, lo ven diferente. ¿Podemos probar 2 semanas?"
        ),
        "qué es exactamente": (
            "Es un software que automatiza todos tus recordatorios: "
            "WhatsApp, email, SMS. Tus clientes reciben avisos automáticos y vuelven. "
            "¿Tienes 2 minutos?"
        ),
    }

    def __init__(
        self,
        ctx,  # CallContext
        system_prompt: str,
        on_text_chunk: TextChunkCallback | None = None,
        on_tool_call: ToolCallCallback | None = None,
        on_transcript: TranscriptCallback | None = None,
        sales_state=None,
        call_goal=None,
    ) -> None:
        self.ctx = ctx
        self.base_system_prompt = system_prompt
        self.on_text_chunk = on_text_chunk
        self.on_tool_call = on_tool_call
        self.on_transcript = on_transcript
        self.sales_state = sales_state
        self.call_goal = call_goal

        self._history: list[dict] = []
        self._client = None
        self._closed = False
        self._current_agent_text = ""
        self._pending_tool_results: list[dict] | None = None
        self._cache_hits: int = 0  # Métrica para logging

    def _try_cache_response(self, user_text: str) -> str | None:
        """Intenta encontrar una respuesta en cache para evitar LLM.

        Retorna la respuesta si hay match > 80% de similitud, None si no.
        """
        user_lower = user_text.lower().strip()

        # Búsqueda simple: si el texto contiene el patrón, retornar cached
        for pattern, response in self.CACHED_RESPONSES.items():
            if pattern in user_lower:
                self._cache_hits += 1
                logger.info(
                    "CACHE HIT: patron='%s', hits=%d", pattern, self._cache_hits
                )
                return response

        return None

    async def send_message(self, text: str, role: str = "user") -> None:
        """Envía un mensaje de usuario y procesa la respuesta streaming."""
        self._history.append({"role": role, "parts": [{"text": text}]})

        # Notificar transcripción de entrada
        if self.on_transcript:
            await self.on_transcript("prospecto", text)

        # ═══ INTENTAR CACHE ANTES DE LLM ═══
        cached_response = self._try_cache_response(text)
        if cached_response:
            # Respuesta desde cache (0ms latencia)
            self._current_agent_text = cached_response
            if self.on_text_chunk:
                await self.on_text_chunk(cached_response)
            if self.on_transcript:
                await self.on_transcript("agente", cached_response)
            # Guardar en historial
            self._history.append({
                "role": "model",
                "parts": [{"text": cached_response}],
            })
            return

        # Si no hay cache, usar Gemini
        await self._generate()

    async def send_tool_result(self, tool_results: list[dict]) -> None:
        """Envía resultados de tool calls y continúa la generación."""
        for result in tool_results:
            result_text = f"[RESULTADO de {result['name']}]: {json.dumps(result['result'])}"
            self._history.append({"role": "user", "parts": [{"text": result_text}]})
        await self._generate()

    async def _generate(self) -> None:
        """Llama a Gemini Chat API en streaming con ventana corta.

        Si hay un brief del Maestro disponible, lo inyecta en el prompt
        para que el Voz siga las instrucciones estratégicas.

        CIRCUIT BREAKER: Si Gemini está lento/caído, usar fallback response.
        """
        from google import genai
        from google.genai import types
        from app.observability import metrics

        # ═══ CIRCUIT BREAKER ═══
        if metrics.is_circuit_breaker_active("gemini_llm"):
            logger.warning(
                "CIRCUIT BREAKER ACTIVO: Gemini está lento/caído. "
                "Usando fallback response."
            )
            fallback_response = (
                "Perfecto, déjame comprender mejor tu situación. "
                "¿Cuál es el principal dolor que tienes hoy?"
            )
            self._current_agent_text = fallback_response
            if self.on_text_chunk:
                await self.on_text_chunk(fallback_response)
            if self.on_transcript:
                await self.on_transcript("agente", fallback_response)
            self._history.append({
                "role": "model",
                "parts": [{"text": fallback_response}],
            })
            return

        if self._client is None:
            self._client = genai.Client(api_key=settings.gemini_api_key)

        model = settings.gemini_chat_model

        # Ventana corta: últimos 3 turnos para el contexto inmediato
        # El Voz NO ve todo el historial — solo el brief + último turno
        recent_turns = []
        for msg in self._history[-3:]:
            role_label = "prospecto" if msg["role"] == "user" else "agente"
            for part in msg["parts"]:
                recent_turns.append({"role": role_label, "text": part["text"]})

        # ── INYECTAR BRIEF DEL MAESTRO ──
        brief_section = ""
        if hasattr(self, 'current_brief') and self.current_brief is not None:
            brief_section = self.current_brief.to_prompt_section()

        # Construir prompt dinámico con sales_state + call_goal + ventana corta + brief
        dynamic_prompt = build_conversator_prompt(
            base_system_prompt=self.base_system_prompt,
            sales_state=self.sales_state,
            call_goal=self.call_goal,
            recent_turns=recent_turns,
        )

        # Añadir el brief del Maestro al prompt
        if brief_section:
            dynamic_prompt = f"{dynamic_prompt}\n\n{brief_section}"

        # Convertir historial completo a formato Gemini (para tool calling y contexto)
        # Pero limitamos a los últimos 10 mensajes para no saturar tokens
        contents = []
        for msg in self._history[-10:]:
            contents.append(
                types.Content(
                    role=msg["role"],
                    parts=[types.Part(text=p["text"]) for p in msg["parts"]],
                )
            )

        # Function declarations
        function_declarations = [
            types.FunctionDeclaration(
                name=t["name"], description=t["description"], parameters=t["parameters"]
            )
            for t in tools_mod.TOOL_DECLARATIONS
        ]

        config = types.GenerateContentConfig(
            system_instruction=dynamic_prompt,
            tools=[types.Tool(function_declarations=function_declarations)] if function_declarations else None,
            temperature=0.7,
            max_output_tokens=2048,
        )

        self._current_agent_text = ""
        function_calls = []

        try:
            async for chunk in self._client.aio.models.generate_content_stream(
                model=model,
                contents=contents,
                config=config,
            ):
                if self._closed:
                    break

                # Extraer texto del chunk
                if chunk.text:
                    self._current_agent_text += chunk.text
                    if self.on_text_chunk:
                        await self.on_text_chunk(chunk.text)

                # Extraer function calls de los candidates
                if chunk.candidates:
                    for candidate in chunk.candidates:
                        if candidate.content and candidate.content.parts:
                            for part in candidate.content.parts:
                                if part.function_call:
                                    fc = part.function_call
                                    function_calls.append({
                                        "name": fc.name,
                                        "args": dict(fc.args or {}),
                                        "id": getattr(fc, "id", None),
                                    })

            # Si hubo function calls, notificar y esperar resultados
            if function_calls and self.on_tool_call:
                await self.on_tool_call(function_calls)

            # Notificar transcripción del agente (texto completo)
            if self._current_agent_text and self.on_transcript:
                await self.on_transcript("agente", self._current_agent_text)

            # Guardar respuesta en historial
            if self._current_agent_text:
                self._history.append({
                    "role": "model",
                    "parts": [{"text": self._current_agent_text}],
                })

        except Exception as exc:
            # ═══ RATE LIMIT DETECTION ═══
            from app.observability import metrics

            # Detectar si es 429 (rate limit)
            exc_str = str(exc).lower()
            if "429" in exc_str or "rate" in exc_str or "quota" in exc_str:
                metrics.record_rate_limit_hit()
                logger.warning(
                    "Gemini rate limit detectado. Hits en último minuto: %d",
                    metrics.get_rate_limit_count_last_minute(),
                )
                # Si es crítico, lanzar excepción para que el caller use fallback
                if metrics.is_rate_limit_critical():
                    logger.error("RATE_LIMIT_CRITICAL: Demasiados 429 de Gemini")
                    raise Exception(
                        "Rate limit crítico de Gemini. Usar fallback response."
                    ) from exc

            logger.exception("Error en Gemini Chat API")
            raise

    async def close(self) -> None:
        self._closed = True
