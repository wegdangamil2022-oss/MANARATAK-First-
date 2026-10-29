import type { ScholarshipEligibilityItemDto } from '@manaratak/domain';

export interface CriterionPart {
  id: string;
  text: string;
}
export interface CriterionSection {
  id: string;
  kind: 'general' | 'alternatives' | 'exemptions' | 'excluded' | 'delivery';
  prefix: string;
  separator: string;
  parts: CriterionPart[];
}
const sectionPrefixes = [
  ['Accepted alternatives: ', 'alternatives', ' / '],
  ['Exemptions and applicant-specific rules: ', 'exemptions', '\n'],
  ['Excluded: ', 'excluded', ', '],
  ['Score delivery: ', 'delivery', '\n'],
] as const;
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};

/** Split display sentences, never numeric decimals, dates, OR clauses or test scales. */
export function splitCriterionSentences(text: string): string[] {
  return text
    .split(
      /(?<=[.!?؛])\s+(?=\p{L})|\r?\n+|(?<=،)\s+(?=مع\s)|\s+(?=و(?:اهتمام|إنجازات|إجادة)(?:\s|[،.]))/u,
    )
    .map((part) => part.trim())
    .filter(Boolean);
}

export function criterionSectionsText(sections: CriterionSection[]): string {
  return sections
    .map(
      (section) => section.prefix + section.parts.map((part) => part.text).join(section.separator),
    )
    .join('\n');
}

export function scholarshipCriterionSections(
  item: Pick<ScholarshipEligibilityItemDto, 'itemKey' | 'valueText' | 'metadata' | 'operatorCode'>,
): CriterionSection[] {
  const stored = object(item.metadata?.adminCriteria);
  if (stored.version === 1 && Array.isArray(stored.sections)) {
    const sections = stored.sections as CriterionSection[];
    const ids = new Set<string>();
    const valid = sections.every((section) => {
      if (
        !section ||
        typeof section.id !== 'string' ||
        ids.has(section.id) ||
        !Array.isArray(section.parts) ||
        !section.parts.length ||
        !['general', 'alternatives', 'exemptions', 'excluded', 'delivery'].includes(section.kind)
      )
        return false;
      ids.add(section.id);
      const formatValid =
        section.kind === 'general'
          ? section.prefix === '' && section.separator === '\n'
          : sectionPrefixes.some(
              ([prefix, kind, separator]) =>
                section.kind === kind &&
                section.prefix === prefix &&
                section.separator === separator,
            );
      return (
        formatValid &&
        section.parts.every((part) => {
          if (
            !part ||
            typeof part.id !== 'string' ||
            typeof part.text !== 'string' ||
            ids.has(part.id)
          )
            return false;
          ids.add(part.id);
          return true;
        })
      );
    });
    if (valid && criterionSectionsText(sections) === (item.valueText ?? '')) return sections;
  }
  // These prefixes are emitted by the existing conditional-language importer.
  // A language policy stays ONE owner condition with contextual display groups.
  const conditional = item.operatorCode === 'ANY_OF_WITH_EXEMPTIONS';
  return (item.valueText || '')
    .split(/\r?\n/)
    .filter((line) => line.trim())
    .map((line, index) => {
      const format = conditional
        ? sectionPrefixes.find(([prefix]) => line.startsWith(prefix))
        : undefined;
      const [prefix, kind, separator] = format ?? ['', 'general', '\n'];
      const content = line.slice(prefix.length);
      const parts =
        kind === 'alternatives' || kind === 'excluded'
          ? content
              .split(separator)
              .map((text) => text.trim())
              .filter(Boolean)
          : splitCriterionSentences(content);
      return {
        id: `${item.itemKey}-section-${index}`,
        kind,
        prefix,
        separator,
        parts: parts.map((text, part) => ({
          id: `${item.itemKey}-criterion-${index}-${part}`,
          text,
        })),
      };
    })
    .concat(
      item.valueText?.trim()
        ? []
        : [
            {
              id: `${item.itemKey}-section-0`,
              kind: 'general',
              prefix: '',
              separator: '\n',
              parts: [{ id: `${item.itemKey}-criterion-0-0`, text: '' }],
            },
          ],
    );
}

export function withScholarshipCriterionSections<
  T extends { valueText?: string | null; metadata?: Record<string, unknown> | null },
>(item: T, sections: CriterionSection[]): T {
  return {
    ...item,
    valueText: criterionSectionsText(sections),
    metadata: {
      ...item.metadata,
      adminCriteria: { version: 1, sections },
    },
  };
}
