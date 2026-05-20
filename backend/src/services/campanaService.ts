import { prisma } from '../config/database';
import { logger } from '../utils/logger';
import { renderTemplate, contextFromLead, getPlantilla } from './emailService';

export interface CampanaFilters {
  softwareId?: string;
  estado?: string;
}

export interface LeadAudienceFilters {
  softwareId: string;
  estado?: string;
  prioridad?: string;
  origen?: string;
}

export interface CreateCampanaInput {
  softwareId: string;
  nombre: string;
  senderId: string;
  plantillaId: string;
  audiencia: LeadAudienceFilters;
  programadaPara?: Date | null;
  creadoPor?: number | null;
  variantes?: VarianteInput[];
}

export interface VarianteInput {
  letra: string; // "A", "B", ...
  asunto: string;
  cuerpoHtml: string;
  porcentaje: number; // % del total. Suma de todas las variantes <= 100.
}

/**
 * Construye el where de prisma.lead para una audiencia de campaña.
 * Siempre exige email != null y excluye leads dados de baja.
 */
async function buildLeadWhere(a: LeadAudienceFilters) {
  const bajas = await prisma.emailBaja.findMany({
    where: { softwareId: a.softwareId },
    select: { email: true },
  });
  const emailsBaja = bajas.map((b) => b.email.toLowerCase());

  const where: any = {
    softwareId: a.softwareId,
    email: { not: null },
  };
  if (emailsBaja.length > 0) {
    where.email = { not: null, notIn: emailsBaja };
  }
  if (a.estado) where.estado = a.estado;
  if (a.prioridad) where.prioridad = a.prioridad;
  if (a.origen) where.origen = a.origen;
  return where;
}

/**
 * Cuenta y devuelve sample de leads que matchean la audiencia (para preview en wizard).
 */
export async function previewAudiencia(a: LeadAudienceFilters, sampleSize = 5) {
  const where = await buildLeadWhere(a);
  const [total, sample] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.findMany({
      where,
      take: sampleSize,
      orderBy: { createdAt: 'desc' },
      select: { id: true, nombre: true, email: true, empresa: true, metadata: true, telefono: true },
    }),
  ]);
  return { total, sample };
}

export async function listCampanas(filters: CampanaFilters = {}) {
  return prisma.emailCampana.findMany({
    where: {
      ...(filters.softwareId ? { softwareId: filters.softwareId } : {}),
      ...(filters.estado ? { estado: filters.estado } : {}),
    },
    orderBy: { createdAt: 'desc' },
    include: {
      sender: { select: { id: true, email: true, nombre: true } },
      plantilla: { select: { id: true, nombre: true } },
    },
  });
}

export async function getCampana(id: string) {
  return prisma.emailCampana.findUnique({
    where: { id },
    include: {
      sender: { select: { id: true, email: true, nombre: true } },
      plantilla: { select: { id: true, nombre: true } },
      variantes: { orderBy: { letra: 'asc' } },
    },
  });
}

/**
 * Promueve una variante como ganadora: convierte todos los envíos "reservado" de la campaña
 * en pendiente, asignándoles el contenido y la varianteId de la ganadora.
 * Re-renderiza por lead para mantener la personalización.
 */
export async function promoverGanadora(campanaId: string, varianteId: string) {
  const campana = await prisma.emailCampana.findUnique({
    where: { id: campanaId },
    include: { variantes: true },
  });
  if (!campana) throw new Error('Campaña no encontrada');
  if (!campana.esAbTest) throw new Error('Esta campaña no es A/B test');
  if (campana.ganadoraPromovidaEn) throw new Error('Ya se promovió una ganadora');

  const variante = campana.variantes.find((v) => v.id === varianteId);
  if (!variante) throw new Error('Variante no encontrada en esta campaña');

  // Buscar envíos reservados con su lead para re-renderizar
  const reservados = await prisma.emailEnvio.findMany({
    where: { campanaId, estado: 'reservado' },
    include: {
      // No tenemos relation a Lead aquí; cargamos los leads aparte
    },
  });
  if (reservados.length === 0) {
    throw new Error('No hay envíos reservados pendientes en esta campaña');
  }

  const leadIds = reservados.map((e) => e.leadId).filter(Boolean) as string[];
  const leadsMap = new Map<string, any>();
  if (leadIds.length > 0) {
    const leads = await prisma.lead.findMany({
      where: { id: { in: leadIds } },
      select: { id: true, nombre: true, email: true, empresa: true, telefono: true, metadata: true },
    });
    for (const l of leads) leadsMap.set(l.id, l);
  }

  // Actualizar en transacciones de 100 para no saturar
  const CHUNK = 100;
  for (let i = 0; i < reservados.length; i += CHUNK) {
    const slice = reservados.slice(i, i + CHUNK);
    await prisma.$transaction(
      slice.map((envio) => {
        const lead = envio.leadId ? leadsMap.get(envio.leadId) : null;
        const ctx = lead ? contextFromLead(lead) : {};
        return prisma.emailEnvio.update({
          where: { id: envio.id },
          data: {
            varianteId: variante.id,
            reservado: false,
            estado: 'pendiente',
            asunto: renderTemplate(variante.asunto, ctx),
            cuerpoHtml: renderTemplate(variante.cuerpoHtml, ctx),
          },
        });
      }),
    );
  }

  await prisma.emailVariante.update({
    where: { id: variante.id },
    data: { esGanadora: true },
  });
  await prisma.emailCampana.update({
    where: { id: campanaId },
    data: { ganadoraPromovidaEn: new Date() },
  });

  // Si la campaña está en estado 'enviada' (ya completó la primera ronda),
  // necesitamos volver a estado 'enviando' y relanzar el worker.
  const fresh = await prisma.emailCampana.findUnique({ where: { id: campanaId } });
  if (fresh && (fresh.estado === 'enviada' || fresh.estado === 'borrador')) {
    await prisma.emailCampana.update({
      where: { id: campanaId },
      data: { estado: 'enviando', iniciadaEn: new Date(), completadaEn: null },
    });
    const { processCampanaWorker } = await import('../jobs/emailWorker');
    setImmediate(() => {
      processCampanaWorker(campanaId).catch((err) => logger.error(`worker(${campanaId})`, err));
    });
  }

  return prisma.emailCampana.findUnique({
    where: { id: campanaId },
    include: { variantes: { orderBy: { letra: 'asc' } } },
  });
}

/**
 * Crea una campaña en estado 'borrador' y materializa un EmailEnvio (pendiente) por cada lead matched.
 * Renderiza asunto/cuerpo por lead con sus variables.
 */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function createCampana(input: CreateCampanaInput) {
  const plantilla = await getPlantilla(input.plantillaId);
  if (!plantilla) throw new Error('Plantilla no encontrada');

  const sender = await prisma.emailSender.findUnique({ where: { id: input.senderId } });
  if (!sender) throw new Error('Sender no encontrado');
  if (!sender.activo) throw new Error('Sender desactivado');

  const variantes = input.variantes || [];
  const esAbTest = variantes.length >= 2;

  if (esAbTest) {
    const sum = variantes.reduce((s, v) => s + v.porcentaje, 0);
    if (sum <= 0 || sum > 100) {
      throw new Error('La suma de % de variantes debe ser >0 y ≤100');
    }
    if (variantes.some((v) => !v.asunto || !v.cuerpoHtml || !v.letra)) {
      throw new Error('Cada variante necesita letra, asunto y cuerpo');
    }
    const letras = new Set(variantes.map((v) => v.letra));
    if (letras.size !== variantes.length) {
      throw new Error('Las letras de las variantes deben ser únicas');
    }
  }

  const where = await buildLeadWhere(input.audiencia);
  const leads = await prisma.lead.findMany({
    where,
    select: { id: true, nombre: true, email: true, empresa: true, telefono: true, metadata: true },
  });
  if (leads.length === 0) {
    throw new Error('La audiencia está vacía — ajusta los filtros');
  }

  const campana = await prisma.emailCampana.create({
    data: {
      softwareId: input.softwareId,
      nombre: input.nombre,
      senderId: input.senderId,
      plantillaId: input.plantillaId,
      asuntoSnapshot: esAbTest ? variantes[0].asunto : plantilla.asunto,
      cuerpoSnapshot: esAbTest ? variantes[0].cuerpoHtml : plantilla.cuerpoHtml,
      esAbTest,
      totalLeads: leads.length,
      filtros: input.audiencia as any,
      programadaPara: input.programadaPara || null,
      creadoPor: input.creadoPor || null,
    },
  });

  // Crear las variantes (si hay)
  const varianteIds: Record<string, string> = {}; // letra -> id
  if (esAbTest) {
    for (const v of variantes) {
      const created = await prisma.emailVariante.create({
        data: {
          campanaId: campana.id,
          letra: v.letra,
          asunto: v.asunto,
          cuerpoHtml: v.cuerpoHtml,
          porcentaje: v.porcentaje,
        },
      });
      varianteIds[v.letra] = created.id;
    }
  }

  const leadsValid = leads.filter((l) => l.email);

  if (!esAbTest) {
    // Modo simple: todos los envíos pendientes con el contenido de la plantilla
    const enviosData = leadsValid.map((lead) => {
      const ctx = contextFromLead(lead);
      return {
        campanaId: campana.id,
        leadId: lead.id,
        senderId: input.senderId,
        destinatario: lead.email!,
        asunto: renderTemplate(plantilla.asunto, ctx),
        cuerpoHtml: renderTemplate(plantilla.cuerpoHtml, ctx),
        estado: 'pendiente' as const,
      };
    });
    const CHUNK = 500;
    for (let i = 0; i < enviosData.length; i += CHUNK) {
      await prisma.emailEnvio.createMany({ data: enviosData.slice(i, i + CHUNK) });
    }
    return campana;
  }

  // Modo A/B: reparte la audiencia por variante; el resto queda reservado
  const shuffled = shuffle(leadsValid);
  let cursor = 0;
  const enviosBatch: any[] = [];

  for (const v of variantes) {
    const cantidad = Math.floor(shuffled.length * (v.porcentaje / 100));
    const slice = shuffled.slice(cursor, cursor + cantidad);
    cursor += cantidad;
    for (const lead of slice) {
      const ctx = contextFromLead(lead);
      enviosBatch.push({
        campanaId: campana.id,
        varianteId: varianteIds[v.letra],
        leadId: lead.id,
        senderId: input.senderId,
        destinatario: lead.email!,
        asunto: renderTemplate(v.asunto, ctx),
        cuerpoHtml: renderTemplate(v.cuerpoHtml, ctx),
        estado: 'pendiente',
      });
    }
  }

  // Restantes → reservados (sin variante asignada, contenido de plantilla como placeholder)
  for (const lead of shuffled.slice(cursor)) {
    const ctx = contextFromLead(lead);
    enviosBatch.push({
      campanaId: campana.id,
      leadId: lead.id,
      senderId: input.senderId,
      destinatario: lead.email!,
      asunto: renderTemplate(plantilla.asunto, ctx),
      cuerpoHtml: renderTemplate(plantilla.cuerpoHtml, ctx),
      estado: 'reservado',
      reservado: true,
    });
  }

  const CHUNK = 500;
  for (let i = 0; i < enviosBatch.length; i += CHUNK) {
    await prisma.emailEnvio.createMany({ data: enviosBatch.slice(i, i + CHUNK) });
  }

  return campana;
}

export async function cancelarCampana(id: string) {
  const campana = await prisma.emailCampana.findUnique({ where: { id } });
  if (!campana) throw new Error('Campaña no encontrada');
  if (campana.estado === 'enviada') throw new Error('La campaña ya está enviada');

  await prisma.$transaction([
    prisma.emailCampana.update({
      where: { id },
      data: { estado: 'cancelada', completadaEn: new Date() },
    }),
    prisma.emailEnvio.updateMany({
      where: { campanaId: id, estado: 'pendiente' },
      data: { estado: 'fallido', error: 'Campaña cancelada' },
    }),
  ]);

  logger.info(`Campaña ${id} cancelada`);
  return prisma.emailCampana.findUnique({ where: { id } });
}

/**
 * Marca como 'enviando' e dispara el worker async (fire-and-forget).
 */
export async function lanzarCampana(id: string) {
  const campana = await prisma.emailCampana.findUnique({ where: { id } });
  if (!campana) throw new Error('Campaña no encontrada');
  if (campana.estado !== 'borrador') {
    throw new Error(`La campaña está en estado "${campana.estado}", no se puede lanzar`);
  }

  await prisma.emailCampana.update({
    where: { id },
    data: { estado: 'enviando', iniciadaEn: new Date() },
  });

  // Lanzar worker async (no esperamos)
  const { processCampanaWorker } = await import('../jobs/emailWorker');
  setImmediate(() => {
    processCampanaWorker(id).catch((err) => {
      logger.error(`emailWorker(${id}) crashed:`, err);
      prisma.emailCampana.update({
        where: { id },
        data: { estado: 'error', completadaEn: new Date() },
      }).catch(() => undefined);
    });
  });

  return prisma.emailCampana.findUnique({ where: { id } });
}

export async function listEnviosByCampana(campanaId: string, page = 1, limit = 50, estadoFilter?: string) {
  const where: any = { campanaId };
  if (estadoFilter) where.estado = estadoFilter;
  const [envios, total] = await Promise.all([
    prisma.emailEnvio.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'asc' },
    }),
    prisma.emailEnvio.count({ where }),
  ]);
  return { envios, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}
