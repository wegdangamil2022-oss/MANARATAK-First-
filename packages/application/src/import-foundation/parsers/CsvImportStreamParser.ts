import { ParsedImportRow, ImportParseError } from '@manaratak/domain';
import { IImportStreamParser, ImportStreamParserInput, ImportStreamParserContext } from './IImportStreamParser';

export class CsvImportStreamParser implements IImportStreamParser {
  public readonly format = 'csv';

  public supports(input: ImportStreamParserInput): boolean {
    const hint = input.formatHint?.toLowerCase();
    if (hint === 'csv') return true;

    const mime = input.mimeType?.toLowerCase();
    if (mime === 'text/csv' || mime === 'application/csv') return true;

    const file = input.fileName?.toLowerCase();
    if (file && file.endsWith('.csv')) return true;

    return false;
  }

  public async *parse(
    input: AsyncIterable<Uint8Array> | NodeJS.ReadableStream,
    context: ImportStreamParserContext
  ): AsyncIterable<ParsedImportRow | ImportParseError> {
    const decoder = new TextDecoder('utf-8');
    let inQuotes = false;
    let currentCell = '';
    let currentRow: string[] = [];
    let headers: string[] | null = null;
    let sourceRowNumber = 0;
    let recordOffset = 0;
    const chunkSize = context.chunkSize || 1000;
    let buffer = '';
    
    const processRow = function* (): Generator<ParsedImportRow | ImportParseError> {
      if (currentRow.length === 0 && currentCell === '') return;
      
      currentRow.push(currentCell);
      currentCell = '';
      
      if (currentRow.length === 1 && currentRow[0] === '') {
        currentRow = [];
        return;
      }

      sourceRowNumber++;
      const chunkIndex = Math.floor((sourceRowNumber - 1) / chunkSize);

      if (!headers) {
        headers = [...currentRow];
      } else {
        if (currentRow.length !== headers.length) {
          yield new ImportParseError({
            code: 'CSV_COLUMN_COUNT_MISMATCH',
            message: `Expected ${headers.length} columns, got ${currentRow.length}`,
            sourceRowNumber,
            chunkIndex,
            recordOffset,
            recoverable: true,
            rawFragment: currentRow.join(',').slice(0, 500)
          });
        } else {
          const raw: Record<string, unknown> = {};
          for (let j = 0; j < headers.length; j++) {
            raw[headers[j]] = currentRow[j];
          }
          yield new ParsedImportRow({
            batchId: context.batchId,
            sourceRowNumber,
            chunkIndex,
            recordOffset,
            raw
          });
        }
      }
      currentRow = [];
    };

    for await (const chunk of input as AsyncIterable<Uint8Array>) {
      const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      buffer += text;
      
      let i = 0;
      while (i < buffer.length) {
        const char = buffer[i];
        
        if (inQuotes && char === '"') {
          if (i + 1 >= buffer.length) {
            break;
          }
          const nextChar = buffer[i + 1];
          if (nextChar === '"') {
            currentCell += '"';
            i += 2;
            recordOffset += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            recordOffset++;
            continue;
          }
        }
        
        if (!inQuotes && char === '\r') {
          if (i + 1 >= buffer.length) {
            break;
          }
          const nextChar = buffer[i + 1];
          if (nextChar === '\n') {
             yield* processRow();
             i += 2;
             recordOffset += 2;
             continue;
          }
          yield* processRow();
          i++;
          recordOffset++;
          continue;
        }

        if (inQuotes) {
          currentCell += char;
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            currentRow.push(currentCell);
            currentCell = '';
          } else if (char === '\n') {
            yield* processRow();
          } else {
            currentCell += char;
          }
        }
        i++;
        recordOffset++;
      }
      
      buffer = buffer.slice(i);
    }

    const remainingText = decoder.decode();
    buffer += remainingText;

    let i = 0;
    while (i < buffer.length) {
        const char = buffer[i];
        
        if (inQuotes && char === '"') {
          if (i + 1 >= buffer.length) {
            inQuotes = false;
            i++;
            recordOffset++;
            continue;
          }
          const nextChar = buffer[i + 1];
          if (nextChar === '"') {
            currentCell += '"';
            i += 2;
            recordOffset += 2;
            continue;
          } else {
            inQuotes = false;
            i++;
            recordOffset++;
            continue;
          }
        }
        
        if (!inQuotes && char === '\r') {
          if (i + 1 >= buffer.length) {
            yield* processRow();
            i++;
            recordOffset++;
            continue;
          }
          const nextChar = buffer[i + 1];
          if (nextChar === '\n') {
             yield* processRow();
             i += 2;
             recordOffset += 2;
             continue;
          }
          yield* processRow();
          i++;
          recordOffset++;
          continue;
        }

        if (inQuotes) {
          currentCell += char;
        } else {
          if (char === '"') {
            inQuotes = true;
          } else if (char === ',') {
            currentRow.push(currentCell);
            currentCell = '';
          } else if (char === '\n') {
            yield* processRow();
          } else {
            currentCell += char;
          }
        }
        i++;
        recordOffset++;
    }

    buffer = '';

    if (inQuotes) {
      yield new ImportParseError({
        code: 'CSV_UNTERMINATED_QUOTE',
        message: 'Unterminated quoted field at end of stream',
        sourceRowNumber: sourceRowNumber + 1,
        chunkIndex: Math.floor(sourceRowNumber / chunkSize),
        recordOffset,
        recoverable: false,
        rawFragment: currentCell.slice(0, 500)
      });
    } else if (currentRow.length > 0 || currentCell.length > 0) {
      yield* processRow();
    }
  }
}
