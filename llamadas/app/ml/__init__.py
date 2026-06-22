"""
ML module para SilxaCRM llamadas.

Contiene:
- thompson_sampler: Thompson Sampling para A/B testing bayesiano
- thompson_sampler_integration: Integración con experimentation framework
- propensity_model: Propensity modeling para predicción
- endpoints: FastAPI ML inference endpoints (propensity, forecast, health-check)
- router: FastAPI router para montar endpoints
- observability: ML-specific logging y monitoring
"""

from app.ml.thompson_sampler import (
    ThompsonSampler,
    BetaDistribution,
    ArgumentMetrics,
)
from app.ml.thompson_sampler_integration import (
    ThompsonSamplerIntegration,
    ConversationArgumentSelector,
    CallRecord,
)
from app.ml.endpoints import (
    PropensityFeaturesInput,
    PropensityPredictionResponse,
    ForecastRequest,
    ForecastResponse,
    HealthCheckResponse,
    MLService,
    get_ml_service,
)
from app.ml.router import router as ml_router
from app.ml.observability import (
    MLObservabilityLogger,
    get_ml_observability_logger,
)

__all__ = [
    "ThompsonSampler",
    "BetaDistribution",
    "ArgumentMetrics",
    "ThompsonSamplerIntegration",
    "ConversationArgumentSelector",
    "CallRecord",
    # ML Endpoints
    "PropensityFeaturesInput",
    "PropensityPredictionResponse",
    "ForecastRequest",
    "ForecastResponse",
    "HealthCheckResponse",
    "MLService",
    "get_ml_service",
    "ml_router",
    # Observability
    "MLObservabilityLogger",
    "get_ml_observability_logger",
]
