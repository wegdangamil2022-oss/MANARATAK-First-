import type {
  CareerApplicationDto,
  CareerEmployerDto,
  CareerJobPostingDto,
} from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
import type { CanonicalPickerPage } from '../../api/canonicalPickers';

export type CareerTab = 'jobs' | 'employers' | 'applications' | 'alumni';
export type CareerRow = {
  id: string;
  version: number;
  publicId?: string;
  title?: string;
  displayName?: string;
  status?: string;
  verificationStatus?: string;
  visibility?: string;
  jobId?: string;
  employerId?: string;
  employer?: CareerEmployerDto;
  opportunityType?: string;
  employmentType?: string;
  country?: string | null;
  city?: string | null;
  applicationDeadline?: string | Date | null;
  submittedAt?: string | Date;
  jobSnapshot?: Record<string, unknown>;
};
export type CareerPage = { data: CareerRow[]; total: number; totalPages: number };
export type CareerDetail = CareerJobPostingDto | CareerEmployerDto | CareerApplicationDto;
export type CareerWrite = (
  path: string,
  body: Record<string, unknown>,
  reason: string,
  method?: string,
) => Promise<boolean>;
export const jobStates = [
  'DRAFT',
  'READY_TO_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'EXPIRED',
  'REJECTED',
  'ARCHIVED',
];
export const applicationStates = [
  'SUBMITTED',
  'UNDER_REVIEW',
  'SHORTLISTED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN',
];
export const opportunityTypes = [
  'JOB',
  'INTERNSHIP',
  'GRADUATE_PROGRAM',
  'MENTORSHIP',
  'CAREER_EVENT',
];
export const employmentTypes = [
  'FULL_TIME',
  'PART_TIME',
  'CONTRACT',
  'INTERNSHIP',
  'REMOTE',
  'HYBRID',
];
export const careerTabs: CareerTab[] = ['jobs', 'employers', 'applications', 'alumni'];
const labels: Record<string, [string, string]> = {
  DRAFT: ['مسودة', 'Draft'],
  READY_TO_REVIEW: ['بانتظار المراجعة', 'Awaiting review'],
  READY_TO_PUBLISH: ['جاهزة للنشر', 'Ready to publish'],
  PUBLISHED: ['منشورة', 'Published'],
  EXPIRED: ['منتهية', 'Expired'],
  REJECTED: ['مرفوضة', 'Rejected'],
  ARCHIVED: ['مؤرشفة', 'Archived'],
  UNVERIFIED: ['غير موثقة', 'Unverified'],
  VERIFIED: ['موثقة', 'Verified'],
  SUSPENDED: ['معلقة', 'Suspended'],
  SUBMITTED: ['طلب جديد', 'Submitted'],
  UNDER_REVIEW: ['قيد المراجعة', 'Under review'],
  SHORTLISTED: ['القائمة المختصرة', 'Shortlisted'],
  ACCEPTED: ['مقبول', 'Accepted'],
  WITHDRAWN: ['منسحب', 'Withdrawn'],
  JOB: ['وظيفة', 'Job'],
  INTERNSHIP: ['تدريب', 'Internship'],
  GRADUATE_PROGRAM: ['برنامج خريجين', 'Graduate program'],
  MENTORSHIP: ['إرشاد مهني', 'Mentorship'],
  CAREER_EVENT: ['فعالية مهنية', 'Career event'],
  FULL_TIME: ['دوام كامل', 'Full time'],
  PART_TIME: ['دوام جزئي', 'Part time'],
  CONTRACT: ['تعاقد', 'Contract'],
  REMOTE: ['عن بُعد', 'Remote'],
  HYBRID: ['هجين', 'Hybrid'],
  INTERNAL: ['داخل المنصة', 'Internal'],
  EXTERNAL: ['رابط خارجي', 'External'],
  HOUR: ['بالساعة', 'Hourly'],
  MONTH: ['شهري', 'Monthly'],
  YEAR: ['سنوي', 'Yearly'],
  GROSS: ['إجمالي', 'Gross'],
  NET: ['صافي', 'Net'],
  PRIVATE: ['خاص', 'Private'],
  PUBLIC_CONSENT: ['ظهور عام بموافقة', 'Public with consent'],
  ALUMNI_NETWORK_ONLY: ['شبكة الخريجين فقط', 'Alumni network only'],
};
export const careerLabel = (value: string | undefined, ar: boolean) =>
  value ? (labels[value]?.[ar ? 0 : 1] ?? value) : '—';
export const recordTitle = (row: CareerRow) =>
  row.title || row.displayName || row.publicId || row.id;
export function formatCareerDate(value: Date | string | null | undefined, ar: boolean) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '—';
  return new Intl.DateTimeFormat(ar ? 'ar' : 'en', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}
export function localDateInput(value: Date | string | null | undefined) {
  if (!value || !Number.isFinite(new Date(value).getTime())) return '';
  const date = new Date(value);
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}
export function safeCareerLink(value: unknown): string | undefined {
  if (typeof value !== 'string') return;
  try {
    const url = new URL(value),
      host = url.hostname.toLowerCase().replace(/\.$/, '');
    if (
      url.protocol === 'https:' &&
      !url.username &&
      !url.password &&
      (!url.port || url.port === '443') &&
      host.includes('.') &&
      !/^[\d.]+$/.test(host) &&
      !host.includes(':') &&
      !/(?:\.local|\.localhost|\.internal)$/.test(host)
    )
      return url.href;
  } catch {
    /* Only verified public HTTPS destinations become links. */
  }
}
export function applicationTransitions(status?: string): string[] {
  return status === 'SUBMITTED'
    ? ['UNDER_REVIEW']
    : status === 'UNDER_REVIEW'
      ? ['SHORTLISTED', 'REJECTED']
      : status === 'SHORTLISTED'
        ? ['ACCEPTED', 'REJECTED']
        : [];
}
export function careerErrorMessage(error: unknown, ar: boolean) {
  const text = error instanceof Error ? error.message : '';
  const messages: Record<string, [string, string]> = {
    CAREER_INDEPENDENT_REVIEW_REQUIRED: [
      'يلزم مراجع آخر غير منشئ السجل أو آخر محرر له.',
      'A reviewer other than the maker or last editor is required.',
    ],
    CAREER_EMPLOYER_NOT_VERIFIED: [
      'يلزم توثيق جهة التوظيف بدليل ساري قبل الاعتماد أو النشر.',
      'The employer needs current independent verification before approval or publishing.',
    ],
    CAREER_DEADLINE_INVALID: [
      'حدد موعد تقديم صالحًا في المستقبل.',
      'Set a valid future application deadline.',
    ],
    CAREER_SOURCE_REQUIRED: [
      'أضف رابط المصدر الرسمي قبل الاعتماد.',
      'Add the official source before approval.',
    ],
    CAREER_SOURCE_DOMAIN_MISMATCH: [
      'يجب أن يتطابق دليل التوثيق مع نطاق موقع الجهة.',
      'Verification evidence must match the employer website domain.',
    ],
    CAREER_VERIFICATION_EVIDENCE_REQUIRED: [
      'أضف مصدر توثيق رسميًا وتاريخ انتهاء في المستقبل.',
      'Provide official verification evidence and a future expiry.',
    ],
    CAREER_ACCESS_DENIED: [
      'لا تملك صلاحية هذا الإجراء ضمن نطاق السجل.',
      'This action is outside your permitted scope.',
    ],
  };
  if (/CONFLICT|\[409\]/.test(text))
    return ar
      ? 'تغير السجل أو يوجد سجل مكرر. حدّث القائمة وافتح السجل مجددًا قبل إعادة المحاولة.'
      : 'The record changed or a duplicate exists. Refresh and reopen the record before retrying.';
  for (const [code, message] of Object.entries(messages))
    if (text.includes(code)) return message[ar ? 0 : 1];
  return ar
    ? 'تعذر تنفيذ الإجراء. راجع الحقول والصلاحيات؛ يمكنك إعادة محاولة الطلب نفسه.'
    : 'Could not complete the action. Check fields and permissions; you can retry the same request.';
}
export async function careerEmployers(query = '', page = 1): Promise<CanonicalPickerPage> {
  const result = await adminApiClient.request<{ data: CareerEmployerDto[]; totalPages: number }>(
    `/admin/careers/employers?${new URLSearchParams({ search: query, page: String(page), pageSize: '20' })}`,
  );
  return {
    options: result.data.map((row) => ({
      id: row.id,
      label: row.displayName,
      lifecycle: row.verificationStatus,
    })),
    nextCursor: page < result.totalPages ? String(page + 1) : null,
  };
}
export async function careerJobs(query = '', page = 1): Promise<CanonicalPickerPage> {
  const result = await adminApiClient.request<{ data: CareerJobPostingDto[]; totalPages: number }>(
    `/admin/careers/jobs?${new URLSearchParams({ search: query, page: String(page), pageSize: '20' })}`,
  );
  // Historical opportunities remain selectable for application review filters.
  return {
    options: result.data.map((row) => ({ id: row.id, label: row.title, lifecycle: row.status })),
    nextCursor: page < result.totalPages ? String(page + 1) : null,
  };
}
