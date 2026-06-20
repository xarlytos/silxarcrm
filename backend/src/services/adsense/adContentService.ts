import { AdArticle, ContentStatus } from '@prisma/client';
import { prisma } from '../../config/database';
import { openai } from '../../config/openai';

/**
 * Generación de artículos SEO monetizados con AdSense.
 * Multi-sitio: cada artículo pertenece a un AdSite (un dominio). El CRM es
 * el gestor central de la red de blogs.
 */

/** Convierte un texto en slug SEO-friendly */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]+/g, '')
    .replace(/--+/g, '-')
    .replace(/^-|-$/g, '');
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base || 'articulo';
  let i = 1;
  while (await prisma.adArticle.findUnique({ where: { slug } })) {
    slug = `${base}-${i++}`;
  }
  return slug;
}

interface GeneratedArticle {
  title: string;
  excerpt: string;
  body: string;
  keywords: string[];
}

function buildPrompt(opts: { siteTheme: string; topic: string; keyword: string; idioma: string }): string {
  return `Eres un redactor SEO experto. Escribe un artículo de blog largo y útil en ${opts.idioma}.

Sitio/temática general: ${opts.siteTheme}
Tema del artículo: ${opts.topic}
Palabra clave principal: "${opts.keyword}"

Requisitos:
- Mínimo 1500 palabras, contenido real y valioso (no relleno).
- Estructura: introducción con gancho, varias secciones con <h2> y <h3>, listas <ul>/<ol>, y una sección final de Preguntas Frecuentes (FAQ).
- Optimizado para SEO: usa la keyword y variantes de forma natural.
- Tono divulgativo y fácil de leer. Párrafos cortos.
- El "body" debe ser HTML válido (<h2>, <h3>, <p>, <ul>, <li>, <strong>). NO incluyas <html>/<head>/<body> ni el <h1> del título.

Devuelve EXCLUSIVAMENTE un JSON:
{
  "title": "Título atractivo y optimizado (max 65 caracteres)",
  "excerpt": "Meta descripción de 140-160 caracteres",
  "body": "<h2>...</h2><p>...</p>...",
  "keywords": ["keyword1", "keyword2"]
}`;
}

/** Genera y guarda un artículo (DRAFT) para un sitio. nicheId opcional. */
export async function generateArticle(
  siteId: string,
  nicheId?: string,
  keywordOverride?: string
): Promise<AdArticle> {
  const site = await prisma.adSite.findUnique({ where: { id: siteId } });
  if (!site) throw new Error('Sitio no encontrado');

  let niche = null;
  if (nicheId) {
    niche = await prisma.adNiche.findUnique({ where: { id: nicheId } });
  }

  const topic = niche?.nombre || site.tema || site.nombre;
  const keyword =
    keywordOverride ||
    (niche?.keywordsSemilla?.length
      ? niche.keywordsSemilla[Math.floor(Math.random() * niche.keywordsSemilla.length)]
      : topic);

  const prompt = buildPrompt({
    siteTheme: site.tema || site.nombre,
    topic,
    keyword,
    idioma: site.idioma,
  });

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [{ role: 'system', content: prompt }],
    response_format: { type: 'json_object' },
    temperature: 0.7,
  });

  const content = response.choices[0]?.message?.content;
  if (!content) throw new Error('OpenAI no devolvió contenido');

  const parsed = JSON.parse(content) as GeneratedArticle;
  const slug = await uniqueSlug(slugify(parsed.title));

  return prisma.adArticle.create({
    data: {
      siteId: site.id,
      nicheId: niche?.id || null,
      title: parsed.title,
      slug,
      body: parsed.body,
      excerpt: parsed.excerpt,
      keywords: parsed.keywords || [keyword],
      status: 'DRAFT' as ContentStatus,
      aiPrompt: prompt,
      aiModel: 'gpt-4o',
    },
  });
}

/** Genera un lote para un sitio, rotando entre sus nichos activos (o tema). */
export async function generateBatch(siteId: string, count: number = 3): Promise<AdArticle[]> {
  const site = await prisma.adSite.findUnique({
    where: { id: siteId },
    include: { niches: { where: { activo: true } } },
  });
  if (!site) throw new Error('Sitio no encontrado');

  const niches = site.niches;
  const results: AdArticle[] = [];
  for (let i = 0; i < count; i++) {
    const nicheId = niches.length ? niches[i % niches.length].id : undefined;
    try {
      results.push(await generateArticle(site.id, nicheId));
    } catch (err: any) {
      console.error(`[Adsense] Error generando artículo (sitio ${site.domain}):`, err.message);
    }
  }
  return results;
}

/** Genera contenido para todos los sitios activos (usado por el cron). */
export async function generateForAllSites(perSite: number = 2): Promise<number> {
  const sites = await prisma.adSite.findMany({ where: { activo: true } });
  let total = 0;
  for (const site of sites) {
    const articles = await generateBatch(site.id, perSite);
    total += articles.length;
  }
  return total;
}

export default { generateArticle, generateBatch, generateForAllSites, slugify };
