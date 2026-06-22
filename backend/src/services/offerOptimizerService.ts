import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * ============================================================
 * OFFER OPTIMIZER (Deal Engine) — Dynamic Pricing & A/B Testing
 * ============================================================
 *
 * Analyzes prospect data (budget, interest, company size) to recommend
 * optimized pricing. Tests 3 strategies: fixed, dynamic, psychological.
 *
 * Expected: +35% close rate improvement
 * Timeline: 3-4 days implementation
 */

// ──────────────────────────────────────────────────────────
// TYPES & SCHEMAS
// ──────────────────────────────────────────────────────────

export enum PricingStrategy {
  FIXED = 'fixed',           // Static price, baseline
  DYNAMIC = 'dynamic',       // Based on prospect value signals
  PSYCHOLOGICAL = 'psychological', // Anchoring + scarcity principles
}

export interface ProspectSignals {
  budget?: number;           // USD/EUR annual budget if known
  companySize?: number;      // number of employees
  interestScore?: number;    // 0-100 engagement level
  industryVertical?: string; // e.g., "dental", "peluqueria"
  region?: string;           // e.g., "es", "mx"
  behaviorSignals?: {
    pageViewsDuration?: number;  // seconds on landing
    downloadedResources?: number; // audit, whitepaper, etc
    engagementLevel?: string;     // low|medium|high
    requestCount?: number;        // how many times contacted
  };
}

export interface OfferRecommendation {
  strategy: PricingStrategy;
  basePrice: number;
  recommendedPrice: number;
  discount?: number;
  currency: string;
  rationale: string;
  variants: {
    lowPrice: number;
    midPrice: number;
    highPrice: number;
  };
  abTestVariant: string; // A | B | C for multivariate testing
  confidenceScore: number; // 0-100, how confident in recommendation
  metadata?: Record<string, any>;
}

export interface ABTestExperiment {
  id: string;
  softwareId: string;
  strategyA: PricingStrategy;
  strategyB: PricingStrategy;
  strategyC: PricingStrategy;
  status: 'running' | 'completed' | 'paused';
  startedAt: Date;
  endedAt?: Date;

  // Results
  variantAResults: TestVariantResult;
  variantBResults: TestVariantResult;
  variantCResults: TestVariantResult;
  winner?: string; // A | B | C
}

export interface TestVariantResult {
  impressions: number;
  clicks: number;
  conversions: number;
  totalRevenue: number;
  avgDealValue: number;
  conversionRate: number; // %
  roi?: number;
  closeRate?: number; // % of qualified leads that close
}

export interface OfferLog {
  id: string;
  leadId: string;
  softwareId: string;
  prospectSignals: ProspectSignals;
  recommendation: OfferRecommendation;
  accepted: boolean;
  dealValue?: number;
  closedAt?: Date;
  feedback?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ──────────────────────────────────────────────────────────
// PRICING MODEL: Calculate price based on prospect signals
// ──────────────────────────────────────────────────────────

function calculateDynamicPrice(
  basePrice: number,
  signals: ProspectSignals,
  config: { currency: string; marketCountry: string }
): number {
  let multiplier = 1.0;
  let rationale = '';

  // Budget-based multiplier (0.7x - 1.5x)
  if (signals.budget) {
    if (signals.budget < 10000) {
      multiplier *= 0.8;
      rationale += 'Low budget signal (-20%). ';
    } else if (signals.budget > 50000) {
      multiplier *= 1.4;
      rationale += 'High budget signal (+40%). ';
    } else if (signals.budget > 25000) {
      multiplier *= 1.2;
      rationale += 'Medium-high budget (+20%). ';
    }
  }

  // Company size multiplier (1.0x - 1.6x)
  if (signals.companySize) {
    if (signals.companySize <= 5) {
      multiplier *= 0.9;
      rationale += 'Solo/micro (+0%). ';
    } else if (signals.companySize > 50) {
      multiplier *= 1.6;
      rationale += 'Medium+ company (+60%). ';
    } else if (signals.companySize > 10) {
      multiplier *= 1.3;
      rationale += 'Small-medium company (+30%). ';
    }
  }

  // Interest/engagement multiplier (0.85x - 1.25x)
  if (signals.interestScore !== undefined) {
    const interestMultiplier = 0.85 + (signals.interestScore / 100) * 0.4;
    multiplier *= interestMultiplier;
    rationale += `Interest score ${signals.interestScore}% (${(interestMultiplier - 1) * 100 > 0 ? '+' : ''}${((interestMultiplier - 1) * 100).toFixed(0)}%). `;
  }

  // Behavior signals multiplier (0.95x - 1.3x)
  if (signals.behaviorSignals) {
    let behaviorBoost = 1.0;

    if ((signals.behaviorSignals.pageViewsDuration || 0) > 300) {
      behaviorBoost *= 1.15;
      rationale += 'High landing engagement (+15%). ';
    }
    if ((signals.behaviorSignals.downloadedResources || 0) > 2) {
      behaviorBoost *= 1.15;
      rationale += 'Downloaded resources (+15%). ';
    }
    if (signals.behaviorSignals.engagementLevel === 'high') {
      behaviorBoost *= 1.1;
      rationale += 'High engagement tier (+10%). ';
    }

    multiplier *= behaviorBoost;
  }

  const finalPrice = Math.round(basePrice * multiplier);

  return {
    price: finalPrice,
    multiplier: parseFloat(multiplier.toFixed(2)),
    rationale: rationale.trim(),
  } as any;
}

function calculatePsychologicalPrice(
  basePrice: number,
  signals: ProspectSignals,
  config: { currency: string; marketCountry: string }
): any {
  // Psychological pricing: charm pricing, anchoring, scarcity

  const dynamicResult = calculateDynamicPrice(basePrice, signals, config);
  let recommendedPrice = dynamicResult.price;

  // CHARM PRICING: .99 endings
  if (recommendedPrice >= 100) {
    recommendedPrice = Math.round(recommendedPrice / 10) * 10 - 1; // 39, 49, 59, 99, etc
  } else {
    recommendedPrice = Math.round(recommendedPrice / 5) * 5 - 1; // 29, 34, 44, etc
  }

  let rationale = dynamicResult.rationale;
  rationale += `Charm pricing: €${recommendedPrice}/mo. `;

  // ANCHORING: Show higher "original" price
  const anchorPrice = Math.round(recommendedPrice * 1.3);
  rationale += `Anchored to €${anchorPrice}/mo. `;

  // SCARCITY: Mention limited spots
  if (!signals.behaviorSignals?.engagementLevel || signals.behaviorSignals.engagementLevel !== 'low') {
    rationale += 'Only 3 spots left this month. ';
  }

  // COMMITMENT: Tier structure
  rationale += `Available in monthly, quarterly, annual plans. `;

  return {
    price: recommendedPrice,
    anchorPrice,
    multiplier: (recommendedPrice / basePrice).toFixed(2),
    rationale,
  };
}

// ──────────────────────────────────────────────────────────
// MAIN: Generate offer recommendation
// ──────────────────────────────────────────────────────────

export async function generateOfferRecommendation(
  leadId: string,
  softwareId: string,
  signals: ProspectSignals,
  basePrice?: number
): Promise<OfferRecommendation> {
  try {
    // Get VoiceAgentConfig for pricing baseline
    const config = await prisma.voiceAgentConfig.findUnique({
      where: { softwareId },
      select: {
        priceMonthly: true,
        currency: true,
        marketCountry: true,
      },
    });

    if (!config) {
      throw new Error(`VoiceAgentConfig not found for software ${softwareId}`);
    }

    const basePriceValue = basePrice || config.priceMonthly;
    const configData = {
      currency: config.currency || 'EUR',
      marketCountry: config.marketCountry || 'es',
    };

    // Get active A/B test for this software
    const abTest = await prisma.aBTestExperiment.findFirst({
      where: { softwareId, status: 'running' },
    });

    // Determine which variant to assign
    let strategyAssigned: PricingStrategy;
    let abTestVariant: string;

    if (abTest) {
      const rand = Math.random();
      if (rand < 0.33) {
        strategyAssigned = abTest.strategyA as any;
        abTestVariant = 'A';
      } else if (rand < 0.66) {
        strategyAssigned = abTest.strategyB as any;
        abTestVariant = 'B';
      } else {
        strategyAssigned = abTest.strategyC as any;
        abTestVariant = 'C';
      }
    } else {
      // Default round-robin if no active test
      const count = await prisma.offerLog.count({ where: { softwareId } });
      const strategies = [PricingStrategy.FIXED, PricingStrategy.DYNAMIC, PricingStrategy.PSYCHOLOGICAL];
      strategyAssigned = strategies[count % 3];
      abTestVariant = String.fromCharCode(65 + (count % 3)); // A, B, C
    }

    // Calculate prices for all 3 strategies
    const fixedPrice = basePriceValue;

    const dynamicCalc = calculateDynamicPrice(basePriceValue, signals, configData);
    const dynamicPrice = dynamicCalc.price;
    const dynamicRationale = dynamicCalc.rationale;

    const psychCalc = calculatePsychologicalPrice(basePriceValue, signals, configData);
    const psychPrice = psychCalc.price;
    const psychRationale = psychCalc.rationale;

    // Build recommendation based on assigned strategy
    let recommendedPrice: number;
    let strategyRationale: string;
    let discount: number | undefined;
    let confidence: number;

    switch (strategyAssigned) {
      case PricingStrategy.FIXED:
        recommendedPrice = fixedPrice;
        strategyRationale = `Fixed pricing baseline. Standard offer for ${signals.industryVertical || 'this market'}.`;
        confidence = 60;
        break;

      case PricingStrategy.DYNAMIC:
        recommendedPrice = dynamicPrice;
        strategyRationale = dynamicRationale;
        confidence = Math.min(95, 70 + (signals.interestScore || 0));
        break;

      case PricingStrategy.PSYCHOLOGICAL:
        recommendedPrice = psychPrice;
        strategyRationale = psychRationale;
        discount = Math.round(((psychCalc.anchorPrice - psychPrice) / psychCalc.anchorPrice) * 100);
        confidence = Math.min(90, 65 + (signals.interestScore || 0) * 0.3);
        break;

      default:
        recommendedPrice = fixedPrice;
        strategyRationale = 'Fallback to fixed pricing.';
        confidence = 50;
    }

    const recommendation: OfferRecommendation = {
      strategy: strategyAssigned,
      basePrice: basePriceValue,
      recommendedPrice,
      discount,
      currency: configData.currency,
      rationale: strategyRationale,
      variants: {
        lowPrice: Math.round(recommendedPrice * 0.8),
        midPrice: recommendedPrice,
        highPrice: Math.round(recommendedPrice * 1.3),
      },
      abTestVariant,
      confidenceScore: confidence,
      metadata: {
        proposedAt: new Date(),
        signals,
      },
    };

    // Log the offer
    await prisma.offerLog.create({
      data: {
        leadId,
        softwareId,
        prospectSignals: signals as any,
        recommendation: recommendation as any,
        accepted: false,
      },
    });

    return recommendation;
  } catch (err) {
    logger.error('Error generating offer recommendation:', err);
    throw err;
  }
}

// ──────────────────────────────────────────────────────────
// A/B TEST MANAGEMENT
// ──────────────────────────────────────────────────────────

export async function createABTest(
  softwareId: string,
  strategyA: PricingStrategy = PricingStrategy.FIXED,
  strategyB: PricingStrategy = PricingStrategy.DYNAMIC,
  strategyC: PricingStrategy = PricingStrategy.PSYCHOLOGICAL
): Promise<ABTestExperiment> {
  // Stop any existing tests
  await prisma.aBTestExperiment.updateMany(
    {
      where: { softwareId, status: 'running' },
    },
    { status: 'paused' }
  );

  return await prisma.aBTestExperiment.create({
    data: {
      softwareId,
      strategyA: strategyA as any,
      strategyB: strategyB as any,
      strategyC: strategyC as any,
      status: 'running',
      startedAt: new Date(),
      variantAResults: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        totalRevenue: 0,
        avgDealValue: 0,
        conversionRate: 0,
      },
      variantBResults: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        totalRevenue: 0,
        avgDealValue: 0,
        conversionRate: 0,
      },
      variantCResults: {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        totalRevenue: 0,
        avgDealValue: 0,
        conversionRate: 0,
      },
    },
  });
}

export async function updateTestResults(
  testId: string,
  variant: string,
  dealValue: number,
  closed: boolean
): Promise<void> {
  const test = await prisma.aBTestExperiment.findUnique({ where: { id: testId } });
  if (!test) throw new Error('Test not found');

  const variantKey = `variant${variant.toUpperCase()}Results` as keyof ABTestExperiment;
  const currentResults = test[variantKey] as any as TestVariantResult;

  const updatedResults: TestVariantResult = {
    ...currentResults,
    impressions: currentResults.impressions + 1,
    clicks: currentResults.clicks + (closed ? 1 : 0),
    conversions: currentResults.conversions + (closed ? 1 : 0),
    totalRevenue: currentResults.totalRevenue + (closed ? dealValue : 0),
    avgDealValue: closed
      ? (currentResults.totalRevenue + dealValue) / (currentResults.conversions + 1)
      : currentResults.avgDealValue,
    conversionRate:
      ((currentResults.conversions + (closed ? 1 : 0)) / (currentResults.impressions + 1)) * 100,
  };

  const updateData: any = {};
  updateData[variantKey] = updatedResults;

  await prisma.aBTestExperiment.update({
    where: { id: testId },
    data: updateData,
  });
}

export async function concludeABTest(testId: string): Promise<string> {
  const test = await prisma.aBTestExperiment.findUnique({ where: { id: testId } });
  if (!test) throw new Error('Test not found');

  // Determine winner by conversion rate
  const rates = {
    A: (test.variantAResults as any).conversionRate,
    B: (test.variantBResults as any).conversionRate,
    C: (test.variantCResults as any).conversionRate,
  };

  const winner = Object.entries(rates).reduce((a, b) => (a[1] > b[1] ? a : b))[0];

  await prisma.aBTestExperiment.update({
    where: { id: testId },
    data: {
      status: 'completed',
      endedAt: new Date(),
      winner,
    },
  });

  return winner;
}

// ──────────────────────────────────────────────────────────
// ANALYTICS & REPORTING
// ──────────────────────────────────────────────────────────

export async function getOfferPerformance(softwareId: string) {
  const offers = await prisma.offerLog.findMany({
    where: { softwareId },
    select: {
      id: true,
      recommendation: true,
      accepted: true,
      dealValue: true,
      closedAt: true,
      createdAt: true,
    },
  });

  const byStrategy: Record<string, any> = {};
  let totalAccepted = 0;
  let totalRevenue = 0;

  for (const offer of offers) {
    const rec = offer.recommendation as any;
    const strategy = rec.strategy;

    if (!byStrategy[strategy]) {
      byStrategy[strategy] = {
        total: 0,
        accepted: 0,
        revenue: 0,
        avgDealValue: 0,
        acceptanceRate: 0,
      };
    }

    byStrategy[strategy].total++;
    if (offer.accepted) {
      byStrategy[strategy].accepted++;
      totalAccepted++;
      if (offer.dealValue) {
        byStrategy[strategy].revenue += offer.dealValue;
        totalRevenue += offer.dealValue;
      }
    }
  }

  // Calculate rates
  for (const strategy in byStrategy) {
    const stats = byStrategy[strategy];
    stats.acceptanceRate = (stats.accepted / stats.total) * 100;
    stats.avgDealValue = stats.accepted > 0 ? stats.revenue / stats.accepted : 0;
  }

  return {
    totalOffers: offers.length,
    totalAccepted,
    acceptanceRate: (totalAccepted / offers.length) * 100,
    totalRevenue,
    byStrategy,
  };
}

export async function getActiveTests(softwareId: string): Promise<ABTestExperiment[]> {
  return await prisma.aBTestExperiment.findMany({
    where: { softwareId, status: 'running' },
  });
}

// ──────────────────────────────────────────────────────────
// UTILITY: Extract signals from Lead + metadata
// ──────────────────────────────────────────────────────────

export async function extractProspectSignals(leadId: string): Promise<ProspectSignals> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      whatsappConversacion: {
        include: { mensajes: true },
      },
    },
  });

  if (!lead) throw new Error('Lead not found');

  const signals: ProspectSignals = {
    industryVertical: (lead.metadata as any)?.sector || (lead.metadata as any)?.industry,
    region: lead.pais || 'es',
  };

  // Try to extract from metadata
  const meta = lead.metadata as any;
  if (meta?.budget) signals.budget = parseInt(meta.budget);
  if (meta?.companySize) signals.companySize = parseInt(meta.companySize);
  if (meta?.interestScore) signals.interestScore = parseInt(meta.interestScore);

  // Extract from behavior: count WhatsApp messages
  if (lead.whatsappConversacion) {
    const msgCount = lead.whatsappConversacion.mensajes.length;
    signals.behaviorSignals = {
      requestCount: msgCount,
      engagementLevel: msgCount > 5 ? 'high' : msgCount > 2 ? 'medium' : 'low',
    };
  }

  // TODO: In production, integrate with:
  // - GTM tracking (page views, resource downloads)
  // - HubSpot/Pipedrive API (budget info from CRM)
  // - Previous interaction history

  return signals;
}
