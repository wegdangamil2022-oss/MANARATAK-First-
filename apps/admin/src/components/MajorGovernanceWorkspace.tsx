import {MajorTranslationPublicationPanel} from './MajorTranslationPublicationPanel';
import {useEffect,useRef,useState} from 'react';
import {MAJOR_REVIEW_TEMPLATE,selectMajorWorkingVersion,type MajorDto,type MajorContentSectionDto,type MajorVersionDto} from '@manaratak/domain';
import {adminApiClient} from '../api/client';
import {canonicalPickerApi} from '../api/canonicalPickers';
import {CanonicalPicker} from './CanonicalPicker';
import {useAdminAuthorization} from '../security/AdminAuthorizationContext';

const readinessLabels:Record<string,string>={MAJOR_CANONICAL_TAXONOMY_REFERENCE_MISSING:'لم يحدد مرجع التصنيف',MAJOR_PROFILE_SCOPED_PUBLICATION_REFERENCE_MISSING:'يحتاج ملف الدرجة مراجع معتمدة للدرجة والتصنيف',MAJOR_REVIEWED_WORKING_VERSION_REQUIRED:'لم تعتمد مراجعة جميع أقسام نسخة العمل',MAJOR_CANONICAL_DEGREE_REFERENCE_MISSING:'لم يحدد مرجع الدرجة',MAJOR_INCOMPLETE:'هوية التخصص غير مكتملة',MAJOR_SOURCE_IDENTITY_MISSING:'يلزم توثيق المصدر',MAJOR_INVALID_PUBLICATION_STATUS:'حالة الملف غير جاهزة للنشر',MAJOR_CANONICAL_IDENTITY_MISSING:'هوية التخصص المرجعية ناقصة',MAJOR_CANONICAL_REFERENCE_SERVICE_REQUIRED:'تعذر التحقق من المراجع المعيارية'};
const labels:Record<string,string>={requirements:'متطلبات الزمالة',benefits:'المنافع الموثقة',identity:'الهوية والدرجة والمصدر',overview:'نبذة التخصص',study_content:'ماذا يدرس الطالب',foundation_courses:'المواد التأسيسية',core_courses:'المواد الأساسية',practical_training:'التدريب العملي',skills:'المهارات',tracks:'المسارات الدقيقة',career_links:'مجالات العمل',postgraduate_paths:'الدراسات العليا',related_majors:'التخصصات المشابهة',academic_notice:'التنبيه الأكاديمي والمهني',sources:'المصادر وتاريخ التحقق',entry_backgrounds:'الخلفيات الأكاديمية والمتطلبات',curriculum:'المقررات ومناهج البحث',completion_requirements:'الرسالة أو المشروع ومتطلبات الإكمال',advanced_skills:'المهارات المتقدمة',doctoral_paths:'الدكتوراه والزمالات',bachelor_links:'روابط تخصصات البكالوريوس',entry_paths:'مسارات دخول الدكتوراه',program_stages:'مراحل البرنامج',research_fields:'المجالات البحثية',research_methods:'مناهج البحث',milestones:'الاختبارات والمراحل المطلوبة',dissertation:'الأطروحة',research_skills:'المهارات البحثية'};
export function MajorGovernanceWorkspace({majorId,profileId,onSaved,mode='all',hasUnsaved=false}:{majorId:string;profileId?:string;onSaved:()=>void|Promise<void>;mode?:'all'|'publication'|'relations'|'versions';hasUnsaved?:boolean}) {
  const {hasPermission}=useAdminAuthorization();
  const [major,setMajor]=useState<MajorDto>();const [versions,setVersions]=useState<MajorVersionDto[]>([]);
  const [sections,setSections]=useState<MajorContentSectionDto[]>([]);const [compare,setCompare]=useState<MajorContentSectionDto[]>([]);
  const [coverage,setCoverage]=useState<Record<string,string>>({});const [reason,setReason]=useState('');const [reference,setReference]=useState('');
  const [alias,setAlias]=useState('');const [aliasType,setAliasType]=useState('ALIAS');const [locale,setLocale]=useState('ar');
  const [target,setTarget]=useState('');const [relationship,setRelationship]=useState('SIMILAR');
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const saving=useRef(false);
  const [historyPage,setHistoryPage]=useState(1);const [historyVersions,setHistoryVersions]=useState<MajorVersionDto[]>([]);
  const [refresh,setRefresh]=useState(0);const [compareId,setCompareId]=useState('');
  const [timeline,setTimeline]=useState<{data:Array<{action:string;actorId:string;timestamp:string;reason?:string}>;nextCursor:string|null}>();
  const [auditCursor,setAuditCursor]=useState<string>();
  const [auditOpen,setAuditOpen]=useState(false);
  const [readiness,setReadiness]=useState<{ready:boolean;blockingIssues:Array<{code:string;message:string}>}|null>(null);
  const [coverageOpen,setCoverageOpen]=useState(false);
  const canReadAudit=hasPermission('admin:audit:manage');
  const path=`/admin/majors/${encodeURIComponent(majorId)}`;
  useEffect(()=>{
    const controller=new AbortController();setError('');setCoverage({});setCompareId('');setHistoryPage(1);
    const scope=profileId?`?profileId=${encodeURIComponent(profileId)}`:'';
    Promise.all([adminApiClient.request<MajorDto>(path,{signal:controller.signal}),adminApiClient.request<{data:MajorVersionDto[]}>(`${path}/versions${scope}`,{signal:controller.signal})]).then(async([owner,history])=>{const target=selectMajorWorkingVersion(history.data)??history.data[0];const params=new URLSearchParams();if(profileId)params.set('profileId',profileId);if(target?.id)params.set('versionId',target.id);const content=await adminApiClient.request<{data:MajorContentSectionDto[]}>(`${path}/content-sections?${params}`,{signal:controller.signal});if(!controller.signal.aborted){setMajor(owner);setVersions(history.data);setSections(content.data);}}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
    return ()=>controller.abort();
  },[majorId,profileId,refresh,path]);
  useEffect(()=>{
    const controller=new AbortController();setCompare([]);if(!compareId || !profileId) return ()=>controller.abort();
    adminApiClient.request<{data:MajorContentSectionDto[]}>(`${path}/content-sections?profileId=${encodeURIComponent(profileId)}&versionId=${encodeURIComponent(compareId)}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setCompare(result.data);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();
  },[majorId,profileId,compareId,path]);
  useEffect(()=>{
    if(!canReadAudit || !auditOpen) return;
    const controller=new AbortController();
    adminApiClient.request<{data:Array<{action:string;actorId:string;timestamp:string;reason?:string}>;nextCursor:string|null}>(`${path}/timeline${auditCursor?'?cursor='+encodeURIComponent(auditCursor):''}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setTimeline(result);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();
  },[majorId,auditCursor,refresh,canReadAudit,auditOpen,path]);
  useEffect(()=>{
    if(!profileId || historyPage===1) return;
    const controller=new AbortController();
    adminApiClient.request<{data:MajorVersionDto[]}>(`${path}/versions?profileId=${encodeURIComponent(profileId)}&page=${historyPage}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setHistoryVersions(result.data);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();
  },[majorId,profileId,historyPage,refresh,path]);
  const profile=major?.profiles?.find(row=>row.id===profileId);
  const working=selectMajorWorkingVersion(versions);
  const publication=mode==='all'||mode==='publication',history=mode==='all'||mode==='versions',graph=mode==='all'||mode==='relations';
  useEffect(()=>{if(!publication||!profileId)return;const abort=new AbortController();setReadiness(null);
    adminApiClient.request<{ready:boolean;blockingIssues:Array<{code:string;message:string}>}>(`/admin/majors/${encodeURIComponent(profileId)}/publication-readiness`,{signal:abort.signal,cache:'no-store'}).then(result=>{if(!abort.signal.aborted)setReadiness(result);}).catch(()=>{if(!abort.signal.aborted)setReadiness(null);});return()=>abort.abort();
  },[majorId,profileId,refresh,publication]);
  const required=MAJOR_REVIEW_TEMPLATE[profile?.level ?? ''] ?? [];
  const command=async(action:string,body:Record<string,unknown>,scoped=true)=>{
    if(saving.current)return;if(!Number.isSafeInteger(major?.revision)){setError('لم تكتمل قراءة السجل؛ حدّث البيانات قبل تنفيذ القرار.');return;}if(hasUnsaved){setError('احفظ التعديلات المفتوحة قبل تنفيذ قرار إداري.');return;}if(!reason.trim()){setError('اكتب سبب القرار قبل التنفيذ.');return;}
    if(['archive','reject','restore','unpublish','publish'].includes(action)&&!window.confirm(action==='restore'?'استعادة الملف للمراجعة دون نشره؟':'تنفيذ القرار على ملف الدرجة المحدد؟ تبقى العلاقات والنسخ التاريخية محفوظة.'))return;
    saving.current=true;setBusy(true);setError('');setNotice('');
    try {await adminApiClient.request(`/admin/majors/${encodeURIComponent(scoped?(profileId ?? majorId):majorId)}/${action}`,{method:'POST',headers:{'If-Match':String(major?.revision)},body:JSON.stringify({...body,reason:reason.trim()})});setNotice('تم حفظ القرار وسجل التعديل.');setRefresh(value=>value+1);await onSaved();}
    catch(error){setError(error instanceof Error?error.message:'تعذر حفظ القرار.');}finally{saving.current=false;setBusy(false);}
  };
  if(majorId.startsWith('cat-')) return null;
  const reviewed=hasPermission('admin:majors:review');const publishes=hasPermission('admin:majors:publish');
  return <section aria-label="مراجعة واعتماد التخصص" className="major-governance space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="font-black text-[#142B5F]">{publication?'مراجعة النسخة والنشر':history?'مقارنة النسخ وسجل القرارات':'مراجعة الأسماء والعلاقات'}</h2>
    {publication&&<p className="text-sm">المحتوى المنشور يبقى ثابتًا أثناء تحرير نسخة العمل. الاعتماد يحتاج اكتمال الأقسام ومصدرًا محفوظًا، وأي تعديل لاحق يستلزم مراجعة جديدة.</p>}
    {history && major?.publicId && profileId && working?.id && <MajorTranslationPublicationPanel key={`${profileId}:${working!.id}`} publicId={major.publicId} profileId={profileId} versionId={working!.id} sectionKeys={[...new Set(sections.map(section=>section.sectionKey))]} onSaved={async()=>{setRefresh(value=>value+1);await onSaved();}}/>}
    {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-emerald-700">{notice}</p>}
    {(publication||graph)&&<label className="block">سبب القرار<textarea className="block w-full rounded border p-2" value={reason} onChange={event=>setReason(event.target.value)} maxLength={2000}/></label>}
    {publication&&<p role="status" className="rounded-xl bg-[#FAF7F0] p-3 text-[12px]">{!readiness?'تعذر التحقق من الجاهزية؛ حدّث البيانات.':readiness.ready?'جاهز وفق حارس النشر':'النشر محجوب: '+readiness.blockingIssues.map(issue=>readinessLabels[issue.code]??issue.message).join(' · ')}</p>}
    {publication&&profile&&<button type="button" onClick={()=>setCoverageOpen(value=>!value)} aria-expanded={coverageOpen} className="min-h-10 rounded-lg border px-3">مراجعة تغطية بنود الاعتماد ({required.length})</button>}
    {publication&&coverageOpen&&profile && <div className="grid gap-3 sm:grid-cols-2">{required.map(key=><label key={key}>{labels[key] ?? key}<select className="block w-full rounded border p-2" value={coverage[key] ?? ''} onChange={event=>setCoverage(values=>({...values,[key]:event.target.value}))}><option value="">اختر قسمًا من النسخة يغطّي هذا البند</option>{sections.map(section=><option key={section.id} value={section.id}>{section.title || section.sectionKey}</option>)}</select></label>)}</div>}
    {publication&&<div className="flex flex-wrap gap-3">
      <button disabled={busy || hasUnsaved || !reason.trim() || !reviewed || !working?.id || !profileId || Object.keys(coverage).length!==required.length} onClick={()=>void command('review-version',{versionId:working?.id,coverage})}>اعتماد محتوى النسخة</button>
      <button disabled={busy || hasUnsaved || !reason.trim() || !reviewed || !profileId || Boolean(working)} onClick={()=>void command('working-copy',{})}>إنشاء نسخة عمل من النسخة السابقة</button>
      <button disabled={busy || hasUnsaved || !reason.trim() || !reviewed || !profileId || !readiness?.ready} onClick={()=>void command('mark-publishable',{})}>اعتماد الجاهزية للنشر</button>
      <button disabled={busy || hasUnsaved || !reason.trim() || !publishes || !profileId || !readiness?.ready || profile?.status!=='READY_TO_PUBLISH'} onClick={()=>void command('publish',{})}>نشر النسخة المعتمدة</button>
      {!['ARCHIVED','REJECTED','PUBLISHED'].includes(profile?.status??'')&&<><button disabled={busy||hasUnsaved||!reason.trim()||!reviewed||!profileId} onClick={()=>void command('reject',{})}>رفض للمراجعة</button><button disabled={busy||hasUnsaved||!reason.trim()||!reviewed||!profileId} onClick={()=>void command('archive',{})}>أرشفة الملف</button></>}
      {['ARCHIVED','REJECTED'].includes(profile?.status??'')&&<button disabled={busy||hasUnsaved||!reason.trim()||!reviewed||!profileId} onClick={()=>void command('restore',{})}>استعادة للمراجعة</button>}
      <button disabled={busy || hasUnsaved || !reason.trim() || !publishes || !profile?.currentPublishedVersionId} onClick={()=>void command('unpublish',{})}>إلغاء النشر</button>
    </div>}
    {history&&<details><summary>مقارنة الأقسام مع نسخة سابقة</summary><label>النسخة السابقة<select value={compareId} onChange={event=>setCompareId(event.target.value)} className="block rounded border p-2"><option value="">اختر نسخة</option>{(historyPage===1?versions:historyVersions).filter(version=>version.id!==working?.id).map(version=><option key={version.id} value={version.id}>v{version.versionNumber} · {version.status}</option>)}</select></label><button disabled={historyPage<=1} onClick={()=>setHistoryPage(value=>value-1)}>نسخ أحدث</button><span> صفحة {historyPage} </span><button disabled={(historyPage===1?versions:historyVersions).length<25} onClick={()=>setHistoryPage(value=>value+1)}>نسخ أقدم</button>{compareId && [...new Set([...sections,...compare].map(section=>JSON.stringify([section.sectionKey,section.locale??'ar'])))].map(pair=>{const [key,locale]=JSON.parse(pair) as [string,string];const current=sections.find(section=>section.sectionKey===key&&(section.locale??'ar')===locale);const previous=compare.find(section=>section.sectionKey===key&&(section.locale??'ar')===locale);return <div key={pair} className="my-2 rounded border p-3"><strong>{current?.title || previous?.title || key} · {locale} · {current?.content===previous?.content?'لم يتغير':!current?'غائب من النسخة الحالية':!previous?'جديد':'معدل'}</strong><div className="grid gap-3 sm:grid-cols-2"><pre className="whitespace-pre-wrap">{previous?.content ?? 'غير موجود'}</pre><pre className="whitespace-pre-wrap">{current?.content ?? 'غير موجود'}</pre></div></div>;})}</details>}
    {history&&canReadAudit && <details onToggle={event=>setAuditOpen(event.currentTarget.open)}><summary>سجل القرارات والتعديلات</summary>{timeline?.data.map((row,index)=><p key={index}>{new Date(row.timestamp).toLocaleString('ar')} · {row.action} · {row.actorId} · {row.reason}</p>)}<button disabled={!auditCursor} onClick={()=>setAuditCursor(undefined)}>بداية السجل</button><button disabled={!timeline?.nextCursor} onClick={()=>setAuditCursor(timeline?.nextCursor ?? undefined)}>قرارات أقدم</button></details>}
    {graph&&<section className="grid gap-3 sm:grid-cols-2">
      <label className="block">مرجع الدليل<input className="block rounded border p-2" value={reference} onChange={event=>setReference(event.target.value)}/></label>
      <label className="block">الاسم البديل<input className="block rounded border p-2" value={alias} onChange={event=>setAlias(event.target.value)} maxLength={300}/></label>
      <label>لغة الاسم<select value={locale} onChange={event=>setLocale(event.target.value)}><option value="ar">العربية</option><option value="en">الإنجليزية</option></select></label>
      <label>نوع الاسم<select value={aliasType} onChange={event=>setAliasType(event.target.value)}><option value="ALIAS">اسم بديل</option><option value="SYNONYM">مرادف</option><option value="HISTORICAL_NAME">اسم سابق</option></select></label>
      <button disabled={busy || !reviewed || !reference.trim() || !alias.trim()} onClick={()=>void command('review-graph',{kind:'ALIAS',alias,aliasType,locale,evidenceReference:reference},false)}>إضافة الاسم بعد المراجعة</button>
      <CanonicalPicker label="التخصص المرتبط" value={target} onChange={id=>setTarget(id ?? '')} paged load={(query,page)=>canonicalPickerApi.majors(query,page)} reloadKey="major-relationship-target" optional/>
      <label>نوع العلاقة<select value={relationship} onChange={event=>setRelationship(event.target.value)}><option value="SIMILAR">مشابه</option><option value="PARENT">تخصص رئيسي لهذا التخصص</option><option value="CHILD">تخصص فرعي لهذا التخصص</option><option value="CROSS_LISTED">مشترك بين التصنيفات</option></select></label>
      <button disabled={busy || !reviewed || !target || !reference.trim()} onClick={()=>void command('review-graph',{kind:'RELATIONSHIP',targetMajorId:target,relationshipType:relationship,evidenceReference:reference},false)}>حفظ العلاقة المراجعة</button>

    </section>}
  </section>;
}
