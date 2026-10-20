import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
import { FormEvent, useEffect, useRef, useState } from 'react';
import { ApiClient as LiveApiClient, type StudentOwnedAssetDto } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
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
  return <section dir={dir} className="space-y-5">
    <h2 className="text-xl font-bold">{c('مساري المهني','My career')}</h2>{notice&&<p role="status">{notice}</p>}{loading&&<p>{c('جارٍ التحميل','Loading')}</p>}
    <form onSubmit={submitProfile} className="space-y-3 rounded-2xl border p-4">
      <h3>{c('ملفي المهني الخاص','Private career profile')}</h3>
      <label className="block">{c('المسمى المهني','Headline')}<input className="block w-full rounded border p-2" value={profile.headline||''} maxLength={240} onChange={event=>setProfile(previous=>({...previous,headline:event.target.value}))}/></label>
      <label className="block">{c('نبذة','Summary')}<textarea className="block w-full rounded border p-2" value={profile.summary||''} maxLength={4000} onChange={event=>setProfile(previous=>({...previous,summary:event.target.value}))}/></label>
      <label className="block">{c('المهارات بفواصل','Skills, comma separated')}<input className="block w-full rounded border p-2" value={skills} onChange={event=>setSkills(event.target.value)}/></label>
      <label className="block">{c('سيرة PDF من ملفات حسابك','PDF resume from your account')}<select className="block rounded border p-2" value={profile.resumeAssetId||''} onChange={event=>setProfile(previous=>({...previous,resumeAssetId:event.target.value}))}><option value="">{c('بدون ملف','No file')}</option>{profile.resumeAssetId&&!assets.some(row=>row.id===profile.resumeAssetId)&&<option value={profile.resumeAssetId}>{c('الملف الحالي','Current file')}</option>}{assets.map(row=><option key={row.id} value={row.id}>{row.metadata?.originalFilename||row.reference}</option>)}</select></label>
      <button disabled={busy||loading}>{c('حفظ الملف','Save profile')}</button>
    </form>
    {job&&<form onSubmit={event=>{event.preventDefault();void write('applications','POST',{jobId:job.id,cvAssetId:profile.resumeAssetId,coverLetter,consent});}} className="space-y-3 rounded-2xl border p-4"><h3>{job.title}</h3><textarea aria-label={c('رسالة التقديم','Cover letter')} value={coverLetter} maxLength={4000} onChange={event=>setCoverLetter(event.target.value)} className="block w-full rounded border p-2"/><label><input type="checkbox" checked={consent} onChange={event=>setConsent(event.target.checked)}/>{c('أوافق على مشاركة السيرة مع مراجعي هذه الفرصة','I consent to sharing my CV with reviewers of this opportunity')}</label><button disabled={busy||loading||!consent||!profile.resumeAssetId}>{c('إرسال التقديم','Submit application')}</button></form>}
    <section className="space-y-3 rounded-2xl border p-4"><h3>{c('طلبات التقديم','My applications')}</h3>{applications.map(row=><article key={row.id} className="rounded border p-3"><p>{row.jobSnapshot.title} · {row.publicId} · {row.status}</p>{row.decisionMetadata?.studentMessage&&<p>{row.decisionMetadata.studentMessage}</p>}{['SUBMITTED','UNDER_REVIEW','SHORTLISTED'].includes(row.status)&&<button disabled={busy} onClick={()=>void write(`applications/${row.id}/withdraw`,'POST',{expectedVersion:row.version})}>{c('انسحاب','Withdraw')}</button>}</article>)}<div className="flex gap-3"><button disabled={loading||page<=1} onClick={()=>setPage(value=>value-1)}>{c('السابق','Previous')}</button><span>{page}</span><button disabled={loading||page>=totalPages} onClick={()=>setPage(value=>value+1)}>{c('التالي','Next')}</button></div></section>
    <form className="space-y-3 rounded-2xl border p-4" onSubmit={event=>{event.preventDefault();void write('alumni','PUT',{displayName:alumni.displayName,graduationYear:alumni.graduationYear??null,employerName:alumni.employerName||null,visibility:alumni.visibility,...(alumniConsent?{consentGranted:true}:{}),expectedVersion:alumni.version});}}>
      <h3>{c('ملف الخريج وموافقة الإظهار','Alumni profile and visibility consent')}</h3>
      <label className="block">{c('اسم العرض','Display name')}<input required className="block rounded border p-2" value={alumni.displayName} maxLength={240} onChange={event=>setAlumni(previous=>({...previous,displayName:event.target.value}))}/></label>
      <label className="block">{c('سنة التخرج','Graduation year')}<input type="number" min={1900} max={new Date().getFullYear()+1} value={alumni.graduationYear??''} onChange={event=>setAlumni(previous=>({...previous,graduationYear:event.target.value?Number(event.target.value):undefined}))}/></label>
      <label className="block">{c('جهة العمل الاختيارية','Optional employer')}<input value={alumni.employerName||''} maxLength={240} onChange={event=>setAlumni(previous=>({...previous,employerName:event.target.value}))}/></label>
      <select aria-label={c('الظهور','Visibility')} value={alumni.visibility} onChange={event=>setAlumni(previous=>({...previous,visibility:event.target.value as Alumni['visibility']}))}><option value="PRIVATE">{c('خاص','Private')}</option><option value="ALUMNI_ONLY">{c('للخريجين الموافقين فقط','Consenting alumni only')}</option><option value="PUBLIC">{c('عام','Public')}</option></select>
      <label className="block"><input type="checkbox" checked={alumniConsent} onChange={event=>setAlumniConsent(event.target.checked)}/>{c('أوافق على إظهار هذه البيانات حسب النطاق المحدد','I consent to displaying these fields in the selected audience')}</label>
      <button disabled={busy||loading}>{c('حفظ','Save')}</button>{alumni.version&&<button type="button" disabled={busy} onClick={()=>void write('alumni','PUT',{displayName:alumni.displayName,visibility:'PRIVATE',consentGranted:false,expectedVersion:alumni.version})}>{c('سحب الموافقة','Revoke consent')}</button>}
    </form>
    <section className="space-y-2 rounded-2xl border p-4"><h3>{c('شبكة الخريجين الموافقين','Consenting alumni network')}</h3>
      <button disabled={busy || loading || alumni.visibility==='PRIVATE'} onClick={()=>void ApiClient.careerWorkspaceRequest<{data:typeof network;totalPages:number}>(`alumni-network?page=${networkPage}`).then(result=>{setNetwork(result.data);setNetworkPages(result.totalPages);}).catch(()=>setNotice(c('الشبكة متاحة للخريجين ذوي الموافقة السارية','The network requires active alumni consent')))}>{c('عرض الشبكة','View network')}</button>
      {network.map(row=><p key={row.id}>{row.displayName} · {row.graduationYear} · {row.employerName}</p>)}
      <button disabled={networkPage<=1} onClick={()=>{setNetworkPage(value=>value-1);setNetwork([]);}}>{c('السابق','Previous')}</button><span>{networkPage}</span><button disabled={networkPage>=networkPages} onClick={()=>{setNetworkPage(value=>value+1);setNetwork([]);}}>{c('التالي','Next')}</button>
    </section>
  </section>;
}
