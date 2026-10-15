import {useEffect,useRef,useState} from 'react';
import {canAuthorDomainTranslations,type TranslationDomainKey} from '@manaratak/shared';
import {adminApiClient} from '../api/client';
export function OwnerDescriptionTranslationPanel({domain,ownerId,endpoint,optionalFields,status,onSaved}:{domain:Extract<TranslationDomainKey,'COURSE'|'SCHOLARSHIP'|'INTERNATIONAL_TEST'>;ownerId:string;endpoint:string;optionalFields?:Record<string,unknown>;status:string;onSaved:()=>void|Promise<void>}) {
  const [locale,setLocale]=useState<'ar'|'en'>('ar');const [title,setTitle]=useState('');const [description,setDescription]=useState('');
  const [reason,setReason]=useState('');const [error,setError]=useState('');const [notice,setNotice]=useState('');const [busy,setBusy]=useState(false);const [reloadRequired,setReloadRequired]=useState(false);const saving=useRef(false);
  const enabled=canAuthorDomainTranslations(domain) && !['ARCHIVED','REJECTED'].includes(status) && (domain==='INTERNATIONAL_TEST'||status!=='PUBLISHED');
  useEffect(()=>{const pairs=optionalFields?.ownerLocalizedDescriptions as Record<string,{displayName?:string;description?:string}>|undefined;setTitle(pairs?.[locale]?.displayName??'');setDescription(pairs?.[locale]?.description??'');setError('');setNotice('');setReloadRequired(false);},[ownerId,locale,optionalFields]);
  async function save(remove=false) {
    if(saving.current||!enabled||reloadRequired)return;saving.current=true;setBusy(true);setError('');setNotice('');let written=false;
    try {
      await adminApiClient.request(`${endpoint}/${encodeURIComponent(ownerId)}/localized-description`,{method:'POST',headers:{'X-Review-Reason':reason},body:JSON.stringify(remove?{locale,remove:true}:{locale,displayName:title,description})});
      written=true;
      const response=await adminApiClient.request<Record<string,unknown>>(`${endpoint}/${encodeURIComponent(ownerId)}`);
      const readback=(response.scholarship??response) as {id?:string;optionalFields?:{ownerLocalizedDescriptions?:Record<string,{displayName?:string;description?:string}>}};
      const pair=readback.optionalFields?.ownerLocalizedDescriptions?.[locale];
      if(readback.id!==ownerId || (remove ? pair!==undefined : pair?.displayName!==title.trim()||pair?.description!==description.trim())) throw new Error('تعذّر التحقق من القيم المحفوظة.');
      await onSaved();setNotice('حُفظ زوج الاسم والوصف في نسخة المالك؛ يلزم مسار المراجعة والنشر الأصلي.');
    } catch(error){if(written)setReloadRequired(true);setError((written?'نجح الحفظ وتعذرت إعادة القراءة؛ أعد تحميل السجل قبل المحاولة. ': '')+(error instanceof Error?error.message:'تعذر الحفظ'));}
    finally {saving.current=false;setBusy(false);}
  }
  return <section aria-label="ترجمة وصف المالك" className="space-y-3 rounded-xl border bg-white p-4">
    <h2>ترجمة الاسم والوصف</h2><p>يُراجع الاسم والوصف معًا ضمن نسخة هذا المحتوى. تغيير المصدر يستلزم إعادة المراجعة.</p>
    {!enabled&&<p role="status">الكتابة معلقة وفق سياسة الترجمة أو حالة السجل. لا يفعّل هذا النموذج النشر.</p>}
    {error&&<p role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
    <label>لغة النص<select value={locale} disabled={busy} onChange={event=>setLocale(event.target.value as 'ar'|'en')}><option value="ar">العربية</option><option value="en">English</option></select></label>
    <label>الاسم المترجم<input disabled={!enabled||busy} value={title} maxLength={500} onChange={event=>setTitle(event.target.value)}/></label>
    <label>الوصف المترجم<textarea disabled={!enabled||busy} value={description} maxLength={100000} onChange={event=>setDescription(event.target.value)}/></label>
    <label>سبب التعديل<input disabled={!enabled||busy} value={reason} maxLength={2000} onChange={event=>setReason(event.target.value)}/></label>
    <button disabled={!enabled||busy||reloadRequired||reason.trim().length<3||!title.trim()||!description.trim()} onClick={()=>void save()}>حفظ للمراجعة</button>
    <button disabled={!enabled||busy||reloadRequired||reason.trim().length<3} onClick={()=>void save(true)}>إزالة ترجمة هذه اللغة</button>
  </section>;
}
