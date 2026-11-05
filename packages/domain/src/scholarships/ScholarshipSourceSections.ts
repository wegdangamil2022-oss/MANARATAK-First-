/** Source headings may change numbering or wording; never borrow text from another section. */
export const scholarshipSourceSectionAliases: Record<string, readonly string[]> = {
  'التمويل والمزايا': ['التمويل والمزايا', 'المميزات والتمويل'],
  'الجامعات المشاركة': ['الجامعات المشاركة', 'الجامعات المتاحة'],
  'التخصصات المتاحة': ['التخصصات المتاحة', 'الدرجات التعليمية والتخصصات المتاحة'],
  'الشروط ومعايير التقديم': ['الشروط ومعايير التقديم', 'شروط الأهلية ومعايير التقديم'],
  'ملاحظات مهمة': ['ملاحظات مهمة', 'الملاحظات المهمة'],
  'رابط التقديم': ['رابط التقديم', 'روابط التقديم'],
};

export function scholarshipSourceSectionLabel(label: string): string {
  const name = label.replace(/^\d+\.\s*/, '').trim();
  return (
    Object.entries(scholarshipSourceSectionAliases).find(([, aliases]) =>
      aliases.includes(name),
    )?.[0] ?? name
  );
}

export function scholarshipSourceSection(sections: unknown, label: string): string | null {
  if (!sections || typeof sections !== 'object' || Array.isArray(sections)) return null;
  const matches = Object.entries(sections).filter(
    ([key]) => scholarshipSourceSectionLabel(key) === scholarshipSourceSectionLabel(label),
  );
  if (matches.length > 1) throw new Error(`SCHOLARSHIP_SOURCE_AMBIGUOUS_SECTION:${label}`);
  return matches.length ? (typeof matches[0][1] === 'string' ? matches[0][1] : '') : null;
}
