import {useState} from 'react';
import type {MajorDto, MajorContentSectionDto} from '@absheer/domain';
import {adminApiClient} from '../api/client';
import {canonicalPickerApi} from '../api/canonicalPickers';
import {CanonicalPicker} from './CanonicalPicker';
import {useAdminAuthorization} from '../security/AdminAuthorizationContext';

const labels:Record<string,string>={identity:'هوية الزمالة',overview:'ملف الزمالة',requirements:'متطلبات الدخول والإكمال',benefits:'المنافع الموثقة',academic_notice:'الحدود المهنية والأكاديمية',sources:'المصادر'};
export function FellowshipAuthoringPanel({major,onSaved}:{major:Pick<MajorDto,'id'|'profiles'|'revision'>;onSaved:()=>Promise<void>}) {
  const {hasPermission}=useAdminAuthorization();
  const [degree,setDegree]=useState('');const [name,setName]=useState('');const [source,setSource]=useState('');const [hash,setHash]=useState('');const [reason,setReason]=useState('');
  const [sections,setSections]=useState<MajorContentSectionDto[]>([]);const [error,setError]=useState('');const [busy,setBusy]=useState(false);
  const profile=major.profiles?.find(row=>row.level==='FELLOWSHIP');
  if(!hasPermission('admin:majors:manage') || major.id.startsWith('cat-')) return null;
  const run=async(operation:()=>Promise<void>)=>{if(busy)return;setBusy(true);setError('');try{await operation();await onSaved();}catch(error){setError(error instanceof Error?error.message:'تعذر الحفظ');}finally{setBusy(false);}};
  return <details className="rounded border bg-white p-4"><summary>تأليف الزمالة</summary>
    {error && <p role="alert">{error}</p>}
    <label>سبب التعديل<input value={reason} onChange={event=>setReason(event.target.value)} maxLength={2000}/></label>
    {!profile ? <>
      <p>تُنشأ مسودة خاصة؛ النشر يحتاج مراجعة النسخة من تبويب الإصدارات.</p>
      <label>اسم الزمالة<input value={name} onChange={event=>setName(event.target.value)} maxLength={300}/></label>
      {hasPermission('admin:academic-taxonomy:manage') && <CanonicalPicker label="درجة الزمالة المعيارية" value={degree} onChange={id=>setDegree(id ?? '')} load={async(query)=>(await canonicalPickerApi.degreeLevels(query)).filter(row=>row.code==='FELLOWSHIP')} reloadKey="fellowship-degree"/>}
      <label>رابط المصدر HTTPS<input type="url" value={source} onChange={event=>setSource(event.target.value)}/></label>
      <label>بصمة المصدر SHA256<input value={hash} onChange={event=>setHash(event.target.value)} maxLength={64}/></label>
      <button disabled={busy || !degree || !name.trim() || !reason.trim() || !source || !/^[a-f0-9]{64}$/i.test(hash)} onClick={()=>void run(async()=>{await adminApiClient.request(`/admin/majors/${major.id}/fellowship-profiles`,{method:'POST',headers:{'If-Match':String(major.revision)},body:JSON.stringify({degreeLevelId:degree,displayName:name,sourceUri:source,sourceHash:hash,reason})});})}>إنشاء ملف زمالة للمراجعة</button>
    </> : <>
      <p>الملف {profile.code} — المحتوى المنشور يبقى في نسخته الثابتة أثناء التأليف.</p>
      <button disabled={busy} onClick={()=>void run(async()=>{const response=await adminApiClient.request<{data:MajorContentSectionDto[]}>(`/admin/majors/${major.id}/content-sections?profileId=${profile.id}`);setSections(response.data);})}>تحميل أقسام نسخة العمل</button>
      {sections.map((section,index)=><label className="block" key={section.id}>{labels[section.sectionKey] ?? section.sectionKey}<textarea className="block w-full border" value={section.content} onChange={event=>setSections(rows=>rows.map((row,i)=>i===index?{...row,content:event.target.value}:row))}/></label>)}
      <button disabled={busy || !reason.trim() || !sections.length || ['PUBLISHED','ARCHIVED'].includes(profile.status ?? '')} onClick={()=>void run(async()=>{await adminApiClient.request(`/admin/majors/${major.id}/content-sections`,{method:'PUT',headers:{'If-Match':String(major.revision)},body:JSON.stringify({profileId:profile.id,versionId:sections[0]?.versionId,reason,sections:sections.map(row=>({id:row.id,sectionKey:row.sectionKey,locale:row.locale,title:row.title,content:row.content,reviewStatus:row.content.trim()?'COMPLETE':'INCOMPLETE'}))})});})}>حفظ أقسام الزمالة للمراجعة</button>
    </>}
  </details>;
}
