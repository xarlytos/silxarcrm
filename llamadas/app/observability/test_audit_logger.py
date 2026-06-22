"""Tests for AuditLogger and redaction rules.

Run with: pytest test_audit_logger.py -v
"""
import asyncio
import json
from datetime import datetime

import pytest

from .audit_logger import (
    AuditAction,
    AuditEvent,
    AuditLogger,
    AuditSeverity,
    APIKeyRedaction,
    CreditCardRedaction,
    DataRedactor,
    EmailRedaction,
    PhoneRedaction,
    SSNRedaction,
    get_audit_logger,
)


# ═══ REDACTION TESTS ═══

class TestEmailRedaction:
    """Test email redaction."""

    def test_single_email(self):
        rule = EmailRedaction()
        result = rule.apply("Contact john.doe@example.com for details")
        assert result == "Contact ***@***.*** for details"

    def test_multiple_emails(self):
        rule = EmailRedaction()
        result = rule.apply(
            "Email alice@test.com or bob@test.org for support"
        )
        assert "***@***" in result
        assert "alice" not in result
        assert "bob" not in result


class TestPhoneRedaction:
    """Test phone number redaction."""

    def test_us_phone(self):
        rule = PhoneRedaction()
        result = rule.apply("Call me at +1-234-567-8900")
        assert result == "Call me at ***-***-****"

    def test_various_formats(self):
        rule = PhoneRedaction()

        formats = [
            "234-567-8900",
            "(234) 567-8900",
            "+1 234 567 8900",
            "1-234-567-8900",
        ]

        for fmt in formats:
            result = rule.apply(fmt)
            assert "***" in result


class TestSSNRedaction:
    """Test SSN redaction."""

    def test_ssn(self):
        rule = SSNRedaction()
        result = rule.apply("SSN: 123-45-6789")
        assert result == "SSN: ***-**-****"


class TestCreditCardRedaction:
    """Test credit card redaction."""

    def test_credit_card(self):
        rule = CreditCardRedaction()
        result = rule.apply("Card: 4111-1111-1111-1111")
        assert result == "Card: ****-****-****-****"


class TestAPIKeyRedaction:
    """Test API key redaction."""

    def test_api_key_equals(self):
        rule = APIKeyRedaction()
        result = rule.apply("api_key=sk_live_abcdef123456")
        assert "sk_live" not in result
        assert "***REDACTED***" in result

    def test_bearer_token(self):
        rule = APIKeyRedaction()
        result = rule.apply("Authorization: Bearer xyz789abc")
        assert "xyz789abc" not in result
        assert "***REDACTED***" in result


class TestDataRedactor:
    """Test comprehensive data redaction."""

    def test_redact_string(self):
        redactor = DataRedactor()
        result = redactor.redact("Email: user@example.com")
        assert "user@" not in result

    def test_redact_list(self):
        redactor = DataRedactor()
        data = ["user@example.com", "123-45-6789", "normal text"]
        result = redactor.redact(data)

        assert result[0] == "***@***.***"
        assert result[1] == "***-**-****"
        assert result[2] == "normal text"

    def test_redact_dict(self):
        redactor = DataRedactor()
        data = {
            "email": "user@example.com",
            "ssn": "123-45-6789",
            "name": "John Doe",
        }
        result = redactor.redact(data)

        assert result["email"] == "***@***.***"
        assert result["ssn"] == "***-**-****"
        assert result["name"] == "John Doe"

    def test_redact_nested(self):
        redactor = DataRedactor()
        data = {
            "user": {
                "email": "alice@example.com",
                "phone": "234-567-8900",
                "contact": ["bob@test.com", "555-1234"],
            },
        }
        result = redactor.redact(data)

        assert result["user"]["email"] == "***@***.***"
        assert "bob" not in str(result)
        assert "555" not in str(result)

    def test_redact_none(self):
        redactor = DataRedactor()
        result = redactor.redact(None)
        assert result is None

    def test_redact_numbers(self):
        redactor = DataRedactor()
        result = redactor.redact(12345)
        assert result == 12345


# ═══ AUDIT EVENT TESTS ═══

class TestAuditEvent:
    """Test AuditEvent creation and serialization."""

    def test_create_event(self):
        event = AuditEvent(
            user_id="user_123",
            action=AuditAction.API_CALL_COMPLETE,
            resource="calls/ca_123",
            outcome="success",
        )

        assert event.user_id == "user_123"
        assert event.action == AuditAction.API_CALL_COMPLETE
        assert event.audit_id  # Should be generated
        assert event.timestamp  # Should be generated

    def test_to_dict(self):
        event = AuditEvent(
            user_id="user_123",
            action=AuditAction.API_CALL_COMPLETE,
            resource="calls/ca_123",
            data={"email": "user@example.com"},
        )

        # Without redaction
        d = event.to_dict(redact=False)
        assert d["user_id"] == "user_123"
        assert d["action"] == "api_call_complete"
        assert d["data"]["email"] == "user@example.com"

        # With redaction
        d_redacted = event.to_dict(redact=True)
        assert d_redacted["data"]["email"] == "***@***.***"

    def test_to_json(self):
        event = AuditEvent(
            user_id="user_123",
            action=AuditAction.DECISION_MADE,
        )

        json_str = event.to_json()
        parsed = json.loads(json_str)

        assert parsed["user_id"] == "user_123"
        assert parsed["action"] == "decision_made"


# ═══ AUDIT LOGGER TESTS ═══

class TestAuditLogger:
    """Test AuditLogger functionality."""

    @pytest.fixture
    async def logger(self):
        """Create a test logger (without Kafka)."""
        logger = AuditLogger(
            kafka_bootstrap_servers="localhost:9092",
            topic="audit-events-test",
            enable_redaction=True,
            batch_size=100,  # High threshold so we don't auto-flush
        )
        # Don't initialize (skip Kafka connection)
        logger._initialized = True  # Pretend it's initialized

        yield logger

    @pytest.mark.asyncio
    async def test_log_api_call(self, logger):
        """Test logging API call."""
        audit_id = await logger.log_api_call(
            user_id="user_123",
            api="twilio",
            endpoint="/calls",
            method="POST",
            status_code=200,
            latency_ms=145,
        )

        assert audit_id
        assert logger.event_buffer

        # Check buffered event
        event = logger.event_buffer[0]
        assert event.user_id == "user_123"
        assert event.action == AuditAction.API_CALL_COMPLETE
        assert event.data["api"] == "twilio"

    @pytest.mark.asyncio
    async def test_log_decision(self, logger):
        """Test logging decision."""
        audit_id = await logger.log_decision(
            user_id="user_123",
            decision_type="call_routing",
            decision="route_to_closer",
            confidence=0.92,
        )

        assert audit_id
        event = logger.event_buffer[0]
        assert event.action == AuditAction.DECISION_MADE
        assert event.data["decision_type"] == "call_routing"
        assert event.data["confidence"] == 0.92

    @pytest.mark.asyncio
    async def test_log_resource_mutation(self, logger):
        """Test logging resource mutation."""
        audit_id = await logger.log_resource_mutation(
            user_id="user_123",
            action=AuditAction.RESOURCE_CREATED,
            resource="call_records",
            resource_id="call_12345",
            changes={"status": "active"},
        )

        assert audit_id
        event = logger.event_buffer[0]
        assert event.action == AuditAction.RESOURCE_CREATED
        assert event.resource == "call_records/call_12345"

    @pytest.mark.asyncio
    async def test_log_access_control(self, logger):
        """Test logging access control event."""
        audit_id = await logger.log_access_control_event(
            user_id="user_123",
            action=AuditAction.ACCESS_DENIED,
            resource="calls/ca_123",
            result=False,
            reason="Insufficient permissions",
        )

        assert audit_id
        event = logger.event_buffer[0]
        assert event.action == AuditAction.ACCESS_DENIED
        assert event.outcome == "denied"
        assert event.severity == AuditSeverity.WARNING

    @pytest.mark.asyncio
    async def test_log_compliance(self, logger):
        """Test logging compliance event."""
        audit_id = await logger.log_compliance_event(
            user_id="user_123",
            compliance_type="ai_disclosure",
            status="success",
        )

        assert audit_id
        event = logger.event_buffer[0]
        assert event.action == AuditAction.COMPLIANCE_CHECK
        assert event.data["compliance_type"] == "ai_disclosure"

    @pytest.mark.asyncio
    async def test_redaction_in_buffer(self, logger):
        """Test that redaction is applied to buffered events."""
        await logger.log_api_call(
            user_id="user_123",
            api="twilio",
            endpoint="/calls",
            method="POST",
            status_code=200,
            latency_ms=145,
            request_data={"email": "user@example.com"},
        )

        event = logger.event_buffer[0]

        # Redacted JSON
        json_str = event.to_json(redact=True)
        parsed = json.loads(json_str)

        assert parsed["data"]["request"]["email"] == "***@***.***"

    def test_get_stats(self, logger):
        """Test logger statistics."""
        stats = logger.get_stats()

        assert "events_sent" in stats
        assert "events_failed" in stats
        assert "buffer_size" in stats
        assert stats["events_sent"] == 0

    @pytest.mark.asyncio
    async def test_severity_levels(self, logger):
        """Test severity assignment."""
        # Success = INFO
        await logger.log_api_call(
            user_id="user_123",
            api="api",
            endpoint="/test",
            method="GET",
            status_code=200,
            latency_ms=10,
        )
        assert logger.event_buffer[-1].severity == AuditSeverity.INFO

        # Error = ERROR
        await logger.log_api_call(
            user_id="user_123",
            api="api",
            endpoint="/test",
            method="GET",
            status_code=500,
            latency_ms=10,
        )
        assert logger.event_buffer[-1].severity == AuditSeverity.ERROR

        # Access denied = WARNING
        await logger.log_access_control_event(
            user_id="user_123",
            action=AuditAction.ACCESS_DENIED,
            resource="data",
            result=False,
        )
        assert logger.event_buffer[-1].severity == AuditSeverity.WARNING

        # Compliance violation = CRITICAL
        await logger.log_compliance_event(
            user_id="user_123",
            compliance_type="disclosure",
            status="violation",
        )
        assert logger.event_buffer[-1].severity == AuditSeverity.CRITICAL


# ═══ INTEGRATION TESTS ═══

@pytest.mark.asyncio
async def test_audit_trail_sequence():
    """Test a complete audit trail sequence."""
    logger = AuditLogger(batch_size=100)
    logger._initialized = True

    # Simulate a complete call workflow
    user_id = "agent_001"
    call_id = "ca_12345"

    # 1. API call to initiate
    await logger.log_api_call(
        user_id=user_id,
        api="twilio",
        endpoint="/calls",
        method="POST",
        status_code=200,
        latency_ms=145,
        call_id=call_id,
    )

    # 2. Decision to route
    await logger.log_decision(
        user_id=user_id,
        decision_type="call_routing",
        decision="route_to_closer",
        confidence=0.92,
        call_id=call_id,
    )

    # 3. Resource created
    await logger.log_resource_mutation(
        user_id=user_id,
        action=AuditAction.RESOURCE_CREATED,
        resource="call_records",
        resource_id=call_id,
        call_id=call_id,
    )

    # 4. Compliance check
    await logger.log_compliance_event(
        user_id=user_id,
        compliance_type="ai_disclosure",
        status="success",
        call_id=call_id,
    )

    # Verify sequence
    assert len(logger.event_buffer) == 4
    assert all(e.call_id == call_id for e in logger.event_buffer)
    assert all(e.user_id == user_id for e in logger.event_buffer)

    # Verify timestamps are ordered
    timestamps = [
        datetime.fromisoformat(e.timestamp.replace("Z", "+00:00"))
        for e in logger.event_buffer
    ]
    assert all(timestamps[i] <= timestamps[i + 1] for i in range(len(timestamps) - 1))


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
