import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

interface RewardConfig {
  type: 'months_free' | 'discount_percentage' | 'credit_amount' | 'feature_access';
  value: number;
  description: string;
}

interface TierConfig {
  minReferrals: number;
  name: string;
  multiplier: number;
  badge: string;
}

/**
 * Configuración de tiers/niveles de referidos
 */
const defaultTiers: TierConfig[] = [
  { minReferrals: 0, name: 'Bronce', multiplier: 1, badge: '🥉' },
  { minReferrals: 3, name: 'Plata', multiplier: 1.5, badge: '🥈' },
  { minReferrals: 10, name: 'Oro', multiplier: 2, badge: '🥇' },
  { minReferrals: 25, name: 'Platino', multiplier: 3, badge: '💎' },
];

/**
 * Genera un código corto único para referidos
 */
function generateShortCode(): string {
  return crypto.randomBytes(4).toString('hex').toUpperCase();
}

/**
 * Obtiene la configuración de recompensas de un software
 */
async function getRewardConfig(softwareId: string): Promise<{
  rewardType: string;
  rewardValue: number;
  doubleReward: boolean;
  tiers: TierConfig[];
}> {
  const config = await prisma.growthConfig.findUnique({
    where: { softwareId },
  });

  return {
    rewardType: config?.referralRewardType || 'months_free',
    rewardValue: config?.referralRewardValue || 1,
    doubleReward: config?.referralDoubleReward || false,
    tiers: defaultTiers,
  };
}

/**
 * Calcula el tier actual de un referidor
 */
async function calculateReferrerTier(
  referrerId: number,
  softwareId: string,
  tiers: TierConfig[]
): Promise<TierConfig> {
  const convertedCount = await prisma.referralProgram.count({
    where: {
      referrerId,
      softwareId,
      status: 'CONVERTED',
    },
  });

  // Encontrar el tier más alto que cumpla la condición
  const sortedTiers = [...tiers].sort((a, b) => b.minReferrals - a.minReferrals);
  const tier = sortedTiers.find((t) => convertedCount >= t.minReferrals) || tiers[0];

  return tier;
}

/**
 * Calcula la recompensa basada en el tier
 */
function calculateReward(
  baseValue: number,
  tier: TierConfig,
  config: { rewardType: string; doubleReward: boolean }
): RewardConfig {
  const finalValue = Math.round(baseValue * tier.multiplier);

  const descriptions: Record<string, string> = {
    months_free: `${finalValue} mes${finalValue > 1 ? 'es' : ''} gratis`,
    discount_percentage: `${finalValue}% de descuento`,
    credit_amount: `€${finalValue} de crédito`,
    feature_access: 'Acceso a feature premium',
  };

  return {
    type: config.rewardType as any,
    value: finalValue,
    description: descriptions[config.rewardType] || `${finalValue} recompensa`,
  };
}

// ============================================================
// CRUD
// ============================================================

/**
 * Crea un nuevo enlace de referido para un cliente
 */
export async function createReferralLink(clienteId: number, softwareId: string) {
  const cliente = await prisma.clienteGlobal.findUnique({
    where: { id: clienteId },
  });

  if (!cliente) throw new Error('Cliente no encontrado');

  const software = await prisma.software.findUnique({
    where: { id: softwareId },
  });

  if (!software) throw new Error('Software no encontrado');

  // Verificar si ya tiene un código activo
  const existing = await prisma.referralProgram.findFirst({
    where: {
      referrerId: clienteId,
      softwareId,
      status: 'PENDING',
    },
  });

  if (existing) {
    return {
      code: existing.code,
      url: `${process.env.APP_URL}/r/${existing.code}`,
      existing: true,
    };
  }

  const code = generateShortCode();

  await prisma.referralProgram.create({
    data: {
      softwareId,
      referrerId: clienteId,
      code,
      status: 'PENDING',
      clicks: 0,
      signups: 0,
    },
  });

  return {
    code,
    url: `${process.env.APP_URL}/r/${code}`,
    existing: false,
  };
}

/**
 * Registra un clic en un enlace de referido
 */
export async function trackReferralClick(
  code: string,
  ip?: string,
  userAgent?: string,
  utmSource?: string,
  utmMedium?: string
) {
  const referral = await prisma.referralProgram.findUnique({
    where: { code },
    include: { software: true },
  });

  if (!referral) return null;

  await prisma.referralProgram.update({
    where: { code },
    data: {
      clicks: { increment: 1 },
      ipAddress: ip || null,
      userAgent: userAgent || null,
      utmSource: utmSource || null,
      utmMedium: utmMedium || null,
    },
  });

  return referral;
}

/**
 * Registra una conversión de referido (cuando el referido se convierte en cliente)
 */
export async function trackReferralConversion(code: string, leadId: string) {
  const referral = await prisma.referralProgram.findUnique({
    where: { code },
    include: { referrer: true, software: true },
  });

  if (!referral) throw new Error('Código de referido no encontrado');

  // Calcular tier y recompensa
  const config = await getRewardConfig(referral.softwareId);
  const tier = await calculateReferrerTier(
    referral.referrerId,
    referral.softwareId,
    config.tiers
  );
  const reward = calculateReward(config.rewardValue, tier, config);

  // Actualizar referido
  const updated = await prisma.referralProgram.update({
    where: { code },
    data: {
      status: 'CONVERTED',
      convertedAt: new Date(),
      signups: { increment: 1 },
      leadId,
      rewardType: reward.type,
      rewardValue: reward.value,
    },
  });

  // Actualizar lead
  await prisma.lead.update({
    where: { id: leadId },
    data: {
      origen: `referral_${code}`,
    },
  });

  // Guardar en historial
  await prisma.referralRewardHistory.create({
    data: {
      softwareId: referral.softwareId,
      referrerId: referral.referrerId,
      referralId: referral.id,
      type: reward.type,
      value: reward.value,
      description: `${reward.description} (Tier ${tier.name} ${tier.badge})`,
      applied: false,
    },
  });

  return {
    ...updated,
    reward,
    tier,
  };
}

/**
 * Procesa la recompensa de un referido
 */
export async function processReferralReward(referralId: string) {
  const referral = await prisma.referralProgram.findUnique({
    where: { id: referralId },
    include: { referrer: true, software: { include: { growthConfig: true } } },
  });

  if (!referral) throw new Error('Referido no encontrado');
  if (referral.status !== 'CONVERTED') {
    throw new Error('El referido aún no ha convertido');
  }
  if (referral.rewardGiven) {
    throw new Error('La recompensa ya fue procesada');
  }

  // Aplicar recompensa
  const config = await getRewardConfig(referral.softwareId);

  await prisma.$transaction([
    // Marcar como procesada
    prisma.referralProgram.update({
      where: { id: referralId },
      data: { rewardGiven: true },
    }),
    // Actualizar historial
    prisma.referralRewardHistory.updateMany({
      where: { referralId },
      data: { applied: true, appliedAt: new Date() },
    }),
  ]);

  // Si hay doble recompensa, crear para el referido también
  if (config.doubleReward && referral.leadId) {
    // TODO: Implementar recompensa para el referido también
  }

  return {
    referralId,
    rewardType: referral.rewardType,
    rewardValue: referral.rewardValue,
    referrerName: referral.referrer.nombre,
    processed: true,
  };
}

// ============================================================
// STATS & ANALYTICS
// ============================================================

/**
 * Obtiene estadísticas completas del programa de referidos
 */
export async function getReferralStats(softwareId: string) {
  const [stats, totalRewards, topReferrers] = await Promise.all([
    prisma.referralProgram.groupBy({
      by: ['status'],
      where: { softwareId },
      _count: { id: true },
      _sum: { clicks: true, signups: true },
    }),
    prisma.referralRewardHistory.aggregate({
      where: { softwareId },
      _count: { id: true },
      _sum: { value: true },
    }),
    prisma.referralProgram.groupBy({
      by: ['referrerId'],
      where: { softwareId, status: 'CONVERTED' },
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 10,
    }),
  ]);

  const totalReferrals = stats.reduce((sum, s) => sum + s._count.id, 0);
  const totalClicks = stats.reduce((sum, s) => sum + (s._sum.clicks || 0), 0);
  const totalSignups = stats.reduce((sum, s) => sum + (s._sum.signups || 0), 0);
  const converted = stats.find((s) => s.status === 'CONVERTED')?._count.id || 0;
  const conversionRate = totalReferrals > 0 ? (converted / totalReferrals) * 100 : 0;

  // Obtener datos de los top referrers
  const topReferrerDetails = await Promise.all(
    topReferrers.map(async (tr) => {
      const cliente = await prisma.clienteGlobal.findUnique({
        where: { id: tr.referrerId },
        select: { nombre: true, email: true },
      });
      return {
        referrerId: tr.referrerId,
        nombre: cliente?.nombre || 'Anónimo',
        conversions: tr._count.id,
      };
    })
  );

  return {
    totalReferrals,
    totalClicks,
    totalSignups,
    converted,
    conversionRate: Math.round(conversionRate * 100) / 100,
    totalRewardsGiven: totalRewards._count.id,
    totalRewardsValue: totalRewards._sum.value || 0,
    byStatus: stats,
    topReferrers: topReferrerDetails,
  };
}

/**
 * Obtiene los referidos de un cliente específico con recompensas
 */
export async function getClientReferrals(clienteId: number, softwareId?: string) {
  const where: any = { referrerId: clienteId };
  if (softwareId) where.softwareId = softwareId;

  const [referrals, totalConverted, pendingRewards] = await Promise.all([
    prisma.referralProgram.findMany({
      where,
      include: { software: true },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.referralProgram.count({
      where: { ...where, status: 'CONVERTED' },
    }),
    prisma.referralRewardHistory.findMany({
      where: { referrerId: clienteId },
      orderBy: { createdAt: 'desc' },
    }),
  ]);

  // Calcular tier
  const softwareIds = [...new Set(referrals.map((r) => r.softwareId))];
  const tiers: Record<string, any> = {};
  for (const sid of softwareIds) {
    const config = await getRewardConfig(sid);
    tiers[sid] = await calculateReferrerTier(clienteId, sid, config.tiers);
  }

  return {
    referrals,
    totalConverted,
    pendingRewards,
    tiers,
  };
}

/**
 * Obtiene el leaderboard global de referidores
 */
export async function getReferralLeaderboard(softwareId?: string) {
  const where: any = { status: 'CONVERTED' };
  if (softwareId) where.softwareId = softwareId;

  const topReferrers = await prisma.referralProgram.groupBy({
    by: ['referrerId'],
    where,
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
    take: 20,
  });

  return Promise.all(
    topReferrers.map(async (tr) => {
      const cliente = await prisma.clienteGlobal.findUnique({
        where: { id: tr.referrerId },
        select: { nombre: true, email: true },
      });
      return {
        referrerId: tr.referrerId,
        nombre: cliente?.nombre || 'Anónimo',
        email: cliente?.email,
        conversions: tr._count.id,
      };
    })
  );
}

// ============================================================
// WIDGET DATA
// ============================================================

/**
 * Obtiene datos para el widget de referidos de un cliente
 */
export async function getReferralWidgetData(
  code: string,
  clienteId: number
) {
  const referral = await prisma.referralProgram.findUnique({
    where: { code },
    include: { software: { include: { growthConfig: true } } },
  });

  if (!referral || referral.referrerId !== clienteId) {
    throw new Error('Código no válido');
  }

  const config = await getRewardConfig(referral.softwareId);
  const tier = await calculateReferrerTier(
    clienteId,
    referral.softwareId,
    config.tiers
  );

  const stats = await prisma.referralProgram.aggregate({
    where: {
      referrerId: clienteId,
      softwareId: referral.softwareId,
    },
    _sum: { clicks: true, signups: true },
    _count: { id: true },
  });

  const converted = await prisma.referralProgram.count({
    where: {
      referrerId: clienteId,
      softwareId: referral.softwareId,
      status: 'CONVERTED',
    },
  });

  const nextTier = config.tiers.find((t) => t.minReferrals > converted);

  return {
    code: referral.code,
    url: `${process.env.APP_URL}/r/${referral.code}`,
    tier,
    nextTier: nextTier || null,
    stats: {
      clicks: stats._sum.clicks || 0,
      signups: stats._sum.signups || 0,
      converted,
      total: stats._count.id,
    },
    rewardType: config.rewardType,
    rewardValue: config.rewardValue,
    doubleReward: config.doubleReward,
  };
}

export default {
  createReferralLink,
  trackReferralClick,
  trackReferralConversion,
  processReferralReward,
  getReferralStats,
  getClientReferrals,
  getReferralLeaderboard,
  getReferralWidgetData,
  calculateReferrerTier,
};
