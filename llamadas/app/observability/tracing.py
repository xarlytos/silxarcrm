"""OpenTelemetry distributed tracing para Revenue AI.

Instrumenta todos los componentes clave (LLM, API, agent, etc) con spans
y los exporta a GCP Cloud Trace o Jaeger local.
"""
from __future__ import annotations

import logging
from contextlib import asynccontextmanager
from typing import Any, Optional

from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.gcp_trace import GoogleCloudTraceExporter
from opentelemetry.sdk.resources import Resource
from opentelemetry.exporter.jaeger.thrift import JaegerExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

from app.config import settings

logger = logging.getLogger(__name__)


def init_tracing() -> TracerProvider:
    """Inicializa el proveedor de trazas.

    - Si TRACING_BACKEND=gcp: exporta a Google Cloud Trace
    - Si TRACING_BACKEND=jaeger: exporta a Jaeger local
    - Si TRACING_BACKEND=none: no-op (testing)
    """
    resource = Resource.create({
        "service.name": "revenue-ai",
        "service.version": settings.app_version,
        "environment": settings.environment,
        "region": settings.region,
    })

    provider = TracerProvider(resource=resource)

    # Configurar exporter según backend
    if settings.tracing_backend == "gcp":
        exporter = GoogleCloudTraceExporter()
        provider.add_span_processor(BatchSpanProcessor(exporter))
        logger.info("✓ Tracing: GCP Cloud Trace exportado")

    elif settings.tracing_backend == "jaeger":
        exporter = JaegerExporter(
            agent_host_name=settings.jaeger_host,
            agent_port=settings.jaeger_port,
        )
        provider.add_span_processor(BatchSpanProcessor(exporter))
        logger.info("✓ Tracing: Jaeger %s:%d exportado", settings.jaeger_host, settings.jaeger_port)

    else:
        logger.info("⚠ Tracing desactivado (backend=none)")

    trace.set_tracer_provider(provider)

    # Auto-instrumentar FastAPI y httpx
    FastAPIInstrumentor().instrument()
    HTTPXClientInstrumentor().instrument()

    return provider


class TracingContext:
    """Helper para manejar spans y atributos en contexto."""

    def __init__(self, name: str, call_id: str, component: str):
        self.name = name
        self.call_id = call_id
        self.component = component
        self.tracer = trace.get_tracer(__name__)
        self._current_span = None

    @asynccontextmanager
    async def span(self, name: str, attributes: dict[str, Any] | None = None):
        """Crea un span hijo dentro del contexto actual."""
        with self.tracer.start_as_current_span(f"{self.component}.{name}") as span:
            span.set_attribute("call_id", self.call_id)
            if attributes:
                for key, value in attributes.items():
                    span.set_attribute(key, value)
            yield span

    def set_attribute(self, key: str, value: Any) -> None:
        """Establece atributo en el span actual."""
        current_span = trace.get_current_span()
        if current_span:
            current_span.set_attribute(key, value)

    def add_event(self, name: str, attributes: dict[str, Any] | None = None) -> None:
        """Agrega un evento al span actual."""
        current_span = trace.get_current_span()
        if current_span:
            current_span.add_event(name, attributes or {})


# Instance global (lazy)
_tracing_context_cache: dict[str, TracingContext] = {}


def get_tracing_context(call_id: str, component: str) -> TracingContext:
    """Obtiene o crea un contexto de tracing para una llamada."""
    key = f"{call_id}:{component}"
    if key not in _tracing_context_cache:
        _tracing_context_cache[key] = TracingContext(
            name=f"call:{call_id}",
            call_id=call_id,
            component=component
        )
    return _tracing_context_cache[key]


# ═══ DECORADORES PARA INSTRUMENTACIÓN AUTOMÁTICA ═══

def traced_function(component: str, call_id_kwarg: str = "call_id"):
    """Decorador para autoinstrumentar funciones.

    Args:
        component: nombre del componente (ej: "gemini_llm", "classifier")
        call_id_kwarg: nombre del parámetro que contiene el call_id

    Ejemplo:
        @traced_function("gemini_llm")
        async def call_gemini(call_id: str, prompt: str):
            ...
    """
    def decorator(func):
        async def wrapper(*args, **kwargs):
            call_id = kwargs.get(call_id_kwarg, "unknown")
            tracer = trace.get_tracer(__name__)

            with tracer.start_as_current_span(f"{component}.{func.__name__}") as span:
                span.set_attribute("call_id", call_id)
                span.set_attribute("component", component)
                span.set_attribute("function", func.__name__)

                try:
                    result = await func(*args, **kwargs)
                    span.set_attribute("status", "ok")
                    return result
                except Exception as exc:
                    span.set_attribute("status", "error")
                    span.set_attribute("error_type", type(exc).__name__)
                    span.set_attribute("error_message", str(exc))
                    raise

        return wrapper
    return decorator


# ═══ TRACE SPAN BUILDERS ═══

class LLMSpan:
    """Helper para instrumentar llamadas a LLM."""

    def __init__(self, call_id: str, model: str):
        self.call_id = call_id
        self.model = model
        self.tracer = trace.get_tracer(__name__)
        self._span = None

    def __enter__(self):
        self._span = self.tracer.start_span(f"llm.call.{self.model}")
        self._span.set_attribute("call_id", self.call_id)
        self._span.set_attribute("model", self.model)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._span:
            if exc_type:
                self._span.set_attribute("error", True)
                self._span.set_attribute("error_type", exc_type.__name__)
            self._span.end()

    def set_input(self, tokens: int, cached: int = 0) -> None:
        if self._span:
            self._span.set_attribute("input_tokens", tokens)
            self._span.set_attribute("cached_tokens", cached)

    def set_output(self, tokens: int, latency_ms: int, cost_usd: float) -> None:
        if self._span:
            self._span.set_attribute("output_tokens", tokens)
            self._span.set_attribute("latency_ms", latency_ms)
            self._span.set_attribute("cost_usd", cost_usd)


class APISpan:
    """Helper para instrumentar llamadas a APIs externas."""

    def __init__(self, call_id: str, api: str, endpoint: str):
        self.call_id = call_id
        self.api = api
        self.endpoint = endpoint
        self.tracer = trace.get_tracer(__name__)
        self._span = None

    def __enter__(self):
        self._span = self.tracer.start_span(f"api.{self.api}")
        self._span.set_attribute("call_id", self.call_id)
        self._span.set_attribute("api", self.api)
        self._span.set_attribute("endpoint", self.endpoint)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        if self._span:
            if exc_type:
                self._span.set_attribute("error", True)
                self._span.set_attribute("error_type", exc_type.__name__)
            self._span.end()

    def set_response(self, status_code: int, latency_ms: int, size_bytes: int = 0) -> None:
        if self._span:
            self._span.set_attribute("status_code", status_code)
            self._span.set_attribute("latency_ms", latency_ms)
            if size_bytes:
                self._span.set_attribute("response_size_bytes", size_bytes)


# ═══ INICIALIZACIÓN ═══

# Inicializar tracing al importar
_provider = None

def ensure_tracing_initialized():
    global _provider
    if _provider is None:
        _provider = init_tracing()
    return _provider
