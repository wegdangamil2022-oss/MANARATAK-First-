import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
export function useStaffRead<T>(endpoint: string | null) {
  const [value, setValue] = useState<T | null>(null),
    [error, setError] = useState(''),
    [loading, setLoading] = useState(!!endpoint),
    [refresh, setRefresh] = useState(0);
  useEffect(() => {
    let active = true;
    setValue(null);
    setError('');
    if (!endpoint) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void adminApiClient
      .request<{ data: T }>(endpoint, { cache: 'no-store' })
      .then((result) => {
        if (active) setValue(result.data);
      })
      .catch((failure) => {
        if (active) setError(failure instanceof Error ? failure.message : 'STAFF_UNAVAILABLE');
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [endpoint, refresh]);
  return { value, error, loading, reload: () => setRefresh((v) => v + 1) };
}
export function useStaffCommand(onSaved: () => void) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    lock = useRef(false),
    key = useRef<{ signature: string; key: string } | null>(null);
  return {
    busy,
    error,
    notice,
    run: async (endpoint: string, body: object) => {
      if (lock.current) return false;
      lock.current = true;
      setBusy(true);
      setError('');
      setNotice('');
      const signature = JSON.stringify([endpoint, body]);
      if (key.current?.signature !== signature)
        key.current = { signature, key: createAdminIdempotencyKey() };
      try {
        await adminApiClient.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
          idempotencyKey: key.current.key,
        });
        key.current = null;
        setNotice('SAVED');
        onSaved();
        return true;
      } catch (failure) {
        setError(failure instanceof Error ? failure.message : 'STAFF_SAVE_FAILED');
        return false;
      } finally {
        lock.current = false;
        setBusy(false);
      }
    },
  };
}
