import { ServiceRequestServiceFilter } from './ServiceRequestServiceFilter';
import { ManagedApplicationEvidenceEditor } from './ManagedApplicationEvidenceEditor';
import { serviceText } from '../i18n/serviceText';
import { ServiceCaseQueue } from './ServiceCaseQueue';
import { useTranslation } from '../i18n/I18nProvider';
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
  const { language, dir } = useTranslation();
  const [params, setParams] = useSearchParams();
  const reference = params.get('request') || '';
  const [studentFilter, setStudentFilter] = useState(params.get('studentReferenceId') ?? '');
  const [serviceFilter, setServiceFilter] = useState(params.get('serviceId') ?? '');
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [overdue, setOverdue] = useState(false);
  const [timeline, setTimeline] = useState<
    Array<{ id: string; eventType: string; createdAt: string }>
  >([]);
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
  const sequence = useRef(0);
  const detailSequence = useRef(0);
  const mutation = useRef(false);
  const activeReference = useRef(reference);
  activeReference.current = reference;
  const anchor = useRef<HTMLDivElement>(null);
  const dirty = Boolean(note.trim() || (detail && provider !== (detail.providerReferenceId || '')));
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
      if (overdue) query.set('overdue', 'true');
      if (studentFilter) query.set('studentReferenceId', studentFilter);
      if (serviceFilter) query.set('serviceId', serviceFilter);
      if (search) query.set('search', search);
      const next = await adminApiClient.request<Page>(`/admin/services/requests?${query}`);
      if (request === sequence.current) {
        if (next.totalPages > 0 && page > next.totalPages) setPage(next.totalPages);
        else setResult(next);
      }
    } catch (cause) {
      if (request === sequence.current) setListError(serviceText(errorText(cause), language));
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [page, status, search, studentFilter, serviceFilter, overdue]);
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
      void adminApiClient
        .request<{ data: typeof timeline }>(
          `/admin/services/requests/${encodeURIComponent(next.id)}/timeline`,
        )
        .then((result) => {
          if (request === detailSequence.current) setTimeline(result.data);
        })
        .catch(() => {
          if (request === detailSequence.current) setTimeline([]);
        });
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
      if (request === detailSequence.current)
        setDetailError(serviceText(errorText(cause), language));
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
  }, [detail]);
  function choose(ref: string) {
    if (saving) return;
    if (
      dirty &&
      !window.confirm(serviceText('لديك بيانات غير محفوظة للطلب. الانتقال دون حفظ؟', language))
    )
      return;
    const next = new URLSearchParams(params);
    if (ref) next.set('request', ref);
    else next.delete('request');
    setParams(next);
    setNotice(null);
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
      await load();
      setNotice(
        reloaded
          ? message
          : serviceText(
              'حُفظت العملية، لكن تعذرت إعادة قراءة الطلب. أعد تحميله قبل متابعة التعديلات.',
              language,
            ),
      );
    } catch (cause) {
      const message = serviceText(errorText(cause), language);
      if (message.includes('VERSION_CONFLICT')) {
        await inspect(current.id);
        setDetailError(
          serviceText(
            'تغيّر الطلب في جلسة أخرى. أعدنا تحميل نسخته الحالية؛ راجع البيانات قبل المحاولة.',
            language,
          ),
        );
      } else setDetailError(message);
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  }
  async function transition(target: ServiceRequestStatus) {
    if (detail && provider !== (detail.providerReferenceId || '')) {
      setDetailError(serviceText('احفظ إسناد المزود أولاً قبل تغيير حالة الطلب.', language));
      return;
    }
    if (!window.confirm(`تغيير حالة الطلب إلى «${serviceText(labels[target], language)}»؟`)) return;
    await command(
      'transition',
      {
        status: target,
        fulfillmentMetadata: {
          ...(detail?.fulfillmentMetadata || {}),
          ...(note.trim() ? { administrativeNote: note.trim() } : {}),
        },
      },
      serviceText('تم تحديث حالة الطلب وإعادة قراءة بياناته.', language),
    );
  }
  async function invoice(event: FormEvent) {
    event.preventDefault();
    try {
      const quote = await adminApiClient.request<{
        amountMinorUnits: string;
        currencyCode: string;
        scale: number;
        quantity: number;
      }>(`/admin/services/requests/${encodeURIComponent(detail!.id)}/quote`);
      await command(
        'finance-invoice',
        {
          amountMinorUnits: quote.amountMinorUnits,
          currencyCode: quote.currencyCode,
          scale: quote.scale,
          quantity: 1,
        },
        serviceText(
          'تم إنشاء وربط مسودة الفاتورة؛ إصدارها وتحصيلها يتمان من قسم المالية.',
          language,
        ),
      );
    } catch (cause) {
      setDetailError(serviceText(errorText(cause), language));
    }
  }
  const closed =
    (detail &&
      [ServiceRequestStatus.COMPLETED, ServiceRequestStatus.CANCELLED].includes(detail.status)) ||
    !hasPermission('admin:services:requests:fulfill');
  return (
    <div dir={dir} className="space-y-5">
      {hasPermission('admin:services:requests:assign') && (
        <ServiceCaseQueue
          onClaim={(ref) => {
            choose(ref);
            void load();
          }}
        />
      )}
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setPage(1);
          query.trim() === search ? void load() : setSearch(query.trim());
        }}
        className="flex flex-wrap items-end gap-3 rounded-2xl border bg-white p-4"
      >
        <label className="flex-1 text-xs font-bold">
          {serviceText('رقم الطلب أو معرف الطالب أو الخدمة', language)}
          <input
            value={query}
            maxLength={120}
            onChange={(event) => setQuery(event.target.value)}
            className="mt-2 w-full rounded-xl border p-3"
          />
        </label>
        <label className="text-xs font-bold">
          {serviceText('معرف الطالب', language)}
          <input
            className="block rounded-xl border p-3"
            value={studentFilter}
            onChange={(e) => {
              setStudentFilter(e.target.value);
              setPage(1);
              setParams((previous) => {
                const next = new URLSearchParams(previous);
                e.target.value
                  ? next.set('studentReferenceId', e.target.value)
                  : next.delete('studentReferenceId');
                return next;
              });
            }}
          />
        </label>
        <ServiceRequestServiceFilter
          value={serviceFilter}
          language={language}
          onChange={(id) => {
            setServiceFilter(id);
            setPage(1);
            setParams((previous) => {
              const next = new URLSearchParams(previous);
              id ? next.set('serviceId', id) : next.delete('serviceId');
              return next;
            });
          }}
        />
        <label className="text-xs font-bold">
          {serviceText('الحالة', language)}
          <select
            value={status}
            onChange={(event) => {
              setStatus(event.target.value);
              setPage(1);
            }}
            className="mt-2 block rounded-xl border p-3"
          >
            <option value="">{serviceText('الكل', language)}</option>
            {Object.values(ServiceRequestStatus).map((value) => (
              <option key={value} value={value}>
                {serviceText(labels[value], language)}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={overdue}
            onChange={(event) => {
              setOverdue(event.target.checked);
              setPage(1);
            }}
          />
          {language === 'ar' ? serviceText('تجاوزت مهلة التنفيذ', language) : 'Overdue requests'}
        </label>
        <button className="rounded-xl bg-[#142B5F] px-4 py-3 text-sm font-bold text-white">
          {serviceText('بحث', language)}
        </button>
        <button
          type="button"
          disabled={loading}
          onClick={() => void load()}
          className="rounded-xl border px-4 py-3 text-sm"
        >
          {serviceText('تحديث', language)}
        </button>
      </form>
      {detail && (
        <section className="rounded-2xl border p-4">
          <p>
            {language === 'ar' ? serviceText('مهلة التنفيذ:', language) : 'Delivery deadline:'}{' '}
            {date(detail.dueAt)}
          </p>
          <p>
            {detail.cancellationState === 'PENDING_FINANCE'
              ? language === 'ar'
                ? serviceText('الإلغاء ينتظر معالجة المالية.', language)
                : 'Cancellation awaits Finance settlement.'
              : ''}
          </p>
          <ol>
            {timeline.map((event) => (
              <li key={event.id}>
                {date(event.createdAt)} — {event.eventType}
              </li>
            ))}
          </ol>
        </section>
      )}
      {listError && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-800">
          {listError}
        </p>
      )}
      <section className="overflow-hidden rounded-2xl border bg-white">
        <h2 className="border-b p-4 font-bold text-[#142B5F]">
          {serviceText('طلبات الطلاب', language)}
          {result && !loading ? `(${result.total})` : ''}
        </h2>
        {loading ? (
          <p className="p-8 text-center">{serviceText('جارٍ تحميل الطلبات…', language)}</p>
        ) : !listError && !result?.data.length ? (
          <p className="p-8 text-center text-slate-500">
            {serviceText('لا توجد طلبات مطابقة.', language)}
          </p>
        ) : (
          !listError && (
            <div className="overflow-x-auto">
              <table className="w-full text-right text-sm">
                <thead className="bg-slate-50">
                  <tr>
                    {[
                      serviceText('الطلب', language),
                      serviceText('الطالب', language),
                      serviceText('الحالة', language),
                      serviceText('آخر تحديث', language),
                      '',
                    ].map((title, index) => (
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
                      <td className="p-3">{serviceText(labels[row.status], language)}</td>
                      <td className="whitespace-nowrap p-3 text-xs">{date(row.updatedAt)}</td>
                      <td className="p-3">
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => choose(row.publicId)}
                          className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50"
                        >
                          {serviceText('متابعة', language)}
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
              {serviceText('السابق', language)}
            </button>
            <span>
              {page} / {Math.max(1, result.totalPages)}
            </span>
            <button
              disabled={loading || page >= result.totalPages}
              onClick={() => setPage((value) => value + 1)}
            >
              {serviceText('التالي', language)}
            </button>
          </div>
        )}
      </section>
      {reference && (
        <section ref={anchor} className="space-y-4 rounded-2xl border bg-white p-4 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-bold text-[#142B5F]">{serviceText('تفاصيل الطلب', language)}</h2>
            <button disabled={saving} onClick={() => choose('')}>
              {serviceText('إغلاق', language)}
            </button>
          </div>
          {detailLoading && <p>{serviceText('جارٍ تحميل تفاصيل الطلب…', language)}</p>}
          {detailError && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-800">
              {detailError}
            </p>
          )}
          {!detailLoading && !detail && detailError && (
            <button onClick={() => void inspect(reference)} className="text-teal-700 underline">
              {serviceText('إعادة المحاولة', language)}
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
                  <p className="text-xs text-slate-500">{serviceText('الخدمة', language)}</p>
                  <p className="mt-1 font-bold">{service?.displayName || detail.serviceId}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">{serviceText('الحالة', language)}</p>
                  <p className="mt-1 font-bold">{serviceText(labels[detail.status], language)}</p>
                </div>
                <div className="break-all text-xs">
                  {serviceText('رقم الطلب:', language)}
                  {detail.publicId}
                </div>
                <div className="text-xs">
                  {serviceText('إنشاء:', language)}
                  {date(detail.createdAt)}
                  {serviceText('· إتمام:', language)}
                  {date(detail.completedAt)}
                </div>
              </div>
              <div className="flex flex-wrap gap-3 text-sm">
                {hasPermission('admin:students:support') && (
                  <Link
                    to={`/students?student=${encodeURIComponent(detail.studentReferenceId)}`}
                    className="text-teal-700 underline"
                  >
                    {serviceText('ملف الطالب', language)}
                  </Link>
                )}
                {detail.financeInvoiceId && hasPermission('admin:finance:invoice:manage') && (
                  <Link
                    to={`/finance/invoices/${encodeURIComponent(detail.financeInvoiceId)}`}
                    className="text-teal-700 underline"
                  >
                    {serviceText('الفاتورة', language)}
                    {detail.financeInvoicePublicId}
                  </Link>
                )}
              </div>
              <Data
                title={serviceText('بيانات طلب الطالب', language)}
                value={detail.requestParameters}
              />
              <Data
                title={serviceText('بيانات التنفيذ', language)}
                value={detail.fulfillmentMetadata}
              />
              <ManagedApplicationEvidenceEditor key={`${detail.id}:${detail.version}`} request={detail} onBusy={setSaving} onSaved={async()=>{await inspect(detail.id);await load();}} />
              {!closed && (
                <fieldset disabled={saving} className="space-y-4 border-t pt-4">
                  <label className="block text-xs font-bold">
                    {serviceText('ملاحظة التنفيذ', language)}
                    <textarea
                      value={note}
                      maxLength={4000}
                      onChange={(event) => setNote(event.target.value)}
                      className="mt-2 w-full rounded-xl border p-3 text-sm"
                      placeholder={serviceText(
                        'تُحفظ ضمن سجل التنفيذ الداخلي للحالة.',
                        language,
                      )}
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
                        {serviceText(labels[target], language)}
                      </button>
                    ))}
                  </div>
                  <p className="text-xs text-slate-500">
                    {serviceText(
                      'استئناف أو إتمام طلب مرتبط بفاتورة يخضع للتحقق المالي من الخادم.',
                      language,
                    )}
                  </p>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      if (provider.trim())
                        void command(
                          'provider',
                          { providerReferenceId: provider.trim() },
                          serviceText('تم إسناد المزود وإعادة تحميل الطلب.', language),
                        );
                    }}
                    className="flex flex-wrap items-end gap-2"
                  >
                    <label className="flex-1 text-xs font-bold">
                      {serviceText('معرف المزود', language)}
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
                      {serviceText('حفظ الإسناد', language)}
                    </button>
                  </form>
                  {!detail.financeInvoiceId && hasPermission('admin:finance:invoice:manage') && (
                    <form onSubmit={invoice} className="space-y-3 rounded-xl bg-slate-50 p-4">
                      <h3 className="text-sm font-bold">
                        {serviceText('إنشاء مسودة فاتورة مرتبطة', language)}
                      </h3>
                      <p>
                        {language === 'ar'
                          ? serviceText(
                              'تُنشأ الفاتورة من السعر المعتمد للخدمة؛ لا يُدخل مبلغ يدوي.',
                              language,
                            )
                          : 'The invoice uses the approved service price.'}
                      </p>
                      <p className="text-xs text-slate-500">
                        {serviceText(
                          'مثال: 1500 مع منزلتين عشريتين = 15.00 لكل وحدة. لن تُصدر الفاتورة أو يُسجل سداد تلقائياً.',
                          language,
                        )}
                      </p>
                      <button className="rounded-xl bg-teal-700 px-4 py-2 text-sm font-bold text-white">
                        {serviceText('إنشاء مسودة الفاتورة', language)}
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
