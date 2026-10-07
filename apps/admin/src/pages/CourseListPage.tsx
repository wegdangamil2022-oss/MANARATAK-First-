import { FormEvent, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { courseProviderRegistryApi, type ProviderRegistryRecord } from '../api/courseProviders';
import { adminApiClient } from '../api/client';
import {
  ArrowRight,
  Filter,
  Loader2,
  Plus,
  X,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';

interface Course {
  id: string;
  displayName: string;
  status: string;
  completenessStatus: string;
  accessType: string;
  originType: string;
  platformName?: string;
  learningLanguage?: string;
  updatedAt: string;
}

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

interface PaginatedResponse {
  data: Course[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function CourseListPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('');
  const requestId = useRef(0);
  const [search, setSearch] = useState('');
  const [provider, setProvider] = useState('');
  const [platform, setPlatform] = useState('');
  const [majorId, setMajorId] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [language, setLanguage] = useState('');
  const [level, setLevel] = useState('');
  const [freeCertificate, setFreeCertificate] = useState('');
  const [providers, setProviders] = useState<ProviderRegistryRecord[]>([]);
  const [stats, setStats] = useState<(number | null)[]>([null, null, null, null]);
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({
    titleAr: '',
    titleEn: '',
    accessType: 'FREE_STUDY',
    learningLanguage: 'ar',
    category: '',
    difficultyLevel: '',
  });

  const createNativeCourse = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload = {
        titleAr: createForm.titleAr.trim(),
        accessType: createForm.accessType,
        ...(createForm.titleEn.trim() ? { titleEn: createForm.titleEn.trim() } : {}),
        ...(createForm.learningLanguage.trim()
          ? { learningLanguage: createForm.learningLanguage.trim() }
          : {}),
        ...(createForm.category.trim() ? { category: createForm.category.trim() } : {}),
        ...(createForm.difficultyLevel.trim()
          ? { difficultyLevel: createForm.difficultyLevel.trim() }
          : {}),
      };
      const created = await adminApiClient.request<{ id: string }>('/admin/courses', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setShowCreate(false);
      navigate(`/courses/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const fetchCourses = async () => {
    const request = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (originFilter) params.append('originType', originFilter);
      if (accessFilter) params.append('accessType', accessFilter);
      for (const [key, value] of Object.entries({
        search,
        externalProviderId: provider,
        platformName: platform,
        majorId: majorId ?? '',
        category,
        learningLanguage: language,
        difficultyLevel: level,
        isFreeCertificate: freeCertificate,
      }))
        if (value.trim()) params.set(key, value.trim());
      const response = await adminApiClient.request<PaginatedResponse>(
        `/admin/courses?${params.toString()}`,
      );
      if (request !== requestId.current) return;
      if (response.total > 0 && page > Math.ceil(response.total / 20)) {
        setPage(Math.ceil(response.total / 20));
        return;
      }
      setData(response);
    } catch (err: unknown) {
      if (request !== requestId.current) return;
      setError(err instanceof Error ? err.message : 'تعذر تحميل الدورات');
    } finally {
      if (request === requestId.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [
    page,
    statusFilter,
    originFilter,
    accessFilter,
    search,
    provider,
    platform,
    majorId,
    category,
    language,
    level,
    freeCertificate,
  ]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      const totals = await Promise.allSettled(
        ['', '&status=PUBLISHED', '&originType=NATIVE_MANARATAK_COURSE', '&accessType=PAID'].map(
          (filter) =>
            adminApiClient.request<PaginatedResponse>(`/admin/courses?page=1&pageSize=1${filter}`),
        ),
      );
      if (active)
        setStats(
          totals.map((result) => (result.status === 'fulfilled' ? result.value.total : null)),
        );
      const rows: ProviderRegistryRecord[] = [];
      for (let providerPage = 1; ; providerPage++) {
        const result = await courseProviderRegistryApi.list({ page: providerPage, pageSize: 100 });
        rows.push(...result.data);
        if (providerPage >= result.totalPages) break;
      }
      if (active) setProviders(rows);
    };
    void load().catch((error) => {
      if (active) setError(error instanceof Error ? error.message : 'تعذر تحميل خيارات المنصات');
    });
    return () => {
      active = false;
      ++requestId.current;
    };
  }, []);

  const resetAndSet =
    (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => {
      setter(event.target.value);
      setPage(1);
    };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-52 w-52 rounded-full bg-[#F2CD78] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-sm border border-white/15">
              <BookOpen className="h-4 w-4" />
              <span>القسم الأكاديمي · الدورات التدريبية</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">
              {t('courses')}
            </h1>
            <button
              type="button"
              onClick={() => navigate('/courses/providers')}
              className="mt-2 text-sm text-white underline"
            >
              إدارة مزودي الدورات
            </button>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-white/80">
              {t('review_course_catalog_records_and_open_the_authori')}
            </p>
          </div>
          <div className="flex flex-wrap gap-3 shrink-0">
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#21A7B4] px-4 py-2 text-sm font-black text-white hover:bg-[#1A8D99] transition shadow-md"
            >
              <Plus className="h-4 w-4" />
              Create native course
            </button>
            <div className="relative">
              <select
                value={statusFilter}
                onChange={resetAndSet(setStatusFilter)}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]"
              >
                <option value="" className="text-slate-900">
                  {t('all_statuses')}
                </option>
                <option value="DRAFT" className="text-slate-900">
                  مسودة
                </option>
                <option value="IMPORTED" className="text-slate-900">
                  {t('imported')}
                </option>
                <option value="READY_TO_REVIEW" className="text-slate-900">
                  {t('ready_to_review')}
                </option>
                <option value="READY_TO_PUBLISH" className="text-slate-900">
                  {t('ready_to_publish')}
                </option>
                <option value="PUBLISHED" className="text-slate-900">
                  {t('published')}
                </option>
                <option value="REJECTED" className="text-slate-900">
                  {t('rejected')}
                </option>
                <option value="ARCHIVED" className="text-slate-900">
                  {t('archived')}
                </option>
              </select>
              <Filter className="absolute right-3 top-2.5 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={originFilter}
                onChange={resetAndSet(setOriginFilter)}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]"
              >
                <option value="" className="text-slate-900">
                  {t('all_origins')}
                </option>
                <option value="NATIVE_MANARATAK_COURSE" className="text-slate-900">
                  {t('native_manaratak')}
                </option>
                <option value="EXTERNAL_LINKED_COURSE" className="text-slate-900">
                  {t('external_linked')}
                </option>
              </select>
              <Filter className="absolute right-3 top-2.5 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={accessFilter}
                onChange={resetAndSet(setAccessFilter)}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]"
              >
                <option value="" className="text-slate-900">
                  {t('all_access')}
                </option>
                <option value="FREE_STUDY" className="text-slate-900">
                  {t('free_study')}
                </option>
                <option value="FREE_CERTIFICATE" className="text-slate-900">
                  {t('free_certificate')}
                </option>
                <option value="FREE_STUDY_AND_CERTIFICATE" className="text-slate-900">
                  {t('free_study_certificate')}
                </option>
                <option value="PAID" className="text-slate-900">
                  {t('paid')}
                </option>
              </select>
              <Filter className="absolute right-3 top-2.5 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      <section dir="rtl" className="grid gap-3 rounded-2xl border bg-white p-4 md:grid-cols-3">
        <input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="البحث بالاسم أو الرمز أو المزود"
          className="rounded-xl border p-2"
        />
        <select
          value={provider}
          onChange={resetAndSet(setProvider)}
          className="rounded-xl border p-2"
        >
          <option value="">جميع المزودين</option>
          {providers.map((provider) => (
            <option key={provider.id} value={provider.id}>
              {provider.displayName}
            </option>
          ))}
        </select>
        <input
          value={platform}
          onChange={(e) => {
            setPlatform(e.target.value);
            setPage(1);
          }}
          placeholder="اسم المنصة كما في المصدر"
          className="rounded-xl border p-2"
        />
        <CanonicalPicker
          label="التخصص المرتبط المعتمد"
          value={majorId}
          onChange={(value) => {
            setMajorId(value);
            setPage(1);
          }}
          load={() => canonicalPickerApi.majors()}
          optional
        />
        <input
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setPage(1);
          }}
          placeholder="المجال"
          className="rounded-xl border p-2"
        />
        <input
          value={language}
          onChange={(e) => {
            setLanguage(e.target.value);
            setPage(1);
          }}
          placeholder="لغة التعلم"
          className="rounded-xl border p-2"
        />
        <input
          value={level}
          onChange={(e) => {
            setLevel(e.target.value);
            setPage(1);
          }}
          placeholder="المستوى"
          className="rounded-xl border p-2"
        />
        <select
          value={freeCertificate}
          onChange={resetAndSet(setFreeCertificate)}
          className="rounded-xl border p-2"
        >
          <option value="">جميع حالات الشهادة</option>
          <option value="true">شهادة مجانية</option>
          <option value="false">بدون شهادة مجانية</option>
        </select>
        <button
          onClick={() => {
            setSearch('');
            setProvider('');
            setPlatform('');
            setMajorId(null);
            setCategory('');
            setLanguage('');
            setLevel('');
            setFreeCertificate('');
            setStatusFilter('');
            setOriginFilter('');
            setAccessFilter('');
            setPage(1);
          }}
          className="rounded-xl border p-2 font-bold"
        >
          إعادة ضبط الفلاتر
        </button>
      </section>
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          label="إجمالي الدورات"
          value={stats[0] ?? '—'}
          icon={BookOpen}
          accent="#142B5F"
        />
        <MetricCard
          label="منشور في الموقع"
          value={stats[1] ?? '—'}
          icon={CheckCircle2}
          accent="#2E7D5A"
        />
        <MetricCard
          label="دورات داخلية المنصة"
          value={stats[2] ?? '—'}
          icon={GraduationCap}
          accent="#21A7B4"
        />
        <MetricCard
          label="دورات مدفوعة"
          value={stats[3] ?? '—'}
          icon={AlertCircle}
          accent="#D6A43B"
        />
      </div>
      {showCreate && (
        <form
          onSubmit={createNativeCourse}
          className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-[#142B5F]">Create native MANARATAK course</h3>
              <p className="text-xs text-gray-500">
                Creates a DRAFT native course and opens its canonical editor.
              </p>
            </div>
            <button type="button" onClick={() => setShowCreate(false)}>
              <X className="h-5 w-5" />
            </button>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input
              required
              minLength={2}
              value={createForm.titleAr}
              onChange={(e) => setCreateForm((v) => ({ ...v, titleAr: e.target.value }))}
              placeholder="Arabic title *"
              className="rounded-xl border p-2"
            />
            <input
              value={createForm.titleEn}
              onChange={(e) => setCreateForm((v) => ({ ...v, titleEn: e.target.value }))}
              placeholder="English title"
              className="rounded-xl border p-2"
            />
            <select
              value={createForm.accessType}
              onChange={(e) => setCreateForm((v) => ({ ...v, accessType: e.target.value }))}
              className="rounded-xl border p-2"
            >
              <option value="FREE_STUDY">Free study</option>
              <option value="FREE_CERTIFICATE">Free certificate</option>
              <option value="FREE_STUDY_AND_CERTIFICATE">Free study + certificate</option>
              <option value="PAID">Paid</option>
            </select>
            <input
              value={createForm.learningLanguage}
              onChange={(e) => setCreateForm((v) => ({ ...v, learningLanguage: e.target.value }))}
              placeholder="Learning language (BCP47)"
              className="rounded-xl border p-2"
            />
            <input
              value={createForm.category}
              onChange={(e) => setCreateForm((v) => ({ ...v, category: e.target.value }))}
              placeholder="Category"
              className="rounded-xl border p-2"
            />
            <input
              value={createForm.difficultyLevel}
              onChange={(e) => setCreateForm((v) => ({ ...v, difficultyLevel: e.target.value }))}
              placeholder="Difficulty level"
              className="rounded-xl border p-2"
            />
          </div>
          <button
            disabled={creating}
            className="mt-4 rounded-xl bg-[#0E7C86] px-4 py-2 text-sm font-bold text-white disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create and open editor'}
          </button>
        </form>
      )}

      {loading && !data ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3 font-medium">{t('course')}</th>
                  <th className="px-6 py-3 font-medium">{t('origin')}</th>
                  <th className="px-6 py-3 font-medium">{t('access')}</th>
                  <th className="px-6 py-3 font-medium">{t('status')}</th>
                  <th className="px-6 py-3 font-medium">{t('updated')}</th>
                  <th className="px-6 py-3 font-medium text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {t('no_courses_found')}
                    </td>
                  </tr>
                ) : (
                  data?.data.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{course.displayName}</div>
                        <div className="text-gray-500 text-xs mt-1">
                          {course.platformName || course.learningLanguage || 'MANARATAK'}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {course.originType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {course.accessType.replace(/_/g, ' ')}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${course.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : course.status === 'READY_TO_PUBLISH' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}
                        >
                          {course.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(course.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/courses/${course.id}`)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800"
                        >
                          {t('open_editor')}
                          <ArrowRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {t('page')}
                <span className="font-medium">{data.page}</span> {t('of')}
                <span className="font-medium">{data.totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  disabled={data.page === 1}
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('previous')}
                </button>
                <button
                  disabled={data.page === data.totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50"
                >
                  {t('next')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
