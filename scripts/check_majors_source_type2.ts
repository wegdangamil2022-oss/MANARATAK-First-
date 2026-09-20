import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  
  const majors = await prisma.major.findMany();
  let withDetailsCount = 0;
  for (const major of majors) {
    const opt = major.optionalFields as any;
    if (opt?.sourceClassificationSystem === 'MANARATAK_PHASE_10_DETAIL_DOSSIER') {
      withDetailsCount++;
    }
  }
  console.log('Majors with DETAIL_DOSSIER in optionalFields:', withDetailsCount);
  
  let sectionCount = 0;
  for (const major of majors) {
    const opt = major.optionalFields as any;
    if (opt?.metadata?.contentBlockCount > 0) {
      sectionCount++;
    }
  }
  console.log('Majors with contentBlockCount in optionalFields:', sectionCount);
}
run().catch(e => { console.error(e); process.exitCode = 1; });
