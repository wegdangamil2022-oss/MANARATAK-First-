import { Link } from 'react-router-dom';
import { ArrowUpLeft } from 'lucide-react';
import type { HealthOverview } from './HealthOverviewContract';
import { healthIssues, type Freshness } from './healthPresentation';
import {
  HealthBadge,
  HealthNotice,
  HealthPanel,
  healthHref,
  useHealthCopy,
} from './HealthControls';
import { HealthIssues, IssueCard } from './HealthIssues';
type Props = { overview: HealthOverview; freshness: Freshness; now: number };
export function HealthSummary({ overview: s, freshness, now }: Props) {
  const { c } = useHealthCopy(),
    issues = healthIssues(s),
    required = s.components.filter((x) => !x.optional),
    optionalProblems = s.components.filter((x) => x.optional && x.status !== 'UP');
  const cards = [
    [
      c('خدمات مطلوبة بحالة متاحة', 'Required services reporting UP'),
      required.filter((x) => x.status === 'UP').length,
      healthHref('services', { importance: 'required', status: 'UP' }),
    ],
    [
      c('خدمات تحتاج انتباهًا', 'Services needing attention'),
      s.components.filter((x) => x.status !== 'UP').length,
      healthHref('services', { status: 'problem' }),
    ],
    [
      c('فجوات التغطية', 'Coverage gaps'),
      new Set([...s.coverage.missingProbes, ...s.coverage.requiredUnverified]).size,
      healthHref('reports', { section: 'coverage' }),
    ],
    [
      c('موانع التهيئة', 'Configuration blockers'),
      s.productionReadiness.blockerCount,
      healthHref('release'),
    ],
  ] as const;
  return (
    <>
      <div className="health-summary-grid">
        <HealthPanel title={c('حالة التشغيل', 'Runtime status')}>
          <div className="health-status-large">
            <HealthBadge status={s.runtimeStatus} historical={freshness !== 'FRESH'} />
          </div>
          <p>
            {freshness !== 'FRESH'
              ? c(
                  'نتيجة اللقطة السابقة؛ الوضع الحالي غير مؤكد.',
                  'Previous snapshot result; current state is unconfirmed.',
                )
              : s.runtimeStatus === 'UP' && optionalProblems.length
                ? c(
                    'اجتازت الخدمات المطلوبة الفحص؛ توجد مشاكل في خدمات اختيارية.',
                    'Required services passed; optional services have problems',
                  )
                : c(
                    'النتيجة المجمّعة كما يقررها الخادم، وفق الخدمات المطلوبة لهذه البيئة.',
                    'Server aggregate based on the services required in this environment.',
                  )}
          </p>
          <Link className="health-button" to={healthHref('services')}>
            <ArrowUpLeft aria-hidden="true" />
            {c('فحص الخدمات', 'Inspect services')}
          </Link>
        </HealthPanel>
        <HealthPanel title={c('جاهزية الإطلاق', 'Release readiness')}>
          <HealthBadge
            status={freshness !== 'FRESH' ? 'UNKNOWN' : s.releaseReady ? 'UP' : 'BLOCKER'}
          />
          <p>
            {freshness !== 'FRESH'
              ? c(
                  'لا يمكن تأكيد اجتياز البوابة من هذه اللقطة.',
                  'Gate passage cannot be confirmed from this snapshot.',
                )
              : s.releaseReady
                ? c('اجتازت اللقطة بوابة التشخيص', 'Diagnostic gate passed')
                : c('بوابة التشخيص غير مجتازة', 'Diagnostic gate blocked')}
          </p>
          <Link className="health-button" to={healthHref('release')}>
            <ArrowUpLeft aria-hidden="true" />
            {c('مراجعة شروط الجاهزية', 'Review readiness gates')}
          </Link>
        </HealthPanel>
      </div>
      <div className="health-metrics">
        {cards.map(([title, count, href]) => (
          <Link key={title} to={href}>
            <span>{title}</span>
            <strong>{count}</strong>
            <small>
              {freshness === 'FRESH'
                ? c('في اللقطة الحالية', 'In this snapshot')
                : c('في اللقطة السابقة', 'In the previous snapshot')}
            </small>
          </Link>
        ))}
      </div>
      <HealthPanel
        title={c('ما الذي يحتاج انتباهك؟', 'What needs attention?')}
        actions={
          <Link to={healthHref('issues')}>
            {c('كل المشكلات', 'All issues')} ({issues.length})
          </Link>
        }
      >
        {issues.slice(0, 5).map((issue) => (
          <IssueCard key={issue.key} issue={issue} overview={s} now={now} freshness={freshness} />
        ))}
        {!issues.length && (
          <HealthNotice>
            {freshness === 'FRESH'
              ? c(
                  'لم تُبلغ هذه اللقطة عن مشكلات ضمن الفحوص المتاحة.',
                  'This snapshot reports no issues within the available probes.',
                )
              : c(
                  'لا تحتوي اللقطة السابقة على مشكلات مسجلة؛ لا يثبت ذلك الوضع الحالي.',
                  'The previous snapshot contains no reported issues; this does not establish current health.',
                )}
          </HealthNotice>
        )}
      </HealthPanel>
      <HealthNotice>
        {c(
          'أثر المشكلات على المستخدمين غير مقاس. هذه فحوص تشخيصية عند الطلب، وليست مراقبة مستمرة أو ضمانًا لتوفر جميع الرحلات.',
          'User impact is not measured. These are on-demand diagnostics, not continuous monitoring or assurance that every user journey works.',
        )}
      </HealthNotice>
    </>
  );
}
export function HealthRelease({ overview: s, freshness, now }: Props) {
  const { c, time } = useHealthCopy();
  const gates = [
    [
      c('بيئة مؤهلة للإطلاق', 'Environment eligible'),
      s.releaseGate.environmentEligible,
      c('تحدد سياسة الخادم البيئة المؤهلة.', 'Eligibility is determined by server policy.'),
      healthHref('reports', { section: 'report' }),
      c('عرض سياق البيئة', 'Inspect environment context'),
      s.runtimeMode,
    ],
    [
      c('تهيئة الإنتاج', 'Production configuration'),
      s.releaseGate.configurationReady,
      c('إعدادات وأمان واعتماديات الإطلاق.', 'Configuration, security and launch dependencies.'),
      healthHref('issues', { source: 'production' }),
      c('عرض ملاحظات التهيئة', 'Inspect configuration findings'),
      `${s.productionReadiness.blockerCount} ${c('مانع', 'blockers')} · ${s.productionReadiness.warningCount} ${c('تحذير', 'warnings')}`,
    ],
    [
      c('التشغيل', 'Runtime readiness'),
      s.releaseGate.runtimeReady,
      c('نتيجة الخدمات المطلوبة والدليل التشغيلي.', 'Required services and operational evidence.'),
      healthHref('services', { importance: 'required' }),
      c('فحص الخدمات المطلوبة', 'Inspect required services'),
      `${s.components.filter((service) => !service.optional).length} ${c('خدمة مطلوبة في اللقطة', 'required services in snapshot')}`,
    ],
    [
      c('اكتمال الفحوص', 'Monitoring completeness'),
      s.releaseGate.monitoringComplete,
      c(
        'الفحوص المتوقعة والدليل التشغيلي المطلوب.',
        'Expected probes and required operational evidence.',
      ),
      healthHref('reports', { section: 'coverage' }),
      c('عرض تغطية الفحوص', 'Inspect probe coverage'),
      `${new Set([...s.coverage.missingProbes, ...s.coverage.requiredUnverified]).size} ${c('فجوة تغطية أو إثبات', 'coverage or evidence gaps')}`,
    ],
  ] as const;
  return (
    <>
      <HealthPanel
        title={c('شروط بوابة الإطلاق', 'Release gate conditions')}
        actions={
          <HealthBadge
            status={freshness !== 'FRESH' ? 'UNKNOWN' : s.releaseReady ? 'UP' : 'BLOCKER'}
          />
        }
      >
        <p>
          {freshness !== 'FRESH'
            ? c(
                'جاهزية الإطلاق غير مؤكدة من هذه اللقطة السابقة.',
                'Release readiness is unconfirmed from this previous snapshot.',
              )
            : s.releaseReady
              ? c('اجتازت اللقطة بوابة التشخيص.', 'This snapshot passed the diagnostic gate.')
              : c(
                  'لم تجتز اللقطة بوابة التشخيص؛ راجع الشروط والمعوقات أدناه.',
                  'This snapshot did not pass the diagnostic gate; inspect the conditions and findings below.',
                )}
        </p>
        <p>
          {c(
            'هذه نتيجة تشخيصية للقراءة فقط؛ لا تنفذ نشرًا ولا تمنح موافقة إطلاق.',
            'This is a read-only diagnostic result; it does not deploy or grant launch approval.',
          )}
        </p>
        <div className="health-gates">
          {gates.map(([title, passed, description, href, action, detail]) => (
            <article key={title}>
              <HealthBadge status={passed ? 'UP' : 'BLOCKER'} historical={freshness !== 'FRESH'} />
              <h3>{title}</h3>
              <p>{description}</p>
              <p className="health-gate-evidence">{detail}</p>
              <small>
                {freshness === 'FRESH'
                  ? c('حسب اللقطة الحالية', 'From this snapshot')
                  : c('نتيجة سابقة', 'Previous result')}
              </small>
              <Link className="health-button" to={href}>
                <ArrowUpLeft aria-hidden="true" />
                {action}
              </Link>
            </article>
          ))}
        </div>
        <p>
          {c('وقت تقرير التهيئة', 'Configuration report time')}:{' '}
          {time(s.productionReadiness.checkedAt)}
        </p>
      </HealthPanel>
      <HealthIssues overview={s} freshness={freshness} now={now} releaseOnly />
      <HealthPanel title={c('معلومات التشخيص', 'Diagnostic context')}>
        <dl className="health-facts">
          <div>
            <dt>{c('بيئة التشغيل', 'Runtime mode')}</dt>
            <dd>{s.runtimeMode}</dd>
          </div>
          <div>
            <dt>{c('نطاق القرار', 'Decision scope')}</dt>
            <dd>
              <code>{s.decisionScope}</code>
            </dd>
          </div>
          <div>
            <dt>{c('زمن تجميع التشخيص', 'Diagnostic aggregation duration')}</dt>
            <dd>{s.diagnosticAggregationDurationMs} ms</dd>
          </div>
          <div>
            <dt>{c('زمن فحص حياة API', 'API liveness duration')}</dt>
            <dd>{s.api.livenessDurationMs} ms</dd>
          </div>
          <div>
            <dt>{c('عمر عملية API', 'API process age')}</dt>
            <dd>{Math.floor(s.api.uptimeSeconds)} s</dd>
          </div>
        </dl>
        <HealthNotice>
          {c(
            'فحص حياة API يثبت استجابة العملية فقط. عمر العملية ليس نسبة التوفر، وزمن التشخيص ليس زمن استجابة المنصة للمستخدم.',
            'API liveness establishes only process responsiveness. Process age is not availability, and diagnostic duration is not user-facing platform latency.',
          )}
        </HealthNotice>
      </HealthPanel>
    </>
  );
}
