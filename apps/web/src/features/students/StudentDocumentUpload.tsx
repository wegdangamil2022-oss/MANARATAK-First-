import { useEffect, useRef, useState } from 'react';
import { ApiClient, type StudentOwnedAssetDto } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
export function StudentDocumentUpload({
  onUploaded,
}: {
  onUploaded: (asset: StudentOwnedAssetDto) => void;
}) {
  const { language } = useTranslation(),
    en = language === 'en';
  const [file, setFile] = useState<File | null>(null),
    [consent, setConsent] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState<{ id: string; filename: string; mime: string } | null>(null),
    generation = useRef(0);
  useEffect(
    () => () => {
      ++generation.current;
    },
    [],
  );
  const complete = async (
    item: { id: string; filename: string; mime: string },
    request: number,
  ) => {
    const result = await ApiClient.completeMyDocumentUpload(item.id);
    if (request !== generation.current) return;
    if (result.assetId !== item.id || result.lifecycleState !== 'ACTIVE')
      throw new Error('DOCUMENT_NOT_READY');
    setPending(null);
    setFile(null);
    setConsent(false);
    onUploaded({
      id: item.id,
      reference: item.id,
      lifecycleState: 'ACTIVE',
      metadata: { originalFilename: item.filename, mimeType: item.mime },
    });
  };
  const upload = async () => {
    if (!file || !consent || busy) return;
    const request = generation.current;
    setBusy(true);
    setError('');
    try {
      if (
        !['application/pdf', 'image/png', 'image/jpeg'].includes(file.type) ||
        file.size < 1 ||
        file.size > 10 * 1024 * 1024
      )
        throw new Error(
          en
            ? 'Choose a PDF, PNG or JPEG up to 10 MB.'
            : 'اختر PDF أو PNG أو JPEG بحجم لا يتجاوز 10 ميغابايت.',
        );
      const result = await ApiClient.requestMyDocumentUpload({
        originalFilename: file.name,
        mimeType: file.type,
        byteSize: file.size,
        consent: true,
      });
      if (request !== generation.current) return;
      const grant = result.uploadGrant;
      if (!grant) throw new Error('UPLOAD_PROVIDER_UNAVAILABLE');
      const target = new URL(grant.uploadUrl);
      if (
        target.username ||
        target.password ||
        (target.protocol !== 'https:' &&
          !(
            import.meta.env.DEV &&
            target.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(target.hostname)
          )) ||
        !['PUT', 'POST'].includes(grant.method) ||
        !Number.isFinite(Date.parse(grant.expiresAt)) ||
        Date.parse(grant.expiresAt) <= Date.now()
      )
        throw new Error('UPLOAD_GRANT_INVALID');
      const response = await fetch(target, {
        method: grant.method,
        headers: grant.headers,
        body: file,
        credentials: 'omit',
        redirect: 'error',
      });
      if (!response.ok) throw new Error('UPLOAD_FAILED');
      if (request !== generation.current) return;
      const item = { id: result.assetId, filename: file.name, mime: file.type };
      setPending(item);
      await complete(item, request);
    } catch (e) {
      if (request === generation.current)
        setError(e instanceof Error ? e.message : 'UPLOAD_FAILED');
    } finally {
      if (request === generation.current) setBusy(false);
    }
  };
  return (
    <section className="border rounded p-3 space-y-2">
      <h4>{en ? 'Upload a private document' : 'رفع مستند خاص'}</h4>
      <p>
        {en
          ? 'PDF, PNG or JPEG, up to 10 MB. Retained for up to 180 days. A file is selectable only after security checks complete; upload does not certify its academic content.'
          : 'PDF أو PNG أو JPEG حتى 10 ميغابايت. الاحتفاظ بحد أقصى 180 يومًا. لا يمكن اختيار الملف حتى اكتمال فحوص الأمان؛ الرفع لا يصدق محتواه أكاديميًا.'}
      </p>
      <input
        type="file"
        accept="application/pdf,image/png,image/jpeg"
        disabled={busy || Boolean(pending)}
        onChange={(e) => setFile(e.target.files?.[0] ?? null)}
      />
      <label>
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
        />
        {en
          ? 'I consent to storing this private document for application preparation.'
          : 'أوافق على تخزين هذا المستند الخاص لغرض تجهيز التقديم.'}
      </label>
      <button
        type="button"
        disabled={busy || !file || !consent || Boolean(pending)}
        onClick={() => void upload()}
      >
        {en ? 'Upload and check' : 'رفع وفحص'}
      </button>
      {pending && (
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            const request = generation.current;
            setBusy(true);
            setError('');
            void complete(pending, request)
              .catch((e) => {
                if (request === generation.current)
                  setError(e instanceof Error ? e.message : 'UPLOAD_INCOMPLETE');
              })
              .finally(() => {
                if (request === generation.current) setBusy(false);
              });
          }}
        >
          {en ? 'Retry file checks' : 'إعادة فحص الملف'}
        </button>
      )}
      {busy && (
        <p role="status">{en ? 'Uploading or checking the file…' : 'جارٍ رفع الملف أو فحصه…'}</p>
      )}
      {error && <p role="alert">{error}</p>}
    </section>
  );
}
