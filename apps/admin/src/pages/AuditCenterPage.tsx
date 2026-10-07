import { FormEvent, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { ShieldCheck, Download, Filter, RefreshCw, X, FileSearch, Copy } from 'lucide-react';

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
  lifecycleState?: string;
  chainReference?: string;
  complianceMetadata?: string[];
  retentionMetadata?: { retentionPeriodInDays: number; expiresAt: string };
}
interface AuditPage {
  items: AuditRecordDto[];
  hasMore: boolean;
  nextCursor: string | null;
}
interface IntegrityReport {
  status: 'PASS' | 'FAIL';
  checkedRecords: number;
  brokenChainReferences: string[];
  futureTimestamps: string[];
}
type Filters = {
  actorId: string;
  targetId: string;
  action: string;
  category: string;
  severity: string;
  correlationId: string;
  from: string;
  until: string;
};
const EMPTY_FILTERS: Filters = {
  actorId: '',
  targetId: '',
  action: '',
  category: '',
  severity: '',
  correlationId: '',
  from: '',
  until: '',
};
const fieldLabels: Array<[keyof Filters, string]> = [
  ['actorId', 'معرف الفاعل'],
  ['targetId', 'معرف الهدف'],
  ['action', 'الإجراء (مطابقة تامة)'],
  ['category', 'المجال (مطابقة تامة)'],
  ['correlationId', 'معرف الارتباط'],
];
const inputClass =
  'mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-xs outline-none focus:border-[#21A7B4]';

export function AuditCenterPage() {
  const [items, setItems] = useState<AuditRecordDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<AuditRecordDto | null>(null);
  const [filters, setFilters] = useState<Filters>({ ...EMPTY_FILTERS });
  const [applied, setApplied] = useState<Filters>({ ...EMPTY_FILTERS });
  const [integrity, setIntegrity] = useState<IntegrityReport | null>(null);
  const [integrityLoading, setIntegrityLoading] = useState(false);
  const [integrityError, setIntegrityError] = useState('');
  const [integrityCheckedAt, setIntegrityCheckedAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [notice, setNotice] = useState('');
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const integrityGeneration = useRef(0);
  const listBusy = useRef(false);
  const integrityBusy = useRef(false);
  const detailPanel = useRef<HTMLDivElement>(null);
  const pendingFilters = JSON.stringify(filters) !== JSON.stringify(applied);

  const load = async (reset = true, requested: Filters = applied) => {
    if (listBusy.current || (!reset && (!cursor || !hasMore))) return;
    let params: URLSearchParams;
    try {
      params = filterParams(requested);
    } catch (cause) {
      setError(message(cause));
      return;
    }
    listBusy.current = true;
    const request = ++listGeneration.current;
    setLoading(true);
    setError(null);
    setNotice('');
    if (reset) {
      setApplied({ ...requested });
      setItems([]);
      setCursor(null);
      setHasMore(false);
      setSelected(null);
      detailGeneration.current += 1;
      setDetailError('');
      setDetailLoading(false);
    } else if (cursor) params.set('cursor', cursor);
    params.set('limit', '50');
    try {
      const result = await adminApiClient.request<AuditPage>(`/admin/audit/records?${params}`, {
        cache: 'no-store',
      });
      if (request !== listGeneration.current) return;
      if (
        !result ||
        !Array.isArray(result.items) ||
        typeof result.hasMore !== 'boolean' ||
        (result.hasMore && (!result.nextCursor || (!reset && result.nextCursor === cursor)))
      )
        throw new Error('استجابة ترقيم السجلات غير صالحة.');
      setItems((previous) => [
        ...new Map(
          [...(reset ? [] : previous), ...result.items].map((item) => [item.id, item]),
        ).values(),
      ]);
      setCursor(result.nextCursor);
      setHasMore(result.hasMore);
    } catch (cause) {
      if (request === listGeneration.current) setError(message(cause));
    } finally {
      if (request === listGeneration.current) {
        listBusy.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load(true, EMPTY_FILTERS);
    return () => {
      listGeneration.current += 1;
      detailGeneration.current += 1;
      integrityGeneration.current += 1;
      listBusy.current = false;
      integrityBusy.current = false;
    };
  }, []);
  useEffect(() => {
    if (selected) {
      detailPanel.current?.focus();
      detailPanel.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [selected?.id]);

  const checkIntegrity = async () => {
    if (integrityBusy.current) return;
    integrityBusy.current = true;
    const request = ++integrityGeneration.current;
    setIntegrityLoading(true);
    setIntegrityError('');
    setIntegrity(null);
    try {
      const report = await adminApiClient.request<IntegrityReport>('/admin/audit/integrity', {
        cache: 'no-store',
      });
      if (
        !report ||
        !['PASS', 'FAIL'].includes(report.status) ||
        !Number.isSafeInteger(report.checkedRecords) ||
        !Array.isArray(report.brokenChainReferences) ||
        !Array.isArray(report.futureTimestamps)
      )
        throw new Error('استجابة فحص التدقيق غير صالحة.');
      if (request === integrityGeneration.current) {
        setIntegrity(report);
        setIntegrityCheckedAt(new Date().toISOString());
      }
    } catch (cause) {
      if (request === integrityGeneration.current) setIntegrityError(message(cause));
    } finally {
      if (request === integrityGeneration.current) {
        setIntegrityLoading(false);
        integrityBusy.current = false;
      }
    }
  };
  const showDetail = async (item: AuditRecordDto) => {
    const request = ++detailGeneration.current;
    setSelected(item);
    setDetailLoading(true);
    setDetailError('');
    setNotice('');
    try {
      const record = await adminApiClient.request<AuditRecordDto>(
        `/admin/audit/records/${encodeURIComponent(item.id)}`,
        { cache: 'no-store' },
      );
      if (!record || record.id !== item.id) throw new Error('السجل المسترجع لا يطابق الاختيار.');
      if (request === detailGeneration.current) setSelected(record);
    } catch (cause) {
      if (request === detailGeneration.current) setDetailError(message(cause));
    } finally {
      if (request === detailGeneration.current) setDetailLoading(false);
    }
  };
  const closeDetail = () => {
    detailGeneration.current += 1;
    setSelected(null);
    setDetailLoading(false);
    setDetailError('');
  };
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setNotice('تم نسخ المعرف.');
    } catch {
      setNotice('تعذر النسخ التلقائي؛ يمكنك تحديد المعرف ونسخه يدوياً.');
    }
  };
  const exportLoaded = () => {
    if (!items.length || loading) return;
    const rows = [
      [
        'timestamp',
        'reference',
        'actorId',
        'actorType',
        'action',
        'category',
        'severity',
        'targetType',
        'targetId',
        'source',
        'correlationReference',
        'traceReference',
      ],
      ...items.map((item) => [
        item.timestamp,
        item.reference,
        item.actor.actorId,
        item.actor.actorType,
        item.action,
        item.category,
        item.severity,
        item.target.targetType,
        item.target.targetId,
        item.source,
        item.correlationReference ?? '',
        item.traceReference ?? '',
      ]),
    ];
    const blob = new Blob(['\ufeff' + rows.map((row) => row.map(csvCell).join(',')).join('\r\n')], {
      type: 'text/csv;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `manaratak-audit-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice(`تم تصدير ${items.length} سجلاً محمّلاً وفق الفلاتر المطبقة.`);
  };
  const submit = (event: FormEvent) => {
    event.preventDefault();
    void load(true, filters);
  };
  const related = (correlationId: string) => {
    const next = { ...EMPTY_FILTERS, correlationId };
    setFilters(next);
    void load(true, next);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <section className="rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-lg sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-bold text-cyan-200">
              <ShieldCheck className="h-4 w-4" /> سجل التدقيق عبر أقسام المنصة
            </div>
            <h1 className="text-3xl font-black">مركز سجلات التدقيق</h1>
            <p className="mt-3 text-sm leading-7 text-cyan-50">
              استعراض الأحداث المحفوظة وربط العمليات بفاعليها وأهدافها. السجل للقراءة والتصدير.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={exportLoaded}
              disabled={loading || !items.length}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold disabled:opacity-50"
            >
              <Download className="h-4 w-4" /> تصدير المحمّل CSV ({items.length})
            </button>
            <button
              type="button"
              onClick={() => void load(true, applied)}
              disabled={loading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#21A7B4] px-4 text-xs font-bold disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث النتائج
            </button>
          </div>
        </div>
      </section>
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          تعذر تحميل النتائج: {error}
        </div>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-teal-50 p-3 text-sm text-teal-800">
          {notice}
        </p>
      )}
      <section className="rounded-3xl border border-slate-200 bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-black text-[#142B5F]">فحص ترابط السجلات والتواريخ</h2>
            <p className="mt-1 text-xs text-slate-500">
              يفحص المراجع السابقة والطوابع الزمنية لجميع السجلات؛ لا يفحص محتوى كل تعديل.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void checkIntegrity()}
            disabled={integrityLoading}
            className="min-h-11 rounded-xl bg-[#142B5F] px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            {integrityLoading ? 'جارٍ الفحص...' : 'فحص السجل'}
          </button>
        </div>
        <p
          role="status"
          className={`mt-3 text-sm font-bold ${integrity?.status === 'FAIL' ? 'text-rose-700' : 'text-[#0E7C86]'}`}
        >
          {integrityLoading
            ? 'يتم طلب التقرير من الخادم.'
            : integrity
              ? `${integrity.status === 'PASS' ? 'اجتاز الفحص' : 'رُصد خلل'} — ${integrity.checkedRecords} سجل مفحوص، ${integrity.brokenChainReferences.length} رابط غير صالح، ${integrity.futureTimestamps.length} طابع زمني مستقبلي. وقت التقرير: ${dateLabel(integrityCheckedAt)}`
              : integrityError
                ? 'تعذر إجراء الفحص؛ النتيجة غير معروفة.'
                : 'لم يُطلب الفحص بعد.'}
        </p>
        {integrityError && (
          <p role="alert" className="mt-2 text-xs text-amber-700">
            {integrityError}
          </p>
        )}
        {integrity?.status === 'FAIL' && (
          <details className="mt-3 text-xs">
            <summary className="cursor-pointer font-bold">المراجع التي تحتاج مراجعة</summary>
            <pre dir="ltr" className="mt-2 max-h-60 overflow-auto rounded-xl bg-slate-50 p-3">
              {JSON.stringify(
                {
                  brokenChainReferences: integrity.brokenChainReferences,
                  futureTimestamps: integrity.futureTimestamps,
                },
                null,
                2,
              )}
            </pre>
          </details>
        )}
      </section>
      <form onSubmit={submit} className="rounded-3xl border border-slate-200 bg-white p-5">
        <fieldset disabled={loading} className="grid min-w-0 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {fieldLabels.map(([key, label]) => (
            <label key={key} className="text-xs font-bold text-[#142B5F]">
              {label}
              <input
                value={filters[key]}
                maxLength={240}
                onChange={(event) =>
                  setFilters((previous) => ({ ...previous, [key]: event.target.value }))
                }
                className={inputClass}
              />
            </label>
          ))}
          <label className="text-xs font-bold text-[#142B5F]">
            درجة الخطورة
            <select
              value={filters.severity}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, severity: event.target.value }))
              }
              className={inputClass}
            >
              <option value="">جميع الدرجات</option>
              {['INFO', 'WARNING', 'ERROR', 'CRITICAL'].map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-[#142B5F]">
            من — بتوقيت اليمن
            <input
              type="datetime-local"
              value={filters.from}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, from: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="text-xs font-bold text-[#142B5F]">
            إلى — بتوقيت اليمن
            <input
              type="datetime-local"
              value={filters.until}
              onChange={(event) =>
                setFilters((previous) => ({ ...previous, until: event.target.value }))
              }
              className={inputClass}
            />
          </label>
          <button
            type="submit"
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-bold text-white disabled:opacity-50"
          >
            <Filter className="h-4 w-4" /> تطبيق الفلاتر
          </button>
          <button
            type="button"
            onClick={() => {
              setFilters({ ...EMPTY_FILTERS });
              void load(true, EMPTY_FILTERS);
            }}
            className="min-h-11 rounded-xl border border-slate-200 px-4 text-xs font-bold text-[#142B5F]"
          >
            عرض جميع الحالات
          </button>
        </fieldset>
        <p className="mt-3 text-xs text-slate-500">
          {pendingFilters
            ? 'هناك فلاتر معدّلة لم تُطبّق؛ النتائج والتصدير ما زالا وفق الفلاتر السابقة.'
            : 'النتائج مطابقة للفلاتر المطبقة. تُحمّل 50 نتيجة في كل دفعة.'}
        </p>
      </form>
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 bg-slate-50 px-5 py-4">
          <h2 className="font-black text-[#142B5F]">السجلات المحمّلة ({items.length})</h2>
          <p className="mt-1 text-xs text-slate-500">
            هذا عدد النتائج المحمّلة، وليس إجمالي السجل. افتح التفاصيل لعرض بيانات الحدث.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                {[
                  'الوقت والتاريخ',
                  'الفاعل',
                  'الإجراء',
                  'المجال / الخطورة',
                  'الهدف',
                  'التفاصيل',
                ].map((label) => (
                  <th key={label} className="p-3.5 text-start">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!items.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    {loading
                      ? 'جارٍ تحميل السجلات...'
                      : error
                        ? 'تعذر الحصول على النتائج؛ أعد المحاولة.'
                        : 'لا توجد سجلات مطابقة للفلاتر المطبقة.'}
                  </td>
                </tr>
              )}
              {items.map((item) => (
                <tr key={item.id} className="hover:bg-teal-50/40">
                  <td className="whitespace-nowrap p-3.5">{dateLabel(item.timestamp)}</td>
                  <td className="p-3.5">
                    <code>{item.actor.actorId}</code>
                    <div className="mt-1 text-slate-400">{item.actor.actorType}</div>
                  </td>
                  <td className="p-3.5 font-bold text-[#142B5F]">{item.action}</td>
                  <td className="p-3.5 font-bold text-[#0E7C86]">
                    {item.category}
                    <span className="mt-1 block text-xs text-slate-500">{item.severity}</span>
                  </td>
                  <td className="p-3.5">
                    <code>
                      {item.target.targetType}:{item.target.targetId}
                    </code>
                  </td>
                  <td className="p-3.5">
                    <button
                      type="button"
                      onClick={() => void showDetail(item)}
                      className="inline-flex min-h-10 items-center gap-1 rounded-lg border px-3 text-[#142B5F]"
                      aria-label={`عرض تفاصيل ${item.reference}`}
                    >
                      <FileSearch className="h-4 w-4" /> عرض
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {hasMore && (
        <div className="text-center">
          <button
            type="button"
            disabled={loading || pendingFilters}
            onClick={() => void load(false, applied)}
            className="min-h-11 rounded-2xl border border-slate-200 bg-white px-6 text-xs font-bold text-[#142B5F] disabled:opacity-50"
          >
            {loading ? 'جارٍ التحميل...' : 'تحميل سجلات أقدم'}
          </button>
        </div>
      )}
      {selected && (
        <div
          ref={detailPanel}
          tabIndex={-1}
          aria-labelledby="audit-detail-title"
          className="rounded-3xl border border-[#21A7B4]/30 bg-white p-6 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-4">
            <h3 id="audit-detail-title" className="font-black text-[#142B5F]">
              تفاصيل الحدث · {selected.reference}
            </h3>
            <button
              type="button"
              onClick={closeDetail}
              aria-label="إغلاق تفاصيل الحدث"
              className="flex h-10 w-10 items-center justify-center rounded-full hover:bg-slate-100"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {detailLoading && (
            <p role="status" className="mt-3 text-xs text-slate-500">
              جارٍ إعادة قراءة السجل من الخادم...
            </p>
          )}
          {detailError && (
            <p role="alert" className="mt-3 text-xs text-amber-700">
              تعذر تحديث التفاصيل؛ المعروض هو السجل من القائمة: {detailError}
            </p>
          )}
          <dl className="mt-4 grid gap-4 text-xs sm:grid-cols-2 lg:grid-cols-3">
            {[
              ['معرف السجل', selected.id],
              ['الفاعل', `${selected.actor.actorType}: ${selected.actor.actorId}`],
              ['الهدف', `${selected.target.targetType}: ${selected.target.targetId}`],
              ['الوقت — اليمن', dateLabel(selected.timestamp)],
              ['الإجراء', selected.action],
              ['المجال', selected.category],
              ['الخطورة', selected.severity],
              ['المصدر', selected.source],
              ['حالة السجل', selected.lifecycleState || '—'],
              ['معرف الارتباط', selected.correlationReference || '—'],
              ['معرف التتبع', selected.traceReference || '—'],
              ['مرجع السجل السابق', selected.chainReference || '—'],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="font-bold text-[#0E7C86]">{label}</dt>
                <dd className="mt-1 break-all leading-6 text-slate-700">{value}</dd>
              </div>
            ))}
          </dl>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => void copy(selected.id)}
              className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3 text-xs"
            >
              <Copy className="h-4 w-4" /> نسخ معرف السجل
            </button>
            {selected.correlationReference && (
              <button
                type="button"
                disabled={loading}
                onClick={() => related(selected.correlationReference!)}
                className="min-h-10 rounded-lg bg-teal-50 px-3 text-xs font-bold text-[#0E7C86]"
              >
                عرض أحداث العملية المرتبطة
              </button>
            )}
          </div>
          <details className="mt-4" open>
            <summary className="cursor-pointer text-sm font-bold text-[#142B5F]">
              بيانات الحدث المحفوظة
            </summary>
            <pre
              className="mt-3 max-h-96 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-cyan-200"
              dir="ltr"
            >
              {JSON.stringify(selected, null, 2)}
            </pre>
          </details>
        </div>
      )}
    </div>
  );
}
function filterParams(filters: Filters): URLSearchParams {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (!value.trim()) continue;
    if (key === 'from' || key === 'until') {
      // The date fields are explicitly entered in Yemen time (UTC+03:00).
      const date = new Date(`${value}${value.length === 16 ? ':00' : ''}+03:00`);
      if (key === 'until' && value.length === 16) date.setTime(date.getTime() + 59_999);
      if (!Number.isFinite(date.getTime())) throw new Error('أدخل تاريخاً صالحاً.');
      params.set(key, date.toISOString());
    } else params.set(key, value.trim());
  }
  if (params.get('from') && params.get('until') && params.get('from')! > params.get('until')!)
    throw new Error('تاريخ البداية يجب أن يسبق تاريخ النهاية.');
  return params;
}
function dateLabel(value: string): string {
  const date = new Date(value);
  return Number.isFinite(date.getTime())
    ? date.toLocaleString('ar-YE', { timeZone: 'Asia/Aden' })
    : '—';
}
function message(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'تعذر إكمال الطلب.';
}
function csvCell(value: string): string {
  const safe = /^[\s]*[=+\-@]/.test(value) || /^[\t\r]/.test(value) ? `'${value}` : value;
  return `"${safe.replaceAll('"', '""')}"`;
}
