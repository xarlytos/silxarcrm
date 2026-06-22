"""Tests for Conversation Intelligence module."""
import pytest
from datetime import datetime
from app.conversation_intelligence import (
    WinningArgumentsDB,
    ArgumentContext,
    ArgumentType,
    ObjectionType,
    ObjectionDetector,
    SurfaceObjection,
    RootCauseType,
    TalkTrackOptimizer,
    TalkTrackType,
    TalkTrackVariant,
    CompetitiveDetector,
)


class TestWinningArgumentsDB:
    """Tests for Winning Arguments Database."""

    def test_create_argument_performance(self):
        """Test creating and tracking argument performance."""
        db = WinningArgumentsDB()
        context = ArgumentContext(
            argument_type=ArgumentType.ROI_FOCUSED,
            prospect_industry="Technology",
            deal_stage="NEGOTIATION",
            buyer_persona="Economic Buyer",
            deal_size_range="50-100k",
        )

        # Log a successful argument deployment
        db.log_argument_deployment(
            argument_id="arg_001",
            argument_type=ArgumentType.ROI_FOCUSED,
            context=context,
            outcome="closed",
            stage_advancement=2,
        )

        assert db.arguments["arg_001"].deployment_count == 1
        assert db.arguments["arg_001"].close_count == 1
        assert db.arguments["arg_001"].win_rate == 1.0

    def test_top_arguments_ranking(self):
        """Test ranking arguments by performance."""
        db = WinningArgumentsDB()
        context = ArgumentContext(
            argument_type=ArgumentType.ROI_FOCUSED,
            prospect_industry="Finance",
            deal_stage="DEMO_COMPLETED",
            buyer_persona="Decision Maker",
            deal_size_range="100k+",
        )

        # Log multiple argument deployments
        for i in range(5):
            db.log_argument_deployment(
                argument_id="arg_roi",
                argument_type=ArgumentType.ROI_FOCUSED,
                context=context,
                outcome="closed" if i < 3 else "stalled",
            )

        for i in range(3):
            db.log_argument_deployment(
                argument_id="arg_competitive",
                argument_type=ArgumentType.COMPETITIVE_ADVANTAGE,
                context=context,
                outcome="closed" if i < 2 else "stalled",
            )

        top = db.get_top_arguments(top_n=2)
        assert len(top) <= 2
        assert top[0].win_rate >= top[1].win_rate if len(top) > 1 else True

    def test_objection_response_effectiveness(self):
        """Test tracking objection handling effectiveness."""
        db = WinningArgumentsDB()
        context = ArgumentContext(
            argument_type=ArgumentType.RISK_MITIGATION,
            prospect_industry="Healthcare",
            deal_stage="DEMO_COMPLETED",
            buyer_persona="Technical Buyer",
            deal_size_range="50-100k",
        )

        # Log argument that handles objection
        db.log_argument_deployment(
            argument_id="arg_risk",
            argument_type=ArgumentType.RISK_MITIGATION,
            context=context,
            outcome="closed",
            objections_deflected=[
                ObjectionType.IMPLEMENTATION_RISK,
                ObjectionType.FEATURE_GAP,
            ],
        )

        effectiveness = db.get_objection_response_effectiveness(
            ArgumentType.RISK_MITIGATION,
            ObjectionType.IMPLEMENTATION_RISK,
        )

        assert effectiveness["effectiveness_rate"] > 0


class TestObjectionDetector:
    """Tests for Objection Root Cause Detector."""

    def test_analyze_budget_objection(self):
        """Test analyzing budget objection and its root causes."""
        detector = ObjectionDetector()

        analysis = detector.analyze_objection(
            prospect_id="prospect_001",
            deal_id="deal_001",
            surface_objection=SurfaceObjection.BUDGET,
            stated_reason="We don't have budget approved for this",
            context_before="discussing implementation timeline",
            context_after="prospect became hesitant",
            behavioral_signals=["hesitation", "uncertainty"],
        )

        assert analysis.surface_objection == SurfaceObjection.BUDGET
        assert len(analysis.root_cause_analysis.likely_root_causes) > 0
        assert RootCauseType.ECONOMIC_UNCERTAINTY in analysis.root_cause_analysis.likely_root_causes

    def test_objection_pattern_detection(self):
        """Test detecting objection patterns."""
        detector = ObjectionDetector()

        # Log multiple objections
        for i in range(5):
            detector.analyze_objection(
                prospect_id=f"prospect_{i}",
                deal_id=f"deal_{i}",
                surface_objection=SurfaceObjection.BUDGET,
                stated_reason="Budget constraint",
                context_before="discussing pricing",
                context_after="",
                behavioral_signals=["hesitation"],
            )

        patterns = detector.get_objection_patterns(limit=3)
        assert len(patterns) > 0
        assert any(p["surface_objection"] == SurfaceObjection.BUDGET.value for p in patterns)

    def test_handling_outcome_logging(self):
        """Test logging how objections were handled."""
        detector = ObjectionDetector()

        analysis = detector.analyze_objection(
            prospect_id="prospect_001",
            deal_id="deal_001",
            surface_objection=SurfaceObjection.TIMING,
            stated_reason="Not the right time",
            context_before="",
            context_after="",
        )

        detector.log_handling_outcome(
            objection_id=analysis.objection_id,
            handling_attempt="Proposed phased implementation starting Q3",
            outcome="deflected",
            follow_up_objections=[],
        )

        assert detector.objections[analysis.objection_id].handling_outcome == "deflected"

    def test_root_cause_solutions(self):
        """Test getting proven solutions for root causes."""
        detector = ObjectionDetector()

        # Log objection with handling outcome
        analysis = detector.analyze_objection(
            prospect_id="prospect_001",
            deal_id="deal_001",
            surface_objection=SurfaceObjection.IMPLEMENTATION,
            stated_reason="Implementation too complex",
            context_before="",
            context_after="",
        )

        detector.log_handling_outcome(
            objection_id=analysis.objection_id,
            handling_attempt="Provided detailed implementation roadmap",
            outcome="deflected",
        )

        solutions = detector.get_root_cause_solutions(RootCauseType.EXECUTION_CONCERN)
        assert solutions["root_cause"] == RootCauseType.EXECUTION_CONCERN.value


class TestTalkTrackOptimizer:
    """Tests for Talk Track A/B Optimizer."""

    def test_create_ab_test(self):
        """Test creating an A/B test."""
        optimizer = TalkTrackOptimizer()

        variants = [
            TalkTrackVariant(
                variant_id="var_1",
                talk_track_type=TalkTrackType.OPENING,
                content="Opening 1 - direct approach",
            ),
            TalkTrackVariant(
                variant_id="var_2",
                talk_track_type=TalkTrackType.OPENING,
                content="Opening 2 - consultative approach",
            ),
            TalkTrackVariant(
                variant_id="var_3",
                talk_track_type=TalkTrackType.OPENING,
                content="Opening 3 - personal touch",
            ),
        ]

        test = optimizer.create_test(
            test_id="test_opening_001",
            talk_track_type=TalkTrackType.OPENING,
            variants=variants,
        )

        assert test["test_id"] == "test_opening_001"
        assert test["status"] == "active"
        assert len(test["variant_ids"]) == 3

    def test_thompson_sampling_selection(self):
        """Test Thompson Sampling variant selection."""
        optimizer = TalkTrackOptimizer()

        variants = [
            TalkTrackVariant(
                variant_id="var_a",
                talk_track_type=TalkTrackType.OPENING,
                content="Opening A",
            ),
            TalkTrackVariant(
                variant_id="var_b",
                talk_track_type=TalkTrackType.OPENING,
                content="Opening B",
            ),
            TalkTrackVariant(
                variant_id="var_c",
                talk_track_type=TalkTrackType.OPENING,
                content="Opening C",
            ),
        ]

        optimizer.create_test(
            test_id="test_001",
            talk_track_type=TalkTrackType.OPENING,
            variants=variants,
        )

        # Select variants multiple times - should eventually explore all since all start equal
        selected = []
        for i in range(30):
            variant = optimizer.select_variant("test_001")
            selected.append(variant.variant_id)
            # Add some variance by logging results
            optimizer.log_deployment_result(
                test_id="test_001",
                variant_id=variant.variant_id,
                converted=(i % 3 == 0),  # Variable success rates
            )

        # Should have explored multiple variants
        assert len(set(selected)) >= 2

    def test_deployment_result_logging(self):
        """Test logging deployment results."""
        optimizer = TalkTrackOptimizer()

        variants = [
            TalkTrackVariant(
                variant_id="var_x",
                talk_track_type=TalkTrackType.CLOSING,
                content="Closing X",
            ),
            TalkTrackVariant(
                variant_id="var_y",
                talk_track_type=TalkTrackType.CLOSING,
                content="Closing Y",
            ),
            TalkTrackVariant(
                variant_id="var_z",
                talk_track_type=TalkTrackType.CLOSING,
                content="Closing Z",
            ),
        ]

        optimizer.create_test(
            test_id="test_closing",
            talk_track_type=TalkTrackType.CLOSING,
            variants=variants,
        )

        # Log successful deployments
        for i in range(3):
            optimizer.log_deployment_result(
                test_id="test_closing",
                variant_id="var_x",
                converted=True,
                sentiment_lift=0.3,
            )

        assert optimizer.variants["var_x"].deployments == 3
        assert optimizer.variants["var_x"].conversions == 3
        assert optimizer.variants["var_x"].conversion_rate == 1.0

    def test_test_results_and_recommendation(self):
        """Test getting test results and winner recommendation."""
        optimizer = TalkTrackOptimizer(min_deployments_for_winner=5)

        variants = [
            TalkTrackVariant(
                variant_id="winner",
                talk_track_type=TalkTrackType.VALUE_PROP,
                content="Value Prop - winning",
            ),
            TalkTrackVariant(
                variant_id="challenger",
                talk_track_type=TalkTrackType.VALUE_PROP,
                content="Value Prop - challenger",
            ),
            TalkTrackVariant(
                variant_id="control",
                talk_track_type=TalkTrackType.VALUE_PROP,
                content="Value Prop - control",
            ),
        ]

        optimizer.create_test(
            test_id="test_vp",
            talk_track_type=TalkTrackType.VALUE_PROP,
            variants=variants,
        )

        # Winner gets more conversions
        for i in range(10):
            optimizer.log_deployment_result(
                test_id="test_vp",
                variant_id="winner",
                converted=i < 8,
            )

        for i in range(8):
            optimizer.log_deployment_result(
                test_id="test_vp",
                variant_id="challenger",
                converted=i < 4,
            )

        for i in range(5):
            optimizer.log_deployment_result(
                test_id="test_vp",
                variant_id="control",
                converted=i < 2,
            )

        results = optimizer.get_test_results("test_vp")
        assert results.winning_variant_id == "winner"


class TestCompetitiveDetector:
    """Tests for Competitive Switch Detector."""

    def test_detect_competitor_mention(self):
        """Test detecting explicit competitor mentions."""
        detector = CompetitiveDetector()

        signal = detector.detect_signal(
            prospect_id="prospect_001",
            deal_id="deal_001",
            conversation_text="We're evaluating Gong as an alternative to your solution",
            context_before="discussing features",
        )

        assert signal is not None
        assert signal.competitor_name == "gong"
        assert signal.confidence > 0.8

    def test_detect_feature_comparison(self):
        """Test detecting feature comparison signals."""
        detector = CompetitiveDetector()

        signal = detector.detect_signal(
            prospect_id="prospect_001",
            deal_id="deal_001",
            conversation_text="How does it compare to Salesforce in terms of reporting?",
            context_before="",
        )

        assert signal is not None
        # Can be either feature_comparison or competitor_mention since both are detected
        assert signal.signal_type in ["feature_comparison", "competitor_mention"]

    def test_deal_risk_analysis(self):
        """Test analyzing deal risk from multiple signals."""
        detector = CompetitiveDetector()

        # Log multiple signals
        for i in range(3):
            detector.detect_signal(
                prospect_id="prospect_001",
                deal_id="deal_001",
                conversation_text=f"We're also looking at Salesforce alternatives ({i})",
                context_before="",
            )

        risk_analysis = detector.analyze_deal_risk("deal_001")

        assert risk_analysis["deal_id"] == "deal_001"
        assert risk_analysis["signals_count"] == 3
        assert "recommended_actions" in risk_analysis

    def test_signal_outcome_logging(self):
        """Test logging outcomes of competitive signals."""
        detector = CompetitiveDetector()

        signal = detector.detect_signal(
            prospect_id="prospect_001",
            deal_id="deal_001",
            conversation_text="We're considering Gong for this project",
            context_before="",
        )

        detector.log_signal_outcome(
            signal_id=signal.signal_id,
            addressed=True,
            outcome="recovered",
            response_action="Demonstrated unique ROI analysis capability",
        )

        assert detector.signals[signal.signal_id].addressed is True
        assert detector.signals[signal.signal_id].outcome == "recovered"

    def test_competitive_threats_list(self):
        """Test getting list of competitive threats."""
        detector = CompetitiveDetector()

        # Create unaddressed signals
        for i in range(3):
            detector.detect_signal(
                prospect_id=f"prospect_{i}",
                deal_id=f"deal_{i}",
                conversation_text="We're evaluating Gong",
                context_before="",
            )

        threats = detector.get_competitive_threats(limit=5)
        assert len(threats) <= 5
        assert all("signal_id" in t for t in threats)

    def test_competitor_analysis(self):
        """Test analyzing competitive pressure by competitor."""
        detector = CompetitiveDetector()

        # Detect multiple competitor signals
        for i in range(5):
            detector.detect_signal(
                prospect_id=f"prospect_{i}",
                deal_id=f"deal_{i}",
                conversation_text="We're also looking at Salesforce",
                context_before="",
            )

        analysis = detector.get_competitor_analysis()
        assert "salesforce" in analysis
        assert analysis["salesforce"]["mentions"] >= 5


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
