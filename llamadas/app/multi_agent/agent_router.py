"""Agent Router — Decision engine for multi-agent orchestration"""
from __future__ import annotations

import logging
from datetime import datetime, timedelta
from typing import Optional

from app.multi_agent.shared_memory import (
    ProspectProfile,
    SharedSalesState,
    AgentType,
    PipelineStage,
    DealStatus,
)

logger = logging.getLogger(__name__)


class AgentRouter:
    """Routes prospects to correct agent based on state machine"""

    def __init__(self, config: dict | None = None):
        self.config = config or {}

        # Thresholds
        self.sdr_min_score = 70  # Minimum qualification score
        self.interest_threshold = 6  # 0-10
        self.frustration_escalation = 8  # Escalate to human
        self.engagement_fatigue_max = 9  # Archive if this high
        self.max_interactions_per_week = 3

    async def route_agent(
        self,
        prospect: ProspectProfile,
        state: SharedSalesState,
    ) -> tuple[AgentType, str]:
        """
        Determine which agent should act next.

        Returns:
            (agent_type, reason_for_decision)
        """

        # LEVEL 1: Has this prospect been qualified by SDR?
        if not state.sdr_completed:
            logger.debug(f"Routing {prospect.prospect_id} to SDR (not yet qualified)")
            return AgentType.SDR, "First contact - needs qualification"

        # LEVEL 2: Check current deal status
        if prospect.deal_status == DealStatus.OBJECTING:
            logger.debug(f"Routing {prospect.prospect_id} to RECOVERY (active objection)")
            return AgentType.RECOVERY, "Active objection detected"

        if prospect.deal_status == DealStatus.QUALIFIED:
            logger.debug(f"Routing {prospect.prospect_id} to CLOSER (qualified)")
            return AgentType.CLOSER, "Qualified - ready for pitch"

        if prospect.deal_status in [DealStatus.PITCHING, DealStatus.NEGOTIATING]:
            logger.debug(f"Routing {prospect.prospect_id} to CLOSER (in pitch)")
            return AgentType.CLOSER, "Continue pitch/negotiation"

        if prospect.deal_status == DealStatus.DEMO_SCHEDULED:
            logger.debug(f"Routing {prospect.prospect_id} to FOLLOW_UP (demo scheduled)")
            return AgentType.FOLLOW_UP, "Demo scheduled - follow up on attendance"

        if prospect.deal_status == DealStatus.TRIAL_STARTED:
            logger.debug(f"Routing {prospect.prospect_id} to EXPANSION (trial running)")
            return AgentType.EXPANSION, "Trial active - prepare upsell"

        if prospect.deal_status == DealStatus.WAITING:
            logger.debug(f"Routing {prospect.prospect_id} to FOLLOW_UP (prospect waiting)")
            return AgentType.FOLLOW_UP, "Prospect needs nurturing"

        if prospect.deal_status == DealStatus.CLOSED_WON:
            logger.debug(f"Routing {prospect.prospect_id} to EXPANSION (closed)")
            return AgentType.EXPANSION, "Deal closed - identify expansion"

        if prospect.deal_status == DealStatus.CLOSED_LOST:
            logger.debug(f"Routing {prospect.prospect_id} to ARCHIVE (lost)")
            return AgentType.ARCHIVE, "Deal lost - archive"

        # LEVEL 3: Check qualification score
        if prospect.qualification_score < 40:
            # Low score - last chance with RECOVERY
            if prospect.qualification_score == 0:  # Not yet scored
                return AgentType.SDR, "Score not yet determined"

            recovery_attempts = len([x for x in state.handoff_history if x["from_agent"] == "RECOVERY"])
            if recovery_attempts < 2:
                logger.debug(f"Routing {prospect.prospect_id} to RECOVERY (low score, attempt {recovery_attempts + 1})")
                return AgentType.RECOVERY, f"Low qualification score ({prospect.qualification_score}) - recovery attempt"
            else:
                logger.debug(f"Routing {prospect.prospect_id} to ARCHIVE (unrecoverable)")
                return AgentType.ARCHIVE, "Low score + multiple recovery attempts failed"

        # LEVEL 4: Over-engagement protection
        if state.interactions_this_week > self.max_interactions_per_week:
            logger.debug(
                f"Routing {prospect.prospect_id} to FOLLOW_UP (over-engaged, {state.interactions_this_week} this week)"
            )
            return AgentType.FOLLOW_UP, "Over-contacted this week - schedule async follow-up"

        # LEVEL 5: Frustration escalation
        if prospect.frustration_level > self.frustration_escalation:
            logger.debug(f"Routing {prospect.prospect_id} to HUMAN (frustration {prospect.frustration_level})")
            return AgentType.HUMAN, f"High frustration ({prospect.frustration_level}/10) - needs human"

        # LEVEL 6: Engagement fatigue
        if prospect.engagement_fatigue > self.engagement_fatigue_max:
            logger.debug(f"Routing {prospect.prospect_id} to ARCHIVE (fatigue {prospect.engagement_fatigue})")
            return AgentType.ARCHIVE, f"Engagement fatigue too high ({prospect.engagement_fatigue}/10)"

        # LEVEL 7: Active objections
        if prospect.objections and prospect.emotion == "rejecting":
            if prospect.qualification_score >= self.sdr_min_score:
                logger.debug(f"Routing {prospect.prospect_id} to RECOVERY (objection + high score)")
                return AgentType.RECOVERY, f"Objection to resolve: {prospect.objections[0]}"

        # LEVEL 8: Interest level assessment
        if prospect.interest_level < 3:
            # Low interest - check if recovery possible
            if state.days_since_contact > 7:
                logger.debug(f"Routing {prospect.prospect_id} to FOLLOW_UP (low interest, long time gap)")
                return AgentType.FOLLOW_UP, "Low interest + time elapsed - attempt re-engagement"
            else:
                logger.debug(f"Routing {prospect.prospect_id} to RECOVERY (low interest)")
                return AgentType.RECOVERY, "Low interest - attempt recovery"

        # LEVEL 9: Expired follows-ups
        if (
            prospect.deal_status == DealStatus.WAITING
            and state.follow_up_scheduled
            and state.follow_up_scheduled <= datetime.now()
        ):
            logger.debug(f"Routing {prospect.prospect_id} to FOLLOW_UP (scheduled)")
            return AgentType.FOLLOW_UP, "Scheduled follow-up time reached"

        # DEFAULT: If qualified but no clear next step, try CLOSER
        if prospect.qualification_score >= self.sdr_min_score:
            logger.debug(f"Routing {prospect.prospect_id} to CLOSER (default qualified)")
            return AgentType.CLOSER, "Qualified - default to closer"

        # FALLBACK: Back to SDR if unclear
        logger.debug(f"Routing {prospect.prospect_id} to SDR (fallback)")
        return AgentType.SDR, "Unclear state - re-qualify with SDR"

    async def should_handoff(
        self,
        prospect: ProspectProfile,
        state: SharedSalesState,
        from_agent: AgentType,
    ) -> tuple[bool, Optional[AgentType], str]:
        """
        Determine if agent should hand off to next agent.

        Returns:
            (should_handoff, next_agent, reason)
        """

        # Check if current agent action is complete
        if from_agent == AgentType.SDR:
            if state.sdr_completed:
                next_agent, reason = await self.route_agent(prospect, state)
                if next_agent != AgentType.SDR:
                    return True, next_agent, reason

        elif from_agent == AgentType.CLOSER:
            # Closer completes when: closed, objection, waiting, or needs human
            if prospect.deal_status in [
                DealStatus.CLOSED_WON,
                DealStatus.OBJECTING,
                DealStatus.WAITING,
            ] or prospect.frustration_level > 7:
                next_agent, reason = await self.route_agent(prospect, state)
                if next_agent != AgentType.CLOSER:
                    return True, next_agent, reason

        elif from_agent == AgentType.RECOVERY:
            # Recovery completes when: resolved, lost, or waiting
            if prospect.deal_status in [
                DealStatus.QUALIFIED,
                DealStatus.WAITING,
                DealStatus.CLOSED_LOST,
            ]:
                next_agent, reason = await self.route_agent(prospect, state)
                if next_agent != AgentType.RECOVERY:
                    return True, next_agent, reason

        elif from_agent == AgentType.FOLLOW_UP:
            # Follow-up completes when: scheduled, renewed interest, or lost
            if (
                prospect.interest_level > 6
                or prospect.deal_status == DealStatus.CLOSED_LOST
                or prospect.engagement_fatigue > 9
            ):
                next_agent, reason = await self.route_agent(prospect, state)
                if next_agent != AgentType.FOLLOW_UP:
                    return True, next_agent, reason

        elif from_agent == AgentType.EXPANSION:
            # Expansion completes on upsell decision or churn
            if prospect.deal_status == DealStatus.CLOSED_LOST:
                return True, AgentType.RECOVERY, "Churn risk - attempt save"

        return False, None, "No handoff needed"


class ContextWindowOptimizer:
    """Optimize prompt context by agent type to stay under token limits"""

    @staticmethod
    def get_sdr_context(prospect: ProspectProfile, state: SharedSalesState) -> str:
        """
        SDR needs: basic info, source, no deep history.
        Goal: Qualify in <500ms, score in 8 minutes.
        Context budget: ~500 tokens
        """
        return f"""
=== PROSPECT PROFILE ===
Name: {prospect.name}
Title: {prospect.title}
Company: {prospect.company_name}
Size: {prospect.company_size} employees
Industry: {prospect.industry}
Location: {prospect.location}

=== CONTACT INFO ===
Email: {prospect.email}
Phone: {prospect.phone}

=== SOURCE ===
Channel: {prospect.source}
Date Added: {prospect.created_at.strftime('%Y-%m-%d')}

=== GOAL ===
Qualify this prospect using BANT framework.
Target score: 70+
Timeframe: 8 minutes max

Ready to begin qualification.
"""

    @staticmethod
    def get_closer_context(prospect: ProspectProfile, state: SharedSalesState) -> str:
        """
        CLOSER needs: full profile, SDR summary, offer recommendation.
        Goal: Close or get commitment.
        Context budget: ~1500 tokens
        """
        days_since = (datetime.now() - prospect.last_interaction).days if prospect.last_interaction else 0

        return f"""
=== PROSPECT SUMMARY ===
Name: {prospect.name} ({prospect.title})
Company: {prospect.company_name}
Industry: {prospect.industry}
Employees: {prospect.company_size}

=== QUALIFICATION SUMMARY ===
Score: {prospect.qualification_score}/100
Interest: {prospect.interest_level}/10
Authority: {'Yes' if prospect.authority else 'No (needs escalation)'}
Timeline: {prospect.timeline or 'Not determined'}

=== PAIN POINTS ===
Primary: {prospect.pain_points[0] if prospect.pain_points else 'Not identified'}
Current Solution: {prospect.current_solution or 'Unknown'}

=== BUDGET ===
Max Budget: ${prospect.budget_max if prospect.budget_max else 'Not stated'}

=== RECOMMENDED OFFER ===
{_format_offer(prospect.proposed_offer)}

=== TONE ===
Consultative, confident. You're solving their problem, not selling.
Link everything back to their pain point.

Ready to pitch and close.
"""

    @staticmethod
    def get_recovery_context(prospect: ProspectProfile, state: SharedSalesState) -> str:
        """
        RECOVERY needs: objection, history, creative solutions.
        Goal: Resolve objection or save deal.
        Context budget: ~1200 tokens
        """
        return f"""
=== PROSPECT ===
{prospect.name} @ {prospect.company_name}

=== ACTIVE OBJECTION ===
Type: {prospect.objections[0] if prospect.objections else 'Unknown'}
Emotion: {prospect.emotion}
Frustration: {prospect.frustration_level}/10

=== PREVIOUS CONTEXT ===
Pain Point: {prospect.pain_points[0] if prospect.pain_points else 'Unknown'}
Previous Offer: {_format_offer(prospect.proposed_offer)}
Interest Level: {prospect.interest_level}/10

=== YOUR MISSION ===
Find root cause of objection.
Offer creative alternative solution.
Goal: Save this deal or move to follow-up.

Remember: Objections = Opportunities to understand needs better.
"""

    @staticmethod
    def get_followup_context(prospect: ProspectProfile, state: SharedSalesState) -> str:
        """
        FOLLOW_UP needs: minimal - just reason and last action.
        Goal: Re-engagement async.
        Context budget: ~300 tokens
        """
        days_since = (datetime.now() - prospect.last_interaction).days if prospect.last_interaction else 0

        return f"""
=== PROSPECT ===
{prospect.name} @ {prospect.company_name}

=== LAST INTERACTION ===
{days_since} days ago
Status: {prospect.deal_status.value}
Last Action: {prospect.last_agent_action or 'Unknown'}

=== FOLLOW-UP GOALS ===
Keep warm without over-reaching.
Engagement Fatigue: {prospect.engagement_fatigue}/10
Interest: {prospect.interest_level}/10

=== SUGGESTED TOUCH ===
Resource type: Check engagement_fatigue for strategy.
Tone: Light, helpful, not pushy.

Proceed with follow-up.
"""

    @staticmethod
    def get_expansion_context(prospect: ProspectProfile, state: SharedSalesState) -> str:
        """
        EXPANSION needs: customer profile, usage, renewal date.
        Goal: Identify upsell/churn risk.
        Context budget: ~400 tokens
        """
        return f"""
=== CUSTOMER PROFILE ===
{prospect.name} @ {prospect.company_name}
Industry: {prospect.industry}
Size: {prospect.company_size} employees

=== CURRENT DEAL ===
Plan: {prospect.proposed_offer.get('plan') if prospect.proposed_offer else 'Unknown'}
ARR: ${prospect.proposed_offer.get('price', 0) * 12 if prospect.proposed_offer else 0}

=== EXPANSION OPPORTUNITY ===
Check: Usage patterns, team growth, new departments
Goal: Identify upsell (upgrade plan, new seats)
Also check: Churn signals (usage down, unhappy, renewal near)

Analyze and recommend.
"""


def _format_offer(offer_dict: dict | None) -> str:
    """Format DealRecommendation for display"""
    if not offer_dict:
        return "No offer yet"
    return f"""
Plan: {offer_dict.get('plan', 'Unknown')}
Price: ${offer_dict.get('price', 0)}/month
Discount: {offer_dict.get('discount_percent', 0)}%
Confidence: {offer_dict.get('confidence', 0):.0%}
Reasoning: {offer_dict.get('reasoning', 'N/A')}
"""
