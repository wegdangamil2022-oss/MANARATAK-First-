import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { useCourseCopy } from './useCourseCopy';

export interface CourseOption { id: string; label: string }
export interface CourseOptionPage { data: CourseOption[]; hasMore: boolean }
export function CourseLookup({ label, value, load, hydrate, onChange }: {
  label: string; value: string; load: (query: string, page: number) => Promise<CourseOptionPage>;
  hydrate?: (id: string) => Promise<CourseOption>; onChange: (id: string) => void;
}) {
  const { tr } = useCourseCopy();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState<CourseOptionPage>();
  const [selected, setSelected] = useState<CourseOption>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const loadRef = useRef(load); loadRef.current = load;
  const hydrateRef = useRef(hydrate); hydrateRef.current = hydrate;
  useEffect(() => {
    if (!value) { setSelected(undefined); return; }
    if (!hydrateRef.current) { setSelected(current => current?.id === value ? current : { id: value, label: tr('اختيار محفوظ', 'Saved selection') }); return; }
    let active = true;
    hydrateRef.current(value).then(option => { if (active) setSelected(option); }).catch(() => {
      if (active) setSelected({ id: value, label: tr('اختيار محفوظ — تعذر قراءة الاسم', 'Saved selection — name unavailable') });
    });
    return () => { active = false; };
  }, [value, tr]);
  useEffect(() => {
    if (!open) return;
    let active = true; setBusy(true); setError('');
    const timer = setTimeout(() => loadRef.current(query, page).then(result => {
      if (active) setData(result);
    }).catch(() => { if (active) setError(tr('تعذر تحميل الخيارات', 'Could not load options')); }).finally(() => { if (active) setBusy(false); }), 250);
    return () => { active = false; clearTimeout(timer); };
  }, [open, query, page, tr]);
  useEffect(() => {
    if (!open) return;
    const close = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);
  return <div className="course-lookup" ref={root} onKeyDown={event => {
    if (event.key === 'Escape' && open) { event.stopPropagation(); setOpen(false); root.current?.querySelector('button')?.focus(); }
  }}>
    <span className="course-label">{label}</span>
    <button type="button" className="course-lookup-trigger" aria-expanded={open} aria-label={label} onClick={() => setOpen(!open)}>
      <span>{selected?.label ?? tr('الكل', 'All')}</span><ChevronDown aria-hidden="true" size={16} />
    </button>
    {open && <div className="course-lookup-popover">
      <label className="course-search"><Search size={16}/><input autoFocus type="search" maxLength={200} aria-label={`${tr('بحث', 'Search')} ${label}`} value={query} onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      <button type="button" onClick={() => { onChange(''); setOpen(false); }}><X size={14}/>{tr('الكل', 'All')}</button>
      {busy ? <p role="status">{tr('جارٍ التحميل…', 'Loading…')}</p> : error ? <div role="alert">{error}<button type="button" onClick={() => { setOpen(false); setTimeout(() => setOpen(true), 0); }}>{tr('إعادة المحاولة', 'Retry')}</button></div> : <div className="course-lookup-options">
        {data?.data.map(option => <button type="button" key={option.id} aria-pressed={value === option.id} onClick={() => { setSelected(option); onChange(option.id); setOpen(false); }}>{option.label}</button>)}
        {data?.data.length === 0 && <p>{tr('لا نتائج', 'No results')}</p>}
      </div>}
      <div className="course-lookup-pages"><button type="button" disabled={page <= 1 || busy} onClick={() => setPage(page - 1)}>{tr('السابق', 'Previous')}</button><span>{page}</span><button type="button" disabled={!data?.hasMore || busy || page >= 1000} onClick={() => setPage(page + 1)}>{tr('التالي', 'Next')}</button></div>
    </div>}
  </div>;
}
