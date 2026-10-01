import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { PrismaClient } from '@prisma/client';
import { ReferenceDataImportHandoffService } from '../packages/application/src/reference-data/services/ReferenceDataImportHandoffService';
import { ReferenceDataSeedApplyService } from '../packages/application/src/reference-data/services/ReferenceDataSeedApplyService';
import { PrismaReferenceDataRepository } from '../packages/infrastructure/src/reference-data/PrismaReferenceDataRepository';
import { ReferenceDataSeedStatus } from '../packages/domain/src/reference-data/seed/ReferenceDataSeedTypes';
import { UpsertReferenceCurrencyDto } from '../packages/domain/src/reference-data/dto/ReferenceDataContracts';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/database/greenfield-seed.manifest.json'), 'utf8'));
const step = manifest.steps.find((item: { id: string }) => item.id === 'reference-currencies');
if (!step) throw new Error('REFERENCE_CURRENCY_SEED_MANIFEST_STEP_MISSING');
if (step.state !== 'READY') throw new Error(`REFERENCE_CURRENCY_SEED_NOT_APPROVED:${step.state}`);
if (!step.sourcePath || !step.sourceSha256) throw new Error('REFERENCE_CURRENCY_SEED_SOURCE_CONTRACT_MISSING');

const sourcePath = path.join(root, step.sourcePath);
if (!fs.existsSync(sourcePath)) throw new Error(`REFERENCE_CURRENCY_SEED_SOURCE_FILE_NOT_FOUND:${sourcePath}`);

const bytes = fs.readFileSync(sourcePath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (sha256 !== step.sourceSha256) throw new Error('REFERENCE_CURRENCY_SEED_SOURCE_HASH_MISMATCH');

const content = fs.readFileSync(sourcePath, 'utf8');
const rows = parse(content, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;
if (step.expected?.ReferenceCurrency?.exact && rows.length !== step.expected.ReferenceCurrency.exact) {
  throw new Error(`REFERENCE_CURRENCY_SEED_COUNT_MISMATCH:${rows.length}`);
}

const requiredStatus = step.requiredReviewStatus ?? 'REVIEWED';
const notReviewed = rows.filter((row) => String(row.referenceReviewStatus ?? '').trim().toUpperCase() !== requiredStatus);
if (notReviewed.length > 0) throw new Error(`REFERENCE_CURRENCY_SEED_REVIEW_REQUIRED:${notReviewed.length}`);

const records: UpsertReferenceCurrencyDto[] = rows.map((row) => {
  const minor = row.minorUnit !== '' && row.minorUnit !== null && row.minorUnit !== undefined ? Number(row.minorUnit) : null;
  return {
    isoCode: String(row.isoCode ?? '').trim().toUpperCase(),
    numericCode: row.numericCode ? String(row.numericCode).trim() : null,
    name: String(row.name ?? '').trim(),
    nameAr: row.nameAr ? String(row.nameAr).trim() : null,
    symbol: row.symbol ? String(row.symbol).trim() : null,
    minorUnit: minor,
    isActive: true,
    metadata: {
      currencyType: row.currencyType,
      lifecycleState: row.lifecycleState,
      referenceReviewStatus: row.referenceReviewStatus,
      provenance: row.provenance,
      notes: row.notes,
    },
  };
});

const handoff = new ReferenceDataImportHandoffService();
const batch = handoff.prepareSeedBatch({
  seedBatchId: `greenfield-reference-currencies:${step.sourceVersion}`,
  sourceName: path.basename(sourcePath),
  sourceVersion: step.sourceVersion,
  entityType: 'CURRENCY',
  records,
});

if (batch.status !== ReferenceDataSeedStatus.READY_TO_APPLY) {
  throw new Error(`REFERENCE_CURRENCY_SEED_VALIDATION_BLOCKED:${batch.validationSummary?.invalidRecords ?? 'unknown'}`);
}

requireDatabaseMutationGate('seed-reference-currencies', { allowedPurposes: ['seed'] });
const prisma = new PrismaClient();
try {
  const repository = new PrismaReferenceDataRepository(prisma);
  const service = new ReferenceDataSeedApplyService(repository);
  const applied = await service.applyBatch(batch, `seed:${manifest.seedSetVersion}`);
  console.log(JSON.stringify({
    seed: 'reference-currencies',
    status: applied.status,
    sourceVersion: step.sourceVersion,
    sourceSha256: sha256,
    records: records.length,
  }));
} finally {
  await prisma.$disconnect();
}
