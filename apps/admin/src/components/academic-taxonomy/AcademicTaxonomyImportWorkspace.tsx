import { useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApiClient } from '../../api/client';
import { TaxonomyPagination, useTaxonomyRead } from './AcademicTaxonomyOperationsWorkspace';
const base = '/admin/academic-taxonomy/imports';
type Plan = { id: string; status: string; version: number; previewHash: string; reviewedBy?: string; reason?: string; record: unknown; preview: { issues: Array<{ code: string; severity: string; message: string }> } };
export function AcademicTaxonomyImportWorkspace({ isAr }: { isAr: boolean }) {
  const [page, setPage] = useState(1); const [screenPage, setScreenPage] = useState(1); const [status, setStatus] = useState(''); const [plan, setPlan] = useState<Plan | null>(null);
  const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false); const [error, setError] = useState<string | null>(null);
  const plans = useTaxonomyRead<{ data: Plan[]; total: number }>(`${base}?page=${page}${status ? `&status=${status}` : ''}`);
  const screenings = useTaxonomyRead<{ data: Array<{ id: string; createdAt: string; result: { state: string; dryRun: boolean; record?: unknown } }>; total: number }>(`${base}/screenings?page=${screenPage}`);
  const run = async (url: string, body: unknown, selectResult = true) => {
    setBusy(true); setError(null); try { const result = await adminApiClient.request<Plan>(url, { method: 'POST', body: JSON.stringify(body) });
      if (selectResult) setPlan(result); else { setPlan(null); }
      plans.reload(); screenings.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'REQUEST_FAILED'); } finally { setBusy(false); }
  };
  return <section className="rounded-2xl border bg-white p-5 space-y-4 text-sm">
    <h2 className="font-bold">{isAr ? 'استيراد التصنيف: فحص ← معاينة ← مراجعة ← تطبيق' : 'Taxonomy import: screening → preview → review → apply'}</h2>
    <p>{isAr ? 'لا يكتب P6 في التصنيف. السجلات الجديدة تُطبّق كمسودات، والنشر مستقل. السجل المطبق يُحفظ لمنع تكرار الكتابة.' : 'P6 cannot write taxonomy. New nodes are applied as drafts; publication is separate. Applied receipts prevent duplicate writes.'}</p>
    <Link to="/imports/academic-taxonomy" className="inline-block underline">{isAr ? 'رفع ملف التصنيف للفحص' : 'Upload a taxonomy file for screening'}</Link>
    {(error || plans.error || screenings.error) && <p role="alert" className="text-red-700">{error || plans.error || screenings.error}</p>}
    {(plans.loading || screenings.loading || busy) && <p role="status">{isAr ? 'جار التحميل…' : 'Loading…'}</p>}
    <h3>{isAr ? 'نتائج فحص P6 التي لم تُراجع' : 'Unreviewed P6 screenings'}</h3>
    <ul className="space-y-2">{screenings.data?.data.map(screen => <li key={screen.id} className="border rounded p-3"><span>{screen.id} · {screen.result.state}</span>
      <button type="button" className="ms-3 underline" disabled={busy || screen.result.state !== 'NEEDS_OWNER_REVIEW' || screen.result.dryRun} onClick={() => { setReason(''); run(`${base}/preview`, { receiptId: screen.id }); }}>{isAr ? 'إنشاء معاينة' : 'Create preview'}</button>
      {screen.result.dryRun && <span> · {isAr ? 'محاكاة؛ غير قابل للتطبيق' : 'Dry run; cannot apply'}</span>}</li>)}</ul>
    {screenings.data?.total === 0 && <p>{isAr ? 'لا توجد نتائج فحص جديدة.' : 'No new screenings.'}</p>}
    {screenings.data && <TaxonomyPagination page={screenPage} total={screenings.data.total} loading={screenings.loading || busy} onPage={setScreenPage} isAr={isAr} />}
    <h3>{isAr ? 'سجل مراجعات المالك' : 'Owner review history'}</h3>
    <label>{isAr ? 'الحالة' : 'Status'} <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="">{isAr ? 'الكل' : 'All'}</option>{['PREVIEWED','APPROVED','REJECTED','APPLIED'].map(value => <option key={value}>{value}</option>)}</select></label>
    <ul>{plans.data?.data.map(item => <li key={item.id}><button type="button" className="underline" disabled={busy} onClick={() => { setPlan(item); setReason(''); setError(null); }}>{item.id} · {item.status} · {isAr ? 'نسخة' : 'Version'} {item.version}</button></li>)}</ul>
    {plans.data && <TaxonomyPagination page={page} total={plans.data.total} loading={plans.loading || busy} onPage={setPage} isAr={isAr} />}
    {plan && <div className="border rounded p-4 space-y-3"><h3 className="font-bold">{plan.id} · {plan.status} · v{plan.version}</h3>
      <pre dir="ltr" className="overflow-auto max-h-60 whitespace-pre-wrap">{JSON.stringify(plan.record, null, 2)}</pre>
      <ul>{plan.preview.issues.map((issue, index) => <li key={index}>{issue.severity} · {issue.code}: {issue.message}</li>)}</ul>
      <p>{isAr ? 'المراجع والسبب' : 'Reviewer and reason'}: {plan.reviewedBy ?? '—'} · {plan.reason ?? '—'}</p>
      {plan.status !== 'APPLIED' && <button type="button" disabled={busy} onClick={() => run(`${base}/${encodeURIComponent(plan.id)}/refresh`, { expectedVersion: plan.version })}>{isAr ? 'إعادة المعاينة وإلغاء الموافقة السابقة' : 'Refresh preview and reset prior approval'}</button>}
      {plan.status === 'PREVIEWED' && <><label className="block">{isAr ? 'سبب المراجعة' : 'Review reason'}<textarea className="block w-full border p-2" value={reason} maxLength={1000} onChange={event => setReason(event.target.value)} /></label>
        <div className="flex gap-3"><button type="button" disabled={busy || !reason.trim() || plan.preview.issues.some(issue => issue.severity === 'ERROR')} onClick={() => run(`${base}/${encodeURIComponent(plan.id)}/review`, { expectedVersion: plan.version, previewHash: plan.previewHash, decision: 'APPROVE', reason })}>{isAr ? 'اعتماد المعاينة' : 'Approve preview'}</button>
          <button type="button" disabled={busy || !reason.trim()} onClick={() => run(`${base}/${encodeURIComponent(plan.id)}/review`, { expectedVersion: plan.version, previewHash: plan.previewHash, decision: 'REJECT', reason })}>{isAr ? 'رفض' : 'Reject'}</button></div></>}
      {plan.status === 'APPROVED' && <button type="button" disabled={busy} onClick={() => run(`${base}/${encodeURIComponent(plan.id)}/apply`, { expectedVersion: plan.version, previewHash: plan.previewHash }, false)}>{isAr ? 'تطبيق المحتوى الذي تمت مراجعته' : 'Apply the reviewed content'}</button>}
    </div>}
  </section>;
}
