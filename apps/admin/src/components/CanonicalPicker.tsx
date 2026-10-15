import { useEffect, useMemo, useRef, useState } from 'react';
import { type CanonicalPickerOption, type CanonicalPickerPage, canonicalOptionIsSelectable } from '../api/canonicalPickers';

type Loader = (query?: string, page?: number) => Promise<CanonicalPickerOption[]>;
type PickerLoader = (query?: string, page?: number, cursor?: string) => Promise<CanonicalPickerOption[] | CanonicalPickerPage>;

export function CanonicalPicker({ label, value, onChange, load, reloadKey = 'default', optional = false, disabled = false, paged = false, allowInactive = false }: {
  label: string;
  value?: string | null;
  onChange: (id: string | null, option?: CanonicalPickerOption) => void;
  load: PickerLoader;
  reloadKey?: string;
  optional?: boolean;
  disabled?: boolean;
  paged?: boolean;
  /** Read filters may intentionally target historical inactive records. */
  allowInactive?: boolean;
}) {
  const loaderRef = useRef(load);
  loaderRef.current = load;
  const [options, setOptions] = useState<CanonicalPickerOption[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const cursors = useRef<Array<string | undefined>>([undefined]);
  const [nextCursor, setNextCursor] = useState<string | null | undefined>(undefined);

  useEffect(() => { cursors.current = [undefined]; setNextCursor(undefined); setPage(1); }, [reloadKey]);
  useEffect(() => {
    let active = true;
    setState('loading');
    setError('');
    const timer = setTimeout(() => loaderRef.current(search.trim(), paged ? page : 1, cursors.current[page - 1]).then((result) => {
      if (!active) return;
      const items = Array.isArray(result) ? result : result.options;
      const cursor = Array.isArray(result) ? undefined : result.nextCursor;
      setNextCursor(cursor);
      cursors.current[page] = cursor ?? undefined;
      setOptions(items);
      setState('ready');
    }).catch((err: unknown) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : 'Canonical options unavailable');
      setState('error');
    }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [reloadKey, search, page, paged]);

  const selected = useMemo(() => options.find((item) => item.id === value), [options, value]);
  const selectedBlocked = !allowInactive && selected && !canonicalOptionIsSelectable(selected);
  const missing = Boolean(value) && !selected;

  return <div className="block space-y-1 text-xs font-medium text-slate-700">
    <span>{label}</span>
    <input type="search" maxLength={200} aria-label={`Search ${label}`} value={search}
      disabled={disabled} onChange={event => { setSearch(event.target.value); cursors.current = [undefined]; setNextCursor(undefined); setPage(1); }}
      placeholder="Search owner records (up to 50 results)"
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    <select aria-label={label}
      value={value ?? ''}
      disabled={disabled || state !== 'ready'}
      onChange={(event) => {
        const id = event.target.value || null;
        const next = options.find((item) => item.id === id);
        if (id && (!next || (!allowInactive && !canonicalOptionIsSelectable(next)))) return;
        onChange(id, next);
      }}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
    >
      <option value="">{optional ? '— None —' : state === 'loading' ? 'Loading…' : '— Select canonical record —'}</option>
      {missing && <option value={value ?? ''} disabled>Current selection (outside bounded results): {value}</option>}
      {options.map((item) => <option key={item.id} value={item.id} disabled={!allowInactive && !canonicalOptionIsSelectable(item)}>
        {item.label}{item.code ? ` · ${item.code}` : ''} · {item.lifecycle}
      </option>)}
    </select>
    {value ? <span className="block break-all text-slate-500">ID: {value}</span> : null}
    {state === 'error' ? <span className="text-red-600">{error}</span> : null}
    {paged && <span className="flex gap-3"><button type="button" disabled={disabled || state !== 'ready' || page <= 1} onClick={() => setPage(value => value - 1)}>السابق</button><span>{page}</span><button type="button" disabled={disabled || state !== 'ready' || options.length === 0 || (nextCursor !== undefined && !nextCursor) || page >= 1000} onClick={() => setPage(value => value + 1)}>التالي</button></span>}
    {missing ? <span className="text-amber-700">Current ID is not in this bounded page. Search to verify; no relationship has been changed.</span> : null}
    {selectedBlocked ? <span className="text-amber-700">Existing relation is {selected.lifecycle}; choose an ACTIVE/PUBLISHED replacement before saving.</span> : null}
  </div>;
}

export function CanonicalMultiPicker({ label, values, onChange, load, reloadKey = 'default' }: {
  label: string;
  values: string[];
  onChange: (ids: string[]) => void;
  load: Loader;
  reloadKey?: string;
}) {
  const loaderRef = useRef(load);
  loaderRef.current = load;
  const [options, setOptions] = useState<CanonicalPickerOption[]>([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  useEffect(() => {
    let active = true;
    setError('');
    const timer = setTimeout(() => loaderRef.current(search.trim())
      .then(items => { if (active) setOptions(items); })
      .catch((err: unknown) => { if (active) setError(err instanceof Error ? err.message : 'Canonical options unavailable'); }), 200);
    return () => { active = false; clearTimeout(timer); };
  }, [reloadKey, search]);
  return <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
    <legend className="px-1 text-xs font-semibold text-slate-700">{label}</legend>
    <input type="search" maxLength={200} aria-label={`Search ${label}`} value={search}
      onChange={event => setSearch(event.target.value)} placeholder="Search owner records (up to 50)"
      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
    <span className="text-xs text-slate-500">Selected IDs: {values.length}; search does not remove existing selections.</span>
    <div className="max-h-44 space-y-1 overflow-auto">
      {options.map((item) => {
        const blocked = !canonicalOptionIsSelectable(item);
        return <label key={item.id} className={`flex items-center gap-2 text-xs ${blocked ? 'text-slate-400' : 'text-slate-700'}`}>
          <input type="checkbox" disabled={blocked} checked={values.includes(item.id)} onChange={(event) => onChange(event.target.checked ? [...new Set([...values, item.id])] : values.filter((id) => id !== item.id))} />
          <span>{item.label}{item.code ? ` · ${item.code}` : ''}</span><span className="ml-auto">{item.lifecycle}</span>
        </label>;
      })}
    </div>
    {error ? <div className="text-xs text-red-600">{error}</div> : null}
  </fieldset>;
}
