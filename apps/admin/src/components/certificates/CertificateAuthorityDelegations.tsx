import { useEffect, useState } from 'react';
import { certificateCopy, certificateStatusCopy } from '@manaratak/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { adminApiClient } from '../../api/client';
type Delegation = {
  id: string;
  authorityReference: string;
  legalRegistryReference: string;
  evidenceAssetId: string;
  canonicalOwnerId: string;
  signingKeyReference: string;
  status: string;
  version: number;
  createdBy: string;
  reviewedBy?: string;
  reviewReason?: string;
  validFrom: string;
  validUntil: string;
};
export function CertificateAuthorityDelegations({
  issuerId,
  onUse,
}: {
  issuerId: string;
  onUse?: (grant: {
    authorityReference: string;
    evidenceAssetId: string;
  }) => void;
}) {
  const { language } = useTranslation(),
    copy = (value: string) => certificateCopy(language, value),
    { hasPermission } = useAdminAuthorization();
  const [rows, setRows] = useState<Delegation[]>([]),
    [cursor, setCursor] = useState<string | undefined>(),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState({
    authorityReference: '',
    legalRegistryReference: '',
    evidenceAssetId: '',
    validFrom: '',
    validUntil: '',
    reason: '',
  });
  const [selected, setSelected] = useState<Delegation | null>(null),
    [ownership, setOwnership] = useState(false),
    [delegation, setDelegation] = useState(false),
    [reason, setReason] = useState('');
  const load = async () => {
    setLoading(true);
    try {
      const result = await adminApiClient.request<{ data: Delegation[] }>(
        `/admin/certificates/issuers/${issuerId}/delegations${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ''}`,
      );
      setRows(result.data);
    } catch (e) {
      setError(e instanceof Error ? e.message : copy('تعذر تحميل التفويضات'));
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [issuerId, cursor]);
  const review = async (status: 'APPROVED' | 'REVOKED') => {
    if (!selected) return;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(
        `/admin/certificates/delegations/${selected.id}/review`,
        {
          method: 'POST',
          body: JSON.stringify({
            expectedVersion: selected.version,
            status,
            ownershipVerified: ownership,
            delegationVerified: delegation,
            reason,
          }),
        },
      );
      setSelected(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : copy('تعذر اعتماد التفويض'));
    } finally {
      setBusy(false);
    }
  };
  const download = async (row: Delegation) => {
    setBusy(true);
    try {
      const grant = await adminApiClient.request<{
        url: string;
        headers?: Record<string, string>;
      }>(`/admin/certificates/delegations/${row.id}/evidence-delivery-grant`, {
        method: 'POST',
      });
      const response = await fetch(grant.url, {
        headers: grant.headers,
        redirect: 'error',
        signal: AbortSignal.timeout(20000),
      });
      if (!response.ok || !response.body)
        throw new Error(copy('تعذر تنزيل وثيقة التفويض'));
      const reader = response.body.getReader(),
        chunks: Uint8Array[] = [];
      let size = 0;
      try {
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          size += value.byteLength;
          if (size > 20 * 1024 * 1024)
            throw new Error(copy('وثيقة التفويض أكبر من الحد المسموح'));
          chunks.push(value);
        }
      } finally {
        await reader.cancel();
      }
      const blob = new Blob(chunks as BlobPart[], {
          type:
            response.headers.get('content-type') || 'application/octet-stream',
        }),
        url = URL.createObjectURL(blob),
        anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `delegation-evidence-${row.id}`;
      anchor.rel = 'noopener';
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : copy('تعذر تنزيل وثيقة التفويض'),
      );
    } finally {
      setBusy(false);
    }
  };
  const field = (key: keyof typeof draft, label: string, type = 'text') => (
    <label key={key} className="block">
      {copy(label)}
      <input
        required
        type={type}
        value={draft[key]}
        onChange={(event) => setDraft({ ...draft, [key]: event.target.value })}
        className="block w-full rounded border p-2"
      />
    </label>
  );
  return (
    <section className="space-y-4">
      <p>
        {copy(
          'يعتمد التفويض على وثيقة خاصة وإثبات الملكية القانونية وصلاحية إصدار الشهادات؛ لا يكفي اسم الجهة أو وجودها في الدليل.',
        )}
      </p>
      {error ? <p role="alert">{copy(error)}</p> : null}
      {loading ? (
        <p>{copy('جارٍ التحميل…')}</p>
      ) : (
        rows.map((row) => (
          <article key={row.id} className="rounded border p-3">
            <p>
              {row.authorityReference} ·{' '}
              {certificateStatusCopy(language, row.status)} · {copy('المنشئ')}:{' '}
              {row.createdBy}
            </p>
            <p>
              {copy('مرجع السجل القانوني')}: {row.legalRegistryReference} ·{' '}
              {copy('المالك المعتمد')}: {row.canonicalOwnerId}
            </p>
            <p>
              {copy('مرجع مفتاح التوقيع')}:{' '}
              <span dir="ltr">{row.signingKeyReference}</span>
            </p>
            <p>
              {copy('حتى')}:{' '}
              {new Intl.DateTimeFormat(language, {
                dateStyle: 'medium',
                timeStyle: 'short',
              }).format(new Date(row.validUntil))}
            </p>
            <p>
              {copy('المراجع')}: {row.reviewedBy || '—'} · {row.reviewReason}
            </p>
            <button disabled={busy} onClick={() => void download(row)}>
              {copy('تنزيل وثيقة التفويض')}
            </button>
            {row.status === 'APPROVED' &&
            new Date(row.validFrom) <= new Date() &&
            new Date(row.validUntil) > new Date() &&
            onUse ? (
              <button disabled={busy} onClick={() => onUse(row)}>
                {copy('استخدام التفويض للاعتماد')}
              </button>
            ) : null}
            {hasPermission('admin:certificates:issuers:approve') &&
            row.status !== 'REVOKED' ? (
              <button
                disabled={busy}
                onClick={() => {
                  setSelected(row);
                  setReason('');
                  setOwnership(false);
                  setDelegation(false);
                }}
              >
                {copy('مراجعة التفويض')}
              </button>
            ) : null}
          </article>
        ))
      )}
      <button disabled={!cursor || busy} onClick={() => setCursor(undefined)}>
        {copy('الأحدث')}
      </button>
      <button
        disabled={rows.length < 25 || busy}
        onClick={() => setCursor(rows[rows.length - 1]?.id)}
      >
        {copy('الأقدم')}
      </button>
      {selected ? (
        <div className="rounded border p-3">
          <p>{selected.authorityReference}</p>
          {selected.status === 'PENDING_APPROVAL' ? (
            <>
              <label className="block">
                <input
                  type="checkbox"
                  checked={ownership}
                  onChange={(event) => setOwnership(event.target.checked)}
                />
                {copy(
                  'راجعت وثيقة السجل وأثبتّ ملكية الجهة القانونية للمعرّف المعتمد.',
                )}
              </label>
              <label className="block">
                <input
                  type="checkbox"
                  checked={delegation}
                  onChange={(event) => setDelegation(event.target.checked)}
                />
                {copy(
                  'راجعت تفويض إصدار الشهادات وحدوده ومفتاح الجهة وفترة صلاحيته.',
                )}
              </label>
            </>
          ) : null}
          <label>
            {copy('سبب الاعتماد')}
            <textarea
              minLength={8}
              maxLength={2000}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="block w-full rounded border"
            />
          </label>
          {selected.status === 'PENDING_APPROVAL' ? (
            <button
              disabled={
                busy || !ownership || !delegation || reason.trim().length < 8
              }
              onClick={() => void review('APPROVED')}
            >
              {copy('اعتماد التفويض')}
            </button>
          ) : null}
          <button
            disabled={busy || reason.trim().length < 8}
            onClick={() => void review('REVOKED')}
          >
            {copy('سحب التفويض')}
          </button>
          <button disabled={busy} onClick={() => setSelected(null)}>
            {copy('إلغاء')}
          </button>
        </div>
      ) : null}
      {hasPermission('admin:certificates:issuers:manage') ? (
        <form
          onSubmit={async (event) => {
            event.preventDefault();
            setBusy(true);
            setError('');
            try {
              await adminApiClient.request(
                `/admin/certificates/issuers/${issuerId}/delegations`,
                {
                  method: 'POST',
                  body: JSON.stringify({
                    ...draft,
                    validFrom: new Date(draft.validFrom).toISOString(),
                    validUntil: new Date(draft.validUntil).toISOString(),
                  }),
                },
              );
              setDraft({
                authorityReference: '',
                legalRegistryReference: '',
                evidenceAssetId: '',
                validFrom: '',
                validUntil: '',
                reason: '',
              });
              setCursor(undefined);
              await load();
            } catch (e) {
              setError(
                e instanceof Error ? e.message : copy('تعذر حفظ التفويض'),
              );
            } finally {
              setBusy(false);
            }
          }}
          className="grid gap-3"
        >
          {field('authorityReference', 'مرجع السلطة')}
          {field('legalRegistryReference', 'مرجع السجل القانوني')}
          {field('evidenceAssetId', 'مرجع وثيقة التفويض')}
          {field('validFrom', 'بداية التفويض', 'datetime-local')}
          {field('validUntil', 'نهاية التفويض', 'datetime-local')}
          {field('reason', 'سبب الاعتماد')}
          <button disabled={busy || draft.reason.trim().length < 8}>
            {copy('إرسال التفويض للمراجعة')}
          </button>
        </form>
      ) : null}
    </section>
  );
}
