import {useState} from 'react';
import type {FinancialApprovalDto} from '@manaratak/domain';
import {useTranslation} from '../i18n/I18nProvider';
import {useFinanceOperation} from './useFinanceOperation';
import {FinanceOperationStatus} from './FinanceOperationStatus';

export function FinanceApprovalDecisionPanel({approval, refresh}: {approval: FinancialApprovalDto; refresh: () => void}) {
  const {t} = useTranslation(), [reason, setReason] = useState(''), [error, setError] = useState('');
  const op = useFinanceOperation(approval.id, refresh);
  const eligible = approval.status === 'PENDING' && Number.isSafeInteger(approval.version) &&
    approval.expiresAt && new Date(approval.expiresAt).getTime() > Date.now();
  return <section className="space-y-3 rounded-xl border p-4">
    <h2 className="font-bold">{t('finance_approval_decision')}</h2>
    <p>{t('finance_approval_maker')}: {approval.makerId}</p>
    <p>{t('finance_approval_quorum')}: {approval.requiredApprovals}</p>
    <p>{approval.policyReference}</p>
    <ul>{approval.decisions.map(decision => <li key={decision.id}>
      {decision.approverId} · {decision.decision}
    </li>)}</ul>
    <FinanceOperationStatus operation={op} />
    {error && <p role="alert">{error}</p>}
    <textarea aria-label={t('finance_reason')} value={reason} maxLength={500} disabled={op.busy || Boolean(op.intent)}
      onChange={event => setReason(event.target.value)} className="rounded-xl border p-3" />
    {(['APPROVE', 'REJECT'] as const).map(decision => <button key={decision}
      disabled={!eligible || op.busy || Boolean(op.intent)} className="m-2 rounded-xl border p-3"
      onClick={() => {
        if (decision === 'REJECT' && !reason.trim()) {setError(t('finance_reason')); return;}
        setError('');
        if (window.confirm(t('finance_confirm_approval_decision')))
          op.submit(`/admin/finance/approvals/${encodeURIComponent(approval.id)}/decisions`,
            {decision, reason: reason.trim() || undefined, expectedVersion: approval.version});
      }}>{t(decision === 'APPROVE' ? 'finance_approve' : 'finance_reject')}</button>)}
  </section>;
}
