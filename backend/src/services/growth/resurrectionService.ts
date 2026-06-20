import { randomUUID } from 'crypto';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';
import { scheduleAction } from './activationService';

// ============================================================
// Resurrección masiva del Cementerio
// ------------------------------------------------------------
// Convierte el Cementerio (leads inactivos) en una campaña de un
// click: genera un mensaje de reactivación personalizado por lead
// (lazy, en el momento del envío) y lo lanza en una cola escalonada
// por WhatsApp + email reutilizando activationService.scheduleAction.
// ============================================================

export type ResurrectionCanal = 'whatsapp' | 'email' | 'ambos';

/** Estados "muertos" por defecto: leads que no respondieron o rechazaron */
export const DEAD_STATES = ['NO_RESPONDE', 'RECHAZADO'];

/** Estados que indican que un lead "ha vuelto a la vida" */
const REVIVED_STATES = ['CONTACTADO', 'INTERESADO', 'EN_SEGUIMIENTO', 'CALIFICADO', 'CONVERTIDO'];

export interface ResurrectionOptions {
  /** Mínimo de días sin contacto para considerar el lead inactivo (default 90) */
  diasMin?: number;
  /** Estados a incluir (default NO_RESPONDE + RECHAZADO) */
  estados?: string[];
  /** Canal de la campaña */
  canal?: ResurrectionCanal;
  /** Minutos entre cada envío de la cola escalonada (default 3) */
  staggerMinutes?: number;
  /** Tope de leads a procesar (default 200) */
  maxLeads?: number;
  /** Pretexto/ángulo opcional para la IA (se aplica a toda la campaña) */
  pretexto?: string;
}

interface NormalizedOptions {
  diasMin: number;
  estados: string[];
  canal: ResurrectionCanal;
  staggerMinutes: number;
  maxLeads: number;
  pretexto?: string;
}

function normalize(opts: ResurrectionOptions = {}): NormalizedOptions {
  return {
    diasMin: Math.max(0, opts.diasMin ?? 90),
    estados: opts.estados?.length ? opts.estados : DEAD_STATES,
    canal: opts.canal ?? 'ambos',
    staggerMinutes: Math.min(Math.max(opts.staggerMinutes ?? 3, 0), 240),
    maxLeads: Math.min(Math.max(opts.maxLeads ?? 200, 1), 1000),
    pretexto: opts.pretexto?.trim() || undefined,
  };
}

/**
 * Obtiene los leads candidatos a resurrección según el canal elegido.
 */
async function getCandidates(softwareId: string, o: NormalizedOptions) {
  const cutoff = new Date(Date.now() - o.diasMin * 24 * 3600 * 1000);

  const and: any[] = [
    { OR: [{ ultimoContacto: { lte: cutoff } }, { ultimoContacto: null }] },
  ];

  if (o.canal === 'whatsapp') {
    and.push({ telefono: { not: null } });
  } else if (o.canal === 'email') {
    and.push({ email: { not: null } });
  } else {
    // ambos: necesita al menos un canal alcanzable
    and.push({ OR: [{ telefono: { not: null } }, { email: { not: null } }] });
  }

  return prisma.lead.findMany({
    where: {
      softwareId,
      estado: { in: o.estados as any },
      AND: and,
    },
    orderBy: { ultimoContacto: 'asc' },
    take: o.maxLeads,
  });
}

/**
 * Previsualiza la campaña: cuántos leads entran y por qué canal son alcanzables.
 */
export async function previewMassResurrection(softwareId: string, opts: ResurrectionOptions = {}) {
  const o = normalize(opts);
  const leads = await getCandidates(softwareId, o);

  const conTelefono = leads.filter((l) => l.telefono).length;
  const conEmail = leads.filter((l) => l.email).length;
  const sinCanal = leads.filter((l) => !l.telefono && !l.email).length;

  // Nº de envíos que se programarían realmente según el canal
  let enviosWhatsapp = 0;
  let enviosEmail = 0;
  for (const l of leads) {
    if ((o.canal === 'whatsapp' || o.canal === 'ambos') && l.telefono) enviosWhatsapp++;
    if ((o.canal === 'email' || o.canal === 'ambos') && l.email) enviosEmail++;
  }

  const totalEnvios = enviosWhatsapp + enviosEmail;
  const duracionMin = Math.max(0, (totalEnvios - 1)) * o.staggerMinutes;

  return {
    softwareId,
    opciones: o,
    totalLeads: leads.length,
    conTelefono,
    conEmail,
    sinCanal,
    enviosWhatsapp,
    enviosEmail,
    totalEnvios,
    duracionEstimadaMin: duracionMin,
    muestra: leads.slice(0, 10).map((l) => ({
      id: l.id,
      nombre: l.nombre,
      empresa: l.empresa,
      estado: l.estado,
      canal: l.telefono ? 'whatsapp' : 'email',
      diasInactivo: l.ultimoContacto
        ? Math.floor((Date.now() - new Date(l.ultimoContacto).getTime()) / (24 * 3600 * 1000))
        : null,
    })),
  };
}

/**
 * Lanza la resurrección masiva: programa los envíos escalonados y etiqueta
 * cada lead con la metadata del batch para poder medir la tasa de resurrección.
 */
export async function launchMassResurrection(softwareId: string, opts: ResurrectionOptions = {}) {
  const o = normalize(opts);
  const leads = await getCandidates(softwareId, o);

  if (leads.length === 0) {
    return { batchId: null, totalLeads: 0, scheduled: 0, enviosWhatsapp: 0, enviosEmail: 0 };
  }

  const batchId = randomUUID();
  const launchedAt = new Date().toISOString();

  let scheduled = 0;
  let enviosWhatsapp = 0;
  let enviosEmail = 0;
  let step = 0; // posición en la cola escalonada (cada paso suma staggerMinutes)

  for (const lead of leads) {
    const baseMeta = { batchId, canal: o.canal, pretexto: o.pretexto, resurreccion: true };

    if ((o.canal === 'whatsapp' || o.canal === 'ambos') && lead.telefono) {
      const delayMs = step * o.staggerMinutes * 60 * 1000;
      await scheduleAction(lead.id, 'resurreccion_whatsapp', delayMs, baseMeta);
      enviosWhatsapp++;
      scheduled++;
      step++;
    }

    if ((o.canal === 'email' || o.canal === 'ambos') && lead.email) {
      const delayMs = step * o.staggerMinutes * 60 * 1000;
      await scheduleAction(lead.id, 'resurreccion_email', delayMs, baseMeta);
      enviosEmail++;
      scheduled++;
      step++;
    }

    // Etiquetar el lead con la metadata del batch para medir la resurrección
    await prisma.lead.update({
      where: { id: lead.id },
      data: {
        metadata: {
          ...(typeof lead.metadata === 'object' && lead.metadata !== null ? lead.metadata : {}),
          resurreccion: {
            batchId,
            launchedAt,
            canal: o.canal,
            estadoAlLanzar: lead.estado,
          },
        },
      },
    });

    await prisma.leadHistorial.create({
      data: {
        leadId: lead.id,
        tipo: 'RESURRECCION_MASIVA',
        descripcion: `Incluido en resurrección masiva (batch ${batchId.slice(0, 8)}, canal ${o.canal}).`,
      },
    });
  }

  logger.info(
    `[Resurreccion] Batch ${batchId} lanzado para ${softwareId}: ${leads.length} leads, ${scheduled} envíos (${enviosWhatsapp} WA + ${enviosEmail} email)`
  );

  return {
    batchId,
    totalLeads: leads.length,
    scheduled,
    enviosWhatsapp,
    enviosEmail,
    staggerMinutes: o.staggerMinutes,
    duracionEstimadaMin: Math.max(0, scheduled - 1) * o.staggerMinutes,
  };
}

/**
 * Estadísticas de la campaña: tasa de resurrección (cuántos muertos vuelven a la vida).
 */
export async function getResurrectionStats(softwareId: string) {
  const launchedLeads = await prisma.lead.findMany({
    where: {
      softwareId,
      metadata: { path: ['resurreccion', 'launchedAt'], not: { equals: null } } as any,
    },
    select: { id: true, estado: true, metadata: true },
  });

  const launched = launchedLeads.length;
  const revived = launchedLeads.filter((l) => REVIVED_STATES.includes(l.estado)).length;
  const convertidos = launchedLeads.filter((l) => l.estado === 'CONVERTIDO').length;

  const [pending, sent, failed] = await Promise.all([
    prisma.activationLog.count({
      where: { lead: { softwareId }, action: { startsWith: 'resurreccion' }, status: 'PENDING' },
    }),
    prisma.activationLog.count({
      where: { lead: { softwareId }, action: { startsWith: 'resurreccion' }, status: 'EXECUTED' },
    }),
    prisma.activationLog.count({
      where: { lead: { softwareId }, action: { startsWith: 'resurreccion' }, status: 'FAILED' },
    }),
  ]);

  return {
    launched,
    revived,
    convertidos,
    tasaResurreccion: launched > 0 ? Math.round((revived / launched) * 100) : 0,
    envios: { pending, sent, failed },
  };
}

export default {
  previewMassResurrection,
  launchMassResurrection,
  getResurrectionStats,
  DEAD_STATES,
};
