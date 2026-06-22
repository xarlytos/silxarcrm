# Experimentation Framework - Quick Reference Guide
## Cheat sheet para consultores, engineers, y analytics

---

## RATING CAPACIDAD EXPERIMENTACIÓN

| Aspecto | Antes | Después (6mo) |
|--------|-------|--------------|
| Overall rating | **3/10** | **8.5/10** |
| A/B tests/mes | 0.5 | 12-16 |
| Learning velocity | 1x | 24x |
| Sample time to decision | 60 días | 14 días |
| Auto-decisions | No | Sí |
| Statistical rigor | Ad-hoc | Formal (p<0.05, power>0.8) |

---

## A/B TESTING FRAMEWORK CHECKLIST

### Experiment Design
- [ ] Hypothesis is falsable (not vague)
- [ ] Min sample size calculated (typically 400/variant)
- [ ] Duration ≥ 7 days (avoid DOW bias)
- [ ] Primary metric defined
- [ ] Minimum effect size (MDE) specified
- [ ] Control vs Treatment materially different
- [ ] Segment targeting specified

### Execution
- [ ] Experiment registered in system
- [ ] Variant assignment working (consistent hashing)
- [ ] Event tracking integrated
- [ ] Dashboard shows progress
- [ ] Health checks running hourly

### Analysis
- [ ] t-test run (p-value calculated)
- [ ] 95% CI computed
- [ ] Effect size (Cohen's d) calculated
- [ ] Power calculated (should be >0.8)
- [ ] Winner declared (if p<0.05 + lift≥MDE)
- [ ] Decision logic documented

### Rollout
- [ ] Rollout schedule created
- [ ] Stage 1 (5%) deployed
- [ ] Metric stability checked
- [ ] Stage 2 (25%) if OK
- [ ] Stage 3 (100%) full rollout

---

## MULTI-ARMED BANDITS REFERENCE

### Thompson Sampling (Arguments)

**When to use**: Choosing which argument to present next

**Algorithm**:
1. Maintain alpha (successes) and beta (failures) for each argument
2. Sample from Beta(alpha, beta) for each argument
3. Select argument with highest sample
4. On feedback: alpha++ (if success) or beta++ (if failure)

**Advantages**:
- ✅ Automatic exploration vs exploitation balance
- ✅ Fast convergence
- ✅ Works with contextual splits

**Example**:
```
Arguments: ["ROI", "Automation", "Cost"]
Initial: alpha=1, beta=1 for each

Call 1: Sample ROI=0.45, Auto=0.32, Cost=0.38 → Select ROI
  Prospect: "Interesting" → alpha_ROI++
  Now: ROI alpha=2, beta=1

Call 2: Sample ROI=0.61, Auto=0.35, Cost=0.42 → Select ROI
Call 3: Sample ROI=0.55, Auto=0.38, Cost=0.44 → Select ROI
...
After 50 calls with ROI at 70% success:
  ROI: alpha=35, beta=15 (E[p]=0.70)
  Auto: alpha=10, beta=15 (E[p]=0.40)
  Selects ROI 90% of time, Auto 10% (exploration)
```

### Epsilon-Greedy (Actions)

**When to use**: Choosing next action (demo, follow-up, nurturing)

**Algorithm**:
1. Calculate success_rate for each action
2. With probability (1-ε): select best action (exploit)
3. With probability ε: select random action (explore)
4. On feedback: successes++ (if worked) or just increment uses

**Typical settings**:
- ε = 0.15 (15% exploration)
- Actions: ["demo", "objection_handling", "nurturing", "price_negotiation"]

---

## EXPERIMENTATION CADENCE

```
WEEKLY CYCLE:

MON 00:00  → Data freeze
MON 06:00  → Analysis run (all running experiments)
MON 07:00  → Generate reports, decisions
MON 08:00  → Notify team + declare winners
MON 09:00  → Start rollouts for winners
MON 12:00  → Launch new experiments (if ready)

DAILY (automated):
- 06:00: Health check (sample rate, early stopping)
- 12:00: Metric stability check (during rollout)
- 18:00: Alert if any issues
```

---

## EXPERIMENT TYPES & EXPECTED LIFTS

| Type | Control | Treatment | Expected Lift | Sample Size | Duration | Metric |
|------|---------|-----------|---------------|-------------|----------|--------|
| **Argument** | "Auto 80%" | "ROI 3mo" | +8-12% | 400 | 14d | close_rate |
| **Objection** | "Math proof" | "Social proof" | +5-10% | 100 | 21d | overcome_rate |
| **Offer** | $1900 | $1500 | +15% accept | 350 | 14d | expected_revenue |
| **Action** | WhatsApp 24h | Email 48h | +5% conv | 600 | 35d | conversion_30d |
| **Voice** | Professional | Consultative | +3-5% | 1000 | 21d | engagement_score |

---

## STATISTICAL CHEATSHEET

### Sample Size Calculator
```python
# For 25% baseline, 12% lift, alpha=0.05, beta=0.20
baseline = 0.25
lift = 0.12
alpha = 0.05  # Type I error
beta = 0.20   # Type II error (power = 1-beta = 0.80)

# Formula: n = (z_α + z_β)² × p(1-p) / (p₂-p₁)²
z_alpha = 1.96  # 95% CI
z_beta = 0.84   # 80% power

p1 = 0.25
p2 = 0.25 * 1.12 = 0.28

n = (1.96 + 0.84)² × (0.25*0.75 + 0.28*0.72) / (0.28-0.25)²
  ≈ 420 per variant
```

### T-Test Result Interpretation
```
p-value < 0.05:          ✅ Significant
p-value 0.05-0.10:       ⚠️  Borderline (extend or increase alpha)
p-value > 0.10:          ❌ Not significant

Power > 0.80:            ✅ Good (80% chance of detecting real effect)
Power 0.70-0.80:         ⚠️  OK (might miss real effects)
Power < 0.70:            ❌ Low (too risky)

Cohen's d > 0.50:        ✅ Large effect
Cohen's d 0.20-0.50:     ⚠️  Medium effect
Cohen's d < 0.20:        ❌ Small effect
```

---

## CODE SNIPPETS

### Create Experiment
```python
from app.experimentation_engine import ExperimentEngine, ExperimentConfig
from datetime import datetime, timedelta

exp_engine = ExperimentEngine(db_client, redis_client)

config = ExperimentConfig(
    experiment_id="exp_argue_roi_001",
    name="ROI Argument vs Automation",
    hypothesis="ROI argument closes 12% more",
    control_variant="automation_80",
    treatment_variant="roi_3months",
    target_segment={"industry": "retail"},
    duration_days=14,
    min_sample_size=400,
    primary_metric="close_rate",
    primary_threshold=0.12,
)

exp_id = await exp_engine.create_experiment(config)
```

### Assign Variant
```python
variant = await exp_engine.assign_variant(
    call_context={'phone': phone_number, 'industry': 'retail'},
    experiment_id='exp_argue_roi_001'
)
# Returns: 'automation_80' or 'roi_3months'
```

### Track Event
```python
await exp_engine.track_event(
    call_id='call_12345',
    experiment_id='exp_argue_roi_001',
    event_type='close',
    value=1.0,  # 1=closed, 0=not closed
    metadata={'argument': 'roi_3months', 'response': 'interested'}
)
```

### Analyze & Decide
```python
result = await exp_engine.analyze_experiment('exp_argue_roi_001')

print(f"Winner: {result.winner}")
print(f"Lift: {result.lift:.1%}")
print(f"P-value: {result.p_value:.4f}")
print(f"Confidence: {result.confidence}")

if result.rollout_ready:
    await exp_engine.declare_winner_and_start_rollout(
        'exp_argue_roi_001', result
    )
```

### Thompson Sampling
```python
bandit = ArgumentBandit(
    arguments=["ROI 3mo", "Auto 80%", "Cost -40%"]
)

# Select next argument
argument = await bandit.select_argument()  # Returns: "ROI 3mo"

# Record outcome
await bandit.feedback('ROI 3mo', outcome=True)  # prospect liked it
```

---

## INTEGRATION POINTS

### Conversation Intelligence
```python
# Before: Used static playbook
old_argument = playbook.get_best_argument()

# After: Use experimentation
argument = await exp_integration.select_argument_for_call(
    industry='retail',
    company_size=50,
    lead_score=65
)
```

### Deal Engine
```python
# Before: Recommended based on historical stats
offer = await deal_engine.get_best_offer(prospect_profile)

# After: Consider active pricing experiments
offer = await exp_integration.select_offer_with_experiment(
    prospect_profile=prospect_profile,
    experiment_id='exp_pricing_001'
)
```

### Coaching Engine
```python
# Before: Fixed logic (hot=demo, warm=followup, cold=email)
next_action = determine_next_action(lead_score, sentiment)

# After: Learn which actions work best (MAB)
next_action = await exp_integration.select_next_action_with_experiment(
    lead_score=lead_score,
    sentiment=sentiment,
    probability=probability
)
```

---

## DASHBOARD METRICS

### Real-Time Experiment Status
```
┌─────────────────────────────────────────────────────┐
│ ACTIVE EXPERIMENTS (5)                              │
├─────────────────────────────────────────────────────┤
│ Experiment            │ Status    │ Progress │ ETA  │
├─────────────────────────────────────────────────────┤
│ exp_argue_roi_001     │ running   │ 78%      │ 3d   │
│ exp_argue_cost_001    │ running   │ 52%      │ 7d   │
│ exp_pricing_001       │ running   │ 45%      │ 10d  │
│ exp_action_whatsapp   │ running   │ 18%      │ 30d  │
│ exp_voice_consult     │ draft     │ 0%       │ -    │
└─────────────────────────────────────────────────────┘

WINNERS (This Month):
├─ exp_argue_roi_001   → ROI wins! +8.5% (p=0.023)
├─ exp_pricing_002     → $1500 wins! +12% revenue (p=0.011)
└─ exp_action_demo_001 → Demo wins! +6% conversion (p=0.042)

ROLLOUTS IN PROGRESS:
├─ Stage 1 (5%):  exp_argue_roi_001    [████████░] 4d remaining
├─ Stage 2 (25%): exp_pricing_002      [██████░░░] 7d remaining
└─ Stage 3 (100%): exp_action_demo_001 [Live]

REVENUE IMPACT:
Monthly cumulative: +18% (from all rolledout winners)
```

---

## TROUBLESHOOTING QUICK GUIDE

| Problem | Diagnosis | Fix |
|---------|-----------|-----|
| No samples collected | Target segment too narrow? | Expand segment, check if calls match |
| Sample rate low | Volume down? Tracking broken? | Check call volume, test tracking |
| Inconclusive results | Need more time/samples | Extend duration or increase MDE |
| Treatment worse | Algorithm error? Variant bad? | Check variant implementation, consider early stop |
| Rollout failed | Metric regressed > 2% | Investigate why, rollback, debug |
| MAB not converging | Wrong priors? | Reset alpha/beta, check feedback loop |

---

## MONTHLY CHECKLIST

- [ ] **Week 1**: Plan experiments for month
- [ ] **Week 2**: Analyze prior month results, update learnings doc
- [ ] **Week 3**: Monitor rollout progress, extend unsuccessful experiments
- [ ] **Week 4**: Generate monthly report, prep next month's launches
- [ ] **Any time**: Review safety guardrails, check early stopping rules

---

## CONTACTS & RESOURCES

**Implementation Help**:
- Framework Guide: `EXPERIMENTATION_FRAMEWORK_2026.md`
- Implementation: `EXPERIMENTATION_IMPLEMENTATION_GUIDE.md`
- Financial: `EXPERIMENTATION_ROI_ANALYSIS.md`
- Code: `app/experimentation_engine.py`, `app/experimentation_integration.py`

**Key People**:
- Framework Architect: [Name]
- Engineering Lead: [Name]
- Analytics/Data: [Name]

**Slack Channels**:
- #experiments (daily updates)
- #experimentation-framework (Q&A)
- #experiment-results (weekly analysis)

---

**Last Updated**: 2026-06-21  
**Version**: 1.0  
**Status**: Ready to Use
