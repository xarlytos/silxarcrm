import { PrismaClient } from '@prisma/client';
const p = new PrismaClient();

async function main() {
  const all = await p.lead.findMany({
    where: { softwareId: 'ervok', origen: 'google-maps-pyme' },
    select: { metadata: true },
  });
  const done = all.filter((l) => (l.metadata as any)?.iaClassification).length;
  console.log(`Total: ${all.length} | Clasificados: ${done} | Pendientes: ${all.length - done}`);
}

main().finally(() => p.$disconnect());
