import type {
  StudentApplicationTrackerDto,
  StudentDashboardSummaryDto,
  StudentFinanceInvoiceDto,
  StudentNotificationProjectionDto,
} from '../../api/client';

export type NotificationFilterMode = 'ALL' | 'UNREAD' | 'READ';

export function isNotificationRead(
  item: Pick<StudentNotificationProjectionDto, 'id' | 'readAt'>,
  readIds: ReadonlySet<string>,
): boolean {
  return Boolean(item.readAt) || readIds.has(item.id);
}

export function filterStudentNotifications<
  T extends Pick<StudentNotificationProjectionDto, 'id' | 'readAt'>,
>(items: readonly T[], mode: NotificationFilterMode, readIds: ReadonlySet<string>): T[] {
  if (mode === 'UNREAD') {
    return items.filter((item) => !isNotificationRead(item, readIds));
  }
  if (mode === 'READ') {
    return items.filter((item) => isNotificationRead(item, readIds));
  }
  return [...items];
}

export interface NextPriorityStep {
  id: string;
  title: string;
  subtitle: string;
  reason: string;
  dateLabel: string;
  ctaLabel: string;
  targetTab: 'OPPORTUNITIES' | 'LEARNING' | 'SERVICES' | 'PROFILE';
}

export function computeNextPriorityStep(params: {
  trackers?: readonly StudentApplicationTrackerDto[];
  invoices?: readonly StudentFinanceInvoiceDto[];
  courses?: StudentDashboardSummaryDto['courseEnrollments'];
}): NextPriorityStep {
  const activeTrackers = (params.trackers ?? []).filter((t) => t.status === 'ACTIVE');

  // 1. Check active tracker with an uncompleted checklist task
  for (const tracker of activeTrackers) {
    const nextTask = (tracker.checklist ?? []).find((item) => !item.completed);
    const scholarshipTitle =
      tracker.owner?.displayName ||
      (typeof tracker.ownerSnapshot?.displayName === 'string'
        ? tracker.ownerSnapshot.displayName
        : 'منحة قيد المتابعة');
    if (nextTask) {
      return {
        id: `tracker-task-${tracker.id}`,
        title: nextTask.label,
        subtitle: scholarshipTitle,
        reason: 'متطلب أساسي لرفع جاهزية ملف التقديم قبل الإغلاق',
        dateLabel: tracker.deadlineAt
          ? new Date(tracker.deadlineAt).toLocaleDateString('ar', {
              month: 'short',
              day: 'numeric',
            })
          : 'موعد قريب',
        ctaLabel: 'متابعة المتطلب',
        targetTab: 'OPPORTUNITIES',
      };
    }
  }

  // 2. Check pending/overdue invoice
  const pendingInvoice = (params.invoices ?? []).find((inv) =>
    ['OVERDUE', 'ISSUED', 'PARTIALLY_PAID'].includes(inv.status),
  );
  if (pendingInvoice) {
    return {
      id: `invoice-${pendingInvoice.id}`,
      title: `مراجعة الفاتورة #${pendingInvoice.invoiceNumber}`,
      subtitle: 'طلب خدمة أكاديمية',
      reason: 'بانتظار التأكيد لاستكمال تنفيذ الخدمة المحجوزة',
      dateLabel: pendingInvoice.dueDate
        ? new Date(pendingInvoice.dueDate).toLocaleDateString('ar', {
            month: 'short',
            day: 'numeric',
          })
        : 'مستحقة',
      ctaLabel: 'عرض الفاتورة',
      targetTab: 'SERVICES',
    };
  }

  // 3. Check in-progress course
  const activeCourse = (params.courses ?? []).find(
    (c) => ['ACTIVE', 'ENROLLED', 'IN_PROGRESS'].includes(c.status) && c.progressPercentage < 100,
  );
  if (activeCourse) {
    return {
      id: `course-${activeCourse.courseId}`,
      title: `استكمال دورة ${activeCourse.courseName}`,
      subtitle: `نسبة الإنجاز الحالية ${activeCourse.progressPercentage}%`,
      reason: 'الاستمرار الأسبوعي يقرّبك من إصدار الشهادة المعتمدة',
      dateLabel: 'خطة هذا الأسبوع',
      ctaLabel: 'متابعة التعلم',
      targetTab: 'LEARNING',
    };
  }

  // 4. Fallback for new student
  return {
    id: 'explore-start',
    title: 'تحديد المنحة المستهدفة وفتح ملف تقديم',
    subtitle: 'بداية رحلتك الأكاديمية',
    reason: 'اختر منحة مناسبة لهدفك لتوليد قائمة مهام ومستندات مخصصة',
    dateLabel: 'الآن',
    ctaLabel: 'استكشاف فرصي',
    targetTab: 'OPPORTUNITIES',
  };
}

export interface DocumentStatusDimensions {
  validityLabel: string;
  availabilityLabel: string;
  consentLabel: string;
  verificationLabel: string;
}

export function resolveDocumentStatusDimensions(input: {
  expiresAt?: string | null;
  available: boolean;
  consentGranted: boolean;
  verification?: 'VERIFIED' | 'REJECTED' | 'STALE' | 'NOT_ATTESTED' | string;
}): DocumentStatusDimensions {
  let validityLabel = 'ساري الصلاحية';
  if (input.expiresAt) {
    const diffMs = new Date(input.expiresAt).getTime() - Date.now();
    if (Number.isFinite(diffMs)) {
      if (diffMs < 0) validityLabel = 'منتهي الصلاحية';
      else if (diffMs < 60 * 24 * 60 * 60 * 1000) validityLabel = 'يقترب انتهاؤه';
    }
  }

  const availabilityLabel = input.available ? 'الأصل متاح' : 'الأصل غير متاح';
  const consentLabel = input.consentGranted ? 'موافقة المراجعة مفعلة' : 'موافقة المراجعة غير مفعلة';

  const verificationMap: Record<string, string> = {
    VERIFIED: 'تم التدقيق الأكاديمي',
    REJECTED: 'مرفوض (يلزم الاستبدال)',
    STALE: 'بحاجة لتحديث',
    NOT_ATTESTED: 'غير مصدّق بعد',
  };
  const verificationLabel =
    verificationMap[input.verification || 'NOT_ATTESTED'] || 'غير مصدّق بعد';

  return {
    validityLabel,
    availabilityLabel,
    consentLabel,
    verificationLabel,
  };
}
