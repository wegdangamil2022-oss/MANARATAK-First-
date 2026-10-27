import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { RefreshCw, Loader2 } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import '../reference-data/reference-data.css';
import '../certificates/certificates.css';
import './workspace.css';

export function useWorkspaceCopy() {
  const { language, dir } = useTranslation();
  return { language, dir, c: (ar: string, en: string) => (language === 'en' ? en : ar) };
}
export function useWorkspaceRead<T>(path: string | null) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(Boolean(path));
  const [error, setError] = useState(false);
  const [observedAt, setObservedAt] = useState<string | null>(null);
  const sequence = useRef(0);
  const load = useCallback(async () => {
    const id = ++sequence.current;
    setData(null);
    setError(false);
    setLoading(Boolean(path));
    setObservedAt(null);
    if (!path) return;
    try {
      const value = await adminApiClient.request<T>(path);
      if (id === sequence.current) {
        setData(value);
        setObservedAt(new Date().toISOString());
      }
    } catch {
      if (id === sequence.current) setError(true);
    } finally {
      if (id === sequence.current) setLoading(false);
    }
  }, [path]);
  useEffect(() => {
    void load();
    return () => {
      ++sequence.current;
    };
  }, [load]);
  return { data, loading, error, observedAt, load };
}
export function WorkspacePanel({
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
export function ReadState({
  state,
}: {
  state: { loading: boolean; error: boolean; load: () => Promise<void> };
}) {
  const { c } = useWorkspaceCopy();
  return state.loading ? (
    <p role="status" className="certificate-notice">
      <Loader2 className="animate-spin" />
      {c('جاري تحميل البيانات…', 'Loading…')}
    </p>
  ) : state.error ? (
    <div role="alert" className="certificate-notice certificate-error">
      {c('تعذر تحميل البيانات.', 'Could not load data.')}
      <button onClick={() => void state.load()}>
        <RefreshCw />
        {c('إعادة المحاولة', 'Retry')}
      </button>
    </div>
  ) : null;
}
export function WorkspaceEmpty() {
  const { c } = useWorkspaceCopy();
  return <p className="certificate-empty">{c('لا توجد سجلات مطابقة.', 'No matching records.')}</p>;
}
export function WorkspacePager({
  page,
  total,
  pageSize = 25,
  onPage,
  disabled = false,
}: {
  page: number;
  total: number;
  pageSize?: number;
  onPage: (page: number) => void;
  disabled?: boolean;
}) {
  const { c } = useWorkspaceCopy();
  return (
    <nav className="certificate-pagination" aria-label={c('صفحات النتائج', 'Result pages')}>
      <button disabled={disabled || page <= 1} onClick={() => onPage(page - 1)}>
        {c('السابق', 'Previous')}
      </button>
      <span>
        {c('صفحة', 'Page')} {page} · {c('الإجمالي', 'Total')} {total}
      </span>
      <button disabled={disabled || page * pageSize >= total} onClick={() => onPage(page + 1)}>
        {c('التالي', 'Next')}
      </button>
    </nav>
  );
}
export function WorkspaceMetric({ label, value }: { label: string; value: unknown }) {
  const { c } = useWorkspaceCopy();
  return (
    <div className="certificate-metric">
      <small>{label}</small>
      <strong className={typeof value === 'number' ? undefined : 'ai-metric-message'}>
        {typeof value === 'number' || typeof value === 'string' ? value : c('غير متاح', 'N/A')}
      </strong>
    </div>
  );
}
export function EvidenceTime({ at }: { at: string | null }) {
  const { c, language } = useWorkspaceCopy();
  return at ? (
    <small>
      {c('آخر قراءة', 'Last read')}:{' '}
      <time dateTime={at}>{new Date(at).toLocaleString(language)}</time>
    </small>
  ) : null;
}
