import { Link } from 'react-router-dom';
import { dashboardMetricHref } from './DashboardSources';
import { effectiveDashboardState, type DashboardReading } from './DashboardContract';
import { dashboardLabel, dashboardTime } from './dashboardText';
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
      ? label('unknown')
      : new Intl.NumberFormat(language === 'ar' ? 'ar' : 'en-US').format(value);
  const href = dashboardMetricHref(reading.source, metric);
  const scope =
    reading.source.kind === 'imports' && metric === 'batches'
      ? label('batches')
      : label(
          `${reading.source.unit}${['records', 'identities'].includes(reading.source.unit) ? '_unit' : ''}`,
        );
  return (
    <article
      className={card}
      aria-label={`${label(reading.source.domain)}: ${label(metric)}; ${label(state)}`}
    >
      <h3 className="text-sm font-bold text-[#0E7C86]">
        {label(compact ? reading.source.domain : metric)}
      </h3>
      <output
        className={`mt-2 block font-black ${compact && value == null ? 'text-lg' : 'text-2xl'}`}
        aria-label={`${label(metric)}: ${text}`}
      >
        {text}
      </output>
      <p role="status" className="mt-1 text-xs" title={label(state)}>
        {compact && state === 'available'
          ? language === 'ar'
            ? 'متاح'
            : 'Available'
          : label(state)}
      </p>
      {!compact && <p className="mt-2 text-sm text-slate-600">{scope}</p>}
      <p className="text-xs">
        {label('checked')}: {dashboardTime(reading.capturedAt, language)}
      </p>
      <details className="mt-2 text-xs">
        <summary>{label('scope')}</summary>
        {compact && (
          <p>
            {label(metric)} · {scope}
          </p>
        )}
        <p>
          <bdi>{reading.source.endpoint}</bdi>
        </p>
        <p>
          <bdi>{new URLSearchParams(reading.source.params).toString() || 'OWNER_SUMMARY'}</bdi>
        </p>
        <p>
          {label('received')}: {dashboardTime(reading.receivedAt, language)}
        </p>
      </details>
      {reading.errors[metric] || reading.errors.read ? (
        <p role="alert" className="mt-2 text-sm">
          {label(state)} · <bdi>{reading.errors[metric] ?? reading.errors.read}</bdi>
        </p>
      ) : null}
      {state !== 'forbidden' ? (
        <Link
          className="mt-3 inline-flex min-h-10 items-center rounded-xl bg-[#DDEFF2]/50 px-3 py-2 text-xs font-bold text-[#0E7C86] focus-visible:outline focus-visible:outline-2"
          to={href}
        >
          {href.startsWith('/review-queue?') ? label('queue') : label('owner')}
        </Link>
      ) : null}
      {!compact && state !== 'forbidden' && !href.startsWith('/review-queue?') ? (
        <p className="text-xs">{label('list')}</p>
      ) : null}
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
    current = state === 'available' && health !== null;
  return (
    <section className={card} aria-label={label('health')}>
      <h2 className="text-lg font-bold">{label('health')}</h2>
      <p role="status">{label(state)}</p>
      <p className="text-sm">{label('health_limit')}</p>
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
      <p className="mt-3 text-xs">
        {label('checked')}: {dashboardTime(reading.capturedAt, language)}
      </p>
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
