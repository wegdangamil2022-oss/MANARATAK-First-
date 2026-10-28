import { TranslationOwnerCapabilitiesPanel } from '../components/TranslationOwnerCapabilitiesPanel';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowUpLeft,
  ArrowDownWideNarrow,
  CalendarDays,
  Eye,
  Files,
  Globe2,
  LayoutGrid,
  ListFilter,
  RotateCcw,
  Route,
  Table2,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Database,
  FileText,
  Languages,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTranslationOwnerCapabilities } from '../features/translations/useTranslationOwnerCapabilities';
import {
  translationWorkspaceState,
  changeTranslationWorkspaceState,
} from '../features/translations/workspaceState';
import { TranslationRecordDialog } from '../features/translations/TranslationRecordDialog';
import { useAdministrationDraftGuard } from '../features/reference-data/useAdministrationDraftGuard';
import '../features/translations/translations.css';
import { canAuthorDomainTranslations, TRANSLATION_CONTENT_MODE } from '@manaratak/shared';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

import {
  domainConfigs,
  coverage,
  normalizedNames,
  makeDraft,
  sourceLocaleFrom,
  storageLabel,
  type Paginated,
  type WorkspaceEntity,
  type MajorSource,
  type TranslationDraft,
  type SupportedLocale,
  type UniversityTranslation,
} from '../features/translations/workspaceModel';
import {
  LocaleEditor,
  LocaleBadge,
  InfoPill,
  RuntimeNotice,
} from '../features/translations/TranslationLocaleContent';
export function AdminTranslationWorkspacePage() {
  const { t, language, dir } = useTranslation();
  const ar = language === 'ar';
  const tr = (arabic: string, english: string) => (ar ? arabic : english);
  const number = (value: number) => new Intl.NumberFormat(language).format(value);
  const { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams();
  const queryState = translationWorkspaceState(params);
  const capabilities = useTranslationOwnerCapabilities();
  const allowedDomains = useMemo(
    () =>
      domainConfigs.filter((item) =>
        capabilities.data?.some((capability) => capability.key === item.key),
      ),
    [capabilities.data],
  );
  const domain =
    !params.has('domain') && allowedDomains.length ? allowedDomains[0].key : queryState.domain;
  const canReadSelected = allowedDomains.some((item) => item.key === domain);
  const {
    coverage: coverageFilter,
    search,
    reviewState,
    locale: reviewLocale,
    updatedFrom,
    page,
    pageSize,
    sort,
    tab: activeTab,
  } = queryState;
  const [view, setView] = useState<'table' | 'cards'>('table');
  const [previewLocale, setPreviewLocale] = useState<SupportedLocale>('ar');
  const [detailArea, setDetailArea] = useState<'content' | 'source'>('content');
  const [detailError, setDetailError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [requestedRecord, setRequestedRecord] = useState<WorkspaceEntity | null>(null);
  const listAbort = useRef<AbortController | null>(null),
    detailAbort = useRef<AbortController | null>(null);
  const setPage = useCallback(
    (value: number) =>
      setParams((current) => changeTranslationWorkspaceState(current, { page: String(value) })),
    [setParams],
  );
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
  const [debouncedSearch, setDebouncedSearch] = useState(queryState.search.trim());
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

  useAdministrationDraftGuard(dirty && typeof document !== 'undefined' && !!window.history, ar);
  const change = (updates: Record<string, string>, replace = false) => {
    if (!allowNavigation()) return;
    setParams((current) => changeTranslationWorkspaceState(current, { domain, ...updates }), {
      replace,
    });
  };
  const closeDetail = () => {
    if (!allowNavigation()) return;
    ++detailGeneration.current;
    detailAbort.current?.abort();
    setSelected(null);
    setDraft(null);
    setRequestedRecord(null);
    setDetailError(null);
    setDetailLoading(false);
    setSaveError(null);
  };
  const config = domainConfigs.find((item) => item.key === domain)!;
  const contentAuthoringEnabled = canAuthorDomainTranslations(domain);

  const load = useCallback(async () => {
    const generation = ++listGeneration.current;
    listAbort.current?.abort();
    detailAbort.current?.abort();
    const abort = new AbortController();
    listAbort.current = abort;
    ++detailGeneration.current;
    setLoading(true);
    setError(null);
    setNotice(null);
    setResult(null);
    setDetailError(null);
    setRequestedRecord(null);
    setSelected(null);
    setDraft(null);
    setMajorSources([]);
    setDetailLoading(false);
    setReadbackFailed(false);
    try {
      if (
        capabilities.loading ||
        capabilities.error ||
        !canReadSelected ||
        activeTab !== 'records' ||
        search.trim() !== debouncedSearch
      ) {
        if (
          !capabilities.loading &&
          !capabilities.error &&
          !canReadSelected &&
          capabilities.data?.length
        )
          setError(
            language === 'ar'
              ? 'هذا القسم غير مصرح لحسابك. اختر قسمًا متاحًا.'
              : 'This owner is not permitted. Choose an available section.',
          );
        return;
      }
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize), sort });
      params.set('domain', domain);
      params.set('coverage', coverageFilter);
      params.set('locale', reviewLocale);
      params.set('reviewState', reviewState);
      if (updatedFrom) params.set('updatedFrom', new Date(updatedFrom).toISOString());
      if (debouncedSearch) params.set('q', debouncedSearch);
      const response = await adminApiClient.request<Paginated<WorkspaceEntity>>(
        `/admin/translations/workspace?${params.toString()}`,
        { signal: abort.signal, cache: 'no-store' },
      );
      if (generation !== listGeneration.current) return;
      if (
        !Array.isArray(response.data) ||
        response.coverageScope !== 'GLOBAL' ||
        !Number.isSafeInteger(response.total) ||
        response.total < 0 ||
        !Number.isSafeInteger(response.totalPages) ||
        response.totalPages < 0 ||
        response.data.some((row) => typeof row.id !== 'string' || !row.id)
      )
        throw new Error('Invalid translation list response');
      const totalPages = Math.max(1, response.totalPages ?? Math.ceil(response.total / pageSize));
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
  }, [
    domain,
    page,
    pageSize,
    sort,
    debouncedSearch,
    search,
    t,
    coverageFilter,
    reviewLocale,
    reviewState,
    updatedFrom,
    capabilities.loading,
    capabilities.error,
    capabilities.data,
    canReadSelected,
    activeTab,
    language,
    setPage,
  ]);

  useEffect(() => {
    const listEpoch = listGeneration,
      detailEpoch = detailGeneration;
    void load();
    return () => {
      listAbort.current?.abort();
      detailAbort.current?.abort();
      ++listEpoch.current;
      ++detailEpoch.current;
    };
  }, [load]);

  const records = useMemo(() => result?.data ?? [], [result]);

  const visible = records;
  const selectedIndex = visible.findIndex(
    (row) => row.id === selected?.id && row.profileId === selected?.profileId,
  );
  const recordName = (entity: WorkspaceEntity) =>
    (ar
      ? entity.localizedNameAr ||
        normalizedNames(entity).ar ||
        entity.translations?.find((row) => row.locale === 'ar' && row.reviewStatus !== 'REJECTED')
          ?.displayName
      : entity.localizedNameEn ||
        normalizedNames(entity).en ||
        entity.translations?.find((row) => row.locale === 'en' && row.reviewStatus !== 'REJECTED')
          ?.displayName) || entity.displayName;
  const stateLabel = (arabic?: string, english?: string) => {
    const state = reviewLocale === 'ar' ? arabic : english;
    const labels: Record<string, [string, string]> = {
      MISSING: ['الاسم غير موجود', 'Name missing'],
      NEEDS_REVIEW: ['تحتاج مراجعة', 'Needs review'],
      APPROVED: ['معتمدة حسب السجل', 'Recorded as approved'],
      PUBLISHED: ['منشورة حسب السجل', 'Recorded as published'],
      REJECTED: ['مرفوضة', 'Rejected'],
      VALUE_PRESENT_NOT_PUBLIC_READY: [
        'قيمة محفوظة؛ النشر غير مثبت',
        'Value present; publication unverified',
      ],
    };
    return state && labels[state]
      ? labels[state][ar ? 0 : 1]
      : tr('غير مثبتة في هذا العرض', 'Not verified in this view');
  };
  const selectRecord = async (entity: WorkspaceEntity) => {
    if (!allowNavigation()) return;
    const generation = ++detailGeneration.current;
    detailAbort.current?.abort();
    const abort = new AbortController();
    detailAbort.current = abort;
    setRequestedRecord(entity);
    setDetailArea('content');
    setDetailError(null);
    setSaveError(null);
    setSelected(null);
    setDraft(null);
    setMajorSources([]);
    setError(null);
    setNotice(null);
    setDetailLoading(true);
    try {
      const detail = await adminApiClient.request<WorkspaceEntity>(
        `${config.endpoint}/${encodeURIComponent(entity.id)}`,
        { signal: abort.signal, cache: 'no-store' },
      );
      if (generation !== detailGeneration.current) return;
      if (detail.id !== entity.id) throw new Error('Translation record identity mismatch');
      updateSelectedRecord({ ...detail, profileId: entity.profileId });
      setReadbackFailed(false);
      setDraft(makeDraft(domain, detail));
      if (domain === 'MAJOR') {
        const response = await adminApiClient.request<{ data: MajorSource[] }>(
          `/admin/majors/${encodeURIComponent(entity.id)}/sources`,
          { signal: abort.signal, cache: 'no-store' },
        );
        if (generation === detailGeneration.current) setMajorSources(response.data ?? []);
      }
    } catch (err: unknown) {
      if (generation === detailGeneration.current)
        setDetailError(err instanceof Error ? err.message : t('translation_load_error'));
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
      setSaveError(t('translation_content_writes_blocked'));
      return;
    }
    mutationBusy.current = true;
    setSaving(locale);
    setSaveError(null);
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
      setSaveError(
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
    <main className="translation-workspace" dir={dir}>
      <header className="translation-header">
        <div>
          <span className="translation-eyebrow">
            <Languages aria-hidden="true" />
            {tr('الترجمة والتوطين', 'Translation and localization')}
          </span>
          <h1>{tr('مركز الترجمة', 'Translation center')}</h1>
          <p>
            {tr(
              'تابع الأسماء العربية والإنجليزية، وافتح السجل الأصلي لاستكمال المحتوى ومراجعته.',
              'Track Arabic and English names, then open the original record for content and review.',
            )}
          </p>
        </div>
        <button
          type="button"
          disabled={loading || Boolean(saving) || capabilities.loading}
          onClick={() => {
            if (allowNavigation()) {
              if (capabilities.error) capabilities.reload();
              else void load();
            }
          }}
        >
          <RefreshCw aria-hidden="true" className={loading ? 'translation-spin' : ''} />
          {t('refresh')}
        </button>
      </header>
      <nav
        className="translation-tabs admin-section-navigation"
        aria-label={tr('مساحات مركز الترجمة', 'Translation workspaces')}
      >
        <button
          type="button"
          aria-current={activeTab === 'records' ? 'page' : undefined}
          onClick={() => change({ tab: 'records' })}
        >
          <Languages aria-hidden="true" />
          {tr('سجلات الترجمة', 'Translation records')}
        </button>
        <button
          type="button"
          aria-current={activeTab === 'routes' ? 'page' : undefined}
          onClick={() => change({ tab: 'routes' })}
        >
          <Route aria-hidden="true" />
          {tr('مسارات الترجمة', 'Translation routes')}
        </button>
      </nav>
      <div className="translation-policy">
        <ShieldCheck aria-hidden="true" />
        <span>
          <strong>
            {TRANSLATION_CONTENT_MODE === 'INFRASTRUCTURE_ONLY'
              ? tr('وضع المتابعة فقط', 'Tracking-only mode')
              : tr('وضع إدارة المحتوى', 'Content management mode')}
          </strong>{' '}
          —{' '}
          {contentAuthoringEnabled
            ? tr(
                'النشر والاعتماد يتبعان صلاحيات وسير عمل القسم الأصلي.',
                'Publication and approval follow the original owner workflow.',
              )
            : tr(
                'المتابعة والمعاينة متاحتان. تحرير الترجمات ونشرها معلقان حاليًا بسياسة المنصة.',
                'Tracking and preview are available. Translation writing and publication are currently paused by platform policy.',
              )}
        </span>
      </div>
      {capabilities.loading && (
        <p className="translation-status" role="status">
          <Loader2 className="translation-spin" aria-hidden="true" />
          {tr('جارٍ تحميل الأقسام المصرح بها…', 'Loading permitted sections…')}
        </p>
      )}
      {capabilities.error && (
        <div className="translation-alert" role="alert">
          <span>
            {tr(
              'تعذر معرفة الأقسام المتاحة؛ لن تُعرض أرقام أو روابط مفترضة.',
              'Available sections could not be loaded. Counts and routes are unavailable.',
            )}
          </span>
          <button type="button" onClick={capabilities.reload}>
            <RefreshCw aria-hidden="true" />
            {tr('إعادة المحاولة', 'Retry')}
          </button>
        </div>
      )}
      {activeTab === 'routes' ? (
        <>
          <TranslationOwnerCapabilitiesPanel
            capabilities={capabilities.data ?? []}
            loading={capabilities.loading}
            error={capabilities.error}
            onRetry={capabilities.reload}
            language={language}
          />
          <section className="translation-card">
            <h2>
              <BookOpen aria-hidden="true" />
              {tr('مساحات مرتبطة', 'Related workspaces')}
            </h2>
            <div className="translation-related">
              {hasPermission('admin:cms:manage') && (
                <Link to="/cms">
                  <FileText aria-hidden="true" />
                  {tr(
                    'ترجمات المحتوى والأدلة داخل إدارة المحتوى',
                    'Content and guide translations in CMS',
                  )}
                  <ArrowUpLeft aria-hidden="true" />
                </Link>
              )}
              {hasPermission('admin:reference-data:manage') && (
                <Link to="/settings/reference-data">
                  <Globe2 aria-hidden="true" />
                  {tr(
                    'الأسماء المرجعية للدول واللغات والمدن',
                    'Country, language and city reference names',
                  )}
                  <ArrowUpLeft aria-hidden="true" />
                </Link>
              )}
              <p>
                <Languages aria-hidden="true" />
                {tr(
                  'نصوص واجهة الموقع تُدار في ملفات الواجهة وتُفحص آليًا؛ تسجيل لغة مرجعية لا يفعّل ترجمتها.',
                  'Interface copy is maintained in source and checked automatically. Registering a reference language does not activate a translation.',
                )}
              </p>
            </div>
          </section>
        </>
      ) : (
        <>
          {!capabilities.loading && !capabilities.error && !allowedDomains.length && (
            <section className="translation-card">
              <h2>{tr('لا توجد سجلات مركزية مصرح بها', 'No permitted central records')}</h2>
              <p>
                {tr(
                  'قد تكون مساراتك متاحة داخل الأقسام الأصلية. افتح تبويب مسارات الترجمة.',
                  'Your translation workflows may live in their original sections. Open Translation routes.',
                )}
              </p>
              <button type="button" onClick={() => change({ tab: 'routes' })}>
                <Route aria-hidden="true" />
                {tr('عرض المسارات المتاحة', 'View available routes')}
              </button>
            </section>
          )}
          {!!allowedDomains.length && (
            <>
              <nav className="translation-domains admin-section-navigation" aria-label={tr('القسم المالك', 'Owner section')}>
                {allowedDomains.map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      type="button"
                      key={item.key}
                      aria-pressed={domain === item.key}
                      disabled={Boolean(saving)}
                      onClick={() => {
                        if (allowNavigation()) {
                          setDebouncedSearch('');
                          change({ domain: item.key, q: '', coverage: 'ALL', reviewState: 'ALL' });
                        }
                      }}
                    >
                      <Icon aria-hidden="true" />
                      {t(item.labelKey)}
                    </button>
                  );
                })}
              </nav>
              <section
                className="translation-metrics"
                aria-label={tr(
                  'مؤشرات الأسماء في نتائج التصفية',
                  'Name metrics for filtered results',
                )}
              >
                {[
                  {
                    key: 'ALL',
                    label: tr('نتائج التصفية', 'Filtered records'),
                    value: result?.total,
                    icon: Database,
                    tone: 'navy',
                  },
                  {
                    key: 'COMPLETE',
                    label: tr('الاسم متوفر باللغتين', 'Name in both languages'),
                    value: result?.stats?.complete,
                    icon: CheckCircle2,
                    tone: 'petrol',
                  },
                  {
                    key: 'MISSING_AR',
                    label: tr('ناقص الاسم العربي', 'Missing Arabic name'),
                    value: result?.stats?.missingAr,
                    icon: Languages,
                    tone: 'gold',
                  },
                  {
                    key: 'MISSING_EN',
                    label: tr('ناقص الاسم الإنجليزي', 'Missing English name'),
                    value: result?.stats?.missingEn,
                    icon: Languages,
                    tone: 'cyan',
                  },
                ].map((metric) => (
                  <button
                    type="button"
                    key={metric.key}
                    className={`translation-metric tone-${metric.tone}`}
                    disabled={loading || !!error || !result}
                    aria-pressed={coverageFilter === metric.key}
                    onClick={() => change({ coverage: metric.key })}
                  >
                    <span>
                      <metric.icon aria-hidden="true" />
                      {metric.label}
                    </span>
                    <strong>
                      {loading ? '…' : metric.value === undefined ? '—' : number(metric.value)}
                    </strong>
                  </button>
                ))}
              </section>
              <p className="translation-muted">
                {tr(
                  'الأعداد تخص أسماء السجلات المطابقة للفلاتر في هذا القسم، وليست اكتمال المحتوى أو اعتماد النشر.',
                  'Counts cover matching record names in this section, not complete content or publication approval.',
                )}
              </p>
              <section className="translation-card translation-filters">
                <div className="translation-section-heading">
                  <h2>
                    <ListFilter aria-hidden="true" />
                    {tr('البحث والتصفية', 'Search and filters')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setDebouncedSearch('');
                      change({
                        q: '',
                        coverage: 'ALL',
                        locale: 'en',
                        reviewState: 'ALL',
                        updatedFrom: '',
                        sort: 'UPDATED_DESC',
                      });
                    }}
                  >
                    <RotateCcw aria-hidden="true" />
                    {tr('مسح التصفية', 'Clear filters')}
                  </button>
                </div>
                <div className="translation-filter-grid">
                  <label className="translation-search">
                    <span>
                      <Search aria-hidden="true" />
                      {tr('بحث في جميع سجلات القسم', 'Search all owner records')}
                    </span>
                    <input
                      value={search}
                      maxLength={120}
                      disabled={Boolean(saving)}
                      onChange={(e) => change({ q: e.target.value }, true)}
                      placeholder={tr(
                        'الاسم العربي أو الإنجليزي أو المعرف…',
                        'Arabic or English name, or ID…',
                      )}
                    />
                  </label>
                  <label>
                    <span>
                      <Languages aria-hidden="true" />
                      {tr('تغطية الاسم', 'Name coverage')}
                    </span>
                    <select
                      value={coverageFilter}
                      onChange={(e) => change({ coverage: e.target.value })}
                    >
                      <option value="ALL">{tr('جميع الحالات', 'All coverage')}</option>
                      <option value="MISSING_AR">{tr('ناقص العربية', 'Missing Arabic')}</option>
                      <option value="MISSING_EN">{tr('ناقص الإنجليزية', 'Missing English')}</option>
                      <option value="COMPLETE">
                        {tr('الاسم متوفر باللغتين', 'Name in both languages')}
                      </option>
                    </select>
                  </label>
                  <label>
                    <span>
                      <Languages aria-hidden="true" />
                      {tr('لغة المراجعة والترتيب', 'Review and sort language')}
                    </span>
                    <select
                      value={reviewLocale}
                      onChange={(e) => change({ locale: e.target.value })}
                    >
                      <option value="ar">العربية</option>
                      <option value="en">English</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      <ShieldCheck aria-hidden="true" />
                      {tr('حالة الترجمة المسجلة', 'Recorded translation state')}
                    </span>
                    <select
                      value={reviewState}
                      onChange={(e) => change({ reviewState: e.target.value })}
                    >
                      <option value="ALL">{tr('الكل', 'All')}</option>
                      <option value="NEEDS_REVIEW">
                        {tr('غير منشورة / تحتاج مراجعة', 'Unpublished / needs review')}
                      </option>
                      <option value="PUBLISHED">
                        {tr('منشورة حسب السجل', 'Recorded as published')}
                      </option>
                      <option value="REJECTED">{tr('مرفوضة', 'Rejected')}</option>
                    </select>
                  </label>
                  <label>
                    <span>
                      <CalendarDays aria-hidden="true" />
                      {tr('عُدلت منذ', 'Updated since')}
                    </span>
                    <input
                      type="date"
                      value={updatedFrom}
                      onChange={(e) => change({ updatedFrom: e.target.value })}
                    />
                  </label>
                  <label>
                    <span>
                      <ArrowDownWideNarrow aria-hidden="true" />
                      {tr('الترتيب', 'Sort')}
                    </span>
                    <select value={sort} onChange={(e) => change({ sort: e.target.value })}>
                      <option value="UPDATED_DESC">
                        {tr('الأحدث تعديلًا', 'Recently updated')}
                      </option>
                      <option value="UPDATED_ASC">{tr('الأقدم تعديلًا', 'Oldest updated')}</option>
                      <option value="NAME_ASC">
                        {tr('الاسم حسب لغة المراجعة', 'Name in review language')}
                      </option>
                    </select>
                  </label>
                </div>
              </section>
              <section className="translation-card translation-results" aria-busy={loading}>
                <div className="translation-section-heading">
                  <h2>
                    <Files aria-hidden="true" />
                    {tr('سجلات القسم', 'Owner records')}
                    <span className="translation-count">
                      {loading ? '…' : result ? number(result.total) : '—'}
                    </span>
                  </h2>
                  <div
                    className="translation-view-switch"
                    aria-label={tr('طريقة العرض', 'View mode')}
                  >
                    <button
                      type="button"
                      aria-pressed={view === 'table'}
                      onClick={() => setView('table')}
                    >
                      <Table2 aria-hidden="true" />
                      {tr('جدول', 'Table')}
                    </button>
                    <button
                      type="button"
                      aria-pressed={view === 'cards'}
                      onClick={() => setView('cards')}
                    >
                      <LayoutGrid aria-hidden="true" />
                      {tr('بطاقات', 'Cards')}
                    </button>
                  </div>
                </div>
                {error ? (
                  <div className="translation-alert" role="alert">
                    <p>
                      {tr(
                        'تعذر تحميل السجلات. الأعداد غير متاحة.',
                        'Records could not be loaded. Counts are unavailable.',
                      )}
                      <small>{error}</small>
                    </p>
                    <button type="button" onClick={() => void load()}>
                      <RefreshCw aria-hidden="true" />
                      {tr('إعادة المحاولة', 'Retry')}
                    </button>
                  </div>
                ) : loading ? (
                  <p role="status" className="translation-status">
                    <Loader2 aria-hidden="true" className="translation-spin" />
                    {tr('جارٍ تحميل سجلات القسم…', 'Loading owner records…')}
                  </p>
                ) : !visible.length ? (
                  <div className="translation-empty">
                    <Search aria-hidden="true" />
                    <h3>{tr('لا توجد سجلات مطابقة', 'No matching records')}</h3>
                    <p>
                      {tr(
                        'غيّر الفلاتر أو افتح القسم الأصلي لمراجعة سجلاته.',
                        'Change the filters or open the original section to review its records.',
                      )}
                    </p>
                    <Link to={config.endpoint.replace('/admin', '')}>
                      {tr('فتح القسم الأصلي', 'Open original section')}
                      <ArrowUpLeft aria-hidden="true" />
                    </Link>
                  </div>
                ) : (
                  <div
                    className={
                      view === 'cards' ? 'translation-record-cards' : 'translation-table-scroll'
                    }
                  >
                    {view === 'table' ? (
                      <table>
                        <thead>
                          <tr>
                            <th>{tr('السجل', 'Record')}</th>
                            <th>{tr('العربية', 'Arabic')}</th>
                            <th>English</th>
                            <th>{tr('حالة الترجمة', 'Translation state')}</th>
                            <th>{tr('الإجراء', 'Action')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {visible.map((entity) => {
                            const state = coverage(domain, entity);
                            return (
                              <tr key={entity.id + ':' + (entity.profileId ?? 'root')}>
                                <td>
                                  <strong>{recordName(entity)}</strong>
                                  <small dir="auto">
                                    {entity.publicId || entity.slug || entity.id}
                                  </small>
                                </td>
                                <td>
                                  <LocaleBadge locale="AR" complete={state.ar} />
                                </td>
                                <td>
                                  <LocaleBadge locale="EN" complete={state.en} />
                                </td>
                                <td>
                                  {stateLabel(entity.translationStateAr, entity.translationStateEn)}
                                </td>
                                <td>
                                  <button
                                    type="button"
                                    className="translation-preview-button"
                                    onClick={() => void selectRecord(entity)}
                                  >
                                    <Eye aria-hidden="true" />
                                    {tr('معاينة', 'Preview')}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    ) : (
                      visible.map((entity) => {
                        const state = coverage(domain, entity);
                        return (
                          <article key={entity.id + ':' + (entity.profileId ?? 'root')}>
                            <h3>{recordName(entity)}</h3>
                            <small dir="auto">{entity.publicId || entity.slug || entity.id}</small>
                            <div className="translation-locale-badges">
                              <LocaleBadge locale="AR" complete={state.ar} />
                              <LocaleBadge locale="EN" complete={state.en} />
                            </div>
                            <p>
                              {stateLabel(entity.translationStateAr, entity.translationStateEn)}
                            </p>
                            <button type="button" onClick={() => void selectRecord(entity)}>
                              <Eye aria-hidden="true" />
                              {tr('معاينة', 'Preview')}
                            </button>
                          </article>
                        );
                      })
                    )}
                  </div>
                )}
                {!!result && !error && (
                  <nav
                    className="translation-pagination"
                    aria-label={tr('صفحات سجلات الترجمة', 'Translation record pages')}
                  >
                    <label>
                      {tr('لكل صفحة', 'Per page')}
                      <select
                        value={pageSize}
                        onChange={(e) => change({ pageSize: e.target.value })}
                      >
                        {[20, 40, 100].map((size) => (
                          <option key={size}>{size}</option>
                        ))}
                      </select>
                    </label>
                    <span>
                      {tr('صفحة', 'Page')} {number(page)} / {number(Math.max(1, result.totalPages))}
                    </span>
                    <div>
                      <button
                        type="button"
                        disabled={loading || page <= 1}
                        onClick={() => setPage(page - 1)}
                      >
                        <ChevronRight aria-hidden="true" />
                        {t('previous')}
                      </button>
                      <button
                        type="button"
                        disabled={loading || page >= result.totalPages}
                        onClick={() => setPage(page + 1)}
                      >
                        {t('next')}
                        <ChevronLeft aria-hidden="true" />
                      </button>
                    </div>
                  </nav>
                )}
              </section>
            </>
          )}
        </>
      )}
      {(detailLoading || selected || detailError) && (
        <TranslationRecordDialog
          ar={ar}
          title={tr('معاينة الترجمة', 'Translation preview')}
          onClose={closeDetail}
        >
          {detailLoading ? (
            <p role="status" className="translation-status">
              <Loader2 aria-hidden="true" className="translation-spin" />
              {tr('جارٍ تحميل السجل الأصلي…', 'Loading the original record…')}
            </p>
          ) : detailError ? (
            <div role="alert" className="translation-alert">
              <p>
                {tr('تعذر تحميل تفاصيل السجل.', 'Could not load record details.')}
                <small>{detailError}</small>
              </p>
              {requestedRecord && (
                <button type="button" onClick={() => void selectRecord(requestedRecord)}>
                  <RefreshCw aria-hidden="true" />
                  {tr('إعادة المحاولة', 'Retry')}
                </button>
              )}
            </div>
          ) : (
            selected &&
            draft && (
              <>
                <div className="translation-record-heading">
                  <div>
                    <h3>{recordName(selected)}</h3>
                    <small dir="auto">{selected.publicId || selected.id}</small>
                  </div>
                  <Link
                    to={config.detailHref(selected)}
                    onClick={(event) => {
                      if (!allowNavigation()) event.preventDefault();
                    }}
                  >
                    <ArrowUpLeft aria-hidden="true" />
                    {tr('فتح السجل الأصلي', 'Open original record')}
                  </Link>
                </div>
                {domain === 'MAJOR' && (
                  <p className="translation-policy">
                    {tr(
                      'الأسماء هنا للجذر المشترك. محتوى كل درجة ونسختها ومراجعتها داخل ملف التخصص.',
                      'These are shared root names. Each degree’s versioned content and review belong in the major profile.',
                    )}
                  </p>
                )}
                <nav className="translation-tabs admin-section-navigation" aria-label={tr('تفاصيل السجل', 'Record details')}>
                  <button
                    type="button"
                    aria-current={detailArea === 'content' ? 'page' : undefined}
                    onClick={() => setDetailArea('content')}
                  >
                    <Languages aria-hidden="true" />
                    {tr('المحتوى اللغوي', 'Language content')}
                  </button>
                  <button
                    type="button"
                    aria-current={detailArea === 'source' ? 'page' : undefined}
                    onClick={() => setDetailArea('source')}
                  >
                    <ShieldCheck aria-hidden="true" />
                    {tr('المصدر والجاهزية', 'Source and readiness')}
                  </button>
                </nav>
                {detailArea === 'source' ? (
                  <div className="translation-source-grid">
                    <InfoPill
                      label={tr('لغة المصدر المثبتة', 'Evidenced source language')}
                      value={sourceLocale?.toUpperCase() || tr('غير معروفة', 'Unknown')}
                    />
                    <InfoPill
                      label={tr('حالة السجل الأصلي', 'Original record state')}
                      value={selected.status || tr('غير معروفة', 'Unknown')}
                    />
                    <InfoPill
                      label={tr('طريقة حفظ الأسماء', 'Name storage')}
                      value={storageLabel(config.storage, t)}
                    />
                    <InfoPill
                      label={tr('جاهزية النشر', 'Publication readiness')}
                      value={tr(
                        'يحددها فحص ومراجعة القسم الأصلي',
                        'Determined by the original owner review',
                      )}
                    />
                    <RuntimeNotice storage={config.storage} />
                  </div>
                ) : contentAuthoringEnabled ? (
                  <>
                    <LocaleEditor
                      locale="ar"
                      label={t('translation_arabic')}
                      name={draft.arName}
                      description={draft.arDescription}
                      status={draft.arStatus}
                      supportsDescriptions={config.supportsDescriptions}
                      supportsReviewStatus={domain === 'UNIVERSITY'}
                      saving={saving === 'ar'}
                      contentAuthoringEnabled={!saving && !loading && !readbackFailed}
                      onNameChange={(value) =>
                        setDraft((current) => (current ? { ...current, arName: value } : current))
                      }
                      onDescriptionChange={(value) =>
                        setDraft((current) =>
                          current ? { ...current, arDescription: value } : current,
                        )
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
                      contentAuthoringEnabled={!saving && !loading && !readbackFailed}
                      onNameChange={(value) =>
                        setDraft((current) => (current ? { ...current, enName: value } : current))
                      }
                      onDescriptionChange={(value) =>
                        setDraft((current) =>
                          current ? { ...current, enDescription: value } : current,
                        )
                      }
                      onStatusChange={(value) =>
                        setDraft((current) => (current ? { ...current, enStatus: value } : current))
                      }
                      onSave={() => void saveLocale('en')}
                    />
                  </>
                ) : (
                  <>
                    <div
                      className="translation-view-switch"
                      aria-label={tr('لغة المعاينة', 'Preview language')}
                    >
                      <button
                        type="button"
                        aria-pressed={previewLocale === 'ar'}
                        onClick={() => setPreviewLocale('ar')}
                      >
                        العربية
                      </button>
                      <button
                        type="button"
                        aria-pressed={previewLocale === 'en'}
                        onClick={() => setPreviewLocale('en')}
                      >
                        English
                      </button>
                    </div>
                    <section
                      className="translation-read-content"
                      dir={previewLocale === 'ar' ? 'rtl' : 'ltr'}
                    >
                      <h3>{tr('الاسم المحفوظ', 'Saved name')}</h3>
                      <p>
                        {(previewLocale === 'ar' ? draft.arName : draft.enName) ||
                          tr('لم يُسجل اسم بهذه اللغة.', 'No name recorded in this language.')}
                      </p>
                      {config.supportsDescriptions && (
                        <>
                          <h3>{tr('الوصف المحفوظ', 'Saved description')}</h3>
                          <p>
                            {(previewLocale === 'ar' ? draft.arDescription : draft.enDescription) ||
                              tr(
                                'لم يُسجل وصف بهذه اللغة.',
                                'No description recorded in this language.',
                              )}
                          </p>
                        </>
                      )}
                    </section>
                    {!config.supportsDescriptions && (
                      <p className="translation-muted">
                        {tr(
                          'محتوى الأقسام والوصف التفصيلي يُراجع من السجل الأصلي، وفق نسخته وصلاحياته.',
                          'Sections and detailed descriptions are reviewed in the original record, under its version and permissions.',
                        )}
                      </p>
                    )}
                  </>
                )}
                {saveError && (
                  <p role="alert" className="translation-alert">
                    {saveError}
                  </p>
                )}
                {notice && (
                  <p role="status" className="translation-policy">
                    {notice}
                  </p>
                )}
                {readbackFailed && (
                  <p role="alert" className="translation-alert">
                    {tr(
                      'تعذرت إعادة القراءة بعد الحفظ. أعد تحميل السجل قبل إعادة المحاولة.',
                      'Readback after saving failed. Reload this record before retrying.',
                    )}
                  </p>
                )}
                {dirty && <p role="status">{tr('توجد تعديلات غير محفوظة.', 'Unsaved changes.')}</p>}
                <nav
                  className="translation-detail-pagination"
                  aria-label={tr('التنقل داخل الصفحة الحالية', 'Navigate current page')}
                >
                  <button
                    type="button"
                    disabled={selectedIndex <= 0 || Boolean(saving)}
                    onClick={() => void selectRecord(visible[selectedIndex - 1])}
                  >
                    <ChevronRight aria-hidden="true" />
                    {t('previous')}
                  </button>
                  <small>{tr('داخل الصفحة الحالية', 'Within this page')}</small>
                  <button
                    type="button"
                    disabled={
                      selectedIndex < 0 || selectedIndex >= visible.length - 1 || Boolean(saving)
                    }
                    onClick={() => void selectRecord(visible[selectedIndex + 1])}
                  >
                    {t('next')}
                    <ChevronLeft aria-hidden="true" />
                  </button>
                </nav>
              </>
            )
          )}
        </TranslationRecordDialog>
      )}
    </main>
  );
}
