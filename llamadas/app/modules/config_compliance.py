"""Configuracion de compliance/regulaciones por pais."""
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class ComplianceConfig:
    """Reglas legales: horarios, disclosure, dias permitidos."""

    # Aviso de IA al inicio de la llamada
    disclosure_text: str = "Soy un asistente virtual de {company_name}"

    # Horario legal de llamadas
    call_hour_start: int = 9
    call_hour_end: int = 20
    call_days_allowed: str = "1,2,3,4,5,6"  # 0=dom, 1=lun...

    # Zona horaria (para calcular horario legal)
    timezone: str = "Europe/Madrid"

    # Lista Robinson / REUS / opt-out (por pais)
    optout_enabled: bool = True

    def is_day_allowed(self, weekday: int) -> bool:
        """Verifica si un dia de la semana esta permitido.
        weekday: 0=lunes, 6=domingo (Python) o 1=lunes, 0=domingo (ISO)
        """
        allowed = [int(d.strip()) for d in self.call_days_allowed.split(",")]
        # Convertir de Python weekday (0=lun) a nuestro formato (1=lun)
        our_format = weekday + 1
        return our_format in allowed
