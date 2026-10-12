import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  analyticsContract,
  dashboardAllowed,
  dashboardSources,
  unmeasuredCoverage,
} from '../features/dashboard/DashboardSources';
import {
  effectiveDashboardState,
  initialDashboardReading,
  type DashboardReading,
} from '../features/dashboard/DashboardContract';
import { loadDashboardSources } from '../features/dashboard/DashboardLoader';
import { DashboardHealthPanel, DashboardMetricCard } from '../features/dashboard/DashboardCards';
import { dashboardLabel, dashboardTime } from '../features/dashboard/dashboardText';

export function AdminDashboardPage() {
  const { language, dir } = useTranslation();
  const { hasPermission, permissions } = useAdminAuthorization();
  const permissionKey = [...permissions].sort().join('|');
  const allowed = useMemo(
    () => dashboardSources.filter((source) => dashboardAllowed(source, hasPermission)),
    [permissionKey],
  );
  const [readings, setReadings] = useState<DashboardReading[]>(() =>
    dashboardSources.map((source) =>
      initialDashboardReading(source, dashboardAllowed(source, hasPermission)),
    ),
  );
  const currentReadings = useRef(readings);
  currentReadings.current = readings;
  const [busy, setBusy] = useState(false),
    [clock, setClock] = useState(Date.now());
  const [progress, setProgress] = useState({ completed: 0, total: 0 });
  const controller = useRef<AbortController | null>(null),
    generation = useRef(0),
    lock = useRef(false);
  const load = useCallback(
    async (mode: 'all' | 'due' | 'source' = 'all', key?: string) => {
      if (lock.current) return;
      const permitted = new Set(allowed.map((source) => source.key));
      const candidates = dashboardSources
        .filter((source) => permitted.has(source.key))
        .map((source) => {
          const previous = currentReadings.current.find(
            (reading) => reading.source.key === source.key,
          );
          return !previous || previous.state === 'forbidden'
            ? initialDashboardReading(source, true)
            : previous;
        })
        .filter((reading) =>
          mode === 'source'
            ? reading.source.key === key
            : mode === 'all' ||
              ['loading', 'stale', 'unavailable', 'timed_out', 'network_error'].includes(
                effectiveDashboardState(reading, Date.now()),
              ),
        );
      if (!candidates.length) return;
      lock.current = true;
      setBusy(true);
      const token = ++generation.current;
      controller.current?.abort();
      const abort = new AbortController();
      controller.current = abort;
      setProgress({ completed: 0, total: candidates.length });
      setReadings((previous) =>
        previous.map((reading) =>
          !permitted.has(reading.source.key)
            ? initialDashboardReading(reading.source, false)
            : candidates.some((candidate) => candidate.source.key === reading.source.key)
              ? { ...reading, state: reading.receivedAt ? 'stale' : 'loading' }
              : reading,
        ),
      );
      let completed = 0;
      // Read health and permissioned activity first, without holding catalog cards behind them.
      candidates.sort(
        (a, b) =>
          Number(['health', 'activity'].includes(b.source.key)) -
          Number(['health', 'activity'].includes(a.source.key)),
      );
      try {
        await loadDashboardSources(
          candidates,
          (url, options) => adminApiClient.request(url, options),
          abort.signal,
          (reading) => {
            if (token !== generation.current) return;
            setReadings((previous) =>
              previous.map((prior) => (prior.source.key === reading.source.key ? reading : prior)),
            );
            setProgress({ completed: ++completed, total: candidates.length });
          },
        );
      } finally {
        if (token === generation.current) {
          lock.current = false;
          setBusy(false);
          setClock(Date.now());
        }
      }
    },
    [allowed],
  );
  useEffect(() => {
    setReadings((previous) =>
      dashboardSources.map((source) => {
        if (!allowed.some((candidate) => candidate.key === source.key))
          return initialDashboardReading(source, false);
        const prior = previous.find((reading) => reading.source.key === source.key);
        return prior?.state !== 'forbidden' && prior
          ? prior
          : initialDashboardReading(source, true);
      }),
    );
    void load();
    const focus = () => {
      if (document.visibilityState === 'visible') void load('due');
    };
    const visibility = () => {
      if (document.visibilityState === 'visible') focus();
      else {
        ++generation.current;
        controller.current?.abort();
        lock.current = false;
        setBusy(false);
      }
    };
    window.addEventListener('focus', focus);
    document.addEventListener('visibilitychange', visibility);
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') setClock(Date.now());
    }, 10000);
    return () => {
      ++generation.current;
      controller.current?.abort();
      lock.current = false;
      window.removeEventListener('focus', focus);
      document.removeEventListener('visibilitychange', visibility);
      window.clearInterval(timer);
    };
  }, [load, allowed]);
  // Immediate render fencing also protects the frame before permission-change effects run.
  const visible = readings.map((reading) =>
    dashboardAllowed(reading.source, hasPermission)
      ? reading
      : initialDashboardReading(reading.source, false),
  );
  const health = visible.find((reading) => reading.source.key === 'health')!;
  const activity = visible.find((reading) => reading.source.key === 'activity')!;
  const activityState = effectiveDashboardState(activity, clock);
  const finance = visible.find((reading) => reading.source.key === 'finance')!;
  const financeState = effectiveDashboardState(finance, clock);
  const label = (key: string) => dashboardLabel(key, language);
  const groups = [
    ...new Set(
      visible
        .filter((reading) => reading.source.metrics.length)
        .map((reading) => reading.source.domain),
    ),
  ];
  const attentionMetrics = new Set([
    'review',
    'needs_review',
    'needsVerification',
    'needsTranslation',
    'imported_broken',
    'NEEDS_REVIEW',
    'FAILED',
    'DLQ',
    'pendingApprovals',
  ]);
  return (
    <div dir={dir} className="space-y-6 text-[#142B5F]">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold">{label('title')}</h1>
        <button
          disabled={busy}
          onClick={() => void load()}
          className="rounded border px-4 py-2 disabled:opacity-50 focus-visible:outline focus-visible:outline-2"
        >
          {label('refresh')}
        </button>
      </header>
      <p>{label('scope')}</p>
      <p>{label('permission')}</p>
      <p role="status" aria-live="polite">
        {busy ? label('loading') : label('completed')}:{' '}
        {new Intl.NumberFormat(language).format(progress.completed)} /{' '}
        {new Intl.NumberFormat(language).format(progress.total)}
      </p>
      <DashboardHealthPanel reading={health} language={language} now={clock} />
      <section aria-labelledby="dashboard-attention">
        <h2 id="dashboard-attention" className="mb-3 text-lg font-bold">
          {label('attention')}
        </h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {visible
            .filter((reading) => reading.state !== 'forbidden')
            .flatMap((reading) =>
              reading.source.metrics
                .filter((metric) => attentionMetrics.has(metric))
                .map((metric) => (
                  <DashboardMetricCard
                    key={`${reading.source.key}:${metric}`}
                    reading={reading}
                    metric={metric}
                    language={language}
                    now={clock}
                  />
                )),
            )}
        </div>
      </section>
      {groups.map((group) => (
        <section key={group} aria-labelledby={`dashboard-${group}`}>
          <h2 id={`dashboard-${group}`} className="mb-3 text-lg font-bold">
            {label(group)}
          </h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {visible
              .filter((reading) => reading.source.domain === group)
              .flatMap((reading) =>
                reading.source.metrics.map((metric) => (
                  <DashboardMetricCard
                    key={`${reading.source.key}:${metric}`}
                    reading={reading}
                    metric={metric}
                    language={language}
                    now={clock}
                  />
                )),
              )}
          </div>
          {visible
            .filter(
              (reading) =>
                reading.source.domain === group &&
                reading.state !== 'forbidden' &&
                ['unavailable', 'timed_out', 'network_error', 'stale', 'partial'].includes(
                  effectiveDashboardState(reading, clock),
                ),
            )
            .map((reading) => (
              <button
                key={reading.source.key}
                disabled={busy}
                onClick={() => void load('source', reading.source.key)}
                className="mt-2 me-2 rounded border p-2 text-sm disabled:opacity-50"
              >
                {label('retry')} · <bdi>{reading.source.key}</bdi>
              </button>
            ))}
          {group === 'finance' && (
            <p>
              {label('reconciliation')}:{' '}
              {label(
                ['available', 'partial'].includes(financeState)
                  ? (finance.reconciliation ?? 'unknown')
                  : financeState,
              )}
            </p>
          )}
        </section>
      ))}
      <section className="rounded-xl border bg-white p-4" aria-labelledby="dashboard-activity">
        <h2 id="dashboard-activity" className="text-lg font-bold">
          {label('audit')}
        </h2>
        <p role="status">{label(activityState)}</p>
        <p className="text-sm">{label('activity_scope')}</p>
        {activity.activityPartial || ['stale', 'partial'].includes(activityState) ? (
          <p>{label('limited_activity')}</p>
        ) : null}
        {activityState !== 'forbidden' &&
          activity.activity.map((event) => (
            <article key={event.id} className="mt-3 border-t pt-2">
              <p>
                <bdi>{event.action}</bdi> · {label(event.owner)} · <bdi>{event.targetClass}</bdi>
              </p>
              <p>
                {label(event.actorAlias)} · {label(event.result)} ·{' '}
                {dashboardTime(event.timestamp, language)}
              </p>
              <Link
                to="/audit"
                className="rounded underline focus-visible:outline focus-visible:outline-2"
              >
                {label('owner')}
              </Link>
            </article>
          ))}
        {activityState === 'available' && !activity.activity.length ? (
          <p>{label('no_activity')}</p>
        ) : null}
        <p className="text-xs">
          {label('checked')}: {dashboardTime(activity.capturedAt, language)}
        </p>
      </section>
      <section aria-labelledby="dashboard-coverage">
        <h2 id="dashboard-coverage" className="mb-3 text-lg font-bold">
          {label('coverage')}
        </h2>
        <ul className="space-y-2">
          {unmeasuredCoverage.map((metric) => (
            <li key={metric}>
              {label(metric)}: {label('not_measured')}
            </li>
          ))}
        </ul>
        <p className="mt-3">{label('analytics_limit')}</p>
        <details>
          <summary>{label('analytics_funnel')}</summary>
          <bdi>{analyticsContract.requiredEvidence.join(', ')}</bdi>
        </details>
      </section>
    </div>
  );
}
