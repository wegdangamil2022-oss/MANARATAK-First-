import { describe, it, expect } from 'vitest';
import { NdjsonImportStreamParser } from '../../src/import-foundation/parsers/NdjsonImportStreamParser';
import { ParsedImportRow, ImportParseError } from '@manaratak/domain';

describe('NdjsonImportStreamParser', () => {
  const parser = new NdjsonImportStreamParser();

  describe('supports', () => {
    it('returns true for matching format hints', () => {
      expect(parser.supports({ formatHint: 'ndjson' })).toBe(true);
      expect(parser.supports({ formatHint: 'jsonl' })).toBe(true);
      expect(parser.supports({ formatHint: 'NDJSON' })).toBe(true);
    });

    it('returns true for matching file extensions', () => {
      expect(parser.supports({ fileName: 'data.ndjson' })).toBe(true);
      expect(parser.supports({ fileName: 'data.jsonl' })).toBe(true);
    });

    it('returns true for matching MIME types', () => {
      expect(parser.supports({ mimeType: 'application/x-ndjson' })).toBe(true);
      expect(parser.supports({ mimeType: 'application/jsonl' })).toBe(true);
    });

    it('returns false for non-matching inputs', () => {
      expect(parser.supports({ formatHint: 'json' })).toBe(false);
      expect(parser.supports({ fileName: 'data.csv' })).toBe(false);
      expect(parser.supports({ mimeType: 'text/csv' })).toBe(false);
    });
  });

  describe('parse', () => {
    async function collect(input: string, context = { batchId: 'batch-1' }) {
      const encoder = new TextEncoder();
      const iterable = {
        async *[Symbol.asyncIterator]() {
          yield encoder.encode(input);
        }
      };
      const results = [];
      for await (const result of parser.parse(iterable, context)) {
        results.push(result);
      }
      return results;
    }

    async function collectChunks(chunks: Uint8Array[], context = { batchId: 'batch-1' }) {
      const iterable = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };
      const results = [];
      for await (const result of parser.parse(iterable, context)) {
        results.push(result);
      }
      return results;
    }

    async function countParsedChunks(chunks: Uint8Array[], context = { batchId: 'batch-1' }) {
      const iterable = {
        async *[Symbol.asyncIterator]() {
          for (const chunk of chunks) {
            yield chunk;
          }
        }
      };
      let count = 0;
      let errorCount = 0;
      for await (const result of parser.parse(iterable, context)) {
        if (result instanceof ParsedImportRow) {
          count++;
        } else {
          errorCount++;
        }
      }
      return { count, errorCount };
    }

    it('parses 10K NDJSON rows efficiently', async () => {
      const row = '{"id": 1, "name": "Test Data", "value": 12345}\n';
      const rowsPerChunk = 100;
      const chunkCount = 100; // 10K total
      const chunkStr = row.repeat(rowsPerChunk);
      
      const encoder = new TextEncoder();
      const chunkBytes = encoder.encode(chunkStr);
      const chunks = Array(chunkCount).fill(chunkBytes);
      
      const start = Date.now();
      const { count, errorCount } = await countParsedChunks(chunks);
      const end = Date.now();
      
      expect(count).toBe(10000);
      expect(errorCount).toBe(0);
      expect(end - start).toBeLessThan(2000);
    });

    it('parses 100K NDJSON rows efficiently', async () => {
      const row = '{"id": 1, "name": "Test Data", "value": 12345}\n';
      const rowsPerChunk = 1000;
      const chunkCount = 100; // 100K total
      const chunkStr = row.repeat(rowsPerChunk);
      
      const encoder = new TextEncoder();
      const chunkBytes = encoder.encode(chunkStr);
      const chunks = Array(chunkCount).fill(chunkBytes);
      
      const start = Date.now();
      const { count, errorCount } = await countParsedChunks(chunks);
      const end = Date.now();
      
      expect(count).toBe(100000);
      expect(errorCount).toBe(0);
      expect(end - start).toBeLessThan(10000);
    });

    it('parses rows split across multiple chunks correctly', async () => {
      const encoder = new TextEncoder();
      const chunks = [
        encoder.encode('{"id": 1, "nam'),
        encoder.encode('e": "A"}\n{"id": 2, "name": "B"}\n')
      ];
      
      const results = await collectChunks(chunks);

      expect(results.length).toBe(2);
      expect(results[0]).toBeInstanceOf(ParsedImportRow);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: 1, name: 'A' });
      expect(results[1]).toBeInstanceOf(ParsedImportRow);
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: 2, name: 'B' });
    });

    it('preserves UTF-8 Arabic text split across chunks correctly', async () => {
      // "مرحبا" in UTF-8 is [0xd9, 0x85, 0xd8, 0xb1, 0xd8, 0xad, 0xd8, 0xa8, 0xd8, 0xa7]
      // We will split it right in the middle of a multi-byte character.
      // 0xd9 0x85 is 'م', 0xd8 0xb1 is 'ر', 0xd8 0xad is 'ح', 0xd8 0xa8 is 'ب', 0xd8 0xa7 is 'ا'
      const encoder = new TextEncoder();
      const part1Str = '{"id": 1, "text": "';
      const part3Str = '"}\n';
      
      const part1 = encoder.encode(part1Str);
      const part3 = encoder.encode(part3Str);
      const arabicBytes = new Uint8Array([0xd9, 0x85, 0xd8, 0xb1, 0xd8, 0xad, 0xd8, 0xa8, 0xd8, 0xa7]);

      // Split arabicBytes in half
      const arabicPart1 = arabicBytes.slice(0, 5); // Ends with 0xd8 (first byte of 'ح')
      const arabicPart2 = arabicBytes.slice(5);    // Starts with 0xad (second byte of 'ح')
      
      const chunk1 = new Uint8Array(part1.length + arabicPart1.length);
      chunk1.set(part1);
      chunk1.set(arabicPart1, part1.length);
      
      const chunk2 = new Uint8Array(arabicPart2.length + part3.length);
      chunk2.set(arabicPart2);
      chunk2.set(part3, arabicPart2.length);

      const results = await collectChunks([chunk1, chunk2]);

      expect(results.length).toBe(1);
      expect(results[0]).toBeInstanceOf(ParsedImportRow);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: 1, text: 'مرحبا' });
    });

    it('parses multiple valid NDJSON rows', async () => {
      const input = `{"id": 1, "name": "A"}\n{"id": 2, "name": "B"}\n`;
      const results = await collect(input);

      expect(results.length).toBe(2);
      expect(results[0]).toBeInstanceOf(ParsedImportRow);
      expect((results[0] as ParsedImportRow).sourceRowNumber).toBe(1);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: 1, name: 'A' });

      expect(results[1]).toBeInstanceOf(ParsedImportRow);
      expect((results[1] as ParsedImportRow).sourceRowNumber).toBe(2);
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: 2, name: 'B' });
    });

    it('ignores blank lines', async () => {
      const input = `{"id": 1}\n\n\n{"id": 2}\n`;
      const results = await collect(input);

      expect(results.length).toBe(2);
      expect((results[0] as ParsedImportRow).sourceRowNumber).toBe(1);
      expect((results[1] as ParsedImportRow).sourceRowNumber).toBe(4);
    });

    it('isolates malformed row and continues parsing later valid rows', async () => {
      const input = `{"id": 1}\n{bad json}\n{"id": 2}\n`;
      const results = await collect(input);

      expect(results.length).toBe(3);
      
      expect(results[0]).toBeInstanceOf(ParsedImportRow);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: 1 });

      expect(results[1]).toBeInstanceOf(ImportParseError);
      expect((results[1] as ImportParseError).code).toBe('NDJSON_PARSE_ERROR');
      expect((results[1] as ImportParseError).recoverable).toBe(true);
      expect((results[1] as ImportParseError).sourceRowNumber).toBe(2);

      expect(results[2]).toBeInstanceOf(ParsedImportRow);
      expect((results[2] as ParsedImportRow).raw).toEqual({ id: 2 });
    });

    it('rejects non-object JSON row as recoverable ImportParseError', async () => {
      const input = `{"id": 1}\n"just a string"\n[1, 2, 3]\nnull\n{"id": 2}`;
      const results = await collect(input);

      expect(results.length).toBe(5);
      
      expect(results[1]).toBeInstanceOf(ImportParseError);
      expect((results[1] as ImportParseError).code).toBe('NDJSON_ROW_NOT_OBJECT');

      expect(results[2]).toBeInstanceOf(ImportParseError);
      expect((results[2] as ImportParseError).code).toBe('NDJSON_ROW_NOT_OBJECT');

      expect(results[3]).toBeInstanceOf(ImportParseError);
      expect((results[3] as ImportParseError).code).toBe('NDJSON_ROW_NOT_OBJECT');

      expect(results[4]).toBeInstanceOf(ParsedImportRow);
      expect((results[4] as ParsedImportRow).raw).toEqual({ id: 2 });
    });

    it('processes final line without trailing newline', async () => {
      const input = `{"id": 1}\n{"id": 2}`;
      const results = await collect(input);

      expect(results.length).toBe(2);
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: 2 });
    });
  });
});
