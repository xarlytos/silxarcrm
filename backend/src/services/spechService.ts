import { prisma } from '../config/database';

export interface ObjecionRespuesta {
  objecion: string;
  respuesta: string;
}

export interface CreateSpechInput {
  softwareId: string;
  titulo: string;
  contenido: string;
  objetivo?: string;
  objeciones?: ObjecionRespuesta[];
  orden?: number;
  activo?: boolean;
  esDefault?: boolean;
}

export interface UpdateSpechInput {
  titulo?: string;
  contenido?: string;
  objetivo?: string;
  objeciones?: ObjecionRespuesta[];
  orden?: number;
  activo?: boolean;
}

function sanitizeObjeciones(input?: ObjecionRespuesta[]): ObjecionRespuesta[] {
  if (!Array.isArray(input)) return [];
  return input
    .map((o) => ({
      objecion: (o?.objecion || '').trim(),
      respuesta: (o?.respuesta || '').trim(),
    }))
    .filter((o) => o.objecion.length > 0 && o.respuesta.length > 0);
}

export async function listSpechs(softwareId?: string) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  return prisma.spechLlamada.findMany({
    where,
    orderBy: [{ esDefault: 'desc' }, { orden: 'asc' }, { createdAt: 'asc' }],
  });
}

export async function getSpechById(id: string) {
  return prisma.spechLlamada.findUnique({ where: { id } });
}

export async function createSpech(input: CreateSpechInput) {
  if (!input.softwareId?.trim()) throw new Error('softwareId obligatorio');
  if (!input.titulo?.trim()) throw new Error('titulo obligatorio');
  if (!input.contenido?.trim()) throw new Error('contenido obligatorio');

  const max = await prisma.spechLlamada.aggregate({
    where: { softwareId: input.softwareId },
    _max: { orden: true },
  });

  const existeDefault = await prisma.spechLlamada.findFirst({
    where: { softwareId: input.softwareId, esDefault: true },
  });

  return prisma.spechLlamada.create({
    data: {
      softwareId: input.softwareId,
      titulo: input.titulo.trim(),
      contenido: input.contenido,
      objetivo: input.objetivo?.trim() || 'Cierre',
      objeciones: sanitizeObjeciones(input.objeciones) as any,
      orden: input.orden ?? (max._max.orden ?? 0) + 1,
      activo: input.activo ?? true,
      esDefault: input.esDefault ?? !existeDefault,
    },
  });
}

export async function updateSpech(id: string, input: UpdateSpechInput) {
  const existing = await prisma.spechLlamada.findUnique({ where: { id } });
  if (!existing) return null;

  return prisma.spechLlamada.update({
    where: { id },
    data: {
      ...(input.titulo !== undefined && { titulo: input.titulo.trim() }),
      ...(input.contenido !== undefined && { contenido: input.contenido }),
      ...(input.objetivo !== undefined && { objetivo: input.objetivo }),
      ...(input.objeciones !== undefined && { objeciones: sanitizeObjeciones(input.objeciones) as any }),
      ...(input.orden !== undefined && { orden: input.orden }),
      ...(input.activo !== undefined && { activo: input.activo }),
    },
  });
}

export async function deleteSpech(id: string) {
  const existing = await prisma.spechLlamada.findUnique({ where: { id } });
  if (!existing) return null;
  await prisma.spechLlamada.delete({ where: { id } });
  return existing;
}

export async function setDefaultSpech(id: string) {
  const target = await prisma.spechLlamada.findUnique({ where: { id } });
  if (!target) return null;

  await prisma.$transaction([
    prisma.spechLlamada.updateMany({
      where: { softwareId: target.softwareId, esDefault: true },
      data: { esDefault: false },
    }),
    prisma.spechLlamada.update({
      where: { id },
      data: { esDefault: true, activo: true },
    }),
  ]);

  return prisma.spechLlamada.findUnique({ where: { id } });
}

export async function reorderSpechs(softwareId: string, ids: string[]) {
  await prisma.$transaction(
    ids.map((id, index) =>
      prisma.spechLlamada.update({
        where: { id },
        data: { orden: index },
      })
    )
  );
  return listSpechs(softwareId);
}

export async function duplicateSpech(id: string) {
  const original = await prisma.spechLlamada.findUnique({ where: { id } });
  if (!original) return null;

  const max = await prisma.spechLlamada.aggregate({
    where: { softwareId: original.softwareId },
    _max: { orden: true },
  });

  return prisma.spechLlamada.create({
    data: {
      softwareId: original.softwareId,
      titulo: `${original.titulo} (copia)`,
      contenido: original.contenido,
      objetivo: original.objetivo,
      objeciones: (original.objeciones as any) ?? undefined,
      orden: (max._max.orden ?? 0) + 1,
      activo: true,
      esDefault: false,
    },
  });
}

export function rellenarVariables(
  contenido: string,
  vars: Record<string, string | null | undefined>
): string {
  return contenido.replace(/\{\{\s*(\w+)\s*\}\}/g, (_match, key) => {
    const value = vars[key];
    if (value === null || value === undefined || value === '') return `{{${key}}}`;
    return String(value);
  });
}
