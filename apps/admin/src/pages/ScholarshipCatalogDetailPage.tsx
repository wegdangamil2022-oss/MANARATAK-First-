import type {
ScholarshipDegreeTargetDto,
ScholarshipDto,
ScholarshipMajorTargetDto
} from '@manaratak/domain';
import {
AlertCircle,
AlertTriangle,
Archive,
ArrowLeft,
ArrowRight,
BookOpen,
Building2,
Calendar,
Check,
CheckCheck,
CheckCircle2,
Coins,
ExternalLink,
FileText,
Globe2,
GraduationCap,
History,
Info,
Landmark,
Layers3,
Lightbulb,
Loader2,
Network,
Plus,
Save,
ShieldCheck,
Sparkles,
Trash2,
X
} from 'lucide-react';
import { useEffect,useMemo,useRef,useState,type ReactNode } from 'react';
import { Link,useNavigate,useParams } from 'react-router-dom';
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

// Hierarchical Degree & Majors structure for the UI
interface DegreeWithMajors {
  id: string;
  degreeLevel: string; // e.g. 'بكالوريوس' | 'ماجستير' | 'دكتوراه'
  customLabel?: string;
  majors: Array<{ targetKey: string; label: string }>;
}

const PRESET_DEGREE_OPTIONS = [
  { value: 'بكالوريوس', label: 'بكالوريوس (Undergraduate / Bachelor)', icon: '🎓' },
  { value: 'ماجستير', label: 'ماجستير (Master\'s Degree)', icon: '🎓' },
  { value: 'دكتوراه', label: 'دكتوراه (PhD / Doctorate)', icon: '🎓' },
  { value: 'دبلوم', label: 'دبلوم عالي / دبلوم متوسط (Diploma)', icon: '📜' },
  { value: 'زمالة', label: 'أبحاث وزمالة ما بعد الدكتوراه (Fellowship)', icon: '🔬' },
  { value: 'دورات مهنية', label: 'شهادات وتدريب مهني (Certificate)', icon: '💼' },
];

const POPULAR_MAJOR_SUGGESTIONS = [
  'علوم الحاسب وهندسة البرمجيات',
  'الذكاء الاصطناعي وتعلم الآلة',
  'الأمن السيبراني والشبكات',
  'الطب البشري والجراحة',
  'الصيدلة والعلوم الدوائية',
  'الهندسة المدنية والمعمارية',
  'إدارة الأعمال والتمويل',
  'الاقتصاد والعلوم المالية',
  'القانون الدولي والعام',
  'العلوم السياسية والعلاقات الدولية',
  'الطاقة المتجددة والبيئة',
  'اللغات والترجمة',
];

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

function nextKey(prefix: string, rows: Array<Record<string, unknown>>, keyName: string): string {
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
    applicationDeadline: s.applicationDeadline ? new Date(s.applicationDeadline).toISOString() : null,
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

function Card({ title, subtitle, icon, children }: { title: string; subtitle?: string; icon?: ReactNode; children: ReactNode }) {
  return (
    <section className="rounded-3xl border border-[#DDEFF2] bg-white p-6 shadow-xs">
      <div className="mb-5 flex items-center gap-3 border-b border-slate-100 pb-3.5">
        {icon && <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-50 text-[#0E7C86] border border-teal-100 shrink-0">{icon}</div>}
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
  const { dir, t } = useTranslation();
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

  // Hierarchical Degree & Majors State
  const [degreeGroups, setDegreeGroups] = useState<DegreeWithMajors[]>([]);
  const [majorInputs, setMajorInputs] = useState<Record<string, string>>({});

  // Confirmation modal
  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState>({
    isOpen: false,
    type: null,
    title: '',
    description: '',
    confirmText: '',
    variant: 'emerald',
  });

  // Convert flat degrees & majors to hierarchical degreeGroups
  const initDegreeGroups = (s: ScholarshipDto) => {
    const rawDegrees = s.degreeTargets ?? [];
    const rawMajors = s.majorTargets ?? [];

    if (rawDegrees.length === 0) { setDegreeGroups([]); return; }

    const groups: DegreeWithMajors[] = rawDegrees.map((d, index) => {
      const dLabel = d.sourceLabel || d.degreeLevel?.nameAr || d.degreeLevel?.nameEn || d.degreeLevelId || `درجة ${index + 1}`;
      let matchedDegree = dLabel;
      if (/بكالوريوس|bachelor|undergraduate/i.test(dLabel)) matchedDegree = 'بكالوريوس';
      if (dLabel.includes('ماجستير') || dLabel.toLowerCase().includes('master')) matchedDegree = 'ماجستير';
      else if (dLabel.includes('دكتوراه') || dLabel.toLowerCase().includes('phd') || dLabel.toLowerCase().includes('doctor')) matchedDegree = 'دكتوراه';
      else if (dLabel.includes('دبلوم') || dLabel.toLowerCase().includes('diploma')) matchedDegree = 'دبلوم';
      else if (dLabel.includes('زمالة') || dLabel.toLowerCase().includes('fellow')) matchedDegree = 'زمالة';

      // If majors exist, distribute or list them
      const majorsList = rawMajors.filter(m => m.metadata?.degreeTargetKey === d.targetKey).map(m => ({ targetKey: m.targetKey, label: m.sourceLabel || '' })).filter(m => m.label && m.targetKey);

      return {
        id: d.targetKey || `deg-${index + 1}`,
        degreeLevel: matchedDegree,
        customLabel: dLabel,
        majors: majorsList,
      };
    });

    setDegreeGroups(groups);
  };

  const savedForm = useRef('');
  const loadRequest = useRef(0);
  const load = async () => {
    const request = ++loadRequest.current;
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await scholarshipCatalogApi.detail(id);
      if (request !== loadRequest.current) return;
      if (response && response.scholarship) {
        setDetail(response);
        const nextForm = toUpdate(response.scholarship);
        savedForm.current = JSON.stringify(nextForm);
        setForm(nextForm);
        initDegreeGroups(response.scholarship);
      } else {
        setError('تعذر العثور على بيانات المنحة المطلوبة.');
      }
    } catch (err: unknown) {
      if (request === loadRequest.current) setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات المنحة الدراسية.');
    } finally {
      if (request === loadRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    void load();
    return () => { loadRequest.current += 1; };
  }, [id]);

  const scholarship = detail?.scholarship;
  const benefits = form.benefits ?? [];
  const eligibility = useMemo(
    () => [...(form.eligibilityItems ?? [])].sort((a, b) => Number(a.priorityOrder ?? 0) - Number(b.priorityOrder ?? 0)),
    [form.eligibilityItems],
  );
  const documents = useMemo(
    () => [...(form.requiredDocumentItems ?? [])].sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)),
    [form.requiredDocumentItems],
  );

  // Sync degreeGroups to form payload
  const syncDegreeGroupsToForm = (groups: DegreeWithMajors[]) => {
    const existingDegrees = form.degreeTargets ?? [];
    const existingMajors = form.majorTargets ?? [];
    const degreeTargets: ScholarshipDegreeTargetDto[] = groups.map(g => {
      const existing = existingDegrees.find(item => item.targetKey === g.id);
      return { ...existing, targetKey: g.id, sourceLabel: g.customLabel || g.degreeLevel,
        degreeLevelId: existing?.degreeLevelId ?? null,
        resolutionStatus: existing?.degreeLevelId ? existing.resolutionStatus : 'UNRESOLVED',
      };
    });
    // Keep ungrouped canonical targets intact; a label is never a canonical identifier.
    const allMajors: ScholarshipMajorTargetDto[] = existingMajors.filter(item => !item.metadata?.degreeTargetKey);
    groups.forEach(g => g.majors.forEach(major => {
      // Stable target keys, not mutable source labels, determine relationship identity.
      const existing = existingMajors.find(item => item.targetKey === major.targetKey);
      allMajors.push({ ...existing, targetKey: major.targetKey,
        sourceLabel: major.label, majorId: existing?.majorId ?? null,
        resolutionStatus: existing?.majorId ? existing.resolutionStatus : 'UNRESOLVED',
        metadata: { ...existing?.metadata, degreeTargetKey: g.id },
      });
    }));
    setForm(x => ({ ...x, degreeTargets, majorTargets: allMajors }));
  };

  // Add new degree level group
  const handleAddDegreeLevel = (degreeLevel: string) => {
    if (!degreeLevel) return;
    const newGroup: DegreeWithMajors = {
      id: `deg-${Date.now()}`,
      degreeLevel,
      customLabel: `${degreeLevel} (${degreeLevel === 'بكالوريوس' ? 'Bachelor' : degreeLevel === 'ماجستير' ? 'Master' : degreeLevel === 'دكتوراه' ? 'PhD' : 'Program'})`,
      majors: [],
    };
    const updated = [...degreeGroups, newGroup];
    setDegreeGroups(updated);
    syncDegreeGroupsToForm(updated);
  };

  // Remove entire degree level group
  const handleRemoveDegreeLevel = (groupId: string) => {
    const updated = degreeGroups.filter((g) => g.id !== groupId);
    setDegreeGroups(updated);
    syncDegreeGroupsToForm(updated);
  };

  // Add major to a specific degree level
  const handleAddMajorToDegree = (groupId: string, majorName?: string) => {
    const nameToAdd = (majorName || majorInputs[groupId] || '').trim();
    if (!nameToAdd) return;

    const updated = degreeGroups.map((g) => {
      if (g.id === groupId) {
        if (g.majors.map(item => item.label).includes(nameToAdd)) return g;
        return {
          ...g,
          majors: [...g.majors, { targetKey: `major-${crypto.randomUUID()}`, label: nameToAdd }],
        };
      }
      return g;
    });

    setDegreeGroups(updated);
    syncDegreeGroupsToForm(updated);
    setMajorInputs((prev) => ({ ...prev, [groupId]: '' }));
  };

  // Remove a major from a specific degree level
  const handleRemoveMajorFromDegree = (groupId: string, majorIndex: number) => {
    const updated = degreeGroups.map((g) => {
      if (g.id === groupId) {
        return {
          ...g,
          majors: g.majors.filter((_, idx) => idx !== majorIndex),
        };
      }
      return g;
    });

    setDegreeGroups(updated);
    syncDegreeGroupsToForm(updated);
  };

  const save = async () => {
    if (!id) return;
    if (reviewReason.trim().length < 3) { setError('أدخل سبب التعديل للمراجعة (3 أحرف على الأقل).'); return; }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await scholarshipCatalogApi.update(id, form, reviewReason.trim());
      setMessage('تم حفظ كافة تعديلات المنحة والدرجات والتخصصات بنجاح.');
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر حفظ تعديلات المنحة.');
    } finally {
      setSaving(false);
    }
  };

  const openConfirmModal = (
    type: 'publish' | 'unpublish' | 'archive' | 'mark-publishable' | 'mark-ready',
    title: string,
    description: string,
    confirmText: string,
    variant: 'emerald' | 'amber' | 'rose' | 'teal' = 'emerald'
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
    if (!id || !confirmModal.type) return;
    if (reviewReason.trim().length < 3) { setError('أدخل سبب القرار للمراجعة (3 أحرف على الأقل).'); return; }
    const command = confirmModal.type;
    setConfirmModal(prev => ({ ...prev, isOpen: false }));
    setActionLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (['publish', 'mark-publishable', 'mark-ready'].includes(command) && JSON.stringify(form) !== savedForm.current) throw new Error('احفظ التعديلات قبل تغيير حالة النشر.');
      await scholarshipCatalogApi.command(id, command, reviewReason.trim());
      setMessage(`تم تنفيذ الأمر (${command}) بنجاح.`);
      await load();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'تعذر تنفيذ إجراء المنحة.');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && !detail) {
    return (
      <div className="flex h-96 flex-col items-center justify-center gap-3 rounded-3xl border border-[#DDEFF2] bg-white p-8">
        <Loader2 className="h-10 w-10 animate-spin text-[#0E7C86]" />
        <p className="text-xs font-bold text-slate-500 font-['Cairo']">جارٍ تحميل بيانات المنحة الدراسية وتفاصيلها الكاملة...</p>
      </div>
    );
  }

  if (!detail || !scholarship) {
    return (
      <div className="rounded-3xl border border-rose-200 bg-rose-50 p-6 text-rose-700 font-['Cairo']">
        <div className="flex items-center gap-3">
          <AlertCircle className="h-6 w-6 text-rose-600" />
          <h2 className="text-base font-bold">{error ?? 'لم يتم العثور على المنحة الدراسية المطلوبة.'}</h2>
        </div>
        <button
          onClick={() => navigate('/admin/scholarships')}
          className="mt-4 inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2 text-xs font-bold text-slate-700 shadow-xs border border-slate-200"
        >
          <ArrowIcon className="h-4 w-4" />
          <span>العودة لقائمة المنح الدراسية</span>
        </button>
      </div>
    );
  }

  const isFullFunding = form.isFullyFunded || form.fundingTypeCode === 'FULLY_FUNDED' || form.fundingTypeCode === 'FULL';

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
      badge: `${degreeGroups.length} درجات`,
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
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6 font-['Cairo',sans-serif] text-[#203442]">
      {/* Top Breadcrumb */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={() => navigate('/admin/scholarships')}
          className="inline-flex items-center gap-2 text-xs font-black text-[#0E7C86] hover:text-[#142B5F] transition-colors cursor-pointer bg-teal-50 hover:bg-teal-100 border border-teal-200 px-3.5 py-2 rounded-xl"
        >
          <ArrowIcon className="h-4 w-4" />
          <span>العودة إلى كتالوج المنح الدراسية</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-slate-500">رمز المنحة:</span>
          <span className="rounded-lg bg-slate-100 border border-slate-200 px-2.5 py-1 text-xs font-mono font-bold text-[#142B5F]">
            {scholarship.publicId || scholarship.id}
          </span>
        </div>
      </div>

      {/* Hero Header Banner */}
      <header className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-24 end-0 h-64 w-64 rounded-full bg-[#F2CD78] opacity-20 pointer-events-none blur-3xl" />
        <div className="absolute -bottom-24 start-0 h-64 w-64 rounded-full bg-cyan-300 opacity-20 pointer-events-none blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-md">
                <GraduationCap className="h-4 w-4" />
                <span>الكتالوج الأكاديمي المعتمد</span>
              </span>

              <span className={`inline-flex items-center rounded-full px-3 py-0.5 text-xs font-black backdrop-blur-md ${
                scholarship.status === 'PUBLISHED'
                  ? 'bg-emerald-500/25 border border-emerald-300/40 text-emerald-100'
                  : scholarship.status === 'READY_TO_PUBLISH'
                  ? 'bg-cyan-500/25 border border-cyan-300/40 text-cyan-100'
                  : 'bg-amber-500/25 border border-amber-300/40 text-amber-100'
              }`}>
                ● {scholarship.status === 'PUBLISHED' ? 'منشورة للطلاب' : scholarship.status === 'READY_TO_PUBLISH' ? 'جاهزة للنشر' : 'قيد المراجعة'}
              </span>

              {isFullFunding && (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-300/30 px-3 py-0.5 text-xs font-black text-emerald-200">
                  <Coins className="h-3.5 w-3.5" />
                  <span>تمويل كامل 100% 💎</span>
                </span>
              )}
            </div>

            <h1 className="text-2xl font-black tracking-tight sm:text-3xl text-white">
              {form.displayName || scholarship.localizedNames?.ar || scholarship.displayName}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#DDEFF2]">
              <span className="flex items-center gap-1.5">
                <Building2 className="h-4 w-4 text-[#F2CD78]" />
                <span>{form.providerName || scholarship.providerName || 'الجهة المانحة الرسمية'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Globe2 className="h-4 w-4 text-cyan-300" />
                <span>{form.countrySourceLabel || scholarship.countrySourceLabel || 'دولي'}</span>
              </span>
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4 text-amber-300" />
                <span>
                  الموعد النهائي:{' '}
                  {form.applicationDeadline
                    ? new Date(form.applicationDeadline).toLocaleDateString('ar-SA')
                    : 'مفتوحة طوال العام'}
                </span>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <input aria-label="سبب تعديل المنحة أو قرار النشر" title="سبب التعديل (إلزامي للتدقيق)" placeholder="سبب التعديل / النشر" value={reviewReason} onChange={event => setReviewReason(event.target.value)} className="min-h-11 w-48 rounded-xl border border-white/30 bg-white px-3 text-xs text-[#142B5F]" />
            <button
              disabled={saving}
              type="button"
              onClick={() => void save()}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#F2CD78] hover:bg-[#E5BE60] px-5 text-xs font-black text-[#142B5F] shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin text-[#142B5F]" /> : <Save className="h-4 w-4 text-[#142B5F]" />}
              <span>حفظ التعديلات</span>
            </button>

            <Link
              to={`/admin/scholarships/${id}/relationships`}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              <Network className="h-4 w-4 text-cyan-200" />
              <span>الروابط والجامعات</span>
            </Link>

            {scholarship.status !== 'PUBLISHED' && (
              <button
                disabled={actionLoading}
                onClick={() =>
                  openConfirmModal(
                    'publish',
                    'تأكيد نشر المنحة الدراسية',
                    'هل توافق على نشر هذه المنحة للعامة وللطلاب على المنصة؟ سيتمكن جميع الطلاب من الاطلاع على تفاصيلها والتقديم عليها.',
                    'نعم، أوافق على النشر الآن',
                    'emerald'
                  )
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 px-4 text-xs font-black text-white shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                <span>نشر المنحة</span>
              </button>
            )}

            {scholarship.status === 'PUBLISHED' && (
              <button
                disabled={actionLoading}
                onClick={() =>
                  openConfirmModal(
                    'unpublish',
                    'تأكيد إلغاء نشر المنحة',
                    'هل توافق على إلغاء نشر هذه المنحة؟ سيتم إخفاؤها عن واجهة الطلاب العامة وتحويلها إلى مسودة داخلية.',
                    'نعم، إلغاء النشر',
                    'amber'
                  )
                }
                className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-amber-600/90 hover:bg-amber-700 px-4 text-xs font-black text-white transition-all active:scale-95 cursor-pointer"
              >
                <span>إلغاء النشر</span>
              </button>
            )}

            <button
              disabled={actionLoading}
              onClick={() =>
                openConfirmModal(
                  'archive',
                  'تأكيد أرشفة / حذف المنحة',
                  'هل توافق على أرشفة هذه المنحة الدراسية وإخراجها من الكتالوج النشط؟ يمكنك استعادتها لاحقاً من سجل الأرشيف.',
                  'نعم، أوافق على الأرشفة',
                  'rose'
                )
              }
              className="inline-flex min-h-11 items-center gap-1 rounded-xl border border-white/20 bg-white/10 px-3.5 text-xs font-bold text-white transition-all hover:bg-rose-600/80 cursor-pointer"
              title="أرشفة السجل"
            >
              <Archive className="h-4 w-4" />
              <span>أرشفة</span>
            </button>
          </div>
        </div>
      </header>

      {message && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-bold text-emerald-800 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
            <span>{message}</span>
          </div>
          <button onClick={() => setMessage(null)} className="text-emerald-600 hover:text-emerald-800 text-sm cursor-pointer">✕</button>
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-800 shadow-xs flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Content Layout: Vertical Tab Menu (Right) + Active Section (Left) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Vertical Tab Navigation Menu */}
        <aside className="lg:col-span-4 xl:col-span-3 space-y-2 sticky top-4">
          <div className="rounded-3xl border border-[#DDEFF2] bg-white p-3 shadow-xs space-y-1.5">
            <div className="px-3 py-2 border-b border-slate-100 text-xs font-black text-[#142B5F] flex items-center justify-between">
              <span>أقسام تفاصيل المنحة</span>
              <span className="text-[10px] font-bold text-slate-400">9 أقسام</span>
            </div>

            {navTabs.map((tab, idx) => {
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-start gap-3 rounded-2xl p-3 text-start transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#142B5F] text-white shadow-md'
                      : 'hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-xl shrink-0 mt-0.5 ${
                    isActive ? 'bg-white/15 text-[#F2CD78]' : 'bg-teal-50 text-[#0E7C86]'
                  }`}>
                    {tab.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className={`text-xs font-bold truncate ${isActive ? 'text-white' : 'text-[#142B5F]'}`}>
                        {idx + 1}. {tab.title}
                      </span>
                      {tab.badge && (
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-md shrink-0 ${
                          isActive ? 'bg-[#F2CD78] text-[#142B5F]' : 'bg-teal-50 text-[#0E7C86]'
                        }`}>
                          {tab.badge}
                        </span>
                      )}
                    </div>
                    <p className={`text-[11px] truncate mt-0.5 ${isActive ? 'text-[#DDEFF2]' : 'text-slate-400'}`}>
                      {tab.subtitle}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="rounded-3xl border border-[#DDEFF2] bg-[#FAF7F0]/60 p-4 text-xs space-y-2">
            <div className="flex items-center justify-between font-bold text-[#142B5F]">
              <span>اكتمال البيانات</span>
              <span className="text-emerald-700 font-black">100% مكتمل</span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div className="bg-[#0E7C86] h-1.5 rounded-full w-full" />
            </div>
            <p className="text-[11px] text-slate-500">
              جميع الحقول الأساسية ومعايير الأهلية والمزايا مدخلة بشكل صحيح.
            </p>
          </div>
        </aside>

        {/* Active Tab Content */}
        <main className="lg:col-span-8 xl:col-span-9 space-y-6"><fieldset disabled={saving || actionLoading} className="contents">
          <p className="rounded-xl bg-teal-50 p-3 text-xs">الدرجات والتخصصات الجديدة تُحفظ للمراجعة. استخدم «إدارة العلاقات» لاختيار المراجع الفعلية؛ الروابط القائمة محفوظة دون تغيير.</p>
          {(form.majorTargets ?? []).filter(item => !item.metadata?.degreeTargetKey).length > 0 && <div className="rounded-xl border p-3 text-xs"><p className="mb-2 font-bold">التخصصات المشتركة المحفوظة للمنحة</p>{(form.majorTargets ?? []).filter(item => !item.metadata?.degreeTargetKey).map(item => <span key={item.targetKey} className="inline-block m-1 rounded-lg bg-slate-50 px-2 py-1">{item.sourceLabel || item.targetKey}</span>)}</div>}
          {/* Tab 1: Identity & Basics */}
          {activeTab === 'identity' && (
            <div className="space-y-6">
              <Card
                title="البيانات التعريفية وهوية المنحة"
                subtitle="اسم المنحة الرسمي، الجهة المانحة، العام الأكاديمي، والموقع الجغرافي"
                icon={<Building2 className="h-5 w-5" />}
              >
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="اسم المنحة الرسمي للعرض (Display Name)">
                      <Input
                        value={form.displayName}
                        onChange={(val) => setForm((x) => ({ ...x, displayName: val }))}
                        placeholder="مثال: منحة الحكومة التركية الممولة بالكامل"
                      />
                    </Field>
                  </div>

                  <Field label="الجهة المانحة / الراعية (Provider / Sponsor)">
                    <Input
                      value={form.providerName}
                      onChange={(val) => setForm((x) => ({ ...x, providerName: val }))}
                      placeholder="مثال: رئاسة أتراك المهجر (YTB)"
                    />
                  </Field>

                  <Field label="الدولة / بلد الدراسة (Study Country)">
                    <Input
                      value={form.countrySourceLabel}
                      onChange={(val) => setForm((x) => ({ ...x, countrySourceLabel: val }))}
                      placeholder="مثال: تركيا، المملكة المتحدة، ألمانيا"
                    />
                  </Field>

                  <Field label="العام الأكاديمي (Academic Year)">
                    <Input
                      value={form.academicYear}
                      onChange={(val) => setForm((x) => ({ ...x, academicYear: val }))}
                      placeholder="2026/2027"
                    />
                  </Field>

                  <Field label="الدورة / المرحلة (Cycle Name)">
                    <Input
                      value={form.cycleName}
                      onChange={(val) => setForm((x) => ({ ...x, cycleName: val }))}
                      placeholder="دورة الخريف 2027"
                    />
                  </Field>

                  <Field label="لغة الدراسة (Study Language)">
                    <Input
                      value={form.studyLanguageSourceLabel}
                      onChange={(val) => setForm((x) => ({ ...x, studyLanguageSourceLabel: val }))}
                      placeholder="الإنجليزية / التركية / الألمانية"
                    />
                  </Field>

                  <Field label="الموعد النهائي للتقديم (Application Deadline)">
                    <Input
                      type="date"
                      value={dateInput(form.applicationDeadline)}
                      onChange={(val) =>
                        setForm((x) => ({
                          ...x,
                          applicationDeadline: val ? new Date(`${val}T23:59:59.000Z`).toISOString() : null,
                        }))
                      }
                    />
                  </Field>

                  <Field label="نوع الموعد النهائي (Deadline Type)">
                    <select
                      value={asText(form.deadlineType)}
                      onChange={(e) => setForm((x) => ({ ...x, deadlineType: e.target.value }))}
                      className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-medium text-[#203442] outline-none transition focus:border-[#0E7C86] font-['Cairo']"
                    >
                      <option value="HARD_DEADLINE">موعد نهائي صارم (Hard Deadline)</option>
                      <option value="ROLLING">تقديم مستمر طوال العام (Rolling)</option>
                      <option value="STAGED">مراحل متعددة (Staged)</option>
                    </select>
                  </Field>

                  <Field label="طريقة وآلية التقديم (Application Method)">
                    <Input
                      value={form.applicationMethod}
                      onChange={(val) => setForm((x) => ({ ...x, applicationMethod: val }))}
                      placeholder="بوابة التقديم الإلكترونية الرسمية"
                    />
                  </Field>
                </div>
              </Card>

              <Card
                title="المعرفات القانونية والضبط"
                subtitle="بيانات النظام والربط المعياري (للقراءة فقط)"
                icon={<Layers3 className="h-5 w-5" />}
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="المعرف العام (Public ID)">
                    <Input value={scholarship.publicId} readOnly />
                  </Field>
                  <Field label="الاسم القانوني المعياري">
                    <Input value={scholarship.canonicalName} readOnly />
                  </Field>
                  <Field label="مفتاح منع التكرار (Dedupe Key)">
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
                title="نبذة تعريفية شاملة عن المنحة (Scholarship Overview)"
                subtitle="الوصف التعريفي الكامل، أهداف المنحة، ورسالة البرنامج الأكاديمي"
                icon={<Info className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <Field label="الوصف العام والشامل للمنحة (Description)">
                    <Textarea
                      rows={6}
                      value={form.description}
                      onChange={(val) => setForm((x) => ({ ...x, description: val }))}
                      placeholder="اكتب هنا نبذة مفصلة عن المنحة وتاريخها وأهم ما يميزها والجامعات التي تشملها..."
                    />
                  </Field>

                  <div className="rounded-2xl bg-teal-50/60 border border-teal-200/80 p-4 text-xs space-y-2 text-[#142B5F]">
                    <div className="flex items-center gap-2 font-black text-[#0E7C86]">
                      <Sparkles className="h-4 w-4" />
                      <span>إرشادات صياغة النبذة:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-slate-600 font-medium">
                      <li>وضّح أهمية المنحة والدولة المستضيفة والمستوى الأكاديمي للجامعات.</li>
                      <li>بيّن ما إذا كانت المنحة تشمل سنة تحضيرية لتعلم اللغة أو تتيح الدراسة باللغة الإنجليزية.</li>
                      <li>اذكر الفئات الأكثر حظاً في القبول والهدف التنموي أو الأكاديمي للمنحة.</li>
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
                title="الحزمة المالية ونوع التغطية"
                subtitle="تحديد نوع التمويل (كامل 100% أو جزئي)، البدلات والرواتب"
                icon={<Coins className="h-5 w-5" />}
              >
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Field label="نوع التمويل والتغطية">
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
                      <option value="FULLY_FUNDED">تمويل كامل 100% (Fully Funded)</option>
                      <option value="PARTIALLY_FUNDED">تمويل جزئي (Partially Funded)</option>
                      <option value="TUITION_ONLY">إعفاء من الرسوم الدراسية فقط</option>
                    </select>
                  </Field>

                  <Field label="هل المنحة ممولة بالكامل؟">
                    <div className={`flex h-11 items-center rounded-xl border px-3.5 text-xs font-black ${
                      isFullFunding ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'
                    }`}>
                      {isFullFunding ? '✓ نعم - تمويل كامل وشامل' : '✗ لا - تمويل جزئي'}
                    </div>
                  </Field>

                  <Field label="المبلغ التقديري أو الراتب (بالوحدات)">
                    <Input
                      value={form.amountMinorUnits}
                      onChange={(val) => setForm((x) => ({ ...x, amountMinorUnits: val }))}
                      placeholder="مثال: 3500"
                    />
                  </Field>

                  <Field label="رمز العملة (Currency Code)">
                    <Input
                      value={form.amountCurrencyCode}
                      onChange={(val) => setForm((x) => ({ ...x, amountCurrencyCode: val }))}
                      placeholder="TRY, USD, EUR, GBP, SAR"
                    />
                  </Field>
                </div>
              </Card>

              <Card
                title="قائمة المزايا والبدلات المغطاة (Benefits & Allowances)"
                subtitle="الرسوم، السكن، التذاكر، التأمين الصحي، الراتب المعيشي، وتأشيرة السفر"
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
                          <Field label="الميزة المالية المغطاة (اكتب نص الميزة مباشرة)">
                            <Input
                              value={item.valueText}
                              onChange={(val) => {
                                const updated = benefits.map((b, i) =>
                                  i === index ? { ...b, valueText: val } : b
                                );
                                setForm((x) => ({ ...x, benefits: updated }));
                              }}
                              placeholder="مثال: إعفاء كامل 100% من جميع الرسوم الدراسية / راتب شهري 1500 ليرة / سكن جامعي مجاني"
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
                            title="حذف الميزة"
                          >
                            <Trash2 className="h-4 w-4" />
                            <span>حذف</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}

                  <button
                    type="button"
                    onClick={() => {
                      const benefitKey = nextKey('BENEFIT', benefits as any, 'benefitKey');
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
                    <span>+ إضافة ميزة مالية جديدة (مربع نصي)</span>
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 4: Degrees & Target Majors - Hierarchical by Degree Level */}
          {activeTab === 'degrees_majors' && (
            <div className="space-y-6">
              {/* Header Box with Quick Add Degree Buttons */}
              <div className="rounded-3xl border border-[#DDEFF2] bg-gradient-to-r from-teal-50/70 via-white to-blue-50/50 p-6 shadow-xs space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <h3 className="text-base font-black text-[#142B5F] flex items-center gap-2">
                      <GraduationCap className="h-5 w-5 text-[#0E7C86]" />
                      <span>إدارة الدرجات العلمية والتخصصات المتاحة</span>
                    </h3>
                    <p className="text-xs text-slate-500 mt-1">
                      اختر الدرجة العلمية (بكالوريوس، ماجستير، دكتوراه...) لتظهر خانة إضافة التخصصات التابعة لها مباشرة ومصنفة تحتها.
                    </p>
                  </div>

                  {/* Direct Save Button */}
                  <button
                    type="button"
                    onClick={save}
                    disabled={saving}
                    className="inline-flex items-center gap-2 rounded-2xl bg-[#0E7C86] hover:bg-[#142B5F] text-white px-5 py-2.5 text-xs font-black shadow-xs transition cursor-pointer shrink-0"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    <span>حفظ الدرجات والتخصصات</span>
                  </button>
                </div>

                {/* Quick Add Degree Buttons */}
                <div className="pt-2 border-t border-slate-200/60">
                  <span className="block text-[11px] font-black text-slate-500 mb-2">اضغط لإضافة درجة علمية جديدة إلى المنحة:</span>
                  <div className="flex flex-wrap gap-2">
                    {PRESET_DEGREE_OPTIONS.map((opt) => {
                      const alreadyAdded = degreeGroups.some((g) => g.degreeLevel === opt.value);
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => handleAddDegreeLevel(opt.value)}
                          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition shadow-2xs cursor-pointer ${
                            alreadyAdded
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 ring-1 ring-emerald-400/30'
                              : 'bg-white hover:bg-teal-50 text-[#142B5F] hover:text-[#0E7C86] border border-slate-200 hover:border-teal-300'
                          }`}
                        >
                          <span>{opt.icon}</span>
                          <span>{opt.label}</span>
                          {alreadyAdded && <span className="text-[10px] bg-emerald-200/80 text-emerald-900 rounded-full px-1.5 font-bold">مضافة</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* List of Degree Groups */}
              {degreeGroups.length === 0 ? (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center space-y-3">
                  <div className="h-12 w-12 rounded-2xl bg-teal-50 text-[#0E7C86] grid place-items-center mx-auto">
                    <GraduationCap className="h-6 w-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-700">لم يتم تحديد أي درجات علمية للمنحة بعد</h4>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    اضغط على أي من أزرار الدرجات العلمية بالأعلى (مثل بكالوريوس أو ماجستير) لإضافة قسم الدرجة ثم كتابة التخصصات التابعة لها.
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {degreeGroups.map((group, groupIndex) => {
                    const currentInputValue = majorInputs[group.id] || '';

                    return (
                      <section
                        key={group.id}
                        className="rounded-3xl border border-[#142B5F]/20 bg-white shadow-xs overflow-hidden transition hover:border-[#0E7C86]"
                      >
                        {/* Degree Header Banner */}
                        <div className="bg-[#FAF7F0] border-b border-slate-200/80 px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#142B5F] text-[#F2CD78] font-black text-lg shrink-0 shadow-xs">
                              🎓
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="text-sm sm:text-base font-black text-[#142B5F]">
                                  الدرجة العلمية {groupIndex + 1}: {group.customLabel || group.degreeLevel}
                                </h4>
                                <span className="rounded-full bg-teal-50 border border-teal-200 px-2.5 py-0.5 text-[10px] font-black text-[#0E7C86]">
                                  {group.majors.length} تخصصات مضافة
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                                التخصصات المتاحة حصراً لمرحلة ({group.degreeLevel}) في هذه المنحة
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleRemoveDegreeLevel(group.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 px-3 py-1.5 text-xs font-bold transition cursor-pointer self-end sm:self-center"
                            title="حذف هذه الدرجة العلمية بكامل تخصصاتها"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>حذف الدرجة</span>
                          </button>
                        </div>

                        {/* Degree Body: Majors Under This Degree */}
                        <div className="p-6 space-y-4">
                          {/* Add Major Input for this Degree */}
                          <div className="flex flex-col sm:flex-row gap-2">
                            <div className="relative flex-1">
                              <input
                                type="text"
                                value={currentInputValue}
                                onChange={(e) =>
                                  setMajorInputs((prev) => ({ ...prev, [group.id]: e.target.value }))
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleAddMajorToDegree(group.id);
                                  }
                                }}
                                placeholder={`اكتب اسم التخصص المتاح لمرحلة (${group.degreeLevel}) واضغط إضافة...`}
                                className="h-11 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 px-4 text-xs sm:text-sm font-medium text-slate-900 outline-none transition focus:border-[#0E7C86] focus:bg-white focus:ring-2 focus:ring-[#0E7C86]/15 font-['Cairo']"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleAddMajorToDegree(group.id)}
                              className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-2xl bg-[#0E7C86] hover:bg-[#142B5F] px-5 text-xs font-black text-white shadow-xs transition-all active:scale-95 cursor-pointer shrink-0"
                            >
                              <Plus className="h-4 w-4" />
                              <span>إضافة تخصص لـ ({group.degreeLevel})</span>
                            </button>
                          </div>

                          {/* Quick Suggestions Tags */}
                          <div className="space-y-1.5">
                            <span className="text-[11px] font-bold text-slate-400">💡 تخصصات شائعة (انقر للإضافة السريعة):</span>
                            <div className="flex flex-wrap gap-1.5">
                              {POPULAR_MAJOR_SUGGESTIONS.map((sug) => {
                                const isAdded = group.majors.map(item => item.label).includes(sug);
                                return (
                                  <button
                                    key={sug}
                                    type="button"
                                    disabled={isAdded}
                                    onClick={() => handleAddMajorToDegree(group.id, sug)}
                                    className={`rounded-xl px-2.5 py-1 text-[11px] font-bold transition cursor-pointer ${
                                      isAdded
                                        ? 'bg-slate-100 text-slate-400 opacity-60 cursor-not-allowed'
                                        : 'bg-slate-50 hover:bg-teal-50 border border-slate-200 hover:border-teal-300 text-slate-700 hover:text-[#0E7C86]'
                                    }`}
                                  >
                                    + {sug}
                                  </button>
                                );
                              })}
                            </div>
                          </div>

                          {/* List of Active Majors in this Degree */}
                          <div className="pt-3 border-t border-slate-100">
                            <h5 className="text-xs font-bold text-[#142B5F] mb-2.5">
                              التخصصات المعتمدة لمرحلة ({group.degreeLevel}):
                            </h5>

                            {group.majors.length === 0 ? (
                              <p className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-xl p-3">
                                ⚠️ لم يتم إضافة أي تخصص لهذه الدرجة بعد. يمكنك كتابة اسم التخصص في الحقل أعلاه أو اختياره من الاقتراحات.
                              </p>
                            ) : (
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {group.majors.map((major, mIdx) => (
                                  <div
                                    key={major.targetKey}
                                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs hover:border-[#0E7C86] transition group/item"
                                  >
                                    <div className="flex items-center gap-2 min-w-0">
                                      <BookOpen className="h-4 w-4 text-[#21A7B4] shrink-0" />
                                      <span className="text-xs font-bold text-slate-800 truncate">
                                        {major.label}
                                      </span>
                                    </div>
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveMajorFromDegree(group.id, mIdx)}
                                      className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                                      title="حذف هذا التخصص"
                                    >
                                      <X className="h-3.5 w-3.5" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab 5: Eligibility Criteria */}
          {activeTab === 'eligibility' && (
            <div className="space-y-6">
              <Card
                title="معايير وشروط الأهلية والقبول (Eligibility Criteria)"
                subtitle="المعدل الأكاديمي الأدنى، شروط السن، اختبارات اللغة، والجنسيات"
                icon={<CheckCheck className="h-5 w-5" />}
              >
                <div className="space-y-3.5">
                  {eligibility.map((item, index) => (
                    <div
                      key={item.itemKey || index}
                      className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 p-4 transition hover:border-[#0E7C86]/40 hover:bg-white"
                    >
                      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                        <div className="flex-1">
                          <Field label="نص الشرط والمعيار بالأهلية (يكتب نصاً مباشرة)">
                            <Input
                              value={item.valueText}
                              onChange={(val) => {
                                const updated = eligibility.map((row, i) =>
                                  i === index ? { ...row, valueText: val } : row
                                );
                                setForm((x) => ({ ...x, eligibilityItems: updated }));
                              }}
                              placeholder="مثال: معدل تراكمي لا يقل عن 70% للبكالوريوس أو 75% للدراسات العليا / السن أقل من 21 سنة للبكالوريوس"
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
                                  i === index ? { ...row, isRequired: e.target.checked } : row
                                );
                                setForm((x) => ({ ...x, eligibilityItems: updated }));
                              }}
                              className="rounded text-[#0E7C86] focus:ring-[#0E7C86]"
                            />
                            <span>شرط إلزامي</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = eligibility.filter((_, i) => i !== index);
                              setForm((x) => ({ ...x, eligibilityItems: updated }));
                            }}
                            className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                            title="حذف الشرط"
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
                      const itemKey = nextKey('ELIGIBILITY', eligibility as any, 'itemKey');
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
                    <span>+ إضافة معيار أهلية جديد (مربع نصي)</span>
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 6: Required Documents */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <Card
                title="المستندات والوثائق المطلوبة للتقديم (Required Documents)"
                subtitle="جواز السفر، الشهادات، خطابات التوصية، وخطاب الحافز"
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
                          <Field label="اسم المستند والوثيقة المطلوبة (يكتب نصاً مباشرة)">
                            <Input
                              value={item.displayName}
                              onChange={(val) => {
                                const updated = documents.map((doc, i) =>
                                  i === index ? { ...doc, displayName: val } : doc
                                );
                                setForm((x) => ({ ...x, requiredDocumentItems: updated }));
                              }}
                              placeholder="مثال: جواز السفر ساري المفعول / شهادة الثانوية العامة وكشف الدرجات مترجم ومصدق"
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
                                  i === index ? { ...doc, isRequired: e.target.checked } : doc
                                );
                                setForm((x) => ({ ...x, requiredDocumentItems: updated }));
                              }}
                              className="rounded text-[#0E7C86] focus:ring-[#0E7C86]"
                            />
                            <span>مستند إلزامي</span>
                          </label>

                          <button
                            type="button"
                            onClick={() => {
                              const updated = documents.filter((_, i) => i !== index);
                              setForm((x) => ({ ...x, requiredDocumentItems: updated }));
                            }}
                            className="text-rose-500 hover:text-rose-700 p-2 rounded-xl hover:bg-rose-50 border border-transparent hover:border-rose-200 cursor-pointer"
                            title="حذف المستند"
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
                      const documentKey = nextKey('DOC', documents as any, 'documentKey');
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
                    <span>+ إضافة وثيقة ومستند جديد (مربع نصي)</span>
                  </button>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 7: Links & Universities */}
          {activeTab === 'links_unis' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                title="روابط التقديم والمصادر الرسمية"
                subtitle="بوابة التسجيل الإلكترونية والموقع الرسمي للجهة المانحة"
                icon={<ExternalLink className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <Field label="رابط بوابة التقديم المباشرة (Application URL)">
                    <Input
                      value={form.applicationUrl}
                      onChange={(val) => setForm((x) => ({ ...x, applicationUrl: val }))}
                      placeholder="https://apply.scholarship.gov/portal"
                    />
                  </Field>

                  <Field label="الموقع الرسمي للمنحة (Official Website)">
                    <Input
                      value={form.officialWebsite}
                      onChange={(val) => setForm((x) => ({ ...x, officialWebsite: val }))}
                      placeholder="https://www.scholarship.gov"
                    />
                  </Field>

                  <Field label="رابط المصدر والإعلان المرجعي (Official Source URL)">
                    <Input
                      value={form.officialSourceUrl}
                      onChange={(val) => setForm((x) => ({ ...x, officialSourceUrl: val }))}
                      placeholder="https://www.scholarship.gov/announcements/2027"
                    />
                  </Field>

                  <div className="pt-2">
                    <a
                      href={form.applicationUrl || form.officialWebsite || '#'}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] px-4 py-2.5 text-xs font-bold text-white transition shadow-xs"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>زيارة بوابة التقديم الرسمية الآن</span>
                    </a>
                  </div>
                </div>
              </Card>

              <Card
                title="الجامعات والبرامج الشريكة (University Links)"
                subtitle="الجامعات التي تستضيف المنحة والبرامج الأكاديمية المتاحة"
                icon={<Landmark className="h-5 w-5" />}
              >
                <div className="space-y-3">
                  {(scholarship.universityLinks ?? []).map((item) => (
                    <div key={item.linkKey} className="rounded-2xl border border-slate-200 bg-[#FAF7F0]/40 p-4 shadow-xs">
                      <div className="flex items-center gap-2 font-black text-[#142B5F] text-sm">
                        <Landmark className="h-4 w-4 text-[#0E7C86]" />
                        <span>{item.sourceLabel || item.linkKey}</span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500">
                        معرف الجامعة: {display(item.universityId)} · البرنامج: {display(item.academicProgramId)}
                      </div>
                    </div>
                  ))}

                  {(!scholarship.universityLinks || scholarship.universityLinks.length === 0) && (
                    <div className="rounded-2xl bg-slate-50 p-6 text-center text-xs text-slate-500 font-bold">
                      المنحة مفتوحة ومتاحة في جميع الجامعات الحكومية المعتمدة في الدولة المستضيفة.
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
                title="ملاحظات وتوجيهات هامة للطلاب (Important Notes & Guidance)"
                subtitle="تعليمات التقديم الخاصة، نصائح النجاح، المحاذير، وملاحظات الإدارة الداخلية"
                icon={<Lightbulb className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <Field label="نص الملاحظات والتوجيهات العامة للطلاب (Important Notes)">
                    <Textarea
                      rows={6}
                      value={form.notes}
                      onChange={(val) => setForm((x) => ({ ...x, notes: val }))}
                      placeholder="اكتب هنا التنبيهات الخاصة بالتقديم، مثل مجانية التقديم، متطلبات التوثيق، والمحاذير..."
                    />
                  </Field>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4 text-xs space-y-2 text-amber-900">
                      <div className="flex items-center gap-2 font-black text-amber-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600" />
                        <span>تنبيهات ومحاذير رسمية:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                        <li>التقديم على المنحة مجاني تماماً ولا يتطلب أي رسوم تقديم.</li>
                        <li>احذر من التعامل مع جهات غير رسمية تدعي ضمان القبول.</li>
                        <li>يجب أن تكون جميع الوثائق سارية المفعول حتى موعد السفر.</li>
                      </ul>
                    </div>

                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs space-y-2 text-emerald-900">
                      <div className="flex items-center gap-2 font-black text-emerald-800">
                        <Lightbulb className="h-4 w-4 text-emerald-600" />
                        <span>نصائح لزيادة فرصة القبول:</span>
                      </div>
                      <ul className="list-disc list-inside space-y-1 text-slate-700 font-medium">
                        <li>اكتب خطاب حافز مخصص وموجه بدقة للمنحة والجامعة.</li>
                        <li>احرص على الحصول على خطابات توصية قوية من أساتذة يعرفونك جيداً.</li>
                        <li>قدّم طلبك مبكراً قبل الأيام الأخيرة لتجنب ضغط الخوادم.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Tab 9: Data Health & Audit */}
          {activeTab === 'health_audit' && (
            <div className="grid gap-6 lg:grid-cols-2">
              <Card
                title="مؤشرات اكتمال البيانات وصحة السجل"
                subtitle="التحقق من تغطية جميع الحقول الإلزامية والربط المعياري"
                icon={<ShieldCheck className="h-5 w-5" />}
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 border border-emerald-200 p-4 text-emerald-800">
                    <div className="flex items-center gap-2 font-bold text-xs">
                      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      <span>حالة البيانات: مكتملة ومعتمدة 100%</span>
                    </div>
                    <span className="rounded-full bg-emerald-600 px-3 py-0.5 text-xs font-black text-white">جاهز للنشر</span>
                  </div>

                  <div>
                    <h4 className="mb-2 text-xs font-bold text-slate-700">الحقول المفقودة أو الناقصة:</h4>
                    {detail.completeness.missingFields.length ? (
                      <ul className="space-y-1 text-xs text-amber-800 font-bold">
                        {detail.completeness.missingFields.map((field) => (
                          <li key={field}>• {field}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-emerald-700 font-bold">✓ لا توجد أي حقول ناقصة، كافة بيانات المنحة مدخلة بالكامل.</p>
                    )}
                  </div>
                </div>
              </Card>

              <Card
                title="سجل العمليات والتدقيق (Audit Trail)"
                subtitle="تاريخ التعديلات والأوامر التي طرأت على هذا السجل"
                icon={<History className="h-5 w-5" />}
              >
                {detail.historyLimit && <p className="mb-3 text-xs text-slate-500">{t('audit_history_bounded').replace('{0}', String(detail.historyLimit))}</p>}
                {detail.historyHasMore && hasPermission('admin:audit:manage') && <Link className="mb-3 block text-xs underline" to={`/audit?${new URLSearchParams({ targetId: scholarship.id, category: 'SCHOLARSHIPS_MUTATION' })}`}>{t('audit_open_full_history')}</Link>}
                <div className="space-y-2.5">
                  {detail.history.map((event) => (
                    <div key={event.id} className="rounded-2xl border border-slate-200 p-3.5 text-xs bg-white">
                      <div className="flex items-center justify-between font-bold text-[#142B5F]">
                        <span>{event.action}</span>
                        <span className="text-slate-400 font-normal">{new Date(event.timestamp).toLocaleString('ar-SA')}</span>
                      </div>
                      <div className="mt-1 text-[11px] text-slate-500 font-medium">
                        بواسطة: {event.actorId} ({event.source})
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </fieldset></main>
      </div>

      {/* Floating Bottom Save Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between rounded-3xl border border-[#DDEFF2] bg-white/95 p-4 shadow-lg backdrop-blur-md">
        <div className="flex items-center gap-2 text-xs text-slate-600 font-bold">
          <GraduationCap className="h-4 w-4 text-[#0E7C86]" />
          <span>تعديل منحة: <strong className="text-[#142B5F]">{form.displayName || scholarship.localizedNames?.ar || scholarship.displayName}</strong></span>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => navigate('/admin/scholarships')}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
          >
            إلغاء والعودة
          </button>

          <button
            disabled={saving}
            type="button"
            onClick={() => void save()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] px-6 py-2.5 text-xs font-black text-white shadow-md transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 text-[#F2CD78]" />}
            <span>حفظ كافة التغييرات</span>
          </button>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-3xl border border-[#DDEFF2] bg-white p-6 sm:p-7 shadow-2xl space-y-5 font-['Cairo']">
            <div className="flex items-start gap-4">
              <div className={`flex h-12 w-12 items-center justify-center rounded-2xl shrink-0 ${
                confirmModal.variant === 'emerald'
                  ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                  : confirmModal.variant === 'rose'
                  ? 'bg-rose-50 text-rose-600 border border-rose-200'
                  : 'bg-amber-50 text-amber-600 border border-amber-200'
              }`}>
                {confirmModal.variant === 'emerald' ? (
                  <Sparkles className="h-6 w-6" />
                ) : confirmModal.variant === 'rose' ? (
                  <Archive className="h-6 w-6" />
                ) : (
                  <AlertTriangle className="h-6 w-6" />
                )}
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-black text-[#142B5F]">
                  {confirmModal.title}
                </h3>
                <p className="text-xs sm:text-sm font-medium leading-relaxed text-slate-600">
                  {confirmModal.description}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-700 transition cursor-pointer"
              >
                تراجع وإلغاء
              </button>

              <button
                type="button"
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
