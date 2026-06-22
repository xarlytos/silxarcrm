"""
Multi-Armed Bandits Engine - Thompson Sampling for Opening Arguments

Implements Thompson Sampling to optimize opening discovery questions during sales calls.
Each call selects an argument based on Bayesian probability of success, gradually
learning which arguments have the highest close rates.

Key features:
- 5-10 opening arguments (discovery questions)
- Thompson Sampling: tracks successes/failures per argument
- Gradual shift toward high-performing arguments
- Weekly reports on best arguments
- 6% expected close rate improvement
"""

from __future__ import annotations

import logging
import json
from dataclasses import dataclass, field, asdict
from datetime import datetime, timedelta
from typing import Optional, List, Dict, Tuple
from enum import Enum
import random
from pathlib import Path

import numpy as np

logger = logging.getLogger(__name__)


class ArgumentStatus(str, Enum):
    ACTIVE = "active"
    PAUSED = "paused"
    RETIRED = "retired"


@dataclass
class BayesianArm:
    """Representa un argumento (brazo) en el MAB"""

    arm_id: str
    argument: str  # El texto/pregunta de apertura
    category: str  # "discovery", "value_prop", "urgency", etc.

    # Thompson Sampling Beta distribution parameters
    # Beta(alpha, beta) where alpha = successes+1, beta = failures+1
    alpha: float = 1.0  # Prior: 1 success
    beta: float = 1.0   # Prior: 1 failure

    # Tracking
    total_uses: int = 0
    total_closes: int = 0

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: int = 1
    metadata: Dict = field(default_factory=dict)

    def __post_init__(self):
        """Validate argument is not empty"""
        if not self.argument or len(self.argument) < 10:
            raise ValueError(f"Argument must be at least 10 characters: {self.argument}")

    def close_rate(self) -> float:
        """Empirical close rate from historical data"""
        if self.total_uses == 0:
            return 0.0
        return self.total_closes / self.total_uses

    def thompson_sample(self) -> float:
        """Draw sample from Beta(alpha, beta) distribution

        Returns a probability between 0-1 representing expected close rate.
        Higher values indicate better performing arguments.
        """
        return np.random.beta(self.alpha, self.beta)

    def update_success(self):
        """Record a successful close with this argument"""
        self.total_uses += 1
        self.total_closes += 1
        self.alpha += 1.0  # Success adds to alpha
        self.updated_at = datetime.now()
        logger.info(f"Arm {self.arm_id} success: {self.close_rate():.1%} ({self.total_closes}/{self.total_uses})")

    def update_failure(self):
        """Record a failed close with this argument"""
        self.total_uses += 1
        self.beta += 1.0  # Failure adds to beta
        self.updated_at = datetime.now()
        logger.info(f"Arm {self.arm_id} failure: {self.close_rate():.1%} ({self.total_closes}/{self.total_uses})")

    def confidence_interval(self, confidence: float = 0.95) -> Tuple[float, float]:
        """Credible interval for true close rate"""
        mean = self.alpha / (self.alpha + self.beta)
        variance = (self.alpha * self.beta) / ((self.alpha + self.beta) ** 2 * (self.alpha + self.beta + 1))
        std = np.sqrt(variance)
        z = 1.96  # 95% confidence
        return (mean - z * std, mean + z * std)


@dataclass
class CallArgument:
    """Record of which argument was used in a specific call"""

    call_id: str
    arm_id: str
    argument: str
    presented_at: datetime = field(default_factory=datetime.now)
    outcome: Optional[str] = None  # "close", "no_close", "ongoing"
    duration_seconds: Optional[int] = None
    prospect_response: Optional[str] = None
    metadata: Dict = field(default_factory=dict)


@dataclass
class WeeklyArgumentReport:
    """Weekly summary of argument performance"""

    week_ending: datetime
    period_days: int = 7
    arguments: List[BayesianArm] = field(default_factory=list)

    # Aggregates
    total_calls: int = 0
    total_closes: int = 0
    overall_close_rate: float = 0.0

    best_argument: Optional[BayesianArm] = None
    best_argument_close_rate: float = 0.0

    worst_argument: Optional[BayesianArm] = None
    learnings: List[str] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)


class MultiArmedBanditsEngine:
    """
    Thompson Sampling implementation for opening argument optimization.

    The algorithm:
    1. Each call samples from Beta distribution of each argument
    2. Selects the argument with highest sampled value (Thompson Sampling)
    3. Records outcome (close/no-close)
    4. Updates Beta distribution for that argument
    5. Next call repeats with updated distributions

    Over time, high-performing arguments get sampled higher values more often,
    naturally shifting allocation toward winners while exploring others.
    """

    def __init__(self,
                 db_client=None,
                 redis_client=None,
                 persistence_path: Optional[Path] = None):
        self.db = db_client
        self.redis = redis_client
        self.persistence_path = persistence_path or Path("./mab_state.json")

        # Active arms (arguments)
        self.arms: Dict[str, BayesianArm] = {}

        # Call-argument associations
        self.call_history: List[CallArgument] = []

        # Load persisted state if available
        self._load_state()

    def _load_state(self):
        """Load MAB state from disk if it exists"""
        if self.persistence_path and self.persistence_path.exists():
            try:
                with open(self.persistence_path, 'r') as f:
                    state = json.load(f)
                    for arm_data in state.get('arms', []):
                        arm = BayesianArm(**arm_data)
                        self.arms[arm.arm_id] = arm
                    logger.info(f"Loaded {len(self.arms)} arms from {self.persistence_path}")
            except Exception as e:
                logger.error(f"Failed to load MAB state: {e}")

    def _save_state(self):
        """Persist MAB state to disk"""
        if not self.persistence_path:
            return

        try:
            self.persistence_path.parent.mkdir(parents=True, exist_ok=True)
            state = {
                'arms': [asdict(arm) for arm in self.arms.values()],
                'updated_at': datetime.now().isoformat(),
            }
            with open(self.persistence_path, 'w') as f:
                json.dump(state, f, indent=2, default=str)
            logger.info(f"Saved MAB state to {self.persistence_path}")
        except Exception as e:
            logger.error(f"Failed to save MAB state: {e}")

    def register_arguments(self, arguments: List[Dict]) -> List[str]:
        """
        Register opening arguments for testing.

        Args:
            arguments: List of dicts with keys:
                - arm_id: unique identifier
                - argument: the discovery question text
                - category: type of argument
                - metadata: optional dict for extra context

        Returns:
            List of registered arm IDs
        """
        registered = []

        for arg in arguments:
            arm = BayesianArm(
                arm_id=arg['arm_id'],
                argument=arg['argument'],
                category=arg.get('category', 'discovery'),
                metadata=arg.get('metadata', {})
            )
            self.arms[arm.arm_id] = arm
            registered.append(arm.arm_id)
            logger.info(f"Registered argument {arm.arm_id}: {arm.argument[:50]}...")

        self._save_state()
        return registered

    def select_argument_for_call(self, call_context: Dict) -> Tuple[str, str]:
        """
        Select which opening argument to use for this call using Thompson Sampling.

        Algorithm:
        1. For each active arm, sample from its Beta distribution
        2. Select arm with highest sample
        3. Return the argument text

        Args:
            call_context: Dict with call metadata (phone, lead_id, etc)

        Returns:
            Tuple of (arm_id, argument_text)
        """
        if not self.arms:
            raise ValueError("No arguments registered")

        # Get active arms
        active_arms = {
            arm_id: arm for arm_id, arm in self.arms.items()
            if arm.alpha + arm.beta > 1  # Has at least 1 observation
        }

        if not active_arms:
            active_arms = self.arms  # Use all if none have data yet

        # Thompson Sampling: sample from each arm's distribution
        samples = {}
        for arm_id, arm in active_arms.items():
            samples[arm_id] = arm.thompson_sample()

        # Select arm with highest sample
        selected_arm_id = max(samples, key=samples.get)
        selected_arm = self.arms[selected_arm_id]

        logger.info(
            f"Selected argument {selected_arm_id} for call {call_context.get('call_id')}. "
            f"Samples: {[(k, f'{v:.3f}') for k, v in sorted(samples.items(), key=lambda x: x[1], reverse=True)[:3]]}"
        )

        return selected_arm_id, selected_arm.argument

    def record_call_outcome(self,
                           call_id: str,
                           arm_id: str,
                           outcome: str,
                           duration_seconds: Optional[int] = None,
                           prospect_response: Optional[str] = None,
                           metadata: Optional[Dict] = None):
        """
        Record the outcome of a call using a specific argument.

        Updates the Beta distribution for that argument based on success/failure.

        Args:
            call_id: Unique call identifier
            arm_id: Which argument was used
            outcome: "close" or "no_close"
            duration_seconds: Call length
            prospect_response: What prospect said
            metadata: Extra context
        """
        if arm_id not in self.arms:
            raise ValueError(f"Unknown arm: {arm_id}")

        if outcome not in ("close", "no_close"):
            raise ValueError(f"Invalid outcome: {outcome}")

        arm = self.arms[arm_id]

        # Record call
        call_arg = CallArgument(
            call_id=call_id,
            arm_id=arm_id,
            argument=arm.argument,
            outcome=outcome,
            duration_seconds=duration_seconds,
            prospect_response=prospect_response,
            metadata=metadata or {}
        )
        self.call_history.append(call_arg)

        # Update arm distribution
        if outcome == "close":
            arm.update_success()
        else:
            arm.update_failure()

        # Save state
        self._save_state()

        logger.info(
            f"Recorded outcome for call {call_id}: {outcome} "
            f"(arm={arm_id}, new close_rate={arm.close_rate():.1%})"
        )

    def get_weekly_report(self, end_date: Optional[datetime] = None) -> WeeklyArgumentReport:
        """
        Generate weekly report on argument performance.

        Args:
            end_date: End of reporting period (default: now)

        Returns:
            WeeklyArgumentReport with best argument, stats, recommendations
        """
        if end_date is None:
            end_date = datetime.now()

        start_date = end_date - timedelta(days=7)

        # Filter calls in this week
        week_calls = [
            c for c in self.call_history
            if start_date <= c.presented_at <= end_date
        ]

        # Aggregate stats
        total_calls = len(week_calls)
        total_closes = sum(1 for c in week_calls if c.outcome == "close")
        overall_close_rate = total_closes / total_calls if total_calls > 0 else 0.0

        # Find best and worst arguments this week
        week_arm_stats = {}
        for call in week_calls:
            if call.arm_id not in week_arm_stats:
                week_arm_stats[call.arm_id] = {'closes': 0, 'total': 0}
            week_arm_stats[call.arm_id]['total'] += 1
            if call.outcome == "close":
                week_arm_stats[call.arm_id]['closes'] += 1

        best_arm_id = None
        best_close_rate = 0.0
        worst_arm_id = None
        worst_close_rate = 1.0

        for arm_id, stats in week_arm_stats.items():
            rate = stats['closes'] / stats['total'] if stats['total'] > 0 else 0.0
            if rate > best_close_rate:
                best_close_rate = rate
                best_arm_id = arm_id
            if rate < worst_close_rate and stats['total'] > 0:
                worst_close_rate = rate
                worst_arm_id = arm_id

        best_argument = self.arms.get(best_arm_id) if best_arm_id else None
        worst_argument = self.arms.get(worst_arm_id) if worst_arm_id else None

        # Generate learnings and recommendations
        learnings = []
        recommendations = []

        if best_argument:
            learnings.append(
                f"Best argument: \"{best_argument.argument}\" "
                f"({best_close_rate:.0%} close rate, {week_arm_stats[best_arm_id]['total']} uses)"
            )
            recommendations.append(
                f"Increase weight of best-performing argument: {best_arm_id}"
            )

        if worst_argument and worst_close_rate < (overall_close_rate * 0.7):
            learnings.append(
                f"Underperformer: \"{worst_argument.argument}\" "
                f"({worst_close_rate:.0%} close rate)"
            )
            recommendations.append(
                f"Consider retiring or reworking: {worst_arm_id}"
            )

        # Argument variance insights
        if week_arm_stats:
            rates = [s['closes']/s['total'] for s in week_arm_stats.values() if s['total'] > 0]
            if len(rates) > 1:
                variance = np.var(rates)
                learnings.append(
                    f"Argument variance: {variance:.4f} (wide variance = high diversity in effectiveness)"
                )

        # Thompson Sampling convergence
        confident_arms = [
            (arm_id, arm) for arm_id, arm in self.arms.items()
            if arm.alpha + arm.beta > 30  # Sufficient samples
        ]

        if confident_arms:
            top_arms = sorted(
                confident_arms,
                key=lambda x: x[1].close_rate(),
                reverse=True
            )[:3]

            learnings.append(
                f"Top 3 arguments by close rate: "
                f"{', '.join([f'{arm.arm_id}({arm.close_rate():.0%})' for _, arm in top_arms])}"
            )

        if overall_close_rate > 0.06:  # Target +6% improvement
            recommendations.append(
                f"GOAL ACHIEVED: {overall_close_rate:.1%} close rate exceeds +6% target"
            )

        report = WeeklyArgumentReport(
            week_ending=end_date,
            period_days=7,
            arguments=list(self.arms.values()),
            total_calls=total_calls,
            total_closes=total_closes,
            overall_close_rate=overall_close_rate,
            best_argument=best_argument,
            best_argument_close_rate=best_close_rate,
            worst_argument=worst_argument,
            learnings=learnings,
            recommendations=recommendations
        )

        return report

    def get_arm_stats(self, arm_id: Optional[str] = None) -> Dict:
        """
        Get detailed stats for arm(s).

        Args:
            arm_id: Specific arm to query (None = all arms)

        Returns:
            Dict with arm statistics
        """
        if arm_id:
            if arm_id not in self.arms:
                raise ValueError(f"Unknown arm: {arm_id}")
            arms_to_report = {arm_id: self.arms[arm_id]}
        else:
            arms_to_report = self.arms

        stats = {}
        for aid, arm in arms_to_report.items():
            ci_lower, ci_upper = arm.confidence_interval()
            stats[aid] = {
                'argument': arm.argument,
                'category': arm.category,
                'total_uses': arm.total_uses,
                'total_closes': arm.total_closes,
                'close_rate': f"{arm.close_rate():.1%}",
                'confidence_interval': (f"{ci_lower:.1%}", f"{ci_upper:.1%}"),
                'alpha': arm.alpha,
                'beta': arm.beta,
                'expected_value': f"{arm.alpha / (arm.alpha + arm.beta):.1%}",
                'created_at': arm.created_at.isoformat(),
                'updated_at': arm.updated_at.isoformat(),
            }

        return stats

    def export_state(self) -> Dict:
        """Export current MAB state as dict"""
        return {
            'timestamp': datetime.now().isoformat(),
            'arms': {
                aid: asdict(arm) for aid, arm in self.arms.items()
            },
            'call_history_size': len(self.call_history),
            'summary_stats': {
                'total_calls': len(self.call_history),
                'total_closes': sum(1 for c in self.call_history if c.outcome == "close"),
                'overall_close_rate': (
                    sum(1 for c in self.call_history if c.outcome == "close") /
                    len(self.call_history) if self.call_history else 0.0
                ),
                'num_arms': len(self.arms),
            }
        }
