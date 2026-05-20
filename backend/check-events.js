const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({ datasources: { db: { url: 'postgresql://neondb_owner:npg_Wd6bHAtEmi7I@ep-dawn-pond-alqbmkl0-pooler.c-3.eu-central-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require' } } });

async function main() {
  try {
    const count = await prisma.calendarioEvento.count();
    console.log('Total eventos:', count);

    const rows = await prisma.calendarioEvento.findMany({ orderBy: { fechaInicio: 'desc' }, take: 5 });
    console.log('Eventos recientes:', JSON.stringify(rows.map(r => ({ id: r.id, titulo: r.titulo, fechaInicio: r.fechaInicio, asignadoA: r.asignadoA })), null, 2));
  } catch (e) {
    console.error('Error:', e.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
