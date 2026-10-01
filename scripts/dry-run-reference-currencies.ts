import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { ReferenceDataImportHandoffService } from '../packages/application/src/reference-data/services/ReferenceDataImportHandoffService';
import { ReferenceDataValidationService } from '../packages/domain/src/reference-data/services/ReferenceDataValidationService';
import { ReferenceDataSeedStatus } from '../packages/domain/src/reference-data/seed/ReferenceDataSeedTypes';

const sourcePath = path.resolve(
  process.argv[2] ?? 'workspace/reference-data/currencies/MANARATAK_ISO4217_Currencies_CLEAN_IMPORT_READY.csv',
);

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Currency source file not found: ${sourcePath}`);
}

const bytes = fs.readFileSync(sourcePath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const content = fs.readFileSync(sourcePath, 'utf8');
const rows = parse(content, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;

const validator = new ReferenceDataValidationService();
const handoff = new ReferenceDataImportHandoffService();

const mappedRecords = rows.map((row) => {
  const minor = row.minorUnit !== '' && row.minorUnit !== null && row.minorUnit !== undefined ? Number(row.minorUnit) : null;
  return {
    isoCode: String(row.isoCode ?? '').trim().toUpperCase(),
    numericCode: row.numericCode ? String(row.numericCode).trim() : null,
    name: String(row.name ?? '').trim(),
    nameAr: row.nameAr ? String(row.nameAr).trim() : null,
    symbol: row.symbol ? String(row.symbol).trim() : null,
    minorUnit: minor,
    isActive: row.isActive === 'true',
    metadata: {
      currencyType: row.currencyType,
      lifecycleState: row.lifecycleState,
      referenceReviewStatus: row.referenceReviewStatus,
      provenance: row.provenance,
      notes: row.notes,
    },
  };
});

const duplicateCodes: string[] = [];
const seenCodes = new Set<string>();
for (const r of mappedRecords) {
  if (seenCodes.has(r.isoCode)) duplicateCodes.push(r.isoCode);
  seenCodes.add(r.isoCode);
}

const batch = handoff.prepareSeedBatch({
  seedBatchId: `dryrun-currencies:${sha256.slice(0, 16)}`,
  sourceName: path.basename(sourcePath),
  sourceVersion: sha256.slice(0, 16),
  entityType: 'CURRENCY',
  records: mappedRecords,
});

const currencyTypeCounts: Record<string, number> = {};
const lifecycleCounts: Record<string, number> = {};
const reviewStatusCounts: Record<string, number> = {};

for (const row of rows) {
  const ct = row.currencyType || 'UNKNOWN';
  const ls = row.lifecycleState || 'UNKNOWN';
  const rs = row.referenceReviewStatus || 'UNREVIEWED';
  currencyTypeCounts[ct] = (currencyTypeCounts[ct] ?? 0) + 1;
  lifecycleCounts[ls] = (lifecycleCounts[ls] ?? 0) + 1;
  reviewStatusCounts[rs] = (reviewStatusCounts[rs] ?? 0) + 1;
}

const unreviewedCount = mappedRecords.filter(r => r.metadata.referenceReviewStatus !== 'REVIEWED').length;

console.log(JSON.stringify({
  mode: 'DRY_RUN',
  sourcePath,
  sha256,
  records: rows.length,
  currencyTypeCounts,
  lifecycleCounts,
  reviewStatusCounts,
  duplicateIsoCodes: duplicateCodes,
  databaseWrites: 0,
  batchStatus: batch.status,
  validationSummary: batch.validationSummary,
  unreviewedRecords: unreviewedCount,
  promotionAllowed: batch.status === ReferenceDataSeedStatus.READY_TO_APPLY && duplicateCodes.length === 0 && unreviewedCount === 0,
}, null, 2));
