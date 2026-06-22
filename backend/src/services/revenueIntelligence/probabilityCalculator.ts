import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

export interface DealProbability {
  dealId: string;
  baseProbability: number;
  adjustedProbability: number;
  factors: {
    stageMultiplier: number;
    timeDecayFactor: number;
    historicalWinRate: number;
    engagementScore: number;
  };
  confidenceScore: number;
}

const STAGE_PROBABILITY_MAP: Record<string, number> = {
  'PROSPECT': 0.10,
  'DEMO_SCHEDULED': 0.25,
  'DEMO_COMPLETED': 0.45,
  'NEGOTIATION': 0.70,
  'CLOSING': 0.90,
  'WON': 1.0,
  'LOST': 0.0,
};

export class ProbabilityCalculator {
  /**
   * Calculate win probability for a deal based on multiple factors
   */
  async calculateDealProbability(dealId: string): Promise<DealProbability> {
    try {
      // Get deal information
      const deal = await prisma.deal.findUnique({
        where: { id: dealId },
        include: {
          lead: true,
          activities: {
            orderBy: { fechaHora: 'desc' },
            take: 10,
          },
        },
      });

      if (!deal) {
        throw new Error(`Deal ${dealId} not found`);
      }

      // Base probability from deal stage
      const stageMultiplier = STAGE_PROBABILITY_MAP[deal.stage] || 0.5;

      // Calculate time decay factor (newer deals have higher probability)
      const daysSinceCreation = Math.floor(
        (Date.now() - deal.createdAt.getTime()) / (1000 * 60 * 60 * 24)
      );
      const timeDecayFactor = Math.max(0.5, 1 - daysSinceCreation * 0.01);

      // Get historical win rate for similar deals from the same lead
      const leadDeals = await prisma.deal.findMany({
        where: {
          leadId: deal.leadId,
          stage: { in: ['WON', 'LOST'] },
        },
      });

      const wonDeals = leadDeals.filter((d) => d.stage === 'WON').length;
      const totalDeals = leadDeals.length;
      const historicalWinRate = totalDeals > 0 ? wonDeals / totalDeals : 0.5;

      // Calculate engagement score (based on recent activities)
      const engagementScore = Math.min(1.0, deal.activities.length * 0.15);

      // Combine factors with weighted formula
      const adjustedProbability = Math.min(
        1.0,
        stageMultiplier *
        timeDecayFactor *
        (0.6 * historicalWinRate + 0.4 * engagementScore)
      );

      // Confidence based on data points available
      const confidenceScore = Math.min(1.0, (totalDeals + engagementScore) / 10);

      return {
        dealId,
        baseProbability: stageMultiplier,
        adjustedProbability: Number(adjustedProbability.toFixed(3)),
        factors: {
          stageMultiplier: Number(stageMultiplier.toFixed(2)),
          timeDecayFactor: Number(timeDecayFactor.toFixed(2)),
          historicalWinRate: Number(historicalWinRate.toFixed(2)),
          engagementScore: Number(engagementScore.toFixed(2)),
        },
        confidenceScore: Number(confidenceScore.toFixed(2)),
      };
    } catch (error) {
      logger.error(`Error calculating probability for deal ${dealId}:`, error);
      throw error;
    }
  }

  /**
   * Calculate probabilities for multiple deals (batch)
   */
  async calculateBatchProbabilities(dealIds: string[]): Promise<DealProbability[]> {
    const results: DealProbability[] = [];

    for (const dealId of dealIds) {
      try {
        const prob = await this.calculateDealProbability(dealId);
        results.push(prob);
      } catch (error) {
        logger.warn(`Skipping deal ${dealId} due to error:`, error);
      }
    }

    return results;
  }

  /**
   * Get win rate statistics by stage
   */
  async getWinRateByStage(): Promise<Record<string, { wins: number; total: number; winRate: number }>> {
    const deals = await prisma.deal.findMany({
      select: {
        stage: true,
      },
    });

    const stats: Record<string, { wins: number; total: number; winRate: number }> = {};

    for (const stage of Object.keys(STAGE_PROBABILITY_MAP)) {
      const stageDealIds = deals.filter((d) => d.stage === stage);
      const wonCount = stageDealIds.filter((d) => d.stage === 'WON').length;
      const total = stageDealIds.length;

      stats[stage] = {
        wins: wonCount,
        total,
        winRate: total > 0 ? wonCount / total : 0,
      };
    }

    return stats;
  }
}
