import {
  dbConnectionsGauge,
  cacheHitRateGauge,
} from './metrics';

export interface DatabaseConnectionMetrics {
  connectionPool: string;
  databaseName: string;
  activeConnections: number;
}

export interface CacheHealthMetrics {
  cacheType: 'redis' | 'in_memory';
  hitRatePercent: number;
}

/**
 * Update database connection pool metrics
 */
export function updateDbConnections(metrics: DatabaseConnectionMetrics) {
  dbConnectionsGauge
    .labels(metrics.connectionPool, metrics.databaseName)
    .set(metrics.activeConnections);
}

/**
 * Update cache hit rate metrics
 */
export function updateCacheHitRate(metrics: CacheHealthMetrics) {
  cacheHitRateGauge
    .labels(metrics.cacheType)
    .set(metrics.hitRatePercent);
}

/**
 * Batch update system health metrics
 */
export function updateBatchSystemHealth(
  dbMetrics: DatabaseConnectionMetrics[],
  cacheMetrics: CacheHealthMetrics[]
) {
  dbMetrics.forEach(updateDbConnections);
  cacheMetrics.forEach(updateCacheHitRate);
}
