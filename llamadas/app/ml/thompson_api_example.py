"""
Ejemplo de integración de Thompson Sampling con FastAPI.

Este archivo muestra cómo exponer Thompson Sampling como endpoints REST
para integración con dashboard/mobile/third-party systems.

ENDPOINTS:
    POST /ml/thompson/select-argument
        Request: {"call_id": str, "context": dict}
        Response: {"argument_id": int, "argument_name": str}

    POST /ml/thompson/record-outcome
        Request: {"call_id": str, "argument_id": int, "conversion": bool}
        Response: {"status": "recorded"}

    GET /ml/thompson/current-recommendation
        Response: {"argument_id": int, "name": str, "score": float, ...}

    GET /ml/thompson/weekly-report
        Response: {full weekly report}

    GET /ml/thompson/status
        Response: {current status of all arguments}
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, BackgroundTasks
from pydantic import BaseModel, Field
from typing import Optional, Dict, Any, List
from datetime import datetime
import logging
import json

from app.ml.thompson_sampler_integration import ThompsonSamplerIntegration

logger = logging.getLogger(__name__)

# ============================================================================
# PYDANTIC MODELS
# ============================================================================


class SelectArgumentRequest(BaseModel):
    """Request para seleccionar argumento."""

    call_id: str = Field(..., description="Unique call identifier")
    context: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Additional context (customer_profile, industry, etc.)",
    )


class SelectArgumentResponse(BaseModel):
    """Response con argumento seleccionado."""

    argument_id: int
    argument_name: str
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class RecordOutcomeRequest(BaseModel):
    """Request para registrar resultado."""

    call_id: str = Field(..., description="Call ID")
    argument_id: int = Field(..., description="Argument ID (0-7)")
    conversion: bool = Field(..., description="True if successful")
    context: Optional[Dict[str, Any]] = Field(None, description="Optional metadata")


class RecordOutcomeResponse(BaseModel):
    """Response de registro."""

    status: str = "recorded"
    message: str = "Outcome recorded successfully"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ArgumentStatusModel(BaseModel):
    """Status de un argumento."""

    id: int
    name: str
    posterior_mean: float
    posterior_variance: float
    empirical_conversion_rate: float
    total_trials: int
    successes: int
    failures: int


class CurrentRecommendationResponse(BaseModel):
    """Recomendación actual."""

    argument_id: int
    argument_name: str
    posterior_mean: float
    conversion_rate: float
    trials: int
    method: str = "thompson_sampling"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat())


class ArgumentStatus(BaseModel):
    """Status completo de todos argumentos."""

    timestamp: str
    arguments: List[ArgumentStatusModel]
    best_argument: Dict[str, Any]


class WeeklyReportResponse(BaseModel):
    """Weekly report (flexible para aceptar todo)."""

    timestamp: str
    week_ending: str
    summary: Dict[str, Any]
    recommendation: Dict[str, Any]
    performance_ranking: List[Dict[str, Any]]
    action_items: List[str]
    insights: List[str]

    class Config:
        extra = "allow"  # Permitir fields adicionales


# ============================================================================
# THOMPSON SAMPLER SERVICE (Singleton)
# ============================================================================


class ThompsonSamplerService:
    """
    Servicio de Thompson Sampling con estado global.

    En producción, usar Redis o base de datos para persistencia distribuida.
    """

    _instance: Optional[ThompsonSamplerService] = None
    _integration: Optional[ThompsonSamplerIntegration] = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self._integration = ThompsonSamplerIntegration(
            num_arguments=8,
            persistence_path=None,  # En producción: usar path real
        )
        self._initialized = True
        logger.info("Thompson Sampler Service initialized")

    @property
    def integration(self) -> ThompsonSamplerIntegration:
        if self._integration is None:
            raise RuntimeError("Thompson Sampler not initialized")
        return self._integration


# ============================================================================
# ROUTER
# ============================================================================


router = APIRouter(
    prefix="/ml/thompson",
    tags=["ml", "thompson-sampling"],
)


@router.post(
    "/select-argument",
    response_model=SelectArgumentResponse,
    summary="Select opening argument using Thompson Sampling",
)
async def select_argument(request: SelectArgumentRequest) -> SelectArgumentResponse:
    """
    Seleccionar argumento de venta usando Thompson Sampling.

    Thompson Sampling automáticamente balancea exploration/exploitation,
    concentrando más tráfico en argumentos de mejor performance.
    """
    try:
        service = ThompsonSamplerService()
        arg_id, arg_name = service.integration.select_argument(
            call_id=request.call_id,
            call_context=request.context,
        )

        logger.info(
            f"Argument selected for call {request.call_id}: "
            f"{arg_id} ({arg_name[:50]})"
        )

        return SelectArgumentResponse(
            argument_id=arg_id,
            argument_name=arg_name,
        )

    except Exception as e:
        logger.error(f"Error selecting argument: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/record-outcome",
    response_model=RecordOutcomeResponse,
    summary="Record call outcome for Bayesian update",
)
async def record_outcome(
    request: RecordOutcomeRequest,
    background_tasks: BackgroundTasks,
) -> RecordOutcomeResponse:
    """
    Registrar resultado de una llamada para Bayesian update.

    Esto actualiza la distribution Beta del argumento usado:
    - Si conversion=True: alpha += 1 (success)
    - Si conversion=False: beta += 1 (failure)
    """
    try:
        if not (0 <= request.argument_id < 8):
            raise ValueError(f"Invalid argument_id: {request.argument_id}")

        service = ThompsonSamplerService()
        service.integration.record_outcome(
            call_id=request.call_id,
            argument_id=request.argument_id,
            conversion=request.conversion,
            context=request.context,
        )

        logger.info(
            f"Outcome recorded for call {request.call_id}: "
            f"arg_id={request.argument_id}, conversion={request.conversion}"
        )

        # Guardar estado en background (cada N outcomes)
        background_tasks.add_task(_maybe_save_state)

        return RecordOutcomeResponse()

    except ValueError as e:
        logger.warning(f"Invalid outcome request: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"Error recording outcome: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/current-recommendation",
    response_model=CurrentRecommendationResponse,
    summary="Get current best argument recommendation",
)
async def get_current_recommendation(
    method: str = "thompson",
) -> CurrentRecommendationResponse:
    """
    Obtener recomendación actual de mejor argumento.

    Methods:
    - "thompson": Thompson Sampling (exploration balanceada)
    - "mean": Posterior mean (explotación pura)
    - "empirical": Tasa observada (sin Bayesian update)
    """
    try:
        service = ThompsonSamplerService()
        rec = service.integration.get_current_recommendation(method=method)

        return CurrentRecommendationResponse(**rec)

    except Exception as e:
        logger.error(f"Error getting recommendation: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/status",
    response_model=ArgumentStatus,
    summary="Get status of all arguments",
)
async def get_status() -> ArgumentStatus:
    """
    Obtener status actual de todos los 8 argumentos.

    Incluye:
    - posterior_mean: Tasa de conversión esperada (Bayesian)
    - posterior_variance: Confianza en la estimate
    - empirical_conversion_rate: Tasa observada
    - trials: Número de calls con este argumento
    """
    try:
        service = ThompsonSamplerService()
        posteriors = service.integration.get_all_arguments_status()

        # Convertir a models
        arguments = [ArgumentStatusModel(**p) for p in posteriors]

        # Best argument
        best = max(arguments, key=lambda a: a.posterior_mean)

        return ArgumentStatus(
            timestamp=datetime.utcnow().isoformat(),
            arguments=arguments,
            best_argument=best.dict(),
        )

    except Exception as e:
        logger.error(f"Error getting status: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get(
    "/weekly-report",
    response_model=WeeklyReportResponse,
    summary="Get weekly performance report",
)
async def get_weekly_report() -> WeeklyReportResponse:
    """
    Obtener reporte semanal completo.

    Incluye:
    - Performance ranking por posterior mean
    - Action items accionables
    - Insights automáticos
    - Análisis de calls por argumento
    """
    try:
        service = ThompsonSamplerService()
        report = service.integration.get_weekly_report()

        return WeeklyReportResponse(**report)

    except Exception as e:
        logger.error(f"Error generating weekly report: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post(
    "/reset",
    summary="Reset all arguments (use with caution)",
)
async def reset_all(confirm: bool = False) -> Dict[str, str]:
    """
    Reset todas las distribuciones a prior uniforme.

    ⚠️ Usa con cuidado: perdés todo lo aprendido.
    """
    if not confirm:
        return {
            "error": "Reset requires confirm=true",
            "warning": "This will reset all learned distributions",
        }

    try:
        service = ThompsonSamplerService()
        service.integration.reset_all()
        logger.warning("Thompson Sampler reset by user")

        return {
            "status": "reset_complete",
            "message": "All arguments reset to prior Beta(1,1)",
        }

    except Exception as e:
        logger.error(f"Error resetting: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================


def _maybe_save_state(interval: int = 10) -> None:
    """Guardar estado cada N outcomes."""
    # En producción, implementar contador global
    # Para ahora, es un placeholder
    pass


# ============================================================================
# USAGE EXAMPLE
# ============================================================================

if __name__ == "__main__":
    import uvicorn

    # Crear FastAPI app
    from fastapi import FastAPI

    app = FastAPI(title="Thompson Sampling API")
    app.include_router(router)

    # Health check
    @app.get("/health")
    async def health():
        return {"status": "ok"}

    # Run
    print("Starting Thompson Sampling API server...")
    print("Available endpoints:")
    print("  POST   /ml/thompson/select-argument")
    print("  POST   /ml/thompson/record-outcome")
    print("  GET    /ml/thompson/current-recommendation")
    print("  GET    /ml/thompson/status")
    print("  GET    /ml/thompson/weekly-report")
    print("  POST   /ml/thompson/reset")
    print()

    uvicorn.run(app, host="0.0.0.0", port=8000)
