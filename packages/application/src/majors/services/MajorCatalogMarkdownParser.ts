import { ImportTargetDomain } from '@manaratak/domain';

export type MajorCatalogKind = 'BACHELOR' | 'MASTER' | 'DOCTORATE' | 'FELLOWSHIP';

export interface MajorCatalogRow {
  code: string;
  catalogKind: MajorCatalogKind;
  targetDomain: ImportTargetDomain;
  canonicalMajorName: string;
  localizedNames: {
    ar?: string;
    en?: string;
  };
  degreeLevel?: 'Bachelor' | 'Master' | 'Doctorate';
  sourceClassificationSystem: 'MANARATAK_PHASE_10_CATALOG';
  classificationCode: string;
  academicFieldOrDiscipline?: string;
  collegeOrFaculty?: string;
  fellowshipType?: string;
  professionalDomain?: string;
  sourceSectionPath?: string;
  metadata: Record<string, unknown>;
}

export interface MajorCatalogParseResult {
  catalogKind: MajorCatalogKind;
  targetDomain: ImportTargetDomain;
  rows: MajorCatalogRow[];
  skippedRows: number;
}

const CODE_KIND: Record<string, MajorCatalogKind> = {
  MJR: 'BACHELOR',
  MAS: 'MASTER',
  DOC: 'DOCTORATE',
  FEL: 'FELLOWSHIP',
};

const DEGREE_BY_KIND: Partial<Record<MajorCatalogKind, 'Bachelor' | 'Master' | 'Doctorate'>> = {
  BACHELOR: 'Bachelor',
  MASTER: 'Master',
  DOCTORATE: 'Doctorate',
};

export class MajorCatalogMarkdownParser {
  public static parse(markdown: string, expectedKind?: MajorCatalogKind): MajorCatalogParseResult {
    const rows: MajorCatalogRow[] = [];
    let skippedRows = 0;
    let currentHeading = '';
    let detectedKind: MajorCatalogKind | undefined = expectedKind;
    let catalogTableActive = false;

    const lines = markdown.split(/\r?\n/);
    for (const line of lines) {
      const heading = this.extractHeading(line);
      if (heading) {
        currentHeading = heading;
        if (this.isCatalogStartHeading(heading)) {
          catalogTableActive = true;
        } else if (this.isCatalogStopHeading(heading)) {
          catalogTableActive = false;
        }
        continue;
      }

      const columns = this.parseTableColumns(line);
      if (columns.length < 3) {
        continue;
      }

      const code = columns[0];
      const prefix = code.slice(0, 3);
      const catalogKind = CODE_KIND[prefix];
      if (!catalogKind || (expectedKind && catalogKind !== expectedKind)) {
        skippedRows++;
        continue;
      }
      if (!catalogTableActive && catalogKind !== 'FELLOWSHIP') {
        skippedRows++;
        continue;
      }

      detectedKind = detectedKind ?? catalogKind;
      const arabicName = columns[1];
      const englishName = columns[2];
      const canonicalMajorName = englishName || arabicName;
      if (!canonicalMajorName) {
        skippedRows++;
        continue;
      }

      rows.push({
        code,
        catalogKind,
        targetDomain: catalogKind === 'FELLOWSHIP' ? ImportTargetDomain.Fellowships : ImportTargetDomain.Majors,
        canonicalMajorName,
        localizedNames: {
          ar: arabicName || undefined,
          en: englishName || undefined,
        },
        degreeLevel: DEGREE_BY_KIND[catalogKind],
        sourceClassificationSystem: 'MANARATAK_PHASE_10_CATALOG',
        classificationCode: code,
        academicFieldOrDiscipline: this.extractAcademicField(currentHeading),
        collegeOrFaculty: catalogKind === 'BACHELOR' ? this.extractCollegeContext(currentHeading) : undefined,
        fellowshipType: catalogKind === 'FELLOWSHIP' ? columns[3] : undefined,
        professionalDomain: catalogKind === 'FELLOWSHIP' ? columns[4] : undefined,
        sourceSectionPath: currentHeading || undefined,
        metadata: {
          catalogKind,
          sourceColumns: columns,
          reviewStatus: 'NEEDS_REVIEW',
          importMode: 'CATALOG_IDENTITY_ONLY',
        },
      });
    }

    return {
      catalogKind: detectedKind ?? expectedKind ?? 'BACHELOR',
      targetDomain: detectedKind === 'FELLOWSHIP' ? ImportTargetDomain.Fellowships : ImportTargetDomain.Majors,
      rows,
      skippedRows,
    };
  }

  private static extractHeading(line: string): string {
    const match = line.match(/^#{1,6}\s+(.+?)\s*$/);
    return match ? match[1].trim() : '';
  }

  private static isCatalogStartHeading(heading: string): boolean {
    return heading.includes('القائمة الكاملة')
      || heading.includes('قائمة الزمالات')
      || heading.includes('Complete Catalog')
      || heading.includes('Full Catalog')
      || heading.includes('Fellowship Catalog');
  }

  private static isCatalogStopHeading(heading: string): boolean {
    return heading.includes('التخصصات المشتركة')
      || heading.includes('المسميات المستبعدة')
      || heading.includes('نموذج الاستيراد')
      || heading.includes('قاعدة منع التكرار')
      || heading.includes('قرار الاستخدام')
      || heading.includes('Cross-listed')
      || heading.includes('Excluded')
      || heading.includes('Import Model')
      || heading.includes('Deduplication')
      || heading.includes('Usage Decision');
  }

  private static parseTableColumns(line: string): string[] {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) {
      return [];
    }

    const columns = trimmed
      .slice(1, -1)
      .split('|')
      .map((column) => column.trim());

    if (columns.some((column) => /^:?-{3,}:?$/.test(column))) {
      return [];
    }

    if (!/^(MJR|MAS|DOC|FEL)-\d{4}$/.test(columns[0])) {
      return [];
    }

    return columns;
  }

  private static extractAcademicField(heading: string): string | undefined {
    if (!heading) {
      return undefined;
    }
    return heading.replace(/^\d+(?:\.\d+)*[\).:-]?\s*/, '').trim() || undefined;
  }

  private static extractCollegeContext(heading: string): string | undefined {
    const academicField = this.extractAcademicField(heading);
    if (!academicField || !academicField.includes('كلية')) {
      return undefined;
    }
    return academicField;
  }
}
