import { useSearchParams } from 'react-router-dom';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import type { InternationalTestStatus as CanonicalTestStatus } from '@manaratak/domain';
type InternationalTestStatus = `${CanonicalTestStatus}`;
import { AlertCircle,Archive,BookOpen,CheckCircle2,Eye,Filter,GraduationCap,Loader2,Send } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';

type InternationalTestCompletenessStatus = 'INCOMPLETE' | 'COMPLETE' | 'NEEDS_REVIEW';
type InternationalTestCategory = 'ENGLISH_LANGUAGE' | 'NON_ENGLISH_LANGUAGE' | 'GENERAL_UNDERGRADUATE_ADMISSION' | 'GRADUATE_ADMISSION' | 'NATIONAL_INTERNATIONAL_ADMISSION' | 'SPECIALIZED_ADMISSION' | 'PROFESSIONAL_LICENSING_CERTIFICATION' | 'LANGUAGE_PROFICIENCY' | 'UNDERGRAD_ADMISSION' | 'GRAD_ADMISSION' | 'PROFESSIONAL_LICENSING' | 'ACADEMIC_PLACEMENT' | 'OTHER';

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

interface InternationalTest {
  id: string;
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
  statistics?: {published:number;underReview:number;incomplete:number;scope:string};
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
  'OTHER'
];

const statuses: InternationalTestStatus[] = [
  'IMPORTED',
  'READY_TO_REVIEW',
  'NEEDS_REVIEW',
  'READY_TO_PUBLISH',
  'PUBLISHED',
  'REJECTED',
  'ARCHIVED'
];

export function InternationalTestsAdminPage() {
  const { t, language } = useTranslation();
  const isRtl = language === 'ar';

  const [urlParams,setUrlParams]=useSearchParams();
  const [countryFilter,setCountryFilter]=useState(urlParams.get('countryIso2Code')??'');
  const [providerFilter,setProviderFilter]=useState(urlParams.get('providerName')??'');
  const [completenessFilter,setCompletenessFilter]=useState(urlParams.get('completenessStatus')??'');
  const [staleOnly,setStaleOnly]=useState(urlParams.get('staleOnly')==='true');
  const [tests, setTests] = useState<InternationalTestListResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState(urlParams.get('status')??'');
  const [categoryFilter, setCategoryFilter] = useState(urlParams.get('testCategory')??'');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [archiveConfirmTest, setArchiveConfirmTest] = useState<InternationalTest | null>(null);

  const [searchQuery, setSearchQuery] = useState(urlParams.get('searchQuery')??'');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');

  const requestSequence = useRef(0);

  const loadTests = async (signal?: AbortSignal) => {
    const requestId = ++requestSequence.current;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
      if(countryFilter)params.set('countryIso2Code',countryFilter);if(providerFilter)params.set('providerName',providerFilter);if(completenessFilter)params.set('completenessStatus',completenessFilter);if(staleOnly)params.set('staleOnly','true');
      const cleanStatus = statusFilter.trim();
      if (cleanStatus && cleanStatus.toLowerCase() !== 'all') {
        params.append('status', cleanStatus);
      }
      const cleanCategory = categoryFilter.trim();
      if (cleanCategory && cleanCategory.toLowerCase() !== 'all') {
        params.append('testCategory', cleanCategory);
      }
      if (searchQuery.trim()) {
        params.append('searchQuery', searchQuery.trim());
      }
      
      const response = await adminApiClient.request<InternationalTestListResponse>(
        `/admin/international-tests?${params.toString()}`,
        { signal }
      );
      if (signal?.aborted || requestId !== requestSequence.current) return;
      if (response.total > 0 && response.data.length === 0 && page > 1) {
        setPage(Math.max(1, Math.ceil(response.total / pageSize)));
        return;
      }
      setTests(response);
    } catch (err: any) {
      if (signal?.aborted || requestId !== requestSequence.current || err?.name === 'AbortError') return;
      setError(err.message || (isRtl ? 'تعذر تحميل الاختبارات الدولية.' : 'Unable to load international tests.'));
    } finally {
      if (!signal?.aborted && requestId === requestSequence.current) setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadTests(controller.signal);
    return () => controller.abort();
  }, [statusFilter, categoryFilter, searchQuery, page, pageSize,countryFilter,providerFilter,completenessFilter,staleOnly]);
  useEffect(()=>{const params=new URLSearchParams();for(const [key,value]of Object.entries({status:statusFilter,testCategory:categoryFilter,searchQuery,countryIso2Code:countryFilter,providerName:providerFilter,completenessStatus:completenessFilter,staleOnly:staleOnly?'true':''}))if(value)params.set(key,value);setUrlParams(params,{replace:true});},[statusFilter,categoryFilter,searchQuery,countryFilter,providerFilter,completenessFilter,staleOnly,setUrlParams]);

  const transitionTest = async (id: string, action: 'mark-publishable' | 'publish' | 'unpublish' | 'archive') => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const reason=window.prompt(isRtl?'سبب الإجراء والمراجعة:':'Review reason:');if(!reason?.trim())return;
      await adminApiClient.request(`/admin/international-tests/${id}/${action}`, { method: 'POST',body:JSON.stringify({reason}) });
      setMessage(
        isRtl
          ? `تم تنفيذ الإجراء بنجاح: ${getActionLabel(action, isRtl)}`
          : `International test action completed: ${getActionLabel(action, isRtl)}`
      );
      await loadTests();
    } catch (err: any) {
      setError(err.message || (isRtl ? 'تعذر تحديث حالة الاختبار الدولي.' : 'Unable to update international test lifecycle.'));
    } finally {
      setSaving(false);
      setArchiveConfirmTest(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="grid gap-3 rounded border bg-white p-4 sm:grid-cols-3"><CanonicalPicker paged label={isRtl?'التوفر حسب الدولة':'Availability by country'} value={null} load={(q,page)=>canonicalPickerApi.countries(q,page)} onChange={(_id,item)=>{setCountryFilter(item?.code??'');setPage(1);}} />
        <CanonicalPicker paged label={isRtl?'الجهة المنظمة':'Provider'} value={null} load={async(q,page)=>{const rows=await adminApiClient.request<Array<{id:string;displayName:string}>>(`/admin/international-tests/providers?search=${encodeURIComponent(q??'')}&page=${page??1}`);return rows.map(row=>({id:row.id,label:row.displayName,lifecycle:'ACTIVE'}));}} onChange={(_id,item)=>{setProviderFilter(item?.label??'');setPage(1);}} />
        <label>{isRtl?'اكتمال البيانات':'Completeness'}<select value={completenessFilter} onChange={e=>{setCompletenessFilter(e.target.value);setPage(1);}}><option value="">{isRtl?'الكل':'All'}</option>{['INCOMPLETE','COMPLETE','NEEDS_REVIEW'].map(value=><option key={value}>{value}</option>)}</select></label>
        <label><input type="checkbox" checked={staleOnly} onChange={e=>{setStaleOnly(e.target.checked);setPage(1);}}/>{isRtl?'مصادر تحتاج تحققًا حديثًا':'Sources needing fresh verification'}</label><p>{isRtl?'الإحصاءات تشمل نتائج الفلاتر كاملة.':'Metrics cover all filtered results.'}</p>
      </div>
      <section className="relative overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-l from-[#142B5F] via-[#0E7C86] to-[#21A7B4] p-6 text-white shadow-xl sm:p-8">
        <div className="absolute -top-20 end-0 h-52 w-52 rounded-full bg-[#F2CD78] opacity-20 pointer-events-none" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-[#F2CD78] backdrop-blur-sm border border-white/15">
              <CheckCircle2 className="h-4 w-4" />
              <span>القسم الأكاديمي · الاختبارات الدولية والمقاييس</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">{t('international_tests')}</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-white/80">{t('review_imported_tests_official_registration_links_')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                placeholder={isRtl ? 'بحث باسم الاختبار أو المزود...' : 'Search test or provider...'}
                className="bg-white/10 border border-white/20 rounded-xl py-2 px-3 text-sm focus:outline-none text-white placeholder-white/60 focus:ring-1 focus:ring-[#21A7B4] w-48 sm:w-60"
              />
            </div>

            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]"
              >
                <option value="" className="text-slate-900">{t('all_statuses')}</option>
                {statuses.map((s) => (
                  <option key={s} value={s} className="text-slate-900">
                    {getStatusLabel(s, isRtl)}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-2.5 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>

            <div className="relative">
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setPage(1);
                }}
                className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]"
              >
                <option value="" className="text-slate-900">{isRtl ? 'جميع التصنيفات' : 'All Categories'}</option>
                {testCategories.map((c) => (
                  <option key={c} value={c} className="text-slate-900">
                    {getCategoryLabel(c, isRtl)}
                  </option>
                ))}
              </select>
              <Filter className="absolute right-3 top-2.5 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>
          </div>
        </div>
      </section>

      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MetricCard label={isRtl ? "إجمالي الاختبارات" : "Total Tests"} value={tests?.total ?? 0} icon={BookOpen} accent="#142B5F" />
        <MetricCard label={isRtl ? "حالة: منشور" : "Status: published"} value={tests?.statistics?.published ?? 0} icon={CheckCircle2} accent="#2E7D5A" />
        <MetricCard label={isRtl ? "قيد المراجعة" : "Under Review"} value={tests?.statistics?.underReview ?? 0} icon={AlertCircle} accent="#D6A43B" />
        <MetricCard label={isRtl ? "غير مكتمل" : "Incomplete"} value={tests?.statistics?.incomplete ?? 0} icon={GraduationCap} accent="#B94A48" />
      </div>

      <div className="bg-white border border-[#DDEFF2] rounded-2xl shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 bg-[#FAF7F0]/40 px-6 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-black text-[#142B5F]">
              {isRtl ? 'قائمة الاختبارات الدولية المعتمدة' : 'International Tests Directory'}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isRtl ? 'إدارة حالات النشر، اكتمال المعايير، وتفاصيل الاختبارات والمزودين' : 'Manage lifecycle status, dataset completeness, and test provider details'}
            </p>
          </div>
          <div className="flex items-center gap-2 self-start sm:self-auto">
            <div className="inline-flex rounded-xl bg-slate-100 p-1 border border-slate-200 text-xs font-bold">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'cards' ? 'bg-white text-[#142B5F] shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {isRtl ? 'بطاقات' : 'Cards'}
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`px-3 py-1 rounded-lg transition-all ${viewMode === 'table' ? 'bg-white text-[#142B5F] shadow-xs' : 'text-slate-600 hover:text-slate-900'}`}
              >
                {isRtl ? 'جدول' : 'Table'}
              </button>
            </div>
            <div className="text-xs font-bold text-[#0E7C86] bg-[#DDEFF2]/50 px-3 py-1.5 rounded-xl">
              {isRtl ? `العدد الإجمالي: ${tests?.total ?? 0}` : `Total: ${tests?.total ?? 0}`}
            </div>
          </div>
        </div>

        {loading && !tests ? (
          <div className="flex flex-col justify-center items-center h-64 gap-3">
            <Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" />
            <span className="text-xs font-bold text-slate-500">{isRtl ? 'جاري تحميل الاختبارات...' : 'Loading tests...'}</span>
          </div>
        ) : !tests || tests.data.length === 0 ? (
          <div className="p-16 text-center text-slate-500 font-medium">{t('no_international_tests_found')}</div>
        ) : viewMode === 'cards' ? (
          <div className="p-6 space-y-5">
            {tests.data.map((test) => {
              const displayTitle = getTestDisplayTitle(test, isRtl);
              return (
                <div
                  key={test.id}
                  className="rounded-2xl border border-[#DDEFF2] bg-white p-6 shadow-xs hover:border-[#0E7C86]/60 hover:shadow-md transition-all duration-200 flex flex-col xl:flex-row xl:items-center justify-between gap-6"
                >
                  {/* Left / Right: Info Area */}
                  <div className="flex-1 min-w-0 space-y-2.5">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Link
                        to={`/international-tests/${test.id}`}
                        className="text-xl font-black text-[#142B5F] hover:text-[#0E7C86] transition-colors tracking-tight"
                      >
                        {displayTitle}
                      </Link>
                      {test.abbreviation && (
                        <span className="font-mono text-xs font-black text-[#0E7C86] bg-[#DDEFF2]/80 px-2.5 py-1 rounded-xl border border-[#DDEFF2]">
                          {test.abbreviation}
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-500 flex flex-wrap items-center gap-2.5 font-medium">
                      <span className="inline-block bg-[#FAF7F0] text-slate-700 border border-slate-200/60 px-2.5 py-1 rounded-lg font-semibold text-[11px]">
                        {getCategoryLabel(test.testCategory, isRtl)}
                      </span>
                      {test.abbreviation && (
                        <span className="text-slate-500 font-bold">— {test.abbreviation}</span>
                      )}
                      <span className="text-slate-300">•</span>
                      <span className="text-slate-600 font-semibold">{isRtl ? `المزود: ${test.providerName}` : `Provider: ${test.providerName}`}</span>
                      {test.testCode && !test.abbreviation && (
                        <span className="font-mono text-[11px] text-slate-400">({test.testCode})</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      <StatusBadge status={test.status} isRtl={isRtl} />
                      <CompletenessBadge status={test.completenessStatus} isRtl={isRtl} />
                    </div>
                  </div>

                  {/* Middle / Center: Lifecycle Actions in Words */}
                  <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0 py-2.5 px-4 bg-slate-50/80 border border-slate-100 rounded-2xl xl:self-center">
                    {test.status === 'READY_TO_PUBLISH' ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => transitionTest(test.id, 'publish')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                        title={isRtl ? 'نشر الاختبار' : 'Publish Test'}
                      >
                        <Send className="h-4 w-4" />
                        <span>{isRtl ? 'نشر الاختبار' : 'Publish Test'}</span>
                      </button>
                    ) : test.status === 'PUBLISHED' ? (
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          <span>{isRtl ? 'منشور رسمياً' : 'Published'}</span>
                        </span>
                        <button
                          type="button"
                          disabled={saving}
                          onClick={() => transitionTest(test.id, 'unpublish')}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                          title={isRtl ? 'إلغاء النشر وإعادة الاختبار لحالة غير منشورة' : 'Unpublish test'}
                        >
                          <span>{isRtl ? 'إلغاء النشر' : 'Unpublish'}</span>
                        </button>
                      </div>
                    ) : test.completenessStatus !== 'INCOMPLETE' ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => transitionTest(test.id, 'mark-publishable')}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                        title={isRtl ? 'تحديد كجاهز للنشر' : 'Mark Ready to Publish'}
                      >
                        <CheckCircle2 className="h-4 w-4 text-sky-600" />
                        <span>{isRtl ? 'تجهيز للنشر' : 'Mark Ready'}</span>
                      </button>
                    ) : null}

                    {test.status !== 'ARCHIVED' ? (
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => setArchiveConfirmTest(test)}
                        className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-slate-700 hover:text-rose-700 hover:bg-rose-50 border border-slate-200 text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                        title={isRtl ? 'أرشفة الاختبار' : 'Archive Test'}
                      >
                        <Archive className="h-4 w-4 text-slate-500" />
                        <span>{isRtl ? 'أرشفة الاختبار' : 'Archive Test'}</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500 font-bold px-3 py-1.5 bg-slate-100 rounded-xl">
                        <Archive className="h-3.5 w-3.5 text-slate-400" />
                        <span>{isRtl ? 'مؤرشف' : 'Archived'}</span>
                      </span>
                    )}
                  </div>

                  {/* End / Last: Open Details Button */}
                  <div className="flex items-center xl:justify-end shrink-0">
                    <Link
                      to={`/international-tests/${test.id}`}
                      className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] text-white text-xs font-black transition shadow-xs w-full xl:w-auto"
                    >
                      <Eye className="h-4 w-4" />
                      <span>{isRtl ? 'فتح التفاصيل' : 'Open Details'}</span>
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
              <thead className="bg-[#FAF7F0]/80 border-b border-[#DDEFF2] text-slate-600 text-xs font-black">
                <tr>
                  <th className="px-6 py-4">{t('test')}</th>
                  <th className="px-6 py-4">{t('provider')}</th>
                  <th className="px-5 py-4 text-center">{t('status')}</th>
                  <th className="px-5 py-4 text-center">{t('completeness')}</th>
                  <th className="px-6 py-4 text-center">{isRtl ? 'إجراءات دورة الحياة' : 'Lifecycle Actions'}</th>
                  <th className="px-6 py-4 text-center">{isRtl ? 'التفاصيل' : 'Details'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tests.data.map((test) => {
                  const displayTitle = getTestDisplayTitle(test, isRtl);
                  return (
                    <tr
                      key={test.id}
                      className="hover:bg-[#FAF7F0]/40 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <Link
                          to={`/international-tests/${test.id}`}
                          className="font-bold text-[#142B5F] hover:text-[#0E7C86] text-sm block transition-colors"
                        >
                          {displayTitle}
                        </Link>
                        <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                          <span className="inline-block bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-medium text-[11px]">
                            {getCategoryLabel(test.testCategory, isRtl)}
                          </span>
                          {test.abbreviation && (
                            <span className="font-mono text-[11px] font-bold text-[#0E7C86]">
                              — {test.abbreviation}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-slate-700 font-medium text-xs max-w-[220px]">
                        {test.providerName}
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <StatusBadge status={test.status} isRtl={isRtl} />
                      </td>
                      <td className="px-5 py-4 text-center whitespace-nowrap">
                        <CompletenessBadge status={test.completenessStatus} isRtl={isRtl} />
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <div className="inline-flex items-center justify-center gap-2">
                          {test.status === 'READY_TO_PUBLISH' ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => transitionTest(test.id, 'publish')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition disabled:opacity-50 cursor-pointer"
                              title={isRtl ? 'نشر الاختبار' : 'Publish'}
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>{isRtl ? 'نشر' : 'Publish'}</span>
                            </button>
                          ) : test.status === 'PUBLISHED' ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => transitionTest(test.id, 'unpublish')}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                              title={isRtl ? 'إلغاء النشر' : 'Unpublish'}
                            >
                              <span>{isRtl ? 'إلغاء النشر' : 'Unpublish'}</span>
                            </button>
                          ) : test.completenessStatus !== 'INCOMPLETE' ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => transitionTest(test.id, 'mark-publishable')}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-50 text-sky-700 hover:bg-sky-100 border border-sky-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
                              title={isRtl ? 'تجهيز للنشر' : 'Mark Ready'}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 text-sky-600" />
                              <span>{isRtl ? 'تجهيز للنشر' : 'Mark Ready'}</span>
                            </button>
                          ) : null}

                          {test.status !== 'ARCHIVED' ? (
                            <button
                              type="button"
                              disabled={saving}
                              onClick={() => setArchiveConfirmTest(test)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200/80 text-xs font-medium transition disabled:opacity-40 cursor-pointer"
                              title={isRtl ? 'أرشفة' : 'Archive'}
                            >
                              <Archive className="h-3.5 w-3.5" />
                              <span>{isRtl ? 'أرشفة' : 'Archive'}</span>
                            </button>
                          ) : (
                            <span className="text-xs text-slate-400 font-medium px-2 py-1">
                              {isRtl ? 'مؤرشف' : 'Archived'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center whitespace-nowrap">
                        <Link
                          to={`/international-tests/${test.id}`}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#142B5F] hover:bg-[#0E7C86] text-white text-xs font-bold transition shadow-xs"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          <span>{isRtl ? 'فتح التفاصيل' : 'Open Details'}</span>
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination bar */}
        {tests && tests.total > 0 && (
          <div className="border-t border-slate-100 bg-[#FAF7F0]/40 px-6 py-3 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
            <div>
              {isRtl
                ? `عرض ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, tests.total)} من إجمالي ${tests.total} اختبار`
                : `Showing ${(page - 1) * pageSize + 1} - ${Math.min(page * pageSize, tests.total)} of ${tests.total} tests`}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
              >
                {isRtl ? 'السابق' : 'Previous'}
              </button>
              <span className="px-2 font-bold text-[#142B5F]">
                {page} / {Math.max(1, Math.ceil(tests.total / pageSize))}
              </span>
              <button
                type="button"
                disabled={page >= Math.ceil(tests.total / pageSize)}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed transition"
              >
                {isRtl ? 'التالي' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Archive Confirmation Dialog */}
      {archiveConfirmTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
            <div className="flex items-center gap-3 text-amber-600">
              <Archive className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-black text-[#142B5F]">
                {isRtl ? 'تأكيد أرشفة الاختبار' : 'Confirm Archive'}
              </h3>
            </div>
            <p className="text-sm text-slate-600 leading-relaxed">
              {isRtl
                ? `هل أنت متأكد من أرشفة «${getTestDisplayTitle(archiveConfirmTest, true)}»؟ سيتم حفظ السجل وبياناته بالكامل دون حذف، ولن يظهر في القوائم النشطة.`
                : `Are you sure you want to archive "${getTestDisplayTitle(archiveConfirmTest, false)}"? The record and all its data will be preserved without deletion.`}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setArchiveConfirmTest(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer transition"
              >
                {isRtl ? 'إلغاء' : 'Cancel'}
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => transitionTest(archiveConfirmTest.id, 'archive')}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold cursor-pointer transition shadow-xs disabled:opacity-50"
              >
                {saving ? (isRtl ? 'جارٍ الأرشفة...' : 'Archiving...') : (isRtl ? 'تأكيد الأرشفة' : 'Confirm Archive')}
              </button>
            </div>
          </div>
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
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${config.badge}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${config.dot}`} />
      <span>{label}</span>
    </span>
  );
}

function CompletenessBadge({ status, isRtl }: { status?: InternationalTestCompletenessStatus | null; isRtl: boolean }) {
  const label = getCompletenessLabel(status, isRtl);
  const config =
    status === 'COMPLETE'
      ? { badge: 'bg-emerald-50 text-emerald-700 border-emerald-200/80', dot: 'bg-emerald-500' }
      : status === 'NEEDS_REVIEW'
      ? { badge: 'bg-amber-50 text-amber-800 border-amber-200/80', dot: 'bg-amber-500' }
      : { badge: 'bg-rose-50 text-rose-700 border-rose-200/80', dot: 'bg-rose-500' };

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border ${config.badge}`}>
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
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function getCompletenessLabel(status: InternationalTestCompletenessStatus | null | undefined, isRtl: boolean): string {
  if (!status) return isRtl ? 'غير مكتمل' : 'Incomplete';
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
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function getCategoryLabel(category: any, isRtl: boolean): string {
  if (!category) return isRtl ? 'عام' : 'General';
  if (isRtl) {
    switch (category) {
      case 'ENGLISH_LANGUAGE':
      case 'LANGUAGE_PROFICIENCY': return 'لغة إنجليزية';
      case 'NON_ENGLISH_LANGUAGE': return 'لغة غير إنجليزية';
      case 'STANDARDIZED_ADMISSION':
      case 'GENERAL_UNDERGRADUATE_ADMISSION':
      case 'UNDERGRAD_ADMISSION': return 'قبول جامعي عام';
      case 'GRADUATE_ADMISSION':
      case 'GRAD_ADMISSION': return 'قبول دراسات عليا';
      case 'NATIONAL_INTERNATIONAL_ADMISSION': return 'قبول وطني/دولي';
      case 'SPECIALIZED_ADMISSION': return 'قبول تخصصي';
      case 'PROFESSIONAL_LICENSING_CERTIFICATION':
      case 'PROFESSIONAL_LICENSING': return 'ترخيص/اعتماد مهني';
      case 'ACADEMIC_PLACEMENT': return 'تحديد مستوى أكاديمي';
      case 'OTHER': return 'أخرى';
      default:
        return category;
    }
  }
  return String(category).replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
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
