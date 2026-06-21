# Analytics Layer - FAQ & Troubleshooting Guide

---

## FREQUENTLY ASKED QUESTIONS

### Architecture & Design

**Q: Why use a Star Schema instead of keeping our normalized Prisma schema?**

A: Star schema is optimized for analytics (queries that aggregate millions of rows). Normalized schemas are optimized for transactional updates (fast inserts/deletes). You can't optimize for both simultaneously. Key differences:

| Scenario | Star Schema | Normalized |
|----------|-------------|-----------|
| Query: "Total revenue by agent in 30 days" | 100ms | 5000ms (joins 8 tables) |
| Insert new deal | 500ms | 50ms |
| Update prospect phone | 100ms | 50ms |

For analytics, Star Schema wins by 50x. We keep normalized Prisma for OLTP (operational transactions).

**Q: Do we need both PostgreSQL + Redis + Snowflake? That seems like overkill.**

A: Each serves a specific purpose:

1. **PostgreSQL**: Transactional data (OLTP) + hot analytics facts
   - Handles: real-time webhooks, deal updates
   - Query latency: 10-100ms
   - Retention: 90 days (then archive)

2. **Redis**: Feature serving (online predictions)
   - Handles: dashboard data, API responses
   - Query latency: 1-5ms
   - Retention: 1 hour (cache)

3. **Snowflake**: Long-term analytics (OLAP) + archival
   - Handles: historical analysis, model training
   - Query latency: 1-10s (okay for reports, not dashboards)
   - Retention: 2 years

**Minimum viable setup:** PostgreSQL + Redis (no Snowflake initially). Upgrade to Snowflake at Month 4 if volume exceeds 1TB.

**Q: Why not use BigQuery instead of Snowflake?**

A: Both work! BigQuery is cheaper for variable loads, Snowflake is better if you have steady-state analytics workloads. For this project:
- Start with PostgreSQL (you already have it)
- If you outgrow (> 1TB/year), choose BigQuery or Snowflake based on:
  - **BigQuery:** cheaper if you query sporadically
  - **Snowflake:** better if you query continuously

---

### Data & Governance

**Q: How do we handle PII (personally identifiable information) in analytics?**

A: Multi-layer approach:

1. **Source**: Supabase stores full PII (name, email, phone)
2. **Warehouse (PostgreSQL)**: Stores PII in `dim_prospects`, all PII columns indexed for search
3. **GDPR Compliance**: On RTBF request:
   - Soft-delete prospect record
   - Null out PII columns
   - Keep anonymized facts (e.g., "prospect #12345 made 5 calls" without names)
4. **Archive**: Immutable compliance log (7 years, encrypted)

Rule of thumb:
- **Data Engineer:** can see all PII
- **Analyst:** sees PII (for debugging)
- **Sales Manager:** sees PII (for outreach)
- **Unauthenticated API:** never sees PII

**Q: How long do we keep call recordings?**

A: Retention policy:
- **Compliant recording:** 30 days in hot storage (PostgreSQL)
- **After 30 days:** Move to S3 Glacier (cheap, cold storage)
- **After 7 years:** Delete (GDPR legal hold expired)

Automation: Cron job deletes old recordings every day at 11 PM.

**Q: Can I export analytics data to Excel/Google Sheets?**

A: Yes, via API:

```bash
# Get this month's forecast
curl https://api.company.com/analytics/forecast/groomly?scenario=BASE \
  -H "Authorization: Bearer YOUR_TOKEN" \
  | jq '.scenarios' > forecast.json

# Export script (Python)
import pandas as pd
df = pd.read_json('forecast.json')
df.to_excel('forecast.xlsx')
```

Or: Build integration with Google Sheets (native Looker integration coming Month 5).

**Q: How do we audit who accessed what data?**

A: Audit logging table (`audit_log`):

```sql
-- Who accessed Agent leaderboard in last 24h?
SELECT user_id, action, timestamp 
FROM audit_log 
WHERE action = 'VIEW_AGENT_LEADERBOARD' 
  AND timestamp >= NOW() - INTERVAL '1 day'
```

Every dashboard view logs: user_id, dashboard_name, timestamp, filters applied.

---

### Forecast & Predictions

**Q: Why is the forecast off by 20% in Month 1?**

A: Forecast models need data to calibrate. Expected accuracy ramp:

```
Month 1: ±25% accuracy (baseline model)
Month 2: ±20% accuracy (tuning)
Month 3: ±15% accuracy (target)
Month 6: ±10% accuracy (optimized)
```

Causes of variance:
- **External shocks** (market downturn, competitor launch)
- **Seasonal patterns** (summer slump, Q4 push)
- **Deal flow variance** (won 3 mega-deals unexpectedly)
- **Probability model underfit** (need more historical data)

Mitigation:
- Review top 5 variance causes monthly
- Adjust probability thresholds per stage if needed
- Include external signals (market events, competitor activity)

**Q: Can we forecast by geographic region or product vertical?**

A: Yes, the schema supports it:

```sql
-- Forecast by product vertical
SELECT 
  p.product_vertical,
  SUM(fs.expected_revenue_usd) as revenue_forecast
FROM fact_forecast_snapshots fs
JOIN dim_products p ON fs.fk_product_id = p.product_id
WHERE fs.scenario = 'BASE'
GROUP BY p.product_vertical
```

Adjust grain (by product_vertical, by region, by agent_team, etc) in the forecast calculation query.

**Q: What if we have strong seasonality (e.g., 80% revenue in Q4)?**

A: Seasonal model enhancement (Month 5):
1. Add `seasonal_factor` column to forecast table
2. Calculate: seasonal_factor = avg(Q_i_revenue) / annual_avg_revenue
3. Apply: forecast = base_forecast * seasonal_factor[quarter]
4. Validate: historical forecast accuracy improves

Example:
```
Q1 seasonal factor: 0.8 (slower)
Q2 seasonal factor: 0.9 (medium)
Q3 seasonal factor: 0.7 (slowest)
Q4 seasonal factor: 1.6 (strong)
```

---

### Performance & Scaling

**Q: What happens when we hit 1 million calls a day? Will the system slow down?**

A: Expected performance at scale:

```
Scale         Calls/day   Query P95 Latency   Cost/month
------        ----------  ------------------  -----------
Current       10k         50ms                $2k
Growth        100k        150ms               $5k (add indexes)
Scale         1M          500ms               $15k (add Snowflake, archive)
Enterprise    10M         2s (via Snowflake)  $40k (distributed system)
```

At 1M calls/day, we'd need to:
1. Archive PostgreSQL daily facts to Snowflake
2. Run aggregations in Snowflake (parallel processing)
3. Keep only 30 days hot data in PostgreSQL
4. Use data partitioning (monthly tables)

This is handled in Phase 3 (Month 5-6). Current design handles 10x growth without changes.

**Q: Redis is filling up with cached data. How do we manage memory?**

A: Redis memory management:

1. **TTL Policy:** All cached features expire after 1 hour
2. **LRU Eviction:** If Redis hits 80% memory, evict least-recently-used keys
3. **Monitoring:** Alert if memory > 85%
4. **Scaling:** Add Redis node if memory consistently high

Commands to monitor:
```bash
redis-cli INFO memory          # See memory usage
redis-cli --bigkeys           # Find large keys eating memory
redis-cli MEMORY DOCTOR       # Get optimization tips
```

Expected memory usage:
- 1000 prospects * 5KB features = 5MB
- 100 deals * 3KB features = 300KB
- 50 agents * 2KB features = 100KB
- **Total: ~6MB** (very small, room for growth)

---

### Dashboards & APIs

**Q: Why is the agent leaderboard showing different numbers than Salesforce?**

A: Common causes:

1. **Grain mismatch:** Salesforce counts "touches" differently
   - We count: unique agents who worked a deal
   - Salesforce: all activity entries

2. **Date range:** Check your filter
   - Dashboard default: "last 30 days"
   - Salesforce default: "last quarter"

3. **Deal status:** We count "touched" deals (any stage), not just closed
   - Salesforce: may only count "Closed Won"

**Fix:** Add date range picker to dashboard, show grain definition:
```
Definition: win_rate_30d = # deals won / # deals any agent touched
  (includes: PROSPECT, DEMO, NEGOTIATION → WON deals only)
Period: Last 30 calendar days
Last updated: [timestamp]
```

**Q: Can I get forecast data via API programmatically?**

A: Yes, GET endpoint:

```bash
curl -X GET \
  https://api.company.com/analytics/forecast/groomly \
  -H "Authorization: Bearer YOUR_API_TOKEN" \
  -H "Accept: application/json" \
  -d '{
    "scenario": "BASE",
    "months": 3,
    "include_confidence_intervals": true
  }' \
  > forecast.json
```

Response:
```json
{
  "forecast_month": "2026-07",
  "scenarios": {
    "BEST": 500000,
    "BASE": 350000,
    "WORST": 150000
  },
  "confidence_intervals": {
    "low": 250000,
    "high": 450000
  },
  "forecast_accuracy_previous_month": 0.92,
  "generated_at": "2026-06-21T02:00:00Z"
}
```

---

## TROUBLESHOOTING GUIDE

### Issue: "Dashboard shows no data"

**Diagnosis:**
```sql
-- Check if fact tables have data
SELECT COUNT(*) as call_count FROM fact_call_interactions;
SELECT COUNT(*) as deal_count FROM dim_deals;
SELECT COUNT(*) as metric_count FROM fact_daily_metrics;
```

**Common causes & fixes:**

1. **Webhooks not flowing**
   - [ ] Check webhook receiver logs: `tail -f /var/log/webhooks.log`
   - [ ] Verify webhook URLs are correct (Settings → Webhooks)
   - [ ] Test manually: `curl -X POST http://localhost:3000/webhooks/twilio-call -d '...'`

2. **Date mismatch**
   - [ ] Your filter might be: "future date range" or "before data started"
   - [ ] Default filter: "last 30 days" – if no data in last 30 days, show empty

3. **Join keys missing**
   - [ ] Check: prospect_id in facts matches dim_prospects
   - [ ] Run: `SELECT COUNT(*) FROM fact_call_interactions WHERE fk_prospect_id IS NULL` (should be 0)

4. **ETL job failed**
   - [ ] Check job logs: `SELECT * FROM airflow_logs WHERE dag_id = 'calculate_daily_metrics' ORDER BY timestamp DESC LIMIT 10`
   - [ ] Verify cron job ran: `tail -f /var/log/cron.log | grep calculate_daily_metrics`

---

### Issue: "Forecast is way off (>50% error)"

**Diagnosis:**
```sql
-- Compare forecast vs actual for last month
SELECT 
  forecast_month,
  SUM(expected_revenue_usd) as forecasted,
  (SELECT SUM(deal_amount_usd) FROM dim_deals WHERE deal_result = 'WON' 
   AND DATE_TRUNC('month', deal_actual_close_date) = DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
  ) as actual,
  ROUND(100 * (actual - forecasted) / forecasted, 2) as variance_pct
FROM fact_forecast_snapshots
WHERE forecast_month = TO_CHAR(CURRENT_DATE - INTERVAL '1 month', 'YYYY-MM')
GROUP BY forecast_month;
```

**Common causes:**

1. **Probability thresholds wrong**
   - Symptom: "We forecast 10 deals closing but only 2 actually close"
   - Fix: Review probability per stage
   - Query: `SELECT stage_name, default_probability_pct FROM dim_revenue_stages`
   - Action: Adjust if stage probability doesn't match reality

2. **New product launch** (external signal)
   - Symptom: "Forecast for product X was 50k but we did 200k"
   - Fix: Add external signal tracking (market launch, PR campaign)
   - Future: Build model with marketing spend signal

3. **Sales spree** (data quality)
   - Symptom: "5 mega-deals closed unexpectedly, forecast missed"
   - Check: Are large deals correctly staged before close?
   - Fix: Ensure deals move through stages (not skip directly to WON)

4. **Stale probability weights**
   - Symptom: "Forecast gradually drifting away"
   - Fix: Recalibrate probability per stage monthly
   - Query: `SELECT stage, COUNT(*) as deals, ROUND(100.0 * SUM(CASE WHEN deal_result = 'WON' THEN 1 ELSE 0 END) / COUNT(*), 1) as actual_win_rate FROM dim_deals GROUP BY stage`

---

### Issue: "Agent complains their leaderboard ranking is unfair"

**Diagnosis:**
1. **Verify data freshness:**
   ```sql
   SELECT MAX(call_started_at) FROM fact_call_interactions WHERE fk_agent_id = :agent_id;
   ```
   If not recent (within 1 hour), features are stale.

2. **Check calculations:**
   ```sql
   -- Manual win rate calculation for Agent X
   SELECT 
     a.agent_name,
     COUNT(DISTINCT dm.fk_deal_id) as total_deals,
     SUM(CASE WHEN dm.to_stage = 'WON' THEN 1 ELSE 0 END) as won_deals,
     ROUND(100 * SUM(CASE WHEN dm.to_stage = 'WON' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*), 2) as win_rate_pct
   FROM fact_deal_movements dm
   JOIN dim_agents a ON dm.fk_agent_id = a.agent_id
   WHERE dm.fk_agent_id = :agent_id
     AND dm.movement_timestamp >= CURRENT_DATE - INTERVAL '30 days'
   GROUP BY a.agent_name;
   ```

3. **Explain scoring:**
   - Metric composite_score = (quality_score * 0.4) + (win_rate * 0.6)
   - Weights: 60% win rate (results matter), 40% quality (process matters)
   - If agent disagrees, you can adjust weights per team

---

### Issue: "Real-time metrics in Redis are stale"

**Diagnosis:**
```bash
# Check when Redis features were last updated
redis-cli GET prospect:{prospect_id}:features:last_updated

# Expected: within 1 hour
# If older, Redis refresh job failed
```

**Causes & fixes:**

1. **Feature calculation job didn't run**
   - [ ] Check Airflow logs: `SELECT * FROM airflow_logs WHERE task_id = 'refresh_feature_store' ORDER BY timestamp DESC LIMIT 1`
   - [ ] Verify cron job: `crontab -l | grep refresh_feature_store`
   - [ ] Manual fix: `python scripts/refresh_feature_store.py`

2. **Redis connection broken**
   - [ ] Test: `redis-cli ping` (should respond PONG)
   - [ ] Check: connection pooling status
   - [ ] Restart: `systemctl restart redis`

3. **Feature store too large**
   - [ ] Monitor: `redis-cli INFO memory`
   - [ ] If memory > 80%, eviction is happening
   - [ ] Scale: add Redis node

---

### Issue: "GDPR Right-to-be-Forgotten taking too long"

**Diagnosis:**
```sql
-- Check if RTBF procedure is hanging
SELECT 
  prospect_id,
  right_to_be_forgotten_requested,
  updated_at
FROM dim_prospects
WHERE right_to_be_forgotten_requested = TRUE
ORDER BY updated_at DESC
LIMIT 1;

-- Should show updated_at from < 5 minutes ago
```

**If slow (> 5 minutes):**

1. **Database locks**
   - Check: `SELECT * FROM pg_locks WHERE NOT granted;` (show waiting locks)
   - Fix: Kill long-running transactions: `SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = 'active' AND query_start < NOW() - INTERVAL '5 minutes'`

2. **Large data volume**
   - Prospect has 10M rows in fact tables
   - Query: `SELECT COUNT(*) FROM fact_call_interactions WHERE fk_prospect_id = :prospect_id;`
   - Fix: Run RTBF in background job (async), don't block user

3. **Cascade delete failing**
   - Foreign key constraints preventing deletion
   - Fix: Ensure ON DELETE CASCADE is configured on all FK relationships

---

### Issue: "Query latency P95 is 5 seconds (should be <1 second)"

**Diagnosis:**
```sql
-- Find slow queries
SELECT 
  query,
  calls,
  mean_time,
  max_time
FROM pg_stat_statements
ORDER BY mean_time DESC
LIMIT 10;

-- Example output:
-- "SELECT ... FROM fact_call_interactions JOIN dim_prospects ..." | 1000 | 5000ms | 12000ms
```

**Common causes & fixes:**

1. **Missing index**
   - Symptom: `mean_time = 5000ms` on join query
   - Fix: Add index `CREATE INDEX ON fact_call_interactions (fk_prospect_id);`
   - Test: Query should drop to <100ms

2. **Full table scan**
   - Symptom: Query touches millions of rows
   - Fix: Add WHERE clause to filter before joining
   - Example: Add date range filter `WHERE call_started_at >= CURRENT_DATE - INTERVAL '30 days'`

3. **Materialized view stale**
   - Symptom: Dashboard query slow, but view exists
   - Fix: Refresh view: `REFRESH MATERIALIZED VIEW v_agent_leaderboard;`
   - Automate: Cron job refreshes every hour

4. **Database stats outdated**
   - Fix: `ANALYZE fact_call_interactions;` (updates stats for query planner)

---

### Issue: "Feature store sync failed, Redis out of sync with DB"

**Diagnosis:**
```bash
# Check last successful sync
redis-cli GET feature_store:last_sync_timestamp
# Should be within 1 hour

# Compare Redis vs Database
# Prospect should have same features in both
redis-cli GET prospect:123:features
psql -c "SELECT * FROM feature_store_cache WHERE prospect_id = 123"
```

**Recovery:**
```bash
# Full resync (takes ~5 minutes)
python scripts/resync_feature_store.py --full

# Or: Clear Redis and rebuild
redis-cli FLUSHALL
python scripts/rebuild_feature_store.py
```

---

### Issue: "Can't delete a prospect (GDPR request), getting FK error"

**Error message:**
```
ERROR: update or delete on table "dim_prospects" violates foreign key constraint "fk_prospect" on table "fact_call_interactions"
```

**Fix:**

Option 1: Use GDPR procedure (recommended)
```sql
CALL gdpr_right_to_be_forgotten('prospect@email.com');
-- This handles all cascades
```

Option 2: Manual cascade (if FK constraint issue)
```sql
BEGIN;

-- 1. Null out prospect references in facts
UPDATE fact_call_interactions SET fk_prospect_id = NULL WHERE fk_prospect_id = :prospect_id;
UPDATE fact_email_campaigns SET fk_prospect_id = NULL WHERE fk_prospect_id = :prospect_id;

-- 2. Soft-delete prospect
UPDATE dim_prospects SET is_active = FALSE, right_to_be_forgotten_requested = TRUE WHERE prospect_id = :prospect_id;

-- 3. Archive to compliance log
INSERT INTO gdpr_archive (prospect_id, requested_at, completed_at) VALUES (:prospect_id, NOW(), NOW());

COMMIT;
```

---

## PERFORMANCE TUNING CHECKLIST

**Weekly:**
- [ ] Run `ANALYZE` on all fact tables
- [ ] Check slow queries (> 1s): `SELECT * FROM pg_stat_statements ORDER BY mean_time DESC LIMIT 10`
- [ ] Monitor Redis memory: `redis-cli INFO memory | grep used_memory_human`

**Monthly:**
- [ ] Review query plans for hot queries
- [ ] Check index usage: `SELECT * FROM pg_stat_user_indexes WHERE idx_scan = 0` (unused indexes)
- [ ] Forecast accuracy review: are probability thresholds still accurate?

**Quarterly:**
- [ ] Cardinality review: how many rows in each table? (for Snowflake migration decision)
- [ ] Performance regression test: compare P95 latency vs 3 months ago
- [ ] Cost optimization: unused features, over-provisioned infrastructure

---

## SUPPORT & ESCALATION

**For issues:**
1. Check this troubleshooting guide first
2. Search Slack: #analytics-support
3. File issue: https://jira.company.com/browse/DATA
4. Page on-call: #analytics-oncall-rotation (for P1 issues)

**P1 Issues (page on-call):**
- [ ] Dashboard completely down
- [ ] Real-time facts not flowing (> 1 hour delay)
- [ ] Forecast model broken
- [ ] Data quality check failures (>10% anomalies)

**P2 Issues (ASAP, business hours):**
- [ ] Dashboard slow (>3 second load)
- [ ] Single view failing
- [ ] Feature store stale (1-4 hours old)

**P3 Issues (normal queue):**
- [ ] Documentation needed
- [ ] New metric request
- [ ] Performance optimization (not urgent)

---

**Last updated:** 2026-06-21
**Maintained by:** Data Engineering Team
