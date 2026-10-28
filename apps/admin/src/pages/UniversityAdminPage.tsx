import {OwnerDraftCreateForm} from '../components/OwnerDraftCreateForm';
import { adminPaths } from '../navigation/AdminRoutes';
import { AdminLink } from '../components/AdminLink';
import {UniversityLocationFilters} from '../components/UniversityLocationFilters';
import { UniversityProgramWorkspace } from '../components/UniversityProgramWorkspace';
import { useUniversityListQuery } from '../features/universities/useUniversityListQuery';
import { useEffect, useState, useMemo, useRef } from 'react';
import { adminApiClient } from '../api/client';
import { 
  School, 
  Filter, 
  Loader2, 
  Globe, 
  Calendar, 
  MapPin, 
  RefreshCw, 
  CheckCircle2, 
  Sparkles, 
  SearchCheck, 
  AlertTriangle, 
  Search, 
  Database,
  ArrowLeft,
  ArrowRight,
  Plus,
  LayoutGrid,
  Table as TableIcon,
  Building2,
  ShieldCheck,
  ArrowDownWideNarrow,
  ExternalLink
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';

interface University {
  id: string;
  displayName: string;
  country: string;
  city?: string;
  foundedYear?: number;
  officialWebsite?: string;
  status: string;
  completenessStatus: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: University[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface UniversityStats {
  total: number | null;
  published: number | null;
  readyToReview: number | null;
  complete: number | null;
  incomplete: number | null;
}

export function UniversityAdminPage() {
  const { language, dir } = useTranslation();
  const isArabic = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const tr = (ar: string, en: string) => (isArabic ? ar : en);

  const { searchParams, setSearchParams, countryReferenceId, searchTerm, setSearchTerm,
    statusFilter, setStatusFilter, completenessFilter, setCompletenessFilter,
    page, setPage, queryKey } = useUniversityListQuery();

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [stats, setStats] = useState<UniversityStats>({
    total: null,
    published: null,
    readyToReview: null,
    complete: null,
    incomplete: null,
  });
  const [statsLoading, setStatsLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate,setShowCreate]=useState(false);
  const [showPrograms,setShowPrograms]=useState(false);
  const [viewMode,setViewMode]=useState<'cards'|'table'>('cards');
  const listRequest = useRef(0);
  const statsRequest = useRef(0);
  const [cooldown, setCooldown] = useState<number | null>(null);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(isArabic ? 'ar' : 'en-US'), [isArabic]);
  const formatNumber = (value: number | null | undefined) => (value == null ? '—' : numberFormatter.format(value));

  const fetchStats = async () => {
    const request = ++statsRequest.current;
    setStatsLoading(true);
    try {
      const [totalRes, pubRes, revRes, compRes, incompRes] = await Promise.allSettled([
        adminApiClient.request<PaginatedResponse>('/admin/universities?page=1&pageSize=1'),
        adminApiClient.request<PaginatedResponse>('/admin/universities?page=1&pageSize=1&status=PUBLISHED'),
        adminApiClient.request<PaginatedResponse>('/admin/universities?page=1&pageSize=1&status=READY_TO_REVIEW'),
        adminApiClient.request<PaginatedResponse>('/admin/universities?page=1&pageSize=1&completenessStatus=COMPLETE'),
        adminApiClient.request<PaginatedResponse>('/admin/universities?page=1&pageSize=1&completenessStatus=INCOMPLETE'),
      ]);

      if (request !== statsRequest.current) return;
      setStats({
        total: totalRes.status === 'fulfilled' ? totalRes.value.total : null,
        published: pubRes.status === 'fulfilled' ? pubRes.value.total : null,
        readyToReview: revRes.status === 'fulfilled' ? revRes.value.total : null,
        complete: compRes.status === 'fulfilled' ? compRes.value.total : null,
        incomplete: incompRes.status === 'fulfilled' ? incompRes.value.total : null,
      });
    } catch {
      // transient fail safe
    } finally {
      if (request === statsRequest.current) setStatsLoading(false);
    }
  };

  const fetchUniversities = async (signal?:AbortSignal) => {
    const request = ++listRequest.current;
    setLoading(true);
    setError(null);
    setData(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' });
      if (searchTerm.trim()) params.set('search', searchTerm.trim());
      if (statusFilter) params.append('status', statusFilter);
      if (completenessFilter) params.append('completenessStatus', completenessFilter);
      for(const key of ['regionReferenceId','cityReferenceId','institutionType','sort']){const value=searchParams.get(key);if(value)params.set(key,value);}
      if (countryReferenceId) params.append('countryReferenceId', countryReferenceId);

      const response = await adminApiClient.request<PaginatedResponse>(`/admin/universities?${params.toString()}`,{signal,cache:'no-store'});
      if (request !== listRequest.current) return;
      if (page > Math.max(1, Math.ceil(response.total / 20))) { setPage(Math.max(1, Math.ceil(response.total / 20))); return; }
      setData(response);
      setCooldown(null);
    } catch (err: unknown) {
      if(signal?.aborted)return;
      if (request !== listRequest.current) return;
      const msg = (err instanceof Error ? err.message : '') || tr('تعذر تحميل بيانات الجامعات.', 'Unable to load universities.');
      setError(msg);
      if (msg.includes('[429]')) {
        const parts = msg.split('|');
        const seconds = parts[1] ? parseInt(parts[1], 10) : 60;
        setCooldown(seconds);
      }
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    return () => { statsRequest.current++; };
  }, []);

  useEffect(() => {
    const abort=new AbortController();const timer=window.setTimeout(()=>{void fetchUniversities(abort.signal);},300);
    return()=>{window.clearTimeout(timer);abort.abort();listRequest.current++;};
  }, [queryKey]);

  useEffect(() => {
    if (cooldown === null || cooldown <= 0) return;
    const interval = setInterval(() => {
      setCooldown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [cooldown]);

  const handleRefresh = () => {
    fetchStats();
    fetchUniversities();
  };

  const handleStatusCardClick = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('');
    } else {
      setStatusFilter(status);
    }
    setPage(1);
  };

  const filteredItems = data?.data ?? [];

  return (
    <div className="university-workspace mx-auto max-w-7xl space-y-6 font-['Cairo',sans-serif] text-[#203442]">
      <section className="admin-section-hero relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
          <div className="min-w-0 flex-1 space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-md">
              <School className="h-4 w-4" />
              <span>{tr('دليل المؤسسات والجامعات العالمية', 'Institution & University Directory')}</span>
            </div>
            <h1 className="text-2xl font-black leading-relaxed sm:text-3xl text-white">
              {tr('إدارة دليل الجامعات', 'University Directory Management')}
            </h1>
            <p className="max-w-2xl text-xs font-medium leading-relaxed text-[#DDEFF2] sm:text-sm">
              {tr(
                'استعراض وتدقيق بيانات الجامعات والمؤسسات التعليمية، متابعة حالة النشر والاكتمال، وإدارة ربط البرامج الأكاديمية.',
                'Browse and verify global universities, track publishing and completeness status, and manage academic linkages.'
              )}
            </p>
          </div>

          <div className="admin-section-actions flex max-w-full flex-wrap items-center gap-3 xl:max-w-sm">
            <button type="button" aria-expanded={showCreate} aria-controls="university-create" onClick={()=>setShowCreate(value=>!value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-white px-4 text-xs font-bold text-[#142B5F]"><Plus className="h-4 w-4" aria-hidden="true" />{tr('إنشاء جامعة جديدة','Create university')}</button>
            <button type="button" aria-expanded={showPrograms} aria-controls="university-program-workspace" onClick={()=>setShowPrograms(value=>!value)} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold"><School className="h-4 w-4" aria-hidden="true" />{tr('إدارة البرامج الأكاديمية','Academic programs')}</button>
            <button
              onClick={handleRefresh}
              disabled={loading || statsLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
              title={tr('تحديث البيانات', 'Refresh Data')}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{tr('تحديث البيانات', 'Refresh')}</span>
            </button>

            <AdminLink
              to={adminPaths.universityImport}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/30 bg-white/15 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
            >
              <Database className="h-4 w-4 text-[#F2CD78]" />
              <span>{tr('مركز استيراد الجامعات', 'Import Center')}</span>
            </AdminLink>

            <AdminLink
              to={adminPaths.destinations}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#21A7B4] to-[#0E7C86] px-5 text-xs font-black text-white shadow-md transition-all hover:brightness-110 active:scale-95"
            >
              <span>{tr('وجهات الدراسة', 'Study Destinations')}</span>
              <ArrowIcon className="h-4 w-4" />
            </AdminLink>
          </div>
        </div>
      </section>

      {/* Live Summary Metric Counters Row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="University Metric Counters">
        {/* Total Universities */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === '' && !countryReferenceId ? 'border-[#142B5F] bg-blue-50/40 ring-2 ring-[#142B5F]/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#142B5F]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('إجمالي الجامعات', 'Total Universities')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#142B5F] border border-blue-100">
              <School className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-[#142B5F]">
            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(stats.total)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-slate-400">
            <span>{statusFilter === '' ? tr('● محدد حالياً (الكل)', '● Selected (All)') : tr('عرض جميع الجامعات', 'View all')}</span>
          </div>
        </button>

        {/* Published Universities */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('PUBLISHED')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'PUBLISHED' ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('جامعات منشورة', 'Published')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-700">
            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(stats.published)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-emerald-600/80">
            <span>{statusFilter === 'PUBLISHED' ? tr('● مفلترة بالمنشورة', '● Filtered') : tr('تصفية المنشورة للطلاب', 'Filter published')}</span>
          </div>
        </button>

        {/* Ready to Review */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('READY_TO_REVIEW')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'READY_TO_REVIEW' ? 'border-[#0E7C86] bg-teal-50/40 ring-2 ring-[#0E7C86]/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#0E7C86]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('بانتظار المراجعة', 'Ready to Review')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0E7C86] border border-teal-100">
              <SearchCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-[#0E7C86]">
            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(stats.readyToReview)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#0E7C86]/80">
            <span>{tr('تحتاج اعتماد وتدقيق', 'Requires Review')}</span>
          </div>
        </button>

        {/* Complete Status */}
        <button
          type="button"
          onClick={() => {
            setCompletenessFilter((prev) => (prev === 'COMPLETE' ? '' : 'COMPLETE'));
            setPage(1);
          }}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            completenessFilter === 'COMPLETE' ? 'border-[#21A7B4] bg-cyan-50/40 ring-2 ring-[#21A7B4]/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#21A7B4]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('بيانات مكتملة', 'Complete')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-100">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-cyan-700">
            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(stats.complete)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-cyan-600/80">
            <span>{tr('ملف المؤسسة مكتمل', 'Complete profiles')}</span>
          </div>
        </button>

        {/* Incomplete Status */}
        <button
          type="button"
          onClick={() => {
            setCompletenessFilter((prev) => (prev === 'INCOMPLETE' ? '' : 'INCOMPLETE'));
            setPage(1);
          }}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            completenessFilter === 'INCOMPLETE' ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('بيانات ناقصة', 'Incomplete')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-700">
            {statsLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(stats.incomplete)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-amber-600/80">
            <span>{tr('بحاجة لاستكمال البيانات', 'Needs data entry')}</span>
          </div>
        </button>
      </section>
      {showCreate&&<section id="university-create"><OwnerDraftCreateForm owner="universities" defaultOpen /></section>}
      {showPrograms&&<section id="university-program-workspace" className="admin-section-tools"><UniversityProgramWorkspace /></section>}

      <section aria-labelledby="university-filters" className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <h2 id="university-filters" className="mb-4 flex items-center gap-2 text-lg font-black text-[#142B5F]"><Filter className="h-5 w-5 text-[#0E7C86]" aria-hidden="true" />{tr('البحث والتصفية','Search and filters')}</h2>
        <div className="mb-5 flex flex-col gap-3 sm:flex-row">
          <label className="relative min-w-0 flex-1"><span className="sr-only">{tr('البحث عن جامعة','Search universities')}</span><Search className="pointer-events-none absolute start-3 top-3.5 h-4 w-4 text-[#0E7C86]" aria-hidden="true" /><input type="search" maxLength={200} value={searchTerm} onChange={event=>{setSearchTerm(event.target.value);setPage(1);}} placeholder={tr('البحث باسم الجامعة، الدولة، أو المدينة…','University, country or city…')} className="min-h-11 w-full rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/30 py-3 pe-3 ps-10 text-xs" /></label>
          <div className="flex items-center gap-2">
            <button type="button" aria-pressed={viewMode==='cards'} onClick={()=>setViewMode('cards')} className={viewMode==='cards'?'inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-bold text-white':'inline-flex items-center gap-2 rounded-xl border border-[#DDEFF2] px-4 py-3 text-xs font-bold'}><LayoutGrid aria-hidden="true" className="h-4 w-4" />{tr('بطاقات','Cards')}</button>
            <button type="button" aria-pressed={viewMode==='table'} onClick={()=>setViewMode('table')} className={viewMode==='table'?'inline-flex items-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-bold text-white':'inline-flex items-center gap-2 rounded-xl border border-[#DDEFF2] px-4 py-3 text-xs font-bold'}><TableIcon aria-hidden="true" className="h-4 w-4" />{tr('جدول','Table')}</button>
            <button type="button" onClick={()=>{setStatusFilter('');setCompletenessFilter('');setSearchTerm('');setSearchParams(new URLSearchParams());setPage(1);}} className="rounded-xl border border-[#DDEFF2] px-3 py-3 text-xs font-bold">{tr('إعادة ضبط','Reset')}</button>
          </div>
        </div>
        <div className="university-filter-fields grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          <UniversityLocationFilters countryId={countryReferenceId} regionId={searchParams.get('regionReferenceId')??''} cityId={searchParams.get('cityReferenceId')??''} ar={isArabic} onChange={(key,value)=>{const next=new URLSearchParams(searchParams);if(value)next.set(key,value);else next.delete(key);if(key==='countryReferenceId'){next.delete('regionReferenceId');next.delete('cityReferenceId');}if(key==='regionReferenceId')next.delete('cityReferenceId');setSearchParams(next);setPage(1);}} />
          <label><span><Building2 aria-hidden="true" />{tr('نوع المؤسسة','Institution type')}</span><select value={searchParams.get('institutionType')??''} onChange={event=>{const next=new URLSearchParams(searchParams);if(event.target.value)next.set('institutionType',event.target.value);else next.delete('institutionType');setSearchParams(next);setPage(1);}}><option value="">{tr('الكل','All')}</option>{[['UNIVERSITY','جامعة'],['COLLEGE','كلية'],['INSTITUTE','معهد'],['ACADEMY','أكاديمية'],['OTHER','أخرى']].map(([value,label])=><option key={value} value={value}>{isArabic?label:value}</option>)}</select></label>
          <label><span><ShieldCheck aria-hidden="true" />{tr('حالة النشر والمراجعة','Status')}</span><select value={statusFilter} onChange={event=>{setStatusFilter(event.target.value);setPage(1);}}><option value="">{tr('جميع الحالات','All statuses')}</option>{['IMPORTED','READY_TO_REVIEW','READY_TO_PUBLISH','PUBLISHED','REJECTED','ARCHIVED'].map(value=><option key={value} value={value}>{formatStatusLabel(value,isArabic)}</option>)}</select></label>
          <label><span><CheckCircle2 aria-hidden="true" />{tr('اكتمال البيانات','Completeness')}</span><select value={completenessFilter} onChange={event=>{setCompletenessFilter(event.target.value);setPage(1);}}><option value="">{tr('جميع مستويات الاكتمال','All completeness')}</option>{['COMPLETE','NEEDS_REVIEW','INCOMPLETE'].map(value=><option key={value} value={value}>{formatCompletenessLabel(value,isArabic)}</option>)}</select></label>
          <label><span><ArrowDownWideNarrow aria-hidden="true" />{tr('الترتيب','Sort')}</span><select value={searchParams.get('sort')??'CREATED_DESC'} onChange={event=>{const next=new URLSearchParams(searchParams);next.set('sort',event.target.value);setSearchParams(next);setPage(1);}}><option value="CREATED_DESC">{tr('الأحدث إنشاء','Newest created')}</option><option value="UPDATED_DESC">{tr('الأحدث تحديث','Newest updated')}</option><option value="NAME_ASC">{tr('اسم الجامعة','University name')}</option></select></label>
        </div>
      </section>

      {error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-8 text-center shadow-sm max-w-2xl mx-auto">
          <School className="mx-auto h-12 w-12 text-rose-600 animate-bounce" />
          <h2 className="mt-4 text-xl font-black text-rose-900">
            {error.includes('429') 
              ? tr('لقد تم تقييد الطلبات مؤقتاً (خطأ 429)', 'Rate limit active (Error 429)') 
              : tr('فشل تحميل بيانات الجامعات', 'Failed to load universities')}
          </h2>
          <p className="mt-2 text-xs text-rose-700 leading-relaxed font-bold">
            {error.includes('429')
              ? cooldown 
                ? tr(`يرجى الانتظار لمدة ${cooldown} ثانية قبل إعادة المحاولة.`, `Please wait ${cooldown}s before retrying.`)
                : tr('يرجى الانتظار قليلاً ثم إعادة المحاولة.', 'Please wait a moment and try again.')
              : error.split('|')[0]}
          </p>
          <button 
            type="button"
            disabled={cooldown !== null && cooldown > 0}
            onClick={() => void fetchUniversities()} 
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-rose-600 hover:bg-rose-700 px-6 py-2.5 text-xs font-black text-white transition-all active:scale-95 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`h-4 w-4 ${cooldown ? '' : 'animate-spin'}`} />
            <span>{cooldown ? tr(`إعادة المحاولة خلال ${cooldown} ثانية`, `Retry in ${cooldown}s`) : tr('إعادة المحاولة', 'Retry')}</span>
          </button>
        </div>
      ) : (
        <>
          {/* Main Table Card */}
          {loading && !data ? (
            <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200/90 bg-white">
              <div className="flex flex-col items-center gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
                <p className="text-xs font-bold text-slate-500">{tr('جارٍ تحميل الجامعات...', 'Loading universities...')}</p>
              </div>
            </div>
          ) : (
            <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
              {viewMode==='cards'&&<div className="space-y-4 bg-slate-50/40 p-4 sm:p-5">
                {filteredItems.length===0?<p className="py-8 text-center text-sm text-slate-500">{tr('لا توجد جامعات تطابق الفلاتر المحددة.','No matching universities.')}</p>:filteredItems.map(uni=><UniversityCard key={uni.id} university={uni} ar={isArabic} />)}
              </div>}
              <div hidden={viewMode!=='table'} className="overflow-x-auto">
                <table className="w-full border-collapse text-start text-xs">
                  <thead>
                    <tr className="border-b border-slate-200/90 bg-[#FAF7F0] text-[11px] font-black uppercase tracking-wider text-[#142B5F]">
                      <th className="px-6 py-4 text-start">{tr('الجامعة / المؤسسة', 'University / Institution')}</th>
                      <th className="px-6 py-4 text-start">{tr('الموقع والبلد', 'Location')}</th>
                      <th className="px-6 py-4 text-start">{tr('سنة التأسيس', 'Founded')}</th>
                      <th className="px-6 py-4 text-start">{tr('الموقع الإلكتروني', 'Website')}</th>
                      <th className="px-6 py-4 text-start">{tr('الحالة', 'Status')}</th>
                      <th className="px-6 py-4 text-start">{tr('حالة الاكتمال', 'Completeness')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                          <div className="flex flex-col items-center justify-center gap-2">
                            <School className="h-8 w-8 text-slate-300" />
                            <span className="font-bold">{tr('لا توجد جامعات تطابق الفلاتر المحددة.', 'No universities found matching your filters.')}</span>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredItems.map((uni) => (
                        <tr key={uni.id} className="transition-colors hover:bg-slate-50/70">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2.5">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-teal-50 border border-teal-100 text-[#0E7C86]">
                                <School className="h-4 w-4" />
                              </div>
                              <div>
                                <AdminLink
                                  to={`/universities/${uni.id}`}
                                  className="font-black text-[#142B5F] text-sm hover:text-[#0E7C86] hover:underline"
                                >
                                  {uni.displayName}
                                </AdminLink>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center gap-1 font-bold text-slate-600">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {uni.city ? `${uni.city}، ` : ''}{uni.country}
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-slate-600">
                            {uni.foundedYear ? (
                              <span className="inline-flex items-center gap-1">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                {uni.foundedYear}
                              </span>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-6 py-4">
                            {uni.officialWebsite ? (
                              <a
                                href={uni.officialWebsite}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-bold text-[#0E7C86] hover:underline"
                              >
                                <Globe className="h-3.5 w-3.5" />
                                <span>{tr('الموقع الرسمي', 'Visit')}</span>
                                <ExternalLink className="h-3 w-3" />
                              </a>
                            ) : (
                              '—'
                            )}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-black ${
                                uni.status === 'PUBLISHED'
                                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                  : uni.status === 'READY_TO_PUBLISH'
                                  ? 'bg-teal-50 border border-teal-200 text-[#0E7C86]'
                                  : uni.status === 'READY_TO_REVIEW'
                                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                  : 'bg-slate-100 border border-slate-200 text-slate-700'
                              }`}
                            >
                              {formatStatusLabel(uni.status, isArabic)}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-black ${
                                uni.completenessStatus === 'COMPLETE'
                                  ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                                  : uni.completenessStatus === 'NEEDS_REVIEW'
                                  ? 'bg-amber-50 border border-amber-200 text-amber-700'
                                  : 'bg-rose-50 border border-rose-200 text-rose-700'
                              }`}
                            >
                              {formatCompletenessLabel(uni.completenessStatus, isArabic)}
                            </span>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {data && data.totalPages > 1 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/90 bg-[#FAF7F0] px-6 py-3.5 text-xs font-bold text-slate-600">
                  <div>
                    <span>{tr('الصفحة', 'Page')} </span>
                    <span className="font-black text-[#142B5F]">{data.page}</span>
                    <span> {tr('من أصل', 'of')} </span>
                    <span className="font-black text-[#142B5F]">{data.totalPages}</span>
                    <span className="text-slate-400 font-normal"> ({formatNumber(data.total)} {tr('إجمالي السجلات', 'total records')})</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      disabled={data.page === 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      {tr('السابق', 'Previous')}
                    </button>
                    <button
                      disabled={data.page === data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40"
                    >
                      {tr('التالي', 'Next')}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function UniversityCard({university:uni,ar}:{university:University;ar:boolean}) {
  const tr=(arabic:string,english:string)=>ar?arabic:english;
  return <article className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm transition hover:border-[#0E7C86] hover:shadow-md">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 items-center gap-3"><span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#142B5F] to-[#0E7C86] text-[#F2CD78]"><School className="h-7 w-7" aria-hidden="true" /></span><div className="min-w-0"><AdminLink to={'/universities/'+uni.id} className="break-words text-lg font-black text-[#142B5F]">{uni.displayName}</AdminLink><p className="mt-1 text-xs text-slate-500">{[uni.city,uni.country].filter(Boolean).join('، ')||tr('الموقع غير محدد','Location unspecified')}</p></div></div>
      <span className="rounded-xl bg-teal-50 px-3 py-2 text-xs font-bold text-[#0E7C86]">{formatStatusLabel(uni.status,ar)}</span>
    </div>
    <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <span className="flex items-center gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/50 px-3 py-3 text-xs"><MapPin className="h-4 w-4 shrink-0 text-[#0E7C86]" aria-hidden="true" />{uni.country||tr('الدولة غير محددة','Country unspecified')}</span>
      <span className="flex items-center gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/50 px-3 py-3 text-xs"><Calendar className="h-4 w-4 shrink-0 text-[#D6A43B]" aria-hidden="true" />{uni.foundedYear?tr('تأسست عام ','Founded ')+uni.foundedYear:tr('سنة التأسيس غير محددة','Foundation year unspecified')}</span>
      <span className="flex items-center gap-2 rounded-xl border border-[#DDEFF2] bg-[#FAF7F0]/50 px-3 py-3 text-xs"><CheckCircle2 className="h-4 w-4 shrink-0 text-[#142B5F]" aria-hidden="true" />{formatCompletenessLabel(uni.completenessStatus,ar)}</span>
      <AdminLink to={'/universities/'+uni.id} className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 py-3 text-xs font-black text-[#F2CD78]">{tr('عرض التفاصيل','View details')}<ArrowLeft className="h-4 w-4" aria-hidden="true" /></AdminLink>
    </div>
  </article>;
}

function formatStatusLabel(status: string, isArabic: boolean): string {
  if (!isArabic) return status.replace(/_/g, ' ');
  switch (status) {
    case 'PUBLISHED':
      return 'منشورة للطلاب';
    case 'READY_TO_PUBLISH':
      return 'جاهزة للنشر';
    case 'READY_TO_REVIEW':
      return 'بانتظار المراجعة';
    case 'IMPORTED':
      return 'مستوردة';
    case 'REJECTED':
      return 'مرفوضة';
    case 'ARCHIVED':
      return 'مؤرشفة';
    default:
      return status;
  }
}

function formatCompletenessLabel(status: string, isArabic: boolean): string {
  if (!isArabic) return status.replace(/_/g, ' ');
  switch (status) {
    case 'COMPLETE':
      return 'الحقول المطلوبة مكتملة';
    case 'NEEDS_REVIEW':
      return 'تحتاج مراجعة وتدقيق';
    case 'INCOMPLETE':
      return 'بيانات ناقصة';
    default:
      return status;
  }
}
