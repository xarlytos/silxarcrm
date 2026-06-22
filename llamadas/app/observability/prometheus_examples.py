"""Ejemplos de uso de prometheus_exporter.py

Casos de uso y patrones de integración.
"""
from __future__ import annotations

from app.observability.prometheus_exporter import (
    measure_latency,
    record_api_call,
    record_batch,
    record_classification_latency,
    record_deal_probability,
    set_error_rate,
    set_model_accuracy,
)


# ═══ EJEMPLO 1: REGISTRO SIMPLE DE LATENCIA ═══
def example_simple_latency():
    """Registrar latencia de un endpoint."""
    latency_ms = 145.5

    record_classification_latency(
        latency_ms=latency_ms,
        agent_type="sales",
        model_name="gemini-2.0",
        endpoint="/classify",
    )
    print(f"Latencia registrada: {latency_ms}ms")


# ═══ EJEMPLO 2: DECORADOR PARA MEDIR LATENCIA AUTOMÁTICAMENTE ═══
@measure_latency(
    agent_type="lead_qualifier",
    model_name="gemini-2.0",
    endpoint="/score",
)
def classify_lead(lead_data: dict) -> dict:
    """Función cuya latencia se mide automáticamente."""
    # Lógica de clasificación
    score = 0.85
    return {"lead_id": lead_data["id"], "score": score}


# ═══ EJEMPLO 3: REGISTRAR PROBABILIDAD DE DEAL ═══
def example_deal_probability():
    """Registrar probabilidad de cierre."""
    probability = 0.78

    record_deal_probability(
        probability=probability,
        agent_type="sales",
        model_name="gemini-2.0",
        endpoint="/probability",
    )
    print(f"Probabilidad de deal: {probability}")


# ═══ EJEMPLO 4: ESTABLECER EXACTITUD DEL MODELO ═══
def example_set_accuracy():
    """Establecer exactitud actual del modelo."""
    accuracy = 0.92

    set_model_accuracy(
        accuracy=accuracy,
        agent_type="intent_detector",
        model_name="gemini-2.0",
        endpoint="/intent",
    )
    print(f"Exactitud del modelo: {accuracy}")


# ═══ EJEMPLO 5: ESTABLECER TASA DE ERROR ═══
def example_error_rate():
    """Registrar tasa de error actual."""
    errors = 5
    total_calls = 100
    error_rate_value = errors / total_calls

    set_error_rate(
        error_rate_value=error_rate_value,
        agent_type="api_gateway",
        model_name="unknown",
        endpoint="/api/v1",
    )
    print(f"Tasa de error: {error_rate_value:.2%}")


# ═══ EJEMPLO 6: REGISTRAR LLAMADA API ═══
def example_api_call():
    """Registrar una llamada API."""
    record_api_call(
        agent_type="conversation_engine",
        model_name="gemini-2.0",
        endpoint="/conversation",
    )
    print("Llamada API registrada")


# ═══ EJEMPLO 7: BATCH DE REGISTROS ═══
def example_batch_records():
    """Registrar múltiples métricas de una sola vez."""
    records = [
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
        {
            "type": "accuracy",
            "value": 0.92,
            "agent_type": "sales",
            "model_name": "gemini-2.0",
            "endpoint": "/score",
        },
        {
            "type": "error_rate",
            "value": 0.05,
            "agent_type": "api_gateway",
            "model_name": "unknown",
            "endpoint": "/api/v1",
        },
        {
            "type": "api_call",
            "agent_type": "conversation_engine",
            "model_name": "gemini-2.0",
            "endpoint": "/conversation",
        },
    ]

    record_batch(records)
    print(f"Registrados {len(records)} registros en batch")


# ═══ EJEMPLO 8: INTEGRACIÓN CON FASTAPI ═══
def example_fastapi_integration():
    """Ejemplo de integración completa en main.py."""
    code = '''
from fastapi import FastAPI
from app.observability.prometheus_integration import (
    setup_prometheus_endpoint,
    add_prometheus_middleware,
)
from app.config import settings

app = FastAPI(title="Revenue AI Agent")

# 1. Añadir middleware para medir latencias automáticamente
add_prometheus_middleware(
    app,
    agent_type="sales_agent",
    model_name="gemini-2.0",
)

# 2. Registrar endpoint /metrics para Prometheus
setup_prometheus_endpoint(app)

# 3. Los endpoints heredan medición automática
@app.post("/classify")
async def classify_lead(lead: dict):
    """
    - Latencia se registra automáticamente
    - Llamada API se cuenta automáticamente
    """
    return {"classified": True}

@app.post("/probability")
async def calculate_probability(lead: dict):
    """Endpoint que registra probabilidad de deal."""
    from app.observability import record_deal_probability

    probability = calculate_deal_score(lead)
    record_deal_probability(
        probability,
        agent_type="sales_agent",
        model_name="gemini-2.0",
        endpoint="/probability",
    )
    return {"probability": probability}

# Para scraping desde Prometheus:
# curl http://localhost:8000/metrics
    '''
    print(code)


# ═══ EJEMPLO 9: MONITOREO PERIÓDICO ═══
def example_periodic_monitoring():
    """Ejemplo de actualizar métricas periódicamente."""
    import asyncio
    import random

    async def monitor_loop():
        """Simular loop de monitoreo que actualiza gauges."""
        while True:
            # Simular accuracy del modelo
            accuracy = 0.85 + random.uniform(-0.05, 0.05)
            set_model_accuracy(
                accuracy,
                agent_type="sales",
                model_name="gemini-2.0",
                endpoint="/classify",
            )

            # Simular error rate
            error_rate_val = random.uniform(0.01, 0.10)
            set_error_rate(
                error_rate_val,
                agent_type="api_gateway",
                model_name="unknown",
                endpoint="/api/v1",
            )

            await asyncio.sleep(60)  # Actualizar cada minuto

    asyncio.create_task(monitor_loop())


# ═══ EJEMPLO 10: SCRAPING DESDE PROMETHEUS ═══
def example_prometheus_scraping():
    """Configuración de Prometheus para scraper la app."""
    yaml_config = """
# prometheus.yml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  - job_name: 'revenue-ai-agent'
    static_configs:
      - targets: ['localhost:8000']
    metrics_path: '/metrics'
    scrape_interval: 10s
    scrape_timeout: 5s
    """
    print(yaml_config)


# ═══ EJEMPLO 11: ALERTAS EN PROMETHEUS ═══
def example_prometheus_alerts():
    """Ejemplo de reglas de alerta."""
    yaml_alerts = """
# prometheus_rules.yml
groups:
  - name: revenue_ai_alerts
    interval: 30s
    rules:
      # Alerta si latencia P95 > 500ms
      - alert: HighClassificationLatency
        expr: histogram_quantile(0.95, agent_classification_latency_ms) > 500
        for: 2m
        labels:
          severity: warning
        annotations:
          summary: "Alta latencia en clasificación ({{ $value }}ms)"

      # Alerta si error rate > 10%
      - alert: HighErrorRate
        expr: error_rate > 0.1
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: "Tasa de error crítica: {{ $value | humanizePercentage }}"

      # Alerta si accuracy < 80%
      - alert: LowModelAccuracy
        expr: model_inference_accuracy < 0.8
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "Exactitud del modelo baja: {{ $value | humanizePercentage }}"

      # Alerta si deal probability < 30%
      - alert: LowDealProbability
        expr: histogram_quantile(0.5, deal_probability_distribution) < 0.3
        for: 5m
        labels:
          severity: info
        annotations:
          summary: "Probabilidad de deal por debajo de lo esperado"
    """
    print(yaml_alerts)


# ═══ EJEMPLO 12: QUERIES ÚTILES EN PROMETHEUS ═══
def example_useful_queries():
    """Ejemplos de queries útiles."""
    queries = {
        "P95 latencia clasificación": (
            'histogram_quantile(0.95, agent_classification_latency_ms)'
        ),
        "Promedio latencia": (
            'histogram_quantile(0.5, agent_classification_latency_ms)'
        ),
        "Error rate actual": "error_rate",
        "Accuracy promedio": "model_inference_accuracy",
        "Deal probability mediana": (
            'histogram_quantile(0.5, deal_probability_distribution)'
        ),
        "Llamadas por segundo": "rate(api_call_count[1m])",
        "Latencia por modelo": (
            'histogram_quantile(0.95, agent_classification_latency_ms) by (model_name)'
        ),
        "Latencia por agent_type": (
            'histogram_quantile(0.95, agent_classification_latency_ms) by (agent_type)'
        ),
    }

    for desc, query in queries.items():
        print(f"{desc}:\n  {query}\n")


if __name__ == "__main__":
    print("═" * 60)
    print("EJEMPLOS DE USO - prometheus_exporter.py")
    print("═" * 60)

    print("\n1. REGISTRO SIMPLE:")
    example_simple_latency()

    print("\n2. DECORADOR PARA LATENCIA:")
    result = classify_lead({"id": "lead_123"})
    print(f"Resultado: {result}")

    print("\n3. PROBABILIDAD DE DEAL:")
    example_deal_probability()

    print("\n4. EXACTITUD DEL MODELO:")
    example_set_accuracy()

    print("\n5. TASA DE ERROR:")
    example_error_rate()

    print("\n6. LLAMADA API:")
    example_api_call()

    print("\n7. BATCH DE REGISTROS:")
    example_batch_records()

    print("\n8. INTEGRACIÓN FASTAPI:")
    example_fastapi_integration()

    print("\n9. MONITOREO PERIÓDICO:")
    print("(Implementado como async task)")

    print("\n10. CONFIGURACIÓN PROMETHEUS:")
    example_prometheus_scraping()

    print("\n11. REGLAS DE ALERTA:")
    example_prometheus_alerts()

    print("\n12. QUERIES ÚTILES:")
    example_useful_queries()
