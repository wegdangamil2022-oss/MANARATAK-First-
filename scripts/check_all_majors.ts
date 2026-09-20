import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const count = await prisma.major.count();
  console.log('Total majors:', count);
  
  const counts = await prisma.majorLevelProfile.groupBy({
    by: ['level'],
    _count: true
  });
  console.log('By level:', counts);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
