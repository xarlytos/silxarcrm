"""Mini Classifier — clasifica intención del prospecto en cada turno.

Usa Gemini Flash (rápido, barato) para convertir el texto del prospecto
en intención + tags + confidence. No genera respuesta, solo clasifica.

Latencia objetivo: ~100ms
Costo: ~$0.001 por turno

OPTIMIZACIÓN CICLO 2 (2.2): Classifier contextual (PENDIENTE)
- A/B test: ejecutar 2 clasificadores en paralelo
  * classify_generic(text) — actual
  * classify_contextual(text, business_type) — sensible al nicho
- Medir closing rate por nicho y elegir ganador
- Ganancia: +3-5% closing rate
- Implementar cuando: A/B test completado (100+ calls)
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field

from app.config import settings

logger = logging.getLogger(__name__)


@dataclass
class IntentClassification:
    """Resultado de la clasificación de un turno del prospecto."""

    intencion: str = "neutro"  # interesado|neutro|rechazando|pidiendo_info|agendando|pidiendo_humano
    tags: list[str] = field(default_factory=list)
    confidence: float = 0.5
    nueva_objecion: str = "ninguna"
    emocion: str = "neutro"  # molesto|ocupado|interesado|confundido|neutro


class MiniClassifier:
    """Clasificador de intención basado en Gemini Flash.

    No genera texto, solo emite JSON estructurado.
    """

    def __init__(self) -> None:
        self._client = None

    def _get_client(self):
        if self._client is None:
            from google import genai
            self._client = genai.Client(api_key=settings.gemini_api_key)
        return self._client

    async def classify(
        self,
        prospect_text: str,
        recent_turns: list[dict[str, str]],
    ) -> IntentClassification:
        """Clasifica la intención del prospecto en un turno.

        Args:
            prospect_text: Texto transcrito del prospecto en este turno.
            recent_turns: Últimos 3-5 turnos para contexto.
        """
        from google.genai import types

        # Construir contexto reciente
        historial = "\n".join(
            f"{t['role'].upper()}: {t['text']}" for t in recent_turns[-5:]
        )

        prompt = f"""Eres un clasificador de intenciones para ventas B2B.
Analiza el texto del prospecto y clasifícalo en JSON.

CONTEXTO RECIENTE:
{historial}

TEXTO DEL PROSPECTO:
"{prospect_text}"

Responde ÚNICAMENTE con este JSON (sin markdown, sin explicaciones):
{{
  "intencion": "interesado|neutro|rechazando|pidiendo_info|agendando|pidiendo_humano",
  "tags": ["tiene_software", "menciono_precio", "dolor_bajo", "dolor_alto", "es_decisor", "no_es_decisor", "ocupado", "molesto", "pregunta_demo"],
  "confidence": 0.0-1.0,
  "nueva_objecion": "ya_tenemos_software|es_caro|no_tenemos_tiempo|no_lo_necesitamos|no_decido|ninguna",
  "emocion": "molesto|ocupado|interesado|confundido|neutro"
}}"""

        try:
            client = self._get_client()
            resp = await client.aio.models.generate_content(
                model=settings.gemini_chat_model,  # gemini-2.5-flash (ultrarrápido)
                contents=[types.Content(parts=[types.Part(text=prompt)])],
                config=types.GenerateContentConfig(
                    temperature=0.1,  # bajo = más determinista
                    max_output_tokens=300,
                ),
            )

            raw = resp.text or "{}"
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw
            if raw.endswith("```"):
                raw = raw.rsplit("\n", 1)[0]
            if raw.startswith("json"):
                raw = raw[4:].strip()

            data = json.loads(raw)

            result = IntentClassification(
                intencion=data.get("intencion", "neutro"),
                tags=data.get("tags", []),
                confidence=float(data.get("confidence", 0.5)),
                nueva_objecion=data.get("nueva_objecion", "ninguna"),
                emocion=data.get("emocion", "neutro"),
            )

            logger.debug(
                "Classifier: intencion=%s tags=%s conf=%.2f obj=%s",
                result.intencion, result.tags, result.confidence, result.nueva_objecion
            )
            return result

        except json.JSONDecodeError as exc:
            logger.warning("Classifier JSON inválido: %s | raw=%s", exc, raw[:200] if 'raw' in dir() else "")
            return IntentClassification(emocion="neutro", confidence=0.3)

        except Exception as exc:
            logger.warning("Classifier error: %s", exc)
            return IntentClassification(emocion="neutro", confidence=0.3)
