"""ML-specific observability utilities — logging inferences and errors."""
from __future__ import annotations

import logging
from datetime import datetime
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)


class MLObservabilityLogger:
    """Logs ML model inferences, errors, and performance metrics."""

    def __init__(self):
        """Initialize ML observability logger."""
        self.inference_log: list[Dict[str, Any]] = []
        self.error_log: list[Dict[str, Any]] = []

    def log_inference(
        self,
        model_name: str,
        input_features: Dict[str, Any],
        prediction: float,
        confidence: float,
        recommendation: str,
        execution_time_ms: float,
        call_id: str = "",
        deal_id: str = "",
    ) -> None:
        """
        Log a model inference.

        Args:
            model_name: Name of the model (e.g., 'propensity_to_close')
            input_features: Input feature dict
            prediction: Predicted value
            confidence: Confidence score (0-1)
            recommendation: Action recommendation
            execution_time_ms: Inference latency
            call_id: Optional call identifier
            deal_id: Optional deal identifier
        """
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "ml_inference",
            "model_name": model_name,
            "input_features": input_features,
            "prediction": prediction,
            "confidence": confidence,
            "recommendation": recommendation,
            "execution_time_ms": execution_time_ms,
            "call_id": call_id,
            "deal_id": deal_id,
        }

        self.inference_log.append(event)

        logger.info(
            f"ML Inference logged: model={model_name}, "
            f"pred={prediction:.3f}, conf={confidence:.2f}, "
            f"exec_time={execution_time_ms:.1f}ms"
        )

    def log_error(
        self,
        model_name: str,
        error_message: str,
        input_features: Optional[Dict[str, Any]] = None,
        call_id: str = "",
        deal_id: str = "",
    ) -> None:
        """
        Log an ML error.

        Args:
            model_name: Name of the model
            error_message: Error description
            input_features: Input that caused the error
            call_id: Optional call identifier
            deal_id: Optional deal identifier
        """
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "ml_error",
            "model_name": model_name,
            "error_message": error_message,
            "input_features": input_features or {},
            "call_id": call_id,
            "deal_id": deal_id,
        }

        self.error_log.append(event)

        logger.error(
            f"ML Error logged: model={model_name}, "
            f"error={error_message}, deal_id={deal_id}"
        )

    def log_forecast(
        self,
        total_revenue: float,
        total_deals: int,
        high_confidence_deals: int,
        execution_time_ms: float,
        region: str = "all",
        vertical: str = "all",
    ) -> None:
        """
        Log a forecast generation.

        Args:
            total_revenue: Total forecasted revenue
            total_deals: Total forecasted deals
            high_confidence_deals: Deals with high propensity
            execution_time_ms: Forecast generation time
            region: Region filter
            vertical: Vertical filter
        """
        event = {
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "event_type": "ml_forecast",
            "model_name": "90_day_forecast",
            "total_revenue": total_revenue,
            "total_deals": total_deals,
            "high_confidence_deals": high_confidence_deals,
            "execution_time_ms": execution_time_ms,
            "region": region,
            "vertical": vertical,
        }

        logger.info(
            f"Forecast logged: revenue=${total_revenue:.0f}, "
            f"deals={total_deals}, high_conf={high_confidence_deals}, "
            f"exec_time={execution_time_ms:.1f}ms"
        )

    def get_recent_inferences(self, limit: int = 100) -> list[Dict[str, Any]]:
        """Get recent inference logs."""
        return self.inference_log[-limit:]

    def get_recent_errors(self, limit: int = 100) -> list[Dict[str, Any]]:
        """Get recent error logs."""
        return self.error_log[-limit:]

    def clear_logs(self) -> None:
        """Clear in-memory logs (for testing)."""
        self.inference_log.clear()
        self.error_log.clear()


# Global instance
_ml_obs_logger: Optional[MLObservabilityLogger] = None


def get_ml_observability_logger() -> MLObservabilityLogger:
    """Get or create ML observability logger singleton."""
    global _ml_obs_logger
    if _ml_obs_logger is None:
        _ml_obs_logger = MLObservabilityLogger()
    return _ml_obs_logger
