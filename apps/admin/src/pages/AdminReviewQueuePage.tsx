import { useCallback, useEffect, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileSpreadsheet,
  Filter,
  Globe2,
  Eye,
  X,
  ExternalLink,
  History,
  GitCompareArrows,
  CopyCheck,
  TimerReset,
  Database,
  Languages,
  Loader2,
  RefreshCw,
  Search,
  School,
  ShieldCheck,
  Sparkles,
  Tag,
  Wrench,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

const REVIEW_SLA_HOURS: Record<Priority, number> = { critical: 4, high: 24, medium: 72, low: 168 };

type DomainKey = 'scholarships' | 'universities' | 'majors' | 'courses' | 'tests' | 'services' | 'cms';
type ReasonKey =
  | 'workflow_review'
  | 'incomplete'
  | 'ready_to_publish'
  | 'imported_unreviewed'
  | 'needs_translation'
  | 'source_verification'
  | 'broken_link'
  | 'potential_duplicate'
  | 'import_conflict'
  | 'reimport_changed'
  | 'expired_data'
  | 'ai_human_review';
type Priority = 'critical' | 'high' | 'medium' | 'low';
type SourceKind = 'imported' | 'manual' | 'cms' | 'unknown';
type AgeBucket = 'today' | 'week' | 'older' | 'unknown';
type Availability = 'ready' | 'partial' | 'unavailable';
type SavedView = 'all' | 'urgent' | 'overdue' | 'imported_today' | 'translation' | 'source' | 'duplicates' | 'ready';
type SlaState = 'on_track' | 'due_soon' | 'overdue' | 'unknown';

type AuditRecordView = {
  id?: string;
  action?: string;
  category?: string;
  severity?: string;
  actor?: { actorId?: string; actorType?: string };
  target?: { targetId?: string; targetType?: string };
  timestamp?: string;
  contextMetadata?: Record<string, unknown>;
};

type DiffFieldView = {
  field: string;
  currentValue: unknown;
  incomingValue: unknown;
  state: string;
};

type ImportDiffView = {
  recordId?: string;
  existingScholarshipId?: string | null;
  fields?: DiffFieldView[];
};

type PaginatedResponse<T = Record<string, unknown>> = {
  data?: T[];
  total?: number;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  overview?: ImportedCourseOverview;
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

type ScholarshipImportCenterRecord = {
  id: string;
  batchId: string;
  sourceSystem: string;
  sourceRowNumber?: number | null;
  importStatus: string;
  operationalClass?: string;
  rawSourceTitle?: string | null;
  cleanedScholarshipName?: string | null;
  completeness?: { state?: string; missingFields?: string[] };
  dedupe?: { state?: string; requiresReview?: boolean; matchIds?: string[] };
  verification?: { state?: string; sourceTraceable?: boolean };
  reviewReasons?: string[];
  promotedEntityId?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
};

type ScholarshipImportCenterScan = {
  data?: ScholarshipImportCenterRecord[];
  countsExact?: boolean;
  scanTruncated?: boolean;
  scannedRecords?: number;
  sourceTotal?: number;
};

type ScholarshipImportCenterOverview = {
  duplicateRecords?: number;
  updateRecords?: number;
  conflicts?: number;
  needsReview?: number;
};

type DomainSummary = {
  key: DomainKey;
  workflowReview: number | null;
  incomplete: number | null;
  readyToPublish: number | null;
  imported: number | null;
  needsTranslation: number | null;
  sourceVerification: number | null;
  brokenLinks: number | null;
  availability: Availability;
  errors: string[];
};

type ReviewItem = {
  id: string;
  itemKind: 'canonical' | 'import_record';
  domainKey: DomainKey;
  title: string;
  href: string;
  status?: string | null;
  completenessStatus?: string | null;
  reasons: ReasonKey[];
  priority: Priority;
  sourceKind: SourceKind;
  sourceLabel?: string | null;
  sourceUrl?: string | null;
  sourceImportRecordId?: string | null;
  importBatchId?: string | null;
  sourceFileName?: string | null;
  sourceRowNumber?: string | number | null;
  rawSourceTitle?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  deadline?: string | null;
  verificationStatus?: string | null;
  translationState?: string | null;
  missingFields: string[];
  duplicateStatus?: string | null;
  conflictingFields: string[];
  reviewNotes: string[];
  reviewerLabel?: string | null;
  auditTargetId?: string | null;
};

type DomainDefinition = {
  key: DomainKey;
  labelAr: string;
  labelEn: string;
  path: string;
  icon: ComponentType<{ className?: string }>;
};

const DOMAINS: DomainDefinition[] = [
  { key: 'scholarships', labelAr: 'المنح الدراسية', labelEn: 'Scholarships', path: '/scholarships', icon: Sparkles },
  { key: 'universities', labelAr: 'الجامعات', labelEn: 'Universities', path: '/universities', icon: School },
  { key: 'majors', labelAr: 'التخصصات', labelEn: 'Majors', path: '/majors', icon: BookOpen },
  { key: 'courses', labelAr: 'الدورات التدريبية', labelEn: 'Courses', path: '/courses', icon: FileCheck2 },
  { key: 'tests', labelAr: 'الاختبارات الدولية', labelEn: 'International Tests', path: '/international-tests', icon: Globe2 },
  { key: 'services', labelAr: 'الخدمات', labelEn: 'Services', path: '/services', icon: Wrench },
  { key: 'cms', labelAr: 'المحتوى CMS', labelEn: 'CMS Content', path: '/cms', icon: Tag },
];

const EMPTY_SUMMARIES: Record<DomainKey, DomainSummary> = Object.fromEntries(
  DOMAINS.map(({ key }) => [key, emptyDomainSummary(key)]),
) as Record<DomainKey, DomainSummary>;

export function AdminReviewQueuePage() {
  const { language, dir } = useTranslation();
  const isArabic = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const tr = (ar: string, en: string) => (isArabic ? ar : en);
  const numberFormatter = useMemo(() => new Intl.NumberFormat(isArabic ? 'ar' : 'en-US'), [isArabic]);
  const formatNumber = (value: number | null | undefined) => value == null ? '—' : numberFormatter.format(value);

  const [summaries, setSummaries] = useState<Record<DomainKey, DomainSummary>>(EMPTY_SUMMARIES);
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDomain, setSelectedDomain] = useState<'all' | DomainKey>('all');
  const [selectedReason, setSelectedReason] = useState<'all' | ReasonKey>('all');
  const [selectedPriority, setSelectedPriority] = useState<'all' | Priority>('all');
  const [selectedSource, setSelectedSource] = useState<'all' | SourceKind>('all');
  const [selectedAge, setSelectedAge] = useState<'all' | AgeBucket>('all');
  const [sortMode, setSortMode] = useState<'priority' | 'newest' | 'oldest'>('priority');
  const [listPage, setListPage] = useState(1);
  const [savedView, setSavedView] = useState<SavedView>('all');
  const [selectedItem, setSelectedItem] = useState<ReviewItem | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [auditHistory, setAuditHistory] = useState<AuditRecordView[]>([]);
  const [importDiff, setImportDiff] = useState<ImportDiffView | null>(null);
  const [importOverview, setImportOverview] = useState<ScholarshipImportCenterOverview | null>(null);
  const LIST_PAGE_SIZE = 40;

  const loadQueue = useCallback(async (manual = false) => {
    manual ? setRefreshing(true) : setLoading(true);

    const [summaryResult, itemResult, importOverviewResult] = await Promise.all([
      loadAllDomainSummaries(),
      loadRecentReviewItems(),
      loadScholarshipImportOverview(),
    ]);

    setSummaries(summaryResult);
    setItems(itemResult);
    setImportOverview(importOverviewResult);
    setLastUpdated(new Date());
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    void loadQueue(false);
  }, [loadQueue]);

  useEffect(() => {
    if (!selectedItem) {
      setAuditHistory([]);
      setImportDiff(null);
      setPreviewError(null);
      return;
    }
    let active = true;
    setPreviewLoading(true);
    setPreviewError(null);
    Promise.allSettled([
      loadAuditHistory(selectedItem),
      loadImportDiff(selectedItem),
    ]).then(([auditResult, diffResult]) => {
      if (!active) return;
      if (auditResult.status === 'fulfilled') setAuditHistory(auditResult.value);
      else setAuditHistory([]);
      if (diffResult.status === 'fulfilled') setImportDiff(diffResult.value);
      else setImportDiff(null);
      if (auditResult.status === 'rejected' && diffResult.status === 'rejected') {
        setPreviewError(tr('تعذر تحميل البيانات الإضافية للمعاينة، لكن بيانات القائمة الأساسية ما زالت متاحة.', 'Extra preview data could not be loaded, but core queue data remains available.'));
      }
    }).finally(() => {
      if (active) setPreviewLoading(false);
    });
    return () => { active = false; };
  }, [selectedItem]);

  const sourceConnectedCount = useMemo(
    () => DOMAINS.filter((domain) => summaries[domain.key].availability !== 'unavailable').length,
    [summaries],
  );
  const sourceUnavailableCount = useMemo(
    () => DOMAINS.filter((domain) => summaries[domain.key].availability === 'unavailable').length,
    [summaries],
  );

  const standardTotals = useMemo(() => ({
    workflowReview: sumRequired(DOMAINS.map((domain) => summaries[domain.key].workflowReview)),
    incomplete: sumRequired([
      summaries.scholarships.incomplete,
      summaries.universities.incomplete,
      summaries.majors.incomplete,
      summaries.courses.incomplete,
      summaries.tests.incomplete,
      summaries.services.incomplete,
    ]),
    readyToPublish: sumRequired(DOMAINS.map((domain) => summaries[domain.key].readyToPublish)),
    imported: sumRequired([
      summaries.scholarships.imported,
      summaries.universities.imported,
      summaries.majors.imported,
      summaries.courses.imported,
      summaries.tests.imported,
    ]),
  }), [summaries]);

  const qualityTotals = useMemo(() => ({
    scholarshipTranslation: summaries.scholarships.needsTranslation,
    sourceVerification: sumRequired([
      summaries.scholarships.sourceVerification,
      summaries.courses.sourceVerification,
    ]),
    brokenLinks: summaries.courses.brokenLinks,
  }), [summaries]);

  const slaTotals = useMemo(() => ({
    overdue: items.filter((item) => slaInfo(item).state === 'overdue').length,
    dueSoon: items.filter((item) => slaInfo(item).state === 'due_soon').length,
  }), [items]);

  const visibleItems = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLocaleLowerCase();
    const filtered = items.filter((item) => {
      if (selectedDomain !== 'all' && item.domainKey !== selectedDomain) return false;
      if (selectedReason !== 'all' && !item.reasons.includes(selectedReason)) return false;
      if (selectedPriority !== 'all' && item.priority !== selectedPriority) return false;
      if (selectedSource !== 'all' && item.sourceKind !== selectedSource) return false;
      if (selectedAge !== 'all' && ageBucket(item.updatedAt) !== selectedAge) return false;
      if (savedView === 'urgent' && item.priority !== 'critical' && item.priority !== 'high') return false;
      if (savedView === 'overdue' && slaInfo(item).state !== 'overdue') return false;
      if (savedView === 'imported_today' && !(item.sourceKind === 'imported' && ageBucket(item.updatedAt) === 'today')) return false;
      if (savedView === 'translation' && !item.reasons.includes('needs_translation')) return false;
      if (savedView === 'source' && !item.reasons.includes('source_verification')) return false;
      if (savedView === 'duplicates' && !item.reasons.some((reason) => reason === 'potential_duplicate' || reason === 'import_conflict' || reason === 'reimport_changed')) return false;
      if (savedView === 'ready' && !item.reasons.includes('ready_to_publish')) return false;
      if (normalizedQuery) {
        const haystack = [item.title, item.id, item.status, item.completenessStatus, item.sourceLabel]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase();
        if (!haystack.includes(normalizedQuery)) return false;
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      if (sortMode === 'priority') {
        const difference = priorityRank(a.priority) - priorityRank(b.priority);
        if (difference !== 0) return difference;
        return oldestTimestamp(a.updatedAt) - oldestTimestamp(b.updatedAt);
      }
      if (sortMode === 'oldest') return oldestTimestamp(a.updatedAt) - oldestTimestamp(b.updatedAt);
      return newestTimestamp(b.updatedAt) - newestTimestamp(a.updatedAt);
    });
  }, [items, savedView, searchQuery, selectedAge, selectedDomain, selectedPriority, selectedReason, selectedSource, sortMode]);

  useEffect(() => {
    setListPage(1);
  }, [savedView, searchQuery, selectedAge, selectedDomain, selectedPriority, selectedReason, selectedSource, sortMode]);

  const totalListPages = Math.max(1, Math.ceil(visibleItems.length / LIST_PAGE_SIZE));
  const pagedItems = useMemo(
    () => visibleItems.slice((listPage - 1) * LIST_PAGE_SIZE, listPage * LIST_PAGE_SIZE),
    [visibleItems, listPage],
  );

  const clearFilters = () => {
    setSearchQuery('');
    setSelectedDomain('all');
    setSelectedReason('all');
    setSelectedPriority('all');
    setSelectedSource('all');
    setSelectedAge('all');
    setSortMode('priority');
    setSavedView('all');
  };

  return (
    <main
      dir={dir}
      className="min-h-screen rounded-[28px] p-0 text-slate-900"
      
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <header
          className="relative overflow-hidden rounded-[28px] px-5 py-6 text-white shadow-lg sm:px-7 sm:py-7"
          
        >
          <div className="pointer-events-none absolute -left-16 -top-20 h-56 w-56 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -right-10 h-60 w-60 rounded-full bg-[#F2CD78]/15 blur-3xl" />
          <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-xs font-extrabold text-[#F2CD78] sm:text-sm">
                <ShieldCheck className="h-4 w-4" />
                {tr('مركز العمل الإداري · قراءة وتجميع فقط', 'Administration work center · aggregate read-only view')}
              </div>
              <h1 className="text-2xl font-black sm:text-4xl">{tr('قائمة المراجعة', 'Review Queue')}</h1>
              <p className="mt-2 max-w-3xl text-sm font-medium leading-7 text-white/80">
                {tr(
                  'تجمع إشارات المراجعة الحقيقية من مجالات منارتك، وترتبها حسب السبب والأولوية والعمر، ثم تنقلك إلى مساحة المجال الأصلية لإتمام الإجراء.',
                  'Aggregates real review signals across MANARATAK domains, prioritizes them, and hands work back to the owning domain workspace.',
                )}
              </p>
            </div>

            <div className="flex flex-wrap items-stretch gap-3">
              <div className="min-w-[138px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-[11px] font-bold text-white/65">{tr('مصادر متصلة', 'Connected sources')}</div>
                <div className="mt-1 text-2xl font-black text-[#F2CD78]">{sourceConnectedCount}/{DOMAINS.length}</div>
              </div>
              <div className="min-w-[160px] rounded-2xl border border-white/15 bg-white/10 px-4 py-3 backdrop-blur-sm">
                <div className="text-[11px] font-bold text-white/65">{tr('آخر تحديث', 'Last refresh')}</div>
                <div className="mt-1 text-sm font-black text-white">
                  {lastUpdated ? formatDateTime(lastUpdated, isArabic) : '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => void loadQueue(true)}
                disabled={loading || refreshing}
                className="inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black shadow-sm transition hover:bg-[#FAF7F0] disabled:opacity-60"
               
              >
                <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
                {tr('تحديث', 'Refresh')}
              </button>
            </div>
          </div>
        </header>

        <section className="flex items-start gap-3 rounded-2xl border border-[#D6A43B]/30 bg-[#F2CD78]/15 p-4 text-sm leading-7 text-[#203442]">
          <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-[#D6A43B]" />
          <div>
            <div className="font-black">{tr('حدود قائمة المراجعة', 'Review Queue boundary')}</div>
            <p className="mt-1 text-xs font-medium leading-6 text-slate-600">
              {tr(
                'هذه الصفحة لا تعدّل ولا تنشر ولا تحذف أي سجل. الإجراء الآمن الوحيد هنا هو فتح السجل في مساحة المجال المالكة. بذلك تبقى المنح والجامعات والتخصصات والدورات والاختبارات والخدمات وCMS هي مصدر الحقيقة الوحيد للتعديل والاعتماد.',
                'This page never edits, publishes, or deletes records. Its only record-level action is to open the owning domain workspace, preserving domain single-source-of-truth boundaries.',
              )}
            </p>
          </div>
        </section>

        {sourceUnavailableCount > 0 && (
          <section className="flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-900">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <div>
              <div className="font-black">{tr('بعض مصادر المجالات غير متاحة', 'Some domain sources are unavailable')}</div>
              <p className="mt-1 text-xs leading-6">
                {tr(
                  'لن يتم تحويل فشل الاتصال إلى صفر. أي مجال تعذر قراءته سيظهر بوضوح كـ «غير متاح» حتى لا يعطي المدير انطباعًا خاطئًا بأن قائمة المراجعة فارغة.',
                  'A failed source is never converted to zero. Unavailable domains remain explicitly unavailable so the queue cannot falsely appear empty.',
                )}
              </p>
            </div>
          </section>
        )}

        <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#142B5F]">{tr('إشارات دورة المراجعة', 'Review lifecycle signals')}</h2>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {tr('الأعداد مأخوذة من فلاتر المجال على الخادم، وليست محسوبة من أول صفحة سجلات.', 'Counts come from server-side domain filters, not from the first page of records.')}
              </p>
            </div>
            <span className="rounded-full bg-[#DDEFF2]/60 px-3 py-1 text-[11px] font-bold text-[#0E7C86]">
              {tr('قد يحمل السجل أكثر من إشارة مراجعة', 'A record may carry more than one review signal')}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-3 xl:grid-cols-6">
            <MetricCard icon={Clock3} label={tr('قيد المراجعة', 'In review')} value={formatNumber(standardTotals.workflowReview)} tone="primary" />
            <MetricCard icon={AlertTriangle} label={tr('بيانات ناقصة', 'Incomplete')} value={formatNumber(standardTotals.incomplete)} tone="warning" />
            <MetricCard icon={CheckCircle2} label={tr('جاهز للنشر', 'Ready to publish')} value={formatNumber(standardTotals.readyToPublish)} tone="success" />
            <MetricCard icon={FileSpreadsheet} label={tr('مستورد بانتظار المراجعة', 'Imported awaiting review')} value={formatNumber(standardTotals.imported)} tone="digital" />
            <MetricCard icon={TimerReset} label={tr('متجاوز SLA', 'SLA overdue')} value={formatNumber(slaTotals.overdue)} tone="warning" />
            <MetricCard icon={Clock3} label={tr('يقترب من SLA', 'SLA due soon')} value={formatNumber(slaTotals.dueSoon)} tone="digital" />
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1.25fr_1fr]">
          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-black text-[#142B5F]">{tr('إشارات الجودة المتخصصة', 'Specialized quality signals')}</h2>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                {tr('تعرض فقط القياسات التي يملك لها المجال مصدرًا حقيقيًا؛ لا يتم اختراع تجميع غير متاح.', 'Only domain-backed measurements are shown; unsupported aggregates are never fabricated.')}
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <QualityCard
                icon={Languages}
                label={tr('منح تحتاج ترجمة', 'Scholarships needing translation')}
                value={formatNumber(qualityTotals.scholarshipTranslation)}
                detail={tr('الجامعات والتخصصات تدار أيضًا من مساحة الترجمات', 'Universities and majors are also handled in Translation Workspace')}
                href="/translations"
              />
              <QualityCard
                icon={ShieldCheck}
                label={tr('تحقق المصدر', 'Source verification')}
                value={formatNumber(qualityTotals.sourceVerification)}
                detail={tr('المتاح حاليًا من المنح والدورات المستوردة', 'Currently sourced from scholarships and imported courses')}
              />
              <QualityCard
                icon={AlertCircle}
                label={tr('روابط دورات معطلة', 'Broken course links')}
                value={formatNumber(qualityTotals.brokenLinks)}
                detail={tr('من كتالوج الدورات المستوردة الحقيقي', 'From the real imported-course catalog')}
                href="/courses"
              />
              <QualityCard
                icon={CopyCheck}
                label={tr('تكرارات استيراد المنح', 'Scholarship import duplicates')}
                value={formatNumber(importOverview?.duplicateRecords)}
                detail={tr('من مركز استيراد المنح الحقيقي قبل النقل للكتالوج', 'From the real scholarship import center before transfer')}
                href="/imports/scholarships"
              />
              <QualityCard
                icon={GitCompareArrows}
                label={tr('تعارضات/تحديثات الاستيراد', 'Import conflicts / updates')}
                value={formatNumber(addKnown(importOverview?.conflicts ?? null, importOverview?.updateRecords ?? null))}
                detail={tr('تحتاج مقارنة قبل اعتماد البيانات الجديدة', 'Require comparison before accepting incoming changes')}
                href="/imports/scholarships"
              />
            </div>
          </div>

          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
            <h2 className="text-lg font-black text-[#142B5F]">{tr('قاعدة الأولوية', 'Priority policy')}</h2>
            <div className="mt-4 space-y-3 text-xs leading-6 text-slate-600">
              <PriorityRule tone="critical" title={tr('حرجة', 'Critical')} text={tr('رابط معطل أو تحقق مصدر فاشل/حرج.', 'Broken link or critical source-verification signal.')} />
              <PriorityRule tone="high" title={tr('عالية', 'High')} text={tr('بيانات ناقصة، تحقق مطلوب، أو عنصر عالق أكثر من أسبوع.', 'Incomplete data, verification required, or work older than one week.')} />
              <PriorityRule tone="medium" title={tr('متوسطة', 'Medium')} text={tr('مستورد أو قيد المراجعة أو يحتاج ترجمة.', 'Imported, under review, or needing translation.')} />
              <PriorityRule tone="low" title={tr('منخفضة', 'Low')} text={tr('جاهز للنشر وينتظر قرار الاعتماد فقط.', 'Ready to publish and awaiting final approval only.')} />
              <div className="rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/70 px-3 py-2 text-[10px] font-bold leading-5 text-slate-500">
                {tr('سياسة SLA التشغيلية الحالية: حرجة 4 ساعات · عالية 24 ساعة · متوسطة 72 ساعة · منخفضة 7 أيام. تُحسب من آخر تحديث متاح للسجل إلى أن يضاف وقت دخول الطابور كحقل مستقل في كل مجال.', 'Current operational SLA: Critical 4h · High 24h · Medium 72h · Low 7d. It is calculated from the latest available record timestamp until every domain exposes an explicit queue-entry timestamp.')}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-[#142B5F]">{tr('عبء المراجعة حسب المجال', 'Review workload by domain')}</h2>
              <p className="mt-1 text-xs text-slate-500">{tr('اختر المجال لتصفية القائمة، أو افتح مساحة المجال لإتمام العمل.', 'Select a domain to filter the queue, or open its workspace to complete the work.')}</p>
            </div>
            {selectedDomain !== 'all' && (
              <button type="button" onClick={() => setSelectedDomain('all')} className="text-xs font-black text-[#0E7C86] hover:text-[#142B5F]">
                {tr('عرض كل المجالات', 'Show all domains')}
              </button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
            {DOMAINS.map((domain) => {
              const summary = summaries[domain.key];
              const Icon = domain.icon;
              const label = isArabic ? domain.labelAr : domain.labelEn;
              const signalTotal = sumKnown([
                summary.workflowReview,
                summary.incomplete,
                summary.readyToPublish,
                summary.imported,
                summary.needsTranslation,
                summary.sourceVerification,
                summary.brokenLinks,
              ]);
              const selected = selectedDomain === domain.key;
              return (
                <article
                  key={domain.key}
                  className={`rounded-2xl border p-4 transition ${selected ? 'border-[#0E7C86] ring-2 ring-[#21A7B4]/20' : 'border-[#DDEFF2] hover:border-[#21A7B4]/60'}`}
                  
                >
                  <button type="button" onClick={() => setSelectedDomain(domain.key)} className="w-full text-start">
                    <div className="flex items-start justify-between gap-2">
                      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDEFF2]/60 text-[#0E7C86]">
                        <Icon className="h-4 w-4" />
                      </span>
                      <AvailabilityDot state={summary.availability} tr={tr} />
                    </div>
                    <div className="mt-3 text-sm font-black text-[#203442]">{label}</div>
                    <div className="mt-1 text-2xl font-black text-[#142B5F]">{formatNumber(signalTotal)}</div>
                    <div className="text-[10px] font-bold text-slate-400">{tr('إشارة مراجعة', 'review signals')}</div>
                  </button>
                  <div className="mt-3 border-t border-slate-100 pt-3 text-[10px] font-bold leading-5 text-slate-500">
                    <div className="flex justify-between"><span>{tr('مراجعة', 'Review')}</span><span>{formatNumber(summary.workflowReview)}</span></div>
                    <div className="flex justify-between"><span>{tr('ناقص', 'Incomplete')}</span><span>{formatNumber(summary.incomplete)}</span></div>
                    <div className="flex justify-between"><span>{tr('جاهز', 'Ready')}</span><span>{formatNumber(summary.readyToPublish)}</span></div>
                  </div>
                  <Link to={domain.path} className="mt-3 inline-flex min-h-9 w-full items-center justify-center gap-1 rounded-xl bg-[#142B5F] px-2 text-[10px] font-black text-white hover:bg-[#0E7C86]">
                    {tr('فتح المجال', 'Open workspace')} <ArrowIcon className="h-3 w-3" />
                  </Link>
                </article>
              );
            })}
          </div>
        </section>

        <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2 text-sm font-black text-[#142B5F]">
            <Filter className="h-4 w-4 text-[#0E7C86]" />
            {tr('تصفية قائمة الأعمال المعلقة', 'Filter pending work')}
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {[
              ['all', tr('الكل', 'All')],
              ['urgent', tr('عاجل', 'Urgent')],
              ['overdue', tr('متأخر', 'Overdue')],
              ['imported_today', tr('مستورد اليوم', 'Imported today')],
              ['translation', tr('يحتاج ترجمة', 'Needs translation')],
              ['source', tr('تحقق المصدر', 'Source verification')],
              ['duplicates', tr('تكرار/تعارض', 'Duplicate / conflict')],
              ['ready', tr('جاهز للنشر', 'Ready to publish')],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSavedView(value as SavedView)}
                className={`rounded-full border px-3 py-2 text-[11px] font-black transition ${savedView === value ? 'border-[#0E7C86] bg-[#0E7C86] text-white' : 'border-[#DDEFF2] bg-[#FAF7F0]/70 text-[#203442] hover:border-[#21A7B4]'}`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="relative md:col-span-2">
              <Search className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder={tr('ابحث بالعنوان أو المعرّف أو الحالة...', 'Search title, ID, or status...')}
                className="min-h-11 w-full rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/60 pr-10 pl-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
              />
            </label>
            <SelectFilter value={selectedDomain} onChange={(value) => setSelectedDomain(value as 'all' | DomainKey)} label={tr('المجال', 'Domain')} options={[
              ['all', tr('كل المجالات', 'All domains')],
              ...DOMAINS.map((domain) => [domain.key, isArabic ? domain.labelAr : domain.labelEn] as [string, string]),
            ]} />
            <SelectFilter value={selectedReason} onChange={(value) => setSelectedReason(value as 'all' | ReasonKey)} label={tr('سبب المراجعة', 'Review reason')} options={[
              ['all', tr('كل الأسباب', 'All reasons')],
              ['workflow_review', tr('قيد المراجعة', 'In review')],
              ['incomplete', tr('بيانات ناقصة', 'Incomplete')],
              ['ready_to_publish', tr('جاهز للنشر', 'Ready to publish')],
              ['imported_unreviewed', tr('مستورد ولم يراجع', 'Imported unreviewed')],
              ['needs_translation', tr('يحتاج ترجمة', 'Needs translation')],
              ['source_verification', tr('تحقق المصدر', 'Source verification')],
              ['broken_link', tr('رابط معطل', 'Broken link')],
              ['potential_duplicate', tr('تكرار محتمل', 'Potential duplicate')],
              ['import_conflict', tr('تعارض استيراد', 'Import conflict')],
              ['reimport_changed', tr('تغيّر عند إعادة الاستيراد', 'Re-import changed')],
              ['expired_data', tr('بيانات منتهية', 'Expired data')],
              ['ai_human_review', tr('مسودة AI تحتاج مراجعة بشرية', 'AI draft needs human review')],
            ]} />
            <SelectFilter value={selectedPriority} onChange={(value) => setSelectedPriority(value as 'all' | Priority)} label={tr('الأولوية', 'Priority')} options={[
              ['all', tr('كل الأولويات', 'All priorities')],
              ['critical', tr('حرجة', 'Critical')],
              ['high', tr('عالية', 'High')],
              ['medium', tr('متوسطة', 'Medium')],
              ['low', tr('منخفضة', 'Low')],
            ]} />
            <SelectFilter value={selectedSource} onChange={(value) => setSelectedSource(value as 'all' | SourceKind)} label={tr('المصدر', 'Source')} options={[
              ['all', tr('كل المصادر', 'All sources')],
              ['imported', tr('مستورد', 'Imported')],
              ['manual', tr('يدوي', 'Manual')],
              ['cms', 'CMS'],
              ['unknown', tr('غير محدد', 'Unknown')],
            ]} />
            <SelectFilter value={selectedAge} onChange={(value) => setSelectedAge(value as 'all' | AgeBucket)} label={tr('عمر العنصر', 'Age')} options={[
              ['all', tr('كل الفترات', 'All ages')],
              ['today', tr('اليوم', 'Today')],
              ['week', tr('آخر 7 أيام', 'Last 7 days')],
              ['older', tr('أقدم من 7 أيام', 'Older than 7 days')],
              ['unknown', tr('بدون تاريخ', 'No timestamp')],
            ]} />
            <SelectFilter value={sortMode} onChange={(value) => setSortMode(value as 'priority' | 'newest' | 'oldest')} label={tr('الترتيب', 'Sort')} options={[
              ['priority', tr('الأولوية ثم الأقدم', 'Priority then oldest')],
              ['newest', tr('الأحدث أولًا', 'Newest first')],
              ['oldest', tr('الأقدم أولًا', 'Oldest first')],
            ]} />
          </div>
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
            <div className="text-xs font-bold text-slate-500">
              {tr('المعروض الآن:', 'Showing:')} <span className="font-black text-[#142B5F]">{formatNumber(visibleItems.length)}</span>
              <span className="mx-2 text-slate-300">•</span>
              {tr('القائمة أدناه قائمة تشغيلية كاملة عبر جميع صفحات المصادر المتاحة؛ الأعداد العليا تلخص العبء نفسه.', 'The list below exhausts all available source pages; the metrics above summarize the same workload.')}
            </div>
            <button type="button" onClick={clearFilters} className="rounded-xl border border-[#DDEFF2] px-3 py-2 text-xs font-black text-[#0E7C86] hover:bg-[#DDEFF2]/40">
              {tr('مسح التصفية', 'Clear filters')}
            </button>
          </div>
        </section>

        <section className="overflow-hidden rounded-3xl border border-[#DDEFF2] bg-white shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 p-5">
            <div>
              <h2 className="text-lg font-black text-[#142B5F]">{tr('الأعمال المعلقة', 'Pending work')}</h2>
              <p className="mt-1 text-xs text-slate-500">
                {tr('مرتبة افتراضيًا حسب شدة الإشارة ثم عمر السجل حتى لا تتراكم الأعمال القديمة.', 'Default ordering prioritizes severity and then age so older work does not stagnate.')}
              </p>
            </div>
            <span className="rounded-full bg-[#DDEFF2]/60 px-3 py-1 text-[11px] font-black text-[#0E7C86]">{formatNumber(visibleItems.length)} {tr('عنصر محمل', 'loaded items')}</span>
          </div>

          {loading ? (
            <div className="flex min-h-72 items-center justify-center gap-2 text-sm font-black text-slate-500">
              <Loader2 className="h-6 w-6 animate-spin text-[#0E7C86]" />
              {tr('جاري قراءة مصادر المراجعة الحقيقية...', 'Loading real review sources...')}
            </div>
          ) : visibleItems.length === 0 ? (
            <div className="p-12 text-center">
              <CheckCircle2 className="mx-auto h-9 w-9 text-[#0E7C86]" />
              <h3 className="mt-3 font-black text-[#142B5F]">{tr('لا توجد عناصر مطابقة في القائمة الكاملة', 'No matching items in the exhaustive queue')}</h3>
              <p className="mx-auto mt-2 max-w-xl text-xs leading-6 text-slate-500">
                {tr('تحقق من بطاقات المجالات والأعداد الكاملة أعلاه. إذا كان المجال غير متاح فلن نعرض صفرًا وهميًا.', 'Check domain cards and full counts above. If a domain is unavailable, the page will not show a false zero.')}
              </p>
            </div>
          ) : (
            <>
              <div className="divide-y divide-slate-100">
                {pagedItems.map((item) => (
                  <ReviewRow key={`${item.itemKind}-${item.domainKey}-${item.id}`} item={item} tr={tr} isArabic={isArabic} ArrowIcon={ArrowIcon} onPreview={() => setSelectedItem(item)} />
                ))}
              </div>
              {totalListPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 p-4">
                  <button
                    type="button"
                    disabled={listPage <= 1}
                    onClick={() => setListPage((current) => Math.max(1, current - 1))}
                    className="rounded-xl border border-[#DDEFF2] px-4 py-2 text-xs font-black text-[#0E7C86] disabled:opacity-40"
                  >
                    {tr('السابق', 'Previous')}
                  </button>
                  <span className="text-xs font-black text-slate-500">
                    {tr('الصفحة', 'Page')} {formatNumber(listPage)} / {formatNumber(totalListPages)}
                  </span>
                  <button
                    type="button"
                    disabled={listPage >= totalListPages}
                    onClick={() => setListPage((current) => Math.min(totalListPages, current + 1))}
                    className="rounded-xl bg-[#142B5F] px-4 py-2 text-xs font-black text-white disabled:opacity-40"
                  >
                    {tr('التالي', 'Next')}
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        <section className="rounded-3xl border border-[#DDEFF2] bg-[#DDEFF2]/25 p-5">
          <div className="flex items-start gap-3">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0E7C86]" />
            <div>
              <h2 className="font-black text-[#142B5F]">{tr('ما الذي لا تفعله هذه القائمة؟', 'What this queue intentionally does not do')}</h2>
              <p className="mt-1 text-xs font-medium leading-6 text-slate-600">
                {tr(
                  'لا يوجد «قبول الكل»، ولا نشر جماعي، ولا حذف، ولا تعديل مباشر، ولا تحويل فشل مصدر إلى نجاح. هذا متعمد لحماية دورة الاعتماد وسجل التدقيق ومنع تجاوز قواعد كل مجال.',
                  'There is no approve-all, bulk publishing, deletion, direct editing, or source-failure masking. This protects domain approval lifecycles and auditability.',
                )}
              </p>
            </div>
          </div>
        </section>
      </div>
      {selectedItem && (
        <ReviewPreviewDrawer
          item={selectedItem}
          tr={tr}
          isArabic={isArabic}
          ArrowIcon={ArrowIcon}
          loading={previewLoading}
          error={previewError}
          auditHistory={auditHistory}
          importDiff={importDiff}
          onClose={() => setSelectedItem(null)}
        />
      )}
    </main>
  );
}

function MetricCard({ icon: Icon, label, value, tone }: { icon: ComponentType<{ className?: string }>; label: string; value: string; tone: 'primary' | 'warning' | 'success' | 'digital' }) {
  const styles = {
    primary: 'border-[#142B5F]/15 bg-[#142B5F]/5 text-[#142B5F]',
    warning: 'border-[#D6A43B]/25 bg-[#F2CD78]/15 text-[#8A6517]',
    success: 'border-[#0E7C86]/20 bg-[#0E7C86]/5 text-[#0E7C86]',
    digital: 'border-[#21A7B4]/20 bg-[#DDEFF2]/35 text-[#167984]',
  }[tone];
  return (
    <div className={`rounded-2xl border p-4 ${styles}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs font-black opacity-80">{label}</div>
        <Icon className="h-5 w-5 opacity-80" />
      </div>
      <div className="mt-3 text-3xl font-black">{value}</div>
    </div>
  );
}

function QualityCard({ icon: Icon, label, value, detail, href }: { icon: ComponentType<{ className?: string }>; label: string; value: string; detail: string; href?: string }) {
  const body = (
    <div className="rounded-2xl border border-[#DDEFF2] bg-[#FAF7F0]/45 p-4 transition hover:border-[#21A7B4]/50">
      <div className="flex items-start justify-between gap-3">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#DDEFF2]/70 text-[#0E7C86]"><Icon className="h-4 w-4" /></span>
        <span className="text-2xl font-black text-[#142B5F]">{value}</span>
      </div>
      <div className="mt-3 text-xs font-black text-[#203442]">{label}</div>
      <p className="mt-1 text-[10px] font-medium leading-5 text-slate-500">{detail}</p>
    </div>
  );
  return href ? <Link to={href}>{body}</Link> : body;
}

function PriorityRule({ tone, title, text }: { tone: Priority; title: string; text: string }) {
  const className = {
    critical: 'bg-rose-50 text-rose-800 border-rose-200',
    high: 'bg-amber-50 text-amber-800 border-amber-200',
    medium: 'bg-[#DDEFF2]/50 text-[#0E7C86] border-[#21A7B4]/20',
    low: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  }[tone];
  return <div className={`rounded-xl border px-3 py-2 ${className}`}><span className="font-black">{title}: </span>{text}</div>;
}

function AvailabilityDot({ state, tr }: { state: Availability; tr: (ar: string, en: string) => string }) {
  const config = state === 'ready'
    ? ['bg-emerald-500', tr('متصل', 'Live')]
    : state === 'partial'
      ? ['bg-amber-500', tr('جزئي', 'Partial')]
      : ['bg-rose-500', tr('غير متاح', 'Unavailable')];
  return <span className="inline-flex items-center gap-1 text-[9px] font-black text-slate-500"><span className={`h-2 w-2 rounded-full ${config[0]}`} />{config[1]}</span>;
}

function SelectFilter({ value, onChange, label, options }: { value: string; onChange: (value: string) => void; label: string; options: Array<[string, string]> }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-black text-slate-500">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="min-h-11 w-full rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/60 px-3 text-xs font-bold text-[#203442] outline-none focus:border-[#21A7B4]">
        {options.map(([optionValue, optionLabel]) => <option key={optionValue} value={optionValue}>{optionLabel}</option>)}
      </select>
    </label>
  );
}

function ReviewRow({ item, tr, isArabic, ArrowIcon, onPreview }: { item: ReviewItem; tr: (ar: string, en: string) => string; isArabic: boolean; ArrowIcon: ComponentType<{ className?: string }>; onPreview: () => void }) {
  const domain = DOMAINS.find((entry) => entry.key === item.domainKey)!;
  const DomainIcon = domain.icon;
  const domainLabel = isArabic ? domain.labelAr : domain.labelEn;
  const sla = slaInfo(item);
  return (
    <article className="grid gap-4 p-5 transition hover:bg-[#FAF7F0]/45 lg:grid-cols-[1.55fr_0.8fr_0.8fr_auto] lg:items-center">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <PriorityBadge priority={item.priority} tr={tr} />
          <SlaBadge info={sla} tr={tr} />
          <span className="inline-flex items-center gap-1 rounded-full bg-[#DDEFF2]/55 px-2.5 py-1 text-[10px] font-black text-[#0E7C86]">
            <DomainIcon className="h-3 w-3" /> {domainLabel}
          </span>
          {item.reasons.map((reason) => <ReasonBadge key={reason} reason={reason} tr={tr} />)}
        </div>
        <h3 className="mt-3 text-sm font-black leading-7 text-[#203442]">{item.title}</h3>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[10px] font-bold text-slate-400">
          <span>ID: {item.id}</span>
          <span>{tr('المصدر:', 'Source:')} {sourceLabel(item.sourceKind, tr)}</span>
          {item.sourceLabel ? <span>{item.sourceLabel}</span> : null}
          {item.importBatchId ? <span>Batch: {item.importBatchId}</span> : null}
          {item.missingFields.length > 0 ? <span className="text-amber-700">{tr('ناقص:', 'Missing:')} {item.missingFields.length}</span> : null}
        </div>
      </div>
      <div className="space-y-1 text-xs font-bold text-slate-500">
        <div>{tr('الحالة:', 'Status:')} <span className="text-[#203442]">{formatStatus(item.status, tr)}</span></div>
        <div>{tr('الاكتمال:', 'Completeness:')} <span className="text-[#203442]">{formatStatus(item.completenessStatus, tr)}</span></div>
        <div>{tr('المراجع:', 'Reviewer:')} <span className="text-[#203442]">{item.reviewerLabel || tr('غير معيّن', 'Unassigned')}</span></div>
      </div>
      <div className="space-y-1 text-xs font-bold text-slate-500">
        <div>{tr('آخر تحديث:', 'Updated:')} <span className="text-[#203442]">{item.updatedAt ? formatRelative(item.updatedAt, isArabic) : '—'}</span></div>
        <div>{tr('SLA:', 'SLA:')} <span className={sla.state === 'overdue' ? 'text-rose-700' : 'text-[#203442]'}>{formatSla(sla, isArabic)}</span></div>
        {item.deadline ? <div>{tr('الموعد:', 'Deadline:')} <span className="text-[#203442]">{formatSimpleDate(item.deadline, isArabic)}</span></div> : null}
      </div>
      <div className="flex flex-col gap-2">
        <button type="button" onClick={onPreview} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#0E7C86]/25 bg-[#DDEFF2]/35 px-4 text-xs font-black text-[#0E7C86] transition hover:bg-[#DDEFF2]/70">
          <Eye className="h-4 w-4" /> {tr('معاينة', 'Preview')}
        </button>
        <Link to={item.href} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white transition hover:bg-[#0E7C86]">
          {tr('فتح في المجال', 'Open workspace')} <ArrowIcon className="h-4 w-4" />
        </Link>
      </div>
    </article>
  );
}

function SlaBadge({ info, tr }: { info: ReturnType<typeof slaInfo>; tr: (ar: string, en: string) => string }) {
  const config: Record<SlaState, [string, string]> = {
    overdue: ['bg-rose-100 text-rose-800', tr('SLA متأخر', 'SLA overdue')],
    due_soon: ['bg-amber-100 text-amber-800', tr('SLA قريب', 'SLA due soon')],
    on_track: ['bg-emerald-50 text-emerald-800', tr('ضمن SLA', 'Within SLA')],
    unknown: ['bg-slate-100 text-slate-500', tr('SLA غير محسوب', 'SLA unknown')],
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${config[info.state][0]}`}>{config[info.state][1]}</span>;
}

function ReviewPreviewDrawer({ item, tr, isArabic, ArrowIcon, loading, error, auditHistory, importDiff, onClose }: { item: ReviewItem; tr: (ar: string, en: string) => string; isArabic: boolean; ArrowIcon: ComponentType<{ className?: string }>; loading: boolean; error: string | null; auditHistory: AuditRecordView[]; importDiff: ImportDiffView | null; onClose: () => void }) {
  const domain = DOMAINS.find((entry) => entry.key === item.domainKey)!;
  const sla = slaInfo(item);
  const diffFields = importDiff?.fields ?? [];
  const changedFields = diffFields.filter((field) => field.state !== 'NO_CHANGE');
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-[#142B5F]/35 backdrop-blur-[2px]" onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <aside className="h-full w-full max-w-2xl overflow-y-auto bg-[#FAF7F0] shadow-2xl" dir={isArabic ? 'rtl' : 'ltr'} >
        <div className="sticky top-0 z-10 border-b border-[#DDEFF2] bg-white/95 p-5 backdrop-blur">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge priority={item.priority} tr={tr} />
                <SlaBadge info={sla} tr={tr} />
                {item.reasons.map((reason) => <ReasonBadge key={reason} reason={reason} tr={tr} />)}
              </div>
              <h2 className="mt-3 text-xl font-black text-[#142B5F]">{item.title}</h2>
              <p className="mt-1 text-xs font-bold text-slate-500">{isArabic ? domain.labelAr : domain.labelEn} · {item.itemKind === 'import_record' ? tr('سجل استيراد', 'Import record') : tr('سجل أساسي', 'Canonical record')}</p>
            </div>
            <button type="button" onClick={onClose} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[#DDEFF2] bg-white text-[#203442] hover:bg-[#DDEFF2]/40" aria-label={tr('إغلاق', 'Close')}><X className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <section className="grid gap-3 sm:grid-cols-2">
            <PreviewFact label={tr('الحالة', 'Status')} value={formatStatus(item.status, tr)} />
            <PreviewFact label={tr('الاكتمال', 'Completeness')} value={formatStatus(item.completenessStatus, tr)} />
            <PreviewFact label={tr('العمر', 'Age')} value={item.updatedAt ? formatRelative(item.updatedAt, isArabic) : '—'} />
            <PreviewFact label="SLA" value={formatSla(sla, isArabic)} danger={sla.state === 'overdue'} />
            <PreviewFact label={tr('المراجع', 'Reviewer')} value={item.reviewerLabel || tr('غير معيّن', 'Unassigned')} />
            <PreviewFact label={tr('آخر تحديث', 'Last update')} value={item.updatedAt ? formatSimpleDateTime(item.updatedAt, isArabic) : '—'} />
          </section>

          <section className="rounded-2xl border border-[#DDEFF2] bg-white p-4">
            <div className="mb-3 flex items-center gap-2"><Database className="h-4 w-4 text-[#0E7C86]" /><h3 className="font-black text-[#142B5F]">{tr('المصدر والتتبع', 'Provenance')}</h3></div>
            <div className="grid gap-3 sm:grid-cols-2">
              <PreviewFact label={tr('نوع المصدر', 'Source type')} value={sourceLabel(item.sourceKind, tr)} compact />
              <PreviewFact label={tr('اسم المصدر', 'Source')} value={item.sourceLabel || '—'} compact />
              <PreviewFact label="Batch ID" value={item.importBatchId || '—'} compact mono />
              <PreviewFact label={tr('سجل الاستيراد', 'Import record')} value={item.sourceImportRecordId || '—'} compact mono />
              <PreviewFact label={tr('ملف المصدر', 'Source file')} value={item.sourceFileName || '—'} compact />
              <PreviewFact label={tr('صف المصدر', 'Source row')} value={item.sourceRowNumber == null ? '—' : String(item.sourceRowNumber)} compact />
              <PreviewFact label={tr('حالة التحقق', 'Verification')} value={formatStatus(item.verificationStatus, tr)} compact />
              <PreviewFact label={tr('حالة الترجمة', 'Translation')} value={formatStatus(item.translationState, tr)} compact />
            </div>
            {item.sourceUrl ? <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-xl border border-[#21A7B4]/25 bg-[#DDEFF2]/30 px-3 py-2 text-xs font-black text-[#0E7C86] hover:bg-[#DDEFF2]/60"><ExternalLink className="h-4 w-4" />{tr('فتح المصدر الأصلي', 'Open original source')}</a> : null}
          </section>

          {(item.missingFields.length > 0 || item.reviewNotes.length > 0 || item.conflictingFields.length > 0) && (
            <section className="rounded-2xl border border-[#DDEFF2] bg-white p-4">
              <h3 className="font-black text-[#142B5F]">{tr('تفاصيل سبب المراجعة', 'Review reason details')}</h3>
              {item.missingFields.length > 0 && <DetailList title={tr('الحقول الناقصة', 'Missing fields')} values={item.missingFields} tone="warning" />}
              {item.conflictingFields.length > 0 && <DetailList title={tr('حقول متعارضة', 'Conflicting fields')} values={item.conflictingFields} tone="danger" />}
              {item.reviewNotes.length > 0 && <DetailList title={tr('إشارات/ملاحظات المراجعة', 'Review signals / notes')} values={item.reviewNotes} tone="neutral" />}
            </section>
          )}

          <section className="rounded-2xl border border-[#DDEFF2] bg-white p-4">
            <div className="mb-3 flex items-center gap-2"><GitCompareArrows className="h-4 w-4 text-[#0E7C86]" /><h3 className="font-black text-[#142B5F]">{tr('ما الذي تغيّر؟', 'What changed?')}</h3></div>
            {loading ? <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{tr('تحميل المقارنة...', 'Loading diff...')}</div> : changedFields.length > 0 ? (
              <div className="space-y-2">
                {changedFields.slice(0, 12).map((field) => (
                  <div key={field.field} className="rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/60 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2"><span className="text-xs font-black text-[#203442]">{field.field}</span><span className={`rounded-full px-2 py-1 text-[9px] font-black ${field.state === 'CONFLICT' ? 'bg-rose-100 text-rose-800' : 'bg-cyan-50 text-cyan-800'}`}>{field.state}</span></div>
                    <div className="grid gap-2 sm:grid-cols-2"><DiffValue label={tr('الحالي', 'Current')} value={field.currentValue} /><DiffValue label={tr('الوارد', 'Incoming')} value={field.incomingValue} /></div>
                  </div>
                ))}
              </div>
            ) : <p className="text-xs font-medium leading-6 text-slate-500">{item.sourceImportRecordId ? tr('لا توجد تغييرات قابلة للعرض، أو أن سجل الاستيراد لا يملك مقارنة مع سجل حالي.', 'No displayable changes were found, or the import record has no canonical comparison.') : tr('هذا العنصر غير مرتبط بسجل استيراد يمكن مقارنة نسخه.', 'This item is not linked to an import record that supports diffing.')}</p>}
          </section>

          <section className="rounded-2xl border border-[#DDEFF2] bg-white p-4">
            <div className="mb-3 flex items-center gap-2"><History className="h-4 w-4 text-[#0E7C86]" /><h3 className="font-black text-[#142B5F]">{tr('سجل التدقيق', 'Audit history')}</h3></div>
            {loading ? <div className="flex items-center gap-2 text-xs font-bold text-slate-500"><Loader2 className="h-4 w-4 animate-spin" />{tr('تحميل سجل التدقيق...', 'Loading audit history...')}</div> : auditHistory.length > 0 ? (
              <div className="space-y-2">{auditHistory.map((record, index) => <AuditRow key={record.id || `${record.action}-${index}`} record={record} isArabic={isArabic} tr={tr} />)}</div>
            ) : <p className="text-xs font-medium leading-6 text-slate-500">{tr('لا توجد أحداث تدقيق متاحة لهذا الهدف، أو أن صلاحية قراءة سجل التدقيق غير متاحة للمستخدم الحالي.', 'No audit events are available for this target, or the current user lacks audit-read permission.')}</p>}
          </section>

          {error && <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold leading-6 text-amber-800">{error}</div>}

          <div className="sticky bottom-0 flex flex-wrap gap-2 border-t border-[#DDEFF2] bg-[#FAF7F0]/95 py-4 backdrop-blur">
            <Link to={item.href} className="inline-flex min-h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#0E7C86]">{tr('فتح السجل الكامل في المجال', 'Open full domain record')} <ArrowIcon className="h-4 w-4" /></Link>
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-[#DDEFF2] bg-white px-4 text-xs font-black text-[#203442]">{tr('إغلاق', 'Close')}</button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function PreviewFact({ label, value, compact = false, danger = false, mono = false }: { label: string; value: string; compact?: boolean; danger?: boolean; mono?: boolean }) {
  return <div className={`rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/55 ${compact ? 'p-3' : 'p-4'}`}><div className="text-[10px] font-black text-slate-400">{label}</div><div className={`mt-1 break-words text-xs font-black ${danger ? 'text-rose-700' : 'text-[#203442]'} ${mono ? 'font-mono' : ''}`}>{value}</div></div>;
}

function DetailList({ title, values, tone }: { title: string; values: string[]; tone: 'warning' | 'danger' | 'neutral' }) {
  const style = tone === 'danger' ? 'border-rose-100 bg-rose-50 text-rose-800' : tone === 'warning' ? 'border-amber-100 bg-amber-50 text-amber-800' : 'border-[#DDEFF2] bg-[#FAF7F0]/60 text-[#203442]';
  return <div className="mt-3"><div className="mb-2 text-[10px] font-black text-slate-400">{title}</div><div className="flex flex-wrap gap-2">{values.map((value) => <span key={value} className={`rounded-lg border px-2.5 py-1 text-[10px] font-black ${style}`}>{value}</span>)}</div></div>;
}

function DiffValue({ label, value }: { label: string; value: unknown }) {
  return <div className="rounded-lg bg-white p-2"><div className="text-[9px] font-black text-slate-400">{label}</div><div className="mt-1 break-words text-[10px] font-bold text-[#203442]">{displayValue(value)}</div></div>;
}

function AuditRow({ record, isArabic, tr }: { record: AuditRecordView; isArabic: boolean; tr: (ar: string, en: string) => string }) {
  return <div className="grid gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/55 p-3 sm:grid-cols-[1fr_auto]"><div><div className="text-xs font-black text-[#203442]">{record.action || tr('عملية إدارية', 'Administrative action')}</div><div className="mt-1 text-[10px] font-bold text-slate-500">{record.actor?.actorId || tr('فاعل غير محدد', 'Unknown actor')} · {record.category || '—'}</div></div><div className="text-[10px] font-black text-slate-400">{record.timestamp ? formatSimpleDateTime(record.timestamp, isArabic) : '—'}</div></div>;
}

function PriorityBadge({ priority, tr }: { priority: Priority; tr: (ar: string, en: string) => string }) {
  const config = {
    critical: ['bg-rose-100 text-rose-800', tr('حرجة', 'Critical')],
    high: ['bg-amber-100 text-amber-800', tr('عالية', 'High')],
    medium: ['bg-[#DDEFF2] text-[#0E7C86]', tr('متوسطة', 'Medium')],
    low: ['bg-emerald-100 text-emerald-800', tr('منخفضة', 'Low')],
  }[priority];
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${config[0]}`}>{config[1]}</span>;
}

function ReasonBadge({ reason, tr }: { reason: ReasonKey; tr: (ar: string, en: string) => string }) {
  const config: Record<ReasonKey, [string, string]> = {
    workflow_review: ['bg-[#DDEFF2]/70 text-[#0E7C86]', tr('قيد المراجعة', 'In review')],
    incomplete: ['bg-amber-50 text-amber-800', tr('ناقص', 'Incomplete')],
    ready_to_publish: ['bg-emerald-50 text-emerald-800', tr('جاهز للنشر', 'Ready')],
    imported_unreviewed: ['bg-sky-50 text-sky-800', tr('مستورد', 'Imported')],
    needs_translation: ['bg-violet-50 text-violet-800', tr('ترجمة', 'Translation')],
    source_verification: ['bg-indigo-50 text-indigo-800', tr('تحقق المصدر', 'Verify source')],
    broken_link: ['bg-rose-50 text-rose-800', tr('رابط معطل', 'Broken link')],
    potential_duplicate: ['bg-fuchsia-50 text-fuchsia-800', tr('تكرار محتمل', 'Potential duplicate')],
    import_conflict: ['bg-rose-100 text-rose-900', tr('تعارض استيراد', 'Import conflict')],
    reimport_changed: ['bg-cyan-50 text-cyan-800', tr('بيانات متغيرة', 'Incoming changes')],
    expired_data: ['bg-orange-50 text-orange-800', tr('بيانات منتهية', 'Expired data')],
    ai_human_review: ['bg-violet-100 text-violet-900', tr('مراجعة بشرية لـ AI', 'Human AI review')],
  };
  return <span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${config[reason][0]}`}>{config[reason][1]}</span>;
}

async function loadAllDomainSummaries(): Promise<Record<DomainKey, DomainSummary>> {
  const results = await Promise.all([
    loadScholarshipSummary(),
    loadGenericDomainSummary('universities', '/admin/universities', { reviewStatuses: ['READY_TO_REVIEW'], supportsImported: true, supportsCompleteness: true }),
    loadGenericDomainSummary('majors', '/admin/majors', { reviewStatuses: ['READY_TO_REVIEW'], supportsImported: true, supportsCompleteness: true, extraParams: { catalog: 'true' } }),
    loadCourseSummary(),
    loadGenericDomainSummary('tests', '/admin/international-tests', { reviewStatuses: ['READY_TO_REVIEW', 'NEEDS_REVIEW'], supportsImported: true, supportsCompleteness: true }),
    loadGenericDomainSummary('services', '/admin/services', { reviewStatuses: ['READY_TO_REVIEW'], supportsImported: false, supportsCompleteness: true }),
    loadGenericDomainSummary('cms', '/admin/cms/content', { reviewStatuses: ['IN_REVIEW'], supportsImported: false, supportsCompleteness: false }),
  ]);
  return Object.fromEntries(results.map((result) => [result.key, result])) as Record<DomainKey, DomainSummary>;
}

async function loadScholarshipSummary(): Promise<DomainSummary> {
  const result = emptyDomainSummary('scholarships');
  const errors: string[] = [];
  const [summaryResult, reviewResult] = await Promise.allSettled([
    adminApiClient.request<ScholarshipSummary>('/admin/scholarships/summary'),
    fetchTotal('/admin/scholarships', { status: 'READY_TO_REVIEW' }),
  ]);
  if (summaryResult.status === 'fulfilled') {
    result.incomplete = summaryResult.value.missingFields;
    result.readyToPublish = summaryResult.value.readyToPublish;
    result.imported = summaryResult.value.imported;
    result.needsTranslation = summaryResult.value.needsTranslation;
    result.sourceVerification = summaryResult.value.needsVerification;
  } else errors.push(errorMessage(summaryResult.reason));
  if (reviewResult.status === 'fulfilled') result.workflowReview = reviewResult.value;
  else errors.push(errorMessage(reviewResult.reason));
  result.errors = errors;
  result.availability = availabilityFrom(2 - errors.length, 2);
  return result;
}

async function loadCourseSummary(): Promise<DomainSummary> {
  const result = emptyDomainSummary('courses');
  const errors: string[] = [];
  const [review, incompleteA, incompleteB, ready, imported, importedOverview] = await Promise.allSettled([
    fetchTotal('/admin/courses', { status: 'READY_TO_REVIEW' }),
    fetchTotal('/admin/courses', { completenessStatus: 'INCOMPLETE' }),
    fetchTotal('/admin/courses', { completenessStatus: 'NEEDS_REVIEW' }),
    fetchTotal('/admin/courses', { status: 'READY_TO_PUBLISH' }),
    fetchTotal('/admin/courses', { status: 'IMPORTED' }),
    adminApiClient.request<PaginatedResponse>(`/admin/courses/imported?page=1&pageSize=1`),
  ]);
  result.workflowReview = settledNumber(review, errors);
  result.incomplete = addKnown(settledNumber(incompleteA, errors), settledNumber(incompleteB, errors));
  result.readyToPublish = settledNumber(ready, errors);
  result.imported = settledNumber(imported, errors);
  if (importedOverview.status === 'fulfilled') {
    result.sourceVerification = importedOverview.value.overview?.needsVerification ?? null;
    result.brokenLinks = importedOverview.value.overview?.broken ?? null;
  } else errors.push(errorMessage(importedOverview.reason));
  result.errors = errors;
  result.availability = availabilityFrom(6 - errors.length, 6);
  return result;
}

async function loadGenericDomainSummary(
  key: DomainKey,
  endpoint: string,
  options: { reviewStatuses: string[]; supportsImported: boolean; supportsCompleteness: boolean; extraParams?: Record<string, string> },
): Promise<DomainSummary> {
  const result = emptyDomainSummary(key);
  const errors: string[] = [];
  const tasks: Array<Promise<number>> = [];
  const labels: Array<'review' | 'incomplete' | 'ready' | 'imported'> = [];
  for (const status of options.reviewStatuses) {
    tasks.push(fetchTotal(endpoint, { ...(options.extraParams ?? {}), status }));
    labels.push('review');
  }
  if (options.supportsCompleteness) {
    tasks.push(fetchTotal(endpoint, { ...(options.extraParams ?? {}), completenessStatus: 'INCOMPLETE' }));
    labels.push('incomplete');
    tasks.push(fetchTotal(endpoint, { ...(options.extraParams ?? {}), completenessStatus: 'NEEDS_REVIEW' }));
    labels.push('incomplete');
  }
  tasks.push(fetchTotal(endpoint, { ...(options.extraParams ?? {}), status: 'READY_TO_PUBLISH' }));
  labels.push('ready');
  if (options.supportsImported) {
    tasks.push(fetchTotal(endpoint, { ...(options.extraParams ?? {}), status: 'IMPORTED' }));
    labels.push('imported');
  }

  const settled = await Promise.allSettled(tasks);
  let reviewTotal: number | null = null;
  let incompleteTotal: number | null = null;
  let readyTotal: number | null = null;
  let importedTotal: number | null = null;
  settled.forEach((entry, index) => {
    if (entry.status === 'rejected') {
      errors.push(errorMessage(entry.reason));
      return;
    }
    if (labels[index] === 'review') reviewTotal = addKnown(reviewTotal, entry.value);
    if (labels[index] === 'incomplete') incompleteTotal = addKnown(incompleteTotal, entry.value);
    if (labels[index] === 'ready') readyTotal = entry.value;
    if (labels[index] === 'imported') importedTotal = entry.value;
  });
  result.workflowReview = reviewTotal;
  result.incomplete = options.supportsCompleteness ? incompleteTotal : null;
  result.readyToPublish = readyTotal;
  result.imported = options.supportsImported ? importedTotal : null;
  result.errors = errors;
  result.availability = availabilityFrom(settled.length - errors.length, settled.length);
  return result;
}

async function fetchTotal(endpoint: string, params: Record<string, string>): Promise<number> {
  const search = new URLSearchParams({ ...params, page: '1', pageSize: '1' });
  const response = await adminApiClient.request<PaginatedResponse>(`${endpoint}?${search.toString()}`);
  return typeof response.total === 'number' ? response.total : Array.isArray(response.data) ? response.data.length : 0;
}

async function loadScholarshipImportOverview(): Promise<ScholarshipImportCenterOverview | null> {
  try {
    return await adminApiClient.request<ScholarshipImportCenterOverview>('/admin/scholarships/import-center/overview?operationalClass=REAL');
  } catch {
    return null;
  }
}

async function loadScholarshipImportQueueItems(): Promise<ReviewItem[]> {
  const rows: ScholarshipImportCenterRecord[] = [];
  const pageSize = 100;
  try {
    for (let page = 1; page <= 10000; page += 1) {
      const response = await adminApiClient.request<ScholarshipImportCenterScan>(`/admin/scholarships/import-center/review-queue?operationalClass=REAL&page=${page}&pageSize=${pageSize}`);
      const batch = response.data ?? [];
      rows.push(...batch);
      const knownTotal = response.sourceTotal ?? response.scannedRecords;
      if (batch.length < pageSize || (typeof knownTotal === 'number' && rows.length >= knownTotal) || response.scanTruncated === false) break;
    }
    return rows.map(scholarshipImportRecordToReviewItem);
  } catch {
    return rows.map(scholarshipImportRecordToReviewItem);
  }
}

async function loadAuditHistory(item: ReviewItem): Promise<AuditRecordView[]> {
  const targetId = item.auditTargetId || item.id;
  if (!targetId) return [];
  const response = await adminApiClient.request<AuditRecordView[]>(`/admin/audit/records?targetId=${encodeURIComponent(targetId)}`);
  return Array.isArray(response)
    ? [...response].sort((a, b) => newestTimestamp(b.timestamp) - newestTimestamp(a.timestamp)).slice(0, 12)
    : [];
}

async function loadImportDiff(item: ReviewItem): Promise<ImportDiffView | null> {
  if (item.domainKey !== 'scholarships' || !item.sourceImportRecordId) return null;
  return adminApiClient.request<ImportDiffView>(`/admin/scholarships/import-center/records/${encodeURIComponent(item.sourceImportRecordId)}/diff`);
}

async function loadRecentReviewItems(): Promise<ReviewItem[]> {
  const domainLoads = await Promise.all([
    loadScholarshipItems(),
    loadUniversityItems(),
    loadMajorItems(),
    loadCourseItems(),
    loadTestItems(),
    loadServiceItems(),
    loadCmsItems(),
  ]);
  return mergeReviewItems(domainLoads.flat());
}

async function loadScholarshipItems(): Promise<ReviewItem[]> {
  const [canonical, importQueue] = await Promise.all([
    loadFromQueries('scholarships', '/admin/scholarships', [
      [{ status: 'READY_TO_REVIEW' }, 'workflow_review'],
      [{ completenessStatus: 'INCOMPLETE' }, 'incomplete'],
      [{ completenessStatus: 'NEEDS_REVIEW' }, 'incomplete'],
      [{ status: 'READY_TO_PUBLISH' }, 'ready_to_publish'],
      [{ status: 'IMPORTED' }, 'imported_unreviewed'],
      [{ translationState: 'NEEDS_TRANSLATION' }, 'needs_translation'],
      [{ verificationStatus: 'PENDING' }, 'source_verification'],
      [{ verificationStatus: 'FAILED' }, 'source_verification'],
    ]),
    loadScholarshipImportQueueItems(),
  ]);
  return [...canonical, ...importQueue];
}

async function loadUniversityItems(): Promise<ReviewItem[]> {
  return loadFromQueries('universities', '/admin/universities', [
    [{ status: 'READY_TO_REVIEW' }, 'workflow_review'],
    [{ completenessStatus: 'INCOMPLETE' }, 'incomplete'],
    [{ completenessStatus: 'NEEDS_REVIEW' }, 'incomplete'],
    [{ status: 'READY_TO_PUBLISH' }, 'ready_to_publish'],
    [{ status: 'IMPORTED' }, 'imported_unreviewed'],
  ]);
}

async function loadMajorItems(): Promise<ReviewItem[]> {
  const base = { catalog: 'true' };
  return loadFromQueries('majors', '/admin/majors', [
    [{ ...base, status: 'READY_TO_REVIEW' }, 'workflow_review'],
    [{ ...base, completenessStatus: 'INCOMPLETE' }, 'incomplete'],
    [{ ...base, completenessStatus: 'NEEDS_REVIEW' }, 'incomplete'],
    [{ ...base, status: 'READY_TO_PUBLISH' }, 'ready_to_publish'],
    [{ ...base, status: 'IMPORTED' }, 'imported_unreviewed'],
  ]);
}

async function loadCourseItems(): Promise<ReviewItem[]> {
  const [core, broken, importedWindow] = await Promise.all([
    loadFromQueries('courses', '/admin/courses', [
      [{ status: 'READY_TO_REVIEW' }, 'workflow_review'],
      [{ completenessStatus: 'INCOMPLETE' }, 'incomplete'],
      [{ completenessStatus: 'NEEDS_REVIEW' }, 'incomplete'],
      [{ status: 'READY_TO_PUBLISH' }, 'ready_to_publish'],
      [{ status: 'IMPORTED' }, 'imported_unreviewed'],
    ]),
    loadFromQueries('courses', '/admin/courses/imported', [
      [{ linkHealth: 'BROKEN' }, 'broken_link'],
    ]),
    safeListAll('/admin/courses/imported', {}),
  ]);
  const verificationItems = (importedWindow.data ?? [])
    .filter((record) => record && typeof record === 'object' && (record as any).sourceVerified === false)
    .map((record) => toReviewItem('courses', record as Record<string, any>, 'source_verification'));
  return [...core, ...broken, ...verificationItems];
}

async function loadTestItems(): Promise<ReviewItem[]> {
  return loadFromQueries('tests', '/admin/international-tests', [
    [{ status: 'READY_TO_REVIEW' }, 'workflow_review'],
    [{ status: 'NEEDS_REVIEW' }, 'workflow_review'],
    [{ completenessStatus: 'INCOMPLETE' }, 'incomplete'],
    [{ completenessStatus: 'NEEDS_REVIEW' }, 'incomplete'],
    [{ status: 'READY_TO_PUBLISH' }, 'ready_to_publish'],
    [{ status: 'IMPORTED' }, 'imported_unreviewed'],
  ]);
}

async function loadServiceItems(): Promise<ReviewItem[]> {
  return loadFromQueries('services', '/admin/services', [
    [{ status: 'READY_TO_REVIEW' }, 'workflow_review'],
    [{ completenessStatus: 'INCOMPLETE' }, 'incomplete'],
    [{ completenessStatus: 'NEEDS_REVIEW' }, 'incomplete'],
    [{ status: 'READY_TO_PUBLISH' }, 'ready_to_publish'],
  ]);
}

async function loadCmsItems(): Promise<ReviewItem[]> {
  return loadFromQueries('cms', '/admin/cms/content', [
    [{ status: 'IN_REVIEW' }, 'workflow_review'],
    [{ status: 'READY_TO_PUBLISH' }, 'ready_to_publish'],
  ]);
}

async function loadFromQueries(
  domainKey: DomainKey,
  endpoint: string,
  queries: Array<[Record<string, string>, ReasonKey]>,
): Promise<ReviewItem[]> {
  const results = await Promise.all(queries.map(async ([query, reason]) => {
    const records = await safeListAll(endpoint, query);
    return (records.data ?? []).map((record) => toReviewItem(domainKey, record as Record<string, any>, reason));
  }));
  return results.flat();
}


async function safeListAll(endpoint: string, params: Record<string, string>, pageSize = 100): Promise<PaginatedResponse<Record<string, unknown>>> {
  const data: Record<string, unknown>[] = [];
  let total: number | undefined;
  for (let page = 1; page <= 10000; page += 1) {
    const response = await safeList(endpoint, { ...params, page: String(page), pageSize: String(pageSize) });
    const batch = response.data ?? [];
    data.push(...batch);
    if (typeof response.total === 'number') total = response.total;
    const totalPages = response.totalPages ?? (typeof total === 'number' ? Math.ceil(total / pageSize) : undefined);
    if (batch.length < pageSize || (totalPages !== undefined && page >= totalPages) || (total !== undefined && data.length >= total)) break;
  }
  return { data, total: total ?? data.length, page: 1, pageSize: data.length, totalPages: 1 };
}

async function safeList(endpoint: string, params: Record<string, string>): Promise<PaginatedResponse<Record<string, unknown>>> {
  try {
    const search = new URLSearchParams(params);
    return await adminApiClient.request<PaginatedResponse<Record<string, unknown>>>(`${endpoint}?${search.toString()}`);
  } catch {
    return { data: [], total: 0 };
  }
}

function toReviewItem(domainKey: DomainKey, record: Record<string, any>, reason: ReasonKey): ReviewItem {
  const id = String(record.id ?? record.publicId ?? record.slug ?? record.toolKey ?? 'unknown');
  const title = String(record.displayName ?? record.title ?? record.canonicalName ?? record.originalSourceTitle ?? record.publicId ?? id);
  const missingFields = stringArray(record.missingFields ?? record.completeness?.missingFields ?? record.completenessMissingFields);
  const conflictingFields = stringArray(record.conflictingFields ?? record.conflictFields ?? record.diffConflicts);
  const reviewNotes = stringArray(record.reviewReasons ?? record.reviewNotes ?? record.processingNotes);
  const item: ReviewItem = {
    id,
    itemKind: 'canonical',
    domainKey,
    title,
    href: domainItemHref(domainKey, id),
    status: record.status ?? record.visibilityStatus ?? record.publicationStatus ?? null,
    completenessStatus: record.completenessStatus ?? record.completeness?.state ?? null,
    reasons: [reason],
    priority: 'medium',
    sourceKind: detectSourceKind(domainKey, record),
    sourceLabel: record.providerName ?? record.sponsorName ?? record.platformName ?? record.sourceSystem ?? record.sourceType ?? record.originType ?? null,
    sourceUrl: record.officialSourceUrl ?? record.sourceUrl ?? record.directCourseUrl ?? null,
    sourceImportRecordId: record.sourceImportRecordId ?? record.importRecordId ?? null,
    importBatchId: record.importBatchId ?? record.batchId ?? null,
    sourceFileName: record.sourceFileName ?? record.fileName ?? null,
    sourceRowNumber: record.sourceRowNumber ?? record.rowNumber ?? null,
    rawSourceTitle: record.rawSourceTitle ?? record.originalSourceTitle ?? null,
    createdAt: normalizeDateValue(record.createdAt),
    updatedAt: normalizeDateValue(record.updatedAt ?? record.createdAt),
    deadline: normalizeDateValue(record.applicationDeadline ?? record.deadline),
    verificationStatus: record.verificationStatus ?? record.sourceVerificationReason ?? (record.sourceVerified === true ? 'VERIFIED' : record.sourceVerified === false ? 'NEEDS_VERIFICATION' : null),
    translationState: record.translationState ?? null,
    missingFields,
    duplicateStatus: record.duplicateStatus ?? record.dedupe?.state ?? null,
    conflictingFields,
    reviewNotes,
    reviewerLabel: record.assignedReviewerName ?? record.reviewerName ?? record.assignedTo ?? null,
    auditTargetId: String(record.id ?? id),
  };

  const completeness = String(item.completenessStatus ?? '').toUpperCase();
  const status = String(item.status ?? '').toUpperCase();
  if ((completeness === 'INCOMPLETE' || completeness === 'NEEDS_REVIEW' || missingFields.length > 0) && !item.reasons.includes('incomplete')) item.reasons.push('incomplete');
  if ((status === 'READY_TO_REVIEW' || status === 'NEEDS_REVIEW' || status === 'IN_REVIEW') && !item.reasons.includes('workflow_review')) item.reasons.push('workflow_review');
  if (status === 'READY_TO_PUBLISH' && !item.reasons.includes('ready_to_publish')) item.reasons.push('ready_to_publish');
  if (status === 'IMPORTED' && !item.reasons.includes('imported_unreviewed')) item.reasons.push('imported_unreviewed');

  if (domainKey === 'universities') {
    const translations = Array.isArray(record.translations) ? record.translations : [];
    const hasAr = translations.some((translation: any) => translation?.locale === 'ar' && (translation?.displayName || translation?.description));
    const hasEn = translations.some((translation: any) => translation?.locale === 'en' && (translation?.displayName || translation?.description));
    if ((!hasAr || !hasEn) && !item.reasons.includes('needs_translation')) item.reasons.push('needs_translation');
  }
  if (domainKey === 'majors') {
    if ((!record.localizedNameAr || !record.localizedNameEn) && !item.reasons.includes('needs_translation')) item.reasons.push('needs_translation');
  }
  if (domainKey === 'tests') {
    if ((!record.localizedNameAr || !record.localizedNameEn) && !item.reasons.includes('needs_translation')) item.reasons.push('needs_translation');
    if (record.isSourceVerified === false && !item.reasons.includes('source_verification')) item.reasons.push('source_verification');
  }
  const duplicate = String(item.duplicateStatus ?? '').toUpperCase();
  if (duplicate.includes('DUPLICATE') && !item.reasons.includes('potential_duplicate')) item.reasons.push('potential_duplicate');
  if ((duplicate.includes('COLLISION') || duplicate.includes('CONFLICT') || conflictingFields.length > 0) && !item.reasons.includes('import_conflict')) item.reasons.push('import_conflict');
  if ((duplicate.includes('UPDATE') || duplicate.includes('ENRICH')) && !item.reasons.includes('reimport_changed')) item.reasons.push('reimport_changed');
  if (isExpired(item.deadline) && !item.reasons.includes('expired_data')) item.reasons.push('expired_data');
  const aiState = String(record.aiReviewState ?? record.aiDraftStatus ?? record.aiStatus ?? '').toUpperCase();
  if ((aiState.includes('HUMAN') || aiState.includes('REVIEW')) && !item.reasons.includes('ai_human_review')) item.reasons.push('ai_human_review');

  item.priority = derivePriority(item, record);
  return item;
}

function scholarshipImportRecordToReviewItem(record: ScholarshipImportCenterRecord): ReviewItem {
  const duplicateState = String(record.dedupe?.state ?? 'NOT_CHECKED').toUpperCase();
  const reasons: ReasonKey[] = ['imported_unreviewed'];
  if ((record.completeness?.missingFields?.length ?? 0) > 0) reasons.push('incomplete');
  if (record.verification?.state && String(record.verification.state).toUpperCase() !== 'VERIFIED') reasons.push('source_verification');
  if (duplicateState === 'DUPLICATE') reasons.push('potential_duplicate');
  if (duplicateState === 'COLLISION_REVIEW') reasons.push('import_conflict');
  if (duplicateState === 'UPDATE') reasons.push('reimport_changed');
  const title = record.cleanedScholarshipName || record.rawSourceTitle || record.id;
  const item: ReviewItem = {
    id: record.id,
    itemKind: 'import_record',
    domainKey: 'scholarships',
    title,
    href: '/imports/scholarships',
    status: record.importStatus,
    completenessStatus: record.completeness?.state ?? null,
    reasons: Array.from(new Set(reasons)),
    priority: 'medium',
    sourceKind: 'imported',
    sourceLabel: record.sourceSystem,
    sourceUrl: null,
    sourceImportRecordId: record.id,
    importBatchId: record.batchId,
    sourceFileName: null,
    sourceRowNumber: record.sourceRowNumber ?? null,
    rawSourceTitle: record.rawSourceTitle ?? null,
    createdAt: normalizeDateValue(record.createdAt),
    updatedAt: normalizeDateValue(record.updatedAt ?? record.createdAt),
    deadline: null,
    verificationStatus: record.verification?.state ?? null,
    translationState: null,
    missingFields: record.completeness?.missingFields ?? [],
    duplicateStatus: duplicateState,
    conflictingFields: [],
    reviewNotes: record.reviewReasons ?? [],
    reviewerLabel: null,
    auditTargetId: record.promotedEntityId ?? record.id,
  };
  item.priority = derivePriority(item, { verificationStatus: item.verificationStatus, duplicateStatus: duplicateState });
  return item;
}

function mergeReviewItems(items: ReviewItem[]): ReviewItem[] {
  const map = new Map<string, ReviewItem>();
  for (const item of items) {
    const key = `${item.itemKind}:${item.domainKey}:${item.id}`;
    const existing = map.get(key);
    if (!existing) {
      map.set(key, item);
      continue;
    }
    existing.reasons = Array.from(new Set([...existing.reasons, ...item.reasons]));
    if (priorityRank(item.priority) < priorityRank(existing.priority)) existing.priority = item.priority;
    if (newestTimestamp(item.updatedAt) > newestTimestamp(existing.updatedAt)) existing.updatedAt = item.updatedAt;
    if (!existing.deadline && item.deadline) existing.deadline = item.deadline;
    existing.missingFields = Array.from(new Set([...existing.missingFields, ...item.missingFields]));
    existing.conflictingFields = Array.from(new Set([...existing.conflictingFields, ...item.conflictingFields]));
    existing.reviewNotes = Array.from(new Set([...existing.reviewNotes, ...item.reviewNotes]));
  }
  return [...map.values()].sort((a, b) => {
    const rank = priorityRank(a.priority) - priorityRank(b.priority);
    return rank !== 0 ? rank : oldestTimestamp(a.updatedAt) - oldestTimestamp(b.updatedAt);
  });
}

function derivePriority(item: ReviewItem, record: Record<string, any>): Priority {
  if (item.reasons.includes('broken_link') || item.reasons.includes('import_conflict') || String(record.verificationStatus ?? '').toUpperCase() === 'FAILED') return 'critical';
  const age = ageBucket(item.updatedAt);
  const nearDeadline = isNearDeadline(item.deadline, 14);
  if (item.reasons.includes('incomplete') || item.reasons.includes('source_verification') || item.reasons.includes('potential_duplicate') || item.reasons.includes('expired_data') || age === 'older' || nearDeadline) return 'high';
  if (item.reasons.includes('workflow_review') || item.reasons.includes('imported_unreviewed') || item.reasons.includes('needs_translation') || item.reasons.includes('reimport_changed') || item.reasons.includes('ai_human_review')) return 'medium';
  return 'low';
}

function detectSourceKind(domainKey: DomainKey, record: Record<string, any>): SourceKind {
  if (domainKey === 'cms') return 'cms';
  if (record.sourceImportRecordId || record.importBatchId || String(record.status ?? '').toUpperCase() === 'IMPORTED') return 'imported';
  if (record.originType && String(record.originType).toUpperCase().includes('EXTERNAL')) return 'imported';
  if (record.sourceType && String(record.sourceType).toUpperCase().includes('IMPORT')) return 'imported';
  if (record.id) return 'manual';
  return 'unknown';
}

function domainItemHref(domainKey: DomainKey, id: string): string {
  if (domainKey === 'scholarships') return `/scholarships/${encodeURIComponent(id)}`;
  if (domainKey === 'universities') return `/universities/${encodeURIComponent(id)}`;
  if (domainKey === 'majors') return `/majors/${encodeURIComponent(id)}`;
  if (domainKey === 'courses') return `/courses/${encodeURIComponent(id)}`;
  if (domainKey === 'tests') return `/international-tests/${encodeURIComponent(id)}`;
  if (domainKey === 'services') return '/services';
  return '/cms';
}

function emptyDomainSummary(key: DomainKey): DomainSummary {
  return {
    key,
    workflowReview: null,
    incomplete: null,
    readyToPublish: null,
    imported: null,
    needsTranslation: null,
    sourceVerification: null,
    brokenLinks: null,
    availability: 'unavailable',
    errors: [],
  };
}

function availabilityFrom(successCount: number, totalCount: number): Availability {
  if (successCount <= 0) return 'unavailable';
  if (successCount < totalCount) return 'partial';
  return 'ready';
}

function settledNumber(result: PromiseSettledResult<number>, errors: string[]): number | null {
  if (result.status === 'fulfilled') return result.value;
  errors.push(errorMessage(result.reason));
  return null;
}

function errorMessage(value: unknown): string {
  return value instanceof Error ? value.message : String(value ?? 'Unknown source error');
}

function addKnown(a: number | null, b: number | null): number | null {
  if (a == null && b == null) return null;
  return (a ?? 0) + (b ?? 0);
}

function sumRequired(values: Array<number | null | undefined>): number | null {
  if (values.some((value) => typeof value !== 'number')) return null;
  return (values as number[]).reduce((sum, value) => sum + value, 0);
}

function sumKnown(values: Array<number | null | undefined>): number | null {
  const known = values.filter((value): value is number => typeof value === 'number');
  return known.length ? known.reduce((sum, value) => sum + value, 0) : null;
}

function normalizeDateValue(value: unknown): string | null {
  if (!value) return null;
  if (value instanceof Date) return value.toISOString();
  const stringValue = String(value);
  return Number.isNaN(new Date(stringValue).getTime()) ? null : stringValue;
}

function newestTimestamp(value?: string | null): number {
  if (!value) return 0;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function oldestTimestamp(value?: string | null): number {
  const timestamp = newestTimestamp(value);
  return timestamp === 0 ? Number.MAX_SAFE_INTEGER : timestamp;
}

function stringArray(value: unknown): string[] {
  if (Array.isArray(value)) return value.map((entry) => typeof entry === 'string' ? entry : JSON.stringify(entry)).filter(Boolean);
  if (typeof value === 'string' && value.trim()) return [value.trim()];
  return [];
}

function isExpired(value?: string | null): boolean {
  if (!value) return false;
  const timestamp = new Date(value).getTime();
  return !Number.isNaN(timestamp) && timestamp < Date.now();
}

function slaInfo(item: Pick<ReviewItem, 'priority' | 'updatedAt'>): { state: SlaState; hours: number; remainingHours: number | null; overdueHours: number | null } {
  const hours = REVIEW_SLA_HOURS[item.priority];
  if (!item.updatedAt) return { state: 'unknown', hours, remainingHours: null, overdueHours: null };
  const updated = new Date(item.updatedAt).getTime();
  if (Number.isNaN(updated)) return { state: 'unknown', hours, remainingHours: null, overdueHours: null };
  const elapsedHours = Math.max(0, (Date.now() - updated) / 3600000);
  const remaining = hours - elapsedHours;
  if (remaining < 0) return { state: 'overdue', hours, remainingHours: 0, overdueHours: Math.ceil(Math.abs(remaining)) };
  if (remaining <= Math.max(2, hours * 0.2)) return { state: 'due_soon', hours, remainingHours: Math.ceil(remaining), overdueHours: null };
  return { state: 'on_track', hours, remainingHours: Math.ceil(remaining), overdueHours: null };
}

function formatSla(info: ReturnType<typeof slaInfo>, isArabic: boolean): string {
  if (info.state === 'unknown') return '—';
  if (info.state === 'overdue') return isArabic ? `متأخر ${info.overdueHours ?? 0} س` : `${info.overdueHours ?? 0}h overdue`;
  return isArabic ? `متبقي ${info.remainingHours ?? 0} س` : `${info.remainingHours ?? 0}h left`;
}

function ageBucket(value?: string | null): AgeBucket {
  if (!value) return 'unknown';
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return 'unknown';
  const ageMs = Date.now() - timestamp;
  if (ageMs <= 24 * 60 * 60 * 1000) return 'today';
  if (ageMs <= 7 * 24 * 60 * 60 * 1000) return 'week';
  return 'older';
}

function isNearDeadline(value?: string | null, days = 14): boolean {
  if (!value) return false;
  const deadline = new Date(value).getTime();
  if (Number.isNaN(deadline)) return false;
  const difference = deadline - Date.now();
  return difference >= 0 && difference <= days * 24 * 60 * 60 * 1000;
}

function priorityRank(priority: Priority): number {
  return { critical: 0, high: 1, medium: 2, low: 3 }[priority];
}

function sourceLabel(source: SourceKind, tr: (ar: string, en: string) => string): string {
  if (source === 'imported') return tr('استيراد', 'Import');
  if (source === 'manual') return tr('إدخال المجال', 'Domain entry');
  if (source === 'cms') return 'CMS';
  return tr('غير محدد', 'Unknown');
}

function formatStatus(value: string | null | undefined, tr: (ar: string, en: string) => string): string {
  if (!value) return '—';
  const labels: Record<string, string> = {
    READY_TO_REVIEW: tr('جاهز للمراجعة', 'Ready to review'),
    NEEDS_REVIEW: tr('يحتاج مراجعة', 'Needs review'),
    IN_REVIEW: tr('قيد المراجعة', 'In review'),
    INCOMPLETE: tr('ناقص', 'Incomplete'),
    READY_TO_PUBLISH: tr('جاهز للنشر', 'Ready to publish'),
    IMPORTED: tr('مستورد', 'Imported'),
    PUBLISHED: tr('منشور', 'Published'),
    COMPLETE: tr('مكتمل', 'Complete'),
  };
  return labels[value.toUpperCase()] ?? value.replace(/_/g, ' ');
}

function formatDateTime(date: Date, isArabic: boolean): string {
  return new Intl.DateTimeFormat(isArabic ? 'ar-YE' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function formatSimpleDate(value: string, isArabic: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(isArabic ? 'ar-YE' : 'en-US', { dateStyle: 'medium' }).format(date);
}

function formatSimpleDateTime(value: string, isArabic: boolean): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat(isArabic ? 'ar-YE' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function displayValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') return String(value);
  try { return JSON.stringify(value); } catch { return String(value); }
}

function formatRelative(value: string, isArabic: boolean): string {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return '—';
  const diffMs = Date.now() - timestamp;
  const minutes = Math.max(0, Math.round(diffMs / 60000));
  if (minutes < 60) return isArabic ? `منذ ${minutes} دقيقة` : `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return isArabic ? `منذ ${hours} ساعة` : `${hours}h ago`;
  const days = Math.round(hours / 24);
  return isArabic ? `منذ ${days} يوم` : `${days}d ago`;
}
