import { useEffect, useRef, useState } from 'react';
import { Eye } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { errorMessage, type Preview } from './notificationModel';
export function NotificationPreview({
  id,
  variables,
  locale,
  ar,
  ready,
  onPreview,
}: {
  id: string;
  variables: Record<string, string>;
  locale: string;
  ar: boolean;
  ready: boolean;
  onPreview?: (signature: string) => void;
}) {
  const [data, setData] = useState<Preview | null>(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState<unknown>(null),
    generation = useRef(0);
  const signature = JSON.stringify({ id, variables, locale });
  const current = useRef(signature);
  current.current = signature;
  useEffect(() => {
    generation.current++;
    setData(null);
    setError(null);
    setBusy(false);
    return () => {
      generation.current++;
    };
  }, [signature]);
  const preview = async () => {
    const token = ++generation.current,
      snapshot = signature;
    setBusy(true);
    setError(null);
    try {
      const value = await adminApiClient.request<Preview>(
        '/notifications/templates/' + encodeURIComponent(id) + '/preview',
        { method: 'POST', body: JSON.stringify({ variables, locale }) },
      );
      if (token === generation.current && snapshot === current.current) {
        setData(value);
        onPreview?.(snapshot);
      }
    } catch (reason) {
      if (token === generation.current) setError(reason);
    } finally {
      if (token === generation.current) setBusy(false);
    }
  };
  return (
    <div className="notification-preview">
      <button type="button" disabled={busy || !ready} onClick={() => void preview()}>
        <Eye />
        {ar ? 'معاينة النص' : 'Preview text'}
      </button>
      {busy && <p role="status">{ar ? 'جارٍ إعداد المعاينة…' : 'Preparing preview…'}</p>}
      {error != null && <p role="alert">{errorMessage(error, ar)}</p>}
      {data && (
        <div aria-live="polite">
          <strong>{data.title}</strong>
          <p className="notification-message">{data.message}</p>
          <small>
            {data.locale}
            {data.fallback ? ' · ' + (ar ? 'استُخدمت لغة بديلة' : 'Fallback language') : ''} ·{' '}
            {ar ? 'معاينة فقط؛ لم يُنشأ طلب إرسال' : 'Preview only; no delivery intent created'}
          </small>
        </div>
      )}
    </div>
  );
}
