# Experimentation Framework - Implementation Guide
## Guía de ejecución para equipos de Engineering & Analytics

**Status**: Ready to Execute  
**Version**: 2.0  
**Last Updated**: 2026-06-21  

---

## QUICK START (Next 2 weeks)

### Week 1: Setup Infrastructure

**Mon-Tue: Database Schema**
```bash
# Crear tablas en base de datos
psql $DATABASE_URL < scripts/create_experiment_tables.sql

# Tablas creadas:
# - experiment_registry
# - experiment_events
# - experiment_results
# - rollout_schedule
# - mab_state
```

**Wed-Thu: Backend Implementation**
```bash
# Implementar core engine
cp /dev/stdin app/experimentation_engine.py < EXPERIMENTATION_FRAMEWORK_2026.md
cp /dev/stdin app/experimentation_integration.py

# Instalar dependencias
pip install scipy numpy

# Tests básicos
pytest tests/test_experimentation_engine.py -v
```

**Fri: Dashboard Setup**
```bash
# Crear Looker dashboard (si usas Looker)
# O Metabase dashboard
# KPIs: 
#   - Active experiments
#   - Experiment progress (sample collection)
#   - Winner analysis
#   - Revenue impact
```

### Week 2: Pilot Experiments

**Mon: Design 4 Pilot Experiments**

```yaml
Pilot #1: Argument "ROI" vs "Automation"
  - Segment: industry=retail, size=20-500
  - Duration: 14 days
  - Min samples: 400 per variant
  - Metric: close_rate

Pilot #2: Objection "Es caro": Rebuttal A vs B
  - Only triggered on objection
  - Duration: 21 days (lower frequency)
  - Min samples: 100 per variant
  - Metric: objection_overcome_rate

Pilot #3: Offer Pricing: $1900 vs $1500
  - Segment: lead_score < 70
  - Duration: 14 days
  - Min samples: 350 per variant
  - Metric: expected_revenue

Pilot #4: Next Action: WhatsApp 24h vs Email 48h
  - Segment: lead_score 30-70
  - Duration: 35 days (wait for conversions)
  - Min samples: 600 per variant
  - Metric: conversion_rate_30d
```

**Tue-Wed: Launch Experiments**
```python
# En app/main.py o startup script

from app.experimentation_engine import ExperimentEngine, ExperimentConfig
from datetime import datetime, timedelta

exp_engine = ExperimentEngine(db_client, redis_client)

# Pilot #1
config1 = ExperimentConfig(
    experiment_id="exp_argue_roi_001",
    name="ROI Argument vs Automation",
    hypothesis="ROI argument (3-month payback) closes 12% more than automation argument",
    control_variant="automation_80",
    treatment_variant="roi_3months",
    target_segment={"industry": "retail", "company_size_min": 20, "company_size_max": 500},
    allocation={"control": 0.50, "treatment": 0.50},
    duration_days=14,
    min_sample_size=400,
    primary_metric="close_rate",
    primary_threshold=0.12,  # 12% lift required
)

exp_id1 = await exp_engine.create_experiment(config1)

# Repeat for Pilot #2, #3, #4...
```

**Thu-Fri: Manual Monitoring**
- Daily check: sample collection rate
- Check: experiment is running in correct segments
- Document learnings from pilot setup

---

## INTEGRATION WITH CONVERSATION FLOW

### Step 1: Argument Selection Integration

**File: `app/conversation_intelligence.py`**

```python
class ConversationIntelligenceEngine:
    
    def __init__(self, db_client, exp_integration=None):
        # ...existing code...
        self.exp_integration = exp_integration
    
    async def get_winning_argument(self, 
                                  industry: str,
                                  company_size: int, 
                                  lead_score: int) -> str:
        """
        Replace old playbook-based logic with experiment-aware selection
        """
        
        if not self.exp_integration:
            # Fallback to old logic
            playbook = await self.build_winning_arguments_playbook(industry)
            return playbook[0].argument if playbook else "default"
        
        # NEW: Use experimentation
        return await self.exp_integration.select_argument_for_call(
            call_id=f"call_{datetime.now().timestamp()}",
            industry=industry,
            company_size=company_size,
            lead_score=lead_score,
            force_experiment_id=None  # Could be specific if running arg experiment
        )
```

### Step 2: Deal Engine Integration

**File: `app/deal_engine.py`**

```python
class DealEngine:
    
    def __init__(self, db_client, exp_integration=None):
        # ...existing code...
        self.exp_integration = exp_integration
    
    async def get_best_offer(self, prospect_profile: dict) -> DealRecommendation:
        """
        Use experimentation framework if pricing experiment is active
        """
        
        # Check if there's active pricing experiment
        pricing_exp = None  # TODO: query for active pricing experiment
        
        if self.exp_integration and pricing_exp:
            return await self.exp_integration.select_offer_with_experiment(
                call_id=prospect_profile.get("call_id"),
                prospect_profile=prospect_profile,
                experiment_id=pricing_exp["id"]
            )
        
        # Otherwise use existing logic
        return await self._get_best_offer_original(prospect_profile)
```

### Step 3: Coaching Engine Integration

**File: `app/coaching_engine.py`**

```python
class CoachingEngine:
    
    def __init__(self, db_client, exp_integration=None):
        # ...existing code...
        self.exp_integration = exp_integration
    
    async def determine_next_action(self,
                                   lead_score: LeadScore,
                                   sentiment: str,
                                   probability: float) -> NextAction:
        """
        Use experimentation to select next action
        """
        
        if self.exp_integration:
            # NEW: experiment-driven selection
            return await self.exp_integration.select_next_action_with_experiment(
                call_id="...",
                lead_score=lead_score,
                sentiment=sentiment,
                probability=probability,
                experiment_id=None  # Will be determined in integration layer
            )
        
        # Fallback to existing logic
        return self._determine_next_action_original(lead_score, sentiment, probability)
```

### Step 4: Post-Call Tracking

**File: `app/main.py` or `app/telephony/media_stream.py`**

```python
async def handle_call_completion(call_id: str, 
                                transcript: str, 
                                outcome: str):
    """
    Called after call ends, before storing in CRM
    """
    
    # Extract insights (existing)
    call_analysis = await coaching_engine.analyze_call(call_id, transcript, outcome)
    
    # NEW: Track in experiments
    if exp_integration:
        await exp_integration.track_call_in_experiments(
            call_id=call_id,
            transcript=transcript,
            outcome=outcome,
            prospect_profile=call_analysis.prospect_profile
        )
    
    # Proceed with normal post-call workflow
    await execute_next_action(call_analysis.next_action)
```

---

## MONITORING & ANALYSIS

### Daily Monitoring (06:00 UTC)

```python
# scripts/monitor_experiments.py

async def daily_health_check():
    """Run at 06:00 UTC every day"""
    
    from app.experimentation_engine import ExperimentEngine
    
    exp_engine = ExperimentEngine(db_client, redis_client)
    
    # 1. Check sample collection
    for exp_id, exp in exp_engine.experiments.items():
        if exp.status == "running":
            events = [e for e in exp_engine.events if e.experiment_id == exp_id]
            
            # Expected vs actual
            expected = (exp.min_sample_size * 2) / exp.duration_days * days_running
            actual = len([e for e in events if e.event_type in ["close", "conversion"]])
            
            if actual < expected * 0.7:
                log_alert(f"Exp {exp_id}: under-collecting samples ({actual} vs {expected})")
    
    # 2. Early stopping check
    await exp_engine.check_experiment_health()
    
    # 3. Generate daily report
    report = await generate_daily_report(exp_engine)
    
    notify_slack(channel="#experiments", message=report)
```

### Weekly Analysis (Mon 06:00 UTC)

```python
# scripts/analyze_experiments.py

async def weekly_analysis():
    """Run every Monday at 06:00 UTC"""
    
    exp_engine = ExperimentEngine(db_client, redis_client)
    
    for exp_id, exp in exp_engine.experiments.items():
        if exp.status != "running":
            continue
        
        # Analyze
        result = await exp_engine.analyze_experiment(exp_id)
        
        # Store result
        await db_client.experiment_results.insert_one(asdict(result))
        
        # Decision
        if result.rollout_ready:
            # Declare winner and start rollout
            await exp_engine.declare_winner_and_start_rollout(exp_id, result)
            
            # Notify
            slack_msg = f"""
            🎉 Experiment {exp_id} completed!
            
            Winner: {result.winner}
            Lift: {result.lift:.1%} (p={result.p_value:.4f})
            Confidence: {result.confidence}
            
            Rollout starting: {result.winner} variant → 5% traffic (Stage 1)
            """
            
            notify_slack(channel="#experiments", message=slack_msg)
        
        elif result.winner == "inconclusive" and days_running > exp.duration_days:
            # Inconclusive after full duration
            log_note(f"Exp {exp_id}: inconclusive after {exp.duration_days} days")
            exp.status = "completed"
```

### Monthly Executive Report

```python
# scripts/monthly_report.py

async def generate_monthly_report(start_date, end_date):
    """Generate executive summary"""
    
    results = db_client.experiment_results.find({
        "analyzed_at": {"$gte": start_date, "$lte": end_date}
    })
    
    # Aggregate metrics
    total_experiments = len(results)
    winners = len([r for r in results if r.winner != "inconclusive"])
    total_lift = sum(r.lift for r in results if r.winner != "inconclusive")
    
    # Revenue impact
    revenue_per_call = 4500  # avg
    calls_per_day = 200
    
    lift_pct = total_lift / max(1, winners)
    daily_revenue_impact = calls_per_day * revenue_per_call * lift_pct
    monthly_revenue_impact = daily_revenue_impact * 30
    
    # Cost
    infrastructure_cost = 5000
    engineering_cost = 30000
    total_cost = infrastructure_cost + engineering_cost
    
    roi = monthly_revenue_impact / total_cost if total_cost > 0 else 0
    
    report = f"""
    MONTHLY EXPERIMENTATION REPORT
    ===============================
    
    Period: {start_date.date()} to {end_date.date()}
    
    EXPERIMENTS:
    - Total run: {total_experiments}
    - Winners: {winners} ({winners/max(1,total_experiments):.0%})
    - Average lift: {lift_pct:.1%}
    
    REVENUE IMPACT:
    - Lift per call: {lift_pct:.1%}
    - Daily impact: ${daily_revenue_impact:,.0f}
    - Monthly impact: ${monthly_revenue_impact:,.0f}
    
    COST:
    - Infrastructure: ${infrastructure_cost:,.0f}
    - Engineering: ${engineering_cost:,.0f}
    - Total: ${total_cost:,.0f}
    
    ROI: {roi:.1f}x
    
    KEY LEARNINGS:
    [Top 3 insights from experiments this month]
    """
    
    return report
```

---

## ROLLOUT PROCESS

### Stage 1: Validation (5% traffic)

**Duration**: 3-4 days

```python
async def rollout_stage_1(experiment_id: str, winner_variant: str):
    """
    Stage 1: 5% of matching traffic sees winner variant
    
    Success criterion: metric stays within ±2% of experiment result
    """
    
    exp = exp_engine.experiments[experiment_id]
    
    # Update allocation
    exp.metadata['rollout_stage'] = 1
    exp.metadata['rollout_percentage'] = 0.05
    exp.metadata['rollout_winner'] = winner_variant
    
    # Snapshot metric before rollout
    baseline = await get_current_metric(exp.primary_metric)
    exp.metadata['rollout_baseline'] = baseline
    
    # Monitor for 3-4 days
    # If metric stays close, advance to Stage 2
    # If metric drops > 2%, rollback
```

### Stage 2: Ramp-up (25% traffic)

**Duration**: 7 days

```python
async def rollout_stage_2(experiment_id: str):
    """
    Stage 2: 25% of matching traffic
    
    Check: same as stage 1 + more data for stability
    """
    
    exp = exp_engine.experiments[experiment_id]
    
    # Get stage 1 data
    stage1_metric = await get_stage_metric(experiment_id, stage=1)
    baseline = exp.metadata['rollout_baseline']
    
    # Check if metric held
    variance = abs(stage1_metric - baseline) / baseline
    
    if variance < 0.02:
        # OK: advance to stage 2
        exp.metadata['rollout_stage'] = 2
        exp.metadata['rollout_percentage'] = 0.25
        
        logger.info(f"Rollout {experiment_id}: Stage 1 OK, advancing to Stage 2")
    else:
        # Bad: rollback
        logger.error(f"Rollout {experiment_id}: Stage 1 failed, metric variance {variance:.1%}")
        await rollback_rollout(experiment_id)
```

### Stage 3: Full Rollout (100% traffic)

**Duration**: Indefinite

```python
async def rollout_stage_3(experiment_id: str):
    """
    Stage 3: 100% rollout
    
    Monitoring: Check daily that metric stays stable
    Alert if regression > 5%
    """
    
    exp = exp_engine.experiments[experiment_id]
    
    exp.status = "rolled_out"
    exp.metadata['rollout_stage'] = 3
    exp.metadata['rollout_percentage'] = 1.0
    
    logger.info(f"Rollout {experiment_id}: COMPLETE - 100% traffic on {exp.metadata['rollout_winner']}")
```

---

## TROUBLESHOOTING

### Problem: Experiment not collecting samples

**Diagnosis**:
```python
# Check if call matches segment
exp = exp_engine.experiments[exp_id]
calls_in_segment = await count_calls_matching_segment(exp.target_segment)

# Check if variant assignment is working
variants_assigned = await count_event(exp_id, "argument_assigned")

# Check if events are being tracked
total_events = await count_event(exp_id, "*")
```

**Solution**:
1. Verify target_segment is not too restrictive
2. Check: are calls actually hitting this segment?
3. Verify: is `track_event()` being called?

### Problem: Sample collection slowing down

**Diagnosis**:
```python
# Compare expected vs actual
expected_per_day = exp.min_sample_size * 2 / exp.duration_days
actual_per_day = (total_events / days_running) if days_running > 0 else 0
```

**Solution**:
1. If actual < expected * 0.5: may need to extend duration
2. If sample rate normal but target slow: check if segment changed
3. Consider reducing min_sample_size if threshold permits

### Problem: Results inconclusive after min duration

**Decision**:
- Extend experiment (add more duration)
- Fold into next experiment (combine variants)
- Increase MDE (minimum detectable effect) to lower sample requirement

---

## MAINTENANCE TASKS

### Weekly
- [ ] Review experiment health
- [ ] Check sample collection rates
- [ ] Analyze any completed experiments

### Monthly
- [ ] Generate executive report
- [ ] Plan next month's experiments
- [ ] Document learnings

### Quarterly
- [ ] Review experiment framework effectiveness
- [ ] Update safety guardrails if needed
- [ ] Plan next quarter's experiment roadmap

---

## APPENDIX: Database Query Reference

### Active Experiments
```sql
SELECT experiment_id, name, status, 
       DATE_PART('day', NOW() - start_date) as days_running,
       (SELECT COUNT(*) FROM experiment_events 
        WHERE experiment_id = experiment_registry.experiment_id) as events
FROM experiment_registry
WHERE status = 'running'
ORDER BY start_date DESC;
```

### Experiment Progress
```sql
SELECT 
  er.experiment_id,
  er.control_variant,
  er.treatment_variant,
  COUNT(CASE WHEN metadata->>'variant' = er.control_variant THEN 1 END) as control_n,
  COUNT(CASE WHEN metadata->>'variant' = er.treatment_variant THEN 1 END) as treatment_n,
  er.min_sample_size
FROM experiment_registry er
LEFT JOIN experiment_events ee ON er.experiment_id = ee.experiment_id
WHERE er.status = 'running'
GROUP BY er.experiment_id, er.control_variant, er.treatment_variant, er.min_sample_size;
```

### Winners (Last 30 days)
```sql
SELECT 
  experiment_id,
  winner,
  lift,
  p_value,
  confidence,
  analyzed_at
FROM experiment_results
WHERE analyzed_at > NOW() - INTERVAL '30 days'
  AND winner != 'inconclusive'
ORDER BY analyzed_at DESC;
```

---

## SUCCESS METRICS

**End of Month 1**:
- ✅ 4 pilot experiments launched
- ✅ Dashboard showing real-time progress
- ✅ 2+ winners declared
- ✅ First rollout started
- **Revenue impact**: $337.5K

**End of Month 2**:
- ✅ 8 experiments running in parallel
- ✅ Automated weekly analysis
- ✅ Contextual MAB (Thompson Sampling) deployed
- ✅ Multi-stage rollout process operational
- **Revenue impact**: +$540K

**End of Month 6**:
- ✅ 12-16 experiments/month velocity
- ✅ Fully automated experimentation platform
- ✅ Safety guardrails active
- ✅ Experiment Registry as source of truth
- **Cumulative revenue impact**: +$4.15M

---

## NEXT STEPS

1. **This week**: Create database schema + infrastructure
2. **Next week**: Launch 4 pilot experiments
3. **Week 3**: Analyze pilots + plan rollout
4. **Week 4**: Full integration with conversation flow + monitoring

**Questions?** → Refer to EXPERIMENTATION_FRAMEWORK_2026.md for design details
