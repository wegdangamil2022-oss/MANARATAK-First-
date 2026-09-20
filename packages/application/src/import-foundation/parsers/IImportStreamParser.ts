import { ParsedImportRow } from '@manaratak/domain';
import { ImportParseError } from '@manaratak/domain';

export interface ImportStreamParserInput {
  fileName?: string;
  mimeType?: string;
  formatHint?: string;
}

export interface ImportStreamParserContext {
  batchId: string;
  chunkSize?: number;
}

export interface IImportStreamParser {
  readonly format: string;
  
  supports(input: ImportStreamParserInput): boolean;
  
  parse(
    input: AsyncIterable<Uint8Array> | NodeJS.ReadableStream,
    context: ImportStreamParserContext
  ): AsyncIterable<ParsedImportRow | ImportParseError>;
}
