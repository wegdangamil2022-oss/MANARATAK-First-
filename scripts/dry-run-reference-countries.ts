import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { CountryImportPreviewService } from '../packages/application/src/reference-data/services/CountryImportPreviewService';
import { CountryDerivedReferencePreviewService } from '../packages/application/src/reference-data/services/CountryDerivedReferencePreviewService';

const sourcePath = path.resolve(
  process.argv[2] ?? 'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx',
);
const bytes = fs.readFileSync(sourcePath);
const workbook = await readXlsxWorkbook(bytes);
const sheet = workbook.sheets.get('Countries');
if (!sheet) throw new Error(`Countries sheet not found: ${sourcePath}`);

const rows = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, { defaultValue: null, raw: false });
const sha256 = createHash('sha256').update(bytes).digest('hex');
const applicationPreview = new CountryImportPreviewService().preview({
  sourceName: path.basename(sourcePath),
  sourceVersion: sha256.slice(0, 16),
  sha256,
  records: rows,
});
const derivedReferencePreview = new CountryDerivedReferencePreviewService().preview(rows);
const required = [
  'name_ar', 'name_en', 'iso_alpha2', 'iso_alpha3', 'iso_numeric', 'continent',
  'default_currency', 'default_language', 'primary_timezone', 'slug', 'public_id', 'reference_sources',
] as const;
const uniqueKeys = ['iso_alpha2', 'iso_alpha3', 'iso_numeric', 'slug', 'public_id'] as const;
const missing = Object.fromEntries(required.map(key => [key, rows.filter(row => !text(row[key])).length]));
const duplicates = Object.fromEntries(uniqueKeys.map(key => [key, duplicateValues(rows, key)]));
const continentCounts: Record<string, number> = {};
for (const row of rows) {
  const continent = text(row.continent) ?? 'MISSING';
  continentCounts[continent] = (continentCounts[continent] ?? 0) + 1;
}

const blockingIssues = [
  ...Object.entries(missing).filter(([, count]) => count > 0).map(([key, count]) => `MISSING_${key}:${count}`),
  ...Object.entries(duplicates).filter(([, values]) => values.length > 0).map(([key, values]) => `DUPLICATE_${key}:${values.join(',')}`),
];

console.log(JSON.stringify({
  mode: 'DRY_RUN', sourcePath,
  sha256,
  sheets: workbook.SheetNames, records: rows.length, columns: Object.keys(rows[0] ?? {}).length,
  continentCounts, missingRequired: missing, duplicates,
  reviewStatusCounts: countValues(rows, 'reference_review_status'),
  blockingIssues, databaseWrites: 0,
  applicationPreview: {
    validRecords: applicationPreview.validRecords,
    invalidRecords: applicationPreview.invalidRecords,
    reviewRequiredRecords: applicationPreview.reviewRequiredRecords,
    promotionAllowed: applicationPreview.promotionAllowed,
    promotionBlockers: applicationPreview.promotionBlockers,
    duplicateKeys: applicationPreview.duplicateKeys,
  },
  derivedReferencePreview: {
    currencies: derivedReferencePreview.currencies.length,
    languages: derivedReferencePreview.languages.length,
    promotionAllowed: derivedReferencePreview.promotionAllowed,
    promotionBlockers: derivedReferencePreview.promotionBlockers,
  },
}, null, 2));

if (blockingIssues.length > 0) process.exitCode = 1;

function text(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function duplicateValues(rows: Array<Record<string, unknown>>, key: string): string[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    const value = text(row[key]);
    if (value) counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value]) => value);
}

function countValues(rows: Array<Record<string, unknown>>, key: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const row of rows) {
    const value = text(row[key]) ?? 'MISSING';
    counts[value] = (counts[value] ?? 0) + 1;
  }
  return counts;
}
