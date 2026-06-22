import {
  mrrGauge,
  forecastVarianceGauge,
  clvGauge,
  activeDealsGauge,
  dealWinRateGauge,
  dealCycleTimeHistogram,
} from './metrics';

export interface RevenueMetrics {
  mrrUsd: number;
  subscriptionTier: string;
  region: string;
}

export interface ForecastVariance {
  variancePercent: number;
  forecastHorizon: string;
  actualPeriod: string;
}

export interface CustomerLifetimeValue {
  clvUsd: number;
  cohortMonth: string;
  segment: string;
}

export interface DealMetrics {
  activeDealsCount: number;
  stage: string;
  segment: string;
  ownerRegion: string;
}

export interface DealPerformance {
  winRate: number;
  segment: string;
  salesRegion: string;
  timePeriod: string;
}

export interface DealCycleTime {
  cycleTimeDays: number;
  segment: string;
  dealSizeCategory: string;
}

/**
 * Update Monthly Recurring Revenue (MRR) metrics
 */
export function updateMrrMetrics(metrics: RevenueMetrics) {
  mrrGauge
    .labels(metrics.subscriptionTier, metrics.region)
    .set(metrics.mrrUsd);
}

/**
 * Update forecast variance metrics
 */
export function updateForecastVariance(variance: ForecastVariance) {
  forecastVarianceGauge
    .labels(variance.forecastHorizon, variance.actualPeriod)
    .set(variance.variancePercent);
}

/**
 * Update Customer Lifetime Value metrics
 */
export function updateClvMetrics(clv: CustomerLifetimeValue) {
  clvGauge
    .labels(clv.cohortMonth, clv.segment)
    .set(clv.clvUsd);
}

/**
 * Update active deals count by stage
 */
export function updateActiveDealsByStage(metrics: DealMetrics) {
  activeDealsGauge
    .labels(metrics.stage, metrics.segment, metrics.ownerRegion)
    .set(metrics.activeDealsCount);
}

/**
 * Update deal win rate metrics
 */
export function updateDealWinRate(performance: DealPerformance) {
  dealWinRateGauge
    .labels(performance.segment, performance.salesRegion, performance.timePeriod)
    .set(performance.winRate);
}

/**
 * Record deal cycle time
 */
export function recordDealCycleTime(cycleTime: DealCycleTime) {
  dealCycleTimeHistogram
    .labels(cycleTime.segment, cycleTime.dealSizeCategory)
    .observe(cycleTime.cycleTimeDays);
}

/**
 * Batch update all revenue and deal metrics
 */
export function updateBatchRevenueMetrics(
  mrrData: RevenueMetrics[],
  dealData: DealMetrics[],
  performanceData: DealPerformance[]
) {
  mrrData.forEach(updateMrrMetrics);
  dealData.forEach(updateActiveDealsByStage);
  performanceData.forEach(updateDealWinRate);
}
