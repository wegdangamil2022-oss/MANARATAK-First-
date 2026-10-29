import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import {
  LayoutDashboard,
  ArrowLeftRight,
  ReceiptText,
  ShoppingBag,
  Landmark,
  BookOpen,
  ShieldCheck,
  RefreshCw,
  ListChecks,
} from 'lucide-react';
import {
  OwnerHeading,
  OwnerNavigation,
  useOwnerCopy,
} from '../features/services-finance/WorkspaceUI';
import {
  financeGroups,
  resolveFinanceView,
  type FinanceTab,
} from '../features/services-finance/workspaceModel';
import { FinanceTransactionsPanel } from '../features/services-finance/FinanceTransactionsPanel';
import { FinanceCapabilityPanel } from '../features/services-finance/FinanceCapabilityPanel';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../security/useOwnerOperationScope';
import { financeMoney } from './financePresentation';
import { FinanceLedgerPanel } from './FinanceLedgerPanel';
import { FinanceWalletPanel } from './FinanceWalletPanel';
import { FinanceAccountsPanel } from './FinanceAccountsPanel';

type Row = Record<string, any>;
type Page = { data: Row[]; page: number; total: number; totalPages: number };
type Tab = FinanceTab;
const listTabs = new Set<Tab>([
  'invoices',
  'payments',
  'refunds',
  'transfers',
  'rates',
  'approvals',
  'commissions',
]);
const endpoints: Partial<Record<Tab, string>> = {
  overview: 'overview',
  accounts: 'accounts',
  wallets: 'wallets',
  ledger: 'ledger/transactions',
  invoices: 'invoices',
  payments: 'payments',
  refunds: 'refunds',
  transfers: 'transfers',
  rates: 'exchange-rates',
  approvals: 'approvals',
  commissions: 'commissions',
  reconciliation: 'reconciliation',
  reports: 'reports',
  runtime: 'runtime-readiness',
};
const states: Partial<Record<Tab, string[]>> = {
  invoices: ['DRAFT', 'ISSUED', 'PARTIALLY_PAID', 'PAID', 'OVERDUE', 'CREDITED', 'VOIDED'],
  payments: ['PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'PARTIALLY_REFUNDED', 'REFUNDED'],
  refunds: ['PENDING_APPROVAL', 'PROCESSING', 'UNKNOWN_OUTCOME', 'COMPLETED', 'FAILED'],
  transfers: [
    'REQUESTED',
    'PENDING_APPROVAL',
    'APPROVED',
    'PROCESSING',
    'SETTLED',
    'COMPLETED',
    'FAILED',
    'REVERSED',
  ],
  approvals: ['PENDING', 'APPROVED', 'REJECTED', 'EXPIRED'],
  rates: ['APPROVED', 'PENDING'],
  commissions: ['ACCRUED', 'PAYABLE', 'SETTLED', 'REVERSED', 'DISPUTED'],
};
export function FinanceAdminPage() {
  const { t, dir, language } = useTranslation();
  const [params, setParams] = useSearchParams();
  const { c } = useOwnerCopy();
  const { hasPermission } = useAdminAuthorization();
  const { group, tab } = resolveFinanceView(params, true);
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const navigateTab = (next: Tab) => {
    if (busy) return;
    setSearch('');
    setParams(next === 'overview' ? {} : { tab: next });
  };
  const [data, setData] = useState<any>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');
  const [refresh, setRefresh] = useState(0),
    [busy, setBusy] = useState(false);
  const sequence = useRef(0),
    mutation = useRef(false);
  const [search, setSearch] = useState(params.get('search') || '');
  const currentQuery = params.toString();
  const owner = useOwnerOperationScope(`${tab}:${currentQuery}`);
  useEffect(() => {
    mutation.current = false;
    setBusy(false);
  }, [owner]);
  const commandKey = useRef<{ path: string; key: string } | null>(null);
  const update = useCallback(
    (key: string, value: string) =>
      setParams((previous) => {
        const next = new URLSearchParams(previous);
        value ? next.set(key, value) : next.delete(key);
        next.set('page', '1');
        return next;
      }),
    [setParams],
  );
  const searchFilter = params.get('search') || '';
  useEffect(() => {
    setSearch(searchFilter);
  }, [searchFilter]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      if (search !== searchFilter) update('search', search.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [search, searchFilter, update]);
  useEffect(() => {
    const request = ++sequence.current;
    let cancelled = false;
    setLoading(true);
    setError('');
    setData(null);
    setObservedAt(null);
    if (['accounts', 'wallets', 'ledger', 'transactions', 'expenses', 'cash'].includes(tab)) {
      setLoading(false);
      return;
    }
    const query = new URLSearchParams(currentQuery);
    query.delete('tab');
    query.set('pageSize', '20');
    void adminApiClient
      .request(`/admin/finance/${endpoints[tab]}${listTabs.has(tab) ? `?${query}` : ''}`)
      .then((result) => {
        if (request === sequence.current && !cancelled) {
          setData(result);
          setObservedAt(new Date().toISOString());
        }
      })
      .catch((cause) => {
        if (request === sequence.current && !cancelled)
          setError(cause instanceof Error ? cause.message : 'FINANCE_READ_FAILED');
      })
      .finally(() => {
        if (request === sequence.current && !cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tab, currentQuery, refresh]);
  const run = async (providers: boolean) => {
    if (
      !owner.isCurrent() ||
      mutation.current ||
      !window.confirm(t(providers ? 'finance_confirm_provider_scan' : 'finance_confirm_local_scan'))
    )
      return;
    mutation.current = true;
    setBusy(true);
    setError('');
    const path = `/admin/finance/reconciliation/${providers ? 'providers/run' : 'run'}`;
    if (commandKey.current?.path !== path)
      commandKey.current = { path, key: createAdminIdempotencyKey() };
    try {
      await adminApiClient.request(path, {
        method: 'POST',
        idempotencyKey: commandKey.current.key,
        body: JSON.stringify(providers ? { limit: 20 } : {}),
      });
      if (!owner.isCurrent()) return;
      commandKey.current = null;
      setRefresh((n) => n + 1);
    } catch (cause) {
      if (owner.isCurrent())
        setError(cause instanceof Error ? cause.message : t('finance_load_failed'));
    } finally {
      if (owner.isCurrent()) {
        mutation.current = false;
        setBusy(false);
      }
    }
  };
  const page: Page | null = listTabs.has(tab) ? data : null;
  return (
    <div dir={dir} className="sf-workspace mx-auto max-w-7xl">
      <OwnerHeading
        title={t('finance_title')}
        description={c(
          'متابعة الفواتير والتحصيل والحركات والالتزامات والرقابة المالية.',
          'Track invoices, collection, transactions, liabilities and financial controls.',
        )}
        actions={
          <>
            <button type="button" disabled={busy} onClick={() => navigateTab('transactions')}>
              <ListChecks size={15} />
              {c('سجل الحركات', 'Transaction register')}
            </button>
            <button
              type="button"
              disabled={loading || busy}
              onClick={() => setRefresh((value) => value + 1)}
            >
              <RefreshCw size={15} />
              {t('finance_refresh')}
            </button>
          </>
        }
      />
      <div className="sf-finance-nav">
        <OwnerNavigation
          items={financeGroups.map((item, index) => ({
            id: item.id,
            label: c(item.ar, item.en),
            icon: [
              LayoutDashboard,
              ArrowLeftRight,
              ReceiptText,
              ShoppingBag,
              Landmark,
              BookOpen,
              ShieldCheck,
            ][index],
          }))}
          active={group.id}
          onChange={(id) => {
            const next = financeGroups.find((item) => item.id === id);
            if (next) navigateTab(next.tabs[0]);
          }}
          disabled={busy}
          label={t('finance_sections')}
        />
      </div>
      <section className="sf-panel">
        {group.tabs.length > 1 && (
          <OwnerNavigation
            secondary
            active={tab}
            disabled={busy}
            label={c('مساحات المالية', 'Finance workspaces')}
            items={group.tabs.map((item) => ({
              id: item,
              label:
                item === 'cash'
                  ? c('الصناديق والبنوك', 'Cash & bank accounts')
                  : t(`finance_tab_${item}` as Parameters<typeof t>[0]),
              icon: ListChecks,
            }))}
            onChange={(value) => navigateTab(value as Tab)}
          />
        )}
        <div className="min-w-0 space-y-4">
          <div className="sf-panel-heading">
            <h2>
              {tab === 'transactions'
                ? c('الحركات اليومية', 'Daily transactions')
                : tab === 'expenses'
                  ? c('المشتريات والمصروفات', 'Purchases & expenses')
                  : tab === 'cash'
                    ? c('الصناديق والبنوك', 'Cash & bank accounts')
                    : t(`finance_tab_${tab}` as Parameters<typeof t>[0])}
            </h2>
            {observedAt && (
              <small>
                {c('آخر قراءة', 'Last read')}: {new Date(observedAt).toLocaleString(language)}
              </small>
            )}
          </div>
          {tab === 'transactions' && (
            <>
              <FinanceTransactionsPanel refreshToken={refresh} />
              <FinanceCapabilityPanel />
            </>
          )}
          {tab === 'expenses' && (
            <>
              <FinanceCapabilityPanel />
              <FinanceTransactionsPanel refreshToken={refresh} expenses />
            </>
          )}
          {tab === 'cash' && <FinanceCapabilityPanel cash />}
          {listTabs.has(tab) && (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <input
                aria-label={t('finance_search')}
                placeholder={t('finance_search')}
                maxLength={120}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="rounded-xl border p-3"
              />
              <select
                aria-label={t('finance_status')}
                value={params.get('status') || ''}
                onChange={(e) => update('status', e.target.value)}
                className="rounded-xl border p-3"
              >
                <option value="">{t('finance_all_statuses')}</option>
                {(states[tab] || []).map((value) => (
                  <option key={value} value={value}>
                    {t(`finance_state_${value}` as Parameters<typeof t>[0])}
                  </option>
                ))}
              </select>
              {(tab === 'invoices'
                ? ['studentReferenceId', 'payerReferenceId', 'originDomain', 'originReferenceId']
                : tab === 'payments'
                  ? ['invoiceId', 'gatewayProvider']
                  : tab === 'rates'
                    ? []
                    : tab === 'approvals' || tab === 'commissions'
                      ? ['ownerReferenceId']
                      : ['provider', 'ownerReferenceId']
              ).map((key) => (
                <input
                  key={key}
                  aria-label={t(`finance_filter_${key}` as Parameters<typeof t>[0])}
                  placeholder={t(`finance_filter_${key}` as Parameters<typeof t>[0])}
                  maxLength={160}
                  value={params.get(key) || ''}
                  onChange={(e) => update(key, e.target.value)}
                  className="rounded-xl border p-3"
                />
              ))}
              {!['invoices', 'payments'].includes(tab) && (
                <>
                  {[
                    'from',
                    'to',
                    ...(tab === 'rates'
                      ? []
                      : ['currencyCode', 'minAmountMinorUnits', 'maxAmountMinorUnits']),
                  ].map((key) => (
                    <input
                      key={key}
                      aria-label={t(`finance_filter_${key}` as Parameters<typeof t>[0])}
                      placeholder={t(`finance_filter_${key}` as Parameters<typeof t>[0])}
                      maxLength={30}
                      value={params.get(key) || ''}
                      onChange={(event) => update(key, event.target.value)}
                      className="rounded-xl border p-3"
                    />
                  ))}
                </>
              )}
              <button
                className="rounded-xl border p-3"
                onClick={() => {
                  setSearch('');
                  setParams({ tab });
                }}
              >
                {t('finance_clear_filters')}
              </button>
            </div>
          )}
          {tab === 'ledger' && <FinanceLedgerPanel refreshToken={refresh} />}
          {tab === 'wallets' && <FinanceWalletPanel refreshToken={refresh} />}
          {tab === 'accounts' && <FinanceAccountsPanel refreshToken={refresh} />}
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
              {error}
            </p>
          )}
          {loading ? (
            <p role="status">{t('finance_loading')}</p>
          ) : page ? (
            <>
              <p>
                {t('finance_total')}: {new Intl.NumberFormat(language).format(page.total)}
              </p>
              {page.data.length ? (
                <div className="overflow-auto">
                  <table className="w-full text-start text-sm">
                    <thead>
                      <tr>
                        {['reference', 'status', 'amount', 'origin', 'details'].map((key) => (
                          <th key={key} className="p-3 text-start">
                            {t(`finance_${key}` as Parameters<typeof t>[0])}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {page.data.map((row) => (
                        <tr key={row.id} className="border-t">
                          <td className="p-3 break-all">
                            {row.invoiceNumber || row.publicId}
                            {row.failureReason && (
                              <p className="text-red-700">{row.failureReason}</p>
                            )}
                          </td>
                          <td
                            className={`p-3 ${/PAID|CAPTURED|COMPLETED|APPROVED|CREDITED/.test(row.status || '') ? 'bg-emerald-50' : /FAILED|VOIDED|REJECTED/.test(row.status || '') ? 'bg-red-50' : ''}`}
                          >
                            {t(
                              `finance_state_${row.status || (row.approved ? 'APPROVED' : 'PENDING')}` as Parameters<
                                typeof t
                              >[0],
                            )}
                          </td>
                          <td className="p-3 font-mono" dir="ltr">
                            {row.amount || row.totalAmount || row.sourceAmount
                              ? financeMoney(row.amount || row.totalAmount || row.sourceAmount)
                              : row.rateNumerator
                                ? `${row.rateNumerator}/${row.rateDenominator}`
                                : '—'}
                          </td>
                          <td className="p-3 break-all">
                            {row.originDomain ||
                              row.paymentId ||
                              row.sourcePaymentId ||
                              row.targetReferenceId ||
                              row.destinationReferenceId ||
                              `${row.sourceCurrencyCode || ''} → ${row.targetCurrencyCode || ''}`}
                          </td>
                          <td className="p-3">
                            {tab === 'invoices' ? (
                              <Link
                                className="text-[#142B5F] underline"
                                to={`/finance/invoices/${encodeURIComponent(row.id)}`}
                              >
                                {t('finance_details')}
                              </Link>
                            ) : tab !== 'rates' ? (
                              <Link
                                className="text-[#142B5F] underline"
                                to={`/finance/records/${tab}/${encodeURIComponent(row.id)}`}
                              >
                                {t('finance_details')}
                              </Link>
                            ) : (
                              <span>{t('finance_read_only')}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p>{t('finance_empty')}</p>
              )}
              <div className="flex items-center gap-4">
                <button
                  disabled={page.page <= 1}
                  onClick={() =>
                    setParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('page', String(page.page - 1));
                      return next;
                    })
                  }
                >
                  {t('finance_previous')}
                </button>
                <span>
                  {page.page} / {Math.max(1, page.totalPages)}
                </span>
                <button
                  disabled={page.page >= page.totalPages}
                  onClick={() =>
                    setParams((prev) => {
                      const next = new URLSearchParams(prev);
                      next.set('page', String(page.page + 1));
                      return next;
                    })
                  }
                >
                  {t('finance_next')}
                </button>
              </div>
            </>
          ) : data && tab === 'overview' ? (
            <>
              <div className="sf-metrics">
                {['pendingPayments', 'pendingTransfers', 'pendingApprovals'].map((key) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() =>
                      setParams({
                        tab:
                          key === 'pendingPayments'
                            ? 'payments'
                            : key === 'pendingTransfers'
                              ? 'transfers'
                              : 'approvals',
                        ...(key === 'pendingTransfers' ? {} : { status: 'PENDING' }),
                        page: '1',
                      })
                    }
                  >
                    <p>{t(`finance_${key}` as Parameters<typeof t>[0])}</p>
                    <strong
                      className={typeof data[key] === 'number' ? undefined : 'sf-metric-message'}
                    >
                      {typeof data[key] === 'number' ? data[key] : c('غير متاح', 'Unavailable')}
                    </strong>
                    <small>{c('فتح السجلات', 'Open records')}</small>
                  </button>
                ))}
              </div>
              <p>
                {t('finance_scan_state')}: {data.reconciliationHealth}
              </p>
              <p className="sf-notice">
                {c(
                  'هذه مؤشرات متابعة للحالات المتاحة، وليست قائمة أرباح أو رصيدًا بنكيًا.',
                  'These are available operational counters, not a profit statement or bank balance.',
                )}
              </p>
              <Issues rows={data.attention} />
            </>
          ) : data && tab === 'reports' ? (
            <>
              <p className="sf-notice">
                {t('finance_report_units')} ·{' '}
                {c(
                  'النطاق: السجلات المتاحة؛ لا تجمع عملات مختلفة.',
                  'Scope: available records; currencies are not combined.',
                )}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  'grossCollectionsByCurrency',
                  'netCollectionsByCurrency',
                  'revenueByCurrency',
                  'outstandingByCurrency',
                  'refundsByCurrency',
                  'transferVolumeByCurrency',
                  'walletLiabilityByCurrency',
                  'commissionsByCurrency',
                ].map((key) => (
                  <article key={key} className="rounded-xl border p-4">
                    <h3 className="font-bold">
                      {t(`finance_metric_${key}` as Parameters<typeof t>[0])}
                    </h3>
                    {Object.entries(data[key] || {}).map(([currency, units]) => (
                      <p key={currency} dir="ltr">
                        {currency}: {String(units)}
                      </p>
                    ))}
                  </article>
                ))}
              </div>
              <p>
                {t('finance_scan_state')}: {data.reconciliationStatus}
              </p>
            </>
          ) : data && tab === 'runtime' ? (
            <>
              <p className="sf-notice">
                {c(
                  'حالة إعداد مزودي الدفع والتسوية حسب آخر قراءة؛ لا يتم تفعيل أي مزود من هنا.',
                  'Provider configuration and reconciliation state from the last read. No provider is activated here.',
                )}
              </p>
              <p>{data.overall}</p>
              {[
                ...(data.paymentProviders || []),
                ...(data.bankProviders || []),
                ...(data.automaticFxProvider ? [data.automaticFxProvider] : []),
              ].map((provider, index) => (
                <p key={`${provider.providerKey}:${index}`}>
                  {provider.providerKey}: {provider.status}
                </p>
              ))}
              <p>
                {t('finance_webhooks')}: {data.inboundWebhookVerification}
              </p>
            </>
          ) : data && tab === 'reconciliation' ? (
            <>
              <p>
                {t('finance_scan_state')}: {data.status}
              </p>
              <p>
                {t('finance_scan_coverage')}: {data.coverage}
              </p>
              <p>
                {t('finance_as_of')}:{' '}
                {data.asOf
                  ? new Intl.DateTimeFormat(language, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    }).format(new Date(data.asOf))
                  : '—'}
              </p>
              <p>{t('finance_scan_notice')}</p>
              <div className="flex flex-wrap gap-3">
                <button
                  disabled={busy || !hasPermission('admin:finance:reconciliation:run')}
                  onClick={() => void run(false)}
                  className="rounded-xl border p-3"
                >
                  {t('finance_run_local_scan')}
                </button>
                <button
                  disabled={busy || !hasPermission('admin:finance:reconciliation:providers')}
                  onClick={() => void run(true)}
                  className="rounded-xl border p-3"
                >
                  {t('finance_run_provider_scan')}
                </button>
              </div>
              <Issues rows={data.issues} />
            </>
          ) : null}
        </div>
      </section>
    </div>
  );
}
function Issues({ rows }: { rows: Row[] }) {
  const { t } = useTranslation();
  return rows?.length ? (
    <div className="space-y-2">
      {rows.map((row) => (
        <p key={`${row.code}:${row.referenceId}`} className="rounded-xl bg-amber-50 p-3">
          <span>
            {row.code}: {row.referenceId}
          </span>
        </p>
      ))}
    </div>
  ) : (
    <p>{t('finance_no_scanned_issues')}</p>
  );
}
