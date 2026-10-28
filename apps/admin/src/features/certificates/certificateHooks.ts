import { useEffect, useRef, useState } from 'react';
import {
  adminApiClient,
  createAdminIdempotencyKey,
  type AdminRequestOptions,
} from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
export function useCertificateCopy() {
  const { language, dir } = useTranslation();
  return {
    ar: language === 'ar',
    language,
    dir,
    c: (ar: string, en: string) => (language === 'ar' ? ar : en),
  };
}
export function useCertificateDirty(dirty: boolean, onChange?: (dirty: boolean) => void) {
  useEffect(() => {
    onChange?.(dirty);
    return () => onChange?.(false);
  }, [dirty, onChange]);
}
export function useCertificateRead<T>(endpoint: string | null, revision = 0) {
  const key = `${endpoint ?? ''}:${revision}`;
  const [state, setState] = useState<{
    data: T | null;
    error: string;
    loading: boolean;
    key: string;
  }>({
    data: null,
    error: '',
    loading: Boolean(endpoint),
    key,
  });
  useEffect(() => {
    let active = true;
    setState({ data: null, error: '', loading: Boolean(endpoint), key });
    if (endpoint)
      void adminApiClient
        .request<T>(endpoint, { cache: 'no-store' })
        .then((data) => {
          if (active) setState({ data, error: '', loading: false, key });
        })
        .catch(() => {
          if (active) setState({ data: null, error: 'READ_FAILED', loading: false, key });
        });
    return () => {
      active = false;
    };
  }, [endpoint, revision, key]);
  return state.key === key ? state : { data: null, error: '', loading: Boolean(endpoint) };
}
export function useCertificateCommand() {
  const frozen = useRef<{ endpoint: string; signature: string; key: string } | null>(null),
    lock = useRef(false),
    alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [uncertain, setUncertain] = useState(false);
  const { c } = useCertificateCopy();
  async function execute<T>(
    endpoint: string,
    body: unknown,
    options: AdminRequestOptions = {},
  ): Promise<T | undefined> {
    if (lock.current || !alive.current) return;
    const signature = JSON.stringify([body, options]);
    if (
      frozen.current &&
      (frozen.current.endpoint !== endpoint || frozen.current.signature !== signature)
    ) {
      setError(
        c(
          'نتيجة الطلب السابق غير مؤكدة؛ تحقق من السجل قبل تغيير العملية.',
          'Reconcile the previous uncertain command before changing it.',
        ),
      );
      return;
    }
    frozen.current ??= { endpoint, signature, key: createAdminIdempotencyKey() };
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await adminApiClient.request<T>(endpoint, {
        method: 'POST',
        ...options,
        body: JSON.stringify(body),
        idempotencyKey: frozen.current.key,
      });
      if (!alive.current) return undefined;
      frozen.current = null;
      setUncertain(false);
      return result;
    } catch (e) {
      if (!alive.current) return undefined;
      const message = e instanceof Error ? e.message : '';
      const status = Number(message.match(/^\[(\d{3})\]/)?.[1]);
      const unknown = !status || status >= 500 || [408, 425, 429].includes(status);
      setUncertain(unknown);
      if (!unknown) frozen.current = null;
      setError(
        status === 409 || status === 428
          ? c(
              'تغيّرت الحالة أو النسخة. حدّث البيانات وراجعها قبل إعادة المحاولة.',
              'The state or version changed. Refresh and review before retrying.',
            )
          : status === 403
            ? c(
                'الإجراء غير مسموح بالصلاحيات أو المصادقة الحالية.',
                'The action is denied by current permissions or authentication.',
              )
            : unknown
              ? c(
                  'لم تتأكد نتيجة الطلب. تحقق من السجل؛ تبقى هوية المحاولة محفوظة ما دمت في الصفحة.',
                  'The result is uncertain. Check the record; the retry identity is retained while this page is open.',
                )
              : c(
                  'تعذر تنفيذ العملية. راجع شروط الحالة والحقول المطلوبة.',
                  'The operation was rejected. Check the current state and required fields.',
                ),
      );
      return undefined;
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }
  return { execute, busy, error, uncertain };
}
export function useDebouncedCertificateSearch(value: string) {
  const [result, setResult] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setResult(value), 250);
    return () => clearTimeout(timer);
  }, [value]);
  return result;
}
