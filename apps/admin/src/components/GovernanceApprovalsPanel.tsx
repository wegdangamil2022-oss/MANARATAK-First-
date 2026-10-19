import { useEffect, useState } from 'react';
import { ADMIN_PERMISSION_CATALOG } from '@absheer/shared';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
interface Approval {
  id: string;
  scope: string;
  requestedBy: string;
  approverId: string;
  payload: {
    pairs?: Array<{ first: string; second: string; description: string }>;
    principalId?: string;
    identityId?: string;
    pairIds?: string[];
    expiresAt?: string;
    reason: string;
    changeTicket: string;
  };
  expiresAt: string;
  approvedAt: string | null;
  usedAt: string | null;
}
export function GovernanceApprovalsPanel({ onApplied }: { onApplied: () => Promise<void> }) {
  const { t, language } = useTranslation();
  const [rows, setRows] = useState<Approval[]>([]),
    [actor, setActor] = useState(''),
    [cursor, setCursor] = useState<string | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const load = async (next?: string) => {
    const result = await adminApiClient.request<{
      data: { actorId: string; items: Approval[]; nextCursor: string | null };
    }>(
      '/admin/authorization/governance/approvals?limit=25' +
        (next ? '&cursor=' + encodeURIComponent(next) : ''),
    );
    setActor(result.data.actorId);
    setRows((old) => (next ? [...old, ...result.data.items] : result.data.items));
    setCursor(result.data.nextCursor);
  };
  useEffect(() => {
    void load().catch(() => setError(t('iam_governance_failed')));
  }, []);
  const action = async (row: Approval, apply: boolean) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      if (apply) {
        const { changeTicket, ...payload } = row.payload;
        const path =
          row.scope === 'DUTY_POLICY'
            ? '/duties'
            : row.scope === 'DUTY_EXCEPTION'
              ? '/duties/exceptions'
              : '/mfa-reset';
        await adminApiClient.request('/admin/authorization/governance' + path, {
          method: row.scope === 'DUTY_POLICY' ? 'PUT' : 'POST',
          idempotencyKey: 'apply:' + row.id,
          headers: {
            'x-governance-approval-id': row.id,
            'x-second-approver-id': row.approverId,
            'x-change-ticket': changeTicket,
          },
          body: JSON.stringify(payload),
        });
        await onApplied();
      } else
        await adminApiClient.request(
          '/admin/authorization/governance/approvals/' + encodeURIComponent(row.id) + '/approve',
          { method: 'POST', idempotencyKey: 'approve:' + row.id, body: '{}' },
        );
      await load();
    } catch {
      setError(t('iam_governance_failed'));
    } finally {
      setBusy(false);
    }
  };
  const label = (key: string) => {
    const entry = ADMIN_PERMISSION_CATALOG.find((item) => item.key === key);
    return entry ? (language === 'ar' ? entry.labelAr : entry.labelEn) : key;
  };
  return (
    <section className="space-y-3 rounded-xl border p-4">
      <h3 className="font-bold">{t('iam_approvals_title')}</h3>
      <p>{t('iam_approvals_help')}</p>
      <button
        type="button"
        disabled={busy}
        onClick={() => void load().catch(() => setError(t('iam_governance_failed')))}
      >
        {t('iam_approvals_refresh')}
      </button>
      {error && <p role="alert">{error}</p>}
      <ul className="space-y-3">
        {rows.map((row) => (
          <li key={row.id} className="rounded border p-3">
            <h4>
              {t(
                row.scope === 'DUTY_POLICY'
                  ? 'iam_duty_pairs'
                  : row.scope === 'DUTY_EXCEPTION'
                    ? 'iam_duty_exception'
                    : 'iam_mfa_reset',
              )}
            </h4>
            <p>
              {row.requestedBy} → {row.approverId}
            </p>
            <p>{row.payload.reason}</p>
            <p>{row.payload.changeTicket}</p>
            {(row.payload.principalId || row.payload.identityId) && (
              <p>{row.payload.principalId ?? row.payload.identityId}</p>
            )}
            <ul>
              {row.payload.pairs?.map((pair, index) => (
                <li key={index}>
                  {label(pair.first)} + {label(pair.second)} — {pair.description}
                </li>
              ))}
            </ul>
            {row.payload.pairIds && <p>{row.payload.pairIds.join(', ')}</p>}
            {row.payload.expiresAt && (
              <time>{new Date(row.payload.expiresAt).toLocaleString(language)}</time>
            )}
            <p>
              {t('iam_approval_until')}{' '}
              <time>{new Date(row.expiresAt).toLocaleString(language)}</time>
            </p>
            {!row.usedAt && Date.parse(row.expiresAt) > Date.now() && (
              <>
                {actor === row.approverId && !row.approvedAt && (
                  <button type="button" disabled={busy} onClick={() => void action(row, false)}>
                    {t('iam_approval_confirm')}
                  </button>
                )}
                {actor === row.requestedBy && row.approvedAt && (
                  <button type="button" disabled={busy} onClick={() => void action(row, true)}>
                    {t('iam_approval_apply')}
                  </button>
                )}
              </>
            )}
            {row.usedAt && <p>{t('iam_approval_used')}</p>}
          </li>
        ))}
      </ul>
      {cursor && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void load(cursor).catch(() => setError(t('iam_governance_failed')))}
        >
          {t('iam_next')}
        </button>
      )}
    </section>
  );
}
