# Technical Specifications — Multi-Agent Sales System

## Table of Contents
1. [System Architecture](#system-architecture)
2. [Data Flow Diagrams](#data-flow-diagrams)
3. [API Specifications](#api-specifications)
4. [Prompt Engineering Details](#prompt-engineering-details)
5. [Error Handling & Fallbacks](#error-handling--fallbacks)
6. [Performance & Scaling](#performance--scaling)

---

## System Architecture

### 1. High-Level Components

```
┌────────────────────────────────────────────────────────────────┐
│                     EXTERNAL INPUTS                            │
│  Twilio (incoming call) → Webhook → Backend                    │
└────────────────────────┬───────────────────────────────────────┘
                         │
                         ▼
        ┌────────────────────────────────┐
        │  Call Ingestion Service        │
        │  - Create CallContext           │
        │  - Load ProspectProfile         │
        │  - Route to Agent               │
        └────────────┬───────────────────┘
                     │
        ┌────────────▼──────────────────────────────────────────┐
        │           SHARED MEMORY LAYER                          │
        │  ┌─────────────────────────────────────────────────┐  │
        │  │ ProspectProfile + SharedSalesState              │  │
        │  │ (Cached in Redis, persisted in PostgreSQL)      │  │
        │  └─────────────────────────────────────────────────┘  │
        └────────────┬──────────────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────────────┐
        │           AGENT ROUTER                                │
        │  AgentRouter.route_agent() → Decides next agent       │
        └────────────┬──────────────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────────────┐
        │        AGENT ORCHESTRATOR                             │
        │  ┌──────────┬──────────┬──────────┬──────────┐         │
        │  │    SDR   │ CLOSER   │RECOVERY  │FOLLOW-UP │ EXPN   │
        │  │ Agent    │ Agent    │ Agent    │ Agent    │ Agent  │
        │  └──────────┴──────────┴──────────┴──────────┴────────┘
        │  All agents use:                                       │
        │  - Gemini 2.5-flash or Pro 1.5                         │
        │  - Context via ContextWindowOptimizer                  │
        │  - JSON output parsing                                 │
        └────────────┬──────────────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────────────┐
        │        SUPPORTING SERVICES                            │
        │  ┌─────────────┬──────────────┬──────────────┐         │
        │  │ Deal Engine │ Tool Manager │ CRM Sync     │         │
        │  └─────────────┴──────────────┴──────────────┘         │
        └────────────┬──────────────────────────────────────────┘
                     │
        ┌────────────▼──────────────────────────────────────────┐
        │        PERSISTENCE LAYER                              │
        │  ┌────────────┬──────────────┬─────────────┐           │
        │  │   Redis    │  PostgreSQL  │  Message Q  │           │
        │  └────────────┴──────────────┴─────────────┘           │
        └─────────────────────────────────────────────────────────┘
```

### 2. Agent Lifecycle

```
┌─ PROSPECT ENTERS SYSTEM ─────────┐
│ TwilioWebhook.handle_call()      │
└──────────────┬────────────────────┘
               │
               ▼
    ┌──────────────────────┐
    │ Load ProspectProfile │
    │ Load SharedSalesState│
    └──────────┬───────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ AgentRouter.route_agent()│
    │ → Decide next agent      │
    └──────────┬───────────────┘
               │
    ┌──────────┴──────────┬──────────┬──────────┬──────────┐
    │                     │          │          │          │
    ▼                     ▼          ▼          ▼          ▼
  [SDR]               [CLOSER]   [RECOVERY] [FOLLOW-UP] [EXPANSION]
    │                     │          │          │          │
    │                     │          │          │          │
    └──────────┬──────────┴──────────┴──────────┴──────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Update SharedMemory      │
    │ Save ProspectProfile     │
    │ Save SharedSalesState    │
    │ Log Interaction          │
    └──────────┬───────────────┘
               │
               ▼
    ┌──────────────────────────┐
    │ Check Handoff Needed?    │
    │ AgentRouter.should_handoff()
    └──────────┬───────────────┘
               │
        ┌──────┴──────┐
        │             │
    [NO HANDOFF]  [HANDOFF NEEDED]
        │             │
        │             ▼
        │    ┌──────────────────────┐
        │    │ Queue HandoffPacket  │
        │    │ to Message Queue     │
        │    └──────────┬───────────┘
        │               │
        │               ▼
        │    ┌──────────────────────┐
        │    │ Next agent picks up  │
        │    │ loads context        │
        │    └──────────┬───────────┘
        │               │
        └───────┬───────┘
                │
                ▼
    ┌──────────────────────────┐
    │ END OF CALL              │
    │ Store transcript         │
    │ Archive interaction data │
    └──────────────────────────┘
```

---

## Data Flow Diagrams

### 1. Incoming Call Flow

```
Prospect Calls
    │
    ▼
Twilio Webhook: POST /api/calls/webhook
    │
    ├─ Extract: phone, call_sid, recording_url
    │
    ▼
CallIngestionService.create_call_context()
    │
    ├─ Query Supabase: LeadService.get_by_phone(phone)
    │   └─→ Returns: lead_id, prospect_id, company info
    │
    ├─ Create CallContext
    │   ├─ call_sid (Twilio)
    │   ├─ phone
    │   ├─ lead_id (from DB)
    │   └─ prospect_id (generated if new)
    │
    ▼
SharedMemoryStore.load_prospect(prospect_id)
    │
    ├─ Try Redis: 90% hit rate
    │   │
    │   ├─ HIT: Return cached ProspectProfile
    │   │
    │   └─ MISS: Query PostgreSQL
    │       └─→ Cache in Redis (TTL 1h)
    │
    ▼
AgentRouter.route_agent(prospect, state)
    │
    ├─ Apply decision tree (20 levels)
    │
    ▼
Selected Agent Gets Context
    │
    ├─ SDR: 500 tokens (basic info)
    ├─ CLOSER: 1500 tokens (full context + offer)
    ├─ RECOVERY: 1200 tokens (objection + history)
    ├─ FOLLOW_UP: 300 tokens (just reason)
    └─ EXPANSION: 400 tokens (customer profile)
    │
    ▼
Agent Runs (Gemini API)
    │
    ├─ Stream response tokens
    │
    ▼
Agent Output Parsing
    │
    ├─ Parse JSON from response
    ├─ Validate schema
    ├─ Extract structured data
    │
    ▼
Update Shared Memory
    │
    ├─ Update ProspectProfile
    ├─ Update SharedSalesState
    ├─ Log Interaction
    │
    ▼
Check Handoff?
    │
    ├─ YES: Queue HandoffPacket
    │       │
    │       └─→ Message Queue (async)
    │
    └─ NO: End (wait for next turn)
```

### 2. Handoff Flow

```
Current Agent Completes Action
    │
    ▼
Agent checks: AgentRouter.should_handoff()
    │
    ├─ Evaluate completion criteria
    ├─ Assess prospect state
    │
    ▼
Handoff Decision
    │
    ├─→ YES: Create HandoffPacket
    │   ├─ from_agent
    │   ├─ to_agent
    │   ├─ summary (contexto warm para next agent)
    │   ├─ offer_recommendation (if applicable)
    │   ├─ recovery_strategy (if RECOVERY → CLOSER)
    │
    │   └─→ SharedMemoryStore.queue_handoff(packet)
    │       │
    │       └─→ Redis List: queue:next_agent
    │           (async processing)
    │
    └─→ NO: Continue with current agent or end call

Message Queue Worker
    │
    ├─ Poll queue:next_agent (1s intervals)
    │
    ▼
Dequeue HandoffPacket
    │
    ├─ Load prospect + state
    ├─ Validate next_agent is ready
    ├─ Load HandoffPacket context
    │
    ▼
Next Agent Ingests Context
    │
    ├─ Get warm context from packet
    ├─ Load full prospect profile
    ├─ Get decision-specific prompts
    │
    ▼
Next Agent Runs
    │
    └─→ (Repeat from Agent Runs step above)
```

### 3. State Machine Transitions

```
[START: Prospect calls]
    │
    ▼
[DISCOVERY]  ← SDR runs
    │
    ├─ Score ≥ 70?
    │   └─→ YES: [QUALIFIED]
    │   └─→ NO:  [RECOVERY] (attempt 1)
    │
    ▼
[QUALIFIED]  ← CLOSER runs
    │
    ├─ Closed?
    │   └─→ YES: [CLOSED_WON]
    │
    ├─ Objection?
    │   └─→ YES: [NEGOTIATION]
    │
    ├─ "Think about it"?
    │   └─→ YES: [NURTURING]
    │
    ├─ Demo/trial scheduled?
    │   └─→ YES: [CLOSING]
    │
    └─ Needs human?
        └─→ YES: [ESCALATION]

[NEGOTIATION]  ← RECOVERY runs
    │
    ├─ Objection resolved?
    │   └─→ YES: [QUALIFIED] → back to CLOSER
    │
    ├─ "Give me time"?
    │   └─→ YES: [NURTURING] → FOLLOW_UP
    │
    └─ "Not interested"?
        └─→ YES: [LOST]

[NURTURING]  ← FOLLOW_UP runs
    │
    ├─ Interest renewed?
    │   └─→ YES: [QUALIFIED] → back to CLOSER
    │
    └─ No response x3?
        └─→ YES: [LOST]

[CLOSING]  ← FOLLOW_UP runs (async)
    │
    ├─ Demo completed?
    │   └─→ YES: back to [QUALIFIED] for closing
    │
    └─ No show?
        └─→ [NURTURING]

[CLOSED_WON]  ← EXPANSION runs
    │
    ├─ Upsell opportunity?
    │   └─→ YES: [EXPANSION]
    │
    └─ Monitor for churn

[LOST]  ← ARCHIVE
    │
    └─ Quarterly re-engagement? (optional)

[EXPANSION]  ← EXPANSION runs
    │
    ├─ Churn risk?
    │   └─→ YES: [RECOVERY]
    │
    └─ Upsell closed? → back to [CLOSED_WON]
```

---

## API Specifications

### 1. CallIngestionService

```python
class CallIngestionService:
    """Entry point for all incoming calls"""
    
    async def handle_twilio_webhook(
        self,
        call_sid: str,
        phone: str,
        recording_url: str,
    ) -> CallResult:
        """
        Main handler for Twilio webhook.
        
        Args:
            call_sid: Twilio call identifier
            phone: Prospect phone number
            recording_url: Audio recording URL
        
        Returns:
            CallResult with final outcome
        """
        
        # 1. Get prospect
        prospect = await self._get_or_create_prospect(phone)
        
        # 2. Load state
        state = await self.memory_store.load_state(prospect.prospect_id)
        
        # 3. Route agent
        agent_type, reason = await self.router.route_agent(prospect, state)
        
        # 4. Execute agent
        agent = self._get_agent(agent_type)
        output = await agent.handle_prospect(prospect.prospect_id)
        
        # 5. Check handoff
        should_handoff, next_agent, hoff_reason = await self.router.should_handoff(
            prospect, state, agent_type
        )
        
        if should_handoff:
            packet = HandoffPacket(
                prospect_id=prospect.prospect_id,
                from_agent=agent_type,
                to_agent=next_agent,
                summary=output.summary,
                prospect_emotion=output.prospect_emotion,
                engagement_level=prospect.interest_level,
                offer_recommendation=prospect.proposed_offer,
            )
            await self.memory_store.queue_handoff(packet)
        
        # 6. Return result
        return CallResult(
            call_sid=call_sid,
            prospect_id=prospect.prospect_id,
            agent_used=agent_type.value,
            outcome=output.outcome,
            next_agent=(next_agent.value if next_agent else None),
            handoff_reason=hoff_reason if should_handoff else None,
        )
```

### 2. AgentBase Class

```python
class AgentBase(ABC):
    """Base class for all agents"""
    
    async def handle_prospect(self, prospect_id: str) -> AgentOutput:
        """
        Main entry point for agent execution.
        
        Args:
            prospect_id: Prospect identifier
        
        Returns:
            Agent-specific output (SDROutput, CloserOutput, etc.)
        """
        raise NotImplementedError
    
    async def _build_prompt(self, context: str, config: dict) -> str:
        """Build agent-specific prompt"""
        raise NotImplementedError
    
    async def _call_gemini(self, prompt: str, model: str) -> str:
        """Call Gemini API and return response"""
        response = await self.llm.generate_content(
            prompt,
            model=model,
            config={
                "max_output_tokens": 1000,
                "temperature": 0.7,
                "top_p": 0.95,
            }
        )
        return response.text
    
    async def _parse_output(self, response: str) -> dict:
        """Parse JSON output from LLM"""
        try:
            return json.loads(response)
        except json.JSONDecodeError:
            logger.error(f"Failed to parse JSON: {response}")
            raise
```

### 3. SharedMemoryStore API

```python
class SharedMemoryStore:
    """Unified memory interface"""
    
    async def save_prospect(self, profile: ProspectProfile) -> None:
        """Save prospect to Redis (fast) + PostgreSQL (persistence)"""
    
    async def load_prospect(self, prospect_id: str) -> ProspectProfile | None:
        """Load prospect, cache from Redis if available"""
    
    async def save_state(self, state: SharedSalesState) -> None:
        """Save sales state"""
    
    async def load_state(self, prospect_id: str) -> SharedSalesState | None:
        """Load sales state"""
    
    async def queue_handoff(self, packet: HandoffPacket) -> None:
        """Queue handoff for async processing"""
    
    async def get_next_handoff(self) -> HandoffPacket | None:
        """Dequeue next handoff from queue"""
    
    async def log_interaction(
        self,
        prospect_id: str,
        agent: str,
        action: str,
        outcome: dict,
    ) -> None:
        """Log agent interaction for audit trail"""
```

---

## Prompt Engineering Details

### 1. Prompt Template Structure

Each agent prompt follows this structure:

```
┌─────────────────────────────────┐
│ 1. ROLE                         │
│ "You are an elite [Agent Type]" │
└─────────────────────────────────┘
                ▼
┌─────────────────────────────────┐
│ 2. CONTEXT                      │
│ (Prospect details + situation)  │
│ Max tokens: agent-specific      │
└─────────────────────────────────┘
                ▼
┌─────────────────────────────────┐
│ 3. TASK                         │
│ What to do in this call         │
│ Specific outcomes desired       │
└─────────────────────────────────┘
                ▼
┌─────────────────────────────────┐
│ 4. FRAMEWORK                    │
│ (BANT, objection handling, etc) │
│ Step-by-step guidance           │
└─────────────────────────────────┘
                ▼
┌─────────────────────────────────┐
│ 5. OUTPUT FORMAT                │
│ JSON schema strictly            │
│ Structured extraction           │
└─────────────────────────────────┘
                ▼
┌─────────────────────────────────┐
│ 6. TONE                         │
│ Behavioral guidelines           │
│ What NOT to do                  │
└─────────────────────────────────┘
```

### 2. Output Schema Validation

```python
# SDR Output Schema
SDR_OUTPUT_SCHEMA = {
    "type": "object",
    "required": [
        "qualification_score",
        "interest_level",
        "bant",
        "pain_points",
        "current_solution",
        "ready_for_closer",
        "summary"
    ],
    "properties": {
        "qualification_score": {"type": "number", "minimum": 0, "maximum": 100},
        "interest_level": {"type": "integer", "minimum": 0, "maximum": 10},
        "bant": {
            "type": "object",
            "properties": {
                "budget": {"type": ["boolean", "number"]},
                "authority": {"type": "boolean"},
                "need": {"type": "string"},
                "timeline": {"type": "string"}
            }
        },
        # ... more properties
    }
}

# Validation function
def validate_output(output: dict, schema: dict) -> bool:
    """Validate output against schema"""
    try:
        jsonschema.validate(output, schema)
        return True
    except jsonschema.ValidationError as e:
        logger.error(f"Invalid output: {e}")
        return False
```

### 3. Few-Shot Examples in Prompts

Each agent prompt includes 2-3 examples:

```python
CLOSER_EXAMPLES = """
EXAMPLE 1 - Successful Close:
Prospect: "Your software looks good, but it's expensive"
CLOSER: "I understand cost is a concern. Most companies see ROI in 3 months..."
Outcome: Prospect committed to demo

EXAMPLE 2 - Objection Handling:
Prospect: "We're happy with our current solution"
CLOSER: "What's working well with it? Because 60% of our customers switched from..."
Outcome: Prospect interested, moved to RECOVERY

EXAMPLE 3 - Timing Objection:
Prospect: "We need to wait until next quarter"
CLOSER: "I get it. What if we pilot it now, live launch next quarter?"
Outcome: Prospect agreed to trial
"""

# Add to prompt: f"{role}\n{context}\n{task}\n{CLOSER_EXAMPLES}\n{output_format}"
```

---

## Error Handling & Fallbacks

### 1. Agent Timeout Strategy

```python
async def execute_agent_with_timeout(
    agent: AgentBase,
    prospect_id: str,
    timeout_s: float = 3.0,
) -> AgentOutput | None:
    """
    Execute agent with timeout fallback.
    
    If agent takes too long, return safe fallback.
    """
    try:
        return await asyncio.wait_for(
            agent.handle_prospect(prospect_id),
            timeout=timeout_s
        )
    
    except asyncio.TimeoutError:
        logger.warning(f"Agent timeout for prospect {prospect_id}")
        
        # Return safe fallback
        return FallbackOutput(
            outcome="timeout",
            action="route_to_human",
            reason="Agent processing too slow"
        )
    
    except Exception as e:
        logger.error(f"Agent error: {e}")
        return FallbackOutput(
            outcome="error",
            action="route_to_human",
            reason=f"Agent error: {str(e)[:100]}"
        )
```

### 2. JSON Parsing Fallback

```python
def parse_agent_output_with_fallback(response: str) -> dict:
    """
    Parse JSON with fallback strategies.
    
    1. Try full JSON parse
    2. Extract JSON from text
    3. Return safe default
    """
    
    # Strategy 1: Direct parse
    try:
        return json.loads(response)
    except json.JSONDecodeError:
        pass
    
    # Strategy 2: Extract JSON from text
    import re
    json_match = re.search(r'\{.*\}', response, re.DOTALL)
    if json_match:
        try:
            return json.loads(json_match.group())
        except json.JSONDecodeError:
            pass
    
    # Strategy 3: Safe default
    logger.warning(f"Could not parse output: {response[:200]}")
    return {
        "outcome": "parse_error",
        "action": "escalate_to_human",
        "original_response": response[:500]
    }
```

### 3. LLM API Fallback

```python
async def call_gemini_with_fallback(
    client,
    prompt: str,
    model: str = "gemini-2.5-flash",
) -> str:
    """
    Call Gemini with fallback to simpler model.
    """
    
    try:
        # Try primary model
        response = await client.generate_content(
            prompt,
            model=model,
            config={"max_output_tokens": 1000}
        )
        return response.text
    
    except Exception as e:
        logger.warning(f"Gemini error with {model}: {e}")
        
        # Fallback to simpler model
        try:
            response = await client.generate_content(
                prompt,
                model="gemini-2.5-flash",  # Always available
                config={"max_output_tokens": 500}
            )
            return response.text
        
        except Exception as e2:
            logger.error(f"Complete LLM failure: {e2}")
            raise
```

### 4. Handoff Failure Recovery

```python
async def safe_handoff(
    from_agent: AgentType,
    to_agent: AgentType,
    packet: HandoffPacket,
    memory_store: SharedMemoryStore,
) -> bool:
    """
    Attempt handoff with failure recovery.
    
    Returns:
        True if handoff succeeded
        False if failed, escalate to human
    """
    
    try:
        # Queue handoff
        await memory_store.queue_handoff(packet)
        
        # Verify queuing worked
        verification = await memory_store.get_next_handoff()
        if verification is None:
            raise Exception("Handoff not queued properly")
        
        logger.info(f"Handoff {from_agent} → {to_agent} succeeded")
        return True
    
    except Exception as e:
        logger.error(f"Handoff failed: {e}")
        
        # Emergency fallback: escalate to human
        await escalate_to_human(
            prospect_id=packet.prospect_id,
            reason=f"Handoff failure: {str(e)}",
        )
        return False
```

---

## Performance & Scaling

### 1. Latency Targets (SLA)

```
┌──────────────────────────────────────────┐
│          AGENT                  LATENCY  │
├──────────────────────────────────────────┤
│ SDR (qualification)           <500ms     │
│ CLOSER (pitch)                <2000ms    │
│ RECOVERY (negotiation)        <3000ms    │
│ FOLLOW_UP (async)             <1000ms    │
│ EXPANSION (batch)             <1000ms    │
│ AgentRouter decision           <200ms    │
│ Memory store (Redis hit)       <50ms     │
│ Memory store (DB fallback)     <500ms    │
└──────────────────────────────────────────┘
```

### 2. Throughput Estimates

```
Single Agent Capacity:
- Gemini API: 1000 req/min (generous quota)
- Processing time: ~1.5s average per prospect
- Concurrent: 25 simultaneous calls
- Daily capacity: 500-1000 prospects

Multi-Agent Throughput (with specialization):
- SDR: 200 calls/day (4min per call)
- CLOSER: 100 calls/day (8min per call)
- RECOVERY: 50 calls/day (12min per call)
- FOLLOW_UP: 1000 async/day (email/SMS)
- EXPANSION: 200 batch/day (async analysis)

Total: ~1550 prospect touches/day
```

### 3. Cost Optimization

```
Model Selection by Agent:
┌────────────────────────────────────────────────┐
│ Agent       │ Model              │ Cost/call   │
├────────────────────────────────────────────────┤
│ SDR         │ Gemini 2.5-flash   │ $0.03       │
│ CLOSER      │ Gemini Pro 1.5     │ $0.15       │
│ RECOVERY    │ Gemini Pro 1.5     │ $0.15       │
│ FOLLOW_UP   │ Gemini 2.5-flash   │ $0.01       │
│ EXPANSION   │ Gemini 2.5-flash   │ $0.01       │
└────────────────────────────────────────────────┘

Daily cost estimate (1000 prospects):
- 200 SDR calls × $0.03 = $6
- 100 CLOSER calls × $0.15 = $15
- 50 RECOVERY calls × $0.15 = $7.50
- 1000 FOLLOW_UP × $0.01 = $10
- 200 EXPANSION × $0.01 = $2
Total: ~$40/day = ~$1,200/month

At 32% close rate: $37.50 cost per close
vs. $600 baseline CPA = 93% cost reduction
```

### 4. Redis Caching Strategy

```
Cache Hit Rate Target: >90%

TTL Strategy:
┌────────────────────────────────────────┐
│ Key                    │ TTL            │
├────────────────────────────────────────┤
│ prospect:{}:profile    │ 1 hour         │
│ prospect:{}:state      │ 30 minutes     │
│ prospect:{}:transcript │ 4 hours        │
│ queue:next_agent       │ No TTL (manual)│
│ handoff:{}             │ 24 hours       │
└────────────────────────────────────────┘

Cache warming:
- On prospect creation: load to Redis
- On prospect update: refresh TTL
- On call start: pre-load prospect + state
```

### 5. Database Indexing

```sql
-- Critical indexes for performance

-- Fast prospect lookup
CREATE INDEX idx_prospects_updated ON prospects(updated_at DESC);
CREATE INDEX idx_prospects_stage ON prospects(
    profile_data->>'current_stage'
);

-- Interaction queries
CREATE INDEX idx_interactions_prospect_date ON interactions(
    prospect_id, created_at DESC
);
CREATE INDEX idx_interactions_agent ON interactions(
    agent_type, created_at DESC
);

-- Handoff queries
CREATE INDEX idx_handoffs_prospect ON handoff_logs(
    prospect_id, created_at DESC
);
CREATE INDEX idx_handoffs_agents ON handoff_logs(
    from_agent, to_agent, created_at DESC
);

-- Metrics queries
CREATE INDEX idx_interactions_outcome ON interactions(
    outcome_json->>outcome, created_at DESC
);
```

---

## Deployment Architecture

### 1. Docker Containerization

```dockerfile
# agents/Dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY app/ ./app/

ENV PYTHONUNBUFFERED=1

CMD ["python", "-m", "app.main"]
```

### 2. Kubernetes Deployment (optional at scale)

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: multi-agent-system
spec:
  replicas: 3
  selector:
    matchLabels:
      app: multi-agent
  template:
    metadata:
      labels:
        app: multi-agent
    spec:
      containers:
      - name: agents
        image: silxarcrm/multi-agent:latest
        ports:
        - containerPort: 8000
        env:
        - name: GEMINI_API_KEY
          valueFrom:
            secretKeyRef:
              name: gemini-secrets
              key: api-key
        - name: REDIS_URL
          value: redis://redis-service:6379
        - name: DB_URL
          valueFrom:
            secretKeyRef:
              name: db-secrets
              key: connection-string
        resources:
          requests:
            cpu: 500m
            memory: 1Gi
          limits:
            cpu: 2000m
            memory: 4Gi
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 30
          periodSeconds: 10
```

---

## Conclusion

This technical specification provides:

✅ Complete data flow documentation  
✅ API contracts for all components  
✅ Prompt engineering best practices  
✅ Error handling strategies  
✅ Performance optimization guidelines  
✅ Scaling considerations  

Ready to implement Phase 1.
