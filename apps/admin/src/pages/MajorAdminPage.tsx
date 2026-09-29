import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { AlertCircle, BookOpen, CheckCircle2, Eye, Filter, GraduationCap, Layers3, Loader2, Search } from 'lucide-react';
import { useTranslation } from "../i18n/I18nProvider";
import { NewMajorCandidatesPanel } from '../components/NewMajorCandidatesPanel';

type MajorStatus = 'IMPORTED' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED' | string;
type MajorCompletenessStatus = 'INCOMPLETE' | 'NEEDS_REVIEW' | 'COMPLETE' | string;

interface Major {
  id: string;
  publicId?: string;
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
}

const degreeOptions = ['BACHELOR', 'MASTER', 'DOCTORATE', 'FELLOWSHIP'];
const statusOptions = ['IMPORTED', 'READY_TO_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHED', 'REJECTED', 'ARCHIVED'];
const completenessOptions = ['INCOMPLETE', 'NEEDS_REVIEW', 'COMPLETE'];

function formatLabel(value?: string | null): string {
  if (!value) return 'غير محدد';
  return value.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function statusTone(status?: string): string {
  switch (status) {
    case 'PUBLISHED':
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    case 'READY_TO_PUBLISH':
      return 'bg-blue-50 text-blue-700 border-blue-200';
    case 'READY_TO_REVIEW':
      return 'bg-amber-50 text-amber-700 border-amber-200';
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
  if (accent === '#142B5F') return { icon: 'bg-[#142B5F]/10 text-[#142B5F]', text: 'text-[#142B5F]' };
  if (accent === '#0E7C86') return { icon: 'bg-[#0E7C86]/10 text-[#0E7C86]', text: 'text-[#0E7C86]' };
  if (accent === '#21A7B4') return { icon: 'bg-[#21A7B4]/10 text-[#21A7B4]', text: 'text-[#21A7B4]' };
  if (accent === '#D6A43B') return { icon: 'bg-[#D6A43B]/10 text-[#D6A43B]', text: 'text-[#D6A43B]' };
  if (accent === '#B94A48') return { icon: 'bg-[#B94A48]/10 text-[#B94A48]', text: 'text-[#B94A48]' };
  return { icon: 'bg-[#2E7D5A]/10 text-[#2E7D5A]', text: 'text-[#2E7D5A]' };
}

function Badge({ value, kind }: { value?: string | null; kind: 'status' | 'completeness' | 'neutral' }) {
  const tone = kind === 'status'
    ? statusTone(value ?? undefined)
    : value === 'COMPLETE'
      ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
      : value === 'NEEDS_REVIEW'
        ? 'bg-amber-50 text-amber-700 border-amber-200'
        : 'bg-slate-50 text-slate-700 border-slate-200';

  return <span className={`inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-bold ${kind === 'neutral' ? 'bg-slate-50 text-slate-700 border-slate-200' : tone}`}>{formatLabel(value)}</span>;
}

export function MajorAdminPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const view = searchParams.get('view') === 'new' ? 'new' : 'all';
  const [newCandidatesTotal, setNewCandidatesTotal] = useState(0);
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');
  const [taxonomyIdFilter, setTaxonomyIdFilter] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

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
        const params = new URLSearchParams({ page: page.toString(), pageSize: '24' });
        if (statusFilter) params.append('status', statusFilter);
        if (completenessFilter) params.append('completenessStatus', completenessFilter);
        if (degreeFilter) params.append('degreeLevel', degreeFilter);
        if (taxonomyIdFilter) params.append('academicFieldId', taxonomyIdFilter);
        if (search.trim()) params.append('search', search.trim());
        const response = await adminApiClient.request<PaginatedResponse>(`/admin/majors?${params.toString()}`, { signal: controller.signal });
        setData(response);
      } catch (err: unknown) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setError(err instanceof Error ? err.message : 'Unable to load academic majors.');
      } finally {
        setLoading(false);
      }
    };

    void fetchMajors();
    return () => controller.abort();
  }, [page, statusFilter, completenessFilter, degreeFilter, taxonomyIdFilter, search, view]);

  const visibleMajors = useMemo(() => data?.data ?? [], [data?.data]);
  const stats = useMemo(() => ({
    total: data?.total ?? 0,
    published: visibleMajors.filter((major) => major.status === 'PUBLISHED').length,
    needsReview: visibleMajors.filter((major) => major.completenessStatus === 'NEEDS_REVIEW' || major.status === 'READY_TO_REVIEW').length,
    complete: visibleMajors.filter((major) => major.completenessStatus === 'COMPLETE').length,
  }), [data?.total, visibleMajors]);

  const resetAndSet = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-5">
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-52 w-52 rounded-full bg-[#F2CD78] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-sm border border-white/15">
              <GraduationCap className="h-4 w-4" />
              <span>القسم الأكاديمي · إدارة التخصصات</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">{t('admin_majors') || 'إدارة التخصصات'}</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-white/80">إدارة هوية التخصص، الدرجة، التصنيف، النسخ، والربط مع البرامج والمنح والدورات.</p>
          </div>
          <div className="flex flex-wrap gap-2 shrink-0">
            <button type="button" onClick={() => setSearchParams({})} className={`inline-flex min-h-11 items-center justify-center rounded-xl px-4 text-sm font-black transition ${view === 'all' ? 'bg-[#21A7B4] text-white shadow-md hover:bg-[#1A8D99]' : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'}`}>كل التخصصات</button>
            <button type="button" onClick={() => setSearchParams({ view: 'new' })} className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-black transition ${view === 'new' ? 'bg-[#21A7B4] text-white shadow-md hover:bg-[#1A8D99]' : 'border border-white/20 bg-white/10 text-white hover:bg-white/20'}`}>
              تخصصات جديدة
              <span className={`rounded-full px-2 py-0.5 text-[11px] ${view === 'new' ? 'bg-white/20 text-white' : 'bg-white/15 text-[#21A7B4]'}`}>{newCandidatesTotal}</span>
            </button>
            <Link to="/imports" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/20 shadow-xs">
              <Filter className="h-4 w-4 text-[#21A7B4]" />مركز الاستيراد
            </Link>
          </div>
        </div>
      </section>

      {view === 'new' ? (
        <NewMajorCandidatesPanel onTotalChange={setNewCandidatesTotal} />
      ) : (
        <>
      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label="كل التخصصات" value={stats.total} icon={BookOpen} accent="#142B5F" />
        <MetricCard label="منشور في الموقع" value={stats.published} icon={CheckCircle2} accent="#2E7D5A" />
        <MetricCard label="بحاجة لمراجعة" value={stats.needsReview} icon={AlertCircle} accent="#D6A43B" />
        <MetricCard label="مكتمل البيانات" value={stats.complete} icon={GraduationCap} accent="#21A7B4" />
      </section>

      <section className="rounded-lg border border-[#DDEFF2] bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-6">
          <label className="relative md:col-span-2 xl:col-span-2">
            <Search className="pointer-events-none absolute right-3 top-3 h-4 w-4 text-slate-400" />
            <input
              value={search}
              onChange={resetAndSet(setSearch)}
              className="min-h-11 w-full rounded-lg border border-slate-200 bg-white pr-9 pl-3 text-sm outline-none focus:border-[#21A7B4] focus:ring-1 focus:ring-[#21A7B4]"
              placeholder="البحث بالاسم أو الرمز"
            />
          </label>
          <select value={degreeFilter} onChange={resetAndSet(setDegreeFilter)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#21A7B4]">
            <option value="">كل الدرجات</option>
            {degreeOptions.map((degree) => <option key={degree} value={degree}>{degree}</option>)}
          </select>
          <select value={statusFilter} onChange={resetAndSet(setStatusFilter)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#21A7B4]">
            <option value="">كل حالات النشر</option>
            {statusOptions.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
          </select>
          <select value={completenessFilter} onChange={resetAndSet(setCompletenessFilter)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#21A7B4]">
            <option value="">كل حالات الاكتمال</option>
            {completenessOptions.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
          </select>
          <input value={taxonomyIdFilter} onChange={resetAndSet(setTaxonomyIdFilter)} className="min-h-11 rounded-lg border border-slate-200 bg-white px-3 text-sm outline-none focus:border-[#21A7B4]" placeholder="المجال الأكاديمي" />
        </div>
      </section>

      {error && <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-bold text-red-700">{error}</div>}

      <section className="rounded-xl border border-[#DDEFF2] bg-white shadow-sm">
        {loading && !data ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          </div>
        ) : visibleMajors.length === 0 ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 p-8 text-center">
            <BookOpen className="h-10 w-10 text-slate-300" />
            <p className="text-sm font-bold text-slate-600">{t('no_majors_found') || 'لم يتم العثور على تخصصات'}</p>
            <Link to="/imports" className="inline-flex min-h-10 items-center rounded-lg bg-[#142B5F] px-4 text-sm font-bold text-white">فتح مركز الاستيراد</Link>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {visibleMajors.map((major) => (
              <article key={major.id} className="grid gap-3 p-4 transition hover:bg-slate-50 lg:grid-cols-[1fr_180px_180px_170px] lg:items-center">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-black text-slate-950">{major.displayName}</h3>
                    {major.classificationCode && <span className="rounded-md bg-slate-100 px-2 py-1 font-mono text-[11px] font-bold text-slate-700">{major.classificationCode}</span>}
                  </div>
                  <div className="mt-2 flex flex-wrap gap-2 text-[12px] text-slate-500">
                    <span className="inline-flex items-center gap-1"><GraduationCap className="h-3.5 w-3.5" /> {formatLabel(major.degreeLevel)}</span>
                    {major.academicFieldOrDiscipline && <span className="inline-flex items-center gap-1"><Layers3 className="h-3.5 w-3.5" /> {major.academicFieldOrDiscipline}</span>}
                    {major.collegeOrFaculty && <span>{major.collegeOrFaculty}</span>}
                  </div>
                </div>
                <Badge value={major.status} kind="status" />
                <Badge value={major.completenessStatus} kind="completeness" />
                <div className="flex flex-wrap gap-2 lg:justify-end">
                  {major.currentPublishedVersionId && <Badge value="نسخة منشورة" kind="neutral" />}
                  <Link to={`/majors/${major.id}`} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-[#142B5F] px-3 text-[12px] font-bold text-white hover:bg-[#203442]">
                    <Eye className="h-4 w-4" />
                    التفاصيل
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}

        {data && data.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-4 py-3">
            <span className="text-sm text-slate-600">صفحة <strong>{data.page}</strong> من <strong>{data.totalPages}</strong></span>
            <div className="flex gap-2">
              <button disabled={data.page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">السابق</button>
              <button disabled={data.page === data.totalPages} onClick={() => setPage((value) => value + 1)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-bold disabled:opacity-40">التالي</button>
            </div>
          </div>
        )}
      </section>
        </>
      )}
    </div>
  );
}
