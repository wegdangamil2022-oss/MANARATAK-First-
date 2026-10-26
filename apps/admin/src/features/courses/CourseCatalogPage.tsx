import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { BookOpen, GraduationCap, Globe2, WalletCards, ArrowLeft, RefreshCw, Plus, Upload, Building2, Route, LayoutGrid, Table2, CheckCircle2, ClipboardCheck, FileEdit, AlertCircle, Eye, X } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { catalogQuery, changeCatalogFilters, type CatalogResult, type CatalogRow, type CourseScope } from './catalogState';
import { useCourseCopy } from './useCourseCopy';
import { CourseCatalogFilters } from './CourseCatalogFilters';
import { CourseCatalogResults } from './CourseCatalogResults';
import { NativeCourseLearningMetrics } from './NativeCourseLearningMetrics';
import { CreateNativeCourseDialog } from './CreateNativeCourseDialog';
import { ExternalCourseDrawer } from './ExternalCourseDrawer';
import { CourseBulkPublicationPanel, type BulkSelection } from './CourseBulkPublicationPanel';
import './courses.css';

export function CourseCatalogPage({ fixedScope }: { fixedScope?: CourseScope }) {
  const { tr, ar, number } = useCourseCopy();
  const { hasPermission } = useAdminAuthorization();
  const [params, setParams] = useSearchParams();
  const setParamsRef = useRef(setParams);
  setParamsRef.current = setParams;
  const navigate = useNavigate();
  const location = useLocation();
  const q = params.get('q') ?? '';
  const [search, setSearch] = useState(q);
  const [refresh, setRefresh] = useState(0);
  const [data, setData] = useState<CatalogResult>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [create, setCreate] = useState(false);
  const [externalCreate, setExternalCreate] = useState(false);
  const [allResults, setAllResults] = useState(false);
  const [bulkSelection, setBulkSelection] = useState<BulkSelection>();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [selected, setSelected] = useState<Map<string, CatalogRow>>(new Map());
  const scope: CourseScope = fixedScope ?? (params.get('scope') === 'native' ? 'native' : params.get('scope') === 'external' ? 'external' : 'all');
  const paidEntry = !fixedScope && params.get('scope') === 'paid';
  const query = catalogQuery(params, scope).toString();
  const generation = useRef(0);
  useEffect(() => {
    if (paidEntry) { navigate('/courses/paid', { replace: true }); return; }
    if (fixedScope === 'native' && ['provider', 'platformName', 'completenessStatus', 'linkHealth', 'scope'].some(key => params.has(key))) {
      setParams(previous => { const next = changeCatalogFilters(previous, { scope: 'native' }); next.delete('scope'); return next; }, { replace: true });
    }
  }, [paidEntry, fixedScope, params, navigate, setParams]);
  useEffect(() => { setSearch(q); }, [q]);
  useEffect(() => {
    if (paidEntry) return;
    if (search === q) return;
    const timer = setTimeout(() => setParams(previous => changeCatalogFilters(previous, { q: search }), { replace: true }), 300);
    return () => clearTimeout(timer);
  }, [search, q, setParams, paidEntry]);
  useEffect(() => {
    if (paidEntry) return;
    const controller = new AbortController(); const request = ++generation.current;
    setLoading(true); setError('');
    const suffix = fixedScope && fixedScope !== 'all' ? `/${fixedScope}` : '';
    const timer = setTimeout(() => adminApiClient.request<CatalogResult>(`/admin/courses/catalog${suffix}?${query}`, { signal: controller.signal }).then(result => {
      if (controller.signal.aborted || generation.current !== request) return;
      const lastPage = Math.max(1, result.totalPages);
      if (result.page > lastPage) {
        setParamsRef.current(previous => { const next = new URLSearchParams(previous); next.set('page', String(lastPage)); return next; }, { replace: true }); return;
      }
      setData(result);
    }).catch(error => { if (!controller.signal.aborted && generation.current === request) setError(error instanceof Error ? error.message : tr('تعذر تحميل الدورات', 'Could not load courses')); }).finally(() => {
      if (!controller.signal.aborted && generation.current === request) setLoading(false);
    }), 180);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query, refresh, fixedScope, tr, paidEntry]);
  // Retain selection across pages and presentation, clear it when its query scope changes.
  const selectionScope = new URLSearchParams(query); selectionScope.delete('page'); selectionScope.delete('pageSize'); selectionScope.delete('sort');
  const selectionKey = selectionScope.toString();
  useEffect(() => { setSelected(new Map()); setAllResults(false); }, [selectionKey]);
  const startBulk = () => {
    const filters = Object.fromEntries([...new URLSearchParams(query)].filter(([key]) => !['page', 'pageSize', 'sort', 'originType'].includes(key)));
    setBulkSelection(allResults ? { mode: 'FILTER', filters } : { mode: 'IDS', ids: [...selected.keys()] });
    setBulkOpen(true);
  };
  const change = (updates: Record<string, string>) => {
    if (updates.scope === 'paid') { navigate('/courses/paid'); return; }
    setParams(previous => changeCatalogFilters(previous, updates));
  };
  const reset = () => { setSearch(''); setParams(previous => { const next = new URLSearchParams(); if (previous.get('view')) next.set('view', previous.get('view')!); if (previous.get('pageSize')) next.set('pageSize', previous.get('pageSize')!); return next; }); };
  const presentation = (key: string, value: string) => setParams(previous => { const next = new URLSearchParams(previous); next.set(key, value); return next; });
  const returnTo = `${location.pathname}${location.search}`;
  const open = (row: CatalogRow) => {
    if (row.originType === 'EXTERNAL_LINKED_COURSE') presentation('course', row.id);
    else navigate(`/courses/${encodeURIComponent(row.id)}${row.originType === 'NATIVE_MANARATAK_COURSE' ? '/editor' : ''}?returnTo=${encodeURIComponent(returnTo)}`);
  };
  const title = fixedScope === 'native' ? tr('إدارة دورات منارتك', 'Manaratak course management') : fixedScope === 'external' ? tr('إدارة الدورات التدريبية الخارجية', 'External course management') : tr('إدارة الدورات التدريبية', 'Training course management');
  const description = fixedScope === 'native' ? tr('إدارة المحتوى والمنهج والمراجعة لدورات التعلم داخل منارتك.', 'Manage content, curriculum and reviews for learning inside Manaratak.') : fixedScope === 'external' ? tr('اكتشاف ومراجعة دورات الجهات الخارجية مع الحفاظ على بيانات المصدر.', 'Discover and review external courses while preserving their source records.') : tr('كتالوج موحد للدورات، مع مساحة متخصصة لكل مسار.', 'A unified catalog with a dedicated workspace for each course origin.');
  const stats = !loading && !error && data?.statistics?.scope === 'FILTERED' ? data.statistics : undefined;
  const entries = [
    { to: '/courses/native', title: tr('دورات منارتك', 'Manaratak courses'), description: tr('المحتوى والمنهج والتعلم داخل المنصة', 'Content, curriculum and learning on the platform'), Icon: GraduationCap, tone: 'indigo' },
    { to: '/courses/external', title: tr('الدورات الخارجية', 'External courses'), description: tr('كتالوج الجهات والمصادر والتحقق', 'Providers, source catalog and verification'), Icon: Globe2, tone: 'teal' },
    { to: '/courses/paid', title: tr('الدورات المدفوعة', 'Paid courses'), description: tr('واجهة تمهيدية — التشغيل لاحقًا', 'Preparation page — operations deferred'), Icon: WalletCards, tone: 'gold' },
  ];
  return <main className="courses-workspace" dir={ar ? 'rtl' : 'ltr'}>
    <section className="course-hero"><span><BookOpen size={18}/>{tr('الإدارة الأكاديمية', 'Academic administration')}</span><h1>{title}</h1><p>{description}</p></section>
    {!fixedScope ? <nav className="course-entry-grid" aria-label={tr('مساحات الدورات', 'Course workspaces')}>{entries.map(({ to, title, description, Icon, tone }) => <Link className={`course-entry course-entry-${tone}`} key={to} to={to}><span className="course-entry-icon"><Icon size={22}/></span><span><strong>{title}</strong><small>{description}</small></span><ArrowLeft size={17}/></Link>)}</nav> : <Link className="course-back" to="/courses"><ArrowLeft size={16}/>{tr('الدورات التدريبية', 'Training courses')}</Link>}
    <div className="course-toolbar">
      {fixedScope !== 'native' && hasPermission('admin:courses:manage') && <button type="button" className={fixedScope === 'external' ? 'course-primary' : ''} onClick={() => setExternalCreate(true)}><Plus size={16}/>{tr('إضافة دورة خارجية', 'Add external course')}</button>}
      {fixedScope !== 'external' && hasPermission('admin:courses:manage') && <button type="button" className="course-primary" onClick={() => setCreate(true)}><Plus size={16}/>{tr('إنشاء دورة منارتك', 'Create a Manaratak course')}</button>}
      {fixedScope !== 'native' && hasPermission('admin:imports:manage') && <Link to="/imports/courses"><Upload size={16}/>{tr('استيراد دورات خارجية', 'Import external courses')}</Link>}
      {fixedScope !== 'native' && <Link to="/courses/providers"><Building2 size={16}/>{tr('إدارة المزودين', 'Provider registry')}</Link>}
      {fixedScope !== 'external' && <Link to="/courses/learning-paths"><Route size={16}/>{tr('مسارات التعلم', 'Learning paths')}</Link>}
      <button type="button" disabled={loading} onClick={() => setRefresh(refresh + 1)}><RefreshCw size={16} className={loading ? 'course-spin' : ''}/>{tr('تحديث', 'Refresh')}</button>
      {fixedScope !== 'native' && hasPermission('admin:courses:manage') && <button type="button" onClick={() => { setBulkSelection(undefined); setBulkOpen(true); }}><ClipboardCheck size={16}/>{tr('دفعات النشر المحفوظة', 'Saved publication batches')}</button>}
    </div>
    {scope === 'native' ? <NativeCourseLearningMetrics data={data} unavailable={loading || Boolean(error)}/> : <section className="course-metrics" aria-label={tr('مؤشرات النتائج المفلترة', 'Filtered result metrics')}>
      {([{ label: tr('إجمالي النتائج', 'Matching courses'), value: stats?.total, Icon: BookOpen, tone: 'indigo' }, { label: tr('منشورة', 'Published'), value: stats?.published, Icon: CheckCircle2, tone: 'teal' }, { label: tr('تحتاج مراجعة', 'Needs review'), value: stats?.needsReview, Icon: ClipboardCheck, tone: 'gold' }, { label: tr('مسودات', 'Drafts'), value: stats?.drafts, Icon: FileEdit, tone: 'cyan' }]).map(({ label, value, Icon, tone }) => <article key={label} className={`course-metric course-entry-${tone}`}><span className="course-entry-icon"><Icon size={18}/></span><div><span>{label}</span><strong>{value === undefined ? '—' : number(value)}</strong></div></article>)}
    </section>}
    <p className="course-metric-scope">{tr('المؤشرات تخص جميع النتائج المطابقة للفلاتر، عبر كل الصفحات.', 'Metrics cover all filtered results across all pages.')}</p>
    {fixedScope === 'external' && <nav className="course-external-overview" aria-label={tr('مؤشرات المراجعة الخارجية', 'External review metrics')}>
      {([{ label: tr('غير مكتملة', 'Incomplete'), value: data?.externalOverview?.incomplete, filter: { completenessStatus: 'INCOMPLETE' } },
        { label: tr('روابط معطلة / مرفوضة', 'Broken / rejected links'), value: data?.externalOverview?.broken, filter: { linkHealth: 'BROKEN' } },
        { label: tr('تحتاج تحققًا', 'Needs verification'), value: data?.externalOverview?.needsVerification, filter: { linkHealth: 'NEEDS_REVIEW' } },
        { label: tr('جاهزة للنشر', 'Ready for publication'), value: data?.externalOverview?.ready, filter: { status: 'READY_TO_PUBLISH' } },
        { label: tr('مؤرشفة', 'Archived'), value: data?.externalOverview?.archived, filter: { status: 'ARCHIVED' } },
      ] as Array<{ label: string; value?: number; filter: Record<string, string> }>).map(item => <button type="button" key={item.label} disabled={loading || Boolean(error)} onClick={() => change(item.filter)}><ClipboardCheck size={16}/>{item.label}<strong>{!loading && !error && item.value !== undefined ? number(item.value) : '—'}</strong></button>)}
    </nav>}
    <CourseCatalogFilters params={params} fixedScope={fixedScope} scope={scope} search={search} onSearch={setSearch} change={change} reset={reset}/>
    <section className="course-panel course-results" aria-busy={loading} aria-labelledby="course-results-title">
      <header className="course-results-header"><h2 id="course-results-title"><BookOpen size={18}/>{tr('كتالوج الدورات', 'Course catalog')} <span>{!loading && !error && data ? number(data.total) : '—'}</span></h2>
        <div className="course-results-controls"><label>{tr('الترتيب', 'Sort')}<select aria-label={tr('ترتيب الدورات', 'Course sort order')} value={params.get('sort') ?? 'UPDATED_DESC'} onChange={event => change({ sort: event.target.value })}>
          {[['UPDATED_DESC', tr('آخر تحديث', 'Recently updated')], ['UPDATED_ASC', tr('الأقدم تحديثًا', 'Oldest update')], ['NAME_ASC', tr('الاسم تصاعديًا', 'Name ascending')], ['NAME_DESC', tr('الاسم تنازليًا', 'Name descending')], ['STATUS_ASC', tr('الحالة', 'Status')]].map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select></label><div className="course-view-toggle" role="group" aria-label={tr('طريقة العرض', 'View mode')}><button type="button" aria-pressed={params.get('view') !== 'cards'} onClick={() => presentation('view', 'table')}><Table2 size={16}/>{tr('جدول', 'Table')}</button><button type="button" aria-pressed={params.get('view') === 'cards'} onClick={() => presentation('view', 'cards')}><LayoutGrid size={16}/>{tr('بطاقات', 'Cards')}</button></div></div>
      </header>
      {fixedScope !== 'native' && hasPermission('admin:courses:manage') && <div className="course-drawer-toolbar"><button type="button" disabled={loading || !stats?.external} aria-pressed={allResults} onClick={() => { setSelected(new Map()); setAllResults(true); }}><ClipboardCheck size={16}/>{tr('تحديد كل الدورات الخارجية المطابقة للفلاتر', 'Select all matching external courses')}</button></div>}
      {(selected.size > 0 || allResults) && <div className="course-selection"><strong>{tr('المحدد', 'Selected')}: {allResults ? tr('كل النتائج الخارجية — يثبت العدد عند المعاينة', 'All external matches — count frozen at preview') : number(selected.size)}</strong>{!allResults && <button type="button" disabled={loading} onClick={() => { const row = selected.values().next().value; if (row) open(row); }}><Eye size={16}/>{tr('فتح أول سجل محدد', 'Open first selected record')}</button>}
        {hasPermission('admin:courses:manage') && (allResults || [...selected.values()].every(row => row.originType === 'EXTERNAL_LINKED_COURSE')) && <button type="button" className="course-primary" disabled={loading} onClick={startBulk}><ClipboardCheck size={16}/>{tr('فحص الجاهزية والنشر المحدد', 'Preview selected publication')}</button>}
        <button type="button" onClick={() => { setSelected(new Map()); setAllResults(false); }}><X size={16}/>{tr('إلغاء التحديد', 'Clear selection')}</button><small>{tr('يبقى التحديد عبر الصفحات والعرض؛ يُمسح عند تغيير الفلاتر. النشر الجماعي للخارجية فقط وبعد معاينة إلزامية.', 'Selection survives pages and views; filters clear it. Bulk publication is external only and requires a preview.')}</small></div>}
      {loading ? <div className="course-skeleton" role="status" aria-label={tr('جارٍ تحميل الكتالوج', 'Loading catalog')}>{[1, 2, 3, 4].map(key => <div key={key}/>)}</div> : error ? <div className="course-empty course-error" role="alert"><AlertCircle size={26}/><h3>{tr('تعذر تحميل الدورات', 'Could not load courses')}</h3><p>{error}</p><button type="button" onClick={() => setRefresh(refresh + 1)}>{tr('إعادة المحاولة', 'Retry')}</button></div> : data?.data.length === 0 ? <div className="course-empty" role="status"><BookOpen size={28}/><h3>{tr('لا توجد دورات ضمن هذا النطاق', 'No courses in this scope')}</h3><p>{query.includes('search=') || params.size ? tr('جرّب تعديل الفلاتر أو مسحها.', 'Change or clear the filters.') : tr('ستظهر السجلات بعد إنشائها أو ترحيلها عبر مسار الاستيراد.', 'Records will appear after creation or approved import transfer.')}</p><button type="button" onClick={reset}>{tr('مسح الفلاتر', 'Clear filters')}</button></div> : data && <CourseCatalogResults native={scope === 'native'} nativeLearning={scope === 'native' ? data.nativeLearning?.byCourse : undefined} rows={data.data} cards={params.get('view') === 'cards'} selected={new Set(selected.keys())} onOpen={open} onSelect={(row, checked) => { setAllResults(false); setSelected(previous => { const next = new Map(previous); if (checked) next.set(row.id, row); else next.delete(row.id); return next; }); }} onSelectPage={checked => { setAllResults(false); setSelected(previous => { const next = new Map(previous); for (const row of data.data) if (checked) next.set(row.id, row); else next.delete(row.id); return next; }); }}/>}
      {!loading && !error && data && <footer className="course-pagination"><label>{tr('عدد الصفوف', 'Rows per page')}<select aria-label={tr('عدد الصفوف', 'Rows per page')} value={data.pageSize} onChange={event => change({ pageSize: event.target.value })}>{[20, 50, 100].map(size => <option key={size} value={size}>{number(size)}</option>)}</select></label><div><button disabled={data.page <= 1} type="button" onClick={() => presentation('page', String(data.page - 1))}>{tr('السابق', 'Previous')}</button><span>{number(data.page)} / {number(Math.max(1, data.totalPages))}</span><button disabled={data.page >= data.totalPages} type="button" onClick={() => presentation('page', String(data.page + 1))}>{tr('التالي', 'Next')}</button></div></footer>}
    </section>
    {!loading && !error && data && !data.statistics && <p role="status" className="course-error">{tr('لم تُرجع الخدمة مؤشرات موثوقة؛ لم تُعرض أرقام بديلة.', 'The service returned no trusted metrics; no substitute values are shown.')}</p>}
    {create && <CreateNativeCourseDialog onClose={() => setCreate(false)} returnTo={returnTo}/>}
    {!bulkOpen && !params.get('batch') && (externalCreate || params.get('course')) && <ExternalCourseDrawer id={externalCreate ? undefined : params.get('course')!} returnTo={returnTo.replace(/([?&])course=[^&]*&?/, '$1').replace(/[?&]$/, '')} onSaved={id => { setExternalCreate(false); if (externalCreate) presentation('course', id); setRefresh(value => value + 1); }} onClose={() => { setExternalCreate(false); setParams(previous => { const next = new URLSearchParams(previous); next.delete('course'); return next; }, { replace: true }); }} />}
    {(bulkOpen || params.get('batch')) && <CourseBulkPublicationPanel id={params.get('batch') ?? undefined} selection={bulkSelection} onBatch={id => presentation('batch', id)} onChanged={() => setRefresh(value => value + 1)} onClose={() => { setBulkOpen(false); setBulkSelection(undefined); setParams(previous => { const next = new URLSearchParams(previous); next.delete('batch'); return next; }, { replace: true }); }}/>}
  </main>;
}
