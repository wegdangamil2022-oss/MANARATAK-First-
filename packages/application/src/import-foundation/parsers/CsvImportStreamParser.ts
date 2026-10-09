import { ParsedImportRow, ImportParseError } from '@manaratak/domain';
import { IImportStreamParser, ImportStreamParserInput, ImportStreamParserContext } from './IImportStreamParser';

export class CsvImportStreamParser implements IImportStreamParser {
  readonly format = 'csv';
  supports(input: ImportStreamParserInput): boolean {
    return input.formatHint?.toLowerCase() === 'csv' ||
      ['text/csv', 'application/csv'].includes(input.mimeType?.toLowerCase() ?? '') ||
      Boolean(input.fileName?.toLowerCase().endsWith('.csv'));
  }

  async *parse(input: AsyncIterable<Uint8Array> | NodeJS.ReadableStream,
    context: ImportStreamParserContext): AsyncIterable<ParsedImportRow | ImportParseError> {
    // Preserve BOM in decoding so offsets still account for its original bytes.
    const decoder = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
    let quoted = false; let quotePending = false; let closedQuote = false; let skipLF = false;
    let cell = ''; let cells: string[] = []; let touched = false;
    let headers: string[] | undefined; let rowNumber = 0; let offset = 0; let rowStart = 0; let rowBytes = 0;
    const chunkSize = context.chunkSize || 1000;
    const processRow = function* (): Generator<ParsedImportRow | ImportParseError> {
      if (!touched && !cells.length && !cell) { rowBytes = 0; return; }
      cells.push(cell); cell = ''; touched = false; rowBytes = 0; closedQuote = false;
      rowNumber++;
      if (!headers) {
        headers = cells.map(value => value.trim());
        if (headers.some(value => ['__proto__', 'prototype', 'constructor', '_domainHandoff',
          '_sourceRowNumber', '_payloadFingerprint'].includes(value) || value.startsWith('_phase6')))
          throw new Error('IMPORT_RESERVED_HANDOFF_METADATA_FORBIDDEN');
        if (headers.length > 256 || headers.some(value => !value || value.length > 240) ||
          new Set(headers).size !== headers.length) throw new Error('CSV_HEADERS_INVALID');
      } else if (cells.length !== headers.length) {
        yield new ImportParseError({ code: 'CSV_COLUMN_COUNT_MISMATCH', message: 'CSV column count does not match header',
          sourceRowNumber: rowNumber, chunkIndex: Math.floor((rowNumber - 1) / chunkSize), recordOffset: rowStart,
          recoverable: true, rawFragment: cells.join(',').slice(0, 500) });
      } else {
        const raw: Record<string, unknown> = Object.create(null);
        for (let i = 0; i < headers.length; i++) raw[headers[i]] = cells[i];
        yield new ParsedImportRow({ batchId: context.batchId, sourceRowNumber: rowNumber,
          chunkIndex: Math.floor((rowNumber - 1) / chunkSize), recordOffset: rowStart, raw });
      }
      cells = [];
    };
    const consume = function* (text: string): Generator<ParsedImportRow | ImportParseError> {
      // for-of iterates code points; a multibyte character split across chunks
      // is decoded once, so its byte offset/limit does not depend on chunking.
      for (const char of text) {
        const bytes = Buffer.byteLength(char, 'utf8');
        if (!offset && char === '\uFEFF') { offset += bytes; rowStart = offset; continue; }
        offset += bytes;
        if (skipLF) {
          skipLF = false;
          if (char === '\n') { rowStart = offset; continue; }
        }
        rowBytes += bytes;
        if (rowBytes > 1024 * 1024 || cells.length >= 256) throw new Error('IMPORT_ROW_SIZE_LIMIT');
        if (quotePending) {
          quotePending = false;
          if (char === '"') { cell += '"'; continue; }
          quoted = false; closedQuote = true;
        }
        if (quoted) {
          if (char === '"') quotePending = true;
          else cell += char;
          continue;
        }
        if (closedQuote && ![',', '\r', '\n'].includes(char)) throw new Error('CSV_TRAILING_QUOTED_CONTENT');
        if (char === '"') {
          if (cell !== '' || closedQuote) throw new Error('CSV_UNEXPECTED_QUOTE');
          quoted = true; touched = true;
        } else if (char === ',') {
          cells.push(cell); cell = ''; closedQuote = false; touched = true;
        } else if (char === '\r' || char === '\n') {
          yield* processRow(); rowStart = offset; skipLF = char === '\r';
        } else { cell += char; touched = true; }
      }
    };
    for await (const chunk of input as AsyncIterable<Uint8Array>) {
      yield* consume(typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true }));
    }
    yield* consume(decoder.decode());
    if (quotePending) { quoted = false; quotePending = false; }
    if (quoted) {
      yield new ImportParseError({ code: 'CSV_UNTERMINATED_QUOTE', message: 'Unterminated quoted field',
        sourceRowNumber: rowNumber + 1, chunkIndex: Math.floor(rowNumber / chunkSize), recordOffset: rowStart,
        recoverable: false, rawFragment: cell.slice(0, 500) });
    } else yield* processRow();
  }
}
