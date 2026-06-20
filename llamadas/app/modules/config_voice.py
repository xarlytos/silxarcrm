"""Configuracion de telefonia/voz (Twilio, ElevenLabs)."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class VoiceConfig:
    """Configuracion de voz y telefonia: CNAM, caller ID, formato de audio."""

    # CNAM / Caller ID (max 15 chars en Twilio)
    twilio_cnam_name: str | None = None

    # Numero de salida especifico para este software
    twilio_from_number: str | None = None

    # Estrategia de caller ID: "static" o "dynamic" (por LADA/prefijo)
    caller_id_strategy: str = "static"

    # Numero de transferencia a humano
    human_transfer_number: str | None = None
