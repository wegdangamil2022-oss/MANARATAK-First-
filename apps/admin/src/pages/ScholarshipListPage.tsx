import {
AlertTriangle,
ArrowLeft,
ArrowRight,
BookOpen,
Building2,
Calendar,
CheckCircle2,
ChevronLeft,
Clock,
Coins,
Database,
Eye,
Globe2,
GraduationCap,
LayoutGrid,
Loader2,
Network,
RefreshCw,
RotateCcw,
Search,
SearchCheck,
Sparkles,
Table as TableIcon
} from 'lucide-react';
import { useEffect,useMemo,useRef,useState } from 'react';
import { Link,useNavigate } from 'react-router-dom';
import { canonicalPickerApi, type CanonicalPickerOption } from '../api/canonicalPickers';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

interface Scholarship {
  id: string;
  publicId?: string;
  slug?: string;
  displayName: string;
  canonicalName?: string;
  localizedNames?: Record<string, string>;
  status: string;
  completenessStatus: string;
  sponsorName?: string;
  providerName?: string;
  studyCountry?: string;
  countrySourceLabel?: string;
  applicationDeadline?: string;
  isFullyFunded?: boolean;
  fundingTypeCode?: string;
  studyLanguage?: string;
  degreeTargets?: Array<{ degreeLevelName?: string; sourceLabel?: string; degreeLevelId?: string }>;
  majorTargets?: Array<{ majorName?: string; sourceLabel?: string; majorId?: string }>;
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

function getCountryEmojiFlag(countryName?: string): string {
  if (!countryName) return '🌐';
  const c = countryName.toLowerCase();
  if (c.includes('تركيا') || c.includes('turkey') || c.includes('turk')) return '🇹🇷';
  if (c.includes('بريطانيا') || c.includes('المملكة المتحدة') || c.includes('uk') || c.includes('britain')) return '🇬🇧';
  if (c.includes('ألمانيا') || c.includes('المانيا') || c.includes('germany')) return '🇩🇪';
  if (c.includes('السعودية') || c.includes('saudi') || c.includes('ksa')) return '🇸🇦';
  if (c.includes('أمريكا') || c.includes('الولايات المتحدة') || c.includes('usa') || c.includes('us')) return '🇺🇸';
  if (c.includes('كندا') || c.includes('canada')) return '🇨🇦';
  if (c.includes('فرنسا') || c.includes('france')) return '🇫🇷';
  if (c.includes('اليابان') || c.includes('japan')) return '🇯🇵';
  if (c.includes('أستراليا') || c.includes('australia')) return '🇦🇺';
  if (c.includes('ماليزيا') || c.includes('malaysia')) return '🇲🇾';
  if (c.includes('قطر') || c.includes('qatar')) return '🇶🇦';
  if (c.includes('الإمارات') || c.includes('emirates') || c.includes('uae')) return '🇦🇪';
  if (c.includes('الصين') || c.includes('china')) return '🇨🇳';
  return '🌐';
}

export function ScholarshipListPage() {
  const { language, dir } = useTranslation();
  const navigate = useNavigate();
  const isArabic = language === 'ar';
  const ArrowIcon = dir === 'rtl' ? ArrowLeft : ArrowRight;
  const tr = (ar: string, en: string) => (isArabic ? ar : en);

  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [summary, setSummary] = useState<ScholarshipSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [summaryLoading, setSummaryLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('');
  const [countryOptions, setCountryOptions] = useState<CanonicalPickerOption[]>([]);
  const [countryFilter, setCountryFilter] = useState('');
  const [fundingFilter, setFundingFilter] = useState('');
  const [degreeFilter, setDegreeFilter] = useState('');
  const [majorFilter, setMajorFilter] = useState('');
  const [languageFilter, setLanguageFilter] = useState('');
  const [deadlineFilter, setDeadlineFilter] = useState('');
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const numberFormatter = useMemo(() => new Intl.NumberFormat(isArabic ? 'ar' : 'en-US'), [isArabic]);
  const formatNumber = (value: number | null | undefined) => (value == null ? '—' : numberFormatter.format(value));

  const fetchSummary = async () => {
    setSummaryLoading(true);
    try {
      const res = await adminApiClient.request<ScholarshipSummary>('/admin/scholarships/summary');
      setSummary(res);
    } catch {
      setSummary({
        all: 0,
        published: 0,
        readyToPublish: 0,
        needsVerification: 0,
        imported: 0,
        missingFields: 0,
        needsTranslation: 0,
        archived: 0,
      });
    } finally {
      setSummaryLoading(false);
    }
  };

  const listRequest = useRef(0);
  const fetchScholarships = async () => {
    const request = ++listRequest.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '24' });
      if (statusFilter) params.append('status', statusFilter);
      if (completenessFilter) params.append('completenessStatus', completenessFilter);
      if (searchTerm.trim()) params.append('query', searchTerm.trim());
      const selectedCountry = countryOptions.find(item => item.id === countryFilter);
      if (selectedCountry) params.set('countryReferenceId', selectedCountry.id);
      for (const [key, value] of Object.entries({ fundingType: fundingFilter, degreeLabel: degreeFilter, majorLabel: majorFilter, languageLabel: languageFilter, deadlineStatus: deadlineFilter })) if (value) params.set(key, value);

      const res = await adminApiClient.request<PaginatedResponse>(`/admin/scholarships?${params.toString()}`);
      if (request !== listRequest.current) return;
      if (res.total > 0 && page > res.totalPages) { setPage(Math.max(1, res.totalPages)); return; }
      setData(res ?? { data: [], total: 0, page: 1, pageSize: 24, totalPages: 0 });
    } catch (err) {
      if (request !== listRequest.current) return;
      setError(err instanceof Error ? err.message : 'تعذر تحميل المنح الدراسية.');
    } finally {
      if (request === listRequest.current) setLoading(false);
    }
  };

  useEffect(() => {
    fetchSummary();
    let active = true;
    void canonicalPickerApi.countries().then(options => { if (active) setCountryOptions(options); }).catch(() => undefined);
    return () => { active = false; };
  }, []);

  useEffect(() => {
    fetchScholarships();
    return () => { listRequest.current += 1; };
  }, [page, statusFilter, completenessFilter, searchTerm, countryFilter, fundingFilter, degreeFilter, majorFilter, languageFilter, deadlineFilter]);

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

  // Filtering happens before pagination in the owner API.
  const filteredItems = data?.data ?? [];

  const hasActiveFilters = Boolean(
    searchTerm || statusFilter || completenessFilter || countryFilter || fundingFilter || degreeFilter || majorFilter || languageFilter || deadlineFilter
  );

  const handleResetFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setCompletenessFilter('');
    setCountryFilter('');
    setFundingFilter('');
    setDegreeFilter('');
    setMajorFilter('');
    setLanguageFilter('');
    setDeadlineFilter('');
    setPage(1);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6 font-['Cairo',sans-serif] text-[#203442]">
      {/* Hero Header Banner with Manaratak Gradient */}
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-56 w-56 rounded-full bg-[#F2CD78] opacity-20 pointer-events-none blur-2xl" />
        <div className="absolute -bottom-20 start-0 h-56 w-56 rounded-full bg-cyan-300 opacity-15 pointer-events-none blur-2xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-md">
              <GraduationCap className="h-4 w-4" />
              <span>{tr('الكتالوج الأكاديمي · إدارة المنح الدراسية المعتمدة', 'Scholarship Catalog & Management')}</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight sm:text-3xl lg:text-4xl text-white">
              {tr('إدارة كتالوج المنح الدراسية', 'Scholarship Catalog Management')}
            </h1>
            <p className="max-w-2xl text-xs font-medium leading-relaxed text-[#DDEFF2] sm:text-sm">
              {tr(
                'استعراض المنح الدراسية الدولية المعتمدة، فلترة الفرص المتاحة حسب الدولة والتخصص ونوع التمويل ولغة الدراسة، وإدارة معايير الأهلية والمستندات والتفاصيل الكاملة.',
                'Manage accredited international scholarships, filter opportunities by country, major, funding type, and language, and manage eligibility and application details.'
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              onClick={handleRefresh}
              disabled={loading || summaryLoading}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 disabled:opacity-50 cursor-pointer"
              title={tr('تحديث البيانات', 'Refresh Data')}
            >
              <RefreshCw className={`h-4 w-4 text-[#F2CD78] ${loading ? 'animate-spin' : ''}`} />
              <span>{tr('تحديث البيانات', 'Refresh')}</span>
            </button>

            <button
              onClick={() => navigate('/admin/imports?dataType=SCHOLARSHIPS')}
              className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white backdrop-blur-md transition-all hover:bg-white/20 active:scale-95 cursor-pointer"
            >
              <Database className="h-4 w-4 text-cyan-200" />
              <span>{tr('مركز الاستيراد', 'Import Center')}</span>
            </button>

            <Link
              to="/admin/review-queue"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#21A7B4] hover:bg-[#1A8D99] px-4 text-xs font-bold text-white shadow-md transition-all active:scale-95"
            >
              <span>{tr('قائمة المراجعة', 'Review Queue')}</span>
              <ArrowIcon className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Metric Counters Row */}
      <section className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-5" aria-label="Scholarship Metric Counters">
        <button
          type="button"
          onClick={() => handleStatusCardClick('')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            statusFilter === '' ? 'border-[#142B5F] bg-blue-50/50 ring-2 ring-[#142B5F]/20' : 'border-[#DDEFF2] bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#142B5F]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{tr('إجمالي المنح', 'Total Scholarships')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-50 text-[#142B5F] border border-blue-100">
              <GraduationCap className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-[#142B5F]">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.all ?? data?.total)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-slate-400">
            <span>{statusFilter === '' ? tr('● محدد حالياً (الكل)', '● Selected') : tr('عرض جميع المنح', 'View all')}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleStatusCardClick('PUBLISHED')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            statusFilter === 'PUBLISHED' ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-600/20' : 'border-[#DDEFF2] bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-emerald-600" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{tr('المنح المنشورة', 'Published')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
              <CheckCircle2 className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-emerald-700">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.published)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-emerald-600">
            <span>{statusFilter === 'PUBLISHED' ? tr('● مفلترة بالمنشورة', '● Filtered') : tr('تصفية المنشورة للطلاب', 'Filter published')}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleStatusCardClick('READY_TO_PUBLISH')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            statusFilter === 'READY_TO_PUBLISH' ? 'border-[#0E7C86] bg-teal-50/50 ring-2 ring-[#0E7C86]/20' : 'border-[#DDEFF2] bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-[#0E7C86]" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{tr('جاهزة للنشر', 'Ready to Publish')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-teal-50 text-[#0E7C86] border border-teal-100">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-[#0E7C86]">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.readyToPublish)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-[#0E7C86]">
            <span>{tr('معتمدة وجاهزة للإطلاق', 'Approved & Ready')}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => handleStatusCardClick('READY_TO_REVIEW')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            statusFilter === 'READY_TO_REVIEW' ? 'border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20' : 'border-[#DDEFF2] bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-amber-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{tr('قيد المراجعة', 'In Review')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
              <SearchCheck className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-amber-700">
            {summaryLoading ? <Loader2 className="h-6 w-6 animate-spin text-slate-300" /> : formatNumber(summary?.needsVerification ?? summary?.imported)}
          </div>
          <div className="mt-1 text-[11px] font-bold text-amber-600">
            <span>{tr('بانتظار تدقيق البيانات', 'Awaiting Verification')}</span>
          </div>
        </button>

        <button
          type="button"
          onClick={() => setCompletenessFilter(prev => prev === 'INCOMPLETE' ? '' : 'INCOMPLETE')}
          className={`group relative overflow-hidden rounded-2xl border p-4 text-start shadow-xs transition-all hover:-translate-y-0.5 hover:shadow-md cursor-pointer ${
            completenessFilter === 'INCOMPLETE' ? 'border-rose-500 bg-rose-50/50 ring-2 ring-rose-500/20' : 'border-[#DDEFF2] bg-white'
          }`}
        >
          <div className="absolute inset-x-0 top-0 h-1 bg-rose-500" />
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500">{tr('حقول ناقصة أو غير مكتملة', 'Incomplete Data')}</span>
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2.5 text-2xl font-black text-rose-700">
            {summaryLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-slate-300" />
            ) : (
              formatNumber((summary?.missingFields ?? 0) + (summary?.needsTranslation ?? 0))
            )}
          </div>
          <div className="mt-1 text-[11px] font-bold text-rose-600">
            <span>{tr('تحتاج استكمال وتدقيق', 'Requires completion')}</span>
          </div>
        </button>
      </section>

      {/* Multi-Dimensional Filter & Search Card */}
      <section className="rounded-3xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#0E7C86]" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setPage(1); }}
                placeholder={tr('البحث بالاسم، الجهة المانحة، بلد الدراسة، أو الرمز...', 'Search by name, sponsor, country, or code...')}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-[#FAF7F0]/50 pr-10 pl-10 text-xs sm:text-sm font-medium text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#0E7C86] focus:bg-white focus:ring-2 focus:ring-[#0E7C86]/15 font-['Cairo']"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => { setSearchTerm(''); setPage(1); }}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                  title="مسح البحث"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex items-center rounded-2xl border border-slate-200 bg-slate-50 p-1">
                <button
                  type="button"
                  onClick={() => setViewMode('cards')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    viewMode === 'cards' ? 'bg-[#142B5F] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="عرض البطاقات"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>بطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('table')}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                    viewMode === 'table' ? 'bg-[#142B5F] text-white shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                  title="عرض الجدول"
                >
                  <TableIcon className="w-3.5 h-3.5" />
                  <span>جدول</span>
                </button>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="inline-flex h-11 items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50 hover:bg-slate-100 px-4 text-xs font-bold text-slate-700 transition cursor-pointer shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-500" />
                  <span>إعادة ضبط</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3 pt-1">
            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                <Globe2 className="inline w-3 h-3 ml-1 text-[#0E7C86]" />
                الدولة / الوجهة
              </label>
              <select
                value={countryFilter}
                onChange={(e) => { setCountryFilter(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 cursor-pointer font-['Cairo']"
              >
                <option value="">جميع الدول والوجهات</option>
                {countryOptions.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                <Coins className="inline w-3 h-3 ml-1 text-emerald-600" />
                نوع التمويل والتغطية
              </label>
              <select
                value={fundingFilter}
                onChange={(e) => { setFundingFilter(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 cursor-pointer font-['Cairo']"
              >
                <option value="">كل أنواع التمويل</option>
                <option value="FULL">💎 تمويل كامل 100% (Fully Funded)</option>
                <option value="PARTIAL">تمويل جزئي (Partially Funded)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                <BookOpen className="inline w-3 h-3 ml-1 text-[#21A7B4]" />
                التخصص / المجال
              </label>
              <select
                value={majorFilter}
                onChange={(e) => { setMajorFilter(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 cursor-pointer font-['Cairo']"
              >
                <option value="">جميع التخصصات</option>
                <option value="الهندسة">الهندسة والذكاء الاصطناعي</option>
                <option value="الحاسب">علوم الحاسب والبرمجة</option>
                <option value="الطب">الطب والعلوم الصحية</option>
                <option value="الأعمال">إدارة الأعمال والاقتصاد</option>
                <option value="السياسات">العلوم السياسية والقانون</option>
                <option value="البيئة">العلوم الطبيعية والبيئة</option>
                <option value="الإنسانية">العلوم الإنسانية والاجتماعية</option>
                <option value="الفنون">الفنون والتصميم</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                <GraduationCap className="inline w-3 h-3 ml-1 text-[#142B5F]" />
                الدرجة العلمية
              </label>
              <select
                value={degreeFilter}
                onChange={(e) => { setDegreeFilter(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 cursor-pointer font-['Cairo']"
              >
                <option value="">جميع الدرجات العلمية</option>
                <option value="بكالوريوس">بكالوريوس (Undergraduate)</option>
                <option value="ماجستير">ماجستير (Master's)</option>
                <option value="دكتوراه">دكتوراه (PhD / Doctorate)</option>
                <option value="زمالة">أبحاث وزمالة (Fellowship)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                لغة الدراسة
              </label>
              <select
                value={languageFilter}
                onChange={(e) => { setLanguageFilter(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 cursor-pointer font-['Cairo']"
              >
                <option value="">جميع لغات الدراسة</option>
                <option value="الإنجليزية">الإنجليزية (English)</option>
                <option value="العربية">العربية (Arabic)</option>
                <option value="التركية">التركية (Turkish)</option>
                <option value="الألمانية">الألمانية (German)</option>
                <option value="الفرنسية">الفرنسية (French)</option>
              </select>
            </div>

            <div>
              <label className="mb-1 block text-[11px] font-bold text-slate-500">
                <Clock className="inline w-3 h-3 ml-1 text-amber-500" />
                الموعد النهائي
              </label>
              <select
                value={deadlineFilter}
                onChange={(e) => { setDeadlineFilter(e.target.value); setPage(1); }}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none transition focus:border-[#0E7C86] focus:ring-2 focus:ring-[#0E7C86]/15 cursor-pointer font-['Cairo']"
              >
                <option value="">كل المواعيد</option>
                <option value="OPEN">مفتوحة للتقديم حالياً</option>
                <option value="CLOSING_SOON">تنتهي قريباً (خلال 45 يوماً)</option>
                <option value="OPEN_ALL_YEAR">مفتوحة طوال العام</option>
                <option value="CLOSED">منتهية التقديم</option>
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs text-slate-500">
            <span>
              عرض <strong className="text-[#142B5F] font-bold">{filteredItems.length}</strong> من أصل <strong className="text-[#142B5F] font-bold">{data?.total ?? 0}</strong> منحة معتمدة
            </span>
            {hasActiveFilters && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-teal-50 border border-teal-200 px-3 py-0.5 text-[11px] text-[#0E7C86] font-bold">
                ● فلاتر مخصصة مفعلة ({filteredItems.length} مطابقة)
              </span>
            )}
          </div>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs font-bold text-rose-700 shadow-xs flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 shrink-0 text-rose-600" />
          <span>{error}</span>
        </div>
      )}

      {/* Scholarships Content: Stretched Public-Style Cards Stack or Table */}
      {loading && !data ? (
        <div className="flex h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-[#DDEFF2] bg-white p-8">
          <Loader2 className="h-9 w-9 animate-spin text-[#0E7C86]" />
          <p className="text-xs font-bold text-slate-500">{tr('جارٍ تحميل المنح الدراسية...', 'Loading scholarships...')}</p>
        </div>
      ) : filteredItems.length === 0 ? (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-3xl border border-[#DDEFF2] bg-white p-8 text-center shadow-xs">
          <div className="h-14 w-14 rounded-2xl bg-slate-100 grid place-items-center text-slate-400">
            <GraduationCap className="h-7 w-7" />
          </div>
          <h3 className="text-sm font-bold text-slate-700">
            {tr('لا توجد منح تطابق الفلاتر المحددة.', 'No scholarships found matching your filters.')}
          </h3>
          <p className="text-xs text-slate-500 max-w-sm">
            يمكنك إعادة ضبط الفلاتر أو التوجه لمركز الاستيراد لتحميل وإضافة منح دراسية جديدة.
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
            <button
              onClick={() => navigate('/admin/imports?dataType=SCHOLARSHIPS')}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] px-4 text-xs font-bold text-white transition shadow-xs cursor-pointer"
            >
              <span>مركز الاستيراد</span>
            </button>
          </div>
        </div>
      ) : viewMode === 'cards' ? (
        /* Wide Stretched Cards (Adapted from Public Search Page for PC Admin View) */
        <div className="flex flex-col gap-3.5 w-full">
          {filteredItems.map((item) => {
            const isFull = item.isFullyFunded || item.fundingTypeCode === 'FULL' || item.fundingTypeCode === 'FULLY_FUNDED';
            const countryName = item.countrySourceLabel || item.studyCountry || 'دولي';
            const countryFlag = getCountryEmojiFlag(countryName);
            const deadlineDate = item.applicationDeadline ? new Date(item.applicationDeadline) : null;
            const now = new Date();
            const isClosed = deadlineDate ? deadlineDate < now : false;
            const daysLeft = deadlineDate && !isClosed ? Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 3600 * 24)) : null;

            const degreesText = item.degreeTargets && item.degreeTargets.length > 0
              ? item.degreeTargets.map(d => d.degreeLevelName || d.sourceLabel).slice(0, 3).join(' • ')
              : 'بكالوريوس • ماجستير • دكتوراه';

            const deadlineText = deadlineDate
              ? `ينتهي ${deadlineDate.toLocaleDateString(isArabic ? 'ar-SA' : 'en-US')}${daysLeft !== null && daysLeft <= 45 ? ` (${daysLeft} يوم)` : ''}`
              : 'مفتوحة طوال العام';

            return (
              <article
                key={item.id}
                className="bg-white rounded-2xl sm:rounded-3xl border border-[#142B5F]/20 hover:border-[#142B5F] shadow-xs hover:shadow-md transition-all duration-200 p-4 sm:p-5 relative overflow-hidden group flex flex-col gap-3.5 select-none w-full"
              >
                {/* Right Gradient Hover Accent Bar */}
                <div className="absolute top-0 right-0 w-2 h-full bg-gradient-to-b from-[#142B5F] via-[#0E7C86] to-[#21A7B4] opacity-0 group-hover:opacity-100 transition-opacity rounded-r-3xl"></div>

                {/* Top Row: Right (Circular Flag + Title + Sponsor) | Left (Status Badge & Relationship Link) */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  {/* Visual Right (RTL): Flag Badge + Titles */}
                  <div className="flex items-center gap-3.5 text-right min-w-0 flex-1">
                    {/* Circular Flag Badge with Gradient Ring */}
                    <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 bg-gradient-to-tr from-[#142B5F] via-[#0E7C86] to-[#F2CD78] shadow-xs shrink-0 flex items-center justify-center">
                      <div className="w-full h-full rounded-full overflow-hidden bg-white border border-white flex items-center justify-center text-2xl sm:text-3xl shadow-inner">
                        <span role="img" aria-label={countryName}>{countryFlag}</span>
                      </div>
                    </div>

                    <div className="flex flex-col items-start text-right min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Link
                          to={`/admin/scholarships/${item.id}`}
                          className="text-base sm:text-lg font-black text-[#142B5F] group-hover:text-[#0E7C86] font-['Cairo',sans-serif] leading-snug transition-colors line-clamp-1"
                        >
                          {item.localizedNames?.ar || item.displayName}
                        </Link>
                      </div>

                      <p dir="ltr" className="text-xs text-slate-500 text-right">{item.localizedNames?.en || item.canonicalName}</p>
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-500 font-['Cairo',sans-serif] truncate w-full mt-1">
                        <Building2 className="w-3.5 h-3.5 text-[#0E7C86] shrink-0" />
                        <span className="truncate">{item.providerName || item.sponsorName || item.canonicalName || 'جهة مانحة معتمدة'}</span>
                        <span className="text-slate-300">•</span>
                        <span className="font-bold text-[#142B5F]">{countryName}</span>
                      </div>
                    </div>
                  </div>

                  {/* Visual Left (RTL): Status Badge + Relationship Link Button */}
                  <div className="flex items-center gap-2.5 shrink-0 self-end sm:self-center">
                    <span
                      className={`inline-flex items-center rounded-xl px-3 py-1 text-xs font-black ${
                        item.status === 'PUBLISHED'
                          ? 'bg-emerald-50 border border-emerald-200 text-emerald-700'
                          : item.status === 'READY_TO_PUBLISH'
                          ? 'bg-teal-50 border border-teal-200 text-[#0E7C86]'
                          : item.status === 'READY_TO_REVIEW'
                          ? 'bg-amber-50 border border-amber-200 text-amber-700'
                          : 'bg-slate-100 border border-slate-200 text-slate-700'
                      }`}
                    >
                      {formatStatusLabel(item.status, isArabic)}
                    </span>

                    <Link
                      to={`/admin/scholarships/${item.id}/relationships`}
                      className="p-2 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-700 transition cursor-pointer"
                      title="الروابط والجامعات الشريكة"
                    >
                      <Network className="w-4 h-4 text-[#0E7C86]" />
                    </Link>
                  </div>
                </div>

                {/* Bottom Row / Badges Extended Row (Elongated Horizontal Layout on PC) */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 pt-1">
                  {/* 1. التمويل */}
                  <div className="bg-[#FAF7F0] border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 font-['Cairo']">
                    <Coins className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                    <span className="truncate">{isFull ? 'تمويل كامل 💎' : 'تمويل جزئي'}</span>
                  </div>

                  {/* 2. الدرجة العلمية */}
                  <div className="bg-[#FAF7F0] border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 font-['Cairo']">
                    <GraduationCap className="w-3.5 h-3.5 text-[#142B5F] shrink-0" />
                    <span className="truncate">{degreesText}</span>
                  </div>

                  {/* 3. الموعد النهائي */}
                  <div className="bg-[#FAF7F0] border border-slate-200/80 rounded-xl px-3.5 py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-800 font-['Cairo']">
                    <Calendar className="w-3.5 h-3.5 text-[#0E7C86] shrink-0" />
                    <span className={`truncate ${isClosed ? 'text-rose-600 font-bold' : ''}`}>{deadlineText}</span>
                  </div>

                  {/* 4. زر عرض التفاصيل (بلون المنارة مع النص الذهبي) */}
                  <Link
                    to={`/admin/scholarships/${item.id}`}
                    className="bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-xl px-4 py-2 flex items-center justify-center gap-2 transition-all active:scale-95 shadow-xs group/btn cursor-pointer"
                  >
                    <span className="text-xs font-black text-[#F2CD78]">عرض التفاصيل</span>
                    <ChevronLeft className="w-4 h-4 rotate-180 text-[#F2CD78] group-hover/btn:-translate-x-1 transition-transform" />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start text-xs">
              <thead>
                <tr className="border-b border-slate-200/90 bg-[#FAF7F0] text-[11px] font-black uppercase tracking-wider text-[#142B5F]">
                  <th className="px-6 py-4 text-start">{tr('المنحة والجهة المانحة', 'Scholarship & Sponsor')}</th>
                  <th className="px-6 py-4 text-start">{tr('الحالة', 'Status')}</th>
                  <th className="px-6 py-4 text-start">{tr('التمويل', 'Funding')}</th>
                  <th className="px-6 py-4 text-start">{tr('بلد الدراسة', 'Country')}</th>
                  <th className="px-6 py-4 text-start">{tr('الموعد النهائي', 'Deadline')}</th>
                  <th className="px-6 py-4 text-end">{tr('الإجراءات', 'Actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="transition-colors hover:bg-slate-50/70">
                    <td className="px-6 py-4">
                      <div className="font-black text-[#142B5F] text-sm">{item.localizedNames?.ar || item.displayName}</div>
                      <div className="mt-1 truncate max-w-xs text-xs font-bold text-slate-500">
                        {item.providerName || item.sponsorName || tr('جهة مانحة معتمدة', 'Accredited Sponsor')}
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
                            : 'bg-slate-100 border border-slate-200 text-slate-700'
                        }`}
                      >
                        {formatStatusLabel(item.status, isArabic)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {item.isFullyFunded || item.fundingTypeCode === 'FULL' || item.fundingTypeCode === 'FULLY_FUNDED' ? (
                        <span className="inline-flex items-center rounded-lg bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-bold">
                          تمويل كامل 💎
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-lg bg-slate-100 text-slate-700 px-2 py-0.5 text-[11px] font-bold">
                          تمويل جزئي
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 font-bold text-slate-600">
                      {item.countrySourceLabel || item.studyCountry || '—'}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 font-mono text-[11px] text-slate-500">
                      {item.applicationDeadline
                        ? new Date(item.applicationDeadline).toLocaleDateString(isArabic ? 'ar' : 'en-US')
                        : 'مفتوحة طوال العام'}
                    </td>
                    <td className="px-6 py-4 text-end">
                      <Link
                        to={`/admin/scholarships/${item.id}`}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-teal-200 bg-teal-50 px-3.5 py-1.5 text-xs font-black text-[#0E7C86] transition-all hover:bg-[#0E7C86] hover:text-white cursor-pointer"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        <span>{tr('التفاصيل', 'Details')}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

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
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
                >
                  {tr('السابق', 'Previous')}
                </button>
                <button
                  disabled={data.page === data.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-1.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:opacity-40 cursor-pointer"
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
