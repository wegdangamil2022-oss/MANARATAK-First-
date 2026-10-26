import { useAdministrationDraftGuard } from '../features/reference-data/useAdministrationDraftGuard';
import {
  DestinationCard,
  DestinationEditorContext,
} from '../features/destinations/DestinationCard';
import { DestinationOwnerList } from '../features/destinations/DestinationOwnerList';
import {
  destinationGroups,
  destinationSection,
  destinationRepairTarget,
  destinationListContext,
  type DestinationSection,
} from '../features/destinations/destinationNavigation';
import '../features/destinations/destinations.css';
import { AcademicProgramExplorerPanel } from '../features/integration/AcademicProgramExplorerPanel';
import { listAllReferenceData } from '../api/referenceData';
import { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  AlertCircle,
  ArrowLeft,
  Building2,
  CheckCircle2,
  ExternalLink,
  FileCheck2,
  Globe2,
  GraduationCap,
  Loader2,
  RefreshCw,
  ShieldCheck,
  Stamp,
  WalletCards,
} from 'lucide-react';
import { CanonicalCityPicker } from '../components/CanonicalCityPicker';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { AssetPicker } from '../components/AssetPicker';
import {
  studyDestinationFieldLabels,
  studyDestinationEdgeLabels,
  studyDestinationCheckLabels,
} from './StudyDestinationUiLabels';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

type TabKey = DestinationSection;
type CostTier = 'LOW' | 'MODERATE' | 'HIGH' | 'VERY_HIGH';

type ReferenceCountry = {
  id: string;
  iso2Code: string;
  iso3Code: string;
  name: string;
  nameAr?: string | null;
  officialName?: string | null;
  region?: string | null;
  subregion?: string | null;
  defaultCurrencyCode?: string | null;
  defaultLanguageCode?: string | null;
  callingCode?: string | null;
  isActive: boolean;
};
type RefOption = {
  id: string;
  isActive?: boolean;
  name?: string;
  nameAr?: string | null;
  code?: string;
  isoCode?: string;
  currencyCode?: string;
  languageCode?: string;
};
type LinkItem = {
  labelAr: string;
  labelEn?: string;
  url: string;
  category: string;
  noteAr?: string;
  noteEn?: string;
};
type EvidenceItem = { label: string; url: string; sourceType: string; verifiedAt?: string };
type CostItem = { label: string; value: string };

type Profile = {
  revision: number;
  cityReferenceIds: string[];
  updatedAt: string;
  id: string;
  publicId: string;
  slug: string;
  status: 'DRAFT' | 'IN_REVIEW' | 'PUBLISHED' | 'ARCHIVED';
  completenessStatus: string;
  overviewAr?: string | null;
  overviewEn?: string | null;
  studySystemSummaryAr?: string | null;
  studySystemSummaryEn?: string | null;
  admissionHighlightsAr: string[];
  admissionHighlightsEn: string[];
  visaSummaryAr?: string | null;
  visaSummaryEn?: string | null;
  visaRequirementsAr: string[];
  visaRequirementsEn: string[];
  visaOfficialUrl?: string | null;
  livingCostTier?: CostTier | null;
  averageMonthlyLivingCostMin?: number | null;
  averageMonthlyLivingCostMax?: number | null;
  livingCostCurrencyReferenceId?: string | null;
  costHighlightsAr: CostItem[];
  costHighlightsEn: CostItem[];
  studentLifeHighlightsAr: string[];
  studentLifeHighlightsEn: string[];
  officialLinks: LinkItem[];
  sourceVerificationStatus: 'UNVERIFIED' | 'VERIFIED';
  sourceAuditDate?: string | null;
  evidenceSources: EvidenceItem[];
  imageAssetId?: string | null;
  studyLanguageReferenceIds: string[];
  isFeatured: boolean;
  publishedAt?: string | null;
  governance?: {
    lastEditorId?: string;
    proof?: { reviewedAt?: string; verifiedAt?: string; reviewerId?: string } | null;
  };
};
type Readiness = {
  readyForReview: boolean;
  readyForPublish: boolean;
  completenessStatus: string;
  checks: Array<{
    key: string;
    label: string;
    complete: boolean;
    blocking: boolean;
    message?: string;
  }>;
};
type AuthorityDecision = {
  origin: string;
  authorityName: string;
  evidenceUrl: string;
  exceptionReason?: string;
};
type Aggregate = {
  fingerprint?: string;
  referenceWarnings?: string[];
  cities?: RefOption[];
  country: ReferenceCountry;
  profile: Profile | null;
  studyLanguages: RefOption[];
  livingCostCurrency: RefOption | null;
  readiness: Readiness | null;
};

type GraphIdentity = { ownerId: string; publicId?: string; slug?: string; displayName: string };
type GraphPage<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  nextCursor?: string | null;
};
type CountryGraph = {
  readScope?: { collections: Record<string, { state: string; nextCursor?: string | null }> };
  subject: GraphIdentity & { canonicalCode: string };
  relationships: {
    universities: GraphPage<GraphIdentity>;
    academicPrograms: Array<{
      ownerId: string;
      universityOwnerId: string;
      universityDisplayName: string;
      sourceProgramName: string;
      degreeLevelId?: string | null;
      majorOwnerId?: string | null;
      majorMappingState: string;
      status: string;
    }>;
    majors: GraphIdentity[];
    scholarships: GraphPage<GraphIdentity>;
    internationalTests: GraphPage<GraphIdentity & { providerName: string; status: string }>;
    services: GraphPage<GraphIdentity & { serviceCategory: string; deliveryMode: string }>;
    careerJobs: GraphPage<GraphIdentity & { opportunityType: string; employmentType: string }>;
    providerHeadquartersCourses: GraphPage<
      GraphIdentity & {
        providerName?: string | null;
        category?: string | null;
        directCourseUrl: string;
      }
    >;
    editorialContent: Array<{
      contentId: string;
      title: string;
      slug: string;
      contentType: string;
    }>;
  };
};

type FormState = {
  imageAssetId: string;
  overviewAr: string;
  overviewEn: string;
  studySystemSummaryAr: string;
  studySystemSummaryEn: string;
  admissionHighlightsAr: string;
  admissionHighlightsEn: string;
  visaSummaryAr: string;
  visaSummaryEn: string;
  visaRequirementsAr: string;
  visaRequirementsEn: string;
  visaOfficialUrl: string;
  livingCostTier: '' | CostTier;
  averageMonthlyLivingCostMin: string;
  averageMonthlyLivingCostMax: string;
  livingCostCurrencyReferenceId: string;
  costHighlightsAr: CostItem[];
  costHighlightsEn: CostItem[];
  studentLifeHighlightsAr: string;
  studentLifeHighlightsEn: string;
  officialLinks: LinkItem[];
  cityReferenceIds: string[];
  evidenceSources: EvidenceItem[];
  sourceAuditDate: string;
  studyLanguageReferenceIds: string[];
  isFeatured: boolean;
};

const emptyForm: FormState = {
  imageAssetId: '',
  overviewAr: '',
  overviewEn: '',
  studySystemSummaryAr: '',
  studySystemSummaryEn: '',
  admissionHighlightsAr: '',
  admissionHighlightsEn: '',
  visaSummaryAr: '',
  visaSummaryEn: '',
  visaRequirementsAr: '',
  visaRequirementsEn: '',
  visaOfficialUrl: '',
  livingCostTier: '',
  averageMonthlyLivingCostMin: '',
  averageMonthlyLivingCostMax: '',
  livingCostCurrencyReferenceId: '',
  costHighlightsAr: [],
  costHighlightsEn: [],
  studentLifeHighlightsAr: '',
  studentLifeHighlightsEn: '',
  officialLinks: [],
  cityReferenceIds: [],
  evidenceSources: [],
  sourceAuditDate: '',
  studyLanguageReferenceIds: [],
  isFeatured: false,
};

const lines = (value: string) =>
  value
    .split('\n')
    .map((item) => item.trim())
    .filter(Boolean);
const stringifyLines = (value?: string[]) => (value ?? []).join('\n');
const dateInput = (value?: string | null) => (value ? value.slice(0, 10) : '');
const optionLabel = (item: RefOption, isAr: boolean) =>
  (isAr ? item.nameAr : item.name) ||
  item.name ||
  item.nameAr ||
  item.code ||
  item.isoCode ||
  item.currencyCode ||
  item.languageCode ||
  item.id;

function flagEmoji(code: string) {
  try {
    return String.fromCodePoint(
      ...code
        .toUpperCase()
        .split('')
        .map((char) => 127397 + char.charCodeAt(0)),
    );
  } catch {
    return '🌐';
  }
}

export function StudyDestinationDetailPage() {
  const { countryIso2Code = '' } = useParams();
  const iso2 = countryIso2Code.toUpperCase();
  const [searchParams, setSearchParams] = useSearchParams();
  const [contentLocale, setContentLocale] = useState<'ar' | 'en'>(() =>
    searchParams.get('contentLocale') === 'en' ? 'en' : 'ar',
  );
  const [editingCard, setEditingCard] = useState('');
  const [preview, setPreview] = useState<Aggregate | null>(null);
  const { hasPermission, permissions } = useAdminAuthorization();
  const canEdit = hasPermission('admin:study-destinations:edit');
  const [reason, setReason] = useState('');
  const [authorities, setAuthorities] = useState<AuthorityDecision[]>([]);
  const { language } = useTranslation();
  const isAr = language === 'ar';
  const baseline = useRef(JSON.stringify(emptyForm));
  const mutation = useRef(false);
  const sequence = useRef(0);
  const [edgeParams, setEdgeParams] = useState<Record<string, string>>({});
  const [edgeHistory, setEdgeHistory] = useState<Record<string, string[]>>({});
  const [graphLoading, setGraphLoading] = useState(false);
  const [graphError, setGraphError] = useState<string | null>(null);
  const [aggregate, setAggregate] = useState<Aggregate | null>(null);
  const [graph, setGraph] = useState<CountryGraph | null>(null);
  const [languages, setLanguages] = useState<RefOption[]>([]);
  const [currencies, setCurrencies] = useState<RefOption[]>([]);
  const [form, setForm] = useState<FormState>(emptyForm);
  const tab: TabKey = destinationSection(searchParams.get('section'));
  const setTab = (key: TabKey) => {
    if (
      dirty &&
      !window.confirm(isAr ? 'تجاهل التعديلات غير المحفوظة؟' : 'Discard unsaved changes?')
    )
      return;
    hydrateForm(aggregate?.profile ?? null);
    setEditingCard('');
    const next = new URLSearchParams(searchParams);
    next.set('section', key);
    next.delete('card');
    setSearchParams(next);
  };
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [action, setAction] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const hydrateForm = useCallback((profile: Profile | null) => {
    if (!profile) {
      baseline.current = JSON.stringify(emptyForm);
      setForm(emptyForm);
      return;
    }
    const next: FormState = {
      imageAssetId: profile.imageAssetId ?? '',
      overviewAr: profile.overviewAr ?? '',
      overviewEn: profile.overviewEn ?? '',
      studySystemSummaryAr: profile.studySystemSummaryAr ?? '',
      studySystemSummaryEn: profile.studySystemSummaryEn ?? '',
      admissionHighlightsAr: stringifyLines(profile.admissionHighlightsAr),
      admissionHighlightsEn: stringifyLines(profile.admissionHighlightsEn),
      visaSummaryAr: profile.visaSummaryAr ?? '',
      visaSummaryEn: profile.visaSummaryEn ?? '',
      visaRequirementsAr: stringifyLines(profile.visaRequirementsAr),
      visaRequirementsEn: stringifyLines(profile.visaRequirementsEn),
      visaOfficialUrl: profile.visaOfficialUrl ?? '',
      livingCostTier: profile.livingCostTier ?? '',
      averageMonthlyLivingCostMin:
        profile.averageMonthlyLivingCostMin == null
          ? ''
          : String(profile.averageMonthlyLivingCostMin),
      averageMonthlyLivingCostMax:
        profile.averageMonthlyLivingCostMax == null
          ? ''
          : String(profile.averageMonthlyLivingCostMax),
      livingCostCurrencyReferenceId: profile.livingCostCurrencyReferenceId ?? '',
      costHighlightsAr: profile.costHighlightsAr ?? [],
      costHighlightsEn: profile.costHighlightsEn ?? [],
      studentLifeHighlightsAr: stringifyLines(profile.studentLifeHighlightsAr),
      studentLifeHighlightsEn: stringifyLines(profile.studentLifeHighlightsEn),
      officialLinks: profile.officialLinks ?? [],
      cityReferenceIds: profile.cityReferenceIds ?? [],
      evidenceSources: profile.evidenceSources ?? [],
      sourceAuditDate: dateInput(profile.sourceAuditDate),
      studyLanguageReferenceIds: profile.studyLanguageReferenceIds ?? [],
      isFeatured: profile.isFeatured,
    };
    baseline.current = JSON.stringify(next);
    setForm(next);
  }, []);

  const load = useCallback(async () => {
    if (!iso2) return;
    const request = ++sequence.current;
    setLoading(true);
    setError(null);
    try {
      const detail = await adminApiClient.request<Aggregate>(
        `/admin/study-destinations/${encodeURIComponent(iso2)}`,
      );
      if (request !== sequence.current) return;
      setAggregate(detail);
      hydrateForm(detail.profile);
    } catch (cause) {
      if (request === sequence.current) {
        setAggregate(null);
        setError(cause instanceof Error ? cause.message : 'STUDY_DESTINATION_LOAD_FAILED');
      }
    } finally {
      if (request === sequence.current) setLoading(false);
    }
  }, [hydrateForm, iso2]);

  useEffect(() => {
    setEdgeParams({});
    setEdgeHistory({});
    setReason('');
    setAuthorities([]);
    void load();
  }, [load, permissions.join('|')]);
  useEffect(() => {
    if (tab !== 'supporting') return;
    let active = true;
    setGraphLoading(true);
    setGraphError(null);
    setGraph(null);
    adminApiClient
      .request<CountryGraph>(
        `/admin/study-destinations/${encodeURIComponent(iso2)}/relationships?pageSize=20&locale=${language}&${new URLSearchParams(edgeParams)}`,
      )
      .then((next) => {
        if (active) setGraph(next);
      })
      .catch((cause) => {
        if (active) setGraphError(cause instanceof Error ? cause.message : 'تعذر تحميل العلاقات.');
      })
      .finally(() => {
        if (active) setGraphLoading(false);
      });
    return () => {
      active = false;
    };
  }, [iso2, edgeParams, language, tab]);
  useEffect(() => {
    if (tab !== 'study' && tab !== 'living') return;
    let live = true;
    const kind = tab === 'study' ? 'languages' : 'currencies';
    listAllReferenceData<RefOption>(kind)
      .then((rows) => {
        if (!live) return;
        const active = rows.filter((x) => x.isActive !== false);
        if (kind === 'languages') setLanguages(active);
        else setCurrencies(active);
      })
      .catch(() => {
        if (live)
          setError(
            isAr
              ? 'تعذر تحميل المراجع؛ لا تغير الاختيارات قبل إعادة المحاولة.'
              : 'References unavailable; retry before changing selections.',
          );
      });
    return () => {
      live = false;
    };
  }, [tab, isAr]);
  const dirty = JSON.stringify(form) !== baseline.current;
  useAdministrationDraftGuard(dirty, isAr, () => {
    hydrateForm(aggregate?.profile ?? null);
    setEditingCard('');
  });
  const reload = () => {
    if (saving || action) return;
    if (dirty && !window.confirm('تجاهل التعديلات غير المحفوظة وإعادة التحميل؟')) return;
    void load();
  };

  // English authoring is disabled. Omit read-only fields rather than serializing
  // display text back into lists and normalizing historical translations.
  const buildPayload = () => ({
    expectedUpdatedAt: aggregate?.profile?.updatedAt,
    imageAssetId: form.imageAssetId || null,
    overviewAr: form.overviewAr || null,
    studySystemSummaryAr: form.studySystemSummaryAr || null,
    admissionHighlightsAr: lines(form.admissionHighlightsAr),
    visaSummaryAr: form.visaSummaryAr || null,
    visaRequirementsAr: lines(form.visaRequirementsAr),
    visaOfficialUrl: form.visaOfficialUrl || null,
    livingCostTier: form.livingCostTier || null,
    averageMonthlyLivingCostMin:
      form.averageMonthlyLivingCostMin === '' ? null : Number(form.averageMonthlyLivingCostMin),
    averageMonthlyLivingCostMax:
      form.averageMonthlyLivingCostMax === '' ? null : Number(form.averageMonthlyLivingCostMax),
    livingCostCurrencyReferenceId: form.livingCostCurrencyReferenceId || null,
    costHighlightsAr: form.costHighlightsAr,
    studentLifeHighlightsAr: lines(form.studentLifeHighlightsAr),
    officialLinks: form.officialLinks,
    cityReferenceIds: form.cityReferenceIds,
    evidenceSources: form.evidenceSources.map(({ label, url, sourceType }) => ({
      label,
      url,
      sourceType,
    })),
    sourceAuditDate:
      form.sourceAuditDate === dateInput(aggregate?.profile?.sourceAuditDate)
        ? (aggregate?.profile?.sourceAuditDate ?? null)
        : form.sourceAuditDate
          ? new Date(`${form.sourceAuditDate}T00:00:00.000Z`).toISOString()
          : null,
    studyLanguageReferenceIds: form.studyLanguageReferenceIds,
    isFeatured: form.isFeatured,
  });

  const readSaved = async () => {
    const next = await adminApiClient.request<Aggregate>(
      `/admin/study-destinations/${encodeURIComponent(iso2)}`,
    );
    setAggregate(next);
    hydrateForm(next.profile);
  };
  const save = async () => {
    if (mutation.current || !canEdit) return;
    if (!reason.trim()) {
      setError(isAr ? 'اكتب سبب التعديل أو الإجراء.' : 'Enter a reason for the change.');
      return;
    }
    if (
      aggregate?.profile?.status === 'PUBLISHED' &&
      !window.confirm(
        isAr
          ? 'هذا التعديل قد يعيد الدولة إلى المسودة ويلغي ظهورها العام، ويلزم توثيقًا ونشرًا جديدين. متابعة؟'
          : 'This change may unpublish the destination and require a new review. Continue?',
      )
    )
      return;
    mutation.current = true;
    setSaving(true);
    setError(null);
    setNotice(null);
    let saved = false;
    try {
      const payload = buildPayload();
      for (const cost of [payload.averageMonthlyLivingCostMin, payload.averageMonthlyLivingCostMax])
        if (cost !== null && (!Number.isFinite(cost) || cost < 0))
          throw new Error('تكلفة المعيشة يجب أن تكون رقمًا صالحًا غير سالب.');
      if (
        payload.averageMonthlyLivingCostMin !== null &&
        payload.averageMonthlyLivingCostMax !== null &&
        payload.averageMonthlyLivingCostMax < payload.averageMonthlyLivingCostMin
      )
        throw new Error('الحد الأعلى للمعيشة يجب ألا يقل عن الحد الأدنى.');
      await adminApiClient.request<Aggregate>(
        `/admin/study-destinations/${encodeURIComponent(iso2)}/profile`,
        {
          method: 'PUT',
          headers: {
            'If-Match': String(aggregate?.profile?.revision ?? 0),
          },
          body: JSON.stringify({ ...payload, reason: reason.trim() }),
        },
      );
      saved = true;
      await readSaved();
      setEditingCard('');
      setNotice(
        isAr
          ? 'تم الحفظ وإعادة قراءة ملف الدولة من الخادم. تغييرات المحتوى الموثق تتطلب توثيقًا جديدًا قبل النشر.'
          : 'Saved and reloaded from the server. Source-sensitive changes require verification before publication.',
      );
    } catch (cause) {
      setError(
        (saved ? 'تم قبول الحفظ لكن تعذرت إعادة القراءة. أعد التحميل: ' : '') +
          (cause instanceof Error
            ? cause.message.includes('STUDY_DESTINATION_VERSION_CONFLICT')
              ? 'تغير ملف الدولة لدى مستخدم آخر. تعديلاتك ما زالت هنا؛ أعد التحميل قبل الحفظ.'
              : cause.message
            : 'SAVE_FAILED'),
      );
    } finally {
      mutation.current = false;
      setSaving(false);
    }
  };

  const execute = async (name: 'submit-review' | 'verify-source' | 'publish' | 'archive') => {
    if (mutation.current) return;
    const capability =
      name === 'verify-source'
        ? 'verify'
        : ['publish', 'archive'].includes(name)
          ? 'publish'
          : 'edit';
    if (!hasPermission(`admin:study-destinations:${capability}`)) return;
    if (!reason.trim()) {
      setError(isAr ? 'اكتب سبب الإجراء.' : 'Enter a reason.');
      return;
    }
    if (dirty) {
      setError(
        isAr
          ? 'احفظ التعديلات قبل تنفيذ إجراء المراجعة أو النشر.'
          : 'Save changes before workflow actions.',
      );
      return;
    }
    if (
      ['publish', 'archive', 'verify-source'].includes(name) &&
      !window.confirm(
        name === 'publish'
          ? 'نشر وجهة الدراسة للعامة؟'
          : name === 'archive'
            ? 'أرشفة الوجهة وإخفاؤها عن العامة؟'
            : 'هل راجعت الأدلة والروابط الرسمية وتريد اعتمادها؟',
      )
    )
      return;
    mutation.current = true;
    setAction(name);
    setError(null);
    setNotice(null);
    let applied = false;
    try {
      await adminApiClient.request<Aggregate>(
        `/admin/study-destinations/${encodeURIComponent(iso2)}/${name}`,
        {
          method: 'POST',
          headers: {
            'If-Match': String(aggregate?.profile?.revision ?? 0),
          },
          body: JSON.stringify({
            reason: reason.trim(),
            ...(name === 'verify-source'
              ? {
                  fingerprint: aggregate?.fingerprint,
                  authorities: authorities.map(({ exceptionReason, ...authority }) => ({
                    ...authority,
                    ...(exceptionReason?.trim() ? { exceptionReason: exceptionReason.trim() } : {}),
                  })),
                }
              : {}),
          }),
        },
      );
      applied = true;
      await readSaved();
      setNotice(
        isAr
          ? 'تم تنفيذ الإجراء وإعادة تحميل الحالة من الخادم.'
          : 'Action completed and state reloaded.',
      );
    } catch (cause) {
      setError(
        (applied ? 'تم قبول الإجراء لكن تعذرت إعادة القراءة. أعد التحميل: ' : '') +
          (cause instanceof Error ? cause.message : 'ACTION_FAILED'),
      );
    } finally {
      mutation.current = false;
      setAction(null);
    }
  };

  if (loading)
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#142B5F]" />
      </div>
    );
  if (!aggregate)
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">
        {error || 'STUDY_DESTINATION_NOT_FOUND'}
      </div>
    );
  const { country, profile, readiness } = aggregate;
  const blocking = readiness?.checks.filter((check) => check.blocking && !check.complete) ?? [];

  const tabs: Array<{ key: TabKey; label: string; icon: typeof Globe2 }> = [
    { key: 'overview', label: isAr ? 'التعريف' : 'Overview', icon: Globe2 },
    { key: 'study', label: isAr ? 'الدراسة والقبول' : 'Study & admission', icon: GraduationCap },
    { key: 'visa', label: isAr ? 'التأشيرة' : 'Visa', icon: Stamp },
    { key: 'living', label: isAr ? 'المعيشة والحياة' : 'Living & life', icon: WalletCards },
    {
      key: 'supporting',
      label: isAr ? 'المدن والعلاقات المساندة' : 'Cities & supporting relations',
      icon: Building2,
    },
    { key: 'universities', label: isAr ? 'الجامعات' : 'Universities', icon: Building2 },
    {
      key: 'programs',
      label: isAr ? 'البرامج والتخصصات' : 'Programs & majors',
      icon: GraduationCap,
    },
    { key: 'scholarships', label: isAr ? 'المنح الدراسية' : 'Scholarships', icon: GraduationCap },
    { key: 'sources', label: isAr ? 'المصادر والروابط' : 'Sources & links', icon: FileCheck2 },
    { key: 'publish', label: isAr ? 'الجاهزية والنشر' : 'Readiness & publish', icon: ShieldCheck },
  ];

  return (
    <DestinationEditorContext.Provider
      value={{
        active: editingCard,
        canEdit,
        busy: saving || Boolean(action),
        isAr,
        locale: contentLocale,
        reason,
        setReason,
        edit: setEditingCard,
        cancel: () => {
          hydrateForm(profile);
          setEditingCard('');
        },
        save,
      }}
    >
      <div className="destination-workspace" dir={isAr ? 'rtl' : 'ltr'}>
        <header className="destination-header">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-4">
              <Link
                to={destinationListContext(searchParams)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <ArrowLeft className={`h-5 w-5 ${isAr ? 'rotate-180' : ''}`} />
              </Link>
              <div className="text-5xl">{flagEmoji(country.iso2Code)}</div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="font-bold">
                    {isAr ? country.nameAr || country.name : country.name}
                  </h1>
                  <Badge value={profile?.status ?? 'NO_PROFILE'} />
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  <span dir="ltr">
                    {country.iso2Code} · {country.iso3Code}
                  </span>{' '}
                  · {country.region || '—'}
                  <span className="destination-header-meta">
                    <Badge value={profile?.sourceVerificationStatus ?? 'UNVERIFIED'} />
                    <Badge value={profile?.completenessStatus ?? 'INCOMPLETE'} />
                  </span>
                </p>
                <p className="destination-muted">
                  {isAr ? 'آخر مراجعة مستقلة: ' : 'Last independent review: '}
                  {profile?.governance?.proof?.reviewedAt
                    ? new Date(profile.governance.proof.reviewedAt).toLocaleString(language)
                    : isAr
                      ? 'لم توثّق بعد'
                      : 'Not recorded'}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                aria-label={isAr ? 'تحديث ملف الدولة' : 'Refresh destination'}
                disabled={saving || Boolean(action)}
                onClick={reload}
                className="rounded-xl border border-slate-200 p-2.5 text-slate-600"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={async () => {
                  try {
                    const result = await adminApiClient.request<Aggregate>(
                      `/admin/study-destinations/${iso2}/preview`,
                    );
                    setPreview(result);
                  } catch (cause) {
                    setError(cause instanceof Error ? cause.message : 'PREVIEW_UNAVAILABLE');
                  }
                }}
              >
                {isAr ? 'معاينة الطالب' : 'Student preview'}
              </button>
            </div>
          </div>
        </header>

        {dirty && (
          <p className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">
            توجد تعديلات غير محفوظة.
          </p>
        )}
        {profile?.status === 'PUBLISHED' && (
          <a
            href={`${(import.meta.env.VITE_PUBLIC_WEB_URL || '').replace(/\/$/, '')}/${language}/countries/${profile.slug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="block font-bold text-[#0E7C86]"
          >
            عرض الدولة في الصفحة العامة ↗
          </a>
        )}
        {error && (
          <div className="flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}
        {!!aggregate.referenceWarnings?.length && (
          <p role="status" className="text-amber-800">
            {isAr ? 'مراجع تحتاج إعادة المراجعة: ' : 'References requiring review: '}
            {aggregate.referenceWarnings.join(', ')}
          </p>
        )}
        {notice && (
          <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-800">
            <CheckCircle2 className="h-5 w-5" />
            {notice}
          </div>
        )}

        <div className="destination-toolbar">
          <label>
            {isAr ? 'لغة المحتوى' : 'Content language'}
            <select
              value={contentLocale}
              onChange={(e) => {
                if (dirty && !window.confirm(isAr ? 'تجاهل التعديلات؟' : 'Discard changes?'))
                  return;
                hydrateForm(profile);
                setEditingCard('');
                setContentLocale(e.target.value as 'ar' | 'en');
                const next = new URLSearchParams(searchParams);
                next.set('contentLocale', e.target.value);
                setSearchParams(next);
              }}
            >
              <option value="ar">العربية</option>
              <option value="en">English</option>
            </select>
          </label>
          <span>
            {isAr ? 'العربية' : 'Arabic'}: {languageReadiness(aggregate.readiness, 'ar', isAr)} ·
            English: {languageReadiness(aggregate.readiness, 'en', isAr)} ·{' '}
            <Link to="/translations">{isAr ? 'مركز الترجمة' : 'Translation workspace'}</Link>
          </span>
        </div>
        {tab === 'publish' && (
          <section className="destination-content-card">
            <TextArea
              label={isAr ? 'سبب قرار المراجعة' : 'Review decision reason'}
              value={reason}
              onChange={setReason}
              rows={2}
            />
            {tab === 'publish' && hasPermission('admin:study-destinations:verify') && (
              <div className="space-y-3">
                <p>
                  {isAr
                    ? 'أضف كل نطاق مصدر، اسم الجهة، ورابط إثبات اعتمادها. الاستثناء لجهة غير حكومية يحتاج تبريرًا صريحًا.'
                    : 'Approve every source origin with authority name and supporting URL. Non-government authorities require an explicit exception reason.'}
                </p>
                {authorities.map((item, index) => (
                  <div key={index} className="grid gap-2 sm:grid-cols-2">
                    {(['origin', 'authorityName', 'evidenceUrl', 'exceptionReason'] as const).map(
                      (key) => (
                        <Input
                          key={key}
                          label={studyDestinationFieldLabels[key]?.[isAr ? 0 : 1] ?? key}
                          value={item[key] ?? ''}
                          onChange={(value) =>
                            setAuthorities((old) =>
                              old.map((row, i) => (i === index ? { ...row, [key]: value } : row)),
                            )
                          }
                        />
                      ),
                    )}
                    <button
                      onClick={() => setAuthorities((old) => old.filter((_, i) => i !== index))}
                    >
                      {isAr ? 'إزالة الجهة' : 'Remove authority'}
                    </button>
                  </div>
                ))}
                <button
                  onClick={() =>
                    setAuthorities((old) => [
                      ...old,
                      { origin: '', authorityName: '', evidenceUrl: '' },
                    ])
                  }
                >
                  {isAr ? 'إضافة اعتماد جهة' : 'Add authority approval'}
                </button>
              </div>
            )}
          </section>
        )}
        <div className="destination-layout">
          <nav
            className="destination-navigation"
            aria-label={isAr ? 'أقسام ملف الدولة' : 'Destination sections'}
          >
            {destinationGroups.map((group, i) => (
              <section key={i}>
                <h2>{group.label[isAr ? 0 : 1]}</h2>
                {group.sections.map((key) => {
                  const item = tabs.find((x) => x.key === key)!;
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={key}
                      aria-current={tab === key ? 'page' : undefined}
                      onClick={() => setTab(key)}
                    >
                      <Icon aria-hidden="true" />
                      {item.label}
                    </button>
                  );
                })}
              </section>
            ))}
          </nav>
          <fieldset disabled={saving || Boolean(action)} className="destination-section">
            {tab === 'supporting' && (
              <DestinationCard
                id="cities"
                title={isAr ? 'مدن معروضة في ملف الوجهة' : 'Featured destination cities'}
                editor={
                  <div className="space-y-3">
                    <CanonicalCityPicker
                      countryIso2Code={iso2}
                      regionId={null}
                      value={null}
                      onChange={(id) => {
                        if (id)
                          setForm((old) => ({
                            ...old,
                            cityReferenceIds: [...new Set([...old.cityReferenceIds, id])].slice(
                              0,
                              25,
                            ),
                          }));
                      }}
                    />
                    {form.cityReferenceIds.map((id) => (
                      <button
                        key={id}
                        onClick={() =>
                          setForm((old) => ({
                            ...old,
                            cityReferenceIds: old.cityReferenceIds.filter((value) => value !== id),
                          }))
                        }
                        aria-label={isAr ? 'إزالة المدينة' : 'Remove city'}
                      >
                        {aggregate.cities?.find((city) => city.id === id)
                          ? optionLabel(
                              aggregate.cities.find((city) => city.id === id)!,
                              isAr,
                            )
                          : isAr
                            ? 'مدينة مختارة'
                            : 'Selected city'}{' '}
                        ×
                      </button>
                    ))}
                  </div>
                }
              >
                {aggregate.cities?.length
                  ? aggregate.cities.map((city) => optionLabel(city, isAr)).join(' · ')
                  : isAr
                    ? 'لا توجد مدن مختارة.'
                    : 'No selected cities.'}
                <Link to={`/settings/reference-data?section=cities&p7Country=${iso2}`}>
                  {isAr ? ' جميع المدن المرجعية' : ' All reference cities'}
                </Link>
              </DestinationCard>
            )}

            {tab === 'overview' && (
              <OverviewPanel country={country} form={form} setForm={setForm} isAr={isAr} />
            )}
            {tab === 'study' && (
              <StudyPanel form={form} setForm={setForm} languages={languages} isAr={isAr} />
            )}
            {tab === 'visa' && <VisaPanel form={form} setForm={setForm} isAr={isAr} />}
            {tab === 'living' && (
              <LivingPanel form={form} setForm={setForm} currencies={currencies} isAr={isAr} />
            )}
            {(tab === 'universities' || tab === 'scholarships') && (
              <DestinationOwnerList
                key={tab + country.id}
                kind={tab}
                countryId={country.id}
                iso2={iso2}
                isAr={isAr}
              />
            )}
            {tab === 'programs' && (
              <>
                <p className="destination-warning">
                  {isAr
                    ? 'البرنامج تقدمه جامعة وله درجة؛ التخصص المرجعي مفهوم مستقل. المطابقة غير المعتمدة لا تعني تخصصًا موثقًا.'
                    : 'A program belongs to a university and degree; a canonical major is an independent concept.'}
                </p>
                <AcademicProgramExplorerPanel key={country.id} countryReferenceId={country.id} />
              </>
            )}
            {tab === 'supporting' && (
              <SupportingRelations
                graph={graph}
                loading={graphLoading}
                error={graphError}
                isAr={isAr}
                edgeParams={edgeParams}
                edgeHistory={edgeHistory}
                setEdgeParams={setEdgeParams}
                setEdgeHistory={setEdgeHistory}
              />
            )}
            {tab === 'sources' && (
              <SourcesPanel form={form} setForm={setForm} profile={profile} isAr={isAr} />
            )}
            {tab === 'publish' && (
              <PublishPanel
                profile={profile}
                readiness={readiness}
                blocking={blocking}
                action={action || (saving ? 'saving' : dirty ? 'unsaved' : null)}
                execute={execute}
                isAr={isAr}
                hasPermission={hasPermission}
                repair={(key) => {
                  const target = destinationRepairTarget(key);
                  setContentLocale(target.locale);
                  const next = new URLSearchParams(searchParams);
                  next.set('section', target.section);
                  next.set('card', target.card);
                  next.set('contentLocale', target.locale);
                  setSearchParams(next);
                }}
              />
            )}
          </fieldset>
        </div>
        {preview && (
          <DestinationPreview
            aggregate={preview}
            isAr={isAr}
            locale={contentLocale}
            close={() => setPreview(null)}
          />
        )}
      </div>
    </DestinationEditorContext.Provider>
  );
}

type PanelProps = {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  isAr: boolean;
};
function ReadContent({ value, isAr }: { value: unknown; isAr: boolean }) {
  return (
    <>
      {Array.isArray(value) ? (
        value.length ? (
          <ul>
            {value.map((v, i) => (
              <li key={i}>{typeof v === 'string' ? v : JSON.stringify(v)}</li>
            ))}
          </ul>
        ) : (
          <p className="destination-muted">
            {isAr ? 'لا توجد معلومات مسجلة.' : 'No information recorded.'}
          </p>
        )
      ) : (
        <p>
          {typeof value === 'string' && value.trim()
            ? value
            : isAr
              ? 'المحتوى غير موجود لهذه اللغة.'
              : 'No content in this language.'}
        </p>
      )}
    </>
  );
}
function ListRows({
  value,
  onChange,
  isAr,
}: {
  value: string;
  onChange: (v: string) => void;
  isAr: boolean;
}) {
  const rows = value ? value.split('\n') : [];
  const change = (index: number, text: string) =>
    onChange(rows.map((r, i) => (i === index ? text : r)).join('\n'));
  return (
    <div className="space-y-2">
      {rows.map((text, index) => (
        <div className="destination-row-editor" key={index}>
          <input
            aria-label={`${isAr ? 'النقطة' : 'Item'} ${index + 1}`}
            value={text}
            onChange={(e) => change(index, e.target.value)}
          />
          <footer>
            <button
              type="button"
              disabled={index === 0}
              onClick={() => {
                const next = [...rows];
                [next[index - 1], next[index]] = [next[index], next[index - 1]];
                onChange(next.join('\n'));
              }}
            >
              {isAr ? 'للأعلى' : 'Move up'}
            </button>
            <button
              type="button"
              disabled={index === rows.length - 1}
              onClick={() => {
                const next = [...rows];
                [next[index + 1], next[index]] = [next[index], next[index + 1]];
                onChange(next.join('\n'));
              }}
            >
              {isAr ? 'للأسفل' : 'Move down'}
            </button>
            <button
              type="button"
              onClick={() => onChange(rows.filter((_, i) => i !== index).join('\n'))}
            >
              {isAr ? 'إزالة' : 'Remove'}
            </button>
          </footer>
        </div>
      ))}
      <button type="button" onClick={() => onChange([...rows, ' '].join('\n'))}>
        {isAr ? 'إضافة نقطة' : 'Add item'}
      </button>
    </div>
  );
}
function LocalizedCard({
  base,
  id,
  title,
  form,
  setForm,
  isAr,
  list = false,
}: {
  base:
    | 'overview'
    | 'studySystemSummary'
    | 'admissionHighlights'
    | 'visaSummary'
    | 'visaRequirements'
    | 'studentLifeHighlights';
  id: string;
  title: string;
  list?: boolean;
} & PanelProps) {
  const { locale } = useContext(DestinationEditorContext);
  const key = (base + (locale === 'ar' ? 'Ar' : 'En')) as keyof FormState;
  const value = String(form[key] ?? '');
  return (
    <DestinationCard
      id={id}
      title={title}
      translated
      editor={
        list ? (
          <ListRows
            value={value}
            isAr={isAr}
            onChange={(v) => setForm((x) => ({ ...x, [key]: v }))}
          />
        ) : (
          <TextArea
            label={title}
            value={value}
            dir={locale === 'ar' ? 'rtl' : 'ltr'}
            onChange={(v) => setForm((x) => ({ ...x, [key]: v }))}
          />
        )
      }
    >
      <ReadContent value={list ? lines(value) : value} isAr={isAr} />
    </DestinationCard>
  );
}
function OverviewPanel({
  country,
  form,
  setForm,
  isAr,
}: PanelProps & { country: ReferenceCountry }) {
  return (
    <>
      <section className="destination-content-card">
        <Title icon={Globe2}>{isAr ? 'هوية الدولة المرجعية' : 'Reference country identity'}</Title>
        <div className="destination-field-grid">
          <ReadOnly label="ISO2 / ISO3" value={country.iso2Code + ' / ' + country.iso3Code} />
          <ReadOnly
            label={isAr ? 'المنطقة والإقليم' : 'Region/subregion'}
            value={[country.region, country.subregion].filter(Boolean).join(' / ')}
          />
          <ReadOnly
            label={isAr ? 'العملة الافتراضية' : 'Default currency'}
            value={country.defaultCurrencyCode}
          />
          <ReadOnly
            label={isAr ? 'اللغة الافتراضية' : 'Default language'}
            value={country.defaultLanguageCode}
          />
          <ReadOnly label={isAr ? 'رمز الاتصال' : 'Calling code'} value={country.callingCode} />
        </div>
        <Link to={`/settings/reference-data?section=countries&recordId=${country.id}`}>
          {isAr ? 'عرض المرجع المالك' : 'Open canonical reference'}
        </Link>
      </section>
      <LocalizedCard
        id="overview"
        base="overview"
        title={isAr ? 'نبذة عن وجهة الدراسة' : 'Destination overview'}
        form={form}
        setForm={setForm}
        isAr={isAr}
      />
      <DestinationCard
        id="image"
        title={isAr ? 'صورة الوجهة وإبرازها' : 'Destination image and featuring'}
        editor={
          <>
            <AssetPicker
              label={isAr ? 'صورة الوجهة' : 'Destination image'}
              purpose="STUDY_DESTINATION_IMAGE"
              mimeTypePrefix="image/"
              value={form.imageAssetId}
              onChange={(imageAssetId) => setForm((x) => ({ ...x, imageAssetId }))}
            />
            <label>
              <input
                type="checkbox"
                checked={form.isFeatured}
                onChange={(e) => setForm((x) => ({ ...x, isFeatured: e.target.checked }))}
              />
              {isAr ? 'إبراز الدولة بعد النشر' : 'Feature after publication'}
            </label>
          </>
        }
      >
        <p>
          {form.imageAssetId
            ? isAr
              ? 'صورة مرتبطة بمنصة الأصول'
              : 'Image linked through Asset Platform'
            : isAr
              ? 'صورة الوجهة غير محددة'
              : 'No destination image'}
        </p>
        <p>
          {form.isFeatured
            ? isAr
              ? 'مميزة بعد النشر'
              : 'Featured after publication'
            : isAr
              ? 'عرض عادي'
              : 'Standard listing'}
        </p>
      </DestinationCard>
    </>
  );
}
function StudyPanel({ form, setForm, languages, isAr }: PanelProps & { languages: RefOption[] }) {
  return (
    <>
      <LocalizedCard
        id="study-system"
        base="studySystemSummary"
        title={isAr ? 'نظام الدراسة' : 'Education system'}
        form={form}
        setForm={setForm}
        isAr={isAr}
      />
      <LocalizedCard
        id="admission"
        base="admissionHighlights"
        title={isAr ? 'شروط القبول العامة' : 'General admission guidance'}
        form={form}
        setForm={setForm}
        isAr={isAr}
        list
      />
      <DestinationCard
        id="study-languages"
        title={isAr ? 'لغات الدراسة' : 'Study languages'}
        editor={
          <div className="destination-field-grid">
            {languages.map((item) => (
              <label key={item.id}>
                <input
                  type="checkbox"
                  checked={form.studyLanguageReferenceIds.includes(item.id)}
                  onChange={(e) =>
                    setForm((x) => ({
                      ...x,
                      studyLanguageReferenceIds: e.target.checked
                        ? [...x.studyLanguageReferenceIds, item.id]
                        : x.studyLanguageReferenceIds.filter((id) => id !== item.id),
                    }))
                  }
                />
                {optionLabel(item, isAr)}
              </label>
            ))}
          </div>
        }
      >
        <p>
          {form.studyLanguageReferenceIds
            .map((id) => {
              const item = languages.find((x) => x.id === id);
              return item
                ? optionLabel(item, isAr)
                : isAr
                  ? 'مرجع غير متاح'
                  : 'Reference unavailable';
            })
            .join(' · ') || (isAr ? 'لم تحدد لغات الدراسة.' : 'No study languages recorded.')}
        </p>
      </DestinationCard>
      <section className="destination-content-card">
        <h3>{isAr ? 'المصادر وحدود الإرشادات' : 'Sources and guidance scope'}</h3>
        <p>
          {isAr
            ? 'هذه إرشادات عامة؛ شروط كل جامعة وبرنامج تؤخذ من مالكها.'
            : 'General guidance only; university and program requirements remain owned by their domains.'}
        </p>
        <Link to="?section=sources">
          {isAr ? 'مراجعة المصادر الرسمية' : 'Review official sources'}
        </Link>
      </section>
    </>
  );
}
function VisaPanel(props: PanelProps) {
  const { form, setForm, isAr } = props;
  return (
    <>
      <p className="destination-warning">
        {isAr
          ? 'تختلف إجراءات التأشيرة بحسب الجنسية ونوع الدراسة وتاريخ التقديم؛ راجع الجهة الحكومية المختصة.'
          : 'Visa procedures vary by nationality, study type and application date; consult the official authority.'}
      </p>
      <LocalizedCard
        {...props}
        id="visa-summary"
        base="visaSummary"
        title={isAr ? 'نبذة التأشيرة والإقامة' : 'Student visa and residence'}
      />
      <LocalizedCard
        {...props}
        id="visa-requirements"
        base="visaRequirements"
        title={isAr ? 'المتطلبات والوثائق العامة' : 'General requirements and documents'}
        list
      />
      <DestinationCard
        id="visa-link"
        title={isAr ? 'المصدر الحكومي للتأشيرة' : 'Official immigration source'}
        editor={
          <Input
            label={isAr ? 'رابط HTTPS الرسمي' : 'Official HTTPS URL'}
            value={form.visaOfficialUrl}
            onChange={(v) => setForm((x) => ({ ...x, visaOfficialUrl: v }))}
          />
        }
      >
        <SafeSource
          url={form.visaOfficialUrl}
          label={isAr ? 'فتح المصدر الرسمي' : 'Open official source'}
        />
      </DestinationCard>
    </>
  );
}
function LivingPanel({
  form,
  setForm,
  currencies,
  isAr,
}: PanelProps & { currencies: RefOption[] }) {
  const { locale } = useContext(DestinationEditorContext);
  const key = locale === 'ar' ? 'costHighlightsAr' : 'costHighlightsEn';
  const currency = currencies.find((x) => x.id === form.livingCostCurrencyReferenceId);
  return (
    <>
      <DestinationCard
        id="living-costs"
        title={isAr ? 'المصاريف الشهرية بالعملة الأصلية' : 'Monthly costs in original currency'}
        editor={
          <div className="destination-field-grid">
            <Input
              type="number"
              label={isAr ? 'الحد الأدنى الشهري' : 'Monthly minimum'}
              value={form.averageMonthlyLivingCostMin}
              onChange={(v) => setForm((x) => ({ ...x, averageMonthlyLivingCostMin: v }))}
            />
            <Input
              type="number"
              label={isAr ? 'الحد الأعلى الشهري' : 'Monthly maximum'}
              value={form.averageMonthlyLivingCostMax}
              onChange={(v) => setForm((x) => ({ ...x, averageMonthlyLivingCostMax: v }))}
            />
            <Select
              label={isAr ? 'العملة المعتمدة' : 'Canonical currency'}
              value={form.livingCostCurrencyReferenceId}
              onChange={(v) => setForm((x) => ({ ...x, livingCostCurrencyReferenceId: v }))}
              options={[
                { value: '', label: '—' },
                ...currencies.map((c) => ({ value: c.id, label: optionLabel(c, isAr) })),
              ]}
            />
            <Select
              label={isAr ? 'تصنيف التكلفة' : 'Cost tier'}
              value={form.livingCostTier}
              onChange={(v) => setForm((x) => ({ ...x, livingCostTier: v as CostTier }))}
              options={[
                { value: '', label: '—' },
                ...['LOW', 'MODERATE', 'HIGH', 'VERY_HIGH'].map((v, i) => ({
                  value: v,
                  label: (isAr
                    ? ['منخفضة', 'متوسطة', 'مرتفعة', 'مرتفعة جدًا']
                    : ['Low', 'Moderate', 'High', 'Very high'])[i],
                })),
              ]}
            />
          </div>
        }
      >
        <p>
          {form.averageMonthlyLivingCostMin || form.averageMonthlyLivingCostMax
            ? `${form.averageMonthlyLivingCostMin || '—'} – ${form.averageMonthlyLivingCostMax || '—'} ${currency ? optionLabel(currency, isAr) : '—'}`
            : isAr
              ? 'لا توجد أرقام موثقة للتكلفة.'
              : 'No recorded cost figures.'}
        </p>
        <p className="destination-muted">
          {isAr
            ? 'نطاق شهري إرشادي؛ ليس رسمًا جامعيًا أو ضمانًا، ولا يتضمن تحويل عملة.'
            : 'Monthly guidance, not tuition or a guarantee; no currency conversion.'}
        </p>
      </DestinationCard>
      <DestinationCard
        id="cost-details"
        title={isAr ? 'تفاصيل بنود الصرف' : 'Cost breakdown'}
        translated
        editor={
          <div className="space-y-3">
            {form[key].map((row, index) => (
              <div className="destination-row-editor" key={index}>
                <Input
                  label={isAr ? 'البند' : 'Item'}
                  value={row.label}
                  onChange={(v) =>
                    setForm((x) => ({
                      ...x,
                      [key]: x[key].map((r, i) => (i === index ? { ...r, label: v } : r)),
                    }))
                  }
                />
                <Input
                  label={isAr ? 'القيمة الوصفية' : 'Recorded value'}
                  value={row.value}
                  onChange={(v) =>
                    setForm((x) => ({
                      ...x,
                      [key]: x[key].map((r, i) => (i === index ? { ...r, value: v } : r)),
                    }))
                  }
                />
                <button
                  onClick={() =>
                    setForm((x) => ({ ...x, [key]: x[key].filter((_, i) => i !== index) }))
                  }
                >
                  {isAr ? 'إزالة' : 'Remove'}
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setForm((x) => ({ ...x, [key]: [...x[key], { label: '', value: '' }] }))
              }
            >
              {isAr ? 'إضافة بند' : 'Add item'}
            </button>
          </div>
        }
      >
        <ul>
          {form[key].map((r, i) => (
            <li key={i}>
              {r.label}: {r.value}
            </li>
          ))}
        </ul>
        {!form[key].length && <p>{isAr ? 'لم تسجل بنود موثقة.' : 'No recorded cost breakdown.'}</p>}
      </DestinationCard>
      <LocalizedCard
        id="student-life"
        base="studentLifeHighlights"
        title={isAr ? 'الحياة الطلابية' : 'Student life'}
        form={form}
        setForm={setForm}
        isAr={isAr}
        list
      />
    </>
  );
}
const categories: Record<string, [string, string]> = {
  GOVERNMENT_STUDY: ['الدراسة الحكومية', 'Government study'],
  IMMIGRATION_VISA: ['الهجرة والتأشيرة', 'Immigration/visa'],
  EDUCATION_AUTHORITY: ['جهة التعليم', 'Education authority'],
  SCHOLARSHIP_PORTAL: ['بوابة المنح', 'Scholarship portal'],
  COST_OF_LIVING: ['المعيشة', 'Living costs'],
  STUDENT_SUPPORT: ['دعم الطلاب', 'Student support'],
  OTHER: ['أخرى', 'Other'],
};
const evidenceTypes: Record<string, [string, string]> = {
  GOVERNMENT: ['جهة حكومية', 'Government'],
  OFFICIAL_EDUCATION_AUTHORITY: ['جهة تعليم رسمية', 'Official education authority'],
  OFFICIAL_IMMIGRATION: ['هجرة رسمية', 'Official immigration'],
  OFFICIAL_STATISTICS: ['إحصاءات رسمية', 'Official statistics'],
  OTHER_OFFICIAL: ['مصدر رسمي آخر', 'Other official source'],
};
function SafeSource({ url, label }: { url?: string | null; label: string }) {
  let safe = false;
  try {
    safe = new URL(url ?? '').protocol === 'https:';
  } catch {
    /* A missing source is not a usable link. */
  }
  return safe ? (
    <a href={url!} target="_blank" rel="noopener noreferrer">
      {label} ↗
    </a>
  ) : (
    <span>—</span>
  );
}
function SourcesPanel({ form, setForm, profile, isAr }: PanelProps & { profile: Profile | null }) {
  const { locale } = useContext(DestinationEditorContext);
  return (
    <>
      <DestinationCard
        id="sources"
        title={isAr ? 'الروابط الرسمية' : 'Official links'}
        translated
        editor={
          <div className="space-y-3">
            {form.officialLinks.map((row, index) => (
              <div className="destination-row-editor" key={index}>
                {(['labelAr', 'url', 'noteAr'] as const).map((key) => (
                  <Input
                    key={key}
                    label={studyDestinationFieldLabels[key][isAr ? 0 : 1]}
                    value={row[key] ?? ''}
                    onChange={(v) =>
                      setForm((x) => ({
                        ...x,
                        officialLinks: x.officialLinks.map((r, i) =>
                          i === index ? { ...r, [key]: v } : r,
                        ),
                      }))
                    }
                  />
                ))}
                <Select
                  label={isAr ? 'التصنيف' : 'Category'}
                  value={row.category}
                  onChange={(v) =>
                    setForm((x) => ({
                      ...x,
                      officialLinks: x.officialLinks.map((r, i) =>
                        i === index ? { ...r, category: v } : r,
                      ),
                    }))
                  }
                  options={Object.entries(categories).map(([value, labels]) => ({
                    value,
                    label: labels[isAr ? 0 : 1],
                  }))}
                />
                <button
                  onClick={() =>
                    setForm((x) => ({
                      ...x,
                      officialLinks: x.officialLinks.filter((_, i) => i !== index),
                    }))
                  }
                >
                  {isAr ? 'إزالة الرابط' : 'Remove link'}
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setForm((x) => ({
                  ...x,
                  officialLinks: [...x.officialLinks, { labelAr: '', url: '', category: 'OTHER' }],
                }))
              }
            >
              {isAr ? 'إضافة رابط' : 'Add link'}
            </button>
          </div>
        }
      >
        <ul>
          {form.officialLinks.map((row, i) => (
            <li key={i}>
              <SafeSource
                url={row.url}
                label={(locale === 'ar' ? row.labelAr : row.labelEn) || row.labelAr}
              />
              <span> · {categories[row.category]?.[isAr ? 0 : 1] ?? row.category}</span>
              <p>{locale === 'ar' ? row.noteAr : row.noteEn}</p>
              {locale === 'en' && !row.labelEn && <small>{isAr ? 'العنوان العربي معروض لعدم توفر ترجمة إنجليزية؛ لا يُعد ترجمة مكتملة.' : 'Arabic label shown because English is unavailable; this does not satisfy translation readiness.'}</small>}
            </li>
          ))}
        </ul>
        {!form.officialLinks.length && (
          <p>{isAr ? 'لا توجد روابط مسجلة.' : 'No recorded links.'}</p>
        )}
      </DestinationCard>
      <DestinationCard
        id="evidence"
        title={isAr ? 'أدلة المصدر' : 'Source evidence'}
        editor={
          <div className="space-y-3">
            {form.evidenceSources.map((row, index) => (
              <div className="destination-row-editor" key={index}>
                <Input
                  label={isAr ? 'الوصف' : 'Description'}
                  value={row.label}
                  onChange={(v) =>
                    setForm((x) => ({
                      ...x,
                      evidenceSources: x.evidenceSources.map((r, i) =>
                        i === index ? { ...r, label: v } : r,
                      ),
                    }))
                  }
                />
                <Input
                  label="HTTPS URL"
                  value={row.url}
                  onChange={(v) =>
                    setForm((x) => ({
                      ...x,
                      evidenceSources: x.evidenceSources.map((r, i) =>
                        i === index ? { ...r, url: v } : r,
                      ),
                    }))
                  }
                />
                <Select
                  label={isAr ? 'نوع المصدر' : 'Source type'}
                  value={row.sourceType}
                  options={Object.entries(evidenceTypes).map(([value, label]) => ({
                    value,
                    label: label[isAr ? 0 : 1],
                  }))}
                  onChange={(v) =>
                    setForm((x) => ({
                      ...x,
                      evidenceSources: x.evidenceSources.map((r, i) =>
                        i === index ? { ...r, sourceType: v } : r,
                      ),
                    }))
                  }
                />
                <button
                  onClick={() =>
                    setForm((x) => ({
                      ...x,
                      evidenceSources: x.evidenceSources.filter((_, i) => i !== index),
                    }))
                  }
                >
                  {isAr ? 'إزالة' : 'Remove'}
                </button>
              </div>
            ))}
            <button
              onClick={() =>
                setForm((x) => ({
                  ...x,
                  evidenceSources: [
                    ...x.evidenceSources,
                    { label: '', url: '', sourceType: 'GOVERNMENT' },
                  ],
                }))
              }
            >
              {isAr ? 'إضافة دليل' : 'Add evidence'}
            </button>
          </div>
        }
      >
        <ul>
          {form.evidenceSources.map((row, i) => (
            <li key={i}>
              <SafeSource url={row.url} label={row.label} /> ·{' '}
              {evidenceTypes[row.sourceType]?.[isAr ? 0 : 1] ?? row.sourceType}
            </li>
          ))}
        </ul>
      </DestinationCard>
      <DestinationCard
        id="source-audit"
        title={isAr ? 'تاريخ تدقيق المحتوى' : 'Content audit date'}
        editor={
          <Input
            type="date"
            label={isAr ? 'تاريخ تدقيق المحتوى' : 'Content audit date'}
            value={form.sourceAuditDate}
            onChange={(v) => setForm((x) => ({ ...x, sourceAuditDate: v }))}
          />
        }
      >
        <p>{form.sourceAuditDate || '—'}</p>
        <p className="destination-muted">
          {isAr
            ? 'يختلف عن وقت اعتماد المراجع المستقل؛ الحداثة تحددها سياسة الخادم في الجاهزية.'
            : 'Separate from independent reviewer approval; freshness is evaluated by the server policy.'}
        </p>
      </DestinationCard>
      <section className="destination-content-card">
        <h3>{isAr ? 'اعتماد المراجع المستقل' : 'Independent source approval'}</h3>
        <Badge value={profile?.sourceVerificationStatus ?? 'UNVERIFIED'} />
        <p>
          {isAr ? 'وقت القرار الموثق' : 'Recorded decision time'}:{' '}
          {profile?.governance?.proof?.reviewedAt || '—'}
        </p>
        <Link to="?section=publish">
          {isAr ? 'الجاهزية وإجراءات الاعتماد' : 'Readiness and approval actions'}
        </Link>
      </section>
    </>
  );
}
function SupportingRelations({
  graph,
  loading,
  error,
  isAr,
  edgeParams,
  edgeHistory,
  setEdgeParams,
  setEdgeHistory,
}: {
  graph: CountryGraph | null;
  loading: boolean;
  error: string | null;
  isAr: boolean;
  edgeParams: Record<string, string>;
  edgeHistory: Record<string, string[]>;
  setEdgeParams: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  setEdgeHistory: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
}) {
  if (loading)
    return (
      <p role="status">{isAr ? 'تحميل العلاقات المساندة…' : 'Loading supporting relations…'}</p>
    );
  if (error)
    return (
      <p role="alert">
        {isAr
          ? 'مصدر العلاقات غير متاح؛ لا يمكن إثبات العدد. '
          : 'Relationship source unavailable; counts unknown. '}
        {error}
      </p>
    );
  if (!graph) return null;
  const r = graph.relationships;
  const groups = [
    ['internationalTests', 'testPage', '/international-tests'],
    ['services', 'serviceCursor', '/services'],
    ['careerJobs', 'careerPage', '/careers'],
    ['providerHeadquartersCourses', 'courseCursor', '/courses'],
  ] as const;
  return (
    <>
      {groups.map(([edge, param, base]) => {
        const collection = r[edge],
          history = edgeHistory[param] ?? [],
          page = Number(edgeParams[param] ?? 1),
          offset = param.endsWith('Page'),
          scope = graph.readScope?.collections[edge],
          unavailable = scope?.state === 'UNAVAILABLE',
          next = scope?.nextCursor ?? collection.nextCursor;
        return (
          <details className="destination-content-card" key={edge}>
            <summary>
              {studyDestinationEdgeLabels[edge]?.[isAr ? 0 : 1]} ·{' '}
              {unavailable ? (isAr ? 'غير متاح' : 'Unavailable') : collection.total}
            </summary>
            {edge === 'providerHeadquartersCourses' && (
              <p className="destination-warning">
                {isAr
                  ? 'العلاقة بمقر مزود الدورة، وليست ببلد الدراسة.'
                  : 'Provider headquarters only, not a course study country.'}
              </p>
            )}
            {unavailable ? (
              <p>{isAr ? 'تعذرت قراءة المصدر.' : 'Source unavailable.'}</p>
            ) : (
              <>
                <RelationList title="" items={collection.data} detailBasePath={base} />
                <nav className="destination-toolbar">
                  <button
                    disabled={offset ? page <= 1 : !history.length}
                    onClick={() => {
                      setEdgeParams((old) => ({
                        ...old,
                        [param]: offset ? String(page - 1) : (history.at(-1) ?? ''),
                      }));
                      if (!offset)
                        setEdgeHistory((old) => ({ ...old, [param]: history.slice(0, -1) }));
                    }}
                  >
                    {isAr ? 'السابق' : 'Previous'}
                  </button>
                  <button
                    disabled={offset ? page >= collection.totalPages : !next}
                    onClick={() => {
                      if (!offset)
                        setEdgeHistory((old) => ({
                          ...old,
                          [param]: [...history, edgeParams[param] ?? ''],
                        }));
                      setEdgeParams((old) => ({
                        ...old,
                        [param]: offset ? String(page + 1) : next!,
                      }));
                    }}
                  >
                    {isAr ? 'التالي' : 'Next'}
                  </button>
                </nav>
              </>
            )}
          </details>
        );
      })}
      <details className="destination-content-card">
        <summary>{isAr ? 'المحتوى التحريري المرتبط' : 'Related editorial content'}</summary>
        {graph.readScope?.collections.editorialContent?.state === 'UNAVAILABLE' ? (
          <p>{isAr ? 'المصدر غير متاح' : 'Source unavailable'}</p>
        ) : (
          <RelationList
            title=""
            items={r.editorialContent.map((x) => ({ ownerId: x.contentId, displayName: x.title }))}
            detailBasePath="/cms"
          />
        )}
      </details>
    </>
  );
}
function DestinationPreview({
  aggregate,
  isAr,
  locale,
  close,
}: {
  aggregate: Aggregate;
  isAr: boolean;
  locale: 'ar' | 'en';
  close: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close();
      if (e.key === 'Tab') {
        const nodes = ref.current?.querySelectorAll<HTMLElement>('button,a[href]');
        if (nodes?.length) {
          const first = nodes[0],
            last = nodes[nodes.length - 1];
          if (e.shiftKey && document.activeElement === first) {
            e.preventDefault();
            last.focus();
          } else if (!e.shiftKey && document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };
    document.addEventListener('keydown', key);
    return () => {
      document.removeEventListener('keydown', key);
      previous?.focus();
    };
  }, [close]);
  const p = aggregate.profile;
  return (
    <div
      ref={ref}
      tabIndex={-1}
      className="destination-preview"
      role="dialog"
      aria-modal="true"
      aria-label={isAr ? 'معاينة وجهة الدراسة' : 'Destination preview'}
    >
      <button onClick={close}>{isAr ? 'إغلاق' : 'Close'}</button>
      <h1>{isAr ? aggregate.country.nameAr || aggregate.country.name : aggregate.country.name}</h1>
      <p className="destination-warning">
        {isAr
          ? 'معاينة إدارية للبيانات المحفوظة؛ لا تنشر المسودة ولا تتجاوز الجاهزية.'
          : 'Administrative preview of saved content; drafts remain private and readiness rules still apply.'}
      </p>
      {!p ? (
        <p>{isAr ? 'لم يُنشأ الملف بعد.' : 'Profile not created.'}</p>
      ) : (
        <div lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'}>
          {(
            [
              'overview',
              'studySystemSummary',
              'admissionHighlights',
              'visaSummary',
              'visaRequirements',
              'costHighlights',
              'studentLifeHighlights',
            ] as const
          ).map((base) => {
            const value = p[(base + (locale === 'ar' ? 'Ar' : 'En')) as keyof Profile];
            return (
              <section className="destination-content-card" key={base}>
                <h2>
                  {
                    {
                      overview: ['التعريف', 'Overview'],
                      studySystemSummary: ['نظام الدراسة', 'Education system'],
                      admissionHighlights: ['القبول', 'Admissions'],
                      visaSummary: ['التأشيرة', 'Visa'],
                      visaRequirements: ['المتطلبات', 'Requirements'],
                      costHighlights: ['المعيشة', 'Living'],
                      studentLifeHighlights: ['الحياة الطلابية', 'Student life'],
                    }[base][isAr ? 0 : 1]
                  }
                </h2>
                <ReadContent value={value} isAr={isAr} />
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
function PublishPanel({
  hasPermission,
  repair,
  profile,
  readiness,
  blocking,
  action,
  execute,
  isAr,
}: {
  profile: Profile | null;
  readiness: Readiness | null;
  blocking: Readiness['checks'];
  action: string | null;
  hasPermission: (permission: string) => boolean;
  repair: (key: string) => void;
  execute: (name: 'submit-review' | 'verify-source' | 'publish' | 'archive') => Promise<void>;
  isAr: boolean;
}) {
  if (!profile || !readiness)
    return (
      <section className="space-y-4">
        <Title icon={ShieldCheck}>{isAr ? 'الجاهزية والنشر' : 'Readiness & publication'}</Title>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">
          {isAr
            ? 'احفظ الملف أولًا لإنشاء Profile مملوك لوجهة الدراسة.'
            : 'Save once to create the study-destination profile.'}
        </div>
      </section>
    );
  return (
    <section className="space-y-5">
      <Title icon={ShieldCheck}>
        {isAr ? 'بوابة الجاهزية والنشر' : 'Readiness & publication gate'}
      </Title>
      <div className="grid gap-3 sm:grid-cols-3">
        <ReadOnly label={isAr ? 'الحالة' : 'Status'} value={profile.status} />
        <ReadOnly label={isAr ? 'الاكتمال' : 'Completeness'} value={profile.completenessStatus} />
        <ReadOnly
          label={isAr ? 'توثيق المصدر' : 'Source verification'}
          value={profile.sourceVerificationStatus}
        />
      </div>
      <div className="space-y-2">
        {readiness.checks.map((check) => (
          <div
            key={check.key}
            className={`flex items-start gap-2 rounded-xl border p-3 text-sm ${check.complete ? 'border-emerald-100 bg-emerald-50 text-emerald-800' : 'border-amber-200 bg-amber-50 text-amber-900'}`}
          >
            {check.complete ? (
              <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            )}
            <div>
              <div className="font-black">
                {studyDestinationCheckLabels[check.key]?.[isAr ? 0 : 1] ?? check.label}
              </div>
              <div className="destination-muted">
                {check.message ||
                  (check.complete
                    ? isAr
                      ? 'مكتمل'
                      : 'Complete'
                    : isAr
                      ? 'يحتاج استكمالًا'
                      : 'Needs attention')}
              </div>
              {!check.complete && (
                <button type="button" onClick={() => repair(check.key)}>
                  {isAr ? 'اذهب للإصلاح' : 'Go to repair'}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
        <ActionButton
          disabled={
            Boolean(action) ||
            !hasPermission('admin:study-destinations:edit') ||
            !readiness.readyForReview ||
            profile.status === 'PUBLISHED' ||
            profile.status === 'IN_REVIEW'
          }
          onClick={() => execute('submit-review')}
          label={isAr ? 'إرسال للمراجعة' : 'Submit for review'}
        />
        <ActionButton
          disabled={
            Boolean(action) ||
            profile.status !== 'IN_REVIEW' ||
            !hasPermission('admin:study-destinations:verify')
          }
          onClick={() => execute('verify-source')}
          label={isAr ? 'توثيق المصادر' : 'Verify sources'}
          gold
        />
        <ActionButton
          disabled={
            Boolean(action) ||
            !hasPermission('admin:study-destinations:publish') ||
            profile.status !== 'IN_REVIEW' ||
            !readiness.readyForPublish
          }
          onClick={() => execute('publish')}
          label={isAr ? 'نشر وجهة الدراسة' : 'Publish destination'}
          primary
        />
        <ActionButton
          disabled={
            Boolean(action) ||
            !hasPermission('admin:study-destinations:publish') ||
            profile.status === 'ARCHIVED'
          }
          onClick={() => execute('archive')}
          label={isAr ? 'أرشفة' : 'Archive'}
          danger
        />
      </div>
      {blocking.length > 0 && (
        <p className="text-xs font-semibold text-amber-800">
          {isAr
            ? `يتبقى ${blocking.length} مانع/موانع قبل النشر.`
            : `${blocking.length} publishing blocker(s) remain.`}
        </p>
      )}
    </section>
  );
}

function Title({ icon: Icon, children }: { icon: typeof Globe2; children: React.ReactNode }) {
  return (
    <h2 className="flex items-center gap-2">
      <Icon className="h-5 w-5 text-[#142B5F]" />
      {children}
    </h2>
  );
}
function ReadOnly({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <div className="text-[11px] font-bold uppercase text-slate-400">{label}</div>
      <div className="mt-1 break-words text-sm font-bold text-slate-800">
        {String(value ?? '') || '-'}
      </div>
    </div>
  );
}
function TextArea({
  label,
  value,
  onChange,
  rows = 6,
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  rows?: number;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <textarea
        rows={rows}
        dir={dir}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#142B5F] focus:ring-2 focus:ring-[#142B5F]/10"
      />
    </label>
  );
}
function Input({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
  dir,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  type?: string;
  dir?: 'ltr' | 'rtl';
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <input
        type={type}
        dir={dir}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-[#142B5F] focus:ring-2 focus:ring-[#142B5F]/10"
      />
    </label>
  );
}
function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <label className="space-y-1.5">
      <span className="text-sm font-black text-slate-700">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm"
      >
        {options.map(({ value: v, label: l }) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </select>
    </label>
  );
}
function Badge({ value }: { value: string }) {
  const { language } = useTranslation();
  const labels: Record<string, [string, string]> = {
    DRAFT: ['مسودة', 'Draft'],
    PUBLISHED: ['منشور', 'Published'],
    NO_PROFILE: ['بلا ملف', 'No profile'],
    VERIFIED: ['مصادر معتمدة', 'Verified sources'],
    UNVERIFIED: ['مصادر غير معتمدة', 'Unverified sources'],
    COMPLETE: ['مكتمل', 'Complete'],
    INCOMPLETE: ['غير مكتمل', 'Incomplete'],
    READY_TO_REVIEW: ['جاهز للمراجعة', 'Ready for review'],
    READY_TO_PUBLISH: ['جاهز للنشر', 'Ready to publish'],
    CANONICALLY_MAPPED: ['مرتبط مرجعيًا', 'Canonically mapped'],
    UNMAPPED: ['غير مرتبط', 'Unmapped'],
    PASS: ['مستوفى', 'Passed'],
  };
  const bad = /INCOMPLETE|UNVERIFIED|NO_PROFILE|UNMAPPED|DRAFT/.test(value);
  const good = !bad && /PUBLISHED|VERIFIED|COMPLETE|CANONICALLY_MAPPED|PASS/.test(value);
  return (
    <span
      className={`rounded-full px-2.5 py-1 text-[11px] font-black ${good ? 'bg-emerald-100 text-emerald-800' : bad ? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-700'}`}
    >
      {labels[value]?.[language === 'ar' ? 0 : 1] ?? value}
    </span>
  );
}
function languageReadiness(readiness: Readiness | null, locale: 'ar' | 'en', isAr: boolean) {
  const checks = readiness?.checks.filter((check) =>
    locale === 'en'
      ? check.key.endsWith('-en')
      : check.key.endsWith('-ar') ||
        ['admission-highlights', 'visa-requirements'].includes(check.key),
  );
  if (!checks?.length) return isAr ? 'غير مقاسة' : 'Not measured';
  return `${checks.filter((check) => check.complete).length}/${checks.length} ${isAr ? 'عناصر مستوفاة' : 'checks met'}`;
}
function RelationList({
  title,
  items,
  detailBasePath,
  linkLabel,
}: {
  title: string;
  items: GraphIdentity[];
  detailBasePath?: string;
  linkLabel?: string;
}) {
  return (
    <div>
      {title && <h3 className="mb-3 font-black text-slate-900">{title}</h3>}
      {items.length ? (
        <div className="grid gap-2 md:grid-cols-2">
          {items.map((item) => {
            const href = detailBasePath
              ? `${detailBasePath}/${encodeURIComponent(item.ownerId)}`
              : null;
            return (
              <div
                key={item.ownerId}
                className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">{item.displayName}</div>
                  <details className="destination-muted">
                    <summary>معلومات تقنية / Technical details</summary>
                    <code dir="ltr">{item.ownerId}</code>
                  </details>
                </div>
                {href ? (
                  <Link
                    to={href}
                    title={linkLabel || item.displayName}
                    className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#142B5F]/20 bg-[#142B5F]/5 px-2.5 py-1.5 text-[11px] font-black text-[#142B5F] hover:bg-[#142B5F]/10"
                  >
                    <span className="hidden sm:inline">{linkLabel || 'Open'}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Link>
                ) : item.slug ? (
                  <ExternalLink className="h-4 w-4 shrink-0 text-slate-400" />
                ) : null}
              </div>
            );
          })}
        </div>
      ) : (
        <Empty text="—" />
      )}
    </div>
  );
}
function Empty({ text }: { text: string }) {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
      {text}
    </div>
  );
}
function ActionButton({
  label,
  onClick,
  disabled,
  primary,
  gold,
  danger,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  gold?: boolean;
  danger?: boolean;
}) {
  const style = primary
    ? 'bg-[#142B5F] text-white'
    : gold
      ? 'bg-[#D6A43B] text-slate-900'
      : danger
        ? 'bg-rose-50 text-rose-700 border border-rose-200'
        : 'bg-slate-100 text-slate-700';
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      className={`rounded-xl px-4 py-2.5 text-sm font-black disabled:cursor-not-allowed disabled:opacity-40 ${style}`}
    >
      {label}
    </button>
  );
}
