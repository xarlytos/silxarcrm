import {
  dealAccuracyGauge,
  inferenceLatencyHistogram,
  forecastRmseGauge,
} from './metrics';

export interface ModelEvaluation {
  modelVersion: string;
  segment: string;
  predictionWindow: string;
  accuracy: number;
  forecastType: string;
  horizonDays: number;
  rmse: number;
}

export interface InferenceMetrics {
  modelName: string;
  modelVersion: string;
  endpoint: string;
  latencyMs: number;
}

/**
 * Update deal probability model accuracy metrics
 */
export function updateDealAccuracyMetrics(evaluation: ModelEvaluation) {
  dealAccuracyGauge
    .labels(
      evaluation.modelVersion,
      evaluation.segment,
      evaluation.predictionWindow
    )
    .set(evaluation.accuracy);
}

/**
 * Record model inference latency
 */
export function recordInferenceLatency(metrics: InferenceMetrics) {
  inferenceLatencyHistogram
    .labels(metrics.modelName, metrics.modelVersion, metrics.endpoint)
    .observe(metrics.latencyMs);
}

/**
 * Update forecast RMSE metrics
 */
export function updateForecastRmse(
  forecastType: string,
  horizonDays: number,
  modelVersion: string,
  rmseValue: number
) {
  forecastRmseGauge
    .labels(forecastType, String(horizonDays), modelVersion)
    .set(rmseValue);
}

/**
 * Batch update multiple model metrics
 */
export function updateBatchModelMetrics(
  evaluations: ModelEvaluation[]
) {
  evaluations.forEach(evaluation => {
    updateDealAccuracyMetrics(evaluation);
    updateForecastRmse(
      evaluation.forecastType,
      evaluation.horizonDays,
      evaluation.modelVersion,
      evaluation.rmse
    );
  });
}
