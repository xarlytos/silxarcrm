import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import { prisma } from '../config/database';
import { ProbabilityCalculator } from '../services/revenueIntelligence/probabilityCalculator';
import { ForecastEngine } from '../services/revenueIntelligence/forecastEngine';

const router = Router();
const probabilityCalculator = new ProbabilityCalculator();
const forecastEngine = new ForecastEngine();

// Middleware
router.use(authMiddleware);

/**
 * GET /api/revenue/deals
 * Retrieve all deals with optional filtering
 */
router.get('/deals', async (req: Request, res: Response) => {
  try {
    const { stage, softwareId, skip = 0, take = 20 } = req.query;

    const where: any = {};
    if (stage) where.stage = stage;
    if (softwareId) where.softwareId = softwareId;

    const deals = await prisma.deal.findMany({
      where,
      include: {
        lead: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        activities: {
          take: 5,
          orderBy: { fechaHora: 'desc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
      skip: parseInt(skip as string),
      take: parseInt(take as string),
    });

    const total = await prisma.deal.count({ where });

    res.json({
      success: true,
      data: deals,
      pagination: {
        skip: parseInt(skip as string),
        take: parseInt(take as string),
        total,
      },
    });
  } catch (error) {
    logger.error('Error fetching deals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deals' });
  }
});

/**
 * GET /api/revenue/deals/:id
 * Retrieve a specific deal with detailed information
 */
router.get('/deals/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const deal = await prisma.deal.findUnique({
      where: { id },
      include: {
        lead: true,
        activities: {
          orderBy: { fechaHora: 'desc' },
        },
        analysis: true,
      },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    // Calculate probability for this deal
    const probability = await probabilityCalculator.calculateDealProbability(id);

    res.json({
      success: true,
      data: {
        ...deal,
        probability,
      },
    });
  } catch (error) {
    logger.error('Error fetching deal:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deal' });
  }
});

/**
 * POST /api/revenue/deals/:id/activities
 * Add an activity/interaction to a deal
 */
router.post('/deals/:id/activities', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { tipo, canal, resultado, resumen, transcript, duracionSeg } = req.body;

    // Validate deal exists
    const deal = await prisma.deal.findUnique({
      where: { id },
    });

    if (!deal) {
      return res.status(404).json({ success: false, error: 'Deal not found' });
    }

    // Validate activity type
    const validActivityTypes = ['CALL', 'EMAIL', 'WHATSAPP', 'DEMO', 'MEETING', 'PROPOSAL'];
    if (tipo && !validActivityTypes.includes(tipo.toUpperCase())) {
      return res.status(400).json({
        success: false,
        error: `Invalid activity type. Must be one of: ${validActivityTypes.join(', ')}`,
      });
    }

    // Create activity
    const activity = await prisma.dealActivity.create({
      data: {
        dealId: id,
        tipo: tipo?.toUpperCase() || 'CALL',
        canal: canal || null,
        resultado: resultado || null,
        resumen: resumen || null,
        transcript: transcript || null,
        duracionSeg: duracionSeg || null,
        fechaHora: new Date(),
      },
    });

    // Update deal's last activity timestamp
    await prisma.deal.update({
      where: { id },
      data: { ultimaActividadAt: new Date() },
    });

    // Recalculate deal probability after activity
    const updatedProbability = await probabilityCalculator.calculateDealProbability(id);

    res.status(201).json({
      success: true,
      data: {
        activity,
        updatedProbability,
      },
    });
  } catch (error) {
    logger.error('Error creating activity:', error);
    res.status(500).json({ success: false, error: 'Failed to create activity' });
  }
});

/**
 * GET /api/revenue/forecast
 * Generate revenue forecast for upcoming months
 */
router.get('/forecast', async (req: Request, res: Response) => {
  try {
    const { months = 3 } = req.query;
    const forecastMonths = parseInt(months as string) || 3;

    const forecast = await forecastEngine.generateForecast(forecastMonths);

    // Also get accuracy metrics
    const accuracy = await forecastEngine.getForecastAccuracy(3);

    res.json({
      success: true,
      data: {
        forecast,
        accuracy,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error generating forecast:', error);
    res.status(500).json({ success: false, error: 'Failed to generate forecast' });
  }
});

/**
 * GET /api/revenue/pipeline-health
 * Get comprehensive pipeline health metrics and analysis
 */
router.get('/pipeline-health', async (req: Request, res: Response) => {
  try {
    const health = await forecastEngine.calculatePipelineHealth();

    // Get win rate by stage
    const winRateByStage = await probabilityCalculator.getWinRateByStage();

    res.json({
      success: true,
      data: {
        health,
        winRateByStage,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    logger.error('Error calculating pipeline health:', error);
    res.status(500).json({ success: false, error: 'Failed to calculate pipeline health' });
  }
});

/**
 * GET /api/revenue/deals-by-probability
 * Get all deals sorted by win probability
 */
router.get('/deals-by-probability', async (req: Request, res: Response) => {
  try {
    const deals = await prisma.deal.findMany({
      where: {
        stage: { notIn: ['WON', 'LOST'] },
      },
      select: {
        id: true,
        nombre: true,
        monto: true,
        stage: true,
        leadId: true,
        lead: {
          select: { nombre: true, email: true },
        },
      },
    });

    // Calculate probabilities for all deals
    const dealsWithProbability = await Promise.all(
      deals.map(async (deal) => {
        const probability = await probabilityCalculator.calculateDealProbability(deal.id);
        return {
          ...deal,
          probability: probability.adjustedProbability,
          expectedValue: Number(deal.monto) * probability.adjustedProbability,
        };
      })
    );

    // Sort by probability descending
    dealsWithProbability.sort((a, b) => b.probability - a.probability);

    res.json({
      success: true,
      data: dealsWithProbability,
      count: dealsWithProbability.length,
    });
  } catch (error) {
    logger.error('Error fetching deals by probability:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch deals by probability' });
  }
});

/**
 * GET /api/revenue/at-risk-deals
 * Get deals at risk of being lost
 */
router.get('/at-risk-deals', async (req: Request, res: Response) => {
  try {
    const { probabilityThreshold = 0.3 } = req.query;
    const threshold = parseFloat(probabilityThreshold as string) || 0.3;

    const deals = await prisma.deal.findMany({
      where: {
        stage: { notIn: ['WON', 'LOST'] },
      },
      include: {
        lead: {
          select: { nombre: true, email: true },
        },
        activities: {
          take: 5,
          orderBy: { fechaHora: 'desc' },
        },
      },
    });

    const atRiskDeals = [];

    for (const deal of deals) {
      const probability = await probabilityCalculator.calculateDealProbability(deal.id);

      if (probability.adjustedProbability < threshold) {
        atRiskDeals.push({
          ...deal,
          probability: probability.adjustedProbability,
          expectedValue: Number(deal.monto) * probability.adjustedProbability,
          riskLevel: probability.adjustedProbability < 0.1 ? 'critical' : 'warning',
        });
      }
    }

    // Sort by probability ascending (highest risk first)
    atRiskDeals.sort((a, b) => a.probability - b.probability);

    res.json({
      success: true,
      data: atRiskDeals,
      count: atRiskDeals.length,
      riskThreshold: threshold,
    });
  } catch (error) {
    logger.error('Error fetching at-risk deals:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch at-risk deals' });
  }
});

export default router;
