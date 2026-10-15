import {useState} from 'react';
import {useTranslation} from '../i18n/I18nProvider';
import {financeParseAmount, type FinanceMoney} from './financePresentation';

export function FinanceInstallmentsForm({amount, disabled, submit}: {
  amount: FinanceMoney; disabled: boolean; submit: (fields: Record<string, unknown>) => void;
}) {
  const {t} = useTranslation();
  const [rows, setRows] = useState([{amount: '', dueDate: ''}]);
  const [error, setError] = useState('');
  return <form className="space-y-3 rounded-xl border p-4" onSubmit={event => {
    event.preventDefault(); if (disabled) return;
    try {
      const installments = rows.map(row => {
        const date = new Date(row.dueDate);
        if (!Number.isFinite(date.getTime())) throw new Error(t('finance_invalid_installments'));
        return {amount: {...amount, amountMinorUnits: financeParseAmount(row.amount, amount.scale)}, dueDate: date.toISOString()};
      });
      setError('');
      if (window.confirm(t('finance_confirm_installments'))) submit({installments});
    } catch (cause) {setError(cause instanceof Error ? cause.message : t('finance_invalid_installments'));}
  }}>
    <h2 className="font-bold">{t('finance_installments')}</h2>
    <p>{t('finance_installment_owner_validation')}</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={disabled} className="space-y-3">
      {rows.map((row, index) => <div key={index} className="flex flex-wrap gap-3">
        <input aria-label={t('finance_installment_amount')} value={row.amount} inputMode="decimal" required maxLength={38}
          onChange={event => setRows(current => current.map((item, i) => i === index ? {...item, amount: event.target.value} : item))}
          className="rounded-lg border p-2" />
        <input type="datetime-local" aria-label={t('finance_installment_due')} required value={row.dueDate}
          onChange={event => setRows(current => current.map((item, i) => i === index ? {...item, dueDate: event.target.value} : item))}
          className="rounded-lg border p-2" />
        <button type="button" disabled={rows.length <= 1}
          onClick={() => setRows(current => current.filter((_, i) => i !== index))}>{t('finance_remove_item')}</button>
      </div>)}
      <button type="button" disabled={rows.length >= 100}
        onClick={() => setRows(current => [...current, {amount: '', dueDate: ''}])}>{t('finance_add_installment')}</button>
      <button type="submit" className="rounded-xl border p-3">{t('finance_create_installments')}</button>
    </fieldset>
  </form>;
}
