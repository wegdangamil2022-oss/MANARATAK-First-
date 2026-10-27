import { ServiceRequestServiceFilter } from './ServiceRequestServiceFilter';
import { ManagedApplicationEvidenceEditor } from './ManagedApplicationEvidenceEditor';
import { serviceText } from '../i18n/serviceText';
import { ServiceCaseQueue } from './ServiceCaseQueue';
import { useTranslation } from '../i18n/I18nProvider';
import { type ReactNode, FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import {
  ClipboardList,
  FileText,
  Workflow,
  CircleDollarSign,
  PackageCheck,
  History,
  RefreshCw,
} from 'lucide-react';
import {
  OwnerNavigation,
  OwnerPanel,
  useOwnerCopy,
} from '../features/services-finance/WorkspaceUI';
import { CanonicalPicker } from './CanonicalPicker';
import { serviceOperationOptions } from '../api/serviceOperationPickers';
import {
  ServiceRequestStatus,
  type ServiceRequestDto,
  type ServiceCatalogItemDto,
} from '@manaratak/domain';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

type RequestRow = Pick<
  ServiceRequestDto,
  'id' | 'publicId' | 'serviceId' | 'status' | 'version' | 'dueAt' | 'createdAt' | 'updatedAt'
> & { studentReferenceId?: string };
type Page = { data: RequestRow[]; total: number; page: number; totalPages: number };
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
  const route = useParams();
  const navigate = useNavigate();
  const { c } = useOwnerCopy();
  const reference = route.requestReference || params.get('request') || '';
  const canPII = hasPermission('admin:services:requests:pii');
  const canCatalog = hasPermission('admin:services:manage');
  const view = ['mine', 'all', 'unassigned', 'payment', 'overdue', 'completed'].includes(
    params.get('view') || '',
  )
    ? params.get('view')!
    : 'mine';
  const [detailSection, setDetailSection] = useState('summary');
  const [timelineError, setTimelineError] = useState(false);
  const studentFilter = canPII ? params.get('studentReferenceId') || '' : '';
  const serviceFilter = params.get('serviceId') || '';
  const [query, setQuery] = useState(params.get('search') || '');
  const search = params.get('search') || '';
  useEffect(() => setQuery(search), [search]);
  const overdue = params.get('overdue') === 'true' || view === 'overdue';
  const [timeline, setTimeline] = useState<
    Array<{ id: string; eventType: string; createdAt: string }>
  >([]);
  const status =
    view === 'payment'
      ? 'AWAITING_PAYMENT'
      : view === 'completed'
        ? 'COMPLETED'
        : params.get('status') || '';
  const page = Math.max(1, Math.trunc(Number(params.get('page')) || 1));
  const setPage = useCallback(
    (value: number | ((previous: number) => number)) =>
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        next.set('page', String(typeof value === 'function' ? value(page) : value));
        return next;
      }),
    [page, setParams],
  );
  const setFilter = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      value ? next.set(key, value) : next.delete(key);
      next.set('page', '1');
      return next;
    });
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
      if (search && canPII) query.set('search', search);
      if (view === 'mine') query.set('mine', 'true');
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
  }, [
    page,
    status,
    search,
    studentFilter,
    serviceFilter,
    overdue,
    view,
    canPII,
    language,
    setPage,
  ]);
  useEffect(() => {
    if (!reference && view !== 'unassigned') void load();
    return () => {
      ++sequence.current;
    };
  }, [load, reference, view]);

  const inspect = useCallback(
    async (ref: string) => {
      const request = ++detailSequence.current;
      setDetailLoading(true);
      setDetailError(null);
      setDetail(null);
      setService(null);
      setTimeline([]);
      setTimelineError(false);
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
            if (request === detailSequence.current) {
              setTimeline([]);
              setTimelineError(true);
            }
          });
        setProvider(next.providerReferenceId || '');
        setNote('');
        if (!canCatalog) return true;
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
    },
    [language, canCatalog],
  );
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
    if (route.requestReference || ref) {
      next.delete('request');
      next.set('tab', 'requests');
      navigate(
        (ref ? '/services/requests/' + encodeURIComponent(ref) : '/services') +
          '?' +
          next.toString(),
      );
    } else setParams(next);
    setDetailSection('summary');
    setNotice(null);
    setNote('');
  }
  async function command(
    action: string,
    body: Record<string, unknown>,
    message: string,
    prepare?: (current: ServiceRequestDto) => Promise<Record<string, unknown>>,
  ) {
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
      const preparedBody = prepare ? await prepare(current) : body;
      if (activeReference.current !== currentReference) return;
      await adminApiClient.request(
        `/admin/services/requests/${encodeURIComponent(current.id)}/${action}`,
        {
          method: 'POST',
          body: JSON.stringify({ ...preparedBody, expectedVersion: current.version }),
        },
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
    await command(
      'finance-invoice',
      {},
      serviceText('تم إنشاء وربط مسودة الفاتورة؛ إصدارها وتحصيلها يتمان من قسم المالية.', language),
      async (current) => {
        const quote = await adminApiClient.request<{
          amountMinorUnits: string;
          currencyCode: string;
          scale: number;
        }>(`/admin/services/requests/${encodeURIComponent(current.id)}/quote`);
        return {
          amountMinorUnits: quote.amountMinorUnits,
          currencyCode: quote.currencyCode,
          scale: quote.scale,
          quantity: 1,
        };
      },
    );
  }
  const closed =
    (detail &&
      [ServiceRequestStatus.COMPLETED, ServiceRequestStatus.CANCELLED].includes(detail.status)) ||
    !hasPermission('admin:services:requests:fulfill');
  return (
    <div dir={dir} className="space-y-4">
      {!reference && (
        <>
          <OwnerNavigation
            secondary
            active={view}
            label={c('قوائم الطلبات', 'Request views')}
            disabled={saving}
            items={[
              { id: 'mine', label: c('طلباتي', 'My requests'), icon: ClipboardList },
              ...(hasPermission('admin:services:requests:all')
                ? [{ id: 'all', label: c('كل الطلبات', 'All requests'), icon: ClipboardList }]
                : []),
              ...(hasPermission('admin:services:requests:assign')
                ? [{ id: 'unassigned', label: c('غير مسندة', 'Unassigned'), icon: ClipboardList }]
                : []),
              {
                id: 'payment',
                label: c('بانتظار الدفع', 'Awaiting payment'),
                icon: CircleDollarSign,
              },
              { id: 'overdue', label: c('متأخرة', 'Overdue'), icon: History },
              { id: 'completed', label: c('مكتملة', 'Completed'), icon: PackageCheck },
            ]}
            onChange={(value) => setFilter('view', value)}
          />
          {view === 'unassigned' ? (
            <ServiceCaseQueue
              onClaim={(ref) => {
                choose(ref);
                void load();
              }}
            />
          ) : (
            <>
              <form
                className="sf-toolbar sf-filter-panel"
                onSubmit={(event) => {
                  event.preventDefault();
                  query.trim() === search ? void load() : setFilter('search', query.trim());
                }}
              >
                {canPII && (
                  <label>
                    {c('بحث برقم الطلب أو الطالب', 'Search by request or student')}
                    <input
                      value={query}
                      maxLength={120}
                      onChange={(event) => setQuery(event.target.value)}
                    />
                  </label>
                )}
                {canPII && (
                  <label>
                    {c('مرجع الطالب', 'Student reference')}
                    <input
                      maxLength={160}
                      value={studentFilter}
                      onChange={(event) => {
                        setFilter('studentReferenceId', event.target.value);
                      }}
                    />
                  </label>
                )}
                {hasPermission('admin:services:manage') && (
                  <ServiceRequestServiceFilter
                    value={serviceFilter}
                    language={language}
                    onChange={(id) => {
                      setFilter('serviceId', id);
                    }}
                  />
                )}
                <label>
                  {c('الحالة', 'Status')}
                  <select
                    value={status}
                    disabled={view === 'payment' || view === 'completed'}
                    onChange={(event) => setFilter('status', event.target.value)}
                  >
                    <option value="">{c('الكل', 'All')}</option>
                    {Object.values(ServiceRequestStatus).map((value) => (
                      <option key={value} value={value}>
                        {serviceText(labels[value], language)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="submit" className="sf-primary" disabled={loading}>
                  {c('بحث', 'Search')}
                </button>
                <button
                  type="button"
                  className="sf-secondary"
                  disabled={loading}
                  onClick={() => void load()}
                >
                  <RefreshCw size={14} />
                  {c('تحديث', 'Refresh')}
                </button>
                <button
                  type="button"
                  className="sf-secondary"
                  disabled={loading}
                  onClick={() => {
                    setQuery('');
                    setParams({ tab: 'requests', view });
                  }}
                >
                  {c('مسح الفلاتر', 'Clear filters')}
                </button>
              </form>
              {!canPII && (
                <p className="sf-notice">
                  {c(
                    'عرض مختصر دون بيانات شخصية. فتح ملف الطلب يتطلب صلاحية قراءة بيانات الحالة.',
                    'Summary view without personal data. Opening a request requires case-data permission.',
                  )}
                </p>
              )}
              {listError && (
                <p role="alert" className="sf-notice text-red-700">
                  {listError}
                </p>
              )}
              <OwnerPanel title={c('طلبات الطلاب', 'Student requests')}>
                {loading ? (
                  <p role="status">{c('جارٍ تحميل الطلبات…', 'Loading requests…')}</p>
                ) : !listError && !result?.data.length ? (
                  <p className="sf-empty">{c('لا توجد طلبات مطابقة.', 'No matching requests.')}</p>
                ) : (
                  !listError && (
                    <div className="sf-table-wrap">
                      <table>
                        <thead>
                          <tr>
                            <th>{c('الطلب', 'Request')}</th>
                            {canPII && <th>{c('الطالب', 'Student')}</th>}
                            <th>{c('الحالة', 'Status')}</th>
                            <th>{c('موعد التسليم', 'Due date')}</th>
                            <th>{c('آخر تحديث', 'Updated')}</th>
                            {canPII && <th>{c('الإجراء', 'Action')}</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {result?.data.map((row) => (
                            <tr key={row.id}>
                              <td className="sf-reference">
                                {canPII ? (
                                  <button className="sf-link" onClick={() => choose(row.publicId)}>
                                    {row.publicId}
                                  </button>
                                ) : (
                                  row.publicId
                                )}
                              </td>
                              {canPII && (
                                <td className="sf-reference">
                                  {row.studentReferenceId &&
                                  hasPermission('admin:students:support') ? (
                                    <Link
                                      className="sf-link"
                                      to={
                                        '/students?student=' +
                                        encodeURIComponent(row.studentReferenceId)
                                      }
                                    >
                                      {row.studentReferenceId}
                                    </Link>
                                  ) : (
                                    row.studentReferenceId || '—'
                                  )}
                                </td>
                              )}
                              <td>{serviceText(labels[row.status], language)}</td>
                              <td>{date(row.dueAt)}</td>
                              <td>{date(row.updatedAt)}</td>
                              {canPII && (
                                <td>
                                  <button
                                    className="sf-secondary"
                                    onClick={() => choose(row.publicId)}
                                  >
                                    {c('فتح الطلب', 'Open request')}
                                  </button>
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )
                )}
                {result && !listError && (
                  <div className="sf-pager">
                    <button disabled={loading || page <= 1} onClick={() => setPage(page - 1)}>
                      {c('السابق', 'Previous')}
                    </button>
                    <span>
                      {c('الإجمالي', 'Total')}: {result.total} · {page}/
                      {Math.max(1, result.totalPages)}
                    </span>
                    <button
                      disabled={loading || page >= result.totalPages}
                      onClick={() => setPage(page + 1)}
                    >
                      {c('التالي', 'Next')}
                    </button>
                  </div>
                )}
              </OwnerPanel>
            </>
          )}
        </>
      )}
      {reference && (
        <section ref={anchor} className="sf-panel">
          <div className="sf-panel-heading">
            <div>
              <h2>{c('تفاصيل الطلب', 'Request details')}</h2>
              <p className="sf-reference">{reference}</p>
            </div>
            <button className="sf-secondary" disabled={saving} onClick={() => choose('')}>
              {c('العودة للطلبات', 'Back to requests')}
            </button>
          </div>
          {detailLoading && (
            <p role="status">{c('جارٍ تحميل تفاصيل الطلب…', 'Loading request…')}</p>
          )}
          {detailError && (
            <p role="alert" className="sf-notice text-red-700">
              {detailError}
            </p>
          )}
          {!detailLoading && !detail && detailError && (
            <button className="sf-secondary" onClick={() => void inspect(reference)}>
              {c('إعادة المحاولة', 'Retry')}
            </button>
          )}
          {notice && (
            <p role="status" className="sf-notice">
              {notice}
            </p>
          )}
          {detail && !detailLoading && (
            <>
              <OwnerNavigation
                secondary
                active={detailSection}
                onChange={setDetailSection}
                label={c('تفاصيل الطلب', 'Request sections')}
                items={[
                  { id: 'summary', label: c('الملخص', 'Summary'), icon: ClipboardList },
                  {
                    id: 'documents',
                    label: c('البيانات والمتطلبات', 'Data & requirements'),
                    icon: FileText,
                  },
                  {
                    id: 'execution',
                    label: c('التنفيذ والإسناد', 'Execution & assignment'),
                    icon: Workflow,
                  },
                  {
                    id: 'finance',
                    label: c('عرض السعر والمالية', 'Quote & finance'),
                    icon: CircleDollarSign,
                  },
                  {
                    id: 'delivery',
                    label: c('المخرجات والتسليم', 'Results & delivery'),
                    icon: PackageCheck,
                  },
                  { id: 'history', label: c('السجل', 'Timeline'), icon: History },
                ]}
              />
              {detailSection === 'summary' && (
                <div className="space-y-4">
                  <dl className="sf-form-grid">
                    <div>
                      <dt>{c('الخدمة', 'Service')}</dt>
                      <dd>
                        {String(
                          detail.serviceSnapshot?.displayName ||
                            service?.displayName ||
                            detail.serviceId,
                        )}
                      </dd>
                    </div>
                    <div>
                      <dt>{c('حالة الطلب', 'Request status')}</dt>
                      <dd>{serviceText(labels[detail.status], language)}</dd>
                    </div>
                    <div>
                      <dt>{c('مهلة التنفيذ', 'Delivery deadline')}</dt>
                      <dd>{date(detail.dueAt)}</dd>
                    </div>
                    <div>
                      <dt>{c('الفاتورة', 'Invoice')}</dt>
                      <dd>{detail.financeInvoicePublicId || c('غير مرتبطة', 'Not linked')}</dd>
                    </div>
                    <div>
                      <dt>{c('تاريخ الإنشاء', 'Created')}</dt>
                      <dd>{date(detail.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>{c('تاريخ الإتمام', 'Completed')}</dt>
                      <dd>{date(detail.completedAt)}</dd>
                    </div>
                  </dl>
                  {detail.cancellationState === 'PENDING_FINANCE' && (
                    <p className="sf-notice">
                      {c(
                        'الإلغاء ينتظر معالجة المالية؛ حالة الطلب لا تثبت استرداد المبلغ.',
                        'Cancellation awaits Finance; request status does not establish a refund.',
                      )}
                    </p>
                  )}
                  {hasPermission('admin:students:support') && (
                    <Link
                      className="sf-link"
                      to={'/students?student=' + encodeURIComponent(detail.studentReferenceId)}
                    >
                      {c('فتح ملف الطالب', 'Open student profile')}
                    </Link>
                  )}
                  {!closed && (
                    <div className="sf-actions">
                      <button className="sf-primary" onClick={() => setDetailSection('execution')}>
                        {c('متابعة التنفيذ', 'Continue fulfillment')}
                      </button>
                    </div>
                  )}
                </div>
              )}
              {detailSection === 'documents' && (
                <Data
                  title={c('بيانات طلب الطالب', 'Student request data')}
                  value={detail.requestParameters}
                />
              )}
              {detailSection === 'execution' && (
                <div className="space-y-4">
                  <Data
                    title={c('بيانات التنفيذ المحفوظة', 'Saved fulfillment data')}
                    value={detail.fulfillmentMetadata}
                  />
                  {!closed && (
                    <fieldset disabled={saving} className="space-y-4">
                      <label className="block">
                        {c('ملاحظة التنفيذ', 'Fulfillment note')}
                        <textarea
                          value={note}
                          maxLength={4000}
                          onChange={(event) => setNote(event.target.value)}
                          className="mt-1 w-full"
                        />
                      </label>
                      <div className="sf-actions">
                        {transitions[detail.status].map((target) => (
                          <button
                            key={target}
                            type="button"
                            onClick={() => void transition(target)}
                            className={
                              target === ServiceRequestStatus.CANCELLED
                                ? 'sf-secondary text-red-700'
                                : 'sf-primary'
                            }
                          >
                            {serviceText(labels[target], language)}
                          </button>
                        ))}
                      </div>
                      <p className="sf-notice">
                        {c(
                          'يتحقق الخادم من الحجز والتصفية المالية ومراجعة المخرجات قبل الانتقال. الإلغاء لا ينفذ استردادًا تلقائيًا.',
                          'The server checks booking, financial clearance and delivery review before transitions. Cancellation does not automatically refund a payment.',
                        )}
                      </p>
                      {hasPermission('admin:services:operations:manage') && (
                        <form
                          className="sf-toolbar"
                          onSubmit={(event) => {
                            event.preventDefault();
                            if (provider.trim())
                              void command(
                                'provider',
                                { providerReferenceId: provider.trim() },
                                c('تم حفظ إسناد المزود.', 'Provider assignment saved.'),
                              );
                          }}
                        >
                          <CanonicalPicker
                            label={c('المزود', 'Provider')}
                            value={provider}
                            onChange={(id) => setProvider(id ?? '')}
                            load={(query, page) =>
                              serviceOperationOptions('providers', query, page)
                            }
                            reloadKey="request-provider"
                          />
                          <button
                            className="sf-secondary"
                            disabled={!provider.trim() || provider === detail.providerReferenceId}
                          >
                            {c('حفظ الإسناد', 'Save assignment')}
                          </button>
                        </form>
                      )}
                    </fieldset>
                  )}
                  {hasPermission('admin:services:manage') && (
                    <ManagedApplicationEvidenceEditor
                      key={detail.id + ':' + detail.version}
                      request={detail}
                      onBusy={setSaving}
                      onSaved={async () => {
                        await inspect(detail.id);
                        await load();
                      }}
                    />
                  )}
                </div>
              )}
              {detailSection === 'finance' && (
                <div className="space-y-4">
                  <p className="sf-notice">
                    {c(
                      'إصدار الفاتورة والتحصيل والاسترداد لدى المالية. وجود فاتورة مرتبطة لا يعني تحقق الدفع أو أهلية التنفيذ.',
                      'Invoice issuance, collection and refunds belong to Finance. A linked invoice alone does not prove payment or fulfillment eligibility.',
                    )}
                  </p>
                  {detail.financeInvoiceId ? (
                    hasPermission('admin:finance:manage') ? (
                      <Link
                        className="sf-link"
                        to={'/finance/invoices/' + encodeURIComponent(detail.financeInvoiceId)}
                      >
                        {c('فتح الفاتورة في المالية', 'Open invoice in Finance')} ·{' '}
                        {detail.financeInvoicePublicId}
                      </Link>
                    ) : (
                      <p>{detail.financeInvoicePublicId}</p>
                    )
                  ) : (
                    !closed &&
                    hasPermission('admin:finance:invoice:manage') && (
                      <form onSubmit={invoice} className="space-y-3">
                        <p>
                          {c(
                            'إنشاء مسودة من التسعيرة المعتمدة للخدمة، دون إدخال مبلغ يدوي أو إثبات دفع.',
                            'Create a draft from approved service pricing, without a manual amount or payment attestation.',
                          )}
                        </p>
                        <button disabled={saving} className="sf-primary">
                          {c('إنشاء مسودة فاتورة مرتبطة', 'Create linked draft invoice')}
                        </button>
                      </form>
                    )
                  )}
                </div>
              )}
              {detailSection === 'delivery' && (
                <div className="space-y-4">
                  <Data
                    title={c(
                      'متطلبات ومخرجات النسخة المتعاقد عليها',
                      'Contracted deliverables & prerequisites',
                    )}
                    value={{
                      deliveryArtifactTypes: detail.serviceSnapshot?.deliveryArtifactTypes ?? [],
                      servicePrerequisites: detail.serviceSnapshot?.servicePrerequisites ?? [],
                    }}
                  />
                  <p className="sf-notice">
                    {c(
                      'حالة الطلب وحالة الحجز والتسليم والمالية مستقلة. ملفات التسليم تخضع للتحقق والصلاحية عند كل تنزيل.',
                      'Request, booking, delivery and financial states are independent. Deliverables require authorization on every download.',
                    )}
                  </p>
                  {hasPermission('admin:services:operations:manage') && (
                    <Link className="sf-link" to="/services?tab=operations&operation=deliveries">
                      {c('فتح سجل مخرجات التسليم', 'Open deliverables register')}
                    </Link>
                  )}
                </div>
              )}
              {detailSection === 'history' &&
                (timelineError ? (
                  <p role="alert" className="sf-notice">
                    {c(
                      'تعذر تحميل سجل الطلب. أعد قراءة الطلب للمحاولة.',
                      'Could not load the timeline. Reload the request to retry.',
                    )}
                    <button className="sf-secondary" onClick={() => void inspect(reference)}>
                      {c('إعادة القراءة', 'Reload')}
                    </button>
                  </p>
                ) : timeline.length ? (
                  <ol className="space-y-3">
                    {timeline.map((event) => (
                      <li key={event.id}>
                        <time>{date(event.createdAt)}</time> ·{' '}
                        {serviceText(event.eventType, language)}
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className="sf-empty">{c('لا توجد أحداث محملة.', 'No loaded events.')}</p>
                ))}
            </>
          )}
        </section>
      )}
    </div>
  );
}

function Data({ title, value }: { title: string; value?: Record<string, unknown> | null }) {
  const { c, language } = useOwnerCopy();
  const labels: Record<string, string> = {
    deliveryArtifactTypes: c('مخرجات التسليم', 'Deliverable types'),
    servicePrerequisites: c('الشروط', 'Prerequisites'),
    administrativeNote: c('ملاحظة إدارية', 'Administrative note'),
  };
  function present(content: unknown, depth = 0): ReactNode {
    if (content == null) return '—';
    if (typeof content === 'boolean') return content ? c('نعم', 'Yes') : c('لا', 'No');
    if (typeof content !== 'object') return String(content);
    if (depth >= 4) return c('بيانات متداخلة', 'Nested data');
    if (Array.isArray(content))
      return content.length ? (
        <ul>
          {content.map((item, index) => (
            <li key={index}>{present(item, depth + 1)}</li>
          ))}
        </ul>
      ) : (
        '—'
      );
    return (
      <dl>
        {Object.entries(content).map(([key, item]) => (
          <div key={key}>
            <dt>{labels[key] || serviceText(key, language)}</dt>
            <dd>{present(item, depth + 1)}</dd>
          </div>
        ))}
      </dl>
    );
  }
  return (
    <section className="sf-panel">
      <h3>{title}</h3>
      {!value || !Object.keys(value).length ? (
        <p className="sf-empty">{c('لا توجد بيانات إضافية.', 'No additional data.')}</p>
      ) : (
        <dl className="space-y-3">
          {Object.entries(value).map(([key, content]) => (
            <div key={key}>
              <dt className="font-bold">{labels[key] || serviceText(key, language)}</dt>
              <dd className="mt-1 whitespace-pre-wrap break-words">{present(content)}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
