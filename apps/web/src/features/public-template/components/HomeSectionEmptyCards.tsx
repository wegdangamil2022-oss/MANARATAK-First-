import { FileSignature, Globe2, GraduationCap, Newspaper, RefreshCw, BriefcaseBusiness } from 'lucide-react';
import { useTranslation } from '../../../i18n/I18nProvider';
import type { PublicLiveDomainStatus } from '../publicLiveDataSource';

export type HomeEmptyKind = 'scholarships' | 'countries' | 'exams' | 'articles' | 'services';

interface Props {
  kind: HomeEmptyKind;
  status: Exclude<PublicLiveDomainStatus, 'ready'>;
  onRetry?: () => void;
}

const layouts = {
  scholarships: { count: 2, className: 'grid grid-cols-2 gap-2 sm:gap-3' },
  countries: { count: 8, className: 'grid grid-cols-4 gap-x-2 gap-y-3 sm:gap-x-3' },
  exams: { count: 6, className: 'flex gap-3 overflow-x-auto no-scrollbar pb-2' },
  articles: { count: 4, className: 'flex gap-2.5 overflow-x-auto no-scrollbar pb-2' },
  services: { count: 3, className: 'flex flex-col gap-2.5' },
} as const;
const icons = { scholarships: GraduationCap, countries: Globe2, exams: FileSignature, articles: Newspaper, services: BriefcaseBusiness } as const;

/** Decorative placeholders only. Never forge an owner record, navigation link or published listing. */
export function HomeSectionEmptyCards({ kind, status, onRetry }: Props) {
  const { t } = useTranslation();
  const Icon = icons[kind];
  const imageUrl = `/preview-art/${kind}.svg`;
  const loading = status === 'loading';
  const pulse = loading ? 'animate-pulse motion-reduce:animate-none' : '';
  const bar = 'bg-[var(--mn-surface-muted)]';
  const message = loading ? t('public_home_catalog_loading')
    : status === 'unavailable' ? t('public_home_catalog_unavailable')
    : t(({
      scholarships: 'public_home_scholarships_empty', countries: 'public_home_countries_empty',
      exams: 'public_home_exams_empty', articles: 'public_home_articles_empty',
      services: 'public_home_services_empty',
    } as const)[kind]);
  return (
    <div data-home-empty-kind={kind} data-catalog-state={status} aria-busy={loading} className="w-full">
      <div className={layouts[kind].className} aria-hidden="true">
        {Array.from({ length: layouts[kind].count }, (_, index) => (
          <div key={index} data-home-empty-slot={kind} className={
            kind === 'scholarships' ? 'relative aspect-square rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-primary)] p-3 text-white flex flex-col justify-between'
            : kind === 'countries' ? 'flex min-w-0 flex-col items-center gap-2'
            : kind === 'exams' ? 'flex w-16 sm:w-20 shrink-0 flex-col items-center gap-1.5'
            : kind === 'articles' ? 'flex w-[155px] sm:w-[180px] shrink-0 flex-col overflow-hidden rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)]'
            : 'flex w-full min-h-[66px] items-center gap-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3'
          }>
            {kind === 'countries' ? (
              <>
                <span className="flex h-[66px] w-[66px] sm:h-[78px] sm:w-[78px] items-center justify-center overflow-hidden rounded-full border-2 border-[#142B5F] dark:border-[#D6A43B] bg-[var(--mn-surface-muted)]"><img src={imageUrl} alt="" decoding="async" loading="lazy" className="h-full w-full object-cover" /></span>
                <span className={'h-2 w-12 rounded-full ' + bar + ' ' + pulse} />
              </>
            ) : kind === 'scholarships' ? (
              <>
                <img src={imageUrl} alt="" decoding="async" loading="lazy" className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-90" />
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-xl border border-white/20 bg-[#142B5F]/70"><Icon className={'h-6 w-6 text-[#D6A43B] ' + pulse} /></span>
                <span className="relative z-10 space-y-2 w-full"><span className={'block h-3 w-5/6 rounded bg-white/40 ' + pulse} /><span className={'block h-2 w-1/2 rounded bg-white/30 ' + pulse} /></span>
              </>
            ) : kind === 'exams' ? (
              <>
                <span className="flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center overflow-hidden rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface-muted)]"><img src={imageUrl} alt="" decoding="async" loading="lazy" className="h-full w-full object-cover" /></span>
                <span className={'h-2 w-12 rounded-full ' + bar + ' ' + pulse} />
              </>
            ) : kind === 'articles' ? (
              <>
                <span className="flex h-20 sm:h-24 items-center justify-center overflow-hidden bg-[var(--mn-surface-muted)]"><img src={imageUrl} alt="" decoding="async" loading="lazy" className="h-full w-full object-cover" /></span>
                <span className="flex flex-col gap-2 p-2.5"><span className={'h-3 w-full rounded ' + bar + ' ' + pulse} /><span className={'h-2 w-2/3 rounded ' + bar + ' ' + pulse} /></span>
              </>
            ) : (
              <>
                <span className="flex h-11 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#D6A43B]/40 bg-[#142B5F]"><img src={imageUrl} alt="" decoding="async" loading="lazy" className="h-full w-full object-cover" /></span>
                <span className="min-w-0 flex-1 space-y-2"><span className={'block h-3 w-3/4 rounded ' + bar + ' ' + pulse} /><span className={'block h-2 w-1/2 rounded ' + bar + ' ' + pulse} /></span>
              </>
            )}
          </div>
        ))}
      </div>
      <p role="status" aria-live="polite" className="mt-3 text-center text-xs font-medium text-[var(--mn-text-muted)]">{message}</p>
      {status === 'unavailable' && onRetry && (
        <button type="button" onClick={onRetry} className="mx-auto mt-2 flex items-center gap-1.5 rounded-xl border border-[var(--mn-border)] px-3 py-2 text-xs font-bold text-[var(--mn-heading)] focus-visible:outline focus-visible:outline-2">
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />{t('public_home_catalog_retry')}
        </button>
      )}
    </div>
  );
}
