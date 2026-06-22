"""
MAB Integration - Wires Thompson Sampling into the call flow

This module integrates the Multi-Armed Bandits engine with the main call system:
1. Injects the selected opening argument into the agent prompt
2. Tracks which argument was used in each call
3. Records outcomes when call completes
4. Generates weekly reports

Flow:
  voice_webhook → select_argument_for_call()
  media_stream → track_call_with_argument()
  post_call → record_call_outcome()
"""

from __future__ import annotations

import logging
from typing import Optional, Dict, Tuple
from datetime import datetime
from pathlib import Path

from app.mab_argument_engine import MultiArmedBanditsEngine

logger = logging.getLogger(__name__)

# Global MAB instance
_mab_engine: Optional[MultiArmedBanditsEngine] = None


def initialize_mab(persistence_path: Optional[str] = None) -> MultiArmedBanditsEngine:
    """Initialize the MAB engine with default arguments"""
    global _mab_engine

    if _mab_engine:
        logger.warning("MAB engine already initialized")
        return _mab_engine

    # Create engine
    path = Path(persistence_path) if persistence_path else Path("./mab_state.json")
    _mab_engine = MultiArmedBanditsEngine(persistence_path=path)

    # Register default opening arguments (discovery questions)
    default_arguments = [
        {
            'arm_id': 'arg_001',
            'argument': 'Tell me about your current sales process - how do you typically manage leads today?',
            'category': 'discovery',
            'metadata': {'focus': 'understand_status_quo', 'style': 'open_ended'}
        },
        {
            'arm_id': 'arg_002',
            'argument': 'What are your biggest pain points with managing sales calls right now?',
            'category': 'discovery',
            'metadata': {'focus': 'pain_point_discovery', 'style': 'problem_focused'}
        },
        {
            'arm_id': 'arg_003',
            'argument': 'How much time do you spend on manual call follow-ups per week?',
            'category': 'discovery',
            'metadata': {'focus': 'time_quantification', 'style': 'specific'}
        },
        {
            'arm_id': 'arg_004',
            'argument': 'What would be the biggest benefit if you could automate your call process?',
            'category': 'value_prop',
            'metadata': {'focus': 'envision_future', 'style': 'aspirational'}
        },
        {
            'arm_id': 'arg_005',
            'argument': 'Are you currently using any tools to record and analyze your sales conversations?',
            'category': 'discovery',
            'metadata': {'focus': 'competitive_context', 'style': 'qualification'}
        },
        {
            'arm_id': 'arg_006',
            'argument': 'Tell me about the last sales call you had - what went well, what didn\'t?',
            'category': 'discovery',
            'metadata': {'focus': 'recent_experience', 'style': 'narrative'}
        },
        {
            'arm_id': 'arg_007',
            'argument': 'How do you measure success for your sales team right now?',
            'category': 'discovery',
            'metadata': {'focus': 'success_definition', 'style': 'metric_focused'}
        },
        {
            'arm_id': 'arg_008',
            'argument': 'What\'s preventing you from closing more deals today?',
            'category': 'discovery',
            'metadata': {'focus': 'obstacle_identification', 'style': 'direct'}
        },
    ]

    registered = _mab_engine.register_arguments(default_arguments)
    logger.info(f"Initialized MAB engine with {len(registered)} arguments")

    return _mab_engine


def get_mab_engine() -> MultiArmedBanditsEngine:
    """Get the global MAB engine instance"""
    global _mab_engine
    if not _mab_engine:
        _mab_engine = initialize_mab()
    return _mab_engine


async def select_opening_argument(call_context: Dict) -> Tuple[str, str, str]:
    """
    Select the opening argument for this call using Thompson Sampling.

    Integrates with voice_webhook to inject the best-performing discovery question.

    Args:
        call_context: Dict with call metadata (phone, lead_id, call_id, etc)

    Returns:
        Tuple of (arm_id, argument_text, prompt_injection)
    """
    mab = get_mab_engine()

    try:
        arm_id, argument = mab.select_argument_for_call(call_context)

        # Create prompt injection text to tell the agent which argument to use
        prompt_injection = f"""
[OPENING_ARGUMENT_FROM_MAB]
Use this discovery question to open the call:
"{argument}"

This argument has been selected by our Thompson Sampling algorithm based on historical close rates.
Adapt it naturally to the conversation, but start with this general direction.
[/OPENING_ARGUMENT_FROM_MAB]
"""

        logger.info(
            f"Selected argument {arm_id} for call {call_context.get('call_id')}: "
            f"{argument[:60]}..."
        )

        return arm_id, argument, prompt_injection

    except Exception as e:
        logger.error(f"Error selecting opening argument: {e}")
        # Fallback to random argument if MAB fails
        mab = get_mab_engine()
        arm_id, argument = mab.select_argument_for_call(call_context)
        return arm_id, argument, ""


async def track_argument_in_call(call_id: str,
                                call_sid: str,
                                arm_id: str,
                                phone: str,
                                metadata: Optional[Dict] = None):
    """
    Called when call starts - records that we're using this argument.

    Args:
        call_id: Our internal call ID
        call_sid: Twilio call SID
        arm_id: Which argument (arm) is being tested
        phone: Prospect phone number
        metadata: Extra context
    """
    mab = get_mab_engine()

    try:
        # For tracking purposes - could log to call context
        context = {
            'call_id': call_id,
            'call_sid': call_sid,
            'phone': phone,
            'timestamp': datetime.now().isoformat(),
            **(metadata or {})
        }

        logger.info(
            f"Tracking argument {arm_id} for call {call_id} (SID: {call_sid})"
        )

        return arm_id

    except Exception as e:
        logger.error(f"Error tracking argument in call: {e}")
        raise


async def record_call_result(call_id: str,
                            arm_id: str,
                            outcome: str,
                            duration_seconds: Optional[int] = None,
                            prospect_response: Optional[str] = None,
                            metadata: Optional[Dict] = None):
    """
    Called when call completes - updates MAB with outcome.

    Args:
        call_id: Call identifier
        arm_id: Which argument was used
        outcome: "close" or "no_close"
        duration_seconds: Call duration
        prospect_response: What prospect said about the argument/call
        metadata: Extra context (sentiment, transcript excerpt, etc)
    """
    mab = get_mab_engine()

    try:
        mab.record_call_outcome(
            call_id=call_id,
            arm_id=arm_id,
            outcome=outcome,
            duration_seconds=duration_seconds,
            prospect_response=prospect_response,
            metadata=metadata
        )

        # Log the update
        arm = mab.arms[arm_id]
        logger.info(
            f"Recorded {outcome} for call {call_id} using {arm_id}. "
            f"New close rate: {arm.close_rate():.1%} ({arm.total_closes}/{arm.total_uses})"
        )

    except Exception as e:
        logger.error(f"Error recording call result: {e}")
        raise


async def get_weekly_report() -> Dict:
    """
    Generate weekly performance report.

    Returns:
        Dict with:
        - best_argument: str
        - best_argument_close_rate: float
        - overall_close_rate: float
        - total_calls: int
        - learnings: List[str]
        - recommendations: List[str]
    """
    mab = get_mab_engine()

    try:
        report = mab.get_weekly_report()

        return {
            'week_ending': report.week_ending.isoformat(),
            'period_days': report.period_days,
            'total_calls': report.total_calls,
            'total_closes': report.total_closes,
            'overall_close_rate': f"{report.overall_close_rate:.1%}",
            'best_argument': (
                report.best_argument.argument if report.best_argument
                else "No data yet"
            ),
            'best_argument_close_rate': f"{report.best_argument_close_rate:.1%}",
            'best_arm_id': (
                report.best_argument.arm_id if report.best_argument
                else None
            ),
            'learnings': report.learnings,
            'recommendations': report.recommendations,
            'all_arguments': mab.get_arm_stats(),
        }

    except Exception as e:
        logger.error(f"Error generating weekly report: {e}")
        raise


async def get_argument_stats(arm_id: Optional[str] = None) -> Dict:
    """Get detailed stats for argument(s)"""
    mab = get_mab_engine()
    return mab.get_arm_stats(arm_id)


async def export_mab_state() -> Dict:
    """Export current MAB state for analysis/backup"""
    mab = get_mab_engine()
    return mab.export_state()


def inject_mab_into_master_prompt(base_prompt: str, arm_id: str, argument: str) -> str:
    """
    Inject the selected argument into the master sales prompt.

    This modifies the system prompt that guides the agent to use the specific
    discovery question selected by Thompson Sampling.

    Args:
        base_prompt: The original master prompt
        arm_id: Selected arm ID
        argument: The argument text

    Returns:
        Modified prompt with MAB injection
    """
    injection = f"""
[MULTIAGENT_BANDIT_OPENING]
ARM_ID: {arm_id}
OPENING_DISCOVERY_QUESTION:
"{argument}"

This discovery question has been statistically optimized by Thompson Sampling
based on {len(get_mab_engine().call_history)} sales calls.

Instructions:
1. Use this question to open the call naturally
2. Adapt it to flow naturally, but keep the core idea
3. After this, proceed with normal discovery flow
[/MULTIAGENT_BANDIT_OPENING]

"""

    # Insert after system role definition
    lines = base_prompt.split('\n')
    insertion_point = 0

    for i, line in enumerate(lines):
        if 'You are' in line or 'Your role' in line:
            # Find the end of the role definition (look for a blank line or next section)
            for j in range(i, len(lines)):
                if lines[j].strip() == '' or lines[j].startswith('#'):
                    insertion_point = j
                    break
            break

    if insertion_point > 0:
        return '\n'.join(lines[:insertion_point]) + injection + '\n'.join(lines[insertion_point:])
    else:
        # Fallback: prepend to prompt
        return injection + base_prompt
