"""Talk Track A/B Optimizer — test 5 variations, auto-converge to best performer."""
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Tuple
from datetime import datetime
from enum import Enum
import logging
import random
import math

logger = logging.getLogger(__name__)


class TalkTrackType(str, Enum):
    """Types of talk tracks."""
    OPENING = "opening"
    VALUE_PROP = "value_prop"
    OBJECTION_HANDLER = "objection_handler"
    CLOSING = "closing"
    PAIN_POINT_DISCOVERY = "pain_point_discovery"


@dataclass
class TalkTrackVariant:
    """A variant of a talk track."""
    variant_id: str
    talk_track_type: TalkTrackType
    content: str  # The actual script/message
    key_phrases: List[str] = field(default_factory=list)
    tone: str = "professional"  # professional, casual, urgent, consultative
    deployments: int = 0
    conversions: int = 0  # Moves to next stage or achieves goal
    sentiment_lift: float = 0.0  # Average sentiment change
    completion_rate: float = 0.0  # Prospect stayed engaged
    confidence_interval: float = 0.95  # Statistical confidence
    created_at: datetime = field(default_factory=datetime.now)
    last_used: Optional[datetime] = None

    @property
    def conversion_rate(self) -> float:
        """Calculate conversion rate."""
        return self.conversions / self.deployments if self.deployments > 0 else 0.0

    @property
    def thompson_score(self) -> float:
        """Thompson Sampling score for multi-armed bandit optimization."""
        if self.deployments == 0:
            return 0.5  # Neutral initial score

        # Beta distribution parameters
        successes = self.conversions
        failures = self.deployments - self.conversions

        # Thompson Sampling: sample from Beta(successes+1, failures+1)
        # Using approximation: mean + variance bonus
        mean = (successes + 1) / (self.deployments + 2)
        variance = ((successes + 1) * (failures + 1)) / (
            ((self.deployments + 2) ** 2) * (self.deployments + 3)
        )
        bonus = math.sqrt(variance) * 0.5  # Exploration bonus

        return min(1.0, mean + bonus)


@dataclass
class OptimizationResult:
    """Result of talk track A/B optimization."""
    test_id: str
    talk_track_type: TalkTrackType
    winning_variant_id: str
    winning_conversion_rate: float
    variants_tested: int
    total_deployments: int
    statistical_significance: float  # 0-1, confidence in winner
    confidence_level: str  # "low", "medium", "high"
    recommendation: str
    variants_performance: List[Dict]
    convergence_iterations: int = 0
    ready_to_roll_out: bool = False


class TalkTrackOptimizer:
    """
    A/B test talk track variations and auto-converge to best performer.
    Uses Thompson Sampling for multi-armed bandit optimization.
    """

    def __init__(self, min_deployments_for_winner: int = 30):
        """
        Initialize optimizer.

        Args:
            min_deployments_for_winner: Minimum deployments before declaring winner
        """
        self.variants: Dict[str, TalkTrackVariant] = {}
        self.tests: Dict[str, Dict] = {}
        self.min_deployments_for_winner = min_deployments_for_winner
        self.allocation_history: List[Dict] = []

    def create_test(
        self,
        test_id: str,
        talk_track_type: TalkTrackType,
        variants: List[TalkTrackVariant],
    ) -> Dict:
        """
        Create a new A/B test with multiple variants.

        Args:
            test_id: Unique test identifier
            talk_track_type: Type of talk track being tested
            variants: 3-5 variants to test

        Returns:
            Test metadata
        """
        if len(variants) < 3 or len(variants) > 5:
            raise ValueError("Must provide 3-5 variants for testing")

        for variant in variants:
            self.variants[variant.variant_id] = variant

        self.tests[test_id] = {
            'test_id': test_id,
            'talk_track_type': talk_track_type,
            'variant_ids': [v.variant_id for v in variants],
            'started_at': datetime.now(),
            'status': 'active',
            'total_deployments': 0,
            'convergence_confidence': 0.0,
        }

        logger.info(f"Created test {test_id} with {len(variants)} variants")
        return self.tests[test_id]

    def select_variant(
        self,
        test_id: str,
        context: Optional[Dict] = None,
    ) -> TalkTrackVariant:
        """
        Select a variant for deployment using Thompson Sampling.
        Balances exploration and exploitation dynamically.

        Args:
            test_id: Test ID
            context: Optional context (prospect info, stage, etc.)

        Returns:
            Variant to deploy
        """
        if test_id not in self.tests:
            raise ValueError(f"Test {test_id} not found")

        test = self.tests[test_id]
        variant_ids = test['variant_ids']

        # Get variants
        variants = [self.variants[vid] for vid in variant_ids]

        # Thompson Sampling selection
        thompson_scores = {v.variant_id: v.thompson_score for v in variants}
        selected_id = max(thompson_scores, key=thompson_scores.get)

        # Record allocation
        self.allocation_history.append({
            'test_id': test_id,
            'selected_variant': selected_id,
            'thompson_scores': thompson_scores,
            'timestamp': datetime.now(),
        })

        logger.info(f"Selected variant {selected_id} for test {test_id}")
        return self.variants[selected_id]

    def log_deployment_result(
        self,
        test_id: str,
        variant_id: str,
        converted: bool,
        sentiment_lift: float = 0.0,
        completion: float = 1.0,  # 0-1, how much of the talk track was delivered
    ) -> None:
        """
        Log the result of a variant deployment.

        Args:
            test_id: Test ID
            variant_id: Variant that was deployed
            converted: Whether it achieved the goal (conversion)
            sentiment_lift: Change in prospect sentiment (-1 to 1)
            completion: How much of the talk track was actually used
        """
        if variant_id not in self.variants:
            return

        variant = self.variants[variant_id]
        variant.deployments += 1
        if converted:
            variant.conversions += 1
        variant.last_used = datetime.now()

        # Update sentiment and completion
        variant.sentiment_lift = (
            (variant.sentiment_lift * (variant.deployments - 1) + sentiment_lift)
            / variant.deployments
        )
        variant.completion_rate = (
            (variant.completion_rate * (variant.deployments - 1) + completion)
            / variant.deployments
        )

        # Update test stats
        if test_id in self.tests:
            self.tests[test_id]['total_deployments'] += 1

        logger.info(
            f"Logged result for variant {variant_id}: "
            f"converted={converted}, deployments={variant.deployments}"
        )

        # Check if winner is clear
        self._check_convergence(test_id)

    def get_test_results(self, test_id: str) -> OptimizationResult:
        """
        Get current results and recommendation for a test.

        Returns:
            OptimizationResult with winner and confidence
        """
        if test_id not in self.tests:
            raise ValueError(f"Test {test_id} not found")

        test = self.tests[test_id]
        variant_ids = test['variant_ids']
        variants = [self.variants[vid] for vid in variant_ids]

        # Sort by conversion rate and Thompson score
        sorted_variants = sorted(
            variants,
            key=lambda v: (v.conversion_rate, v.thompson_score),
            reverse=True,
        )

        winner = sorted_variants[0]
        total_deployments = sum(v.deployments for v in variants)

        # Calculate statistical significance
        significance = self._calculate_significance(sorted_variants, total_deployments)

        # Confidence level
        if significance >= 0.95:
            confidence_level = "high"
            ready_to_roll_out = True
        elif significance >= 0.80:
            confidence_level = "medium"
            ready_to_roll_out = False
        else:
            confidence_level = "low"
            ready_to_roll_out = False

        # Build variants performance list
        variants_performance = [
            {
                'variant_id': v.variant_id,
                'deployments': v.deployments,
                'conversions': v.conversions,
                'conversion_rate': v.conversion_rate,
                'sentiment_lift': v.sentiment_lift,
                'completion_rate': v.completion_rate,
                'thompson_score': v.thompson_score,
            }
            for v in sorted_variants
        ]

        # Generate recommendation
        winner_advantage = (
            (winner.conversion_rate - sorted_variants[1].conversion_rate)
            * 100
            if len(sorted_variants) > 1
            else 0
        )

        if ready_to_roll_out:
            recommendation = (
                f"Roll out variant {winner.variant_id} immediately. "
                f"It outperforms the second-best by {winner_advantage:.1f}%. "
                f"Continue monitoring for A/B test consistency."
            )
        elif confidence_level == "medium":
            recommendation = (
                f"Continue testing variant {winner.variant_id}. "
                f"Current data shows {winner_advantage:.1f}% advantage. "
                f"Target {self.min_deployments_for_winner} total deployments for confidence."
            )
        else:
            recommendation = (
                f"All variants are competitive. Continue testing across all. "
                f"Current leader: {winner.variant_id} with {winner.conversion_rate*100:.1f}% conversion."
            )

        return OptimizationResult(
            test_id=test_id,
            talk_track_type=test['talk_track_type'],
            winning_variant_id=winner.variant_id,
            winning_conversion_rate=winner.conversion_rate,
            variants_tested=len(variants),
            total_deployments=total_deployments,
            statistical_significance=significance,
            confidence_level=confidence_level,
            recommendation=recommendation,
            variants_performance=variants_performance,
            ready_to_roll_out=ready_to_roll_out,
        )

    def get_active_tests(self) -> List[Dict]:
        """Get all active A/B tests with current status."""
        active = []

        for test_id, test in self.tests.items():
            if test['status'] == 'active':
                variant_ids = test['variant_ids']
                variants = [self.variants[vid] for vid in variant_ids]
                total_deployments = sum(v.deployments for v in variants)

                active.append({
                    'test_id': test_id,
                    'talk_track_type': str(test['talk_track_type'].value),
                    'variants_count': len(variant_ids),
                    'total_deployments': total_deployments,
                    'started_at': test['started_at'],
                    'status': test['status'],
                    'convergence_confidence': test['convergence_confidence'],
                })

        return active

    def declare_winner(self, test_id: str, variant_id: str) -> Dict:
        """
        Manually declare a winner (before auto-convergence).
        """
        if test_id not in self.tests:
            raise ValueError(f"Test {test_id} not found")

        test = self.tests[test_id]
        test['status'] = 'completed'
        test['winner'] = variant_id

        winner_variant = self.variants[variant_id]

        logger.info(f"Declared winner for test {test_id}: {variant_id}")

        return {
            'test_id': test_id,
            'winner_variant_id': variant_id,
            'conversion_rate': winner_variant.conversion_rate,
            'deployments': winner_variant.deployments,
        }

    def _check_convergence(self, test_id: str) -> bool:
        """
        Check if the test has converged (clear winner emerged).
        Uses Bayesian stopping criterion.
        """
        if test_id not in self.tests:
            return False

        test = self.tests[test_id]
        variant_ids = test['variant_ids']
        variants = [self.variants[vid] for vid in variant_ids]
        total_deployments = sum(v.deployments for v in variants)

        if total_deployments < self.min_deployments_for_winner:
            return False

        # Check if top variant is statistically superior
        sorted_variants = sorted(
            variants,
            key=lambda v: v.conversion_rate,
            reverse=True,
        )

        winner = sorted_variants[0]
        challenger = sorted_variants[1] if len(sorted_variants) > 1 else None

        if not challenger or challenger.deployments == 0:
            return False

        # Simple convergence criterion: winner has 10+ more conversions
        if winner.conversions - challenger.conversions >= 10:
            test['status'] = 'converged'
            test['winner'] = winner.variant_id
            test['convergence_confidence'] = 0.95
            logger.info(f"Test {test_id} has converged to variant {winner.variant_id}")
            return True

        return False

    def _calculate_significance(
        self,
        sorted_variants: List[TalkTrackVariant],
        total_deployments: int,
    ) -> float:
        """
        Calculate statistical significance using simplified Bayesian approach.
        Returns 0-1 confidence that winner is truly better.
        """
        if len(sorted_variants) < 2:
            return 0.0

        winner = sorted_variants[0]
        challenger = sorted_variants[1]

        if total_deployments < 20:
            return 0.0

        # Calculate difference in conversion rates
        rate_diff = winner.conversion_rate - challenger.conversion_rate

        # Normalize by total deployments (more deployments = higher confidence)
        deployment_factor = min(1.0, total_deployments / self.min_deployments_for_winner)

        # Significance score
        significance = rate_diff * 2 * deployment_factor

        return min(1.0, max(0.0, significance))
