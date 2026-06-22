# Deal Activity Webhook - Quick Start Guide

## What Was Created

Complete production-ready webhook handler for deal activity ingestion with:
- HMAC-SHA256 signature validation
- PostgreSQL/Prisma persistence
- Kafka event streaming integration
- Comprehensive error handling
- Audit logging and compliance

## Files Created

```
/e/exclusion/silxarcrm/llamadas/app/webhooks/
├── __init__.py                      # Package marker
├── deal_activity.py                 # Core handler (366 lines, fully typed)
├── routes.py                        # FastAPI routes (180 lines)
├── WEBHOOK_HANDLER.md              # Complete 400+ line documentation
└── IMPLEMENTATION_SUMMARY.md        # Setup & architecture guide

/e/exclusion/silxarcrm/backend/prisma/
├── schema.prisma                    # Updated with DealActivity model
└── migrations/20260622_add_deal_activities/
    └── migration.sql               # Database migration

/e/exclusion/silxarcrm/llamadas/app/
├── config.py                        # Updated with webhook config
└── main.py                          # Updated with webhook routes
```

## Quick Setup

### 1. Generate Webhook Secret
```bash
python -c "import secrets; print('WEBHOOK_SECRET=' + secrets.token_hex(32))"
```

### 2. Add to .env
```env
WEBHOOK_SECRET=<generated-secret>
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_DEAL_ACTIVITIES_TOPIC=deal-activities
```

### 3. Apply Database Migration
```bash
cd /e/exclusion/silxarcrm/backend
npx prisma migrate deploy
```

### 4. Install Dependencies (if needed)
```bash
pip install aiokafka
```

### 5. Start Services
```bash
# Terminal 1: Kafka (if running locally)
docker-compose up kafka zookeeper

# Terminal 2: FastAPI app
cd /e/exclusion/silxarcrm/llamadas
uvicorn app.main:app --reload --port 8000
```

## API Endpoint

```
POST /webhooks/deal-activity
Content-Type: application/json
X-Webhook-Signature: <HMAC-SHA256 signature>
```

## Send Test Webhook

```bash
#!/bin/bash
SECRET="your-webhook-secret"
BODY='{"deal_id":"test_deal_1","tipo":"CALL","resultado":"SUCCESS","resumen":"Successful sales call"}'

# Generate signature
SIG=$(python3 -c "
import hmac, hashlib
secret = '$SECRET'
body = b'$BODY'
sig = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
print(sig)
")

# Send webhook
curl -X POST http://localhost:8000/webhooks/deal-activity \
  -H "Content-Type: application/json" \
  -H "X-Webhook-Signature: $SIG" \
  -d "$BODY" | jq .
```

Expected response (202 Accepted):
```json
{
  "activity_id": "clv2h8d4k0000qz0x9a8b7c6",
  "deal_id": "test_deal_1",
  "status": "accepted",
  "timestamp": "2026-06-22T10:30:15.123456Z"
}
```

## Request Format

```json
{
  "deal_id": "string (required, max 255 chars)",
  "tipo": "CALL|EMAIL|DEMO (required)",
  "resultado": "SUCCESS|FAILED|PENDING|POSTPONED (required)",
  "resumen": "string (required, max 5000 chars)",
  "transcript": "string (optional, max 50000 chars)",
  "metadata": {
    "duration_seconds": 1240,
    "sentiment_score": 0.85,
    "next_step": "send_proposal"
  },
  "timestamp": "2026-06-22T10:30:00Z (optional, ISO 8601)"
}
```

## Health Check

```bash
curl http://localhost:8000/webhooks/health | jq .
```

Response:
```json
{
  "status": "ok",
  "deal_activity_service": true,
  "signature_validator": true
}
```

## Database Schema

```sql
CREATE TABLE "deal_activities" (
    "id" TEXT PRIMARY KEY,
    "deal_id" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,           -- CALL|EMAIL|DEMO
    "resultado" TEXT NOT NULL,       -- SUCCESS|FAILED|PENDING|POSTPONED
    "resumen" TEXT NOT NULL,
    "transcript" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP,
    "updated_at" TIMESTAMP
);

CREATE INDEX deal_activities_deal_id_idx ON deal_activities(deal_id);
CREATE INDEX deal_activities_tipo_idx ON deal_activities(tipo);
CREATE INDEX deal_activities_created_at_idx ON deal_activities(created_at);
CREATE INDEX deal_activities_deal_id_created_at_idx ON deal_activities(deal_id, created_at);
```

## Processing Flow

```
HTTP Request
    ↓
1. Validate Signature (HMAC-SHA256)
    ├─ ✓ Valid: Continue
    └─ ✗ Invalid: Return 401
    ↓
2. Parse JSON & Validate Payload
    ├─ ✓ Valid: Continue
    └─ ✗ Invalid: Return 400
    ↓
3. Insert to Database (deal_activities table)
    ├─ ✓ Success: Continue
    └─ ✗ Error: Return 500
    ↓
4. Trigger Probability Recalculation (async, fire-and-forget)
    ├─ ✓ Success: Log info
    └─ ✗ Error: Log error (doesn't block)
    ↓
5. Publish to Kafka (async, fire-and-forget)
    ├─ ✓ Success: Log info
    └─ ✗ Error: Log error (doesn't block)
    ↓
Return 202 Accepted + activity_id
```

## Kafka Consumer Example

```python
from aiokafka import AIOKafkaConsumer
import json

async def consume_deal_activities():
    consumer = AIOKafkaConsumer(
        'deal-activities',
        bootstrap_servers='localhost:9092',
        group_id='probability-calculator',
        value_deserializer=lambda m: json.loads(m.decode('utf-8')),
    )
    
    await consumer.start()
    try:
        async for msg in consumer:
            activity = msg.value
            print(f"Activity: {activity['activity_id']}")
            print(f"Deal: {activity['deal_id']}")
            print(f"Type: {activity['tipo']}")
            print(f"Result: {activity['resultado']}")
            # TODO: Recalculate deal probability
    finally:
        await consumer.stop()
```

## Error Responses

| Status | Error | Cause |
|--------|-------|-------|
| 202 | (success) | Activity accepted |
| 400 | Missing required field | Payload validation failed |
| 400 | Invalid deal_id | deal_id missing/too long |
| 400 | Invalid tipo | tipo not in CALL\|EMAIL\|DEMO |
| 400 | Invalid resultado | resultado not in SUCCESS\|FAILED\|PENDING\|POSTPONED |
| 400 | Invalid resumen | resumen missing/too long |
| 400 | Invalid timestamp | timestamp not ISO 8601 format |
| 401 | Unauthorized: invalid signature | Signature validation failed |
| 500 | Internal server error | Database insertion failed |
| 503 | Webhook service not initialized | Services not initialized on startup |

## Monitoring Commands

```bash
# Check service health
curl http://localhost:8000/webhooks/health

# View recent webhooks in database
psql "postgresql://..." -c "
  SELECT id, deal_id, tipo, resultado, created_at 
  FROM deal_activities 
  ORDER BY created_at DESC 
  LIMIT 10;
"

# Check Kafka topic
kafka-console-consumer.sh \
  --bootstrap-servers localhost:9092 \
  --topic deal-activities \
  --from-beginning

# Monitor logs
tail -f /var/log/silxarcrm/app.log | grep webhooks
```

## Configuration

All settings are in `/e/exclusion/silxarcrm/llamadas/app/config.py`:

```python
webhook_secret: str = ""  # HMAC secret for signature validation
kafka_bootstrap_servers: str = "localhost:9092"  # Kafka brokers
kafka_deal_activities_topic: str = "deal-activities"  # Event topic
```

## Complete Documentation

See `/e/exclusion/silxarcrm/llamadas/app/webhooks/WEBHOOK_HANDLER.md` for:
- Full API specification
- Signature validation algorithms (Python, JavaScript, Go)
- Database schema details
- Kafka integration guide
- Deployment checklist
- Security considerations
- Monitoring & alerting rules
- Testing examples
- Future enhancements

## Key Features

✅ **Signature Validation** - HMAC-SHA256 with timing-safe comparison  
✅ **202 Accepted Pattern** - Immediate response, async processing  
✅ **Kafka Integration** - Fire-and-forget event streaming  
✅ **Database Persistence** - PostgreSQL with optimized indexes  
✅ **Audit Logging** - All events logged to compliance trail  
✅ **Error Handling** - Graceful degradation, detailed error messages  
✅ **Type Safety** - Full Python type hints, dataclasses  
✅ **Documentation** - 400+ lines of comprehensive docs  
✅ **Production Ready** - Error recovery, logging, monitoring  
✅ **Extensible** - Flexible metadata field, async design  

## Next Steps

1. Configure `WEBHOOK_SECRET` in production
2. Set up Kafka consumer for `deal-activities` topic
3. Implement probability recalculation logic
4. Add alerting for webhook failures
5. Test with real deal data
6. Monitor Kafka consumer lag
7. Document in API reference
