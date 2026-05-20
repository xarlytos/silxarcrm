import 'dotenv/config';
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
    { saas: 'atleevo', webhookSecret: 'whsec_atleevo_secret_key_2024', endpointUrl: '/webhooks/atleevo', descripcion: 'Atleevo - Software para Entrenadores Personales' },
    { saas: 'atleevogym', webhookSecret: 'whsec_atleevogym_secret_key_2024', endpointUrl: '/webhooks/atleevogym', descripcion: 'Atleevo Gym - Software para Gimnasios' },
    { saas: 'atleevoyoga', webhookSecret: 'whsec_atleevoyoga_secret_key_2024', endpointUrl: '/webhooks/atleevoyoga', descripcion: 'Atleevo Yoga - Software para Estudios de Yoga' },
    { saas: 'atleevobox', webhookSecret: 'whsec_atleevobox_secret_key_2024', endpointUrl: '/webhooks/atleevobox', descripcion: 'Atleevo Box - Software para Gimnasios de Boxeo' },
    { saas: 'agrogest', webhookSecret: 'whsec_agrogest_secret_key_2024', endpointUrl: '/webhooks/agrogest', descripcion: 'AgroGest - Software Agricola' },
    { saas: 'prismadental', webhookSecret: 'whsec_prismadental_secret_key_2024', endpointUrl: '/webhooks/prismadental', descripcion: 'Prisma Dental - Software Dental' },
    { saas: 'heliowatt', webhookSecret: 'whsec_heliowatt_secret_key_2024', endpointUrl: '/webhooks/heliowatt', descripcion: 'HelioWatt - Instaladoras Electricas de Placas Solares' },
    { saas: 'comantek', webhookSecret: 'whsec_comantek_secret_key_2024', endpointUrl: '/webhooks/comantek', descripcion: 'CoMantek - Empresas de Mantenimiento' },
    { saas: 'peluguau', webhookSecret: 'whsec_peluguau_secret_key_2024', endpointUrl: '/webhooks/peluguau', descripcion: 'PeluGuau - Software para Peluquerías Caninas' },
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
