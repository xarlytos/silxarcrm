# Multi-Armed Bandits - Quick Reference

## In 30 Seconds

**What**: Test 8 opening discovery questions in parallel. System automatically learns which ones close best, uses winners more often.

**How**: Thompson Sampling - Bayesian algorithm that balances "trying things" vs "using what works"

**Result**: +6% close rate improvement in 5-7 days

**5 Arguments Tested**:
1. "Tell me about your current sales process"
2. "What are your biggest pain points"
3. "How much time on follow-ups?"
4. "What would be biggest benefit of automation?"
5. "Are you using call recording tools?"

---

## API Quick Reference

### Check Status
```bash
curl http://localhost:8000/ml/mab/status
# Returns: All arguments, close rates, alpha/beta params
```

### Get Weekly Report
```bash
curl http://localhost:8000/ml/mab/weekly-report
# Returns: Best argument, close rate, learnings, recommendations
# Example: "arg_001: 72% close rate - WINNER"
```

### View All Arguments
```bash
curl http://localhost:8000/ml/mab/arguments
# Returns: Sorted by close rate (highest first)
```

### View One Argument
```bash
curl http://localhost:8000/ml/mab/arguments/arg_001
# Returns: Detailed stats, confidence interval, history
```

### Record Call Outcome (post-call)
```bash
curl -X POST "http://localhost:8000/ml/mab/record-call?call_id=c123&arm_id=arg_001&outcome=close"
# Returns: Updated stats for that argument
```

---

## Python Integration

### Initialize (on startup)
```python
from app.mab_integration import initialize_mab

mab = initialize_mab()
# Registers 8 default arguments
```

### Select Opening Argument (voice_webhook)
```python
from app.mab_integration import select_opening_argument

arm_id, argument, prompt_injection = await select_opening_argument({
    'call_id': 'call_123',
    'phone': '+1234567890'
})

# Use prompt_injection in agent system prompt
```

### Record Call Result (post-call)
```python
from app.mab_integration import record_call_result

await record_call_result(
    call_id='call_123',
    arm_id='arg_001',  # Which argument was used
    outcome='close',    # or 'no_close'
    duration_seconds=180
)
```

### Get Weekly Report (email/dashboard)
```python
from app.mab_integration import get_weekly_report

report = await get_weekly_report()
print(f"Best this week: {report['best_argument']}")
print(f"Close rate: {report['best_argument_close_rate']}")
print(f"Recommendations: {report['recommendations']}")
```

---

## Understanding Thompson Sampling

### Math (1 minute version)

Each argument has a **Beta distribution** (α, β):
- α = successes + 1
- β = failures + 1

Example after 5 successful closes, 3 failures:
```
Beta(6, 4) - slightly favors success
```

Example after 2 closes, 8 failures:
```
Beta(3, 9) - heavily favors failure
```

Each call:
1. Sample from each argument's Beta(α, β)
2. Pick argument with highest sample
3. Run call with that argument
4. Record outcome (close/no-close)
5. Update that argument's Beta distribution
6. Repeat

**Result**: Winning arguments get sampled higher more often, naturally shifting traffic.

---

## Metrics to Watch

| Metric | Good Value | Meaning |
|--------|-----------|---------|
| Total Calls | >30 per arg | Enough data |
| Best Close Rate | >7% (baseline 3-4%) | Argument is winning |
| Confidence Interval | Narrow (<5%) | We're confident |
| Variance | 0.003-0.01 | Arguments differ |

---

## Weekly Report Interpretation

### Example Report
```json
{
  "week_ending": "2025-06-29",
  "total_calls": 127,
  "overall_close_rate": "7.1%",
  "best_argument": "Tell me about your current sales process?",
  "best_argument_close_rate": "8.7%",
  "learnings": [
    "Best arg: arg_001 (8.7%, 23 uses)",
    "Top 3: arg_001(8.7%), arg_004(7.2%), arg_005(6.1%)"
  ],
  "recommendations": [
    "Increase weight of arg_001",
    "Consider retiring arg_008 (2.3%)"
  ]
}
```

### What This Means
- **127 calls** this week with MAB enabled
- **7.1% close rate** - baseline was ~3.5%, so +2% improvement
- **arg_001 is winner** - 8.7% close rate (23 uses)
- **arg_004, arg_005** - next best (7.2%, 6.1%)
- **Recommendation**: Use arg_001 more often

---

## Default Arguments (What We're Testing)

| ID | Question | Type |
|----|----------|------|
| arg_001 | "Tell me about your current sales process?" | Discovery |
| arg_002 | "What are your biggest pain points?" | Pain Discovery |
| arg_003 | "How much time on follow-ups per week?" | Quantification |
| arg_004 | "Biggest benefit of automation?" | Value Prop |
| arg_005 | "Using call recording tools?" | Qualification |
| arg_006 | "Tell me about last sales call?" | Narrative |
| arg_007 | "How measure sales success?" | Metrics |
| arg_008 | "What prevents closing more?" | Obstacle |

---

## Timeline Expectations

### Days 1-2
- All arguments used ~equally
- No clear winner yet
- Confidence intervals very wide

### Days 3-5
- Patterns emerging
- 1-2 arguments getting more traffic
- Confidence narrowing

### Days 6-7+ 
- Clear winner (50-60% of calls)
- Other arguments still explored (40-50%)
- Tight confidence intervals
- **+6% improvement visible**

---

## File Locations

| File | Purpose |
|------|---------|
| `app/mab_argument_engine.py` | Core Thompson Sampling algorithm |
| `app/mab_integration.py` | Integration with call system |
| `app/ml/mab_routes.py` | REST API endpoints |
| `MAB_IMPLEMENTATION_GUIDE.md` | Full documentation |
| `MAB_QUICK_REFERENCE.md` | This file |

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| All calls same argument | Working correctly once winner emerges |
| Close rate not improving | Need more data (30+ calls per arg) |
| No endpoints found | Verify routes included in ml/router.py |
| Outcomes not recording | Check that record_call_result() is called |

---

## Key Terms

- **Arm**: One opening argument being tested
- **Thompson Sampling**: Algorithm that picks arms based on probability of success
- **Beta Distribution**: Probability model for "success rate" of each arm
- **Alpha (α)**: Successes + 1
- **Beta (β)**: Failures + 1
- **Confidence Interval**: Range where true close rate probably is
- **Exploration**: Trying arms that might work
- **Exploitation**: Using arms we know work

---

## Performance Target

**Baseline**: 3.5% close rate (typical for sales calls)
**Target**: 3.5% + 6% = **3.7% absolute** or **+17% relative**

**By Week 2-3**: Should see +6% improvement if arguments truly differentiate

---

## Customization

### Change Arguments
Edit `app/mab_integration.py` → `initialize_mab()` function

### Change Algorithm Parameters
Edit `app/mab_argument_engine.py` → `BayesianArm` class:
```python
self.alpha = 1.0  # Change prior
self.beta = 1.0
```

### Change Persistence Location
```python
mab = MultiArmedBanditsEngine(persistence_path="/custom/path")
```

---

## Next Steps

1. **Review**: Read `MAB_IMPLEMENTATION_GUIDE.md` for full details
2. **Integrate**: Update voice_webhook and post-call processing
3. **Test**: Run test suite with `pytest app/tests/test_mab_argument_engine.py`
4. **Monitor**: Check `/ml/mab/status` daily
5. **Report**: Get `/ml/mab/weekly-report` every Friday
6. **Optimize**: Retire low-performers, test new arguments

---

## Questions?

- API not responding? → Check `/ml/mab/health`
- Outcomes not recording? → Verify call_id and arm_id match
- What's the best argument? → Check `/ml/mab/weekly-report`
- Export for analysis? → Use `/ml/mab/export`

**Support**: See `MAB_IMPLEMENTATION_GUIDE.md` Troubleshooting section
