import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
export function useNotificationRead<T>(endpoint: string | null) {
  const [data, setData] = useState<T | null>(null),
    [error, setError] = useState<unknown>(null),
    [loading, setLoading] = useState(Boolean(endpoint)),
    [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    setData(null);
    setError(null);
    setLoading(Boolean(endpoint));
    if (endpoint)
      void adminApiClient
        .request<T>(endpoint)
        .then((value) => {
          if (active) setData(value);
        })
        .catch((reason) => {
          if (active) setError(reason);
        })
        .finally(() => {
          if (active) setLoading(false);
        });
    return () => {
      active = false;
    };
  }, [endpoint, revision]);
  return { data, error, loading, refresh: () => setRevision((value) => value + 1) };
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
