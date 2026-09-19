import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  AlertCircle, ArrowLeft, BadgeCheck, BookOpenCheck, BriefcaseBusiness, Building2, CheckCircle2,
  ExternalLink, FileCheck2, Globe2, GraduationCap, Languages, Loader2, RefreshCw,
  Save, ScrollText, ShieldCheck, Stamp, WalletCards,
} from 'lucide-react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

type TabKey = 'overview' | 'study' | 'visa' | 'living' | 'relations' | 'sources' | 'publish';
type CostTier = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

type ReferenceCountry = {
  id: string; iso2Code: string; iso3Code: string; name: string; nameAr?: string | null; officialName?: string | null;
  region?: string | null; subregion?: string | null; defaultCurrencyCode?: string | null; defaultLanguageCode?: string | null;
  callingCode?: string | null; isActive: boolean;
};
type RefOption = { id: string; name?: string; nameAr?: string | null; code?: string; isoCode?: string; currencyCode?: string; languageCode?: string };
type LinkItem = { labelAr: string; labelEn?: string; url: string; category: string; noteAr?: string; noteEn?: string };
type EvidenceItem = { label: string; url: string; sourceType: string; verifiedAt?: string };
type CostItem = { label: string; value: string };

type Profile = {
  id: string; publicId: string; slug: string; status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED'; completenessStatus: string;
  overviewAr?: string | null; overviewEn?: string | null; studySystemSummaryAr?: string | null; studySystemSummaryEn?: string | null;
  admissionHighlightsAr: string[]; admissionHighlightsEn: string[]; visaSummaryAr?: string | null; visaSummaryEn?: string | null;
  visaRequirementsAr: string[]; visaRequirementsEn: string[]; visaOfficialUrl?: string | null; livingCostTier?: CostTier | null;
  averageMonthlyLivingCostMin?: number | null; averageMonthlyLivingCostMax?: number | null; livingCostCurrencyReferenceId?: string | null;
  costHighlightsAr: CostItem[]; costHighlightsEn: CostItem[]; studentLifeHighlightsAr: string[]; studentLifeHighlightsEn: string[];
  officialLinks: LinkItem[]; sourceVerificationStatus: 'UNVERIFIED' | 'VERIFIED'; sourceAuditDate?: string | null; evidenceSources: EvidenceItem[];
  imageAssetId?: string | null; studyLanguageReferenceIds: string[]; isFeatured: boolean; publishedAt?: string | null;
};
type Readiness = { readyForReview: boolean; readyForPublish: boolean; completenessStatus: string; checks: Array<{ key: string; label: string; complete: boolean; blocking: boolean; message?: string }> };
type Aggregate = { country: ReferenceCountry; profile: Profile | null; studyLanguages: RefOption[]; livingCostCurrency: RefOption | null; readiness: Readiness | null };

type GraphIdentity = { ownerId: string; publicId?: string; slug?: string; displayName: string };
type GraphPage<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages: number };
type CountryGraph = {
  subject: GraphIdentity & { canonicalCode: string };
  relationships: {
    universities: GraphPage<GraphIdentity>;
    academicPrograms: Array<{ ownerId: string; universityOwnerId: string; universityDisplayName: string; sourceProgramName: string; degreeLevelId?: string | null; majorOwnerId?: string | null; majorMappingState: string; status: string }>;
    majors: GraphIdentity[];
    scholarships: GraphPage<GraphIdentity>;
    internationalTests: GraphPage<GraphIdentity & { providerName: string; status: string }>;
    services: GraphPage<GraphIdentity & { serviceCategory: string; deliveryMode: string }>;
    careerJobs: GraphPage<GraphIdentity & { opportunityType: string; employmentType: string }>;
    providerHeadquartersCourses: GraphPage<GraphIdentity & { providerName?: string | null; category?: string | null; directCourseUrl: string }>;
    editorialContent: Array<{ contentId: string; title: string; slug: string; contentType: string }>;
  };
};

type FormState = {
  overviewAr: string; overviewEn: string; studySystemSummaryAr: string; studySystemSummaryEn: string;
  admissionHighlightsAr: string; admissionHighlightsEn: string; visaSummaryAr: string; visaSummaryEn: string;
  visaRequirementsAr: string; visaRequirementsEn: string; visaOfficialUrl: string; livingCostTier: '' | CostTier;
  averageMonthlyLivingCostMin: string; averageMonthlyLivingCostMax: string; livingCostCurrencyReferenceId: string;
  costHighlightsAr: string; costHighlightsEn: string; studentLifeHighlightsAr: string; studentLifeHighlightsEn: string;
  officialLinks: string; evidenceSources: string; sourceAuditDate: string; studyLanguageReferenceIds: string[]; isFeatured: boolean;
};

const emptyForm: FormState = {
  overviewAr: '', overviewEn: '', studySystemSummaryAr: '', studySystemSummaryEn: '', admissionHighlightsAr: '', admissionHighlightsEn: '',
  visaSummaryAr: '', visaSummaryEn: '', visaRequirementsAr: '', visaRequirementsEn: '', visaOfficialUrl: '', livingCostTier: '',
  averageMonthlyLivingCostMin: '', averageMonthlyLivingCostMax: '', livingCostCurrencyReferenceId: '', costHighlightsAr: '', costHighlightsEn: '',
  studentLifeHighlightsAr: '', studentLifeHighlightsEn: '', officialLinks: '', evidenceSources: '', sourceAuditDate: '', studyLanguageReferenceIds: [], isFeatured: false,
};

const lines = (value: string) => value.split('\n').map((item) => item.trim()).filter(Boolean);
const stringifyLines = (value?: string[]) => (value ?? []).join('\n');
const costLines = (items?: CostItem[]) => (items ?? []).map((item) => `${item.label} | ${item.value}`).join('\n');
const parseCostLines = (value: string): CostItem[] => lines(value).map((row) => { const [label, ...rest] = row.split('|').map((x) => x.trim()); return { label, value: rest.join(' | ') }; }).filter((item) => item.label && item.value);
const linkLines = (items?: LinkItem[]) => (items ?? []).map((item) => `${item.labelAr} | ${item.url} | ${item.category}${item.labelEn ? ` | ${item.labelEn}` : ''}`).join('\n');
const parseLinkLines = (value: string): LinkItem[] => lines(value).map((row) => { const [labelAr, url, category = 'OTHER', labelEn] = row.split('|').map((x) => x.trim()); return { labelAr, url, category, ...(labelEn ? { labelEn } : {}) }; }).filter((item) => item.labelAr && item.url);
const evidenceLines = (items?: EvidenceItem[]) => (items ?? []).map((item) => `${item.label} | ${item.url} | ${item.sourceType}`).join('\n');
const parseEvidenceLines = (value: string): EvidenceItem[] => lines(value).map((row) => { const [label, url, sourceType = 'OTHER_OFFICIAL'] = row.split('|').map((x) => x.trim()); return { label, url, sourceType }; }).filter((item) => item.label && item.url);
const dateInput = (value?: string | null) => value ? value.slice(0, 10) : '';
const optionLabel = (item: RefOption, isAr: boolean) => (isAr ? item.nameAr : item.name) || item.name || item.nameAr || item.code || item.isoCode || item.currencyCode || item.languageCode || item.id;

function flagEmoji(code: string) { try { return String.fromCodePoint(...code.toUpperCase().split('').map((char) => 127397 + char.charCodeAt(0))); } catch { return '🌐'; } }
function unwrapData<T>(value: any): T[] { return Array.isArray(value) ? value : Array.isArray(value?.data) ? value.data : []; }

export function StudyDestinationDetailPage() {
  const { countryIso2Code = '' } = useParams();
  const iso2 = countryIso2Code.toUpperCase();
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [graph, setGraph] = useState<CountryGraph | null>(null);
  const [languages, setLanguages] = useState<RefOption[]>([]);
  const [currencies, setCurrencies] = useState<RefOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [tab, setTab] = useState<TabKey>('overview');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hydrateForm = useCallback((profile: Profile | null) => {
    if (!profile) return setForm(emptyForm);
    setForm({
      overviewAr: profile.overviewAr ?? '', overviewEn: profile.overviewEn ?? '', studySystemSummaryAr: profile.studySystemSummaryAr ?? '', studySystemSummaryEn: profile.studySystemSummaryEn ?? '',
      admissionHighlightsAr: stringifyLines(profile.admissionHighlightsAr), admissionHighlightsEn: stringifyLines(profile.admissionHighlightsEn), visaSummaryAr: profile.visaSummaryAr ?? '', visaSummaryEn: profile.visaSummaryEn ?? '',
      visaRequirementsAr: stringifyLines(profile.visaRequirementsAr), visaRequirementsEn: stringifyLines(profile.visaRequirementsEn), visaOfficialUrl: profile.visaOfficialUrl ?? '', livingCostTier: profile.livingCostTier ?? '',
      averageMonthlyLivingCostMin: profile.averageMonthlyLivingCostMin == null ? '' : String(profile.averageMonthlyLivingCostMin), averageMonthlyLivingCostMax: profile.averageMonthlyLivingCostMax == null ? '' : String(profile.averageMonthlyLivingCostMax),
      livingCostCurrencyReferenceId: profile.livingCostCurrencyReferenceId ?? '', costHighlightsAr: costLines(profile.costHighlightsAr), costHighlightsEn: costLines(profile.costHighlightsEn),
      studentLifeHighlightsAr: stringifyLines(profile.studentLifeHighlightsAr), studentLifeHighlightsEn: stringifyLines(profile.studentLifeHighlightsEn), officialLinks: linkLines(profile.officialLinks), evidenceSources: evidenceLines(profile.evidenceSources),
      sourceAuditDate: dateInput(profile.sourceAuditDate), studyLanguageReferenceIds: profile.studyLanguageReferenceIds ?? [], isFeatured: profile.isFeatured,
    });
  }, []);

  const load = useCallback(async () => {
    if (!iso2) return;
    setLoading(true); setError(null);
    try {
      const [detail, relationResult, languageResult, currencyResult] = await Promise.all([
        adminApiClient.request<Aggregate>(`/admin/study-destinations/${encodeURIComponent(iso2)}`),
        adminApiClient.request<CountryGraph>(`/admin/study-destinations/${encodeURIComponent(iso2)}/relationships?page=1&pageSize=50&locale=${isAr ? 'ar' : 'en'}`),
        adminApiClient.request<any>('/admin/reference-data/languages?page=1&pageSize=250'),
        adminApiClient.request<any>('/admin/reference-data/currencies?page=1&pageSize=250'),
      ]);
      setAggregate(detail); setGraph(relationResult); setLanguages(unwrapData<RefOption>(languageResult)); setCurrencies(unwrapData<RefOption>(currencyResult)); hydrateForm(detail.profile);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'STUDY_DESTINATION_LOAD_FAILED'); }
    finally { setLoading(false); }
  }, [hydrateForm, isAr, iso2]);

  useEffect(() => { load(); }, [load]);

  const payload = useMemo(() => ({
    overviewAr: form.overviewAr || null, overviewEn: form.overviewEn || null, studySystemSummaryAr: form.studySystemSummaryAr || null, studySystemSummaryEn: form.studySystemSummaryEn || null,
    admissionHighlightsAr: lines(form.admissionHighlightsAr), admissionHighlightsEn: lines(form.admissionHighlightsEn), visaSummaryAr: form.visaSummaryAr || null, visaSummaryEn: form.visaSummaryEn || null,
    visaRequirementsAr: lines(form.visaRequirementsAr), visaRequirementsEn: lines(form.visaRequirementsEn), visaOfficialUrl: form.visaOfficialUrl || null, livingCostTier: form.livingCostTier || null,
    averageMonthlyLivingCostMin: form.averageMonthlyLivingCostMin === '' ? null : Number(form.averageMonthlyLivingCostMin), averageMonthlyLivingCostMax: form.averageMonthlyLivingCostMax === '' ? null : Number(form.averageMonthlyLivingCostMax),
    livingCostCurrencyReferenceId: form.livingCostCurrencyReferenceId || null, costHighlightsAr: parseCostLines(form.costHighlightsAr), costHighlightsEn: parseCostLines(form.costHighlightsEn),
    studentLifeHighlightsAr: lines(form.studentLifeHighlightsAr), studentLifeHighlightsEn: lines(form.studentLifeHighlightsEn), officialLinks: parseLinkLines(form.officialLinks), evidenceSources: parseEvidenceLines(form.evidenceSources),
    sourceAuditDate: form.sourceAuditDate ? new Date(`${form.sourceAuditDate}T00:00:00.000Z`).toISOString() : null, studyLanguageReferenceIds: form.studyLanguageReferenceIds, isFeatured: form.isFeatured,
  }), [form]);

  const save = async () => {
    setSaving(true); setError(null); setNotice(null);
    try { const next = await adminApiClient.request<Aggregate>(`/admin/study-destinations/${encodeURIComponent(iso2)}/profile`, { method: 'PUT', body: JSON.stringify(payload) }); setAggregate(next); hydrateForm(next.profile); setNotice(isAr ? 'تم حفظ ملف الوجهة. أي تعديل في المحتوى الموثق يعيد حالة المصدر إلى غير موثق تلقائيًا.' : 'Destination saved. Source-sensitive edits automatically reset verification.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'SAVE_FAILED'); }
    finally { setSaving(false); }
  };

  const execute = async (name: 'submit-review' | 'verify-source' | 'publish' | 'archive') => {
    setAction(name); setError(null); setNotice(null);
    try { const next = await adminApiClient.request<Aggregate>(`/admin/study-destinations/${encodeURIComponent(iso2)}/${name}`, { method: 'POST', body: '{}' }); setAggregate(next); hydrateForm(next.profile); setNotice(isAr ? 'تم تنفيذ الإجراء بنجاح.' : 'Action completed successfully.'); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'ACTION_FAILED'); }
    finally { setAction(null); }
  };

  if (loading) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-[#142B5F]" /></div>;
  if (!aggregate) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error || 'STUDY_DESTINATION_NOT_FOUND'}</div>;
  const { country, profile, readiness } = aggregate;
  const blocking = readiness?.checks.filter((check) => check.blocking && !check.complete) ?? [];

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Globe2 }> = [
    { key: 'overview', label: isAr ? 'التعريف' : 'Overview', icon: Globe2 },
    { key: 'study', label: isAr ? 'الدراسة والقبول' : 'Study & admission', icon: GraduationCap },
    { key: 'visa', label: isAr ? 'التأشيرة' : 'Visa', icon: Stamp },
    { key: 'living', label: isAr ? 'المعيشة والحياة' : 'Living & life', icon: WalletCards },
    { key: 'relations', label: isAr ? 'المواقع والعلاقات' : 'Locations & relations', icon: Building2 },
    { key: 'sources', label: isAr ? 'المصادر والروابط' : 'Sources & links', icon: FileCheck2 },
    { key: 'publish', label: isAr ? 'الجاهزية والنشر' : 'Readiness & publish', icon: ShieldCheck },
  ];

  return <div className="mx-auto max-w-7xl space-y-5" dir={isAr ? 'rtl' : 'ltr'}>
    <header className="rounded-3xl border border-[#142B5F]/15 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-4">
          <Link to="/study-destinations" className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"><ArrowLeft className={`h-5 w-5 ${isAr ? 'rotate-180' : ''}`} /></Link>
          <div className="text-5xl">{flagEmoji(country.iso2Code)}</div>
          <div><div className="flex flex-wrap items-center gap-2"><h1 className="text-2xl font-black text-slate-900">{isAr ? (country.nameAr || country.name) : country.name}</h1><Badge value={profile?.status ?? 'NO_PROFILE'} /></div><p className="mt-1 text-xs text-slate-500">{country.iso2Code} · {country.iso3Code} · {country.region || '-'} · Canonical Country ID: {country.id}</p></div>
        </div>
        <div className="flex flex-wrap gap-2"><button onClick={load} className="rounded-xl border border-slate-200 p-2.5 text-slate-600"><RefreshCw className="h-4 w-4" /></button><button disabled={saving} onClick={save} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-2.5 text-sm font-black text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? (isAr ? 'حفظ...' : 'Saving...') : (isAr ? 'حفظ' : 'Save')}</button></div>
      </div>
    </header>

    {error && <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800"><AlertCircle className="h-5 w-5" />{error}</div>}
    {notice && <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800"><CheckCircle2 className="h-5 w-5" />{notice}</div>}

    <div className="grid gap-5 xl:grid-cols-[220px_minmax(0,1fr)]">
      <nav className="h-fit rounded-2xl border border-slate-200 bg-white p-2 shadow-sm">{tabs.map(({ key, label, icon: Icon }) => <button key={key} onClick={() => setTab(key)} className={`mb-1 flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold transition ${tab === key ? 'bg-[#142B5F] text-white' : 'text-slate-600 hover:bg-slate-50'}`}><Icon className="h-4 w-4" />{label}</button>)}</nav>
      <main className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        {tab === 'overview' && <OverviewPanel country={country} form={form} setForm={setForm} isAr={isAr} />}
        {tab === 'study' && <StudyPanel form={form} setForm={setForm} languages={languages} isAr={isAr} />}
        {tab === 'visa' && <VisaPanel form={form} setForm={setForm} isAr={isAr} />}
        {tab === 'living' && <LivingPanel form={form} setForm={setForm} currencies={currencies} isAr={isAr} />}
        {tab === 'relations' && <RelationsPanel graph={graph} country={country} isAr={isAr} />}
        {tab === 'sources' && <SourcesPanel form={form} setForm={setForm} profile={profile} isAr={isAr} />}
        {tab === 'publish' && <PublishPanel profile={profile} readiness={readiness} blocking={blocking} action={action} execute={execute} isAr={isAr} />}
      </main>
    </div>
  </div>;
}

function OverviewPanel({ country, form, setForm, isAr }: { country: ReferenceCountry; form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; isAr: boolean }) {
  return <section className="space-y-5"><Title icon={Globe2}>{isAr ? 'هوية الدولة وملف الوجهة' : 'Country identity & destination profile'}</Title><div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">{isAr ? 'هوية ISO والعملة/اللغة الافتراضية تظل مملوكة لـReference Data وهي للقراءة فقط هنا. هذا القسم يحرر محتوى وجهة الدراسة فقط.' : 'ISO identity and default reference fields remain owned by Reference Data and are read-only here.'}</div><div className="grid gap-3 md:grid-cols-3"><ReadOnly label="ISO2" value={country.iso2Code} /><ReadOnly label="ISO3" value={country.iso3Code} /><ReadOnly label={isAr ? 'المنطقة' : 'Region'} value={[country.region, country.subregion].filter(Boolean).join(' / ')} /><ReadOnly label={isAr ? 'العملة المرجعية' : 'Reference currency'} value={country.defaultCurrencyCode} /><ReadOnly label={isAr ? 'اللغة المرجعية' : 'Reference language'} value={country.defaultLanguageCode} /><ReadOnly label={isAr ? 'رمز الاتصال' : 'Calling code'} value={country.callingCode} /></div><div className="grid gap-4 lg:grid-cols-2"><TextArea label={isAr ? 'نبذة عربية' : 'Arabic overview'} value={form.overviewAr} onChange={(value) => setForm((x) => ({ ...x, overviewAr: value }))} rows={8} /><TextArea label={isAr ? 'نبذة إنجليزية' : 'English overview'} value={form.overviewEn} onChange={(value) => setForm((x) => ({ ...x, overviewEn: value }))} rows={8} dir="ltr" /></div><label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-bold"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm((x) => ({ ...x, isFeatured: e.target.checked }))} className="h-4 w-4 accent-[#142B5F]" />{isAr ? 'تمييز الدولة في واجهة الوجهات بعد النشر' : 'Feature this destination after publication'}</label></section>;
}

function StudyPanel({ form, setForm, languages, isAr }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; languages: RefOption[]; isAr: boolean }) {
  return <section className="space-y-5"><Title icon={BookOpenCheck}>{isAr ? 'نظام الدراسة والقبول' : 'Study system & admission'}</Title><div className="grid gap-4 lg:grid-cols-2"><TextArea label={isAr ? 'ملخص نظام الدراسة — عربي' : 'Study system — Arabic'} value={form.studySystemSummaryAr} onChange={(value) => setForm((x) => ({ ...x, studySystemSummaryAr: value }))} rows={7} /><TextArea label={isAr ? 'ملخص نظام الدراسة — إنجليزي' : 'Study system — English'} value={form.studySystemSummaryEn} onChange={(value) => setForm((x) => ({ ...x, studySystemSummaryEn: value }))} rows={7} dir="ltr" /><LineEditor label={isAr ? 'أبرز نقاط القبول — عربي (سطر لكل نقطة)' : 'Admission highlights — Arabic'} value={form.admissionHighlightsAr} onChange={(value) => setForm((x) => ({ ...x, admissionHighlightsAr: value }))} /><LineEditor label={isAr ? 'أبرز نقاط القبول — إنجليزي' : 'Admission highlights — English'} value={form.admissionHighlightsEn} onChange={(value) => setForm((x) => ({ ...x, admissionHighlightsEn: value }))} dir="ltr" /></div><div><label className="mb-2 block text-sm font-black text-slate-800"><Languages className="me-2 inline h-4 w-4 text-[#142B5F]" />{isAr ? 'لغات الدراسة Canonical' : 'Canonical study languages'}</label><div className="grid max-h-64 gap-2 overflow-auto rounded-xl border border-slate-200 p-3 sm:grid-cols-2 lg:grid-cols-3">{languages.map((item) => <label key={item.id} className="flex items-center gap-2 rounded-lg p-2 text-sm hover:bg-slate-50"><input type="checkbox" checked={form.studyLanguageReferenceIds.includes(item.id)} onChange={(e) => setForm((x) => ({ ...x, studyLanguageReferenceIds: e.target.checked ? [...x.studyLanguageReferenceIds, item.id] : x.studyLanguageReferenceIds.filter((id) => id !== item.id) }))} className="accent-[#142B5F]" />{optionLabel(item, isAr)}</label>)}</div></div></section>;
}

function VisaPanel({ form, setForm, isAr }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; isAr: boolean }) {
  return <section className="space-y-5"><Title icon={Stamp}>{isAr ? 'التأشيرة والإقامة الطلابية' : 'Student visa & residence'}</Title><div className="grid gap-4 lg:grid-cols-2"><TextArea label={isAr ? 'ملخص التأشيرة — عربي' : 'Visa summary — Arabic'} value={form.visaSummaryAr} onChange={(value) => setForm((x) => ({ ...x, visaSummaryAr: value }))} rows={7} /><TextArea label={isAr ? 'ملخص التأشيرة — إنجليزي' : 'Visa summary — English'} value={form.visaSummaryEn} onChange={(value) => setForm((x) => ({ ...x, visaSummaryEn: value }))} rows={7} dir="ltr" /><LineEditor label={isAr ? 'متطلبات التأشيرة — عربي' : 'Visa requirements — Arabic'} value={form.visaRequirementsAr} onChange={(value) => setForm((x) => ({ ...x, visaRequirementsAr: value }))} /><LineEditor label={isAr ? 'متطلبات التأشيرة — إنجليزي' : 'Visa requirements — English'} value={form.visaRequirementsEn} onChange={(value) => setForm((x) => ({ ...x, visaRequirementsEn: value }))} dir="ltr" /></div><Input label={isAr ? 'الرابط الحكومي/الرسمي للتأشيرة' : 'Official visa URL'} value={form.visaOfficialUrl} onChange={(value) => setForm((x) => ({ ...x, visaOfficialUrl: value }))} placeholder="https://..." dir="ltr" /></section>;
}

function LivingPanel({ form, setForm, currencies, isAr }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; currencies: RefOption[]; isAr: boolean }) {
  return <section className="space-y-5"><Title icon={WalletCards}>{isAr ? 'تكلفة المعيشة والحياة الطلابية' : 'Living cost & student life'}</Title><div className="grid gap-3 md:grid-cols-4"><Select label={isAr ? 'مستوى التكلفة' : 'Cost tier'} value={form.livingCostTier} onChange={(value) => setForm((x) => ({ ...x, livingCostTier: value as FormState['livingCostTier'] }))} options={[['','—'],['LOW',isAr?'منخفض':'Low'],['MODERATE',isAr?'متوسط':'Moderate'],['HIGH',isAr?'مرتفع':'High'],['VERY_HIGH',isAr?'مرتفع جدًا':'Very high']]} /><Input label={isAr ? 'متوسط شهري — الحد الأدنى' : 'Monthly min'} value={form.averageMonthlyLivingCostMin} onChange={(value) => setForm((x) => ({ ...x, averageMonthlyLivingCostMin: value }))} type="number" /><Input label={isAr ? 'متوسط شهري — الحد الأعلى' : 'Monthly max'} value={form.averageMonthlyLivingCostMax} onChange={(value) => setForm((x) => ({ ...x, averageMonthlyLivingCostMax: value }))} type="number" /><label className="space-y-1.5"><span className="text-sm font-black text-slate-700">{isAr ? 'العملة Canonical' : 'Canonical currency'}</span><select value={form.livingCostCurrencyReferenceId} onChange={(e) => setForm((x) => ({ ...x, livingCostCurrencyReferenceId: e.target.value }))} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"><option value="">—</option>{currencies.map((item) => <option key={item.id} value={item.id}>{optionLabel(item, isAr)}</option>)}</select></label></div><div className="grid gap-4 lg:grid-cols-2"><LineEditor label={isAr ? 'تفاصيل التكلفة — عربي (العنصر | القيمة)' : 'Cost highlights — Arabic (label | value)'} value={form.costHighlightsAr} onChange={(value) => setForm((x) => ({ ...x, costHighlightsAr: value }))} /><LineEditor label={isAr ? 'تفاصيل التكلفة — إنجليزي' : 'Cost highlights — English'} value={form.costHighlightsEn} onChange={(value) => setForm((x) => ({ ...x, costHighlightsEn: value }))} dir="ltr" /><LineEditor label={isAr ? 'الحياة الطلابية — عربي' : 'Student life — Arabic'} value={form.studentLifeHighlightsAr} onChange={(value) => setForm((x) => ({ ...x, studentLifeHighlightsAr: value }))} /><LineEditor label={isAr ? 'الحياة الطلابية — إنجليزي' : 'Student life — English'} value={form.studentLifeHighlightsEn} onChange={(value) => setForm((x) => ({ ...x, studentLifeHighlightsEn: value }))} dir="ltr" /></div></section>;
}

function RelationsPanel({ graph, country, isAr }: { graph: CountryGraph | null; country: ReferenceCountry; isAr: boolean }) {
  if (!graph) return <Empty text={isAr ? 'تعذر تحميل شبكة العلاقات.' : 'Relationship graph unavailable.'} />;
  const r = graph.relationships;
  const universitiesHref = `/universities?countryReferenceId=${encodeURIComponent(country.id)}`;
  return <section className="space-y-6">
    <Title icon={Building2}>{isAr ? 'العلاقات المملوكة للمجالات الأخرى' : 'Owner-domain relationships'}</Title>
    <div className="rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
      {isAr ? 'لا نخزن جامعة/منحة/اختبار/خدمة/وظيفة كقائمة JSON داخل ملف الدولة. كل علاقة تُقرأ من المجال المالك باستخدام Country Reference ID أو ISO2 Canonical.' : 'Universities, scholarships, tests, services, and jobs remain owned by their domains and are composed by canonical country identity.'}
    </div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
      <RelationMetric icon={Building2} label={isAr?'جامعات':'Universities'} value={r.universities.total} />
      <RelationMetric icon={GraduationCap} label={isAr?'تخصصات':'Majors'} value={r.majors.length} />
      <RelationMetric icon={BadgeCheck} label={isAr?'منح':'Scholarships'} value={r.scholarships.total} />
      <RelationMetric icon={ScrollText} label={isAr?'اختبارات':'Tests'} value={r.internationalTests.total} />
      <RelationMetric icon={ShieldCheck} label={isAr?'خدمات':'Services'} value={r.services.total} />
      <RelationMetric icon={BriefcaseBusiness} label={isAr?'وظائف':'Jobs'} value={r.careerJobs.total} />
    </div>

    <div className="space-y-3 rounded-2xl border border-[#142B5F]/15 bg-[#142B5F]/5 p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="font-black text-slate-900">{isAr ? 'جامعات هذه الدولة' : 'Universities in this destination'}</h3>
          <p className="mt-1 text-xs text-slate-600">{isAr ? 'القائمة مأخوذة مباشرة من University Domain بواسطة Country Reference ID؛ لا توجد نسخة ثانية من بيانات الجامعة داخل الدولة.' : 'This list is read directly from University Domain using the canonical Country Reference ID.'}</p>
        </div>
        <Link to={universitiesHref} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#033b2d]">
          <Building2 className="h-4 w-4" />{isAr ? 'فتح قسم جامعات هذه الدولة' : 'Open this country’s universities'}<ExternalLink className="h-3.5 w-3.5" />
        </Link>
      </div>
      <RelationList title="" items={r.universities.data} detailBasePath="/universities" linkLabel={isAr ? 'فتح الجامعة' : 'Open university'} />
    </div>

    <div>
      <h3 className="mb-3 font-black text-slate-900">{isAr ? 'البرامج والتخصصات عبر الجامعات' : 'Programs & majors through universities'}</h3>
      {r.academicPrograms.length ? <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full text-sm"><thead className="bg-slate-50"><tr><th className="p-3 text-start">{isAr?'الجامعة':'University'}</th><th className="p-3 text-start">{isAr?'البرنامج':'Program'}</th><th className="p-3 text-start">{isAr?'التخصص':'Major'}</th><th className="p-3 text-start">{isAr?'الحالة':'State'}</th></tr></thead><tbody className="divide-y">{r.academicPrograms.map((p) => <tr key={p.ownerId}><td className="p-3"><Link to={`/universities/${encodeURIComponent(p.universityOwnerId)}`} className="inline-flex items-center gap-1.5 font-bold text-[#142B5F] hover:underline">{p.universityDisplayName}<ExternalLink className="h-3.5 w-3.5" /></Link></td><td className="p-3 font-semibold">{p.sourceProgramName}</td><td className="p-3">{p.majorOwnerId ? <Link to={`/majors/${encodeURIComponent(p.majorOwnerId)}`} className="font-mono text-xs font-bold text-[#142B5F] hover:underline">{p.majorOwnerId}</Link> : '-'}</td><td className="p-3"><Badge value={p.majorMappingState} /></td></tr>)}</tbody></table></div> : <Empty text={isAr ? 'لا توجد برامج منشورة مرتبطة بعد.' : 'No published linked programs yet.'} />}
    </div>

    <RelationList title={isAr ? 'التخصصات Canonical المرتبطة عبر برامج الجامعات' : 'Canonical majors linked through university programs'} items={r.majors} detailBasePath="/majors" linkLabel={isAr ? 'فتح التخصص' : 'Open major'} />
    <RelationList title={isAr ? 'المنح المنشورة' : 'Published scholarships'} items={r.scholarships.data} detailBasePath="/scholarships" linkLabel={isAr ? 'فتح المنحة' : 'Open scholarship'} />
    <RelationList title={isAr ? 'الاختبارات المرتبطة بالدولة' : 'Country-linked international tests'} items={r.internationalTests.data} detailBasePath="/international-tests" linkLabel={isAr ? 'فتح الاختبار' : 'Open test'} />
    <RelationList title={isAr ? 'الخدمات المتاحة لهذه الدولة' : 'Services supporting this country'} items={r.services.data} />
    <RelationList title={isAr ? 'الوظائف في هذه الدولة' : 'Jobs in this country'} items={r.careerJobs.data} />
    <div><h3 className="mb-2 font-black text-slate-900">{isAr ? 'دورات مزودين مقرهم في الدولة' : 'Provider-headquarters courses'}</h3><div className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold text-amber-900">{isAr ? 'هذه ليست «دورات للدراسة في الدولة». العلاقة تعني فقط أن مقر مزود الدورة في الدولة، لذلك لا تُستخدم كدليل على وجهة الدراسة.' : 'These are not courses “in” the study destination; the relationship is provider headquarters only.'}</div><RelationList title="" items={r.providerHeadquartersCourses.data} /></div>
    <RelationList title={isAr ? 'محتوى CMS المتعلق بالدولة' : 'Country editorial content'} items={r.editorialContent.map((item) => ({ ownerId: item.contentId, displayName: item.title, slug: item.slug }))} />
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600">Country canonical owner: <span className="font-mono">{country.id}</span></div>
  </section>;
}
function SourcesPanel({ form, setForm, profile, isAr }: { form: FormState; setForm: React.Dispatch<React.SetStateAction<FormState>>; profile: Profile | null; isAr: boolean }) {
  return <section className="space-y-5"><Title icon={FileCheck2}>{isAr ? 'المصادر الرسمية والروابط' : 'Official sources & links'}</Title><div className={`rounded-xl border p-4 text-sm font-bold ${profile?.sourceVerificationStatus === 'VERIFIED' ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{isAr ? `حالة التحقق: ${profile?.sourceVerificationStatus ?? 'UNVERIFIED'}` : `Verification: ${profile?.sourceVerificationStatus ?? 'UNVERIFIED'}`}</div><Input label={isAr ? 'تاريخ تدقيق المصادر' : 'Source audit date'} value={form.sourceAuditDate} onChange={(value) => setForm((x) => ({ ...x, sourceAuditDate: value }))} type="date" /><LineEditor label={isAr ? 'الروابط الرسمية — سطر: الاسم | الرابط | التصنيف | الاسم الإنجليزي اختياري' : 'Official links: label | URL | category | optional English label'} value={form.officialLinks} onChange={(value) => setForm((x) => ({ ...x, officialLinks: value }))} rows={8} dir="ltr" /><p className="text-xs text-slate-500">Categories: GOVERNMENT_STUDY, IMMIGRATION_VISA, EDUCATION_AUTHORITY, SCHOLARSHIP_PORTAL, COST_OF_LIVING, STUDENT_SUPPORT, OTHER</p><LineEditor label={isAr ? 'أدلة التحقق — سطر: الوصف | الرابط | نوع المصدر' : 'Evidence: label | URL | source type'} value={form.evidenceSources} onChange={(value) => setForm((x) => ({ ...x, evidenceSources: value }))} rows={8} dir="ltr" /><p className="text-xs text-slate-500">Source types: GOVERNMENT, OFFICIAL_EDUCATION_AUTHORITY, OFFICIAL_IMMIGRATION, OFFICIAL_STATISTICS, OTHER_OFFICIAL</p><div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs text-slate-700">{isAr ? 'زر «توثيق المصادر» موجود في مرحلة الجاهزية. لا يمكن ضبط VERIFIED يدويًا من نموذج التحرير، وأي تغيير جوهري بعد التوثيق يعيده إلى UNVERIFIED.' : 'VERIFIED cannot be set through the editor. Source-sensitive edits automatically reset verification.'}</div></section>;
}

function PublishPanel({ profile, readiness, blocking, action, execute, isAr }: { profile: Profile | null; readiness: Readiness | null; blocking: Readiness['checks']; action: string | null; execute: (name: 'submit-review'|'verify-source'|'publish'|'archive') => Promise<void>; isAr: boolean }) {
  if (!profile || !readiness) return <section className="space-y-4"><Title icon={ShieldCheck}>{isAr ? 'الجاهزية والنشر' : 'Readiness & publication'}</Title><div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">{isAr ? 'احفظ الملف أولًا لإنشاء Profile مملوك لوجهة الدراسة.' : 'Save once to create the study-destination profile.'}</div></section>;
  return <section className="space-y-5"><Title icon={ShieldCheck}>{isAr ? 'بوابة الجاهزية والنشر' : 'Readiness & publication gate'}</Title><div className="grid gap-3 sm:grid-cols-3"><ReadOnly label={isAr?'الحالة':'Status'} value={profile.status} /><ReadOnly label={isAr?'الاكتمال':'Completeness'} value={profile.completenessStatus} /><ReadOnly label={isAr?'توثيق المصدر':'Source verification'} value={profile.sourceVerificationStatus} /></div><div className="space-y-2">{readiness.checks.map((check) => <div key={check.key} className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${check.complete ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}>{check.complete ? <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" /> : <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />}<div><div className="font-black">{check.label}</div><div className="text-xs opacity-80">{check.message || check.key}</div></div></div>)}</div><div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4"><ActionButton disabled={Boolean(action) || !readiness.readyForReview || profile.status === 'PUBLISHED'} onClick={() => execute('submit-review')} label={isAr?'إرسال للمراجعة':'Submit for review'} /><ActionButton disabled={Boolean(action)} onClick={() => execute('verify-source')} label={isAr?'توثيق المصادر':'Verify sources'} gold /><ActionButton disabled={Boolean(action) || profile.status !== 'IN_REVIEW' || !readiness.readyForPublish} onClick={() => execute('publish')} label={isAr?'نشر وجهة الدراسة':'Publish destination'} primary /><ActionButton disabled={Boolean(action) || profile.status === 'ARCHIVED'} onClick={() => execute('archive')} label={isAr?'أرشفة':'Archive'} danger /></div>{blocking.length > 0 && <p className="text-xs font-semibold text-amber-800">{isAr ? `يتبقى ${blocking.length} مانع/موانع قبل النشر.` : `${blocking.length} publishing blocker(s) remain.`}</p>}</section>;
}

function Title({ icon: Icon, children }: { icon: typeof Globe2; children: React.ReactNode }) { return <h2 className="flex items-center gap-2 border-b border-slate-100 pb-3 text-xl font-black text-slate-900"><Icon className="h-5 w-5 text-[#142B5F]" />{children}</h2>; }
function ReadOnly({ label, value }: { label: string; value: unknown }) { return <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><div className="text-[11px] font-bold uppercase text-slate-400">{label}</div><div className="mt-1 break-words text-sm font-bold text-slate-800">{String(value ?? '') || '-'}</div></div>; }
function TextArea({ label, value, onChange, rows = 6, dir }: { label: string; value: string; onChange: (value: string) => void; rows?: number; dir?: 'ltr'|'rtl' }) { return <label className="space-y-1.5"><span className="text-sm font-black text-slate-700">{label}</span><textarea rows={rows} dir={dir} value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#142B5F] focus:ring-2 focus:ring-[#142B5F]/10" /></label>; }
function LineEditor(props: { label: string; value: string; onChange: (value: string) => void; rows?: number; dir?: 'ltr'|'rtl' }) { return <TextArea {...props} rows={props.rows ?? 7} />; }
function Input({ label, value, onChange, placeholder, type='text', dir }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; dir?: 'ltr'|'rtl' }) { return <label className="space-y-1.5"><span className="text-sm font-black text-slate-700">{label}</span><input type={type} dir={dir} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#142B5F] focus:ring-2 focus:ring-[#142B5F]/10" /></label>; }
function Select({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: Array<[string,string]> }) { return <label className="space-y-1.5"><span className="text-sm font-black text-slate-700">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm">{options.map(([v,l]) => <option key={v} value={v}>{l}</option>)}</select></label>; }
function Badge({ value }: { value: string }) { const bad = /INCOMPLETE|UNVERIFIED|NO_PROFILE|UNMAPPED|DRAFT/.test(value); const good = /PUBLISHED|VERIFIED|COMPLETE|CANONICALLY_MAPPED|PASS/.test(value); return <span className={`rounded-full px-2.5 py-1 text-[11px] font-black ${good ? 'bg-emerald-100 text-emerald-800' : bad ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}>{value}</span>; }
function RelationMetric({ icon: Icon, label, value }: { icon: typeof Building2; label: string; value: number }) { return <div className="rounded-xl border border-slate-200 p-3"><Icon className="h-4 w-4 text-[#142B5F]" /><div className="mt-2 text-xl font-black">{value}</div><div className="text-[11px] font-bold text-slate-500">{label}</div></div>; }
function RelationList({ title, items, detailBasePath, linkLabel }: { title: string; items: GraphIdentity[]; detailBasePath?: string; linkLabel?: string }) { return <div>{title && <h3 className="mb-3 font-black text-slate-900">{title}</h3>}{items.length ? <div className="grid gap-2 md:grid-cols-2">{items.map((item) => { const href = detailBasePath ? `${detailBasePath}/${encodeURIComponent(item.ownerId)}` : null; return <div key={item.ownerId} className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"><div className="min-w-0"><div className="truncate text-sm font-bold">{item.displayName}</div><div className="truncate font-mono text-[10px] text-slate-400">{item.ownerId}</div></div>{href ? <Link to={href} title={linkLabel || item.displayName} className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#142B5F]/20 bg-[#142B5F]/5 px-2.5 py-1.5 text-[11px] font-black text-[#142B5F] hover:bg-[#142B5F]/10"><span className="hidden sm:inline">{linkLabel || 'Open'}</span><ExternalLink className="h-3.5 w-3.5" /></Link> : item.slug ? <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" /> : null}</div>; })}</div> : <Empty text="—" />}</div>; }
function Empty({ text }: { text: string }) { return <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">{text}</div>; }
function ActionButton({ label, onClick, disabled, primary, gold, danger }: { label: string; onClick: () => void; disabled: boolean; primary?: boolean; gold?: boolean; danger?: boolean }) { const style = primary ? 'bg-[#142B5F] text-white' : gold ? 'bg-[#D6A43B] text-slate-900' : danger ? 'bg-rose-50 text-rose-700 border border-rose-200' : 'bg-slate-100 text-slate-700'; return <button disabled={disabled} onClick={onClick} className={`rounded-xl px-4 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${style}`}>{label}</button>; }
