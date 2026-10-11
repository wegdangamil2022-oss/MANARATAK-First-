import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
interface Revision {
  id: string;
  versionNumber: number;
  reason: string;
  capturedAt: string;
  capturedBy: string;
}
interface Page {
  data: Revision[];
  hasMore: boolean;
  nextBeforeVersion: number | null;
}
export function CmsRevisionHistory({
  contentId,
  locale,
  version,
  disabled,
  onRestore,
}: {
  contentId: string;
  locale: 'ar' | 'en';
  version?: number;
  disabled: boolean;
  onRestore: () => Promise<void>;
}) {
  const { language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const ar = language === 'ar';
  const [page, setPage] = useState<Page | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sequence = useRef(0);
  const invalidateRequests = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    sequence.current++;
    setPage(null);
    setError(null);
    setBusy(false);
    return invalidateRequests;
  }, [contentId, locale, version, invalidateRequests]);
  const load = async (more = false) => {
    const current = ++sequence.current;
    setBusy(true);
    setError(null);
    try {
      const cursor =
        more && page?.nextBeforeVersion ? `?beforeVersion=${page.nextBeforeVersion}` : '';
      const result = await adminApiClient.request<Page>(
        `/admin/cms/content/${contentId}/revisions/${locale}${cursor}`,
      );
      if (current === sequence.current)
        setPage({ ...result, data: more ? [...(page?.data ?? []), ...result.data] : result.data });
    } catch {
      if (current === sequence.current)
        setError(ar ? 'تعذر تحميل سجل النسخ. أعد المحاولة.' : 'Could not load revisions. Retry.');
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  };
  const restore = async (item: Revision) => {
    if (disabled || busy || !version || !hasPermission('admin:cms:author')) return;
    if (
      !window.confirm(
        ar
          ? 'استعادة هذه النسخة كمسودة تحتاج مراجعة جديدة؟'
          : 'Restore this revision as a draft requiring new review?',
      )
    )
      return;
    const current = ++sequence.current;
    setBusy(true);
    setError(null);
    try {
      await adminApiClient.request(
        `/admin/cms/content/${contentId}/revisions/${locale}/${item.id}/restore`,
        {
          method: 'POST',
          body: JSON.stringify({ expectedVersion: version }),
        },
      );
      if (current === sequence.current) await onRestore();
    } catch {
      if (current === sequence.current)
        setError(
          ar
            ? 'تعذرت الاستعادة. حدّث المحتوى وتحقق من التعارض أو صلاحية المرفقات.'
            : 'Restore failed. Refresh content and check conflicts or attachment availability.',
        );
    } finally {
      if (current === sequence.current) setBusy(false);
    }
  };
  return (
    <section aria-label={ar ? 'سجل نسخ اللغة المحددة' : 'Selected language revision history'}>
      <button type="button" disabled={busy} onClick={() => void load()}>
        {ar ? 'تحميل سجل النسخ / تحديث' : 'Load / refresh revision history'}
      </button>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{ar ? 'جارٍ التحميل…' : 'Loading…'}</p>}
      {page && !page.data.length && (
        <p>{ar ? 'لا توجد نسخ محفوظة لهذه اللغة.' : 'No saved revisions for this language.'}</p>
      )}
      <ul>
        {page?.data.map((item) => (
          <li key={item.id} className="border-t py-2 text-xs">
            {item.versionNumber} · {item.reason} ·{' '}
            {new Date(item.capturedAt).toLocaleString(ar ? 'ar' : 'en')}
            {hasPermission('admin:cms:author') && (
              <button
                type="button"
                disabled={disabled || busy || !version}
                onClick={() => void restore(item)}
              >
                {ar ? 'استعادة كمسودة' : 'Restore as draft'}
              </button>
            )}
          </li>
        ))}
      </ul>
      {page?.hasMore && (
        <button type="button" disabled={busy} onClick={() => void load(true)}>
          {ar ? 'نسخ أقدم' : 'Older revisions'}
        </button>
      )}
    </section>
  );
}
