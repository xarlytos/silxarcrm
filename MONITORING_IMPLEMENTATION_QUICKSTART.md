# Monitoring & Alerting - Implementation Quickstart

## Phase 1: Backend Integration (30 minutes)

### 1.1 Install prom-client dependency

```bash
cd backend
npm install prom-client
```

### 1.2 Update backend/src/index.ts

Add these imports at the top:

```typescript
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { getMetrics } from './utils/metrics';
```

Add this middleware early in the Express setup (after security headers, before routes):

```typescript
// Metrics middleware - must be early in the chain
app.use(metricsMiddleware);
```

Add metrics endpoint:

```typescript
// Expose metrics for Prometheus
app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain');
  res.send(getMetrics());
});
```

### 1.3 Integrate ML metrics in your ML service

In your lead scoring or revenue intelligence service, import and use the helpers:

```typescript
import {
  updateDealAccuracyMetrics,
  recordInferenceLatency,
  updateForecastRmse,
} from '../utils/mlMetricsHelper';

// After model evaluation
updateDealAccuracyMetrics({
  modelVersion: 'v1.0.0',
  segment: 'enterprise',
  predictionWindow: '30days',
  accuracy: 0.85,
  forecastType: 'revenue',
  horizonDays: 30,
  rmse: 12.5,
});

// Record inference latency
recordInferenceLatency({
  modelName: 'deal_probability_model',
  modelVersion: 'v1.0.0',
  endpoint: '/api/lead-scoring/predict',
  latencyMs: 150,
});
```

### 1.4 Verify metrics endpoint

```bash
# Start backend
npm run dev

# In another terminal
curl http://localhost:3000/metrics
```

You should see Prometheus-formatted metrics output.

---

## Phase 2: Monitoring Stack (15 minutes)

### 2.1 Create monitoring directories

```bash
mkdir -p monitoring/grafana/dashboards
mkdir -p monitoring/grafana/datasources
```

### 2.2 Start monitoring stack

```bash
# From project root
docker-compose -f docker-compose.monitoring.yml up -d

# Verify services are running
docker-compose -f docker-compose.monitoring.yml ps
```

### 2.3 Verify Prometheus is scraping metrics

1. Open http://localhost:9090
2. Go to Status > Targets
3. Verify "api-service" target shows "UP"
4. Go to Graph and query: `api_latency_milliseconds_bucket`

### 2.4 Set up Grafana

1. Open http://localhost:3100
2. Login with admin/admin
3. Go to Settings > Data Sources
4. Verify Prometheus datasource is configured
5. Go to Dashboards > Import
6. Upload `monitoring/grafana/dashboards/silxacrm-monitoring.json`

---

## Phase 3: Slack Integration (10 minutes)

### 3.1 Create Slack webhook

1. Go to https://api.slack.com/apps
2. Click "Create New App" > "From scratch"
3. Name: "SilxaCRM Monitoring"
4. Workspace: your Slack workspace
5. Go to "Incoming Webhooks"
6. Click "Add New Webhook to Workspace"
7. Select channel: #monitoring-alerts
8. Copy the webhook URL

### 3.2 Update alertmanager configuration

Edit `monitoring/alertmanager.yml` and replace:

```yaml
slack_api_url: '${SLACK_WEBHOOK_URL}'
```

With your webhook URL or set environment variable:

```bash
export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
```

### 3.3 Restart Alertmanager

```bash
docker-compose -f docker-compose.monitoring.yml restart alertmanager
```

### 3.4 Test Slack notification

Manually trigger an alert for testing:

```bash
# In Prometheus UI, go to Alerts tab
# You should see "HighAPILatency" alert (it may be inactive initially)
# Generate traffic to trigger it
```

---

## Phase 4: Metrics Integration Points

### 4.1 Deal Pipeline Metrics

In your deals service/controller, add:

```typescript
import { updateActiveDealsByStage, updateDealWinRate } from '../utils/revenueMetricsHelper';

// After fetching deals by stage
updateActiveDealsByStage({
  activeDealsCount: 45,
  stage: 'qualification',
  segment: 'enterprise',
  ownerRegion: 'us-east',
});

// Calculate and update win rate (weekly batch job)
updateDealWinRate({
  winRate: 0.35,
  segment: 'mid-market',
  salesRegion: 'us-west',
  timePeriod: 'week_ending_2024_01_22',
});
```

### 4.2 Revenue Metrics

In your revenue intelligence service:

```typescript
import {
  updateMrrMetrics,
  updateForecastVariance,
  updateClvMetrics,
} from '../utils/revenueMetricsHelper';

// Update MRR
updateMrrMetrics({
  mrrUsd: 125000,
  subscriptionTier: 'enterprise',
  region: 'us-east',
});

// Update forecast accuracy
updateForecastVariance({
  variancePercent: 3.5,
  forecastHorizon: '30days',
  actualPeriod: 'jan_2024',
});

// Update CLV
updateClvMetrics({
  clvUsd: 45000,
  cohortMonth: 'jun_2023',
  segment: 'enterprise',
});
```

### 4.3 Queue/Kafka Metrics

In your job processor or Kafka consumer:

```typescript
import {
  updateKafkaConsumerLag,
  updateQueueDepth,
  recordMessageProcessingDuration,
} from '../utils/queueMetricsHelper';

// Record message processing
const start = Date.now();
try {
  // Process message
  recordMessageProcessingDuration({
    queueName: 'lead_scoring_queue',
    jobType: 'score_lead',
    status: 'success',
    durationMs: Date.now() - start,
  });
} catch (error) {
  recordMessageProcessingDuration({
    queueName: 'lead_scoring_queue',
    jobType: 'score_lead',
    status: 'failed',
    durationMs: Date.now() - start,
  });
}

// Update queue depth
updateQueueDepth({
  queueName: 'lead_scoring_queue',
  priorityLevel: 'normal',
  jobCount: queue.count(),
});

// Update Kafka lag (in consumer lag monitoring job)
updateKafkaConsumerLag({
  topic: 'deals_created',
  consumerGroup: 'deal_pipeline_service',
  partition: 0,
  lagRecords: 1250,
});
```

### 4.4 System Health Metrics

Add to your health check endpoint:

```typescript
import { updateBatchSystemHealth } from '../utils/systemHealthMetricsHelper';

app.get('/api/health', async (req, res) => {
  const poolStatus = await getConnectionPoolStats();
  const cacheStats = redis.getStats();

  updateBatchSystemHealth(
    [
      {
        connectionPool: 'primary',
        databaseName: 'silxacrm',
        activeConnections: poolStatus.active,
      },
    ],
    [
      {
        cacheType: 'redis',
        hitRatePercent: (cacheStats.hits / cacheStats.total) * 100,
      },
    ]
  );

  res.json({ status: 'ok' });
});
```

---

## Phase 5: Testing & Validation

### 5.1 Generate test metrics

Run these commands to validate the system:

```bash
# Generate API traffic
for i in {1..100}; do
  curl http://localhost:3000/api/health
done

# Check metrics are recorded
curl http://localhost:3000/metrics | grep api_requests_total
```

### 5.2 View metrics in Grafana

1. Open http://localhost:3100
2. Go to Dashboards > SilxaCRM Monitoring Dashboard
3. Verify all 4 panels are showing data:
   - Panel 1: API Health Overview
   - Panel 2: ML Model Metrics
   - Panel 3: Deal Pipeline Status
   - Panel 4: Revenue Trend & Forecast

### 5.3 Test alerts

Trigger high latency condition:

```typescript
// In a test endpoint
app.get('/api/test-latency', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 2000)); // 2 second delay
  res.json({ status: 'ok' });
});

// Generate traffic
for i in {1..100}; do
  curl http://localhost:3000/api/test-latency &
done
```

After 5 minutes of high latency:
- Check http://localhost:9090/alerts
- Should see "HighAPILatency" alert in FIRING state
- Check your Slack channel for notification

---

## Phase 6: Production Deployment Checklist

- [ ] Backend metrics middleware integrated
- [ ] All 17 metrics being collected and exposed
- [ ] Prometheus scraping all targets successfully
- [ ] Grafana dashboards configured with all 4 panels
- [ ] Alert rules configured in Prometheus
- [ ] Alertmanager configured with Slack webhook
- [ ] Slack channels created (#monitoring-alerts, #critical-alerts, #ml-team, #sales-ops)
- [ ] Load tested metrics collection (no performance degradation)
- [ ] Retention policy set to 30 days minimum
- [ ] Backup/disaster recovery plan for metrics storage

---

## Phase 7: Ongoing Maintenance

### Weekly Tasks
- Review alert firing patterns
- Adjust thresholds based on baseline metrics
- Check Grafana dashboard accuracy

### Monthly Tasks
- Review and update alert descriptions
- Conduct incident response drills
- Analyze metrics trends for capacity planning

### Quarterly Tasks
- Update runbook documentation
- Review dashboard designs
- Plan metric collection improvements

---

## Common Integration Patterns

### Pattern 1: Batch Metric Updates

```typescript
// In a scheduled job (e.g., every 5 minutes)
import * as metrics from '../utils/revenueMetricsHelper';

async function updateMetricsJob() {
  const deals = await getDealsByStage();
  const revenue = await getRevenueMetrics();
  const performance = await calculatePerformanceMetrics();

  metrics.updateBatchRevenueMetrics(revenue, deals, performance);
}
```

### Pattern 2: Real-time Metric Recording

```typescript
// In request/message processing
import { recordInferenceLatency } from '../utils/mlMetricsHelper';

async function processLeadWithModel(lead) {
  const start = Date.now();
  const prediction = await model.predict(lead);
  
  recordInferenceLatency({
    modelName: 'lead_probability',
    modelVersion: 'v1.0',
    endpoint: 'process_lead',
    latencyMs: Date.now() - start,
  });

  return prediction;
}
```

### Pattern 3: Error Tracking

```typescript
// Metrics middleware automatically tracks error rates
// Ensure error handlers record status codes correctly
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
  // metricsMiddleware will capture this as api_errors_total
});
```

---

## Troubleshooting

### Metrics endpoint returns 404

- Verify `/metrics` route is registered in Express
- Ensure metricsMiddleware is imported correctly
- Check that prom-client is installed

### Prometheus shows "DOWN" for targets

- Verify backend is running on correct port (3000)
- Check firewall allows connections to port 3000
- Verify `/metrics` endpoint returns data (curl http://localhost:3000/metrics)

### Grafana dashboard is empty

- Verify Prometheus datasource is connected
- Check that Prometheus is scraping metrics (Status > Targets)
- Refresh Grafana browser tab
- Verify dashboard query syntax matches metric names

### Slack notifications not working

- Test webhook: `curl -X POST -d '{"text":"test"}' YOUR_WEBHOOK_URL`
- Verify webhook URL is correct in alertmanager.yml
- Check Alertmanager logs: `docker logs alertmanager`
- Ensure Slack channels exist and bot has permissions

---

## Next Steps

1. Deploy to staging environment
2. Run load tests to validate metric collection
3. Calibrate alert thresholds based on baseline metrics
4. Train team on dashboard usage and runbooks
5. Schedule monthly metric review meetings
