import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { UniversityStage1DryRunUseCase } from '../packages/application/src/universities/use-cases/UniversityStage1DryRunUseCase';
import type { UniversalImportHandoff } from '@manaratak/domain';

const sourceDirectory = path.resolve(process.argv[2] ?? 'workspace/import-sources/universities/stage-1');
const countrySourcePath = path.resolve(
  process.argv[3] ?? 'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx',
);
const files = fs.readdirSync(sourceDirectory)
  .filter(file => file.toLowerCase().endsWith('.xlsx'))
  .sort();

if (files.length === 0) throw new Error(`No Stage 1 XLSX files found in ${sourceDirectory}`);

const handoffs: UniversalImportHandoff[] = [];
const artifacts: Array<{ fileName: string; sha256: string; records: number }> = [];

for (const fileName of files) {
  const filePath = path.join(sourceDirectory, fileName);
  const bytes = fs.readFileSync(filePath);
  const workbook = await readXlsxWorkbook(bytes);
  const sheetName = workbook.sheetNames[0];
  if (!sheetName) throw new Error(`Workbook has no sheets: ${fileName}`);
  const sheet = workbook.sheets.get(sheetName);
  if (!sheet) throw new Error(`Workbook sheet is unavailable: ${fileName}`);
  const rows = sheet.textRows;
  const headerIndex = rows.findIndex(row => row.some(value => value === 'Reference ID'));
  if (headerIndex < 0) throw new Error(`Reference ID header not found: ${fileName}`);

  const headers = rows[headerIndex].map(value => String(value ?? '').trim());
  const dataRows = rows.slice(headerIndex + 1).filter(row => row.some(value => value !== null && value !== ''));
  const artifactId = createHash('sha256').update(bytes).digest('hex');

  for (let index = 0; index < dataRows.length; index += 1) {
    const values = Object.fromEntries(headers.map((header, column) => [header, dataRows[index][column]]));
    const sourceRowNumber = headerIndex + index + 2;
    handoffs.push({
      handoffId: `${artifactId}:${sourceRowNumber}`,
      ownerDomain: 'PHASE_11_UNIVERSITY',
      artifact: {
        sourceId: 'UNIVERSITY_STAGE_1_XLSX',
        artifactId,
        rawArtifactReference: `${fileName}#${sourceRowNumber}`,
      },
      normalizedPayload: {
        sourceReferenceId: text(values['Reference ID']),
        nationalCode: text(values['National Code']),
        officialName: text(values['Official English Name']),
        localName: text(values['Local Name']),
        countryName: text(values.Country),
        countryIso3: text(values.ISO3)?.toUpperCase(),
        cityName: text(values.City),
        institutionType: text(values['Institution Type']),
        ownership: text(values.Ownership),
        sourceStatus: text(values.Status),
        officialWebsite: text(values['Official Website']),
        officialSource: text(values['Official Source']),
      },
      provenance: {
        sourceSystem: 'UNIVERSITY_STAGE_1_XLSX',
        acquiredAt: new Date('2026-08-12T00:00:00.000Z'),
        sourceRowNumber,
        contentHash: createHash('sha256').update(JSON.stringify(dataRows[index])).digest('hex'),
      },
      validation: { state: 'VALID', issues: [] },
      execution: {
        executionId: `university-stage-1:${artifactId}`,
        dryRun: true,
        attempt: 1,
        idempotencyKey: `${artifactId}:${sourceRowNumber}`,
      },
    });
  }

  artifacts.push({ fileName, sha256: artifactId, records: dataRows.length });
}

const countryBytes = fs.readFileSync(countrySourcePath);
const countryWorkbook = await readXlsxWorkbook(countryBytes);
const countrySheet = countryWorkbook.sheets.get('Countries');
if (!countrySheet) throw new Error(`Countries sheet not found: ${countrySourcePath}`);
const countryRows = spreadsheetRowsToObjects<Record<string, unknown>>(countrySheet, { defaultValue: null, raw: false });
const countriesByIso3 = new Map(
  countryRows.map(row => [
    text(row.iso_alpha3)?.toUpperCase(),
    { id: text(row.public_id), active: text(row.reference_review_status) !== 'INACTIVE' },
  ]).filter((entry): entry is [string, { id: string; active: boolean }] => Boolean(entry[0] && entry[1].id)),
);

const summary = await new UniversityStage1DryRunUseCase({
  async resolveCountryByIso3(iso3) {
    return countriesByIso3.get(iso3) ?? null;
  },
}).execute(handoffs);
const countryCounts: Record<string, number> = {};
let academicProgramRows = 0;
for (const handoff of handoffs) {
  const payload = handoff.normalizedPayload as Record<string, unknown>;
  const countryIso3 = text(payload.countryIso3) ?? 'MISSING';
  countryCounts[countryIso3] = (countryCounts[countryIso3] ?? 0) + 1;
  if (Array.isArray(payload.academicPrograms) && payload.academicPrograms.length > 0) academicProgramRows += 1;
}
console.log(JSON.stringify({
  mode: 'DRY_RUN',
  sourceDirectory,
  countrySource: {
    fileName: path.basename(countrySourcePath),
    sha256: createHash('sha256').update(countryBytes).digest('hex'),
    canonicalCountries: countriesByIso3.size,
  },
  artifacts,
  total: summary.total,
  dispositions: summary.dispositions,
  databaseWrites: summary.databaseWrites,
  validationIssueCounts: countIssues(summary.results),
  unresolvedCountryReferences: countUnresolvedCountryReferences(summary.results),
  sourceRelationshipReadiness: {
    countriesRepresented: Object.keys(countryCounts).length,
    countryCounts,
    rowsWithAcademicPrograms: academicProgramRows,
    countryMajorRelationshipsAvailable: academicProgramRows > 0,
  },
}, null, 2));

if (summary.databaseWrites !== 0) throw new Error('Dry run attempted database writes.');

function text(value: unknown): string | undefined {
  const normalized = String(value ?? '').trim();
  return normalized || undefined;
}

function countIssues(results: typeof summary.results): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    for (const issue of result.validationIssues) counts[issue.code] = (counts[issue.code] ?? 0) + 1;
  }
  return counts;
}

function countUnresolvedCountryReferences(results: typeof summary.results): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const result of results) {
    for (const reference of result.referenceResolution) {
      if (reference.referenceType !== 'COUNTRY' || reference.status === 'RESOLVED') continue;
      const value = reference.sourceValue ?? 'MISSING';
      counts[value] = (counts[value] ?? 0) + 1;
    }
  }
  return counts;
}
