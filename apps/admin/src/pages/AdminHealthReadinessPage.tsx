import { Link, useSearchParams } from 'react-router-dom';
import { Activity, RefreshCw } from 'lucide-react';
import { useHealthSnapshot } from '../features/health/useHealthSnapshot';
import { healthView } from '../features/health/healthPresentation';
import {
  FreshnessNote,
  HealthBadge,
  HealthNotice,
  HealthCopyButton,
  useHealthCopy,
  healthHref,
} from '../features/health/HealthControls';
import { HealthSummary, HealthRelease } from '../features/health/HealthSummary';
import { HealthServices } from '../features/health/HealthServices';
import { HealthIssues } from '../features/health/HealthIssues';
import { HealthReports, healthBrief } from '../features/health/HealthReports';
import '../features/health/health-workspace.css';
export function AdminHealthReadinessPage() {
  const { c, t, dir, time, ar } = useHealthCopy(),
    state = useHealthSnapshot(),
    [params] = useSearchParams();
  const view = healthView(params.get('view')),
    legacy = params.get('view')?.toLowerCase();
  const tabs = [
    ['overview', c('الملخص', 'Overview')],
    ['services', c('الخدمات والمكونات', 'Services')],
    ['issues', c('المشكلات الحالية', 'Current issues')],
    ['release', c('جاهزية الإطلاق', 'Release readiness')],
    ['reports', c('المراقبة والتقارير', 'Monitoring and reports')],
  ] as const;
  const props = state.overview
    ? { overview: state.overview, freshness: state.freshness, now: state.now }
    : null;
  return (
    <div className="reference-workspace health-workspace" dir={dir}>
      <header className="reference-hero">
        <div>
          <span>
            <Activity aria-hidden="true" />
            {c('تشغيل المنصة', 'Platform operations')}
          </span>
          <h1>{c('مركز صحة المنصة', 'Platform health center')}</h1>
          <p>
            {c(
              'افهم الحالة، راجع الدليل، وانتقل إلى المعالجة.',
              'Understand status, inspect evidence and find the remediation route.',
            )}
          </p>
        </div>
        <div className="health-actions">
          <button type="button" disabled={state.loading} onClick={() => void state.refresh()}>
            <RefreshCw aria-hidden="true" className={state.loading ? 'health-spinning' : ''} />
            {t('refresh')}
          </button>
          {props && (
            <HealthCopyButton
              text={healthBrief(props.overview, props.freshness, ar, props.now)}
              label={c('نسخ الملخص', 'Copy summary')}
            />
          )}
        </div>
      </header>
      <nav className="health-navigation" aria-label={c('أقسام صحة المنصة', 'Health workspaces')}>
        {tabs.map(([id, title]) => (
          <Link key={id} to={healthHref(id)} aria-current={view === id ? 'page' : undefined}>
            {title}
          </Link>
        ))}
      </nav>
      {state.error && (
        <HealthNotice error>
          {state.error === 'forbidden' ? (
            <>
              {t('error')}{' '}
              {c(
                'الوصول للتشخيص غير متاح؛ تحقق من الجلسة والصلاحية ثم أعد المحاولة.',
                'Diagnostic access is unavailable; check your session and permission, then retry.',
              )}
            </>
          ) : (
            t(state.error)
          )}{' '}
          {state.overview && t('stale')}
        </HealthNotice>
      )}
      {state.loading && (
        <p role="status">{c('جلب لقطة التشخيص…', 'Loading diagnostic snapshot…')}</p>
      )}
      {props && (
        <>
          <div className="health-snapshot-bar">
            <span>
              {c('البيئة', 'Environment')}: <strong>{props.overview.runtimeMode}</strong>
            </span>
            <span>
              {c('وقت اللقطة', 'Snapshot time')}:{' '}
              <time dateTime={props.overview.checkedAt}>{time(props.overview.checkedAt)}</time>
            </span>
            <HealthBadge status={props.freshness} />
            <small>
              {c('مصدر القرار', 'Decision source')}: <code>{props.overview.decisionScope}</code>
            </small>
          </div>
          <FreshnessNote freshness={props.freshness} />
          {view === 'overview' ? (
            <HealthSummary {...props} />
          ) : view === 'services' ? (
            <HealthServices {...props} />
          ) : view === 'issues' ? (
            <HealthIssues {...props} />
          ) : view === 'release' ? (
            <HealthRelease {...props} />
          ) : (
            <HealthReports
              {...props}
              revoke={state.revoke}
              legacy={['coverage', 'history', 'report'].includes(legacy ?? '') ? legacy : undefined}
            />
          )}
        </>
      )}
      <footer className="health-footer">
        {c(
          'للقراءة فقط · فحوص عند الطلب · لا تنفذ الشاشة إصلاحًا أو نشرًا أو تغيير إعدادات.',
          'Read only · On-demand diagnostics · This workspace performs no repair, deployment or configuration changes.',
        )}
      </footer>
    </div>
  );
}
