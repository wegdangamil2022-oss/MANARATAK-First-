import { BookOpen, Landmark, RefreshCw } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nProvider';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';

interface Props {
  kind: 'universities' | 'courses';
  status: Exclude<PublicLiveDomainStatus, 'ready'>;
  onRetry?: () => void;
}

/** Layout slots, never domain records: no IDs, images, ranks, links or selection handlers. */
export function FeaturedCatalogStateCards({ kind, status, onRetry }: Props) {
  const { t } = useTranslation();
  const loading = status === 'loading';
  const Icon = kind === 'universities' ? Landmark : BookOpen;
  const message = loading ? t('public_home_catalog_loading')
    : status === 'unavailable' ? t('public_home_catalog_unavailable')
    : t(kind === 'universities' ? 'public_home_universities_empty' : 'public_home_courses_empty');

  return (
    <div data-catalog-state={status}>
      <p role="status" aria-live="polite" className="sr-only">{message}</p>
      <div className="space-y-2 w-full" aria-busy={loading}>
        {[0, 1, 2].map(slot => (
          <div key={slot} data-catalog-slot={kind} aria-hidden="true"
            className="flex min-h-[76px] min-w-0 items-center gap-2.5 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-2 sm:p-2.5 mn-panel">
            <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--mn-surface-muted)] text-[var(--mn-text-muted)] ${loading ? 'animate-pulse motion-reduce:animate-none' : ''}`}>
              <Icon className="h-5 w-5" />
            </div>
            {loading ? (
              <div className="min-w-0 flex-1 space-y-2 animate-pulse motion-reduce:animate-none">
                <div className="h-3 w-3/4 rounded bg-[var(--mn-surface-muted)]" />
                <div className="h-2 w-1/2 rounded bg-[var(--mn-surface-muted)]" />
              </div>
            ) : (
              <div className="min-w-0 flex-1 text-start">
                <p className="text-xs font-bold leading-relaxed text-[var(--mn-heading)]">{message}</p>
                <p className="mt-0.5 text-[10px] leading-relaxed text-[var(--mn-text-muted)]">
                  {t(status === 'empty' ? 'public_home_catalog_published_only' : 'public_home_catalog_retry_hint')}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>
      {status === 'unavailable' && onRetry && (
        <button type="button" onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[var(--mn-border)] px-3 py-2 text-xs font-bold text-[var(--mn-heading)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2">
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />{t('public_home_catalog_retry')}
        </button>
      )}
    </div>
  );
}
