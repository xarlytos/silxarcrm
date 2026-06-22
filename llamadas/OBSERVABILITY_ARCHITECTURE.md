# Revenue AI — Observability Architecture v3.0
**Enterprise-grade observability system para Revenue AI (8 agentes + multi-LLM)**

---

## I. LOGGING ARCHITECTURE

### 1.1 Component Logging Strategy

#### **By Component & Level**

| Component | LOG_LEVEL | What to Log | Format | Retention |
|-----------|-----------|------------|--------|-----------|
| **Telephony (Twilio)** | DEBUG | Call start/end, media stream connect/disconnect, MOS scores, packet loss | JSON | 7d (recent), 30d (summary) |
| **STT Pipeline** | DEBUG | Audio chunks received, confidence scores, transcription latency, fallback triggers | JSON | 7d |
| **LLM (Gemini/MiniMax)** | INFO | Model + version, input tokens, output tokens, latency, cache hits, cost, reasoning | JSON | 7d |
| **TTS (ElevenLabs)** | DEBUG | Voice ID, speed, latency, fallback attempts | JSON | 7d |
| **Classifier** | DEBUG | Input, classification result, confidence, tags, latency | JSON | 7d |
| **State Engine** | INFO | Before/after state, confidence, transition reason, next_stages probabilities | JSON | 7d |
| **Conversation Manager** | DEBUG | Turn number, input text, strategy applied, output text, tools used | JSON | 7d |
| **Agent Router** | INFO | Agent selection decision, prospect state, routing reason, multi-agent handoff | JSON | 7d |
| **Compliance** | CRITICAL | Disclosure events, recording consent, opt-outs, GDPR events, regulatory checks | JSON | 90d (legal) |
| **CRM Integration** | INFO | Create/update operations, latency, API errors, sync failures | JSON | 7d |
| **Post-Call Analysis** | INFO | Summary metrics, nurture decisions, follow-up actions, cost analysis | JSON | 30d |

### 1.2 Structured Logging (JSON)

**Standard log envelope (all components):**

```json
{
  "timestamp": "2026-06-21T15:42:30.123Z",
  "level": "INFO",
  "logger": "app.gemini.chat_session",
  "call_id": "ca_abc123def456",
  "session_id": "sess_xyz789",
  "turn": 3,
  "component": "gemini_llm",
  "event_type": "llm_call_complete",
  "duration_ms": 245,
  "user_id": "u_12345",
  "prospect_id": "p_98765",
  "tags": ["production", "latency_critical", "cost_tracking"],
  "data": {
    "model": "gemini-3.1-flash-lite",
    "input_tokens": 512,
    "output_tokens": 145,
    "cache_hits": true,
    "latency_ms": 245,
    "cost_usd": 0.00023,
    "reasoning_type": "decision_point",
    "fallback_used": false
  },
  "trace_id": "trace_aaa111bbb222",
  "span_id": "span_ccc333ddd444"
}
```

### 1.3 Sampling Strategy

**Three-tier approach:**

1. **Traces (100% sampling)**
   - All call flows traced via OpenTelemetry
   - Lightweight: only critical spans
   - Includes: call_id, turn, component, timestamp, latency, result
   - Storage: 7d in cold storage (S3/Cloud Storage)
   - Use: Real-time debugging + playback

2. **Detailed Logs (10% sampling)**
   - Full context logs with decision reasoning, state, prompts
   - Includes: input text, classification, agent response, tools used
   - Sampling: weighted by:
     - 100% when: error/exception, classifier invoked, agent transition
     - 50% when: in-progress sales call (hot lead)
     - 10% when: routine call with no events
   - Storage: 7d hot, 30d archive
   - Use: Model improvement, debugging high-value calls

3. **Metrics Only (all events)**
   - Counters, histograms, percentiles
   - No raw text/PII
   - Real-time aggregation in-memory + export to Prometheus
   - Storage: 30d retention
   - Use: Dashboards, alerting, cost analysis

### 1.4 Log Retention Policy

| Log Type | Hot (Query) | Warm (Archive) | Retention | Access |
|----------|------------|----------------|-----------|--------|
| Call traces (all) | 7d | - | 7d | CloudLogging, logs API |
| Detailed logs | 7d | 30d (compressed) | 30d | BigQuery, logs API |
| Decision events | 7d | 30d (analytics) | 30d | decision_logs/ JSONL |
| Compliance events | 90d | 365d (legal hold) | 1y | Audit logs, Compliance DB |
| Cost ledger | 30d | Indefinite | ∞ | Cost Analytics |
| Metrics aggregates | 30d | 1y (rollups) | 1y | Prometheus, Grafana |

---

## II. EVENT SCHEMA (20+ Core Event Types)

### 2.1 Call Lifecycle Events

#### **call_initiated**
```json
{
  "event_type": "call_initiated",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:00Z",
  "prospect_id": "p_98765",
  "prospect": {
    "name": "John Doe",
    "business_type": "dental",
    "lead_score": 72,
    "prev_interactions": 2
  },
  "call_direction": "inbound|outbound",
  "caller_type": "prospect|internal_test",
  "agent_type": "sdr|closer|recovery|follow_up|expansion",
  "agent_config": {
    "model": "gemini-3.1-flash-lite",
    "voice_id": "voice_alpha_male_es",
    "playbook": "dental_objection_recovery",
    "campaign": "q2_dental_blitz"
  },
  "compliance_required": ["disclosure", "recording_consent"],
  "expected_duration_min": 3,
  "sample_rate": 0.1
}
```

#### **call_started**
```json
{
  "event_type": "call_started",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:01Z",
  "websocket_connected": true,
  "gemini_session_ready": true,
  "ttfb_ms": 850,
  "warm_session_used": true,
  "region": "us-central1"
}
```

#### **call_ended**
```json
{
  "event_type": "call_ended",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:03:45Z",
  "duration_s": 225,
  "hangup_reason": "prospect_disconnect|agent_transfer|timeout|error",
  "total_turns": 12,
  "conversation_quality": {
    "avg_turn_latency_ms": 380,
    "max_turn_latency_ms": 1200,
    "sentiment_trend": "positive|neutral|negative",
    "humanization_score": 0.87
  },
  "financial": {
    "total_cost_usd": 0.45,
    "llm_cost_usd": 0.32,
    "tts_cost_usd": 0.08,
    "stt_cost_usd": 0.05
  },
  "outcome": "demo_scheduled|transferred|opt_out|no_interest|error",
  "disposal_reason": "qualified|unqualified|wrong_number|do_not_call"
}
```

### 2.2 Agent Events (Multi-Agent Orchestration)

#### **agent_selected**
```json
{
  "event_type": "agent_selected",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:05Z",
  "agent_type": "sdr",
  "router_decision": {
    "reason": "First contact - needs qualification",
    "prospect_state": {
      "current_stage": "awareness",
      "qualification_score": 0,
      "deal_status": "new"
    },
    "alternatives_considered": ["closer", "recovery"],
    "confidence": 0.95
  }
}
```

#### **agent_transition**
```json
{
  "event_type": "agent_transition",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:01:30Z",
  "from_agent": "sdr",
  "to_agent": "closer",
  "turn_number": 7,
  "transition_reason": "Prospect qualified with score 78",
  "handoff_context": {
    "prospect_sentiment": "interested",
    "pain_points": ["scheduling_issues", "no_reminders"],
    "objections_handled": ["price_concern"],
    "next_stage_goal": "Schedule demo",
    "briefing_for_next_agent": "..."
  },
  "time_in_agent_s": 92
}
```

### 2.3 LLM Events

#### **llm_call_start**
```json
{
  "event_type": "llm_call_start",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:10.234Z",
  "span_id": "span_xyz789",
  "llm_type": "master|voice|decision",
  "model": "gemini-3.1-flash-lite",
  "model_version": "3.1.0",
  "input_tokens": 512,
  "cached_tokens": 256,
  "input_messages": 4,
  "system_prompt_hash": "hash_abc123",
  "strategy_hash": "hash_def456",
  "turn_number": 3,
  "reasoning_type": "classification|decision_point|objection_response"
}
```

#### **llm_call_complete**
```json
{
  "event_type": "llm_call_complete",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:10.479Z",
  "span_id": "span_xyz789",
  "model": "gemini-3.1-flash-lite",
  "latency_ms": 245,
  "ttfb_ms": 85,
  "output_tokens": 145,
  "total_tokens": 657,
  "cache_hit": true,
  "cache_efficiency": 0.39,
  "cost_usd": 0.00023,
  "output_length_chars": 520,
  "tools_used": ["get_availability", "check_compliance"],
  "tool_calls": 2,
  "reasoning_depth": 0.7,
  "success": true,
  "fallback_used": false
}
```

#### **llm_error**
```json
{
  "event_type": "llm_error",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:10.500Z",
  "model": "gemini-3.1-flash-lite",
  "error_type": "rate_limit|timeout|quota_exceeded|invalid_request|server_error",
  "error_code": "429|408|400|500",
  "error_message": "Rate limit exceeded: 100 req/min",
  "retry_count": 2,
  "fallback_triggered": true,
  "fallback_model": "gemini-3.5-sonnet",
  "recovery_latency_ms": 150
}
```

#### **llm_cache_stats**
```json
{
  "event_type": "llm_cache_stats",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:03:45Z",
  "period_minutes": 15,
  "total_llm_calls": 12,
  "cache_hits": 8,
  "cache_hit_rate": 0.67,
  "tokens_saved": 2048,
  "cost_saved_usd": 0.00087,
  "cache_efficiency_breakdown": {
    "system_prompt": 256,
    "product_context": 512,
    "conversation_history": 1280
  }
}
```

### 2.4 Decision Events

#### **classification_executed**
```json
{
  "event_type": "classification_executed",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:15.340Z",
  "turn_number": 3,
  "input_text": "Sí, pero el precio es demasiado alto",
  "classifier_model": "custom_classifier_v2.1",
  "classification_result": {
    "intent": "objection_price",
    "confidence": 0.92,
    "emotion": "skeptical",
    "urgency": "low",
    "tags": ["price_sensitive", "needs_roe_proof", "budget_constraint"],
    "new_objection": false,
    "objection_id": "obj_price_001"
  },
  "latency_ms": 45,
  "model_version": "2.1.0",
  "invocation_reason": "turn_every_3|objection_detected|state_uncertainty"
}
```

#### **state_transition**
```json
{
  "event_type": "state_transition",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:15.400Z",
  "turn_number": 3,
  "state_before": {
    "stage": "awareness",
    "confidence": 0.65,
    "pain_detected": true,
    "has_software": false,
    "is_decision_maker": true,
    "wants_demo": false,
    "tags": ["retail_owner", "small_biz"]
  },
  "state_after": {
    "stage": "consideration",
    "confidence": 0.78,
    "pain_detected": true,
    "has_software": false,
    "is_decision_maker": true,
    "wants_demo": false,
    "tags": ["retail_owner", "small_biz", "price_sensitive"],
    "next_stages": {
      "demo_ready": 0.45,
      "objection_active": 0.40,
      "no_interest": 0.15
    }
  },
  "transition_reason": "Confirmed pain, explored solution, price objection raised",
  "confidence_change": 0.13
}
```

#### **decision_made**
```json
{
  "event_type": "decision_made",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:20.150Z",
  "turn_number": 4,
  "decision_type": "next_strategy|objection_response|escalation|hold",
  "context": {
    "current_stage": "consideration",
    "prospect_sentiment": "skeptical",
    "objection_active": "price",
    "risk_of_loss": 0.35
  },
  "decision": {
    "action": "objection_response_roe",
    "reasoning": "Prospect price-sensitive; deployed ROI proof point",
    "confidence": 0.88,
    "alternatives": ["transfer_to_human", "schedule_demo", "reevaluate"],
    "fallback_if_fails": "transfer_to_human"
  },
  "prompt_hash": "hash_ghi789"
}
```

### 2.5 API & Integration Events

#### **api_call**
```json
{
  "event_type": "api_call",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:25.500Z",
  "api": "supabase_crm|calcom|elevenlabs|twilio|gemini",
  "method": "POST|GET|PATCH|DELETE",
  "endpoint": "/v1/contacts/create",
  "latency_ms": 120,
  "status_code": 200,
  "request_size_bytes": 512,
  "response_size_bytes": 256,
  "retry_count": 0,
  "cache_used": false,
  "tokens_used": {"read": 100, "write": 50},
  "cost_estimate_usd": 0.001,
  "error": null
}
```

#### **api_error**
```json
{
  "event_type": "api_error",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:25.620Z",
  "api": "calcom",
  "endpoint": "/availability/check",
  "status_code": 429,
  "error_type": "rate_limit",
  "error_message": "Rate limit exceeded",
  "latency_ms": 50,
  "retry_strategy": "exponential_backoff",
  "retry_attempt": 1,
  "recovery_action": "fallback_to_cache",
  "estimated_recovery_time_s": 5
}
```

### 2.6 Compliance & Data Events

#### **compliance_event**
```json
{
  "event_type": "compliance_event",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:00:30.000Z",
  "compliance_type": "disclosure|recording_consent|gdpr_right|do_not_call|identity_verification",
  "action": "disclosed_ai_identity",
  "timestamp_in_call_s": 5,
  "prospector_responded": true,
  "response_sentiment": "neutral|positive|negative",
  "jurisdiction": "mx|es|us",
  "legal_requirement": "ley_telemarketing_mx",
  "requirement_satisfied": true,
  "evidence": "Agente dijo: 'Hola, soy un agente automático de Groomly...'",
  "recording_reference": "rec_abc123_0_5s"
}
```

#### **data_mutation**
```json
{
  "event_type": "data_mutation",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:03:45.000Z",
  "entity_type": "prospect|lead|contact|deal",
  "entity_id": "p_98765",
  "operation": "create|update|delete",
  "fields_changed": {
    "stage": {"before": "awareness", "after": "consideration"},
    "demo_date": {"before": null, "after": "2026-06-28T14:00:00Z"},
    "cost_impact": 0.05
  },
  "source": "call_outcome",
  "audit_trail": "yes",
  "visibility": "sales_team|restricted"
}
```

### 2.7 Cost & Performance Events

#### **cost_event** (agregado por call)
```json
{
  "event_type": "cost_event",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:03:45Z",
  "duration_s": 225,
  "cost_breakdown": {
    "llm_calls": {
      "gemini_3.1_flash_lite": {
        "input_tokens": 2048,
        "output_tokens": 480,
        "cache_hits": 256,
        "cost_usd": 0.00072
      }
    },
    "tts": {
      "elevenlabs_flash_v2.5": {
        "characters": 4200,
        "cost_usd": 0.084
      }
    },
    "stt": {
      "google_stt": {
        "duration_min": 3.75,
        "cost_usd": 0.06
      }
    },
    "api_calls": 15,
    "api_cost_usd": 0.02,
    "infrastructure": 0.05
  },
  "total_cost_usd": 0.442,
  "cost_per_minute": 0.196,
  "revenue_impact": {
    "deal_value_usd": 1200,
    "probability": 0.35,
    "expected_value_usd": 420,
    "roi": 950
  },
  "cost_anomaly": false,
  "cost_threshold_exceeded": false
}
```

#### **latency_event**
```json
{
  "event_type": "latency_event",
  "call_id": "ca_abc123",
  "timestamp": "2026-06-21T15:03:45Z",
  "metrics": {
    "ttfb_avg_ms": 240,
    "ttfb_p95_ms": 380,
    "turn_latency_avg_ms": 450,
    "turn_latency_max_ms": 1200,
    "tts_latency_avg_ms": 90,
    "stt_latency_avg_ms": 180,
    "bridge_processing_avg_ms": 120,
    "network_rtt_avg_ms": 60
  },
  "component_breakers_active": ["gemini_llm"],
  "user_perceived_latency_good": true
}
```

---

## III. ALERTING STRATEGY

### 3.1 Alert Thresholds & Severity Levels

| Severity | SLA | Definition | Escalation |
|----------|-----|-----------|------------|
| **P0** (Critical) | 5 min | Service down, 0 calls completing | PagerDuty → On-call |
| **P1** (High) | 15 min | Quality/financial impact, >5% error rate | Slack #incidents + on-call |
| **P2** (Medium) | 1 hour | Cost anomalies, performance degradation | Slack #alerts |
| **P3** (Low) | 4 hours | Informational, trend changes | Email digest |

### 3.2 Alert Definitions & Runbooks

#### **P0 ALERTS**

##### **A1: Service Down (Circuit Breaker Triggered)**
```yaml
name: "LLM Service Degradation"
condition: "circuit_breaker_active[gemini_llm] == true for > 2 min"
threshold: "latency P50 > 1000ms for 5+ consecutive requests"
severity: "P0"
runbook: |
  1. Check Gemini API status dashboard
  2. Verify quota not exceeded (Cloud Console)
  3. Check network connectivity (VPC logs)
  4. If quota: contact Google Cloud support
  5. Fallback: switch to backup model (Gemini Sonnet)
  6. Notify on-call + sales ops
actions:
  - page_oncall: true
  - slack_channel: "#incidents"
  - rollback: "auto_switch_to_backup_model"
```

##### **A2: Call Completion Rate Drops**
```yaml
name: "Zero Calls Completing"
condition: "calls_completed_in_window < 1 AND window_size_min = 5"
threshold: ">2 minutes with 0 completions"
severity: "P0"
runbook: |
  1. Check Twilio webhook connectivity (media_stream.py logs)
  2. Verify WebSocket tunneling to Gemini
  3. Check call routing logic
  4. Verify database connectivity
  5. Restart media_stream service if needed
actions:
  - page_oncall: true
  - trigger: "incident_response"
  - communication: "notify_sales"
```

#### **P1 ALERTS**

##### **A3: Error Rate Spike**
```yaml
name: "Error Rate > 1%"
condition: "errors_in_window / calls_in_window > 0.01"
threshold: ">1% for 2+ minutes"
severity: "P1"
runbook: |
  1. Check recent deployments (git log)
  2. Review error logs (app.observability.alerts)
  3. Isolate error type (LLM? API? Compliance?)
  4. If LLM errors: check model configuration
  5. If API errors: check external service status
  6. Correlate with code changes
actions:
  - slack_notify: "#alerts"
  - severity_escalation_if: "error_rate > 0.05 for 5+ min"
```

##### **A4: Model Drift Detected**
```yaml
name: "Classification Confidence Drops"
condition: |
  avg_classifier_confidence[window_size=100] < 0.70
  AND trend_over_last_hour[slope] < 0
severity: "P1"
runbook: |
  1. Review recent classifier changes
  2. Sample 50 classifications and manually verify
  3. Check if prospect profile changed (new verticals?)
  4. Retrain or recalibrate classifier
  5. Monitor confidence trend closely
actions:
  - alert_ml_team: true
  - slack: "#alerts"
  - log_for_investigation: true
```

##### **A5: API Rate Limit Critical**
```yaml
name: "Rate Limit Hits > 5 in 1 min"
condition: "rate_limit_hits_last_minute >= 5"
severity: "P1"
runbook: |
  1. Identify which API is rate-limited (Twilio? Gemini? Supabase?)
  2. Check request spike (sudden increase in call volume?)
  3. Implement backoff + queuing
  4. Contact API provider if quota too low
  5. Scale horizontally if needed
actions:
  - trigger_backoff: "exponential_backoff_max_5s"
  - alert_devops: true
  - scale_check: "current_instances vs recommended"
```

#### **P2 ALERTS**

##### **A6: Cost Anomaly**
```yaml
name: "Cost Per Call Exceeds Threshold"
condition: |
  cost_per_call > cost_per_call_baseline * 1.5
  AND duration_normalized
severity: "P2"
threshold: "20+ calls above 1.5x baseline in last hour"
runbook: |
  1. Break down cost by component (LLM? TTS? API?)
  2. Check if using fallback/slower models
  3. Verify cache hit rate (should be >30%)
  4. Check token usage inflation (system prompt change?)
  5. Review for any inefficient loops
actions:
  - alert_finance: "cost_notifications@company.com"
  - slack: "#alerts"
  - investigate: "find root cause within 1 hour"
  - escalate_if: "cost increase > 50% from baseline"
```

##### **A7: Latency P95 > 1500ms**
```yaml
name: "High User-Perceived Latency"
condition: "ttfb_p95_ms > 1500"
severity: "P2"
runbook: |
  1. Check component latencies (which component is slow?)
  2. If LLM: check input token count, model load
  3. If TTS: check ElevenLabs latency
  4. If STT: check audio quality
  5. Review concurrent call count (resource contention?)
actions:
  - monitor_intensively: "increase logging to 50%"
  - alert_devops: true
  - consider_scaling: "if sustained for >10 min"
```

##### **A8: Compliance Event Missed**
```yaml
name: "Disclosure Not Mentioned in Call"
condition: |
  call_duration > 30
  AND compliance.disclosure_mentioned == false
severity: "P2"
runbook: |
  1. Review recording (compliance/recordings/{call_id})
  2. Manually verify: was disclosure given?
  3. Check if system prompt includes disclosure
  4. Update classifier if needed
  5. Review prospect response (may have disconnected early)
actions:
  - alert_compliance: true
  - escalate_to_human: "manual_review_required"
  - log_for_audit: true
```

### 3.3 Alert Notification Channels

| Channel | Alert Types | Frequency | Recipients |
|---------|-----------|-----------|-----------|
| **PagerDuty** | P0 only | Immediate | On-call SRE |
| **Slack #incidents** | P0, P1 | Immediate | SRE, Backend, Sales Ops |
| **Slack #alerts** | P1, P2 | Per alert | Engineering, Product |
| **Email digest** | P2, P3 | Hourly summary | Team leads, Product |
| **Compliance audit log** | Compliance violations | Real-time | Compliance Officer |

---

## IV. OBSERVABILITY COMPONENTS

### 4.1 Distributed Tracing (OpenTelemetry)

**Implementation:**

```python
# app/observability/tracing.py
from opentelemetry import trace, metrics
from opentelemetry.exporter.gcp_trace import GoogleCloudTraceExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
from opentelemetry.instrumentation.httpx import HTTPXClientInstrumentor

# Initialize tracer
trace.set_tracer_provider(TracerProvider())
trace.get_tracer_provider().add_span_processor(
    BatchSpanProcessor(GoogleCloudTraceExporter())
)

# Auto-instrument
FastAPIInstrumentor().instrument_app(app)
HTTPXClientInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

# Usage in code:
with tracer.start_as_current_span("gemini_llm_call") as span:
    span.set_attribute("model", "gemini-3.1-flash-lite")
    span.set_attribute("input_tokens", 512)
    response = await gemini_client.call(...)
    span.set_attribute("output_tokens", 145)
    span.set_attribute("latency_ms", 245)
```

**Trace Structure (per call):**

```
root_span: call_ca_abc123
├── span: media_stream_connect (10ms)
├── span: agent_selection (5ms)
│   └── span: router.route_agent (2ms)
├── span: turn_1_process
│   ├── span: stt_transcript (180ms)
│   ├── span: classifier_exec (45ms)
│   ├── span: state_transition (20ms)
│   ├── span: master_llm_call (310ms)
│   │   ├── span: gemini.generate_content (245ms)
│   │   └── span: post_process (30ms)
│   ├── span: voice_llm_call (180ms)
│   ├── span: tts_synthesize (75ms)
│   ├── span: crm_update (120ms)
│   └── span: turn_decision_log (5ms)
└── span: call_end_processing (50ms)
```

**Sampling:** 100% of calls, but only critical spans in hot path to reduce overhead.

### 4.2 Metrics (Prometheus)

**Key Metrics Exposed:**

```yaml
# app/observability/metrics.py (Prometheus format)

# Call volume
revenue_ai_calls_total{status="completed|error|timeout",agent_type,region}
revenue_ai_calls_in_progress{agent_type}
revenue_ai_call_duration_seconds{percentile="p50|p95|p99"}

# LLM performance
revenue_ai_llm_calls_total{model,cache_hit,status}
revenue_ai_llm_latency_ms{model,percentile}
revenue_ai_llm_tokens_total{model,type="input|output|cached"}
revenue_ai_llm_cost_usd_total{model}

# Conversion funnel
revenue_ai_conversion_rate{stage,outcome} # 30s_conversation, interest, demo, transfer, optout

# Agent routing
revenue_ai_agent_selected_total{agent_type,reason}
revenue_ai_agent_handoff_total{from_agent,to_agent}

# Latency by component
revenue_ai_latency_ms{component,percentile} # stt, classifier, gemini, tts, bridge

# Compliance
revenue_ai_compliance_events_total{event_type,status="satisfied|violated"}

# Circuit breaker
revenue_ai_circuit_breaker_active{component} # 0 or 1

# Errors
revenue_ai_errors_total{error_type,severity}

# Cost
revenue_ai_cost_per_call_usd # histogram

# Quality
revenue_ai_classifier_confidence{percentile}
revenue_ai_humanization_score{percentile}
```

**Export to Prometheus:**

```python
# Endpoint: GET /metrics (standard Prometheus format)
from prometheus_client import generate_latest

@app.get("/metrics")
def metrics():
    return generate_latest()
```

### 4.3 Dashboards (Grafana)

#### **Dashboard 1: Real-time Operations**
- Current call count (gauge)
- Call completion rate (last 5 min)
- Error rate (P0 alert threshold highlighted)
- Agent distribution (pie chart)
- Latency P95 (line chart, red zone >1500ms)
- Cost per call (gauge with trend arrow)

#### **Dashboard 2: LLM Performance**
- Model usage breakdown (stacked area)
- Latency by model (P50, P95, P99)
- Cache hit rate trend
- Token efficiency (input:output ratio)
- Cost trend by model
- Error rate by model

#### **Dashboard 3: Conversion Funnel**
- Calls started (count)
- 30s conversation rate (%)
- Interest detected (%)
- Demo scheduled (%)
- Transfer rate (%)
- Opt-out rate (%)
- Drop-off by stage (heatmap)

#### **Dashboard 4: Agent Performance**
- Agent handoff count (bar chart)
- Agent routing reasons (pie)
- Prospect outcome by agent (SDR vs Closer vs Recovery)
- Avg duration by agent
- Conversion rate by agent
- Cost per agent

#### **Dashboard 5: Compliance & Risk**
- Disclosure rate (should be >98%)
- Recording consent rate (%)
- Opt-outs detected (counter)
- Rate limits hit (spike chart)
- Do-not-call violations (counter)
- Regulatory events by jurisdiction

#### **Dashboard 6: Cost Analytics**
- Total daily cost (gauge)
- Cost breakdown by component (pie)
- Cost per minute (trend)
- Cost anomalies (table with recent spikes)
- Expected ROI (calls → demo value)
- Cost per converted call (vs target)

### 4.4 Logging Infrastructure

**Stack:**

```
├── Application Logs (Python logging)
│   ├── Structured JSON → Cloud Logging
│   └── Sampled at 10% (detailed) + 100% (traces)
│
├── Cloud Logging (GCP) / CloudWatch (AWS)
│   ├── Hot queries: Recent 7 days
│   ├── BigQuery integration for analytics
│   └── Real-time alerting
│
├── Decision Logs (File-based JSONL)
│   ├── Location: logs/decisions/{call_id}.jsonl
│   ├── Rotation: 1 file per call
│   └── Retention: 7d (S3 archive)
│
├── Compliance Audit Log
│   ├── Database: Audit DB (PostgreSQL)
│   ├── Retention: 90d hot, 1y cold
│   └── Immutable + tamper-proof
│
└── Metrics (Prometheus)
    ├── Scrape interval: 15s
    ├── Retention: 30d
    └── Export to Grafana
```

---

## V. INCIDENT RESPONSE PLAYBOOKS

### 5.1 Playbook: Zero Call Completions

**Trigger:** No calls completed in last 5 minutes

**Detection:** Alert A2 fires

**Response Flow:**

```
┌─ DETECTION (minute 1-2)
│
├─ Verify alert (false positive check)
│  └─ Check calls_in_progress > 0? YES → calls are stuck, not zero
│
├─ Quick diagnosis (minute 2-3)
│  ├─ Check Twilio webhook logs
│  ├─ Check Gemini API status
│  ├─ Check network latency to backend
│  └─ Check database connectivity
│
├─ IF: Twilio webhook failing
│  └─ Restart media_stream.py service
│      └─ Monitor next 2 calls for success
│
├─ IF: Gemini API degraded
│  └─ Activate circuit breaker → fallback to Gemini Sonnet
│      └─ Page SRE, contact Google Cloud
│
├─ IF: Database connectivity down
│  └─ Check PostgreSQL status
│      └─ Failover to read-replica if available
│
└─ RESOLUTION
   ├─ Once 3+ calls complete: close alert
   ├─ Send incident summary to #incidents
   └─ Schedule post-mortem if impact > 30 min
```

**Owner:** On-call SRE  
**SLA:** Resolve within 5 minutes  
**Escalation:** If unresolved after 2 min, page VP Engineering

### 5.2 Playbook: High Error Rate

**Trigger:** Error rate >5% for 5 minutes

**Detection:** Alert A3 escalates to P0 if rate >5%

**Response:**

```
1. Sample recent errors (last 50)
   - group by: error_type, component, error_code
   
2. IF error_type == "llm_rate_limit"
   - Implement 5s backoff
   - Queue retry with exponential backoff
   - Check if quota increase needed
   
3. IF error_type == "api_timeout"
   - Check external API status
   - Consider fallback to cache
   - Page on-call for external API issue
   
4. IF error_type == "classifier_failure"
   - Skip classifier, use state heuristics
   - Alert ML team
   - Monitor classifier health
   
5. IF error_type == "database_error"
   - Check connection pool exhaustion
   - Restart service if needed
   - Failover to read-replica
   
6. Communicate
   - If error rate still >1%: notify sales ops
   - Post updates to #incidents every 2 min
   - Close when error_rate < 0.5% for 5 min
```

### 5.3 Playbook: Cost Spike

**Trigger:** Cost per call > 1.5x baseline

**Detection:** Alert A6 fires

**Response:**

```
1. Identify cost driver
   ├─ LLM cost inflated? → Check token usage, cache hit rate
   ├─ TTS cost high? → Check character count, fallback model usage
   ├─ API cost high? → Count CRM writes, classify retries
   └─ Infrastructure cost? → Check concurrent instance count
   
2. IF cache hit rate < 30% (should be >35%)
   - Check if system prompt changed
   - Review if conversation history growing
   - Consider prompt compression
   
3. IF token count inflated
   - Review LLM input token count trend
   - Check if using slower/larger model
   - Verify prompt optimization
   
4. IF TTS cost inflated
   - Check if responses much longer than baseline
   - Review humanization settings (may be adding filler words)
   
5. Remediation
   - Apply fix (prompt optimization, cache tuning, etc.)
   - Monitor cost trend for next 30 min
   - Estimate monthly impact
   - Notify finance + product leads
```

---

## VI. DASHBOARD SPECIFICATIONS

### 6.1 Dashboard JSON Config (Grafana)

```json
{
  "dashboard": {
    "title": "Revenue AI — Real-time Operations",
    "panels": [
      {
        "title": "Calls In Progress",
        "type": "gauge",
        "targets": [
          {"expr": "revenue_ai_calls_in_progress"}
        ],
        "thresholds": {"mode": "absolute", "steps": [{"color": "green", "value": 0}, {"color": "red", "value": 100}]}
      },
      {
        "title": "Call Completion Rate (5m)",
        "type": "stat",
        "targets": [
          {"expr": "rate(revenue_ai_calls_total{status=\"completed\"}[5m])"}
        ]
      },
      {
        "title": "Error Rate (%)",
        "type": "stat",
        "targets": [
          {"expr": "rate(revenue_ai_errors_total[5m]) / rate(revenue_ai_calls_total[5m]) * 100"}
        ],
        "alertThreshold": 1
      },
      {
        "title": "Latency P95 (ms)",
        "type": "stat",
        "targets": [
          {"expr": "histogram_quantile(0.95, revenue_ai_latency_ms)"}
        ],
        "alertThreshold": 1500
      },
      {
        "title": "Cost Per Call ($)",
        "type": "stat",
        "targets": [
          {"expr": "rate(revenue_ai_cost_per_call_usd_sum[5m]) / rate(revenue_ai_cost_per_call_usd_count[5m])"}
        ]
      },
      {
        "title": "Conversion Funnel",
        "type": "piechart",
        "targets": [
          {
            "expr": "revenue_ai_conversion_rate",
            "legendFormat": "{{stage}}"
          }
        ]
      }
    ]
  }
}
```

---

## VII. COST ESTIMATE

### 7.1 Monthly Cost Breakdown (1M calls/month)

| Component | Volume | Cost |
|-----------|--------|------|
| **Cloud Logging (GCP)** | 100GB ingestion | $500 |
| **BigQuery (analytics)** | 50GB active queries | $250 |
| **Cloud Trace (GCP)** | 1M traces | $100 |
| **Prometheus (self-hosted) + Grafana** | Compute | $200 |
| **Storage (S3/GCS)** | 200GB (7d hot + 30d archive) | $100 |
| **External APIs** (Slack, PagerDuty) | Notifications | $50 |
| **Incident management overhead** | Engineering time est. | $1000 |
| **Total Observability Cost** | - | **~$2,200/month** |
| **Cost per 1K calls** | - | **$2.20** |

**ROI Calculation:**
- Prevented incident cost (1 hour downtime): ~$15k revenue loss
- MTTR reduction (from 30 min to 5 min): -$12.5k potential loss per incident
- Cost identification: $300/month saved in cost optimizations
- **Break-even: 7 incidents/year** ✓

---

## VIII. IMPLEMENTATION ROADMAP

### **Phase 1 (Week 1-2): Foundation**
- [ ] OpenTelemetry setup + GCP Cloud Trace integration
- [ ] Prometheus scraping endpoint
- [ ] Structured logging to Cloud Logging (100% sampling)
- [ ] Basic Grafana dashboard (ops view)
- [ ] PagerDuty integration (P0 alerts only)

### **Phase 2 (Week 3-4): Depth**
- [ ] Decision log storage + BigQuery analytics
- [ ] LLM cost tracking + breakdown
- [ ] Compliance event audit log
- [ ] Advanced Grafana dashboards (6 dashboards)
- [ ] 10% sampling for detailed logs

### **Phase 3 (Week 5-6): Automation**
- [ ] Alert playbook automation (incident response CLI)
- [ ] Cost anomaly detection (ML-based)
- [ ] Model drift detection
- [ ] Automated scaling triggers
- [ ] Post-incident report generation

### **Phase 4 (Week 7+): Optimization**
- [ ] Customer-facing telemetry API (for transparency)
- [ ] Predictive alerting (before threshold breach)
- [ ] Cost forecasting model
- [ ] Custom agent performance scoring

---

## IX. KEY METRICS SUMMARY

**For Executive Dashboard:**

```
KPI                          | Target  | Current | Trend
─────────────────────────────┼─────────┼─────────┼──────
Call Completion Rate         | >95%    | 94.2%   | ↑
Error Rate                   | <1%     | 0.8%    | ✓
Latency P95                  | <800ms  | 720ms   | ✓
Cost per Call                | <$0.50  | $0.45   | ✓
Compliance Rate              | 100%    | 99.8%   | ↑
Agent Conversion Rate (SDR)  | >20%    | 22%     | ✓
```

---

## X. RUNBOOK QUICK REFERENCE

| Alert | Root Cause | Action | Time |
|-------|-----------|--------|------|
| **Call completion = 0** | Service down | Restart + failover | 5 min |
| **Error rate > 5%** | LLM/API error | Backoff + fallback model | 10 min |
| **Latency P95 > 2s** | Resource contention | Scale instances | 15 min |
| **Cost spike 2x** | Token inflation | Optimize prompt | 30 min |
| **Compliance failure** | System prompt change | Manual review | 1 hour |

---

## APPENDIX A: Example Logging Code

```python
# app/observability/logger.py
import json
import logging
from typing import Any, Dict
from app.config import settings

class StructuredLogger:
    def __init__(self, name: str):
        self.logger = logging.getLogger(name)
    
    def event(
        self,
        event_type: str,
        call_id: str,
        data: Dict[str, Any],
        level: str = "INFO",
        sample_rate: float = 1.0
    ):
        """Log a structured event."""
        import random
        import time
        
        if random.random() > sample_rate:
            return  # Sampling
        
        envelope = {
            "timestamp": time.time(),
            "level": level,
            "event_type": event_type,
            "call_id": call_id,
            "component": self.logger.name,
            "data": data,
        }
        
        log_method = getattr(self.logger, level.lower())
        log_method(json.dumps(envelope, default=str))

# Usage:
logger = StructuredLogger("app.gemini.chat_session")
logger.event(
    "llm_call_complete",
    call_id="ca_abc123",
    data={
        "model": "gemini-3.1-flash-lite",
        "latency_ms": 245,
        "tokens": 657,
        "cache_hit": True,
        "cost_usd": 0.00023
    }
)
```

**Este documento es la referencia completa para observabilidad enterprise en Revenue AI.**

