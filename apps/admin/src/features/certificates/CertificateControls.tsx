import type { ReactNode } from 'react';
import { Loader2, RefreshCw, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCertificateCopy } from './certificateHooks';
export function CertificatePanel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="certificate-panel">
      <div className="certificate-panel-heading">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
export function CertificateReadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: string;
  retry?: () => void;
}) {
  const { c } = useCertificateCopy();
  return loading ? (
    <p role="status" className="certificate-notice">
      <Loader2 className="animate-spin" />
      {c('جاري تحميل البيانات…', 'Loading…')}
    </p>
  ) : error ? (
    <div role="alert" className="certificate-notice certificate-error">
      <p>{c('تعذر تحميل بيانات هذه المساحة.', 'This workspace could not be loaded.')}</p>
      {retry ? (
        <button onClick={retry}>
          <RefreshCw />
          {c('إعادة المحاولة', 'Retry')}
        </button>
      ) : null}
    </div>
  ) : null;
}
export function CertificateNotice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      role={error ? 'alert' : 'status'}
      className={'certificate-notice' + (error ? ' certificate-error' : '')}
    >
      {children}
    </div>
  );
}
export function CertificateBack({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link className="certificate-link" to={to}>
      <ArrowRight />
      {children}
    </Link>
  );
}
export function CertificatePager({
  page,
  pageSize,
  total,
  onPage,
}: {
  page: number;
  pageSize: number;
  total: number;
  onPage: (page: number) => void;
}) {
  const { c, language } = useCertificateCopy();
  return (
    <nav className="certificate-pagination" aria-label={c('صفحات النتائج', 'Result pages')}>
      <button disabled={page <= 1} onClick={() => onPage(page - 1)}>
        {c('السابق', 'Previous')}
      </button>
      <span>
        {c('صفحة', 'Page')} {page.toLocaleString(language)} · {c('الإجمالي', 'Total')}{' '}
        {total.toLocaleString(language)}
      </span>
      <button disabled={page * pageSize >= total} onClick={() => onPage(page + 1)}>
        {c('التالي', 'Next')}
      </button>
    </nav>
  );
}
export function CertificateEmpty({ children }: { children: ReactNode }) {
  return <p className="certificate-empty">{children}</p>;
}
