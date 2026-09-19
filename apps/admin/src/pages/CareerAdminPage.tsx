import { FormEvent, useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';
import { Archive, BriefcaseBusiness, CheckCircle2, Filter, Loader2, Plus, Send, ShieldCheck, Ban } from 'lucide-react';
import { useTranslation } from "../i18n/I18nProvider";
import { CanonicalPicker } from '../components/CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';

type CareerJobStatus = 'DRAFT' | 'READY_TO_REVIEW' | 'READY_TO_PUBLISH' | 'PUBLISHED' | 'EXPIRED' | 'REJECTED' | 'ARCHIVED';
type CareerOpportunityType = 'JOB' | 'INTERNSHIP' | 'GRADUATE_PROGRAM' | 'MENTORSHIP' | 'CAREER_EVENT';
type EmploymentType = 'FULL_TIME' | 'PART_TIME' | 'CONTRACT' | 'INTERNSHIP' | 'REMOTE' | 'HYBRID';
type CareerEmployerStatus = 'UNVERIFIED' | 'VERIFIED' | 'SUSPENDED';

interface CareerEmployer {
  id: string;
  publicId: string;
  slug: string;
  displayName: string;
  employerType: string;
  industry?: string | null;
  country?: string | null;
  city?: string | null;
  countryReferenceId?: string | null;
  cityReferenceId?: string | null;
  websiteUrl?: string | null;
  logoAssetId?: string | null;
  verificationStatus: CareerEmployerStatus;
  description?: string | null;
  updatedAt: string;
  version: number;
}

interface CareerJobPosting {
  id: string;
  publicId: string;
  slug: string;
  title: string;
  opportunityType: CareerOpportunityType;
  employmentType: EmploymentType;
  jobCategory: string;
  description: string;
  country: string;
  city?: string | null;
  countryReferenceId?: string | null;
  cityReferenceId?: string | null;
  status: CareerJobStatus;
  employerId: string;
  employer?: CareerEmployer;
  recruiterContactId?: string | null;
  applicationDeadline?: string | null;
  externalPostingUrl?: string | null;
  requiredSkills?: string[] | null;
  educationRequirement?: string | null;
  languageRequirements?: string[] | null;
  remoteOption: boolean;
  updatedAt: string;
  version: number;
}

interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

const opportunityTypes: CareerOpportunityType[] = ['JOB', 'INTERNSHIP', 'GRADUATE_PROGRAM', 'MENTORSHIP', 'CAREER_EVENT'];
const employmentTypes: EmploymentType[] = ['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'REMOTE', 'HYBRID'];
const jobStatuses: CareerJobStatus[] = ['READY_TO_REVIEW', 'READY_TO_PUBLISH', 'PUBLISHED', 'EXPIRED', 'REJECTED', 'ARCHIVED'];

const emptyEmployerForm = {
  displayName: '',
  employerType: 'PRIVATE_COMPANY',
  industry: '',
  countryReferenceId: '',
  cityReferenceId: '',
  websiteUrl: '',
  logoAssetId: '',
  description: ''
};

const emptyJobForm = {
  title: '',
  opportunityType: 'JOB' as CareerOpportunityType,
  employmentType: 'FULL_TIME' as EmploymentType,
  jobCategory: '',
  description: '',
  countryReferenceId: '',
  cityReferenceId: '',
  employerId: '',
  recruiterContactId: '',
  applicationDeadline: '',
  externalPostingUrl: '',
  requiredSkills: '',
  educationRequirement: '',
  languageRequirements: '',
  remoteOption: false
};

export function CareerAdminPage() {
    const { t } = useTranslation();
  const [employers, setEmployers] = useState<CareerEmployer[]>([]);
  const [jobs, setJobs] = useState<PaginatedResult<CareerJobPosting> | null>(null);
  const [selectedJob, setSelectedJob] = useState<CareerJobPosting | null>(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [countryFilter, setCountryFilter] = useState('');
  const [employerCountryIso2, setEmployerCountryIso2] = useState('');
  const [jobCountryIso2, setJobCountryIso2] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [employerForm, setEmployerForm] = useState(emptyEmployerForm);
  const [jobForm, setJobForm] = useState(emptyJobForm);

  const loadEmployers = async () => {
    const response = await adminApiClient.request<PaginatedResult<CareerEmployer>>('/admin/careers/employers?page=1&pageSize=50');
    setEmployers(response.data);
    if (!jobForm.employerId && response.data[0]) {
      setJobForm((current) => ({ ...current, employerId: response.data[0].id }));
    }
  };

  const loadJobs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: '1', pageSize: '20' });
      if (statusFilter) params.append('status', statusFilter);
      if (countryFilter) params.append('countryReferenceId', countryFilter);
      const response = await adminApiClient.request<PaginatedResult<CareerJobPosting>>(`/admin/careers/jobs?${params.toString()}`);
      setJobs(response);
    } catch (err: any) {
      setError(err.message || 'Unable to load career jobs.');
    } finally {
      setLoading(false);
    }
  };

  const transitionEmployer = async (employer: CareerEmployer, action: 'verify' | 'suspend') => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const updated = await adminApiClient.request<CareerEmployer>(`/admin/careers/employers/${employer.id}/${action}`, { method: 'POST', body: JSON.stringify({ expectedVersion: employer.version }) });
      setMessage(`${updated.displayName}: ${formatLabel(updated.verificationStatus)}`);
      await loadEmployers();
      await loadJobs();
    } catch (err: any) {
      setError(err.message || 'Unable to update employer status.');
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    loadEmployers().catch((err) => setError(err.message || 'Unable to load employers.'));
    loadJobs();
  }, [statusFilter]);

  const createEmployer = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const employer = await adminApiClient.request<CareerEmployer>('/admin/careers/employers', {
        method: 'POST',
        body: JSON.stringify({
          displayName: employerForm.displayName.trim(),
          employerType: employerForm.employerType.trim(),
          industry: employerForm.industry.trim() || null,
          countryReferenceId: employerForm.countryReferenceId || null,
          cityReferenceId: employerForm.cityReferenceId || null,
          websiteUrl: employerForm.websiteUrl.trim() || null,
          logoAssetId: employerForm.logoAssetId.trim() || null,
          description: employerForm.description.trim() || null
        })
      });
      setMessage(`Employer created: ${employer.displayName}`);
      setEmployerForm(emptyEmployerForm);
      setEmployerCountryIso2('');
      await loadEmployers();
      setJobForm((current) => ({ ...current, employerId: employer.id }));
    } catch (err: any) {
      setError(err.message || 'Unable to create employer.');
    } finally {
      setSaving(false);
    }
  };

  const beginJobEdit = (job: CareerJobPosting) => {
    setSelectedJob(job);
    setJobForm({
      title: job.title,
      opportunityType: job.opportunityType,
      employmentType: job.employmentType,
      jobCategory: job.jobCategory,
      description: job.description,
      countryReferenceId: job.countryReferenceId ?? '',
      cityReferenceId: job.cityReferenceId ?? '',
      employerId: job.employerId,
      recruiterContactId: job.recruiterContactId ?? '',
      applicationDeadline: job.applicationDeadline ? job.applicationDeadline.slice(0, 10) : '',
      externalPostingUrl: job.externalPostingUrl ?? '',
      requiredSkills: (job.requiredSkills ?? []).join(', '),
      educationRequirement: job.educationRequirement ?? '',
      languageRequirements: (job.languageRequirements ?? []).join(', '),
      remoteOption: job.remoteOption,
    });
    setMessage(null);
    setError(null);
  };

  const cancelJobEdit = () => {
    setSelectedJob(null);
    setJobForm({ ...emptyJobForm, employerId: employers[0]?.id ?? '' });
    setJobCountryIso2('');
  };

  const saveJob = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      const editing = selectedJob;
      const job = await adminApiClient.request<CareerJobPosting>(
        editing ? `/admin/careers/jobs/${editing.id}` : '/admin/careers/jobs',
        {
          method: editing ? 'PATCH' : 'POST',
          body: JSON.stringify(
            editing
              ? { ...buildJobPayload(), expectedVersion: editing.version }
              : buildJobPayload(),
          ),
        },
      );
      setMessage(`${editing ? 'Job updated' : 'Job created'}: ${job.title}`);
      setSelectedJob(null);
      setJobForm({ ...emptyJobForm, employerId: job.employerId });
      setJobCountryIso2('');
      await loadJobs();
    } catch (err: any) {
      setError(err.message || `Unable to ${selectedJob ? 'update' : 'create'} job.`);
    } finally {
      setSaving(false);
    }
  };

  const transitionJob = async (job: CareerJobPosting, action: 'mark-publishable' | 'publish' | 'archive') => {
    setSaving(true);
    setMessage(null);
    setError(null);
    try {
      await adminApiClient.request(`/admin/careers/jobs/${job.id}/${action}`, { method: 'POST', body: JSON.stringify({ expectedVersion: job.version }) });
      setMessage(`Job action completed: ${formatLabel(action)}`);
      await loadJobs();
    } catch (err: any) {
      setError(err.message || 'Unable to update job.');
    } finally {
      setSaving(false);
    }
  };

  const buildJobPayload = () => ({
    title: jobForm.title.trim(),
    opportunityType: jobForm.opportunityType,
    employmentType: jobForm.employmentType,
    jobCategory: jobForm.jobCategory.trim(),
    description: jobForm.description.trim(),
    countryReferenceId: jobForm.countryReferenceId,
    cityReferenceId: jobForm.cityReferenceId || null,
    employerId: jobForm.employerId,
    recruiterContactId: jobForm.recruiterContactId.trim() || null,
    applicationDeadline: jobForm.applicationDeadline ? new Date(jobForm.applicationDeadline).toISOString() : null,
    externalPostingUrl: jobForm.externalPostingUrl.trim() || null,
    requiredSkills: splitList(jobForm.requiredSkills),
    educationRequirement: jobForm.educationRequirement.trim() || null,
    languageRequirements: splitList(jobForm.languageRequirements),
    remoteOption: jobForm.remoteOption
  });

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold">{t('career_alumni')}</h2>
          <p className="text-sm text-gray-500 mt-1">{t('manage_recruitment_employer_metadata_and_career_op')}</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="appearance-none bg-white border border-gray-300 rounded-md py-2 pl-3 pr-10 text-sm focus:outline-none focus:ring-1 focus:ring-[#142B5F]">
              <option value="">{t('all_statuses')}</option>
              {jobStatuses.map((status) => <option key={status} value={status}>{formatLabel(status)}</option>)}
            </select>
            <Filter className="absolute right-3 top-2.5 h-4 w-4 text-gray-400 pointer-events-none" />
          </div>
          <div className="min-w-64"><CanonicalPicker label={t('country_filter')} value={countryFilter} onChange={(id) => setCountryFilter(id || '')} load={() => canonicalPickerApi.countries()} reloadKey="career-filter-countries" optional /></div>
          <button onClick={loadJobs} className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white hover:bg-gray-50">{t('apply')}</button>
        </div>
      </div>

      {message && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">{message}</div>}
      {error && <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
          {loading && !jobs ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-gray-400" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase tracking-wider text-gray-500">
                    <th className="px-6 py-3 font-medium">{t('opportunity')}</th>
                    <th className="px-6 py-3 font-medium">{t('employer')}</th>
                    <th className="px-6 py-3 font-medium">{t('location')}</th>
                    <th className="px-6 py-3 font-medium">{t('status')}</th>
                    <th className="px-6 py-3 font-medium text-right">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {jobs?.data.length ? jobs.data.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-50 align-top">
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">{job.title}</div>
                        <div className="text-xs text-gray-500">{formatLabel(job.opportunityType)} / {formatLabel(job.employmentType)}</div>
                        <div className="text-xs text-gray-500 mt-1 line-clamp-2">{job.description}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium">{job.employer?.displayName || job.employerId}</div>
                        {job.employer && <div className="mt-1"><EmployerStatusBadge status={job.employer.verificationStatus} /></div>}
                        <div className="text-xs text-gray-500 mt-1">{job.jobCategory}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{job.remoteOption ? 'Remote / ' : ''}{job.city ? `${job.city}, ` : ''}{job.country}</td>
                      <td className="px-6 py-4"><StatusBadge status={job.status} /></td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex flex-wrap justify-end gap-2">
                          <button onClick={() => beginJobEdit(job)} className="text-blue-600 hover:text-blue-800 inline-flex items-center gap-1">
                            <BriefcaseBusiness className="h-4 w-4" /> {t('review')}</button>
                          <button onClick={() => transitionJob(job, 'mark-publishable')} disabled={saving || job.status !== 'READY_TO_REVIEW'} className="text-indigo-600 hover:text-indigo-800 disabled:opacity-40 inline-flex items-center gap-1">
                            <CheckCircle2 className="h-4 w-4" /> {t('ready')}</button>
                          <button onClick={() => transitionJob(job, 'publish')} disabled={saving || job.status !== 'READY_TO_PUBLISH'} className="text-green-600 hover:text-green-800 disabled:opacity-40 inline-flex items-center gap-1">
                            <Send className="h-4 w-4" /> {t('publish')}</button>
                          <button onClick={() => transitionJob(job, 'archive')} disabled={saving} className="text-gray-600 hover:text-gray-800 disabled:opacity-40 inline-flex items-center gap-1">
                            <Archive className="h-4 w-4" /> {t('archive')}</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-6 py-10 text-center text-gray-500">{t('no_career_opportunities_found')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <div className="flex items-center justify-between gap-3 mb-3">
              <div>
                <h3 className="font-bold text-[#142B5F]">جهات التوظيف</h3>
                <p className="text-xs text-gray-500 mt-1">لا يمكن نشر فرصة عامة قبل توثيق الجهة.</p>
              </div>
              <span className="text-xs text-gray-500">{employers.length}</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {employers.length ? employers.map((employer) => (
                <div key={employer.id} className="border border-gray-200 rounded-md p-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{employer.displayName}</div>
                    <div className="mt-1"><EmployerStatusBadge status={employer.verificationStatus} /></div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button type="button" onClick={() => void transitionEmployer(employer, 'verify')} disabled={saving || employer.verificationStatus === 'VERIFIED'} className="text-[#142B5F] disabled:opacity-35 inline-flex items-center gap-1 text-xs">
                      <ShieldCheck className="h-4 w-4" /> توثيق
                    </button>
                    <button type="button" onClick={() => void transitionEmployer(employer, 'suspend')} disabled={saving || employer.verificationStatus === 'SUSPENDED'} className="text-red-700 disabled:opacity-35 inline-flex items-center gap-1 text-xs">
                      <Ban className="h-4 w-4" /> تعليق
                    </button>
                  </div>
                </div>
              )) : <p className="text-sm text-gray-500">لا توجد جهات توظيف.</p>}
            </div>
          </section>

          <form onSubmit={createEmployer} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <Plus className="h-5 w-5 text-[#142B5F]" />
              <h3 className="font-bold">{t('add_recruitment_employer')}</h3>
            </div>
            <Field label={t('display_name')} value={employerForm.displayName} onChange={(value) => setEmployerForm({ ...employerForm, displayName: value })} />
            <Field label={t('employer_type')} value={employerForm.employerType} onChange={(value) => setEmployerForm({ ...employerForm, employerType: value })} />
            <Field label={t('industry')} value={employerForm.industry} onChange={(value) => setEmployerForm({ ...employerForm, industry: value })} optional />
            <CanonicalPicker label={t('country')} value={employerForm.countryReferenceId} onChange={(id, option) => { setEmployerCountryIso2(option?.code || ''); setEmployerForm({ ...employerForm, countryReferenceId: id || '', cityReferenceId: '' }); }} load={() => canonicalPickerApi.countries()} reloadKey="career-employer-countries" optional />
            <CanonicalPicker label={t('city')} value={employerForm.cityReferenceId} onChange={(id) => setEmployerForm({ ...employerForm, cityReferenceId: id || '' })} load={() => canonicalPickerApi.cities(employerCountryIso2 || undefined)} reloadKey={`career-employer-cities:${employerCountryIso2}`} optional disabled={!employerForm.countryReferenceId} />
            <Field label={t('website_url')} value={employerForm.websiteUrl} onChange={(value) => setEmployerForm({ ...employerForm, websiteUrl: value })} optional />
            <Field label={t('logo_asset_id')} value={employerForm.logoAssetId} onChange={(value) => setEmployerForm({ ...employerForm, logoAssetId: value })} optional />
            <TextArea label={t('description')} value={employerForm.description} onChange={(value) => setEmployerForm({ ...employerForm, description: value })} rows={3} optional />
            <button type="submit" disabled={saving || !employerForm.displayName || !employerForm.employerType} className="w-full inline-flex items-center justify-center gap-2 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
              {t('create_employer')}</button>
          </form>

          <form onSubmit={saveJob} className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 space-y-4">
            <div className="flex items-center gap-2">
              <BriefcaseBusiness className="h-5 w-5 text-green-600" />
              <h3 className="font-bold">{selectedJob ? `Edit: ${selectedJob.title}` : t('create_job_posting')}</h3>
            </div>
            <Field label={t('title')} value={jobForm.title} onChange={(value) => setJobForm({ ...jobForm, title: value })} />
            <SelectField label={t('employer')} value={jobForm.employerId} values={employers.map((employer) => ({ label: employer.displayName, value: employer.id }))} onChange={(value) => setJobForm({ ...jobForm, employerId: value })} />
            <SelectField label={t('opportunity_type')} value={jobForm.opportunityType} values={opportunityTypes.map((value) => ({ label: formatLabel(value), value }))} onChange={(value) => setJobForm({ ...jobForm, opportunityType: value as CareerOpportunityType })} />
            <SelectField label={t('employment_type')} value={jobForm.employmentType} values={employmentTypes.map((value) => ({ label: formatLabel(value), value }))} onChange={(value) => setJobForm({ ...jobForm, employmentType: value as EmploymentType })} />
            <Field label={t('category')} value={jobForm.jobCategory} onChange={(value) => setJobForm({ ...jobForm, jobCategory: value })} />
            <TextArea label={t('description')} value={jobForm.description} onChange={(value) => setJobForm({ ...jobForm, description: value })} rows={4} />
            <div className="grid grid-cols-2 gap-2">
              <CanonicalPicker label={t('country')} value={jobForm.countryReferenceId} onChange={(id, option) => { setJobCountryIso2(option?.code || ''); setJobForm({ ...jobForm, countryReferenceId: id || '', cityReferenceId: '' }); }} load={() => canonicalPickerApi.countries()} reloadKey="career-job-countries" />
              <CanonicalPicker label={t('city')} value={jobForm.cityReferenceId} onChange={(id) => setJobForm({ ...jobForm, cityReferenceId: id || '' })} load={() => canonicalPickerApi.cities(jobCountryIso2 || undefined)} reloadKey={`career-job-cities:${jobCountryIso2}`} optional disabled={!jobForm.countryReferenceId} />
            </div>
            <Field label={t('required_skills')} value={jobForm.requiredSkills} onChange={(value) => setJobForm({ ...jobForm, requiredSkills: value })} placeholder={t('react_english_sql')} optional />
            <Field label={t('languages')} value={jobForm.languageRequirements} onChange={(value) => setJobForm({ ...jobForm, languageRequirements: value })} optional />
            <Field label={t('external_posting_url')} value={jobForm.externalPostingUrl} onChange={(value) => setJobForm({ ...jobForm, externalPostingUrl: value })} optional />
            <label className="block">
              <span className="text-sm font-medium text-gray-700">{t('application_deadline')}<span className="text-gray-400">{t('optional')}</span></span>
              <input type="date" value={jobForm.applicationDeadline} onChange={(event) => setJobForm({ ...jobForm, applicationDeadline: event.target.value })} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#142B5F]" />
            </label>
            <label className="flex items-center justify-between gap-3 text-sm text-gray-700">
              <span>{t('remote_option')}</span>
              <input type="checkbox" checked={jobForm.remoteOption} onChange={(event) => setJobForm({ ...jobForm, remoteOption: event.target.checked })} />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={saving || !jobForm.title || !jobForm.employerId || !jobForm.jobCategory || !jobForm.description || !jobForm.countryReferenceId} className="flex-1 inline-flex items-center justify-center gap-2 bg-[#142B5F] hover:bg-[#0E7C86] text-white rounded-md px-4 py-2 text-sm font-medium disabled:opacity-50">
                {selectedJob ? 'Save job changes' : t('create_job')}
              </button>
              {selectedJob ? (
                <button type="button" onClick={cancelJobEdit} disabled={saving} className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 disabled:opacity-50">Cancel edit</button>
              ) : null}
            </div>
          </form>

          {selectedJob && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6 text-sm">
              <h3 className="font-bold mb-2">{t('selected_opportunity')}</h3>
              <p className="font-medium">{selectedJob.title}</p>
              <p className="text-gray-500 mt-1">{selectedJob.publicId}</p>
              <p className="text-gray-600 mt-3">{selectedJob.description}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({ label, value, onChange, placeholder, optional }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; optional?: boolean }) {
    const { t } = useTranslation();
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label} {optional && <span className="text-gray-400">{t('optional')}</span>}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#142B5F]" />
    </label>
  );
}

function TextArea({ label, value, onChange, rows, optional }: { label: string; value: string; onChange: (value: string) => void; rows: number; optional?: boolean }) {
    const { t } = useTranslation();
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label} {optional && <span className="text-gray-400">{t('optional')}</span>}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#142B5F]" />
    </label>
  );
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: Array<{ label: string; value: string }>; onChange: (value: string) => void }) {
    const { t } = useTranslation();
  return (
    <label className="block">
      <span className="text-sm font-medium text-gray-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-[#142B5F]">
        <option value="">{t('select')}</option>
        {values.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}

function EmployerStatusBadge({ status }: { status: CareerEmployerStatus }) {
  const classes: Record<CareerEmployerStatus, string> = {
    UNVERIFIED: 'bg-amber-100 text-amber-800',
    VERIFIED: 'bg-green-100 text-green-800',
    SUSPENDED: 'bg-red-100 text-red-800'
  };
  return <span className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ${classes[status]}`}>{formatLabel(status)}</span>;
}

function StatusBadge({ status }: { status: CareerJobStatus }) {
  const classes: Record<CareerJobStatus, string> = {
    DRAFT: 'bg-gray-100 text-gray-700',
    READY_TO_REVIEW: 'bg-blue-100 text-blue-700',
    READY_TO_PUBLISH: 'bg-indigo-100 text-indigo-700',
    PUBLISHED: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
    ARCHIVED: 'bg-gray-200 text-gray-700'
  };
  return <span className={`px-2 py-1 rounded-full text-xs font-semibold ${classes[status]}`}>{formatLabel(status)}</span>;
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function formatLabel(value: string) {
  return value.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
