import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
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

export function ServiceOperationsWorkspace() {
  const { t, language, dir } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams();
  const selected = params.get('operation') as Kind;
  const kind = kinds.includes(selected) ? selected : 'providers';
  const page = Math.max(1, Number(params.get('operationPage')) || 1);
  const [result, setResult] = useState<{ data: RecordRow[]; total: number } | null>(null);
  const [form, setForm] = useState<Record<string, string>>({});
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const sequence = useRef(0);
  const mutation = useRef(false);
  const load = useCallback(async () => {
    const generation = ++sequence.current;
    setLoading(true);
    try {
      const next = await adminApiClient.request<{ data: RecordRow[]; total: number }>(
        `/admin/services/operations/${kind}?page=${page}`,
      );
      if (generation === sequence.current) setResult(next);
    } catch {
      if (generation === sequence.current) setNotice(t('svc_error'));
    } finally {
      if (generation === sequence.current) setLoading(false);
    }
  }, [kind, page, t]);
  useEffect(() => {
    setResult(null);
    void load();
    return () => {
      ++sequence.current;
    };
  }, [load]);
  const navigate = (next: Kind, nextPage = 1) => {
    if (busy) return;
    setForm({});
    setParams((previous) => {
      const copy = new URLSearchParams(previous);
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
    let body: Record<string, unknown> = Object.fromEntries(
      Object.entries(form).filter(([, value]) => value.trim() !== ''),
    );
    for (const key of ['capacity', 'scale', 'slaMinutes'])
      if (key in body) body[key] = Number(body[key]);
    for (const key of ['effectiveFrom', 'effectiveTo', 'startsAt', 'endsAt', 'expiresAt'])
      if (body[key]) body[key] = new Date(String(body[key])).toISOString();
    if (kind === 'providers') {
      body.supportedServiceIds = [form.serviceId];
      delete body.serviceId;
      body.qualificationMetadata = { assetId: form.assetId, expiresAt: body.expiresAt };
      delete body.assetId;
      delete body.expiresAt;
    }
    if (kind === 'packages') {
      body.items = form.serviceIds
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
      <p role="status">{t('svc_runtime_pending')}</p>
      <nav aria-label={t('svc_operations')} className="flex flex-wrap gap-2">
        {kinds.map((value) => (
          <button
            type="button"
            key={value}
            disabled={busy}
            aria-pressed={kind === value}
            onClick={() => navigate(value)}
            className="rounded-xl border p-3"
          >
            {t(`svc_${value}`)}
          </button>
        ))}
      </nav>
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
      {loading && <p role="status">{t('loading')}</p>}
      <ul className="space-y-2">
        {result?.data.map((row) => (
          <li key={row.id} className="flex flex-wrap items-center gap-3 rounded-xl border p-3">
            <span>{row.displayName || row.name || row.publicId || row.artifactType || row.id}</span>
            <span>{row.status}</span>
            <code>{row.id}</code>
            {(['DRAFT'].includes(row.status) || (kind === 'promotions' && row.status === 'PAUSED')) &&
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
            {kind === 'bookings' && hasPermission('admin:services:requests:fulfill') && (
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
      {fields[kind].length > 0 && (
        <form onSubmit={create} className="grid gap-3 sm:grid-cols-2">
          {fields[kind].map((key) => (
            <label key={key}>
              {fieldLabels[key]?.[language === 'ar' ? 0 : 1] ?? key}
              <input
                required={
                  key !== 'effectiveTo' &&
                  key !== 'countryReferenceId' &&
                  !['serviceId', 'packageId'].includes(key)
                }
                className="block w-full rounded-xl border p-3"
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
          ))}
          <button disabled={busy || reason.trim().length < 3} className="rounded-xl border p-3">
            {t('svc_create')}
          </button>
        </form>
      )}
    </section>
  );
}
