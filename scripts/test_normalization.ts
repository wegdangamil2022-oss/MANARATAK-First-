import { container, registerDependencies } from '../apps/api/src/infrastructure/di/container.js';

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

async function run() {
  await registerDependencies();
  const prisma = container.resolve<any>('prisma');
  const dbMajors = await prisma.major.findMany();
  
  let validDetailCount = 0;
  let codeCount = 0;
  
  for (const item of dbMajors) {
    const optionalFields = getObject(item.optionalFields);
    const metadata = getObject(optionalFields.metadata);
    
    const classificationCode = getString(item.classificationCode) ?? getString(optionalFields.classificationCode);
    if (classificationCode) codeCount++;
    
    const isDetailDossier = getString(optionalFields.sourceClassificationSystem) === 'MANARATAK_PHASE_10_DETAIL_DOSSIER';
    const sourceType = isDetailDossier ? 'DETAIL_DOSSIER' : undefined;
    const sectionCount = isDetailDossier ? 22 : undefined;
    
    const hasDetails = (sectionCount ?? 0) > 0 || sourceType === 'DETAIL_DOSSIER';
    if (hasDetails) {
      validDetailCount++;
    }
  }
  
  console.log({
    totalDbItems: dbMajors.length,
    codeCount,
    validDetailCount
  });
}
run().catch(e => { console.error(e); process.exitCode = 1; });
