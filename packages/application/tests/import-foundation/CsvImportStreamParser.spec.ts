import { describe, it, expect } from 'vitest';
import { CsvImportStreamParser } from '../../src/import-foundation/parsers/CsvImportStreamParser';
import { ParsedImportRow, ImportParseError } from '@manaratak/domain';

describe('CsvImportStreamParser', () => {
  const parser = new CsvImportStreamParser();

  describe('supports', () => {
    it('returns true for matching format hints', () => {
      expect(parser.supports({ formatHint: 'csv' })).toBe(true);
      expect(parser.supports({ formatHint: 'CSV' })).toBe(true);
    });

    it('returns true for matching file extensions', () => {
      expect(parser.supports({ fileName: 'data.csv' })).toBe(true);
    });

    it('returns true for matching MIME types', () => {
      expect(parser.supports({ mimeType: 'text/csv' })).toBe(true);
      expect(parser.supports({ mimeType: 'application/csv' })).toBe(true);
    });

    it('returns false for non-matching inputs', () => {
      expect(parser.supports({ formatHint: 'json' })).toBe(false);
      expect(parser.supports({ fileName: 'data.txt' })).toBe(false);
      expect(parser.supports({ mimeType: 'application/json' })).toBe(false);
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

    it('parses 10K CSV rows efficiently', async () => {
      const row = '1,"Test Data",12345\n';
      const rowsPerChunk = 100;
      const chunkCount = 100; // 10K total
      
      const encoder = new TextEncoder();
      const headerBytes = encoder.encode('id,name,value\n');
      const chunkBytes = encoder.encode(row.repeat(rowsPerChunk));
      const chunks = [headerBytes, ...Array(chunkCount).fill(chunkBytes)];
      
      const start = Date.now();
      const { count, errorCount } = await countParsedChunks(chunks);
      const end = Date.now();
      
      expect(count).toBe(10000);
      expect(errorCount).toBe(0);
      expect(end - start).toBeLessThan(2000);
    });

    it('parses 100K CSV rows efficiently', async () => {
      const row = '1,"Test Data",12345\n';
      const rowsPerChunk = 1000;
      const chunkCount = 100; // 100K total
      
      const encoder = new TextEncoder();
      const headerBytes = encoder.encode('id,name,value\n');
      const chunkBytes = encoder.encode(row.repeat(rowsPerChunk));
      const chunks = [headerBytes, ...Array(chunkCount).fill(chunkBytes)];
      
      const start = Date.now();
      const { count, errorCount } = await countParsedChunks(chunks);
      const end = Date.now();
      
      expect(count).toBe(100000);
      expect(errorCount).toBe(0);
      expect(end - start).toBeLessThan(10000);
    });

    it('parses simple CSV', async () => {
      const input = `id,name\n1,A\n2,B\n`;
      const results = await collect(input);

      expect(results.length).toBe(2);
      expect(results[0]).toBeInstanceOf(ParsedImportRow);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'A' });
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: '2', name: 'B' });
    });

    it('parses quoted commas', async () => {
      const input = `id,name\n1,"Smith, John"\n`;
      const results = await collect(input);

      expect(results.length).toBe(1);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'Smith, John' });
    });

    it('parses escaped quotes', async () => {
      const input = `id,name\n1,"O""Connor"\n`;
      const results = await collect(input);

      expect(results.length).toBe(1);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'O"Connor' });
    });

    it('handles CRLF newlines', async () => {
      const input = `id,name\r\n1,A\r\n2,B\r\n`;
      const results = await collect(input);

      expect(results.length).toBe(2);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'A' });
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: '2', name: 'B' });
    });

    it('ignores blank lines', async () => {
      const input = `id,name\n\n1,A\n\n2,B\n`;
      const results = await collect(input);

      expect(results.length).toBe(2);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'A' });
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: '2', name: 'B' });
    });

    it('detects column count mismatch and continues after recoverable row errors', async () => {
      const input = `id,name\n1,A\n2,B,C\n3,D\n`;
      const results = await collect(input);

      expect(results.length).toBe(3);
      expect(results[0]).toBeInstanceOf(ParsedImportRow);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'A' });
      
      expect(results[1]).toBeInstanceOf(ImportParseError);
      expect((results[1] as ImportParseError).code).toBe('CSV_COLUMN_COUNT_MISMATCH');
      expect((results[1] as ImportParseError).recoverable).toBe(true);

      expect(results[2]).toBeInstanceOf(ParsedImportRow);
      expect((results[2] as ParsedImportRow).raw).toEqual({ id: '3', name: 'D' });
    });

    it('detects final unterminated quote', async () => {
      const input = `id,name\n1,"A`;
      const results = await collect(input);

      expect(results.length).toBe(1);
      expect(results[0]).toBeInstanceOf(ImportParseError);
      expect((results[0] as ImportParseError).code).toBe('CSV_UNTERMINATED_QUOTE');
      expect((results[0] as ImportParseError).recoverable).toBe(false);
    });

    it('processes final row without trailing newline', async () => {
      const input = `id,name\n1,A\n2,B`;
      const results = await collect(input);

      expect(results.length).toBe(2);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'A' });
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: '2', name: 'B' });
    });

    it('parses rows split across multiple chunks', async () => {
      const encoder = new TextEncoder();
      const chunks = [
        encoder.encode('id,na'),
        encoder.encode('me\n1,A\n2,"B'),
        encoder.encode('"\n3,C')
      ];
      const results = await collectChunks(chunks);

      expect(results.length).toBe(3);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'A' });
      expect((results[1] as ParsedImportRow).raw).toEqual({ id: '2', name: 'B' });
      expect((results[2] as ParsedImportRow).raw).toEqual({ id: '3', name: 'C' });
    });

    it('verifies Arabic UTF-8 split across chunks is preserved', async () => {
      const encoder = new TextEncoder();
      const part1Str = 'id,text\n1,"';
      const part3Str = '"\n';
      
      const part1 = encoder.encode(part1Str);
      const part3 = encoder.encode(part3Str);
      const arabicBytes = new Uint8Array([0xd9, 0x85, 0xd8, 0xb1, 0xd8, 0xad, 0xd8, 0xa8, 0xd8, 0xa7]); // "مرحبا" in UTF-8

      const arabicPart1 = arabicBytes.slice(0, 5);
      const arabicPart2 = arabicBytes.slice(5);
      
      const chunk1 = new Uint8Array(part1.length + arabicPart1.length);
      chunk1.set(part1);
      chunk1.set(arabicPart1, part1.length);
      
      const chunk2 = new Uint8Array(arabicPart2.length + part3.length);
      chunk2.set(arabicPart2);
      chunk2.set(part3, arabicPart2.length);

      const results = await collectChunks([chunk1, chunk2]);

      expect(results.length).toBe(1);
      expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', text: 'مرحبا' });
    });
    
    it('handles tricky escaped quotes split across chunks', async () => {
       const encoder = new TextEncoder();
       const chunk1 = encoder.encode('id,name\n1,"O');
       const chunk2 = encoder.encode('""');
       const chunk3 = encoder.encode('Connor"\n');
       
       const results = await collectChunks([chunk1, chunk2, chunk3]);
       expect(results.length).toBe(1);
       expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'O"Connor' });
    });

    it('handles tricky CRLF split across chunks', async () => {
       const encoder = new TextEncoder();
       const chunk1 = encoder.encode('id,name\r');
       const chunk2 = encoder.encode('\n1,A\r');
       const chunk3 = encoder.encode('\n');
       
       const results = await collectChunks([chunk1, chunk2, chunk3]);
       expect(results.length).toBe(1);
       expect((results[0] as ParsedImportRow).raw).toEqual({ id: '1', name: 'A' });
    });
  });
});
