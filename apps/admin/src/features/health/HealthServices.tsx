import { Link, useSearchParams } from 'react-router-dom';
import type { HealthOverview } from './HealthOverviewContract';
import {
  groupNames,
  serviceGroup,
  sortServices,
  healthFreshness,
  type Freshness,
} from './healthPresentation';
import {
  HealthBadge,
  HealthPanel,
  HealthNotice,
  EvidenceBadge,
  HealthOwnerLink,
  HealthCopyButton,
  useHealthCopy,
} from './HealthControls';
export function HealthServices({
  overview,
  now,
  freshness,
}: {
  overview: HealthOverview;
  now: number;
  freshness: Freshness;
}) {
  const { c, label, time } = useHealthCopy(),
    [params, setParams] = useSearchParams();
  const value = (key: string) => params.get(key) ?? '';
  const update = (key: string, val: string) => {
    const next = new URLSearchParams(params);
    val ? next.set(key, val) : next.delete(key);
    next.delete('component');
    setParams(next, { replace: true });
  };
  const href = (id?: string) => {
    const next = new URLSearchParams(params);
    next.set('view', 'services');
    id ? next.set('component', id) : next.delete('component');
    return '/health-readiness?' + next;
  };
  const filtered = sortServices(overview.components).filter(
    (s) =>
      (!value('q') || `${label(s.id)} ${s.id}`.toLowerCase().includes(value('q').toLowerCase())) &&
      (!value('status') ||
        (value('status') === 'problem' ? s.status !== 'UP' : s.status === value('status'))) &&
      (!value('group') || serviceGroup(s.id) === value('group')) &&
      (!value('importance') || (value('importance') === 'optional' ? s.optional : !s.optional)) &&
      (!value('evidence') ||
        (value('evidence') === 'operational' ? s.operational : !s.operational)),
  );
  const selected = value('component'),
    service = overview.components.find((s) => s.id === selected);
  if (selected) {
    const index = filtered.findIndex((s) => s.id === selected);
    return (
      <>
        <div className="health-actions">
          <Link to={href()}>{c('العودة إلى الخدمات', 'Back to services')}</Link>
          {index > 0 && (
            <Link to={href(filtered[index - 1].id)}>{c('الخدمة السابقة', 'Previous service')}</Link>
          )}
          {index >= 0 && index + 1 < filtered.length && (
            <Link to={href(filtered[index + 1].id)}>{c('الخدمة التالية', 'Next service')}</Link>
          )}
        </div>
        <HealthPanel title={label(selected)}>
          {service ? (
            <>
              <div className="health-actions">
                <HealthBadge
                  status={service.status}
                  historical={
                    healthFreshness(service.checkedAt, now, freshness !== 'FRESH') !== 'FRESH'
                  }
                />
                <HealthBadge
                  status={healthFreshness(service.checkedAt, now, freshness !== 'FRESH')}
                />
                <EvidenceBadge operational={service.operational} kind={service.evidenceKind} />
              </div>
              <dl className="health-facts">
                <div>
                  <dt>{c('المعرّف', 'Identifier')}</dt>
                  <dd>
                    <code>{service.id}</code>
                  </dd>
                </div>
                <div>
                  <dt>{c('الأهمية في هذه البيئة', 'Importance in this environment')}</dt>
                  <dd>{service.optional ? c('اختيارية', 'Optional') : c('مطلوبة', 'Required')}</dd>
                </div>
                <div>
                  <dt>{c('وقت الفحص', 'Observation time')}</dt>
                  <dd>{time(service.checkedAt)}</dd>
                </div>
                <div>
                  <dt>{c('نوع الدليل / إصدار الفحص', 'Evidence / probe version')}</dt>
                  <dd>
                    <code>
                      {service.evidenceKind} / {service.probeVersion}
                    </code>
                  </dd>
                </div>
                <div>
                  <dt>{c('زمن فحص الخدمة', 'Service probe duration')}</dt>
                  <dd>
                    {service.latencyMs === undefined
                      ? c('غير مقاس', 'Not measured')
                      : `${service.latencyMs} ms`}
                  </dd>
                </div>
                <div>
                  <dt>{c('القدرة المعلنة', 'Reported capability')}</dt>
                  <dd>{service.capabilityStatus ?? '—'}</dd>
                </div>
              </dl>
              {!service.operational && (
                <HealthNotice>
                  {c(
                    'وجود الإعدادات أو استجابة الفحص لا يثبت اكتمال التشغيل. راجع نوع الدليل وقيود الفحص.',
                    'Configuration or a probe response does not establish complete operation. Review the evidence kind and probe limits.',
                  )}
                </HealthNotice>
              )}
              {service.error && (
                <p>
                  <code>{service.error}</code>
                </p>
              )}
              <div className="health-actions">
                <HealthOwnerLink id={service.id} />
                <Link
                  to={
                    '/health-readiness?view=reports&section=history&component=' +
                    encodeURIComponent(service.id)
                  }
                >
                  {c('مشاهدات هذه الخدمة', 'Observations for this service')}
                </Link>
                <HealthCopyButton
                  text={`${service.id}\n${service.status}\n${service.checkedAt}\n${service.evidenceKind}\n${healthFreshness(service.checkedAt, now, freshness !== 'FRESH')}`}
                />
              </div>
              <details>
                <summary>{c('التفاصيل التقنية المنقّحة', 'Sanitized technical details')}</summary>
                <pre dir="ltr">{JSON.stringify(service.details, null, 2)}</pre>
              </details>
            </>
          ) : (
            <HealthNotice>
              {overview.coverage.missingProbes.includes(selected)
                ? c(
                    'لا يوجد فحص موصول لهذه الخدمة. لا تتوفر حالة تشغيل يمكن تأكيدها.',
                    'No probe is connected to this service. Its operational state cannot be confirmed.',
                  )
                : c(
                    'الخدمة غير موجودة في اللقطة الحالية.',
                    'This service is absent from the current snapshot.',
                  )}
            </HealthNotice>
          )}
        </HealthPanel>
      </>
    );
  }
  return (
    <HealthPanel
      title={c('الخدمات والمكونات', 'Services and components')}
      actions={
        <span>
          {filtered.length} / {overview.components.length}
        </span>
      }
    >
      <div className="health-filters">
        <label>
          {c('البحث', 'Search')}
          <input
            value={value('q')}
            onChange={(e) => update('q', e.target.value)}
            placeholder={c('اسم الخدمة أو معرّفها', 'Service name or identifier')}
          />
        </label>
        <label>
          {c('الحالة', 'Status')}
          <select value={value('status')} onChange={(e) => update('status', e.target.value)}>
            <option value="">{c('كل الحالات', 'All statuses')}</option>
            {['UP', 'DEGRADED', 'DOWN', 'UNKNOWN', 'problem'].map((s) => (
              <option key={s} value={s}>
                {s === 'problem' ? c('تحتاج انتباهًا', 'Needs attention') : s}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c('المجموعة', 'Group')}
          <select value={value('group')} onChange={(e) => update('group', e.target.value)}>
            <option value="">{c('كل المجموعات', 'All groups')}</option>
            {Object.entries(groupNames).map(([k, n]) => (
              <option value={k} key={k}>
                {c(n[0], n[1])}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c('الأهمية', 'Importance')}
          <select
            value={value('importance')}
            onChange={(e) => update('importance', e.target.value)}
          >
            <option value="">{c('الكل', 'All')}</option>
            <option value="required">{c('مطلوبة', 'Required')}</option>
            <option value="optional">{c('اختيارية', 'Optional')}</option>
          </select>
        </label>
        <label>
          {c('الدليل', 'Evidence')}
          <select value={value('evidence')} onChange={(e) => update('evidence', e.target.value)}>
            <option value="">{c('الكل', 'All')}</option>
            <option value="operational">{c('تشغيلي', 'Operational')}</option>
            <option value="unverified">{c('غير مثبت', 'Unverified')}</option>
          </select>
        </label>
        <button type="button" onClick={() => setParams({ view: 'services' })}>
          {c('مسح الفلاتر', 'Clear filters')}
        </button>
      </div>
      {overview.coverage.missingCount > 0 && (
        <HealthNotice>
          <Link to="/health-readiness?view=reports&section=coverage">
            {c('فحوص مفقودة خارج القائمة', 'Missing probes outside this list')}:{' '}
            {overview.coverage.missingCount}
          </Link>
        </HealthNotice>
      )}
      <div className="health-service-grid">
        {filtered.map((s) => (
          <article className="health-service" key={s.id}>
            <header>
              <Link to={href(s.id)}>{label(s.id)}</Link>
              <HealthBadge
                status={s.status}
                historical={healthFreshness(s.checkedAt, now, freshness !== 'FRESH') !== 'FRESH'}
              />
            </header>
            <small>
              <code>{s.id}</code> ·{' '}
              {s.optional ? c('اختيارية', 'Optional') : c('مطلوبة', 'Required')}
            </small>
            <EvidenceBadge operational={s.operational} kind={s.evidenceKind} />
            <small>{time(s.checkedAt)}</small>
            <div className="health-actions">
              <HealthBadge status={healthFreshness(s.checkedAt, now, freshness !== 'FRESH')} />
              <Link className="health-button" to={href(s.id)}>
                {c('عرض التفاصيل', 'View details')}
              </Link>
            </div>
          </article>
        ))}
      </div>
      {!filtered.length && (
        <HealthNotice>
          {c('لا توجد خدمات تطابق الفلاتر الحالية.', 'No services match the current filters.')}
        </HealthNotice>
      )}
    </HealthPanel>
  );
}
