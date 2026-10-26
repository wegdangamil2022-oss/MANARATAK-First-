import { Link } from 'react-router-dom';
import { ArrowUpLeft, BookOpen, BriefcaseBusiness, Database, GraduationCap, Newspaper, School, ShieldCheck, TestTube2, Users, type LucideIcon } from 'lucide-react';
import { dashboardMetricHref } from './DashboardSources';
import { effectiveDashboardState, type DashboardReading } from './DashboardContract';
import { dashboardLabel, dashboardTime } from './dashboardText';
import { brandPalette } from '../../components/BrandPalette';
const card = 'min-w-0 break-words rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-xs';
export function DashboardMetricCard({
  reading,
  metric,
  language,
  now,
  compact = false,
}: {
  reading: DashboardReading;
  metric: string;
  language: string;
  now: number;
  compact?: boolean;
}) {
  const label = (key: string) => dashboardLabel(key, language);
  const state = effectiveDashboardState(reading, now);
  const value = state === 'forbidden' ? null : reading.metrics[metric];
  const text =
    value === null || value === undefined
      ? '—'
      : new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en-US').format(value);
  const href = dashboardMetricHref(reading.source, metric);
  const visual: Record<string, [LucideIcon, string]> = {
    identities: [Users, '#142B5F'], universities: [School, '#0E7C86'],
    scholarships: [GraduationCap, '#D6A43B'], majors: [GraduationCap, '#21A7B4'],
    courses: [BookOpen, '#0E7C86'], tests: [TestTube2, '#D6A43B'],
    careers: [BriefcaseBusiness, '#142B5F'], cms: [Newspaper, '#21A7B4'],
  };
  const [Icon, accent] = visual[reading.source.domain] ?? [BookOpen, '#0E7C86'];
  const tone = brandPalette[accent];
  const scope =
    reading.source.kind === 'imports' && metric === 'batches'
      ? label('batches')
      : label(
          `${reading.source.unit}${['records', 'identities'].includes(reading.source.unit) ? '_unit' : ''}`,
        );
  const shortTitles: Record<string, [string, string]> = {
    total: ['إجمالي السجلات', 'Total records'], published: ['منشور', 'Published'],
    ready: ['جاهز للنشر', 'Ready to publish'], humans: ['الهويات البشرية', 'Human identities'],
  };
  const title = compact ? label(reading.source.domain)
    : shortTitles[metric]?.[language === 'ar' ? 0 : 1] ?? label(metric);
  return (
    <article
      className={`${card} dashboard-metric ${compact ? 'dashboard-metric-primary' : 'dashboard-metric-signal'}`}
      aria-label={`${label(reading.source.domain)}: ${label(metric)}; ${label(state)}`}
    >
      <span className={`absolute inset-x-0 top-0 h-1 ${tone.accent}`} />
      <div className="dashboard-metric-heading">
        <div className="dashboard-metric-top">
          <span className={`flex h-10 w-10 items-center justify-center rounded-xl ${tone.surface} ${tone.foreground}`}><Icon aria-hidden="true" className="h-5 w-5" /></span>
          <div>{!compact && <p className="dashboard-metric-domain">{label(reading.source.domain)}</p>}<h3>{title}</h3></div>
        </div>
      <output
        className={`dashboard-metric-value ${value == null ? 'dashboard-metric-missing' : ''}`}
        aria-label={`${label(metric)}: ${text}`}
      >
        {text}
      </output>
      </div>
      <div className="dashboard-metric-footer">
      <p role="status" className="dashboard-metric-status" title={label(state)}>
        {state === 'available'
          ? language === 'ar'
            ? 'متاح'
            : 'Available'
          : label(state)}
      </p>
      {state !== 'forbidden' && <Link className="dashboard-metric-link" to={href}>
        {language === 'ar' ? (href.startsWith('/review-queue?') ? 'المراجعات' : 'فتح القسم') : (href.startsWith('/review-queue?') ? 'Reviews' : 'Open section')}
        <ArrowUpLeft aria-hidden="true" className="h-3.5 w-3.5" />
      </Link>}
      </div>
      <details className="dashboard-source-details">
        <summary><Database aria-hidden="true" />{language === 'ar' ? 'تفاصيل المصدر' : 'Source details'}</summary>
        <div className="dashboard-source-body">
          <dl>
            <div><dt>{language === 'ar' ? 'نطاق العدد' : 'Count scope'}</dt><dd>{label(metric)} · {scope}</dd></div>
            <div><dt>{label('checked')}</dt><dd>{dashboardTime(reading.capturedAt, language)}</dd></div>
            <div><dt>{label('received')}</dt><dd>{dashboardTime(reading.receivedAt, language)}</dd></div>
          </dl>
          <details className="dashboard-source-technical"><summary>{language === 'ar' ? 'بيانات الاستعلام التقنية' : 'Technical query details'}</summary>
            <code dir="ltr">{reading.source.endpoint}</code>
            <code dir="ltr">{new URLSearchParams(reading.source.params).toString() || 'OWNER_SUMMARY'}</code>
            <p>{label('scope')}</p>
          </details>
        {(reading.errors[metric] || reading.errors.read) && <p role="alert">{label(state)} · <bdi>{reading.errors[metric] ?? reading.errors.read}</bdi></p>}
        </div>
      </details>
    </article>
  );
}
export function DashboardHealthPanel({
  reading,
  language,
  now,
}: {
  reading: DashboardReading;
  language: string;
  now: number;
}) {
  const label = (key: string) => dashboardLabel(key, language),
    state = effectiveDashboardState(reading, now);
  const health = reading.health,
    current = ['available', 'partial'].includes(state) && health !== null;
  return (
    <section className={`${card} dashboard-health`} aria-label={label('health')}>
      <h2 className="text-lg font-bold"><ShieldCheck aria-hidden="true" />{label('health')}</h2>
      <p role="status">{label(state)}</p>
      <dl className="mt-3 grid gap-2 sm:grid-cols-2">
        <div>
          <dt>{label('liveness')}</dt>
          <dd>{label(current ? health!.api.status : 'UNKNOWN')}</dd>
        </div>
        <div>
          <dt>{label('runtime')}</dt>
          <dd>{label(current ? health!.runtimeStatus : 'UNKNOWN')}</dd>
        </div>
        <div>
          <dt>{label('gate')}</dt>
          <dd>{current ? label(health!.releaseReady ? 'passed' : 'blocked') : label('unknown')}</dd>
        </div>
        <div>
          <dt>
            {label('blockers')} / {label('warnings')}
          </dt>
          <dd>
            {current
              ? `${new Intl.NumberFormat(language).format(health!.productionReadiness.blockerCount)} / ${new Intl.NumberFormat(language).format(health!.productionReadiness.warningCount)}`
              : label('unknown')}
          </dd>
        </div>
      </dl>
      <details className="dashboard-source-details"><summary>{language === 'ar' ? 'تفاصيل الجاهزية' : 'Readiness details'}</summary><p>{label('health_limit')}</p><p className="mt-3 text-xs">
        {label('checked')}: {dashboardTime(reading.capturedAt, language)}
      </p></details>
      {state !== 'forbidden' ? (
        <Link
          to="/health-readiness"
          className="mt-2 inline-block rounded underline focus-visible:outline focus-visible:outline-2"
        >
          {label('owner')}
        </Link>
      ) : null}
    </section>
  );
}
