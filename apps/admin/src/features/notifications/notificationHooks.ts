import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
export function useNotificationRead<T>(endpoint: string | null, revision = 0) {
  const [reload, setReload] = useState(0);
  const key = `${endpoint ?? ''}:${revision}:${reload}`;
  const [state, setState] = useState<{
    key: string;
    data: T | null;
    error: unknown;
    loading: boolean;
  }>({ key, data: null, error: null, loading: Boolean(endpoint) });
  useEffect(() => {
    const abort = new AbortController();
    setState({ key, data: null, error: null, loading: Boolean(endpoint) });
    if (endpoint)
      void adminApiClient
        .request<T>(endpoint, { signal: abort.signal, cache: 'no-store' })
        .then((value) => {
          if (!abort.signal.aborted) setState({ key, data: value, error: null, loading: false });
        })
        .catch((reason) => {
          if (!abort.signal.aborted) setState({ key, data: null, error: reason, loading: false });
        });
    return () => {
      abort.abort();
    };
  }, [endpoint, key]);
  return {
    ...(state.key === key ? state : { data: null, error: null, loading: Boolean(endpoint) }),
    refresh: () => setReload((value) => value + 1),
  };
}
export function useDebounced(value: string, delay = 400) {
  const [current, setCurrent] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setCurrent(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return current;
}
/** Freeze both body and idempotency identity until a request is conclusively accepted or rejected. */
export function useNotificationCommand() {
  const pending = useRef<{ endpoint: string; body: string; key: string } | null>(null),
    lock = useRef(false),
    alive = useRef(true);
  const [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [error, setError] = useState<unknown>(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const execute = async <T>(endpoint: string, body: unknown): Promise<T | undefined> => {
    if (lock.current) return;
    const snapshot = JSON.stringify(body);
    if (
      pending.current &&
      (pending.current.endpoint !== endpoint || pending.current.body !== snapshot)
    )
      return;
    pending.current ??= { endpoint, body: snapshot, key: createAdminIdempotencyKey() };
    lock.current = true;
    setBusy(true);
    setError(null);
    try {
      const result = await adminApiClient.request<T>(endpoint, {
        method: 'POST',
        body: pending.current.body,
        headers: { 'Idempotency-Key': pending.current.key },
      });
      if (!alive.current) return undefined;
      pending.current = null;
      if (alive.current) setUncertain(false);
      return result;
    } catch (reason) {
      if (alive.current) {
        setError(reason);
        const definite = /\[(400|401|403|404|409|422|429)\]/.test(
          reason instanceof Error ? reason.message : '',
        );
        if (definite) pending.current = null;
        setUncertain(!definite);
      }
      return undefined;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  };
  return { execute, busy, uncertain, error };
}
