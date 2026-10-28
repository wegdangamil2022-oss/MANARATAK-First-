import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTestDraftGuard } from '../features/international-tests/useTestDraftGuard';
import { OwnerDescriptionTranslationPanel } from '../components/OwnerDescriptionTranslationPanel';
import { TestAdmissionScoreEditor } from '../features/integration/TestAdmissionScoreEditor';
import { InternationalTestGovernanceWorkspace } from '../components/InternationalTestGovernanceWorkspace';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import type { InternationalTestStatus as CanonicalTestStatus } from '@manaratak/domain';
type InternationalTestStatus = `${CanonicalTestStatus}`;
import type { InternationalTestDto } from '@manaratak/domain';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  ExternalLink,
  Eye,
  History,
  Info,
  Loader2,
  Network,
  Plus,
  Save,
  ShieldCheck,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ExamDetails, mapInternationalTestToExam } from '@manaratak/ui';
import {
  TestEditorSaveContext,
  useTestEditorForm,
  type TestEditorEntry,
} from '../components/TestEditorSaveRegistry';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { adminApiClient, setInternationalTestReviewReason } from '../api/client';
import { InternationalTestSourceSectionsViewer } from '../components/InternationalTestSourceSectionsViewer';
import { ReviewedGraphEditor } from '../components/ReviewedGraphEditor';
import { SavedTestCanonicalRelationships } from '../components/SavedTestCanonicalRelationships';
import { useTranslation } from '../i18n/I18nProvider';

type InternationalTestCompletenessStatus = 'INCOMPLETE' | 'COMPLETE' | 'NEEDS_REVIEW';
type InternationalTestCategory =
  | 'ENGLISH_LANGUAGE'
  | 'NON_ENGLISH_LANGUAGE'
  | 'GENERAL_UNDERGRADUATE_ADMISSION'
  | 'GRADUATE_ADMISSION'
  | 'NATIONAL_INTERNATIONAL_ADMISSION'
  | 'SPECIALIZED_ADMISSION'
  | 'PROFESSIONAL_LICENSING_CERTIFICATION'
  | 'LANGUAGE_PROFICIENCY'
  | 'UNDERGRAD_ADMISSION'
  | 'GRAD_ADMISSION'
  | 'PROFESSIONAL_LICENSING'
  | 'ACADEMIC_PLACEMENT'
  | 'OTHER';

const TEST_CATEGORY_OPTIONS: InternationalTestCategory[] = [
  'ENGLISH_LANGUAGE',
  'NON_ENGLISH_LANGUAGE',
  'GENERAL_UNDERGRADUATE_ADMISSION',
  'GRADUATE_ADMISSION',
  'NATIONAL_INTERNATIONAL_ADMISSION',
  'SPECIALIZED_ADMISSION',
  'PROFESSIONAL_LICENSING_CERTIFICATION',
  'LANGUAGE_PROFICIENCY',
  'UNDERGRAD_ADMISSION',
  'GRAD_ADMISSION',
  'PROFESSIONAL_LICENSING',
  'ACADEMIC_PLACEMENT',
  'OTHER',
];

interface Variant {
  id?: string;
  variantName: string;
  deliveryMode: 'ONLINE' | 'IN_PERSON' | 'HYBRID';
  isActive: boolean;
  specificOfficialUrl?: string;
  administrativeNotes?: string;
}

interface Section {
  id?: string;
  sectionName: string;
  sectionType: string;
  durationMinutes?: number;
  order: number;
  questionTypes?: string[];
  scoreMinimum?: number;
  scoreMaximum?: number;
}

interface ScoreScale {
  id?: string;
  overallMinimum: number;
  overallMaximum: number;
  scoreIncrement?: number;
  bandsOrLevels?: string[];
  passFailRules?: string;
  cefrEquivalency?: string;
  crossTestEquivalency?: string;
  resultValidityDurationMonths?: number;
  resultDeliveryTimeDays?: number;
  scoreReportingUrl?: string;
}

interface FeeMetadata {
  id?: string;
  feeType: 'REGISTRATION' | 'LATE_REGISTRATION' | 'RESCHEDULING' | 'CANCELLATION' | 'OTHER';
  amount: number;
  currencyCode: string;
  hasRegionalVariation: boolean;
  validityWindowNotes?: string;
}

interface OfficialLink {
  id?: string;
  linkType: 'REGISTRATION' | 'INFORMATION' | 'PREPARATION' | 'SCORE_REPORTING' | 'OTHER';
  url: string;
  description?: string;
}

interface InternationalTestDetail extends Pick<
  InternationalTestDto,
  | 'countryRelationships'
  | 'languageRelationships'
  | 'academicTaxonomyRelationships'
  | 'degreeRelationships'
> {
  id: string;
  publicId?: string;
  slug?: string;
  canonicalName: string;
  displayName?: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  abbreviation?: string | null;
  testCategory: InternationalTestCategory;
  providerName: string;
  providerId?: string | null;
  status: InternationalTestStatus;
  completenessStatus?: InternationalTestCompletenessStatus | null;
  isPubliclyVisible?: boolean;
  isSourceVerified?: boolean;
  registrationRequirements?: string | null;
  identificationRequirements?: string | null;
  retakePolicy?: string | null;
  cancellationReschedulingNotes?: string | null;
  accessibilityNotes?: string | null;
  officialRegistrationUrl?: string | null;
  officialSourceUrl?: string | null;
  updatedAt?: string;
  variants?: Variant[];
  sections?: Section[];
  scoreScale?: ScoreScale;
  fees?: FeeMetadata[];
  officialLinks?: OfficialLink[];
  [key: string]: any;
}

type TabType = 'details' | 'relationships' | 'readiness' | 'sources_history';

function formatDetailDateTime(dateStr?: string | null, isRtl = true): string {
  if (!dateStr) return isRtl ? 'غير متوفر' : 'Unavailable';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(isRtl ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function InternationalTestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const requestedReturn = searchParams.get('returnTo') ?? '';
  const returnTo =
    requestedReturn === '/international-tests' ||
    requestedReturn.startsWith('/international-tests?')
      ? requestedReturn
      : '/international-tests';
  const { language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const canManage = hasPermission('admin:international-tests:manage');
  const [editorGroup, setEditorGroup] = useState('overview');
  const [editorReason, setEditorReason] = useState('');
  useEffect(() => {
    if (!id) return;
    setInternationalTestReviewReason(id, editorReason);
    return () => setInternationalTestReviewReason(id, '');
  }, [id, editorReason]);
  const [showEditors, setShowEditors] = useState(false);
  const [test, setTest] = useState<InternationalTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [governanceDirty, setGovernanceDirty] = useState(false);
  useTestDraftGuard(hasUnsavedChanges || governanceDirty);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isRtl = language === 'ar';
  const editors = useRef(new Map<string, TestEditorEntry>());
  const saveRegistry = useMemo(
    () => ({
      entries: editors.current,
      changed: () =>
        setHasUnsavedChanges([...editors.current.values()].some((entry) => entry.dirty)),
    }),
    [],
  );
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (hasUnsavedChanges) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  const savingBatch = useRef(false);
  const detailRequest = useRef(0);
  const loadedTestId = useRef('');
  const fetchDetail = useCallback(
    async (force = false) => {
      if (savingBatch.current && !force) return;
      if (!id) return;
      const requestId = ++detailRequest.current;
      if (loadedTestId.current !== id) setLoading(true);
      setError(null);
      try {
        const data = await adminApiClient.getInternationalTest<InternationalTestDetail>(id);
        if (requestId !== detailRequest.current) return;
        loadedTestId.current = id;
        setTest(data);
        if (data?.updatedAt) {
          setLastSavedAt(data.updatedAt);
        }
      } catch (err: any) {
        if (requestId !== detailRequest.current) return;
        setError(
          err.message ||
            (isRtl
              ? 'تعذر تحميل تفاصيل الاختبار الدولي'
              : 'Failed to load international test details.'),
        );
      } finally {
        if (requestId === detailRequest.current) setLoading(false);
      }
    },
    [id, isRtl],
  );

  useEffect(() => {
    setLoading(true);
    void fetchDetail();
  }, [fetchDetail]);

  const tabs: { id: TabType; labelAr: string; labelEn: string; icon: any }[] = [
    { id: 'details', labelAr: 'تفاصيل الاختبار', labelEn: 'Test Details', icon: BookOpen },
    {
      id: 'relationships',
      labelAr: 'الربط والعلاقات',
      labelEn: 'Links & Relationships',
      icon: Network,
    },
    {
      id: 'readiness',
      labelAr: 'الجاهزية والنشر',
      labelEn: 'Readiness & Publishing',
      icon: ShieldCheck,
    },
    {
      id: 'sources_history',
      labelAr: 'المصادر وسجل التعديلات',
      labelEn: 'Sources & History',
      icon: History,
    },
  ];

  const handleSaveChanges = async (): Promise<boolean> => {
    const pending = [...editors.current.values()].filter((entry) => entry.dirty);
    if (!pending.length) {
      setActionMessage(isRtl ? 'لا توجد تعديلات غير محفوظة.' : 'No unsaved changes.');
      return true;
    }
    setActionLoading(true);
    setActionError(null);
    setActionMessage(null);
    try {
      savingBatch.current = true;
      for (const entry of pending) {
        if (!(await entry.save())) {
          setActionError(
            isRtl
              ? 'تعذر حفظ أحد النماذج. راجع الحقول ورسالة الخطأ؛ لم يتم النشر.'
              : 'A form could not be saved. Check its validation errors; nothing was published.',
          );
          return false;
        }
      }
      if ([...editors.current.values()].some((entry) => entry.dirty)) {
        setActionError(
          isRtl
            ? 'تغيّرت بعض الحقول أثناء الحفظ. احفظها مرة أخرى قبل النشر.'
            : 'Some fields changed during saving. Save again before publishing.',
        );
        return false;
      }
      await fetchDetail(true);
      setActionMessage(
        isRtl ? 'تم حفظ التعديلات وإعادة تحميل البيانات المحفوظة.' : 'Changes saved and reloaded.',
      );
      return true;
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Save failed');
      return false;
    } finally {
      savingBatch.current = false;
      setActionLoading(false);
    }
  };

  const switchTab = (tab: TabType) => {
    if (tab === activeTab) return;
    if (
      (hasUnsavedChanges || governanceDirty) &&
      !window.confirm(
        isRtl ? 'لديك تعديلات غير محفوظة. هل تريد التخلي عنها؟' : 'Discard unsaved changes?',
      )
    )
      return;
    editors.current.clear();
    setHasUnsavedChanges(false);
    setActiveTab(tab);
  };

  const renderAdministrativeEditor = (group: string) => {
    if (!test) return null;

    // Section 1/2: Overview / Description
    if (group === 'overview') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'تحرير بيانات الوصف والاستخدامات الأساسية' : 'Edit Basic Description & Uses'}
            </span>
          </div>
          <DescriptionTab
            test={test}
            onRefresh={fetchDetail}
            isRtl={isRtl}
            reviewReason={editorReason}
          />
        </div>
      );
    }

    // Section 4: Variants & Delivery Modes
    if (group === 'variants') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl
                ? 'النسخ الرسمية وطرق التقديم القابلة للتحرير'
                : 'Editable Official Variants & Delivery Modes'}
            </span>
          </div>
          <VariantsTab
            testId={test.id}
            initialVariants={test.variants || []}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
        </div>
      );
    }

    // Section 5: Delivery & Availability & Centers
    if (group === 'availability') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl
                ? 'الدول ومراكز الاختبار ونوافذ التقديم القابلة للتحرير'
                : 'Editable Countries, Centers & Testing Windows'}
            </span>
          </div>
          <AvailabilityTab
            testId={test.id}
            initialAvailability={test.availability}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
        </div>
      );
    }

    // Section 6 or 7: Test Skills & Operational Sections
    if (group === 'sections') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200 bg-slate-50/60 -mx-5 -mb-5 p-5 rounded-b-xl">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="px-2.5 py-1 rounded-lg bg-[#142B5F] text-white text-xs font-black">
              {isRtl ? 'المهارات والوحدات التشغيلية للاختبار' : 'Operational Skills & Sections'}
            </span>
            <span className="text-xs text-slate-500 font-medium">
              {isRtl
                ? '(ميّز بينها وبين الأقسام التحريرية للملف أعلاه)'
                : '(Distinguished from editorial file sections above)'}
            </span>
          </div>
          <SectionsTab
            testId={test.id}
            initialSections={test.sections || []}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
        </div>
      );
    }

    // Section 8 or 9 or 10: Scoring Scales & Equivalencies
    if (group === 'scoring') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl
                ? 'نظام الدرجات والسلالم والمعادلات القابل للتحرير'
                : 'Editable Score Scales & Equivalencies'}
            </span>
          </div>
          <ScoringTab
            testId={test.id}
            initialScoreScale={test.scoreScale}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
          <TestAdmissionScoreEditor owner={test} onChanged={() => void fetchDetail()} />
        </div>
      );
    }

    // Section 11 or 14: Registration & Policies
    if (group === 'requirements') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'متطلبات التسجيل والهوية والسياسات' : 'Registration & Policy Requirements'}
            </span>
          </div>
          <RequirementsTab test={test} onRefresh={fetchDetail} isRtl={isRtl} />
        </div>
      );
    }

    // Section 12 or 15: Fees & Financial Policies
    if (group === 'fees') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'الرسوم والعملات والسياسات المالية' : 'Fees & Financial Policies'}
            </span>
          </div>
          <FeesTab
            testId={test.id}
            initialFees={test.fees || []}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
        </div>
      );
    }

    // Section 15 or 18: Preparation Materials
    if (group === 'preparation') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'مواد التحضير والأدلة الرسمية' : 'Preparation Materials & Guides'}
            </span>
          </div>
          <PreparationMaterialsTab
            testId={test.id}
            initialMaterials={test.preparationMaterials || []}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
        </div>
      );
    }

    // Section 16 or 19: Official Links
    if (group === 'links') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'الروابط الرسمية المعتمدة' : 'Official Verified Links'}
            </span>
          </div>
          <OfficialLinksTab
            testId={test.id}
            initialLinks={test.officialLinks || []}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
        </div>
      );
    }

    return null;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
      </div>
    );
  }

  if (error || !test) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Link
          to={returnTo}
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#142B5F] font-medium"
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {isRtl ? 'العودة إلى الاختبارات الدولية' : 'Back to International Tests'}
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <button type="button" onClick={() => void fetchDetail()}>
            {isRtl ? 'إعادة المحاولة' : 'Retry'}
          </button>
          <span>
            {error ||
              (isRtl ? 'لم يتم العثور على الاختبار المطلوب' : 'International test not found.')}
          </span>
        </div>
      </div>
    );
  }

  const primaryTitle = isRtl
    ? test.localizedNameAr?.trim() || test.displayName?.trim() || test.canonicalName
    : test.localizedNameEn?.trim() || test.displayName?.trim() || test.canonicalName;
  const secondaryTitle = isRtl
    ? test.localizedNameEn?.trim() || test.canonicalName
    : test.localizedNameAr?.trim() || test.canonicalName;

  return (
    <TestEditorSaveContext.Provider value={saveRegistry}>
      <div
        className="international-test-detail max-w-7xl mx-auto space-y-6"
        dir={isRtl ? 'rtl' : 'ltr'}
      >
        {/* Top Breadcrumb */}
        <div>
          <Link
            to={returnTo}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#142B5F] transition"
          >
            {isRtl ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
            <span>
              {isRtl ? 'العودة إلى قائمة الاختبارات الدولية' : 'Back to International Tests'}
            </span>
          </Link>
        </div>

        {/* Alerts */}
        {actionMessage && (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{actionMessage}</span>
            </div>
            <button
              onClick={() => setActionMessage(null)}
              className="text-emerald-600 hover:text-emerald-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
        {actionError && (
          <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs font-bold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-rose-600 hover:text-rose-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Header Card with Navy and Teal Gradient */}
        <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
          <div className="absolute -top-24 end-0 h-64 w-64 rounded-full bg-[#F2CD78] opacity-15 pointer-events-none blur-2xl" />
          <div className="absolute -bottom-24 start-0 h-64 w-64 rounded-full bg-cyan-300 opacity-10 pointer-events-none blur-2xl" />

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
            {/* Title & Metadata */}
            <div className="space-y-4 flex-1 min-w-0">
              {/* Academic Kicker */}
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-sm border border-white/15">
                <BookOpen className="h-3.5 w-3.5" />
                <span>
                  {getCategoryLabel(test.testCategory, isRtl)} · {test.providerName}
                </span>
              </div>

              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-[22px] sm:text-[26px] font-bold text-white tracking-tight">
                  {primaryTitle}
                </h1>
                {test.abbreviation && (
                  <span className="font-mono text-xs font-black text-[#142B5F] bg-[#F2CD78] px-3 py-1 rounded-xl shadow-xs">
                    {test.abbreviation}
                  </span>
                )}
                {secondaryTitle &&
                  secondaryTitle !== primaryTitle &&
                  secondaryTitle.toLowerCase() !== test.abbreviation?.toLowerCase() && (
                    <span className="text-xs font-bold text-white/70">({secondaryTitle})</span>
                  )}
              </div>

              {/* Badges Row: Status, Completeness, Visibility */}
              <div className="flex flex-wrap items-center gap-2.5 text-xs">
                <StatusBadge status={test.status} isHeader={true} />
                {test.completenessStatus && (
                  <CompletenessBadge status={test.completenessStatus} isHeader={true} />
                )}
                {test.isSourceVerified && (
                  <span className="inline-flex items-center gap-1 bg-white/15 backdrop-blur-sm text-emerald-200 border border-white/20 px-2.5 py-1 rounded-xl text-xs font-bold">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{isRtl ? 'مصدر معتمد' : 'Verified Source'}</span>
                  </span>
                )}
              </div>

              {/* Save Status & Last Saved Time */}
              <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
                {hasUnsavedChanges ? (
                  <span className="text-amber-200 font-bold flex items-center gap-1.5 bg-amber-500/20 border border-amber-300/30 px-2.5 py-1 rounded-xl backdrop-blur-sm">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-300" />
                    <span>{isRtl ? 'توجد تعديلات غير محفوظة' : 'Unsaved modifications'}</span>
                  </span>
                ) : (
                  <span className="text-emerald-200 font-bold flex items-center gap-1.5 bg-emerald-500/20 border border-emerald-300/30 px-2.5 py-1 rounded-xl backdrop-blur-sm">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                    <span>{isRtl ? 'كل التعديلات محفوظة' : 'All modifications saved'}</span>
                  </span>
                )}
                <span className="text-white/40">•</span>
                <span className="text-white/80 font-medium">
                  <Clock className="w-3.5 h-3.5 inline ml-1 rtl:ml-1 ltr:mr-1 text-white/60" />
                  {isRtl ? 'آخر حفظ:' : 'Last saved:'} {formatDetailDateTime(lastSavedAt, isRtl)}
                </span>
              </div>
            </div>

            {/* Action Buttons Toolbar */}
            <div className="relative z-10 flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
              {/* Save only registered dirty administrative forms. */}
              {hasUnsavedChanges && (
                <button
                  type="button"
                  disabled={actionLoading}
                  onClick={handleSaveChanges}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold backdrop-blur-sm transition shadow-xs cursor-pointer disabled:opacity-50"
                  title={isRtl ? 'حفظ التعديلات' : 'Save Changes'}
                >
                  <Save className="w-4 h-4 text-[#F2CD78]" />
                  <span>{isRtl ? 'حفظ التعديلات' : 'Save Changes'}</span>
                </button>
              )}

              {/* Public Admin Preview Button */}
              <button
                type="button"
                onClick={() => setShowPreviewModal(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold backdrop-blur-sm transition shadow-xs cursor-pointer"
                title={isRtl ? 'معاينة إدارية للصفحة العامة' : 'Admin Preview Public Page'}
              >
                <Eye className="w-4 h-4 text-cyan-200" />
                <span>{isRtl ? 'معاينة الصفحة العامة' : 'Preview Page'}</span>
              </button>

              <button type="button" onClick={() => switchTab('readiness')} className="test-refresh">
                <ShieldCheck size={16} />
                {isRtl ? 'المراجعة والنشر' : 'Review and publication'}
              </button>
              {test.status === 'PUBLISHED' && test.isPubliclyVisible === true && test.slug && (
                <a
                  className="test-refresh"
                  target="_blank"
                  rel="noreferrer"
                  href={`${(import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '')}/international-tests/${encodeURIComponent(test.slug)}`}
                >
                  {isRtl ? 'فتح الصفحة المنشورة' : 'Open published page'}
                </a>
              )}
            </div>
          </div>
        </section>

        {/* Four Primary Tabs Navigation */}
        <div className="border-b border-slate-200 overflow-x-auto">
          <nav className="admin-section-navigation flex space-x-2 sm:space-x-4 rtl:space-x-reverse min-w-max pb-1">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const TabIcon = tab.icon;
              return (
                <button
                  key={tab.id}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => switchTab(tab.id)}
                  className={`flex items-center gap-2 py-3 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#142B5F] text-white shadow-xs'
                      : 'text-slate-600 hover:text-[#142B5F] hover:bg-slate-100'
                  }`}
                >
                  <TabIcon
                    className={`w-4 h-4 ${isActive ? 'text-[#21A7B4]' : 'text-slate-400'}`}
                  />
                  <span>{isRtl ? tab.labelAr : tab.labelEn}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content Panels */}
        <div className="bg-white border border-[#DDEFF2] rounded-3xl p-6 sm:p-8 shadow-sm">
          {activeTab === 'details' && (
            <div className="space-y-5">
              <section className="test-canonical-summary">
                <h2 className="test-region-title">
                  <Info size={18} />
                  {isRtl ? 'معلومات الاختبار' : 'Test information'}
                </h2>
                <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {[
                    [isRtl ? 'الاسم' : 'Name', primaryTitle],
                    [isRtl ? 'الاختصار' : 'Abbreviation', test.abbreviation],
                    [isRtl ? 'التصنيف' : 'Category', getCategoryLabel(test.testCategory, isRtl)],
                    [isRtl ? 'الجهة المنظمة' : 'Provider', test.providerName],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-4 flex flex-wrap gap-3">
                  {[
                    [
                      isRtl ? 'التسجيل الرسمي' : 'Official registration',
                      test.officialRegistrationUrl ??
                        test.officialLinks?.find((link) => link.linkType === 'REGISTRATION')?.url,
                    ],
                    [isRtl ? 'المصدر الرسمي' : 'Official source', test.officialSourceUrl],
                  ].map(([label, url]) =>
                    url && /^https?:\/\//i.test(url) ? (
                      <a
                        key={label}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="test-open-link"
                      >
                        <ExternalLink size={16} />
                        {label}
                      </a>
                    ) : null,
                  )}
                </div>
              </section>
              <InternationalTestSourceSectionsViewer testId={test.id} isRtl={isRtl} />
            </div>
          )}
          {activeTab === 'relationships' && (
            <div className="space-y-5">
              <SavedTestCanonicalRelationships test={test} isRtl={isRtl} />
              {hasPermission('admin:international-tests:review') &&
                hasPermission('admin:academic-taxonomy:manage') && (
                  <ReviewedGraphEditor
                    key={test.id}
                    ownerId={test.id}
                    ownerStatus={test.status}
                    domain="TEST"
                    isRtl={isRtl}
                    onSaved={() => fetchDetail()}
                  />
                )}
              <CrossPhaseTab testId={test.id} isRtl={isRtl} />
            </div>
          )}
          {activeTab === 'readiness' && (
            <div className="space-y-5">
              <ReadinessTab test={test} isRtl={isRtl} />
              <InternationalTestGovernanceWorkspace
                key={test.id}
                testId={test.id}
                isRtl={isRtl}
                onSaved={fetchDetail}
                mode="readiness"
                onDirtyChange={setGovernanceDirty}
                externalDirty={hasUnsavedChanges}
              />
              {canManage && (
                <section className="test-admin-tools">
                  <h2 className="test-region-title">
                    <ShieldCheck size={18} />
                    {isRtl ? 'إدارة البيانات التشغيلية' : 'Operational data administration'}
                  </h2>
                  <p className="text-[12px] text-slate-500">
                    {isRtl
                      ? 'أدوات إدارية منفصلة عن عرض ملف المصدر؛ التغييرات تخضع للمراجعة.'
                      : 'Administrative tools are separate from the source reader and subject to review.'}
                  </p>
                  <button
                    type="button"
                    className="mt-3"
                    onClick={() => {
                      if (
                        hasUnsavedChanges &&
                        !window.confirm(isRtl ? 'التخلي عن التعديلات؟' : 'Discard changes?')
                      )
                        return;
                      setShowEditors(!showEditors);
                    }}
                  >
                    {showEditors
                      ? isRtl
                        ? 'إغلاق الأدوات'
                        : 'Close tools'
                      : isRtl
                        ? 'فتح أدوات الإدارة'
                        : 'Open administrative tools'}
                  </button>
                  {showEditors && !['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(test.status) && (
                    <div className="mt-4 space-y-4">
                      <label className="block">
                        {isRtl ? 'مبرر تعديل البيانات التشغيلية' : 'Operational edit reason'}
                        <textarea
                          aria-label={
                            isRtl ? 'مبرر تعديل البيانات التشغيلية' : 'Operational edit reason'
                          }
                          minLength={3}
                          maxLength={2000}
                          value={editorReason}
                          onChange={(event) => setEditorReason(event.target.value)}
                        />
                      </label>
                      <label className="block">
                        {isRtl ? 'مساحة الإدارة' : 'Administrative area'}
                        <select
                          value={editorGroup}
                          onChange={(event) => {
                            if (
                              hasUnsavedChanges &&
                              !window.confirm(isRtl ? 'التخلي عن التعديلات؟' : 'Discard changes?')
                            )
                              return;
                            editors.current.clear();
                            setHasUnsavedChanges(false);
                            setEditorGroup(event.target.value);
                          }}
                        >
                          {[
                            ['overview', 'الهوية والوصف', 'Identity and description'],
                            ['variants', 'الأنواع وطرق التقديم', 'Variants and delivery'],
                            ['availability', 'التوفر والمراكز', 'Availability and centers'],
                            ['sections', 'مهارات الامتحان', 'Exam skills'],
                            ['scoring', 'الدرجات والمعادلات', 'Scoring and equivalencies'],
                            ['requirements', 'المتطلبات والسياسات', 'Requirements and policies'],
                            ['fees', 'الرسوم', 'Fees'],
                            ['preparation', 'مواد التحضير', 'Preparation'],
                            ['links', 'الروابط الرسمية', 'Official links'],
                          ].map(([key, ar, en]) => (
                            <option value={key} key={key}>
                              {isRtl ? ar : en}
                            </option>
                          ))}
                        </select>
                      </label>
                      <div key={editorGroup}>{renderAdministrativeEditor(editorGroup)}</div>
                    </div>
                  )}
                  {showEditors && ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(test.status) && (
                    <p className="mt-3 text-[13px]">
                      {isRtl
                        ? 'حالة السجل الحالية تمنع تحرير البيانات التشغيلية مباشرة.'
                        : 'The current record status prevents direct operational editing.'}
                    </p>
                  )}
                </section>
              )}
            </div>
          )}
          {activeTab === 'sources_history' && (
            <div className="space-y-5">
              <InternationalTestSourceSectionsViewer
                testId={test.id}
                isRtl={isRtl}
                mode="sources"
                onNamesReviewed={fetchDetail}
                canChangeVersion={() => {
                  if (!hasUnsavedChanges) return true;
                  setActionError(
                    isRtl
                      ? 'احفظ التعديلات قبل تغيير نسخة المصدر.'
                      : 'Save changes before switching source versions.',
                  );
                  return false;
                }}
              />
              <InternationalTestGovernanceWorkspace
                testId={test.id}
                isRtl={isRtl}
                onSaved={fetchDetail}
                mode="sources"
                onDirtyChange={setGovernanceDirty}
                externalDirty={hasUnsavedChanges}
              />
              {canManage && (
                <details>
                  <summary>{isRtl ? 'إدارة أدلة المصدر' : 'Manage source evidence'}</summary>
                  <EvidenceTab
                    testId={test.id}
                    initialEvidence={test.importEvidence}
                    onRefresh={fetchDetail}
                    isRtl={isRtl}
                  />
                </details>
              )}
              {hasPermission('admin:translation:manage') && (
                <details>
                  <summary>
                    {isRtl ? 'ترجمة الاسم والوصف' : 'Name and description translations'}
                  </summary>
                  <OwnerDescriptionTranslationPanel
                    domain="INTERNATIONAL_TEST"
                    ownerId={test.id}
                    endpoint="/admin/international-tests"
                    optionalFields={test.optionalFields}
                    status={test.status}
                    onSaved={() => fetchDetail()}
                  />
                </details>
              )}
            </div>
          )}
        </div>

        {showPreviewModal && (
          <div
            className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6"
            role="dialog"
            aria-modal="true"
            aria-label="معاينة الاختبار العامة"
          >
            <div className="mx-auto max-w-3xl max-h-full overflow-y-auto rounded-2xl shadow-2xl">
              <div className="bg-[#0E7C86] px-4 py-3 text-white text-xs font-bold">
                معاينة البيانات المحفوظة بنفس تصميم الصفحة العامة؛ لا تعني نشر المسودة.
                {hasUnsavedChanges && (
                  <span className="block mt-1">احفظ التعديلات أولاً لتظهر في المعاينة.</span>
                )}
              </div>
              <ExamDetails
                exam={mapInternationalTestToExam({ ...test, locale: isRtl ? 'ar' : 'en' })}
                onClose={() => setShowPreviewModal(false)}
              />
            </div>
          </div>
        )}
      </div>
    </TestEditorSaveContext.Provider>
  );
}

// ----------------------------------------------------------------------
// VARIANTS TAB
// ----------------------------------------------------------------------
function VariantsTab({
  testId,
  initialVariants,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialVariants: Variant[];
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<Variant>({
    variantName: '',
    deliveryMode: 'ONLINE',
    isActive: true,
    specificOfficialUrl: '',
    administrativeNotes: '',
  });

  useEffect(() => {
    setVariants(initialVariants);
  }, [initialVariants]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.variantName.trim()) {
      setError(isRtl ? 'اسم النسخة مطلوب.' : 'Variant name is required.');
      return;
    }

    setSaving(true);
    try {
      await adminApiClient.upsertInternationalTestVariant(testId, form);
      setSuccess(isRtl ? 'تم حفظ النسخة بنجاح.' : 'Variant saved successfully.');
      setForm({
        variantName: '',
        deliveryMode: 'ONLINE',
        isActive: true,
        specificOfficialUrl: '',
        administrativeNotes: '',
      });
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ النسخة.' : 'Failed to save variant.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl ? 'النسخ والأنواع (Variants & Delivery Modes)' : 'Variants & Types'}
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Existing Variants List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">
          {isRtl ? 'النسخ المسجلة حالياً' : 'Current Registered Variants'}
        </h4>
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : variants.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl
              ? 'لا توجد نسخ مسجلة حالياً لهذا الاختبار.'
              : 'No variants registered currently.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variants.map((v, i) => (
              <div
                key={v.id || i}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm"
              >
                <div className="flex justify-between items-start">
                  <h5 className="font-bold text-gray-900">{v.variantName}</h5>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold ${v.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}
                  >
                    {v.isActive ? (isRtl ? 'نشط' : 'Active') : isRtl ? 'غير نشط' : 'Inactive'}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  <span className="font-medium">{isRtl ? 'نمط التقديم: ' : 'Delivery Mode: '}</span>
                  {mapDeliveryMode(v.deliveryMode, isRtl)}
                </p>
                {v.specificOfficialUrl && (
                  <p className="text-xs">
                    <a
                      href={v.specificOfficialUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1"
                    >
                      {v.specificOfficialUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
                {v.administrativeNotes && (
                  <p className="text-xs text-gray-500 bg-white p-2 rounded border">
                    {v.administrativeNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Variant Form */}
      <form
        {...editorForm}
        className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm"
      >
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة أو تحديث نسخة' : 'Add or Update Variant'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'اسم النسخة' : 'Variant Name'} *
            </label>
            <input
              type="text"
              value={form.variantName}
              onChange={(e) => setForm({ ...form, variantName: e.target.value })}
              placeholder={
                isRtl ? 'مثال: Academic, General Training' : 'e.g. Academic, General Training'
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'نمط التقديم' : 'Delivery Mode'} *
            </label>
            <select
              value={form.deliveryMode}
              onChange={(e) => setForm({ ...form, deliveryMode: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="ONLINE">{isRtl ? 'عبر الإنترنت (Online)' : 'Online'}</option>
              <option value="IN_PERSON">{isRtl ? 'حضوري (In-Person)' : 'In-Person'}</option>
              <option value="HYBRID">{isRtl ? 'هجين (Hybrid)' : 'Hybrid'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'رابط أصل مخصص (اختياري)' : 'Specific Official URL'}
            </label>
            <input
              type="url"
              value={form.specificOfficialUrl || ''}
              onChange={(e) => setForm({ ...form, specificOfficialUrl: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'ملاحظات إدارية' : 'Administrative Notes'}
            </label>
            <input
              type="text"
              value={form.administrativeNotes || ''}
              onChange={(e) => setForm({ ...form, administrativeNotes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isActive"
            checked={form.isActive}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            className="rounded border-gray-300 text-black focus:ring-black"
          />
          <label htmlFor="isActive" className="text-sm font-medium text-gray-800">
            {isRtl ? 'النسخة نشطة ومتاحة' : 'Variant is active'}
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ النسخة' : 'Save Variant'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// SECTIONS TAB
// ----------------------------------------------------------------------
function SectionsTab({
  testId,
  initialSections,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialSections: Section[];
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<Section>({
    sectionName: '',
    sectionType: 'READING',
    durationMinutes: 30,
    order: 1,
    questionTypes: [],
    scoreMinimum: 0,
    scoreMaximum: 30,
  });

  const [questionTypesInput, setQuestionTypesInput] = useState('');

  useEffect(() => {
    setSections(initialSections);
  }, [initialSections]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.sectionName.trim()) {
      setError(isRtl ? 'اسم القسم مطلوب.' : 'Section name is required.');
      return;
    }

    if ((form.scoreMinimum ?? 0) > (form.scoreMaximum ?? 0)) {
      setError(
        isRtl
          ? 'الحد الأدنى للدرجات يجب أن يكون أقل من أو يساوي الحد الأقصى.'
          : 'Minimum score must be less than or equal to maximum score.',
      );
      return;
    }

    const payload = {
      ...form,
      questionTypes: questionTypesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      await adminApiClient.upsertInternationalTestSection(testId, payload);
      setSuccess(isRtl ? 'تم حفظ القسم بنجاح.' : 'Section saved successfully.');
      setForm({
        sectionName: '',
        sectionType: 'READING',
        durationMinutes: 30,
        order: sections.length + 1,
        questionTypes: [],
        scoreMinimum: 0,
        scoreMaximum: 30,
      });
      setQuestionTypesInput('');
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ القسم.' : 'Failed to save section.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl ? 'أقسام الاختبار (Test Sections)' : 'Test Sections'}
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Sections List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">
          {isRtl ? 'الأقسام المضافة حالياً' : 'Current Added Sections'}
        </h4>
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : sections.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد أقسام مضافة حالياً.' : 'No sections added currently.'}
          </p>
        ) : (
          <div className="overflow-x-auto border rounded-lg">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-gray-50 border-b text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-2.5">#</th>
                  <th className="px-4 py-2.5">{isRtl ? 'اسم القسم' : 'Name'}</th>
                  <th className="px-4 py-2.5">{isRtl ? 'نوع القسم' : 'Type'}</th>
                  <th className="px-4 py-2.5">{isRtl ? 'المدة (دقيقة)' : 'Duration (min)'}</th>
                  <th className="px-4 py-2.5">{isRtl ? 'نطاق الدرجات' : 'Score Range'}</th>
                  <th className="px-4 py-2.5">{isRtl ? 'أنواع الأسئلة' : 'Question Types'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {sections.map((sec, idx) => (
                  <tr key={sec.id || idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-gray-500">{sec.order ?? idx + 1}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{sec.sectionName}</td>
                    <td className="px-4 py-3 text-gray-600">{sec.sectionType}</td>
                    <td className="px-4 py-3">
                      {sec.durationMinutes
                        ? `${sec.durationMinutes} ${isRtl ? 'دقيقة' : 'min'}`
                        : '-'}
                    </td>
                    <td className="px-4 py-3 font-mono">
                      {sec.scoreMinimum ?? 0} - {sec.scoreMaximum ?? 0}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {(sec.questionTypes || []).join(', ') || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Section Form */}
      <form
        {...editorForm}
        className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm"
      >
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة قسم جديد' : 'Add New Section'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'اسم القسم' : 'Section Name'} *
            </label>
            <input
              type="text"
              value={form.sectionName}
              onChange={(e) => setForm({ ...form, sectionName: e.target.value })}
              placeholder={isRtl ? 'مثال: القراءة، القراءة والاستماع' : 'e.g. Reading'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'نوع القسم' : 'Section Type'}
            </label>
            <select
              value={form.sectionType}
              onChange={(e) => setForm({ ...form, sectionType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="READING">{isRtl ? 'القراءة (Reading)' : 'Reading'}</option>
              <option value="WRITING">{isRtl ? 'الكتابة (Writing)' : 'Writing'}</option>
              <option value="LISTENING">{isRtl ? 'الاستماع (Listening)' : 'Listening'}</option>
              <option value="SPEAKING">{isRtl ? 'المحادثة (Speaking)' : 'Speaking'}</option>
              <option value="MATHEMATICS">
                {isRtl ? 'الرياضيات (Mathematics)' : 'Mathematics'}
              </option>
              <option value="INTEGRATED">{isRtl ? 'متكامل (Integrated)' : 'Integrated'}</option>
              <option value="OTHER">{isRtl ? 'آخر' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'الترتيب' : 'Order'}
            </label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 1 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'المدة (بالدقائق)' : 'Duration (Minutes)'}
            </label>
            <input
              type="number"
              value={form.durationMinutes || ''}
              onChange={(e) =>
                setForm({ ...form, durationMinutes: parseInt(e.target.value, 10) || 0 })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'الحد الأدنى للدرجة' : 'Score Minimum'}
            </label>
            <input
              type="number"
              value={form.scoreMinimum ?? 0}
              onChange={(e) => setForm({ ...form, scoreMinimum: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'الحد الأقصى للدرجة' : 'Score Maximum'}
            </label>
            <input
              type="number"
              value={form.scoreMaximum ?? 30}
              onChange={(e) => setForm({ ...form, scoreMaximum: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            {isRtl ? 'أنواع الأسئلة (مفصولة بفاصلة)' : 'Question Types (comma separated)'}
          </label>
          <input
            type="text"
            value={questionTypesInput}
            onChange={(e) => setQuestionTypesInput(e.target.value)}
            placeholder={
              isRtl ? 'مثال: Multiple Choice, Essay, Short Answer' : 'e.g. Multiple Choice, Essay'
            }
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ القسم' : 'Save Section'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// SCORING TAB
// ----------------------------------------------------------------------
function ScoringTab({
  testId,
  initialScoreScale,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialScoreScale?: ScoreScale;
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<ScoreScale>({
    overallMinimum: initialScoreScale?.overallMinimum ?? 0,
    overallMaximum: initialScoreScale?.overallMaximum ?? 9,
    scoreIncrement: initialScoreScale?.scoreIncrement ?? 0.5,
    passFailRules: initialScoreScale?.passFailRules ?? '',
    cefrEquivalency: initialScoreScale?.cefrEquivalency ?? '',
    crossTestEquivalency: initialScoreScale?.crossTestEquivalency ?? '',
    resultValidityDurationMonths: initialScoreScale?.resultValidityDurationMonths ?? undefined,
    resultDeliveryTimeDays: initialScoreScale?.resultDeliveryTimeDays ?? undefined,
    scoreReportingUrl: initialScoreScale?.scoreReportingUrl ?? '',
  });

  const [bandsInput, setBandsInput] = useState<string>(
    (initialScoreScale?.bandsOrLevels || []).join(', '),
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validation requirement
    if (form.overallMinimum > form.overallMaximum) {
      setError(
        isRtl
          ? 'الحد الأدنى للدرجات (Overall Minimum) يجب أن يكون أقل من أو يساوي الحد الأقصى (Overall Maximum).'
          : 'Overall Minimum score must be less than or equal to Overall Maximum.',
      );
      return;
    }

    const payload = {
      ...form,
      bandsOrLevels: bandsInput
        .split(',')
        .map((b) => b.trim())
        .filter(Boolean),
    };

    setSaving(true);
    try {
      await adminApiClient.upsertInternationalTestScoreScale(testId, payload);
      setSuccess(isRtl ? 'تم حفظ نظام ومقياس الدرجات بنجاح.' : 'Score scale saved successfully.');
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ نظام الدرجات.' : 'Failed to save score scale.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl
            ? 'نظام وتوزيع الدرجات (Score Scale & Grading System)'
            : 'Score Scale & Grading System'}
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <form {...editorForm} className="space-y-6 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'الحد الأدنى الكلي (Minimum)' : 'Overall Minimum'} *
            </label>
            <input
              type="number"
              step="any"
              value={form.overallMinimum}
              onChange={(e) =>
                setForm({ ...form, overallMinimum: parseFloat(e.target.value) || 0 })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'الحد الأقصى الكلي (Maximum)' : 'Overall Maximum'} *
            </label>
            <input
              type="number"
              step="any"
              value={form.overallMaximum}
              onChange={(e) =>
                setForm({ ...form, overallMaximum: parseFloat(e.target.value) || 0 })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'معدل الزيادة (Increment)' : 'Score Increment'}
            </label>
            <input
              type="number"
              step="any"
              value={form.scoreIncrement ?? 0.5}
              onChange={(e) =>
                setForm({ ...form, scoreIncrement: parseFloat(e.target.value) || 0 })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'مدة صلاحية النتيجة (بالأشهر)' : 'Result Validity (Months)'}
            </label>
            <input
              type="number"
              value={form.resultValidityDurationMonths ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  resultValidityDurationMonths:
                    e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'زمن صدور النتائج (بالأيام)' : 'Result Delivery (Days)'}
            </label>
            <input
              type="number"
              value={form.resultDeliveryTimeDays ?? ''}
              onChange={(e) =>
                setForm({
                  ...form,
                  resultDeliveryTimeDays:
                    e.target.value === '' ? undefined : Number(e.target.value),
                })
              }
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'رابط تقارير وإرسال الدرجات' : 'Score Reporting URL'}
            </label>
            <input
              type="url"
              value={form.scoreReportingUrl || ''}
              onChange={(e) => setForm({ ...form, scoreReportingUrl: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            {isRtl ? 'المستويات / النطاقات (مفصولة بفاصلة)' : 'Bands / Levels (comma separated)'}
          </label>
          <input
            type="text"
            value={bandsInput}
            onChange={(e) => setBandsInput(e.target.value)}
            placeholder={isRtl ? 'مثال: Band 6, Band 7, Band 8' : 'e.g. Band 6, Band 7'}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'قواعد النجاح/الرسوب' : 'Pass / Fail Rules'}
            </label>
            <textarea
              rows={3}
              value={form.passFailRules || ''}
              onChange={(e) => setForm({ ...form, passFailRules: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'المعادلة الإطار الأوروبي CEFR' : 'CEFR Equivalency'}
            </label>
            <textarea
              rows={3}
              value={form.cefrEquivalency || ''}
              onChange={(e) => setForm({ ...form, cefrEquivalency: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'المعادلة مع اختبارات أخرى' : 'Cross-test Equivalency'}
            </label>
            <textarea
              rows={3}
              value={form.crossTestEquivalency || ''}
              onChange={(e) => setForm({ ...form, crossTestEquivalency: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ نظام الدرجات' : 'Save Score Scale'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// FEES TAB
// ----------------------------------------------------------------------
function FeesTab({
  testId,
  initialFees,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialFees: FeeMetadata[];
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<FeeMetadata>({
    feeType: 'REGISTRATION',
    amount: 0,
    currencyCode: 'USD',
    hasRegionalVariation: false,
    validityWindowNotes: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validations
    if (form.amount < 0) {
      setError(isRtl ? 'مبلغ الرسوم لا يمكن أن يكون بالسالب.' : 'Fee amount cannot be negative.');
      return;
    }

    if (!form.currencyCode || !form.currencyCode.trim()) {
      setError(isRtl ? 'رمز العملة (مثال: SAR, USD) مطلوب.' : 'Currency code is required.');
      return;
    }

    setSaving(true);
    try {
      await adminApiClient.upsertInternationalTestFeeMetadata(testId, form);
      setSuccess(isRtl ? 'تم حفظ بيانات الرسوم بنجاح.' : 'Fee metadata saved successfully.');
      setForm({
        feeType: 'REGISTRATION',
        amount: 0,
        currencyCode: 'USD',
        hasRegionalVariation: false,
        validityWindowNotes: '',
      });
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ بيانات الرسوم.' : 'Failed to save fee metadata.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl ? 'رسوم الاختبار (Fee Metadata)' : 'Fee Metadata'}
        </h3>
      </div>

      {/* Mandatory Non-Payment Execution Notice */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <span className="font-semibold">
          {isRtl
            ? 'هذه بيانات رسوم وصفية فقط، ولا تنفذ أي عملية دفع.'
            : 'These are fee metadata only and do not execute payment.'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Existing Fees List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">
          {isRtl ? 'الرسوم المسجلة حالياً' : 'Current Registered Fees'}
        </h4>
        {initialFees.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد بيانات رسوم مسجلة حالياً.' : 'No fee metadata registered currently.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialFees.map((fee, idx) => (
              <div
                key={fee.id || idx}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-1 text-sm"
              >
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{mapFeeType(fee.feeType, isRtl)}</span>
                  <span className="font-mono font-bold text-black text-base">
                    {fee.amount} {fee.currencyCode}
                  </span>
                </div>
                {fee.hasRegionalVariation && (
                  <p className="text-xs text-amber-800 bg-amber-100/60 px-2 py-0.5 rounded inline-block">
                    {isRtl ? 'توجد فروقات إقليمية في الرسوم' : 'Has regional variation'}
                  </p>
                )}
                {fee.validityWindowNotes && (
                  <p className="text-xs text-gray-600 pt-1">{fee.validityWindowNotes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Fee Form */}
      <form
        {...editorForm}
        className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm"
      >
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة أو تعديل رسوم' : 'Add or Update Fee'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'نوع الرسوم' : 'Fee Type'} *
            </label>
            <select
              value={form.feeType}
              onChange={(e) => setForm({ ...form, feeType: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="REGISTRATION">
                {isRtl ? 'تسجيل عادي (Registration)' : 'Registration'}
              </option>
              <option value="LATE_REGISTRATION">
                {isRtl ? 'تسجيل متأخر (Late Registration)' : 'Late Registration'}
              </option>
              <option value="RESCHEDULING">
                {isRtl ? 'إعادة جدولة (Rescheduling)' : 'Rescheduling'}
              </option>
              <option value="CANCELLATION">
                {isRtl ? 'إلغاء (Cancellation)' : 'Cancellation'}
              </option>
              <option value="OTHER">{isRtl ? 'أخرى (Other)' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'المبلغ' : 'Amount'} *
            </label>
            <input
              type="number"
              min="0"
              step="any"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'رمز العملة' : 'Currency Code'} *
            </label>
            <input
              type="text"
              value={form.currencyCode}
              onChange={(e) => setForm({ ...form, currencyCode: e.target.value.toUpperCase() })}
              placeholder="e.g. USD, SAR, EUR"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            {isRtl ? 'ملاحظات وتفاصيل الاستحقاق' : 'Validity Window Notes'}
          </label>
          <input
            type="text"
            value={form.validityWindowNotes || ''}
            onChange={(e) => setForm({ ...form, validityWindowNotes: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black text-sm"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            id="hasRegionalVariation"
            checked={form.hasRegionalVariation}
            onChange={(e) => setForm({ ...form, hasRegionalVariation: e.target.checked })}
            className="rounded border-gray-300 text-black focus:ring-black"
          />
          <label htmlFor="hasRegionalVariation" className="text-sm font-medium text-gray-800">
            {isRtl
              ? 'الرسوم تختلف بحسب الدولة أو المنطقة (Regional Variation)'
              : 'Fee varies by region'}
          </label>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ الرسوم' : 'Save Fee'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// OFFICIAL LINKS TAB
// ----------------------------------------------------------------------
function OfficialLinksTab({
  testId,
  initialLinks,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialLinks: OfficialLink[];
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<OfficialLink>({
    linkType: 'REGISTRATION',
    url: '',
    description: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.url || !form.url.trim()) {
      setError(isRtl ? 'الرابط الإلكتروني (URL) مطلوب.' : 'URL is required.');
      return;
    }

    setSaving(true);
    try {
      await adminApiClient.upsertInternationalTestOfficialLink(testId, form);
      setSuccess(isRtl ? 'تم حفظ الرابط الرسمي بنجاح.' : 'Official link saved successfully.');
      setForm({
        linkType: 'REGISTRATION',
        url: '',
        description: '',
      });
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(
        err.message || (isRtl ? 'تعذر حفظ الرابط الرسمي.' : 'Failed to save official link.'),
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl ? 'الروابط الرسمية والمعتمدة (Official Links)' : 'Official Links'}
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Existing Links List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">
          {isRtl ? 'الروابط المسجلة حالياً' : 'Current Registered Links'}
        </h4>
        {initialLinks.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl
              ? 'لا توجد روابط رسمية مسجلة حالياً.'
              : 'No official links registered currently.'}
          </p>
        ) : (
          <div className="space-y-2">
            {initialLinks.map((link, idx) => (
              <div
                key={link.id || idx}
                className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm"
              >
                <div>
                  <span className="font-bold text-gray-900 ml-2 rtl:ml-2 ltr:mr-2">
                    {mapLinkType(link.linkType, isRtl)}
                  </span>
                  <a
                    href={link.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-xs"
                  >
                    {link.url} <ExternalLink className="h-3 w-3" />
                  </a>
                  {link.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Link Form */}
      <form
        {...editorForm}
        className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm"
      >
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة رابط رسمي جديد' : 'Add New Official Link'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'نوع الرابط' : 'Link Type'} *
            </label>
            <select
              value={form.linkType}
              onChange={(e) => setForm({ ...form, linkType: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="REGISTRATION">
                {isRtl ? 'رابط التسجيل (Registration)' : 'Registration'}
              </option>
              <option value="INFORMATION">
                {isRtl ? 'رابط معلومات الاختبار (Information)' : 'Information'}
              </option>
              <option value="PREPARATION">
                {isRtl ? 'رابط مواد التحضير (Preparation)' : 'Preparation'}
              </option>
              <option value="SCORE_REPORTING">
                {isRtl ? 'رابط تقارير الدرجات (Score Reporting)' : 'Score Reporting'}
              </option>
              <option value="OTHER">{isRtl ? 'أخرى (Other)' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'الرابط الإلكتروني (URL)' : 'URL'} *
            </label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            {isRtl ? 'وصف الرابط (اختياري)' : 'Description'}
          </label>
          <input
            type="text"
            value={form.description || ''}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ الرابط' : 'Save Link'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------------------------
function DetailField({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-gray-500 text-xs uppercase tracking-wider font-medium">{label}</dt>
      <dd className="text-gray-900 font-semibold mt-1">{value}</dd>
    </div>
  );
}

function StatusBadge({
  status,
  isHeader = false,
}: {
  status: InternationalTestStatus;
  isHeader?: boolean;
}) {
  const { language } = useTranslation();
  const label = language === 'ar' ? getStatusLabel(status) : status.replaceAll('_', ' ');
  if (isHeader) {
    const config =
      status === 'PUBLISHED'
        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-300/40'
        : status === 'READY_TO_PUBLISH'
          ? 'bg-sky-500/20 text-sky-200 border-sky-300/40'
          : status === 'ARCHIVED'
            ? 'bg-white/10 text-slate-300 border-white/20'
            : 'bg-amber-500/20 text-amber-200 border-amber-300/40';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border backdrop-blur-sm ${config}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span>{label}</span>
      </span>
    );
  }
  const className =
    status === 'PUBLISHED'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : status === 'READY_TO_PUBLISH'
        ? 'bg-sky-50 text-sky-700 border border-sky-200'
        : status === 'ARCHIVED'
          ? 'bg-slate-100 text-slate-600 border border-slate-200'
          : 'bg-amber-50 text-amber-800 border border-amber-200';
  return <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${className}`}>{label}</span>;
}

function CompletenessBadge({
  status,
  isHeader = false,
}: {
  status: InternationalTestCompletenessStatus;
  isHeader?: boolean;
}) {
  const { language } = useTranslation();
  const label = language === 'ar' ? getCompletenessLabel(status) : status.replaceAll('_', ' ');
  if (isHeader) {
    const config =
      status === 'COMPLETE'
        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-300/40'
        : status === 'NEEDS_REVIEW'
          ? 'bg-amber-500/20 text-amber-200 border-amber-300/40'
          : 'bg-rose-500/20 text-rose-200 border-rose-300/40';
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border backdrop-blur-sm ${config}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current" />
        <span>{label}</span>
      </span>
    );
  }
  const className =
    status === 'COMPLETE'
      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
      : status === 'NEEDS_REVIEW'
        ? 'bg-amber-50 text-amber-800 border border-amber-200'
        : 'bg-rose-50 text-rose-700 border border-rose-200';
  return <span className={`px-2.5 py-1 rounded-xl text-xs font-bold ${className}`}>{label}</span>;
}

function getStatusLabel(status: InternationalTestStatus): string {
  switch (status) {
    case 'PUBLISHED':
      return 'منشور';
    case 'READY_TO_PUBLISH':
      return 'جاهز للنشر';
    case 'READY_TO_REVIEW':
      return 'جاهز للمراجعة';
    case 'IMPORTED':
      return 'مستورد';
    case 'NEEDS_REVIEW':
      return 'يحتاج مراجعة';
    case 'ARCHIVED':
      return 'مؤرشف';
    case 'REJECTED':
      return 'مرفوض';
    default:
      return status;
  }
}

function getCompletenessLabel(status?: InternationalTestCompletenessStatus | null): string {
  if (!status) return 'غير متوفر';
  switch (status) {
    case 'COMPLETE':
      return 'مكتمل';
    case 'NEEDS_REVIEW':
      return 'يحتاج مراجعة';
    case 'INCOMPLETE':
      return 'غير مكتمل';
    default:
      return status;
  }
}

function getCategoryLabel(category: InternationalTestCategory, isRtl = true): string {
  if (!isRtl) {
    switch (category) {
      case 'ENGLISH_LANGUAGE':
        return 'English language';
      case 'NON_ENGLISH_LANGUAGE':
        return 'Other language';
      case 'LANGUAGE_PROFICIENCY':
        return 'Language proficiency';
      case 'GENERAL_UNDERGRADUATE_ADMISSION':
      case 'UNDERGRAD_ADMISSION':
        return 'Undergraduate admission';
      case 'GRADUATE_ADMISSION':
      case 'GRAD_ADMISSION':
        return 'Graduate admission';
      case 'NATIONAL_INTERNATIONAL_ADMISSION':
        return 'National or international admission';
      case 'SPECIALIZED_ADMISSION':
        return 'Specialized admission';
      case 'PROFESSIONAL_LICENSING_CERTIFICATION':
      case 'PROFESSIONAL_LICENSING':
        return 'Professional licensing';
      case 'ACADEMIC_PLACEMENT':
        return 'Academic placement';
      case 'OTHER':
        return 'Other';
      default:
        return category;
    }
  }
  switch (category) {
    case 'ENGLISH_LANGUAGE':
      return 'لغة إنجليزية';
    case 'NON_ENGLISH_LANGUAGE':
      return 'لغة غير إنجليزية';
    case 'LANGUAGE_PROFICIENCY':
      return 'إجادة لغة';
    case 'GENERAL_UNDERGRADUATE_ADMISSION':
    case 'UNDERGRAD_ADMISSION':
      return 'قبول جامعي عام';
    case 'GRADUATE_ADMISSION':
    case 'GRAD_ADMISSION':
      return 'قبول دراسات عليا';
    case 'NATIONAL_INTERNATIONAL_ADMISSION':
      return 'قبول وطني/دولي';
    case 'SPECIALIZED_ADMISSION':
      return 'قبول تخصصي';
    case 'PROFESSIONAL_LICENSING_CERTIFICATION':
    case 'PROFESSIONAL_LICENSING':
      return 'ترخيص/اعتماد مهني';
    case 'ACADEMIC_PLACEMENT':
      return 'تحديد مستوى أكاديمي';
    case 'OTHER':
      return 'أخرى';
    default:
      return category;
  }
}

function mapDeliveryMode(mode: string, isRtl: boolean): string {
  if (isRtl) {
    switch (mode) {
      case 'ONLINE':
        return 'عبر الإنترنت';
      case 'IN_PERSON':
        return 'حضوري';
      case 'HYBRID':
        return 'هجين';
      default:
        return mode;
    }
  }
  return mode;
}

function mapFeeType(type: string, isRtl: boolean): string {
  if (isRtl) {
    switch (type) {
      case 'REGISTRATION':
        return 'تسجيل عادي';
      case 'LATE_REGISTRATION':
        return 'تسجيل متأخر';
      case 'RESCHEDULING':
        return 'إعادة جدولة';
      case 'CANCELLATION':
        return 'إلغاء';
      case 'OTHER':
        return 'أخرى';
      default:
        return type;
    }
  }
  return type;
}

function mapLinkType(type: string, isRtl: boolean): string {
  if (isRtl) {
    switch (type) {
      case 'REGISTRATION':
        return 'رابط التسجيل';
      case 'INFORMATION':
        return 'رابط المعلومات';
      case 'PREPARATION':
        return 'مواد التحضير';
      case 'SCORE_REPORTING':
        return 'تقارير الدرجات';
      case 'OTHER':
        return 'رابط آخر';
      default:
        return type;
    }
  }
  return type;
}

function parseArray(val: any): string[] {
  if (!val) return [];
  if (Array.isArray(val)) return val;
  if (typeof val === 'string') {
    if (val.startsWith('[')) {
      try {
        const parsed = JSON.parse(val);
        if (Array.isArray(parsed)) return parsed;
      } catch (e) {
        // ignore
      }
    }
    return val
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

function mapSourceTrustLevel(level?: string, isRtl?: boolean): string {
  if (!level) return isRtl ? 'غير محدد' : 'Undefined';
  if (isRtl) {
    switch (level) {
      case 'AUTHORITATIVE':
        return 'مصدر رسمي مباشر';
      case 'HIGH':
        return 'ثقة عالية';
      case 'MEDIUM':
        return 'ثقة متوسطة';
      case 'LOW':
        return 'ثقة منخفضة';
      default:
        return level;
    }
  }
  return level;
}

function mapDuplicateStatus(status?: string, isRtl?: boolean): string {
  if (!status) return isRtl ? 'غير محدد' : 'Undefined';
  if (isRtl) {
    switch (status) {
      case 'NEW':
        return 'سجل جديد';
      case 'DUPLICATE_SKIPPED':
        return 'تكرار متجاوز';
      case 'EXISTING_ENRICHED':
        return 'سجل مثرى';
      default:
        return status;
    }
  }
  return status;
}

function mapMaterialType(type?: string, isRtl?: boolean): string {
  if (!type) return isRtl ? 'غير محدد' : 'Undefined';
  if (isRtl) {
    switch (type) {
      case 'SAMPLE_QUESTIONS':
        return 'أسئلة نموذجية';
      case 'PRACTICE_TEST':
        return 'اختبار تجريبي';
      case 'BROCHURE':
        return 'كتيب معلومات';
      case 'AUDIO_SAMPLE':
        return 'عينة صوتية';
      case 'GUIDE':
        return 'دليل تحضيري';
      default:
        return type;
    }
  }
  return type;
}

// ----------------------------------------------------------------------
// AVAILABILITY TAB
// ----------------------------------------------------------------------
function AvailabilityTab({
  testId,
  initialAvailability,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialAvailability?: any;
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [availability, setAvailability] = useState<any>(initialAvailability || null);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [countriesInput, setCountriesInput] = useState('');
  const [citiesInput, setCitiesInput] = useState('');
  const [regionsInput, setRegionsInput] = useState('');
  const [countryScope, setCountryScope] = useState<string>();
  const [windowsNotes, setWindowsNotes] = useState('');

  useEffect(() => {
    setAvailability(initialAvailability || null);
    setCountriesInput(parseArray(initialAvailability?.availableCountryIds).join(', '));
    setCitiesInput(parseArray(initialAvailability?.availableCityIds).join(', '));
    setRegionsInput(parseArray(initialAvailability?.onlineAvailabilityRegions).join(', '));
    setWindowsNotes(initialAvailability?.testingWindowsNotes || '');
  }, [initialAvailability]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    const payload = {
      availableCountryIds: countriesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      availableCityIds: citiesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      onlineAvailabilityRegions: regionsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      testingWindowsNotes: windowsNotes,
    };

    setSaving(true);
    try {
      await adminApiClient.upsertInternationalTestAvailability(testId, payload);
      setSuccess(isRtl ? 'تم حفظ بيانات التوفر بنجاح.' : 'Availability saved successfully.');
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ بيانات التوفر.' : 'Failed to save availability.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  const countries = parseArray(availability?.availableCountryIds);
  const cities = parseArray(availability?.availableCityIds);
  const regions = parseArray(availability?.onlineAvailabilityRegions);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl ? 'التوفر الجغرافي والإلكتروني (Availability)' : 'Availability'}
        </h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Existing Availability */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">
          {isRtl ? 'بيانات التوفر المسجلة حالياً' : 'Current Registered Availability'}
        </h4>
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !availability ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl
              ? 'لا توجد بيانات توفر مسجلة حالياً لهذا الاختبار.'
              : 'No availability data registered currently.'}
          </p>
        ) : (
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4 text-sm">
            <div>
              <span className="font-bold text-gray-900 block mb-1">
                {isRtl ? 'الدول المتاحة (معرفات/رموز مرجعية):' : 'Available Country IDs:'}
              </span>
              {countries.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {countries.map((c: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-white border border-gray-300 font-mono text-xs px-2.5 py-1 rounded-md text-gray-800 font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">
                  {isRtl ? 'لم يتم تحديد دول محددة' : 'No specific countries specified'}
                </p>
              )}
            </div>

            <div>
              <span className="font-bold text-gray-900 block mb-1">
                {isRtl ? 'المدن المتاحة (معرفات/رموز مرجعية):' : 'Available City IDs:'}
              </span>
              {cities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {cities.map((c: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-white border border-gray-300 font-mono text-xs px-2.5 py-1 rounded-md text-gray-800 font-semibold"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">
                  {isRtl ? 'لم يتم تحديد مدن محددة' : 'No specific cities specified'}
                </p>
              )}
            </div>

            <div>
              <span className="font-bold text-gray-900 block mb-1">
                {isRtl ? 'التوفر عبر الإنترنت (المناطق):' : 'Online Availability Regions:'}
              </span>
              {regions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {regions.map((r: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-blue-50 border border-blue-200 font-mono text-xs px-2.5 py-1 rounded-md text-blue-800 font-semibold"
                    >
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">
                  {isRtl ? 'لم يتم تحديد مناطق إنترنت' : 'No online regions specified'}
                </p>
              )}
            </div>

            {availability.testingWindowsNotes && (
              <div>
                <span className="font-bold text-gray-900 block mb-1">
                  {isRtl ? 'مواعيد ونوافذ الاختبار:' : 'Testing Windows Notes:'}
                </span>
                <p className="bg-white border border-gray-200 p-3 rounded-lg text-gray-700 whitespace-pre-line text-xs">
                  {availability.testingWindowsNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Update Availability Form */}
      <form
        {...editorForm}
        className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm"
      >
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'تحديث بيانات التوفر' : 'Update Availability Data'}
        </h4>

        <div className="space-y-4 text-sm">
          <div>
            <CanonicalPicker
              paged
              label={isRtl ? 'إضافة دولة' : 'Add country'}
              value={null}
              load={(q, page) => canonicalPickerApi.countries(q, page)}
              onChange={(id, item) => {
                if (id) {
                  setCountriesInput(
                    [
                      ...new Set([
                        ...countriesInput
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean),
                        id,
                      ]),
                    ].join(', '),
                  );
                  setCountryScope(item?.code);
                }
              }}
            />
            {countriesInput
              .split(',')
              .filter(Boolean)
              .map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() =>
                    setCountriesInput(
                      countriesInput
                        .split(',')
                        .filter((x) => x !== id)
                        .join(', '),
                    )
                  }
                >
                  {id} ×
                </button>
              ))}
          </div>

          <div>
            <CanonicalPicker
              paged
              label={isRtl ? 'دولة البحث عن المدن' : 'City search country'}
              value={null}
              load={(q, page) => canonicalPickerApi.countries(q, page)}
              onChange={(_id, item) => setCountryScope(item?.code)}
            />
            <CanonicalPicker
              paged
              label={isRtl ? 'إضافة مدينة' : 'Add city'}
              value={null}
              reloadKey={countryScope ?? ''}
              disabled={!countryScope}
              load={(q, page) => canonicalPickerApi.cities(countryScope, null, q, page)}
              onChange={(id) => {
                if (id)
                  setCitiesInput(
                    [
                      ...new Set([
                        ...citiesInput
                          .split(',')
                          .map((x) => x.trim())
                          .filter(Boolean),
                        id,
                      ]),
                    ].join(', '),
                  );
              }}
            />
            {citiesInput
              .split(',')
              .filter(Boolean)
              .map((id) => (
                <button
                  type="button"
                  key={id}
                  onClick={() =>
                    setCitiesInput(
                      citiesInput
                        .split(',')
                        .filter((x) => x !== id)
                        .join(', '),
                    )
                  }
                >
                  {id} ×
                </button>
              ))}
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'التوفر عبر الإنترنت (المناطق المتاحة)' : 'Online Availability Regions'}
            </label>
            <input
              type="text"
              value={regionsInput}
              onChange={(e) => setRegionsInput(e.target.value)}
              placeholder="e.g. GLOBAL, MIDDLE_EAST, ASIA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'مواعيد ونوافذ تقديم الاختبار' : 'Testing Windows Notes'}
            </label>
            <textarea
              rows={3}
              value={windowsNotes}
              onChange={(e) => setWindowsNotes(e.target.value)}
              placeholder={
                isRtl
                  ? 'تفاصيل المواعيد المتاحة على مدار العام...'
                  : 'Details on available testing windows...'
              }
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ التوفر' : 'Save Availability'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// PREPARATION MATERIALS TAB
// ----------------------------------------------------------------------
function PreparationMaterialsTab({
  testId,
  initialMaterials,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialMaterials: any[];
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [materials, setMaterials] = useState<any[]>(initialMaterials);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    materialType: 'SAMPLE_QUESTIONS',
    title: '',
    url: '',
    assetId: '',
    description: '',
  });

  useEffect(() => {
    setMaterials(initialMaterials);
  }, [initialMaterials]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!form.title.trim()) {
      setError(isRtl ? 'عنوان المادة مطلوب.' : 'Material title is required.');
      return;
    }

    // Validation against local file paths
    const urlLower = form.url.trim().toLowerCase();
    if (
      urlLower.startsWith('file://') ||
      urlLower.startsWith('file:') ||
      urlLower.startsWith('/local/') ||
      urlLower.startsWith('/tmp/') ||
      /^[a-z]:\\/i.test(urlLower)
    ) {
      setError(
        isRtl
          ? 'يجب تسجيل الملفات المحفوظة عبر نظام الأصول، وليس كمسارات ملفات محلية.'
          : 'Persisted files must be registered through the asset system, not local file paths.',
      );
      return;
    }

    setSaving(true);
    try {
      await adminApiClient.upsertInternationalTestPreparationMaterial(testId, form);
      setSuccess(isRtl ? 'تم حفظ مادة التحضير بنجاح.' : 'Preparation material saved successfully.');
      setForm({
        materialType: 'SAMPLE_QUESTIONS',
        title: '',
        url: '',
        assetId: '',
        description: '',
      });
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(
        err.message || (isRtl ? 'تعذر حفظ مادة التحضير.' : 'Failed to save preparation material.'),
      );
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl ? 'مواد التحضير والاستعداد (Preparation Materials)' : 'Preparation Materials'}
        </h3>
      </div>

      {/* Mandatory Asset System Rule Notice */}
      <div className="bg-blue-50 border border-blue-200 text-blue-900 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
        <Info className="h-5 w-5 flex-shrink-0 text-blue-600" />
        <span>
          {isRtl
            ? 'تنبيه: يجب تسجيل الملفات المحفوظة عبر نظام الأصول، وليس كمسارات ملفات محلية.'
            : 'Note: Persisted files must be registered through the asset system, not local file paths.'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Existing Materials */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">
          {isRtl ? 'المواد المسجلة حالياً' : 'Current Registered Materials'}
        </h4>
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : materials.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl
              ? 'لا توجد مواد تحضير مسجلة حالياً لهذا الاختبار.'
              : 'No preparation materials registered currently.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((m, idx) => (
              <div
                key={m.id || idx}
                className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm"
              >
                <div className="flex justify-between items-start">
                  <h5 className="font-bold text-gray-900">{m.title}</h5>
                  <span className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded font-medium">
                    {mapMaterialType(m.materialType, isRtl)}
                  </span>
                </div>
                {m.url && (
                  <p className="text-xs">
                    <a
                      href={m.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono"
                    >
                      {m.url} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
                {m.assetId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">{isRtl ? 'مرجع الأصل: ' : 'Asset ID: '}</span>
                    <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-xs">
                      {m.assetId}
                    </code>
                  </p>
                )}
                {m.description && (
                  <p className="text-xs text-gray-600 pt-1 border-t border-gray-200">
                    {m.description}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Material Form */}
      <form
        {...editorForm}
        className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm"
      >
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة مادة تحضير جديدة' : 'Add New Preparation Material'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'نوع المادة' : 'Material Type'} *
            </label>
            <select
              value={form.materialType}
              onChange={(e) => setForm({ ...form, materialType: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="SAMPLE_QUESTIONS">
                {isRtl ? 'أسئلة نموذجية (Sample Questions)' : 'Sample Questions'}
              </option>
              <option value="PRACTICE_TEST">
                {isRtl ? 'اختبار تجريبي (Practice Test)' : 'Practice Test'}
              </option>
              <option value="BROCHURE">{isRtl ? 'كتيب معلومات (Brochure)' : 'Brochure'}</option>
              <option value="AUDIO_SAMPLE">
                {isRtl ? 'عينة صوتية (Audio Sample)' : 'Audio Sample'}
              </option>
              <option value="GUIDE">{isRtl ? 'دليل تحضيري (Guide)' : 'Guide'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'عنوان المادة' : 'Title'} *
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isRtl ? 'مثال: دليل التحضير الرسمي 2026' : 'e.g. Official Guide 2026'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'رابط المادة (URL خارجي مسموح)' : 'URL (External link)'}
            </label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'مرجع الأصل في النظام (Asset ID)' : 'Asset ID'}
            </label>
            <input
              type="text"
              value={form.assetId}
              onChange={(e) => setForm({ ...form, assetId: e.target.value })}
              placeholder="e.g. asset_12345"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            {isRtl ? 'الوصف' : 'Description'}
          </label>
          <input
            type="text"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ المادة' : 'Save Material'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// EVIDENCE & SOURCES TAB
// ----------------------------------------------------------------------
function EvidenceTab({
  testId,
  initialEvidence,
  onRefresh,
  isRtl,
}: {
  testId: string;
  initialEvidence?: any;
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [evidence, setEvidence] = useState<any>(initialEvidence || null);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState({
    originalImportedName: '',
    sourceId: '',
    sourceUrl: '',
    contentHash: '',
    retrievedAt: '',
    evidenceSnippet: '',
    sourceTrustLevel: 'AUTHORITATIVE',
  });

  useEffect(() => {
    setEvidence(initialEvidence || null);
  }, [initialEvidence]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    setSaving(true);
    try {
      await adminApiClient.addInternationalTestEvidence(testId, {
        ...form,
        retrievedAt: new Date(form.retrievedAt).toISOString(),
      });
      setSuccess(isRtl ? 'تم إدراج بيانات الدليل بنجاح.' : 'Evidence recorded successfully.');
      setForm({
        originalImportedName: '',
        sourceId: '',
        sourceUrl: '',
        contentHash: '',
        retrievedAt: '',
        evidenceSnippet: '',
        sourceTrustLevel: 'AUTHORITATIVE',
      });
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر إدراج الدليل.' : 'Failed to record evidence.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">
          {isRtl ? 'الأدلة والمصادر (Evidence & Sources)' : 'Evidence & Sources'}
        </h3>
      </div>

      {/* Safety Notice Box */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <span className="font-semibold">
          {isRtl
            ? 'الثقة بالمصدر والأدلة تساعد المراجعة فقط ولا تنشر الاختبار تلقائياً.'
            : 'Source trust and evidence assist review only and never publish the test automatically.'}
        </span>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      {/* Existing Evidence Display */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">
          {isRtl ? 'بيانات الأدلة والمصادر المسجلة' : 'Registered Evidence & Source Data'}
        </h4>
        {loading ? (
          <div className="flex justify-center p-6">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : !evidence ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl
              ? 'لا توجد أدلة مسجلة لهذا الاختبار حالياً.'
              : 'No evidence records currently registered for this test.'}
          </p>
        ) : (
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <dt className="text-gray-500 text-xs font-medium">
                  {isRtl ? 'مستوى الثقة بالمصدر' : 'Source Trust Level'}
                </dt>
                <dd className="font-bold text-gray-900 mt-0.5">
                  {mapSourceTrustLevel(evidence.sourceTrustLevel, isRtl)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">
                  {isRtl ? 'حالة التكرار' : 'Duplicate Status'}
                </dt>
                <dd className="font-bold text-gray-900 mt-0.5">
                  {mapDuplicateStatus(evidence.duplicateStatus, isRtl)}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">
                  {isRtl ? 'الاسم المستورد الأصلي' : 'Original Imported Name'}
                </dt>
                <dd className="font-semibold text-gray-800 mt-0.5">
                  {evidence.originalImportedName || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">
                  {isRtl ? 'الاسم المعياري المنظم' : 'Normalized Canonical Name'}
                </dt>
                <dd className="font-semibold text-gray-800 mt-0.5">
                  {evidence.normalizedCanonicalName || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">
                  {isRtl ? 'المفتاح الحتمي (Deterministic Key)' : 'Deterministic Key'}
                </dt>
                <dd className="font-mono text-xs text-gray-700 mt-0.5">
                  {evidence.deterministicKey || '-'}
                </dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">
                  {isRtl ? 'تاريخ الاسترجاع' : 'Retrieved At'}
                </dt>
                <dd className="font-mono text-xs text-gray-700 mt-0.5">
                  {evidence.retrievedAt ? new Date(evidence.retrievedAt).toLocaleString() : '-'}
                </dd>
              </div>
            </div>

            {evidence.sourceUrl && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-0.5">
                  {isRtl ? 'رابط المصدر' : 'Source URL'}
                </dt>
                <dd>
                  <a
                    href={evidence.sourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-blue-600 hover:underline font-mono text-xs inline-flex items-center gap-1"
                  >
                    {evidence.sourceUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}

            {evidence.evidenceSnippet && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-1">
                  {isRtl ? 'مقتطف الدليل (Snippet)' : 'Evidence Snippet'}
                </dt>
                <dd className="bg-white border border-gray-200 p-3 rounded-lg text-xs font-mono text-gray-800 whitespace-pre-wrap">
                  {evidence.evidenceSnippet}
                </dd>
              </div>
            )}

            {evidence.conflictingFields && evidence.conflictingFields.length > 0 && (
              <div>
                <dt className="text-amber-800 font-bold text-xs mb-1">
                  {isRtl ? 'الحقول المتعارضة:' : 'Conflicting Fields:'}
                </dt>
                <dd className="flex flex-wrap gap-1">
                  {evidence.conflictingFields.map((field: string, idx: number) => (
                    <span
                      key={idx}
                      className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2 py-0.5 rounded font-mono"
                    >
                      {field}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {evidence.mergeSuggestions && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-1">
                  {isRtl ? 'مقترحات الدمج (Merge Suggestions)' : 'Merge Suggestions'}
                </dt>
                <dd className="bg-white border p-3 rounded-lg text-xs font-mono text-gray-700 overflow-x-auto">
                  <pre>{JSON.stringify(evidence.mergeSuggestions, null, 2)}</pre>
                </dd>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Evidence Form */}
      <form
        {...editorForm}
        className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm"
      >
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إدراج دليل جديد' : 'Add New Evidence'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'مستوى الثقة بالمصدر' : 'Source Trust Level'} *
            </label>
            <select
              value={form.sourceTrustLevel}
              onChange={(e) => setForm({ ...form, sourceTrustLevel: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="AUTHORITATIVE">
                {isRtl ? 'رسمي مباشر (Authoritative)' : 'Authoritative'}
              </option>
              <option value="HIGH">{isRtl ? 'ثقة عالية (High)' : 'High'}</option>
              <option value="MEDIUM">{isRtl ? 'ثقة متوسطة (Medium)' : 'Medium'}</option>
              <option value="LOW">{isRtl ? 'ثقة منخفضة (Low)' : 'Low'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'الاسم المستورد الأصلي' : 'Original Imported Name'}
            </label>
            <input
              type="text"
              value={form.originalImportedName}
              onChange={(e) => setForm({ ...form, originalImportedName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'معرف المصدر (Source ID)' : 'Source ID'}
            </label>
            <input
              type="text"
              value={form.sourceId}
              onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">
              {isRtl ? 'رابط المصدر' : 'Source URL'}
            </label>
            <input
              type="url"
              value={form.sourceUrl}
              onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">
            {isRtl ? 'مقتطف الدليل' : 'Evidence Snippet'}
          </label>
          <textarea
            rows={3}
            value={form.evidenceSnippet}
            onChange={(e) => setForm({ ...form, evidenceSnippet: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black text-xs font-mono"
          />
        </div>

        <label className="block text-sm">
          {isRtl ? 'بصمة محتوى المصدر (SHA-256)' : 'Source content hash (SHA-256)'}
          <input
            required
            pattern="[a-fA-F0-9]{64}"
            className="block w-full rounded border p-2"
            value={form.contentHash}
            onChange={(event) => setForm({ ...form, contentHash: event.target.value })}
          />
        </label>
        <label className="block text-sm">
          {isRtl ? 'وقت استرجاع المصدر' : 'Source retrieval time'}
          <input
            required
            type="datetime-local"
            className="block rounded border p-2"
            value={form.retrievedAt}
            onChange={(event) => setForm({ ...form, retrievedAt: event.target.value })}
          />
        </label>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-1.5 bg-black text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ الدليل' : 'Record Evidence'}
        </button>
      </form>
    </div>
  );
}

// ----------------------------------------------------------------------
// READINESS & PUBLISHING TAB
// ----------------------------------------------------------------------
function ReadinessTab({ test, isRtl }: { test: InternationalTestDetail; isRtl: boolean }) {
  const [report, setReport] = useState<{
      ready: boolean;
      blockingIssues?: Array<{ code: string; field?: string; message?: string }>;
    } | null>(null),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    setReport(null);
    adminApiClient
      .getInternationalTestReadiness<NonNullable<typeof report>>(test.id)
      .then((value) => {
        if (active) setReport(value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [test.id, test.updatedAt, refresh]);
  return (
    <section className="space-y-3">
      <h2 className="test-region-title">
        <ShieldCheck size={18} />
        {isRtl ? 'جاهزية النسخة الحالية' : 'Current version readiness'}
      </h2>
      {error ? (
        <div role="alert">
          <p>{error}</p>
          <button type="button" onClick={() => setRefresh((n) => n + 1)}>
            {isRtl ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </div>
      ) : !report ? (
        <p role="status">{isRtl ? 'جارٍ التحقق…' : 'Checking…'}</p>
      ) : (
        <div className="rounded-xl border border-[#DDEFF2] bg-[#FAF7F0] p-4 text-[13px]">
          <p className="font-bold">
            {report.ready
              ? isRtl
                ? 'اجتازت النسخة فحص الجاهزية'
                : 'Version passed readiness checks'
              : isRtl
                ? 'توجد موانع للنشر'
                : 'Publication is blocked'}
          </p>
          <ul className="mt-3 list-inside list-disc space-y-2">
            {report.blockingIssues?.map((issue, index) => (
              <li key={issue.code + index}>
                {issue.message || issue.code}
                {issue.field && <span className="ms-2 text-[11px]">({issue.field})</span>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function DescriptionTab({
  test,
  onRefresh,
  isRtl,
  reviewReason,
}: {
  test: InternationalTestDetail;
  onRefresh: () => void;
  isRtl: boolean;
  reviewReason: string;
}) {
  const [providerReload, setProviderReload] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    providerId: test.providerId || '',
    testCategory: test.testCategory,
    abbreviation: test.abbreviation || '',
  });
  const [providerDraft, setProviderDraft] = useState({
    key: '',
    displayName: '',
    officialWebsite: '',
    countryIso2Code: '',
  });

  useEffect(() => {
    setForm({
      providerId: test.providerId || '',
      testCategory: test.testCategory,
      abbreviation: test.abbreviation || '',
    });
  }, [test.id, test.providerId, test.testCategory, test.abbreviation]);

  const loadProviders = async () => {
    setProviderReload((n) => n + 1);
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      await adminApiClient.updateInternationalTest(test.id, {
        providerId: form.providerId || undefined,
        testCategory: form.testCategory,
        abbreviation: form.abbreviation.trim() || undefined,
      });
      setSuccess(
        isRtl
          ? 'تم حفظ الملف الأساسي وربطه بالمزود المعياري.'
          : 'Core profile and canonical provider saved.',
      );
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ الملف الأساسي.' : 'Failed to save core profile.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(saveProfile);

  const createProvider = async () => {
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const created = await adminApiClient.upsertInternationalTestProvider<any>(
        {
          key: providerDraft.key,
          displayName: providerDraft.displayName,
          ...(providerDraft.officialWebsite.trim()
            ? { officialWebsite: providerDraft.officialWebsite.trim() }
            : {}),
          ...(providerDraft.countryIso2Code.trim()
            ? { countryIso2Code: providerDraft.countryIso2Code.trim().toUpperCase() }
            : {}),
        },
        reviewReason,
      );
      await loadProviders();
      setForm((current) => ({ ...current, providerId: created.id }));
      setProviderDraft({ key: '', displayName: '', officialWebsite: '', countryIso2Code: '' });
      setSuccess(
        isRtl
          ? 'تم إنشاء المزود المعياري. احفظ الملف لربطه بالاختبار.'
          : 'Canonical provider created. Save the profile to link it to this test.',
      );
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر إنشاء المزود.' : 'Failed to create provider.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-3">
        {isRtl ? 'الملف الأساسي والمزود المعياري' : 'Core Profile & Canonical Provider'}
      </h3>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">
          {success}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg text-sm">
        {isRtl
          ? 'الأسماء العربية والإنجليزية للعرض مقروءة هنا فقط؛ تحرير الترجمة يبقى ضمن Translation Infrastructure ولا يتم نسخه داخل شاشة الاختبارات.'
          : 'Localized display names are read-only here; translation authoring remains owned by Translation Infrastructure.'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <DetailField
          label={isRtl ? 'الاسم بالعربية' : 'Localized Name AR'}
          value={test.localizedNameAr || (isRtl ? 'غير متوفر' : 'N/A')}
        />
        <DetailField
          label={isRtl ? 'الاسم بالإنجليزية' : 'Localized Name EN'}
          value={test.localizedNameEn || (isRtl ? 'غير متوفر' : 'N/A')}
        />
      </div>

      <form {...editorForm} className="border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              {isRtl ? 'المزود المعياري' : 'Canonical Provider'}
            </label>
            <CanonicalPicker
              paged
              reloadKey={String(providerReload)}
              label={isRtl ? 'المزود' : 'Provider'}
              value={form.providerId || null}
              load={async (q, page) => {
                const rows = await adminApiClient.request<
                  Array<{ id: string; displayName: string }>
                >(
                  `/admin/international-tests/providers?search=${encodeURIComponent(q ?? '')}&page=${page ?? 1}`,
                );
                return rows.map((row) => ({
                  id: row.id,
                  label: row.displayName,
                  lifecycle: 'ACTIVE',
                }));
              }}
              onChange={(id) => setForm((current) => ({ ...current, providerId: id ?? '' }))}
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              {isRtl ? 'فئة الاختبار' : 'Test Category'}
            </label>
            <select
              value={form.testCategory}
              onChange={(e) =>
                setForm({ ...form, testCategory: e.target.value as InternationalTestCategory })
              }
              className="w-full border rounded-lg px-3 py-2"
            >
              {TEST_CATEGORY_OPTIONS.map((category) => (
                <option key={category} value={category}>
                  {getCategoryLabel(category)}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">
              {isRtl ? 'الاختصار' : 'Abbreviation'}
            </label>
            <input
              value={form.abbreviation}
              onChange={(e) => setForm({ ...form, abbreviation: e.target.value })}
              className="w-full border rounded-lg px-3 py-2"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {isRtl ? 'حفظ الملف الأساسي' : 'Save Core Profile'}
        </button>
      </form>

      <div className="border rounded-xl p-5 space-y-4">
        <h4 className="font-bold text-sm">
          {isRtl ? 'إضافة مزود معياري جديد' : 'Create Canonical Provider'}
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <input
            placeholder={isRtl ? 'المفتاح، مثال ETS' : 'Key, e.g. ETS'}
            value={providerDraft.key}
            onChange={(e) => setProviderDraft({ ...providerDraft, key: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder={isRtl ? 'اسم المزود' : 'Provider name'}
            value={providerDraft.displayName}
            onChange={(e) => setProviderDraft({ ...providerDraft, displayName: e.target.value })}
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="https://..."
            value={providerDraft.officialWebsite}
            onChange={(e) =>
              setProviderDraft({ ...providerDraft, officialWebsite: e.target.value })
            }
            className="border rounded-lg px-3 py-2"
          />
          <input
            placeholder="US"
            maxLength={2}
            value={providerDraft.countryIso2Code}
            onChange={(e) =>
              setProviderDraft({ ...providerDraft, countryIso2Code: e.target.value })
            }
            className="border rounded-lg px-3 py-2 uppercase"
          />
        </div>
        <button
          type="button"
          onClick={createProvider}
          disabled={saving || !providerDraft.key.trim() || !providerDraft.displayName.trim()}
          className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50"
        >
          <Plus className="h-4 w-4" />
          {isRtl ? 'إنشاء المزود' : 'Create Provider'}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// REQUIREMENTS TAB
// ----------------------------------------------------------------------
function RequirementsTab({
  test,
  onRefresh,
  isRtl,
}: {
  test: InternationalTestDetail;
  onRefresh: () => Promise<void>;
  isRtl: boolean;
}) {
  const keys = [
    'registrationRequirements',
    'identificationRequirements',
    'retakePolicy',
    'cancellationReschedulingNotes',
    'accessibilityNotes',
  ] as const;
  const labels = [
    'متطلبات التسجيل',
    'متطلبات الهوية',
    'سياسة إعادة الاختبار',
    'الإلغاء وتغيير الموعد',
    'التسهيلات',
  ];
  const initial = () =>
    Object.fromEntries(keys.map((key) => [key, test[key] || ''])) as Record<
      (typeof keys)[number],
      string
    >;
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await adminApiClient.updateInternationalTest(test.id, form);
      await onRefresh();
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر الحفظ');
      return false;
    } finally {
      setSaving(false);
    }
  };
  const editorForm = useTestEditorForm(submit);
  return (
    <form {...editorForm} className="space-y-4">
      <h3 className="font-bold text-[#142B5F]">
        {isRtl ? 'المتطلبات والسياسات' : 'Requirements & policies'}
      </h3>
      {error && (
        <p role="alert" className="text-red-700">
          {error}
        </p>
      )}
      {keys.map((key, index) => (
        <label key={key} className="block text-xs font-bold text-[#142B5F]">
          {isRtl ? labels[index] : key}
          <textarea
            value={form[key]}
            onChange={(event) => setForm({ ...form, [key]: event.target.value })}
            rows={3}
            className="block mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal"
          />
        </label>
      ))}
      <button
        type="submit"
        disabled={saving}
        className="rounded-xl bg-[#0E7C86] px-4 py-2 text-white text-xs font-bold"
      >
        {saving ? 'جارٍ الحفظ...' : 'حفظ السياسات'}
      </button>
    </form>
  );
}

// ----------------------------------------------------------------------
// CROSS PHASE TAB
// ----------------------------------------------------------------------
function CrossPhaseTab({ testId, isRtl }: { testId: string; isRtl: boolean }) {
  type Item = {
    ownerId?: string;
    displayName?: string;
    providerName?: string;
    matchingPrograms?: Array<{ ownerId?: string; sourceProgramName?: string }>;
  };
  type Collection = { state?: string; total?: number | null; data?: Item[] };
  const [graph, setGraph] = useState<{
      readScope?: { collections?: Record<string, { state?: string }> };
      relationships?: {
        universities?: Collection;
        scholarships?: Collection;
        preparationCourses?: Collection;
        editorialContent?: Array<{ contentId: string; title: string }>;
        studentTools?: Collection;
        services?: Collection;
      };
    } | null>(null),
    [error, setError] = useState(''),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setError('');
    setGraph(null);
    adminApiClient
      .getInternationalTestRelationships<NonNullable<typeof graph>>(testId, isRtl ? 'ar' : 'en')
      .then((value) => {
        if (active) setGraph(value);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [testId, isRtl, refresh]);
  if (error)
    return (
      <div role="alert">
        <p>{error}</p>
        <button type="button" onClick={() => setRefresh((n) => n + 1)}>
          {isRtl ? 'إعادة المحاولة' : 'Retry'}
        </button>
      </div>
    );
  if (!graph)
    return <p role="status">{isRtl ? 'جارٍ تحميل العلاقات…' : 'Loading relationships…'}</p>;
  const relationships = graph.relationships;
  return (
    <section className="space-y-4">
      <h2 className="test-region-title">
        <Network size={18} />
        {isRtl
          ? 'العلاقات بالبرامج والمنح والدورات'
          : 'Program, scholarship and course relationships'}
      </h2>
      <p className="text-[12px] text-slate-500">
        {isRtl
          ? 'العلاقة تخص السجل والنسخة المثبتة، ولا تعني اعترافًا عامًا بكل نوع أو دولة.'
          : 'A relationship applies to its documented record and version, not universal recognition across variants or countries.'}
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        {(
          [
            {
              key: 'universities',
              ar: 'الجامعات وبرامجها',
              en: 'Universities and programs',
              path: '/universities/',
            },
            {
              key: 'scholarships',
              ar: 'المنح المرتبطة',
              en: 'Related scholarships',
              path: '/scholarships/',
            },
            {
              key: 'preparationCourses',
              ar: 'الدورات التحضيرية',
              en: 'Preparation courses',
              path: '/courses/',
            },
          ] as const
        ).map((group) => {
          const collection = relationships?.[group.key];
          const unavailable =
            ['UNAVAILABLE', 'NOT_INTEGRATED'].includes(
              graph.readScope?.collections?.[group.key]?.state ?? '',
            ) || collection?.state === 'UNAVAILABLE';
          return (
            <article className="rounded-xl border border-[#DDEFF2] p-4 text-[13px]" key={group.key}>
              <h3 className="font-bold">
                {isRtl ? group.ar : group.en}{' '}
                <span className="ms-2 text-[#0E7C86]">
                  {unavailable ? '—' : (collection?.total ?? '—')}
                </span>
              </h3>
              {!collection || unavailable ? (
                <p className="mt-3">{isRtl ? 'تعذر التحقق من المصدر.' : 'Source unavailable.'}</p>
              ) : collection.data?.length ? (
                <ul className="mt-3 space-y-3">
                  {collection.data.map((row, index) => (
                    <li key={row.ownerId ?? index}>
                      {row.ownerId ? (
                        <Link
                          className="inline-flex items-center gap-2 font-bold text-[#0E7C86]"
                          to={group.path + encodeURIComponent(row.ownerId)}
                        >
                          <ExternalLink size={14} />
                          {row.displayName || row.ownerId}
                        </Link>
                      ) : (
                        row.displayName || '—'
                      )}
                      {row.providerName && <p className="text-[12px]">{row.providerName}</p>}
                      {row.matchingPrograms?.map((program, index) => (
                        <p className="text-[12px]" key={program.ownerId ?? index}>
                          {program.sourceProgramName ||
                            (isRtl && 'برنامج مرتبط') ||
                            'Linked program'}
                        </p>
                      ))}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-3">
                  {isRtl
                    ? 'لا توجد علاقات مثبتة في المصدر الحالي.'
                    : 'No documented relationships in this source.'}
                </p>
              )}
            </article>
          );
        })}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        {(['studentTools', 'services'] as const).map((key) => (
          <article className="rounded-xl border border-[#DDEFF2] p-4 text-[13px]" key={key}>
            <h3 className="font-bold">
              {key === 'studentTools'
                ? isRtl
                  ? 'الأدوات الطلابية'
                  : 'Student tools'
                : isRtl
                  ? 'الخدمات'
                  : 'Services'}
            </h3>
            <p>
              {relationships?.[key]?.state === 'UNAVAILABLE' || !relationships?.[key]
                ? isRtl
                  ? 'المصدر غير متاح'
                  : 'Source unavailable'
                : relationships[key]?.data?.map((row) => row.displayName).join('، ') ||
                  (isRtl ? 'لا توجد روابط حالية' : 'No current links')}
            </p>
          </article>
        ))}
      </div>
      {relationships?.editorialContent && (
        <section className="rounded-xl border border-[#DDEFF2] p-4 text-[13px]">
          <h3 className="font-bold">{isRtl ? 'المحتوى المرتبط' : 'Related content'}</h3>
          {relationships.editorialContent.map((row) => (
            <p key={row.contentId}>{row.title}</p>
          ))}
        </section>
      )}
    </section>
  );
}
