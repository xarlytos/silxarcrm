"""Integración de Prometheus con FastAPI.

Proporciona endpoint /metrics y middleware para medir latencias.
"""
from __future__ import annotations

import logging
import time
from typing import Callable

from fastapi import FastAPI, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response as StarletteResponse

from app.observability.prometheus_exporter import (
    get_metrics_content,
    record_api_call,
    record_classification_latency,
)

logger = logging.getLogger(__name__)


class PrometheusMiddleware(BaseHTTPMiddleware):
    """Middleware para medir latencia de endpoints y registrar llamadas API."""

    def __init__(
        self,
        app: FastAPI,
        agent_type: str = "default",
        model_name: str = "unknown",
    ):
        super().__init__(app)
        self.agent_type = agent_type
        self.model_name = model_name

    async def dispatch(self, request: Request, call_next: Callable) -> StarletteResponse:
        """Intercepta request/response para medir latencia."""
        # Skip /metrics endpoint
        if request.url.path == "/metrics":
            return await call_next(request)

        start_time = time.time()
        try:
            response = await call_next(request)
        except Exception as e:
            logger.error(f"Error en endpoint {request.url.path}: {e}")
            raise
        finally:
            elapsed_ms = (time.time() - start_time) * 1000

            # Registrar llamada API
            record_api_call(
                agent_type=self.agent_type,
                model_name=self.model_name,
                endpoint=request.url.path,
            )

            # Registrar latencia si es endpoint de clasificación/análisis
            if any(
                path in request.url.path
                for path in ["/classify", "/analyze", "/predict", "/score"]
            ):
                record_classification_latency(
                    elapsed_ms,
                    agent_type=self.agent_type,
                    model_name=self.model_name,
                    endpoint=request.url.path,
                )

        return response


def setup_prometheus_endpoint(
    app: FastAPI,
    path: str = "/metrics",
) -> None:
    """Registra el endpoint /metrics en la app FastAPI.

    Args:
        app: Instancia de FastAPI
        path: Path del endpoint (default: '/metrics')

    Example:
        app = FastAPI()
        setup_prometheus_endpoint(app)
    """

    @app.get(path, include_in_schema=False)
    async def metrics() -> Response:
        """Endpoint Prometheus para scraping de métricas."""
        content, content_type = get_metrics_content()
        return Response(content=content, media_type=content_type)

    logger.info(f"Prometheus metrics endpoint configurado en {path}")


def add_prometheus_middleware(
    app: FastAPI,
    agent_type: str = "default",
    model_name: str = "unknown",
) -> None:
    """Añade middleware Prometheus a la app.

    Args:
        app: Instancia de FastAPI
        agent_type: Tipo de agente para labels
        model_name: Nombre del modelo para labels

    Example:
        app = FastAPI()
        add_prometheus_middleware(app, agent_type='sales', model_name='gemini-2.0')
    """
    app.add_middleware(
        PrometheusMiddleware,
        agent_type=agent_type,
        model_name=model_name,
    )
    logger.info("Prometheus middleware añadido a FastAPI")


# ═══ EJEMPLO DE INTEGRACIÓN EN main.py ═══
"""
Uso en main.py:

    from fastapi import FastAPI
    from app.observability.prometheus_integration import (
        setup_prometheus_endpoint,
        add_prometheus_middleware,
    )
    from app.config import settings

    app = FastAPI()

    # Configurar middleware y endpoint
    add_prometheus_middleware(
        app,
        agent_type=settings.agent_type,
        model_name=settings.model_name,
    )
    setup_prometheus_endpoint(app)

    # ... resto de endpoints ...

    @app.post("/classify")
    async def classify_lead(lead_data: dict):
        # Latencia se registra automáticamente por el middleware
        return process_lead(lead_data)
"""
