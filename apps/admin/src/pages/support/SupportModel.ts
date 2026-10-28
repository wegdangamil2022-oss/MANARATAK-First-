export interface SupportTicket {
  id: string;
  publicId: string;
  studentId: string;
  title: string;
  category: string;
  status: string;
  priority: string;
  teamId: string | null;
  assigneeId: string | null;
  version: number;
  updatedAt: string;
  firstPublicReplyAt: string | null;
  firstReplyDueAt: string | null;
  resolutionDueAt: string | null;
  slaPausedAt: string | null;
  slaBreached: boolean;
  slaSnapshot: unknown;
}
export interface SupportMessageDto {
  id: string;
  body: string;
  visibility: 'PUBLIC' | 'INTERNAL';
  authorKind: 'STUDENT' | 'AGENT';
  createdAt: string;
}
export interface SupportPage<T> {
  items: T[];
  nextCursor: string | null;
  hasMore?: boolean;
}
export const supportStates = [
  'NEW',
  'OPEN',
  'WAITING_ON_STUDENT',
  'WAITING_ON_OWNER',
  'RESOLVED',
  'CLOSED',
  'REOPENED',
  'CANCELLED',
];
const labels: Record<string, string> = {
  NEW: 'جديدة',
  OPEN: 'مفتوحة',
  WAITING_ON_STUDENT: 'بانتظار الطالب',
  WAITING_ON_OWNER: 'بانتظار القسم المختص',
  RESOLVED: 'محلولة',
  CLOSED: 'مغلقة',
  REOPENED: 'معاد فتحها',
  CANCELLED: 'ملغاة',
  LOW: 'منخفضة',
  NORMAL: 'عادية',
  HIGH: 'مرتفعة',
  URGENT: 'عاجلة',
  ACCOUNT: 'الحساب',
  SCHOLARSHIPS: 'المنح',
  UNIVERSITIES: 'الجامعات',
  APPLICATIONS: 'التقديم',
  COURSES: 'الدورات',
  CERTIFICATES: 'الشهادات',
  SERVICES: 'الخدمات',
  FILES: 'الملفات',
  TECHNICAL: 'مشكلة تقنية',
  OTHER: 'أخرى',
};
export const supportLabel = (key: string, language: string) =>
  language === 'ar' ? (labels[key] ?? key) : key.toLowerCase().replaceAll('_', ' ');
export const supportError = (error: unknown, language: string) => {
  const code = error instanceof Error ? error.message : '';
  if (code.includes('NOT_READY'))
    return language === 'ar'
      ? 'تخزين تذاكر الدعم غير جاهز في هذه القاعدة. لم تُطبّق جداول الدعم عليها.'
      : 'Support case storage is not ready in this database.';
  if (code.includes('CONFLICT'))
    return language === 'ar'
      ? 'تغيرت التذكرة أو اختلفت إعادة المحاولة. حُفظ النص في المحرر؛ حدّث التفاصيل وراجعها قبل إعادة الإرسال.'
      : 'The case changed or the retry differs. Your draft is preserved; refresh and review before sending.';
  if (code.includes('FOLLOWUP_REQUIRED'))
    return language === 'ar'
      ? 'انتهت فترة إعادة الفتح. احتفظ بالنص وأنشئ طلب متابعة جديدًا من صندوق الدعم.'
      : 'The reopen window expired. Keep your draft and create a new follow-up case.';
  return language === 'ar'
    ? 'تعذر إتمام العملية. حُفظ النص في المحرر؛ تحقق من الاتصال والصلاحية ثم حدّث التفاصيل.'
    : 'The operation failed. Your draft remains; check connectivity and access, then refresh.';
};
