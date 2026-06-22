"""Objection Root Cause Detector — analyze root causes beyond surface objections."""
from dataclasses import dataclass, field
from typing import Dict, List, Optional
from datetime import datetime
import logging
from enum import Enum

logger = logging.getLogger(__name__)


class RootCauseType(str, Enum):
    """Root causes behind stated objections."""
    COMPETITIVE_PRESSURE = "competitive_pressure"
    INTERNAL_POLITICS = "internal_politics"
    VENDOR_FATIGUE = "vendor_fatigue"
    ECONOMIC_UNCERTAINTY = "economic_uncertainty"
    CAPABILITY_DOUBT = "capability_doubt"
    CHANGE_RESISTANCE = "change_resistance"
    STAKEHOLDER_MISALIGNMENT = "stakeholder_misalignment"
    EXECUTION_CONCERN = "execution_concern"
    DATA_PRIVACY_CONCERN = "data_privacy_concern"
    INTEGRATION_COMPLEXITY = "integration_complexity"


class SurfaceObjection(str, Enum):
    """Surface-level objections (what prospect states)."""
    BUDGET = "budget"
    TIMING = "timing"
    COMPETITOR = "competitor"
    FEATURES = "features"
    IMPLEMENTATION = "implementation"
    SUPPORT = "support"
    INTEGRATION = "integration"
    RISK = "risk"
    INTERNAL_APPROVAL = "internal_approval"
    ROI_UNCLEAR = "roi_unclear"


@dataclass
class RootCauseAnalysis:
    """Deep analysis of objection root causes."""
    surface_objection: SurfaceObjection
    likely_root_causes: List[RootCauseType]
    confidence_scores: Dict[RootCauseType, float]  # 0-1 confidence
    behavioral_signals: List[str]  # Evidence for root cause
    recommended_approach: str
    questions_to_ask: List[str]  # Diagnostic questions to uncover root
    timeline_sensitivity: float  # 0-1, how urgent is this objection


@dataclass
class ObjectionAnalysis:
    """Complete analysis of an objection in context."""
    objection_id: str
    prospect_id: str
    deal_id: str
    surface_objection: SurfaceObjection
    stated_reason: str
    context_before: str  # Conversation snippet before objection
    context_after: str  # Conversation snippet after objection
    root_cause_analysis: RootCauseAnalysis
    handling_attempt: Optional[str] = None
    handling_outcome: Optional[str] = None  # 'deflected', 'addressed', 'stalled'
    sentiment_before: float = 0.0  # -1 (negative) to 1 (positive)
    sentiment_after: float = 0.0
    timestamp: datetime = field(default_factory=datetime.now)
    follow_up_objections: List[SurfaceObjection] = field(default_factory=list)


class ObjectionDetector:
    """
    Detect and analyze root causes of objections.
    Maps surface objections to underlying business/organizational issues.
    """

    # Mapping from surface objections to likely root causes
    OBJECTION_TO_ROOT_CAUSE = {
        SurfaceObjection.BUDGET: [
            RootCauseType.ECONOMIC_UNCERTAINTY,
            RootCauseType.COMPETITIVE_PRESSURE,
            RootCauseType.CAPABILITY_DOUBT,
        ],
        SurfaceObjection.TIMING: [
            RootCauseType.INTERNAL_POLITICS,
            RootCauseType.STAKEHOLDER_MISALIGNMENT,
            RootCauseType.ECONOMIC_UNCERTAINTY,
        ],
        SurfaceObjection.COMPETITOR: [
            RootCauseType.COMPETITIVE_PRESSURE,
            RootCauseType.VENDOR_FATIGUE,
        ],
        SurfaceObjection.FEATURES: [
            RootCauseType.CAPABILITY_DOUBT,
            RootCauseType.COMPETITIVE_PRESSURE,
        ],
        SurfaceObjection.IMPLEMENTATION: [
            RootCauseType.EXECUTION_CONCERN,
            RootCauseType.CHANGE_RESISTANCE,
            RootCauseType.INTEGRATION_COMPLEXITY,
        ],
        SurfaceObjection.SUPPORT: [
            RootCauseType.VENDOR_FATIGUE,
            RootCauseType.DATA_PRIVACY_CONCERN,
        ],
        SurfaceObjection.INTEGRATION: [
            RootCauseType.INTEGRATION_COMPLEXITY,
            RootCauseType.EXECUTION_CONCERN,
        ],
        SurfaceObjection.RISK: [
            RootCauseType.DATA_PRIVACY_CONCERN,
            RootCauseType.CAPABILITY_DOUBT,
            RootCauseType.EXECUTION_CONCERN,
        ],
        SurfaceObjection.INTERNAL_APPROVAL: [
            RootCauseType.INTERNAL_POLITICS,
            RootCauseType.STAKEHOLDER_MISALIGNMENT,
        ],
        SurfaceObjection.ROI_UNCLEAR: [
            RootCauseType.CAPABILITY_DOUBT,
            RootCauseType.EXECUTION_CONCERN,
            RootCauseType.ECONOMIC_UNCERTAINTY,
        ],
    }

    def __init__(self):
        """Initialize objection detector."""
        self.objections: Dict[str, ObjectionAnalysis] = {}
        self.root_cause_patterns: Dict[RootCauseType, List[str]] = {}
        self.handling_effectiveness: Dict[tuple, float] = {}  # (objection, approach) -> success_rate

    def analyze_objection(
        self,
        prospect_id: str,
        deal_id: str,
        surface_objection: SurfaceObjection,
        stated_reason: str,
        context_before: str,
        context_after: str,
        behavioral_signals: Optional[List[str]] = None,
        sentiment_before: float = 0.0,
        sentiment_after: float = 0.0,
    ) -> ObjectionAnalysis:
        """
        Analyze an objection and determine likely root causes.

        Args:
            prospect_id: Prospect ID
            deal_id: Deal ID
            surface_objection: The stated objection type
            stated_reason: Prospect's exact stated reason
            context_before: Conversation context before objection
            context_after: Conversation context after objection
            behavioral_signals: Observable signals (hesitation, uncertainty, etc.)
            sentiment_before: Sentiment score before objection
            sentiment_after: Sentiment score after objection

        Returns:
            ObjectionAnalysis with root cause assessment
        """
        objection_id = f"{deal_id}_{len(self.objections)}_{datetime.now().timestamp()}"

        # Get likely root causes
        likely_roots = self.OBJECTION_TO_ROOT_CAUSE.get(
            surface_objection, [RootCauseType.STAKEHOLDER_MISALIGNMENT]
        )

        # Score confidence based on behavioral signals and context
        confidence_scores = self._score_root_causes(
            surface_objection,
            stated_reason,
            behavioral_signals or [],
            context_before,
        )

        # Generate diagnostic questions
        questions = self._generate_diagnostic_questions(surface_objection, likely_roots)

        # Assess timeline sensitivity
        timeline_sensitivity = self._assess_urgency(surface_objection, context_before)

        # Recommended approach based on root cause
        recommended_approach = self._recommend_approach(likely_roots, confidence_scores)

        root_cause = RootCauseAnalysis(
            surface_objection=surface_objection,
            likely_root_causes=likely_roots,
            confidence_scores=confidence_scores,
            behavioral_signals=behavioral_signals or [],
            recommended_approach=recommended_approach,
            questions_to_ask=questions,
            timeline_sensitivity=timeline_sensitivity,
        )

        analysis = ObjectionAnalysis(
            objection_id=objection_id,
            prospect_id=prospect_id,
            deal_id=deal_id,
            surface_objection=surface_objection,
            stated_reason=stated_reason,
            context_before=context_before,
            context_after=context_after,
            root_cause_analysis=root_cause,
            sentiment_before=sentiment_before,
            sentiment_after=sentiment_after,
        )

        self.objections[objection_id] = analysis
        logger.info(f"Analyzed objection {objection_id}: {surface_objection.value}")

        return analysis

    def log_handling_outcome(
        self,
        objection_id: str,
        handling_attempt: str,
        outcome: str,  # 'deflected', 'addressed', 'stalled'
        follow_up_objections: Optional[List[SurfaceObjection]] = None,
        sentiment_after_handling: float = 0.0,
    ) -> None:
        """
        Log how the objection was handled and the outcome.

        Args:
            objection_id: ID of the objection
            handling_attempt: Description of handling approach
            outcome: Result of handling
            follow_up_objections: Objections that followed
            sentiment_after_handling: Sentiment after handling
        """
        if objection_id not in self.objections:
            return

        analysis = self.objections[objection_id]
        analysis.handling_attempt = handling_attempt
        analysis.handling_outcome = outcome
        analysis.sentiment_after = sentiment_after_handling
        analysis.follow_up_objections = follow_up_objections or []

        # Track handling effectiveness
        approach_key = (
            analysis.surface_objection.value,
            analysis.root_cause_analysis.likely_root_causes[0].value if analysis.root_cause_analysis.likely_root_causes else "unknown",
        )
        self._update_handling_effectiveness(approach_key, outcome)

    def get_objection_patterns(self, limit: int = 10) -> List[Dict]:
        """
        Get most common objection patterns and their root causes.
        """
        patterns = {}

        for analysis in self.objections.values():
            key = (
                analysis.surface_objection.value,
                tuple(str(rc.value) for rc in analysis.root_cause_analysis.likely_root_causes[:2]),
            )
            if key not in patterns:
                patterns[key] = {
                    'surface_objection': analysis.surface_objection.value,
                    'root_causes': [rc.value for rc in analysis.root_cause_analysis.likely_root_causes],
                    'count': 0,
                    'deflected_rate': 0,
                    'handling_attempts': [],
                }
            patterns[key]['count'] += 1
            if analysis.handling_outcome == 'deflected':
                patterns[key]['deflected_rate'] += 1
            if analysis.handling_attempt:
                patterns[key]['handling_attempts'].append(analysis.handling_attempt)

        # Calculate success rates
        for pattern in patterns.values():
            pattern['deflected_rate'] = (
                pattern['deflected_rate'] / pattern['count']
                if pattern['count'] > 0
                else 0
            )

        return sorted(
            patterns.values(),
            key=lambda x: (x['deflected_rate'], x['count']),
            reverse=True,
        )[:limit]

    def get_root_cause_solutions(
        self,
        root_cause: RootCauseType,
    ) -> Dict:
        """
        Get proven solutions for a specific root cause.
        """
        matching_objections = [
            a for a in self.objections.values()
            if root_cause in a.root_cause_analysis.likely_root_causes
            and a.handling_outcome == 'deflected'
        ]

        approaches = {}
        for obj in matching_objections:
            if obj.handling_attempt:
                key = obj.handling_attempt[:50]  # Truncate for grouping
                approaches[key] = approaches.get(key, 0) + 1

        return {
            'root_cause': str(root_cause.value),
            'objections_with_this_cause': len(matching_objections),
            'proven_approaches': sorted(
                approaches.items(),
                key=lambda x: x[1],
                reverse=True,
            )[:5],
            'success_rate': (
                len(matching_objections) / sum(1 for a in self.objections.values() if root_cause in a.root_cause_analysis.likely_root_causes)
                if any(root_cause in a.root_cause_analysis.likely_root_causes for a in self.objections.values())
                else 0
            ),
        }

    def _score_root_causes(
        self,
        surface_objection: SurfaceObjection,
        stated_reason: str,
        behavioral_signals: List[str],
        context: str,
    ) -> Dict[RootCauseType, float]:
        """Score confidence for each potential root cause."""
        scores = {}
        likely_roots = self.OBJECTION_TO_ROOT_CAUSE.get(surface_objection, [])

        # Start with equal distribution
        base_score = 1.0 / len(likely_roots) if likely_roots else 0.5

        for root in likely_roots:
            score = base_score

            # Boost score based on signals
            if "competitor" in stated_reason.lower():
                if root == RootCauseType.COMPETITIVE_PRESSURE:
                    score += 0.2

            if any(sig in str(behavioral_signals).lower() for sig in ["hesitation", "uncertainty"]):
                if root == RootCauseType.STAKEHOLDER_MISALIGNMENT:
                    score += 0.15

            if "budget" in stated_reason.lower():
                if root == RootCauseType.ECONOMIC_UNCERTAINTY:
                    score += 0.2

            scores[root] = min(1.0, score)

        # Normalize to sum to 1
        total = sum(scores.values())
        if total > 0:
            scores = {k: v / total for k, v in scores.items()}

        return scores

    def _generate_diagnostic_questions(
        self,
        surface_objection: SurfaceObjection,
        root_causes: List[RootCauseType],
    ) -> List[str]:
        """Generate questions to uncover root causes."""
        questions = []

        if RootCauseType.COMPETITIVE_PRESSURE in root_causes:
            questions.append("Which vendors are you currently evaluating?")
            questions.append("What specific advantages are you looking for?")

        if RootCauseType.INTERNAL_POLITICS in root_causes:
            questions.append("Who else needs to approve this decision?")
            questions.append("What would be their main concerns?")

        if RootCauseType.STAKEHOLDER_MISALIGNMENT in root_causes:
            questions.append("Are all stakeholders aligned on the priority?")
            questions.append("Who has the most concern about this?")

        if RootCauseType.EXECUTION_CONCERN in root_causes:
            questions.append("What's your biggest concern about implementation?")
            questions.append("How have previous implementations gone?")

        if RootCauseType.ECONOMIC_UNCERTAINTY in root_causes:
            questions.append("Has your budget been approved?")
            questions.append("What would make this investment acceptable?")

        return questions[:4]  # Return top 4 most relevant

    def _assess_urgency(self, surface_objection: SurfaceObjection, context: str) -> float:
        """Assess how urgent/time-sensitive this objection is (0-1)."""
        urgency_keywords = ["soon", "deadline", "before", "quarter", "year", "immediately"]
        context_lower = context.lower()

        base_urgency = {
            SurfaceObjection.TIMING: 0.8,
            SurfaceObjection.BUDGET: 0.6,
            SurfaceObjection.INTERNAL_APPROVAL: 0.7,
        }

        urgency = base_urgency.get(surface_objection, 0.4)

        if any(keyword in context_lower for keyword in urgency_keywords):
            urgency = min(1.0, urgency + 0.2)

        return urgency

    def _recommend_approach(
        self,
        root_causes: List[RootCauseType],
        confidence_scores: Dict[RootCauseType, float],
    ) -> str:
        """Recommend handling approach based on root cause."""
        top_cause = max(root_causes, key=lambda x: confidence_scores.get(x, 0))

        approaches = {
            RootCauseType.COMPETITIVE_PRESSURE: "Emphasize unique value and differentiation",
            RootCauseType.INTERNAL_POLITICS: "Involve key stakeholders and build consensus",
            RootCauseType.VENDOR_FATIGUE: "Highlight simplicity and easy onboarding",
            RootCauseType.ECONOMIC_UNCERTAINTY: "Focus on ROI and quick payback period",
            RootCauseType.CAPABILITY_DOUBT: "Provide case studies and proof points",
            RootCauseType.CHANGE_RESISTANCE: "Start with pilot or phased implementation",
            RootCauseType.STAKEHOLDER_MISALIGNMENT: "Facilitate alignment meeting",
            RootCauseType.EXECUTION_CONCERN: "Provide detailed implementation plan",
            RootCauseType.DATA_PRIVACY_CONCERN: "Highlight security certifications",
            RootCauseType.INTEGRATION_COMPLEXITY: "Demonstrate pre-built integrations",
        }

        return approaches.get(top_cause, "Address stated concern and uncover deeper issues")

    def _update_handling_effectiveness(self, approach_key: tuple, outcome: str) -> None:
        """Update tracking of handling approach effectiveness."""
        current = self.handling_effectiveness.get(approach_key, 0)
        weight = 1.0 if outcome == 'deflected' else 0.0
        count = 1

        # Simple moving average
        if approach_key in self.handling_effectiveness:
            # Approximate count from existing score
            new_avg = (current + weight) / 2
            self.handling_effectiveness[approach_key] = new_avg
        else:
            self.handling_effectiveness[approach_key] = weight
