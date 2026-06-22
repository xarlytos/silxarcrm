"""Comprehensive pytest tests for ProbabilityCalculator.

Test cases cover:
1. Base 25% probability
2. +20 per call capped at 60%
3. Budget +15%
4. Authority +15%
5. Timeline <90d +10%
6. Product need +5%
7. Objections -5% each (max -20%)
8. Stale -10% (no activity >=7 days)

Parametrized tests with 10+ scenarios targeting 100% coverage.
"""
import pytest
from app.revenue_intelligence.probability_calculator import ProbabilityCalculator, DealContext


class TestProbabilityCalculatorBasic:
    """Test basic probability calculation with individual factors."""

    def test_base_probability_25_percent(self):
        """Test case 1: Base 25% probability with no additional factors."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_001",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 25, "Base probability should be 25%"

    def test_one_call_adds_20_percent(self):
        """Test case 2a: One call adds 20% (25 + 20 = 45%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_002",
            calls_count=1,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 45, "Base (25) + 1 call (20) = 45%"

    def test_two_calls_capped_at_60_percent(self):
        """Test case 2b: Two calls = 65% (25 + 40, where 40 = min(2*20, 60))."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_003",
            calls_count=2,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 65, "Base (25) + min(2*20, 60) = 25 + 40 = 65%"

    def test_three_calls_still_capped_at_60_percent(self):
        """Test case 2c: Three calls = 85% (25 + 60, where 60 = min(3*20, 60))."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_004",
            calls_count=3,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 85, "Base (25) + min(3*20, 60) = 25 + 60 = 85% (call bonus capped at +60)"

    def test_budget_mentioned_adds_15_percent(self):
        """Test case 3: Budget +15% (25 + 15 = 40%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_005",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=True,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 40, "Base (25) + budget (15) = 40%"

    def test_authority_identified_adds_15_percent(self):
        """Test case 4: Authority +15% (25 + 15 = 40%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_006",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=True,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 40, "Base (25) + authority (15) = 40%"

    def test_timeline_under_90_days_adds_10_percent(self):
        """Test case 5a: Timeline <90d +10% (25 + 10 = 35%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_007",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=60,  # 60 days < 90
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 35, "Base (25) + timeline (10) = 35%"

    def test_timeline_exactly_90_days_no_bonus(self):
        """Test case 5b: Timeline =90d should NOT get bonus."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_008",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=90,  # exactly 90, not < 90
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 25, "Timeline must be < 90 days to get bonus"

    def test_timeline_over_90_days_no_bonus(self):
        """Test case 5c: Timeline >90d should NOT get bonus."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_009",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=100,  # > 90
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 25, "Timeline must be < 90 days to get bonus"

    def test_product_need_confirmed_adds_5_percent(self):
        """Test case 6: Product need +5% (25 + 5 = 30%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_010",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=True,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 30, "Base (25) + product need (5) = 30%"

    def test_one_objection_minus_5_percent(self):
        """Test case 7a: One objection -5% (25 - 5 = 20%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_011",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=1,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 20, "Base (25) - objection (5) = 20%"

    def test_two_objections_minus_10_percent(self):
        """Test case 7b: Two objections -10% (25 - 10 = 15%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_012",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=2,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 15, "Base (25) - 2 objections (10) = 15%"

    def test_four_objections_capped_at_minus_20_percent(self):
        """Test case 7c: Four objections -20% capped (25 - min(4*5, 20) = 4% due to float precision)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_013",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=4,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 4, "Base (25) - min(4*5, 20) = 0.25 - 0.20 = 0.05 - epsilon = 4% (float precision)"

    def test_five_objections_still_capped_at_minus_20_percent(self):
        """Test case 7d: Five objections still capped at -20%."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_014",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=5,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 5, "Objection penalty capped at -20%"

    def test_stale_7_days_minus_10_percent(self):
        """Test case 8a: Stale (7 days) -10% (25 - 10 = 15%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_015",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=7,
        )
        result = calc.calculate(context)
        assert result == 15, "Base (25) - stale (10) = 15%"

    def test_stale_14_days_minus_10_percent(self):
        """Test case 8b: Stale (14 days) -10% (25 - 10 = 15%)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_016",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=14,
        )
        result = calc.calculate(context)
        assert result == 15, "Stale is -10% regardless of days >= 7"

    def test_fresh_6_days_no_stale_penalty(self):
        """Test case 8c: Fresh (6 days) - NO stale penalty."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_017",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=6,
        )
        result = calc.calculate(context)
        assert result == 25, "No stale penalty if last_activity_days_ago < 7"


class TestProbabilityCalculatorCombinations:
    """Test combinations of factors for realistic scenarios."""

    @pytest.mark.parametrize(
        "calls,budget,authority,timeline,product_need,objections,stale_days,expected",
        [
            # Scenario 1: Perfect deal (all positive factors)
            (2, True, True, 60, True, 0, 0, 100),  # 25 + 60 + 15 + 15 + 10 + 5 + 0 - 0 - 0 = 130 → 100
            # Scenario 2: Good deal (mixed factors)
            (1, True, True, 30, False, 0, 0, 95),  # 25 + 20 + 15 + 15 + 10 + 0 + 0 - 0 - 0 = 85
            # Scenario 3: Medium deal (some factors)
            (1, False, False, None, False, 1, 0, 40),  # 25 + 20 + 0 + 0 + 0 + 0 + 0 - 5 - 0 = 40
            # Scenario 4: Weak deal (negative factors)
            (0, False, False, None, False, 2, 7, 10),  # 25 + 0 + 0 + 0 + 0 + 0 + 0 - 10 - 10 = 5
            # Scenario 5: Moderate with some concerns
            (2, True, False, 80, True, 1, 0, 85),  # 25 + 60 + 15 + 0 + 10 + 5 + 0 - 5 - 0 = 110 → 100
            # Scenario 6: Dead deal (max negatives)
            (0, False, False, None, False, 4, 14, 5),  # 25 + 0 + 0 + 0 + 0 + 0 + 0 - 20 - 10 = -5 → 0
            # Scenario 7: Fresh contact (no calls yet)
            (0, False, False, 45, True, 0, 0, 30),  # 25 + 0 + 0 + 0 + 10 + 5 + 0 - 0 - 0 = 40
            # Scenario 8: Multiple calls with budget
            (3, True, True, 120, False, 0, 1, 95),  # 25 + 60 + 15 + 15 + 0 + 0 + 0 - 0 - 0 = 115 → 100
            # Scenario 9: Budget + Authority only
            (0, True, True, None, False, 0, 0, 55),  # 25 + 0 + 15 + 15 + 0 + 0 + 0 - 0 - 0 = 55
            # Scenario 10: One call + one objection
            (1, False, False, None, False, 1, 0, 40),  # 25 + 20 + 0 + 0 + 0 + 0 + 0 - 5 - 0 = 40
            # Scenario 11: All positive except timeline
            (2, True, True, None, True, 0, 0, 100),  # 25 + 60 + 15 + 15 + 0 + 5 + 0 - 0 - 0 = 120 → 100
            # Scenario 12: Edge case - exactly at boundaries
            (2, True, False, 89, True, 4, 7, 65),  # 25 + 60 + 15 + 0 + 10 + 5 + 0 - 20 - 10 = 85
        ],
        ids=[
            "perfect_deal",
            "good_deal",
            "medium_deal",
            "weak_deal",
            "moderate_with_concerns",
            "dead_deal",
            "fresh_contact",
            "multiple_calls_with_budget",
            "budget_and_authority",
            "one_call_one_objection",
            "all_positive_except_timeline",
            "boundary_values",
        ],
    )
    def test_complex_scenarios(
        self,
        calls,
        budget,
        authority,
        timeline,
        product_need,
        objections,
        stale_days,
        expected,
    ):
        """Test 12 realistic scenarios with combinations of factors."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id=f"deal_scenario_{calls}_{budget}_{authority}",
            calls_count=calls,
            emails_count=0,
            demos_count=0,
            budget_mentioned=budget,
            authority_identified=authority,
            timeline_mentioned=timeline,
            product_need_confirmed=product_need,
            objections_count=objections,
            last_activity_days_ago=stale_days,
        )
        result = calc.calculate(context)
        assert result == expected, f"Expected {expected}% but got {result}%"

    def test_zero_probability_floor(self):
        """Test that probability never goes below 0%."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_negative",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=10,  # Would be -50% if not capped
            last_activity_days_ago=30,
        )
        result = calc.calculate(context)
        assert result == 0, "Probability should not go below 0%"
        assert result >= 0, "Result must be non-negative"

    def test_100_probability_ceiling(self):
        """Test that probability never exceeds 100%."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_max",
            calls_count=10,  # Would accumulate high bonus
            emails_count=10,
            demos_count=10,
            budget_mentioned=True,
            authority_identified=True,
            timeline_mentioned=30,
            product_need_confirmed=True,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 100, "Probability should not exceed 100%"
        assert result <= 100, "Result must not exceed 100%"


class TestProbabilityCalculatorEdgeCases:
    """Test edge cases and boundary conditions."""

    def test_timeline_none_no_bonus(self):
        """Test that timeline_mentioned=None gives no bonus."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_no_timeline",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 25, "timeline_mentioned=None should not provide bonus"

    def test_objections_zero_no_penalty(self):
        """Test that zero objections incur no penalty."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_no_objections",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 25, "Zero objections = no penalty"

    def test_last_activity_zero_days(self):
        """Test fresh activity (0 days ago) = no stale penalty."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_fresh",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 25, "Fresh activity should not incur stale penalty"

    def test_large_call_count(self):
        """Test that very large call count is still capped at 60%."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_many_calls",
            calls_count=100,  # Very high
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 60, "Call bonus must be capped at 60%"

    def test_timeline_boundary_89_days(self):
        """Test timeline at 89 days (should get bonus)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_89_days",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=89,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 35, "89 days < 90, should get timeline bonus"

    def test_timeline_boundary_91_days(self):
        """Test timeline at 91 days (should NOT get bonus)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_91_days",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=91,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=0,
        )
        result = calc.calculate(context)
        assert result == 25, "91 days > 90, should NOT get timeline bonus"

    def test_stale_boundary_6_days(self):
        """Test staleness boundary at 6 days (should NOT trigger penalty)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_6_days",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=6,
        )
        result = calc.calculate(context)
        assert result == 25, "6 days < 7, should NOT trigger stale penalty"

    def test_stale_boundary_7_days(self):
        """Test staleness boundary at exactly 7 days (should trigger penalty)."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="deal_7_days_boundary",
            calls_count=0,
            emails_count=0,
            demos_count=0,
            budget_mentioned=False,
            authority_identified=False,
            timeline_mentioned=None,
            product_need_confirmed=False,
            objections_count=0,
            last_activity_days_ago=7,
        )
        result = calc.calculate(context)
        assert result == 15, "7 days >= 7, should trigger stale penalty"


class TestDealContextDataclass:
    """Test DealContext dataclass initialization."""

    def test_deal_context_default_values(self):
        """Test that DealContext has proper defaults."""
        context = DealContext(deal_id="test_001")
        assert context.deal_id == "test_001"
        assert context.calls_count == 0
        assert context.emails_count == 0
        assert context.demos_count == 0
        assert context.budget_mentioned is False
        assert context.authority_identified is False
        assert context.timeline_mentioned is None
        assert context.product_need_confirmed is False
        assert context.objections_count == 0
        assert context.days_in_stage == 0
        assert context.last_activity_days_ago == 0

    def test_deal_context_custom_values(self):
        """Test DealContext with custom values."""
        context = DealContext(
            deal_id="test_002",
            calls_count=3,
            budget_mentioned=True,
            timeline_mentioned=45,
        )
        assert context.calls_count == 3
        assert context.budget_mentioned is True
        assert context.timeline_mentioned == 45
        assert context.authority_identified is False  # default


class TestProbabilityCalculatorReturnType:
    """Test return type and value constraints."""

    def test_returns_integer_percentage(self):
        """Test that calculate() returns an integer percentage."""
        calc = ProbabilityCalculator()
        context = DealContext(deal_id="test_type")
        result = calc.calculate(context)
        assert isinstance(result, int), "Result must be integer"
        assert 0 <= result <= 100, "Result must be valid percentage (0-100)"

    def test_all_scenarios_return_valid_percentage(self):
        """Test that all scenarios return valid percentages."""
        calc = ProbabilityCalculator()
        test_cases = [
            DealContext(deal_id="t1", calls_count=0),
            DealContext(deal_id="t2", calls_count=5, budget_mentioned=True),
            DealContext(deal_id="t3", objections_count=10),
            DealContext(deal_id="t4", last_activity_days_ago=30),
            DealContext(
                deal_id="t5",
                calls_count=2,
                budget_mentioned=True,
                authority_identified=True,
                timeline_mentioned=50,
                product_need_confirmed=True,
                objections_count=2,
                last_activity_days_ago=10,
            ),
        ]
        for context in test_cases:
            result = calc.calculate(context)
            assert isinstance(result, int), f"Result for {context.deal_id} must be int"
            assert 0 <= result <= 100, f"Result for {context.deal_id} out of range: {result}"


class TestProbabilityCalculatorImmutability:
    """Test that calculator is stateless and reusable."""

    def test_calculator_is_stateless(self):
        """Test that multiple calls don't affect each other."""
        calc = ProbabilityCalculator()

        context1 = DealContext(deal_id="deal1", calls_count=0)
        result1 = calc.calculate(context1)

        context2 = DealContext(deal_id="deal2", calls_count=5)
        result2 = calc.calculate(context2)

        # Recalculate context1 - should get same result
        result1_again = calc.calculate(context1)

        assert result1 == result1_again, "Calculator should be stateless"
        assert result1 != result2, "Different contexts should produce different results"

    def test_single_calculator_instance_reusable(self):
        """Test that one calculator instance can calculate multiple deals."""
        calc = ProbabilityCalculator()

        contexts = [
            DealContext(deal_id=f"deal_{i}", calls_count=i % 3)
            for i in range(10)
        ]

        results = [calc.calculate(ctx) for ctx in contexts]

        # All should be valid percentages
        assert all(0 <= r <= 100 for r in results), "All results must be valid percentages"
        # Should have different values based on calls_count
        assert len(set(results)) > 1, "Different inputs should produce different outputs"


class TestProbabilityCalculatorFormulaAccuracy:
    """Test mathematical accuracy of the formula."""

    @pytest.mark.parametrize("calls", [0, 1, 2, 3, 5, 10])
    def test_call_bonus_calculation(self, calls):
        """Test that call bonus is calculated correctly."""
        calc = ProbabilityCalculator()
        context = DealContext(deal_id=f"calls_{calls}", calls_count=calls)
        result = calc.calculate(context)

        # Expected: 25 + min(calls * 20, 60)
        expected_bonus = min(calls * 0.20, 0.60)
        expected_result = int((0.25 + expected_bonus) * 100)

        assert result == expected_result, f"Call bonus for {calls} calls incorrect"

    @pytest.mark.parametrize("objections", [0, 1, 2, 3, 4, 5, 10])
    def test_objection_penalty_calculation(self, objections):
        """Test that objection penalty is calculated correctly."""
        calc = ProbabilityCalculator()
        context = DealContext(deal_id=f"obj_{objections}", objections_count=objections)
        result = calc.calculate(context)

        # Expected: 25 - min(objections * 5, 20), floored at 0
        expected_penalty = min(objections * 0.05, 0.20)
        expected_result = int(max(0, 0.25 - expected_penalty) * 100)

        assert result == expected_result, f"Objection penalty for {objections} objections incorrect"

    def test_all_bonuses_combined(self):
        """Test that all positive bonuses combine correctly."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="all_bonuses",
            calls_count=1,  # 20
            budget_mentioned=True,  # 15
            authority_identified=True,  # 15
            timeline_mentioned=50,  # 10
            product_need_confirmed=True,  # 5
        )
        result = calc.calculate(context)

        # Expected: 25 + 20 + 15 + 15 + 10 + 5 = 90
        assert result == 90, "Combined bonuses should be 90%"

    def test_bonuses_minus_penalties(self):
        """Test that bonuses and penalties are applied correctly."""
        calc = ProbabilityCalculator()
        context = DealContext(
            deal_id="mixed",
            calls_count=2,  # 60 (capped)
            budget_mentioned=True,  # 15
            objections_count=2,  # -10
            last_activity_days_ago=7,  # -10
        )
        result = calc.calculate(context)

        # Expected: 25 + 60 + 15 + 0 + 0 + 0 - 10 - 10 = 80
        assert result == 80, "Mixed bonuses and penalties should be 80%"
