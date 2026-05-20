import axios from 'axios';
import * as cheerio from 'cheerio';
import { logger } from '../utils/logger';

export interface LeadScraped {
  nombre: string;
  email?: string;
  telefono?: string;
  empresa?: string;
  direccion?: string;
  ciudad?: string;
  provincia?: string;
  sector?: string;
  web?: string;
  origen: string;
}

/**
 * Busca negocios en Páginas Amarillas
 * URL: https://www.paginasamarillas.es/search/{termino}/{ciudad}
 */
export async function buscarPaginasAmarillas(
  termino: string,
  ciudad?: string
): Promise<LeadScraped[]> {
  const query = encodeURIComponent(termino);
  const location = ciudad ? encodeURIComponent(ciudad) : '';
  const url = location
    ? `https://www.paginasamarillas.es/search/${query}/${location}`
    : `https://www.paginasamarillas.es/search/${query}`;

  try {
    const { data: html } = await axios.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9',
      },
      timeout: 15000,
    });

    const $ = cheerio.load(html);
    const results: LeadScraped[] = [];

    // Páginas Amarillas tiene varias estructuras posibles
    // Intento 1: estructura con data-testid o clases modernas
    $('.listing-item, [data-testid="listing-item"], .result-item').each((_, el) => {
      const $el = $(el);

      const nombre = limpiarTexto($el.find('.listing-title, [data-testid="listing-title"], h2, .title').first().text());
      if (!nombre) return;

      const telefono = limpiarTexto($el.find('.listing-phone, [data-testid="listing-phone"], .phone').first().text());
      const direccion = limpiarTexto($el.find('.listing-address, [data-testid="listing-address"], .address').first().text());
      const web = $el.find('a[href^="http"]').first().attr('href') || undefined;
      const sector = limpiarTexto($el.find('.listing-category, .category').first().text());

      // Evitar duplicados por nombre
      if (!results.find((r) => r.nombre === nombre)) {
        results.push({
          nombre,
          telefono: telefono || undefined,
          direccion: direccion || undefined,
          ciudad: ciudad || undefined,
          sector: sector || undefined,
          web: web && !web.includes('paginasamarillas.es') ? web : undefined,
          origen: 'paginas_amarillas',
        });
      }
    });

    // Intento 2: estructura alternativa (contenederes con itemprop)
    if (results.length === 0) {
      $('[itemtype*="LocalBusiness"], .business-card, .result').each((_, el) => {
        const $el = $(el);
        const nombre = limpiarTexto($el.find('[itemprop="name"], h2, h3, .name').first().text());
        if (!nombre) return;

        const telefono = limpiarTexto($el.find('[itemprop="telephone"], .phone').first().text());
        const direccion = limpiarTexto($el.find('[itemprop="address"], .address').first().text());
        const web = $el.find('[itemprop="url"]').attr('href') || $el.find('a[href^="http"]').first().attr('href') || undefined;
        const sector = limpiarTexto($el.find('.category, [itemprop="category"]').first().text());

        if (!results.find((r) => r.nombre === nombre)) {
          results.push({
            nombre,
            telefono: telefono || undefined,
            direccion: direccion || undefined,
            ciudad: ciudad || undefined,
            sector: sector || undefined,
            web: web && !web.includes('paginasamarillas.es') ? web : undefined,
            origen: 'paginas_amarillas',
          });
        }
      });
    }

    logger.info(`Scraping Páginas Amarillas: ${results.length} resultados para "${termino}" en "${ciudad || 'todas'}"`);
    return results;
  } catch (error) {
    logger.error('Error scraping Páginas Amarillas:', error);
    throw new Error('No se pudo obtener resultados de Páginas Amarillas. Intenta más tarde.');
  }
}

/**
 * Genera URL de búsqueda para Google Maps
 */
export function getGoogleMapsSearchUrl(termino: string, ciudad?: string): string {
  const query = ciudad ? `${termino} en ${ciudad}` : termino;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

/**
 * Genera URL de búsqueda para Páginas Amarillas
 */
export function getPaginasAmarillasUrl(termino: string, ciudad?: string): string {
  const query = encodeURIComponent(termino);
  const location = ciudad ? encodeURIComponent(ciudad) : '';
  return location
    ? `https://www.paginasamarillas.es/search/${query}/${location}`
    : `https://www.paginasamarillas.es/search/${query}`;
}

function limpiarTexto(texto: string): string {
  if (!texto) return '';
  return texto
    .replace(/\s+/g, ' ')
    .replace(/\n/g, ' ')
    .trim();
}
