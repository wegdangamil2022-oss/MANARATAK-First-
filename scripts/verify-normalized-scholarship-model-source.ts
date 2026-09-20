import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const read = (path: string) => readFileSync(resolve(root, path), 'utf8');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const contracts = read('packages/domain/src/scholarships/contracts.ts');
const repository = read('packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts');
const migration = read('packages/infrastructure/prisma/migrations/20260820231500_normalize_scholarship_model/migration.sql');
const failures: string[] = [];

const requireSource = (condition: boolean, message: string) => {
  if (!condition) failures.push(message);
};

for (const model of [
  'ScholarshipBenefit',
  'ScholarshipDegreeTarget',
  'ScholarshipMajorTarget',
  'ScholarshipEligibilityItem',
  'ScholarshipRequiredDocument',
  'ScholarshipSourceEvidence',
  'ScholarshipUniversityLink',
]) {
  requireSource(schema.includes(`model ${model} {`), `Missing normalized Prisma model: ${model}`);
}

for (const key of [
  'benefitKey',
  'targetKey',
  'itemKey',
  'documentKey',
  'evidenceKey',
  'linkKey',
]) {
  requireSource(schema.includes(key), `Missing deterministic child key: ${key}`);
}

requireSource(schema.includes('optionalFields       Json?') || schema.includes('optionalFields      Json?'), 'Scholarship.optionalFields was removed before contract phase');
requireSource(schema.includes('sourceLocale         String?'), 'Scholarship.sourceLocale missing');
requireSource(schema.includes('primaryCountry    ReferenceCountry?'), 'Scholarship primary country canonical relation missing');
requireSource(schema.includes('ScholarshipBenefitCurrency'), 'Scholarship benefit currency relation missing');
requireSource(schema.includes('ScholarshipDegreeTargetDegree'), 'Degree target canonical relation missing');
requireSource(schema.includes('ScholarshipMajorTargetMajor'), 'Major target canonical relation missing');
requireSource(schema.includes('ScholarshipEligibilityTest'), 'Eligibility test canonical relation missing');
requireSource(schema.includes('ScholarshipUniversityLink'), 'University link model missing');

for (const contract of [
  'ScholarshipBenefitDto',
  'ScholarshipDegreeTargetDto',
  'ScholarshipMajorTargetDto',
  'ScholarshipEligibilityItemDto',
  'ScholarshipRequiredDocumentDto',
  'ScholarshipSourceEvidenceDto',
  'ScholarshipUniversityLinkDto',
]) {
  requireSource(contracts.includes(`interface ${contract}`), `Missing Scholarship-owned DTO: ${contract}`);
}

requireSource(repository.includes('normalizedInclude'), 'Repository normalized relation include missing');
requireSource(repository.includes('LEGACY_COMPATIBILITY_KEYS'), 'Explicit legacy compatibility whitelist missing');
requireSource(!repository.includes('...(typeof optionalFields'), 'Repository still arbitrarily flattens optionalFields');
requireSource(!repository.includes('...rest\n    };'), 'Repository contains legacy arbitrary rest spread into optionalFields');

requireSource(!/\b(DROP\s+(TABLE|COLUMN)|TRUNCATE|DELETE\s+FROM|UPDATE\s+\S+\s+SET)\b/i.test(migration), 'Migration draft contains destructive or backfill SQL');
requireSource(migration.includes('CREATE TABLE "ScholarshipBenefit"'), 'Migration draft missing normalized child tables');
requireSource(migration.includes('ALTER TABLE "Scholarship" ADD COLUMN "sourceLocale"'), 'Migration draft missing sourceLocale expansion');

if (failures.length > 0) {
  process.stderr.write(`NORMALIZED_SCHOLARSHIP_MODEL_SOURCE = FAIL\n${failures.map((failure) => `- ${failure}`).join('\n')}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write([
    'NORMALIZED_SCHOLARSHIP_MODEL_SOURCE = PASS',
    'RUNTIME_MIGRATION = PENDING',
    'MIGRATIONS_APPLIED = 0',
    'CLOUD_SQL_MUTATIONS = 0',
    'BACKFILL_EXECUTED = NO',
  ].join('\n') + '\n');
}
