import { AssetPicker } from '../components/AssetPicker';
import { reviewOwnerSearch } from '../features/review-queue/ReviewOwnerNavigation';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import type { CareerJobPostingDto, CareerEmployerDto, CareerApplicationDto } from '@absheer/domain';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { CanonicalPicker } from '../components/CanonicalPicker';
import { canonicalPickerApi } from '../api/canonicalPickers';
import { CanonicalCityPicker } from '../components/CanonicalCityPicker';
type Tab = 'jobs' | 'employers' | 'applications' | 'alumni';
type Row = { id: string; publicId?: string; title?: string; displayName?: string; status?: string; verificationStatus?: string; visibility?: string; version: number; jobId?: string; };
type Page = { data: Row[]; total: number; totalPages: number; };
const jobStates = ['DRAFT','READY_TO_REVIEW','READY_TO_PUBLISH','PUBLISHED','EXPIRED','REJECTED','ARCHIVED'];
const applicationStates = ['SUBMITTED','UNDER_REVIEW','SHORTLISTED','ACCEPTED','REJECTED','WITHDRAWN'];
const fresh = () => ({ title: '', titleEn: '', description: '', descriptionEn: '', displayName: '', employerType: 'COMPANY', industry: '', websiteUrl: '', logoAssetId: '', countryReferenceId: '', cityReferenceId: '', employerId: '', jobCategory: '', opportunityType: 'JOB', employmentType: 'FULL_TIME', applicationDeadline: '', externalPostingUrl: '', sourceUrl: '', recruitmentCycle: '', applicationChannel: 'EXTERNAL', requiredSkills: '', salaryMin: '', salaryMax: '', currencyCode: 'USD', scale: '2', period: 'MONTH', basis: 'GROSS' });
export function CareerAdminPage() {
  const { language, dir } = useTranslation(), { hasPermission } = useAdminAuthorization();
  const c = (ar: string, en: string) => language === 'ar' ? ar : en;
  const [params, setParams] = useSearchParams();
  const tab = (['jobs','employers','applications','alumni'].includes(params.get('tab') || '') ? params.get('tab') : 'jobs') as Tab;
  const page = Math.max(1, Number(params.get('page')) || 1);
  const [search, setSearch] = useState(() => reviewOwnerSearch(params)), [status, setStatus] = useState(''), [type, setType] = useState('');
  const [employerFilter, setEmployerFilter] = useState(''), [cityFilter, setCityFilter] = useState(''), [jobFilter, setJobFilter] = useState('');
  const [filterCountry, setFilterCountry] = useState(''), [filterCountryCode, setFilterCountryCode] = useState('');
  const [result, setResult] = useState<Page | null>(null), [loading, setLoading] = useState(false), [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState(''), [reload, setReload] = useState(0), [reason, setReason] = useState('');
  const [form, setForm] = useState<Record<string, string>>(fresh()), [editing, setEditing] = useState<Row | null>(null), [editor, setEditor] = useState(false);
  const [countryCode, setCountryCode] = useState(''), [applicationDetail, setApplicationDetail] = useState<CareerApplicationDto | null>(null);
  const [studentMessage, setStudentMessage] = useState(''), [interviewAt, setInterviewAt] = useState('');
  const [reviewChecked, setReviewChecked] = useState(false), [sourceEvidence, setSourceEvidence] = useState(''), [evidenceExpiry, setEvidenceExpiry] = useState('');
  const detailSequence = useRef(0);
  const sequence = useRef(0), mutation = useRef(false), intent = useRef<{ payload: string; key: string } | null>(null);
  const navigatePage = (value: number) => setParams(previous => { const next = new URLSearchParams(previous); next.set('page', String(value)); return next; });
  const load = useCallback(async () => {
    const generation = ++sequence.current; setLoading(true); setNotice(''); setResult(null); setApplicationDetail(null);
    try {
      const query = new URLSearchParams({ page: String(page), pageSize: '20' });
      if (search && ['jobs','employers'].includes(tab)) query.set('search', search);
      if (status) query.set(tab === 'employers' ? 'verificationStatus' : 'status', status);
      if (tab === 'jobs') { if (type) query.set('opportunityType',type); if (employerFilter) query.set('employerId',employerFilter); if (cityFilter) query.set('cityReferenceId',cityFilter); if (filterCountry) query.set('countryReferenceId',filterCountry); }
      if (tab === 'applications' && jobFilter) query.set('jobId',jobFilter);
      const response = await adminApiClient.request<Page>(`/admin/careers/${tab}?${query}`);
      if (generation === sequence.current) setResult(response);
    } catch { if (generation === sequence.current) setNotice(language === 'ar' ? 'تعذر التحميل؛ تحقق من صلاحية النطاق.' : 'Could not load this scope.'); }
    finally { if (generation === sequence.current) setLoading(false); }
  }, [tab, page, search, status, type, employerFilter, cityFilter, filterCountry, jobFilter, language]);
  useEffect(() => { const timer = setTimeout(() => void load(),250); return () => { clearTimeout(timer); ++sequence.current; ++detailSequence.current; }; }, [load,reload]);
  const inspectApplication = async(row: Row) => {
    const request = ++detailSequence.current;
    setApplicationDetail(null);
    try {
      const detail = await adminApiClient.request<CareerApplicationDto>(`/admin/careers/applications/${row.id}`);
      if (request === detailSequence.current) setApplicationDetail(detail);
    } catch { if (request === detailSequence.current) setNotice(c('تعذر فتح التفاصيل','Could not open details')); }
  };
  const write = async(path: string, body: Record<string, unknown>, method = 'POST') => {
    if (mutation.current || reason.trim().length < 3) return;
    mutation.current = true; setBusy(true); setNotice('');
    const payload = JSON.stringify({ ...body, reason }), identity = path + method + payload;
    if (intent.current?.payload !== identity) intent.current = { payload: identity, key: crypto.randomUUID() };
    try {
      await adminApiClient.request(`/admin/careers/${path}`, { method, body: payload, idempotencyKey: intent.current.key });
      intent.current = null; setNotice(c('تم الحفظ','Saved')); setReload(value => value+1); setEditor(false); setEditing(null); setApplicationDetail(null); setReviewChecked(false);
    } catch(error) { setNotice(error instanceof Error ? error.message : c('تعذر الحفظ','Could not save')); }
    finally { mutation.current = false; setBusy(false); }
  };
  const employers = async(query = '', currentPage = 1) => {
    const data = await adminApiClient.request<{ data: CareerEmployerDto[] }>(`/admin/careers/employers?${new URLSearchParams({ search: query, page: String(currentPage), pageSize: '20' })}`);
    return data.data.map(row => ({ id: row.id, label: row.displayName, lifecycle: row.verificationStatus }));
  };
  const jobs = async(query = '', currentPage = 1) => {
    const data = await adminApiClient.request<{ data: CareerJobPostingDto[] }>(`/admin/careers/jobs?${new URLSearchParams({ search: query, page: String(currentPage), pageSize: '20' })}`);
    return data.data.map(row => ({ id: row.id, label: row.title, lifecycle: 'ACTIVE' }));
  };
  const edit = async(row: Row) => {
    const generation = sequence.current;
    try {
    let data: any = row;
    if (tab === 'jobs') data = await adminApiClient.request<CareerJobPostingDto>(`/admin/careers/jobs/${row.id}`);
    if (generation !== sequence.current) return;
    const meta = data.metadata || {}, salary = data.salaryRange || {};
    setForm({ ...fresh(), ...Object.fromEntries(Object.entries(data).filter(([,v]) => typeof v === 'string')),
      titleEn: meta.localizedContent?.en?.title || '', descriptionEn: meta.localizedContent?.en?.description || '',
      sourceUrl: meta.sourceUrl || '', recruitmentCycle: meta.recruitmentCycle || '', applicationChannel: meta.applicationChannel || 'EXTERNAL',
      applicationDeadline: data.applicationDeadline ? new Date(data.applicationDeadline).toISOString().slice(0,16) : '',
      requiredSkills: (data.requiredSkills || []).join(','), salaryMin: salary.minMinorUnits || '', salaryMax: salary.maxMinorUnits || '',
      currencyCode: salary.currencyCode || 'USD', scale: String(salary.scale ?? 2), period: salary.period || 'MONTH', basis: salary.basis || 'GROSS' });
    setCountryCode(''); setEditing(data); setEditor(true);
    } catch { if (generation === sequence.current) setNotice(c('تعذر تحميل السجل','Could not load the record')); }
  };
  const save = (event: FormEvent) => {
    event.preventDefault();
    let body: Record<string, unknown>;
    if (tab === 'employers') body = { displayName: form.displayName, employerType: form.employerType, industry: form.industry || null, description: form.description || null, countryReferenceId: form.countryReferenceId || null, cityReferenceId: form.cityReferenceId || null, websiteUrl: form.websiteUrl || null, logoAssetId: form.logoAssetId || null };
    else body = { title: form.title, description: form.description, opportunityType: form.opportunityType, employmentType: form.employmentType, jobCategory: form.jobCategory,
      countryReferenceId: form.countryReferenceId, cityReferenceId: form.cityReferenceId || null, ...(!editing ? { employerId: form.employerId } : {}),
      applicationDeadline: form.applicationDeadline ? new Date(form.applicationDeadline).toISOString() : null, externalPostingUrl: form.externalPostingUrl || null,
      requiredSkills: form.requiredSkills.split(',').map(value => value.trim()).filter(Boolean), remoteOption: form.employmentType === 'REMOTE',
      salaryRange: form.salaryMin ? { minMinorUnits: form.salaryMin, maxMinorUnits: form.salaryMax, currencyCode: form.currencyCode, scale: Number(form.scale), period: form.period, basis: form.basis } : null,
      metadata: { applicationChannel: form.applicationChannel, sourceUrl: form.sourceUrl || undefined, recruitmentCycle: form.recruitmentCycle || undefined,
        localizedContent: { ar: { title: form.title, description: form.description }, ...(form.titleEn && form.descriptionEn ? { en: { title: form.titleEn, description: form.descriptionEn } } : {}) } } };
    if (editing) body.expectedVersion = editing.version;
    void write(editing ? `${tab}/${editing.id}` : tab, body, editing ? 'PATCH' : 'POST');
  };
  const labels: Record<string, [string,string]> = { title: ['العنوان العربي','Arabic title'], titleEn: ['العنوان الإنجليزي','English title'], description: ['الوصف','Description'], descriptionEn: ['الوصف الإنجليزي','English description'], displayName: ['اسم الجهة','Employer name'], employerType: ['نوع الجهة','Employer type'], industry: ['القطاع','Industry'], websiteUrl: ['موقع الجهة HTTPS','Employer HTTPS website'], logoAssetId: ['أصل الشعار','Logo asset'], jobCategory: ['التصنيف','Category'], applicationDeadline: ['آخر موعد للتقديم','Application deadline'], externalPostingUrl: ['رابط التقديم الخارجي','External application URL'], sourceUrl: ['المصدر الرسمي','Official source'], recruitmentCycle: ['دورة التوظيف','Recruitment cycle'], requiredSkills: ['المهارات بفواصل','Skills, comma separated'], salaryMin: ['أدنى راتب بالوحدات الصغرى','Minimum salary in minor units'], salaryMax: ['أعلى راتب بالوحدات الصغرى','Maximum salary in minor units'], scale: ['المنازل العشرية','Decimal scale'] };
  const formKeys = tab === 'employers' ? ['displayName','employerType','industry','websiteUrl','description'] : ['title','titleEn','description','descriptionEn','jobCategory','applicationDeadline','externalPostingUrl','sourceUrl','recruitmentCycle','requiredSkills','salaryMin','salaryMax','scale'];
  return <main dir={dir} className="space-y-4 p-4 text-[#142B5F]">
    <h1 className="text-xl font-bold">{c('الوظائف والمسارات المهنية','Careers and alumni')}</h1>
    <nav className="flex flex-wrap gap-3">{(['jobs','employers','applications','alumni'] as Tab[]).filter(value => value !== 'applications' || hasPermission('admin:careers:applications:review')).filter(value => value !== 'alumni' || hasPermission('admin:careers:alumni:view')).map((value) => <button key={value} type="button" disabled={busy} onClick={() => { setParams({ tab: value, page: '1' }); setStatus(''); setSearch(''); setEditor(false); setEditing(null); setApplicationDetail(null); }} className={tab===value?'font-bold underline':''}>{({ jobs: c('الوظائف','Jobs'), employers: c('الجهات','Employers'), applications: c('طلبات التقديم','Applications'), alumni: c('موافقات الخريجين','Alumni consent') })[value]}</button>)}</nav>
    <label className="block">{c('سبب الإجراء','Action reason')}<input className="ml-3 rounded border p-2" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>
    <div className="flex flex-wrap gap-3">
      {['jobs','employers'].includes(tab) && <input type="search" aria-label={c('البحث','Search')} placeholder={c('ابحث بالعنوان أو المرجع','Search title or reference')} value={search} maxLength={120} onChange={event => { setSearch(event.target.value); navigatePage(1); }} className="rounded border p-2" />}
      {tab !== 'alumni' && <select aria-label={c('الحالة','Status')} value={status} onChange={event => { setStatus(event.target.value); navigatePage(1); }}><option value="">{c('كل الحالات','All states')}</option>{(tab==='jobs'?jobStates:tab==='employers'?['UNVERIFIED','VERIFIED','SUSPENDED']:applicationStates).map(value=><option key={value}>{value}</option>)}</select>}
      {tab==='jobs' && <><select aria-label={c('نوع الفرصة','Opportunity type')} value={type} onChange={event=>{setType(event.target.value);navigatePage(1);}}><option value="">{c('كل الأنواع','All types')}</option>{['JOB','INTERNSHIP','GRADUATE_PROGRAM','MENTORSHIP','CAREER_EVENT'].map(value=><option key={value}>{value}</option>)}</select><CanonicalPicker paged optional label={c('الجهة','Employer')} value={employerFilter} load={employers} onChange={id=>{setEmployerFilter(id||'');navigatePage(1);}} /><CanonicalPicker paged optional label={c('الدولة','Country')} value={filterCountry} load={canonicalPickerApi.countries} onChange={(id,option)=>{setFilterCountry(id||'');setFilterCountryCode(option?.code||'');setCityFilter('');navigatePage(1);}} /><CanonicalCityPicker regionId={null} countryIso2Code={filterCountryCode} value={cityFilter||null} onChange={id=>{setCityFilter(id||'');navigatePage(1);}} /></>}
      {tab==='applications' && <CanonicalPicker paged optional label={c('الوظيفة','Job')} value={jobFilter} load={jobs} onChange={id=>{setJobFilter(id||'');navigatePage(1);}} />}
      {['jobs','employers'].includes(tab) && hasPermission('admin:careers:author') && <button type="button" onClick={()=>{setEditing(null);setForm(fresh());setCountryCode('');setEditor(true);}}>{c('إضافة','Add')}</button>}
    </div>
    {notice && <p role="status">{notice}</p>}{loading && <p>{c('جارٍ التحميل','Loading')}</p>}
    {!loading && result && result.data.length === 0 && <p role="status">{c('لا توجد سجلات مطابقة للفلاتر الحالية', 'No matching records for the current filters')}</p>}
    <p>{c('السجلات المطابقة','Matching records')}: {result?.total ?? '—'}</p>
    <ul className="space-y-2">{!loading && result?.data.map(row=><li key={row.id} className="flex flex-wrap gap-3 rounded border p-3">
      <span>{row.title || row.displayName || row.publicId || row.id}</span><span>{row.status || row.verificationStatus || row.visibility}</span>
      {['jobs','employers'].includes(tab) && hasPermission('admin:careers:author') && <button type="button" disabled={busy} onClick={()=>void edit(row).catch(()=>setNotice(c('تعذر فتح السجل','Could not open record')))}>{c('تعديل','Edit')}</button>}
      {tab==='jobs' && row.status==='READY_TO_REVIEW' && hasPermission('admin:careers:review') && <button disabled={busy||!reviewChecked} onClick={()=>void write(`jobs/${row.id}/mark-publishable`,{expectedVersion:row.version,checklist:{source:true,applicationLink:true,privacy:true,terms:true}})}>{c('اعتماد','Approve')}</button>}
      {tab==='jobs' && hasPermission('admin:careers:publish') && <>{row.status==='READY_TO_PUBLISH' && <button disabled={busy} onClick={()=>void write(`jobs/${row.id}/publish`,{expectedVersion:row.version})}>{c('نشر','Publish')}</button>}{(row.status==='PUBLISHED') && <button disabled={busy} onClick={()=>void write(`jobs/${row.id}/unpublish`,{expectedVersion:row.version})}>{c('إلغاء النشر','Unpublish')}</button>}{row.status!=='ARCHIVED' && <button disabled={busy} onClick={()=>void write(`jobs/${row.id}/archive`,{expectedVersion:row.version})}>{c('أرشفة','Archive')}</button>}</>}
      {tab==='jobs' && ['READY_TO_REVIEW','READY_TO_PUBLISH'].includes(row.status||'') && hasPermission('admin:careers:review') && <button disabled={busy} onClick={()=>void write(`jobs/${row.id}/reject`,{expectedVersion:row.version})}>{c('رفض','Reject')}</button>}
      {tab==='employers' && hasPermission('admin:careers:employers:verify') && <><button disabled={busy||!reviewChecked||!sourceEvidence||!evidenceExpiry} onClick={()=>void write(`employers/${row.id}/verify`,{expectedVersion:row.version,sourceUrl:sourceEvidence,expiresAt:new Date(evidenceExpiry).toISOString()})}>{c('توثيق مستقل','Verify independently')}</button><button disabled={busy} onClick={()=>void write(`employers/${row.id}/suspend`,{expectedVersion:row.version})}>{c('تعليق','Suspend')}</button></>}
      {tab==='applications' && <><button disabled={busy} onClick={()=>{if(hasPermission('admin:careers:applications:pii')) void inspectApplication(row);}}>{c('التفاصيل','Details')}</button>{(row.status==='SUBMITTED'?['UNDER_REVIEW']:row.status==='UNDER_REVIEW'?['SHORTLISTED','REJECTED']:row.status==='SHORTLISTED'?['ACCEPTED','REJECTED']:[]).map(next=><button key={next} disabled={busy} onClick={()=>void write(`applications/${row.id}/review`,{expectedVersion:row.version,nextStatus:next,studentMessage,interviewAt:interviewAt?new Date(interviewAt).toISOString():undefined})}>{next}</button>)}</>}
    </li>)}</ul>
    <div className="flex gap-4"><button disabled={loading||page<=1} onClick={()=>navigatePage(page-1)}>{c('السابق','Previous')}</button><span>{page}</span><button disabled={loading||page>=(result?.totalPages||1)} onClick={()=>navigatePage(page+1)}>{c('التالي','Next')}</button><button onClick={()=>setReload(value=>value+1)}>{c('تحديث','Refresh')}</button></div>
    {tab==='jobs'||tab==='employers'?<label className="block"><input type="checkbox" checked={reviewChecked} onChange={event=>setReviewChecked(event.target.checked)} /> {c('راجعت المصدر والهوية ورابط التقديم والخصوصية والشروط','I reviewed source, identity, application destination, privacy and terms')}</label>:null}
    {tab==='employers' && hasPermission('admin:careers:employers:verify') && <div className="flex gap-3"><input type="url" placeholder={c('المصدر الرسمي للتوثيق','Official verification source')} value={sourceEvidence} onChange={event=>setSourceEvidence(event.target.value)} /><input type="datetime-local" aria-label={c('انتهاء التوثيق','Verification expiry')} value={evidenceExpiry} onChange={event=>setEvidenceExpiry(event.target.value)} /></div>}
    {tab==='applications' && <div className="space-y-2"><input placeholder={c('رسالة القرار للطالب','Decision message to student')} value={studentMessage} maxLength={2000} onChange={event=>setStudentMessage(event.target.value)} /><input type="datetime-local" aria-label={c('موعد المقابلة','Interview time')} value={interviewAt} onChange={event=>setInterviewAt(event.target.value)} />{applicationDetail && <div><p>{applicationDetail.coverLetter}</p><p>{JSON.stringify(applicationDetail.decisionMetadata)}</p><button disabled={busy} onClick={()=>void adminApiClient.request<{url:string}>(`/admin/careers/applications/${applicationDetail.id}/cv-grant`,{method:'POST',body:'{}'}).then(grant=>{window.open(grant.url,'_blank','noopener,noreferrer');}).catch(()=>setNotice(c('السيرة غير متاحة أو غير مصرح بها','CV unavailable or access denied')))}>{c('فتح السيرة بأمان','Open CV securely')}</button></div>}</div>}
    {editor && <form onSubmit={save} className="grid gap-3 rounded border p-4 md:grid-cols-2">
      <h2>{editing?c('تعديل السجل','Edit record'):c('سجل جديد','New record')}</h2>
      {formKeys.map(key=><label key={key}>{labels[key]?.[language==='ar'?0:1]||key}<input className="block w-full rounded border p-2" value={form[key]||''} type={key==='applicationDeadline'?'datetime-local':/Url$/.test(key)?'url':'text'} maxLength={/description/.test(key)?20000:2048} onChange={event=>setForm(previous=>({...previous,[key]:event.target.value}))} /></label>)}
      {tab === 'employers' && <AssetPicker label={c('شعار الجهة', 'Employer logo')} value={form.logoAssetId} mimeTypePrefix="image/" purpose="CAREER_EMPLOYER_LOGO" onChange={id => setForm(previous => ({ ...previous, logoAssetId: id }))} />}
      <CanonicalPicker paged optional={tab==='employers'} label={c('الدولة','Country')} value={form.countryReferenceId} load={canonicalPickerApi.countries} onChange={(id,option)=>{setForm(previous=>({...previous,countryReferenceId:id||'',cityReferenceId:''}));setCountryCode(option?.code||'');}} />
      <CanonicalCityPicker regionId={null} value={form.cityReferenceId||null} countryIso2Code={countryCode} onChange={id=>setForm(previous=>({...previous,cityReferenceId:id||''}))} />
      {tab==='jobs' && <><CanonicalPicker paged label={c('الجهة','Employer')} disabled={!!editing} value={form.employerId} load={employers} onChange={id=>setForm(previous=>({...previous,employerId:id||''}))} />{(['opportunityType','employmentType','applicationChannel','period','basis'] as const).map(key=><label key={key}>{({opportunityType:c('نوع الفرصة','Opportunity type'),employmentType:c('نوع العمل','Employment type'),applicationChannel:c('مسار التقديم','Application channel'),period:c('فترة الراتب','Pay period'),basis:c('نوع الراتب','Pay basis')})[key]}<select value={form[key]} onChange={event=>setForm(previous=>({...previous,[key]:event.target.value}))}>{(key==='opportunityType'?['JOB','INTERNSHIP','GRADUATE_PROGRAM','MENTORSHIP','CAREER_EVENT']:key==='employmentType'?['FULL_TIME','PART_TIME','CONTRACT','INTERNSHIP','REMOTE','HYBRID']:key==='applicationChannel'?['INTERNAL','EXTERNAL']:key==='period'?['HOUR','MONTH','YEAR']:['GROSS','NET']).map(value=><option key={value}>{value}</option>)}</select></label>)}<CanonicalPicker paged optional label={c('عملة الراتب','Salary currency')} value={undefined} load={canonicalPickerApi.currencies} onChange={(_id,option)=>setForm(previous=>({...previous,currencyCode:option?.code||'USD'}))} /><span>{form.currencyCode}</span></>}
      <button type="submit" disabled={busy||reason.trim().length<3}>{c('حفظ','Save')}</button><button type="button" disabled={busy} onClick={()=>setEditor(false)}>{c('إغلاق','Close')}</button>
    </form>}
  </main>;
}
