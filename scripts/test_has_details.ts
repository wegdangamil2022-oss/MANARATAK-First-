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
  
  let sectionCountGreater0 = 0;
  let sourceTypeDossier = 0;
  let detailHas = 0;
  
  for (const m of majors) {
    const md = m.optionalFields as any;
    const hasSections = m.versions.some(v => v.contentSections.length > 0);
    if (hasSections) {
        sectionCountGreater0++;
    }
    const metadataCount = md?.metadata?.contentBlockCount;
    if (metadataCount > 0) {
      //
    }
    if (md?.sourceClassificationSystem === 'MANARATAK_PHASE_10_DETAIL_DOSSIER') {
      sourceTypeDossier++;
    }
    
    // mimic frontend check:
    const sectionCount = typeof md?.metadata?.contentBlockCount === 'number' ? md.metadata.contentBlockCount : undefined;
    const st = md?.metadata?.sourceImportMode || (md?.sourceClassificationSystem === 'MANARATAK_PHASE_10_DETAIL_DOSSIER' ? 'DETAIL_DOSSIER' : undefined);
    if ((sectionCount ?? 0) > 0 || st === 'DETAIL_DOSSIER') {
      detailHas++;
    }
  }
  
  console.log({
    total: majors.length,
    sectionCountGreater0,
    sourceTypeDossier,
    detailHas
  });
}
run().catch(e => { console.error(e); process.exitCode = 1; });
