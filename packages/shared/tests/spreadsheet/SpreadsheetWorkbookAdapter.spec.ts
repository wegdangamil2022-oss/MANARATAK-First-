import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  readXlsxWorkbook,
  spreadsheetRowsToObjects,
  writeXlsxWorkbook,
} from '../../src/spreadsheet/SpreadsheetWorkbookAdapter';

describe('SpreadsheetWorkbookAdapter', () => {
  it('reads the tracked canonical Country workbook fixture', async () => {
    const fixture = readFileSync(resolve(
      'workspace/reference-data/countries/MANARATAK_All_Continents_Country_Records_CLEAN_IMPORT_READY.xlsx',
    ));
    const workbook = await readXlsxWorkbook(fixture);
    const countries = workbook.sheets.get('Countries');
    expect(countries).toBeDefined();
    const records = spreadsheetRowsToObjects<Record<string, unknown>>(countries!, { raw: false });
    expect(records.length).toBeGreaterThan(190);
    expect(records[0]).toHaveProperty('iso_alpha2');
    expect(records[0]).toHaveProperty('public_id');
  });

  it('reads a genuine XLSX workbook and preserves sheet selection and row shapes', async () => {
    const bytes = await writeXlsxWorkbook([
      { name: 'Ignored', rows: [['other']] },
      { name: 'Courses', rows: [['id', 'title'], [1, 'Course A'], [2, 'Course B']] },
    ]);
    const workbook = await readXlsxWorkbook(bytes);

    expect(workbook.sheetNames).toEqual(['Ignored', 'Courses']);
    expect(workbook.sheets.get('Courses')?.rawRows).toEqual([
      ['id', 'title'],
      [1, 'Course A'],
      [2, 'Course B'],
    ]);
  });

  it('fails safely for malformed and oversized untrusted inputs', async () => {
    await expect(readXlsxWorkbook(new Uint8Array([1, 2, 3, 4])))
      .rejects.toThrow('SPREADSHEET_WORKBOOK_INVALID');
    await expect(readXlsxWorkbook(new Uint8Array(9), { maxBytes: 8 }))
      .rejects.toThrow('SPREADSHEET_INPUT_TOO_LARGE');
  });

  it('rejects prototype-related headers without mutating Object.prototype', async () => {
    const bytes = await writeXlsxWorkbook([
      { name: 'Unsafe', rows: [['__proto__', 'safe'], ['polluted', 'value']] },
    ]);
    const workbook = await readXlsxWorkbook(bytes);
    const sheet = workbook.sheets.get('Unsafe');
    expect(sheet).toBeDefined();
    expect(() => spreadsheetRowsToObjects(sheet!)).toThrow('SPREADSHEET_UNSAFE_HEADER');
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });

  it('creates null-prototype records for safe spreadsheet headers', async () => {
    const bytes = await writeXlsxWorkbook([
      { name: 'Countries', rows: [['iso2', 'name'], ['YE', 'Yemen']] },
    ]);
    const workbook = await readXlsxWorkbook(bytes);
    const records = spreadsheetRowsToObjects(workbook.sheets.get('Countries')!);
    expect(Object.getPrototypeOf(records[0])).toBeNull();
    expect(records[0]).toMatchObject({ iso2: 'YE', name: 'Yemen' });
  });
});
