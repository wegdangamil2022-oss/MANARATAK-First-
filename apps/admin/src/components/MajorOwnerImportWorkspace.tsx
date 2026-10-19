import {useEffect,useRef,useState} from 'react';
import {Link} from 'react-router-dom';
import type {MajorImportReview} from '@absheer/domain';
import {adminApiClient} from '../api/client';
import {useTranslation} from '../i18n/I18nProvider';
import {useAdminAuthorization} from '../security/AdminAuthorizationContext';
export function MajorOwnerImportWorkspace(){
 const {language}=useTranslation();const ar=language==='ar';const text=(arabic:string,english:string)=>ar?arabic:english;
 const {hasPermission}=useAdminAuthorization();const canReview=hasPermission('admin:majors:review');
 const [page,setPage]=useState(1),[refresh,setRefresh]=useState(0),[reason,setReason]=useState('');
 const [screenings,setScreenings]=useState<{data:Array<{id:string;result:any}>;total:number}|null>(null);
 const [plans,setPlans]=useState<{data:MajorImportReview[];total:number}|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false);const lock=useRef(false);
 useEffect(()=>{const abort=new AbortController();setScreenings(null);setPlans(null);setError('');
  Promise.all([adminApiClient.request<any>(`/admin/majors/owner-imports/screenings?page=${page}`,{signal:abort.signal,cache:'no-store'}),adminApiClient.request<any>(`/admin/majors/owner-imports?page=${page}`,{signal:abort.signal,cache:'no-store'})])
   .then(([receipts,reviews])=>{if(!abort.signal.aborted){setScreenings(receipts);setPlans(reviews);}}).catch(()=>{if(!abort.signal.aborted)setError('تعذر قراءة المراجعات؛ تحقق من الصلاحيات وتجهيز ترحيل P10. النتيجة غير معروفة.');});return ()=>abort.abort();
 },[page,refresh]);
 const command=async(path:string,body:object)=>{if(lock.current)return;lock.current=true;setBusy(true);setError('');try{await adminApiClient.request('/admin/majors/owner-imports/'+path,{method:'POST',body:JSON.stringify(body)});setRefresh(value=>value+1);}catch(error){setError(error instanceof Error?error.message:'تعذر تنفيذ القرار');}finally{lock.current=false;setBusy(false);}};
 return <section className="space-y-3 rounded border bg-white p-4">
  <h2 className="font-bold">{text('مراجعة استيراد التخصصات — P10','Major import review — P10')}</h2><p>{text('مرحلة P6 تنقل البيانات فقط. التطبيق هنا ينشئ مسودة أو نسخة عمل، ولا ينشر تخصصًا أو يحذف المصدر.','P6 transports records. Owner apply creates a draft or working version; publication requires separate review.')}</p><Link className="underline" to="/imports/majors">{text('رفع ملف مصدر موثّق إلى P6','Stage a verified source file in P6')}</Link>
  {error&&<p role="alert">{error}</p>}{!error&&(!screenings||!plans)&&<p role="status">{text('جارٍ قراءة قوائم المراجعة…','Loading owner reviews…')}</p>}
  <label className="block">{text('سبب المراجعة','Review reason')}<textarea maxLength={2000} value={reason} onChange={event=>setReason(event.target.value)} className="block w-full rounded border p-2"/></label>
  {screenings&&<><h3>{text('إيصالات تحتاج معاينة','Receipts awaiting preview')} ({screenings.total})</h3>{screenings.data.map(row=><div key={row.id} className="border-b p-2"><p>{row.result?.payload?.canonicalMajorName??row.id} · {row.result?.state}</p><button type="button" disabled={busy||!canReview||row.result?.state!=='NEEDS_OWNER_REVIEW'||row.result?.dryRun!==false} onClick={()=>void command('preview',{receiptId:row.id})}>{text('معاينة المالك','Owner preview')}</button></div>)}</>}
  {plans&&<><h3>{text('قرارات المالك','Owner decisions')} ({plans.total})</h3>{plans.data.map(plan=><article key={plan.id} className="space-y-2 rounded border p-3"><p>{plan.payload.canonicalMajorName} · {plan.payload.degreeLevel} · {plan.status} · v{plan.version}</p><p>الأصل: {plan.preview.targetId??'مسودة جديدة'} · نسخة الأصل: {plan.preview.targetRevision??'—'}</p><p className="break-all text-xs">{plan.previewHash}</p><div className="flex gap-3">
   <button type="button" disabled={busy||!canReview||plan.status==='APPLIED'} onClick={()=>void command(encodeURIComponent(plan.id)+'/refresh',{expectedVersion:plan.version})}>{text('تحديث المعاينة وإلغاء الموافقة القديمة','Refresh preview and invalidate prior approval')}</button>
   {(['APPROVE','REJECT'] as const).map(decision=><button key={decision} type="button" disabled={busy||!canReview||plan.status!=='PREVIEWED'||!reason.trim()} onClick={()=>void command(encodeURIComponent(plan.id)+'/review',{expectedVersion:plan.version,previewHash:plan.previewHash,decision,reason})}>{decision==='APPROVE'?text('اعتماد المراجعة','Approve review'):text('رفض','Reject')}</button>)}
   <button type="button" disabled={busy||!canReview||plan.status!=='APPROVED'} onClick={()=>void command(encodeURIComponent(plan.id)+'/apply',{expectedVersion:plan.version,previewHash:plan.previewHash})}>{text('تطبيق المسودة المعتمدة','Apply approved draft')}</button>
  </div></article>)}</>}
  <nav aria-label="صفحات استيراد التخصصات"><button type="button" disabled={page<=1||busy} onClick={()=>setPage(value=>value-1)}>{text('السابق','Previous')}</button><span> {page} </span><button type="button" disabled={page>=1000||busy||!plans||!screenings||page*25>=Math.max(plans.total,screenings.total)} onClick={()=>setPage(value=>value+1)}>{text('التالي','Next')}</button></nav>
 </section>;
}
