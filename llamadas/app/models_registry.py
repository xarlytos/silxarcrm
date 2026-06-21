"""Model registry — todos los modelos disponibles con fallback chains.

ARQUITECTURA:
- Cada tier (VETA, MAESTRO, EMBEDDING) tiene una lista ordenada de modelos
- Si uno falla/timeout, automáticamente intenta el siguiente
- Cambiar modelo es UNA LÍNEA en config.py

EJEMPLO DE CAMBIO:
  # config.py: solo cambiar esta línea
  gemini_chat_model: str = "gemini-3.1-flash"  # → era "gemini-3.1-flash-lite"

  El sistema AUTOMÁTICAMENTE recae a fallbacks en gemini_chat_fallback_model.
"""
from enum import Enum
from dataclasses import dataclass


class ModelTier(Enum):
    """Categoría de modelo por velocidad/costo/calidad."""
    ULTRA_RÁPIDO = "ultra_rapido"      # <200ms TTFT (Lite, Haiku)
    RÁPIDO = "rapido"                  # 200-400ms TTFT (Flash)
    INTELIGENTE = "inteligente"         # 400-800ms TTFT (Pro)
    MÁXIMO = "maximo"                  # 800ms+ TTFT (Ultra)


@dataclass
class ModelInfo:
    """Metadatos de un modelo para tomar decisiones automáticas."""
    id: str                           # ID exacto para API
    provider: str                      # "gemini", "gpt", etc
    tier: ModelTier                   # Velocidad esperada
    ttft_ms: int                      # Time-to-first-token estimado
    context_window: int               # Max tokens
    available: bool = True            # ¿está activo en tu cuenta?
    notes: str = ""                   # "no en free tier", etc


# ════════════════════════════════════════════════════════════════════
# GEMINI — VOZ (ultra-rápido, ejecutor del brief del Maestro)
# ════════════════════════════════════════════════════════════════════
GEMINI_CHAT_MODELS = [
    ModelInfo(
        id="gemini-3.1-flash-lite",
        provider="gemini",
        tier=ModelTier.ULTRA_RÁPIDO,
        ttft_ms=180,
        context_window=8000,
        available=True,
        notes="RECOMENDADO: ultra-bajo TTFT (~180ms), ideal telefonía"
    ),
    ModelInfo(
        id="gemini-3.1-flash",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=250,
        context_window=8000,
        available=True,
        notes="Fallback 1: más inteligente que Lite, todavía rápido (~250ms)"
    ),
    ModelInfo(
        id="gemini-2.5-flash",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=280,
        context_window=8000,
        available=True,
        notes="Fallback 2: estable, mucho más versátil"
    ),
    ModelInfo(
        id="gemini-1.5-flash",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=300,
        context_window=1_000_000,
        available=False,
        notes="Fallback 3: no recomendado (deprecated, deprecated)"
    ),
]

# ════════════════════════════════════════════════════════════════════
# GEMINI — MAESTRO (Estratega: genera briefs para el Voz)
# ════════════════════════════════════════════════════════════════════
GEMINI_MASTER_MODELS = [
    ModelInfo(
        id="gemini-3.5-flash",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=320,
        context_window=8000,
        available=True,
        notes="RECOMENDADO: balance velocidad/inteligencia para estrategia"
    ),
    ModelInfo(
        id="gemini-3.1-flash",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=250,
        context_window=8000,
        available=True,
        notes="Fallback 1: más ligero pero competente"
    ),
    ModelInfo(
        id="gemini-2.5-flash",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=280,
        context_window=8000,
        available=True,
        notes="Fallback 2: estable, fallback seguro"
    ),
    ModelInfo(
        id="gemini-1.5-pro",
        provider="gemini",
        tier=ModelTier.INTELIGENTE,
        ttft_ms=600,
        context_window=1_000_000,
        available=False,
        notes="Fallback 3 (LENTO): solo si necesitas contexto extremo"
    ),
]

# ════════════════════════════════════════════════════════════════════
# GEMINI — NATIVE AUDIO (Gemini Live: alternativa sin ElevenLabs)
# ════════════════════════════════════════════════════════════════════
GEMINI_LIVE_MODELS = [
    ModelInfo(
        id="gemini-3.1-flash-live-preview",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=350,
        context_window=8000,
        available=True,
        notes="RECOMENDADO: ultra-baja latencia sin ElevenLabs (~350ms)"
    ),
    ModelInfo(
        id="gemini-2.5-flash-native-audio-latest",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=380,
        context_window=8000,
        available=True,
        notes="Fallback: compatible con API key de AI Studio"
    ),
]

# ════════════════════════════════════════════════════════════════════
# EMBEDDING MODELS
# ════════════════════════════════════════════════════════════════════
GEMINI_EMBEDDING_MODELS = [
    ModelInfo(
        id="gemini-embedding-001",
        provider="gemini",
        tier=ModelTier.RÁPIDO,
        ttft_ms=50,
        context_window=8000,
        available=True,
        notes="RECOMENDADO: embeddings rápidos"
    ),
]

# ════════════════════════════════════════════════════════════════════
# HELPER: Encontrar modelo por ID
# ════════════════════════════════════════════════════════════════════
def get_model_info(model_id: str) -> ModelInfo | None:
    """Retorna info del modelo, None si no existe."""
    for models_list in [
        GEMINI_CHAT_MODELS,
        GEMINI_MASTER_MODELS,
        GEMINI_LIVE_MODELS,
        GEMINI_EMBEDDING_MODELS,
    ]:
        for model in models_list:
            if model.id == model_id:
                return model
    return None


def get_available_fallback_chain(current_model: str, models_list: list[ModelInfo]) -> list[str]:
    """Retorna cadena de fallbacks para un modelo actual.

    EJEMPLO:
      get_available_fallback_chain("gemini-3.1-flash-lite", GEMINI_CHAT_MODELS)
      → ["gemini-3.1-flash", "gemini-2.5-flash"]
    """
    current_idx = None
    for i, model in enumerate(models_list):
        if model.id == current_model:
            current_idx = i
            break

    if current_idx is None:
        return []

    # Retornar todos los modelos disponibles DESPUÉS del actual
    return [m.id for m in models_list[current_idx + 1:] if m.available]
