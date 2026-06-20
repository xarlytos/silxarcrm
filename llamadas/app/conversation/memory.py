"""Gestor de Memoria — mantiene estado compacto de la conversación.

Resume historial largo para que el conversador rápido no tenga que
procesar 50+ turnos en cada interacción.
"""
from __future__ import annotations

import json
import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class ConversationMemory:
    """Memoria compacta de la conversación, mantenida por el Gestor de Memoria."""

    nombre: str = ""
    cargo: str = ""
    negocio: str = ""
    interes_nivel: int = 5  # 0-10
    objeciones_encontradas: list[str] = field(default_factory=list)
    datos_clave: dict[str, Any] = field(default_factory=dict)
    resumen_corto: str = ""  # "Lead tiene software X, le preocupa precio"
    ultima_emocion: str = "neutro"
    turnos_resumidos: int = 0  # cuántos turnos ya entraron en el resumen

    def to_prompt_section(self) -> str:
        """Convierte la memoria en una sección de prompt para el conversador."""
        lines = ["=== MEMORIA DE LA CONVERSACIÓN ==="]
        if self.nombre:
            lines.append(f"Nombre: {self.nombre}")
        if self.cargo:
            lines.append(f"Cargo: {self.cargo}")
        if self.negocio:
            lines.append(f"Negocio: {self.negocio}")
        lines.append(f"Nivel de interés: {self.interes_nivel}/10")
        lines.append(f"Última emoción detectada: {self.ultima_emocion}")
        if self.objeciones_encontradas:
            lines.append(f"Objeciones mencionadas: {', '.join(self.objeciones_encontradas)}")
        if self.datos_clave:
            datos = "; ".join(f"{k}={v}" for k, v in self.datos_clave.items())
            lines.append(f"Datos clave: {datos}")
        if self.resumen_corto:
            lines.append(f"Resumen: {self.resumen_corto}")
        lines.append("=== FIN MEMORIA ===")
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            "nombre": self.nombre,
            "cargo": self.cargo,
            "negocio": self.negocio,
            "interes_nivel": self.interes_nivel,
            "objeciones_encontradas": self.objeciones_encontradas,
            "datos_clave": self.datos_clave,
            "resumen_corto": self.resumen_corto,
            "ultima_emocion": self.ultima_emocion,
            "turnos_resumidos": self.turnos_resumidos,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ConversationMemory":
        return cls(
            nombre=data.get("nombre", ""),
            cargo=data.get("cargo", ""),
            negocio=data.get("negocio", ""),
            interes_nivel=data.get("interes_nivel", 5),
            objeciones_encontradas=data.get("objeciones_encontradas", []),
            datos_clave=data.get("datos_clave", {}),
            resumen_corto=data.get("resumen_corto", ""),
            ultima_emocion=data.get("ultima_emocion", "neutro"),
            turnos_resumidos=data.get("turnos_resumidos", 0),
        )


class MemoryManager:
    """Gestiona la memoria: extrae datos, resume historial, mantiene estado compacto."""

    def __init__(self, max_turns_before_summary: int = 15, summary_threshold: int = 10) -> None:
        self.max_turns_before_summary = max_turns_before_summary
        self.summary_threshold = summary_threshold

    def update_from_turn(self, memory: ConversationMemory, role: str, text: str, emotion: str = "neutro") -> None:
        """Actualiza la memoria con un nuevo turno."""
        memory.ultima_emocion = emotion

        # Extraer nombre si el usuario lo dice
        if role == "prospecto" and not memory.nombre:
            # Heurística simple: "soy [nombre]" o "me llamo [nombre]"
            import re
            match = re.search(r"(?:soy|me llamo|mi nombre es)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)", text, re.IGNORECASE)
            if match:
                memory.nombre = match.group(1).strip()
                logger.info("Nombre extraído: %s", memory.nombre)

        # Extraer cargo
        if role == "prospecto" and not memory.cargo:
            match = re.search(r"(?:soy\s+(?:el\s+|la\s+)?)(\w+)(?:\s+de)\s+", text, re.IGNORECASE)
            if match:
                memory.cargo = match.group(1).strip()

        # Extraer nombre del negocio
        if role == "prospecto" and not memory.negocio:
            match = re.search(r"(?:trabajo en|soy de|mi negocio es|mi clínica es|mi gimnasio es)\s+([A-Z][^,.]+)", text, re.IGNORECASE)
            if match:
                memory.negocio = match.group(1).strip()

        # Actualizar interés basado en emoción
        if emotion == "interesado":
            memory.interes_nivel = min(10, memory.interes_nivel + 1)
        elif emotion == "molesto":
            memory.interes_nivel = max(0, memory.interes_nivel - 2)

    def needs_summary(self, total_turns: int, memory: ConversationMemory) -> bool:
        """¿Es momento de resumir el historial?"""
        return total_turns > self.max_turns_before_summary and total_turns > memory.turnos_resumidos + self.summary_threshold

    async def summarize(self, transcript: list[dict[str, str]], memory: ConversationMemory, llm_client=None) -> None:
        """Resume el historial completo usando un LLM y actualiza la memoria."""
        if not transcript:
            return

        # Construir texto del historial
        historial_texto = "\n".join(
            f"{t['role']}: {t['text']}" for t in transcript
        )

        prompt = f"""Resume la siguiente conversación comercial en 2-3 oraciones. Extrae:
- Qué software/herramienta usa el lead actualmente
- Qué le preocupa o qué objeciones tiene
- Qué ha mostrado interés
- Datos relevantes (precio, tamaño, ciudad)

Conversación:
{historial_texto}

Resumen corto:"""

        try:
            if llm_client is None:
                # Fallback: no hay LLM disponible, mantener resumen manual
                return

            from google.genai import types
            resp = await llm_client.aio.models.generate_content(
                model="gemini-2.5-flash",
                contents=[types.Content(parts=[types.Part(text=prompt)])],
                config=types.GenerateContentConfig(max_output_tokens=200),
            )
            if resp.text:
                memory.resumen_corto = resp.text.strip()
                memory.turnos_resumidos = len(transcript)
                logger.info("Memoria resumida (%d turnos): %s", memory.turnos_resumidos, memory.resumen_corto[:80])
        except Exception as exc:
            logger.warning("Error resumiendo memoria: %s", exc)
