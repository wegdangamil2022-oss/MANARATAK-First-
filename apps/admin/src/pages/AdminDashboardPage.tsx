import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, ListChecks, ChartNoAxesCombined, Info, Upload, ShieldCheck, ArrowUpLeft } from 'lucide-react';
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
import { DashboardSectionDirectory } from '../features/dashboard/DashboardSectionDirectory';
import { dashboardLabel, dashboardTime } from '../features/dashboard/dashboardText';
import { dashboardInitialKeys } from '../features/dashboard/DashboardSchedule';

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
  const requested = useRef(new Set(dashboardInitialKeys));
  const pendingGroups = useRef(new Set<string>());
  const load = useCallback(
    async (mode: 'all' | 'due' | 'source' | 'group' = 'all', key?: string) => {
      if (mode === 'group') {
        dashboardSources.filter(source => source.domain === key).forEach(source => requested.current.add(source.key));
      }
      if (lock.current) {
        if (mode === 'group' && key) pendingGroups.current.add(key);
        return;
      }
      const permitted = new Set(allowed.map((source) => source.key));
      const candidates = dashboardSources
        .filter((source) => permitted.has(source.key) && (requested.current.has(source.key) || mode === 'source'))
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
            : mode === 'group'
              ? reading.source.domain === key && (!reading.receivedAt || effectiveDashboardState(reading, Date.now()) !== 'available')
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
          Number(b.source.key === 'health') - Number(a.source.key === 'health'),
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
          const next = pendingGroups.current.values().next().value;
          if (next) {
            pendingGroups.current.delete(next);
            void load('group', next);
          }
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
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const primaryKeys = [
    'identities',
    'universities:total',
    'scholarships:total',
    'majors:total',
    'courses:total',
    'tests:total',
    'careers:total',
    'cms:total',
  ];
  const primaryReadings = primaryKeys.flatMap((key) => {
    const reading = visible.find((row) => row.source.key === key);
    return reading && reading.state !== 'forbidden' ? [reading] : [];
  });
  const groups = [
    ...new Set(
      visible
        .filter((reading) => reading.source.metrics.length && reading.state !== 'forbidden')
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
    <div dir={dir} className="admin-command-center mx-auto max-w-7xl space-y-5 text-[#142B5F]">
      <header className="admin-page-hero relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div>
          <span className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold text-cyan-100">
            <Activity className="h-4 w-4" aria-hidden="true" />
            {tr('مركز الإدارة والتشغيل', 'Administration & Operations Center')}
          </span>
          <h1>{tr('لوحة التحكم', 'Dashboard')}</h1>
          <p>
            {tr(
              'نظرة تنفيذية على البيانات الحقيقية، قوائم المراجعة، الاستيراد والعمليات الأساسية في منارتك.',
              'An executive view of live catalog data, review queues, imports and core MANARATAK operations.',
            )}
          </p>
        </div>
        <button
          disabled={busy}
          onClick={() => void load()}
          className="inline-flex min-h-12 items-center gap-2 rounded-xl bg-[#21A7B4] px-4 py-3 font-bold text-white disabled:opacity-50 focus-visible:outline focus-visible:outline-2"
        >
          <RefreshCw aria-hidden="true" className={`h-4 w-4 ${busy ? 'animate-spin' : ''}`} />
          {label('refresh')}
        </button>
      </header>
      <p role="status" aria-live="polite" className="text-xs text-[#203442]/70">
        {busy ? label('loading') : label('completed')}:{' '}
        {new Intl.NumberFormat(language).format(progress.completed)} /{' '}
        {new Intl.NumberFormat(language).format(progress.total)}
      </p>
      <nav className="command-shortcuts" aria-label={tr('إجراءات الإدارة', 'Administration actions')}>
        {[
          { path: '/review-queue', ar: 'متابعة المراجعات', en: 'Review work', icon: ListChecks, allowed: hasPermission('admin:platform:manage') },
          { path: '/imports', ar: 'مركز الاستيراد', en: 'Import center', icon: Upload, allowed: hasPermission('admin:imports:manage') },
          { path: '/health-readiness', ar: 'صحة المنصة', en: 'Platform health', icon: ShieldCheck, allowed: hasPermission('admin:platform:manage') },
        ].filter(action => action.allowed).map(action => <Link key={action.path} to={action.path}><action.icon aria-hidden="true" /><span>{tr(action.ar, action.en)}</span><ArrowUpLeft aria-hidden="true" /></Link>)}
      </nav>
      <DashboardHealthPanel reading={health} language={language} now={clock} />
      <DashboardSectionDirectory />
      <section aria-labelledby="dashboard-snapshot">
        <p className="text-xs font-black text-[#0E7C86]">
          {tr('المؤشرات الرئيسية', 'Key metrics')}
        </p>
        <h2 id="dashboard-snapshot" className="mb-4 mt-1 text-xl font-black">
          <ChartNoAxesCombined aria-hidden="true" />{tr('بيانات المنصة', 'Platform records')}
        </h2>
        <div className="dashboard-snapshot-grid">
          {primaryReadings.map((reading) => (
            <DashboardMetricCard
              key={reading.source.key}
              reading={reading}
              metric={reading.source.metrics[0]}
              language={language}
              now={clock}
              compact
            />
          ))}
        </div>
      </section>
        <section className="command-panel" aria-labelledby="dashboard-attention">
          <h2 id="dashboard-attention" className="mb-3 text-lg font-bold">
            <ListChecks aria-hidden="true" />{tr('ما يحتاج المتابعة', 'Needs attention')}
          </h2>
          <p className="command-caption">{label('attention')}</p>
          <div className="dashboard-attention-grid">
            {visible
              .filter((reading) => reading.state !== 'forbidden' && (dashboardInitialKeys.has(reading.source.key) || reading.receivedAt))
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
      <details aria-labelledby="dashboard-section-metrics" className="command-panel dashboard-breakdowns">
        <summary id="dashboard-section-metrics" className="font-bold">
          {tr('تفاصيل مؤشرات الأقسام ومصادرها', 'Section metrics and source details')}
        </summary>
        <div className="space-y-6">
          <p className="text-sm text-slate-600">
            {label('scope')} {label('permission')}
          </p>
          {groups.map((group) => (
            <details key={group} className="admin-section-tools" aria-labelledby={`dashboard-${group}`} onToggle={event => { if (event.currentTarget.open) void load('group', group); }}>
              <summary id={`dashboard-${group}`} className="text-base font-bold">
                {label(group)}
              </summary>
              <div className="dashboard-breakdown-grid">
                {visible
                  .filter((reading) => reading.source.domain === group && reading.state !== 'forbidden')
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
            </details>
          ))}
        </div>
      </details>
      <details className="command-panel" onToggle={event => { if(event.currentTarget.open) void load('group', 'audit'); }}>
        <summary id="dashboard-activity" className="text-lg font-bold">
          {label('audit')}
        </summary>
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
      </details>
      <details className="admin-section-tools" aria-labelledby="dashboard-coverage">
        <summary id="dashboard-coverage"><Info className="inline h-4 w-4" aria-hidden="true" /> {label('coverage')}</summary>
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
      </details>
    </div>
  );
}
