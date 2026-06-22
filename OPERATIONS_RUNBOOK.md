# Operations Runbook: Production Incident Troubleshooting

**Last Updated:** 2026-06-22  
**Audience:** DevOps, SRE, Backend Engineering  
**Severity Levels:** P1 (Critical), P2 (High), P3 (Medium)

---

## Table of Contents

1. [Scenario 1: Deal Probability Not Updating](#scenario-1-deal-probability-not-updating)
2. [Scenario 2: Model Accuracy Dropping](#scenario-2-model-accuracy-dropping)
3. [Scenario 3: Kafka Lag Building Up](#scenario-3-kafka-lag-building-up)
4. [Scenario 4: Database Performance Degrading](#scenario-4-database-performance-degrading)
5. [Scenario 5: Emergency Rollback](#scenario-5-emergency-rollback)
6. [Quick Reference: Common Commands](#quick-reference-common-commands)
7. [Escalation Paths](#escalation-paths)

---

## Scenario 1: Deal Probability Not Updating

**Severity:** P2 (High) — Revenue attribution blocked  
**Impact:** Deal forecasting unavailable, pipeline visibility lost  
**Detection:** Alerts fire when `deal_probability_update_latency` > 5min OR `deal_updates_stale_count` > 100  
**MTTR Target:** 15 minutes

### 1.1 Quick Diagnosis (First 2 minutes)

```bash
# Check if Deal Engine service is responding
curl -s -w "\n%{http_code}\n" http://llamadas-backend:8000/health | tail -1

# Monitor real-time deal update latency
docker logs -f llamadas-backend --tail=50 | grep -i "deal_recommendation\|deal_update"

# Check database connection pool status
psql -h postgres-primary -U app_user -d crm_db -c "SELECT * FROM pg_stat_activity WHERE usename = 'app_user';" | wc -l
```

### 1.2 Root Cause Analysis

**Check 1: Backend Service Health**

```bash
# Verify service is running and responsive
ps aux | grep "llamadas-backend\|gunicorn\|uvicorn" | grep -v grep

# Check for recent crashes in logs (last 30 min)
docker logs llamadas-backend --since 30m | grep -E "CRITICAL|ERROR|Exception|Traceback"

# Monitor CPU/Memory pressure
docker stats llamadas-backend --no-stream | awk '{print $1, $3, $4, $6, $7}'
```

**Check 2: Database Connectivity**

```bash
# Test primary database connection
psql -h postgres-primary -U app_user -d crm_db -c "SELECT 1;" && echo "✓ Primary DB OK" || echo "✗ Primary DB FAILED"

# Check replica lag (if using read replicas)
psql -h postgres-primary -U app_user -d crm_db -c "SELECT NOW() - pg_last_wal_receive_lsn() AS replica_lag_bytes;"

# Verify connection pool is not exhausted
psql -h postgres-primary -U app_user -d crm_db -c "
  SELECT 
    datname, 
    count(*) as connections, 
    max_conn - count(*) as available
  FROM pg_stat_activity 
  RIGHT JOIN pg_database ON pg_database.oid = pg_stat_activity.datid
  WHERE datname = 'crm_db' 
  GROUP BY datname, max_conn;
"
```

**Check 3: Deal Engine Process Queue**

```bash
# Check Redis queue for deal recommendation jobs
redis-cli -h redis-primary -p 6379 LLEN "queue:deal_recommendations"

# Monitor processing rate (should be > 10/sec)
redis-cli -h redis-primary ZCARD "active:deal_updates:$(date +%s)"

# Check for stuck/dead-letter jobs
redis-cli -h redis-primary LLEN "queue:deal_recommendations:dead_letter"
```

**Check 4: Model Inference Latency**

```bash
# Check ML model service availability
curl -s http://ml-inference:5000/health | jq .

# Monitor deal probability endpoint latency
curl -s -w "@curl_format.txt" -X POST http://ml-inference:5000/predict \
  -H "Content-Type: application/json" \
  -d '{"prospect_id": "test", "feature_vector": [1, 0, 1, 0]}'

# Check GPU/inference engine utilization
nvidia-smi --query-gpu=utilization.gpu,utilization.memory --format=csv,noheader
```

### 1.3 Remediation Steps

**Option A: Restart Deal Engine Service (Least Disruptive)**

```bash
# Step 1: Drain ongoing requests (graceful)
curl -X POST http://llamadas-backend:8000/admin/drain \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"timeout_seconds": 30}'

# Step 2: Restart the container
docker restart llamadas-backend

# Step 3: Verify recovery
docker logs llamadas-backend --tail=20
sleep 5
curl http://llamadas-backend:8000/health
```

**Option B: Clear Stale Cache & Retry (If Cache is the Issue)**

```bash
# Flush Redis cache for deal probabilities (selective)
redis-cli -h redis-primary DEL "deal_probability:*"

# Trigger recomputation of top 1000 deals
curl -X POST http://llamadas-backend:8000/admin/rebuild/deal_cache \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{"limit": 1000}'

# Monitor rebuild progress
watch 'redis-cli LLEN queue:deal_recommendations'
```

**Option C: Failover to Secondary ML Model**

```bash
# If primary ML inference is slow, switch to fallback model
curl -X PATCH http://llamadas-backend:8000/config/ml_model \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "model_name": "deal_probability_v2_light",
    "reason": "Primary model latency > 2s",
    "ttl_minutes": 60
  }'

# Verify switch was applied
curl http://llamadas-backend:8000/config/active_ml_model
```

### 1.4 Logs to Inspect

**Location:** `/var/log/llamadas/deal_engine.log`

```bash
# Watch real-time updates
tail -f /var/log/llamadas/deal_engine.log | grep -E "deal_probability|update_latency|error"

# Analyze error patterns (last 1 hour)
grep "ERROR\|CRITICAL" /var/log/llamadas/deal_engine.log \
  --since-time="$(date -d '1 hour ago' +%Y-%m-%dT%H:%M:%S)" | \
  cut -d' ' -f3- | sort | uniq -c | sort -rn
```

**Database Audit Trail:**

```sql
-- Check last 100 deal probability updates
SELECT 
  deal_id,
  old_probability,
  new_probability,
  updated_at,
  updated_by,
  EXTRACT(EPOCH FROM (NOW() - updated_at)) / 60 as minutes_ago
FROM deal_probability_history
ORDER BY updated_at DESC
LIMIT 100;

-- Identify prospects with stale updates (> 30 min old)
SELECT 
  d.id,
  d.prospect_id,
  d.probability,
  NOW() - d.updated_at as staleness,
  CASE WHEN NOW() - d.updated_at > INTERVAL '30 min' THEN 'STALE' ELSE 'OK' END
FROM deals d
WHERE d.status != 'closed'
ORDER BY d.updated_at ASC
LIMIT 50;
```

### 1.5 Prevention & Monitoring

**Prometheus Alerts to Enable:**

```yaml
# In prometheus.yml
- alert: DealProbabilityUpdateLatencyHigh
  expr: deal_probability_update_latency_ms > 5000
  for: 5m
  annotations:
    summary: "Deal probability updates slow ({{ $value }}ms)"

- alert: DealQueueBacklogHigh
  expr: deal_recommendation_queue_size > 10000
  for: 10m
  annotations:
    summary: "{{ $value }} deals queued for update"

- alert: DealEngineServiceDown
  expr: up{job="llamadas-backend"} == 0
  for: 2m
  annotations:
    summary: "Deal Engine backend unavailable"
```

**Continuous Monitoring:**

```python
# In observability/prometheus_integration.py
from prometheus_client import Histogram, Counter

deal_probability_latency = Histogram(
    'deal_probability_update_latency_ms',
    'Latency of deal probability updates',
    buckets=(100, 500, 1000, 2500, 5000, 10000)
)

deal_update_counter = Counter(
    'deal_probability_updates_total',
    'Total deal probability updates',
    ['status', 'model_version']
)
```

---

## Scenario 2: Model Accuracy Dropping

**Severity:** P2 (High) — ML model reliability degraded  
**Impact:** Prospect scoring unreliable, deal recommendations inaccurate  
**Detection:** Alert fires when `model_f1_score` < 0.75 OR `prediction_variance` > threshold  
**MTTR Target:** 30 minutes

### 2.1 Quick Diagnosis (First 3 minutes)

```bash
# Check current model version and metrics
curl -s http://ml-inference:5000/model/info | jq .

# Monitor prediction accuracy on recent data
curl -s -X POST http://ml-inference:5000/evaluate \
  -d '{"data_range": "last_24h"}' | jq '.metrics'

# Check for data drift (feature distribution changes)
docker exec ml-inference python /app/drift_detection.py --model deal_probability_v3
```

### 2.2 Root Cause Analysis

**Check 1: Training Data Quality**

```python
# Run data quality audit
import pandas as pd
import numpy as np

# Connect to training data warehouse
conn = psql.connect("dbname=analytics user=app_user host=postgres-primary")

# Load recent training data
df = pd.read_sql("""
  SELECT * FROM training_data_feature_store
  WHERE created_at >= NOW() - INTERVAL '7 days'
  ORDER BY created_at DESC
  LIMIT 100000
""", conn)

# Check for data quality issues
print(f"Missing values: {df.isnull().sum().sum()}")
print(f"Duplicates: {df.duplicated().sum()}")
print(f"Feature ranges: {df.describe()}")

# Check for label imbalance
print(f"Positive ratio: {df['target'].mean():.2%}")

# Detect outliers (IQR method)
Q1, Q3 = df.quantile([0.25, 0.75])
IQR = Q3 - Q1
outliers = ((df < (Q1 - 1.5 * IQR)) | (df > (Q3 + 1.5 * IQR))).sum()
print(f"Outlier rows: {outliers.sum()}")
```

**Check 2: Feature Drift Detection**

```bash
# Compare feature distributions: baseline vs current
docker exec ml-inference python -c "
from app.ml.drift_detection import KolmogorovSmirnovTest
import json

test = KolmogorovSmirnovTest(
    baseline_period='last_30_days',
    current_period='last_7_days'
)
results = test.detect_drift()
print(json.dumps(results, indent=2))
" | jq '.features | map(select(.p_value < 0.05))'
```

**Check 3: Model Performance on Holdout Set**

```sql
-- Compare baseline vs current model metrics
SELECT 
  model_version,
  metric_name,
  metric_value,
  evaluated_at,
  EXTRACT(EPOCH FROM (NOW() - evaluated_at)) / 3600 as hours_ago
FROM model_evaluation_metrics
WHERE metric_name IN ('f1_score', 'precision', 'recall', 'auc_roc')
ORDER BY model_version DESC, evaluated_at DESC
LIMIT 20;

-- Check for specific class performance degradation
SELECT 
  predicted_class,
  actual_class,
  COUNT(*) as count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (PARTITION BY actual_class), 2) as pct
FROM model_predictions_log
WHERE created_at >= NOW() - INTERVAL '24 hours'
GROUP BY predicted_class, actual_class
ORDER BY actual_class, predicted_class;
```

**Check 4: Model Inference Consistency**

```python
# Test model determinism (same input → same output)
import requests

test_feature = {"vector": [1.0, 0.5, 2.3, 0.1, 1.9]}

results = []
for i in range(5):
    resp = requests.post('http://ml-inference:5000/predict', json=test_feature)
    results.append(resp.json()['probability'])

if len(set(results)) == 1:
    print(f"✓ Model deterministic: {results[0]}")
else:
    print(f"✗ Model non-deterministic: {results}")
    print("  → Check for stochastic layers (Dropout, temperature sampling)")
```

### 2.3 Remediation Steps

**Option A: Roll Back to Previous Model Version (Fastest)**

```bash
# List available model versions
curl -s http://ml-inference:5000/models/versions | jq '.versions | sort_by(.accuracy) | reverse'

# Switch to previous known-good model
curl -X POST http://ml-inference:5000/model/rollback \
  -H "Content-Type: application/json" \
  -d '{
    "target_version": "deal_probability_v2.5",
    "reason": "F1 score dropped from 0.82 to 0.71",
    "ttl_minutes": 120
  }'

# Verify rollback
curl -s http://ml-inference:5000/model/info | jq '.current_version'

# Monitor accuracy recovery
watch 'curl -s http://ml-inference:5000/model/metrics | jq ".f1_score"'
```

**Option B: Trigger Emergency Retraining (Data Issue)**

```bash
# Check if recent data is the culprit
# 1. Use only pre-incident training data
curl -X POST http://ml-inference:5000/retrain \
  -H "Content-Type: application/json" \
  -d '{
    "data_period": "90_days_before_incident",
    "exclude_dates": ["2026-06-20", "2026-06-21"],
    "validation_split": 0.2,
    "patience": 10,
    "max_epochs": 100
  }'

# Monitor retraining progress
docker logs ml-retrain-job --tail=20 -f | grep -E "epoch|loss|validation"

# Once complete, verify metrics
curl -s http://ml-inference:5000/model/metrics | jq '.'
```

**Option C: Switch to Ensemble/Fallback Model**

```bash
# Use simpler, more robust fallback model
curl -X PATCH http://ml-inference:5000/config \
  -H "Content-Type: application/json" \
  -d '{
    "inference_strategy": "ensemble",
    "models": [
      "deal_probability_v2.5",
      "deal_probability_v3_conservative",
      "logistic_regression_baseline"
    ],
    "ensemble_method": "median"
  }'

# Test ensemble output
curl -X POST http://ml-inference:5000/predict \
  -d '{"feature_vector": [1, 2, 3, 4, 5]}' | jq '.ensemble_votes'
```

### 2.4 Retraining Trigger Checklist

```bash
# Before retraining, run full diagnostic
#!/bin/bash
set -e

echo "=== Model Accuracy Incident Diagnostics ==="

# 1. Data freshness
echo "1. Data freshness in feature store..."
psql -c "SELECT max(created_at), min(created_at), count(*) FROM feature_store_deals;"

# 2. Class balance
echo "2. Label distribution..."
psql -c "SELECT target, COUNT(*) FROM training_data GROUP BY target;"

# 3. Feature correlation
echo "3. Checking for feature multicollinearity..."
python -c "
import pandas as pd
df = pd.read_sql('SELECT * FROM training_data LIMIT 10000', conn)
print(df.corr().abs().sum().nlargest(10))
"

# 4. Baseline performance
echo "4. Baseline model accuracy..."
curl -s http://ml-inference:5000/model/baseline_metrics

# 5. Data leakage check
echo "5. Checking for data leakage..."
psql -c "SELECT * FROM features WHERE name LIKE '%test%' OR name LIKE '%leak%';"

echo "=== End Diagnostics ==="
```

### 2.5 Logs to Inspect

**ML Model Training Logs:**

```bash
docker logs ml-retrain-job --tail=100 | tail -50

# Watch for convergence issues
grep -E "loss:|validation|epoch" /var/log/ml-training.log | tail -20

# Check for OOM or resource exhaustion
grep -E "CUDA|memory|OOM|exception" /var/log/ml-training.log
```

**Model Inference Logs:**

```bash
tail -f /var/log/ml-inference/server.log | grep -E "ERROR|WARNING|inference_time"

# Check for model loading issues
docker exec ml-inference cat /var/log/model_loader.log | tail -20
```

### 2.6 Prevention & Monitoring

**Continuous Model Monitoring:**

```yaml
- alert: ModelAccuracyDropped
  expr: model_f1_score < 0.75
  for: 10m
  annotations:
    summary: "Model F1 score dropped to {{ $value }}"
    action: "Review recent data quality"

- alert: FeatureDriftDetected
  expr: feature_drift_kolmogorov_p_value < 0.05
  for: 30m
  annotations:
    summary: "Significant drift in feature: {{ $labels.feature }}"

- alert: PredictionVarianceAnomaly
  expr: rate(model_prediction_variance[5m]) > 0.3
  for: 15m
  annotations:
    summary: "Model predictions becoming increasingly uncertain"
```

**Automated Retraining Policy:**

```python
# In ml/endpoints.py
RETRAINING_TRIGGERS = {
    'f1_score_drops_below': 0.75,
    'data_drift_p_value_threshold': 0.05,
    'max_days_without_retraining': 7,
    'min_new_samples_for_retrain': 5000,
    'class_imbalance_ratio_threshold': 0.7
}

async def check_retraining_needed():
    """Automatically trigger retraining if conditions met"""
    metrics = await get_latest_metrics()
    
    if metrics['f1_score'] < RETRAINING_TRIGGERS['f1_score_drops_below']:
        log.warning("Accuracy below threshold - triggering retrain")
        await schedule_retrain()
```

---

## Scenario 3: Kafka Lag Building Up

**Severity:** P1 (Critical) — Real-time processing blocked  
**Impact:** Conversation logs not processed, insights not generated  
**Detection:** Alert fires when `kafka_consumer_lag` > 10000 messages  
**MTTR Target:** 10 minutes

### 3.1 Quick Diagnosis (First 2 minutes)

```bash
# Check Kafka cluster health
kafka-topics.sh --bootstrap-server kafka-broker-1:9092 --describe | head -20

# Monitor consumer group lag
kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor \
  --describe

# Check broker disk space
df -h /var/kafka/data | awk '{print $1, $2, $3, $4, $5}'

# Monitor broker CPU/Network
docker stats kafka-broker-1 --no-stream
```

### 3.2 Root Cause Analysis

**Check 1: Consumer Health**

```bash
# Verify consumer is running
docker ps -f "name=llamadas-processor" --format "table {{.Status}}"

# Check consumer logs for exceptions
docker logs llamadas-processor --tail=50 | grep -E "ERROR|Exception|abort"

# Monitor consumer offsets
kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor \
  --describe | awk '{print $1, $3, $4, $5, $6}'
```

**Check 2: Topic Performance**

```bash
# Check for slow topics (consumer lag per partition)
for topic in conversation-events call-metrics prospect-updates; do
  echo "=== Topic: $topic ==="
  kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
    --group llamadas-processor \
    --describe | grep "$topic"
done

# Monitor producer throughput
kafka-run-class.sh kafka.tools.JmxTool \
  --object-name kafka.producer:type=producer-metrics,client-id=llamadas-producer \
  --attributes records-per-sec
```

**Check 3: Disk Space & I/O**

```bash
# Check Kafka log directory utilization
du -sh /var/kafka/data/* | sort -rh | head -10

# Monitor disk I/O latency
iostat -x /dev/sda 5 2 | tail -10

# Check for full partitions
kafka-log-dirs.sh --bootstrap-server kafka-broker-1:9092 \
  --describe | jq '.[] | select(.size > 1000000000)'
```

**Check 4: Network & Broker Performance**

```bash
# Check if brokers are reachable
for broker in kafka-broker-1 kafka-broker-2 kafka-broker-3; do
  nc -zv -w2 $broker 9092 && echo "✓ $broker OK" || echo "✗ $broker FAILED"
done

# Monitor broker memory/GC
docker stats kafka-broker-1 --no-stream | awk '{print $3, $4, $8}'

# Check for GC pauses (if available)
jstat -gc -h3 <PID_OF_KAFKA_BROKER> 1000 5
```

### 3.3 Remediation Steps

**Option A: Restart Consumer Group (Least Disruptive)**

```bash
# Step 1: Gracefully stop the consumer
docker exec llamadas-processor bash -c 'kill -SIGTERM $(pidof python) && sleep 30'

# Step 2: Reset consumer offsets to latest (skip backlog)
kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor \
  --reset-offsets \
  --to-latest \
  --topic conversation-events,call-metrics,prospect-updates \
  --execute

# Step 3: Restart the consumer
docker start llamadas-processor

# Step 4: Monitor recovery
watch 'kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor --describe | grep LAG'
```

**Option B: Reset Consumer Group to Earlier Checkpoint (If Data is Critical)**

```bash
# Reset to checkpoint 1 hour ago
CHECKPOINT_TIME=$(($(date +%s) - 3600)) * 1000

kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor \
  --reset-offsets \
  --to-datetime $CHECKPOINT_TIME \
  --topic conversation-events,call-metrics,prospect-updates \
  --execute

# Verify reset
kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor \
  --describe
```

**Option C: Scale Consumer Horizontally (If Throughput Issue)**

```bash
# Increase consumer parallelism
docker-compose scale llamadas-processor=3

# Wait for rebalancing
sleep 60

# Verify balanced partition assignment
kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor \
  --describe | grep -v "GROUP\|TOPIC"
```

**Option D: Clean Up Stale Messages (If Disk Full)**

```bash
# Check retention policy
kafka-configs.sh --bootstrap-server kafka-broker-1:9092 \
  --entity-type topics \
  --entity-name conversation-events \
  --describe

# Reduce retention if needed (CAUTION: data loss)
kafka-configs.sh --bootstrap-server kafka-broker-1:9092 \
  --entity-type topics \
  --entity-name conversation-events \
  --alter \
  --add-config retention.ms=86400000  # 24 hours instead of 7 days

# Force log compaction/cleanup
kafka-log-cleaner-tools.sh --bootstrap-server kafka-broker-1:9092
```

### 3.4 Consumer Group Reset Strategies

```bash
#!/bin/bash
# CAREFUL: Choose appropriate reset strategy based on impact

BOOTSTRAP_SERVER="kafka-broker-1:9092"
CONSUMER_GROUP="llamadas-processor"

reset_strategy=$1  # latest, earliest, checkpoint, datetime

case $reset_strategy in
  # Option 1: Skip all backlog (LOSE DATA)
  latest)
    echo "Resetting to latest offset (skipping backlog)..."
    kafka-consumer-groups.sh --bootstrap-server $BOOTSTRAP_SERVER \
      --group $CONSUMER_GROUP \
      --reset-offsets --to-latest --execute
    ;;

  # Option 2: Process everything from beginning (LONG RECOVERY)
  earliest)
    echo "Resetting to earliest offset (long processing)..."
    kafka-consumer-groups.sh --bootstrap-server $BOOTSTRAP_SERVER \
      --group $CONSUMER_GROUP \
      --reset-offsets --to-earliest --execute
    ;;

  # Option 3: Use saved checkpoint
  checkpoint)
    CHECKPOINT_OFFSET=<SAVED_OFFSET>
    echo "Resetting to checkpoint offset $CHECKPOINT_OFFSET..."
    kafka-consumer-groups.sh --bootstrap-server $BOOTSTRAP_SERVER \
      --group $CONSUMER_GROUP \
      --reset-offsets --to-offset $CHECKPOINT_OFFSET --execute
    ;;

  # Option 4: Reset to time-based offset
  datetime)
    RESET_TIME="2026-06-22T00:00:00"
    kafka-consumer-groups.sh --bootstrap-server $BOOTSTRAP_SERVER \
      --group $CONSUMER_GROUP \
      --reset-offsets --to-datetime "$RESET_TIME" --execute
    ;;
esac
```

### 3.5 Logs to Inspect

**Kafka Broker Logs:**

```bash
docker logs kafka-broker-1 --tail=100 | grep -E "ERROR|WARN|UnderReplicatedPartitions"

# Check for rebalancing issues
grep -i "rebalancing\|join\|sync" /var/kafka/logs/server.log | tail -20
```

**Consumer Logs:**

```bash
docker logs llamadas-processor --tail=100 | grep -E "offset|lag|poll|rebalance"

# Monitor consumption rate
docker logs llamadas-processor --tail=50 | grep -E "messages processed|throughput"
```

### 3.6 Prevention & Monitoring

**Prometheus Alerts:**

```yaml
- alert: KafkaConsumerLagCritical
  expr: kafka_consumer_group_lag > 10000
  for: 5m
  annotations:
    summary: "Kafka consumer lag {{ $value }} messages"
    action: "Check consumer health and topic throughput"

- alert: KafkaBrokerDiskSpace
  expr: kafka_broker_disk_usage_bytes > 900_000_000_000  # 900GB of 1TB
  for: 10m
  annotations:
    summary: "Kafka broker {{ $labels.broker }} disk usage high"

- alert: KafkaConsumerRebalancing
  expr: rate(kafka_consumer_group_rebalance_count[5m]) > 0.5
  for: 5m
  annotations:
    summary: "Excessive consumer group rebalancing"
```

**Consumer Lag Dashboard Query (Prometheus):**

```promql
# Current lag by consumer group
kafka_consumer_group_lag{group="llamadas-processor"}

# Rate of lag increase
rate(kafka_consumer_group_lag[5m])

# Time to catch up (estimated)
kafka_consumer_group_lag / rate(kafka_offset[5m])
```

---

## Scenario 4: Database Performance Degrading

**Severity:** P1 (Critical) — All data operations blocked  
**Impact:** API latency increases, timeouts, transaction rollbacks  
**Detection:** Alert fires when `db_query_latency_p99` > 5s OR `db_connection_wait_time` > 1s  
**MTTR Target:** 20 minutes

### 4.1 Quick Diagnosis (First 2 minutes)

```bash
# Check database connectivity
psql -h postgres-primary -U app_user -d crm_db -c "SELECT 1;" && echo "✓ DB OK" || echo "✗ DB FAILED"

# Monitor active connections
psql -h postgres-primary -U app_user -d crm_db -c "SELECT count(*) FROM pg_stat_activity;"

# Quick health check
psql -h postgres-primary -U app_user -d crm_db -c "SELECT database, as_of_wal_lsn, synced FROM pg_stat_replication;" | head -5

# Check slow query log
tail -f /var/log/postgresql/slow_query.log | head -20
```

### 4.2 Root Cause Analysis

**Check 1: Long-Running Queries**

```sql
-- Find currently running slow queries
SELECT 
  pid,
  usename,
  application_name,
  state,
  query,
  EXTRACT(EPOCH FROM (NOW() - query_start)) as runtime_secs
FROM pg_stat_activity
WHERE state != 'idle' AND query_start < NOW() - INTERVAL '5 seconds'
ORDER BY query_start ASC;

-- Check for locks (blocking queries)
SELECT 
  blocked_locks.pid AS blocked_pid,
  blocked_activity.usename AS blocked_user,
  blocking_locks.pid AS blocking_pid,
  blocking_activity.usename AS blocking_user,
  blocked_activity.query AS blocked_statement,
  blocking_activity.query AS blocking_statement
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
JOIN pg_catalog.pg_locks blocking_locks ON blocking_locks.locktype = blocked_locks.locktype
  AND blocking_locks.database IS NOT DISTINCT FROM blocked_locks.database
  AND blocking_locks.relation IS NOT DISTINCT FROM blocked_locks.relation
  AND blocking_locks.page IS NOT DISTINCT FROM blocked_locks.page
  AND blocking_locks.tuple IS NOT DISTINCT FROM blocked_locks.tuple
  AND blocking_locks.virtualxid IS NOT DISTINCT FROM blocked_locks.virtualxid
  AND blocking_locks.transactionid IS NOT DISTINCT FROM blocked_locks.transactionid
  AND blocking_locks.classid IS NOT DISTINCT FROM blocked_locks.classid
  AND blocking_locks.objid IS NOT DISTINCT FROM blocked_locks.objid
  AND blocking_locks.objsubid IS NOT DISTINCT FROM blocked_locks.objsubid
  AND blocking_locks.pid != blocked_locks.pid
JOIN pg_catalog.pg_stat_activity blocking_activity ON blocking_activity.pid = blocking_locks.pid
WHERE NOT blocked_locks.granted;

-- Identify missing indexes
SELECT 
  schemaname,
  tablename,
  attname,
  n_distinct,
  correlation
FROM pg_stats
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
  AND correlation < 0.1  -- Weak correlation = poor index candidate
ORDER BY abs(correlation) ASC
LIMIT 20;
```

**Check 2: Table Bloat & Vacuuming**

```sql
-- Check for table bloat
SELECT 
  schemaname,
  tablename,
  round(100.0 * (CASE WHEN otta > 0 THEN sml.relpages - otta::float ELSE 0 END) / sml.relpages) AS table_waste_ratio
FROM (
  SELECT
    schemaname,
    tablename,
    pg_relation_size(schemaname || '.' || tablename) / 8192 AS relpages,
    CEIL((cc + ma + (SELECT 4 + avg_width FROM pg_stats WHERE schemaname = t.schemaname AND tablename = t.tablename LIMIT 1) * na) / 8192) AS otta
  FROM pg_tables t
  CROSS JOIN (VALUES (24, 4), (28, 4), (32, 4)) AS constants(cc, ma)
) sml
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY table_waste_ratio DESC
LIMIT 20;

-- Check when tables were last vacuumed
SELECT 
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum,
  EXTRACT(EPOCH FROM (NOW() - last_autovacuum)) / 3600 AS hours_since_autovac
FROM pg_stat_user_tables
WHERE last_autovacuum IS NOT NULL
ORDER BY last_autovacuum DESC
LIMIT 20;

-- Current autovacuum status
SELECT 
  schemaname,
  relname,
  last_vacuum,
  last_autovacuum,
  vacuum_count,
  autovacuum_count,
  CASE WHEN vacuum_count + autovacuum_count = 0 THEN 'NEVER VACUUMED' ELSE 'OK' END
FROM pg_stat_user_tables
ORDER BY vacuum_count + autovacuum_count ASC
LIMIT 20;
```

**Check 3: Cache Hit Ratio & Memory**

```sql
-- Check cache hit ratio (should be > 99%)
SELECT 
  sum(heap_blks_read) as heap_read,
  sum(heap_blks_hit)  as heap_hit,
  sum(heap_blks_hit) / (sum(heap_blks_hit) + sum(heap_blks_read)) as ratio
FROM pg_statio_user_tables;

-- Check index cache efficiency
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read,
  idx_tup_fetch,
  CASE 
    WHEN idx_tup_read = 0 THEN 'UNUSED'
    ELSE round(100.0 * idx_tup_fetch / idx_tup_read, 2) || '%'
  END as efficiency
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC
LIMIT 20;

-- Memory configuration
SELECT name, setting, unit FROM pg_settings WHERE name IN ('shared_buffers', 'effective_cache_size', 'work_mem');
```

**Check 4: Replication Lag**

```sql
-- Check replica lag (if using streaming replication)
SELECT 
  client_addr,
  usename,
  application_name,
  state,
  backend_start,
  backend_xmin,
  write_lsn,
  flush_lsn,
  replay_lsn,
  write_lag,
  flush_lag,
  replay_lag
FROM pg_stat_replication;
```

### 4.3 Remediation Steps

**Option A: Rebuild Critical Indexes (Fastest Recovery)**

```bash
# Identify problematic tables from query analysis
SLOW_TABLE="deals"

psql -h postgres-primary -U app_user -d crm_db << 'EOF'
-- Step 1: Analyze table to update statistics
ANALYZE deals;

-- Step 2: Reindex critical indexes (CONCURRENT to minimize locks)
REINDEX INDEX CONCURRENTLY idx_deals_prospect_id;
REINDEX INDEX CONCURRENTLY idx_deals_probability;
REINDEX INDEX CONCURRENTLY idx_deals_status;

-- Step 3: Verify index health
SELECT 
  indexname, 
  idx_scan, 
  idx_tup_read, 
  idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename = 'deals'
ORDER BY idx_scan DESC;
EOF

# Monitor progress
watch "psql -h postgres-primary -U app_user -d crm_db -c \"SELECT schemaname, indexname, idx_scan FROM pg_stat_user_indexes WHERE tablename = 'deals' ORDER BY idx_scan DESC LIMIT 5;\""
```

**Option B: Vacuum & Cleanup (Reclaim Space)**

```bash
# Full maintenance on slowest table
psql -h postgres-primary -U app_user -d crm_db << 'EOF'
-- Full vacuum (locks table, but most thorough)
-- Only if table is small or during maintenance window
-- VACUUM FULL deals;

-- OR: Incremental vacuum (doesn't lock, faster)
VACUUM ANALYZE deals;

-- Check progress
SELECT pg_size_pretty(pg_total_relation_size('deals'));
EOF
```

**Option C: Kill Long-Running Transactions**

```bash
# WARNING: Only if confirmed blocking other queries
psql -h postgres-primary -U app_user -d crm_db << 'EOF'
-- Identify blocking PID
SELECT 
  blocked_locks.pid AS blocked_pid
FROM pg_catalog.pg_locks blocked_locks
JOIN pg_catalog.pg_stat_activity blocked_activity ON blocked_activity.pid = blocked_locks.pid
WHERE NOT blocked_locks.granted
LIMIT 1;

-- Kill the blocking query (replace PID)
SELECT pg_terminate_backend(12345);
EOF
```

**Option D: Analyze Query Plan (Optimize Slow Queries)**

```sql
-- Use EXPLAIN ANALYZE on slow query
EXPLAIN (ANALYZE, BUFFERS) 
SELECT * FROM deals 
WHERE prospect_id IN (SELECT id FROM prospects WHERE status = 'active')
AND probability > 0.5
LIMIT 100;

-- Look for:
-- - Sequential scans (Seq Scan) → Add index
-- - High actual rows vs estimated → Update table statistics
-- - High buffer I/O (Buffers: ...) → Cache efficiency issue
```

**Option E: Failover to Replica (If Primary is Corrupted)**

```bash
# Last resort: switch to read replica
curl -X POST http://llamadas-backend:8000/admin/failover \
  -H "Authorization: Bearer ${ADMIN_TOKEN}" \
  -d '{
    "target_replica": "postgres-replica-1",
    "reason": "Primary degraded",
    "require_data_sync": true
  }'

# Monitor failover
watch 'psql -h postgres-replica-1 -U app_user -d crm_db -c "SELECT 1;"'
```

### 4.4 Index Rebuild Procedure

```bash
#!/bin/bash
# Safe index rebuild with zero downtime

set -e
DB_HOST="postgres-primary"
DB_NAME="crm_db"
DB_USER="app_user"

# Critical indexes to rebuild
INDEXES=(
  "idx_deals_prospect_id"
  "idx_deals_probability"
  "idx_deals_status"
  "idx_prospects_email"
  "idx_suscripciones_cliente_id"
)

echo "Starting concurrent index rebuild..."

for idx in "${INDEXES[@]}"; do
  echo "Rebuilding $idx..."
  psql -h $DB_HOST -U $DB_USER -d $DB_NAME << EOF
    REINDEX INDEX CONCURRENTLY $idx;
EOF
  sleep 5
done

echo "Index rebuild complete. Verifying..."
psql -h $DB_HOST -U $DB_USER -d $DB_NAME << 'EOF'
SELECT 
  indexname, 
  idx_scan, 
  idx_tup_read
FROM pg_stat_user_indexes
WHERE indexname IN ('idx_deals_prospect_id', 'idx_deals_probability', 'idx_deals_status')
ORDER BY idx_scan DESC;
EOF
```

### 4.5 Logs to Inspect

**PostgreSQL Logs:**

```bash
# Real-time slow query tracking
tail -f /var/log/postgresql/slow_query.log | grep -E "duration:|ERROR"

# Check for deadlocks
grep -i "deadlock" /var/log/postgresql/postgresql.log | tail -20

# Vacuum progress
grep -i "vacuum\|analyze" /var/log/postgresql/postgresql.log | tail -20
```

**Application Connection Logs:**

```bash
# Monitor connection pool status
docker exec llamadas-backend python -c "
import psycopg2.pool
pool = psycopg2.pool.SimpleConnectionPool(...)
print(f'Available: {pool._available}')
print(f'Used: {pool._used}')
"
```

### 4.6 Prevention & Monitoring

**Prometheus Alerts:**

```yaml
- alert: PostgreSQLSlowQueryP99
  expr: pg_query_latency_seconds{quantile="0.99"} > 5
  for: 5m
  annotations:
    summary: "DB query P99 latency {{ $value }}s"

- alert: PostgreSQLTableBloat
  expr: pg_table_bloat_ratio > 0.3
  for: 30m
  annotations:
    summary: "Table {{ $labels.table }} is {{ $value | humanizePercentage }} bloated"

- alert: PostgreSQLCacheHitRatioLow
  expr: pg_cache_hit_ratio < 0.99
  for: 30m
  annotations:
    summary: "Cache hit ratio {{ $value | humanizePercentage }}"

- alert: PostgreSQLReplicationLag
  expr: pg_replication_lag_bytes > 100_000_000
  for: 10m
  annotations:
    summary: "Replica lag {{ $value | humanize }} bytes"
```

**Continuous Index Monitoring:**

```sql
-- Run monthly to identify unused indexes
CREATE OR REPLACE FUNCTION check_unused_indexes() AS $$
  SELECT 
    schemaname,
    tablename,
    indexname,
    idx_scan,
    pg_size_pretty(pg_relation_size(indexrelname)) as size
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
    AND indexname NOT LIKE 'pg_toast%'
  ORDER BY pg_relation_size(indexrelname) DESC;
$$ LANGUAGE SQL;
```

---

## Scenario 5: Emergency Rollback

**Severity:** P1 (Critical) — Full service degradation  
**Impact:** Functionality unavailable, data inconsistency  
**Detection:** Manual trigger after deployment incident  
**MTTR Target:** 5 minutes

### 5.1 Pre-Rollback Checklist

**BEFORE Rolling Back:**

```bash
#!/bin/bash
# Mandatory pre-rollback verification

echo "=== PRE-ROLLBACK CHECKLIST ==="

# 1. Document incident details
echo "1. Recording incident details..."
INCIDENT_ID="INC-$(date +%Y%m%d-%H%M%S)"
echo "Incident ID: $INCIDENT_ID"
echo "Current version: $(git rev-parse --short HEAD)"
echo "Previous stable version: $(git log --oneline | head -5 | tail -1 | cut -d' ' -f1)"

# 2. Identify which component failed
echo "2. Identifying failed component..."
docker ps --format "table {{.Names}}\t{{.Status}}" | grep -E "llamadas|backend"

# 3. Check database integrity (BEFORE rollback)
echo "3. Verifying database state..."
psql -h postgres-primary -U app_user -d crm_db << 'EOF'
  SELECT 
    tablename, 
    n_live_tup, 
    n_dead_tup,
    last_vacuum
  FROM pg_stat_user_tables 
  ORDER BY n_live_tup DESC 
  LIMIT 5;
EOF

# 4. Backup current database state
echo "4. Creating emergency backup..."
pg_dump -h postgres-primary -U app_user crm_db | \
  gzip > "/backups/emergency-$(date +%Y%m%d-%H%M%S).sql.gz"

# 5. Get current deployment info
echo "5. Recording current deployment..."
docker images | grep -E "llamadas|backend" >> "$INCIDENT_ID-images.txt"
git log --oneline -10 >> "$INCIDENT_ID-commits.txt"

echo "✓ Pre-rollback checklist complete"
```

### 5.2 Scenario A: Rollback Code (Application Layer)

**If issue is in backend code:**

```bash
#!/bin/bash
set -e

echo "=== APPLICATION CODE ROLLBACK ==="

# Step 1: Identify good version
CURRENT_VERSION=$(git rev-parse --short HEAD)
PREVIOUS_VERSION=$(git log --oneline | head -2 | tail -1 | cut -d' ' -f1)

echo "Current: $CURRENT_VERSION"
echo "Target rollback: $PREVIOUS_VERSION"

# Step 2: Checkout previous version
git checkout $PREVIOUS_VERSION

# Step 3: Rebuild container
docker-compose build llamadas-backend

# Step 4: Restart service (rolling restart)
docker-compose up -d --no-deps llamadas-backend

# Step 5: Health check
echo "Waiting for service recovery..."
for i in {1..30}; do
  if curl -s http://llamadas-backend:8000/health > /dev/null 2>&1; then
    echo "✓ Service healthy after $i seconds"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 1
done

# Step 6: Verify data consistency
psql -h postgres-primary -U app_user -d crm_db << 'EOF'
  SELECT COUNT(*) as total_deals FROM deals;
  SELECT COUNT(*) as total_prospects FROM prospects;
EOF

echo "✓ Rollback complete"
```

### 5.3 Scenario B: Rollback Migration (Database Schema)

**If issue is in database schema:**

```bash
#!/bin/bash
set -e

echo "=== DATABASE MIGRATION ROLLBACK ==="

# Step 1: Identify applied migrations
cd /app/backend
npx prisma migrate status  # Or alembic current for Python

# Step 2: Show migration history
git log --oneline -- prisma/migrations/ | head -10

# Step 3: Determine which migration to revert
echo "Last applied migration:"
ls -lt prisma/migrations/ | head -1

# Step 4: BACKUP database (CRITICAL)
pg_dump -h postgres-primary -U app_user crm_db > \
  "/backups/pre-rollback-$(date +%Y%m%d-%H%M%S).sql"

echo "✓ Database backup saved"

# Step 5: Revert migration
# Option A: Using Prisma (TypeScript/Node.js backend)
npx prisma migrate resolve --rolled-back <migration_name>

# Option B: Using raw SQL (for critical manual rollback)
psql -h postgres-primary -U app_user -d crm_db << 'EOF'
  -- Identify the migration that caused issues
  -- For example, if migration added a NOT NULL column without default:
  
  -- 1. Drop the problematic constraint
  ALTER TABLE deals DROP CONSTRAINT deals_new_field_not_null;
  
  -- 2. Or revert the entire column
  ALTER TABLE deals DROP COLUMN new_field_that_broke_writes;
  
  -- 3. Verify integrity
  SELECT * FROM information_schema.columns 
  WHERE table_name = 'deals' 
  LIMIT 10;
EOF

# Step 6: Verify rollback
psql -h postgres-primary -U app_user -d crm_db -c \
  "SELECT column_name FROM information_schema.columns WHERE table_name = 'deals';"

echo "✓ Migration rollback complete"
```

### 5.4 Scenario C: Rollback ML Model (Model Layer)

**If accuracy degraded due to bad model:**

```bash
#!/bin/bash
set -e

echo "=== ML MODEL ROLLBACK ==="

# Step 1: List available model versions
curl -s http://ml-inference:5000/models/list | jq '.models | sort_by(.version_date) | reverse | .[0:5]'

# Step 2: Get current model
CURRENT_MODEL=$(curl -s http://ml-inference:5000/model/info | jq -r '.current_version')
echo "Current model: $CURRENT_MODEL"

# Step 3: Identify stable previous model
STABLE_MODEL="deal_probability_v2.5"  # Replace with known good version

# Step 4: Switch models
curl -X POST http://ml-inference:5000/model/switch \
  -H "Content-Type: application/json" \
  -d "{
    \"model_name\": \"$STABLE_MODEL\",
    \"reason\": \"Emergency rollback: accuracy degradation\",
    \"timestamp\": \"$(date -Iseconds)\"
  }"

# Step 5: Verify switch
curl -s http://ml-inference:5000/model/info | jq '.current_version'

# Step 6: Warm up model (load into memory)
curl -X POST http://ml-inference:5000/model/warmup

echo "✓ Model rollback complete"
```

### 5.5 Scenario D: Rollback Infrastructure (Kubernetes/Docker)

**If deployment issue (container, orchestration):**

```bash
#!/bin/bash
set -e

echo "=== INFRASTRUCTURE ROLLBACK ==="

# Step 1: Get previous deployment
kubectl rollout history deployment/llamadas-backend -n production
# OR
docker-compose config | grep "image:" | head -10

# Step 2: Identify last stable revision
LAST_STABLE=7  # From rollout history

# Step 3: Trigger rollback
kubectl rollout undo deployment/llamadas-backend -n production --to-revision=$LAST_STABLE

# Step 4: Monitor rollback
kubectl rollout status deployment/llamadas-backend -n production

# Step 5: Verify new pods
kubectl get pods -n production -l app=llamadas-backend

# Step 6: Check logs
kubectl logs -n production -l app=llamadas-backend --tail=50

echo "✓ Infrastructure rollback complete"
```

### 5.6 Complete Rollback Playbook

```bash
#!/bin/bash
# Multi-layer rollback: prioritize data integrity

set -e
ROLLBACK_ID="ROLLBACK-$(date +%Y%m%d-%H%M%S)"

echo "=== EMERGENCY ROLLBACK INITIATED: $ROLLBACK_ID ==="

# PHASE 1: STABILIZE (Stop the bleeding)
echo "PHASE 1: Stopping broken service..."
docker-compose pause llamadas-backend || true
sleep 5

# PHASE 2: BACKUP (Protect data)
echo "PHASE 2: Backing up current state..."
pg_dump -h postgres-primary -U app_user crm_db | \
  gzip > "/backups/$ROLLBACK_ID-db.sql.gz"
docker-compose config > "/backups/$ROLLBACK_ID-docker.yml"

# PHASE 3: REVERT (Restore to last known good)
echo "PHASE 3: Reverting to stable version..."

# 3a. Revert code
git log --oneline | head -2
STABLE_COMMIT="$(git log --oneline | grep -i 'stable\|release' | head -1 | cut -d' ' -f1 || git log --oneline | head -2 | tail -1 | cut -d' ' -f1)"
git checkout $STABLE_COMMIT
docker-compose build llamadas-backend

# 3b. Revert DB if needed
# (Uncomment if migration caused issue)
# npx prisma migrate resolve --rolled-back <recent_migration>

# PHASE 4: RESTART (Bring service back online)
echo "PHASE 4: Restarting services..."
docker-compose unpause llamadas-backend || true
docker-compose up -d --no-deps llamadas-backend

# PHASE 5: VERIFY (Confirm recovery)
echo "PHASE 5: Verifying system health..."
sleep 10

for i in {1..30}; do
  if curl -s http://llamadas-backend:8000/health | jq '.status' | grep -q "healthy"; then
    echo "✓ Service healthy"
    break
  fi
  echo "  Waiting... ($i/30)"
  sleep 1
done

# Verify data integrity
echo "Data integrity check:"
psql -h postgres-primary -U app_user -d crm_db << 'EOF'
  SELECT 
    'deals' as table_name,
    COUNT(*) as rows,
    MAX(updated_at) as last_update
  FROM deals
  UNION ALL
  SELECT 'prospects', COUNT(*), MAX(updated_at) FROM prospects;
EOF

echo "✓ ROLLBACK COMPLETE - $ROLLBACK_ID"
echo "  Save logs: docker logs llamadas-backend > $ROLLBACK_ID-logs.txt"
```

### 5.7 Reverse Migration Commands

```sql
-- Generic migration reversal (adjust per schema)

-- If migration added column:
ALTER TABLE deals DROP COLUMN IF EXISTS new_field;

-- If migration added constraint:
ALTER TABLE deals DROP CONSTRAINT IF EXISTS deals_new_constraint;

-- If migration created index:
DROP INDEX IF EXISTS idx_new_index;

-- If migration created table:
DROP TABLE IF EXISTS new_table;

-- If migration altered column type (TRICKY):
-- You may need to:
-- 1. Add column with original type
ALTER TABLE deals ADD COLUMN old_field_temp TEXT;
-- 2. Copy data back
UPDATE deals SET old_field_temp = CAST(new_field AS TEXT);
-- 3. Drop new column
ALTER TABLE deals DROP COLUMN new_field;
-- 4. Rename temp column
ALTER TABLE deals RENAME COLUMN old_field_temp TO old_field;

-- Always verify after revert:
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'deals' ORDER BY ordinal_position;
```

### 5.8 Logs to Inspect

**Rollback Validation Logs:**

```bash
# Application logs post-rollback
docker logs llamadas-backend --since 5m | tail -50

# Database connection validation
psql -h postgres-primary -U app_user -d crm_db -c \
  "SELECT * FROM pg_stat_activity LIMIT 10;"

# Verify no orphaned transactions
psql -h postgres-primary -U app_user -d crm_db -c \
  "SELECT pg_cancel_backend(pid) FROM pg_stat_activity \
   WHERE datname = 'crm_db' AND state = 'idle in transaction';"
```

### 5.9 Post-Rollback Procedures

```bash
#!/bin/bash
# After rollback, perform cleanup

echo "=== POST-ROLLBACK CLEANUP ==="

# 1. Vacuum database (reclaim space from reverted changes)
psql -h postgres-primary -U app_user -d crm_db << 'EOF'
  VACUUM ANALYZE deals;
  VACUUM ANALYZE prospects;
EOF

# 2. Clear application caches
redis-cli -h redis-primary FLUSHDB  # WARNING: Only if you know impact

# 3. Verify replication is caught up
psql -h postgres-primary -U app_user -d crm_db -c \
  "SELECT client_addr, state, replay_lag FROM pg_stat_replication;"

# 4. Enable monitoring/alerts (if disabled during incident)
curl -X POST http://alertmanager:9093/api/v1/alerts/ROLLBACK_COMPLETE

# 5. Create incident report
cat > "incident-$ROLLBACK_ID.md" << 'REPORT'
## Incident Report: Emergency Rollback

**ID:** $ROLLBACK_ID
**Start:** $(date)
**Duration:** X minutes
**Impact:** Service degradation/unavailability

### Root Cause
[To be filled after analysis]

### Actions Taken
1. Service stopped
2. Database backed up
3. Code reverted to commit [X]
4. Service restarted

### Verification
- [x] Service healthy
- [x] Database connectivity verified
- [x] Data integrity confirmed

### Follow-up
- [ ] Root cause analysis
- [ ] Implement safeguards to prevent recurrence
- [ ] Add regression tests
REPORT

echo "✓ Post-rollback cleanup complete"
```

---

## Quick Reference: Common Commands

### Database Operations

```bash
# PostgreSQL Connection
psql -h postgres-primary -U app_user -d crm_db

# Backup database
pg_dump -h postgres-primary -U app_user crm_db | gzip > backup.sql.gz

# Restore database
gunzip < backup.sql.gz | psql -h postgres-primary -U app_user -d crm_db

# Identify slow queries
SELECT * FROM pg_stat_statements ORDER BY mean_exec_time DESC LIMIT 10;
```

### Kafka Operations

```bash
# Consumer group status
kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor --describe

# Reset offsets
kafka-consumer-groups.sh --bootstrap-server kafka-broker-1:9092 \
  --group llamadas-processor --reset-offsets --to-latest --execute

# Monitor topic
kafka-console-consumer.sh --bootstrap-server kafka-broker-1:9092 \
  --topic conversation-events --from-beginning
```

### Docker Operations

```bash
# View service logs
docker logs llamadas-backend --tail=100 -f

# Restart service
docker-compose restart llamadas-backend

# Execute command in container
docker exec llamadas-backend python /app/diagnostic.py

# Inspect resource usage
docker stats llamadas-backend
```

### ML Model Operations

```bash
# Check current model
curl -s http://ml-inference:5000/model/info | jq .

# Trigger retraining
curl -X POST http://ml-inference:5000/retrain \
  -d '{"data_period": "7_days"}'

# Switch models
curl -X POST http://ml-inference:5000/model/switch \
  -d '{"model_name": "deal_probability_v2.5"}'
```

---

## Escalation Paths

### Escalation Hierarchy

```
LEVEL 1: On-Call Engineer
├─ Responsibility: Initial diagnosis (< 15 min)
├─ Tools: Dashboards, logs, basic queries
└─ Escalate if: Cannot isolate root cause within 15 min

LEVEL 2: Senior Backend Engineer
├─ Responsibility: Root cause analysis & remediation (15-45 min)
├─ Tools: Full database/infrastructure access
├─ Escalation criteria:
│  - Deal probability outage > 10 min
│  - Database performance P99 > 10s
│  - Kafka lag > 50k messages
└─ Escalate if: Cannot resolve within 30 min OR unknown root cause

LEVEL 3: DevOps/Infrastructure Lead
├─ Responsibility: Infrastructure incident (45+ min)
├─ Tools: Full Kubernetes, VM access, disaster recovery
├─ Escalation criteria:
│  - Database failure/corruption
│  - Kafka cluster down
│  - Storage/network exhaustion
│  - Multiple service failures
└─ Escalate if: Requires infrastructure changes, failover, or rollback

LEVEL 4: VP Engineering / CTO
├─ Responsibility: Strategic decisions (> 1 hour incident)
├─ Escalation criteria:
│  - Production fully down
│  - Data loss or corruption
│  - Service unavailable > 30 min
│  - Requires public notification
└─ Decision: Rollback vs. continue fixing, customer communication
```

### Contact Information

```yaml
On-Call Engineer:
  Primary: slack://on-call-rotation-channel
  Backup: phone://+1-XXX-XXX-XXXX
  Escalate: @engineering-lead on Slack

Senior Backend Engineer:
  Slack: @backend-lead
  Email: backend-lead@company.com
  Phone: +1-XXX-XXX-XXXX

DevOps/Infrastructure:
  Slack: @devops-oncall
  Email: devops@company.com
  Phone: +1-XXX-XXX-XXXX

Management Escalation:
  VP Engineering: vp-eng@company.com
  CTO: cto@company.com
```

### Incident Communication Template

```markdown
## Incident Alert

**Severity:** P1 / P2 / P3  
**Service:** [Service Name]  
**Status:** INVESTIGATING / MITIGATION IN PROGRESS / RESOLVED

### Impact
- [ ] Revenue flow affected
- [ ] Customer-facing features down
- [ ] Data integrity risk
- [ ] Performance degraded (specify metric)

### Timeline
- [Time]: Incident detected - [Symptom]
- [Time]: Root cause identified - [Cause]
- [Time]: Mitigation started - [Action]
- [Time]: Resolved - [Final state]

### Resolution
- Action taken: [What was done]
- Time to resolution: X minutes
- Data loss: None / [Details]

### Follow-up
- RCA required: Yes / No
- Monitoring improvements: [List]
- Tests to add: [List]
```

---

## Appendix: Monitoring Dashboard Queries

### Prometheus Queries

```promql
# Deal probability freshness (how old is the data)
max(time() - deal_probability_last_update_timestamp)

# Model inference latency
histogram_quantile(0.99, rate(ml_inference_latency_ms[5m]))

# Kafka consumer lag
sum(kafka_consumer_group_lag) by (group)

# Database query latency
histogram_quantile(0.99, rate(db_query_duration_seconds[5m]))

# Application error rate
rate(app_errors_total[5m])
```

### Grafana Dashboard Panels

```json
{
  "title": "Production Incident Dashboard",
  "panels": [
    {
      "title": "Deal Probability Update Latency",
      "targets": [{"expr": "deal_probability_update_latency_ms"}]
    },
    {
      "title": "Model F1 Score",
      "targets": [{"expr": "model_f1_score"}]
    },
    {
      "title": "Kafka Consumer Lag",
      "targets": [{"expr": "kafka_consumer_group_lag{group='llamadas-processor'}"}]
    },
    {
      "title": "Database Connection Pool",
      "targets": [{"expr": "db_connection_pool_available"}]
    },
    {
      "title": "Error Rate",
      "targets": [{"expr": "rate(app_errors_total[5m])"}]
    }
  ]
}
```

---

**Last Updated:** 2026-06-22  
**Version:** 1.0  
**Maintained by:** DevOps / SRE Team  
**Review Cycle:** Quarterly or after major incidents
