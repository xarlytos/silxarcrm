-- ============================================================
-- ANALYTICS LAYER - EXECUTABLE SQL SCRIPTS
-- Revenue AI Data Warehouse Implementation
-- ============================================================

-- ============================================================
-- SECTION 1: DIMENSION TABLES (CREATE)
-- ============================================================

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- DIM_PROSPECTS
CREATE TABLE IF NOT EXISTS dim_prospects (
  prospect_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_name VARCHAR(500) NOT NULL,
  prospect_company VARCHAR(500),
  prospect_email VARCHAR(255) NOT NULL UNIQUE,
  prospect_phone VARCHAR(20),
  prospect_country VARCHAR(100),
  prospect_city VARCHAR(100),

  -- Scoring
  prospect_icp_match_score DECIMAL(3,2),
  prospect_engagement_tier VARCHAR(20) DEFAULT 'COLD',
  prospect_industry VARCHAR(100),
  prospect_revenue_band VARCHAR(50),

  -- Behavioral
  days_in_db INT DEFAULT 0,
  previous_interactions INT DEFAULT 0,
  opted_in_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_contacted_date TIMESTAMP,

  -- GDPR
  gdpr_consent_level VARCHAR(50) DEFAULT 'FULL',
  right_to_be_forgotten_requested BOOLEAN DEFAULT FALSE,
  dpo_contact_info VARCHAR(255),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(prospect_email),
  INDEX idx_company (prospect_company),
  INDEX idx_country (prospect_country),
  INDEX idx_engagement (prospect_engagement_tier),
  INDEX idx_icp_score (prospect_icp_match_score DESC),
  INDEX idx_active (is_active)
);

-- DIM_AGENTS
CREATE TABLE IF NOT EXISTS dim_agents (
  agent_id SERIAL PRIMARY KEY,
  agent_name VARCHAR(255) NOT NULL,
  agent_email VARCHAR(255) NOT NULL UNIQUE,
  agent_team VARCHAR(100),
  agent_role VARCHAR(100),

  languages VARCHAR(255),
  certifications VARCHAR(255),
  experience_years INT DEFAULT 0,

  avg_calls_per_day DECIMAL(6,2) DEFAULT 0,
  avg_call_quality_score DECIMAL(3,2) DEFAULT 0,
  avg_deal_cycle_days INT DEFAULT 0,
  win_rate_pct DECIMAL(5,2) DEFAULT 0,

  assigned_countries VARCHAR(255),
  assigned_industries VARCHAR(255),

  is_active BOOLEAN DEFAULT TRUE,
  hire_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_team (agent_team),
  INDEX idx_role (agent_role),
  INDEX idx_win_rate (win_rate_pct DESC),
  INDEX idx_quality (avg_call_quality_score DESC),
  INDEX idx_active (is_active)
);

-- DIM_DEALS
CREATE TABLE IF NOT EXISTS dim_deals (
  deal_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID NOT NULL,
  agent_id INT NOT NULL,
  product_id VARCHAR(50) NOT NULL,

  deal_name VARCHAR(500) NOT NULL,
  deal_description TEXT,
  deal_amount_usd DECIMAL(12,2) NOT NULL,
  deal_currency VARCHAR(3) DEFAULT 'USD',

  current_stage VARCHAR(50) DEFAULT 'PROSPECT',
  days_in_db INT DEFAULT 0,
  current_probability_score INT DEFAULT 25,

  deal_created_date TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deal_expected_close_date TIMESTAMP,
  deal_actual_close_date TIMESTAMP,
  days_to_close INT,

  deal_result VARCHAR(20),
  loss_reason VARCHAR(500),

  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_prospect FOREIGN KEY (prospect_id) REFERENCES dim_prospects(prospect_id),
  CONSTRAINT fk_agent FOREIGN KEY (agent_id) REFERENCES dim_agents(agent_id),

  INDEX idx_prospect (prospect_id),
  INDEX idx_agent (agent_id),
  INDEX idx_stage (current_stage),
  INDEX idx_result (deal_result),
  INDEX idx_product (product_id),
  INDEX idx_close_date (deal_expected_close_date),
  INDEX idx_active (is_active)
);

-- DIM_PRODUCTS
CREATE TABLE IF NOT EXISTS dim_products (
  product_id VARCHAR(50) PRIMARY KEY,
  product_name VARCHAR(255) NOT NULL,
  product_slug VARCHAR(100) NOT NULL UNIQUE,
  product_category VARCHAR(100),
  product_vertical VARCHAR(100),

  base_price_monthly_usd DECIMAL(12,2),
  base_price_annual_usd DECIMAL(12,2),
  currency_default VARCHAR(3) DEFAULT 'USD',

  target_market_country VARCHAR(100),
  target_market_size_prospect_count INT DEFAULT 0,

  is_active BOOLEAN DEFAULT TRUE,
  launched_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  UNIQUE(product_slug),
  INDEX idx_category (product_category),
  INDEX idx_vertical (product_vertical),
  INDEX idx_active (is_active)
);

-- DIM_DATES
CREATE TABLE IF NOT EXISTS dim_dates (
  date_id INT PRIMARY KEY,
  calendar_date DATE NOT NULL UNIQUE,

  year_number INT NOT NULL,
  quarter_number INT NOT NULL,
  month_number INT NOT NULL,
  month_name VARCHAR(20) NOT NULL,
  week_number INT NOT NULL,
  day_of_week INT NOT NULL,
  day_name VARCHAR(10) NOT NULL,

  is_weekday BOOLEAN DEFAULT TRUE,
  is_holiday BOOLEAN DEFAULT FALSE,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- DIM_REVENUE_STAGES
CREATE TABLE IF NOT EXISTS dim_revenue_stages (
  stage_id SERIAL PRIMARY KEY,
  stage_code VARCHAR(50) NOT NULL UNIQUE,
  stage_name VARCHAR(100) NOT NULL,
  stage_order INT NOT NULL,

  default_probability_pct INT DEFAULT 50,
  stage_description TEXT,
  typical_days_in_stage INT DEFAULT 7,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Populate revenue stages
INSERT INTO dim_revenue_stages (stage_code, stage_name, stage_order, default_probability_pct)
VALUES
  ('PROSPECT', 'Prospect', 1, 10),
  ('DEMO_SCHEDULED', 'Demo Scheduled', 2, 30),
  ('DEMO_COMPLETED', 'Demo Completed', 3, 50),
  ('NEGOTIATION', 'Negotiation', 4, 70),
  ('CLOSING', 'Closing', 5, 90),
  ('WON', 'Won', 6, 100),
  ('LOST', 'Lost', 7, 0)
ON CONFLICT (stage_code) DO NOTHING;

-- ============================================================
-- SECTION 2: FACT TABLES (CREATE)
-- ============================================================

-- FACT_CALL_INTERACTIONS
CREATE TABLE IF NOT EXISTS fact_call_interactions (
  call_interaction_id BIGSERIAL PRIMARY KEY,
  fk_prospect_id UUID NOT NULL,
  fk_agent_id INT NOT NULL,
  fk_deal_id UUID,
  fk_date_id INT NOT NULL,
  fk_product_id VARCHAR(50) NOT NULL,

  -- Measures
  call_duration_seconds INT NOT NULL DEFAULT 0,
  call_direction VARCHAR(10) NOT NULL,
  talk_time_seconds INT DEFAULT 0,
  hold_time_seconds INT DEFAULT 0,
  silence_time_seconds INT DEFAULT 0,

  -- Quality
  ai_conversation_quality_score DECIMAL(3,2),
  ai_objection_handling_count INT DEFAULT 0,
  ai_value_proposition_mentions INT DEFAULT 0,
  ai_discovery_questions INT DEFAULT 0,

  -- Outcomes
  call_outcome VARCHAR(50),
  prospect_objections JSONB,
  next_step_created BOOLEAN DEFAULT FALSE,
  demo_scheduled BOOLEAN DEFAULT FALSE,

  -- Recording
  recording_available BOOLEAN DEFAULT FALSE,
  transcription_available BOOLEAN DEFAULT FALSE,
  transcription_summary TEXT,

  -- Temporal
  call_started_at TIMESTAMP NOT NULL,
  call_ended_at TIMESTAMP NOT NULL,
  recorded_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_prospect FOREIGN KEY (fk_prospect_id) REFERENCES dim_prospects(prospect_id),
  CONSTRAINT fk_agent FOREIGN KEY (fk_agent_id) REFERENCES dim_agents(agent_id),
  CONSTRAINT fk_date FOREIGN KEY (fk_date_id) REFERENCES dim_dates(date_id),

  INDEX idx_prospect_date (fk_prospect_id, fk_date_id),
  INDEX idx_agent_date (fk_agent_id, fk_date_id),
  INDEX idx_deal (fk_deal_id),
  INDEX idx_product_date (fk_product_id, fk_date_id),
  INDEX idx_quality_score (ai_conversation_quality_score DESC),
  INDEX idx_call_started (call_started_at DESC)
);

-- FACT_EMAIL_CAMPAIGNS
CREATE TABLE IF NOT EXISTS fact_email_campaigns (
  email_event_id BIGSERIAL PRIMARY KEY,
  fk_prospect_id UUID NOT NULL,
  fk_campaign_id VARCHAR(50) NOT NULL,
  fk_sender_id VARCHAR(50) NOT NULL,
  fk_date_id INT NOT NULL,
  fk_product_id VARCHAR(50) NOT NULL,

  -- Measures
  email_type VARCHAR(50) NOT NULL,
  open_count INT DEFAULT 0,
  click_count INT DEFAULT 0,
  unsubscribe_flag BOOLEAN DEFAULT FALSE,
  bounce_flag BOOLEAN DEFAULT FALSE,

  -- A/B Test
  ab_variant VARCHAR(10),
  ab_test_id VARCHAR(50),

  -- Temporal
  sent_at TIMESTAMP NOT NULL,
  first_opened_at TIMESTAMP,
  last_interacted_at TIMESTAMP,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_prospect FOREIGN KEY (fk_prospect_id) REFERENCES dim_prospects(prospect_id),

  INDEX idx_prospect_date (fk_prospect_id, fk_date_id),
  INDEX idx_campaign_date (fk_campaign_id, fk_date_id),
  INDEX idx_type_date (email_type, fk_date_id),
  INDEX idx_sent_at (sent_at DESC)
);

-- FACT_DEAL_MOVEMENTS
CREATE TABLE IF NOT EXISTS fact_deal_movements (
  movement_id BIGSERIAL PRIMARY KEY,
  fk_deal_id UUID NOT NULL,
  fk_prospect_id UUID NOT NULL,
  fk_agent_id INT NOT NULL,
  fk_date_id INT NOT NULL,
  fk_product_id VARCHAR(50) NOT NULL,

  -- Movement details
  from_stage VARCHAR(50) NOT NULL,
  to_stage VARCHAR(50) NOT NULL,

  -- Metrics at time of movement
  deal_amount_usd DECIMAL(12,2),
  probability_score_before INT,
  probability_score_after INT,
  health_score_before INT,
  health_score_after INT,

  -- Timeline
  days_in_prev_stage INT,
  movement_reason VARCHAR(500),
  triggered_by_activity_type VARCHAR(50),

  -- Temporal
  movement_timestamp TIMESTAMP NOT NULL,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_deal FOREIGN KEY (fk_deal_id) REFERENCES dim_deals(deal_id),
  CONSTRAINT fk_prospect FOREIGN KEY (fk_prospect_id) REFERENCES dim_prospects(prospect_id),
  CONSTRAINT fk_agent FOREIGN KEY (fk_agent_id) REFERENCES dim_agents(agent_id),
  CONSTRAINT fk_date FOREIGN KEY (fk_date_id) REFERENCES dim_dates(date_id),

  INDEX idx_deal_date (fk_deal_id, fk_date_id),
  INDEX idx_prospect_date (fk_prospect_id, fk_date_id),
  INDEX idx_agent_date (fk_agent_id, fk_date_id),
  INDEX idx_stages (from_stage, to_stage),
  INDEX idx_movement_ts (movement_timestamp DESC)
);

-- FACT_DAILY_METRICS
CREATE TABLE IF NOT EXISTS fact_daily_metrics (
  daily_metric_id BIGSERIAL PRIMARY KEY,
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

  CONSTRAINT fk_date FOREIGN KEY (fk_date_id) REFERENCES dim_dates(date_id),
  CONSTRAINT fk_product FOREIGN KEY (fk_product_id) REFERENCES dim_products(product_id),

  UNIQUE(fk_date_id, fk_product_id),
  INDEX idx_date (fk_date_id DESC),
  INDEX idx_product_date (fk_product_id, fk_date_id)
);

-- FACT_FORECAST_SNAPSHOTS
CREATE TABLE IF NOT EXISTS fact_forecast_snapshots (
  forecast_snapshot_id BIGSERIAL PRIMARY KEY,
  fk_date_id INT NOT NULL,
  fk_product_id VARCHAR(50) NOT NULL,
  fk_revenue_stage_id INT NOT NULL,

  scenario VARCHAR(20) NOT NULL,

  total_deals_in_stage INT NOT NULL,
  total_deal_value_usd DECIMAL(14,2),
  avg_deal_value_usd DECIMAL(12,2),
  weighted_probability DECIMAL(5,2),

  expected_revenue_usd DECIMAL(14,2),
  confidence_interval_low DECIMAL(14,2),
  confidence_interval_high DECIMAL(14,2),

  forecast_month VARCHAR(7),
  actual_realized_revenue DECIMAL(14,2),
  revenue_variance_pct DECIMAL(5,2),
  forecast_accuracy_score DECIMAL(3,2),

  forecast_generated_at TIMESTAMP NOT NULL,
  forecast_method VARCHAR(50) DEFAULT 'PROBABILITY_WEIGHTED',

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT fk_date FOREIGN KEY (fk_date_id) REFERENCES dim_dates(date_id),
  CONSTRAINT fk_product FOREIGN KEY (fk_product_id) REFERENCES dim_products(product_id),
  CONSTRAINT fk_stage FOREIGN KEY (fk_revenue_stage_id) REFERENCES dim_revenue_stages(stage_id),

  INDEX idx_date_product_stage (fk_date_id DESC, fk_product_id, fk_revenue_stage_id),
  INDEX idx_product_month (fk_product_id, forecast_month),
  INDEX idx_accuracy (forecast_accuracy_score DESC)
);

-- ============================================================
-- SECTION 3: GOVERNANCE TABLES
-- ============================================================

-- GDPR_ARCHIVE (immutable compliance log)
CREATE TABLE IF NOT EXISTS gdpr_archive (
  archive_id BIGSERIAL PRIMARY KEY,
  prospect_id UUID NOT NULL,
  requested_at TIMESTAMP NOT NULL,
  completed_at TIMESTAMP NOT NULL,
  archive_data JSONB,

  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_prospect_id (prospect_id),
  INDEX idx_requested_at (requested_at DESC)
);

-- AUDIT_LOG (data governance trail)
CREATE TABLE IF NOT EXISTS audit_log (
  audit_id BIGSERIAL PRIMARY KEY,
  action VARCHAR(100) NOT NULL,
  affected_entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(255),
  old_value JSONB,
  new_value JSONB,
  user_id INT,
  ip_address VARCHAR(50),
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_entity (affected_entity, entity_id),
  INDEX idx_timestamp (timestamp DESC),
  INDEX idx_action (action)
);

-- DATA_QUALITY_CHECKS (DQ monitoring)
CREATE TABLE IF NOT EXISTS data_quality_checks (
  check_id BIGSERIAL PRIMARY KEY,
  table_name VARCHAR(255) NOT NULL,
  column_name VARCHAR(255),
  check_type VARCHAR(50) NOT NULL,
  check_threshold DECIMAL(5,2),
  check_timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actual_value DECIMAL(10,4),
  passed BOOLEAN,
  severity VARCHAR(20),
  alert_sent BOOLEAN DEFAULT FALSE,

  INDEX idx_table (table_name),
  INDEX idx_check_type (check_type),
  INDEX idx_timestamp (check_timestamp DESC),
  INDEX idx_severity (severity)
);

-- ============================================================
-- SECTION 4: ANALYTICS QUERIES (Executable Examples)
-- ============================================================

-- Query 1: Win/Loss Analysis
DROP VIEW IF EXISTS v_win_loss_analysis;
CREATE VIEW v_win_loss_analysis AS
SELECT
  d.product_id,
  COALESCE(rs.stage_name, d.current_stage) as stage_name,
  a.agent_name,
  d.deal_result,

  COUNT(*) as deal_count,
  SUM(d.deal_amount_usd) as total_value_usd,
  AVG(d.deal_amount_usd) as avg_deal_size_usd,
  AVG(EXTRACT(DAY FROM d.deal_actual_close_date - d.deal_created_date)) as avg_sales_cycle_days,

  ROUND(
    100.0 * SUM(CASE WHEN d.deal_result = 'WON' THEN 1 ELSE 0 END)::DECIMAL
    / NULLIF(COUNT(*), 0)::DECIMAL,
    2
  ) as conversion_rate_pct,

  AVG(
    (SELECT COUNT(*) FROM fact_call_interactions ci
     WHERE ci.fk_deal_id = d.deal_id)
  ) as avg_calls_per_deal,

  AVG(
    (SELECT AVG(ci.ai_conversation_quality_score)
     FROM fact_call_interactions ci
     WHERE ci.fk_deal_id = d.deal_id)
  ) as avg_conversation_quality

FROM dim_deals d
LEFT JOIN dim_revenue_stages rs ON d.current_stage = rs.stage_code
LEFT JOIN dim_agents a ON d.agent_id = a.agent_id
WHERE d.deal_result IN ('WON', 'LOST')
  AND d.deal_actual_close_date >= CURRENT_DATE - INTERVAL '90 days'

GROUP BY d.product_id, rs.stage_name, d.current_stage, a.agent_name, d.deal_result;

-- Query 2: Pipeline Health Scorecard
DROP VIEW IF EXISTS v_pipeline_health;
CREATE VIEW v_pipeline_health AS
WITH deal_stages AS (
  SELECT
    d.product_id,
    d.current_stage,
    COUNT(*) as deal_count,
    SUM(d.deal_amount_usd) as stage_value_usd,
    AVG(EXTRACT(DAY FROM CURRENT_TIMESTAMP - d.deal_created_date)) as avg_age_days,

    AVG((SELECT AVG(ci.ai_conversation_quality_score)
      FROM fact_call_interactions ci
      WHERE ci.fk_deal_id = d.deal_id
    )) as avg_quality,

    SUM(CASE WHEN EXTRACT(DAY FROM CURRENT_TIMESTAMP - d.deal_created_date) > 120
      THEN 1 ELSE 0 END) as stagnant_deals,

    SUM(CASE WHEN (SELECT MAX(ci.call_started_at)
      FROM fact_call_interactions ci
      WHERE ci.fk_deal_id = d.deal_id) >= CURRENT_DATE - INTERVAL '7 days'
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
  ROUND(ds.avg_age_days::DECIMAL, 1) as avg_age_days,
  ROUND(ds.avg_quality::DECIMAL, 2) as avg_quality,

  CASE
    WHEN ds.avg_quality >= 0.8 AND (ds.deals_with_activity_7d::DECIMAL / NULLIF(ds.deal_count, 0)) >= 0.7 THEN 85
    WHEN ds.avg_quality >= 0.7 AND (ds.deals_with_activity_7d::DECIMAL / NULLIF(ds.deal_count, 0)) >= 0.5 THEN 70
    WHEN ds.avg_quality >= 0.6 THEN 55
    WHEN ds.stagnant_deals > (ds.deal_count * 0.3) THEN 35
    ELSE 50
  END as health_score,

  CASE
    WHEN ds.stagnant_deals > (ds.deal_count * 0.5) THEN 'HIGH_STAGNATION'
    WHEN ds.avg_quality < 0.6 THEN 'QUALITY_CONCERN'
    WHEN (ds.deals_with_activity_7d::DECIMAL / NULLIF(ds.deal_count, 0)) < 0.3 THEN 'LOW_ACTIVITY'
    ELSE 'HEALTHY'
  END as risk_flag

FROM deal_stages ds;

-- Query 3: Agent Leaderboard (30-day rolling)
DROP VIEW IF EXISTS v_agent_leaderboard;
CREATE VIEW v_agent_leaderboard AS
SELECT
  a.agent_id,
  a.agent_name,
  a.agent_team,

  COUNT(DISTINCT ci.call_interaction_id) as total_calls_30d,
  COUNT(DISTINCT dm.fk_deal_id) as deals_touched_30d,

  ROUND(AVG(ci.ai_conversation_quality_score)::DECIMAL, 2) as avg_call_quality,
  ROUND(AVG(ci.ai_value_proposition_mentions)::DECIMAL, 1) as avg_value_prop_mentions,
  ROUND(AVG(ci.ai_objection_handling_count)::DECIMAL, 1) as avg_objections_handled,

  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage = 'WON' THEN dm.fk_deal_id END)::DECIMAL
    / NULLIF(COUNT(DISTINCT dm.fk_deal_id), 0)::DECIMAL,
    2
  ) as win_rate_pct,

  ROUND(
    100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage IN ('DEMO_SCHEDULED', 'DEMO_COMPLETED')
      THEN dm.fk_deal_id END)::DECIMAL
    / NULLIF(COUNT(DISTINCT ci.fk_deal_id), 0)::DECIMAL,
    2
  ) as advancement_rate_pct,

  SUM(CASE WHEN dm.to_stage = 'WON' THEN dm.deal_amount_usd ELSE 0 END) as revenue_generated_30d,

  ROUND(
    (ROUND(AVG(ci.ai_conversation_quality_score)::DECIMAL, 2) * 0.4 +
     ROUND(100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage = 'WON' THEN dm.fk_deal_id END)::DECIMAL
           / NULLIF(COUNT(DISTINCT dm.fk_deal_id), 0)::DECIMAL, 2) / 100.0 * 0.6),
    2
  ) as composite_performance_score,

  ROW_NUMBER() OVER (ORDER BY
    ROUND(100.0 * COUNT(DISTINCT CASE WHEN dm.to_stage = 'WON' THEN dm.fk_deal_id END)::DECIMAL
          / NULLIF(COUNT(DISTINCT dm.fk_deal_id), 0)::DECIMAL, 2) DESC
  ) as rank

FROM dim_agents a
LEFT JOIN fact_call_interactions ci ON a.agent_id = ci.fk_agent_id
  AND ci.call_started_at >= CURRENT_DATE - INTERVAL '30 days'
LEFT JOIN fact_deal_movements dm ON a.agent_id = dm.fk_agent_id
  AND dm.movement_timestamp >= CURRENT_DATE - INTERVAL '30 days'
WHERE a.is_active = TRUE

GROUP BY a.agent_id, a.agent_name, a.agent_team

ORDER BY composite_performance_score DESC;

-- Query 4: Forecast Accuracy (Monthly Reconciliation)
DROP VIEW IF EXISTS v_forecast_accuracy;
CREATE VIEW v_forecast_accuracy AS
WITH monthly_forecasts AS (
  SELECT
    fs.forecast_month,
    fs.fk_product_id,
    fs.scenario,
    SUM(fs.expected_revenue_usd) as forecasted_revenue_usd

  FROM fact_forecast_snapshots fs
  WHERE fs.forecast_month = TO_CHAR(CURRENT_DATE, 'YYYY-MM')

  GROUP BY fs.forecast_month, fs.fk_product_id, fs.scenario
),

monthly_actuals AS (
  SELECT
    TO_CHAR(d.deal_actual_close_date, 'YYYY-MM') as actual_month,
    d.product_id,
    SUM(d.deal_amount_usd) as actual_revenue_usd

  FROM dim_deals d
  WHERE d.deal_result = 'WON'
    AND d.deal_actual_close_date >= CURRENT_DATE - INTERVAL '90 days'

  GROUP BY actual_month, d.product_id
)

SELECT
  mf.forecast_month,
  mf.fk_product_id,
  mf.scenario,
  mf.forecasted_revenue_usd,
  COALESCE(ma.actual_revenue_usd, 0) as actual_revenue_usd,

  ROUND(
    ((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd)::DECIMAL
      / NULLIF(mf.forecasted_revenue_usd, 0)::DECIMAL) * 100,
    2
  ) as variance_pct,

  CASE
    WHEN ABS(((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd)::DECIMAL
      / NULLIF(mf.forecasted_revenue_usd, 0)::DECIMAL)) <= 0.05 THEN 'EXCELLENT'
    WHEN ABS(((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd)::DECIMAL
      / NULLIF(mf.forecasted_revenue_usd, 0)::DECIMAL)) <= 0.15 THEN 'GOOD'
    WHEN ABS(((COALESCE(ma.actual_revenue_usd, 0) - mf.forecasted_revenue_usd)::DECIMAL
      / NULLIF(mf.forecasted_revenue_usd, 0)::DECIMAL)) <= 0.25 THEN 'ACCEPTABLE'
    ELSE 'NEEDS_IMPROVEMENT'
  END as accuracy_grade

FROM monthly_forecasts mf
LEFT JOIN monthly_actuals ma ON mf.forecast_month = ma.actual_month
  AND mf.fk_product_id = ma.product_id

ORDER BY mf.forecast_month DESC, variance_pct DESC;

-- ============================================================
-- SECTION 5: STORED PROCEDURES
-- ============================================================

-- GDPR Right-to-be-forgotten procedure
CREATE OR REPLACE PROCEDURE gdpr_right_to_be_forgotten(prospect_email VARCHAR(255))
LANGUAGE plpgsql
AS $$
DECLARE
  v_prospect_id UUID;
BEGIN
  -- Find prospect_id
  SELECT prospect_id INTO v_prospect_id
  FROM dim_prospects
  WHERE prospect_email = gdpr_right_to_be_forgotten.prospect_email;

  IF v_prospect_id IS NULL THEN
    RAISE EXCEPTION 'Prospect not found: %', prospect_email;
  END IF;

  -- Soft-delete from dimension
  UPDATE dim_prospects
  SET
    right_to_be_forgotten_requested = TRUE,
    prospect_email = NULL,
    prospect_name = '[REDACTED]',
    prospect_phone = NULL,
    prospect_country = NULL,
    prospect_city = NULL,
    updated_at = CURRENT_TIMESTAMP
  WHERE prospect_id = v_prospect_id;

  -- Redact from facts
  UPDATE fact_call_interactions
  SET fk_prospect_id = NULL
  WHERE fk_prospect_id = v_prospect_id;

  UPDATE fact_email_campaigns
  SET fk_prospect_id = NULL
  WHERE fk_prospect_id = v_prospect_id;

  -- Archive to compliance
  INSERT INTO gdpr_archive (prospect_id, requested_at, completed_at, archive_data)
  VALUES (v_prospect_id, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
    jsonb_build_object('email', prospect_email, 'reason', 'Right to be forgotten'));

  -- Audit log
  INSERT INTO audit_log (action, affected_entity, entity_id, timestamp)
  VALUES ('GDPR_RTBF', 'prospect', v_prospect_id::TEXT, CURRENT_TIMESTAMP);

  COMMIT;
END;
$$;

-- Calculate daily metrics (upsert)
CREATE OR REPLACE PROCEDURE calculate_daily_metrics(calculation_date DATE DEFAULT CURRENT_DATE)
LANGUAGE plpgsql
AS $$
DECLARE
  v_date_id INT;
BEGIN
  v_date_id := TO_CHAR(calculation_date, 'YYYYMMDD')::INT;

  INSERT INTO fact_daily_metrics (
    fk_date_id, fk_product_id,
    total_calls_made, total_calls_connected,
    avg_call_duration_seconds, avg_conversation_quality,
    emails_sent, emails_opened, emails_clicked,
    deals_created, deals_won,
    revenue_won_usd
  )
  SELECT
    v_date_id,
    d.product_id,
    COUNT(DISTINCT ci.call_interaction_id),
    SUM(CASE WHEN ci.call_outcome = 'CONNECTED' THEN 1 ELSE 0 END),
    AVG(ci.call_duration_seconds),
    AVG(ci.ai_conversation_quality_score),
    COUNT(DISTINCT ec.email_event_id),
    SUM(CASE WHEN ec.open_count > 0 THEN 1 ELSE 0 END),
    SUM(CASE WHEN ec.click_count > 0 THEN 1 ELSE 0 END),
    SUM(CASE WHEN dm.from_stage = 'PROSPECT' THEN 1 ELSE 0 END),
    SUM(CASE WHEN dm.to_stage = 'WON' THEN 1 ELSE 0 END),
    SUM(CASE WHEN d.deal_result = 'WON' THEN d.deal_amount_usd ELSE 0 END)
  FROM dim_deals d
  LEFT JOIN fact_call_interactions ci ON d.deal_id = ci.fk_deal_id
    AND ci.fk_date_id = v_date_id
  LEFT JOIN fact_email_campaigns ec ON d.deal_id = ec.fk_campaign_id
  LEFT JOIN fact_deal_movements dm ON d.deal_id = dm.fk_deal_id
    AND dm.fk_date_id = v_date_id

  GROUP BY d.product_id

  ON CONFLICT (fk_date_id, fk_product_id) DO UPDATE SET
    total_calls_made = EXCLUDED.total_calls_made,
    avg_call_duration_seconds = EXCLUDED.avg_call_duration_seconds,
    revenue_won_usd = EXCLUDED.revenue_won_usd,
    updated_at = CURRENT_TIMESTAMP;

  RAISE NOTICE 'Daily metrics calculated for %', calculation_date;
END;
$$;

-- ============================================================
-- SECTION 6: INDEXES FOR PERFORMANCE
-- ============================================================

-- Composite indexes for common queries
CREATE INDEX IF NOT EXISTS idx_deals_product_stage
  ON dim_deals(product_id, current_stage)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_calls_prospect_quality
  ON fact_call_interactions(fk_prospect_id, ai_conversation_quality_score DESC);

CREATE INDEX IF NOT EXISTS idx_emails_campaign_open
  ON fact_email_campaigns(fk_campaign_id, open_count DESC);

CREATE INDEX IF NOT EXISTS idx_movements_deal_stage
  ON fact_deal_movements(fk_deal_id, from_stage, to_stage);

CREATE INDEX IF NOT EXISTS idx_daily_metrics_date_product
  ON fact_daily_metrics(fk_date_id DESC, fk_product_id);

-- Partial indexes for active records
CREATE INDEX IF NOT EXISTS idx_active_prospects
  ON dim_prospects(prospect_id)
  WHERE is_active = TRUE;

CREATE INDEX IF NOT EXISTS idx_active_agents
  ON dim_agents(agent_id)
  WHERE is_active = TRUE;

-- ============================================================
-- END OF EXECUTABLE SQL
-- ============================================================
