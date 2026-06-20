"""Señales rápidas por turno: emoción del prospecto y escenarios de "caos".

Clasificador **heurístico** (sin llamadas extra al modelo) para no añadir latencia
—que es justo lo que queremos optimizar—. Detecta la emoción dominante y
escenarios típicos de caos (ocupado, manejando, mucho ruido). El modelo de voz
ya improvisa la respuesta; estas señales sirven para métricas, alertas y para
ajustar el comportamiento (p.ej. acortar si está ocupado).
"""
from __future__ import annotations

from dataclasses import dataclass

# Palabras clave por emoción (acento mexicano incluido).
_EMOTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "molesto": (
        "no me moleste", "qué fastidio", "que fastidio", "spam", "ya basta",
        "no insista", "grosero", "molesta", "enojado", "harto", "déjeme",
    ),
    "ocupado": (
        "estoy ocupado", "no puedo hablar", "estoy con un cliente", "ahora no",
        "estoy trabajando", "tengo prisa", "rápido", "no tengo tiempo",
    ),
    "interesado": (
        "me interesa", "cuénteme", "cuanto cuesta", "cuánto cuesta", "cómo funciona",
        "como funciona", "suena bien", "demo", "prueba", "quiero", "me late",
    ),
    "confundido": (
        "no entiendo", "cómo así", "como asi", "no le entiendo", "qué dijo",
        "que dijo", "no me quedó claro", "explíqueme", "repita",
    ),
}

# Escenarios de caos -> frase guía sugerida (la usa el flujo, no el modelo).
_CHAOS_KEYWORDS: dict[str, tuple[str, ...]] = {
    "manejando": ("estoy manejando", "voy manejando", "estoy conduciendo", "voy en el carro"),
    "ocupado": ("estoy ocupado", "no puedo hablar", "estoy con un cliente", "ahora no"),
}

# Objeciones comunes en ventas B2B/SaaS para veterinarias/peluquerías/etc.
_OBJECTION_KEYWORDS: dict[str, tuple[str, ...]] = {
    "ya_tenemos_software": (
        "ya tenemos", "ya uso", "ya usamos", "ya tengo", "ya tenemos un sistema",
        "ya contamos con", "ya está todo", "ya lo resolvemos", "ya lo manejamos",
    ),
    "no_tenemos_tiempo": (
        "no tengo tiempo", "estoy muy ocupado", "no puedo ahora", "más tarde",
        "llámame después", "no es buen momento", "ahora no puedo",
    ),
    "es_caro": (
        "es caro", "muy caro", "no tengo presupuesto", "no puedo pagar",
        "está caro", "es mucho", "no me alcanza", "es un gasto",
    ),
    "no_necesitamos": (
        "no lo necesito", "no lo necesitamos", "no nos hace falta",
        "estamos bien así", "no tenemos ese problema", "no nos interesa",
    ),
    "ya_tenemos_proveedor": (
        "ya tenemos proveedor", "ya tenemos contrato", "estamos con",
        "usamos otro", "usamos la competencia", "estamos atados",
    ),
    "no_decido": (
        "no decido", "no soy el dueño", "no soy la encargada",
        "tengo que consultar", "no me toca decidir", "mi jefe decide",
    ),
}

# RMS por debajo del cual hay tanto ruido/línea pobre que conviene WhatsApp.
NOISE_RMS_FLOOR = 0.012


@dataclass
class TurnSignals:
    emotion: str = "neutro"
    chaos: str | None = None
    frustration_delta: int = 0


def analyze_turn(text: str, rms: float | None = None) -> TurnSignals:
    """Devuelve la emoción dominante, escenario de caos y cambio de frustración."""
    t = (text or "").lower()

    emotion = "neutro"
    for emo, kws in _EMOTION_KEYWORDS.items():
        if any(k in t for k in kws):
            emotion = emo
            break

    chaos: str | None = None
    for scenario, kws in _CHAOS_KEYWORDS.items():
        if any(k in t for k in kws):
            chaos = scenario
            break
    if chaos is None and rms is not None and 0 < rms < NOISE_RMS_FLOOR and len(t) < 4:
        # Línea muy pobre / no se entiende nada.
        chaos = "ruido"

    # Frustración sube con molestia, baja con interés.
    delta = 2 if emotion == "molesto" else (-1 if emotion == "interesado" else 0)
    return TurnSignals(emotion=emotion, chaos=chaos, frustration_delta=delta)


def detect_objection(text: str) -> str | None:
    """Detecta si el texto del prospecto contiene una objeción conocida.

    Devuelve el tipo de objeción (ej: 'ya_tenemos_software') o None.
    """
    t = (text or "").lower()
    for obj_type, kws in _OBJECTION_KEYWORDS.items():
        if any(k in t for k in kws):
            return obj_type
    return None


def detect_topic_shift(current_text: str, previous_text: str | None) -> bool:
    """Heurística simple: ¿cambió bruscamente de tema el prospecto?"""
    if not previous_text:
        return False
    # Si la respuesta anterior era muy corta y ahora habla de algo completamente diferente
    # Esto es una heurística simple; el supervisor hará un análisis más profundo
    prev_lower = previous_text.lower()
    curr_lower = current_text.lower()
    # Detectar si menciona algo que no estaba en el contexto previo
    topic_indicators = ["precio", "costo", "demo", "prueba", "software", "sistema", "agendar"]
    prev_topics = [w for w in topic_indicators if w in prev_lower]
    curr_topics = [w for w in topic_indicators if w in curr_lower]
    # Si no comparten ningún topic indicator, posible cambio
    if prev_topics and curr_topics and not any(t in curr_topics for t in prev_topics):
        return True
    return False
