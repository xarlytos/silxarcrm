# Experimentation Framework - Implementation Checklist
## Task-by-task execution guide (Copy & Paste into your project management tool)

**Status**: Ready to execute  
**Created**: 2026-06-21  
**Owner**: Engineering Lead  

---

## PHASE 0: APPROVAL & KICKOFF (Duration: 1-2 days)

### Approvals
- [ ] CEO approval (EXPERIMENTATION_EXECUTIVE_SUMMARY.md)
- [ ] VP Product approval (roadmap alignment)
- [ ] VP Engineering approval (resource commitment)
- [ ] CFO approval (budget $210K)
- [ ] Analytics lead approval (dashboard commitment)

### Team Alignment
- [ ] Schedule kickoff meeting (30 min)
  - Attendees: Engineering, Analytics, Product, Ops
  - Agenda: Review framework, assign owners, timeline
- [ ] Create Slack channel: #experimentation-framework
- [ ] Create Slack channel: #experiment-results
- [ ] Notify team of timeline (Week 1-6 roadmap)
- [ ] Distribute documentation links
  - EXPERIMENTATION_INDEX.md (navigation)
  - EXPERIMENTATION_QUICK_REFERENCE.md (technical team)
  - EXPERIMENTATION_EXECUTIVE_SUMMARY.md (leadership)

### Resource Allocation
- [ ] Backend engineer: 160 hours committed (Month 1)
- [ ] DevOps/Data engineer: 40 hours (infrastructure)
- [ ] Analytics: 20 hours (dashboard)
- [ ] Product manager: 5 hours (experiment prioritization)

---

## PHASE 1: WEEK 1 - FOUNDATION (Parallel work)

### Database & Infrastructure

**DevOps Task: Database Schema**
```
[ ] Connect to PostgreSQL instance
[ ] Run schema creation script:
    scripts/create_experiment_tables.sql
    - experiment_registry table
    - experiment_events table (append-only)
    - experiment_results table
    - rollout_schedule table
    - mab_state table
[ ] Create indexes on:
    - experiment_registry (status, start_date)
    - experiment_events (experiment_id, timestamp)
    - experiment_results (experiment_id)
    - rollout_schedule (experiment_id, stage)
    - mab_state (context)
[ ] Setup automated backups (daily)
[ ] Test: SELECT COUNT(*) FROM experiment_registry (should return 0)
```

**DevOps Task: Redis Setup**
```
[ ] Provision Redis instance (ElastiCache or self-managed)
[ ] Configure for 1M keys (experiment state cache)
[ ] Setup key expiration: 90 days
[ ] Test: redis-cli ping → should return PONG
[ ] Document Redis connection string
```

**DevOps Task: Monitoring & Observability**
```
[ ] Setup Datadog or CloudWatch metrics:
    - experiments_running (gauge)
    - experiments_completed_7d (counter)
    - experiments_won_7d (counter)
    - mab_exploration_rate (gauge)
    - revenue_lift_from_experiments (gauge)
[ ] Setup alerts:
    - No experiments running (indicates problem)
    - Early stopping triggered (notify immediately)
    - Metric regression > 5% during rollout (alert)
[ ] Create Looker/Metabase dashboard (see DASHBOARD_SPEC.md)
[ ] Test: Verify all metrics flow from app → monitoring system
```

### Backend: Framework Implementation

**Backend Task: ExperimentEngine Core**
```
[ ] Copy app/experimentation_engine.py into codebase
[ ] Install dependencies:
    - pip install scipy numpy pandas
    - pip install redis
[ ] Create app/__init__.py if needed
[ ] Unit tests:
    [ ] Test ExperimentConfig creation
    [ ] Test assign_variant() deterministic hashing
    [ ] Test track_event() appending
    [ ] Test t-test analysis
    [ ] Test Thompson Sampling sampling
    [ ] Test ε-Greedy selection
[ ] Run: pytest tests/test_experimentation_engine.py -v
[ ] Code review: Check for integration readiness
```

**Backend Task: Integration Layer**
```
[ ] Copy app/experimentation_integration.py into codebase
[ ] Create integration unit tests:
    [ ] Test select_argument_for_call()
    [ ] Test select_offer_with_experiment()
    [ ] Test select_next_action_with_experiment()
    [ ] Test record_argument_outcome()
[ ] Run: pytest tests/test_experimentation_integration.py -v
[ ] Code review for context correctness
```

**Backend Task: Database Connectors**
```
[ ] Implement ExperimentEngine.db methods:
    [ ] async def _save_experiment()
    [ ] async def _load_experiment()
    [ ] async def _get_events()
    [ ] async def _save_result()
[ ] Implement connection pooling (asyncpg)
[ ] Test: Create experiment → verify in database
[ ] Test: Insert events → verify in events table
```

### Analytics & Dashboard

**Analytics Task: Dashboard Setup**
```
[ ] Access Looker/Metabase instance
[ ] Create dashboard titled "Experimentation Framework"
[ ] Add panels:
    [ ] Active experiments (table, filtered on status='running')
    [ ] Experiment progress (% to min_sample_size)
    [ ] Daily sample collection rate
    [ ] Winners (completed experiments where winner != 'inconclusive')
    [ ] Revenue impact (sum of experiment_results.lift by month)
    [ ] MAB states (top arguments by success rate)
[ ] Create alerts:
    [ ] If no experiments running for 7 days
    [ ] If early stopping triggered
    [ ] If rollout metric drops > 2%
[ ] Share dashboard link in #experimentation-framework
[ ] Test: Manually insert test data, verify visualization
```

### Planning: Pilot Experiments

**Product Task: Design 4 Pilots**
```
Pilot #1: Argument Experiment
[ ] Confirm hypothesis: "ROI 3-month" closes 12% more than "Automation 80%"
[ ] Confirm segment: industry=retail, size 20-500
[ ] Confirm metrics: close_rate, engagement
[ ] Confirm duration: 14 days
[ ] Confirm min_sample_size: 400 per variant
[ ] Create ExperimentConfig in Python:
    experiment_id="exp_argue_roi_001"
    name="ROI Argument vs Automation"
    ...

Pilot #2: Objection Handling
[ ] Hypothesis: "Social proof rebuttal" overcomes "Es caro" 8% more
[ ] Segment: Only triggered when objection raised
[ ] Metrics: objection_overcome_rate
[ ] Duration: 21 days (longer, lower frequency)
[ ] min_sample_size: 100 per variant

Pilot #3: Offer Pricing
[ ] Hypothesis: "$1500 offer" has higher expected_revenue than "$1900"
[ ] Segment: lead_score < 70
[ ] Metrics: expected_revenue = offer_price × acceptance_rate
[ ] Duration: 14 days
[ ] min_sample_size: 350 per variant

Pilot #4: Next Action
[ ] Hypothesis: "Email 48h" converts 5% more than "WhatsApp 24h"
[ ] Segment: lead_score 30-70
[ ] Metrics: conversion_rate_30_days
[ ] Duration: 35 days (longest, waiting for 30-day conversion window)
[ ] min_sample_size: 600 per variant
```

### Documentation & Communication

**Comms Task: Internal Comms**
```
[ ] Post in #experimentation-framework:
    "Welcome to Groomly's Experimentation Framework!
    
    We're launching systematic A/B testing + Multi-Armed Bandits
    to optimize arguments, offers, and actions.
    
    Timeline: Week 1-6 (first results by Week 4)
    Expected: +$3.7M revenue in 6 months
    
    Key docs: EXPERIMENTATION_INDEX.md
    Questions: #experimentation-framework
    
    Week 1: Infrastructure + design ✓
    Week 2: Code + integration ✓
    Week 3: First experiments launch ✓
    Week 4: First results ✓"
[ ] Post weekly updates (every Friday)
[ ] Schedule weekly standups (15 min, sync progress)
```

---

## PHASE 2: WEEK 2 - IMPLEMENTATION & INTEGRATION

### Code Integration

**Backend Task: Conversation Intelligence Integration**
```
[ ] Open: app/conversation_intelligence.py
[ ] Add import:
    from app.experimentation_integration import ExperimentationIntegration
[ ] Modify __init__:
    self.exp_integration = exp_integration  # pass in
[ ] Modify get_winning_argument():
    OLD: playbook = await self.build_winning_arguments_playbook()
         return playbook[0].argument
    
    NEW: if self.exp_integration:
            return await self.exp_integration.select_argument_for_call(...)
        else:
            return playbook[0].argument
[ ] Test: verify calls to exp_integration
[ ] Code review
```

**Backend Task: Deal Engine Integration**
```
[ ] Open: app/deal_engine.py
[ ] Add import:
    from app.experimentation_integration import ExperimentationIntegration
[ ] Modify __init__:
    self.exp_integration = exp_integration
[ ] Modify get_best_offer():
    if self.exp_integration and active_pricing_experiment:
        return await self.exp_integration.select_offer_with_experiment(...)
    else:
        return existing_logic()
[ ] Test: mock active experiment, verify variant selection
[ ] Code review
```

**Backend Task: Coaching Engine Integration**
```
[ ] Open: app/coaching_engine.py
[ ] Add import:
    from app.experimentation_integration import ExperimentationIntegration
[ ] Modify __init__:
    self.exp_integration = exp_integration
[ ] Modify determine_next_action():
    if self.exp_integration:
        return await self.exp_integration.select_next_action_with_experiment(...)
    else:
        return existing_logic()
[ ] Test: mock MAB selection, verify action selection
[ ] Code review
```

**Backend Task: Post-Call Tracking**
```
[ ] Open: app/main.py or app/telephony/media_stream.py (wherever calls end)
[ ] Find: handle_call_completion() or similar
[ ] Add after analysis:
    if exp_integration:
        await exp_integration.track_call_in_experiments(
            call_id=call_id,
            transcript=transcript,
            outcome=outcome,
            prospect_profile=call_analysis.prospect_profile
        )
[ ] Test: verify events are inserted into database
[ ] Code review: ensure thread-safe, non-blocking
```

### Testing

**QA Task: Integration Tests**
```
[ ] Test: ExperimentEngine + Integration together
    [ ] Create experiment
    [ ] Assign variant to 100 calls (check consistency)
    [ ] Track events
    [ ] Analyze results
    [ ] Declare winner
    [ ] Verify database state
[ ] Test: ConversationIntelligence integration
    [ ] Call select_argument_for_call()
    [ ] Verify Thompson Sampling MAB is called
    [ ] Mock experiment, verify variant assigned
[ ] Test: DealEngine integration
    [ ] Call select_offer_with_experiment()
    [ ] Verify pricing experiment variant applied
[ ] Test: CoachingEngine integration
    [ ] Call select_next_action_with_experiment()
    [ ] Verify MAB selection
[ ] Load test: Process 1000 calls with experiment tracking
    [ ] Verify no latency regression
    [ ] Verify database handles event volume
```

### Automation Scripts

**DevOps Task: Create Monitoring Scripts**
```
[ ] Create: scripts/monitor_experiments.py
    [ ] Run daily (06:00 UTC)
    [ ] Check: sample collection rate
    [ ] Check: early stopping triggers
    [ ] Alert if problems found
    [ ] Log to monitoring system
[ ] Create: scripts/analyze_experiments.py
    [ ] Run weekly (Mon 06:00 UTC)
    [ ] Analyze all running experiments
    [ ] Run t-tests, calculate winners
    [ ] Generate reports
    [ ] Notify Slack
[ ] Create: scripts/rollout_automation.py
    [ ] Check for winner-ready experiments
    [ ] Start rollouts
    [ ] Manage stages (5% → 25% → 100%)
    [ ] Monitor rollout metrics
[ ] Create: scripts/generate_weekly_report.py
    [ ] Query database for results
    [ ] Calculate revenue impact
    [ ] Generate Slack message
    [ ] Email to leadership
```

### Documentation

**Docs Task: Implementation Runbook**
```
[ ] Document: How to run each script
[ ] Document: Database connection details
[ ] Document: Redis connection details
[ ] Document: Monitoring dashboard login
[ ] Document: Common issues & solutions
[ ] Document: Code integration points
[ ] Document: Logging & debugging
[ ] Share in Slack + wiki
```

---

## PHASE 3: WEEK 3 - PILOT EXPERIMENTS LAUNCH

### Pre-Launch Validation

**Product Task: Experiment Readiness Checklist**
```
For each pilot experiment:
[ ] Hypothesis is falsable (not vague)
[ ] Sample size calculated correctly
[ ] Duration is >= 7 days
[ ] Metric is well-defined and trackable
[ ] Variant assignment logic tested
[ ] Event tracking tested
[ ] Dashboard shows progress
[ ] Team understands the experiment
[ ] Monitoring is active
[ ] Rollback plan exists
```

### Launch Experiments

**Backend Task: Create Experiments in System**
```
[ ] For exp_argue_roi_001:
    [ ] Create ExperimentConfig in Python
    [ ] Call exp_engine.create_experiment(config)
    [ ] Verify in experiment_registry table
    [ ] Verify in dashboard

[ ] For exp_objection_caro_001:
    [ ] Create ExperimentConfig
    [ ] Create experiment
    [ ] Verify in database

[ ] For exp_pricing_1500_001:
    [ ] Create ExperimentConfig
    [ ] Create experiment
    [ ] Verify in database

[ ] For exp_action_email_001:
    [ ] Create ExperimentConfig
    [ ] Create experiment
    [ ] Verify in database

[ ] Final check:
    [ ] All 4 experiments status='running'
    [ ] All showing in dashboard
    [ ] Event tracking is flowing
```

### Go-Live Procedures

**Ops Task: Launch & Monitor**
```
[ ] Morning of launch (07:00 UTC):
    [ ] Verify all systems operational
    [ ] Double-check experiment configs
    [ ] Clear any alerts
    [ ] Prepare Slack message
[ ] At launch (08:00 UTC):
    [ ] Publish experiments live
    [ ] Announce in #experimentation-framework
    [ ] Message: "4 pilot experiments LIVE!"
    [ ] Provide dashboard link
[ ] Throughout day:
    [ ] Monitor: Sample collection
    [ ] Monitor: Variant assignment
    [ ] Monitor: Database growth
    [ ] Alert if anything wrong
[ ] EOD report:
    [ ] Sample counts by experiment
    [ ] Any issues encountered
    [ ] Plan for Week 4
```

### Daily Monitoring (Week 3)

**Ops Task: Daily Checks (06:00-18:00 UTC)**
```
[ ] 06:00: Run monitor_experiments.py
    [ ] Check: samples being collected
    [ ] Check: no early stopping triggers
    [ ] Alert if rate is < 50% of expected
[ ] 12:00: Mid-day check
    [ ] Verify: experiments still running
    [ ] Verify: no errors in logs
    [ ] Verify: database size growing normally
[ ] 18:00: EOD summary
    [ ] Document: daily sample counts
    [ ] Document: any issues
    [ ] Plan: next day actions
```

---

## PHASE 4: WEEK 4 - FIRST RESULTS & ANALYSIS

### Analysis Phase

**Analytics Task: Weekly Analysis Automation**
```
[ ] Run at Mon 06:00 UTC:
    [ ] scripts/analyze_experiments.py
    [ ] For each running experiment:
        [ ] Count events by variant
        [ ] Run t-test (scipy.stats.ttest_ind)
        [ ] Calculate 95% CI
        [ ] Calculate power
        [ ] Calculate effect size (Cohen's d)
        [ ] Apply decision rules:
            - If p < 0.05 + lift >= MDE → WINNER
            - If 0.05 < p < 0.15 + power > 0.70 → BORDERLINE
            - Else → INCONCLUSIVE
[ ] Document results in database
[ ] Generate report
```

### Results Reporting

**Analytics Task: Generate Report**
```
[ ] For each completed/decided experiment:
    [ ] Experiment name
    [ ] Control variant: n, metric, 95% CI
    [ ] Treatment variant: n, metric, 95% CI
    [ ] Lift: (treatment - control) / control
    [ ] P-value
    [ ] Winner (if any)
    [ ] Confidence (HIGH/MEDIUM/LOW)
    [ ] Reasoning
[ ] Format as Slack message
[ ] Send to #experiment-results
[ ] Email to leadership
[ ] Update dashboard
```

### Winner Declaration & Rollout

**Backend Task: Auto-Rollout for Winners**
```
[ ] For each winner:
    [ ] Call exp_engine.declare_winner_and_start_rollout()
    [ ] Update experiment status → "rolled_out"
    [ ] Start rollout_schedule entry
    [ ] Set stage = 1 (5% traffic)
    [ ] Set rollout_winner = winning variant
[ ] Verify:
    [ ] Database updated
    [ ] Dashboard shows rollout progress
    [ ] Monitoring alerts setup for rollout health
```

### Postmortem

**Team Task: Week 4 Postmortem**
```
[ ] Friday 15:00 UTC - 30 min meeting
[ ] Agenda:
    [ ] What went well?
    [ ] What went wrong?
    [ ] What did we learn?
    [ ] Adjustments for Month 2?
[ ] Document findings
[ ] Plan Month 2 experiments
```

---

## PHASE 5: MONTHS 2-6 - SCALING & OPTIMIZATION

### Month 2: Velocity Increase

**Engineering Task**
```
[ ] Month 2 Week 1:
    [ ] Design 4 new experiments (based on Month 1 learnings)
    [ ] Add Thompson Sampling integration
    [ ] Add ε-Greedy integration
    [ ] More parallel experiments (8 total)
    
[ ] Month 2 Week 2-3:
    [ ] Launch new experiments
    [ ] Monitor rollouts from Month 1
    [ ] Analyze results
    
[ ] Month 2 Week 4:
    [ ] 3-5 winners expected
    [ ] Start Stage 2 rollouts (25% traffic)
    [ ] Plan Month 3 experiments
```

### Month 3: Contextual Learning

**Engineering Task**
```
[ ] Activate Thompson Sampling (arguments by context)
[ ] Activate ε-Greedy (actions)
[ ] 10-12 experiments running
[ ] Segment-specific experiments
[ ] Expected: +10% cumulative lift
```

### Months 4-6: Automation & Scale

**Engineering Task**
```
[ ] Fully automated A/B test pipeline
[ ] Auto-decisions (no human bottleneck)
[ ] 12-16 experiments/month
[ ] Expected: +22% cumulative lift by end
```

---

## CRITICAL PATHS & DEPENDENCIES

```
CRITICAL PATH (Must be done in order):
1. Database schema created (blocks: everything else)
2. ExperimentEngine code ready (blocks: integration)
3. Integration with conversation flow (blocks: launch)
4. Monitoring setup (blocks: safe operation)
5. Dashboard operational (blocks: visibility)

PARALLEL TRACKS (Can happen simultaneously):
- Database setup
- Redis setup
- Monitoring setup
- Backend code implementation
- Dashboard setup
- Pilot experiment design
```

---

## SUCCESS CRITERIA (End of Week 4)

- [ ] All infrastructure operational (database, Redis, monitoring)
- [ ] ExperimentEngine code deployed and tested
- [ ] Integration with conversation flow complete
- [ ] 4 pilot experiments running
- [ ] Event tracking flowing correctly
- [ ] Dashboard showing real-time progress
- [ ] At least 1 winner declared
- [ ] Rollout Stage 1 started
- [ ] Revenue impact visible ($50K+)
- [ ] Team trained and confident
- [ ] Weekly analysis automated
- [ ] Communication channels active
- [ ] Monitoring alerts working
- [ ] Next month experiments planned

---

## GO/NO-GO CHECKPOINTS

### Week 1 End
- [ ] Is infrastructure ready? → If NO: extend Week 1
- [ ] Is code ready? → If NO: split to Week 2
- [ ] Are pilots designed? → If NO: extend planning

### Week 2 End
- [ ] Is integration working? → If NO: debug, don't launch
- [ ] Are tests passing? → If NO: fix before launch
- [ ] Is monitoring ready? → If NO: add before launch

### Week 3 End
- [ ] Are experiments running? → If NO: troubleshoot
- [ ] Are samples collecting? → If NO: check targeting
- [ ] Is dashboard showing data? → If NO: verify tracking

### Week 4 End
- [ ] Do we have early results? → If NO: extend to Week 5
- [ ] Is at least one experiment conclusive? → If NO: extend duration
- [ ] Is revenue impact visible? → If NO: re-evaluate assumptions

---

## RESOURCE BURNDOWN

```
Week 1: Full team engaged
├─ Backend: 40 hours
├─ DevOps: 20 hours
├─ Analytics: 15 hours
└─ Product: 10 hours

Week 2: Full team engaged
├─ Backend: 40 hours
├─ DevOps: 10 hours
├─ Analytics: 15 hours
└─ Product: 10 hours

Week 3: Operations focused
├─ Backend: 30 hours
├─ DevOps: 5 hours
├─ Analytics: 10 hours
└─ Product: 5 hours

Week 4: Analysis focused
├─ Backend: 20 hours
├─ DevOps: 2 hours
├─ Analytics: 15 hours
└─ Product: 10 hours

Month 2-6: Steady state
├─ Backend: 15 hours/week (ongoing optimization)
├─ DevOps: 2 hours/week (maintenance)
├─ Analytics: 10 hours/week (weekly analysis + reports)
└─ Product: 5 hours/week (experiment design)
```

---

## SIGN-OFF CHECKPOINTS

- [ ] **Leadership**: Approves $210K investment
- [ ] **Engineering**: Commits resources
- [ ] **Analytics**: Owns dashboard
- [ ] **Product**: Owns experiment design
- [ ] **Ops**: Ready to monitor

---

**Status**: READY TO EXECUTE  
**Estimated Duration**: 4 weeks to first results  
**Expected ROI**: 17.5x (6 months)  
**Next Step**: Copy this checklist into your project management tool (Jira, Asana, etc) and start Week 1
