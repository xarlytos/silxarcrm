# Multi-Agent Sales Architecture

## Visión General

Sistema de 5 agentes especializados que colaboran a través de una arquitectura coordinada con **memoria compartida**, **handoff automático** y **orquestación inteligente**.

```
┌─────────────────────────────────────────────────────────────────┐
│                    SHARED MEMORY LAYER                          │
│  (Prospect Profile + Sales State + Decision Signals)            │
│  Persistencia: Redis + PostgreSQL                               │
└─────────────────────────────────────────────────────────────────┘
                                ▲
                                │
        ┌───────────────────────┼───────────────────────┐
        │                       │                       │
    ┌───▼────┐            ┌────▼────┐           ┌─────▼──┐
    │   SDR  │            │ CLOSER  │           │FOLLOW-UP│
    │ Agent  │──handoff──▶│ Agent   │──handoff─▶│ Agent   │
    └────┬───┘            └────▲────┘           └─────┬──┘
         │                     │                      │
         │  objections/        │  objections/         │
         │  recovery           │  needs human         │
         │                     │                      │
    ┌────▼─────────────────────▼──────────────────────▼──┐
    │           RECOVERY & EXPANSION LAYER               │
    │  ┌──────────────┐         ┌──────────────┐        │
    │  │ Recovery Ag. │         │ Expansion Ag.│        │
    │  │ (objection    │         │ (upsell /    │        │
    │  │  handling)   │         │  cross-sell) │        │
    │  └──────────────┘         └──────────────┘        │
    └───────────────────────────────────────────────────┘
```

---

## 1. ARQUITECTURA DE 5 AGENTES

### 1.1 SDR Agent (Sales Development Representative)
**Objetivo:** Calificación inicial + pitch comercial

**Responsabilidades:**
- Validar que es decision maker (BANT)
- Detectar pain points primarios
- Generar interés inicial (ICP fit)
- Transición a Closer cuando hay "warm interest"

**Entrada:**
- Prospect data (nombre, empresa, industria)
- Lead source + temp score

**Salida:**
- Qualification score (0-100)
- Detected pain points
- Interest level (frio → tibio)
- Ready for closer? (YES/NO)

**Modelo:** Gemini 2.5-flash (rápido, bajo costo)
**Latencia SLA:** <500ms

**Transiciones:**
```
SDR → CLOSER: qualification_score > 70 AND interest_level > 5/10
SDR → RECOVERY: objeción detectada (precio, timing)
SDR → FOLLOW-UP: "call me back", no decision maker, timing lejano
```

---

### 1.2 Closer Agent
**Objetivo:** Cierre de deals

**Responsabilidades:**
- Presentar oferta optimizada (Deal Engine)
- Manejar objeciones finales
- Garantizar commitments (demo, trial, contrato)
- Escalada a humano si necesario

**Entrada:**
- Full prospect profile (de SDR)
- Detected pain points
- Budget signals
- Decision timeline

**Salida:**
- Deal outcome (cerrado, demo programado, rechazado)
- Proposed offer (plan + precio + descuento)
- Next steps
- Escalation needed? (YES/NO)

**Modelo:** Gemini Pro 1.5 (mejor reasoning para negociación)
**Latencia SLA:** <2s

**Transiciones:**
```
CLOSER → CLOSED: Prospect acepta oferta
CLOSER → RECOVERY: Objeción fuerte en precio/timing
CLOSER → FOLLOW-UP: "Necesito pensar"
CLOSER → HUMAN: Frustration > 7/10 OR request escalation
```

---

### 1.3 Follow-Up Agent
**Objetivo:** Nurturing + perseverancia

**Responsabilidades:**
- Recordatorios programados (24h, 3d, 7d)
- Envío de recursos (case studies, ROI calc)
- Mantener continuidad sin agobiar
- Detección de cambios en interés

**Entrada:**
- Last interaction data
- Reason for follow-up (timing, info request)
- Campaign context

**Salida:**
- Next follow-up scheduled
- Resources sent
- Sentiment change detected?
- Ready to re-engage Closer?

**Modelo:** Gemini 2.5-flash
**Latencia SLA:** <1s (async)

**Transiciones:**
```
FOLLOW-UP → CLOSER: Interest renewed (>7/10)
FOLLOW-UP → RECOVERY: "No me interesa" o rechazo suave
FOLLOW-UP → ARCHIVE: No response x3 intentos (>14 días)
```

---

### 1.4 Recovery Agent
**Objetivo:** Manejo de objeciones + re-engagement

**Responsabilidades:**
- Análisis profundo de objeción (precio, timing, fit)
- Estrategia de reconexión personalizada
- "Salvación" de deals en riesgo
- Oferta alternativa (cheaper plan, trial, etc.)

**Entrada:**
- Objection type + context
- Previous offer rejected
- Prospect sentiment

**Salida:**
- Objection handler strategy
- Alternative offer
- Next action
- Keep alive? (YES/NO)

**Modelo:** Gemini Pro 1.5 (reasoning complejo)
**Latencia SLA:** <3s

**Transiciones:**
```
RECOVERY → CLOSER: Objeción resuelta, re-qualified
RECOVERY → FOLLOW-UP: "Dame tiempo", objección timing
RECOVERY → ARCHIVE: Prospect perdido definitivamente
```

---

### 1.5 Expansion Agent (Account Expansion)
**Objetivo:** Upsell + Cross-sell + Retención

**Responsabilidades:**
- Identificar oportunidades post-venta
- Proponer add-ons/upgrades
- Retención de clientes a riesgo
- Expansión de presupuesto

**Entrada:**
- Current customer data
- Usage patterns
- Renewal date
- Expansion signals

**Salida:**
- Expansion recommendation
- Expansion offer
- Risk level (churn risk?)
- Recommended timing

**Modelo:** Gemini 2.5-flash
**Latencia SLA:** <1s (async batch)

**Transiciones:**
```
EXPANSION → CLOSER: Upgrade approval needed
EXPANSION → RECOVERY: Churn risk detected
EXPANSION → CLOSED: Expansion deal won
```

---

## 2. SHARED MEMORY ARCHITECTURE

### 2.1 Prospect Profile Schema

```python
@dataclass
class ProspectProfile:
    # Identidad
    prospect_id: str
    name: str
    title: str
    email: str
    phone: str
    
    # Empresa
    company_name: str
    company_size: int  # 1-10, 11-50, 51-200, 200+
    industry: str
    location: str
    
    # BANT Qualification
    budget_max: float | None
    authority: bool  # Is decision maker?
    need_detected: str  # Pain point
    timeline: str  # Immediate, 3mo, 6mo, 12mo+
    
    # Sales Signals
    qualification_score: float  # 0-100 (SDR output)
    interest_level: int  # 0-10 (SDR → CLOSER)
    pain_points: list[str]
    current_solution: str
    
    # Agent History
    last_agent: str  # "SDR" | "CLOSER" | "RECOVERY" | "FOLLOW_UP" | "EXPANSION"
    last_agent_action: str  # Summary of last action
    last_interaction: datetime
    
    # Deal Context
    proposed_offer: DealRecommendation | None
    deal_status: str  # "qualified" | "pitching" | "objecting" | "closing" | "closed"
    objections: list[str]  # ["price", "timing", "fit"]
    
    # Emotional State
    emotion: str  # "interested" | "neutral" | "frustrated" | "rejecting"
    frustration_level: int  # 0-10
    engagement_fatigue: int  # 0-10 (follow-up burnout)
    
    # Metadata
    created_at: datetime
    updated_at: datetime
    last_summary: str  # Resume de intención
```

### 2.2 Sales State Engine (Compartido)

```python
@dataclass
class SharedSalesState:
    """Estado único de venta - escrito/leído por todos los agentes"""
    
    prospect_id: str
    
    # Pipeline stage (controla qué agente actúa)
    current_stage: str
    # "discovery" → SDR
    # "qualification" → SDR
    # "pitch" → CLOSER
    # "negotiation" → CLOSER/RECOVERY
    # "closing" → CLOSER
    # "nurturing" → FOLLOW_UP
    # "objection" → RECOVERY
    # "expansion" → EXPANSION
    # "closed" → EXPANSION
    # "lost" → RECOVERY/ARCHIVE
    
    # Confidence & Probability
    close_probability: float  # 0-1
    expected_close_date: datetime | None
    expected_value: float
    
    # Signals for handoff decision
    sdr_completed: bool
    closer_engaged: bool
    recovery_needed: bool
    follow_up_scheduled: datetime | None
    
    # Interaction counts (para evitar over-reaching)
    total_interactions: int
    interactions_this_week: int
    days_since_contact: int
    
    # Flags for next agent
    next_agent: str  # "CLOSER" | "RECOVERY" | "FOLLOW_UP" | "EXPANSION" | "HUMAN"
    next_action_reason: str  # Why this agent?
    ready_for_handoff: bool
    
    # Metadata
    last_updated_by_agent: str
    last_update_timestamp: datetime
    handoff_history: list[dict]  # [{from_agent, to_agent, reason, timestamp}]
```

### 2.3 Context Window Management

**Problema:** Los LLMs tienen context windows limitados (100K tokens). Con 100 prospects simultáneos:
- Token/prospect: ~2K (historia + estado)
- Total: 200K tokens → overflow

**Solución:**

```python
class ContextWindowManager:
    """Optimiza lo que cada agente ve"""
    
    def get_agent_context(self, agent_type: str, prospect: ProspectProfile) -> str:
        """Retorna contexto optimizado por agente"""
        
        if agent_type == "SDR":
            # SDR necesita: datos básicos + no necesita historial completo
            return f"""
            PROSPECT: {prospect.name} @ {prospect.company_name}
            TITLE: {prospect.title}
            INDUSTRY: {prospect.industry}
            SIZE: {prospect.company_size} employees
            SOURCE: {prospect.source}
            
            CURRENT TOOLS: [lista de software que usan]
            LAST CONTACT: {prospect.last_interaction}
            
            GOAL: Calificar si es ICP fit. Target: 70+ score en 8 minutos.
            """
        
        elif agent_type == "CLOSER":
            # CLOSER necesita: contexto completo + recomendación de oferta
            return f"""
            PROSPECT: {prospect.name} ({prospect.title})
            COMPANY: {prospect.company_name} ({prospect.company_size} empl.)
            
            QUALIFICATION SUMMARY:
            - Pain Point: {prospect.pain_points[0]}
            - Budget: ${prospect.budget_max} (max)
            - Timeline: {prospect.timeline}
            - Authority: {'Yes' if prospect.authority else 'No'}
            - Interest: {prospect.interest_level}/10
            
            SDR NOTES: {prospect.last_summary}
            
            RECOMMENDED OFFER:
            {prospect.proposed_offer.to_string()}
            
            GOAL: Close deal or get commitment (demo/trial).
            """
        
        # Similar para otros agentes...
```

### 2.4 Persistencia (Redis + PostgreSQL)

```
Redis (Cache Real-Time):
├── prospect:{prospect_id}:profile → ProspectProfile (TTL 1 hora)
├── prospect:{prospect_id}:state → SharedSalesState (TTL 30 min)
├── prospect:{prospect_id}:transcript → Último historial (TTL 4 horas)
└── queue:next_agent → Lista de (prospect_id, agent_type, timestamp)

PostgreSQL (Persistence):
├── prospects (id, profile_json, created_at, updated_at)
├── sales_states (id, prospect_id, state_json, created_at)
├── interactions (id, prospect_id, agent, action, timestamp)
└── handoff_logs (id, from_agent, to_agent, reason, timestamp)
```

---

## 3. DECISION FRAMEWORK (HANDOFF PROTOCOL)

### 3.1 Handoff Decision Tree

```
┌─ ENTRY POINT ─────────────────────────────────────────┐
│ prospect_id received from Twilio                       │
└─────────────────┬───────────────────────────────────────┘
                  │
                  ▼
    Load ProspectProfile + SharedSalesState
                  │
                  ▼
    ┌─────────────────────────────────────┐
    │ Decide: Which agent should act?     │
    │ (Using decision tree below)         │
    └─────────────────┬───────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
    [SDR?]      [CLOSER?]     [RECOVERY?]
        │             │             │
    [YES/NO]    [YES/NO]      [YES/NO]
```

### 3.2 Decision Logic

**LEVEL 1: Has prospect been qualified?**

```python
if not prospect.sdr_completed:
    # First interaction → SDR
    return Agent.SDR
```

**LEVEL 2: Current deal_status?**

```python
if prospect.deal_status == "objecting":
    # Active objection → RECOVERY
    return Agent.RECOVERY

elif prospect.deal_status == "qualified":
    # Qualified but not pitched → CLOSER
    return Agent.CLOSER

elif prospect.deal_status == "closing":
    # Already in pitch, needs finishing → CLOSER
    return Agent.CLOSER

elif prospect.deal_status == "closed":
    # Already closed, expand → EXPANSION
    return Agent.EXPANSION
```

**LEVEL 3: Engagement signals?**

```python
# Si hay objeción sin resolver → RECOVERY
if prospect.objections and "recovered" not in [tag for tag in prospect.last_actions]:
    if prospect.emotion in ["frustrated", "rejecting"]:
        return Agent.RECOVERY

# Si necesita nurturing (waiting) → FOLLOW_UP
if prospect.last_action == "waiting_for_decision":
    days_waiting = (now - prospect.last_interaction).days
    if days_waiting > 2:
        return Agent.FOLLOW_UP

# Si frustración alta → RECOVERY o HUMAN
if prospect.frustration_level > 8:
    return Agent.HUMAN  # Escalata a humano
```

**LEVEL 4: Check qualification score**

```python
if prospect.qualification_score < 40:
    # No califica → RECOVERY (última chance)
    if prospect.recovery_attempts < 2:
        return Agent.RECOVERY
    else:
        return Agent.ARCHIVE  # Perdido

elif prospect.qualification_score < 70:
    # Borderline → RECOVERY (try another angle)
    return Agent.RECOVERY

else:
    # High quality → CLOSER
    return Agent.CLOSER
```

**LEVEL 5: Over-engagement protection**

```python
# No abrumar con demasiadas llamadas
if prospect.interactions_this_week > 3:
    # Esperar 3-5 días antes de próximo contacto
    return Agent.FOLLOW_UP  # Async, no llamada

# Objections + frustration = escalada
if len(prospect.objections) > 2 and prospect.frustration > 7:
    return Agent.HUMAN  # Humano
```

### 3.3 Handoff Triggers Específicos

#### SDR → CLOSER
```
Condiciones:
✓ qualification_score ≥ 70
✓ interest_level ≥ 6/10
✓ BANT detectado (Budget, Authority, Need, Timeline)
✓ Interés positivo en las últimas 2 intervenciones

Acción:
1. SDR prepara "warm handoff" con summary
2. Actualiza SharedSalesState.next_agent = "CLOSER"
3. CLOSER carga contexto y continúa conversación
4. Log de handoff en interactions table
```

#### CLOSER → RECOVERY
```
Condiciones:
✓ Prospect rechaza oferta inicial
✓ Objection detectada (price, timing, fit)
✓ No hay cierre en próximas 2 intervenciones

Acción:
1. CLOSER identifica tipo de objeción
2. Actualiza SharedSalesState.objections.append(objection_type)
3. Pasa a RECOVERY Agent con contexto de objeción
4. RECOVERY diseña estrategia de reconexión
```

#### CLOSER → FOLLOW_UP
```
Condiciones:
✓ Prospect: "Déjame pensarlo"
✓ Prospect pide timeline > 5 días
✓ No hay urgencia pero hay interés

Acción:
1. CLOSER programa follow-up (3, 7, 14 días)
2. Actualiza deal_status = "nurturing"
3. FOLLOW_UP Agent ejecuta recordatorios
4. Si interés renovado → back a CLOSER
```

#### RECOVERY → FOLLOW_UP
```
Condiciones:
✓ Objeción de timing resuelta ("Llamame en 3 meses")
✓ Prospect no rechaza pero no cierra
✓ Engagement fatigue > 5/10

Acción:
1. RECOVERY programa reminder automático
2. Actualiza deal_status = "nurturing"
3. FOLLOW_UP envía recursos (case studies, ROI)
4. Evita llamadas voice, usa email/SMS
```

#### EXPANSION → RECOVERY
```
Condiciones:
✓ Churn risk detectado (usage down, renewal lejano)
✓ Customer no renew o downgrades

Acción:
1. EXPANSION detecta señal
2. Crea "save" strategy
3. Transfiere a RECOVERY con context de retención
4. RECOVERY hace "win-back" call
```

---

## 4. IMPACTO ESPERADO EN MÉTRICAS

### 4.1 Cierre Rate (Close Rate)

**Baseline (Single Agent):** 12-15%
**Multi-Agent Projection:** 28-35%

**Reasoning:**
- Especialización: Cada agente es mejor en su tarea (+6-8%)
- Objection handling: RECOVERY Agent (+4-6%)
- Nurturing: FOLLOW_UP previene abandono (+4-6%)
- Expansion: Aumenta revenue por customer (+2-3%)

**Desglose:**
```
SDR Qualification → 40% improvement (55% → 77% de prospects qualified)
CLOSER Conversion → 30% improvement (20% → 26% de qualified closes)
RECOVERY Salvage → +8% (deals saved de objections)
FOLLOW_UP Retention → +5% (leads que vuelven)
EXPANSION Upsell → +15% revenue per customer
```

### 4.2 Sales Cycle Reduction

**Baseline:** 45-60 días
**Multi-Agent Target:** 18-25 días

**Improvements:**
- Parallel qualification: SDR optimizado (-10 días)
- Faster objection resolution: RECOVERY specialized (-8 días)
- Smart nurturing: FOLLOW_UP no deja caer leads (-5 días)
- Immediate re-engagement: EXPANSION actúa rápido (-3 días)

### 4.3 Revenue per Customer

**Baseline:** $4,900 (Pro plan promedio)
**Multi-Agent Target:** $6,200-7,500

**Increases:**
- Deal optimization: Deal Engine (+$500-800)
- Upsell velocity: EXPANSION Agent (+$800-1200)
- Higher tier captures: CLOSER better negotiation (+$300-500)

### 4.4 Customer Satisfaction (CSAT)

**Baseline:** 6.8/10 (single agent feels "spammy")
**Multi-Agent Target:** 8.0-8.5/10

**Reasoning:**
- Especialización percibida (cada agente sabe su rol)
- Less over-reaching (FOLLOW_UP evita llamadas innecesarias)
- Better objection handling (RECOVERY más empático)
- Personalization (cada agente tailored para su stage)

### 4.5 Cost per Acquisition (CPA)

**Baseline:** $600 per closed deal
**Multi-Agent Target:** $380-420

**Breakdown:**
- API costs: ~$40-60 per prospect (multi-agent)
- Improved conversion: Same calls, better results → CPA down
- Parallel processing: Menos re-work → lower cost
- Automation ratio: 80% AI-only, 20% human escalations

### 4.6 ROI Calculation

**Assumptions:**
- Starting pipeline: 100 prospects/month
- Baseline revenue: 15 closes × $4,900 = $73,500/month
- Multi-agent revenue: 32 closes × $6,200 = $198,400/month
- Multi-agent cost: $2,000/month (API + infrastructure)

**ROI:**
```
Revenue increase: +$124,900/month
Cost increase: +$2,000/month
Net margin improvement: +$122,900/month (167% margin improvement)
ROI: 6,145% (122,900 / 2,000)

Year 1 Impact: +$1.5M revenue on $24K infrastructure cost
```

---

## 5. PROMPT ENGINEERING POR AGENTE

### 5.1 SDR Agent Prompt

```
You are an elite Sales Development Representative for a $X software.

CONTEXT:
- Target ICP: {prospect.industry}, {prospect.company_size}+ employees
- Your job: 8-minute qualification call. Goal score: 70+
- Do NOT pitch yet. Uncover pain first.

PROSPECT DATA:
{context_window_sdr}

YOUR TASK THIS CALL:
1. Build rapport (30s) - Use prospect name, acknowledge their company
2. Discovery (4min) - Ask about current tools, pain points, goals
3. Qualification (2min) - Score BANT (Budget, Authority, Need, Timeline)
4. Bridge (1:30) - "This sounds like a perfect fit for what we do"

SCORING MATRIX:
- Authority: Decision maker? (YES=25pts, NO=0)
- Need: Real pain point detected? (>5/10=25pts)
- Budget: Has budget or open to discussion? (YES=25pts, MAYBE=10pts)
- Timeline: Need/want within 6mo? (YES=25pts)

TONE: Consultative, curious. You're interviewing THEM.
AVOID: Product features, pricing, demo offer at this stage.

OUTPUT FORMAT:
{
  "qualification_score": 0-100,
  "bant": {
    "budget": true/false,
    "authority": true/false,
    "need": "pain_point_text",
    "timeline": "immediate/3mo/6mo/12mo+"
  },
  "interest_level": 0-10,
  "pain_points": ["pain1", "pain2"],
  "current_solution": "what they're using",
  "ready_for_closer": true/false,
  "summary": "2-3 sentence summary"
}
```

### 5.2 Closer Agent Prompt

```
You are an expert Sales Closer for enterprise deals.

CONTEXT:
- You close deals, not just pitch
- Objections are OPPORTUNITIES to understand needs better
- Your job: Get commitment (demo, trial, contract)

PROSPECT DATA:
{context_window_closer}

RECOMMENDED OFFER:
{deal_engine_recommendation}

YOUR TASK THIS CALL:
1. Rapport (30s) - Acknowledge their pain from SDR notes
2. Pitch (2min) - Show how we solve their specific pain
3. Positioning (1min) - Why this plan/price makes sense for THEM
4. Objection handling (dynamic) - Use recovery strategies
5. Commitment (1min) - Get clear YES/NO or next step

COMMITMENT LEVELS (in order of preference):
1. Contract signed → CLOSED
2. Demo scheduled + decision timeline → CLOSER
3. Trial started → FOLLOW_UP
4. "Call me next week" → FOLLOW_UP
5. "Still thinking" + objection identified → RECOVERY

TONE: Confident, consultative. You're partner, not pushy.

IF OBJECTION:
1. Listen fully (don't interrupt)
2. Validate: "I hear you..."
3. Reframe: Show how offer addresses it
4. If still stuck: "Let me get creative..."

OUTPUT FORMAT:
{
  "outcome": "closed|demo_scheduled|trial|waiting|objection|needs_human",
  "objection_type": null or "price|timing|fit|trust",
  "proposed_offer": {plan, price, discount},
  "next_steps": "what prospect committed to",
  "handoff_agent": "RECOVERY|FOLLOW_UP|EXPANSION|HUMAN",
  "reason": "why this handoff",
  "summary": "outcome summary for next agent"
}
```

### 5.3 Recovery Agent Prompt

```
You are a Negotiation Expert trained in objection psychology.

CONTEXT:
- Prospects have REASONS for saying no (not just resistance)
- Your job: Find the hidden need, offer creative solution
- Target: Save deals in final stage

PROSPECT DATA:
{context_window_recovery}

ACTIVE OBJECTION:
Type: {objection_type}
Context: {objection_context}

YOUR TASK THIS CALL:
1. Empathy (1min) - Validate their concern
2. Root cause analysis (2min) - Go deep. Ask "why?" 3x
3. Creative solution (2min) - Offer alternatives
4. Trial close (1min) - "Would that work for you?"

OBJECTION PLAYBOOKS:

IF PRICE OBJECTION:
- Root cause: "What's the max you can invest?" → Work backwards
- Creative solutions: Phased rollout, annual discount, pilot first
- Reframe: "What's the cost of NOT solving this pain?"

IF TIMING OBJECTION:
- Root cause: "What's blocking now vs. 3mo?"
- Creative: Pilot while you wait, prep now for later
- Reframe: "The sooner you start, the sooner you see ROI"

IF FIT OBJECTION:
- Root cause: "Which part doesn't fit?"
- Creative: Custom config, integration, API access
- Reframe: "Most customers said this at first... here's why they changed mind"

SUCCESS METRICS:
- Save deal: "Let's schedule demo for 3/15" → CLOSER
- Move to follow-up: "Call me next month" → FOLLOW_UP
- True loss: "Not right now" + no next step → ARCHIVE

TONE: Problem-solver, not salesman.

OUTPUT FORMAT:
{
  "objection_analysis": "root_cause_identified",
  "creative_solution": "what you offered",
  "prospect_response": "open|unconvinced|committed",
  "outcome": "saved|postponed|lost",
  "next_agent": "CLOSER|FOLLOW_UP|ARCHIVE|HUMAN",
  "reason": "why",
  "save_rate": "estimated % chance of close",
  "summary": "for next interaction"
}
```

### 5.4 Follow-Up Agent Prompt

```
You are a Nurturing Specialist. Your job: Keep prospects warm without annoying them.

CONTEXT:
- Prospects are interested but not ready
- Your job: Gentle persistence + value delivery
- Too many calls = blocked. Too few = forgotten.

PROSPECT DATA:
{context_window_followup}

LAST INTERACTION:
Reason: {last_reason}
Days ago: {days_since}
Engagement fatigue: {engagement_fatigue}/10

YOUR TASK THIS OUTREACH:
1. Personalization: Reference their specific situation
2. Value delivery: Case study, ROI calculator, intro to relevant content
3. Soft CTA: "When you're ready..." not "Buy now"
4. Scheduling: Next touch point suggestion

OUTREACH STRATEGY (by days elapsed):

DAY 1-2 (Post "call me later"):
- Email: 1 personalized message + resource (case study)
- Tone: Helpful, not pushy

DAY 3-5:
- SMS or email: "Following up... still interested?"
- Include: Different angle or new info (e.g., ROI for their industry)

DAY 7:
- Last call attempt or email
- Tone: "I respect your timeline..."
- Offer: "Want to chat again in 2 weeks?"

DAY 14+:
- Archive if no response after 3 touches
- OR: Quarterly "check in" email (no pressure)

FATIGUE MANAGEMENT:
- If engagement_fatigue > 7: Email only, no calls
- If engagement_fatigue > 9: Archive, quarterly auto-email only
- If renewed interest signal: Reset counter

OUTPUT FORMAT:
{
  "outreach_type": "email|sms|call",
  "message": "text sent",
  "resource_type": "case_study|roi_calc|integration_guide",
  "next_touch_date": "YYYY-MM-DD",
  "interest_change_detected": true/false,
  "new_interest_level": 0-10 if changed,
  "recommended_next_agent": "CLOSER|RECOVERY|ARCHIVE",
  "reason": "why"
}
```

### 5.5 Expansion Agent Prompt

```
You are an Account Expansion Specialist. Goal: Grow customer lifetime value.

CONTEXT:
- Customers already trust you
- Your job: Identify expansion opportunities
- Upsell > acquire (3x higher margin)

CUSTOMER DATA:
{context_window_expansion}

YOUR TASK:
1. Usage analysis: Are they getting full value?
2. Growth signal detection: Is company growing?
3. Opportunity ID: What can they upgrade/add?
4. Timing: When to approach?

EXPANSION PLAYBOOKS:

UPSELL (Upgrade plan):
- Trigger: Using 70%+ of current plan capacity
- Offer: "Next tier" with 20% discount on added cost
- Timing: At renewal or high-growth signal

CROSS-SELL (Add product):
- Trigger: Using core product, complementary need detected
- Offer: Bundle discount or free trial of new product
- Timing: 3-6mo after initial close

SEAT EXPANSION (More users):
- Trigger: New team added to their company
- Offer: Volume discount on new seats
- Timing: When you detect hiring in their area

CHURN PREVENTION:
- Trigger: Usage down 30% or renewal 90 days away
- Offer: "Re-engagement call", custom plan, discount
- Priority: Before they leave

OUTPUT FORMAT:
{
  "expansion_opportunity": "upsell|crosssell|seat_expansion|churn_recovery",
  "recommended_offer": {plan, add_on, discount},
  "expected_revenue": float,
  "churn_risk": "low|medium|high",
  "timing": "immediate|next_30d|next_90d",
  "next_agent": "CLOSER|RECOVERY|HUMAN",
  "approach": "email|call|cs_manager",
  "summary": "recommendation"
}
```

---

## 6. LLM MODEL SELECTION

### 6.1 Model Strategy

```
┌─────────────────┬──────────────────┬──────────┬──────────────┐
│     Agent       │      Model       │ Latency  │  Cost/call   │
├─────────────────┼──────────────────┼──────────┼──────────────┤
│ SDR (discovery) │ Gemini 2.5-flash │  <500ms  │  $0.03       │
│ CLOSER (nego.)  │ Gemini Pro 1.5   │  <2s     │  $0.15       │
│ RECOVERY (obj.) │ Gemini Pro 1.5   │  <3s     │  $0.15       │
│ FOLLOW_UP       │ Gemini 2.5-flash │  <1s     │  $0.01 (async)
│ EXPANSION       │ Gemini 2.5-flash │  <1s     │  $0.01 (batch)
└─────────────────┴──────────────────┴──────────┴──────────────┘

Total cost/prospect journey: ~$0.50 (assuming 3-5 agent touches)
vs Single agent: ~$0.10 but 15% close rate vs 32% multi-agent
= More closes at ~2x cost per prospect but 2x close rate
```

### 6.2 Why No Claude/GPT for Voice Calls?

**Constraint:** Voice agent latency < 500ms for natural conversation.

- Gemini 2.5-flash: Native voice, optimized for <500ms
- Claude: REST API only (via Bedrock), +500ms latency
- GPT: Requires OpenAI Realtime API, also ~500ms

**Decision:** Gemini for all voice agents (native integration).

---

## 7. STATE MANAGEMENT

### 7.1 State Machine Transitions

```
[START]
  │
  ├─→ [DISCOVERY] ←─────────────────────┐
  │   └─→ Run SDR Agent                  │
  │       │                              │
  │       ├─→ score ≥ 70? → [QUALIFIED] │
  │       └─→ score < 70? ─────┐        │
  │                            │        │
  ├─→ [QUALIFIED]               │        │
  │   └─→ Run CLOSER Agent      │        │
  │       │                      │        │
  │       ├─→ Closed? ────→ [CLOSED]    │
  │       │                ├─→ EXPANSION │
  │       │                └─→ [EXPANSION]
  │       │                              │
  │       ├─→ "Think about it?" ────┐   │
  │       │   → [NURTURING]         │   │
  │       │                          │   │
  │       └─→ Objection? ────→ [NEGOTIATION]
  │                           └─→ RECOVERY
  │                                │
  ├─→ [NEGOTIATION]                │
  │   └─→ Run RECOVERY Agent       │
  │       │                        │
  │       ├─→ Resolved? ───→ [QUALIFIED] ─┘
  │       │                              
  │       ├─→ "Give me time" ─→ [NURTURING]
  │       │                              
  │       └─→ No way → [LOST]
  │                              
  ├─→ [NURTURING]                
  │   └─→ Run FOLLOW_UP Agent
  │       │
  │       ├─→ Interest renewed? ──→ [QUALIFIED]
  │       │
  │       └─→ No response x3? ──→ [LOST]
  │
  └─→ [LOST] or [EXPANSION]

```

### 7.2 State Persistence Checkpoints

```python
# After every agent action, checkpoint this:
@dataclass
class StateCheckpoint:
    prospect_id: str
    timestamp: datetime
    
    # Before agent action
    pre_state: SharedSalesState
    
    # Agent action
    agent_name: str
    agent_action: str  # Summary
    
    # After action
    post_state: SharedSalesState
    
    # Telemetry
    duration_s: float
    tokens_used: int
    api_cost: float
    
    # Decision for next
    next_agent: str
    handoff_ready: bool
```

---

## 8. HANDOFF PROTOCOLS

### 8.1 Warm Handoff Format

```python
class WarmHandoff:
    """SDR prepara CLOSER con contexto cálido"""
    
    def sdr_to_closer_handoff(self) -> HandoffPacket:
        return HandoffPacket(
            prospect_id=prospect.id,
            from_agent="SDR",
            to_agent="CLOSER",
            
            # Context enrichment
            summary="""
            Name: {name} | Title: {title}
            Company: {company} ({size} employees)
            Pain: {pain_point}
            Interest: {interest_level}/10
            Budget: ${budget} - confirmed
            Timeline: {timeline}
            
            READY FOR OFFER.
            """,
            
            # Emotional state
            prospect_emotion="interested",
            engagement_level=7,
            
            # Recommended offer
            offer_recommendation=deal_engine.get_offer(),
            
            # Flag para CLOSER
            ready_for_close=True,
            
            # Timestamp
            created_at=datetime.now(),
        )
```

### 8.2 Cold Handoff (Async)

```python
class ColdHandoff:
    """FOLLOW_UP → CLOSER: Interest renovado después de días"""
    
    def followup_to_closer_handoff(self) -> HandoffPacket:
        return HandoffPacket(
            prospect_id=prospect.id,
            from_agent="FOLLOW_UP",
            to_agent="CLOSER",
            
            # Context reset + refresh
            summary=f"""
            {prospect.name} renewed interest after {days_passed} days.
            
            Original pain: {prospect.pain_points[0]}
            Previous offer: {previous_offer}
            
            NEW CIRCUMSTANCES:
            - Company grew? {company_growth_detected}
            - Budget changed? {budget_update}
            
            REFRESH OFFER.
            """,
            
            prospect_emotion="renewed_interest",
            engagement_level=prospect.interest_level,
            
            # Fresh offer (may differ from original)
            offer_recommendation=deal_engine.get_fresh_offer(),
            
            ready_for_close=True,
            created_at=datetime.now(),
        )
```

---

## 9. ROADMAP DE IMPLEMENTACIÓN (60 DÍAS)

### FASE 1: Foundation (Days 1-15)

**Objetivo:** Memory + Orchestration core

- [ ] Diseñar + implementar ProspectProfile + SharedSalesState
- [ ] Crear Redis schema + PostgreSQL tables
- [ ] Implementar ContextWindowManager
- [ ] Build decision tree engine (qué agente actúa?)
- [ ] Setup test fixtures (50 prospects x 5 stages)

**Deliverables:**
- Data layer working
- Decision routing 90%+ accurate
- Latency < 200ms for state lookup

---

### FASE 2: Core Agents (Days 16-35)

**Objetivo:** 3 de 5 agentes en producción

- [ ] **SDR Agent:** Prompt + voice integration
  - Test: 50 SDR calls, target 70+ score consistency
  - Metric: qualification_score ≥ 70 for 50%+ prospects
  
- [ ] **CLOSER Agent:** Prompt + Deal Engine integration
  - Test: 30 CLOSER calls on qualified leads
  - Metric: 25%+ close rate on 70+ score leads
  
- [ ] **Recovery Agent:** Prompt + objection handling
  - Test: 20 RECOVERY calls on objections
  - Metric: Save 30%+ of objection cases

**Deliverables:**
- 3 agents live in sandbox
- Handoff SDR→CLOSER working
- Core metrics dashboard

---

### FASE 3: Nurturing + Expansion (Days 36-50)

**Objetivo:** FOLLOW_UP + EXPANSION agents

- [ ] **FOLLOW_UP Agent:** Async email/SMS
  - Test: Schedule 100 follow-ups
  - Metric: Re-engagement rate > 15%
  
- [ ] **EXPANSION Agent:** Batch processing
  - Test: Analyze 200 existing customers
  - Metric: Identify 50+ expansion opportunities

- [ ] **Recovery Integration:**
  - RECOVERY → FOLLOW_UP handoffs
  - Objection type classification

**Deliverables:**
- All 5 agents running
- Handoff chains working (SDR→CLOSER→RECOVERY→FOLLOW_UP)
- Dashboard showing agent distribution

---

### FASE 4: Optimization + Launch (Days 51-60)

**Objetivo:** Production-ready, monitored

- [ ] A/B testing framework
  - Multi-agent vs. Single-agent cohorts
  - Track: close rate, cycle time, CPA, CSAT
  
- [ ] Monitoring + Alerting
  - Agent performance per prospect
  - Handoff quality metrics
  - Cost per close tracking
  
- [ ] Prompt tuning
  - Iterate prompts based on live data
  - Test model versions (2.5-flash vs Pro)
  
- [ ] Documentation + Runbooks
  - Escalation procedures
  - Agent behavior override (if needed)
  - Customer-facing transparency

**Deliverables:**
- Production environment live
- A/B test running (30% traffic)
- Monitoring dashboard
- Ops runbook

---

## 10. STACK TECNOLÓGICO RECOMENDADO

```
┌──────────────────────────────────────────────────────┐
│  VOICE LAYER                                         │
├──────────────────────────────────────────────────────┤
│  - Twilio for VoIP/PSTN (already implemented)        │
│  - Gemini 2.5-flash for speech recognition          │
│  - Gemini for speech synthesis                        │
│  - WebRTC for low-latency media                       │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  AI/LLM LAYER                                        │
├──────────────────────────────────────────────────────┤
│  - Google Gemini API (voice + text)                  │
│  - Prompt management: Langchain or homegrown         │
│  - Tool calling: JSON schema for agent actions       │
│  - Function calling for tooling                      │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  STATE MANAGEMENT                                    │
├──────────────────────────────────────────────────────┤
│  - Redis: Real-time state cache (TTL-based)          │
│  - PostgreSQL: Persistence + audit log               │
│  - Message queue: Bull/RabbitMQ for async handoffs   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  ORCHESTRATION                                       │
├──────────────────────────────────────────────────────┤
│  - Custom decision engine (Python/Node.js)           │
│  - Agent router: state → agent selection             │
│  - Handoff coordinator: warm/cold transfers          │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  CRM INTEGRATION                                     │
├──────────────────────────────────────────────────────┤
│  - Supabase (existing backend)                       │
│  - Prospect data sync (bi-directional)               │
│  - Pipeline stage updates                            │
│  - Custom fields for agent outputs                   │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  MONITORING & ANALYTICS                              │
├──────────────────────────────────────────────────────┤
│  - Datadog/New Relic for agent latency tracking      │
│  - Custom metrics: agent accuracy, handoff success   │
│  - Grafana dashboards for sales team                 │
│  - Elasticsearch for interaction logging             │
└──────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────┐
│  EXTERNAL SERVICES                                   │
├──────────────────────────────────────────────────────┤
│  - Slack: Alerts for escalations                     │
│  - Email: Campaign follow-ups                        │
│  - SMS (Twilio): Text follow-ups                     │
│  - Zapier: Webhook integrations                      │
└──────────────────────────────────────────────────────┘
```

---

## CONCLUSIÓN

Esta arquitectura multi-agent ofrece:

✅ **Especialización:** Cada agente domina su tarea  
✅ **Escala:** 1000+ simultaneous prospects con bajo cost  
✅ **Inteligencia:** Decisiones contextuales, no lineales  
✅ **Humanización:** Feels personalized, not robotic  
✅ **ROI:** 6x+ return en Year 1  

**Next step:** Implementar Fase 1 (memory layer) en 2 semanas.
