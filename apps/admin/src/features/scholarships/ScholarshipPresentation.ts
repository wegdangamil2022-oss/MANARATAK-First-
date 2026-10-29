import type { ScholarshipBenefitDto, ScholarshipDto } from '@manaratak/domain';

export interface FundingGroup {
  id: string;
  title: string;
  benefitKeys: string[];
}
export interface SourceCard {
  id: string;
  title: string;
  url: string;
  field?: 'applicationUrl' | 'officialWebsite' | 'officialSourceUrl' | 'sourceUrl';
}
export interface SourceGroup {
  id: string;
  title: string;
  links: SourceCard[];
}
export interface ScholarshipPresentation {
  fundingGroups: FundingGroup[];
  sourceGroups: SourceGroup[];
}
export const scholarshipCardKey = (prefix: string) => `${prefix}-${crypto.randomUUID()}`;

export function scholarshipHttpUrl(value: unknown): string | null {
  if (typeof value !== 'string' || !value.trim() || /[\u0000-\u0020\u007f\\]/.test(value))
    return null;
  try {
    const url = new URL(value);
    return ['https:', 'http:'].includes(url.protocol) &&
      !url.username &&
      !url.password &&
      !!url.hostname
      ? url.href
      : null;
  } catch {
    return null;
  }
}

const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
const string = (value: unknown) => (typeof value === 'string' ? value : '');
export function scholarshipPresentation(
  scholarship: Pick<
    ScholarshipDto,
    | 'metadata'
    | 'benefits'
    | 'applicationUrl'
    | 'officialWebsite'
    | 'officialSourceUrl'
    | 'sourceUrl'
  >,
  ar = true,
): ScholarshipPresentation {
  const stored = record(scholarship.metadata?.adminPresentation);
  const seen = new Set<string>();
  const keys = new Set((scholarship.benefits ?? []).map((item) => item.benefitKey));
  const fundingGroups: FundingGroup[] = [];
  for (const value of Array.isArray(stored.fundingGroups) ? stored.fundingGroups : []) {
    const row = record(value);
    if (!string(row.id) || fundingGroups.some((group) => group.id === row.id)) continue;
    const benefitKeys: string[] = [];
    for (const key of Array.isArray(row.benefitKeys) ? row.benefitKeys : []) {
      if (typeof key !== 'string' || !keys.has(key) || seen.has(key)) continue;
      seen.add(key);
      benefitKeys.push(key);
    }
    fundingGroups.push({ id: string(row.id), title: string(row.title), benefitKeys });
  }
  const ungrouped = [...keys].filter((key) => !seen.has(key));
  if (ungrouped.length || !fundingGroups.length) {
    const general = fundingGroups.find((group) => group.id === 'general-benefits');
    if (general) general.benefitKeys.push(...ungrouped);
    else
      fundingGroups.push({
        id: 'general-benefits',
        title: ar ? 'مزايا المنحة' : 'Scholarship benefits',
        benefitKeys: ungrouped,
      });
  }

  const fields: SourceCard['field'][] = [
    'applicationUrl',
    'officialWebsite',
    'officialSourceUrl',
    'sourceUrl',
  ];
  const titles = ar
    ? ['بوابة التقديم', 'الموقع الرسمي', 'الإعلان الرسمي', 'المصدر']
    : ['Application portal', 'Official website', 'Official announcement', 'Source'];
  const defaults = fields.flatMap((field, index) =>
    scholarship[field!]
      ? [{ id: field!, title: titles[index], url: String(scholarship[field!]), field }]
      : [],
  );
  const sourceGroups: SourceGroup[] = Array.isArray(stored.sourceGroups)
    ? stored.sourceGroups.flatMap((value) => {
        const group = record(value);
        if (!string(group.id)) return [];
        return [
          {
            id: string(group.id),
            title: string(group.title),
            links: (Array.isArray(group.links) ? group.links : []).flatMap((value) => {
              const link = record(value);
              if (!string(link.id)) return [];
              const field = fields.includes(link.field as SourceCard['field'])
                ? (link.field as SourceCard['field'])
                : undefined;
              return [
                {
                  id: string(link.id),
                  title: string(link.title),
                  url: field ? String(scholarship[field] ?? '') : string(link.url),
                  ...(field ? { field } : {}),
                },
              ];
            }),
          },
        ];
      })
    : [
        {
          id: 'official-links',
          title: ar ? 'الروابط والمصادر' : 'Links and sources',
          links: defaults,
        },
      ];
  // Canonical URLs changed in another workflow must remain visible.
  for (const link of defaults)
    if (!sourceGroups.some((group) => group.links.some((item) => item.field === link.field))) {
      if (!sourceGroups.length)
        sourceGroups.push({
          id: 'official-links',
          title: ar ? 'الروابط والمصادر' : 'Links and sources',
          links: [],
        });
      sourceGroups[0].links.push(link);
    }
  return { fundingGroups, sourceGroups };
}

export function withScholarshipPresentation(
  metadata: ScholarshipDto['metadata'],
  patch: Partial<ScholarshipPresentation>,
) {
  return { ...metadata, adminPresentation: { ...record(metadata?.adminPresentation), ...patch } };
}

export function moveScholarshipBenefit(
  groups: FundingGroup[],
  benefitKey: string,
  targetId: string,
): FundingGroup[] {
  if (!groups.some((group) => group.id === targetId)) return groups;
  return groups.map((group) => ({
    ...group,
    benefitKeys: [
      ...group.benefitKeys.filter((key) => key !== benefitKey),
      ...(group.id === targetId ? [benefitKey] : []),
    ],
  }));
}

export function benefitText(item: ScholarshipBenefitDto, ar = true): string {
  const names: Record<string, [string, string]> = {
    TUITION: ['الرسوم الدراسية', 'Tuition'],
    TUITION_FEE: ['الرسوم الدراسية', 'Tuition'],
    ACCOMMODATION: ['السكن الدراسي', 'Accommodation'],
    HEALTH_INSURANCE: ['التأمين الطبي', 'Medical insurance'],
    MEDICAL_INSURANCE: ['التأمين الطبي', 'Medical insurance'],
    TRAVEL: ['مساهمة في رحلة السفر', 'Travel contribution'],
    STIPEND: ['بدل المعيشة', 'Living allowance'],
    OTHER: ['ميزة المنحة', 'Scholarship benefit'],
  };
  const value =
    item.valueText?.trim() || names[item.benefitTypeCode]?.[ar ? 0 : 1] || item.benefitTypeCode;
  const currency = record((item as unknown as Record<string, unknown>).currency);
  const amount =
    item.amount == null
      ? ''
      : `${ar ? 'المبلغ' : 'Amount'}: ${item.amount}${currency.isoCode ? ` ${currency.isoCode}` : ''}`;
  return [
    item.isCovered === false ? (ar ? 'غير مشمول' : 'Not covered') : '',
    value,
    amount,
    item.durationText,
    item.notes,
    item.isOptional ? (ar ? 'اختياري' : 'Optional') : '',
  ]
    .filter((part, index, all) => part && all.indexOf(part) === index)
    .join('\n');
}
