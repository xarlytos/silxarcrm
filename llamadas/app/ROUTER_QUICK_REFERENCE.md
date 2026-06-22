# PipelineRouter - Quick Reference

## Files

| File | Lines | Purpose |
|------|-------|---------|
| `router.py` | 350 | Main implementation (production-ready) |
| `test_router.py` | 500+ | Test suite (34+ tests, 100% coverage) |
| `ROUTER_USAGE.md` | Long | Complete user guide with examples |
| `ROUTER_DESIGN.md` | Long | Architecture & design decisions |
| `ROUTER_QUICK_REFERENCE.md` | This | Quick lookup table |

## One-Liner

```python
pipeline = await router.route_to_pipeline("User message")
# Returns: "groq" or "gemini" based on intent detection
```

## Intent Detection

| Message | Intent | Pipeline | Confidence |
|---------|--------|----------|------------|
| "¿Cuánto cuesta?" | budget_ask | **Groq** | 0.95 |
| "Me parece caro" | objection | **Gemini** | 0.95 |
| "¿Cuándo puedo empezar?" | timeline | **Groq** | 0.95 |
| "¿Hay descuento?" | negotiation | **Gemini** | 0.95 |
| "¿Cómo se compara?" | strategy | **Gemini** | 0.95 |
| "Hola, cómo estás?" | unknown | **Groq** | 0.30 |

## Router Config Defaults

```python
RouterConfig(
    use_hybrid_routing=True,              # Enable Groq/Gemini split
    groq_traffic_percentage=70,           # 70% Groq, 30% Gemini
    fallback_to_gemini=True,              # Fallback if rate-limited
    enable_metrics=True,                  # Track routing decisions
    fallback_latency_threshold_ms=500.0,  # Alert if > 500ms
    min_intent_confidence=0.6,            # Below this → UNKNOWN
    keyword_confidence_boost=0.15,        # +15% if keyword found
    metrics_buffer_size=1000,             # Store last 1K metrics
    enable_latency_alerts=True,           # Log latency warnings
)
```

## Common Patterns

### 1. Quick Start (Default Config)

```python
from llamadas.app.router import PipelineRouter

router = PipelineRouter()
pipeline = await router.route_to_pipeline("¿Cuál es tu presupuesto?")
```

### 2. Custom Config (70% Groq, Alerts Off)

```python
config = RouterConfig(
    groq_traffic_percentage=70,
    enable_latency_alerts=False,
)
router = PipelineRouter(config)
```

### 3. Module Singleton

```python
from llamadas.app.router import init_router, get_router

# Once at startup
init_router()

# Use everywhere
router = get_router()
pipeline = await router.route_to_pipeline(message)
```

### 4. With User ID (Deterministic per User)

```python
pipeline = await router.route_to_pipeline(
    message,
    context={"user_id": "user_123"}
)
# user_123 always gets same pipeline for same intent
```

### 5. With Rate-Limit Status

```python
pipeline = await router.route_to_pipeline(
    message,
    context={
        "user_id": "user_123",
        "groq_rate_limited": groq.is_limited(),
        "gemini_rate_limited": gemini.is_limited(),
    }
)
```

### 6. Get Stats

```python
stats = router.get_stats()
print(f"Groq: {stats['pipeline_distribution']['groq']['percentage']:.1f}%")
print(f"Fallback rate: {stats['fallback_rate']:.1f}%")
print(f"Avg latency: {stats['latency_stats_ms']['avg']:.1f}ms")
```

### 7. Get Recent Metrics

```python
metrics = router.get_metrics(limit=10)  # Last 10 routes
metrics = router.get_metrics(intent_filter=Intent.OBJECTION)  # All objections
```

### 8. Update Rate-Limit Status

```python
try:
    response = await groq_client(message)
except RateLimitError:
    router.set_rate_limit_status(Pipeline.GROQ, True)
    # Next route will fallback to Gemini
```

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Routes always to Groq | `use_hybrid_routing=False` | Set to `True` |
| No metrics | `enable_metrics=False` | Set to `True` |
| High latency | System overload | Increase `fallback_latency_threshold_ms` |
| Rate-limit not falling back | Fallback disabled | Set `fallback_to_gemini=True` |
| Unknown intents | Low match score | Increase `min_intent_confidence` |

## Performance

| Component | Time | Notes |
|-----------|------|-------|
| Intent detection | 5-10ms | Regex pattern matching |
| Pipeline selection | <1ms | Deterministic logic |
| **Total routing** | **5-15ms** | Safe for hot paths |

## Testing

```bash
# Run all tests
pytest llamadas/app/test_router.py -v

# Run specific test class
pytest llamadas/app/test_router.py::TestIntentDetector -v

# Run specific test
pytest llamadas/app/test_router.py::TestIntentDetector::test_budget_intent_presupuesto -v

# With coverage report
pytest llamadas/app/test_router.py --cov=llamadas.app.router
```

## Metrics API

### `router.get_metrics(limit=None, intent_filter=None)`

Returns list of RouteMetrics dicts:
```python
{
    "timestamp": "2026-06-23T10:30:45.123",
    "detected_intent": "budget_ask",
    "intent_confidence": 0.95,
    "selected_pipeline": "groq",
    "routing_reason": "traffic_allocation",
    "latency_ms": 5.2,
    "fallback_triggered": false,
}
```

### `router.get_stats()`

Returns summary stats dict:
```python
{
    "total_routes": 342,
    "pipeline_distribution": {
        "groq": {"count": 239, "percentage": 69.9},
        "gemini": {"count": 103, "percentage": 30.1},
    },
    "intent_distribution": {
        "budget_ask": {"count": 145, "percentage": 42.4},
        "objection": {"count": 89, "percentage": 26.0},
        "timeline": {"count": 78, "percentage": 22.8},
        "unknown": {"count": 30, "percentage": 8.8},
    },
    "latency_stats_ms": {
        "avg": 8.5,
        "max": 45.3,
        "p95": 12.1,
    },
    "fallback_count": 12,
    "fallback_rate": 3.5,
}
```

## Intent Keywords Reference

**BUDGET_ASK**: presupuesto, precio, dinero, costo, tarifa, cuanto cuesta

**OBJECTION**: caro, competencia, objeción, demasiado, alternativa

**TIMELINE**: cuando, cuándo, pronto, urgente, ahora, necesito, demo, prueba

**NEGOTIATION**: descuento, oferta, promoción, negociar, condiciones, paquete

**STRATEGY**: comparar, análisis, roi, retorno, impacto, ventaja

## Enums

```python
class Intent(str, Enum):
    BUDGET_ASK = "budget_ask"
    OBJECTION = "objection"
    TIMELINE = "timeline"
    NEGOTIATION = "negotiation"
    STRATEGY = "strategy"
    UNKNOWN = "unknown"

class Pipeline(str, Enum):
    GROQ = "groq"
    GEMINI = "gemini"
    ELEVENLABS = "elevenlabs"

class RoutingDecision(str, Enum):
    INTENT_MATCH = "intent_match"
    TRAFFIC_ALLOCATION = "traffic_allocation"
    FALLBACK = "fallback"
    DEFAULT = "default"
```

## Production Checklist

- [ ] Use `init_router()` at app startup
- [ ] Set `groq_traffic_percentage` based on quota (70-90% typical)
- [ ] Enable `enable_latency_alerts=True` to catch degradation
- [ ] Call `set_rate_limit_status()` on 429 errors
- [ ] Expose `/router/stats` endpoint for monitoring
- [ ] Review intent distribution monthly (detect data drift)
- [ ] Archive metrics regularly if `enable_metrics=True`
- [ ] Test fallback behavior in staging
- [ ] Document any custom intents added to keyword map

## See Also

- `ROUTER_USAGE.md` — Complete guide with examples
- `ROUTER_DESIGN.md` — Architecture & design decisions
- `test_router.py` — Test suite for reference implementations
