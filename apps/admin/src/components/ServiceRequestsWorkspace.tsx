import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ServiceRequestStatus,
  type ServiceRequestDto,
  type ServiceCatalogItemDto,
} from '@manaratak/domain';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

type Page = { data: ServiceRequestDto[]; total: number; page: number; totalPages: number };
const transitions: Record<ServiceRequestStatus, ServiceRequestStatus[]> = {
  REQUESTED: [ServiceRequestStatus.ACCEPTED, ServiceRequestStatus.CANCELLED],
  ACCEPTED: [
    ServiceRequestStatus.IN_PROGRESS,
    ServiceRequestStatus.AWAITING_PAYMENT,
    ServiceRequestStatus.CANCELLED,
  ],
  IN_PROGRESS: [
    ServiceRequestStatus.AWAITING_PAYMENT,
    ServiceRequestStatus.COMPLETED,
    ServiceRequestStatus.CANCELLED,
  ],
  AWAITING_PAYMENT: [
    ServiceRequestStatus.IN_PROGRESS,
    ServiceRequestStatus.COMPLETED,
    ServiceRequestStatus.CANCELLED,
  ],
  COMPLETED: [],
  CANCELLED: [],
};
const labels: Record<string, string> = {
  REQUESTED: 'طلب جديد',
  ACCEPTED: 'مقبول',
  IN_PROGRESS: 'قيد التنفيذ',
  AWAITING_PAYMENT: 'بانتظار الدفع',
  COMPLETED: 'مكتمل',
  CANCELLED: 'ملغى',
};
function date(value?: Date | string | null) {
  const parsed = value ? new Date(value) : null;
  return parsed && !Number.isNaN(parsed.getTime()) ? parsed.toLocaleString('ar') : '—';
}
const errorText = (cause: unknown) =>
  cause instanceof Error ? cause.message : 'تعذر تنفيذ العملية.';

export function ServiceRequestsWorkspace({
  onBusyChange,
  onDirtyChange,
}: {
  onBusyChange: (busy: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams();
  const reference = params.get('request') || '';
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Page | null>(null);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [detail, setDetail] = useState<ServiceRequestDto | null>(null);
  const [service, setService] = useState<ServiceCatalogItemDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [provider, setProvider] = useState('');
  const [note, setNote] = useState('');
  const [invoiceAmount, setInvoiceAmount] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [scale, setScale] = useState('2');
  const [quantity, setQuantity] = useState('1');
  const sequence = useRef(0);
  const detailSequence = useRef(0);
  const mutation = useRef(false);
  const activeReference = useRef(reference);
  activeReference.current = reference;
  const anchor = useRef<HTMLDivElement>(null);
  const dirty = Boolean(
    note.trim() ||
    (detail && provider !== (detail.providerReferenceId || '')) ||
    invoiceAmount.trim(),
  );
  useEffect(() => {
    onBusyChange(saving);
    return () => onBusyChange(false);
  }, [saving, onBusyChange]);
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setListError(null);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (status) query.set('status', status);
      if (search) query.set('search', search);
      const next = await adminApiClient.request<Page>(`/admin/services/requests?${query}`);
      if (request === sequence.current) {
        if (next.totalPages > 0 && page > next.totalPages) setPage(next.totalPages);
        else setResult(next);
      }
    } catch (cause) {
      if (request === sequence.current) setListError(errorText(cause));
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [page, status, search]);
  useEffect(() => {
    void load();
    return () => {
      ++sequence.current;
    };
  }, [load]);

  const inspect = useCallback(async (ref: string) => {
    const request = ++detailSequence.current;
    setDetailLoading(true);
    setDetailError(null);
    setDetail(null);
    setService(null);
    try {
      const next = await adminApiClient.request<ServiceRequestDto>(
        `/admin/services/requests/${encodeURIComponent(ref)}`,
      );
      if (request !== detailSequence.current) return;
      setDetail(next);
      setProvider(next.providerReferenceId || '');
      setNote('');
      try {
        const owner = await adminApiClient.request<ServiceCatalogItemDto>(
          `/admin/services/${encodeURIComponent(next.serviceId)}`,
        );
        if (request === detailSequence.current) setService(owner);
      } catch {
        /* Request remains usable if the catalog owner is unavailable. */
      }
      return true;
    } catch (cause) {
      if (request === detailSequence.current) setDetailError(errorText(cause));
      return false;
    } finally {
      if (request === detailSequence.current) setDetailLoading(false);
    }
  }, []);
  useEffect(() => {
    if (reference) void inspect(reference);
    else {
      ++detailSequence.current;
      setDetail(null);
      setDetailError(null);
      setService(null);
    }
    return () => {
      ++detailSequence.current;
    };
  }, [reference, inspect]);
  useEffect(() => {
    if (detail) anchor.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [detail?.id]);
  function choose(ref: string) {
    if (saving) return;
    if (dirty && !window.confirm('لديك بيانات غير محفوظة للطلب. الانتقال دون حفظ؟')) return;
    const next = new URLSearchParams(params);
    if (ref) next.set('request', ref);
    else next.delete('request');
    setParams(next);
    setNotice(null);
    setInvoiceAmount('');
    setNote('');
  }
  async function command(action: string, body: Record<string, unknown>, message: string) {
    if (!detail || mutation.current) return;
    mutation.current = true;
    setSaving(true);
    setDetailError(null);
    setNotice(null);
    const current = detail;
    const currentReference = reference;
    const draftNote = note;
    const draftProvider = provider;
    try {
      await adminApiClient.request(
        `/admin/services/requests/${encodeURIComponent(current.id)}/${action}`,
        { method: 'POST', body: JSON.stringify({ ...body, expectedVersion: current.version }) },
      );
      if (activeReference.current !== currentReference) return;
      const reloaded = await inspect(current.id);
      if (action !== 'transition') setNote(draftNote);
      if (action !== 'provider') setProvider(draftProvider);
      if (action === 'finance-invoice') setInvoiceAmount('');
      await load();
      setNotice(
        reloaded
          ? message
          : 'حُفظت العملية، لكن تعذرت إعادة قراءة الطلب. أعد تحميله قبل متابعة التعديلات.',
      );
    } catch (cause) {
      const message = errorText(cause);
      if (message.includes('VERSION_CONFLICT')) {
        await inspect(current.id);
        setDetailError(
          'تغيّر الطلب في جلسة أخرى. أعدنا تحميل نسخته الحالية؛ راجع البيانات قبل المحاولة.',
        );
      } else setDetailError(message);
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }
  async function transition(target: ServiceRequestStatus) {
    if (detail && provider !== (detail.providerReferenceId || '')) {
      setDetailError('احفظ إسناد المزود أولاً قبل تغيير حالة الطلب.');
      return;
    }
    if (!window.confirm(`تغيير حالة الطلب إلى «${labels[target]}»؟`)) return;
    await command(
      'transition',
      {
        status: target,
        fulfillmentMetadata: {
          ...(detail?.fulfillmentMetadata || {}),
          ...(note.trim() ? { administrativeNote: note.trim() } : {}),
        },
      },
      'تم تحديث حالة الطلب وإعادة قراءة بياناته.',
    );
  }
  async function invoice(event: FormEvent) {
    event.preventDefault();
    if (!/^\d+$/.test(invoiceAmount) || /^0+$/.test(invoiceAmount)) {
      setDetailError('أدخل مبلغاً صحيحاً موجباً بالوحدات الصغرى.');
      return;
    }
    await command(
      'finance-invoice',
      {
        amountMinorUnits: invoiceAmount,
        currencyCode: currency.trim().toUpperCase(),
        scale: Number(scale),
        quantity: Number(quantity),
      },
      'تم إنشاء وربط مسودة الفاتورة؛ إصدارها وتحصيلها يتمان من قسم المالية.',
    );
  }
  const closed =
    detail &&
    [ServiceRequestStatus.COMPLETED, ServiceRequestStatus.CANCELLED].includes(detail.status);
  return (
    <div dir="rtl" className="space-y-5">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          query.trim() === search ? void load() : setSearch(query.trim());
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"
      >
        <label className="flex-1 text-xs font-bold">
          رقم الطلب أو معرف الطالب أو الخدمة
          <input
            value={query}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="text-xs font-bold">
          الحالة
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="mt-2 block rounded-xl border p-3"
          >
            <option value="">الكل</option>
            {Object.values(ServiceRequestStatus).map((value) => (
              <option key={value} value={value}>
                {labels[value]}
              </option>
            ))}
          </select>
        </label>
        <button className="rounded-xl bg-[#142B5F] px-4 py-3 text-sm font-bold text-white">
          بحث
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-xl border px-4 py-3 text-sm"
        >
          تحديث
        </button>
      </form>
      {listError && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {listError}
        </p>
      )}
      <section className="overflow-hidden rounded-2xl border bg-white">
        <h2 className="border-b p-4 font-bold text-[#142B5F]">
          طلبات الطلاب {result && !loading ? `(${result.total})` : ''}
        </h2>
        {loading ? (
          <p className="p-8 text-center">جارٍ تحميل الطلبات…</p>
        ) : !listError && !result?.data.length ? (
          <p className="p-8 text-center text-slate-500">لا توجد طلبات مطابقة.</p>
        ) : (
          !listError && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {['الطلب', 'الطالب', 'الحالة', 'آخر تحديث', ''].map((title, index) => (
                      <th key={index} className="p-3">
                        {title}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result?.data.map((row) => (
                    <tr
                      key={row.id}
                      className={`border-t ${detail?.id === row.id ? 'bg-teal-50' : ''}`}
                    >
                      <td className="max-w-56 break-all p-3 text-xs">{row.publicId}</td>
                      <td className="max-w-48 break-all p-3 text-xs">
                        {hasPermission('admin:students:support') ? (
                          <Link
                            className="text-teal-700 underline"
                            to={`/students?student=${encodeURIComponent(row.studentReferenceId)}`}
                          >
                            {row.studentReferenceId}
                          </Link>
                        ) : (
                          row.studentReferenceId
                        )}
                      </td>
                      <td className="p-3">{labels[row.status]}</td>
                      <td className="whitespace-nowrap p-3 text-xs">{date(row.updatedAt)}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => choose(row.publicId)}
                          className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"
                        >
                          متابعة
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}
        {result && (
          <div className="flex justify-between gap-3 border-t p-4 text-xs">
            <button disabled={loading || page <= 1} onClick={() => setPage((value) => value - 1)}>
              السابق
            </button>
            <span>
              {page} / {Math.max(1, result.totalPages)}
            </span>
            <button
              disabled={loading || page >= result.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              التالي
            </button>
          </div>
        )}
      </section>
      {reference && (
        <section ref={anchor} className="space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-[#142B5F]">تفاصيل الطلب</h2>
            <button disabled={saving} onClick={() => choose('')}>
              إغلاق
            </button>
          </div>
          {detailLoading && <p>جارٍ تحميل تفاصيل الطلب…</p>}
          {detailError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {detailError}
            </p>
          )}
          {!detailLoading && !detail && detailError && (
            <button onClick={() => void inspect(reference)} className="text-teal-700 underline">
              إعادة المحاولة
            </button>
          )}
          {notice && (
            <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {notice}
            </p>
          )}
          {detail && !detailLoading && (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-slate-500">الخدمة</p>
                  <p className="mt-1 font-bold">{service?.displayName || detail.serviceId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">الحالة</p>
                  <p className="mt-1 font-bold">{labels[detail.status]}</p>
                </div>
                <div className="break-all text-xs">رقم الطلب: {detail.publicId}</div>
                <div className="text-xs">
                  إنشاء: {date(detail.createdAt)} · إتمام: {date(detail.completedAt)}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {hasPermission('admin:students:support') && (
                  <Link
                    to={`/students?student=${encodeURIComponent(detail.studentReferenceId)}`}
                    className="text-teal-700 underline"
                  >
                    ملف الطالب
                  </Link>
                )}
                {detail.financeInvoiceId && hasPermission('admin:finance:manage') && (
                  <Link
                    to={`/finance/invoices/${encodeURIComponent(detail.financeInvoiceId)}`}
                    className="text-teal-700 underline"
                  >
                    الفاتورة {detail.financeInvoicePublicId}
                  </Link>
                )}
              </div>
              <Data title="بيانات طلب الطالب" value={detail.requestParameters} />
              <Data title="بيانات التنفيذ" value={detail.fulfillmentMetadata} />
              {!closed && (
                <fieldset disabled={saving} className="space-y-4 border-t pt-4">
                  <label className="block text-xs font-bold">
                    ملاحظة التنفيذ
                    <textarea
                      value={note}
                      maxLength={4000}
                      onChange={(event) => setNote(event.target.value)}
                      className="mt-2 w-full rounded-xl border p-3 text-sm"
                      placeholder="تُحفظ مع انتقال الحالة وتظهر للطالب ضمن تفاصيل التنفيذ."
                    />
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {transitions[detail.status].map((target) => (
                      <button
                        key={target}
                        type="button"
                        onClick={() => void transition(target)}
                        className={`rounded-xl px-4 py-2 text-xs font-bold ${target === ServiceRequestStatus.CANCELLED ? 'bg-rose-50 text-rose-800' : 'bg-[#142B5F] text-white'}`}
                      >
                        {labels[target]}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    استئناف أو إتمام طلب مرتبط بفاتورة يخضع للتحقق المالي من الخادم.
                  </p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (provider.trim())
                        void command(
                          'provider',
                          { providerReferenceId: provider.trim() },
                          'تم إسناد المزود وإعادة تحميل الطلب.',
                        );
                    }}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <label className="flex-1 text-xs font-bold">
                      معرف المزود
                      <input
                        value={provider}
                        maxLength={200}
                        onChange={(event) => setProvider(event.target.value)}
                        className="mt-2 w-full rounded-xl border p-3 text-sm"
                      />
                    </label>
                    <button
                      disabled={!provider.trim()}
                      className="rounded-xl border px-4 py-3 text-xs font-bold"
                    >
                      حفظ الإسناد
                    </button>
                  </form>
                  {!detail.financeInvoiceId && hasPermission('admin:finance:manage') && (
                    <form onSubmit={invoice} className="space-y-3 rounded-xl bg-slate-50 p-4">
                      <h3 className="text-sm font-bold">إنشاء مسودة فاتورة مرتبطة</h3>
                      <div className="grid gap-3 sm:grid-cols-4">
                        <label className="text-xs">
                          سعر الوحدة بالوحدات الصغرى
                          <input
                            required
                            inputMode="numeric"
                            pattern="[0-9]+"
                            value={invoiceAmount}
                            onChange={(event) => setInvoiceAmount(event.target.value)}
                            className="mt-1 w-full rounded-lg border p-2"
                          />
                        </label>
                        <label className="text-xs">
                          العملة
                          <input
                            required
                            minLength={3}
                            maxLength={3}
                            pattern="[A-Za-z]{3}"
                            value={currency}
                            onChange={(event) => setCurrency(event.target.value)}
                            className="mt-1 w-full rounded-lg border p-2"
                          />
                        </label>
                        <label className="text-xs">
                          المنازل العشرية
                          <input
                            type="number"
                            min={0}
                            max={6}
                            required
                            value={scale}
                            onChange={(event) => setScale(event.target.value)}
                            className="mt-1 w-full rounded-lg border p-2"
                          />
                        </label>
                        <label className="text-xs">
                          الكمية
                          <input
                            type="number"
                            min={1}
                            max={100}
                            required
                            value={quantity}
                            onChange={(event) => setQuantity(event.target.value)}
                            className="mt-1 w-full rounded-lg border p-2"
                          />
                        </label>
                      </div>
                      <p className="text-xs text-slate-500">
                        مثال: 1500 مع منزلتين عشريتين = 15.00 لكل وحدة. لن تُصدر الفاتورة أو يُسجل
                        سداد تلقائياً.
                      </p>
                      <button className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">
                        إنشاء مسودة الفاتورة
                      </button>
                    </form>
                  )}
                </fieldset>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Data({ title, value }: { title: string; value?: Record<string, unknown> | null }) {
  return (
    <section className="rounded-xl border p-4">
      <h3 className="mb-3 text-sm font-bold">{title}</h3>
      {!value || !Object.keys(value).length ? (
        <p className="text-xs text-slate-500">لا توجد بيانات إضافية.</p>
      ) : (
        <dl className="space-y-3">
          {Object.entries(value).map(([key, content]) => (
            <div key={key}>
              <dt className="break-words text-xs font-bold text-teal-700">{key}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words text-sm">
                {typeof content === 'object'
                  ? JSON.stringify(content, null, 2)
                  : String(content ?? '—')}
              </dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
