import { useEffect, useRef, useState } from 'react';
export interface CatalogPage<T> { data: T[]; total: number | null; nextCursor?: string | null; }
/** One owner page per action; changing filters or locale invalidates and cancels old work. */
export function useBoundedCatalog<T extends { id: string }>(identity: string, loader: (cursor: string | undefined, signal: AbortSignal) => Promise<CatalogPage<T>>) {
  const loadRef = useRef(loader); loadRef.current = loader;
  const generation = useRef(0), lock = useRef(false), controller = useRef<AbortController | null>(null);
  const [rows, setRows] = useState<T[]>([]), [total, setTotal] = useState<number | null>(null);
  const [cursor, setCursor] = useState<string | null>(null), [busy, setBusy] = useState(true), [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const read = async (after?: string) => {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const current = generation.current, signal = controller.current!.signal;
    try {
      const page = await loadRef.current(after, signal);
      if (current !== generation.current || signal.aborted) return;
      if (!Array.isArray(page.data) || page.data.length > 100 || (page.total !== null && (!Number.isSafeInteger(page.total) || page.total < 0))) throw new Error('CATALOG_RESPONSE_INVALID');
      if (page.nextCursor && page.nextCursor === after) throw new Error('CATALOG_CURSOR_DID_NOT_ADVANCE');
      setRows(old => after ? [...old, ...page.data.filter(item => !old.some(known => known.id === item.id))] : page.data);
      setTotal(page.total); setCursor(page.nextCursor ?? null);
    } catch {
      if (current === generation.current && !signal.aborted) setError('CATALOG_UNAVAILABLE');
    } finally {
      if (current === generation.current) { lock.current = false; setBusy(false); }
    }
  };
  useEffect(() => {
    const current = ++generation.current;
    controller.current?.abort(); controller.current = new AbortController(); lock.current = false;
    setRows([]); setTotal(null); setCursor(null); setBusy(true); setError('');
    const timer = setTimeout(() => void read(), 200);
    return () => { clearTimeout(timer); controller.current?.abort(); generation.current = current + 1; };
    // identity is the complete filter/locale contract; loader is read through its ref.
  }, [identity, retry]);
  return { rows, total, cursor, busy, error, more: () => { if (cursor) void read(cursor); }, retry: () => setRetry(value => value + 1) };
}
