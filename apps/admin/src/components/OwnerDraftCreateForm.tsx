import {useState} from 'react';
import {Link} from 'react-router-dom';
import {adminApiClient} from '../api/client';
import {canonicalPickerApi} from '../api/canonicalPickers';
import {CanonicalPicker} from './CanonicalPicker';
import {useAdminAuthorization} from '../security/AdminAuthorizationContext';

type Owner='majors'|'universities'|'scholarships';
const names:Record<Owner,string>={majors:'تخصص',universities:'جامعة',scholarships:'منحة'};
export function OwnerDraftCreateForm({owner}:{owner:Owner}) {
 const {hasPermission}=useAdminAuthorization();
 const [name,setName]=useState('');const [reason,setReason]=useState('');const [source,setSource]=useState('');const [hash,setHash]=useState('');const [website,setWebsite]=useState('');
 const [degree,setDegree]=useState('');const [level,setLevel]=useState('');const [taxonomy,setTaxonomy]=useState('');const [country,setCountry]=useState('');const [funding,setFunding]=useState('');const [sponsor,setSponsor]=useState('');
 const [created,setCreated]=useState('');const [error,setError]=useState('');const [busy,setBusy]=useState(false);
 if(!hasPermission(`admin:${owner}:manage`))return null;
 const create=async()=>{
   if(busy)return;setBusy(true);setError('');setCreated('');
   try {
     const common={displayName:name.trim(),reason:reason.trim()};
     const input=owner==='majors'?{...common,level,degreeLevelId:degree,academicFieldId:taxonomy,sourceUri:source,sourceHash:hash}
       :owner==='universities'?{...common,officialWebsite:website,sourceUri:source,sourceHash:hash,country:country || undefined}
       :{...common,officialSourceUrl:source,fundingCoverage:funding,degreeLevel:level,sponsorName:sponsor || undefined};
     const result=await adminApiClient.request<{id:string}>(`/admin/${owner}`,{method:'POST',headers:{'X-Review-Reason':reason.trim()},body:JSON.stringify(input)});
     setCreated(result.id);
   }catch(error){setError(error instanceof Error?error.message:'تعذر إنشاء المسودة');}finally{setBusy(false);}
 };
 return <details className="admin-section-tools"><summary>إنشاء مسودة {names[owner]}</summary>
 <p>سجل خاص للإكمال والمراجعة. لا ينشر الإنشاء أي محتوى للطلاب.</p>
 {error && <p role="alert">{error}</p>}
 {created && <p role="status">حُفظت المسودة. <Link to={`/${owner}/${encodeURIComponent(created)}`}>فتح المسودة</Link></p>}
 <form className="grid items-start gap-4 sm:grid-cols-2" onSubmit={event=>{event.preventDefault();void create();}}>
 <label>الاسم<input required maxLength={300} value={name} onChange={event=>setName(event.target.value)}/></label>
 <label>المصدر الرسمي HTTPS<input required type="url" value={source} onChange={event=>setSource(event.target.value)}/></label>
 <label>سبب الإنشاء<textarea required minLength={3} maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)}/></label>
 {owner!=='scholarships' && <label>بصمة المصدر SHA256<input required pattern="[a-fA-F0-9]{64}" value={hash} onChange={event=>setHash(event.target.value)}/></label>}
 {owner==='universities' && <><label>الموقع الرسمي<input required type="url" value={website} onChange={event=>setWebsite(event.target.value)}/></label><label>اسم الدولة كما ورد في المصدر<input value={country} onChange={event=>setCountry(event.target.value)}/></label><p>تُستكمل الروابط الجغرافية المعيارية في محرر الجامعة؛ الاسم لا ينشئ ربطًا.</p></>}
 {owner==='majors' && hasPermission('admin:academic-taxonomy:manage') && <>
 <CanonicalPicker label="الدرجة المعيارية" value={degree} onChange={(id,option)=>{setDegree(id ?? '');setLevel(option?.code ?? '');}} load={async(query)=>(await canonicalPickerApi.degreeLevels(query)).filter(row=>['BACHELOR','MASTER','DOCTORATE','FELLOWSHIP'].includes(row.code ?? ''))} reloadKey="draft-degree"/>
 <CanonicalPicker label="المجال الأكاديمي المعياري" value={taxonomy} onChange={id=>setTaxonomy(id ?? '')} load={(query,page)=>canonicalPickerApi.taxonomyNodes('ACADEMIC_FIELD',query,page)} reloadKey="draft-taxonomy" paged/>
 </>}
 {owner==='scholarships' && <><label>الدرجة كما وردت في المصدر<input required value={level} onChange={event=>setLevel(event.target.value)}/></label><label>التغطية التمويلية الموثقة<input required value={funding} onChange={event=>setFunding(event.target.value)}/></label><label>الجهة المانحة<input value={sponsor} onChange={event=>setSponsor(event.target.value)}/></label><p>تُحل العلاقات إلى معرفات معيارية في محرر المنحة قبل النشر.</p></>}
 <button disabled={busy || !!created || (owner==='majors' && (!degree || !taxonomy))} type="submit">{busy?'جارٍ الحفظ…':'حفظ مسودة خاصة'}</button>
 </form></details>;
}
