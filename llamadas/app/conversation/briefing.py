"""StrategicBriefing — salida estructurada del Supervisor Estratégico."""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class StrategicBriefing:
    """Briefing emitido por el Supervisor Estratégico periódicamente.

    El conversador rápido usa estos campos para orientar su respuesta
    sin tener que razonar desde cero en cada turno.
    """

    objetivo: str = "agendar_demo"
    tono: str = "consultivo"
    objecion_activa: str = ""
    estrategia: str = ""
    alertas: list[str] = field(default_factory=list)
    proxima_pregunta: str = ""
    interes_nivel: int = 5  # 0-10
    notas: str = ""  # pensamiento del supervisor (para debug)

    def to_prompt_section(self) -> str:
        """Convierte el briefing en una sección de prompt para el conversador."""
        lines = [
            "=== BRIEFING ESTRATÉGICO (actualizado por el supervisor) ===",
            f"Objetivo inmediato: {self.objetivo}",
            f"Tono a usar: {self.tono}",
        ]
        if self.objecion_activa:
            lines.append(f"Objeción activa: {self.objecion_activa}")
        if self.estrategia:
            lines.append(f"Estrategia: {self.estrategia}")
        if self.alertas:
            lines.append(f"ALERTAS: {' | '.join(self.alertas)}")
        if self.proxima_pregunta:
            lines.append(f"Próxima pregunta sugerida: {self.proxima_pregunta}")
        lines.append(f"Nivel de interés estimado: {self.interes_nivel}/10")
        lines.append("=== FIN BRIEFING ===")
        return "\n".join(lines)

    def to_dict(self) -> dict[str, Any]:
        return {
            "objetivo": self.objetivo,
            "tono": self.tono,
            "objecion_activa": self.objecion_activa,
            "estrategia": self.estrategia,
            "alertas": self.alertas,
            "proxima_pregunta": self.proxima_pregunta,
            "interes_nivel": self.interes_nivel,
            "notas": self.notas,
        }

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "StrategicBriefing":
        return cls(
            objetivo=data.get("objetivo", "agendar_demo"),
            tono=data.get("tono", "consultivo"),
            objecion_activa=data.get("objecion_activa", ""),
            estrategia=data.get("estrategia", ""),
            alertas=data.get("alertas", []),
            proxima_pregunta=data.get("proxima_pregunta", ""),
            interes_nivel=data.get("interes_nivel", 5),
            notas=data.get("notas", ""),
        )
