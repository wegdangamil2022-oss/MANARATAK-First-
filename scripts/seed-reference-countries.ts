import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { PrismaClient } from '@prisma/client';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { ReferenceDataImportHandoffService } from '../packages/application/src/reference-data/services/ReferenceDataImportHandoffService';
import { ReferenceDataSeedApplyService } from '../packages/application/src/reference-data/services/ReferenceDataSeedApplyService';
import { CountrySourceRecord, mapCountrySourceRecord } from '../packages/application/src/reference-data/services/CountryImportPreviewService';
import { PrismaReferenceDataRepository } from '../packages/infrastructure/src/reference-data/PrismaReferenceDataRepository';
import { ReferenceDataSeedStatus } from '../packages/domain/src/reference-data/seed/ReferenceDataSeedTypes';
import { requireDatabaseMutationGate } from './lib/require-database-mutation-gate';

const root = process.cwd();
const manifest = JSON.parse(fs.readFileSync(path.join(root, 'scripts/database/greenfield-seed.manifest.json'), 'utf8'));
const step = manifest.steps.find((item: { id: string }) => item.id === 'reference-countries');
if (!step) throw new Error('REFERENCE_COUNTRY_SEED_MANIFEST_STEP_MISSING');
if (step.state !== 'READY') throw new Error(`REFERENCE_COUNTRY_SEED_NOT_APPROVED:${step.state}`);
if (!step.sourcePath || !step.sourceSha256) throw new Error('REFERENCE_COUNTRY_SEED_SOURCE_CONTRACT_MISSING');

const sourcePath = path.join(root, step.sourcePath);
const bytes = fs.readFileSync(sourcePath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
if (sha256 !== step.sourceSha256) throw new Error('REFERENCE_COUNTRY_SEED_SOURCE_HASH_MISMATCH');

const workbook = await readXlsxWorkbook(bytes);
const sheet = workbook.sheets.get('Countries');
if (!sheet) throw new Error('REFERENCE_COUNTRY_SEED_SHEET_MISSING');
const rows = spreadsheetRowsToObjects<CountrySourceRecord>(sheet, { defaultValue: null, raw: false });
if (rows.length !== step.expected.ReferenceCountry.exact) throw new Error(`REFERENCE_COUNTRY_SEED_COUNT_MISMATCH:${rows.length}`);
const notReviewed = rows.filter((row) => String(row.reference_review_status ?? '').trim().toUpperCase() !== step.requiredReviewStatus);
if (notReviewed.length > 0) throw new Error(`REFERENCE_COUNTRY_SEED_REVIEW_REQUIRED:${notReviewed.length}`);

const records = rows.map(mapCountrySourceRecord);
const handoff = new ReferenceDataImportHandoffService();
const batch = handoff.prepareSeedBatch({
  seedBatchId: `greenfield-reference-countries:${step.sourceVersion}`,
  sourceName: path.basename(sourcePath),
  sourceVersion: step.sourceVersion,
  entityType: 'COUNTRY',
  records,
});
if (batch.status !== ReferenceDataSeedStatus.READY_TO_APPLY) {
  throw new Error(`REFERENCE_COUNTRY_SEED_VALIDATION_BLOCKED:${batch.validationSummary?.invalidRecords ?? 'unknown'}`);
}

requireDatabaseMutationGate('seed-reference-countries', { allowedPurposes: ['seed'] });
const prisma = new PrismaClient();
try {
  const repository = new PrismaReferenceDataRepository(prisma);
  const service = new ReferenceDataSeedApplyService(repository);
  const applied = await service.applyBatch(batch, `seed:${manifest.seedSetVersion}`);
  console.log(JSON.stringify({
    seed: 'reference-countries',
    status: applied.status,
    sourceVersion: step.sourceVersion,
    sourceSha256: sha256,
    records: records.length,
  }));
} finally {
  await prisma.$disconnect();
}
