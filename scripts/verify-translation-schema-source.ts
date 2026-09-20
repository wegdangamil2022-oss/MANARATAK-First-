import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const schema = readFileSync(
  resolve(process.cwd(), 'packages/infrastructure/prisma/schema.prisma'),
  'utf8',
);
const migration = readFileSync(
  resolve(
    process.cwd(),
    'packages/infrastructure/prisma/migrations/20260817010000_translation_phase7_11_extensions/migration.sql',
  ),
  'utf8',
);

const failures: string[] = [];

function modelBody(modelName: string): string {
  const match = schema.match(
    new RegExp(
      `model ${modelName}\\s*\\{([\\s\\S]*?)\\n\\}`,
      'm',
    ),
  );
  if (!match) {
    failures.push(`Model missing: ${modelName}`);
    return '';
  }
  return match[1];
}

function requireMatch(input: string, pattern: RegExp, message: string): void {
  if (!pattern.test(input)) failures.push(message);
}

function forbidMatch(input: string, pattern: RegExp, message: string): void {
  if (pattern.test(input)) failures.push(message);
}

for (const model of ['ReferenceCountry', 'ReferenceCurrency', 'ReferenceLanguage', 'ReferenceCity']) {
  requireMatch(modelBody(model), /\bnameAr\s+String\?/, `${model}.nameAr missing`);
}
requireMatch(modelBody('DegreeLevel'), /\bnameAr\s+String/, 'DegreeLevel.nameAr missing');
requireMatch(modelBody('DegreeLevel'), /\bnameEn\s+String/, 'DegreeLevel.nameEn missing');
requireMatch(modelBody('AcademicTaxonomyNode'), /\blocalizedNames\s+Json\?/, 'Taxonomy localizedNames missing');
requireMatch(modelBody('AcademicTaxonomyAlias'), /\blocale\s+String\?/, 'Taxonomy alias locale missing');
requireMatch(modelBody('InternationalTestVersion'), /\bsourceLocale\s+String\?/, 'InternationalTestVersion.sourceLocale missing');
requireMatch(modelBody('InternationalTestContentBlock'), /\blocale\s+String\?/, 'InternationalTestContentBlock.locale missing');
requireMatch(modelBody('Major'), /\blocalizedNameAr\s+String\?/, 'Major.localizedNameAr missing');
requireMatch(modelBody('Major'), /\blocalizedNameEn\s+String\?/, 'Major.localizedNameEn missing');
requireMatch(modelBody('FellowshipDefinition'), /\blocalizedNameAr\s+String\?/, 'FellowshipDefinition.localizedNameAr missing');
requireMatch(modelBody('FellowshipDefinition'), /\blocalizedNameEn\s+String\?/, 'FellowshipDefinition.localizedNameEn missing');
requireMatch(modelBody('MajorSource'), /\bsourceLocale\s+String\?/, 'MajorSource.sourceLocale missing');
requireMatch(modelBody('UniversitySourceRecord'), /\bsourceLocale\s+String\?/, 'UniversitySourceRecord.sourceLocale missing');
requireMatch(modelBody('University'), /\btranslations\s+UniversityTranslation\[\]/, 'University.translations missing');
requireMatch(modelBody('University'), /\blocalizedTexts\s+UniversityLocalizedText\[\]/, 'University.localizedTexts missing');
requireMatch(
  modelBody('UniversitySourceRecord'),
  /translations\s+UniversityTranslation\[\]\s+@relation\("UniversityTranslationSourceRecord"\)/,
  'UniversitySourceRecord translation provenance relation missing',
);
requireMatch(
  modelBody('UniversitySourceRecord'),
  /localizedTexts\s+UniversityLocalizedText\[\]\s+@relation\("UniversityLocalizedTextSourceRecord"\)/,
  'UniversitySourceRecord localized-text provenance relation missing',
);
forbidMatch(modelBody('UniversityCampus'), /UniversityTranslationSourceRecord|UniversityLocalizedTextSourceRecord/, 'Translation provenance relation leaked into UniversityCampus');
requireMatch(modelBody('UniversityTranslation'), /@@unique\(\[universityId,\s*locale\]\)/, 'UniversityTranslation uniqueness missing');
requireMatch(
  modelBody('UniversityLocalizedText'),
  /@@unique\(\[universityId,\s*targetType,\s*targetId,\s*fieldKey,\s*locale\]\)/,
  'UniversityLocalizedText uniqueness missing',
);
requireMatch(modelBody('University'), /\bpublicId\s+String\s+@unique/, 'University.publicId protected identity missing');
requireMatch(modelBody('Major'), /\bpublicId\s+String\s+@unique/, 'Major.publicId protected identity missing');
requireMatch(modelBody('FellowshipDefinition'), /\bpublicId\s+String\s+@unique/, 'FellowshipDefinition.publicId protected identity missing');

forbidMatch(
  migration,
  /\b(DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM|UPDATE\s+\S+\s+SET)\b/i,
  'Migration contains destructive/data-mutating statement',
);
requireMatch(migration, /CREATE TABLE "UniversityTranslation"/, 'UniversityTranslation migration missing');
requireMatch(migration, /CREATE TABLE "UniversityLocalizedText"/, 'UniversityLocalizedText migration missing');
requireMatch(migration, /ALTER TABLE "ReferenceCountry" ADD COLUMN "nameAr"/, 'ReferenceCountry.nameAr migration missing');
requireMatch(migration, /ALTER TABLE "UniversitySourceRecord" ADD COLUMN "sourceLocale"/, 'UniversitySourceRecord.sourceLocale migration missing');

if (failures.length > 0) {
  process.stderr.write(`TRANSLATION_SCHEMA_SOURCE_READY = FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write([
    'TRANSLATION_SCHEMA_SOURCE_READY = PASS',
    'MIGRATION_FILE_CREATED = YES',
    'MIGRATION_APPLIED = NO',
    'DB_MUTATIONS = 0',
  ].join('\n') + '\n');
}
