import { describe, it, expect, vi } from 'vitest';
import { ImportParserRegistry } from '../../src/import-foundation/parsers/ImportParserRegistry';
import { IImportStreamParser, ImportStreamParserInput, ImportStreamParserContext } from '../../src/import-foundation/parsers/IImportStreamParser';
import { ParsedImportRow, ImportParseError } from '@manaratak/domain';

class MockParser implements IImportStreamParser {
  constructor(
    public readonly format: string,
    private readonly supportPredicate: (input: ImportStreamParserInput) => boolean
  ) {}

  supports(input: ImportStreamParserInput): boolean {
    return this.supportPredicate(input);
  }

  async *parse(
    input: AsyncIterable<Uint8Array> | NodeJS.ReadableStream,
    context: ImportStreamParserContext
  ): AsyncIterable<ParsedImportRow | ImportParseError> {
    yield new ParsedImportRow({
      sourceRowNumber: 1,
      raw: { test: 'value' },
    });
  }
}

describe('ImportParserRegistry', () => {
  it('registers and resolves parser by support predicate', () => {
    const registry = new ImportParserRegistry();
    
    const csvParser = new MockParser('csv', input => input.mimeType === 'text/csv');
    const jsonParser = new MockParser('json', input => input.formatHint === 'json');

    registry.register(csvParser);
    registry.register(jsonParser);

    const resolvedCsv = registry.resolve({ mimeType: 'text/csv' });
    expect(resolvedCsv).toBe(csvParser);

    const resolvedJson = registry.resolve({ formatHint: 'json' });
    expect(resolvedJson).toBe(jsonParser);
  });

  it('returns null for unsupported input', () => {
    const registry = new ImportParserRegistry();
    const csvParser = new MockParser('csv', input => input.mimeType === 'text/csv');
    registry.register(csvParser);

    const resolved = registry.resolve({ mimeType: 'application/xml' });
    expect(resolved).toBeNull();
  });

  it('list returns all registered parsers', () => {
    const registry = new ImportParserRegistry();
    const csvParser = new MockParser('csv', () => true);
    const jsonParser = new MockParser('json', () => false);

    registry.register(csvParser);
    registry.register(jsonParser);

    const list = registry.list();
    expect(list.length).toBe(2);
    expect(list).toContain(csvParser);
    expect(list).toContain(jsonParser);
  });

  it('rejects duplicate format registration', () => {
    const registry = new ImportParserRegistry();
    const parser1 = new MockParser('csv', () => true);
    const parser2 = new MockParser('csv', () => false);

    registry.register(parser1);
    expect(() => registry.register(parser2)).toThrow(/is already registered/);
  });
});
