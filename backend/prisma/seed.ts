import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create admin user
  const passwordHash = await bcrypt.hash('admin123', 12);
  await prisma.usuarioCrm.upsert({
    where: { email: 'admin@crm-maestro.com' },
    update: {},
    create: {
      email: 'admin@crm-maestro.com',
      nombre: 'Administrador',
      passwordHash,
      rol: 'admin',
    },
  });

  // Create silxar user
  const silxarPasswordHash = await bcrypt.hash('silxar123', 12);
  await prisma.usuarioCrm.upsert({
    where: { email: 'silxar@gmail.com' },
    update: {},
    create: {
      email: 'silxar@gmail.com',
      nombre: 'Silxar',
      passwordHash: silxarPasswordHash,
      rol: 'admin',
    },
  });

  // Create webhook configs for SaaS
  const saasConfigs = [
    { saas: 'entrenadores', webhookSecret: 'whsec_test_entrenadores_secret_key_12345', endpointUrl: '/webhooks/entrenadores', descripcion: 'SaaS de Entrenadores Personales' },
    { saas: 'nutricion', webhookSecret: 'whsec_test_nutricion_secret_key_12345', endpointUrl: '/webhooks/nutricion', descripcion: 'SaaS de Nutrición' },
  ];

  for (const config of saasConfigs) {
    await prisma.webhookConfig.upsert({
      where: { saas: config.saas },
      update: {},
      create: config,
    });
  }

  console.log('Seed completed successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
