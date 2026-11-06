import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { parse } from 'csv-parse/sync';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { GeographySourcePreviewService } from '../../packages/application/src/reference-data/services/GeographySourcePreviewService';
import { CountryImportPreviewService } from '../../packages/application/src/reference-data/services/CountryImportPreviewService';
import { prepareGeographyImport, type GeographySourceRow, type GeographyTargetSnapshot } from './GeographyImportPreparation';

const root = process.cwd();
const sha = (value: string | Uint8Array) => createHash('sha256').update(value).digest('hex');
const json = (value: unknown) => JSON.stringify(value, null, 2) + '\n';
const jsonl = (rows: unknown[]) => rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
const args = process.argv.slice(2);
const value = (key: string) => args[args.indexOf(key) + 1];
if (args[0] === '--verify' && args.length === 2) {
  const folder = path.resolve(args[1]);
  const manifest = JSON.parse(fs.readFileSync(path.join(folder, 'manifest.json'), 'utf8'));
  if (manifest.version !== 1 || manifest.databaseWrites !== 0 || manifest.applyAllowed !== false) throw Error('GEOGRAPHY_PREPARATION_MANIFEST_INVALID');
  for (const file of manifest.outputs as Array<{ path: string; sha256: string }>) {
    if (path.basename(file.path) !== file.path || sha(fs.readFileSync(path.join(folder, file.path))) !== file.sha256) throw Error('GEOGRAPHY_OUTPUT_HASH_MISMATCH');
  }
  for (const file of [...manifest.sources, ...manifest.preparationCode] as Array<{ path: string; sha256: string }>) {
    const target = path.resolve(root, file.path);
    if (!target.startsWith(path.join(root, path.sep)) || sha(fs.readFileSync(target)) !== file.sha256) throw Error('GEOGRAPHY_SOURCE_OR_CODE_CHANGED');
  }
  console.log(json({ mode: 'PREPARATION_VERIFIED', sources: manifest.sources.length, outputs: manifest.outputs.length, databaseWrites: 0, applyAllowed: false }));
} else {
  const keys = ['--snapshot', '--output', '--batch-size'];
  if (args.length % 2 || args.some((item, i) => i % 2 === 0 && !keys.includes(item)) || keys.some(key => args.filter(item => item === key).length > 1) || !args.includes('--snapshot') || !args.includes('--output')) throw Error('Usage: prepare-geography-import.ts --snapshot <read-only-json> --output <new-directory> [--batch-size 100]; or --verify <directory>');
  const output = path.resolve(value('--output'));
  if (output === root || output.startsWith(path.join(root, 'workspace') + path.sep) || (fs.existsSync(output) && fs.readdirSync(output).length)) throw Error('GEOGRAPHY_OUTPUT_MUST_BE_EMPTY_AND_OUTSIDE_SOURCES');
  const snapshotBytes = fs.readFileSync(path.resolve(value('--snapshot'))), snapshot = JSON.parse(snapshotBytes.toString('utf8')) as GeographyTargetSnapshot;
  const countryFile = 'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx';
  const sourceFiles: Array<{ path: string; sha256: string; rows: number; entity: string }> = [];
  const workbookBytes = fs.readFileSync(path.join(root, countryFile)), workbook = await readXlsxWorkbook(workbookBytes), sheet = workbook.sheets.get('Countries');
  if (!sheet) throw Error('COUNTRIES_SHEET_REQUIRED');
  const countryRows = spreadsheetRowsToObjects<Record<string, unknown>>(sheet, { defaultValue: null, raw: false });
  const countries: GeographySourceRow[] = countryRows.map((raw, index) => ({ path: countryFile, sha256: sha(workbookBytes), rowNumber: index + 2, raw }));
  sourceFiles.push({ path: countryFile, sha256: sha(workbookBytes), rows: countries.length, entity: 'COUNTRY' });
  const csvSources = (folder: string, entity: string): GeographySourceRow[] => {
    const walk = (directory: string): string[] => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory() ? walk(path.join(directory, entry.name)) : entry.name.endsWith('.csv') ? [path.join(directory, entry.name)] : []).sort();
    return walk(path.join(root, folder)).flatMap(file => {
      const bytes = fs.readFileSync(file), sourceHash = sha(bytes), relative = path.relative(root, file).replaceAll('\\', '/');
      const rows = parse(bytes, { columns: true, bom: true, skip_empty_lines: true, relax_column_count: false }) as Record<string, unknown>[];
      sourceFiles.push({ path: relative, sha256: sourceHash, rows: rows.length, entity });
      return rows.map((raw, index) => ({ path: relative, sha256: sourceHash, rowNumber: index + 2, raw }));
    });
  };
  const regions = csvSources('workspace/reference-data/regions', 'REGION'), cities = csvSources('workspace/reference-data/cities', 'CITY');
  const result = prepareGeographyImport({ countries, regions, cities, snapshot, batchSize: args.includes('--batch-size') ? Number(value('--batch-size')) : 100 });
  const sourcePreview = new GeographySourcePreviewService().preview({ canonicalCountryIso2Codes: countryRows.map(row => String(row.iso_alpha2)), regions: regions.map(row => row.raw), cities: cities.map(row => row.raw) });
  const countriesPreview = new CountryImportPreviewService().preview({ sourceName: countryFile, sourceVersion: sha(workbookBytes).slice(0, 16), sha256: sha(workbookBytes), records: countryRows });
  const count = (values: string[]) => { const output: Record<string, number> = {}; for (const value of values) output[value] = (output[value] ?? 0) + 1; return output; };
  const byCountry = countryRows.map(row => {
    const iso2 = String(row.iso_alpha2), records = result.records.filter(record => record.countryIso2 === iso2);
    return { iso2, name: row.name_en, nameAr: row.name_ar, regions: records.filter(record => record.entity === 'REGION').length, cities: records.filter(record => record.entity === 'CITY').length, actions: count(records.map(record => record.action)), heldReasons: count(records.flatMap(record => record.reasons)) };
  });
  const fields = (rows: GeographySourceRow[], direct: Record<string, string>) => [...new Set(rows.flatMap(row => Object.keys(row.raw)))].sort().map(field => ({ field, target: direct[field] ?? `raw.${field}`, policy: direct[field] ? 'PROPOSED_FIELD_REVIEW_REQUIRED' : 'RAW_SOURCE_PRESERVED_NO_INFERENCE' }));
  const coverage = {
    country: fields(countries, { name_en: 'name', name_ar: 'nameAr', iso_alpha2: 'iso2Code', iso_alpha3: 'iso3Code', official_name_en: 'officialName', continent: 'region', subregion: 'subregion', default_currency: 'defaultCurrencyCode', default_language: 'defaultLanguageCode', calling_code: 'callingCode' }),
    region: fields(regions, { countryIso2: 'countryIso2Code', regionCode: 'regionCode', nameEn: 'name', nameAr: 'nameAr' }),
    city: fields(cities, { countryIso2: 'countryIso2Code', cityNameEn: 'name', cityNameAr: 'nameAr', regionCode: 'dependency:canonical AdministrativeRegion.id after review' }),
    policy: 'Every source column is retained. Country metadataPatch is merged with current owner metadata only after review. Geography enrichments are not approved by importing identity.',
  };
  const summary = {
    mode: result.mode, databaseWrites: 0, applyAllowed: false, target: snapshot.target, targetSnapshotCapturedAt: snapshot.capturedAt, targetSnapshotSha256: sha(snapshotBytes),
    sourceRows: { countries: countries.length, regions: regions.length, cities: cities.length }, liveRows: { countries: snapshot.countries.length, currencies: snapshot.currencies.length, languages: snapshot.languages.length, regions: snapshot.regions.length, cities: snapshot.cities.length },
    counts: result.counts, batches: result.batches.length, batchSize: result.batchSize,
    reviewNotes: count(result.records.flatMap(row => row.reviewNotes)), heldReasons: count(result.records.flatMap(row => row.reasons)),
    sourcePreview, countryPreview: { valid: countriesPreview.validRecords, invalid: countriesPreview.invalidRecords, reviewRequired: countriesPreview.reviewRequiredRecords, duplicateKeys: countriesPreview.duplicateKeys, issueCounts: countriesPreview.issueCounts },
    executionOrder: ['PRESERVE_EXISTING_COUNTRIES_CURRENCIES_LANGUAGES', 'REVIEW_COUNTRY_FIELD_DIFFERENCES', 'REVIEW_AND_APPLY_REGIONS_BY_COUNTRY', 'RESOLVE_ACTUAL_REGION_IDS', 'REVIEW_AND_APPLY_CITIES_BY_COUNTRY', 'RECONCILE_COUNTS_IDENTITIES_AND_EXISTING_RELATIONSHIPS'],
    executionGates: ['EXPLICIT_OWNER_APPROVAL_FOR_REVIEWED_BATCH', 'CURRENT_SOURCE_AND_TARGET_VERSION_REVALIDATION', 'BATCH_RECOVERY_PROOF', 'AUTHENTICATED_OWNER_COMMANDS_AUDIT_OUTBOX', 'NO_RAW_IDS_AS_FOREIGN_KEYS', 'NO_RAW_SOURCE_OVERWRITE_OR_LIFECYCLE_INFERENCE'],
    excluded: ['Antarctica separate workbook', 'legacy archive JSON', 'new currencies/languages inferred from country text', 'StudyDestinationProfile publication and study/visa content'],
    fieldPolicy: result.fieldPolicy,
  };
  const sourceHash = sourceFiles.map(file => `${file.path}:${file.sha256}`).join('\n');
  const out: Record<string, string> = {
    'summary.json': json(summary), 'countries.jsonl': jsonl(result.records.filter(row => row.entity === 'COUNTRY')), 'regions.jsonl': jsonl(result.records.filter(row => row.entity === 'REGION')), 'cities.jsonl': jsonl(result.records.filter(row => row.entity === 'CITY')),
    'held.jsonl': jsonl(result.records.filter(row => row.action === 'HOLD')), 'batches.json': json(result.batches), 'country-coverage.json': json(byCountry), 'field-coverage.json': json(coverage),
    'README.md': '# Geography preparation\n\nRead-only source and target reconciliation. No apply operation or approval is included.\n\nReview summary.json, held.jsonl and field-coverage.json; approve bounded source rows before using existing owning-domain commands. Re-resolve actual region IDs after each region batch and never use a CSV source ID as a foreign key. Recheck current source hashes and target versions before writing. No original source file was changed.\n',
  };
  fs.mkdirSync(output, { recursive: true });
  for (const [name, bytes] of Object.entries(out)) fs.writeFileSync(path.join(output, name), bytes, { flag: 'wx' });
  const preparationCode = ['scripts/import/prepare-geography-import.ts', 'scripts/import/GeographyImportPreparation.ts'].map(file => ({ path: file, sha256: sha(fs.readFileSync(path.join(root, file))) }));
  fs.writeFileSync(path.join(output, 'manifest.json'), json({ version: 1, mode: 'PREPARATION_ONLY', databaseWrites: 0, applyAllowed: false, createdAt: new Date().toISOString(), sourceSha: execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim(), preparationCode, targetSnapshotSha256: sha(snapshotBytes), sources: sourceFiles, sourceSetSha256: sha(sourceHash), outputs: Object.entries(out).map(([name, content]) => ({ path: name, sha256: sha(content), bytes: Buffer.byteLength(content) })) }), { flag: 'wx' });
  console.log(json({ ...summary, outputDirectory: output }));
}
