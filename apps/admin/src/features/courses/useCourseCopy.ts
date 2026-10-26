import { useTranslation } from '../../i18n/I18nProvider';
import { useMemo } from 'react';

export const courseStatusLabels: Record<string, [string, string]> = {
  DRAFT: ['مسودة', 'Draft'], IMPORTED: ['مستوردة', 'Imported'], INCOMPLETE: ['غير مكتملة', 'Incomplete'],
  READY_TO_REVIEW: ['بانتظار المراجعة', 'Awaiting review'], READY_TO_PUBLISH: ['جاهزة للنشر', 'Ready to publish'],
  PUBLISHED: ['منشورة', 'Published'], REJECTED: ['مرفوضة', 'Rejected'], ARCHIVED: ['مؤرشفة', 'Archived'],
};
export const studyLabels = { FREE: ['دراسة مجانية', 'Free study'], PAID: ['دراسة مدفوعة', 'Paid study'], UNKNOWN: ['تكلفة الدراسة غير محسومة', 'Study cost unknown'] } as const;
export const certificateLabels = { FREE: ['شهادة مجانية', 'Free certificate'], NON_FREE: ['شهادة متاحة غير مجانية', 'Certificate available, not free'], UNAVAILABLE: ['لا شهادة', 'No certificate'], UNKNOWN: ['حالة الشهادة غير معروفة', 'Certificate status unknown'] } as const;
export function useCourseCopy() {
  const { language } = useTranslation();
  const ar = language === 'ar';
  return useMemo(() => ({ ar, tr: (arabic: string, english: string) => ar ? arabic : english,
    status: (value: string) => courseStatusLabels[value]?.[ar ? 0 : 1] ?? (ar ? 'حالة غير معروفة' : 'Unknown status'),
    number: (value: number) => value.toLocaleString(ar ? 'ar' : 'en'),
    date: (value?: string) => value && Number.isFinite(Date.parse(value)) ? new Date(value).toLocaleDateString(ar ? 'ar' : 'en') : (ar ? 'غير متوفر' : 'Unavailable'),
  }), [ar]);
}
