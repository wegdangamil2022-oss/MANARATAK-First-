import { ParsedImportRow } from '@manaratak/domain';
import type { IImportStreamParser, ImportStreamParserContext, ImportStreamParserInput } from './IImportStreamParser';

/** UTF-8 object or array of objects, framed without buffering the whole artifact. */
export class JsonImportStreamParser implements IImportStreamParser {
  readonly format = 'json';
  supports(input: ImportStreamParserInput): boolean {
    return input.formatHint?.toLowerCase() === 'json' || input.mimeType?.toLowerCase() === 'application/json' ||
      Boolean(input.fileName?.toLowerCase().endsWith('.json'));
  }
  async *parse(input: AsyncIterable<Uint8Array> | NodeJS.ReadableStream, context: ImportStreamParserContext) {
    const row = Buffer.alloc(1024 * 1024);
    const decoder = new TextDecoder('utf-8', { fatal: true });
    let length = 0; let offset = 0; let start = 0; let rows = 0;
    let state: 'START' | 'VALUE' | 'AFTER' | 'EXPECT' | 'END' = 'START';
    let array = false; let allowEnd = true; let quoted = false; let escaped = false;
    const stack: number[] = [];
    const chunkSize = context.chunkSize ?? 1000;
    if (!Number.isSafeInteger(chunkSize) || chunkSize < 1) throw new Error('IMPORT_CHUNK_SIZE_INVALID');
    for await (const supplied of input as AsyncIterable<Uint8Array>) {
      const chunk = typeof supplied === 'string' ? Buffer.from(supplied) : supplied;
      for (const byte of chunk) {
        const current = offset++;
        if (offset > 64 * 1024 * 1024) throw new Error('IMPORT_ARTIFACT_SIZE_LIMIT');
        const whitespace = byte === 32 || byte === 9 || byte === 10 || byte === 13;
        if (state !== 'VALUE') {
          if (whitespace) continue;
          if (state === 'END') throw new Error('IMPORT_JSON_TRAILING_DATA');
          if (state === 'START' && byte === 91) { array = true; state = 'EXPECT'; continue; }
          if (state === 'AFTER') {
            if (array && byte === 44) { state = 'EXPECT'; allowEnd = false; continue; }
            if (array && byte === 93) { state = 'END'; continue; }
            throw new Error('IMPORT_JSON_SEPARATOR_INVALID');
          }
          if (state === 'EXPECT' && byte === 93 && allowEnd) { state = 'END'; continue; }
          if (byte !== 123) throw new Error('IMPORT_JSON_ROW_NOT_OBJECT');
          state = 'VALUE'; start = current; length = 0; quoted = false; escaped = false;
        }
        if (length >= row.length) throw new Error('IMPORT_ROW_SIZE_LIMIT');
        row[length++] = byte;
        if (quoted) {
          if (escaped) escaped = false;
          else if (byte === 92) escaped = true;
          else if (byte === 34) quoted = false;
        } else if (byte === 34) quoted = true;
        else if (byte === 123 || byte === 91) {
          stack.push(byte);
          if (stack.length > 64) throw new Error('IMPORT_JSON_DEPTH_LIMIT');
        } else if (byte === 125 || byte === 93) {
          if (stack.pop() !== (byte === 125 ? 123 : 91)) throw new Error('IMPORT_JSON_SYNTAX_INVALID');
          if (!stack.length) {
            let parsed: unknown;
            try { parsed = JSON.parse(decoder.decode(row.subarray(0, length))); }
            catch { throw new Error('IMPORT_JSON_SYNTAX_INVALID'); }
            if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('IMPORT_JSON_ROW_NOT_OBJECT');
            if (++rows > 100_000) throw new Error('IMPORT_ARTIFACT_ROW_LIMIT');
            state = array ? 'AFTER' : 'END';
            yield new ParsedImportRow({ batchId: context.batchId, sourceRowNumber: rows, recordOffset: start,
              chunkIndex: Math.floor((rows - 1) / chunkSize), raw: parsed as Record<string, unknown> });
          }
        }
      }
    }
    if (state !== 'END') throw new Error('IMPORT_JSON_DOCUMENT_INCOMPLETE');
  }
}
