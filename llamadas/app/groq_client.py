"""Groq API client for SDR conversation responses.

Arquitectura:
  - GroqAgent: wrapper async de la API Groq con manejo de latencia
  - Prompts multi-etapa (greeting, discovery, budget, timeline, demo, fallback)
  - Latency tracking (TTFT, token generation time)
  - Error handling con fallbacks automáticos

Groq ofrece:
  - Mixtral 8x7b: ~50-100ms TTFT (ultra-fast para ventas)
  - LLaMA 70B: ~150-200ms TTFT (más preciso pero más lento)
  - Objetivo: <50ms TTFT para no aburrir al prospecto
"""
from __future__ import annotations

import asyncio
import logging
import time
from dataclasses import dataclass
from typing import Optional

import httpx

logger = logging.getLogger(__name__)


@dataclass
class LatencyMetrics:
    """Métricas de latencia de la API Groq."""

    ttft_ms: float  # Time to first token
    total_time_ms: float  # Total request time
    tokens_generated: int
    tokens_per_second: float


class GroqAgent:
    """Cliente async de Groq para respuestas SDR conversacionales.

    Características:
      - Prompts optimizados por etapa de venta (greeting, discovery, etc)
      - Fallback automático si timeout
      - Latency tracking (TTFT <50ms target)
      - Rate limit handling
    """

    GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions"
    DEFAULT_MODEL = "mixtral-8x7b-32768"
    TIMEOUT_SECONDS = 8  # Max time para no aburrir al prospecto
    RETRY_COUNT = 1
    TARGET_TTFT_MS = 50

    def __init__(
        self,
        api_key: str,
        model: str = DEFAULT_MODEL,
        timeout_seconds: int = TIMEOUT_SECONDS,
    ):
        """Initialize Groq agent.

        Args:
            api_key: Groq API key
            model: Model ID (default: mixtral-8x7b-32768)
            timeout_seconds: Max time to wait for response
        """
        if not api_key:
            raise ValueError("Groq API key is required")

        self.api_key = api_key
        self.model = model
        self.timeout_seconds = timeout_seconds
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=timeout_seconds,
        )

    async def generate_response(
        self,
        user_message: str,
        context: dict,
        stage: str = "discovery",
    ) -> tuple[str, LatencyMetrics]:
        """Generate SDR response based on user message and context.

        Args:
            user_message: User's spoken message (transcribed from Twilio)
            context: {
                'prospect_name': str,
                'company': str,
                'niche': str,
                'call_duration_ms': int,
                'previous_messages': list[str],
                'sentiment': str,  # positive, neutral, negative
                'pain_identified': bool,
                'budget_range': Optional[str],
            }
            stage: Conversation stage (greeting, discovery, budget, timeline, demo, closing)

        Returns:
            tuple[response_text, latency_metrics]
        """
        system_prompt = self._build_system_prompt(stage, context)

        try:
            response_text, metrics = await self._call_groq_with_latency(
                system_prompt=system_prompt,
                user_message=user_message,
            )
            logger.info(
                f"Groq response: {stage} | TTFT={metrics.ttft_ms:.0f}ms "
                f"| Total={metrics.total_time_ms:.0f}ms | TPS={metrics.tokens_per_second:.1f}"
            )
            return response_text, metrics

        except asyncio.TimeoutError:
            logger.warning(f"Groq timeout ({self.timeout_seconds}s), using fallback")
            fallback = self._build_fallback_response(stage, context)
            return fallback, LatencyMetrics(
                ttft_ms=self.timeout_seconds * 1000,
                total_time_ms=self.timeout_seconds * 1000,
                tokens_generated=0,
                tokens_per_second=0,
            )

        except httpx.HTTPStatusError as e:
            if e.response.status_code == 429:
                logger.error("Groq rate limit hit, retrying in 1s...")
                await asyncio.sleep(1)
                if self.RETRY_COUNT > 0:
                    self.RETRY_COUNT -= 1
                    return await self.generate_response(
                        user_message, context, stage
                    )
                else:
                    raise

            logger.error(f"Groq API error: {e.response.status_code} - {e.response.text}")
            fallback = self._build_fallback_response(stage, context)
            return fallback, LatencyMetrics(
                ttft_ms=0, total_time_ms=0, tokens_generated=0, tokens_per_second=0
            )

    async def _call_groq_with_latency(
        self, system_prompt: str, user_message: str
    ) -> tuple[str, LatencyMetrics]:
        """Call Groq API and measure TTFT (time to first token).

        TTFT es crítico en ventas: cada 50ms de latencia extra = prospecto más aburrido.
        """
        start_time = time.perf_counter()
        ttft_time = None
        response_text = ""
        token_count = 0

        try:
            async with httpx.AsyncClient(
                headers={"Authorization": f"Bearer {self.api_key}"},
                timeout=self.timeout_seconds,
            ) as client:
                payload = {
                    "model": self.model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_message},
                    ],
                    "temperature": 0.7,
                    "max_tokens": 256,  # SDR responses son cortas (<100 tokens)
                }

                response = await client.post(self.GROQ_API_URL, json=payload)
                response.raise_for_status()

                # Measure TTFT (tiempo hasta primer token)
                ttft_time = (time.perf_counter() - start_time) * 1000

                data = response.json()
                response_text = data["choices"][0]["message"]["content"].strip()
                token_count = data.get("usage", {}).get("completion_tokens", 0)

        except asyncio.TimeoutError:
            raise
        except httpx.HTTPStatusError as e:
            logger.error(
                f"Groq API error: status={e.response.status_code}, "
                f"body={e.response.text[:200]}"
            )
            raise

        end_time = time.perf_counter()
        total_time_ms = (end_time - start_time) * 1000
        ttft_ms = ttft_time or total_time_ms
        tokens_per_second = (
            (token_count / (total_time_ms / 1000))
            if total_time_ms > 0
            else 0
        )

        return response_text, LatencyMetrics(
            ttft_ms=ttft_ms,
            total_time_ms=total_time_ms,
            tokens_generated=token_count,
            tokens_per_second=tokens_per_second,
        )

    def _build_system_prompt(self, stage: str, context: dict) -> str:
        """Build optimized system prompt based on conversation stage."""
        prospect_name = context.get("prospect_name", "")
        company = context.get("company", "")
        niche = context.get("niche", "dentista")

        base_prompt = f"""Eres Carlos, asesor comercial profesional y cercano de SmartDental.
Tu objetivo: avanzar la conversación de ventas B2B (software de gestión para {niche}s).

Identidad:
- Acento español peninsular (profesional, cercano, sin robotismo)
- Tuteo con prospectos pequeños, usted con decisores C-level
- Validas problemas, no viendes: "Entiendo perfectamente, ese es el punto"
- Frases CORTAS: máximo 2-3 oraciones por turno

Datos del prospecto:
- Nombre: {prospect_name}
- Empresa: {company}
- Nicho: {niche}
- Sentimiento: {context.get("sentiment", "neutral")}
- Duración llamada: {context.get("call_duration_ms", 0)}ms"""

        # Append stage-specific instructions
        if stage == "greeting":
            return base_prompt + self._build_greeting_prompt(context)
        elif stage == "discovery":
            return base_prompt + self._build_discovery_prompt(context)
        elif stage == "budget":
            return base_prompt + self._build_budget_prompt(context)
        elif stage == "timeline":
            return base_prompt + self._build_timeline_prompt(context)
        elif stage == "demo":
            return base_prompt + self._build_demo_prompt(context)
        elif stage == "closing":
            return base_prompt + self._build_closing_prompt(context)
        else:
            return base_prompt + self._build_discovery_prompt(context)

    def _build_greeting_prompt(self, context: dict) -> str:
        """Greeting stage: introduce yourself and break pattern."""
        return """

=== ETAPA: GREETING (romper el patrón de cold call) ===
Tu objetivo: captar atención sin ser invasivo.

Guion:
1. Presenta tu nombre y por qué llamas (ESPECÍFICO, no genérico)
2. Pattern interrupt: dato que duele en su industria
3. Trial close: "¿Eso te resuena?"
4. ESCUCHA (no sigas hablando si responde)

Prohibiciones:
- NO: "Soy de una empresa llamada..."
- NO: "¿Tienes 5 minutos?"
- NO: listas de características

Ejemplo BIEN: "Carlos de SmartDental. Estoy viendo que muchos {niche}s en Barcelona pierden 30% de citas por no-shows -¿eso te pasa a ti?"
"""

    def _build_discovery_prompt(self, context: dict) -> str:
        """Discovery stage: uncover pain points."""
        pain_identified = context.get("pain_identified", False)

        if pain_identified:
            return """

=== ETAPA: DISCOVERY (avanzada - dolor ya identificado) ===
Tu objetivo: CUANTIFICAR el dolor (hacerlo real en números).

Guion:
1. Valida: "Eso es más común de lo que parece"
2. Pregunta específica: "¿Cuántas citas se te pierden a la semana?"
3. Calcula JUNTOS: "Entonces estamos hablando de X euros al mes"
4. Trial close: "¿Tiene sentido lo que te digo?"

Si dice "sí": avanza a BUDGET
Si dice "no" o "no sé": profundiza más en discovery

Tono: investigador, no vendedor. Tu trabajo es hacer que ELLOS descubran el dolor.
"""
        else:
            return """

=== ETAPA: DISCOVERY (inicial - buscando dolor) ===
Tu objetivo: encontrar el problema específico.

Guion:
1. Pregunta abierta sobre operaciones: "¿Cómo es tu día típico en {company}?"
2. Escucha frustración
3. Pregunta de dolor específico según su respuesta
4. Valida: "Entiendo, eso es lo que veo mucho"

Prohibiciones:
- NO preguntes presupuesto (aún no)
- NO hables de precio
- NO hables de tu producto

Objetivo: identificar al menos 1 pain point claro antes de avanzar a BUDGET.
"""

    def _build_budget_prompt(self, context: dict) -> str:
        """Budget stage: understand financial constraints."""
        return """

=== ETAPA: BUDGET (entender presupuesto) ===
Tu objetivo: saber si tiene presupuesto sin asustarle.

Guion:
1. Reconoce el dolor cuantificado: "Entonces ese problema te cuesta X al mes"
2. Pregunta indirecta: "¿Cuál sería el ROI para justificar una herramienta así?"
3. NO digas precio aún
4. Si pregunta precio: "En la demo te muestro paquetes, pero antes quiero asegurar que esto resuelve TU problema específico"

Rango típico por niche:
- Dentista: 50-150 EUR/mes
- Peluquería: 29-79 EUR/mes
- Gimnasio: 79-249 EUR/mes

Tono: asociado, no vendedor. "¿Cuál es tu rango para invertir en una solución?"
"""

    def _build_timeline_prompt(self, context: dict) -> str:
        """Timeline stage: identify decision timeline."""
        return """

=== ETAPA: TIMELINE (cuándo deciden) ===
Tu objetivo: saber si es comprador caliente o frío.

Guion:
1. Contexto: "Si esto resuelve tu problema, ¿cuándo empezarían a implementarlo?"
2. Escucha: ¿ya está buscando soluciones? ¿o investigando?
3. Si "ASAP" → comprador CALIENTE: agenda demo esta semana
4. Si "en 3 meses" → comprador FRÍO: envía info, sigue con otros

Opciones de respuesta esperadas:
- "Esta semana": CERRAR demo inmediata
- "El mes que viene": "¿Cómo te parecería una demo de 15 min hoy para que esté informado?"
- "Aún investigando": "Perfecto, entonces mejor una demo sin presión para que lo veas en acción"

Prohibición:
- NO insistas si es comprador frío. Deja semilla, pasa a siguiente.
"""

    def _build_demo_prompt(self, context: dict) -> str:
        """Demo stage: schedule the demo."""
        return """

=== ETAPA: DEMO (cerrar agenda) ===
Tu objetivo: agenda demo en el calendario, no solo "tal vez".

Guion:
1. Confirma: "Entonces una demo de 15 minutos te parece bien"
2. Ofrece opciones: "¿Mejor mañana a las 3 o pasado a las 10?"
3. NO: "¿Cuándo tienes disponible?" (deja control)
4. Cierra: "Te envío el link, y si algo cambia, avísame"

Fallback si esquiva:
"Perfecto, entonces te envío un email con opciones de horarios. ¿Cuál es tu correo?"

Tono: amable pero firme. No es una sugerencia, es un acuerdo.
"""

    def _build_closing_prompt(self, context: dict) -> str:
        """Closing stage: handle final objections."""
        return """

=== ETAPA: CLOSING (manejar últimas objeciones) ===
Tu objetivo: cerrar la venta O establecer seguimiento claro.

Framework LAER (obligatorio):
  L - LISTEN: Deja terminar sin interrumpir
  A - ACKNOWLEDGE: "Entiendo perfectamente"
  E - EXPLORE: "¿Cuándo dices 'caro', te refieres a...?"
  R - RESPOND: Social proof + oferta clara

Objeciones típicas:
1. "Es muy caro" → "La Clínica Dental X se pagó el sistema en el primer mes"
2. "Ya tenemos un sistema" → "¿Qué específicamente no te gusta de lo actual?"
3. "Déjame pensarlo" → "Perfecto, ¿hoy a las 7pm o mañana a las 10 te llamo para resolver dudas?"

Cierre absoluto:
"Entonces en la demo de 15 min ves exactamente cómo quedaría tu agenda y si no te gusta, sin compromiso. ¿Mañana a las 3?"
"""

    def _build_fallback_response(self, stage: str, context: dict) -> str:
        """Fallback responses (hardcoded) si Groq falla o timeout.

        Pre-entrenado para no romper la conversación.
        """
        prospect_name = context.get("prospect_name", "")
        company = context.get("company", "")

        fallbacks = {
            "greeting": f"Hola {prospect_name}, soy Carlos de SmartDental. Estoy viendo que muchos negocios como {company} pierden citas por no-shows -¿a ti te pasa? (esperando respuesta...)",
            "discovery": "Claro, eso tiene mucho sentido. ¿Cuántas citas se te pierden a la semana? (para que cuantifiquemos juntos)",
            "budget": "Entiendo. Lo que puedo decirte es que normalmente se recupera en el primer mes. ¿Cuál sería tu rango de inversión?",
            "timeline": "Perfecto. Si esto resuelve tu problema, ¿cuándo empezarías a implementarlo?",
            "demo": f"Entonces te parece bien una demo de 15 minutos, ¿verdad? ¿Mañana a las 3 o prefieres pasado a las 10?",
            "closing": "Entiendo tu preocupación, totalmente válida. En la demo te lo muestro sin compromiso y decides. ¿Mañana a las 3?",
        }

        return fallbacks.get(stage, "Perfecto, cuéntame más...")

    async def close(self):
        """Close HTTP client."""
        await self.client.aclose()

    async def __aenter__(self):
        """Async context manager entry."""
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self.close()
