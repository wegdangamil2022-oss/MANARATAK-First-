import { useEffect, useRef, useState, type FormEvent } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
type Grant = {
  assetId: string;
  uploadGrant?: {
    uploadUrl: string;
    method: 'PUT' | 'POST';
    headers: Record<string, string>;
    expiresAt: string;
  };
};
export function AssetUploadWizard({ onUploaded }: { onUploaded: () => void }) {
  const { language } = useTranslation(),
    c = (ar: string, en: string) => (language === 'ar' ? ar : en);
  const [types, setTypes] = useState<string[]>([]),
    [ownerType, setOwnerType] = useState(''),
    [q, setQ] = useState(''),
    [owners, setOwners] = useState<Array<{ id: string; label: string }>>([]),
    [ownerId, setOwnerId] = useState(''),
    [file, setFile] = useState<File | null>(null),
    [classification, setClassification] = useState('INTERNAL'),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [phase, setPhase] = useState<'CHOOSE' | 'ALLOCATED' | 'UPLOADED' | 'COMPLETE'>('CHOOSE'),
    [pending, setPending] = useState<Grant | null>(null),
    [configured, setConfigured] = useState(false);
  const allocation = useRef<{ id: string; key: string } | null>(null),
    finalizeKey = useRef<string | null>(null),
    transfer = useRef<AbortController | null>(null);
  useEffect(() => {
    let live = true;
    void Promise.all([
      adminApiClient.request<{ items: string[] }>('/admin/assets/owner-types'),
      adminApiClient.request<{ upload: boolean }>('/admin/assets/capabilities'),
    ])
      .then(([a, b]) => {
        if (live) {
          setTypes(a.items);
          setConfigured(b.upload);
        }
      })
      .catch(() => {
        if (live)
          setMessage(
            c(
              'تعذر التحقق من صلاحيات الرفع والمزود.',
              'Cannot verify upload authorization and provider.',
            ),
          );
      });
    return () => {
      live = false;
      transfer.current?.abort();
    };
  }, [language]);
  const search = async () => {
    setBusy(true);
    setMessage('');
    try {
      const r = await adminApiClient.request<{ items: typeof owners }>(
        '/admin/assets/owners?' + new URLSearchParams({ type: ownerType, q }),
      );
      setOwners(r.items);
    } catch {
      setMessage(
        c(
          'تعذر جلب محتوى القسم وفق صلاحيتك.',
          'Cannot load owner content within your permissions.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const finalize = async () => {
    if (!pending) return;
    setBusy(true);
    setMessage('');
    try {
      finalizeKey.current ??= createAdminIdempotencyKey();
      await adminApiClient.request(
        '/admin/assets/' + encodeURIComponent(pending.assetId) + '/finalize-upload',
        { method: 'POST', body: '{}', idempotencyKey: finalizeKey.current },
      );
      setPhase('COMPLETE');
      setMessage(
        c(
          'تم تثبيت الرفع. يبقى الملف بالحجر حتى اكتمال فحص الأمان والتنقية؛ لم يُنشر تلقائيًا.',
          'Upload finalized. The file remains quarantined until security processing; it was not published.',
        ),
      );
      onUploaded();
    } catch {
      setMessage(
        c(
          'لم يتأكد تثبيت الرفع. يمكنك إعادة التحقق بنفس الملف؛ لن يُنشأ ملف آخر.',
          'Finalization is unconfirmed. Retry verification for the same asset without creating another.',
        ),
      );
    } finally {
      setBusy(false);
    }
  };
  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!file || !ownerId || busy) return;
    setBusy(true);
    setMessage('');
    let grant = pending;
    try {
      if (!grant) {
        allocation.current ??= { id: crypto.randomUUID(), key: createAdminIdempotencyKey() };
        const { id, key } = allocation.current;
        grant = await adminApiClient.request<Grant>('/admin/assets/upload-locator', {
          method: 'POST',
          idempotencyKey: key,
          body: JSON.stringify({
            assetId: id,
            assetReference: 'EAP-' + id,
            ownerId,
            ownerType,
            originalFilename: file.name,
            fileExtension: file.name.split('.').at(-1)?.toLowerCase() ?? '',
            mimeType: file.type || 'application/octet-stream',
            byteSize: file.size,
            classification,
          }),
        });
        setPending(grant);
        setPhase('ALLOCATED');
      }
      if (!grant.uploadGrant) throw Error('UPLOAD_GRANT_UNAVAILABLE');
      const target = new URL(grant.uploadGrant.uploadUrl);
      if (
        target.username ||
        target.password ||
        (target.protocol !== 'https:' &&
          !(
            import.meta.env.DEV &&
            target.protocol === 'http:' &&
            ['127.0.0.1', 'localhost'].includes(target.hostname)
          ))
      )
        throw Error('UPLOAD_URL_INVALID');
      if (
        !['PUT', 'POST'].includes(grant.uploadGrant.method) ||
        !Number.isFinite(Date.parse(grant.uploadGrant.expiresAt)) ||
        Date.parse(grant.uploadGrant.expiresAt) <= Date.now()
      )
        throw Error('UPLOAD_GRANT_EXPIRED');
      transfer.current = new AbortController();
      const response = await fetch(target, {
        method: grant.uploadGrant.method,
        headers: grant.uploadGrant.headers,
        body: file,
        credentials: 'omit',
        redirect: 'error',
        signal: transfer.current.signal,
      });
      if (!response.ok) throw Error('UPLOAD_FAILED');
      setPhase('UPLOADED');
      setMessage(
        c(
          'اكتمل نقل الملف. اضغط تثبيت الرفع للتحقق من المحتوى المخزن.',
          'Transfer completed. Finalize to verify the stored object.',
        ),
      );
    } catch (e) {
      setMessage(
        e instanceof Error && e.message === 'UPLOAD_GRANT_EXPIRED'
          ? c(
              'انتهت صلاحية إذن النقل. احتُفظ بمعرّف الملف؛ لا يمكن ادعاء نجاح الرفع. راجع حالة الملف قبل محاولة جديدة.',
              'Upload grant expired. The asset handle is preserved; review its state before a new attempt.',
            )
          : c(
              'تعذر تأكيد نقل الملف. احتُفظ بمحاولة الرفع؛ أعد المحاولة بنفس الملف أو افحص حالته في قائمة المعالجة.',
              'Transfer is unconfirmed. The upload attempt is preserved; retry the same file or inspect the processing queue.',
            ),
      );
    } finally {
      transfer.current = null;
      setBusy(false);
    }
  };
  const locked = Boolean(allocation.current);
  return (
    <form className="operations-panel" onSubmit={(event) => void submit(event)}>
      <h2>{c('رفع ملف لقسم محدد', 'Upload for a specific owner')}</h2>
      <p>
        {c(
          'اختر القسم والمحتوى أولًا. ملفات الطلاب ومستنداتهم تُرفع من مساراتها الخاصة.',
          'Choose owner and content first. Student private documents use their own workflows.',
        )}
      </p>
      {!configured && (
        <p role="status" className="operations-notice">
          {c(
            'الرفع المباشر غير متاح دون مزود تخزين مهيأ. لم يُفعّل أي مزود جديد.',
            'Direct upload needs a configured storage provider. No new provider was enabled.',
          )}
        </p>
      )}
      <fieldset disabled={busy || locked || !configured} className="operations-filters">
        <label>
          {c('القسم المالك', 'Owner section')}
          <select
            required
            value={ownerType}
            onChange={(e) => {
              setOwnerType(e.target.value);
              setOwnerId('');
              setOwners([]);
            }}
          >
            <option value="">{c('اختر القسم', 'Choose owner')}</option>
            {types.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c('ابحث في محتوى القسم', 'Search owner content')}
          <input maxLength={120} value={q} onChange={(e) => setQ(e.target.value)} />
        </label>
        <button
          type="button"
          className="operations-button"
          disabled={!ownerType}
          onClick={() => void search()}
        >
          {c('جلب المحتوى', 'Find content')}
        </button>
        <label>
          {c('المحتوى المرتبط', 'Related content')}
          <select required value={ownerId} onChange={(e) => setOwnerId(e.target.value)}>
            <option value="">{c('اختر نتيجة البحث', 'Choose search result')}</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          {c('الملف', 'File')}
          <input required type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
        <label>
          {c('نطاق الاستخدام', 'Usage scope')}
          <select value={classification} onChange={(e) => setClassification(e.target.value)}>
            <option value="INTERNAL">{c('داخلي', 'Internal')}</option>
            <option value="PUBLIC">
              {c('عام — يتطلب حقوق النشر قبل الإتاحة', 'Public — rights required before delivery')}
            </option>
          </select>
        </label>
      </fieldset>
      <div className="operations-actions">
        {phase !== 'UPLOADED' && phase !== 'COMPLETE' && (
          <button
            className="operations-button primary"
            disabled={busy || !configured || !file || !ownerId}
          >
            {c(
              locked ? 'إعادة النقل لنفس الملف' : 'بدء الرفع',
              locked ? 'Retry transfer for same asset' : 'Start upload',
            )}
          </button>
        )}
        {phase === 'UPLOADED' && (
          <button
            type="button"
            className="operations-button primary"
            disabled={busy}
            onClick={() => void finalize()}
          >
            {c('تثبيت الرفع', 'Finalize upload')}
          </button>
        )}
        {busy && transfer.current && (
          <button
            type="button"
            className="operations-button"
            onClick={() => transfer.current?.abort()}
          >
            {c('إيقاف النقل — يبقى السجل للمراجعة', 'Stop transfer — retain asset for review')}
          </button>
        )}
      </div>
      {phase === 'COMPLETE' && (
        <button
          type="button"
          className="operations-button"
          onClick={() => {
            allocation.current = null;
            finalizeKey.current = null;
            setPending(null);
            setPhase('CHOOSE');
            setFile(null);
            setMessage('');
          }}
        >
          {c('رفع ملف آخر', 'Upload another file')}
        </button>
      )}
      {pending && (
        <p>
          {c('معرّف المحاولة', 'Attempt handle')}: <code>{pending.assetId}</code>
        </p>
      )}
      {message && (
        <p role="status" className="operations-notice">
          {message}
        </p>
      )}
    </form>
  );
}
