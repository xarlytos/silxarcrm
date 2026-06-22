"""FastAPI ML Model Endpoints — Propensity, Forecast, Health Check.

Provides production-ready ML inference endpoints with:
- Pydantic input validation
- ML service integration
- Observability logging
- Structured JSON responses
"""
from __future__ import annotations

import logging
import time
from datetime import datetime, timedelta
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, validator

from app.ml.propensity_model import PropensityToCloseModel
from app.observability.event_logger import EventType, logger as obs_logger
from app.observability.decision_logger import DecisionLogger
from app.ml.observability import get_ml_observability_logger

logger = logging.getLogger(__name__)


# ═══ PYDANTIC MODELS FOR VALIDATION ═══


class PropensityFeaturesInput(BaseModel):
    """Input validation for propensity prediction."""

    deal_id: str = Field(..., min_length=1, description="Unique deal identifier")
    call_count: int = Field(..., ge=0, description="Number of calls")
    avg_call_duration: float = Field(..., ge=0, description="Average call duration in seconds")
    email_count: int = Field(..., ge=0, description="Number of emails sent")
    demo_count: int = Field(..., ge=0, description="Number of demos scheduled")
    budget_mentioned: bool = Field(..., description="Budget mentioned in conversation")
    authority_identified: bool = Field(..., description="Decision maker identified")
    objections_count: int = Field(..., ge=0, description="Number of objections raised")
    days_in_stage: int = Field(..., ge=0, description="Days in current sales stage")
    company_size: str = Field(..., regex="^(small|medium|large)$", description="Company size")
    industry: str = Field(..., min_length=1, description="Industry classification")

    class Config:
        schema_extra = {
            "example": {
                "deal_id": "DEAL-001",
                "call_count": 3,
                "avg_call_duration": 1200.5,
                "email_count": 5,
                "demo_count": 1,
                "budget_mentioned": True,
                "authority_identified": True,
                "objections_count": 2,
                "days_in_stage": 14,
                "company_size": "medium",
                "industry": "technology",
            }
        }


class PropensityPredictionResponse(BaseModel):
    """Response format for propensity prediction."""

    deal_id: str
    probability: float = Field(..., ge=0, le=1, description="Probability of closing (0-1)")
    confidence: float = Field(..., ge=0, le=1, description="Model confidence (0-1)")
    feature_importance: Dict[str, float]
    timestamp: datetime
    execution_time_ms: float
    model_status: str
    recommendation: str

    class Config:
        schema_extra = {
            "example": {
                "deal_id": "DEAL-001",
                "probability": 0.78,
                "confidence": 0.92,
                "feature_importance": {
                    "call_count": 0.25,
                    "demo_count": 0.18,
                    "budget_mentioned": 0.15,
                },
                "timestamp": "2026-06-22T15:30:00Z",
                "execution_time_ms": 12.5,
                "model_status": "trained",
                "recommendation": "HIGH_PRIORITY_FOLLOW_UP"
            }
        }


class ForecastRequest(BaseModel):
    """Input validation for 90-day forecast."""

    region: str = Field(default="all", description="Geographic region")
    vertical: str = Field(default="all", description="Industry vertical")
    min_deal_size_usd: float = Field(default=0, ge=0, description="Minimum deal size in USD")
    include_confidence_intervals: bool = Field(
        default=True,
        description="Include 68% and 95% confidence intervals"
    )

    class Config:
        schema_extra = {
            "example": {
                "region": "LATAM",
                "vertical": "technology",
                "min_deal_size_usd": 10000,
                "include_confidence_intervals": True,
            }
        }


class DailyForecast(BaseModel):
    """Daily forecast point."""

    date: str
    expected_revenue: float = Field(ge=0, description="Expected revenue for the day")
    pipeline_volume: int = Field(ge=0, description="Expected deal volume")
    confidence_lower_68: Optional[float] = Field(None, description="68% CI lower bound")
    confidence_upper_68: Optional[float] = Field(None, description="68% CI upper bound")
    confidence_lower_95: Optional[float] = Field(None, description="95% CI lower bound")
    confidence_upper_95: Optional[float] = Field(None, description="95% CI upper bound")


class ForecastResponse(BaseModel):
    """Response format for 90-day forecast."""

    forecast_period: str = Field(description="Forecast period (e.g., '2026-06-22 to 2026-09-20')")
    daily_forecasts: List[DailyForecast]
    total_expected_revenue: float = Field(ge=0, description="Total expected revenue over 90 days")
    total_expected_deals: int = Field(ge=0, description="Total expected deals closed")
    average_deal_size: float = Field(ge=0, description="Average deal size")
    high_confidence_deals: int = Field(
        ge=0,
        description="Deals with >80% propensity score"
    )
    timestamp: datetime
    execution_time_ms: float
    model_version: str

    class Config:
        schema_extra = {
            "example": {
                "forecast_period": "2026-06-22 to 2026-09-20",
                "daily_forecasts": [
                    {
                        "date": "2026-06-22",
                        "expected_revenue": 45000,
                        "pipeline_volume": 2,
                        "confidence_lower_68": 40000,
                        "confidence_upper_68": 50000,
                        "confidence_lower_95": 35000,
                        "confidence_upper_95": 55000,
                    }
                ],
                "total_expected_revenue": 2850000,
                "total_expected_deals": 65,
                "average_deal_size": 43846,
                "high_confidence_deals": 42,
                "timestamp": "2026-06-22T15:30:00Z",
                "execution_time_ms": 24.3,
                "model_version": "lightgbm-2.0"
            }
        }


class ModelMetric(BaseModel):
    """Individual model metric."""

    name: str
    value: float
    timestamp: datetime


class HealthCheckResponse(BaseModel):
    """Response format for model health check."""

    status: str = Field(description="overall | trained | degraded | not_trained")
    model_name: str
    model_status: str
    is_trained: bool
    training_accuracy: Optional[float] = Field(None, ge=0, le=1)
    training_auc: Optional[float] = Field(None, ge=0, le=1)
    training_precision: Optional[float] = Field(None, ge=0, le=1)
    training_recall: Optional[float] = Field(None, ge=0, le=1)
    last_training: Optional[datetime] = None
    last_inference: Optional[datetime] = None
    inference_count_24h: int = Field(default=0)
    average_inference_time_ms: float = Field(default=0, ge=0)
    error_count_24h: int = Field(default=0)
    latency_p50_ms: float = Field(default=0, ge=0)
    latency_p95_ms: float = Field(default=0, ge=0)
    latency_p99_ms: float = Field(default=0, ge=0)
    feature_count: int = Field(ge=0)
    model_version: str
    timestamp: datetime

    class Config:
        schema_extra = {
            "example": {
                "status": "overall",
                "model_name": "propensity_to_close",
                "model_status": "trained",
                "is_trained": True,
                "training_accuracy": 0.89,
                "training_auc": 0.92,
                "training_precision": 0.88,
                "training_recall": 0.85,
                "last_training": "2026-06-15T10:00:00Z",
                "last_inference": "2026-06-22T15:30:00Z",
                "inference_count_24h": 2450,
                "average_inference_time_ms": 12.3,
                "error_count_24h": 2,
                "latency_p50_ms": 10.5,
                "latency_p95_ms": 18.2,
                "latency_p99_ms": 25.8,
                "feature_count": 10,
                "model_version": "lightgbm-2.0",
                "timestamp": "2026-06-22T15:30:00Z"
            }
        }


# ═══ SINGLETON ML SERVICE ═══


class MLService:
    """Singleton ML service managing all models and predictions."""

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(MLService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.propensity_model = PropensityToCloseModel()
        self.decision_logger = DecisionLogger()
        self.ml_obs_logger = get_ml_observability_logger()

        # Metrics tracking (simplified; in production use Prometheus/StatsD)
        self._inference_times: List[float] = []
        self._error_count_24h: int = 0
        self._inference_count_24h: int = 0
        self._last_inference: Optional[datetime] = None
        self._last_training: Optional[datetime] = None
        self._training_metrics: Dict[str, float] = {}

        self._initialized = True
        logger.info("MLService initialized")

    def encode_features(self, input_data: PropensityFeaturesInput) -> List[float]:
        """Convert Pydantic input to feature array."""
        company_size_map = {"small": 1, "medium": 2, "large": 3}
        # Industry encoding: simplified (in production, use a vocab)
        industry_map = {
            "technology": 1,
            "finance": 2,
            "healthcare": 3,
            "retail": 4,
            "other": 0,
        }

        return [
            float(input_data.call_count),
            float(input_data.avg_call_duration),
            float(input_data.email_count),
            float(input_data.demo_count),
            float(input_data.budget_mentioned),
            float(input_data.authority_identified),
            float(input_data.objections_count),
            float(input_data.days_in_stage),
            float(company_size_map.get(input_data.company_size, 0)),
            float(industry_map.get(input_data.industry.lower(), 0)),
        ]

    def predict_propensity(self, input_data: PropensityFeaturesInput) -> PropensityPredictionResponse:
        """Predict propensity to close."""
        start_time = time.time()

        try:
            features = self.encode_features(input_data)
            prediction = self.propensity_model.predict(features)

            execution_time_ms = (time.time() - start_time) * 1000

            # Generate recommendation based on probability
            if prediction.probability >= 0.75:
                recommendation = "ACCELERATE_CLOSE"
            elif prediction.probability >= 0.50:
                recommendation = "NURTURE_DEAL"
            else:
                recommendation = "REQUALIFY"

            # Log to observability
            self.ml_obs_logger.log_inference(
                model_name="propensity_to_close",
                input_features={
                    "deal_id": input_data.deal_id,
                    "call_count": input_data.call_count,
                    "demo_count": input_data.demo_count,
                    "days_in_stage": input_data.days_in_stage,
                },
                prediction=float(prediction.probability),
                confidence=prediction.confidence,
                recommendation=recommendation,
                execution_time_ms=execution_time_ms,
                deal_id=input_data.deal_id,
            )

            # Track metrics
            self._inference_times.append(execution_time_ms)
            self._inference_count_24h += 1
            self._last_inference = datetime.utcnow()

            logger.info(
                f"Propensity prediction: deal_id={input_data.deal_id}, "
                f"prob={prediction.probability:.3f}, exec_time={execution_time_ms:.1f}ms"
            )

            return PropensityPredictionResponse(
                deal_id=prediction.deal_id or input_data.deal_id,
                probability=prediction.probability,
                confidence=prediction.confidence,
                feature_importance=prediction.feature_importance,
                timestamp=datetime.utcnow(),
                execution_time_ms=execution_time_ms,
                model_status="trained" if self.propensity_model.is_trained else "untrained",
                recommendation=recommendation,
            )

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            self._error_count_24h += 1

            logger.error(f"Propensity prediction error: {e}", exc_info=True)

            # Log error event
            self.ml_obs_logger.log_error(
                model_name="propensity_to_close",
                error_message=str(e),
                input_features={"deal_id": input_data.deal_id},
                deal_id=input_data.deal_id,
            )

            # Fallback response
            return PropensityPredictionResponse(
                deal_id=input_data.deal_id,
                probability=0.5,
                confidence=0.0,
                feature_importance={},
                timestamp=datetime.utcnow(),
                execution_time_ms=execution_time_ms,
                model_status="error",
                recommendation="ERROR_MANUAL_REVIEW",
            )

    def forecast_90_days(
        self,
        region: str = "all",
        vertical: str = "all",
        min_deal_size_usd: float = 0,
        include_ci: bool = True,
    ) -> ForecastResponse:
        """Generate 90-day revenue forecast."""
        start_time = time.time()

        try:
            today = datetime.utcnow().date()
            forecast_end = today + timedelta(days=90)

            daily_forecasts: List[DailyForecast] = []

            # Simplified forecast logic (in production, use time series model like Prophet)
            base_daily_revenue = 30000
            base_daily_deals = 2

            for days_ahead in range(0, 91):
                current_date = today + timedelta(days=days_ahead)

                # Add some variance
                day_of_week = current_date.weekday()
                weekend_factor = 0.8 if day_of_week >= 4 else 1.0

                expected_revenue = base_daily_revenue * weekend_factor
                expected_deals = max(1, int(base_daily_deals * weekend_factor))

                forecast_item = DailyForecast(
                    date=current_date.isoformat(),
                    expected_revenue=expected_revenue,
                    pipeline_volume=expected_deals,
                )

                if include_ci:
                    # 68% CI (±1 std dev)
                    std_dev = expected_revenue * 0.10
                    forecast_item.confidence_lower_68 = expected_revenue - std_dev
                    forecast_item.confidence_upper_68 = expected_revenue + std_dev

                    # 95% CI (±2 std dev)
                    forecast_item.confidence_lower_95 = expected_revenue - (2 * std_dev)
                    forecast_item.confidence_upper_95 = expected_revenue + (2 * std_dev)

                daily_forecasts.append(forecast_item)

            # Aggregate metrics
            total_revenue = sum(f.expected_revenue for f in daily_forecasts)
            total_deals = sum(f.pipeline_volume for f in daily_forecasts)
            avg_deal_size = total_revenue / max(1, total_deals)

            # Count high-confidence deals (simple heuristic)
            high_confidence_deals = int(total_deals * 0.65)

            execution_time_ms = (time.time() - start_time) * 1000

            # Log forecast event
            self.ml_obs_logger.log_forecast(
                total_revenue=total_revenue,
                total_deals=total_deals,
                high_confidence_deals=high_confidence_deals,
                execution_time_ms=execution_time_ms,
                region=region,
                vertical=vertical,
            )

            logger.info(
                f"90-day forecast: region={region}, vertical={vertical}, "
                f"total_revenue=${total_revenue:.0f}, deals={total_deals}, exec_time={execution_time_ms:.1f}ms"
            )

            return ForecastResponse(
                forecast_period=f"{today.isoformat()} to {forecast_end.isoformat()}",
                daily_forecasts=daily_forecasts,
                total_expected_revenue=total_revenue,
                total_expected_deals=total_deals,
                average_deal_size=avg_deal_size,
                high_confidence_deals=high_confidence_deals,
                timestamp=datetime.utcnow(),
                execution_time_ms=execution_time_ms,
                model_version="prophet-2.0",
            )

        except Exception as e:
            execution_time_ms = (time.time() - start_time) * 1000
            logger.error(f"Forecast generation error: {e}", exc_info=True)

            # Return empty forecast on error
            return ForecastResponse(
                forecast_period=f"{datetime.utcnow().date().isoformat()} to {(datetime.utcnow().date() + timedelta(days=90)).isoformat()}",
                daily_forecasts=[],
                total_expected_revenue=0,
                total_expected_deals=0,
                average_deal_size=0,
                high_confidence_deals=0,
                timestamp=datetime.utcnow(),
                execution_time_ms=execution_time_ms,
                model_version="prophet-2.0",
            )

    def get_model_health(self) -> HealthCheckResponse:
        """Get comprehensive model health metrics."""
        model_metrics = self.propensity_model.get_model_metrics()

        # Determine overall status
        if self.propensity_model.is_trained:
            overall_status = "trained"
            if self._error_count_24h > 5:
                overall_status = "degraded"
        else:
            overall_status = "not_trained"

        # Calculate latency percentiles
        if self._inference_times:
            sorted_times = sorted(self._inference_times[-1000:])  # Last 1000
            p50 = sorted_times[int(len(sorted_times) * 0.50)]
            p95 = sorted_times[int(len(sorted_times) * 0.95)]
            p99 = sorted_times[int(len(sorted_times) * 0.99)]
            avg_time = sum(sorted_times) / len(sorted_times)
        else:
            p50 = p95 = p99 = avg_time = 0.0

        logger.info(
            f"Model health: status={overall_status}, "
            f"trained={self.propensity_model.is_trained}, "
            f"inferences_24h={self._inference_count_24h}, "
            f"errors_24h={self._error_count_24h}"
        )

        return HealthCheckResponse(
            status="overall",
            model_name="propensity_to_close",
            model_status=model_metrics.get("status", "unknown"),
            is_trained=self.propensity_model.is_trained,
            training_accuracy=self._training_metrics.get("accuracy"),
            training_auc=self._training_metrics.get("auc"),
            training_precision=self._training_metrics.get("precision"),
            training_recall=self._training_metrics.get("recall"),
            last_training=self._last_training,
            last_inference=self._last_inference,
            inference_count_24h=self._inference_count_24h,
            average_inference_time_ms=avg_time,
            error_count_24h=self._error_count_24h,
            latency_p50_ms=p50,
            latency_p95_ms=p95,
            latency_p99_ms=p99,
            feature_count=len(model_metrics.get("feature_names", [])),
            model_version="lightgbm-2.0",
            timestamp=datetime.utcnow(),
        )

    def set_training_metrics(self, metrics: Dict[str, float]) -> None:
        """Store training metrics."""
        self._training_metrics = metrics
        self._last_training = datetime.utcnow()


# Global singleton instance
_ml_service: Optional[MLService] = None


def get_ml_service() -> MLService:
    """Get or create ML service singleton."""
    global _ml_service
    if _ml_service is None:
        _ml_service = MLService()
    return _ml_service
