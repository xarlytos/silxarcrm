"""Voice registry — todos los modelos de voz disponibles.

ARQUITECTURA:
- Cada voz tiene metadatos (idioma, género, acento, latencia)
- Cambiar voz es UNA LÍNEA en config.py
- Soporte para múltiples proveedores (ElevenLabs, Google, Azure)

EJEMPLO DE CAMBIO:
  # config.py: solo cambiar esta línea
  elevenlabs_voice_id: str = "XB0fDUnXU5powFXDhCwa"  # → era "ErXwobaYiN019PkySvjV"
  elevenlabs_voice_id: str = "GZa0yHWAFAs7zAh0xLlt"  # Charlotte (multilenguaje)
"""
from enum import Enum
from dataclasses import dataclass


class VoiceGender(Enum):
    """Género percibido de la voz."""
    MASCULINO = "masculino"
    FEMENINO = "femenino"
    NEUTRO = "neutro"


class VoiceProvider(Enum):
    """Proveedor de síntesis de voz."""
    ELEVENLABS = "elevenlabs"
    GOOGLE = "google"
    AZURE = "azure"
    GEMINI = "gemini"


@dataclass
class VoiceInfo:
    """Metadatos de una voz para tomar decisiones automáticas."""
    id: str                           # ID del proveedor
    name: str                         # Nombre amigable
    provider: VoiceProvider           # Proveedor
    language: str                     # ISO 639-1 (es, en, fr)
    region: str                       # Región (es-ES, es-MX, en-US)
    gender: VoiceGender              # Género
    age_group: str                   # "joven", "adulto", "mayor"
    accent: str                      # "castellano", "latino", "neutral"
    professional: bool               # ¿Adecuada para B2B?
    ttfa_ms: int                     # Time-to-first-audio estimado
    available: bool = True           # ¿Está activa?
    notes: str = ""                 # Comentarios


# ════════════════════════════════════════════════════════════════════
# ELEVENLABS — ESPAÑOL ESPAÑA (Castellano peninsular)
# ════════════════════════════════════════════════════════════════════
ELEVENLABS_VOICES_ES_ES = [
    VoiceInfo(
        id="ErXwobaYiN019PkySvjV",  # Antoni
        name="Antoni",
        provider=VoiceProvider.ELEVENLABS,
        language="es",
        region="es-ES",
        gender=VoiceGender.MASCULINO,
        age_group="adulto",
        accent="castellano",
        professional=True,
        ttfa_ms=75,
        available=True,
        notes="ACTUAL: B2B dental, acento castellano profesional"
    ),
    VoiceInfo(
        id="N7IuU1sMQXj7DFv3Ls2p",  # Sergi (alternativa masculina)
        name="Sergi",
        provider=VoiceProvider.ELEVENLABS,
        language="es",
        region="es-ES",
        gender=VoiceGender.MASCULINO,
        age_group="adulto",
        accent="castellano",
        professional=True,
        ttfa_ms=75,
        available=True,
        notes="Alternativa masculina: más joven, menos formal"
    ),
    VoiceInfo(
        id="XB0fDUnXU5powFXDhCwa",  # Charlotte
        name="Charlotte",
        provider=VoiceProvider.ELEVENLABS,
        language="es",
        region="es-ES",
        gender=VoiceGender.FEMENINO,
        age_group="adulto",
        accent="castellano",
        professional=True,
        ttfa_ms=75,
        available=True,
        notes="Opción femenina: multilenguaje, profesional"
    ),
]

# ════════════════════════════════════════════════════════════════════
# ELEVENLABS — ESPAÑOL LATINOAMÉRICA
# ════════════════════════════════════════════════════════════════════
ELEVENLABS_VOICES_ES_MX = [
    VoiceInfo(
        id="0s34q83tAFAXleKVBr3p",  # Diego (mexicano)
        name="Diego",
        provider=VoiceProvider.ELEVENLABS,
        language="es",
        region="es-MX",
        gender=VoiceGender.MASCULINO,
        age_group="adulto",
        accent="latino",
        professional=True,
        ttfa_ms=75,
        available=True,
        notes="Mexicano profesional (B2B México)"
    ),
    VoiceInfo(
        id="GZa0yHWAFAs7zAh0xLlt",  # Isabella (latinoamérica)
        name="Isabella",
        provider=VoiceProvider.ELEVENLABS,
        language="es",
        region="es-MX",
        gender=VoiceGender.FEMENINO,
        age_group="adulto",
        accent="latino",
        professional=True,
        ttfa_ms=75,
        available=True,
        notes="Latinoamericana: natural, accesible"
    ),
]

# ════════════════════════════════════════════════════════════════════
# ELEVENLABS — ENGLISH (fallback universal)
# ════════════════════════════════════════════════════════════════════
ELEVENLABS_VOICES_EN = [
    VoiceInfo(
        id="EXAVITQu4vLQe8TXmLW5",  # Rachel (UK)
        name="Rachel",
        provider=VoiceProvider.ELEVENLABS,
        language="en",
        region="en-GB",
        gender=VoiceGender.FEMENINO,
        age_group="adulto",
        accent="british",
        professional=True,
        ttfa_ms=75,
        available=True,
        notes="Inglés británico: profesional, clara"
    ),
    VoiceInfo(
        id="pNInz6obpgDQGcFmaJgB",  # Adam (US)
        name="Adam",
        provider=VoiceProvider.ELEVENLABS,
        language="en",
        region="en-US",
        gender=VoiceGender.MASCULINO,
        age_group="adulto",
        accent="american",
        professional=True,
        ttfa_ms=75,
        available=True,
        notes="Inglés americano: neutro, profesional"
    ),
]

# ════════════════════════════════════════════════════════════════════
# GEMINI — VOCES NATIVAS (Gemini Live mode)
# ════════════════════════════════════════════════════════════════════
GEMINI_VOICES = [
    VoiceInfo(
        id="Leda",
        name="Leda",
        provider=VoiceProvider.GEMINI,
        language="es",
        region="es-ES",
        gender=VoiceGender.FEMENINO,
        age_group="adulto",
        accent="castellano",
        professional=True,
        ttfa_ms=350,
        available=True,
        notes="ACTUAL: Gemini Live español"
    ),
    VoiceInfo(
        id="Charon",
        name="Charon",
        provider=VoiceProvider.GEMINI,
        language="es",
        region="es-ES",
        gender=VoiceGender.MASCULINO,
        age_group="adulto",
        accent="castellano",
        professional=True,
        ttfa_ms=350,
        available=True,
        notes="Alternativa masculina Gemini Live"
    ),
]

# ════════════════════════════════════════════════════════════════════
# HELPER: Encontrar voz por ID
# ════════════════════════════════════════════════════════════════════
def get_voice_info(voice_id: str) -> VoiceInfo | None:
    """Retorna info de la voz, None si no existe."""
    for voices_list in [
        ELEVENLABS_VOICES_ES_ES,
        ELEVENLABS_VOICES_ES_MX,
        ELEVENLABS_VOICES_EN,
        GEMINI_VOICES,
    ]:
        for voice in voices_list:
            if voice.id == voice_id:
                return voice
    return None


def get_available_voices_by_language(language: str, provider: VoiceProvider | None = None) -> list[VoiceInfo]:
    """Retorna todas las voces disponibles para un idioma.

    EJEMPLO:
      get_available_voices_by_language("es", VoiceProvider.ELEVENLABS)
      → [Antoni, Sergi, Charlotte, Diego, Isabella]
    """
    all_voices = [
        *ELEVENLABS_VOICES_ES_ES,
        *ELEVENLABS_VOICES_ES_MX,
        *ELEVENLABS_VOICES_EN,
        *GEMINI_VOICES,
    ]

    filtered = [
        v for v in all_voices
        if v.available and v.language == language
    ]

    if provider:
        filtered = [v for v in filtered if v.provider == provider]

    return filtered


def get_professional_voices_for_b2b(language: str) -> list[VoiceInfo]:
    """Retorna voces profesionales para B2B (ventas, telefonía)."""
    return [
        v for v in get_available_voices_by_language(language)
        if v.professional
    ]
