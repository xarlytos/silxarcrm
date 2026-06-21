# 🏗️ ARQUITECTURA: DIAGRAMA VISUAL 4 FASES

---

## FASE 1: PROSPECT PROFILE ENGINE
### Flujo: Llamada 2 carga contexto de Llamada 1

```
┌─────────────────────────────────────────────────────────────────┐
│                        PROSPECT PROFILE ENGINE                   │
└─────────────────────────────────────────────────────────────────┘

BEFORE CALL STARTS (Llamada 2):
═════════════════════════════════════════════════════════════════

  Twilio Webhook (incoming call)
        │
        ├─→ get_prospect_profile(phone=+52-xxx, software_id=ABC)
        │   
        └─→ [PROSPECT_PROFILES table]
            ├─ name: "Juan García"
            ├─ company: "Clínica García"
            ├─ temperature: "warm"
            ├─ stated_budget: $2000-5000
            └─ objections: ["es muy caro"]
            
                 ↓
                 
        └─→ Context string for LLM:
            "Previous call: Juan mentioned budget is $2k-5k. 
             Objection: price. Try ROI argument."
             
                 ↓
                 
        └─→ MasterLLM.prepare_call_with_context()
            [Gemini gets this context + system prompt]
            
                 ↓
                 
        └─→ Voice Call Starts
            Agent says: "Hola Juan, vimos que tu presupuesto 
                        es alrededor de $2000-5000..."
            Juan: "Sí! Cómo lo sabes?"
            ✅ TRUST BUILDING


AFTER CALL ENDS (Llamada 2):
═════════════════════════════════════════════════════════════════

  Voice Call Ends
        │
        └─→ Transcript saved: [{role, text, timestamp}, ...]
            
                 ↓
                 
        └─→ PostCallExtractionEngine.extract_profile_data()
            [Gemini analyzes transcript]
            
                 ↓
                 
            Returns: {
              temperature: "hot",
              budget: {min: 2000, max: 5000, source: "explicit"},
              objections: [{text: "es muy caro", category: "price"}],
              motivators: [{keyword: "aumentar pacientes", freq: 2}],
              outcome: "soft_no",
              sentiment: 0.6
            }
            
                 ↓
                 
        └─→ ProspectService.update_profile_after_call()
            
                 ↓
                 
            [PROSPECT_PROFILES table] ← UPDATE
            ├─ temperature: "cold" → "warm" (score: 0.65)
            ├─ total_calls: 1 → 2
            ├─ last_called_at: NOW()
            ├─ objections: [...] + new objection
            └─ motivators: [...]
            
                 ↓
                 
            [CALL_TURNS table] ← INSERT
            ├─ prospect_id: uuid-xyz
            ├─ call_sid: twilio-123
            ├─ turns: [transcript...]
            └─ analysis: {sentiment: 0.6, outcome: "soft_no"}


DATABASE SCHEMA:
═════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────┐
│ prospect_profiles                                           │
├─────────────────────────────────────────────────────────────┤
│ id (PK)                 │ uuid                              │
│ software_id (IX)        │ multi-tenant                      │
│ phone (UQ)              │ normalized                        │
│ name, company, industry │ basic info                        │
│ temperature (IX)        │ cold → warm → hot → booked       │
│ temperature_score       │ 0.0 - 1.0                        │
│ interest_level          │ 1-5 scale                        │
│ stated_budget_min/max   │ NULL if not mentioned             │
│ budget_confidence       │ 0.0-1.0                          │
│ objections (JSON)       │ [{text, category, effectiveness}] │
│ motivators (JSON)       │ [{keyword, frequency, sentiment}]  │
│ is_decision_maker       │ true/false                        │
│ decision_maker_conf     │ 0.0-1.0                          │
│ created_at, updated_at  │ timestamps                        │
└─────────────────────────────────────────────────────────────┘
        ↓ FK
        │
        ├─────────────────────────────────────────────────────────┐
        │ call_turns                                              │
        ├─────────────────────────────────────────────────────────┤
        │ id (PK)                 │ uuid                          │
        │ prospect_id (FK, IX)    │ references prospect_profiles  │
        │ call_sid                │ twilio session id             │
        │ call_number             │ 1st, 2nd, 3rd call            │
        │ started_at, ended_at    │ timestamps                    │
        │ turns (JSON)            │ [{role, text, intent, ...}]   │
        │ analysis (JSON)         │ {sentiment, outcome, ...}     │
        └─────────────────────────────────────────────────────────┘


API ENDPOINTS:
═════════════════════════════════════════════════════════════════

POST /api/v1/prospects/profile
Request:  {phone, software_id}
Response: {status: "new"|"returning", prospect, engagement, history}
Latency:  <300ms p95
Use:      Before call starts

POST /api/v1/prospects/profile/update
Request:  {phone, software_id, call_data...}
Response: {status, prospect_id, profile}
Latency:  <500ms p95
Use:      After call ends

GET /api/v1/prospects/profile/{prospect_id}
Request:  prospect_id
Response: Full prospect record
Latency:  <100ms
Use:      Dashboard queries
```

---

## FASE 2: COACHING AUTOMÁTICO + LEAD SCORING
### Flujo: Post-call feedback + prospect prioritization

```
┌─────────────────────────────────────────────────────────────────┐
│              COACHING + LEAD SCORING ENGINE                      │
└─────────────────────────────────────────────────────────────────┘

AFTER CALL ENDS + PROFILE UPDATED:
═════════════════════════════════════════════════════════════════

Step 1: Calculate Lead Score
────────────────────────────

  prospect_profile (from Phase 1)
        │
        ├─→ LeadScoringEngine.calculate_lead_score()
        │   
        ├─→ Input metrics:
        │   ├─ budget_fit (30%):     $2k-5k budget vs our range? → 90/100
        │   ├─ company_size (20%):   1-5 person vs historical data → 70/100
        │   ├─ industry (15%):       dental industry conversion rate → 65/100
        │   ├─ engagement (20%):     temperature "warm" → 75/100
        │   └─ objections (15%):     how hard are objections? → 50/100
        │
        ├─→ Weighted calculation:
        │   (90×0.30) + (70×0.20) + (65×0.15) + (75×0.20) + (50×0.15)
        │   = 27 + 14 + 9.75 + 15 + 7.5
        │   = 73.25 ← LEAD SCORE
        │
        └─→ Classification:
            ├─ 80-100: 🌟 PREMIUM (ready to close)
            ├─ 60-79:  ⭐ QUALITY (high potential)  ← THIS ONE
            ├─ 40-59:  👥 STANDARD (nurture)
            └─ 0-39:   ❌ LOW (deprioritize)


Step 2: Generate Coaching Feedback
──────────────────────────────────

  transcript (from Phase 1) + prospect_profile + lead_score
        │
        ├─→ CoachingEngine.generate_coaching()
        │
        ├─→ Gemini analyzes:
        │   "Eres un coach de ventas. 
        │    Revisa esta llamada y dame feedback constructivo."
        │
        ├─→ Analyzes 5 areas:
        │   1. DISCOVERY (did you ask enough questions?)
        │   2. OBJECTION HANDLING (how did you handle objections?)
        │   3. CLOSING (did you try to close?)
        │   4. TONALITY (professional, empathetic?)
        │   5. PACING (let prospect talk enough?)
        │
        └─→ Returns coaching feedback:
        
            {
              "discovery": {
                "score": 0.4,
                "feedback": "No preguntaste presupuesto temprano",
                "improved_question": "¿Cuál es tu presupuesto aproximado?"
              },
              "objection_handling": {
                "score": 0.6,
                "feedback": "Respondiste a 'muy caro' con ROI. Bien.",
                "suggestion": "Pero intenta con case study de similar company"
              },
              "closing": {
                "score": 0.2,
                "feedback": "No cerraste! Prospect estaba warm.",
                "suggested_closing": "¿Agendamos demo para mañana?"
              },
              "overall_score": 0.40,
              "do_more": ["ask budget early", "use case studies"],
              "practice_area": "closing"
            }


Step 3: Save to Database
────────────────────────

  [lead_scores table] ← INSERT
  ├─ prospect_id: uuid-xyz
  ├─ call_id: uuid-abc
  ├─ lead_score: 73
  ├─ confidence: 0.75 (based on 2 calls)
  ├─ component_scores: {budget_fit: 90, company_size: 70, ...}
  ├─ strengths: ["🔥 Hot", "✅ Decision maker", "💰 Budget stated"]
  ├─ weaknesses: ["⚠️ Only 2 calls", "⚠️ Price objection"]
  └─ recommended_next_steps: ["Send ROI case study", "Schedule callback"]
  
  [coaching_feedback table] ← INSERT
  ├─ prospect_id: uuid-xyz
  ├─ call_id: uuid-abc
  ├─ coaching: {discovery, objection_handling, closing, ...}
  ├─ overall_score: 0.40
  ├─ do_more: ["ask budget early", "use case studies"]
  └─ practice_area: "closing"


DASHBOARD VIEW:
═════════════════════════════════════════════════════════════════

                Lead Score Dashboard
    ┌─────────────────────────────────────────────┐
    │ Name: Juan García                           │
    │ Company: Clínica García                     │
    │ Lead Score: 73 ⭐ QUALITY                   │
    │ Confidence: 75%                             │
    │                                              │
    │ Component Scores:                           │
    │ ├─ Budget Fit:      90/100 ✅               │
    │ ├─ Company Size:    70/100 ⚠️               │
    │ ├─ Industry:        65/100 ⚠️               │
    │ ├─ Engagement:      75/100 ✅               │
    │ └─ Objection Difficulty: 50/100 ⚠️         │
    │                                              │
    │ Next Steps:                                  │
    │ ► Send ROI case study (Email)                │
    │ ► Schedule callback (Phone)                  │
    │ ► Emphasize budget justification             │
    │                                              │
    │ Coaching for Last Call:                      │
    │ ► Ask budget question: "¿Cuál es...?"        │
    │ ► Use case study for objection               │
    │ ► Close harder: "¿Demo mañana?"              │
    └─────────────────────────────────────────────┘


PROSPECT PRIORITIZATION:
═════════════════════════════════════════════════════════════════

Next Call Queue (ordered by lead_score DESC):

1. María López       | Score: 89 | 🌟 PREMIUM      | Call NOW
2. Carlos Reyes      | Score: 82 | 🌟 PREMIUM      | Call NOW
3. Juan García       | Score: 73 | ⭐ QUALITY      | Call in 24h
4. Sofia Martinez    | Score: 68 | ⭐ QUALITY      | Call in 48h
5. Diego Fernandez   | Score: 45 | 👥 STANDARD     | Email nurture
6. Ana Gonzalez      | Score: 22 | ❌ LOW          | Archive
```

---

## FASE 3: MULTICANAL
### Flujo: WhatsApp + Email + SMS based on lead status

```
┌─────────────────────────────────────────────────────────────────┐
│                  MULTICANAL ORCHESTRATION                        │
└─────────────────────────────────────────────────────────────────┘

AFTER CALL ENDS + LEAD SCORE CALCULATED:
═════════════════════════════════════════════════════════════════

Step 1: Decide Next Action & Channel
────────────────────────────────────

  Call Outcome + Lead Score + Temperature
        │
        ├─→ FollowUpEngine.schedule_followups_after_call()
        │
        ├─→ Outcomes:
        │   ├─ SOFT_NO:     "Interested but budget concerns"
        │   ├─ HARD_NO:     "Not interested"
        │   ├─ INTERESTED:  "Want to think about it"
        │   ├─ DEMO_BOOKED: "Demo scheduled"
        │   └─ TRANSFER:    "Passed to human"
        │
        ├─→ Rules:
        │   ├─ IF soft_no + warm:
        │   │   └─→ Email in 24h (case study) → SMS in 48h (offer)
        │   │
        │   ├─ IF interested:
        │   │   └─→ WhatsApp in 2h (calendar link) → Email in 24h
        │   │
        │   ├─ IF hard_no:
        │   │   └─→ Email in 7d (long-tail nurture)
        │   │
        │   └─ IF demo_booked:
        │       └─→ WhatsApp in 30min (confirmation)
        │
        └─→ SELECT CHANNEL for each action


Step 2: Select Best Channel (ChannelOrchestrator)
──────────────────────────────

  Action Type + Prospect Preferences + Historical Success
        │
        ├─→ ChannelOrchestrator.select_channel_for_prospect()
        │
        ├─→ Scoring for each channel:
        │
        │   WHATSAPP:
        │   ├─ If hot/warm: +30 points
        │   ├─ If urgent (demo confirm): +20 points
        │   ├─ If prospect prefers: +10 points
        │   ├─ If historical 80%+ delivery: +15 points
        │   └─ TOTAL: 50+ → WhatsApp winner
        │
        │   EMAIL:
        │   ├─ If nurture: +25 points
        │   ├─ If case study/content: +20 points
        │   ├─ If soft_no: +15 points
        │   ├─ If prospect prefers: +10 points
        │   └─ TOTAL: Case studies → Email
        │
        │   SMS:
        │   ├─ If offer/urgent: +15 points
        │   ├─ If no WhatsApp access: +20 points
        │   ├─ If fallback: +10 points
        │   └─ TOTAL: Fallback option
        │
        └─→ Result: "Send WhatsApp (confidence 85%)"


Step 3: Prepare & Schedule Message
───────────────────────────────────

  Template Selection:
        │
        ├─→ SOFT_NO + WHATSAPP:
        │   Template: "price_objection_followup"
        │   Content: "De los 200 odontólogos que usan nuestro sistema,
        │             65% recupera la inversión en 3 meses. ¿Vemos cómo?"
        │   Scheduled: 24 hours from now
        │
        ├─→ INTERESTED + EMAIL:
        │   Template: "warm_email_followup"
        │   Subject: "Hola Juan, te dejé algunos números"
        │   Content: Personalized offer based on stated budget
        │   Scheduled: 24 hours from now
        │
        ├─→ DEMO_BOOKED + WHATSAPP:
        │   Template: "demo_confirmation"
        │   Content: "¿Confirmamos tu demo para mañana 10am?"
        │   Scheduled: 30 minutes from now
        │
        └─→ HARD_NO + EMAIL (long tail):
            Template: "case_study_nurture"
            Content: Similar company success story
            Scheduled: 7 days from now


Step 4: Execute Scheduled Messages
───────────────────────────────────

  Scheduled time arrives
        │
        ├─→ Check channel_preferences (do_not_contact? quiet_hours?)
        │
        ├─→ IF WhatsApp:
        │   └─→ WhatsAppProvider.send_message(phone, template, params)
        │       ├─ Twilio WhatsApp API
        │       ├─ Track delivery_id
        │       └─ Monitor for read/response
        │
        ├─→ IF Email:
        │   └─→ SendGridProvider.send_email(to, subject, body, template)
        │       ├─ SendGrid API
        │       ├─ Track open/click events
        │       └─ Store email_id for follow-up
        │
        ├─→ IF SMS:
        │   └─→ TwilioSMSProvider.send_sms(phone, body)
        │       ├─ Twilio SMS API
        │       ├─ Track delivery_id
        │       └─ Monitor for response
        │
        └─→ [outbound_messages table] ← UPDATE
            ├─ status: "pending" → "sent"
            ├─ sent_at: NOW()
            ├─ provider_id: "twilio-msg-123"
            └─ opened_at/clicked_at: monitor


CHANNELS ARCHITECTURE:
═════════════════════════════════════════════════════════════════

┌──────────────────────────────────────────────────────────────────┐
│                    MESSAGE PROVIDER LAYER                        │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────┐  ┌────────────────┐  ┌──────────────────┐ │
│  │  WhatsApp API   │  │  Email Provider│  │  SMS Provider    │ │
│  │  (Twilio)       │  │  (SendGrid)    │  │  (Twilio)        │ │
│  ├─────────────────┤  ├────────────────┤  ├──────────────────┤ │
│  │ send_message()  │  │ send_email()   │  │ send_sms()       │ │
│  │ track_delivery()│  │ track_open()   │  │ track_delivery() │ │
│  │ track_response()│  │ track_click()  │  │                  │ │
│  └─────────────────┘  └────────────────┘  └──────────────────┘ │
│       ↑                      ↑                     ↑              │
│       │                      │                     │              │
└───────┼──────────────────────┼─────────────────────┼──────────────┘
        │                      │                     │
        └──────────────────────┼─────────────────────┘
                               │
                    ┌──────────▼──────────┐
                    │ ChannelOrchestrator │
                    │ (selects best)      │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  FollowUpEngine     │
                    │  (schedules)        │
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │  outbound_messages  │
                    │  (tracks delivery)  │
                    └─────────────────────┘


FOLLOWUP SEQUENCES BY OUTCOME:
═════════════════════════════════════════════════════════════════

SOFT NO:                          INTERESTED:
├─ Hour 0: Call ends              ├─ Hour 0: Call ends
├─ Hour 24: Email case study      ├─ Hour 2: WhatsApp calendar link
├─ Hour 48: SMS special offer     ├─ Hour 24: Email personalized offer
└─ Hour 168: Email long-tail      └─ Hour 48: WhatsApp followup

HARD NO:                          DEMO BOOKED:
├─ Hour 168: Email nurture        ├─ Hour 0.5: WhatsApp confirmation
└─ (repeat weekly)                ├─ Hour 12: Email prep doc
                                  ├─ Hour 23: SMS reminder
                                  └─ Hour 24: Calendar event
```

---

## FASE 4: GLOBAL LEARNING LOOP
### Flujo: Extraer insights diarios y mejorar prompts

```
┌─────────────────────────────────────────────────────────────────┐
│                   GLOBAL LEARNING LOOP                           │
└─────────────────────────────────────────────────────────────────┘

DAILY LEARNING CYCLE (Each Night at 2am):
═════════════════════════════════════════════════════════════════

Step 1: Aggregate Yesterday's Data
──────────────────────────────────

  Yesterday's calls (1,000 calls)
        │
        ├─→ DailyLearningAnalyzer.run_daily_analysis()
        │
        ├─→ Extract metrics:
        │   ├─ Total calls: 1,000
        │   ├─ Closures: 400 (40% baseline)
        │   ├─ Avg lead score: 62.3
        │   ├─ Avg call duration: 340 seconds
        │   └─ By segment:
        │       ├─ Dental: 45% closure rate
        │       ├─ Veterinary: 38% closure rate
        │       └─ Gym: 32% closure rate
        │
        └─→ Identify patterns:
            ├─ Top 3 objections:
            │   ├─ "Too expensive" (35% of calls, 55% overcome)
            │   ├─ "Need to think" (28% of calls, 72% overcome)
            │   └─ "Already have solution" (18% of calls, 40% overcome)
            │
            └─ Top 3 winning arguments:
                ├─ "ROI case: Recovered in 3 months" (82% win rate)
                ├─ "Social proof: 200+ businesses using" (76% win rate)
                └─ "Risk reversal: 30-day free trial" (70% win rate)


Step 2: Generate Recommendations with Gemini
──────────────────────────────────────────────

  Metrics + Patterns
        │
        ├─→ Send to Gemini:
        │   "Eres un experto en ventas. Aquí están los datos
        │    de 1,000 llamadas. ¿Cómo mejoramos el prompt?"
        │
        ├─→ Provide context:
        │   ├─ Current closure rate: 40%
        │   ├─ Top objections: expensive, timing, competitor
        │   ├─ Top arguments: ROI, social proof, trial
        │   ├─ Best segments: Dental (45%), Vet (38%)
        │   └─ Worst segments: Gym (32%)
        │
        ├─→ Gemini analyzes and recommends:
        │
        │   {
        │     "recommendations": [
        │       {
        │         "type": "prompt_change",
        │         "current": "Explain features first",
        │         "suggested": "Lead with ROI + social proof",
        │         "reasoning": "82% win rate with ROI argument",
        │         "expected_impact": "+3-5% closure"
        │       },
        │       {
        │         "type": "segment_strategy",
        │         "segment": "gym",
        │         "current_rate": 0.32,
        │         "issue": "Price objection (67% of gym calls)",
        │         "suggestion": "Lead with trial offer instead of price",
        │         "expected_impact": "+8-12% for gym segment"
        │       },
        │       {
        │         "type": "new_objection_handler",
        │         "objection": "Already have solution",
        │         "current_rate": 0.40,
        │         "suggestion": "Use comparison framework",
        │         "example": "Sure! Let me show you 3 ways we're different...",
        │         "expected_impact": "+15% overcome rate"
        │       }
        │     ],
        │     "confidence": 0.82
        │   }
        │
        └─→ Store in [learning_metrics] table


Step 3: A/B Test Recommendation
────────────────────────────────

  IF recommendation confidence > 0.75:
        │
        ├─→ ABTestingFramework.create_test()
        │
        ├─→ Create two variants:
        │   ├─ Control (50% of calls):  Current prompt
        │   │   Baseline: 40% closure
        │   │
        │   └─ Variant (50% of calls):  New prompt
        │       Change: "Lead with ROI + social proof"
        │       Hypothesis: +3% closure
        │
        ├─→ Run for 7 days (7,000 calls)
        │
        ├─→ Measure results:
        │   ├─ Control: 2,800 calls, 1,120 closures (40%)
        │   └─ Variant: 2,800 calls, 1,232 closures (44%)
        │       → Variant WINS (+4 points)
        │
        └─→ IF significant (>95% confidence):
            ├─→ Winner becomes new baseline
            ├─→ Update production prompt
            ├─→ Celebrate +1% improvement!
            └─→ Log to [ab_tests] table for history


Step 4: Execute Approved Changes
─────────────────────────────────

  Approved recommendation + winning A/B test
        │
        ├─→ IF automatic (low risk):
        │   └─→ Update prompt immediately
        │       Example: "Add social proof argument to discovery phase"
        │
        ├─→ IF requires review (medium risk):
        │   └─→ Create notification for Product team
        │       "Recommendation: Change prompt phrasing. Review?"
        │
        └─→ IF high risk (financial/compliance):
            └─→ Queue for manual review before deployment


LEARNING LOOP DASHBOARD:
═════════════════════════════════════════════════════════════════

                    Daily Learning Report
        ┌──────────────────────────────────────────┐
        │ Date: 2026-06-28                         │
        │ Calls Analyzed: 1,000                    │
        │ Closure Rate: 40% (baseline)             │
        │                                           │
        │ TOP PATTERNS DISCOVERED:                 │
        │ ┌──────────────────────────────────────┐ │
        │ │ Objection: "Too expensive" (35%)     │ │
        │ │ Overcome rate: 55%                   │ │
        │ │ Best handler: ROI calculation        │ │
        │ │ Recommendation: Emphasize earlier    │ │
        │ └──────────────────────────────────────┘ │
        │                                           │
        │ ┌──────────────────────────────────────┐ │
        │ │ By Segment Performance:              │ │
        │ │ • Dental:      45% closure ✅        │ │
        │ │ • Veterinary:  38% closure          │ │
        │ │ • Gym:         32% closure ⚠️        │ │
        │ │ Recommendation: Customize gym pitch  │ │
        │ └──────────────────────────────────────┘ │
        │                                           │
        │ ACTIVE A/B TESTS:                        │
        │ ┌──────────────────────────────────────┐ │
        │ │ Test: ROI-First Prompt              │ │
        │ │ Status: Day 4 of 7                  │ │
        │ │ Control: 40.2% closure              │ │
        │ │ Variant: 42.8% closure ↑            │ │
        │ │ Trend: Winner (not significant yet) │ │
        │ └──────────────────────────────────────┘ │
        │                                           │
        │ RECENT UPDATES:                          │
        │ ✅ Prompt v2.3 deployed (Jun 25)        │
        │    "Add social proof to discovery"       │
        │    Result: +2% closure                   │
        │                                           │
        │ 🔄 Pending Review:                       │
        │    "Change gym segment strategy"         │
        │    Confidence: 78%                       │
        └──────────────────────────────────────────┘


FEEDBACK LOOP (Monthly):
═════════════════════════════════════════════════════════════════

Month 1: Baseline
├─ Closure rate: 40%
├─ A/B tests run: 0
└─ Prompt versions: 1

Month 2: First Improvements
├─ Closure rate: 42% (+2% from initial A/B)
├─ A/B tests run: 2
├─ Prompt versions: 3 (incremental updates)
└─ Learning loop momentum building

Month 3: Compounding
├─ Closure rate: 45% (+5% from baseline)
├─ A/B tests run: 4
├─ Prompt versions: 7 (weekly updates)
├─ Segment-specific prompts developed
└─ By-industry customization active

Month 4: Scaling
├─ Closure rate: 47-50% (+7-10% from baseline)
├─ A/B tests run: 8+ (continuous)
├─ Prompt versions: 15+
├─ Real-time personalization by persona
└─ Learning loop sustains improvement


PROMPTS EVOLUTION (Example):
═════════════════════════════════════════════════════════════════

v1.0 (Baseline):
  "You are a sales agent. Ask about their business needs
   and offer our solution."

v2.1 (After 2 weeks):
  "You are a sales agent specialized in [industry].
   Lead with ROI discussion. Use social proof. 
   Handle objections with case studies."

v2.3 (After 3 weeks):
  "You are a sales agent for [industry].
   Phase 1: Warm up (personal touch)
   Phase 2: Discover pain points using [discovered questions]
   Phase 3: Present ROI (expected 40% savings)
   Phase 4: Handle [top 3 objections] with proven handlers
   Phase 5: Close with risk reversal (30-day trial)"

v3.0 (After 4 weeks):
  "You are a sales agent optimized for [specific persona].
   Personality: [training data insights]
   Opening: [highest converting opener]
   Discovery: [questions that convert best]
   Pitch: [argument combo with best track record]
   Objections: [handler matrix by category]
   Close: [most effective closing by segment]"
```

---

## FULL SYSTEM INTEGRATION

```
┌────────────────────────────────────────────────────────────────────┐
│                     COMPLETE SYSTEM FLOW                           │
└────────────────────────────────────────────────────────────────────┘

CALL JOURNEY:
═════════════════════════════════════════════════════════════════════

1. INCOMING CALL
   ├─ Prospect dials (1st, 2nd, 3rd+ call)
   └─ Twilio webhook triggers

2. LOAD CONTEXT (PHASE 1)
   ├─ API: GET /prospects/profile
   ├─ Database: Load prospect_profiles
   ├─ Result: Temperature, objections, budget from previous calls
   └─ LLM: Inject context into system prompt

3. VOICE CONVERSATION
   ├─ MasterLLM (Gemini 3.5 Flash)
   │  └─ Uses context from Phase 1
   ├─ Prospect speaks (ElevenLabs STT)
   ├─ Agent responds (Gemini + ElevenLabs TTS)
   └─ Turns accumulate in transcript

4. CALL ENDS
   ├─ Timestamp: end_time
   └─ Transcript: [{role, text, sentiment}, ...]

5. EXTRACT DATA (PHASE 1)
   ├─ PostCallExtractionEngine
   ├─ Gemini analyzes transcript
   └─ Result: temperature, budget, objections, motivators

6. UPDATE PROFILE (PHASE 1)
   ├─ ProspectService.update_profile_after_call()
   ├─ Save to prospect_profiles + call_turns
   └─ Profile now ready for next call

7. CALCULATE LEAD SCORE (PHASE 2)
   ├─ LeadScoringEngine.calculate_lead_score()
   ├─ Input: prospect profile + historical data
   └─ Output: lead_score (0-100) + classification

8. GENERATE COACHING (PHASE 2)
   ├─ CoachingEngine.generate_coaching()
   ├─ Gemini analyzes call for agent improvement
   └─ Output: feedback on discovery, objections, closing

9. SCHEDULE FOLLOWUP (PHASE 3)
   ├─ FollowUpEngine.schedule_followups_after_call()
   ├─ Rules: outcome + temperature → action + channel
   ├─ ChannelOrchestrator: Select WhatsApp/Email/SMS
   └─ Save to outbound_messages (scheduled)

10. EXECUTE MESSAGES (PHASE 3)
    ├─ Scheduled time arrives
    ├─ WhatsAppProvider / EmailProvider / SMSProvider
    ├─ Send templated message
    └─ Track delivery + opens + clicks

11. NIGHTLY ANALYSIS (PHASE 4)
    ├─ DailyLearningAnalyzer.run_daily_analysis()
    ├─ Aggregate 1,000 calls from day
    ├─ Extract top objections, winning arguments
    └─ Generate recommendations via Gemini

12. A/B TEST (PHASE 4)
    ├─ IF confidence > 0.75
    ├─ Create variant + control
    ├─ Route 50/50 for 7 days
    └─ Measure: variant vs control closure rate

13. UPDATE PROMPT (PHASE 4)
    ├─ IF variant wins with 95% confidence
    ├─ Update system prompt in production
    └─ Next calls use improved prompt


ITERATION:
Go to step 1 → Repeat for next call


DATABASE RELATIONSHIP MAP:
═════════════════════════════════════════════════════════════════════

    ┌─────────────────────┐
    │  prospect_profiles  │ (Prospect identity + engagement state)
    ├─────────────────────┤
    │ id (PK)             │
    │ phone (UQ)          │
    │ software_id         │
    │ temperature         │
    │ stated_budget       │
    │ objections (JSON)   │
    │ motivators (JSON)   │
    └──────────┬──────────┘
               │
        ┌──────┴───────────────────────────┐
        │                                  │
        ▼                                  ▼
   ┌──────────────┐             ┌──────────────────┐
   │ call_turns   │             │ lead_scores      │
   ├──────────────┤             ├──────────────────┤
   │ id (PK)      │             │ id (PK)          │
   │ prospect_id  │             │ prospect_id      │
   │ call_sid     │             │ call_id          │
   │ turns (JSON) │             │ lead_score       │
   │ analysis     │             │ component_scores │
   └──────┬───────┘             └────────┬─────────┘
          │                              │
          │                              └──────────┐
          │                                         │
          ▼                                         ▼
   ┌────────────────────┐         ┌────────────────────────┐
   │ coaching_feedback  │         │ outbound_messages      │
   ├────────────────────┤         ├────────────────────────┤
   │ id (PK)            │         │ id (PK)                │
   │ call_id            │         │ prospect_id            │
   │ coaching (JSON)    │         │ channel (whatsapp...)  │
   │ overall_score      │         │ scheduled_at           │
   │ do_more, avoid     │         │ status (pending/sent)  │
   └────────────────────┘         └────────────────────────┘
           │                              ▲
           │                              │
           └──────────────────┬───────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │ learning_metrics │
                    ├──────────────────┤
                    │ id (PK)          │
                    │ window_date      │
                    │ top_objections   │
                    │ top_motivators   │
                    │ by_industry      │
                    │ recommendations  │
                    └──────────────────┘
```

---

**END OF ARCHITECTURAL DIAGRAMS**

Use this document to:
- ✅ Understand data flow between phases
- ✅ Explain architecture to team
- ✅ Plan database queries
- ✅ Design API contracts
- ✅ Implement integration points

