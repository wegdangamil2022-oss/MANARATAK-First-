import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  GraduationCap,
  School,
  BookOpenCheck,
  BookOpen,
  ClipboardCheck,
  BriefcaseBusiness,
  Files,
  RefreshCw,
  Activity,
  ArrowUpLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Eye,
  UserRoundPlus,
  AlertTriangle,
  Upload,
  Wallet,
  ListChecks,
  Clock3,
  Send,
  type LucideIcon,
} from 'lucide-react';
import type {
  DashboardDays,
  UserDashboard,
  TrafficDashboard,
  ApplicationDashboard,
} from '@manaratak/shared';
import { useTranslation } from '../i18n/I18nProvider';
import { useExecutiveDashboard, primaryKeys } from '../features/dashboard/useExecutiveDashboard';
import { ExecutiveChart } from '../features/dashboard/ExecutiveChart';
import { ExecutiveKpi as Kpi } from '../features/dashboard/ExecutiveKpi';
import { ExecutiveApplications } from '../features/dashboard/ExecutiveApplications';
import { dashboardLabel, dashboardTime } from '../features/dashboard/dashboardText';
import { safeCount } from '../features/dashboard/DashboardContract';
import type { ExecutiveReading } from '../features/dashboard/ExecutiveData';
import '../features/dashboard/executive-dashboard.css';

export function AdminDashboardPage() {
  const { language, dir } = useTranslation(),
    ar = language === 'ar';
  const tr = (arabic: string, english: string) => (ar ? arabic : english);
  const [days, setDays] = useState<DashboardDays>(30);
  const { readings, resources, userHeadline, busy, refreshData, state, permits } =
    useExecutiveDashboard(days);
  const reading = (key: string) => readings.find((row) => row.source.key === key),
    label = (key: string) => dashboardLabel(key, language);
  const number = (value: number | null) =>
    value === null ? '—' : new Intl.NumberFormat(language).format(value);
  const status = (row?: ExecutiveReading) =>
    !row
      ? ''
      : row.state === 'loading'
        ? tr('جار التحميل', 'Loading')
        : row.state === 'stale'
          ? tr('بيانات قديمة — تعذّر التحديث', 'Stale — refresh failed')
          : row.state === 'not_measured'
            ? tr('لم يبدأ القياس بعد', 'Measurement has not started')
            : row.state === 'partial'
              ? tr('تغطية جزئية', 'Partial coverage')
              : row.state === 'unavailable'
                ? tr('تعذّر التحميل', 'Unavailable')
                : row.state === 'forbidden'
                  ? tr('مقيّد بالصلاحيات', 'Restricted by permissions')
                  : '';
  const users = resources.users?.data as UserDashboard | null | undefined,
    traffic = resources.traffic?.data as TrafficDashboard | null | undefined,
    applications = resources.applications?.data as ApplicationDashboard | null | undefined;
  const headlineStatus =
    userHeadline?.state === 'stale'
      ? tr('بيانات قديمة — تعذّر التحديث', 'Stale — refresh failed')
      : userHeadline
        ? undefined
        : status(resources.users);
  const health = reading('health'),
    activity = reading('activity'),
    imports = reading('imports'),
    finance = reading('finance'),
    quality = reading('scholarships:quality');
  const healthCurrent = health && ['available', 'partial'].includes(state(health)),
    healthStatus = healthCurrent ? health.health?.runtimeStatus : null;
  const healthText =
    healthStatus === 'UP'
      ? tr('تعمل', 'Operational')
      : healthStatus && healthStatus !== 'UNKNOWN'
        ? tr('تنبيه', 'Attention')
        : tr('تعذّر التحقق', 'Not verified');
  const availableCount = (key: string, metric: string) => {
    const row = reading(key);
    return row && ['available', 'partial', 'stale'].includes(state(row))
      ? (row.metrics[metric] ?? null)
      : null;
  };
  const checked = readings
    .map((row) => row.receivedAt)
    .filter((value): value is string => Boolean(value))
    .sort()
    .at(-1);
  const icons = [
      School,
      GraduationCap,
      BookOpenCheck,
      BookOpen,
      ClipboardCheck,
      BriefcaseBusiness,
      Files,
    ],
    Arrow = ar ? ArrowUpLeft : ArrowUpRight;
  const actions: Array<{
    title: string;
    icon: LucideIcon;
    href: string;
    value: string;
    tone: string;
    stale?: boolean;
  }> = [];
  if (permits('admin:platform:manage'))
    actions.push({
      title: tr('سجلات تحتاج مراجعة', 'Records requiring review'),
      icon: ListChecks,
      href: '/review-queue',
      value:
        quality &&
        ['needsVerification', 'needsTranslation', 'missingFields'].some(
          (key) => (quality.metrics[key] ?? 0) > 0,
        )
          ? tr('توجد مراجعات', 'Reviews available')
          : tr('الإجمالي غير متاح', 'Total unavailable'),
      tone: 'indigo',
    });
  if (imports) {
    const failed = availableCount('imports', 'FAILED'),
      dlq = availableCount('imports', 'DLQ');
    actions.push({
      title: tr('أخطاء الاستيراد', 'Import errors'),
      icon: Upload,
      href: '/imports',
      value: number(failed === null || dlq === null ? null : safeCount(failed + dlq)),
      tone: 'gold',
      stale: state(imports) === 'stale',
    });
  }
  if (health && (!healthCurrent || healthStatus !== 'UP'))
    actions.push({
      title: tr('حالة المنصة', 'Platform health'),
      icon: Activity,
      href: '/health-readiness',
      value: healthText,
      tone: 'teal',
    });
  if (finance)
    actions.push({
      title: tr('اعتمادات مالية معلّقة', 'Pending financial approvals'),
      icon: Wallet,
      href: '/finance',
      value: number(availableCount('finance', 'pendingApprovals')),
      tone: 'indigo',
      stale: state(finance) === 'stale',
    });
  if (
    permits('admin:dashboard:applications:view') &&
    permits('admin:services:manage') &&
    permits('admin:services:requests:view')
  )
    actions.push({
      title: tr('طلبات تقديم تحتاج تدخلًا', 'Application requests needing attention'),
      icon: Send,
      href: '/services?tab=requests',
      value: number(applications?.attention ?? null),
      tone: 'cyan',
      stale: resources.applications?.state === 'stale',
    });
  const events = [...(activity?.activity ?? [])]
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, 5);
  const actionName = (action: string) =>
    /PUBLISH/.test(action)
      ? tr('إجراء نشر', 'Publishing action')
      : /CREAT|REGISTER/.test(action)
        ? tr('إنشاء سجل', 'Record created')
        : /APPROV|REVIEW/.test(action)
          ? tr('مراجعة واعتماد', 'Review decision')
          : /DELETE|ARCHIV/.test(action)
            ? tr('أرشفة سجل', 'Record archived')
            : /UPDATE|EDIT/.test(action)
              ? tr('تحديث بيانات', 'Record updated')
              : tr('إجراء إداري مسجّل', 'Recorded administrative action');
  const resultName = (value: string) =>
    value === 'SUCCESS'
      ? tr('نجح', 'Succeeded')
      : value === 'FAILURE'
        ? tr('فشل', 'Failed')
        : value === 'INTENT'
          ? tr('بدء إجراء؛ النتيجة غير مثبتة', 'Intent; outcome not established')
          : tr('النتيجة غير معروفة', 'Outcome unknown');
  const canUsers = permits('admin:dashboard:users:view'),
    canTraffic = permits('admin:dashboard:analytics:view'),
    canApplications = permits('admin:dashboard:applications:view');
  return (
    <div dir={dir} className="executive-dashboard" data-dashboard-version="2.1">
      <header className="executive-header">
        <div>
          <h1>{tr('لوحة التحكم', 'Dashboard')}</h1>
          <p>
            {tr(
              'نظرة عامة على أداء منارتك وما يحتاج متابعتك',
              'MANARATAK performance and the work that needs your attention',
            )}
          </p>
        </div>
        <div className="executive-header-actions">
          {health && (
            <Link
              to="/health-readiness"
              className={`executive-health ${healthStatus === 'UP' ? 'healthy' : 'uncertain'}`}
            >
              <Activity aria-hidden="true" />
              {healthText}
            </Link>
          )}
          <button type="button" disabled={busy} onClick={refreshData}>
            <RefreshCw aria-hidden="true" className={busy ? 'executive-spin' : ''} />
            {tr('تحديث البيانات', 'Refresh data')}
          </button>
          <span role="status" aria-live="polite">
            {busy
              ? tr('جار تحديث المصادر…', 'Refreshing sources…')
              : checked
                ? `${tr('آخر قراءة ناجحة', 'Latest successful read')}: ${dashboardTime(checked, language)}`
                : tr('لم تصل قراءة ناجحة بعد', 'No successful read yet')}
          </span>
        </div>
      </header>
      <section aria-labelledby="executive-platform">
        <div className="executive-section-heading">
          <h2 id="executive-platform">
            <Files aria-hidden="true" />
            {tr('إحصائيات المنصة', 'Platform statistics')}
          </h2>
          <span>
            {tr('إجماليات كل الوقت · قراءات مستقلة', 'All-time totals · independent readings')}
          </span>
        </div>
        <div className="executive-kpi-grid" aria-busy={busy}>
          {canUsers && (
            <Kpi
              title={tr('المستخدمون المسجلون', 'Registered users')}
              value={userHeadline?.data.registeredUsers ?? null}
              icon={Users}
              tone="indigo"
              href={permits('admin:identities:manage') ? '/identities?type=Human' : undefined}
              status={headlineStatus}
              language={language}
            />
          )}
          {primaryKeys.map((key, index) => {
            const row = reading(key);
            if (!row) return null;
            const current = state(row);
            return (
              <Kpi
                key={key}
                title={label(row.source.domain)}
                value={row.metrics.total ?? null}
                icon={icons[index]}
                tone={['teal', 'gold', 'cyan', 'indigo'][index % 4]}
                href={row.source.href}
                status={current === 'available' ? undefined : label(current)}
                language={language}
              />
            );
          })}
        </div>
        {canUsers && (
          <p className="executive-caption">
            {tr(
              'المستخدم المسجل: حساب بشري فريد ببريد متحقق؛ يشمل الموقوف، ويستبعد المحذوف والمؤرشف وحسابات الأنظمة.',
              'Registered user: a unique verified human account, including suspended, excluding deleted/archived and system accounts.',
            )}
          </p>
        )}
        {!readings.length && !canUsers && (
          <p className="executive-empty">{tr('مقيّد بالصلاحيات', 'Restricted by permissions')}</p>
        )}
      </section>
      {(canUsers || canTraffic || canApplications) && (
        <section aria-labelledby="executive-analytics">
          <div className="executive-section-heading">
            <div>
              <h2 id="executive-analytics">
                <TrendingUp aria-hidden="true" />
                {tr('نشاط المنصة والطلاب', 'Platform and student activity')}
              </h2>
              <p>
                {tr(
                  'نفس الفترة للمؤشرات الزمنية · التوقيت UTC',
                  'One period for time-based metrics · UTC',
                )}
              </p>
            </div>
            <div
              className="executive-period"
              role="group"
              aria-label={tr('الفترة الزمنية', 'Reporting period')}
            >
              {([7, 30, 90, 365] as const).map((value) => (
                <button
                  type="button"
                  key={value}
                  aria-pressed={days === value}
                  onClick={() => setDays(value)}
                >
                  {value === 365 ? tr('سنة', 'Year') : `${number(value)} ${tr('يومًا', 'days')}`}
                </button>
              ))}
            </div>
          </div>
          <div className="executive-activity-grid">
            {canUsers && (
              <>
                <Kpi
                  title={tr('التسجيلات الجديدة', 'New registrations')}
                  value={users?.newRegistrations ?? null}
                  icon={UserRoundPlus}
                  tone="teal"
                  language={language}
                  status={status(resources.users)}
                />
                <Kpi
                  title={tr('الطلاب المسجلون', 'Registered students')}
                  value={userHeadline?.data.registeredStudents ?? null}
                  icon={GraduationCap}
                  tone="gold"
                  language={language}
                  note={tr(
                    'حسابات مؤهلة بدور الطالب؛ إجمالي كل الوقت.',
                    'Eligible accounts with the student role; all-time total.',
                  )}
                  status={headlineStatus}
                />
              </>
            )}
            {canTraffic && (
              <>
                <Kpi
                  title={tr('معرّفات الزوار الفريدة', 'Unique visitor identifiers')}
                  value={traffic?.visitors ?? null}
                  icon={Users}
                  tone="cyan"
                  language={language}
                  status={status(resources.traffic)}
                />
                <Kpi
                  title={tr('مشاهدات الصفحات', 'Page views')}
                  value={traffic?.pageViews ?? null}
                  icon={Eye}
                  tone="indigo"
                  language={language}
                  status={status(resources.traffic)}
                />
              </>
            )}
          </div>
          <div className="executive-charts">
            {canUsers && (
              <div className="executive-panel">
                <h2>
                  <UserRoundPlus aria-hidden="true" />
                  {tr('نمو التسجيلات', 'Registration growth')}
                </h2>
                {users && (
                  <p className="executive-growth">
                    {users.growthPercent !== null ? (
                      <>
                        {users.growthPercent < 0 ? (
                          <TrendingDown aria-hidden="true" />
                        ) : (
                          <TrendingUp aria-hidden="true" />
                        )}
                        <bdi>{users.growthPercent}%</bdi>{' '}
                        {tr('مقارنة بالفترة السابقة المماثلة', 'versus the equal previous period')}
                      </>
                    ) : users.growthState === 'started_from_zero' ? (
                      tr('بدأ النمو من الصفر؛ لا نسبة مقارنة', 'Started from zero; no percentage')
                    ) : (
                      tr('لا أساس للمقارنة', 'No comparison baseline')
                    )}
                  </p>
                )}
                <p className="executive-state">{status(resources.users)}</p>
                <ExecutiveChart
                  title={tr('الحسابات الجديدة حسب اليوم', 'New accounts by day')}
                  points={users?.registrations ?? []}
                  language={language}
                  firstLabel={tr('التسجيلات', 'Registrations')}
                  empty={status(resources.users) || tr('لا توجد فترة متاحة', 'No available period')}
                  caption={tr(
                    'حسابات مؤهلة حاليًا حسب تاريخ إنشائها، وليست زيارات أو جلسات. المقارنة لفترتين متساويتين.',
                    'Currently eligible accounts by creation date, not visits or sessions. Equal-length periods.',
                  )}
                />
                {users && (
                  <time className="executive-caption" dateTime={users.checkedAt}>
                    {dashboardTime(users.checkedAt, language)}
                  </time>
                )}
              </div>
            )}
            {canTraffic && (
              <div className="executive-panel">
                <h2>
                  <Eye aria-hidden="true" />
                  {tr('زيارات المنصة', 'Platform traffic')}
                </h2>
                <p className="executive-state">{status(resources.traffic)}</p>
                <ExecutiveChart
                  title={tr('الزوار والمشاهدات اليومية', 'Daily visitors and page views')}
                  points={traffic?.visits ?? []}
                  language={language}
                  firstLabel={tr('معرّفات الزوار', 'Visitor identifiers')}
                  secondLabel={tr('المشاهدات', 'Page views')}
                  empty={
                    status(resources.traffic) || tr('لا توجد بيانات تاريخية', 'No historical data')
                  }
                  caption={tr(
                    'معرّفات متصفحات وافقت فقط؛ تُستبعد الروبوتات المعروفة. ليست عدد جميع الأشخاص، وقد يتكرر الشخص عند تغير معرّفه.',
                    'Consenting browser identifiers only; known bots excluded. Not all people; a changed identifier may count a person again.',
                  )}
                />
                {traffic?.measurementStartedAt && (
                  <p className="executive-caption">
                    {tr('بدء القياس', 'Measurement began')}:{' '}
                    {dashboardTime(traffic.measurementStartedAt, language)} ·{' '}
                    {tr('الاحتفاظ', 'Retention')}: {number(traffic.retentionDays)}{' '}
                    {tr('يومًا', 'days')}
                  </p>
                )}
                {traffic && (
                  <time className="executive-caption" dateTime={traffic.checkedAt}>
                    {dashboardTime(traffic.checkedAt, language)}
                  </time>
                )}
              </div>
            )}
          </div>
          {(canApplications || canTraffic) && (
            <ExecutiveApplications
              applications={applications ?? null}
              traffic={traffic ?? null}
              language={language}
              canManaged={canApplications}
              canTraffic={canTraffic}
              managedState={status(resources.applications)}
              trafficState={status(resources.traffic)}
            />
          )}
        </section>
      )}
      <div className="executive-bottom">
        <section className="executive-panel" aria-labelledby="executive-attention">
          <h2 id="executive-attention">
            <AlertTriangle aria-hidden="true" />
            {tr('يحتاج انتباهك', 'Needs your attention')}
          </h2>
          {actions.length ? (
            <ul className="executive-action-list">
              {actions.slice(0, 5).map(({ title, icon: Icon, href, value, tone, stale }) => (
                <li key={href}>
                  <Link to={href}>
                    <span className={`executive-icon ${tone}`}>
                      <Icon aria-hidden="true" />
                    </span>
                    <span>
                      {title}
                      {stale && (
                        <small className="executive-caption">
                          {' '}
                          · {tr('بيانات قديمة', 'Stale data')}
                        </small>
                      )}
                    </span>
                    <strong>{value}</strong>
                    <Arrow aria-hidden="true" />
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="executive-empty">
              {tr(
                'لا توجد مصادر متابعة متاحة ضمن صلاحياتك.',
                'No attention sources available within your permissions.',
              )}
            </p>
          )}
          <p className="executive-caption">
            {tr(
              'تعذّر المصدر لا يعني خلوّه من المشاكل. طلبات التدخل تشمل المتأخر والناقص من جميع الفترات.',
              'Unavailable does not mean no issues. Attention includes overdue/incomplete requests from all periods.',
            )}
          </p>
        </section>
        <section className="executive-panel" aria-labelledby="executive-recent">
          <div className="executive-section-heading">
            <h2 id="executive-recent">
              <Activity aria-hidden="true" />
              {tr('آخر الأنشطة', 'Recent activity')}
            </h2>
            {activity && (
              <Link to="/audit">
                {tr('عرض جميع الأنشطة', 'View all activity')}
                <Arrow aria-hidden="true" />
              </Link>
            )}
          </div>
          {activity && (
            <p className="executive-state">
              {state(activity) === 'available' ? '' : label(state(activity))}
              {activity.activityPartial ? ` · ${tr('نطاق جزئي', 'Partial scope')}` : ''}
            </p>
          )}
          {events.length ? (
            <ol className="executive-event-list">
              {events.map((event) => (
                <li key={event.id}>
                  <span className="executive-icon cyan">
                    <Clock3 aria-hidden="true" />
                  </span>
                  <div>
                    <h3>
                      {actionName(event.action)} · {label(event.owner)}
                    </h3>
                    <p>{resultName(event.result)}</p>
                    <time dateTime={event.timestamp}>
                      {dashboardTime(event.timestamp, language)}
                    </time>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <p className="executive-empty">
              {!activity
                ? tr('مقيّد بالصلاحيات', 'Restricted by permissions')
                : state(activity) === 'available' && !activity.activityPartial
                  ? tr('لا توجد أحداث في النطاق المصرّح.', 'No events in the authorized scope.')
                  : tr(
                      'لم تصل أحداث مؤكدة؛ لا يعني ذلك عدم وجود نشاط.',
                      'No confirmed events received; this does not establish absence of activity.',
                    )}
            </p>
          )}
        </section>
      </div>
    </div>
  );
}
