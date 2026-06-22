"""Deal Health Calculator — comprehensive deal quality scoring for pipeline management."""
from datetime import datetime, timedelta
from typing import Optional, Dict, List
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class DealHealthScore:
    """Deal health metrics."""
    deal_id: str
    health_score: int  # 0-100
    momentum: int  # 0-100 (activity trend)
    engagement_quality: int  # 0-100 (quality of interactions)
    risk_level: str  # 'low', 'medium', 'high'
    risk_factors: List[str]
    next_action: str
    days_to_close_estimate: int


class DealHealthCalculator:
    """Calculate deal health and momentum for at-risk detection."""

    RISK_FACTORS = {
        'no_recent_activity': {'threshold': 14, 'penalty': 25},
        'long_in_stage': {'threshold': 60, 'penalty': 20},
        'high_objection_ratio': {'threshold': 0.5, 'penalty': 15},
        'no_budget_confirmation': {'penalty': 15},
        'no_authority': {'penalty': 15},
        'no_timeline': {'penalty': 10},
        'competitor_mentioned': {'penalty': 10},
    }

    def calculate_health(self, deal: dict) -> DealHealthScore:
        """
        Calculate comprehensive health score for a deal.

        Expected deal dict:
        {
            'id': str,
            'stage': str,
            'monto': float,
            'created_at': datetime,
            'activities': [{'tipo': str, 'fecha_hora': datetime, ...}],
            'metadata': {
                'budget_mentioned': bool,
                'authority': bool,
                'timeline': int,
                'objections_count': int,
                'competitor_mentioned': bool,
            }
        }
        """
        deal_id = deal.get('id', 'unknown')
        base_score = 100
        risk_factors = []

        # 1. Momentum: activity trend (last 14 days)
        momentum = self._calculate_momentum(deal)

        # 2. Engagement quality: call/demo ratio
        engagement_quality = self._calculate_engagement_quality(deal)

        # 3. Check risk factors
        activities = deal.get('activities', [])
        metadata = deal.get('metadata', {})
        created_at = deal.get('created_at')
        stage = deal.get('stage', 'PROSPECT')

        # No recent activity (>14 days)
        if activities:
            last_activity = max(a.get('fecha_hora') for a in activities)
            days_inactive = (datetime.now() - last_activity).days
        else:
            days_inactive = 999

        if days_inactive > self.RISK_FACTORS['no_recent_activity']['threshold']:
            penalty = self.RISK_FACTORS['no_recent_activity']['penalty']
            base_score -= penalty
            risk_factors.append(f'No activity for {days_inactive} days')

        # Long in stage (>60 days)
        if created_at:
            days_in_stage = (datetime.now() - created_at).days
        else:
            days_in_stage = 0

        if days_in_stage > self.RISK_FACTORS['long_in_stage']['threshold']:
            penalty = self.RISK_FACTORS['long_in_stage']['penalty']
            base_score -= penalty
            risk_factors.append(f'In {stage} for {days_in_stage} days')

        # High objection ratio
        objections = metadata.get('objections_count', 0)
        calls = sum(1 for a in activities if a.get('tipo') == 'CALL')
        if calls > 0 and objections / calls > self.RISK_FACTORS['high_objection_ratio']['threshold']:
            penalty = self.RISK_FACTORS['high_objection_ratio']['penalty']
            base_score -= penalty
            risk_factors.append(f'High objection ratio ({objections}/{calls})')

        # Missing critical info
        if not metadata.get('budget_mentioned'):
            base_score -= self.RISK_FACTORS['no_budget_confirmation']['penalty']
            risk_factors.append('Budget not confirmed')

        if not metadata.get('authority'):
            base_score -= self.RISK_FACTORS['no_authority']['penalty']
            risk_factors.append('Authority not identified')

        if not metadata.get('timeline'):
            base_score -= self.RISK_FACTORS['no_timeline']['penalty']
            risk_factors.append('No close timeline')

        if metadata.get('competitor_mentioned'):
            base_score -= self.RISK_FACTORS['competitor_mentioned']['penalty']
            risk_factors.append('Competitor in conversation')

        # Cap health score
        health_score = max(0, min(int(base_score), 100))

        # Classify risk level
        if health_score >= 70:
            risk_level = 'low'
        elif health_score >= 40:
            risk_level = 'medium'
        else:
            risk_level = 'high'

        # Estimate days to close
        days_to_close = self._estimate_close_timeline(deal, stage, momentum)

        # Next action recommendation
        next_action = self._recommend_next_action(deal, risk_factors, stage)

        return DealHealthScore(
            deal_id=deal_id,
            health_score=health_score,
            momentum=momentum,
            engagement_quality=engagement_quality,
            risk_level=risk_level,
            risk_factors=risk_factors,
            next_action=next_action,
            days_to_close_estimate=days_to_close,
        )

    def _calculate_momentum(self, deal: dict) -> int:
        """
        Calculate activity momentum (0-100) based on call frequency trend.
        Looking at last 14 days vs previous 14 days.
        """
        activities = deal.get('activities', [])
        if not activities:
            return 0

        now = datetime.now()
        two_weeks_ago = now - timedelta(days=14)
        four_weeks_ago = now - timedelta(days=28)

        recent = sum(1 for a in activities if a.get('fecha_hora', now) > two_weeks_ago)
        previous = sum(1 for a in activities
                      if four_weeks_ago < a.get('fecha_hora', now) <= two_weeks_ago)

        if previous == 0:
            trend_multiplier = 1.0 if recent > 0 else 0.5
        else:
            trend_multiplier = recent / previous

        # Scale: 0-100
        momentum = min(100, int((recent + 1) * 20 * trend_multiplier))
        return momentum

    def _calculate_engagement_quality(self, deal: dict) -> int:
        """
        Calculate engagement quality (0-100) based on:
        - Call/Demo ratio (high-value activities)
        - Meeting frequency
        - Participation quality signals
        """
        activities = deal.get('activities', [])
        if not activities:
            return 0

        calls = sum(1 for a in activities if a.get('tipo') == 'CALL')
        emails = sum(1 for a in activities if a.get('tipo') == 'EMAIL')
        demos = sum(1 for a in activities if a.get('tipo') == 'DEMO')

        total = len(activities)

        # High-value activities
        high_value = (calls * 2 + demos * 3)
        low_value = emails

        if total == 0:
            return 0

        quality_ratio = high_value / (high_value + low_value) if (high_value + low_value) > 0 else 0
        engagement_quality = int(quality_ratio * 100)

        return engagement_quality

    def _estimate_close_timeline(self, deal: dict, stage: str, momentum: int) -> int:
        """
        Estimate days to close based on stage, momentum, and metadata.
        """
        stage_days = {
            'PROSPECT': 60,
            'DEMO_SCHEDULED': 45,
            'DEMO_COMPLETED': 30,
            'NEGOTIATION': 14,
            'CLOSING': 7,
        }

        base_days = stage_days.get(stage, 60)
        metadata = deal.get('metadata', {})

        # Adjustment based on timeline in metadata
        if metadata.get('timeline'):
            base_days = min(base_days, metadata['timeline'])

        # Adjustment based on momentum
        if momentum < 30:
            base_days += 14
        elif momentum > 70:
            base_days -= 7

        return max(1, int(base_days))

    def _recommend_next_action(self, deal: dict, risk_factors: List[str], stage: str) -> str:
        """Recommend next action based on deal state and risk factors."""
        if not risk_factors:
            return 'Continue normal cadence'

        if 'No activity for' in str(risk_factors):
            return 'Schedule immediate call or sync'

        if 'Budget not confirmed' in risk_factors:
            return 'Confirm budget in next call'

        if 'Authority not identified' in risk_factors:
            return 'Identify and involve decision maker'

        if 'High objection ratio' in risk_factors:
            return 'Address key objections in next meeting'

        if stage == 'CLOSING':
            return 'Finalize contract terms'

        if stage == 'NEGOTIATION':
            return 'Move to closing stage'

        if stage == 'DEMO_COMPLETED':
            return 'Schedule negotiation meeting'

        return 'Continue engagement and build consensus'

    def get_at_risk_deals(self, deals: List[dict], threshold: int = 50) -> List[dict]:
        """
        Filter deals at risk (health_score < threshold).
        """
        at_risk = []
        for deal in deals:
            health = self.calculate_health(deal)
            if health.health_score < threshold:
                at_risk.append({
                    'deal_id': health.deal_id,
                    'health_score': health.health_score,
                    'risk_level': health.risk_level,
                    'risk_factors': health.risk_factors,
                    'next_action': health.next_action,
                    'monto': deal.get('monto', 0),
                })

        return sorted(at_risk, key=lambda x: x['health_score'])

    def get_momentum_leaders(self, deals: List[dict], top_n: int = 10) -> List[dict]:
        """Get deals with highest momentum."""
        leaders = []
        for deal in deals:
            health = self.calculate_health(deal)
            leaders.append({
                'deal_id': health.deal_id,
                'momentum': health.momentum,
                'health_score': health.health_score,
                'monto': deal.get('monto', 0),
            })

        return sorted(leaders, key=lambda x: x['momentum'], reverse=True)[:top_n]
