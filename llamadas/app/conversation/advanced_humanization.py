"""Advanced Humanization: Cerrar gaps finos que quedan.

Módulos avanzados para ser 100% irreconocible de humano:
- Variación de estructura de oración (no siempre SVO)
- Micro-pauses dentro de frase
- Énfasis natural (palabras importantes)
- Contradicciones menores realistas
- Reformulaciones (humano se corrige a sí mismo)
- References al pasado de forma natural
- Sentences incompletas recuperadas
- Rambling natural (no siempre directo)
"""
from __future__ import annotations

import logging
import random
import re
from dataclasses import dataclass
from typing import Optional

logger = logging.getLogger(__name__)


@dataclass
class SentenceStructureVariant:
    """Variantes de estructura de oración para sonar natural."""

    # Estructura canónica: Sujeto-Verbo-Objeto
    SVO = "normal"  # "Yo tengo 3 opciones"

    # Variantes que humano usa
    OSV = "object_first"  # "3 opciones, te dejo"
    VOS = "verb_first"  # "Tengo, mira, 3 opciones"
    CLEFT = "cleft"  # "Lo que tengo es 3 opciones"
    TOPICALIZED = "topicalized"  # "De opciones, tengo 3"

    VARIANTS = [SVO, OSV, VOS, CLEFT, TOPICALIZED]


@dataclass
class AdvancedHumanization:
    """
    ponytail: naive sentence variation — upgrade if A/B shows no impact

    Implementa patrones finos que quedan entre humano y IA:
    - Variación de estructura (no siempre la misma)
    - Micro-pauses dentro de respuesta
    - Énfasis natural
    - Contradicciones leves (realismo)
    - Reformulaciones
    """

    # Palabras de énfasis que humano agrega
    EMPHASIS_MARKERS = {
        "precio": ["bastante", "realmente", "en serio", "importantísimo"],
        "tiempo": ["rápido", "al instante", "sin delays", "al toque"],
        "problema": ["importante", "crítico", "central", "el mismísimo"],
        "solución": ["simple", "fácil", "clave", "la posta"],
    }

    # Reformulaciones que humano hace
    REFORMULATIONS = [
        "Es decir,",
        "O sea,",
        "Dicho de otra forma,",
        "En otras palabras,",
        "Lo que quiero decir es,",
        "Mira, eso que acabo de decir,",
        "Espera, déjame reformular,",
    ]

    # Palabras de dudilla que humano agrega
    HEDGE_WORDS = [
        "creo que",
        "diría que",
        "tipo",
        "más o menos",
        "en cierta forma",
        "supongo que",
        "por ahí",
    ]

    def apply_sentence_variation(self, text: str) -> str:
        """
        Aplicar variación de estructura de oración.

        Ejemplo:
        ANTES: "Tengo tres opciones: básica, profesional, premium"
        DESPUÉS: "De opciones, tengo tres: básica, profesional, premium"
        (O quedar igual si random no lo aplica)
        """
        # 30% chance de variar (no siempre)
        if random.random() > 0.30:
            return text

        # Detectar si es estructura SVO simple
        match = re.match(r"(Tengo|Hay|Existen)\s+(.+)", text)
        if not match:
            return text

        verb = match.group(1)
        rest = match.group(2)

        # Aplicar variante random
        variant = random.choice(SentenceStructureVariant.VARIANTS)

        if variant == SentenceStructureVariant.TOPICALIZED:
            # "De opciones, tengo 3"
            if "opciones" in text.lower():
                return f"De opciones, {verb.lower()} {rest}"
        elif variant == SentenceStructureVariant.CLEFT:
            # "Lo que tengo es 3 opciones"
            return f"Lo que {verb.lower()} es {rest}"

        return text

    def inject_emphasis(self, text: str, category: str = "general") -> str:
        """
        Inyectar énfasis natural en palabras clave.

        Ejemplo:
        ANTES: "Es caro"
        DESPUÉS: "Es realmente caro" o "Es bastante caro"
        """
        if random.random() > 0.40:  # 40% chance
            return text

        # Si el texto tiene palabra clave, añadir énfasis
        emphasis_list = self.EMPHASIS_MARKERS.get(category, [])
        if not emphasis_list:
            return text

        # Elegir énfasis
        emphasis = random.choice(emphasis_list)

        # Inyectar antes del adjetivo/verbo clave
        # Simplificado: agregar al inicio de frase
        if text.startswith("Es"):
            return f"Es {emphasis.lower()} {text[3:]}"
        elif text.startswith("Tengo"):
            return f"Tengo {emphasis.lower()} {text[6:]}"

        return text

    def apply_reformulation(self, text: str, turno: int) -> str:
        """
        Humano a veces se reformula a sí mismo.

        Ejemplo:
        "Mira, la cosa es que... o sea, el problema principal es..."

        30% de turno 3+
        """
        if turno < 3 or random.random() > 0.30:
            return text

        # Insertar reformulación
        reformulation = random.choice(self.REFORMULATIONS)
        sentences = text.split(". ")

        if len(sentences) > 1:
            # Insertar en segundo párrafo
            sentences[0] = f"{sentences[0]}. {reformulation} {sentences[1]}"
            return ". ".join([sentences[0]] + sentences[2:])

        return text

    def apply_hedge_words(self, text: str) -> str:
        """
        Inyectar palabras de dudilla para sonar menos seguro.

        Ejemplo:
        ANTES: "Es la solución"
        DESPUÉS: "Creo que es la solución" o "Diría que es la solución"

        20% chance
        """
        if random.random() > 0.20:
            return text

        hedge = random.choice(self.HEDGE_WORDS)

        # Inyectar al inicio
        if text[0].isupper():
            return f"{hedge[0].upper() + hedge[1:]} {text[0].lower() + text[1:]}"

        return text

    def inject_sentence_fragments(self, text: str, turno: int) -> str:
        """
        Humano a veces deja frases incompletas que luego completa.

        Ejemplo:
        "Mira, si pierdes... bueno, supongamos que pierdes 20 clientes"

        Turno 2+ con 15% chance
        """
        if turno < 2 or random.random() > 0.15:
            return text

        # Dividir en sentences
        sentences = text.split(". ")
        if len(sentences) < 2:
            return text

        # Hacer que el primer sentence sea incompleto
        first = sentences[0]
        match = re.search(r"(\w+)(?:\s|,|\.)", first)

        if match:
            fragment = first[:match.end()] + "..."
            completed = f"{fragment} bueno, {first}"
            return completed + ". " + ". ".join(sentences[1:])

        return text

    def add_natural_contradictions(self, text: str) -> str:
        """
        Humano a veces contradice/corrige levemente.

        Ejemplo:
        "Es caro... bueno, no tan caro, pero sí tiene costo"

        5% chance (raro, realista)
        """
        if random.random() > 0.05:
            return text

        # Muy raro, 5% chance
        if "caro" in text.lower():
            return text.replace(
                "caro",
                "caro... bueno, tiene costo, digamos"
            )

        return text

    def inject_contextual_references(self, text: str, previous_turns: list[str]) -> str:
        """
        Referenciar al pasado de forma natural.

        Ejemplo:
        Si hace 3 turnos mencionó "veterinaria", ahora:
        "Como te decía, en veterinarias..."

        40% chance
        """
        if random.random() > 0.40 or not previous_turns:
            return text

        # Buscar palabra clave en últimos turnos
        keywords = ["veterinaria", "precio", "problema", "solución"]
        mentioned = None

        for keyword in keywords:
            for turn in previous_turns[-3:]:
                if keyword in turn.lower():
                    mentioned = keyword
                    break

        if mentioned:
            anchors = [
                f"Como te mencioné, en {mentioned}s...",
                f"Volviendo al tema de {mentioned}...",
                f"En las {mentioned}s que mencionaste...",
                f"Eso que dijiste de {mentioned}...",
            ]
            anchor = random.choice(anchors)

            # Inyectar al inicio
            return f"{anchor} {text}"

        return text


@dataclass
class MicroPauseInjector:
    """
    Inyecta micro-pauses dentro de respuesta (no solo entre turnos).

    Humano NO habla como robot. Hay pausas dentro de:
    - Énfasis: "Es... realmente importante"
    - Pensamiento: "Mira, yo diría... que deberías"
    - Enumeración: "Tengo... 1, 2, 3 opciones"
    """

    def inject_micropause_markers(self, text: str) -> str:
        """
        Marcar dónde van micro-pauses para TTS.

        Formato: "texto [PAUSE:200ms] texto"
        TTS interpretará como 200ms de silencio
        """
        # 25% chance de inyectar micro-pause
        if random.random() > 0.25:
            return text

        # Inyectar después de palabras clave
        pause_after = ["Mira,", "Es que", "Bueno,", "Pues", "Entonces,"]

        for word in pause_after:
            if word in text:
                pause_ms = random.randint(150, 300)
                text = text.replace(
                    word,
                    f"{word} [PAUSE:{pause_ms}ms]",
                    1  # Solo primera ocurrencia
                )
                break

        return text


@dataclass
class NaturalPacing:
    """Humano a veces se apresura, a veces se toma su tiempo."""

    def get_pacing_profile(self, emocion: str) -> dict:
        """
        Devuelve profile de pacing basado en emoción.

        Molesto: 200ms extra (habla lenta con frustración)
        Entusiasta: -100ms (acelera)
        Ocupado: -150ms (rápido al grano)
        """
        profiles = {
            "molesto": {
                "factor": 1.3,  # 30% más lento
                "pauses": 3,  # Más pauses
            },
            "entusiasta": {
                "factor": 0.85,  # 15% más rápido
                "pauses": 1,  # Menos pauses
            },
            "ocupado": {
                "factor": 0.8,  # 20% más rápido
                "pauses": 0,  # Sin pauses
            },
            "dudoso": {
                "factor": 1.1,  # 10% más lento (reflexión)
                "pauses": 2,
            },
        }

        return profiles.get(emocion, {"factor": 1.0, "pauses": 1})


def apply_all_advanced_humanization(
    text: str,
    turn_number: int,
    emocion: str,
    previous_turns: Optional[list[str]] = None,
) -> str:
    """
    Aplicar TODOS los advanced fixes en orden.

    Orden importa: primero variación de estructura, luego énfasis, etc.
    """
    humanizer = AdvancedHumanization()

    # 1. Variación de estructura (cambia oraciones)
    text = humanizer.apply_sentence_variation(text)

    # 2. Énfasis (marca palabras importantes)
    text = humanizer.inject_emphasis(text, category="general")

    # 3. Reformulaciones (se corrige a sí mismo)
    text = humanizer.apply_reformulation(text, turn_number)

    # 4. Hedge words (menos seguridad)
    text = humanizer.apply_hedge_words(text)

    # 5. Sentence fragments (incompleto que se completa)
    text = humanizer.inject_sentence_fragments(text, turn_number)

    # 6. Contradicciones naturales (leves)
    text = humanizer.add_natural_contradictions(text)

    # 7. Referencias contextuales
    if previous_turns:
        text = humanizer.inject_contextual_references(text, previous_turns)

    # 8. Micro-pauses (para TTS)
    micropause = MicroPauseInjector()
    text = micropause.inject_micropause_markers(text)

    return text
