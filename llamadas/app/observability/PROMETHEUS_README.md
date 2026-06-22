# Prometheus Metrics Exporter

Sistema completo para exportar métricas a Prometheus en el endpoint `/metrics`.

## Archivos

### 1. `prometheus_exporter.py` (324 líneas)
**Módulo principal con todas las métricas y funciones de registro.**

#### Métricas Implementadas

**Histogramas:**
- `agent_classification_latency_ms` - Latencia de clasificación (ms)
- `deal_probability_distribution` - Distribución de probabilidades de deal (0-1)

**Gauges:**
- `model_inference_accuracy` - Exactitud del modelo (0-1)
- `error_rate` - Tasa de error actual (0-1)

**Contadores:**
- `api_call_count` - Número total de llamadas API

**Labels para todas las métricas:**
- `agent_type` - Tipo de agente (sales, support, lead_qualifier, etc.)
- `model_name` - Nombre del modelo (gemini-2.0, gpt-4, etc.)
- `endpoint` - Path del endpoint (/classify, /probability, etc.)

#### Funciones Principales

```python
# Registrar latencia
record_classification_latency(
    latency_ms: float,
    agent_type: str = "default",
    model_name: str = "unknown",
    endpoint: str = "unknown",
)

# Registrar probabilidad de deal
record_deal_probability(probability: float, agent_type, model_name, endpoint)

# Establecer exactitud
set_model_accuracy(accuracy: float, agent_type, model_name, endpoint)

# Establecer tasa de error
set_error_rate(error_rate_value: float, agent_type, model_name, endpoint)

# Registrar llamada API
record_api_call(agent_type, model_name, endpoint)

# Registrar batch de métricas
record_batch(records: list[dict])

# Obtener contenido Prometheus
content, content_type = get_metrics_content()
```

#### Decorador

```python
@measure_latency(agent_type='sales', model_name='gemini-2.0', endpoint='/classify')
def classify_lead(lead_data):
    return process_lead(lead_data)
```

---

### 2. `prometheus_integration.py` (95 líneas)
**Integración con FastAPI para endpoint /metrics y middleware.**

#### Middleware Automático
- Mide latencia de TODOS los endpoints automáticamente
- Registra llamadas API automáticamente
- Detecta endpoints de clasificación/análisis y registra latencias específicas

#### Funciones

```python
# Setup del endpoint /metrics
setup_prometheus_endpoint(app, path="/metrics")

# Añadir middleware de medición automática
add_prometheus_middleware(
    app,
    agent_type="sales_agent",
    model_name="gemini-2.0",
)
```

#### Integración en main.py

```python
from fastapi import FastAPI
from app.observability.prometheus_integration import (
    setup_prometheus_endpoint,
    add_prometheus_middleware,
)

app = FastAPI()

# Configurar Prometheus
add_prometheus_middleware(app, agent_type="sales", model_name="gemini-2.0")
setup_prometheus_endpoint(app)

# Todos los endpoints usan Prometheus automáticamente
@app.post("/classify")
async def classify_lead(lead: dict):
    # Latencia y llamadas se registran automáticamente
    return {"classified": True}
```

---

### 3. `prometheus_examples.py` (327 líneas)
**Ejemplos de uso y patrones de integración.**

Incluye:
1. Registro simple de latencia
2. Decorador para medir latencia automáticamente
3. Registrar probabilidad de deal
4. Establecer exactitud
5. Establecer tasa de error
6. Registrar llamadas API
7. Batch de registros
8. Integración completa con FastAPI
9. Loop de monitoreo periódico
10. Configuración de Prometheus
11. Reglas de alerta
12. Queries útiles

---

## Instalación

### Dependencias

```bash
pip install prometheus_client
```

### En requirements.txt

```
prometheus_client>=0.17.0
```

---

## Uso Rápido

### 1. Endpoint /metrics

```bash
curl http://localhost:8000/metrics
```

Retorna formato Prometheus:
```
# HELP agent_classification_latency_ms Latencia de clasificación del agente en milisegundos
# TYPE agent_classification_latency_ms histogram
agent_classification_latency_ms_bucket{agent_type="sales",endpoint="/classify",le="10",model_name="gemini-2.0"} 0.0
agent_classification_latency_ms_bucket{agent_type="sales",endpoint="/classify",le="25",model_name="gemini-2.0"} 1.0
...
```

### 2. Registro Manual

```python
from app.observability import (
    record_classification_latency,
    record_deal_probability,
    set_model_accuracy,
)

# Registrar latencia
record_classification_latency(
    145.5,
    agent_type="sales",
    model_name="gemini-2.0",
    endpoint="/classify",
)

# Registrar deal probability
record_deal_probability(0.78, agent_type="sales", model_name="gemini-2.0")

# Establecer accuracy
set_model_accuracy(0.92, agent_type="sales", model_name="gemini-2.0")
```

### 3. Middleware Automático

```python
from app.observability.prometheus_integration import (
    add_prometheus_middleware,
    setup_prometheus_endpoint,
)

app = FastAPI()

# Todos los endpoints registran latencias automáticamente
add_prometheus_middleware(app, agent_type="sales", model_name="gemini-2.0")
setup_prometheus_endpoint(app)
```

---

## Configuración de Prometheus

### prometheus.yml

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'revenue-ai-agent'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s
```

---

## Queries Útiles

```promql
# P95 latencia de clasificación
histogram_quantile(0.95, agent_classification_latency_ms)

# Latencia mediana
histogram_quantile(0.5, agent_classification_latency_ms)

# Error rate actual
error_rate

# Accuracy promedio
model_inference_accuracy

# Deal probability mediana
histogram_quantile(0.5, deal_probability_distribution)

# Llamadas por segundo
rate(api_call_count[1m])

# Latencia por modelo
histogram_quantile(0.95, agent_classification_latency_ms) by (model_name)

# Latencia por agent_type
histogram_quantile(0.95, agent_classification_latency_ms) by (agent_type)
```

---

## Reglas de Alerta

```yaml
groups:
  - name: revenue_ai_alerts
    rules:
      # Latencia alta
      - alert: HighClassificationLatency
        expr: histogram_quantile(0.95, agent_classification_latency_ms) > 500
        for: 2m

      # Error rate alto
      - alert: HighErrorRate
        expr: error_rate > 0.1
        for: 5m

      # Accuracy baja
      - alert: LowModelAccuracy
        expr: model_inference_accuracy < 0.8
        for: 10m

      # Deal probability baja
      - alert: LowDealProbability
        expr: histogram_quantile(0.5, deal_probability_distribution) < 0.3
        for: 5m
```

---

## Características

✅ **Thread-safe** - Usa locks para acceso seguro desde múltiples threads
✅ **Sin dependencies pesadas** - Solo usa prometheus_client
✅ **Middleware automático** - Mide latencias sin código adicional
✅ **Labels flexibles** - Identifica by agent_type, model_name, endpoint
✅ **Decorador** - Mide latencia de funciones automáticamente
✅ **Batch** - Registra múltiples métricas de una vez
✅ **Type-safe** - Validates valores en rangos válidos
✅ **Production-ready** - Error handling y logging incluidos

---

## Integración con main.py

```python
# En main.py
from fastapi import FastAPI
from app.observability.prometheus_integration import (
    setup_prometheus_endpoint,
    add_prometheus_middleware,
)
from app.config import settings

app = FastAPI(title="Agente de Ventas por Voz")

# Configurar Prometheus
add_prometheus_middleware(
    app,
    agent_type=settings.agent_type,
    model_name=settings.model_name,
)
setup_prometheus_endpoint(app)

# Todos los endpoints heredan medición automática
@app.post("/classify")
async def classify_lead(lead: dict):
    # Latencia y llamadas se registran automáticamente
    return classify_lead_logic(lead)

@app.get("/metrics")  # Ya configurado arriba
async def metrics():
    pass  # Retorna Prometheus metrics automáticamente
```

---

## Monitoring Stack Recomendado

```
FastAPI + prometheus_exporter
         ↓
  /metrics endpoint
         ↓
    Prometheus (scrape)
         ↓
    Grafana (visualize)
         ↓
   AlertManager (alertas)
```

---

## Testing

```python
from app.observability import reset_metrics

# En tests
def test_my_function():
    reset_metrics()  # Limpia métricas antes de test
    
    # Tu test aquí
    
    reset_metrics()  # Limpia después
```

---

## Exportación de Métricas

Las métricas se exportan en formato Prometheus Text-based (OpenMetrics):
- Histogramas con buckets predefinidos
- Gauges actualizables
- Contadores incrementables
- Labels para dimensionalidad

Compatible con:
- ✅ Prometheus
- ✅ Grafana
- ✅ Datadog
- ✅ New Relic
- ✅ CloudWatch (con exportador)
