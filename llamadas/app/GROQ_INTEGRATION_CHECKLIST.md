# Groq Integration Checklist

Pasos para integrar GroqAgent en el sistema existente.

---

## 1. Config Updates

### File: `app/config.py`

**Add to Settings class:**

```python
# --- Groq ---
groq_api_key: str = ""
groq_model: str = "mixtral-8x7b-32768"
groq_timeout_seconds: int = 8
groq_enabled: bool = True
```

**Update Settings `_inject_aws_secrets()` method:**

```python
def _inject_aws_secrets(self):
    # ... existing code (Gemini, ElevenLabs, etc) ...

    # Groq
    if not self.groq_api_key and self._secrets_client:
        key = self._secrets_client.get_groq_key()
        if key:
            self.groq_api_key = key
```

**Status:** Ready to implement
**Impact:** config.py only, backward compatible

---

## 2. Secrets Client Updates

### File: `app/secrets_client.py`

**Add new method:**

```python
def get_groq_key(self) -> Optional[str]:
    """Fetch Groq API key from AWS Secrets Manager.
    
    Secret structure:
        {
            "api_key": "gsk_xxxxxxxxxxxxxxxxxxxx"
        }
    """
    try:
        secret = self.client.get_secret_value(
            SecretId=f"silxarcrm/groq-api-key/{self.environment}"
        )
        return json.loads(secret["SecretString"]).get("api_key")
    except Exception as e:
        logger.warning(f"Failed to fetch Groq API key from Secrets Manager: {e}")
        return None
```

**Status:** Ready to implement
**Impact:** secrets_client.py only, optional (falls back to .env)

---

## 3. WebSocket Handler Integration

### File: `app/telephony/websocket_handler.py` (or equivalent)

**At module level (once per app startup):**

```python
from app.groq_client import GroqAgent
from app.groq_integration import GroqVoicePipeline
from app.config import settings

# Initialize Groq agent (once)
if settings.groq_enabled and settings.groq_api_key:
    groq_agent = GroqAgent(
        api_key=settings.groq_api_key,
        model=settings.groq_model,
        timeout_seconds=settings.groq_timeout_seconds,
    )
    groq_pipeline = GroqVoicePipeline(groq_agent)
else:
    groq_agent = None
    groq_pipeline = None
```

**In message handler (e.g., `on_media_received`):**

```python
async def on_media_received(event):
    """Handle audio from Twilio and generate SDR response."""
    
    # 1. Get transcribed user message (from STT)
    user_message = event.get("transcription", "")
    
    # 2. Generate response via Groq (if enabled)
    if groq_pipeline and user_message:
        response_text = await groq_pipeline.process_user_message(
            user_message=user_message,
            call_context=self.call_context,  # Your CallContext instance
        )
    else:
        # Fallback to existing logic (Gemini, etc)
        response_text = await self.existing_response_generation(user_message)
    
    # 3. Send to TTS
    audio = await tts_synthesize(response_text)
    await twilio_send_audio(audio)
```

**Status:** Ready to implement
**Impact:** WebSocket handler, non-breaking (feature flag via groq_enabled)

---

## 4. CallContext Enrichment

### File: `app/conversation/state.py` or `app/conversation/state_engine.py`

**Ensure CallContext has:**

```python
@dataclass
class CallContext:
    # ... existing fields ...
    
    # For Groq integration
    current_stage: str = "greeting"  # greeting, discovery, budget, timeline, demo, closing
    sentiment: str = "neutral"  # positive, neutral, negative
    pain_points: Optional[list[str]] = None
    budget_range: Optional[str] = None
    recent_messages: list[str] = field(default_factory=list)  # Last 5-10 turns
    call_duration_seconds: float = 0.0
```

**Status:** Likely already exists
**Impact:** Minimal (field additions only)

---

## 5. Observability Integration

### File: `app/observability/tracing.py` (or equivalent)

**Add Groq metrics export:**

```python
from opentelemetry import metrics

def setup_groq_metrics():
    """Initialize Groq-specific metrics."""
    meter = metrics.get_meter("groq_client")
    
    # Create histograms
    groq_ttft_histogram = meter.create_histogram(
        "groq_ttft_ms",
        description="Groq time to first token in milliseconds",
        unit="ms",
    )
    groq_total_time_histogram = meter.create_histogram(
        "groq_total_time_ms",
        description="Groq total request time in milliseconds",
        unit="ms",
    )
    groq_tokens_per_sec = meter.create_histogram(
        "groq_tokens_per_second",
        description="Groq tokens per second",
        unit="{tokens}/s",
    )
    
    return {
        "ttft": groq_ttft_histogram,
        "total_time": groq_total_time_histogram,
        "tps": groq_tokens_per_sec,
    }
```

**In GroqVoicePipeline.process_user_message():**

```python
# Record metrics (after response)
groq_metrics = setup_groq_metrics()
groq_metrics["ttft"].record(metrics.ttft_ms, {"stage": stage})
groq_metrics["total_time"].record(metrics.total_time_ms, {"stage": stage})
groq_metrics["tps"].record(metrics.tokens_per_second, {"stage": stage})
```

**Status:** Ready to implement
**Impact:** Observability layer, non-breaking

---

## 6. Alerts & Monitoring

### File: `app/alerting/slack_alerts.py` or equivalent

**Add latency alert:**

```python
async def alert_groq_latency_degradation(metrics_snapshot: dict):
    """Alert if Groq TTFT exceeds thresholds."""
    avg_ttft = metrics_snapshot.get("avg_ttft_ms", 0)
    
    if avg_ttft > 100:  # Alert if avg TTFT > 100ms
        await send_slack_alert(
            channel="#sales-ops-alerts",
            message=f"""
:warning: Groq latency alert
• Avg TTFT: {avg_ttft:.0f}ms (target: <50ms)
• Max TTFT: {metrics_snapshot.get('max_ttft_ms', 0):.0f}ms
• Samples: {metrics_snapshot.get('samples', 0)}
Check Groq status: https://status.groq.com/
            """,
        )
```

**Status:** Ready to implement (optional)
**Impact:** Alerting layer, non-breaking

---

## 7. Environment Setup

### Create/Update `.env`

```bash
# Development
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx  # Get from https://console.groq.com/
GROQ_MODEL=mixtral-8x7b-32768
GROQ_TIMEOUT_SECONDS=8
GROQ_ENABLED=true

# OR use AWS Secrets Manager (production preferred)
# Secret name: silxarcrm/groq-api-key/{ENVIRONMENT}
# Secret value: {"api_key": "gsk_xxxx"}
```

### AWS Secrets Manager Setup (Production)

```bash
# Create secret (one-time)
aws secretsmanager create-secret \
  --name "silxarcrm/groq-api-key/production" \
  --secret-string '{"api_key": "gsk_xxxxxxxxxxxxxxxxxxxx"}' \
  --region us-east-1

# Update secret
aws secretsmanager update-secret \
  --secret-id "silxarcrm/groq-api-key/production" \
  --secret-string '{"api_key": "gsk_xxxx"}'
```

**Status:** Ready to implement
**Impact:** Environment config only

---

## 8. Testing

### Run Unit Tests

```bash
# All tests
pytest app/test_groq_client.py -v

# Specific test
pytest app/test_groq_client.py::test_build_system_prompt_discovery -v

# Integration test (requires real API key)
export GROQ_API_KEY=gsk_xxxx
pytest app/test_groq_client.py::TestGroqAgentIntegration::test_real_api_call -v
```

**Status:** Ready to implement
**Impact:** Testing only, no production code changes

---

## 9. Documentation & Training

- [ ] Update README with Groq section
- [ ] Share GROQ_SETUP.md with team
- [ ] Document stage-to-prompt mapping in Notion/Wiki
- [ ] Create Groq API key management guide
- [ ] Train team on latency monitoring

**Status:** Ready to implement (GROQ_SETUP.md already created)

---

## Implementation Order

**Phase 1 (Day 1): Core Integration**
1. Add Groq config to `config.py` ✅
2. Add Groq secrets to `secrets_client.py` ✅
3. Copy `groq_client.py` to `app/` ✅
4. Copy `groq_integration.py` to `app/` ✅
5. Setup `.env` or AWS Secrets Manager

**Phase 2 (Day 2): WebSocket Integration**
6. Hook GroqAgent into WebSocket handler
7. Ensure CallContext has required fields
8. Test with mock data

**Phase 3 (Day 3): Production Readiness**
9. Add observability/metrics
10. Setup Slack alerts
11. Run integration tests with real API key
12. Monitor latency in production

---

## Rollback Plan

If issues arise:

1. **Set `groq_enabled=false` in config** → falls back to existing LLM (Gemini)
2. **No code changes required** — feature flag approach
3. **Existing conversation flow untouched**

---

## Files Created

✅ `app/groq_client.py` — Main client (production-ready)
✅ `app/groq_integration.py` — Pipeline wrapper + example usage
✅ `app/test_groq_client.py` — Unit + integration tests
✅ `app/GROQ_SETUP.md` — Setup & usage guide
✅ `app/GROQ_INTEGRATION_CHECKLIST.md` — This file

---

## Success Criteria

- [ ] Groq responses generated <50ms TTFT (avg)
- [ ] All stage-specific prompts working
- [ ] Fallback responses used if Groq unavailable
- [ ] Rate limits handled gracefully
- [ ] Latency metrics exported to observability
- [ ] 0 conversation disruptions from Groq timeouts
- [ ] Alerts setup for latency degradation

---

**Last updated:** 2026-06-23
