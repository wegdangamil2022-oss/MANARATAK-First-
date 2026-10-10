import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import type { TaxonomyCrosswalkReport, TaxonomyDiagnosticsReport } from '@manaratak/domain';
import { adminApiClient } from '../../api/client';
const base = '/admin/academic-taxonomy';
type Node = { nodeId: string; canonicalName: string; canonicalCode: string; nodeType: string; status: string; updatedAt: string };
type Page<T> = { data: T[]; total: number; page?: number; pageSize?: number; links?: Array<{ nodeId: string; isPrimary: boolean }> };
export function useTaxonomyRead<T>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null); const [error, setError] = useState<string | null>(null); const [loading, setLoading] = useState(false); const [epoch, setEpoch] = useState(0);
  useEffect(() => {
    setData(null); setError(null);
    if (!endpoint) { setLoading(false); return; }
    const abort = new AbortController(); setLoading(true);
    adminApiClient.request<T>(endpoint, { signal: abort.signal, cache: 'no-store' })
      .then(result => { if (!abort.signal.aborted) setData(result); })
      .catch(cause => { if (!abort.signal.aborted) setError(cause instanceof Error ? cause.message : 'REQUEST_FAILED'); })
      .finally(() => { if (!abort.signal.aborted) setLoading(false); });
    return () => abort.abort();
  }, [endpoint, epoch]);
  return { data, error, loading, reload: () => setEpoch(value => value + 1) };
}
export function TaxonomyPagination({ page, total, size = 25, loading, onPage, isAr }: { page: number; total: number; size?: number; loading: boolean; onPage: (page: number) => void; isAr: boolean }) {
  return <div className="flex gap-3 items-center text-xs py-3"><button type="button" disabled={loading || page <= 1} onClick={() => onPage(page - 1)}>{isAr ? 'السابق' : 'Previous'}</button>
    <span>{isAr ? 'الصفحة' : 'Page'} {page} · {total}</span><button type="button" disabled={loading || page * size >= total || page >= 1000} onClick={() => onPage(page + 1)}>{isAr ? 'التالي' : 'Next'}</button></div>;
}
export function TaxonomyNodeLink({ id, label, tab }: { id: string; label?: string; tab?: 'hierarchy' | 'aliases' | 'mappings' }) { return <Link className="underline text-teal-800 break-all" to={`/academic-taxonomy/${encodeURIComponent(id)}${tab ? `?tab=${tab}` : ''}`}>{label ?? id}</Link>; }
function ReadState({ loading, error, isAr }: { loading: boolean; error: string | null; isAr: boolean }) {
  return <>{loading && <p role="status">{isAr ? 'جار التحميل…' : 'Loading…'}</p>}{error && <p role="alert" className="text-red-700">{isAr ? 'تعذّر تحميل البيانات: ' : 'Unable to load: '}{error}</p>}</>;
}
function GraphBrowser({ isAr }: { isAr: boolean }) {
  const [focus, setFocus] = useState<Node | null>(null); const [page, setPage] = useState(1); const [parentPage, setParentPage] = useState(1);
  const nodes = useTaxonomyRead<Page<Node>>(focus ? `${base}/nodes/${encodeURIComponent(focus.nodeId)}/children?page=${page}&pageSize=25` : `${base}/nodes?rootOnly=true&page=${page}&pageSize=25`);
  const parents = useTaxonomyRead<Page<Node>>(focus ? `${base}/nodes/${encodeURIComponent(focus.nodeId)}/parents?page=${parentPage}&pageSize=25` : null);
  const paths = useTaxonomyRead<{ path: Node[]; termination: string; alternativeTotal: number }>(focus ? `${base}/nodes/${encodeURIComponent(focus.nodeId)}/paths` : null);
  const open = (node: Node | null) => { setFocus(node); setPage(1); setParentPage(1); };
  return <div className="space-y-3">
    <p>{isAr ? 'استكشف الجذور المعتمدة ثم الأبناء؛ الآباء البديلون لا يغيّرون المسار الرئيسي.' : 'Explore approved roots and children; alternate parents remain distinct from the primary path.'}</p>
    <button type="button" onClick={() => open(null)} className="underline">{isAr ? 'الجذور المعتمدة' : 'Approved roots'}</button>
    {focus && <><h3 className="font-bold"><TaxonomyNodeLink id={focus.nodeId} label={focus.canonicalName} /></h3>
      <ReadState {...paths} isAr={isAr} />
      {paths.data && <nav aria-label={isAr ? 'المسار الرئيسي' : 'Primary path'} className="flex flex-wrap gap-2">{paths.data.path.map((node, index) => <span key={node.nodeId}>{index > 0 && ' / '}<button type="button" className="underline" onClick={() => open(node)}>{node.canonicalName}</button></span>)}
        {paths.data.termination === 'DEPTH_LIMIT' && <span role="status">{isAr ? 'المسار يتجاوز 32 مستوى؛ تابع من العقدة المعروضة.' : 'Path exceeds 32 levels; continue from the displayed node.'}</span>}</nav>}
      <h4>{isAr ? 'الآباء والمسارات البديلة' : 'Parents and alternative paths'}</h4><ReadState {...parents} isAr={isAr} />
      <ul>{parents.data?.data.map(node => <li key={node.nodeId}><button type="button" className="underline" onClick={() => open(node)}>{node.canonicalName}</button> · {parents.data?.links?.find(link => link.nodeId === node.nodeId)?.isPrimary ? isAr ? 'رئيسي' : 'Primary' : isAr ? 'بديل' : 'Alternative'}</li>)}</ul>
      {parents.data && <TaxonomyPagination page={parentPage} total={parents.data.total} loading={parents.loading} onPage={setParentPage} isAr={isAr} />}
    </>}
    <ReadState {...nodes} isAr={isAr} />
    <ul className="border-s ps-4 space-y-2" aria-label={isAr ? 'عقد الشجرة' : 'Hierarchy nodes'}>{nodes.data?.data.map(node => <li key={node.nodeId} className="flex gap-3 flex-wrap">
      <span aria-hidden>└</span><button type="button" className="font-bold" onClick={() => open(node)}>{node.canonicalName} ({node.canonicalCode})</button>
      <span>{node.status}</span><TaxonomyNodeLink id={node.nodeId} label={isAr ? 'تحرير' : 'Edit'} />
    </li>)}</ul>
    {nodes.data?.data.length === 0 && <p>{isAr ? 'لا توجد عقد في هذا المستوى.' : 'No nodes at this level.'}</p>}
    {nodes.data && <TaxonomyPagination page={page} total={nodes.data.total} loading={nodes.loading} onPage={setPage} isAr={isAr} />}
  </div>;
}
const diagnosticLabels: Record<string, [string, string]> = {
  CYCLE: ['دورات', 'Cycles'], MULTIPLE_PRIMARY_PARENTS: ['آباء رئيسيون متعددون', 'Multiple primary parents'], ORPHAN: ['عقد يتيمة', 'Orphans'], EMPTY_ROOT: ['جذور بلا أبناء', 'Empty roots'],
  ISOLATED_LEAF: ['عقد معزولة', 'Isolated nodes'], EXCESSIVE_DEPTH: ['عمق زائد', 'Excessive depth'], UNREACHABLE_NATIONAL_MAPPING: ['خرائط وطنية بلا مسار', 'Unreachable national mappings'],
  INVALID_MAPPING: ['خرائط غير سليمة', 'Invalid mappings'], HISTORICAL_MAPPING: ['خرائط تاريخية', 'Historic mappings'], ALIAS_CONFLICT: ['تعارض أسماء', 'Alias conflicts'], DUPLICATE_ALIAS: ['أسماء مكررة', 'Duplicate aliases'],
  ALIAS_NORMALIZATION_DRIFT: ['أسماء تحتاج توحيدًا', 'Normalization drift'], INVALID_EDGE: ['علاقات غير سليمة', 'Invalid edges'],
};
function Diagnostics({ isAr }: { isAr: boolean }) {
  const [standard, setStandard] = useState(''); const [code, setCode] = useState(''); const [page, setPage] = useState(1);
  const params = new URLSearchParams({ page: String(page) }); if (standard) params.set('standardType', standard); if (code) params.set('code', code);
  const report = useTaxonomyRead<TaxonomyDiagnosticsReport>(`${base}/diagnostics?${params}`);
  return <div className="space-y-3"><p>{isAr ? 'تقرير قراءة فقط؛ لا يُصلح الرسم أو يغيّر الأسماء تلقائيًا. الحقل الأكاديمي أو الجذر المعتمد صراحةً لا يُصنّف يتيمًا.' : 'Read-only diagnostics; no automatic graph or alias changes. Academic fields and explicitly approved roots are not orphans.'}</p>
    <label>{isAr ? 'نطاق المعيار' : 'Standard scope'} <select value={standard} onChange={event => { setStandard(event.target.value); setPage(1); }}><option value="">{isAr ? 'جميع المعايير' : 'All standards'}</option>{['ISCED','CIP','CUSTOM_NATIONAL'].map(value => <option key={value}>{value}</option>)}</select></label>
    <label>{isAr ? 'نوع المشكلة' : 'Issue type'} <select value={code} onChange={event => { setCode(event.target.value); setPage(1); }}><option value="">{isAr ? 'الكل' : 'All'}</option>{Object.entries(diagnosticLabels).map(([key, label]) => <option key={key} value={key}>{label[isAr ? 0 : 1]}</option>)}</select></label>
    <ReadState {...report} isAr={isAr} />
    {report.data && <><p>{isAr ? 'نسخة التقرير' : 'Report version'}: {report.data.version.slice(0, 12)} · {report.data.asOf} · {report.data.nodeCount} {isAr ? 'عقدة' : 'nodes'}</p>
      {report.data.boundaryEdges > 0 && <p role="status">{isAr ? 'التقرير محدد بالنطاق؛ توجد علاقات خارجه، وفحص الدورات الكامل يحتاج نطاق جميع المعايير.' : 'This report is scoped; boundary edges exist. Use all standards for complete cycle coverage.'}</p>}
      <div className="flex gap-3 flex-wrap">{Object.entries(report.data.counts).map(([key, count]) => <button type="button" key={key} className="rounded border px-2 py-1" onClick={() => { setCode(key); setPage(1); }}>{diagnosticLabels[key]?.[isAr ? 0 : 1] ?? key}: {count}</button>)}</div>
      <ul className="space-y-3">{report.data.data.map((issue, index) => <li key={`${issue.code}:${index}`} className="rounded border p-3"><strong>{diagnosticLabels[issue.code]?.[isAr ? 0 : 1] ?? issue.code} · {issue.severity}</strong><p>{issue.message}</p>
        <div className="flex flex-wrap gap-3">{issue.nodeIds.map((id, index) => <TaxonomyNodeLink key={`${id}:${index}`} id={id} tab={issue.code.includes('ALIAS') ? 'aliases' : issue.code.includes('MAPPING') ? 'mappings' : 'hierarchy'} />)}</div></li>)}</ul>
      {report.data.total === 0 && <p>{isAr ? 'لا توجد نتائج لهذا الفلتر ضمن النسخة الحالية.' : 'No findings for this filter in the current snapshot.'}</p>}
      <TaxonomyPagination page={page} total={report.data.total} loading={report.loading} onPage={setPage} isAr={isAr} /></>}
  </div>;
}
const crosswalkLabels: Record<string, [string, string]> = { MAPPED: ['مرتبط', 'Mapped'], UNMAPPED: ['غير مرتبط', 'Unmapped'], AMBIGUOUS: ['غامض', 'Ambiguous'], CONFLICTING: ['متعارض', 'Conflicting'], UNRESOLVED: ['غير محسوم', 'Unresolved'] };
function Crosswalk({ isAr }: { isAr: boolean }) {
  const [source, setSource] = useState('CUSTOM_NATIONAL'); const [target, setTarget] = useState('ISCED'); const [type, setType] = useState(''); const [status, setStatus] = useState('ACTIVE');
  const [confidence, setConfidence] = useState('0.8'); const [state, setState] = useState(''); const [q, setQ] = useState(''); const [draftQ, setDraftQ] = useState(''); const [page, setPage] = useState(1);
  const params = new URLSearchParams({ sourceStandard: source, targetStandard: target, status, minConfidence: confidence, page: String(page) }); if (type) params.set('nodeType', type); if (state) params.set('mappingState', state); if (q) params.set('q', q);
  const report = useTaxonomyRead<TaxonomyCrosswalkReport>(source !== target ? `${base}/crosswalk?${params}` : null);
  return <div className="space-y-3"><p>{isAr ? 'التغطية مشتقة من اتجاه الروابط وقوتها والثقة وحالة الهدف؛ لا تُنشئ تكافؤًا ولا تنشر مطابقة تلقائيًا.' : 'Coverage derives from direction, strength, confidence and target status; it does not create equivalence or publish matches.'}</p>
    <div className="flex gap-3 flex-wrap">{[[isAr ? 'المصدر' : 'Source', source, setSource], [isAr ? 'الهدف' : 'Target', target, setTarget]].map(([label, value, setter], index) => <label key={index}>{label as string} <select value={value as string} onChange={event => { (setter as (value: string) => void)(event.target.value); setPage(1); }}>{['ISCED','CIP','CUSTOM_NATIONAL'].map(standard => <option key={standard}>{standard}</option>)}</select></label>)}
      <label>{isAr ? 'نوع العقدة' : 'Node type'} <select value={type} onChange={event => { setType(event.target.value); setPage(1); }}><option value="">{isAr ? 'الكل' : 'All'}</option>{['ACADEMIC_FIELD','DISCIPLINE','PROGRAM_AREA','SPECIALIZATION_CATEGORY','STANDARD_CLASSIFICATION'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>{isAr ? 'حالة المصدر' : 'Source status'} <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}>{['ACTIVE','DRAFT','READY_TO_REVIEW','ARCHIVED'].map(value => <option key={value}>{value}</option>)}</select></label>
      <label>{isAr ? 'الحد الأدنى للثقة' : 'Minimum confidence'} <input type="number" min="0" max="1" step="0.05" value={confidence} onChange={event => { setConfidence(event.target.value); setPage(1); }} /></label>
      <label>{isAr ? 'حالة الربط' : 'Mapping state'} <select value={state} onChange={event => { setState(event.target.value); setPage(1); }}><option value="">{isAr ? 'الكل' : 'All'}</option>{Object.entries(crosswalkLabels).map(([key, label]) => <option value={key} key={key}>{label[isAr ? 0 : 1]}</option>)}</select></label>
    </div>
    <form onSubmit={event => { event.preventDefault(); setQ(draftQ.trim()); setPage(1); }}><label>{isAr ? 'بحث' : 'Search'} <input value={draftQ} maxLength={200} onChange={event => setDraftQ(event.target.value)} /></label><button type="submit">{isAr ? 'بحث' : 'Search'}</button></form>
    {source === target && <p role="alert">{isAr ? 'اختر معيارين مختلفين.' : 'Select different standards.'}</p>}<ReadState {...report} isAr={isAr} />
    {report.data && <><div className="flex flex-wrap gap-3">{Object.entries(report.data.counts).map(([key, count]) => <button type="button" key={key} onClick={() => { setState(key); setPage(1); }}>{crosswalkLabels[key]?.[isAr ? 0 : 1] ?? key}: {count}</button>)}</div>
      <ul>{report.data.data.map(node => <li key={node.nodeId} className="border-b py-3"><TaxonomyNodeLink id={node.nodeId} label={`${node.canonicalName} (${node.canonicalCode})`} tab="mappings" /> · {crosswalkLabels[node.mappingState][isAr ? 0 : 1]} · {node.qualifiedTargets}/{node.candidates}</li>)}</ul>
      {report.data.total === 0 && <p>{isAr ? 'لا توجد نتائج.' : 'No results.'}</p>}<TaxonomyPagination page={page} total={report.data.total} loading={report.loading} onPage={setPage} isAr={isAr} /></>}
  </div>;
}
function ReviewQueue({ isAr }: { isAr: boolean }) {
  const [status, setStatus] = useState('DRAFT'); const [page, setPage] = useState(1); const [selected, setSelected] = useState<Node[]>([]);
  const [nextStatus, setNextStatus] = useState('READY_TO_REVIEW'); const [reason, setReason] = useState(''); const [ack, setAck] = useState(false);
  const [preview, setPreview] = useState<{ previewHash: string; canApply: boolean; data: Array<{ nodeId: string; issues: string[]; impact?: { totalReferences: number } }>; inputKey: string } | null>(null);
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState<string | null>(null);
  const nodes = useTaxonomyRead<Page<Node>>(`${base}/nodes?status=${status}&page=${page}&pageSize=25`);
  const input = { nodes: selected.map(node => ({ nodeId: node.nodeId, expectedUpdatedAt: node.updatedAt })), nextStatus, reason, acknowledgeHistoricalReferences: ack };
  const inputKey = JSON.stringify(input); const currentPreview = preview?.inputKey === inputKey ? preview : null;
  const submit = async (dryRun: boolean) => { setBusy(true); setMessage(null); try {
    const result = await adminApiClient.request<any>(`${base}/review/bulk`, { method: 'POST', body: JSON.stringify({ ...input, dryRun, previewHash: dryRun ? undefined : currentPreview?.previewHash }) });
    if (dryRun) setPreview({ ...result, inputKey }); else { setSelected([]); setPreview(null); nodes.reload(); setMessage(isAr ? 'تم تحديث قائمة المراجعة؛ لم يُنشر شيء.' : 'Review queue updated; nothing was published.'); }
  } catch (cause) { setMessage(cause instanceof Error ? cause.message : 'REQUEST_FAILED'); } finally { setBusy(false); } };
  return <div className="space-y-3"><p>{isAr ? 'مراجعة جماعية حتى 25 عقدة، مع معاينة ونسخة لكل عقدة. لا يسمح هذا المسار بالنشر أو الأرشفة.' : 'Review up to 25 nodes with a preview and per-node revision. This flow cannot publish or archive.'}</p>
    <label>{isAr ? 'الحالة الحالية' : 'Current status'} <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); setSelected([]); }}><option>DRAFT</option><option>READY_TO_REVIEW</option></select></label>
    <ReadState {...nodes} isAr={isAr} /><ul>{nodes.data?.data.map(node => <li key={node.nodeId}><label><input type="checkbox" disabled={busy || !node.updatedAt} checked={selected.some(item => item.nodeId === node.nodeId)} onChange={event => setSelected(items => event.target.checked ? [...items, node] : items.filter(item => item.nodeId !== node.nodeId))} />{node.canonicalName}</label> · <TaxonomyNodeLink id={node.nodeId} label={isAr ? 'تحرير' : 'Edit'} /></li>)}</ul>
    {nodes.data && <TaxonomyPagination page={page} total={nodes.data.total} loading={nodes.loading || busy} onPage={value => { setPage(value); setSelected([]); }} isAr={isAr} />}
    <label>{isAr ? 'الحالة المطلوبة' : 'Requested status'} <select value={nextStatus} onChange={event => setNextStatus(event.target.value)}><option>READY_TO_REVIEW</option><option>DRAFT</option></select></label>
    <label className="block">{isAr ? 'سبب القرار' : 'Decision reason'}<textarea className="block border w-full p-2" maxLength={1000} value={reason} onChange={event => setReason(event.target.value)} /></label>
    <label><input type="checkbox" checked={ack} onChange={event => setAck(event.target.checked)} />{isAr ? 'راجعت العقد وأقر ببقاء المراجع التاريخية.' : 'I reviewed the nodes and acknowledge preserved historic references.'}</label>
    <div className="flex gap-3"><button type="button" disabled={busy || !selected.length || !reason.trim() || !ack} onClick={() => submit(true)}>{isAr ? 'معاينة القرار' : 'Preview decision'}</button>
      <button type="button" disabled={busy || !currentPreview?.canApply} onClick={() => submit(false)}>{isAr ? 'تطبيق القرار المعاين' : 'Apply previewed decision'}</button></div>
    {currentPreview && <ul>{currentPreview.data.map(entry => <li key={entry.nodeId}>{entry.nodeId} · {isAr ? 'الروابط: ' : 'References: '}{entry.impact?.totalReferences ?? '—'}: {entry.issues.length ? entry.issues.join(', ') : isAr ? 'جاهز' : 'Ready'}</li>)}</ul>}
    {message && <p role="status">{message}</p>}
  </div>;
}
export function AcademicTaxonomyOperationsWorkspace({ isAr }: { isAr: boolean }) {
  const [mode, setMode] = useState('tree');
  return <section className="rounded-2xl border bg-white p-5 space-y-4 text-sm">
    <nav aria-label={isAr ? 'حوكمة التصنيف' : 'Taxonomy governance'} className="flex flex-wrap gap-3">{[['tree','الشجرة','Hierarchy'],['diagnostics','سلامة الرسم والأسماء','Integrity and aliases'],['crosswalk','تغطية المطابقة','Crosswalk coverage'],['review','طابور المراجعة','Review queue']].map(([key, ar, en]) => <button type="button" key={key} aria-pressed={mode === key} onClick={() => setMode(key)} className="border rounded px-3 py-2">{isAr ? ar : en}</button>)}</nav>
    <div>{mode === 'tree' ? <GraphBrowser isAr={isAr} /> : mode === 'diagnostics' ? <Diagnostics isAr={isAr} /> : mode === 'crosswalk' ? <Crosswalk isAr={isAr} /> : <ReviewQueue isAr={isAr} />}</div>
  </section>;
}
