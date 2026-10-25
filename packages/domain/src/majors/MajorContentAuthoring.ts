/** Authoring slots preserve the approved source templates; these are not publication coverage keys. */
export const FELLOWSHIP_MAIN_SECTIONS = [
  {
    number: 1,
    title: 'معلومات الزمالة الأساسية',
  },
  {
    number: 2,
    title: 'طبيعة الزمالة وهدفها',
  },
  {
    number: 3,
    title: 'نوع الزمالة',
  },
  {
    number: 4,
    title: 'الفئة المستهدفة',
  },
  {
    number: 5,
    title: 'المؤهلات السابقة العامة',
  },
  {
    number: 6,
    title: 'المدة ونمط التدريب',
  },
  {
    number: 7,
    title: 'مكونات التدريب',
  },
  {
    number: 8,
    title: 'الكفاءات المستهدفة',
  },
  {
    number: 9,
    title: 'المسارات والتخصصات الدقيقة',
  },
  {
    number: 10,
    title: 'الإشراف وبيئة التدريب',
  },
  {
    number: 11,
    title: 'التقييم ومتطلبات الإكمال',
  },
  {
    number: 12,
    title: 'الشهادة أو الصفة الناتجة',
  },
  {
    number: 13,
    title: 'نطاق الممارسة والترخيص',
  },
  {
    number: 14,
    title: 'مجالات العمل بعد الزمالة',
  },
  {
    number: 15,
    title: 'العلاقة بالإقامة والبورد والدكتوراه',
  },
  {
    number: 16,
    title: 'الزمالات المشابهة والفروق',
  },
  {
    number: 17,
    title: 'التنبيه المهني والتنظيمي',
  },
  {
    number: 18,
    title: 'المصادر والتحقق',
  },
] as const;
const SOURCE_TO_GROUP: Record<string, readonly number[]> = {
  BACHELOR: [1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 8, 8, 9, 10],
  MASTER: [1, 2, 3, 4, 4, 4, 4, 5, 6, 6, 6, 6, 6, 7, 8, 9, 10, 11, 12, 12, 12, 13, 14, 15, 16],
  DOCTORATE: [
    1, 2, 3, 4, 4, 4, 4, 4, 5, 5, 6, 6, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19,
  ],
  FELLOWSHIP: Array.from({ length: 18 }, (_, i) => i + 1),
};
export interface MajorContentSectionEdit {
  id?: string;
  sectionKey: string;
  locale?: string;
  title?: string;
  content: string;
  reviewStatus?: string;
  /** An explicit human mapping. Original key and source evidence remain intact. */
  groupNumber?: number;
  sourceUri?: string;
}
export function majorContentSlots(level: string, group: number): string[] {
  return (SOURCE_TO_GROUP[level] ?? []).flatMap((g, i) =>
    g === group ? [String(i + 1).padStart(2, '0') + '-manual'] : [],
  );
}
export function assertMajorContentGroup(level: string, group: number): void {
  if (!Number.isInteger(group) || !(SOURCE_TO_GROUP[level] ?? []).includes(group))
    throw Error('MAJOR_CONTENT_GROUP_INVALID');
}
export function selectMajorWorkingVersion<
  T extends { id?: string; versionNumber?: number; status?: string; publishedAt?: unknown },
>(versions: readonly T[]): T | undefined {
  const latest = [...versions].sort((a, b) => (b.versionNumber ?? 0) - (a.versionNumber ?? 0))[0];
  return latest &&
    !latest.publishedAt &&
    !['PUBLISHED', 'SUPERSEDED', 'ARCHIVED', 'REJECTED'].includes(latest.status ?? '')
    ? latest
    : undefined;
}
