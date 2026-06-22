"""Prometheus metrics exporter para métricas de agentes de IA.

Exporta:
1. agent_classification_latency_ms (histogram)
2. model_inference_accuracy (gauge)
3. api_call_count (counter)
4. error_rate (gauge)
5. deal_probability_distribution (histogram)

Labels: agent_type, model_name, endpoint
"""
from __future__ import annotations

import logging
from threading import Lock

from prometheus_client import (
    Counter,
    Gauge,
    Histogram,
    generate_latest,
    CollectorRegistry,
    CONTENT_TYPE_LATEST,
)

logger = logging.getLogger(__name__)

# ═══ REGISTRY ═══
_registry = CollectorRegistry()
_lock = Lock()


# ═══ HISTOGRAMAS ═══
agent_classification_latency_ms = Histogram(
    name="agent_classification_latency_ms",
    documentation="Latencia de clasificación del agente en milisegundos",
    labelnames=["agent_type", "model_name", "endpoint"],
    buckets=(10, 25, 50, 100, 250, 500, 1000, 2500, 5000),
    registry=_registry,
)

deal_probability_distribution = Histogram(
    name="deal_probability_distribution",
    documentation="Distribución de probabilidades de cierre de deal (0-1)",
    labelnames=["agent_type", "model_name", "endpoint"],
    buckets=(0.05, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 0.95),
    registry=_registry,
)


# ═══ GAUGES ═══
model_inference_accuracy = Gauge(
    name="model_inference_accuracy",
    documentation="Exactitud de inferencia del modelo (0-1)",
    labelnames=["agent_type", "model_name", "endpoint"],
    registry=_registry,
)

error_rate = Gauge(
    name="error_rate",
    documentation="Tasa de error actual (0-1)",
    labelnames=["agent_type", "model_name", "endpoint"],
    registry=_registry,
)


# ═══ CONTADORES ═══
api_call_count = Counter(
    name="api_call_count",
    documentation="Número total de llamadas API",
    labelnames=["agent_type", "model_name", "endpoint"],
    registry=_registry,
)


# ═══ FUNCIONES DE RECORD ═══
def record_classification_latency(
    latency_ms: float,
    agent_type: str = "default",
    model_name: str = "unknown",
    endpoint: str = "unknown",
) -> None:
    """Registra la latencia de clasificación en milisegundos.

    Args:
        latency_ms: Latencia en milisegundos
        agent_type: Tipo de agente (ej: 'sales', 'support', 'lead_qualifier')
        model_name: Nombre del modelo (ej: 'gemini-2.0', 'gpt-4')
        endpoint: Endpoint de la API (ej: '/classify', '/analyze')
    """
    with _lock:
        try:
            agent_classification_latency_ms.labels(
                agent_type=agent_type,
                model_name=model_name,
                endpoint=endpoint,
            ).observe(latency_ms)
        except Exception as e:
            logger.error(f"Error registrando latencia: {e}")


def record_api_call(
    agent_type: str = "default",
    model_name: str = "unknown",
    endpoint: str = "unknown",
) -> None:
    """Registra una llamada API.

    Args:
        agent_type: Tipo de agente
        model_name: Nombre del modelo
        endpoint: Endpoint de la API
    """
    with _lock:
        try:
            api_call_count.labels(
                agent_type=agent_type,
                model_name=model_name,
                endpoint=endpoint,
            ).inc()
        except Exception as e:
            logger.error(f"Error registrando llamada API: {e}")


def set_model_accuracy(
    accuracy: float,
    agent_type: str = "default",
    model_name: str = "unknown",
    endpoint: str = "unknown",
) -> None:
    """Establece la exactitud del modelo.

    Args:
        accuracy: Valor de exactitud (0-1)
        agent_type: Tipo de agente
        model_name: Nombre del modelo
        endpoint: Endpoint de la API
    """
    with _lock:
        try:
            if not 0 <= accuracy <= 1:
                logger.warning(f"Exactitud fuera de rango [0-1]: {accuracy}")
                accuracy = max(0, min(1, accuracy))

            model_inference_accuracy.labels(
                agent_type=agent_type,
                model_name=model_name,
                endpoint=endpoint,
            ).set(accuracy)
        except Exception as e:
            logger.error(f"Error estableciendo exactitud: {e}")


def set_error_rate(
    error_rate_value: float,
    agent_type: str = "default",
    model_name: str = "unknown",
    endpoint: str = "unknown",
) -> None:
    """Establece la tasa de error actual.

    Args:
        error_rate_value: Tasa de error (0-1)
        agent_type: Tipo de agente
        model_name: Nombre del modelo
        endpoint: Endpoint de la API
    """
    with _lock:
        try:
            if not 0 <= error_rate_value <= 1:
                logger.warning(f"Tasa de error fuera de rango [0-1]: {error_rate_value}")
                error_rate_value = max(0, min(1, error_rate_value))

            error_rate.labels(
                agent_type=agent_type,
                model_name=model_name,
                endpoint=endpoint,
            ).set(error_rate_value)
        except Exception as e:
            logger.error(f"Error estableciendo tasa de error: {e}")


def record_deal_probability(
    probability: float,
    agent_type: str = "default",
    model_name: str = "unknown",
    endpoint: str = "unknown",
) -> None:
    """Registra la probabilidad de cierre de deal.

    Args:
        probability: Probabilidad de cierre (0-1)
        agent_type: Tipo de agente
        model_name: Nombre del modelo
        endpoint: Endpoint de la API
    """
    with _lock:
        try:
            if not 0 <= probability <= 1:
                logger.warning(f"Probabilidad de deal fuera de rango [0-1]: {probability}")
                probability = max(0, min(1, probability))

            deal_probability_distribution.labels(
                agent_type=agent_type,
                model_name=model_name,
                endpoint=endpoint,
            ).observe(probability)
        except Exception as e:
            logger.error(f"Error registrando probabilidad de deal: {e}")


def get_metrics_content() -> tuple[bytes, str]:
    """Retorna el contenido Prometheus formateado.

    Returns:
        Tupla (contenido, content_type) para usar en respuesta HTTP
    """
    with _lock:
        try:
            content = generate_latest(_registry)
            return content, CONTENT_TYPE_LATEST
        except Exception as e:
            logger.error(f"Error generando métricas Prometheus: {e}")
            return b"", CONTENT_TYPE_LATEST


# ═══ HELPERS PARA BATCHES DE REGISTROS ═══
def record_batch(
    records: list[dict],
) -> None:
    """Registra un lote de métricas de una sola vez.

    Args:
        records: Lista de dicts con claves:
            - type: 'latency', 'accuracy', 'error_rate', 'deal_probability', 'api_call'
            - value: valor numérico
            - agent_type: (opcional) tipo de agente
            - model_name: (opcional) nombre del modelo
            - endpoint: (opcional) endpoint

    Example:
        record_batch([
            {
                'type': 'latency',
                'value': 145.5,
                'agent_type': 'sales',
                'model_name': 'gemini-2.0',
                'endpoint': '/classify'
            },
            {
                'type': 'deal_probability',
                'value': 0.78,
                'agent_type': 'sales',
                'model_name': 'gemini-2.0',
                'endpoint': '/probability'
            }
        ])
    """
    with _lock:
        for record in records:
            try:
                metric_type = record.get("type")
                value = record.get("value")
                agent_type = record.get("agent_type", "default")
                model_name = record.get("model_name", "unknown")
                endpoint = record.get("endpoint", "unknown")

                if metric_type == "latency":
                    record_classification_latency(
                        value, agent_type, model_name, endpoint
                    )
                elif metric_type == "accuracy":
                    set_model_accuracy(value, agent_type, model_name, endpoint)
                elif metric_type == "error_rate":
                    set_error_rate(value, agent_type, model_name, endpoint)
                elif metric_type == "deal_probability":
                    record_deal_probability(value, agent_type, model_name, endpoint)
                elif metric_type == "api_call":
                    record_api_call(agent_type, model_name, endpoint)
            except Exception as e:
                logger.error(f"Error procesando registro en batch: {e}")


# ═══ DECORADOR PARA MEDIR LATENCIA ═══
def measure_latency(
    agent_type: str = "default",
    model_name: str = "unknown",
    endpoint: str = "unknown",
):
    """Decorador para medir latencia de funciones.

    Example:
        @measure_latency(agent_type='sales', model_name='gemini-2.0', endpoint='/classify')
        def classify_lead(lead_data):
            return process_lead(lead_data)
    """
    def decorator(func):
        def wrapper(*args, **kwargs):
            import time
            start = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                elapsed_ms = (time.time() - start) * 1000
                record_classification_latency(
                    elapsed_ms, agent_type, model_name, endpoint
                )
        return wrapper
    return decorator


# ═══ RESET / CLEAR (TESTING) ═══
def reset_metrics() -> None:
    """Limpia todas las métricas. Útil para testing."""
    with _lock:
        try:
            for collector in list(_registry._collector_to_names):
                try:
                    _registry.unregister(collector)
                except Exception:
                    pass
        except Exception as e:
            logger.error(f"Error reseteando métricas: {e}")
