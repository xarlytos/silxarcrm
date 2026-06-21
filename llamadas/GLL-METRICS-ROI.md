# GLOBAL LEARNING LOOP: Metrics & ROI Deep Dive

**Propósito:** Medir exactamente qué impacto tiene GLL en conversión, latencia, y revenue.

---

## INDICE

1. [KPIs Clave](#kpis-clave)
2. [Formulas de Cálculo](#formulas-de-cálculo)
3. [Baseline (Hoy)](#baseline-hoy)
4. [Proyección 90 Días](#proyección-90-días)
5. [ROI Detallado](#roi-detallado)
6. [Dashboard SQL](#dashboard-sql)
7. [Alertas Automáticas](#alertas-automáticas)

---

## KPIs Clave

### 1. Win Rate (Métrica #1)
**Definición:** % de llamadas que resultan en demo agendada.

```
Win Rate = Demos Agendadas / Llamadas Totales
```

| Periodo | Baseline | Target | Delta |
|---------|----------|--------|-------|
| Hoy | 12% | - | - |
| Semana 1 (GLL live) | 12% | 13% | +1% |
| Semana 2-4 (canary) | 13% | 15% | +2% |
| Semana 5-12 (optimized) | 15% | 18-22% | +3-7% |

**Impacto:** Cada +1% en win rate = +833 demos/mes (en 100k llamadas/mes)

### 2. Demo-to-Close Rate
**Definición:** % de demos que convierten a venta (asumimos 30% con GLL).

```
Close Rate = Ventas / Demos Agendadas
```

| Scenario | Rate | Ventas/Mes |
|----------|------|-----------|
| Baseline (12% win rate → 30% close) | 30% | 3,600 |
| +15% win rate (17.5% baseline) | 30% | 5,250 |
| +25% win rate (15% win rate + 35% close) | 35% | 5,250 |

### 3. Latency (Métrica #2)
**Definición:** Tiempo desde que prospect habla hasta primera respuesta del agente.

```
Latency P95 = 95º percentil de latencias
```

**Target:** < 700ms (vs current 850ms)

| Component | Improvement | Delta |
|-----------|-------------|-------|
| Cached prompts | -50ms | 800ms → 750ms |
| Smarter arguments | -75ms | Early exit if confident |
| Optimized tokens | -100ms | Shorter prompts |
| Parallel processing | -50ms | Pre-fetch next stage |
| **Total** | **-275ms** | **800ms → 525ms** |

**Beneficio:** Conversación más fluida = +3-5% win rate adicional (desde "no robot" factor)

### 4. Objection Resolution Rate
**Definición:** % de llamadas donde había objeción Y se resolvió positivamente.

```
Resolution Rate = (Calls with Objection Resolved) / (Calls with Objection)
```

| Scenario | Baseline | Target | Impact |
|----------|----------|--------|--------|
| Precio | 40% | 65% | Value prop claro |
| Competencia | 35% | 60% | Diferenciación |
| Timing | 25% | 50% | Urgency + follow-up |
| **Overall** | **50%** | **70%** | **+20pp** |

**Cada +10pp = +2% win rate** (porque objections bien resueltas llevan a conversión)

### 5. Lead Score Distribution
**Definición:** Distribuir leads por "hotness" (1-10 scale).

```
Leads segmented by GLL-predicted quality
```

| Score | % of Calls | Win Rate | Value/Lead |
|-------|-----------|----------|------------|
| 9-10 (Hot) | 5% | 65% | €500 |
| 7-8 (Warm) | 15% | 35% | €300 |
| 5-6 (Neutral) | 40% | 15% | €100 |
| 1-4 (Cold) | 40% | 5% | €20 |

**Con GLL:** Lead score accuracy = +30% (porque usamos 100k histórico para calibrar)

### 6. Argument Win Rate Concentration
**Definición:** Cuánto impacta TOP 5 arguments en overall win rate.

```
Top 5 Argument Concentration = % of Wins using Top 5 Args
```

| Scenario | Top 5 Args Used | Win Rate from Top 5 | Impact |
|----------|-----------------|-------------------|--------|
| Baseline (static) | 30% of calls | 8% | Inconsistent |
| GLL Week 1 | 35% of calls | 10% | Learning |
| GLL Week 4 | 55% of calls | 16% | **+8pp vs baseline** |
| GLL Week 8 | 70% of calls | 20% | Maturity |

---

## Formulas de Cálculo

### Win Rate Uplift

```
Δ Win Rate = (New Demos - Old Demos) / Calls
           = (Calls × New Rate) - (Calls × Old Rate)) / Calls
           = New Rate - Old Rate

Example:
- Calls: 100k
- Old Rate: 12% = 12k demos
- New Rate: 18% = 18k demos
- Delta: +6k demos = +6pp
```

### Revenue Uplift (EUR)

```
Revenue Uplift = Δ Demos × Show Rate × Close Rate × ACV

Where:
- Δ Demos = Additional demos from higher win rate
- Show Rate = % of demos que realmente ocurren (default 70%)
- Close Rate = % of demos that convert to sale (default 30%)
- ACV = Average Contract Value (assume €500 first year)

Example:
- Δ Demos: +6,000/month (from +6pp win rate)
- Show Rate: 70% = 4,200 actual demos
- Close Rate: 30% = 1,260 sales
- ACV: €500
- Revenue: 1,260 × €500 = €630,000/month = €7.56M/year
```

### Cost of Operations

```
GLL Monthly Cost = Infrastructure + Labor

Infrastructure:
- BigQuery: €1,000/month (100M rows @ €6.25/TB)
- GCS Storage: €100/month
- Pub/Sub: €100/month
- Compute (Cloud Run): €200/month
- Monitoring: €200/month
Total Infrastructure: €1,600/month

Labor:
- Engineering (0.5 FTE): €3,000/month
- Data analysis (0.25 FTE): €1,500/month
- On-call support (10%): €500/month
Total Labor: €5,000/month

TOTAL: €6,600/month
```

### ROI Calculation

```
ROI = (Revenue Uplift - GLL Cost) / GLL Cost × 100%

Conservative scenario (+6pp win rate):
- Revenue Uplift: €630k/month
- GLL Cost: €6.6k/month
- Net Gain: €623.4k/month
- ROI: (623.4 / 6.6) × 100% = 9,436% = 94x

Aggressive scenario (+12pp win rate):
- Revenue Uplift: €1.26M/month
- GLL Cost: €6.6k/month
- Net Gain: €1.25M/month
- ROI: (1.25M / 6.6k) × 100% = 18,939% = 189x

Payback Period: 1-2 días
```

---

## Baseline (Hoy)

### Snapshot Actual (2026-06-21)

```sql
SELECT 
  DATE(CURRENT_DATE()) AS date,
  
  -- Volúmenes
  COUNT(*) AS total_calls,
  COUNTIF(outcome = 'demo_booked') AS demos_booked,
  COUNTIF(outcome = 'soft_no') AS soft_nos,
  COUNTIF(outcome = 'hard_no') AS hard_nos,
  
  -- Tasas
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 3) AS win_rate,
  ROUND(COUNTIF(outcome = 'soft_no') / COUNT(*), 3) AS soft_no_rate,
  ROUND(COUNTIF(outcome = 'hard_no') / COUNT(*), 3) AS hard_no_rate,
  
  -- Calidad
  ROUND(AVG(lead_score), 1) AS avg_lead_score,
  APPROX_QUANTILES(lead_score, 100)[OFFSET(50)] AS median_lead_score,
  
  -- Latencia (de metrics, no de GLL calls)
  APPROX_QUANTILES(latency_p50_ms, 100)[OFFSET(50)] AS p50_latency_ms,
  APPROX_QUANTILES(latency_p95_ms, 100)[OFFSET(95)] AS p95_latency_ms,
  
  -- Compliance
  ROUND(COUNTIF(compliance.disclosure_mentioned) / COUNT(*), 3) AS disclosure_rate,
  ROUND(COUNTIF(compliance.optout_detected) / COUNT(*), 3) AS optout_rate,
  
  -- Objeciones
  COUNT(DISTINCT ARRAY_LENGTH(objections_encountered)) AS avg_objections_per_call,
  
FROM llamadas.calls
WHERE DATE(timestamp) = CURRENT_DATE()
GROUP BY date;

/* EXPECTED OUTPUT (Day 0):
date                | total_calls | demos_booked | win_rate | p95_latency_ms | avg_lead_score
2026-06-21          | 100,000     | 12,000       | 12%      | 850ms          | 5.2/10
*/
```

### Snapshot Pre-Optimization

| Metric | Baseline | Unit |
|--------|----------|------|
| Total Calls/Day | 100,000 | calls |
| Win Rate | 12% | % |
| Demos/Day | 12,000 | demos |
| Soft No Rate | 22% | % |
| Hard No Rate | 66% | % |
| Avg Lead Score | 5.2 | /10 |
| Latency P95 | 850 | ms |
| Disclosure Rate | 85% | % |
| Objection Resolution | 55% | % |

---

## Proyección 90 Días

### Timeline y Milestones

```
WEEK 1: Data Pipeline Live
├─ GLL logs first 100k calls
├─ Analytics identify top 5 arguments
├─ Win rate: 12% (no cambio aún, está calentando)
└─ Output: 5k rows en BigQuery

WEEK 2-3: Canary Phase (5% traffic)
├─ New prompts deployed a 5% of dentistas
├─ Win rate in canary: 14% (+2pp!)
├─ Latency stable (no regression)
├─ Canary escalated to 20%
└─ Output: 200k rows, clear trends

WEEK 4-6: Early Adoption (20% traffic)
├─ GLL prompts now on 20% of calls
├─ Win rate overall: 14.5% (+2.5pp)
├─ Latency: 780ms (-70ms)
├─ Objection resolution: 65% (+10pp)
├─ Canary escalated to 100%
└─ Output: 600k rows, patterns strong

WEEK 7-12: Full Adoption (100% traffic)
├─ GLL prompts on ALL calls
├─ Win rate: 16-18% (+4-6pp)
├─ Latency: 650ms (-200ms)
├─ Lead score avg: 6.8/10 (+1.6)
├─ Argument concentration: 70% using top 5
└─ Output: 1.2M rows, mature system
```

### Proyección de Datos (90 días)

```sql
-- Proyectado después de 90 días con GLL

SELECT 
  'Baseline' AS scenario,
  DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY) AS date,
  100000 AS total_calls,
  12000 AS demos_booked,
  0.12 AS win_rate,
  850 AS p95_latency_ms,
  5.2 AS avg_lead_score
  
UNION ALL

SELECT 
  'Day 30',
  DATE_SUB(CURRENT_DATE(), INTERVAL 60 DAY),
  100000,
  13000,
  0.13,
  810,
  5.4
  
UNION ALL

SELECT 
  'Day 60',
  DATE_SUB(CURRENT_DATE(), INTERVAL 30 DAY),
  100000,
  15000,
  0.15,
  730,
  6.1
  
UNION ALL

SELECT 
  'Day 90',
  CURRENT_DATE(),
  100000,
  17000,
  0.17,
  650,
  6.8
```

### Resultados Proyectados (90 días)

| Metric | Day 0 | Day 30 | Day 60 | Day 90 | Delta |
|--------|-------|--------|--------|--------|-------|
| **Win Rate** | 12% | 13% | 15% | 17% | +5pp |
| **Demos/Day** | 12k | 13k | 15k | 17k | +5k |
| **Latency P95** | 850ms | 810ms | 730ms | 650ms | -200ms |
| **Lead Score Avg** | 5.2 | 5.4 | 6.1 | 6.8 | +1.6 |
| **Objection Res.** | 55% | 60% | 67% | 72% | +17pp |
| **Argument Top 5%** | 30% | 40% | 60% | 70% | +40pp |

---

## ROI Detallado

### Costos (Primer Año)

| Item | Q1 (Setup) | Q2-Q4 (Operational) | Total |
|------|-----------|-------------------|-------|
| **Engineering (Setup)** | €30k | - | €30k |
| **Infrastructure** | €1.6k | €1.6k × 9 | €15.4k |
| **Labor (Ops)** | - | €5k × 9 | €45k |
| **Monitoring/Tools** | €2k | €0.5k × 9 | €6.5k |
| **Contingency (10%)** | €3.3k | €0.7k × 9 | €9.6k |
| **TOTAL** | **€36.9k** | **€62.3k** | **€99.2k** |

### Revenue (Primer Año - Incremental from GLL)

| Scenario | Q2 (30d live) | Q3 (60d) | Q4 (90d full) | Total |
|----------|--------------|---------|---------------|--------|
| **+5pp win rate** | €105k | €315k | €630k | €1.05M |
| **+8pp win rate** | €168k | €504k | €1.008M | €1.68M |
| **+12pp win rate** | €252k | €756k | €1.512M | €2.52M |

### Net Profit & ROI

```
Conservative (+5pp win rate):
├─ Revenue: €1.05M
├─ Cost: €99k
├─ Net Profit: €951k
└─ ROI: 960% (9.6x return)

Realistic (+8pp win rate):
├─ Revenue: €1.68M
├─ Cost: €99k
├─ Net Profit: €1.581M
└─ ROI: 1,597% (15.97x return)

Aggressive (+12pp win rate):
├─ Revenue: €2.52M
├─ Cost: €99k
├─ Net Profit: €2.421M
└─ ROI: 2,446% (24.46x return)
```

### Payback Period

```
Payback = Total Setup Cost / Monthly Revenue Uplift

Conservative:
├─ Setup: €37k
├─ Monthly from Day 1: €88k (€1.05M / 12)
└─ Payback: 5 días

Realistic:
├─ Setup: €37k
├─ Monthly: €140k
└─ Payback: 3 días

Aggressive:
├─ Setup: €37k
├─ Monthly: €210k
└─ Payback: 2 días
```

---

## Dashboard SQL

### Query: Daily KPI Dashboard

```sql
CREATE VIEW gll.dashboard_daily AS
SELECT 
  DATE(timestamp) AS date,
  
  -- Volúmenes
  COUNT(*) AS total_calls,
  COUNTIF(outcome = 'demo_booked') AS demos_booked,
  COUNTIF(outcome = 'soft_no') AS soft_nos,
  COUNTIF(outcome = 'hard_no') AS hard_nos,
  
  -- Tasas de conversión
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 4) AS win_rate,
  ROUND(COUNTIF(outcome = 'soft_no') / COUNT(*), 4) AS soft_no_rate,
  
  -- Lead quality
  ROUND(AVG(lead_score), 2) AS avg_lead_score,
  APPROX_QUANTILES(lead_score, 100)[OFFSET(25)] AS q1_lead_score,
  APPROX_QUANTILES(lead_score, 100)[OFFSET(50)] AS median_lead_score,
  APPROX_QUANTILES(lead_score, 100)[OFFSET(75)] AS q3_lead_score,
  
  -- Latencias (simulado - en real vendría de metrics tables)
  APPROX_QUANTILES(duration_seconds * 1000, 100)[OFFSET(50)] AS p50_call_duration_ms,
  APPROX_QUANTILES(duration_seconds * 1000, 100)[OFFSET(95)] AS p95_call_duration_ms,
  
  -- Compliance
  ROUND(COUNTIF(compliance.disclosure_mentioned) / COUNT(*), 4) AS disclosure_rate,
  ROUND(COUNTIF(compliance.optout_detected) / COUNT(*), 4) AS optout_rate,
  
  -- Objeciones
  (
    SELECT AS STRUCT
      COUNT(*) AS total_objections,
      COUNTIF(obj.resolved) AS resolved,
      ROUND(COUNTIF(obj.resolved) / COUNT(*), 4) AS resolution_rate
    FROM (SELECT * FROM UNNEST(objections_encountered) AS obj)
  ) AS objection_stats,
  
  -- Top arguments used today
  (
    SELECT AS STRUCT
      ARRAY_AGG(
        STRUCT(arg.argument_id, COUNT(*) AS times_used, 
          COUNTIF(outcome = 'demo_booked') / COUNT(*) AS win_rate),
        IGNORE NULLS
      )
      FROM (SELECT * FROM UNNEST(arguments_used) AS arg),
      GROUP BY arg.argument_id
      ORDER BY COUNT(*) DESC
      LIMIT 5
  ) AS top_arguments,
  
FROM gll.calls
WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 90 DAY)
GROUP BY date
ORDER BY date DESC;
```

### Query: Win Rate Trend (30-day rolling)

```sql
SELECT 
  DATE(timestamp) AS date,
  prospect.industry,
  
  -- KPIs por industry
  COUNT(*) AS daily_calls,
  ROUND(COUNTIF(outcome = 'demo_booked') / COUNT(*), 4) AS daily_win_rate,
  
  -- 30-day moving average
  ROUND(
    AVG(COUNTIF(outcome = 'demo_booked') / COUNT(*)) 
    OVER (
      PARTITION BY prospect.industry
      ORDER BY DATE(timestamp)
      ROWS BETWEEN 29 PRECEDING AND CURRENT ROW
    ),
    4
  ) AS ma30_win_rate,
  
  -- YoY comparison (if we have data from last year)
  COUNT(*) OVER (
    PARTITION BY prospect.industry, DAYOFYEAR(timestamp)
    ORDER BY EXTRACT(YEAR FROM timestamp)
  ) AS yoy_calls,
  
FROM gll.calls
WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 90 DAY)
GROUP BY date, prospect.industry
ORDER BY date DESC, prospect.industry;
```

---

## Alertas Automáticas

### Alert 1: Win Rate Regression

```python
# app/gll/alerts.py

async def check_win_rate_regression():
    """Alerta si win_rate cae > 5pp en última hora."""
    
    query = """
    WITH hourly_rates AS (
      SELECT 
        DATE_TRUNC(timestamp, HOUR) AS hour,
        COUNTIF(outcome = 'demo_booked') / COUNT(*) AS win_rate
      FROM gll.calls
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 2 HOUR)
      GROUP BY hour
    )
    SELECT 
      current_rate,
      previous_rate,
      current_rate - previous_rate AS delta
    FROM (
      SELECT 
        LAG(win_rate) OVER (ORDER BY hour) AS previous_rate,
        win_rate AS current_rate
      FROM hourly_rates
      ORDER BY hour DESC
      LIMIT 1
    )
    """
    
    result = await bigquery.query(query)
    delta = result[0]['delta']
    
    if delta < -0.05:  # Cayó > 5pp
        await slack.alert(
            severity="CRITICAL",
            message=f"🚨 Win rate dropped {delta:.1%} in last hour. Check new prompt!"
        )
        
        # Trigger rollback
        await trigger_rollback()
```

### Alert 2: Latency Spike

```python
async def check_latency_spike():
    """Alerta si P95 latency sube > 200ms."""
    
    query = """
    WITH latencies AS (
      SELECT 
        APPROX_QUANTILES(duration_seconds * 1000, 100)[OFFSET(95)] AS p95
      FROM gll.calls
      WHERE timestamp >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 1 HOUR)
    ),
    baseline AS (
      SELECT 
        APPROX_QUANTILES(duration_seconds * 1000, 100)[OFFSET(95)] AS p95_baseline
      FROM gll.calls
      WHERE DATE(timestamp) = DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
    )
    SELECT 
      l.p95 - b.p95_baseline AS delta_ms
    FROM latencies l, baseline b
    """
    
    result = await bigquery.query(query)
    delta = result[0]['delta_ms']
    
    if delta > 200:
        await slack.alert(
            severity="WARNING",
            message=f"⚠️  P95 latency up {delta}ms. Possible infrastructure issue."
        )
```

### Alert 3: Objection Resolution Drop

```python
async def check_objection_resolution():
    """Alerta si resolution rate cae."""
    
    query = """
    WITH daily_resolution AS (
      SELECT 
        DATE(timestamp) AS date,
        COUNTIF(obj.resolved = TRUE) / COUNT(DISTINCT ARRAY_LENGTH(objections_encountered) > 0) AS resolution_rate
      FROM gll.calls,
           UNNEST(objections_encountered) AS obj
      WHERE DATE(timestamp) >= DATE_SUB(CURRENT_DATE(), INTERVAL 7 DAY)
      GROUP BY date
      ORDER BY date DESC
    )
    SELECT 
      MAX(resolution_rate) AS today,
      MIN(resolution_rate) AS last_7d_min,
      MAX(resolution_rate) - MIN(resolution_rate) AS delta
    FROM daily_resolution
    """
    
    result = await bigquery.query(query)
    delta = result[0]['delta']
    
    if delta > 0.10:  # Caída > 10pp
        await slack.alert(
            severity="WARNING",
            message=f"⚠️  Objection resolution rate dropped {delta:.1%}"
        )
```

---

## KPI Targets (Año 1)

| KPI | Q1 | Q2 | Q3 | Q4 |
|-----|----|----|----|----|
| **Win Rate** | 12% | 14% | 15% | 17% |
| **Demos/Day** | 12k | 14k | 15k | 17k |
| **Avg Lead Score** | 5.2 | 5.8 | 6.3 | 6.8 |
| **Objection Res.** | 55% | 62% | 68% | 72% |
| **Latency P95** | 850ms | 780ms | 700ms | 650ms |
| **Disclosure Rate** | 85% | 90% | 93% | 95% |
| **Monthly Revenue Lift** | €0 | €350k | €490k | €630k |

---

## Conclusión

**ROI Conservador: 960% en Año 1**
- Inversión: €99k
- Retorno: €1.05M
- Payback: 5 días

**Con GLL, cada 1% de win rate = +€630k/año**

---

Documento: GLL-METRICS-ROI.md  
Status: Listo para presentar a stakeholders
