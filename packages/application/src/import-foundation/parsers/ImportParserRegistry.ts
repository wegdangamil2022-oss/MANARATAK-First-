import { IImportStreamParser, ImportStreamParserInput } from './IImportStreamParser';

export class ImportParserRegistry {
  private parsers: IImportStreamParser[] = [];

  public register(parser: IImportStreamParser): void {
    // Duplicate format behavior: Reject to ensure deterministic behavior.
    const existing = this.parsers.find(p => p.format === parser.format);
    if (existing) {
      throw new Error(`Parser for format '${parser.format}' is already registered.`);
    }
    this.parsers.push(parser);
  }

  public resolve(input: ImportStreamParserInput): IImportStreamParser | null {
    for (const parser of this.parsers) {
      if (parser.supports(input)) {
        return parser;
      }
    }
    return null;
  }

  public list(): IImportStreamParser[] {
    return [...this.parsers];
  }
}
