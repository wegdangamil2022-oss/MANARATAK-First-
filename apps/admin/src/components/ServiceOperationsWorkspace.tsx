import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { Plus, Users, Tags, CalendarDays, Workflow, ListChecks } from 'lucide-react';
import { OwnerNavigation, useOwnerCopy } from '../features/services-finance/WorkspaceUI';
import { operationGroups } from '../features/services-finance/workspaceModel';
import { CanonicalPicker } from './CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { serviceOperationOptions } from '../api/serviceOperationPickers';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

type Kind =
  | 'providers'
  | 'packages'
  | 'pricing'
  | 'slots'
  | 'bookings'
  | 'workflows'
  | 'promotions'
  | 'discounts'
  | 'executions'
  | 'deliveries';
type RecordRow = {
  id: string;
  publicId?: string;
  artifactType?: string;
  displayName?: string;
  name?: string;
  status: string;
  version: number;
};
const kinds: Kind[] = [
  'providers',
  'packages',
  'pricing',
  'slots',
  'bookings',
  'workflows',
  'promotions',
  'discounts',
  'executions',
  'deliveries',
];
const fields: Record<Kind, string[]> = {
  providers: [
    'displayName',
    'timezone',
    'capacity',
    'countryReferenceId',
    'serviceId',
    'assetId',
    'expiresAt',
  ],
  packages: ['displayName', 'serviceIds'],
  pricing: [
    'serviceId',
    'packageId',
    'currencyCode',
    'scale',
    'amountMinorUnits',
    'effectiveFrom',
    'effectiveTo',
  ],
  slots: ['providerId', 'serviceId', 'startsAt', 'endsAt', 'timezone', 'capacity'],
  bookings: [],
  workflows: ['name', 'serviceId', 'packageId', 'stepKey', 'slaMinutes', 'artifactType'],
  promotions: ['name', 'discountId', 'serviceId'],
  discounts: ['code', 'discountType', 'valueMinorUnits', 'currencyCode', 'serviceId'],
  executions: [],
  deliveries: ['bookingId', 'workflowExecutionId', 'artifactType', 'assetId'],
};
const fieldLabels: Record<string, [string, string]> = {
  packageId: ['الباقة', 'Package'],
  serviceIds: ['معرفات خدمات الباقة بفواصل', 'Package service references, comma separated'],
  bookingId: ['الحجز', 'Booking'],
  workflowExecutionId: ['تنفيذ سير العمل', 'Workflow execution'],
  code: ['رمز الخصم', 'Discount code'],
  discountType: ['نوع الخصم (FIXED)', 'Discount type (FIXED)'],
  valueMinorUnits: ['قيمة الخصم بالوحدات الصغرى', 'Discount in minor units'],
  displayName: ['الاسم', 'Name'],
  name: ['الاسم', 'Name'],
  timezone: ['المنطقة الزمنية', 'Timezone'],
  capacity: ['السعة', 'Capacity'],
  countryReferenceId: ['مرجع البلد', 'Country reference'],
  serviceId: ['الخدمة', 'Service'],
  assetId: ['أصل وثيقة الاعتماد', 'Accreditation asset'],
  expiresAt: ['انتهاء الاعتماد', 'Accreditation expiry'],
  currencyCode: ['العملة', 'Currency'],
  scale: ['المنازل العشرية', 'Decimal scale'],
  amountMinorUnits: ['المبلغ بالوحدات الصغرى', 'Amount in minor units'],
  effectiveFrom: ['بدء سريان السعر', 'Effective from'],
  effectiveTo: ['نهاية سريان السعر', 'Effective to'],
  providerId: ['المزوّد', 'Provider'],
  startsAt: ['بداية الموعد', 'Starts at'],
  endsAt: ['نهاية الموعد', 'Ends at'],
  stepKey: ['مرحلة التنفيذ', 'Workflow step'],
  slaMinutes: ['مهلة المرحلة بالدقائق', 'Step SLA in minutes'],
  artifactType: ['نوع مخرج التسليم', 'Required deliverable type'],
  discountId: ['الخصم المعتمد', 'Approved discount'],
};

export function ServiceOperationsWorkspace({
  onBusyChange,
  onDirtyChange,
}: {
  onBusyChange: (busy: boolean) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { t, language, dir } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams();
  const { c } = useOwnerCopy();
  const selected = (params.get('operation') || params.get('kind')) as Kind;
  const kind = kinds.includes(selected) ? selected : 'providers';
  const group = operationGroups.find((group) => (group.kinds as readonly string[]).includes(kind))!;
  const [creating, setCreating] = useState(false);
  const [loadError, setLoadError] = useState('');
  const page = Math.max(1, Number(params.get('operationPage')) || 1);
  const [result, setResult] = useState<{ data: RecordRow[]; total: number } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const dirty = Object.values(form).some((value) => value.trim() !== '');
  useEffect(() => {
    onBusyChange(busy);
    return () => onBusyChange(false);
  }, [busy, onBusyChange]);
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
  const sequence = useRef(0);
  const mutation = useRef(false);
  const loadFailure = t('svc_error');
  const load = useCallback(async () => {
    const generation = ++sequence.current;
    setLoading(true);
    setLoadError('');
    setResult(null);
    try {
      const next = await adminApiClient.request<{ data: RecordRow[]; total: number }>(
        `/admin/services/operations/${kind}?page=${page}`,
      );
      if (generation === sequence.current) setResult(next);
    } catch {
      if (generation === sequence.current) setLoadError(loadFailure);
    } finally {
      if (generation === sequence.current) setLoading(false);
    }
  }, [kind, page, loadFailure]);
  useEffect(() => {
    setResult(null);
    void load();
    return () => {
      ++sequence.current;
    };
  }, [load]);
  const navigate = (next: Kind, nextPage = 1) => {
    if (
      busy ||
      (dirty &&
        !window.confirm(
          c('ترك تعديلات العملية غير المحفوظة؟', 'Discard unsaved operation changes?'),
        ))
    )
      return;
    setForm({});
    setCreating(false);
    setNotice('');
    setParams((previous) => {
      const copy = new URLSearchParams(previous);
      copy.set('tab', 'operations');
      copy.delete('kind');
      copy.set('operation', next);
      copy.set('operationPage', String(nextPage));
      return copy;
    });
  };
  async function write(path: string, body: unknown) {
    if (mutation.current || reason.trim().length < 3) return;
    mutation.current = true;
    setBusy(true);
    setNotice('');
    try {
      await adminApiClient.request(`/admin/services/operations/${path}`, {
        method: 'POST',
        body: JSON.stringify({ ...(body as object), reason }),
      });
      setNotice(t('svc_saved'));
      setForm({});
      setReason('');
      setCreating(false);
      await load();
    } catch {
      setNotice(t('svc_error'));
    } finally {
      mutation.current = false;
      setBusy(false);
    }
  }
  function create(event: FormEvent) {
    event.preventDefault();
    const body: Record<string, unknown> = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value.trim() !== ''),
    );
    for (const key of ['capacity', 'scale', 'slaMinutes'])
      if (key in body) body[key] = Number(body[key]);
    for (const key of ['effectiveFrom', 'effectiveTo', 'startsAt', 'endsAt', 'expiresAt']) {
      if (body[key]) {
        const date = new Date(String(body[key]));
        if (!Number.isFinite(date.getTime())) {
          setNotice(c('أدخل تاريخًا صحيحًا.', 'Enter a valid date.'));
          return;
        }
        body[key] = date.toISOString();
      }
    }
    if (kind === 'providers') {
      body.supportedServiceIds = [form.serviceId];
      delete body.serviceId;
      body.qualificationMetadata = { assetId: form.assetId, expiresAt: body.expiresAt };
      delete body.assetId;
      delete body.expiresAt;
    }
    if (kind === 'packages') {
      body.items = (form.serviceIds || '')
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)
        .map((serviceId, index) => ({
          serviceId,
          sequence: index + 1,
          quantity: 1,
          required: true,
        }));
      delete body.serviceIds;
    }
    if (kind === 'workflows') {
      body.steps = [
        {
          key: form.stepKey,
          sequence: 1,
          slaMinutes: Number(form.slaMinutes),
          requiredArtifactTypes: form.artifactType ? [form.artifactType] : [],
        },
      ];
      delete body.stepKey;
      delete body.slaMinutes;
      delete body.artifactType;
    }
    if (!body.effectiveTo) delete body.effectiveTo;
    void write(kind, body);
  }
  return (
    <section dir={dir} className="space-y-4 rounded-2xl border bg-white p-4">
      <OwnerNavigation
        active={group.id}
        disabled={busy}
        label={c('مجموعات العمليات', 'Operation groups')}
        items={operationGroups.map((item, index) => ({
          id: item.id,
          label: c(item.ar, item.en),
          icon: [Users, Tags, CalendarDays, Workflow][index],
        }))}
        onChange={(id) => {
          const next = operationGroups.find((item) => item.id === id);
          if (next) navigate(next.kinds[0]);
        }}
      />
      <OwnerNavigation
        secondary
        active={kind}
        disabled={busy}
        label={c('وحدات العمليات', 'Operation units')}
        items={group.kinds
          .filter(
            (value) =>
              !['bookings', 'executions', 'deliveries'].includes(value) ||
              hasPermission('admin:services:requests:pii'),
          )
          .map((value) => ({
            id: value,
            label: t(`svc_${value}` as Parameters<typeof t>[0]),
            icon: ListChecks,
          }))}
        onChange={(value) => navigate(value as Kind)}
      />
      <div className="sf-panel-heading">
        <h2>{t(`svc_${kind}` as Parameters<typeof t>[0])}</h2>
        {!creating && fields[kind].length > 0 && (
          <button className="sf-primary" disabled={busy} onClick={() => setCreating(true)}>
            <Plus size={15} />
            {t('svc_create')}
          </button>
        )}
      </div>
      <label>
        {t('svc_reason')}
        <input
          className="block w-full rounded-xl border p-3"
          value={reason}
          maxLength={500}
          onChange={(e) => setReason(e.target.value)}
        />
      </label>
      {notice && <p role="status">{notice}</p>}
      {loadError && (
        <p role="alert" className="sf-notice text-red-700">
          {loadError}
        </p>
      )}
      {loading && <p role="status">{t('loading')}</p>}
      {!loading && !loadError && result && !result.data.length && (
        <p className="sf-empty">{c('لا توجد سجلات.', 'No records.')}</p>
      )}
      <ul className="space-y-2">
        {result?.data.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <span>{row.displayName || row.name || row.publicId || row.artifactType || row.id}</span>
            <span>{row.status}</span>
            <code>{row.id}</code>
            {(['DRAFT'].includes(row.status) ||
              (kind === 'promotions' && row.status === 'PAUSED')) &&
              ['providers', 'packages', 'pricing', 'promotions', 'workflows'].includes(kind) &&
              hasPermission('admin:services:operations:manage') &&
              hasPermission(
                kind === 'providers'
                  ? 'admin:services:providers:approve'
                  : kind === 'pricing'
                    ? 'admin:services:pricing:approve'
                    : 'admin:services:review',
              ) && (
                <button
                  type="button"
                  disabled={busy || reason.trim().length < 3}
                  onClick={() => {
                    if (
                      kind === 'providers' &&
                      !window.confirm(
                        language === 'ar'
                          ? 'أؤكد مراجعة جهة الاعتماد والنطاق القانوني ووثيقة المزوّد قبل الاعتماد.'
                          : 'Confirm accreditation authority, legal scope and the provider document.',
                      )
                    )
                      return;
                    void write(`${kind}/${row.id}/activate`, {
                      expectedVersion: row.version,
                      ...(kind === 'providers'
                        ? {
                            review: {
                              legalReviewed: true,
                              authorityReviewed: true,
                              scopeReviewed: true,
                            },
                          }
                        : {}),
                    });
                  }}
                >
                  {t('svc_activate')}
                </button>
              )}
            {kind === 'providers' && row.status !== 'RETIRED' && (
              <button
                type="button"
                disabled={busy || reason.trim().length < 3}
                onClick={() => {
                  const assetId = window
                    .prompt(
                      language === 'ar'
                        ? 'معرف أصل وثيقة الاعتماد الجديدة:'
                        : 'New accreditation asset reference:',
                    )
                    ?.trim();
                  const expiry = window.prompt(
                    language === 'ar'
                      ? 'تاريخ انتهاء الاعتماد (YYYY-MM-DD):'
                      : 'Accreditation expiry (YYYY-MM-DD):',
                  );
                  if (!assetId || !expiry || !Number.isFinite(Date.parse(expiry))) return;
                  void write(`providers/${row.id}/evidence`, {
                    assetId,
                    expiresAt: new Date(expiry).toISOString(),
                    expectedVersion: row.version,
                  });
                }}
              >
                {language === 'ar' ? 'تحديث وثيقة الاعتماد' : 'Revise accreditation evidence'}
              </button>
            )}
            {kind === 'executions' &&
              row.status === 'RUNNING' &&
              hasPermission('admin:services:requests:fulfill') && (
                <button
                  type="button"
                  disabled={busy || reason.trim().length < 3}
                  onClick={() =>
                    void write(`executions/${row.id}/advance`, { expectedVersion: row.version })
                  }
                >
                  {language === 'ar'
                    ? 'مراجعة المخرجات والانتقال'
                    : 'Review deliverables and advance'}
                </button>
              )}
            {kind === 'bookings' &&
              ['PENDING', 'CONFIRMED', 'IN_PROGRESS'].includes(row.status) &&
              hasPermission('admin:services:requests:fulfill') && (
                <>
                  <button
                    type="button"
                    disabled={busy || reason.trim().length < 3}
                    onClick={() =>
                      void write(`bookings/${row.id}/transition`, {
                        status:
                          row.status === 'PENDING'
                            ? 'CONFIRMED'
                            : row.status === 'CONFIRMED'
                              ? 'IN_PROGRESS'
                              : 'COMPLETED',
                        expectedVersion: row.version,
                      })
                    }
                  >
                    {language === 'ar' ? 'المرحلة التالية' : 'Next stage'}
                  </button>
                  <button
                    type="button"
                    disabled={busy || reason.trim().length < 3}
                    onClick={() => void write(`bookings/${row.id}/start-workflow`, {})}
                  >
                    {language === 'ar' ? 'بدء التنفيذ' : 'Start workflow'}
                  </button>
                </>
              )}
          </li>
        ))}
      </ul>
      <div className="flex gap-3">
        <button
          type="button"
          disabled={busy || page === 1}
          onClick={() => navigate(kind, page - 1)}
        >
          {t('svc_previous')}
        </button>
        <span>{page}</span>
        <button
          type="button"
          disabled={busy || !result || page * 20 >= result.total}
          onClick={() => navigate(kind, page + 1)}
        >
          {t('svc_next')}
        </button>
        <button type="button" disabled={loading} onClick={() => void load()}>
          {t('svc_refresh')}
        </button>
      </div>
      {creating && fields[kind].length > 0 && (
        <form onSubmit={create} className="sf-form-grid sf-form-section">
          {fields[kind].map((key) => {
            const label = fieldLabels[key]?.[language === 'ar' ? 0 : 1] ?? key;
            if (
              [
                'providerId',
                'packageId',
                'discountId',
                'bookingId',
                'workflowExecutionId',
              ].includes(key)
            ) {
              const related: Record<string, string> = {
                providerId: 'providers',
                packageId: 'packages',
                discountId: 'discounts',
                bookingId: 'bookings',
                workflowExecutionId: 'executions',
              };
              return (
                <CanonicalPicker
                  key={key}
                  label={label}
                  value={form[key] || ''}
                  onChange={(id) => setForm({ ...form, [key]: id ?? '' })}
                  paged
                  load={(query, page) => serviceOperationOptions(related[key], query, page)}
                  reloadKey={kind + ':' + key}
                />
              );
            }
            if (key === 'countryReferenceId')
              return (
                <CanonicalPicker
                  key={key}
                  label={label}
                  value={form[key] || ''}
                  onChange={(id) => setForm({ ...form, [key]: id ?? '' })}
                  paged
                  load={(query, page) => canonicalPickerApi.countries(query, page)}
                  reloadKey="operation-country"
                />
              );
            if (key === 'currencyCode')
              return (
                <CanonicalPicker
                  key={key}
                  label={label}
                  value={form[key] || ''}
                  onChange={(id) => setForm({ ...form, [key]: id || '' })}
                  paged
                  load={async (query, page) =>
                    (await canonicalPickerApi.currencies(query, page)).map((option) => ({
                      ...option,
                      id: option.code || option.id,
                    }))
                  }
                  reloadKey="operation-currency"
                />
              );
            return (
              <label key={key}>
                {label}
                <input
                  disabled={busy}
                  required={
                    !['effectiveTo', 'countryReferenceId', 'serviceId', 'packageId'].includes(key)
                  }
                  className="mt-1 block w-full"
                  type={
                    /At$|^effective/.test(key)
                      ? 'datetime-local'
                      : ['capacity', 'scale', 'slaMinutes'].includes(key)
                        ? 'number'
                        : 'text'
                  }
                  value={form[key] ?? ''}
                  onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                />
              </label>
            );
          })}
          <button
            type="button"
            className="sf-secondary"
            disabled={busy}
            onClick={() => {
              if (
                !dirty ||
                window.confirm(c('ترك التعديلات غير المحفوظة؟', 'Discard unsaved changes?'))
              ) {
                setForm({});
                setCreating(false);
              }
            }}
          >
            {c('إلغاء', 'Cancel')}
          </button>
          <button disabled={busy || reason.trim().length < 3} className="sf-primary">
            {t('svc_create')}
          </button>
        </form>
      )}
    </section>
  );
}
