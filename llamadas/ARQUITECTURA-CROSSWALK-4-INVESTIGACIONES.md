# CROSSWALK: Arquitectura Integrada vs 4 Investigaciones

**Propósito:** Mapear cómo cada componente de la arquitectura integrada se nutre de las 4 investigaciones previas.

---

## TABLA DE MAPEO

### Investigación 1: COACHING-AUTOMATICO-POST-CALL-EXHAUSTIVO

**Enfoque:** Scoring post-llamada, métricas de lead, probabilidad de cierre, NBA.

| Concepto | En Investigación | En Arquitectura | Ubicación en Arch |
|---|---|---|---|
| **Lead Score (0-100)** | Fórmula: E(40%) + I(35%) + O(25%) | `call_metrics.lead_score` | PostCallProcessor, DB schema |
| **Engagement Score** | turnos × 3 + palabras × 0.1 + ... | `CallMetricsComputer.compute()` | Service layer |
| **Interest Signals** | demo_requested, urgency, price_mentioned | `Classifier.classify()` | Durante hybrid session |
| **Objection Handling** | count + overcome ratio | `transcript_analysis.objections` | PostCallProcessor |
| **Sentiment Score** | -1 to +1 (emotional arc) | `call_metrics.sentiment_score` | PostCallProcessor |
| **P(close)** | Bayesian formula | `call_metrics.probability_to_close` | PostCallProcessor |
| **NBA (Actions)** | 10 tipos de acciones | `next_best_actions` table | PostCallProcessor → Dispatcher |
| **Action Pipeline** | Scoring → decide action | NBA Pipeline step | PostCallProcessor step 3 |
| **Database Schema** | Propuesto | `call_metrics + next_best_actions` | Sección 1.3-1.4 |

**Integración en Arquitectura:**
```
PostCallProcessor.process_call()
  ├─ Step 1: Analyze Transcript
  │   └─ Uses: pain_points_detected, objections, questions_asked
  │
  ├─ Step 2: Compute Metrics (FROM COACHING INVESTIGATION)
  │   ├─ Engagement Score (E = turnos×3 + palabras×0.1 + ...)
  │   ├─ Interest Score (I = demo_requested×20 + urgency×15 + ...)
  │   ├─ Objection Handling (O = count + overcome ratio)
  │   ├─ LEAD SCORE = E×0.4 + I×0.35 + O×0.25
  │   ├─ Sentiment Score (from transcript emotion arc)
  │   └─ P(close) = Bayesian(lead_score, history, industry)
  │
  ├─ Step 3: Compute NBA (FROM COACHING INVESTIGATION)
  │   ├─ Input: metrics from Step 2
  │   ├─ Algorithm: TopK actions ordered by priority
  │   └─ Output: email_followup, whatsapp_offer, case_study, etc.
  │
  └─ Step 4-5: Dispatch + Update Profile
```

**Documentos de Referencia:**
- Fórmula Lead Score: `COACHING-AUTOMATICO-POST-CALL-EXHAUSTIVO.md` § 1 (Lead Score: Fórmula de Scoring)
- Sentiment Score: § 2 (Sentiment Score: Análisis de Emoción)
- P(close): § 3 (Probability to Close: Predicción Bayesiana)
- NBA Pipeline: § 4 + § 7 (Action Pipeline: Orquestación)

---

### Investigación 2: GLOBAL-LEARNING-LOOP-100K

**Enfoque:** Retroalimentación automática del sistema, análisis de patrones en 100k+ llamadas, optimización de prompts.

| Concepto | En Investigación | En Arquitectura | Ubicación en Arch |
|---|---|---|---|
| **Data Pipeline** | Recolección de transcripts + outcomes | `Call` + `call_metrics` tables | DB schema 1.2-1.3 |
| **Outcome Tagging** | demo_booked, soft_no, hard_no, transfer | `calls.outcome` enum | DB schema 1.2 |
| **Objection Extraction** | NER + manual labels | `PostCallProcessor.analyze_transcript()` | Service layer |
| **Analytics Engine** | Win rate, objection frequency, industry patterns | `AnalyticsEngine` class | Service layer 2.2 |
| **Top Winning Arguments** | Detecta argumentos > 60% win rate | `Analytics: extract_arguments()` | Service layer |
| **Prompt Optimization** | Actualización automática de prompts | `PromptOptimizer` class | Service layer 2.2 |
| **Safety Gates** | Guardrails contra malos cambios | `SafetyGates.validate()` | Service layer |
| **A/B Testing** | Variant rollout con monitoring | `PromptOptimizer.create_variant()` | Service layer |
| **Temporal Trends** | Cambios 24h, 7d, 30d | `learning_loop_metrics` table | DB schema 1.5 |
| **Learning Loop DB** | Almacena patrones + recomendaciones | `learning_loop_metrics` table | DB schema 1.5 |

**Integración en Arquitectura:**
```
Learning Feedback Loop (24-48h)
  ├─ Hour 0-24: Data Collection
  │   └─ Store: calls, call_metrics, next_best_actions
  │
  ├─ Hour 24-48: Analytics Engine (FROM LEARNING LOOP INVESTIGATION)
  │   ├─ Extract: top_winning_arguments (win_rate > 60%)
  │   ├─ Extract: recurring_objections (frequency + handlers)
  │   ├─ Compute: industry_patterns (vet=32%, gym=24%, yoga=18%)
  │   ├─ Compute: overall_win_rate, avg_lead_score
  │   └─ Generate: recommendations
  │
  ├─ Hour 48-72: Prompt Optimizer (FROM LEARNING LOOP INVESTIGATION)
  │   ├─ Create variant with recommendations
  │   ├─ Safety gates validate
  │   ├─ A/B test: 10% traffic → variant
  │   ├─ Monitor: variant vs control (48-72h)
  │   └─ Decision: rollout 50% → 100% | keep | rollback
  │
  └─ Result: System continuously improves
      ├─ +15-25% win rate
      └─ Self-learning without human intervention
```

**Documentos de Referencia:**
- Data Pipeline: `GLOBAL-LEARNING-LOOP-100K.md` § 4
- Analytics Engine: § 5 + § 9 (Caso de Uso Real)
- Prompt Optimization: § 6 + Timeline § 10
- Safety Guards: § 7
- Resultados: Visión General (Beneficio Esperado)

---

### Investigación 3: GUIA-SISTEMA-COMPLETO-2026-V2.1

**Enfoque:** Arquitectura dual-LLM actual (State Engine + Voice Fast + Master Pro), latencia, inteligencia.

| Concepto | En Investigación | En Arquitectura | Ubicación en Arch |
|---|---|---|---|
| **State Engine** | Máquina de estados probabilística, <1ms | `State Engine` en HybridSession | Service layer, Data Flow |
| **Voice LLM** | Gemini Flash, 180ms, naturalista | `_voice_llm.generate()` | HybridSession |
| **Master LLM** | Gemini Pro, 300-500ms, estratégico | `_master_llm.generate_background()` | HybridSession async |
| **Classification Engine** | 100ms, selectivo (heurísticas) | `_classifier.classify()` | HybridSession |
| **Brief Generation** | State → estrategia para Voice | `brief` in Master LLM output | Data Flow |
| **Dual LLM Latency** | p50: 600ms, p95: 700ms | `hybrid_session.handle_user_input()` | Service layer |
| **Stage Tracking** | discovery → problem_aware → demo_interest → closing | `State.stage` enum | Data Flow diagram |
| **Conversation History** | Últimos 5 turnos (optimizado) | `historial[-5:]` | Service layer |
| **Response Generation** | Voice genera, Maestro async pre-genera | `asyncio.create_task()` | Service layer 2.2 |
| **Classifier Heuristics** | intent, pain_detected, objections, urgency | `Classifier.classify()` logic | Service layer |

**Integración en Arquitectura:**
```
HybridSession.handle_user_input() (FROM DUAL LLM INVESTIGATION)
  ├─ Classification (100ms, selective)
  │   └─ intent, pain_detected, objections, urgency tags
  │
  ├─ State Engine (<1ms)
  │   ├─ Input: last_phrase + classification + history
  │   ├─ Update: stage, risk_of_loss, goal_progress
  │   └─ Output: brief for Voice LLM
  │
  ├─ Response Generation (async dual-LLM)
  │   ├─ Voice task: respond immediately (180ms)
  │   │   └─ Uses last_brief (cached)
  │   │
  │   ├─ Master task: pre-generate next brief (300ms, background)
  │   │   └─ For next turn, uses state + classification
  │   │
  │   └─ Response: 255ms total (not waiting for Master)
  │
  └─ Output: spoken response + updated state

State Diagram (FROM DUAL LLM INVESTIGATION):
  GREETING → DISCOVERY → PROBLEM_AWARE → DEMO_INTEREST → CLOSING → OUTCOME
```

**Documentos de Referencia:**
- Arquitectura Dual LLM: `GUIA-SISTEMA-COMPLETO-2026-V2.1.md` § Arquitectura: DUAL LLM
- State Engine: § Componente 1 (State Engine)
- Voice LLM: § Componente 2
- Master LLM: § Componente 3
- Flujo de latencia: § Arquitectura (Combinación)
- Historial optimizado: Recent commits muestran fixes a `historial[-10:]` → `historial[-5:]`

---

### Investigación 4: ANALISIS-SEGUNDO-CICLO-VELOCIDAD-INTELIGENCIA

**Enfoque:** 10 problemas críticos no cubiertos en Ciclo 1, velocidad + inteligencia.

| Problema | En Investigación | Fix en Arquitectura | Ubicación |
|---|---|---|---|
| **1.1: Historial crece sin límite** | Cambiar de 10 a 5 turnos | `historial[-5:]` in HybridSession | Service layer 2.2 |
| **1.2: Clasificación redundante** | Reducer heurísticas a 3 | `_should_classify()` logic | Service layer 2.2 |
| **1.3: Maestro bloquea Voz** | Async background generation | `asyncio.create_task()` pattern | Service layer 2.2 |
| **1.4: Prompts recompilados** | Compilar 1x al init | `_base_prompt_compiled` | Service layer |
| **1.5: Redis underutilizado** | Caché brief por stage | `redis.get(brief_key)` logic | Service layer |
| **2.1: State Engine NO usa CRM** | Multiplicar probabilidades por CRM data | `_compute_next_stage_probs()` with CRM factors | Service layer |
| **2.2: Classifier puramente heurístico** | A/B test: generic vs contextual | `A/B test setup` in PromptOptimizer | Learning Loop |
| **2.3: Freno de cierre hardcodeado** | Freno inteligente por señales | `apply_closure_brake()` logic | State Engine logic |
| **2.4: Brief NO personalizado por nicho** | Variar estrategia por business_type | `strategy_map.get(ctx.business_type)` | Service layer |
| **2.5: Pérdida de contexto post-cierre** | Escalada automática si duda post-cierre | Auto-escalation in NBA pipeline | Service layer |

**Integración en Arquitectura:**
```
CICLO 2 FIXES INTEGRADOS:

Velocidad (-300-500ms potencial):
├─ 1.1 Historial 5 turnos: -100-200ms
├─ 1.2 Clasificación selectiva: -50ms
├─ 1.3 Maestro async: -200ms (CRÍTICO)
├─ 1.4 Prompts compilados: -50ms
└─ 1.5 Redis brief cache: -270ms (30% calls)

Inteligencia (+20-50% mejora):
├─ 2.1 State Engine + CRM: +5-8% closing
├─ 2.2 Classifier contextual: +3-5% closing (A/B test)
├─ 2.3 Freno inteligente: +5-8% hot leads
├─ 2.4 Brief nicho-aware: +5-8% closing
└─ 2.5 Escalada automática: +5-10% retention

Donde se aplican en Arquitectura:
├─ HybridSession (velocidad)
├─ State Engine (inteligencia)
├─ PromptOptimizer (testing)
└─ PostCallProcessor (escalada)
```

**Documentos de Referencia:**
- Problemas 1.1-1.5: `ANALISIS-SEGUNDO-CICLO-VELOCIDAD-INTELIGENCIA.md` § PILAR 1: VELOCIDAD
- Problemas 2.1-2.5: § PILAR 2: INTELIGENCIA
- Priorización: § Conclusión (tabla de impacto por esfuerzo)

---

## MAPA DE INTEGRACIÓN: Componente → Investigación

```
┌────────────────────────────────────────────────────────────────────┐
│                      ARQUITECTURA INTEGRADA                         │
├────────────────────────────────────────────────────────────────────┤
│                                                                    │
│  Call Router                                                       │
│  ↓                                                                 │
│  HybridSession (INVESTIGATION 3: Dual LLM)                        │
│  ├─ State Engine (Ciclo 2 Fix 2.1: CRM-aware)                    │
│  ├─ Voice LLM (Ciclo 2 Fix 1.3: async)                           │
│  ├─ Master LLM (Ciclo 2 Fixes 1.1,1.4,1.5: optimized)           │
│  └─ Classifier (Ciclo 2 Fix 1.2: selective)                     │
│  ↓                                                                 │
│  PostCallProcessor (INVESTIGATION 1: Coaching)                    │
│  ├─ Analyze Transcript                                            │
│  ├─ Compute Metrics (Lead Score, Sentiment, P(close))            │
│  ├─ Compute NBA (Next Best Actions)                              │
│  │   └─ Incluye escalada automática (Ciclo 2 Fix 2.5)           │
│  ├─ Action Dispatcher                                             │
│  └─ Prospect Profile Update                                       │
│  ↓                                                                 │
│  Analytics Engine (INVESTIGATION 2: Learning Loop)                │
│  ├─ Pattern Detection                                             │
│  ├─ Metrics Aggregation                                           │
│  └─ Recommendations                                               │
│  ↓                                                                 │
│  Prompt Optimizer (INVESTIGATION 2: Learning Loop)                │
│  ├─ Create Variant                                                │
│  ├─ Safety Validation                                             │
│  ├─ A/B Test Setup (Ciclo 2 Fix 2.2: classifier A/B)            │
│  └─ Deployment (Ciclo 2 Fix 2.4: brief nicho-aware)             │
│  ↓                                                                 │
│  Learning Feedback Loop (INVESTIGATION 2)                         │
│  └─ Cycle repeats every 24-48h                                    │
│                                                                    │
└────────────────────────────────────────────────────────────────────┘
```

---

## CONVERGENCIA: Las 4 Investigaciones en 1

### Qué aporta cada investigación:

1. **COACHING-AUTOMATICO** → **POST-CALL METRICS + NBA**
   - Cómo evaluar cada llamada (Lead Score, Sentiment, P(close))
   - Qué acción tomar después de cada llamada
   - Base: scoring + decision algorithms

2. **GLOBAL-LEARNING-LOOP** → **CONTINUOUS IMPROVEMENT**
   - Cómo detectar patrones en 100k+ llamadas
   - Cómo actualizar prompts automáticamente
   - Base: batch analytics + safe deployment

3. **GUIA-SISTEMA-COMPLETO** → **REAL-TIME CALL ORCHESTRATION**
   - Cómo ejecutar llamadas con velocidad + inteligencia
   - Dual LLM architecture (Voice + Master + State)
   - Base: latency optimization + state management

4. **ANALISIS-SEGUNDO-CICLO** → **OPTIMIZACIONES ESPECÍFICAS**
   - 10 problemas concretos a resolver
   - Velocidad: -300-500ms
   - Inteligencia: +20-50%
   - Base: deep analysis + prioritized fixes

### Resultado: Sistema Cohesivo

```
CICLO COMPLETO:
  Real-time calls (Inv. 3)
  ↓ Post-call analysis (Inv. 1)
  ↓ Continuous learning (Inv. 2)
  ↓ Specific optimizations (Inv. 4)
  ↓ Back to real-time calls
  
OUTCOME:
  ✓ Fast (Inv. 3 + 4: latency)
  ✓ Smart (Inv. 1 + 4: decision making)
  ✓ Learning (Inv. 2: self-improving)
  ✓ Profitable (Inv. 1: ROI from better scoring)
```

---

## DOCUMENTOS DE REFERENCIA RÁPIDA

| Tema | Investigación | Sección |
|---|---|---|
| Lead Score Formula | COACHING | § 1 (Lead Score: Fórmula de Scoring) |
| Sentiment Analysis | COACHING | § 2 (Sentiment Score) |
| NBA Pipeline | COACHING | § 4 + § 7 |
| Data Collection | LEARNING | § 4 (Data Pipeline) |
| Analytics Engine | LEARNING | § 5 (Analytics Engine) |
| Prompt Optimization | LEARNING | § 6 (Prompt Optimization) |
| A/B Testing | LEARNING | § Caso de Uso Real § 10 |
| Dual LLM Architecture | GUIA | § Arquitectura: DUAL LLM |
| State Engine | GUIA | § Componente 1 |
| Latency Optimization | GUIA | § Arquitectura (Combinación) |
| Historial Optimization | CICLO2 | § 1.1 (Historial crece) |
| Clasificación Selectiva | CICLO2 | § 1.2 (Clasificación redundante) |
| Maestro Async | CICLO2 | § 1.3 (Maestro bloquea) |
| State Engine + CRM | CICLO2 | § 2.1 (NO usa datos CRM) |
| Brief Personalizado | CICLO2 | § 2.4 (NO se personaliza) |

---

## PRÓXIMOS PASOS

### Implementación Faseada:

**Fase 1 (Semana 1-2):** Implementar Ciclo 2 Fixes (1.3 crítico: Maestro async)
- Máximo impacto: -200ms latencia
- Máximo esfuerzo: Alto
- Ganancia: Inmediata

**Fase 2 (Semana 3-4):** State Engine + CRM data (Ciclo 2 Fix 2.1)
- Máximo impacto: +5-8% closing
- Máximo esfuerzo: Medio
- Ganancia: +5-8% win rate

**Fase 3 (Semana 5-6):** Full Learning Loop deployment
- Todas las 4 investigaciones working together
- Continuous improvement automático
- Target: +15-25% win rate en 90 días

**Fase 4 (Ongoing):** A/B testing + Safety gates
- Asegurar que cambios mejoren sistema
- Rollback rápido si degradación
- Cycle: 24-48h

---

*Crosswalk completo: Cómo las 4 investigaciones convergen en una arquitectura integrada, coherente y auto-mejorante.*
