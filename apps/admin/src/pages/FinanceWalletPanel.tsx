import {useEffect, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import type {FinanceInvoiceDto, WalletOperationsDto} from '@manaratak/domain';
import {useTranslation} from '../i18n/I18nProvider';
import {financeMoney} from './financePresentation';
import {useFinanceRead} from './useFinanceRead';
import {useFinanceOperation} from './useFinanceOperation';
import {FinanceOperationStatus} from './FinanceOperationStatus';

export function FinanceWalletPanel({refreshToken = 0}: {refreshToken?: number}) {
  const {t} = useTranslation(), [params, setParams] = useSearchParams();
  const id = params.get('wallet') || '', page = params.get('page') || '1';
  const [reference, setReference] = useState(id), [invoiceInput, setInvoiceInput] = useState(''), [invoiceId, setInvoiceId] = useState('');
  const read = useFinanceRead<WalletOperationsDto>(id ? `/admin/finance/wallets/${encodeURIComponent(id)}?page=${encodeURIComponent(page)}&pageSize=20` : null, refreshToken);
  const invoice = useFinanceRead<FinanceInvoiceDto>(invoiceId ? `/admin/finance/invoices/${encodeURIComponent(invoiceId)}` : null, id);
  const op = useFinanceOperation(id, () => {read.reload(); invoice.reload();});
  useEffect(() => {setReference(id); setInvoiceId(''); setInvoiceInput('');}, [id]);
  const blocked = op.busy || Boolean(op.intent) || read.loading;
  const wallet = read.data?.wallet;
  const eligible = wallet && invoice.data && wallet.status === 'ACTIVE' &&
    invoice.data.payerReferenceId === wallet.ownerReferenceId &&
    invoice.data.amountDue.currencyCode === wallet.currencyCode && invoice.data.amountDue.scale === wallet.scale &&
    ['ISSUED', 'PARTIALLY_PAID', 'OVERDUE'].includes(invoice.data.status);
  const changePage = (value: number) => setParams(previous => {
    const next = new URLSearchParams(previous); next.set('page', String(value)); return next;
  });
  return <section className="space-y-4">
    <form className="flex flex-wrap gap-3" onSubmit={event => {
      event.preventDefault(); if (!blocked) setParams({tab: 'wallets', wallet: reference.trim(), page: '1'});
    }}>
      <input aria-label={t('finance_wallet_reference')} value={reference} required maxLength={160} disabled={blocked}
        onChange={event => setReference(event.target.value)} className="rounded-xl border p-3" />
      <button disabled={blocked} type="submit">{t('finance_lookup')}</button>
    </form>
    <FinanceOperationStatus operation={op} />
    {read.loading && <p role="status">{t('finance_loading')}</p>}
    {read.error && <p role="alert">{read.error}</p>}
    {read.data && wallet && <>
      <h3 className="font-bold">{wallet.publicId}</h3>
      <p>{t('finance_account_owner')}: {wallet.ownerReferenceId}</p>
      <p>{t('finance_status')}: {wallet.status}</p>
      {(['currentBalance', 'availableBalance', 'lockedBalance'] as const).map(key =>
        <p key={key}>{t(`finance_wallet_${key}` as Parameters<typeof t>[0])}: <span dir="ltr">{financeMoney(read.data!.balance[key])}</span></p>)}
      <p>{t('finance_wallet_consent_notice')}</p>
      <form className="flex flex-wrap gap-3" onSubmit={event => {
        event.preventDefault(); if (!blocked) setInvoiceId(invoiceInput.trim());
      }}>
        <input aria-label={t('finance_invoice_reference')} required maxLength={160} disabled={blocked} value={invoiceInput}
          onChange={event => {setInvoiceInput(event.target.value); setInvoiceId('');}} className="rounded-xl border p-3" />
        <button disabled={blocked} type="submit">{t('finance_lookup_invoice')}</button>
      </form>
      {invoice.error && <p role="alert">{invoice.error}</p>}
      {invoice.data && <div className="rounded-xl border p-3">
        <p>{invoice.data.invoiceNumber} · <span dir="ltr">{financeMoney(invoice.data.amountDue)}</span></p>
        <p>{t('finance_version')}: {invoice.data.version}</p>
        <button disabled={blocked || !eligible || !Number.isSafeInteger(invoice.data.version)} onClick={() => {
          if (!eligible || !invoice.data || !window.confirm(t('finance_confirm_hold'))) return;
          op.submit(`/admin/finance/wallets/${encodeURIComponent(wallet.id)}/holds`, {
            businessReferenceId: invoice.data.id, amount: invoice.data.amountDue, expectedVersion: invoice.data.version,
          });
        }}>{t('finance_create_hold')}</button>
      </div>}
      <h3 className="font-bold">{t('finance_wallet_holds')}</h3>
      {read.data.holds.data.length ? read.data.holds.data.map(hold => <article key={hold.id} className="rounded-xl border p-3">
        <p>{hold.publicId} · {hold.status} · <span dir="ltr">{financeMoney(hold.amount)}</span></p>
        <p>{t('finance_invoice_reference')}: {hold.businessReferenceId}</p>
        {hold.status === 'ACTIVE' && (['release', 'capture'] as const).map(action => <button key={action}
          disabled={blocked || !Number.isSafeInteger(hold.version)} className="m-2 rounded-lg border p-2"
          onClick={() => {
            if (window.confirm(t(action === 'release' ? 'finance_confirm_release' : 'finance_confirm_capture')))
              op.submit(`/admin/finance/wallet-holds/${encodeURIComponent(hold.id)}/${action}`, {expectedVersion: hold.version});
          }}>{t(action === 'release' ? 'finance_release_hold' : 'finance_capture_hold')}</button>)}
      </article>) : <p>{t('finance_empty')}</p>}
      <div className="flex gap-4">
        <button disabled={blocked || read.data.holds.page <= 1} onClick={() => changePage(read.data!.holds.page - 1)}>{t('finance_previous')}</button>
        <span>{read.data.holds.page} / {Math.max(1, read.data.holds.totalPages)}</span>
        <button disabled={blocked || read.data.holds.page >= read.data.holds.totalPages} onClick={() => changePage(read.data!.holds.page + 1)}>{t('finance_next')}</button>
      </div>
    </>}
  </section>;
}
