import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { logger } from '../utils/logger';
import {
  cacheConversationTurn,
  getProspectMemory,
  detectRepetition,
  generateMemoryAlerts,
  formatMemorySummary,
  resetProspectMemory,
  getConversationExcerpt,
  ConversationTurn,
} from '../services/memoryGuardianService';

const router = Router();

/**
 * Real-time Memory Guardian API
 * Endpoints for caching conversations, detecting repetitions, and generating alerts
 */

// ════════════════════════════════════════════════════════════════
// === PUBLIC ENDPOINTS (with API key) ===
// ════════════════════════════════════════════════════════════════

/**
 * POST /api/memory-guardian/cache
 * Cache a conversation turn for a prospect
 *
 * Body:
 * {
 *   leadId: string
 *   softwareId: string
 *   role: 'prospect' | 'agent'
 *   message: string
 *   callId?: string
 *   duration?: number (in seconds)
 *   transcript?: string
 * }
 */
router.post('/cache', async (req: Request, res: Response) => {
  try {
    const { leadId, softwareId, role, message, callId, duration, transcript } = req.body;

    if (!leadId || !softwareId || !role || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: leadId, softwareId, role, message',
      });
    }

    if (role !== 'prospect' && role !== 'agent') {
      return res.status(400).json({
        success: false,
        error: 'role must be "prospect" or "agent"',
      });
    }

    const turn: ConversationTurn = {
      role,
      timestamp: new Date(),
      message,
      callId,
      duration,
      transcript,
    };

    const prospectMemory = await cacheConversationTurn(leadId, softwareId, turn);

    res.json({
      success: true,
      data: {
        prospectMemory,
      },
    });
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error caching conversation turn:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/memory-guardian/memory/:leadId
 * Get cached memory for a prospect
 */
router.get('/memory/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const prospectMemory = await getProspectMemory(leadId);

    if (!prospectMemory) {
      return res.status(404).json({
        success: false,
        error: 'No memory found for this lead',
      });
    }

    res.json({
      success: true,
      data: prospectMemory,
    });
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error getting prospect memory:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * POST /api/memory-guardian/detect-repetition
 * Analyze a message and detect if prospect is repeating information
 *
 * Body:
 * {
 *   leadId: string
 *   message: string
 * }
 *
 * Response:
 * {
 *   detected: boolean
 *   field?: string (which field is being repeated)
 *   previousValue?: any
 *   currentValue?: any
 *   empathyResponse?: string (suggested agent response)
 *   confidence?: number (0-100)
 * }
 */
router.post('/detect-repetition', async (req: Request, res: Response) => {
  try {
    const { leadId, message } = req.body;

    if (!leadId || !message) {
      return res.status(400).json({
        success: false,
        error: 'Missing required fields: leadId, message',
      });
    }

    const prospectMemory = await getProspectMemory(leadId);

    if (!prospectMemory) {
      return res.json({
        success: true,
        data: {
          detected: false,
          message: 'No prior memory for this lead',
        },
      });
    }

    const repetition = detectRepetition(message, prospectMemory);

    res.json({
      success: true,
      data: repetition || {
        detected: false,
        message: 'No repetition detected',
      },
    });
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error detecting repetition:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/memory-guardian/alerts/:leadId
 * Generate alerts based on prospect memory analysis
 *
 * Response includes:
 * - Repetition alerts
 * - Unaddressed objections
 * - Engagement opportunities
 * - Risk indicators
 */
router.get('/alerts/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const alerts = await generateMemoryAlerts(leadId);

    res.json({
      success: true,
      data: {
        alerts,
        count: alerts.length,
        critical: alerts.filter((a) => a.severity === 'critical').length,
        high: alerts.filter((a) => a.severity === 'high').length,
      },
    });
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error generating alerts:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/memory-guardian/summary/:leadId
 * Get formatted memory summary for dashboard display
 */
router.get('/summary/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    const prospectMemory = await getProspectMemory(leadId);

    if (!prospectMemory) {
      return res.status(404).json({
        success: false,
        error: 'No memory found for this lead',
      });
    }

    const summary = formatMemorySummary(prospectMemory);

    res.json({
      success: true,
      data: {
        summary,
        rawMemory: prospectMemory,
      },
    });
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error formatting memory summary:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/memory-guardian/conversation-excerpt/:leadId
 * Get recent conversation history excerpt
 *
 * Query params:
 * - turns: number (default: 5) - how many recent turns to include
 */
router.get('/conversation-excerpt/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;
    const turns = parseInt(req.query.turns as string) || 5;

    const excerpt = await getConversationExcerpt(leadId, turns);

    res.json({
      success: true,
      data: {
        excerpt,
        count: excerpt.length,
      },
    });
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error getting conversation excerpt:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ════════════════════════════════════════════════════════════════
// === AUTHENTICATED ENDPOINTS ===
// ════════════════════════════════════════════════════════════════

router.use(authMiddleware);

/**
 * DELETE /api/memory-guardian/memory/:leadId
 * Reset/clear memory for a prospect (admin only)
 */
router.delete('/memory/:leadId', async (req: Request, res: Response) => {
  try {
    const { leadId } = req.params;

    await resetProspectMemory(leadId);

    res.json({
      success: true,
      message: `Memory cleared for lead ${leadId}`,
    });
  } catch (error: any) {
    logger.error('[MemoryGuardian] Error resetting memory:', error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

/**
 * GET /api/memory-guardian/health
 * Health check endpoint
 */
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    success: true,
    message: 'Memory Guardian service is healthy',
    timestamp: new Date().toISOString(),
  });
});

export default router;
