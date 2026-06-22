# Deal Activity Webhook Handler

Complete webhook handler for ingesting deal activity from external systems into SilxaCRM.

## Overview

The webhook handler receives deal activity events (calls, emails, demos) from external systems and:
1. Validates webhook signatures (HMAC-SHA256)
2. Persists activity records to the database
3. Triggers probability recalculation for the deal
4. Publishes events to Kafka for downstream consumers
5. Returns 202 Accepted

## API Endpoint

```
POST /webhooks/deal-activity
Content-Type: application/json
X-Webhook-Signature: <HMAC-SHA256 hex digest>
```

## Request Schema

### Headers
- `X-Webhook-Signature` (required): HMAC-SHA256 hex digest of the raw request body

### Body (JSON)

```json
{
  "deal_id": "string",
  "tipo": "CALL|EMAIL|DEMO",
  "resultado": "SUCCESS|FAILED|PENDING|POSTPONED",
  "resumen": "string (max 5000 chars)",
  "transcript": "string (optional, max 50000 chars)",
  "metadata": "object (optional)",
  "timestamp": "ISO 8601 (optional, defaults to now)"
}
```

### Field Descriptions

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `deal_id` | string | Yes | Unique deal identifier. Max 255 chars. |
| `tipo` | enum | Yes | Activity type: `CALL`, `EMAIL`, or `DEMO` |
| `resultado` | enum | Yes | Outcome: `SUCCESS`, `FAILED`, `PENDING`, or `POSTPONED` |
| `resumen` | string | Yes | Activity summary. Max 5000 chars. |
| `transcript` | string | No | Full transcript of the activity. Max 50000 chars. Stored separately for large payloads. |
| `metadata` | object | No | Flexible JSON for additional context (duration, participants, scores, etc.) |
| `timestamp` | ISO 8601 | No | Event timestamp. Defaults to server time if omitted. |

### Example Request

```bash
curl -X POST http://localhost:8000/webhooks/deal-activity \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: <signature>" \
  -d '{
    "deal_id": "deal_123_abc",
    "tipo": "CALL",
    "resultado": "SUCCESS",
    "resumen": "Prospect showed strong interest in Pro plan. Discussed ROI impact.",
    "transcript": "Agent: Hello... Prospect: Hi...",
    "metadata": {
      "duration_seconds": 1240,
      "sentiment_score": 0.85,
      "next_step": "send_proposal",
      "demo_scheduled": "2026-06-24T14:00:00Z"
    },
    "timestamp": "2026-06-22T10:30:00Z"
  }'
```

## Response

### Success (202 Accepted)

```json
{
  "activity_id": "act_uuid_string",
  "deal_id": "deal_123_abc",
  "status": "accepted",
  "timestamp": "2026-06-22T10:30:15.123Z"
}
```

### Validation Error (400 Bad Request)

```json
{
  "error": "Invalid deal_id (max 255 chars)"
}
```

Possible error messages:
- "Missing required field: {field}"
- "Invalid deal_id (max 255 chars)"
- "Invalid tipo. Expected one of: CALL, EMAIL, DEMO"
- "Invalid resultado. Expected one of: SUCCESS, FAILED, PENDING, POSTPONED"
- "Invalid resumen (max 5000 chars)"
- "transcript exceeds max length (50000 chars)"
- "metadata must be a dict"
- "Invalid timestamp format (expected ISO 8601)"
- "Invalid JSON"

### Unauthorized (401 Unauthorized)

```json
{
  "error": "Unauthorized: invalid signature"
}
```

### Server Error (500 Internal Server Error)

```json
{
  "error": "Internal server error"
}
```

### Service Unavailable (503 Service Unavailable)

```json
{
  "error": "Webhook service not initialized"
}
```

## Signature Validation

### Algorithm

The webhook signature is computed using HMAC-SHA256:

```
signature = HMAC-SHA256(webhook_secret, raw_request_body)
```

### Implementation Examples

#### Python

```python
import hmac
import hashlib
import json

webhook_secret = "your-webhook-secret"
raw_body = request.body  # Raw bytes, not parsed JSON
signature = request.headers.get("X-Webhook-Signature")

expected_signature = hmac.new(
    webhook_secret.encode('utf-8'),
    raw_body,
    hashlib.sha256
).hexdigest()

is_valid = hmac.compare_digest(expected_signature, signature)
```

#### JavaScript/Node.js

```javascript
const crypto = require('crypto');

const webhookSecret = 'your-webhook-secret';
const rawBody = req.rawBody; // Raw string, not parsed JSON
const signature = req.headers['x-webhook-signature'];

const expectedSignature = crypto
  .createHmac('sha256', webhookSecret)
  .update(rawBody)
  .digest('hex');

const isValid = crypto.timingSafeEqual(
  Buffer.from(expectedSignature),
  Buffer.from(signature)
);
```

#### Go

```go
import (
    "crypto/hmac"
    "crypto/sha256"
    "fmt"
    "io/ioutil"
)

webhookSecret := "your-webhook-secret"
rawBody, _ := ioutil.ReadAll(req.Body)
signature := req.Header.Get("X-Webhook-Signature")

h := hmac.New(sha256.New, []byte(webhookSecret))
h.Write(rawBody)
expectedSignature := fmt.Sprintf("%x", h.Sum(nil))

isValid := hmac.Equal(
    []byte(expectedSignature),
    []byte(signature),
)
```

## Database Schema

The webhook handler stores activities in the `deal_activities` table:

```sql
CREATE TABLE "deal_activities" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "deal_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "resultado" TEXT NOT NULL,
    "resumen" TEXT NOT NULL,
    "transcript" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX "deal_activities_deal_id_idx" ON "deal_activities"("deal_id");
CREATE INDEX "deal_activities_tipo_idx" ON "deal_activities"("tipo");
CREATE INDEX "deal_activities_created_at_idx" ON "deal_activities"("created_at");
CREATE INDEX "deal_activities_deal_id_created_at_idx" ON "deal_activities"("deal_id", "created_at");
```

## Kafka Integration

### Event Topic

Topic name: `deal-activities` (configurable via `KAFKA_DEAL_ACTIVITIES_TOPIC`)

### Event Schema

Events published to Kafka include:

```json
{
  "activity_id": "act_uuid_string",
  "deal_id": "deal_123_abc",
  "tipo": "CALL",
  "resultado": "SUCCESS",
  "resumen": "Prospect showed strong interest...",
  "transcript": "Agent: Hello...",
  "metadata": {...},
  "timestamp": "2026-06-22T10:30:00Z",
  "published_at": "2026-06-22T10:30:15.123Z"
}
```

### Partitioning

Events are partitioned by `deal_id` to ensure ordering guarantees per deal.

### Consumer Examples

#### Python (aiokafka)

```python
from aiokafka import AIOKafkaConsumer
import json

consumer = AIOKafkaConsumer(
    'deal-activities',
    bootstrap_servers='localhost:9092',
    group_id='probability-calculator',
    auto_offset_reset='earliest',
    value_deserializer=lambda m: json.loads(m.decode('utf-8')),
)

async for msg in consumer:
    activity = msg.value
    await recalculate_deal_probability(activity['deal_id'])
```

#### Node.js (kafkajs)

```javascript
const { Kafka } = require('kafkajs');

const kafka = new Kafka({
  clientId: 'probability-calculator',
  brokers: ['localhost:9092'],
});

const consumer = kafka.consumer({ groupId: 'probability-calculator' });
await consumer.connect();
await consumer.subscribe({ topic: 'deal-activities' });

await consumer.run({
  eachMessage: async ({ topic, partition, message }) => {
    const activity = JSON.parse(message.value.toString());
    await recalculateDealProbability(activity.deal_id);
  },
});
```

## Configuration

### Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `WEBHOOK_SECRET` | (empty) | Secret for HMAC signature validation. If empty, signature validation is skipped. |
| `KAFKA_BOOTSTRAP_SERVERS` | `localhost:9092` | Kafka brokers (comma-separated). |
| `KAFKA_DEAL_ACTIVITIES_TOPIC` | `deal-activities` | Kafka topic for deal activities. |

### Example .env

```env
WEBHOOK_SECRET=your-super-secret-key-256-bits-min
KAFKA_BOOTSTRAP_SERVERS=kafka1:9092,kafka2:9092,kafka3:9092
KAFKA_DEAL_ACTIVITIES_TOPIC=deal-activities
```

## Deployment Checklist

- [ ] Configure `WEBHOOK_SECRET` in production environment
- [ ] Configure `KAFKA_BOOTSTRAP_SERVERS` to point to your Kafka cluster
- [ ] Run database migration: `prisma migrate deploy`
- [ ] Verify webhook endpoint is accessible from external systems
- [ ] Set up monitoring/alerting for webhook failures
- [ ] Create Kafka consumer to process `deal-activities` topic
- [ ] Test signature validation with actual webhook secret
- [ ] Monitor Kafka consumer lag
- [ ] Document webhook endpoint in API documentation

## Health Check

```
GET /webhooks/health
```

Response (200 OK):

```json
{
  "status": "ok",
  "deal_activity_service": true,
  "signature_validator": true
}
```

## Audit Logging

All webhook events are logged to the audit trail:

- **API Call**: Logged as `api_call_complete` or `api_call_error`
- **Access Control**: Invalid signatures logged as `access_denied`
- **Resource Mutation**: Successful activities logged as `resource_created`

Access logs via:

```python
from app.observability.audit_logger import get_audit_logger

audit_logger = get_audit_logger()
# Events are automatically persisted to Kafka topic "audit-events"
```

## Error Handling

### Signature Validation Failure

- HTTP 401 Unauthorized
- Logged as access denial in audit trail
- Caller should verify webhook secret configuration

### Payload Validation Failure

- HTTP 400 Bad Request
- Error message indicates which field is invalid
- No database write occurs

### Database Insertion Failure

- HTTP 500 Internal Server Error
- Error is logged
- Caller should retry (implement exponential backoff)

### Kafka Publish Failure

- Activity is inserted into database successfully
- Kafka publish failure is logged but doesn't block response
- HTTP 202 Accepted is still returned
- Requires monitoring/alerting to detect missing events

## Security Considerations

1. **Signature Validation**: Always validate signatures in production
2. **HTTPS**: Use HTTPS for all webhook endpoints
3. **Secret Rotation**: Implement secret rotation mechanism
4. **Rate Limiting**: Consider implementing rate limiting per deal_id
5. **PII Handling**: Transcript field may contain PII; ensure proper encryption/masking
6. **Access Control**: Restrict webhook endpoint to known IPs if possible

## Monitoring & Observability

### Metrics to Track

- Webhook request rate (per minute/hour)
- Signature validation success/failure rate
- Payload validation error distribution
- Database insertion latency (p50, p95, p99)
- Kafka publish latency
- Overall webhook processing latency

### Log Lines to Monitor

```
[AUDIT] api_call_complete | webhooks/deal-activity | ...
[AUDIT] access_denied | ... | reason=Invalid signature
[ERROR] Failed to insert deal activity: ...
[ERROR] Failed to publish to Kafka: ...
```

### Alerting Rules

- Alert if signature validation failure rate > 5%
- Alert if database insertion errors > 0.1%
- Alert if Kafka publish failures > 0%
- Alert if webhook response latency > 1s (p95)

## Testing

### Unit Tests

```python
import pytest
from app.webhooks.deal_activity import (
    DealActivityPayload,
    WebhookSignatureValidator,
    validate_payload,
    ActivityType,
    ActivityResult,
)

def test_valid_payload():
    payload = {
        "deal_id": "deal_123",
        "tipo": "CALL",
        "resultado": "SUCCESS",
        "resumen": "Good call",
    }
    is_valid, error, validated = validate_payload(payload)
    assert is_valid
    assert validated.deal_id == "deal_123"

def test_signature_validation():
    validator = WebhookSignatureValidator("secret")
    body = b'{"test": "data"}'
    import hmac, hashlib
    sig = hmac.new(b"secret", body, hashlib.sha256).hexdigest()
    assert validator.validate(body, sig)
```

### Integration Test

```bash
# Generate signature
SECRET="your-webhook-secret"
BODY='{"deal_id":"deal_123","tipo":"CALL","resultado":"SUCCESS","resumen":"Test"}'
SIG=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$SECRET" | sed 's/^.* //')

# Send webhook
curl -X POST http://localhost:8000/webhooks/deal-activity \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  -d "$BODY"
```

## Future Enhancements

- [ ] Batch webhook ingestion (multiple activities per request)
- [ ] Webhook retry mechanism with exponential backoff
- [ ] Webhook delivery confirmation (delivery receipts)
- [ ] Deal probability recalculation with machine learning model
- [ ] Real-time probability updates to clients via WebSocket
- [ ] Activity enrichment (sentiment analysis, auto-tagging)
- [ ] Advanced filtering/querying of deal activities
- [ ] Activity timeline visualization in UI
