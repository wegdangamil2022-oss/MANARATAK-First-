import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
interface Queue {
  importChanges: Array<{ id: string; importRecordId: string; changeState: string }>;
  total: number;
  nextCursor: string | null;
  backlog: {
    retry: number;
    deadLetter: number;
    checkpoint: unknown;
    deadLetterItems?: Array<{ id: string; courseId: string; attempts: number }>;
  };
}
export function CourseProviderBacklogPanel({ providerId }: { providerId: string }) {
  const { t } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const allowed = hasPermission('admin:imports:manage');
  const [queue, setQueue] = useState<Queue | null>(null);
  const [cursor, setCursor] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [reason, setReason] = useState('');
  const base = `/admin/imports/courses/providers/${providerId}`;
  const load = async () =>
    setQueue(
      await adminApiClient.request<Queue>(
        `${base}/changed-links${cursor ? '?cursor=' + encodeURIComponent(cursor) : ''}`,
      ),
    );
  useEffect(() => {
    setCursor(undefined);
    setQueue(null);
  }, [providerId]);
  useEffect(() => {
    if (!allowed) return;
    let active = true;
    void adminApiClient
      .request<Queue>(
        `${base}/changed-links${cursor ? '?cursor=' + encodeURIComponent(cursor) : ''}`,
      )
      .then((value) => {
        if (active) setQueue(value);
      })
      .catch((cause) => {
        if (active) setError(String(cause));
      });
    return () => {
      active = false;
    };
  }, [providerId, cursor, allowed]);
  const run = async (workId?: string) => {
    if (busy || !allowed) return;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(
        workId ? `${base}/link-health/dead-letter/${workId}/retry` : `${base}/link-health/jobs`,
        {
          method: 'POST',
          body: JSON.stringify(workId ? { reason } : { limit: 10, maxAttempts: 3 }),
        },
      );
      await load();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setBusy(false);
    }
  };
  if (!allowed) return null;
  return (
    <section className="space-y-2 rounded border p-4">
      <h2>{t('course13_backlog_title')}</h2>
      <p>{t('course13_backlog_policy')}</p>
      {error && <p role="alert">{error}</p>}
      {queue && (
        <>
          <p>
            {t('course13_backlog_total')}: {queue.total} · {t('course13_backlog_retry')}:{' '}
            {queue.backlog.retry} · {t('course13_backlog_dead')}: {queue.backlog.deadLetter}
          </p>
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(queue.backlog.checkpoint, null, 2)}
          </pre>
          <ul>
            {queue.importChanges.map((row) => (
              <li key={row.id}>
                {row.importRecordId} · {row.changeState}
              </li>
            ))}
          </ul>
          <button disabled={!cursor || busy} onClick={() => setCursor(undefined)}>
            {t('course13_backlog_first')}
          </button>
          <button
            disabled={!queue.nextCursor || busy}
            onClick={() => setCursor(queue.nextCursor ?? undefined)}
          >
            {t('course13_backlog_next')}
          </button>
          <button disabled={busy} onClick={() => void run()}>
            {t('course13_backlog_run')}
          </button>
          <label>
            {t('course13_backlog_reason')}
            <input
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              maxLength={2000}
            />
          </label>
          {queue.backlog.deadLetterItems?.map((row) => (
            <p key={row.id}>
              {row.courseId} · {row.attempts}{' '}
              <button disabled={busy || reason.trim().length < 3} onClick={() => void run(row.id)}>
                {t('course13_backlog_requeue')}
              </button>
            </p>
          ))}
        </>
      )}
    </section>
  );
}
