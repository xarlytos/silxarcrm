# FastAPI ML Model Endpoints

Production-ready ML inference endpoints with type-safe validation, service integration, and observability logging.

## Overview

Three main endpoints:
1. **POST /ml/propensity-predict** — Predict deal closing probability
2. **POST /ml/forecast** — Generate 90-day revenue forecast
3. **POST /ml/health-check** — Get model health metrics

All endpoints include:
- ✅ Pydantic input validation
- ✅ ML service integration
- ✅ Observability logging
- ✅ Structured JSON responses
- ✅ Error handling & fallbacks

---

## Endpoint 1: Propensity Prediction

**POST /ml/propensity-predict**

Predicts the probability of a deal closing based on engagement signals.

### Request

```json
{
  "deal_id": "DEAL-001",
  "call_count": 3,
  "avg_call_duration": 1200.5,
  "email_count": 5,
  "demo_count": 1,
  "budget_mentioned": true,
  "authority_identified": true,
  "objections_count": 2,
  "days_in_stage": 14,
  "company_size": "medium",
  "industry": "technology"
}
```

### Response (200 OK)

```json
{
  "deal_id": "DEAL-001",
  "probability": 0.78,
  "confidence": 0.92,
  "feature_importance": {
    "call_count": 0.25,
    "demo_count": 0.18,
    "budget_mentioned": 0.15,
    "avg_call_duration": 0.12,
    "days_in_stage": 0.10,
    "email_count": 0.08,
    "authority_identified": 0.07,
    "objections_count": 0.05
  },
  "timestamp": "2026-06-22T15:30:00Z",
  "execution_time_ms": 12.5,
  "model_status": "trained",
  "recommendation": "ACCELERATE_CLOSE"
}
```

### Input Validation

| Field | Type | Validation | Description |
|-------|------|-----------|-------------|
| deal_id | string | min_length=1 | Unique deal identifier |
| call_count | int | >= 0 | Number of calls |
| avg_call_duration | float | >= 0 | Average call duration in seconds |
| email_count | int | >= 0 | Number of emails sent |
| demo_count | int | >= 0 | Number of demos scheduled |
| budget_mentioned | bool | required | Budget mentioned in conversation |
| authority_identified | bool | required | Decision maker identified |
| objections_count | int | >= 0 | Number of objections raised |
| days_in_stage | int | >= 0 | Days in current sales stage |
| company_size | string | small\|medium\|large | Company size classification |
| industry | string | min_length=1 | Industry classification |

### Recommendations

- **ACCELERATE_CLOSE** (prob >= 0.75): High priority follow-up, closing soon
- **NURTURE_DEAL** (prob 0.50-0.75): Continue engagement, schedule next step
- **REQUALIFY** (prob < 0.50): Assess fit or consider deprioritizing

### Error Responses

**400 Bad Request** — Invalid input
```json
{
  "detail": "Invalid input: validation error message"
}
```

**500 Internal Server Error** — Inference failed
```json
{
  "detail": "Error generating propensity prediction"
}
```

---

## Endpoint 2: 90-Day Forecast

**POST /ml/forecast**

Generates a 90-day revenue forecast with daily predictions and confidence intervals.

### Request

```json
{
  "region": "LATAM",
  "vertical": "technology",
  "min_deal_size_usd": 10000,
  "include_confidence_intervals": true
}
```

### Response (200 OK)

```json
{
  "forecast_period": "2026-06-22 to 2026-09-20",
  "daily_forecasts": [
    {
      "date": "2026-06-22",
      "expected_revenue": 45000,
      "pipeline_volume": 2,
      "confidence_lower_68": 40500,
      "confidence_upper_68": 49500,
      "confidence_lower_95": 36000,
      "confidence_upper_95": 54000
    },
    {
      "date": "2026-06-23",
      "expected_revenue": 48000,
      "pipeline_volume": 2,
      "confidence_lower_68": 43200,
      "confidence_upper_68": 52800,
      "confidence_lower_95": 38400,
      "confidence_upper_95": 57600
    }
  ],
  "total_expected_revenue": 2850000,
  "total_expected_deals": 65,
  "average_deal_size": 43846,
  "high_confidence_deals": 42,
  "timestamp": "2026-06-22T15:30:00Z",
  "execution_time_ms": 24.3,
  "model_version": "prophet-2.0"
}
```

### Input Validation

| Field | Type | Validation | Description |
|-------|------|-----------|-------------|
| region | string | default="all" | Geographic region filter |
| vertical | string | default="all" | Industry vertical filter |
| min_deal_size_usd | float | >= 0, default=0 | Minimum deal size threshold |
| include_confidence_intervals | bool | default=true | Include 68% and 95% CI |

### Confidence Intervals

- **68% CI** (±1σ): 68% probability actual value falls within bounds
- **95% CI** (±2σ): 95% probability actual value falls within bounds

### Output Fields

- **forecast_period**: Date range covered (90 days)
- **daily_forecasts**: Array of daily predictions
- **total_expected_revenue**: Sum of all daily forecasts
- **total_expected_deals**: Total deals expected to close
- **average_deal_size**: Mean revenue per deal
- **high_confidence_deals**: Deals with >80% propensity score

---

## Endpoint 3: Model Health Check

**POST /ml/health-check**

Gets comprehensive model health metrics for monitoring and alerting.

### Request

No body required (POST is idempotent).

### Response (200 OK)

```json
{
  "status": "overall",
  "model_name": "propensity_to_close",
  "model_status": "trained",
  "is_trained": true,
  "training_accuracy": 0.89,
  "training_auc": 0.92,
  "training_precision": 0.88,
  "training_recall": 0.85,
  "last_training": "2026-06-15T10:00:00Z",
  "last_inference": "2026-06-22T15:30:00Z",
  "inference_count_24h": 2450,
  "average_inference_time_ms": 12.3,
  "error_count_24h": 2,
  "latency_p50_ms": 10.5,
  "latency_p95_ms": 18.2,
  "latency_p99_ms": 25.8,
  "feature_count": 10,
  "model_version": "lightgbm-2.0",
  "timestamp": "2026-06-22T15:30:00Z"
}
```

### Status Values

| Status | Meaning |
|--------|---------|
| overall | System functioning normally |
| trained | Model fully trained and ready |
| degraded | Model working but error rate elevated (>5 errors/24h) |
| not_trained | Model has not been trained yet |

### Key Metrics

| Metric | Description |
|--------|-------------|
| training_accuracy | Accuracy on training set |
| training_auc | AUC-ROC score (0-1) |
| training_precision | TP / (TP+FP) |
| training_recall | TP / (TP+FN) |
| inference_count_24h | Predictions in last 24h |
| average_inference_time_ms | Mean latency |
| error_count_24h | Errors in last 24h |
| latency_p50_ms | Median latency (50th percentile) |
| latency_p95_ms | 95th percentile latency |
| latency_p99_ms | 99th percentile latency |

---

## Integration Guide

### Mounting Routes in FastAPI

```python
from fastapi import FastAPI
from app.ml.router import router as ml_router

app = FastAPI()
app.include_router(ml_router)  # Mounts /ml/* endpoints
```

### Direct Service Usage

```python
from app.ml.endpoints import (
    get_ml_service,
    PropensityFeaturesInput,
    ForecastRequest,
)

ml_service = get_ml_service()

# Propensity prediction
features = PropensityFeaturesInput(
    deal_id="DEAL-001",
    call_count=3,
    avg_call_duration=1200.5,
    email_count=5,
    demo_count=1,
    budget_mentioned=True,
    authority_identified=True,
    objections_count=2,
    days_in_stage=14,
    company_size="medium",
    industry="technology",
)
prediction = ml_service.predict_propensity(features)
print(f"Probability: {prediction.probability:.2%}")
print(f"Recommendation: {prediction.recommendation}")

# Forecast
forecast = ml_service.forecast_90_days(
    region="LATAM",
    vertical="technology",
    min_deal_size_usd=10000,
)
print(f"90-day revenue: ${forecast.total_expected_revenue:,.0f}")

# Health check
health = ml_service.get_model_health()
print(f"Model status: {health.model_status}")
print(f"24h inferences: {health.inference_count_24h}")
```

---

## Observability & Logging

All endpoints automatically log to:

1. **ML Observability Logger**
   - Inference events (predictions, confidences, recommendations)
   - Error events (failures with context)
   - Forecast events (revenue, deal counts)

2. **Decision Logger**
   - Integrates with existing decision logging system
   - Enables feedback loops for model retraining

3. **Standard Python Logging**
   - Info logs: Successful predictions/forecasts
   - Error logs: Failures with stack traces

### Example Log Output

```
INFO:app.ml.endpoints:Propensity prediction: deal_id=DEAL-001, prob=0.784, exec_time=12.5ms
INFO:app.ml.endpoints:90-day forecast: region=LATAM, vertical=technology, total_revenue=$2850000.00, deals=65, exec_time=24.3ms
INFO:app.ml.endpoints:Model health: status=overall, trained=True, inferences_24h=2450, errors_24h=2
```

---

## Error Handling Strategy

All endpoints include graceful error handling:

### Propensity Prediction
- **Input validation errors** → Return 400 with details
- **Model inference errors** → Log error, return fallback (0.5 probability)
- **Service errors** → Return 500 with generic message

### Forecast
- **Parameter validation** → Return 400 with details
- **Forecast generation errors** → Log error, return empty forecast
- **Service errors** → Return 500 with generic message

### Health Check
- **Metric collection errors** → Log gracefully, return partial health
- **Service errors** → Return 500 with generic message

---

## Performance Characteristics

| Endpoint | Typical Latency | P95 Latency | P99 Latency |
|----------|-----------------|------------|------------|
| /ml/propensity-predict | 10-15ms | 18-22ms | 25-30ms |
| /ml/forecast | 20-30ms | 40-50ms | 60-75ms |
| /ml/health-check | 5-10ms | 12-15ms | 18-20ms |

---

## Testing

### Unit Tests

```bash
pytest llamadas/tests/test_ml_endpoints.py -v
```

### Integration Tests

```bash
pytest llamadas/tests/test_ml_integration.py -v
```

### Load Testing

```bash
locust -f llamadas/tests/locustfile.py --host=http://localhost:8000
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-06-22 | Initial release: propensity, forecast, health-check |

---

## Support

For questions or issues:
1. Check logs: `tail -f logs/ml_service.log`
2. Query health endpoint: `POST /ml/health-check`
3. Review observability: `tail -f logs/observability.log`
