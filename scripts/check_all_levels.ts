import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const majors = await prisma.major.findMany();
  const levelCounts: Record<string, number> = {};
  for (const m of majors) {
    const opt = m.optionalFields as any;
    const level = m.degreeLevel || opt?.degreeLevel || 'Unknown';
    levelCounts[level] = (levelCounts[level] || 0) + 1;
  }
  console.log('Degree levels of all 190 majors in DB:', levelCounts);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
