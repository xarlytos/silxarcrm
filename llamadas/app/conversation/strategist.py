"""Supervisor Estratégico — SIMPLIFICADO.

Solo 2 responsabilidades:
1. PRE-CALL: Genera estrategia base ANTES de que empiece la llamada (una sola vez).
2. EXCEPCIONES: Interviene solo en casos extremos (HOT LEAD, OPT OUT, TRANSFER).

NO corre cada 5 turnos. NO analiza periódicamente.
"""
from __future__ import annotations

import json
import logging

from app.config import settings
from app.conversation.state_engine import SalesState

logger = logging.getLogger(__name__)


class Strategist:
    """Supervisor estratégico simplificado."""

    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def generate_pre_call_strategy(
        self,
        lead: dict,
        business_type: str,
    ) -> SalesState:
        """Genera estado inicial antes de la llamada.

        Analiza datos del CRM y nicho para inicializar SalesState
        con tags y estrategia de apertura.
        """
        if not settings.strategist_enabled:
            return SalesState(stage="saludo")

        from google.genai import types

        prompt = f"""Eres un estratega de ventas B2B. Analiza este lead y decide la estrategia de apertura.

Lead: {json.dumps(lead, ensure_ascii=False)}
Tipo de negocio: {business_type}

Responde ÚNICAMENTE con este JSON:
{{
  "apertura": "consultivo|directo|empatico",
  "tags_iniciales": ["tag1", "tag2"],
  "objecion_esperada": "ya_tenemos_software|es_caro|no_tenemos_tiempo|ninguna",
  "nota": "breve nota estratégica"
}}"""

        try:
            client = self._get_client()
            resp = await client.aio.models.generate_content(
                model=settings.strategist_model,
                contents=[types.Content(parts=[types.Part(text=prompt)])],
                config=types.GenerateContentConfig(temperature=0.2, max_output_tokens=300),
            )

            raw = resp.text or "{}"
            raw = raw.strip().replace("```", "").replace("json", "")
            data = json.loads(raw)

            state = SalesState(
                stage="saludo",
                tags=data.get("tags_iniciales", []),
                objecion_activa=data.get("objecion_esperada", ""),
            )
            logger.info("Pre-call strategy: apertura=%s tags=%s", data.get("apertura"), state.tags)
            return state

        except Exception as exc:
            logger.warning("Pre-call strategy failed, using default: %s", exc)
            return SalesState(stage="saludo")

    async def handle_exception(
        self,
        state: SalesState,
        exception_type: str,  # "hot_lead" | "opt_out" | "transfer_request"
        context: dict,
    ) -> SalesState:
        """Interviene solo en excepciones durante la llamada.

        Args:
            exception_type: Tipo de excepción detectada.
            context: Datos adicionales (ej: transcript reciente).
        """
        if exception_type == "hot_lead":
            state.advance_stage("closing")
            state.wants_demo = True
            state.confidence = 0.95
            state.tags.append("hot_lead")
            logger.info("SUPERVISOR EXCEPCIÓN: HOT LEAD → forcing closing stage")

        elif exception_type == "opt_out":
            state.advance_stage("exit")
            state.is_rejecting = True
            state.confidence = 1.0
            logger.info("SUPERVISOR EXCEPCIÓN: OPT OUT → forcing exit")

        elif exception_type == "transfer_request":
            state.needs_human = True
            state.advance_stage("qualified")
            state.confidence = 0.9
            logger.info("SUPERVISOR EXCEPCIÓN: TRANSFER → forcing qualified")

        return state
