import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { adminApiClient } from '../api/client';
import { ArrowLeft, Loader2, Save, CheckCircle2, XCircle } from 'lucide-react';
import { useTranslation } from "../i18n/I18nProvider";

interface ScholarshipDetail {
  id: string;
  publicId: string;
  displayName: string;
  fundingCoverage: string;
  coverageDetails: string;
  eligibleMajorsOrFields: string | string[];
  degreeLevel: string;
  status: string;
  completenessStatus: string;
  applicationLink?: string;
  officialSourceUrl?: string;
  sponsorName?: string;
  studyCountry?: string;
  applicationDeadline?: string;
  sourceImportRecordId?: string;
  createdAt: string;
  updatedAt: string;
  requiredDocuments?: string;
  eligibilityCriteria?: string;
  studyLanguage?: string;
  targetUniversities?: string | string[];
  targetAcademicPrograms?: string | string[];
  fundingAmount?: string;
  currency?: string;
  duration?: string;
  localizedNames?: any;
  metadata?: any;
}

export function ScholarshipDetailPage() {
    const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [data, setData] = useState<ScholarshipDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<Partial<ScholarshipDetail>>({});

  const fetchScholarship = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApiClient.request<ScholarshipDetail>(`/admin/scholarships/${id}`);
      setData(res);
      setFormData({
        displayName: res.displayName || '',
        fundingCoverage: res.fundingCoverage || '',
        coverageDetails: res.coverageDetails || '',
        degreeLevel: res.degreeLevel || '',
        sponsorName: res.sponsorName || '',
        studyCountry: res.studyCountry || '',
        applicationLink: res.applicationLink || '',
        officialSourceUrl: res.officialSourceUrl || '',
        applicationDeadline: res.applicationDeadline || '',
        studyLanguage: res.studyLanguage || '',
        requiredDocuments: res.requiredDocuments || '',
        eligibilityCriteria: res.eligibilityCriteria || '',
        fundingAmount: res.fundingAmount || '',
        currency: res.currency || '',
        duration: res.duration || '',
        eligibleMajorsOrFields: res.eligibleMajorsOrFields,
        targetUniversities: res.targetUniversities,
        targetAcademicPrograms: res.targetAcademicPrograms,
      });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchScholarships();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchScholarships = fetchScholarship;

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      // Stringify JSON/array fields if needed for API compatibility or leave as is
      const res = await adminApiClient.request<ScholarshipDetail>(`/admin/scholarships/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(formData),
      });
      setData(res);
      setSuccessMsg('Scholarship updated successfully.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAction = async (endpoint: string, actionName: string) => {
    setError(null);
    setSuccessMsg(null);
    try {
      await adminApiClient.request(`/admin/scholarships/${id}/${endpoint}`, {
        method: 'POST',
      });
      setSuccessMsg(`Successfully executed: ${actionName}`);
      fetchScholarship(); // Refresh to get new status
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading && !data) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!data) {
    return <div className="text-red-500">{t('failed_to_load_scholarship_details')}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/scholarships')}
          className="inline-flex items-center text-sm font-medium text-gray-500 hover:text-gray-900"
        >
          <ArrowLeft className="mr-1 h-4 w-4" /> {t('back_to_list')}</button>
        
        <div className="flex gap-2">
          {data.status !== 'READY_TO_REVIEW' && data.status !== 'PUBLISHED' && (
             <button 
                onClick={() => handleAction('mark-ready', 'Mark Ready to Review')}
                className="px-3 py-1.5 text-sm font-medium bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50"
             >
                {t('mark_ready')}</button>
          )}
          {data.completenessStatus === 'COMPLETE' && data.status === 'READY_TO_REVIEW' && (
             <button 
                onClick={() => handleAction('mark-publishable', 'Mark Ready to Publish')}
                className="px-3 py-1.5 text-sm font-medium bg-blue-50 text-blue-700 border border-blue-200 rounded shadow-sm hover:bg-blue-100"
             >
                {t('ready_to_publish')}</button>
          )}
          {data.status === 'READY_TO_PUBLISH' && (
             <button 
                onClick={() => handleAction('publish', 'Publish')}
                className="px-3 py-1.5 text-sm font-medium bg-green-600 text-white rounded shadow-sm hover:bg-green-700"
             >
                {t('publish')}</button>
          )}
          {data.status === 'PUBLISHED' && (
             <button 
                onClick={() => handleAction('unpublish', 'Unpublish')}
                className="px-3 py-1.5 text-sm font-medium bg-yellow-100 text-yellow-800 border border-yellow-200 rounded shadow-sm hover:bg-yellow-200"
             >
                {t('unpublish')}</button>
          )}
          <button 
            onClick={() => handleAction('archive', 'Archive')}
            className="px-3 py-1.5 text-sm font-medium bg-gray-100 text-gray-800 border border-gray-200 rounded shadow-sm hover:bg-gray-200"
          >
            {t('archive')}</button>
          <button 
            onClick={() => handleAction('reject', 'Reject')}
            className="px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded"
          >
            {t('reject')}</button>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="mb-6 flex flex-col md:flex-row justify-between items-start gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">{data.displayName}</h2>
            <div className="flex gap-2">
               <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                  {t('status_1')}{data.status}
               </span>
               <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${data.completenessStatus === 'COMPLETE' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                  {t('completeness_1')}{data.completenessStatus}
               </span>
            </div>
          </div>
          <div className="text-right text-xs text-gray-400 max-w-sm break-all">
            <div>{t('id')}{data.id}</div>
            <div>{t('public_id')}{data.publicId}</div>
            {data.sourceImportRecordId && <div>{t('source')}{data.sourceImportRecordId}</div>}
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 flex items-start gap-3 rounded text-red-800 text-sm border border-red-200">
            <XCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}
        
        {successMsg && (
          <div className="mb-6 p-4 bg-green-50 flex items-start gap-3 rounded text-green-800 text-sm border border-green-200">
            <CheckCircle2 className="h-5 w-5 shrink-0" />
            <p>{successMsg}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{t('basic_info')}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('scholarship_name')}</label>
              <input type="text" value={formData.displayName || ''} onChange={(e) => setFormData({...formData, displayName: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('sponsor_name')}</label>
              <input type="text" value={formData.sponsorName || ''} onChange={(e) => setFormData({...formData, sponsorName: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('degree_level')}</label>
              <input type="text" value={formData.degreeLevel || ''} onChange={(e) => setFormData({...formData, degreeLevel: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('study_language')}</label>
              <input type="text" value={formData.studyLanguage || ''} onChange={(e) => setFormData({...formData, studyLanguage: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('study_country')}</label>
              <input type="text" value={formData.studyCountry || ''} onChange={(e) => setFormData({...formData, studyCountry: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{t('funding_links')}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('funding_coverage')}</label>
              <input type="text" value={formData.fundingCoverage || ''} onChange={(e) => setFormData({...formData, fundingCoverage: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('amount')}</label>
                <input type="text" value={formData.fundingAmount || ''} onChange={(e) => setFormData({...formData, fundingAmount: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
              </div>
              <div className="w-1/3">
                <label className="block text-xs font-medium text-gray-700 mb-1">{t('currency')}</label>
                <input type="text" value={formData.currency || ''} onChange={(e) => setFormData({...formData, currency: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('duration')}</label>
              <input type="text" value={formData.duration || ''} onChange={(e) => setFormData({...formData, duration: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('application_deadline')}</label>
              <input type="text" value={formData.applicationDeadline || ''} onChange={(e) => setFormData({...formData, applicationDeadline: e.target.value})} placeholder={t('yyyy_mm_dd')} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('application_link')}</label>
              <input type="url" value={formData.applicationLink || ''} onChange={(e) => setFormData({...formData, applicationLink: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('official_source_url')}</label>
              <input type="url" value={formData.officialSourceUrl || ''} onChange={(e) => setFormData({...formData, officialSourceUrl: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
            </div>
          </div>
          
          <div className="space-y-4">
            <h3 className="text-sm font-semibold text-gray-900 border-b pb-2">{t('target_arrays')}</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('eligible_majors_json_array_string')}</label>
              <input type="text" value={typeof formData.eligibleMajorsOrFields === 'string' ? formData.eligibleMajorsOrFields : JSON.stringify(formData.eligibleMajorsOrFields || [])} onChange={(e) => setFormData({...formData, eligibleMajorsOrFields: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('target_universities_json_array_string')}</label>
              <input type="text" value={typeof formData.targetUniversities === 'string' ? formData.targetUniversities : JSON.stringify(formData.targetUniversities || [])} onChange={(e) => setFormData({...formData, targetUniversities: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono focus:ring-1 focus:ring-black" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{t('target_programs_json_array_string')}</label>
              <input type="text" value={typeof formData.targetAcademicPrograms === 'string' ? formData.targetAcademicPrograms : JSON.stringify(formData.targetAcademicPrograms || [])} onChange={(e) => setFormData({...formData, targetAcademicPrograms: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm font-mono focus:ring-1 focus:ring-black" />
            </div>
          </div>
        </div>
        
        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
             <label className="block text-xs font-medium text-gray-700 mb-1">{t('coverage_details')}</label>
             <textarea rows={3} value={formData.coverageDetails || ''} onChange={(e) => setFormData({...formData, coverageDetails: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
          </div>
          <div>
             <label className="block text-xs font-medium text-gray-700 mb-1">{t('eligibility_criteria')}</label>
             <textarea rows={3} value={formData.eligibilityCriteria || ''} onChange={(e) => setFormData({...formData, eligibilityCriteria: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
          </div>
          <div className="md:col-span-2">
             <label className="block text-xs font-medium text-gray-700 mb-1">{t('required_documents')}</label>
             <textarea rows={3} value={formData.requiredDocuments || ''} onChange={(e) => setFormData({...formData, requiredDocuments: e.target.value})} className="w-full rounded border border-gray-300 px-3 py-1.5 text-sm focus:ring-1 focus:ring-black" />
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 flex justify-end">
          <button 
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-2 bg-black text-white px-5 py-2 rounded text-sm font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {t('save_changes')}</button>
        </div>
      </div>
    </div>
  );
}
