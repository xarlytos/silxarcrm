# Immutable Audit Trail — Audit Logger Documentation

## Overview

The **AuditLogger** provides an immutable, tamper-proof audit trail for all API calls and decisions in the Revenue AI system. All events are:

1. **Logged locally** (for immediate visibility)
2. **Sent to Kafka** (for immutable, distributed storage)
3. **Automatically redacted** (to mask sensitive PII/credentials)
4. **Timestamped and signed** (with audit_id for traceability)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Application                           │
├─────────────────────────────────────────────────────────────┤
│  API Call  │  Decision  │  Resource Mutation  │  Compliance │
└──────────┬──────────────────────────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────────────────────────┐
│               AuditLogger (main class)                       │
│  • Buffering (batch size = 10)                             │
│  • Redaction (emails, phones, SSNs, API keys)             │
│  • Periodic flush (every 5 seconds)                        │
└──────────┬──────────────────────────────────────────────────┘
           │
        ┌──┴──────────────────────┬──────────────────────┐
        ▼                         ▼                       ▼
   Local Logger             Kafka Producer         (Fallback if
   (JSON, stdout)           (async, buffered)       Kafka down)
        │                         │
        ▼                         ▼
   logs/**/*.log             Kafka Topic:
                            "audit-events"
                            (3 partitions, 30d retention)
```

---

## Installation

### 1. Install Kafka (Optional, for production)

```bash
# Docker Compose
docker-compose up -d kafka zookeeper

# Or use a managed service (AWS MSK, Confluent Cloud, etc.)
```

### 2. Install aiokafka (Optional, for Kafka support)

```bash
pip install aiokafka
```

If not installed, AuditLogger logs locally only.

---

## Quick Start

### 1. Initialize in FastAPI

```python
# app/main.py
from fastapi import FastAPI
from app.observability import AuditLogger, create_audit_topic

app = FastAPI()

@app.on_event("startup")
async def startup():
    # Create topic (idempotent, safe to call)
    await create_audit_topic(
        bootstrap_servers=["kafka:9092"],
        topic_name="audit-events",
        num_partitions=3,
        retention_ms=30 * 24 * 60 * 60 * 1000,  # 30 days
    )

    # Initialize audit logger
    logger = AuditLogger(
        kafka_bootstrap_servers="kafka:9092",
        topic="audit-events",
        enable_redaction=True,  # Mask PII
        batch_size=10,          # Flush every 10 events
        flush_interval_s=5.0,   # Or every 5 seconds
    )
    await logger.initialize()

    # Set as global default
    from app.observability import set_audit_logger
    set_audit_logger(logger)

@app.on_event("shutdown")
async def shutdown():
    logger = get_audit_logger()
    await logger.shutdown()
```

### 2. Use in API handlers

```python
from fastapi import APIRouter, Request
from app.observability import log_api_call, log_decision, log_resource_mutation, AuditAction

router = APIRouter()

@router.post("/prospects/{prospect_id}/call")
async def initiate_call(prospect_id: str, request: Request, current_user: str):
    """Initiate a call with audit logging."""
    
    # Log API call
    audit_id = await log_api_call(
        user_id=current_user,
        api="twilio",
        endpoint="/calls",
        method="POST",
        status_code=200,
        latency_ms=145,
        call_id="ca_12345",
        session_id="sess_xyz",
        request_data={"prospect_id": prospect_id},
        response_data={"call_sid": "CA_abc123"},
    )
    print(f"Audit ID: {audit_id}")
    
    # Log business decision
    decision_id = await log_decision(
        user_id=current_user,
        decision_type="call_routing",
        decision="route_to_closer",
        confidence=0.92,
        call_id="ca_12345",
        context={
            "lead_score": 85,
            "previous_interactions": 2,
            "estimated_deal_value": 50000,
        }
    )
    
    # Log resource creation
    mutation_id = await log_resource_mutation(
        user_id=current_user,
        action=AuditAction.RESOURCE_CREATED,
        resource="call_records",
        resource_id="call_12345",
        call_id="ca_12345",
        changes={
            "prospect_id": prospect_id,
            "agent_type": "closer",
            "start_time": "2024-01-15T10:30:00Z",
        },
        reason="Incoming call from prospect",
    )
    
    return {"status": "initiated", "audit_ids": [audit_id, decision_id, mutation_id]}


@router.post("/compliance/disclosure")
async def record_disclosure(prospect_id: str, current_user: str):
    """Record compliance disclosure."""
    
    from app.observability import log_compliance_event
    
    await log_compliance_event(
        user_id=current_user,
        compliance_type="ai_disclosure",
        status="success",
        details={
            "method": "voice_disclosure",
            "language": "es",
            "acknowledged": True,
        }
    )
    
    return {"status": "ok"}
```

---

## Redaction Rules

The AuditLogger automatically redacts sensitive data:

| Pattern | Example | Redacted |
|---------|---------|----------|
| Email | `user@example.com` | `***@***.***` |
| Phone | `+1-234-567-8900` | `***-***-****` |
| SSN | `123-45-6789` | `***-**-****` |
| Credit Card | `4111-1111-1111-1111` | `****-****-****-****` |
| API Key | `api_key=sk_live_abc123` | `api_key=***REDACTED***` |

Redaction is **recursive** — applies to nested objects, lists, and strings.

### Disable Redaction (Not recommended)

```python
logger = AuditLogger(enable_redaction=False)  # Stores raw data
```

---

## Event Types

### AuditAction Enum

```python
from app.observability import AuditAction, AuditSeverity

# API calls
AuditAction.API_CALL_START        # Before API request
AuditAction.API_CALL_COMPLETE     # Successful API call
AuditAction.API_CALL_ERROR        # Failed API call

# Decisions
AuditAction.DECISION_MADE         # Business logic decision
AuditAction.CLASSIFICATION_EXECUTED
AuditAction.STATE_TRANSITION

# Resource mutations
AuditAction.RESOURCE_CREATED      # Create resource
AuditAction.RESOURCE_UPDATED      # Update resource
AuditAction.RESOURCE_DELETED      # Delete resource

# Access control
AuditAction.ACCESS_GRANTED        # Permission granted
AuditAction.ACCESS_DENIED         # Permission denied
AuditAction.AUTHENTICATION_SUCCESS
AuditAction.AUTHENTICATION_FAILED

# Compliance
AuditAction.COMPLIANCE_CHECK      # Compliance event
AuditAction.POLICY_VIOLATION      # Violation detected

# System
AuditAction.CONFIG_CHANGED        # Configuration changed
AuditAction.ALERT_TRIGGERED       # Alert triggered
AuditAction.SERVICE_ERROR         # Service error
```

### AuditSeverity Enum

```python
AuditSeverity.INFO       # Normal operation
AuditSeverity.WARNING    # Potential issue
AuditSeverity.ERROR      # Error condition
AuditSeverity.CRITICAL   # Critical issue (violations, auth failures)
```

---

## API Reference

### AuditLogger Methods

#### `log_api_call()`

```python
audit_id = await logger.log_api_call(
    user_id="user_123",
    api="twilio",
    endpoint="/calls",
    method="POST",
    status_code=200,
    latency_ms=145,
    call_id="ca_12345",           # optional
    session_id="sess_xyz",        # optional
    error=None,                   # optional, if status_code >= 400
    request_data={...},           # optional, redacted
    response_data={...},          # optional, redacted
)
```

#### `log_decision()`

```python
audit_id = await logger.log_decision(
    user_id="user_123",
    decision_type="call_routing",
    decision="route_to_closer",
    confidence=0.92,
    call_id="ca_12345",           # optional
    session_id="sess_xyz",        # optional
    context={...},                # optional, decision context
)
```

#### `log_resource_mutation()`

```python
from app.observability import AuditAction

audit_id = await logger.log_resource_mutation(
    user_id="user_123",
    action=AuditAction.RESOURCE_CREATED,  # CREATED, UPDATED, or DELETED
    resource="call_records",
    resource_id="call_12345",
    call_id="ca_12345",           # optional
    session_id="sess_xyz",        # optional
    changes={...},                # optional, what changed
    reason="...",                 # optional, why changed
)
```

#### `log_access_control_event()`

```python
from app.observability import AuditAction

audit_id = await logger.log_access_control_event(
    user_id="user_123",
    action=AuditAction.ACCESS_GRANTED,   # or ACCESS_DENIED
    resource="calls/ca_12345",
    result=True,                  # True = granted, False = denied
    call_id="ca_12345",           # optional
    reason="...",                 # optional, why denied
)
```

#### `log_compliance_event()`

```python
audit_id = await logger.log_compliance_event(
    user_id="user_123",
    compliance_type="ai_disclosure",
    status="success",             # or "violation"
    call_id="ca_12345",           # optional
    session_id="sess_xyz",        # optional
    details={...},                # optional
)
```

#### `get_stats()`

```python
stats = logger.get_stats()
print(stats)
# {
#     "events_sent": 1543,
#     "events_failed": 2,
#     "buffer_size": 0,
#     "kafka_available": True,
#     "producer_initialized": True,
# }
```

---

## Querying Audit Events

### From Kafka (using kafka-python or similar)

```python
from aiokafka import AIOKafkaConsumer
import json

async def read_audit_events(topic="audit-events"):
    consumer = AIOKafkaConsumer(
        topic,
        bootstrap_servers="kafka:9092",
        group_id="audit-reader",
        auto_offset_reset="earliest",
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    )
    await consumer.start()
    
    async for message in consumer:
        event = message.value
        print(f"[{event['timestamp']}] {event['action']} | {event['resource']}")
        
        # Filter by user_id
        if event['user_id'] == "user_123":
            print(event)
    
    await consumer.stop()
```

### SQL Query (if using Kafka → Data Warehouse)

```sql
-- BigQuery example (assuming Kafka → Cloud Pubsub → BigQuery)
SELECT
    audit_id,
    timestamp,
    user_id,
    action,
    resource,
    outcome,
    severity,
    data
FROM `project.dataset.audit_events`
WHERE user_id = "user_123"
  AND action = "api_call_complete"
  AND timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 7 DAY)
ORDER BY timestamp DESC
LIMIT 100;
```

### Command Line (using kafka-console-consumer)

```bash
# Read last 10 messages
kafka-console-consumer \
  --bootstrap-server kafka:9092 \
  --topic audit-events \
  --from-beginning \
  --max-messages 10 \
  --property print.key=true \
  --property print.timestamp=true

# Or with jq filtering
kafka-console-consumer \
  --bootstrap-server kafka:9092 \
  --topic audit-events \
  --from-beginning | jq 'select(.user_id == "user_123") | .action'
```

---

## Performance Characteristics

| Metric | Value | Notes |
|--------|-------|-------|
| Latency (log event) | < 1ms | Async buffer, non-blocking |
| Batch size | 10 events | Configurable |
| Flush interval | 5 seconds | Configurable |
| Throughput | ~1000 events/sec | Per producer |
| Memory (buffer) | ~100KB | Typical, varies with data size |
| Kafka retention | 30 days | Configurable |

---

## Monitoring & Alerting

### Check Audit Logger Health

```python
from app.observability import get_audit_logger

logger = get_audit_logger()
stats = logger.get_stats()

# Alert if failures > 0
if stats['events_failed'] > 0:
    print(f"⚠️  {stats['events_failed']} audit events failed to send")

# Alert if Kafka not available
if not stats['kafka_available']:
    print("⚠️  Kafka producer not initialized (running in local-only mode)")
```

### Prometheus Metrics (optional)

```python
# If you add Prometheus instrumentation:
audit_events_sent = Counter('audit_events_sent', 'Total audit events sent')
audit_events_failed = Counter('audit_events_failed', 'Total audit events failed')
audit_buffer_size = Gauge('audit_buffer_size', 'Current audit buffer size')
```

---

## Best Practices

1. **Always log decisions that affect business logic** — This is the core of the audit trail
2. **Log API calls to external services** — Track dependencies and their performance
3. **Log resource mutations with reasons** — Understand why data changed
4. **Include context (call_id, user_id)** — Enable correlating events across systems
5. **Use appropriate severity levels** — Help with alerting and analysis
6. **Enable redaction in production** — Never store raw PII
7. **Flush periodically** — Don't rely only on batch size
8. **Monitor Kafka availability** — Handle graceful degradation if Kafka is down
9. **Retain 30+ days** — Compliance and incident investigation
10. **Archive to cold storage monthly** — Control Kafka storage costs

---

## Troubleshooting

### "aiokafka not available"

Install the dependency:
```bash
pip install aiokafka
```

The logger will still work locally (non-Kafka mode).

### "Failed to send audit event to Kafka"

1. Check Kafka broker is running: `telnet kafka 9092`
2. Check topic exists: `kafka-topics --bootstrap-server kafka:9092 --list`
3. Check network connectivity
4. Increase `batch_size` and `flush_interval_s` if high latency

### Topic creation fails

```python
# Manual topic creation
from app.observability import create_audit_topic

await create_audit_topic(
    bootstrap_servers=["kafka:9092"],
    topic_name="audit-events",
    num_partitions=3,
    replication_factor=1,  # Set to 3 in production
    retention_ms=30 * 24 * 60 * 60 * 1000,
)
```

### Events accumulating in buffer

Indicates Kafka is unreachable. Check logs:
```bash
# In production logs
grep "Failed to send audit event" logs/*.log
```

---

## Compliance & Security

### GDPR Compliance

Audit trail helps with:
- **Right to Audit** — Prove what happened and when
- **Right to Erasure** — Identify all records related to a user
- **Data Processing** — Track how data is used

Query for user data:
```sql
SELECT audit_id, timestamp, action, data
FROM audit_events
WHERE data LIKE '%user_id_to_erase%'
  OR user_id = 'user_id_to_erase';
```

### Tampering Prevention

1. **Immutable Kafka log** — Events cannot be modified once written
2. **Audit IDs** — UUID for each event (hard to spoof)
3. **Timestamps** — From system clock (verify with Kafka broker time)
4. **Kafka replication** — Multiple copies across brokers (3x default)
5. **Encryption in transit** — Use SSL/TLS for Kafka connections

Verify tampering is impossible:
```bash
# Kafka stores messages with:
# - Offset (strictly increasing)
# - Checksum (detects corruption)
# - Timestamp (from broker)
kafka-dump-log --print-all-metrics --files audit-events-0/00000000000000000000.log
```

---

## Production Deployment

### Docker Compose

```yaml
version: '3.8'

services:
  zookeeper:
    image: confluentinc/cp-zookeeper:7.5.0
    environment:
      ZOOKEEPER_CLIENT_PORT: 2181

  kafka:
    image: confluentinc/cp-kafka:7.5.0
    depends_on:
      - zookeeper
    ports:
      - "9092:9092"
    environment:
      KAFKA_BROKER_ID: 1
      KAFKA_ZOOKEEPER_CONNECT: zookeeper:2181
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1

  # Your FastAPI app
  app:
    build: .
    ports:
      - "8000:8000"
    environment:
      KAFKA_BOOTSTRAP_SERVERS: kafka:9092
    depends_on:
      - kafka
```

### AWS MSK (Managed Streaming for Kafka)

```python
# MSK configuration
logger = AuditLogger(
    kafka_bootstrap_servers=[
        "b-1.cluster.xxx.kafka.us-east-1.amazonaws.com:9092",
        "b-2.cluster.xxx.kafka.us-east-1.amazonaws.com:9092",
        "b-3.cluster.xxx.kafka.us-east-1.amazonaws.com:9092",
    ],
    topic="audit-events",
)
```

### Confluent Cloud

```python
# Confluent Cloud configuration
logger = AuditLogger(
    kafka_bootstrap_servers=["pkc-xxx.us-east-1.provider.confluent.cloud:9092"],
    topic="audit-events",
)
# Set SASL_USERNAME and SASL_PASSWORD env vars
```

---

## Cost Analysis

| Component | Volume | Cost |
|-----------|--------|------|
| Kafka storage (30d) | 50GB | $5-50/month (self-hosted) |
| Kafka instances (3x) | — | $500-1500/month (AWS MSK) |
| Data egress | — | $0.02/GB |
| **Total (self-hosted)** | — | **~$10/month** |
| **Total (AWS MSK)** | — | **~$500/month** |
| **Total (Confluent Cloud)** | — | **~$50-100/month** |

**ROI:** Audit trail pays for itself with one compliance incident (fines can exceed $1M).

---

## See Also

- `event_logger.py` — Structured event logging (EventBus)
- `tracing.py` — OpenTelemetry distributed tracing
- `advanced_alerts.py` — Alert engine
- `OBSERVABILITY_ARCHITECTURE.md` — Full observability guide
