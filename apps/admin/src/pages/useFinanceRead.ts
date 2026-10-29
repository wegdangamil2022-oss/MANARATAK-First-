import { useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';
export function useFinanceRead<T>(path: string | null, refreshToken: number | string = 0) {
  const [refresh, setRefresh] = useState(0),
    key = JSON.stringify([path, refreshToken, refresh]);
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: string;
    loading: boolean;
  }>({ key, data: null, error: '', loading: !!path });
  useEffect(() => {
    const abort = new AbortController();
    setState({ key, data: null, error: '', loading: !!path });
    if (path)
      void adminApiClient
        .request<T>(path, { signal: abort.signal, cache: 'no-store' })
        .then((data) => {
          if (!abort.signal.aborted) setState({ key, data, error: '', loading: false });
        })
        .catch((cause) => {
          if (!abort.signal.aborted)
            setState({
              key,
              data: null,
              error: cause instanceof Error ? cause.message : 'FINANCE_READ_FAILED',
              loading: false,
            });
        });
    return () => abort.abort();
  }, [path, key]);
  return {
    ...(state.key === key ? state : { data: null, error: '', loading: !!path }),
    reload: () => setRefresh((v) => v + 1),
  };
}
