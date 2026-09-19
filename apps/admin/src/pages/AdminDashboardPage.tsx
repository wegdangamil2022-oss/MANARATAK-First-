import { useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BriefcaseBusiness,
  CheckCircle2,
  Database,
  FileCheck2,
  GraduationCap,
  HeartPulse,
  Newspaper,
  RefreshCw,
  School,
  SearchCheck,
  ShieldAlert,
  Sparkles,
  TestTube2,
  Users,
  WalletCards,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

const BRAND = {
  primary: '#142B5F',
  secondary: '#0E7C86',
  digital: '#21A7B4',
  gold: '#D6A43B',
  highlight: '#F2CD78',
  fog: '#DDEFF2',
  ivory: '#FAF7F0',
  text: '#203442',
  white: '#FFFFFF',
} as const;

type LoadState = 'ready' | 'unavailable';
type HealthState = 'UP' | 'DOWN' | 'UNKNOWN';

type PaginatedResponse<T = unknown> = {
  data: T[];
  total: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
};

type DomainStat = {
  total: number | null;
  published: number | null;
  review: number | null;
  state: LoadState;
};

type ScholarshipSummary = {
  all: number;
  imported: number;
  missingFields: number;
  needsVerification: number;
  needsTranslation: number;
  readyToPublish: number;
  published: number;
  archived: number;
};

type ImportedCourseOverview = {
  total: number;
  review: number;
  incomplete: number;
  broken: number;
  needsVerification: number;
  ready: number;
  published: number;
  archived: number;
};

type ImportBatch = {
  id?: string;
  sourceSystem?: string;
  dataType?: string;
  status?: string;
  batchStatus?: string;
  totalRecords?: number;
  processedRecords?: number;
  failedRecords?: number;
  createdAt?: string;
  updatedAt?: string;
};

type ImportSnapshot = {
  batches: number | null;
  records: number | null;
  needsReview: number | null;
  incomplete: number | null;
  failed: number | null;
  promoted: number | null;
  latestBatch: ImportBatch | null;
  state: LoadState;
};

type FinanceOverview = {
  pendingPayments: number | null;
  pendingTransfers: number | null;
  pendingApprovals: number | null;
  reconciliationHealth: 'HEALTHY' | 'DEGRADED' | 'CRITICAL' | 'UNKNOWN';
};

type MonitoringResponse = {
  status?: HealthState;
  indicators?: Record<string, { status?: HealthState; latencyMs?: number; error?: string }>;
};

type ProductionReadiness = {
  ready: boolean;
  blockerCount: number;
  warningCount: number;
};

type SystemSnapshot = {
  api: HealthState;
  database: HealthState;
  redis: HealthState;
  blockers: number | null;
  warnings: number | null;
  state: LoadState;
};

type DashboardSnapshot = {
  usersTotal: number | null;
  universities: DomainStat;
  scholarships: ScholarshipSummary | null;
  majors: DomainStat;
  courses: DomainStat & { importedOverview: ImportedCourseOverview | null };
  tests: DomainStat;
  careers: DomainStat;
  cms: DomainStat;
  imports: ImportSnapshot;
  finance: FinanceOverview | null;
  system: SystemSnapshot;
};

const EMPTY_DOMAIN: DomainStat = { total: null, published: null, review: null, state: 'unavailable' };

const EMPTY_SNAPSHOT: DashboardSnapshot = {
  usersTotal: null,
  universities: EMPTY_DOMAIN,
  scholarships: null,
  majors: EMPTY_DOMAIN,
  courses: { ...EMPTY_DOMAIN, importedOverview: null },
  tests: EMPTY_DOMAIN,
  careers: EMPTY_DOMAIN,
  cms: EMPTY_DOMAIN,
  imports: {
    batches: null,
    records: null,
    needsReview: null,
    incomplete: null,
    failed: null,
    promoted: null,
    latestBatch: null,
    state: 'unavailable',
  },
  finance: null,
  system: { api: 'UNKNOWN', database: 'UNKNOWN', redis: 'UNKNOWN', blockers: null, warnings: null, state: 'unavailable' },
};

export function AdminDashboardPage() {
  const { language, dir, t } = useTranslation();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot>(EMPTY_SNAPSHOT);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const isArabic = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const tr = (ar: string, en: string) => (isArabic ? ar : en);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(isArabic ? 'ar' : 'en-US'), [isArabic]);
  const formatNumber = (value: number | null | undefined) => value == null ? '—' : numberFormatter.format(value);

  const loadDashboard = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);

    const [
      usersResult,
      universitiesResult,
      scholarshipsResult,
      majorsResult,
      coursesResult,
      testsResult,
      careersResult,
      cmsResult,
      importsResult,
      financeResult,
      systemResult,
    ] = await Promise.all([
      loadUsersTotal(),
      loadDomainStats('/admin/universities', ['READY_TO_REVIEW']),
      loadScholarshipSummary(),
      loadDomainStats('/admin/majors', ['READY_TO_REVIEW']),
      loadCourseStats(),
      loadDomainStats('/admin/international-tests', ['READY_TO_REVIEW', 'NEEDS_REVIEW']),
      loadDomainStats('/admin/careers/jobs', ['READY_TO_REVIEW']),
      loadDomainStats('/admin/cms/content', ['IN_REVIEW', 'READY_TO_PUBLISH']),
      loadImportSnapshot(),
      loadFinanceOverview(),
      loadSystemSnapshot(),
    ]);

    setSnapshot({
      usersTotal: usersResult,
      universities: universitiesResult,
      scholarships: scholarshipsResult,
      majors: majorsResult,
      courses: coursesResult,
      tests: testsResult,
      careers: careersResult,
      cms: cmsResult,
      imports: importsResult,
      finance: financeResult,
      system: systemResult,
    });
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadDashboard(false);
  }, [loadDashboard]);

  const attentionSignals = useMemo(() => {
    const items = [
      {
        key: 'scholarship-review',
        label: tr('منح بانتظار المراجعة', 'Scholarships awaiting review'),
        value: snapshot.scholarships?.imported ?? null,
        href: '/scholarships',
        icon: GraduationCap,
      },
      {
        key: 'scholarship-source',
        label: tr('منح تحتاج تحققًا من المصدر', 'Scholarships needing source verification'),
        value: snapshot.scholarships?.needsVerification ?? null,
        href: '/scholarships',
        icon: SearchCheck,
      },
      {
        key: 'course-review',
        label: tr('دورات تحتاج مراجعة', 'Courses needing review'),
        value: snapshot.courses.importedOverview?.review ?? snapshot.courses.review,
        href: '/courses',
        icon: BookOpen,
      },
      {
        key: 'course-links',
        label: tr('روابط دورات معطلة', 'Broken course links'),
        value: snapshot.courses.importedOverview?.broken ?? null,
        href: '/courses',
        icon: AlertTriangle,
      },
      {
        key: 'imports-review',
        label: tr('سجلات استيراد تحتاج مراجعة', 'Import records needing review'),
        value: sumNullable(snapshot.imports.needsReview, snapshot.imports.incomplete),
        href: '/imports',
        icon: Database,
      },
      {
        key: 'production-blockers',
        label: tr('معوقات جاهزية الإنتاج', 'Production readiness blockers'),
        value: snapshot.system.blockers,
        href: '/health-readiness',
        icon: ShieldAlert,
      },
    ];
    return items.filter((item) => item.value == null || item.value > 0);
  }, [snapshot, isArabic]);

  const exactAttentionTotal = useMemo(() => {
    // Only non-overlapping lifecycle queues are summed. Diagnostic signals such as
    // broken links / verification are intentionally excluded to avoid double counting.
    return sumValues([
      snapshot.scholarships?.imported,
      snapshot.universities.review,
      snapshot.majors.review,
      snapshot.courses.importedOverview?.review ?? snapshot.courses.review,
      snapshot.tests.review,
      snapshot.careers.review,
      sumNullable(snapshot.imports.needsReview, snapshot.imports.incomplete),
      snapshot.system.blockers,
    ]);
  }, [snapshot]);

  const primaryMetrics = [
    { key: 'users', label: tr('المستخدمون', 'Users'), value: snapshot.usersTotal, href: '/settings', icon: Users, accent: BRAND.primary },
    { key: 'universities', label: t('admin_nav_universities'), value: snapshot.universities.total, href: '/universities', icon: School, accent: BRAND.secondary },
    { key: 'scholarships', label: t('admin_nav_scholarships'), value: snapshot.scholarships?.all ?? null, href: '/scholarships', icon: GraduationCap, accent: BRAND.gold },
    { key: 'majors', label: t('admin_nav_majors'), value: snapshot.majors.total, href: '/majors', icon: Sparkles, accent: BRAND.digital },
    { key: 'courses', label: t('admin_nav_courses'), value: snapshot.courses.total, href: '/courses', icon: BookOpen, accent: BRAND.secondary },
    { key: 'tests', label: t('admin_nav_tests'), value: snapshot.tests.total, href: '/international-tests', icon: TestTube2, accent: BRAND.primary },
    { key: 'careers', label: t('admin_nav_careers'), value: snapshot.careers.total, href: '/careers', icon: BriefcaseBusiness, accent: BRAND.gold },
    { key: 'cms', label: t('admin_nav_cms'), value: snapshot.cms.total, href: '/cms', icon: Newspaper, accent: BRAND.digital },
  ];

  const unavailableCount = primaryMetrics.filter((metric) => metric.value == null).length;

  return (
    <div dir={dir} className="-m-6 min-h-full bg-[#FAF7F0] p-6 text-[#203442]">
      <div className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/20 bg-gradient-to-l from-[#0E7C86] via-[#0F6678] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.15)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-[#F2CD78]/20" />
        <div className="pointer-events-none absolute -left-5 -top-20 h-48 w-48 rounded-full border border-[#F2CD78]/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1 w-40 bg-[#D6A43B] sm:w-64" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-3xl">
            <div className="mb-3 flex items-center gap-2 text-xs font-extrabold tracking-wide text-[#F2CD78] sm:text-sm">
              <Activity className="h-4 w-4" />
              <span>{tr('مركز الإدارة والتشغيل', 'Administration & Operations Center')}</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl">{tr('لوحة التحكم', 'Dashboard')}</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-[#DDEFF2]">
              {tr(
                'نظرة تنفيذية على البيانات الحقيقية، قوائم المراجعة، الاستيراد، الجاهزية والعمليات الأساسية في منارتك.',
                'An executive view of live catalog data, review queues, imports, readiness, and core MANARATAK operations.',
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-stretch gap-3">
            <div className="min-w-[150px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-[11px] font-bold text-[#DDEFF2]">{tr('يحتاج تدخلك', 'Needs attention')}</div>
              <div className="mt-1 text-3xl font-black text-[#F2CD78]">{formatNumber(exactAttentionTotal)}</div>
              <div className="mt-1 text-[10px] font-semibold text-white/70">{tr('قوائم تشغيل غير متداخلة', 'Non-overlapping work queues')}</div>
            </div>
            <div className="min-w-[150px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
              <div className="text-[11px] font-bold text-[#DDEFF2]">{tr('حالة النظام', 'System status')}</div>
              <div className="mt-2 flex items-center gap-2 text-sm font-black">
                <StatusDot status={snapshot.system.api} />
                <span>{healthLabel(snapshot.system.api, isArabic)}</span>
              </div>
              <div className="mt-2 text-[10px] font-semibold text-white/70">
                {lastUpdated ? `${tr('آخر تحديث', 'Updated')}: ${formatTime(lastUpdated, isArabic)}` : tr('جارٍ التحديث', 'Updating')}
              </div>
            </div>
            <button
              type="button"
              onClick={() => void loadDashboard(true)}
              disabled={refreshing}
              className="inline-flex min-h-[72px] min-w-[112px] items-center justify-center gap-2 rounded-2xl bg-[#D6A43B] px-4 text-sm font-black text-[#142B5F] shadow-sm transition hover:bg-[#F2CD78] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
              {tr('تحديث', 'Refresh')}
            </button>
          </div>
        </div>
      </section>

      {loading ? (
        <DashboardSkeleton />
      ) : (
        <>
          <section>
            <SectionHeading
              eyebrow={tr('المؤشرات الرئيسية', 'Key metrics')}
              title={tr('حجم المنصة الآن', 'Platform snapshot')}
              description={tr('الأرقام أدناه تُقرأ من واجهات التشغيل الفعلية، ولا تستخدم بيانات تجريبية أو أرقامًا ثابتة.', 'These values are read from live runtime APIs with no demo or hard-coded counts.')}
            />
            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              {primaryMetrics.map(({ key, ...metric }) => (
                <MetricCard key={key} {...metric} valueLabel={formatNumber(metric.value)} unavailable={metric.value == null} unavailableLabel={tr('غير متاح', 'Unavailable')} />
              ))}
            </div>
          </section>

          <section className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
              <div className="flex flex-col gap-3 border-b border-[#DDEFF2] bg-[#FAF7F0] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-wider text-[#0E7C86]">{tr('الأولوية التشغيلية', 'Operational priority')}</p>
                  <h2 className="mt-1 text-xl font-black text-[#142B5F]">{tr('يحتاج تدخلك الآن', 'Needs your attention')}</h2>
                </div>
                <Link to="/review-queue" className="inline-flex items-center gap-2 text-xs font-black text-[#0E7C86] hover:text-[#142B5F]">
                  {tr('فتح قائمة المراجعة', 'Open review queue')}
                  <ArrowIcon className="h-4 w-4" />
                </Link>
              </div>

              <div className="grid gap-0 sm:grid-cols-2">
                {attentionSignals.length === 0 ? (
                  <div className="col-span-full flex min-h-40 flex-col items-center justify-center gap-2 p-6 text-center">
                    <CheckCircle2 className="h-8 w-8 text-[#0E7C86]" />
                    <div className="font-black text-[#142B5F]">{tr('لا توجد إشارات عاجلة متاحة', 'No urgent signals available')}</div>
                  </div>
                ) : attentionSignals.map((signal) => {
                  const Icon = signal.icon;
                  return (
                    <Link key={signal.key} to={signal.href} className="group flex min-h-24 items-center gap-4 border-b border-[#DDEFF2] p-4 transition hover:bg-[#DDEFF2]/35 sm:[&:nth-child(odd)]:border-l sm:ltr:[&:nth-child(odd)]:border-l-0 sm:ltr:[&:nth-child(odd)]:border-r">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FAF7F0] text-[#D6A43B] ring-1 ring-[#D6A43B]/25">
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold leading-5 text-[#203442]/70">{signal.label}</div>
                        <div className="mt-1 text-2xl font-black text-[#142B5F]">{formatNumber(signal.value)}</div>
                      </div>
                      <ArrowIcon className="h-4 w-4 shrink-0 text-[#21A7B4] transition group-hover:translate-x-[-2px] rtl:group-hover:translate-x-[2px]" />
                    </Link>
                  );
                })}
              </div>
            </div>

            <SystemHealthCard snapshot={snapshot.system} isArabic={isArabic} />
          </section>

          <section>
            <SectionHeading
              eyebrow={tr('جودة الكتالوج', 'Catalog health')}
              title={tr('حالة البيانات الأساسية', 'Core data status')}
              description={tr('ملخص حالات النشر والمراجعة من مصادر كل نطاق، دون إعادة حسابها من أول صفحة فقط.', 'Publication and review totals are read from each domain source rather than inferred from the first page.')}
            />
            <div className="mt-4 overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
              <CatalogRow label={t('admin_nav_universities')} href="/universities" icon={<School className="h-4 w-4" />} stats={snapshot.universities} formatNumber={formatNumber} isArabic={isArabic} />
              <CatalogRow
                label={t('admin_nav_scholarships')}
                href="/scholarships"
                icon={<GraduationCap className="h-4 w-4" />}
                stats={{
                  total: snapshot.scholarships?.all ?? null,
                  published: snapshot.scholarships?.published ?? null,
                  review: snapshot.scholarships?.imported ?? null,
                  state: snapshot.scholarships ? 'ready' : 'unavailable',
                }}
                formatNumber={formatNumber}
                isArabic={isArabic}
              />
              <CatalogRow label={t('admin_nav_majors')} href="/majors" icon={<Sparkles className="h-4 w-4" />} stats={snapshot.majors} formatNumber={formatNumber} isArabic={isArabic} />
              <CatalogRow label={t('admin_nav_courses')} href="/courses" icon={<BookOpen className="h-4 w-4" />} stats={snapshot.courses} formatNumber={formatNumber} isArabic={isArabic} />
              <CatalogRow label={t('admin_nav_tests')} href="/international-tests" icon={<TestTube2 className="h-4 w-4" />} stats={snapshot.tests} formatNumber={formatNumber} isArabic={isArabic} last />
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-2">
            <ImportCard snapshot={snapshot.imports} isArabic={isArabic} formatNumber={formatNumber} />
            <FinanceCard overview={snapshot.finance} isArabic={isArabic} formatNumber={formatNumber} />
          </section>

          <section>
            <SectionHeading
              eyebrow={tr('التحليلات', 'Analytics')}
              title={tr('نشاط المستخدمين والتحليلات', 'User activity & analytics')}
              description={tr(
                'القسم موجود من الآن داخل لوحة التحكم، لكنه لا يعرض أرقامًا تقديرية. ستظهر القيم تلقائيًا عندما يتوفر مصدر Analytics تشغيلي موثوق.',
                'This section is part of the dashboard now, but it never estimates values. Metrics will appear when a trusted runtime analytics source is available.',
              )}
            />
            <div className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4">
              <PendingMetricCard label={tr('الزوار / المستخدمون النشطون', 'Visitors / active users')} isArabic={isArabic} />
              <PendingMetricCard label={tr('عمليات البحث', 'Searches')} isArabic={isArabic} />
              <PendingMetricCard label={tr('عمليات الحفظ والتفاعل', 'Saves & interactions')} isArabic={isArabic} />
              <PendingMetricCard label={tr('معدل التحويل', 'Conversion rate')} isArabic={isArabic} />
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
            <div className="border-b border-[#DDEFF2] bg-[#FAF7F0] px-5 py-5">
              <p className="text-[11px] font-black uppercase tracking-wider text-[#0E7C86]">{tr('النتائج', 'Outcomes')}</p>
              <h2 className="mt-1 text-xl font-black text-[#142B5F]">{tr('مسار التحويلات', 'Conversion funnel')}</h2>
              <p className="mt-1 text-xs font-medium leading-6 text-[#203442]/65">
                {tr('يبقى المسار ظاهرًا حتى قبل بدء القياس، لكن القيم تظل فارغة بدل إدخال بيانات تجريبية.', 'The funnel remains visible before tracking begins, while values stay empty rather than using demo data.')}
              </p>
            </div>
            <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-5">
              {['زيارة', 'بحث', 'فتح نتيجة', 'إجراء مستهدف', 'تحويل ناجح'].map((labelAr, index) => {
                const labelsEn = ['Visit', 'Search', 'Open result', 'Target action', 'Successful conversion'];
                return (
                  <div key={labelAr} className="relative rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0]/55 p-4 text-center">
                    <div className="text-2xl font-black text-[#142B5F]">—</div>
                    <div className="mt-1 text-[11px] font-bold text-[#203442]/65">{tr(labelAr, labelsEn[index])}</div>
                    {index < 4 && <ArrowIcon className="absolute -left-2 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-[#21A7B4] lg:block ltr:-right-2 ltr:left-auto" />}
                  </div>
                );
              })}
            </div>
          </section>

          <section className="overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-[#DDEFF2] bg-[#FAF7F0] px-5 py-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-[11px] font-black uppercase tracking-wider text-[#0E7C86]">{tr('التدقيق', 'Audit')}</p>
                <h2 className="mt-1 text-xl font-black text-[#142B5F]">{tr('آخر النشاطات الإدارية', 'Recent admin activity')}</h2>
              </div>
              <span className="w-fit rounded-full border border-[#D6A43B]/30 bg-[#F2CD78]/20 px-3 py-1 text-[10px] font-black text-[#142B5F]">
                {tr('بانتظار مصدر موجز قابل للتوسع', 'Awaiting scalable summary source')}
              </span>
            </div>
            <div className="flex min-h-40 flex-col items-center justify-center gap-3 p-6 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#DDEFF2]/65 text-[#0E7C86]">
                <Activity className="h-5 w-5" />
              </div>
              <div className="font-black text-[#142B5F]">{tr('لا توجد نشاطات معروضة حاليًا', 'No admin activity is displayed yet')}</div>
              <p className="max-w-2xl text-xs font-medium leading-6 text-[#203442]/60">
                {tr(
                  'لن نملأ هذا القسم بأحداث تجريبية. عند توفير قراءة Audit مختصرة ومحددة الصفحات سيعرض آخر العمليات الحقيقية: من قام بها، القسم، الوقت والنتيجة.',
                  'This area will never be filled with demo events. Once a paginated audit summary is available it will show the real latest actions, actor, module, time, and result.',
                )}
              </p>
            </div>
          </section>

          <section className="flex flex-col gap-3 rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0] px-5 py-4 text-xs leading-6 text-[#203442]/75 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-2">
              <FileCheck2 className="mt-1 h-4 w-4 shrink-0 text-[#0E7C86]" />
              <span>
                {tr(
                  'هذه اللوحة لا تعرض أرقام زيارات أو تحويلات ما لم يوجد لها مصدر Analytics تشغيلي حقيقي. أي مصدر غير متاح يظهر بعلامة «غير متاح» بدل إنشاء قيمة بديلة.',
                  'Traffic and conversion numbers are not shown until a real runtime analytics source exists. Unavailable sources are shown as unavailable rather than replaced by synthetic values.',
                )}
              </span>
            </div>
            {unavailableCount > 0 && (
              <span className="shrink-0 rounded-full border border-[#D6A43B]/35 bg-[#F2CD78]/25 px-3 py-1 font-black text-[#142B5F]">
                {formatNumber(unavailableCount)} {tr('مصدر غير متاح', 'unavailable sources')}
              </span>
            )}
          </section>
        </>
      )}
      </div>
    </div>
  );
}

async function loadUsersTotal(): Promise<number | null> {
  try {
    const response = await adminApiClient.request<{ data?: { items?: unknown[]; total?: number } }>('/admin/identities?type=Human&limit=1&offset=0');
    return numberOrNull(response.data?.total);
  } catch {
    return null;
  }
}

async function loadDomainStats(endpoint: string, reviewStatuses: string[]): Promise<DomainStat> {
  try {
    const [all, published, ...reviewResults] = await Promise.all([
      fetchPagedTotal(endpoint),
      fetchPagedTotal(withQuery(endpoint, { status: 'PUBLISHED' })),
      ...reviewStatuses.map((status) => fetchPagedTotal(withQuery(endpoint, { status }))),
    ]);
    return {
      total: all,
      published,
      review: reviewResults.reduce((sum, value) => sum + value, 0),
      state: 'ready',
    };
  } catch {
    return { ...EMPTY_DOMAIN };
  }
}

async function loadScholarshipSummary(): Promise<ScholarshipSummary | null> {
  try {
    return await adminApiClient.request<ScholarshipSummary>('/admin/scholarships/summary');
  } catch {
    return null;
  }
}

async function loadCourseStats(): Promise<DashboardSnapshot['courses']> {
  try {
    const [all, published, importedPage] = await Promise.all([
      fetchPagedTotal('/admin/courses'),
      fetchPagedTotal('/admin/courses?status=PUBLISHED'),
      adminApiClient.request<{ overview?: ImportedCourseOverview }>('/admin/courses/imported?page=1&pageSize=1'),
    ]);
    const overview = importedPage.overview ?? null;
    return {
      total: all,
      published,
      review: overview?.review ?? null,
      state: 'ready',
      importedOverview: overview,
    };
  } catch {
    try {
      const [all, published] = await Promise.all([
        fetchPagedTotal('/admin/courses'),
        fetchPagedTotal('/admin/courses?status=PUBLISHED'),
      ]);
      return { total: all, published, review: null, state: 'ready', importedOverview: null };
    } catch {
      return { ...EMPTY_DOMAIN, importedOverview: null };
    }
  }
}

async function loadImportSnapshot(): Promise<ImportSnapshot> {
  try {
    const [batches, all, needsReview, incomplete, failed, promoted] = await Promise.all([
      adminApiClient.request<ImportBatch[]>('/admin/imports/batches'),
      fetchImportRecordTotal(),
      fetchImportRecordTotal('NEEDS_REVIEW'),
      fetchImportRecordTotal('INCOMPLETE'),
      fetchImportRecordTotal('FAILED'),
      fetchImportRecordTotal('PROMOTED'),
    ]);

    const latestBatch = [...(batches || [])]
      .filter(Boolean)
      .sort((a, b) => dateMillis(b.createdAt ?? b.updatedAt) - dateMillis(a.createdAt ?? a.updatedAt))[0] ?? null;

    return {
      batches: batches.length,
      records: all,
      needsReview,
      incomplete,
      failed,
      promoted,
      latestBatch,
      state: 'ready',
    };
  } catch {
    return { ...EMPTY_SNAPSHOT.imports };
  }
}

async function loadFinanceOverview(): Promise<FinanceOverview | null> {
  try {
    return await adminApiClient.request<FinanceOverview>('/admin/finance/overview');
  } catch {
    return null;
  }
}

async function loadSystemSnapshot(): Promise<SystemSnapshot> {
  try {
    const [health, readiness, production] = await Promise.allSettled([
      adminApiClient.request<MonitoringResponse>('/monitoring/health'),
      adminApiClient.request<MonitoringResponse>('/monitoring/health/readiness'),
      adminApiClient.request<ProductionReadiness>('/monitoring/production-readiness'),
    ]);

    const healthValue = health.status === 'fulfilled' ? health.value : null;
    const readinessValue = readiness.status === 'fulfilled' ? readiness.value : null;
    const productionValue = production.status === 'fulfilled' ? production.value : null;
    const indicators = readinessValue?.indicators ?? healthValue?.indicators ?? {};

    return {
      api: healthValue?.status ?? (health.status === 'rejected' ? 'DOWN' : 'UNKNOWN'),
      database: indicators.database?.status ?? 'UNKNOWN',
      redis: indicators.redis?.status ?? 'UNKNOWN',
      blockers: numberOrNull(productionValue?.blockerCount),
      warnings: numberOrNull(productionValue?.warningCount),
      state: healthValue || readinessValue || productionValue ? 'ready' : 'unavailable',
    };
  } catch {
    return { ...EMPTY_SNAPSHOT.system };
  }
}

async function fetchPagedTotal(endpoint: string): Promise<number> {
  const response = await adminApiClient.request<PaginatedResponse>(withQuery(endpoint, { page: 1, pageSize: 1 }));
  if (typeof response.total !== 'number') throw new Error('DASHBOARD_TOTAL_UNAVAILABLE');
  return response.total;
}

async function fetchImportRecordTotal(status?: string): Promise<number> {
  const response = await adminApiClient.request<{ total?: number }>(`/admin/imports/records?page=1&pageSize=1${status ? `&status=${encodeURIComponent(status)}` : ''}`);
  if (typeof response.total !== 'number') throw new Error('IMPORT_TOTAL_UNAVAILABLE');
  return response.total;
}

function withQuery(endpoint: string, params: Record<string, string | number>): string {
  const separator = endpoint.includes('?') ? '&' : '?';
  const query = new URLSearchParams(Object.entries(params).map(([key, value]) => [key, String(value)])).toString();
  return `${endpoint}${separator}${query}`;
}

function numberOrNull(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function sumNullable(...values: Array<number | null | undefined>): number | null {
  const available = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return available.length ? available.reduce((sum, value) => sum + value, 0) : null;
}

function sumValues(values: Array<number | null | undefined>): number | null {
  const available = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return available.length ? available.reduce((sum, value) => sum + value, 0) : null;
}

function dateMillis(value?: string) {
  if (!value) return 0;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatTime(date: Date, isArabic: boolean) {
  return new Intl.DateTimeFormat(isArabic ? 'ar' : 'en-US', { hour: '2-digit', minute: '2-digit' }).format(date);
}

function healthLabel(status: HealthState, isArabic: boolean) {
  if (status === 'UP') return isArabic ? 'يعمل بصورة طبيعية' : 'Operational';
  if (status === 'DOWN') return isArabic ? 'يوجد عطل' : 'Service issue';
  return isArabic ? 'غير مؤكد' : 'Unknown';
}

function StatusDot({ status }: { status: HealthState }) {
  const className = status === 'UP' ? 'bg-emerald-300' : status === 'DOWN' ? 'bg-rose-300' : 'bg-[#F2CD78]';
  return <span className={`h-2.5 w-2.5 rounded-full ${className}`} />;
}

function SectionHeading({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-black uppercase tracking-wider text-[#0E7C86]">{eyebrow}</div>
      <h2 className="text-xl font-black text-[#142B5F] sm:text-2xl">{title}</h2>
      <p className="max-w-3xl text-xs font-medium leading-6 text-[#203442]/65">{description}</p>
    </div>
  );
}

function MetricCard({
  label,
  valueLabel,
  href,
  icon: Icon,
  accent,
  unavailable,
  unavailableLabel,
}: {
  label: string;
  valueLabel: string;
  href: string;
  icon: ComponentType<{ className?: string }>;
  accent: string;
  unavailable: boolean;
  unavailableLabel: string;
}) {
  return (
    <Link to={href} className="group relative min-h-[132px] overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md">
      <div className={`absolute inset-x-0 top-0 h-1 ${accentClass(accent).bar}`} />
      <div className="flex items-center justify-between gap-2">
        <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${accentClass(accent).icon}`}>
          <Icon className="h-4 w-4" />
        </div>
        {unavailable && <span className="rounded-full bg-[#FAF7F0] px-2 py-1 text-[9px] font-black text-[#203442]/55">{unavailableLabel}</span>}
      </div>
      <div className="mt-4 text-2xl font-black text-[#142B5F]">{valueLabel}</div>
      <div className="mt-1 truncate text-[11px] font-bold text-[#203442]/65">{label}</div>
    </Link>
  );
}

function PendingMetricCard({ label, isArabic }: { label: string; isArabic: boolean }) {
  return (
    <div className="min-h-[118px] rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDEFF2]/60 text-[#0E7C86]">
          <Activity className="h-4 w-4" />
        </div>
        <span className="rounded-full bg-[#FAF7F0] px-2 py-1 text-[9px] font-black text-[#203442]/55">
          {isArabic ? 'غير مقاس بعد' : 'Not measured yet'}
        </span>
      </div>
      <div className="mt-4 text-2xl font-black text-[#142B5F]">—</div>
      <div className="mt-1 text-[11px] font-bold leading-5 text-[#203442]/65">{label}</div>
    </div>
  );
}

function CatalogRow({
  label,
  href,
  icon,
  stats,
  formatNumber,
  isArabic,
  last = false,
}: {
  label: string;
  href: string;
  icon: ReactNode;
  stats: DomainStat;
  formatNumber: (value: number | null | undefined) => string;
  isArabic: boolean;
  last?: boolean;
}) {
  return (
    <Link to={href} className={`grid gap-3 px-5 py-4 transition hover:bg-[#DDEFF2]/30 sm:grid-cols-[1.5fr_repeat(3,minmax(90px,0.55fr))_auto] sm:items-center ${last ? '' : 'border-b border-[#DDEFF2]'}`}>
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#DDEFF2]/60 text-[#0E7C86]">{icon}</div>
        <span className="truncate text-sm font-black text-[#142B5F]">{label}</span>
      </div>
      <CatalogValue label={isArabic ? 'الإجمالي' : 'Total'} value={formatNumber(stats.total)} />
      <CatalogValue label={isArabic ? 'منشور' : 'Published'} value={formatNumber(stats.published)} />
      <CatalogValue label={isArabic ? 'للمراجعة' : 'Review'} value={formatNumber(stats.review)} warning={(stats.review ?? 0) > 0} />
      <span className={`hidden rounded-full px-2.5 py-1 text-[10px] font-black sm:inline-flex ${stats.state === 'ready' ? 'bg-[#DDEFF2]/60 text-[#0E7C86]' : 'bg-[#FAF7F0] text-[#203442]/55'}`}>
        {stats.state === 'ready' ? (isArabic ? 'متصل' : 'Live') : (isArabic ? 'غير متاح' : 'Unavailable')}
      </span>
    </Link>
  );
}

function CatalogValue({ label, value, warning = false }: { label: string; value: string; warning?: boolean }) {
  return (
    <div>
      <div className="text-[9px] font-bold text-[#203442]/45">{label}</div>
      <div className={`mt-0.5 text-sm font-black ${warning ? 'text-[#D6A43B]' : 'text-[#203442]'}`}>{value}</div>
    </div>
  );
}

function SystemHealthCard({ snapshot, isArabic }: { snapshot: SystemSnapshot; isArabic: boolean }) {
  const rows = [
    { label: 'API', status: snapshot.api },
    { label: isArabic ? 'قاعدة البيانات' : 'Database', status: snapshot.database },
    { label: 'Redis / Queues', status: snapshot.redis },
  ];
  return (
    <div className="rounded-3xl border border-[#DDEFF2] bg-[#142B5F] p-5 text-white shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-[#F2CD78]">{isArabic ? 'البنية التشغيلية' : 'Runtime'}</p>
          <h2 className="mt-1 text-xl font-black">{isArabic ? 'صحة النظام' : 'System health'}</h2>
        </div>
        <HeartPulse className="h-6 w-6 text-[#21A7B4]" />
      </div>
      <div className="mt-5 space-y-2">
        {rows.map((row) => (
          <div key={row.label} className="flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-3 py-2.5">
            <span className="text-xs font-bold text-[#DDEFF2]">{row.label}</span>
            <span className="flex items-center gap-2 text-[11px] font-black"><StatusDot status={row.status} />{healthLabel(row.status, isArabic)}</span>
          </div>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-white/10 p-3 text-center">
          <div className="text-xl font-black text-[#F2CD78]">{snapshot.blockers ?? '—'}</div>
          <div className="mt-1 text-[10px] font-bold text-[#DDEFF2]">{isArabic ? 'معوقات الإنتاج' : 'Blockers'}</div>
        </div>
        <div className="rounded-xl bg-white/10 p-3 text-center">
          <div className="text-xl font-black text-[#F2CD78]">{snapshot.warnings ?? '—'}</div>
          <div className="mt-1 text-[10px] font-bold text-[#DDEFF2]">{isArabic ? 'تحذيرات' : 'Warnings'}</div>
        </div>
      </div>
      <Link to="/health-readiness" className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#21A7B4] px-4 py-2.5 text-xs font-black text-white transition hover:bg-[#0E7C86]">
        {isArabic ? 'فتح الصحة والجاهزية' : 'Open health & readiness'}
      </Link>
    </div>
  );
}

function ImportCard({ snapshot, isArabic, formatNumber }: { snapshot: ImportSnapshot; isArabic: boolean; formatNumber: (value: number | null | undefined) => string }) {
  const latestStatus = snapshot.latestBatch?.batchStatus ?? snapshot.latestBatch?.status ?? null;
  return (
    <div className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-[#0E7C86]">{isArabic ? 'العمليات' : 'Operations'}</p>
          <h2 className="mt-1 text-xl font-black text-[#142B5F]">{isArabic ? 'الاستيراد والبيانات الجديدة' : 'Imports & new data'}</h2>
        </div>
        <Database className="h-6 w-6 text-[#21A7B4]" />
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-6">
        <MiniMetric label={isArabic ? 'الدفعات' : 'Batches'} value={formatNumber(snapshot.batches)} />
        <MiniMetric label={isArabic ? 'السجلات' : 'Records'} value={formatNumber(snapshot.records)} />
        <MiniMetric label={isArabic ? 'مراجعة' : 'Review'} value={formatNumber(sumNullable(snapshot.needsReview, snapshot.incomplete))} warn />
        <MiniMetric label={isArabic ? 'فشل' : 'Failed'} value={formatNumber(snapshot.failed)} warn={(snapshot.failed ?? 0) > 0} />
        <MiniMetric label={isArabic ? 'نُقل' : 'Promoted'} value={formatNumber(snapshot.promoted)} />
        <MiniMetric label={isArabic ? 'آخر حالة' : 'Latest'} value={latestStatus ? shortStatus(latestStatus) : '—'} />
      </div>
      {snapshot.latestBatch && (
        <div className="mt-4 rounded-2xl bg-[#FAF7F0] px-4 py-3 text-xs leading-6 text-[#203442]/75">
          <span className="font-black text-[#142B5F]">{isArabic ? 'آخر دفعة:' : 'Latest batch:'}</span>{' '}
          {snapshot.latestBatch.sourceSystem || snapshot.latestBatch.dataType || snapshot.latestBatch.id || '—'}
          {(snapshot.latestBatch.createdAt || snapshot.latestBatch.updatedAt) && (
            <span className="mx-2 text-[#203442]/35">•</span>
          )}
          {snapshot.latestBatch.createdAt || snapshot.latestBatch.updatedAt ? new Date(snapshot.latestBatch.createdAt ?? snapshot.latestBatch.updatedAt ?? '').toLocaleString(isArabic ? 'ar' : 'en-US') : ''}
        </div>
      )}
      <Link to="/imports" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#0E7C86] hover:text-[#142B5F]">
        {isArabic ? 'فتح مركز الاستيراد' : 'Open import center'}
      </Link>
    </div>
  );
}

function FinanceCard({ overview, isArabic, formatNumber }: { overview: FinanceOverview | null; isArabic: boolean; formatNumber: (value: number | null | undefined) => string }) {
  return (
    <div className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-black uppercase tracking-wider text-[#D6A43B]">{isArabic ? 'التشغيل التجاري' : 'Commercial operations'}</p>
          <h2 className="mt-1 text-xl font-black text-[#142B5F]">{isArabic ? 'المالية والمدفوعات' : 'Finance & payments'}</h2>
        </div>
        <WalletCards className="h-6 w-6 text-[#D6A43B]" />
      </div>
      {overview ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <MiniMetric label={isArabic ? 'مدفوعات معلقة' : 'Pending payments'} value={formatNumber(overview.pendingPayments)} warn={(overview.pendingPayments ?? 0) > 0} />
            <MiniMetric label={isArabic ? 'تحويلات معلقة' : 'Pending transfers'} value={formatNumber(overview.pendingTransfers)} warn={(overview.pendingTransfers ?? 0) > 0} />
            <MiniMetric label={isArabic ? 'اعتمادات معلقة' : 'Approvals'} value={formatNumber(overview.pendingApprovals)} warn={(overview.pendingApprovals ?? 0) > 0} />
            <MiniMetric label={isArabic ? 'المطابقة' : 'Reconciliation'} value={shortStatus(overview.reconciliationHealth)} warn={overview.reconciliationHealth !== 'HEALTHY'} />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-[#DDEFF2]/45 px-4 py-3 text-xs font-bold text-[#203442]/75">
            <CheckCircle2 className="h-4 w-4 text-[#0E7C86]" />
            <span>{isArabic ? 'الملخص يُقرأ من Finance Overview الفعلي.' : 'Summary is read from the live Finance Overview endpoint.'}</span>
          </div>
        </>
      ) : (
        <div className="mt-4 rounded-2xl bg-[#FAF7F0] p-6 text-center text-xs font-bold text-[#203442]/55">
          {isArabic ? 'مصدر المالية غير متاح لهذه الجلسة.' : 'Finance source is unavailable for this session.'}
        </div>
      )}
      <Link to="/finance" className="mt-4 inline-flex items-center gap-2 text-xs font-black text-[#0E7C86] hover:text-[#142B5F]">
        {isArabic ? 'فتح الإدارة المالية' : 'Open finance'}
      </Link>
    </div>
  );
}

function MiniMetric({ label, value, warn = false }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/65 px-3 py-3 text-center">
      <div className={`truncate text-base font-black ${warn ? 'text-[#D6A43B]' : 'text-[#142B5F]'}`}>{value}</div>
      <div className="mt-1 truncate text-[9px] font-bold text-[#203442]/55">{label}</div>
    </div>
  );
}

function shortStatus(value: string) {
  return value.replaceAll('_', ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function DashboardSkeleton() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {Array.from({ length: 8 }).map((_, index) => (
          <div key={index} className="h-[132px] animate-pulse rounded-2xl border border-[#DDEFF2] bg-white p-4">
            <div className="h-9 w-9 rounded-xl bg-[#DDEFF2]/70" />
            <div className="mt-4 h-7 w-16 rounded bg-[#DDEFF2]/70" />
            <div className="mt-2 h-3 w-20 rounded bg-[#DDEFF2]/45" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
        <div className="h-80 animate-pulse rounded-3xl border border-[#DDEFF2] bg-white" />
        <div className="h-80 animate-pulse rounded-3xl bg-[#142B5F]/90" />
      </div>
    </div>
  );
}

function accentClass(accent: string) {
  if (accent === '#0E7C86') return { bar: 'bg-[#0E7C86]', icon: 'bg-[#0E7C86]/10 text-[#0E7C86]' };
  if (accent === '#D6A43B') return { bar: 'bg-[#D6A43B]', icon: 'bg-[#D6A43B]/10 text-[#D6A43B]' };
  if (accent === '#21A7B4') return { bar: 'bg-[#21A7B4]', icon: 'bg-[#21A7B4]/10 text-[#21A7B4]' };
  if (accent === '#B94A48') return { bar: 'bg-[#B94A48]', icon: 'bg-[#B94A48]/10 text-[#B94A48]' };
  return { bar: 'bg-[#142B5F]', icon: 'bg-[#142B5F]/10 text-[#142B5F]' };
}
