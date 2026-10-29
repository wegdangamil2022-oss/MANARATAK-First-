import { ScholarshipContentEditor } from '../features/scholarships/ScholarshipContentEditor';
import { scholarshipEditorValidation } from '../features/scholarships/ScholarshipEditorValidation';
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
  Lightbulb,
  Loader2,
  Save,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
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

function toUpdate(s: ScholarshipDto): ScholarshipCatalogUpdate {
  return {
    metadata: s.metadata ? structuredClone(s.metadata) : undefined,
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
  const [focusField, setFocusField] = useState<string>();
  const [relationshipEditing, setRelationshipEditing] = useState(false);
  const [relationshipDirty, setRelationshipDirty] = useState(false);
  const [criterionDirty, setCriterionDirty] = useState(false);
  const [translationOpen, setTranslationOpen] = useState(false);
  const [decisionReason, setDecisionReason] = useState('');
  const [pendingLeave, setPendingLeave] = useState<null | (() => void)>(null);
  const { hasPermission, permissions = [] } = useAdminAuthorization();
  const ArrowIcon = dir === 'rtl' ? ArrowRight : ArrowLeft;
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const canManage = hasPermission('admin:scholarships:manage');
  const scope = JSON.stringify([id, [...permissions].sort(), canManage]);
  const currentScope = useRef({ key: scope });
  if (currentScope.current.key !== scope) currentScope.current = { key: scope };
  const ownerEpoch = currentScope.current;
  const mounted = useRef(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const [activeTab, setActiveTab] = useState<TabKey>('identity');
  const [detail, setDetail] = useState<ScholarshipCatalogDetailResponse | null>(null);
  const [form, setForm] = useState<ScholarshipCatalogUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [readbackUncertain, setReadbackUncertain] = useState(false);
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
    async (
      expected?: ScholarshipDto,
      decision?: { status: string; publicationStatus?: string },
    ) => {
      if (!mounted.current || currentScope.current !== ownerEpoch || !canManage) return false;
      const request = ++loadRequest.current;
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const response = await scholarshipCatalogApi.detail(id);
        if (
          request !== loadRequest.current ||
          !mounted.current ||
          currentScope.current !== ownerEpoch
        )
          return false;
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
          if (
            decision &&
            (response.scholarship.status !== decision.status ||
              (decision.publicationStatus &&
                response.scholarship.publicationStatus !== decision.publicationStatus))
          )
            throw new Error('SCHOLARSHIP_DECISION_READBACK_MISMATCH');
          setDetail(response);
          setReadbackUncertain(false);
          const nextForm = toUpdate(response.scholarship);
          savedForm.current = JSON.stringify(nextForm);
          setForm(nextForm);
          return true;
        } else {
          setError('تعذر العثور على بيانات المنحة المطلوبة.');
        }
      } catch (err: unknown) {
        if (
          request === loadRequest.current &&
          mounted.current &&
          currentScope.current === ownerEpoch
        )
          setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات المنحة الدراسية.');
      } finally {
        if (
          request === loadRequest.current &&
          mounted.current &&
          currentScope.current === ownerEpoch
        )
          setLoading(false);
      }
      return false;
    },
    [id, ownerEpoch, canManage],
  );

  useEffect(() => {
    setDetail(null);
    setForm({});
    savedForm.current = '';
    setEditing(false);
    setRelationshipEditing(false);
    setRelationshipDirty(false);
    setTranslationOpen(false);
    setReviewReason('');
    setDecisionReason('');
    setPendingLeave(null);
    setSaving(false);
    setActionLoading(false);
    setReadbackUncertain(false);
    setMessage(null);
    setConfirmModal((previous) => ({ ...previous, isOpen: false, type: null }));
    void load();
    return () => {
      loadRequest.current += 1;
    };
  }, [load]);

  const dirty = !!detail && JSON.stringify(form) !== savedForm.current;
  const unsaved = dirty || relationshipDirty || criterionDirty;
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
  const save = async () => {
    const active = () => mounted.current && currentScope.current === ownerEpoch;
    if (
      !active() ||
      !canManage ||
      !id ||
      detail?.scholarship.id !== id ||
      loading ||
      saving ||
      readbackUncertain ||
      relationshipDirty
    )
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
    const validationError = scholarshipEditorValidation(form, language === 'ar');
    if (validationError) {
      setError(validationError);
      return false;
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
      if (!active()) return false;
      setReadbackUncertain(true);
      if (!(await load(updated)))
        throw new Error(
          tr(
            'نجح طلب الحفظ وتعذرت إعادة القراءة؛ تحقق من السجل قبل تكرار الحفظ.',
            'Save accepted but readback failed; verify the record before retrying.',
          ),
        );
      if (!active()) return false;
      setMessage(
        tr(
          'تم حفظ بيانات المنحة. العلاقات المرجعية تُحفظ بصورة مستقلة داخل تبويب العلاقات.',
          'Scholarship data saved. Canonical relationships are saved separately.',
        ),
      );
      return true;
    } catch (err: unknown) {
      if (active()) setError(err instanceof Error ? err.message : 'تعذر حفظ تعديلات المنحة.');
      return false;
    } finally {
      if (active()) setSaving(false);
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
    const active = () => mounted.current && currentScope.current === ownerEpoch;
    if (
      !active() ||
      !canManage ||
      !id ||
      detail?.scholarship.id !== id ||
      loading ||
      saving ||
      readbackUncertain ||
      actionLoading ||
      !confirmModal.type
    )
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
      if (!active()) return;
      const decisions = {
        'mark-ready': { status: 'READY_TO_REVIEW' },
        'mark-publishable': { status: 'READY_TO_PUBLISH' },
        publish: { status: 'PUBLISHED', publicationStatus: 'PUBLISHED' },
        unpublish: { status: 'READY_TO_REVIEW', publicationStatus: 'DRAFT' },
        archive: { status: 'ARCHIVED', publicationStatus: 'ARCHIVED' },
      };
      if (!(await load(undefined, decisions[command]))) {
        if (!active()) return;
        setDetail(null);
        throw new Error(
          tr(
            'قُبل طلب القرار وتعذرت إعادة قراءة حالته؛ أعد التحميل قبل تكراره.',
            'Decision accepted but readback failed; reload before retrying the decision.',
          ),
        );
      }
      if (!active()) return;
      setMessage(tr('تم تنفيذ القرار بنجاح.', 'The owner decision completed successfully.'));
    } catch (err: unknown) {
      if (active()) setError(err instanceof Error ? err.message : 'تعذر تنفيذ إجراء المنحة.');
    } finally {
      if (active()) setActionLoading(false);
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

  if (!canManage || !detail || !scholarship || scholarship.id !== id) {
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
        {canManage && (
          <button
            type="button"
            onClick={() => void load()}
            className="m-2 rounded-xl bg-[#0E7C86] px-4 py-2 text-xs text-white"
          >
            {tr('إعادة التحميل', 'Reload scholarship')}
          </button>
        )}
      </div>
    );
  }

  const canEdit =
    canManage &&
    !readbackUncertain &&
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
          {canEdit && !editing && activeTab !== 'eligibility' && (
            <button
              disabled={relationshipDirty || criterionDirty}
              title={
                relationshipDirty
                  ? tr(
                      'احفظ العلاقات أو ألغِ تحريرها أولًا',
                      'Save or cancel relationship changes first',
                    )
                  : undefined
              }
              onClick={() => {
                setRelationshipEditing(activeTab === 'degrees_majors');
                setEditing(activeTab !== 'degrees_majors');
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
            onClick={() =>
              criterionDirty
                ? guard(() => {
                    setCriterionDirty(false);
                    setActiveTab(tab.key);
                  })
                : setActiveTab(tab.key)
            }
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
              if (criterionDirty)
                guard(() => {
                  setCriterionDirty(false);
                  setActiveTab(navTabs[next].key);
                });
              else setActiveTab(navTabs[next].key);
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
              degreeOnly
              disabled={saving || dirty || !canEdit}
              onDirtyChange={setRelationshipDirty}
              onSaved={async () => {
                setRelationshipDirty(false);
                await load();
              }}
            />
          </div>
        )}
        {(!editing || activeTab === 'degrees_majors' || activeTab === 'eligibility') &&
          activeTab !== 'health_audit' &&
          !(relationshipEditing && activeTab === 'degrees_majors') && (
            <ScholarshipDetailReadView
              scholarship={scholarship}
              tab={activeTab}
              language={language}
              onCriterionDirtyChange={setCriterionDirty}
              onCriterionSaved={
                canEdit && !dirty && !relationshipDirty && !readbackUncertain
                  ? async (updated) => {
                      if (
                        !mounted.current ||
                        currentScope.current !== ownerEpoch ||
                        updated.id !== id
                      )
                        throw new Error('SCHOLARSHIP_OWNER_SCOPE_CHANGED');
                      setReadbackUncertain(true);
                      if (!(await load(updated)))
                        throw new Error('SCHOLARSHIP_CRITERION_READBACK_UNCERTAIN');
                    }
                  : undefined
              }
              onEdit={
                canEdit && !saving && !relationshipDirty && !dirty
                  ? (field) => {
                      if (field === 'educationalDegree' || activeTab === 'degrees_majors') {
                        setActiveTab('degrees_majors');
                        setRelationshipEditing(true);
                      } else {
                        setFocusField(field);
                        setEditing(true);
                      }
                    }
                  : undefined
              }
            />
          )}
        {/* Active Tab Content */}
        <main className="space-y-5">
          {(editing || activeTab === 'health_audit') && (
            <fieldset disabled={saving || actionLoading || !canEdit} className="contents">
              <ScholarshipContentEditor
                scholarship={scholarship}
                form={form}
                setForm={setForm}
                tab={activeTab}
                language={language}
                focusField={focusField}
                onRelationships={() =>
                  guard(() => {
                    setEditing(false);
                    setActiveTab('degrees_majors');
                    setRelationshipEditing(true);
                  })
                }
              />
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
              {activeTab === 'health_audit' && !dirty && !relationshipDirty && (
                <ScholarshipReferenceLifecycleEditor
                  ownerId={scholarship.id}
                  onChanged={() => void load()}
                />
              )}
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

      {editing && activeTab !== 'eligibility' && (
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
        <fieldset
          disabled={loading || saving || readbackUncertain}
          className="scholarship-detail-actions"
        >
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
        </fieldset>
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
