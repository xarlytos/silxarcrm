# REVENUE INTELLIGENCE TECHNICAL SPECIFICATION
## Implementation Blueprint for 90-Day Delivery

**Target Release:** 2026-09-21 (Q3 2026)  
**Team Size:** 3 engineers + 1 QA + 1 Product  
**Status:** Ready for Sprint Planning  

---

## TABLE OF CONTENTS

1. [Architecture Overview](#1-architecture-overview)
2. [Database Schema (Executable SQL)](#2-database-schema-executable-sql)
3. [Backend API Specification (OpenAPI)](#3-backend-api-specification-openapi)
4. [Service Layer Implementation](#4-service-layer-implementation)
5. [Frontend Components Specification](#5-frontend-components-specification)
6. [Cron Jobs & Background Tasks](#6-cron-jobs--background-tasks)
7. [Integration Points](#7-integration-points)
8. [Testing Strategy](#8-testing-strategy)
9. [Deployment Checklist](#9-deployment-checklist)

---

## 1. ARCHITECTURE OVERVIEW

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                   FRONTEND (Next.js 14)                      │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ DealsBoard | RevenueForecaster | PipelineHealth      │   │
│  │ DealCard | AlertPanel | WinLossAnalysis             │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ HTTP/REST
┌──────────────────────▼──────────────────────────────────────┐
│              BACKEND (Express.js + Prisma)                   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ Routes Layer          (deals.ts, forecast.ts)        │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Service Layer         (ProbabilityCalc, Forecaster)  │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Repository Layer      (Prisma queries + caching)     │   │
│  ├──────────────────────────────────────────────────────┤   │
│  │ Cron Jobs            (Probability updates, Alerts)   │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────┬──────────────────────────────────────┘
                       │ Prisma ORM
┌──────────────────────▼──────────────────────────────────────┐
│            DATABASE (PostgreSQL 14+)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │ deals | deal_activities | deal_analysis              │   │
│  │ revenue_snapshots | health_snapshots                │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘

EXTERNAL INTEGRATIONS:
├─ Slack (at-risk alerts)
├─ SendGrid/Email (forecast digests)
├─ LLM API (deal analysis)
└─ Google Sheets (export)
```

### Data Flow

```
1. ACTIVITY CAPTURE:
   Lead calls/emails/demos → LlamadaReal/WhatsappEnvio/EmailEnvio
   → Webhook: POST /api/deals/:id/activities
   → Update: deal.ultimaActividadAt, healthScore

2. PROBABILITY RECALC (nightly cron):
   For each deal:
   - Get recent activities
   - Recalculate probability (formula)
   - Update deal.probabilidadCierre
   - Alert if dropped > 20%

3. FORECAST GENERATION (daily):
   For each software/month:
   - Query deals in stage != LOST,PROSPECT
   - Group by stage
   - Apply probability weighting
   - Calculate best/worst case
   - Store in revenue_snapshots

4. HEALTH MONITORING (hourly):
   For each deal:
   - Calculate health score
   - Check if < 50 (RED)
   - Send Slack alert to manager
   - Suggest action
```

---

## 2. DATABASE SCHEMA (EXECUTABLE SQL)

### Create Tables

```sql
-- Enable UUID support
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- DEALS TABLE (core)
CREATE TABLE deals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL UNIQUE REFERENCES leads(id) ON DELETE CASCADE,
  software_id VARCHAR(255) NOT NULL,
  
  -- Deal metadata
  nombre VARCHAR(500) NOT NULL,
  descripcion TEXT,
  monto NUMERIC(12,2) NOT NULL,
  moneda VARCHAR(3) NOT NULL DEFAULT 'EUR',
  
  -- Stage and probability
  stage VARCHAR(50) NOT NULL DEFAULT 'PROSPECT' CHECK (stage IN (
    'PROSPECT', 'DEMO_SCHEDULED', 'DEMO_COMPLETED', 'NEGOTIATION', 
    'CLOSING', 'WON', 'LOST'
  )),
  probabilidad_cierre INT NOT NULL DEFAULT 25 CHECK (probabilidad_cierre >= 0 AND probabilidad_cierre <= 100),
  
  -- Timeline
  fecha_cierre_estimada TIMESTAMP,
  fecha_cierre_final TIMESTAMP,
  
  -- Health tracking
  health_score INT NOT NULL DEFAULT 50 CHECK (health_score >= 0 AND health_score <= 100),
  ultima_actividad_at TIMESTAMP,
  
  -- Closing info
  motivo_cierre VARCHAR(500),
  
  -- Audit
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_lead (lead_id),
  INDEX idx_software (software_id),
  INDEX idx_stage (stage),
  INDEX idx_prob (probabilidad_cierre),
  INDEX idx_health (health_score),
  INDEX idx_cierre_est (fecha_cierre_estimada)
);

-- DEAL_ACTIVITIES TABLE
CREATE TABLE deal_activities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  
  tipo VARCHAR(50) NOT NULL CHECK (tipo IN ('CALL', 'EMAIL', 'WHATSAPP', 'DEMO', 'MEETING', 'PROPOSAL')),
  canal VARCHAR(50),
  
  -- Activity details
  fecha_hora TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  duracion_seg INT,
  resultado VARCHAR(50),  -- CONNECTED, VOICEMAIL, OPENED, CLICKED, BOUNCE
  
  resumen TEXT,
  transcript TEXT,
  
  -- External references
  external_id VARCHAR(255),  -- Zadarma call ID, email ID, etc.
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_deal (deal_id),
  INDEX idx_fecha (fecha_hora),
  INDEX idx_deal_fecha (deal_id, fecha_hora DESC)
);

-- DEAL_ANALYSIS TABLE
CREATE TABLE deal_analyses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL UNIQUE REFERENCES deals(id) ON DELETE CASCADE,
  
  -- Outcome
  estado VARCHAR(50) NOT NULL CHECK (estado IN ('OPEN', 'WON', 'LOST')),
  
  -- If lost
  motivo_primario VARCHAR(255),  -- PRECIO, PRODUCTO, TIMING, COMPETENCIA, OTRO
  motivo_secundario VARCHAR(255),
  lecciones TEXT,
  
  -- If won
  factores_clave TEXT[],
  
  -- Metrics
  calls_count INT DEFAULT 0,
  emails_count INT DEFAULT 0,
  demos_count INT DEFAULT 0,
  
  velocidad_cierre INT,  -- days from PROSPECT to WON/LOST
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_deal (deal_id),
  INDEX idx_estado (estado),
  INDEX idx_motivo (motivo_primario)
);

-- HEALTH_SNAPSHOTS TABLE (historical tracking)
CREATE TABLE health_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  deal_id UUID NOT NULL REFERENCES deals(id) ON DELETE CASCADE,
  
  health_score INT NOT NULL,
  probability INT NOT NULL,
  risk_level VARCHAR(50),  -- GREEN, YELLOW, ORANGE, RED
  
  activities_7d INT,
  days_no_activity INT,
  days_in_stage INT,
  
  snapshot_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  INDEX idx_deal (deal_id),
  INDEX idx_snapshot (snapshot_at),
  INDEX idx_deal_snapshot (deal_id, snapshot_at DESC)
);

-- REVENUE_SNAPSHOTS TABLE (daily forecast)
CREATE TABLE revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  software_id VARCHAR(255) NOT NULL,
  
  mes VARCHAR(7) NOT NULL,  -- '2026-06'
  
  expected_revenue NUMERIC(12,2) NOT NULL,
  best_case NUMERIC(12,2) NOT NULL,
  worst_case NUMERIC(12,2) NOT NULL,
  
  deals_count INT,
  deals_won INT,
  deals_lost INT,
  
  confidence FLOAT,
  
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  
  UNIQUE (software_id, mes),
  INDEX idx_software_mes (software_id, mes),
  INDEX idx_created (created_at)
);

-- CREATE INDEXES
CREATE INDEX idx_deal_health_score ON deals(health_score);
CREATE INDEX idx_deal_stage_prob ON deals(stage, probabilidad_cierre);
CREATE INDEX idx_activities_deal_type ON deal_activities(deal_id, tipo);
CREATE INDEX idx_health_risk_level ON health_snapshots(deal_id, risk_level);

-- GRANT PERMISSIONS
GRANT SELECT, INSERT, UPDATE ON deals TO app_user;
GRANT SELECT, INSERT ON deal_activities TO app_user;
GRANT SELECT, INSERT, UPDATE ON deal_analyses TO app_user;
GRANT SELECT, INSERT ON health_snapshots TO app_user;
GRANT SELECT, INSERT ON revenue_snapshots TO app_user;
```

### Prisma Migration

```prisma
# prisma/migrations/2026_06_21_add_revenue_intelligence/migration.sql

-- Create the tables (copy from SQL above, Prisma will manage)

-- Create views for common queries
CREATE VIEW deal_summary AS
SELECT
  d.id,
  d.lead_id,
  d.nombre,
  d.monto,
  d.stage,
  d.probabilidad_cierre,
  d.health_score,
  COUNT(da.id) as activities_count,
  MAX(da.fecha_hora) as last_activity_at,
  DATEDIFF(day, MAX(da.fecha_hora), CURRENT_TIMESTAMP) as days_since_activity
FROM deals d
LEFT JOIN deal_activities da ON d.id = da.deal_id
GROUP BY d.id;

CREATE VIEW pipeline_waterfall AS
SELECT
  stage,
  COUNT(*) as deal_count,
  SUM(monto) as total_value,
  AVG(probabilidad_cierre) as avg_probability,
  SUM(monto * probabilidad_cierre / 100) as expected_value
FROM deals
WHERE stage NOT IN ('WON', 'LOST')
GROUP BY stage
ORDER BY CASE 
  WHEN stage = 'PROSPECT' THEN 1
  WHEN stage = 'DEMO_SCHEDULED' THEN 2
  WHEN stage = 'DEMO_COMPLETED' THEN 3
  WHEN stage = 'NEGOTIATION' THEN 4
  WHEN stage = 'CLOSING' THEN 5
END;
```

---

## 3. BACKEND API SPECIFICATION (OpenAPI)

### OpenAPI 3.0 Spec

```yaml
openapi: 3.0.0
info:
  title: Revenue Intelligence API
  version: 1.0.0
  description: Deal tracking, forecasting, and pipeline management

paths:
  /api/deals:
    get:
      summary: List deals
      parameters:
        - name: softwareId
          in: query
          schema: { type: string }
        - name: stage
          in: query
          schema: { enum: [PROSPECT, DEMO_SCHEDULED, DEMO_COMPLETED, NEGOTIATION, CLOSING, WON, LOST] }
        - name: healthScore
          in: query
          description: 'Filter by health < value (e.g., 50 = at-risk)'
          schema: { type: integer }
        - name: skip
          in: query
          schema: { type: integer, default: 0 }
        - name: limit
          in: query
          schema: { type: integer, default: 50 }
      responses:
        200:
          description: List of deals
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/Deal' }

    post:
      summary: Create deal
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                leadId: { type: string, format: uuid }
                nombre: { type: string }
                monto: { type: number }
                moneda: { type: string, default: EUR }
                fechaCierreEstimada: { type: string, format: date-time }
              required: [leadId, nombre, monto]
      responses:
        201:
          description: Deal created
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Deal' }

  /api/deals/{id}:
    get:
      summary: Get deal detail
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: Deal detail
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DealDetail' }

    patch:
      summary: Update deal
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        content:
          application/json:
            schema:
              type: object
              properties:
                stage: { type: string }
                monto: { type: number }
                probabilidadCierre: { type: integer, minimum: 0, maximum: 100 }
                fechaCierreEstimada: { type: string, format: date-time }
                motivoCierre: { type: string }
      responses:
        200:
          description: Updated deal
          content:
            application/json:
              schema: { $ref: '#/components/schemas/Deal' }

  /api/deals/{id}/activities:
    get:
      summary: List activities for deal
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      responses:
        200:
          description: List of activities
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/DealActivity' }

    post:
      summary: Add activity to deal
      parameters:
        - name: id
          in: path
          required: true
          schema: { type: string, format: uuid }
      requestBody:
        required: true
        content:
          application/json:
            schema:
              type: object
              properties:
                tipo: { enum: [CALL, EMAIL, WHATSAPP, DEMO, MEETING, PROPOSAL] }
                canal: { type: string }
                resultado: { type: string }
                resumen: { type: string }
                duracion: { type: integer }
              required: [tipo, canal]
      responses:
        201:
          description: Activity added
          content:
            application/json:
              schema: { $ref: '#/components/schemas/DealActivity' }

  /api/forecast/{month}:
    get:
      summary: Get revenue forecast for month
      parameters:
        - name: month
          in: path
          required: true
          description: 'Format: YYYY-MM'
          schema: { type: string, pattern: '^\d{4}-\d{2}$' }
        - name: softwareId
          in: query
          required: true
          schema: { type: string }
      responses:
        200:
          description: Forecast data
          content:
            application/json:
              schema: { $ref: '#/components/schemas/RevenueForecast' }

  /api/analytics/pipeline-waterfall:
    get:
      summary: Get pipeline waterfall (deals by stage)
      parameters:
        - name: softwareId
          in: query
          required: true
          schema: { type: string }
      responses:
        200:
          description: Pipeline waterfall
          content:
            application/json:
              schema: { $ref: '#/components/schemas/PipelineWaterfall' }

  /api/analytics/conversion-rates:
    get:
      summary: Get stage conversion rates
      parameters:
        - name: softwareId
          in: query
          required: true
          schema: { type: string }
      responses:
        200:
          description: Conversion rates
          content:
            application/json:
              schema: { $ref: '#/components/schemas/ConversionRates' }

  /api/analytics/at-risk:
    get:
      summary: List at-risk deals (healthScore < 50)
      parameters:
        - name: softwareId
          in: query
          required: true
          schema: { type: string }
      responses:
        200:
          description: At-risk deals
          content:
            application/json:
              schema:
                type: array
                items: { $ref: '#/components/schemas/DealDetail' }

components:
  schemas:
    Deal:
      type: object
      properties:
        id: { type: string, format: uuid }
        nombre: { type: string }
        monto: { type: number }
        moneda: { type: string }
        stage: { type: string }
        probabilidadCierre: { type: integer }
        healthScore: { type: integer }
        fechaCierreEstimada: { type: string, format: date-time }
        createdAt: { type: string, format: date-time }
        updatedAt: { type: string, format: date-time }

    DealDetail:
      allOf:
        - { $ref: '#/components/schemas/Deal' }
        - type: object
          properties:
            lead: { type: object }
            activities: { type: array, items: { $ref: '#/components/schemas/DealActivity' } }
            analysis: { type: object }

    DealActivity:
      type: object
      properties:
        id: { type: string, format: uuid }
        dealId: { type: string, format: uuid }
        tipo: { type: string }
        canal: { type: string }
        fechaHora: { type: string, format: date-time }
        duracion: { type: integer }
        resultado: { type: string }
        resumen: { type: string }

    RevenueForecast:
      type: object
      properties:
        month: { type: string }
        expectedRevenue: { type: number }
        bestCase: { type: number }
        worstCase: { type: number }
        confidence: { type: number }
        dealsCount: { type: integer }
        byStage: { type: object }

    PipelineWaterfall:
      type: array
      items:
        type: object
        properties:
          stage: { type: string }
          dealCount: { type: integer }
          totalValue: { type: number }
          avgProbability: { type: number }
          expectedValue: { type: number }

    ConversionRates:
      type: object
      properties:
        prospectToDemo: { type: number }
        demoToNegotiation: { type: number }
        negotiationToClosing: { type: number }
        closingToWon: { type: number }
```

---

## 4. SERVICE LAYER IMPLEMENTATION

### TypeScript Services

```typescript
// backend/src/services/dealProbabilityService.ts

import { PrismaClient } from '@prisma/client';

export class DealProbabilityService {
  private prisma: PrismaClient;

  constructor(prisma: PrismaClient) {
    this.prisma = prisma;
  }

  private stageProbability: Record<string, number> = {
    PROSPECT: 20,
    DEMO_SCHEDULED: 35,
    DEMO_COMPLETED: 50,
    NEGOTIATION: 75,
    CLOSING: 90,
    WON: 100,
    LOST: 0,
  };

  async calculateProbability(dealId: string): Promise<number> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
      include: { lead: true },
    });

    if (!deal) throw new Error('Deal not found');

    let probability = this.stageProbability[deal.stage] ?? 20;

    // Activity velocity (last 7 days)
    const activities = await this.getRecentActivities(dealId, 7);
    if (activities.length === 0) {
      probability *= 0.7; // No activity is a bad sign
    } else if (activities.length >= 3) {
      probability *= 1.2; // 3+ activities = boost
    }

    // Time in stage penalty
    const daysInStage = this.getDaysInStage(deal);
    if (daysInStage > 45) {
      probability *= 0.6;
    } else if (daysInStage > 30) {
      probability *= 0.8;
    }

    // ICP match bonus
    if (this.isICPMatch(deal.lead)) {
      probability *= 1.15;
    }

    return Math.min(Math.max(Math.round(probability), 0), 100);
  }

  async calculateHealthScore(dealId: string): Promise<number> {
    const deal = await this.prisma.deal.findUnique({
      where: { id: dealId },
    });

    if (!deal) throw new Error('Deal not found');

    let score = 100;

    // No activity penalty
    const daysNoActivity = this.getDaysSinceLastActivity(deal);
    score -= Math.min(daysNoActivity * 5, 50);

    // Time in stage penalty
    const daysInStage = this.getDaysInStage(deal);
    if (daysInStage > 14) {
      score -= Math.min((daysInStage - 14) * 2, 40);
    }

    // Response rate (if proposal sent)
    // This would integrate with email tracking

    return Math.max(score, 0);
  }

  private async getRecentActivities(dealId: string, days: number) {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return this.prisma.dealActivity.findMany({
      where: {
        dealId,
        fechaHora: { gte: since },
      },
    });
  }

  private getDaysInStage(deal: any): number {
    return Math.floor((Date.now() - deal.updatedAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private getDaysSinceLastActivity(deal: any): number {
    if (!deal.ultimaActividadAt) return 999;
    return Math.floor((Date.now() - deal.ultimaActividadAt.getTime()) / (1000 * 60 * 60 * 24));
  }

  private isICPMatch(lead: any): boolean {
    // Implement ICP logic based on company size, vertical, etc
    return lead.empresa?.length > 5 && lead.cargo !== null;
  }

  async updateAllProbabilities(softwareId: string): Promise<void> {
    const deals = await this.prisma.deal.findMany({
      where: { lead: { softwareId } },
    });

    for (const deal of deals) {
      const newProbability = await this.calculateProbability(deal.id);
      const newHealth = await this.calculateHealthScore(deal.id);

      await this.prisma.deal.update({
        where: { id: deal.id },
        data: {
          probabilidadCierre: newProbability,
          healthScore: newHealth,
        },
      });
    }
  }
}

// backend/src/services/revenueForecasterService.ts

export class RevenueForecasterService {
  constructor(private prisma: PrismaClient) {}

  async forecastMonth(softwareId: string, month: string): Promise<RevenueForecast> {
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const deals = await this.prisma.deal.findMany({
      where: {
        lead: { softwareId },
        stage: { notIn: ['LOST', 'PROSPECT'] },
        fechaCierreEstimada: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    let expectedRevenue = 0;
    let bestCase = 0;
    let worstCase = 0;

    const byStage: Record<string, number> = {};

    deals.forEach((deal) => {
      const weighted = deal.monto.toNumber() * (deal.probabilidadCierre / 100);
      expectedRevenue += weighted;

      bestCase += deal.monto.toNumber() * 0.8; // 80% will close
      worstCase += deal.monto.toNumber() * 0.5; // 50% will close

      if (!byStage[deal.stage]) byStage[deal.stage] = 0;
      byStage[deal.stage] += weighted;
    });

    // Store snapshot
    await this.prisma.revenueSnapshot.upsert({
      where: { softwareId_mes: { softwareId, mes: month } },
      update: {
        expectedRevenue,
        bestCase,
        worstCase,
        dealsCount: deals.length,
      },
      create: {
        softwareId,
        mes: month,
        expectedRevenue,
        bestCase,
        worstCase,
        dealsCount: deals.length,
        confidence: 0.72,
      },
    });

    return {
      month,
      expectedRevenue,
      bestCase,
      worstCase,
      confidence: 0.72,
      dealsCount: deals.length,
      byStage,
    };
  }

  async getConversionRates(softwareId: string, days: number = 90): Promise<ConversionRates> {
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Query deals that transitioned between stages
    // For MVP, use point-in-time snapshots

    return {
      prospectToDemo: this.calculateStageConversion('PROSPECT', 'DEMO_SCHEDULED', since),
      demoToNegotiation: this.calculateStageConversion('DEMO_COMPLETED', 'NEGOTIATION', since),
      // ...more stages
    };
  }

  private async calculateStageConversion(
    fromStage: string,
    toStage: string,
    since: Date
  ): Promise<number> {
    // Would need to query deal_analyses or add a history table
    return 0.65; // Placeholder
  }
}

// backend/src/services/dealHealthMonitorService.ts

export class DealHealthMonitorService {
  constructor(private prisma: PrismaClient) {}

  async getAtRiskDeals(softwareId: string): Promise<Deal[]> {
    return this.prisma.deal.findMany({
      where: {
        lead: { softwareId },
        healthScore: { lt: 50 },
      },
      include: { lead: true },
      orderBy: { healthScore: 'asc' },
    });
  }

  async sendAtRiskAlerts(): Promise<void> {
    const atRiskDeals = await this.prisma.deal.findMany({
      where: { healthScore: { lt: 50 } },
      include: { lead: true },
    });

    for (const deal of atRiskDeals) {
      // Send Slack alert
      await this.sendSlackAlert(deal);
    }
  }

  private async sendSlackAlert(deal: Deal): Promise<void> {
    const message = `
🔴 Deal Alert: ${deal.nombre}
  Amount: €${deal.monto}
  Health: ${deal.healthScore}/100
  Last Activity: ${this.formatDate(deal.ultimaActividadAt)}
  Recommendation: Schedule call immediately
    `;

    // POST to Slack webhook
    // Implementation...
  }

  private formatDate(date: Date | null): string {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  }
}
```

---

## 5. FRONTEND COMPONENTS SPECIFICATION

### React Components

```tsx
// frontend/src/app/dashboard/deals/page.tsx

import { DealsBoard } from '@/components/revenue-intelligence/DealsBoard';
import { RevenueForecaster } from '@/components/revenue-intelligence/RevenueForecaster';
import { PipelineHealth } from '@/components/revenue-intelligence/PipelineHealth';
import { AtRiskAlerts } from '@/components/revenue-intelligence/AtRiskAlerts';

export default function DealsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Revenue Intelligence</h1>
      
      <AtRiskAlerts />
      <RevenueForecaster />
      <PipelineHealth />
      <DealsBoard />
    </div>
  );
}

// frontend/src/components/revenue-intelligence/DealsBoard.tsx

'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { DealCard } from './DealCard';

export function DealsBoard() {
  const [deals, setDeals] = useState([]);
  const [stage, setStage] = useState<string | undefined>(undefined);
  const [loading, setLoading] = useState(false);

  const api = useApi();

  useEffect(() => {
    setLoading(true);
    api.deals.list({ stage }).then((data) => {
      setDeals(data);
      setLoading(false);
    });
  }, [stage, api]);

  const stages = ['PROSPECT', 'DEMO_COMPLETED', 'NEGOTIATION', 'CLOSING'];
  const atRiskCount = deals.filter((d: any) => d.healthScore < 50).length;

  return (
    <div className="space-y-4">
      {/* Stage filter */}
      <div className="flex gap-2">
        <button
          onClick={() => setStage(undefined)}
          className={`px-4 py-2 rounded ${!stage ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
        >
          All ({deals.length})
        </button>
        {stages.map((s) => (
          <button
            key={s}
            onClick={() => setStage(s)}
            className={`px-4 py-2 rounded ${stage === s ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
          >
            {s} ({deals.filter((d: any) => d.stage === s).length})
          </button>
        ))}
      </div>

      {/* At-risk warning */}
      {atRiskCount > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-900 font-semibold">
            ⚠️ {atRiskCount} deals at risk (health < 50)
          </p>
        </div>
      )}

      {/* Deals grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {deals.map((deal: any) => (
          <DealCard key={deal.id} deal={deal} onUpdate={() => location.reload()} />
        ))}
      </div>
    </div>
  );
}

// frontend/src/components/revenue-intelligence/DealCard.tsx

export function DealCard({ deal, onUpdate }: any) {
  const healthColor = {
    green: deal.healthScore > 70,
    yellow: deal.healthScore > 50,
    orange: deal.healthScore > 30,
    red: deal.healthScore <= 30,
  };

  const bgClass = healthColor.red
    ? 'bg-red-50 border-red-200'
    : healthColor.orange
    ? 'bg-orange-50 border-orange-200'
    : healthColor.yellow
    ? 'bg-yellow-50 border-yellow-200'
    : 'bg-green-50 border-green-200';

  return (
    <div className={`${bgClass} border rounded-lg p-4 hover:shadow-lg transition`}>
      <div className="flex justify-between items-start mb-3">
        <div>
          <h3 className="font-semibold text-lg">{deal.lead.nombre}</h3>
          <p className="text-sm text-gray-600">{deal.lead.empresa}</p>
        </div>
        <div className="text-right">
          <p className="text-xl font-bold">€{deal.monto.toLocaleString()}</p>
          <p className="text-sm font-semibold text-blue-600">{deal.probabilidadCierre}%</p>
        </div>
      </div>

      {/* Stage badge */}
      <div className="mb-3">
        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-700 rounded text-xs font-semibold">
          {deal.stage}
        </span>
      </div>

      {/* Health progress */}
      <div className="mb-3">
        <div className="flex justify-between text-sm mb-1">
          <span className="text-gray-700">Health</span>
          <span className="font-semibold">{deal.healthScore}/100</span>
        </div>
        <div className="w-full bg-gray-300 rounded-full h-2 overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-red-500 to-green-500 transition-all"
            style={{ width: `${deal.healthScore}%` }}
          />
        </div>
      </div>

      {/* Key info */}
      <div className="text-sm text-gray-600 mb-4 space-y-1">
        <div>📞 {deal.activities?.length || 0} activities</div>
        <div>📅 Close by {new Date(deal.fechaCierreEstimada).toLocaleDateString()}</div>
        {deal.ultimaActividadAt && (
          <div>
            ⏱️ Last activity{' '}
            {Math.floor((Date.now() - new Date(deal.ultimaActividadAt).getTime()) / (1000 * 60 * 60 * 24))} days ago
          </div>
        )}
      </div>

      {/* Actions */}
      <button className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700">
        View Deal
      </button>
    </div>
  );
}

// frontend/src/components/revenue-intelligence/RevenueForecaster.tsx

'use client';

import { useState, useEffect } from 'react';
import { useApi } from '@/hooks/useApi';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export function RevenueForecaster() {
  const [forecast, setForecast] = useState<any>(null);
  const [month, setMonth] = useState(getCurrentMonth());
  const api = useApi();

  useEffect(() => {
    api.forecast.getMonth(month).then(setForecast);
  }, [month, api]);

  if (!forecast) return <div className="p-4 text-center">Loading forecast...</div>;

  const chartData = Object.entries(forecast.byStage || {}).map(([stage, value]) => ({
    stage,
    revenue: (value as number) / 1000,
  }));

  return (
    <div className="bg-white rounded-lg border p-6 space-y-6">
      <h2 className="text-2xl font-bold">Revenue Forecast — {month}</h2>

      {/* Summary cards */}
      <div className="grid grid-cols-4 gap-4">
        <Card title="Expected" value={`€${(forecast.expectedRevenue / 1000).toFixed(0)}K`} />
        <Card title="Best Case" value={`€${(forecast.bestCase / 1000).toFixed(0)}K`} />
        <Card title="Worst Case" value={`€${(forecast.worstCase / 1000).toFixed(0)}K`} />
        <Card
          title="Confidence"
          value={`${(forecast.confidence * 100).toFixed(0)}%`}
          className={forecast.confidence > 0.75 ? 'text-green-600' : 'text-yellow-600'}
        />
      </div>

      {/* By stage chart */}
      <div>
        <h3 className="font-semibold mb-4">Revenue by Stage</h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="stage" />
            <YAxis />
            <Tooltip formatter={(v) => `€${v}K`} />
            <Bar dataKey="revenue" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function Card({ title, value, className = '' }: any) {
  return (
    <div className="bg-gray-50 rounded-lg p-4 border">
      <p className="text-sm text-gray-600 mb-1">{title}</p>
      <p className={`text-2xl font-bold ${className}`}>{value}</p>
    </div>
  );
}

function getCurrentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}
```

---

## 6. CRON JOBS & BACKGROUND TASKS

### Cron Implementation (node-schedule)

```typescript
// backend/src/jobs/probabilityUpdateJob.ts

import * as schedule from 'node-schedule';
import { PrismaClient } from '@prisma/client';
import { DealProbabilityService } from '../services/dealProbabilityService';

export function startProbabilityUpdateJob() {
  // Run every day at 2 AM
  schedule.scheduleJob('0 2 * * *', async () => {
    const prisma = new PrismaClient();
    const probabilityService = new DealProbabilityService(prisma);

    try {
      console.log('[Cron] Starting probability update...');

      const softwares = await prisma.software.findMany({ where: { activo: true } });

      for (const software of softwares) {
        await probabilityService.updateAllProbabilities(software.id);
      }

      console.log('[Cron] Probability update completed');
    } catch (error) {
      console.error('[Cron] Probability update failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  });
}

// backend/src/jobs/healthMonitoringJob.ts

export function startHealthMonitoringJob() {
  // Run every hour
  schedule.scheduleJob('0 * * * *', async () => {
    const prisma = new PrismaClient();
    const healthService = new DealHealthMonitorService(prisma);

    try {
      console.log('[Cron] Starting health monitoring...');

      await healthService.sendAtRiskAlerts();

      console.log('[Cron] Health monitoring completed');
    } catch (error) {
      console.error('[Cron] Health monitoring failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  });
}

// backend/src/jobs/forecastGenerationJob.ts

export function startForecastGenerationJob() {
  // Run every day at 6 AM
  schedule.scheduleJob('0 6 * * *', async () => {
    const prisma = new PrismaClient();
    const forecasterService = new RevenueForecasterService(prisma);

    try {
      console.log('[Cron] Starting forecast generation...');

      const softwares = await prisma.software.findMany({ where: { activo: true } });
      const currentMonth = new Date().toISOString().slice(0, 7);

      for (const software of softwares) {
        await forecasterService.forecastMonth(software.id, currentMonth);
      }

      console.log('[Cron] Forecast generation completed');
    } catch (error) {
      console.error('[Cron] Forecast generation failed:', error);
    } finally {
      await prisma.$disconnect();
    }
  });
}

// backend/src/index.ts (main entry)

import { startProbabilityUpdateJob, startHealthMonitoringJob, startForecastGenerationJob } from './jobs';

// Initialize jobs on server start
startProbabilityUpdateJob();
startHealthMonitoringJob();
startForecastGenerationJob();
```

---

## 7. INTEGRATION POINTS

### Triggering from Existing Systems

```typescript
// Trigger when a call is completed
// backend/src/routes/llamadas.ts

router.post('/api/llamadas/:id/complete', async (req, res) => {
  const llamada = await prisma.llamadaReal.findUnique({
    where: { id: req.params.id },
    include: { lead: true },
  });

  // Find or create deal
  let deal = await prisma.deal.findUnique({
    where: { leadId: llamada.leadId },
  });

  if (!deal) {
    deal = await prisma.deal.create({
      data: {
        leadId: llamada.leadId,
        nombre: llamada.lead.nombre,
        monto: 0, // Default
        stage: 'PROSPECT',
      },
    });
  }

  // Add activity
  await prisma.dealActivity.create({
    data: {
      dealId: deal.id,
      tipo: 'CALL',
      canal: 'PHONE',
      duracion: llamada.duracionSeg || 0,
      resultado: llamada.estado === 'completada' ? 'CONNECTED' : 'VOICEMAIL',
      resumen: llamada.notasPost,
      external_id: llamada.zadarmaCallId,
    },
  });

  // Recalculate probability
  const probabilityService = new DealProbabilityService(prisma);
  const newProbability = await probabilityService.calculateProbability(deal.id);
  const newHealth = await probabilityService.calculateHealthScore(deal.id);

  await prisma.deal.update({
    where: { id: deal.id },
    data: {
      probabilidadCierre: newProbability,
      healthScore: newHealth,
      ultimaActividadAt: new Date(),
    },
  });

  res.json({ deal });
});
```

---

## 8. TESTING STRATEGY

### Unit Tests

```typescript
// backend/src/__tests__/dealProbability.test.ts

import { describe, it, expect } from '@jest/globals';
import { DealProbabilityService } from '../services/dealProbabilityService';

describe('DealProbabilityService', () => {
  it('should calculate base probability by stage', () => {
    const service = new DealProbabilityService(prisma);

    // PROSPECT stage = 20%
    expect(service.stageProbability['PROSPECT']).toBe(20);

    // CLOSING stage = 90%
    expect(service.stageProbability['CLOSING']).toBe(90);
  });

  it('should apply activity multiplier', async () => {
    // Test with 0 activities → 0.7x multiplier
    // Test with 3+ activities → 1.2x multiplier
  });

  it('should apply time in stage penalty', async () => {
    // Test with deal > 45 days in stage → 0.6x
  });

  it('should apply ICP bonus', async () => {
    // Test with ICP match → 1.15x
  });
});

describe('RevenueForecasterService', () => {
  it('should generate forecast for month', async () => {
    const service = new RevenueForecasterService(prisma);
    const forecast = await service.forecastMonth('software-1', '2026-06');

    expect(forecast).toHaveProperty('expectedRevenue');
    expect(forecast).toHaveProperty('bestCase');
    expect(forecast).toHaveProperty('worstCase');
  });

  it('should only include non-LOST, non-PROSPECT deals', async () => {
    // Verify deals in LOST/PROSPECT are excluded
  });
});
```

### Integration Tests

```typescript
// backend/src/__tests__/dealWorkflow.test.ts

describe('Deal Workflow Integration', () => {
  it('should create deal when lead is qualified', async () => {
    // 1. Create lead
    const lead = await prisma.lead.create({...});

    // 2. Transition to CALIFICADO
    await api.patch(`/leads/${lead.id}`, { estado: 'CALIFICADO' });

    // 3. Verify deal created
    const deal = await prisma.deal.findUnique({ where: { leadId: lead.id } });
    expect(deal).toBeDefined();
    expect(deal.stage).toBe('PROSPECT');
  });

  it('should update probability after call', async () => {
    // 1. Create deal
    const deal = await prisma.deal.create({...});
    const initialProb = deal.probabilidadCierre;

    // 2. Add call activity
    await api.post(`/deals/${deal.id}/activities`, {
      tipo: 'CALL',
      resultado: 'CONNECTED',
    });

    // 3. Verify probability increased
    const updated = await prisma.deal.findUnique({ where: { id: deal.id } });
    expect(updated.probabilidadCierre).toBeGreaterThan(initialProb);
  });
});
```

---

## 9. DEPLOYMENT CHECKLIST

### Phase 1 Deployment (Week 4, 30 days after start)

```
PRE-DEPLOYMENT
☐ Code review (2 reviewers min)
☐ All tests passing (unit + integration)
☐ Performance testing (1000 deals, waterfall < 500ms)
☐ Database backup
☐ Rollback plan documented

DEPLOYMENT
☐ Deploy migrations to staging
☐ Test API endpoints on staging
☐ Deploy backend service
☐ Deploy frontend
☐ Verify Slack alerts working
☐ Verify cron jobs running

POST-DEPLOYMENT
☐ Monitor error logs for 24h
☐ Validate forecast accuracy
☐ Collect user feedback
☐ Performance monitoring

ROLLBACK (if needed)
☐ Revert database migrations
☐ Redeploy previous backend
☐ Clear Redis cache
```

### Feature Flags

```typescript
// Use feature flags for gradual rollout

if (process.env.FEATURE_REVENUE_INTELLIGENCE === 'true') {
  // Show new dashboard
}
```

---

## Appendix A: Database Migration Command

```bash
# Generate migration
npx prisma migrate dev --name add_revenue_intelligence

# Deploy to production
npx prisma migrate deploy

# Check status
npx prisma migrate status
```

---

**Status:** Ready for Engineering Sprint Planning  
**Next Step:** Assign tasks, establish sprint velocity, kickoff development
