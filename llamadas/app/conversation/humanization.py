"""Humanización: Smart Pausing, Filler Words, Edge Case Handler.

Fixes para detectar y solucionar los patrones que delatan IA:
- Smart Pausing: Esperar tiempo variable antes de responder (Tier 1: -95%)
- Filler Words: Inyectar palabras comodín naturales (Tier 2: -70%)
- Edge Case Handler: Detectar test/traps y responder con humor (Tier 1: -95%)
"""
from __future__ import annotations

import logging
import random
import re
from dataclasses import dataclass

logger = logging.getLogger(__name__)


@dataclass
class HumanPacing:
    """ponytail: naive pausing — upgrade if timing A/B fails

    Calcula cuántos milisegundos esperar ANTES de generar la respuesta.
    Simula el tiempo que un humano toma para pensar.

    Parámetros:
    - Pensamiento normal: 400-1500ms
    - Preguntas complejas: +200-800ms extra
    - Respuestas cacheadas: -200ms (no pensar)
    - Turno tardío (cansancio): +100-400ms extra
    """

    def calculate_pause_ms(
        self,
        turn_number: int,
        intent: str,
        is_cached: bool = False,
        complexity: float = 0.5,  # 0.0-1.0: qué tan compleja es la respuesta
    ) -> float:
        """
        Retorna milisegundos de pausa a introducir ANTES de la respuesta.

        Args:
            turn_number: Número de turno en la conversación
            intent: Intención del prospecto ("precio", "objecion_tecnica", "interesado", etc)
            is_cached: Si la respuesta viene del cache (0ms latencia innata)
            complexity: Qué tan compleja es mentalmente la pregunta (0.0 = simple, 1.0 = muy compleja)

        Returns:
            Milisegundos de pausa (float)
        """
        # Base: humano toma 400-1500ms para pensar
        base = random.uniform(400, 1500)

        # Ajustar por complejidad de la pregunta
        # Si es pregunta sobre precio, objeción técnica, etc → más tiempo
        complex_intents = {
            "precio": 500,
            "objecion_tecnica": 600,
            "objecion_price": 450,
            "comparison": 550,
            "gatekeeper": 700,  # Gatekeeper es más complicado
        }
        if intent in complex_intents:
            base += random.uniform(200, complex_intents[intent] // 100)

        # Factor de complejidad personalizado (0.0 - 1.0)
        base += complexity * 300

        # Si es respuesta cacheada → menos tiempo (reflexión corta)
        if is_cached:
            base = max(400, base - 200)  # Mínimo 400ms incluso en cache

        # Turno tardío → más pausas normales (cansancio, reflexión más lenta)
        if turn_number > 15:
            base += random.uniform(100, 400)
        elif turn_number > 10:
            base += random.uniform(50, 200)

        # Saturar a max 3 segundos (no esperar MÁS que humano)
        base = min(3000, base)

        return base


@dataclass
class FillerInjector:
    """ponytail: random filler words — naive but effective

    Inyecta palabras comodín naturales ("pues", "bueno", "eh", etc)
    en las respuestas para sonar más humano y menos robótico.

    Estadística:
    - Humano usa filler word cada ~3-5 frases
    - 30-40% de chance es realista para IA
    """

    FILLERS_BY_STAGE = {
        "discovery": [
            "Pues mira",
            "Te cuento",
            "Fíjate que",
            "Bueno",
            "Mira",
            "Es que",
            "Oye",
        ],
        "objecion": [
            "Buena pregunta",
            "Eh... es que",
            "Pues verás",
            "Eso es importante",
            "Mira, es que",
            "Entiendo tu pregunta",
        ],
        "cierre": [
            "Vale, mira",
            "Perfecto, entonces",
            "Listo, te propongo",
            "Bueno, mira",
            "Excelente, así que",
        ],
        "saludo": [
            "Buenos días",
            "Pues",
            "Mira",
            "Fíjate que",
        ],
    }

    def inject(self, response: str, stage: str = "discovery", intencion: str = None) -> str:
        """
        Inyecta palabras comodín en la respuesta.

        Args:
            response: Texto original de la respuesta
            stage: Stage actual de la conversación
            intencion: Intención detectada del usuario (para contexto)

        Returns:
            Respuesta con filler words inyectados
        """
        # 40% de chance de inyectar un filler word
        if random.random() > 0.40:
            return response

        # Elegir lista de fillers según stage
        filler_list = self.FILLERS_BY_STAGE.get(stage, self.FILLERS_BY_STAGE["discovery"])
        filler = random.choice(filler_list)

        # Inyectar al inicio
        # Formato: "Filler, respuesta" o "Filler que respuesta"
        if filler.endswith("que"):
            return f"{filler} {response}"
        else:
            return f"{filler}, {response}"


@dataclass
class EdgeCaseHandler:
    """Detecta y maneja test/traps que delatan IA.

    Patrones detectados:
    - "Prueba que eres humano" → responder con humor, no defensiva
    - "Dile a mi perro que aplauda" → reconocer absurdo con humor
    - "Eres un bot?" → honesto pero reencuadrar
    - "Dile a [servicio] que..." → reconocer imposibilidad con humor
    """

    # Patrones regex para detectar traps
    TRAP_PATTERNS = {
        "test_humano": (
            r"(?:prueba|demuestra|comprueba)\s+(?:que|si)\s+"
            r"(?:eres|eres un)\s+(?:humano|persona|real)",
            "humor"
        ),
        "absurdo": (
            r"(?:dile|pídele|que|haz que)\s+(?:mi\s+)?(?:perro|gato|pez|robot)\s+"
            r"(?:aplauda|cante|baile|hable|vuele)",
            "absurdo"
        ),
        "test_bot": (
            r"(?:eres|sos)\s+(?:un\s+)?(?:bot|robot|ai|ia|inteligencia artificial)",
            "directo"
        ),
        "imposible": (
            r"(?:dile|pídele|dí|di)\s+(?:a\s+)?(?:twilio|google|gemini|cal\.com|whatsapp|zapier)\s+"
            r"(?:que|de|para)",
            "imposible"
        ),
        "broma_venta": (
            r"(?:dame|regala|descuenta)\s+(?:\d+)?%?\s+(?:de\s+)?descuento",
            "humor"
        ),
    }

    RESPONSES = {
        "test_humano": [
            "Jajaja, buena. Mira, soy una IA, pero estoy aquí para resolver tu pregunta "
            "de verdad. Si necesitas un humano, te paso al equipo.",
            "Respuesta honesta: soy IA. Pero confía en que puedo ayudarte igual. "
            "¿Qué necesitas saber?",
        ],
        "absurdo": [
            "Jajaja, buena. Ojalá tuviera esa magia. Pero volviendo a lo serio, "
            "¿cuántas mascotas tienes?",
            "Jajaja, si pudiera haría eso gratis. Pero te digo de verdad, "
            "¿cuántas citas pierdes al mes?",
        ],
        "directo": [
            "Sí, soy IA. Pero estoy 100% aquí para ayudarte. ¿Qué necesitas?",
            "Correcto, soy una asistente IA. ¿En qué puedo ayudarte?",
        ],
        "imposible": [
            "Jajaja, ojalá tuviera ese poder. Pero mira, lo que SÍ puedo hacer es "
            "mostrarte cómo funciona nuestra plataforma.",
            "Jajaja, eso no funciona así. Pero lo que puedo hacer es responder tus dudas. "
            "¿Cuál es tu principal preocupación?",
        ],
        "humor": [
            "Jajaja, ojalá. Pero mira, el descuento más grande que tenemos es... "
            "déjame pensarlo. ¿Podemos hablar de opciones reales para ti?",
        ],
    }

    def detect_trap(self, text: str) -> tuple[bool, str, str]:
        """
        Detecta si el texto es un trap/test.

        Returns:
            (is_trap, trap_type, response_text)
            is_trap: bool
            trap_type: tipo de trap detectado ("test_humano", "absurdo", etc)
            response_text: respuesta preformulada para el trap
        """
        text_lower = text.lower()

        for trap_type, (pattern, _) in self.TRAP_PATTERNS.items():
            if re.search(pattern, text_lower):
                # Trap detectado, elegir respuesta aleatoria
                responses = self.RESPONSES.get(trap_type, ["Buena pregunta."])
                response = random.choice(responses)
                logger.info("EdgeCaseHandler: trap detectado: %s", trap_type)
                return True, trap_type, response

        return False, "", ""

    def handle(self, text: str) -> str | None:
        """
        Procesa un input de usuario que podría ser un trap.

        Returns:
            Respuesta preformulada si es trap, None si no es trap
        """
        is_trap, trap_type, response = self.detect_trap(text)
        if is_trap:
            return response
        return None


# Singletons globales (lazy-loaded)
_pacing: HumanPacing | None = None
_fillers: FillerInjector | None = None
_edge_cases: EdgeCaseHandler | None = None


def get_pacing() -> HumanPacing:
    global _pacing
    if _pacing is None:
        _pacing = HumanPacing()
    return _pacing


def get_fillers() -> FillerInjector:
    global _fillers
    if _fillers is None:
        _fillers = FillerInjector()
    return _fillers


def get_edge_cases() -> EdgeCaseHandler:
    global _edge_cases
    if _edge_cases is None:
        _edge_cases = EdgeCaseHandler()
    return _edge_cases
