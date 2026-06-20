"""Case Study Repository: casos de exito fuera de AgentConfig.

Antes: success_cases vivian dentro de AgentConfig (se hinchaba con 50+ casos).
Ahora: los casos viven en su propio repositorio y se buscan por filtros.

AgentConfig solo guarda:
- target_vertical (para filtrar casos)
- market_country (para filtrar casos)
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class CaseStudy:
    """Un caso de exito individual."""

    id: str
    tipo_negocio: str  # "dentista", "peluqueria_canina", "gimnasio"...
    empresa: str
    ciudad: str
    pais: str  # "es", "mx", "co"...
    resultado: str
    metrica_destacada: str = ""
    testimonial: str = ""
    tiempo_a_resultado: str = ""
    tags: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "id": self.id,
            "tipo_negocio": self.tipo_negocio,
            "empresa": self.empresa,
            "ciudad": self.ciudad,
            "pais": self.pais,
            "resultado": self.resultado,
            "metrica_destacada": self.metrica_destacada,
            "testimonial": self.testimonial,
            "tiempo_a_resultado": self.tiempo_a_resultado,
            "tags": self.tags,
        }


class CaseStudyRepository:
    """Repositorio de casos de exito. Busqueda por filtros.

    Uso:
        repo = CaseStudyRepository()
        repo.add_case(CaseStudy(...))

        # Buscar casos para una clinica dental en Madrid
        casos = repo.find_cases(
            tipo_negocio="dentista",
            pais="es",
            ciudad="madrid",
            limit=3,
        )
    """

    def __init__(self, cases: list[CaseStudy] | None = None):
        self._cases: list[CaseStudy] = cases or []

    def add_case(self, case: CaseStudy) -> None:
        self._cases.append(case)

    def add_cases(self, cases: list[CaseStudy]) -> None:
        self._cases.extend(cases)

    def find_cases(
        self,
        tipo_negocio: str | None = None,
        pais: str | None = None,
        ciudad: str | None = None,
        tags: list[str] | None = None,
        limit: int = 3,
    ) -> list[CaseStudy]:
        """Busca casos que coincidan con los filtros.

        Orden de prioridad:
        1. Exact match tipo_negocio + pais + ciudad
        2. Match tipo_negocio + pais
        3. Match tipo_negocio
        4. Match pais
        5. Cualquier caso (fallback)
        """
        results: list[tuple[int, CaseStudy]] = []

        for case in self._cases:
            score = 0

            # Puntuacion por match
            if tipo_negocio and tipo_negocio.lower() in case.tipo_negocio.lower():
                score += 10
            if pais and pais.lower() == case.pais.lower():
                score += 5
            if ciudad and ciudad.lower() in case.ciudad.lower():
                score += 3
            if tags:
                case_tags = set(t.lower() for t in case.tags)
                query_tags = set(t.lower() for t in tags)
                if case_tags & query_tags:
                    score += 2

            if score > 0:
                results.append((score, case))

        # Ordenar por score descendente
        results.sort(key=lambda x: x[0], reverse=True)

        return [case for _, case in results[:limit]]

    def find_best_case(
        self,
        tipo_negocio: str | None = None,
        pais: str | None = None,
        ciudad: str | None = None,
    ) -> CaseStudy | None:
        """Devuelve el mejor caso de exito para los filtros dados."""
        cases = self.find_cases(tipo_negocio, pais, ciudad, limit=1)
        return cases[0] if cases else None

    def to_natural_message(self, case: CaseStudy, nicho: str = "") -> str:
        """Convierte un caso en un mensaje natural para el agente."""
        pais_nombre = "Espana" if case.pais == "es" else "Mexico" if case.pais == "mx" else case.pais.upper()
        mensaje = (
            f"Mira, {case.empresa} en {case.ciudad} ({pais_nombre}) - que es una "
            f"{nicho or case.tipo_negocio} de tamano similar - logro "
            f"{case.resultado} en solo {case.tiempo_a_resultado}. "
        )
        if case.testimonial:
            mensaje += f"Y lo que me dijo el dueno fue: '{case.testimonial}'"
        return mensaje

    @classmethod
    def from_dicts(cls, data: list[dict[str, Any]]) -> "CaseStudyRepository":
        """Crea un repo desde una lista de dicts."""
        cases = [CaseStudy(**{k: v for k, v in d.items() if k in CaseStudy.__dataclass_fields__}) for d in data]
        return cls(cases)

    def __len__(self) -> int:
        return len(self._cases)
