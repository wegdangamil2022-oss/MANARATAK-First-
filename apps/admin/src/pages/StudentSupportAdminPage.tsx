import { FormEvent, useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { Users, RefreshCw, Search, Eye, RotateCcw, X, ShieldCheck } from 'lucide-react';

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

interface StudentSupportDetail extends StudentSupportItem {
  provisioningHealth: {
    state: 'HEALTHY' | 'PENDING' | 'FAILED';
    pendingEventCount: number;
    failedEventCount: number;
    lastEventAt?: string | null;
    lastFailureCode?: string | null;
  };
  consentAudit: {
    hasDecision: boolean;
    lastDecidedAt?: string | null;
  };
  linkedSummaries: {
    activeCourseCount: number;
    certificateCount: number;
    unreadNotificationCount: number;
  };
}

interface Page {
  items: StudentSupportItem[];
  nextCursor: string | null;
  hasMore: boolean;
}

export function StudentSupportAdminPage() {
  const { hasPermission } = useAdminAuthorization();
  const [items, setItems] = useState<StudentSupportItem[]>([]);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<StudentSupportDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const load = async (reset = true) => {
    setLoading(true);
    try {
      setError(null);
      const p = new URLSearchParams({ limit: '50' });
      if (query.trim()) p.set('query', query.trim());
      if (status) p.set('status', status);
      if (!reset && cursor) p.set('cursor', cursor);
      const r = await adminApiClient.request<Page>(`/admin/students/support?${p}`);
      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setCursor(r.nextCursor);
      setHasMore(r.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل سجلات دعم الطلاب.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void load(true);
  };

  const inspect = async (item: StudentSupportItem) => {
    try {
      setError(null);
      setDetail(
        await adminApiClient.request<StudentSupportDetail>(
          `/admin/students/support/${encodeURIComponent(item.studentReferenceId)}`
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل تفاصيل الطالب.');
    }
  };

  const resetLayout = async (item: StudentSupportItem) => {
    const reason = window.prompt('سبب إعادة ضبط الواجهة (مطلوب للتدقيق):');
    if (!reason || reason.trim().length < 6) return;
    try {
      await adminApiClient.request(
        `/admin/students/support/${encodeURIComponent(item.studentReferenceId)}/reset-layout`,
        {
          method: 'POST',
          body: JSON.stringify({ expectedVersion: item.version, reason: reason.trim() }),
        }
      );
      await load(true);
      if (detail?.studentReferenceId === item.studentReferenceId) await inspect(item);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'فشلت عملية إعادة الضبط.');
    }
  };

  const formatStatus = (s: string) => {
    switch (s) {
      case 'ACTIVE': return 'نشط';
      case 'SUSPENDED': return 'معلق';
      case 'ARCHIVED': return 'مؤرشف';
      case 'INITIALIZING': return 'جارٍ التهيئة';
      default: return s;
    }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <Users className="h-4 w-4 text-[#21A7B4]" />
              <span>مركز رعاية وتجربة الطلاب · STUDENT SUPPORT</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">مركز دعم ورعاية الطلاب</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              واجهة تشغيلية آمنة ومراعية للخصوصية لحل مشاكل التهيئة والمزامنة ومتابعة نشاط الطلاب.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs md:grid-cols-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="بحث بمعرف الطالب أو الاسم"
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold outline-none focus:border-[#21A7B4]"
        >
          <option value="">جميع حالات الحساب</option>
          <option value="ACTIVE">نشط (ACTIVE)</option>
          <option value="SUSPENDED">معلق (SUSPENDED)</option>
          <option value="ARCHIVED">مؤرشف (ARCHIVED)</option>
          <option value="INITIALIZING">قيد التهيئة (INITIALIZING)</option>
        </select>
        <button
          type="submit"
          className="inline-flex min-h-[42px] items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#0E7C86] transition shadow-xs"
        >
          <Search className="h-3.5 w-3.5" /> بحث في الطلاب
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <h2 className="text-base font-black text-[#142B5F]">سجلات حسابات الطلاب ({items.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5 text-start">الطالب</th>
                <th className="p-3.5 text-start">حالة الحساب</th>
                <th className="p-3.5 text-start">اللغة والمنطقة</th>
                <th className="p-3.5 text-start">آخر نشاط</th>
                <th className="p-3.5 text-start">الإجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد سجلات مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                items.map((i) => (
                  <tr key={i.studentReferenceId} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5">
                      <div className="font-bold text-[#142B5F]">{i.displayName ?? 'طالب'}</div>
                      <code className="text-[10px] text-slate-400 font-mono">{i.studentReferenceId}</code>
                    </td>
                    <td className="p-3.5">
                      <span className={`rounded-full px-2.5 py-0.5 text-[10px] font-black ${
                        i.status === 'ACTIVE'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {formatStatus(i.status)} · v{i.version}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">
                      {i.preferredLanguage ?? 'ar'} · {i.timezone ?? 'Asia/Riyadh'}
                    </td>
                    <td className="p-3.5 text-slate-500">
                      {i.lastActiveAt ? new Date(i.lastActiveAt).toLocaleString('ar') : '—'}
                    </td>
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => void inspect(i)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-bold text-[#0E7C86] hover:bg-slate-50 transition"
                        >
                          <Eye className="h-3 w-3" /> فحص
                        </button>
                        {hasPermission('admin:students:support:mutate') && (
                          <button
                            onClick={() => void resetLayout(i)}
                            className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 font-bold text-amber-700 hover:bg-amber-100 transition"
                          >
                            <RotateCcw className="h-3 w-3" /> ضبط الواجهة
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => void load(false)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-xs font-black text-[#142B5F] hover:bg-slate-50 transition shadow-xs"
          >
            تحميل المزيد من الطلاب
          </button>
        </div>
      )}

      {detail && (
        <section className="rounded-3xl border border-[#21A7B4]/30 bg-white p-6 shadow-md">
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <h3 className="font-black text-lg text-[#142B5F]">
                تفاصيل دعم الطالب — {detail.displayName ?? detail.studentReferenceId}
              </h3>
              <p className="text-xs text-slate-500 font-medium">حالة تشغيلية خاضعة لسياسات الخصوصية التامة.</p>
            </div>
            <button
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
              onClick={() => setDetail(null)}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-5 grid gap-4 text-xs md:grid-cols-3">
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="font-black text-sm text-[#142B5F] mb-2">حالة التهيئة (Provisioning)</div>
              <div className="font-bold text-[#0E7C86] mb-1">الحالة: {detail.provisioningHealth.state}</div>
              <div className="text-slate-600">أحداث معلقة: {detail.provisioningHealth.pendingEventCount}</div>
              <div className="text-slate-600">أحداث فاشلة: {detail.provisioningHealth.failedEventCount}</div>
              {detail.provisioningHealth.lastFailureCode && (
                <code className="mt-2 block rounded bg-red-50 p-1 text-red-700 font-mono text-[10px]">
                  {detail.provisioningHealth.lastFailureCode}
                </code>
              )}
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="font-black text-sm text-[#142B5F] mb-2">تدقيق الموافقات (Consent)</div>
              <div className="text-slate-700 mb-1">
                {detail.consentAudit.hasDecision ? 'تم تسجيل قرار الموافقة' : 'لا يوجد قرار مسجل'}
              </div>
              <div className="text-slate-500">
                تاريخ القرار:{' '}
                {detail.consentAudit.lastDecidedAt
                  ? new Date(detail.consentAudit.lastDecidedAt).toLocaleString('ar')
                  : '—'}
              </div>
            </div>
            <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4">
              <div className="font-black text-sm text-[#142B5F] mb-2">ملخص الأنشطة المرتبطة</div>
              <div className="text-slate-600">الدورات النشطة: {detail.linkedSummaries.activeCourseCount}</div>
              <div className="text-slate-600">الشهادات المكتسبة: {detail.linkedSummaries.certificateCount}</div>
              <div className="text-slate-600">إشعارات غير مقروءة: {detail.linkedSummaries.unreadNotificationCount}</div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
