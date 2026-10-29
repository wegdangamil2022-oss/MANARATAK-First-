import type { ScholarshipBenefitDto, ScholarshipDto } from '@manaratak/domain';

export interface FundingTextGroup {
  id: string;
  prefix: string;
  suffix: string;
  separatorAfter?: string;
  cards: Array<{ id: string; text: string; separatorAfter?: string }>;
}
const object = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export const fundingGroupsText = (groups: FundingTextGroup[]) =>
  groups
    .map(
      (group, index) =>
        group.prefix +
        group.cards
          .map(
            (card, cardIndex) =>
              card.text + (card.separatorAfter ?? (cardIndex < group.cards.length - 1 ? ' ' : '')),
          )
          .join('') +
        group.suffix +
        (group.separatorAfter ?? (index < groups.length - 1 ? '\n' : '')),
    )
    .join('');

// Keep the separators so changing one box does not rewrite the surrounding source wording.
function separated(
  text: string,
  delimiter: RegExp,
): Array<{ text: string; separatorAfter: string }> {
  const parts: Array<{ text: string; separatorAfter: string }> = [];
  let start = 0;
  for (const match of text.matchAll(delimiter)) {
    parts.push({ text: text.slice(start, match.index), separatorAfter: match[0] });
    start = match.index! + match[0].length;
  }
  if (start < text.length || !parts.length)
    parts.push({ text: text.slice(start), separatorAfter: '' });
  return parts;
}

/** Display segmentation only: amounts, coverage, conditions and evidence stay on the owner benefit. */
export function fundingTextGroups(
  item: ScholarshipBenefitDto,
  field: 'valueText' | 'durationText' = 'valueText',
): FundingTextGroup[] {
  const stored = object(item.metadata?.adminFundingCards);
  const storedGroups = field === 'valueText' ? stored.groups : stored.durationGroups;
  if (stored.version === 1 && Array.isArray(storedGroups)) {
    const groups = storedGroups as FundingTextGroup[];
    const ids = new Set<string>();
    if (
      groups.length &&
      groups.every((group) => {
        if (
          !group ||
          typeof group.id !== 'string' ||
          ids.has(group.id) ||
          typeof group.prefix !== 'string' ||
          typeof group.suffix !== 'string' ||
          (group.separatorAfter != null && typeof group.separatorAfter !== 'string') ||
          !Array.isArray(group.cards) ||
          !group.cards.length
        )
          return false;
        ids.add(group.id);
        return group.cards.every((card) => {
          if (
            !card ||
            typeof card.id !== 'string' ||
            typeof card.text !== 'string' ||
            (card.separatorAfter != null && typeof card.separatorAfter !== 'string') ||
            ids.has(card.id)
          )
            return false;
          ids.add(card.id);
          return true;
        });
      }) &&
      fundingGroupsText(groups) === (item[field] ?? '')
    )
      return groups;
  }
  const paragraphs = separated(
    item[field] ?? '',
    field === 'durationText'
      ? /؛\s*|\r?\n+|(?<=[.!؟])\s+(?=\p{L})/gu
      : /\r?\n+|(?<=[.!؟])\s+(?=\p{L})/gu,
  );
  const key = field === 'valueText' ? item.benefitKey : `${item.benefitKey}-duration`;
  return paragraphs.map(({ text, separatorAfter }, index) => {
    // Keep the complete second-year condition before the list it qualifies.
    const conditional = /^(.*?،\s*ويشمل\s+)(.+?)([.!؟]?)$/u.exec(text);
    const initial = /^(يشمل\s+(?:تمويل|دعم|منحة)\s+(?:السنة|العام)\s+\S+\s+)(.+?)([.!؟]?)$/u.exec(
      text,
    );
    const match = conditional ?? initial;
    const prefix = match?.[1] ?? '';
    const body = match?.[2] ?? text;
    const suffix = match?.[3] ?? '';
    // Split listed benefit heads, never "ذهاب وعودة" or a condition's AND/OR clauses.
    const parts =
      match || !/(?:مشروط|يتطلب|يشترط|إذا|شريطة|ليس تلقائي)/u.test(body)
        ? separated(
            body,
            /،\s*|\s+(?=و(?:السكن|التأمين|التامين|مخصصًا|مخصص|المخصص|تكاليف|مساهمة|الرسوم|دعم|بدل|البدل|راتب|الراتب|تذكرة|الإقامة|الاقامة)(?:\s|[،.!؟]|$))/gu,
          )
        : [{ text: body, separatorAfter: '' }];
    return {
      id: `${key}-group-${index}`,
      prefix,
      suffix,
      separatorAfter,
      cards: parts.map((part, card) => ({
        id: `${key}-card-${index}-${card}`,
        ...part,
      })),
    };
  });
}

export function withFundingTextGroups(
  item: ScholarshipBenefitDto,
  groups: FundingTextGroup[],
  field: 'valueText' | 'durationText' = 'valueText',
): ScholarshipBenefitDto {
  return {
    ...item,
    [field]: fundingGroupsText(groups),
    metadata: {
      ...item.metadata,
      adminFundingCards: {
        ...object(item.metadata?.adminFundingCards),
        version: 1,
        [field === 'valueText' ? 'groups' : 'durationGroups']: groups,
      },
    },
  };
}
export function fundingGroupTitle(group: FundingTextGroup, ar: boolean): string {
  return (
    /(?:تمويل|دعم|منحة)\s+(?:السنة|العام)\s+\S+/u.exec(group.prefix)?.[0] ??
    (ar ? 'مزايا التمويل' : 'Funding benefits')
  );
}
export function fundingGroupContext(group: FundingTextGroup): string {
  return group.prefix.includes('،') ? group.prefix.replace(/،\s*ويشمل\s*$/u, '').trim() : '';
}
export function fundingCardText(value: string): string {
  return value.replace(
    /^و(?=(?:السكن|التأمين|التامين|مخصصًا|مخصص|المخصص|تكاليف|مساهمة|الرسوم|دعم|بدل|البدل|راتب|الراتب|تذكرة|الإقامة|الاقامة)(?:\s|$))/u,
    '',
  );
}
export function originalFundingText(metadata: ScholarshipDto['metadata']): string | null {
  const sections = object(metadata?.rawSourceSections);
  return Object.prototype.hasOwnProperty.call(sections, 'المميزات والتمويل')
    ? typeof sections['المميزات والتمويل'] === 'string'
      ? (sections['المميزات والتمويل'] as string)
      : ''
    : null;
}
