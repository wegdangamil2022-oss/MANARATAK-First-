import { ParsedImportRow, ImportParseError } from '@manaratak/domain';
import { IImportStreamParser, ImportStreamParserInput, ImportStreamParserContext } from './IImportStreamParser';

export class NdjsonImportStreamParser implements IImportStreamParser {
  public readonly format = 'ndjson';

  public supports(input: ImportStreamParserInput): boolean {
    const hint = input.formatHint?.toLowerCase();
    if (hint === 'ndjson' || hint === 'jsonl') return true;

    const mime = input.mimeType?.toLowerCase();
    if (mime === 'application/x-ndjson' || mime === 'application/jsonl') return true;

    const file = input.fileName?.toLowerCase();
    if (file && (file.endsWith('.ndjson') || file.endsWith('.jsonl'))) return true;

    return false;
  }

  public async *parse(
    input: AsyncIterable<Uint8Array> | NodeJS.ReadableStream,
    context: ImportStreamParserContext
  ): AsyncIterable<ParsedImportRow | ImportParseError> {
    let buffer = '';
    let sourceRowNumber = 0;
    const chunkSize = context.chunkSize || 1000;
    let recordOffset = 0;

    const decoder = new TextDecoder('utf-8');

    for await (const chunk of input as AsyncIterable<Uint8Array>) {
      const text = typeof chunk === 'string' ? chunk : decoder.decode(chunk, { stream: true });
      buffer += text;

      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        buffer = buffer.slice(newlineIndex + 1);
        
        sourceRowNumber++;
        const currentOffset = recordOffset;
        recordOffset += Buffer.byteLength(line + '\n', 'utf-8');

        const trimmed = line.trim();
        if (!trimmed) {
          continue; // Ignore blank lines
        }

        yield this.processLine(trimmed, sourceRowNumber, currentOffset, context.batchId, chunkSize);
      }
    }

    buffer += decoder.decode();

    // Process final remaining buffer
    if (buffer.length > 0) {
      sourceRowNumber++;
      const currentOffset = recordOffset;
      const trimmed = buffer.trim();
      if (trimmed) {
        yield this.processLine(trimmed, sourceRowNumber, currentOffset, context.batchId, chunkSize);
      }
    }
  }

  private processLine(
    line: string,
    sourceRowNumber: number,
    recordOffset: number,
    batchId: string,
    chunkSize: number
  ): ParsedImportRow | ImportParseError {
    const chunkIndex = Math.floor((sourceRowNumber - 1) / chunkSize);

    try {
      const parsed = JSON.parse(line);

      if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return new ImportParseError({
          sourceRowNumber,
          recordOffset,
          chunkIndex,
          code: 'NDJSON_ROW_NOT_OBJECT',
          message: 'Parsed JSON is not an object',
          rawFragment: line.slice(0, 500),
          recoverable: true
        });
      }

      return new ParsedImportRow({
        batchId,
        sourceRowNumber,
        recordOffset,
        chunkIndex,
        raw: parsed as Record<string, unknown>
      });
    } catch (error) {
      return new ImportParseError({
        sourceRowNumber,
        recordOffset,
        chunkIndex,
        code: 'NDJSON_PARSE_ERROR',
        message: error instanceof Error ? error.message : 'Invalid JSON format',
        rawFragment: line.slice(0, 500),
        recoverable: true
      });
    }
  }
}
