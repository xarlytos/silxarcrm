"""Abstracción de modelo Gemini Live con fallback y reconexión.

Por qué existe: `gemini-3.1-flash-live-preview` da la mejor voz pero está en
*preview* (sin SLA; se observaron errores `code 1011` el 2026-05-27). Esta capa
aísla la elección de modelo y la política de reintentos para que el resto del
código no dependa de un ID concreto ni de fallos transitorios del preview.
"""
from __future__ import annotations

import asyncio
import logging
from dataclasses import dataclass

from app.config import settings

logger = logging.getLogger(__name__)

# Códigos de cierre WebSocket que tratamos como transitorios (reintentables).
_TRANSIENT_CLOSE_CODES = {1011, 1012, 1013, 1006}


@dataclass
class ModelPlan:
    """Orden de preferencia de modelos para una llamada."""

    primary: str
    fallback: str

    def ordered(self) -> list[str]:
        # Evita duplicar si ambos coinciden.
        return [self.primary] + ([self.fallback] if self.fallback != self.primary else [])


def default_plan() -> ModelPlan:
    return ModelPlan(
        primary=settings.gemini_live_model,
        fallback=settings.gemini_live_fallback_model,
    )


def is_transient_error(exc: BaseException) -> bool:
    """¿El error justifica reconectar (en vez de abortar la llamada)?"""
    code = getattr(exc, "code", None) or getattr(exc, "status_code", None)
    if code in _TRANSIENT_CLOSE_CODES:
        return True
    text = str(exc).lower()
    return any(s in text for s in ("1011", "1006", "timeout", "temporarily", "unavailable"))


async def backoff_delays(max_attempts: int = 4, base: float = 0.5):
    """Genera retardos exponenciales con tope (0.5, 1, 2, 4 s...)."""
    for attempt in range(max_attempts):
        yield min(base * (2**attempt), 8.0)


async def sleep_backoff(attempt: int, base: float = 0.5) -> None:
    await asyncio.sleep(min(base * (2**attempt), 8.0))
