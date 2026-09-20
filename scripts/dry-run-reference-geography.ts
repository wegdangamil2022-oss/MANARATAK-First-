import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { readXlsxWorkbook, spreadsheetRowsToObjects } from '@manaratak/shared';
import { GeographySourcePreviewService } from '../packages/application/src/reference-data/services/GeographySourcePreviewService';

const root = process.cwd();
const countryPath = path.join(root, 'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx');
const regionDirectory = path.join(root, 'workspace/reference-data/regions');
const cityDirectory = path.join(root, 'workspace/reference-data/cities');

const workbook = await readXlsxWorkbook(fs.readFileSync(countryPath));
const countrySheet = workbook.sheets.get('Countries');
if (!countrySheet) throw new Error('Countries sheet not found.');
const countries = spreadsheetRowsToObjects<Record<string, unknown>>(countrySheet, { defaultValue: null, raw: false });
const regionFiles = csvFiles(regionDirectory);
const cityFiles = csvFiles(cityDirectory);
const regions = regionFiles.flatMap(readCsv);
const cities = cityFiles.flatMap(readCsv);
const result = new GeographySourcePreviewService().preview({
  canonicalCountryIso2Codes: countries.map(row => String(row.iso_alpha2 ?? '')),
  regions,
  cities,
});

console.log(JSON.stringify({
  ...result,
  artifacts: {
    regionFiles: regionFiles.map(file => path.relative(root, file)),
    cityFiles: cityFiles.map(file => path.relative(root, file)),
  },
}, null, 2));

function csvFiles(directory: string): string[] {
  return fs.readdirSync(directory, { recursive: true, withFileTypes: true })
    .filter(entry => entry.isFile() && entry.name.toLowerCase().endsWith('.csv'))
    .map(entry => path.join(entry.parentPath, entry.name)).sort();
}

function readCsv(file: string): Array<Record<string, unknown>> {
  return parse(fs.readFileSync(file, 'utf8'), { columns: true, skip_empty_lines: true, bom: true, relax_column_count: false });
}
