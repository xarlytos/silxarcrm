"""MEJORA 2: Deal Engine - Recomendar mejor oferta por prospect"""
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Optional, List

logger = logging.getLogger(__name__)


@dataclass
class DealRecommendation:
    """Recomendación de oferta optimizada"""
    plan: str  # "Starter", "Pro", "Enterprise"
    price: float
    discount_percent: float = 0
    confidence: float = 0.0  # 0-1: basado en datos históricos
    sample_size: int = 0  # Número de deals similares
    expected_revenue: float = 0.0
    reasoning: str = ""


class DealEngine:
    """Engine que recomienda mejor plan/precio/descuento"""

    def __init__(self, db_client):
        self.db = db_client

        # Plan definitions
        self.plans = {
            "Starter": {"base_price": 1900, "features": "Basic automation"},
            "Pro": {"base_price": 4900, "features": "Advanced automation + support"},
            "Enterprise": {"base_price": 9900, "features": "Full custom solution"},
        }

    async def get_best_offer(self, prospect_profile: dict) -> DealRecommendation:
        """Retornar mejor oferta para este prospect"""

        # Extraer características
        industry = prospect_profile.get("industry", "unknown")
        company_size = prospect_profile.get("company_size", 0)
        budget_max = prospect_profile.get("presupuesto_max")
        nivel_interes = prospect_profile.get("nivel_interes", "cold")

        # Buscar deals similares en histórico (simulado)
        similar_deals = await self._find_similar_deals(industry, company_size)

        if not similar_deals or len(similar_deals) < 5:
            # Sin datos históricos: usar defaults conservadores
            return self._get_default_offer(budget_max, nivel_interes)

        # Calcular mejor oferta basada en histórico
        recommendations = await self._calculate_offers(
            budget_max,
            nivel_interes,
            similar_deals,
            industry,
            company_size
        )

        # Retornar TOP recomendación
        best = max(recommendations, key=lambda x: x.expected_revenue)

        logger.info(
            f"Deal recommendation: {best.plan} ${best.price} "
            f"(confidence: {best.confidence:.0%}, n={best.sample_size})"
        )

        return best

    async def _find_similar_deals(self, industry: str, company_size: int) -> List[dict]:
        """Buscar deals históricos similares"""

        # TODO: Implementar con BD real
        # Por ahora retornar ejemplos simulados
        return [
            {
                "plan": "Starter",
                "price": 1900,
                "accepted": True,
            },
            {
                "plan": "Pro",
                "price": 4900,
                "accepted": False,
            }
        ]

    def _get_default_offer(self, budget_max: Optional[float], nivel_interes: str) -> DealRecommendation:
        """Oferta por defecto si no hay datos históricos"""

        if budget_max and budget_max < 2000:
            return DealRecommendation(
                plan="Starter",
                price=min(1900, budget_max * 0.95),
                confidence=0.0,  # Sin datos históricos
                reasoning="No historical data. Using conservative default based on stated budget."
            )
        elif nivel_interes == "hot":
            return DealRecommendation(
                plan="Pro",
                price=4900,
                discount_percent=15,
                confidence=0.0,
                reasoning="High interest detected. Offering Pro with discount."
            )
        else:
            return DealRecommendation(
                plan="Starter",
                price=1900,
                confidence=0.0,
                reasoning="Default: Starter plan. Adjust based on prospect feedback."
            )

    async def _calculate_offers(
        self,
        budget_max: Optional[float],
        nivel_interes: str,
        similar_deals: List[dict],
        industry: str,
        company_size: int
    ) -> List[DealRecommendation]:
        """Calcular top 3 ofertas"""

        offers = []

        # Analizar tasa de aceptación histórica por plan
        plan_stats = {}
        for deal in similar_deals:
            plan = deal["plan"]
            if plan not in plan_stats:
                plan_stats[plan] = {"total": 0, "accepted": 0}
            plan_stats[plan]["total"] += 1
            if deal["accepted"]:
                plan_stats[plan]["accepted"] += 1

        # Opción A: Plan Starter (presupuesto bajo)
        if budget_max is None or budget_max <= 2000:
            acceptance_rate = plan_stats.get("Starter", {}).get("accepted", 0) / max(1, plan_stats.get("Starter", {}).get("total", 1))
            offers.append(
                DealRecommendation(
                    plan="Starter",
                    price=1900 if budget_max is None else min(1900, budget_max),
                    discount_percent=0,
                    confidence=acceptance_rate,
                    sample_size=plan_stats.get("Starter", {}).get("total", 0),
                    expected_revenue=1900 * acceptance_rate,
                    reasoning=f"Historical acceptance rate: {acceptance_rate:.0%}"
                )
            )

        # Opción B: Plan Pro (mid-market)
        if budget_max is None or budget_max >= 3500:
            acceptance_rate = plan_stats.get("Pro", {}).get("accepted", 0) / max(1, plan_stats.get("Pro", {}).get("total", 1))
            discount = 15 if company_size >= 100 else 0
            price = 4900 * (1 - discount / 100)
            offers.append(
                DealRecommendation(
                    plan="Pro",
                    price=price,
                    discount_percent=discount,
                    confidence=acceptance_rate,
                    sample_size=plan_stats.get("Pro", {}).get("total", 0),
                    expected_revenue=price * acceptance_rate,
                    reasoning=f"Pro plan with {discount}% volume discount. Historical: {acceptance_rate:.0%}"
                )
            )

        # Opción C: Enterprise (large companies)
        if company_size >= 500:
            acceptance_rate = plan_stats.get("Enterprise", {}).get("accepted", 0) / max(1, plan_stats.get("Enterprise", {}).get("total", 1))
            offers.append(
                DealRecommendation(
                    plan="Enterprise",
                    price=9900,
                    discount_percent=25,
                    confidence=acceptance_rate,
                    sample_size=plan_stats.get("Enterprise", {}).get("total", 0),
                    expected_revenue=9900 * (1 - 0.25) * acceptance_rate,
                    reasoning="Custom pricing for enterprise. Historical: {acceptance_rate:.0%}"
                )
            )

        return offers


class RevenueOptimizer:
    """MEJORA 6: Optimizar por ingresos esperados, no por cierre"""

    async def maximize_expected_revenue(self, offers: List[DealRecommendation]) -> DealRecommendation:
        """Elegir oferta que maximiza ingresos esperados"""

        # Ranking por expected revenue (NO por cierre rate)
        ranked = sorted(offers, key=lambda x: x.expected_revenue, reverse=True)

        best = ranked[0]

        logger.info(
            f"Revenue optimization: {best.plan} "
            f"(expected revenue: ${best.expected_revenue:.0f}, acceptance: {best.confidence:.0%})"
        )

        return best
