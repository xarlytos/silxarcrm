"""Example usage of ML endpoints — testing and integration examples."""
from __future__ import annotations

import asyncio
import json
from typing import Dict, Any

from app.ml.endpoints import (
    PropensityFeaturesInput,
    ForecastRequest,
    get_ml_service,
)


async def example_propensity_prediction() -> Dict[str, Any]:
    """
    Example: Predict propensity to close for a deal.

    Real-world scenario: Sales team wants to know which deals to prioritize.
    """
    print("\n" + "="*60)
    print("EXAMPLE 1: Propensity to Close Prediction")
    print("="*60)

    ml_service = get_ml_service()

    # Input: deal with good engagement signals
    features = PropensityFeaturesInput(
        deal_id="DEAL-12345",
        call_count=5,  # 5 calls over past week
        avg_call_duration=1800.0,  # 30 minutes per call
        email_count=8,  # Follow-up emails
        demo_count=2,  # Product demos given
        budget_mentioned=True,  # Budget discussed
        authority_identified=True,  # CFO engaged
        objections_count=1,  # Minimal objections
        days_in_stage=10,  # 10 days in negotiation
        company_size="large",
        industry="technology",
    )

    print(f"\nInput Features:")
    print(f"  Deal ID: {features.deal_id}")
    print(f"  Calls: {features.call_count} (avg {features.avg_call_duration/60:.0f} min)")
    print(f"  Emails: {features.email_count}")
    print(f"  Demos: {features.demo_count}")
    print(f"  Budget Mentioned: {features.budget_mentioned}")
    print(f"  Authority: {features.authority_identified}")
    print(f"  Days in Stage: {features.days_in_stage}")

    # Predict
    prediction = ml_service.predict_propensity(features)

    print(f"\nPrediction Results:")
    print(f"  Probability: {prediction.probability:.1%}")
    print(f"  Confidence: {prediction.confidence:.1%}")
    print(f"  Recommendation: {prediction.recommendation}")
    print(f"  Execution Time: {prediction.execution_time_ms:.1f}ms")

    if prediction.feature_importance:
        print(f"\nFeature Importance (Top 5):")
        top_features = sorted(
            prediction.feature_importance.items(),
            key=lambda x: x[1],
            reverse=True,
        )[:5]
        for feature, importance in top_features:
            print(f"  {feature}: {importance:.3f}")

    return {
        "probability": prediction.probability,
        "recommendation": prediction.recommendation,
        "execution_time_ms": prediction.execution_time_ms,
    }


async def example_forecast() -> Dict[str, Any]:
    """
    Example: Generate 90-day revenue forecast.

    Real-world scenario: Finance wants Q3 revenue projection for budget planning.
    """
    print("\n" + "="*60)
    print("EXAMPLE 2: 90-Day Revenue Forecast")
    print("="*60)

    ml_service = get_ml_service()

    # Input: forecast for LATAM technology segment
    request = ForecastRequest(
        region="LATAM",
        vertical="technology",
        min_deal_size_usd=25000,
        include_confidence_intervals=True,
    )

    print(f"\nForecast Parameters:")
    print(f"  Region: {request.region}")
    print(f"  Vertical: {request.vertical}")
    print(f"  Min Deal Size: ${request.min_deal_size_usd:,}")
    print(f"  Confidence Intervals: {request.include_confidence_intervals}")

    # Generate forecast
    forecast = ml_service.forecast_90_days(
        region=request.region,
        vertical=request.vertical,
        min_deal_size_usd=request.min_deal_size_usd,
        include_ci=request.include_confidence_intervals,
    )

    print(f"\nForecast Summary:")
    print(f"  Period: {forecast.forecast_period}")
    print(f"  Total Expected Revenue: ${forecast.total_expected_revenue:,.0f}")
    print(f"  Total Expected Deals: {forecast.total_expected_deals}")
    print(f"  Average Deal Size: ${forecast.average_deal_size:,.0f}")
    print(f"  High-Confidence Deals: {forecast.high_confidence_deals}")
    print(f"  Model Version: {forecast.model_version}")
    print(f"  Execution Time: {forecast.execution_time_ms:.1f}ms")

    # Show first week of daily forecasts
    if forecast.daily_forecasts:
        print(f"\nFirst Week Daily Forecast:")
        for i, daily in enumerate(forecast.daily_forecasts[:7]):
            print(f"  {daily.date}: ${daily.expected_revenue:>8,.0f} ({daily.pipeline_volume} deals)")
            if daily.confidence_lower_68 and daily.confidence_upper_68:
                print(
                    f"             68% CI: ${daily.confidence_lower_68:,.0f} - ${daily.confidence_upper_68:,.0f}"
                )

    return {
        "total_revenue": forecast.total_expected_revenue,
        "total_deals": forecast.total_expected_deals,
        "avg_deal_size": forecast.average_deal_size,
        "execution_time_ms": forecast.execution_time_ms,
    }


async def example_health_check() -> Dict[str, Any]:
    """
    Example: Check model health for monitoring.

    Real-world scenario: Operations team checking service health dashboard.
    """
    print("\n" + "="*60)
    print("EXAMPLE 3: Model Health Check")
    print("="*60)

    ml_service = get_ml_service()

    # Get health metrics
    health = ml_service.get_model_health()

    print(f"\nModel Health Status:")
    print(f"  Overall Status: {health.status}")
    print(f"  Model Status: {health.model_status}")
    print(f"  Is Trained: {health.is_trained}")

    if health.is_trained:
        print(f"\nTraining Metrics:")
        print(f"  Accuracy: {health.training_accuracy:.1%}")
        print(f"  AUC-ROC: {health.training_auc:.1%}")
        print(f"  Precision: {health.training_precision:.1%}")
        print(f"  Recall: {health.training_recall:.1%}")
        if health.last_training:
            print(f"  Last Training: {health.last_training.isoformat()}")

    print(f"\nInference Performance (24h):")
    print(f"  Inference Count: {health.inference_count_24h}")
    print(f"  Average Latency: {health.average_inference_time_ms:.1f}ms")
    print(f"  P50 Latency: {health.latency_p50_ms:.1f}ms (median)")
    print(f"  P95 Latency: {health.latency_p95_ms:.1f}ms (95th percentile)")
    print(f"  P99 Latency: {health.latency_p99_ms:.1f}ms (99th percentile)")
    print(f"  Error Count: {health.error_count_24h}")

    print(f"\nModel Configuration:")
    print(f"  Feature Count: {health.feature_count}")
    print(f"  Model Version: {health.model_version}")
    if health.last_inference:
        print(f"  Last Inference: {health.last_inference.isoformat()}")

    return {
        "status": health.status,
        "is_trained": health.is_trained,
        "inference_count_24h": health.inference_count_24h,
        "average_latency_ms": health.average_inference_time_ms,
        "error_count_24h": health.error_count_24h,
    }


async def example_batch_predictions() -> Dict[str, Any]:
    """
    Example: Batch predict propensity for multiple deals.

    Real-world scenario: Weekly pipeline review — scoring all open deals.
    """
    print("\n" + "="*60)
    print("EXAMPLE 4: Batch Propensity Scoring")
    print("="*60)

    ml_service = get_ml_service()

    # Sample deals to score
    deals = [
        {
            "deal_id": "DEAL-001",
            "call_count": 5,
            "avg_call_duration": 1800.0,
            "email_count": 8,
            "demo_count": 2,
            "budget_mentioned": True,
            "authority_identified": True,
            "objections_count": 1,
            "days_in_stage": 10,
            "company_size": "large",
            "industry": "technology",
        },
        {
            "deal_id": "DEAL-002",
            "call_count": 2,
            "avg_call_duration": 900.0,
            "email_count": 3,
            "demo_count": 0,
            "budget_mentioned": False,
            "authority_identified": False,
            "objections_count": 3,
            "days_in_stage": 5,
            "company_size": "small",
            "industry": "retail",
        },
        {
            "deal_id": "DEAL-003",
            "call_count": 4,
            "avg_call_duration": 1500.0,
            "email_count": 6,
            "demo_count": 1,
            "budget_mentioned": True,
            "authority_identified": False,
            "objections_count": 0,
            "days_in_stage": 8,
            "company_size": "medium",
            "industry": "finance",
        },
    ]

    print(f"\nScoring {len(deals)} deals...")

    results = []
    for deal_data in deals:
        features = PropensityFeaturesInput(**deal_data)
        prediction = ml_service.predict_propensity(features)
        results.append({
            "deal_id": prediction.deal_id,
            "probability": prediction.probability,
            "recommendation": prediction.recommendation,
        })

    # Sort by probability (highest first)
    results.sort(key=lambda x: x["probability"], reverse=True)

    print(f"\nBatch Scoring Results (sorted by probability):")
    print(f"{'Deal ID':<12} {'Probability':<12} {'Recommendation':<20}")
    print("-" * 44)
    for result in results:
        print(
            f"{result['deal_id']:<12} "
            f"{result['probability']:>10.1%}  "
            f"{result['recommendation']:<20}"
        )

    # Summary
    avg_prob = sum(r["probability"] for r in results) / len(results)
    high_priority = len([r for r in results if r["recommendation"] == "ACCELERATE_CLOSE"])

    print(f"\nBatch Summary:")
    print(f"  Average Propensity: {avg_prob:.1%}")
    print(f"  High-Priority Deals: {high_priority}/{len(results)}")

    return {
        "deals_scored": len(results),
        "average_probability": avg_prob,
        "high_priority_count": high_priority,
    }


async def main():
    """Run all examples."""
    print("\n" + "="*60)
    print("ML ENDPOINTS USAGE EXAMPLES")
    print("="*60)

    try:
        # Run examples
        results = {}
        results["propensity"] = await example_propensity_prediction()
        results["forecast"] = await example_forecast()
        results["health"] = await example_health_check()
        results["batch"] = await example_batch_predictions()

        # Summary
        print("\n" + "="*60)
        print("SUMMARY OF RESULTS")
        print("="*60)
        print(json.dumps(results, indent=2, default=str))

    except Exception as e:
        print(f"\nError running examples: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(main())
