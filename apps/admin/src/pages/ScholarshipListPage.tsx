import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { Filter, Loader2, ArrowRight } from 'lucide-react';
import { useTranslation } from "../i18n/I18nProvider";

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

export function ScholarshipListPage() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [statusFilter, setStatusFilter] = useState('');
  const [completenessFilter, setCompletenessFilter] = useState('');
  const [page, setPage] = useState(1);

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
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchScholarships();
  }, [page, statusFilter, completenessFilter]);

  const handleStatusChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setStatusFilter(e.target.value);
    setPage(1);
  };

  const handleCompletenessChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCompletenessFilter(e.target.value);
    setPage(1);
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 font-['Cairo',sans-serif] text-[#203442]">
      <header className="flex flex-col gap-5 rounded-3xl bg-gradient-to-r from-[#142B5F] via-[#0E7C86] to-[#142B5F] p-6 text-white shadow-xl sm:p-8 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 text-sm font-bold text-[#F2CD78]">Scholarship catalog</div>
          <h2 className="text-3xl font-black sm:text-4xl">{t('admin_nav_scholarships')}</h2>
          <p className="mt-2 max-w-2xl text-sm font-medium text-[#DDEFF2]">{t('scholarship_imported_not_show_here_helper') || "Imported records do not appear here until promoted into scholarship catalog records."}</p>
        </div>
        
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => navigate('/admin/imports?dataType=SCHOLARSHIPS')}
            className="min-h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-bold text-white transition-all hover:bg-white/20"
          >
            {t('view_imported_records') || "View Imported Records"}
          </button>

          <div className="relative">
            <select 
              value={statusFilter} 
              onChange={handleStatusChange}
              className="min-h-11 appearance-none rounded-xl border border-white/20 bg-white/10 py-2 pl-3 pr-10 text-sm font-semibold text-white outline-none"
            >
              <option value="">{t('all_statuses')}</option>
              <option value="IMPORTED">{t('imported')}</option>
              <option value="READY_TO_REVIEW">{t('ready_to_review')}</option>
              <option value="READY_TO_PUBLISH">{t('ready_to_publish')}</option>
              <option value="PUBLISHED">{t('published')}</option>
              <option value="REJECTED">{t('rejected')}</option>
              <option value="ARCHIVED">{t('archived')}</option>
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          
          <div className="relative">
            <select 
              value={completenessFilter} 
              onChange={handleCompletenessChange}
              className="min-h-11 appearance-none rounded-xl border border-white/20 bg-white/10 py-2 pl-3 pr-10 text-sm font-semibold text-white outline-none"
            >
              <option value="">{t('all_completeness')}</option>
              <option value="COMPLETE">{t('complete')}</option>
              <option value="NEEDS_REVIEW">{t('needs_review')}</option>
              <option value="INCOMPLETE">{t('incomplete')}</option>
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </header>

      {/* Transfer Flow Diagram Alert */}
      <div className="bg-[#DDEFF2]/45 border border-[#21A7B4]/25 text-[#203442] rounded-xl p-4 flex flex-col md:flex-row gap-3 items-start md:items-center justify-between shadow-sm">
        <div className="space-y-1">
          <h4 className="text-xs font-bold text-[#142B5F]">{t('promotion_flow_title') || "Scholarship Lifecycle & Transfer Flow"}</h4>
          <p className="text-xs text-[#203442]/75 leading-relaxed">
            {t('promotion_flow_clarity_text') || "Transfer Flow: Imported record -> Transfer -> Scholarship/Domain entity -> Review/Ready -> Publish -> Only Published items appear publicly."}
          </p>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {loading && !data ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[#DDEFF2] bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF7F0] border-b border-[#DDEFF2] text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3 font-medium">{t('scholarship')}</th>
                  <th className="px-6 py-3 font-medium">{t('status')}</th>
                  <th className="px-6 py-3 font-medium">{t('completeness')}</th>
                  <th className="px-6 py-3 font-medium">{t('country')}</th>
                  <th className="px-6 py-3 font-medium">{t('updated_at')}</th>
                  <th className="px-6 py-3 font-medium text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DDEFF2] text-sm">
                {data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      {t('no_scholarships_found_matching_your_filters')}</td>
                  </tr>
                ) : (
                  data?.data.map((item) => (
                    <tr key={item.id} className="hover:bg-[#DDEFF2]/25 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{item.displayName}</div>
                        <div className="text-gray-500 text-xs mt-1 truncate max-w-[200px]">{item.sponsorName || 'Unknown Sponsor'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                          ${item.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : 
                            item.status === 'READY_TO_PUBLISH' ? 'bg-blue-100 text-blue-800' : 
                            item.status === 'REJECTED' ? 'bg-red-100 text-red-800' : 
                            'bg-gray-100 text-gray-800'}`}>
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium 
                          ${item.completenessStatus === 'COMPLETE' ? 'bg-green-100 text-green-800' : 
                            item.completenessStatus === 'NEEDS_REVIEW' ? 'bg-yellow-100 text-yellow-800' : 
                            'bg-red-100 text-red-800'}`}>
                          {item.completenessStatus.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{item.studyCountry || '-'}</td>
                      <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(item.updatedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => navigate(`/admin/scholarships/${item.id}`)}
                          className="inline-flex items-center gap-1 text-sm font-medium text-[#0E7C86] hover:text-[#142B5F]"
                        >
                          {t('review')}<ArrowRight className="h-4 w-4" />
                        </button>
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
                {t('page')}<span className="font-medium">{data.page}</span> {t('of')}<span className="font-medium">{data.totalPages}</span>
              </span>
              <div className="flex gap-2">
                <button
                  disabled={data.page === 1}
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-[#DDEFF2]/25 disabled:opacity-50"
                >
                  {t('previous')}</button>
                <button
                  disabled={data.page === data.totalPages}
                  onClick={() => setPage(p => p + 1)}
                  className="px-3 py-1 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-[#DDEFF2]/25 disabled:opacity-50"
                >
                  {t('next')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
