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
  
  let sectionCount = 0;
  let sourceTypeDossier = 0;
  
  for (const m of majors) {
    const md = m.optionalFields as any;
    if (md?.metadata?.contentBlockCount > 0) {
      sectionCount++;
    }
    if (md?.sourceClassificationSystem === 'MANARATAK_PHASE_10_DETAIL_DOSSIER') {
      sourceTypeDossier++;
    }
  }
  
  console.log({
    total: majors.length,
    sectionCount,
    sourceTypeDossier,
  });
}
run().catch(e => { console.error(e); process.exitCode = 1; });
