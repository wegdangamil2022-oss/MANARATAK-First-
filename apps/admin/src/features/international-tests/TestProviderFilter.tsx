import { useEffect, useState } from 'react';
import { Building2 } from 'lucide-react';
import { adminApiClient } from '../../api/client';

/** providerName is an owner-defined textual discovery facet, not a relationship
 * ID. Never pass a display name through CanonicalPicker as a fabricated ID. */
export function TestProviderFilter({
  value,
  onChange,
  ar,
}: {
  value: string;
  onChange: (value: string) => void;
  ar: boolean;
}) {
  const [query, setQuery] = useState(''),
    [page, setPage] = useState(1);
  const [rows, setRows] = useState<Array<{ id: string; displayName: string }>>([]);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState('loading');
    const timer = setTimeout(() => {
      const params = new URLSearchParams({ search: query, page: String(page) });
      adminApiClient
        .request<typeof rows>(`/admin/international-tests/providers?${params}`, {
          signal: controller.signal,
        })
        .then((items) => {
          if (!controller.signal.aborted) {
            setRows(items);
            setState('ready');
          }
        })
        .catch(() => {
          if (!controller.signal.aborted) setState('error');
        });
    }, 200);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query, page, retry]);
  const names = [...new Set(rows.map((row) => row.displayName))];
  return (
    <div className="min-w-0 space-y-2">
      <label>
        <span className="flex items-center gap-1.5">
          <Building2 size={16} />
          {ar ? 'الجهة المنظمة — اسم في السجل' : 'Provider — recorded name'}
        </span>
        <select
          aria-label={ar ? 'الجهة المنظمة' : 'Provider'}
          value={value}
          disabled={state === 'loading'}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{ar ? 'كل الجهات' : 'All providers'}</option>
          {value && !names.includes(value) && <option value={value}>{value}</option>}
          {names.map((name) => (
            <option key={name} value={name}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <details>
        <summary>{ar ? 'البحث في الجهات' : 'Find providers'}</summary>
        <input
          type="search"
          aria-label={ar ? 'بحث الجهات المنظمة' : 'Search providers'}
          value={query}
          maxLength={200}
          onChange={(event) => {
            setQuery(event.target.value);
            setPage(1);
          }}
        />
        <div className="flex gap-2">
          <button
            type="button"
            disabled={page <= 1 || state === 'loading'}
            onClick={() => setPage((n) => n - 1)}
          >
            {ar ? 'السابق' : 'Previous'}
          </button>
          <span>{page}</span>
          <button
            type="button"
            disabled={state !== 'ready' || rows.length < 50 || page >= 1000}
            onClick={() => setPage((n) => n + 1)}
          >
            {ar ? 'التالي' : 'Next'}
          </button>
        </div>
      </details>
      {state === 'error' && (
        <p role="alert">
          {ar
            ? 'تعذر تحميل الجهات؛ الاختيار الحالي محفوظ.'
            : 'Provider read failed; current selection retained.'}
          <button type="button" onClick={() => setRetry((n) => n + 1)}>
            {ar ? 'إعادة المحاولة' : 'Retry'}
          </button>
        </p>
      )}
    </div>
  );
}
