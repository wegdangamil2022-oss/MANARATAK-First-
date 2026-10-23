import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Send, ShieldCheck, ExternalLink } from 'lucide-react';
import { ApiClient, apiFetch } from '../../api/client';
import { StudentDocumentUpload } from '../students/StudentDocumentUpload';
import { useTranslation } from '../../i18n/I18nProvider';
type Offering = {
  slug: string;
  displayName: string;
  serviceDescription: string;
  managedApplication?: boolean;
  serviceAvailabilityStatus: string;
  fulfillmentPolicy: string;
  inputSchema?: Array<{
    key: string;
    type: 'TEXT' | 'NUMBER' | 'BOOLEAN' | 'ASSET';
    required: boolean;
  }>;
  approvedPrice?: { amountMinorUnits: string; currencyCode: string; scale: number } | null;
};
/** Uses the published services contract and existing private-document pipeline. */
export function ManagedApplicationEntry({ opportunityId }: { opportunityId?: string }) {
  const { language } = useTranslation(),
    tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [offerings, setOfferings] = useState<Offering[]>([]),
    [selected, setSelected] = useState(''),
    [cursor, setCursor] = useState<string | null>(null),
    [opened, setOpened] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [consent, setConsent] = useState(false),
    [parameters, setParameters] = useState<Record<string, unknown>>({}),
    [receipt, setReceipt] = useState('');
  const retry = useRef<{ payload: string; key: string } | null>(null),
    service = offerings.find((item) => item.slug === selected);
  const base = import.meta.env.VITE_API_URL || '/api/v1';
  if (!opportunityId || import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype') return null;
  const load = async (next?: string) => {
    setBusy(true);
    setError('');
    setOpened(true);
    try {
      const query = new URLSearchParams({
        fulfillmentType: 'APPLICATION_SUPPORT',
        limit: '20',
        locale: language,
        ...(next ? { cursor: next } : {}),
      });
      const response = await fetch(`${base}/public/services?${query}`, {
        credentials: 'omit',
        cache: 'no-store',
      });
      if (!response.ok)
        throw new Error(tr('تعذّر قراءة الخدمات المعتمدة.', 'Approved services unavailable.'));
      const page = await response.json();
      const available = (page.data as Offering[]).filter(
        (item) => item.managedApplication && item.serviceAvailabilityStatus === 'AVAILABLE',
      );
      setOfferings((rows) => (next ? [...rows, ...available] : available));
      setCursor(page.nextCursor ?? null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SERVICE_UNAVAILABLE');
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="mt-3 rounded-xl border border-[#DDEFF2] p-3 text-[13px] text-[#142B5F]">
      <h3 className="flex items-center gap-2 font-bold">
        <Send className="h-4 w-4 text-[#0E7C86]" />
        {tr('قدّم عبر منارتك', 'Apply through MANARATAK')}
      </h3>
      <p className="my-2">
        {tr(
          'يراجع فريق منارتك ملفك ويقدّم نيابة عنك وفق الخدمة المعتمدة. إرسال طلب الخدمة ليس إثباتًا لإرساله إلى الجامعة، ولا يلزم لاستخدام الرابط المباشر.',
          'The MANARATAK team reviews your file and applies on your behalf under an approved service. Request receipt is not proof of university submission; the service is not required to use the direct link.',
        )}
      </p>
      {!opened && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void load()}
          className="rounded-lg bg-[#0E7C86] px-3 py-2 font-bold text-white"
        >
          {tr('اختيار خدمة تقديم معتمدة', 'Choose an approved application service')}
        </button>
      )}
      {opened && (
        <>
          <label className="block font-bold">
            {tr('الخدمة', 'Service')}
            <select
              className="mt-1 w-full rounded-lg border p-2"
              value={selected}
              disabled={busy}
              onChange={(event) => {
                setSelected(event.target.value);
                setParameters({});
                setConsent(false);
                setReceipt('');
                retry.current = null;
              }}
            >
              <option value="">{tr('اختر خدمة', 'Select a service')}</option>
              {offerings.map((item) => (
                <option key={item.slug} value={item.slug}>
                  {item.displayName}
                </option>
              ))}
            </select>
          </label>
          {!offerings.length && !busy && (
            <p>
              {tr(
                'لا توجد خدمة تقديم منشورة في الصفحة المقروءة. يمكنك التقديم المباشر لدى الجهة.',
                'No published managed application service in the loaded page. Direct applications remain available.',
              )}
            </p>
          )}
          {cursor && (
            <button type="button" disabled={busy} onClick={() => void load(cursor)}>
              {tr('المزيد من الخدمات', 'More services')}
            </button>
          )}
          {service && (
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (busy || !consent) return;
                const payload = JSON.stringify({
                  serviceId: service.slug,
                  requestParameters: parameters,
                  applicationOpportunityId: opportunityId,
                  consent: true,
                });
                if (retry.current?.payload !== payload)
                  retry.current = { payload, key: crypto.randomUUID() };
                setBusy(true);
                setError('');
                void ApiClient.createMyStudentServiceRequest({
                  ...JSON.parse(payload),
                  idempotencyKey: retry.current.key,
                })
                  .then((result) => setReceipt(result.publicId))
                  .catch((cause) =>
                    setError(cause instanceof Error ? cause.message : 'SERVICE_REQUEST_FAILED'),
                  )
                  .finally(() => setBusy(false));
              }}
            >
              <p className="my-2">{service.serviceDescription}</p>
              <p>
                {service.fulfillmentPolicy === 'FREE'
                  ? tr('خدمة مجانية.', 'Free service.')
                  : service.approvedPrice
                    ? `${service.approvedPrice.amountMinorUnits} ${service.approvedPrice.currencyCode} ${tr('(بالوحدات النقدية الصغرى؛ يلزم اعتماد الدفع عبر مساره الآمن)', '(minor units; payment requires the secure payment workflow)')}`
                    : tr(
                        'يحتاج الطلب عرض سعر قبل التنفيذ؛ لا يجري دفع تلقائي.',
                        'A quote is required before fulfillment; no automatic payment.',
                      )}
              </p>
              {(service.inputSchema ?? []).map((field) => (
                <div key={field.key} className="my-3">
                  <label className="block font-bold" htmlFor={`managed-${field.key}`}>
                    {field.key}
                    {field.required ? ' *' : ''}
                  </label>
                  {field.type === 'ASSET' ? (
                    <>
                      <StudentDocumentUpload
                        onUploaded={(asset) =>
                          setParameters((values) => ({ ...values, [field.key]: asset.id }))
                        }
                      />
                      {parameters[field.key] ? (
                        <p className="flex gap-1">
                          <ShieldCheck className="h-4 w-4" />
                          {tr('ملف آمن جاهز للإرسال', 'Checked file ready')}
                        </p>
                      ) : (
                        <input
                          id={`managed-${field.key}`}
                          type="text"
                          required={field.required}
                          value=""
                          readOnly
                          className="sr-only"
                          aria-label={field.key}
                        />
                      )}
                    </>
                  ) : field.type === 'BOOLEAN' ? (
                    <input
                      id={`managed-${field.key}`}
                      type="checkbox"
                      required={field.required}
                      checked={parameters[field.key] === true}
                      disabled={busy}
                      onChange={(event) =>
                        setParameters((values) => ({
                          ...values,
                          [field.key]: event.target.checked,
                        }))
                      }
                    />
                  ) : (
                    <input
                      id={`managed-${field.key}`}
                      type={field.type === 'NUMBER' ? 'number' : 'text'}
                      required={field.required}
                      maxLength={2000}
                      className="w-full rounded-lg border p-2"
                      disabled={busy}
                      value={String(parameters[field.key] ?? '')}
                      onChange={(event) =>
                        setParameters((values) => ({
                          ...values,
                          [field.key]:
                            field.type === 'NUMBER'
                              ? Number(event.target.value)
                              : event.target.value,
                        }))
                      }
                    />
                  )}
                </div>
              ))}
              <label className="my-3 flex gap-2">
                <input
                  type="checkbox"
                  required
                  checked={consent}
                  disabled={busy}
                  onChange={(event) => setConsent(event.target.checked)}
                />
                {tr(
                  'أفوّض فريق منارتك بمعالجة مستندات هذا الطلب لغرض التقديم نيابة عني وفق وصف الخدمة. الاحتفاظ بحد أقصى 180 يومًا، مع الاستثناءات النظامية للحفظ.',
                  'I authorize MANARATAK to process this request’s documents to apply on my behalf under the service terms. Retention up to 180 days, subject to lawful preservation exceptions.',
                )}
              </label>
              <button
                type="submit"
                disabled={
                  busy ||
                  !consent ||
                  Boolean(receipt) ||
                  (service.inputSchema ?? []).some(
                    (field) => field.required && field.type === 'ASSET' && !parameters[field.key],
                  )
                }
                className="rounded-lg bg-[#142B5F] px-4 py-2 font-bold text-white disabled:opacity-50"
              >
                {tr('إرسال طلب الخدمة إلى منارتك', 'Submit service request to MANARATAK')}
              </button>
              {receipt && (
                <p role="status">
                  {tr('استلمت منارتك الطلب', 'MANARATAK received request')}: <bdi>{receipt}</bdi> ·{' '}
                  {tr(
                    'لم يثبت الإرسال للجامعة بعد.',
                    'University submission is not yet established.',
                  )}
                </p>
              )}
            </form>
          )}
        </>
      )}
      {busy && <p role="status">{tr('جار معالجة الطلب…', 'Processing…')}</p>}
      {error && (
        <div role="alert">
          <p>{error}</p>
          <Link to={`/${language}/login`}>
            {tr('تسجيل الدخول بحساب الطالب', 'Sign in as a student')}
          </Link>
        </div>
      )}
    </section>
  );
}
export function DirectApplicationSelfReport({ opportunityId }: { opportunityId?: string }) {
  const { language } = useTranslation(),
    tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [busy, setBusy] = useState(false),
    [done, setDone] = useState(false),
    [error, setError] = useState(false);
  const retryKey = useRef<string | null>(null);
  if (!opportunityId || import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype') return null;
  return (
    <div className="mt-3 text-xs">
      <button
        type="button"
        disabled={busy || done}
        className="inline-flex items-center gap-2 rounded-lg border border-[#DDEFF2] px-3 py-2 font-bold"
        onClick={() => {
          retryKey.current ??= crypto.randomUUID();
          setBusy(true);
          setError(false);
          void apiFetch(
            `${import.meta.env.VITE_API_URL || '/api/v1'}/student/direct-applications`,
            {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json', 'Idempotency-Key': retryKey.current },
              body: JSON.stringify({ opportunityId, acknowledgement: true }),
            },
          )
            .then((response) => {
              if (!response.ok) throw new Error();
              setDone(true);
            })
            .catch(() => setError(true))
            .finally(() => setBusy(false));
        }}
      >
        <ExternalLink className="h-4 w-4" />
        {done
          ? tr('سُجل إقرارك — غير موثّق', 'Report recorded — unverified')
          : tr(
              'أؤكد أنني قدّمت خارج منارتك — إقرار غير موثّق',
              'I confirm I applied externally — unverified self-report',
            )}
      </button>
      {error && (
        <p role="alert">
          {tr(
            'تعذّر التسجيل؛ تحقق من تسجيل الدخول بحساب طالب.',
            'Could not record; check your student sign-in.',
          )}
        </p>
      )}
    </div>
  );
}
