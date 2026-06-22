import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import {
  generateOfferRecommendation,
  extractProspectSignals,
  PricingStrategy,
  OfferRecommendation,
} from './offerOptimizerService';

/**
 * ============================================================
 * AGENT OFFER INTEGRATION
 * ============================================================
 *
 * Hooks the Offer Optimizer into the voice agent response flow.
 * Called BEFORE agent delivers pricing information to prospect.
 *
 * Integration point: /backend/src/services/llamadaAiService.ts
 * Hook: In procesarWebhookAI(), after lead state changes but before
 *       agent confirms demo. Check for "demo_agendada" outcome.
 */

/**
 * Main integration: Generate dynamic offer during agent call
 *
 * Called from: llamadaAiService.procesarWebhookAI()
 * When: outcome === 'demo_agendada' (lead showed interest)
 * Returns: Formatted offer string for agent to deliver
 */
export async function generateDynamicOfferForAgent(
  leadId: string,
  softwareId: string
): Promise<{
  offer: OfferRecommendation;
  agentScript: string;
  followUpActionItems: string[];
}> {
  try {
    // 1. Extract prospect signals from lead data
    const signals = await extractProspectSignals(leadId);
    logger.info(`Extracted signals for lead ${leadId}:`, signals);

    // 2. Generate offer recommendation using Offer Optimizer
    const recommendation = await generateOfferRecommendation(
      leadId,
      softwareId,
      signals
    );
    logger.info(`Generated offer for lead ${leadId}:`, recommendation);

    // 3. Build agent script based on strategy
    const agentScript = buildAgentPricingScript(recommendation);

    // 4. Determine follow-up actions
    const followUpActionItems = determineFollowUpActions(recommendation, signals);

    return {
      offer: recommendation,
      agentScript,
      followUpActionItems,
    };
  } catch (err) {
    logger.error('Error generating dynamic offer for agent:', err);
    // Fallback to static offer
    return {
      offer: {
        strategy: PricingStrategy.FIXED,
        basePrice: 39,
        recommendedPrice: 39,
        currency: 'EUR',
        rationale: 'Fallback to fixed pricing due to error',
        variants: { lowPrice: 29, midPrice: 39, highPrice: 59 },
        abTestVariant: 'A',
        confidenceScore: 50,
      },
      agentScript:
        'Nuestro plan está a 39 euros mensuales. ¿Te lo agendo para esta semana?',
      followUpActionItems: ['send_demo_link', 'send_pricing_email'],
    };
  }
}

/**
 * Build natural language script for agent to deliver pricing
 * Adapts tone/language based on pricing strategy
 */
function buildAgentPricingScript(offer: OfferRecommendation): string {
  const { strategy, recommendedPrice, currency, discount, variants } = offer;

  switch (strategy) {
    case PricingStrategy.FIXED:
      return `Perfecto. El plan es de ${currency}${recommendedPrice} mensuales, sin sorpresas. ¿Te lo agendo para esta semana?`;

    case PricingStrategy.DYNAMIC:
      // Justify the personalized price
      if (recommendedPrice > variants.lowPrice) {
        return `Basándome en tu negocio, te propongo ${currency}${recommendedPrice} mensuales. Es un ajuste perfecto a tu escala. ¿Empezamos esta semana?`;
      } else {
        return `Para negocios como el tuyo, tenemos especial promoción: ${currency}${recommendedPrice} mensuales. ¿Te lo reservo ahora?`;
      }

    case PricingStrategy.PSYCHOLOGICAL:
      // Use anchoring + urgency
      if (discount) {
        return `Normalmente es ${currency}${variants.highPrice}, pero te lo dejo en ${currency}${recommendedPrice} este mes — son solo 3 spots. ¿Te lo agendo hoy?`;
      } else {
        return `Te lo dejo en ${currency}${recommendedPrice} mensuales con acceso a todas las features. ¿Comenzamos esta semana?`;
      }

    default:
      return `El plan es ${currency}${recommendedPrice} al mes. ¿Cómo te va?`;
  }
}

/**
 * Determine follow-up actions based on offer acceptance likelihood
 */
function determineFollowUpActions(
  offer: OfferRecommendation,
  signals: any
): string[] {
  const actions: string[] = [];

  // Always send demo link after offer
  actions.push('send_demo_link');
  actions.push('send_pricing_email');

  // High confidence → push for immediate commitment
  if (offer.confidenceScore > 80) {
    actions.push('send_calendar_link');
  }

  // Low confidence → soft follow-up
  if (offer.confidenceScore < 60) {
    actions.push('schedule_followup_call_48h');
  }

  // Psychological pricing → emphasize limited availability
  if (offer.strategy === PricingStrategy.PSYCHOLOGICAL) {
    actions.push('send_scarcity_reminder_24h');
  }

  // High interest + low engagement → nurture sequence
  if ((signals.behaviorSignals?.engagementLevel || 'low') === 'low') {
    actions.push('start_nurture_sequence');
  }

  return actions;
}

/**
 * Record offer acceptance & update deal metadata
 *
 * Called from: Lead conversion flow
 * When: Lead accepts offer and moves to CONVERTIDO
 */
export async function recordOfferAcceptance(
  leadId: string,
  softwareId: string,
  dealValue?: number
): Promise<void> {
  try {
    // Find the most recent offer log for this lead
    const offerLog = await prisma.offerLog.findFirst({
      where: { leadId, softwareId },
      orderBy: { createdAt: 'desc' },
    });

    if (!offerLog) {
      logger.warn(`No offer log found for lead ${leadId}`);
      return;
    }

    // Update offer log
    await prisma.offerLog.update({
      where: { id: offerLog.id },
      data: {
        accepted: true,
        closedAt: new Date(),
        dealValue: dealValue ? parseFloat(dealValue.toString()) : null,
      },
    });

    // Update A/B test variant results if test is running
    const recommendation = offerLog.recommendation as any;
    if (recommendation.abTestVariant) {
      const activeTest = await prisma.aBTestExperiment.findFirst({
        where: { softwareId, status: 'RUNNING' },
      });

      if (activeTest) {
        await updateTestVariantMetrics(
          activeTest.id,
          recommendation.abTestVariant,
          dealValue || recommendation.basePrice,
          true
        );
      }
    }

    logger.info(`Recorded offer acceptance for lead ${leadId}`, {
      offerLogId: offerLog.id,
      dealValue,
    });
  } catch (err) {
    logger.error('Error recording offer acceptance:', err);
  }
}

/**
 * Record offer rejection for analytics
 */
export async function recordOfferRejection(
  leadId: string,
  softwareId: string,
  reason?: string
): Promise<void> {
  try {
    const offerLog = await prisma.offerLog.findFirst({
      where: { leadId, softwareId },
      orderBy: { createdAt: 'desc' },
    });

    if (offerLog) {
      await prisma.offerLog.update({
        where: { id: offerLog.id },
        data: {
          accepted: false,
          feedback: reason,
        },
      });

      // Update test variant if applicable
      const recommendation = offerLog.recommendation as any;
      if (recommendation.abTestVariant) {
        const activeTest = await prisma.aBTestExperiment.findFirst({
          where: { softwareId, status: 'RUNNING' },
        });

        if (activeTest) {
          await updateTestVariantMetrics(
            activeTest.id,
            recommendation.abTestVariant,
            0,
            false
          );
        }
      }
    }
  } catch (err) {
    logger.error('Error recording offer rejection:', err);
  }
}

/**
 * Update A/B test variant metrics
 */
async function updateTestVariantMetrics(
  testId: string,
  variant: string,
  dealValue: number,
  converted: boolean
): Promise<void> {
  try {
    const test = await prisma.aBTestExperiment.findUnique({
      where: { id: testId },
    });

    if (!test) {
      logger.warn(`Test ${testId} not found`);
      return;
    }

    const variantKey = `variant${variant.toUpperCase()}Results` as keyof typeof test;
    const currentResults = (test[variantKey] as any) || {
      impressions: 0,
      clicks: 0,
      conversions: 0,
      totalRevenue: 0,
      avgDealValue: 0,
      conversionRate: 0,
    };

    const updatedResults = {
      ...currentResults,
      impressions: currentResults.impressions + 1,
      clicks: currentResults.clicks + (converted ? 1 : 0),
      conversions: currentResults.conversions + (converted ? 1 : 0),
      totalRevenue: currentResults.totalRevenue + (converted ? dealValue : 0),
      avgDealValue:
        currentResults.conversions + (converted ? 1 : 0) > 0
          ? (currentResults.totalRevenue + (converted ? dealValue : 0)) /
            (currentResults.conversions + (converted ? 1 : 0))
          : 0,
      conversionRate: (((currentResults.conversions + (converted ? 1 : 0)) / (currentResults.impressions + 1)) * 100),
      roi: (currentResults.totalRevenue + (converted ? dealValue : 0)) * 0.3, // Placeholder: 30% platform margin
      closeRate: (((currentResults.conversions + (converted ? 1 : 0)) / (currentResults.impressions + 1)) * 100),
    };

    const updateData: any = {};
    updateData[variantKey] = updatedResults;

    await prisma.aBTestExperiment.update({
      where: { id: testId },
      data: updateData,
    });

    logger.debug(`Updated test variant ${variant} metrics`, {
      testId,
      updatedResults,
    });
  } catch (err) {
    logger.error('Error updating test variant metrics:', err);
  }
}

/**
 * Get offer recommendation for webhook response
 * Used to embed pricing in agent webhook response
 */
export async function getOfferForWebhookResponse(
  leadId: string,
  softwareId: string
): Promise<OfferRecommendation | null> {
  try {
    const offerLog = await prisma.offerLog.findFirst({
      where: { leadId, softwareId },
      orderBy: { createdAt: 'desc' },
    });

    return offerLog?.recommendation as any;
  } catch (err) {
    logger.error('Error fetching offer for webhook:', err);
    return null;
  }
}

/**
 * Integration test: Verify hooks are properly wired
 */
export async function testIntegration(softwareId: string): Promise<{
  status: string;
  voiceAgentConfigFound: boolean;
  testOffersGenerated: number;
  recommendations: any[];
}> {
  try {
    // Check voice agent config
    const config = await prisma.voiceAgentConfig.findUnique({
      where: { softwareId },
    });

    // Generate test offers
    const leads = await prisma.lead.findMany({
      where: { softwareId },
      take: 3,
    });

    const recommendations = [];
    for (const lead of leads) {
      try {
        const rec = await generateDynamicOfferRecommendation(
          lead.id,
          softwareId
        );
        recommendations.push({
          leadId: lead.id,
          strategy: rec.offer.strategy,
          price: rec.offer.recommendedPrice,
        });
      } catch (err) {
        logger.debug(`Skipped test for lead ${lead.id}:`, err);
      }
    }

    return {
      status: 'ok',
      voiceAgentConfigFound: !!config,
      testOffersGenerated: recommendations.length,
      recommendations,
    };
  } catch (err) {
    logger.error('Integration test failed:', err);
    return {
      status: 'error',
      voiceAgentConfigFound: false,
      testOffersGenerated: 0,
      recommendations: [],
    };
  }
}
