"""Emotional Mirroring: Ajusta el tono del brief según la emoción detectada.

Fix 4 (Tier 2: +5-10% empatía):
- Si prospecto está molesto → tono empático_calmo, sin matraca
- Si prospecto está entusiasta → tono energético, refuerza
- Si prospecto está dudoso → tono confiado_paciente, explica

Esto evita el efecto "Esto me trata como un número" que crean
respuestas neutras a emociones fuertes.
"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from app.conversation.master_llm import ConversationBrief
    from app.conversation.classifier import IntentClassification

logger = logging.getLogger(__name__)


@dataclass
class EmotionalToneAdjuster:
    """Ajusta el brief (tono, objetivo, script) según emoción del prospecto.

    Emociones esperadas:
    - "interesado": energético, acelera
    - "molesto": empático_calmo, da espacio
    - "ocupado": rápido, al punto
    - "dudoso": confiado_paciente, explica
    - "confundido": paciente, clarifica
    - "feliz": energético, celebra
    """

    # Definición de ajustes por emoción
    ADJUSTMENTS = {
        "molesto": {
            "tono": "empático_calmo",
            "max_frases": 2,  # Habla menos cuando está molesto
            "prohibiciones": ["no_hacer_matraca", "no_preguntar_múltiple"],
            "frases_obligatorias": [
                "Te disculpo",
                "Entiendo tu frustración",
                "Sin prisa",
            ],
            "objetivo_override": "Calmarlo y entender qué pasó",
        },
        "ocupado": {
            "tono": "rápido_al_punto",
            "max_frases": 1,  # Ultra-conciso
            "prohibiciones": ["no_historias_largas"],
            "objetivo_override": "Agendar demo sin rodeos",
        },
        "interesado": {
            "tono": "energético",
            "max_frases": 3,  # Puede hablar más
            "frases_obligatorias": ["Excelente", "Perfecto"],
            "objetivo_override": "Cerrar demo mientras tenga momentum",
        },
        "dudoso": {
            "tono": "confiado_paciente",
            "max_frases": 3,
            "frases_obligatorias": [
                "Te lo explico bien",
                "Muchos clientes decían lo mismo",
                "Prueba",
            ],
            "objetivo_override": "Resolver dudas con case studies",
        },
        "confundido": {
            "tono": "paciente_claro",
            "max_frases": 2,
            "frases_obligatorias": ["Te lo simplifico", "Así funciona"],
            "objetivo_override": "Aclarar concepto mal entendido",
        },
        "feliz": {
            "tono": "celebratorio",
            "max_frases": 3,
            "frases_obligatorias": ["Qué genial", "Perfecto"],
            "objetivo_override": "Mantener momentum positivo",
        },
    }

    # Amplificadores: si la emoción es fuerte + cambio reciente
    AMPLIFIERS = {
        "molesto": {
            "amplify_if": ["emocion_cambió", "volume_alto"],  # Gritó o enojado reciente
            "action": "aumentar empatía al máximo",
        },
        "interesado": {
            "amplify_if": ["mencionó_demo", "pain_quantified"],
            "action": "presionar cierre",
        },
    }

    def adjust_brief(
        self,
        brief: ConversationBrief,
        classification: IntentClassification,
        turns_since_emotion_changed: int = 0,
    ) -> ConversationBrief:
        """
        Modifica el brief basado en la emoción del prospecto.

        Args:
            brief: Brief del Maestro (será modificado)
            classification: Clasificación actual con emoción
            turns_since_emotion_changed: Cuántos turnos hace que cambió la emoción

        Returns:
            Brief ajustado
        """
        emocion = getattr(classification, "emocion", "neutro")

        if emocion not in self.ADJUSTMENTS:
            logger.debug("Emoción desconocida: %s (sin ajuste)", emocion)
            return brief

        adjustments = self.ADJUSTMENTS[emocion]

        # Aplicar ajustes
        if "tono" in adjustments:
            brief.tono = adjustments["tono"]

        if "max_frases" in adjustments:
            brief.max_frases = adjustments["max_frases"]

        if "prohibiciones" in adjustments:
            brief.prohibiciones.extend(adjustments["prohibiciones"])

        if "frases_obligatorias" in adjustments:
            # Agregar frases obligatorias específicas de la emoción
            # (además de las del brief original)
            for frase in adjustments["frases_obligatorias"]:
                if frase not in brief.frases_obligatorias:
                    brief.frases_obligatorias.append(frase)

        if "objetivo_override" in adjustments:
            brief.objetivo = adjustments["objetivo_override"]

        # Amplificadores: si emoción es fuerte, amplificar ajuste
        if emocion in self.AMPLIFIERS and turns_since_emotion_changed <= 2:
            amplifier = self.AMPLIFIERS[emocion]
            logger.debug(
                "Amplificador activado para emoción '%s': %s",
                emocion,
                amplifier["action"],
            )
            # Aplicar amplificación (reducir max_frases más, etc)
            if emocion == "molesto":
                brief.max_frases = min(1, brief.max_frases)
            elif emocion == "interesado":
                brief.max_frases = max(3, brief.max_frases)

        logger.info(
            "Brief ajustado por emoción: %s (tono=%s, frases=%d)",
            emocion,
            brief.tono,
            brief.max_frases,
        )

        return brief

    def get_recovery_strategy(self, emocion: str) -> str | None:
        """
        Si prospecto está molesto/confundido, retorna estrategia de recuperación.

        Returns:
            Estrategia específica o None si no necesita recuperación
        """
        if emocion == "molesto":
            return "empatía_primero_luego_demo"
        elif emocion == "confundido":
            return "clarificar_luego_proseguir"
        elif emocion == "dudoso":
            return "case_study_luego_cierre"
        return None


@dataclass
class ToneConsistency:
    """Detecta cambios de tono inconsistentes en la conversación.

    Problema: Turno 1: formal → Turno 5: coloquial
    Solución: Mantener tono consistente por llamada
    """

    def __init__(self):
        self._conversation_tone: str | None = None
        self._tone_set_at_turn: int = 0

    def set_tone(self, tone: str, at_turn: int) -> None:
        """Establece el tono de la llamada (primera vez)."""
        if self._conversation_tone is None:
            self._conversation_tone = tone
            self._tone_set_at_turn = at_turn
            logger.info("Tono de llamada establecido: %s (turno %d)", tone, at_turn)

    def get_tone(self) -> str | None:
        """Retorna el tono establecido."""
        return self._conversation_tone

    def is_consistent(self, new_tone: str) -> bool:
        """Verifica si el nuevo tono es consistente con el establecido."""
        if self._conversation_tone is None:
            return True
        # Extraer familia del tono (ej: "empático_calmo" = familia "empático")
        current_family = self._conversation_tone.split("_")[0]
        new_family = new_tone.split("_")[0]
        return current_family == new_family

    def ensure_consistency(self, tone: str) -> str:
        """Retorna un tono consistente o el existente."""
        if self._conversation_tone is None:
            return tone
        if self.is_consistent(tone):
            return tone
        logger.warning(
            "Tono inconsistente detectado: %s vs %s. Manteniendo: %s",
            tone,
            self._conversation_tone,
            self._conversation_tone,
        )
        return self._conversation_tone


def create_adjuster() -> EmotionalToneAdjuster:
    """Factory para crear el adjudicador emocional."""
    return EmotionalToneAdjuster()


def create_consistency_checker() -> ToneConsistency:
    """Factory para crear el checker de consistencia."""
    return ToneConsistency()
