import {useTranslation} from '../i18n/I18nProvider';
import type {useFinanceOperation} from './useFinanceOperation';

export function FinanceOperationStatus({operation}: {operation: ReturnType<typeof useFinanceOperation>}) {
  const {t} = useTranslation();
  return <div className="space-y-3">
    {operation.error && <p role="alert">{operation.error}</p>}
    {operation.saved && <p role="status">{t('finance_command_saved')}</p>}
    {operation.reference && <p>{t('finance_reference')}: {operation.reference}</p>}
    {operation.intent && <div className="rounded-xl bg-amber-50 p-3">
      <p>{t('finance_command_uncertain')}</p>
      <button disabled={operation.busy} onClick={operation.retry}>{t('finance_retry_same_command')}</button>
      <button disabled={operation.busy} onClick={() => {
        if (window.confirm(t('finance_confirm_discard_intent'))) operation.discard();
      }}>{t('finance_discard_intent')}</button>
      <p>{t('finance_conflict_help')}</p>
    </div>}
  </div>;
}
