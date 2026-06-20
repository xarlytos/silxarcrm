"""Configuracion de identidad del agente (personaje).

Cada software tiene su propio 'actor' con nombre, voz, acento y personalidad.
"""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class IdentityConfig:
    """Quien es el agente: nombre, genero, voz, acento, tono, experiencia."""

    agent_name: str = "Carlos"
    agent_gender: str = "masculino"  # masculino | femenino
    agent_accent: str = "es-ES"  # es-ES, es-MX, es-CO, es-AR...
    agent_tone: str = "profesional_cercano"
    agent_experience_years: int = 4

    # Voz ElevenLabs (None = usar default de config.py)
    elevenlabs_voice_id: str | None = None

    @property
    def agent_title(self) -> str:
        """Titulo del agente con articulo: 'asesor' / 'asesora'."""
        return "asesor" if self.agent_gender == "masculino" else "asesora"

    @property
    def agent_adjective(self) -> str:
        """Adjetivo de genero: 'o' / 'a'."""
        return "o" if self.agent_gender == "masculino" else "a"
