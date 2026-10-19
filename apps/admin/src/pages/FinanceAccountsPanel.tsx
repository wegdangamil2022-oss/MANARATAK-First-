import {useEffect, useRef, useState} from 'react';
import {useSearchParams} from 'react-router-dom';
import type {FinancialAccountDto, PaginatedFinanceResult} from '@absheer/domain';
import {adminApiClient} from '../api/client';
import {useTranslation} from '../i18n/I18nProvider';

/** Owner-provided account catalog. Balances and ledger commands are separate contracts. */
export function FinanceAccountsPanel({refreshToken = 0}: {refreshToken?: number}) {
  const {t} = useTranslation();
  const [params, setParams] = useSearchParams();
  const queryString = params.toString();
  const [data, setData] = useState<PaginatedFinanceResult<FinancialAccountDto> | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refresh, setRefresh] = useState(0);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    let cancelled = false;
    setData(null); setError(''); setLoading(true);
    const source = new URLSearchParams(queryString), query = new URLSearchParams({pageSize: '20'});
    for (const key of ['page', 'ownerReferenceId', 'currencyCode', 'type', 'active']) {
      const value = source.get(key);
      if (value) query.set(key, value);
    }
    void adminApiClient.request<PaginatedFinanceResult<FinancialAccountDto>>(`/admin/finance/accounts?${query}`)
      .then(result => {if (!cancelled && request === sequence.current) setData(result);})
      .catch(cause => {if (!cancelled && request === sequence.current)
        setError(cause instanceof Error ? cause.message : t('finance_load_failed'));})
      .finally(() => {if (!cancelled && request === sequence.current) setLoading(false);});
    return () => {cancelled = true;};
  }, [queryString, refresh, refreshToken, t]);
  const filter = (key: string, value: string) => setParams(previous => {
    const next = new URLSearchParams(previous);
    value ? next.set(key, value) : next.delete(key);
    next.set('page', '1');
    return next;
  });
  const page = (value: number) => setParams(previous => {
    const next = new URLSearchParams(previous); next.set('page', String(value)); return next;
  });
  return <section className="space-y-4">
    <p>{t('finance_accounts_notice')}</p>
    <div className="grid gap-3 sm:grid-cols-2">
      <input aria-label={t('finance_account_owner')} placeholder={t('finance_account_owner')}
        maxLength={160} value={params.get('ownerReferenceId') || ''}
        onChange={event => filter('ownerReferenceId', event.target.value)} className="rounded-xl border p-3" />
      <input aria-label={t('finance_filter_currencyCode')} placeholder={t('finance_filter_currencyCode')}
        maxLength={3} value={params.get('currencyCode') || ''}
        onChange={event => filter('currencyCode', event.target.value.toUpperCase())} className="rounded-xl border p-3" />
      <select aria-label={t('finance_account_type')} value={params.get('type') || ''}
        onChange={event => filter('type', event.target.value)} className="rounded-xl border p-3">
        <option value="">{t('finance_account_all_types')}</option>
        {['ASSET', 'LIABILITY', 'REVENUE', 'EXPENSE', 'EQUITY'].map(type =>
          <option key={type} value={type}>{t(`finance_account_type_${type}` as Parameters<typeof t>[0])}</option>)}
      </select>
      <select aria-label={t('finance_status')} value={params.get('active') || ''}
        onChange={event => filter('active', event.target.value)} className="rounded-xl border p-3">
        <option value="">{t('finance_all_statuses')}</option>
        <option value="true">{t('finance_account_active')}</option>
        <option value="false">{t('finance_account_inactive')}</option>
      </select>
    </div>
    <div className="flex gap-4">
      <button disabled={loading} onClick={() => setRefresh(value => value + 1)}>{t('finance_refresh')}</button>
      <button onClick={() => setParams({tab: 'accounts'})}>{t('finance_clear_filters')}</button>
    </div>
    {error && <p role="alert">{error}</p>}
    {loading ? <p role="status">{t('finance_loading')}</p> : data && <>
      <p>{t('finance_total')}: {data.total}</p>
      {data.data.length ? <div className="overflow-auto"><table className="w-full text-start text-sm">
        <thead><tr>{['reference', 'account_owner', 'account_type', 'filter_currencyCode', 'account_scale', 'status', 'account_management'].map(key =>
          <th key={key} className="p-3 text-start">{t(`finance_${key}` as Parameters<typeof t>[0])}</th>)}</tr></thead>
        <tbody>{data.data.map(account => <tr key={account.id} className="border-t">
          <td className="p-3 break-all">{account.publicId}</td>
          <td className="p-3 break-all">{account.ownerReferenceId}</td>
          <td className="p-3">{t(`finance_account_type_${account.type}` as Parameters<typeof t>[0])}</td>
          <td className="p-3">{account.currencyCode}</td><td className="p-3">{account.scale}</td>
          <td className="p-3">{t(account.active ? 'finance_account_active' : 'finance_account_inactive')}</td>
          <td className="p-3">{t(account.systemManaged ? 'finance_account_system' : 'finance_account_manual')}</td>
        </tr>)}</tbody>
      </table></div> : <p>{t('finance_empty')}</p>}
      <div className="flex gap-4">
        <button disabled={data.page <= 1} onClick={() => page(data.page - 1)}>{t('finance_previous')}</button>
        <span>{data.page} / {Math.max(1, data.totalPages)}</span>
        <button disabled={data.page >= data.totalPages} onClick={() => page(data.page + 1)}>{t('finance_next')}</button>
      </div>
    </>}
  </section>;
}
