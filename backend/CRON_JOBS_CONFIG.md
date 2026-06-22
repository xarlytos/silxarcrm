# Cron Jobs Configuration - Revenue Intelligence & Pipeline Automation

## Overview
This document describes the 4 cron jobs created for background task automation in the SilxaCRM backend. The jobs are implemented using `node-cron` (already a dependency) and execute critical revenue intelligence and pipeline health monitoring tasks.

**Location**: `/backend/src/jobs/cronJobs.ts`  
**Initialization**: Automatically called in `src/index.ts` via `initCronJobs()`

---

## Cron Jobs Summary

| Job # | Name | Schedule | Frequency | Time | Purpose |
|-------|------|----------|-----------|------|---------|
| 1 | Deal Probability Recalculation | `30 2 * * *` | Nightly | 2:30 AM | Recalculate win probability for all active deals |
| 2 | Revenue Snapshot Generation | `0 3 * * *` | Daily | 3:00 AM | Generate daily revenue forecasts per software instance |
| 3 | Model Retraining Pipeline | `0 4 * * 0` | Weekly | Sunday 4:00 AM | Train propensity models, evaluate metrics |
| 4 | Pipeline Health Alerts | `0 * * * *` | Hourly | Every hour | Alert on deals with health_score < 50 |

---

## Job Details

### Job 1: Deal Probability Recalculation (Nightly)
**Schedule**: `30 2 * * *` (2:30 AM, every day)  
**Duration**: ~5-15 seconds per 100 deals

#### What it does:
- Fetches all active deals (stage NOT IN ['WON', 'LOST'])
- For each deal, runs `ProbabilityCalculator.calculateDealProbability()`:
  - Analyzes deal stage (PROSPECT → DEMO_SCHEDULED → DEMO_COMPLETED → NEGOTIATION → CLOSING)
  - Applies time decay factors (deals stagnating lose probability)
  - Calculates engagement score from activity count
  - Computes historical win rate
  - Returns adjusted probability (0-100)
- Updates `deals` table with new:
  - `probabilidad_cierre` (0-100 integer)
  - `health_score` (confidence, 0-100)
  - `ultima_actividad_at` (timestamp)

#### Database Tables Affected:
- `deals` (UPDATE)
- `deal_activities` (SELECT only, for engagement calculation)

#### Failure Handling:
- Logs errors per deal; continues processing remaining deals
- Reports: success count, error count, total duration

#### Example Log:
```
[CRON] Starting: Recalculate deal probabilities (nightly)
[CRON] Found 47 active deals to recalculate probabilities
[CRON] Completed: Recalculate deal probabilities. Success: 47, Errors: 0, Duration: 3421ms
```

---

### Job 2: Revenue Snapshot Generation (Daily)
**Schedule**: `0 3 * * *` (3:00 AM, every day)  
**Duration**: ~2-10 seconds depending on deal count

#### What it does:
- Fetches all unique `softwareId` values with active deals
- For each software instance:
  1. Gets all non-terminal deals (stage NOT IN ['WON', 'LOST'])
  2. Groups deal value by stage:
     - `prospectValue` (PROSPECT stage)
     - `demoScheduledValue` (DEMO_SCHEDULED stage)
     - `demoCompletedValue` (DEMO_COMPLETED stage)
     - `negotiationValue` (NEGOTIATION stage)
     - `closingValue` (CLOSING stage)
  3. Calculates revenue scenarios weighted by probability:
     - `expectedRevenue` = SUM(deal_amount × probability)
     - `bestCaseRevenue` = SUM(deal_amount × (probability + 0.2))  ← +20% optimistic
     - `worstCaseRevenue` = SUM(deal_amount × (probability - 0.2))  ← -20% pessimistic
  4. Creates a new `RevenueSnapshot` record

#### Database Tables Affected:
- `deals` (SELECT only)
- `revenue_snapshots` (INSERT)

#### Failure Handling:
- Per-software error handling; one failure doesn't stop other software instances
- Logs: success count, error count, total duration

#### Example Data Structure (revenue_snapshots):
```sql
{
  id: "cuid",
  softwareId: "software_abc123",
  fechaSnapshot: "2026-06-22T03:00:00Z",
  prospectValue: 15000.00,
  demoScheduledValue: 45000.00,
  demoCompletedValue: 120000.00,
  negotiationValue: 250000.00,
  closingValue: 180000.00,
  expectedRevenue: 610000.00,
  bestCaseRevenue: 732000.00,
  worstCaseRevenue: 488000.00,
  createdAt: "2026-06-22T03:00:00Z"
}
```

---

### Job 3: Model Retraining Pipeline (Weekly)
**Schedule**: `0 4 * * 0` (4:00 AM every Sunday)  
**Duration**: ~10-60 seconds depending on data volume

#### What it does:
For each production ML model (estoyEnProduccion = true):
1. **Fetch Recent Data**: Queries all deals updated in the last 7 days
2. **Extract Features**:
   - `daysInStage`: Time spent in current stage
   - `activitiesCount`: Number of interactions (calls, emails, demos)
   - `estimatedClosureScore`: Current health_score
   - `probabilityBaseline`: Current deal probability
3. **Calculate Metrics** (simplified 80-20 validation split):
   - Trains on 80% of recent data
   - Validates on 20% using probability threshold (0.5)
   - Computes accuracy, precision, recall, AUC
4. **Store Metrics**: Creates MLModelMetric record with:
   - `accuracy`
   - `precision`
   - `recall`
   - `auc`
   - `prediccionesTotales` (training set size)
   - `prediccionesExactas` (correct predictions)
   - `featureDrift` (0.0 default; calculate per requirements)
   - `targetDrift` (0.0 default; calculate per requirements)
5. **Update Model Registry**:
   - Updates `trainingDataSize`
   - Updates `trainingDate` (to now)
   - Updates `accuracy` metric
   - Updates `ultimaPrediccion` (to now)

#### Database Tables Affected:
- `ml_models` (SELECT, UPDATE)
- `ml_model_metrics` (INSERT)
- `deals` (SELECT only)
- `deal_activities` (SELECT only)

#### Failure Handling:
- Per-model error handling; failure for Model A doesn't prevent training Model B
- Logs model name, version, accuracy (e.g., "Retrained with accuracy 87.45%")

#### Example Log:
```
[CRON] Starting: Model retraining pipeline (weekly)
[CRON] Found 2 models to retrain
[CRON] Model propensity_to_close (v1.2): Fetched 156 recent deals
[CRON] Model propensity_to_close (v1.2): Retrained with accuracy 87.45%
[CRON] Model churn_risk (v1.0): Fetched 142 recent deals
[CRON] Model churn_risk (v1.0): Retrained with accuracy 79.12%
[CRON] Completed: Model retraining pipeline. Success: 2, Errors: 0, Duration: 18734ms
```

---

### Job 4: Pipeline Health Alerts (Hourly)
**Schedule**: `0 * * * *` (Every hour, at :00 seconds)  
**Duration**: ~1-5 seconds

#### What it does:
1. **Query Unhealthy Deals**: Finds all deals with:
   - `healthScore < 50`
   - Stage NOT IN ['WON', 'LOST']
2. **Categorize by Risk Level**:
   - **CRITICAL**: `healthScore < 30`
   - **WARNING**: `30 <= healthScore < 50`
3. **Group by Software**: Batch deals by `softwareId` for efficiency
4. **Create Alert Events**: For each software with unhealthy deals:
   - Creates an `evento` record with:
     - `tipo: 'pipeline_health_alert'`
     - `severidad: 'critico'` (if critical) or `'warning'` (if warning)
     - `saas: softwareId`
     - `datos`: JSON with deal details, counts, alert message
5. **Log Alerts**: Warns per software instance

#### Database Tables Affected:
- `deals` (SELECT only)
- `deal_activities` (SELECT only, for recent activity)
- `eventos` (INSERT)

#### Failure Handling:
- Per-software error handling; one software's alert failure doesn't block others
- Logs: number of alerts sent, total duration

#### Example Event Data (eventos):
```json
{
  "tipo": "pipeline_health_alert",
  "severidad": "critico",
  "saas": "software_xyz789",
  "datos": {
    "criticalDeals": 2,
    "warningDeals": 5,
    "message": "Pipeline health alert: 2 critical, 5 warning",
    "dealDetails": [
      {
        "dealId": "deal_123",
        "nombre": "Acme Corporation Deal",
        "healthScore": 25,
        "stage": "NEGOTIATION"
      },
      {
        "dealId": "deal_456",
        "nombre": "TechCorp Expansion",
        "healthScore": 42,
        "stage": "DEMO_COMPLETED"
      }
    ]
  }
}
```

---

## Implementation Details

### Technology Stack
- **Scheduler**: `node-cron` (v3.0.3)
- **Database**: Prisma ORM with PostgreSQL
- **Logging**: Winston logger (consistent with existing backend)
- **Services Used**:
  - `ProbabilityCalculator`: Calculates deal win probability
  - `ForecastEngine`: Generates revenue forecasts + `getPipelineHealth(softwareId)`

### Key Features
1. **Error Resilience**: Each job operation includes try-catch; failures in one record don't stop batch processing
2. **Logging**: All jobs log start, progress milestones, and completion with:
   - Success/error counts
   - Total execution duration
   - Specific error messages per failed record
3. **Scalability**: Batch operations (e.g., all deals at once) rather than scheduled per-deal
4. **Idempotency**: Jobs are safe to run multiple times:
   - Revenue snapshots use unique constraint `(softwareId, fechaSnapshot)` to prevent duplicates
   - ML metrics use unique constraint `(modelId, fecha)` to prevent duplicates
   - Deal probability updates are purely deterministic

### Performance Considerations
- **Memory**: Loads all active deals/models at once; feasible up to ~10K deals
- **Database**: Uses indexed queries on common fields (stage, healthScore, softwareId, fecha)
- **Concurrency**: Jobs run sequentially (no overlaps); next job won't start until previous completes

---

## Monitoring & Alerting

### What to Monitor
1. **Job Execution Time**: Watch for spikes in duration (e.g., probability recalc > 1 minute)
2. **Error Rates**: Monitor logs for "[CRON]" entries with error counts > 0
3. **Data Freshness**: 
   - Check `revenue_snapshots` table for gaps (should have one per day)
   - Check `ml_model_metrics` table for weekly entries
   - Verify `deals.probabilidad_cierre` updates in the 2:30 AM hour
4. **Event Creation**: Count new `pipeline_health_alert` events in `eventos` table

### Recommended Alerts
```yaml
- condition: "cron job error count > 0 in logs"
  action: "email ops team with error details"
  
- condition: "no revenue snapshots for 48+ hours"
  action: "page on-call engineer"
  
- condition: "pipeline_health_alert events > 20 in 1 hour"
  action: "notify sales operations for review"
```

### Log Patterns
All cron jobs log with `[CRON]` prefix for easy filtering:
```bash
# View all cron activity
grep "\[CRON\]" backend.log

# View only errors
grep "\[CRON\].*Error" backend.log

# View job completion summaries
grep "\[CRON\].*Completed" backend.log
```

---

## Testing & Validation

### Manual Testing
```bash
# Start backend
npm run dev

# Check logs for cron initialization
grep "Cron jobs initialized" logs/

# Manually trigger a job (for development):
# Add this to cronJobs.ts temporarily:
// initCronJobs(); // Auto-run on startup
// Test manually:
const forecastEngine = new ForecastEngine();
await forecastEngine.generateForecast(1);
```

### Validation Queries
```sql
-- Check latest deal probabilities
SELECT id, nombre, stage, probabilidad_cierre, health_score, ultima_actividad_at
FROM deals
WHERE updated_at > NOW() - INTERVAL '1 hour'
ORDER BY updated_at DESC
LIMIT 10;

-- Check revenue snapshots
SELECT softwareId, fechaSnapshot, expectedRevenue, bestCaseRevenue, worstCaseRevenue
FROM revenue_snapshots
WHERE fechaSnapshot > NOW() - INTERVAL '7 days'
ORDER BY fechaSnapshot DESC;

-- Check ML model metrics
SELECT m.nombre, m.version, mm.fecha, mm.accuracy, mm.prediccionesTotales
FROM ml_models m
LEFT JOIN ml_model_metrics mm ON m.id = mm.modelId
WHERE mm.fecha > NOW() - INTERVAL '30 days'
ORDER BY mm.fecha DESC;

-- Check health alerts
SELECT tipo, severidad, saas, createdAt, datos
FROM eventos
WHERE tipo = 'pipeline_health_alert'
  AND createdAt > NOW() - INTERVAL '24 hours'
ORDER BY createdAt DESC;
```

---

## Troubleshooting

### Job Not Running?
1. Check if backend is running: `curl http://localhost:PORT/health`
2. Verify logs contain "Cron jobs initialized"
3. Check system time synchronization: `date`
4. Verify node-cron is installed: `npm ls node-cron`

### Job Running But Logging Errors?
1. Check database connection: `prisma.$connect()` test
2. Verify Prisma types are generated: `npx prisma generate`
3. Check data consistency in deals/ml_models tables
4. Look for "error TS" in TypeScript compilation

### Revenue Snapshots Not Created?
1. Verify `deals` table has records with active stages
2. Check `softwareId` values are not NULL
3. Confirm `fechaSnapshot` is truncated to date (not time)

### Model Retraining Shows 0% Accuracy?
1. Verify `ml_models` table has records with `estoyEnProduccion = true`
2. Check that recent deals (updated > 7 days ago) exist
3. Inspect the validation split logic (80-20 split may be too small for <10 deals)

---

## Future Enhancements

1. **Dynamic Scheduling**: Allow users to customize job times via settings UI
2. **Drift Detection**: Implement proper feature/target drift calculation in Job 3
3. **Backpressure Handling**: Skip job if previous instance still running (configurable)
4. **Webhook Notifications**: Send health alerts to Slack/PagerDuty
5. **Job Metrics**: Track job execution time, success rate in a metrics table
6. **Distributed Execution**: Use BullMQ or similar for multi-instance deployments

---

## Summary

**Total Jobs Created**: 4  
**Total Schedules**: 4  

1. ✅ Nightly deal probability recalculation (`30 2 * * *`)
2. ✅ Daily revenue snapshot generation (`0 3 * * *`)
3. ✅ Weekly model retraining pipeline (`0 4 * * 0`)
4. ✅ Hourly pipeline health alerts (`0 * * * *`)

All jobs integrate with existing Prisma models and services, use consistent logging, and include comprehensive error handling.
