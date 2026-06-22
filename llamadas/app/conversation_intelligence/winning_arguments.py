"""Winning Arguments Database — track which argument + objection handling combos close deals."""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
import logging
from enum import Enum

logger = logging.getLogger(__name__)


class ArgumentType(str, Enum):
    """Types of sales arguments."""
    ROI_FOCUSED = "roi_focused"
    RISK_MITIGATION = "risk_mitigation"
    COMPETITIVE_ADVANTAGE = "competitive_advantage"
    EASE_OF_USE = "ease_of_use"
    INTEGRATION_CAPABILITY = "integration_capability"
    SUPPORT_QUALITY = "support_quality"
    TEAM_ENABLEMENT = "team_enablement"
    SPEED_TO_VALUE = "speed_to_value"
    CUSTOMER_SUCCESS = "customer_success"
    SCALABILITY = "scalability"


class ObjectionType(str, Enum):
    """Common objection types."""
    BUDGET_CONSTRAINT = "budget_constraint"
    TIMELINE_NOT_NOW = "timeline_not_now"
    COMPETITOR_LOCK_IN = "competitor_lock_in"
    INTERNAL_RESISTANCE = "internal_resistance"
    LACK_OF_CAPABILITY = "lack_of_capability"
    IMPLEMENTATION_RISK = "implementation_risk"
    TEAM_ADOPTION = "team_adoption"
    ROI_UNCLEAR = "roi_unclear"
    VENDOR_STABILITY = "vendor_stability"
    FEATURE_GAP = "feature_gap"


@dataclass
class ArgumentContext:
    """Context of a sales argument deployment."""
    argument_type: ArgumentType
    prospect_industry: str
    deal_stage: str  # PROSPECT, DEMO, NEGOTIATION, CLOSING
    buyer_persona: str  # Champion, Decision Maker, Economic Buyer, Technical Buyer
    deal_size_range: str  # "0-50k", "50-100k", "100k+"
    competitor_mentioned: Optional[str] = None
    pain_point: Optional[str] = None
    custom_variables: Dict[str, str] = field(default_factory=dict)


@dataclass
class ArgumentPerformance:
    """Performance metrics for an argument."""
    argument_id: str
    argument_type: ArgumentType
    deployment_count: int = 0
    close_count: int = 0
    objection_deflection_count: int = 0
    win_rate: float = 0.0  # close_count / deployment_count
    objection_deflection_rate: float = 0.0  # objection_deflection_count / deployment_count
    avg_advancement: float = 0.0  # average stage advancement after deployment
    last_updated: datetime = field(default_factory=datetime.now)
    contexts: Dict[str, int] = field(default_factory=dict)  # context_key -> count
    follow_up_objections: Dict[ObjectionType, int] = field(default_factory=dict)


class WinningArgumentsDB:
    """
    Database of winning arguments and their performance.
    Tracks which argument + objection handling combos close deals.
    """

    def __init__(self):
        """Initialize arguments database."""
        self.arguments: Dict[str, ArgumentPerformance] = {}
        self.objection_handlers: Dict[str, Dict[str, int]] = {}  # argument_id -> objection_type -> count
        self.winning_combos: List[Dict] = []  # argument_type + objection_type combos that close
        self.context_performance: Dict[str, Dict[str, float]] = {}  # context_key -> metrics

    def log_argument_deployment(
        self,
        argument_id: str,
        argument_type: ArgumentType,
        context: ArgumentContext,
        outcome: str,  # 'closed', 'advanced', 'objection', 'stalled'
        objections_deflected: Optional[List[ObjectionType]] = None,
        stage_advancement: int = 0,
    ) -> None:
        """
        Log an argument deployment and its outcome.

        Args:
            argument_id: Unique identifier for the argument
            argument_type: Type of argument used
            context: Context in which argument was deployed
            outcome: Result of deployment
            objections_deflected: Objections successfully handled
            stage_advancement: Stages moved forward (0-5)
        """
        if argument_id not in self.arguments:
            self.arguments[argument_id] = ArgumentPerformance(
                argument_id=argument_id,
                argument_type=argument_type,
            )

        perf = self.arguments[argument_id]
        perf.deployment_count += 1

        # Track by outcome
        if outcome == 'closed':
            perf.close_count += 1
        elif objections_deflected:
            perf.objection_deflection_count += len(objections_deflected)

        # Track stage advancement
        if stage_advancement > 0:
            perf.avg_advancement = (
                (perf.avg_advancement * (perf.deployment_count - 1) + stage_advancement)
                / perf.deployment_count
            )

        # Update rates
        perf.win_rate = perf.close_count / perf.deployment_count
        perf.objection_deflection_rate = (
            perf.objection_deflection_count / perf.deployment_count
        )

        # Track context
        context_key = f"{context.prospect_industry}_{context.deal_stage}_{context.buyer_persona}"
        perf.contexts[context_key] = perf.contexts.get(context_key, 0) + 1

        # Track follow-up objections
        if objections_deflected:
            for objection in objections_deflected:
                perf.follow_up_objections[objection] = (
                    perf.follow_up_objections.get(objection, 0) + 1
                )

        # Record winning combo if deal closed
        if outcome == 'closed':
            self.winning_combos.append({
                'argument_type': argument_type,
                'objections_deflected': [str(o.value) for o in (objections_deflected or [])],
                'context': {
                    'industry': context.prospect_industry,
                    'stage': context.deal_stage,
                    'persona': context.buyer_persona,
                    'competitor': context.competitor_mentioned,
                },
                'timestamp': datetime.now(),
            })

        # Update context performance
        if outcome == 'closed':
            context_key = self._context_to_key(context)
            if context_key not in self.context_performance:
                self.context_performance[context_key] = {'wins': 0, 'total': 0}
            self.context_performance[context_key]['wins'] += 1
            self.context_performance[context_key]['total'] += 1

        perf.last_updated = datetime.now()
        logger.info(f"Logged argument {argument_id}: {outcome}")

    def get_top_arguments(self, top_n: int = 10) -> List[ArgumentPerformance]:
        """Get top performing arguments by win rate."""
        return sorted(
            self.arguments.values(),
            key=lambda a: (a.win_rate, a.objection_deflection_rate, a.deployment_count),
            reverse=True,
        )[:top_n]

    def get_arguments_for_context(
        self,
        context: ArgumentContext,
        limit: int = 5,
    ) -> List[Dict]:
        """
        Get winning arguments for a specific context.

        Returns arguments with highest win rates in similar contexts.
        """
        context_key = self._context_to_key(context)
        results = []

        for arg in self.arguments.values():
            if context_key in arg.contexts:
                results.append({
                    'argument_id': arg.argument_id,
                    'argument_type': str(arg.argument_type.value),
                    'win_rate': arg.win_rate,
                    'deployments': arg.deployment_count,
                    'objection_deflection_rate': arg.objection_deflection_rate,
                    'common_follow_ups': list(arg.follow_up_objections.keys())[:3],
                })

        return sorted(
            results,
            key=lambda x: (x['win_rate'], x['deployments']),
            reverse=True,
        )[:limit]

    def get_objection_response_effectiveness(
        self,
        argument_type: ArgumentType,
        objection_type: ObjectionType,
    ) -> Dict:
        """
        Get effectiveness of a specific argument against an objection.
        Returns historical performance data.
        """
        matching_combos = [
            c for c in self.winning_combos
            if str(c['argument_type'].value) == argument_type.value
            and objection_type.value in c['objections_deflected']
        ]

        total_deployments = sum(
            1 for arg in self.arguments.values()
            if arg.argument_type == argument_type
        )

        return {
            'argument_type': str(argument_type.value),
            'objection_type': str(objection_type.value),
            'winning_deployments': len(matching_combos),
            'total_deployments': total_deployments,
            'effectiveness_rate': len(matching_combos) / total_deployments if total_deployments > 0 else 0,
            'recent_wins': sorted(
                matching_combos,
                key=lambda x: x['timestamp'],
                reverse=True,
            )[:5],
        }

    def get_high_impact_arguments(self) -> List[Dict]:
        """Get arguments with highest impact on deal progression."""
        return [
            {
                'argument_id': arg.argument_id,
                'type': str(arg.argument_type.value),
                'win_rate': arg.win_rate,
                'avg_advancement': arg.avg_advancement,
                'impact_score': (arg.win_rate * 0.6 + (arg.avg_advancement / 5) * 0.4) * 100,
            }
            for arg in self.arguments.values()
            if arg.deployment_count >= 3  # Minimum sample size
        ]

    def _context_to_key(self, context: ArgumentContext) -> str:
        """Convert context to hashable key."""
        return f"{context.prospect_industry}_{context.deal_stage}_{context.buyer_persona}"
