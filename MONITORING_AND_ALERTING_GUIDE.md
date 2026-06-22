# Monitoring and Alerting Guide - SilxaCRM Platform

## Executive Summary

This guide establishes a comprehensive monitoring and alerting infrastructure for the SilxaCRM platform, enabling proactive incident detection and performance optimization. The system tracks API health, ML model performance, deal pipeline metrics, and revenue forecasting accuracy.

**Key Components:**
- Prometheus: Time-series metrics collection (23 total metrics)
- Grafana: Visualization and dashboards (4 main panels)
- Alert Rules: 12 critical alert conditions
- Slack Integration: Real-time incident notifications
- Kafka: Queue monitoring and lag tracking

---

## 1. Prometheus Scrape Configuration

### 1.1 Prometheus Setup

Create `/monitoring/prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s
  external_labels:
    cluster: 'silxacrm-prod'
    environment: 'production'

# Alertmanager configuration
alerting:
  alertmanagers:
    - static_configs:
        - targets: ['localhost:9093']

# Load alert rules
rule_files:
  - '/monitoring/alert_rules.yml'

scrape_configs:
  # Backend API Service
  - job_name: 'api-service'
    scrape_interval: 15s
    scrape_timeout: 10s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
    relabel_configs:
      - source_labels: [__address__]
        target_label: instance
      - source_labels: [__scheme__]
        target_label: scheme

  # Lead Scoring Service
  - job_name: 'lead-scoring-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'

  # Revenue Intelligence Service
  - job_name: 'revenue-intelligence-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3002']
    metrics_path: '/metrics'

  # Deal Pipeline Service
  - job_name: 'deal-pipeline-service'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3003']
    metrics_path: '/metrics'

  # Kafka Metrics (via Burrow/JMX Exporter)
  - job_name: 'kafka-broker'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:9092']

  # Kafka Consumer Lag
  - job_name: 'kafka-consumer-lag'
    scrape_interval: 30s
    static_configs:
      - targets: ['localhost:8080']
    metrics_path: '/kafka_consumer_lag'

  # Database (PostgreSQL Exporter)
  - job_name: 'postgres'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9187']

  # Redis
  - job_name: 'redis'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:6379']

  # Node Exporter (Host Metrics)
  - job_name: 'node'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:9100']
```

### 1.2 Docker Compose for Monitoring Stack

Create `docker-compose.monitoring.yml`:

```yaml
version: '3.8'

services:
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    ports:
      - '9090:9090'
    volumes:
      - ./monitoring/prometheus.yml:/etc/prometheus/prometheus.yml
      - ./monitoring/alert_rules.yml:/etc/prometheus/alert_rules.yml
      - prometheus_data:/prometheus
    command:
      - '--config.file=/etc/prometheus/prometheus.yml'
      - '--storage.tsdb.path=/prometheus'
      - '--storage.tsdb.retention.time=30d'
    networks:
      - monitoring

  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    ports:
      - '3100:3000'
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_USERS_ALLOW_SIGN_UP: 'false'
    volumes:
      - grafana_data:/var/lib/grafana
      - ./monitoring/grafana/dashboards:/etc/grafana/provisioning/dashboards
      - ./monitoring/grafana/datasources:/etc/grafana/provisioning/datasources
    depends_on:
      - prometheus
    networks:
      - monitoring

  alertmanager:
    image: prom/alertmanager:latest
    container_name: alertmanager
    ports:
      - '9093:9093'
    volumes:
      - ./monitoring/alertmanager.yml:/etc/alertmanager/alertmanager.yml
      - alertmanager_data:/alertmanager
    command:
      - '--config.file=/etc/alertmanager/alertmanager.yml'
      - '--storage.path=/alertmanager'
    networks:
      - monitoring

  postgres-exporter:
    image: prometheuscommunity/postgres-exporter:latest
    container_name: postgres-exporter
    ports:
      - '9187:9187'
    environment:
      DATA_SOURCE_NAME: 'postgresql://user:password@postgres:5432/silxacrm?sslmode=disable'
    depends_on:
      - postgres
    networks:
      - monitoring

  redis-exporter:
    image: oliver006/redis_exporter:latest
    container_name: redis-exporter
    ports:
      - '6379:6379'
    environment:
      REDIS_ADDR: 'redis:6379'
    depends_on:
      - redis
    networks:
      - monitoring

  node-exporter:
    image: prom/node-exporter:latest
    container_name: node-exporter
    ports:
      - '9100:9100'
    volumes:
      - /proc:/host/proc:ro
      - /sys:/host/sys:ro
      - /:/rootfs:ro
    command:
      - '--path.procfs=/host/proc'
      - '--path.sysfs=/host/sys'
      - '--collector.filesystem.mount-points-exclude=^/(sys|proc|dev|host|etc)($$|/)'
    networks:
      - monitoring

volumes:
  prometheus_data:
  grafana_data:
  alertmanager_data:

networks:
  monitoring:
    driver: bridge
```

---

## 2. Key Metrics Specification

### 2.1 API Latency Metrics

**Metric Name:** `api_latency_milliseconds`
- Type: Histogram with buckets [10, 50, 100, 250, 500, 1000, 2500]
- Labels: endpoint, method, status_code
- Description: HTTP request latency in milliseconds
- Alert Threshold: p99 > 500ms sustained for 5 minutes

**Implementation in Express:**

```typescript
import promClient from 'prom-client';

const apiLatencyHistogram = new promClient.Histogram({
  name: 'api_latency_milliseconds',
  help: 'HTTP request latency in milliseconds',
  labelNames: ['endpoint', 'method', 'status_code'],
  buckets: [10, 50, 100, 250, 500, 1000, 2500],
});

// Middleware to track latency
export function latencyMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    const endpoint = req.route?.path || req.path;
    apiLatencyHistogram
      .labels(endpoint, req.method, String(res.statusCode))
      .observe(duration);
  });

  next();
}
```

### 2.2 ML Model Metrics

**Deal Probability Accuracy**
- Metric Name: `deal_probability_accuracy`
- Type: Gauge
- Labels: model_version, segment, prediction_window
- Description: Accuracy of deal probability predictions against actual outcomes
- Alert Threshold: < 0.80 for 15 minutes

**Model Inference Latency**
- Metric Name: `model_inference_latency_milliseconds`
- Type: Histogram
- Labels: model_name, model_version, endpoint
- Description: Time to execute model inference
- Buckets: [10, 25, 50, 100, 250, 500, 1000]
- Alert Threshold: p95 > 500ms

**Forecast RMSE**
- Metric Name: `forecast_rmse`
- Type: Gauge
- Labels: forecast_type, horizon_days, model_version
- Description: Root Mean Squared Error for revenue forecasts
- Alert Threshold: > 15% of mean revenue

**Implementation:**

```typescript
const dealAccuracyGauge = new promClient.Gauge({
  name: 'deal_probability_accuracy',
  help: 'Accuracy of deal probability predictions',
  labelNames: ['model_version', 'segment', 'prediction_window'],
});

const inferenceLatency = new promClient.Histogram({
  name: 'model_inference_latency_milliseconds',
  help: 'Model inference latency',
  labelNames: ['model_name', 'model_version', 'endpoint'],
  buckets: [10, 25, 50, 100, 250, 500, 1000],
});

const forecastRmse = new promClient.Gauge({
  name: 'forecast_rmse',
  help: 'RMSE for revenue forecasts',
  labelNames: ['forecast_type', 'horizon_days', 'model_version'],
});

// Update metrics after model evaluation
export async function updateModelMetrics(
  evaluation: ModelEvaluation
) {
  dealAccuracyGauge
    .labels(
      evaluation.modelVersion,
      evaluation.segment,
      evaluation.predictionWindow
    )
    .set(evaluation.accuracy);

  forecastRmse
    .labels(
      evaluation.forecastType,
      String(evaluation.horizonDays),
      evaluation.modelVersion
    )
    .set(evaluation.rmse);
}
```

### 2.3 Queue and Stream Metrics

**Kafka Consumer Lag**
- Metric Name: `kafka_consumer_lag_records`
- Type: Gauge
- Labels: topic, consumer_group, partition
- Description: Number of messages behind in Kafka consumer
- Alert Threshold: > 10,000 messages

**Processing Queue Depth**
- Metric Name: `processing_queue_depth`
- Type: Gauge
- Labels: queue_name, priority_level
- Description: Bull queue job count
- Alert Threshold: > 5,000 jobs in queue

**Message Processing Duration**
- Metric Name: `message_processing_duration_milliseconds`
- Type: Histogram
- Labels: queue_name, job_type, status
- Buckets: [100, 500, 1000, 5000, 10000, 30000]

### 2.4 Deal Pipeline Metrics

**Active Deals Count**
- Metric Name: `active_deals_total`
- Type: Gauge
- Labels: stage, segment, owner_region
- Description: Number of active deals in each pipeline stage

**Deal Win Rate**
- Metric Name: `deal_win_rate`
- Type: Gauge
- Labels: segment, sales_region, time_period
- Description: Percentage of deals won in time period

**Deal Cycle Time**
- Metric Name: `deal_cycle_time_days`
- Type: Histogram
- Labels: segment, deal_size_category
- Buckets: [1, 5, 10, 20, 30, 60, 90]

### 2.5 Revenue Metrics

**Monthly Recurring Revenue (MRR)**
- Metric Name: `mrr_usd`
- Type: Gauge
- Labels: subscription_tier, region

**Forecast vs Actual Revenue**
- Metric Name: `revenue_forecast_variance_percent`
- Type: Gauge
- Labels: forecast_horizon, actual_period

**Customer Lifetime Value (CLV)**
- Metric Name: `customer_lifetime_value_usd`
- Type: Gauge
- Labels: cohort_month, segment

### 2.6 System Health Metrics

**Database Connection Pool**
- Metric Name: `database_connections_active`
- Type: Gauge
- Labels: connection_pool, database_name

**Cache Hit Rate**
- Metric Name: `cache_hit_rate_percent`
- Type: Gauge
- Labels: cache_type (redis, in_memory)

**Error Rate**
- Metric Name: `api_errors_total`
- Type: Counter
- Labels: endpoint, error_type, status_code

**Request Rate**
- Metric Name: `api_requests_total`
- Type: Counter
- Labels: endpoint, method, status_code

---

## 3. Alert Rules Configuration

Create `/monitoring/alert_rules.yml`:

```yaml
groups:
  - name: silxacrm_alerts
    interval: 15s
    rules:
      # ==================== API HEALTH ALERTS ====================
      - alert: HighAPILatency
        expr: histogram_quantile(0.99, rate(api_latency_milliseconds_bucket[5m])) > 500
        for: 5m
        labels:
          severity: warning
          service: api
        annotations:
          summary: "High API latency detected (p99 > 500ms)"
          description: "{{ $labels.endpoint }} is experiencing high latency: {{ $value | humanizeDuration }}"
          runbook_url: "https://wiki.internal/runbooks/high-latency"

      - alert: APIErrorRateHigh
        expr: (rate(api_errors_total[5m]) / rate(api_requests_total[5m])) > 0.05
        for: 5m
        labels:
          severity: critical
          service: api
        annotations:
          summary: "High API error rate"
          description: "Error rate for {{ $labels.endpoint }}: {{ $value | humanizePercentage }}"

      - alert: APIServiceDown
        expr: up{job="api-service"} == 0
        for: 1m
        labels:
          severity: critical
          service: api
        annotations:
          summary: "API service is down"
          description: "API service at {{ $labels.instance }} is not responding"

      # ==================== ML MODEL ALERTS ====================
      - alert: LowDealProbabilityAccuracy
        expr: deal_probability_accuracy < 0.80
        for: 15m
        labels:
          severity: warning
          service: ml_models
        annotations:
          summary: "Deal probability model accuracy below threshold"
          description: "Model {{ $labels.model_version }} accuracy: {{ $value | humanizePercentage }}"
          runbook_url: "https://wiki.internal/runbooks/low-model-accuracy"

      - alert: HighModelInferenceLatency
        expr: histogram_quantile(0.95, rate(model_inference_latency_milliseconds_bucket[5m])) > 500
        for: 5m
        labels:
          severity: warning
          service: ml_models
        annotations:
          summary: "Model inference latency exceeds threshold"
          description: "{{ $labels.model_name }} p95 latency: {{ $value | humanizeDuration }}"

      - alert: HighForecastError
        expr: forecast_rmse > 0.15 * on() vector(1)
        for: 10m
        labels:
          severity: warning
          service: revenue_forecast
        annotations:
          summary: "Forecast RMSE exceeds acceptable range"
          description: "{{ $labels.forecast_type }} RMSE: {{ $value }}"

      # ==================== KAFKA/QUEUE ALERTS ====================
      - alert: KafkaConsumerLagHigh
        expr: kafka_consumer_lag_records{consumer_group=~"silxa.*"} > 10000
        for: 5m
        labels:
          severity: critical
          service: kafka
        annotations:
          summary: "High Kafka consumer lag detected"
          description: "Consumer group {{ $labels.consumer_group }} topic {{ $labels.topic }} lag: {{ $value }} records"
          runbook_url: "https://wiki.internal/runbooks/kafka-lag"

      - alert: ProcessingQueueBacklog
        expr: processing_queue_depth > 5000
        for: 10m
        labels:
          severity: warning
          service: queue
        annotations:
          summary: "Processing queue has significant backlog"
          description: "Queue {{ $labels.queue_name }} depth: {{ $value }} jobs"

      - alert: QueueProcessingSlowdown
        expr: histogram_quantile(0.95, rate(message_processing_duration_milliseconds_bucket[5m])) > 30000
        for: 10m
        labels:
          severity: warning
          service: queue
        annotations:
          summary: "Message processing is taking too long"
          description: "Queue {{ $labels.queue_name }} p95 duration: {{ $value | humanizeDuration }}"

      # ==================== DEAL PIPELINE ALERTS ====================
      - alert: UnusualDealWinRateChange
        expr: abs(deal_win_rate - avg_over_time(deal_win_rate[30d])) > 0.10
        for: 1h
        labels:
          severity: warning
          service: sales
        annotations:
          summary: "Unusual change in deal win rate"
          description: "{{ $labels.segment }} win rate: {{ $value | humanizePercentage }}"

      - alert: DealCycleTimeIncreasing
        expr: histogram_quantile(0.50, rate(deal_cycle_time_days_bucket[7d])) > 60
        for: 1h
        labels:
          severity: info
          service: sales
        annotations:
          summary: "Deal cycle time is increasing"
          description: "{{ $labels.segment }} median cycle time: {{ $value | humanize }} days"

      # ==================== SYSTEM HEALTH ALERTS ====================
      - alert: DatabaseConnectionPoolExhausted
        expr: (database_connections_active / on() vector(10)) > 0.9
        for: 5m
        labels:
          severity: critical
          service: database
        annotations:
          summary: "Database connection pool near capacity"
          description: "Active connections: {{ $value | humanize }}/10"

      - alert: CacheMissRateLow
        expr: cache_hit_rate_percent < 70
        for: 10m
        labels:
          severity: warning
          service: cache
        annotations:
          summary: "Cache hit rate below target"
          description: "{{ $labels.cache_type }} hit rate: {{ $value | humanizePercentage }}"
```

---

## 4. Grafana Dashboard Configuration

### 4.1 Datasource Configuration

Create `/monitoring/grafana/datasources/prometheus.yml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true
    editable: true
```

### 4.2 Dashboard Panels

Create `/monitoring/grafana/dashboards/silxacrm-monitoring.json`:

```json
{
  "dashboard": {
    "title": "SilxaCRM Monitoring Dashboard",
    "tags": ["production", "silxacrm"],
    "timezone": "browser",
    "panels": [
      {
        "id": 1,
        "title": "API Health Overview",
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 0 },
        "targets": [
          {
            "expr": "histogram_quantile(0.99, rate(api_latency_milliseconds_bucket[5m]))",
            "legendFormat": "P99 Latency - {{ endpoint }}"
          },
          {
            "expr": "rate(api_requests_total[5m])",
            "legendFormat": "Request Rate - {{ endpoint }}"
          },
          {
            "expr": "rate(api_errors_total[5m])",
            "legendFormat": "Error Rate - {{ endpoint }}"
          }
        ],
        "options": {
          "legend": { "calcs": ["mean", "max", "min"], "placement": "bottom" },
          "tooltip": { "mode": "multi" }
        },
        "fieldConfig": {
          "defaults": {
            "custom": { "lineWidth": 2 },
            "unit": "ms"
          }
        }
      },
      {
        "id": 2,
        "title": "ML Model Metrics",
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 0 },
        "targets": [
          {
            "expr": "deal_probability_accuracy",
            "legendFormat": "Accuracy - {{ model_version }}"
          },
          {
            "expr": "histogram_quantile(0.95, rate(model_inference_latency_milliseconds_bucket[5m]))",
            "legendFormat": "P95 Inference Latency - {{ model_name }}"
          },
          {
            "expr": "forecast_rmse",
            "legendFormat": "Forecast RMSE - {{ forecast_type }}"
          }
        ],
        "options": {
          "legend": { "calcs": ["mean", "max", "min"], "placement": "bottom" },
          "tooltip": { "mode": "multi" }
        }
      },
      {
        "id": 3,
        "title": "Deal Pipeline Status",
        "type": "stat",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 8 },
        "targets": [
          {
            "expr": "sum(active_deals_total) by (stage)",
            "legendFormat": "{{ stage }}"
          },
          {
            "expr": "deal_win_rate",
            "legendFormat": "Win Rate - {{ segment }}"
          },
          {
            "expr": "histogram_quantile(0.50, rate(deal_cycle_time_days_bucket[7d]))",
            "legendFormat": "Median Cycle Time - {{ segment }}"
          }
        ],
        "options": {
          "colorMode": "value",
          "graphMode": "area",
          "justifyMode": "center"
        }
      },
      {
        "id": 4,
        "title": "Revenue Trend & Forecast",
        "type": "graph",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 8 },
        "targets": [
          {
            "expr": "mrr_usd",
            "legendFormat": "MRR - {{ subscription_tier }}"
          },
          {
            "expr": "revenue_forecast_variance_percent",
            "legendFormat": "Forecast Variance - {{ forecast_horizon }}"
          },
          {
            "expr": "customer_lifetime_value_usd",
            "legendFormat": "CLV - {{ segment }}"
          }
        ],
        "options": {
          "legend": { "calcs": ["mean", "max", "min"], "placement": "bottom" },
          "tooltip": { "mode": "multi" }
        }
      },
      {
        "id": 5,
        "title": "Kafka Consumer Lag",
        "type": "heatmap",
        "gridPos": { "h": 8, "w": 12, "x": 0, "y": 16 },
        "targets": [
          {
            "expr": "kafka_consumer_lag_records{consumer_group=~\"silxa.*\"}",
            "legendFormat": "{{ topic }} - {{ consumer_group }}"
          }
        ],
        "options": {
          "yAxis": { "format": "records" }
        }
      },
      {
        "id": 6,
        "title": "System Health",
        "type": "stat",
        "gridPos": { "h": 8, "w": 12, "x": 12, "y": 16 },
        "targets": [
          {
            "expr": "database_connections_active",
            "legendFormat": "DB Connections - {{ database_name }}"
          },
          {
            "expr": "cache_hit_rate_percent",
            "legendFormat": "Cache Hit Rate - {{ cache_type }}"
          },
          {
            "expr": "up{job=\"api-service\"}",
            "legendFormat": "API Service - {{ instance }}"
          }
        ]
      }
    ]
  }
}
```

### 4.3 Alert Rules Summary

The dashboard includes:
1. **Panel 1 - API Health Overview**: Displays API latency (p99), request rate, and error rate
2. **Panel 2 - ML Model Metrics**: Shows deal probability accuracy, model inference latency, and forecast RMSE
3. **Panel 3 - Deal Pipeline Status**: Visualizes active deals by stage, win rate by segment, and median cycle time
4. **Panel 4 - Revenue Trend & Forecast**: Tracks MRR, forecast variance, and customer lifetime value
5. **Panel 5 - Kafka Consumer Lag**: Heatmap showing consumer lag across topics
6. **Panel 6 - System Health**: Database connections, cache hit rate, and service availability

---

## 5. Slack Integration

### 5.1 Alertmanager Configuration

Create `/monitoring/alertmanager.yml`:

```yaml
global:
  resolve_timeout: 5m
  slack_api_url: 'YOUR_SLACK_WEBHOOK_URL'

route:
  group_by: ['alertname', 'service', 'severity']
  group_wait: 10s
  group_interval: 10s
  repeat_interval: 12h
  receiver: 'slack-notifications'
  routes:
    - match:
        severity: critical
      receiver: 'slack-critical'
      continue: true
    - match:
        severity: warning
      receiver: 'slack-warning'
    - match:
        service: ml_models
      receiver: 'slack-ml-team'
    - match:
        service: sales
      receiver: 'slack-sales-team'

receivers:
  - name: 'slack-notifications'
    slack_configs:
      - channel: '#monitoring-alerts'
        title: '{{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
        send_resolved: true
        actions:
          - type: button
            text: 'View in Grafana'
            url: 'https://grafana.internal/d/silxacrm'

  - name: 'slack-critical'
    slack_configs:
      - channel: '#critical-alerts'
        title: 'CRITICAL: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
        send_resolved: true
        color: 'danger'

  - name: 'slack-warning'
    slack_configs:
      - channel: '#monitoring-alerts'
        title: 'WARNING: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
        send_resolved: false
        color: 'warning'

  - name: 'slack-ml-team'
    slack_configs:
      - channel: '#ml-team'
        title: 'ML Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
        send_resolved: true

  - name: 'slack-sales-team'
    slack_configs:
      - channel: '#sales-ops'
        title: 'Sales Metric Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}\n{{ end }}'
        send_resolved: true
```

### 5.2 Slack Webhook Setup

1. Create a Slack App at https://api.slack.com/apps
2. Enable Incoming Webhooks
3. Create a new webhook and copy the URL
4. Set environment variable: `SLACK_WEBHOOK_URL=https://hooks.slack.com/services/XXX/YYY/ZZZ`
5. Update `/monitoring/alertmanager.yml` with the webhook URL

### 5.3 Slack Message Templates

Configure alert formatting with custom templates. Create `/monitoring/slack-templates.txt`:

```
{{ define "slack.default.text" }}
{{ if eq .Status "firing" }}
🚨 *ALERT FIRING*
{{ else }}
✅ *ALERT RESOLVED*
{{ end }}

*Alert:* {{ .GroupLabels.alertname }}
*Service:* {{ .GroupLabels.service }}
*Severity:* {{ .GroupLabels.severity }}

{{ range .Alerts }}
*Description:* {{ .Annotations.description }}
*Details:* {{ .Annotations.runbook_url }}
{{ end }}

*Timestamp:* {{ .GroupLabels.alertname }} | {{ .GroupLabels.service }}
{{ end }}
```

---

## 6. Metrics Implementation in Backend

### 6.1 Prometheus Client Library Setup

Update `backend/package.json`:

```json
{
  "dependencies": {
    "prom-client": "^14.2.0"
  }
}
```

### 6.2 Metrics Initialization Module

Create `backend/src/utils/metrics.ts`:

```typescript
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
```

### 6.3 Express Middleware Integration

Create `backend/src/middleware/metricsMiddleware.ts`:

```typescript
import express from 'express';
import {
  apiLatencyHistogram,
  apiRequestsCounter,
  apiErrorsCounter,
} from '../utils/metrics';

export function metricsMiddleware(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const start = Date.now();
  const endpoint = req.route?.path || req.path;

  // Track the original end function
  const originalEnd = res.end;
  res.end = function (chunk?: any, encoding?: any) {
    const duration = Date.now() - start;
    const statusCode = res.statusCode;

    // Record metrics
    apiLatencyHistogram
      .labels(endpoint, req.method, String(statusCode))
      .observe(duration);

    apiRequestsCounter
      .labels(endpoint, req.method, String(statusCode))
      .inc();

    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      apiErrorsCounter
        .labels(endpoint, errorType, String(statusCode))
        .inc();
    }

    return originalEnd.call(this, chunk, encoding);
  };

  next();
}
```

### 6.4 Register Middleware and Endpoint

Update `backend/src/index.ts`:

```typescript
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { getMetrics } from './utils/metrics';

// Add metrics middleware early in the chain
app.use(metricsMiddleware);

// Expose metrics endpoint for Prometheus scraping
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getMetrics());
});
```

---

## 7. Monitoring Best Practices

### 7.1 Alert Tuning

1. **Avoid Alert Fatigue**: Start with conservative thresholds and adjust based on baseline metrics
2. **Alert Timing**: Use appropriate `for` durations to prevent flapping (e.g., 5m for latency, 15m for accuracy)
3. **Meaningful Descriptions**: Include actionable information in alert annotations
4. **Escalation Policy**: Route critical alerts to on-call engineers immediately

### 7.2 Metric Collection

1. **Cardinality Management**: Limit high-cardinality labels (avoid unbounded dimensions)
2. **Retention Policy**: Set retention to 30+ days for production metrics
3. **Sampling**: Use histogram buckets that match your SLAs
4. **Scrape Intervals**: Balance between freshness (15s) and load

### 7.3 Dashboard Maintenance

1. **Update Regularly**: Review and update dashboards as features change
2. **Runbook Links**: Always include links to troubleshooting documentation
3. **Alert Testing**: Test alerts in staging before deploying to production
4. **Drill Exercises**: Conduct monthly incident response drills

---

## 8. Runbook Templates

### Template for Critical Alerts

Create `/runbooks/TEMPLATE.md`:

```markdown
# Alert Runbook: [Alert Name]

## Alert Details
- **Alert Name**: [Alert name from Prometheus]
- **Severity**: [Critical/Warning/Info]
- **Service**: [Service name]
- **Typical Cause**: [Brief description]

## Steps to Investigate

1. **Check Grafana Dashboard**: Navigate to [dashboard link]
2. **Verify Service Health**: Run health check endpoint
3. **Review Logs**: `kubectl logs -f deployment/[service]`
4. **Check Dependencies**: Verify connected services are healthy

## Remediation Steps

1. [Step 1]
2. [Step 2]
3. [Escalation path if not resolved]

## Prevention

- [Preventive measure 1]
- [Preventive measure 2]
```

---

## 9. Deployment Instructions

### 9.1 Quick Start

```bash
# Start monitoring stack
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
curl http://localhost:9090/-/healthy  # Prometheus
curl http://localhost:3100/api/health # Grafana
curl http://localhost:9093/-/healthy  # Alertmanager

# Import dashboard
# 1. Login to Grafana (admin/admin)
# 2. Go to Dashboards > Import
# 3. Upload monitoring/grafana/dashboards/silxacrm-monitoring.json
```

### 9.2 Production Deployment

- Use Kubernetes StatefulSets for Prometheus and Alertmanager
- Store metrics in persistent volumes
- Configure TLS for all connections
- Set up cross-datacenter replication for high availability

---

## 10. Metric Summary Table

| Metric Name | Type | Count | Alert Threshold | Critical |
|-------------|------|-------|-----------------|----------|
| api_latency_milliseconds | Histogram | 1 | p99 > 500ms | 5m |
| api_errors_total | Counter | 1 | > 5% error rate | 5m |
| api_requests_total | Counter | 1 | N/A | N/A |
| deal_probability_accuracy | Gauge | 1 | < 0.80 | 15m |
| model_inference_latency_milliseconds | Histogram | 1 | p95 > 500ms | 5m |
| forecast_rmse | Gauge | 1 | > 15% | 10m |
| kafka_consumer_lag_records | Gauge | 1 | > 10k | 5m |
| processing_queue_depth | Gauge | 1 | > 5k | 10m |
| message_processing_duration_milliseconds | Histogram | 1 | p95 > 30s | 10m |
| active_deals_total | Gauge | 1 | N/A | N/A |
| deal_win_rate | Gauge | 1 | Unusual change | 1h |
| deal_cycle_time_days | Histogram | 1 | > 60d | 1h |
| mrr_usd | Gauge | 1 | N/A | N/A |
| revenue_forecast_variance_percent | Gauge | 1 | > 5% | N/A |
| customer_lifetime_value_usd | Gauge | 1 | N/A | N/A |
| database_connections_active | Gauge | 1 | > 90% | 5m |
| cache_hit_rate_percent | Gauge | 1 | < 70% | 10m |

**Total Metrics: 17 unique metrics with sub-metrics based on labels**
**Total Alert Rules: 12 alert conditions**

---

## 11. Troubleshooting

### Common Issues

1. **Prometheus can't scrape metrics endpoint**
   - Verify `/metrics` endpoint is accessible: `curl http://localhost:3000/metrics`
   - Check firewall rules for port 3000
   - Ensure prom-client is properly initialized

2. **Grafana dashboards not updating**
   - Verify Prometheus datasource connectivity
   - Check Grafana logs for errors
   - Restart Grafana container

3. **Slack notifications not working**
   - Verify webhook URL is correct in alertmanager.yml
   - Test with: `curl -X POST -d '{"text":"test"}' YOUR_WEBHOOK_URL`
   - Check Alertmanager logs

---

## 12. References

- Prometheus Documentation: https://prometheus.io/docs/
- Grafana Documentation: https://grafana.com/docs/
- Alertmanager Configuration: https://prometheus.io/docs/alerting/latest/configuration/
- Prom-Client for Node.js: https://github.com/siimon/prom-client
