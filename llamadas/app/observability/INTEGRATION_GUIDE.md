# Guía de Integración - Prometheus Exporter

## Quick Start (5 minutos)

### 1. Instalar dependencia
```bash
pip install prometheus_client
# O añadir a requirements.txt: prometheus_client>=0.17.0
```

### 2. Integrar en main.py (Cambio mínimo)
```python
# main.py - Líneas a añadir/modificar

from app.observability.prometheus_integration import (
    setup_prometheus_endpoint,
    add_prometheus_middleware,
)
from app.config import settings

app = FastAPI(title="Agente de Ventas por Voz (Gemini Live + Twilio)")

# ═══ PROMETHEUS SETUP (NUEVO) ═══
add_prometheus_middleware(
    app,
    agent_type="sales_agent",
    model_name=settings.model_name or "gemini-2.0",
)
setup_prometheus_endpoint(app)

# ... resto del código existente ...
```

### 3. Verificar endpoint
```bash
curl http://localhost:8000/metrics
# Retorna métricas en formato Prometheus
```

---

## Integración Completa en main.py

```python
"""Servidor FastAPI del agente de voz.

Endpoints:
  POST /voice     -> TwiML que conecta la llamada a Media Streams
  WS   /media     -> canal de audio bidireccional
  POST /outbound  -> dispara una llamada saliente
  GET  /status    -> healthcheck + métricas
  GET  /metrics   -> Prometheus metrics (NUEVO)
"""
from __future__ import annotations

import asyncio
import logging

from fastapi import FastAPI, Request, WebSocket
from fastapi.responses import JSONResponse, Response

from app.compliance.mx import can_call
from app.config import settings
from app.modules import load_agent_config
from app.observability import metrics
from app.observability.prometheus_integration import (
    setup_prometheus_endpoint,
    add_prometheus_middleware,
)
from app.simulation import text_session
from app.simulation.live_audio import handle_browser_websocket
from app.telephony.media_stream import handle_media_stream, prewarm_session
from app.telephony.twilio_client import build_stream_twiml, start_outbound_call

logging.basicConfig(level=settings.log_level)
logger = logging.getLogger(__name__)

app = FastAPI(title="Agente de Ventas por Voz (Gemini Live + Twilio)")

# ═══ PROMETHEUS SETUP ═══
add_prometheus_middleware(
    app,
    agent_type="sales_agent",
    model_name=settings.model_name or "gemini-2.0",
)
setup_prometheus_endpoint(app, path="/metrics")

# ═══ POOL PERMANENTE DE SESIONES ═══
# ... resto del código existente ...
```

---

## Pasos de Integración por Componente

### A. Endpoints de Clasificación

**Ya mide latencia automáticamente via middleware**, pero puedes registrar métricas adicionales:

```python
from app.observability import (
    record_deal_probability,
    set_model_accuracy,
)

@app.post("/classify")
async def classify_lead(lead: dict):
    """Endpoint que clasifica leads."""
    # Latencia se mide automáticamente
    # Llamada API se cuenta automáticamente
    
    result = classify_lead_logic(lead)
    
    # Registrar métricas específicas
    record_deal_probability(
        result.get("probability", 0.5),
        agent_type="sales_agent",
        model_name="gemini-2.0",
        endpoint="/classify",
    )
    
    return result
```

### B. Endpoints de Análisis

```python
from app.observability import (
    record_classification_latency,
    set_model_accuracy,
)

@app.post("/analyze")
async def analyze_conversation(data: dict):
    """Analiza una conversación."""
    # Middleware mide latencia automáticamente
    
    analysis = analyze_logic(data)
    
    # Registrar accuracy del análisis
    set_model_accuracy(
        analysis.get("confidence", 0.8),
        agent_type="conversation_analyzer",
        model_name="gemini-2.0",
        endpoint="/analyze",
    )
    
    return analysis
```

### C. Endpoints de Probabilidades

```python
from app.observability import record_deal_probability

@app.post("/probability")
async def calculate_deal_probability(lead: dict):
    """Calcula probabilidad de cierre."""
    probability = calculate_probability_logic(lead)
    
    # Registrar probabilidad
    record_deal_probability(
        probability,
        agent_type="sales_agent",
        model_name="gemini-2.0",
        endpoint="/probability",
    )
    
    return {"probability": probability}
```

### D. Endpoints de Error Handling

```python
from app.observability import set_error_rate

@app.post("/api/v1/process")
async def process_data(data: dict):
    """Procesa datos con error tracking."""
    try:
        result = process_logic(data)
        return result
    except Exception as e:
        # Actualizar error rate cuando ocurra error
        # (en un monitoreo periódico)
        logger.error(f"Error procesando: {e}")
        raise

# En background task (monitoreo periódico)
async def monitor_error_rates():
    """Actualiza error rates periódicamente."""
    from app.observability import set_error_rate
    
    while True:
        error_count = get_recent_errors()
        total_requests = get_total_requests()
        
        if total_requests > 0:
            error_rate = error_count / total_requests
            set_error_rate(
                error_rate,
                agent_type="api_gateway",
                model_name="unknown",
                endpoint="/api/v1",
            )
        
        await asyncio.sleep(60)  # Actualizar cada minuto
```

---

## Integración con Media Stream Handler

```python
# En app/telephony/media_stream.py

from app.observability import (
    record_classification_latency,
    record_deal_probability,
)
import time

async def handle_media_stream(websocket):
    """Handler del stream de media de Twilio."""
    start_time = time.time()
    
    try:
        # ... código existente ...
        
        # Registrar latencia al terminar
        elapsed_ms = (time.time() - start_time) * 1000
        record_classification_latency(
            elapsed_ms,
            agent_type="media_handler",
            model_name="gemini-2.0",
            endpoint="/media",
        )
        
    except Exception as e:
        logger.error(f"Error en media stream: {e}")
        raise
```

---

## Integración con Decision Engine

```python
# En app/deal_engine.py

from app.observability import record_deal_probability

class DealEngine:
    def calculate_score(self, conversation):
        """Calcula score del deal."""
        score = self._score_logic(conversation)
        
        # Registrar probabilidad del deal
        record_deal_probability(
            score,
            agent_type="deal_engine",
            model_name="gemini-2.0",
            endpoint="/deal-score",
        )
        
        return score
```

---

## Monitoreo Periódico en Background

```python
# En main.py

async def monitor_system_metrics():
    """Task background que actualiza gauges periódicamente."""
    from app.observability import (
        set_error_rate,
        set_model_accuracy,
    )
    
    while True:
        try:
            # Obtener estadísticas del sistema
            stats = get_system_stats()
            
            # Actualizar error rate
            set_error_rate(
                stats.get("error_rate", 0),
                agent_type="system",
                model_name="unknown",
                endpoint="/system",
            )
            
            # Actualizar accuracy (ejemplo: basado en validación)
            set_model_accuracy(
                stats.get("model_accuracy", 0.85),
                agent_type="sales_agent",
                model_name="gemini-2.0",
                endpoint="/classify",
            )
            
            # Esperar antes de siguiente actualización
            await asyncio.sleep(60)
            
        except Exception as e:
            logger.error(f"Error en monitoreo de métricas: {e}")
            await asyncio.sleep(60)

# Crear task al iniciar la app
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(monitor_system_metrics())
    # ... otras tasks ...
```

---

## Ejemplo: Batch de Registros

Para registrar múltiples métricas de una sola vez (más eficiente):

```python
from app.observability import record_batch

@app.post("/analyze-batch")
async def analyze_batch(batch_data: dict):
    """Analiza un batch y registra múltiples métricas."""
    
    records = []
    for item in batch_data.get("items", []):
        result = analyze_item(item)
        
        records.append({
            "type": "latency",
            "value": result.get("latency_ms"),
            "agent_type": "batch_analyzer",
            "model_name": "gemini-2.0",
            "endpoint": "/analyze-batch",
        })
        
        records.append({
            "type": "deal_probability",
            "value": result.get("probability"),
            "agent_type": "batch_analyzer",
            "model_name": "gemini-2.0",
            "endpoint": "/analyze-batch",
        })
    
    # Registrar todo de una vez
    record_batch(records)
    
    return {"processed": len(records)}
```

---

## Decorador para Funciones Críticas

Para medir latencia de funciones específicas sin añadir middleware:

```python
from app.observability import measure_latency

@measure_latency(
    agent_type="lead_classifier",
    model_name="gemini-2.0",
    endpoint="/classify",
)
def classify_lead_sync(lead_data: dict) -> dict:
    """Latencia se registra automáticamente."""
    # Lógica de clasificación
    return {"classified": True}

# Async también funciona
@measure_latency(
    agent_type="conversation_analyzer",
    model_name="gemini-2.0",
    endpoint="/analyze",
)
async def analyze_conversation_async(conv: dict) -> dict:
    """Latencia de función async se registra automáticamente."""
    # Lógica de análisis
    return {"analyzed": True}
```

---

## Verificación Post-Integración

```bash
# 1. Iniciar la app
python -m app.main

# 2. En otra terminal, hacer una llamada
curl -X POST http://localhost:8000/classify \
  -H "Content-Type: application/json" \
  -d '{"lead_id": "test123"}'

# 3. Verificar métricas
curl http://localhost:8000/metrics | head -50

# 4. Buscar métricas específicas
curl http://localhost:8000/metrics | grep agent_classification_latency_ms

# 5. Ejemplo de output esperado
# agent_classification_latency_ms_bucket{agent_type="sales_agent",endpoint="/classify",le="25",model_name="gemini-2.0"} 1.0
# agent_classification_latency_ms_bucket{agent_type="sales_agent",endpoint="/classify",le="50",model_name="gemini-2.0"} 1.0
# agent_classification_latency_ms_bucket{agent_type="sales_agent",endpoint="/classify",le="+Inf",model_name="gemini-2.0"} 1.0
# agent_classification_latency_ms_count{agent_type="sales_agent",endpoint="/classify",model_name="gemini-2.0"} 1.0
# agent_classification_latency_ms_sum{agent_type="sales_agent",endpoint="/classify",model_name="gemini-2.0"} 145.5
```

---

## Próximos Pasos

1. **Configurar Prometheus** para scraping de `/metrics`
2. **Crear Dashboard en Grafana** con las métricas
3. **Definir Alertas** (ver PROMETHEUS_README.md)
4. **Monitoreo continuo** con Grafana + AlertManager

---

## Checklist de Integración

- [ ] Instalar `prometheus_client`
- [ ] Añadir imports en main.py
- [ ] Llamar `add_prometheus_middleware()`
- [ ] Llamar `setup_prometheus_endpoint()`
- [ ] Verificar endpoint `/metrics`
- [ ] Registrar métricas adicionales en endpoints
- [ ] Configurar Prometheus para scraping
- [ ] Crear dashboard en Grafana
- [ ] Definir alertas
- [ ] Documentar en README del proyecto

---

## Soporte

Para ejemplos adicionales, ver:
- `prometheus_examples.py` - 12 ejemplos completos
- `PROMETHEUS_README.md` - Documentación completa
- `prometheus_exporter.py` - Código con docstrings detallados
- `prometheus_integration.py` - Integración con FastAPI
