import { prisma } from '../config/database';
import { logger } from '../utils/logger';

export interface SoftwareInput {
  slug: string;
  nombre: string;
  tagline?: string;
  descripcion?: string;
  urlWebsite?: string;
  logoUrl?: string;
  faviconUrl?: string;
  colorPrimario?: string;
  colorSecundario?: string;
  dominioLanding?: string;
  categoria?: string;
  nicho?: string;
  problemaPrincipal?: string;
  promesaValor?: string;
  diferenciador?: string;
  icpTitulo?: string;
  icpDescripcion?: string;
  icpIngresosAnuales?: string;
  icpTamanoEquipo?: string;
  icpUbicacion?: string;
  icpDolorTop1?: string;
  icpDolorTop2?: string;
  icpDolorTop3?: string;
}

export async function listSoftwares() {
  // Primero intentar obtener softwares de la tabla Software
  const softwares = await prisma.software.findMany({
    orderBy: { nombre: 'asc' },
  });

  if (softwares.length > 0) {
    return softwares;
  }

  // Fallback: si no hay softwares, usar webhookConfig como softwares
  const webhooks = await prisma.webhookConfig.findMany({
    where: { activo: true },
    orderBy: { saas: 'asc' },
  });

  return webhooks.map((w) => ({
    id: w.saas,
    nombre: w.descripcion || w.saas,
    slug: w.saas,
    tagline: '',
    descripcion: w.descripcion || '',
    urlWebsite: '',
    logoUrl: '',
    faviconUrl: '',
    colorPrimario: '#6366f1',
    colorSecundario: '#8b5cf6',
    dominioLanding: '',
    categoria: '',
    nicho: '',
    problemaPrincipal: '',
    promesaValor: '',
    diferenciador: '',
    icpTitulo: '',
    icpDescripcion: '',
    icpIngresosAnuales: '',
    icpTamanoEquipo: '',
    icpUbicacion: '',
    icpDolorTop1: '',
    icpDolorTop2: '',
    icpDolorTop3: '',
    createdAt: w.createdAt,
    updatedAt: w.updatedAt,
  }));
}

export async function getSoftwareBySlug(slug: string) {
  return prisma.software.findUnique({
    where: { slug },
  });
}

export async function getSoftwareById(id: string) {
  return prisma.software.findUnique({
    where: { id },
  });
}

export async function createSoftware(data: SoftwareInput) {
  const existing = await prisma.software.findUnique({
    where: { slug: data.slug },
  });
  if (existing) {
    throw new Error('Ya existe un software con ese slug');
  }

  const software = await prisma.software.create({ data });
  logger.info(`Software creado: ${software.slug}`);
  return software;
}

export async function updateSoftware(id: string, data: Partial<SoftwareInput>) {
  const software = await prisma.software.update({
    where: { id },
    data,
  });
  logger.info(`Software actualizado: ${software.slug}`);
  return software;
}

export async function deleteSoftware(id: string) {
  await prisma.software.delete({ where: { id } });
  logger.info(`Software eliminado: ${id}`);
}
