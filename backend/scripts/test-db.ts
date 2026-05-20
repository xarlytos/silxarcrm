import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const p = new PrismaClient();
p.$queryRawUnsafe('SELECT 1')
  .then(() => console.log('DB OK'))
  .catch((e) => console.error('DB FAIL:', e.message))
  .finally(() => p.$disconnect());
