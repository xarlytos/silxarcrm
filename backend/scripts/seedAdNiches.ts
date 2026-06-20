/**
 * Siembra un sitio AdSense demo con sus nichos, para poder probar la red
 * multi-sitio de inmediato. En producción crearás sitios reales (con dominio
 * propio) desde el panel del CRM.
 * Uso: npx ts-node scripts/seedAdNiches.ts
 */
import '../src/config/env';
import { prisma } from '../src/config/database';
import { logger } from '../src/utils/logger';

const DEMO_SITE = {
  nombre: 'Revista Demo',
  domain: 'revista-demo.local',
  tema: 'Consejos prácticos de finanzas, hogar, tecnología y mascotas',
  idioma: 'es',
};

const NICHES = [
  { nombre: 'Finanzas personales', cpcTier: 'high', keywordsSemilla: ['cómo ahorrar dinero cada mes', 'mejores cuentas de ahorro', 'invertir en fondos indexados'] },
  { nombre: 'Seguros', cpcTier: 'high', keywordsSemilla: ['comparar seguros de coche', 'seguro de vida barato', 'qué cubre el seguro de hogar'] },
  { nombre: 'Tecnología y software', cpcTier: 'medium', keywordsSemilla: ['mejores apps de productividad', 'cómo elegir un CRM', 'alternativas gratis a Photoshop'] },
  { nombre: 'Hogar y bricolaje', cpcTier: 'medium', keywordsSemilla: ['ideas para reformar la cocina', 'cómo pintar una habitación', 'plantas de interior fáciles'] },
  { nombre: 'Mascotas', cpcTier: 'medium', keywordsSemilla: ['cómo cuidar el pelo de tu perro', 'mejor pienso para perros', 'cada cuánto bañar a un perro'] },
];

function slugify(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
    .replace(/\s+/g, '-').replace(/[^a-z0-9-]+/g, '').replace(/--+/g, '-');
}

async function main() {
  logger.info('🚀 Sembrando sitio AdSense demo...');

  const site =
    (await prisma.adSite.findUnique({ where: { domain: DEMO_SITE.domain } })) ||
    (await prisma.adSite.create({ data: DEMO_SITE }));
  logger.info(`✅ Sitio: ${site.nombre} (${site.domain})`);

  let created = 0;
  for (const n of NICHES) {
    const exists = await prisma.adNiche.findFirst({ where: { siteId: site.id, nombre: n.nombre } });
    if (exists) continue;
    await prisma.adNiche.create({
      data: {
        siteId: site.id,
        nombre: n.nombre,
        slug: `${slugify(n.nombre)}-${Math.random().toString(36).slice(2, 6)}`,
        cpcTier: n.cpcTier,
        keywordsSemilla: n.keywordsSemilla,
        idioma: 'es',
      },
    });
    created++;
    logger.info(`  ↳ Nicho: ${n.nombre}`);
  }
  logger.info(`Seed completado. ${created} nichos nuevos en el sitio demo.`);
}

main()
  .catch((e) => {
    logger.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
