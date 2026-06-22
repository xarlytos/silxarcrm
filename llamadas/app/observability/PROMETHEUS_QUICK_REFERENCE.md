# Prometheus Exporter - Quick Reference Card

## Installation
```bash
pip install prometheus_client
```

## Basic Setup (main.py)
```python
from app.observability.prometheus_integration import (
    setup_prometheus_endpoint,
    add_prometheus_middleware,
)

app = FastAPI()
add_prometheus_middleware(app, agent_type="sales", model_name="gemini-2.0")
setup_prometheus_endpoint(app)
```

## Endpoint
```bash
curl http://localhost:8000/metrics
```

---

## API Reference

### Recording Functions

#### Latency
```python
from app.observability import record_classification_latency

record_classification_latency(
    latency_ms=145.5,
    agent_type="sales",
    model_name="gemini-2.0",
    endpoint="/classify",
)
```

#### Deal Probability
```python
from app.observability import record_deal_probability

record_deal_probability(
    probability=0.78,
    agent_type="sales",
    model_name="gemini-2.0",
    endpoint="/probability",
)
```

#### Model Accuracy
```python
from app.observability import set_model_accuracy

set_model_accuracy(
    accuracy=0.92,
    agent_type="sales",
    model_name="gemini-2.0",
    endpoint="/classify",
)
```

#### Error Rate
```python
from app.observability import set_error_rate

set_error_rate(
    error_rate_value=0.05,
    agent_type="sales",
    model_name="gemini-2.0",
    endpoint="/api/v1",
)
```

#### API Call
```python
from app.observability import record_api_call

record_api_call(
    agent_type="sales",
    model_name="gemini-2.0",
    endpoint="/classify",
)
```

### Decorator
```python
from app.observability import measure_latency

@measure_latency(agent_type="sales", model_name="gemini-2.0", endpoint="/classify")
def classify_lead(lead):
    return process(lead)
```

### Batch Recording
```python
from app.observability import record_batch

record_batch([
    {
        "type": "latency",
        "value": 145.5,
        "agent_type": "sales",
        "model_name": "gemini-2.0",
        "endpoint": "/classify",
    },
    {
        "type": "deal_probability",
        "value": 0.78,
        "agent_type": "sales",
        "model_name": "gemini-2.0",
        "endpoint": "/probability",
    },
])
```

### Get Metrics Content
```python
from app.observability import get_metrics_content

content, content_type = get_metrics_content()
# Returns (bytes, str) for HTTP response
```

---

## Metrics

| Name | Type | Description | Labels |
|------|------|-------------|--------|
| `agent_classification_latency_ms` | Histogram | Classification latency in ms | agent_type, model_name, endpoint |
| `deal_probability_distribution` | Histogram | Deal closure probability (0-1) | agent_type, model_name, endpoint |
| `model_inference_accuracy` | Gauge | Model accuracy (0-1) | agent_type, model_name, endpoint |
| `error_rate` | Gauge | Current error rate (0-1) | agent_type, model_name, endpoint |
| `api_call_count` | Counter | Total API calls | agent_type, model_name, endpoint |

---

## Common Prometheus Queries

```promql
# P95 latency
histogram_quantile(0.95, agent_classification_latency_ms)

# P50 latency (median)
histogram_quantile(0.5, agent_classification_latency_ms)

# Error rate
error_rate

# Model accuracy
model_inference_accuracy

# Deal probability median
histogram_quantile(0.5, deal_probability_distribution)

# Requests per second
rate(api_call_count[1m])

# By model name
histogram_quantile(0.95, agent_classification_latency_ms) by (model_name)

# By agent type
histogram_quantile(0.95, agent_classification_latency_ms) by (agent_type)

# By endpoint
histogram_quantile(0.95, agent_classification_latency_ms) by (endpoint)
```

---

## Alert Rules

```yaml
groups:
  - name: ai_agent_alerts
    rules:
      - alert: HighLatency
        expr: histogram_quantile(0.95, agent_classification_latency_ms) > 500
        for: 2m

      - alert: HighErrorRate
        expr: error_rate > 0.1
        for: 5m

      - alert: LowAccuracy
        expr: model_inference_accuracy < 0.8
        for: 10m

      - alert: LowDealProbability
        expr: histogram_quantile(0.5, deal_probability_distribution) < 0.3
        for: 5m
```

---

## Prometheus Configuration

```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'revenue-ai-agent'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
```

---

## Testing

```python
from app.observability import reset_metrics

def test_metrics():
    reset_metrics()
    # Your test code
    reset_metrics()
```

---

## Integration Checklist

- [ ] Install `prometheus_client`
- [ ] Import setup functions in main.py
- [ ] Call `add_prometheus_middleware()`
- [ ] Call `setup_prometheus_endpoint()`
- [ ] Verify `/metrics` endpoint
- [ ] Configure Prometheus scraping
- [ ] Create Grafana dashboard
- [ ] Define alert rules

---

## Exports from Module

```python
from app.observability import (
    # Metrics
    agent_classification_latency_ms,
    model_inference_accuracy,
    api_call_count,
    error_rate,
    deal_probability_distribution,
    
    # Functions
    record_classification_latency,
    record_api_call,
    set_model_accuracy,
    set_error_rate,
    record_deal_probability,
    get_metrics_content,
    record_batch,
    measure_latency,
    reset_metrics,
)
```

---

## Examples

### Example 1: Simple Endpoint
```python
@app.post("/classify")
async def classify_lead(lead: dict):
    # Latency & API call automatically recorded by middleware
    return classify_logic(lead)
```

### Example 2: With Deal Probability
```python
@app.post("/probability")
async def calculate_probability(lead: dict):
    from app.observability import record_deal_probability
    
    prob = calculate_prob(lead)
    record_deal_probability(prob, agent_type="sales", model_name="gemini-2.0")
    return {"probability": prob}
```

### Example 3: Background Monitoring
```python
async def monitor_metrics():
    from app.observability import set_error_rate, set_model_accuracy
    
    while True:
        set_error_rate(get_error_rate(), agent_type="system")
        set_model_accuracy(get_accuracy(), agent_type="sales")
        await asyncio.sleep(60)

@app.on_event("startup")
async def startup():
    asyncio.create_task(monitor_metrics())
```

---

## Files

- `prometheus_exporter.py` - Main module (324 lines)
- `prometheus_integration.py` - FastAPI integration (95 lines)
- `prometheus_examples.py` - 12 complete examples (327 lines)
- `PROMETHEUS_README.md` - Full documentation
- `INTEGRATION_GUIDE.md` - Step-by-step integration
- `PROMETHEUS_QUICK_REFERENCE.md` - This file

---

## Features

✓ Thread-safe  
✓ Zero heavy dependencies  
✓ Automatic middleware  
✓ Flexible labels  
✓ Decorators support  
✓ Batch recording  
✓ Type validation  
✓ Production-ready  
✓ Error handling included  

---

## Support

See full documentation:
- `PROMETHEUS_README.md` - Complete guide
- `INTEGRATION_GUIDE.md` - Integration steps
- `prometheus_examples.py` - 12 working examples
- Docstrings in `prometheus_exporter.py`
