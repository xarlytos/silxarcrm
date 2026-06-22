"""Immutable Audit Trail — Kafka-based event logging for API calls and decisions.

Centraliza todos los eventos de auditoría (API calls, decisiones, cambios de estado)
en un stream de Kafka inmutable para compliance, debugging y forensics.
"""
from __future__ import annotations

import asyncio
import json
import logging
import re
import uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime
from enum import Enum
from typing import Any, Optional

try:
    from aiokafka import AIOKafkaProducer
    KAFKA_AVAILABLE = True
except ImportError:
    KAFKA_AVAILABLE = False

logger = logging.getLogger(__name__)


# ═══ REDACTION RULES ═══

class RedactionRule:
    """Base class for redaction rules."""

    def apply(self, data: Any) -> Any:
        """Apply redaction to data."""
        raise NotImplementedError


class EmailRedaction(RedactionRule):
    """Redact email addresses."""

    PATTERN = re.compile(
        r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
    )

    def apply(self, data: Any) -> Any:
        if isinstance(data, str):
            return self.PATTERN.sub('***@***.***', data)
        return data


class PhoneRedaction(RedactionRule):
    """Redact phone numbers."""

    # Matches various phone formats: +1-234-567-8900, (234) 567-8900, 234-567-8900, etc.
    PATTERN = re.compile(
        r'\b(?:\+?1[-.\s]?)?(?:\(?[0-9]{3}\)?[-.\s]?)?[0-9]{3}[-.\s]?[0-9]{4}\b'
    )

    def apply(self, data: Any) -> Any:
        if isinstance(data, str):
            return self.PATTERN.sub('***-***-****', data)
        return data


class SSNRedaction(RedactionRule):
    """Redact Social Security Numbers."""

    PATTERN = re.compile(r'\b\d{3}-\d{2}-\d{4}\b')

    def apply(self, data: Any) -> Any:
        if isinstance(data, str):
            return self.PATTERN.sub('***-**-****', data)
        return data


class CreditCardRedaction(RedactionRule):
    """Redact credit card numbers."""

    PATTERN = re.compile(r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b')

    def apply(self, data: Any) -> Any:
        if isinstance(data, str):
            return self.PATTERN.sub('****-****-****-****', data)
        return data


class APIKeyRedaction(RedactionRule):
    """Redact API keys and tokens."""

    # Matches common patterns like: api_key=abc123, token: xyz789, etc.
    PATTERN = re.compile(
        r'(api[_-]?key|token|secret|password|authorization|bearer)\s*[:=]\s*([^\s,\}]+)',
        re.IGNORECASE
    )

    def apply(self, data: Any) -> Any:
        if isinstance(data, str):
            return self.PATTERN.sub(r'\1=***REDACTED***', data)
        return data


class DataRedactor:
    """Applies multiple redaction rules to sanitize data."""

    def __init__(self):
        self.rules: list[RedactionRule] = [
            EmailRedaction(),
            PhoneRedaction(),
            SSNRedaction(),
            CreditCardRedaction(),
            APIKeyRedaction(),
        ]

    def redact(self, data: Any) -> Any:
        """Recursively redact data through all rules."""
        # Handle None
        if data is None:
            return None

        # Handle strings
        if isinstance(data, str):
            result = data
            for rule in self.rules:
                result = rule.apply(result)
            return result

        # Handle lists
        if isinstance(data, list):
            return [self.redact(item) for item in data]

        # Handle dicts
        if isinstance(data, dict):
            return {k: self.redact(v) for k, v in data.items()}

        # Return as-is for other types
        return data


# ═══ AUDIT EVENT TYPES ═══

class AuditAction(str, Enum):
    """Catálogo de acciones auditables."""

    # API calls
    API_CALL_START = "api_call_start"
    API_CALL_COMPLETE = "api_call_complete"
    API_CALL_ERROR = "api_call_error"

    # Decision events
    DECISION_MADE = "decision_made"
    CLASSIFICATION_EXECUTED = "classification_executed"
    STATE_TRANSITION = "state_transition"

    # Resource mutations
    RESOURCE_CREATED = "resource_created"
    RESOURCE_UPDATED = "resource_updated"
    RESOURCE_DELETED = "resource_deleted"

    # Access control
    ACCESS_GRANTED = "access_granted"
    ACCESS_DENIED = "access_denied"
    AUTHENTICATION_SUCCESS = "authentication_success"
    AUTHENTICATION_FAILED = "authentication_failed"

    # Compliance
    COMPLIANCE_CHECK = "compliance_check"
    POLICY_VIOLATION = "policy_violation"

    # System events
    CONFIG_CHANGED = "config_changed"
    ALERT_TRIGGERED = "alert_triggered"
    SERVICE_ERROR = "service_error"


class AuditSeverity(str, Enum):
    """Severity levels for audit events."""

    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


# ═══ AUDIT EVENT ═══

@dataclass
class AuditEvent:
    """Immutable audit event for Kafka."""

    # Metadata
    audit_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat() + "Z")

    # Context
    user_id: str = ""
    call_id: str = ""
    session_id: str = ""

    # Event details
    action: AuditAction = AuditAction.API_CALL_COMPLETE
    resource: str = ""  # e.g., "calls/ca_123", "prospectdetails/p_456"
    outcome: str = "success"  # "success" | "error" | "denied"
    severity: AuditSeverity = AuditSeverity.INFO

    # Event-specific data (will be redacted)
    data: dict[str, Any] = field(default_factory=dict)

    # Result
    error: Optional[str] = None

    # Tracing
    trace_id: str = ""
    span_id: str = ""

    def to_dict(self, redact: bool = True) -> dict[str, Any]:
        """Convert to dict, optionally redacting sensitive data."""
        result = asdict(self)

        # Convert enums to strings
        result["action"] = self.action.value
        result["severity"] = self.severity.value

        # Optionally redact
        if redact:
            redactor = DataRedactor()
            result["data"] = redactor.redact(result["data"])
            result["error"] = redactor.redact(result["error"])

        return result

    def to_json(self, redact: bool = True) -> str:
        """Convert to JSON, optionally redacting sensitive data."""
        return json.dumps(self.to_dict(redact=redact), default=str)


# ═══ AUDIT LOGGER ═══

class AuditLogger:
    """Audit logger that sends events to Kafka for immutable audit trail."""

    def __init__(
        self,
        kafka_bootstrap_servers: list[str] | str = "localhost:9092",
        topic: str = "audit-events",
        enable_redaction: bool = True,
        batch_size: int = 10,
        flush_interval_s: float = 5.0,
    ):
        """Initialize AuditLogger.

        Args:
            kafka_bootstrap_servers: Kafka broker(s) to connect to
            topic: Kafka topic for audit events
            enable_redaction: Whether to redact sensitive data
            batch_size: Number of events to batch before sending
            flush_interval_s: Seconds between periodic flushes
        """
        # Normalize bootstrap servers
        if isinstance(kafka_bootstrap_servers, str):
            self.kafka_bootstrap_servers = [kafka_bootstrap_servers]
        else:
            self.kafka_bootstrap_servers = kafka_bootstrap_servers

        self.topic = topic
        self.enable_redaction = enable_redaction
        self.batch_size = batch_size
        self.flush_interval_s = flush_interval_s

        # State
        self.producer: Optional[AIOKafkaProducer] = None
        self.event_buffer: list[AuditEvent] = []
        self._lock = asyncio.Lock()
        self._flush_task: Optional[asyncio.Task] = None
        self._initialized = False

        # Statistics
        self.events_sent = 0
        self.events_failed = 0
        self.redactor = DataRedactor()

    async def initialize(self) -> None:
        """Initialize Kafka producer and start background tasks."""
        if not KAFKA_AVAILABLE:
            logger.warning(
                "aiokafka not available. Audit events will be logged locally only. "
                "Install aiokafka: pip install aiokafka"
            )
            self._initialized = True
            return

        try:
            self.producer = AIOKafkaProducer(
                bootstrap_servers=self.kafka_bootstrap_servers,
                value_serializer=lambda v: v.encode('utf-8'),
            )
            await self.producer.start()
            self._initialized = True

            # Start flush task
            self._flush_task = asyncio.create_task(self._periodic_flush())

            logger.info(
                f"AuditLogger initialized: topic={self.topic}, "
                f"brokers={self.kafka_bootstrap_servers}"
            )
        except Exception as exc:
            logger.error(f"Failed to initialize AuditLogger: {exc}")
            self._initialized = True  # Continue with local logging fallback

    async def shutdown(self) -> None:
        """Flush pending events and shutdown producer."""
        # Cancel flush task
        if self._flush_task:
            self._flush_task.cancel()
            try:
                await self._flush_task
            except asyncio.CancelledError:
                pass

        # Flush any remaining events
        await self._flush_buffer()

        # Stop producer
        if self.producer:
            await self.producer.stop()

        logger.info(
            f"AuditLogger shutdown: {self.events_sent} events sent, "
            f"{self.events_failed} failed"
        )

    async def log_api_call(
        self,
        user_id: str,
        api: str,
        endpoint: str,
        method: str,
        status_code: int,
        latency_ms: int,
        call_id: str = "",
        session_id: str = "",
        error: Optional[str] = None,
        request_data: Optional[dict] = None,
        response_data: Optional[dict] = None,
    ) -> str:
        """Log an API call.

        Returns:
            audit_id of the logged event
        """
        outcome = "success" if 200 <= status_code < 300 else "error"
        severity = AuditSeverity.ERROR if status_code >= 400 else AuditSeverity.INFO

        event = AuditEvent(
            user_id=user_id,
            call_id=call_id,
            session_id=session_id,
            action=AuditAction.API_CALL_COMPLETE,
            resource=f"{api}/{endpoint}",
            outcome=outcome,
            severity=severity,
            data={
                "api": api,
                "endpoint": endpoint,
                "method": method,
                "status_code": status_code,
                "latency_ms": latency_ms,
                "request": request_data or {},
                "response": response_data or {},
            },
            error=error,
        )

        await self.log_event(event)
        return event.audit_id

    async def log_decision(
        self,
        user_id: str,
        decision_type: str,
        decision: str,
        confidence: float,
        call_id: str = "",
        session_id: str = "",
        context: Optional[dict] = None,
    ) -> str:
        """Log a decision made by the system.

        Returns:
            audit_id of the logged event
        """
        event = AuditEvent(
            user_id=user_id,
            call_id=call_id,
            session_id=session_id,
            action=AuditAction.DECISION_MADE,
            resource=f"decisions/{decision_type}",
            outcome="success",
            severity=AuditSeverity.INFO,
            data={
                "decision_type": decision_type,
                "decision": decision,
                "confidence": confidence,
                "context": context or {},
            },
        )

        await self.log_event(event)
        return event.audit_id

    async def log_resource_mutation(
        self,
        user_id: str,
        action: AuditAction,
        resource: str,
        resource_id: str,
        call_id: str = "",
        session_id: str = "",
        changes: Optional[dict] = None,
        reason: str = "",
    ) -> str:
        """Log a resource mutation (create, update, delete).

        Returns:
            audit_id of the logged event
        """
        event = AuditEvent(
            user_id=user_id,
            call_id=call_id,
            session_id=session_id,
            action=action,
            resource=f"{resource}/{resource_id}",
            outcome="success",
            severity=AuditSeverity.INFO,
            data={
                "resource_type": resource,
                "resource_id": resource_id,
                "changes": changes or {},
                "reason": reason,
            },
        )

        await self.log_event(event)
        return event.audit_id

    async def log_access_control_event(
        self,
        user_id: str,
        action: AuditAction,
        resource: str,
        result: bool,  # True = granted, False = denied
        call_id: str = "",
        session_id: str = "",
        reason: str = "",
    ) -> str:
        """Log access control event (grant/deny).

        Returns:
            audit_id of the logged event
        """
        severity = AuditSeverity.WARNING if not result else AuditSeverity.INFO
        outcome = "success" if result else "denied"

        event = AuditEvent(
            user_id=user_id,
            call_id=call_id,
            session_id=session_id,
            action=action,
            resource=resource,
            outcome=outcome,
            severity=severity,
            data={
                "result": result,
                "reason": reason,
            },
        )

        await self.log_event(event)
        return event.audit_id

    async def log_compliance_event(
        self,
        user_id: str,
        compliance_type: str,
        status: str,
        call_id: str = "",
        session_id: str = "",
        details: Optional[dict] = None,
    ) -> str:
        """Log a compliance event.

        Returns:
            audit_id of the logged event
        """
        severity = AuditSeverity.CRITICAL if status == "violation" else AuditSeverity.INFO

        event = AuditEvent(
            user_id=user_id,
            call_id=call_id,
            session_id=session_id,
            action=AuditAction.COMPLIANCE_CHECK,
            resource=f"compliance/{compliance_type}",
            outcome=status,
            severity=severity,
            data={
                "compliance_type": compliance_type,
                "status": status,
                "details": details or {},
            },
        )

        await self.log_event(event)
        return event.audit_id

    async def log_event(self, event: AuditEvent) -> None:
        """Log an audit event to Kafka.

        Events are buffered and sent in batches for efficiency.
        """
        async with self._lock:
            self.event_buffer.append(event)

            # Log locally
            logger.info(
                f"[AUDIT] {event.action.value} | {event.resource} | "
                f"user_id={event.user_id} | outcome={event.outcome} | "
                f"severity={event.severity.value}"
            )

            # Flush if buffer is full
            if len(self.event_buffer) >= self.batch_size:
                await self._flush_buffer()

    async def _flush_buffer(self) -> None:
        """Flush buffered events to Kafka."""
        if not self.event_buffer:
            return

        if not self.producer:
            # Kafka not available, just log and clear
            for event in self.event_buffer:
                logger.debug(f"Buffered event (no Kafka): {event.to_json()}")
            self.event_buffer.clear()
            return

        events_to_send = self.event_buffer.copy()
        self.event_buffer.clear()

        for event in events_to_send:
            try:
                message = event.to_json(redact=self.enable_redaction)

                # Use audit_id as key for deterministic partitioning
                await self.producer.send_and_wait(
                    self.topic,
                    value=message,
                    key=event.audit_id.encode('utf-8'),
                )

                self.events_sent += 1
            except Exception as exc:
                logger.error(f"Failed to send audit event to Kafka: {exc}")
                self.events_failed += 1

    async def _periodic_flush(self) -> None:
        """Periodically flush buffered events."""
        try:
            while True:
                await asyncio.sleep(self.flush_interval_s)
                async with self._lock:
                    await self._flush_buffer()
        except asyncio.CancelledError:
            pass

    def get_stats(self) -> dict[str, Any]:
        """Get audit logger statistics."""
        return {
            "events_sent": self.events_sent,
            "events_failed": self.events_failed,
            "buffer_size": len(self.event_buffer),
            "kafka_available": KAFKA_AVAILABLE,
            "producer_initialized": self.producer is not None,
        }


# ═══ GLOBAL INSTANCE ═══

_audit_logger: Optional[AuditLogger] = None


def get_audit_logger() -> AuditLogger:
    """Get or create the global audit logger instance."""
    global _audit_logger
    if _audit_logger is None:
        _audit_logger = AuditLogger()
    return _audit_logger


def set_audit_logger(logger: AuditLogger) -> None:
    """Set a custom audit logger instance."""
    global _audit_logger
    _audit_logger = logger


# ═══ CONVENIENCE FUNCTIONS ═══

async def log_api_call(
    user_id: str,
    api: str,
    endpoint: str,
    method: str,
    status_code: int,
    latency_ms: int,
    **kwargs
) -> str:
    """Convenience function to log an API call."""
    logger = get_audit_logger()
    return await logger.log_api_call(
        user_id=user_id,
        api=api,
        endpoint=endpoint,
        method=method,
        status_code=status_code,
        latency_ms=latency_ms,
        **kwargs
    )


async def log_decision(
    user_id: str,
    decision_type: str,
    decision: str,
    confidence: float,
    **kwargs
) -> str:
    """Convenience function to log a decision."""
    logger = get_audit_logger()
    return await logger.log_decision(
        user_id=user_id,
        decision_type=decision_type,
        decision=decision,
        confidence=confidence,
        **kwargs
    )


async def log_resource_mutation(
    user_id: str,
    action: AuditAction,
    resource: str,
    resource_id: str,
    **kwargs
) -> str:
    """Convenience function to log a resource mutation."""
    logger = get_audit_logger()
    return await logger.log_resource_mutation(
        user_id=user_id,
        action=action,
        resource=resource,
        resource_id=resource_id,
        **kwargs
    )


async def log_access_control_event(
    user_id: str,
    action: AuditAction,
    resource: str,
    result: bool,
    **kwargs
) -> str:
    """Convenience function to log an access control event."""
    logger = get_audit_logger()
    return await logger.log_access_control_event(
        user_id=user_id,
        action=action,
        resource=resource,
        result=result,
        **kwargs
    )


async def log_compliance_event(
    user_id: str,
    compliance_type: str,
    status: str,
    **kwargs
) -> str:
    """Convenience function to log a compliance event."""
    logger = get_audit_logger()
    return await logger.log_compliance_event(
        user_id=user_id,
        compliance_type=compliance_type,
        status=status,
        **kwargs
    )
