import {useState} from 'react';
import {useTranslation} from '../i18n/I18nProvider';
import {financeParseAmount, type FinanceMoney} from './financePresentation';

export function FinanceCreditNoteForm({amount, disabled, submit}: {
  amount: FinanceMoney; disabled: boolean; submit: (fields: Record<string, unknown>) => void;
}) {
  const {t} = useTranslation();
  const [value, setValue] = useState(''), [reason, setReason] = useState(''), [error, setError] = useState('');
  return <form className="space-y-3 rounded-xl border p-4" onSubmit={event => {
    event.preventDefault(); if (disabled) return;
    try {
      if (reason.trim().length < 3) throw new Error(t('finance_credit_reason'));
      const credit = {...amount, amountMinorUnits: financeParseAmount(value, amount.scale)};
      setError('');
      if (window.confirm(t('finance_confirm_credit'))) submit({amount: credit, reason: reason.trim()});
    } catch (cause) {setError(cause instanceof Error ? cause.message : t('finance_invalid_lines'));}
  }}>
    <h2 className="font-bold">{t('finance_credit_note')}</h2>
    <p>{t('finance_credit_notice')}</p>
    {error && <p role="alert">{error}</p>}
    <fieldset disabled={disabled} className="flex flex-wrap gap-3">
      <input aria-label={t('finance_credit_amount')} inputMode="decimal" required maxLength={38} value={value}
        onChange={event => setValue(event.target.value)} className="rounded-lg border p-2" />
      <textarea aria-label={t('finance_credit_reason')} required minLength={3} maxLength={500} value={reason}
        onChange={event => setReason(event.target.value)} className="rounded-lg border p-2" />
      <button type="submit" className="rounded-xl border p-3">{t('finance_create_credit')}</button>
    </fieldset>
  </form>;
}
