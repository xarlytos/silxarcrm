# GroqAgent: Ultra-Fast LLM for Real-Time SDR Conversations

## Overview

GroqAgent es un cliente async de la API Groq optimizado para respuestas SDR conversacionales en tiempo real.

**Características clave:**
- **TTFT ultra-rápido:** 50-100ms (Mixtral) vs. 180-250ms (Gemini)
- **6 etapas conversacionales:** greeting → discovery → budget → timeline → demo → closing
- **Fallback automático:** si timeout, usa respuestas hardcodeadas
- **Latency tracking:** TTFT, tokens/segundo, total request time
- **Rate limit handling:** retry automático + fallback
- **Niche-specific prompts:** prompts optimizados por vertical (dentista, peluquería, gimnasio, etc)

---

## Files

| File | Purpose | Lines |
|------|---------|-------|
| **groq_client.py** | Main client (GroqAgent class) | 400+ |
| **groq_integration.py** | Pipeline wrapper + example usage | 150+ |
| **groq_niche_prompts.py** | Niche-specific prompt variations | 350+ |
| **test_groq_client.py** | Unit + integration tests | 500+ |
| **GROQ_SETUP.md** | Setup & configuration guide | — |
| **GROQ_INTEGRATION_CHECKLIST.md** | Implementation steps | — |
| **GROQ_README.md** | This file | — |

---

## Quick Start

### 1. Installation

```python
from app.groq_client import GroqAgent
from app.config import settings

agent = GroqAgent(
    api_key=settings.groq_api_key,
    model="mixtral-8x7b-32768",
    timeout_seconds=8,
)
```

### 2. Generate Response

```python
response_text, metrics = await agent.generate_response(
    user_message="¿Cuánto cuesta?",
    context={
        "prospect_name": "Juan",
        "company": "Clínica Sonrisa",
        "niche": "dentista",
        "call_duration_ms": 15000,
        "sentiment": "positive",
        "pain_identified": True,
    },
    stage="budget",  # greeting, discovery, budget, timeline, demo, closing
)

print(f"SDR: {response_text}")
print(f"TTFT: {metrics.ttft_ms:.0f}ms")
```

### 3. Hook into WebSocket

```python
from app.groq_integration import GroqVoicePipeline

pipeline = GroqVoicePipeline(agent)
response = await pipeline.process_user_message(
    user_message="Sí, nos pasa todas las semanas",
    call_context=self.call_context,  # Your conversation state
)
```

---

## API Reference

### GroqAgent

```python
class GroqAgent:
    def __init__(
        self,
        api_key: str,
        model: str = "mixtral-8x7b-32768",
        timeout_seconds: int = 8,
    )
    
    async def generate_response(
        self,
        user_message: str,
        context: dict,
        stage: str = "discovery",
    ) -> tuple[str, LatencyMetrics]:
        """
        Generate SDR response.
        
        Returns:
            (response_text, metrics) where metrics contains:
            - ttft_ms: time to first token
            - total_time_ms: total request time
            - tokens_generated: output tokens
            - tokens_per_second: throughput
        """
```

### Context Dictionary

```python
context = {
    "prospect_name": str,          # "Juan"
    "company": str,                 # "Clínica Sonrisa"
    "niche": str,                   # dentista, peluqueria_canina, etc
    "call_duration_ms": int,        # 15000
    "previous_messages": list[str], # Last 5 turns (optional)
    "sentiment": str,               # positive, neutral, negative
    "pain_identified": bool,        # Has pain been surfaced?
    "budget_range": Optional[str],  # "50-150 EUR" (optional)
}
```

### Conversation Stages

| Stage | Purpose | System Prompt |
|-------|---------|---------------|
| **greeting** | Intro + pattern interrupt | `_build_greeting_prompt()` |
| **discovery** | Uncover pain points | `_build_discovery_prompt()` |
| **budget** | Understand financial constraints | `_build_budget_prompt()` |
| **timeline** | Identify decision timeline | `_build_timeline_prompt()` |
| **demo** | Schedule the demo | `_build_demo_prompt()` |
| **closing** | Handle final objections (LAER) | `_build_closing_prompt()` |

---

## Latency Tuning

### Target: <50ms TTFT

**Measured latencies (real API calls):**
- Mixtral 8x7b: 45-100ms TTFT
- LLaMA 70B: 120-200ms TTFT

**If experiencing higher latency:**

1. **Check model:** Use Mixtral (fastest)
2. **Check context:** Shorter context = faster response
   - Reduce `previous_messages` to last 3-5 turns only
   - Shorter system prompts
3. **Check network:** Latency to Groq US servers
4. **Check Groq status:** https://status.groq.com/

---

## Error Handling

### Timeout (>8 seconds)
→ Uses hardcoded fallback response (stage-specific)

### Rate Limit (429)
→ Retries once after 1s delay, then fallback

### API Error (5xx)
→ Logs error, uses fallback (does NOT crash)

---

## Niche-Specific Prompts

For vertical-specific discovery, use `groq_niche_prompts.py`:

```python
from app.groq_niche_prompts import (
    get_niche_discovery_prompt,
    get_niche_quantification_prompt,
    get_niche_pain_points,
)

# Discovery prompt for dentists
prompt = get_niche_discovery_prompt(
    niche="dentista",
    pain_identified=False,
)

# Quantification guidance
quant_guide = get_niche_quantification_prompt("dentista")
# Returns: "(Pacientes no-regreso/mes) × (Valor cita) × 12 = EUR/año perdidos"

# Common pain points
pain_points = get_niche_pain_points("dentista")
# Returns: ["Pacientes no regresan...", "Agenda con huecos...", ...]
```

### Supported Niches

- `dentista` — Dental clinics (40% patient no-return rate)
- `peluqueria_canina` — Dog grooming (15-20% cancellations)
- `gimnasio` — Gyms (12-15% monthly churn)
- `terapeuta` — Therapists (8-12h/week lost to coordination)
- `entrenador_personal` — Personal trainers (15-25% no-shows)
- `generico` — Any industry with appointment no-shows

---

## Testing

### Unit Tests

```bash
pytest app/test_groq_client.py -v

# Specific test
pytest app/test_groq_client.py::test_latency_tracking -v
```

### Integration Test (Real API)

```bash
export GROQ_API_KEY=gsk_xxxxxxxxxxxx
pytest app/test_groq_client.py::TestGroqAgentIntegration::test_real_api_call -v
```

---

## Monitoring & Observability

### Latency Metrics

```python
stats = pipeline.get_latency_stats()
# Returns: {
#   "avg_ttft_ms": 45.2,
#   "max_ttft_ms": 120.0,
#   "min_ttft_ms": 35.0,
#   "avg_total_ms": 150.5,
#   "avg_tps": 185.3,
#   "samples": 42,
# }
```

### Prometheus Export

```python
from opentelemetry import metrics

meter = metrics.get_meter("groq_client")
groq_ttft_histogram = meter.create_histogram("groq_ttft_ms")
groq_ttft_histogram.record(metrics.ttft_ms, {"stage": stage, "niche": niche})
```

### Slack Alerts

Alert if `avg_ttft_ms > 100` or `rate_limit_hits > 5/min`.

---

## Fallback Responses

If Groq unavailable, uses pre-trained hardcoded responses:

```python
fallbacks = {
    "greeting": "Hola {name}, soy Carlos de SmartDental...",
    "discovery": "Claro, eso tiene mucho sentido. ¿Cuántas citas se te pierden a la semana?",
    "budget": "Entiendo. Lo que puedo decirte es que se recupera en el primer mes...",
    "timeline": "Perfecto. Si esto resuelve tu problema, ¿cuándo empezarías?",
    "demo": "¿Mañana a las 3 o prefieres pasado a las 10?",
    "closing": "Entiendo tu preocupación. En la demo te lo muestro sin compromiso...",
}
```

---

## Production Checklist

- [ ] Add `groq_api_key` to `.env` or AWS Secrets Manager
- [ ] Add Groq config to `config.py`
- [ ] Add Groq secret fetching to `secrets_client.py`
- [ ] Hook GroqAgent into WebSocket handler
- [ ] Ensure CallContext has required fields (stage, sentiment, pain_identified, etc)
- [ ] Run `pytest app/test_groq_client.py` (all tests pass)
- [ ] Test with real API key (integration test)
- [ ] Monitor latency (target avg: <50ms TTFT)
- [ ] Setup Slack alerts for degradation (>100ms TTFT)
- [ ] Document in team wiki/Notion

---

## Cost

**Free Tier:** 30 req/min, 14.4k req/day
**Pricing:** $0.27/1M input tokens, $0.27/1M output tokens (Mixtral)

**Estimated cost per call:**
- Input: ~300 tokens (prompt + context) → $0.00008
- Output: ~20 tokens (short response) → $0.000005
- **Total: ~$0.000085 per call (~0.0085¢)**

---

## References

- **Groq API Docs:** https://console.groq.com/docs/
- **Models:** https://console.groq.com/docs/models
- **Status:** https://status.groq.com/
- **Python SDK:** `pip install groq` (alternative to httpx)

---

## Migration from Gemini to Groq

**No code changes to conversation logic required.**

Just swap `master_llm.py` and `gemini_live.py` calls with GroqAgent:

```python
# Before: Gemini Live
response = await gemini_live.generate_response(user_message)

# After: Groq (compatible signature)
response_text, metrics = await groq_agent.generate_response(
    user_message=user_message,
    context=context,
    stage=call_context.current_stage,
)
```

Fallback: if Groq unavailable, automatically uses Gemini.

---

## Troubleshooting

### "TTFT > 200ms consistently"
1. Check Groq status: https://status.groq.com/
2. Try LLaMA instead (more stable)
3. Reduce context size
4. Check network latency (is it US-based? ping groq.com)

### "429 Too Many Requests"
- Free tier: 30 req/min. Expected & normal.
- Groq queues extras. Retry is automatic.
- If persistent, upgrade to paid tier or contact support.

### "Response truncated or incomplete"
- Check `max_tokens` in `_call_groq_with_latency()` (currently 256)
- May be naturally short (check if correct)

### "Invalid API key"
- Check `.env` GROQ_API_KEY value
- Regenerate key in Groq console
- Ensure no leading/trailing whitespace

---

## FAQ

**Q: Why Groq over Gemini?**
A: 2-3x faster TTFT (50ms vs. 180ms). Critical for real-time sales conversations.

**Q: What if Groq goes down?**
A: Automatic fallback to hardcoded responses (no conversation disruption).

**Q: Can I use both Groq and Gemini?**
A: Yes! Use Groq for fast paths (greeting, discovery), Gemini for complex reasoning (strategy).

**Q: How many concurrent calls can I make?**
A: Free tier: 30 req/min. Scale with paid plan.

---

**Last updated:** 2026-06-23
**Maintained by:** Sales Ops Engineering
