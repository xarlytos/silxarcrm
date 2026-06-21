"""Memory Consistency: Detecta hechos mencionados y evita repetir preguntas.

Fix 5 (Tier 3: -50% "No me escucha"):
- Problema: P dice "Tengo 5 veterinarias" turno 2 → turno 15 pregunta "¿Cuántas tienes?"
- Solución: Extraer facts, evitar repetir preguntas

Extrae datos clave (números, nombres, problemas) y los reutiliza
para contextualizar sin volver a preguntar.
"""
from __future__ import annotations

import logging
import re
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ExtractedFact:
    """Representa un hecho extraído de la conversación."""

    key: str  # "clientes", "negocio", "dolor_principal"
    value: Any  # Valor extraído
    extracted_at_turn: int  # Turno donde se extrajo
    confidence: float  # 0.0-1.0 confianza en la extracción
    mentions: int = 1  # Cuántas veces se mencionó

    def is_stale(self, current_turn: int, max_age_turns: int = 20) -> bool:
        """¿Hace cuánto se extrajo? Si hace mucho, podría ser desactualizado."""
        return (current_turn - self.extracted_at_turn) > max_age_turns


@dataclass
class ContextMemory:
    """Extrae y rastrea hechos de la conversación.

    Patrones extraídos:
    - "tengo X [veterinarias|clientes|citas]" → facts["clientes"] = X
    - "somos [nombre negocio]" → facts["business_type"] = X
    - "[problema principal]" → facts["pain_main"] = X
    - "[nombre de persona]" → facts["prospect_name"] = X
    """

    # Regex para extraer hechos comunes
    FACT_EXTRACTORS = {
        "clientes_numero": (
            r"(?:tengo|somos|tenemos|pierdo|pierden)\s+(?:alrededor de\s+)?(\d+)\s+"
            r"(?:clientes|mascotas|citas|citas|pacientes|servicios|suscriptores)",
            lambda m: int(m.group(1)),
        ),
        "business_name": (
            r"(?:soy|somos|es\s+|se\s+llama\s+|llamamos)\s+([A-Za-záéíóúñÁÉÍÓÚÑ\s&]+?)(?:\s+en|,|\.|\?|$)",
            lambda m: m.group(1).strip(),
        ),
        "business_type": (
            r"(?:soy|somos|trabajamos en|en\s+|en\s+una|tengo una?)\s+"
            r"(veterinaria|clínica|consultorio|peluquería|barbería|estética|spa|yoga|pilates|"
            r"gimnasio|escuela|academia|tienda|salón|taller|restaurante|café|bar|hotel|"
            r"agencia|consultoría|despacho|bufete)",
            lambda m: m.group(1),
        ),
        "prospect_name": (
            r"(?:me\s+llamo|me\s+llamas|soy|es|es\s+el|es\s+la)\s+"
            r"([A-Za-záéíóúñÁÉÍÓÚÑ]+(?:\s+[A-Za-záéíóúñÁÉÍÓÚÑ]+)?)",
            lambda m: m.group(1).strip(),
        ),
        "ingresos_monthly": (
            r"(?:pierdo|pierden|gano|ganamos|facturamos|ingresos?|pérdidas?)\s+"
            r"(?:alrededor de\s+)?(?:€|euros?|€|usd)\s*([\d.]+)",
            lambda m: float(m.group(1).replace(".", "")),
        ),
    }

    _facts: dict[str, ExtractedFact] = field(default_factory=dict)
    _asked_questions: set[str] = field(default_factory=set)

    def extract_from_text(self, text: str, turn_number: int) -> dict[str, Any]:
        """
        Extrae hechos del texto del prospecto.

        Returns:
            Dict de hechos extraídos {key: value}
        """
        extracted = {}
        text_lower = text.lower()

        for fact_key, (pattern, extractor) in self.FACT_EXTRACTORS.items():
            match = re.search(pattern, text_lower, re.IGNORECASE)
            if match:
                try:
                    value = extractor(match)
                    if fact_key in self._facts:
                        self._facts[fact_key].mentions += 1
                    else:
                        self._facts[fact_key] = ExtractedFact(
                            key=fact_key,
                            value=value,
                            extracted_at_turn=turn_number,
                            confidence=0.85,  # regex es confiable
                        )
                    extracted[fact_key] = value
                except Exception as exc:
                    logger.debug("Fallo extrayendo fact %s: %s", fact_key, exc)

        if extracted:
            logger.debug("Hechos extraídos en turno %d: %s", turn_number, extracted)

        return extracted

    def get_fact(self, key: str, current_turn: int) -> Any | None:
        """
        Retorna el valor de un hecho, si existe y no es demasiado viejo.

        Returns:
            Valor del hecho o None
        """
        if key not in self._facts:
            return None

        fact = self._facts[key]
        if fact.is_stale(current_turn):
            logger.debug("Fact '%s' demasiado viejo (%d turnos), descartando", key,
                        current_turn - fact.extracted_at_turn)
            return None

        return fact.value

    def should_repeat_question(self, question: str, key: str) -> bool:
        """
        ¿Ya preguntamos esto? O ¿ya tenemos el dato?

        Args:
            question: Pregunta que queremos hacer ("¿Cuántos clientes tienes?")
            key: Key del dato que buscamos ("clientes_numero")

        Returns:
            True si NO deberíamos repetir la pregunta
        """
        # Si tenemos el fact en memoria → NO preguntar
        if key in self._facts and self._facts[key].mentions > 0:
            logger.debug(
                "No repitiendo pregunta '%s' — fact '%s' ya extraído (%d menciones)",
                question,
                key,
                self._facts[key].mentions,
            )
            return False

        # Si ya preguntamos esta pregunta reciente → NO preguntar
        if question in self._asked_questions:
            logger.debug("No repitiendo pregunta: '%s' (ya preguntada)", question)
            return False

        return True

    def mark_question_asked(self, question: str) -> None:
        """Registra que hicimos esta pregunta."""
        self._asked_questions.add(question)
        logger.debug("Pregunta registrada: '%s'", question)

    def get_context_summary(self) -> str:
        """
        Retorna un resumen de los hechos extraídos para contexto.

        Uso: inyectar en el brief del Maestro para que sepa qué ya sabemos.

        Returns:
            String: "Prospecto: 5 clientes, Tipo: veterinaria, Problema: no-shows"
        """
        summaries = []
        for key, fact in self._facts.items():
            if fact.value is not None:
                summaries.append(f"{key}={fact.value}")

        if not summaries:
            return "Sin facts extraídos"

        return ", ".join(summaries)

    def has_mentioned_pain(self) -> bool:
        """¿El prospecto ha mencionado dolor/problema?"""
        pain_keys = ["clientes_numero", "ingresos_monthly"]
        return any(k in self._facts for k in pain_keys)

    def get_all_facts(self) -> dict[str, Any]:
        """Retorna todos los hechos extraídos."""
        return {k: v.value for k, v in self._facts.items() if v.value is not None}


@dataclass
class ConversationConsistency:
    """Verifica consistencia en la conversación.

    Detecta:
    - Repetición de datos (prospecto dijo X, preguntamos X)
    - Contradicciones (prospecto dijo X primero, luego Y)
    - Hechos olvidados
    """

    def __init__(self):
        self.memory = ContextMemory()
        self._prospect_claims: dict[str, Any] = {}  # Lo que el prospecto dijo

    def update(self, prospecto_text: str, turn_number: int) -> None:
        """
        Actualiza la memoria con lo que el prospecto acaba de decir.
        """
        extracted = self.memory.extract_from_text(prospecto_text, turn_number)
        self._prospect_claims.update(extracted)

    def should_ask_question(self, question: str, data_key: str) -> bool:
        """
        ¿Podemos hacer esta pregunta? O ya tenemos la respuesta.

        Returns:
            False si ya tenemos el dato / ya preguntamos
            True si podemos preguntar sin sonar repetitivo
        """
        return self.memory.should_repeat_question(question, data_key)

    def get_contextual_facts(self) -> dict[str, Any]:
        """Retorna los hechos extraídos para contexto."""
        return self.memory.get_all_facts()

    def acknowledge_missing_fact(self, fact_key: str) -> None:
        """Registra que el prospecto NO mencionó este fact."""
        if fact_key not in self.memory._facts:
            self.memory._facts[fact_key] = ExtractedFact(
                key=fact_key,
                value=None,
                extracted_at_turn=-1,
                confidence=0.0,
            )
