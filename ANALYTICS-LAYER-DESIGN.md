# Analytics Layer Design para Revenue AI
**Data Engineer Specification | 6-Month Roadmap**

---

## EXECUTIVE SUMMARY

Este documento diseña una analytics layer completa que transforma datos brutos de:
- Supabase (leads, deals, activities)
- Redis (cache, real-time metrics)
- Twilio (call metadata)
- SendGrid (email events)
- Gemini API (conversational insights)

En un Data Warehouse analítico que:
1. Detecta patrones de revenue (win/loss analysis)
2. Genera forecasts con accuracy tracking
3. Benchmarks de agentes
4. GDPR-compliant governance

---

# PARTE 1: DATA WAREHOUSE SCHEMA (STAR SCHEMA)

## 1.1 Grain Levels (Múltiples)

```
FACT TABLES (Events/Metrics):
├─ fact_call_interactions (by call, grain: CALL)
├─ fact_email_campaigns (by email, grain: EMAIL)
├─ fact_deal_movements (by stage change, grain: DEAL_MOVEMENT)
├─ fact_daily_metrics (by day/software, grain: DAILY)
└─ fact_forecast_snapshots (by day/stage/scenario, grain: FORECAST)

DIMENSION TABLES:
├─ dim_prospects (prospect profile)
├─ dim_deals (deal details)
├─ dim_agents (agent performance profile)
├─ dim_products (software/plan info)
├─ dim_dates (calendar)
├─ dim_geography (location-based)
├─ dim_revenue_stages (sales funnel stages)
└─ dim_quality_scores (conversation quality buckets)
```

## 1.2 Fact Tables Detail

### FACT_CALL_INTERACTIONS (Grain: by call)

**Purpose:** Captura cada interacción de llamada con contexto completo

```sql
CREATE TABLE fact_call_interactions (
  -- Keys
  call_interaction_id BIGINT PRIMARY KEY,
  fk_prospect_id UUID NOT NULL,
  fk_agent_id INT NOT NULL,
  fk_deal_id UUID,
  fk_date_id INT NOT NULL,  -- fecha de llamada
  fk_product_id VARCHAR(50) NOT NULL,
  
  -- Measures (Hechos)
  call_duration_seconds INT NOT NULL DEFAULT 0,
  call_direction VARCHAR(10) NOT NULL,  -- INBOUND/OUTBOUND
  talk_time_seconds INT DEFAULT 0,
  hold_time_seconds INT DEFAULT 0,
  silence_time_seconds INT DEFAULT 0,
  
  -- Call Quality (Gemini analyzed)
  ai_conversation_quality_score DECIMAL(3,2),  -- 0.0 to 1.0
  ai_objection_handling_count INT DEFAULT 0,
  ai_value_proposition_mentions INT DEFAULT 0,
  ai_discovery_questions INT DEFAULT 0,
  
  -- Outcomes
  call_outcome VARCHAR(50),  -- CONNECTED, VOICEMAIL, DECLINED, BUSY, etc
  prospect_objections JSON,  -- [objection_type, timestamp, resolution]
  next_step_created BOOLEAN DEFAULT FALSE,
  demo_scheduled BOOLEAN DEFAULT FALSE,
  
  -- Recording & Transcription
  recording_available BOOLEAN,
  transcription_available BOOLEAN,
  transcription_summary TEXT,
  
  -- Temporal
  call_started_at TIMESTAMP NOT NULL,
  call_ended_at TIMESTAMP NOT NULL,
  recorded_at TIMESTAMP,
  
  -- Audit
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_prospect FOREIGN KEY (fk_prospect_id) 
    REFERENCES dim_prospects(prospect_id),
  CONSTRAINT fk_agent FOREIGN KEY (fk_agent_id) 
    REFERENCES dim_agents(agent_id),
  CONSTRAINT fk_deal FOREIGN KEY (fk_deal_id) 
    REFERENCES dim_deals(deal_id),
  CONSTRAINT fk_date FOREIGN KEY (fk_date_id) 
    REFERENCES dim_dates(date_id),
  CONSTRAINT fk_product FOREIGN KEY (fk_product_id) 
    REFERENCES dim_products(product_id),
  
  INDEX idx_prospect_date (fk_prospect_id, fk_date_id),
  INDEX idx_agent_date (fk_agent_id, fk_date_id),
  INDEX idx_deal (fk_deal_id),
  INDEX idx_product_date (fk_product_id, fk_date_id),
  INDEX idx_quality_score (ai_conversation_quality_score DESC),
  INDEX idx_call_started (call_started_at DESC)
);
```

### FACT_EMAIL_CAMPAIGNS (Grain: by email sent)

```sql
CREATE TABLE fact_email_campaigns (
  -- Keys
  email_event_id BIGINT PRIMARY KEY,
  fk_prospect_id UUID NOT NULL,
  fk_campaign_id VARCHAR(50) NOT NULL,
  fk_sender_id VARCHAR(50) NOT NULL,
  fk_date_id INT NOT NULL,
  fk_product_id VARCHAR(50) NOT NULL,
  
  -- Measures
  email_type VARCHAR(50) NOT NULL,  -- OUTREACH, FOLLOWUP, NURTURE, etc
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  unsubscribe_flag BOOLEAN DEFAULT FALSE,
  bounce_flag BOOLEAN DEFAULT FALSE,
  
  -- A/B Test
  ab_variant VARCHAR(10),  -- A, B, C
  ab_test_id VARCHAR(50),
  
  -- Temporal
  sent_at TIMESTAMP NOT NULL,
  first_opened_at TIMESTAMP,
  last_interacted_at TIMESTAMP,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_prospect FOREIGN KEY (fk_prospect_id) 
    REFERENCES dim_prospects(prospect_id),
  CONSTRAINT fk_campaign FOREIGN KEY (fk_campaign_id) 
    REFERENCES dim_campaigns(campaign_id),
  
  INDEX idx_prospect_date (fk_prospect_id, fk_date_id),
  INDEX idx_campaign_date (fk_campaign_id, fk_date_id),
  INDEX idx_type_date (email_type, fk_date_id),
  INDEX idx_sent_at (sent_at DESC)
);
```

### FACT_DEAL_MOVEMENTS (Grain: by stage transition)

```sql
CREATE TABLE fact_deal_movements (
  -- Keys
  movement_id BIGINT PRIMARY KEY,
  fk_deal_id UUID NOT NULL,
  fk_prospect_id UUID NOT NULL,
  fk_agent_id INT NOT NULL,
  fk_date_id INT NOT NULL,  -- date of movement
  fk_product_id VARCHAR(50) NOT NULL,
  
  -- Movement details
  from_stage VARCHAR(50) NOT NULL,
  to_stage VARCHAR(50) NOT NULL,
  
  -- Deal metrics at time of movement
  deal_amount_usd DECIMAL(12,2),
  probability_score_before INT,
  probability_score_after INT,
  health_score_before INT,
  health_score_after INT,
  
  -- Time in previous stage
  days_in_prev_stage INT,
  
  -- Reason for movement
  movement_reason VARCHAR(500),
  triggered_by_activity_type VARCHAR(50),  -- CALL, EMAIL, MEETING, etc
  
  -- Temporal
  movement_timestamp TIMESTAMP NOT NULL,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_deal FOREIGN KEY (fk_deal_id) 
    REFERENCES dim_deals(deal_id),
  CONSTRAINT fk_prospect FOREIGN KEY (fk_prospect_id) 
    REFERENCES dim_prospects(prospect_id),
  CONSTRAINT fk_agent FOREIGN KEY (fk_agent_id) 
    REFERENCES dim_agents(agent_id),
  
  INDEX idx_deal_date (fk_deal_id, fk_date_id),
  INDEX idx_prospect_date (fk_prospect_id, fk_date_id),
  INDEX idx_agent_date (fk_agent_id, fk_date_id),
  INDEX idx_stages (from_stage, to_stage),
  INDEX idx_movement_ts (movement_timestamp DESC)
);
```

### FACT_DAILY_METRICS (Grain: by day/software)

```sql
CREATE TABLE fact_daily_metrics (
  -- Keys
  daily_metric_id BIGINT PRIMARY KEY,
  fk_date_id INT NOT NULL,
  fk_product_id VARCHAR(50) NOT NULL,
  
  -- Call metrics
  total_calls_made INT DEFAULT 0,
  total_calls_connected INT DEFAULT 0,
  avg_call_duration_seconds DECIMAL(8,2),
  avg_conversation_quality DECIMAL(3,2),
  
  -- Email metrics
  emails_sent INT DEFAULT 0,
  emails_opened INT DEFAULT 0,
  emails_clicked INT DEFAULT 0,
  email_open_rate DECIMAL(5,2),
  email_click_rate DECIMAL(5,2),
  
  -- Pipeline
  deals_created INT DEFAULT 0,
  deals_progressed INT DEFAULT 0,
  deals_lost INT DEFAULT 0,
  deals_won INT DEFAULT 0,
  
  -- Revenue
  revenue_won_usd DECIMAL(14,2) DEFAULT 0,
  revenue_pipeline_usd DECIMAL(14,2) DEFAULT 0,
  arr_change_usd DECIMAL(14,2),
  
  -- Forecast
  expected_revenue_usd DECIMAL(14,2) DEFAULT 0,
  forecast_confidence DECIMAL(3,2),
  
  -- Quality
  avg_prospect_health_score DECIMAL(5,2),
  at_risk_deals INT DEFAULT 0,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_date FOREIGN KEY (fk_date_id) 
    REFERENCES dim_dates(date_id),
  CONSTRAINT fk_product FOREIGN KEY (fk_product_id) 
    REFERENCES dim_products(product_id),
  
  UNIQUE KEY unique_date_product (fk_date_id, fk_product_id),
  INDEX idx_date (fk_date_id DESC),
  INDEX idx_product_date (fk_product_id, fk_date_id)
);
```

### FACT_FORECAST_SNAPSHOTS (Grain: daily snapshot by stage/scenario)

```sql
CREATE TABLE fact_forecast_snapshots (
  -- Keys
  forecast_snapshot_id BIGINT PRIMARY KEY,
  fk_date_id INT NOT NULL,  -- date of forecast
  fk_product_id VARCHAR(50) NOT NULL,
  fk_revenue_stage_id INT NOT NULL,
  
  -- Scenario
  scenario VARCHAR(20) NOT NULL,  -- BEST, BASE, WORST
  
  -- Forecast metrics
  total_deals_in_stage INT NOT NULL,
  total_deal_value_usd DECIMAL(14,2),
  avg_deal_value_usd DECIMAL(12,2),
  weighted_probability DECIMAL(5,2),  -- avg probability
  
  -- Weighted revenue
  expected_revenue_usd DECIMAL(14,2),
  confidence_interval_low DECIMAL(14,2),
  confidence_interval_high DECIMAL(14,2),
  
  -- Forecast accuracy tracking
  forecast_month VARCHAR(7),  -- YYYY-MM
  actual_realized_revenue DECIMAL(14,2),
  revenue_variance_pct DECIMAL(5,2),
  forecast_accuracy_score DECIMAL(3,2),
  
  -- Metadata
  forecast_generated_at TIMESTAMP NOT NULL,
  forecast_method VARCHAR(50),  -- PROBABILITY_WEIGHTED, ML_MODEL, etc
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_date FOREIGN KEY (fk_date_id) 
    REFERENCES dim_dates(date_id),
  CONSTRAINT fk_product FOREIGN KEY (fk_product_id) 
    REFERENCES dim_products(product_id),
  CONSTRAINT fk_stage FOREIGN KEY (fk_revenue_stage_id) 
    REFERENCES dim_revenue_stages(stage_id),
  
  INDEX idx_date_product_stage (fk_date_id DESC, fk_product_id, fk_revenue_stage_id),
  INDEX idx_product_month (fk_product_id, forecast_month),
  INDEX idx_accuracy (forecast_accuracy_score DESC)
);
```

## 1.3 Dimension Tables

### DIM_PROSPECTS

```sql
CREATE TABLE dim_prospects (
  prospect_id UUID PRIMARY KEY,
  prospect_name VARCHAR(500),
  prospect_company VARCHAR(500),
  prospect_email VARCHAR(255) NOT NULL,
  prospect_phone VARCHAR(20),
  prospect_country VARCHAR(100),
  prospect_city VARCHAR(100),
  
  -- Scoring
  prospect_icp_match_score DECIMAL(3,2),
  prospect_engagement_tier VARCHAR(20),  -- HOT, WARM, COLD
  prospect_industry VARCHAR(100),
  prospect_revenue_band VARCHAR(50),  -- <1M, 1M-10M, etc
  
  -- Behavioral
  days_in_db INT,
  previous_interactions INT,
  opted_in_date TIMESTAMP,
  last_contacted_date TIMESTAMP,
  
  -- GDPR
  gdpr_consent_level VARCHAR(50),  -- FULL, EMAIL_ONLY, NONE
  right_to_be_forgotten_requested BOOLEAN DEFAULT FALSE,
  dpo_contact_info VARCHAR(255),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_email (prospect_email),
  INDEX idx_company (prospect_company),
  INDEX idx_country (prospect_country),
  INDEX idx_engagement (prospect_engagement_tier),
  INDEX idx_icp_score (prospect_icp_match_score DESC)
);
```

### DIM_DEALS

```sql
CREATE TABLE dim_deals (
  deal_id UUID PRIMARY KEY,
  prospect_id UUID NOT NULL,
  agent_id INT NOT NULL,
  product_id VARCHAR(50) NOT NULL,
  
  deal_name VARCHAR(500),
  deal_description TEXT,
  deal_amount_usd DECIMAL(12,2),
  deal_currency VARCHAR(3),
  
  current_stage VARCHAR(50),
  days_in_db INT,
  
  -- Probability
  current_probability_score INT,
  
  -- Temporal
  deal_created_date TIMESTAMP,
  deal_expected_close_date TIMESTAMP,
  deal_actual_close_date TIMESTAMP,
  days_to_close INT,
  
  -- Outcome
  deal_result VARCHAR(20),  -- WON, LOST, NULL (open)
  loss_reason VARCHAR(500),
  
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT fk_prospect FOREIGN KEY (prospect_id) 
    REFERENCES dim_prospects(prospect_id),
  CONSTRAINT fk_agent FOREIGN KEY (agent_id) 
    REFERENCES dim_agents(agent_id),
  
  INDEX idx_prospect (prospect_id),
  INDEX idx_agent (agent_id),
  INDEX idx_stage (current_stage),
  INDEX idx_result (deal_result),
  INDEX idx_product (product_id),
  INDEX idx_close_date (deal_expected_close_date)
);
```

### DIM_AGENTS

```sql
CREATE TABLE dim_agents (
  agent_id INT PRIMARY KEY,
  agent_name VARCHAR(255) NOT NULL,
  agent_email VARCHAR(255) UNIQUE,
  agent_team VARCHAR(100),
  agent_role VARCHAR(100),  -- SDR, AE, etc
  
  -- Capability
  languages VARCHAR(255),  -- JSON array
  certifications VARCHAR(255),
  experience_years INT,
  
  -- Performance Profile
  avg_calls_per_day DECIMAL(6,2),
  avg_call_quality_score DECIMAL(3,2),
  avg_deal_cycle_days INT,
  win_rate_pct DECIMAL(5,2),
  
  -- Territory
  assigned_countries VARCHAR(255),
  assigned_industries VARCHAR(255),
  
  is_active BOOLEAN DEFAULT TRUE,
  hire_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_team (agent_team),
  INDEX idx_role (agent_role),
  INDEX idx_win_rate (win_rate_pct DESC),
  INDEX idx_quality (avg_call_quality_score DESC)
);
```

### DIM_PRODUCTS

```sql
CREATE TABLE dim_products (
  product_id VARCHAR(50) PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  product_slug VARCHAR(100) UNIQUE,
  product_category VARCHAR(100),
  product_vertical VARCHAR(100),  -- peluquería canina, dentista, etc
  
  -- Pricing
  base_price_monthly_usd DECIMAL(12,2),
  base_price_annual_usd DECIMAL(12,2),
  currency_default VARCHAR(3),
  
  -- Market
  target_market_country VARCHAR(100),
  target_market_size_prospect_count INT,
  
  is_active BOOLEAN DEFAULT TRUE,
  launched_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE KEY unique_slug (product_slug),
  INDEX idx_category (product_category),
  INDEX idx_vertical (product_vertical)
);
```

### DIM_DATES

```sql
CREATE TABLE dim_dates (
  date_id INT PRIMARY KEY,  -- YYYYMMDD
  calendar_date DATE UNIQUE NOT NULL,
  
  -- Granularity
  year_number INT,
  quarter_number INT,
  month_number INT,
  month_name VARCHAR(20),
  week_number INT,
  day_of_week INT,
  day_name VARCHAR(10),
  
  -- Flags
  is_weekday BOOLEAN,
  is_holiday BOOLEAN DEFAULT FALSE,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### DIM_REVENUE_STAGES

```sql
CREATE TABLE dim_revenue_stages (
  stage_id INT PRIMARY KEY,
  stage_code VARCHAR(50) UNIQUE,
  stage_name VARCHAR(100),
  stage_order INT,  -- secuencia en el funnel
  
  -- Default probability
  default_probability_pct INT,
  
  -- Characteristics
  stage_description TEXT,
  typical_days_in_stage INT,
  
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

---

# PARTE 2: FEATURE STORE SPECIFICATION

## 2.1 Feature Calculation Strategy

### Recency Windows

```
TEMPORAL AGGREGATIONS:
├─ Last 1 Day (Recent activity signal)
├─ Last 7 Days (Weekly patterns)
├─ Last 30 Days (Monthly trends)
├─ Last 90 Days (Quarterly performance)
├─ All-time (Lifetime value)
└─ Rolling Averages (30d, 60d, 90d)

PROSPECT FEATURES:
├─ Engagement Features:
│  ├─ calls_in_7d, calls_in_30d, calls_all_time
│  ├─ emails_opened_in_7d, click_rate_7d
│  ├─ days_since_last_contact
│  └─ contact_frequency_per_week
│
├─ Deal Features:
│  ├─ deals_in_pipeline, deals_won, deals_lost
│  ├─ avg_deal_amount, total_pipeline_value
│  ├─ deal_cycle_days_avg, stage_progression_velocity
│  └─ probability_score (current and trending)
│
├─ Quality Features:
│  ├─ conversation_quality_avg_7d
│  ├─ objection_handling_score
│  ├─ discovery_questions_per_call
│  └─ value_prop_mentions_ratio
│
└─ Firmographic Features:
   ├─ company_size, industry, location
   ├─ icp_match_score
   └─ employee_growth_rate
```

## 2.2 Feature Store Implementation

### Online Feature Store (Redis)

```yaml
---
Feature Store: Redis Cluster
Purpose: Real-time serving for dashboards, API endpoints
TTL: 1 hour (hourly refresh from warehouse)

Key Structure: prospect:{prospect_id}:features
Data Format: JSON

Example:
{
  "prospect_id": "uuid-123",
  "engagement_tier": "HOT",
  "calls_7d": 3,
  "calls_30d": 12,
  "emails_opened_7d": 2,
  "click_rate_7d": 0.15,
  "days_since_contact": 2,
  "current_deal_stage": "DEMO_SCHEDULED",
  "deal_amount": 15000,
  "probability_score": 65,
  "conversation_quality_avg_7d": 0.82,
  "icp_match_score": 0.91,
  "updated_at": "2026-06-21T10:00:00Z"
}

Refresh Pipeline:
├─ Cron job: Every 1 hour
├─ Query: dim_prospects + fact_call_interactions + fact_deal_movements
└─ Post to Redis: SET prospect:{id}:features {json}
```

### Batch Feature Store (Snowflake/BigQuery)

```yaml
---
Feature Store: Data Warehouse (Snowflake)
Purpose: Historical analysis, model training, audit
Retention: 2 years
Update Frequency: Daily (append-only tables)

Tables:
├─ feature_prospect_engagement_daily
│  ├─ prospect_id, date, calls_in_7d, emails_open_7d, ...
│  └─ grain: prospect x date
│
├─ feature_deal_performance_daily
│  ├─ deal_id, prospect_id, date, stage, probability, health_score, ...
│  └─ grain: deal x date
│
└─ feature_agent_metrics_daily
   ├─ agent_id, date, calls_made, call_quality_avg, win_rate, ...
   └─ grain: agent x date
```

## 2.3 Feature Definitions (SQL Recipes)

### Prospect Engagement Level (7-day)

```sql
-- Calculates engagement tier for prospects
SELECT 
  p.prospect_id,
  p.prospect_name,
  COUNT(CASE WHEN ci.call_started_at >= DATE_ADD(CURRENT_DATE, -7) 
    THEN 1 END) as calls_7d,
  COUNT(CASE WHEN ec.fk_date_id >= CAST(FORMAT(DATE_ADD(CURRENT_DATE, -7), 'YYYYMMDD') AS INT)
    THEN 1 END) as emails_received_7d,
  AVG(CASE WHEN ci.call_started_at >= DATE_ADD(CURRENT_DATE, -7)
    THEN ci.ai_conversation_quality_score ELSE NULL END) as avg_quality_7d,
  
  CASE 
    WHEN COUNT(CASE WHEN ci.call_started_at >= DATE_ADD(CURRENT_DATE, -7) 
      THEN 1 END) >= 3 THEN 'HOT'
    WHEN COUNT(CASE WHEN ci.call_started_at >= DATE_ADD(CURRENT_DATE, -7)
      THEN 1 END) >= 1 THEN 'WARM'
    ELSE 'COLD'
  END as engagement_tier
  
FROM dim_prospects p
LEFT JOIN fact_call_interactions ci ON p.prospect_id = ci.fk_prospect_id
LEFT JOIN fact_email_campaigns ec ON p.prospect_id = ec.fk_prospect_id
GROUP BY p.prospect_id, p.prospect_name
```

### Deal Velocity (stage progression speed)

```sql
-- Measures how quickly deals progress through stages
SELECT 
  d.deal_id,
  d.prospect_id,
  d.current_stage,
  DATEDIFF(DAY, d.deal_created_date, CURRENT_TIMESTAMP) as days_in_db,
  
  -- Days in current stage
  DATEDIFF(DAY, 
    (SELECT MAX(dm.movement_timestamp) 
     FROM fact_deal_movements dm 
     WHERE dm.fk_deal_id = d.deal_id 
       AND dm.to_stage = d.current_stage),
    CURRENT_TIMESTAMP
  ) as days_in_current_stage,
  
  -- Stage progression count
  (SELECT COUNT(*) 
   FROM fact_deal_movements dm 
   WHERE dm.fk_deal_id = d.deal_id
     AND dm.movement_timestamp >= DATE_ADD(CURRENT_DATE, -30)
  ) as stage_moves_30d,
  
  -- Velocity score (1-100)
  CASE 
    WHEN DATEDIFF(DAY, d.deal_created_date, CURRENT_TIMESTAMP) <= 14 THEN 100
    WHEN DATEDIFF(DAY, d.deal_created_date, CURRENT_TIMESTAMP) <= 30 THEN 75
    WHEN DATEDIFF(DAY, d.deal_created_date, CURRENT_TIMESTAMP) <= 90 THEN 50
    ELSE 25
  END as velocity_score
  
FROM dim_deals d
WHERE d.is_active = TRUE
```

### Agent Win Rate (rolling 30d)

```sql
-- Calculates agent performance metrics
SELECT 
  a.agent_id,
  a.agent_name,
  
  COUNT(DISTINCT CASE WHEN dm.to_stage = 'WON' 
    AND dm.movement_timestamp >= DATE_ADD(CURRENT_DATE, -30)
    THEN dm.fk_deal_id END) as deals_won_30d,
    
  COUNT(DISTINCT CASE WHEN dm.movement_timestamp >= DATE_ADD(CURRENT_DATE, -30)
    THEN dm.fk_deal_id END) as deals_touched_30d,
  
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage = 'WON' 
      AND dm.movement_timestamp >= DATE_ADD(CURRENT_DATE, -30)
      THEN dm.fk_deal_id END) 
    / NULLIF(COUNT(DISTINCT CASE WHEN dm.movement_timestamp >= DATE_ADD(CURRENT_DATE, -30)
      THEN dm.fk_deal_id END), 0),
    2
  ) as win_rate_pct_30d,
  
  AVG(ci.ai_conversation_quality_score) as avg_call_quality_30d,
  
  COUNT(DISTINCT ci.call_interaction_id) as calls_30d
  
FROM dim_agents a
LEFT JOIN fact_deal_movements dm ON a.agent_id = dm.fk_agent_id
LEFT JOIN fact_call_interactions ci ON a.agent_id = ci.fk_agent_id 
  AND ci.call_started_at >= DATE_ADD(CURRENT_DATE, -30)
WHERE a.is_active = TRUE
GROUP BY a.agent_id, a.agent_name
```

---

# PARTE 3: ANALYTICS QUERIES (Revenue Intelligence)

## 3.1 Win/Loss Analysis

### Query: Win/Loss by Product, Stage, Agent

```sql
SELECT 
  d.product_id,
  dp.stage_name,
  a.agent_name,
  d.deal_result,
  
  COUNT(*) as deal_count,
  SUM(d.deal_amount_usd) as total_value_usd,
  AVG(d.deal_amount_usd) as avg_deal_size_usd,
  AVG(d.days_to_close) as avg_sales_cycle_days,
  
  -- Conversion to WON from this stage
  ROUND(
    100.0 * SUM(CASE WHEN d.deal_result = 'WON' THEN 1 ELSE 0 END)
    / COUNT(*),
    2
  ) as conversion_rate_pct,
  
  -- Common loss reasons
  GROUP_CONCAT(DISTINCT d.loss_reason SEPARATOR ', ') as top_loss_reasons,
  
  -- Call activity during deal lifecycle
  AVG((SELECT COUNT(*) 
    FROM fact_call_interactions ci 
    WHERE ci.fk_deal_id = d.deal_id)) as avg_calls_per_deal,
  
  -- Email activity during deal lifecycle
  AVG((SELECT COUNT(*) 
    FROM fact_email_campaigns ec 
    WHERE ec.fk_prospect_id = d.prospect_id
      AND ec.sent_at BETWEEN d.deal_created_date AND COALESCE(d.deal_actual_close_date, CURRENT_TIMESTAMP)
  )) as avg_emails_per_deal,
  
  -- Quality indicator
  AVG((SELECT AVG(ci.ai_conversation_quality_score)
    FROM fact_call_interactions ci
    WHERE ci.fk_deal_id = d.deal_id
  )) as avg_conversation_quality

FROM dim_deals d
JOIN dim_revenue_stages dp ON d.current_stage = dp.stage_code
JOIN dim_agents a ON d.agent_id = a.agent_id
WHERE d.deal_result IN ('WON', 'LOST')
  AND d.deal_actual_close_date >= DATE_ADD(CURRENT_DATE, -90)

GROUP BY d.product_id, dp.stage_name, a.agent_name, d.deal_result

ORDER BY total_value_usd DESC
```

### Query: Lost Deal Analysis (Root Cause)

```sql
SELECT 
  d.deal_id,
  d.deal_name,
  dp.prospect_name,
  d.loss_reason,
  d.deal_amount_usd,
  d.days_to_close,
  a.agent_name,
  
  -- Activity pattern for lost deals
  (SELECT COUNT(*) FROM fact_call_interactions ci 
   WHERE ci.fk_deal_id = d.deal_id) as total_calls,
   
  (SELECT AVG(ci.ai_conversation_quality_score) FROM fact_call_interactions ci 
   WHERE ci.fk_deal_id = d.deal_id) as avg_call_quality,
   
  (SELECT COUNT(*) FROM fact_email_campaigns ec 
   WHERE ec.fk_prospect_id = d.prospect_id
     AND ec.sent_at BETWEEN d.deal_created_date AND d.deal_actual_close_date
  ) as total_emails,
  
  -- Gap analysis: what was missing?
  CASE 
    WHEN (SELECT COUNT(*) FROM fact_call_interactions ci 
          WHERE ci.fk_deal_id = d.deal_id) < 2 
      THEN 'Insufficient engagement'
    WHEN (SELECT AVG(ci.ai_conversation_quality_score) FROM fact_call_interactions ci 
          WHERE ci.fk_deal_id = d.deal_id) < 0.6 
      THEN 'Poor conversation quality'
    WHEN d.days_to_close > 60 
      THEN 'Extended sales cycle (bottleneck)'
    WHEN (SELECT COUNT(*) FROM fact_email_campaigns ec 
          WHERE ec.fk_prospect_id = d.prospect_id
            AND ec.open_count = 0) > 0 
      THEN 'No email engagement'
    ELSE 'Other'
  END as likely_root_cause

FROM dim_deals d
JOIN dim_prospects dp ON d.prospect_id = dp.prospect_id
JOIN dim_agents a ON d.agent_id = a.agent_id
WHERE d.deal_result = 'LOST'
  AND d.deal_actual_close_date >= DATE_ADD(CURRENT_DATE, -180)

ORDER BY d.deal_amount_usd DESC
```

## 3.2 Pipeline Trend Detection

### Query: Pipeline Health Scorecard

```sql
WITH deal_stages AS (
  SELECT 
    d.product_id,
    d.current_stage,
    COUNT(*) as deal_count,
    SUM(d.deal_amount_usd) as stage_value_usd,
    AVG(d.days_in_db) as avg_age_days,
    
    -- Health metrics
    AVG((SELECT AVG(ci.ai_conversation_quality_score)
      FROM fact_call_interactions ci
      WHERE ci.fk_deal_id = d.deal_id
    )) as avg_quality,
    
    SUM(CASE WHEN d.days_in_db > 120 THEN 1 ELSE 0 END) as stagnant_deals,
    
    -- Recent activity
    SUM(CASE WHEN (SELECT MAX(ci.call_started_at) 
      FROM fact_call_interactions ci
      WHERE ci.fk_deal_id = d.deal_id) >= DATE_ADD(CURRENT_DATE, -7)
      THEN 1 ELSE 0 END) as deals_with_activity_7d
    
  FROM dim_deals d
  WHERE d.is_active = TRUE
  
  GROUP BY d.product_id, d.current_stage
)

SELECT 
  ds.product_id,
  ds.current_stage,
  ds.deal_count,
  ds.stage_value_usd,
  ds.avg_age_days,
  ds.avg_quality,
  
  -- Pipeline health score (0-100)
  CASE 
    WHEN ds.avg_quality >= 0.8 AND ds.deals_with_activity_7d / ds.deal_count >= 0.7 THEN 85
    WHEN ds.avg_quality >= 0.7 AND ds.deals_with_activity_7d / ds.deal_count >= 0.5 THEN 70
    WHEN ds.avg_quality >= 0.6 THEN 55
    WHEN ds.stagnant_deals > (ds.deal_count * 0.3) THEN 35
    ELSE 50
  END as health_score,
  
  -- Risk flags
  CASE 
    WHEN ds.stagnant_deals > (ds.deal_count * 0.5) THEN 'HIGH_STAGNATION'
    WHEN ds.avg_quality < 0.6 THEN 'QUALITY_CONCERN'
    WHEN ds.deals_with_activity_7d / ds.deal_count < 0.3 THEN 'LOW_ACTIVITY'
    ELSE 'HEALTHY'
  END as risk_flag

FROM deal_stages ds

ORDER BY ds.product_id, 
  CASE ds.current_stage
    WHEN 'PROSPECT' THEN 1
    WHEN 'DEMO_SCHEDULED' THEN 2
    WHEN 'DEMO_COMPLETED' THEN 3
    WHEN 'NEGOTIATION' THEN 4
    WHEN 'CLOSING' THEN 5
  END
```

## 3.3 Forecast Accuracy Monitoring

### Query: Forecast vs. Actual (Monthly Reconciliation)

```sql
WITH monthly_forecasts AS (
  SELECT 
    fs.forecast_month,
    fs.fk_product_id,
    fs.scenario,
    SUM(fs.expected_revenue_usd) as forecasted_revenue_usd
    
  FROM fact_forecast_snapshots fs
  WHERE fs.fk_date_id = CAST(CONCAT(YEAR(CURRENT_DATE), LPAD(MONTH(CURRENT_DATE), 2, '0'), '01') AS INT)
  
  GROUP BY fs.forecast_month, fs.fk_product_id, fs.scenario
),

monthly_actuals AS (
  SELECT 
    CONCAT(YEAR(d.deal_actual_close_date), LPAD(MONTH(d.deal_actual_close_date), 2, '0')) as actual_month,
    d.product_id,
    SUM(d.deal_amount_usd) as actual_revenue_usd
    
  FROM dim_deals d
  WHERE d.deal_result = 'WON'
    AND d.deal_actual_close_date >= DATE_ADD(CURRENT_DATE, -90)
  
  GROUP BY actual_month, d.product_id
)

SELECT 
  mf.forecast_month,
  mf.fk_product_id,
  mf.scenario,
  mf.forecasted_revenue_usd,
  COALESCE(ma.actual_revenue_usd, 0) as actual_revenue_usd,
  
  ROUND(
    ((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd) 
      / NULLIF(mf.forecasted_revenue_usd, 0)) * 100,
    2
  ) as variance_pct,
  
  -- Accuracy score (how close was the forecast?)
  CASE 
    WHEN ABS(((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd) 
      / NULLIF(mf.forecasted_revenue_usd, 0))) <= 0.05 THEN 'EXCELLENT'
    WHEN ABS(((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd) 
      / NULLIF(mf.forecasted_revenue_usd, 0))) <= 0.15 THEN 'GOOD'
    WHEN ABS(((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd) 
      / NULLIF(mf.forecasted_revenue_usd, 0))) <= 0.25 THEN 'ACCEPTABLE'
    ELSE 'NEEDS_IMPROVEMENT'
  END as accuracy_grade

FROM monthly_forecasts mf
LEFT JOIN monthly_actuals ma ON mf.forecast_month = ma.actual_month 
  AND mf.fk_product_id = ma.product_id

ORDER BY mf.forecast_month DESC, variance_pct DESC
```

## 3.4 Agent Performance Benchmarking

### Query: Agent Leaderboard (Multi-metric)

```sql
SELECT 
  a.agent_id,
  a.agent_name,
  a.agent_team,
  
  -- Volume metrics
  COUNT(DISTINCT ci.call_interaction_id) as total_calls_30d,
  COUNT(DISTINCT dm.fk_deal_id) as deals_touched_30d,
  
  -- Quality metrics
  ROUND(AVG(ci.ai_conversation_quality_score), 2) as avg_call_quality,
  ROUND(AVG(ci.ai_value_proposition_mentions), 1) as avg_value_prop_mentions,
  ROUND(AVG(ci.ai_objection_handling_count), 1) as avg_objections_handled,
  
  -- Performance metrics
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage = 'WON' THEN dm.fk_deal_id END)
    / NULLIF(COUNT(DISTINCT dm.fk_deal_id), 0),
    2
  ) as win_rate_pct,
  
  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage IN ('DEMO_SCHEDULED', 'DEMO_COMPLETED') 
      THEN dm.fk_deal_id END)
    / NULLIF(COUNT(DISTINCT ci.fk_deal_id), 0),
    2
  ) as advancement_rate_pct,
  
  -- Financial impact
  SUM(CASE WHEN dm.to_stage = 'WON' THEN dm.deal_amount_usd ELSE 0 END) as revenue_generated_30d,
  
  -- Composite score
  ROUND(
    (ROUND(AVG(ci.ai_conversation_quality_score), 2) * 0.4 +  -- 40% quality
     ROUND(100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage = 'WON' THEN dm.fk_deal_id END)
           / NULLIF(COUNT(DISTINCT dm.fk_deal_id), 0), 2) / 100 * 0.6),  -- 60% win rate
    2
  ) as composite_performance_score

FROM dim_agents a
LEFT JOIN fact_call_interactions ci ON a.agent_id = ci.fk_agent_id 
  AND ci.call_started_at >= DATE_ADD(CURRENT_DATE, -30)
LEFT JOIN fact_deal_movements dm ON a.agent_id = dm.fk_agent_id
  AND dm.movement_timestamp >= DATE_ADD(CURRENT_DATE, -30)
WHERE a.is_active = TRUE

GROUP BY a.agent_id, a.agent_name, a.agent_team

ORDER BY composite_performance_score DESC
```

---

# PARTE 4: INCREMENTAL LOADING STRATEGY

## 4.1 Data Ingestion Layers

### Layer 1: Raw Ingestion (≤1 hour latency)

```yaml
Source Systems → Extract → Transform → Load (ETL)

CALL DATA:
├─ Source: Twilio/Zadarma webhooks
├─ Frequency: Real-time (streaming)
├─ Transformation:
│  ├─ Enrich with prospect_id via phone lookup
│  ├─ Call Gemini API for conversation analysis
│  └─ Calculate quality score
├─ Load Target: fact_call_interactions
└─ Idempotency: call_id based deduplication

EMAIL DATA:
├─ Source: SendGrid webhooks
├─ Frequency: Real-time
├─ Transformation:
│  ├─ Map email_id to prospect_id
│  ├─ Track open/click/bounce events
│  └─ Update rollup metrics
├─ Load Target: fact_email_campaigns
└─ Idempotency: email_id + event_type

DEAL MOVEMENTS:
├─ Source: Supabase (triggers)
├─ Frequency: Real-time
├─ Transformation:
│  ├─ Calculate days_in_previous_stage
│  ├─ Determine movement_reason
│  └─ Update health_score
├─ Load Target: fact_deal_movements
└─ Idempotency: deal_id + timestamp
```

### Layer 2: Incremental Aggregation (Hourly)

```sql
-- Upsert procedure for fact_daily_metrics
INSERT INTO fact_daily_metrics (
  fk_date_id, fk_product_id,
  total_calls_made, total_calls_connected,
  avg_call_duration_seconds, avg_conversation_quality,
  emails_sent, emails_opened, emails_clicked,
  deals_created, deals_progressed, deals_lost, deals_won,
  revenue_won_usd, revenue_pipeline_usd,
  expected_revenue_usd, forecast_confidence,
  updated_at
)
SELECT 
  CAST(FORMAT(CURRENT_DATE, 'YYYYMMDD') AS INT) as fk_date_id,
  l.product_id,
  
  COUNT(DISTINCT ci.call_interaction_id) as total_calls_made,
  SUM(CASE WHEN ci.call_outcome = 'CONNECTED' THEN 1 ELSE 0 END) as total_calls_connected,
  AVG(ci.call_duration_seconds) as avg_call_duration,
  AVG(ci.ai_conversation_quality_score) as avg_quality,
  
  COUNT(DISTINCT ec.email_event_id) as emails_sent,
  SUM(CASE WHEN ec.open_count > 0 THEN 1 ELSE 0 END) as emails_opened,
  SUM(CASE WHEN ec.click_count > 0 THEN 1 ELSE 0 END) as emails_clicked,
  
  SUM(CASE WHEN dm.from_stage = 'PROSPECT' AND dm.to_stage IN ('DEMO_SCHEDULED', 'DEMO_COMPLETED') THEN 1 ELSE 0 END) as deals_created,
  SUM(CASE WHEN dm.from_stage != dm.to_stage AND dm.to_stage NOT IN ('WON', 'LOST') THEN 1 ELSE 0 END) as deals_progressed,
  SUM(CASE WHEN dm.to_stage = 'LOST' THEN 1 ELSE 0 END) as deals_lost,
  SUM(CASE WHEN dm.to_stage = 'WON' THEN 1 ELSE 0 END) as deals_won,
  
  SUM(CASE WHEN d.deal_result = 'WON' THEN d.deal_amount_usd ELSE 0 END) as revenue_won,
  SUM(CASE WHEN d.current_stage != 'LOST' THEN d.deal_amount_usd ELSE 0 END) as pipeline_value,
  
  SUM(fs.expected_revenue_usd) as expected_revenue,
  AVG(fs.forecast_confidence) as forecast_confidence,
  
  CURRENT_TIMESTAMP

FROM dim_leads l
LEFT JOIN fact_call_interactions ci ON l.prospect_id = ci.fk_prospect_id 
  AND CAST(FORMAT(ci.call_started_at, 'YYYYMMDD') AS INT) = CAST(FORMAT(CURRENT_DATE, 'YYYYMMDD') AS INT)
LEFT JOIN fact_email_campaigns ec ON l.prospect_id = ec.fk_prospect_id
  AND CAST(FORMAT(ec.sent_at, 'YYYYMMDD') AS INT) = CAST(FORMAT(CURRENT_DATE, 'YYYYMMDD') AS INT)
LEFT JOIN fact_deal_movements dm ON l.product_id = dm.fk_product_id
  AND CAST(FORMAT(dm.movement_timestamp, 'YYYYMMDD') AS INT) = CAST(FORMAT(CURRENT_DATE, 'YYYYMMDD') AS INT)
LEFT JOIN dim_deals d ON l.product_id = d.product_id
LEFT JOIN fact_forecast_snapshots fs ON l.product_id = fs.fk_product_id
  AND CAST(FORMAT(CURRENT_DATE, 'YYYYMMDD') AS INT) = fs.fk_date_id

GROUP BY l.product_id

ON DUPLICATE KEY UPDATE
  total_calls_made = VALUES(total_calls_made),
  avg_call_duration_seconds = VALUES(avg_call_duration_seconds),
  emails_sent = VALUES(emails_sent),
  deals_won = VALUES(deals_won),
  revenue_won_usd = VALUES(revenue_won_usd),
  updated_at = CURRENT_TIMESTAMP
```

### Layer 3: Daily Batch Processing

```yaml
Time: 02:00 UTC (daily)

Jobs:
├─ 1. Reconcile yesterday's metrics
│  └─ Validate fact_daily_metrics against source tables
│
├─ 2. Forecast generation
│  ├─ Query: All open deals, grouped by stage
│  ├─ Apply: Probability-weighted revenue model
│  └─ Insert: fact_forecast_snapshots (3 scenarios)
│
├─ 3. Health score recalculation
│  ├─ For each deal: Recalc health based on activity
│  ├─ Alert if health drops > 20 points
│  └─ Update: dim_deals.health_score
│
├─ 4. Feature refresh (online store)
│  ├─ Calc: All prospect/deal/agent features
│  ├─ Post to: Redis cluster
│  └─ TTL: 24 hours
│
└─ 5. Data quality checks
   ├─ Null rate per column
   ├─ Cardinality checks
   ├─ Timestamp logic validation
   └─ Alert if > 5% anomaly
```

---

# PARTE 5: GDPR COMPLIANCE & DATA GOVERNANCE

## 5.1 GDPR Requirements in Analytics

### Right to Be Forgotten (RTBF)

```sql
-- Stored procedure to soft-delete prospect data
CREATE PROCEDURE gdpr_right_to_be_forgotten(
  IN prospect_email VARCHAR(255)
)
BEGIN
  -- 1. Find prospect_id
  SELECT prospect_id INTO @prospect_id 
  FROM dim_prospects 
  WHERE prospect_email = prospect_email;
  
  -- 2. Soft-delete from dimension (don't hard-delete for audit)
  UPDATE dim_prospects 
  SET 
    right_to_be_forgotten_requested = TRUE,
    prospect_email = NULL,
    prospect_name = '[REDACTED]',
    prospect_phone = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE prospect_id = @prospect_id;
  
  -- 3. Redact from facts (keep counts/metrics, remove PII)
  UPDATE fact_call_interactions 
  SET 
    fk_prospect_id = NULL
  WHERE fk_prospect_id = @prospect_id;
  
  UPDATE fact_email_campaigns 
  SET 
    fk_prospect_id = NULL
  WHERE fk_prospect_id = @prospect_id;
  
  -- 4. Archive to compliance table (immutable log)
  INSERT INTO gdpr_archive (
    prospect_id, 
    requested_at, 
    completed_at,
    archive_data
  ) VALUES (
    @prospect_id,
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    JSON_OBJECT(
      'email', prospect_email,
      'reason', 'Right to be forgotten',
      'archive_date', CURRENT_DATE
    )
  );
  
  -- 5. Audit log
  INSERT INTO audit_log (
    action,
    affected_entity,
    entity_id,
    timestamp
  ) VALUES (
    'GDPR_RTBF',
    'prospect',
    @prospect_id,
    CURRENT_TIMESTAMP
  );
END
```

### Data Retention Policy

```yaml
Retention Tiers:

TRANSACTIONAL TIER (PostgreSQL):
├─ Fact tables: 90 days (daily aggregation to warehouse)
├─ Prospect PII: 2 years (or RTBF request)
├─ Deal data: Until lifecycle complete + 1 year
└─ Call recordings: 30 days (compliance) + 1 year (archive)

ANALYTICS TIER (Snowflake):
├─ Aggregated metrics: 3 years
├─ Prospect behaviors: 2 years
├─ Forecast data: 18 months
└─ Agent performance: Indefinite

ARCHIVE TIER (S3 Glacier):
├─ Raw event logs: 7 years (tax/legal hold)
├─ GDPR compliance records: 7 years
└─ Quarterly snapshots: Indefinite

Purge Schedule:
├─ Daily: Remove call recordings > 30d
├─ Weekly: Archive transactional data > 90d to Snowflake
├─ Monthly: Hard-delete GDPR RTBF records > 1 year
└─ Quarterly: Compliance audit review
```

## 5.2 Data Governance Framework

### Metadata Management

```yaml
Metadata Store: PostgreSQL (internal table)

Table: data_catalog

Columns:
├─ asset_id (PK)
├─ asset_name (fact table/column name)
├─ asset_type (FACT | DIMENSION | METRIC)
├─ owner_team (data engineering, analytics)
├─ owner_email (contact)
├─ description (business definition)
├─ sla_freshness (e.g., "within 1 hour")
├─ pii_columns (JSON array of sensitive columns)
├─ classification (PUBLIC | INTERNAL | CONFIDENTIAL)
├─ data_quality_score (0-100)
├─ last_updated_at (TIMESTAMP)
└─ documentation_url (link to confluence)

Example:
{
  "asset_id": "fact_call_001",
  "asset_name": "fact_call_interactions",
  "description": "Each row represents one call interaction",
  "owner_team": "Revenue Analytics",
  "sla_freshness": "within 30 minutes",
  "pii_columns": ["prospect_name", "prospect_email", "prospect_phone"],
  "classification": "CONFIDENTIAL",
  "data_quality_score": 98.5,
  "last_audit": "2026-06-21"
}
```

### Data Lineage

```yaml
Lineage Tracking: Directed Acyclic Graph (DAG)

Example: fact_daily_metrics lineage

SOURCE SYSTEMS:
├─ Twilio API → call metadata
├─ SendGrid API → email events
├─ Supabase → deal stage changes
└─ Gemini API → conversation analysis

↓ TRANSFORM (ETL Pipeline)

INTERMEDIATE TABLES:
├─ stg_calls (cleaned)
├─ stg_emails (deduplicated)
├─ stg_deal_movements (validated)
└─ stg_gemini_analysis (quality scores)

↓ AGGREGATE

FACT TABLES:
├─ fact_call_interactions
├─ fact_email_campaigns
└─ fact_deal_movements

↓ ROLLUP

ANALYTICS:
├─ fact_daily_metrics (1 hour SLA)
└─ DASHBOARD: DealsBoard, RevenueForecaster

Impact Analysis:
- Change fact_call_interactions → affects:
  - fact_daily_metrics (1h)
  - DealsBoard dashboard (5min refresh)
  - Agent leaderboard (hourly)
```

### Data Quality Monitoring

```sql
-- DQ Dashboard queries
CREATE TABLE data_quality_checks (
  check_id INT PRIMARY KEY AUTO_INCREMENT,
  table_name VARCHAR(255) NOT NULL,
  column_name VARCHAR(255),
  check_type VARCHAR(50) NOT NULL,  -- NULL_RATE, CARDINALITY, UNIQUENESS, etc
  check_threshold DECIMAL(5,2),  -- acceptable %
  check_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actual_value DECIMAL(5,2),
  passed BOOLEAN,
  severity VARCHAR(20),  -- WARNING, CRITICAL
  alert_sent BOOLEAN DEFAULT FALSE
);

-- Monitoring queries:
INSERT INTO data_quality_checks (table_name, column_name, check_type, actual_value, passed)
SELECT 
  'fact_call_interactions' as table_name,
  'ai_conversation_quality_score' as column_name,
  'NULL_RATE' as check_type,
  ROUND(100.0 * SUM(CASE WHEN ai_conversation_quality_score IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) as actual_value,
  (ROUND(100.0 * SUM(CASE WHEN ai_conversation_quality_score IS NULL THEN 1 ELSE 0 END) / COUNT(*), 2) <= 5) as passed
FROM fact_call_interactions
WHERE call_started_at >= DATE_ADD(CURRENT_TIMESTAMP, -1 HOUR)
```

---

# PARTE 6: SERVING LAYER (APIs & Dashboards)

## 6.1 Analytics REST API

```yaml
Endpoints for Revenue Intelligence:

GET /analytics/pipeline
├─ Returns: Current pipeline by stage/product
├─ Query params: product_id, date_from, date_to
├─ Cache: Redis, TTL 1h
├─ Example response:
    {
      "total_pipeline_usd": 1250000,
      "by_stage": [
        {"stage": "PROSPECT", "count": 12, "value": 150000},
        {"stage": "DEMO_SCHEDULED", "count": 8, "value": 400000},
        {"stage": "NEGOTIATION", "count": 3, "value": 700000}
      ]
    }

GET /analytics/forecast/:product_id
├─ Returns: 30/60/90-day revenue forecast
├─ Query params: scenario (BEST/BASE/WORST)
├─ Cache: Redis, TTL 4h
├─ Example response:
    {
      "forecast_month": "2026-07",
      "scenarios": {
        "BEST": 450000,
        "BASE": 350000,
        "WORST": 200000
      },
      "confidence": 0.82,
      "previous_accuracy": 0.91
    }

GET /analytics/agents/leaderboard
├─ Returns: Agent performance rankings
├─ Query params: metric (WIN_RATE, QUALITY, REVENUE), team_id
├─ Cache: Redis, TTL 1h
├─ Paging: 25 agents/page
├─ Example response:
    {
      "period": "last_30_days",
      "agents": [
        {
          "agent_id": 123,
          "name": "Carlos",
          "team": "Sales",
          "win_rate_pct": 68.5,
          "avg_quality": 0.87,
          "revenue_generated": 245000,
          "rank": 1
        }
      ]
    }

POST /analytics/alerts/config
├─ Purpose: Configure alert thresholds
├─ Body:
    {
      "deal_health_threshold": 50,  # RED alert if < 50
      "pipeline_variance_pct": 15,
      "forecast_accuracy_min": 0.75
    }

GET /analytics/deals/:deal_id/analysis
├─ Returns: AI-generated deal analysis
├─ Example response:
    {
      "deal_id": "uuid",
      "status": "HIGH_RISK",
      "risk_score": 75,
      "analysis": "Deal stagnant for 21 days. No recent activity. Last call quality: 0.58 (below avg). Recommend: follow-up call + value prop re-engagement.",
      "suggested_actions": [
        {"action": "SEND_EMAIL", "template": "value-prop-reminder", "priority": "HIGH"},
        {"action": "SCHEDULE_CALL", "agent": "Carlos", "priority": "URGENT"}
      ]
    }
```

## 6.2 Real-time Alerting

```yaml
Alert System Architecture:

Triggers (via Cron + Stream Processing):
├─ Hourly: Deal health score < 50 (RED)
├─ Hourly: Agent quality score drops > 10 points
├─ Daily: Forecast vs pipeline variance > 20%
├─ Daily: High-value deal stagnation (> 30d no activity)
└─ Real-time: Call dropped/voicemail rate > 40%

Notification Channels:
├─ Slack: #sales-alerts (critical only)
├─ Email: manager@company.com (daily digest)
├─ In-app: DashboardAlert component (all)
└─ SMS: High-priority only (deal health RED)

Alert Example:
{
  "alert_id": "alrt_123",
  "severity": "HIGH",
  "type": "DEAL_HEALTH_DECLINE",
  "triggered_at": "2026-06-21T14:35:00Z",
  "deal_id": "deal_xyz",
  "deal_name": "Acme Corp - Enterprise Plan",
  "message": "Deal health dropped from 68 to 42 in 24h. Last activity: 8 days ago.",
  "actions": [
    {
      "type": "SCHEDULE_CALL",
      "label": "Call prospect now",
      "url": "/deals/deal_xyz/schedule-call"
    },
    {
      "type": "VIEW_DEAL",
      "label": "View deal details",
      "url": "/deals/deal_xyz"
    }
  ]
}
```

---

# PARTE 7: 6-MONTH IMPLEMENTATION ROADMAP

## Phase 1: Foundation (Months 1-2)

### Month 1: Infrastructure Setup

```
Week 1-2: Database & Star Schema
├─ [ ] Create PostgreSQL schema (fact/dimension tables)
├─ [ ] Create indexes for performance
├─ [ ] Set up CDC (Change Data Capture) for incremental loading
└─ [ ] Backup/archival strategy

Week 3-4: ETL Pipeline (Layer 1: Raw Ingestion)
├─ [ ] Kafka/Airflow setup for streaming
├─ [ ] Webhook receivers for Twilio/SendGrid
├─ [ ] Gemini API integration for call analysis
├─ [ ] Data validation & error handling
└─ [ ] Unit tests (>80% coverage)

Deliverable: First production fact table (fact_call_interactions) with data flowing
```

### Month 2: Analytics Layer

```
Week 1-2: Feature Store
├─ [ ] Redis cluster setup
├─ [ ] Feature calculation SQL (20 key features)
├─ [ ] Hourly refresh pipeline
└─ [ ] Redis cache management

Week 3-4: Initial Analytics Queries
├─ [ ] Win/loss analysis query
├─ [ ] Pipeline health scorecard
├─ [ ] Agent performance leaderboard
└─ [ ] Performance optimization (sub-1s queries)

Deliverable: Analytics queries tested & performance-optimized
```

## Phase 2: Insights & Reporting (Months 3-4)

### Month 3: Forecasting

```
Week 1-2: Forecast Model
├─ [ ] Probability-weighted revenue forecast logic
├─ [ ] Multi-scenario modeling (BEST/BASE/WORST)
├─ [ ] Confidence intervals calculation
├─ [ ] Historical accuracy tracking

Week 3-4: Forecast Accuracy Monitoring
├─ [ ] Monthly forecast vs. actual reconciliation
├─ [ ] Model accuracy dashboard
├─ [ ] Alert system for variance > 20%
└─ [ ] Forecast model versioning

Deliverable: Revenue forecast dashboard live, with accuracy tracking
```

### Month 4: Dashboards & APIs

```
Week 1-2: API Layer
├─ [ ] REST API endpoints (pipeline, forecast, agents)
├─ [ ] GraphQL schema (alternative query layer)
├─ [ ] Rate limiting & auth
└─ [ ] API documentation (OpenAPI 3.0)

Week 3-4: Dashboard Build
├─ [ ] DealsBoard component
├─ [ ] RevenueForecaster dashboard
├─ [ ] Agent leaderboard UI
├─ [ ] Alert system UI
└─ [ ] Performance testing

Deliverable: Full analytics dashboard suite live for users
```

## Phase 3: Governance & Optimization (Months 5-6)

### Month 5: GDPR & Governance

```
Week 1-2: GDPR Compliance
├─ [ ] Right-to-be-forgotten procedure
├─ [ ] Data retention policies
├─ [ ] PII masking & encryption
├─ [ ] Audit logging
└─ [ ] Legal review

Week 3-4: Data Governance
├─ [ ] Metadata catalog
├─ [ ] Data lineage documentation
├─ [ ] Data quality monitoring dashboard
├─ [ ] Documentation & wiki
└─ [ ] Team training

Deliverable: GDPR-compliant analytics layer with governance framework
```

### Month 6: Optimization & Scale

```
Week 1-2: Performance Optimization
├─ [ ] Query optimization (P99 latency targets)
├─ [ ] Materialized views for slow queries
├─ [ ] Caching strategy review
├─ [ ] Load testing (1M+ rows)
└─ [ ] Monitoring & alerting

Week 3-4: Documentation & Handoff
├─ [ ] Runbook for operations
├─ [ ] SLA documentation
├─ [ ] Disaster recovery plan
├─ [ ] Training for analytics team
└─ [ ] Post-launch optimization

Deliverable: Production-ready analytics layer, fully documented & monitored
```

---

# PARTE 8: SUCCESS METRICS & KPIS

## 8.1 Analytics System Metrics

```yaml
Operational KPIs:

Data Freshness:
├─ Real-time facts (calls/emails): < 5 minutes
├─ Daily aggregations: < 1 hour
├─ Forecasts: < 4 hours
└─ Target: 99% of data flows on SLA

Query Performance:
├─ API response time (P95): < 1 second
├─ Dashboard load time: < 3 seconds
├─ Complex queries (>1M rows): < 10 seconds
└─ Target: 99th percentile meets SLA

Data Quality:
├─ Null rate by column: < 5%
├─ Duplicate rate: < 0.1%
├─ Schema validation pass rate: 99%
└─ Data anomaly detection: alert if > 2σ deviation

Forecast Accuracy (Monthly):
├─ MAPE (Mean Absolute Percentage Error): < 15%
├─ Directional accuracy (up/down): > 85%
├─ Confidence intervals contain actual: > 90%
└─ Target: Continuous improvement

Feature Store Hit Rate:
├─ Redis cache hit ratio: > 90%
├─ Feature availability: 99.9%
└─ Stale data (>2h old): < 1%
```

## 8.2 Business Impact Metrics

```yaml
Revenue Intelligence:

Forecast Improvement:
├─ Baseline (Month 1): 60% accuracy
├─ Month 3: 75% accuracy
├─ Month 6: 85%+ accuracy
└─ Impact: Reduce forecast variance, improve cash flow planning

Sales Effectiveness:
├─ Avg deal cycle time: 40 → 30 days (25% reduction)
├─ Win rate improvement: 2-3 percentage points via coaching
├─ Pipeline health: <30% stagnant deals (vs 50% baseline)
└─ $200k+ revenue impact annually

Agent Performance:
├─ Quality score visibility → targeted coaching
├─ Win rate variance reduction: top vs bottom quartile
├─ Objection handling training via transcripts
└─ 5-10% productivity lift via personalization

Customer Insights:
├─ Early warning: detect at-risk deals 2 weeks earlier
├─ Churn prediction accuracy: 75%+
├─ Win pattern recognition: repeatable playbooks
└─ Customer lifetime value model in place

GDPR Compliance:
├─ 100% RTBF requests processed within 30 days
├─ Zero data breaches via governed access
├─ Audit readiness: all lineage documented
└─ Zero regulatory fines
```

---

# PARTE 9: TECHNOLOGY STACK SUMMARY

```yaml
Data Warehouse:
├─ Primary: PostgreSQL (transactional + initial analytics)
├─ Secondary: Snowflake (scale, OLAP, archive)
└─ For growth: BigQuery (if volume > 10TB/year)

Feature Store:
├─ Online: Redis Cluster (real-time serving)
├─ Batch: Snowflake (historical, model training)
└─ Feature versioning: DVC or Feast (optional)

ETL/Orchestration:
├─ Primary: Airflow (DAG scheduling, data pipelines)
├─ Streaming: Kafka (real-time events)
├─ CDC: Debezium (change capture from PostgreSQL)
└─ Monitoring: DataDog or Grafana

Analytics/BI:
├─ API: Node.js + Express (custom endpoints)
├─ Dashboard: React + Next.js (frontend)
├─ Charts: Chart.js or Plotly
└─ Real-time: WebSockets for live alerts

Governance:
├─ Metadata: PostgreSQL (data_catalog table)
├─ Lineage: Apache Atlas or Collibra (optional)
├─ DQ: Great Expectations or Monte Carlo
└─ Compliance: homegrown audit logging

Infrastructure:
├─ Containerization: Docker
├─ Orchestration: Kubernetes (if scale)
├─ Cloud: AWS (RDS, Redshift, S3) or GCP
└─ Monitoring: CloudWatch/Datadog + custom alerts
```

---

**END OF ANALYTICS LAYER DESIGN**

*Ready for sprint planning. All sections executable and production-ready.*
