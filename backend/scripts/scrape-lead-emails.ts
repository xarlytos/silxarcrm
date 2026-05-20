/**
 * Scraping de emails desde las webs de los leads.
 *
 * Uso:
 *   npx tsx scripts/scrape-lead-emails.ts \
 *     --software=atleevo \
 *     --limit=50 \
 *     --concurrency=10 \
 *     --dry-run
 *
 * Flags:
 *   --software=ID        Filtrar por softwareId (sin flag = todos los atleevo*)
 *   --limit=N            Máximo N leads a procesar
 *   --concurrency=N      Workers paralelos (default 10)
 *   --dry-run            No escribe en BD
 *   --include-personal   Aceptar emails no role-based
 *   --no-validate-domain Aceptar emails cuyo dominio no coincide con la web
 *   --retry-failed       Solo reintentar leads con emailScraping.estado in (fetch_failed, bloqueado)
 *   --rate-ms=N          ms mínimos entre requests al mismo dominio (default 1500)
 */
import 'dotenv/config';
import { PrismaClient, Prisma } from '@prisma/client';
import { scrapeEmailsFromWebsite, ScrapedEmailResult } from '../src/services/emailScrapingService';

const prisma = new PrismaClient();

interface CliArgs {
  software?: string;
  limit?: number;
  concurrency: number;
  dryRun: boolean;
  includePersonal: boolean;
  validateDomain: boolean;
  retryFailed: boolean;
  rateMs: number;
}

function parseArgs(): CliArgs {
  const out: CliArgs = {
    concurrency: 10,
    dryRun: false,
    includePersonal: false,
    validateDomain: true,
    retryFailed: false,
    rateMs: 1500,
  };
  for (const arg of process.argv.slice(2)) {
    if (arg === '--dry-run') out.dryRun = true;
    else if (arg === '--include-personal') out.includePersonal = true;
    else if (arg === '--no-validate-domain') out.validateDomain = false;
    else if (arg === '--retry-failed') out.retryFailed = true;
    else if (arg.startsWith('--software=')) out.software = arg.split('=')[1];
    else if (arg.startsWith('--limit=')) out.limit = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--concurrency=')) out.concurrency = parseInt(arg.split('=')[1], 10);
    else if (arg.startsWith('--rate-ms=')) out.rateMs = parseInt(arg.split('=')[1], 10);
    else if (arg === '--help' || arg === '-h') {
      console.log(require('fs').readFileSync(__filename, 'utf8').split('\n').slice(1, 23).join('\n'));
      process.exit(0);
    } else {
      console.error(`Argumento desconocido: ${arg}`);
      process.exit(1);
    }
  }
  return out;
}

const DEFAULT_SOFTWARES = ['atleevo', 'atleevogym', 'atleevoyoga', 'atleevobox'];

function getDomain(url: string): string | null {
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    return u.hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return null;
  }
}

interface LeadToProcess {
  id: string;
  nombre: string;
  email: string | null;
  notas: string | null;
  metadata: Prisma.JsonValue;
  websiteUri: string;
  softwareId: string;
}

async function fetchLeads(args: CliArgs): Promise<LeadToProcess[]> {
  const softwareIds = args.software ? [args.software] : DEFAULT_SOFTWARES;

  const where: Prisma.LeadWhereInput = {
    softwareId: { in: softwareIds },
  };

  if (!args.retryFailed) {
    where.email = null;
  }

  const candidates = await prisma.lead.findMany({
    where,
    select: {
      id: true,
      nombre: true,
      email: true,
      notas: true,
      metadata: true,
      softwareId: true,
    },
    orderBy: { createdAt: 'asc' },
  });

  const filtered: LeadToProcess[] = [];
  for (const lead of candidates) {
    const meta = (lead.metadata ?? {}) as Record<string, unknown>;
    const websiteUri = typeof meta.websiteUri === 'string' ? meta.websiteUri : '';
    if (!websiteUri) continue;

    const emailScraping = (meta.emailScraping ?? null) as
      | { intentado?: boolean; estado?: string }
      | null;

    if (args.retryFailed) {
      if (
        !emailScraping ||
        !['fetch_failed', 'bloqueado'].includes(emailScraping.estado || '')
      ) {
        continue;
      }
    } else {
      if (lead.email) continue;
      if (emailScraping?.intentado) continue;
    }

    filtered.push({
      id: lead.id,
      nombre: lead.nombre,
      email: lead.email,
      notas: lead.notas,
      metadata: lead.metadata,
      websiteUri,
      softwareId: lead.softwareId,
    });

    if (args.limit && filtered.length >= args.limit) break;
  }

  return filtered;
}

class DomainRateLimiter {
  private lastHit = new Map<string, number>();
  constructor(private minGapMs: number) {}

  async wait(domain: string | null): Promise<void> {
    if (!domain) return;
    const now = Date.now();
    const last = this.lastHit.get(domain) ?? 0;
    const delta = now - last;
    if (delta < this.minGapMs) {
      await new Promise((r) => setTimeout(r, this.minGapMs - delta));
    }
    this.lastHit.set(domain, Date.now());
  }
}

function buildNoteLine(result: ScrapedEmailResult): string {
  const fecha = new Date().toISOString().slice(0, 10);
  if (result.estado === 'ok') {
    return `Email extraído de ${result.fuente} el ${fecha}`;
  }
  return `Email scraping: ${result.estado} el ${fecha}`;
}

async function persist(
  lead: LeadToProcess,
  result: ScrapedEmailResult,
  dryRun: boolean
): Promise<void> {
  const baseMeta = (lead.metadata ?? {}) as Record<string, unknown>;
  const updatedMeta = {
    ...baseMeta,
    emailScraping: {
      intentado: true,
      fechaIntento: new Date().toISOString(),
      estado: result.estado,
      fuente: result.fuente ?? null,
      fuenteUrl: result.fuenteUrl ?? null,
      todosLosEmails: result.todosLosEmails,
      emailElegido: result.emailElegido ?? null,
      intentos: result.intentos,
      error: result.error ?? null,
    },
  };

  if (dryRun) return;

  const noteLine = buildNoteLine(result);
  const nuevaNota = lead.notas ? `${lead.notas}\n${noteLine}` : noteLine;

  const data: Prisma.LeadUpdateInput = {
    metadata: updatedMeta as Prisma.InputJsonValue,
    notas: nuevaNota,
  };

  if (result.estado === 'ok' && result.emailElegido) {
    const existing = await prisma.lead.findFirst({
      where: {
        email: result.emailElegido,
        softwareId: lead.softwareId,
        NOT: { id: lead.id },
      },
      select: { id: true },
    });
    if (!existing) {
      data.email = result.emailElegido;
    }
  }

  await prisma.lead.update({ where: { id: lead.id }, data });
}

interface Stats {
  procesados: number;
  ok: number;
  sinEmail: number;
  fetchFailed: number;
  bloqueado: number;
  porSoftware: Record<string, { procesados: number; ok: number }>;
  porFuente: Record<string, number>;
}

function newStats(): Stats {
  return {
    procesados: 0,
    ok: 0,
    sinEmail: 0,
    fetchFailed: 0,
    bloqueado: 0,
    porSoftware: {},
    porFuente: {},
  };
}

function recordStat(stats: Stats, lead: LeadToProcess, result: ScrapedEmailResult) {
  stats.procesados++;
  if (result.estado === 'ok') stats.ok++;
  else if (result.estado === 'sin_email') stats.sinEmail++;
  else if (result.estado === 'fetch_failed') stats.fetchFailed++;
  else if (result.estado === 'bloqueado') stats.bloqueado++;

  const sw = lead.softwareId;
  if (!stats.porSoftware[sw]) stats.porSoftware[sw] = { procesados: 0, ok: 0 };
  stats.porSoftware[sw].procesados++;
  if (result.estado === 'ok') stats.porSoftware[sw].ok++;

  if (result.fuente) {
    stats.porFuente[result.fuente] = (stats.porFuente[result.fuente] ?? 0) + 1;
  }
}

async function runPool(
  leads: LeadToProcess[],
  args: CliArgs,
  stats: Stats
): Promise<void> {
  const limiter = new DomainRateLimiter(args.rateMs);
  let cursor = 0;
  const total = leads.length;

  async function worker(workerId: number) {
    while (true) {
      const idx = cursor++;
      if (idx >= total) return;
      const lead = leads[idx];
      const domain = getDomain(lead.websiteUri);
      await limiter.wait(domain);

      let result: ScrapedEmailResult;
      try {
        result = await scrapeEmailsFromWebsite(lead.websiteUri, {
          includePersonal: args.includePersonal,
          validateDomain: args.validateDomain,
        });
      } catch (err) {
        result = {
          estado: 'fetch_failed',
          todosLosEmails: [],
          intentos: [],
          error: err instanceof Error ? err.message : String(err),
        };
      }

      try {
        await persist(lead, result, args.dryRun);
      } catch (err) {
        console.error(`  ✗ [w${workerId}] persist error lead=${lead.id}: ${err instanceof Error ? err.message : err}`);
      }

      recordStat(stats, lead, result);

      const mark =
        result.estado === 'ok'
          ? `✓ ${result.emailElegido} (${result.fuente})`
          : `· ${result.estado}`;
      const progress = `[${String(stats.procesados).padStart(4)}/${total}]`;
      console.log(
        `${progress} ${lead.softwareId.padEnd(12)} ${truncate(lead.nombre, 32).padEnd(34)} ${truncate(domain ?? lead.websiteUri, 36).padEnd(38)} ${mark}`
      );
    }
  }

  const workers = Array.from({ length: Math.max(1, args.concurrency) }, (_, i) => worker(i + 1));
  await Promise.all(workers);
}

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + '…';
}

function printSummary(stats: Stats, dt: number, dryRun: boolean) {
  console.log('\n📊 Resumen scraping');
  console.log(`   Procesados:     ${stats.procesados}`);
  console.log(`   ✓ ok:          ${stats.ok}`);
  console.log(`   · sin_email:   ${stats.sinEmail}`);
  console.log(`   ✗ fetch_failed:${stats.fetchFailed}`);
  console.log(`   ✗ bloqueado:   ${stats.bloqueado}`);
  console.log(`   Tiempo:         ${dt.toFixed(1)}s`);
  if (dryRun) console.log(`   (dry-run: nada escrito en BD)`);

  console.log('\n   Por software:');
  for (const [sw, s] of Object.entries(stats.porSoftware)) {
    const pct = s.procesados ? ((s.ok / s.procesados) * 100).toFixed(1) : '0';
    console.log(`     ${sw.padEnd(14)} ${s.ok}/${s.procesados} (${pct}%)`);
  }

  if (Object.keys(stats.porFuente).length) {
    console.log('\n   Por fuente:');
    for (const [src, n] of Object.entries(stats.porFuente)) {
      console.log(`     ${src.padEnd(14)} ${n}`);
    }
  }
}

async function main() {
  const args = parseArgs();
  const t0 = Date.now();

  console.log('🔎 Scraping de emails de leads');
  console.log(
    `   software=${args.software ?? DEFAULT_SOFTWARES.join(',')}  limit=${args.limit ?? '∞'}  concurrency=${args.concurrency}  rate=${args.rateMs}ms  dry-run=${args.dryRun}  include-personal=${args.includePersonal}  validate-domain=${args.validateDomain}  retry-failed=${args.retryFailed}\n`
  );

  const leads = await fetchLeads(args);
  console.log(`📋 Leads candidatos a procesar: ${leads.length}\n`);

  if (leads.length === 0) {
    console.log('Nada que hacer.');
    return;
  }

  const stats = newStats();
  await runPool(leads, args, stats);

  const dt = (Date.now() - t0) / 1000;
  printSummary(stats, dt, args.dryRun);
}

main()
  .catch((err) => {
    console.error('❌ Error fatal:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
