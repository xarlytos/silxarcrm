"""Observability stack for Revenue AI platform.

Modules:
- tracing: OpenTelemetry distributed tracing
- event_logger: Structured event logging
- audit_logger: Immutable audit trail (Kafka)
- advanced_alerts: Alert engine
- metrics: In-process metrics
- decision_logger: Decision logging
- prometheus_exporter: Prometheus metrics export (/metrics endpoint)
"""

# Audit Logger
from .audit_logger import (
    AuditAction,
    AuditEvent,
    AuditLogger,
    AuditSeverity,
    DataRedactor,
    get_audit_logger,
    log_access_control_event,
    log_api_call,
    log_compliance_event,
    log_decision,
    log_resource_mutation,
    set_audit_logger,
)

# Kafka utilities
from .kafka_setup import (
    create_audit_topic,
    delete_topic,
    get_topic_info,
    get_topic_offset_info,
)

# Prometheus exporter
from .prometheus_exporter import (
    agent_classification_latency_ms,
    api_call_count,
    deal_probability_distribution,
    error_rate,
    get_metrics_content,
    measure_latency,
    model_inference_accuracy,
    record_api_call,
    record_batch,
    record_classification_latency,
    record_deal_probability,
    reset_metrics,
    set_error_rate,
    set_model_accuracy,
)

__all__ = [
    # Audit Logger
    "AuditAction",
    "AuditEvent",
    "AuditLogger",
    "AuditSeverity",
    "DataRedactor",
    "get_audit_logger",
    "set_audit_logger",
    "log_api_call",
    "log_decision",
    "log_resource_mutation",
    "log_access_control_event",
    "log_compliance_event",
    # Kafka
    "create_audit_topic",
    "delete_topic",
    "get_topic_info",
    "get_topic_offset_info",
    # Prometheus Exporter
    "agent_classification_latency_ms",
    "model_inference_accuracy",
    "api_call_count",
    "error_rate",
    "deal_probability_distribution",
    "record_classification_latency",
    "record_api_call",
    "set_model_accuracy",
    "set_error_rate",
    "record_deal_probability",
    "get_metrics_content",
    "record_batch",
    "measure_latency",
    "reset_metrics",
]
