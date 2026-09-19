import { useEffect, useState } from 'react';
import { adminApiClient } from '../api/client';

interface AssetOption {
  id: string;
  reference: string;
  lifecycleState?: string;
  metadata?: { originalFilename?: string; mimeType?: string };
}
interface DeliveryGrant { url: string; headers?: Record<string, string>; expiresAt: string }

export function AssetPicker({
  value,
  onChange,
  mimeTypePrefix,
  label = 'Asset',
  purpose,
}: {
  value?: string;
  onChange: (id: string) => void;
  mimeTypePrefix?: string;
  label?: string;
  purpose: string;
}) {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);

  useEffect(() => {
    const p = new URLSearchParams({ lifecycleState: 'ACTIVE', limit: '100' });
    if (mimeTypePrefix) p.set('mimeTypePrefix', mimeTypePrefix);
    adminApiClient.request<{ items: AssetOption[] }>(`/admin/assets?${p}`)
      .then((r) => setAssets(r.items.filter((asset) => !asset.lifecycleState || asset.lifecycleState === 'ACTIVE')))
      .catch((e) => setError(e instanceof Error ? e.message : 'Asset picker unavailable'));
  }, [mimeTypePrefix]);

  async function select(id: string) {
    onChange(id);
    if (!id) return;
    try {
      await adminApiClient.request(`/admin/assets/${encodeURIComponent(id)}/selection-audit`, {
        method: 'POST', body: JSON.stringify({ purpose }),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل اختيار الأصل');
    }
  }

  async function preview() {
    if (!value) return;
    setPreviewing(true); setError(null);
    try {
      const grant = await adminApiClient.request<DeliveryGrant>(`/admin/assets/${encodeURIComponent(value)}/delivery-grant`, {
        method: 'POST', body: JSON.stringify({ expiresInSeconds: 300 }),
      });
      if (grant.headers && Object.keys(grant.headers).length > 0) {
        const response = await fetch(grant.url, { headers: grant.headers });
        if (!response.ok) throw new Error('ASSET_PREVIEW_DELIVERY_FAILED');
        const objectUrl = URL.createObjectURL(await response.blob());
        window.open(objectUrl, '_blank', 'noopener,noreferrer');
        window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);
      } else {
        window.open(grant.url, '_blank', 'noopener,noreferrer');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء معاينة آمنة');
    } finally { setPreviewing(false); }
  }

  return <div className="block text-sm">
    <label className="block"><span className="font-bold">{label}</span>
      <select value={value ?? ''} onChange={(e) => void select(e.target.value)} className="mt-1 w-full rounded-xl border p-2">
        <option value="">No asset</option>
        {assets.map((a) => <option key={a.id} value={a.id}>{a.metadata?.originalFilename ?? a.reference} · {a.metadata?.mimeType ?? ''}</option>)}
      </select>
    </label>
    {value ? <button type="button" disabled={previewing} onClick={() => void preview()} className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50">{previewing ? 'جاري إنشاء رابط آمن…' : 'معاينة مؤقتة آمنة'}</button> : null}
    {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
  </div>;
}
