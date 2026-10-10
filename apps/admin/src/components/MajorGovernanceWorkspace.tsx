import {useEffect,useRef,useState} from 'react';
import {MAJOR_REVIEW_TEMPLATE,type MajorDto,type MajorContentSectionDto,type MajorVersionDto} from '@manaratak/domain';
import {adminApiClient} from '../api/client';
import {canonicalPickerApi} from '../api/canonicalPickers';
import {CanonicalPicker} from './CanonicalPicker';
import {useAdminAuthorization} from '../security/AdminAuthorizationContext';

const labels:Record<string,string>={identity:'الهوية والدرجة والمصدر',overview:'نبذة التخصص',study_content:'ماذا يدرس الطالب',foundation_courses:'المواد التأسيسية',core_courses:'المواد الأساسية',practical_training:'التدريب العملي',skills:'المهارات',tracks:'المسارات الدقيقة',career_links:'مجالات العمل',postgraduate_paths:'الدراسات العليا',related_majors:'التخصصات المشابهة',academic_notice:'التنبيه الأكاديمي والمهني',sources:'المصادر وتاريخ التحقق',entry_backgrounds:'الخلفيات الأكاديمية والمتطلبات',curriculum:'المقررات ومناهج البحث',completion_requirements:'الرسالة أو المشروع ومتطلبات الإكمال',advanced_skills:'المهارات المتقدمة',doctoral_paths:'الدكتوراه والزمالات',bachelor_links:'روابط تخصصات البكالوريوس',entry_paths:'مسارات دخول الدكتوراه',program_stages:'مراحل البرنامج',research_fields:'المجالات البحثية',research_methods:'مناهج البحث',milestones:'الاختبارات والمراحل المطلوبة',dissertation:'الأطروحة',research_skills:'المهارات البحثية'};
export function MajorGovernanceWorkspace({majorId,profileId,onSaved}:{majorId:string;profileId?:string;onSaved:()=>void|Promise<void>}) {
  const {hasPermission}=useAdminAuthorization();
  const [major,setMajor]=useState<MajorDto>();const [versions,setVersions]=useState<MajorVersionDto[]>([]);
  const [sections,setSections]=useState<MajorContentSectionDto[]>([]);const [compare,setCompare]=useState<MajorContentSectionDto[]>([]);
  const [coverage,setCoverage]=useState<Record<string,string>>({});const [reason,setReason]=useState('');const [reference,setReference]=useState('');
  const [alias,setAlias]=useState('');const [aliasType,setAliasType]=useState('ALIAS');const [locale,setLocale]=useState('ar');
  const [target,setTarget]=useState('');const [relationship,setRelationship]=useState('SIMILAR');const [taxonomy,setTaxonomy]=useState('');
  const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const saving=useRef(false);
  const [historyPage,setHistoryPage]=useState(1);const [historyVersions,setHistoryVersions]=useState<MajorVersionDto[]>([]);
  const [refresh,setRefresh]=useState(0);const [compareId,setCompareId]=useState('');
  const [timeline,setTimeline]=useState<{data:Array<{action:string;actorId:string;timestamp:string;reason?:string}>;nextCursor:string|null}>();
  const [auditCursor,setAuditCursor]=useState<string>();
  const [auditOpen,setAuditOpen]=useState(false);
  const canReadAudit=hasPermission('admin:audit:manage');
  const path=`/admin/majors/${encodeURIComponent(majorId)}`;
  useEffect(()=>{
    const controller=new AbortController();setError('');setCoverage({});setCompareId('');setHistoryPage(1);
    const scope=profileId?`?profileId=${encodeURIComponent(profileId)}`:'';
    Promise.all([adminApiClient.request<MajorDto>(path,{signal:controller.signal}),adminApiClient.request<{data:MajorVersionDto[]}>(`${path}/versions${scope}`,{signal:controller.signal}),adminApiClient.request<{data:MajorContentSectionDto[]}>(`${path}/content-sections${scope}`,{signal:controller.signal})]).then(([owner,history,content])=>{if(!controller.signal.aborted){setMajor(owner);setVersions(history.data);setSections(content.data);}}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
    return ()=>controller.abort();
  },[majorId,profileId,refresh]);
  useEffect(()=>{
    const controller=new AbortController();setCompare([]);if(!compareId || !profileId) return ()=>controller.abort();
    adminApiClient.request<{data:MajorContentSectionDto[]}>(`${path}/content-sections?profileId=${encodeURIComponent(profileId)}&versionId=${encodeURIComponent(compareId)}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setCompare(result.data);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();
  },[majorId,profileId,compareId]);
  useEffect(()=>{
    if(!canReadAudit || !auditOpen) return;
    const controller=new AbortController();
    adminApiClient.request<{data:Array<{action:string;actorId:string;timestamp:string;reason?:string}>;nextCursor:string|null}>(`${path}/timeline${auditCursor?'?cursor='+encodeURIComponent(auditCursor):''}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setTimeline(result);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();
  },[majorId,auditCursor,refresh,canReadAudit,auditOpen]);
  useEffect(()=>{
    if(!profileId || historyPage===1) return;
    const controller=new AbortController();
    adminApiClient.request<{data:MajorVersionDto[]}>(`${path}/versions?profileId=${encodeURIComponent(profileId)}&page=${historyPage}`,{signal:controller.signal}).then(result=>{if(!controller.signal.aborted)setHistoryVersions(result.data);}).catch(error=>{if(!controller.signal.aborted)setError(error.message);});return ()=>controller.abort();
  },[majorId,profileId,historyPage,refresh]);
  const profile=major?.profiles?.find(row=>row.id===profileId);
  const required=MAJOR_REVIEW_TEMPLATE[profile?.level ?? ''] ?? [];
  const command=async(action:string,body:Record<string,unknown>,scoped=true)=>{
    if(saving.current) return;if(!reason.trim()){setError('اكتب سبب القرار قبل التنفيذ.');return;}
    saving.current=true;setBusy(true);setError('');setNotice('');
    try {await adminApiClient.request(`/admin/majors/${encodeURIComponent(scoped?(profileId ?? majorId):majorId)}/${action}`,{method:'POST',body:JSON.stringify({...body,reason:reason.trim()})});setNotice('تم حفظ القرار وسجل التعديل.');setRefresh(value=>value+1);await onSaved();}
    catch(error){setError(error instanceof Error?error.message:'تعذر حفظ القرار.');}finally{saving.current=false;setBusy(false);}
  };
  if(majorId.startsWith('cat-')) return null;
  const reviewed=hasPermission('admin:majors:review');const publishes=hasPermission('admin:majors:publish');
  return <section aria-label="مراجعة واعتماد التخصص" className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5">
    <h2 className="font-black text-[#142B5F]">مراجعة النسخة قبل النشر</h2>
    <p className="text-sm">المحتوى المنشور يبقى ثابتًا أثناء تحرير نسخة العمل. الاعتماد يحتاج اكتمال الأقسام ومصدرًا محفوظًا، وأي تعديل لاحق يستلزم مراجعة جديدة.</p>
    {error && <p role="alert" className="text-red-700">{error}</p>}{notice && <p role="status" className="text-emerald-700">{notice}</p>}
    <label className="block">سبب القرار<textarea className="block w-full rounded border p-2" value={reason} onChange={event=>setReason(event.target.value)} maxLength={2000}/></label>
    {profile && <div className="grid gap-3 sm:grid-cols-2">{required.map(key=><label key={key}>{labels[key] ?? key}<select className="block w-full rounded border p-2" value={coverage[key] ?? ''} onChange={event=>setCoverage(values=>({...values,[key]:event.target.value}))}><option value="">اختر قسمًا من النسخة يغطّي هذا البند</option>{sections.map(section=><option key={section.id} value={section.id}>{section.title || section.sectionKey}</option>)}</select></label>)}</div>}
    <div className="flex flex-wrap gap-3">
      <button disabled={busy || !reviewed || !versions[0]?.id || !profileId} onClick={()=>void command('review-version',{versionId:versions[0]?.id,coverage})}>اعتماد محتوى النسخة</button>
      <button disabled={busy || !reviewed || !profileId} onClick={()=>void command('working-copy',{})}>إنشاء نسخة عمل من النسخة السابقة</button>
      <button disabled={busy || !reviewed || !profileId} onClick={()=>void command('mark-publishable',{})}>اعتماد الجاهزية للنشر</button>
      <button disabled={busy || !publishes || !profileId} onClick={()=>void command('publish',{})}>نشر النسخة المعتمدة</button>
      <button disabled={busy || !publishes || !profile?.currentPublishedVersionId} onClick={()=>void command('unpublish',{})}>إلغاء النشر</button>
    </div>
    <details><summary>مقارنة الأقسام مع نسخة سابقة</summary><label>النسخة السابقة<select value={compareId} onChange={event=>setCompareId(event.target.value)} className="block rounded border p-2"><option value="">اختر نسخة</option>{(historyPage===1?versions:historyVersions).filter(version=>version.id!==versions[0]?.id).map(version=><option key={version.id} value={version.id}>v{version.versionNumber} · {version.status}</option>)}</select></label><button disabled={historyPage<=1} onClick={()=>setHistoryPage(value=>value-1)}>نسخ أحدث</button><span> صفحة {historyPage} </span><button disabled={(historyPage===1?versions:historyVersions).length<25} onClick={()=>setHistoryPage(value=>value+1)}>نسخ أقدم</button>{compareId && [...new Set([...sections,...compare].map(section=>section.sectionKey))].map(key=>{const current=sections.find(section=>section.sectionKey===key);const previous=compare.find(section=>section.sectionKey===key);return <div key={key} className="my-2 rounded border p-3"><strong>{current?.title || previous?.title || key} · {current?.content===previous?.content?'لم يتغير':!current?'غائب من النسخة الحالية':!previous?'جديد':'معدل'}</strong><div className="grid gap-3 sm:grid-cols-2"><pre className="whitespace-pre-wrap">{previous?.content ?? 'غير موجود'}</pre><pre className="whitespace-pre-wrap">{current?.content ?? 'غير موجود'}</pre></div></div>;})}</details>
    {canReadAudit && <details onToggle={event=>setAuditOpen(event.currentTarget.open)}><summary>سجل القرارات والتعديلات</summary>{timeline?.data.map((row,index)=><p key={index}>{new Date(row.timestamp).toLocaleString('ar')} · {row.action} · {row.actorId} · {row.reason}</p>)}<button disabled={!auditCursor} onClick={()=>setAuditCursor(undefined)}>بداية السجل</button><button disabled={!timeline?.nextCursor} onClick={()=>setAuditCursor(timeline?.nextCursor ?? undefined)}>قرارات أقدم</button></details>}
    <details><summary>مراجعة الأسماء البديلة والعلاقات والتصنيف</summary>
      <label className="block">مرجع الدليل<input className="block rounded border p-2" value={reference} onChange={event=>setReference(event.target.value)}/></label>
      <label className="block">الاسم البديل<input className="block rounded border p-2" value={alias} onChange={event=>setAlias(event.target.value)} maxLength={300}/></label>
      <label>لغة الاسم<select value={locale} onChange={event=>setLocale(event.target.value)}><option value="ar">العربية</option><option value="en">الإنجليزية</option></select></label>
      <label>نوع الاسم<select value={aliasType} onChange={event=>setAliasType(event.target.value)}><option value="ALIAS">اسم بديل</option><option value="SYNONYM">مرادف</option><option value="HISTORICAL_NAME">اسم سابق</option></select></label>
      <button disabled={busy || !reviewed || !reference.trim() || !alias.trim()} onClick={()=>void command('review-graph',{kind:'ALIAS',alias,aliasType,locale,evidenceReference:reference},false)}>إضافة الاسم بعد المراجعة</button>
      <CanonicalPicker label="التخصص المرتبط" value={target} onChange={id=>setTarget(id ?? '')} load={()=>canonicalPickerApi.majors()} reloadKey="major-relationship-target" optional/>
      <label>نوع العلاقة<select value={relationship} onChange={event=>setRelationship(event.target.value)}><option value="SIMILAR">مشابه</option><option value="PARENT">تخصص رئيسي لهذا التخصص</option><option value="CHILD">تخصص فرعي لهذا التخصص</option><option value="CROSS_LISTED">مشترك بين التصنيفات</option></select></label>
      <button disabled={busy || !reviewed || !target || !reference.trim()} onClick={()=>void command('review-graph',{kind:'RELATIONSHIP',targetMajorId:target,relationshipType:relationship,evidenceReference:reference},false)}>حفظ العلاقة المراجعة</button>
      <CanonicalPicker label="عقدة التصنيف الأكاديمي" value={taxonomy} onChange={id=>setTaxonomy(id ?? '')} load={()=>canonicalPickerApi.taxonomyNodes()} reloadKey="major-classification-target" optional/>
      <button disabled={busy || !reviewed || !taxonomy || !reference.trim()} onClick={()=>void command('classification-mappings',{taxonomyNodeId:taxonomy,profileId,relationshipType:'PRIMARY',evidenceReference:reference},false)}>ربط التصنيف المرجعي</button>
    </details>
  </section>;
}
