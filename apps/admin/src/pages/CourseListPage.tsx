import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { ArrowRight, Filter, Loader2, Plus, X } from 'lucide-react';
import { useTranslation } from "../i18n/I18nProvider";

interface Course {
  id: string;
  displayName: string;
  status: string;
  completenessStatus: string;
  accessType: string;
  originType: string;
  platformName?: string;
  learningLanguage?: string;
  updatedAt: string;
}

interface PaginatedResponse {
  data: Course[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export function CourseListPage() {
    const { t } = useTranslation();
  const navigate = useNavigate();
  const [data, setData] = useState<PaginatedResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [originFilter, setOriginFilter] = useState('');
  const [accessFilter, setAccessFilter] = useState('');
  const [page, setPage] = useState(1);
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ titleAr: '', titleEn: '', accessType: 'FREE_STUDY', learningLanguage: 'ar', category: '', difficultyLevel: '' });

  const createNativeCourse = async (event: FormEvent) => {
    event.preventDefault();
    setCreating(true);
    setError(null);
    try {
      const payload = {
        titleAr: createForm.titleAr.trim(),
        accessType: createForm.accessType,
        ...(createForm.titleEn.trim() ? { titleEn: createForm.titleEn.trim() } : {}),
        ...(createForm.learningLanguage.trim() ? { learningLanguage: createForm.learningLanguage.trim() } : {}),
        ...(createForm.category.trim() ? { category: createForm.category.trim() } : {}),
        ...(createForm.difficultyLevel.trim() ? { difficultyLevel: createForm.difficultyLevel.trim() } : {}),
      };
      const created = await adminApiClient.request<{ id: string }>('/admin/courses', { method: 'POST', body: JSON.stringify(payload) });
      setShowCreate(false);
      navigate(`/courses/${created.id}`);
    } catch (err: any) {
      setError(err.message);
    } finally { setCreating(false); }
  };

  const fetchCourses = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: page.toString(), pageSize: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (originFilter) params.append('originType', originFilter);
      if (accessFilter) params.append('accessType', accessFilter);
      const response = await adminApiClient.request<PaginatedResponse>(`/admin/courses?${params.toString()}`);
      setData(response);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, [page, statusFilter, originFilter, accessFilter]);

  const resetAndSet = (setter: (value: string) => void) => (event: React.ChangeEvent<HTMLSelectElement>) => {
    setter(event.target.value);
    setPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('courses')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('review_course_catalog_records_and_open_the_authori')}</p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setShowCreate(true)} className="inline-flex items-center gap-2 rounded-md bg-[#142B5F] px-4 py-2 text-sm font-bold text-white"><Plus className="h-4 w-4" />Create native course</button>
          <div className="relative">
            <select value={statusFilter} onChange={resetAndSet(setStatusFilter)} className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-black">
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
            <select value={originFilter} onChange={resetAndSet(setOriginFilter)} className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-black">
              <option value="">{t('all_origins')}</option>
              <option value="NATIVE_MANARATAK_COURSE">{t('native_manaratak')}</option>
              <option value="EXTERNAL_LINKED_COURSE">{t('external_linked')}</option>
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>

          <div className="relative">
            <select value={accessFilter} onChange={resetAndSet(setAccessFilter)} className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-black">
              <option value="">{t('all_access')}</option>
              <option value="FREE_STUDY">{t('free_study')}</option>
              <option value="FREE_CERTIFICATE">{t('free_certificate')}</option>
              <option value="FREE_STUDY_AND_CERTIFICATE">{t('free_study_certificate')}</option>
              <option value="PAID">{t('paid')}</option>
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}
      {showCreate && (
        <form onSubmit={createNativeCourse} className="rounded-2xl border border-[#DDEFF2] bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between"><div><h3 className="font-black text-[#142B5F]">Create native MANARATAK course</h3><p className="text-xs text-gray-500">Creates a DRAFT native course and opens its canonical editor.</p></div><button type="button" onClick={() => setShowCreate(false)}><X className="h-5 w-5" /></button></div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-3">
            <input required minLength={2} value={createForm.titleAr} onChange={e=>setCreateForm(v=>({...v,titleAr:e.target.value}))} placeholder="Arabic title *" className="rounded-xl border p-2" />
            <input value={createForm.titleEn} onChange={e=>setCreateForm(v=>({...v,titleEn:e.target.value}))} placeholder="English title" className="rounded-xl border p-2" />
            <select value={createForm.accessType} onChange={e=>setCreateForm(v=>({...v,accessType:e.target.value}))} className="rounded-xl border p-2"><option value="FREE_STUDY">Free study</option><option value="FREE_CERTIFICATE">Free certificate</option><option value="FREE_STUDY_AND_CERTIFICATE">Free study + certificate</option><option value="PAID">Paid</option></select>
            <input value={createForm.learningLanguage} onChange={e=>setCreateForm(v=>({...v,learningLanguage:e.target.value}))} placeholder="Learning language (BCP47)" className="rounded-xl border p-2" />
            <input value={createForm.category} onChange={e=>setCreateForm(v=>({...v,category:e.target.value}))} placeholder="Category" className="rounded-xl border p-2" />
            <input value={createForm.difficultyLevel} onChange={e=>setCreateForm(v=>({...v,difficultyLevel:e.target.value}))} placeholder="Difficulty level" className="rounded-xl border p-2" />
          </div>
          <button disabled={creating} className="mt-4 rounded-xl bg-[#0E7C86] px-4 py-2 text-sm font-bold text-white disabled:opacity-60">{creating ? 'Creating…' : 'Create and open editor'}</button>
        </form>
      )}


      {loading && !data ? (
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                  <th className="px-6 py-3 font-medium">{t('course')}</th>
                  <th className="px-6 py-3 font-medium">{t('origin')}</th>
                  <th className="px-6 py-3 font-medium">{t('access')}</th>
                  <th className="px-6 py-3 font-medium">{t('status')}</th>
                  <th className="px-6 py-3 font-medium">{t('updated')}</th>
                  <th className="px-6 py-3 font-medium text-right">{t('actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 text-sm">
                {data?.data.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">{t('no_courses_found')}</td>
                  </tr>
                ) : (
                  data?.data.map((course) => (
                    <tr key={course.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{course.displayName}</div>
                        <div className="text-gray-500 text-xs mt-1">{course.platformName || course.learningLanguage || 'MANARATAK'}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{course.originType.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4 text-gray-600">{course.accessType.replace(/_/g, ' ')}</td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${course.status === 'PUBLISHED' ? 'bg-green-100 text-green-800' : course.status === 'READY_TO_PUBLISH' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                          {course.status.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs whitespace-nowrap">{new Date(course.updatedAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => navigate(`/courses/${course.id}`)} className="inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-800">
                          {t('open_editor')}<ArrowRight className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {data && data.totalPages > 1 && (
            <div className="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <span className="text-sm text-gray-700">{t('page')}<span className="font-medium">{data.page}</span> {t('of')}<span className="font-medium">{data.totalPages}</span></span>
              <div className="flex gap-2">
                <button disabled={data.page === 1} onClick={() => setPage((value) => Math.max(1, value - 1))} className="px-3 py-1 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50">{t('previous')}</button>
                <button disabled={data.page === data.totalPages} onClick={() => setPage((value) => value + 1)} className="px-3 py-1 border border-gray-300 rounded text-sm font-medium bg-white hover:bg-gray-50 disabled:opacity-50">{t('next')}</button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
