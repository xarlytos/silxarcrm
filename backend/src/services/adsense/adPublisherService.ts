import { AdArticle } from '@prisma/client';
import { prisma } from '../../config/database';

/**
 * Publicación e indexación. Multi-sitio: el sitemap se genera por dominio.
 */

export async function publish(articleId: string): Promise<AdArticle> {
  return prisma.adArticle.update({
    where: { id: articleId },
    data: { status: 'PUBLISHED', publishedAt: new Date() },
  });
}

export async function unpublish(articleId: string): Promise<AdArticle> {
  return prisma.adArticle.update({
    where: { id: articleId },
    data: { status: 'DRAFT', publishedAt: null },
  });
}

/** Normaliza un dominio a su URL base con https */
function baseUrlFor(domain: string): string {
  const clean = domain.replace(/^https?:\/\//, '').replace(/\/$/, '');
  return `https://${clean}`;
}

/** Sitemap.xml de un sitio concreto (por dominio) */
export async function generateSitemap(domain: string): Promise<string> {
  const site = await prisma.adSite.findUnique({ where: { domain } });
  if (!site) {
    return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`;
  }

  const articles = await prisma.adArticle.findMany({
    where: { siteId: site.id, status: 'PUBLISHED' },
    orderBy: { publishedAt: 'desc' },
    select: { slug: true, publishedAt: true, updatedAt: true },
  });

  const baseUrl = baseUrlFor(domain);
  const urls = articles.map((a) => {
    const lastmod = (a.updatedAt || a.publishedAt || new Date()).toISOString().split('T')[0];
    return `  <url>\n    <loc>${baseUrl}/${a.slug}</loc>\n    <lastmod>${lastmod}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${baseUrl}/</loc>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
${urls.join('\n')}
</urlset>`;
}

/** Notifica a Google el sitemap de un dominio */
export async function pingGoogle(domain: string): Promise<boolean> {
  try {
    const sitemapUrl = `${baseUrlFor(domain)}/sitemap.xml`;
    const res = await fetch(`https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`);
    return res.ok;
  } catch {
    return false;
  }
}

export default { publish, unpublish, generateSitemap, pingGoogle };
