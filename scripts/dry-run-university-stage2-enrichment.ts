import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { UniversityStage2EnrichmentDryRunUseCase } from '../packages/application/src/universities/use-cases/UniversityStage2EnrichmentDryRunUseCase';
import type { UniversalImportHandoff } from '@manaratak/domain';

const sourceDirectory = path.resolve(process.argv[2] ?? 'workspace/import-sources/universities/stage-2-enrichment');
const countrySourcePath = path.resolve(process.argv[3] ?? 'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx');
const files = fs.readdirSync(sourceDirectory).filter(file => file.toLowerCase().endsWith('.xlsx')).sort();
if (!files.length) throw new Error(`No Stage 2 XLSX files found in ${sourceDirectory}`);

const handoffs: UniversalImportHandoff[] = [];
const artifacts: Array<{ fileName: string; sha256: string; records: number; columns: number }> = [];
for (const fileName of files) {
  const bytes = fs.readFileSync(path.join(sourceDirectory, fileName));
  const workbook = await readXlsxWorkbook(bytes);
  const sheet = workbook.sheets.get('Phase 1 Enrichment');
  if (!sheet) throw new Error(`Phase 1 Enrichment sheet not found: ${fileName}`);
  const rows = sheet.textRows;
  const headerIndex = rows.findIndex(row => row.some(value => value === 'University Reference ID'));
  if (headerIndex < 0) throw new Error(`University Reference ID header not found: ${fileName}`);
  const headers = rows[headerIndex].map(value => text(value) ?? '');
  if (headers.length !== 44) throw new Error(`Expected 44 Stage 2 columns, found ${headers.length}: ${fileName}`);
  const dataRows = rows.slice(headerIndex + 1).filter(row => text(row[0]));
  const artifactId = createHash('sha256').update(bytes).digest('hex');

  dataRows.forEach((row, index) => {
    const values = Object.fromEntries(headers.map((header, column) => [header, row[column]]));
    const sourceRowNumber = headerIndex + index + 2;
    handoffs.push({
      handoffId: `${artifactId}:${sourceRowNumber}`,
      ownerDomain: 'PHASE_11_UNIVERSITY',
      artifact: { sourceId: 'UNIVERSITY_STAGE_2_ENRICHMENT_XLSX', artifactId, rawArtifactReference: `${fileName}#${sourceRowNumber}` },
      normalizedPayload: normalize(values),
      provenance: {
        sourceSystem: 'UNIVERSITY_STAGE_2_ENRICHMENT_XLSX',
        acquiredAt: new Date('2026-08-14T00:00:00.000Z'),
        sourceRowNumber,
        contentHash: createHash('sha256').update(JSON.stringify(row)).digest('hex'),
      },
      validation: { state: 'VALID', issues: [] },
      execution: { executionId: `university-stage-2:${artifactId}`, dryRun: true, attempt: 1, idempotencyKey: `${artifactId}:${sourceRowNumber}` },
    });
  });
  artifacts.push({ fileName, sha256: artifactId, records: dataRows.length, columns: headers.length });
}

const countryBytes = fs.readFileSync(countrySourcePath);
const countryWorkbook = await readXlsxWorkbook(countryBytes);
const countrySheet = countryWorkbook.sheets.get('Countries');
if (!countrySheet) throw new Error(`Countries sheet not found: ${countrySourcePath}`);
const countryRows = spreadsheetRowsToObjects<Record<string, unknown>>(countrySheet, { defaultValue: null, raw: false });
const countriesByIso3 = new Map(countryRows.map(row => [text(row.iso_alpha3)?.toUpperCase(), { id: text(row.public_id), active: text(row.reference_review_status) !== 'INACTIVE' }])
  .filter((entry): entry is [string, { id: string; active: boolean }] => Boolean(entry[0] && entry[1].id)));

const summary = await new UniversityStage2EnrichmentDryRunUseCase({
  async resolveCountryByIso3(iso3) { return countriesByIso3.get(iso3) ?? null; },
}).execute(handoffs);

console.log(JSON.stringify({
  mode: 'DRY_RUN',
  stage: 'STAGE_2_ENRICHMENT_44_FIELDS',
  sourceDirectory,
  artifacts,
  total: summary.total,
  sourceValid: summary.sourceValid,
  sourceInvalid: summary.readiness.SOURCE_INVALID,
  readiness: summary.readiness,
  dispositions: summary.dispositions,
  validationIssueCounts: countIssues(summary.results),
  unresolvedCountryReferences: countUnresolved(summary.results),
  databaseWrites: summary.databaseWrites,
  databaseIdentityCheck: 'PENDING_GOOGLE_STUDIO',
}, null, 2));
if (summary.databaseWrites !== 0) throw new Error('Dry run attempted database writes.');

function normalize(values: Record<string, unknown>) {
  return {
    sourceReferenceId: text(values['University Reference ID']), originalImportedName: text(values['Original Imported Name']),
    countryName: text(values.Country), countryIso3: text(values['Country ISO3'])?.toUpperCase(), originalCity: text(values.City),
    originalInstitutionType: text(values['Original Institution Type']), originalOwnership: text(values['Original Ownership']),
    originalWebsiteUrl: text(values['Original Website URL']), originalSourceUrl: text(values['Original Source URL']),
    officialEnglishName: text(values['Official English Name']), officialLocalName: text(values['Official Local Name']),
    officialAbbreviation: text(values['Official Abbreviation']), verifiedInstitutionType: text(values['Verified Institution Type']),
    verifiedOwnership: text(values['Verified Ownership']), foundedYear: integer(values['Founded Year']), shortDescription: text(values['Short Description']),
    continent: text(values.Continent), regionName: text(values['State / Region']), verifiedCity: text(values['Verified City']),
    mainCampusAddress: text(values['Main Campus Address']), mapUrl: text(values['Map URL']), officialWebsiteUrl: text(values['Official Website URL']),
    officialWebsiteStatus: text(values['Official Website Status']), officialWebsiteSource: text(values['Official Website Source']),
    officialApplicationPortalUrl: text(values['Official Application Portal URL']), governmentRegistryUrl: text(values['Government Registry URL']),
    governmentAuthorityName: text(values['Government Authority Name']), universitySystemUrl: text(values['University System URL']),
    centralAdmissionsPortalUrl: text(values['Central Admissions Portal URL']), trustedInternationalDirectoryUrl: text(values['Trusted International Directory URL']),
    externalInstitutionId: text(values['External Institution ID']), primarySourceType: text(values['Primary Source Type']), primarySourceUrl: text(values['Primary Source URL']),
    officialPhone: text(values['Official Phone']), mainOfficialSocialMediaUrl: text(values['Main Official Social Media URL']),
    importContinentFile: text(values['Import Continent File']), importBatch: text(values['Import Batch']), importDate: text(values['Import Date']),
    lastVerifiedDate: text(values['Last Verified Date']), phaseCompletionStatus: text(values['Phase 1 Completion Status']), reviewStatus: text(values['Review Status']),
    duplicateCheckStatus: text(values['Duplicate Check Status']), dataConfidence: text(values['Data Confidence']), reviewNotes: text(values['Review Notes']),
  };
}
function text(value: unknown): string | undefined { const result = String(value ?? '').trim(); return result || undefined; }
function integer(value: unknown): number | undefined { const parsed = Number(text(value)); return Number.isInteger(parsed) ? parsed : undefined; }
function countIssues(results: readonly { validationIssues: readonly { code: string }[] }[]) {
  const counts: Record<string, number> = {}; for (const result of results) for (const issue of result.validationIssues) counts[issue.code] = (counts[issue.code] ?? 0) + 1; return counts;
}
function countUnresolved(results: readonly { referenceResolution: readonly { referenceType: string; sourceValue?: string; status: string }[] }[]) {
  const counts: Record<string, number> = {}; for (const result of results) for (const ref of result.referenceResolution) if (ref.referenceType === 'COUNTRY' && ref.status !== 'RESOLVED') counts[ref.sourceValue ?? 'MISSING'] = (counts[ref.sourceValue ?? 'MISSING'] ?? 0) + 1; return counts;
}
