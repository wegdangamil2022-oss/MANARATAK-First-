import { useRef, useState } from 'react';
import type { ServiceRequestDto } from '@manaratak/domain';
import { MANAGED_APPLICATION_EVENTS, type ManagedApplicationEventKind } from '@manaratak/shared';
import { ShieldCheck } from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTranslation } from '../i18n/I18nProvider';
export function ManagedApplicationEvidenceEditor({
  request,
  onSaved,
  onBusy,
}: {
  request: ServiceRequestDto;
  onSaved: () => Promise<void>;
  onBusy: (busy: boolean) => void;
}) {
  const { language } = useTranslation(),
    tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const { hasPermission } = useAdminAuthorization();
  const [kind, setKind] = useState<ManagedApplicationEventKind>(
      request.status === 'COMPLETED' ? 'ADMISSION_ACCEPTED' : 'NEEDS_INFORMATION',
    ),
    [asset, setAsset] = useState(''),
    [assets, setAssets] = useState<Array<{ id: string; name: string }>>([]),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const retry = useRef<{ payload: string; key: string } | null>(null),
    lock = useRef(false);
  const proven = ['UNIVERSITY_SUBMITTED', 'ADMISSION_ACCEPTED', 'ADMISSION_REJECTED'].includes(
    kind,
  );
  if (
    request.serviceSnapshot?.managedApplication !== true ||
    !hasPermission('admin:services:requests:fulfill') ||
    request.status === 'CANCELLED' ||
    (request.status === 'COMPLETED' && !hasPermission('admin:services:applications:verify'))
  )
    return null;
  const titles = {
    NEEDS_INFORMATION: tr('طلب استكمال المستندات', 'Needs information'),
    PROCESSING: tr('العودة للمعالجة', 'Processing'),
    UNIVERSITY_SUBMITTED: tr('إرسال موثّق للجامعة', 'Evidenced university submission'),
    ADMISSION_ACCEPTED: tr('قبول جامعي موثّق', 'Verified official acceptance'),
    ADMISSION_REJECTED: tr('رفض جامعي موثّق', 'Verified official rejection'),
  };
  const base = `/admin/services/requests/${encodeURIComponent(request.id)}/application-evidence`;
  const load = async (after?: string) => {
    setBusy(true);
    setError('');
    try {
      const page = await adminApiClient.request<{
        items: Array<{ id: string; name: string }>;
        nextCursor: string | null;
      }>(base + '/assets' + (after ? '?after=' + encodeURIComponent(after) : ''), {
        cache: 'no-store',
      });
      setAssets((rows) => (after ? [...rows, ...page.items] : page.items));
      setCursor(page.nextCursor);
    } catch {
      setError(
        tr(
          'تعذّر تحميل مستندات الإثبات الخاصة بك.',
          'Could not read your private evidence documents.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  return (
    <form
      className="space-y-3 rounded-xl border border-[#DDEFF2] p-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (lock.current) return;
        lock.current = true;
        setBusy(true);
        onBusy(true);
        setError('');
        const body = {
            kind,
            evidenceAssetId: proven ? asset : null,
            expectedVersion: request.version,
          },
          payload = JSON.stringify(body);
        if (retry.current?.payload !== payload)
          retry.current = { payload, key: crypto.randomUUID() };
        void adminApiClient
          .request(base, { method: 'POST', body: payload, idempotencyKey: retry.current.key })
          .then(onSaved)
          .catch((cause) =>
            setError(
              cause instanceof Error
                ? cause.message
                : tr('تعذّر حفظ الإثبات.', 'Could not save evidence.'),
            ),
          )
          .finally(() => {
            lock.current = false;
            setBusy(false);
            onBusy(false);
          });
      }}
    >
      <h3 className="flex items-center gap-2 text-sm font-bold">
        <ShieldCheck className="h-4 w-4 text-[#0E7C86]" />
        {tr('إثبات مراحل التقديم', 'Application stage evidence')}
      </h3>
      <label className="block text-xs font-bold">
        {tr('الإجراء', 'Action')}
        <select
          className="mt-1 w-full rounded-lg border p-2"
          value={kind}
          disabled={busy}
          onChange={(event) => setKind(event.target.value as ManagedApplicationEventKind)}
        >
          {MANAGED_APPLICATION_EVENTS.filter(
            (value) =>
              (hasPermission('admin:services:applications:verify') ||
                !['UNIVERSITY_SUBMITTED', 'ADMISSION_ACCEPTED', 'ADMISSION_REJECTED'].includes(
                  value,
                )) &&
              (request.status !== 'COMPLETED' || value.startsWith('ADMISSION_')),
          ).map((value) => (
            <option key={value} value={value}>
              {titles[value]}
            </option>
          ))}
        </select>
      </label>
      {proven && (
        <>
          <p className="text-xs">
            {tr(
              'اختر مستندًا رسميًا خاصًا تملكه، نشطًا واجتاز فحوص الأمان. لا يكفي استلام الملف أو دفع الرسوم لإثبات التقديم أو القبول.',
              'Choose an active private official document you own that passed security checks. File receipt or payment does not establish submission or admission.',
            )}
          </p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void load()}
            className="rounded-lg border px-3 py-2 text-xs font-bold"
          >
            {tr('تحميل مستندات الإثبات', 'Load evidence documents')}
          </button>
          <label className="block text-xs font-bold">
            {tr('المستند الرسمي', 'Official evidence document')}
            <select
              required
              value={asset}
              disabled={busy}
              className="mt-1 w-full rounded-lg border p-2"
              onChange={(event) => setAsset(event.target.value)}
            >
              <option value="">{tr('اختر مستندًا', 'Select document')}</option>
              {assets.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </label>
          {cursor && (
            <button type="button" disabled={busy} onClick={() => void load(cursor)}>
              {tr('المزيد من المستندات', 'More documents')}
            </button>
          )}
        </>
      )}
      <button
        type="submit"
        disabled={busy || (proven && !asset)}
        className="rounded-lg bg-[#142B5F] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
      >
        {tr('تسجيل الإجراء بإثباته', 'Record evidenced action')}
      </button>
      {error && (
        <p role="alert" className="text-xs text-rose-800">
          {error}
        </p>
      )}
    </form>
  );
}
