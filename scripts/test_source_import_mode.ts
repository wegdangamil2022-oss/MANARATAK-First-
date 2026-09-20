import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';
import { PrismaClient } from '@prisma/client';

async function run() {
  await registerDependencies();
  const prisma = container.resolve<PrismaClient>('prisma');
  const majors = await prisma.major.findMany();
  let importModeDetailCount = 0;
  for (const m of majors) {
    const md = m.optionalFields as any;
    if (md?.metadata?.sourceImportMode === 'DETAIL_DOSSIER') {
      importModeDetailCount++;
    }
  }
  console.log({ importModeDetailCount });
}
run().catch(e => { console.error(e); process.exitCode = 1; });
