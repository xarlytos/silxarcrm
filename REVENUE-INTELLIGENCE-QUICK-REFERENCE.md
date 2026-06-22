# REVENUE INTELLIGENCE — QUICK REFERENCE GUIDE
## Copy-Paste Checklist + Key Formulas

---

## 1. DATABASE: SQL TO EXECUTE

Copy-paste directly into PostgreSQL:

```sql
-- ============================================================
-- REVENUE INTELLIGENCE SCHEMA
-- Execute once, supports 1000s of deals
-- ============================================================

-- Create extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Core deals table
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  software_id VARCHAR(255) NOT NULL,
  nombre VARCHAR(500) NOT NULL,
  descripcion TEXT,
  monto NUMERIC(12,2) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'EUR',
  stage VARCHAR(50) NOT NULL DEFAULT 'PROSPECT' CHECK (stage IN (
    'PROSPECT', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'NEGOTIATION', 
    'CLOSING', 'WON', 'LOST'
  )),
  probabilidad_cierre INT NOT NULL DEFAULT 25 CHECK (probabilidad_cierre >= 0 AND probabilidad_cierre <= 100),
  fecha_cierre_estimada TIMESTAMP,
  fecha_cierre_final TIMESTAMP,
  health_score INT NOT NULL DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  ultima_actividad_at TIMESTAMP,
  motivo_cierre VARCHAR(500),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX idx_deal_lead ON deals(lead_id);
CREATE INDEX idx_deal_software ON deals(software_id);
CREATE INDEX idx_deal_stage ON deals(stage);
CREATE INDEX idx_deal_prob ON deals(probabilidad_cierre);
CREATE INDEX idx_deal_health ON deals(health_score);
CREATE INDEX idx_deal_cierre_est ON deals(fecha_cierre_estimada);

-- Activities
CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('CALL', 'EMAIL', 'WHATSAPP', 'DEMO', 'MEETING', 'PROPOSAL')),
  canal VARCHAR(50),
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duracion_seg INT,
  resultado VARCHAR(50),
  resumen TEXT,
  transcript TEXT,
  external_id VARCHAR(255),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_act_deal ON deal_activities(deal_id);
CREATE INDEX idx_act_fecha ON deal_activities(fecha_hora);
CREATE INDEX idx_act_deal_fecha ON deal_activities(deal_id, fecha_hora DESC);

-- Analysis
CREATE TABLE deal_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL UNIQUE REFERENCES deals(id) ON DELETE CASCADE,
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('OPEN', 'WON', 'LOST')),
  motivo_primario VARCHAR(255),
  motivo_secundario VARCHAR(255),
  lecciones TEXT,
  factores_clave TEXT[],
  calls_count INT DEFAULT 0,
  emails_count INT DEFAULT 0,
  demos_count INT DEFAULT 0,
  velocidad_cierre INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ana_deal ON deal_analyses(deal_id);
CREATE INDEX idx_ana_estado ON deal_analyses(estado);

-- Snapshots (for trending)
CREATE TABLE health_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  health_score INT NOT NULL,
  probability INT NOT NULL,
  risk_level VARCHAR(50),
  activities_7d INT,
  days_no_activity INT,
  days_in_stage INT,
  snapshot_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_snap_deal ON health_snapshots(deal_id);
CREATE INDEX idx_snap_at ON health_snapshots(snapshot_at);

-- Forecasts
CREATE TABLE revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  software_id VARCHAR(255) NOT NULL,
  mes VARCHAR(7) NOT NULL,
  expected_revenue NUMERIC(12,2) NOT NULL,
  best_case NUMERIC(12,2) NOT NULL,
  worst_case NUMERIC(12,2) NOT NULL,
  deals_count INT,
  deals_won INT,
  deals_lost INT,
  confidence FLOAT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(software_id, mes)
);

CREATE INDEX idx_rev_software_mes ON revenue_snapshots(software_id, mes);

-- ✅ DONE! Tables ready.
```

---

## 2. KEY FORMULAS

### Deal Probability Calculation

```javascript
// Copy-paste into Node.js/TypeScript

function calculateProbability(deal, activities) {
  const stageProbability = {
    'PROSPECT': 20,
    'DEMO_SCHEDULED': 35,
    'DEMO_COMPLETED': 50,
    'NEGOTIATION': 75,
    'CLOSING': 90,
    'WON': 100,
    'LOST': 0,
  };
  
  let prob = stageProbability[deal.stage] || 20;
  
  // Activity boost
  if (activities.length >= 3) prob *= 1.2;
  else if (activities.length === 0) prob *= 0.7;
  
  // Time penalty
  const daysInStage = (Date.now() - deal.updated_at) / (1000 * 60 * 60 * 24);
  if (daysInStage > 45) prob *= 0.6;
  else if (daysInStage > 30) prob *= 0.8;
  
  // ICP bonus (if lead matches ideal profile)
  if (deal.lead.empresa && deal.lead.cargo) prob *= 1.15;
  
  return Math.min(Math.max(Math.round(prob), 0), 100);
}
```

### Deal Health Score Calculation

```javascript
function calculateHealthScore(deal, activities) {
  let score = 100;
  
  // No activity penalty
  const daysNoAct = (Date.now() - deal.ultima_actividad_at) / (1000 * 60 * 60 * 24);
  score -= Math.min(daysNoAct * 5, 50);
  
  // Time in stage
  const daysInStage = (Date.now() - deal.updated_at) / (1000 * 60 * 60 * 24);
  if (daysInStage > 14) score -= Math.min((daysInStage - 14) * 2, 40);
  
  return Math.max(score, 0);
}
```

### Revenue Forecast Query

```sql
-- Copy-paste into PostgreSQL

SELECT
  d.stage,
  COUNT(*) as deals,
  SUM(d.monto) as total_value,
  AVG(d.probabilidad_cierre) as avg_prob,
  SUM(d.monto * d.probabilidad_cierre / 100) as expected_revenue
FROM deals d
WHERE d.software_id = 'YOUR_SOFTWARE_ID'
  AND d.stage NOT IN ('LOST', 'PROSPECT')
  AND d.fecha_cierre_estimada BETWEEN 
    DATE_TRUNC('month', NOW()) 
    AND DATE_TRUNC('month', NOW()) + INTERVAL '1 month'
GROUP BY d.stage
ORDER BY 
  CASE WHEN d.stage = 'DEMO_SCHEDULED' THEN 1
       WHEN d.stage = 'DEMO_COMPLETED' THEN 2
       WHEN d.stage = 'NEGOTIATION' THEN 3
       WHEN d.stage = 'CLOSING' THEN 4
       ELSE 5
  END;
```

### At-Risk Deals (Health < 50)

```sql
SELECT
  d.id,
  d.nombre,
  d.lead_id,
  d.monto,
  d.health_score,
  DATEDIFF(day, d.ultima_actividad_at, NOW()) as days_no_activity,
  d.stage,
  d.probabilidad_cierre
FROM deals d
WHERE d.software_id = 'YOUR_SOFTWARE_ID'
  AND d.health_score < 50
  AND d.stage NOT IN ('WON', 'LOST')
ORDER BY d.health_score ASC;
```

---

## 3. API ENDPOINTS (Quick Deploy)

### POST /api/deals (Create Deal)

```bash
curl -X POST http://localhost:5000/api/deals \
  -H "Content-Type: application/json" \
  -d '{
    "leadId": "lead-123",
    "nombre": "Veterinaria Luna",
    "monto": 10000,
    "moneda": "EUR",
    "fechaCierreEstimada": "2026-07-15T00:00:00Z"
  }'
```

### POST /api/deals/{id}/activities (Log Activity)

```bash
curl -X POST http://localhost:5000/api/deals/deal-456/activities \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "CALL",
    "canal": "PHONE",
    "resultado": "CONNECTED",
    "resumen": "Interesado en demo, agendar próxima semana",
    "duracion": 900
  }'
```

### GET /api/forecast/{month}

```bash
curl http://localhost:5000/api/forecast/2026-06?softwareId=software-1
```

Response:
```json
{
  "month": "2026-06",
  "expectedRevenue": 45000,
  "bestCase": 55000,
  "worstCase": 30000,
  "confidence": 0.72,
  "dealsCount": 8,
  "byStage": {
    "DEMO_COMPLETED": 5000,
    "NEGOTIATION": 20000,
    "CLOSING": 20000
  }
}
```

---

## 4. CRON JOBS (Copy-Paste)

### Probability Update (Daily 2 AM)

```typescript
// backend/src/jobs/probabilityUpdateJob.ts

import * as schedule from 'node-schedule';

schedule.scheduleJob('0 2 * * *', async () => {
  const deals = await prisma.deal.findMany({ where: { stage: { not: 'LOST' } } });
  
  for (const deal of deals) {
    const activities = await prisma.dealActivity.findMany({
      where: { dealId: deal.id, fechaHora: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } }
    });
    
    const newProb = calculateProbability(deal, activities);
    const newHealth = calculateHealthScore(deal, activities);
    
    await prisma.deal.update({
      where: { id: deal.id },
      data: { probabilidadCierre: newProb, healthScore: newHealth }
    });
  }
});
```

### At-Risk Alerts (Hourly)

```typescript
schedule.scheduleJob('0 * * * *', async () => {
  const atRisk = await prisma.deal.findMany({
    where: { healthScore: { lt: 50 } },
    include: { lead: true }
  });
  
  for (const deal of atRisk) {
    // Send Slack alert
    await fetch(process.env.SLACK_WEBHOOK, {
      method: 'POST',
      body: JSON.stringify({
        text: `🔴 Deal at risk: ${deal.nombre} (€${deal.monto}) - Health ${deal.healthScore}/100`
      })
    });
  }
});
```

### Forecast Generation (Daily 6 AM)

```typescript
schedule.scheduleJob('0 6 * * *', async () => {
  const softwares = await prisma.software.findMany();
  const month = new Date().toISOString().slice(0, 7);
  
  for (const software of softwares) {
    const forecast = await calculateForecast(software.id, month);
    await prisma.revenueSnapshot.upsert({
      where: { softwareId_mes: { softwareId: software.id, mes: month } },
      update: forecast,
      create: { ...forecast, softwareId: software.id, mes: month }
    });
  }
});
```

---

## 5. FRONTEND COMPONENT (Copy-Paste)

### DealsBoard Component

```tsx
// frontend/src/components/DealsBoard.tsx

'use client';
import { useEffect, useState } from 'react';

export function DealsBoard() {
  const [deals, setDeals] = useState([]);
  
  useEffect(() => {
    fetch('/api/deals?stage=NEGOTIATION')
      .then(r => r.json())
      .then(setDeals);
  }, []);
  
  const atRisk = deals.filter(d => d.healthScore < 50);
  
  return (
    <div className="space-y-4">
      {atRisk.length > 0 && (
        <div className="bg-red-100 p-4 rounded">
          <p className="font-bold">⚠️ {atRisk.length} deals at risk</p>
        </div>
      )}
      
      <div className="grid grid-cols-3 gap-4">
        {deals.map(deal => (
          <div key={deal.id} className="border rounded p-4">
            <h3 className="font-bold">{deal.nombre}</h3>
            <p>€{deal.monto}</p>
            <p>{deal.probabilidadCierre}% probability</p>
            <div className="w-full bg-gray-200 rounded h-2 mt-2">
              <div
                className="bg-green-500 h-2 rounded"
                style={{ width: `${deal.healthScore}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 6. TESTING (One Test File)

```typescript
// backend/src/__tests__/deals.test.ts

import { test, expect } from '@jest/globals';
import { calculateProbability, calculateHealthScore } from '../services/dealProbabilityService';

test('PROSPECT deal with 0 activities = 20% * 0.7 = 14%', () => {
  const deal = { stage: 'PROSPECT', updated_at: new Date() };
  const prob = calculateProbability(deal, []);
  expect(prob).toBe(14);
});

test('CLOSING deal with recent activity = 90% * 1.0 = 90%', () => {
  const deal = { stage: 'CLOSING', updated_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000) };
  const activity = { fecha_hora: new Date() };
  const prob = calculateProbability(deal, [activity]);
  expect(prob).toBe(90);
});

test('Health score drops 5 pts per day without activity', () => {
  const deal = { 
    updated_at: new Date(),
    ultima_actividad_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000) // 10 days ago
  };
  const health = calculateHealthScore(deal, []);
  expect(health).toBeLessThan(50);
});
```

---

## 7. MIGRATION (One Command)

```bash
# 1. Add to backend/prisma/schema.prisma (from TECHNICAL-SPEC.md)

# 2. Generate and apply migration
npx prisma migrate dev --name add_revenue_intelligence

# 3. Seed test data (optional)
npx prisma db seed

# 4. Verify tables
psql -c "\dt" (PostgreSQL)
```

---

## 8. DEPLOYMENT CHECKLIST

```
PRE-LAUNCH
☐ All tests passing (npm test)
☐ Database backed up
☐ Frontend builds (npm run build)
☐ Environment variables set (.env)

DEPLOYMENT
☐ Deploy backend (pm2 restart || systemctl restart)
☐ Deploy frontend (vercel deploy || nginx)
☐ Migrate database (npx prisma migrate deploy)
☐ Test API endpoints (curl -X GET /api/deals)
☐ Verify cron jobs running (check logs)

POST-LAUNCH
☐ Monitor error logs
☐ Check database performance (query times)
☐ Verify Slack alerts working
☐ Collect user feedback

ROLLBACK (if critical issue)
☐ Revert database schema (npx prisma migrate resolve --rolled-back)
☐ Redeploy previous backend
☐ Clear Redis cache (if using)
```

---

## 9. KEY METRICS TO TRACK (Dashboard)

```
WEEKLY REPORT:
├─ Pipeline Health
│  ├─ Total deals: 27
│  ├─ Avg probability: 58%
│  ├─ Expected revenue: €45K
│  ├─ At-risk deals: 3
│  └─ Forecast accuracy: 72%
│
├─ Activity Velocity
│  ├─ Calls/week: 45 (up 10%)
│  ├─ Emails/week: 120 (flat)
│  ├─ Demos/week: 8 (up 25%)
│  └─ Response rate: 42% (need target)
│
└─ Deal Movement
   ├─ PROSPECT→DEMO: 5 deals (19% conversion)
   ├─ DEMO→NEGOTIATION: 3 deals (60% conversion)
   ├─ NEGOTIATION→CLOSING: 2 deals (67% conversion)
   ├─ Won: 1 deal (€12K)
   └─ Lost: 1 deal (€5K, reason: price)
```

---

## 10. COMMON QUERIES (Copy-Paste)

### Get At-Risk Deals This Week
```sql
SELECT d.*, COUNT(da.id) as recent_activities
FROM deals d
LEFT JOIN deal_activities da ON d.id = da.deal_id 
  AND da.fecha_hora > NOW() - INTERVAL '7 days'
WHERE d.health_score < 50 AND d.stage NOT IN ('WON', 'LOST')
GROUP BY d.id
ORDER BY d.health_score ASC;
```

### Pipeline Waterfall
```sql
SELECT 
  stage,
  COUNT(*) as deal_count,
  SUM(monto) as pipeline,
  AVG(probabilidad_cierre) as avg_prob,
  SUM(monto * probabilidad_cierre / 100) as expected
FROM deals
WHERE software_id = 'YOUR_ID' AND stage NOT IN ('WON', 'LOST')
GROUP BY stage;
```

### Rep Performance (Who's closing most?)
```sql
SELECT 
  l.asignado_a,
  COUNT(DISTINCT d.id) as deals_count,
  SUM(CASE WHEN d.stage = 'WON' THEN 1 ELSE 0 END) as won,
  AVG(d.probabilidad_cierre) as avg_prob,
  SUM(d.monto) as pipeline
FROM deals d
JOIN leads l ON d.lead_id = l.id
GROUP BY l.asignado_a
ORDER BY won DESC;
```

### Deal Velocity (Average days per stage)
```sql
SELECT 
  stage,
  AVG(DATEDIFF(day, updated_at, fecha_cierre_final)) as avg_days
FROM deals
WHERE stage IN ('WON', 'LOST')
GROUP BY stage;
```

---

## 🚀 NEXT 24 HOURS

1. **Run SQL** (section 1) → creates tables
2. **Copy formulas** (section 2) → into your service
3. **Add API endpoints** (section 3) → to Express
4. **Setup crons** (section 4) → nightly probability update
5. **Add component** (section 5) → to React frontend
6. **Run one test** (section 6) → verify it works
7. **Deploy** (section 8) → to staging
8. **Monitor** → check error logs

**That's it.** Phase 1 MVP = 24-48 hours.

---

**Questions?** Review main docs:
- `REVENUE-INTELLIGENCE-ANALYSIS.md` (strategic)
- `REVENUE-INTELLIGENCE-TECHNICAL-SPEC.md` (detailed)
- This file (copy-paste)
