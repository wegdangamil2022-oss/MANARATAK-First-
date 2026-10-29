import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
import { useOwnerOperationScope } from '../../security/useOwnerOperationScope';
import { useTranslation } from '../../i18n/I18nProvider';
export function useStaffRead<T>(endpoint: string | null) {
  const [refresh, setRefresh] = useState(0);
  const key = JSON.stringify([endpoint, refresh]);
  const [state, setState] = useState<{
    key: string;
    value: T | null;
    error: string;
    loading: boolean;
  }>({ key, value: null, error: '', loading: !!endpoint });
  useEffect(() => {
    const abort = new AbortController();
    setState({ key, value: null, error: '', loading: !!endpoint });
    if (endpoint)
      void adminApiClient
        .request<{ data: T }>(endpoint, { cache: 'no-store', signal: abort.signal })
        .then((result) => {
          if (!abort.signal.aborted)
            setState({ key, value: result.data, error: '', loading: false });
        })
        .catch((failure) => {
          if (!abort.signal.aborted)
            setState({
              key,
              value: null,
              error: failure instanceof Error ? failure.message : 'STAFF_UNAVAILABLE',
              loading: false,
            });
        });
    return () => abort.abort();
  }, [endpoint, key]);
  return {
    ...(state.key === key ? state : { value: null, error: '', loading: !!endpoint }),
    reload: () => setRefresh((v) => v + 1),
  };
}
export function useStaffCommand(onSaved: () => void | Promise<void>, owner = '') {
  const scope = useOwnerOperationScope(owner),
    { language } = useTranslation();
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const lock = useRef(false),
    pending = useRef<{ signature: string; key: string } | null>(null);
  useEffect(() => {
    lock.current = false;
    pending.current = null;
    setBusy(false);
    setError('');
    setNotice('');
  }, [scope]);
  return {
    busy,
    error,
    notice,
    run: async (endpoint: string, body: object) => {
      if (lock.current || !scope.isCurrent()) return false;
      const signature = JSON.stringify([endpoint, body]);
      if (pending.current && pending.current.signature !== signature) {
        setError(
          language === 'ar'
            ? 'نتيجة الطلب السابق غير مؤكدة. تحقق من السجل أو أعد المحاولة بالنص نفسه قبل تغييره.'
            : 'The previous result is uncertain. Reconcile it or retry the exact request before changing it.',
        );
        return false;
      }
      pending.current ??= { signature, key: createAdminIdempotencyKey() };
      lock.current = true;
      setBusy(true);
      setError('');
      setNotice('');
      let accepted = false;
      try {
        await adminApiClient.request(endpoint, {
          method: 'POST',
          body: JSON.stringify(body),
          idempotencyKey: pending.current.key,
        });
        if (!scope.isCurrent()) return false;
        accepted = true;
        pending.current = null;
        setNotice('SAVED');
        await onSaved();
        return true;
      } catch (failure) {
        if (!scope.isCurrent()) return false;
        if (accepted) {
          setError(
            language === 'ar'
              ? 'تم الحفظ لكن تعذر تحديث العرض. أعد تحميل السجل قبل إجراء آخر.'
              : 'Saved; the display could not be refreshed. Reload the record before another action.',
          );
          return true;
        }
        const message = failure instanceof Error ? failure.message : 'STAFF_SAVE_FAILED';
        if (/^\[(400|401|403|404|409|422|428)\]/.test(message)) pending.current = null;
        setError(message);
        return false;
      } finally {
        if (scope.isCurrent()) {
          lock.current = false;
          setBusy(false);
        }
      }
    },
  };
}
