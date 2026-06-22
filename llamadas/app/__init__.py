"""Agente de ventas por voz (Gemini Live + Twilio)."""

# Router exports for easy imports
from .router import (
    PipelineRouter,
    Intent,
    Pipeline,
    RoutingDecision,
    IntentMatch,
    RouteMetrics,
    RouterConfig,
    IntentDetector,
    PipelineSelector,
    init_router,
    get_router,
)

__all__ = [
    "PipelineRouter",
    "Intent",
    "Pipeline",
    "RoutingDecision",
    "IntentMatch",
    "RouteMetrics",
    "RouterConfig",
    "IntentDetector",
    "PipelineSelector",
    "init_router",
    "get_router",
]
