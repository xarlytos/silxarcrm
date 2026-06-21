# 🚀 DEPLOYMENT PLAN: 6 Mejoras - Fase por Fase

**Status**: 🟢 LISTO PARA DEPLOYMENT  
**Timeline**: 3-4 semanas  
**Risk Level**: 🟡 MEDIUM (DB + APIs requieren setup)

---

## 📋 FASE 0: Pre-Deployment (Semana 1)

### Setup Infraestructura

- [ ] **Supabase**
  ```bash
  # 1. Crear cuenta en supabase.com
  # 2. Copiar SQL schemas desde SETUP_SUPABASE_SCHEMAS.sql
  # 3. Ejecutar en SQL editor
  # 4. Obtener credentials (URL + anon key)
  ```

- [ ] **Twilio (WhatsApp + SMS)**
  ```bash
  # 1. Crear cuenta en twilio.com
  # 2. Habilitar WhatsApp Business Account
  # 3. Obtener: Account SID, Auth Token, WhatsApp #, SMS #
  # 4. Guardar en .env
  ```

- [ ] **SendGrid (Email)**
  ```bash
  # 1. Crear cuenta en sendgrid.com
  # 2. Verificar dominio (groomly.com)
  # 3. Generar API Key
  # 4. Guardar en .env
  ```

### Environment Variables

```bash
# .env (desarrollo)
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_KEY=eyJh...

TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
TWILIO_WHATSAPP_NUMBER=+1234567890
TWILIO_SMS_NUMBER=+1234567890

SENDGRID_API_KEY=SG....
SENDGRID_FROM_EMAIL=noreply@groomly.com

# Logging
LOG_LEVEL=DEBUG
```

### Validación

```bash
python -m tests.test_six_improvements
# ✅ All tests passed
```

---

## 📊 FASE 1: Core Improvements (Semana 2)

### Mejora 1 + 2: Prospect Profile + Deal Engine

**Cambios en `hybrid_session.py`**:
```python
# Al init
from app.six_improvements_integration_hybrid import HybridSessionWith6Improvements

class HybridSession:
    def __init__(self, ...):
        # ... existing code ...
        self.improvements = HybridSessionWith6Improvements(
            db_client=supabase_client,
            twilio_client=twilio_client,
            sendgrid_client=sendgrid_client
        )
    
    async def on_call_start(self):
        await self.improvements.on_call_start(
            prospect_id=self.ctx.prospect_id,
            metadata={...}
        )
```

**Testing**:
- [ ] Profile extraction from transcript ✓
- [ ] Deal recommendation logic ✓
- [ ] Supabase read/write ✓

**Rollout**:
- [ ] Deploy to staging
- [ ] Test with 100 demo calls
- [ ] Monitor performance

**Success Criteria**:
- Profile confidence >= 50% on Call 2
- Deal close rate >= baseline + 10%

---

## 🤖 FASE 2: Automation (Semana 2.5)

### Mejora 3: Coaching Automático

**Integración**:
```python
# On call end
async def on_call_end(self, transcript, outcome):
    analysis = await self.improvements.process_post_call_analysis(
        call_id=self.ctx.call_sid,
        transcript=transcript,
        outcome=outcome
    )
    # Analysis contiene: lead_score, next_action
```

**Testing**:
- [ ] Lead score accuracy ✓
- [ ] Sentiment detection ✓
- [ ] Next action routing ✓

**Rollout**:
- [ ] Deploy with Coaching
- [ ] Monitor lead scores
- [ ] Validate next actions

---

## 📱 FASE 3: Multicanal (Semana 3)

### Mejora 5: Multicanal Orchestrator

**Integración**:
```python
# En on_call_end
next_action = analysis.post_call_analysis.next_action
await self.improvements.execute_follow_up_action(
    prospect_id=self.ctx.prospect_id,
    next_action=next_action.__dict__
)
```

**Canales Priority**:
1. WhatsApp (Twilio) → 70% preference
2. Email (SendGrid) → 20% fallback
3. SMS (Twilio) → 10% fallback

**Testing**:
- [ ] WhatsApp delivery ✓
- [ ] Email open tracking ✓
- [ ] SMS character limits ✓

**Rollout**:
- [ ] Start with Email only (safest)
- [ ] Add WhatsApp after 1 week
- [ ] Monitor delivery rates

---

## 🧠 FASE 4: Intelligence + Learning (Semana 4)

### Mejora 4 + 6: Conversation Intelligence + Revenue Optimizer

**Implementación**:
```python
# Post-call analysis
moments = await self.improvements.conversation_intel.extract_insights_from_call(
    call_id=call_id,
    transcript=transcript,
    outcome=outcome
)

# Playbook generation (cron job daily)
playbooks = await self.improvements.update_playbooks_from_learnings(
    industry="tech",
    company_size=50
)
```

**Cron Jobs**:
```python
# Daily: Update playbooks
# Hourly: Calculate metrics
# Weekly: Generate reports
```

**Testing**:
- [ ] Moment extraction ✓
- [ ] Playbook accuracy ✓
- [ ] Profit optimization ✓

---

## 🎯 PHASE 5: Go Live (Semana 4+)

### Pre-Launch

- [ ] Database backup
- [ ] Rollback plan ready
- [ ] Monitoring dashboard live
- [ ] Team training completed

### Launch Timeline

```
T-0:00 → Deploy to production (blue-green)
T+0:30 → Monitor error rates (target: < 0.5%)
T+2:00 → Monitor close rates (expect +5% day 1)
T+1 week → Monitor payback (expect 2-3 months)
```

### Kill Switches

```python
# If close rate DROPS, disable immediately:
DISABLE_DEAL_ENGINE = False  # Stop using DealEngine
DISABLE_MULTICANAL = False   # Stop sending follow-ups
DISABLE_COACHING = False     # Stop auto-scoring
```

---

## 📊 SUCCESS METRICS

### Week 1-2 (Foundation)
- ✅ Profile accuracy >= 50% confidence
- ✅ Zero database errors
- ✅ Call end time + 200ms (latency)

### Week 3-4 (Full System)
- ✅ Close rate 40% → 50% (+25%)
- ✅ Follow-up delivery >= 95%
- ✅ Open rate >= 30%

### Month 1 (Production)
- ✅ Close rate 50-55%
- ✅ ROI tracking
- ✅ All 6 improvements live

---

## 🛠️ TROUBLESHOOTING

### "Profile not loading"
```
1. Check Supabase connection
2. Verify prospect exists in DB
3. Check logs: logger.error(f"Profile load failed: {e}")
```

### "Deal Engine confidence too low"
```
1. Need 20+ historical deals to be confident
2. Use defaults until data accumulates
3. Monitor: sample_size in deals table
```

### "WhatsApp not sending"
```
1. Verify Twilio credentials in .env
2. Check phone number format (+34...)
3. Monitor: Twilio logs + dashboard
4. Fallback to email automatically
```

### "Playbook not updating"
```
1. Check cron job is running
2. Verify conversation_moments are logged
3. Monitor: updated_at timestamp in playbooks
4. Manual refresh: pytest fixtures
```

---

## 💰 COST ESTIMATES

| Component | Service | Est. Cost/Month |
|-----------|---------|-----------------|
| Database | Supabase | $25 (starter) |
| WhatsApp | Twilio | $0.01 per msg × 5k = $50 |
| SMS | Twilio | $0.01 per msg × 1k = $10 |
| Email | SendGrid | $10 (free tier sufficient) |
| **TOTAL** | | **~$95/month** |

**ROI**: Break-even in Month 1 (1 additional deal = $300+)

---

## 🚨 RISKS + MITIGATIONS

| Risk | Impact | Mitigation |
|------|--------|-----------|
| DB down | No profiles/deals | Failover to defaults |
| Twilio API down | No follow-ups | Queue + retry hourly |
| Low profile confidence | Bad offers | Use baselines until confident |
| Latency spike | Slow calls | Cache playbooks locally |

---

## 📋 FINAL CHECKLIST

### Before Deployment

- [ ] All tests pass: `pytest tests/test_six_improvements.py`
- [ ] Supabase schemas created
- [ ] Twilio + SendGrid credentials verified
- [ ] Environment variables set
- [ ] Logging configured
- [ ] Rollback plan documented
- [ ] Team trained

### Day 1

- [ ] Monitor error rates
- [ ] Monitor close rates
- [ ] Check database performance
- [ ] Verify follow-ups are sending

### Week 1

- [ ] Analyze initial data
- [ ] Adjust if needed
- [ ] Document learnings

---

## 📞 ESCALATION

**Issues**: Slack channel #llamadas-6-mejoras  
**Performance**: Dashboard → `app/dashboard_metrics.py`  
**Rollback**: Git tag + `git revert`

---

**Status**: 🟢 Ready for Phase 0 (Pre-Deployment)  
**Next Step**: Setup Supabase + APIs  
**ETA**: Go live in 3-4 weeks

