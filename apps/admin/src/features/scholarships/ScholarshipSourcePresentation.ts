import type { ScholarshipDto } from '@manaratak/domain';
export interface SourceDegreeGroup {
  id: string;
  title: string;
  items: string[];
}
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
export function scholarshipSourcePresentation(metadata: ScholarshipDto['metadata']) {
  const data = record(metadata?.sourcePresentation);
  const text = (key: string) => (typeof data[key] === 'string' ? (data[key] as string) : '');
  return {
    officialEnglishName: text('officialEnglishName'),
    applicationStatus: text('applicationStatus'),
    deadlineText: text('deadlineText'),
    degreeGroups: (Array.isArray(data.degreeGroups) ? data.degreeGroups : []).flatMap((value) => {
      const group = record(value);
      return typeof group.id === 'string' &&
        typeof group.title === 'string' &&
        Array.isArray(group.items) &&
        group.items.every((item) => typeof item === 'string')
        ? [{ id: group.id, title: group.title, items: group.items as string[] }]
        : [];
    }),
  };
}
export function withScholarshipSourcePresentation(
  metadata: ScholarshipDto['metadata'],
  patch: Partial<ReturnType<typeof scholarshipSourcePresentation>>,
) {
  return { ...metadata, sourcePresentation: { ...record(metadata?.sourcePresentation), ...patch } };
}
