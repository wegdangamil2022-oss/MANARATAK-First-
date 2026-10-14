import { parseHistory, type History } from '../features/health/HealthHistoryContract';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Activity, RefreshCw, X } from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { healthText, healthComponentLabel, type HealthMessageKey } from '../i18n/healthText';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import {
  parseHealthOverview,
  type HealthOverview,
  type HealthComponent,
} from '../features/health/HealthOverviewContract';

const tabs = ['OVERVIEW', 'COMPONENTS', 'RELEASE', 'COVERAGE', 'HISTORY', 'REPORT'] as const;
type Tab = (typeof tabs)[number];
const owners: Record<string, { href: string; permission: string }> = {
  'asset-platform': { href: '/assets', permission: 'admin:assets:manage' },
  'asset-reference-integrity': { href: '/assets', permission: 'admin:assets:manage' },
  'import-foundation': { href: '/imports', permission: 'admin:imports:manage' },
  'admin-auth': { href: '/authorization', permission: 'admin:authorization:manage' },
  'ai-providers': { href: '/ai', permission: 'admin:ai:view' },
  'payment-gateway': { href: '/finance', permission: 'admin:finance:manage' },
  notifications: { href: '/notifications', permission: 'admin:notifications:view' },
  'student-tools-quota': { href: '/student-tools', permission: 'admin:student-tools:manage' },
};
export function AdminHealthReadinessPage() {
  const { language, dir } = useTranslation(),
    { hasPermission } = useAdminAuthorization();
  const t = (key: HealthMessageKey) => healthText(language, key),
    label = (id: string) => healthComponentLabel(language, id);
  const [overview, setOverview] = useState<HealthOverview | null>(null),
    [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null),
    [tab, setTab] = useState<Tab>('OVERVIEW');
  const [selected, setSelected] = useState<string | null>(null),
    [copied, setCopied] = useState(false),
    [now, setNow] = useState(Date.now());
  const [cursor, setCursor] = useState<string | null>(null);
  const [window, setWindow] = useState<'1h' | '24h' | '7d'>('1h'),
    [history, setHistory] = useState<History | null>(null),
    [historyError, setHistoryError] = useState(false);
  const generation = useRef(0),
    active = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    const current = ++generation.current;
    active.current?.abort();
    const controller = new AbortController();
    active.current = controller;
    setLoading(true);
    setError(null);
    try {
      const raw = await adminApiClient.request<unknown>('/admin/monitoring/overview', {
        signal: controller.signal,
      });
      const snapshot = parseHealthOverview(raw);
      if (current === generation.current && !controller.signal.aborted) {
        setOverview(snapshot);
        setNow(Date.now());
      }
    } catch (e) {
      if (current === generation.current && !controller.signal.aborted) {
        if (e instanceof Error && /\[(401|403)\]/.test(e.message)) {
          setOverview(null); setHistory(null); setSelected(null);
        }
        setError(e instanceof Error && e.message === 'SCHEMA_MISMATCH' ? 'schema' : 'error');
      }
    } finally {
      if (current === generation.current && !controller.signal.aborted) setLoading(false);
    }
  }, []);
  useEffect(() => {
    void refresh();
    const timer = globalThis.setInterval(() => setNow(Date.now()), 10_000);
    return () => {
      generation.current++;
      active.current?.abort();
      globalThis.clearInterval(timer);
    };
  }, [refresh]);
  useEffect(() => {
    if (tab !== 'HISTORY') return;
    const controller = new AbortController();
    if (!cursor) setHistory(null);
    setHistoryError(false);
    void adminApiClient
      .request<unknown>(
        `/admin/monitoring/history?window=${window}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        { signal: controller.signal },
      )
      .then((raw) => {
        const parsed = parseHistory(raw, window);
        if (!controller.signal.aborted)
          setHistory((previous) =>
            cursor && previous
              ? { ...parsed, samples: [...previous.samples, ...parsed.samples].slice(0, 1_000) }
              : parsed,
          );
      })
      .catch((cause) => {
        if (!controller.signal.aborted) {
          if (cause instanceof Error && /\[(401|403)\]/.test(cause.message)) setHistory(null);
          setHistoryError(true);
        }
      });
    return () => controller.abort();
  }, [tab, window, cursor]);
  const stale = Boolean(overview && (error || now - Date.parse(overview.checkedAt) > 30_000));
  const detail = overview?.components.find((c) => c.id === selected);
  const findings = overview
    ? [
        ...overview.components
          .filter((c) => c.status !== 'UP')
          .map((c) => ({
            id: c.id,
            severity: c.optional ? 'WARNING' : 'BLOCKER',
            message: label(c.id),
            recommendation: c.error ?? c.status,
          })),
        ...overview.productionReadiness.findings,
        ...[
          ...new Set([...overview.coverage.missingProbes, ...overview.coverage.requiredUnverified]),
        ].map((id) => ({
          id: `coverage:${id}`,
          severity: 'BLOCKER',
          message: label(id),
          recommendation: t('unverified'),
        })),
      ]
    : [];
  const report = () =>
    JSON.stringify(
      { ...overview, observationStale: stale, exportedAt: new Date().toISOString() },
      null,
      2,
    );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(report());
      setCopied(true);
    } catch {
      setError('error');
    }
  };
  const download = () => {
    const url = URL.createObjectURL(new Blob([report()], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `manaratak-health-${Date.now()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  const ownerLink = (id: string) => {
    const owner = owners[id];
    return owner && hasPermission(owner.permission) ? (
      <Link className="underline" to={owner.href}>
        {t('owner')}
      </Link>
    ) : (
      <span>{t('unavailableOwner')}</span>
    );
  };
  const time = (value: string) =>
    new Date(value).toLocaleString(language === 'ar' ? 'ar' : 'en', { timeZoneName: 'short' });
  const badge = (status: string) => (
    <span
      className={`rounded px-2 py-1 ${stale ? 'bg-gray-100' : status === 'UP' ? 'bg-green-100' : 'bg-amber-100'}`}
    >
      {['UP', 'DOWN', 'DEGRADED', 'UNKNOWN'].includes(status)
        ? t(status as HealthMessageKey)
        : status}
    </span>
  );
  return (
    <div dir={dir} className="space-y-5 p-5 text-[#142B5F]">
      <header className="rounded-2xl bg-[#142B5F] p-6 text-white">
        <h1 className="flex items-center gap-2 text-2xl font-bold">
          <Activity aria-hidden="true" />
          {t('title')}
        </h1>
        <p className="mt-3">{t('description')}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <button
            disabled={loading}
            onClick={() => void refresh()}
            className="rounded bg-[#D6A43B] px-4 py-2 text-[#142B5F] disabled:opacity-50"
          >
            <RefreshCw className="inline h-4 w-4" aria-hidden="true" /> {t('refresh')}
          </button>
          <button disabled={!overview} onClick={() => void copy()}>
            {t(copied ? 'copied' : 'copy')}
          </button>
          <button disabled={!overview} onClick={download}>
            {t('download')}
          </button>
        </div>
      </header>
      {error && (
        <p role="alert" className="rounded bg-red-50 p-3 text-red-800">
          {t(error === 'schema' ? 'schema' : 'error')}
        </p>
      )}
      {stale && (
        <p role="status" className="rounded bg-amber-50 p-3">
          {t('stale')}
        </p>
      )}
      {overview && (
        <p>
          {t('checked')}: <time dateTime={overview.checkedAt}>{time(overview.checkedAt)}</time> ·{' '}
          <code>{overview.decisionScope}</code>
        </p>
      )}
      <nav aria-label={t('title')} className="flex flex-wrap gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            aria-pressed={tab === item}
            onClick={() => {
              setCursor(null);
              setTab(item);
            }}
            className={`rounded border px-3 py-2 ${tab === item ? 'bg-[#142B5F] text-white' : ''}`}
          >
            {t(item)}
          </button>
        ))}
      </nav>
      {overview && (
        <>
          {tab === 'OVERVIEW' && (
            <section className="space-y-4">
              <div className="grid gap-3 md:grid-cols-3">
                <Card label={t('runtimeReady')}>{badge(overview.runtimeStatus)}</Card>
                <Card label={t('RELEASE')}>
                  {t(!stale && overview.releaseReady ? 'ready' : 'blocked')}
                </Card>
                <Card label={t('registered')}>
                  {overview.coverage.matchedCount}/{overview.coverage.expectedCount} (
                  {overview.coverage.extraCount} {t('extra')})
                </Card>
                <Card label={t('liveness')}>{overview.api.livenessDurationMs} ms</Card>
                <Card label={t('aggregation')}>{overview.diagnosticAggregationDurationMs} ms</Card>
                <Card label={t('operational')}>{overview.coverage.operationalCount}</Card>
              </div>
              <h2 className="font-bold">
                {t('blockers')} / {t('warnings')}
              </h2>
              {findings.length ? (
                findings.map((f, i) => (
                  <article key={`${f.id}:${i}`} className="rounded border p-3">
                    <b>
                      {f.severity}: {f.message}
                    </b>
                    <p>{f.recommendation}</p>
                  </article>
                ))
              ) : (
                <p>{t('noFindings')}</p>
              )}
            </section>
          )}
          {tab === 'COMPONENTS' && (
            <section className="grid gap-3 md:grid-cols-2">
              {overview.components.map((c) => (
                <article key={c.id} className="space-y-2 rounded border p-4">
                  <h2 className="font-bold">{label(c.id)}</h2>
                  {badge(c.status)} <span>{t(c.optional ? 'optional' : 'required')}</span>
                  <p>
                    <code>{c.capabilityStatus ?? c.evidenceKind}</code>
                  </p>
                  <p>{time(c.checkedAt)}</p>
                  {c.id === 'database-schema' && <p>{t('historyOnly')}</p>}
                  <button className="underline" onClick={() => setSelected(c.id)}>
                    {t('details')}
                  </button>
                  <p>{ownerLink(c.id)}</p>
                </article>
              ))}
            </section>
          )}
          {tab === 'RELEASE' && (
            <section className="space-y-3">
              <h2>{t(!stale && overview.releaseReady ? 'ready' : 'blocked')}</h2>
              {(
                Object.keys(overview.releaseGate) as Array<keyof HealthOverview['releaseGate']>
              ).map((key) => (
                <p key={key}>
                  {t(key)}: {badge(overview.releaseGate[key] ? 'UP' : 'DOWN')}
                </p>
              ))}
              <p>{t('pending')}</p>
              {overview.productionReadiness.findings.map((f) => (
                <article className="rounded border p-3" key={f.id}>
                  <b>
                    {f.severity}: {f.message}
                  </b>
                  <p>{f.recommendation}</p>
                </article>
              ))}
            </section>
          )}
          {tab === 'COVERAGE' && (
            <section className="space-y-3">
              <p>
                {t('registered')}: {overview.coverage.matchedCount}/
                {overview.coverage.expectedCount}
              </p>
              <p>
                {t('extra')}: {overview.coverage.extraCount}
              </p>
              <p>
                {t('missing')}: {overview.coverage.missingProbes.map(label).join(', ') || '—'}
              </p>
              <p>
                {t('unverified')}:{' '}
                {overview.coverage.requiredUnverified.map(label).join(', ') || '—'}
              </p>
              <p>
                {t('operational')}: {overview.coverage.operationalCount}
              </p>
              <code>{overview.coverage.testedCoverage}</code>
            </section>
          )}
          {tab === 'REPORT' && (
            <pre dir="ltr" className="max-h-[60vh] overflow-auto rounded bg-gray-50 p-4 text-xs">
              {report()}
            </pre>
          )}
        </>
      )}
      {tab === 'HISTORY' && (
        <section className="space-y-3">
          <p>{t('historyScope')}</p>
          <label>
            {t('HISTORY')}{' '}
            <select
              value={window}
              onChange={(event) => {
                setCursor(null);
                setWindow(event.target.value as typeof window);
              }}
            >
              {['1h', '24h', '7d'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
          {historyError || history?.availability === 'UNAVAILABLE' ? (
            <p>{t('noHistory')}</p>
          ) : (
            history?.samples.map((s) => (
              <article className="rounded border p-3" key={s.checkedAt}>
                <time>{time(s.checkedAt)}</time>
                <div className="flex flex-wrap gap-2">
                  {s.components.map((c) => (
                    <span key={c.id}>
                      {label(c.id)}: {badge(c.status)}
                    </span>
                  ))}
                </div>
              </article>
            ))
          )}
          {history?.nextCursor && history.samples.length < 1_000 && (
            <button onClick={() => setCursor(history.nextCursor)}>{t('more')}</button>
          )}
        </section>
      )}
      <footer className="space-y-2 rounded border p-4">
        <p>{t('readOnly')}</p>
        {hasPermission('admin:platform:manage') && (
          <p>
            <Link to="/review-queue" className="underline">
              {t('review')}
            </Link>
          </p>
        )}
        {hasPermission('admin:certificates:view') && (
          <Link to="/certificates" className="underline">
            {t('certificates')}
          </Link>
        )}
      </footer>
      {detail && (
        <DetailDialog
          component={detail}
          label={label(detail.id)}
          closeLabel={t('close')}
          onClose={() => setSelected(null)}
        >
          {ownerLink(detail.id)}
        </DetailDialog>
      )}
    </div>
  );
}
function Card({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded border p-4">
      <p>{label}</p>
      <div className="mt-3 font-bold">{children}</div>
    </div>
  );
}
function DetailDialog({
  component,
  label,
  closeLabel,
  onClose,
  children,
}: {
  component: HealthComponent;
  label: string;
  closeLabel: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        close.current();
      }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(
        ref.current?.querySelectorAll<HTMLElement>('button, a[href], [tabindex="0"]') ?? [],
      );
      if (!nodes.length) {
        event.preventDefault();
        ref.current?.focus();
        return;
      }
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === ref.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    const contain = (event: FocusEvent) => {
      if (event.target instanceof Node && !ref.current?.contains(event.target))
        ref.current?.focus();
    };
    document.addEventListener('keydown', handle);
    document.addEventListener('focusin', contain);
    return () => {
      document.removeEventListener('keydown', handle);
      document.removeEventListener('focusin', contain);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <button
        type="button"
        className="absolute inset-0"
        tabIndex={-1}
        aria-label={closeLabel}
        onClick={onClose}
      />
      <div
        ref={ref}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="health-component-title"
        className="relative max-h-[90vh] w-full max-w-2xl space-y-4 overflow-auto rounded bg-white p-5"
      >
        <header className="flex justify-between">
          <h2 id="health-component-title">{label}</h2>
          <button onClick={onClose} aria-label={closeLabel}>
            <X aria-hidden="true" />
          </button>
        </header>
        {children}
        <pre dir="ltr" className="overflow-auto text-xs">
          {JSON.stringify(component, null, 2)}
        </pre>
      </div>
    </div>
  );
}
