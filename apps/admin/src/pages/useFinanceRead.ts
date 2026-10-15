import {useEffect, useRef, useState} from 'react';
import {adminApiClient} from '../api/client';

export function useFinanceRead<T>(path: string | null, refreshToken: number | string = 0) {
  const [data, setData] = useState<T | null>(null), [error, setError] = useState(''), [loading, setLoading] = useState(false);
  const [resolvedPath, setResolvedPath] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(0), sequence = useRef(0);
  useEffect(() => {
    const request = ++sequence.current; let cancelled = false;
    setData(null); setError(''); setLoading(Boolean(path));
    if (!path) return;
    void adminApiClient.request<T>(path)
      .then(result => {if (!cancelled && request === sequence.current) {setResolvedPath(path); setData(result);}})
      .catch(cause => {if (!cancelled && request === sequence.current) setError(cause instanceof Error ? cause.message : 'FINANCE_READ_FAILED');})
      .finally(() => {if (!cancelled && request === sequence.current) setLoading(false);});
    return () => {cancelled = true;};
  }, [path, refresh, refreshToken]);
  return {data: resolvedPath === path ? data : null, error, loading, reload: () => setRefresh(value => value + 1)};
}
