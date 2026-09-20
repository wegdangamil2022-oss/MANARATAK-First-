import { ImportTargetDomain } from '@manaratak/domain';
import { MajorCatalogKind } from './MajorCatalogMarkdownParser';

export interface MajorDetailContentBlock {
  blockKey: string;
  title: string;
  level: number;
  content: string;
  sourceSectionPath: string;
  reviewStatus: 'NEEDS_REVIEW';
}

export interface MajorDetailDossierRow {
  code: string;
  catalogKind: MajorCatalogKind;
  targetDomain: ImportTargetDomain;
  canonicalMajorName: string;
  localizedNames: {
    ar?: string;
    en?: string;
  };
  degreeLevel?: 'Bachelor' | 'Master' | 'Doctorate';
  sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER';
  classificationCode: string;
  sourceImportMode: 'DETAIL_DOSSIER';
  contentBlocks: MajorDetailContentBlock[];
  metadata: Record<string, unknown>;
}

export interface MajorDetailDossierParseResult {
  catalogKind: MajorCatalogKind;
  targetDomain: ImportTargetDomain;
  rows: MajorDetailDossierRow[];
  skippedSections: number;
}

const DEGREE_BY_KIND: Partial<Record<MajorCatalogKind, 'Bachelor' | 'Master' | 'Doctorate'>> = {
  BACHELOR: 'Bachelor',
  MASTER: 'Master',
  DOCTORATE: 'Doctorate',
};

const KIND_BY_PREFIX: Record<string, MajorCatalogKind> = {
  MJR: 'BACHELOR',
  MAS: 'MASTER',
  DOC: 'DOCTORATE',
  FEL: 'FELLOWSHIP',
};

export class MajorDetailDossierMarkdownParser {
  public static parse(markdown: string, expectedKind?: MajorCatalogKind): MajorDetailDossierParseResult {
    const rows: MajorDetailDossierRow[] = [];
    let skippedSections = 0;
    let currentRecord: ParsedRecord | undefined;

    for (const line of markdown.split(/\r?\n/)) {
      const recordTitle = this.extractRecordTitle(line);
      if (recordTitle) {
        if (currentRecord) {
          const row = this.toRow(currentRecord, expectedKind);
          if (row) rows.push(row);
          else skippedSections++;
        }
        currentRecord = { title: recordTitle, lines: [], sections: [] };
        continue;
      }

      if (!currentRecord) {
        continue;
      }

      currentRecord.lines.push(line);
      const heading = this.extractSectionHeading(line);
      if (heading) {
        currentRecord.sections.push({ title: heading.title, level: heading.level, lines: [] });
        continue;
      }

      const activeSection = currentRecord.sections[currentRecord.sections.length - 1];
      if (activeSection) {
        activeSection.lines.push(line);
      }
    }

    if (currentRecord) {
      const row = this.toRow(currentRecord, expectedKind);
      if (row) rows.push(row);
      else skippedSections++;
    }

    const catalogKind = rows[0]?.catalogKind ?? expectedKind ?? 'BACHELOR';
    return {
      catalogKind,
      targetDomain: catalogKind === 'FELLOWSHIP' ? ImportTargetDomain.Fellowships : ImportTargetDomain.Majors,
      rows,
      skippedSections,
    };
  }

  private static extractRecordTitle(line: string): string | undefined {
    const match = line.match(/^#\s+\d+\.\s+(.+?)\s*$/);
    return match ? match[1].trim() : undefined;
  }

  private static extractSectionHeading(line: string): { level: number; title: string } | undefined {
    const match = line.match(/^(#{2,4})\s+(.+?)\s*$/);
    if (!match) return undefined;
    return {
      level: match[1].length,
      title: match[2].replace(/^\d+(?:\.\d+)*[\).:-]?\s*/, '').trim(),
    };
  }

  private static toRow(record: ParsedRecord, expectedKind?: MajorCatalogKind): MajorDetailDossierRow | undefined {
    const allText = record.lines.join('\n');
    const code = this.extractCode(allText);
    if (!code) return undefined;

    const catalogKind = KIND_BY_PREFIX[code.slice(0, 3)];
    if (!catalogKind || (expectedKind && catalogKind !== expectedKind)) return undefined;

    const names = this.extractNames(record.title);
    const canonicalMajorName = names.en || names.ar;
    if (!canonicalMajorName) return undefined;

    return {
      code,
      catalogKind,
      targetDomain: catalogKind === 'FELLOWSHIP' ? ImportTargetDomain.Fellowships : ImportTargetDomain.Majors,
      canonicalMajorName,
      localizedNames: names,
      degreeLevel: DEGREE_BY_KIND[catalogKind],
      sourceClassificationSystem: 'MANARATAK_PHASE_10_DETAIL_DOSSIER',
      classificationCode: code,
      sourceImportMode: 'DETAIL_DOSSIER',
      contentBlocks: record.sections
        .map((section, index) => this.toContentBlock(section, index))
        .filter((section): section is MajorDetailContentBlock => Boolean(section)),
      metadata: {
        catalogKind,
        detailStatus: 'DRAFT_NEEDS_REVIEW',
        sourceTitle: record.title,
      },
    };
  }

  private static extractCode(text: string): string | undefined {
    return text.match(/\b(MJR|MAS|DOC|FEL)-\d{4}\b/)?.[0];
  }

  private static extractNames(title: string): { ar?: string; en?: string } {
    const [ar, en] = title.split(/\s+—\s+/);
    return {
      ar: ar?.trim() || undefined,
      en: en?.trim() || undefined,
    };
  }

  private static toContentBlock(section: ParsedSection, index: number): MajorDetailContentBlock | undefined {
    const content = section.lines.join('\n').trim();
    if (!content) return undefined;

    return {
      blockKey: `${String(index + 1).padStart(2, '0')}-${this.slugify(section.title)}`,
      title: section.title,
      level: section.level,
      content,
      sourceSectionPath: section.title,
      reviewStatus: 'NEEDS_REVIEW',
    };
  }

  private static slugify(value: string): string {
    return value
      .trim()
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
      .replace(/(^-|-$)+/g, '') || 'section';
  }
}

interface ParsedRecord {
  title: string;
  lines: string[];
  sections: ParsedSection[];
}

interface ParsedSection {
  title: string;
  level: number;
  lines: string[];
}
