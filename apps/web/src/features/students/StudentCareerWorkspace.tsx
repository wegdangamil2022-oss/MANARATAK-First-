import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiClient as LiveApiClient, type StudentOwnedAssetDto } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { BriefcaseBusiness, ClipboardList, GraduationCap, LockKeyhole, ShieldCheck, UserRound, UsersRound } from 'lucide-react';
import type { ReactNode } from 'react';

type Profile = { headline?: string; summary?: string; skills: string[]; resumeAssetId?: string; version?: number; };
type Alumni = { displayName: string; graduationYear?: number; employerName?: string; visibility: 'PRIVATE'|'ALUMNI_ONLY'|'PUBLIC'; consentRevokedAt?: string; version?: number; };
type Application = { id: string; publicId: string; status: string; version: number; jobSnapshot: { title?: string }; decisionMetadata?: { studentMessage?: string }; };
export function StudentCareerWorkspace() {
  const { language, dir } = useTranslation(), c = (ar: string, en: string) => language==='ar'?ar:en;
  const [profile,setProfile] = useState<Profile>({skills:[]}), [alumni,setAlumni] = useState<Alumni>({displayName:'',visibility:'PRIVATE'});
  const [assets,setAssets] = useState<StudentOwnedAssetDto[]>([]), [applications,setApplications] = useState<Application[]>([]);
  const [page,setPage] = useState(1), [totalPages,setTotalPages] = useState(1), [reload,setReload] = useState(0);
  const [busy,setBusy] = useState(false), [loading,setLoading] = useState(false), [notice,setNotice] = useState('');
  const [skills,setSkills] = useState(''), [coverLetter,setCoverLetter] = useState(''), [consent,setConsent] = useState(false), [alumniConsent,setAlumniConsent] = useState(false);
  const [network,setNetwork] = useState<Array<{id:string;displayName:string;employerName?:string;graduationYear?:number}>>([]), [networkPage,setNetworkPage] = useState(1), [networkPages,setNetworkPages] = useState(1);
  const [job,setJob] = useState<{id:string;title:string}|null>(null);
  const request = useRef(0), mutation = useRef(false), intent = useRef<{payload:string;key:string}|null>(null);
  useEffect(()=>{
    const sequence=++request.current; setLoading(true);
    const tasks = [ApiClient.careerWorkspaceRequest<Profile|null>('profile'),ApiClient.careerWorkspaceRequest<Alumni|null>('alumni'),ApiClient.listMyActiveStudentAssets('application/pdf'),ApiClient.careerWorkspaceRequest<{data:Application[];totalPages:number}>(`applications?page=${page}`)] as const;
    void Promise.allSettled(tasks).then(results=>{
      if(sequence!==request.current)return;
      const [p,a,files,list]=results;
      if(p.status==='fulfilled' && p.value){setProfile(p.value);setSkills(p.value.skills.join(','));}
      if(a.status==='fulfilled' && a.value)setAlumni(a.value);
      if(files.status==='fulfilled')setAssets(files.value.items);
      if(list.status==='fulfilled'){setApplications(list.value.data);setTotalPages(list.value.totalPages);}
      if(results.some(result=>result.status==='rejected'))setNotice(language==='ar'?'تعذر تحميل بعض بيانات المسار المهني':'Some career data could not be loaded');
      setLoading(false);
    });
    return()=>{++request.current;};
  },[page,reload,language]);
  useEffect(()=>{
    const jobId=new URLSearchParams(window.location.search).get('jobId'), slug=new URLSearchParams(window.location.search).get('jobSlug');
    if(!jobId||!slug)return;
    let active=true;
    void ApiClient.getCareerJobBySlug(slug,language).then(row=>{if(active && row.id===jobId && row.metadata?.applicationChannel==='INTERNAL')setJob({id:row.id,title:row.title});}).catch(()=>{if(active)setNotice(language==='ar'?'الفرصة غير متاحة للتقديم':'This opportunity is not open');});
    return()=>{active=false;};
  },[language]);
  const write=async(path:string,method:string,body:Record<string,unknown>)=>{
    if(mutation.current)return; mutation.current=true;setBusy(true);setNotice('');
    const payload=path+method+JSON.stringify(body);
    if(intent.current?.payload!==payload)intent.current={payload,key:crypto.randomUUID()};
    try{await ApiClient.careerWorkspaceRequest(path,method,body,intent.current.key);intent.current=null;setNotice(c('تم الحفظ','Saved'));setReload(value=>value+1);}
    catch(error){setNotice(error instanceof Error?error.message:c('تعذر الحفظ','Could not save'));}
    finally{mutation.current=false;setBusy(false);}
  };
  const submitProfile=(event:FormEvent)=>{event.preventDefault();void write('profile','PUT',{headline:profile.headline||null,summary:profile.summary||null,skills:skills.split(',').map(value=>value.trim()).filter(Boolean),resumeAssetId:profile.resumeAssetId||null,visibility:'PRIVATE',expectedVersion:profile.version});};
  const inputStyle = 'mt-1 block min-h-10 w-full rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2 text-[12px] font-medium text-[var(--mn-heading)] outline-none focus:border-[#D6A43B] dark:bg-[var(--mn-surface-elevated)]';
  const labelStyle = 'block text-[11px] font-semibold leading-[1.7] text-[var(--mn-heading)]';
  const actionStyle = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--mn-primary)] px-3.5 py-1.5 text-[12px] font-bold text-white transition-colors hover:bg-[var(--mn-primary-hover)] disabled:cursor-not-allowed disabled:opacity-50';
  const secondaryActionStyle = 'inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-1.5 text-[12px] font-bold text-[var(--mn-heading)] transition-colors hover:border-[#D6A43B] disabled:cursor-not-allowed disabled:opacity-50';
  const savedSkillsCount = skills.split(',').map(value => value.trim()).filter(Boolean).length;
  const hasProfile = Boolean(profile.headline?.trim() || profile.summary?.trim() || savedSkillsCount || profile.resumeAssetId);
  return (
    <div dir={dir} className="mn-student-career-page space-y-6 font-['Cairo',sans-serif]">
      {notice && <p role="status" className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-[12px] leading-[1.8] text-[var(--mn-text)]">{notice}</p>}
      {loading && <p role="status" className="text-[12px] font-medium text-[var(--mn-text-muted)]">{c('جارٍ تحميل بيانات المسار المهني…', 'Loading career data…')}</p>}

      {/* The same full-height gold line on the physical right edge as فرصي and تعليمي. */}
      <section aria-label={c('مساري المهني', 'My career')} className="relative overflow-hidden rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-4 shadow-2xs mn-panel dark:border-white/10 sm:p-5">
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 right-0 w-[3.5px] bg-gradient-to-b from-[#B78622] via-[#D6A43B] to-[#E5B54F]" />
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-[#D6A43B]/30 bg-[#142B5F] dark:bg-[#0c1a3b]">
            <BriefcaseBusiness className="h-[18px] w-[18px] text-[#E5B54F]" aria-hidden="true" />
          </span>
          <h2 className="text-[14px] font-bold leading-[1.35] text-[var(--mn-heading)]">{c('مساري المهني', 'My career')}</h2>
        </div>
        <div className="mt-3 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] px-3 py-2.5 dark:bg-[var(--mn-surface-elevated)]">
          <p className="text-[12px] font-bold leading-5 text-[var(--mn-heading)]">{c('نظّم خطواتك نحو مستقبلك المهني', 'Organize your next career steps')}</p>
          <p className="mt-0.5 text-[11px] font-medium leading-[1.85] text-[var(--mn-text-muted)] sm:text-[12px]">
            {c('جهّز ملفك المهني وسيرتك الذاتية، وتابع طلباتك، وتحكّم بخصوصية ظهورك في شبكة الخريجين.', 'Maintain your profile and CV, follow applications, and control your alumni-network visibility.')}
          </p>
        </div>
        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            {label:c('الملف المهني', 'Career profile'), value:hasProfile ? c('مُعدّ', 'Set') : c('جديد', 'New')},
            {label:c('طلبات معروضة', 'Shown applications'), value:String(applications.length)},
            {label:c('مهارات مُدخلة', 'Entered skills'), value:String(savedSkillsCount)},
          ].map(stat=>(
            <div key={stat.label} className="min-w-0 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-2.5 text-center dark:bg-[var(--mn-surface-elevated)] sm:p-3">
              <strong className="block text-[16px] font-bold leading-6 text-[var(--mn-heading)] sm:text-[18px]">{stat.value}</strong>
              <span className="mt-0.5 block text-[10px] font-semibold leading-[1.6] text-[var(--mn-text-muted)] sm:text-[11px]">{stat.label}</span>
            </div>
          ))}
        </div>
        <div dir={dir} className="mt-4 flex w-full flex-wrap items-center gap-3">
          <p className="text-[11px] font-medium text-[var(--mn-text-muted)]">{c('ملفك وطلباتك وشبكة الخريجين في مكان واحد', 'Your profile, applications, and alumni connections in one place')}</p>
          <a href="#mn-career-profile" className="ms-auto inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-[#142B5F] px-3.5 py-2 text-[12px] font-bold text-white transition-colors hover:bg-[#203D74] dark:bg-[#D6A43B] dark:text-[#142B5F] dark:hover:bg-[#E5B54F]">
            <UserRound className="h-3.5 w-3.5 text-[#E5B54F] dark:text-[#142B5F]" aria-hidden="true" />
            <span>{c('ملفي المهني', 'My profile')}</span>
          </a>
        </div>
      </section>

      <CareerSectionCard id="mn-career-profile" title={c('ملفي المهني الخاص', 'Private career profile')} icon={<UserRound className="h-4 w-4 text-[#E5B54F]" aria-hidden="true" />}>
        <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-[1.8] text-[var(--mn-text-muted)]">
          <LockKeyhole className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B78622]" aria-hidden="true" />
          {c('ملفك هنا خاص، ولا تتم مشاركة سيرتك في طلب وظيفة إلا بإجراء تقديم وموافقة منك.', 'Your profile stays private; your CV is only shared through a job application with your consent.')}
        </p>
        <form onSubmit={submitProfile} className="grid gap-3">
          <label className={labelStyle}>
            {c('المسمى المهني', 'Headline')}
            <input className={inputStyle} value={profile.headline || ''} maxLength={240} placeholder={c('مثال: خريج إدارة أعمال', 'e.g. Business graduate')} onChange={event=>setProfile(previous=>({...previous,headline:event.target.value}))} />
          </label>
          <label className={labelStyle}>
            {c('نبذة مهنية', 'Professional summary')}
            <textarea className={inputStyle + ' min-h-28 resize-y'} rows={4} value={profile.summary || ''} maxLength={4000} placeholder={c('عرّف بمهاراتك وخبراتك واهتماماتك المهنية…', 'Describe your experience, skills and interests…')} onChange={event=>setProfile(previous=>({...previous,summary:event.target.value}))} />
          </label>
          <label className={labelStyle}>
            {c('المهارات — افصل بينها بفاصلة', 'Skills — separated by commas')}
            <input className={inputStyle} value={skills} placeholder={c('التواصل، التحليل، إدارة المشاريع', 'Communication, analysis, project management')} onChange={event=>setSkills(event.target.value)} />
          </label>
          <label className={labelStyle}>
            {c('السيرة الذاتية PDF من ملفاتي', 'PDF résumé from my files')}
            <select className={inputStyle} value={profile.resumeAssetId || ''} onChange={event=>setProfile(previous=>({...previous,resumeAssetId:event.target.value}))}>
              <option value="">{c('بدون ملف', 'No file')}</option>
              {profile.resumeAssetId && !assets.some(row=>row.id===profile.resumeAssetId) && <option value={profile.resumeAssetId}>{c('الملف الحالي', 'Current file')}</option>}
              {assets.map(row=><option key={row.id} value={row.id}>{row.metadata?.originalFilename || row.reference}</option>)}
            </select>
          </label>
          <div className="flex items-center justify-end border-t border-[var(--mn-border)] pt-3">
            <button type="submit" disabled={busy || loading} className={actionStyle}><ShieldCheck className="h-4 w-4" aria-hidden="true" />{c('حفظ الملف المهني', 'Save career profile')}</button>
          </div>
        </form>
      </CareerSectionCard>

      {job && (
        <CareerSectionCard title={c('التقديم على فرصة مهنية', 'Apply for a job')} icon={<BriefcaseBusiness className="h-4 w-4 text-[#E5B54F]" aria-hidden="true" />}>
          <form onSubmit={event=>{event.preventDefault();void write('applications','POST',{jobId:job.id,cvAssetId:profile.resumeAssetId,coverLetter,consent});}} className="space-y-3">
            <h4 className="break-words text-[14px] font-bold text-[var(--mn-heading)]">{job.title}</h4>
            <label className={labelStyle}>
              {c('رسالة التقديم', 'Cover letter')}
              <textarea aria-label={c('رسالة التقديم','Cover letter')} value={coverLetter} maxLength={4000} onChange={event=>setCoverLetter(event.target.value)} rows={4} className={inputStyle + ' min-h-28 resize-y'} />
            </label>
            <label className="flex items-start gap-2 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-[11px] font-semibold leading-[1.8] text-[var(--mn-heading)]">
              <input className="mt-1 h-4 w-4 shrink-0 accent-[#142B5F]" type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)} />
              {c('أوافق على مشاركة السيرة الذاتية مع مراجعي هذه الفرصة فقط.', 'I consent to sharing my CV with reviewers of this opportunity.')}
            </label>
            <div className="flex justify-end border-t border-[var(--mn-border)] pt-3">
              <button type="submit" className={actionStyle} disabled={busy || loading || !consent || !profile.resumeAssetId}>{c('إرسال التقديم', 'Submit application')}</button>
            </div>
          </form>
        </CareerSectionCard>
      )}

      <CareerSectionCard title={c('طلبات التقديم', 'My applications')} icon={<ClipboardList className="h-4 w-4 text-[#E5B54F]" aria-hidden="true" />} count={String(applications.length)}>
        {applications.length === 0 ? (
          <p className="rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-4 text-center text-[12px] leading-[1.8] text-[var(--mn-text-muted)] dark:bg-[var(--mn-surface-elevated)]">
            {loading? c('جارٍ تحميل طلباتك…', 'Loading applications…') : c('لا توجد طلبات تقديم في هذه الصفحة حتى الآن.', 'No applications on this page yet.')}
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {applications.map(row=>(
              <article key={row.id} className="min-w-0 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3.5 dark:bg-[var(--mn-surface-elevated)]">
                <h4 className="break-words text-[14px] font-bold leading-[1.6] text-[var(--mn-heading)]">{row.jobSnapshot.title || c('فرصة مهنية', 'Career opportunity')}</h4>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-[var(--mn-text-muted)]">
                  <span className="rounded-md border border-[var(--mn-border)] bg-[var(--mn-surface)] px-2 py-0.5 font-semibold">{row.status}</span>
                  <span className="break-all">{row.publicId}</span>
                </div>
                {row.decisionMetadata?.studentMessage && <p className="mt-2 text-[11px] leading-[1.8] text-[var(--mn-text-muted)]">{row.decisionMetadata.studentMessage}</p>}
                {['SUBMITTED','UNDER_REVIEW','SHORTLISTED'].includes(row.status) && (
                  <button type="button" className={secondaryActionStyle + ' mt-3'} disabled={busy} onClick={()=>void write(`applications/${row.id}/withdraw`,'POST',{expectedVersion:row.version})}>
                    {c('سحب التقديم', 'Withdraw application')}
                  </button>
                )}
              </article>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-[var(--mn-border)] pt-3">
          <button type="button" className={secondaryActionStyle} disabled={loading || page <= 1} onClick={()=>setPage(value=>value-1)}>{c('السابق','Previous')}</button>
          <span className="min-w-8 text-center text-[12px] font-semibold text-[var(--mn-heading)]">{page} / {totalPages}</span>
          <button type="button" className={secondaryActionStyle} disabled={loading || page >= totalPages} onClick={()=>setPage(value=>value+1)}>{c('التالي','Next')}</button>
        </div>
      </CareerSectionCard>

      <CareerSectionCard title={c('ملف الخريج والخصوصية', 'Alumni profile and privacy')} icon={<GraduationCap className="h-4 w-4 text-[#E5B54F]" aria-hidden="true" />}>
        <p className="mb-3 flex items-start gap-1.5 text-[11px] leading-[1.8] text-[var(--mn-text-muted)]">
          <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#B78622]" aria-hidden="true" />
          {c('حدد بيانات ظهورك للخريجين الآخرين أو للعامة. المشاركة اختيارية ويمكن سحب الموافقة.', 'Choose whether other alumni or the public can see your alumni profile. Consent is optional and revocable.')}
        </p>
        <form className="grid gap-3" onSubmit={event=>{event.preventDefault();void write('alumni','PUT',{displayName:alumni.displayName,graduationYear:alumni.graduationYear??null,employerName:alumni.employerName||null,visibility:alumni.visibility,...(alumniConsent?{consentGranted:true}:{}),expectedVersion:alumni.version});}}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={labelStyle}>
              {c('اسم العرض', 'Display name')}
              <input required className={inputStyle} value={alumni.displayName} maxLength={240} onChange={event=>setAlumni(previous=>({...previous,displayName:event.target.value}))} />
            </label>
            <label className={labelStyle}>
              {c('سنة التخرج', 'Graduation year')}
              <input className={inputStyle} type="number" min={1900} max={new Date().getFullYear()+1} value={alumni.graduationYear??''} onChange={event=>setAlumni(previous=>({...previous,graduationYear:event.target.value?Number(event.target.value):undefined}))} />
            </label>
          </div>
          <label className={labelStyle}>
            {c('جهة العمل (اختياري)', 'Employer (optional)')}
            <input className={inputStyle} value={alumni.employerName||''} maxLength={240} onChange={event=>setAlumni(previous=>({...previous,employerName:event.target.value}))} />
          </label>
          <label className={labelStyle}>
            {c('مَن يستطيع رؤية بياناتي؟', 'Who can see my profile?')}
            <select className={inputStyle} value={alumni.visibility} onChange={event=>setAlumni(previous=>({...previous,visibility:event.target.value as Alumni['visibility']}))}>
              <option value="PRIVATE">{c('خاص — لا يظهر للآخرين', 'Private — hidden from others')}</option>
              <option value="ALUMNI_ONLY">{c('الخريجون الموافقون فقط', 'Consenting alumni only')}</option>
              <option value="PUBLIC">{c('عام', 'Public')}</option>
            </select>
          </label>
          <label className="flex items-start gap-2 rounded-lg border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 text-[11px] font-semibold leading-[1.8] text-[var(--mn-heading)]">
            <input type="checkbox" className="mt-1 h-4 w-4 shrink-0 accent-[#142B5F]" checked={alumniConsent} onChange={event=>setAlumniConsent(event.target.checked)} />
            {c('أوافق على إظهار بياناتي حسب النطاق المحدد.', 'I consent to displaying my information to the selected audience.')}
          </label>
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-[var(--mn-border)] pt-3">
            {alumni.version && (
              <button type="button" className={secondaryActionStyle} disabled={busy} onClick={()=>void write('alumni','PUT',{displayName:alumni.displayName,visibility:'PRIVATE',consentGranted:false,expectedVersion:alumni.version})}>
                {c('سحب الموافقة', 'Revoke consent')}
              </button>
            )}
            <button type="submit" className={actionStyle} disabled={busy || loading}>{c('حفظ إعدادات الخريج','Save alumni settings')}</button>
          </div>
        </form>
      </CareerSectionCard>

      <CareerSectionCard title={c('شبكة الخريجين الموافقين', 'Consenting alumni network')} icon={<UsersRound className="h-4 w-4 text-[#E5B54F]" aria-hidden="true" />}>
        <p className="mb-3 text-[11px] leading-[1.8] text-[var(--mn-text-muted)]">
          {c('تظهر هنا بيانات الخريجين الذين سمحوا بعرض ملفاتهم وفق إعدادات الخصوصية.', 'Profiles here belong to alumni who permitted sharing under their privacy preferences.')}
        </p>
        <button
          type="button"
          className={secondaryActionStyle}
          disabled={busy || loading || alumni.visibility==='PRIVATE'}
          onClick={()=>void ApiClient.careerWorkspaceRequest<{data:typeof network;totalPages:number}>(`alumni-network?page=${networkPage}`).then(result=>{setNetwork(result.data);setNetworkPages(result.totalPages);}).catch(()=>setNotice(c('الشبكة متاحة للخريجين ذوي الموافقة السارية','The network requires active alumni consent')))}
        >
          <UsersRound className="h-3.5 w-3.5" aria-hidden="true" />
          {c('عرض الشبكة','View network')}
        </button>
        {network.length > 0 && (
          <div className="mt-3 grid gap-2.5 sm:grid-cols-2">
            {network.map(row=>(
              <article key={row.id} className="min-w-0 rounded-xl border border-[var(--mn-border)] bg-[var(--mn-page)] p-3 dark:bg-[var(--mn-surface-elevated)]">
                <p className="break-words text-[14px] font-bold text-[var(--mn-heading)]">{row.displayName}</p>
                {row.graduationYear && <p className="mt-1 text-[11px] text-[var(--mn-text-muted)]">{c('سنة التخرج: ', 'Graduated: ')}{row.graduationYear}</p>}
                {row.employerName && <p className="mt-1 break-words text-[11px] text-[var(--mn-text-muted)]">{row.employerName}</p>}
              </article>
            ))}
          </div>
        )}
        <div className="mt-4 flex items-center justify-center gap-2 border-t border-[var(--mn-border)] pt-3">
          <button type="button" className={secondaryActionStyle} disabled={networkPage<=1} onClick={()=>{setNetworkPage(value=>value-1);setNetwork([]);}}>{c('السابق','Previous')}</button>
          <span className="min-w-8 text-center text-[12px] font-semibold text-[var(--mn-heading)]">{networkPage} / {networkPages}</span>
          <button type="button" className={secondaryActionStyle} disabled={networkPage>=networkPages} onClick={()=>{setNetworkPage(value=>value+1);setNetwork([]);}}>{c('التالي','Next')}</button>
        </div>
      </CareerSectionCard>
    </div>
  );
}

function CareerSectionCard({id,title,icon,count,children}:{
  id?:string;
  title:string;
  icon:ReactNode;
  count?:string;
  children:ReactNode;
}) {
  return (
    <section id={id} aria-label={title} className="mn-student-career-section relative -mx-[2px] w-[calc(100%+4px)] scroll-mt-5 rounded-2xl border border-[var(--mn-border)] bg-[var(--mn-surface)] p-3.5 shadow-2xs mn-panel dark:border-white/10 sm:mx-0 sm:w-full sm:p-4">
      <div className="mb-3 flex min-w-0 items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl border border-[#D6A43B]/30 bg-[#142B5F] dark:bg-[#0c1a3b]">
            {icon}
          </span>
          <h3 className="mn-student-career-heading min-w-0 text-[14px] font-bold leading-[1.22] text-[var(--mn-heading)]">{title}</h3>
        </div>
        {count && <span className="shrink-0 text-[11px] font-semibold text-[var(--mn-text-muted)]">{count}</span>}
      </div>
      {children}
    </section>
  );
}
