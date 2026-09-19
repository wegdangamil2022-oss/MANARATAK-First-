import * as XLSX from '@e965/xlsx';

export interface SpreadsheetFormulaCell {
  address: string;
  row: number;
  column: number;
}

export interface SpreadsheetWorksheet {
  name: string;
  rawRows: unknown[][];
  textRows: string[][];
  formulas: SpreadsheetFormulaCell[];
}

export interface SpreadsheetWorkbook {
  sheetNames: string[];
  sheets: ReadonlyMap<string, SpreadsheetWorksheet>;
}

export interface SpreadsheetReadLimits {
  maxBytes?: number;
  maxSheets?: number;
  maxRowsPerSheet?: number;
  maxColumnsPerSheet?: number;
}

const DEFAULT_MAX_BYTES = 25 * 1024 * 1024;
const DEFAULT_MAX_SHEETS = 32;
const DEFAULT_MAX_ROWS = 100_001;
const DEFAULT_MAX_COLUMNS = 512;
const UNSAFE_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

function assertInput(bytes: Uint8Array, limits: SpreadsheetReadLimits): Required<SpreadsheetReadLimits> {
  const resolved = {
    maxBytes: limits.maxBytes ?? DEFAULT_MAX_BYTES,
    maxSheets: limits.maxSheets ?? DEFAULT_MAX_SHEETS,
    maxRowsPerSheet: limits.maxRowsPerSheet ?? DEFAULT_MAX_ROWS,
    maxColumnsPerSheet: limits.maxColumnsPerSheet ?? DEFAULT_MAX_COLUMNS,
  };
  if (bytes.byteLength === 0) throw new Error('SPREADSHEET_EMPTY_INPUT');
  if (bytes.byteLength > resolved.maxBytes) throw new Error('SPREADSHEET_INPUT_TOO_LARGE');
  if (bytes.byteLength < 4 || bytes[0] !== 0x50 || bytes[1] !== 0x4b || bytes[2] !== 0x03 || bytes[3] !== 0x04) {
    throw new Error('SPREADSHEET_WORKBOOK_INVALID');
  }
  return resolved;
}

function formulaCells(sheet: XLSX.WorkSheet): SpreadsheetFormulaCell[] {
  const formulas: SpreadsheetFormulaCell[] = [];
  for (const address of Object.keys(sheet)) {
    if (address.startsWith('!')) continue;
    const cell = sheet[address] as XLSX.CellObject;
    if (!cell || typeof cell.f !== 'string' || !cell.f.trim()) continue;
    const decoded = XLSX.utils.decode_cell(address);
    formulas.push({ address, row: decoded.r + 1, column: decoded.c + 1 });
  }
  return formulas;
}

export async function readXlsxWorkbook(
  bytes: Uint8Array,
  limits: SpreadsheetReadLimits = {},
): Promise<SpreadsheetWorkbook> {
  const resolved = assertInput(bytes, limits);
  let workbook: XLSX.WorkBook;
  try {
    workbook = XLSX.read(bytes, {
      type: 'array', raw: true, cellDates: false, cellFormula: true,
      cellHTML: false, cellNF: false, cellStyles: false,
    });
  } catch (error) {
    throw new Error('SPREADSHEET_WORKBOOK_INVALID', { cause: error });
  }
  if (workbook.SheetNames.length > resolved.maxSheets) {
    throw new Error('SPREADSHEET_SHEET_LIMIT_EXCEEDED');
  }

  const sheets = new Map<string, SpreadsheetWorksheet>();
  for (const name of workbook.SheetNames) {
    const source = workbook.Sheets[name];
    if (!source) continue;
    const rawRows = XLSX.utils.sheet_to_json<unknown[]>(source, {
      header: 1, raw: true, defval: '', blankrows: true,
    });
    const textRows = XLSX.utils.sheet_to_json<string[]>(source, {
      header: 1, raw: false, defval: '', blankrows: true,
    });
    const columnCount = Math.max(0, ...rawRows.map((row) => row.length));
    if (rawRows.length > resolved.maxRowsPerSheet) {
      throw new Error(`SPREADSHEET_ROW_LIMIT_EXCEEDED:${name}`);
    }
    if (columnCount > resolved.maxColumnsPerSheet) {
      throw new Error(`SPREADSHEET_COLUMN_LIMIT_EXCEEDED:${name}`);
    }
    sheets.set(name, { name, rawRows, textRows, formulas: formulaCells(source) });
  }
  return { sheetNames: [...workbook.SheetNames], sheets };
}

export function spreadsheetRowsToObjects<T extends Record<string, unknown>>(
  sheet: SpreadsheetWorksheet,
  options: { defaultValue?: unknown; raw?: boolean } = {},
): T[] {
  const rows = options.raw === false ? sheet.textRows : sheet.rawRows;
  const headers = (rows[0] ?? []).map((value) => String(value ?? '').trim());
  for (const header of headers) {
    if (UNSAFE_OBJECT_KEYS.has(header)) throw new Error(`SPREADSHEET_UNSAFE_HEADER:${header}`);
  }

  const records: T[] = [];
  for (const values of rows.slice(1)) {
    if (values.every((value) => value === null || value === undefined || value === '')) continue;
    const record = Object.create(null) as T;
    for (let index = 0; index < headers.length; index += 1) {
      const header = headers[index];
      if (!header) continue;
      const value = values[index];
      record[header as keyof T] = (value === null || value === undefined || value === ''
        ? options.defaultValue ?? null
        : value) as T[keyof T];
    }
    records.push(record);
  }
  return records;
}

export async function writeXlsxWorkbook(
  sheets: ReadonlyArray<{ name: string; rows: ReadonlyArray<ReadonlyArray<unknown>> }>,
): Promise<Uint8Array> {
  const workbook = XLSX.utils.book_new();
  for (const input of sheets) {
    const sheet = XLSX.utils.aoa_to_sheet(input.rows.map((row) => [...row]));
    input.rows.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      if (!value || typeof value !== 'object' || !('formula' in value)) return;
      const formula = String((value as { formula: unknown }).formula);
      const result = 'result' in value ? (value as { result: unknown }).result : undefined;
      const address = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
      sheet[address] = {
        t: typeof result === 'number' ? 'n' : 's',
        f: formula,
        v: result,
      } as XLSX.CellObject;
    }));
    XLSX.utils.book_append_sheet(workbook, sheet, input.name);
  }
  return new Uint8Array(XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx', compression: true }));
}

export function spreadsheetColumnName(zeroBasedColumn: number): string {
  if (!Number.isInteger(zeroBasedColumn) || zeroBasedColumn < 0) {
    throw new Error('SPREADSHEET_COLUMN_INDEX_INVALID');
  }
  return XLSX.utils.encode_col(zeroBasedColumn);
}
