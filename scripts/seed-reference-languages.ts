import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { ReferenceDataImportHandoffService } from '../packages/application/src/reference-data/services/ReferenceDataImportHandoffService';
import { ReferenceDataSeedApplyService } from '../packages/application/src/reference-data/services/ReferenceDataSeedApplyService';
import { PrismaReferenceDataRepository } from '../packages/infrastructure/src/reference-data/PrismaReferenceDataRepository';
import { ReferenceDataSeedStatus } from '../packages/domain/src/reference-data/seed/ReferenceDataSeedTypes';
import { UpsertReferenceLanguageDto } from '../packages/domain/src/reference-data/dto/ReferenceDataContracts';
import { ReferenceAliasInput } from '../packages/domain/src/reference-data/governance/ReferenceGovernance';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/database/greenfield-seed.manifest.json'), 'utf8'));
const step = manifest.steps.find((item: { id: string }) => item.id === 'reference-languages');
if (!step) throw new Error('REFERENCE_LANGUAGE_SEED_MANIFEST_STEP_MISSING');
if (step.state !== 'READY') throw new Error(`REFERENCE_LANGUAGE_SEED_NOT_APPROVED:${step.state}`);
if (!step.sourcePath || !step.sourceSha256) throw new Error('REFERENCE_LANGUAGE_SEED_SOURCE_CONTRACT_MISSING');

const sourcePath = path.join(root, step.sourcePath);
if (!fs.existsSync(sourcePath)) throw new Error(`REFERENCE_LANGUAGE_SEED_SOURCE_FILE_NOT_FOUND:${sourcePath}`);

const bytes = fs.readFileSync(sourcePath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (sha256 !== step.sourceSha256) throw new Error('REFERENCE_LANGUAGE_SEED_SOURCE_HASH_MISMATCH');

const content = fs.readFileSync(sourcePath, 'utf8');
const rows = parse(content, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
if (step.expected?.ReferenceLanguage?.exact && rows.length !== step.expected.ReferenceLanguage.exact) {
  throw new Error(`REFERENCE_LANGUAGE_SEED_COUNT_MISMATCH:${rows.length}`);
}

const requiredStatus = step.requiredReviewStatus ?? 'REVIEWED';
const notReviewed = rows.filter((row) => String(row.referenceReviewStatus ?? '').trim().toUpperCase() !== requiredStatus);
if (notReviewed.length > 0) throw new Error(`REFERENCE_LANGUAGE_SEED_REVIEW_REQUIRED:${notReviewed.length}`);

const records: UpsertReferenceLanguageDto[] = rows.map((row) => {
  const aliases: ReferenceAliasInput[] = row.aliases
    ? row.aliases
        .split(',')
        .map((a) => ({ alias: a.trim(), aliasType: 'COMMON' as const }))
        .filter((a) => Boolean(a.alias))
    : [];

  return {
    isoCode: String(row.isoCode ?? '').trim().toLowerCase(),
    name: String(row.name ?? '').trim(),
    nameAr: row.nameAr ? String(row.nameAr).trim() : null,
    nativeName: row.nativeName ? String(row.nativeName).trim() : null,
    direction: (String(row.direction ?? '').trim().toUpperCase() as 'LTR' | 'RTL') || 'LTR',
    isActive: row.isActive === 'true',
    aliases: aliases.length > 0 ? aliases : undefined,
    metadata: {
      languageType: row.languageType,
      lifecycleState: row.lifecycleState,
      referenceReviewStatus: row.referenceReviewStatus,
      provenance: row.provenance,
      notes: row.notes,
    },
  };
});

const handoff = new ReferenceDataImportHandoffService();
const batch = handoff.prepareSeedBatch({
  seedBatchId: `greenfield-reference-languages:${step.sourceVersion}`,
  sourceName: path.basename(sourcePath),
  sourceVersion: step.sourceVersion,
  entityType: 'LANGUAGE',
  records,
});

if (batch.status !== ReferenceDataSeedStatus.READY_TO_APPLY) {
  throw new Error(`REFERENCE_LANGUAGE_SEED_VALIDATION_BLOCKED:${batch.validationSummary?.invalidRecords ?? 'unknown'}`);
}

requireDatabaseMutationGate('seed-reference-languages', { allowedPurposes: ['seed'] });
const prisma = new PrismaClient();
try {
  const repository = new PrismaReferenceDataRepository(prisma);
  const service = new ReferenceDataSeedApplyService(repository);
  const applied = await service.applyBatch(batch, `seed:${manifest.seedSetVersion}`);
  console.log(
    JSON.stringify({
      seed: 'reference-languages',
      status: applied.status,
      sourceVersion: step.sourceVersion,
      sourceSha256: sha256,
      records: records.length,
    }),
  );
} finally {
  await prisma.$disconnect();
}
