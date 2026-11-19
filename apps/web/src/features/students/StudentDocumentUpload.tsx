import { useEffect, useRef, useState } from 'react';
import { UploadCloud, FileUp, RefreshCw } from 'lucide-react';
import { ApiClient as LiveApiClient, type StudentOwnedAssetDto } from '../../api/client';
import { useTranslation } from '../../i18n/I18nProvider';
import { PreviewStudentApiClient } from './studentWorkspacePreviewApi';
const ApiClient = import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype' ? PreviewStudentApiClient : LiveApiClient;
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
    [previewNotice, setPreviewNotice] = useState(''),
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
      if (import.meta.env.VITE_PUBLIC_TEMPLATE_DATA_MODE === 'prototype') {
        // Only the filename/type are kept in volatile demo memory. Never send
        // or read the document bytes and never create an actual upload grant.
        const simulated = await ApiClient.requestMyDocumentUpload({
          originalFilename: file.name,
          mimeType: file.type,
          byteSize: file.size,
          consent: true,
        });
        if (request !== generation.current) return;
        onUploaded({
          id: simulated.assetId,
          reference: simulated.assetId,
          lifecycleState: 'ACTIVE',
          metadata: { originalFilename: file.name, mimeType: file.type },
        });
        setFile(null);
        setConsent(false);
        setPreviewNotice(en
          ? 'Preview only: the document name was added to the mock form; no file was uploaded or saved.'
          : 'معاينة فقط: أُضيف اسم المستند للنموذج التجريبي، ولم يُرفع أي ملف أو تُحفظ بياناته.');
        return;
      }
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
    <section className="relative w-full max-w-full min-w-0 overflow-hidden rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-surface)] p-3 space-y-2.5 font-['Cairo',sans-serif] shadow-2xs">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--mn-border)] dark:border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-[#D6A43B]/40 bg-[#142B5F]">
            <UploadCloud className="w-3 h-3 text-[#F2CD78] shrink-0" />
          </span>
          <h5 className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] leading-tight">
            {en ? 'Upload a private document' : 'رفع مستند خاص جديد'}
          </h5>
        </div>
        <span className="rounded-md border border-[#0E7C86]/25 bg-[#0E7C86]/10 px-2 py-0.5 text-[10px] font-bold text-[#0E7C86] dark:text-[#55CBC5]">
          PDF · PNG · JPEG (10MB)
        </span>
      </div>

      <p className="text-[11.5px] leading-[1.75] text-[#475569] dark:text-[#CBD5E1]">
        {en
          ? 'PDF, PNG or JPEG, up to 10 MB. Retained for up to 180 days. A file is selectable only after security checks complete.'
          : 'ارفع وثيقتك بصيغة PDF أو PNG أو JPEG (بحد أقصى 10 ميغابايت). تُحفظ بأمان في حسابك لغاية 180 يوماً وتُتاح للربط فور اكتمال الفحص الأمني.'}
      </p>

      {/* Modern responsive file trigger area */}
      <label className="flex flex-col items-center justify-center p-3.5 rounded-xl border-2 border-dashed border-[#0E7C86]/35 hover:border-[#D6A43B] bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] cursor-pointer transition w-full max-w-full">
        <span className="mb-1.5 grid h-9 w-9 place-items-center rounded-full border border-[#0E7C86]/25 bg-[#0E7C86]/10 text-[#0E7C86] dark:text-[#55CBC5]">
          <FileUp className="w-4 h-4 shrink-0" />
        </span>
        <span className="text-[12px] font-bold text-[#1E293B] dark:text-[#F8FAFC] text-center break-all px-2">
          {file ? file.name : (en ? 'Choose a document from your device' : 'اضغط هنا لاختيار مستند من جهازك')}
        </span>
        <span className="text-[11px] font-medium text-[#64748B] dark:text-[#94A3B8] mt-0.5">
          {file ? `${(file.size / (1024 * 1024)).toFixed(2)} MB` : (en ? 'PDF, PNG or JPEG' : 'يدعم ملفات PDF أو الصور الواضحة PNG / JPEG')}
        </span>
        <input
          type="file"
          accept="application/pdf,image/png,image/jpeg"
          disabled={busy || Boolean(pending)}
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="hidden"
        />
      </label>

      {/* Consent Checkbox */}
      <label className="flex items-start gap-2.5 rounded-xl border border-[var(--mn-border)] dark:border-white/10 bg-[var(--mn-page)] dark:bg-[var(--mn-surface-elevated)] p-2.5 cursor-pointer text-[11.5px] font-medium text-[#334155] dark:text-[#E2E8F0] leading-[1.7] select-none">
        <input
          type="checkbox"
          checked={consent}
          disabled={busy}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-1 w-4 h-4 rounded border-gray-300 accent-[#142B5F] focus:ring-[#D6A43B] shrink-0 cursor-pointer"
        />
        <span>
          {en
            ? 'I consent to storing this private document for application preparation.'
            : 'أوافق على تخزين هذا المستند الخاص في مساحتي الآمنة لغرض تجهيز ملفات التقديم.'}
        </span>
      </label>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 flex-wrap pt-0.5">
        <button
          type="button"
          disabled={busy || !file || !consent || Boolean(pending)}
          onClick={() => void upload()}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-10 px-4 rounded-xl bg-[#142B5F] hover:bg-[#1a3675] text-white text-[12px] font-bold transition disabled:opacity-50 cursor-pointer shadow-xs border border-[#D6A43B]/35"
        >
          <UploadCloud className="w-4 h-4 text-[#F2CD78]" />
          <span>{en ? 'Upload and check' : 'رفع وفحص المستند الآن'}</span>
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
            className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 min-h-10 px-3.5 rounded-xl border border-amber-300 bg-amber-50 text-amber-900 text-[12px] font-bold transition disabled:opacity-50 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>{en ? 'Retry file checks' : 'إعادة فحص الملف'}</span>
          </button>
        )}
      </div>

      {busy && (
        <div className="flex items-center gap-2 text-[12px] text-[#0E7C86] font-bold pt-1" role="status">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{en ? 'Uploading or checking the file…' : 'جارٍ رفع الملف وإجراء الفحص الأمني…'}</span>
        </div>
      )}
      {previewNotice && (
        <div className="p-2.5 rounded-xl bg-[#0E7C86]/10 border border-[#0E7C86]/25 text-[11.5px] font-medium text-[#0E7C86] dark:text-[#55CBC5]" role="status">
          {previewNotice}
        </div>
      )}
      {error && (
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[12px] font-bold text-rose-700 dark:bg-rose-950/20 dark:text-rose-300" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
