"""Revenue Forecast Engine — 90-day rolling forecast by stage."""
from datetime import datetime, timedelta
from typing import Dict, List
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


@dataclass
class ForecastSnapshot:
    """Revenue forecast snapshot."""
    software_id: str
    fecha_snapshot: datetime

    # Pipeline breakdown (unweighted)
    prospect_value: float = 0
    demo_scheduled_value: float = 0
    demo_completed_value: float = 0
    negotiation_value: float = 0
    closing_value: float = 0

    # Weighted by probability
    expected_revenue: float = 0
    best_case_revenue: float = 0
    worst_case_revenue: float = 0

    @staticmethod
    def from_dict(d: dict) -> 'ForecastSnapshot':
        return ForecastSnapshot(**d)

    def to_dict(self) -> dict:
        return asdict(self)


class ForecastEngine:
    """Calculate 90-day rolling revenue forecast."""

    # Default close probabilities by stage (if model not available)
    STAGE_PROBABILITIES = {
        'PROSPECT': 0.10,
        'DEMO_SCHEDULED': 0.25,
        'DEMO_COMPLETED': 0.45,
        'NEGOTIATION': 0.65,
        'CLOSING': 0.85,
        'WON': 1.0,
        'LOST': 0.0,
    }

    def forecast(self, software_id: str, deals: List[dict]) -> ForecastSnapshot:
        """
        Calculate forecast from deals.

        Expected deal dict:
        {
            'id': str,
            'stage': str,
            'monto': float,
            'probabilidad_cierre': 0-100,
            'fecha_cierre_estimada': datetime (optional),
        }
        """
        # Filter: only deals that could close in next 90 days
        today = datetime.now()
        ninety_days_out = today + timedelta(days=90)

        # Bucket deals by stage
        buckets = {stage: {'total': 0, 'count': 0} for stage in self.STAGE_PROBABILITIES}

        expected = 0
        best_case = 0
        worst_case = 0

        for deal in deals:
            stage = deal.get('stage', 'PROSPECT')
            monto = float(deal.get('monto', 0))

            # Skip if lost or won (already decided)
            if stage in ['WON', 'LOST']:
                continue

            # Check close date
            close_date = deal.get('fecha_cierre_estimada')
            if close_date and close_date > ninety_days_out:
                continue  # Too far out

            # Get probability
            prob = deal.get('probabilidad_cierre', 0) / 100.0
            if prob == 0:
                prob = self.STAGE_PROBABILITIES.get(stage, 0.10)

            # Bucket
            if stage in buckets:
                buckets[stage]['total'] += monto
                buckets[stage]['count'] += 1

            # Forecast
            expected += monto * prob
            best_case += monto  # Assume all close
            worst_case += 0  # Assume none close (pessimistic)

        # Build snapshot
        snapshot = ForecastSnapshot(
            software_id=software_id,
            fecha_snapshot=today,
            prospect_value=buckets['PROSPECT']['total'],
            demo_scheduled_value=buckets['DEMO_SCHEDULED']['total'],
            demo_completed_value=buckets['DEMO_COMPLETED']['total'],
            negotiation_value=buckets['NEGOTIATION']['total'],
            closing_value=buckets['CLOSING']['total'],
            expected_revenue=expected,
            best_case_revenue=best_case,
            worst_case_revenue=worst_case,
        )

        return snapshot

    def get_pipeline_health(self, deals: List[dict]) -> dict:
        """
        Return pipeline health metrics.

        Returns:
        {
            'total_deals': int,
            'total_value': float,
            'average_probability': float,
            'deal_velocity': float (days from PROSPECT to CLOSING),
            'risk_deals': [deal_id, ...] (health_score < 50),
        }
        """
        if not deals:
            return {
                'total_deals': 0,
                'total_value': 0,
                'average_probability': 0,
                'deal_velocity': 0,
                'risk_deals': [],
            }

        total_value = sum(d.get('monto', 0) for d in deals)
        avg_prob = sum(d.get('probabilidad_cierre', 0) for d in deals) / len(deals)

        risk_deals = [d['id'] for d in deals if d.get('health_score', 50) < 50]

        # Deal velocity: average days from PROSPECT to CLOSING (rough estimate)
        closing_deals = [d for d in deals if d.get('stage') in ['CLOSING', 'WON']]
        if closing_deals:
            velocities = []
            for d in closing_deals:
                if d.get('created_at') and d.get('fecha_cierre_estimada'):
                    velocity = (d['fecha_cierre_estimada'] - d['created_at']).days
                    velocities.append(velocity)
            deal_velocity = sum(velocities) / len(velocities) if velocities else 0
        else:
            deal_velocity = 0

        return {
            'total_deals': len(deals),
            'total_value': float(total_value),
            'average_probability': float(avg_prob),
            'deal_velocity': float(deal_velocity),
            'risk_deals': risk_deals,
        }
