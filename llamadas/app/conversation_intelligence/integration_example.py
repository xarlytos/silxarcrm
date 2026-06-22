"""
Integration example: Using all Conversation Intelligence components together.
Shows real-world usage patterns and workflows.
"""

from datetime import datetime
from typing import Dict, List

from .winning_arguments import (
    WinningArgumentsDB,
    ArgumentContext,
    ArgumentType,
    ObjectionType,
)
from .objection_detector import (
    ObjectionDetector,
    SurfaceObjection,
    RootCauseType,
)
from .talk_track_optimizer import (
    TalkTrackOptimizer,
    TalkTrackType,
    TalkTrackVariant,
)
from .competitive_detector import CompetitiveDetector


class ConversationIntelligencePipeline:
    """
    Integrated pipeline using all Conversation Intelligence components.
    Handles full call workflow: pre-call prep, during-call detection, post-call analysis.
    """

    def __init__(self):
        """Initialize all components."""
        self.arguments_db = WinningArgumentsDB()
        self.objection_detector = ObjectionDetector()
        self.talk_track_optimizer = TalkTrackOptimizer()
        self.competitive_detector = CompetitiveDetector()

    def prepare_call(
        self,
        deal_id: str,
        prospect_industry: str,
        deal_stage: str,
        buyer_persona: str,
    ) -> Dict:
        """
        Prepare for a sales call with AI-generated recommendations.

        Returns:
            Pre-call brief with recommended arguments and talk tracks
        """
        context = ArgumentContext(
            argument_type=ArgumentType.ROI_FOCUSED,
            prospect_industry=prospect_industry,
            deal_stage=deal_stage,
            buyer_persona=buyer_persona,
            deal_size_range="50-100k",
        )

        # Get winning arguments for this context
        winning_args = self.arguments_db.get_arguments_for_context(context, limit=3)

        # Check if there are active talk track tests
        active_tests = self.talk_track_optimizer.get_active_tests()
        recommended_talk_tracks = []

        for test in active_tests:
            # Select talk track variant for this call
            variant = self.talk_track_optimizer.select_variant(test["test_id"])
            recommended_talk_tracks.append({
                "test_id": test["test_id"],
                "variant": variant.variant_id,
                "content": variant.content,
            })

        # Check deal risk from competitive threats
        competitive_risk = self.competitive_detector.analyze_deal_risk(deal_id)

        return {
            "deal_id": deal_id,
            "pre_call_brief": {
                "recommended_arguments": winning_args,
                "talk_track_variants": recommended_talk_tracks,
                "competitive_risk": competitive_risk["competitive_risk"],
                "defensive_actions": competitive_risk.get("recommended_actions", [])[:2],
            },
        }

    def analyze_call_transcript(
        self,
        deal_id: str,
        prospect_id: str,
        transcript: str,
        conversation_segments: List[Dict],  # [{'role': 'prospect', 'text': '...', 'sentiment': 0.5}, ...]
    ) -> Dict:
        """
        Analyze a call transcript for objections, competitive signals, and argument effectiveness.

        Args:
            deal_id: Deal ID
            prospect_id: Prospect ID
            transcript: Full call transcript
            conversation_segments: Segmented conversation with role, text, and sentiment

        Returns:
            Comprehensive call analysis
        """
        analysis = {
            "deal_id": deal_id,
            "prospect_id": prospect_id,
            "timestamp": datetime.now().isoformat(),
            "objections_detected": [],
            "competitive_signals": [],
            "argument_deployments": [],
            "recommendations": [],
        }

        # Process each conversation segment
        for i, segment in enumerate(conversation_segments):
            if segment.get("role") != "prospect":
                continue

            text = segment.get("text", "")
            context_before = (
                " ".join(s.get("text", "") for s in conversation_segments[max(0, i-2):i])
            )
            sentiment = segment.get("sentiment", 0.0)

            # 1. Detect objections
            objection = self._detect_objection(text)
            if objection:
                obj_analysis = self.objection_detector.analyze_objection(
                    prospect_id=prospect_id,
                    deal_id=deal_id,
                    surface_objection=objection,
                    stated_reason=text,
                    context_before=context_before,
                    context_after="",
                    sentiment_before=sentiment,
                )
                analysis["objections_detected"].append({
                    "type": objection.value,
                    "root_causes": [rc.value for rc in obj_analysis.root_cause_analysis.likely_root_causes],
                    "recommendation": obj_analysis.root_cause_analysis.recommended_approach,
                })

            # 2. Detect competitive signals
            signal = self.competitive_detector.detect_signal(
                prospect_id=prospect_id,
                deal_id=deal_id,
                conversation_text=text,
                context_before=context_before,
            )
            if signal:
                analysis["competitive_signals"].append({
                    "type": signal.signal_type,
                    "competitor": signal.competitor_name,
                    "confidence": signal.confidence,
                    "risk_level": signal.risk_level,
                    "action": signal.recommended_action,
                })

        # Generate post-call recommendations
        analysis["recommendations"] = self._generate_recommendations(analysis)

        return analysis

    def log_call_outcome(
        self,
        deal_id: str,
        prospect_id: str,
        outcome: str,  # 'advanced', 'stalled', 'closed', 'lost'
        objection_responses: List[Dict],  # [{'objection_id': '...', 'outcome': 'deflected', ...}, ...]
        talk_track_deployments: List[Dict],  # [{'test_id': '...', 'variant_id': '...', 'converted': True}, ...]
        argument_deployments: List[Dict],  # [{'arg_id': '...', 'type': '...', 'converted': True}, ...]
    ) -> Dict:
        """
        Log comprehensive call outcome for all components.

        Returns:
            Summary of what was learned from this call
        """
        learning_summary = {
            "deal_id": deal_id,
            "objections_logged": 0,
            "talk_tracks_improved": 0,
            "arguments_validated": 0,
            "competitive_insights": 0,
        }

        # 1. Log objection handling outcomes
        for objection_response in objection_responses:
            self.objection_detector.log_handling_outcome(
                objection_id=objection_response.get("objection_id"),
                handling_attempt=objection_response.get("handling_attempt"),
                outcome=objection_response.get("outcome"),
            )
            learning_summary["objections_logged"] += 1

        # 2. Log talk track results
        for tt_deployment in talk_track_deployments:
            self.talk_track_optimizer.log_deployment_result(
                test_id=tt_deployment.get("test_id"),
                variant_id=tt_deployment.get("variant_id"),
                converted=tt_deployment.get("converted", outcome in ["advanced", "closed"]),
                sentiment_lift=tt_deployment.get("sentiment_lift", 0.2),
            )
            learning_summary["talk_tracks_improved"] += 1

        # 3. Log argument effectiveness
        for arg_deployment in argument_deployments:
            context = ArgumentContext(
                argument_type=ArgumentType(arg_deployment.get("type")),
                prospect_industry=arg_deployment.get("industry", "Unknown"),
                deal_stage=arg_deployment.get("deal_stage", "PROSPECT"),
                buyer_persona=arg_deployment.get("buyer_persona", "Unknown"),
                deal_size_range="50-100k",
            )
            self.arguments_db.log_argument_deployment(
                argument_id=arg_deployment.get("argument_id"),
                argument_type=ArgumentType(arg_deployment.get("type")),
                context=context,
                outcome=outcome if arg_deployment.get("effective") else "stalled",
                objections_deflected=arg_deployment.get("objections_deflected"),
                stage_advancement=1 if outcome in ["advanced", "closed"] else 0,
            )
            learning_summary["arguments_validated"] += 1

        # 4. Log competitive outcomes
        competitive_risk = self.competitive_detector.analyze_deal_risk(deal_id)
        if competitive_risk["signals_count"] > 0:
            for signal_dict in competitive_risk.get("recent_signals", []):
                # Find matching signal and log outcome
                matching_signals = [
                    s for s in self.competitive_detector.signals.values()
                    if s.deal_id == deal_id and s.signal_type == signal_dict.get("signal_type")
                ]
                if matching_signals:
                    signal = matching_signals[0]
                    self.competitive_detector.log_signal_outcome(
                        signal_id=signal.signal_id,
                        addressed=True,
                        outcome="recovered" if outcome not in ["lost", "stalled"] else "lost_to_competitor",
                    )
                    learning_summary["competitive_insights"] += 1

        return learning_summary

    def get_sales_coaching(self, deal_id: str, prospect_id: str) -> Dict:
        """
        Get AI coaching recommendations for a prospect/deal.
        """
        # Get objection patterns
        objection_patterns = self.objection_detector.get_objection_patterns(limit=5)

        # Get competitive threats
        threats = self.competitive_detector.get_competitive_threats(limit=5)

        # Filter relevant threats for this deal
        deal_threats = [t for t in threats if t["deal_id"] == deal_id]

        # Get top arguments
        top_args = self.arguments_db.get_top_arguments(limit=5)

        coaching = {
            "deal_id": deal_id,
            "prospect_id": prospect_id,
            "coaching_points": [],
        }

        # Coaching on objections
        if objection_patterns:
            for pattern in objection_patterns[:2]:
                coaching["coaching_points"].append({
                    "category": "objection_handling",
                    "objection_type": pattern["surface_objection"],
                    "success_rate": f"{pattern['deflected_rate']*100:.1f}%",
                    "proven_approaches": [
                        a[0][:100] for a in pattern.get("handling_attempts", [])[:2]
                    ],
                })

        # Coaching on competitive defense
        if deal_threats:
            for threat in deal_threats[:1]:
                coaching["coaching_points"].append({
                    "category": "competitive_defense",
                    "competitor": threat["competitor"],
                    "recommended_action": threat["recommended_action"],
                })

        # Coaching on argument selection
        if top_args:
            coaching["coaching_points"].append({
                "category": "argument_selection",
                "top_argument": top_args[0].get("type"),
                "win_rate": f"{top_args[0].get('win_rate', 0)*100:.1f}%",
            })

        return coaching

    # Private helper methods

    def _detect_objection(self, text: str) -> SurfaceObjection:
        """Simple rule-based objection detection from text."""
        text_lower = text.lower()

        if any(word in text_lower for word in ["budget", "cost", "price", "expensive"]):
            return SurfaceObjection.BUDGET
        if any(word in text_lower for word in ["later", "next quarter", "not now", "timing"]):
            return SurfaceObjection.TIMING
        if any(word in text_lower for word in ["competitor", "alternative", "instead"]):
            return SurfaceObjection.COMPETITOR
        if any(word in text_lower for word in ["feature", "can you", "support"]):
            return SurfaceObjection.FEATURES
        if any(word in text_lower for word in ["implement", "integration", "complex"]):
            return SurfaceObjection.IMPLEMENTATION
        if any(word in text_lower for word in ["roi", "value", "justify", "benefit"]):
            return SurfaceObjection.ROI_UNCLEAR

        return None

    def _generate_recommendations(self, analysis: Dict) -> List[str]:
        """Generate post-call recommendations from analysis."""
        recommendations = []

        # If objections detected, recommend follow-up
        if analysis.get("objections_detected"):
            recommendations.append(
                f"Address {len(analysis['objections_detected'])} objection(s) before next call"
            )

        # If competitive signals detected, escalate
        if analysis.get("competitive_signals"):
            competitors = set(s.get("competitor") for s in analysis["competitive_signals"])
            if None in competitors:
                competitors.discard(None)
            if competitors:
                recommendations.append(
                    f"Prepare competitive comparison deck vs {', '.join(competitors)}"
                )

        # If no issues, recommend closing next call
        if not recommendations:
            recommendations.append("Ready to move to next stage - focus on closing")

        return recommendations


# Example usage
def example_workflow():
    """Example of using the integrated pipeline."""
    pipeline = ConversationIntelligencePipeline()

    # 1. Prepare for a call
    prep = pipeline.prepare_call(
        deal_id="deal_12345",
        prospect_industry="Technology",
        deal_stage="DEMO_COMPLETED",
        buyer_persona="Decision Maker",
    )
    print("Pre-call brief:", prep)

    # 2. After call, analyze transcript
    analysis = pipeline.analyze_call_transcript(
        deal_id="deal_12345",
        prospect_id="prospect_001",
        transcript="Full transcript here...",
        conversation_segments=[
            {
                "role": "rep",
                "text": "Let me show you how this saves 40% on implementation time",
                "sentiment": 0.5,
            },
            {
                "role": "prospect",
                "text": "Budget is tight right now and we're looking at Gong too",
                "sentiment": -0.3,
            },
            {
                "role": "rep",
                "text": "I understand. What if we showed you implementation cost reduction first?",
                "sentiment": 0.6,
            },
        ],
    )
    print("Call analysis:", analysis)

    # 3. Log outcome
    outcome = pipeline.log_call_outcome(
        deal_id="deal_12345",
        prospect_id="prospect_001",
        outcome="advanced",
        objection_responses=[
            {
                "objection_id": "obj_001",
                "handling_attempt": "Proposed phased implementation",
                "outcome": "deflected",
            },
        ],
        talk_track_deployments=[
            {
                "test_id": "test_opening_001",
                "variant_id": "var_1",
                "converted": True,
                "sentiment_lift": 0.3,
            },
        ],
        argument_deployments=[
            {
                "argument_id": "arg_roi",
                "type": ArgumentType.ROI_FOCUSED.value,
                "industry": "Technology",
                "deal_stage": "DEMO_COMPLETED",
                "buyer_persona": "Decision Maker",
                "effective": True,
                "objections_deflected": ["budget_constraint"],
            },
        ],
    )
    print("Learning summary:", outcome)

    # 4. Get coaching recommendations
    coaching = pipeline.get_sales_coaching("deal_12345", "prospect_001")
    print("Coaching recommendations:", coaching)


if __name__ == "__main__":
    example_workflow()
