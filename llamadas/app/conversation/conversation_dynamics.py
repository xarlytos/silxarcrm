"""Conversation Dynamics: Turn-taking, interruptions, natural pauses.

Cierra gaps en cómo humano PARTICIPA en conversación:
- Cuando interrumpe (y CUÁNDO es apropiado)
- Cuándo se queda en silencio (pensando)
- Solapamiento de habla (cuando empieza antes de que termine)
- Validación simultánea ("Sí, exacto" mientras el otro habla)
- Recovery de interrupciones (cómo vuelve al tema)
"""
from __future__ import annotations

import logging
import random
from dataclasses import dataclass
from enum import Enum

logger = logging.getLogger(__name__)


class ConversationPhase(Enum):
    """Fase de la conversación donde estamos."""
    DISCOVERY = "discovery"  # Aprendiendo del prospect
    PRESENTATION = "presentation"  # Presentando solución
    OBJECTION = "objection"  # Manejo de objeción
    CLOSING = "closing"  # Cierre de demo
    EXIT = "exit"  # Despedida


@dataclass
class InterruptionProfile:
    """
    Patrones de cuándo humano PUEDE interrumpir.

    Humano interrumpe cuando:
    - Prospect repetidor (ya lo dijo 2x)
    - Prospect está en tangente (fuera de tema)
    - Prospect está equivocado (factualmente)
    - Prospect no responde (silencio prolongado)
    """

    repetition_count: int = 0  # Cuántas veces dijo lo mismo
    off_topic_signals: int = 0  # Qué tan lejos del tema
    prospect_talking_time: float = 0.0  # Cuánto tiempo lleva hablando


@dataclass
class SilenceHandling:
    """
    Humano usa silencio como herramienta.

    Tipos de silencio:
    - Pensativo: 1-2s (contemplando pregunta)
    - Expectante: 0.5-1s (esperando que prospect continúe)
    - Incómodo: 2-3s (cuando prospect dice algo que choca)
    """

    silence_type: str = "pensativo"
    duration_ms: int = 0


@dataclass
class TurnTakingSimulator:
    """
    ponytail: naive turn-taking — upgrade if overlaps confuse prospects

    Simula tomar turnos de forma natural:
    - Espera apropiada antes de responder
    - Solapamiento de habla (startups, backchannels)
    - Validación en tiempo real ("Sí, exacto", "Claro")
    """

    def should_interrupt(
        self,
        prospect_talking_ms: float,
        phase: ConversationPhase,
        repetition_count: int,
        off_topic_level: float,
    ) -> bool:
        """
        ¿Debería interrumpir?

        Args:
            prospect_talking_ms: Cuánto tiempo lleva hablando
            phase: Fase de conversación
            repetition_count: Cuántas veces dijo lo mismo
            off_topic_level: 0.0-1.0 qué tan off-topic está (1.0 = completamente)

        Returns:
            True si es apropiado interrumpir
        """
        # Nunca interrumpir en discovery (escuchar)
        if phase == ConversationPhase.DISCOVERY:
            return False

        # Interrumpir si es repetidor (ya lo dijo 2+ veces)
        if repetition_count >= 2:
            return True

        # Interrumpir si está MUUY off-topic (0.8+)
        if off_topic_level > 0.8:
            return True

        # Interrumpir si habla más de 30 segundos (muy largo)
        if prospect_talking_ms > 30000:
            return True

        return False

    def get_interruption_phrase(self) -> str:
        """
        Frases naturales para interrumpir sin ser rudo.

        Ejemplos:
        - "Espera, déjame..." (suave)
        - "Un segundo, quería..." (neutral)
        - "Sí, pero mira..." (validating + redirigiendo)
        """
        phrases = [
            "Espera un segundo, algo que quería...",
            "Sí, pero creo que lo importante es...",
            "Eso es, ahí va mi pregunta: ...",
            "Dale, para, una cosa: ...",
            "Exacto, y ahí es donde...",
        ]
        return random.choice(phrases)

    def get_backchanneling_response(self, prospect_statement: str) -> str | None:
        """
        Validación en tiempo real mientras prospect habla.

        Ejemplos:
        - Prospect: "entonces pierdo clientes"
        - Humano: [backchannel] "Sí, exacto"
        - Prospect: "y eso me cuesta dinero"

        30% chance
        """
        if random.random() > 0.30:
            return None

        backchannels = [
            "Sí, exacto",
            "Claro, entiendo",
            "Uh-huh, sí",
            "Dale, sigue",
            "Correcto",
            "Eso es",
        ]
        return random.choice(backchannels)


@dataclass
class SilenceSimulator:
    """
    Silencios naturales en conversación.

    Humano no siempre llena silencio. A veces:
    - Espera a que prospect continúe
    - Piensa antes de responder a pregunta difícil
    - Usa silencio para énfasis
    """

    def should_add_silence(self, phase: ConversationPhase, turn: int) -> bool:
        """¿Es apropiado un silencio aquí?"""
        # Silencio en objection (mientras se piensa la respuesta)
        if phase == ConversationPhase.OBJECTION and random.random() > 0.70:
            return True

        # Silencio al final para que prospect continúe (discovery)
        if phase == ConversationPhase.DISCOVERY and turn > 3:
            return True

        return False

    def get_silence_marker(self, silence_type: str = "pensativo") -> str:
        """
        Marker para TTS que indique silencio.

        Formatos:
        - [SILENCE:200ms] (silencio sin sonido)
        - [PAUSE:300ms] (pausa natural)
        """
        durations = {
            "pensativo": random.randint(1000, 2000),  # 1-2s
            "expectante": random.randint(500, 1000),  # 0.5-1s
            "incomodo": random.randint(2000, 3000),  # 2-3s
        }

        duration = durations.get(silence_type, 1000)
        return f"[SILENCE:{duration}ms]"


@dataclass
class RecoveryPatterns:
    """
    Cómo se recupera humano de errores/interrupciones.

    Ejemplos:
    - Prospect interrumpe → Humano: "Ah sí, claro. Donde iba..."
    - Humano se equivoca → "Espera, no, eso no. Lo que quise decir..."
    - Ambos hablan al mismo tiempo → Uno cede: "Dale, vos primero"
    """

    def get_recovery_phrase(self, error_type: str) -> str:
        """Frases de recuperación después de error."""
        recoveries = {
            "misspoken": [
                "Espera, eso no. Lo que quise decir es...",
                "No, no, déjame reformular...",
                "Ah, mal explicado. En realidad...",
            ],
            "interrupted": [
                "Dónde iba... ah sí",
                "Espera, me cortaste cuando...",
                "Volviendo a lo que decía...",
            ],
            "forgot": [
                "Me olvidé lo que iba a decir",
                "¿Qué era lo que iba? Ah sí...",
                "Espera, me perdi un poco...",
            ],
            "confused": [
                "Un segundo, déjame pensar...",
                "Espera, me confundió un poco eso...",
                "Mira, déjame recapitular...",
            ],
        }

        phrases = recoveries.get(error_type, ["Ah, sí, exacto"])
        return random.choice(phrases)


@dataclass
class NaturalPausePatterns:
    """
    Patrones de pausa que parecen naturales.

    Combinación de pausas crea ritmo conversacional que parece humano:
    - p50: 700-900ms (natural)
    - p95: 1200-1500ms (reflexión)
    - Max: 3000ms (silencio incómodo)
    """

    def get_pause_for_context(
        self,
        context: str,
        turn: int,
        emocion: str,
    ) -> float:
        """
        Devuelve pausa en ms basada en contexto.

        TIPO DE CONTEXTO:
        - "respuesta_directa": 400-800ms
        - "pensamiento": 1000-2000ms
        - "buscar_palabra": 800-1200ms
        - "reaccion_choque": 1500-3000ms
        """
        base_pauses = {
            "respuesta_directa": (400, 800),
            "pensamiento": (1000, 2000),
            "buscar_palabra": (800, 1200),
            "reaccion_choque": (1500, 3000),
        }

        min_p, max_p = base_pauses.get(context, (600, 1200))

        # Ajustar por emoción
        if emocion == "molesto":
            min_p, max_p = int(min_p * 1.3), int(max_p * 1.3)  # Más lento
        elif emocion == "entusiasta":
            min_p, max_p = int(min_p * 0.85), int(max_p * 0.85)  # Más rápido
        elif emocion == "ocupado":
            min_p, max_p = int(min_p * 0.8), int(max_p * 0.8)  # Mucho más rápido

        # Ajustar por turno (turno tardío = más lento)
        if turn > 10:
            min_p, max_p = int(min_p * 1.1), int(max_p * 1.1)

        return float(random.randint(min_p, max_p))

    def get_pause_distribution(self) -> dict:
        """
        Retorna distribución de pausas para la llamada.

        Humano NO tiene distribución uniforme.
        Algunos turnos rápidos, otros lentos, patrón variable.
        """
        # Generar 10 pausas random
        pauses = []
        for _ in range(10):
            # 60% corta, 30% media, 10% larga
            r = random.random()
            if r < 0.60:
                pauses.append(random.randint(400, 800))  # Corta
            elif r < 0.90:
                pauses.append(random.randint(1000, 1500))  # Media
            else:
                pauses.append(random.randint(2000, 3000))  # Larga

        return {
            "p50": int(sum(pauses) / len(pauses)),
            "p95": int(sorted(pauses)[int(len(pauses) * 0.95)]),
            "distribution": pauses,
        }


@dataclass
class OverlapSimulation:
    """
    Simulación de solapamiento de habla (cuando ambos hablan al mismo tiempo).

    Raro (5% de veces) pero MUY realista cuando sucede.

    Ejemplo:
    Prospect: "Entonces creo que..."
    Humano: [inicia respuesta ANTES de que termine]
    Prospect: [se detiene]
    Humano: "Perfecto, así que..."
    """

    def should_overlap(self, phase: ConversationPhase) -> bool:
        """5% chance de solapamiento."""
        return random.random() < 0.05

    def get_overlap_response(self) -> str:
        """Respuesta que inicia solapamiento."""
        responses = [
            "Sí, exacto, y aquí...",
            "Claro, y lo importante es...",
            "Ah sí, eso que dices...",
            "Perfecto, entonces...",
        ]
        return random.choice(responses)


def simulate_natural_conversation_dynamics(
    response: str,
    phase: ConversationPhase,
    turn: int,
    emocion: str,
    prospect_talking_ms: float = 0.0,
) -> dict:
    """
    Aplicar dinámicas naturales de conversación.

    Retorna:
    {
        "response": texto adaptado,
        "pause_before_ms": cuánto esperar antes de responder,
        "silence_marker": si hay silencio,
        "backchanneling": validación simultánea,
        "recovery": si se recupera de error,
    }
    """
    result = {
        "response": response,
        "pause_before_ms": 0,
        "silence_marker": "",
        "backchanneling": None,
        "recovery": None,
        "should_overlap": False,
    }

    # 1. Pausa antes de responder (Smart Pausing)
    pauser = NaturalPausePatterns()
    context = "pensamiento" if phase == ConversationPhase.OBJECTION else "respuesta_directa"
    result["pause_before_ms"] = pauser.get_pause_for_context(context, turn, emocion)

    # 2. ¿Agregar silencio para que prospect continúe?
    silence_sim = SilenceSimulator()
    if silence_sim.should_add_silence(phase, turn):
        result["silence_marker"] = silence_sim.get_silence_marker("expectante")

    # 3. ¿Backchanneling? (validación en tiempo real)
    # (En práctica: se agrega DURANTE respuesta del prospect, no en la IA)

    # 4. ¿Recuperación de error? (raro, 2%)
    if random.random() < 0.02:
        recovery_phrase = RecoveryPatterns().get_recovery_phrase("confused")
        result["recovery"] = recovery_phrase
        result["response"] = recovery_phrase + " " + response

    # 5. ¿Solapamiento? (muy raro, 5%)
    if random.random() < 0.05 and phase != ConversationPhase.DISCOVERY:
        result["should_overlap"] = True

    return result
