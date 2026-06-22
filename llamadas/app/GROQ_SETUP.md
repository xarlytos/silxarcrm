# GroqAgent Setup & Integration Guide

## Overview

`groq_client.py` proporciona un cliente async de Groq optimizado para respuestas SDR conversacionales en tiempo real.

**Características:**
- Ultra-fast LLM responses (~50-100ms TTFT con Mixtral)
- 6 etapas conversacionales optimizadas (greeting, discovery, budget, timeline, demo, closing)
- Latency tracking + fallback automático si timeout
- Rate limit handling con retry
- Production-ready

---

## Installation

### 1. Add Groq API Key to `.env`

```bash
# .env (desarrollo)
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx

# AWS Secrets Manager (producción)
# Configured en config.py via secrets_client.py
```

**Get API key:**
- Sign up: https://console.groq.com/
- Generate key in API Settings
- Free tier: 30 requests/min (más que suficiente para sales calls)

### 2. Update `config.py`

Add to `app/config.py` Settings class:

```python
# --- Groq ---
groq_api_key: str = ""
groq_model: str = "mixtral-8x7b-32768"  # Options: mixtral-8x7b-32768, llama-70b-8192, etc
groq_timeout_seconds: int = 8
groq_enabled: bool = True
```

### 3. Add to `secrets_client.py`

```python
def get_groq_key(self) -> Optional[str]:
    """Fetch Groq API key from Secrets Manager."""
    try:
        secret = self.client.get_secret_value(
            SecretId=f"silxarcrm/groq-api-key/{self.environment}"
        )
        return json.loads(secret["SecretString"]).get("api_key")
    except Exception as e:
        logger.warning(f"Failed to fetch Groq key: {e}")
        return None
```

And inject in Settings `__init__`:

```python
def _inject_aws_secrets(self):
    # ... existing code ...
    if not self.groq_api_key and self._secrets_client:
        key = self._secrets_client.get_groq_key()
        if key:
            self.groq_api_key = key
```

---

## Usage

### Basic Example

```python
from app.groq_client import GroqAgent
from app.config import settings

# Initialize (once per app startup)
groq_agent = GroqAgent(
    api_key=settings.groq_api_key,
    model="mixtral-8x7b-32768",
    timeout_seconds=8,
)

# Generate response
context = {
    "prospect_name": "Juan",
    "company": "Clínica Sonrisa",
    "niche": "dentista",
    "call_duration_ms": 15000,
    "sentiment": "positive",
    "pain_identified": True,
}

response_text, metrics = await groq_agent.generate_response(
    user_message="¿Cuánto cuesta?",
    context=context,
    stage="budget",
)

print(f"SDR: {response_text}")
print(f"TTFT: {metrics.ttft_ms:.0f}ms")
```

### Integration with Twilio Voice Pipeline

In your WebSocket handler (e.g., `app/telephony/websocket_handler.py`):

```python
from app.groq_client import GroqAgent
from app.groq_integration import GroqVoicePipeline
from app.config import settings

class TwilioVoiceHandler:
    def __init__(self):
        # Initialize once
        self.groq_agent = GroqAgent(api_key=settings.groq_api_key)
        self.groq_pipeline = GroqVoicePipeline(self.groq_agent)

    async def on_media_received(self, event):
        """Handle incoming audio from Twilio."""
        # 1. STT: audio → user_message (via ElevenLabs or Gemini)
        user_message = await self.transcribe_audio(event["media"]["payload"])

        # 2. Generate SDR response via Groq
        response_text = await self.groq_pipeline.process_user_message(
            user_message=user_message,
            call_context=self.call_context,  # Current conversation state
        )

        # 3. TTS: response_text → audio (via ElevenLabs)
        audio_payload = await self.synthesize_audio(response_text)

        # 4. Send back to Twilio
        await self.send_audio_to_twilio(audio_payload)

        # 5. Log latency for monitoring
        stats = self.groq_pipeline.get_latency_stats()
        logger.info(f"Groq latency stats: {stats}")
```

---

## Architecture

### Call Flow

```
User speaks
    ↓
STT (ElevenLabs/Gemini) — transcribe → user_message
    ↓
CallContext state update — detect stage, pain points, sentiment
    ↓
GroqAgent.generate_response() — user_message + context → response
    ↓
TTS (ElevenLabs) — synthesize → audio
    ↓
Twilio stream — send audio back to user
    ↓
repeat
```

### Conversation Stages

| Stage | Purpose | Example Question |
|-------|---------|------------------|
| **greeting** | Intro + pattern interrupt | "Estoy viendo que pierden 30% de citas" |
| **discovery** | Uncover pain points | "¿Cuántas citas se te pierden a la semana?" |
| **budget** | Understand financial capacity | "¿Cuál sería el ROI para justificar esto?" |
| **timeline** | Identify decision timeline | "¿Cuándo empezarían a implementarlo?" |
| **demo** | Schedule the demo | "¿Mañana a las 3 o prefieres pasado a las 10?" |
| **closing** | Handle final objections | Framework LAER (Listen, Acknowledge, Explore, Respond) |

### Models

**Mixtral 8x7b (RECOMMENDED)**
- TTFT: 50-100ms (ultra-fast)
- Quality: 95% como GPT-3.5
- Cost: $0.24/1M input tokens (barato)
- Best for: Real-time conversations

**LLaMA 70B**
- TTFT: 150-200ms (más lento)
- Quality: 98% como GPT-4
- Cost: $0.59/1M input tokens (más caro)
- Best for: Complex reasoning (si TTFT es aceptable)

---

## Error Handling

### Timeout (>8 seconds)
Automatically uses hardcoded fallback response:
```
"Claro, eso tiene mucho sentido. ¿Cuántas citas se te pierden a la semana?"
```

### Rate Limit (429)
Retries once after 1 second delay. If still fails, uses fallback.

### API Error (5xx)
Logs error, uses fallback. Does NOT crash.

---

## Latency Tuning

### Target: <50ms TTFT

If experiencing higher latency:

1. **Check model:** Mixtral is fastest, LLaMA is more accurate but slower
2. **Check context length:** Shorter context = faster response
   - Limit `previous_messages` to last 3-5 turns only
3. **Check network:** Latency to Groq servers (US-based)
4. **Check prompt:** Shorter system prompts = faster token generation
5. **Increase timeout if acceptable:** Change `timeout_seconds=10` or `12`

---

## Monitoring

### Log Latency Alerts

```python
# In GroqVoicePipeline
stats = pipeline.get_latency_stats()
# Returns:
# {
#   "avg_ttft_ms": 45.2,
#   "max_ttft_ms": 120.0,
#   "min_ttft_ms": 35.0,
#   "avg_total_ms": 150.5,
#   "avg_tps": 185.3,
#   "samples": 42,
# }
```

### Prometheus/CloudTrace Integration

Add to observability layer (tracing_backend in config):

```python
# Example with OpenTelemetry
from opentelemetry import metrics

meter = metrics.get_meter(__name__)
groq_ttft_histogram = meter.create_histogram("groq_ttft_ms")
groq_ttft_histogram.record(metrics.ttft_ms, {"stage": stage})
```

---

## Testing

### Run Unit Tests

```bash
pytest app/test_groq_client.py -v

# Single test
pytest app/test_groq_client.py::test_latency_tracking -v

# Integration test (requires GROQ_API_KEY)
export GROQ_API_KEY=gsk_xxxx
pytest app/test_groq_client.py::TestGroqAgentIntegration -v
```

### Mock Testing Example

```python
from unittest.mock import AsyncMock, patch

async def test_custom():
    agent = GroqAgent(api_key="test-key")
    
    with patch("httpx.AsyncClient.post") as mock_post:
        mock_response = AsyncMock()
        mock_response.json.return_value = {
            "choices": [{"message": {"content": "Respuesta de prueba"}}],
            "usage": {"completion_tokens": 10},
        }
        mock_post.return_value.__aenter__.return_value = mock_response
        
        response_text, metrics = await agent.generate_response(
            user_message="Hola",
            context={...},
            stage="greeting",
        )
        
        assert "Respuesta de prueba" in response_text
```

---

## Fallback Strategies

### Hardcoded Fallbacks (if Groq unavailable)

Each stage has pre-trained fallback responses:

```python
fallbacks = {
    "greeting": "Hola {name}, soy Carlos de SmartDental...",
    "discovery": "Claro, eso tiene mucho sentido...",
    "budget": "Entiendo. Lo que puedo decirte es...",
    "timeline": "Perfecto. Si esto resuelve tu problema...",
    "demo": "Entonces te parece bien una demo de 15 minutos...",
    "closing": "Entiendo tu preocupación, totalmente válida...",
}
```

### Fallback Chain

1. **Groq API call succeeds** → use response
2. **Groq timeout** → use stage-specific hardcoded fallback
3. **Groq rate limit** → retry 1x, then fallback
4. **Groq 5xx error** → fallback

---

## Production Checklist

- [ ] Add `groq_api_key` to AWS Secrets Manager
- [ ] Add Groq config fields to `config.py`
- [ ] Add `get_groq_key()` to `secrets_client.py`
- [ ] Update `groq_integration.py` to hook into your WebSocket handler
- [ ] Run `pytest app/test_groq_client.py` (all tests pass)
- [ ] Test with real Groq API key (integration test)
- [ ] Monitor latency (target: avg <50ms TTFT)
- [ ] Set up CloudTrace/Jaeger tracing for Groq calls
- [ ] Add Slack alerts if avg TTFT > 100ms
- [ ] Document in team Notion/Wiki

---

## Troubleshooting

### "APIError: 429 Too Many Requests"
- You've exceeded 30 req/min. Groq queues extras.
- Expected behavior. Retry handling is automatic.
- If persistent, contact Groq support or use LLaMA for better rate limits.

### "APIError: 401 Invalid API key"
- Check `.env` GROQ_API_KEY value
- Regenerate key in Groq console
- Verify no leading/trailing whitespace

### "TTFT > 200ms consistently"
- Check Groq status: https://status.groq.com/
- Try LLaMA instead of Mixtral (more stable, slower)
- Reduce context size (fewer previous messages)
- Check network latency (speed test to US servers)

### Response text is truncated or incomplete
- Increase `max_tokens` in `_call_groq_with_latency()` (currently 256)
- Check if response is naturally short (may be correct)

---

## References

- **Groq API Docs:** https://console.groq.com/docs/
- **Chat Models:** https://console.groq.com/docs/models
- **Rate Limits:** 30 requests/min (free tier), upgrade for more
- **Status:** https://status.groq.com/

---

**Last updated:** 2026-06-23
**Owner:** Sales Ops Engineering
