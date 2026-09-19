import { useEffect, useMemo, useRef, useState } from 'react';
import { type CanonicalPickerOption, canonicalOptionIsSelectable } from '../api/canonicalPickers';

type Loader = () => Promise<CanonicalPickerOption[]>;

export function CanonicalPicker({ label, value, onChange, load, reloadKey = 'default', optional = false, disabled = false }: {
  label: string;
  value?: string | null;
  onChange: (id: string | null, option?: CanonicalPickerOption) => void;
  load: Loader;
  reloadKey?: string;
  optional?: boolean;
  disabled?: boolean;
}) {
  const loaderRef = useRef(load);
  loaderRef.current = load;
  const [options, setOptions] = useState<CanonicalPickerOption[]>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setState('loading');
    setError('');
    loaderRef.current().then((items) => {
      if (!active) return;
      setOptions(items);
      setState('ready');
    }).catch((err: unknown) => {
      if (!active) return;
      setError(err instanceof Error ? err.message : 'Canonical options unavailable');
      setState('error');
    });
    return () => { active = false; };
  }, [reloadKey]);

  const selected = useMemo(() => options.find((item) => item.id === value), [options, value]);
  const selectedBlocked = selected && !canonicalOptionIsSelectable(selected);
  const missing = Boolean(value) && state === 'ready' && !selected;

  return <label className="block space-y-1 text-xs font-medium text-slate-700">
    <span>{label}</span>
    <select
      value={value ?? ''}
      disabled={disabled || state !== 'ready'}
      onChange={(event) => {
        const id = event.target.value || null;
        const next = options.find((item) => item.id === id);
        if (next && !canonicalOptionIsSelectable(next)) return;
        onChange(id, next);
      }}
      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm disabled:bg-slate-50"
    >
      <option value="">{optional ? '— None —' : state === 'loading' ? 'Loading…' : '— Select canonical record —'}</option>
      {options.map((item) => <option key={item.id} value={item.id} disabled={!canonicalOptionIsSelectable(item)}>
        {item.label}{item.code ? ` · ${item.code}` : ''} · {item.lifecycle}
      </option>)}
    </select>
    {state === 'error' ? <span className="text-red-600">{error}</span> : null}
    {missing ? <span className="text-red-600">Canonical ID not found in owner API: {value}</span> : null}
    {selectedBlocked ? <span className="text-amber-700">Existing relation is {selected.lifecycle}; choose an ACTIVE/PUBLISHED replacement before saving.</span> : null}
  </label>;
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
  useEffect(() => {
    let active = true;
    setError('');
    loaderRef.current().then((items) => active && setOptions(items)).catch((err: unknown) => active && setError(err instanceof Error ? err.message : 'Canonical options unavailable'));
    return () => { active = false; };
  }, [reloadKey]);
  return <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3">
    <legend className="px-1 text-xs font-semibold text-slate-700">{label}</legend>
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
