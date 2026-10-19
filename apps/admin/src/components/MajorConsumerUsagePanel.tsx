import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { MajorConsumerPage } from '@absheer/domain';
import { adminApiClient } from '../api/client';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useTranslation } from '../i18n/I18nProvider';

function OwnerUsage({majorId,owner}:{majorId:string;owner:'universities'|'scholarships'}) {
  const {language}=useTranslation();const ar=language==='ar';
  const [page,setPage]=useState(1);const [scope,setScope]=useState<'ALL'|'PUBLISHED'>('ALL');const [refresh,setRefresh]=useState(0);
  const [data,setData]=useState<MajorConsumerPage|null>(null);const [error,setError]=useState('');
  useEffect(()=>{
    const abort=new AbortController();setData(null);setError('');
    adminApiClient.request<MajorConsumerPage>(`/admin/majors/${encodeURIComponent(majorId)}/usage/${owner}?page=${page}&scope=${scope}`,{signal:abort.signal,cache:'no-store'})
      .then(value=>{if(!abort.signal.aborted)setData(value);}).catch(()=>{if(!abort.signal.aborted)setError(ar?'تعذر قراءة استخدام هذا المالك؛ العدد غير معروف.':'Owner usage unavailable; count is unknown.');});
    return ()=>abort.abort();
  },[majorId,owner,page,scope,refresh,ar]);
  return <div className="space-y-2 rounded border p-3">
    <h4>{owner==='universities'?(ar?'برامج الجامعات':'University programs'):(ar?'أهداف المنح وشروط الأهلية':'Scholarship targets and eligibility')}</h4>
    <label>{ar?'نطاق النشر':'Publication scope'} <select value={scope} onChange={event=>{setScope(event.target.value as typeof scope);setPage(1);}}><option value="ALL">{ar?'جميع السجلات الإدارية':'All admin records'}</option><option value="PUBLISHED">{ar?'المنشورة المعتمدة فقط':'Approved published records'}</option></select></label>
    <button type="button" onClick={()=>setRefresh(value=>value+1)}>{ar?'تحديث':'Refresh'}</button>
    {error?<p role="alert">{error}</p>:!data?<p role="status">{ar?'جارٍ قراءة الاستخدام…':'Loading usage…'}</p>:<>
      <p>{data.total} {ar?'روابط صريحة؛ العلاقات غير المحسومة غير معروفة ولا تُعد صفرًا.':'explicit relationships; unresolved usage is unknown.'}</p>
      {!data.data.length&&<p>{ar?'لا توجد روابط مطابقة في هذه الصفحة.':'No matching relationships on this page.'}</p>}
      <ul>{data.data.map(row=><li key={`${row.kind}:${row.id}`}><Link className="underline" to={`/${owner}/${encodeURIComponent(row.ownerId)}`}>{row.ownerName}</Link> · {row.label} · {row.ownerStatus}/{row.status} · {row.degreeLevelId??'—'}</li>)}</ul>
      <nav aria-label={ar?'صفحات الاستخدام':'Usage pages'}><button type="button" disabled={page<=1} onClick={()=>setPage(value=>value-1)}>{ar?'السابق':'Previous'}</button><span> {page} </span><button type="button" disabled={page>=1000||page*data.pageSize>=data.total} onClick={()=>setPage(value=>value+1)}>{ar?'التالي':'Next'}</button></nav>
    </>}
  </div>;
}
export function MajorConsumerUsagePanel({majorId}:{majorId:string}) {
  const {hasPermission}=useAdminAuthorization();const {language}=useTranslation();const ar=language==='ar';
  if(majorId.startsWith('cat-'))return null;
  return <section aria-label={ar?'استخدام التخصص وأثر التغيير':'Major usage and change impact'} className="space-y-3 rounded border p-4">
    <h3 className="font-bold">{ar?'استخدام التخصص قبل تعديل الهوية أو إلغاء النشر':'Major usage before identity changes or unpublishing'}</h3>
    <p>{ar?'هذه قراءة من المالكين؛ لا تغيّر البرامج أو شروط المنح. الأعداد تخص الروابط لا عدد الأشخاص أو المؤسسات الفريدة.':'Read-only owner evidence; counts represent relationships, not unique institutions or people.'}</p>
    {(['universities','scholarships'] as const).map(owner=>hasPermission(`admin:${owner}:manage`)?<OwnerUsage key={`${majorId}:${owner}`} majorId={majorId} owner={owner}/>:<p key={owner}>{ar?'يلزم تصريح المالك لقراءة':'Owner permission required for'} {owner}; {ar?'الاستخدام غير معروف.':'usage is unknown.'}</p>)}
  </section>;
}
