import { PrismaClient, ContentPiece } from '@prisma/client';

const prisma = new PrismaClient();

interface PublishResult {
  success: boolean;
  url?: string;
  error?: string;
}

/**
 * Publica una pieza de contenido SEO
 * Puede publicarse como:
 * 1. Página estática en Next.js (frontend)
 * 2. Blog post en CMS externo
 * 3. Landing page programática
 */
export async function publishContent(content: ContentPiece): Promise<PublishResult> {
  if (!content.softwareId) {
    return { success: false, error: 'No se especificó software' };
  }

  const config = await prisma.growthConfig.findUnique({
    where: { softwareId: content.softwareId },
  });

  if (config?.blogDomain) {
    // Publicar en CMS externo
    return publishToCMS(content, config.blogDomain);
  }

  // Por defecto: publicar como página estática integrada
  return publishAsStaticPage(content);
}

/**
 * Publica contenido como página estática en el CRM
 * El frontend renderizará desde la base de datos
 */
async function publishAsStaticPage(content: ContentPiece): Promise<PublishResult> {
  try {
    // Generar slug SEO-friendly
    const slug = content.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const url = `/blog/${slug}`;

    await prisma.contentPiece.update({
      where: { id: content.id },
      data: {
        status: 'PUBLISHED',
        publishedAt: new Date(),
      },
    });

    // Nota: En el frontend, la ruta /blog/[slug] leerá de la DB

    return {
      success: true,
      url,
    };
  } catch (error: any) {
    await prisma.contentPiece.update({
      where: { id: content.id },
      data: { status: 'FAILED' },
    });

    return { success: false, error: error.message };
  }
}

/**
 * Publica en CMS externo (WordPress, Ghost, etc.)
 * Placeholder: implementar según el CMS usado
 */
async function publishToCMS(content: ContentPiece, domain: string): Promise<PublishResult> {
  // Placeholder: implementar integración con CMS
  return {
    success: false,
    error: 'Integración con CMS externo pendiente de implementación',
  };
}

/**
 * Genera sitemap.xml para contenido publicado de un software
 */
export async function generateSitemap(softwareId: string): Promise<string> {
  const content = await prisma.contentPiece.findMany({
    where: {
      softwareId,
      status: 'PUBLISHED',
    },
    orderBy: { publishedAt: 'desc' },
  });

  const config = await prisma.growthConfig.findUnique({
    where: { softwareId },
  });

  const baseUrl = config?.blogDomain || process.env.APP_URL || 'https://example.com';

  const urls = content.map((c) => {
    const slug = c.title
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const lastmod = c.publishedAt?.toISOString().split('T')[0] || new Date().toISOString().split('T')[0];

    return `  <url>
    <loc>${baseUrl}/blog/${slug}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>`;
}

/**
 * Envía sitemap a Google para indexación
 */
export async function submitSitemapToGoogle(softwareId: string): Promise<boolean> {
  const config = await prisma.growthConfig.findUnique({
    where: { softwareId },
  });

  if (!config?.blogDomain) return false;

  try {
    // Ping a Google
    const sitemapUrl = `${config.blogDomain}/sitemap.xml`;
    const response = await fetch(
      `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`
    );

    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Obtiene contenido publicado con filtros
 */
export async function getPublishedContent(softwareId: string, filters?: {
  type?: string;
  limit?: number;
  offset?: number;
}) {
  const where: any = {
    softwareId,
    status: 'PUBLISHED',
  };

  if (filters?.type) where.type = filters.type;

  return prisma.contentPiece.findMany({
    where,
    orderBy: { publishedAt: 'desc' },
    take: filters?.limit || 20,
    skip: filters?.offset || 0,
  });
}

export default {
  publishContent,
  generateSitemap,
  submitSitemapToGoogle,
  getPublishedContent,
};
