import { useEffect, useRef, useState } from 'react';
import { ClipboardCheck, Send, RefreshCw, Pause, Play, Download, XCircle, History } from 'lucide-react';
import type { CourseBulkPage, CourseBulkState, CourseBulkSummary } from '@manaratak/domain';
import { reviewReasonHeaders } from '@manaratak/shared';
import { adminApiClient } from '../../api/client';
import { useOwnerOperationScope } from '../../security/useOwnerOperationScope';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CourseDialog } from './CourseDialog';
import { useCourseCopy } from './useCourseCopy';
import { externalIssue } from './externalCourseFields';

export type BulkSelection = { mode: 'IDS'; ids: string[] } | { mode: 'FILTER'; filters: Record<string, string> };
const labels: Record<CourseBulkState, [string, string]> = { PENDING: ['لم تُفحص', 'Pending'], ELIGIBLE: ['مؤهلة', 'Eligible'], BLOCKED: ['محجوبة', 'Blocked'], SUCCESS: ['نُشرت', 'Published'], FAILED: ['فشلت', 'Failed'], NOT_EXECUTED: ['لم تُنفذ', 'Not executed'] };
export function CourseBulkPublicationPanel({ id, selection, onBatch, onClose, onChanged }: {
  id?: string; selection?: BulkSelection; onBatch: (id: string) => void; onClose: () => void; onChanged: () => void;
}) {
  const { tr, ar, number, date } = useCourseCopy();
  const {hasPermission}=useAdminAuthorization();
  const scope=useOwnerOperationScope(`${id??'new'}:${JSON.stringify(selection)}:${hasPermission('admin:courses:manage')}`);
  const mutation=useRef(false);
  const [result, setResult] = useState<CourseBulkPage>();
  const [history, setHistory] = useState<{ data: CourseBulkSummary[]; page: number; totalPages: number }>();
  const [reason, setReason] = useState('');
  const [eligibleOnly, setEligibleOnly] = useState(false);
  const [busy, setBusy] = useState(false), [auto, setAuto] = useState(false);
  const [error, setError] = useState('');
  const [state, setState] = useState<CourseBulkState | ''>('');
  const [reload, setReload] = useState(0), [historyPage, setHistoryPage] = useState(1);
  const requestKey = useRef(crypto.randomUUID());
  useEffect(()=>{mutation.current=false;setBusy(false);setAuto(false);setReason('');requestKey.current=crypto.randomUUID();},[scope]);
  const changeCallback = useRef(onChanged); changeCallback.current = onChanged;
  useEffect(() => {
    const controller = new AbortController(); setError(''); setAuto(false); setResult(undefined); setEligibleOnly(false);
    if (!id) return () => controller.abort();
    adminApiClient.request<CourseBulkPage>(`/admin/courses/imported/bulk/${encodeURIComponent(id)}`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setResult(value); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [id, reload,scope]);
  useEffect(() => {
    if (id || selection) return;
    const controller = new AbortController();
    adminApiClient.request<{ data: CourseBulkSummary[]; page: number; totalPages: number }>(`/admin/courses/imported/bulk?page=${historyPage}`, { signal: controller.signal }).then(value => { if (!controller.signal.aborted) setHistory(value); }).catch(error => { if (!controller.signal.aborted) setError(error.message); });
    return () => controller.abort();
  }, [id, selection, historyPage, reload]);
  const running = result && ['PREVIEWING', 'EXECUTING'].includes(result.summary.phase);
  useEffect(() => { if (result && !running) setAuto(false); }, [result, running]);
  useEffect(() => {
    if (!auto || !id || !running || busy) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      if(mutation.current||!scope.isCurrent())return;mutation.current=true;
      setBusy(true);
      try {
        const next = await adminApiClient.request<CourseBulkPage>(`/admin/courses/imported/bulk/${encodeURIComponent(id)}/step`, { method: 'POST', body: '{}', signal: controller.signal });
        if (scope.isCurrent()) { setResult(next); setState(''); if (next.summary.phase === 'COMPLETE') changeCallback.current(); }
      } catch (error) { if (scope.isCurrent()) { setError(error instanceof Error ? error.message : 'COURSE_BULK_SERVICE_UNAVAILABLE'); setAuto(false); } }
      finally { if (scope.isCurrent()){mutation.current=false;setBusy(false);} }
    }, 250);
    // A submitted server step completes under its lease even if this view closes.
    return () => { clearTimeout(timer); };
  }, [auto, id, running, busy, result,scope]);
  const command = async (action: 'preview' | 'confirm' | 'cancel' | 'retry') => {
    if (busy || mutation.current || !scope.isCurrent() || !hasPermission('admin:courses:manage') || reason.trim().length < 3) return;
    if (action === 'confirm' && !window.confirm(tr('نشر الدورات المؤهلة في المعاينة فقط؟ سيعيد الخادم فحص نسخها وشروطها.', 'Publish only eligible courses from this preview? The server rechecks their versions and policies.'))) return;
    mutation.current=true;setBusy(true); setAuto(false); setError('');
    try {
      const path = action === 'preview' ? '/preview' : `/${encodeURIComponent(id!)}/${action}`;
      const body = action === 'preview' ? selection : action === 'confirm' ? { digest: result!.summary.digest, eligibleOnly } : {};
      const next = await adminApiClient.request<CourseBulkPage>('/admin/courses/imported/bulk' + path, { method: 'POST', headers: { ...reviewReasonHeaders(reason.trim()), 'Idempotency-Key': requestKey.current }, body: JSON.stringify(body) });
      if (!scope.isCurrent()) return;
      setResult(next); setState(''); setEligibleOnly(false);
      if (next.summary.id !== id) { onBatch(next.summary.id); requestKey.current = crypto.randomUUID(); }
    } catch (error) { if(scope.isCurrent())setError(error instanceof Error ? error.message : 'COURSE_BULK_SERVICE_UNAVAILABLE'); }
    finally { if(scope.isCurrent()){mutation.current=false;setBusy(false);} }
  };
  const page = async (next: number, filter = state) => {
    if (!id || busy || mutation.current || !scope.isCurrent()) return; mutation.current=true;setBusy(true); setAuto(false); setError('');
    try { const result=await adminApiClient.request<CourseBulkPage>(`/admin/courses/imported/bulk/${encodeURIComponent(id)}?page=${next}${filter ? '&state=' + filter : ''}`);if(scope.isCurrent()){if(result.summary.id!==id)throw Error('COURSE_BULK_OWNER_MISMATCH');setResult(result);setState(filter);} }
    catch (error) { if(scope.isCurrent())setError(error instanceof Error ? error.message : 'COURSE_BULK_SERVICE_UNAVAILABLE'); }
    finally { if(scope.isCurrent()){mutation.current=false;setBusy(false);} }
  };
  const csv = () => {
    if (!result) return;
    const cell = (value: string) => '"' + (/^[\s]*[=+@-]/.test(value) ? "'" + value : value).replaceAll('"', '""') + '"';
    const rows = [['id', 'course', 'version', 'state', 'reasons'], ...result.data.map(item => [item.id, item.name, String(item.version), item.state, item.reasons.join(' | ')])];
    const url = URL.createObjectURL(new Blob(['\uFEFF' + rows.map(row => row.map(cell).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `course-publication-${result.summary.id}-page-${result.page}.csv`; anchor.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const summary = result?.summary;
  const done = summary ? summary.total - summary.counts.PENDING - (summary.phase === 'EXECUTING' ? summary.counts.ELIGIBLE : 0) : 0;
  return <CourseDialog title={tr('مراجعة النشر الجماعي للدورات الخارجية', 'External course publication batches')} onClose={onClose}>
    {error && <p role="alert" className="course-error" title={error}>{externalIssue(error, tr)}<button type="button" disabled={busy} onClick={() => setReload(value => value + 1)}><RefreshCw size={16}/>{tr('إعادة القراءة', 'Reload')}</button></p>}
    {!id && !selection ? <section className="course-panel"><h3><History size={18}/>{tr('دفعاتي المحفوظة', 'My saved batches')}</h3>{history ? <><div className="course-batch-history">{history.data.map(batch => <button type="button" key={batch.id} onClick={() => onBatch(batch.id)}><strong>{number(batch.total)} {tr('دورة', 'courses')}</strong><span>{date(batch.createdAt)}</span><small>{batch.reason}</small></button>)}</div>{!history.data.length && <p>{tr('لا توجد دفعات محفوظة لحسابك.', 'No saved batches for your account.')}</p>}<div className="course-pagination"><button disabled={history.page <= 1} onClick={() => setHistoryPage(value => value - 1)}>{tr('السابق', 'Previous')}</button><span>{number(history.page)} / {number(history.totalPages)}</span><button disabled={history.page >= history.totalPages} onClick={() => setHistoryPage(value => value + 1)}>{tr('التالي', 'Next')}</button></div></> : <p role="status">{tr('جارٍ قراءة الدفعات…', 'Loading saved batches…')}</p>}</section> : <>
      <p className="course-hint">{tr('يُثبَّت الاختيار ونسخ السجلات عند إنشاء المعاينة. لا تدخل نتائج جديدة في الدفعة ولا تُنشر دورة عند الحفظ أو الفحص.', 'Selection and versions are frozen when preview starts. New matches never join this batch. Saving or checking never publishes a course.')}</p>
      <label className="course-field course-reason-field"><span>{tr('مبرر العملية', 'Batch reason')}</span><textarea aria-label={tr('مبرر العملية', 'Batch reason')} minLength={3} maxLength={2000} value={reason} disabled={busy || auto} onChange={event => setReason(event.target.value)}/></label>
      {!id && <button type="button" className="course-primary" disabled={busy || reason.trim().length < 3} onClick={() => void command('preview')}><ClipboardCheck size={18}/>{tr('تثبيت الاختيار وإنشاء معاينة', 'Freeze selection and create preview')}</button>}
      {id && !result && !error && <p role="status">{tr('جارٍ قراءة الدفعة…', 'Loading batch…')}</p>}
      {summary && <>
        <div className="course-bulk-counts">{(Object.keys(labels) as CourseBulkState[]).map(key => <button type="button" disabled={busy || auto} aria-pressed={state === key} key={key} onClick={() => void page(1, state === key ? '' : key)}><strong>{number(summary.counts[key])}</strong><span>{labels[key][ar ? 0 : 1]}</span></button>)}</div>
        <p className="course-hint">{tr('إجمالي الاختيار الثابت', 'Frozen selection total')}: {number(summary.total)} · {tr('وقت المعاينة', 'Snapshot time')}: {date(summary.createdAt)}</p>
        {running && <div className="course-bulk-progress"><progress max={summary.total} value={done} aria-label={tr('تقدم الدفعة', 'Batch progress')}/><span role="status">{summary.phase === 'PREVIEWING' ? tr('فحص الجاهزية', 'Readiness preview') : tr('تنفيذ النشر', 'Publication execution')}: {number(done)} / {number(summary.total)}</span></div>}
        {summary.phase === 'PREVIEWED' && <><p role="status">{tr('اكتملت المعاينة. راجع المحجوب والفاشل قبل تأكيد النشر.', 'Preview complete. Review blocked and failed records before confirming publication.')}</p>{(summary.counts.BLOCKED + summary.counts.FAILED > 0) && <label className="course-bulk-consent"><input type="checkbox" disabled={busy} checked={eligibleOnly} onChange={event => setEligibleOnly(event.target.checked)}/>{tr('أوافق على نشر المؤهل فقط وترك بقية النتائج دون نشر.', 'Publish eligible records only; leave the other results unpublished.')}</label>}</>}
        <div className="course-drawer-toolbar">
          {running && <button type="button" className="course-primary" disabled={busy} onClick={() => { setError(''); setAuto(!auto); }}>{auto ? <Pause size={17}/> : <Play size={17}/>} {auto ? tr('إيقاف بعد الخطوة الحالية', 'Pause after current step') : tr('متابعة الدفعة', 'Continue batch')}</button>}
          {summary.phase === 'PREVIEWED' && <button type="button" className="course-primary" disabled={busy || !summary.counts.ELIGIBLE || reason.trim().length < 3 || ((summary.counts.BLOCKED + summary.counts.FAILED > 0) && !eligibleOnly)} onClick={() => void command('confirm')}><Send size={17}/>{tr('تأكيد نشر المؤهل', 'Confirm eligible publication')}</button>}
          {['PREVIEWED', 'COMPLETE', 'CANCELLED'].includes(summary.phase) && summary.counts.FAILED > 0 && <button type="button" disabled={busy || reason.trim().length < 3} onClick={() => void command('retry')}><RefreshCw size={17}/>{tr('معاينة جديدة للفاشل فقط', 'Re-preview failed records only')}</button>}
          {!['COMPLETE', 'CANCELLED'].includes(summary.phase) && <button type="button" disabled={busy || auto || reason.trim().length < 3} onClick={() => void command('cancel')}><XCircle size={17}/>{tr('إلغاء ما لم يُنفذ', 'Cancel remaining work')}</button>}
          <button type="button" disabled={busy || auto} onClick={csv}><Download size={17}/>{tr('CSV للصفحة المعروضة', 'Export current page CSV')}</button>
        </div>
        {['COMPLETE', 'CANCELLED'].includes(summary.phase) && <p className="course-hint" role="status">{summary.phase === 'CANCELLED' ? tr('أُلغيت الخطوات المتبقية. النتائج السابقة محفوظة.', 'Remaining work cancelled. Earlier outcomes are preserved.') : tr('انتهى التنفيذ. يعرض التقرير نتيجة كل دورة؛ لا يعني انتهاؤه نجاح الجميع.', 'Execution finished. The report records each outcome; completion does not mean every course succeeded.')}</p>}
        <div className="course-table-scroll"><table className="course-table course-bulk-table"><thead><tr><th>{tr('الدورة', 'Course')}</th><th>{tr('النسخة', 'Version')}</th><th>{tr('النتيجة', 'Outcome')}</th><th>{tr('الأسباب', 'Reasons')}</th></tr></thead><tbody>{result!.data.map(item => <tr key={item.id}><td dir="auto"><strong>{item.name}</strong></td><td>{number(item.version)}</td><td>{labels[item.state][ar ? 0 : 1]}</td><td>{item.reasons.map(reason => <p key={reason} title={reason}>{reason === 'COURSE_STALE_VERSION' ? tr('تغيرت نسخة الدورة؛ تحتاج إلى معاينة جديدة قبل النشر.', 'The course version changed; create a new preview before publishing.') : externalIssue(reason, tr)}</p>)}</td></tr>)}</tbody></table></div>
        {!result!.data.length && <p>{tr('لا توجد نتائج بهذه الحالة.', 'No results in this state.')}</p>}
        <div className="course-pagination"><button type="button" disabled={busy || auto || result!.page <= 1} onClick={() => void page(result!.page - 1)}>{tr('السابق', 'Previous')}</button><span>{number(result!.page)} / {number(result!.totalPages)}</span><button type="button" disabled={busy || auto || result!.page >= result!.totalPages} onClick={() => void page(result!.page + 1)}>{tr('التالي', 'Next')}</button></div>
      </>}
    </>}
  </CourseDialog>;
}
