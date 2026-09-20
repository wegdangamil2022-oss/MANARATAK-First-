import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const majors = await prisma.major.findMany({
    include: {
      versions: {
        include: {
          contentSections: true
        }
      }
    }
  });
  
  let totalSections = 0;
  let minSections = 999;
  let maxSections = 0;
  for (const m of majors) {
    const hasSecs = m.versions[0]?.contentSections?.length ?? 0;
    totalSections += hasSecs;
    if (hasSecs < minSections) minSections = hasSecs;
    if (hasSecs > maxSections) maxSections = hasSecs;
  }
  
  console.log({
    totalMajors: majors.length,
    averageSections: totalSections / majors.length,
    minSections,
    maxSections
  });
}
run().catch(e => { console.error(e); process.exitCode = 1; });
