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
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <BriefcaseBusiness className="h-4 w-4 text-[#21A7B4]" />
              <span>منظومة التوظيف ومسارات الخريجين</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">{t('career_alumni')}</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">{t('manage_recruitment_employer_metadata_and_career_op')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <div className="relative">
              <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)} className="appearance-none bg-white/10 border border-white/20 rounded-xl py-2.5 pl-3 pr-10 text-sm focus:outline-none text-white focus:ring-1 focus:ring-[#21A7B4]">
                <option value="" className="text-slate-900">{t('all_statuses')}</option>
                {jobStatuses.map((status) => <option key={status} value={status} className="text-slate-900">{formatLabel(status)}</option>)}
              </select>
              <Filter className="absolute right-3 top-3 h-4 w-4 text-cyan-200 pointer-events-none" />
            </div>
            <div className="min-w-64"><CanonicalPicker label={t('country_filter')} value={countryFilter} onChange={(id) => setCountryFilter(id || '')} load={() => canonicalPickerApi.countries()} reloadKey="career-filter-countries" optional /></div>
            <button onClick={loadJobs} className="rounded-xl bg-[#21A7B4] px-4 py-2.5 text-sm font-black text-white hover:bg-[#1A8D99] transition shadow-md">{t('apply')}</button>
          </div>
        </div>
      </section>

      {message && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 rounded-2xl text-xs font-bold">{message}</div>}
      {error && <div className="bg-rose-50 border border-rose-200 text-rose-700 px-4 py-3 rounded-2xl text-xs font-bold">{error}</div>}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 bg-white border border-slate-200/90 rounded-3xl shadow-xs overflow-hidden">
          <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between">
            <h2 className="font-black text-[#142B5F]">سجل الفرص والوظائف ({jobs?.total ?? 0})</h2>
            <span className="text-xs font-bold text-slate-500">محدث لحظياً</span>
          </div>
          {loading && !jobs ? (
            <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-[#0E7C86]" /></div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse text-xs">
                <thead>
                  <tr className="bg-[#FAF7F0] border-b border-slate-100 font-black text-[#142B5F]">
                    <th className="px-5 py-3.5">{t('opportunity')}</th>
                    <th className="px-4 py-3.5">{t('employer')}</th>
                    <th className="px-4 py-3.5">{t('location')}</th>
                    <th className="px-4 py-3.5">{t('status')}</th>
                    <th className="px-5 py-3.5 text-left">{t('actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {jobs?.data.length ? jobs.data.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50/70 transition align-top">
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#142B5F] text-sm">{job.title}</div>
                        <div className="text-[11px] font-semibold text-[#0E7C86] mt-0.5">{formatLabel(job.opportunityType)} · {formatLabel(job.employmentType)}</div>
                        <div className="text-xs text-slate-600 mt-1 line-clamp-2">{job.description}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="font-bold text-slate-800">{job.employer?.displayName || job.employerId}</div>
                        {job.employer && <div className="mt-1"><EmployerStatusBadge status={job.employer.verificationStatus} /></div>}
                        <div className="text-[11px] text-slate-500 mt-1">{job.jobCategory}</div>
                      </td>
                      <td className="px-4 py-4 text-slate-600 font-medium">
                        {job.remoteOption ? <span className="text-[#0E7C86] font-bold">عن بُعد / </span> : ''}
                        {job.city ? `${job.city}، ` : ''}{job.country}
                      </td>
                      <td className="px-4 py-4"><StatusBadge status={job.status} /></td>
                      <td className="px-5 py-4 text-left">
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button onClick={() => beginJobEdit(job)} className="rounded-xl border border-slate-200 px-2.5 py-1 text-xs font-bold text-[#142B5F] hover:bg-slate-50 inline-flex items-center gap-1 transition">
                            <BriefcaseBusiness className="h-3.5 w-3.5 text-[#0E7C86]" /> {t('review')}</button>
                          <button onClick={() => transitionJob(job, 'mark-publishable')} disabled={saving || job.status !== 'READY_TO_REVIEW'} className="rounded-xl border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-bold text-indigo-700 hover:bg-indigo-100 disabled:opacity-40 inline-flex items-center gap-1 transition">
                            <CheckCircle2 className="h-3.5 w-3.5" /> {t('ready')}</button>
                          <button onClick={() => transitionJob(job, 'publish')} disabled={saving || job.status !== 'READY_TO_PUBLISH'} className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-40 inline-flex items-center gap-1 transition">
                            <Send className="h-3.5 w-3.5" /> {t('publish')}</button>
                          <button onClick={() => transitionJob(job, 'archive')} disabled={saving} className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-40 inline-flex items-center gap-1 transition">
                            <Archive className="h-3.5 w-3.5" /> {t('archive')}</button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-400 font-bold">{t('no_career_opportunities_found')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <section className="bg-white border border-slate-200/90 rounded-3xl shadow-xs p-6">
            <div className="flex items-center justify-between gap-3 mb-4 border-b border-slate-100 pb-3">
              <div>
                <h3 className="font-black text-[#142B5F] text-base">جهات التوظيف المعتمدة</h3>
                <p className="text-xs text-slate-500 mt-0.5">لا يمكن نشر فرصة عامة قبل توثيق الجهة.</p>
              </div>
              <span className="rounded-full bg-teal-50 text-[#0E7C86] font-black px-3 py-1 text-xs">{employers.length}</span>
            </div>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
              {employers.length ? employers.map((employer) => (
                <div key={employer.id} className="border border-slate-100 rounded-2xl p-3 flex items-center justify-between gap-3 bg-slate-50/50 hover:bg-white transition">
                  <div className="min-w-0">
                    <div className="font-bold text-sm text-[#142B5F] truncate">{employer.displayName}</div>
                    <div className="mt-1"><EmployerStatusBadge status={employer.verificationStatus} /></div>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    <button type="button" onClick={() => void transitionEmployer(employer, 'verify')} disabled={saving || employer.verificationStatus === 'VERIFIED'} className="rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700 hover:bg-emerald-100 disabled:opacity-35 inline-flex items-center gap-1 text-xs transition">
                      <ShieldCheck className="h-3.5 w-3.5" /> توثيق
                    </button>
                    <button type="button" onClick={() => void transitionEmployer(employer, 'suspend')} disabled={saving || employer.verificationStatus === 'SUSPENDED'} className="rounded-xl border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-700 hover:bg-rose-100 disabled:opacity-35 inline-flex items-center gap-1 text-xs transition">
                      <Ban className="h-3.5 w-3.5" /> تعليق
                    </button>
                  </div>
                </div>
              )) : <p className="text-xs text-slate-400 font-bold text-center py-4">لا توجد جهات توظيف مسجلة.</p>}
            </div>
          </section>

          <form onSubmit={createEmployer} className="bg-white border border-slate-200/90 rounded-3xl shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <Plus className="h-5 w-5 text-[#0E7C86]" />
              <h3 className="font-black text-[#142B5F] text-base">{t('add_recruitment_employer')}</h3>
            </div>
            <Field label={t('display_name')} value={employerForm.displayName} onChange={(value) => setEmployerForm({ ...employerForm, displayName: value })} placeholder="اسم الشركة أو المؤسسة" />
            <Field label={t('employer_type')} value={employerForm.employerType} onChange={(value) => setEmployerForm({ ...employerForm, employerType: value })} placeholder="PRIVATE_COMPANY" />
            <Field label={t('industry')} value={employerForm.industry} onChange={(value) => setEmployerForm({ ...employerForm, industry: value })} optional placeholder="القطاع أو المجال الصناعي" />
            <CanonicalPicker label={t('country')} value={employerForm.countryReferenceId} onChange={(id, option) => { setEmployerCountryIso2(option?.code || ''); setEmployerForm({ ...employerForm, countryReferenceId: id || '', cityReferenceId: '' }); }} load={() => canonicalPickerApi.countries()} reloadKey="career-employer-countries" optional />
            <CanonicalPicker label={t('city')} value={employerForm.cityReferenceId} onChange={(id) => setEmployerForm({ ...employerForm, cityReferenceId: id || '' })} load={() => canonicalPickerApi.cities(employerCountryIso2 || undefined)} reloadKey={`career-employer-cities:${employerCountryIso2}`} optional disabled={!employerForm.countryReferenceId} />
            <Field label={t('website_url')} value={employerForm.websiteUrl} onChange={(value) => setEmployerForm({ ...employerForm, websiteUrl: value })} optional placeholder="https://example.com" />
            <Field label={t('logo_asset_id')} value={employerForm.logoAssetId} onChange={(value) => setEmployerForm({ ...employerForm, logoAssetId: value })} optional placeholder="معرف أصل الشعار" />
            <TextArea label={t('description')} value={employerForm.description} onChange={(value) => setEmployerForm({ ...employerForm, description: value })} rows={3} optional placeholder="نبذة تعريفية عن جهة التوظيف..." />
            <button type="submit" disabled={saving || !employerForm.displayName || !employerForm.employerType} className="w-full inline-flex items-center justify-center gap-2 bg-[#0E7C86] hover:bg-[#142B5F] text-white rounded-2xl px-4 py-2.5 text-xs font-black shadow-md transition disabled:opacity-50">
              {t('create_employer')}</button>
          </form>

          <form onSubmit={saveJob} className="bg-white border border-slate-200/90 rounded-3xl shadow-xs p-6 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
              <BriefcaseBusiness className="h-5 w-5 text-[#0E7C86]" />
              <h3 className="font-black text-[#142B5F] text-base">{selectedJob ? `تعديل: ${selectedJob.title}` : t('create_job_posting')}</h3>
            </div>
            <Field label={t('title')} value={jobForm.title} onChange={(value) => setJobForm({ ...jobForm, title: value })} placeholder="مسمى الفرصة الوظيفية أو التدريبية" />
            <SelectField label={t('employer')} value={jobForm.employerId} values={employers.map((employer) => ({ label: employer.displayName, value: employer.id }))} onChange={(value) => setJobForm({ ...jobForm, employerId: value })} />
            <SelectField label={t('opportunity_type')} value={jobForm.opportunityType} values={opportunityTypes.map((value) => ({ label: formatLabel(value), value }))} onChange={(value) => setJobForm({ ...jobForm, opportunityType: value as CareerOpportunityType })} />
            <SelectField label={t('employment_type')} value={jobForm.employmentType} values={employmentTypes.map((value) => ({ label: formatLabel(value), value }))} onChange={(value) => setJobForm({ ...jobForm, employmentType: value as EmploymentType })} />
            <Field label={t('category')} value={jobForm.jobCategory} onChange={(value) => setJobForm({ ...jobForm, jobCategory: value })} placeholder="مجال الوظيفة (تقنية معلومات، هندسة، تسويق...)" />
            <TextArea label={t('description')} value={jobForm.description} onChange={(value) => setJobForm({ ...jobForm, description: value })} rows={4} placeholder="تفاصيل الفرصة والمهام المطلوبة..." />
            <div className="grid grid-cols-2 gap-2">
              <CanonicalPicker label={t('country')} value={jobForm.countryReferenceId} onChange={(id, option) => { setJobCountryIso2(option?.code || ''); setJobForm({ ...jobForm, countryReferenceId: id || '', cityReferenceId: '' }); }} load={() => canonicalPickerApi.countries()} reloadKey="career-job-countries" />
              <CanonicalPicker label={t('city')} value={jobForm.cityReferenceId} onChange={(id) => setJobForm({ ...jobForm, cityReferenceId: id || '' })} load={() => canonicalPickerApi.cities(jobCountryIso2 || undefined)} reloadKey={`career-job-cities:${jobCountryIso2}`} optional disabled={!jobForm.countryReferenceId} />
            </div>
            <Field label={t('required_skills')} value={jobForm.requiredSkills} onChange={(value) => setJobForm({ ...jobForm, requiredSkills: value })} placeholder="React, TypeScript, SQL..." optional />
            <Field label={t('languages')} value={jobForm.languageRequirements} onChange={(value) => setJobForm({ ...jobForm, languageRequirements: value })} placeholder="العربية، الإنجليزية..." optional />
            <Field label={t('external_posting_url')} value={jobForm.externalPostingUrl} onChange={(value) => setJobForm({ ...jobForm, externalPostingUrl: value })} placeholder="https://careers.example.com/job/123" optional />
            <label className="block">
              <span className="text-xs font-bold text-slate-700">{t('application_deadline')}<span className="text-slate-400 font-normal"> ({t('optional')})</span></span>
              <input type="date" value={jobForm.applicationDeadline} onChange={(event) => setJobForm({ ...jobForm, applicationDeadline: event.target.value })} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4] transition" />
            </label>
            <label className="flex items-center justify-between gap-3 text-xs font-bold text-slate-700 bg-slate-50 p-3 rounded-xl border border-slate-100">
              <span>{t('remote_option')}</span>
              <input type="checkbox" checked={jobForm.remoteOption} onChange={(event) => setJobForm({ ...jobForm, remoteOption: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-[#0E7C86] focus:ring-[#0E7C86]" />
            </label>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={saving || !jobForm.title || !jobForm.employerId || !jobForm.jobCategory || !jobForm.description || !jobForm.countryReferenceId} className="flex-1 inline-flex items-center justify-center gap-2 bg-[#0E7C86] hover:bg-[#142B5F] text-white rounded-2xl px-4 py-2.5 text-xs font-black shadow-md transition disabled:opacity-50">
                {selectedJob ? 'حفظ تعديلات الفرصة' : t('create_job')}
              </button>
              {selectedJob ? (
                <button type="button" onClick={cancelJobEdit} disabled={saving} className="rounded-2xl border border-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition">إلغاء التعديل</button>
              ) : null}
            </div>
          </form>

          {selectedJob && (
            <div className="bg-white border border-slate-200/90 rounded-3xl shadow-xs p-6 text-xs">
              <h3 className="font-black text-[#142B5F] mb-2 text-sm">{t('selected_opportunity')}</h3>
              <p className="font-bold text-slate-800">{selectedJob.title}</p>
              <p className="font-mono text-[#0E7C86] mt-1">{selectedJob.publicId}</p>
              <p className="text-slate-600 mt-3 leading-6">{selectedJob.description}</p>
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
      <span className="text-xs font-bold text-slate-700">{label} {optional && <span className="text-slate-400 font-normal">({t('optional')})</span>}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4] transition" />
    </label>
  );
}

function TextArea({ label, value, onChange, rows, placeholder, optional }: { label: string; value: string; onChange: (value: string) => void; rows: number; placeholder?: string; optional?: boolean }) {
  const { t } = useTranslation();
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">{label} {optional && <span className="text-slate-400 font-normal">({t('optional')})</span>}</span>
      <textarea value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} rows={rows} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4] transition" />
    </label>
  );
}

function SelectField({ label, value, values, onChange }: { label: string; value: string; values: Array<{ label: string; value: string }>; onChange: (value: string) => void }) {
  const { t } = useTranslation();
  return (
    <label className="block">
      <span className="text-xs font-bold text-slate-700">{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 w-full border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold outline-none focus:border-[#21A7B4] bg-white transition">
        <option value="">{t('select')}</option>
        {values.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
      </select>
    </label>
  );
}

function EmployerStatusBadge({ status }: { status: CareerEmployerStatus }) {
  const classes: Record<CareerEmployerStatus, string> = {
    UNVERIFIED: 'bg-amber-50 text-amber-800 border border-amber-200',
    VERIFIED: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
    SUSPENDED: 'bg-rose-50 text-rose-800 border border-rose-200'
  };
  return <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-black ${classes[status]}`}>{formatLabel(status)}</span>;
}

function StatusBadge({ status }: { status: CareerJobStatus }) {
  const classes: Record<CareerJobStatus, string> = {
    DRAFT: 'bg-slate-100 text-slate-700 border border-slate-200',
    READY_TO_REVIEW: 'bg-cyan-50 text-cyan-700 border border-cyan-200',
    READY_TO_PUBLISH: 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    PUBLISHED: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    EXPIRED: 'bg-amber-50 text-amber-700 border border-amber-200',
    REJECTED: 'bg-rose-50 text-rose-700 border border-rose-200',
    ARCHIVED: 'bg-slate-100 text-slate-600 border border-slate-200'
  };
  return <span className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-black ${classes[status]}`}>{formatLabel(status)}</span>;
}

function splitList(value: string): string[] {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function formatLabel(value: string) {
  const arabicMap: Record<string, string> = {
    JOB: 'وظيفة',
    INTERNSHIP: 'تدريب مهني',
    GRADUATE_PROGRAM: 'برنامج خريجين',
    MENTORSHIP: 'إرشاد وتوجيه',
    CAREER_EVENT: 'فعالية توظيف',
    FULL_TIME: 'دوام كامل',
    PART_TIME: 'دوام جزئي',
    CONTRACT: 'عقد',
    REMOTE: 'عن بُعد',
    HYBRID: 'مدمج (حضوري وعن بعد)',
    UNVERIFIED: 'غير موثقة',
    VERIFIED: 'موثقة رسمياً',
    SUSPENDED: 'معلقة',
    DRAFT: 'مسودة',
    READY_TO_REVIEW: 'جاهز للمراجعة',
    READY_TO_PUBLISH: 'جاهز للنشر',
    PUBLISHED: 'منشور',
    EXPIRED: 'منتهي الصلاحية',
    REJECTED: 'مرفوض',
    ARCHIVED: 'مؤرشف'
  };
  return arabicMap[value] || value.toLowerCase().replace(/_/g, ' ').replace(/-/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}
