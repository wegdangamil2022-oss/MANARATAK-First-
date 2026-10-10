import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import type { ReferenceOwnerReview, ReferenceSnapshotRecord } from '../api/referenceOwnerReview';
import { REQUIRED_REFERENCE_STANDARD_FAMILIES } from '@manaratak/domain';
import { adminApiClient } from '../api/client';
const base = '/admin/reference-data';
export function ReferenceOwnerReviewWorkspace({ receiptId }: { receiptId?: string }) {
  const [receipt, setReceipt] = useState(''); const [plan, setPlan] = useState<ReferenceOwnerReview | null>(null);
  const [page, setPage] = useState(1); const [snapshotPage, setSnapshotPage] = useState(1); const [revision, setRevision] = useState(0);
  const [plans, setPlans] = useState<{ data: ReferenceOwnerReview[]; total: number } | null>(null);
  const [snapshots, setSnapshots] = useState<{ data: ReferenceSnapshotRecord[]; total: number } | null>(null);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [source, setSource] = useState({ standardFamily: 'ISO_3166', sourceAuthority: '', sourceVersion: '', sourceUrl: '', sourceArtifactId: '', sourceArtifactHash: '', retrievedAt: '', supersedesSnapshotId: '' });
  useEffect(() => { if (receiptId) { setReceipt(receiptId); setExpanded(true); } }, [receiptId]);
  useEffect(() => {
    if (!expanded) return; const abort = new AbortController(); setError('');
    Promise.all([adminApiClient.request<{data: ReferenceOwnerReview[]; total: number}>(`${base}/owner-imports?page=${page}`, { signal: abort.signal, cache: 'no-store' }),
      adminApiClient.request<{data: ReferenceSnapshotRecord[]; total: number}>(`${base}/standards/snapshots?page=${snapshotPage}`, { signal: abort.signal, cache: 'no-store' })])
      .then(([reviews, standards]) => { if (!abort.signal.aborted) { setPlans(reviews); setSnapshots(standards); } })
      .catch(cause => { if (!abort.signal.aborted) { setPlans(null); setSnapshots(null); setError(cause instanceof Error ? cause.message : 'تعذرت القراءة'); } });
    return () => abort.abort();
  }, [expanded, page, snapshotPage, revision]);
  async function run(path: string, body: unknown, selectPlan = false) {
    setBusy(true); setError('');
    try { const result = await adminApiClient.request<ReferenceOwnerReview>(`${base}${path}`, { method: 'POST', body: JSON.stringify(body) });
      if (selectPlan) { if (path.endsWith('/apply')) setPlan(value => value ? { ...value, status: 'APPLIED', version: value.version + 1, result } : null); else setPlan(result); } setRevision(value => value + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'تعذر تنفيذ القرار'); } finally { setBusy(false); }
  }
  const controls = (current: number, total: number, update: (value: number) => void) => <div className="flex gap-3"><button type="button" disabled={busy || current <= 1} onClick={() => update(current - 1)}>السابق</button><span>{current} / {Math.max(1,Math.ceil(total/25))}</span><button type="button" disabled={busy || current*25 >= total || current >= 1000} onClick={() => update(current + 1)}>التالي</button></div>;
  return <section dir="rtl" className="border rounded-2xl p-4 bg-white space-y-3">
    <button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)} className="font-bold">موافقات المالك ومصادر المعايير</button>
    {expanded && <>
      <p className="text-xs">الفحص ليس موافقة. المعاينة ترتبط بالحمولة والمصدر وإصدارات المراجع؛ التطبيق يحتاج قرارًا محفوظًا وسببًا. السجلات القديمة بلا حمولة محفوظة تحتاج فحصًا جديدًا من P6.</p>
      {error && <p role="alert" className="text-red-700">{error}</p>}{busy && <p role="status">جارٍ حفظ القرار…</p>}
      <Link to="/imports/reference-data" className="underline">رفع ملف البيانات المرجعية للفحص</Link>
      <label className="block">إيصال فحص P6<input className="border p-2 block w-full" value={receipt} maxLength={128} onChange={event => setReceipt(event.target.value)} /></label>
      <button type="button" disabled={busy || !receipt.trim()} onClick={() => run('/owner-imports/preview',{receiptId: receipt.trim()},true)}>إنشاء معاينة المالك</button>
      <ul>{plans?.data.map(item => <li key={item.id}><button type="button" disabled={busy} className="underline" onClick={() => { setPlan(item); setReason(''); }}>{item.entityType} · {item.status} · v{item.version}</button></li>)}</ul>
      {plans && controls(page,plans.total,setPage)}
      {plan && <div className="border rounded p-3 space-y-2"><h3>{plan.entityType} · {plan.status} · v{plan.version}</h3>
        <pre dir="ltr" className="max-h-56 overflow-auto whitespace-pre-wrap">{JSON.stringify(plan.payload,null,2)}</pre>
        <ul>{plan.preview.issues.map(issue => <li key={issue}>{issue}</li>)}</ul>
        <p>المراجع: {plan.reviewer ?? '—'} · السبب: {plan.reason ?? '—'}</p>
        {plan.status !== 'APPLIED' && <button type="button" disabled={busy} onClick={() => run(`/owner-imports/${encodeURIComponent(plan.id)}/refresh`,{expectedVersion:plan.version},true)}>تحديث المعاينة وإلغاء الموافقة السابقة</button>}
        {plan.status === 'PREVIEWED' && <><label className="block">سبب القرار وحل ملاحظات المصدر<textarea className="border p-2 w-full" value={reason} minLength={3} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>
          {(['APPROVE','REJECT'] as const).map(decision => <button type="button" key={decision} disabled={busy || reason.trim().length < 3 || decision === 'APPROVE' && plan.preview.issues.some(issue => !issue.startsWith('SOURCE_REVIEW:'))} onClick={() => run(`/owner-imports/${encodeURIComponent(plan.id)}/review`,{expectedVersion:plan.version,previewHash:plan.previewHash,decision,reason},true)}>{decision === 'APPROVE' ? 'اعتماد المعاينة' : 'رفض'}</button>)}</>}
        {plan.status === 'APPROVED' && <button type="button" disabled={busy} onClick={() => run(`/owner-imports/${encodeURIComponent(plan.id)}/apply`,{expectedVersion:plan.version,previewHash:plan.previewHash},true)}>تطبيق المحتوى المعتمد</button>}
      </div>}
      <h3 className="font-bold">سجل نسخ المعايير</h3>
      <p className="text-xs">يجب إرفاق نسخة مصدر حقيقية محفوظة ومفحوصة، ثم مراجعتها يدويًا. حفظ البيانات الوصفية لا يثبت تغطية الكتالوج أو عضوية كل رمز.</p>
      <form className="grid gap-2" onSubmit={event => { event.preventDefault(); let retrievedAt: string; try { retrievedAt = new Date(source.retrievedAt).toISOString(); } catch { setError('تاريخ الاسترجاع غير صالح'); return; } run('/standards/snapshots',{...source,retrievedAt,supersedesSnapshotId:source.supersedesSnapshotId || null}); }}>
        <label>المعيار<select className="border p-2" value={source.standardFamily} onChange={event => setSource(value => ({...value,standardFamily:event.target.value}))}>{REQUIRED_REFERENCE_STANDARD_FAMILIES.map(family => <option key={family}>{family}</option>)}</select></label>
        {([['sourceAuthority','الجهة الرسمية'],['sourceVersion','الإصدار'],['sourceUrl','رابط المصدر https'],['sourceArtifactId','ملف المصدر المحفوظ'],['sourceArtifactHash','SHA-256'],['retrievedAt','تاريخ الاسترجاع'],['supersedesSnapshotId','معرّف النسخة السابقة، إن وجدت']] as const).map(([key,label]) => <label key={key}>{label}<input className="border p-2 block w-full" required={key !== 'supersedesSnapshotId'} maxLength={key === 'sourceUrl' ? 2000 : 300} type={key === 'retrievedAt' ? 'datetime-local' : 'text'} value={source[key]} onChange={event => setSource(value => ({...value,[key]:event.target.value}))} /></label>)}
        <button type="submit" disabled={busy}>حفظ نسخة للمراجعة</button>
      </form>
      <label>سبب مراجعة النسخة<textarea className="border p-2 block w-full" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>
      <ul className="space-y-2">{snapshots?.data.map(item => <li key={item.snapshotId} className="border rounded p-2">{item.standardFamily} · {item.sourceVersion} · {item.status}<p>{item.sourceAuthority} · {item.reviewedBy ?? 'غير مراجع'}</p><a href={item.sourceUrl} target="_blank" rel="noreferrer">المصدر</a><p dir="ltr" className="break-all">{item.snapshotId} · {item.sourceArtifactHash}</p>
        {item.status === 'DRAFT' && (['APPROVE','REJECT'] as const).map(decision => <button type="button" key={decision} disabled={busy || reason.trim().length < 3} onClick={() => run(`/standards/snapshots/${encodeURIComponent(item.snapshotId)}/review`,{expectedVersion:item.version,decision,reason})}>{decision === 'APPROVE' ? 'اعتماد نسخة المصدر' : 'رفض النسخة'}</button>)}</li>)}</ul>
      {snapshots && controls(snapshotPage,snapshots.total,setSnapshotPage)}
    </>}
  </section>;
}
