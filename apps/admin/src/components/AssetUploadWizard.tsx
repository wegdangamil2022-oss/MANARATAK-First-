import { useState, type FormEvent } from 'react';
import { adminApiClient } from '../api/client';

type Grant = {
  assetId: string;
  uploadGrant?: { uploadUrl: string; method: 'PUT' | 'POST'; headers: Record<string, string>; expiresAt: string };
};
export function AssetUploadWizard({ onUploaded }: { onUploaded: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [ownerId, setOwnerId] = useState('');
  const [ownerType, setOwnerType] = useState('STUDENT');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [pendingAsset, setPendingAsset] = useState<string | null>(null);

  async function finalize(assetId: string) {
    await adminApiClient.request(`/admin/assets/${encodeURIComponent(assetId)}/finalize-upload`, {
      method: 'POST', body: JSON.stringify({}),
    });
    setPendingAsset(null);
    setMessage('تم تأكيد الرفع. لا يصبح الملف صالحًا للتسليم قبل فحصه وتنظيفه وتفعيله.');
    onUploaded();
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (busy || !file || !ownerId.trim()) return;
    setBusy(true); setMessage('');
    try {
      const assetId = globalThis.crypto.randomUUID();
      const extension = file.name.split('.').at(-1)?.toLowerCase() ?? '';
      const grant = await adminApiClient.request<Grant>('/admin/assets/upload-locator', {
        method: 'POST',
        body: JSON.stringify({
          assetId, assetReference: 'EAP-' + assetId,
          ownerId: ownerId.trim(), ownerType: ownerType.trim(),
          originalFilename: file.name, fileExtension: extension,
          mimeType: file.type || 'application/octet-stream', byteSize: file.size,
          classification: 'INTERNAL',
        }),
      });
      if (!grant.uploadGrant) throw new Error('خدمة إصدار رابط رفع آمن غير متاحة.');
      setPendingAsset(grant.assetId);
      const target = new URL(grant.uploadGrant.uploadUrl);
      if (target.username || target.password || (target.protocol !== 'https:' &&
          !(import.meta.env.DEV && target.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(target.hostname)))) {
        throw new Error('رابط الرفع غير آمن.');
      }
      if (!['PUT', 'POST'].includes(grant.uploadGrant.method) ||
          !Number.isFinite(Date.parse(grant.uploadGrant.expiresAt)) || Date.parse(grant.uploadGrant.expiresAt) <= Date.now()) throw new Error('انتهت صلاحية رابط الرفع.');
      const response = await fetch(target, {
        method: grant.uploadGrant.method, headers: grant.uploadGrant.headers,
        body: file, credentials: 'omit', redirect: 'error',
      });
      if (!response.ok) throw new Error('فشل إرسال بايتات الملف إلى التخزين.');
      await finalize(grant.assetId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'تعذر رفع الملف');
    } finally {
      setBusy(false);
    }
  }

  return <form onSubmit={(event) => void submit(event)}
    className="rounded-2xl border border-slate-200 bg-white p-5 text-sm">
    <h2 className="font-bold text-[#142B5F]">رفع ملف جديد إلى الحجر الأمني</h2>
    <p className="my-2 text-xs text-slate-600">الرفع لا يعني التفعيل؛ يلزم التحقق والفحص والتنظيف أولًا.</p>
    <div className="grid gap-3 md:grid-cols-3">
      <input aria-label="اختر الملف" type="file" required
        onChange={(event) => setFile(event.target.files?.[0] ?? null)} />
      <input aria-label="معرف المالك" required value={ownerId} placeholder="معرف المالك"
        onChange={(event) => setOwnerId(event.target.value)} className="rounded-lg border p-2" />
      <input aria-label="نوع المالك" required value={ownerType} placeholder="نوع المالك"
        onChange={(event) => setOwnerType(event.target.value)} className="rounded-lg border p-2" />
    </div>
    <button type="submit" disabled={busy || !file || !ownerId.trim()}
      className="mt-3 rounded-lg border px-4 py-2 disabled:opacity-50">
      {busy ? 'جارٍ الرفع والتحقق…' : 'رفع وتحقيق اكتمال الرفع'}
    </button>
    {pendingAsset && <button type="button" disabled={busy}
      onClick={() => { setBusy(true); void finalize(pendingAsset)
        .catch((error) => setMessage(error instanceof Error ? error.message : 'تعذر التحقق'))
        .finally(() => setBusy(false)); }}
      className="mr-2 rounded-lg border px-4 py-2">
      إعادة محاولة التحقق من الأصل {pendingAsset.slice(0, 8)}
    </button>}
    {message && <p role="status" className="mt-3 text-xs">{message}</p>}
  </form>;
}
