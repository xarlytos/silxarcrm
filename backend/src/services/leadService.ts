import { prisma } from '../config/database';
import { LeadEstado, PrioridadLead } from '@prisma/client';
import { logger } from '../utils/logger';

export interface LeadFilters {
  estado?: LeadEstado;
  prioridad?: PrioridadLead;
  origen?: string;
  softwareId?: string;
  asignadoA?: number;
  search?: string;
  desde?: string;
  hasta?: string;
  page?: number;
  limit?: number;
  tipoTelefono?: 'fijo' | 'movil';
  hasTelefono?: boolean;
  hasEmail?: boolean;
  sector?: string;
  excludeTags?: string[];
  includeTags?: string[];
}

export interface CreateLeadInput {
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  pais?: string;
  origen?: string;
  softwareId: string;
  estado?: LeadEstado;
  prioridad?: PrioridadLead;
  notas?: string;
  asignadoA?: number;
  metadata?: any;
}

export interface UpdateLeadInput {
  nombre?: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  pais?: string;
  origen?: string;
  softwareId?: string;
  estado?: LeadEstado;
  prioridad?: PrioridadLead;
  notas?: string;
  asignadoA?: number | null;
  metadata?: any;
}

export interface CSVRow {
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  cargo?: string;
  pais?: string;
  origen?: string;
  estado?: string;
  prioridad?: string;
  notas?: string;
}

export interface ImportResult {
  creados: number;
  duplicados: number;
  errores: number;
  detalles: string[];
}

function normalizeEstado(val?: string): LeadEstado {
  if (!val) return LeadEstado.NUEVO;
  const v = val.toUpperCase().trim().replace(/\s+/g, '_');
  const map: Record<string, LeadEstado> = {
    NUEVO: LeadEstado.NUEVO,
    CONTACTADO: LeadEstado.CONTACTADO,
    INTERESADO: LeadEstado.INTERESADO,
    'EN SEGUIMIENTO': LeadEstado.EN_SEGUIMIENTO,
    EN_SEGUIMIENTO: LeadEstado.EN_SEGUIMIENTO,
    CALIFICADO: LeadEstado.CALIFICADO,
    RECHAZADO: LeadEstado.RECHAZADO,
    'NO RESPONDE': LeadEstado.NO_RESPONDE,
    NO_RESPONDE: LeadEstado.NO_RESPONDE,
    CONVERTIDO: LeadEstado.CONVERTIDO,
  };
  return map[v] || LeadEstado.NUEVO;
}

function normalizePrioridad(val?: string): PrioridadLead {
  if (!val) return PrioridadLead.MEDIA;
  const v = val.toUpperCase().trim();
  const map: Record<string, PrioridadLead> = {
    BAJA: PrioridadLead.BAJA,
    MEDIA: PrioridadLead.MEDIA,
    ALTA: PrioridadLead.ALTA,
    URGENTE: PrioridadLead.URGENTE,
  };
  return map[v] || PrioridadLead.MEDIA;
}

export async function listLeads(filters: LeadFilters) {
  const {
    estado,
    prioridad,
    origen,
    softwareId,
    asignadoA,
    search,
    desde,
    hasta,
    page = 1,
    limit = 25,
    tipoTelefono,
    hasTelefono,
    hasEmail,
    sector,
    excludeTags,
    includeTags,
  } = filters;

  const where: any = { AND: [] as any[] };
  if (estado) where.estado = estado;
  if (prioridad) where.prioridad = prioridad;
  if (origen) where.origen = { equals: origen, mode: 'insensitive' };
  if (softwareId) where.softwareId = softwareId;
  if (asignadoA !== undefined) where.asignadoA = asignadoA;
  if (desde || hasta) {
    where.createdAt = {};
    if (desde) where.createdAt.gte = new Date(desde);
    if (hasta) where.createdAt.lte = new Date(hasta);
  }
  if (search) {
    where.AND.push({
      OR: [
        { nombre: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { empresa: { contains: search, mode: 'insensitive' } },
      ],
    });
  }

  // Presencia de email
  if (hasEmail === true) where.email = { not: null };
  else if (hasEmail === false) where.email = null;

  // Filtro por sector (vive en metadata.iaClassification.sector)
  if (sector) {
    where.AND.push({
      metadata: {
        path: ['iaClassification', 'sector'],
        equals: sector,
      },
    });
  }

  // Excluir leads con etiquetas concretas (ej. revisar-manualmente)
  if (excludeTags && excludeTags.length) {
    where.AND.push({
      NOT: { etiquetas: { some: { nombre: { in: excludeTags } } } },
    });
  }

  // Incluir solo leads con alguna de estas etiquetas
  if (includeTags && includeTags.length) {
    where.AND.push({
      etiquetas: { some: { nombre: { in: includeTags } } },
    });
  }

  // Presencia de teléfono (si no se ha pedido tipo específico)
  if (!tipoTelefono) {
    if (hasTelefono === true) where.telefono = { not: null };
    else if (hasTelefono === false) where.telefono = null;
  }

  // Tipo de teléfono (móvil ES: 6/7, fijo ES: 8/9, soporta prefijo +34 con o sin espacio)
  if (tipoTelefono === 'movil') {
    where.AND.push({
      OR: [
        { telefono: { startsWith: '6' } },
        { telefono: { startsWith: '7' } },
        { telefono: { startsWith: '+346' } },
        { telefono: { startsWith: '+347' } },
        { telefono: { startsWith: '+34 6' } },
        { telefono: { startsWith: '+34 7' } },
      ],
    });
  } else if (tipoTelefono === 'fijo') {
    where.AND.push({
      OR: [
        { telefono: { startsWith: '8' } },
        { telefono: { startsWith: '9' } },
        { telefono: { startsWith: '+348' } },
        { telefono: { startsWith: '+349' } },
        { telefono: { startsWith: '+34 8' } },
        { telefono: { startsWith: '+34 9' } },
      ],
    });
  }

  if (where.AND.length === 0) delete where.AND;

  const [leads, total] = await Promise.all([
    prisma.lead.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        etiquetas: true,
        gestor: { select: { id: true, nombre: true, email: true } },
        _count: { select: { historial: true } },
      },
    }),
    prisma.lead.count({ where }),
  ]);

  return { leads, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getLeadById(id: string) {
  return prisma.lead.findUnique({
    where: { id },
    include: {
      historial: { orderBy: { createdAt: 'desc' } },
      etiquetas: true,
      gestor: { select: { id: true, nombre: true, email: true } },
    },
  });
}

export async function createLead(data: CreateLeadInput, usuarioId?: number) {
  if (!data.softwareId || !data.softwareId.trim()) {
    throw new Error('El software es obligatorio');
  }
  const lead = await prisma.lead.create({
    data: {
      ...data,
      estado: data.estado || LeadEstado.NUEVO,
      prioridad: data.prioridad || PrioridadLead.MEDIA,
    },
    include: { etiquetas: true },
  });

  await prisma.leadHistorial.create({
    data: {
      leadId: lead.id,
      tipo: 'creacion',
      descripcion: 'Lead creado',
      usuarioId: usuarioId || null,
    },
  });

  return lead;
}

export async function updateLead(id: string, data: UpdateLeadInput, usuarioId?: number) {
  if (data.softwareId !== undefined && (!data.softwareId || !data.softwareId.trim())) {
    throw new Error('El software es obligatorio');
  }
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return null;

  const lead = await prisma.lead.update({
    where: { id },
    data,
    include: { etiquetas: true },
  });

  if (data.estado && data.estado !== existing.estado) {
    await prisma.leadHistorial.create({
      data: {
        leadId: id,
        tipo: 'cambio_estado',
        descripcion: `Estado cambiado de "${existing.estado}" a "${data.estado}"`,
        usuarioId: usuarioId || null,
      },
    });
  }

  return lead;
}

export async function deleteLead(id: string) {
  return prisma.lead.delete({ where: { id } });
}

export async function addHistorial(
  leadId: string,
  tipo: string,
  descripcion: string,
  usuarioId?: number
) {
  const existing = await prisma.lead.findUnique({ where: { id: leadId } });
  if (!existing) return null;

  const entry = await prisma.leadHistorial.create({
    data: { leadId, tipo, descripcion, usuarioId: usuarioId || null },
  });

  if (tipo === 'contacto') {
    await prisma.lead.update({
      where: { id: leadId },
      data: { ultimoContacto: new Date() },
    });
  }

  return entry;
}

export async function changeLeadStatus(
  id: string,
  estado: LeadEstado,
  usuarioId?: number,
  motivo?: string
) {
  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return null;

  const lead = await prisma.lead.update({
    where: { id },
    data: { estado },
  });

  let descripcion = `Estado cambiado de "${existing.estado}" a "${estado}"`;
  if (motivo) descripcion += `. Motivo: ${motivo}`;

  await prisma.leadHistorial.create({
    data: { leadId: id, tipo: 'cambio_estado', descripcion, usuarioId: usuarioId || null },
  });

  return lead;
}

export async function importLeadsFromCSV(
  rows: CSVRow[],
  softwareId: string,
  usuarioId?: number
): Promise<ImportResult> {
  const result: ImportResult = { creados: 0, duplicados: 0, errores: 0, detalles: [] };

  const seenEmails = new Set<string>();

  for (const row of rows) {
    try {
      if (!row.nombre) {
        result.errores++;
        result.detalles.push(`Fila sin nombre: ${JSON.stringify(row)}`);
        continue;
      }

      const email = row.email?.trim().toLowerCase() || null;
      if (email) {
        if (seenEmails.has(email)) {
          result.duplicados++;
          result.detalles.push(`Email duplicado en archivo: ${email}`);
          continue;
        }
        seenEmails.add(email);

        const exists = await prisma.lead.findUnique({
          where: { email_softwareId: { email, softwareId } },
        });
        if (exists) {
          result.duplicados++;
          result.detalles.push(`Lead ya existe: ${email}`);
          continue;
        }
      }

      await prisma.lead.create({
        data: {
          nombre: row.nombre.trim(),
          email,
          telefono: row.telefono?.trim() || null,
          empresa: row.empresa?.trim() || null,
          cargo: row.cargo?.trim() || null,
          pais: row.pais?.trim() || null,
          origen: row.origen?.trim() || 'csv',
          softwareId,
          estado: normalizeEstado(row.estado),
          prioridad: normalizePrioridad(row.prioridad),
          notas: row.notas?.trim() || null,
        },
      });

      result.creados++;
    } catch (err) {
      result.errores++;
      result.detalles.push(`Error en fila ${row.email || '?'}: ${(err as Error).message}`);
      logger.error('CSV import row error:', err);
    }
  }

  if (result.creados > 0) {
    await prisma.leadHistorial.createMany({
      data: rows.slice(0, result.creados).map(() => ({
        leadId: 'placeholder',
        tipo: 'importacion',
        descripcion: 'Lead importado desde CSV',
        usuarioId: usuarioId || null,
      })),
    });
  }

  return result;
}

export async function listLeadSectores(softwareId?: string): Promise<string[]> {
  const sw = softwareId ?? null;
  const rows = await prisma.$queryRaw<{ sector: string | null }[]>`
    SELECT DISTINCT metadata->'iaClassification'->>'sector' AS sector
    FROM leads
    WHERE metadata->'iaClassification'->>'sector' IS NOT NULL
      AND (${sw}::text IS NULL OR software_id = ${sw})
  `;
  return rows
    .map((r) => (r.sector || '').trim())
    .filter((s) => s.length > 0)
    .sort((a, b) => a.localeCompare(b, 'es'));
}

export async function getLeadStats(
  softwareId?: string,
  opts?: { excludeTags?: string[]; includeTags?: string[] },
) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  const ands: any[] = [];
  if (opts?.excludeTags?.length) {
    ands.push({ NOT: { etiquetas: { some: { nombre: { in: opts.excludeTags } } } } });
  }
  if (opts?.includeTags?.length) {
    ands.push({ etiquetas: { some: { nombre: { in: opts.includeTags } } } });
  }
  if (ands.length) where.AND = ands;

  const [total, porEstado, porPrioridad, recientes] = await Promise.all([
    prisma.lead.count({ where }),
    prisma.lead.groupBy({ by: ['estado'], where, _count: { estado: true } }),
    prisma.lead.groupBy({ by: ['prioridad'], where, _count: { prioridad: true } }),
    prisma.lead.count({
      where: { ...where, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);

  return { total, porEstado, porPrioridad, recientes7d: recientes };
}

export async function convertLeadToCliente(id: string, usuarioId?: number) {
  const lead = await prisma.lead.findUnique({ where: { id } });
  if (!lead) return null;
  if (lead.estado === LeadEstado.CONVERTIDO) return null;
  if (!lead.email) {
    throw new Error('El lead no tiene email — no se puede convertir a cliente sin email');
  }

  const cliente = await prisma.clienteGlobal.create({
    data: {
      email: lead.email,
      nombre: lead.nombre,
      telefono: lead.telefono,
      pais: lead.pais,
      empresa: lead.empresa,
      origenSaas: lead.softwareId,
      estado: 'activo',
      notasInternas: lead.notas || undefined,
      metadata: lead.metadata || undefined,
    },
  });

  await prisma.lead.update({
    where: { id },
    data: { estado: LeadEstado.CONVERTIDO, convertidoA: cliente.id },
  });

  await prisma.leadHistorial.create({
    data: {
      leadId: id,
      tipo: 'conversion',
      descripcion: `Lead convertido a cliente #${cliente.id}`,
      usuarioId: usuarioId || null,
    },
  });

  return { lead, cliente };
}
