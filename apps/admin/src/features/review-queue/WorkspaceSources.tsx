import { useEffect, useState } from 'react';
import { Activity, RefreshCw, ShieldCheck, Clock3 } from 'lucide-react';
import type { ReviewOwner, ReviewSourceStatus, ReviewSlaPolicy } from '@manaratak/shared';
import { workRequest } from './WorkspaceData';
import { displayDate, labelFor, textFor, workspaceError } from './WorkspaceText';
export function WorkspaceSources({
  language,
  sources,
  synchronize,
  busy,
  canCoordinate,
  canApprove,
}: {
  language: string;
  sources: ReviewSourceStatus[];
  synchronize: (domain?: ReviewOwner) => Promise<void>;
  busy: boolean;
  canCoordinate: boolean;
  canApprove: (domain: ReviewOwner) => boolean;
}) {
  const tr = textFor(language),
    label = labelFor(language),
    [policies, setPolicies] = useState<ReviewSlaPolicy[]>([]),
    [domain, setDomain] = useState<ReviewOwner>('scholarships'),
    [hours, setHours] = useState(''),
    [warning, setWarning] = useState(''),
    [reason, setReason] = useState(''),
    [saving, setSaving] = useState(false),
    [policyState, setPolicyState] = useState('loading'),
    [policyReload, setPolicyReload] = useState(0),
    [message, setMessage] = useState('');
  const allowedSources = sources.filter((source) => source.state !== 'forbidden');
  const policySources = allowedSources.filter((source) => canApprove(source.domain));
  const selectedDomain = policySources.some((source) => source.domain === domain)
    ? domain
    : policySources[0]?.domain;
  useEffect(() => {
    const abort = new AbortController();
    setPolicyState('loading');
    void workRequest<ReviewSlaPolicy[]>('/policies', undefined, abort.signal)
      .then((value) => {
        if (!abort.signal.aborted) {
          setPolicies(value);
          setPolicyState('ready');
        }
      })
      .catch((error) => {
        if (!abort.signal.aborted) {
          setPolicies([]);
          setPolicyState(workspaceError(error));
        }
      });
    return () => abort.abort();
  }, [policyReload]);
  const submit = async () => {
    if (saving || policyState !== 'ready' || !selectedDomain) return;
    setSaving(true);
    setMessage('');
    try {
      const policy = await workRequest<ReviewSlaPolicy>('/policies', {
        domain: selectedDomain,
        version: policies.find((p) => p.domain === selectedDomain)?.version ?? 0,
        hours: Number(hours),
        warningHours: Number(warning),
        reason,
      });
      setPolicies((prior) => [...prior.filter((p) => p.domain !== policy.domain), policy]);
      setMessage(
        tr(
          'اعتمدت السياسة للدورات الجديدة فقط. المهل القديمة محفوظة.',
          'Policy approved for new review cycles. Existing deadlines are preserved.',
        ),
      );
    } catch (error) {
      setMessage(label(workspaceError(error)));
    } finally {
      setSaving(false);
    }
  };
  return (
    <div className="rw-tab-content">
      <section className="rw-panel">
        <h2>
          <Activity aria-hidden="true" />
          {tr('حالة مصادر المراجعة', 'Review source health')}
        </h2>
        <p>
          {tr(
            'الأعداد تخص قضايا فريدة مرصودة لكل قسم. المصدر غير المتاح لا يُحسب صفرًا.',
            'Counts represent unique observed cases per section. Unavailable sources are never counted as zero.',
          )}
        </p>
        <div className="rw-source-list">
          {sources.map((source) => (
            <article key={source.domain}>
              <div>
                <h3>{label(source.domain)}</h3>
                <span className={'rw-badge rw-source-' + source.state}>
                  {label(source.state === 'ready' ? 'ready_source' : source.state)}
                </span>
              </div>
              <dl>
                <div>
                  <dt>{tr('آخر مزامنة ناجحة', 'Last successful sync')}</dt>
                  <dd>{displayDate(source.synchronizedAt, language)}</dd>
                </div>
                <div>
                  <dt>{tr('قضايا مرصودة', 'Observed cases')}</dt>
                  <dd>
                    {source.observed === null
                      ? '—'
                      : new Intl.NumberFormat(language).format(source.observed)}
                  </dd>
                </div>
              </dl>
              {source.state === 'unavailable' ? (
                <p>
                  {tr(
                    'تعذرت قراءة القسم. أعد المحاولة أو راجع الاتصال وصلاحيات الخدمة.',
                    'Could not read this owner. Retry or check connectivity and service permissions.',
                  )}
                </p>
              ) : null}
              {source.state !== 'forbidden' && canCoordinate ? (
                <button disabled={busy} onClick={() => void synchronize(source.domain)}>
                  <RefreshCw aria-hidden="true" />
                  {tr('إعادة قراءة', 'Read again')}
                </button>
              ) : null}
            </article>
          ))}
        </div>
      </section>
      <section className="rw-panel">
        <h2>
          <ShieldCheck aria-hidden="true" />
          {tr('مجالات بلا عقد مراجعة موحد', 'Domains without a unified review contract')}
        </h2>
        <p>
          {tr(
            'الشهادات · أدوات الطلاب · المالية · طلبات الطلاب · ترجمات CMS · حوكمة الذكاء الاصطناعي. تبقى في أقسامها الأصلية؛ لا تُعرض أعدادها كصفر.',
            'Certificates · student tools · finance · student applications · CMS translations · AI governance remain in their owner workspaces; their review counts are not zero.',
          )}
        </p>
      </section>
      <section className="rw-panel">
        <h2>
          <Clock3 aria-hidden="true" />
          {tr('سياسات مهل المراجعة', 'Review deadline policies')}
        </h2>
        <p>
          {tr(
            'لا توجد مهلة تلقائية. يعتمد المسؤول سياسة صريحة بالساعات المتصلة على مدار الساعة، بتوقيت UTC. تطبق على المراجعات الجديدة فقط؛ لا تستخدم وقت تعديل المحتوى كتاريخ دخول للمراجعة.',
            'There are no default deadlines. An authorized owner approves explicit elapsed hours, 24/7 in UTC, for new review cycles only. Content modification time is never treated as review entry time.',
          )}
        </p>
        {policyState === 'loading' ? (
          <p role="status">{tr('جارٍ تحميل سياسات المهل…', 'Loading deadline policies…')}</p>
        ) : policyState !== 'ready' ? (
          <div role="alert">
            <p>
              {tr(
                'تعذرت قراءة السياسات الحالية. أعد المحاولة قبل اعتماد سياسة.',
                'Current policies could not be loaded. Retry before approving a policy.',
              )}
            </p>
            <button onClick={() => setPolicyReload((value) => value + 1)}>
              <RefreshCw aria-hidden="true" />
              {tr('إعادة تحميل السياسات', 'Retry policies')}
            </button>
          </div>
        ) : policies.length ? (
          <ul>
            {policies.map((policy) => (
              <li key={policy.domain}>
                {label(policy.domain)} — {policy.hours} {tr('ساعة', 'hours')} ·{' '}
                {tr('تحذير قبل', 'Warn before')} {policy.warningHours} · v{policy.version} ·{' '}
                {displayDate(policy.approvedAt, language)}
              </li>
            ))}
          </ul>
        ) : (
          <p>{tr('لم تُعتمد سياسة لهذا النطاق.', 'No policy has been approved in this scope.')}</p>
        )}
        {canCoordinate && selectedDomain ? (
          <form
            className="rw-policy-form"
            onSubmit={(event) => {
              event.preventDefault();
              void submit();
            }}
          >
            <label>
              <span>{tr('القسم', 'Section')}</span>
              <select
                value={selectedDomain}
                onChange={(event) => setDomain(event.target.value as ReviewOwner)}
              >
                {policySources.map((source) => (
                  <option key={source.domain} value={source.domain}>
                    {label(source.domain)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>{tr('المهلة بالساعات', 'Deadline in hours')}</span>
              <input
                type="number"
                min="1"
                max="8760"
                value={hours}
                required
                onChange={(event) => setHours(event.target.value)}
              />
            </label>
            <label>
              <span>{tr('التنبيه قبل — ساعة', 'Warning before — hours')}</span>
              <input
                type="number"
                min="0"
                max={Number(hours) - 1}
                value={warning}
                required
                onChange={(event) => setWarning(event.target.value)}
              />
            </label>
            <label className="rw-wide">
              <span>{tr('سبب اعتماد السياسة', 'Policy approval reason')}</span>
              <input
                minLength={10}
                maxLength={500}
                required
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <button
              className="rw-primary"
              type="submit"
              disabled={saving || policyState !== 'ready'}
            >
              {tr('اعتماد السياسة للمراجعات الجديدة', 'Approve policy for new reviews')}
            </button>
          </form>
        ) : null}
        <p role="status">{message}</p>
      </section>
    </div>
  );
}
