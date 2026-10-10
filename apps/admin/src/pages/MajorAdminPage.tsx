import {
AlertCircle,
BookOpen,
Building2,
CheckCircle2,
ChevronLeft,
ChevronRight,
Eye,
Filter,
GraduationCap,
Hash,
Layers3,
Loader2,
RotateCcw,
Search,
Sparkles,
X
} from 'lucide-react';
import { useEffect,useMemo,useState } from 'react';
import { Link,useSearchParams } from 'react-router-dom';
import { canonicalPickerApi,type CanonicalPickerOption } from '../api/canonicalPickers';
import { adminApiClient } from '../api/client';
import { NewMajorCandidatesPanel } from '../components/NewMajorCandidatesPanel';
import { useTranslation } from "../i18n/I18nProvider";

type MajorStatus = 'IMPORTED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | string;
type MajorCompletenessStatus = 'INCOMPLETE' | 'NEEDS_REVIEW' | 'COMPLETE' | string;

interface Major {
  id: string;
  publicId?: string;
  profileId?: string;
  nameAr?: string;
  nameEn?: string;
  slug?: string;
  displayName: string;
  degreeLevel?: string;
  academicFieldOrDiscipline?: string | null;
  collegeOrFaculty?: string | null;
  classificationCode?: string | null;
  sourceClassificationSystem?: string | null;
  sourceImportRecordId?: string | null;
  currentPublishedVersionId?: string | null;
  status: MajorStatus;
  completenessStatus: MajorCompletenessStatus;
  updatedAt?: string;
}

interface PaginatedResponse {
  data: Major[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  stats?:{published:number;needsReview:number;complete:number};
}

const degreeOptions = [
  { value: 'BACHELOR', labelAr: 'بكالوريوس' },
  { value: 'MASTER', labelAr: 'ماجستير' },
  { value: 'DOCTORATE', labelAr: 'دكتوراه' },
  { value: 'FELLOWSHIP', labelAr: 'زمالة' }
];

const statusOptions = [
  { value: 'PUBLISHED', labelAr: 'منشور' },
  { value: 'READY_TO_PUBLISH', labelAr: 'جاهز للنشر' },
  { value: 'READY_TO_REVIEW', labelAr: 'جاهز للمراجعة' },
  { value: 'IMPORTED', labelAr: 'مستورد' },
  { value: 'REJECTED', labelAr: 'مرفوض' },
  { value: 'ARCHIVED', labelAr: 'مؤرشف' }
];

const completenessOptions = [
  { value: 'COMPLETE', labelAr: 'مكتمل البيانات' },
  { value: 'NEEDS_REVIEW', labelAr: 'بحاجة لمراجعة' },
  { value: 'INCOMPLETE', labelAr: 'غير مكتمل' }
];

function getDegreeArabicLabel(degree?: string | null): string {
  if (!degree) return 'درجة غير محددة';
  const match = degreeOptions.find((d) => d.value.toUpperCase() === degree.toUpperCase());
  if (match) return match.labelAr;
  if (degree.toUpperCase() === 'BACHELORS') return 'بكالوريوس';
  if (degree.toUpperCase() === 'MASTERS') return 'ماجستير';
  return degree;
}

function getStatusArabicLabel(status?: string | null): string {
  if (!status) return 'غير محدد';
  const match = statusOptions.find((s) => s.value.toUpperCase() === status.toUpperCase());
  return match ? match.labelAr : status;
}

function statusBadgeClasses(status?: string): string {
  switch (status?.toUpperCase()) {
    case 'PUBLISHED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'READY_TO_PUBLISH':
      return 'bg-cyan-50 text-cyan-800 border-cyan-200';
    case 'READY_TO_REVIEW':
      return 'bg-amber-50 text-amber-800 border-amber-200';
    case 'IMPORTED':
      return 'bg-indigo-50 text-indigo-700 border-indigo-200';
    case 'REJECTED':
      return 'bg-rose-50 text-rose-700 border-rose-200';
    case 'ARCHIVED':
      return 'bg-slate-100 text-slate-600 border-slate-200';
    default:
      return 'bg-slate-50 text-slate-700 border-slate-200';
  }
}

function MetricCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: number | string; accent: string }) {
  const tone = metricAccentClasses(accent);
  return (
    <div className="rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-xs transition hover:shadow-sm">
      <div className="flex items-center justify-between">
        <div className={`grid h-10 w-10 place-items-center rounded-xl ${tone.icon}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className={`text-2xl font-black ${tone.text} font-['Cairo']`}>{value}</div>
      </div>
      <div className="mt-2.5 text-xs font-bold text-slate-600 font-['Cairo']">{label}</div>
    </div>
  );
}

function metricAccentClasses(accent: string) {
  if (accent === '#142B5F') return { icon: 'bg-[#142B5F]/10 text-[#142B5F]', text: 'text-[#142B5F]' };
  if (accent === '#0E7C86') return { icon: 'bg-[#0E7C86]/10 text-[#0E7C86]', text: 'text-[#0E7C86]' };
  if (accent === '#21A7B4') return { icon: 'bg-[#21A7B4]/10 text-[#21A7B4]', text: 'text-[#21A7B4]' };
  if (accent === '#D6A43B') return { icon: 'bg-[#D6A43B]/10 text-[#D6A43B]', text: 'text-[#D6A43B]' };
  if (accent === '#B94A48') return { icon: 'bg-[#B94A48]/10 text-[#B94A48]', text: 'text-[#B94A48]' };
  return { icon: 'bg-[#2E7D5A]/10 text-[#2E7D5A]', text: 'text-[#2E7D5A]' };
}

export function MajorAdminPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'new' ? 'new' : searchParams.get('view') === 'catalog' ? 'catalog' : 'all';
  const [newCandidatesTotal, setNewCandidatesTotal] = useState(0);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');
  const [taxonomyIdFilter, setTaxonomyIdFilter] = useState('');
  const [taxonomyOptions, setTaxonomyOptions] = useState<CanonicalPickerOption[]>([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Load Taxonomy Options
  useEffect(() => {
    canonicalPickerApi.taxonomyNodes()
      .then(setTaxonomyOptions)
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    adminApiClient.request<{ total: number }>(`/admin/majors/new-candidates?page=1&pageSize=1`, { signal: controller.signal })
      .then((result) => setNewCandidatesTotal(result.total ?? 0))
      .catch(() => undefined);
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (view === 'new') return;
    const controller = new AbortController();
    const fetchMajors = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ page: page.toString(), pageSize: '24',catalog:view==='catalog'?'true':'false' });
        if (statusFilter) params.append('status', statusFilter);
        if (completenessFilter) params.append('completenessStatus', completenessFilter);
        if (degreeFilter) params.append('degreeLevel', degreeFilter);
        if (taxonomyIdFilter) params.append('taxonomyNodeId', taxonomyIdFilter);
        if (search.trim()) params.append('search', search.trim());
        const response = await adminApiClient.request<PaginatedResponse>(`/admin/majors?${params.toString()}`, { signal: controller.signal });
        if (controller.signal.aborted) return;
        if (response.total > 0 && page > response.totalPages) { setPage(Math.max(1, response.totalPages)); return; }
        setData(response);
      } catch (err: unknown) {
        if (controller.signal.aborted) return;
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'تعذر تحميل بيانات التخصصات الأكاديمية.');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    };

    void fetchMajors();
    return () => controller.abort();
  }, [page, statusFilter, completenessFilter, degreeFilter, taxonomyIdFilter, search, view]);

  const visibleMajors = useMemo(() => data?.data ?? [], [data?.data]);
  const stats = useMemo(() => ({
    total: data?.total ?? 0,
    published: data?.stats?.published ?? visibleMajors.filter((major) => major.status === 'PUBLISHED').length,
    needsReview: data?.stats?.needsReview ?? visibleMajors.filter((major) => major.completenessStatus === 'NEEDS_REVIEW' || major.status === 'READY_TO_REVIEW').length,
    complete: data?.stats?.complete ?? visibleMajors.filter((major) => major.completenessStatus === 'COMPLETE').length,
  }), [data?.total,data?.stats,visibleMajors]);

  const hasActiveFilters = Boolean(search || degreeFilter || statusFilter || completenessFilter || taxonomyIdFilter);

  const handleResetFilters = () => {
    setSearch('');
    setDegreeFilter('');
    setStatusFilter('');
    setCompletenessFilter('');
    setTaxonomyIdFilter('');
    setPage(1);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6 font-['Cairo']">
      {/* Header Banner */}
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-52 w-52 rounded-full bg-[#F2CD78] opacity-20 pointer-events-none blur-2xl" />
        <div className="absolute -bottom-20 start-0 h-52 w-52 rounded-full bg-cyan-300 opacity-15 pointer-events-none blur-2xl" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3.5 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-sm border border-white/15">
              <GraduationCap className="h-4 w-4" />
              <span>القسم الأكاديمي · دليل التخصصات الجامعية</span>
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black leading-tight text-white tracking-tight">
              {t('admin_majors') || 'إدارة التخصصات الأكاديمية'}
            </h1>
            <p className="mt-2.5 max-w-2xl text-xs sm:text-sm font-medium leading-relaxed text-white/85">
              استعراض وإدارة بطاقات التخصصات، الكليات، الدرجات العلمية، وربطها بالتصنيفات المعيارية والبرامج.
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setSearchParams({})}
              className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                view === 'all'
                  ? 'bg-[#21A7B4] text-white shadow-md hover:bg-[#1A8D99]'
                  : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              كل التخصصات
            </button>
            <button type="button" onClick={()=>{setPage(1);setSearchParams({view:'catalog'});}} className="rounded-xl border border-white/30 px-4 py-2 text-sm">كتالوجات المصدر للمراجعة</button>
            <button
              type="button"
              onClick={() => setSearchParams({ view: 'new' })}
              className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-xs sm:text-sm font-bold transition shadow-xs cursor-pointer ${
                view === 'new'
                  ? 'bg-[#21A7B4] text-white shadow-md hover:bg-[#1A8D99]'
                  : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              <Sparkles className="h-4 w-4 text-[#F2CD78]" />
              <span>تخصصات جديدة</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-black ${
                view === 'new' ? 'bg-white/25 text-white' : 'bg-white/15 text-[#F2CD78]'
              }`}>
                {newCandidatesTotal}
              </span>
            </button>
            <Link
              to="/imports"
              className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs sm:text-sm font-bold text-white transition hover:bg-white/20 shadow-xs"
            >
              <Filter className="h-4 w-4 text-cyan-200" />
              <span>مركز الاستيراد</span>
            </Link>
          </div>
        </div>
      </section>

      {view === 'new' ? (
        <NewMajorCandidatesPanel onTotalChange={setNewCandidatesTotal} />
      ) : (
        <>
          {/* Metrics Overview */}
          <section className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="إجمالي التخصصات" value={stats.total} icon={BookOpen} accent="#142B5F" />
            <MetricCard label={data?.stats?"منشورة ضمن النتائج":"منشورة في الصفحة"} value={stats.published} icon={CheckCircle2} accent="#2E7D5A" />
            <MetricCard label={data?.stats?"تحتاج مراجعة ضمن النتائج":"تحتاج مراجعة في الصفحة"} value={stats.needsReview} icon={AlertCircle} accent="#D6A43B" />
            <MetricCard label="مكتملة البيانات" value={stats.complete} icon={GraduationCap} accent="#21A7B4" />
          </section>

          {/* Compact Refined Search & Filter Card */}
          <section className="rounded-2xl border border-[#DDEFF2] bg-white p-4 sm:p-5 shadow-xs">
            <div className="space-y-3.5">
              {/* Top Row: Search Input & Quick Reset */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0E7C86]" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    className="h-11 w-full rounded-xl border border-slate-200 bg-[#FAF7F0]/40 pr-10 pl-10 text-xs sm:text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0E7C86] focus:bg-white focus:ring-2 focus:ring-[#0E7C86]/15 font-['Cairo']"
                    placeholder="البحث باسم التخصص، الكلية، أو رمز التصنيف..."
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => { setSearch(''); setPage(1); }}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                      title="مسح البحث"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>

                {hasActiveFilters && (
                  <button
                    type="button"
                    onClick={handleResetFilters}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-3.5 text-xs font-bold text-slate-700 transition cursor-pointer shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                    <span>إعادة ضبط الفلاتر</span>
                  </button>
                )}
              </div>

              {/* Bottom Row: Filter Dropdowns Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1">
                {/* Degree Filter */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">الدرجة العلمية</label>
                  <select
                    value={degreeFilter}
                    onChange={(e) => { setDegreeFilter(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 font-['Cairo'] cursor-pointer"
                  >
                    <option value="">كل الدرجات العلمية</option>
                    {degreeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status Filter */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">حالة النشر</label>
                  <select
                    value={statusFilter}
                    onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 font-['Cairo'] cursor-pointer"
                  >
                    <option value="">كل حالات النشر</option>
                    {statusOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Completeness Filter */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">حالة الاكتمال</label>
                  <select
                    value={completenessFilter}
                    onChange={(e) => { setCompletenessFilter(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 font-['Cairo'] cursor-pointer"
                  >
                    <option value="">كل حالات الاكتمال</option>
                    {completenessOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.labelAr}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Taxonomy Filter */}
                <div>
                  <label className="mb-1 block text-[11px] font-bold text-slate-500">التصنيف المعياري</label>
                  <select
                    value={taxonomyIdFilter}
                    onChange={(e) => { setTaxonomyIdFilter(e.target.value); setPage(1); }}
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 font-['Cairo'] cursor-pointer"
                  >
                    <option value="">كل التصنيفات المعيارية</option>
                    {taxonomyOptions.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.label}{item.code ? ` (${item.code})` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Status footer inside filter */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                <span className="font-medium">
                  تم العثور على <strong className="text-[#142B5F] font-bold">{data?.total ?? 0}</strong> تخصص
                </span>
                {data && data.totalPages > 1 && (
                  <span className="text-[11px] text-slate-400">
                    صفحة {data.page} من {data.totalPages}
                  </span>
                )}
              </div>
            </div>
          </section>

          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Cards Grid Section */}
          <section className="space-y-5">
            {loading && !data ? (
              <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-8">
                <Loader2 className="h-9 w-9 animate-spin text-[#0E7C86]" />
                <p className="text-xs font-bold text-slate-500">جاري تحميل بيانات التخصصات...</p>
              </div>
            ) : visibleMajors.length === 0 ? (
              <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-8 text-center shadow-xs">
                <div className="h-14 w-14 rounded-2xl bg-slate-100 grid place-items-center text-slate-400">
                  <BookOpen className="h-7 w-7" />
                </div>
                <h3 className="text-sm font-bold text-slate-700">
                  {t('no_majors_found') || 'لم يتم العثور على أي تخصصات تطابق معايير البحث'}
                </h3>
                <p className="text-xs text-slate-500 max-w-sm">
                  يمكنك إعادة ضبط الفلاتر للبحث مرة أخرى، أو التوجه لمركز الاستيراد لإضافة تخصصات جديدة.
                </p>
                <div className="flex gap-2 pt-2">
                  {hasActiveFilters && (
                    <button
                      type="button"
                      onClick={handleResetFilters}
                      className="inline-flex min-h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      <RotateCcw className="h-3.5 w-3.5" />
                      <span>إعادة ضبط الفلاتر</span>
                    </button>
                  )}
                  <Link
                    to="/imports"
                    className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] px-4 text-xs font-bold text-white transition shadow-xs"
                  >
                    <span>فتح مركز الاستيراد</span>
                  </Link>
                </div>
              </div>
            ) : (
              /* Beautiful Responsive Cards Grid */
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
                {visibleMajors.map((major) => (
                  <article
                    key={major.profileId || major.id}
                    className="group relative flex flex-col justify-between rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-xs transition-all duration-200 hover:border-[#21A7B4]/60 hover:shadow-md hover:-translate-y-0.5"
                  >
                    {/* Card Top: Badges & Identifiers */}
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        {/* Degree Badge in Navy/Teal */}
                        <div className="inline-flex items-center gap-1.5 rounded-lg bg-[#142B5F]/10 border border-[#142B5F]/15 px-2.5 py-1 text-[11px] font-black text-[#142B5F]">
                          <GraduationCap className="h-3.5 w-3.5 text-[#0E7C86]" />
                          <span>{getDegreeArabicLabel(major.degreeLevel)}</span>
                        </div>

                        {/* Major Code / Number */}
                        {major.classificationCode ? (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-700" title="رمز التصنيف">
                            <Hash className="h-3 w-3 text-slate-400" />
                            <span>{major.classificationCode}</span>
                          </div>
                        ) : major.publicId ? (
                          <div className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-[11px] font-mono font-bold text-slate-600">
                            <span>#{major.publicId}</span>
                          </div>
                        ) : null}
                      </div>

                      {/* Major Name (Arabic / Display Name) */}
                      <div className="mt-3.5">
                        <Link
                          to={`/majors/${major.id}${major.profileId ? `?profileId=${major.profileId}` : ''}`}
                          className="block text-base sm:text-lg font-black text-[#142B5F] group-hover:text-[#0E7C86] transition-colors leading-snug line-clamp-2"
                        >
                          {major.nameAr || major.displayName}
                        </Link>
                      </div>

                      {major.nameEn && <p dir="ltr" className="mt-1 text-xs text-slate-500 text-right">{major.nameEn}</p>}
                      {/* Details: College & Discipline */}
                      <div className="mt-3 space-y-1.5 text-xs text-slate-600">
                        {major.collegeOrFaculty && (
                          <div className="flex items-center gap-1.5 text-slate-600">
                            <Building2 className="h-3.5 w-3.5 shrink-0 text-[#0E7C86]" />
                            <span className="font-semibold line-clamp-1">{major.collegeOrFaculty}</span>
                          </div>
                        )}
                        {major.academicFieldOrDiscipline && (
                          <div className="flex items-center gap-1.5 text-slate-500">
                            <Layers3 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                            <span className="font-medium line-clamp-1">{major.academicFieldOrDiscipline}</span>
                          </div>
                        )}
                      </div>

                      {/* Status row */}
                      <div className="mt-3.5 flex flex-wrap items-center gap-2">
                        <span className={`inline-flex items-center rounded-lg border px-2.5 py-0.5 text-[11px] font-bold ${statusBadgeClasses(major.status)}`}>
                          {getStatusArabicLabel(major.status)}
                        </span>
                        {major.currentPublishedVersionId && (
                          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            <CheckCircle2 className="h-3 w-3 text-emerald-600" />
                            <span>نسخة منشورة</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Card Footer: Action Button */}
                    <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-400 font-medium">
                        {major.updatedAt ? new Date(major.updatedAt).toLocaleDateString('ar-SA') : 'معتمد'}
                      </span>

                      <Link
                        to={`/majors/${major.id}${major.profileId ? `?profileId=${major.profileId}` : ''}`}
                        className="inline-flex items-center gap-1.5 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] text-white px-3.5 py-2 text-xs font-bold transition shadow-xs cursor-pointer group-hover:shadow-sm"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>عرض التفاصيل</span>
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}

            {/* Pagination */}
            {data && data.totalPages > 1 && (
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 rounded-2xl border border-[#DDEFF2] bg-white p-4 shadow-xs">
                <span className="text-xs font-bold text-slate-600">
                  صفحة <strong className="text-[#142B5F]">{data.page}</strong> من <strong className="text-[#142B5F]">{data.totalPages}</strong> (إجمالي {data.total} تخصص)
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={data.page === 1}
                    onClick={() => setPage((v) => Math.max(1, v - 1))}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <ChevronRight className="h-4 w-4" />
                    <span>السابق</span>
                  </button>
                  <button
                    type="button"
                    disabled={data.page === data.totalPages}
                    onClick={() => setPage((v) => v + 1)}
                    className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 px-3.5 py-2 text-xs font-bold text-slate-700 transition disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed shadow-xs"
                  >
                    <span>التالي</span>
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
