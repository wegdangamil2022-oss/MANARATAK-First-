import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type {
  ScholarshipBenefitDto,
  ScholarshipDegreeTargetDto,
  ScholarshipDto,
  ScholarshipEligibilityItemDto,
  ScholarshipMajorTargetDto,
  ScholarshipRequiredDocumentDto,
} from '@manaratak/domain';
import {
  Archive,
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  GraduationCap,
  History,
  Landmark,
  Loader2,
  Plus,
  Save,
  ShieldCheck,
  Trash2,
  XCircle,
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';
import {
  scholarshipCatalogApi,
  type ScholarshipCatalogDetailResponse,
  type ScholarshipCatalogUpdate,
} from '../api/scholarshipCatalog';

type UiText = Record<string, string>;

const copy: Record<'ar' | 'en', UiText> = {
  en: {
    back: 'Back to scholarships',
    title: 'Canonical Scholarship Editor',
    subtitle: 'Catalog data is read from and written to the normalized Scholarship model. Import staging is not edited here.',
    save: 'Save canonical data',
    saved: 'Canonical Scholarship data saved.',
    identity: 'Identity & lifecycle',
    funding: 'Funding',
    benefits: 'Benefits',
    degrees: 'Degree targets',
    majors: 'Major targets',
    eligibility: 'Eligibility requirements',
    documents: 'Documents & test requirements',
    sources: 'Source evidence & provenance',
    universities: 'University / program links',
    health: 'Data health',
    missing: 'Missing fields',
    unresolved: 'Unresolved canonical links',
    history: 'Change history',
    compatibility: 'Legacy compatibility snapshot',
    compatibilityNote: 'Read-only during WP12-9. It is not the source of truth for canonical editing.',
    noRows: 'No rows stored.',
    noMissing: 'No blocking missing fields.',
    noUnresolved: 'No unresolved canonical links.',
    noHistory: 'No Scholarship audit events returned.',
    workflow: 'Workflow',
    completeness: 'Completeness',
    verification: 'Verification',
    publication: 'Publication',
    publicId: 'Public ID',
    canonicalName: 'Canonical name',
    dedupe: 'Dedupe key',
    name: 'Display name',
    provider: 'Provider',
    academicYear: 'Academic year',
    cycle: 'Cycle',
    country: 'Country source label',
    countryRef: 'Country canonical reference',
    countryScope: 'Country scope',
    language: 'Study language source label',
    languageRef: 'Language canonical reference',
    languageResolution: 'Language resolution',
    deadline: 'Application deadline',
    deadlineType: 'Deadline type',
    applicationMethod: 'Application method',
    applicationUrl: 'Application URL',
    officialUrl: 'Official source URL',
    sourceUrl: 'Source URL',
    officialWebsite: 'Official website',
    sourceLocale: 'Source locale',
    importRecord: 'Import record',
    lastVerified: 'Last verified',
    fundingType: 'Funding type',
    amount: 'Amount (minor units)',
    currencyCode: 'Currency code',
    fullyFunded: 'Fully funded',
    add: 'Add',
    remove: 'Remove',
    required: 'Required',
    optional: 'Optional',
    canonicalLocked: 'Canonical IDs are read-only here; resolution belongs to the canonical review flow.',
    explicitPublish: 'Transfer is not publication. Public visibility changes only through the explicit lifecycle commands below.',
    markReady: 'Mark ready for review',
    markPublishable: 'Mark ready to publish',
    publish: 'Publish',
    unpublish: 'Unpublish',
    archive: 'Archive',
    reject: 'Reject',
    actionDone: 'Lifecycle action completed.',
    auditUnavailable: 'Audit history is unavailable in this composition.',
  },
  ar: {
    back: 'العودة إلى المنح',
    title: 'محرر المنحة القانوني',
    subtitle: 'القراءة والحفظ من نموذج Scholarship المطبّع مباشرة. سجلات Staging لا تُحرر من هذه الصفحة.',
    save: 'حفظ البيانات القانونية',
    saved: 'تم حفظ بيانات المنحة القانونية.',
    identity: 'الهوية ودورة الحياة',
    funding: 'التمويل',
    benefits: 'المزايا',
    degrees: 'الدرجات المستهدفة',
    majors: 'التخصصات المستهدفة',
    eligibility: 'متطلبات الأهلية',
    documents: 'المستندات ومتطلبات الاختبارات',
    sources: 'أدلة المصادر والأثر',
    universities: 'روابط الجامعات / البرامج',
    health: 'حالة البيانات',
    missing: 'الحقول الناقصة',
    unresolved: 'الروابط القانونية غير المحسومة',
    history: 'سجل التغييرات',
    compatibility: 'لقطة التوافق القديمة',
    compatibilityNote: 'للقراءة فقط في WP12-9، وليست مصدر الحقيقة للتحرير القانوني.',
    noRows: 'لا توجد سجلات محفوظة.',
    noMissing: 'لا توجد حقول ناقصة مانعة.',
    noUnresolved: 'لا توجد روابط قانونية غير محسومة.',
    noHistory: 'لم تُرجع خدمة التدقيق أحداثًا لهذه المنحة.',
    workflow: 'سير العمل',
    completeness: 'الاكتمال',
    verification: 'التحقق',
    publication: 'النشر',
    publicId: 'المعرف العام',
    canonicalName: 'الاسم القانوني',
    dedupe: 'مفتاح التكرار',
    name: 'اسم العرض',
    provider: 'الجهة المانحة',
    academicYear: 'العام الأكاديمي',
    cycle: 'الدورة',
    country: 'اسم الدولة من المصدر',
    countryRef: 'مرجع الدولة القانوني',
    countryScope: 'نطاق الدول',
    language: 'لغة الدراسة من المصدر',
    languageRef: 'مرجع اللغة القانوني',
    languageResolution: 'حالة ربط اللغة',
    deadline: 'الموعد النهائي',
    deadlineType: 'نوع الموعد',
    applicationMethod: 'طريقة التقديم',
    applicationUrl: 'رابط التقديم',
    officialUrl: 'المصدر الرسمي',
    sourceUrl: 'رابط المصدر',
    officialWebsite: 'الموقع الرسمي',
    sourceLocale: 'لغة المصدر',
    importRecord: 'سجل الاستيراد',
    lastVerified: 'آخر تحقق',
    fundingType: 'نوع التمويل',
    amount: 'المبلغ بالوحدات الصغرى',
    currencyCode: 'رمز العملة',
    fullyFunded: 'تمويل كامل',
    add: 'إضافة',
    remove: 'حذف',
    required: 'مطلوب',
    optional: 'اختياري',
    canonicalLocked: 'المعرفات القانونية للقراءة فقط هنا؛ حسمها يتم عبر مسار المراجعة القانونية.',
    explicitPublish: 'النقل إلى الكتالوج لا يعني النشر. الظهور للعامة لا يتغير إلا بأمر دورة حياة صريح أدناه.',
    markReady: 'جاهزة للمراجعة',
    markPublishable: 'جاهزة للنشر',
    publish: 'نشر',
    unpublish: 'إلغاء النشر',
    archive: 'أرشفة',
    reject: 'رفض',
    actionDone: 'تم تنفيذ أمر دورة الحياة.',
    auditUnavailable: 'سجل التدقيق غير متاح في هذا التركيب.',
  },
};

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
    benefits: (s.benefits ?? []).map((item) => ({ ...item })),
    degreeTargets: (s.degreeTargets ?? []).map((item) => ({ ...item })),
    majorTargets: (s.majorTargets ?? []).map((item) => ({ ...item })),
    eligibilityItems: (s.eligibilityItems ?? []).map((item) => ({ ...item })),
    requiredDocumentItems: (s.requiredDocumentItems ?? []).map((item) => ({ ...item })),
  };
}

function Card({ title, children }: { title: string; children: ReactNode }) {
  return <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold text-[#142B5F]">{title}</h2>{children}</section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-semibold text-[#203442]/75">{label}</span>{children}</label>;
}

function Input({ value, onChange, type = 'text', readOnly = false }: { value: unknown; onChange?: (value: string) => void; type?: string; readOnly?: boolean }) {
  return <input type={type} value={asText(value)} readOnly={readOnly} onChange={(event) => onChange?.(event.target.value)} className={`w-full rounded-lg border border-[#DDEFF2] px-3 py-2 text-sm text-[#203442] outline-none focus:border-[#21A7B4] focus:ring-2 focus:ring-[#21A7B4]/15 ${readOnly ? 'bg-[#FAF7F0] text-[#203442]/55' : 'bg-white'}`} />;
}

function Badge({ value }: { value: string }) {
  const bad = /FAILED|INCOMPLETE|UNRESOLVED|AMBIGUOUS|REJECTED/u.test(value);
  const warn = /PENDING|REVIEW|DRAFT|NOT_/u.test(value);
  const cls = bad ? 'border-red-200 bg-red-50 text-red-700' : warn ? 'border-amber-200 bg-amber-50 text-amber-800' : 'border-emerald-200 bg-emerald-50 text-emerald-700';
  return <span className={`inline-flex rounded-full border px-2 py-1 text-[11px] font-semibold ${cls}`}>{value}</span>;
}

export function ScholarshipDetailPage() {
  const { language } = useTranslation();
  const ui = copy[language === 'en' ? 'en' : 'ar'];
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [detail, setDetail] = useState<ScholarshipCatalogDetailResponse | null>(null);
  const [form, setForm] = useState<ScholarshipCatalogUpdate>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    try {
      const response = await scholarshipCatalogApi.detail(id);
      setDetail(response);
      setForm(toUpdate(response.scholarship));
    } catch (cause) {
      setDetail(null);
      setError(cause instanceof Error ? cause.message : 'SCHOLARSHIP_CATALOG_DETAIL_LOAD_FAILED');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [id]);

  const scholarship = detail?.scholarship;
  const benefits = form.benefits ?? [];
  const degrees = form.degreeTargets ?? [];
  const majors = form.majorTargets ?? [];
  const eligibility = useMemo(
    () => [...(form.eligibilityItems ?? [])].sort((a, b) => Number(a.priorityOrder ?? 0) - Number(b.priorityOrder ?? 0)),
    [form.eligibilityItems],
  );
  const documents = useMemo(
    () => [...(form.requiredDocumentItems ?? [])].sort((a, b) => Number(a.displayOrder ?? 0) - Number(b.displayOrder ?? 0)),
    [form.requiredDocumentItems],
  );

  const save = async () => {
    if (!id) return;
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await scholarshipCatalogApi.update(id, form);
      setMessage(ui.saved);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SCHOLARSHIP_CATALOG_SAVE_FAILED');
    } finally {
      setSaving(false);
    }
  };

  const run = async (command: Parameters<typeof scholarshipCatalogApi.command>[1]) => {
    if (!id) return;
    setAction(command);
    setError(null);
    setMessage(null);
    try {
      await scholarshipCatalogApi.command(id, command);
      setMessage(ui.actionDone);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'SCHOLARSHIP_LIFECYCLE_COMMAND_FAILED');
    } finally {
      setAction(null);
    }
  };

  if (loading && !detail) return <div className="flex h-72 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;
  if (!detail || !scholarship) return <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">{error ?? 'Scholarship not found.'}</div>;

  const legacy = (scholarship.optionalFields ?? {}) as Record<string, unknown>;

  return (
    <div className="mx-auto max-w-[1500px] space-y-5 font-['Cairo',sans-serif] text-[#203442]">
      <header className="rounded-2xl border border-[#DDEFF2] bg-gradient-to-r from-[#FAF7F0] via-white to-[#DDEFF2]/35 p-5 shadow-sm">
        <button type="button" onClick={() => navigate('/scholarships')} className="mb-3 inline-flex items-center gap-2 text-sm font-semibold text-[#0E7C86]"><ArrowLeft className="h-4 w-4" />{ui.back}</button>
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#0E7C86]">{ui.title}</p>
            <h1 className="mt-1 text-3xl font-black text-[#142B5F]">{scholarship.displayName}</h1>
            <p className="mt-2 max-w-3xl text-sm text-[#203442]/75">{ui.subtitle}</p>
            <div className="mt-3 flex flex-wrap gap-2"><Badge value={String(scholarship.status)} /><Badge value={String(scholarship.completenessStatus)} /><Badge value={String(scholarship.verificationStatus ?? 'PENDING')} /><Badge value={String(scholarship.publicationStatus ?? 'DRAFT')} /></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link to={`/scholarships/${id}/relationships`} className="rounded-lg border border-[#21A7B4]/35 bg-[#DDEFF2]/55 px-3 py-2 text-sm font-semibold text-[#0E7C86]">Canonical relationships</Link>
            {scholarship.status !== 'READY_TO_REVIEW' && scholarship.status !== 'PUBLISHED' && scholarship.completenessStatus !== 'INCOMPLETE' ? <button disabled={Boolean(action)} onClick={() => void run('mark-ready')} className="rounded-lg border px-3 py-2 text-sm font-semibold">{ui.markReady}</button> : null}
            {scholarship.status === 'READY_TO_REVIEW' && scholarship.completenessStatus === 'COMPLETE' ? <button disabled={Boolean(action)} onClick={() => void run('mark-publishable')} className="rounded-lg border border-[#21A7B4]/35 bg-[#DDEFF2]/55 px-3 py-2 text-sm font-semibold text-[#0E7C86]">{ui.markPublishable}</button> : null}
            {scholarship.status === 'READY_TO_PUBLISH' ? <button disabled={Boolean(action)} onClick={() => void run('publish')} className="rounded-lg bg-[#0E7C86] px-3 py-2 text-sm font-semibold text-white hover:bg-[#142B5F]">{ui.publish}</button> : null}
            {scholarship.publicationStatus === 'PUBLISHED' ? <button disabled={Boolean(action)} onClick={() => void run('unpublish')} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-900">{ui.unpublish}</button> : null}
            {scholarship.publicationStatus !== 'ARCHIVED' ? <button disabled={Boolean(action)} onClick={() => void run('archive')} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><Archive className="h-4 w-4" />{ui.archive}</button> : null}
            {scholarship.status !== 'REJECTED' && scholarship.publicationStatus !== 'PUBLISHED' ? <button disabled={Boolean(action)} onClick={() => void run('reject')} className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700">{ui.reject}</button> : null}
          </div>
        </div>
      </header>

      <div className="rounded-xl border border-[#21A7B4]/30 bg-[#DDEFF2]/45 p-4 text-sm text-[#142B5F]"><ShieldCheck className="mr-2 inline h-4 w-4" />{ui.explicitPublish}</div>
      {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"><XCircle className="mr-2 inline h-4 w-4" />{error}</div> : null}
      {message ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"><CheckCircle2 className="mr-2 inline h-4 w-4" />{message}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[1.4fr_0.6fr]">
        <div className="space-y-5">
          <Card title={ui.identity}>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <Field label={ui.publicId}><Input value={scholarship.publicId} readOnly /></Field>
              <Field label={ui.canonicalName}><Input value={scholarship.canonicalName} readOnly /></Field>
              <Field label={ui.dedupe}><Input value={scholarship.canonicalDedupKey} readOnly /></Field>
              <Field label={ui.name}><Input value={form.displayName} onChange={(displayName) => setForm((x) => ({ ...x, displayName }))} /></Field>
              <Field label={ui.provider}><Input value={form.providerName} onChange={(providerName) => setForm((x) => ({ ...x, providerName }))} /></Field>
              <Field label={ui.academicYear}><Input value={form.academicYear} onChange={(academicYear) => setForm((x) => ({ ...x, academicYear }))} /></Field>
              <Field label={ui.cycle}><Input value={form.cycleName} onChange={(cycleName) => setForm((x) => ({ ...x, cycleName }))} /></Field>
              <Field label={ui.country}><Input value={form.countrySourceLabel} onChange={(countrySourceLabel) => setForm((x) => ({ ...x, countrySourceLabel }))} /></Field>
              <Field label={ui.countryRef}><Input value={scholarship.countryReferenceId} readOnly /></Field>
              <Field label={ui.countryScope}><Input value={form.countryScope} onChange={(countryScope) => setForm((x) => ({ ...x, countryScope }))} /></Field>
              <Field label={ui.language}><Input value={form.studyLanguageSourceLabel} onChange={(studyLanguageSourceLabel) => setForm((x) => ({ ...x, studyLanguageSourceLabel }))} /></Field>
              <Field label={ui.languageRef}><Input value={scholarship.studyLanguageReferenceId} readOnly /></Field>
              <Field label={ui.languageResolution}><Input value={scholarship.studyLanguageResolutionStatus} readOnly /></Field>
              <Field label={ui.deadline}><Input type="date" value={dateInput(form.applicationDeadline)} onChange={(value) => setForm((x) => ({ ...x, applicationDeadline: value ? new Date(`${value}T00:00:00.000Z`).toISOString() : null }))} /></Field>
              <Field label={ui.deadlineType}><Input value={form.deadlineType} onChange={(deadlineType) => setForm((x) => ({ ...x, deadlineType }))} /></Field>
              <Field label={ui.applicationMethod}><Input value={form.applicationMethod} onChange={(applicationMethod) => setForm((x) => ({ ...x, applicationMethod }))} /></Field>
              <Field label={ui.sourceLocale}><Input value={form.sourceLocale} onChange={(sourceLocale) => setForm((x) => ({ ...x, sourceLocale }))} /></Field>
              <Field label={ui.applicationUrl}><Input value={form.applicationUrl} onChange={(applicationUrl) => setForm((x) => ({ ...x, applicationUrl }))} /></Field>
              <Field label={ui.officialUrl}><Input value={form.officialSourceUrl} onChange={(officialSourceUrl) => setForm((x) => ({ ...x, officialSourceUrl }))} /></Field>
              <Field label={ui.sourceUrl}><Input value={form.sourceUrl} onChange={(sourceUrl) => setForm((x) => ({ ...x, sourceUrl }))} /></Field>
              <Field label={ui.officialWebsite}><Input value={form.officialWebsite} onChange={(officialWebsite) => setForm((x) => ({ ...x, officialWebsite }))} /></Field>
              <Field label={ui.importRecord}><Input value={scholarship.sourceImportRecordId} readOnly /></Field>
              <Field label={ui.lastVerified}><Input value={scholarship.lastVerifiedAt ? new Date(scholarship.lastVerifiedAt).toISOString() : ''} readOnly /></Field>
            </div>
            <p className="mt-3 text-xs text-amber-700">{ui.canonicalLocked}</p>
          </Card>

          <Card title={ui.funding}>
            <div className="grid gap-3 md:grid-cols-4">
              <Field label={ui.fundingType}>
                <select value={asText(form.fundingTypeCode)} onChange={(event) => {
                  const fundingTypeCode = event.target.value || null;
                  setForm((x) => ({ ...x, fundingTypeCode, ...(fundingTypeCode === 'FULLY_FUNDED' ? { isFullyFunded: true } : fundingTypeCode === 'PARTIALLY_FUNDED' ? { isFullyFunded: false } : {}) }));
                }} className="w-full rounded-lg border px-3 py-2 text-sm">
                  <option value="">—</option><option value="FULLY_FUNDED">FULLY_FUNDED</option><option value="PARTIALLY_FUNDED">PARTIALLY_FUNDED</option>
                </select>
              </Field>
              <Field label={ui.fullyFunded}><Input value={form.isFullyFunded === undefined ? '—' : form.isFullyFunded ? 'YES' : 'NO'} readOnly /></Field>
              <Field label={ui.amount}><Input value={form.amountMinorUnits} onChange={(amountMinorUnits) => setForm((x) => ({ ...x, amountMinorUnits }))} /></Field>
              <Field label={ui.currencyCode}><Input value={form.amountCurrencyCode} onChange={(amountCurrencyCode) => setForm((x) => ({ ...x, amountCurrencyCode }))} /></Field>
            </div>
          </Card>

          <Card title={ui.benefits}>
            <div className="space-y-3">
              {benefits.map((item, index) => <BenefitRow key={item.benefitKey} item={item} onChange={(next) => setForm((x) => ({ ...x, benefits: benefits.map((row, i) => i === index ? next : row) }))} onRemove={() => setForm((x) => ({ ...x, benefits: benefits.filter((_, i) => i !== index) }))} ui={ui} />)}
              {!benefits.length ? <Empty text={ui.noRows} /> : null}
              <button type="button" onClick={() => {
                const benefitKey = nextKey('BENEFIT', benefits as unknown as Array<Record<string, unknown>>, 'benefitKey');
                setForm((x) => ({ ...x, benefits: [...benefits, { benefitKey, benefitTypeCode: 'TUITION', displayOrder: benefits.length + 1 }] }));
              }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />{ui.add}</button>
            </div>
          </Card>

          <div className="grid gap-5 xl:grid-cols-2">
            <Card title={ui.degrees}>
              <TargetEditor kind="degree" rows={degrees} ui={ui} onChange={(degreeTargets) => setForm((x) => ({ ...x, degreeTargets }))} />
            </Card>
            <Card title={ui.majors}>
              <TargetEditor kind="major" rows={majors} ui={ui} onChange={(majorTargets) => setForm((x) => ({ ...x, majorTargets }))} />
            </Card>
          </div>

          <Card title={ui.eligibility}>
            <div className="space-y-3">
              {eligibility.map((item) => {
                const index = (form.eligibilityItems ?? []).findIndex((row) => row.itemKey === item.itemKey);
                return <EligibilityRow key={item.itemKey} item={item} ui={ui} onChange={(next) => setForm((x) => ({ ...x, eligibilityItems: (form.eligibilityItems ?? []).map((row, i) => i === index ? next : row) }))} onRemove={() => setForm((x) => ({ ...x, eligibilityItems: (form.eligibilityItems ?? []).filter((_, i) => i !== index) }))} />;
              })}
              {!eligibility.length ? <Empty text={ui.noRows} /> : null}
              <button type="button" onClick={() => {
                const rows = form.eligibilityItems ?? [];
                const itemKey = nextKey('ELIGIBILITY', rows as unknown as Array<Record<string, unknown>>, 'itemKey');
                setForm((x) => ({ ...x, eligibilityItems: [...rows, { itemKey, itemTypeCode: 'GENERAL', isRequired: true, priorityOrder: rows.length + 1, resolutionStatus: 'UNRESOLVED' }] }));
              }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />{ui.add}</button>
            </div>
          </Card>

          <Card title={ui.documents}>
            <div className="space-y-3">
              {documents.map((item) => {
                const index = (form.requiredDocumentItems ?? []).findIndex((row) => row.documentKey === item.documentKey);
                return <DocumentRow key={item.documentKey} item={item} ui={ui} onChange={(next) => setForm((x) => ({ ...x, requiredDocumentItems: (form.requiredDocumentItems ?? []).map((row, i) => i === index ? next : row) }))} onRemove={() => setForm((x) => ({ ...x, requiredDocumentItems: (form.requiredDocumentItems ?? []).filter((_, i) => i !== index) }))} />;
              })}
              {!documents.length ? <Empty text={ui.noRows} /> : null}
              <button type="button" onClick={() => {
                const rows = form.requiredDocumentItems ?? [];
                const documentKey = nextKey('DOCUMENT', rows as unknown as Array<Record<string, unknown>>, 'documentKey');
                setForm((x) => ({ ...x, requiredDocumentItems: [...rows, { documentKey, displayName: '', isRequired: true, displayOrder: rows.length + 1, resolutionStatus: 'UNRESOLVED' }] }));
              }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />{ui.add}</button>
            </div>
          </Card>

          <Card title={ui.sources}>
            <div className="grid gap-3 lg:grid-cols-2">
              {(scholarship.sourceEvidence ?? []).map((item) => <div key={item.evidenceKey} className="rounded-xl border p-4"><div className="flex items-center justify-between gap-3"><strong>{item.sourceName ?? item.sourceTypeCode}</strong>{item.isOfficial ? <Badge value="OFFICIAL" /> : null}</div><a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 block break-all text-sm text-blue-700">{item.sourceUrl}<ExternalLink className="ml-1 inline h-3 w-3" /></a><div className="mt-2 text-xs text-slate-500">hash: {display(item.sourceHash)} · import: {display(item.importRecordId)} · verified: {display(item.verifiedAt)}</div></div>)}
              {!scholarship.sourceEvidence?.length ? <Empty text={ui.noRows} /> : null}
            </div>
          </Card>

          <Card title={ui.universities}>
            <div className="space-y-3">
              {(scholarship.universityLinks ?? []).map((item) => <div key={item.linkKey} className="rounded-xl border p-4"><Landmark className="mr-2 inline h-4 w-4" /><strong>{item.sourceLabel ?? item.linkKey}</strong><div className="mt-2 grid gap-2 md:grid-cols-3 text-xs text-slate-600"><span>University: {display(item.universityId)}</span><span>Program: {display(item.academicProgramId)}</span><span>Resolution: {display(item.resolutionStatus)}</span></div></div>)}
              {!scholarship.universityLinks?.length ? <Empty text={ui.noRows} /> : null}
            </div>
          </Card>

          <div className="flex justify-end">
            <button disabled={saving} type="button" onClick={() => void save()} className="inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-5 py-3 text-sm font-bold text-white hover:bg-[#0E7C86] disabled:opacity-50">{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{ui.save}</button>
          </div>
        </div>

        <aside className="space-y-5">
          <Card title={ui.health}>
            <div className="mb-3 flex flex-wrap gap-2"><Badge value={detail.completeness.state} /><span className="text-xs text-slate-500">{detail.completeness.missingCount} missing</span></div>
            <h3 className="mb-2 text-sm font-bold">{ui.missing}</h3>
            {detail.completeness.missingFields.length ? <ul className="space-y-1 text-sm text-amber-900">{detail.completeness.missingFields.map((field) => <li key={field}>• {field}</li>)}</ul> : <p className="text-sm text-emerald-700">{ui.noMissing}</p>}
            <h3 className="mb-2 mt-5 text-sm font-bold">{ui.unresolved}</h3>
            {detail.unresolvedLinks.length ? <div className="space-y-2">{detail.unresolvedLinks.map((item) => <div key={`${item.area}:${item.key}`} className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs"><div className="flex justify-between gap-2"><strong>{item.area}</strong><Badge value={item.resolutionStatus} /></div><div className="mt-1">raw: {display(item.rawValue)}</div><div>canonical: {display(item.canonicalId)}</div></div>)}</div> : <p className="text-sm text-emerald-700">{ui.noUnresolved}</p>}
          </Card>

          <Card title={ui.history}>
            {!detail.historyAvailable ? <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{ui.auditUnavailable}</div> : null}
            <div className="space-y-2">{detail.history.map((event) => <div key={event.id} className="rounded-xl border p-3"><div className="flex items-center justify-between gap-2"><Badge value={event.action} /><History className="h-4 w-4 text-slate-400" /></div><div className="mt-2 text-xs text-slate-600">{new Date(event.timestamp).toLocaleString()}</div><div className="mt-1 text-xs">{event.actorId} · {event.source}</div></div>)}</div>
            {detail.historyAvailable && !detail.history.length ? <Empty text={ui.noHistory} /> : null}
          </Card>

          <Card title={ui.compatibility}>
            <p className="mb-3 text-xs text-slate-500">{ui.compatibilityNote}</p>
            <pre className="max-h-[500px] overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">{JSON.stringify(legacy, null, 2)}</pre>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl bg-[#FAF7F0] p-4 text-sm text-[#203442]/60">{text}</div>;
}

function BenefitRow({ item, onChange, onRemove, ui }: { item: ScholarshipBenefitDto; onChange: (item: ScholarshipBenefitDto) => void; onRemove: () => void; ui: UiText }) {
  return <div className="rounded-xl border p-4"><div className="grid gap-2 md:grid-cols-3"><Field label="Benefit key"><Input value={item.benefitKey} readOnly /></Field><Field label="Benefit type"><Input value={item.benefitTypeCode} onChange={(benefitTypeCode) => onChange({ ...item, benefitTypeCode })} /></Field><Field label="Coverage"><Input value={item.coverageTypeCode} onChange={(coverageTypeCode) => onChange({ ...item, coverageTypeCode })} /></Field><Field label="Amount"><Input value={item.amount} onChange={(amount) => onChange({ ...item, amount })} /></Field><Field label="Currency canonical ref"><Input value={item.currencyReferenceId} readOnly /></Field><Field label="Value"><Input value={item.valueText} onChange={(valueText) => onChange({ ...item, valueText })} /></Field><Field label="Duration"><Input value={item.durationText} onChange={(durationText) => onChange({ ...item, durationText })} /></Field><Field label="Frequency"><Input value={item.frequencyCode} onChange={(frequencyCode) => onChange({ ...item, frequencyCode })} /></Field><Field label="Order"><Input type="number" value={item.displayOrder} onChange={(value) => onChange({ ...item, displayOrder: Number(value) || 0 })} /></Field></div><button type="button" onClick={onRemove} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700"><Trash2 className="h-3.5 w-3.5" />{ui.remove}</button></div>;
}

function TargetEditor({ kind, rows, onChange, ui }: {
  kind: 'degree';
  rows: ScholarshipDegreeTargetDto[];
  onChange: (rows: ScholarshipDegreeTargetDto[]) => void;
  ui: UiText;
} | {
  kind: 'major';
  rows: ScholarshipMajorTargetDto[];
  onChange: (rows: ScholarshipMajorTargetDto[]) => void;
  ui: UiText;
}) {
  return <div className="space-y-3">
    {rows.map((item, index) => <div key={item.targetKey} className="rounded-xl border p-4"><GraduationCap className="mb-2 h-4 w-4 text-[#0E7C86]" /><div className="grid gap-2"><Field label="Target key"><Input value={item.targetKey} readOnly /></Field><Field label="Source label"><Input value={item.sourceLabel} onChange={(sourceLabel) => onChange(rows.map((row, i) => i === index ? { ...row, sourceLabel } : row) as never)} /></Field><Field label="Canonical ID"><Input value={kind === 'degree' ? (item as ScholarshipDegreeTargetDto).degreeLevelId : (item as ScholarshipMajorTargetDto).majorId} readOnly /></Field><Field label="Resolution"><Input value={item.resolutionStatus} readOnly /></Field></div><button type="button" onClick={() => onChange(rows.filter((_, i) => i !== index) as never)} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700"><Trash2 className="h-3.5 w-3.5" />{ui.remove}</button></div>)}
    {!rows.length ? <Empty text={ui.noRows} /> : null}
    <button type="button" onClick={() => {
      const targetKey = nextKey(kind.toUpperCase(), rows as unknown as Array<Record<string, unknown>>, 'targetKey');
      const newRow = { targetKey, sourceLabel: '', resolutionStatus: 'UNRESOLVED' };
      onChange([...rows, newRow] as never);
    }} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm font-semibold"><Plus className="h-4 w-4" />{ui.add}</button>
  </div>;
}

function EligibilityRow({ item, onChange, onRemove, ui }: { item: ScholarshipEligibilityItemDto; onChange: (item: ScholarshipEligibilityItemDto) => void; onRemove: () => void; ui: UiText }) {
  return <div className="rounded-xl border p-4"><div className="grid gap-2 md:grid-cols-3"><Field label="Item key"><Input value={item.itemKey} readOnly /></Field><Field label="Type"><Input value={item.itemTypeCode} onChange={(itemTypeCode) => onChange({ ...item, itemTypeCode })} /></Field><Field label="Operator"><Input value={item.operatorCode} onChange={(operatorCode) => onChange({ ...item, operatorCode })} /></Field><Field label="Value"><Input value={item.valueText} onChange={(valueText) => onChange({ ...item, valueText })} /></Field><Field label="Minimum"><Input value={item.minimumValue} onChange={(minimumValue) => onChange({ ...item, minimumValue })} /></Field><Field label="Maximum"><Input value={item.maximumValue} onChange={(maximumValue) => onChange({ ...item, maximumValue })} /></Field><Field label="International test canonical ID"><Input value={item.internationalTestId} readOnly /></Field><Field label="Resolution"><Input value={item.resolutionStatus} readOnly /></Field><Field label="Priority"><Input type="number" value={item.priorityOrder} onChange={(value) => onChange({ ...item, priorityOrder: Number(value) || 0 })} /></Field></div><label className="mt-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={item.isRequired !== false} onChange={(event) => onChange({ ...item, isRequired: event.target.checked })} />{item.isRequired === false ? ui.optional : ui.required}</label><button type="button" onClick={onRemove} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700"><Trash2 className="h-3.5 w-3.5" />{ui.remove}</button></div>;
}

function DocumentRow({ item, onChange, onRemove, ui }: { item: ScholarshipRequiredDocumentDto; onChange: (item: ScholarshipRequiredDocumentDto) => void; onRemove: () => void; ui: UiText }) {
  return <div className="rounded-xl border p-4"><div className="grid gap-2 md:grid-cols-3"><Field label="Document key"><Input value={item.documentKey} readOnly /></Field><Field label="Display name"><Input value={item.displayName} onChange={(displayName) => onChange({ ...item, displayName })} /></Field><Field label="Document type"><Input value={item.documentTypeCode} onChange={(documentTypeCode) => onChange({ ...item, documentTypeCode })} /></Field><Field label="Description"><Input value={item.description} onChange={(description) => onChange({ ...item, description })} /></Field><Field label="International test canonical ID"><Input value={item.internationalTestId} readOnly /></Field><Field label="Source label / score requirement"><Input value={item.sourceLabel} onChange={(sourceLabel) => onChange({ ...item, sourceLabel })} /></Field><Field label="Resolution"><Input value={item.resolutionStatus} readOnly /></Field><Field label="Order"><Input type="number" value={item.displayOrder} onChange={(value) => onChange({ ...item, displayOrder: Number(value) || 0 })} /></Field></div><label className="mt-3 flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={item.isRequired !== false} onChange={(event) => onChange({ ...item, isRequired: event.target.checked })} />{item.isRequired === false ? ui.optional : ui.required}</label><button type="button" onClick={onRemove} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-red-700"><Trash2 className="h-3.5 w-3.5" />{ui.remove}</button></div>;
}
