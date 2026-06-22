# Revenue AI — Observability Quick Start

## Archivos principales

- **`tracing.py`** — OpenTelemetry distributed tracing (GCP Cloud Trace / Jaeger)
- **`event_logger.py`** — Event schema (20+ event types) + EventBus
- **`advanced_alerts.py`** — Alert engine (P0/P1/P2) con auto-remediation
- **`metrics.py`** — In-process metrics + circuit breaker (ya existía)
- **`alerts.py`** — Slack alerts (ya existía)
- **`decision_log.py`** — Decision event logging (ya existía)

---

## Setup Rápido

### 1. Environment Variables

```bash
# .env o .env.local
TRACING_BACKEND=gcp  # o "jaeger" o "none"
JAEGER_HOST=localhost
JAEGER_PORT=6831
PAGERDUTY_INTEGRATION_KEY=<tu-key>
SLACK_WEBHOOK_URL=<tu-webhook>
ENVIRONMENT=production
REGION=us-central1
```

### 2. Inicialización en FastAPI

```python
# app/main.py
from fastapi import FastAPI
from app.observability.tracing import ensure_tracing_initialized
from app.observability.advanced_alerts import start_alert_monitoring

app = FastAPI()

@app.on_event("startup")
async def startup():
    # Inicializar tracing
    ensure_tracing_initialized()
    
    # Inicializar alertas
    await start_alert_monitoring()
    
    logger.info("✓ Observability stack iniciado")

@app.on_event("shutdown")
async def shutdown():
    # Limpiar
    pass
```

### 3. Uso en componentes

```python
# Usar tracing en LLM calls
from app.observability.tracing import LLMSpan

with LLMSpan(call_id="ca_abc123", model="gemini-3.1-flash-lite") as span:
    span.set_input(tokens=512, cached=256)
    response = await gemini_client.generate(...)
    span.set_output(tokens=145, latency_ms=245, cost_usd=0.00023)

# O usar decorador
from app.observability.tracing import traced_function

@traced_function("gemini_llm", call_id_kwarg="call_id")
async def call_gemini(call_id: str, prompt: str):
    return await gemini_client.generate(prompt)
```

```python
# Loguear eventos estructurados
from app.observability.event_logger import log_llm_call_complete

await log_llm_call_complete(
    call_id="ca_abc123",
    model="gemini-3.1-flash-lite",
    latency_ms=245,
    input_tokens=512,
    output_tokens=145,
    cached_tokens=256,
    cost_usd=0.00023,
    cache_hit=True,
    tools_used=["check_availability"]
)
```

```python
# Registrar métricas
from app.observability.metrics import record, record_component_latency

record("call_started")
record_component_latency("gemini_llm", 245)
```

---

## Acceder a Datos de Observabilidad

### Cloud Logging (GCP)

```
gcloud logging read "resource.type=cloud_run_revision AND jsonPayload.event_type=llm_call_complete" \
  --limit 100 \
  --format json
```

### Prometheus Metrics

```
curl http://localhost:8000/metrics
```

### Event History

```python
from app.observability.event_logger import get_event_bus

bus = get_event_bus()
recent_events = await bus.get_recent_events(call_id="ca_abc123")
for event in recent_events:
    print(event.to_json())
```

### Alert Status

```python
from app.observability.advanced_alerts import get_alert_engine

engine = get_alert_engine()
for alert_id, timestamp in engine.active_alerts.items():
    alert = engine.alerts[alert_id]
    print(f"{alert.name} ({alert.severity}) — activa desde {timestamp}")
```

---

## Dashboards

### Grafana (si está configurado)

1. **Real-time Operations** — Llamadas, errores, latencia, costo
2. **LLM Performance** — Latencia por modelo, cache hits, tokens, costo
3. **Conversion Funnel** — Embudo de ventas con drop-off
4. **Agent Performance** — Rendimiento por agente (SDR, Closer, etc)
5. **Compliance & Risk** — Disclosure rate, opt-outs, rate limits
6. **Cost Analytics** — Desglose por componente, anomalías, ROI

---

## Playbooks de Incidentes

### P0: Zero Call Completions (5 min SLA)

```
1. ✓ Verificar si hay llamadas en progreso
   → Si no: problema de ingesta
   
2. Revisar Twilio webhook logs
   → Si falla: restart media_stream.py
   
3. Revisar Gemini API status
   → Si down: activar circuit breaker → fallback a Sonnet
   
4. Revisar base de datos
   → Si no responde: failover a read-replica
```

**Owner:** On-call SRE  
**Escalation:** VP Engineering si > 2 min

### P1: Error Rate > 5% (15 min SLA)

```
1. Samplear últimos 50 errores
   → Agrupar por error_type, component
   
2. Si error LLM: implementar backoff + fallback
3. Si error API: revisar estado de servicio externo
4. Si error DB: check connection pool
```

### P2: Cost Spike > 1.5x (1 hour SLA)

```
1. Desglosar costo por componente
2. Si LLM: revisar tokens, cache hits (debería ser >30%)
3. Si TTS: revisar character count
4. Aplicar fix, monitorear 30 min
```

---

## Key Metrics to Track

```
📊 Call Volume
  ├─ calls_in_progress (gauge)
  ├─ calls_completed_rate[5m] (%)
  └─ error_rate (%)

⚡ Performance
  ├─ ttfb_p50_ms, ttfb_p95_ms
  ├─ turn_latency_avg_ms
  ├─ stt_latency, tts_latency, llm_latency
  └─ circuit_breaker_active (bool)

💰 Cost
  ├─ total_cost_per_call ($)
  ├─ cost_breakdown (llm, tts, stt, api)
  └─ cost_anomaly_detected (bool)

📈 Quality
  ├─ classifier_confidence[avg]
  ├─ humanization_score
  ├─ conversion_rate (30s → interest → demo → transfer)
  └─ agent_conversion_by_type

✅ Compliance
  ├─ disclosure_rate (%)
  ├─ recording_consent_rate (%)
  ├─ optout_detected_count
  └─ do_not_call_violations
```

---

## Alertas Configuradas

| Alert | Severity | Condition | Action |
|-------|----------|-----------|--------|
| Circuit breaker active | P0 | Latencia LLM > 1000ms | Fallback model |
| Zero call completions | P0 | No calls ending | Service restart |
| Error rate spike | P1 | Errors > 5% | Debug + backoff |
| Classifier drift | P1 | Confidence < 0.70 | ML team alert |
| Rate limit critical | P1 | >5 rate limits/min | Implement backoff |
| Cost anomaly | P2 | Cost > 1.5x baseline | Investigate |
| High latency | P2 | P95 > 1500ms | Scale check |
| Compliance failure | P2 | Disclosure rate < 95% | Manual review |

---

## Testing

```python
# tests/test_observability.py

async def test_event_logging():
    from app.observability.event_logger import log_llm_call_complete, get_event_bus
    
    call_id = "test_ca_123"
    await log_llm_call_complete(
        call_id=call_id,
        model="test",
        latency_ms=100,
        input_tokens=50,
        output_tokens=25
    )
    
    bus = get_event_bus()
    events = await bus.get_recent_events(call_id)
    assert len(events) > 0
    assert events[0].event_type.value == "llm_call_complete"

async def test_alerts():
    from app.observability.advanced_alerts import get_alert_engine
    
    engine = get_alert_engine()
    assert len(engine.alerts) > 0
    
    # Verificar que alertas están registradas
    alert_ids = list(engine.alerts.keys())
    assert "a1_circuit_breaker_active" in alert_ids
```

---

## Production Deployment

### GCP Cloud Run

```yaml
# cloudbuild.yaml
env:
  - TRACING_BACKEND=gcp
  - PAGERDUTY_INTEGRATION_KEY=$_PAGERDUTY_KEY
  - SLACK_WEBHOOK_URL=$_SLACK_WEBHOOK
  - ENVIRONMENT=production

# Cloud Trace: https://console.cloud.google.com/traces
# Cloud Logging: https://console.cloud.google.com/logs
```

### Local Development

```bash
# Start Jaeger (si quieres tracing local)
docker run -d \
  -p 6831:6831/udp \
  -p 16686:16686 \
  jaegertracing/all-in-one

# Set TRACING_BACKEND=jaeger
# Jaeger UI: http://localhost:16686
```

---

## Costs

| Component | Volume (1M calls/month) | Cost |
|-----------|---------|------|
| Cloud Logging | 100GB | $500 |
| Cloud Trace | 1M traces | $100 |
| BigQuery | 50GB queries | $250 |
| Prometheus + Grafana | Self-hosted | $200 |
| Storage | 200GB | $100 |
| **Total** | - | **~$2.2k/month** |

**ROI:** Break-even en 7 incidents/year (prev. $15k loss cada una)

---

## Next Steps

1. ✓ Deploy tracing a staging
2. ✓ Configure alertas + PagerDuty
3. ✓ Build Grafana dashboards
4. ✓ Document runbooks
5. ✓ Train team en incident response
6. ✓ Setup cost anomaly detection (ML)
7. ✓ Customer-facing telemetry API

---

**For questions:** See `OBSERVABILITY_ARCHITECTURE.md` (guía completa)
