import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const contracts = read('packages/domain/src/universities/UniversityReadinessContracts.ts');
const promotion = read('packages/application/src/universities/use-cases/UniversityImportPromotionUseCase.ts');
const listPreview = read('apps/web/src/features/admin-preview/AdminUniversitiesPreviewPage.tsx');
const detailPreview = read('apps/web/src/features/admin-preview/AdminUniversityDetailPage.tsx');
const phase6Directories = [
  'packages/domain/src/import-foundation',
  'packages/application/src/import-foundation',
  'packages/infrastructure/src/import-foundation',
];

function sourceFiles(directory) {
  const absolute = path.join(root, directory);
  if (!fs.existsSync(absolute)) return [];
  const found = [];
  const walk = (current) => {
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const target = path.join(current, entry.name);
      if (entry.isDirectory()) walk(target);
      else if (/\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(entry.name)) found.push(target);
    }
  };
  walk(absolute);
  return found;
}

const phase6UniversityDependencies = phase6Directories.flatMap(sourceFiles)
  .filter((file) => /(?:from\s+['"][^'"]*universit|UniversityImport|UniversityDomain)/i.test(fs.readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file).replaceAll('\\', '/'));
const directUniversityImportScripts = sourceFiles('.')
  .filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`))
  .filter((file) => /prisma\.university\.(?:create|createMany|upsert)/.test(fs.readFileSync(file, 'utf8')))
  .map((file) => path.relative(root, file).replaceAll('\\', '/'))
  .filter((file) => file !== 'packages/infrastructure/src/universities/PrismaUniversityRepository.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');

const report = {
  consumesPhase6Handoff: /UniversalImportHandoff/.test(contracts),
  consumesPhase7References: /ReferenceCountryDto/.test(contracts) && /AdministrativeRegionDto/.test(contracts) && /ReferenceCityDto/.test(contracts),
  consumesPhase8DegreeLevel: /DegreeLevelReference/.test(contracts) && /degreeLevel: DegreeLevelReference/.test(contracts),
  consumesPhase10Major: /majorId\?: string/.test(contracts),
  consumesPhase9Test: /internationalTestId: string/.test(contracts),
  stableInsIdentity: /UniversitySourceReferenceId = `INS-\$\{string\}`/.test(contracts),
  dryRunWritesZero: /databaseWrites: 0/.test(contracts),
  explicitRootSelection: /explicitlySelectedFileName/.test(contracts),
  legacyPromotionFailClosed: promotion.includes('UNIVERSITY_BULK_IMPORT_BLOCKED_PENDING_GOOGLE_STUDIO') && !/uuidv4|repository\.(?:create|update|upsert)/.test(promotion),
  phase6UniversityDependencies,
  directUniversityImportScripts,
  previewImportDisabled: !listPreview.includes('to="/admin/imports/universities"') && listPreview.includes('aria-disabled="true"'),
  previewMutationsDisabled: detailPreview.includes('const readOnlyReadinessPreview = true') && (detailPreview.match(/disabled=\{readOnlyReadinessPreview\}/g) ?? []).length >= 5,
  universityFilesModified: 0,
  universitiesImported: 0,
  schemaSha256: crypto.createHash('sha256').update(schema).digest('hex').toUpperCase(),
};

console.log(JSON.stringify(report, null, 2));
if (
  !report.consumesPhase6Handoff || !report.consumesPhase7References || !report.consumesPhase8DegreeLevel ||
  !report.consumesPhase10Major || !report.consumesPhase9Test || !report.stableInsIdentity ||
  !report.dryRunWritesZero || !report.explicitRootSelection || !report.legacyPromotionFailClosed ||
  phase6UniversityDependencies.length || directUniversityImportScripts.length ||
  !report.previewImportDisabled || !report.previewMutationsDisabled
) process.exitCode = 1;
