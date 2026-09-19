import { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { School, Filter, Loader2, Globe, Calendar, MapPin } from 'lucide-react';
import { useTranslation } from "../i18n/I18nProvider";

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

export function UniversityAdminPage() {
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const countryReferenceId = searchParams.get('countryReferenceId')?.trim() || '';
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  const fetchUniversities = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (countryReferenceId) params.append('countryReferenceId', countryReferenceId);
      const response = await adminApiClient.request<PaginatedResponse>(`/admin/universities?${params.toString()}`);
      setData(response);
    } catch (err: any) {
      setError(err.message || 'Unable to load universities.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUniversities();
  }, [page, statusFilter, countryReferenceId]);

  const handleFilterChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(event.target.value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <header className="flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-[#142B5F] via-[#0E7C86] to-[#142B5F] p-6 text-white shadow-xl sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-[#F2CD78]"><School className="h-4 w-4" />Institution directory</div>
          <h2 className="text-3xl font-black sm:text-4xl">{t('admin_universities') || 'Universities'}</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium text-[#DDEFF2]">{t('admin_universities_subtitle')}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {countryReferenceId && <div className="flex min-h-11 items-center gap-2 rounded-xl border border-[#F2CD78]/40 bg-[#F2CD78]/15 px-3 text-xs font-black text-white"><MapPin className="h-4 w-4 text-[#F2CD78]" /><span>{t('study_destination_filter') || 'Study destination filter'}: <span className="font-mono">{countryReferenceId}</span></span><button type="button" onClick={() => { const next = new URLSearchParams(searchParams); next.delete('countryReferenceId'); setSearchParams(next); setPage(1); }} className="rounded-md border border-white/20 px-2 py-1 text-[11px] hover:bg-white/10">{t('clear') || 'Clear'}</button></div>}
          <div className="relative">
            <select 
              value={statusFilter} 
              onChange={handleFilterChange} 
              className="min-h-11 appearance-none rounded-xl border border-white/20 bg-white/10 py-2 pl-3 pr-10 text-sm font-semibold text-white outline-none"
            >
              <option value="">{t('all_statuses') || 'All Statuses'}</option>
              <option value="IMPORTED">{t('imported') || 'Imported'}</option>
              <option value="READY_TO_REVIEW">{t('ready_to_review') || 'Ready to Review'}</option>
              <option value="READY_TO_PUBLISH">{t('ready_to_publish') || 'Ready to Publish'}</option>
              <option value="PUBLISHED">{t('published') || 'Published'}</option>
              <option value="REJECTED">{t('rejected') || 'Rejected'}</option>
              <option value="ARCHIVED">{t('archived') || 'Archived'}</option>
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </header>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      {loading && !data ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#FAF7F0] border-b border-[#DDEFF2] uppercase tracking-wider text-gray-500 font-bold">
                  <th className="px-6 py-3">{t('university') || 'University'}</th>
                  <th className="px-6 py-3">{t('location') || 'Location'}</th>
                  <th className="px-6 py-3">{t('founded') || 'Founded'}</th>
                  <th className="px-6 py-3">{t('website') || 'Website'}</th>
                  <th className="px-6 py-3">{t('status') || 'Status'}</th>
                  <th className="px-6 py-3">{t('completeness') || 'Completeness'}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDEFF2] text-sm">
                {!data || data.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <School className="w-8 h-8 text-gray-300" />
                        <span>{t('no_universities_found') || 'No universities found.'}</span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  data.data.map((uni) => (
                    <tr key={uni.id} className="hover:bg-[#DDEFF2]/30 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 flex items-center gap-2">
                          <School className="w-4 h-4 text-[#21A7B4] shrink-0" />
                          <Link to={`/universities/${uni.id}`} className="text-[#0E7C86] hover:underline">{uni.displayName}</Link>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className="inline-flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-gray-400" />
                          {uni.city ? `${uni.city}, ` : ''}{uni.country}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {uni.foundedYear ? (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-gray-400" />
                            {uni.foundedYear}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {uni.officialWebsite ? (
                          <a 
                            href={uni.officialWebsite} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1 text-[#0E7C86] hover:underline"
                          >
                            <Globe className="w-3.5 h-3.5" />
                            <span>{t('visit') || 'Visit'}</span>
                          </a>
                        ) : '-'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${uni.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>
                          {t(uni.status.toLowerCase() as any) || uni.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${uni.completenessStatus === 'COMPLETE' ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'}`}>
                          {t(uni.completenessStatus.toLowerCase() as any) || uni.completenessStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="bg-[#FAF7F0] px-6 py-3 border-t border-[#DDEFF2] flex items-center justify-between">
              <span className="text-sm text-gray-700">
                {t('page')} <span className="font-medium">{data.page}</span> {t('of')} <span className="font-medium">{data.totalPages}</span>
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
