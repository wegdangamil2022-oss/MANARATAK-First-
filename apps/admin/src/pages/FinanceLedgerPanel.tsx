import {useEffect, useState} from 'react';
import {Link, useSearchParams} from 'react-router-dom';
import type {FinancialApprovalDto, FinancialTransactionDto} from '@manaratak/domain';
import {useTranslation} from '../i18n/I18nProvider';
import {financeMoney} from './financePresentation';
import {useFinanceRead} from './useFinanceRead';
import {useFinanceOperation} from './useFinanceOperation';
import {FinanceOperationStatus} from './FinanceOperationStatus';

export function FinanceLedgerPanel({refreshToken = 0}: {refreshToken?: number}) {
  const {t} = useTranslation(), [params, setParams] = useSearchParams();
  const id = params.get('transaction') || '';
  const [reference, setReference] = useState(id), [approvalInput, setApprovalInput] = useState(''),
    [approvalId, setApprovalId] = useState(''), [reason, setReason] = useState('');
  const read = useFinanceRead<FinancialTransactionDto>(id ? `/admin/finance/ledger/transactions/${encodeURIComponent(id)}` : null, refreshToken);
  const approval = useFinanceRead<FinancialApprovalDto>(approvalId ? `/admin/finance/approvals/${encodeURIComponent(approvalId)}` : null, id);
  const op = useFinanceOperation(id, () => {read.reload(); approval.reload();});
  useEffect(() => {setReference(id); setApprovalInput(''); setApprovalId(''); setReason('');}, [id]);
  const record = read.data, blocked = op.busy || Boolean(op.intent) || read.loading;
  const eligible = record?.businessReferenceType === 'MANUAL_ADJUSTMENT' && !record.reversalOfId && !record.reversalId;
  const approved = approval.data?.actionType === 'MANUAL_LEDGER_REVERSE' &&
    approval.data.targetReferenceId === record?.id && approval.data.status === 'APPROVED' &&
    !approval.data.consumedAt && approval.data.expiresAt && new Date(approval.data.expiresAt).getTime() > Date.now();
  return <section className="space-y-4">
    <form className="flex gap-3" onSubmit={event => {
      event.preventDefault(); if (!blocked) setParams({tab: 'ledger', transaction: reference.trim()});
    }}>
      <input aria-label={t('finance_transaction_reference')} required maxLength={160} disabled={blocked}
        value={reference} onChange={event => setReference(event.target.value)} className="rounded-xl border p-3" />
      <button type="submit" disabled={blocked}>{t('finance_lookup')}</button>
    </form>
    <FinanceOperationStatus operation={op} />
    {read.loading && <p role="status">{t('finance_loading')}</p>}
    {read.error && <p role="alert">{read.error}</p>}
    {record && <>
      <h3 className="font-bold">{record.publicId}</h3>
      <p>{record.businessReferenceType} · {record.businessReferenceId}</p>
      <p>{t('finance_ledger_notice')}</p>
      <ul>{record.entries.map(entry => <li key={entry.id} dir="ltr">
        {entry.accountId} · {entry.direction} · {financeMoney(entry.amount)}
      </li>)}</ul>
      {record.reversalId && <p>{t('finance_reversal_reference')}: {record.reversalId}</p>}
      {!eligible && <p>{t('finance_ledger_not_reversible')}</p>}
      {eligible && <div className="space-y-3 rounded-xl border p-4">
        <p>{t('finance_reversal_policy')}</p>
        <button disabled={blocked} onClick={() => {
          if (window.confirm(t('finance_confirm_reverse_approval')))
            op.submit('/admin/finance/approvals', {actionType: 'MANUAL_LEDGER_REVERSE', targetReferenceId: record.id});
        }}>{t('finance_request_reverse_approval')}</button>
        <Link to="/finance?tab=approvals" className="block underline">{t('finance_tab_approvals')}</Link>
        <form className="flex gap-3" onSubmit={event => {
          event.preventDefault(); if (!blocked) setApprovalId(approvalInput.trim());
        }}>
          <input aria-label={t('finance_approval_reference')} required maxLength={160} disabled={blocked} value={approvalInput}
            onChange={event => {setApprovalInput(event.target.value); setApprovalId('');}} className="rounded-xl border p-3" />
          <button disabled={blocked} type="submit">{t('finance_lookup')}</button>
        </form>
        {approval.error && <p role="alert">{approval.error}</p>}
        {approval.data && <p>{approval.data.publicId} · {approval.data.status} · {approval.data.policyReference}</p>}
        <textarea aria-label={t('finance_reversal_reason')} value={reason} minLength={3} maxLength={500} disabled={blocked}
          onChange={event => setReason(event.target.value)} className="rounded-xl border p-3" />
        <button disabled={blocked || !approved || reason.trim().length < 3} onClick={() => {
          if (approved && approval.data && reason.trim().length >= 3 && window.confirm(t('finance_confirm_reversal')))
            op.submit(`/admin/finance/ledger/transactions/${encodeURIComponent(record.id)}/reverse`,
              {approvalId: approval.data.id, reason: reason.trim()});
        }}>{t('finance_reverse_ledger')}</button>
      </div>}
    </>}
  </section>;
}
