import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
type Review = {
  id: string;
  requirementName: string;
  expectedVersion: number;
  mimeType: string;
  retentionUntil: string;
  documentExpiresAt: string | null;
  consentUntil: string;
  delivery: { url: string; headers: Record<string, string>; expiresAt: string };
};
type Page = {
  items: Array<{ id: string; requirementName: string; consentUntil: string }>;
  hasMore: boolean;
  nextCursor: string | null;
};
export function StudentDocumentReviewPanel() {
  const { language } = useTranslation(),
    en = language === 'en',
    { hasPermission } = useAdminAuthorization(),
    allowed = hasPermission('admin:students:documents:review');
  const [page, setPage] = useState<Page | null>(null),
    [after, setAfter] = useState<string | undefined>(),
    [refresh, setRefresh] = useState(0),
    [review, setReview] = useState<Review | null>(null),
    [preview, setPreview] = useState(''),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reason, setReason] = useState(''),
    [reference, setReference] = useState(''),
    [until, setUntil] = useState(''),
    [verdict, setVerdict] = useState<'VERIFIED' | 'REJECTED'>('VERIFIED'),
    generation = useRef(0),
    blobUrl = useRef('');
  const clear = () => {
    if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
    blobUrl.current = '';
    setPreview('');
    setReview(null);
    setReason('');
    setReference('');
    setUntil('');
  };
  useEffect(() => {
    const request = ++generation.current,
      controller = new AbortController();
    clear();
    setPage(null);
    setError('');
    if (!allowed) return;
    setBusy(true);
    void adminApiClient
      .request<{ data: Page }>(
        `/admin/student-document-reviews${after ? `?after=${encodeURIComponent(after)}` : ''}`,
        { signal: controller.signal, cache: 'no-store' },
      )
      .then(({ data }) => {
        if (request !== generation.current) return;
        if (
          !Array.isArray(data?.items) ||
          data.items.length > 20 ||
          data.items.some(
            (item) =>
              typeof item.id !== 'string' || !item.id || typeof item.requirementName !== 'string',
          ) ||
          (data.hasMore && !data.nextCursor)
        )
          throw new Error('INVALID_REVIEW_PAGE');
        setPage(data);
      })
      .catch(() => {
        if (request === generation.current && !controller.signal.aborted)
          setError(en ? 'Could not load consented reviews.' : 'تعذر تحميل طلبات المراجعة.');
      })
      .finally(() => {
        if (request === generation.current) setBusy(false);
      });
    return () => {
      ++generation.current;
      controller.abort();
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = '';
    };
  }, [allowed, after, refresh, en]);
  const open = async (id: string) => {
    const request = ++generation.current;
    clear();
    setBusy(true);
    setError('');
    try {
      const { data } = await adminApiClient.request<{ data: Review }>(
        `/admin/student-document-reviews/${encodeURIComponent(id)}/open`,
        { method: 'POST', body: JSON.stringify({}), cache: 'no-store' },
      );
      if (request !== generation.current) return;
      if (
        data.id !== id ||
        !Number.isSafeInteger(data.expectedVersion) ||
        !['application/pdf', 'image/png', 'image/jpeg'].includes(data.mimeType) ||
        !data.delivery ||
        !Number.isFinite(Date.parse(data.delivery.expiresAt))||
        Date.parse(data.delivery.expiresAt) <= Date.now()
      )
        throw new Error('REVIEW_RESPONSE_INVALID');
      const target = new URL(data.delivery.url);
      if (
        target.username ||
        target.password ||
        (target.protocol !== 'https:' &&
          !(
            import.meta.env.DEV &&
            target.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(target.hostname)
          ))
      )
        throw new Error('PRIVATE_DELIVERY_INVALID');
      const response = await fetch(target, {
        headers: data.delivery.headers,
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
      });
      if (!response.ok) throw new Error('PRIVATE_DELIVERY_UNAVAILABLE');
      const blob = await response.blob();
      if (request !== generation.current) return;
      if (blob.size < 1 || blob.size > 10 * 1024 * 1024)
        throw new Error('PRIVATE_DOCUMENT_INVALID');
      blobUrl.current = URL.createObjectURL(new Blob([blob], { type: data.mimeType }));
      setPreview(blobUrl.current);
      setReview(data);
      const deadline = Math.min(
        Date.parse(data.retentionUntil),
        data.documentExpiresAt ? Date.parse(data.documentExpiresAt) : Infinity,
        Date.now() + 30 * 86400000,
      );
      setUntil(new Date(deadline).toISOString().slice(0, 16));
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : 'REVIEW_UNAVAILABLE');
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  useEffect(() => {
    if (!review || !preview) return;
    const delay = Math.max(
      0,
      Math.min(Date.parse(review.delivery.expiresAt), Date.parse(review.consentUntil)) - Date.now(),
    );
    const timer = window.setTimeout(() => {
      if (blobUrl.current) URL.revokeObjectURL(blobUrl.current);
      blobUrl.current = '';
      setPreview('');
    }, delay);
    return () => window.clearTimeout(timer);
  }, [review, preview]);
  const submit = async () => {
    if (!review || !until || busy) return;
    const request = generation.current;
    setBusy(true);
    setError('');
    try {
      await adminApiClient.request(
        `/admin/student-document-reviews/${encodeURIComponent(review.id)}/attest`,
        {
          method: 'POST',
          body: JSON.stringify({
            expectedVersion: review.expectedVersion,
            verdict,
            evidenceReference: reference,
            reason,
            validUntil: new Date(until).toISOString(),
          }),
          cache: 'no-store',
        },
      );
      if (request === generation.current) {
        clear();
        setRefresh((v) => v + 1);
      }
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : 'ATTESTATION_FAILED');
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  if (!allowed)
    return (
      <p>{en ? 'Document review permission is required.' : 'تلزم صلاحية مراجعة المستندات.'}</p>
    );
  return (
    <main className="p-5 space-y-4">
      <h1>
        {en ? 'Consented academic document review' : 'مراجعة المستندات الأكاديمية بموافقة الطالب'}
      </h1>
      <p>
        {en
          ? 'Only explicitly requested private documents appear. This internal human review does not submit an application or replace an issuing institution’s certification. Document access is audited; download grants expire after 60 seconds.'
          : 'لا تظهر إلا المستندات الخاصة التي طلب الطالب مراجعتها صراحة. هذه مراجعة بشرية داخلية، لا ترسل طلبًا ولا تحل محل تصديق جهة الإصدار. يُسجل الاطلاع، وتنتهي صلاحية رابط الوصول بعد 60 ثانية.'}
      </p>
      {error && <p role="alert">{error}</p>}
      {busy && <p role="status">{en ? 'Loading…' : 'جارٍ المعالجة…'}</p>}
      <button disabled={busy} type="button" onClick={() => setRefresh((v) => v + 1)}>
        {en ? 'Refresh' : 'تحديث'}
      </button>
      <ul>
        {page?.items.map((item) => (
          <li key={item.id}>
            {item.requirementName}{' '}
            <button type="button" disabled={busy} onClick={() => void open(item.id)}>
              {en ? 'Open consented document' : 'فتح المستند بموافقة صاحبه'}
            </button>
          </li>
        ))}
      </ul>
      <button type="button" disabled={busy || !after} onClick={() => setAfter(undefined)}>
        {en ? 'First page' : 'الصفحة الأولى'}
      </button>
      <button
        type="button"
        disabled={busy || !page?.hasMore || !page.nextCursor}
        onClick={() => setAfter(page!.nextCursor!)}
      >
        {en ? 'Next page' : 'الصفحة التالية'}
      </button>
      {review && (
        <section className="border rounded-xl p-4 space-y-3">
          <h2>{review.requirementName}</h2>
          {preview &&
            (review.mimeType === 'application/pdf' ? (
              <iframe
                title={en ? 'Private document' : 'مستند خاص'}
                sandbox=""
                src={preview}
                className="w-full h-96"
              />
            ) : (
              <img
                src={preview}
                alt={en ? 'Private document for review' : 'مستند خاص للمراجعة'}
                className="max-h-96"
              />
            ))}
          <label>
            {en ? 'Decision' : 'القرار'}
            <select
              value={verdict}
              onChange={(e) => setVerdict(e.target.value as 'VERIFIED' | 'REJECTED')}
            >
              <option value="VERIFIED">
                {en ? 'Academically reviewed' : 'تمت المراجعة الأكاديمية'}
              </option>
              <option value="REJECTED">{en ? 'Rejected' : 'مرفوض'}</option>
            </select>
          </label>
          <label>
            {en
              ? 'Official review reference (no personal data)'
              : 'مرجع المراجعة الرسمي (دون بيانات شخصية)'}
            <input
              value={reference}
              maxLength={240}
              onChange={(e) => setReference(e.target.value)}
            />
          </label>
          <label>
            {en ? 'Reason' : 'السبب'}
            <textarea value={reason} maxLength={1000} onChange={(e) => setReason(e.target.value)} />
          </label>
          <label>
            {en ? 'Valid until' : 'صالحة حتى'}
            <input type="datetime-local" value={until} onChange={(e) => setUntil(e.target.value)} />
          </label>
          <button
            type="button"
            disabled={busy || reason.trim().length < 6 || reference.trim().length < 3 || !until}
            onClick={() => void submit()}
          >
            {en ? 'Record review decision' : 'تسجيل قرار المراجعة'}
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => {
              ++generation.current;
              clear();
            }}
          >
            {en ? 'Close and clear private document' : 'إغلاق ومسح المستند من العرض'}
          </button>
        </section>
      )}
    </main>
  );
}
