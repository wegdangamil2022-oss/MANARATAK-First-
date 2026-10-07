import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  GraduationCap,
  Languages,
  Loader2,
  RefreshCw,
  Save,
  Search,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { TRANSLATION_CONTENT_MODE, canAuthorDomainTranslations } from '@manaratak/shared';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Languages;
  label: string;
  value: number | string;
  accent: string;
}) {
  const tone = metricAccentClasses(accent);
  return (
    <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`grid h-9 w-9 place-items-center rounded-xl ${tone.icon}`}>
          <Icon className="h-4.5 w-4.5" />
        </div>
        <div className={`text-2xl font-black ${tone.text}`}>{value}</div>
      </div>
      <div className="mt-3 text-[11px] font-black text-slate-600">{label}</div>
    </div>
  );
}

function metricAccentClasses(accent: string) {
  if (accent === '#142B5F')
    return { icon: 'bg-[#142B5F]/10 text-[#142B5F]', text: 'text-[#142B5F]' };
  if (accent === '#0E7C86')
    return { icon: 'bg-[#0E7C86]/10 text-[#0E7C86]', text: 'text-[#0E7C86]' };
  if (accent === '#21A7B4')
    return { icon: 'bg-[#21A7B4]/10 text-[#21A7B4]', text: 'text-[#21A7B4]' };
  if (accent === '#D6A43B')
    return { icon: 'bg-[#D6A43B]/10 text-[#D6A43B]', text: 'text-[#D6A43B]' };
  if (accent === '#B94A48')
    return { icon: 'bg-[#B94A48]/10 text-[#B94A48]', text: 'text-[#B94A48]' };
  return { icon: 'bg-[#2E7D5A]/10 text-[#2E7D5A]', text: 'text-[#2E7D5A]' };
}

type WorkspaceDomain = 'SCHOLARSHIP' | 'UNIVERSITY' | 'MAJOR' | 'INTERNATIONAL_TEST' | 'COURSE';
type CoverageFilter = 'ALL' | 'MISSING_AR' | 'MISSING_EN' | 'COMPLETE';
type SupportedLocale = 'ar' | 'en';
type UniversityTranslationReviewStatus = 'NEEDS_REVIEW' | 'APPROVED' | 'PUBLISHED' | 'REJECTED';
type TranslationStorage = 'NORMALIZED' | 'EXPLICIT_FIELDS' | 'COMPATIBILITY_OVERLAY';
type AdminTranslationKey = Parameters<ReturnType<typeof useTranslation>['t']>[0];

interface UniversityTranslation {
  id?: string;
  locale: string;
  displayName?: string | null;
  description?: string | null;
  reviewStatus?: UniversityTranslationReviewStatus;
  sourceRecordId?: string | null;
}

interface SourceRecord {
  sourceLocale?: string | null;
}

interface WorkspaceEntity {
  id: string;
  profileId?: string;
  publicId?: string;
  slug?: string;
  canonicalName?: string;
  displayName: string;
  status?: string;
  completenessStatus?: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  localizedNames?: Record<string, string>;
  sourceLocale?: string | null;
  sourceRecords?: SourceRecord[];
  translations?: UniversityTranslation[];
  optionalFields?: Record<string, unknown>;
}

interface MajorSource {
  sourceLocale?: string | null;
}

interface Paginated<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface TranslationDraft {
  arName: string;
  arDescription: string;
  arStatus: UniversityTranslationReviewStatus;
  enName: string;
  enDescription: string;
  enStatus: UniversityTranslationReviewStatus;
}

interface DomainConfig {
  key: WorkspaceDomain;
  labelKey:
    | 'translation_domain_scholarships'
    | 'translation_domain_universities'
    | 'translation_domain_majors'
    | 'translation_domain_tests'
    | 'translation_domain_courses';
  endpoint: string;
  detailHref: (entity: WorkspaceEntity) => string;
  storage: TranslationStorage;
  icon: typeof Sparkles;
  supportsDescriptions: boolean;
  searchParam?: 'search' | 'query';
}

const reviewStates: UniversityTranslationReviewStatus[] = [
  'NEEDS_REVIEW',
  'APPROVED',
  'PUBLISHED',
  'REJECTED',
];

const domainConfigs: DomainConfig[] = [
  {
    key: 'SCHOLARSHIP',
    labelKey: 'translation_domain_scholarships',
    endpoint: '/admin/scholarships',
    detailHref: (entity) => `/scholarships/${entity.id}`,
    storage: 'COMPATIBILITY_OVERLAY',
    icon: Sparkles,
    supportsDescriptions: false,
    searchParam: 'query',
  },
  {
    key: 'UNIVERSITY',
    labelKey: 'translation_domain_universities',
    endpoint: '/admin/universities',
    detailHref: (entity) => `/universities/${entity.id}`,
    storage: 'NORMALIZED',
    icon: Building2,
    supportsDescriptions: true,
    searchParam: 'search',
  },
  {
    key: 'MAJOR',
    labelKey: 'translation_domain_majors',
    endpoint: '/admin/majors',
    detailHref: (entity) =>
      `/majors/${entity.id}${entity.profileId ? `?profileId=${encodeURIComponent(entity.profileId)}` : ''}`,
    storage: 'EXPLICIT_FIELDS',
    icon: GraduationCap,
    supportsDescriptions: false,
    searchParam: 'search',
  },
  {
    key: 'INTERNATIONAL_TEST',
    labelKey: 'translation_domain_tests',
    endpoint: '/admin/international-tests',
    detailHref: (entity) => `/international-tests/${entity.id}`,
    storage: 'EXPLICIT_FIELDS',
    icon: FileText,
    supportsDescriptions: false,
    searchParam: 'search',
  },
  {
    key: 'COURSE',
    labelKey: 'translation_domain_courses',
    endpoint: '/admin/courses',
    detailHref: (entity) => `/courses/${entity.id}`,
    storage: 'COMPATIBILITY_OVERLAY',
    icon: BookOpen,
    supportsDescriptions: false,
    searchParam: 'search',
  },
];

function nonEmpty(value?: string | null): boolean {
  return Boolean(value?.trim());
}

function normalizedNames(entity: WorkspaceEntity): Record<string, string> {
  if (entity.localizedNames && typeof entity.localizedNames === 'object')
    return entity.localizedNames;
  const optional = entity.optionalFields;
  if (!optional || typeof optional !== 'object' || Array.isArray(optional)) return {};
  const localizedNames = optional.localizedNames;
  if (!localizedNames || typeof localizedNames !== 'object' || Array.isArray(localizedNames))
    return {};
  return Object.fromEntries(
    Object.entries(localizedNames).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
}

function universityLocalePresent(entity: WorkspaceEntity, locale: SupportedLocale): boolean {
  const translation = entity.translations?.find((item) => item.locale === locale);
  return Boolean(
    translation && nonEmpty(translation.displayName) && translation.reviewStatus !== 'REJECTED',
  );
}

function coverage(domain: WorkspaceDomain, entity: WorkspaceEntity) {
  if (domain === 'UNIVERSITY') {
    return {
      ar: universityLocalePresent(entity, 'ar'),
      en: universityLocalePresent(entity, 'en'),
    };
  }

  if (domain === 'MAJOR' || domain === 'INTERNATIONAL_TEST') {
    return {
      ar: nonEmpty(entity.localizedNameAr),
      en: nonEmpty(entity.localizedNameEn),
    };
  }

  const names = normalizedNames(entity);
  return {
    ar: nonEmpty(names.ar),
    en: nonEmpty(names.en),
  };
}

function sourceLocaleFrom(
  values: readonly { sourceLocale?: string | null }[] | undefined,
): SupportedLocale | null {
  const found = values?.find(
    (value) => value.sourceLocale === 'ar' || value.sourceLocale === 'en',
  )?.sourceLocale;
  return found === 'ar' || found === 'en' ? found : null;
}

function makeDraft(domain: WorkspaceDomain, entity: WorkspaceEntity): TranslationDraft {
  if (domain === 'UNIVERSITY') {
    const ar = entity.translations?.find((item) => item.locale === 'ar');
    const en = entity.translations?.find((item) => item.locale === 'en');
    return {
      arName: ar?.displayName ?? '',
      arDescription: ar?.description ?? '',
      arStatus: ar?.reviewStatus ?? 'NEEDS_REVIEW',
      enName: en?.displayName ?? '',
      enDescription: en?.description ?? '',
      enStatus: en?.reviewStatus ?? 'NEEDS_REVIEW',
    };
  }

  if (domain === 'MAJOR' || domain === 'INTERNATIONAL_TEST') {
    return {
      arName: entity.localizedNameAr ?? '',
      arDescription: '',
      arStatus: 'NEEDS_REVIEW',
      enName: entity.localizedNameEn ?? '',
      enDescription: '',
      enStatus: 'NEEDS_REVIEW',
    };
  }

  const names = normalizedNames(entity);
  return {
    arName: names.ar ?? '',
    arDescription: '',
    arStatus: 'NEEDS_REVIEW',
    enName: names.en ?? '',
    enDescription: '',
    enStatus: 'NEEDS_REVIEW',
  };
}

function recordMatchesSearch(entity: WorkspaceEntity, search: string): boolean {
  if (!search.trim()) return true;
  const query = search.trim().toLocaleLowerCase();
  return [
    entity.displayName,
    entity.canonicalName,
    entity.publicId,
    entity.slug,
    entity.localizedNameAr,
    entity.localizedNameEn,
    ...Object.values(normalizedNames(entity)),
    ...(entity.translations ?? []).map((item) => item.displayName),
  ]
    .filter((value): value is string => typeof value === 'string')
    .some((value) => value.toLocaleLowerCase().includes(query));
}

export function AdminTranslationWorkspacePage() {
  const { t, language, dir } = useTranslation();
  const [domain, setDomain] = useState<WorkspaceDomain>('SCHOLARSHIP');
  const [coverageFilter, setCoverageFilter] = useState<CoverageFilter>('ALL');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState<Paginated<WorkspaceEntity> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<WorkspaceEntity | null>(null);
  const [majorSources, setMajorSources] = useState<MajorSource[]>([]);
  const [draft, setDraft] = useState<TranslationDraft | null>(null);
  const [saving, setSaving] = useState<SupportedLocale | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [readbackFailed, setReadbackFailed] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const listGeneration = useRef(0);
  const detailGeneration = useRef(0);
  const mutationBusy = useRef(false);
  const dirty = Boolean(
    selected && draft && JSON.stringify(draft) !== JSON.stringify(makeDraft(domain, selected)),
  );
  const allowNavigation = () =>
    !mutationBusy.current &&
    (!dirty ||
      window.confirm(
        language === 'ar'
          ? 'توجد تعديلات غير محفوظة. هل تريد تركها؟'
          : 'Discard unsaved translation changes?',
      ));

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirty) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', onUnload);
    return () => window.removeEventListener('beforeunload', onUnload);
  }, [dirty]);

  const config = domainConfigs.find((item) => item.key === domain)!;
  const contentAuthoringEnabled = canAuthorDomainTranslations(domain);

  const load = useCallback(async () => {
    const generation = ++listGeneration.current;
    ++detailGeneration.current;
    setLoading(true);
    setError(null);
    setNotice(null);
    setResult(null);
    setSelected(null);
    setDraft(null);
    setMajorSources([]);
    setDetailLoading(false);
    setReadbackFailed(false);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '40' });
      if (domain === 'MAJOR') params.set('catalog', 'false');
      if (config.searchParam && debouncedSearch) params.set(config.searchParam, debouncedSearch);
      const response = await adminApiClient.request<Paginated<WorkspaceEntity>>(
        `${config.endpoint}?${params.toString()}`,
      );
      if (generation !== listGeneration.current) return;
      if (!Array.isArray(response.data)) throw new Error('Invalid translation list response');
      const totalPages = Math.max(1, response.totalPages ?? Math.ceil(response.total / 40));
      if (page > totalPages) {
        setPage(totalPages);
        return;
      }
      setResult({ ...response, totalPages });
    } catch (err: unknown) {
      if (generation === listGeneration.current)
        setError(err instanceof Error ? err.message : t('translation_load_error'));
    } finally {
      if (generation === listGeneration.current) setLoading(false);
    }
  }, [domain, page, debouncedSearch, config, t]);

  useEffect(() => {
    void load();
    return () => {
      ++listGeneration.current;
      ++detailGeneration.current;
    };
  }, [load]);

  const records = result?.data ?? [];

  const stats = useMemo(() => {
    const states = records.map((entity) => coverage(domain, entity));
    return {
      loaded: records.length,
      missingAr: states.filter((item) => !item.ar).length,
      missingEn: states.filter((item) => !item.en).length,
      complete: states.filter((item) => item.ar && item.en).length,
    };
  }, [domain, records]);

  const visible = useMemo(
    () =>
      records.filter((entity) => {
        const state = coverage(domain, entity);
        if (!config.searchParam && !recordMatchesSearch(entity, search)) return false;
        if (coverageFilter === 'MISSING_AR') return !state.ar;
        if (coverageFilter === 'MISSING_EN') return !state.en;
        if (coverageFilter === 'COMPLETE') return state.ar && state.en;
        return true;
      }),
    [config.searchParam, coverageFilter, domain, records, search],
  );

  const selectRecord = async (entity: WorkspaceEntity) => {
    if (!allowNavigation()) return;
    const generation = ++detailGeneration.current;
    setSelected(null);
    setDraft(null);
    setMajorSources([]);
    setError(null);
    setNotice(null);
    setDetailLoading(true);
    try {
      const detail = await adminApiClient.request<WorkspaceEntity>(
        `${config.endpoint}/${encodeURIComponent(entity.id)}`,
      );
      if (generation !== detailGeneration.current) return;
      if (detail.id !== entity.id) throw new Error('Translation record identity mismatch');
      updateSelectedRecord({ ...detail, profileId: entity.profileId });
      setReadbackFailed(false);
      setDraft(makeDraft(domain, detail));
      if (domain === 'MAJOR') {
        const response = await adminApiClient.request<{ data: MajorSource[] }>(
          `/admin/majors/${encodeURIComponent(entity.id)}/sources`,
        );
        if (generation === detailGeneration.current) setMajorSources(response.data ?? []);
      }
    } catch (err: unknown) {
      if (generation === detailGeneration.current)
        setError(err instanceof Error ? err.message : t('translation_load_error'));
    } finally {
      if (generation === detailGeneration.current) setDetailLoading(false);
    }
  };

  const sourceLocale =
    domain === 'UNIVERSITY'
      ? sourceLocaleFrom(selected?.sourceRecords)
      : domain === 'MAJOR'
        ? sourceLocaleFrom(majorSources)
        : selected?.sourceLocale === 'ar' || selected?.sourceLocale === 'en'
          ? selected.sourceLocale
          : null;

  const updateSelectedRecord = (updated: WorkspaceEntity) => {
    setSelected(updated);
    setResult((current) =>
      current
        ? {
            ...current,
            // A major list row represents a degree profile; preserve its code,
            // lifecycle, and level while refreshing the root translation fields.
            data: current.data.map((item) =>
              item.id === updated.id
                ? {
                    ...item,
                    localizedNameAr: updated.localizedNameAr,
                    localizedNameEn: updated.localizedNameEn,
                    localizedNames: updated.localizedNames,
                    optionalFields: updated.optionalFields,
                    translations: updated.translations,
                  }
                : item,
            ),
          }
        : current,
    );
  };

  const saveLocale = async (locale: SupportedLocale) => {
    if (!selected || !draft || mutationBusy.current || detailLoading || loading || readbackFailed)
      return;
    if (!contentAuthoringEnabled) {
      setError(t('translation_content_writes_blocked'));
      return;
    }
    mutationBusy.current = true;
    setSaving(locale);
    setError(null);
    setNotice(null);
    let written = false;
    const submittedDraft = draft;
    try {
      const localizedName = (locale === 'ar' ? draft.arName : draft.enName).trim() || null;
      if (domain === 'UNIVERSITY') {
        await adminApiClient.request<UniversityTranslation>(
          `/admin/universities/${encodeURIComponent(selected.id)}/translations/${locale}`,
          {
            method: 'PUT',
            body: JSON.stringify({
              displayName: localizedName,
              description:
                (locale === 'ar' ? draft.arDescription : draft.enDescription).trim() || null,
              reviewStatus: locale === 'ar' ? draft.arStatus : draft.enStatus,
            }),
          },
        );
      } else {
        const nextNames = { ...normalizedNames(selected) };
        if (localizedName) nextNames[locale] = localizedName;
        else delete nextNames[locale];
        const patch =
          domain === 'MAJOR' || domain === 'INTERNATIONAL_TEST'
            ? locale === 'ar'
              ? { localizedNameAr: localizedName }
              : { localizedNameEn: localizedName }
            : { localizedNames: nextNames };
        await adminApiClient.request<WorkspaceEntity>(
          `${config.endpoint}/${encodeURIComponent(selected.id)}`,
          { method: 'PATCH', body: JSON.stringify(patch) },
        );
      }
      written = true;
      const updated = await adminApiClient.request<WorkspaceEntity>(
        `${config.endpoint}/${encodeURIComponent(selected.id)}`,
      );
      if (updated.id !== selected.id) throw new Error('Translation record identity mismatch');
      updateSelectedRecord({ ...updated, profileId: selected.profileId });
      const savedDraft = makeDraft(domain, updated);
      setDraft(
        locale === 'ar'
          ? {
              ...submittedDraft,
              arName: savedDraft.arName,
              arDescription: savedDraft.arDescription,
              arStatus: savedDraft.arStatus,
            }
          : {
              ...submittedDraft,
              enName: savedDraft.enName,
              enDescription: savedDraft.enDescription,
              enStatus: savedDraft.enStatus,
            },
      );
      setNotice(
        language === 'ar'
          ? 'تم الحفظ وإعادة قراءة السجل. النشر يتم من صفحة المحتوى الأصلية.'
          : 'Saved and reloaded. Publish from the original content page.',
      );
    } catch (err: unknown) {
      if (written) setReadbackFailed(true);
      const message = err instanceof Error ? err.message : t('translation_save_error');
      setError(
        written
          ? (language === 'ar'
              ? 'نجح طلب الحفظ، لكن تعذرت إعادة القراءة. أعد التحميل قبل إعادة الحفظ: '
              : 'Save succeeded but reload failed. Refresh before retrying: ') + message
          : message,
      );
    } finally {
      mutationBusy.current = false;
      setSaving(null);
    }
  };

  return (
    <main className="mx-auto max-w-[1500px] space-y-5 text-[#203442]" dir={dir}>
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-52 w-52 rounded-full bg-[#F2CD78] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-sm border border-white/15">
                <Languages className="h-3.5 w-3.5" /> {t('translation_center_badge')}
              </span>
              <span className="rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-sm">
                AR + EN
              </span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              {t('translation_center_title')}
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-white/80">
              {t('translation_center_subtitle')}
            </p>
          </div>
          <button
            type="button"
            disabled={loading || Boolean(saving)}
            onClick={() => {
              if (allowNavigation()) void load();
            }}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] disabled:opacity-60"
          >
            <RefreshCw className="h-4 w-4" /> {t('refresh')}
          </button>
        </div>
      </section>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label={t('translation_loaded_records')}
          value={stats.loaded}
          icon={Database}
          accent="#142B5F"
        />
        <MetricCard
          label={language === 'ar' ? 'الأسماء متوفرة (AR + EN)' : 'Names available (AR + EN)'}
          value={stats.complete}
          icon={CheckCircle2}
          accent="#2E7D5A"
        />
        <MetricCard
          label={t('translation_missing_ar')}
          value={stats.missingAr}
          icon={Languages}
          accent="#D6A43B"
        />
        <MetricCard
          label={t('translation_missing_en')}
          value={stats.missingEn}
          icon={Sparkles}
          accent="#21A7B4"
        />
      </div>

      <section className="flex flex-col gap-3 rounded-2xl border border-[#D6A43B]/30 bg-[#F2CD78]/15 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 gap-3">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#8A6517]" />
          <div>
            <div className="text-xs font-black text-[#725718]">
              {t('translation_infrastructure_only_title')}
            </div>
            <p className="mt-1 text-[11px] font-semibold leading-6 text-[#725718]/85">
              {t('translation_infrastructure_only_help')}
            </p>
          </div>
        </div>
        <code className="shrink-0 rounded-lg border border-[#D6A43B]/25 bg-white/70 px-3 py-2 text-[10px] font-black text-[#725718]">
          {TRANSLATION_CONTENT_MODE}
        </code>
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-8">
        {domainConfigs.map((item) => {
          const Icon = item.icon;
          const active = domain === item.key;
          return (
            <button
              type="button"
              key={item.key}
              disabled={Boolean(saving)}
              onClick={() => {
                if (!allowNavigation()) return;
                setDomain(item.key);
                setSearch('');
                setDebouncedSearch('');
                setPage(1);
                setCoverageFilter('ALL');
              }}
              className={`rounded-2xl border p-4 text-start transition ${active ? 'border-[#0E7C86] bg-[#DDEFF2]/55 ring-2 ring-[#21A7B4]/15' : 'border-[#DDEFF2] bg-white hover:border-[#21A7B4]/55'}`}
            >
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${active ? 'bg-[#142B5F] text-white' : 'bg-[#FAF7F0] text-[#0E7C86]'}`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <div className="mt-3 text-xs font-black text-[#142B5F]">{t(item.labelKey)}</div>
              <div className="mt-1 text-[10px] font-bold text-slate-400">
                {storageLabel(item.storage, t)}
              </div>
            </button>
          );
        })}

        <Link
          to="/cms"
          className="rounded-2xl border border-[#D6A43B]/30 bg-[#F2CD78]/15 p-4 text-start transition hover:border-[#D6A43B]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#D6A43B] text-white">
            <FileText className="h-5 w-5" />
          </span>
          <div className="mt-3 text-xs font-black text-[#142B5F]">
            {t('translation_domain_cms')}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#8A6517]">
            {t('translation_cms_managed_in_cms')}
          </div>
        </Link>

        <Link
          to="/settings/reference-data"
          className="rounded-2xl border border-[#0E7C86]/20 bg-[#DDEFF2]/25 p-4 text-start transition hover:border-[#0E7C86]"
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#0E7C86] text-white">
            <Database className="h-5 w-5" />
          </span>
          <div className="mt-3 text-xs font-black text-[#142B5F]">
            {t('translation_domain_reference')}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#0E7C86]">
            {t('translation_reference_source_managed')}
          </div>
        </Link>

        <div className="rounded-2xl border border-[#21A7B4]/25 bg-[#DDEFF2]/25 p-4 text-start">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#21A7B4] text-white">
            <Languages className="h-5 w-5" />
          </span>
          <div className="mt-3 text-xs font-black text-[#142B5F]">
            {t('translation_domain_interface')}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#0E7C86]">
            {t('translation_ui_source_managed')}
          </div>
        </div>
      </section>

      <p className="text-xs font-semibold text-slate-500">
        {language === 'ar'
          ? 'المؤشرات وفلتر التغطية يخصان أسماء السجلات في الصفحة الحالية؛ وجود الاسم لا يعني اعتماد الترجمة أو نشرها.'
          : 'Coverage metrics and filters apply to names on this page. A name does not imply translation approval or publication.'}
      </p>

      <section className="grid gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-4 md:grid-cols-[220px_1fr_auto]">
        <select
          value={coverageFilter}
          disabled={Boolean(saving)}
          onChange={(event) => setCoverageFilter(event.target.value as CoverageFilter)}
          className="min-h-11 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/60 px-3 text-xs font-bold outline-none focus:border-[#21A7B4]"
        >
          <option value="ALL">{t('translation_filter_all')}</option>
          <option value="MISSING_AR">{t('translation_missing_ar')}</option>
          <option value="MISSING_EN">{t('translation_missing_en')}</option>
          <option value="COMPLETE">{t('translation_complete_bilingual')}</option>
        </select>
        <label className="relative">
          <Search
            className={`pointer-events-none absolute top-3.5 h-4 w-4 text-slate-400 ${language === 'ar' ? 'right-3' : 'left-3'}`}
          />
          <input
            value={search}
            disabled={Boolean(saving)}
            maxLength={200}
            onChange={(event) => {
              if (!allowNavigation()) return;
              setSearch(event.target.value);
              setPage(1);
            }}
            aria-label={t('translation_search')}
            placeholder={t('translation_search_placeholder')}
            className={`min-h-11 w-full rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/45 text-xs font-bold outline-none focus:border-[#21A7B4] ${language === 'ar' ? 'pr-10 pl-3' : 'pl-10 pr-3'}`}
          />
        </label>
        <span className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white">
          {t(config.labelKey)}
        </span>
      </section>

      <RuntimeNotice storage={config.storage} />
      {domain === 'MAJOR' && (
        <p className="rounded-xl bg-teal-50 p-3 text-xs text-teal-800">
          {language === 'ar'
            ? 'هذه مساحة أسماء الجذر المشترك للتخصص. محتوى كل درجة وحالته ونشره تُدار من صفحة التخصص بملف المستوى المحدد.'
            : 'This workspace reads shared major root names. Manage each degree profile’s content, status, and publication from its detail page.'}
        </p>
      )}

      {notice && (
        <div
          role="status"
          className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-800"
        >
          {notice}
        </div>
      )}
      {dirty && (
        <p className="text-xs text-amber-700">
          {language === 'ar' ? 'توجد تعديلات غير محفوظة.' : 'Unsaved changes.'}
        </p>
      )}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.15fr)_minmax(430px,0.85fr)]">
        <section className="overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-[#DDEFF2] px-5 py-4">
            <div>
              <h2 className="text-sm font-black text-[#142B5F]">
                {t('translation_records_title')}
              </h2>
              <p className="mt-1 text-[11px] font-medium text-slate-500">
                {t('translation_records_help')}
              </p>
            </div>
            <span className="rounded-full bg-[#DDEFF2]/60 px-3 py-1 text-[10px] font-black text-[#0E7C86]">
              {visible.length}
            </span>
          </div>
          {loading ? (
            <div className="flex h-72 items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#0E7C86]" />
            </div>
          ) : visible.length === 0 ? (
            <div className="p-12 text-center text-sm font-semibold text-slate-500">
              {t('translation_no_records')}
            </div>
          ) : (
            <div className="divide-y divide-[#DDEFF2]">
              {visible.map((entity) => {
                const state = coverage(domain, entity);
                const active =
                  selected?.id === entity.id && selected?.profileId === entity.profileId;
                return (
                  <button
                    key={`${domain}:${entity.id}:${entity.profileId ?? 'root'}`}
                    type="button"
                    disabled={Boolean(saving)}
                    onClick={() => void selectRecord(entity)}
                    className={`grid w-full gap-3 p-4 text-start transition sm:grid-cols-[1fr_auto] sm:items-center ${active ? 'bg-[#DDEFF2]/45' : 'hover:bg-[#FAF7F0]/60'}`}
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-black text-[#142B5F]">
                        {(language === 'ar'
                          ? entity.localizedNameAr ||
                            normalizedNames(entity).ar ||
                            entity.translations?.find(
                              (item) => item.locale === 'ar' && item.reviewStatus !== 'REJECTED',
                            )?.displayName
                          : entity.localizedNameEn ||
                            normalizedNames(entity).en ||
                            entity.translations?.find(
                              (item) => item.locale === 'en' && item.reviewStatus !== 'REJECTED',
                            )?.displayName) || entity.displayName}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold text-slate-400">
                        <span>{entity.publicId || entity.slug || entity.id}</span>
                        {entity.status && <span>• {entity.status}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <LocaleBadge locale="AR" complete={state.ar} />
                      <LocaleBadge locale="EN" complete={state.en} />
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {(result?.totalPages ?? 0) > 1 && (
            <div className="flex items-center justify-between border-t border-[#DDEFF2] p-4">
              <button
                type="button"
                disabled={loading || Boolean(saving) || page <= 1}
                onClick={() => {
                  if (allowNavigation()) setPage((value) => Math.max(1, value - 1));
                }}
                className="inline-flex items-center gap-1 rounded-lg border border-[#DDEFF2] px-3 py-2 text-[11px] font-black text-[#0E7C86] disabled:opacity-40"
              >
                {language === 'ar' ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
                {t('previous')}
              </button>
              <span className="text-[11px] font-black text-slate-500">
                {t('page')} {page} {t('of')} {result?.totalPages ?? 1}
              </span>
              <button
                type="button"
                disabled={loading || Boolean(saving) || page >= (result?.totalPages ?? 1)}
                onClick={() => {
                  if (allowNavigation()) setPage((value) => value + 1);
                }}
                className="inline-flex items-center gap-1 rounded-lg bg-[#142B5F] px-3 py-2 text-[11px] font-black text-white disabled:opacity-40"
              >
                {t('next')}
                {language === 'ar' ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </button>
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
          {detailLoading ? (
            <div className="flex min-h-[420px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-teal-700" />
            </div>
          ) : !selected || !draft ? (
            <div className="flex min-h-[420px] flex-col items-center justify-center text-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#DDEFF2]/70 text-[#0E7C86]">
                <Languages className="h-7 w-7" />
              </span>
              <h2 className="mt-4 text-base font-black text-[#142B5F]">
                {t('translation_select_record')}
              </h2>
              <p className="mt-2 max-w-sm text-xs font-medium leading-6 text-slate-500">
                {t('translation_select_record_help')}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl bg-[#FAF7F0]/80 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-[10px] font-black uppercase tracking-wider text-[#0E7C86]">
                      {t('translation_canonical_source')}
                    </div>
                    <h2 className="mt-1 break-words text-lg font-black text-[#142B5F]">
                      {selected.canonicalName || selected.displayName}
                    </h2>
                    <div className="mt-1 text-[10px] font-bold text-slate-400">
                      {selected.publicId || selected.id}
                    </div>
                  </div>
                  <Link
                    to={config.detailHref(selected)}
                    onClick={(event) => {
                      if (!allowNavigation()) event.preventDefault();
                    }}
                    className="rounded-xl border border-[#DDEFF2] bg-white px-3 py-2 text-[10px] font-black text-[#0E7C86] hover:border-[#21A7B4]"
                  >
                    {t('translation_open_domain_record')}
                  </Link>
                </div>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <InfoPill
                    label={t('translation_source_locale')}
                    value={sourceLocale?.toUpperCase() || t('translation_unknown')}
                  />
                  <InfoPill
                    label={t('translation_storage')}
                    value={storageLabel(config.storage, t)}
                  />
                </div>
              </div>

              <LocaleEditor
                locale="ar"
                label={t('translation_arabic')}
                name={draft.arName}
                description={draft.arDescription}
                status={draft.arStatus}
                supportsDescriptions={config.supportsDescriptions}
                supportsReviewStatus={domain === 'UNIVERSITY'}
                saving={saving === 'ar'}
                contentAuthoringEnabled={
                  contentAuthoringEnabled &&
                  !saving &&
                  !loading &&
                  !detailLoading &&
                  !readbackFailed
                }
                onNameChange={(value) =>
                  setDraft((current) => (current ? { ...current, arName: value } : current))
                }
                onDescriptionChange={(value) =>
                  setDraft((current) => (current ? { ...current, arDescription: value } : current))
                }
                onStatusChange={(value) =>
                  setDraft((current) => (current ? { ...current, arStatus: value } : current))
                }
                onSave={() => void saveLocale('ar')}
              />

              <LocaleEditor
                locale="en"
                label={t('translation_english')}
                name={draft.enName}
                description={draft.enDescription}
                status={draft.enStatus}
                supportsDescriptions={config.supportsDescriptions}
                supportsReviewStatus={domain === 'UNIVERSITY'}
                saving={saving === 'en'}
                contentAuthoringEnabled={
                  contentAuthoringEnabled &&
                  !saving &&
                  !loading &&
                  !detailLoading &&
                  !readbackFailed
                }
                onNameChange={(value) =>
                  setDraft((current) => (current ? { ...current, enName: value } : current))
                }
                onDescriptionChange={(value) =>
                  setDraft((current) => (current ? { ...current, enDescription: value } : current))
                }
                onStatusChange={(value) =>
                  setDraft((current) => (current ? { ...current, enStatus: value } : current))
                }
                onSave={() => void saveLocale('en')}
              />

              {!config.supportsDescriptions && (
                <div className="flex gap-3 rounded-xl border border-[#D6A43B]/25 bg-[#F2CD78]/15 p-4 text-xs font-semibold leading-6 text-[#725718]">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{t('translation_long_form_governance_note')}</span>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

function LocaleEditor(props: {
  locale: SupportedLocale;
  label: string;
  name: string;
  description: string;
  status: UniversityTranslationReviewStatus;
  supportsDescriptions: boolean;
  supportsReviewStatus: boolean;
  saving: boolean;
  contentAuthoringEnabled: boolean;
  onNameChange: (value: string) => void;
  onDescriptionChange: (value: string) => void;
  onStatusChange: (value: UniversityTranslationReviewStatus) => void;
  onSave: () => void;
}) {
  const { t } = useTranslation();
  const textDirection = props.locale === 'ar' ? 'rtl' : 'ltr';
  return (
    <div className="rounded-2xl border border-[#DDEFF2] p-4">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <LocaleBadge locale={props.locale.toUpperCase()} complete={nonEmpty(props.name)} />
          <span className="text-xs font-black text-[#142B5F]">{props.label}</span>
        </div>
        {props.supportsReviewStatus && (
          <select
            value={props.status}
            disabled={!props.contentAuthoringEnabled}
            onChange={(event) =>
              props.onStatusChange(event.target.value as UniversityTranslationReviewStatus)
            }
            className="rounded-lg border border-[#DDEFF2] bg-[#FAF7F0]/50 px-2 py-1.5 text-[10px] font-bold disabled:cursor-not-allowed disabled:opacity-60"
          >
            {reviewStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        )}
      </div>
      <label className="block text-[10px] font-black text-slate-500">
        {t('translation_display_name')}
      </label>
      <input
        dir={textDirection}
        value={props.name}
        readOnly={!props.contentAuthoringEnabled}
        onChange={(event) => props.onNameChange(event.target.value)}
        className={`mt-1 min-h-11 w-full rounded-xl border border-[#DDEFF2] px-3 text-sm font-bold outline-none focus:border-[#21A7B4] ${props.contentAuthoringEnabled ? 'bg-[#FAF7F0]/40' : 'cursor-not-allowed bg-slate-50 text-slate-500'}`}
      />
      {props.supportsDescriptions && (
        <>
          <label className="mt-3 block text-[10px] font-black text-slate-500">
            {t('translation_description')}
          </label>
          <textarea
            dir={textDirection}
            value={props.description}
            readOnly={!props.contentAuthoringEnabled}
            onChange={(event) => props.onDescriptionChange(event.target.value)}
            rows={4}
            className={`mt-1 w-full rounded-xl border border-[#DDEFF2] p-3 text-xs font-medium leading-6 outline-none focus:border-[#21A7B4] ${props.contentAuthoringEnabled ? 'bg-[#FAF7F0]/40' : 'cursor-not-allowed bg-slate-50 text-slate-500'}`}
          />
        </>
      )}
      <button
        type="button"
        onClick={props.onSave}
        disabled={props.saving || !props.contentAuthoringEnabled}
        className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white transition hover:bg-[#0E7C86] disabled:cursor-not-allowed disabled:bg-slate-300 disabled:text-slate-600"
      >
        {props.saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}{' '}
        {props.contentAuthoringEnabled
          ? t('translation_save_locale')
          : t('translation_content_deferred')}
      </button>
    </div>
  );
}

function LocaleBadge({ locale, complete }: { locale: string; complete: boolean }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 text-[10px] font-black ${complete ? 'border-[#0E7C86]/20 bg-[#0E7C86]/8 text-[#0E7C86]' : 'border-amber-200 bg-amber-50 text-amber-700'}`}
    >
      {locale} {complete ? '✓' : '—'}
    </span>
  );
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[#DDEFF2] bg-white px-3 py-2">
      <div className="text-[9px] font-black text-slate-400">{label}</div>
      <div className="mt-1 text-[11px] font-black text-[#203442]">{value}</div>
    </div>
  );
}

function RuntimeNotice({ storage }: { storage: TranslationStorage }) {
  const { t } = useTranslation();
  if (storage !== 'COMPATIBILITY_OVERLAY') {
    return (
      <div className="flex gap-3 rounded-2xl border border-[#0E7C86]/15 bg-[#DDEFF2]/30 p-4 text-xs font-semibold leading-6 text-[#203442]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#0E7C86]" />
        <span>{t('translation_source_only_notice')}</span>
      </div>
    );
  }
  return (
    <div className="flex gap-3 rounded-2xl border border-[#D6A43B]/25 bg-[#F2CD78]/15 p-4 text-xs font-semibold leading-6 text-[#725718]">
      <Database className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{t('translation_compatibility_storage_notice')}</span>
    </div>
  );
}

function storageLabel(
  storage: TranslationStorage,
  t: (key: AdminTranslationKey) => string,
): string {
  if (storage === 'NORMALIZED') return t('translation_storage_normalized');
  if (storage === 'EXPLICIT_FIELDS') return t('translation_storage_explicit');
  return t('translation_storage_compatibility');
}
