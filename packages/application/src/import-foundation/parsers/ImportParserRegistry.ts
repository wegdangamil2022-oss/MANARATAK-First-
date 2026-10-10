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
    // An explicit format is authoritative. Conflicting file/MIME metadata
    // must not silently pick the first registered parser.
    const hint = input.formatHint?.toLowerCase();
    const matches = this.parsers.filter(parser => hint
      ? parser.supports({ formatHint: hint }) : parser.supports(input));
    if (matches.length > 1) throw new Error('IMPORT_FORMAT_AMBIGUOUS');
    return matches[0] ?? null;
  }

  public list(): IImportStreamParser[] {
    return [...this.parsers];
  }
}
