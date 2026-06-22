# PipelineRouter Usage Guide

## Overview

`PipelineRouter` intelligently routes user messages to the optimal AI pipeline based on detected intent:

- **Groq** (70% traffic): Fast, simple queries (budget, timeline, demo logistics)
- **Gemini** (30% traffic): Complex reasoning (objections, negotiation, strategy)
- **Fallback chain**: Automatic failover if rate-limited

## Quick Start

### Basic Usage

```python
from llamadas.app.router import PipelineRouter, RouterConfig

# Initialize router with default config
router = PipelineRouter()

# Route a message
pipeline = await router.route_to_pipeline("¿Cuál es tu presupuesto?")
# Returns: "groq" (budget intent → simple → Groq)

pipeline = await router.route_to_pipeline("Es muy caro")
# Returns: "gemini" (objection intent → complex → Gemini)
```

### Custom Configuration

```python
config = RouterConfig(
    use_hybrid_routing=True,           # Enable Groq/Gemini split
    groq_traffic_percentage=80,        # 80% to Groq, 20% to Gemini
    fallback_to_gemini=True,           # Fallback if Groq rate-limited
    enable_metrics=True,               # Track routing decisions
    fallback_latency_threshold_ms=500, # Alert if routing > 500ms
)

router = PipelineRouter(config)
```

### Module-Level Singleton

```python
from llamadas.app.router import init_router, get_router

# Initialize once at app startup
init_router(RouterConfig(use_hybrid_routing=True, groq_traffic_percentage=70))

# Use throughout app
router = get_router()
pipeline = await router.route_to_pipeline(user_message)
```

## Intent Detection

### Detected Intents

| Intent | Keywords | Pipeline | Use Case |
|--------|----------|----------|----------|
| `budget_ask` | presupuesto, precio, dinero, costo, tarifa, cuanto cuesta | **Groq** | "¿Cuánto cuesta?" |
| `timeline` | cuando, pronto, urgente, ahora, necesito, demo, prueba | **Groq** | "¿Cuándo puedo empezar?" |
| `objection` | caro, competencia, objeción, demasiado, alternativa | **Gemini** | "Me parece muy caro" |
| `negotiation` | descuento, oferta, promoción, negociar, paquete | **Gemini** | "¿Hay descuento?" |
| `strategy` | comparar, análisis, roi, retorno, impacto, ventaja | **Gemini** | "¿Cómo es tu ROI?" |
| `unknown` | (no keywords matched) | **Groq** | Generic conversation |

### Confidence Scores

- **0.85+**: Strong keyword match (e.g., "presupuesto" found)
- **0.60-0.85**: Weak match or context-dependent
- **<0.60**: Unknown intent, routes to Groq as safe default

## Routing Logic

### Non-Hybrid Mode (simple intent-based)

```python
config = RouterConfig(use_hybrid_routing=False)
# Intent → Pipeline mapping:
# - budget_ask, timeline → Groq
# - objection, negotiation, strategy → Gemini
# - unknown → Groq
```

### Hybrid Mode (traffic allocation)

```python
config = RouterConfig(
    use_hybrid_routing=True,
    groq_traffic_percentage=70
)
# Simple intents (budget, timeline, unknown):
#   - 70% → Groq
#   - 30% → Gemini (for testing/gradual migration)
# Complex intents → Always Gemini (ignores percentage)
```

**Deterministic per User**:

```python
# Same user always routes to same pipeline (within traffic bucket)
await router.route_to_pipeline(
    message,
    context={"user_id": "user_123"}
)
# user_123 always gets same pipeline choice for budget queries
```

### Fallback Behavior

```python
# If Groq is rate-limited, automatically fallback to Gemini
context = {
    "groq_rate_limited": True,  # Set by Groq pipeline after 429 error
    "gemini_rate_limited": False,
}
pipeline = await router.route_to_pipeline(message, context=context)
# Returns: "gemini" (fallback triggered)

# Error if both are rate-limited
context = {
    "groq_rate_limited": True,
    "gemini_rate_limited": True,
}
pipeline = await router.route_to_pipeline(message, context=context)
# Raises: ValueError("Groq rate-limited and fallback disabled...")
```

## Metrics & Monitoring

### View Recent Routes

```python
# Get last 10 routing decisions
metrics = router.get_metrics(limit=10)
# [
#   {
#     "timestamp": "2026-06-23T10:30:45.123",
#     "detected_intent": "budget_ask",
#     "intent_confidence": 0.95,
#     "selected_pipeline": "groq",
#     "routing_reason": "traffic_allocation",
#     "latency_ms": 5.2,
#     "fallback_triggered": false,
#   },
#   ...
# ]

# Filter by intent
budget_metrics = router.get_metrics(intent_filter=Intent.BUDGET_ASK)
```

### Get Statistics

```python
stats = router.get_stats()
# {
#   "total_routes": 342,
#   "pipeline_distribution": {
#     "groq": {"count": 239, "percentage": 69.9},
#     "gemini": {"count": 103, "percentage": 30.1},
#   },
#   "intent_distribution": {
#     "budget_ask": {"count": 145, "percentage": 42.4},
#     "objection": {"count": 89, "percentage": 26.0},
#     "timeline": {"count": 78, "percentage": 22.8},
#     "unknown": {"count": 30, "percentage": 8.8},
#   },
#   "latency_stats_ms": {
#     "avg": 8.5,
#     "max": 45.3,
#     "p95": 12.1,
#   },
#   "fallback_count": 12,
#   "fallback_rate": 3.5,  # % of requests that triggered fallback
# }
```

### Latency Alerts

If routing decision takes > 500ms (configurable):

```
WARNING: Router latency exceeded 500ms: 523.4ms (intent=budget_ask)
```

These are logged when `enable_latency_alerts=True` (default).

## Integration Examples

### With FastAPI

```python
from fastapi import FastAPI
from llamadas.app.router import init_router, get_router

app = FastAPI()

@app.on_event("startup")
async def startup():
    init_router()  # Initialize at startup

@app.post("/route")
async def route_message(message: str, user_id: str = None):
    router = get_router()
    pipeline = await router.route_to_pipeline(
        message,
        context={"user_id": user_id}
    )
    return {
        "message": message,
        "selected_pipeline": pipeline,
        "stats": router.get_stats(),
    }
```

### With Voice Call Handler

```python
async def handle_incoming_call(call_id, user_message, user_id):
    """Route voice call to appropriate AI pipeline."""
    router = get_router()
    
    pipeline = await router.route_to_pipeline(
        user_message,
        context={
            "user_id": user_id,
            "groq_rate_limited": groq_client.is_rate_limited(),
            "gemini_rate_limited": gemini_client.is_rate_limited(),
        }
    )
    
    if pipeline == "groq":
        response = await groq_client.call(user_message)
    elif pipeline == "gemini":
        response = await gemini_client.call(user_message)
    
    return response

# Update rate-limit status after calls
router.set_rate_limit_status(Pipeline.GROQ, is_rate_limited=True)
```

### Monitoring Dashboard

```python
@app.get("/router/stats")
async def get_router_stats():
    """Expose router stats for monitoring."""
    router = get_router()
    return router.get_stats()

# Returns:
# {
#   "total_routes": 5432,
#   "fallback_rate": 2.3,
#   "latency_stats_ms": {
#     "avg": 7.2,
#     "p95": 18.5,
#     "max": 127.3,
#   },
#   ...
# }
```

## Advanced Configuration

### Custom Intent Confidence Threshold

```python
config = RouterConfig(
    min_intent_confidence=0.7,  # Raise threshold to 70%
    keyword_confidence_boost=0.20,  # Boost confidence by 20% if keyword found
)
# Now "es caro" (weak objection signal) might not reach 70%
# Only strong matches like "me parece muy caro" will trigger OBJECTION intent
```

### Disable Metrics to Save Memory

```python
config = RouterConfig(
    enable_metrics=False,  # Don't store routing metrics
    enable_latency_alerts=False,  # Don't log latency warnings
)
# Useful for high-volume production to reduce memory footprint
```

### Increase Metrics Buffer

```python
config = RouterConfig(
    metrics_buffer_size=10000,  # Store last 10K routes instead of 1K
)
# Useful for detailed post-call analysis or debugging
```

## Testing

Run the test suite:

```bash
pytest llamadas/app/test_router.py -v

# Test specific functionality
pytest llamadas/app/test_router.py::TestIntentDetector -v
pytest llamadas/app/test_router.py::TestPipelineRouter -v
```

## Troubleshooting

### Routes always go to Groq

**Check**: Is `use_hybrid_routing=False`?

```python
config = RouterConfig(use_hybrid_routing=True)  # Enable hybrid
router = PipelineRouter(config)
```

### Latency > 500ms

**Cause**: Intent detector is doing heavy regex matching or system is overloaded

**Fix**: 
- Increase `fallback_latency_threshold_ms` if acceptable for your use case
- Or disable metrics: `enable_latency_alerts=False`

### Metrics buffer growing unbounded

**Check**: `enable_metrics=True` without cleanup

**Fix**:
```python
# Periodically clear old metrics
if len(router.metrics_buffer) > router.config.metrics_buffer_size * 0.8:
    router.metrics_buffer.clear()
```

### Rate-limit fallback not working

**Check**: Make sure to call `set_rate_limit_status()` after pipeline calls:

```python
try:
    response = await groq_client.call(message)
except RateLimitError:
    router.set_rate_limit_status(Pipeline.GROQ, True)
    # Next route will fallback to Gemini
```

## Production Checklist

- [ ] Configure `groq_traffic_percentage` based on your Groq quota
- [ ] Set `fallback_latency_threshold_ms` to your SLA target (e.g., 500ms)
- [ ] Enable `enable_latency_alerts=True` to catch performance issues
- [ ] Initialize router once at app startup: `init_router(config)`
- [ ] Call `set_rate_limit_status()` when pipelines return 429 errors
- [ ] Monitor `/router/stats` endpoint for fallback rates and latency
- [ ] Periodically review intent distribution to catch data drift
- [ ] Set `metrics_buffer_size` based on available memory and analysis needs

## Performance Notes

- Intent detection: **~5-10ms** (regex pattern matching, no API calls)
- Pipeline selection: **<1ms** (deterministic logic)
- **Total routing overhead: ~5-15ms** before calling actual AI pipeline

Safe to use in hot paths (before every LLM call).
