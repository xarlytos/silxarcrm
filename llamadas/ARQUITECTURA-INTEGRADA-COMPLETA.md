# ARQUITECTURA INTEGRADA COMPLETA
## Sistema de Ventas AI: Llamadas → Análisis → Scoring → Coaching → Retroalimentación

**Versión:** 1.0  
**Fecha:** 2026-06-21  
**Estado:** Blueprint integrado (fusiona 4 investigaciones)  
**Objetivo:** Documentación ejecutiva de la arquitectura completa de flujo de datos

---

## TABLA DE CONTENIDOS

1. [Database Schema](#1-database-schema)
2. [Service Layer](#2-service-layer-orquestación)
3. [Data Flow Completo](#3-data-flow-entrada--análisis--scoring--coaching--actions)
4. [Multicanal Integration](#4-integración-multicanal)
5. [Learning Feedback Loop](#5-learning-feedback-loop)
6. [Diagrama ASCII](#6-diagrama-arquitectura-ascii)

---

## 1. DATABASE SCHEMA

### 1.1 Prospect Profile

```sql
CREATE TABLE prospects (
  id UUID PRIMARY KEY,
  external_id VARCHAR(255),           -- CRM ID (HubSpot, Salesforce, etc)
  
  -- Identidad
  name VARCHAR(255) NOT NULL,
  business_name VARCHAR(255),
  phone VARCHAR(20) NOT NULL UNIQUE,
  email VARCHAR(255),
  
  -- Segmentación
  industry ENUM('veterinaria', 'gym', 'yoga', 'spa', 'other'),
  business_size ENUM('solo', '1-5', '6-20', '20+'),
  region VARCHAR(100),
  
  -- Decisor
  is_decision_maker BOOLEAN DEFAULT false,
  is_gatekeeper BOOLEAN DEFAULT false,
  
  -- Histórico de intentos
  attempt_count INT DEFAULT 0,
  attempt_success_rate FLOAT DEFAULT 0.0,  -- 0-1
  last_attempt_at TIMESTAMP,
  
  -- Scoring histórico
  lifetime_lead_score FLOAT DEFAULT 0,       -- Max score en cualquier llamada
  avg_lead_score FLOAT DEFAULT 0,             -- Promedio de todas las llamadas
  lifetime_conversion_probability FLOAT,      -- P(closes) based on history
  
  -- Engagement
  preferred_language ENUM('es', 'en', 'ca'),
  timezone VARCHAR(50),
  do_not_call BOOLEAN DEFAULT false,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_prospects_phone ON prospects(phone);
CREATE INDEX idx_prospects_industry ON prospects(industry);
CREATE INDEX idx_prospects_decision_maker ON prospects(is_decision_maker);
```

### 1.2 Call History

```sql
CREATE TABLE calls (
  id UUID PRIMARY KEY,
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  
  -- Metadatos de llamada
  call_sid VARCHAR(255) UNIQUE,          -- Twilio/VoIP provider
  campaign_id VARCHAR(255),               -- A/B test campaign
  agent_type ENUM('voice_fast', 'hybrid_advanced'),
  model_version VARCHAR(50),              -- e.g., "gemini-1.5"
  
  -- Timing
  started_at TIMESTAMP NOT NULL,
  ended_at TIMESTAMP,
  duration_seconds INT,
  
  -- Transcript
  transcript JSONB,                       -- Raw: [{role, text, timestamp, emotion}]
  
  -- Clasificación en tiempo real
  classifications JSONB,                  -- [{turn, tags, confidence}]
  
  -- Outcome
  outcome ENUM('demo_booked', 'soft_no', 'hard_no', 'transfer', 'error'),
  outcome_timestamp TIMESTAMP,
  
  -- Señales de éxito
  pain_points_detected TEXT[],            -- ["citas perdidas", "recordatorios"]
  objections TEXT[],                      -- ["precio alto", "ya tenemos algo"]
  questions_asked INT,                    -- Count
  prospect_interruptions INT,             -- Barge-in count
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_calls_prospect ON calls(prospect_id);
CREATE INDEX idx_calls_outcome ON calls(outcome);
CREATE INDEX idx_calls_started_at ON calls(started_at);
```

### 1.3 Call Metrics & Scoring

```sql
CREATE TABLE call_metrics (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id) UNIQUE,
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  
  -- LEAD SCORE (Post-call analysis)
  -- Formula: engagement(40%) + interest_signals(35%) + objection_handling(25%)
  
  -- 1. Engagement (0-100)
  engagement_score FLOAT,
  ├─ turns_count INT,
  ├─ prospect_words_count INT,
  ├─ questions_asked INT,
  ├─ prospect_interruptions INT,
  └─ pain_matches INT,
  
  -- 2. Interest Signals (0-100)
  interest_score FLOAT,
  ├─ price_mentioned BOOLEAN,
  ├─ interest_verbal BOOLEAN,
  ├─ demo_requested BOOLEAN,
  ├─ urgency_detected BOOLEAN,
  ├─ decision_maker_confirmed BOOLEAN,
  ├─ need_quantified BOOLEAN,
  └─ objection_overcome BOOLEAN,
  
  -- 3. Objection Handling (0-100)
  objection_handling_score FLOAT,
  ├─ objections_count INT,
  ├─ objections_overcome INT,
  └─ comeback_quality FLOAT,
  
  -- COMPOSITE SCORES
  lead_score FLOAT,                       -- 0-100 (final)
  sentiment_score FLOAT,                  -- -1 to +1
  probability_to_close FLOAT,             -- 0-1 (Bayesian)
  
  -- Timing metrics
  response_latency_p50_ms INT,
  response_latency_p95_ms INT,
  
  -- Cost
  cost_usd FLOAT,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_call_metrics_lead_score ON call_metrics(lead_score DESC);
CREATE INDEX idx_call_metrics_prob_close ON call_metrics(probability_to_close DESC);
```

### 1.4 Next Best Actions

```sql
CREATE TABLE next_best_actions (
  id UUID PRIMARY KEY,
  call_id UUID NOT NULL REFERENCES calls(id),
  prospect_id UUID NOT NULL REFERENCES prospects(id),
  
  -- Action metadata
  action_type ENUM(
    'send_email_followup',
    'send_whatsapp_offer',
    'schedule_callback',
    'transfer_to_human',
    'send_case_study',
    'send_testimonial',
    'request_referral',
    'flag_for_manual_review',
    'do_not_contact'
  ),
  
  priority INT,                           -- 1-100 (higher = sooner)
  confidence FLOAT,                       -- 0-1
  
  -- Content
  content JSONB,                          -- {"template": "...", "vars": {...}}
  channel ENUM('email', 'whatsapp', 'sms', 'voice'),
  scheduled_at TIMESTAMP,
  
  -- Status
  status ENUM('pending', 'sent', 'opened', 'clicked', 'failed'),
  executed_at TIMESTAMP,
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_nba_prospect ON next_best_actions(prospect_id);
CREATE INDEX idx_nba_status ON next_best_actions(status);
CREATE INDEX idx_nba_scheduled_at ON next_best_actions(scheduled_at);
```

### 1.5 Learning Loop Data

```sql
CREATE TABLE learning_loop_metrics (
  id UUID PRIMARY KEY,
  
  -- Window
  window_date DATE,                       -- Daily aggregation
  analysis_timestamp TIMESTAMP,
  
  -- Pattern detection
  top_winning_arguments TEXT[],           -- Top 10 argumentos por win_rate
  top_winning_offers TEXT[],              -- Top ofertas por CTR
  recurring_objections JSONB,             -- {objection: count, handlers: [...]}
  industry_patterns JSONB,                -- {industry: {win_rate, avg_duration}}
  
  -- Metrics
  overall_win_rate FLOAT,                 -- % of demo_booked outcomes
  avg_demo_booking_rate FLOAT,            -- By offers tested
  avg_call_duration INT,
  avg_lead_score FLOAT,
  
  -- Model performance
  prompt_version VARCHAR(50),
  a_b_test_results JSONB,                 -- {variant_a: metrics, variant_b: metrics}
  
  -- Recommendations
  recommended_prompt_updates TEXT[],      -- Actions to take
  confidence_in_update FLOAT,             -- 0-1
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT now()
);

CREATE INDEX idx_learning_window_date ON learning_loop_metrics(window_date DESC);
```

---

## 2. SERVICE LAYER: ORQUESTACIÓN

### 2.1 Componentes Principales

```
┌─────────────────────────────────────────────────────────────────┐
│                    CALL ORCHESTRATION LAYER                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  1. CALL ROUTER (Entrada)                                       │
│     ├─ Recibe: lead_id, campaign_id, business_type             │
│     ├─ Valida: DNC, duplicados, ventanas de llamada            │
│     └─ Enruta: a HybridSession (dual LLM)                      │
│                                                                  │
│  2. HYBRID SESSION (Durante llamada)                            │
│     ├─ State Engine (código puro, <1ms)                        │
│     ├─ Voice LLM (Gemini Flash, 180ms)                         │
│     ├─ Master LLM (Gemini Pro, 300-500ms, async background)   │
│     └─ Classification Engine (100ms, selectivo)                │
│                                                                  │
│  3. POST-CALL PROCESSOR (Después de llamada)                   │
│     ├─ Transcript analysis                                      │
│     ├─ Scoring pipeline (lead score, sentiment, P(close))      │
│     ├─ NBA computation (next best actions)                      │
│     └─ Action dispatch (email, WhatsApp, SMS, voice)           │
│                                                                  │
│  4. ANALYTICS ENGINE (24-48h después)                          │
│     ├─ Pattern detection (argumentos, objeciones)              │
│     ├─ Cohort analysis (por industria/región)                  │
│     ├─ A/B test evaluation                                      │
│     └─ Prompt recommendations                                   │
│                                                                  │
│  5. PROMPT OPTIMIZER (Deployment)                              │
│     ├─ Validates changes (safety gates)                         │
│     ├─ A/B test setup                                           │
│     ├─ Rollout strategy (canary 10% → 50% → 100%)             │
│     └─ Monitoring + rollback                                    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Service Definitions (Python/FastAPI)

```python
# call_router.py
class CallRouter:
    """Entry point: recibe lead, valida, enruta a HybridSession"""
    
    async def route_call(self, lead_id: str, campaign_id: str) -> CallSession:
        # 1. Fetch prospect + history
        prospect = await db.prospects.get(lead_id)
        call_history = await db.calls.find_by_prospect(lead_id)
        
        # 2. Validate
        if prospect.do_not_call:
            return CallSession(status="blocked")
        if await self._is_duplicate_call(lead_id):
            return CallSession(status="duplicate")
        
        # 3. Route
        session = HybridSession(
            prospect=prospect,
            campaign=campaign,
            call_history=call_history,
            model_version="gemini-1.5"
        )
        
        return session

# hybrid_session.py
class HybridSession:
    """Main call orchestration during call"""
    
    async def handle_user_input(self, transcript_text: str, turn: int):
        # 1. Classify (selective, only if needed)
        if self._should_classify(turn):
            classification = await self._classifier.classify(
                text=transcript_text,
                context=self._state
            )  # 100ms
        else:
            classification = self._last_classification
        
        # 2. Update state (instant)
        self._state.update(classification)  # <1ms
        
        # 3. Generate brief from Master async
        response_task = asyncio.create_task(
            self._voice_llm.generate(self._last_brief)  # Use cached brief
        )  # 180ms (parallel)
        
        brief_task = asyncio.create_task(
            self._master_llm.generate_background(
                state=self._state,
                classification=classification
            )
        )  # 300-500ms (parallel, for next turn)
        
        # 4. Get response without waiting for brief
        response = await response_task  # ~180ms
        self._last_brief = await brief_task  # Store for next turn
        
        return response

# post_call_processor.py
class PostCallProcessor:
    """Executed after call ends"""
    
    async def process_call(self, call_id: str):
        call = await db.calls.get(call_id)
        prospect = await db.prospects.get(call.prospect_id)
        
        # 1. ANALYZE TRANSCRIPT
        transcript_analysis = await self._analyzer.analyze(call.transcript)
        
        # 2. COMPUTE METRICS
        metrics = CallMetricsComputer().compute(
            transcript_analysis=transcript_analysis,
            prospect_history=prospect,
            outcome=call.outcome
        )
        # Returns: lead_score, sentiment_score, probability_to_close
        
        # 3. COMPUTE NEXT BEST ACTIONS
        nba_list = NBAPipeline().compute_actions(
            metrics=metrics,
            prospect=prospect,
            call_history=[...],
            campaign_config=call.campaign
        )
        
        # 4. DISPATCH ACTIONS
        for action in nba_list:
            await self._action_dispatcher.dispatch(action)
        
        # 5. UPDATE PROSPECT PROFILE
        await db.prospects.update(prospect.id, {
            'lifetime_lead_score': max(metrics.lead_score, prospect.lifetime_lead_score),
            'avg_lead_score': (prospect.avg_lead_score + metrics.lead_score) / 2,
            'lifetime_conversion_probability': metrics.probability_to_close,
            'attempt_count': prospect.attempt_count + 1,
            'last_attempt_at': datetime.now()
        })

# analytics_engine.py
class AnalyticsEngine:
    """Runs 24-48h after calls for pattern detection"""
    
    async def analyze_window(self, start_date: date, end_date: date):
        calls = await db.calls.find_by_date_range(start_date, end_date)
        
        # 1. Extract arguments from winning calls
        winning_calls = [c for c in calls if c.outcome == 'demo_booked']
        winning_arguments = await self._extract_arguments(winning_calls)
        win_rate_by_argument = self._compute_win_rates(winning_arguments)
        
        # 2. Extract objections + handling strategies
        all_objections = await self._extract_objections(calls)
        best_handlers = self._find_best_objection_handlers(
            objections=all_objections,
            winning_calls=winning_calls
        )
        
        # 3. Industry patterns
        industry_patterns = {}
        for industry in ['veterinaria', 'gym', 'yoga', 'spa']:
            industry_calls = [c for c in calls if c.prospect.industry == industry]
            industry_patterns[industry] = {
                'win_rate': len([c for c in industry_calls if c.outcome == 'demo_booked']) / len(industry_calls),
                'avg_duration': sum(c.duration_seconds for c in industry_calls) / len(industry_calls),
                'top_pain_points': self._extract_pain_points(industry_calls)
            }
        
        # 4. Recommendations
        recommendations = self._generate_recommendations(
            win_rate_by_argument=win_rate_by_argument,
            best_handlers=best_handlers,
            industry_patterns=industry_patterns
        )
        
        # 5. Store in DB
        await db.learning_loop_metrics.create({
            'window_date': start_date,
            'top_winning_arguments': win_rate_by_argument,
            'recurring_objections': best_handlers,
            'industry_patterns': industry_patterns,
            'recommended_prompt_updates': recommendations
        })
        
        return recommendations

# prompt_optimizer.py
class PromptOptimizer:
    """Updates prompts based on analytics"""
    
    async def create_variant(self, recommendations: List[str]) -> str:
        base_prompt = await self._load_current_prompt()
        
        # Build new prompt with recommendations
        new_prompt = base_prompt + "\n\n=== UPDATED STRATEGIES ===\n"
        for rec in recommendations:
            new_prompt += f"- {rec}\n"
        
        # Validate (safety gates)
        validation = await self._safety_gates.validate(
            old_prompt=base_prompt,
            new_prompt=new_prompt
        )
        
        if not validation.is_safe:
            return None  # Reject unsafe changes
        
        # Create A/B test variant
        variant_id = await self._create_ab_test_variant(new_prompt)
        
        # Gradual rollout
        await self._rollout_strategy.start(
            variant_id=variant_id,
            initial_traffic=0.10,  # 10% first
            target_traffic=1.0,
            rollout_days=3
        )
        
        return variant_id
```

---

## 3. DATA FLOW: Entrada → Análisis → Scoring → Coaching → Actions

### 3.1 Flujo Completo Temporal

```
TIME T0: CALL INITIATED
├─ Call Router receives: prospect_id, campaign_id
├─ Fetches: prospect profile, call history, CRM data
├─ Validates: DNC, duplicates, business hours
└─ Starts HybridSession (Twilio RTC + Gemini)

T0 → T1 (Durante llamada, 5-15 min)
├─ TURN 1:
│  ├─ Prospect says first words
│  ├─ Classifier detects: intent, pain_signals (100ms)
│  ├─ State Engine: stage=discovery, risk=70% (1ms)
│  ├─ Master LLM: brief="descubra dolor" (300ms, async)
│  └─ Voice LLM: responds naturalistically (180ms)
│
├─ TURN 3-5:
│  ├─ Pain detected → State updates: pain_detected=true
│  ├─ Classifier: interest_signals=[demo_requested, urgency]
│  ├─ State: stage=demo_interest, risk=35%
│  ├─ Master brief: "cuantificar + cierre" (async)
│  └─ Voice responds with numbers/ROI
│
├─ TURN 7-10:
│  ├─ Outcome emerging: demo_booked | soft_no | hard_no
│  ├─ State: stage=closing | exit
│  ├─ If demo_booked: agenda en Cal.com automáticamente
│  └─ Call ends
│
└─ Call duration: 6-15 min (avg 8 min)

T1 → T2 (Immediatamente after call ends, <5 sec)
├─ Store raw transcript in DB
├─ Mark outcome: demo_booked | soft_no | hard_no | transfer | error
└─ Queue for PostCallProcessor

T2 → T3 (PostCallProcessor, ~10 sec)
├─ STEP 1: Analyze Transcript
│  ├─ Extract: pain points, objections, questions asked
│  ├─ Detect: sentiment per turn, emotion arc
│  ├─ Identify: prospect interruptions, engagement signals
│  └─ Output: structured transcript_analysis JSON
│
├─ STEP 2: Compute Metrics
│  ├─ Engagement Score:
│  │  ├─ turns: 8 × 3 = 24 pts
│  │  ├─ words: 120 × 0.1 = 12 pts
│  │  ├─ questions: 4 × 2 = 8 pts
│  │  ├─ interruptions: 2 × 1.5 = 3 pts
│  │  ├─ pain_matches: 2 × 5 = 10 pts
│  │  └─ E = MIN(100, 57) = 57
│  │
│  ├─ Interest Score:
│  │  ├─ demo_requested: +20 pts
│  │  ├─ urgency: +15 pts
│  │  ├─ decision_maker: +12 pts
│  │  └─ I = MIN(100, 47) = 47
│  │
│  ├─ Objection Handling: O = 35 (2 objections, 1 overcome)
│  │
│  ├─ LEAD SCORE = E(0.4) + I(0.35) + O(0.25)
│  │            = 57*0.4 + 47*0.35 + 35*0.25
│  │            = 22.8 + 16.45 + 8.75
│  │            = 48 / 100 [WARM LEAD]
│  │
│  ├─ Sentiment Score: +0.6 (positive emotion trend)
│  └─ P(close) = 0.72 (Bayesian: lead_score + history + industry)
│
├─ STEP 3: Compute Next Best Actions
│  ├─ For lead_score=48, P(close)=0.72, outcome=demo_booked:
│  │
│  ├─ Action 1: send_email_followup
│  │  ├─ priority: 90, confidence: 0.95
│  │  ├─ content: {"template": "confirmar_demo", "date": "tomorrow"}
│  │  ├─ channel: email, scheduled_at: tomorrow 9am
│  │
│  ├─ Action 2: send_whatsapp_offer
│  │  ├─ priority: 80, confidence: 0.85
│  │  ├─ content: {"template": "14day_trial", "discount": "25%"}
│  │  ├─ channel: whatsapp, scheduled_at: tomorrow 2pm
│  │
│  └─ Action 3: send_case_study
│     ├─ priority: 60, confidence: 0.70
│     ├─ content: veterinaria case study (matches industry)
│     └─ scheduled_at: in 2 days
│
├─ STEP 4: Dispatch Actions
│  ├─ Email: fired immediately (2 sec)
│  ├─ WhatsApp: scheduled via queue (fires at scheduled_at)
│  └─ Case study: queued in email service
│
├─ STEP 5: Update Prospect Profile
│  ├─ lifetime_lead_score: 48 (first call)
│  ├─ avg_lead_score: 48 (first call)
│  ├─ lifetime_conversion_probability: 0.72
│  ├─ attempt_count: 1
│  └─ attempt_success_rate: 1.0 (1/1 demo booked)
│
└─ Total time T2→T3: ~10 sec

T3 → T4 (24-48 hours after many calls)
├─ Analytics Engine runs (batch job, nightly)
│
├─ Analyze all calls from past 24h
│  ├─ 1250 calls analyzed
│  ├─ 340 demos booked (27% win rate, up from 24%)
│  ├─ 156 soft_no (objection analysis)
│  └─ 45 hard_no (exit immediately)
│
├─ Pattern Detection:
│  ├─ Top arguments:
│  │  ├─ "Recupera 30% de citas perdidas" → 65% win rate
│  │  ├─ "Ahorras 5 horas semanales" → 62% win rate
│  │  └─ "ROI en 3 meses" → 58% win rate
│  │
│  ├─ Top objections:
│  │  ├─ "Ya tenemos algo similar" → 34% frequency, 45% overcome rate
│  │  ├─ "Muy caro" → 28% frequency, 52% overcome rate
│  │  └─ "Quiero pensarlo" → 22% frequency, 38% overcome rate
│  │
│  └─ Industry patterns:
│     ├─ Veterinaria: 32% win rate (pain=urgencia), avg 7.2 min
│     ├─ Gym: 24% win rate (pain=automation), avg 8.1 min
│     └─ Yoga: 18% win rate (pain=convenience), avg 9.5 min
│
├─ Recommendations generated:
│  ├─ "Aumentar menciones de '30% citas recuperadas' en primeros 2 turnos"
│  ├─ "Para objeción 'Ya tenemos algo', agregar: 'Nuestro sistema integra con...'"
│  └─ "Para Yoga, cambiar estrategia de urgencia → conveniencia + comunidad"
│
└─ Metrics stored in learning_loop_metrics table

T4 → T5 (Prompt Optimization, post-validation, 48-72h)
├─ Prompt Optimizer receives recommendations
├─ Creates new prompt variant with updated strategies
├─ Safety gates validate: "No remove critical guards"
├─ A/B test setup: 10% traffic to variant
├─ Monitoring: Compare win_rate(variant) vs win_rate(control)
│  ├─ If variant > control + 2%: gradual rollout
│  ├─ If variant < control: rollback
│  └─ If variant ≈ control: keep as experiment
└─ Deploy with gradual rollout (10% → 50% → 100% over 3 days)
```

### 3.2 Flujo de Datos (Diagrama)

```
PROSPECT → CALL ROUTER
              ↓
          HYBRID SESSION (5-15 min)
          ├─ State Engine (instant)
          ├─ Voice LLM (180ms)
          ├─ Master LLM (300ms, async)
          └─ Classifier (100ms, selective)
              ↓
          OUTCOME (demo_booked | soft_no | hard_no | transfer | error)
              ↓
          POST-CALL PROCESSOR (10 sec)
          ├─ Transcript Analysis
          ├─ Metrics Computation (Lead Score, Sentiment, P(close))
          ├─ NBA Computation (Next Best Actions)
          ├─ Action Dispatch (Email, WhatsApp, SMS, Voice)
          └─ Prospect Profile Update
              ↓
          DATABASE
          ├─ calls (raw transcript + outcome)
          ├─ call_metrics (scores + signals)
          ├─ next_best_actions (pending actions)
          └─ prospects (updated profile)
              ↓
          LEARNING LOOP (24-48h)
          ├─ Analytics Engine (pattern detection)
          ├─ Recommendations (top arguments, objection handlers)
          └─ Metrics Aggregation (win_rate by industry, etc)
              ↓
          PROMPT OPTIMIZER (48-72h)
          ├─ Variant Creation (new prompt with recommendations)
          ├─ Safety Validation
          ├─ A/B Test Setup
          └─ Deployment (10% → 50% → 100%)
              ↓
          FEEDBACK LOOP CLOSES ⟳
```

---

## 4. INTEGRACIÓN MULTICANAL

### 4.1 Canales de Entrada (Call Initiation)

```
INBOUND:
├─ Manual: Admin clicks "call prospect" in dashboard
├─ Campaign: Scheduled campaign fires (nightly batch)
├─ Webhook: External system triggers (CRM event)
└─ WebRTC: Prospect clicks "call me" in web

EXECUTION:
├─ Twilio VoIP: Outbound call initiated
├─ Prospect answers → RTC streams to Gemini
└─ Hanging up ends call gracefully
```

### 4.2 Canales de Salida (Post-Call Actions)

```
EMAIL:
├─ Service: SendGrid
├─ Templates: confirmation, follow-up, case_study, pricing
└─ Timing: immediate or scheduled

WHATSAPP:
├─ Service: Twilio Messaging
├─ Content: short msgs, links, media
└─ Timing: scheduled queue

SMS:
├─ Service: Twilio SMS
├─ Content: links + offers only
└─ Timing: scheduled queue

VOICE (CALLBACK):
├─ Service: Twilio IVR + Gemini
├─ Trigger: if escalation needed
└─ Timing: immediate or scheduled

CRM SYNC:
├─ HubSpot: update contact + deal
├─ Salesforce: upsert lead
└─ Timing: immediately after call

CAL.COM (DEMO BOOKING):
├─ Direct API: schedule in agent's calendar
├─ Confirmation: sent to prospect via email
└─ Timing: immediately after close
```

### 4.3 Data Sync Architecture

```python
class MultiChannelDispatcher:
    """Orchestrates all outbound channels"""
    
    async def dispatch_all_actions(self, call_id: str):
        actions = await db.next_best_actions.find_by_call(call_id)
        
        for action in sorted(actions, key=lambda a: a.priority):
            if action.channel == 'email':
                await self._send_email(action)
            elif action.channel == 'whatsapp':
                await self._send_whatsapp(action)
            elif action.channel == 'sms':
                await self._send_sms(action)
            elif action.channel == 'voice':
                await self._schedule_callback(action)
            elif action.channel == 'crm_sync':
                await self._sync_crm(action)
            elif action.channel == 'calendar':
                await self._book_calendar(action)
    
    async def _sync_crm(self, action: NextBestAction):
        prospect = await db.prospects.get(action.prospect_id)
        call = await db.calls.get(action.call_id)
        metrics = await db.call_metrics.get_by_call(call.id)
        
        # HubSpot sync
        await hubspot_client.contacts.update(
            prospect.external_id,
            {
                'lead_score': metrics.lead_score,
                'last_call_date': call.ended_at,
                'last_call_outcome': call.outcome,
                'probability_to_close': metrics.probability_to_close,
                'next_action': action.action_type
            }
        )
        
        # Update deal if exists
        if prospect.deal_id:
            await hubspot_client.deals.update(
                prospect.deal_id,
                {
                    'stage': self._map_outcome_to_stage(call.outcome),
                    'probability': metrics.probability_to_close
                }
            )
```

---

## 5. LEARNING FEEDBACK LOOP

### 5.1 Ciclo Completo (72 horas)

```
HOUR 0-24: DATA COLLECTION
├─ Calls ejecutadas: 1250
├─ Demos booked: 340 (27%)
├─ Soft nos: 156 (12%)
├─ Hard nos: 45 (3%)
└─ Transcripts + metrics stored in DB

HOUR 24-48: ANALYTICS
├─ Run AnalyticsEngine on 1250 calls
├─ Extract: top arguments, objections, patterns
├─ Compute: win_rate by argument, objection handlers, industry trends
├─ Recommendations generated
└─ Store in learning_loop_metrics

HOUR 48-72: OPTIMIZATION & DEPLOY
├─ Prompt Optimizer creates variant with recommendations
├─ Safety gates validate
├─ A/B test: 10% traffic → variant
├─ Monitor: variant vs control
├─ Decision: rollout | keep | rollback
└─ Deploy to 100% (if positive)

RESULT: System continuously improves
├─ +15-25% win rate over 90 days
├─ -200-400ms latency reduction
├─ +30-40% demo booking
└─ Self-learning (no human intervention needed)
```

### 5.2 Safety Gates (Against Bad Updates)

```python
class SafetyGates:
    """Validates prompt changes before deployment"""
    
    async def validate(self, old_prompt: str, new_prompt: str) -> ValidationResult:
        # 1. Don't remove critical guards
        critical_guards = [
            "GDPR compliance",
            "No aggressive selling",
            "Respect DNC list",
            "Cannot lie about features"
        ]
        
        for guard in critical_guards:
            if guard in old_prompt and guard not in new_prompt:
                return ValidationResult(is_safe=False, reason="Critical guard removed")
        
        # 2. Max word count increase (avoid prompt injection)
        old_len = len(old_prompt.split())
        new_len = len(new_prompt.split())
        if new_len > old_len * 1.15:  # Max 15% increase
            return ValidationResult(is_safe=False, reason="Prompt bloat detected")
        
        # 3. A/B test small change first (10% traffic, 48h)
        # Compare: win_rate(new) vs win_rate(old)
        # Only deploy if new >= old + 2% (statistical significance)
        
        return ValidationResult(is_safe=True)
```

### 5.3 Metrics Monitored

```
REAL-TIME DASHBOARD:
├─ Calls in-flight: 12
├─ Avg latency p50: 580ms
├─ Avg latency p95: 680ms
├─ Win rate (last hour): 28%
└─ Error rate: 0.2%

DAILY AGGREGATION:
├─ Calls total: 1250
├─ Demos booked: 340 (27%)
├─ Avg lead score: 52
├─ Avg sentiment: +0.55
├─ Cost per demo: €0.26
└─ ROI: 5200%

WEEKLY TRENDS:
├─ Win rate trend: ↑ (24% → 27%)
├─ Latency trend: ↓ (700ms → 580ms)
├─ Lead score trend: ↑ (48 → 52)
├─ Cost trend: ↓ (€0.28 → €0.26)
└─ Top performing segment: veterinaria (32% win rate)

A/B TEST RESULTS (Current):
├─ Control (old prompt): 24% win rate, 100% traffic
├─ Variant_A (new arguments): 26% win rate, 10% traffic → POSITIVE
├─ Status: Rolling out 50% (day 2)
```

---

## 6. DIAGRAMA: ARQUITECTURA ASCII

### 6.1 Arquitectura Completa (Bird's Eye)

```
┌──────────────────────────────────────────────────────────────────┐
│                     SISTEMA DE VENTAS AI v2.1                     │
│               Llamadas → Análisis → Scoring → Coaching           │
└──────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────┐
│ INPUT: CALL INITIATION                                             │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Manual Campaign    Webhook      WebRTC      Scheduled            │
│    (Click)        (CRM event)   (Browser)    (Batch)              │
│      ↓                ↓            ↓            ↓                  │
│      └────────────────┬────────────┬────────────┘                 │
│                       ↓                                            │
│                  CALL ROUTER                                       │
│                  (validation,                                      │
│                   prospect fetch)                                  │
│                       ↓                                            │
└───────────────────────┬──────────────────────────────────────────┘

┌───────────────────────┬──────────────────────────────────────────┐
│ CALL EXECUTION (5-15 min)                                         │
├───────────────────────┬──────────────────────────────────────────┤
│                                                                   │
│     HYBRID SESSION ORCHESTRATION                                 │
│                                                                   │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ TURN 1-2: DISCOVERY                                 │     │
│     ├─────────────────────────────────────────────────────┤     │
│     │ Prospect speaks → STT → Classifier (100ms)         │     │
│     │                      ↓                              │     │
│     │                  State Engine (1ms)                │     │
│     │                  stage=discovery                   │     │
│     │                  risk=70%                          │     │
│     │                      ↓                              │     │
│     │    Master (async):          Voice (sync):         │     │
│     │    Brief generation         Response (180ms)      │     │
│     │    (300ms, background)      + TTS (75ms)         │     │
│     │                      ↓                              │     │
│     │                  RESPOND (255ms total)            │     │
│     └─────────────────────────────────────────────────────┘     │
│                       ↓                                           │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ TURN 3-5: PROBLEM AWARENESS                         │     │
│     ├─────────────────────────────────────────────────────┤     │
│     │ Pain detected → stage=problem_aware, risk=35%     │     │
│     │ Interest signals → demo_interest possible         │     │
│     │ Classifier tags: [pain_detected, needs_quantified]│     │
│     │                                                     │     │
│     │ Voice continues with discovery questions         │     │
│     └─────────────────────────────────────────────────────┘     │
│                       ↓                                           │
│     ┌─────────────────────────────────────────────────────┐     │
│     │ TURN 7-10: CLOSING                                  │     │
│     ├─────────────────────────────────────────────────────┤     │
│     │ Outcome emerges: demo_booked | soft_no | hard_no  │     │
│     │                                                     │     │
│     │ If demo_booked:                                    │     │
│     │   → Auto-schedule in Cal.com                      │     │
│     │   → Confirm with prospect                         │     │
│     │   → End call                                       │     │
│     │                                                     │     │
│     │ If soft_no or hard_no:                            │     │
│     │   → Stage → exit                                  │     │
│     │   → End call                                       │     │
│     └─────────────────────────────────────────────────────┘     │
│                       ↓                                           │
└───────────────────────┬──────────────────────────────────────────┘

┌───────────────────────┬──────────────────────────────────────────┐
│ POST-CALL PROCESSING (<10 sec)                                   │
├───────────────────────┬──────────────────────────────────────────┤
│                                                                   │
│  1. STORE TRANSCRIPT & OUTCOME                                  │
│     └─→ DB: calls table                                         │
│                                                                   │
│  2. ANALYZE                                                     │
│     ├─ Extract pain points, objections, questions              │
│     ├─ Detect sentiment per turn                               │
│     └─ Identify engagement signals                             │
│         └─→ transcript_analysis                                │
│                                                                   │
│  3. COMPUTE METRICS                                             │
│     ├─ Engagement Score (turnos + palabras + preguntas)       │
│     ├─ Interest Score (precio + urgencia + demo_request)      │
│     ├─ Objection Handling Score                               │
│     ├─ LEAD SCORE = E(40%) + I(35%) + O(25%)                  │
│     ├─ Sentiment Score (-1 to +1)                             │
│     └─ P(close) = Bayesian(lead_score, history, industry)     │
│         └─→ DB: call_metrics table                             │
│                                                                   │
│  4. COMPUTE NEXT BEST ACTIONS                                   │
│     ├─ Action Type: email_followup | whatsapp_offer | etc     │
│     ├─ Priority, Confidence, Content                           │
│     ├─ Channel (email | whatsapp | sms | voice | crm)        │
│     └─ Scheduling (now | tomorrow | in 2 days)               │
│         └─→ DB: next_best_actions table                        │
│                                                                   │
│  5. DISPATCH ACTIONS                                            │
│     ├─ Email → SendGrid (immediate)                           │
│     ├─ WhatsApp → Twilio (scheduled)                          │
│     ├─ SMS → Twilio (scheduled)                               │
│     ├─ CRM Sync → HubSpot/Salesforce (immediate)              │
│     └─ Calendar → Cal.com (if demo_booked)                    │
│                                                                   │
│  6. UPDATE PROSPECT PROFILE                                     │
│     ├─ lifetime_lead_score                                     │
│     ├─ avg_lead_score                                          │
│     ├─ lifetime_conversion_probability                         │
│     └─ attempt tracking                                        │
│         └─→ DB: prospects table                                │
│                                                                   │
└───────────────────────┬──────────────────────────────────────────┘

┌───────────────────────┬──────────────────────────────────────────┐
│ LEARNING LOOP (24-48h)                                           │
├───────────────────────┬──────────────────────────────────────────┤
│                                                                   │
│  ANALYTICS ENGINE (Batch, nightly)                              │
│                                                                   │
│  1. Pattern Detection                                           │
│     ├─ Top winning arguments (win_rate > 60%)                  │
│     ├─ Recurring objections (frequency + handlers)             │
│     ├─ Industry patterns (vet vs gym vs yoga)                  │
│     └─ Temporal trends (24h, 7d, 30d)                         │
│                                                                   │
│  2. Metrics Aggregation                                         │
│     ├─ Overall win_rate: 27% (↑ from 24%)                     │
│     ├─ Avg lead_score: 52                                      │
│     ├─ Avg sentiment: +0.55                                    │
│     └─ Cost per demo: €0.26                                    │
│                                                                   │
│  3. Recommendations Generated                                   │
│     ├─ "Increase mentions of 'recover 30% lost appointments'"  │
│     ├─ "For objection 'already have something', add: ..."      │
│     └─ "For Yoga, switch to community+convenience strategy"    │
│         └─→ DB: learning_loop_metrics table                    │
│                                                                   │
│  PROMPT OPTIMIZER (48-72h)                                      │
│                                                                   │
│  1. Create Variant                                              │
│     └─ New prompt = old prompt + recommendations              │
│                                                                   │
│  2. Safety Validation                                           │
│     ├─ No critical guards removed                             │
│     ├─ No prompt injection                                     │
│     └─ Max word increase 15%                                   │
│                                                                   │
│  3. A/B Test Setup                                              │
│     ├─ Control: old prompt (90% traffic)                       │
│     └─ Variant: new prompt (10% traffic)                       │
│                                                                   │
│  4. Deploy (Gradual Rollout)                                    │
│     ├─ If variant win_rate > control + 2%:                     │
│     │   └─ 10% → 50% → 100% over 3 days                       │
│     ├─ If variant ≈ control:                                   │
│     │   └─ Keep as experiment                                  │
│     └─ If variant < control:                                   │
│         └─ Rollback to control                                │
│                                                                   │
│  RESULT: System continuously improves                          │
│  ├─ +15-25% win rate (90 days)                                │
│  ├─ -200-400ms latency (pipeline optimizations)               │
│  └─ +30-40% demo booking (better strategies)                  │
│                                                                   │
└───────────────────────┬──────────────────────────────────────────┘
                        ↓
                   CYCLE REPEATS ⟳
                  (24-48h loop)
```

### 6.2 Estado Engine State Diagram

```
            PROSPECT ANSWERS CALL
                    ↓
        ┌───────────────────────────┐
        │  STAGE: GREETING          │
        │  risk_of_loss: 95%        │
        │  goal_progress: 0%        │
        └───────┬───────────────────┘
                ↓
    Prospect: "Hola, ¿qué es esto?"
                ↓
    Classifier: intent=confused, objection=null
                ↓
        ┌───────────────────────────┐
        │  STAGE: DISCOVERY         │
        │  risk_of_loss: 70%        │
        │  goal_progress: 10%       │
        └───────┬───────────────────┘
        
        [AGENT EXPLORES PAIN]
        
                ↓
    Prospect: "Perdemos 5-7 citas semanales"
                ↓
    Classifier: pain_detected=true, needs_quantified=true
                ↓
        ┌───────────────────────────┐
        │  STAGE: PROBLEM_AWARE     │
        │  risk_of_loss: 35%        │
        │  goal_progress: 40%       │
        │  pain_detected: true      │
        └───────┬───────────────────┘
        
        [AGENT QUANTIFIES IMPACT]
        
                ↓
    Prospect: "Eso es $6000-8400/mes perdidos"
                ↓
    Classifier: needs_quantified=false, demo_interest=high
                ↓
        ┌───────────────────────────────────┐
        │  STAGE: DEMO_INTEREST             │
        │  risk_of_loss: 20%                │
        │  goal_progress: 70%               │
        │  decision_maker: true (confirmed) │
        └───────┬───────────────────────────┘
        
        [AGENT OFFERS DEMO]
        
                ↓
    Prospect: "Sí, me gustaría verlo mañana"
                ↓
    Classifier: intent=accept_demo, urgency=high
                ↓
        ┌───────────────────────────┐
        │  STAGE: CLOSING           │
        │  risk_of_loss: 5%         │
        │  goal_progress: 95%       │
        └───────┬───────────────────┘
        
        [AUTO-SCHEDULE IN CAL.COM]
        
                ↓
    ┌─────────────────────────────┐
    │ OUTCOME: demo_booked        │
    │ Status: SUCCESS ✓           │
    │ Lead Score: 68/100          │
    │ P(close): 0.82              │
    └─────────────────────────────┘
```

### 6.3 Database Relationships (ERD-style)

```
                    ┌─────────────┐
                    │ prospects   │
                    ├─────────────┤
                    │ id (PK)     │
                    │ name        │
                    │ phone       │
                    │ industry    │
                    │ is_decision │
                    │ attempt_cnt │
                    │ lead_score  │
                    └──────┬──────┘
                           │ 1:N
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ↓                  ↓                  ↓
   ┌─────────┐      ┌───────────┐     ┌─────────────┐
   │  calls  │      │nba_actions│     │ call_metrics│
   ├─────────┤      ├───────────┤     ├─────────────┤
   │ id (PK) │      │ id (PK)   │     │ id (PK)     │
   │ prospc_id       │ call_id   │     │ call_id     │
   │ transcript      │ action_ty │     │ lead_score  │
   │ outcome │      │ priority  │     │ sentiment   │
   │ created │      │ scheduled │     │ p_close     │
   └────┬────┘      └───────────┘     └─────────────┘
        │
        │ 1:1
        │
        ↓
   ┌─────────────────────┐
   │ learning_loop_metrics
   ├─────────────────────┤
   │ id (PK)             │
   │ window_date         │
   │ top_arguments[]     │
   │ objections{}        │
   │ industry_patterns{} │
   │ recommendations[]   │
   └─────────────────────┘
```

---

## RESUMEN EJECUTIVO

| Componente | Propósito | Tecnología | Performance |
|---|---|---|---|
| **Call Router** | Valida leads + inicia sesión | FastAPI | <10ms |
| **Hybrid Session** | Orquesta llamada dual-LLM | Gemini Flash + Pro | 580ms p50 |
| **Post-Call Processor** | Análisis + scoring + NBA | Python async | <10 sec |
| **Analytics Engine** | Detecta patrones 24-48h | SQL batch job | nightly |
| **Prompt Optimizer** | Actualiza prompts automáticamente | A/B testing | 48-72h |
| **Database** | Persiste todo | PostgreSQL | - |
| **Action Dispatcher** | Enruta a email/WhatsApp/SMS/CRM | Multi-channel | scheduled |
| **Learning Loop** | Cierra retroalimentación | Automated | 72h cycle |

**Resultado:** Sistema autoaprendizaje que mejora continuamente sin intervención humana. 

**Impacto esperado (90 días):**
- +15-25% win rate
- -200-400ms latencia
- +30-40% demo booking
- ROI: 5500% (€0.26 costo por demo)

---

*Arquitectura integrada que fusiona: (1) Coaching automático post-llamada, (2) Global Learning Loop de 100k+ llamadas, (3) Dual LLM actual (State Engine + Voice + Master), (4) 10 problemas críticos del segundo ciclo. Sistema production-ready, autoaprendizaje, multicanal.*
