import { Router, Request, Response } from 'express';
import {
  scoreLeadFull,
  scoreLeadsForSoftware,
  saveLeadScore,
  getRoutingRecommendations,
  scoreLeadWithSignals,
  LeadScoringInput,
} from '../services/leadScoringService';
import { logger } from '../utils/logger';

const router = Router();

/**
 * POST /api/lead-scoring/score
 * Score a single lead with provided or fetched signals
 */
router.post('/score', async (req: Request, res: Response) => {
  try {
    const { leadId, softwareId, fetchFromDb = false, engagement, fit, behavior } = req.body;

    if (!leadId || !softwareId) {
      return res.status(400).json({ error: 'leadId and softwareId are required' });
    }

    const score = fetchFromDb
      ? await scoreLeadFull(leadId, softwareId)
      : await scoreLeadWithSignals({
          leadId,
          softwareId,
          engagement,
          fit,
          behavior,
        });

    res.json({ success: true, data: score });
  } catch (err) {
    logger.error('Lead scoring error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/lead-scoring/score-and-save
 * Score a lead and save the result to database metadata
 */
router.post('/score-and-save', async (req: Request, res: Response) => {
  try {
    const { leadId, softwareId } = req.body;

    if (!leadId || !softwareId) {
      return res.status(400).json({ error: 'leadId and softwareId are required' });
    }

    const score = await scoreLeadFull(leadId, softwareId);
    await saveLeadScore(leadId, score);

    res.json({ success: true, data: score, message: 'Lead score saved to metadata' });
  } catch (err) {
    logger.error('Lead scoring and save error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/lead-scoring/software/:softwareId
 * Score all leads for a software and return routing recommendations
 */
router.get('/software/:softwareId', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const { limit = 100 } = req.query;

    const scores = await scoreLeadsForSoftware(softwareId, parseInt(limit as string));
    const recommendations = await getRoutingRecommendations(softwareId);

    res.json({
      success: true,
      data: {
        scores,
        recommendations,
        summary: {
          totalLeads: scores.length,
          nurtureLead: recommendations.nurtureLead.length,
          salesQualified: recommendations.salesQualified.length,
          vipPriority: recommendations.vipPriority.length,
        },
      },
    });
  } catch (err) {
    logger.error('Software lead scoring error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * GET /api/lead-scoring/software/:softwareId/routing
 * Get routing recommendations for a software
 */
router.get('/software/:softwareId/routing', async (req: Request, res: Response) => {
  try {
    const { softwareId } = req.params;
    const recommendations = await getRoutingRecommendations(softwareId);

    res.json({
      success: true,
      data: recommendations,
      summary: {
        nurtureLead: recommendations.nurtureLead.length,
        salesQualified: recommendations.salesQualified.length,
        vipPriority: recommendations.vipPriority.length,
      },
    });
  } catch (err) {
    logger.error('Routing recommendations error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

/**
 * POST /api/lead-scoring/batch
 * Score multiple leads in batch
 */
router.post('/batch', async (req: Request, res: Response) => {
  try {
    const { leadIds, softwareId } = req.body;

    if (!leadIds || !Array.isArray(leadIds) || !softwareId) {
      return res.status(400).json({ error: 'leadIds (array) and softwareId are required' });
    }

    const results: Array<{
      leadId: string;
      score: number;
      nextAction: string;
      success: boolean;
      error?: string;
    }> = [];

    for (const leadId of leadIds) {
      try {
        const score = await scoreLeadFull(leadId, softwareId);
        await saveLeadScore(leadId, score);
        results.push({
          leadId,
          score: score.totalScore,
          nextAction: score.nextAction,
          success: true,
        });
      } catch (err) {
        results.push({
          leadId,
          score: 0,
          nextAction: 'unknown',
          success: false,
          error: (err as Error).message,
        });
      }
    }

    const successful = results.filter((r) => r.success).length;
    res.json({
      success: true,
      data: results,
      summary: {
        total: results.length,
        successful,
        failed: results.length - successful,
      },
    });
  } catch (err) {
    logger.error('Batch lead scoring error:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});

export default router;
