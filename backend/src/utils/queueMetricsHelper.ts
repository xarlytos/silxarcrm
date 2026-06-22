import {
  kafkaConsumerLagGauge,
  processingQueueDepthGauge,
  messageProcessingDurationHistogram,
} from './metrics';

export interface KafkaConsumerLag {
  topic: string;
  consumerGroup: string;
  partition: number;
  lagRecords: number;
}

export interface QueueDepthMetrics {
  queueName: string;
  priorityLevel: string;
  jobCount: number;
}

export interface MessageProcessingMetrics {
  queueName: string;
  jobType: string;
  status: 'success' | 'failed' | 'pending';
  durationMs: number;
}

/**
 * Update Kafka consumer lag metrics
 */
export function updateKafkaConsumerLag(lag: KafkaConsumerLag) {
  kafkaConsumerLagGauge
    .labels(lag.topic, lag.consumerGroup, String(lag.partition))
    .set(lag.lagRecords);
}

/**
 * Update processing queue depth (Bull queue)
 */
export function updateQueueDepth(metrics: QueueDepthMetrics) {
  processingQueueDepthGauge
    .labels(metrics.queueName, metrics.priorityLevel)
    .set(metrics.jobCount);
}

/**
 * Record message processing duration
 */
export function recordMessageProcessingDuration(metrics: MessageProcessingMetrics) {
  messageProcessingDurationHistogram
    .labels(metrics.queueName, metrics.jobType, metrics.status)
    .observe(metrics.durationMs);
}

/**
 * Batch update Kafka consumer lag for multiple topics
 */
export function updateBatchKafkaLag(lags: KafkaConsumerLag[]) {
  lags.forEach(updateKafkaConsumerLag);
}

/**
 * Batch update queue depths
 */
export function updateBatchQueueDepths(metrics: QueueDepthMetrics[]) {
  metrics.forEach(updateQueueDepth);
}
