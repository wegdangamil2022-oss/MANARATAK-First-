import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  Users,
  RefreshCw,
  Search,
  Eye,
  RotateCcw,
  X,
  BookOpen,
  Award,
  Bookmark,
  Activity,
  Loader2,
  ExternalLink,
} from 'lucide-react';

interface StudentSupportItem {
  studentReferenceId: string;
  status: string;
  version: number;
  displayName?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  lastActiveAt?: string | null;
  updatedAt: string;
}
interface Enrollment {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseName: string;
  status: string;
  progressPercentage: number;
  enrolledAt: string;
  completedAt?: string | null;
  lastAccessedAt?: string | null;
}
interface Certificate {
  id: string;
  publicId: string;
  serialNumber: string;
  verificationCode?: string | null;
  status: string;
  courseDisplayName: string;
  issuedAt: string;
  expiresAt?: string | null;
}
interface StudentSupportDetail extends StudentSupportItem {
  provisioningHealth: {
    state: 'HEALTHY' | 'PENDING' | 'FAILED';
    pendingEventCount: number;
    failedEventCount: number;
    lastEventAt?: string | null;
    lastFailureCode?: string | null;
  };
  consentAudit: { hasDecision: boolean; lastDecidedAt?: string | null };
  linkedSummaries: {
    activeCourseCount: number;
    certificateCount: number;
    unreadNotificationCount: number;
  };
  savedSummary?: Array<{ entityType: string; count: number }>;
  activeApplicationCount?: number;
  serviceRequestCount?: number | null;
  recentServiceRequests?: Array<{
    id: string;
    publicId: string;
    status: string;
    createdAt: string;
    updatedAt: string;
  }>;
  ownerReadStatus?: {
    learning: 'AVAILABLE' | 'DEGRADED' | 'RESTRICTED';
    certificates: 'AVAILABLE' | 'DEGRADED' | 'RESTRICTED';
    services: 'AVAILABLE' | 'DEGRADED' | 'RESTRICTED';
  };
  learning?: Enrollment[];
  certificates?: Certificate[];
}
interface StudentPage {
  items: StudentSupportItem[];
  total?: number;
  nextCursor: string | null;
  hasMore: boolean;
}
type Tab = 'OVERVIEW' | 'LEARNING' | 'CERTIFICATES' | 'SAVED' | 'OPERATIONS';
const PUBLIC_WEB_BASE = (import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '');
const tabs = [
  { id: 'OVERVIEW', title: 'ملخص الطالب', icon: Users },
  { id: 'LEARNING', title: 'الدورات والتقدم', icon: BookOpen },
  { id: 'CERTIFICATES', title: 'الشهادات', icon: Award },
  { id: 'SAVED', title: 'المحفوظات والطلبات', icon: Bookmark },
  { id: 'OPERATIONS', title: 'الدعم والمزامنة', icon: Activity },
] as const;
const labels: Record<string, string> = {
  ACTIVE: 'نشط',
  SUSPENDED: 'معلق',
  ARCHIVED: 'مؤرشف',
  INITIALIZING: 'قيد التهيئة',
  PENDING: 'قيد الانتظار',
  WAITLISTED: 'في قائمة الانتظار',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
  REVOKED: 'ملغاة',
  EXPIRED: 'منتهية الصلاحية',
  HEALTHY: 'تعمل بصورة طبيعية',
  FAILED: 'تحتاج معالجة',
  RESTRICTED: 'غير مصرح بعرض بيانات هذا المجال',
  COURSE: 'الدورات',
  UNIVERSITY: 'الجامعات',
  SCHOLARSHIP: 'المنح',
  MAJOR: 'التخصصات',
  CERTIFICATE: 'الشهادات',
  STUDENT_TOOL: 'أدوات الطالب',
  CMS_CONTENT: 'المقالات والمحتوى',
  SERVICE: 'الخدمات',
  REQUESTED: 'طلب جديد',
  ACCEPTED: 'مقبول',
  IN_PROGRESS: 'قيد التنفيذ',
  AWAITING_PAYMENT: 'بانتظار الدفع',
  INTERNATIONAL_TEST: 'الاختبارات الدولية',
};
function date(value?: string | null) {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString('ar');
}
function statusLabel(value: string) {
  return labels[value] ?? value;
}
function Badge({ value }: { value: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-3 py-1 text-xs font-bold ${value === 'ACTIVE' || value === 'COMPLETED' || value === 'HEALTHY' ? 'bg-emerald-50 text-emerald-800' : value === 'FAILED' || value === 'REVOKED' ? 'bg-red-50 text-red-800' : 'bg-slate-100 text-slate-700'}`}
    >
      {statusLabel(value)}
    </span>
  );
}
function Count({ title, value }: { title: string; value: number | string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs text-slate-600">{title}</p>
      <p className="mt-2 text-xl font-black text-[#142B5F]">{value}</p>
    </div>
  );
}

export function StudentSupportAdminPage() {
  const { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams();
  const selectedId = params.get('student');
  const [items, setItems] = useState<StudentSupportItem[]>([]);
  const [total, setTotal] = useState<number | null>(null);
  const [query, setQuery] = useState('');
  const [appliedQuery, setAppliedQuery] = useState('');
  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentSupportDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [tab, setTab] = useState<Tab>('OVERVIEW');
  const [resetTarget, setResetTarget] = useState<StudentSupportItem | null>(null);
  const [reason, setReason] = useState('');
  const [resetting, setResetting] = useState(false);
  const listRequest = useRef(0);
  const detailRequest = useRef(0);
  const detailAnchor = useRef<HTMLDivElement>(null);

  const load = useCallback(
    async (nextCursor?: string | null) => {
      const request = ++listRequest.current;
      setLoading(true);
      setError(null);
      if (!nextCursor) {
        setItems([]);
        setCursor(null);
        setHasMore(false);
        setTotal(null);
      }
      try {
        const search = new URLSearchParams({ limit: '50' });
        if (appliedQuery) search.set('query', appliedQuery);
        if (status) search.set('status', status);
        if (nextCursor) search.set('cursor', nextCursor);
        const result = await adminApiClient.request<StudentPage>(
          `/admin/students/support?${search}`,
        );
        if (request !== listRequest.current) return;
        setItems((previous) =>
          nextCursor
            ? [
                ...new Map(
                  [...previous, ...result.items].map((item) => [item.studentReferenceId, item]),
                ).values(),
              ]
            : result.items,
        );
        setTotal(result.total ?? null);
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
      } catch (cause) {
        if (request === listRequest.current)
          setError(cause instanceof Error ? cause.message : 'تعذر تحميل الطلاب.');
      } finally {
        if (request === listRequest.current) setLoading(false);
      }
    },
    [appliedQuery, status],
  );
  useEffect(() => {
    void load();
    return () => {
      ++listRequest.current;
    };
  }, [load]);
  const inspect = useCallback(async (id: string) => {
    const request = ++detailRequest.current;
    setDetailLoading(true);
    setDetail(null);
    setDetailError(null);
    try {
      const result = await adminApiClient.request<StudentSupportDetail>(
        `/admin/students/support/${encodeURIComponent(id)}`,
      );
      if (request === detailRequest.current) setDetail(result);
    } catch (cause) {
      if (request === detailRequest.current)
        setDetailError(cause instanceof Error ? cause.message : 'تعذر تحميل تفاصيل الطالب.');
    } finally {
      if (request === detailRequest.current) setDetailLoading(false);
    }
  }, []);
  useEffect(() => {
    setTab('OVERVIEW');
    if (selectedId) void inspect(selectedId);
    else {
      ++detailRequest.current;
      setDetail(null);
      setDetailError(null);
      setDetailLoading(false);
    }
    return () => {
      ++detailRequest.current;
    };
  }, [selectedId, inspect]);
  useEffect(() => {
    if (detail) detailAnchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detail?.studentReferenceId]);
  function chooseStudent(id: string | null) {
    const next = new URLSearchParams(params);
    if (id) next.set('student', id);
    else next.delete('student');
    setParams(next);
  }
  function search(event: FormEvent) {
    event.preventDefault();
    const next = query.trim();
    if (next === appliedQuery) void load();
    else setAppliedQuery(next);
  }
  async function resetLayout(event: FormEvent) {
    event.preventDefault();
    if (!resetTarget || reason.trim().length < 6 || resetting) return;
    setResetting(true);
    setError(null);
    setNotice(null);
    try {
      await adminApiClient.request(
        `/admin/students/support/${encodeURIComponent(resetTarget.studentReferenceId)}/reset-layout`,
        {
          method: 'POST',
          body: JSON.stringify({ expectedVersion: resetTarget.version, reason: reason.trim() }),
        },
      );
      setResetTarget(null);
      setReason('');
      setNotice('تمت إعادة ترتيب واجهة حساب الطالب إلى الترتيب الافتراضي.');
      await load();
      if (selectedId === resetTarget.studentReferenceId) await inspect(selectedId);
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : 'تعذرت إعادة ضبط الواجهة.';
      if (message.includes('STUDENT_WORKSPACE_VERSION_CONFLICT') || message.includes('تغيرت بيانات الطالب')) {
        try {
          const current = await adminApiClient.request<StudentSupportDetail>(
            `/admin/students/support/${encodeURIComponent(resetTarget.studentReferenceId)}`,
          );
          setDetail(current);
          setResetTarget(current);
          setError('تغيرت نسخة مساحة الطالب. راجع البيانات المحدثة وأكّد إعادة الضبط مرة أخرى.');
        } catch {
          setResetTarget(null);
          setError('حدث تعارض وتعذر تحديث حالة الطالب. أعد تحميل الملف قبل المحاولة.');
        }
      } else {
        setError(message);
      }
    } finally {
      setResetting(false);
    }
  }
  const learningAvailable = detail?.ownerReadStatus?.learning === 'AVAILABLE';
  const certificatesAvailable = detail?.ownerReadStatus?.certificates === 'AVAILABLE';
  const savedCount = detail?.savedSummary?.reduce((sum, item) => sum + item.count, 0);

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <header className="rounded-3xl bg-gradient-to-l from-[#0E7C86] to-[#142B5F] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-xs text-cyan-100">إدارة الطلاب ومتابعة الحسابات</p>
            <h1 className="mt-2 text-3xl font-black">الطلاب</h1>
            <p className="mt-3 text-sm text-white/85">
              ابحث عن الطالب، ثم تابع دوراته وشهاداته وحالة حسابه من مكان واحد.
            </p>
          </div>
          <button
            disabled={loading}
            onClick={() => void load()}
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-3 font-bold disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            تحديث القائمة
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-800">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-800">
          {notice}
        </p>
      )}
      <form
        onSubmit={search}
        className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-[2fr_1fr_auto_auto]"
      >
        <label className="text-xs font-bold text-slate-600">
          اسم الطالب أو معرفه
          <input
            maxLength={120}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="اكتب الاسم أو جزءاً من المعرف"
            className="mt-2 w-full rounded-xl border p-3 text-sm"
          />
        </label>
        <label className="text-xs font-bold text-slate-600">
          حالة الحساب
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="mt-2 w-full rounded-xl border p-3 text-sm"
          >
            <option value="">جميع الحالات</option>
            {['ACTIVE', 'INITIALIZING', 'SUSPENDED', 'ARCHIVED'].map((value) => (
              <option key={value} value={value}>
                {statusLabel(value)}
              </option>
            ))}
          </select>
        </label>
        <button
          disabled={loading}
          className="mt-auto inline-flex items-center justify-center gap-2 rounded-xl bg-[#142B5F] p-3 text-sm font-bold text-white disabled:opacity-50"
        >
          <Search className="h-4 w-4" />
          بحث
        </button>
        <button
          type="button"
          onClick={() => {
            setQuery('');
            if (appliedQuery || status) {
              setAppliedQuery('');
              setStatus('');
            } else void load();
          }}
          className="mt-auto rounded-xl border p-3 text-sm"
        >
          مسح الفلاتر
        </button>
      </form>
      <section className="overflow-hidden rounded-2xl border bg-white">
        <div className="flex justify-between gap-3 border-b bg-slate-50 p-4">
          <h2 className="font-black text-[#142B5F]">حسابات الطلاب</h2>
          <span className="text-xs text-slate-600">
            {loading && items.length === 0
              ? 'جارٍ التحميل…'
              : total === null
                ? `${items.length} حساب معروض`
                : `عرض ${items.length} من ${total} نتيجة`}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-sm">
            <thead className="bg-slate-50 text-xs text-slate-600">
              <tr>
                {['الطالب', 'حالة الحساب', 'اللغة والمنطقة الزمنية', 'آخر نشاط', 'الإجراءات'].map(
                  (title) => (
                    <th key={title} className="p-4 text-start">
                      {title}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    {loading
                      ? 'جارٍ تحميل الطلاب…'
                      : error
                        ? 'تعذر تحميل القائمة. حدّث البيانات للمحاولة مجدداً.'
                        : 'لا توجد حسابات مطابقة للفلاتر الحالية.'}
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.studentReferenceId}
                    className={
                      selectedId === item.studentReferenceId ? 'bg-cyan-50' : 'hover:bg-slate-50'
                    }
                  >
                    <td className="p-4">
                      <button
                        onClick={() => chooseStudent(item.studentReferenceId)}
                        className="font-bold text-[#142B5F]"
                      >
                        {item.displayName?.trim() || 'اسم غير مسجل'}
                      </button>
                      <code dir="ltr" className="mt-1 block text-[10px] text-slate-500">
                        {item.studentReferenceId}
                      </code>
                    </td>
                    <td className="p-4">
                      <Badge value={item.status} />
                    </td>
                    <td className="p-4 text-xs">
                      {item.preferredLanguage || 'غير محددة'}
                      <p className="mt-1 text-slate-500">{item.timezone || 'غير محددة'}</p>
                    </td>
                    <td className="p-4 text-xs">{date(item.lastActiveAt)}</td>
                    <td className="p-4">
                      <button
                        onClick={() => chooseStudent(item.studentReferenceId)}
                        className="inline-flex items-center gap-2 rounded-xl border px-3 py-2 font-bold text-[#0E7C86]"
                      >
                        <Eye className="h-4 w-4" />
                        عرض الطالب
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {hasMore && (
          <div className="border-t p-4 text-center">
            <button
              disabled={loading || !cursor}
              onClick={() => void load(cursor)}
              className="rounded-xl border px-5 py-3 text-sm font-bold text-[#142B5F] disabled:opacity-50"
            >
              {loading ? 'جارٍ التحميل…' : 'تحميل المزيد'}
            </button>
          </div>
        )}
      </section>
      {selectedId && (
        <div
          ref={detailAnchor}
          className="scroll-mt-5 rounded-3xl border border-cyan-200 bg-white p-5 sm:p-6"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-xl font-black text-[#142B5F]">
              {detail?.displayName?.trim() || 'تفاصيل الطالب'}
            </h2>
            <div className="flex gap-2">
              <button
                disabled={detailLoading}
                title="تحديث تفاصيل الطالب"
                aria-label="تحديث تفاصيل الطالب"
                onClick={() => void inspect(selectedId)}
                className="rounded-xl border p-2"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                aria-label="إغلاق تفاصيل الطالب"
                onClick={() => chooseStudent(null)}
                className="rounded-xl border p-2"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {detailLoading ? (
            <div className="flex items-center gap-2 py-8 text-slate-500">
              <Loader2 className="h-5 w-5 animate-spin" />
              جارٍ تحميل بيانات الطالب…
            </div>
          ) : detailError ? (
            <p role="alert" className="mt-4 rounded-xl bg-red-50 p-4 text-red-800">
              {detailError}
            </p>
          ) : (
            detail && (
              <>
                <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-slate-500">
                  <Badge value={detail.status} />
                  <code dir="ltr">{detail.studentReferenceId}</code>
                  <span>آخر تحديث: {date(detail.updatedAt)}</span>
                </div>
                <nav
                  aria-label="أقسام ملف الطالب"
                  className="mt-5 flex gap-2 overflow-x-auto border-b pb-3"
                >
                  {tabs.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      aria-pressed={tab === item.id}
                      onClick={() => setTab(item.id)}
                      className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-sm font-bold ${tab === item.id ? 'bg-[#142B5F] text-white' : 'bg-slate-50 text-slate-600'}`}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.title}
                    </button>
                  ))}
                </nav>
                {Object.values(detail.ownerReadStatus ?? {}).includes('RESTRICTED') && (
                  <p role="status" className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700">
                    بعض بيانات الدورات والشهادات والخدمات محجوبة لعدم امتلاك صلاحيات مجالاتها. الأعداد المحجوبة لا تعني صفرًا.
                  </p>
                )}
                {Object.values(detail.ownerReadStatus ?? {}).includes('DEGRADED') && (
                  <p
                    role="status"
                    className="mt-4 rounded-xl bg-amber-50 p-3 text-sm text-amber-800"
                  >
                    تعذرت قراءة بعض البيانات المرتبطة. تظهر المصادر غير المتاحة بعلامة —؛ حدّث
                    التفاصيل للمحاولة مجدداً.
                  </p>
                )}
                {tab === 'OVERVIEW' && (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Count
                        title="الدورات النشطة"
                        value={learningAvailable ? detail.linkedSummaries.activeCourseCount : '—'}
                      />
                      <Count
                        title="الدورات المكتملة"
                        value={
                          learningAvailable
                            ? (detail.learning ?? []).filter((item) => item.status === 'COMPLETED')
                                .length
                            : '—'
                        }
                      />
                      <Count
                        title="الشهادات المسجلة"
                        value={
                          certificatesAvailable ? detail.linkedSummaries.certificateCount : '—'
                        }
                      />
                      <Count title="العناصر المحفوظة" value={savedCount ?? '—'} />
                    </div>
                    <dl className="grid gap-4 rounded-2xl bg-slate-50 p-5 text-sm sm:grid-cols-3">
                      <div>
                        <dt className="text-slate-500">لغة الحساب</dt>
                        <dd className="mt-1 font-bold">
                          {detail.preferredLanguage || 'غير محددة'}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">المنطقة الزمنية</dt>
                        <dd className="mt-1 font-bold">{detail.timezone || 'غير محددة'}</dd>
                      </div>
                      <div>
                        <dt className="text-slate-500">آخر نشاط مسجل</dt>
                        <dd className="mt-1 font-bold">{date(detail.lastActiveAt)}</dd>
                      </div>
                    </dl>
                    <p className="text-xs text-slate-500">
                      تعرض هذه الصفحة بيانات المتابعة اللازمة للدعم. تعديل بيانات الحساب والموافقات
                      الشخصية يتم من المسارات المخصصة لصاحب الحساب.
                    </p>
                  </div>
                )}
                {tab === 'LEARNING' && (
                  <div className="mt-5 space-y-3">
                    {!learningAvailable ? (
                      <p className="rounded-xl bg-amber-50 p-4">بيانات التعلم غير متاحة حالياً.</p>
                    ) : !detail.learning?.length ? (
                      <p className="p-5 text-slate-500">لا توجد تسجيلات في الدورات لهذا الطالب.</p>
                    ) : (
                      detail.learning.map((item) => {
                        const progress = Number.isFinite(item.progressPercentage)
                          ? Math.min(100, Math.max(0, item.progressPercentage))
                          : 0;
                        return (
                          <article key={item.enrollmentId} className="rounded-2xl border p-4">
                            <div className="flex flex-wrap justify-between gap-3">
                              <h3 className="font-bold text-[#142B5F]">{item.courseName}</h3>
                              <Badge value={item.status} />
                            </div>
                            <div className="mt-3 flex justify-between text-xs">
                              <span>التقدم</span>
                              <span>{progress}%</span>
                            </div>
                            <progress
                              aria-label={`التقدم في ${item.courseName}`}
                              max={100}
                              value={progress}
                              className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 [&::-webkit-progress-bar]:bg-slate-100 [&::-webkit-progress-value]:bg-[#0E7C86] [&::-moz-progress-bar]:bg-[#0E7C86]"
                            />
                            <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-500">
                              <span>التسجيل: {date(item.enrolledAt)}</span>
                              <span>آخر وصول: {date(item.lastAccessedAt)}</span>
                              {item.completedAt && <span>الإتمام: {date(item.completedAt)}</span>}
                            </div>
                            {hasPermission('admin:courses:manage') && (
                              <Link
                                to={`/courses/${encodeURIComponent(item.courseId)}`}
                                className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"
                              >
                                فتح الدورة في الإدارة
                                <ExternalLink className="h-3 w-3" />
                              </Link>
                            )}
                          </article>
                        );
                      })
                    )}
                  </div>
                )}
                {tab === 'CERTIFICATES' && (
                  <div className="mt-5 grid gap-3 sm:grid-cols-2">
                    {!certificatesAvailable ? (
                      <p className="rounded-xl bg-amber-50 p-4">تعذرت قراءة سجل الشهادات.</p>
                    ) : !detail.certificates?.length ? (
                      <p className="p-5 text-slate-500">لا توجد شهادات مسجلة لهذا الطالب.</p>
                    ) : (
                      detail.certificates.map((item) => (
                        <article key={item.id} className="rounded-2xl border p-4">
                          <h3 className="font-bold text-[#142B5F]">{item.courseDisplayName}</h3>
                          <div className="mt-3">
                            <Badge
                              value={
                                item.status === 'ACTIVE' &&
                                item.expiresAt &&
                                new Date(item.expiresAt).getTime() <= Date.now()
                                  ? 'EXPIRED'
                                  : item.status
                              }
                            />
                          </div>
                          <p className="mt-3 text-xs">
                            الرقم التسلسلي: <span dir="ltr">{item.serialNumber}</span>
                          </p>
                          <p className="mt-2 text-xs text-slate-500">
                            الإصدار: {date(item.issuedAt)}
                          </p>
                          {item.expiresAt && (
                            <p className="mt-2 text-xs text-slate-500">
                              انتهاء الصلاحية: {date(item.expiresAt)}
                            </p>
                          )}
                          {hasPermission('admin:certificates:view') && (
                            <Link
                              to={`/certificates/${encodeURIComponent(item.id)}`}
                              className="mt-3 block text-xs font-bold text-[#0E7C86]"
                            >
                              فتح سجل الشهادة في الإدارة
                            </Link>
                          )}
                          {item.verificationCode && (
                            <a
                              href={`${PUBLIC_WEB_BASE}/certificates/verify?code=${encodeURIComponent(item.verificationCode)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"
                            >
                              التحقق العام من الشهادة
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          )}
                        </article>
                      ))
                    )}
                  </div>
                )}
                {tab === 'SAVED' && (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Count title="العناصر المحفوظة" value={savedCount ?? '—'} />
                      <Count
                        title="متابعات التقديم النشطة للمنح"
                        value={detail.activeApplicationCount ?? '—'}
                      />
                      <Count
                        title="طلبات الخدمات المسجلة"
                        value={detail.serviceRequestCount ?? '—'}
                      />
                    </div>
                    <h3 className="font-bold text-[#142B5F]">توزيع المحفوظات</h3>
                    {detail.savedSummary?.length ? (
                      <div className="grid gap-3 sm:grid-cols-3">
                        {detail.savedSummary.map((item) => (
                          <Count
                            key={item.entityType}
                            title={statusLabel(item.entityType)}
                            value={item.count}
                          />
                        ))}
                      </div>
                    ) : (
                      <p className="text-sm text-slate-500">
                        {detail.savedSummary ? 'لا توجد عناصر محفوظة.' : 'ملخص المحفوظات غير متاح.'}
                      </p>
                    )}
                    <div className="space-y-3">
                      <h3 className="font-bold text-[#142B5F]">طلبات الخدمات الأخيرة</h3>
                      {detail.ownerReadStatus?.services !== 'AVAILABLE' ? (
                        <p className="text-sm text-amber-800">تعذرت قراءة طلبات الخدمات.</p>
                      ) : detail.recentServiceRequests?.length ? (
                        <>
                          <p className="text-xs text-slate-500">
                            آخر {detail.recentServiceRequests.length} طلب من{' '}
                            {detail.serviceRequestCount} طلب مسجل.
                          </p>
                          {detail.recentServiceRequests.map((request) => (
                            <article key={request.id} className="rounded-xl border p-4">
                              <div className="flex flex-wrap justify-between gap-3">
                                <code dir="ltr" className="text-xs text-[#142B5F]">
                                  {request.publicId}
                                </code>
                                <Badge value={request.status} />
                              </div>
                              <p className="mt-2 text-xs text-slate-500">
                                الإنشاء: {date(request.createdAt)} · آخر تحديث:{' '}
                                {date(request.updatedAt)}
                              </p>
                              {hasPermission('admin:services:manage') && (
                                <Link
                                  to={`/services?request=${encodeURIComponent(request.publicId)}`}
                                  className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-[#0E7C86]"
                                >
                                  متابعة الطلب في إدارة الخدمات
                                  <ExternalLink className="h-3 w-3" />
                                </Link>
                              )}
                            </article>
                          ))}
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">لا توجد طلبات خدمات مسجلة.</p>
                      )}
                    </div>
                    <p className="text-xs text-slate-500">
                      يظهر ملخص الأعداد دون عرض ملاحظات الطالب الشخصية أو تفاصيل طلباته الخاصة.
                    </p>
                  </div>
                )}
                {tab === 'OPERATIONS' && (
                  <div className="mt-5 space-y-5">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <Count
                        title="عمليات المزامنة المنتظرة"
                        value={detail.provisioningHealth.pendingEventCount}
                      />
                      <Count
                        title="عمليات المزامنة التي تحتاج معالجة"
                        value={detail.provisioningHealth.failedEventCount}
                      />
                      <Count
                        title="إشعارات الطالب غير المقروءة"
                        value={detail.linkedSummaries.unreadNotificationCount}
                      />
                    </div>
                    <div className="rounded-2xl border p-4">
                      <h3 className="mb-3 font-bold text-[#142B5F]">حالة تجهيز الحساب</h3>
                      <Badge value={detail.provisioningHealth.state} />
                      <p className="mt-3 text-xs text-slate-500">
                        آخر حدث: {date(detail.provisioningHealth.lastEventAt)}
                      </p>
                      {detail.provisioningHealth.lastFailureCode && (
                        <code className="mt-3 block break-all text-xs text-red-700" dir="ltr">
                          {detail.provisioningHealth.lastFailureCode}
                        </code>
                      )}
                    </div>
                    <div className="rounded-2xl border p-4">
                      <h3 className="font-bold text-[#142B5F]">سجل قرار الخصوصية</h3>
                      <p className="mt-2 text-sm">
                        {detail.consentAudit.hasDecision ? 'يوجد قرار مسجل' : 'لا يوجد قرار مسجل'}
                      </p>
                      <p className="mt-2 text-xs text-slate-500">
                        تاريخ القرار: {date(detail.consentAudit.lastDecidedAt)}
                      </p>
                    </div>
                    {hasPermission('admin:students:support:mutate') && (
                      <button
                        disabled={detail.status !== 'ACTIVE'}
                        title={
                          detail.status === 'ACTIVE'
                            ? 'إعادة الترتيب الافتراضي'
                            : 'يتطلب الإجراء حساباً نشطاً'
                        }
                        onClick={() => {
                          setResetTarget(detail);
                          setReason('');
                        }}
                        className="inline-flex items-center gap-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-bold text-amber-800"
                      >
                        <RotateCcw className="h-4 w-4" />
                        إعادة ترتيب واجهة الطالب
                      </button>
                    )}
                  </div>
                )}
              </>
            )
          )}
        </div>
      )}
      {resetTarget && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="student-reset-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onSubmit={resetLayout}
            className="w-full max-w-lg space-y-4 rounded-2xl bg-white p-6"
          >
            <h2 id="student-reset-title" className="text-xl font-black text-[#142B5F]">
              إعادة ترتيب واجهة الطالب
            </h2>
            <p className="text-sm text-slate-600">
              يعيد ترتيب أقسام حساب {resetTarget.displayName || 'الطالب'} إلى التخطيط الافتراضي.
              يسجل سبب الإجراء في سجل التدقيق.
            </p>
            <label className="block text-sm font-bold">
              سبب الإجراء
              <textarea
                required
                minLength={6}
                maxLength={1000}
                disabled={resetting}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="mt-2 w-full rounded-xl border p-3"
              />
            </label>
            {error && (
              <p role="alert" className="text-sm text-red-800">
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button
                disabled={resetting || reason.trim().length < 6}
                className="rounded-xl bg-[#142B5F] px-4 py-3 font-bold text-white disabled:opacity-50"
              >
                {resetting ? 'جارٍ الحفظ…' : 'تأكيد إعادة الترتيب'}
              </button>
              <button
                type="button"
                disabled={resetting}
                onClick={() => setResetTarget(null)}
                className="rounded-xl border px-4 py-3"
              >
                إلغاء
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
