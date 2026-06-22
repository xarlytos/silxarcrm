import { prisma } from '../config/database';
import { logger } from '../utils/logger';

/**
 * Lead Scoring Engine (0-100)
 *
 * Signals (with weights):
 * - Engagement (40%): reply rate, call duration, email opens
 * - Fit (35%): company size, industry, location match to ICP
 * - Behavior (25%): revisit frequency, feature clicks
 *
 * Auto-routing:
 * - <30: NURTURE (email sequences, educational content)
 * - 30-70: SALES (qualified for direct outreach)
 * - >70: VIP (priority handling, dedicated attention)
 */

export interface LeadScoreBreakdown {
  totalScore: number;
  engagementScore: number;
  fitScore: number;
  behaviorScore: number;
  nextAction: 'nurture' | 'sales' | 'vip';
  signals: number;
  confidence: number;
}

export interface EngagementSignals {
  emailOpens: number;
  emailClicks: number;
  callDuration: number; // seconds
  callCount: number;
  replyRate: number; // 0-100
  whatsappInteractions: number;
  lastEngagementDaysAgo: number;
}

export interface FitSignals {
  companySize: 'micro' | 'small' | 'medium' | 'large' | 'unknown';
  industryMatch: number; // 0-100
  locationMatch: number; // 0-100
  budgetIndicator: number; // 0-100 (inferred from company size)
}

export interface BehaviorSignals {
  websiteRevisits: number;
  featureClickCount: number;
  timeOnSiteMinutes: number;
  daysActive: number;
  conversionFunnelStage: number; // 0-100
}

export interface LeadScoringInput {
  leadId: string;
  softwareId: string;
  engagement?: Partial<EngagementSignals>;
  fit?: Partial<FitSignals>;
  behavior?: Partial<BehaviorSignals>;
}

/**
 * Calculate engagement score (0-100)
 * Weights:
 * - Email opens: 20 points
 * - Email clicks: 15 points
 * - Call duration: 25 points
 * - WhatsApp interactions: 25 points
 * - Reply rate: 15 points
 */
function calculateEngagementScore(signals: EngagementSignals): number {
  let score = 0;

  // Email opens: max 10 opens = 20 points
  score += Math.min(signals.emailOpens * 2, 20);

  // Email clicks: max 10 clicks = 15 points
  score += Math.min(signals.emailClicks * 1.5, 15);

  // Call duration: 10 mins = 25 points
  const callPoints = Math.min((signals.callDuration / 600) * 25, 25);
  score += callPoints;

  // WhatsApp interactions: 5+ interactions = 25 points
  score += Math.min(signals.whatsappInteractions * 5, 25);

  // Reply rate: direct percentage (0-100) = 15 points
  score += (signals.replyRate / 100) * 15;

  // Recency penalty: if last engagement > 30 days, halve the engagement score
  if (signals.lastEngagementDaysAgo > 30) {
    score = score * 0.5;
  } else if (signals.lastEngagementDaysAgo > 14) {
    score = score * 0.75;
  }

  return Math.min(score, 100);
}

/**
 * Calculate fit score (0-100)
 * Weights:
 * - Company size match: 25 points
 * - Industry match: 40 points
 * - Location match: 35 points
 */
function calculateFitScore(signals: FitSignals): number {
  let score = 0;

  // Company size: micro (0), small (25), medium (50), large (75), unknown (10)
  const companySizeMap: Record<string, number> = {
    micro: 0,
    small: 25,
    medium: 50,
    large: 75,
    unknown: 10,
  };
  score += companySizeMap[signals.companySize] || 10;

  // Industry match: direct percentage
  score += (signals.industryMatch / 100) * 40;

  // Location match: direct percentage
  score += (signals.locationMatch / 100) * 35;

  return Math.min(score, 100);
}

/**
 * Calculate behavior score (0-100)
 * Weights:
 * - Website revisits: 20 points
 * - Feature clicks: 25 points
 * - Time on site: 25 points
 * - Days active: 15 points
 * - Conversion funnel stage: 15 points
 */
function calculateBehaviorScore(signals: BehaviorSignals): number {
  let score = 0;

  // Website revisits: 5+ revisits = 20 points
  score += Math.min(signals.websiteRevisits * 4, 20);

  // Feature clicks: 10+ clicks = 25 points
  score += Math.min(signals.featureClickCount * 2.5, 25);

  // Time on site: 30+ minutes = 25 points
  score += Math.min((signals.timeOnSiteMinutes / 30) * 25, 25);

  // Days active: 14+ days = 15 points
  score += Math.min((signals.daysActive / 14) * 15, 15);

  // Conversion funnel stage: direct percentage
  score += (signals.conversionFunnelStage / 100) * 15;

  return Math.min(score, 100);
}

/**
 * Determine next action based on score
 */
function determineNextAction(score: number): 'nurture' | 'sales' | 'vip' {
  if (score >= 70) return 'vip';
  if (score >= 30) return 'sales';
  return 'nurture';
}

/**
 * Count available signals
 */
function countSignals(engagement: EngagementSignals, fit: FitSignals, behavior: BehaviorSignals): number {
  let count = 0;

  if (engagement.emailOpens > 0) count++;
  if (engagement.emailClicks > 0) count++;
  if (engagement.callDuration > 0) count++;
  if (engagement.callCount > 0) count++;
  if (engagement.replyRate > 0) count++;
  if (engagement.whatsappInteractions > 0) count++;

  if (fit.companySize !== 'unknown') count++;
  if (fit.industryMatch > 0) count++;
  if (fit.locationMatch > 0) count++;

  if (behavior.websiteRevisits > 0) count++;
  if (behavior.featureClickCount > 0) count++;
  if (behavior.timeOnSiteMinutes > 0) count++;
  if (behavior.daysActive > 0) count++;

  return count;
}

/**
 * Calculate confidence (0-100) based on signal availability
 */
function calculateConfidence(signalCount: number): number {
  // 13 possible signals total
  return Math.min((signalCount / 13) * 100, 100);
}

/**
 * Calculate lead score from engagement, fit, and behavior
 * Returns score 0-100 with breakdown and routing decision
 */
export async function scoreLeadWithSignals(
  input: LeadScoringInput
): Promise<LeadScoreBreakdown> {
  // Default signals if not provided
  const engagement: EngagementSignals = {
    emailOpens: 0,
    emailClicks: 0,
    callDuration: 0,
    callCount: 0,
    replyRate: 0,
    whatsappInteractions: 0,
    lastEngagementDaysAgo: 999,
    ...input.engagement,
  };

  const fit: FitSignals = {
    companySize: 'unknown',
    industryMatch: 0,
    locationMatch: 0,
    budgetIndicator: 0,
    ...input.fit,
  };

  const behavior: BehaviorSignals = {
    websiteRevisits: 0,
    featureClickCount: 0,
    timeOnSiteMinutes: 0,
    daysActive: 0,
    conversionFunnelStage: 0,
    ...input.behavior,
  };

  // Calculate component scores
  const engagementScore = calculateEngagementScore(engagement);
  const fitScore = calculateFitScore(fit);
  const behaviorScore = calculateBehaviorScore(behavior);

  // Calculate weighted total: engagement (40%) + fit (35%) + behavior (25%)
  const totalScore =
    engagementScore * 0.4 +
    fitScore * 0.35 +
    behaviorScore * 0.25;

  const signals = countSignals(engagement, fit, behavior);
  const confidence = calculateConfidence(signals);
  const nextAction = determineNextAction(totalScore);

  return {
    totalScore: Math.round(totalScore),
    engagementScore: Math.round(engagementScore),
    fitScore: Math.round(fitScore),
    behaviorScore: Math.round(behaviorScore),
    nextAction,
    signals,
    confidence: Math.round(confidence),
  };
}

/**
 * Fetch engagement signals from database for a lead
 */
export async function getEngagementSignals(leadId: string): Promise<EngagementSignals> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      llamadas: {
        where: { estado: 'terminada' },
      },
      whatsappEnvios: true,
      whatsappConversacion: {
        include: { mensajes: true },
      },
    },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  // Calculate call duration in seconds
  let totalCallDuration = 0;
  let callCount = 0;
  lead.llamadas.forEach((call) => {
    if (call.duracionSeg) {
      totalCallDuration += call.duracionSeg;
      callCount += 1;
    }
  });

  // Count WhatsApp interactions
  let whatsappInteractions = 0;
  if (lead.whatsappConversacion) {
    whatsappInteractions = lead.whatsappConversacion.mensajes.length;
  }

  // Get email events from EmailEnvio
  const emailData = await prisma.emailEnvio.findMany({
    where: { leadId },
    include: { eventos: true },
  });

  let emailOpens = 0;
  let emailClicks = 0;
  emailData.forEach((envio) => {
    envio.eventos.forEach((evento) => {
      if (evento.tipo === 'opened') emailOpens++;
      if (evento.tipo === 'clicked') emailClicks++;
    });
  });

  // Estimate reply rate from whatsapp responses
  let replyRate = 0;
  if (whatsappInteractions > 0) {
    const responses = lead.whatsappConversacion?.mensajes.filter((m) => m.direccion === 'IN').length || 0;
    const outgoing = lead.whatsappConversacion?.mensajes.filter((m) => m.direccion === 'OUT').length || 0;
    if (outgoing > 0) {
      replyRate = (responses / outgoing) * 100;
    }
  }

  // Calculate last engagement
  let lastEngagementDaysAgo = 999;
  if (lead.ultimoContacto) {
    lastEngagementDaysAgo = Math.floor(
      (Date.now() - lead.ultimoContacto.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return {
    emailOpens,
    emailClicks,
    callDuration: totalCallDuration,
    callCount,
    replyRate: Math.min(replyRate, 100),
    whatsappInteractions,
    lastEngagementDaysAgo,
  };
}

/**
 * Fetch fit signals from database for a lead
 */
export async function getFitSignals(leadId: string, softwareId: string): Promise<FitSignals> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  // Get software and ICP config
  const software = await prisma.software.findUnique({
    where: { id: softwareId },
  });

  if (!software) {
    throw new Error(`Software not found: ${softwareId}`);
  }

  // Company size inference from empresa field or metadata
  let companySize: 'micro' | 'small' | 'medium' | 'large' | 'unknown' = 'unknown';
  if (lead.metadata && typeof lead.metadata === 'object') {
    const meta = lead.metadata as any;
    if (meta.companySize) {
      companySize = meta.companySize;
    } else if (meta.empleados) {
      const emp = meta.empleados;
      if (emp < 5) companySize = 'micro';
      else if (emp < 50) companySize = 'small';
      else if (emp < 250) companySize = 'medium';
      else companySize = 'large';
    }
  }

  // Industry match: compare lead industry vs software ICP
  let industryMatch = 0;
  if (lead.metadata && typeof lead.metadata === 'object' && software.nicho) {
    const meta = lead.metadata as any;
    const leadIndustry = meta.industria || meta.sector || '';
    const softwareNicho = software.nicho.toLowerCase();
    const leadIndustryLower = leadIndustry.toLowerCase();

    if (leadIndustryLower === softwareNicho) {
      industryMatch = 100;
    } else if (leadIndustryLower.includes(softwareNicho) || softwareNicho.includes(leadIndustryLower)) {
      industryMatch = 75;
    } else {
      industryMatch = 25;
    }
  }

  // Location match: compare lead location vs software market
  let locationMatch = 0;
  if (lead.pais && software.icpUbicacion) {
    const leadCountry = lead.pais.toLowerCase();
    const icpLocation = software.icpUbicacion.toLowerCase();

    if (leadCountry === icpLocation) {
      locationMatch = 100;
    } else if (icpLocation.includes(leadCountry) || leadCountry.includes(icpLocation)) {
      locationMatch = 75;
    } else {
      locationMatch = 50;
    }
  }

  // Budget indicator based on company size
  const budgetMap: Record<string, number> = {
    micro: 20,
    small: 40,
    medium: 70,
    large: 95,
    unknown: 50,
  };

  return {
    companySize,
    industryMatch: Math.min(industryMatch, 100),
    locationMatch: Math.min(locationMatch, 100),
    budgetIndicator: budgetMap[companySize],
  };
}

/**
 * Fetch behavior signals from database for a lead
 */
export async function getBehaviorSignals(leadId: string): Promise<BehaviorSignals> {
  const lead = await prisma.lead.findUnique({
    where: { id: leadId },
    include: {
      etiquetas: true,
      historial: true,
    },
  });

  if (!lead) {
    throw new Error(`Lead not found: ${leadId}`);
  }

  // Website revisits: count from tracked events
  const revisits = await prisma.trackedEvent.count({
    where: {
      userId: lead.id,
      eventName: 'page_view',
    },
  });

  // Feature clicks: count from tracked events
  const featureClicks = await prisma.trackedEvent.count({
    where: {
      userId: lead.id,
      eventName: 'feature_click',
    },
  });

  // Time on site: sum from metadata or tracked events
  let timeOnSiteMinutes = 0;
  if (lead.metadata && typeof lead.metadata === 'object') {
    const meta = lead.metadata as any;
    if (meta.timeOnSiteMinutes) {
      timeOnSiteMinutes = meta.timeOnSiteMinutes;
    }
  }

  // Days active: from creation to last contact
  const daysActive = Math.floor(
    (lead.ultimoContacto ? lead.ultimoContacto.getTime() : Date.now()) -
    lead.createdAt.getTime()
  ) / (1000 * 60 * 60 * 24);

  // Conversion funnel stage: infer from lead estado
  const stageMap: Record<string, number> = {
    NUEVO: 10,
    CONTACTADO: 30,
    INTERESADO: 50,
    EN_SEGUIMIENTO: 70,
    CALIFICADO: 85,
    CONVERTIDO: 100,
    RECHAZADO: 0,
    NO_RESPONDE: 5,
  };

  const conversionFunnelStage = stageMap[lead.estado] || 0;

  return {
    websiteRevisits: revisits,
    featureClickCount: featureClicks,
    timeOnSiteMinutes,
    daysActive: Math.max(daysActive, 0),
    conversionFunnelStage,
  };
}

/**
 * Score a lead by fetching all signals from database
 */
export async function scoreLeadFull(leadId: string, softwareId: string): Promise<LeadScoreBreakdown> {
  const [engagement, fit, behavior] = await Promise.all([
    getEngagementSignals(leadId),
    getFitSignals(leadId, softwareId),
    getBehaviorSignals(leadId),
  ]);

  return scoreLeadWithSignals({
    leadId,
    softwareId,
    engagement,
    fit,
    behavior,
  });
}

/**
 * Score multiple leads and return sorted by score
 */
export async function scoreLeadsForSoftware(
  softwareId: string,
  limit?: number
): Promise<Array<{ leadId: string; score: LeadScoreBreakdown }>> {
  const leads = await prisma.lead.findMany({
    where: { softwareId },
    select: { id: true },
    take: limit,
  });

  const results: Array<{ leadId: string; score: LeadScoreBreakdown }> = [];

  for (const lead of leads) {
    try {
      const score = await scoreLeadFull(lead.id, softwareId);
      results.push({ leadId: lead.id, score });
    } catch (err) {
      logger.error(`Failed to score lead ${lead.id}:`, err);
    }
  }

  // Sort by score descending
  results.sort((a, b) => b.score.totalScore - a.score.totalScore);

  return results;
}

/**
 * Save scored lead to database (store in metadata)
 */
export async function saveLeadScore(leadId: string, score: LeadScoreBreakdown): Promise<void> {
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      metadata: {
        ...(await prisma.lead.findUnique({ where: { id: leadId } }))?.metadata,
        leadScore: {
          totalScore: score.totalScore,
          engagementScore: score.engagementScore,
          fitScore: score.fitScore,
          behaviorScore: score.behaviorScore,
          nextAction: score.nextAction,
          signals: score.signals,
          confidence: score.confidence,
          calculatedAt: new Date().toISOString(),
        },
      },
    },
  });
}

/**
 * Get routing recommendations based on lead scores
 */
export interface RoutingRecommendation {
  nurtureLead: Array<{ leadId: string; score: number }>;
  salesQualified: Array<{ leadId: string; score: number }>;
  vipPriority: Array<{ leadId: string; score: number }>;
}

export async function getRoutingRecommendations(
  softwareId: string
): Promise<RoutingRecommendation> {
  const scores = await scoreLeadsForSoftware(softwareId);

  const recommendation: RoutingRecommendation = {
    nurtureLead: [],
    salesQualified: [],
    vipPriority: [],
  };

  for (const { leadId, score } of scores) {
    if (score.nextAction === 'nurture') {
      recommendation.nurtureLead.push({ leadId, score: score.totalScore });
    } else if (score.nextAction === 'sales') {
      recommendation.salesQualified.push({ leadId, score: score.totalScore });
    } else if (score.nextAction === 'vip') {
      recommendation.vipPriority.push({ leadId, score: score.totalScore });
    }
  }

  return recommendation;
}

export default {
  scoreLeadWithSignals,
  scoreLeadFull,
  scoreLeadsForSoftware,
  saveLeadScore,
  getRoutingRecommendations,
  getEngagementSignals,
  getFitSignals,
  getBehaviorSignals,
};
