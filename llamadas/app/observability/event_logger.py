"""Structured Event Logging — Event schema + streaming para Revenue AI.

Centraliza todos los eventos del sistema en un único lugar con serialización JSON
y permite subscribirse a eventos en tiempo real (para alertas, dashboards, etc).
"""
from __future__ import annotations

import asyncio
import json
import logging
import time
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Callable, Optional

logger = logging.getLogger(__name__)


# ═══ EVENT TYPES ═══

class EventType(str, Enum):
    """Catálogo exhaustivo de eventos del sistema."""

    # Call lifecycle
    CALL_INITIATED = "call_initiated"
    CALL_STARTED = "call_started"
    CALL_ENDED = "call_ended"

    # Agent routing
    AGENT_SELECTED = "agent_selected"
    AGENT_TRANSITION = "agent_transition"

    # LLM operations
    LLM_CALL_START = "llm_call_start"
    LLM_CALL_COMPLETE = "llm_call_complete"
    LLM_ERROR = "llm_error"
    LLM_CACHE_STATS = "llm_cache_stats"

    # Decision events
    CLASSIFICATION_EXECUTED = "classification_executed"
    STATE_TRANSITION = "state_transition"
    DECISION_MADE = "decision_made"

    # API integration
    API_CALL = "api_call"
    API_ERROR = "api_error"

    # Compliance
    COMPLIANCE_EVENT = "compliance_event"
    DATA_MUTATION = "data_mutation"

    # Cost & performance
    COST_EVENT = "cost_event"
    LATENCY_EVENT = "latency_event"


# ═══ BASE EVENT ═══

@dataclass
class BaseEvent:
    """Evento base con campos comunes a todos los eventos."""

    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")
    event_type: EventType = EventType.CALL_INITIATED
    call_id: str = ""
    session_id: str = ""
    turn: int = 0
    component: str = ""
    level: str = "INFO"
    tags: list[str] = field(default_factory=list)
    trace_id: str = ""
    span_id: str = ""
    data: dict[str, Any] = field(default_factory=dict)
    user_id: str = ""
    prospect_id: str = ""

    def to_dict(self) -> dict[str, Any]:
        return asdict(self)

    def to_json(self) -> str:
        return json.dumps(self.to_dict(), default=str)


# ═══ SPECIALIZED EVENT TYPES ═══

@dataclass
class CallInitiatedEvent(BaseEvent):
    """call_initiated — prospecto entra al sistema."""
    event_type: EventType = EventType.CALL_INITIATED
    prospect_name: str = ""
    business_type: str = ""
    lead_score: int = 0
    prev_interactions: int = 0
    call_direction: str = "inbound"  # inbound | outbound
    agent_type: str = ""
    playbook: str = ""
    campaign: str = ""
    sample_rate: float = 0.1


@dataclass
class LLMCallCompleteEvent(BaseEvent):
    """llm_call_complete — LLM completó su generación."""
    event_type: EventType = EventType.LLM_CALL_COMPLETE
    model: str = ""
    latency_ms: int = 0
    ttfb_ms: int = 0
    input_tokens: int = 0
    output_tokens: int = 0
    cached_tokens: int = 0
    total_tokens: int = 0
    cost_usd: float = 0.0
    cache_hit: bool = False
    success: bool = True
    tools_used: list[str] = field(default_factory=list)


@dataclass
class ClassificationExecutedEvent(BaseEvent):
    """classification_executed — Classifier ejecutó."""
    event_type: EventType = EventType.CLASSIFICATION_EXECUTED
    input_text: str = ""
    classifier_model: str = ""
    classification_result: dict[str, Any] = field(default_factory=dict)
    latency_ms: int = 0
    confidence: float = 0.0


@dataclass
class StateTransitionEvent(BaseEvent):
    """state_transition — Cambio de estado de conversación."""
    event_type: EventType = EventType.STATE_TRANSITION
    state_before: dict[str, Any] = field(default_factory=dict)
    state_after: dict[str, Any] = field(default_factory=dict)
    transition_reason: str = ""
    confidence_change: float = 0.0


@dataclass
class APICallEvent(BaseEvent):
    """api_call — Llamada a API externa."""
    event_type: EventType = EventType.API_CALL
    api: str = ""
    endpoint: str = ""
    method: str = ""
    status_code: int = 0
    latency_ms: int = 0
    cost_usd: float = 0.0
    retry_count: int = 0
    error: Optional[str] = None


@dataclass
class ComplianceEventRecord(BaseEvent):
    """compliance_event — Evento de cumplimiento regulatorio."""
    event_type: EventType = EventType.COMPLIANCE_EVENT
    compliance_type: str = ""  # disclosure | recording_consent | gdpr | do_not_call
    action: str = ""
    timestamp_in_call_s: int = 0
    requirement_satisfied: bool = True
    jurisdiction: str = ""


@dataclass
class CostEventRecord(BaseEvent):
    """cost_event — Desglose de costos de una llamada."""
    event_type: EventType = EventType.COST_EVENT
    duration_s: int = 0
    total_cost_usd: float = 0.0
    cost_breakdown: dict[str, Any] = field(default_factory=dict)
    deal_value_usd: float = 0.0
    probability: float = 0.0
    roi: float = 0.0


# ═══ EVENT PUBLISHER & SUBSCRIBERS ═══

class EventBus:
    """Event bus central para publicar y subscribirse a eventos."""

    def __init__(self, max_history: int = 10000):
        self.subscribers: dict[EventType, list[Callable[[BaseEvent], None]]] = {}
        self.event_history: list[BaseEvent] = []
        self.max_history = max_history
        self._lock = asyncio.Lock()

    async def publish(self, event: BaseEvent) -> None:
        """Publica un evento a todos los subscribers."""
        # Guardar en historial
        async with self._lock:
            self.event_history.append(event)
            if len(self.event_history) > self.max_history:
                self.event_history.pop(0)

        # Loguear el evento (JSON)
        logger.info(event.to_json())

        # Notificar subscribers
        subscribers = self.subscribers.get(event.event_type, [])
        for callback in subscribers:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(event)
                else:
                    callback(event)
            except Exception as exc:
                logger.warning("Error en subscriber de %s: %s", event.event_type, exc)

    def subscribe(
        self,
        event_type: EventType,
        callback: Callable[[BaseEvent], None]
    ) -> None:
        """Se subscriben a eventos de un tipo específico."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
        logger.debug("Subscriber agregado para %s", event_type)

    def unsubscribe(
        self,
        event_type: EventType,
        callback: Callable[[BaseEvent], None]
    ) -> None:
        """Desuscribirse de eventos."""
        if event_type in self.subscribers:
            self.subscribers[event_type].remove(callback)

    async def get_recent_events(
        self,
        call_id: str,
        limit: int = 100
    ) -> list[BaseEvent]:
        """Obtiene eventos recientes de una llamada."""
        async with self._lock:
            return [e for e in self.event_history if e.call_id == call_id][-limit:]

    async def get_events_by_type(
        self,
        event_type: EventType,
        limit: int = 100
    ) -> list[BaseEvent]:
        """Obtiene eventos recientes de un tipo."""
        async with self._lock:
            return [e for e in self.event_history if e.event_type == event_type][-limit:]


# Instance global
_event_bus: Optional[EventBus] = None


def get_event_bus() -> EventBus:
    """Obtiene la instancia global del event bus."""
    global _event_bus
    if _event_bus is None:
        _event_bus = EventBus()
    return _event_bus


# ═══ CONVENIENCE FUNCTIONS ═══

async def log_event(event: BaseEvent) -> None:
    """Publica un evento al event bus."""
    bus = get_event_bus()
    await bus.publish(event)


async def log_llm_call_complete(
    call_id: str,
    model: str,
    latency_ms: int,
    input_tokens: int,
    output_tokens: int,
    cached_tokens: int = 0,
    cost_usd: float = 0.0,
    cache_hit: bool = False,
    tools_used: list[str] | None = None
) -> None:
    """Helper para loguear llamada LLM completada."""
    event = LLMCallCompleteEvent(
        call_id=call_id,
        model=model,
        latency_ms=latency_ms,
        input_tokens=input_tokens,
        output_tokens=output_tokens,
        cached_tokens=cached_tokens,
        total_tokens=input_tokens + output_tokens + cached_tokens,
        cost_usd=cost_usd,
        cache_hit=cache_hit,
        tools_used=tools_used or [],
        component="gemini_llm"
    )
    await log_event(event)


async def log_classification(
    call_id: str,
    turn: int,
    input_text: str,
    classification_result: dict[str, Any],
    latency_ms: int
) -> None:
    """Helper para loguear clasificación ejecutada."""
    event = ClassificationExecutedEvent(
        call_id=call_id,
        turn=turn,
        input_text=input_text[:500],  # truncar
        classifier_model="custom_classifier_v2.1",
        classification_result=classification_result,
        latency_ms=latency_ms,
        confidence=classification_result.get("confidence", 0.0),
        component="classifier"
    )
    await log_event(event)


async def log_api_call(
    call_id: str,
    api: str,
    endpoint: str,
    method: str,
    status_code: int,
    latency_ms: int,
    cost_usd: float = 0.0,
    error: str | None = None
) -> None:
    """Helper para loguear llamada API."""
    event = APICallEvent(
        call_id=call_id,
        api=api,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        latency_ms=latency_ms,
        cost_usd=cost_usd,
        error=error,
        component=f"api_{api}",
        level="ERROR" if status_code >= 400 else "INFO"
    )
    await log_event(event)


async def log_compliance_event(
    call_id: str,
    compliance_type: str,
    action: str,
    timestamp_in_call_s: int,
    requirement_satisfied: bool,
    jurisdiction: str = "mx"
) -> None:
    """Helper para loguear eventos de compliance."""
    event = ComplianceEventRecord(
        call_id=call_id,
        compliance_type=compliance_type,
        action=action,
        timestamp_in_call_s=timestamp_in_call_s,
        requirement_satisfied=requirement_satisfied,
        jurisdiction=jurisdiction,
        component="compliance",
        level="CRITICAL" if not requirement_satisfied else "INFO"
    )
    await log_event(event)


async def log_cost_event(
    call_id: str,
    duration_s: int,
    total_cost_usd: float,
    cost_breakdown: dict[str, Any],
    deal_value_usd: float = 0.0,
    probability: float = 0.0
) -> None:
    """Helper para loguear evento de costo."""
    roi = (deal_value_usd * probability - total_cost_usd) / max(total_cost_usd, 0.001)
    event = CostEventRecord(
        call_id=call_id,
        duration_s=duration_s,
        total_cost_usd=total_cost_usd,
        cost_breakdown=cost_breakdown,
        deal_value_usd=deal_value_usd,
        probability=probability,
        roi=roi,
        component="cost_tracking"
    )
    await log_event(event)
