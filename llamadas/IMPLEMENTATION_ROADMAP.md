# Multi-Agent Implementation Roadmap (60 Days)

## Executive Summary

Deploy 5 specialized sales agents (SDR, CLOSER, RECOVERY, FOLLOW_UP, EXPANSION) with shared memory layer. Expected outcomes:
- **Close rate:** 15% → 32% (+113%)
- **Sales cycle:** 60 days → 22 days (-63%)
- **Revenue per customer:** $4,900 → $6,500 (+33%)
- **ROI:** 6,145% Year 1

---

## PHASE 1: Foundation (Days 1-15)

### Goal
Build memory layer + routing engine. No agents yet, just plumbing.

### Deliverables

#### 1.1 Database Schema (Days 1-2)
**Task:** Create PostgreSQL tables for prospects, states, handoffs

```sql
-- Core tables
CREATE TABLE prospects (
    prospect_id UUID PRIMARY KEY,
    profile_data JSONB NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE sales_states (
    prospect_id UUID PRIMARY KEY REFERENCES prospects(prospect_id),
    state_data JSONB NOT NULL,
    current_stage VARCHAR(50),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE interactions (
    id BIGSERIAL PRIMARY KEY,
    prospect_id UUID REFERENCES prospects(prospect_id),
    agent_type VARCHAR(20),
    action_summary TEXT,
    outcome_json JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE handoff_logs (
    id BIGSERIAL PRIMARY KEY,
    prospect_id UUID REFERENCES prospects(prospect_id),
    from_agent VARCHAR(20),
    to_agent VARCHAR(20),
    reason TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_prospects_updated ON prospects(updated_at DESC);
CREATE INDEX idx_interactions_prospect ON interactions(prospect_id, created_at DESC);
CREATE INDEX idx_handoffs_prospect ON handoff_logs(prospect_id, created_at DESC);
```

**Owner:** Backend Lead  
**Tests:** Schema validation, migrations reversible

---

#### 1.2 Shared Memory Implementation (Days 3-5)
**Files:** `/app/multi_agent/shared_memory.py`

**Components:**
- `ProspectProfile`: Complete prospect context
- `SharedSalesState`: Unified sales state machine
- `SharedMemoryStore`: Redis + PostgreSQL persistence

**Checklist:**
- [ ] ProspectProfile dataclass complete
- [ ] SharedSalesState with all pipeline stages
- [ ] to_dict() / from_dict() serialization
- [ ] SharedMemoryStore.save_prospect() works
- [ ] SharedMemoryStore.load_prospect() works
- [ ] Redis fallback when unavailable
- [ ] Unit tests: 95%+ coverage

**Tests:**
```python
async def test_prospect_save_load():
    store = SharedMemoryStore(redis, db)
    profile = ProspectProfile(prospect_id="test", name="John")
    await store.save_prospect(profile)
    
    loaded = await store.load_prospect("test")
    assert loaded.name == "John"

async def test_state_persistence():
    state = SharedSalesState(prospect_id="test")
    await store.save_state(state)
    
    loaded = await store.load_state("test")
    assert loaded.prospect_id == "test"
```

**Owner:** Backend Lead  
**Blockers:** None

---

#### 1.3 Agent Router Implementation (Days 6-10)
**File:** `/app/multi_agent/agent_router.py`

**Components:**
- `AgentRouter`: Decision tree (20-30 lines per decision level)
- `ContextWindowOptimizer`: Tailored prompts per agent

**Decision Levels:**
1. Has prospect been qualified? → SDR
2. Current deal_status? → Route accordingly
3. Qualification score? → Escalate/downgrade
4. Over-engagement? → Follow-up async
5. Frustration? → HUMAN escalation
6. Engagement fatigue? → ARCHIVE
7. Objections? → RECOVERY
8. Interest level? → Decision
9. Time-based triggers? → Action

**Tests:**
```python
async def test_route_sdr_not_qualified():
    state = SharedSalesState(prospect_id="test", sdr_completed=False)
    profile = ProspectProfile(prospect_id="test", qualification_score=0)
    
    agent, reason = await router.route_agent(profile, state)
    assert agent == AgentType.SDR

async def test_route_closer_on_qualified():
    state = SharedSalesState(prospect_id="test", sdr_completed=True)
    profile = ProspectProfile(
        prospect_id="test",
        qualification_score=75,
        deal_status=DealStatus.QUALIFIED
    )
    
    agent, reason = await router.route_agent(profile, state)
    assert agent == AgentType.CLOSER

# ... 15+ more tests covering all decision paths
```

**Owner:** AI/ML Lead  
**Blockers:** Shared Memory complete

---

#### 1.4 Redis Integration (Days 7-8)
**Task:** Setup Redis for real-time state cache

**Configuration:**
```python
REDIS_CONFIG = {
    "url": "redis://localhost:6379",
    "encoding": "utf-8",
    "decode_responses": True,
    "socket_keepalive": True,
    "retry_on_timeout": True,
}

# TTLs
PROSPECT_PROFILE_TTL = 3600  # 1 hour
SALES_STATE_TTL = 1800  # 30 min
TRANSCRIPT_TTL = 14400  # 4 hours
QUEUE_RETENTION = 86400  # 24 hours
```

**Tests:**
- [ ] Connection pool works
- [ ] TTL expiration works
- [ ] Fallback to in-memory works
- [ ] Data consistency: Redis vs PostgreSQL

**Owner:** DevOps  
**Blockers:** None

---

#### 1.5 Monitoring & Telemetry (Days 9-15)
**Setup:**
- Datadog integration
- Custom metrics for agent routing
- Dashboard: "Multi-Agent Overview"

**Metrics:**
```python
# Publish to Datadog
metrics.gauge("agent.routing_latency_ms", latency_ms)
metrics.increment("agent.route", tags=[f"agent:{agent_type}"])
metrics.gauge("prospect.queue_size", queue_size)
metrics.gauge("prospect.qualification_score", score, tags=[f"prospect_id:{pid}"])
```

**Dashboard:**
```
┌─ Multi-Agent Status ────────────────────────┐
│ SDR Calls/hour: 45                          │
│ CLOSER Calls/hour: 12                       │
│ RECOVERY Calls/hour: 8                      │
│ FOLLOW_UP Async/hour: 120                   │
│ EXPANSION Batch/hour: 50                    │
│                                             │
│ Avg Routing Decision: 120ms                 │
│ Redis Hit Rate: 92%                         │
│ Queue Depth: 23 handoffs waiting            │
└─────────────────────────────────────────────┘
```

**Owner:** DevOps  
**Blockers:** Redis complete

---

### PHASE 1 SIGN-OFF

- [ ] Memory layer 100% tested
- [ ] Router decision tree 95%+ accurate
- [ ] Redis/DB persistence working
- [ ] Monitoring dashboard live
- [ ] Load test: 1000 prospects, <200ms routing

**Timeline:** On track (Days 1-15)

---

## PHASE 2: Core Agents (Days 16-35)

### Goal
Implement 3 of 5 agents (SDR, CLOSER, RECOVERY). Test on live traffic.

---

### 2.1 SDR Agent (Days 16-22)

#### Objective
Qualify prospects (BANT framework) → score ≥ 70

#### Implementation
**File:** `/app/multi_agent/agents/sdr_agent.py`

```python
class SDRAgent:
    def __init__(self, gemini_client, memory_store):
        self.llm = gemini_client
        self.memory = memory_store
        self.model = "gemini-2.5-flash"

    async def handle_prospect(self, prospect_id: str) -> SDROutput:
        """
        Main SDR handler for incoming call.
        
        Flow:
        1. Load prospect profile
        2. Build context (500 tokens max)
        3. Run LLM conversation
        4. Extract: score, BANT, pain points
        5. Save to shared memory
        6. Decide: qualified? → route to CLOSER
        """
        
        # Load context
        prospect = await self.memory.load_prospect(prospect_id)
        state = await self.memory.load_state(prospect_id)
        
        # Build prompt
        context = ContextWindowOptimizer.get_sdr_context(prospect, state)
        prompt = self._build_sdr_prompt(context)
        
        # Call Gemini
        response = await self.llm.generate_content(
            prompt,
            model=self.model,
            config={"max_output_tokens": 500, "temperature": 0.7}
        )
        
        # Parse output
        output = SDROutput.from_llm_response(response.text)
        
        # Update prospect
        prospect.qualification_score = output.qualification_score
        prospect.interest_level = output.interest_level
        prospect.pain_points = output.pain_points
        prospect.current_solution = output.current_solution
        prospect.authority = output.bant["authority"]
        prospect.budget_max = output.bant["budget"]
        prospect.need_detected = output.bant["need"]
        prospect.timeline = output.bant["timeline"]
        
        # Update state
        state.sdr_completed = True
        if output.qualification_score >= 70:
            state.current_stage = PipelineStage.QUALIFIED
            state.deal_status = DealStatus.QUALIFIED
            prospect.deal_status = DealStatus.QUALIFIED
            state.next_agent = AgentType.CLOSER
        else:
            state.next_agent = AgentType.RECOVERY
        
        # Persist
        await self.memory.save_prospect(prospect)
        await self.memory.save_state(state)
        
        return output

    def _build_sdr_prompt(self, context: str) -> str:
        return f"""You are an elite Sales Development Representative.

{context}

YOUR TASK:
1. Build rapport in first 30 seconds
2. Discover their current tools and pain points (4 minutes)
3. Qualify using BANT (2 minutes):
   - Budget: What's their investment capacity?
   - Authority: Are they decision maker?
   - Need: What problem are they solving?
   - Timeline: When do they need it?
4. Bridge to next stage if qualified (1:30)

SCORING:
- Authority YES: +25 pts
- Real need (>5/10): +25 pts
- Has budget or open: +25 pts
- Timeline within 6mo: +25 pts

OUTPUT JSON:
{{
    "qualification_score": 0-100,
    "interest_level": 0-10,
    "bant": {{
        "budget": true/false or amount,
        "authority": true/false,
        "need": "pain_description",
        "timeline": "immediate|3mo|6mo|12mo+"
    }},
    "pain_points": ["pain1", "pain2"],
    "current_solution": "what they use",
    "ready_for_closer": true/false,
    "summary": "2-3 sentence summary for closer"
}}

Remember: Consultative, not salesy. You're discovering their needs.
"""
```

**Prompt Testing:**
```python
# Test prompts with different scenarios
test_cases = [
    {
        "name": "hot_lead",
        "context": "Tech founder, 50 employees, pain is manual processes",
        "expected_score": "75-85",
        "expected_ready": True,
    },
    {
        "name": "cold_lead",
        "context": "HR person, not decision maker, no budget",
        "expected_score": "30-40",
        "expected_ready": False,
    },
    # ... more scenarios
]

for test_case in test_cases:
    output = await sdr.handle_prospect_simulation(test_case)
    assert int(output.qualification_score) in range(
        *map(int, test_case["expected_score"].split("-"))
    )
```

**Live Testing (Days 20-22):**
- Run SDR on 50 real calls
- Target metric: 50%+ prospects score ≥ 70
- Iterate prompts based on results

**Owner:** AI/ML Lead  
**Blockers:** Phase 1 complete

---

### 2.2 CLOSER Agent (Days 23-28)

#### Objective
Close qualified deals → 25%+ conversion on 70+ score

#### Implementation
**File:** `/app/multi_agent/agents/closer_agent.py`

```python
class CloserAgent:
    def __init__(self, gemini_client, deal_engine, memory_store):
        self.llm = gemini_client
        self.deal_engine = deal_engine  # For offer recommendations
        self.memory = memory_store
        self.model = "gemini-pro-1.5"  # Better reasoning

    async def handle_prospect(self, prospect_id: str) -> CloserOutput:
        """
        Main CLOSER handler.
        
        Flow:
        1. Load full prospect context from SDR
        2. Get offer recommendation from Deal Engine
        3. Run conversation: rapport → pitch → handle objection → close
        4. Extract: outcome (closed|demo|trial|waiting|objection)
        5. If objection: route to RECOVERY
        6. If closed: send to EXPANSION
        """
        
        prospect = await self.memory.load_prospect(prospect_id)
        state = await self.memory.load_state(prospect_id)
        
        # Get offer recommendation
        offer = await self.deal_engine.get_best_offer({
            "industry": prospect.industry,
            "company_size": prospect.company_size,
            "budget_max": prospect.budget_max,
            "pain_points": prospect.pain_points,
        })
        prospect.proposed_offer = offer.to_dict()
        
        # Build context for CLOSER
        context = ContextWindowOptimizer.get_closer_context(prospect, state)
        prompt = self._build_closer_prompt(context, offer)
        
        # Call Gemini
        response = await self.llm.generate_content(
            prompt,
            model=self.model,
            config={"max_output_tokens": 1000, "temperature": 0.6}
        )
        
        # Parse output
        output = CloserOutput.from_llm_response(response.text)
        
        # Update prospect
        prospect.last_agent_action = output.summary
        prospect.emotion = output.prospect_emotion
        
        # Update state based on outcome
        if output.outcome == "closed":
            prospect.deal_status = DealStatus.CLOSED_WON
            state.current_stage = PipelineStage.CLOSED
            state.next_agent = AgentType.EXPANSION
            state.close_probability = 1.0
        
        elif output.outcome == "demo_scheduled":
            prospect.deal_status = DealStatus.DEMO_SCHEDULED
            state.current_stage = PipelineStage.CLOSING
            state.next_agent = AgentType.FOLLOW_UP
            state.expected_close_date = output.demo_date
            state.close_probability = 0.6
        
        elif output.outcome == "trial":
            prospect.deal_status = DealStatus.TRIAL_STARTED
            state.current_stage = PipelineStage.CLOSING
            state.next_agent = AgentType.EXPANSION
            state.close_probability = 0.7
        
        elif output.outcome == "waiting":
            prospect.deal_status = DealStatus.WAITING
            state.current_stage = PipelineStage.NURTURING
            state.next_agent = AgentType.FOLLOW_UP
            state.follow_up_scheduled = datetime.now() + timedelta(days=output.days_to_follow)
            state.close_probability = 0.4
        
        elif output.outcome == "objection":
            prospect.deal_status = DealStatus.OBJECTING
            prospect.objections.append(output.objection_type)
            state.current_stage = PipelineStage.NEGOTIATION
            state.next_agent = AgentType.RECOVERY
            state.recovery_needed = True
            state.close_probability = 0.2
        
        elif output.outcome == "needs_human":
            prospect.frustration_level = min(10, prospect.frustration_level + 3)
            state.next_agent = AgentType.HUMAN
            state.close_probability = 0.1
        
        # Persist
        await self.memory.save_prospect(prospect)
        await self.memory.save_state(state)
        
        return output

    def _build_closer_prompt(self, context: str, offer) -> str:
        offer_str = f"""
Plan: {offer.plan}
Price: ${offer.price}/month
Discount: {offer.discount_percent}%
Confidence: {offer.confidence:.0%}
"""
        
        return f"""You are a world-class Sales Closer.

{context}

OFFER TO PRESENT:
{offer_str}

YOUR TASK (9 minutes total):
1. Rapport (30s): Acknowledge their pain from discovery
2. Pitch (2min): Show HOW we solve their specific pain
3. Positioning (1min): Why THIS plan at THIS price for THEM
4. Objection handling (3min): Listen → Validate → Reframe → Solution
5. Commitment (2:30): Get YES/NO or clear next step

COMMITMENT HIERARCHY:
1. Contract signed → CLOSED
2. "Let's do a demo on [DATE]" → DEMO_SCHEDULED
3. "Let's start with a 30-day trial" → TRIAL
4. "Let me think about it" + date set → WAITING
5. Objection → RECOVERY
6. "I need to check with [person]" + frustration high → NEEDS_HUMAN

IF OBJECTION DETECTED:
Listen fully. Don't interrupt.
Validate: "I hear you..."
Reframe: "What we typically see is..."
Solution: "Here's what we can do..."

TONE: Confident partner. You know this works. You're not desperate.

OUTPUT JSON:
{{
    "outcome": "closed|demo_scheduled|trial|waiting|objection|needs_human",
    "prospect_emotion": "interested|neutral|skeptical|frustrated",
    "objection_type": null or "price|timing|fit|trust",
    "demo_date": null or "YYYY-MM-DD HH:MM",
    "days_to_follow": 3 or whatever they said,
    "summary": "outcome in 1-2 sentences",
    "next_steps": "what prospect committed to"
}}

Close this deal or get a strong next step.
"""
```

**Live Testing (Days 26-28):**
- Run CLOSER on 30 qualified leads
- Target: 25%+ close rate
- A/B test: offer variants, pitch angles

**Owner:** AI/ML Lead  
**Blockers:** SDR Agent working

---

### 2.3 Recovery Agent (Days 29-35)

#### Objective
Save deals with objections → 30%+ recovery

#### Implementation
**File:** `/app/multi_agent/agents/recovery_agent.py`

```python
class RecoveryAgent:
    def __init__(self, gemini_client, memory_store):
        self.llm = gemini_client
        self.memory = memory_store
        self.model = "gemini-pro-1.5"

    async def handle_prospect(self, prospect_id: str) -> RecoveryOutput:
        """
        Handle objections with deep problem-solving.
        
        Flow:
        1. Load prospect + active objection
        2. Analyze root cause (ask "why?" 3x)
        3. Offer creative alternative
        4. Trial close: "Would that work?"
        5. Outcome: saved|postponed|lost
        """
        
        prospect = await self.memory.load_prospect(prospect_id)
        state = await self.memory.load_state(prospect_id)
        
        context = ContextWindowOptimizer.get_recovery_context(prospect, state)
        prompt = self._build_recovery_prompt(context)
        
        response = await self.llm.generate_content(
            prompt,
            model=self.model,
            config={"max_output_tokens": 800, "temperature": 0.7}
        )
        
        output = RecoveryOutput.from_llm_response(response.text)
        
        # Update prospect
        prospect.emotion = output.prospect_response
        
        # Update state based on outcome
        if output.outcome == "saved":
            prospect.deal_status = DealStatus.QUALIFIED  # Re-qualified
            state.current_stage = PipelineStage.QUALIFIED
            state.next_agent = AgentType.CLOSER  # Back to CLOSER
            state.close_probability = 0.5
        
        elif output.outcome == "postponed":
            prospect.deal_status = DealStatus.WAITING
            state.current_stage = PipelineStage.NURTURING
            state.next_agent = AgentType.FOLLOW_UP
            state.follow_up_scheduled = datetime.now() + timedelta(days=30)
            state.close_probability = 0.3
        
        elif output.outcome == "lost":
            prospect.deal_status = DealStatus.CLOSED_LOST
            state.current_stage = PipelineStage.LOST
            state.next_agent = AgentType.ARCHIVE
            state.close_probability = 0.0
        
        # Persist
        await self.memory.save_prospect(prospect)
        await self.memory.save_state(state)
        
        return output

    def _build_recovery_prompt(self, context: str) -> str:
        return f"""You are a Negotiation Expert trained in objection psychology.

{context}

YOUR MISSION:
Find the REAL reason behind the objection.
Ask "why?" multiple times to uncover hidden concerns.
Then offer a creative solution they haven't considered.

OBJECTION PLAYBOOKS:

IF PRICE:
Q: "What's your max investment right now?"
Q: "What would need to change for this to work budget-wise?"
Solutions:
  - Phased rollout (cheaper first phase)
  - Annual prepay discount
  - Pilot program at lower cost
  - ROI guarantee (money back if not working)

IF TIMING:
Q: "What's blocking us from starting now?"
Q: "What would need to happen to move faster?"
Solutions:
  - Start pilot while waiting for full launch
  - Prep work now, go live later
  - Free setup while you decide

IF FIT:
Q: "Which specific features don't fit?"
Q: "Have you seen X approach solve this?"
Solutions:
  - Custom integration
  - API access + developer support
  - Success stories from similar companies

IF TRUST:
Q: "What would give you confidence?"
Q: "Has [competitor] burned you in the past?"
Solutions:
  - Extended trial (60 vs 30 days)
  - Reference customer call
  - Implementation guarantee

APPROACH:
1. Validate their concern (not dismissive)
2. Dig deeper (ask "why?" 3x minimum)
3. Show you understand (reframe their concern)
4. Offer 2-3 creative options
5. Trial close: "Would [option] work for you?"

TONE: Problem-solver, partner. Not salesman.

OUTPUT JSON:
{{
    "objection_root_cause": "what you uncovered",
    "creative_solution": "what you offered",
    "prospect_response": "open|unconvinced|interested",
    "outcome": "saved|postponed|lost",
    "recovery_strategy": "summary of approach",
    "save_probability": 0.0-1.0,
    "summary": "1-2 sentences"
}}

Your mission: Save this deal.
"""
```

**Live Testing (Days 33-35):**
- Run RECOVERY on 20 objection cases
- Target: 30%+ recovery rate
- Track objection types by win rate

**Owner:** AI/ML Lead  
**Blockers:** CLOSER Agent working

---

### PHASE 2 SIGN-OFF

- [ ] 3 core agents live in sandbox
- [ ] SDR: 50%+ score ≥ 70
- [ ] CLOSER: 25%+ close rate on qualified
- [ ] RECOVERY: 30%+ recovery rate
- [ ] Handoff chains working: SDR→CLOSER→RECOVERY
- [ ] Live metrics dashboard updated

**Timeline:** On track (Days 16-35)

---

## PHASE 3: Nurturing + Expansion (Days 36-50)

### 3.1 Follow-Up Agent (Days 36-42)

**File:** `/app/multi_agent/agents/followup_agent.py`

**Goal:** Re-engagement + persistence without annoying

**Async Touchpoints:**
- Day 1-2: Email with case study (if interest > 3/10)
- Day 3-5: SMS + different angle
- Day 7: Last call attempt
- Day 14: Archive or quarterly drip

**Implementation:**
```python
class FollowUpAgent:
    async def schedule_touchpoint(self, prospect_id: str, reason: str):
        """Async follow-up via email/SMS"""
        
        prospect = await self.memory.load_prospect(prospect_id)
        
        # Determine touchpoint strategy
        days_since = (datetime.now() - prospect.last_interaction).days
        
        if days_since < 3:
            # Email only
            await self._send_resource_email(prospect, reason)
        elif days_since < 7:
            # SMS check-in
            await self._send_sms_checkin(prospect)
        elif days_since < 14:
            # Last attempt call
            await self._schedule_call(prospect)
        else:
            # Archive or quarterly
            if prospect.engagement_fatigue > 8:
                prospect.deal_status = DealStatus.CLOSED_LOST
            else:
                await self._schedule_quarterly_email(prospect)
```

**Owner:** AI/ML Lead  
**Timeline:** Days 36-42

---

### 3.2 Expansion Agent (Days 43-50)

**File:** `/app/multi_agent/agents/expansion_agent.py`

**Goal:** Upsell + churn prevention

**Opportunities:**
- Usage-based upsell (70%+ capacity)
- Seat expansion (new hires detected)
- Churn prevention (usage down 30%)
- Renewal optimization (90 days before)

**Owner:** AI/ML Lead  
**Timeline:** Days 43-50

---

### PHASE 3 SIGN-OFF

- [ ] All 5 agents implemented
- [ ] Handoff chains: SDR→CLOSER→RECOVERY→FOLLOW_UP→EXPANSION
- [ ] Async follow-up working
- [ ] Expansion recommendations accurate
- [ ] A/B test setup for Phase 4

**Timeline:** On track (Days 36-50)

---

## PHASE 4: Optimization + Launch (Days 51-60)

### 4.1 A/B Testing Framework (Days 51-54)

**Test 1: Multi-Agent vs. Single-Agent**
- Control: Current single-agent system
- Treatment: New multi-agent system
- Duration: 7 days minimum
- Traffic split: 30% treatment (safe)

**Metrics to Track:**
- Conversion rate (closed deals)
- Sales cycle length
- Customer satisfaction (CSAT)
- Cost per acquisition

**Owner:** Product + Analytics  
**Timeline:** Days 51-54

---

### 4.2 Production Monitoring (Days 52-56)

**Dashboards:**
1. **Agent Health:** Latency, errors, throughput per agent
2. **Sales Metrics:** Close rate, cycle time, pipeline value
3. **Handoff Quality:** Success rate per handoff type
4. **Cost Tracking:** API usage, cost per close

**Alerting:**
```python
alerts = [
    # Agent latency
    ("agent.latency_p99_s", 3.0, "Agent too slow"),
    
    # Routing accuracy
    ("agent.routing_error_rate", 0.05, "Wrong agent routing"),
    
    # Handoff success
    ("handoff.success_rate", 0.80, "Handoffs failing"),
    
    # Close rate degradation
    ("sales.close_rate_pct", 15.0, "Close rate dropped"),
]
```

**Owner:** DevOps + Analytics  
**Timeline:** Days 52-56

---

### 4.3 Prompt Tuning & Iteration (Days 54-58)

**Methodology:**
- Track per-agent metrics
- Identify underperforming scenarios
- Test prompt variants
- Deploy top-performing versions

**Tuning Examples:**
```python
# Test 1: CLOSER confidence level
variants = [
    {"name": "conservative", "tone": "cautious"},
    {"name": "aggressive", "tone": "bold"},
    {"name": "consultative", "tone": "partner"},
]

# Test 2: Recovery objection depth
variants = [
    {"name": "shallow", "why_questions": 1},
    {"name": "medium", "why_questions": 3},
    {"name": "deep", "why_questions": 5},
]

# Run each variant on 10% traffic
# Pick winner based on close rate
```

**Owner:** AI/ML Lead  
**Timeline:** Days 54-58

---

### 4.4 Launch Preparation (Days 57-60)

**Checklist:**
- [ ] All agents at SLA latency
- [ ] Error rate < 1%
- [ ] Runbook for escalations
- [ ] Customer-facing transparency
- [ ] Team training on new system
- [ ] Rollback plan ready

**Launch Strategy:**
```
Day 57: 100% to production (gradual ramp)
  - Hour 1-2: Monitor closely
  - Hour 3-4: 10% traffic
  - Hour 5+: 25% traffic
  - Day 2: 50% traffic
  - Day 3: 100% traffic

Day 58: Full production + monitoring
Day 59-60: Iterate based on live data
```

**Owner:** Product + DevOps  
**Timeline:** Days 57-60

---

## SUCCESS METRICS (End of Phase 4)

### Business Metrics
| Metric | Baseline | Target | Status |
|--------|----------|--------|--------|
| Close Rate | 15% | 32% | TBD |
| Sales Cycle | 60 days | 22 days | TBD |
| Revenue/Customer | $4,900 | $6,500 | TBD |
| CPA | $600 | $380 | TBD |

### System Metrics
| Metric | Target | Status |
|--------|--------|--------|
| Routing Latency | <200ms | TBD |
| Agent Latency | <3s | TBD |
| Handoff Success Rate | >90% | TBD |
| Error Rate | <1% | TBD |
| Redis Hit Rate | >90% | TBD |

---

## Risks & Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| LLM latency too high | Medium | High | Use Gemini 2.5-flash for fast agents, 1.5 Pro for complex |
| Agent hallucination | High | Medium | Strict JSON output validation, careful prompts |
| Handoff failures | Medium | Medium | Comprehensive testing, rollback plan |
| Cost overruns | Low | Medium | Monitor API costs hourly, set spending cap |
| Data privacy issues | Low | High | Encrypt PII, comply with GDPR/CCPA |

---

## Dependencies & Blockers

### External Dependencies
- Google Gemini API (2.5-flash + Pro 1.5)
- Redis deployment
- PostgreSQL setup
- Twilio integration (existing)

### Team Dependencies
- Backend Lead: Memory layer
- AI/ML Lead: All agent prompts
- DevOps: Infrastructure + monitoring
- Product: Testing + launch strategy

### Critical Path
```
Memory Layer (15d) → SDR Agent (7d) → CLOSER (6d) → RECOVERY (7d) → 
Follow-up + Expansion (15d) → Optimization (10d)
```

**Total:** 60 days, non-compressible

---

## Budget Estimation

### Infrastructure
- Redis: $100/month
- PostgreSQL: $300/month
- Datadog: $500/month
- Total: $900/month

### LLM Costs
- Baseline: ~50 prospects/day × 0.5 USD = $25/day = $750/month
- Year 1 at scale (1000/day): $15,000/month
- Note: Offset by 2x close rate, so ROI remains 6x+

### Team
- Backend: 160 hours @ $100/hr = $16K
- AI/ML: 240 hours @ $150/hr = $36K
- DevOps: 80 hours @ $120/hr = $9.6K
- Product/QA: 100 hours @ $100/hr = $10K
- Total: $71.6K

### Year 1 Total Cost: $71.6K + $9K infra + $180K LLM = **$260.6K**

### Year 1 Revenue Impact
- 12 months × ~1000 prospects/month = 12,000 prospects
- Multi-agent close rate: 32% = 3,840 closed deals
- Revenue per deal: $6,500 = $24,960,000
- Baseline close rate: 15% = 1,800 deals × $4,900 = $8,820,000
- **Revenue increase: +$16,140,000**
- **ROI: 61x**

---

## Success Criteria

### Go/No-Go Decision (End of Phase 2)
✅ **GO if:**
- SDR consistently scores 70+ for 50%+ prospects
- CLOSER closes 25%+ of 70+ score leads
- RECOVERY saves 30%+ of objections
- All components <500ms latency
- Zero critical bugs

❌ **NO-GO if:**
- Close rate drops vs. single agent
- Latency > 2s for any agent
- Handoff failure rate > 10%
- Escalation rate > 30%

---

## Conclusion

This 60-day roadmap is aggressive but achievable with disciplined execution. Key to success:

1. **Foundation first** (Memory layer, routing) before agents
2. **Incremental launch** (3→5 agents gradually)
3. **Continuous testing** at each phase
4. **Daily monitoring** for early problem detection

Expected outcome: **2x close rate, 3x sales cycle speed, 6x ROI Year 1**.
