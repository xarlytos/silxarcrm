"""FastAPI Router for ML Model Endpoints.

Mounts four production ML endpoint groups:
- POST /ml/propensity-predict
- POST /ml/forecast
- POST /ml/health-check
- /mab/* (Multi-Armed Bandits Thompson Sampling for opening arguments)
"""
from __future__ import annotations

import logging
from fastapi import APIRouter, HTTPException, status
from app.ml.endpoints import (
    ForecastRequest,
    ForecastResponse,
    HealthCheckResponse,
    PropensityFeaturesInput,
    PropensityPredictionResponse,
    get_ml_service,
)
from app.ml.mab_routes import router as mab_router

logger = logging.getLogger(__name__)

# Create router with prefix and tags
router = APIRouter(
    prefix="/ml",
    tags=["ML Models"],
    responses={
        400: {"description": "Invalid input"},
        500: {"description": "Internal server error"},
    },
)

# Include MAB routes
router.include_router(mab_router)


@router.post(
    "/propensity-predict",
    response_model=PropensityPredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Predict Deal Propensity to Close",
    description="""
    Predicts the probability of a deal closing based on engagement signals.

    **Input validation**: All required fields are validated per Pydantic schema.

    **ML Service**: Calls trained propensity model (LightGBM).

    **Observability**: Logs to decision logger and event stream.

    **Output**: Probability (0-1), confidence score, feature importance, recommendation.
    """,
)
async def propensity_predict(
    request: PropensityFeaturesInput,
) -> PropensityPredictionResponse:
    """
    Predict the probability of a deal closing.

    This endpoint:
    1. Validates all input features via Pydantic
    2. Encodes categorical features
    3. Calls the propensity model
    4. Logs to observability system
    5. Returns prediction with recommendation

    **Features:**
    - call_count: Number of calls with prospect
    - avg_call_duration: Average call length in seconds
    - email_count: Number of emails sent
    - demo_count: Number of product demos given
    - budget_mentioned: Whether budget was discussed
    - authority_identified: Whether decision maker identified
    - objections_count: Number of sales objections raised
    - days_in_stage: Days spent in current sales stage
    - company_size: Company size (small | medium | large)
    - industry: Industry classification

    **Recommendations:**
    - ACCELERATE_CLOSE: probability >= 75% → high priority follow-up
    - NURTURE_DEAL: probability 50-75% → continue engagement
    - REQUALIFY: probability < 50% → assess fit or deprioritize
    """
    try:
        ml_service = get_ml_service()
        prediction = ml_service.predict_propensity(request)
        return prediction

    except ValueError as e:
        logger.error(f"Validation error in propensity prediction: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error in propensity prediction: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating propensity prediction",
        )


@router.post(
    "/forecast",
    response_model=ForecastResponse,
    status_code=status.HTTP_200_OK,
    summary="Generate 90-Day Revenue Forecast",
    description="""
    Generates a 90-day revenue forecast with daily predictions and confidence intervals.

    **Input validation**: Filters and thresholds validated.

    **ML Service**: Uses time series model (Prophet) with weekly seasonality.

    **Observability**: Logs forecast generation events.

    **Output**: Daily forecasts with expected revenue, deal volume, and confidence intervals.
    """,
)
async def forecast_90_days(
    request: ForecastRequest,
) -> ForecastResponse:
    """
    Generate a 90-day revenue forecast.

    This endpoint:
    1. Validates filter parameters
    2. Filters pipeline by region, vertical, deal size
    3. Runs time series forecast model
    4. Aggregates daily predictions
    5. Calculates confidence intervals
    6. Logs to observability

    **Query Parameters:**
    - region: Filter by region (default: "all")
    - vertical: Filter by industry vertical (default: "all")
    - min_deal_size_usd: Minimum deal size to include (default: 0)
    - include_confidence_intervals: Include 68% and 95% CI (default: true)

    **Output Metrics:**
    - forecast_period: Date range of forecast
    - daily_forecasts: Array of daily predictions
    - total_expected_revenue: Sum of all daily forecasts
    - total_expected_deals: Sum of deal count forecast
    - average_deal_size: Average deal value
    - high_confidence_deals: Deals with >80% propensity

    **Confidence Intervals:**
    - 68% CI: ±1 standard deviation (0.68 probability)
    - 95% CI: ±2 standard deviations (0.95 probability)
    """
    try:
        ml_service = get_ml_service()
        forecast = ml_service.forecast_90_days(
            region=request.region,
            vertical=request.vertical,
            min_deal_size_usd=request.min_deal_size_usd,
            include_ci=request.include_confidence_intervals,
        )
        return forecast

    except ValueError as e:
        logger.error(f"Validation error in forecast: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid input: {str(e)}",
        )
    except Exception as e:
        logger.error(f"Unexpected error in forecast generation: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error generating forecast",
        )


@router.post(
    "/health-check",
    response_model=HealthCheckResponse,
    status_code=status.HTTP_200_OK,
    summary="Get ML Model Health Metrics",
    description="""
    Comprehensive health check for ML models.

    **Returns**: Model status, accuracy metrics, inference performance, error rates.

    **Observability**: Tracks latency percentiles (p50, p95, p99).

    **Output**: Complete model diagnostics for monitoring.
    """,
)
async def health_check() -> HealthCheckResponse:
    """
    Get comprehensive ML model health metrics.

    This endpoint:
    1. Queries model training status
    2. Calculates inference performance metrics
    3. Tracks error rates
    4. Computes latency percentiles
    5. Returns full health snapshot

    **Response Fields:**
    - status: Overall health (overall | trained | degraded | not_trained)
    - model_name: Name of the model
    - model_status: Training status
    - is_trained: Whether model is trained
    - training_accuracy: Accuracy on training set
    - training_auc: AUC-ROC score
    - training_precision: Precision (TP / (TP+FP))
    - training_recall: Recall (TP / (TP+FN))
    - last_training: Timestamp of last training
    - last_inference: Timestamp of last prediction
    - inference_count_24h: Predictions in last 24h
    - average_inference_time_ms: Mean inference latency
    - error_count_24h: Errors in last 24h
    - latency_p50_ms: Median latency (50th percentile)
    - latency_p95_ms: 95th percentile latency
    - latency_p99_ms: 99th percentile latency
    - feature_count: Number of input features
    - model_version: Model version identifier
    - timestamp: Response timestamp

    **Status Interpretation:**
    - overall: System is functioning normally
    - trained: Model is fully trained and ready
    - degraded: Model functioning but error rate elevated
    - not_trained: Model has not been trained yet
    """
    try:
        ml_service = get_ml_service()
        health = ml_service.get_model_health()
        return health

    except Exception as e:
        logger.error(f"Error in health check: {e}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Error retrieving model health metrics",
        )


# Export router for mounting in FastAPI app
__all__ = ["router"]
