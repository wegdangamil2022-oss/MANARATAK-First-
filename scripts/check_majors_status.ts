import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const counts = await prisma.major.groupBy({
    by: ['status'],
    _count: {
      status: true
    }
  });
  console.log(counts);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
