import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MarketplaceListing {
  title: string;
  description: string;
  url: string;
  category?: string;
  rating?: number;
  reviews?: number;
  pricing?: string;
  developer?: string;
  priority: 'high' | 'medium' | 'low';
}

interface ScrapedResult {
  title: string;
  url: string;
  description?: string;
  rating?: number;
  reviews?: number;
  developer?: string;
}

// ============================================================
// SCRAPING HELPERS
// ============================================================

const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';

async function fetchHTML(url: string): Promise<string> {
  const response = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return response.text();
}

function extractBetween(html: string, start: string, end: string): string | null {
  const idx = html.indexOf(start);
  if (idx === -1) return null;
  const startIdx = idx + start.length;
  const endIdx = html.indexOf(end, startIdx);
  if (endIdx === -1) return null;
  return html.slice(startIdx, endIdx).trim();
}

function extractAllBetween(html: string, start: string, end: string): string[] {
  const results: string[] = [];
  let idx = 0;
  while (true) {
    const startIdx = html.indexOf(start, idx);
    if (startIdx === -1) break;
    const contentStart = startIdx + start.length;
    const endIdx = html.indexOf(end, contentStart);
    if (endIdx === -1) break;
    results.push(html.slice(contentStart, endIdx).trim());
    idx = endIdx + end.length;
  }
  return results;
}

function cleanHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

// ============================================================
// SHOPIFY APP STORE
// ============================================================

async function scrapeShopify(nicho: string): Promise<ScrapedResult[]> {
  const query = encodeURIComponent(nicho);
  const url = `https://apps.shopify.com/search?q=${query}`;

  try {
    const html = await fetchHTML(url);
    const results: ScrapedResult[] = [];

    // Buscar cards de apps en el HTML
    const appCards = extractAllBetween(html, 'data-app-card', '>');

    for (const card of appCards.slice(0, 5)) {
      const title = extractBetween(card, 'title="', '"') || extractBetween(card, 'alt="', '"') || 'App desconocida';
      const appUrl = extractBetween(card, 'href="', '"');
      const ratingStr = extractBetween(card, 'rating="', '"');
      const reviewsStr = extractBetween(card, 'reviews="', '"');

      if (appUrl) {
        results.push({
          title: cleanHtml(title),
          url: appUrl.startsWith('http') ? appUrl : `https://apps.shopify.com${appUrl}`,
          rating: ratingStr ? parseFloat(ratingStr) : undefined,
          reviews: reviewsStr ? parseInt(reviewsStr) : undefined,
        });
      }
    }

    // Si no encontramos nada con el método anterior, intentar otro
    if (results.length === 0) {
      const titleMatches = extractAllBetween(html, '<h3', '</h3>');
      for (const titleBlock of titleMatches.slice(0, 5)) {
        const title = cleanHtml(extractBetween(titleBlock, '>', '') || titleBlock);
        if (title && title.length > 3) {
          results.push({
            title,
            url,
          });
        }
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================================
// G2
// ============================================================

async function scrapeG2(query: string): Promise<ScrapedResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://www.g2.com/search?query=${encoded}`;

  try {
    const html = await fetchHTML(url);
    const results: ScrapedResult[] = [];

    // G2 usa JSON-LD y data attributes
    const productCards = extractAllBetween(html, 'data-testid="product-card"', '</a>');

    for (const card of productCards.slice(0, 5)) {
      const title = cleanHtml(extractBetween(card, 'data-testid="product-name">', '<') || '');
      const href = extractBetween(card, 'href="', '"');
      const ratingStr = extractBetween(card, 'data-rating="', '"');

      if (title && href) {
        results.push({
          title,
          url: href.startsWith('http') ? href : `https://www.g2.com${href}`,
          rating: ratingStr ? parseFloat(ratingStr) : undefined,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================================
// CAPTERRA
// ============================================================

async function scrapeCapterra(query: string): Promise<ScrapedResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://www.capterra.com/search/?search=${encoded}`;

  try {
    const html = await fetchHTML(url);
    const results: ScrapedResult[] = [];

    // Capterra cards
    const cards = extractAllBetween(html, 'class="search-card"', '</article>');

    for (const card of cards.slice(0, 5)) {
      const title = cleanHtml(extractBetween(card, '<h2', '</h2>') || '');
      const href = extractBetween(card, 'href="', '"');
      const ratingStr = extractBetween(card, 'data-rating="', '"');
      const reviewsStr = extractBetween(card, 'reviews-count">', '<');

      const cleanTitle = title.replace(/<[^>]+>/g, '').trim();

      if (cleanTitle) {
        results.push({
          title: cleanTitle,
          url: href?.startsWith('http') ? href : `https://www.capterra.com${href || ''}`,
          rating: ratingStr ? parseFloat(ratingStr) : undefined,
          reviews: reviewsStr ? parseInt(cleanHtml(reviewsStr)) : undefined,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================================
// WORDPRESS.ORG PLUGINS
// ============================================================

async function scrapeWordPress(query: string): Promise<ScrapedResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://wordpress.org/plugins/search/${encoded}/`;

  try {
    const html = await fetchHTML(url);
    const results: ScrapedResult[] = [];

    // WordPress plugin cards
    const cards = extractAllBetween(html, 'class="plugin-card"', '</div>');

    for (const card of cards.slice(0, 5)) {
      const titleBlock = extractBetween(card, '<h3', '</h3>');
      const rawTitle = extractBetween(titleBlock || '', '>', '');
      const title = rawTitle ? cleanHtml(rawTitle) : '';
      const href = extractBetween(card, 'href="', '"');
      const ratingStr = extractBetween(card, 'data-rating="', '"');
      const author = extractBetween(card, 'class="plugin-author"', '<');

      if (title) {
        results.push({
          title,
          url: href || '',
          rating: ratingStr ? parseFloat(ratingStr) : undefined,
          developer: author ? cleanHtml(author) : undefined,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================================
// HUBSPOT MARKETPLACE
// ============================================================

async function scrapeHubSpot(query: string): Promise<ScrapedResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://ecosystem.hubspot.com/marketplace/search?search=${encoded}`;

  try {
    const html = await fetchHTML(url);
    const results: ScrapedResult[] = [];

    // HubSpot marketplace cards
    const cards = extractAllBetween(html, 'class="listing-card"', '</a>');

    for (const card of cards.slice(0, 5)) {
      const title = cleanHtml(extractBetween(card, 'class="listing-title"', '</') || '');
      const href = extractBetween(card, 'href="', '"');

      if (title) {
        results.push({
          title,
          url: href?.startsWith('http') ? href : `https://ecosystem.hubspot.com${href || ''}`,
        });
      }
    }

    return results;
  } catch {
    return [];
  }
}

// ============================================================
// MONITOR PRINCIPAL
// ============================================================

/**
 * Determina la prioridad de una oportunidad basada en datos
 */
function calculatePriority(listing: ScrapedResult, marketplace: string): 'high' | 'medium' | 'low' {
  // Reviews negativos o bajo rating = alta prioridad
  if (listing.rating && listing.rating < 3.5) return 'high';
  if (listing.rating && listing.rating < 4.0) return 'medium';

  // Si tiene muchas reviews pero bajo rating = oportunidad clara
  if (listing.reviews && listing.reviews > 50 && listing.rating && listing.rating < 4.0) {
    return 'high';
  }

  // Pocos reviews = mercado inmaduro = oportunidad
  if (listing.reviews && listing.reviews < 20) return 'medium';

  return 'low';
}

/**
 * Monitoriza todos los marketplaces configurados
 */
export async function monitorAll(softwareId?: string): Promise<{
  total: number;
  byMarketplace: Record<string, number>;
  newOpportunities: any[];
}> {
  const where = softwareId ? { id: softwareId, activo: true } : { activo: true };
  const softwares = await prisma.software.findMany({ where });

  let totalOpportunities = 0;
  const byMarketplace: Record<string, number> = {};
  const allNew: any[] = [];

  for (const software of softwares) {
    const searchTerms = [
      software.nicho || '',
      software.nombre || '',
      software.categoria || '',
    ].filter(Boolean);

    const query = searchTerms[0] || software.nombre || 'software';

    // Shopify App Store
    try {
      const shopifyResults = await scrapeShopify(query);
      const shopifyOpps = await saveOpportunities(
        software.id,
        'shopify',
        shopifyResults.map((r) => ({
          title: r.title,
          description: `App en Shopify App Store: ${r.title}. ${r.rating ? `Rating: ${r.rating}` : ''} ${r.reviews ? `(${r.reviews} reviews)` : ''}`,
          url: r.url,
          rating: r.rating,
          reviews: r.reviews,
          priority: calculatePriority(r, 'shopify'),
        }))
      );
      totalOpportunities += shopifyOpps;
      byMarketplace.shopify = (byMarketplace.shopify || 0) + shopifyOpps;
    } catch {
      // Silencioso
    }

    // G2
    try {
      const g2Results = await scrapeG2(query);
      const g2Opps = await saveOpportunities(
        software.id,
        'g2',
        g2Results.map((r) => ({
          title: r.title,
          description: `Producto en G2: ${r.title}. ${r.rating ? `Rating: ${r.rating}` : ''}`,
          url: r.url,
          rating: r.rating,
          priority: calculatePriority(r, 'g2'),
        }))
      );
      totalOpportunities += g2Opps;
      byMarketplace.g2 = (byMarketplace.g2 || 0) + g2Opps;
    } catch {
      // Silencioso
    }

    // Capterra
    try {
      const capterraResults = await scrapeCapterra(query);
      const capterraOpps = await saveOpportunities(
        software.id,
        'capterra',
        capterraResults.map((r) => ({
          title: r.title,
          description: `Software en Capterra: ${r.title}. ${r.rating ? `Rating: ${r.rating}` : ''} ${r.reviews ? `(${r.reviews} reviews)` : ''}`,
          url: r.url,
          rating: r.rating,
          reviews: r.reviews,
          priority: calculatePriority(r, 'capterra'),
        }))
      );
      totalOpportunities += capterraOpps;
      byMarketplace.capterra = (byMarketplace.capterra || 0) + capterraOpps;
    } catch {
      // Silencioso
    }

    // WordPress
    try {
      const wpResults = await scrapeWordPress(query);
      const wpOpps = await saveOpportunities(
        software.id,
        'wordpress',
        wpResults.map((r) => ({
          title: r.title,
          description: `Plugin de WordPress: ${r.title}. ${r.developer ? `Por ${r.developer}` : ''} ${r.rating ? `Rating: ${r.rating}` : ''}`,
          url: r.url,
          rating: r.rating,
          priority: calculatePriority(r, 'wordpress'),
        }))
      );
      totalOpportunities += wpOpps;
      byMarketplace.wordpress = (byMarketplace.wordpress || 0) + wpOpps;
    } catch {
      // Silencioso
    }

    // HubSpot
    try {
      const hubspotResults = await scrapeHubSpot(query);
      const hubspotOpps = await saveOpportunities(
        software.id,
        'hubspot',
        hubspotResults.map((r) => ({
          title: r.title,
          description: `Integración en HubSpot Marketplace: ${r.title}`,
          url: r.url,
          priority: 'medium' as const,
        }))
      );
      totalOpportunities += hubspotOpps;
      byMarketplace.hubspot = (byMarketplace.hubspot || 0) + hubspotOpps;
    } catch {
      // Silencioso
    }
  }

  // Obtener las oportunidades recién creadas (últimas 24h)
  const newOpportunities = await prisma.marketplaceOpportunity.findMany({
    where: {
      createdAt: { gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    },
    orderBy: { createdAt: 'desc' },
    take: 20,
  });

  return { total: totalOpportunities, byMarketplace, newOpportunities };
}

// ============================================================
// CRUD
// ============================================================

/**
 * Guarda oportunidades nuevas en la base de datos
 */
async function saveOpportunities(
  softwareId: string,
  marketplace: string,
  listings: MarketplaceListing[]
): Promise<number> {
  let saved = 0;

  for (const listing of listings) {
    // Verificar si ya existe (evitar duplicados por URL)
    const existing = await prisma.marketplaceOpportunity.findFirst({
      where: {
        softwareId,
        marketplace,
        url: listing.url,
      },
    });

    if (!existing && listing.url) {
      await prisma.marketplaceOpportunity.create({
        data: {
          softwareId,
          marketplace,
          title: listing.title,
          description: listing.description,
          url: listing.url,
          category: listing.category,
          rating: listing.rating,
          reviews: listing.reviews,
          status: 'NEW',
        },
      });
      saved++;
    }
  }

  return saved;
}

/**
 * Convierte una oportunidad de marketplace en lead
 */
export async function convertOpportunityToLead(
  opportunityId: string,
  leadData: {
    nombre: string;
    email?: string;
    telefono?: string;
    empresa?: string;
  }
) {
  const opportunity = await prisma.marketplaceOpportunity.findUnique({
    where: { id: opportunityId },
  });

  if (!opportunity) throw new Error('Oportunidad no encontrada');

  const lead = await prisma.lead.create({
    data: {
      nombre: leadData.nombre,
      email: leadData.email,
      telefono: leadData.telefono,
      empresa: leadData.empresa || opportunity.title,
      softwareId: opportunity.softwareId,
      origen: `marketplace_${opportunity.marketplace}`,
      estado: 'NUEVO',
      metadata: {
        marketplaceUrl: opportunity.url,
        marketplaceRating: opportunity.rating,
        marketplaceReviews: opportunity.reviews,
      },
    },
  });

  await prisma.marketplaceOpportunity.update({
    where: { id: opportunityId },
    data: {
      status: 'CONVERTED',
      leadId: lead.id,
    },
  });

  return lead;
}

/**
 * Obtiene oportunidades por software con filtros
 */
export async function getOpportunities(
  softwareId: string,
  filters?: {
    marketplace?: string;
    status?: string;
    category?: string;
    priority?: string;
  }
) {
  const where: any = { softwareId };

  if (filters?.marketplace) where.marketplace = filters.marketplace;
  if (filters?.status) where.status = filters.status;
  if (filters?.category) where.category = filters.category;

  return prisma.marketplaceOpportunity.findMany({
    where,
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' },
    ],
    include: {
      lead: true,
    },
  });
}

/**
 * Obtiene métricas de marketplaces
 */
export async function getMarketplaceMetrics(softwareId: string) {
  const byMarketplace = await prisma.marketplaceOpportunity.groupBy({
    by: ['marketplace'],
    where: { softwareId },
    _count: { id: true },
    _avg: { rating: true },
  });

  const byStatus = await prisma.marketplaceOpportunity.groupBy({
    by: ['status'],
    where: { softwareId },
    _count: { id: true },
  });

  const totalConverted = await prisma.marketplaceOpportunity.count({
    where: { softwareId, status: 'CONVERTED' },
  });

  const recent = await prisma.marketplaceOpportunity.findMany({
    where: { softwareId },
    orderBy: { createdAt: 'desc' },
    take: 5,
  });

  return {
    byMarketplace,
    byStatus,
    totalConverted,
    recent,
  };
}

export default {
  monitorAll,
  convertOpportunityToLead,
  getOpportunities,
  getMarketplaceMetrics,
};
