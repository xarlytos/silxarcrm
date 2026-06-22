-- ============================================================
-- === REVENUE INTELLIGENCE — Deal Management & Forecasting ===
-- ============================================================

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  software_id VARCHAR(255) NOT NULL,

  nombre VARCHAR(500) NOT NULL,
  descripcion TEXT,
  monto NUMERIC(12, 2) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'EUR',

  -- Deal progression
  stage VARCHAR(50) NOT NULL DEFAULT 'PROSPECT' CHECK (stage IN ('PROSPECT', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'NEGOTIATION', 'CLOSING', 'WON', 'LOST')),
  probabilidad_cierre INT NOT NULL DEFAULT 25 CHECK (probabilidad_cierre >= 0 AND probabilidad_cierre <= 100),
  health_score INT NOT NULL DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),

  -- Timeline
  fecha_cierre_estimada TIMESTAMP,
  fecha_cierre_final TIMESTAMP,
  ultima_actividad_at TIMESTAMP,

  -- Closing info
  motivo_cierre VARCHAR(500),

  -- Tracking
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_software_id (software_id),
  INDEX idx_stage (stage),
  INDEX idx_probabilidad_cierre (probabilidad_cierre),
  INDEX idx_health_score (health_score),
  INDEX idx_fecha_cierre_estimada (fecha_cierre_estimada)
);

CREATE TABLE IF NOT EXISTS deal_activities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,

  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('CALL', 'EMAIL', 'WHATSAPP', 'DEMO', 'MEETING', 'PROPOSAL')),
  canal VARCHAR(50),

  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duracion_seg INT,
  resultado VARCHAR(50),

  resumen TEXT,
  transcript TEXT,

  external_id VARCHAR(255),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_deal_id (deal_id),
  INDEX idx_fecha_hora (fecha_hora),
  INDEX idx_deal_fecha (deal_id, fecha_hora DESC)
);

CREATE TABLE IF NOT EXISTS deal_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id UUID NOT NULL UNIQUE REFERENCES deals(id) ON DELETE CASCADE,

  estado VARCHAR(50) NOT NULL CHECK (estado IN ('OPEN', 'WON', 'LOST')),

  motivo_primario VARCHAR(255),
  motivo_secundario VARCHAR(255),
  lecciones TEXT,

  factores_clave TEXT[],

  calls_count INT DEFAULT 0,
  emails_count INT DEFAULT 0,
  demos_count INT DEFAULT 0,

  velocidad_cierre INT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_deal_id (deal_id),
  INDEX idx_estado (estado)
);

CREATE TABLE IF NOT EXISTS revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id VARCHAR(255) NOT NULL,
  fecha_snapshot TIMESTAMP NOT NULL,

  prospect_value NUMERIC(12, 2) DEFAULT 0,
  demo_scheduled_value NUMERIC(12, 2) DEFAULT 0,
  demo_completed_value NUMERIC(12, 2) DEFAULT 0,
  negotiation_value NUMERIC(12, 2) DEFAULT 0,
  closing_value NUMERIC(12, 2) DEFAULT 0,

  expected_revenue NUMERIC(12, 2),
  best_case_revenue NUMERIC(12, 2),
  worst_case_revenue NUMERIC(12, 2),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (software_id, fecha_snapshot),
  INDEX idx_software_id (software_id),
  INDEX idx_fecha_snapshot (fecha_snapshot)
);

-- ============================================================
-- === MACHINE LEARNING — Model Training & Inference ===
-- ============================================================

CREATE TABLE IF NOT EXISTS ml_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id VARCHAR(255) NOT NULL,

  nombre VARCHAR(255) NOT NULL,
  version VARCHAR(50) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('classification', 'regression', 'ranking')),

  accuracy FLOAT,
  auc FLOAT,
  rmse FLOAT,

  input_features TEXT[],
  training_data_size INT,
  training_date TIMESTAMP,

  es_produccion BOOLEAN DEFAULT false,
  ultima_prediccion TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_software_id (software_id),
  INDEX idx_nombre (nombre),
  INDEX idx_es_produccion (es_produccion)
);

CREATE TABLE IF NOT EXISTS ml_model_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  model_id UUID NOT NULL REFERENCES ml_models(id) ON DELETE CASCADE,

  fecha DATE NOT NULL,
  accuracy FLOAT NOT NULL,
  precision FLOAT,
  recall FLOAT,
  auc FLOAT,

  predicciones_totales INT DEFAULT 0,
  predicciones_exactas INT DEFAULT 0,

  feature_drift FLOAT,
  target_drift FLOAT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (model_id, fecha),
  INDEX idx_model_id (model_id),
  INDEX idx_fecha (fecha)
);

-- ============================================================
-- === EXPERIMENTATION — A/B Testing & Thompson Sampling ===
-- ============================================================

CREATE TABLE IF NOT EXISTS experiment_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id VARCHAR(255) NOT NULL,

  nombre VARCHAR(255) NOT NULL,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('ab_test', 'mab', 'multi_armed_bandit')),

  variant_a VARCHAR(255) NOT NULL,
  variant_b VARCHAR(255) NOT NULL,
  variant_c VARCHAR(255),

  variant_a_wins INT DEFAULT 0,
  variant_b_wins INT DEFAULT 0,
  variant_c_wins INT,

  variant_a_trials INT DEFAULT 0,
  variant_b_trials INT DEFAULT 0,
  variant_c_trials INT,

  thompson_posterior_a FLOAT DEFAULT 0.5,
  thompson_posterior_b FLOAT DEFAULT 0.5,
  thompson_posterior_c FLOAT,

  traffic_allocation_a FLOAT DEFAULT 0.33,
  traffic_allocation_b FLOAT DEFAULT 0.33,
  traffic_allocation_c FLOAT DEFAULT 0.34,

  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,

  status VARCHAR(50) NOT NULL DEFAULT 'RUNNING' CHECK (status IN ('PLANNING', 'RUNNING', 'COMPLETED', 'PAUSED')),

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_software_id (software_id),
  INDEX idx_status (status)
);

-- ============================================================
-- === OBSERVABILITY — Agent Decisions & Model Inferences ===
-- ============================================================

CREATE TABLE IF NOT EXISTS agent_decisions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id VARCHAR(255) NOT NULL,

  agent_type VARCHAR(50) NOT NULL CHECK (agent_type IN ('SDR', 'Closer', 'Recovery', 'FollowUp', 'Expansion')),

  prospect JSONB NOT NULL,

  decision TEXT NOT NULL,
  confidence FLOAT DEFAULT 0 CHECK (confidence >= 0 AND confidence <= 1),
  reasoning TEXT,

  outcome VARCHAR(50),
  outcome_at TIMESTAMP,

  latency_ms INT NOT NULL,
  tokens_used INT,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_software_id (software_id),
  INDEX idx_agent_type (agent_type),
  INDEX idx_created_at (created_at)
);

CREATE TABLE IF NOT EXISTS model_inferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  software_id VARCHAR(255) NOT NULL,
  model_id UUID,

  model_name VARCHAR(255) NOT NULL,

  input JSONB NOT NULL,

  prediction JSONB NOT NULL,
  confidence FLOAT NOT NULL CHECK (confidence >= 0 AND confidence <= 1),

  actual_outcome JSONB,
  feedback_at TIMESTAMP,

  latency_ms INT NOT NULL,

  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  INDEX idx_software_id (software_id),
  INDEX idx_model_name (model_name),
  INDEX idx_created_at (created_at)
);

-- ============================================================
-- === TRIGGERS — Auto-update updated_at ===
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_deals_updated_at BEFORE UPDATE ON deals
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_deal_analyses_updated_at BEFORE UPDATE ON deal_analyses
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_ml_models_updated_at BEFORE UPDATE ON ml_models
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_experiment_runs_updated_at BEFORE UPDATE ON experiment_runs
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
