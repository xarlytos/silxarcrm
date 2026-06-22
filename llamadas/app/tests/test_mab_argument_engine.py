"""
Unit tests for Multi-Armed Bandits Argument Engine

Tests Thompson Sampling implementation for opening argument optimization.
"""

import pytest
from datetime import datetime, timedelta
from pathlib import Path
import tempfile
import json

from app.mab_argument_engine import (
    BayesianArm,
    CallArgument,
    MultiArmedBanditsEngine,
    WeeklyArgumentReport,
)


class TestBayesianArm:
    """Test individual Bayesian arm (argument)"""

    def test_create_arm(self):
        """Test creating a Bayesian arm"""
        arm = BayesianArm(
            arm_id="arg_001",
            argument="Tell me about your current sales process?",
            category="discovery"
        )

        assert arm.arm_id == "arg_001"
        assert arm.alpha == 1.0
        assert arm.beta == 1.0
        assert arm.total_uses == 0
        assert arm.total_closes == 0
        assert arm.close_rate() == 0.0

    def test_arm_validation(self):
        """Test that short arguments are rejected"""
        with pytest.raises(ValueError):
            BayesianArm(
                arm_id="bad",
                argument="Too short",
                category="discovery"
            )

    def test_arm_thompson_sampling(self):
        """Test Thompson sampling draws from Beta distribution"""
        arm = BayesianArm(
            arm_id="test",
            argument="This is a valid discovery question for testing",
            category="discovery"
        )

        # Draw multiple samples and check they're in [0, 1]
        samples = [arm.thompson_sample() for _ in range(100)]
        assert all(0 <= s <= 1 for s in samples)
        assert 0.3 < sum(samples) / len(samples) < 0.7  # Mean should be ~0.5

    def test_arm_success_update(self):
        """Test recording a successful close"""
        arm = BayesianArm(
            arm_id="test",
            argument="This is a valid discovery question",
            category="discovery"
        )

        arm.update_success()
        assert arm.total_uses == 1
        assert arm.total_closes == 1
        assert arm.close_rate() == 1.0
        assert arm.alpha == 2.0
        assert arm.beta == 1.0

    def test_arm_failure_update(self):
        """Test recording a failed close"""
        arm = BayesianArm(
            arm_id="test",
            argument="This is a valid discovery question",
            category="discovery"
        )

        arm.update_failure()
        assert arm.total_uses == 1
        assert arm.total_closes == 0
        assert arm.close_rate() == 0.0
        assert arm.alpha == 1.0
        assert arm.beta == 2.0

    def test_arm_confidence_interval(self):
        """Test confidence interval calculation"""
        arm = BayesianArm(
            arm_id="test",
            argument="This is a valid discovery question",
            category="discovery"
        )

        # Add some data
        for _ in range(10):
            arm.update_success()
        for _ in range(5):
            arm.update_failure()

        ci_lower, ci_upper = arm.confidence_interval()
        assert 0 <= ci_lower <= ci_upper <= 1
        assert ci_lower < arm.close_rate() < ci_upper

    def test_arm_close_rate_calculation(self):
        """Test close rate calculation"""
        arm = BayesianArm(
            arm_id="test",
            argument="This is a valid discovery question",
            category="discovery"
        )

        # 3 successes, 2 failures = 60% close rate
        for _ in range(3):
            arm.update_success()
        for _ in range(2):
            arm.update_failure()

        assert arm.close_rate() == 0.6


class TestMultiArmedBanditsEngine:
    """Test the main MAB engine"""

    @pytest.fixture
    def mab_engine(self):
        """Create a temporary MAB engine for testing"""
        with tempfile.TemporaryDirectory() as tmpdir:
            yield MultiArmedBanditsEngine(
                persistence_path=Path(tmpdir) / "mab_test.json"
            )

    def test_engine_initialization(self, mab_engine):
        """Test MAB engine initialization"""
        assert len(mab_engine.arms) == 0
        assert len(mab_engine.call_history) == 0

    def test_register_arguments(self, mab_engine):
        """Test registering arguments"""
        arguments = [
            {
                'arm_id': 'arg_001',
                'argument': 'Tell me about your current sales process?',
                'category': 'discovery'
            },
            {
                'arm_id': 'arg_002',
                'argument': 'What are your biggest pain points right now?',
                'category': 'discovery'
            }
        ]

        registered = mab_engine.register_arguments(arguments)
        assert len(registered) == 2
        assert 'arg_001' in mab_engine.arms
        assert 'arg_002' in mab_engine.arms

    def test_select_argument_for_call(self, mab_engine):
        """Test argument selection using Thompson Sampling"""
        arguments = [
            {
                'arm_id': f'arg_{i:03d}',
                'argument': f'This is discovery question number {i} for testing purposes',
                'category': 'discovery'
            }
            for i in range(5)
        ]

        mab_engine.register_arguments(arguments)

        # Select an argument
        call_context = {'call_id': 'call_123', 'phone': '+1234567890'}
        selected_arm_id, argument = mab_engine.select_argument_for_call(call_context)

        assert selected_arm_id in mab_engine.arms
        assert isinstance(argument, str)
        assert len(argument) > 0

    def test_record_call_outcome_success(self, mab_engine):
        """Test recording a successful call"""
        arguments = [{
            'arm_id': 'arg_001',
            'argument': 'Tell me about your current sales process?',
            'category': 'discovery'
        }]

        mab_engine.register_arguments(arguments)

        mab_engine.record_call_outcome(
            call_id='call_001',
            arm_id='arg_001',
            outcome='close'
        )

        assert len(mab_engine.call_history) == 1
        assert mab_engine.call_history[0].outcome == 'close'
        assert mab_engine.arms['arg_001'].total_closes == 1

    def test_record_call_outcome_failure(self, mab_engine):
        """Test recording a failed call"""
        arguments = [{
            'arm_id': 'arg_001',
            'argument': 'Tell me about your current sales process?',
            'category': 'discovery'
        }]

        mab_engine.register_arguments(arguments)

        mab_engine.record_call_outcome(
            call_id='call_001',
            arm_id='arg_001',
            outcome='no_close'
        )

        assert mab_engine.arms['arg_001'].total_closes == 0
        assert mab_engine.arms['arg_001'].total_uses == 1

    def test_thompson_sampling_convergence(self, mab_engine):
        """Test that Thompson Sampling gradually favors winning arguments"""
        # Register 2 arguments
        arguments = [
            {
                'arm_id': 'winner',
                'argument': 'This is the winning discovery question for testing',
                'category': 'discovery'
            },
            {
                'arm_id': 'loser',
                'argument': 'This is the losing discovery question for testing',
                'category': 'discovery'
            }
        ]

        mab_engine.register_arguments(arguments)

        # Simulate calls: winner has 80% close rate, loser has 20%
        for i in range(100):
            # Winner gets most closes
            if i % 5 < 4:  # 80% success
                mab_engine.record_call_outcome(
                    call_id=f'call_winner_{i}',
                    arm_id='winner',
                    outcome='close'
                )
            else:
                mab_engine.record_call_outcome(
                    call_id=f'call_winner_fail_{i}',
                    arm_id='winner',
                    outcome='no_close'
                )

        for i in range(50):
            # Loser has fewer closes
            if i % 5 < 1:  # 20% success
                mab_engine.record_call_outcome(
                    call_id=f'call_loser_{i}',
                    arm_id='loser',
                    outcome='close'
                )
            else:
                mab_engine.record_call_outcome(
                    call_id=f'call_loser_fail_{i}',
                    arm_id='loser',
                    outcome='no_close'
                )

        # Winner should have higher close rate
        winner_rate = mab_engine.arms['winner'].close_rate()
        loser_rate = mab_engine.arms['loser'].close_rate()

        assert winner_rate > loser_rate
        assert winner_rate > 0.7
        assert loser_rate < 0.3

    def test_get_weekly_report(self, mab_engine):
        """Test generating weekly report"""
        arguments = [
            {
                'arm_id': 'arg_001',
                'argument': 'This is the first discovery question for testing',
                'category': 'discovery'
            },
            {
                'arm_id': 'arg_002',
                'argument': 'This is the second discovery question for testing',
                'category': 'discovery'
            }
        ]

        mab_engine.register_arguments(arguments)

        # Simulate some calls
        for i in range(10):
            mab_engine.record_call_outcome(
                call_id=f'call_{i}',
                arm_id='arg_001' if i % 2 == 0 else 'arg_002',
                outcome='close' if i % 3 == 0 else 'no_close'
            )

        report = mab_engine.get_weekly_report()

        assert report.total_calls == 10
        assert report.overall_close_rate > 0
        assert report.best_argument is not None
        assert len(report.learnings) > 0

    def test_get_arm_stats(self, mab_engine):
        """Test getting arm statistics"""
        arguments = [{
            'arm_id': 'arg_001',
            'argument': 'Tell me about your current sales process?',
            'category': 'discovery'
        }]

        mab_engine.register_arguments(arguments)

        stats = mab_engine.get_arm_stats()

        assert 'arg_001' in stats
        assert 'argument' in stats['arg_001']
        assert 'close_rate' in stats['arg_001']
        assert 'alpha' in stats['arg_001']
        assert 'beta' in stats['arg_001']

    def test_persistence(self):
        """Test that MAB state persists to disk"""
        with tempfile.TemporaryDirectory() as tmpdir:
            path = Path(tmpdir) / "mab_persist.json"

            # Create engine and add data
            engine1 = MultiArmedBanditsEngine(persistence_path=path)
            arguments = [{
                'arm_id': 'arg_001',
                'argument': 'This is a test discovery question',
                'category': 'discovery'
            }]
            engine1.register_arguments(arguments)
            engine1.record_call_outcome('call_001', 'arg_001', 'close')

            # Create new engine and verify it loaded state
            engine2 = MultiArmedBanditsEngine(persistence_path=path)
            assert len(engine2.arms) == 1
            assert engine2.arms['arg_001'].total_uses == 1

    def test_export_state(self, mab_engine):
        """Test exporting MAB state"""
        arguments = [{
            'arm_id': 'arg_001',
            'argument': 'This is a test discovery question',
            'category': 'discovery'
        }]

        mab_engine.register_arguments(arguments)
        state = mab_engine.export_state()

        assert 'arms' in state
        assert 'summary_stats' in state
        assert 'timestamp' in state
        assert state['summary_stats']['num_arms'] == 1


class TestCallArgument:
    """Test call-argument association tracking"""

    def test_create_call_argument(self):
        """Test creating a call argument record"""
        call_arg = CallArgument(
            call_id='call_123',
            arm_id='arg_001',
            argument='Test discovery question',
            outcome='close'
        )

        assert call_arg.call_id == 'call_123'
        assert call_arg.arm_id == 'arg_001'
        assert call_arg.outcome == 'close'


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
