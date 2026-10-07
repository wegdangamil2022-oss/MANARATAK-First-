import type { InternationalTestDto } from '@manaratak/domain';
import {
AlertCircle,
Archive,
ArrowLeft,
ArrowRight,
BookOpen,
CheckCircle2,
ChevronDown,
Clock,
ExternalLink,
Eye,
History,
Info,
Loader2,
Network,
Plus,
RotateCcw,
Save,
Send,
ShieldCheck,
X
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ExamDetails, mapInternationalTestToExam } from '@manaratak/ui';
import { TestEditorSaveContext, useTestEditorForm, type TestEditorEntry } from '../components/TestEditorSaveRegistry';
import { Link,useParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { InternationalTestSourceSectionsViewer } from '../components/InternationalTestSourceSectionsViewer';
import { ReviewedGraphEditor } from '../components/ReviewedGraphEditor';
import { SavedTestCanonicalRelationships } from '../components/SavedTestCanonicalRelationships';
import { useTranslation } from '../i18n/I18nProvider';

type InternationalTestStatus = 'IMPORTED' | 'READY_TO_REVIEW' | 'NEEDS_REVIEW' | 'INCOMPLETE' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
type InternationalTestCompletenessStatus = 'INCOMPLETE' | 'COMPLETE' | 'NEEDS_REVIEW';
type InternationalTestCategory = 'ENGLISH_LANGUAGE' | 'NON_ENGLISH_LANGUAGE' | 'GENERAL_UNDERGRADUATE_ADMISSION' | 'GRADUATE_ADMISSION' | 'NATIONAL_INTERNATIONAL_ADMISSION' | 'SPECIALIZED_ADMISSION' | 'PROFESSIONAL_LICENSING_CERTIFICATION' | 'LANGUAGE_PROFICIENCY' | 'UNDERGRAD_ADMISSION' | 'GRAD_ADMISSION' | 'PROFESSIONAL_LICENSING' | 'ACADEMIC_PLACEMENT' | 'OTHER';

const TEST_CATEGORY_OPTIONS: InternationalTestCategory[] = ['ENGLISH_LANGUAGE','NON_ENGLISH_LANGUAGE','GENERAL_UNDERGRADUATE_ADMISSION','GRADUATE_ADMISSION','NATIONAL_INTERNATIONAL_ADMISSION','SPECIALIZED_ADMISSION','PROFESSIONAL_LICENSING_CERTIFICATION','LANGUAGE_PROFICIENCY','UNDERGRAD_ADMISSION','GRAD_ADMISSION','PROFESSIONAL_LICENSING','ACADEMIC_PLACEMENT','OTHER'];

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

interface InternationalTestDetail extends Pick<InternationalTestDto, 'countryRelationships' | 'languageRelationships' | 'academicTaxonomyRelationships' | 'degreeRelationships'> {
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

type TabType =
  | 'details'
  | 'relationships'
  | 'readiness'
  | 'sources_history';

function formatDetailDateTime(dateStr?: string | null, isRtl = true): string {
  if (!dateStr) return isRtl ? 'الآن' : 'Just now';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString(isRtl ? 'ar-SA' : 'en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return dateStr;
  }
}

function testEditorGroup(title: string): string | undefined {
  const text = title.toLowerCase();
  if (/معلومات.*أساسية|معلومات.*الأساسية|نبذة|overview|basic information/.test(text)) return 'overview';
  if (/عائلة|نسخ|variant/.test(text)) return 'variants';
  if (/طرق التقديم|طريقة التقديم|التوفر|مراكز|availability/.test(text)) return 'availability';
  if (/بنية|أقسام|الأقسام|مهارات|skills|structure/.test(text)) return 'sections';
  if (/نظام الدرجات|تفسير الدرجات|cefr|score scale|scoring/.test(text)) return 'scoring';
  if (/تسجيل|أهلية|الهوية|إعادة الاختبار|تسهيلات|registration|retake/.test(text)) return 'requirements';
  if (/رسوم|مالية|fees/.test(text)) return 'fees';
  if (/تحضير|preparation/.test(text)) return 'preparation';
  if (/روابط|وسائط|المصادر|links|sources/.test(text)) return 'links';
  return undefined;
}

export function InternationalTestDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { language } = useTranslation();
  const [test, setTest] = useState<InternationalTestDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('details');

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [showArchiveModal, setShowArchiveModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const isRtl = language === 'ar';
  const editors = useRef(new Map<string, TestEditorEntry>());
  const saveRegistry = useMemo(() => ({
    entries: editors.current,
    changed: () => setHasUnsavedChanges([...editors.current.values()].some(entry => entry.dirty)),
  }), []);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (hasUnsavedChanges) { event.preventDefault(); event.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [hasUnsavedChanges]);

  const savingBatch = useRef(false);
  const detailRequest = useRef(0);
  const fetchDetail = async (force = false) => {
    if (savingBatch.current && !force) return;
    if (!id) return;
    const requestId = ++detailRequest.current;
    if (!test) setLoading(true);
    setError(null);
    try {
      const data = await adminApiClient.getInternationalTest<InternationalTestDetail>(id);
      if (requestId !== detailRequest.current) return;
      setTest(data);
      if (data?.updatedAt) {
        setLastSavedAt(data.updatedAt);
      }
    } catch (err: any) {
      if (requestId !== detailRequest.current) return;
      setError(err.message || (isRtl ? 'تعذر تحميل تفاصيل الاختبار الدولي' : 'Failed to load international test details.'));
    } finally {
      if (requestId === detailRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    void fetchDetail();
  }, [id]);

  const tabs: { id: TabType; labelAr: string; labelEn: string; icon: any }[] = [
    { id: 'details', labelAr: 'تفاصيل الاختبار', labelEn: 'Test Details', icon: BookOpen },
    { id: 'relationships', labelAr: 'الربط والعلاقات', labelEn: 'Links & Relationships', icon: Network },
    { id: 'readiness', labelAr: 'الجاهزية والنشر', labelEn: 'Readiness & Publishing', icon: ShieldCheck },
    { id: 'sources_history', labelAr: 'المصادر وسجل التعديلات', labelEn: 'Sources & History', icon: History }
  ];

  const handlePublish = async () => {
    if (!test || test.status === 'PUBLISHED') return;
    if (hasUnsavedChanges && !(await handleSaveChanges())) return;
    if (!window.confirm(isRtl ? 'هل تريد نشر الاختبار المحفوظ في الصفحة العامة؟' : 'Publish the saved test on the public site?')) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    try {
      await adminApiClient.publishInternationalTest(test.id);
      setActionMessage(
        isRtl
          ? 'تم نشر الاختبار بنجاح!'
          : 'Test published successfully!'
      );
      setLastSavedAt(new Date().toISOString());
      setHasUnsavedChanges(false);
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message || (isRtl ? 'تعذر نشر الاختبار. يرجى مراجعة معوقات النشر في تبويب الجاهزية.' : 'Unable to publish test. Please check readiness blockers.'));
      setActiveTab('readiness');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnpublish = async () => {
    if (!test) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    setShowMoreMenu(false);
    try {
      await adminApiClient.unpublishInternationalTest(test.id);
      setActionMessage(isRtl ? 'تم إلغاء النشر وإعادة الاختبار إلى جاهز للنشر.' : 'Test unpublished successfully.');
      setLastSavedAt(new Date().toISOString());
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message || (isRtl ? 'تعذر إلغاء نشر الاختبار.' : 'Unable to unpublish test.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleArchive = async () => {
    if (!test) return;
    setActionLoading(true);
    setActionMessage(null);
    setActionError(null);
    setShowArchiveModal(false);
    setShowMoreMenu(false);
    try {
      await adminApiClient.archiveInternationalTest(test.id);
      setActionMessage(isRtl ? 'تمت أرشفة السجل بنجاح مع الحفاظ على كافة البيانات والأدلة دون حذف.' : 'Test archived successfully. Record preserved without deletion.');
      setLastSavedAt(new Date().toISOString());
      await fetchDetail();
    } catch (err: any) {
      setActionError(err.message || (isRtl ? 'تعذر أرشفة الاختبار.' : 'Unable to archive test.'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleSaveChanges = async (): Promise<boolean> => {
    const pending = [...editors.current.values()].filter(entry => entry.dirty);
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
          setActionError(isRtl ? 'تعذر حفظ أحد النماذج. راجع الحقول ورسالة الخطأ؛ لم يتم النشر.' : 'A form could not be saved. Check its validation errors; nothing was published.');
          return false;
        }
      }
      if ([...editors.current.values()].some(entry => entry.dirty)) {
        setActionError(isRtl ? 'تغيّرت بعض الحقول أثناء الحفظ. احفظها مرة أخرى قبل النشر.' : 'Some fields changed during saving. Save again before publishing.');
        return false;
      }
      await fetchDetail(true);
      setActionMessage(isRtl ? 'تم حفظ التعديلات وإعادة تحميل البيانات المحفوظة.' : 'Changes saved and reloaded.');
      return true;
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'Save failed');
      return false;
    } finally { savingBatch.current = false; setActionLoading(false); }
  };

  const switchTab = (tab: TabType) => { setActiveTab(tab); };

  const renderEmbeddedForm = (_sectionNum: number, sectionTitle: string, _blockKey: string) => {
    if (!test) return null;
    const group = testEditorGroup(sectionTitle);

    // Section 1/2: Overview / Description
    if (group === 'overview') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'تحرير بيانات الوصف والاستخدامات الأساسية' : 'Edit Basic Description & Uses'}
            </span>
          </div>
          <DescriptionTab test={test} onRefresh={fetchDetail} isRtl={isRtl} />
        </div>
      );
    }

    // Section 4: Variants & Delivery Modes
    if (group === 'variants') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'النسخ الرسمية وطرق التقديم القابلة للتحرير' : 'Editable Official Variants & Delivery Modes'}
            </span>
          </div>
          <VariantsTab testId={test.id} initialVariants={test.variants || []} onRefresh={fetchDetail} isRtl={isRtl} />
        </div>
      );
    }

    // Section 5: Delivery & Availability & Centers
    if (group === 'availability') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'الدول ومراكز الاختبار ونوافذ التقديم القابلة للتحرير' : 'Editable Countries, Centers & Testing Windows'}
            </span>
          </div>
          <AvailabilityTab testId={test.id} initialAvailability={test.availability} onRefresh={fetchDetail} isRtl={isRtl} />
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
              {isRtl ? '(ميّز بينها وبين الأقسام التحريرية للملف أعلاه)' : '(Distinguished from editorial file sections above)'}
            </span>
          </div>
          <SectionsTab testId={test.id} initialSections={test.sections || []} onRefresh={fetchDetail} isRtl={isRtl} />
        </div>
      );
    }

    // Section 8 or 9 or 10: Scoring Scales & Equivalencies
    if (group === 'scoring') {
      return (
        <div className="mt-4 pt-4 border-t border-slate-200">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-bold text-[#142B5F]">
              {isRtl ? 'نظام الدرجات والسلالم والمعادلات القابل للتحرير' : 'Editable Score Scales & Equivalencies'}
            </span>
          </div>
          <ScoringTab testId={test.id} initialScoreScale={test.scoreScale} onRefresh={fetchDetail} isRtl={isRtl} />
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
          <FeesTab testId={test.id} initialFees={test.fees || []} onRefresh={fetchDetail} isRtl={isRtl} />
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
          <PreparationMaterialsTab testId={test.id} initialMaterials={test.preparationMaterials || []} onRefresh={fetchDetail} isRtl={isRtl} />
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
          <OfficialLinksTab testId={test.id} initialLinks={test.officialLinks || []} onRefresh={fetchDetail} isRtl={isRtl} />
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
          to="/international-tests"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-[#142B5F] font-medium"
        >
          {isRtl ? <ArrowRight className="h-4 w-4" /> : <ArrowLeft className="h-4 w-4" />}
          {isRtl ? 'العودة إلى الاختبارات الدولية' : 'Back to International Tests'}
        </Link>
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error || (isRtl ? 'لم يتم العثور على الاختبار المطلوب' : 'International test not found.')}</span>
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
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Top Breadcrumb */}
      <div>
        <Link
          to="/international-tests"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-[#142B5F] transition"
        >
          {isRtl ? <ArrowRight className="h-3.5 w-3.5" /> : <ArrowLeft className="h-3.5 w-3.5" />}
          <span>{isRtl ? 'العودة إلى قائمة الاختبارات الدولية' : 'Back to International Tests'}</span>
        </Link>
      </div>

      {/* Alerts */}
      {actionMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-bold flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionMessage}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-emerald-600 hover:text-emerald-900 cursor-pointer">
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
          <button onClick={() => setActionError(null)} className="text-rose-600 hover:text-rose-900 cursor-pointer">
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
              <span>{getCategoryLabel(test.testCategory, isRtl)} · {test.providerName}</span>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight drop-shadow-xs">
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
                  <span className="text-xs font-bold text-white/70">
                    ({secondaryTitle})
                  </span>
              )}
            </div>

            {/* Badges Row: Status, Completeness, Visibility */}
            <div className="flex flex-wrap items-center gap-2.5 text-xs">
              <StatusBadge status={test.status} isHeader={true} />
              {test.completenessStatus && <CompletenessBadge status={test.completenessStatus} isHeader={true} />}
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
            {/* Save Button */}
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

            {/* Publish / Publish Update Button */}
            <button
              type="button"
              disabled={actionLoading || test.status === 'PUBLISHED'}
              onClick={handlePublish}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-black transition shadow-md cursor-pointer disabled:opacity-50"
              title={isRtl ? 'نشر الاختبار' : 'Publish Test'}
            >
              {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              <span>
                {test.status === 'PUBLISHED'
                  ? (isRtl ? 'منشور' : 'Published')
                  : (isRtl ? 'نشر الاختبار' : 'Publish Test')}
              </span>
            </button>

            {test.status === 'PUBLISHED' && test.slug && (
              <a href={`${(import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '')}/international-tests/${encodeURIComponent(test.slug)}`}
                target="_blank" rel="noopener noreferrer" className="rounded-xl border border-white/25 px-3 py-2.5 text-xs font-bold text-white">
                {isRtl ? 'فتح الصفحة المنشورة' : 'Open published page'}
              </a>
            )}

            {/* More Menu (Dropdown) */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowMoreMenu(!showMoreMenu)}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white border border-white/25 text-xs font-bold backdrop-blur-sm transition shadow-xs cursor-pointer"
                title={isRtl ? 'المزيد من الإجراءات' : 'More actions'}
              >
                <span>{isRtl ? 'المزيد' : 'More'}</span>
                <ChevronDown className="w-3.5 h-3.5 text-white/70" />
              </button>

              {showMoreMenu && (
                <div className="absolute right-0 rtl:right-0 ltr:left-0 top-full mt-2 w-48 rounded-2xl bg-white border border-slate-200 shadow-xl py-2 z-30 space-y-1">
                  {test.status === 'PUBLISHED' && (
                    <button
                      type="button"
                      disabled={actionLoading}
                      onClick={handleUnpublish}
                      className="w-full text-right rtl:text-right ltr:text-left px-4 py-2 text-xs font-bold text-amber-800 hover:bg-amber-50 flex items-center gap-2 transition cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-amber-600" />
                      <span>{isRtl ? 'إلغاء النشر' : 'Unpublish Test'}</span>
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => { setShowMoreMenu(false); setShowArchiveModal(true); }}
                    className="w-full text-right rtl:text-right ltr:text-left px-4 py-2 text-xs font-bold text-rose-700 hover:bg-rose-50 flex items-center gap-2 transition cursor-pointer"
                  >
                    <Archive className="w-3.5 h-3.5 text-rose-600" />
                    <span>{isRtl ? 'أرشفة الاختبار' : 'Archive Test'}</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Four Primary Tabs Navigation */}
      <div className="border-b border-slate-200 overflow-x-auto">
        <nav className="flex space-x-2 sm:space-x-4 rtl:space-x-reverse min-w-max pb-1">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => switchTab(tab.id)}
                className={`flex items-center gap-2 py-3 px-4 text-xs font-black rounded-xl transition-all cursor-pointer ${
                  isActive
                    ? 'bg-[#142B5F] text-white shadow-xs'
                    : 'text-slate-600 hover:text-[#142B5F] hover:bg-slate-100'
                }`}
              >
                <TabIcon className={`w-4 h-4 ${isActive ? 'text-[#21A7B4]' : 'text-slate-400'}`} />
                <span>{isRtl ? tab.labelAr : tab.labelEn}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content Panels */}
      <div className="bg-white border border-[#DDEFF2] rounded-3xl p-6 sm:p-8 shadow-sm">
        {/* TAB 1: تفاصيل الاختبار (Source Sections + In-Context Structured Forms) */}
        {(
          <div hidden={activeTab !== 'details'}>
          <div className="space-y-6">
            <InternationalTestSourceSectionsViewer
              testId={test.id}
              isRtl={isRtl}
              onNamesReviewed={fetchDetail}
              renderEmbeddedForm={renderEmbeddedForm}
              editorGroup={testEditorGroup}
              fallbackEditors={<div className="space-y-5">
                {['معلومات الاختبار الأساسية', 'عائلة الاختبار والنسخ', 'طرق التقديم والتوفر', 'بنية الاختبار والأقسام', 'نظام الدرجات', 'التسجيل والأهلية والهوية', 'الرسوم', 'التحضير', 'المصادر والروابط'].map(title => (
                  <section key={title} className="rounded-xl border border-slate-200 p-4">
                    <h3 className="font-bold text-[#142B5F]">{title}</h3>
                    {renderEmbeddedForm(0, title, title)}
                  </section>
                ))}
              </div>}
              canChangeVersion={() => {
                if (!hasUnsavedChanges) return true;
                setActionError(isRtl ? 'احفظ التعديلات قبل تغيير نسخة المصدر.' : 'Save changes before switching source versions.');
                return false;
              }}
            />
          </div>
          </div>
        )}

        {/* TAB 2: الربط والعلاقات (Canonical Graph + Cross Phase Links) */}
        {activeTab === 'relationships' && (
          <div className="space-y-8">
            <div className="bg-[#FAF7F0] border border-[#DDEFF2] rounded-2xl p-5">
              <h3 className="text-base font-black text-[#142B5F] mb-1">
                {isRtl ? 'العلاقات المعيارية المعتمدة' : 'Canonical Domain Relationships'}
              </h3>
              <p className="text-xs text-slate-500">
                {isRtl ? 'ربط الاختبار بالدول، اللغات، العقد التصنيفية والدرجات العلمية الرسمية' : 'Link test to countries, languages, taxonomy nodes and degree levels using verified IDs'}
              </p>
            </div>
            <ReviewedGraphEditor
              key={test.id}
              ownerId={test.id}
              ownerStatus={test.status}
              domain="TEST"
              isRtl={isRtl}
              onSaved={() => { setLastSavedAt(new Date().toISOString()); fetchDetail(); }}
            />
            <SavedTestCanonicalRelationships test={test} isRtl={isRtl} />
            <div className="border-t border-slate-200 pt-6">
              <h3 className="text-base font-black text-[#142B5F] mb-3">
                {isRtl ? 'الربط الأكاديمي بالمراحل والبرامج والمنح' : 'Cross-Phase Academic Relationships'}
              </h3>
              <CrossPhaseTab testId={test.id} isRtl={isRtl} />
            </div>
          </div>
        )}

        {/* TAB 3: الجاهزية والنشر (Readiness Report & Blockers) */}
        {activeTab === 'readiness' && (
          <ReadinessTab
            test={test}
            onRefresh={fetchDetail}
            onPublish={handlePublish}
            isRtl={isRtl}
          />
        )}

        {/* TAB 4: المصادر وسجل التعديلات (Audit, Evidence, Raw Source & Versions) */}
        {(
          <div hidden={activeTab !== 'sources_history'}>
          <EvidenceTab
            testId={test.id}
            initialEvidence={test.importEvidence}
            onRefresh={fetchDetail}
            isRtl={isRtl}
          />
          </div>
        )}
      </div>

      {showPreviewModal && (
        <div className="fixed inset-0 z-50 bg-black/60 p-3 sm:p-6" role="dialog" aria-modal="true" aria-label="معاينة الاختبار العامة">
          <div className="mx-auto max-w-3xl max-h-full overflow-y-auto rounded-2xl shadow-2xl">
            <div className="bg-[#0E7C86] px-4 py-3 text-white text-xs font-bold">
              معاينة البيانات المحفوظة بنفس تصميم الصفحة العامة؛ لا تعني نشر المسودة.
              {hasUnsavedChanges && <span className="block mt-1">احفظ التعديلات أولاً لتظهر في المعاينة.</span>}
            </div>
            <ExamDetails exam={mapInternationalTestToExam(test)} onClose={() => setShowPreviewModal(false)} />
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      {showArchiveModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center gap-3 text-amber-600">
              <Archive className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-black text-[#142B5F]">
                {isRtl ? 'تأكيد أرشفة الاختبار الدولي' : 'Confirm Archive Test'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isRtl
                ? `هل أنت متأكد من أرشفة «${primaryTitle}»؟ سيتم حفظ السجل وجميع أقسامه وأدلته وعلاقاته بالكامل دون حذف، ولن يظهر في القوائم النشطة للعامة.`
                : `Are you sure you want to archive "${primaryTitle}"? The record and all its data and evidence will be preserved without deletion.`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-3">
              <button
                type="button"
                onClick={() => setShowArchiveModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 font-bold text-slate-600 hover:bg-slate-50 text-xs transition cursor-pointer"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={actionLoading}
                onClick={handleArchive}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition shadow-xs disabled:opacity-50"
              >
                {actionLoading ? (isRtl ? 'جارٍ الأرشفة...' : 'Archiving...') : (isRtl ? 'تأكيد الأرشفة' : 'Confirm Archive')}
              </button>
            </div>
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
  isRtl
}: {
  testId: string;
  initialVariants: Variant[];
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [variants, setVariants] = useState<Variant[]>(initialVariants);
  useEffect(() => { setVariants(initialVariants); }, [initialVariants]);
  const [loading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [form, setForm] = useState<Variant>({
    variantName: '',
    deliveryMode: 'ONLINE',
    isActive: true,
    specificOfficialUrl: '',
    administrativeNotes: ''
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
        administrativeNotes: ''
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
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'النسخ والأنواع (Variants & Delivery Modes)' : 'Variants & Types'}</h3>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Existing Variants List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">{isRtl ? 'النسخ المسجلة حالياً' : 'Current Registered Variants'}</h4>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : variants.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد نسخ مسجلة حالياً لهذا الاختبار.' : 'No variants registered currently.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {variants.map((v, i) => (
              <div key={v.id || i} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm">
                <div className="flex justify-between items-start">
                  <h5 className="font-bold text-gray-900">{v.variantName}</h5>
                  <span className={`px-2 py-0.5 rounded text-xs font-semibold ${v.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                    {v.isActive ? (isRtl ? 'نشط' : 'Active') : (isRtl ? 'غير نشط' : 'Inactive')}
                  </span>
                </div>
                <p className="text-xs text-gray-600">
                  <span className="font-medium">{isRtl ? 'نمط التقديم: ' : 'Delivery Mode: '}</span>
                  {mapDeliveryMode(v.deliveryMode, isRtl)}
                </p>
                {v.specificOfficialUrl && (
                  <p className="text-xs">
                    <a href={v.specificOfficialUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">
                      {v.specificOfficialUrl} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
                {v.administrativeNotes && (
                  <p className="text-xs text-gray-500 bg-white p-2 rounded border">{v.administrativeNotes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Variant Form */}
      <form {...editorForm} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة أو تحديث نسخة' : 'Add or Update Variant'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'اسم النسخة' : 'Variant Name'} *</label>
            <input
              type="text"
              value={form.variantName}
              onChange={(e) => setForm({ ...form, variantName: e.target.value })}
              placeholder={isRtl ? 'مثال: Academic, General Training' : 'e.g. Academic, General Training'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'نمط التقديم' : 'Delivery Mode'} *</label>
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
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'رابط أصل مخصص (اختياري)' : 'Specific Official URL'}</label>
            <input
              type="url"
              value={form.specificOfficialUrl || ''}
              onChange={(e) => setForm({ ...form, specificOfficialUrl: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'ملاحظات إدارية' : 'Administrative Notes'}</label>
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
  isRtl
}: {
  testId: string;
  initialSections: Section[];
  onRefresh: () => void;
  isRtl: boolean;
}) {
  const [sections, setSections] = useState<Section[]>(initialSections);
  useEffect(() => { setSections(initialSections); }, [initialSections]);
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
    scoreMaximum: 30
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
      setError(isRtl ? 'الحد الأدنى للدرجات يجب أن يكون أقل من أو يساوي الحد الأقصى.' : 'Minimum score must be less than or equal to maximum score.');
      return;
    }

    const payload = {
      ...form,
      questionTypes: questionTypesInput.split(',').map((s) => s.trim()).filter(Boolean)
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
        scoreMaximum: 30
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
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'أقسام الاختبار (Test Sections)' : 'Test Sections'}</h3>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Sections List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">{isRtl ? 'الأقسام المضافة حالياً' : 'Current Added Sections'}</h4>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
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
                    <td className="px-4 py-3">{sec.durationMinutes ? `${sec.durationMinutes} ${isRtl ? 'دقيقة' : 'min'}` : '-'}</td>
                    <td className="px-4 py-3 font-mono">{sec.scoreMinimum ?? 0} - {sec.scoreMaximum ?? 0}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{(sec.questionTypes || []).join(', ') || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Section Form */}
      <form {...editorForm} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة قسم جديد' : 'Add New Section'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'اسم القسم' : 'Section Name'} *</label>
            <input
              type="text"
              value={form.sectionName}
              onChange={(e) => setForm({ ...form, sectionName: e.target.value })}
              placeholder={isRtl ? 'مثال: القراءة، القراءة والاستماع' : 'e.g. Reading'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'نوع القسم' : 'Section Type'}</label>
            <select
              value={form.sectionType}
              onChange={(e) => setForm({ ...form, sectionType: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="READING">{isRtl ? 'القراءة (Reading)' : 'Reading'}</option>
              <option value="WRITING">{isRtl ? 'الكتابة (Writing)' : 'Writing'}</option>
              <option value="LISTENING">{isRtl ? 'الاستماع (Listening)' : 'Listening'}</option>
              <option value="SPEAKING">{isRtl ? 'المحادثة (Speaking)' : 'Speaking'}</option>
              <option value="MATHEMATICS">{isRtl ? 'الرياضيات (Mathematics)' : 'Mathematics'}</option>
              <option value="INTEGRATED">{isRtl ? 'متكامل (Integrated)' : 'Integrated'}</option>
              <option value="OTHER">{isRtl ? 'آخر' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الترتيب' : 'Order'}</label>
            <input
              type="number"
              value={form.order}
              onChange={(e) => setForm({ ...form, order: parseInt(e.target.value, 10) || 1 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'المدة (بالدقائق)' : 'Duration (Minutes)'}</label>
            <input
              type="number"
              value={form.durationMinutes || ''}
              onChange={(e) => setForm({ ...form, durationMinutes: parseInt(e.target.value, 10) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الحد الأدنى للدرجة' : 'Score Minimum'}</label>
            <input
              type="number"
              value={form.scoreMinimum ?? 0}
              onChange={(e) => setForm({ ...form, scoreMinimum: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الحد الأقصى للدرجة' : 'Score Maximum'}</label>
            <input
              type="number"
              value={form.scoreMaximum ?? 30}
              onChange={(e) => setForm({ ...form, scoreMaximum: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>
        </div>

        <div>
          <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'أنواع الأسئلة (مفصولة بفاصلة)' : 'Question Types (comma separated)'}</label>
          <input
            type="text"
            value={questionTypesInput}
            onChange={(e) => setQuestionTypesInput(e.target.value)}
            placeholder={isRtl ? 'مثال: Multiple Choice, Essay, Short Answer' : 'e.g. Multiple Choice, Essay'}
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
  isRtl
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
    scoreReportingUrl: initialScoreScale?.scoreReportingUrl ?? ''
  });

  const [bandsInput, setBandsInput] = useState<string>((initialScoreScale?.bandsOrLevels || []).join(', '));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Client-side validation requirement
    if (form.overallMinimum > form.overallMaximum) {
      setError(
        isRtl
          ? 'الحد الأدنى للدرجات (Overall Minimum) يجب أن يكون أقل من أو يساوي الحد الأقصى (Overall Maximum).'
          : 'Overall Minimum score must be less than or equal to Overall Maximum.'
      );
      return;
    }

    const payload = {
      ...form,
      bandsOrLevels: bandsInput.split(',').map((b) => b.trim()).filter(Boolean)
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
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'نظام وتوزيع الدرجات (Score Scale & Grading System)' : 'Score Scale & Grading System'}</h3>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      <form {...editorForm} className="space-y-6 text-sm">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الحد الأدنى الكلي (Minimum)' : 'Overall Minimum'} *</label>
            <input
              type="number"
              step="any"
              value={form.overallMinimum}
              onChange={(e) => setForm({ ...form, overallMinimum: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الحد الأقصى الكلي (Maximum)' : 'Overall Maximum'} *</label>
            <input
              type="number"
              step="any"
              value={form.overallMaximum}
              onChange={(e) => setForm({ ...form, overallMaximum: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'معدل الزيادة (Increment)' : 'Score Increment'}</label>
            <input
              type="number"
              step="any"
              value={form.scoreIncrement ?? 0.5}
              onChange={(e) => setForm({ ...form, scoreIncrement: parseFloat(e.target.value) || 0 })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'مدة صلاحية النتيجة (بالأشهر)' : 'Result Validity (Months)'}</label>
            <input
              type="number"
              value={form.resultValidityDurationMonths ?? ''}
              onChange={(e) => setForm({ ...form, resultValidityDurationMonths: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'زمن صدور النتائج (بالأيام)' : 'Result Delivery (Days)'}</label>
            <input
              type="number"
              value={form.resultDeliveryTimeDays ?? ''}
              onChange={(e) => setForm({ ...form, resultDeliveryTimeDays: e.target.value === '' ? undefined : Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'رابط تقارير وإرسال الدرجات' : 'Score Reporting URL'}</label>
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
          <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'المستويات / النطاقات (مفصولة بفاصلة)' : 'Bands / Levels (comma separated)'}</label>
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
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'قواعد النجاح/الرسوب' : 'Pass / Fail Rules'}</label>
            <textarea
              rows={3}
              value={form.passFailRules || ''}
              onChange={(e) => setForm({ ...form, passFailRules: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'المعادلة الإطار الأوروبي CEFR' : 'CEFR Equivalency'}</label>
            <textarea
              rows={3}
              value={form.cefrEquivalency || ''}
              onChange={(e) => setForm({ ...form, cefrEquivalency: e.target.value })}
              className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'المعادلة مع اختبارات أخرى' : 'Cross-test Equivalency'}</label>
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
  isRtl
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
    validityWindowNotes: ''
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
        validityWindowNotes: ''
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
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'رسوم الاختبار (Fee Metadata)' : 'Fee Metadata'}</h3>
      </div>

      {/* Mandatory Non-Payment Execution Notice */}
      <div className="bg-amber-50 border border-amber-200 text-amber-900 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
        <Info className="h-5 w-5 flex-shrink-0 text-amber-600" />
        <span className="font-semibold">
          {isRtl ? 'هذه بيانات رسوم وصفية فقط، ولا تنفذ أي عملية دفع.' : 'These are fee metadata only and do not execute payment.'}
        </span>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Existing Fees List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">{isRtl ? 'الرسوم المسجلة حالياً' : 'Current Registered Fees'}</h4>
        {initialFees.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد بيانات رسوم مسجلة حالياً.' : 'No fee metadata registered currently.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {initialFees.map((fee, idx) => (
              <div key={fee.id || idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-1 text-sm">
                <div className="flex justify-between items-center">
                  <span className="font-bold text-gray-900">{mapFeeType(fee.feeType, isRtl)}</span>
                  <span className="font-mono font-bold text-black text-base">{fee.amount} {fee.currencyCode}</span>
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
      <form {...editorForm} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة أو تعديل رسوم' : 'Add or Update Fee'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'نوع الرسوم' : 'Fee Type'} *</label>
            <select
              value={form.feeType}
              onChange={(e) => setForm({ ...form, feeType: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="REGISTRATION">{isRtl ? 'تسجيل عادي (Registration)' : 'Registration'}</option>
              <option value="LATE_REGISTRATION">{isRtl ? 'تسجيل متأخر (Late Registration)' : 'Late Registration'}</option>
              <option value="RESCHEDULING">{isRtl ? 'إعادة جدولة (Rescheduling)' : 'Rescheduling'}</option>
              <option value="CANCELLATION">{isRtl ? 'إلغاء (Cancellation)' : 'Cancellation'}</option>
              <option value="OTHER">{isRtl ? 'أخرى (Other)' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'المبلغ' : 'Amount'} *</label>
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
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'رمز العملة' : 'Currency Code'} *</label>
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
          <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'ملاحظات وتفاصيل الاستحقاق' : 'Validity Window Notes'}</label>
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
            {isRtl ? 'الرسوم تختلف بحسب الدولة أو المنطقة (Regional Variation)' : 'Fee varies by region'}
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
  isRtl
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
    description: ''
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
        description: ''
      });
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ الرابط الرسمي.' : 'Failed to save official link.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'الروابط الرسمية والمعتمدة (Official Links)' : 'Official Links'}</h3>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Existing Links List */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">{isRtl ? 'الروابط المسجلة حالياً' : 'Current Registered Links'}</h4>
        {initialLinks.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد روابط رسمية مسجلة حالياً.' : 'No official links registered currently.'}
          </p>
        ) : (
          <div className="space-y-2">
            {initialLinks.map((link, idx) => (
              <div key={link.id || idx} className="border border-gray-200 rounded-lg p-3 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 text-sm">
                <div>
                  <span className="font-bold text-gray-900 ml-2 rtl:ml-2 ltr:mr-2">{mapLinkType(link.linkType, isRtl)}</span>
                  <a href={link.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono text-xs">
                    {link.url} <ExternalLink className="h-3 w-3" />
                  </a>
                  {link.description && <p className="text-xs text-gray-500 mt-0.5">{link.description}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Link Form */}
      <form {...editorForm} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة رابط رسمي جديد' : 'Add New Official Link'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'نوع الرابط' : 'Link Type'} *</label>
            <select
              value={form.linkType}
              onChange={(e) => setForm({ ...form, linkType: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="REGISTRATION">{isRtl ? 'رابط التسجيل (Registration)' : 'Registration'}</option>
              <option value="INFORMATION">{isRtl ? 'رابط معلومات الاختبار (Information)' : 'Information'}</option>
              <option value="PREPARATION">{isRtl ? 'رابط مواد التحضير (Preparation)' : 'Preparation'}</option>
              <option value="SCORE_REPORTING">{isRtl ? 'رابط تقارير الدرجات (Score Reporting)' : 'Score Reporting'}</option>
              <option value="OTHER">{isRtl ? 'أخرى (Other)' : 'Other'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الرابط الإلكتروني (URL)' : 'URL'} *</label>
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
          <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'وصف الرابط (اختياري)' : 'Description'}</label>
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

function StatusBadge({ status, isHeader = false }: { status: InternationalTestStatus; isHeader?: boolean }) {
  const label = getStatusLabel(status);
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
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border backdrop-blur-sm ${config}`}>
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

function CompletenessBadge({ status, isHeader = false }: { status: InternationalTestCompletenessStatus; isHeader?: boolean }) {
  const label = getCompletenessLabel(status);
  if (isHeader) {
    const config =
      status === 'COMPLETE'
        ? 'bg-emerald-500/20 text-emerald-200 border-emerald-300/40'
        : status === 'NEEDS_REVIEW'
        ? 'bg-amber-500/20 text-amber-200 border-amber-300/40'
        : 'bg-rose-500/20 text-rose-200 border-rose-300/40';
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border backdrop-blur-sm ${config}`}>
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
    case 'INCOMPLETE':
      return 'ناقص';
    case 'ARCHIVED':
      return 'مؤرشف';
    case 'REJECTED':
      return 'مرفوض';
    default:
      return status;
  }
}

function getCompletenessLabel(status?: InternationalTestCompletenessStatus | null): string {
  if (!status) return 'غير مكتمل';
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
      case 'ENGLISH_LANGUAGE': return 'English language';
      case 'NON_ENGLISH_LANGUAGE': return 'Other language';
      case 'LANGUAGE_PROFICIENCY': return 'Language proficiency';
      case 'GENERAL_UNDERGRADUATE_ADMISSION':
      case 'UNDERGRAD_ADMISSION': return 'Undergraduate admission';
      case 'GRADUATE_ADMISSION':
      case 'GRAD_ADMISSION': return 'Graduate admission';
      case 'NATIONAL_INTERNATIONAL_ADMISSION': return 'National or international admission';
      case 'SPECIALIZED_ADMISSION': return 'Specialized admission';
      case 'PROFESSIONAL_LICENSING_CERTIFICATION':
      case 'PROFESSIONAL_LICENSING': return 'Professional licensing';
      case 'ACADEMIC_PLACEMENT': return 'Academic placement';
      case 'OTHER': return 'Other';
      default: return category;
    }
  }
  switch (category) {
    case 'ENGLISH_LANGUAGE': return 'لغة إنجليزية';
    case 'NON_ENGLISH_LANGUAGE': return 'لغة غير إنجليزية';
    case 'LANGUAGE_PROFICIENCY': return 'إجادة لغة';
    case 'GENERAL_UNDERGRADUATE_ADMISSION':
    case 'UNDERGRAD_ADMISSION': return 'قبول جامعي عام';
    case 'GRADUATE_ADMISSION':
    case 'GRAD_ADMISSION': return 'قبول دراسات عليا';
    case 'NATIONAL_INTERNATIONAL_ADMISSION': return 'قبول وطني/دولي';
    case 'SPECIALIZED_ADMISSION': return 'قبول تخصصي';
    case 'PROFESSIONAL_LICENSING_CERTIFICATION':
    case 'PROFESSIONAL_LICENSING': return 'ترخيص/اعتماد مهني';
    case 'ACADEMIC_PLACEMENT': return 'تحديد مستوى أكاديمي';
    case 'OTHER': return 'أخرى';
    default:
      return category;
  }
}

function mapDeliveryMode(mode: string, isRtl: boolean): string {
  if (isRtl) {
    switch (mode) {
      case 'ONLINE': return 'عبر الإنترنت';
      case 'IN_PERSON': return 'حضوري';
      case 'HYBRID': return 'هجين';
      default: return mode;
    }
  }
  return mode;
}

function mapFeeType(type: string, isRtl: boolean): string {
  if (isRtl) {
    switch (type) {
      case 'REGISTRATION': return 'تسجيل عادي';
      case 'LATE_REGISTRATION': return 'تسجيل متأخر';
      case 'RESCHEDULING': return 'إعادة جدولة';
      case 'CANCELLATION': return 'إلغاء';
      case 'OTHER': return 'أخرى';
      default: return type;
    }
  }
  return type;
}

function mapLinkType(type: string, isRtl: boolean): string {
  if (isRtl) {
    switch (type) {
      case 'REGISTRATION': return 'رابط التسجيل';
      case 'INFORMATION': return 'رابط المعلومات';
      case 'PREPARATION': return 'مواد التحضير';
      case 'SCORE_REPORTING': return 'تقارير الدرجات';
      case 'OTHER': return 'رابط آخر';
      default: return type;
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
    return val.split(',').map((s) => s.trim()).filter(Boolean);
  }
  return [];
}

function mapSourceTrustLevel(level?: string, isRtl?: boolean): string {
  if (!level) return isRtl ? 'غير محدد' : 'Undefined';
  if (isRtl) {
    switch (level) {
      case 'AUTHORITATIVE': return 'مصدر رسمي مباشر';
      case 'HIGH': return 'ثقة عالية';
      case 'MEDIUM': return 'ثقة متوسطة';
      case 'LOW': return 'ثقة منخفضة';
      default: return level;
    }
  }
  return level;
}

function mapDuplicateStatus(status?: string, isRtl?: boolean): string {
  if (!status) return isRtl ? 'غير محدد' : 'Undefined';
  if (isRtl) {
    switch (status) {
      case 'NEW': return 'سجل جديد';
      case 'DUPLICATE_SKIPPED': return 'تكرار متجاوز';
      case 'EXISTING_ENRICHED': return 'سجل مثرى';
      default: return status;
    }
  }
  return status;
}

function mapMaterialType(type?: string, isRtl?: boolean): string {
  if (!type) return isRtl ? 'غير محدد' : 'Undefined';
  if (isRtl) {
    switch (type) {
      case 'SAMPLE_QUESTIONS': return 'أسئلة نموذجية';
      case 'PRACTICE_TEST': return 'اختبار تجريبي';
      case 'BROCHURE': return 'كتيب معلومات';
      case 'AUDIO_SAMPLE': return 'عينة صوتية';
      case 'GUIDE': return 'دليل تحضيري';
      default: return type;
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
  isRtl
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
      availableCountryIds: countriesInput.split(',').map((s) => s.trim()).filter(Boolean),
      availableCityIds: citiesInput.split(',').map((s) => s.trim()).filter(Boolean),
      onlineAvailabilityRegions: regionsInput.split(',').map((s) => s.trim()).filter(Boolean),
      testingWindowsNotes: windowsNotes
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
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'التوفر الجغرافي والإلكتروني (Availability)' : 'Availability'}</h3>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Existing Availability */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">{isRtl ? 'بيانات التوفر المسجلة حالياً' : 'Current Registered Availability'}</h4>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : !availability ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد بيانات توفر مسجلة حالياً لهذا الاختبار.' : 'No availability data registered currently.'}
          </p>
        ) : (
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4 text-sm">
            <div>
              <span className="font-bold text-gray-900 block mb-1">{isRtl ? 'الدول المتاحة (معرفات/رموز مرجعية):' : 'Available Country IDs:'}</span>
              {countries.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {countries.map((c: string, idx: number) => (
                    <span key={idx} className="bg-white border border-gray-300 font-mono text-xs px-2.5 py-1 rounded-md text-gray-800 font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">{isRtl ? 'لم يتم تحديد دول محددة' : 'No specific countries specified'}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-gray-900 block mb-1">{isRtl ? 'المدن المتاحة (معرفات/رموز مرجعية):' : 'Available City IDs:'}</span>
              {cities.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {cities.map((c: string, idx: number) => (
                    <span key={idx} className="bg-white border border-gray-300 font-mono text-xs px-2.5 py-1 rounded-md text-gray-800 font-semibold">
                      {c}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">{isRtl ? 'لم يتم تحديد مدن محددة' : 'No specific cities specified'}</p>
              )}
            </div>

            <div>
              <span className="font-bold text-gray-900 block mb-1">{isRtl ? 'التوفر عبر الإنترنت (المناطق):' : 'Online Availability Regions:'}</span>
              {regions.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {regions.map((r: string, idx: number) => (
                    <span key={idx} className="bg-blue-50 border border-blue-200 font-mono text-xs px-2.5 py-1 rounded-md text-blue-800 font-semibold">
                      {r}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-xs italic">{isRtl ? 'لم يتم تحديد مناطق إنترنت' : 'No online regions specified'}</p>
              )}
            </div>

            {availability.testingWindowsNotes && (
              <div>
                <span className="font-bold text-gray-900 block mb-1">{isRtl ? 'مواعيد ونوافذ الاختبار:' : 'Testing Windows Notes:'}</span>
                <p className="bg-white border border-gray-200 p-3 rounded-lg text-gray-700 whitespace-pre-line text-xs">
                  {availability.testingWindowsNotes}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add / Update Availability Form */}
      <form {...editorForm} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'تحديث بيانات التوفر' : 'Update Availability Data'}
        </h4>

        <div className="space-y-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الدول المتاحة (رموز الدول مفصولة بفاصلة)' : 'Available Country IDs (comma separated)'}</label>
            <input
              type="text"
              value={countriesInput}
              onChange={(e) => setCountriesInput(e.target.value)}
              placeholder="e.g. SA, AE, EG, US, KW"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">{isRtl ? 'رمز الدولة المرجعي فقط دون تكرار للبيانات.' : 'Reference code only, no duplicate data.'}</p>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'المدن المتاحة (رموز المدن مفصولة بفاصلة)' : 'Available City IDs (comma separated)'}</label>
            <input
              type="text"
              value={citiesInput}
              onChange={(e) => setCitiesInput(e.target.value)}
              placeholder="e.g. RUH, JED, DXB, CAI"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
            <p className="text-xs text-gray-500 mt-1">{isRtl ? 'رمز المدينة المرجعي فقط.' : 'Reference city code only.'}</p>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'التوفر عبر الإنترنت (المناطق المتاحة)' : 'Online Availability Regions'}</label>
            <input
              type="text"
              value={regionsInput}
              onChange={(e) => setRegionsInput(e.target.value)}
              placeholder="e.g. GLOBAL, MIDDLE_EAST, ASIA"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'مواعيد ونوافذ تقديم الاختبار' : 'Testing Windows Notes'}</label>
            <textarea
              rows={3}
              value={windowsNotes}
              onChange={(e) => setWindowsNotes(e.target.value)}
              placeholder={isRtl ? 'تفاصيل المواعيد المتاحة على مدار العام...' : 'Details on available testing windows...'}
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
  isRtl
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
    description: ''
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
          : 'Persisted files must be registered through the asset system, not local file paths.'
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
        description: ''
      });
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ مادة التحضير.' : 'Failed to save preparation material.'));
      return false;
    } finally {
      setSaving(false);
    }
  };

  const editorForm = useTestEditorForm(handleSubmit);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'مواد التحضير والاستعداد (Preparation Materials)' : 'Preparation Materials'}</h3>
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

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Existing Materials */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">{isRtl ? 'المواد المسجلة حالياً' : 'Current Registered Materials'}</h4>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : materials.length === 0 ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد مواد تحضير مسجلة حالياً لهذا الاختبار.' : 'No preparation materials registered currently.'}
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {materials.map((m, idx) => (
              <div key={m.id || idx} className="border border-gray-200 rounded-lg p-4 bg-gray-50 space-y-2 text-sm">
                <div className="flex justify-between items-start">
                  <h5 className="font-bold text-gray-900">{m.title}</h5>
                  <span className="bg-gray-200 text-gray-800 text-xs px-2 py-0.5 rounded font-medium">
                    {mapMaterialType(m.materialType, isRtl)}
                  </span>
                </div>
                {m.url && (
                  <p className="text-xs">
                    <a href={m.url} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-mono">
                      {m.url} <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
                {m.assetId && (
                  <p className="text-xs text-gray-600">
                    <span className="font-medium">{isRtl ? 'مرجع الأصل: ' : 'Asset ID: '}</span>
                    <code className="bg-white px-1.5 py-0.5 rounded border border-gray-200 font-mono text-xs">{m.assetId}</code>
                  </p>
                )}
                {m.description && <p className="text-xs text-gray-600 pt-1 border-t border-gray-200">{m.description}</p>}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Material Form */}
      <form {...editorForm} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إضافة مادة تحضير جديدة' : 'Add New Preparation Material'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'نوع المادة' : 'Material Type'} *</label>
            <select
              value={form.materialType}
              onChange={(e) => setForm({ ...form, materialType: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="SAMPLE_QUESTIONS">{isRtl ? 'أسئلة نموذجية (Sample Questions)' : 'Sample Questions'}</option>
              <option value="PRACTICE_TEST">{isRtl ? 'اختبار تجريبي (Practice Test)' : 'Practice Test'}</option>
              <option value="BROCHURE">{isRtl ? 'كتيب معلومات (Brochure)' : 'Brochure'}</option>
              <option value="AUDIO_SAMPLE">{isRtl ? 'عينة صوتية (Audio Sample)' : 'Audio Sample'}</option>
              <option value="GUIDE">{isRtl ? 'دليل تحضيري (Guide)' : 'Guide'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'عنوان المادة' : 'Title'} *</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder={isRtl ? 'مثال: دليل التحضير الرسمي 2026' : 'e.g. Official Guide 2026'}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'رابط المادة (URL خارجي مسموح)' : 'URL (External link)'}</label>
            <input
              type="text"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'مرجع الأصل في النظام (Asset ID)' : 'Asset ID'}</label>
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
          <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الوصف' : 'Description'}</label>
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
  isRtl
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
    evidenceSnippet: '',
    sourceTrustLevel: 'AUTHORITATIVE'
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
      await adminApiClient.addInternationalTestEvidence(testId, form);
      setSuccess(isRtl ? 'تم إدراج بيانات الدليل بنجاح.' : 'Evidence recorded successfully.');
      setForm({
        originalImportedName: '',
        sourceId: '',
        sourceUrl: '',
        evidenceSnippet: '',
        sourceTrustLevel: 'AUTHORITATIVE'
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
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'الأدلة والمصادر (Evidence & Sources)' : 'Evidence & Sources'}</h3>
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

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{success}</div>}

      {/* Existing Evidence Display */}
      <div className="space-y-3">
        <h4 className="font-semibold text-gray-800 text-sm">{isRtl ? 'بيانات الأدلة والمصادر المسجلة' : 'Registered Evidence & Source Data'}</h4>
        {loading ? (
          <div className="flex justify-center p-6"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>
        ) : !evidence ? (
          <p className="text-sm text-gray-500 italic bg-gray-50 p-4 rounded-lg border border-dashed text-center">
            {isRtl ? 'لا توجد أدلة مسجلة لهذا الاختبار حالياً.' : 'No evidence records currently registered for this test.'}
          </p>
        ) : (
          <div className="border border-gray-200 rounded-xl p-5 bg-gray-50 space-y-4 text-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <dt className="text-gray-500 text-xs font-medium">{isRtl ? 'مستوى الثقة بالمصدر' : 'Source Trust Level'}</dt>
                <dd className="font-bold text-gray-900 mt-0.5">{mapSourceTrustLevel(evidence.sourceTrustLevel, isRtl)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">{isRtl ? 'حالة التكرار' : 'Duplicate Status'}</dt>
                <dd className="font-bold text-gray-900 mt-0.5">{mapDuplicateStatus(evidence.duplicateStatus, isRtl)}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">{isRtl ? 'الاسم المستورد الأصلي' : 'Original Imported Name'}</dt>
                <dd className="font-semibold text-gray-800 mt-0.5">{evidence.originalImportedName || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">{isRtl ? 'الاسم المعياري المنظم' : 'Normalized Canonical Name'}</dt>
                <dd className="font-semibold text-gray-800 mt-0.5">{evidence.normalizedCanonicalName || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">{isRtl ? 'المفتاح الحتمي (Deterministic Key)' : 'Deterministic Key'}</dt>
                <dd className="font-mono text-xs text-gray-700 mt-0.5">{evidence.deterministicKey || '-'}</dd>
              </div>
              <div>
                <dt className="text-gray-500 text-xs font-medium">{isRtl ? 'تاريخ الاسترجاع' : 'Retrieved At'}</dt>
                <dd className="font-mono text-xs text-gray-700 mt-0.5">
                  {evidence.retrievedAt ? new Date(evidence.retrievedAt).toLocaleString() : '-'}
                </dd>
              </div>
            </div>

            {evidence.sourceUrl && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-0.5">{isRtl ? 'رابط المصدر' : 'Source URL'}</dt>
                <dd>
                  <a href={evidence.sourceUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-mono text-xs inline-flex items-center gap-1">
                    {evidence.sourceUrl} <ExternalLink className="h-3 w-3" />
                  </a>
                </dd>
              </div>
            )}

            {evidence.evidenceSnippet && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-1">{isRtl ? 'مقتطف الدليل (Snippet)' : 'Evidence Snippet'}</dt>
                <dd className="bg-white border border-gray-200 p-3 rounded-lg text-xs font-mono text-gray-800 whitespace-pre-wrap">
                  {evidence.evidenceSnippet}
                </dd>
              </div>
            )}

            {evidence.conflictingFields && evidence.conflictingFields.length > 0 && (
              <div>
                <dt className="text-amber-800 font-bold text-xs mb-1">{isRtl ? 'الحقول المتعارضة:' : 'Conflicting Fields:'}</dt>
                <dd className="flex flex-wrap gap-1">
                  {evidence.conflictingFields.map((field: string, idx: number) => (
                    <span key={idx} className="bg-amber-100 text-amber-900 border border-amber-300 text-xs px-2 py-0.5 rounded font-mono">
                      {field}
                    </span>
                  ))}
                </dd>
              </div>
            )}

            {evidence.mergeSuggestions && (
              <div>
                <dt className="text-gray-500 text-xs font-medium mb-1">{isRtl ? 'مقترحات الدمج (Merge Suggestions)' : 'Merge Suggestions'}</dt>
                <dd className="bg-white border p-3 rounded-lg text-xs font-mono text-gray-700 overflow-x-auto">
                  <pre>{JSON.stringify(evidence.mergeSuggestions, null, 2)}</pre>
                </dd>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Evidence Form */}
      <form {...editorForm} className="border border-gray-200 rounded-xl p-5 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2 flex items-center gap-1.5">
          <Plus className="h-4 w-4" />
          {isRtl ? 'إدراج دليل جديد' : 'Add New Evidence'}
        </h4>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'مستوى الثقة بالمصدر' : 'Source Trust Level'} *</label>
            <select
              value={form.sourceTrustLevel}
              onChange={(e) => setForm({ ...form, sourceTrustLevel: e.target.value as any })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="AUTHORITATIVE">{isRtl ? 'رسمي مباشر (Authoritative)' : 'Authoritative'}</option>
              <option value="HIGH">{isRtl ? 'ثقة عالية (High)' : 'High'}</option>
              <option value="MEDIUM">{isRtl ? 'ثقة متوسطة (Medium)' : 'Medium'}</option>
              <option value="LOW">{isRtl ? 'ثقة منخفضة (Low)' : 'Low'}</option>
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'الاسم المستورد الأصلي' : 'Original Imported Name'}</label>
            <input
              type="text"
              value={form.originalImportedName}
              onChange={(e) => setForm({ ...form, originalImportedName: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'معرف المصدر (Source ID)' : 'Source ID'}</label>
            <input
              type="text"
              value={form.sourceId}
              onChange={(e) => setForm({ ...form, sourceId: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-1 focus:ring-black font-mono text-xs"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'رابط المصدر' : 'Source URL'}</label>
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
          <label className="block text-gray-700 font-medium mb-1">{isRtl ? 'مقتطف الدليل' : 'Evidence Snippet'}</label>
          <textarea
            rows={3}
            value={form.evidenceSnippet}
            onChange={(e) => setForm({ ...form, evidenceSnippet: e.target.value })}
            className="w-full border border-gray-300 rounded-lg p-2.5 focus:outline-none focus:ring-1 focus:ring-black text-xs font-mono"
          />
        </div>

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
function ReadinessTab({
  test,
  onRefresh,
  onPublish,
  isRtl
}: {
  test: InternationalTestDetail;
  onRefresh: () => void;
  onPublish: () => Promise<void>;
  isRtl: boolean;
}) {
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [confirmModal, setConfirmModal] = useState<'publish' | 'archive' | null>(null);

  const [readiness, setReadiness] = useState<any | null>(null);

  const loadReadiness = async () => {
    try {
      setReadiness(await adminApiClient.getInternationalTestReadiness<any>(test.id));
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر تحميل تقرير الجاهزية.' : 'Failed to load readiness report.'));
    }
  };

  useEffect(() => { void loadReadiness(); }, [test.id, test.status, test.isSourceVerified, test.providerId]);

  const handleVerifySource = async () => {
    setError(null); setSuccess(null); setActionLoading('verify');
    try {
      await adminApiClient.verifyInternationalTestSource(test.id);
      setSuccess(isRtl ? 'تم اعتماد المصدر بناءً على دليل رسمي/عالي الثقة.' : 'Source verified from authoritative/high-trust evidence.');
      await onRefresh();
      await loadReadiness();
    } catch (err: any) {
      setError(err.message || (isRtl ? 'يلزم دليل يحتوي رابط مصدر بمستوى ثقة رسمي أو عالٍ.' : 'Trusted source evidence is required.'));
    } finally { setActionLoading(null); }
  };

  const handleMarkPublishable = async () => {
    setError(null);
    setSuccess(null);
    setActionLoading('mark');
    try {
      await adminApiClient.markInternationalTestReadyToPublish(test.id);
      setSuccess(isRtl ? 'تم تغيير حالة الاختبار إلى جاهز للنشر بنجاح.' : 'Test status updated to Ready to Publish.');
      onRefresh();
    } catch (err: any) {
      setError(
        err.message ||
          (isRtl ? 'لا يمكن النشر قبل اكتمال البيانات' : 'Cannot mark publishable before data completeness.')
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handlePublish = async () => {
    setConfirmModal(null);
    await onPublish();
    await loadReadiness();
  };

  const handleArchive = async () => {
    setError(null);
    setSuccess(null);
    setActionLoading('archive');
    setConfirmModal(null);
    try {
      await adminApiClient.archiveInternationalTest(test.id);
      setSuccess(isRtl ? 'تم أرشفة الاختبار الدولي بنجاح.' : 'International test archived successfully.');
      onRefresh();
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر أرشفة الاختبار.' : 'Failed to archive test.'));
    } finally {
      setActionLoading(null);
    }
  };

  const isPublished = test.status === 'PUBLISHED' && test.isPubliclyVisible === true;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center border-b pb-3">
        <h3 className="text-lg font-bold text-gray-900">{isRtl ? 'الجاهزية والنشر (Readiness & Publishing)' : 'Readiness & Publishing'}</h3>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2">
          <CheckCircle2 className="h-5 w-5 flex-shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Current Readiness Overview */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm">{isRtl ? 'حالة الجاهزية والنشر الحالية' : 'Current Readiness Status'}</h4>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <span className="text-gray-500 text-xs block mb-1">{isRtl ? 'حالة الاختبار (Status)' : 'Status'}</span>
            <StatusBadge status={test.status} />
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <span className="text-gray-500 text-xs block mb-1">{isRtl ? 'حالة الاكتمال' : 'Completeness'}</span>
            {test.completenessStatus ? (
              <CompletenessBadge status={test.completenessStatus} />
            ) : (
              <span className="text-xs text-gray-500 font-semibold">{isRtl ? 'غير محدد' : 'Undefined'}</span>
            )}
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <span className="text-gray-500 text-xs block mb-1">{isRtl ? 'التحقق من المصدر' : 'Source Verification'}</span>
            <span className={`text-xs font-bold ${test.isSourceVerified ? 'text-green-700' : 'text-gray-600'}`}>
              {test.isSourceVerified ? (isRtl ? 'تم التحقق' : 'Verified') : (isRtl ? 'غير موثق' : 'Unverified')}
            </span>
          </div>

          <div className="bg-gray-50 border border-gray-200 p-4 rounded-lg">
            <span className="text-gray-500 text-xs block mb-1">{isRtl ? 'الظهور للعامة' : 'Public Visibility'}</span>
            <span className={`text-xs font-bold ${test.isPubliclyVisible ? 'text-blue-700' : 'text-gray-600'}`}>
              {test.isPubliclyVisible ? (isRtl ? 'متاح للعامة' : 'Publicly Visible') : (isRtl ? 'مخفي' : 'Hidden')}
            </span>
          </div>
        </div>

        {/* Public Page Notice Rule */}
        <div className="p-4 rounded-lg border text-sm flex items-center gap-3 bg-amber-50 border-amber-200 text-amber-900">
          <Info className="h-5 w-5 flex-shrink-0 text-amber-600" />
          <p>
            {isPublished ? (
              <span>
                {isRtl
                  ? 'الاختبار منشور الآن بالكامل ورابط الصفحة العامة فعال.'
                  : 'Test is published now and public page link is active.'}{' '}
                <a
                  href={`/international-tests/${test.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="font-bold underline text-amber-950 inline-flex items-center gap-1"
                >
                  {isRtl ? 'معاينة الصفحة العامة' : 'View Public Page'} <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </span>
            ) : (
              <span>
                {isRtl
                  ? 'ملاحظة: سيظهر رابط الصفحة العامة بعد النشر الرسمي فقط. لن يتم النشر التلقائي بدون موافقة صريحة.'
                  : 'Note: Public page link appears after official publication only. No auto-publish.'}
              </span>
            )}
          </p>
        </div>

        {/* Publication Readiness Policy */}
        {readiness && (
          <div className={`border p-4 rounded-lg text-xs space-y-3 ${readiness.ready ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center justify-between gap-3">
              <h5 className="font-bold text-gray-900 text-sm">{isRtl ? 'سياسة الجاهزية الفعلية للنشر' : 'Live Publication Readiness Policy'}</h5>
              <span className={`font-bold ${readiness.ready ? 'text-green-700' : 'text-red-700'}`}>
                {readiness.ready ? (isRtl ? 'جاهز' : 'READY') : (isRtl ? 'غير جاهز' : 'BLOCKED')}
              </span>
            </div>
            {readiness.blockingIssues?.length > 0 && (
              <div>
                <div className="font-semibold text-red-800 mb-1">{isRtl ? 'عوامل المنع:' : 'Blocking issues:'}</div>
                <ul className="list-disc list-inside space-y-1 text-red-700">
                  {readiness.blockingIssues.map((issue: any) => <li key={`${issue.code}-${issue.field || ''}`}><span className="font-mono">{issue.code}</span>{issue.field ? ` — ${issue.field}` : ''}: {issue.message}</li>)}
                </ul>
              </div>
            )}
            {readiness.warnings?.length > 0 && (
              <div>
                <div className="font-semibold text-amber-800 mb-1">{isRtl ? 'تحذيرات:' : 'Warnings:'}</div>
                <ul className="list-disc list-inside space-y-1 text-amber-700">
                  {readiness.warnings.map((issue: any) => <li key={`${issue.code}-${issue.field || ''}`}>{issue.message}</li>)}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Action Controls */}
      <div className="border border-gray-200 rounded-xl p-6 bg-white space-y-4 shadow-sm">
        <h4 className="font-bold text-gray-900 text-sm border-b pb-2">{isRtl ? 'إجراءات التحكم بالنشر والأرشفة' : 'Publishing & Archiving Controls'}</h4>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleVerifySource}
            disabled={actionLoading !== null || test.isSourceVerified === true}
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {actionLoading === 'verify' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            {isRtl ? 'اعتماد المصدر' : 'Verify Source'}
          </button>

          <button
            type="button"
            onClick={handleMarkPublishable}
            disabled={actionLoading !== null || test.status === 'READY_TO_PUBLISH' || isPublished}
            className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
          >
            {actionLoading === 'mark' && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRtl ? 'تجهيز للنشر' : 'Prepare for Publishing'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmModal('publish')}
            disabled={actionLoading !== null || isPublished}
            className="inline-flex items-center gap-2 bg-green-600 text-white px-5 py-2.5 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50"
          >
            {actionLoading === 'publish' && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRtl ? 'نشر' : 'Publish'}
          </button>

          <button
            type="button"
            onClick={() => setConfirmModal('archive')}
            disabled={actionLoading !== null || test.status === 'ARCHIVED'}
            className="inline-flex items-center gap-2 bg-gray-600 text-white px-4 py-2.5 rounded-lg text-sm font-medium hover:bg-gray-700 disabled:opacity-50"
          >
            {actionLoading === 'archive' && <Loader2 className="h-4 w-4 animate-spin" />}
            {isRtl ? 'أرشفة' : 'Archive'}
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h4 className="text-lg font-bold text-gray-900">
              {confirmModal === 'publish'
                ? (isRtl ? 'تأكيد النشر' : 'Confirm Publication')
                : (isRtl ? 'تأكيد الأرشفة' : 'Confirm Archiving')}
            </h4>
            <p className="text-sm text-gray-600">
              {confirmModal === 'publish'
                ? (isRtl
                    ? 'هل أنت متأكد من إتاحة هذا الاختبار للعامة على المنصة؟ سيصبح رابط الاختبار العام فعالاً.'
                    : 'Are you sure you want to publish this test publicly?')
                : (isRtl
                    ? 'هل أنت متأكد من أرشفة هذا الاختبار الدولي؟ لن يظهر في القوائم النشطة.'
                    : 'Are you sure you want to archive this test?')}
            </p>
            <div className="flex justify-end items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-black font-medium"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={confirmModal === 'publish' ? handlePublish : handleArchive}
                className={`px-4 py-2 text-sm text-white font-medium rounded-lg ${
                  confirmModal === 'publish' ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-800 hover:bg-black'
                }`}
              >
                {confirmModal === 'publish' ? (isRtl ? 'تأكيد النشر' : 'Confirm Publish') : (isRtl ? 'تأكيد الأرشفة' : 'Confirm Archive')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


// ----------------------------------------------------------------------
// DESCRIPTION TAB
// ----------------------------------------------------------------------
function DescriptionTab({ test, onRefresh, isRtl }: { test: InternationalTestDetail; onRefresh: () => void; isRtl: boolean }) {
  const [providers, setProviders] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({
    providerId: test.providerId || '',
    testCategory: test.testCategory,
    abbreviation: test.abbreviation || '',
  });
  const [providerDraft, setProviderDraft] = useState({ key: '', displayName: '', officialWebsite: '', countryIso2Code: '' });

  useEffect(() => {
    setForm({ providerId: test.providerId || '', testCategory: test.testCategory, abbreviation: test.abbreviation || '' });
  }, [test.id, test.providerId, test.testCategory, test.abbreviation]);

  const loadProviders = async () => {
    try {
      const rows = await adminApiClient.listInternationalTestProviders<any[]>();
      setProviders(Array.isArray(rows) ? rows : []);
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر تحميل مزودي الاختبارات.' : 'Failed to load test providers.'));
    }
  };

  useEffect(() => { void loadProviders(); }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null); setSuccess(null);
    try {
      await adminApiClient.updateInternationalTest(test.id, {
        providerId: form.providerId || undefined,
        testCategory: form.testCategory,
        abbreviation: form.abbreviation.trim() || undefined,
      });
      setSuccess(isRtl ? 'تم حفظ الملف الأساسي وربطه بالمزود المعياري.' : 'Core profile and canonical provider saved.');
      await onRefresh();
      return true;
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر حفظ الملف الأساسي.' : 'Failed to save core profile.'));
      return false;
    } finally { setSaving(false); }
  };

  const editorForm = useTestEditorForm(saveProfile);

  const createProvider = async () => {
    setSaving(true); setError(null); setSuccess(null);
    try {
      const created = await adminApiClient.upsertInternationalTestProvider<any>({
        key: providerDraft.key,
        displayName: providerDraft.displayName,
        ...(providerDraft.officialWebsite.trim() ? { officialWebsite: providerDraft.officialWebsite.trim() } : {}),
        ...(providerDraft.countryIso2Code.trim() ? { countryIso2Code: providerDraft.countryIso2Code.trim().toUpperCase() } : {}),
      });
      await loadProviders();
      setForm((current) => ({ ...current, providerId: created.id }));
      setProviderDraft({ key: '', displayName: '', officialWebsite: '', countryIso2Code: '' });
      setSuccess(isRtl ? 'تم إنشاء المزود المعياري. احفظ الملف لربطه بالاختبار.' : 'Canonical provider created. Save the profile to link it to this test.');
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر إنشاء المزود.' : 'Failed to create provider.'));
    } finally { setSaving(false); }
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-3">
        {isRtl ? 'الملف الأساسي والمزود المعياري' : 'Core Profile & Canonical Provider'}
      </h3>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm">{error}</div>}
      {success && <div className="bg-green-50 border border-green-200 text-green-700 p-3 rounded-lg text-sm">{success}</div>}

      <div className="bg-blue-50 border border-blue-200 text-blue-900 p-4 rounded-lg text-sm">
        {isRtl
          ? 'الأسماء العربية والإنجليزية للعرض مقروءة هنا فقط؛ تحرير الترجمة يبقى ضمن Translation Infrastructure ولا يتم نسخه داخل شاشة الاختبارات.'
          : 'Localized display names are read-only here; translation authoring remains owned by Translation Infrastructure.'}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <DetailField label={isRtl ? 'الاسم بالعربية' : 'Localized Name AR'} value={test.localizedNameAr || (isRtl ? 'غير متوفر' : 'N/A')} />
        <DetailField label={isRtl ? 'الاسم بالإنجليزية' : 'Localized Name EN'} value={test.localizedNameEn || (isRtl ? 'غير متوفر' : 'N/A')} />
      </div>

      <form {...editorForm} className="border rounded-xl p-5 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
          <div>
            <label className="block font-medium text-gray-700 mb-1">{isRtl ? 'المزود المعياري' : 'Canonical Provider'}</label>
            <select value={form.providerId} onChange={(e) => setForm({ ...form, providerId: e.target.value })} className="w-full border rounded-lg px-3 py-2">
              <option value="">{isRtl ? 'اختر المزود' : 'Select provider'}</option>
              {providers.map((provider) => <option key={provider.id} value={provider.id}>{provider.displayName}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">{isRtl ? 'فئة الاختبار' : 'Test Category'}</label>
            <select value={form.testCategory} onChange={(e) => setForm({ ...form, testCategory: e.target.value as InternationalTestCategory })} className="w-full border rounded-lg px-3 py-2">
              {TEST_CATEGORY_OPTIONS.map((category) => <option key={category} value={category}>{getCategoryLabel(category)}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">{isRtl ? 'الاختصار' : 'Abbreviation'}</label>
            <input value={form.abbreviation} onChange={(e) => setForm({ ...form, abbreviation: e.target.value })} className="w-full border rounded-lg px-3 py-2" />
          </div>
        </div>
        <button type="submit" disabled={saving} className="inline-flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{isRtl ? 'حفظ الملف الأساسي' : 'Save Core Profile'}
        </button>
      </form>

      <div className="border rounded-xl p-5 space-y-4">
        <h4 className="font-bold text-sm">{isRtl ? 'إضافة مزود معياري جديد' : 'Create Canonical Provider'}</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-sm">
          <input placeholder={isRtl ? 'المفتاح، مثال ETS' : 'Key, e.g. ETS'} value={providerDraft.key} onChange={(e) => setProviderDraft({ ...providerDraft, key: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder={isRtl ? 'اسم المزود' : 'Provider name'} value={providerDraft.displayName} onChange={(e) => setProviderDraft({ ...providerDraft, displayName: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder="https://..." value={providerDraft.officialWebsite} onChange={(e) => setProviderDraft({ ...providerDraft, officialWebsite: e.target.value })} className="border rounded-lg px-3 py-2" />
          <input placeholder="US" maxLength={2} value={providerDraft.countryIso2Code} onChange={(e) => setProviderDraft({ ...providerDraft, countryIso2Code: e.target.value })} className="border rounded-lg px-3 py-2 uppercase" />
        </div>
        <button type="button" onClick={createProvider} disabled={saving || !providerDraft.key.trim() || !providerDraft.displayName.trim()} className="inline-flex items-center gap-2 bg-gray-800 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50">
          <Plus className="h-4 w-4" />{isRtl ? 'إنشاء المزود' : 'Create Provider'}
        </button>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// REQUIREMENTS TAB
// ----------------------------------------------------------------------
function RequirementsTab({ test, onRefresh, isRtl }: { test: InternationalTestDetail; onRefresh: () => Promise<void>; isRtl: boolean }) {
  const keys = ['registrationRequirements', 'identificationRequirements', 'retakePolicy', 'cancellationReschedulingNotes', 'accessibilityNotes'] as const;
  const labels = ['متطلبات التسجيل', 'متطلبات الهوية', 'سياسة إعادة الاختبار', 'الإلغاء وتغيير الموعد', 'التسهيلات'];
  const initial = () => Object.fromEntries(keys.map(key => [key, test[key] || ''])) as Record<typeof keys[number], string>;
  const [form, setForm] = useState(initial);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { setForm(initial()); }, [test.id]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError(null);
    try {
      await adminApiClient.updateInternationalTest(test.id, form);
      await onRefresh();
      return true;
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'تعذر الحفظ'); return false; }
    finally { setSaving(false); }
  };
  const editorForm = useTestEditorForm(submit);
  return <form {...editorForm} className="space-y-4">
    <h3 className="font-bold text-[#142B5F]">{isRtl ? 'المتطلبات والسياسات' : 'Requirements & policies'}</h3>
    {error && <p role="alert" className="text-red-700">{error}</p>}
    {keys.map((key, index) => <label key={key} className="block text-xs font-bold text-[#142B5F]">
      {isRtl ? labels[index] : key}
      <textarea value={form[key]} onChange={event => setForm({ ...form, [key]: event.target.value })} rows={3} className="block mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 text-sm font-normal" />
    </label>)}
    <button type="submit" disabled={saving} className="rounded-xl bg-[#0E7C86] px-4 py-2 text-white text-xs font-bold">{saving ? 'جارٍ الحفظ...' : 'حفظ السياسات'}</button>
  </form>;
}

// ----------------------------------------------------------------------
// CROSS PHASE TAB
// ----------------------------------------------------------------------
function CrossPhaseTab({ testId, isRtl }: { testId: string; isRtl: boolean }) {
  const [graph, setGraph] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    adminApiClient.getInternationalTestRelationships<any>(testId, isRtl ? 'ar' : 'en')
      .then((value) => { if (active) setGraph(value); })
      .catch((err: any) => { if (active) setError(err.message || (isRtl ? 'تعذر تحميل العلاقات.' : 'Failed to load relationships.')); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [testId, isRtl]);

  if (loading) return <div className="flex justify-center p-8"><Loader2 className="h-6 w-6 animate-spin text-gray-400" /></div>;
  if (error) return <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-lg text-sm">{error}</div>;

  const relationships = graph?.relationships || {};
  const universities = relationships.universities?.data || [];
  const scholarships = relationships.scholarships?.data || [];
  const editorial = relationships.editorialContent || [];
  const preparationCourses = relationships.preparationCourses?.data || [];

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold text-gray-900 border-b pb-3">
        {isRtl ? 'الترابط بين المجالات — قراءة حقيقية' : 'Cross-domain Relationships — Live Read Model'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
        <div className="border rounded-lg p-4">
          <div className="font-semibold text-gray-900">{isRtl ? 'الجامعات التي تقبل الاختبار' : 'Universities Accepting Test'}</div>
          <div className="text-2xl font-bold mt-1">{relationships.universities?.total ?? universities.length}</div>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            {universities.slice(0, 6).map((item: any) => (
              <div key={item.ownerId}>{item.displayName} — {item.matchingPrograms?.length || 0} {isRtl ? 'برنامج' : 'program(s)'}</div>
            ))}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="font-semibold text-gray-900">{isRtl ? 'المنح التي تشترط الاختبار' : 'Scholarships Requiring Test'}</div>
          <div className="text-2xl font-bold mt-1">{relationships.scholarships?.total ?? scholarships.length}</div>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            {scholarships.slice(0, 6).map((item: any) => <div key={item.ownerId}>{item.displayName}</div>)}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="font-semibold text-gray-900">{isRtl ? 'محتوى CMS المرتبط' : 'Related CMS Content'}</div>
          <div className="text-2xl font-bold mt-1">{editorial.length}</div>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            {editorial.slice(0, 6).map((item: any) => <div key={item.contentId}>{item.title}</div>)}
          </div>
        </div>
        <div className="border rounded-lg p-4">
          <div className="font-semibold text-gray-900">{isRtl ? 'الدورات التحضيرية المعتمدة' : 'Approved Preparation Courses'}</div>
          <div className="text-2xl font-bold mt-1">{relationships.preparationCourses?.total ?? preparationCourses.length}</div>
          <div className="mt-2 space-y-1 text-xs text-gray-600">
            {preparationCourses.slice(0, 6).map((item: any) => <div key={item.ownerId}>{item.displayName}{item.providerName ? ` — ${item.providerName}` : ''}</div>)}
            {!preparationCourses.length && <div>{isRtl ? 'لا توجد دورات تحضيرية منشورة ومعتمدة لهذا الاختبار حاليًا.' : 'No published approved preparation courses are linked to this test yet.'}</div>}
          </div>
        </div>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="font-semibold text-gray-900">{isRtl ? 'الأدوات الطلابية' : 'Student Tools'}</div>
          <div className="text-xs text-gray-600 mt-2">{isRtl ? 'غير موصولة — الملكية لمجال الأدوات.' : 'Not integrated — owned by Student Tools.'}</div>
        </div>
        <div className="border rounded-lg p-4 bg-gray-50">
          <div className="font-semibold text-gray-900">{isRtl ? 'الخدمات' : 'Services'}</div>
          <div className="text-xs text-gray-600 mt-2">{isRtl ? 'غير موصولة — الملكية لمجال الخدمات.' : 'Not integrated — owned by Services.'}</div>
        </div>
      </div>
    </div>
  );
}
