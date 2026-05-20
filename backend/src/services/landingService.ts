import { prisma } from '../config/database';
import { LandingEstado } from '@prisma/client';

export interface LandingFilters {
  softwareId?: string;
  estado?: LandingEstado;
  search?: string;
  page?: number;
  limit?: number;
}

export interface CreateLandingInput {
  softwareId: string;
  nombre: string;
  slug: string;
  url: string;
  descripcion?: string;
  estado?: LandingEstado;
  visitas?: number;
  conversiones?: number;
  leadsGenerados?: number;
  metadata?: any;
}

export interface UpdateLandingInput {
  softwareId?: string;
  nombre?: string;
  slug?: string;
  url?: string;
  descripcion?: string | null;
  estado?: LandingEstado;
  visitas?: number;
  conversiones?: number;
  leadsGenerados?: number;
  metadata?: any;
}

export async function listLandings(filters: LandingFilters) {
  const { softwareId, estado, search, page = 1, limit = 50 } = filters;

  const where: any = {};
  if (softwareId) where.softwareId = softwareId;
  if (estado) where.estado = estado;
  if (search) {
    where.OR = [
      { nombre: { contains: search, mode: 'insensitive' } },
      { slug: { contains: search, mode: 'insensitive' } },
      { url: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [landings, total] = await Promise.all([
    prisma.landing.findMany({
      where,
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.landing.count({ where }),
  ]);

  return { landings, pagination: { page, limit, total, pages: Math.ceil(total / limit) } };
}

export async function getLandingById(id: string) {
  return prisma.landing.findUnique({ where: { id } });
}

export async function createLanding(data: CreateLandingInput) {
  if (!data.softwareId?.trim()) throw new Error('El software es obligatorio');
  if (!data.nombre?.trim()) throw new Error('El nombre es obligatorio');
  if (!data.slug?.trim()) throw new Error('El slug es obligatorio');
  if (!data.url?.trim()) throw new Error('La URL es obligatoria');

  return prisma.landing.create({
    data: {
      softwareId: data.softwareId.trim(),
      nombre: data.nombre.trim(),
      slug: data.slug.trim(),
      url: data.url.trim(),
      descripcion: data.descripcion?.trim() || null,
      estado: data.estado || LandingEstado.BORRADOR,
      visitas: data.visitas ?? 0,
      conversiones: data.conversiones ?? 0,
      leadsGenerados: data.leadsGenerados ?? 0,
      metadata: data.metadata ?? undefined,
    },
  });
}

export async function updateLanding(id: string, data: UpdateLandingInput) {
  const exists = await prisma.landing.findUnique({ where: { id } });
  if (!exists) return null;

  return prisma.landing.update({
    where: { id },
    data: {
      softwareId: data.softwareId?.trim(),
      nombre: data.nombre?.trim(),
      slug: data.slug?.trim(),
      url: data.url?.trim(),
      descripcion: data.descripcion === null ? null : data.descripcion?.trim(),
      estado: data.estado,
      visitas: data.visitas,
      conversiones: data.conversiones,
      leadsGenerados: data.leadsGenerados,
      metadata: data.metadata,
    },
  });
}

export async function deleteLanding(id: string) {
  await prisma.landing.delete({ where: { id } });
}

export async function getLandingStats(softwareId?: string) {
  const where: any = {};
  if (softwareId) where.softwareId = softwareId;

  const [total, publicadas, agregados] = await Promise.all([
    prisma.landing.count({ where }),
    prisma.landing.count({ where: { ...where, estado: LandingEstado.PUBLICADA } }),
    prisma.landing.aggregate({
      where,
      _sum: { visitas: true, conversiones: true, leadsGenerados: true },
    }),
  ]);

  return {
    total,
    publicadas,
    visitasTotales: agregados._sum.visitas || 0,
    conversionesTotales: agregados._sum.conversiones || 0,
    leadsGenerados: agregados._sum.leadsGenerados || 0,
  };
}
