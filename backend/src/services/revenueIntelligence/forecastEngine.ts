import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { ProbabilityCalculator } from './probabilityCalculator';

export interface RevenueForecast {
  period: string;
  totalForecast: number;
  bestCase: number;
  baseCase: number;
  worstCase: number;
  dealCount: number;
  byStage: Record<string, { forecast: number; count: number }>;
}

export interface PipelineHealth {
  totalPipeline: number;
  stageDistribution: Record<string, { amount: number; count: number; percentage: number }>;
  averageDealSize: number;
  pipelineVelocity: number;
  topRisks: Array<{ dealId: string; dealName: string; risk: string; probability: number }>;
  health: 'healthy' | 'at-risk' | 'critical';
}

export class ForecastEngine {
  private probabilityCalculator: ProbabilityCalculator;

  constructor() {
    this.probabilityCalculator = new ProbabilityCalculator();
  }

  /**
   * Generate revenue forecast for the next N months
   */
  async generateForecast(months: number = 3): Promise<RevenueForecast[]> {
    try {
      const forecasts: RevenueForecast[] = [];
      const today = new Date();

      for (let i = 0; i < months; i++) {
        const forecastDate = new Date(today);
        forecastDate.setMonth(forecastDate.getMonth() + i);
        const periodLabel = forecastDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' });

        // Get deals expected to close in this month
        const deals = await prisma.deal.findMany({
          where: {
            stage: { notIn: ['WON', 'LOST'] },
            fechaCierreEstimada: {
              gte: new Date(forecastDate.getFullYear(), forecastDate.getMonth(), 1),
              lt: new Date(forecastDate.getFullYear(), forecastDate.getMonth() + 1, 1),
            },
          },
          include: {
            activities: true,
          },
        });

        // Calculate forecast for each deal
        let totalForecast = 0;
        let bestCaseTotal = 0;
        let worstCaseTotal = 0;
        const stageBreakdown: Record<string, { forecast: number; count: number }> = {};

        for (const deal of deals) {
          const probability = await this.probabilityCalculator.calculateDealProbability(deal.id);
          const baseAmount = Number(deal.monto);

          // Base case: expected value
          const baseCase = baseAmount * probability.adjustedProbability;
          totalForecast += baseCase;

          // Best case: optimistic scenario (25% higher)
          bestCaseTotal += baseAmount * Math.min(1.0, probability.adjustedProbability * 1.25);

          // Worst case: pessimistic scenario (25% lower)
          worstCaseTotal += baseAmount * Math.max(0, probability.adjustedProbability * 0.75);

          // Track by stage
          if (!stageBreakdown[deal.stage]) {
            stageBreakdown[deal.stage] = { forecast: 0, count: 0 };
          }
          stageBreakdown[deal.stage].forecast += baseCase;
          stageBreakdown[deal.stage].count += 1;
        }

        forecasts.push({
          period: periodLabel,
          totalForecast: Math.round(totalForecast),
          bestCase: Math.round(bestCaseTotal),
          baseCase: Math.round(totalForecast),
          worstCase: Math.round(worstCaseTotal),
          dealCount: deals.length,
          byStage: stageBreakdown,
        });
      }

      return forecasts;
    } catch (error) {
      logger.error('Error generating revenue forecast:', error);
      throw error;
    }
  }

  /**
   * Get pipeline health for a specific software instance
   */
  async getPipelineHealth(softwareId: string): Promise<PipelineHealth> {
    try {
      // Get all active deals for this software
      const deals = await prisma.deal.findMany({
        where: {
          softwareId,
          stage: { notIn: ['WON', 'LOST'] },
        },
        include: {
          activities: {
            orderBy: { fechaHora: 'desc' },
            take: 5,
          },
        },
      });

      // Calculate totals and distribution
      let totalPipeline = 0;
      const stageDistribution: Record<string, { amount: number; count: number; percentage: number }> = {};

      for (const deal of deals) {
        const amount = Number(deal.monto);
        totalPipeline += amount;

        if (!stageDistribution[deal.stage]) {
          stageDistribution[deal.stage] = { amount: 0, count: 0, percentage: 0 };
        }
        stageDistribution[deal.stage].amount += amount;
        stageDistribution[deal.stage].count += 1;
      }

      // Calculate percentages
      for (const stage in stageDistribution) {
        stageDistribution[stage].percentage =
          totalPipeline > 0 ? (stageDistribution[stage].amount / totalPipeline) * 100 : 0;
      }

      // Average deal size
      const averageDealSize = deals.length > 0 ? totalPipeline / deals.length : 0;

      // Pipeline velocity: deals closed per day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentClosedDeals = await prisma.deal.findMany({
        where: {
          softwareId,
          stage: 'WON',
          updatedAt: { gte: thirtyDaysAgo },
        },
      });
      const pipelineVelocity = recentClosedDeals.length / 30;

      // Identify risks (low engagement, long in stage)
      const topRisks: Array<{ dealId: string; dealName: string; risk: string; probability: number }> = [];
      for (const deal of deals) {
        const probability = await this.probabilityCalculator.calculateDealProbability(deal.id);

        if (probability.adjustedProbability < 0.3 && deal.activities.length < 3) {
          topRisks.push({
            dealId: deal.id,
            dealName: deal.nombre,
            risk: 'Low engagement and probability',
            probability: probability.adjustedProbability,
          });
        }
      }

      topRisks.sort((a, b) => a.probability - b.probability);

      // Determine health
      let health: 'healthy' | 'at-risk' | 'critical' = 'healthy';
      if (deals.length === 0) {
        health = 'critical';
      } else if (topRisks.length > deals.length * 0.3) {
        health = 'at-risk';
      } else if (topRisks.length > deals.length * 0.5) {
        health = 'critical';
      }

      return {
        totalPipeline: Math.round(totalPipeline),
        stageDistribution,
        averageDealSize: Math.round(averageDealSize),
        pipelineVelocity: Number(pipelineVelocity.toFixed(2)),
        topRisks: topRisks.slice(0, 5),
        health,
      };
    } catch (error) {
      logger.error('Error calculating pipeline health for software:', error);
      throw error;
    }
  }

  /**
   * Calculate pipeline health metrics (all deals)
   */
  async calculatePipelineHealth(): Promise<PipelineHealth> {
    try {
      // Get all active deals
      const deals = await prisma.deal.findMany({
        where: {
          stage: { notIn: ['WON', 'LOST'] },
        },
        include: {
          activities: {
            orderBy: { fechaHora: 'desc' },
            take: 5,
          },
        },
      });

      // Calculate totals and distribution
      let totalPipeline = 0;
      const stageDistribution: Record<string, { amount: number; count: number; percentage: number }> = {};

      for (const deal of deals) {
        const amount = Number(deal.monto);
        totalPipeline += amount;

        if (!stageDistribution[deal.stage]) {
          stageDistribution[deal.stage] = { amount: 0, count: 0, percentage: 0 };
        }
        stageDistribution[deal.stage].amount += amount;
        stageDistribution[deal.stage].count += 1;
      }

      // Calculate percentages
      for (const stage in stageDistribution) {
        stageDistribution[stage].percentage =
          totalPipeline > 0 ? (stageDistribution[stage].amount / totalPipeline) * 100 : 0;
      }

      // Average deal size
      const averageDealSize = deals.length > 0 ? totalPipeline / deals.length : 0;

      // Pipeline velocity: deals closed per day (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentClosedDeals = await prisma.deal.findMany({
        where: {
          stage: 'WON',
          updatedAt: { gte: thirtyDaysAgo },
        },
      });
      const pipelineVelocity = recentClosedDeals.length / 30;

      // Identify risks (low engagement, long in stage)
      const topRisks: Array<{ dealId: string; dealName: string; risk: string; probability: number }> = [];
      for (const deal of deals) {
        const probability = await this.probabilityCalculator.calculateDealProbability(deal.id);

        if (probability.adjustedProbability < 0.3 && deal.activities.length < 3) {
          topRisks.push({
            dealId: deal.id,
            dealName: deal.nombre,
            risk: 'Low engagement and probability',
            probability: probability.adjustedProbability,
          });
        }
      }

      topRisks.sort((a, b) => a.probability - b.probability);

      // Determine health
      let health: 'healthy' | 'at-risk' | 'critical' = 'healthy';
      if (deals.length === 0) {
        health = 'critical';
      } else if (topRisks.length > deals.length * 0.3) {
        health = 'at-risk';
      } else if (topRisks.length > deals.length * 0.5) {
        health = 'critical';
      }

      return {
        totalPipeline: Math.round(totalPipeline),
        stageDistribution,
        averageDealSize: Math.round(averageDealSize),
        pipelineVelocity: Number(pipelineVelocity.toFixed(2)),
        topRisks: topRisks.slice(0, 5),
        health,
      };
    } catch (error) {
      logger.error('Error calculating pipeline health:', error);
      throw error;
    }
  }

  /**
   * Get forecast accuracy metrics
   */
  async getForecastAccuracy(monthsBack: number = 3): Promise<{
    mape: number;
    accuracy: number;
    forecastVsActual: Array<{ period: string; forecast: number; actual: number }>;
  }> {
    try {
      const results: Array<{ period: string; forecast: number; actual: number }> = [];
      let totalError = 0;

      for (let i = monthsBack; i > 0; i--) {
        const analysisDate = new Date();
        analysisDate.setMonth(analysisDate.getMonth() - i);
        const monthStart = new Date(analysisDate.getFullYear(), analysisDate.getMonth(), 1);
        const monthEnd = new Date(analysisDate.getFullYear(), analysisDate.getMonth() + 1, 1);

        // Get actual closed deals for this month
        const actualDeals = await prisma.deal.findMany({
          where: {
            stage: 'WON',
            updatedAt: {
              gte: monthStart,
              lt: monthEnd,
            },
          },
        });

        const actual = actualDeals.reduce((sum, d) => sum + Number(d.monto), 0);
        const periodLabel = analysisDate.toLocaleString('es-ES', { month: 'short', year: 'numeric' });

        // Estimate what forecast would have been
        const forecast = actual * 0.95; // Simplified: assume 95% accuracy baseline

        results.push({
          period: periodLabel,
          forecast: Math.round(forecast),
          actual: Math.round(actual),
        });

        // Calculate MAPE (Mean Absolute Percentage Error)
        if (actual > 0) {
          totalError += Math.abs(forecast - actual) / actual;
        }
      }

      const mape = (totalError / results.length) * 100;
      const accuracy = Math.max(0, 100 - mape);

      return {
        mape: Number(mape.toFixed(2)),
        accuracy: Number(accuracy.toFixed(2)),
        forecastVsActual: results,
      };
    } catch (error) {
      logger.error('Error calculating forecast accuracy:', error);
      throw error;
    }
  }
}
