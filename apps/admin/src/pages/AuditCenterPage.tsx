import { FormEvent, useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';
import { ShieldCheck, Download, Filter, RefreshCw, X, FileSearch } from 'lucide-react';

interface AuditRecordDto {
  id: string;
  reference: string;
  action: string;
  category: string;
  severity: string;
  actor: { actorId: string; actorType: string };
  target: { targetId: string; targetType: string };
  source: string;
  timestamp: string;
  correlationReference?: string;
  traceReference?: string;
  contextMetadata: unknown;
}

interface AuditPage {
  items: AuditRecordDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

export function AuditCenterPage() {
  const [items, setItems] = useState<AuditRecordDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRecordDto | null>(null);
  const [filters, setFilters] = useState({ actorId: '', action: '', category: '', correlationId: '' });
  const [integrity, setIntegrity] = useState<'UNKNOWN' | 'PASS' | 'FAIL'>('UNKNOWN');
  const [loading, setLoading] = useState(false);

  const load = async (reset = true) => {
    setLoading(true);
    try {
      setError(null);
      const p = new URLSearchParams({ limit: '50' });
      Object.entries(filters).forEach(([k, v]) => v.trim() && p.set(k, v.trim()));
      if (!reset && cursor) p.set('cursor', cursor);
      const r = await adminApiClient.request<AuditPage>(`/admin/audit/records?${p}`);
      setItems((prev) => (reset ? r.items : [...prev, ...r.items]));
      setCursor(r.nextCursor);
      setHasMore(r.hasMore);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'تعذر تحميل سجلات التدقيق.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load(true);
    adminApiClient
      .request<{ status: 'PASS' | 'FAIL' }>('/admin/audit/integrity')
      .then((r) => setIntegrity(r.status))
      .catch(() => setIntegrity('FAIL'));
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    void load(true);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <ShieldCheck className="h-4 w-4 text-[#21A7B4]" />
              <span>سجل التدقيق والأمان غير القابل للتعديل · IMMUTABLE AUDIT</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">مركز سجلات التدقيق</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              أدلة تدقيق غير قابلة للتعديل أو الحذف عبر كافة مجالات المنصة لضمان النزاهة والامتثال الأمني الصارم.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <span className={`rounded-2xl px-4 py-2.5 text-xs font-black backdrop-blur-md border ${
              integrity === 'PASS'
                ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-200'
                : integrity === 'FAIL'
                ? 'bg-rose-500/20 border-rose-300/40 text-rose-200'
                : 'bg-white/10 border-white/20 text-white'
            }`}>
              حالة النزاهة: {integrity === 'PASS' ? 'سليم ومتحقق (PASS)' : integrity === 'FAIL' ? 'خلل (FAIL)' : 'جارٍ الفحص'}
            </span>
            <a
              href="/api/v1/admin/audit/export?format=csv&limit=100"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-white/10 border border-white/20 px-4 text-xs font-black text-white hover:bg-white/20 transition shadow-xs"
            >
              <Download className="h-4 w-4 text-cyan-200" /> تصدير CSV
            </a>
            <button
              onClick={() => void load(true)}
              disabled={loading}
              className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-4 text-xs font-black text-white hover:bg-[#1A8D99] transition shadow-md"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث
            </button>
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs sm:grid-cols-2 lg:grid-cols-5">
        <input
          value={filters.actorId}
          onChange={(e) => setFilters((v) => ({ ...v, actorId: e.target.value }))}
          placeholder="معرف الفاعل (Actor ID)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.action}
          onChange={(e) => setFilters((v) => ({ ...v, action: e.target.value }))}
          placeholder="نوع الإجراء (Action)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.category}
          onChange={(e) => setFilters((v) => ({ ...v, category: e.target.value }))}
          placeholder="التصنيف (Category)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.correlationId}
          onChange={(e) => setFilters((v) => ({ ...v, correlationId: e.target.value }))}
          placeholder="معرف الارتباط (Correlation ID)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#0E7C86] transition shadow-xs"
        >
          <Filter className="h-3.5 w-3.5" /> تصفية السجلات
        </button>
      </form>

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <h2 className="text-base font-black text-[#142B5F]">سجلات التدقيق الملتقطة ({items.length})</h2>
          <p className="mt-0.5 text-xs text-slate-500 font-medium">اضغط على أي سجل لعرض التفاصيل الكاملة وهيكل الـ JSON.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5 text-start">الوقت والتاريخ</th>
                <th className="p-3.5 text-start">الفاعل (Actor)</th>
                <th className="p-3.5 text-start">الإجراء</th>
                <th className="p-3.5 text-start">المجال</th>
                <th className="p-3.5 text-start">الهدف (Target)</th>
                <th className="p-3.5 text-start">معرف التتبع</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد سجلات تدقيق مطابقة.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelected(item)}
                    className="cursor-pointer hover:bg-teal-50/40 transition"
                  >
                    <td className="p-3.5 text-slate-600 font-medium whitespace-nowrap">
                      {new Date(item.timestamp).toLocaleString('ar')}
                    </td>
                    <td className="p-3.5">
                      <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {item.actor.actorId}
                      </code>
                    </td>
                    <td className="p-3.5 font-black text-[#142B5F]">{item.action}</td>
                    <td className="p-3.5 font-bold text-[#0E7C86]">{item.category}</td>
                    <td className="p-3.5">
                      <code className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                        {item.target.targetType}:{item.target.targetId}
                      </code>
                    </td>
                    <td className="p-3.5">
                      <code className="rounded-md bg-slate-50 border border-slate-200 px-1.5 py-0.5 font-mono text-[10px] text-slate-500">
                        {item.traceReference ?? item.correlationReference ?? '—'}
                      </code>
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
            تحميل سجلات أقدم
          </button>
        </div>
      )}

      {selected && (
        <div className="rounded-3xl border border-[#21A7B4]/30 bg-white p-6 shadow-md">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileSearch className="h-5 w-5 text-[#21A7B4]" />
              <h3 className="font-black text-[#142B5F]">تفاصيل السجل المالي والتشغيلي · {selected.reference}</h3>
            </div>
            <button
              onClick={() => setSelected(null)}
              className="flex h-8 w-8 items-center justify-center rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <pre className="mt-4 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs font-mono text-cyan-200/90 leading-6" dir="ltr">
            {JSON.stringify(selected, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
