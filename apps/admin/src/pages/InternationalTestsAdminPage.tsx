import { TestProviderFilter } from '../features/international-tests/TestProviderFilter';
import { useSearchParams } from 'react-router-dom';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import type { InternationalTestStatus as CanonicalTestStatus } from '@manaratak/domain';
type InternationalTestStatus = `${CanonicalTestStatus}`;
import {
  AlertCircle,
  Archive,
  BookOpen,
  CheckCircle2,
  Eye,
  Filter,
  GraduationCap,
  Loader2,
  Send,
  Search,
  RotateCcw,
  RefreshCw,
  Globe2,
  Building2,
  ShieldCheck,
  LayoutGrid,
  Table2,
  MoreHorizontal,
} from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTranslation } from '../i18n/I18nProvider';

type InternationalTestCompletenessStatus = 'INCOMPLETE' | 'COMPLETE' | 'NEEDS_REVIEW';
type InternationalTestCategory =
  | 'ENGLISH_LANGUAGE'
  | 'NON_ENGLISH_LANGUAGE'
  | 'GENERAL_UNDERGRADUATE_ADMISSION'
  | 'GRADUATE_ADMISSION'
  | 'NATIONAL_INTERNATIONAL_ADMISSION'
  | 'SPECIALIZED_ADMISSION'
  | 'PROFESSIONAL_LICENSING_CERTIFICATION'
  | 'LANGUAGE_PROFICIENCY'
  | 'UNDERGRAD_ADMISSION'
  | 'GRAD_ADMISSION'
  | 'PROFESSIONAL_LICENSING'
  | 'ACADEMIC_PLACEMENT'
  | 'OTHER';

function MetricCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: any;
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

interface InternationalTest {
  id: string;
  revision?: number;
  publicId?: string;
  slug?: string;
  displayName?: string;
  canonicalName: string;
  localizedNameAr?: string | null;
  localizedNameEn?: string | null;
  testCode?: string | null;
  abbreviation?: string | null;
  testCategory: InternationalTestCategory;
  providerName: string;
  officialRegistrationUrl?: string | null;
  officialSourceUrl?: string | null;
  acceptedFor?: string[];
  scoreScale?: any;
  validityPeriodMonths?: number | null;
  currencyCode?: string | null;
  feeAmountMinorUnits?: string | null;
  feeScale?: number | null;
  fees?: Array<{ amount: number; currencyCode: string; feeType?: string }>;
  availableCountries?: string[] | null;
  testCenters?: string[] | null;
  status: InternationalTestStatus;
  completenessStatus?: InternationalTestCompletenessStatus | null;
  isSourceVerified?: boolean;
  isPubliclyVisible?: boolean;
  sourceImportRecordId?: string | null;
  updatedAt?: string;
}

export function getTestDisplayTitle(test: Partial<InternationalTest>, isRtl: boolean): string {
  if (isRtl) {
    return (
      test.localizedNameAr?.trim() ||
      test.displayName?.trim() ||
      test.canonicalName?.trim() ||
      test.localizedNameEn?.trim() ||
      ''
    );
  }
  return (
    test.localizedNameEn?.trim() ||
    test.displayName?.trim() ||
    test.canonicalName?.trim() ||
    test.localizedNameAr?.trim() ||
    ''
  );
}

interface InternationalTestListResponse {
  statistics?: { published: number; underReview: number; incomplete: number; scope: string };
  data: InternationalTest[];
  total: number;
  page: number;
  pageSize?: number;
  limit?: number;
  totalPages?: number;
}

const testCategories: InternationalTestCategory[] = [
  'ENGLISH_LANGUAGE',
  'NON_ENGLISH_LANGUAGE',
  'GENERAL_UNDERGRADUATE_ADMISSION',
  'GRADUATE_ADMISSION',
  'NATIONAL_INTERNATIONAL_ADMISSION',
  'SPECIALIZED_ADMISSION',
  'PROFESSIONAL_LICENSING_CERTIFICATION',
  'LANGUAGE_PROFICIENCY',
  'UNDERGRAD_ADMISSION',
  'GRAD_ADMISSION',
  'PROFESSIONAL_LICENSING',
  'ACADEMIC_PLACEMENT',
  'OTHER',
];

const statuses: InternationalTestStatus[] = [
  'IMPORTED',
  'READY_TO_REVIEW',
  'NEEDS_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED',
];

type TestAction = 'mark-publishable' | 'publish' | 'unpublish' | 'archive';
export function InternationalTestsAdminPage() {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar',
    say = (ar: string, en: string) => (isRtl ? ar : en);
  const { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams();
  const query = params.toString(),
    searchQuery = params.get('searchQuery') ?? '',
    countryFilter = params.get('countryIso2Code') ?? '',
    providerFilter = params.get('providerName') ?? '',
    statusFilter = params.get('status') ?? '',
    categoryFilter = params.get('testCategory') ?? '',
    completenessFilter = params.get('completenessStatus') ?? '',
    staleOnly = params.get('staleOnly') === 'true';
  const page = Math.min(1000, Math.max(1, Math.floor(Number(params.get('page')) || 1))),
    pageSize = 20,
    viewMode = params.get('view') === 'table' ? 'table' : 'cards';
  const [search, setSearch] = useState(searchQuery),
    [tests, setTests] = useState<InternationalTestListResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [message, setMessage] = useState(''),
    [refresh, setRefresh] = useState(0);
  const [action, setAction] = useState<{ test: InternationalTest; kind: TestAction } | null>(null),
    [reason, setReason] = useState(''),
    [saving, setSaving] = useState(false),
    [actionError, setActionError] = useState('');
  const requestSequence = useRef(0),
    submitting = useRef(false);
  const [countryDraft, setCountryDraft] = useState(countryFilter);
  useEffect(() => setCountryDraft(countryFilter), [countryFilter]);
  const update = useCallback(
    (key: string, value: string) => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        value ? next.set(key, value) : next.delete(key);
        if (key !== 'page' && key !== 'view') next.delete('page');
        return next;
      });
    },
    [setParams],
  );
  useEffect(() => setSearch(searchQuery), [searchQuery]);
  useEffect(() => {
    if (search === searchQuery) return;
    const timer = setTimeout(() => update('searchQuery', search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search, searchQuery, update]);
  useEffect(() => {
    const controller = new AbortController(),
      sequence = ++requestSequence.current;
    setLoading(true);
    setError('');
    const request = new URLSearchParams(query);
    request.delete('view');
    request.set('page', String(page));
    request.set('pageSize', String(pageSize));
    adminApiClient
      .request<InternationalTestListResponse>('/admin/international-tests?' + request, {
        signal: controller.signal,
      })
      .then((data) => {
        if (controller.signal.aborted || sequence !== requestSequence.current) return;
        if (data.total > 0 && !data.data.length && page > 1) {
          update('page', String(Math.ceil(data.total / pageSize)));
          return;
        }
        setTests(data);
      })
      .catch((err: unknown) => {
        if (!controller.signal.aborted && sequence === requestSequence.current)
          setError(err instanceof Error ? err.message : 'Unable to load tests');
      })
      .finally(() => {
        if (!controller.signal.aborted && sequence === requestSequence.current) setLoading(false);
      });
    return () => controller.abort();
  }, [query, page, refresh, update]);
  const activeFilters = Boolean(
    searchQuery ||
    countryFilter ||
    countryDraft ||
    providerFilter ||
    statusFilter ||
    categoryFilter ||
    completenessFilter ||
    staleOnly ||
    search,
  );
  const reset = () => {
    setSearch('');
    setCountryDraft('');
    setParams(viewMode === 'table' ? { view: 'table' } : {});
  };
  const allowed = (kind: TestAction) =>
    hasPermission(
      kind === 'mark-publishable'
        ? 'admin:international-tests:review'
        : kind === 'archive'
          ? 'admin:international-tests:manage'
          : 'admin:international-tests:publish',
    );
  const choose = (test: InternationalTest, kind: TestAction) => {
    setReason('');
    setActionError('');
    setAction({ test, kind });
  };
  const perform = async () => {
    if (!action || submitting.current || !allowed(action.kind) || reason.trim().length < 3) return;
    submitting.current = true;
    setSaving(true);
    setActionError('');
    try {
      if (!Number.isSafeInteger(action.test.revision))
        throw Error(
          say('حدّث السجل للحصول على رقم مراجعته.', 'Refresh the record to obtain its revision.'),
        );
      await adminApiClient.request(
        '/admin/international-tests/' + encodeURIComponent(action.test.id) + '/' + action.kind,
        {
          method: 'POST',
          headers: { 'If-Match': String(action.test.revision) },
          body: JSON.stringify({ reason: reason.trim() }),
        },
      );
      setAction(null);
      setMessage(
        say(
          'تم حفظ الإجراء؛ تُحدّث القائمة من الخادم.',
          'Action saved; reloading the server results.',
        ),
      );
      setRefresh((n) => n + 1);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : 'Unable to save');
    } finally {
      submitting.current = false;
      setSaving(false);
    }
  };
  const actions = (test: InternationalTest) => (
    <details className="test-row-actions">
      <summary>
        <MoreHorizontal size={16} />
        {say('المزيد', 'More')}
      </summary>
      <div className="flex flex-wrap gap-2 pt-2">
        {test.status === 'READY_TO_PUBLISH' && allowed('publish') && (
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => choose(test, 'publish')}
          >
            <Send size={14} />
            {say('نشر', 'Publish')}
          </button>
        )}
        {test.status === 'PUBLISHED' && allowed('unpublish') && (
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => choose(test, 'unpublish')}
          >
            {say('إلغاء النشر', 'Unpublish')}
          </button>
        )}
        {!['PUBLISHED', 'ARCHIVED', 'REJECTED', 'READY_TO_PUBLISH'].includes(test.status) &&
          allowed('mark-publishable') && (
            <button
              type="button"
              disabled={loading || saving || test.completenessStatus !== 'COMPLETE'}
              onClick={() => choose(test, 'mark-publishable')}
            >
              <ShieldCheck size={14} />
              {say('تجهيز للنشر', 'Mark publishable')}
            </button>
          )}
        {test.status !== 'ARCHIVED' && allowed('archive') && (
          <button
            type="button"
            disabled={loading || saving}
            onClick={() => choose(test, 'archive')}
          >
            <Archive size={14} />
            {say('أرشفة', 'Archive')}
          </button>
        )}
      </div>
    </details>
  );
  const detailLink = (test: InternationalTest) =>
    '/international-tests/' +
    encodeURIComponent(test.id) +
    '?returnTo=' +
    encodeURIComponent('/international-tests?' + query);
  const metric = (key: 'total' | 'published' | 'underReview' | 'incomplete') =>
    loading || error || !tests
      ? '—'
      : key === 'total'
        ? tests.total
        : tests.statistics?.scope === 'FILTERED'
          ? (tests.statistics[key] ?? '—')
          : '—';
  return (
    <div
      className="international-tests-admin max-w-7xl mx-auto space-y-6"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <section className="test-hero relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-52 w-52 rounded-full bg-[#D6A43B]/15 pointer-events-none" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-bold text-[#F2CD78]">
              <BookOpen size={16} />
              {say(
                'القسم الأكاديمي · الاختبارات الدولية',
                'Academic catalog · International tests',
              )}
            </div>
            <h1 className="text-2xl sm:text-3xl font-black leading-tight text-white">
              {t('international_tests')}
            </h1>
            <p className="mt-3 max-w-2xl text-[13px] leading-relaxed text-white/85">
              {say(
                'استعراض الاختبارات ومصادرها الرسمية، ومتابعة العلاقات والمراجعة والنشر.',
                'Browse tests and official sources, manage relationships, review and publication.',
              )}
            </p>
          </div>
          <button
            type="button"
            className="test-refresh"
            disabled={loading}
            onClick={() => setRefresh((n) => n + 1)}
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            {say('تحديث البيانات', 'Refresh data')}
          </button>
        </div>
      </section>
      {message && (
        <p role="status" className="rounded-xl border border-[#DDEFF2] bg-white p-3 text-[13px]">
          {message}
        </p>
      )}
      <div
        className="grid gap-3 grid-cols-2 lg:grid-cols-4"
        aria-label={say('مؤشرات النتائج المفلترة', 'Filtered result metrics')}
      >
        <MetricCard
          label={say('إجمالي الاختبارات', 'Total tests')}
          value={metric('total')}
          icon={BookOpen}
          accent="#142B5F"
        />
        <MetricCard
          label={say('منشورة', 'Published')}
          value={metric('published')}
          icon={CheckCircle2}
          accent="#0E7C86"
        />
        <MetricCard
          label={say('قيد المراجعة', 'Under review')}
          value={metric('underReview')}
          icon={AlertCircle}
          accent="#D6A43B"
        />
        <MetricCard
          label={say('غير مكتملة', 'Incomplete')}
          value={metric('incomplete')}
          icon={GraduationCap}
          accent="#21A7B4"
        />
      </div>
      <section
        className="test-filters rounded-2xl border border-[#DDEFF2] bg-white p-4 sm:p-5 shadow-sm"
        aria-labelledby="test-filter-heading"
      >
        <h2
          id="test-filter-heading"
          className="mb-4 flex items-center gap-2 text-[16px] font-bold text-[#142B5F]"
        >
          <Filter size={18} className="text-[#0E7C86]" />
          {say('البحث والتصفية', 'Search and filters')}
        </h2>
        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="min-w-0 flex-1 basis-64">
            <span>
              <Search size={16} />
              {say('اسم الاختبار أو اختصاره أو مزوده', 'Test name, abbreviation or provider')}
            </span>
            <input
              type="search"
              maxLength={200}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={say('ابحث في جميع نتائج الخادم…', 'Search all server results…')}
            />
          </label>
          <button type="button" disabled={!activeFilters} onClick={reset}>
            <RotateCcw size={16} />
            {say('مسح الفلاتر', 'Clear filters')}
          </button>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label>
            <span>
              <BookOpen size={16} />
              {say('التصنيف', 'Category')}
            </span>
            <select
              aria-label={say('التصنيف', 'Category')}
              value={categoryFilter}
              onChange={(e) => update('testCategory', e.target.value)}
            >
              <option value="">{say('جميع التصنيفات', 'All categories')}</option>
              {testCategories.map((c) => (
                <option key={c} value={c}>
                  {getCategoryLabel(c, isRtl)}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>
              <ShieldCheck size={16} />
              {say('حالة النشر والمراجعة', 'Publication and review status')}
            </span>
            <select
              aria-label={say('حالة النشر والمراجعة', 'Publication and review status')}
              value={statusFilter}
              onChange={(e) => update('status', e.target.value)}
            >
              <option value="">{say('جميع الحالات', 'All statuses')}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s, isRtl)}
                </option>
              ))}
            </select>
          </label>
          {hasPermission('admin:reference-data:manage') ? (
            <CanonicalPicker
              compact
              optional
              paged
              allowInactive
              label={say('التوفر حسب الدولة', 'Availability by country')}
              reloadKey={'test-country:' + countryFilter}
              value={countryFilter}
              icon={<Globe2 size={16} />}
              load={async (q, p) => {
                let rows = await canonicalPickerApi.countries(q, p);
                if (
                  (p ?? 1) === 1 &&
                  countryFilter &&
                  !rows.some((row) => row.code === countryFilter)
                ) {
                  const selected = await canonicalPickerApi.countries(countryFilter, 1);
                  rows = [...selected.filter((row) => row.code === countryFilter), ...rows];
                }
                return rows.map((row) => ({
                  ...row,
                  id: row.code ?? row.id,
                }));
              }}
              onChange={(id) => update('countryIso2Code', id ?? '')}
            />
          ) : (
            <label>
              <span>
                <Globe2 size={16} />
                {say('التوفر حسب الدولة — رمز ISO2', 'Availability by country — ISO2')}
              </span>
              <input
                aria-label={say('التوفر حسب الدولة', 'Availability by country')}
                value={countryDraft}
                maxLength={2}
                placeholder="SA"
                onChange={(event) => {
                  const value = event.target.value.toUpperCase().replace(/[^A-Z]/g, '');
                  setCountryDraft(value);
                  if (!value || value.length === 2) update('countryIso2Code', value);
                }}
              />
            </label>
          )}
          <TestProviderFilter ar={isRtl} value={providerFilter} onChange={value=>update('providerName',value)}/>
          <label>
            <span>
              <CheckCircle2 size={16} />
              {say('اكتمال البيانات', 'Data completeness')}
            </span>
            <select
              aria-label={say('اكتمال البيانات', 'Data completeness')}
              value={completenessFilter}
              onChange={(e) => update('completenessStatus', e.target.value)}
            >
              <option value="">{say('جميع الحالات', 'All states')}</option>
              {(['INCOMPLETE', 'COMPLETE', 'NEEDS_REVIEW'] as const).map((s) => (
                <option key={s} value={s}>
                  {getCompletenessLabel(s, isRtl)}
                </option>
              ))}
            </select>
          </label>
        </div>
        <label className="mt-4 flex items-center gap-2 border-t border-[#DDEFF2] pt-4">
          <input
            type="checkbox"
            checked={staleOnly}
            onChange={(e) => update('staleOnly', e.target.checked ? 'true' : '')}
          />
          <span>{say('تحتاج إعادة تحقق من المصدر', 'Needs fresh source verification')}</span>
        </label>
        <p className="mt-2 text-[11px] text-slate-500">
          {say(
            'الإحصاءات تشمل جميع النتائج المطابقة للفلاتر، وليست عدد عناصر الصفحة. تحقق المصدر لا يعني اعتماد جامعة.',
            'Metrics cover all matching results, not just this page. Source verification does not imply university recognition.',
          )}
        </p>
      </section>
      <section
        className="rounded-2xl border border-[#DDEFF2] bg-white shadow-sm overflow-hidden"
        aria-busy={loading}
      >
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#DDEFF2] p-4">
          <h2 className="text-[15px] font-bold">
            {say('قائمة الاختبارات الدولية', 'International test directory')}
          </h2>
          <div className="flex gap-2">
            {(['cards', 'table'] as const).map((mode) => (
              <button
                type="button"
                key={mode}
                aria-pressed={viewMode === mode}
                className="test-view-button"
                onClick={() => update('view', mode)}
              >
                {mode === 'cards' ? <LayoutGrid size={16} /> : <Table2 size={16} />}{' '}
                {mode === 'cards' ? say('بطاقات', 'Cards') : say('جدول', 'Table')}
              </button>
            ))}
          </div>
        </div>
        {error ? (
          <div role="alert" className="p-5 text-[13px] text-red-700">
            <p>{error}</p>
            <button type="button" onClick={() => setRefresh((n) => n + 1)}>
              {say('إعادة المحاولة', 'Retry')}
            </button>
          </div>
        ) : loading ? (
          <p role="status" className="flex min-h-40 items-center justify-center gap-2 text-[13px]">
            <Loader2 size={20} className="animate-spin" />
            {say('جارٍ تحميل النتائج…', 'Loading results…')}
          </p>
        ) : !tests?.data.length ? (
          <p className="p-8 text-center text-[13px]">{t('no_international_tests_found')}</p>
        ) : viewMode === 'cards' ? (
          <div className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3">
            {tests.data.map((test) => {
              const title = getTestDisplayTitle(test, isRtl),
                secondary = test.localizedNameEn?.trim() || test.abbreviation?.trim();
              return (
                <article className="test-directory-card" key={test.id}>
                  <div>
                    <Link className="test-card-title" to={detailLink(test)}>
                      {title || say('اسم غير متوفر', 'Name unavailable')}
                    </Link>
                    {secondary && secondary.toLowerCase() !== title.toLowerCase() && (
                      <p className="mt-1 text-[11px] text-slate-500" dir="ltr">
                        {secondary}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2 text-[12px]">
                    <p className="flex items-center gap-2">
                      <BookOpen size={16} />
                      {getCategoryLabel(test.testCategory, isRtl)}
                    </p>
                    <p className="flex items-start gap-2">
                      <Building2 size={16} />
                      {test.providerName || say('المزود غير متوفر', 'Provider unavailable')}
                    </p>
                    {test.testCode && test.testCode !== test.abbreviation && (
                      <p className="text-[11px] text-slate-500">
                        <bdi>{test.testCode}</bdi>
                      </p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <StatusBadge status={test.status} isRtl={isRtl} />
                    <CompletenessBadge status={test.completenessStatus} isRtl={isRtl} />
                    {test.isSourceVerified && (
                      <span className="test-source-badge">
                        <ShieldCheck size={13} />
                        {say('مصدر متحقق', 'Verified source')}
                      </span>
                    )}
                  </div>
                  <div className="mt-auto flex flex-wrap items-start justify-between gap-2 border-t border-[#DDEFF2] pt-3">
                    <Link className="test-open-link" to={detailLink(test)}>
                      <Eye size={16} />
                      {say('فتح التفاصيل', 'Open details')}
                    </Link>
                    {actions(test)}
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="test-directory-table">
              <caption className="sr-only">
                {say('الاختبارات المطابقة للفلاتر', 'Tests matching filters')}
              </caption>
              <thead>
                <tr>
                  {[
                    say('الاختبار', 'Test'),
                    say('التصنيف والمزود', 'Category and provider'),
                    say('الحالة', 'Status'),
                    say('الإجراءات', 'Actions'),
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {tests.data.map((test) => (
                  <tr key={test.id}>
                    <td>
                      <Link className="test-card-title" to={detailLink(test)}>
                        {getTestDisplayTitle(test, isRtl)}
                      </Link>
                      {test.abbreviation &&
                        test.abbreviation !== getTestDisplayTitle(test, isRtl) && (
                          <p className="text-[11px]" dir="ltr">
                            {test.abbreviation}
                          </p>
                        )}
                    </td>
                    <td>
                      {getCategoryLabel(test.testCategory, isRtl)}
                      <p>{test.providerName}</p>
                    </td>
                    <td>
                      <div className="flex flex-wrap gap-2">
                        <StatusBadge status={test.status} isRtl={isRtl} />
                        <CompletenessBadge status={test.completenessStatus} isRtl={isRtl} />
                      </div>
                    </td>
                    <td>
                      <Link className="test-open-link" to={detailLink(test)}>
                        <Eye size={16} />
                        {say('فتح التفاصيل', 'Open details')}
                      </Link>
                      {actions(test)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && !error && tests && tests.total > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#DDEFF2] p-4 text-[12px]">
            <span>
              {say('النتائج', 'Results')}: {(page - 1) * pageSize + 1}–
              {Math.min(page * pageSize, tests.total)} / {tests.total}
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => update('page', String(page - 1))}
              >
                {say('السابق', 'Previous')}
              </button>
              <span>
                {page} / {Math.ceil(tests.total / pageSize)}
              </span>
              <button
                type="button"
                disabled={page * pageSize >= tests.total}
                onClick={() => update('page', String(page + 1))}
              >
                {say('التالي', 'Next')}
              </button>
            </div>
          </div>
        )}
      </section>
      {action && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="test-action-heading"
        >
          <form
            className="w-full max-w-md space-y-4 rounded-2xl bg-white p-5"
            onSubmit={(event) => {
              event.preventDefault();
              void perform();
            }}
          >
            <h2 id="test-action-heading" className="text-[16px] font-bold">
              {getActionLabel(action.kind, isRtl)}
            </h2>
            <p className="text-[13px]">{getTestDisplayTitle(action.test, isRtl)}</p>
            {action.kind === 'archive' && (
              <p className="text-[12px]">
                {say(
                  'يُحفظ السجل والعلاقات دون حذف.',
                  'The record and its relationships are retained.',
                )}
              </p>
            )}
            <label className="block text-[12px] font-bold">
              {say('مبرر الإجراء', 'Action reason')}
              <textarea
                autoFocus
                required
                minLength={3}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="mt-2 w-full rounded-xl border border-[#DDEFF2] p-3"
              />
            </label>
            {actionError && (
              <p role="alert" className="text-[12px] text-red-700">
                {actionError}
              </p>
            )}
            <div className="flex gap-3">
              <button type="submit" disabled={saving || reason.trim().length < 3}>
                {saving ? say('جارٍ الحفظ…', 'Saving…') : say('تأكيد الإجراء', 'Confirm action')}
              </button>
              <button type="button" disabled={saving} onClick={() => setAction(null)}>
                {say('إلغاء', 'Cancel')}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status, isRtl }: { status: InternationalTestStatus; isRtl: boolean }) {
  const label = getStatusLabel(status, isRtl);
  const config =
    status === 'PUBLISHED'
      ? { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' }
      : status === 'READY_TO_PUBLISH'
        ? { badge: 'bg-sky-50 text-sky-700 border-sky-200/80', dot: 'bg-sky-500' }
        : status === 'ARCHIVED'
          ? { badge: 'bg-slate-100 text-slate-600 border-slate-200', dot: 'bg-slate-400' }
          : status === 'READY_TO_REVIEW' || status === 'NEEDS_REVIEW'
            ? { badge: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' }
            : status === 'REJECTED'
              ? { badge: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' }
              : { badge: 'bg-slate-100 text-slate-700 border-slate-200', dot: 'bg-slate-400' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${config.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{label}</span>
    </span>
  );
}

function CompletenessBadge({
  status,
  isRtl,
}: {
  status?: InternationalTestCompletenessStatus | null;
  isRtl: boolean;
}) {
  const label = getCompletenessLabel(status, isRtl);
  const config =
    status === 'COMPLETE'
      ? { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' }
      : status === 'NEEDS_REVIEW'
        ? { badge: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' }
        : { badge: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${config.badge}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{label}</span>
    </span>
  );
}

function getStatusLabel(status: InternationalTestStatus, isRtl: boolean): string {
  if (isRtl) {
    switch (status) {
      case 'PUBLISHED':
        return 'منشور';
      case 'READY_TO_PUBLISH':
        return 'جاهز للنشر';
      case 'READY_TO_REVIEW':
        return 'جاهز للمراجعة';
      case 'NEEDS_REVIEW':
        return 'يحتاج مراجعة';
      case 'IMPORTED':
        return 'مستورد';
      case 'ARCHIVED':
        return 'مؤرشف';
      case 'REJECTED':
        return 'مرفوض';
      default:
        return status;
    }
  }
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getCompletenessLabel(
  status: InternationalTestCompletenessStatus | null | undefined,
  isRtl: boolean,
): string {
  if (!status) return isRtl ? 'غير متوفر' : 'Unavailable';
  if (isRtl) {
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
  return status
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getCategoryLabel(category: any, isRtl: boolean): string {
  if (!category) return isRtl ? 'عام' : 'General';
  if (isRtl) {
    switch (category) {
      case 'ENGLISH_LANGUAGE':
      case 'LANGUAGE_PROFICIENCY':
        return 'لغة إنجليزية';
      case 'NON_ENGLISH_LANGUAGE':
        return 'لغة غير إنجليزية';
      case 'STANDARDIZED_ADMISSION':
      case 'GENERAL_UNDERGRADUATE_ADMISSION':
      case 'UNDERGRAD_ADMISSION':
        return 'قبول جامعي عام';
      case 'GRADUATE_ADMISSION':
      case 'GRAD_ADMISSION':
        return 'قبول دراسات عليا';
      case 'NATIONAL_INTERNATIONAL_ADMISSION':
        return 'قبول وطني/دولي';
      case 'SPECIALIZED_ADMISSION':
        return 'قبول تخصصي';
      case 'PROFESSIONAL_LICENSING_CERTIFICATION':
      case 'PROFESSIONAL_LICENSING':
        return 'ترخيص/اعتماد مهني';
      case 'ACADEMIC_PLACEMENT':
        return 'تحديد مستوى أكاديمي';
      case 'OTHER':
        return 'أخرى';
      default:
        return category;
    }
  }
  return String(category)
    .replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, (l) => l.toUpperCase());
}

function getActionLabel(action: string, isRtl: boolean): string {
  if (isRtl) {
    switch (action) {
      case 'mark-publishable':
        return 'تحديد كجاهز للنشر';
      case 'publish':
        return 'نشر';
      case 'unpublish':
        return 'إلغاء النشر';
      case 'archive':
        return 'أرشفة';
      default:
        return action;
    }
  }
  return action;
}
