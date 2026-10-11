import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { financeMoney } from './financePresentation';
const kinds = ['payments', 'refunds', 'transfers', 'approvals', 'commissions'];
export function FinanceRecordDetailPage() {
  const { kind = '', id = '' } = useParams(),
    { t, dir } = useTranslation();
  const [data, setData] = useState<Record<string, any> | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(true);
  const sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current;
    let cancelled = false;
    setData(null);
    setError('');
    setLoading(true);
    if (!kinds.includes(kind)) {
      setError(t('finance_record_unavailable'));
      setLoading(false);
      return;
    }
    void adminApiClient
      .request<Record<string, any>>(`/admin/finance/${kind}/${encodeURIComponent(id)}`)
      .then((result) => {
        if (request === sequence.current && !cancelled) setData(result);
      })
      .catch((cause) => {
        if (request === sequence.current && !cancelled)
          setError(cause instanceof Error ? cause.message : t('finance_load_failed'));
      })
      .finally(() => {
        if (request === sequence.current && !cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [kind, id, t]);
  const paymentId = data?.paymentId || data?.sourcePaymentId;
  const targetKind =
    data?.actionType === 'TRANSFER_APPROVE'
      ? 'transfers'
      : data?.actionType === 'REFUND_EXECUTE'
        ? 'refunds'
        : null;
  return (
    <section dir={dir} className="mx-auto max-w-4xl space-y-4 rounded-3xl border bg-white p-6">
      <Link to={`/finance?tab=${encodeURIComponent(kind)}`} className="underline">
        {t('finance_back')}
      </Link>
      <h1 className="text-2xl font-bold">{t('finance_details')}</h1>
      {loading && <p role="status">{t('finance_loading')}</p>}
      {error && <p role="alert">{error}</p>}
      {data && (
        <>
          <p>
            {t('finance_reference')}: {data.publicId}
          </p>
          <p>
            {t('finance_status')}: {data.status}
          </p>
          {(data.amount || data.sourceAmount) && (
            <p dir="ltr">{financeMoney(data.amount || data.sourceAmount)}</p>
          )}
          <p>{t('finance_read_only')}</p>
          {data.invoiceId && (
            <Link
              className="block underline"
              to={`/finance/invoices/${encodeURIComponent(data.invoiceId)}`}
            >
              {t('finance_open_invoice')}
            </Link>
          )}
          {paymentId && (
            <Link
              className="block underline"
              to={`/finance/records/payments/${encodeURIComponent(paymentId)}`}
            >
              {t('finance_open_payment')}
            </Link>
          )}
          {targetKind && data.targetReferenceId && (
            <Link
              className="block underline"
              to={`/finance/records/${targetKind}/${encodeURIComponent(data.targetReferenceId)}`}
            >
              {t('finance_open_target')}
            </Link>
          )}
          {!data.invoiceId && !paymentId && !targetKind && <p>{t('finance_target_unavailable')}</p>}
          <p>
            {t('finance_provider')}: {data.gatewayProvider || data.bankProvider || '—'}
          </p>
          <p>
            {t('finance_reason')}: {data.reason || data.policyReference || '—'}
          </p>
        </>
      )}
    </section>
  );
}
