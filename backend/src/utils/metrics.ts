import promClient from 'prom-client';

// Initialize default metrics
promClient.collectDefaultMetrics();

// ==================== API METRICS ====================
export const apiLatencyHistogram = new promClient.Histogram({
  name: 'api_latency_milliseconds',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['endpoint', 'method', 'status_code'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500],
});

export const apiErrorsCounter = new promClient.Counter({
  name: 'api_errors_total',
  help: 'Total number of API errors',
  labelNames: ['endpoint', 'error_type', 'status_code'],
});

export const apiRequestsCounter = new promClient.Counter({
  name: 'api_requests_total',
  help: 'Total number of API requests',
  labelNames: ['endpoint', 'method', 'status_code'],
});

// ==================== ML METRICS ====================
export const dealAccuracyGauge = new promClient.Gauge({
  name: 'deal_probability_accuracy',
  help: 'Accuracy of deal probability predictions',
  labelNames: ['model_version', 'segment', 'prediction_window'],
});

export const inferenceLatencyHistogram = new promClient.Histogram({
  name: 'model_inference_latency_milliseconds',
  help: 'Model inference latency',
  labelNames: ['model_name', 'model_version', 'endpoint'],
  buckets: [10, 25, 50, 100, 250, 500, 1000],
});

export const forecastRmseGauge = new promClient.Gauge({
  name: 'forecast_rmse',
  help: 'RMSE for revenue forecasts',
  labelNames: ['forecast_type', 'horizon_days', 'model_version'],
});

// ==================== KAFKA METRICS ====================
export const kafkaConsumerLagGauge = new promClient.Gauge({
  name: 'kafka_consumer_lag_records',
  help: 'Number of messages behind in Kafka consumer',
  labelNames: ['topic', 'consumer_group', 'partition'],
});

export const processingQueueDepthGauge = new promClient.Gauge({
  name: 'processing_queue_depth',
  help: 'Bull queue job count',
  labelNames: ['queue_name', 'priority_level'],
});

export const messageProcessingDurationHistogram = new promClient.Histogram({
  name: 'message_processing_duration_milliseconds',
  help: 'Message processing duration',
  labelNames: ['queue_name', 'job_type', 'status'],
  buckets: [100, 500, 1000, 5000, 10000, 30000],
});

// ==================== DEAL PIPELINE METRICS ====================
export const activeDealsGauge = new promClient.Gauge({
  name: 'active_deals_total',
  help: 'Number of active deals in each pipeline stage',
  labelNames: ['stage', 'segment', 'owner_region'],
});

export const dealWinRateGauge = new promClient.Gauge({
  name: 'deal_win_rate',
  help: 'Percentage of deals won',
  labelNames: ['segment', 'sales_region', 'time_period'],
});

export const dealCycleTimeHistogram = new promClient.Histogram({
  name: 'deal_cycle_time_days',
  help: 'Deal cycle time in days',
  labelNames: ['segment', 'deal_size_category'],
  buckets: [1, 5, 10, 20, 30, 60, 90],
});

// ==================== REVENUE METRICS ====================
export const mrrGauge = new promClient.Gauge({
  name: 'mrr_usd',
  help: 'Monthly Recurring Revenue',
  labelNames: ['subscription_tier', 'region'],
});

export const forecastVarianceGauge = new promClient.Gauge({
  name: 'revenue_forecast_variance_percent',
  help: 'Forecast vs Actual Revenue Variance',
  labelNames: ['forecast_horizon', 'actual_period'],
});

export const clvGauge = new promClient.Gauge({
  name: 'customer_lifetime_value_usd',
  help: 'Customer Lifetime Value',
  labelNames: ['cohort_month', 'segment'],
});

// ==================== SYSTEM HEALTH METRICS ====================
export const dbConnectionsGauge = new promClient.Gauge({
  name: 'database_connections_active',
  help: 'Active database connections',
  labelNames: ['connection_pool', 'database_name'],
});

export const cacheHitRateGauge = new promClient.Gauge({
  name: 'cache_hit_rate_percent',
  help: 'Cache hit rate percentage',
  labelNames: ['cache_type'],
});

// Expose metrics endpoint
export function getMetrics() {
  return promClient.register.metrics();
}
