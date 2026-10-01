import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { parse } from 'csv-parse/sync';
import { ReferenceDataImportHandoffService } from '../packages/application/src/reference-data/services/ReferenceDataImportHandoffService';
import { ReferenceDataValidationService } from '../packages/domain/src/reference-data/services/ReferenceDataValidationService';
import { ReferenceDataSeedStatus } from '../packages/domain/src/reference-data/seed/ReferenceDataSeedTypes';
import { ReferenceAliasInput } from '../packages/domain/src/reference-data/governance/ReferenceGovernance';

const sourcePath = path.resolve(
  process.argv[2] ?? 'workspace/reference-data/languages/MANARATAK_Languages_CLEAN_IMPORT_READY.csv',
);

if (!fs.existsSync(sourcePath)) {
  throw new Error(`Language source file not found: ${sourcePath}`);
}

const bytes = fs.readFileSync(sourcePath);
const sha256 = createHash('sha256').update(bytes).digest('hex');
const content = fs.readFileSync(sourcePath, 'utf8');
const rows = parse(content, { columns: true, skip_empty_lines: true }) as Array<Record<string, string>>;

const validator = new ReferenceDataValidationService();
const handoff = new ReferenceDataImportHandoffService();

const mappedRecords = rows.map((row) => {
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

const duplicateCodes: string[] = [];
const seenCodes = new Set<string>();
for (const r of mappedRecords) {
  if (seenCodes.has(r.isoCode)) duplicateCodes.push(r.isoCode);
  seenCodes.add(r.isoCode);
}

const batch = handoff.prepareSeedBatch({
  seedBatchId: `dryrun-languages:${sha256.slice(0, 16)}`,
  sourceName: path.basename(sourcePath),
  sourceVersion: sha256.slice(0, 16),
  entityType: 'LANGUAGE',
  records: mappedRecords,
});

const directionCounts: Record<string, number> = {};
const languageTypeCounts: Record<string, number> = {};
const lifecycleCounts: Record<string, number> = {};
const reviewStatusCounts: Record<string, number> = {};

for (const row of rows) {
  const dir = row.direction || 'LTR';
  const lt = row.languageType || 'UNKNOWN';
  const ls = row.lifecycleState || 'UNKNOWN';
  const rs = row.referenceReviewStatus || 'UNREVIEWED';
  directionCounts[dir] = (directionCounts[dir] ?? 0) + 1;
  languageTypeCounts[lt] = (languageTypeCounts[lt] ?? 0) + 1;
  lifecycleCounts[ls] = (lifecycleCounts[ls] ?? 0) + 1;
  reviewStatusCounts[rs] = (reviewStatusCounts[rs] ?? 0) + 1;
}

const unreviewedCount = mappedRecords.filter((r) => r.metadata.referenceReviewStatus !== 'REVIEWED').length;

console.log(
  JSON.stringify(
    {
      mode: 'DRY_RUN',
      sourcePath,
      sha256,
      records: rows.length,
      directionCounts,
      languageTypeCounts,
      lifecycleCounts,
      reviewStatusCounts,
      duplicateIsoCodes: duplicateCodes,
      databaseWrites: 0,
      batchStatus: batch.status,
      validationSummary: batch.validationSummary,
      unreviewedRecords: unreviewedCount,
      promotionAllowed:
        batch.status === ReferenceDataSeedStatus.READY_TO_APPLY &&
        duplicateCodes.length === 0 &&
        unreviewedCount === 0,
    },
    null,
    2,
  ),
);
