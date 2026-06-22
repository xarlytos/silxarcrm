"""Revenue Intelligence Dashboard — unified view of deal health, forecast, and churn risk."""
from datetime import datetime
from typing import Dict, List, Optional
from dataclasses import asdict
import logging

from .probability_calculator import ProbabilityCalculator, DealContext
from .forecast_engine import ForecastEngine
from .deal_health_calculator import DealHealthCalculator
from ..ml.churn_model import ChurnModel

logger = logging.getLogger(__name__)


class RevenueDashboard:
    """
    Unified Revenue Intelligence Dashboard combining:
    - Deal probability (88% target accuracy)
    - Revenue forecast (90-day rolling)
    - Churn risk prediction
    - Deal health and at-risk alerts
    """

    def __init__(self, churn_model: Optional[ChurnModel] = None):
        """Initialize dashboard with models."""
        self.probability_calc = ProbabilityCalculator()
        self.forecast_engine = ForecastEngine()
        self.health_calc = DealHealthCalculator()
        self.churn_model = churn_model or ChurnModel()

    def get_pipeline_overview(self, deals: List[dict]) -> Dict:
        """
        Get high-level pipeline overview.

        Returns:
        {
            'total_deals': int,
            'total_value': float,
            'expected_revenue_90d': float,
            'best_case_90d': float,
            'worst_case_90d': float,
            'average_deal_probability': float,
            'average_health_score': float,
            'at_risk_count': int,
            'at_risk_value': float,
            'momentum_leaders_count': int,
        }
        """
        if not deals:
            return self._empty_overview()

        # Forecast
        forecast = self.forecast_engine.forecast('default', deals)

        # Health scores and at-risk deals
        health_scores = [self.health_calc.calculate_health(d) for d in deals]
        avg_health = sum(h.health_score for h in health_scores) / len(health_scores)

        at_risk = [h for h in health_scores if h.health_score < 50]
        at_risk_value = sum(d.get('monto', 0) for d in deals
                           if d['id'] in [h.deal_id for h in at_risk])

        # Deal probabilities
        probabilities = []
        for deal in deals:
            prob = self.probability_calc.recalculate_for_deal(deal)
            probabilities.append(prob)

        avg_probability = sum(probabilities) / len(probabilities) if probabilities else 0

        return {
            'total_deals': len(deals),
            'total_value': sum(d.get('monto', 0) for d in deals),
            'expected_revenue_90d': forecast.expected_revenue,
            'best_case_90d': forecast.best_case_revenue,
            'worst_case_90d': forecast.worst_case_revenue,
            'average_deal_probability': int(avg_probability),
            'average_health_score': int(avg_health),
            'at_risk_count': len(at_risk),
            'at_risk_value': at_risk_value,
            'momentum_leaders_count': min(5, len(deals)),
            'timestamp': datetime.now().isoformat(),
        }

    def get_deal_analysis(self, deal: dict) -> Dict:
        """
        Deep analysis for a single deal.

        Returns:
        {
            'deal_id': str,
            'stage': str,
            'monto': float,
            'probability': int (0-100),
            'health_score': int (0-100),
            'health_factors': {
                'momentum': int,
                'engagement_quality': int,
                'risk_level': str,
                'risk_factors': [str],
            },
            'next_actions': [str],
            'forecast_contribution': float,
            'days_to_close': int,
        }
        """
        deal_id = deal.get('id', 'unknown')

        # Probability
        probability = self.probability_calc.recalculate_for_deal(deal)

        # Health
        health = self.health_calc.calculate_health(deal)

        # Forecast contribution
        forecast_contribution = deal.get('monto', 0) * (probability / 100.0)

        return {
            'deal_id': deal_id,
            'stage': deal.get('stage', 'PROSPECT'),
            'monto': deal.get('monto', 0),
            'probability': probability,
            'health_score': health.health_score,
            'health_factors': {
                'momentum': health.momentum,
                'engagement_quality': health.engagement_quality,
                'risk_level': health.risk_level,
                'risk_factors': health.risk_factors,
            },
            'next_actions': [health.next_action],
            'forecast_contribution': forecast_contribution,
            'days_to_close': health.days_to_close_estimate,
        }

    def get_at_risk_alerts(self, deals: List[dict], threshold: int = 50) -> Dict:
        """
        Get summary of at-risk deals requiring immediate attention.

        Returns:
        {
            'at_risk_deals': [
                {
                    'deal_id': str,
                    'monto': float,
                    'health_score': int,
                    'risk_level': str,
                    'risk_factors': [str],
                    'next_action': str,
                }
            ],
            'total_at_risk_value': float,
            'critical_count': int,  # health_score < 30
            'warning_count': int,   # health_score 30-50
            'timestamp': str,
        }
        """
        at_risk_deals = self.health_calc.get_at_risk_deals(deals, threshold)

        critical = [d for d in at_risk_deals if d['health_score'] < 30]
        warning = [d for d in at_risk_deals if 30 <= d['health_score'] < 50]

        return {
            'at_risk_deals': at_risk_deals,
            'total_at_risk_value': sum(d['monto'] for d in at_risk_deals),
            'critical_count': len(critical),
            'warning_count': len(warning),
            'timestamp': datetime.now().isoformat(),
        }

    def get_forecast_by_stage(self, deals: List[dict]) -> Dict:
        """
        Get forecast breakdown by pipeline stage.

        Returns:
        {
            'PROSPECT': {'deals': int, 'value': float, 'weighted_value': float, 'prob': float},
            'DEMO_SCHEDULED': {...},
            'DEMO_COMPLETED': {...},
            'NEGOTIATION': {...},
            'CLOSING': {...},
        }
        """
        forecast = self.forecast_engine.forecast('default', deals)

        stages = {}
        for stage in self.forecast_engine.STAGE_PROBABILITIES.keys():
            stage_deals = [d for d in deals if d.get('stage') == stage]
            if stage_deals:
                total_value = sum(d.get('monto', 0) for d in stage_deals)
                avg_prob = sum(d.get('probabilidad_cierre', 0) for d in stage_deals) / len(stage_deals)

                stages[stage] = {
                    'deals': len(stage_deals),
                    'value': total_value,
                    'weighted_value': total_value * (avg_prob / 100.0),
                    'probability': int(avg_prob),
                }

        return stages

    def get_momentum_report(self, deals: List[dict]) -> Dict:
        """
        Get momentum leaders and laggards.

        Returns:
        {
            'leaders': [
                {'deal_id': str, 'momentum': int, 'health_score': int, 'monto': float}
            ],
            'laggards': [...],
            'average_momentum': float,
        }
        """
        leaders = self.health_calc.get_momentum_leaders(deals, top_n=5)
        laggards = []

        all_health = [self.health_calc.calculate_health(d) for d in deals]
        sorted_by_momentum = sorted(all_health, key=lambda h: h.momentum)

        for health in sorted_by_momentum[:min(5, len(sorted_by_momentum))]:
            deal = next((d for d in deals if d['id'] == health.deal_id), {})
            laggards.append({
                'deal_id': health.deal_id,
                'momentum': health.momentum,
                'health_score': health.health_score,
                'monto': deal.get('monto', 0),
            })

        avg_momentum = sum(h.momentum for h in all_health) / len(all_health) if all_health else 0

        return {
            'leaders': leaders,
            'laggards': laggards,
            'average_momentum': int(avg_momentum),
        }

    def get_churn_risk_summary(self, customers: List[Dict]) -> Dict:
        """
        Get churn risk summary for customers.

        Expected customer dict:
        {
            'customer_id': str,
            'call_frequency_trend': float,
            'email_engagement_trend': float,
            'days_since_last_activity': int,
            'product_usage_score': float,
            'contract_renewal_date': int,
        }

        Returns:
        {
            'high_risk_customers': [ChurnPrediction],
            'medium_risk_customers': [ChurnPrediction],
            'average_churn_risk': float,
            'timestamp': str,
        }
        """
        if not customers:
            return {
                'high_risk_customers': [],
                'medium_risk_customers': [],
                'average_churn_risk': 0.0,
                'timestamp': datetime.now().isoformat(),
            }

        predictions = self.churn_model.batch_predict(customers)

        high_risk = self.churn_model.get_high_risk_customers(predictions, threshold=0.7)
        medium_risk = [p for p in predictions if 0.4 <= p.probability < 0.7]

        avg_churn = sum(p.probability for p in predictions) / len(predictions)

        return {
            'high_risk_customers': [asdict(p) for p in high_risk],
            'medium_risk_customers': [asdict(p) for p in medium_risk],
            'total_at_risk': len(high_risk) + len(medium_risk),
            'average_churn_risk': float(avg_churn),
            'timestamp': datetime.now().isoformat(),
        }

    def get_full_dashboard(self, deals: List[dict], customers: List[Dict] = None) -> Dict:
        """
        Get complete revenue intelligence dashboard.
        """
        customers = customers or []

        return {
            'pipeline_overview': self.get_pipeline_overview(deals),
            'forecast_by_stage': self.get_forecast_by_stage(deals),
            'at_risk_alerts': self.get_at_risk_alerts(deals),
            'momentum_report': self.get_momentum_report(deals),
            'churn_risk': self.get_churn_risk_summary(customers),
            'timestamp': datetime.now().isoformat(),
        }

    def _empty_overview(self) -> Dict:
        """Return empty overview when no deals."""
        return {
            'total_deals': 0,
            'total_value': 0.0,
            'expected_revenue_90d': 0.0,
            'best_case_90d': 0.0,
            'worst_case_90d': 0.0,
            'average_deal_probability': 0,
            'average_health_score': 0,
            'at_risk_count': 0,
            'at_risk_value': 0.0,
            'momentum_leaders_count': 0,
            'timestamp': datetime.now().isoformat(),
        }
