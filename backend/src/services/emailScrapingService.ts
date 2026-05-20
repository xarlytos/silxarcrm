import axios, { AxiosError } from 'axios';
import * as cheerio from 'cheerio';
import { extractCloudflareEmails } from './cloudflareEmailDecoder';

export type EmailSourcePath = 'home' | 'contacto' | 'cloudflare' | 'mailto';

export interface ScrapedEmailResult {
  estado: 'ok' | 'sin_email' | 'fetch_failed' | 'bloqueado';
  fuente?: EmailSourcePath;
  fuenteUrl?: string;
  emailElegido?: string;
  todosLosEmails: string[];
  intentos: { url: string; status: number | 'timeout' | 'error'; emailsEncontrados: number }[];
  error?: string;
}

export interface ScrapeOptions {
  includePersonal?: boolean;
  validateDomain?: boolean;
  contactPaths?: string[];
  timeoutMs?: number;
  userAgent?: string;
  maxContactPaths?: number;
}

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

const DEFAULT_CONTACT_PATHS = [
  '/contacto',
  '/contact',
  '/aviso-legal',
  '/legal',
  '/privacidad',
  '/sobre-nosotros',
  '/about',
];

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const BLACKLIST_DOMAINS = new Set([
  'yourdomain.com',
  'example.com',
  'example.org',
  'example.net',
  'domain.com',
  'mydomain.com',
  'elementor.com',
  'wix.com',
  'wixpress.com',
  'wordpress.com',
  'wordpress.org',
  'godaddy.com',
  'squarespace.com',
  'webflow.com',
  'sentry.io',
  'matomo.org',
  'mailerlite.com',
  'mailchimp.com',
  'hubspot.com',
  'salesforce.com',
  'sendgrid.com',
  'mailgun.com',
  'gravatar.com',
  'wpengine.com',
  'cloudflare.com',
  'jquery.com',
  'w3.org',
  'schema.org',
  'sentry-next.wixpress.com',
]);

const BLACKLIST_LOCAL_PARTS = new Set([
  'youremail',
  'your_email',
  'your-email',
  'yourname',
  'your-name',
  'example',
  'test',
  'demo',
  'noreply',
  'no-reply',
  'donotreply',
  'do-not-reply',
  'sentry',
  'wixpress',
]);

const ROLE_BASED_LOCAL_PARTS = new Set([
  'info',
  'contacto',
  'contact',
  'hola',
  'hello',
  'hi',
  'citas',
  'reservas',
  'reserva',
  'booking',
  'admin',
  'administracion',
  'soporte',
  'support',
  'ventas',
  'sales',
  'comercial',
  'atencion',
  'clientes',
  'cliente',
  'recepcion',
  'office',
]);

const ROLE_PRIORITY = [
  'info',
  'contacto',
  'contact',
  'hola',
  'hello',
  'citas',
  'reservas',
  'reserva',
  'booking',
  'ventas',
  'sales',
  'comercial',
  'atencion',
  'soporte',
  'support',
  'admin',
  'recepcion',
  'office',
];

function getDomain(input: string): string | null {
  try {
    const u = new URL(input.startsWith('http') ? input : `https://${input}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

function normalizeObfuscatedEmails(text: string): string {
  return text
    .replace(/\s*\[\s*(arroba|at)\s*\]\s*/gi, '@')
    .replace(/\s*\(\s*(arroba|at)\s*\)\s*/gi, '@')
    .replace(/\s+(arroba|at)\s+/gi, '@')
    .replace(/\s*\[\s*(punto|dot)\s*\]\s*/gi, '.')
    .replace(/\s*\(\s*(punto|dot)\s*\)\s*/gi, '.')
    .replace(/\s+(punto|dot)\s+/gi, '.');
}

function isEmailAcceptable(
  email: string,
  siteDomain: string | null,
  opts: Required<Pick<ScrapeOptions, 'includePersonal' | 'validateDomain'>>
): boolean {
  const lower = email.toLowerCase();
  const [local, domain] = lower.split('@');
  if (!local || !domain) return false;

  if (BLACKLIST_DOMAINS.has(domain)) return false;
  if (BLACKLIST_LOCAL_PARTS.has(local)) return false;
  if (local.length < 2) return false;
  if (local.includes('..') || domain.includes('..')) return false;

  if (/\.(png|jpg|jpeg|gif|svg|webp|ico|css|js)$/i.test(email)) return false;

  if (!opts.includePersonal && !ROLE_BASED_LOCAL_PARTS.has(local)) {
    return false;
  }

  if (opts.validateDomain && siteDomain) {
    const siteRoot = siteDomain.split('.').slice(-2).join('.');
    const emailRoot = domain.split('.').slice(-2).join('.');
    if (siteRoot !== emailRoot) return false;
  }

  return true;
}

function pickBestEmail(emails: string[]): string | undefined {
  if (emails.length === 0) return undefined;
  const lower = emails.map((e) => e.toLowerCase());
  const unique = Array.from(new Set(lower));

  for (const role of ROLE_PRIORITY) {
    const match = unique.find((e) => e.split('@')[0] === role);
    if (match) return match;
  }
  return unique[0];
}

function extractEmailsFromHtml(html: string): string[] {
  let $: cheerio.CheerioAPI;
  try {
    $ = cheerio.load(html);
  } catch {
    return [];
  }

  const found: string[] = [];

  $('a[href^="mailto:"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    const raw = href.replace(/^mailto:/i, '').split('?')[0].trim();
    if (raw) found.push(raw);
  });

  const cfEmails = extractCloudflareEmails($);
  found.push(...cfEmails);

  $('script, style, noscript').remove();
  const text = $('body').text();
  const normalized = normalizeObfuscatedEmails(text);
  const matches = normalized.match(EMAIL_REGEX);
  if (matches) found.push(...matches);

  return found
    .map((e) => e.trim().replace(/[.,;:)]+$/, ''))
    .filter((e) => e.length > 0 && e.includes('@'));
}

async function fetchHtml(
  url: string,
  timeoutMs: number,
  userAgent: string
): Promise<{ html: string | null; status: number | 'timeout' | 'error' }> {
  try {
    const res = await axios.get<string>(url, {
      timeout: timeoutMs,
      maxRedirects: 5,
      responseType: 'text',
      transformResponse: [(d) => d],
      validateStatus: () => true,
      headers: {
        'User-Agent': userAgent,
        Accept:
          'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'es-ES,es;q=0.9,en;q=0.8',
      },
    });
    if (res.status >= 200 && res.status < 300) {
      const ct = String(res.headers['content-type'] || '');
      if (ct && !ct.includes('html') && !ct.includes('text')) {
        return { html: null, status: res.status };
      }
      return { html: typeof res.data === 'string' ? res.data : String(res.data), status: res.status };
    }
    return { html: null, status: res.status };
  } catch (err) {
    const e = err as AxiosError;
    if (e.code === 'ECONNABORTED' || /timeout/i.test(e.message || '')) {
      return { html: null, status: 'timeout' };
    }
    return { html: null, status: 'error' };
  }
}

function buildUrl(base: string, path: string): string | null {
  try {
    return new URL(path, base).toString();
  } catch {
    return null;
  }
}

export async function scrapeEmailsFromWebsite(
  websiteUri: string,
  options: ScrapeOptions = {}
): Promise<ScrapedEmailResult> {
  const opts = {
    includePersonal: options.includePersonal ?? false,
    validateDomain: options.validateDomain ?? true,
    contactPaths: options.contactPaths ?? DEFAULT_CONTACT_PATHS,
    timeoutMs: options.timeoutMs ?? 10000,
    userAgent: options.userAgent ?? DEFAULT_USER_AGENT,
    maxContactPaths: options.maxContactPaths ?? 3,
  };

  const result: ScrapedEmailResult = {
    estado: 'sin_email',
    todosLosEmails: [],
    intentos: [],
  };

  const baseUrl = websiteUri.startsWith('http') ? websiteUri : `https://${websiteUri}`;
  const siteDomain = getDomain(baseUrl);

  const home = await fetchHtml(baseUrl, opts.timeoutMs, opts.userAgent);
  result.intentos.push({ url: baseUrl, status: home.status, emailsEncontrados: 0 });

  if (home.status === 403 || home.status === 401) {
    result.estado = 'bloqueado';
    result.error = `HTTP ${home.status} en home`;
    return result;
  }

  if (!home.html) {
    if (home.status === 'timeout' || home.status === 'error' || (typeof home.status === 'number' && home.status >= 500)) {
      result.estado = 'fetch_failed';
      result.error = `Home no accesible (status=${home.status})`;
      return result;
    }
  }

  const allFound = new Set<string>();
  let firstSource: EmailSourcePath | undefined;
  let firstSourceUrl: string | undefined;

  if (home.html) {
    const homeEmails = extractEmailsFromHtml(home.html);
    result.intentos[result.intentos.length - 1].emailsEncontrados = homeEmails.length;
    for (const e of homeEmails) {
      const lower = e.toLowerCase();
      if (!allFound.has(lower) && isEmailAcceptable(lower, siteDomain, opts)) {
        allFound.add(lower);
        if (!firstSource) {
          const fromMailto = home.html.toLowerCase().includes(`mailto:${lower}`);
          firstSource = fromMailto ? 'mailto' : home.html.includes('cf_email') && !fromMailto ? 'cloudflare' : 'home';
          firstSourceUrl = baseUrl;
        }
      }
    }
  }

  if (allFound.size === 0) {
    const pathsToTry = opts.contactPaths.slice(0, opts.maxContactPaths);
    for (const path of pathsToTry) {
      if (allFound.size > 0) break;
      const url = buildUrl(baseUrl, path);
      if (!url) continue;
      const sub = await fetchHtml(url, opts.timeoutMs, opts.userAgent);
      const intent = { url, status: sub.status, emailsEncontrados: 0 };
      result.intentos.push(intent);
      if (!sub.html) continue;
      const subEmails = extractEmailsFromHtml(sub.html);
      intent.emailsEncontrados = subEmails.length;
      for (const e of subEmails) {
        const lower = e.toLowerCase();
        if (!allFound.has(lower) && isEmailAcceptable(lower, siteDomain, opts)) {
          allFound.add(lower);
          if (!firstSource) {
            firstSource = 'contacto';
            firstSourceUrl = url;
          }
        }
      }
    }
  }

  result.todosLosEmails = Array.from(allFound);
  const best = pickBestEmail(result.todosLosEmails);
  if (best) {
    result.estado = 'ok';
    result.emailElegido = best;
    result.fuente = firstSource ?? 'home';
    result.fuenteUrl = firstSourceUrl ?? baseUrl;
  }

  return result;
}
