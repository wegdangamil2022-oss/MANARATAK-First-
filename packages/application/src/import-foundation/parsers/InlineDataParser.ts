import { CsvImportStreamParser } from './CsvImportStreamParser';
import { ParsedImportRow, ImportParseError } from '@manaratak/domain';

export class InlineDataParser {
  public static async parse(dataText: string): Promise<any[]> {
    const text = dataText.trim();
    let rawRows: any[] = [];

    if (text.startsWith('[') || text.startsWith('{')) {
      try {
        const parsed = JSON.parse(text);
        rawRows = Array.isArray(parsed) ? parsed : [parsed];
      } catch (jsonError: any) {
        // NDJSON/JSONL is a useful administrative interchange format. Only accept it
        // when every non-empty line is valid JSON; otherwise preserve a clear parse error.
        const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
        if (lines.length <= 1) {
          throw new Error(`Invalid JSON format: ${jsonError.message}`);
        }
        try {
          rawRows = lines.map((line, index) => {
            const parsedLine = JSON.parse(line);
            if (parsedLine === null || typeof parsedLine !== 'object' || Array.isArray(parsedLine)) {
              throw new Error(`line ${index + 1} must contain a JSON object`);
            }
            return parsedLine;
          });
        } catch (ndjsonError: any) {
          throw new Error(`Invalid JSON/NDJSON format: ${ndjsonError.message}`);
        }
      }
    } else {
      // Use existing CsvImportStreamParser
      const parser = new CsvImportStreamParser();
      const encoder = new TextEncoder();
      const iterable = {
        [Symbol.asyncIterator]: async function* () {
          yield encoder.encode(text);
        }
      };

      for await (const result of parser.parse(iterable, { batchId: 'inline' })) {
        if (result instanceof ImportParseError) {
           throw new Error(`CSV Parse Error: ${result.message}`);
        }
        if (result instanceof ParsedImportRow) {
           // Emulate the old behavior that included _sourceRowNumber on the object
           rawRows.push({
             ...result.raw,
             _sourceRowNumber: result.sourceRowNumber - 1, // original had 1 for row 1 (excluding header)
           });
        }
      }
    }

    return rawRows;
  }
}
