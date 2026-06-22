import { Router, Request, Response } from 'express';
import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  generateOfferRecommendation,
  createABTest,
  concludeABTest,
  getOfferPerformance,
  getActiveTests,
  extractProspectSignals,
  PricingStrategy,
} from '../services/offerOptimizerService';
import {
  generateDynamicOfferForAgent,
  recordOfferAcceptance,
  recordOfferRejection,
  testIntegration,
} from '../services/agentOfferIntegrationService';

const router = Router();

/**
 * POST /api/offers/generate
 * Generate a dynamic offer for a lead
 */
router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { leadId, softwareId } = req.body;

    if (!leadId || !softwareId) {
      return res.status(400).json({
        error: 'Missing leadId or softwareId',
      });
    }

    const signals = await extractProspectSignals(leadId);
    const recommendation = await generateOfferRecommendation(
      leadId,
      softwareId,
      signals
    );

    res.json({ success: true, recommendation });
  } catch (err: any) {
    logger.error('Error generating offer:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/offers/agent-script
 * Get formatted offer script for agent delivery
 */
router.post('/agent-script', async (req: Request, res: Response) => {
  try {
    const { leadId, softwareId } = req.body;

    if (!leadId || !softwareId) {
      return res.status(400).json({
        error: 'Missing leadId or softwareId',
      });
    }

    const { offer, agentScript, followUpActionItems } =
      await generateDynamicOfferForAgent(leadId, softwareId);

    res.json({
      success: true,
      offer,
      agentScript,
      followUpActionItems,
    });
  } catch (err: any) {
    logger.error('Error generating agent script:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/offers/acceptance
 * Record offer acceptance
 */
router.post('/acceptance', async (req: Request, res: Response) => {
  try {
    const { leadId, softwareId, dealValue } = req.body;

    if (!leadId || !softwareId) {
      return res.status(400).json({
        error: 'Missing leadId or softwareId',
      });
    }

    await recordOfferAcceptance(leadId, softwareId, dealValue);

    res.json({
      success: true,
      message: 'Offer acceptance recorded',
    });
  } catch (err: any) {
    logger.error('Error recording acceptance:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/offers/rejection
 * Record offer rejection
 */
router.post('/rejection', async (req: Request, res: Response) => {
  try {
    const { leadId, softwareId, reason } = req.body;

    if (!leadId || !softwareId) {
      return res.status(400).json({
        error: 'Missing leadId or softwareId',
      });
    }

    await recordOfferRejection(leadId, softwareId, reason);

    res.json({
      success: true,
      message: 'Offer rejection recorded',
    });
  } catch (err: any) {
    logger.error('Error recording rejection:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/offers/performance/:softwareId
 * Get offer performance metrics
 */
router.get('/performance/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const performance = await getOfferPerformance(softwareId);

    res.json({
      success: true,
      performance,
    });
  } catch (err: any) {
    logger.error('Error fetching performance:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/offers/ab-test/create
 * Create new A/B test for pricing strategies
 */
router.post('/ab-test/create', async (req: Request, res: Response) => {
  try {
    const { softwareId, strategyA, strategyB, strategyC } = req.body;

    if (!softwareId) {
      return res.status(400).json({ error: 'Missing softwareId' });
    }

    const test = await createABTest(
      softwareId,
      strategyA || PricingStrategy.FIXED,
      strategyB || PricingStrategy.DYNAMIC,
      strategyC || PricingStrategy.PSYCHOLOGICAL
    );

    res.json({
      success: true,
      test,
      message: `A/B test created with 3 pricing strategies`,
    });
  } catch (err: any) {
    logger.error('Error creating A/B test:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/offers/ab-test/active/:softwareId
 * Get active A/B tests
 */
router.get('/ab-test/active/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const tests = await getActiveTests(softwareId);

    res.json({
      success: true,
      tests,
      count: tests.length,
    });
  } catch (err: any) {
    logger.error('Error fetching active tests:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/offers/ab-test/conclude/:testId
 * Conclude A/B test and determine winner
 */
router.post('/ab-test/conclude/:testId', async (req: Request, res: Response) => {
  try {
    const { testId } = req.params;
    const winner = await concludeABTest(testId);

    res.json({
      success: true,
      winner,
      message: `A/B test concluded. Variant ${winner} is the winner!`,
    });
  } catch (err: any) {
    logger.error('Error concluding test:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/offers/integration-test/:softwareId
 * Run integration test
 */
router.get('/integration-test/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const result = await testIntegration(softwareId);

    res.json({
      success: true,
      ...result,
    });
  } catch (err: any) {
    logger.error('Error running integration test:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/offers/logs/:softwareId
 * Get offer logs with pagination
 */
router.get('/logs/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const { skip = 0, take = 50 } = req.query;

    const logs = await prisma.offerLog.findMany({
      where: { softwareId },
      select: {
        id: true,
        leadId: true,
        recommendation: true,
        accepted: true,
        dealValue: true,
        closedAt: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
      skip: parseInt(skip as string),
      take: parseInt(take as string),
    });

    const total = await prisma.offerLog.count({
      where: { softwareId },
    });

    res.json({
      success: true,
      logs,
      pagination: {
        skip: parseInt(skip as string),
        take: parseInt(take as string),
        total,
      },
    });
  } catch (err: any) {
    logger.error('Error fetching logs:', err);
    res.status(500).json({ error: err.message });
  }
});

export default router;
