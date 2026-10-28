import { scholarshipDetailText } from '../features/scholarships/ScholarshipDetailText';
import { registerScholarshipHistoryGuard } from '../features/scholarships/ScholarshipHistoryGuard';
import {
  ScholarshipDetailReadView,
  scholarshipHttpUrl,
} from '../features/scholarships/ScholarshipDetailReadView';
import '../features/scholarships/scholarship-detail.css';
import { OwnerDescriptionTranslationPanel } from '../components/OwnerDescriptionTranslationPanel';
import { adminPaths } from '../navigation/AdminRoutes';
import { AdminLink } from '../components/AdminLink';
import { ScholarshipRelationshipEditorPage } from './ScholarshipRelationshipEditorPage';
import { ScholarshipReferenceLifecycleEditor } from '../features/integration/ScholarshipReferenceLifecycleEditor';
import type { ScholarshipDto } from '@manaratak/domain';
import {
  AlertCircle,
  AlertTriangle,
  Archive,
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCheck,
  CheckCircle2,
  Coins,
  ExternalLink,
  FileText,
  GraduationCap,
  History,
  Info,
  Landmark,
  Layers3,
  Lightbulb,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  scholarshipCatalogApi,
  type ScholarshipCatalogDetailResponse,
  type ScholarshipCatalogUpdate,
} from '../api/scholarshipCatalog';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';

type TabKey =
  | 'identity'
  | 'overview'
  | 'funding'
  | 'degrees_majors'
  | 'eligibility'
  | 'documents'
  | 'links_unis'
  | 'notes'
  | 'health_audit';

interface ConfirmationModalState {
  isOpen: boolean;
  type: 'publish' | 'unpublish' | 'archive' | 'mark-publishable' | 'mark-ready' | null;
  title: string;
  description: string;
  confirmText: string;
  variant: 'emerald' | 'amber' | 'rose' | 'teal';
}

function asText(value: unknown): string {
  return value === null || value === undefined ? '' : String(value);
}

function display(value: unknown): string {
  const text = asText(value);
  return text.trim() ? text : '—';
}

function dateInput(value: unknown): string {
  if (!value) return '';
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function nextKey<T, K extends keyof T>(prefix: string, rows: T[], keyName: K): string {
  const used = new Set(rows.map((row) => String(row[keyName] ?? '')));
  let index = rows.length + 1;
  while (used.has(`${prefix}-${index}`)) index += 1;
  return `${prefix}-${index}`;
}

function toUpdate(s: ScholarshipDto): ScholarshipCatalogUpdate {
  return {
    displayName: s.displayName,
    providerName: s.providerName ?? null,
    amountMinorUnits: s.amountMinorUnits ?? null,
    amountCurrencyCode: s.amountCurrencyCode ?? null,
    isFullyFunded: s.isFullyFunded,
    applicationDeadline: s.applicationDeadline
      ? new Date(s.applicationDeadline).toISOString()
      : null,
    officialWebsite: s.officialWebsite ?? null,
    sourceUrl: s.sourceUrl ?? null,
    academicYear: s.academicYear ?? null,
    cycleName: s.cycleName ?? null,
    countrySourceLabel: s.countrySourceLabel ?? null,
    countryScope: s.countryScope ?? null,
    fundingTypeCode: s.fundingTypeCode ?? null,
    deadlineType: s.deadlineType ?? null,
    applicationMethod: s.applicationMethod ?? null,
    applicationUrl: s.applicationUrl ?? null,
    officialSourceUrl: s.officialSourceUrl ?? null,
    sourceLocale: s.sourceLocale ?? null,
    studyLanguageSourceLabel: s.studyLanguageSourceLabel ?? null,
    description: s.description ?? null,
    notes: s.notes ?? null,
    benefits: (s.benefits ?? []).map((item) => ({ ...item })),
    degreeTargets: (s.degreeTargets ?? []).map((item) => ({ ...item })),
    majorTargets: (s.majorTargets ?? []).map((item) => ({ ...item })),
    eligibilityItems: (s.eligibilityItems ?? []).map((item) => ({ ...item })),
    requiredDocumentItems: (s.requiredDocumentItems ?? []).map((item) => ({ ...item })),
  };
}

function Card({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3.5">
        {icon && (
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-[#0E7C86] border border-teal-100 shrink-0">
            {icon}
          </div>
        )}
        <div>
          <h2 className="text-base font-black text-[#142B5F]">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 flex items-center justify-between text-xs font-bold text-[#142B5F]">
        <span>{label}</span>
        {hint && <span className="text-[10px] font-normal text-slate-400">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Input({
  value,
  onChange,
  type = 'text',
  readOnly = false,
  placeholder,
}: {
  value: unknown;
  onChange?: (value: string) => void;
  type?: string;
  readOnly?: boolean;
  placeholder?: string;
}) {
  return (
    <input
      type={type}
      value={asText(value)}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      className={`w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#203442] outline-none transition font-['Cairo'] ${
        readOnly
          ? 'bg-[#FAF7F0] text-slate-500 cursor-not-allowed border-slate-200/70'
          : 'bg-white focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 hover:border-slate-300'
      }`}
    />
  );
}

function Textarea({
  value,
  onChange,
  rows = 4,
  placeholder,
}: {
  value: unknown;
  onChange?: (value: string) => void;
  rows?: number;
  placeholder?: string;
}) {
  return (
    <textarea
      rows={rows}
      value={asText(value)}
      placeholder={placeholder}
      onChange={(event) => onChange?.(event.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#203442] outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 hover:border-slate-300 font-['Cairo'] leading-relaxed"
    />
  );
}

export function ScholarshipDetailPage() {
  const { dir, t, language } = useTranslation();
  const tr = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const lt = (value: string) => scholarshipDetailText(language, value);
  const [editing, setEditing] = useState(false);
  const [relationshipEditing, setRelationshipEditing] = useState(false);
  const [relationshipDirty, setRelationshipDirty] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');
  const [pendingLeave, setPendingLeave] = useState<null | (() => void)>(null);
  const { hasPermission } = useAdminAuthorization();
  const ArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabKey>('identity');
  const [detail, setDetail] = useState<ScholarshipCatalogDetailResponse | null>(null);
  const [form, setForm] = useState<ScholarshipCatalogUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reviewReason, setReviewReason] = useState('');

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState>({
    isOpen: false,
    type: null,
    title: '',
    description: '',
    confirmText: '',
    variant: 'emerald',
  });

  const savedForm = useRef('');
  useEffect(() => {
    if (!confirmModal.isOpen && !pendingLeave) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector?.<HTMLElement>('[data-scholarship-dialog]');
    dialog?.focus();
    const keyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setConfirmModal((value) => ({ ...value, isOpen: false }));
        setPendingLeave(null);
        return;
      }
      if (event.key !== 'Tab' || !dialog) return;
      const nodes = Array.from(
        dialog.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),a[href],textarea:not(:disabled)',
        ),
      );
      const first = nodes[0],
        last = nodes.at(-1);
      if (!first || !last) return;
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === dialog)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === dialog)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keyboard);
    return () => {
      document.removeEventListener('keydown', keyboard);
      previous?.focus?.();
    };
  }, [confirmModal.isOpen, pendingLeave]);
  const loadRequest = useRef(0);
  const load = useCallback(
    async (expected?: ScholarshipDto) => {
      const request = ++loadRequest.current;
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await scholarshipCatalogApi.detail(id);
        if (request !== loadRequest.current) return;
        if (response && response.scholarship) {
          if (response.scholarship.id !== id)
            throw new Error('SCHOLARSHIP_READBACK_TARGET_MISMATCH');
          if (
            expected &&
            (response.scholarship.id !== expected.id ||
              response.scholarship.revision !== expected.revision ||
              JSON.stringify(toUpdate(response.scholarship)) !== JSON.stringify(toUpdate(expected)))
          )
            throw new Error('SCHOLARSHIP_READBACK_MISMATCH');
          setDetail(response);
          const nextForm = toUpdate(response.scholarship);
          savedForm.current = JSON.stringify(nextForm);
          setForm(nextForm);
          return true;
        } else {
          setError('تعذر العثور على بيانات المنحة المطلوبة.');
        }
      } catch (err: unknown) {
        if (request === loadRequest.current)
          setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات المنحة الدراسية.');
      } finally {
        if (request === loadRequest.current) setLoading(false);
      }
      return false;
    },
    [id],
  );

  useEffect(() => {
    void load();
    return () => {
      loadRequest.current += 1;
    };
  }, [load]);

  const dirty = !!detail && JSON.stringify(form) !== savedForm.current;
  const unsaved = dirty || relationshipDirty;
  const leaveApproved = useRef(false);
  const guard = (action: () => void) => {
    if (unsaved) setPendingLeave(() => action);
    else action();
  };
  useEffect(() => {
    if (!unsaved) {
      leaveApproved.current = false;
      return;
    }
    const unload = (event: BeforeUnloadEvent) => {
      if (leaveApproved.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    const historyIndex = window.history?.state?.idx;
    let restoringHistory = false;
    const pop = (event: PopStateEvent) => {
      if (
        leaveApproved.current ||
        !Number.isSafeInteger(historyIndex) ||
        !Number.isSafeInteger(event.state?.idx)
      )
        return;
      // Capture before BrowserRouter's bubble listener so a refused history
      // transition cannot unmount the editor and discard its draft.
      event.stopImmediatePropagation();
      if (restoringHistory && event.state.idx === historyIndex) {
        restoringHistory = false;
        return;
      }
      const restoreDelta = historyIndex - event.state.idx;
      if (!restoreDelta) return;
      restoringHistory = true;
      window.history.go(restoreDelta);
      setPendingLeave(() => () => {
        leaveApproved.current = true;
        window.history.go(-restoreDelta);
      });
    };
    const link = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest('a[href]') : null;
      if (
        !(target instanceof HTMLAnchorElement) ||
        target.target === '_blank' ||
        event.defaultPrevented ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey
      )
        return;
      const href = target.href;
      if (href === window.location.href) return;
      event.preventDefault();
      event.stopPropagation();
      setPendingLeave(() => () => {
        window.location.assign(href);
      });
    };
    window.addEventListener('beforeunload', unload);
    const unregisterHistory = registerScholarshipHistoryGuard(pop);
    document.addEventListener('click', link, true);
    return () => {
      window.removeEventListener('beforeunload', unload);
      unregisterHistory();
      document.removeEventListener('click', link, true);
    };
  }, [unsaved]);
  const scholarship = detail?.scholarship;
  const benefits = form.benefits ?? [];
  const eligibility = useMemo(
    () =>
      [...(form.eligibilityItems ?? [])].sort(
        (a, b) => Number(a.priorityOrder ?? 0) - Number(b.priorityOrder ?? 0),
      ),
    [form.eligibilityItems],
  );
  const documents = useMemo(
    () =>
      [...(form.requiredDocumentItems ?? [])].sort(
        (a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0),
      ),
    [form.requiredDocumentItems],
  );

  const save = async () => {
    if (!id || detail?.scholarship.id !== id || loading || saving || relationshipDirty)
      return false;
    if (reviewReason.trim().length < 3) {
      setError(
        tr(
          'أدخل سبب التعديل للمراجعة (3 أحرف على الأقل).',
          'Enter an edit reason of at least three characters.',
        ),
      );
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const updated = await scholarshipCatalogApi.update(
        id,
        form,
        reviewReason.trim(),
        detail!.scholarship.revision,
      );
      if (!(await load(updated)))
        throw new Error(
          tr(
            'نجح طلب الحفظ وتعذرت إعادة القراءة؛ تحقق من السجل قبل تكرار الحفظ.',
            'Save accepted but readback failed; verify the record before retrying.',
          ),
        );
      setMessage(
        tr(
          'تم حفظ بيانات المنحة. العلاقات المرجعية تُحفظ بصورة مستقلة داخل تبويب العلاقات.',
          'Scholarship data saved. Canonical relationships are saved separately.',
        ),
      );
      return true;
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ تعديلات المنحة.');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openConfirmModal = (
    type: 'publish' | 'unpublish' | 'archive' | 'mark-publishable' | 'mark-ready',
    title: string,
    description: string,
    confirmText: string,
    variant: 'emerald' | 'amber' | 'rose' | 'teal' = 'emerald',
  ) => {
    setConfirmModal({
      isOpen: true,
      type,
      title,
      description,
      confirmText,
      variant,
    });
  };

  const executeConfirmedAction = async () => {
    if (!id || detail?.scholarship.id !== id || loading || actionLoading || !confirmModal.type)
      return;
    if (decisionReason.trim().length < 3) {
      setError(
        tr(
          'أدخل سبب القرار للمراجعة (3 أحرف على الأقل).',
          'Enter a decision reason of at least three characters.',
        ),
      );
      return;
    }
    const command = confirmModal.type;
    setConfirmModal((prev) => ({ ...prev, isOpen: false }));
    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (
        ['publish', 'mark-publishable', 'mark-ready'].includes(command) &&
        JSON.stringify(form) !== savedForm.current
      )
        throw new Error('احفظ التعديلات قبل تغيير حالة النشر.');
      await scholarshipCatalogApi.command(
        id,
        command,
        decisionReason.trim(),
        detail!.scholarship.revision,
      );
      setMessage(tr('تم تنفيذ القرار بنجاح.', 'The owner decision completed successfully.'));
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ إجراء المنحة.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && (!detail || detail.scholarship.id !== id)) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-3xl border border-[#DDEFF2] bg-white p-8">
        <Loader2 className="h-10 w-10 animate-spin text-[#0E7C86]" />
        <p className="text-xs font-bold text-slate-500 font-['Cairo']">
          {lt('جارٍ تحميل بيانات المنحة الدراسية وتفاصيلها الكاملة...')}
        </p>
      </div>
    );
  }

  if (!detail || !scholarship) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 font-['Cairo']">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-rose-600" />
          <h2 className="text-base font-bold">
            {error ?? lt('لم يتم العثور على المنحة الدراسية المطلوبة.')}
          </h2>
        </div>
        <button
          onClick={() => guard(() => navigate(adminPaths.scholarships))}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs border border-slate-200"
        >
          <ArrowIcon className="h-4 w-4" />
          <span>{lt('العودة لقائمة المنح الدراسية')}</span>
        </button>
      </div>
    );
  }

  const canManage = hasPermission('admin:scholarships:manage');
  const canEdit =
    canManage &&
    scholarship.publicationStatus === 'DRAFT' &&
    !['ARCHIVED', 'REJECTED'].includes(scholarship.status);
  const officialUrl = scholarshipHttpUrl(scholarship.officialSourceUrl);
  const statusLabel = (value: unknown) => {
    const pairs: Record<string, [string, string]> = {
      IMPORTED: ['مستوردة', 'Imported'],
      DRAFT: ['مسودة', 'Draft'],
      READY_TO_REVIEW: ['جاهزة للمراجعة', 'Ready for review'],
      READY_TO_PUBLISH: ['جاهزة للنشر', 'Ready to publish'],
      PUBLISHED: ['منشورة', 'Published'],
      ARCHIVED: ['مؤرشفة', 'Archived'],
      REJECTED: ['مرفوضة', 'Rejected'],
      VERIFIED: ['متحقق منها', 'Verified'],
      UNVERIFIED: ['غير متحقق منها', 'Unverified'],
      FAILED: ['فشل التحقق', 'Verification failed'],
      PENDING: ['بانتظار التحقق', 'Verification pending'],
      COMPLETE: ['مكتملة', 'Complete'],
      INCOMPLETE: ['غير مكتملة', 'Incomplete'],
      NEEDS_REVIEW: ['تحتاج مراجعة', 'Needs review'],
    };
    return pairs[String(value)]?.[language === 'ar' ? 0 : 1] ?? tr('غير معروفة', 'Unknown');
  };
  const publicationIssues = [
    detail.publicationReadiness?.eligible !== true
      ? tr('لم تثبت جاهزية النشر لدى المالك', 'Owner publication readiness is not confirmed')
      : null,
    detail.completeness.state !== 'COMPLETE'
      ? tr('البيانات غير مكتملة', 'Data is not complete')
      : null,
    scholarship.verificationStatus !== 'VERIFIED'
      ? tr('المصدر غير متحقق منه', 'Source is not verified')
      : null,
    detail.unresolvedLinks.length ? tr('علاقات غير محسومة', 'Unresolved references') : null,
    !scholarship.versions?.length ? tr('نسخة المالك مطلوبة', 'Owner version required') : null,
    !scholarship.sponsorContext ? tr('سياق الجهة المانحة مطلوب', 'Sponsor context required') : null,
    !scholarship.applicationCycles?.length
      ? tr('دورة تقديم مطلوبة', 'Application cycle required')
      : null,
    !(
      officialUrl?.startsWith('https:') ||
      scholarship.sourceEvidence?.some(
        (item) => item.isOfficial && scholarshipHttpUrl(item.sourceUrl)?.startsWith('https:'),
      )
    )
      ? tr('مصدر رسمي مشفر مطلوب', 'Official HTTPS evidence required')
      : null,
  ].filter((value): value is string => !!value);
  const tabNames: Record<TabKey, string> = {
    identity: tr('المعلومات الأساسية', 'Basics'),
    overview: tr('النبذة', 'Overview'),
    funding: tr('التمويل والمزايا', 'Funding'),
    degrees_majors: tr('الدرجات والتخصصات', 'Degrees and majors'),
    eligibility: tr('شروط الأهلية', 'Eligibility'),
    documents: tr('المستندات', 'Documents'),
    links_unis: tr('الروابط والمصادر', 'Links and sources'),
    notes: tr('الملاحظات', 'Notes'),
    health_audit: tr('الصحة والتدقيق', 'Health and audit'),
  };
  const missingFieldTabs: Record<string, TabKey> = {
    cleanedScholarshipName: 'identity',
    provider: 'identity',
    sourceUrl: 'links_unis',
    fundingType: 'funding',
    benefits: 'funding',
    countryOrScope: 'identity',
    degreeTargets: 'degrees_majors',
    eligibility: 'eligibility',
    requiredDocumentsOrTests: 'documents',
    deadlineMode: 'identity',
    officialSourceUrl: 'links_unis',
    description: 'overview',
  };
  const missingFieldLabels: Record<string, string> = {
    cleanedScholarshipName: tr('اسم المنحة', 'Scholarship name'),
    provider: tr('الجهة المانحة', 'Provider'),
    sourceUrl: tr('المصدر', 'Source'),
    fundingType: tr('نوع التمويل', 'Funding type'),
    benefits: tr('المزايا', 'Benefits'),
    countryOrScope: tr('الدولة أو النطاق', 'Country or scope'),
    degreeTargets: tr('الدرجات', 'Degrees'),
    eligibility: tr('الأهلية', 'Eligibility'),
    requiredDocumentsOrTests: tr('المستندات أو الاختبارات', 'Documents or tests'),
    deadlineMode: tr('الموعد', 'Deadline'),
    officialSourceUrl: tr('المصدر الرسمي', 'Official source'),
    description: tr('النبذة', 'Overview'),
  };
  const isFullFunding =
    form.isFullyFunded ||
    form.fundingTypeCode === 'FULLY_FUNDED' ||
    form.fundingTypeCode === 'FULL';

  const navTabs = [
    {
      key: 'identity' as TabKey,
      title: 'الهوية والمعلومات الأساسية',
      subtitle: 'الاسم، الجهة، بلد الدراسة، والمواعيد',
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      key: 'overview' as TabKey,
      title: 'نبذة تعريفية عن المنحة',
      subtitle: 'الوصف الكامل، الأهداف، ورؤية البرنامج',
      icon: <Info className="h-4 w-4" />,
      badge: 'مهم',
    },
    {
      key: 'funding' as TabKey,
      title: 'التمويل والمزايا المالية',
      subtitle: 'نوع التغطية، الرواتب، السكن، والتذاكر',
      icon: <Coins className="h-4 w-4" />,
    },
    {
      key: 'degrees_majors' as TabKey,
      title: 'الدرجات والتخصصات المشمولة',
      subtitle: 'الدرجات العلمية والتخصصات التابعة لكل درجة',
      icon: <GraduationCap className="h-4 w-4" />,
      badge: `${form.degreeTargets?.length ?? 0} درجات`,
    },
    {
      key: 'eligibility' as TabKey,
      title: 'شروط ومعايير الأهلية',
      subtitle: 'المعدل، العمر، الجنسية، واختبارات اللغة',
      icon: <CheckCheck className="h-4 w-4" />,
    },
    {
      key: 'documents' as TabKey,
      title: 'المستندات والأوراق المطلوبة',
      subtitle: 'الجواز، الشهادات، والتوصيات، وخطاب النية',
      icon: <FileText className="h-4 w-4" />,
    },
    {
      key: 'links_unis' as TabKey,
      title: 'روابط التقديم والمصادر الرسمية',
      subtitle: 'بوابة التقديم والجامعات الشريكة',
      icon: <ExternalLink className="h-4 w-4" />,
    },
    {
      key: 'notes' as TabKey,
      title: 'ملاحظات هامة وتوجيهات للطلاب',
      subtitle: 'نصائح القبول والمحاذير وإرشادات التقديم',
      icon: <Lightbulb className="h-4 w-4" />,
      badge: 'إرشادي',
    },
    {
      key: 'health_audit' as TabKey,
      title: 'صحة البيانات وسجل التدقيق',
      subtitle: 'حالة الاكتمال وسجل التغييرات',
      icon: <ShieldCheck className="h-4 w-4" />,
    },
  ];

  return (
    <div dir={dir} className="scholarship-detail space-y-5">
      {/* Top Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => navigate(adminPaths.scholarships)}
          className="inline-flex items-center gap-2 text-xs font-black text-[#0E7C86] hover:text-[#142B5F] transition-colors cursor-pointer bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl"
        >
          <ArrowIcon className="h-4 w-4" />
          <span>{lt('العودة إلى كتالوج المنح الدراسية')}</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">{lt('رمز المنحة:')}</span>
          <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono font-bold text-[#142B5F]">
            {scholarship.publicId || scholarship.id}
          </span>
        </div>
      </div>

      <header className="scholarship-detail-header">
        <div>
          <h1>{scholarship.localizedNames?.[language] || scholarship.displayName}</h1>
          <p>
            {tr('الحالة', 'Status')}: {statusLabel(scholarship.status)} ·{' '}
            {tr('النشر', 'Publication')}: {statusLabel(scholarship.publicationStatus)} ·{' '}
            {tr('التحقق', 'Verification')}: {statusLabel(scholarship.verificationStatus)}
          </p>
          <p>
            {scholarship.providerName || tr('جهة غير محددة', 'Provider unspecified')} ·{' '}
            {scholarship.countrySourceLabel || tr('بلد غير محدد', 'Country unspecified')} ·{' '}
            {scholarship.applicationDeadline
              ? new Date(scholarship.applicationDeadline).toLocaleDateString(language)
              : tr('موعد غير محدد', 'Deadline unspecified')}
          </p>
        </div>
        <div className="scholarship-detail-actions">
          {canEdit && !editing && (
            <button
              disabled={relationshipDirty}
              title={
                relationshipDirty
                  ? tr(
                      'احفظ العلاقات أو ألغِ تحريرها أولًا',
                      'Save or cancel relationship changes first',
                    )
                  : undefined
              }
              onClick={() => {
                setRelationshipEditing(false);
                setEditing(true);
              }}
            >
              <FileText />
              {tr('تعديل البيانات', 'Edit data')}
            </button>
          )}
          <button
            onClick={() =>
              document
                .getElementById('scholarship-decisions')
                ?.scrollIntoView({ behavior: 'smooth' })
            }
          >
            <ShieldCheck />
            {tr('المراجعة والنشر', 'Review and publication')}
          </button>
          {officialUrl && (
            <a href={officialUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink />
              {tr('المصدر الرسمي', 'Official source')}
            </a>
          )}
          {detail.publicHref && /^\/scholarships\/[^/?#]+$/.test(detail.publicHref) && (
            <a href={detail.publicHref} target="_blank" rel="noopener noreferrer">
              <ExternalLink aria-hidden="true" />
              {tr('فتح الصفحة العامة', 'Open public page')}
            </a>
          )}
        </div>
      </header>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="text-emerald-600 hover:text-emerald-800 text-sm cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}

      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 shadow-xs flex flex-wrap items-center gap-2"
        >
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{lt(error)}</span>
          <button
            disabled={saving || actionLoading}
            onClick={() =>
              guard(() => {
                setEditing(false);
                setRelationshipEditing(false);
                setRelationshipDirty(false);
                void load();
              })
            }
          >
            {tr('إعادة تحميل أحدث سجل', 'Reload latest record')}
          </button>
        </div>
      )}

      <nav
        className="scholarship-detail-tabs admin-section-navigation"
        role="tablist"
        aria-label={tr('تفاصيل المنحة', 'Scholarship sections')}
      >
        {navTabs.map((tab, index) => (
          <button
            type="button"
            role="tab"
            id={'scholarship-tab-' + tab.key}
            aria-controls="scholarship-content"
            aria-selected={activeTab === tab.key}
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            onKeyDown={(event) => {
              if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
              event.preventDefault();
              const next =
                event.key === 'Home'
                  ? 0
                  : event.key === 'End'
                    ? 8
                    : (index +
                        (event.key === 'ArrowRight' ? 1 : -1) * (dir === 'rtl' ? -1 : 1) +
                        9) %
                      9;
              setActiveTab(navTabs[next].key);
              document.getElementById('scholarship-tab-' + navTabs[next].key)?.focus();
            }}
          >
            {tab.icon}
            {tabNames[tab.key]}
          </button>
        ))}
      </nav>
      <div
        id="scholarship-content"
        role="tabpanel"
        aria-labelledby={'scholarship-tab-' + activeTab}
      >
        {activeTab === 'degrees_majors' && (
          <div className="scholarship-read-card">
            <p>
              {tr(
                'حفظ العلاقات مستقل عن حفظ بيانات المنحة.',
                'Relationships are saved separately from scholarship data.',
              )}
            </p>
            {canEdit && (
              <button
                disabled={saving || dirty}
                onClick={() => {
                  setEditing(false);
                  setRelationshipEditing(true);
                }}
              >
                {tr('تعديل الارتباطات', 'Edit relationships')}
              </button>
            )}
            {relationshipEditing && (
              <button
                onClick={() =>
                  guard(() => {
                    setRelationshipEditing(false);
                    setRelationshipDirty(false);
                  })
                }
              >
                {tr('إنهاء تحرير العلاقات', 'Finish relationship editing')}
              </button>
            )}
            {dirty && (
              <p role="status">
                {tr(
                  'احفظ تعديلات البيانات أو ألغها أولًا لتتمكن من تحرير العلاقات.',
                  'Save or cancel the content changes before editing relationships.',
                )}
              </p>
            )}
          </div>
        )}
        {relationshipEditing && (
          <div hidden={activeTab !== 'degrees_majors'}>
            <ScholarshipRelationshipEditorPage
              key={scholarship.id + ':' + scholarship.revision}
              embedded
              disabled={saving || dirty || !canEdit}
              onDirtyChange={setRelationshipDirty}
              onSaved={async () => {
                setRelationshipDirty(false);
                await load();
              }}
            />
          </div>
        )}
        {!editing &&
          activeTab !== 'health_audit' &&
          !(relationshipEditing && activeTab === 'degrees_majors') && (
            <ScholarshipDetailReadView
              scholarship={scholarship}
              tab={activeTab}
              language={language}
            />
          )}
        {/* Active Tab Content */}
        <main className="space-y-5">
          {(editing || activeTab === 'health_audit') && (
            <fieldset disabled={saving || actionLoading || !canEdit} className="contents">
              <p className="rounded-xl bg-teal-50 p-3 text-xs">
                {lt(
                  'الدرجات والتخصصات الجديدة تُحفظ للمراجعة. استخدم «إدارة العلاقات» لاختيار المراجع الفعلية؛ الروابط القائمة محفوظة دون تغيير.',
                )}
              </p>
              {(form.majorTargets ?? []).filter((item) => !item.metadata?.degreeTargetKey).length >
                0 && (
                <div className="rounded-xl border p-3 text-xs">
                  <p className="mb-2 font-bold">{lt('التخصصات المشتركة المحفوظة للمنحة')}</p>
                  {(form.majorTargets ?? [])
                    .filter((item) => !item.metadata?.degreeTargetKey)
                    .map((item) => (
                      <span
                        key={item.targetKey}
                        className="inline-block m-1 rounded-lg bg-slate-50 px-2 py-1"
                      >
                        {item.sourceLabel || item.targetKey}
                      </span>
                    ))}
                </div>
              )}
              {/* Tab 1: Identity & Basics */}
              {activeTab === 'identity' && (
                <div className="space-y-6">
                  <Card
                    title={lt('البيانات التعريفية وهوية المنحة')}
                    subtitle={lt(
                      'اسم المنحة الرسمي، الجهة المانحة، العام الأكاديمي، والموقع الجغرافي',
                    )}
                    icon={<Building2 className="h-5 w-5" />}
                  >
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="sm:col-span-2">
                        <Field label={lt('اسم المنحة الرسمي للعرض (Display Name)')}>
                          <Input
                            value={form.displayName}
                            onChange={(val) => setForm((x) => ({ ...x, displayName: val }))}
                            placeholder={lt('مثال: منحة الحكومة التركية الممولة بالكامل')}
                          />
                        </Field>
                      </div>

                      <Field label={lt('الجهة المانحة / الراعية (Provider / Sponsor)')}>
                        <Input
                          value={form.providerName}
                          onChange={(val) => setForm((x) => ({ ...x, providerName: val }))}
                          placeholder={lt('مثال: رئاسة أتراك المهجر (YTB)')}
                        />
                      </Field>

                      <Field label={lt('الدولة / بلد الدراسة (Study Country)')}>
                        <Input
                          value={form.countrySourceLabel}
                          onChange={(val) => setForm((x) => ({ ...x, countrySourceLabel: val }))}
                          placeholder={lt('مثال: تركيا، المملكة المتحدة، ألمانيا')}
                        />
                      </Field>

                      <Field label={lt('العام الأكاديمي (Academic Year)')}>
                        <Input
                          value={form.academicYear}
                          onChange={(val) => setForm((x) => ({ ...x, academicYear: val }))}
                          placeholder="2026/2027"
                        />
                      </Field>

                      <Field label={lt('الدورة / المرحلة (Cycle Name)')}>
                        <Input
                          value={form.cycleName}
                          onChange={(val) => setForm((x) => ({ ...x, cycleName: val }))}
                          placeholder={lt('دورة الخريف 2027')}
                        />
                      </Field>

                      <Field label={lt('لغة الدراسة (Study Language)')}>
                        <Input
                          value={form.studyLanguageSourceLabel}
                          onChange={(val) =>
                            setForm((x) => ({ ...x, studyLanguageSourceLabel: val }))
                          }
                          placeholder={lt('الإنجليزية / التركية / الألمانية')}
                        />
                      </Field>

                      <Field label={lt('الموعد النهائي للتقديم (Application Deadline)')}>
                        <Input
                          type="date"
                          value={dateInput(form.applicationDeadline)}
                          onChange={(val) =>
                            setForm((x) => ({
                              ...x,
                              applicationDeadline: val
                                ? new Date(`${val}T23:59:59.000Z`).toISOString()
                                : null,
                            }))
                          }
                        />
                      </Field>

                      <Field label={lt('نوع الموعد النهائي (Deadline Type)')}>
                        <select
                          value={asText(form.deadlineType)}
                          onChange={(e) => setForm((x) => ({ ...x, deadlineType: e.target.value }))}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#203442] outline-none transition focus:border-[#0E7C86] font-['Cairo']"
                        >
                          <option value="HARD_DEADLINE">
                            {lt('موعد نهائي صارم (Hard Deadline)')}
                          </option>
                          <option value="ROLLING">{lt('تقديم مستمر طوال العام (Rolling)')}</option>
                          <option value="STAGED">{lt('مراحل متعددة (Staged)')}</option>
                        </select>
                      </Field>

                      <Field label={lt('طريقة وآلية التقديم (Application Method)')}>
                        <Input
                          value={form.applicationMethod}
                          onChange={(val) => setForm((x) => ({ ...x, applicationMethod: val }))}
                          placeholder={lt('بوابة التقديم الإلكترونية الرسمية')}
                        />
                      </Field>
                    </div>
                  </Card>

                  <Card
                    title={lt('المعرفات القانونية والضبط')}
                    subtitle={lt('بيانات النظام والربط المعياري (للقراءة فقط)')}
                    icon={<Layers3 className="h-5 w-5" />}
                  >
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <Field label={lt('المعرف العام (Public ID)')}>
                        <Input value={scholarship.publicId} readOnly />
                      </Field>
                      <Field label={lt('الاسم القانوني المعياري')}>
                        <Input value={scholarship.canonicalName} readOnly />
                      </Field>
                      <Field label={lt('مفتاح منع التكرار (Dedupe Key)')}>
                        <Input value={scholarship.canonicalDedupKey} readOnly />
                      </Field>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 2: Overview & Summary */}
              {activeTab === 'overview' && (
                <div className="space-y-6">
                  <Card
                    title={lt('نبذة تعريفية شاملة عن المنحة (Scholarship Overview)')}
                    subtitle={lt('الوصف التعريفي الكامل، أهداف المنحة، ورسالة البرنامج الأكاديمي')}
                    icon={<Info className="h-5 w-5" />}
                  >
                    <div className="space-y-4">
                      <Field label={lt('الوصف العام والشامل للمنحة (Description)')}>
                        <Textarea
                          rows={6}
                          value={form.description}
                          onChange={(val) => setForm((x) => ({ ...x, description: val }))}
                          placeholder={lt(
                            'اكتب هنا نبذة مفصلة عن المنحة وتاريخها وأهم ما يميزها والجامعات التي تشملها...',
                          )}
                        />
                      </Field>

                      <div className="rounded-2xl bg-teal-50/60 border border-teal-200/80 p-4 text-xs space-y-2 text-[#142B5F]">
                        <div className="flex items-center gap-2 font-black text-[#0E7C86]">
                          <Sparkles className="h-4 w-4" />
                          <span>{lt('إرشادات صياغة النبذة:')}</span>
                        </div>
                        <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
                          <li>
                            {lt('وضّح أهمية المنحة والدولة المستضيفة والمستوى الأكاديمي للجامعات.')}
                          </li>
                          <li>
                            {lt(
                              'بيّن ما إذا كانت المنحة تشمل سنة تحضيرية لتعلم اللغة أو تتيح الدراسة باللغة الإنجليزية.',
                            )}
                          </li>
                          <li>
                            {lt(
                              'اذكر الفئات الأكثر حظاً في القبول والهدف التنموي أو الأكاديمي للمنحة.',
                            )}
                          </li>
                        </ul>
                      </div>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 3: Funding & Benefits */}
              {activeTab === 'funding' && (
                <div className="space-y-6">
                  <Card
                    title={lt('الحزمة المالية ونوع التغطية')}
                    subtitle={lt('تحديد نوع التمويل (كامل أو جزئي)، البدلات والرواتب')}
                    icon={<Coins className="h-5 w-5" />}
                  >
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                      <Field label={lt('نوع التمويل والتغطية')}>
                        <select
                          value={asText(form.fundingTypeCode)}
                          onChange={(e) => {
                            const val = e.target.value;
                            setForm((x) => ({
                              ...x,
                              fundingTypeCode: val,
                              isFullyFunded: val === 'FULLY_FUNDED' || val === 'FULL',
                            }));
                          }}
                          className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-[#142B5F] outline-none transition focus:border-[#0E7C86] font-['Cairo']"
                        >
                          <option value="FULLY_FUNDED">
                            {lt('تمويل كامل وفق الحقل (Fully Funded)')}
                          </option>
                          <option value="PARTIALLY_FUNDED">
                            {lt('تمويل جزئي (Partially Funded)')}
                          </option>
                          <option value="TUITION_ONLY">{lt('إعفاء من الرسوم الدراسية فقط')}</option>
                        </select>
                      </Field>

                      <Field label={lt('هل المنحة ممولة بالكامل؟')}>
                        <div
                          className={`flex h-11 items-center rounded-xl border px-3.5 text-xs font-black ${
                            isFullFunding
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-amber-200 bg-amber-50 text-amber-700'
                          }`}
                        >
                          {isFullFunding ? lt('✓ نعم - تمويل كامل وشامل') : lt('✗ لا - تمويل جزئي')}
                        </div>
                      </Field>

                      <Field label={lt('المبلغ التقديري أو الراتب (بالوحدات)')}>
                        <Input
                          value={form.amountMinorUnits}
                          onChange={(val) => setForm((x) => ({ ...x, amountMinorUnits: val }))}
                          placeholder={lt('مثال: 3500')}
                        />
                      </Field>

                      <Field label={lt('رمز العملة (Currency Code)')}>
                        <Input
                          value={form.amountCurrencyCode}
                          onChange={(val) => setForm((x) => ({ ...x, amountCurrencyCode: val }))}
                          placeholder="TRY, USD, EUR, GBP, SAR"
                        />
                      </Field>
                    </div>
                  </Card>

                  <Card
                    title={lt('قائمة المزايا والبدلات المغطاة (Benefits & Allowances)')}
                    subtitle={lt(
                      'الرسوم، السكن، التذاكر، التأمين الصحي، الراتب المعيشي، وتأشيرة السفر',
                    )}
                    icon={<Sparkles className="h-5 w-5" />}
                  >
                    <div className="space-y-3.5">
                      {benefits.map((item, index) => (
                        <div
                          key={item.benefitKey || index}
                          className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 p-4 transition hover:border-[#0E7C86]/40 hover:bg-white"
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1">
                              <Field label={lt('الميزة المالية المغطاة (اكتب نص الميزة مباشرة)')}>
                                <Input
                                  value={item.valueText}
                                  onChange={(val) => {
                                    const updated = benefits.map((b, i) =>
                                      i === index ? { ...b, valueText: val } : b,
                                    );
                                    setForm((x) => ({ ...x, benefits: updated }));
                                  }}
                                  placeholder={lt(
                                    'مثال: إعفاء كامل 100% من جميع الرسوم الدراسية / راتب شهري 1500 ليرة / سكن جامعي مجاني',
                                  )}
                                />
                              </Field>
                            </div>

                            <div className="flex items-center justify-end pt-1 sm:pt-4">
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = benefits.filter((_, i) => i !== index);
                                  setForm((x) => ({ ...x, benefits: updated }));
                                }}
                                className="inline-flex items-center gap-1 text-xs font-bold text-rose-600 hover:text-rose-800 p-2.5 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 transition cursor-pointer"
                                title={lt('حذف الميزة')}
                              >
                                <Trash2 className="h-4 w-4" />
                                <span>{lt('حذف')}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const benefitKey = nextKey('BENEFIT', benefits, 'benefitKey');
                          setForm((x) => ({
                            ...x,
                            benefits: [
                              ...benefits,
                              {
                                benefitKey,
                                benefitTypeCode: 'OTHER',
                                coverageTypeCode: 'FULL',
                                valueText: '',
                                displayOrder: benefits.length + 1,
                              },
                            ],
                          }));
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[#0E7C86] bg-teal-50/50 hover:bg-teal-50 px-5 py-3 text-xs font-black text-[#0E7C86] transition cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{lt('+ إضافة ميزة مالية جديدة (مربع نصي)')}</span>
                      </button>
                    </div>
                  </Card>
                </div>
              )}

              {/* One canonical editor serves the catalog and the existing relationship route. */}
              {/* Tab 5: Eligibility Criteria */}
              {activeTab === 'eligibility' && (
                <div className="space-y-6">
                  <Card
                    title={lt('معايير وشروط الأهلية والقبول (Eligibility Criteria)')}
                    subtitle={lt('المعدل الأكاديمي الأدنى، شروط السن، اختبارات اللغة، والجنسيات')}
                    icon={<CheckCheck className="h-5 w-5" />}
                  >
                    <div className="space-y-3.5">
                      {eligibility
                        .filter((item) => item.internationalTestId)
                        .map((item) => (
                          <p key={item.itemKey} className="text-xs text-slate-500">
                            {lt('مرجع الاختبار المعتمد:')}
                            {item.internationalTestId}
                          </p>
                        ))}
                      {eligibility.map((item, index) => (
                        <div
                          key={item.itemKey || index}
                          className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 p-4 transition hover:border-[#0E7C86]/40 hover:bg-white"
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1">
                              <Field label={lt('نص الشرط والمعيار بالأهلية (يكتب نصاً مباشرة)')}>
                                <Input
                                  value={item.valueText}
                                  onChange={(val) => {
                                    const updated = eligibility.map((row, i) =>
                                      i === index ? { ...row, valueText: val } : row,
                                    );
                                    setForm((x) => ({ ...x, eligibilityItems: updated }));
                                  }}
                                  placeholder={lt(
                                    'مثال: معدل تراكمي لا يقل عن 70% للبكالوريوس أو 75% للدراسات العليا / السن أقل من 21 سنة للبكالوريوس',
                                  )}
                                />
                              </Field>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-4">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isRequired !== false}
                                  onChange={(e) => {
                                    const updated = eligibility.map((row, i) =>
                                      i === index ? { ...row, isRequired: e.target.checked } : row,
                                    );
                                    setForm((x) => ({ ...x, eligibilityItems: updated }));
                                  }}
                                  className="rounded text-[#0E7C86] focus:ring-[#0E7C86]"
                                />
                                <span>{lt('شرط إلزامي')}</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = eligibility.filter((_, i) => i !== index);
                                  setForm((x) => ({ ...x, eligibilityItems: updated }));
                                }}
                                className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                                title={lt('حذف الشرط')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const itemKey = nextKey('ELIGIBILITY', eligibility, 'itemKey');
                          setForm((x) => ({
                            ...x,
                            eligibilityItems: [
                              ...eligibility,
                              {
                                itemKey,
                                itemTypeCode: 'GENERAL',
                                isRequired: true,
                                priorityOrder: eligibility.length + 1,
                                resolutionStatus: 'RESOLVED',
                                valueText: '',
                              },
                            ],
                          }));
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[#0E7C86] bg-teal-50/50 hover:bg-teal-50 px-5 py-3 text-xs font-black text-[#0E7C86] transition cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{lt('+ إضافة معيار أهلية جديد (مربع نصي)')}</span>
                      </button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 6: Required Documents */}
              {activeTab === 'identity' && !dirty && !relationshipDirty && (
                <ScholarshipReferenceLifecycleEditor
                  ownerId={scholarship.id}
                  onChanged={() => void load()}
                />
              )}
              {activeTab === 'documents' && (
                <div className="space-y-6">
                  <Card
                    title={lt('المستندات والوثائق المطلوبة للتقديم (Required Documents)')}
                    subtitle={lt('جواز السفر، الشهادات، خطابات التوصية، وخطاب الحافز')}
                    icon={<FileText className="h-5 w-5" />}
                  >
                    <div className="space-y-3.5">
                      {documents.map((item, index) => (
                        <div
                          key={item.documentKey || index}
                          className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 p-4 transition hover:border-[#0E7C86]/40 hover:bg-white"
                        >
                          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="flex-1">
                              <Field label={lt('اسم المستند والوثيقة المطلوبة (يكتب نصاً مباشرة)')}>
                                <Input
                                  value={item.displayName}
                                  onChange={(val) => {
                                    const updated = documents.map((doc, i) =>
                                      i === index ? { ...doc, displayName: val } : doc,
                                    );
                                    setForm((x) => ({ ...x, requiredDocumentItems: updated }));
                                  }}
                                  placeholder={lt(
                                    'مثال: جواز السفر ساري المفعول / شهادة الثانوية العامة وكشف الدرجات مترجم ومصدق',
                                  )}
                                />
                              </Field>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 pt-1 sm:pt-4">
                              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={item.isRequired !== false}
                                  onChange={(e) => {
                                    const updated = documents.map((doc, i) =>
                                      i === index ? { ...doc, isRequired: e.target.checked } : doc,
                                    );
                                    setForm((x) => ({ ...x, requiredDocumentItems: updated }));
                                  }}
                                  className="rounded text-[#0E7C86] focus:ring-[#0E7C86]"
                                />
                                <span>{lt('مستند إلزامي')}</span>
                              </label>

                              <button
                                type="button"
                                onClick={() => {
                                  const updated = documents.filter((_, i) => i !== index);
                                  setForm((x) => ({ ...x, requiredDocumentItems: updated }));
                                }}
                                className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                                title={lt('حذف المستند')}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}

                      <button
                        type="button"
                        onClick={() => {
                          const documentKey = nextKey('DOC', documents, 'documentKey');
                          setForm((x) => ({
                            ...x,
                            requiredDocumentItems: [
                              ...documents,
                              {
                                documentKey,
                                displayName: '',
                                documentTypeCode: 'OTHER',
                                isRequired: true,
                                displayOrder: documents.length + 1,
                                resolutionStatus: 'RESOLVED',
                              },
                            ],
                          }));
                        }}
                        className="inline-flex items-center gap-2 rounded-2xl border border-dashed border-[#0E7C86] bg-teal-50/50 hover:bg-teal-50 px-5 py-3 text-xs font-black text-[#0E7C86] transition cursor-pointer"
                      >
                        <Plus className="h-4 w-4" />
                        <span>{lt('+ إضافة وثيقة ومستند جديد (مربع نصي)')}</span>
                      </button>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 7: Links & Universities */}
              {activeTab === 'links_unis' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card
                    title={lt('روابط التقديم والمصادر الرسمية')}
                    subtitle={lt('بوابة التسجيل الإلكترونية والموقع الرسمي للجهة المانحة')}
                    icon={<ExternalLink className="h-5 w-5" />}
                  >
                    <div className="space-y-4">
                      <Field label={lt('رابط بوابة التقديم المباشرة (Application URL)')}>
                        <Input
                          value={form.applicationUrl}
                          onChange={(val) => setForm((x) => ({ ...x, applicationUrl: val }))}
                          placeholder="https://apply.scholarship.gov/portal"
                        />
                      </Field>

                      <Field label={lt('الموقع الرسمي للمنحة (Official Website)')}>
                        <Input
                          value={form.officialWebsite}
                          onChange={(val) => setForm((x) => ({ ...x, officialWebsite: val }))}
                          placeholder="https://www.scholarship.gov"
                        />
                      </Field>

                      <Field label={lt('رابط المصدر والإعلان المرجعي (Official Source URL)')}>
                        <Input
                          value={form.officialSourceUrl}
                          onChange={(val) => setForm((x) => ({ ...x, officialSourceUrl: val }))}
                          placeholder="https://www.scholarship.gov/announcements/2027"
                        />
                      </Field>

                      {scholarshipHttpUrl(form.applicationUrl) ? (
                        <div className="pt-2">
                          <a
                            href={scholarshipHttpUrl(form.applicationUrl) ?? undefined}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] px-4 py-2.5 text-xs font-bold text-white transition shadow-xs"
                          >
                            <ExternalLink className="h-4 w-4" />
                            <span>{lt('زيارة بوابة التقديم الرسمية الآن')}</span>
                          </a>
                        </div>
                      ) : (
                        <p>
                          {tr(
                            'لا توجد بوابة تقديم صالحة محفوظة.',
                            'No valid application portal saved.',
                          )}
                        </p>
                      )}
                    </div>
                  </Card>

                  <Card
                    title={lt('أدلة المصدر')}
                    subtitle={lt('سجل المصادر والتحقق المحفوظ للمنحة')}
                    icon={<ExternalLink className="h-5 w-5" />}
                  >
                    <div className="space-y-3">
                      {(scholarship.sourceEvidence ?? []).map((evidence) => (
                        <div
                          key={evidence.evidenceKey}
                          className="rounded-2xl border border-slate-200 p-4 text-sm"
                        >
                          <p className="font-bold">
                            {evidence.sourceName || evidence.sourceTypeCode}
                          </p>
                          <p className="break-all text-xs text-slate-600" dir="ltr">
                            {evidence.sourceUrl}
                          </p>
                          <p className="mt-2 text-xs">
                            {lt('الثقة:')}
                            {display(evidence.trustLevel)}
                            {lt('· التحقق:')} {display(evidence.verifiedAt)}
                          </p>
                        </div>
                      ))}
                      {!scholarship.sourceEvidence?.length && (
                        <p className="text-sm text-slate-500">
                          {lt('لا توجد أدلة مصدر محفوظة لهذه المنحة.')}
                        </p>
                      )}
                    </div>
                  </Card>

                  <Card
                    title={lt('الجامعات والبرامج الشريكة (University Links)')}
                    subtitle={lt('الجامعات التي تستضيف المنحة والبرامج الأكاديمية المتاحة')}
                    icon={<Landmark className="h-5 w-5" />}
                  >
                    <div className="space-y-3">
                      {(scholarship.universityLinks ?? []).map((item) => (
                        <div
                          key={item.linkKey}
                          className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 p-4 shadow-xs"
                        >
                          <div className="flex items-center gap-2 font-black text-[#142B5F] text-sm">
                            <Landmark className="h-4 w-4 text-[#0E7C86]" />
                            <span>{item.sourceLabel || item.linkKey}</span>
                          </div>
                          <div className="mt-2 text-xs text-slate-500">
                            {lt('معرف الجامعة:')}
                            {display(item.universityId)}
                            {lt('· البرنامج:')} {display(item.academicProgramId)}
                          </div>
                        </div>
                      ))}

                      {(!scholarship.universityLinks ||
                        scholarship.universityLinks.length === 0) && (
                        <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500 font-bold">
                          {lt('لا توجد جامعات أو برامج موثقة مرتبطة بهذه المنحة.')}
                        </div>
                      )}
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 8: Important Notes & Tips */}
              {activeTab === 'notes' && (
                <div className="space-y-6">
                  <Card
                    title={lt('ملاحظات وتوجيهات هامة للطلاب (Important Notes & Guidance)')}
                    subtitle={lt(
                      'تعليمات التقديم الخاصة، نصائح النجاح، المحاذير، وملاحظات الإدارة الداخلية',
                    )}
                    icon={<Lightbulb className="h-5 w-5" />}
                  >
                    <div className="space-y-4">
                      <Field label={lt('نص الملاحظات والتوجيهات العامة للطلاب (Important Notes)')}>
                        <Textarea
                          rows={6}
                          value={form.notes}
                          onChange={(val) => setForm((x) => ({ ...x, notes: val }))}
                          placeholder={lt(
                            'اكتب هنا التنبيهات الخاصة بالتقديم، مثل مجانية التقديم، متطلبات التوثيق، والمحاذير...',
                          )}
                        />
                      </Field>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tab 9: Data Health & Audit */}
              {activeTab === 'health_audit' && (
                <div className="grid gap-6 lg:grid-cols-2">
                  <Card
                    title={lt('مؤشرات اكتمال البيانات وصحة السجل')}
                    subtitle={lt('التحقق من تغطية جميع الحقول الإلزامية والربط المعياري')}
                    icon={<ShieldCheck className="h-5 w-5" />}
                  >
                    <div className="space-y-4">
                      <div
                        className={`flex items-center justify-between rounded-2xl border p-4 ${detail.completeness.state === 'COMPLETE' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-amber-50 border-amber-200 text-amber-900'}`}
                      >
                        <div className="flex items-center gap-2 font-bold text-xs">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                          <span>
                            {detail.completeness.state === 'COMPLETE'
                              ? lt('الحقول المطلوبة مكتملة')
                              : detail.completeness.state === 'NEEDS_REVIEW'
                                ? lt('تحتاج البيانات إلى مراجعة')
                                : lt('البيانات غير مكتملة')}
                          </span>
                        </div>
                        <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-black text-white">
                          {scholarship.status === 'PUBLISHED'
                            ? lt('منشورة')
                            : lt('جاهزية النشر تحددها بوابة المراجعة')}
                        </span>
                      </div>

                      <div>
                        <h4 className="mb-2 text-xs font-bold text-slate-700">
                          {lt('الحقول المفقودة أو الناقصة:')}
                        </h4>
                        {detail.completeness.missingFields.length ? (
                          <ul className="space-y-1 text-xs text-amber-800 font-bold">
                            {detail.completeness.missingFields.map((field) => (
                              <li key={field}>
                                {missingFieldTabs[field] ? (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const next = missingFieldTabs[field];
                                      setActiveTab(next);
                                      document.getElementById('scholarship-tab-' + next)?.focus();
                                    }}
                                  >
                                    {missingFieldLabels[field] ?? field} —{' '}
                                    {tr('فتح القسم', 'Open section')}
                                  </button>
                                ) : (
                                  field
                                )}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-xs text-emerald-700 font-bold">
                            {lt('✓ لا توجد أي حقول ناقصة، كافة بيانات المنحة مدخلة بالكامل.')}
                          </p>
                        )}
                      </div>
                    </div>
                  </Card>

                  <Card
                    title={lt('سجل العمليات والتدقيق (Audit Trail)')}
                    subtitle={lt('تاريخ التعديلات والأوامر التي طرأت على هذا السجل')}
                    icon={<History className="h-5 w-5" />}
                  >
                    {detail.historyLimit && (
                      <p className="mb-3 text-xs text-slate-500">
                        {t('audit_history_bounded').replace('{0}', String(detail.historyLimit))}
                      </p>
                    )}
                    {detail.historyHasMore && hasPermission('admin:audit:manage') && (
                      <AdminLink
                        className="mb-3 block text-xs underline"
                        to={`/audit?${new URLSearchParams({ targetId: scholarship.id, category: 'SCHOLARSHIPS_MUTATION' })}`}
                      >
                        {t('audit_open_full_history')}
                      </AdminLink>
                    )}
                    <div className="space-y-2.5">
                      {!detail.historyAvailable && (
                        <p className="text-xs text-amber-800">
                          {lt('سجل التدقيق غير متاح؛ لا يمكن إثبات التاريخ من هذه الشاشة.')}
                        </p>
                      )}
                      {detail.historyAvailable && !detail.history.length && (
                        <p className="text-xs text-slate-500">
                          {lt('لا توجد أحداث ضمن نافذة السجل المتاحة.')}
                        </p>
                      )}
                      {detail.history.map((event) => (
                        <div
                          key={event.id}
                          className="rounded-2xl border border-slate-200 p-3.5 text-xs bg-white"
                        >
                          <div className="flex items-center justify-between font-bold text-[#142B5F]">
                            <span>{event.action}</span>
                            <span className="text-slate-400 font-normal">
                              {new Date(event.timestamp).toLocaleString('ar-SA')}
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-slate-500 font-medium">
                            {lt('بواسطة:')}
                            {event.actorId} ({event.source})
                          </div>
                        </div>
                      ))}
                    </div>
                  </Card>
                </div>
              )}
            </fieldset>
          )}
        </main>
      </div>

      {editing && (
        <form
          className="scholarship-edit-bar"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          <label>
            {tr('سبب تعديل البيانات', 'Content edit reason')}
            <input
              value={reviewReason}
              onChange={(event) => setReviewReason(event.target.value)}
              minLength={3}
              maxLength={2000}
              required
            />
          </label>
          <span role="status">
            {dirty
              ? tr('تغييرات غير محفوظة', 'Unsaved changes')
              : tr('لا تغييرات جديدة', 'No new changes')}
          </span>
          <button type="submit" disabled={!dirty || saving || relationshipDirty || !canEdit}>
            <Save />
            {tr('حفظ بيانات المنحة', 'Save scholarship data')}
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() =>
              guard(() => {
                setForm(toUpdate(scholarship));
                setEditing(false);
              })
            }
          >
            {tr('إلغاء التعديل', 'Cancel editing')}
          </button>
        </form>
      )}
      {(activeTab === 'overview' || translationOpen) && (
        <div hidden={activeTab !== 'overview'} className="scholarship-read-card">
          <button
            disabled={dirty || relationshipDirty}
            onClick={() => setTranslationOpen((value) => !value)}
          >
            {tr('ترجمة الاسم والوصف', 'Translate name and description')}
          </button>
          {translationOpen && (
            <OwnerDescriptionTranslationPanel
              domain="SCHOLARSHIP"
              ownerId={scholarship.id}
              endpoint="/admin/scholarships"
              revision={scholarship.revision}
              uiLanguage={language}
              optionalFields={scholarship.optionalFields}
              status={scholarship.status}
              onSaved={async () => {
                await load();
              }}
            />
          )}
        </div>
      )}
      <section id="scholarship-decisions" className="scholarship-read-card">
        <h2>{tr('المراجعة والنشر', 'Review and publication')}</h2>
        <p>{publicationIssues.join(' · ')}</p>
        <div className="scholarship-detail-actions">
          {canManage && (
            <>
              <button
                disabled={
                  actionLoading ||
                  unsaved ||
                  scholarship.status === 'ARCHIVED' ||
                  scholarship.status === 'REJECTED' ||
                  scholarship.status === 'PUBLISHED' ||
                  detail.completeness.state === 'INCOMPLETE'
                }
                onClick={() =>
                  openConfirmModal(
                    'mark-ready',
                    tr('تأكيد الجاهزية للمراجعة', 'Confirm review readiness'),
                    tr(
                      'إرسال السجل لمسار المراجعة الحالي.',
                      'Submit to the existing review workflow.',
                    ),
                    tr('تأكيد', 'Confirm'),
                  )
                }
              >
                {tr('جاهز للمراجعة', 'Ready for review')}
              </button>
              <button
                disabled={
                  actionLoading ||
                  unsaved ||
                  scholarship.status !== 'READY_TO_REVIEW' ||
                  publicationIssues.length > 0
                }
                onClick={() =>
                  openConfirmModal(
                    'mark-publishable',
                    tr('اعتماد الجاهزية للنشر', 'Approve publication readiness'),
                    tr(
                      'يتحقق الخادم من جميع المراجع والنسخ.',
                      'The server verifies all references and versions.',
                    ),
                    tr('تأكيد', 'Confirm'),
                  )
                }
              >
                {tr('جاهز للنشر', 'Ready to publish')}
              </button>
              <button
                disabled={
                  actionLoading ||
                  unsaved ||
                  scholarship.status !== 'READY_TO_PUBLISH' ||
                  publicationIssues.length > 0
                }
                onClick={() =>
                  openConfirmModal(
                    'publish',
                    tr('تأكيد النشر', 'Confirm publication'),
                    tr(
                      'سيصبح المحتوى متاحًا وفق شروط العرض العام.',
                      'Content becomes public under the owner visibility rules.',
                    ),
                    tr('نشر', 'Publish'),
                  )
                }
              >
                {tr('نشر المنحة', 'Publish scholarship')}
              </button>
              <button
                disabled={actionLoading || unsaved || scholarship.publicationStatus !== 'PUBLISHED'}
                onClick={() =>
                  openConfirmModal(
                    'unpublish',
                    tr('تأكيد إلغاء النشر', 'Confirm unpublish'),
                    tr('إخفاء السجل من العرض العام.', 'Remove the record from public visibility.'),
                    tr('إلغاء النشر', 'Unpublish'),
                    'amber',
                  )
                }
              >
                {tr('إلغاء النشر', 'Unpublish')}
              </button>
              <button
                disabled={actionLoading || unsaved || scholarship.status === 'ARCHIVED'}
                onClick={() =>
                  openConfirmModal(
                    'archive',
                    tr('تأكيد الأرشفة', 'Confirm archive'),
                    tr(
                      'حفظ السجل في الأرشيف وفق عقد المالك.',
                      'Archive under the owner lifecycle contract.',
                    ),
                    tr('أرشفة', 'Archive'),
                    'rose',
                  )
                }
              >
                <Archive />
                {tr('أرشفة', 'Archive')}
              </button>
            </>
          )}
        </div>
        {unsaved && (
          <p>
            {tr(
              'احفظ التغييرات قبل قرارات المراجعة أو النشر.',
              'Save pending changes before review or publication decisions.',
            )}
          </p>
        )}
      </section>
      {pendingLeave && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 flex items-center justify-center p-4">
          <section
            role="dialog"
            data-scholarship-dialog
            tabIndex={-1}
            aria-modal="true"
            aria-label={tr('تغييرات غير محفوظة', 'Unsaved changes')}
            className="scholarship-read-card"
          >
            <h2>{tr('تغييرات غير محفوظة', 'Unsaved changes')}</h2>
            <p>
              {relationshipDirty
                ? tr(
                    'احفظ العلاقات من محرر العلاقات قبل المغادرة.',
                    'Save relationships in the relationship editor before leaving.',
                  )
                : tr(
                    'احفظ البيانات أو واصل التحرير أو غادر دون حفظ.',
                    'Save, continue editing, or leave without saving.',
                  )}
            </p>
            <div className="scholarship-detail-actions">
              <button onClick={() => setPendingLeave(null)}>
                {tr('متابعة التحرير', 'Continue editing')}
              </button>
              <button
                onClick={() => {
                  const leave = pendingLeave;
                  leaveApproved.current = true;
                  setPendingLeave(null);
                  leave();
                }}
              >
                {tr('مغادرة دون حفظ', 'Leave without saving')}
              </button>
              {!relationshipDirty && (
                <button
                  disabled={saving || reviewReason.trim().length < 3}
                  onClick={async () => {
                    if (await save()) {
                      const leave = pendingLeave;
                      leaveApproved.current = true;
                      setPendingLeave(null);
                      leave();
                    }
                  }}
                >
                  {tr('حفظ ثم مغادرة', 'Save and leave')}
                </button>
              )}
            </div>
          </section>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            aria-label={confirmModal.title}
            data-scholarship-dialog
            tabIndex={-1}
            className="w-full max-w-lg rounded-3xl border border-[#DDEFF2] bg-white p-6 sm:p-7 shadow-2xl space-y-5 font-['Cairo']"
          >
            <div className="flex items-start gap-4">
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${
                  confirmModal.variant === 'emerald'
                    ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    : confirmModal.variant === 'rose'
                      ? 'bg-rose-50 text-rose-600 border border-rose-200'
                      : 'bg-amber-50 text-amber-600 border border-amber-200'
                }`}
              >
                {confirmModal.variant === 'emerald' ? (
                  <Sparkles className="h-6 w-6" />
                ) : confirmModal.variant === 'rose' ? (
                  <Archive className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-[#142B5F]">{confirmModal.title}</h3>
                <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-600">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <label className="block">
              {tr('سبب القرار', 'Decision reason')}
              <input
                value={decisionReason}
                minLength={3}
                maxLength={2000}
                onChange={(event) => setDecisionReason(event.target.value)}
              />
            </label>
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                {lt('تراجع وإلغاء')}
              </button>

              <button
                type="button"
                disabled={decisionReason.trim().length < 3 || actionLoading || unsaved}
                onClick={() => void executeConfirmedAction()}
                className={`inline-flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition-all active:scale-95 cursor-pointer ${
                  confirmModal.variant === 'emerald'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : confirmModal.variant === 'rose'
                      ? 'bg-rose-600 hover:bg-rose-700'
                      : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                <Check className="h-4 w-4" />
                <span>{confirmModal.confirmText}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
