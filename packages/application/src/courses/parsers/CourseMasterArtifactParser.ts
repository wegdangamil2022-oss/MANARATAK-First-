import { parse as parseCsv } from 'csv-parse/sync';
import {
  readXlsxWorkbook,
  spreadsheetColumnName,
  SpreadsheetWorksheet,
} from '@manaratak/shared';
import {
  IMPORTED_COURSE_MASTER_COLUMNS,
  ImportedCourseMasterRowContract,
} from '@manaratak/domain';

export type CourseMasterArtifactFormat = 'XLSX' | 'CSV';
export type CourseMasterIssueSeverity = 'ERROR' | 'WARNING';

export interface CourseMasterArtifactIssue {
  code: string;
  message: string;
  severity: CourseMasterIssueSeverity;
  rowNumber?: number;
  column?: string;
}

export interface ParsedCourseMasterRow {
  sourceRowNumber: number;
  row: ImportedCourseMasterRowContract;
}

export interface XlsxSecuritySummary {
  archiveEntryCount: number;
  compressedBytes: number;
  declaredUncompressedBytes: number;
  maximumEntryUncompressedBytes: number;
  maximumCompressionRatio: number;
}

export interface CourseMasterParseResult {
  format: CourseMasterArtifactFormat;
  sheetName: string;
  headers: string[];
  unknownColumns: string[];
  rows: ParsedCourseMasterRow[];
  issues: CourseMasterArtifactIssue[];
  ignoredBlankRows: number;
  security?: XlsxSecuritySummary;
}

const MAX_ARTIFACT_BYTES = 25 * 1024 * 1024;
const MAX_XLSX_ENTRIES = 10_000;
const MAX_XLSX_TOTAL_UNCOMPRESSED_BYTES = 128 * 1024 * 1024;
const MAX_XLSX_ENTRY_UNCOMPRESSED_BYTES = 32 * 1024 * 1024;
const MAX_XLSX_COMPRESSION_RATIO = 200;
const MAX_COURSE_ROWS = 100_000;
const REQUIRED_SHEET = 'Courses';
const COURSE_MASTER_COLUMN_COUNT = IMPORTED_COURSE_MASTER_COLUMNS.length;

const XLSX_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/octet-stream',
]);
const CSV_MIME_TYPES = new Set([
  'text/csv',
  'application/csv',
  'text/plain',
  'application/vnd.ms-excel',
  'application/octet-stream',
]);

function text(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toISOString();
  return String(value).trim();
}

function isBlankRow(values: unknown[]): boolean {
  return values.every((value) => text(value) === '');
}

function inferFormat(filename: string, mimeType: string): CourseMasterArtifactFormat {
  const lower = filename.trim().toLowerCase();
  const mime = mimeType.trim().toLowerCase();
  if (lower.endsWith('.xlsx')) {
    if (!XLSX_MIME_TYPES.has(mime)) throw new Error(`COURSE_ARTIFACT_MIME_MISMATCH:${mimeType}`);
    return 'XLSX';
  }
  if (lower.endsWith('.csv')) {
    if (!CSV_MIME_TYPES.has(mime)) throw new Error(`COURSE_ARTIFACT_MIME_MISMATCH:${mimeType}`);
    return 'CSV';
  }
  throw new Error('COURSE_ARTIFACT_FORMAT_UNSUPPORTED');
}

function assertSize(bytes: Uint8Array, declaredByteSize: number): void {
  if (declaredByteSize <= 0 || declaredByteSize > MAX_ARTIFACT_BYTES) {
    throw new Error('COURSE_ARTIFACT_DECLARED_SIZE_INVALID');
  }
  if (bytes.byteLength > MAX_ARTIFACT_BYTES) throw new Error('COURSE_ARTIFACT_TOO_LARGE');
  if (bytes.byteLength !== declaredByteSize) {
    throw new Error(`COURSE_ARTIFACT_SIZE_MISMATCH:${declaredByteSize}:${bytes.byteLength}`);
  }
}

function findEocd(buffer: Buffer): number {
  const minimum = Math.max(0, buffer.length - 65_557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  return -1;
}

function safeZipPath(name: string): boolean {
  if (!name || name.includes('\0')) return false;
  const normalized = name.replace(/\\/g, '/');
  if (normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)) return false;
  return !normalized.split('/').some((segment) => segment === '..');
}

function inspectXlsxArchive(bytes: Uint8Array): XlsxSecuritySummary {
  const buffer = Buffer.from(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
    throw new Error('COURSE_XLSX_ZIP_SIGNATURE_INVALID');
  }
  const eocd = findEocd(buffer);
  if (eocd < 0) throw new Error('COURSE_XLSX_EOCD_NOT_FOUND');

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralDirectorySize = buffer.readUInt32LE(eocd + 12);
  const centralDirectoryOffset = buffer.readUInt32LE(eocd + 16);
  if (entryCount === 0xffff || centralDirectorySize === 0xffffffff || centralDirectoryOffset === 0xffffffff) {
    throw new Error('COURSE_XLSX_ZIP64_UNSUPPORTED');
  }
  if (entryCount < 1 || entryCount > MAX_XLSX_ENTRIES) {
    throw new Error(`COURSE_XLSX_ENTRY_COUNT_INVALID:${entryCount}`);
  }
  if (centralDirectoryOffset + centralDirectorySize > buffer.length) {
    throw new Error('COURSE_XLSX_CENTRAL_DIRECTORY_BOUNDS_INVALID');
  }

  let cursor = centralDirectoryOffset;
  let totalUncompressed = 0;
  let maximumEntry = 0;
  let maximumRatio = 0;
  let contentTypes = false;
  let workbookXml = false;

  const forbiddenPrefixes = ['xl/embeddings/', 'xl/oleobjects/', 'xl/externallinks/', 'xl/querytables/'];
  const forbiddenExact = new Set(['xl/vbaproject.bin', 'xl/connections.xml']);

  for (let index = 0; index < entryCount; index += 1) {
    if (cursor + 46 > buffer.length || buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error('COURSE_XLSX_CENTRAL_DIRECTORY_ENTRY_INVALID');
    }
    const flags = buffer.readUInt16LE(cursor + 8);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const filenameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const nameStart = cursor + 46;
    const nameEnd = nameStart + filenameLength;
    if (nameEnd > buffer.length) throw new Error('COURSE_XLSX_ENTRY_NAME_BOUNDS_INVALID');

    const entryName = buffer.subarray(nameStart, nameEnd).toString('utf8');
    const normalizedName = entryName.replace(/\\/g, '/').toLowerCase();
    if (!safeZipPath(entryName)) throw new Error(`COURSE_XLSX_UNSAFE_ENTRY_PATH:${entryName}`);
    if ((flags & 0x0001) !== 0) throw new Error(`COURSE_XLSX_ENCRYPTED_ENTRY:${entryName}`);
    if (forbiddenExact.has(normalizedName) || forbiddenPrefixes.some((prefix) => normalizedName.startsWith(prefix))) {
      throw new Error(`COURSE_XLSX_ACTIVE_OR_EXTERNAL_CONTENT_REJECTED:${entryName}`);
    }

    if (normalizedName === '[content_types].xml') contentTypes = true;
    if (normalizedName === 'xl/workbook.xml') workbookXml = true;

    totalUncompressed += uncompressedSize;
    maximumEntry = Math.max(maximumEntry, uncompressedSize);
    const ratio = compressedSize === 0
      ? (uncompressedSize === 0 ? 1 : Number.POSITIVE_INFINITY)
      : uncompressedSize / compressedSize;
    maximumRatio = Math.max(maximumRatio, ratio);

    if (uncompressedSize > MAX_XLSX_ENTRY_UNCOMPRESSED_BYTES) {
      throw new Error(`COURSE_XLSX_ENTRY_TOO_LARGE:${entryName}`);
    }
    if (totalUncompressed > MAX_XLSX_TOTAL_UNCOMPRESSED_BYTES) {
      throw new Error('COURSE_XLSX_UNCOMPRESSED_SIZE_LIMIT_EXCEEDED');
    }
    if (ratio > MAX_XLSX_COMPRESSION_RATIO) {
      throw new Error(`COURSE_XLSX_COMPRESSION_RATIO_EXCEEDED:${entryName}`);
    }
    cursor = nameEnd + extraLength + commentLength;
  }

  if (!contentTypes || !workbookXml) throw new Error('COURSE_XLSX_REQUIRED_OPENXML_PARTS_MISSING');

  return {
    archiveEntryCount: entryCount,
    compressedBytes: bytes.byteLength,
    declaredUncompressedBytes: totalUncompressed,
    maximumEntryUncompressedBytes: maximumEntry,
    maximumCompressionRatio: Number(maximumRatio.toFixed(2)),
  };
}

function validateHeaders(headers: string[]): {
  unknownColumns: string[];
  issues: CourseMasterArtifactIssue[];
} {
  const issues: CourseMasterArtifactIssue[] = [];
  const expected = [...IMPORTED_COURSE_MASTER_COLUMNS];
  const counts = new Map<string, number>();
  for (const header of headers) counts.set(header, (counts.get(header) ?? 0) + 1);

  for (const required of expected) {
    if (!counts.has(required)) {
      issues.push({
        code: 'COURSE_MASTER_REQUIRED_COLUMN_MISSING',
        message: `Required column is missing: ${required}`,
        severity: 'ERROR',
        column: required,
      });
    } else if ((counts.get(required) ?? 0) > 1) {
      issues.push({
        code: 'COURSE_MASTER_DUPLICATE_REQUIRED_COLUMN',
        message: `Required column appears more than once: ${required}`,
        severity: 'ERROR',
        column: required,
      });
    }
  }

  const exactContract = headers.length === expected.length
    && headers.every((header, index) => header === expected[index]);
  if (!exactContract) {
    issues.push({
      code: 'COURSE_MASTER_COLUMN_CONTRACT_MISMATCH',
      message: `Course master columns must exactly match the approved 11-column contract and order: ${expected.join(' | ')}`,
      severity: 'ERROR',
    });
  }

  const unknownColumns = headers.filter((header) => header && !expected.includes(header as any));
  for (const column of unknownColumns) {
    issues.push({
      code: 'COURSE_MASTER_UNKNOWN_COLUMN',
      message: `Unknown column will not be mapped: ${column}`,
      severity: 'WARNING',
      column,
    });
  }
  return { unknownColumns, issues };
}

function rowFromValues(values: unknown[], sourceRowNumber: number): ParsedCourseMasterRow {
  return {
    sourceRowNumber,
    row: {
      sourceOrder: text(values[0]) || null,
      providerLabel: text(values[1]),
      courseName: text(values[2]),
      directCourseUrl: text(values[3]),
      studyFreeRaw: text(values[4]),
      freeCertificateRaw: text(values[5]),
      certificateTypeRaw: text(values[6]),
      languageRaw: text(values[7]),
      studyLevelRaw: text(values[8]),
      courseDurationRaw: text(values[9]),
      shortCourseTopicsRaw: text(values[10]),
    },
  };
}

function rowWidthIssue(values: unknown[], sourceRowNumber: number): CourseMasterArtifactIssue | undefined {
  const unexpectedColumn = values.findIndex((value, index) =>
    index >= COURSE_MASTER_COLUMN_COUNT && text(value) !== '',
  );
  if (unexpectedColumn < 0) return undefined;
  return {
    code: 'COURSE_MASTER_ROW_COLUMN_COUNT_MISMATCH',
    message: `Course master row contains a value outside the approved ${COURSE_MASTER_COLUMN_COUNT}-column contract.`,
    severity: 'ERROR',
    rowNumber: sourceRowNumber,
    column: spreadsheetColumnName(unexpectedColumn),
  };
}

function formulaIssues(sheet: SpreadsheetWorksheet): CourseMasterArtifactIssue[] {
  return sheet.formulas.map(({ address, row, column }) => ({
    code: 'COURSE_XLSX_FORMULA_CELL_REJECTED',
    message: `Formula cells are not allowed in import masters: ${address}`,
    severity: 'ERROR',
    rowNumber: row,
    column: spreadsheetColumnName(column - 1),
  }));
}

async function parseXlsx(bytes: Uint8Array): Promise<CourseMasterParseResult> {
  const security = inspectXlsxArchive(bytes);
  const workbook = await readXlsxWorkbook(bytes, {
    maxBytes: MAX_ARTIFACT_BYTES,
    maxRowsPerSheet: MAX_COURSE_ROWS + 1,
  });

  const sheet = workbook.sheets.get(REQUIRED_SHEET);
  if (!sheet) throw new Error(`COURSE_MASTER_REQUIRED_SHEET_MISSING:${REQUIRED_SHEET}`);

  const issues = formulaIssues(sheet);
  const matrix = sheet.rawRows;
  if (matrix.length === 0) throw new Error('COURSE_MASTER_EMPTY_SHEET');

  const headers = (matrix[0] ?? []).map(text);
  while (headers.length > 0 && headers.at(-1) === '') headers.pop();
  const headerResult = validateHeaders(headers);
  issues.push(...headerResult.issues);
  if (issues.some((issue) => issue.severity === 'ERROR' && issue.rowNumber === undefined)) {
    return {
      format: 'XLSX',
      sheetName: REQUIRED_SHEET,
      headers,
      unknownColumns: headerResult.unknownColumns,
      rows: [],
      issues,
      ignoredBlankRows: 0,
      security,
    };
  }

  const rows: ParsedCourseMasterRow[] = [];
  let ignoredBlankRows = 0;
  for (let index = 1; index < matrix.length; index += 1) {
    const values = matrix[index] ?? [];
    if (isBlankRow(values)) {
      ignoredBlankRows += 1;
      continue;
    }
    const widthIssue = rowWidthIssue(values, index + 1);
    if (widthIssue) issues.push(widthIssue);
    rows.push(rowFromValues(values, index + 1));
  }
  if (rows.length > MAX_COURSE_ROWS) throw new Error(`COURSE_MASTER_ROW_LIMIT_EXCEEDED:${rows.length}`);

  return {
    format: 'XLSX',
    sheetName: REQUIRED_SHEET,
    headers,
    unknownColumns: headerResult.unknownColumns,
    rows,
    issues,
    ignoredBlankRows,
    security,
  };
}

function parseCsvBytes(bytes: Uint8Array): CourseMasterParseResult {
  let decoded: string;
  try {
    decoded = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    throw new Error('COURSE_CSV_UTF8_REQUIRED');
  }

  let records: unknown[][];
  try {
    records = parseCsv(decoded.replace(/^\uFEFF/, ''), {
      bom: true,
      relax_column_count: false,
      skip_empty_lines: false,
    }) as unknown[][];
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
    if (code.startsWith('CSV_RECORD_')) {
      throw new Error('COURSE_MASTER_ROW_COLUMN_COUNT_MISMATCH');
    }
    throw error;
  }

  if (records.length === 0) throw new Error('COURSE_MASTER_EMPTY_CSV');
  const headers = (records[0] ?? []).map(text);
  const headerResult = validateHeaders(headers);
  if (headerResult.issues.some((issue) => issue.severity === 'ERROR')) {
    return {
      format: 'CSV',
      sheetName: REQUIRED_SHEET,
      headers,
      unknownColumns: headerResult.unknownColumns,
      rows: [],
      issues: headerResult.issues,
      ignoredBlankRows: 0,
    };
  }

  const rows: ParsedCourseMasterRow[] = [];
  let ignoredBlankRows = 0;
  for (let index = 1; index < records.length; index += 1) {
    const values = records[index] ?? [];
    if (isBlankRow(values)) {
      ignoredBlankRows += 1;
      continue;
    }
    rows.push(rowFromValues(values, index + 1));
  }
  if (rows.length > MAX_COURSE_ROWS) throw new Error(`COURSE_MASTER_ROW_LIMIT_EXCEEDED:${rows.length}`);

  return {
    format: 'CSV',
    sheetName: REQUIRED_SHEET,
    headers,
    unknownColumns: headerResult.unknownColumns,
    rows,
    issues: headerResult.issues,
    ignoredBlankRows,
  };
}

export class CourseMasterArtifactParser {
  public static async parse(input: {
    bytes: Uint8Array;
    originalFilename: string;
    mimeType: string;
    declaredByteSize: number;
  }): Promise<CourseMasterParseResult> {
    assertSize(input.bytes, input.declaredByteSize);
    return inferFormat(input.originalFilename, input.mimeType) === 'XLSX'
      ? await parseXlsx(input.bytes)
      : parseCsvBytes(input.bytes);
  }
}
