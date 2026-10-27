import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { FinancialTransactionSummaryDto, PaginatedFinanceResult } from '@manaratak/domain';
import { RefreshCw, Search } from 'lucide-react';
import { financeMoney } from '../../pages/financePresentation';
import { useFinanceRead } from '../../pages/useFinanceRead';
import { OwnerPanel, useOwnerCopy } from './WorkspaceUI';

export function FinanceTransactionsPanel({
  refreshToken = 0,
  expenses = false,
}: {
  refreshToken?: number;
  expenses?: boolean;
}) {
  const { c, language } = useOwnerCopy();
  const [params, setParams] = useSearchParams();
  const filter = params.toString();
  const [search, setSearch] = useState(params.get('search') || '');
  const from = params.get('from') || '',
    to = params.get('to') || '';
  const invalidRange = Boolean(from && to && from > to);
  const currency = params.get('currencyCode') || '';
  const invalidCurrency = Boolean(currency && !/^[A-Z]{3}$/.test(currency));
  const query = new URLSearchParams({ page: params.get('page') || '1', pageSize: '20' });
  for (const key of ['search', 'currencyCode', 'accountId', 'businessReferenceType']) {
    const value = params.get(key);
    if (value) query.set(key, value);
  }
  if (expenses) query.set('accountType', 'EXPENSE');
  if (from) query.set('from', from + 'T00:00:00.000Z');
  if (to) query.set('to', to + 'T23:59:59.999Z');
  const read = useFinanceRead<PaginatedFinanceResult<FinancialTransactionSummaryDto>>(
    invalidRange || invalidCurrency
      ? null
      : '/admin/finance/ledger/transactions?' + query.toString(),
    refreshToken,
  );
  useEffect(() => {
    setSearch(new URLSearchParams(filter).get('search') || '');
  }, [filter]);
  const update = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      value ? next.set(key, value) : next.delete(key);
      if (key !== 'page') next.set('page', '1');
      return next;
    });
  return (
    <OwnerPanel
      title={
        expenses
          ? c('القيود المرتبطة بحسابات المصروفات', 'Entries involving expense accounts')
          : c('سجل الحركات المرحّلة', 'Posted transaction register')
      }
    >
      <p className="sf-notice">
        {c(
          'المصدر: دفتر الأستاذ. كل صف قيد متوازن، ولا يعني تلقائيًا قبضًا نقديًا أو مصروفًا. التاريخ بتوقيت UTC، وتُعرض كل عملة مستقلة.',
          'Source: general ledger. Each row is a balanced transaction, not necessarily a cash receipt or expense. Dates use UTC; currencies remain separate.',
        )}
      </p>
      <form
        className="sf-toolbar"
        onSubmit={(event) => {
          event.preventDefault();
          update('search', search.trim());
        }}
      >
        <label>
          {c('المرجع أو مصدر الحركة', 'Reference or origin')}
          <input
            type="search"
            maxLength={120}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label>
          {c('العملة', 'Currency')}
          <input
            maxLength={3}
            pattern="[A-Z]{3}"
            placeholder="USD"
            value={params.get('currencyCode') || ''}
            onChange={(event) =>
              update('currencyCode', event.target.value.toUpperCase().replace(/[^A-Z]/g, ''))
            }
          />
        </label>
        <label>
          {c('من تاريخ — UTC', 'From — UTC')}
          <input
            type="date"
            value={from}
            onChange={(event) => update('from', event.target.value)}
          />
        </label>
        <label>
          {c('إلى تاريخ — UTC', 'To — UTC')}
          <input type="date" value={to} onChange={(event) => update('to', event.target.value)} />
        </label>
        <button className="sf-primary">
          <Search size={14} />
          {c('بحث', 'Search')}
        </button>
        <button
          type="button"
          className="sf-secondary"
          disabled={read.loading}
          onClick={read.reload}
        >
          <RefreshCw size={14} />
          {c('تحديث', 'Refresh')}
        </button>
        <button
          type="button"
          className="sf-secondary"
          onClick={() => setParams({ tab: expenses ? 'expenses' : 'transactions' })}
        >
          {c('مسح الفلاتر', 'Clear filters')}
        </button>
      </form>
      {invalidCurrency && (
        <p role="status">
          {c('أكمل رمز العملة من ثلاثة أحرف.', 'Enter the complete three-letter currency code.')}
        </p>
      )}
      {invalidRange && (
        <p role="alert" className="text-red-700">
          {c(
            'تاريخ البداية يجب ألا يتجاوز تاريخ النهاية.',
            'The start date must not be after the end date.',
          )}
        </p>
      )}
      {read.loading && <p role="status">{c('جارٍ تحميل الحركات…', 'Loading transactions…')}</p>}
      {read.error && (
        <p role="alert" className="sf-notice text-red-700">
          {c('تعذر تحميل الحركات.', 'Could not load transactions.')}{' '}
          <button type="button" className="sf-secondary" onClick={read.reload}>
            {c('إعادة المحاولة', 'Retry')}
          </button>
        </p>
      )}
      {!invalidRange && !invalidCurrency && read.data && !read.loading && (
        <>
          {read.data.data.length ? (
            <div className="sf-table-wrap">
              <table>
                <thead>
                  <tr>
                    {[
                      c('المرجع', 'Reference'),
                      c('تاريخ القيد — UTC', 'Posted — UTC'),
                      c('المصدر', 'Origin'),
                      c('مدين', 'Debit'),
                      c('دائن', 'Credit'),
                      c('الحالة', 'State'),
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {read.data.data.map((row) => (
                    <tr key={row.id}>
                      <td>
                        <Link
                          className="sf-link"
                          to={'/finance?tab=ledger&transaction=' + encodeURIComponent(row.id)}
                        >
                          {row.publicId}
                        </Link>
                      </td>
                      <td>
                        {new Date(row.createdAt).toLocaleString(language, { timeZone: 'UTC' })}
                      </td>
                      <td>
                        <p>{row.businessReferenceType}</p>
                        <small className="sf-reference">{row.businessReferenceId}</small>
                      </td>
                      <td dir="ltr">{financeMoney(row.debit)}</td>
                      <td dir="ltr">{financeMoney(row.credit)}</td>
                      <td>
                        {row.reversalOfId
                          ? c('قيد عكسي', 'Reversal')
                          : row.reversalId
                            ? c('معكوس بقيد مستقل', 'Reversed separately')
                            : c('مرحّل', 'Posted')}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="sf-empty">{c('لا توجد حركات مطابقة.', 'No matching transactions.')}</p>
          )}
          <div className="sf-pager">
            <button
              disabled={read.data.page <= 1}
              onClick={() => update('page', String(read.data!.page - 1))}
            >
              {c('السابق', 'Previous')}
            </button>
            <span>
              {c('الإجمالي', 'Total')}: {read.data.total} · {read.data.page}/
              {Math.max(1, read.data.totalPages)}
            </span>
            <button
              disabled={read.data.page >= read.data.totalPages}
              onClick={() => update('page', String(read.data!.page + 1))}
            >
              {c('التالي', 'Next')}
            </button>
          </div>
        </>
      )}
    </OwnerPanel>
  );
}
