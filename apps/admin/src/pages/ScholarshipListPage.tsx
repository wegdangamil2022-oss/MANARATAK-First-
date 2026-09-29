import { useEffect, useState, useMemo } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { 
  GraduationCap, 
  Filter, 
  Loader2, 
  ArrowRight, 
  ArrowLeft,
  CheckCircle2, 
  Sparkles, 
  SearchCheck, 
  AlertTriangle, 
  RefreshCw, 
  Database, 
  Search,
  ExternalLink,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';

interface Scholarship {
  id: string;
  displayName: string;
  status: string;
  completenessStatus: string;
  sponsorName?: string;
  studyCountry?: string;
  applicationDeadline?: string;
  sourceImportRecordId?: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: Scholarship[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface ScholarshipSummary {
  all: number;
  imported: number;
  missingFields: number;
  needsVerification: number;
  needsTranslation: number;
  readyToPublish: number;
  published: number;
  archived: number;
}

export function ScholarshipListPage() {
  const { language, dir, t } = useTranslation();
  const navigate = useNavigate();
  const isArabic = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const tr = (ar: string, en: string) => (isArabic ? ar : en);

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [summary, setSummary] = useState<ScholarshipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('');
  const [page, setPage] = useState(1);

  const numberFormatter = useMemo(() => new Intl.NumberFormat(isArabic ? 'ar' : 'en-US'), [isArabic]);
  const formatNumber = (value: number | null | undefined) => (value == null ? '—' : numberFormatter.format(value));

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await adminApiClient.request<ScholarshipSummary>('/admin/scholarships/summary');
      setSummary(res);
    } catch {
      // Fallback if summary endpoint has transient issue
    } finally {
      setSummaryLoading(false);
    }
  };

  const fetchScholarships = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (completenessFilter) params.append('completenessStatus', completenessFilter);
      
      const res = await adminApiClient.request<PaginatedResponse>(`/admin/scholarships?${params.toString()}`);
      setData(res);
    } catch (err: any) {
      setError(err.message || tr('تعذر تحميل بيانات المنح الدراسية.', 'Unable to load scholarships.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchScholarships();
  }, [page, statusFilter, completenessFilter]);

  const handleRefresh = () => {
    fetchSummary();
    fetchScholarships();
  };

  const handleStatusCardClick = (status: string) => {
    if (statusFilter === status) {
      setStatusFilter('');
    } else {
      setStatusFilter(status);
    }
    setPage(1);
  };

  const filteredItems = useMemo(() => {
    if (!data?.data) return [];
    if (!searchTerm.trim()) return data.data;
    const term = searchTerm.toLowerCase().trim();
    return data.data.filter(item => 
      item.displayName?.toLowerCase().includes(term) ||
      item.sponsorName?.toLowerCase().includes(term) ||
      item.studyCountry?.toLowerCase().includes(term)
    );
  }, [data?.data, searchTerm]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-['Cairo',sans-serif] text-[#203442]">
      {/* Hero Header Banner */}
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-xl sm:p-8">
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-md">
              <GraduationCap className="h-4 w-4" />
              <span>{tr('كتالوج المنح الدراسية المعتمدة', 'Scholarship Catalog & Management')}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-white">
              {tr('إدارة كتالوج المنح الدراسية', 'Scholarship Catalog Management')}
            </h1>
            <p className="max-w-2xl text-xs font-medium leading-relaxed text-[#DDEFF2] sm:text-sm">
              {tr(
                'متابعة المنح الدراسية المعتمدة، مؤشرات النشر الفورية، حالة الاكتمال والتحقق، وتدقيق المسارات الأكاديمية.',
                'Manage accredited scholarships, real-time publishing metrics, completeness status, and academic verification pipelines.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading || summaryLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50"
              title={tr('تحديث البيانات', 'Refresh Data')}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>{tr('تحديث البيانات', 'Refresh')}</span>
            </button>

            <button
              onClick={() => navigate('/admin/imports?dataType=SCHOLARSHIPS')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-cyan-300/30 bg-white/15 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/25 active:scale-95"
            >
              <Database className="h-4 w-4 text-[#F2CD78]" />
              <span>{tr('مركز استيراد المنح', 'Import Center')}</span>
            </button>

            <Link
              to="/admin/review-queue"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-gradient-to-r from-[#21A7B4] to-[#0E7C86] px-5 text-xs font-black text-white shadow-md transition-all hover:brightness-110 active:scale-95"
            >
              <span>{tr('قائمة المراجعة', 'Review Queue')}</span>
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Live Summary Metric Counters Row */}
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" aria-label="Scholarship Metric Counters">
        {/* Total Scholarships */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === '' ? 'border-[#142B5F] bg-blue-50/40 ring-2 ring-[#142B5F]/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#142B5F]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('إجمالي المنح', 'Total Scholarships')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#142B5F] border border-blue-100">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-[#142B5F]">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.all ?? data?.total)}
          </div>
          <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-slate-400">
            <span>{statusFilter === '' ? tr('● محدد حالياً (الكل)', '● Selected (All)') : tr('عرض جميع المنح', 'View all')}</span>
          </div>
        </button>

        {/* Published Scholarships */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('PUBLISHED')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'PUBLISHED' ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('المنح المنشورة', 'Published')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-emerald-700">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.published)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-emerald-600/80">
            <span>{statusFilter === 'PUBLISHED' ? tr('● مفلترة بالمنشورة', '● Filtered') : tr('تصفية المنشورة للطلاب', 'Filter published')}</span>
          </div>
        </button>

        {/* Ready to Publish */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('READY_TO_PUBLISH')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'READY_TO_PUBLISH' ? 'border-[#0E7C86] bg-teal-50/40 ring-2 ring-[#0E7C86]/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#0E7C86]" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('جاهزة للنشر', 'Ready to Publish')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0E7C86] border border-teal-100">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-[#0E7C86]">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.readyToPublish)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-[#0E7C86]/80">
            <span>{tr('معتمدة وجاهزة للإطلاق', 'Approved & Ready')}</span>
          </div>
        </button>

        {/* Ready to Review / Needs Verification */}
        <button
          type="button"
          onClick={() => handleStatusCardClick('READY_TO_REVIEW')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            statusFilter === 'READY_TO_REVIEW' ? 'border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('قيد المراجعة', 'In Review')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <SearchCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-amber-700">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.needsVerification ?? summary?.imported)}
          </div>
          <div className="mt-1 text-[10px] font-bold text-amber-600/80">
            <span>{tr('بانتظار تدقيق البيانات', 'Awaiting Verification')}</span>
          </div>
        </button>

        {/* Missing Fields / Needs Translation */}
        <button
          type="button"
          onClick={() => setCompletenessFilter(prev => prev === 'INCOMPLETE' ? '' : 'INCOMPLETE')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md ${
            completenessFilter === 'INCOMPLETE' ? 'border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20' : 'border-slate-200/90 bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black text-slate-500">{tr('حقول ناقصة أو ترجمة', 'Missing / Translation')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-3 text-2xl font-black text-rose-700">
            {summaryLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            ) : (
              formatNumber((summary?.missingFields ?? 0) + (summary?.needsTranslation ?? 0))
            )}
          </div>
          <div className="mt-1 text-[10px] font-bold text-rose-600/80">
            <span>{tr('تحتاج استكمال وتدقيق', 'Requires completion')}</span>
          </div>
        </button>
      </section>

      {/* Promotion Lifecycle Banner */}
      <div className="rounded-2xl border border-[#21A7B4]/20 bg-[#FAF7F0] p-4 text-xs shadow-xs">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2.5 text-[#142B5F]">
            <Info className="h-4 w-4 shrink-0 text-[#0E7C86]" />
            <span className="font-black">{tr('مسار ترقية المنح:', 'Scholarship Promotion Flow:')}</span>
            <span className="text-slate-600 font-medium">
              {tr(
                'استيراد أولي ⟵ ترحيل لسجل الكتالوج ⟵ مراجعة وتدقيق واكتمال ⟵ اعتماد ونشر (المنح المنشورة فقط هي ما يظهر للطلاب).',
                'Import ⟵ Transfer to Catalog ⟵ Review & Complete ⟵ Publish (Only Published items appear to students).'
              )}
            </span>
          </div>
          <Link
            to="/admin/imports?dataType=SCHOLARSHIPS"
            className="inline-flex items-center gap-1 font-bold text-[#0E7C86] hover:underline shrink-0"
          >
            <span>{tr('استعراض السجلات المستوردة', 'View imported records')}</span>
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute right-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tr('البحث بالاسم، الجهة المانحة، أو بلد الدراسة...', 'Search by name, sponsor, or country...')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pr-10 pl-4 text-xs font-semibold text-slate-800 placeholder-slate-400 outline-none transition focus:border-[#0E7C86] focus:bg-white focus:ring-2 focus:ring-[#0E7C86]/20"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute left-3.5 top-2.5 rounded-full bg-slate-200 p-1 text-[10px] text-slate-600 hover:bg-slate-300"
              >
                ✕
              </button>
            )}
          </div>

          {/* Select Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[150px]">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pr-4 pl-9 text-xs font-bold text-[#142B5F] outline-none transition focus:border-[#0E7C86] focus:bg-white"
              >
                <option value="">{tr('جميع الحالات', 'All Statuses')}</option>
                <option value="IMPORTED">{tr('مستوردة (IMPORTED)', 'Imported')}</option>
                <option value="READY_TO_REVIEW">{tr('بانتظار المراجعة (READY_TO_REVIEW)', 'Ready to Review')}</option>
                <option value="READY_TO_PUBLISH">{tr('جاهزة للنشر (READY_TO_PUBLISH)', 'Ready to Publish')}</option>
                <option value="PUBLISHED">{tr('منشورة (PUBLISHED)', 'Published')}</option>
                <option value="REJECTED">{tr('مرفوضة (REJECTED)', 'Rejected')}</option>
                <option value="ARCHIVED">{tr('مؤرشفة (ARCHIVED)', 'Archived')}</option>
              </select>
              <Filter className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            </div>

            <div className="relative min-w-[150px]">
              <select
                value={completenessFilter}
                onChange={(e) => {
                  setCompletenessFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full appearance-none rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pr-4 pl-9 text-xs font-bold text-[#142B5F] outline-none transition focus:border-[#0E7C86] focus:bg-white"
              >
                <option value="">{tr('جميع مستويات الاكتمال', 'All Completeness')}</option>
                <option value="COMPLETE">{tr('مكتملة (COMPLETE)', 'Complete')}</option>
                <option value="NEEDS_REVIEW">{tr('تحتاج مراجعة (NEEDS_REVIEW)', 'Needs Review')}</option>
                <option value="INCOMPLETE">{tr('غير مكتملة (INCOMPLETE)', 'Incomplete')}</option>
              </select>
              <SlidersHorizontal className="pointer-events-none absolute left-3 top-3 h-3.5 w-3.5 text-slate-400" />
            </div>

            {(statusFilter || completenessFilter || searchTerm) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('');
                  setCompletenessFilter('');
                  setSearchTerm('');
                  setPage(1);
                }}
                className="rounded-2xl border border-slate-200 bg-slate-100 px-3.5 py-2.5 text-xs font-bold text-slate-600 transition hover:bg-slate-200"
              >
                {tr('إعادة ضبط', 'Reset')}
              </button>
            )}
          </div>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 shadow-xs">
          {error}
        </div>
      )}

      {/* Main Table Card */}
      {loading && !data ? (
        <div className="flex h-64 items-center justify-center rounded-3xl border border-slate-200/90 bg-white">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
            <p className="text-xs font-bold text-slate-500">{tr('جارٍ تحميل المنح الدراسية...', 'Loading scholarships...')}</p>
          </div>
        </div>
      ) : (
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#FAF7F0] text-[11px] font-black uppercase tracking-wider text-[#142B5F]">
                  <th className="px-6 py-4 text-start">{tr('المنحة والجهة المانحة', 'Scholarship & Sponsor')}</th>
                  <th className="px-6 py-4 text-start">{tr('الحالة', 'Status')}</th>
                  <th className="px-6 py-4 text-start">{tr('حالة الاكتمال', 'Completeness')}</th>
                  <th className="px-6 py-4 text-start">{tr('بلد الدراسة', 'Country')}</th>
                  <th className="px-6 py-4 text-start">{tr('آخر تحديث', 'Updated At')}</th>
                  <th className="px-6 py-4 text-end">{tr('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <GraduationCap className="h-8 w-8 text-slate-300" />
                        <span className="font-bold">{tr('لا توجد منح تطابق الفلاتر المحددة.', 'No scholarships found matching your filters.')}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => (
                    <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                      <td className="px-6 py-4">
                        <div className="font-black text-[#142B5F] text-sm">{item.displayName}</div>
                        <div className="mt-1 truncate max-w-xs text-xs font-bold text-slate-500">
                          {item.sponsorName || tr('جهة مانحة غير محددة', 'Unspecified Sponsor')}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-black ${
                            item.status === 'PUBLISHED'
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : item.status === 'READY_TO_PUBLISH'
                              ? 'bg-teal-50 border border-teal-200 text-[#0E7C86]'
                              : item.status === 'READY_TO_REVIEW'
                              ? 'bg-amber-50 border border-amber-200 text-amber-700'
                              : item.status === 'REJECTED'
                              ? 'bg-rose-50 border border-rose-200 text-rose-700'
                              : 'bg-slate-100 border border-slate-200 text-slate-700'
                          }`}
                        >
                          {formatStatusLabel(item.status, isArabic)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center rounded-xl px-2.5 py-1 text-[11px] font-black ${
                            item.completenessStatus === 'COMPLETE'
                              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                              : item.completenessStatus === 'NEEDS_REVIEW'
                              ? 'bg-amber-50 border border-amber-200 text-amber-700'
                              : 'bg-rose-50 border border-rose-200 text-rose-700'
                          }`}
                        >
                          {formatCompletenessLabel(item.completenessStatus, isArabic)}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-bold text-slate-600">
                        {item.studyCountry || '—'}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px] text-slate-500">
                        {new Date(item.updatedAt).toLocaleDateString(isArabic ? 'ar' : 'en-US')}
                      </td>
                      <td className="px-6 py-4 text-end">
                        <button
                          onClick={() => navigate(`/admin/scholarships/${item.id}`)}
                          className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-black text-[#0E7C86] transition-all hover:bg-[#0E7C86] hover:text-white"
                        >
                          <span>{tr('مراجعة وتعديل', 'Review')}</span>
                          <ArrowIcon className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {data && data.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-200/90 bg-[#FAF7F0] px-6 py-3.5 text-xs font-bold text-slate-600">
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
    </div>
  );
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
      return 'بيانات مكتملة 100%';
    case 'NEEDS_REVIEW':
      return 'تحتاج مراجعة وتدقيق';
    case 'INCOMPLETE':
      return 'بيانات ناقصة';
    default:
      return status;
  }
}
