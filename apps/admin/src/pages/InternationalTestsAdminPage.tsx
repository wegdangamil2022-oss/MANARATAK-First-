import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { Archive, CheckCircle2, Eye, Filter, Loader2, Send } from 'lucide-react';
import { useTranslation } from '../i18n/I18nProvider';

type InternationalTestStatus = 'IMPORTED' | 'READY_TO_REVIEW' | 'NEEDS_REVIEW' | 'INCOMPLETE' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'REJECTED' | 'ARCHIVED';
type InternationalTestCompletenessStatus = 'INCOMPLETE' | 'COMPLETE' | 'NEEDS_REVIEW';
type InternationalTestCategory = 'ENGLISH_LANGUAGE' | 'NON_ENGLISH_LANGUAGE' | 'GENERAL_UNDERGRADUATE_ADMISSION' | 'GRADUATE_ADMISSION' | 'NATIONAL_INTERNATIONAL_ADMISSION' | 'SPECIALIZED_ADMISSION' | 'PROFESSIONAL_LICENSING_CERTIFICATION' | 'LANGUAGE_PROFICIENCY' | 'UNDERGRAD_ADMISSION' | 'GRAD_ADMISSION' | 'PROFESSIONAL_LICENSING' | 'ACADEMIC_PLACEMENT' | 'OTHER';

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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('international_tests')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('review_imported_tests_official_registration_links_')}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">{t('all_statuses')}</option>
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {getStatusLabel(s, isRtl)}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-black"
            >
              <option value="">{t('all_categories')}</option>
              {testCategories.map((c) => (
                <option key={c} value={c}>
                  {getCategoryLabel(c, isRtl)}
                </option>
              ))}
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">{error}</div>}

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
