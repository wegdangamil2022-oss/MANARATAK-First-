import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  Award,
  BarChart3,
  CheckCircle2,
  Eye,
  FileBadge2,
  LayoutTemplate,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  UserRoundCog,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { CertificatePreview } from '../components/certificates/CertificatePreview';
import { AssetPicker } from '../components/AssetPicker';

type CertificateStatus = 'ISSUED' | 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'REISSUED' | 'ARCHIVED';
type TemplateStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'APPROVED' | 'ACTIVE' | 'DEPRECATED' | 'ARCHIVED' | 'RETIRED';

type Certificate = {
  id: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  verificationUrl?: string | null;
  status: CertificateStatus;
  certificateType: string;
  recipientDisplayName?: string | null;
  achievementDisplayName: string;
  courseDisplayName?: string | null;
  learningPathDisplayName?: string | null;
  issuedAt: string;
  expiresAt?: string | null;
  issuerName?: string | null;
  templateVersion?: string | null;
  integrityVerified?: boolean;
};

type CertificateTemplate = {
  id: string;
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  status: TemplateStatus;
  issuerId: string;
  issuerName?: string | null;
  language: 'ARABIC' | 'ENGLISH' | 'BILINGUAL';
  layout: 'LANDSCAPE' | 'PORTRAIT';
  accentColor: string;
  secondaryColor: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  signatoryNameAr?: string | null;
  signatoryNameEn?: string | null;
  signatoryTitleAr?: string | null;
  signatoryTitleEn?: string | null;
  logoAssetId?: string | null;
  sealAssetId?: string | null;
  signatureAssetId?: string | null;
  designAssetId?: string | null;
  validityPolicy: 'PERMANENT' | 'EXPIRING' | 'RENEWABLE';
  validityDurationDays?: number | null;
  renewalPeriodDays?: number | null;
  renewalPolicy?: string | null;
  requiresRevalidation: boolean;
  templateVersion: string;
  currentVersionId: string;
};

type CertificateIssuer = {
  id: string;
  publicId: string;
  code: string;
  name: string;
  issuerType: 'MANARATAK' | 'UNIVERSITY' | 'EDUCATIONAL_INSTITUTION' | 'GOVERNMENT' | 'TRAINING_CENTER' | 'EXTERNAL_PARTNER';
  status: 'ACTIVE' | 'SUSPENDED' | 'DEPRECATED';
  issuerLogoAssetId: string;
  signingKeyReference: string;
  accreditationAuthority?: string | null;
  accreditationReference?: string | null;
};

type Analytics = {
  total: number;
  active: number;
  revoked: number;
  archived: number;
  expiringSoon: number;
  templates: number;
  verifications: number;
};

type CertificateReadiness = {
  activeTemplate: boolean;
  activeIssuer: boolean;
  trustedCompletionIssuanceReady: boolean;
  productionLike: boolean;
  signingKeyReferenceConfigured: boolean;
  signingProviderConfigured: boolean;
  publicVerificationBaseUrlConfigured: boolean;
  artifactRendererMode: 'EAP_ASYNC';
  artifactRendererRuntimeReady: boolean;
};

type Tab = 'REGISTRY' | 'TEMPLATES' | 'ISSUERS' | 'INSIGHTS';

type CertificateTemplateDraft = {
  code: string;
  name: string;
  nameAr: string;
  nameEn: string;
  templateVersion: string;
  issuerId: string;
  language: CertificateTemplate['language'];
  layout: CertificateTemplate['layout'];
  accentColor: string;
  secondaryColor: string;
  titleAr: string;
  titleEn: string;
  bodyAr: string;
  bodyEn: string;
  signatoryNameAr: string;
  signatoryNameEn: string;
  signatoryTitleAr: string;
  signatoryTitleEn: string;
  logoAssetId: string;
  sealAssetId: string;
  signatureAssetId: string;
  designAssetId: string;
  validityPolicy: CertificateTemplate['validityPolicy'];
  validityDurationDays: number | null;
  renewalPeriodDays: number | null;
  renewalPolicy: string | null;
  requiresRevalidation: boolean;
};

const emptyAnalytics: Analytics = { total: 0, active: 0, revoked: 0, archived: 0, expiringSoon: 0, templates: 0, verifications: 0 };
const templateDraft: CertificateTemplateDraft = {
  code: 'MNR-SIGNATURE',
  name: 'MANARATAK Signature Certificate',
  nameAr: 'قالب منارتك الرسمي',
  nameEn: 'MANARATAK Signature Certificate',
  templateVersion: '1.0.0',
  issuerId: '',
  language: 'BILINGUAL',
  layout: 'LANDSCAPE',
  accentColor: '#142B5F',
  secondaryColor: '#D6A43B',
  titleAr: 'شهادة إتمام',
  titleEn: 'CERTIFICATE OF COMPLETION',
  bodyAr: 'تشهد منصة منارتك بأن المتعلم قد أتم بنجاح متطلبات هذه الدورة واستحق شهادة الإتمام الرقمية القابلة للتحقق.',
  bodyEn: 'MANARATAK confirms that the learner has successfully completed the course requirements and earned this digitally verifiable certificate of completion.',
  signatoryNameAr: 'إدارة الشهادات — منارتك',
  signatoryNameEn: 'MANARATAK Certificates Office',
  signatoryTitleAr: 'توقيع الإصدار الرقمي',
  signatoryTitleEn: 'Digital Issuance Signature',
  logoAssetId: '',
  sealAssetId: '',
  signatureAssetId: '',
  designAssetId: '',
  validityPolicy: 'PERMANENT',
  validityDurationDays: null,
  renewalPeriodDays: null,
  renewalPolicy: null,
  requiresRevalidation: false,
};

export function CertificateAdminPage() {
  const [tab, setTab] = useState<Tab>('REGISTRY');
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [issuers, setIssuers] = useState<CertificateIssuer[]>([]);
  const [analytics, setAnalytics] = useState<Analytics>(emptyAnalytics);
  const [readiness, setReadiness] = useState<CertificateReadiness | null>(null);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [templateModal, setTemplateModal] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<CertificateTemplate | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [draft, setDraft] = useState<CertificateTemplateDraft>(templateDraft);
  const [issuerModal, setIssuerModal] = useState(false);
  const [issuerDraft, setIssuerDraft] = useState({ code: 'MANARATAK', name: 'MANARATAK — منارتك', issuerType: 'MANARATAK' as CertificateIssuer['issuerType'], issuerLogoAssetId: '', signingKeyReference: '', accreditationAuthority: '', accreditationReference: '' });

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '50' });
      if (query.trim()) params.set('search', query.trim());
      if (status) params.set('status', status);
      const [registry, templateResponse, issuerResponse, metricResponse, readinessResponse] = await Promise.all([
        adminApiClient.request<{ data: Certificate[] }>(`/admin/certificates?${params.toString()}`),
        adminApiClient.request<{ data: CertificateTemplate[] }>('/admin/certificates/templates'),
        adminApiClient.request<{ data: CertificateIssuer[] }>('/admin/certificates/issuers'),
        adminApiClient.request<Analytics>('/admin/certificates/analytics'),
        adminApiClient.request<CertificateReadiness>('/admin/certificates/readiness'),
      ]);
      setCertificates(registry.data);
      setTemplates(templateResponse.data);
      setIssuers(issuerResponse.data);
      setAnalytics(metricResponse);
      setReadiness(readinessResponse);
    } catch (e: any) {
      setError(e.message || 'تعذر تحميل مركز الشهادات.');
    } finally {
      setLoading(false);
    }
  }, [query, status]);

  useEffect(() => {
    const timer = window.setTimeout(load, 220);
    return () => window.clearTimeout(timer);
  }, [load]);

  const activeTemplate = useMemo(() => templates.find((item) => item.status === 'ACTIVE') ?? templates[0] ?? null, [templates]);

  const openCreateTemplate = () => {
    setEditingTemplateId(null);
    setDraft({ ...templateDraft, issuerId: issuers.find((item) => item.status === 'ACTIVE')?.id || '' });
    setTemplateModal(true);
  };

  const openEditTemplate = (item: CertificateTemplate) => {
    setEditingTemplateId(item.id);
    setDraft({
      code: item.code,
      name: item.name,
      nameAr: item.nameAr,
      nameEn: item.nameEn,
      templateVersion: bumpPatch(item.templateVersion),
      issuerId: item.issuerId,
      language: item.language,
      layout: item.layout,
      accentColor: item.accentColor,
      secondaryColor: item.secondaryColor,
      titleAr: item.titleAr,
      titleEn: item.titleEn,
      bodyAr: item.bodyAr,
      bodyEn: item.bodyEn,
      signatoryNameAr: item.signatoryNameAr || '',
      signatoryNameEn: item.signatoryNameEn || '',
      signatoryTitleAr: item.signatoryTitleAr || '',
      signatoryTitleEn: item.signatoryTitleEn || '',
      logoAssetId: item.logoAssetId || '',
      sealAssetId: item.sealAssetId || '',
      signatureAssetId: item.signatureAssetId || '',
      designAssetId: item.designAssetId || '',
      validityPolicy: item.validityPolicy,
      validityDurationDays: item.validityDurationDays ?? null,
      renewalPeriodDays: item.renewalPeriodDays ?? null,
      renewalPolicy: item.renewalPolicy ?? null,
      requiresRevalidation: item.requiresRevalidation,
    });
    setTemplateModal(true);
  };

  const saveTemplate = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    try {
      const payload = {
        ...draft,
        logoAssetId: draft.logoAssetId.trim() || null,
        sealAssetId: draft.sealAssetId.trim() || null,
        signatureAssetId: draft.signatureAssetId.trim() || null,
        designAssetId: draft.designAssetId.trim() || null,
        validityDurationDays: draft.validityPolicy === 'PERMANENT' ? null : draft.validityDurationDays,
        renewalPeriodDays: draft.validityPolicy === 'RENEWABLE' ? draft.renewalPeriodDays : null,
        renewalPolicy: draft.validityPolicy === 'RENEWABLE' ? draft.renewalPolicy : null,
      };
      if (editingTemplateId) {
        await adminApiClient.request(`/admin/certificates/templates/${editingTemplateId}`, { method: 'PATCH', body: JSON.stringify(payload) });
        setMessage('تم إنشاء نسخة جديدة من القالب مع الحفاظ على النسخة التاريخية.');
      } else {
        await adminApiClient.request('/admin/certificates/templates', { method: 'POST', body: JSON.stringify(payload) });
        setMessage('تم إنشاء مسودة القالب. يجب أن تمر بالمراجعة والاعتماد قبل التفعيل.');
      }
      setTemplateModal(false);
      await load();
    } catch (e: any) { setError(e.message || 'تعذر حفظ القالب.'); }
  };

  const transitionTemplate = async (item: CertificateTemplate, nextStatus: TemplateStatus) => {
    setError(''); setMessage('');
    try {
      await adminApiClient.request(`/admin/certificates/templates/${item.id}/transition`, { method: 'POST', body: JSON.stringify({ status: nextStatus, reason: `Admin transition ${item.status} -> ${nextStatus}` }) });
      setMessage(`تم نقل القالب من ${item.status} إلى ${nextStatus}.`);
      await load();
    } catch (e: any) { setError(e.message || 'تعذر تغيير حالة القالب.'); }
  };

  const bootstrapTemplate = async () => {
    const issuer = issuers.find((item) => item.status === 'ACTIVE');
    if (!issuer) { setError('أنشئ جهة إصدار نشطة أولًا.'); return; }
    try {
      await adminApiClient.request('/admin/certificates/templates/bootstrap-default', { method: 'POST', body: JSON.stringify({ issuerId: issuer.id }) });
      setMessage('تم إنشاء مسودة قالب منارتك الرسمي.');
      await load();
    } catch (e: any) { setError(e.message || 'تعذر إنشاء القالب الافتراضي.'); }
  };

  const saveIssuer = async (event: FormEvent) => {
    event.preventDefault();
    setError(''); setMessage('');
    try {
      await adminApiClient.request('/admin/certificates/issuers', {
        method: 'POST', body: JSON.stringify({
          ...issuerDraft,
          accreditationAuthority: issuerDraft.accreditationAuthority.trim() || null,
          accreditationReference: issuerDraft.accreditationReference.trim() || null,
        }),
      });
      setIssuerModal(false);
      setMessage('تم إنشاء جهة الإصدار.');
      await load();
    } catch (e: any) { setError(e.message || 'تعذر إنشاء جهة الإصدار.'); }
  };

  return (
    <div dir="rtl" className="mx-auto max-w-[1500px] space-y-6 text-right">
      <header className="overflow-hidden rounded-3xl border border-[#D6A43B]/25 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#0E7C86] p-6 text-white shadow-xl">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-sm font-black text-[#F6D991]">
              <ShieldCheck className="h-5 w-5" />
              مركز شهادات منارتك
            </div>
            <h1 className="text-2xl font-black sm:text-3xl">الإصدار، القوالب، التحقق والحوكمة</h1>
            <p className="mt-2 max-w-3xl text-sm leading-7 text-emerald-50/90">
              الإصدار الأولي لا يتم يدويًا من هذه الصفحة. الشهادة تُنشأ فقط بعد حدث إكمال موثوق من نظام الدورات، ثم يمتلك هذا القسم دورة حياتها والتحقق العام منها.
            </p>
          </div>
          <button onClick={load} aria-label="تحديث مركز الشهادات" className="inline-flex items-center justify-center gap-2 self-start rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-black hover:bg-white/15">
            <RefreshCw className="h-4 w-4" /> تحديث
          </button>
        </div>
      </header>

      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-800">{message}</div> : null}
      {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-800">{error}</div> : null}

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-7">
        <Metric label="الإجمالي" value={analytics.total} icon={FileBadge2} />
        <Metric label="نشطة" value={analytics.active} icon={CheckCircle2} positive />
        <Metric label="ملغاة" value={analytics.revoked} icon={ShieldCheck} negative />
        <Metric label="مؤرشفة" value={analytics.archived} icon={Activity} />
        <Metric label="تنتهي قريبًا" value={analytics.expiringSoon} icon={Activity} />
        <Metric label="القوالب" value={analytics.templates} icon={LayoutTemplate} />
        <Metric label="عمليات تحقق" value={analytics.verifications} icon={Eye} />
      </section>

      <nav className="flex flex-wrap gap-2 rounded-2xl border bg-white p-2 shadow-sm">
        <TabButton active={tab === 'REGISTRY'} onClick={() => setTab('REGISTRY')} icon={FileBadge2}>سجل الشهادات</TabButton>
        <TabButton active={tab === 'TEMPLATES'} onClick={() => setTab('TEMPLATES')} icon={LayoutTemplate}>القوالب</TabButton>
        <TabButton active={tab === 'ISSUERS'} onClick={() => setTab('ISSUERS')} icon={UserRoundCog}>جهات الإصدار</TabButton>
        <TabButton active={tab === 'INSIGHTS'} onClick={() => setTab('INSIGHTS')} icon={BarChart3}>الجاهزية والحوكمة</TabButton>
      </nav>

      {loading ? <div className="grid min-h-64 place-items-center rounded-2xl border bg-white"><Loader2 className="h-7 w-7 animate-spin text-[#142B5F]" /></div> : null}

      {!loading && tab === 'REGISTRY' ? (
        <section className="overflow-hidden rounded-2xl border bg-white shadow-sm">
          <div className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h2 className="font-black text-slate-900">السجل الرسمي</h2>
              <p className="text-xs text-slate-500">لا يوجد حذف نهائي للشهادات الصادرة؛ التصحيح يتم بالإلغاء ثم إعادة الإصدار.</p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="رقم الشهادة، الاسم، الدورة..." className="w-full rounded-xl border py-2 pr-9 pl-3 text-sm sm:w-72" />
              </label>
              <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2 text-sm">
                <option value="">كل الحالات</option>
                {['ACTIVE','EXPIRED','REVOKED','REISSUED','ARCHIVED'].map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500"><tr><th className="px-4 py-3 text-right">الشهادة</th><th className="px-4 py-3 text-right">المستفيد</th><th className="px-4 py-3 text-right">الإنجاز</th><th className="px-4 py-3 text-right">الحالة</th><th className="px-4 py-3 text-right">الإصدار</th><th className="px-4 py-3 text-left">إجراء</th></tr></thead>
              <tbody className="divide-y">
                {certificates.map((item) => <tr key={item.id} className="hover:bg-[#FAF7F0]"><td className="px-4 py-3"><strong className="block font-mono text-xs text-[#142B5F]" dir="ltr">{item.serialNumber}</strong><span className="font-mono text-[10px] text-slate-400" dir="ltr">{item.verificationCode}</span></td><td className="px-4 py-3 font-bold">{item.recipientDisplayName || 'اسم غير متاح — راجع Identity snapshot'}</td><td className="px-4 py-3"><strong>{item.achievementDisplayName || item.courseDisplayName || item.learningPathDisplayName}</strong><span className="block text-[10px] text-slate-400">{item.certificateType}</span></td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3 text-xs text-slate-600">{formatDate(item.issuedAt)}</td><td className="px-4 py-3 text-left"><Link to={`/certificates/${item.id}`} className="inline-flex items-center gap-1 rounded-lg bg-[#142B5F] px-3 py-2 text-xs font-black text-white"><Eye className="h-3.5 w-3.5" /> فتح</Link></td></tr>)}
                {!certificates.length ? <tr><td colSpan={6} className="px-4 py-12 text-center text-slate-400">لا توجد شهادات مطابقة.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {!loading && tab === 'TEMPLATES' ? (
        <section className="space-y-4">
          <div className="flex flex-col gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
            <div><h2 className="font-black">قوالب الشهادات</h2><p className="text-xs text-slate-500">القالب Versioned وMaker/Checker؛ تعديل قالب لا يغيّر الشهادات التاريخية.</p></div>
            <div className="flex gap-2"><button onClick={bootstrapTemplate} className="rounded-xl border border-[#142B5F]/20 px-4 py-2 text-xs font-black text-[#142B5F]">إنشاء القالب الرسمي</button><button onClick={openCreateTemplate} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-2 text-xs font-black text-white"><Plus className="h-4 w-4" /> قالب جديد</button></div>
          </div>
          <div className="grid gap-4 xl:grid-cols-2">
            {templates.map((item) => <article key={item.id} className="rounded-2xl border bg-white p-4 shadow-sm"><div className="mb-4 flex items-start justify-between gap-3"><div><span className="font-mono text-[10px] text-slate-400" dir="ltr">{item.code} · v{item.templateVersion}</span><h3 className="font-black">{item.nameAr}</h3><p className="text-xs text-slate-500">{item.nameEn}</p></div><StatusBadge status={item.status} /></div><CertificatePreview compact template={item} /><div className="mt-4 flex flex-wrap gap-2"><button onClick={() => setPreviewTemplate(item)} className="rounded-lg border px-3 py-2 text-xs font-bold">معاينة كبيرة</button><button onClick={() => openEditTemplate(item)} disabled={item.status === 'ACTIVE' || item.status === 'ARCHIVED'} className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-40">نسخة تعديل</button>{nextTemplateStatus(item.status) ? <button onClick={() => transitionTemplate(item, nextTemplateStatus(item.status)!)} className="rounded-lg bg-[#D6A43B] px-3 py-2 text-xs font-black text-[#142B5F]">{transitionLabel(item.status)}</button> : null}</div></article>)}
            {!templates.length ? <div className="rounded-2xl border border-dashed bg-white p-10 text-center text-slate-400 xl:col-span-2">لا يوجد قالب. ابدأ بجهة إصدار ثم أنشئ قالب منارتك الرسمي.</div> : null}
          </div>
        </section>
      ) : null}

      {!loading && tab === 'ISSUERS' ? (
        <section className="space-y-4">
          <div className="flex items-center justify-between rounded-2xl border bg-white p-4 shadow-sm"><div><h2 className="font-black">جهات الإصدار</h2><p className="text-xs text-slate-500">الجهة والمفتاح والأصل المرئي جزء من سلطة إصدار الشهادة.</p></div><button onClick={() => setIssuerModal(true)} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-2 text-xs font-black text-white"><Plus className="h-4 w-4" /> جهة إصدار</button></div>
          <div className="grid gap-3 lg:grid-cols-2 xl:grid-cols-3">{issuers.map((issuer) => <article key={issuer.id} className="rounded-2xl border bg-white p-5 shadow-sm"><div className="flex justify-between gap-3"><div><span className="font-mono text-[10px] text-slate-400">{issuer.code}</span><h3 className="font-black">{issuer.name}</h3></div><StatusBadge status={issuer.status} /></div><dl className="mt-4 space-y-2 text-xs"><Info label="النوع" value={issuer.issuerType} /><Info label="Logo Asset" value={issuer.issuerLogoAssetId} /><Info label="Signing Key" value={issuer.signingKeyReference} /><Info label="جهة الاعتماد الخارجية" value={issuer.accreditationAuthority || (issuer.issuerType === 'MANARATAK' ? 'غير مطلوب — شهادة إتمام من المنصة' : 'غير محدد')} /></dl></article>)}</div>
        </section>
      ) : null}

      {!loading && tab === 'INSIGHTS' ? (
        <section className="grid gap-4 lg:grid-cols-2">
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 flex items-center gap-2 font-black text-[#142B5F]"><ShieldCheck className="h-5 w-5" /> قواعد الثقة</h2><ul className="space-y-2 text-sm leading-7 text-slate-700"><li>• الإصدار الأولي من حدث CourseCompleted/LearningPathCompleted موثوق فقط.</li><li>• شهادة منارتك هي Certificate of Completion وليست اعتمادًا أكاديميًا أو ترخيصًا مهنيًا.</li><li>• لكل Completion هوية إصدار واحدة؛ replay لن ينشئ نسخة مكررة.</li><li>• QR يفتح صفحة التحقق العامة وليس API JSON.</li><li>• الاسم والدورة والقالب والجهة وتاريخ الإكمال تدخل في الظرف الموقّع.</li><li>• الشهادة الصادرة لا تُحذف؛ إلغاء ثم إعادة إصدار عند التصحيح.</li></ul></article>
          <article className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="mb-3 flex items-center gap-2 font-black text-[#142B5F]"><Activity className="h-5 w-5" /> جاهزية التشغيل</h2><div className="space-y-3"><Readiness label="قالب Active" ready={readiness?.activeTemplate ?? Boolean(activeTemplate?.status === 'ACTIVE')} /><Readiness label="جهة إصدار Active" ready={readiness?.activeIssuer ?? issuers.some((item) => item.status === 'ACTIVE')} /><Readiness label="رابط تحقق عام" ready={Boolean(readiness?.publicVerificationBaseUrlConfigured)} detail="يُقرأ من CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL ولا يُفترض جاهزًا تلقائيًا." /><Readiness label="KMS/HSM Signing" ready={Boolean(readiness?.signingProviderConfigured && readiness?.signingKeyReferenceConfigured)} detail="لا تظهر READY في الإنتاج إلا عند وجود موفر توقيع ومرجع مفتاح." /><Readiness label="PDF/Preview عبر EAP" ready={Boolean(readiness?.artifactRendererRuntimeReady)} detail="الإصدار يسجل AWAITING_EAP_RENDER حتى يعيد عامل EAP أصول PDF/Preview/QR." /></div></article>
          {activeTemplate ? <article className="rounded-2xl border bg-white p-5 shadow-sm lg:col-span-2"><h2 className="mb-4 font-black">معاينة القالب النشط</h2><div className="mx-auto max-w-5xl"><CertificatePreview template={activeTemplate} /></div></article> : null}
        </section>
      ) : null}

      {templateModal ? <Modal title={editingTemplateId ? 'إنشاء نسخة جديدة من القالب' : 'إنشاء قالب شهادة'} onClose={() => setTemplateModal(false)}><form onSubmit={saveTemplate} className="grid gap-4 md:grid-cols-2"><Field label="الكود" value={draft.code} disabled={Boolean(editingTemplateId)} onChange={(v) => setDraft({ ...draft, code: v.toUpperCase() })} /><Field label="الاسم الإداري" value={draft.name} onChange={(v) => setDraft({ ...draft, name: v })} /><Field label="الاسم العربي" value={draft.nameAr} onChange={(v) => setDraft({ ...draft, nameAr: v })} /><Field label="الاسم الإنجليزي" value={draft.nameEn} onChange={(v) => setDraft({ ...draft, nameEn: v })} /><Field label="الإصدار" value={draft.templateVersion} onChange={(v) => setDraft({ ...draft, templateVersion: v })} /><label className="block"><span className="text-xs font-bold">جهة الإصدار</span><select required value={draft.issuerId} onChange={(e) => setDraft({ ...draft, issuerId: e.target.value })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="">اختر...</option>{issuers.filter((i) => i.status === 'ACTIVE').map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}</select></label><label><span className="text-xs font-bold">لغة الشهادة</span><select value={draft.language} onChange={(e) => setDraft({ ...draft, language: e.target.value as typeof draft.language })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="BILINGUAL">عربي + English</option><option value="ARABIC">العربية</option><option value="ENGLISH">English</option></select></label><label><span className="text-xs font-bold">اتجاه القالب</span><select value={draft.layout} onChange={(e) => setDraft({ ...draft, layout: e.target.value as typeof draft.layout })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="LANDSCAPE">أفقي</option><option value="PORTRAIT">عمودي</option></select></label><Field label="العنوان العربي" value={draft.titleAr} onChange={(v) => setDraft({ ...draft, titleAr: v })} /><Field label="العنوان الإنجليزي" value={draft.titleEn} onChange={(v) => setDraft({ ...draft, titleEn: v })} /><TextArea label="النص العربي" value={draft.bodyAr} onChange={(v) => setDraft({ ...draft, bodyAr: v })} /><TextArea label="النص الإنجليزي" value={draft.bodyEn} onChange={(v) => setDraft({ ...draft, bodyEn: v })} /><Field label="اسم التوقيع العربي" value={draft.signatoryNameAr} onChange={(v) => setDraft({ ...draft, signatoryNameAr: v })} /><Field label="صفة التوقيع" value={draft.signatoryTitleAr} onChange={(v) => setDraft({ ...draft, signatoryTitleAr: v })} /><label><span className="text-xs font-bold">اللون الأساسي</span><input type="color" value={draft.accentColor} onChange={(e) => setDraft({ ...draft, accentColor: e.target.value.toUpperCase() })} className="mt-1 h-10 w-full rounded-lg border" /></label><label><span className="text-xs font-bold">الذهبي</span><input type="color" value={draft.secondaryColor} onChange={(e) => setDraft({ ...draft, secondaryColor: e.target.value.toUpperCase() })} className="mt-1 h-10 w-full rounded-lg border" /></label><div className="md:col-span-2 grid gap-3 rounded-2xl border bg-slate-50 p-4 md:grid-cols-2"><h3 className="font-black text-[#142B5F] md:col-span-2">أصول القالب - EAP</h3><AssetPicker label="Logo Asset" purpose="CERTIFICATE_TEMPLATE_LOGO" mimeTypePrefix="image/" value={draft.logoAssetId} onChange={(logoAssetId) => setDraft({ ...draft, logoAssetId })} /><AssetPicker label="Seal Asset" purpose="CERTIFICATE_TEMPLATE_SEAL" mimeTypePrefix="image/" value={draft.sealAssetId} onChange={(sealAssetId) => setDraft({ ...draft, sealAssetId })} /><AssetPicker label="Signature Asset" purpose="CERTIFICATE_TEMPLATE_SIGNATURE" mimeTypePrefix="image/" value={draft.signatureAssetId} onChange={(signatureAssetId) => setDraft({ ...draft, signatureAssetId })} /><AssetPicker label="Design Asset" purpose="CERTIFICATE_TEMPLATE_DESIGN" mimeTypePrefix="image/" value={draft.designAssetId} onChange={(designAssetId) => setDraft({ ...draft, designAssetId })} /></div><div className="md:col-span-2 grid gap-3 rounded-2xl border bg-[#fffdf7] p-4 md:grid-cols-2"><h3 className="font-black text-[#142B5F] md:col-span-2">سياسة الصلاحية</h3><label><span className="text-xs font-bold">السياسة</span><select value={draft.validityPolicy} onChange={(e) => setDraft({ ...draft, validityPolicy: e.target.value as typeof draft.validityPolicy })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"><option value="PERMANENT">دائمة</option><option value="EXPIRING">تنتهي</option><option value="RENEWABLE">قابلة للتجديد</option></select></label>{draft.validityPolicy !== 'PERMANENT' ? <NumberField label="مدة الصلاحية بالأيام" value={draft.validityDurationDays} onChange={(v) => setDraft({ ...draft, validityDurationDays: v })} /> : <div />}{draft.validityPolicy === 'RENEWABLE' ? <><NumberField label="فترة التجديد بالأيام" value={draft.renewalPeriodDays} onChange={(v) => setDraft({ ...draft, renewalPeriodDays: v })} /><TextArea label="سياسة التجديد" value={draft.renewalPolicy || ''} onChange={(v) => setDraft({ ...draft, renewalPolicy: v })} /></> : null}<label className="flex items-center gap-2 text-xs font-bold md:col-span-2"><input type="checkbox" checked={draft.requiresRevalidation} onChange={(e) => setDraft({ ...draft, requiresRevalidation: e.target.checked })} /> تتطلب إعادة تحقق دورية</label></div><div className="md:col-span-2 rounded-xl bg-[#FAF7F0] p-3"><CertificatePreview compact template={draft} /></div><div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setTemplateModal(false)} className="rounded-xl border px-4 py-2 text-sm font-bold">إلغاء</button><button type="submit" className="rounded-xl bg-[#142B5F] px-5 py-2 text-sm font-black text-white">حفظ كمسودة</button></div></form></Modal> : null}

      {issuerModal ? <Modal title="إنشاء جهة إصدار" onClose={() => setIssuerModal(false)}><form onSubmit={saveIssuer} className="grid gap-4 md:grid-cols-2"><Field label="الكود" value={issuerDraft.code} onChange={(v) => setIssuerDraft({ ...issuerDraft, code: v.toUpperCase() })} /><Field label="الاسم" value={issuerDraft.name} onChange={(v) => setIssuerDraft({ ...issuerDraft, name: v })} /><label><span className="text-xs font-bold">النوع</span><select value={issuerDraft.issuerType} onChange={(e) => setIssuerDraft({ ...issuerDraft, issuerType: e.target.value as CertificateIssuer['issuerType'] })} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm">{['MANARATAK','UNIVERSITY','EDUCATIONAL_INSTITUTION','GOVERNMENT','TRAINING_CENTER','EXTERNAL_PARTNER'].map((v) => <option key={v}>{v}</option>)}</select></label><AssetPicker label="EAP Logo Asset" purpose="CERTIFICATE_ISSUER_LOGO" mimeTypePrefix="image/" value={issuerDraft.issuerLogoAssetId} onChange={(issuerLogoAssetId) => setIssuerDraft({ ...issuerDraft, issuerLogoAssetId })} /><Field label="Signing Key Reference" value={issuerDraft.signingKeyReference} onChange={(v) => setIssuerDraft({ ...issuerDraft, signingKeyReference: v })} /><Field label="جهة اعتماد خارجية" value={issuerDraft.accreditationAuthority} optional onChange={(v) => setIssuerDraft({ ...issuerDraft, accreditationAuthority: v })} /><Field label="مرجع الاعتماد الخارجي" value={issuerDraft.accreditationReference} optional onChange={(v) => setIssuerDraft({ ...issuerDraft, accreditationReference: v })} /><div className="md:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-900">لجهة MANARATAK لا نكتب اعتمادًا خارجيًا ما لم يوجد أساس قانوني حقيقي. الشهادة الافتراضية توصف كشهادة إتمام رقمية من المنصة.</div><div className="flex justify-end gap-2 md:col-span-2"><button type="button" onClick={() => setIssuerModal(false)} className="rounded-xl border px-4 py-2 text-sm font-bold">إلغاء</button><button className="rounded-xl bg-[#142B5F] px-5 py-2 text-sm font-black text-white">إنشاء</button></div></form></Modal> : null}

      {previewTemplate ? <Modal title="معاينة القالب" onClose={() => setPreviewTemplate(null)} wide><CertificatePreview template={previewTemplate} /></Modal> : null}
    </div>
  );
}

function Metric({ label, value, icon: Icon, positive, negative }: { label: string; value: number; icon: typeof Award; positive?: boolean; negative?: boolean }) { return <div className="rounded-2xl border bg-white p-4 shadow-sm"><Icon className={`mb-2 h-5 w-5 ${positive ? 'text-emerald-700' : negative ? 'text-rose-600' : 'text-[#142B5F]'}`} /><strong className="block text-2xl font-black">{value}</strong><span className="text-[10px] font-bold text-slate-500">{label}</span></div>; }
function TabButton({ active, onClick, icon: Icon, children }: { active: boolean; onClick: () => void; icon: typeof Award; children: React.ReactNode }) { return <button onClick={onClick} className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black ${active ? 'bg-[#142B5F] text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{children}</button>; }
function StatusBadge({ status }: { status: string }) { const style = status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-800' : status === 'REVOKED' ? 'bg-rose-100 text-rose-800' : status === 'EXPIRED' ? 'bg-amber-100 text-amber-800' : status === 'APPROVED' ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-700'; return <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${style}`}>{status}</span>; }
function Info({ label, value }: { label: string; value: string }) { return <div className="border-b pb-2 last:border-0"><dt className="text-[10px] text-slate-400">{label}</dt><dd className="mt-0.5 break-all font-bold text-slate-700">{value}</dd></div>; }
function Readiness({ label, ready, detail }: { label: string; ready: boolean; detail?: string }) { return <div className="flex items-start justify-between gap-4 rounded-xl border p-3"><div><strong className="text-sm">{label}</strong>{detail ? <p className="mt-1 text-[10px] text-slate-500">{detail}</p> : null}</div><span className={`rounded-full px-2 py-1 text-[10px] font-black ${ready ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>{ready ? 'READY' : 'RUNTIME GATE'}</span></div>; }
function Field({ label, value, onChange, disabled, optional }: { label: string; value: string; onChange: (value: string) => void; disabled?: boolean; optional?: boolean }) { return <label className="block"><span className="text-xs font-bold">{label}{optional ? ' — اختياري' : ''}</span><input required={!optional} disabled={disabled} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-slate-100" /></label>; }
function NumberField({ label, value, onChange }: { label: string; value: number | null; onChange: (value: number | null) => void }) { return <label className="block"><span className="text-xs font-bold">{label}</span><input type="number" min={1} value={value ?? ''} onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>; }
function TextArea({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label><span className="text-xs font-bold">{label}</span><textarea required rows={4} value={value} onChange={(e) => onChange(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2 text-sm" /></label>; }
function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: React.ReactNode; wide?: boolean }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4"><div className={`max-h-[92vh] w-full overflow-y-auto rounded-3xl bg-white p-5 shadow-2xl ${wide ? 'max-w-6xl' : 'max-w-4xl'}`}><div className="mb-4 flex items-center justify-between"><h2 className="text-lg font-black">{title}</h2><button onClick={onClose} aria-label="إغلاق" className="rounded-lg border px-3 py-1.5 text-xs font-bold">إغلاق</button></div>{children}</div></div>; }
function formatDate(value: string) { return new Intl.DateTimeFormat('ar', { year: 'numeric', month: 'short', day: '2-digit' }).format(new Date(value)); }
function bumpPatch(version: string) { const parts = version.split('.').map(Number); if (parts.length !== 3 || parts.some(Number.isNaN)) return '1.0.1'; return `${parts[0]}.${parts[1]}.${parts[2] + 1}`; }
function nextTemplateStatus(status: TemplateStatus): TemplateStatus | null { if (status === 'DRAFT') return 'PENDING_APPROVAL'; if (status === 'PENDING_APPROVAL') return 'APPROVED'; if (status === 'APPROVED') return 'ACTIVE'; if (status === 'ACTIVE') return 'DEPRECATED'; if (status === 'DEPRECATED') return 'ARCHIVED'; return null; }
function transitionLabel(status: TemplateStatus) { return status === 'DRAFT' ? 'إرسال للمراجعة' : status === 'PENDING_APPROVAL' ? 'اعتماد' : status === 'APPROVED' ? 'تفعيل' : status === 'ACTIVE' ? 'إيقاف تدريجي' : status === 'DEPRECATED' ? 'أرشفة' : 'تغيير الحالة'; }
