import { useSearchParams, Link } from 'react-router-dom';
import type { HealthOverview } from './HealthOverviewContract';
import {
  healthFreshness,
  healthIssues,
  healthOwners,
  type HealthIssue,
  type Freshness,
} from './healthPresentation';
import {
  HealthBadge,
  HealthCopyButton,
  HealthOwnerLink,
  HealthPanel,
  HealthNotice,
  useHealthCopy,
  healthHref,
} from './HealthControls';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
export function issueTitle(
  issue: HealthIssue,
  label: (id: string) => string,
  c: (ar: string, en: string) => string,
) {
  const name = label(issue.componentId ?? issue.id);
  return (
    issue.message ??
    (issue.kind === 'missing'
      ? c('فحص غير موصول: ', 'Missing probe: ')
      : issue.kind === 'unverified'
        ? c('دليل مطلوب غير مثبت: ', 'Required evidence unverified: ')
        : c('نتيجة فحص تحتاج انتباهًا: ', 'Probe needs attention: ')) + name
  );
}
export function IssueCard({
  issue,
  overview,
  now,
  freshness,
  selected = false,
  detailHref,
}: {
  issue: HealthIssue;
  overview: HealthOverview;
  now: number;
  freshness: Freshness;
  selected?: boolean;
  detailHref?: string;
}) {
  const { c, label, time } = useHealthCopy();
  const component = overview.components.find((i) => i.id === issue.componentId);
  const title = issueTitle(issue, label, c);
  const advice =
    (issue.source === 'production' ? issue.recommendation : undefined) ??
    (issue.kind === 'missing'
      ? c(
          'راجع تسجيل الفحص عند مالك الخدمة. غياب الفحص لا يثبت توقف الخدمة.',
          'Review probe registration with its owner. A missing probe does not prove an outage.',
        )
      : c(
          'راجع نوع الدليل ووقت الفحص وشروط الخدمة عند المالك؛ لا تنفذ هذه الشاشة إصلاحات.',
          'Review evidence type, probe time and service conditions with the owner. This screen performs no repairs.',
        ));
  const age = healthFreshness(issue.checkedAt, now, freshness !== 'FRESH');
  return (
    <article className={'health-issue' + (selected ? ' health-selected' : '')}>
      <header>
        <h3>{title}</h3>
        <div className="health-actions">
          <HealthBadge status={issue.severity} />
          <HealthBadge status={age} />
        </div>
      </header>
      <small>
        {c('المصدر', 'Source')}:{' '}
        {issue.source === 'production'
          ? c('تهيئة الإطلاق', 'Release configuration')
          : issue.source === 'coverage'
            ? c('تغطية المراقبة', 'Monitoring coverage')
            : c('فحص مكوّن', 'Component probe')}{' '}
        · <code>{issue.id}</code>
      </small>
      {component && (
        <p>
          {label(component.id)}:{' '}
          <HealthBadge status={component.status} historical={age !== 'FRESH'} />
        </p>
      )}
      <p>{advice}</p>
      {issue.source === 'component' && issue.recommendation && <code>{issue.recommendation}</code>}
      <small>{time(issue.checkedAt)}</small>
      <div className="health-actions">
        {issue.componentId && (
          <Link
            className="health-link"
            to={healthHref('services', { component: issue.componentId })}
          >
            {c('فتح الخدمة والدليل', 'Open service and evidence')}
          </Link>
        )}
        {!selected && (
          <Link
            className="health-link"
            to={detailHref ?? healthHref('issues', { issue: issue.key })}
          >
            {c('تفاصيل المشكلة', 'Issue details')}
          </Link>
        )}
        <HealthOwnerLink id={issue.componentId} />
        {selected && (
          <HealthCopyButton
            text={`${title}\n${issue.source} / ${issue.id}\n${issue.checkedAt} / ${age}\n${advice}\n${c('تأثير المستخدم غير مقاس', 'User impact is not measured')}`}
            label={c('نسخ ملخص المشكلة', 'Copy issue summary')}
          />
        )}
      </div>
    </article>
  );
}
export function HealthIssues({
  overview,
  now,
  freshness,
  releaseOnly = false,
}: {
  overview: HealthOverview;
  now: number;
  freshness: Freshness;
  releaseOnly?: boolean;
}) {
  const { c, label } = useHealthCopy(),
    { hasPermission } = useAdminAuthorization(),
    [params, setParams] = useSearchParams();
  const severity = params.get('severity') ?? '',
    source = params.get('source') ?? '',
    search = params.get('q')?.trim().toLowerCase() ?? '',
    service = params.get('service') ?? '',
    owner = params.get('owner') ?? '',
    age = params.get('freshness') ?? '';
  // Filter state is presentation-only and cannot change server release policy.
  const selected = params.get('issue'),
    all = healthIssues(overview).filter(
      (i) =>
        !releaseOnly ||
        i.source !== 'component' ||
        overview.components.some((s) => s.id === i.componentId && !s.optional),
    );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.delete('issue');
    value ? next.set(key, value) : next.delete(key);
    setParams(next, { replace: true });
  };
  const filtered = all.filter(
    (i) =>
      (!source || i.source === source) &&
      (!search ||
        `${issueTitle(i, label, c)} ${i.id} ${i.recommendation ?? ''}`
          .toLowerCase()
          .includes(search)) &&
      (!severity || i.severity === severity) &&
      (!service || i.componentId === service) &&
      (!age || healthFreshness(i.checkedAt, now, freshness !== 'FRESH') === age) &&
      (!owner ||
        Boolean(
          i.componentId &&
          healthOwners[i.componentId] &&
          hasPermission(healthOwners[i.componentId].permission),
        ) ===
          (owner === 'linked')),
  );
  const detail = selected ? all.find((i) => i.key === selected) : undefined;
  const findingHref = (key?: string) => {
    const next = new URLSearchParams(params);
    next.set('view', releaseOnly ? 'release' : 'issues');
    key ? next.set('issue', key) : next.delete('issue');
    return '/health-readiness?' + next.toString();
  };
  return (
    <HealthPanel
      title={
        releaseOnly
          ? c('أدلة ومعوقات الإطلاق', 'Release evidence and findings')
          : c('المشكلات المكتشفة في اللقطة', 'Findings in this snapshot')
      }
    >
      {!releaseOnly && (
        <p>
          {c(
            'قائمة تشخيص للقراءة فقط، وليست سجل حوادث أو تنبيهات مرسلة.',
            'Read-only diagnostic findings, not incidents or delivered alerts.',
          )}
        </p>
      )}
      {selected && (
        <>
          <Link className="health-link" to={findingHref()}>
            {c('العودة للقائمة', 'Back to findings')}
          </Link>
          {detail ? (
            <IssueCard
              issue={detail}
              overview={overview}
              now={now}
              freshness={freshness}
              selected
            />
          ) : (
            <HealthNotice>
              {c(
                'مرجع المشكلة غير موجود في اللقطة الحالية.',
                'This finding reference is absent from the current snapshot.',
              )}
            </HealthNotice>
          )}
        </>
      )}
      {!selected && (
        <>
          <div className="health-filters">
            <label>
              {c('البحث في المشكلات', 'Search findings')}
              <input
                value={params.get('q') ?? ''}
                onChange={(e) => update('q', e.target.value)}
                placeholder={c('وصف المشكلة أو مرجعها', 'Finding description or reference')}
              />
            </label>
            <label>
              {c('مصدر المشكلة', 'Finding source')}
              <select value={source} onChange={(e) => update('source', e.target.value)}>
                <option value="">{c('كل المصادر', 'All sources')}</option>
                <option value="production">{c('تهيئة الإطلاق', 'Release configuration')}</option>
                <option value="component">{c('فحوص المكونات', 'Component probes')}</option>
                <option value="coverage">{c('تغطية المراقبة', 'Monitoring coverage')}</option>
              </select>
            </label>
            <label>
              {c('الشدة', 'Severity')}
              <select value={severity} onChange={(e) => update('severity', e.target.value)}>
                <option value="">{c('الكل', 'All')}</option>
                {['BLOCKER', 'WARNING', 'INFO'].map((v, n) => (
                  <option key={v} value={v}>
                    {[c('مانع', 'Blocker'), c('تحذير', 'Warning'), c('معلومة', 'Information')][n]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {c('الخدمة', 'Service')}
              <select value={service} onChange={(e) => update('service', e.target.value)}>
                <option value="">{c('كل الخدمات', 'All services')}</option>
                {[...new Set(all.flatMap((i) => (i.componentId ? [i.componentId] : [])))].map(
                  (id) => (
                    <option key={id} value={id}>
                      {label(id)}
                    </option>
                  ),
                )}
              </select>
            </label>
            <label>
              {c('مسار المعالجة', 'Remediation route')}
              <select value={owner} onChange={(e) => update('owner', e.target.value)}>
                <option value="">{c('الكل', 'All')}</option>
                <option value="linked">{c('متاح بصلاحياتي', 'Available to me')}</option>
                <option value="unlinked">{c('غير متاح', 'Unavailable')}</option>
              </select>
            </label>
            <label>
              {c('حداثة الدليل', 'Evidence age')}
              <select value={age} onChange={(e) => update('freshness', e.target.value)}>
                <option value="">{c('الكل', 'All')}</option>
                <option value="FRESH">{c('حديث', 'Fresh')}</option>
                <option value="STALE">{c('قديم', 'Stale')}</option>
                <option value="UNAVAILABLE">{c('زمن غير صالح', 'Invalid timestamp')}</option>
              </select>
            </label>
          </div>
          <div className="health-toolbar">
            <p>
              {c('نتائج ضمن اللقطة', 'Results in snapshot')}: {filtered.length} / {all.length}
            </p>
            <button onClick={() => setParams({ view: releaseOnly ? 'release' : 'issues' })}>
              {c('مسح الفلاتر', 'Clear filters')}
            </button>
          </div>
          {filtered.map((i) => (
            <IssueCard
              key={i.key}
              issue={i}
              overview={overview}
              now={now}
              freshness={freshness}
              detailHref={findingHref(i.key)}
            />
          ))}
          {!filtered.length && (
            <p className="health-empty">
              {freshness !== 'FRESH'
                ? c(
                    'لا يمكن تأكيد الوضع الحالي من هذه اللقطة.',
                    'Current state cannot be confirmed from this snapshot.',
                  )
                : all.length
                  ? c('لا توجد نتائج لهذه الفلاتر.', 'No results for these filters.')
                  : c('لا توجد ملاحظات في هذه اللقطة.', 'No findings in this snapshot.')}
            </p>
          )}
        </>
      )}
    </HealthPanel>
  );
}
