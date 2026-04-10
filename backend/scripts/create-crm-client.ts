/**
 * Script para crear un CRM Client y generar su API Key
 *
 * Uso:
 *   npx ts-node scripts/create-crm-client.ts --name="Mi CRM" --saas="entrenadores"
 *
 * Opciones:
 *   --name        Nombre del CRM (requerido)
 *   --saas        Identificador del SaaS (requerido)
 *   --desc        Descripción opcional
 */

import { createCrmClient } from '../src/services/trackingService';
import { prisma } from '../src/config/database';

function parseArgs() {
  const args = process.argv.slice(2);
  const parsed: Record<string, string> = {};

  for (const arg of args) {
    if (arg.startsWith('--')) {
      const [key, value] = arg.substring(2).split('=');
      parsed[key] = value || '';
    }
  }

  return parsed;
}

async function main() {
  const args = parseArgs();

  const name = args.name || args.n;
  const saas = args.saas || args.s;
  const descripcion = args.desc || args.d;

  if (!name || !saas) {
    console.error('❌ Error: --name y --saas son requeridos');
    console.log('\nUso:');
    console.log('  npx ts-node scripts/create-crm-client.ts --name="Mi CRM" --saas="entrenadores"');
    console.log('\nOpciones:');
    console.log('  --name, -n     Nombre del CRM');
    console.log('  --saas, -s     Identificador del SaaS');
    console.log('  --desc, -d     Descripción opcional');
    process.exit(1);
  }

  try {
    console.log('🚀 Creando CRM Client...\n');

    const { crm, apiKey } = await createCrmClient(name, saas, descripcion);

    console.log('✅ CRM Client creado exitosamente\n');
    console.log('📋 Detalles:');
    console.log(`   ID:          ${crm.id}`);
    console.log(`   Nombre:      ${crm.name}`);
    console.log(`   SaaS:        ${crm.saas}`);
    console.log(`   Descripción: ${crm.descripcion || 'N/A'}`);
    console.log(`   Activo:      ${crm.activo}`);
    console.log(`\n🔑 API Key (¡GUÁRDALA AHORA!):`);
    console.log(`   ${apiKey}`);
    console.log(`\n⚠️  Esta API Key no se mostrará de nuevo.`);
    console.log(`   Si la pierdes, deberás generar una nueva.\n`);

    console.log('📖 Uso en tu CRM:');
    console.log(`   import { SilxarTracker } from '@silxar/tracker';`);
    console.log(`   const tracker = new SilxarTracker({`);
    console.log(`     apiKey: '${apiKey}',`);
    console.log(`     crmId: '${crm.id}'`);
    console.log(`   });`);
    console.log(`   tracker.track('user_registered', { user_id: 'u_123' });\n`);

  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
