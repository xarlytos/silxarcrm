import { prisma } from '../config/database';
import { FreeValueEstado } from '@prisma/client';

export interface FreeValueFilters {
  softwareId?: string;
  estado?: FreeValueEstado;
  tipo?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateFreeValueInput {
  softwareId: string;
  nombre: string;
  slug: string;
  url: string;
  tipo: string;
  descripcion?: string;
  estado?: FreeValueEstado;
  usos?: number;
  leadsGenerados?: number;
  metadata?: any;
}

export interface UpdateFreeValueInput {
  softwareId?: string;
  nombre?: string;
  slug?: string;
  url?: string;
  tipo?: string;
  descripcion?: string | null;
  estado?: FreeValueEstado;
  usos?: number;
  leadsGenerados?: number;
  metadata?: any;
}

export async function listFreeValues(filters: FreeValueFilters) {
  const { softwareId, estado, tipo, search, page = 1, limit = 50 } = filters;

  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  if (estado) where.estado = estado;
  if (tipo) where.tipo = tipo;
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { url: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [freeValues, total] = await Promise.all([
    prisma.freeValue.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.freeValue.count({ where }),
  ]);

  return { freeValues, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getFreeValueById(id: string) {
  return prisma.freeValue.findUnique({ where: { id } });
}

export async function createFreeValue(data: CreateFreeValueInput) {
  if (!data.softwareId?.trim()) throw new Error('El software es obligatorio');
  if (!data.nombre?.trim()) throw new Error('El nombre es obligatorio');
  if (!data.slug?.trim()) throw new Error('El slug es obligatorio');
  if (!data.url?.trim()) throw new Error('La URL es obligatoria');
  if (!data.tipo?.trim()) throw new Error('El tipo es obligatorio');

  return prisma.freeValue.create({
    data: {
      softwareId: data.softwareId.trim(),
      nombre: data.nombre.trim(),
      slug: data.slug.trim(),
      url: data.url.trim(),
      tipo: data.tipo.trim(),
      descripcion: data.descripcion?.trim() || null,
      estado: data.estado || FreeValueEstado.BORRADOR,
      usos: data.usos ?? 0,
      leadsGenerados: data.leadsGenerados ?? 0,
      metadata: data.metadata ?? undefined,
    },
  });
}

export async function updateFreeValue(id: string, data: UpdateFreeValueInput) {
  const exists = await prisma.freeValue.findUnique({ where: { id } });
  if (!exists) return null;

  return prisma.freeValue.update({
    where: { id },
    data: {
      softwareId: data.softwareId?.trim(),
      nombre: data.nombre?.trim(),
      slug: data.slug?.trim(),
      url: data.url?.trim(),
      tipo: data.tipo?.trim(),
      descripcion: data.descripcion === null ? null : data.descripcion?.trim(),
      estado: data.estado,
      usos: data.usos,
      leadsGenerados: data.leadsGenerados,
      metadata: data.metadata,
    },
  });
}

export async function deleteFreeValue(id: string) {
  await prisma.freeValue.delete({ where: { id } });
}

export async function getFreeValueStats(softwareId?: string) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;

  const [total, publicados, agregados, porTipo] = await Promise.all([
    prisma.freeValue.count({ where }),
    prisma.freeValue.count({ where: { ...where, estado: FreeValueEstado.PUBLICADO } }),
    prisma.freeValue.aggregate({
      where,
      _sum: { usos: true, leadsGenerados: true },
    }),
    prisma.freeValue.groupBy({
      by: ['tipo'],
      where,
      _count: { tipo: true },
    }),
  ]);

  return {
    total,
    publicados,
    usosTotales: agregados._sum.usos || 0,
    leadsGenerados: agregados._sum.leadsGenerados || 0,
    porTipo,
  };
}
