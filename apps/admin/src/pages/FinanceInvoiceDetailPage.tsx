import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { financeMoney, financeParseAmount, type FinanceMoney } from './financePresentation';
type Line = {
  description: string;
  quantity: number;
  unitPrice: FinanceMoney;
  totalPrice: FinanceMoney;
  metadata?: Record<string, unknown> | null;
};
type Invoice = {
  id: string;
  publicId: string;
  invoiceNumber: string;
  status: string;
  version: number;
  originDomain: string;
  originReferenceId: string;
  studentReferenceId?: string | null;
  payerReferenceId?: string | null;
  totalAmount: FinanceMoney;
  amountDue: FinanceMoney;
  lineItems: Line[];
  dueDate?: string | null;
  updatedAt: string;
};
type Draft = {
  description: string;
  quantity: string;
  price: string;
  currencyCode: string;
  scale: number;
  metadata?: Record<string, unknown> | null;
};
type Intent = { action: 'items' | 'issue' | 'void'; body: string; key: string; invoiceId: string };
const invoiceLines = (invoice: Invoice): Draft[] =>
  invoice.lineItems.map((line) => ({
    description: line.description,
    quantity: String(line.quantity),
    price: financeMoney(line.unitPrice).split(' ')[0],
    currencyCode: line.unitPrice.currencyCode,
    scale: line.unitPrice.scale,
    metadata: line.metadata,
  }));
export function FinanceInvoiceDetailPage() {
  const { id = '' } = useParams(),
    { t, dir, language } = useTranslation();
  const [invoice, setInvoice] = useState<Invoice | null>(null),
    [payments, setPayments] = useState<any[]>([]),
    [lines, setLines] = useState<Draft[]>([]);
  const [loading, setLoading] = useState(true),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [editing, setEditing] = useState(false),
    [intent, setIntent] = useState<Intent | null>(null);
  const sequence = useRef(0),
    mutationBusy = useRef(false),
    alive = useRef(true);
  const dirty = Boolean(
    editing && invoice && JSON.stringify(lines) !== JSON.stringify(invoiceLines(invoice)),
  );
  const load = useCallback(async () => {
    const request = ++sequence.current;
    setLoading(true);
    setError('');
    try {
      const [record, paymentRows] = await Promise.all([
        adminApiClient.request<Invoice>(`/admin/finance/invoices/${encodeURIComponent(id)}`),
        adminApiClient.request<any[]>(`/admin/finance/invoices/${encodeURIComponent(id)}/payments`),
      ]);
      if (request !== sequence.current || !alive.current) return;
      setInvoice(record);
      setPayments(paymentRows);
      setLines(invoiceLines(record));
      setEditing(false);
    } catch (cause) {
      if (request === sequence.current && alive.current)
        setError(cause instanceof Error ? cause.message : 'FINANCE_READ_FAILED');
    } finally {
      if (request === sequence.current && alive.current) setLoading(false);
    }
  }, [id]);
  useEffect(() => {
    alive.current = true;
    setInvoice(null);
    setIntent(null);
    void load();
    return () => {
      alive.current = false;
    };
  }, [load]);
  useEffect(() => {
    const unload = (event: BeforeUnloadEvent) => {
      if (dirty || busy || intent) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', unload);
    return () => window.removeEventListener('beforeunload', unload);
  }, [dirty, busy, intent]);
  const send = async (command: Intent) => {
    if (mutationBusy.current) return;
    mutationBusy.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const request = sequence.current;
    try {
      await adminApiClient.request(
        `/admin/finance/invoices/${encodeURIComponent(command.invoiceId)}/${command.action}`,
        {
          method: command.action === 'items' ? 'PUT' : 'POST',
          body: command.body,
          idempotencyKey: command.key,
        },
      );
      if (!alive.current || request !== sequence.current) return;
      setIntent(null);
      setNotice(t('finance_command_saved'));
      await load();
    } catch (cause) {
      if (alive.current && request === sequence.current) {
        setIntent(command);
        setError(cause instanceof Error ? cause.message : t('finance_command_uncertain'));
      }
    } finally {
      mutationBusy.current = false;
      if (alive.current) setBusy(false);
    }
  };
  const mutate = (action: Intent['action']) => {
    if (!invoice || busy || intent) return;
    try {
      if (action !== 'items' && dirty) throw new Error(t('finance_save_draft_first'));
      let body: Record<string, unknown> = { expectedVersion: invoice.version };
      if (action === 'items') {
        if (!lines.length) throw new Error(t('finance_invalid_lines'));
        body = {
          ...body,
          lineItems: lines.map((line) => {
            const quantity = Number(line.quantity);
            if (!line.description.trim() || !Number.isSafeInteger(quantity) || quantity < 1)
              throw new Error(t('finance_invalid_lines'));
            return {
              description: line.description.trim(),
              quantity,
              unitPrice: {
                amountMinorUnits: financeParseAmount(line.price, line.scale),
                currencyCode: line.currencyCode,
                scale: line.scale,
              },
              metadata: line.metadata,
            };
          }),
        };
      } else if (
        !window.confirm(t(action === 'issue' ? 'finance_confirm_issue' : 'finance_confirm_void'))
      )
        return;
      const command: Intent = {
        action,
        body: JSON.stringify(body),
        key: createAdminIdempotencyKey(),
        invoiceId: invoice.id,
      };
      setIntent(command);
      void send(command);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('finance_invalid_lines'));
    }
  };
  return (
    <section dir={dir} className="mx-auto max-w-5xl space-y-5 rounded-3xl border bg-white p-6">
      <Link
        to="/finance?tab=invoices"
        onClick={(event) => {
          if (busy || ((dirty || intent) && !window.confirm(t('finance_leave_draft'))))
            event.preventDefault();
        }}
        className="underline"
      >
        {t('finance_back')}
      </Link>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{invoice?.invoiceNumber || t('finance_invoice')}</h1>
        <button
          disabled={busy || loading}
          onClick={() => {
            if (!dirty || window.confirm(t('finance_leave_draft'))) void load();
          }}
          className="rounded-xl border p-3"
        >
          {t('finance_refresh')}
        </button>
      </div>
      {error && (
        <p role="alert" className="rounded-xl bg-red-50 p-4 text-red-700">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="rounded-xl bg-green-50 p-4">
          {notice}
        </p>
      )}
      {loading && <p role="status">{t('finance_loading')}</p>}
      {intent && !busy && (
        <div className="rounded-xl bg-amber-50 p-4">
          <p>{t('finance_command_uncertain')}</p>
          <button className="mt-2 rounded-xl border p-3" onClick={() => void send(intent)}>
            {t('finance_retry_same_command')}
          </button>
          <p className="mt-2 text-sm">{t('finance_conflict_help')}</p>
          <button
            onClick={() => {
              if (window.confirm(t('finance_confirm_discard_intent'))) {
                setIntent(null);
                void load();
              }
            }}
            className="mt-2 underline"
          >
            {t('finance_discard_intent')}
          </button>
        </div>
      )}
      {invoice && !loading && (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              ['finance_total', invoice.totalAmount],
              ['finance_remaining', invoice.amountDue],
            ].map(([label, money]) => (
              <article key={String(label)} className="rounded-xl border p-4">
                <p>{t(label as Parameters<typeof t>[0])}</p>
                <strong dir="ltr">{financeMoney(money as FinanceMoney)}</strong>
              </article>
            ))}
            <article className="rounded-xl border p-4">
              <p>{t('finance_status')}</p>
              <strong>{t(`finance_state_${invoice.status}` as Parameters<typeof t>[0])}</strong>
            </article>
          </div>
          <p>
            {t('finance_origin')}:{' '}
            {invoice.originDomain === 'PHASE_20_SERVICE_REQUEST' ? (
              <Link
                className="underline"
                to={`/services?request=${encodeURIComponent(invoice.originReferenceId)}`}
              >
                {invoice.originReferenceId}
              </Link>
            ) : (
              <span>
                {invoice.originDomain} · {invoice.originReferenceId} ·{' '}
                {t('finance_target_unavailable')}
              </span>
            )}
          </p>
          <p>
            {t('finance_filter_studentReferenceId')}: {invoice.studentReferenceId || '—'}
          </p>
          <p>
            {t('finance_filter_payerReferenceId')}: {invoice.payerReferenceId || '—'}
          </p>
          <p>
            {t('finance_version')}: {invoice.version} ·{' '}
            {new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
              new Date(invoice.updatedAt),
            )}
          </p>
          <p>{t('finance_issue_notice')}</p>
          {invoice.status === 'DRAFT' && (
            <div className="flex flex-wrap gap-3">
              <button
                disabled={busy || Boolean(intent)}
                onClick={() => setEditing(true)}
                className="rounded-xl border p-3"
              >
                {t('finance_edit_items')}
              </button>
              <button
                disabled={busy || Boolean(intent)}
                onClick={() => mutate('issue')}
                className="rounded-xl bg-[#142B5F] p-3 text-white"
              >
                {t('finance_issue')}
              </button>
            </div>
          )}
          {['DRAFT', 'ISSUED', 'OVERDUE'].includes(invoice.status) && (
            <button
              disabled={busy || Boolean(intent)}
              onClick={() => mutate('void')}
              className="rounded-xl border border-red-200 p-3 text-red-700"
            >
              {t('finance_void')}
            </button>
          )}
          {editing ? (
            <div className="space-y-3">
              {lines.map((line, index) => (
                <div key={index} className="grid gap-2 rounded-xl border p-3 sm:grid-cols-4">
                  {(['description', 'quantity', 'price'] as const).map((field) => (
                    <input
                      key={field}
                      disabled={busy || Boolean(intent)}
                      aria-label={t(`finance_line_${field}`)}
                      className="rounded-lg border p-2"
                      value={line[field]}
                      onChange={(event) =>
                        setLines((current) =>
                          current.map((item, i) =>
                            i === index ? { ...item, [field]: event.target.value } : item,
                          ),
                        )
                      }
                    />
                  ))}
                  <button
                    disabled={busy || Boolean(intent)}
                    onClick={() => setLines((current) => current.filter((_, i) => i !== index))}
                  >
                    {t('finance_remove_item')}
                  </button>
                </div>
              ))}
              <div className="flex gap-3">
                <button
                  disabled={busy || Boolean(intent)}
                  onClick={() =>
                    setLines((current) => [
                      ...current,
                      {
                        description: '',
                        quantity: '1',
                        price: '',
                        currencyCode: invoice.totalAmount.currencyCode,
                        scale: invoice.totalAmount.scale,
                      },
                    ])
                  }
                >
                  {t('finance_add_item')}
                </button>
                <button
                  disabled={busy || Boolean(intent)}
                  onClick={() => mutate('items')}
                  className="rounded-xl bg-[#142B5F] p-3 text-white"
                >
                  {t('finance_save_items')}
                </button>
                <button
                  disabled={busy || Boolean(intent)}
                  onClick={() => {
                    setLines(invoiceLines(invoice));
                    setEditing(false);
                  }}
                >
                  {t('finance_cancel')}
                </button>
              </div>
            </div>
          ) : (
            <div className="overflow-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr>
                    {['description', 'quantity', 'price'].map((field) => (
                      <th key={field} className="p-3 text-start">
                        {t(`finance_line_${field}` as Parameters<typeof t>[0])}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoice.lineItems.map((line, index) => (
                    <tr key={index} className="border-t">
                      <td className="p-3">{line.description}</td>
                      <td className="p-3">{line.quantity}</td>
                      <td className="p-3" dir="ltr">
                        {financeMoney(line.totalPrice)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <h2 className="text-xl font-bold">{t('finance_tab_payments')}</h2>
          {payments.length ? (
            payments.map((payment) => (
              <article key={payment.id} className="rounded-xl border p-3">
                <Link
                  className="underline"
                  to={`/finance/records/payments/${encodeURIComponent(payment.id)}`}
                >
                  {payment.publicId}
                </Link>
                <p>{payment.status}</p>
                <p dir="ltr">{financeMoney(payment.amount)}</p>
              </article>
            ))
          ) : (
            <p>{t('finance_empty')}</p>
          )}
        </>
      )}
    </section>
  );
}
