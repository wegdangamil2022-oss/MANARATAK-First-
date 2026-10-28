import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ChartNoAxesCombined,
  Download,
  FileJson,
  Files,
  History as HistoryIcon,
  ListChecks,
  Network,
} from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import type { HealthOverview } from './HealthOverviewContract';
import { parseHistory, type History } from './HealthHistoryContract';
import { healthExport, mergeHealthHistory, type Freshness } from './healthPresentation';
import { isHealthAccessError } from './useHealthSnapshot';
import {
  HealthBadge,
  HealthCopyButton,
  HealthNotice,
  HealthPanel,
  healthHref,
  useHealthCopy,
} from './HealthControls';
export function healthBrief(
  s: HealthOverview,
  freshness: Freshness,
  ar: boolean,
  now = Date.now(),
) {
  const exportedAt = new Date(now).toISOString();
  return (
    (ar
      ? `وقت إعداد التقرير: ${exportedAt}\nوقت تقرير التهيئة: ${s.productionReadiness.checkedAt}\n`
      : `Report prepared at: ${exportedAt}\nConfiguration report time: ${s.productionReadiness.checkedAt}\n`) +
    (ar
      ? `تقرير صحة منارتك\nوقت اللقطة: ${s.checkedAt}\nحداثة الدليل: ${freshness}\nالبيئة: ${s.runtimeMode}\nحالة التشغيل المسجلة: ${s.runtimeStatus}\nاجتياز بوابة التشخيص في اللقطة: ${s.releaseReady}\nموانع التهيئة: ${s.productionReadiness.blockerCount}\nتحذيرات التهيئة: ${s.productionReadiness.warningCount}\nفحوص مفقودة: ${s.coverage.missingCount}\n${freshness !== 'FRESH' ? 'لا يمكن تأكيد الوضع الحالي من هذه البيانات.\n' : ''}تشخيص عند الطلب؛ أثر المستخدم والتوفر المستمر غير مقاسين.`
      : `MANARATAK health report\nSnapshot: ${s.checkedAt}\nEvidence freshness: ${freshness}\nEnvironment: ${s.runtimeMode}\nRecorded runtime: ${s.runtimeStatus}\nDiagnostic gate passed in snapshot: ${s.releaseReady}\nConfiguration blockers: ${s.productionReadiness.blockerCount}\nConfiguration warnings: ${s.productionReadiness.warningCount}\nMissing probes: ${s.coverage.missingCount}\n${freshness !== 'FRESH' ? 'Current health cannot be confirmed from these observations.\n' : ''}On-demand diagnostics; user impact and continuous availability are not measured.`)
  );
}
export function HealthDownloads({
  overview,
  freshness,
  now,
}: {
  overview: HealthOverview;
  freshness: Freshness;
  now: number;
}) {
  const { c, ar } = useHealthCopy(),
    [result, setResult] = useState<'success' | 'error' | null>(null);
  function download(json: boolean) {
    try {
      const content = json
        ? JSON.stringify(healthExport(overview, freshness, now), null, 2)
        : healthBrief(overview, freshness, ar, now);
      const url = URL.createObjectURL(
        new Blob([content], {
          type: json ? 'application/json;charset=utf-8' : 'text/plain;charset=utf-8',
        }),
      );
      const a = document.createElement('a');
      a.href = url;
      a.download = `manaratak-health-${overview.checkedAt.replace(/[:.]/g, '-')}.${json ? 'json' : 'txt'}`;
      a.click();
      globalThis.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setResult('success');
    } catch {
      setResult('error');
    }
  }
  return (
    <div className="health-actions">
      <HealthCopyButton
        text={healthBrief(overview, freshness, ar, now)}
        label={c('نسخ الملخص', 'Copy summary')}
      />
      <button className="health-primary" type="button" onClick={() => download(false)}>
        <Download aria-hidden="true" />
        {c('تنزيل التقرير', 'Download report')}
      </button>
      <button type="button" onClick={() => download(true)}>
        <FileJson aria-hidden="true" />
        {c('تنزيل JSON', 'Download JSON')}
      </button>
      <small role="status">
        {result === 'success'
          ? c('تم تجهيز التقرير', 'Report prepared')
          : result === 'error'
            ? c('تعذر تنزيل التقرير؛ حاول مجددًا.', 'Download failed; try again.')
            : ''}
      </small>
    </div>
  );
}
function HealthHistory({ revoke, knownServices }: { revoke: () => void; knownServices: string[] }) {
  const { c, t, label, time } = useHealthCopy(),
    [params, setParams] = useSearchParams();
  const window = ['1h', '24h', '7d'].includes(params.get('window') ?? '')
    ? params.get('window')!
    : '1h';
  const [history, setHistory] = useState<History | null>(null),
    [cursor, setCursor] = useState<string | null>(null),
    [revision, setRevision] = useState(0);
  const [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [reset, setReset] = useState(false),
    [status, setStatus] = useState('');
  const service = knownServices.includes(params.get('component') ?? '')
    ? params.get('component')!
    : '';
  const generation = useRef(0),
    previousWindow = useRef(window);
  const schemaMessage = t('schema'),
    errorMessage = t('error');
  useEffect(() => {
    if (previousWindow.current !== window) {
      previousWindow.current = window;
      setHistory(null);
      setCursor(null);
      setReset(false);
      if (cursor) return;
    }
    const current = ++generation.current,
      controller = new AbortController();
    setLoading(true);
    setError('');
    void adminApiClient
      .request<unknown>(
        `/admin/monitoring/history?window=${window}${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`,
        { signal: controller.signal, cache: 'no-store' },
      )
      .then((raw) => {
        const next = parseHistory(raw, window);
        if (current !== generation.current || controller.signal.aborted) return;
        setHistory((previous) => {
          const merged = mergeHealthHistory(previous, next, Boolean(cursor));
          setReset(merged.reset);
          return merged.history;
        });
      })
      .catch((cause) => {
        if (current !== generation.current || controller.signal.aborted) return;
        if (isHealthAccessError(cause)) {
          setHistory(null);
          revoke();
        } else
          setError(
            cause instanceof Error && cause.message === 'SCHEMA_MISMATCH'
              ? schemaMessage
              : errorMessage,
          );
      })
      .finally(() => {
        if (current === generation.current && !controller.signal.aborted) setLoading(false);
      });
    return () => {
      controller.abort();
    };
  }, [window, cursor, revision, revoke, schemaMessage, errorMessage]);
  const reload = () => {
    setCursor(null);
    setRevision((x) => x + 1);
    setReset(false);
  };
  const ids = [...new Set(history?.samples.flatMap((s) => s.components.map((x) => x.id)) ?? [])];
  const rows =
    history?.samples.flatMap((s) =>
      s.components
        .filter((x) => (!service || x.id === service) && (!status || x.status === status))
        .map((x) => ({ ...x, checkedAt: s.checkedAt })),
    ) ?? [];
  return (
    <HealthPanel
      title={c('المشاهدات المسجلة', 'Recorded observations')}
      actions={
        <button type="button" disabled={loading} onClick={reload}>
          {c('تحديث السجل', 'Refresh observations')}
        </button>
      }
    >
      <HealthNotice>
        {t('historyScope')}{' '}
        {c(
          'تُسجل عينة عند طلب الملخص، وبفاصل لا يقل عن 30 ثانية. إعادة تشغيل العملية أو تغيير النسخة قد يغير السجل.',
          'A sample is recorded when overview is requested, at least 30 seconds apart. Process restart or replica changes may change this history.',
        )}
      </HealthNotice>
      <div className="health-filters">
        <label>
          {c('الفترة', 'Window')}
          <select
            value={window}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              next.set('window', e.target.value);
              setParams(next, { replace: true });
            }}
          >
            <option value="1h">{c('ساعة', '1 hour')}</option>
            <option value="24h">{c('24 ساعة', '24 hours')}</option>
            <option value="7d">{c('7 أيام', '7 days')}</option>
          </select>
        </label>
        <label>
          {c('الخدمة', 'Service')}
          <select
            value={service}
            onChange={(e) => {
              const next = new URLSearchParams(params);
              e.target.value ? next.set('component', e.target.value) : next.delete('component');
              setParams(next, { replace: true });
            }}
          >
            <option value="">{c('الكل', 'All')}</option>
            {service && !ids.includes(service) && <option value={service}>{label(service)}</option>}
            {ids.map((id) => (
              <option key={id} value={id}>
                {label(id)}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c('الحالة المسجلة', 'Recorded status')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{c('الكل', 'All')}</option>
            {['UP', 'DOWN', 'DEGRADED', 'UNKNOWN'].map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
      </div>
      {error && (
        <HealthNotice error>
          {error}{' '}
          {history &&
            c(
              'المعروض بيانات سابقة؛ تعذر تحديث السجل.',
              'Displayed history is from an earlier response; refresh failed.',
            )}
          <button disabled={loading} onClick={() => setRevision((x) => x + 1)}>
            {c('إعادة المحاولة', 'Retry')}
          </button>
        </HealthNotice>
      )}
      {loading && <p role="status">{c('تحميل المشاهدات…', 'Loading observations…')}</p>}
      {reset && (
        <HealthNotice>
          {c(
            'تغيرت جلسة المصدر أو تعذر إثبات تطابقها؛ استُبدلت المشاهدات ولم تُدمج.',
            'The source session changed or could not be matched; observations were replaced, not merged.',
          )}{' '}
          <button onClick={reload}>{c('جلب أحدث المشاهدات', 'Load latest observations')}</button>
        </HealthNotice>
      )}
      {history && (
        <>
          <p>
            {c(
              'عينات مسترجعة / متاحة في المصدر لهذه الفترة',
              'Retrieved samples / source total for this window',
            )}
            : {history.samples.length} / {history.total}
          </p>
          {history.startedAt && (
            <small>
              {c('بدء جلسة المصدر', 'Source session started')}: {time(history.startedAt)}
            </small>
          )}
          {!!history.samples.length && (
            <small>
              {c('المدى الفعلي للمشاهدات المسترجعة', 'Actual retrieved observation range')}:{' '}
              {time(history.samples[history.samples.length - 1].checkedAt)} —{' '}
              {time(history.samples[0].checkedAt)}
            </small>
          )}
          <div className="health-observations">
            {rows.map((row) => (
              <article key={`${row.checkedAt}:${row.id}`}>
                <time dateTime={row.checkedAt}>{time(row.checkedAt)}</time>
                <span>{label(row.id)}</span>
                <HealthBadge status={row.status} historical />
              </article>
            ))}
          </div>
          {!rows.length && (
            <p>
              {c(
                'لا توجد مشاهدات مسترجعة تطابق الاختيار. لا يعني ذلك عدم وجود مشكلات.',
                'No retrieved observations match this selection. This does not establish an absence of problems.',
              )}
            </p>
          )}
          {history.nextCursor && (
            <button
              type="button"
              disabled={loading || history.samples.length >= 1000 || reset}
              onClick={() => setCursor(history.nextCursor)}
            >
              {c('تحميل مشاهدات أقدم', 'Load older observations')}
            </button>
          )}
          {history.samples.length >= 1000 && (
            <p>
              {c(
                'بلغ العرض حد 1000 عينة؛ قلّل الفترة.',
                'The display reached 1,000 samples; narrow the window.',
              )}
            </p>
          )}
        </>
      )}
    </HealthPanel>
  );
}
function HealthCoverage({ overview: s }: { overview: HealthOverview }) {
  const { c, label } = useHealthCopy(),
    { hasPermission } = useAdminAuthorization(),
    ids = [...new Set([...s.coverage.expected, ...s.coverage.extraProbes])];
  return (
    <HealthPanel
      title={c('تغطية الفحوص', 'Probe coverage')}
      actions={
        hasPermission('admin:platform:manage') ? (
          <Link to="/cross-module-integrity">
            <Network aria-hidden="true" />
            {c('سلامة الربط بين الأقسام', 'Cross-module integrity')}
          </Link>
        ) : undefined
      }
    >
      <p>
        {c('الفحوص المطابقة / المتوقعة', 'Matched / expected probes')}: {s.coverage.matchedCount} /{' '}
        {s.coverage.expectedCount} · {c('دليل تشغيلي مثبت', 'Operationally evidenced')}:{' '}
        {s.coverage.operationalCount} · {c('فحوص إضافية', 'Extra probes')}: {s.coverage.extraCount}
      </p>
      <HealthNotice>
        {c(
          'تغطية الاختبارات غير موثقة من هذا المصدر؛ اكتمال أسماء الفحوص لا يثبت نجاح كل الرحلات أو نسبة تغطية الاختبارات.',
          'Test coverage is not attested by this source. Probe-name completeness does not establish journey success or test coverage.',
        )}
      </HealthNotice>
      <div className="health-actions">
        <Link
          className="health-button"
          to={healthHref('services', { importance: 'required', evidence: 'unverified' })}
        >
          <ListChecks aria-hidden="true" />
          {c('الخدمات المطلوبة غير المثبتة', 'Unverified required services')}
        </Link>
        <Link className="health-button" to={healthHref('issues', { source: 'coverage' })}>
          <ChartNoAxesCombined aria-hidden="true" />
          {c('مشكلات تغطية الفحوص', 'Probe coverage findings')}
        </Link>
      </div>
      <div className="health-coverage">
        {ids.map((id) => {
          const missing = s.coverage.missingProbes.includes(id),
            unverified = s.coverage.requiredUnverified.includes(id);
          return (
            <article key={id}>
              <div>
                <strong>{label(id)}</strong>
                <small>
                  <code>{id}</code>
                </small>
              </div>
              <span>
                {missing
                  ? c('فحص غير موصول', 'No probe connected')
                  : unverified
                    ? c('دليل مطلوب غير مثبت', 'Required evidence unverified')
                    : s.coverage.extraProbes.includes(id)
                      ? c('فحص إضافي', 'Extra probe')
                      : c('فحص موصول', 'Probe connected')}
              </span>
              <Link className="health-button" to={healthHref('services', { component: id })}>
                {c('فحص الدليل', 'Inspect evidence')}
              </Link>
            </article>
          );
        })}
      </div>
    </HealthPanel>
  );
}
export function HealthReports({
  overview,
  freshness,
  now,
  revoke,
  legacy,
}: {
  overview: HealthOverview;
  freshness: Freshness;
  now: number;
  revoke: () => void;
  legacy?: string;
}) {
  const { c } = useHealthCopy(),
    [params] = useSearchParams(),
    requestedSection = params.get('section') ?? legacy ?? 'history',
    section = ['history', 'coverage', 'report'].includes(requestedSection)
      ? requestedSection
      : 'history';
  return (
    <>
      <nav
        className="health-secondary admin-section-navigation"
        aria-label={c('المراقبة والتقارير', 'Monitoring and reports')}
      >
        {(
          [
            ['history', c('المشاهدات', 'Observations'), HistoryIcon],
            ['coverage', c('التغطية', 'Coverage'), ListChecks],
            ['report', c('التقارير', 'Reports'), Files],
          ] as const
        ).map(([id, title, Icon]) => (
          <Link
            key={id}
            aria-current={section === id ? 'page' : undefined}
            to={healthHref('reports', {
              section: id,
              component: params.get('component') ?? undefined,
              window: params.get('window') ?? undefined,
            })}
          >
            <Icon aria-hidden="true" />
            {title}
          </Link>
        ))}
      </nav>
      {section === 'coverage' ? (
        <HealthCoverage overview={overview} />
      ) : section === 'report' ? (
        <>
          <HealthPanel title={c('تقرير تشخيصي قابل للمشاركة', 'Shareable diagnostic report')}>
            <p>
              {c(
                'يتضمن التقرير وقت الدليل وحداثته وقيود القياس، ويستخدم الحقول المعروفة من الاستجابة المنقّحة.',
                'Reports include observation time, freshness and measurement limits, using known fields from the sanitized response.',
              )}
            </p>
            <HealthDownloads overview={overview} freshness={freshness} now={now} />
            <pre>{healthBrief(overview, freshness, c('ar', 'en') === 'ar', now)}</pre>
            <details>
              <summary>{c('الاستجابة التقنية المنقّحة', 'Sanitized technical response')}</summary>
              <pre dir="ltr">{JSON.stringify(healthExport(overview, freshness, now), null, 2)}</pre>
            </details>
          </HealthPanel>
          <HealthNotice>
            {c(
              'مؤشرات التوفر وSLO ومعدلات الطلب والأخطاء وسجل الحوادث الدائم غير موصولة بمصدر قياس. لم تُعرض لها أرقام أو أزرار تشغيل.',
              'Availability, SLOs, traffic/error rates and persistent incident history have no connected measurement source. No values or operational controls are presented for them.',
            )}
          </HealthNotice>
        </>
      ) : (
        <HealthHistory revoke={revoke} knownServices={overview.components.map((s) => s.id)} />
      )}
    </>
  );
}
