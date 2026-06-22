"""Deal Probability Calculator — calculates probability of closing based on activity history."""
from datetime import datetime, timedelta
from typing import Optional
from dataclasses import dataclass
import logging

logger = logging.getLogger(__name__)


@dataclass
class DealContext:
    """Context for probability calculation."""
    deal_id: str
    calls_count: int = 0
    emails_count: int = 0
    demos_count: int = 0
    budget_mentioned: bool = False
    authority_identified: bool = False
    timeline_mentioned: Optional[int] = None  # days
    product_need_confirmed: bool = False
    objections_count: int = 0
    days_in_stage: int = 0
    last_activity_days_ago: int = 0


class ProbabilityCalculator:
    """Calculate deal close probability using heuristic formula."""

    BASE_PROBABILITY = 0.25  # 25% base

    def calculate(self, context: DealContext) -> int:
        """
        Calculate probability 0-100 based on deal context.

        Formula:
        - Base: 25%
        - +20 per call (max 60%, so 2 calls = 60%)
        - +15 if budget mentioned
        - +15 if authority identified
        - +10 if timeline < 90d
        - +5 if product need confirmed
        - -5 per objection (max -20%)
        - -10 if no activity in 7+ days

        Returns: probability 0-100
        """
        prob = self.BASE_PROBABILITY

        # Call activity (+20 per call, capped at 60% total)
        call_bonus = min(context.calls_count * 0.20, 0.60)
        prob += call_bonus

        # Budget mentioned
        if context.budget_mentioned:
            prob += 0.15

        # Authority identified
        if context.authority_identified:
            prob += 0.15

        # Timeline <90 days
        if context.timeline_mentioned and context.timeline_mentioned < 90:
            prob += 0.10

        # Product need confirmed
        if context.product_need_confirmed:
            prob += 0.05

        # Objections (penalty: -5% per objection, capped at -20%)
        objection_penalty = min(context.objections_count * 0.05, 0.20)
        prob -= objection_penalty

        # Stale (no activity in 7+ days)
        if context.last_activity_days_ago >= 7:
            prob -= 0.10

        # Cap at 0-1
        prob = max(0, min(prob, 1))

        return int(prob * 100)

    def recalculate_for_deal(self, deal: dict) -> int:
        """
        Recalculate probability for a deal from database.

        Expected deal dict:
        {
            'id': str,
            'stage': str,
            'activities': [{'tipo': 'CALL'|'EMAIL'|'DEMO', 'fecha_hora': datetime, ...}],
            'metadata': {'budget_mentioned': bool, 'authority': bool, 'timeline': int, ...}
        }
        """
        activities = deal.get('activities', [])

        # Count by type
        calls = sum(1 for a in activities if a.get('tipo') == 'CALL')
        emails = sum(1 for a in activities if a.get('tipo') == 'EMAIL')
        demos = sum(1 for a in activities if a.get('tipo') == 'DEMO')

        # Last activity
        if activities:
            last_activity = max(a.get('fecha_hora') for a in activities)
            days_since = (datetime.now() - last_activity).days
        else:
            days_since = 999

        # Metadata
        meta = deal.get('metadata', {})
        budget = meta.get('budget_mentioned', False)
        authority = meta.get('authority', False)
        timeline = meta.get('timeline', None)
        product_need = meta.get('product_need', False)
        objections = meta.get('objections_count', 0)

        # Days in stage
        created = deal.get('created_at')
        if created:
            days_in_stage = (datetime.now() - created).days
        else:
            days_in_stage = 0

        context = DealContext(
            deal_id=deal['id'],
            calls_count=calls,
            emails_count=emails,
            demos_count=demos,
            budget_mentioned=budget,
            authority_identified=authority,
            timeline_mentioned=timeline,
            product_need_confirmed=product_need,
            objections_count=objections,
            days_in_stage=days_in_stage,
            last_activity_days_ago=days_since,
        )

        return self.calculate(context)
