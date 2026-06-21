-- ══════════════════════════════════════════════════════════════════════
-- SUPABASE SCHEMAS: 6 Mejoras - Complete Setup
-- ══════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════
-- MEJORA 1: Prospect Profile Engine
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS prospects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  company TEXT,
  industry TEXT,
  company_size INT,
  phone TEXT,
  email TEXT,

  -- Profile (extracted from call 1)
  presupuesto_min NUMERIC,
  presupuesto_max NUMERIC,
  nivel_interes TEXT DEFAULT 'cold',  -- cold/warm/hot
  objeciones TEXT[] DEFAULT '{}',
  motivadores TEXT[] DEFAULT '{}',
  budget_owner BOOLEAN DEFAULT FALSE,
  decision_timeline TEXT,

  -- Metadata
  engagement_confidence FLOAT DEFAULT 0.0,
  interaction_history JSONB DEFAULT '[]'::jsonb,
  last_contact TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_prospects_industry ON prospects(industry);
CREATE INDEX idx_prospects_company_size ON prospects(company_size);

-- ═════════════════════════════════════════════════════════════════════════
-- MEJORA 2 + 6: Deal Engine + Revenue Optimizer
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id),

  -- Offer details
  plan_recommended TEXT,  -- Starter/Pro/Enterprise
  price_recommended NUMERIC,
  discount_percent FLOAT DEFAULT 0,
  confidence FLOAT,  -- 0-1: based on historical data
  sample_size INT,
  expected_revenue NUMERIC,

  -- Outcome
  accepted BOOLEAN,
  final_price NUMERIC,
  final_plan TEXT,

  -- Metadata
  industry TEXT,
  company_size INT,
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_deals_prospect ON deals(prospect_id);
CREATE INDEX idx_deals_outcome ON deals(accepted);

-- ═════════════════════════════════════════════════════════════════════════
-- MEJORA 3: Coaching Automático
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS call_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,
  prospect_id UUID REFERENCES prospects(id),

  -- Lead score
  lead_score INT,  -- 0-100
  score_confidence FLOAT,
  level TEXT,  -- cold/warm/hot

  -- Components breakdown
  engagement_score INT,
  interest_signals_score INT,
  objection_handling_score INT,
  commitment_score INT,

  -- Analysis
  sentiment TEXT,  -- muy_negativo/negativo/neutral/positivo/muy_positivo
  probability_to_close FLOAT,

  -- Next action
  next_action_channel TEXT,  -- llamada/whatsapp/email/sms/none
  next_action_timing_hours INT,
  next_action_priority TEXT,

  -- Metadata
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_call_analyses_prospect ON call_analyses(prospect_id);
CREATE INDEX idx_call_analyses_call_id ON call_analyses(call_id);

-- ═════════════════════════════════════════════════════════════════════════
-- MEJORA 4: Conversation Intelligence Layer
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS conversation_moments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  call_id TEXT NOT NULL,

  -- Moment details
  type TEXT,  -- interest_triggered/objection_encountered/deal_closed
  prospect_said TEXT,
  agent_said TEXT,
  preceding_context TEXT,
  outcome TEXT,  -- success/failure/ongoing

  -- Metadata
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_moments_call_id ON conversation_moments(call_id);
CREATE INDEX idx_moments_type ON conversation_moments(type);

-- Winning arguments playbook (cached)
CREATE TABLE IF NOT EXISTS winning_arguments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  argument TEXT UNIQUE,
  industry TEXT,

  -- Historical effectiveness
  uses INT DEFAULT 0,
  closes INT DEFAULT 0,
  close_rate FLOAT DEFAULT 0,

  -- Metadata
  sample_size INT DEFAULT 0,
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Objection handling playbook (cached)
CREATE TABLE IF NOT EXISTS objection_playbook (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  objection TEXT,
  industry TEXT,

  -- Best rebuttal
  best_rebuttal TEXT,
  overcome_rate FLOAT DEFAULT 0,
  times_encountered INT DEFAULT 0,
  times_overcome INT DEFAULT 0,

  -- Metadata
  updated_at TIMESTAMP DEFAULT NOW()
);

-- ═════════════════════════════════════════════════════════════════════════
-- MEJORA 5: Multicanal Orchestrator
-- ═════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS channel_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  prospect_id UUID REFERENCES prospects(id),

  -- Channel details
  channel TEXT,  -- whatsapp/email/sms/phone
  direction TEXT,  -- inbound/outbound
  message TEXT,

  -- Status
  status TEXT,  -- sent/failed/delivered/read

  -- Metadata
  timestamp TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_interactions_prospect ON channel_interactions(prospect_id);
CREATE INDEX idx_interactions_channel ON channel_interactions(channel);

-- ═════════════════════════════════════════════════════════════════════════
-- METRICS: Dashboard queries
-- ═════════════════════════════════════════════════════════════════════════

CREATE VIEW metrics_by_segment AS
SELECT
  p.industry,
  p.company_size,
  COUNT(DISTINCT p.id) as total_prospects,
  AVG(ca.lead_score) as avg_lead_score,
  SUM(CASE WHEN d.accepted THEN 1 ELSE 0 END)::float / NULLIF(COUNT(d.id), 0) as close_rate,
  AVG(d.expected_revenue) as avg_deal_value
FROM prospects p
LEFT JOIN call_analyses ca ON p.id = ca.prospect_id
LEFT JOIN deals d ON p.id = d.prospect_id
WHERE p.created_at > NOW() - INTERVAL '90 days'
GROUP BY p.industry, p.company_size;

CREATE VIEW metrics_system_overall AS
SELECT
  COUNT(DISTINCT p.id) as total_prospects,
  COUNT(DISTINCT ca.call_id) as total_calls_analyzed,
  AVG(ca.lead_score) as avg_lead_score,
  SUM(CASE WHEN d.accepted THEN 1 ELSE 0 END)::float / NULLIF(COUNT(d.id), 0) as overall_close_rate,
  SUM(CASE WHEN ch.status = 'delivered' THEN 1 ELSE 0 END) as followups_sent,
  SUM(CASE WHEN ch.status = 'read' THEN 1 ELSE 0 END) as followups_opened
FROM prospects p
LEFT JOIN call_analyses ca ON p.id = ca.prospect_id
LEFT JOIN deals d ON p.id = d.prospect_id
LEFT JOIN channel_interactions ch ON p.id = ch.prospect_id
WHERE p.created_at > NOW() - INTERVAL '90 days';

-- ═════════════════════════════════════════════════════════════════════════
-- BONUS: RLS (Row Level Security) - Basic
-- ═════════════════════════════════════════════════════════════════════════

ALTER TABLE prospects ENABLE ROW LEVEL SECURITY;
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE call_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE channel_interactions ENABLE ROW LEVEL SECURITY;

-- ponytail: Básico RLS - add per-tenant/org if needed
