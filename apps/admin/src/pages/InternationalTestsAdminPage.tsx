import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { Archive, CheckCircle2, Eye, Filter, Loader2, Send, BookOpen, AlertCircle, GraduationCap } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';

type InternationalTestStatus = 'IMPORTED' | 'READY_TO_REVIEW' | 'NEEDS_REVIEW' | 'INCOMPLETE' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
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

interface InternationalTestListResponse {
  data: InternationalTest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
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

  const [tests, setTests] = useState<InternationalTestListResponse | null>(null);
  const [selectedTest, setSelectedTest] = useState<InternationalTest | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadTests = async (signal?: AbortSignal) => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (categoryFilter) params.append('testCategory', categoryFilter);
      
      const response = await adminApiClient.request<InternationalTestListResponse>(
        `/admin/international-tests?${params.toString()}`,
        { signal }
      );
      setTests(response);
      if (selectedTest) {
        setSelectedTest((response.data || []).find((item) => item.id === selectedTest.id) || null);
      }
    } catch (err: any) {
      if (err?.name === 'AbortError') return;
      setError(err.message || (isRtl ? 'تعذر تحميل الاختبارات الدولية.' : 'Unable to load international tests.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadTests(controller.signal);
    return () => controller.abort();
  }, [statusFilter, categoryFilter]);

  const transitionTest = async (id: string, action: 'mark-publishable' | 'publish' | 'archive') => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      await adminApiClient.request(`/admin/international-tests/${id}/${action}`, { method: 'POST' });
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
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
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
          <div className="flex flex-wrap gap-3 shrink-0">
            <div className="relative">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
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
                onChange={(e) => setCategoryFilter(e.target.value)}
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
        <MetricCard label={isRtl ? "منشور في الموقع" : "Published Tests"} value={tests?.data.filter(x => x.status === 'PUBLISHED').length ?? 0} icon={CheckCircle2} accent="#2E7D5A" />
        <MetricCard label={isRtl ? "قيد المراجعة" : "Under Review"} value={tests?.data.filter(x => x.status === 'READY_TO_REVIEW' || x.status === 'NEEDS_REVIEW').length ?? 0} icon={AlertCircle} accent="#D6A43B" />
        <MetricCard label={isRtl ? "غير مكتمل" : "Incomplete"} value={tests?.data.filter(x => x.completenessStatus === 'INCOMPLETE').length ?? 0} icon={GraduationCap} accent="#B94A48" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
          {loading && !tests ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : !tests || tests.data.length === 0 ? (
            <div className="p-12 text-center text-gray-500">{t('no_international_tests_found')}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-right rtl:text-right ltr:text-left">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">{t('test')}</th>
                    <th className="px-6 py-3">{t('provider')}</th>
                    <th className="px-6 py-3">{t('status')}</th>
                    <th className="px-6 py-3">{t('completeness')}</th>
                    <th className="px-6 py-3 text-center">{isRtl ? 'التفاصيل' : 'Details'}</th>
                    <th className="px-6 py-3 text-left rtl:text-left ltr:text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {tests.data.map((test) => {
                    const testName = test.displayName || test.canonicalName;
                    return (
                      <tr
                        key={test.id}
                        className={`hover:bg-gray-50 ${selectedTest?.id === test.id ? 'bg-blue-50/50' : ''}`}
                      >
                        <td className="px-6 py-4">
                          <button
                            onClick={() => setSelectedTest(test)}
                            className="font-semibold text-gray-900 hover:text-blue-700 text-right rtl:text-right ltr:text-left block"
                          >
                            {testName}
                          </button>
                          <div className="text-xs text-gray-500 mt-0.5">
                            {getCategoryLabel(test.testCategory, isRtl)}{' '}
                            {test.abbreviation ? `(${test.abbreviation})` : test.testCode ? `- ${test.testCode}` : ''}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-gray-600 font-medium">{test.providerName}</td>
                        <td className="px-6 py-4">
                          <StatusBadge status={test.status} isRtl={isRtl} />
                        </td>
                        <td className="px-6 py-4">
                          <CompletenessBadge status={test.completenessStatus} isRtl={isRtl} />
                        </td>
                        <td className="px-6 py-4 text-center">
                          <Link
                            to={`/international-tests/${test.id}`}
                            className="inline-flex items-center gap-1 text-xs bg-gray-100 hover:bg-black hover:text-white text-gray-800 font-medium px-2.5 py-1.5 rounded-md transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            {isRtl ? 'فتح التفاصيل' : 'Open Details'}
                          </Link>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex justify-end gap-2">
                            <button
                              disabled={saving || test.completenessStatus === 'INCOMPLETE'}
                              onClick={() => transitionTest(test.id, 'mark-publishable')}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg disabled:opacity-30"
                              title={t('mark_publishable')}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                            <button
                              disabled={saving || test.status !== 'READY_TO_PUBLISH'}
                              onClick={() => transitionTest(test.id, 'publish')}
                              className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg disabled:opacity-30"
                              title={t('publish')}
                            >
                              <Send className="h-4 w-4" />
                            </button>
                            <button
                              disabled={saving}
                              onClick={() => transitionTest(test.id, 'archive')}
                              className="p-1.5 text-gray-600 hover:bg-gray-100 rounded-lg disabled:opacity-30"
                              title={t('archive')}
                            >
                              <Archive className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Selected Test Overview Sidebar */}
        <aside className="bg-white border border-gray-200 rounded-xl shadow-sm p-6 h-fit space-y-5">
          <h3 className="text-lg font-bold text-gray-900 border-b pb-3">{t('review_details')}</h3>
          {!selectedTest ? (
            <p className="text-sm text-gray-500">{t('select_an_imported_test_to_review_official_links_f')}</p>
          ) : (
            <div className="space-y-4 text-sm">
              <div>
                <h4 className="font-bold text-gray-900 text-base">
                  {selectedTest.displayName || selectedTest.canonicalName}
                </h4>
                <p className="text-gray-500 text-xs font-mono">{selectedTest.canonicalName}</p>
              </div>

              <div className="pt-2 pb-2">
                <Link
                  to={`/international-tests/${selectedTest.id}`}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-gray-800 transition-colors"
                >
                  <Eye className="h-4 w-4" />
                  {isRtl ? 'فتح صفحة التفاصيل الكاملة' : 'Open Full Detail Page'}
                </Link>
              </div>

              <dl className="space-y-3 divide-y divide-gray-100 pt-1">
                <DetailRow label={t('provider')} value={selectedTest.providerName} />
                <DetailRow label={isRtl ? 'مقياس الدرجات' : 'Score Scale'} value={formatScoreScale(selectedTest, isRtl)} />
                <DetailRow label={isRtl ? 'مدة الصلاحية' : 'Validity'} value={formatValidity(selectedTest, isRtl)} />
                <DetailRow label={isRtl ? 'الرسوم التقريبية' : 'Fee'} value={formatFee(selectedTest, isRtl)} />
                <DetailRow label={isRtl ? 'التحقق من المصدر' : 'Source Verification'} value={formatSourceVerification(selectedTest, isRtl)} />
                <DetailRow
                  label={t('accepted_for')}
                  value={selectedTest.acceptedFor && selectedTest.acceptedFor.length > 0 ? selectedTest.acceptedFor.join(', ') : (isRtl ? 'غير متوفر' : 'Unavailable')}
                />
                <DetailRow
                  label={t('countries')}
                  value={(selectedTest.availableCountries || []).join(', ') || (isRtl ? 'غير متوفر' : 'Unavailable')}
                />
                <DetailRow
                  label={t('test_centers')}
                  value={(selectedTest.testCenters || []).join(', ') || (isRtl ? 'غير متوفر' : 'Unavailable')}
                />
                <DetailRow
                  label={t('source_import_record')}
                  value={selectedTest.sourceImportRecordId || (isRtl ? 'غير متوفر' : 'Unavailable')}
                />
              </dl>

              {selectedTest.officialRegistrationUrl ? (
                <a
                  href={selectedTest.officialRegistrationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="block text-center bg-gray-100 text-gray-800 font-medium rounded-lg px-4 py-2 hover:bg-gray-200 transition-colors text-xs"
                >
                  {t('open_official_registration')}
                </a>
              ) : (
                <p className="text-xs text-gray-400 text-center italic">{isRtl ? 'رابط التسجيل غير متوفر' : 'Registration URL unavailable'}</p>
              )}

              <p className="text-xs text-gray-500 pt-2 border-t">
                {t('phase_23_controls_review_actions_only_test_identit')}
              </p>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function StatusBadge({ status, isRtl }: { status: InternationalTestStatus; isRtl: boolean }) {
  const label = getStatusLabel(status, isRtl);
  const className =
    status === 'PUBLISHED'
      ? 'bg-green-100 text-green-700'
      : status === 'READY_TO_PUBLISH'
      ? 'bg-blue-100 text-blue-700'
      : status === 'ARCHIVED'
      ? 'bg-gray-100 text-gray-600'
      : status === 'READY_TO_REVIEW'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-yellow-100 text-yellow-700';
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>;
}

function CompletenessBadge({ status, isRtl }: { status?: InternationalTestCompletenessStatus | null; isRtl: boolean }) {
  const label = getCompletenessLabel(status, isRtl);
  const className =
    status === 'COMPLETE'
      ? 'bg-green-100 text-green-700'
      : status === 'NEEDS_REVIEW'
      ? 'bg-amber-100 text-amber-800'
      : 'bg-red-100 text-red-700';
  return <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${className}`}>{label}</span>;
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="pt-2 first:pt-0">
      <dt className="text-gray-500 text-xs font-medium">{label}</dt>
      <dd className="font-semibold text-gray-900 text-sm mt-0.5">{value}</dd>
    </div>
  );
}

function formatScoreScale(test: InternationalTest, isRtl: boolean): string {
  if (typeof test.scoreScale === 'string' && test.scoreScale.trim() !== '') {
    return test.scoreScale;
  }
  if (test.scoreScale && typeof test.scoreScale === 'object') {
    if (test.scoreScale.overallMinimum !== undefined && test.scoreScale.overallMaximum !== undefined) {
      return `${test.scoreScale.overallMinimum} - ${test.scoreScale.overallMaximum}`;
    }
  }
  return isRtl ? 'غير متوفر' : 'Unavailable';
}

function formatValidity(test: InternationalTest, isRtl: boolean): string {
  const months = test.validityPeriodMonths ?? test.scoreScale?.resultValidityDurationMonths;
  if (months !== undefined && months !== null) {
    return `${months} ${isRtl ? 'شهر' : 'months'}`;
  }
  return isRtl ? 'غير متوفر' : 'Unavailable';
}

function formatFee(test: InternationalTest, isRtl: boolean): string {
  if (test.fees && test.fees.length > 0) {
    const primaryFee = test.fees[0];
    return `${primaryFee.amount} ${primaryFee.currencyCode}`;
  }
  if (test.currencyCode && test.feeAmountMinorUnits) {
    const scale = test.feeScale ?? 2;
    const amount = Number(test.feeAmountMinorUnits) / Math.pow(10, scale);
    return `${amount} ${test.currencyCode}`;
  }
  return isRtl ? 'غير متوفر' : 'Unavailable';
}

function formatSourceVerification(test: InternationalTest, isRtl: boolean): string {
  if (test.isSourceVerified === true) {
    return isRtl ? 'تم التحقق' : 'Verified';
  }
  return isRtl ? 'لم يتم التحقق' : 'Unverified';
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
      case 'INCOMPLETE':
        return 'ناقص';
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

function getCategoryLabel(category: InternationalTestCategory, isRtl: boolean): string {
  if (isRtl) {
    switch (category) {
      case 'ENGLISH_LANGUAGE': return 'لغة إنجليزية';
      case 'NON_ENGLISH_LANGUAGE': return 'لغة غير إنجليزية';
      case 'LANGUAGE_PROFICIENCY': return 'إجادة لغة';
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
  return category.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (l) => l.toUpperCase());
}

function getActionLabel(action: string, isRtl: boolean): string {
  if (isRtl) {
    switch (action) {
      case 'mark-publishable':
        return 'تحديد كجاهز للنشر';
      case 'publish':
        return 'نشر';
      case 'archive':
        return 'أرشفة';
      default:
        return action;
    }
  }
  return action;
}
