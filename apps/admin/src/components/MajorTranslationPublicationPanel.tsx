import {useRef,useState} from 'react';
import {canAuthorDomainTranslations} from '@absheer/shared';
import {adminApiClient} from '../api/client';
interface Target {ownerRevision?:string;sourceDigest?:string;proposedFields?:Record<string,string>}
export function MajorTranslationPublicationPanel({publicId,profileId,versionId,sectionKeys,onSaved}:{publicId:string;profileId:string;versionId:string;sectionKeys:string[];onSaved:()=>void|Promise<void>}) {
  const [locale,setLocale]=useState('en');const [field,setField]=useState('displayName');const [target,setTarget]=useState<Target>();
  const [approval,setApproval]=useState('');const [reviewer,setReviewer]=useState('');const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const saving=useRef(false);
  const path=`/admin/translations/owners/MAJOR/${encodeURIComponent(publicId)}/${locale}`;
  const scope={fieldKey:field,profileId,versionId};
  const enabled=canAuthorDomainTranslations('MAJOR');
  function reset(){setTarget(undefined);setApproval('');setReviewer('');setNotice('');setError('');}
  async function preview(){setBusy(true);setError('');try{setTarget(await adminApiClient.request<Target>(`${path}/publication-target?${new URLSearchParams(scope)}`));}catch(error){setError(error instanceof Error?error.message:'تعذرت القراءة');}finally{setBusy(false);}}
  async function handover(){if(saving.current||!enabled||!target)return;saving.current=true;setBusy(true);setError('');try{const result=await adminApiClient.request<{published:boolean;publicationStage?:string}>(`${path}/publish`,{method:'POST',body:JSON.stringify({...scope,expectedRevision:target.ownerRevision,expectedSourceDigest:target.sourceDigest,approvalId:approval,reviewedBy:reviewer})});setTarget(undefined);setApproval('');if(result.published||result.publicationStage!=='OWNER_REVIEW_REQUIRED')throw new Error('تعذر التحقق من تسليم نسخة العمل؛ أعد تحميل السجل.');setNotice('تم التسليم لنسخة العمل. يلزم اعتماد نسخة التخصص ثم نشرها؛ النسخة العامة السابقة محفوظة.');await onSaved();}catch(error){setError(error instanceof Error?error.message:'تعذر التسليم');}finally{saving.current=false;setBusy(false);}}
  return <section aria-label="تسليم ترجمة نسخة التخصص" className="space-y-3 rounded border p-4">
    <h3>تسليم ترجمة معتمدة لنسخة العمل</h3><p>تُسلّم الأسماء والأقسام إلى الملف والنسخة المعروضين، ثم تُراجع وتُنشر عبر دورة التخصص.</p>
    {!enabled&&<p role="status">تفعيل الكتابة معلق وفق سياسة الترجمة.</p>}
    <label>اللغة<select value={locale} disabled={busy} onChange={event=>{reset();setLocale(event.target.value);}}><option value="en">English</option><option value="ar">العربية</option></select></label>
    <label>الحقل<select value={field} disabled={busy} onChange={event=>{reset();setField(event.target.value);}}><option value="displayName">الاسم</option>{sectionKeys.map(key=><option key={key} value={`section:${key}`}>{key}</option>)}</select></label>
    <button disabled={busy} onClick={()=>void preview()}>قراءة المرشح المحفوظ</button>
    {target&&<ul>{Object.entries(target.proposedFields??{}).map(([key,value])=><li key={key}>{key}: {value}</li>)}</ul>}
    <label>معرّف اعتماد التسليم<input disabled={!enabled||busy} value={approval} onChange={event=>setApproval(event.target.value)}/></label>
    <label>معرّف المراجع المستقل<input disabled={!enabled||busy} value={reviewer} onChange={event=>setReviewer(event.target.value)}/></label>
    <button disabled={!enabled||busy||!target||!approval.trim()||!reviewer.trim()} onClick={()=>void handover()}>تسليم لمراجعة المالك</button>
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  </section>;
}
