"""Shared Memory Layer — Unified state for all agents"""
from __future__ import annotations

import json
import logging
from dataclasses import asdict, dataclass, field
from datetime import datetime, timedelta
from typing import Any, Optional, List
from enum import Enum

logger = logging.getLogger(__name__)


class PipelineStage(str, Enum):
    """Sales pipeline stages — controls which agent acts"""
    DISCOVERY = "discovery"  # SDR qualification
    QUALIFIED = "qualified"  # Ready for CLOSER
    PITCHING = "pitching"  # CLOSER presenting offer
    NEGOTIATION = "negotiation"  # RECOVERY handling objections
    CLOSING = "closing"  # Final commitment push
    NURTURING = "nurturing"  # FOLLOW_UP waiting period
    CLOSED = "closed"  # Deal won
    EXPANSION = "expansion"  # EXPANSION agent
    LOST = "lost"  # Unrecoverable


class DealStatus(str, Enum):
    """Deal status — finer granularity within pipeline"""
    UNQUALIFIED = "unqualified"
    QUALIFIED = "qualified"
    PITCHING = "pitching"
    OBJECTING = "objecting"
    NEGOTIATING = "negotiating"
    DEMO_SCHEDULED = "demo_scheduled"
    TRIAL_STARTED = "trial_started"
    WAITING = "waiting"
    CLOSED_WON = "closed_won"
    CLOSED_LOST = "closed_lost"


class AgentType(str, Enum):
    """Available agents"""
    SDR = "SDR"
    CLOSER = "CLOSER"
    RECOVERY = "RECOVERY"
    FOLLOW_UP = "FOLLOW_UP"
    EXPANSION = "EXPANSION"
    HUMAN = "HUMAN"
    ARCHIVE = "ARCHIVE"


@dataclass
class ProspectProfile:
    """Complete prospect context — shared read/write by all agents"""

    # Identity
    prospect_id: str
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""

    # Company
    company_name: str = ""
    company_size: int = 0  # 1-10, 11-50, 51-200, 200+
    industry: str = ""
    location: str = ""

    # BANT Qualification
    budget_max: Optional[float] = None
    authority: bool = False
    need_detected: str = ""  # Primary pain point
    timeline: str = ""  # Immediate, 3mo, 6mo, 12mo+

    # Sales Signals
    qualification_score: float = 0.0  # 0-100 (SDR output)
    interest_level: int = 5  # 0-10
    pain_points: List[str] = field(default_factory=list)
    current_solution: str = ""  # What they're using now

    # Agent History
    last_agent: AgentType = AgentType.SDR
    last_agent_action: str = ""
    last_interaction: Optional[datetime] = None

    # Deal Context
    deal_status: DealStatus = DealStatus.UNQUALIFIED
    proposed_offer: Optional[dict] = None  # DealRecommendation serialized
    objections: List[str] = field(default_factory=list)  # ["price", "timing", "fit"]

    # Emotional State
    emotion: str = "neutral"  # interested, neutral, frustrated, rejecting
    frustration_level: int = 0  # 0-10
    engagement_fatigue: int = 0  # 0-10 (follow-up burnout)

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    source: str = ""  # Where lead came from

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        # Convert enums to strings
        d["last_agent"] = self.last_agent.value
        d["deal_status"] = self.deal_status.value
        # Convert datetime to ISO
        if d.get("created_at"):
            d["created_at"] = d["created_at"].isoformat()
        if d.get("updated_at"):
            d["updated_at"] = d["updated_at"].isoformat()
        if d.get("last_interaction"):
            d["last_interaction"] = d["last_interaction"].isoformat()
        return d

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ProspectProfile":
        # Convert datetime strings
        if isinstance(data.get("created_at"), str):
            data["created_at"] = datetime.fromisoformat(data["created_at"])
        if isinstance(data.get("updated_at"), str):
            data["updated_at"] = datetime.fromisoformat(data["updated_at"])
        if isinstance(data.get("last_interaction"), str):
            data["last_interaction"] = datetime.fromisoformat(data["last_interaction"])

        # Convert enum strings
        if isinstance(data.get("last_agent"), str):
            data["last_agent"] = AgentType(data["last_agent"])
        if isinstance(data.get("deal_status"), str):
            data["deal_status"] = DealStatus(data["deal_status"])

        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class SharedSalesState:
    """Unified sales state — single source of truth for agent routing"""

    prospect_id: str

    # Pipeline stage (controls which agent acts next)
    current_stage: PipelineStage = PipelineStage.DISCOVERY

    # Probability & Expected Value
    close_probability: float = 0.0  # 0-1
    expected_close_date: Optional[datetime] = None
    expected_value: float = 0.0

    # Signals for handoff decision
    sdr_completed: bool = False
    closer_engaged: bool = False
    recovery_needed: bool = False
    follow_up_scheduled: Optional[datetime] = None

    # Interaction counts (prevent over-reaching)
    total_interactions: int = 0
    interactions_this_week: int = 0
    days_since_contact: int = 0

    # Flags for next agent
    next_agent: AgentType = AgentType.SDR
    next_action_reason: str = ""
    ready_for_handoff: bool = True

    # Metadata
    last_updated_by_agent: AgentType = AgentType.SDR
    last_update_timestamp: datetime = field(default_factory=datetime.now)
    handoff_history: List[dict] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["current_stage"] = self.current_stage.value
        d["next_agent"] = self.next_agent.value
        d["last_updated_by_agent"] = self.last_updated_by_agent.value
        if d.get("expected_close_date"):
            d["expected_close_date"] = d["expected_close_date"].isoformat()
        if d.get("follow_up_scheduled"):
            d["follow_up_scheduled"] = d["follow_up_scheduled"].isoformat()
        d["last_update_timestamp"] = d["last_update_timestamp"].isoformat()
        return d

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "SharedSalesState":
        if isinstance(data.get("current_stage"), str):
            data["current_stage"] = PipelineStage(data["current_stage"])
        if isinstance(data.get("next_agent"), str):
            data["next_agent"] = AgentType(data["next_agent"])
        if isinstance(data.get("last_updated_by_agent"), str):
            data["last_updated_by_agent"] = AgentType(data["last_updated_by_agent"])

        # Parse timestamps
        for ts_field in ["expected_close_date", "follow_up_scheduled", "last_update_timestamp"]:
            if isinstance(data.get(ts_field), str):
                data[ts_field] = datetime.fromisoformat(data[ts_field])

        return cls(**{k: v for k, v in data.items() if k in cls.__dataclass_fields__})


@dataclass
class HandoffPacket:
    """Data passed from one agent to next"""

    prospect_id: str
    from_agent: AgentType
    to_agent: AgentType

    # Context enrichment
    summary: str
    prospect_emotion: str
    engagement_level: int  # 0-10

    # Recommendations
    offer_recommendation: Optional[dict] = None
    recovery_strategy: Optional[str] = None

    # Flags
    ready_for_action: bool = True

    # Timestamp
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> dict[str, Any]:
        d = asdict(self)
        d["from_agent"] = self.from_agent.value
        d["to_agent"] = self.to_agent.value
        d["created_at"] = d["created_at"].isoformat()
        return d


class SharedMemoryStore:
    """Manages ProspectProfile + SharedSalesState storage (Redis + DB)"""

    def __init__(self, redis_client=None, db_client=None):
        self.redis = redis_client
        self.db = db_client

    async def save_prospect(self, profile: ProspectProfile) -> None:
        """Save prospect to Redis (fast) + DB (persistence)"""
        profile.updated_at = datetime.now()

        payload = json.dumps(profile.to_dict(), ensure_ascii=False)

        # Redis
        if self.redis:
            try:
                await self.redis.set(
                    f"prospect:{profile.prospect_id}:profile",
                    payload,
                    ex=3600  # 1-hour TTL
                )
            except Exception as exc:
                logger.warning(f"Failed to save to Redis: {exc}")

        # PostgreSQL
        if self.db:
            try:
                await self.db.execute(
                    """
                    INSERT INTO prospects (prospect_id, profile_data, updated_at)
                    VALUES ($1, $2, $3)
                    ON CONFLICT (prospect_id)
                    DO UPDATE SET profile_data = $2, updated_at = $3
                    """,
                    profile.prospect_id,
                    payload,
                    profile.updated_at,
                )
            except Exception as exc:
                logger.warning(f"Failed to save to DB: {exc}")

    async def load_prospect(self, prospect_id: str) -> Optional[ProspectProfile]:
        """Load prospect from Redis (fast) or DB (slow)"""
        # Try Redis first
        if self.redis:
            try:
                payload = await self.redis.get(f"prospect:{prospect_id}:profile")
                if payload:
                    data = json.loads(payload)
                    return ProspectProfile.from_dict(data)
            except Exception as exc:
                logger.warning(f"Failed to load from Redis: {exc}")

        # Fallback to PostgreSQL
        if self.db:
            try:
                row = await self.db.fetchrow(
                    "SELECT profile_data FROM prospects WHERE prospect_id = $1",
                    prospect_id,
                )
                if row:
                    data = json.loads(row["profile_data"])
                    return ProspectProfile.from_dict(data)
            except Exception as exc:
                logger.warning(f"Failed to load from DB: {exc}")

        return None

    async def save_state(self, state: SharedSalesState) -> None:
        """Save sales state"""
        state.last_update_timestamp = datetime.now()

        payload = json.dumps(state.to_dict(), ensure_ascii=False)

        if self.redis:
            try:
                await self.redis.set(
                    f"prospect:{state.prospect_id}:state",
                    payload,
                    ex=1800  # 30-min TTL
                )
            except Exception as exc:
                logger.warning(f"Failed to save state to Redis: {exc}")

    async def load_state(self, prospect_id: str) -> Optional[SharedSalesState]:
        """Load sales state"""
        if self.redis:
            try:
                payload = await self.redis.get(f"prospect:{prospect_id}:state")
                if payload:
                    data = json.loads(payload)
                    return SharedSalesState.from_dict(data)
            except Exception as exc:
                logger.warning(f"Failed to load state: {exc}")

        return None

    async def queue_handoff(self, packet: HandoffPacket) -> None:
        """Queue handoff for next agent"""
        payload = json.dumps(packet.to_dict(), ensure_ascii=False)

        if self.redis:
            try:
                # Queue in Redis list for async processing
                await self.redis.lpush(
                    "queue:next_agent",
                    payload
                )
                logger.info(
                    f"Queued handoff: {packet.from_agent.value} → "
                    f"{packet.to_agent.value} for prospect {packet.prospect_id}"
                )
            except Exception as exc:
                logger.warning(f"Failed to queue handoff: {exc}")
