import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

function getObject(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

// Minimal stub for phase10MajorSamples to compile/run
const phase10MajorSamples: any[] = [];

function normalizeApiMajor(item: Record<string, unknown>): any[] {
  const optionalFields = getObject(item.optionalFields);
  const localizedNames = getObject(optionalFields.localizedNames);
  const metadata = getObject(optionalFields.metadata);
  const profiles = Array.isArray(item.profiles) ? item.profiles : [];

  if (profiles.length > 0) {
    return profiles.map((p: any) => {
      const pMetadata = getObject(p.metadata);
      const isDetailDossier = pMetadata.sourceClassificationSystem === 'MANARATAK_PHASE_10_DETAIL_DOSSIER' || getString(optionalFields.sourceClassificationSystem) === 'MANARATAK_PHASE_10_DETAIL_DOSSIER';
      
      const rawLevel = String(p.level).toUpperCase();
      let degreeLevel = 'Bachelor';
      if (rawLevel === 'MASTER') degreeLevel = 'Master';
      else if (rawLevel === 'DOCTORATE') degreeLevel = 'Doctorate';
      else if (rawLevel === 'FELLOWSHIP') degreeLevel = 'Fellowship';

      const code = p.code || getString(item.classificationCode) || getString(optionalFields.classificationCode);

      const sample = phase10MajorSamples.find((major: any) => major.code === code || major.id === code);
      const isPhase10Sample = !!sample;

      return {
        id: p.id || String(item.id ?? item.publicId ?? item.slug ?? ''),
        displayName: p.displayName || p.localizedNameAr || String(item.displayName ?? item.canonicalName ?? localizedNames.ar ?? 'تخصص بدون اسم'),
        nameAr: p.localizedNameAr || getString(localizedNames.ar),
        nameEn: p.localizedNameEn || getString(localizedNames.en),
        code,
        degreeLevel,
        catalogKind: rawLevel,
        collegeOrField: getString(item.academicFieldOrDiscipline) ?? getString(item.collegeOrFaculty) ?? getString(optionalFields.collegeOrFaculty),
        academicFieldOrDiscipline: getString(item.academicFieldOrDiscipline) ?? getString(optionalFields.academicFieldOrDiscipline),
        collegeOrFaculty: getString(item.collegeOrFaculty) ?? getString(optionalFields.collegeOrFaculty),
        classificationCode: code,
        status: p.status || String(item.status ?? 'READY_TO_REVIEW'),
        completenessStatus: p.completenessStatus || getString(item.completenessStatus),
        sectionCount: typeof pMetadata.contentBlockCount === 'number' ? pMetadata.contentBlockCount : (isDetailDossier ? 22 : (sample ? sample.sectionCount : undefined)),
        sourceType: pMetadata.sourceImportMode || (isDetailDossier ? 'DETAIL_DOSSIER' : (isPhase10Sample ? 'DETAIL_DOSSIER' : undefined)),
        sourceFileName: getString(optionalFields.sourceFileName) ?? getString(metadata.sourceFileName),
        updatedAt: getString(item.updatedAt as string),
      };
    });
  }

  const classificationCode = getString(item.classificationCode) ?? getString(optionalFields.classificationCode);
  const sample = phase10MajorSamples.find((major: any) => major.code === classificationCode || major.id === classificationCode);
  const isPhase10Sample = !!sample;
  const isDetailDossier = getString(optionalFields.sourceClassificationSystem) === 'MANARATAK_PHASE_10_DETAIL_DOSSIER';

  return [{
    id: String(item.id ?? item.publicId ?? item.slug ?? ''),
    displayName: String(item.displayName ?? item.canonicalName ?? localizedNames.ar ?? localizedNames.en ?? 'تخصص بدون اسم'),
    nameAr: getString(localizedNames.ar),
    nameEn: getString(localizedNames.en),
    code: getString(item.classificationCode) ?? getString(optionalFields.classificationCode),
    degreeLevel: getString(item.degreeLevel) ?? getString(optionalFields.degreeLevel),
    catalogKind: getString(metadata.catalogKind),
    collegeOrField: getString(item.academicFieldOrDiscipline) ?? getString(item.collegeOrFaculty) ?? getString(optionalFields.collegeOrFaculty),
    academicFieldOrDiscipline: getString(item.academicFieldOrDiscipline) ?? getString(optionalFields.academicFieldOrDiscipline),
    collegeOrFaculty: getString(item.collegeOrFaculty) ?? getString(optionalFields.collegeOrFaculty),
    classificationCode,
    status: String(item.status ?? 'READY_TO_REVIEW'),
    completenessStatus: getString(item.completenessStatus),
    sectionCount: typeof metadata.contentBlockCount === 'number' ? metadata.contentBlockCount : (isDetailDossier ? 22 : (sample ? sample.sectionCount : undefined)),
    sourceType: getString(metadata.sourceImportMode) || (isDetailDossier ? 'DETAIL_DOSSIER' : (isPhase10Sample ? 'DETAIL_DOSSIER' : undefined)),
    sourceFileName: getString(optionalFields.sourceFileName) ?? getString(metadata.sourceFileName),
    updatedAt: getString(item.updatedAt as string),
  }];
}

async function run() {
  // Let's mimic getAdminMajors response formatting / retrieval.
  const majors = await prisma.major.findMany({
    include: {
      levelProfiles: true
    }
  });

  console.log(`Retrieved ${majors.length} major records.`);

  const apiItems = majors.flatMap(item => normalizeApiMajor(item as any));
  console.log(`After normalization, we have ${apiItems.length} items.`);

  const itemsWithCode = apiItems.filter(item => !!item.code);
  console.log(`Items with code: ${itemsWithCode.length}`);

  const sampleItems = apiItems.slice(0, 3);
  console.log('Sample items:', JSON.stringify(sampleItems, null, 2));

  // Count those with details
  const withDetails = apiItems.filter(item => (item.sectionCount ?? 0) > 0 || item.sourceType === 'DETAIL_DOSSIER');
  console.log(`Items with details (normalized list): ${withDetails.length}`);

  // Let's see how many have sectionCount > 0, and how many have sourceType === 'DETAIL_DOSSIER'
  const withSectionCount = apiItems.filter(item => (item.sectionCount ?? 0) > 0);
  const withDetailDossierType = apiItems.filter(item => item.sourceType === 'DETAIL_DOSSIER');
  console.log(`withSectionCount: ${withSectionCount.length}, withDetailDossierType: ${withDetailDossierType.length}`);

  // Let's check some metadata properties of a few levelProfiles in DB
  const someProfiles = await prisma.majorLevelProfile.findMany({
    take: 10,
    where: {
      metadata: { not: null }
    }
  });
  console.log('Sample MajorLevelProfile metadata:');
  for (const p of someProfiles) {
    console.log(`Profile ID: ${p.id}, Code: ${p.code}, Level: ${p.level}, Metadata:`, JSON.stringify(p.metadata));
  }
}

run().catch(e => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
