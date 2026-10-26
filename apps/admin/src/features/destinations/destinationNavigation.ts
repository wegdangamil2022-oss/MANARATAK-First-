export const destinationGroups = [
  {
    label: ['ملف وجهة الدراسة', 'Study destination'],
    sections: ['overview', 'study', 'visa', 'living'],
  },
  {
    label: ['الفرص الأكاديمية', 'Academic opportunities'],
    sections: ['universities', 'programs', 'scholarships'],
  },
  { label: ['المعلومات المساندة', 'Supporting information'], sections: ['supporting'] },
  { label: ['الحوكمة والنشر', 'Governance and publication'], sections: ['sources', 'publish'] },
] as const;
export type DestinationSection = (typeof destinationGroups)[number]['sections'][number];
export const destinationSections = destinationGroups.flatMap((group) => [...group.sections]);
export function destinationSection(value: string | null): DestinationSection {
  if (value === 'relations' || value === 'locations') return 'supporting';
  return destinationSections.includes(value as DestinationSection)
    ? (value as DestinationSection)
    : 'overview';
}
export function destinationRepairTarget(check: string): {
  section: DestinationSection;
  card: string;
  locale: 'ar' | 'en';
} {
  const locale = /(?:-en|En)$/.test(check) ? 'en' : 'ar';
  if (/source|evidence|official-link|audit|verified|proof/.test(check))
    return { section: 'sources', card: /evidence/.test(check) ? 'evidence' : 'sources', locale };
  if (/visa/.test(check))
    return {
      section: 'visa',
      card: /require/.test(check)
        ? 'visa-requirements'
        : /url/.test(check)
          ? 'visa-link'
          : 'visa-summary',
      locale,
    };
  if (/living|cost|currency/.test(check))
    return {
      section: 'living',
      card: /highlight/.test(check) ? 'cost-details' : 'living-costs',
      locale,
    };
  if (/student-life/.test(check)) return { section: 'living', card: 'student-life', locale };
  if (/admission/.test(check)) return { section: 'study', card: 'admission', locale };
  if (/language/.test(check)) return { section: 'study', card: 'study-languages', locale };
  if (/study-system/.test(check)) return { section: 'study', card: 'study-system', locale };
  if (/city/.test(check)) return { section: 'supporting', card: 'cities', locale };
  return { section: 'overview', card: /image/.test(check) ? 'image' : 'overview', locale };
}
export function destinationListContext(params: URLSearchParams): string {
  const raw = params.get('returnTo');
  return raw && /^\/study-destinations(?:\?|$)/.test(raw) ? raw : '/study-destinations';
}
