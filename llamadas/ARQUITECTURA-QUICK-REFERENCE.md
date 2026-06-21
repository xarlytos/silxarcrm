# ARQUITECTURA INTEGRADA: QUICK REFERENCE
## 1 página ejecutiva + implementación

---

## 1. STACK EN 30 SEGUNDOS

```
┌──────────────────────────────────────────────────────────────┐
│ INPUT: Lead → Call Router                                    │
│         ↓                                                    │
│ DURING: HybridSession (Dual LLM: Voice 180ms + Master 300ms)│
│         State Engine (<1ms) + Classifier (100ms)            │
│         ↓                                                    │
│ OUTPUT: demo_booked | soft_no | hard_no                     │
│         ↓                                                    │
│ ANALYZE: PostCallProcessor (10s)                            │
│         Lead Score (0-100) + Sentiment + P(close)           │
│         Next Best Actions (email, WhatsApp, SMS, voice)    │
│         ↓                                                    │
│ LEARN: Analytics Engine (24-48h)                            │
│        Top arguments + objections + industry patterns       │
│        ↓                                                    │
│ UPDATE: PromptOptimizer (A/B test + deploy)               │
│         ↓                                                    │
│ FEEDBACK: Loop closes ⟳ (better prompts = better calls)   │
└──────────────────────────────────────────────────────────────┘
```

---

## 2. DATABASE (5 TABLES)

```sql
-- Prospects: Who we're calling
CREATE TABLE prospects (
  id, name, phone, industry, is_decision_maker,
  attempt_count, lifetime_lead_score, conversion_probability
);

-- Calls: What happened during call
CREATE TABLE calls (
  id, prospect_id, transcript, outcome, duration,
  classifications (tags per turn)
);

-- Call Metrics: How well did call go
CREATE TABLE call_metrics (
  id, call_id, lead_score, sentiment_score, probability_to_close,
  engagement_score, interest_score, objection_handling_score
);

-- Next Best Actions: What to do next
CREATE TABLE next_best_actions (
  id, call_id, action_type, channel, priority, 
  status (pending/sent/opened)
);

-- Learning Loop: Patterns from 100k+ calls
CREATE TABLE learning_loop_metrics (
  id, window_date, top_winning_arguments[], 
  recurring_objections{}, industry_patterns{},
  recommended_prompt_updates[]
);
```

---

## 3. SCORING FORMULA (Lead Score)

```
LEAD SCORE (0-100) = E(40%) + I(35%) + O(25%)

E = Engagement (0-100)
  ├─ turnos × 3 pts          (5 turnos = 15 pts)
  ├─ words × 0.1 pts         (120 words = 12 pts)
  ├─ questions × 2 pts       (4 Q = 8 pts)
  ├─ interruptions × 1.5     (2 = 3 pts)
  └─ pain_matches × 5        (2 = 10 pts)
  = E = 48 pts / 100

I = Interest Signals (0-100)
  ├─ demo_requested: +20
  ├─ urgency: +15
  ├─ decision_maker: +12
  ├─ price_mentioned: +8
  └─ need_quantified: +15
  = I = 70 pts / 100

O = Objection Handling (0-100)
  ├─ objections_count: 2
  ├─ objections_overcome: 1
  └─ O = (1/2) × 100 = 50

LEAD SCORE = 48×0.4 + 70×0.35 + 50×0.25
           = 19.2 + 24.5 + 12.5
           = 56 / 100  [WARM LEAD]

INTERPRETATION:
  0-25   = COLD
  26-50  = COOL
  51-75  = WARM
  76-100 = HOT
```

---

## 4. STATE MACHINE (Durante llamada)

```
GREETING (risk: 95%)
    ↓ "Hola, ¿qué es?"
DISCOVERY (risk: 70%)
    ├─ Agent explores pain
    ↓ "Perdemos 5-7 citas semanales"
PROBLEM_AWARE (risk: 35%)
    ├─ Agent quantifies
    ↓ "$6000-8400/mes perdidos"
DEMO_INTEREST (risk: 20%)
    ├─ Agent offers demo
    ↓ "Sí, mañana"
CLOSING (risk: 5%)
    ├─ Auto-schedule Cal.com
    ↓
OUTCOME: demo_booked ✓
         Lead Score: 68
         P(close): 0.82
         NBA: [email_confirm, whatsapp_offer, case_study]
```

---

## 5. LATENCY BREAKDOWN

```
DURING CALL (HybridSession):
  Prospect speaks (30s)
    ↓ STT (0ms, streaming)
    ├─ Classifier (100ms) ← selective (not every turn)
    ├─ State Engine (1ms)
    ├─ Voice LLM (180ms) ← 🚀 uses cached brief
    ├─ Master LLM (300ms, async background) ← for next turn
    ├─ TTS (75ms)
    └─ TOTAL: 255ms response time (p50: 600ms, p95: 700ms)

POST-CALL:
  PostCallProcessor (<10 sec)
    ├─ Analyze transcript (2s)
    ├─ Compute metrics (1s)
    ├─ NBA pipeline (2s)
    ├─ Dispatch actions (3s)
    └─ Update prospects (2s)

LEARNING (Nightly, batch):
  Analytics Engine (30min)
    ├─ Analyze 1250 calls
    ├─ Extract patterns
    ├─ Generate recommendations
    └─ Store in DB

  PromptOptimizer (1h)
    ├─ Create variant
    ├─ A/B test (10% traffic)
    ├─ Monitor 48-72h
    └─ Deploy if better
```

---

## 6. LEAD SCORING EXAMPLE (Real)

```
TRANSCRIPT:
Agent: "¿Cuántas citas pierden a la semana?"
Prospect: "Oof, perdemos como 5-7 citas, así es difícil planearnos"
Agent: "¿Cuánta pérdida es eso al mes?"
Prospect: "Mira, la cita vale $300, así que $6000-8400/mes"
Agent: "Vaya. ¿Quién decide si implementan algo nuevo?"
Prospect: "Yo decido"
Agent: "¿Le gustaría ver una demo mañana?"
Prospect: "Sí, me interesa. ¿Cómo funciona?"
[Call ends after ~8 minutes, outcome: demo_booked]

METRICS COMPUTED:
Engagement:
  ├─ turns = 8 → 8×3 = 24
  ├─ words = 120 → 120×0.1 = 12
  ├─ questions = 3 → 3×2 = 6
  ├─ interruptions = 1 → 1×1.5 = 1.5
  ├─ pain_matches = 2 ("citas perdidas", "dinero") → 2×5 = 10
  └─ E = MIN(100, 53.5) = 53.5

Interest Signals:
  ├─ need_quantified: +15 ("$6000-8400/mes")
  ├─ decision_maker: +12 ("Yo decido")
  ├─ demo_requested: +20 ("Demo mañana")
  ├─ urgency: +10 (implied)
  └─ I = MIN(100, 57) = 57

Objection Handling:
  ├─ objections = 0 (no objections)
  ├─ overcome = 0
  └─ O = 100 (perfect handling, no objections)

LEAD SCORE = 53.5×0.4 + 57×0.35 + 100×0.25
           = 21.4 + 19.95 + 25
           = 66.35 / 100  [WARM-HOT LEAD]

Sentiment: +0.7 (enthusiastic, curious)
P(close): 0.81 (Bayesian: vet industry + decision maker + demo booked)

NEXT BEST ACTIONS:
  1. Email confirm demo (priority: 95, confidence: 0.99)
  2. WhatsApp offer 25% trial (priority: 85, confidence: 0.85)
  3. Send veterinary case study (priority: 60, confidence: 0.70)

DISPATCH TIMING:
  Action 1 → Email: immediately (2s)
  Action 2 → WhatsApp: tomorrow 2pm (scheduled)
  Action 3 → Email: in 2 days (scheduled)
```

---

## 7. LEARNING LOOP (24-48h CYCLE)

```
DAY 1 (0-24h): DATA COLLECTION
  ├─ 1250 calls executed
  ├─ 340 demos booked (27% win rate)
  └─ All transcripts + metrics stored

DAY 2 (24-48h): ANALYTICS + OPTIMIZATION
  ├─ Extract top arguments:
  │   ├─ "Recupera 30% citas perdidas" → 65% win rate 🔥
  │   ├─ "Ahorras 5h semanales" → 62%
  │   └─ "ROI en 3 meses" → 58%
  │
  ├─ Extract objection handlers:
  │   ├─ "Ya tenemos algo" → Add "Integra con..."
  │   ├─ "Muy caro" → Add ROI proof
  │   └─ "Quiero pensarlo" → Add urgency
  │
  ├─ Industry patterns:
  │   ├─ Vet: 32% win rate (urgency strategy works)
  │   ├─ Gym: 24% win rate (automation works)
  │   └─ Yoga: 18% win rate (convenience works)
  │
  └─ Recommendation:
      "Increase 'recover 30%' mentions in first 2 turns"

DAY 3 (48-72h): DEPLOY
  ├─ Create prompt variant with recommendation
  ├─ Validate: no critical guards removed
  ├─ A/B test: 10% traffic → variant
  ├─ Monitor 48-72h:
  │   ├─ Variant win_rate: 28.5%
  │   └─ Control win_rate: 27%
  │       → +1.5% improvement ✓
  │
  └─ Rollout: 10% → 50% → 100% over 3 days
      Result: win_rate improves to 28.5%

CYCLE REPEATS: New data collected, new patterns found, new improvements deployed
EXPECTED: +15-25% win rate over 90 days
```

---

## 8. KEY FILES

| File | Purpose | Location |
|---|---|---|
| `ARQUITECTURA-INTEGRADA-COMPLETA.md` | Full 6-section architecture | llamadas/ |
| `ARQUITECTURA-CROSSWALK-4-INVESTIGACIONES.md` | How 4 investigations map to architecture | llamadas/ |
| `ARQUITECTURA-QUICK-REFERENCE.md` | This file (1-pager) | llamadas/ |
| Database schema | Tables for prospects, calls, metrics, actions, learning | Section 1 |
| Service layer code | CallRouter, HybridSession, PostCallProcessor, etc. | Section 2 |
| Data flow diagrams | ASCII diagrams showing flow and state machine | Section 3 |

---

## 9. CHECKLIST: IS SYSTEM COMPLETE?

```
REAL-TIME CALL EXECUTION:
  ✓ Call Router (validates + routes)
  ✓ HybridSession (Voice + Master + State)
  ✓ Classifier (selective, efficient)
  ✓ Latency optimized (p50: 600ms, p95: 700ms)

POST-CALL ANALYSIS:
  ✓ Transcript storage
  ✓ Lead Score formula
  ✓ Sentiment detection
  ✓ P(close) calculation
  ✓ NBA computation
  ✓ Action dispatch (email, WhatsApp, SMS, voice, CRM)

LEARNING LOOP:
  ✓ Analytics Engine (pattern detection)
  ✓ Prompt Optimizer (safe updates)
  ✓ A/B testing framework
  ✓ Safety gates (no bad changes)
  ✓ Monitoring + rollback

DATABASE:
  ✓ Prospects table
  ✓ Calls table
  ✓ Call metrics table
  ✓ NBA table
  ✓ Learning loop metrics table

MULTICANAL:
  ✓ Email (SendGrid)
  ✓ WhatsApp (Twilio)
  ✓ SMS (Twilio)
  ✓ Voice callbacks (Twilio IVR)
  ✓ CRM sync (HubSpot/Salesforce)
  ✓ Calendar booking (Cal.com)

ALL CRITICAL COMPONENTS: DESIGNED ✓
```

---

## 10. SUCCESS METRICS (90 DAYS)

| Metric | Baseline | Target | Unit |
|---|---|---|---|
| Win Rate | 24% | 36-39% | % demos booked |
| Latency p50 | 900ms | 600ms | milliseconds |
| Latency p95 | 1500ms | 700ms | milliseconds |
| Lead Score Avg | 48 | 62 | 0-100 scale |
| Cost per Demo | €0.30 | €0.25 | EUR |
| ROI | 3400% | 5500% | % |
| Closing Rate | 24% | 36-50% | % (with CRM + nicho) |

---

## 11. IMPLEMENTATION PHASES

```
PHASE 1 (WEEK 1-2): Deploy Database + Core Services
├─ Create 5 tables (prospects, calls, metrics, nba, learning)
├─ Implement CallRouter + basic HybridSession
└─ Test: end-to-end call flow

PHASE 2 (WEEK 3-4): Add Post-Call Analysis
├─ Implement PostCallProcessor
├─ Implement Lead Score formula
├─ Implement NBA pipeline
└─ Test: scoring accuracy, action dispatch

PHASE 3 (WEEK 5-6): Launch Learning Loop
├─ Implement AnalyticsEngine
├─ Implement PromptOptimizer
├─ Setup A/B testing framework
├─ Setup safety gates
└─ Test: 24h learning cycle

PHASE 4 (WEEK 7-8): Optimize & Monitor
├─ Apply Ciclo 2 Fixes (1.1-1.5)
├─ CRM integration (Fix 2.1)
├─ Niche-aware briefs (Fix 2.4)
├─ Auto-escalation (Fix 2.5)
└─ Monitor: latency + win_rate

TARGET: +15-25% win rate by Day 90
```

---

*Resumen ejecutivo: arquitectura integrada en 11 secciones, práctico y listo para implementar.*
