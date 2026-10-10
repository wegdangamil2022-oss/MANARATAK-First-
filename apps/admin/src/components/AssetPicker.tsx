import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';

interface AssetOption {
  id: string;
  reference: string;
  lifecycleState?: string;
  metadata?: { originalFilename?: string; mimeType?: string; byteSize?: number };
}
interface AssetPage {
  items: AssetOption[];
  nextCursor: string | null;
  hasMore: boolean;
}
interface DeliveryGrant { url: string; headers?: Record<string, string>; expiresAt: string }
const BASE = '/admin/asset-reuse';

export function AssetPicker({
  value, onChange, mimeTypePrefix, label = 'Asset', purpose,
}: {
  value?: string;
  onChange: (id: string) => void;
  mimeTypePrefix?: string;
  label?: string;
  purpose: string;
}) {
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const queryGeneration = useRef(0);

  useEffect(() => {
    let cancelled = false;
    const generation = ++queryGeneration.current;
    setAssets([]);
    setCursor(null);
    setHasMore(false);
    setLoading(true);
    setError(null);
    const delay = window.setTimeout(() => {
      const query = new URLSearchParams({ limit: '30' });
      if (mimeTypePrefix) query.set('mimeTypePrefix', mimeTypePrefix);
      if (search.trim()) query.set('q', search.trim());
      adminApiClient.request<AssetPage>(`${BASE}?${query}`, { cache: 'no-store' })
        .then((page) => {
          if (cancelled || generation !== queryGeneration.current) return;
          setAssets(page.items);
          setCursor(page.nextCursor);
          setHasMore(page.hasMore);
        })
        .catch((cause) => {
          if (!cancelled && generation === queryGeneration.current) setError(cause instanceof Error ? cause.message : 'تعذر تحميل الأصول');
        })
        .finally(() => { if (!cancelled && generation === queryGeneration.current) setLoading(false); });
    }, 250);
    return () => { cancelled = true; window.clearTimeout(delay); };
  }, [mimeTypePrefix, search]);

  useEffect(() => {
    if (!value || assets.some((asset) => asset.id === value)) return;
    let cancelled = false;
    adminApiClient.request<AssetOption>(`${BASE}/${encodeURIComponent(value)}`, { cache: 'no-store' })
      .then((asset) => setAssets((prev) => cancelled || prev.some((item) => item.id === asset.id) ? prev : [asset, ...prev]))
      .catch(() => { /* Do not trust deleted or unauthorized stored references. */ });
    return () => { cancelled = true; };
  }, [value, assets]);

  async function loadMore() {
    if (loading || !hasMore || !cursor) return;
    const generation = queryGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ limit: '30', cursor });
      if (mimeTypePrefix) query.set('mimeTypePrefix', mimeTypePrefix);
      if (search.trim()) query.set('q', search.trim());
      const page = await adminApiClient.request<AssetPage>(`${BASE}?${query}`, { cache: 'no-store' });
      if (generation !== queryGeneration.current) return;
      setAssets((prev) => [...prev, ...page.items.filter((asset) => !prev.some((old) => old.id === asset.id))]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (cause) {
      if (generation === queryGeneration.current) setError(cause instanceof Error ? cause.message : 'تعذر تحميل المزيد من الأصول');
    } finally {
      if (generation === queryGeneration.current) setLoading(false);
    }
  }

  async function select(id: string) {
    if (!id) { onChange(''); return; }
    if (selecting) return;
    setSelecting(true);
    setError(null);
    try {
      // The server authorizes reuse and records the selection before changing the form state.
      await adminApiClient.request(`${BASE}/${encodeURIComponent(id)}/selection-audit`, {
        method: 'POST', body: JSON.stringify({ purpose }),
      });
      onChange(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر تسجيل اختيار الأصل');
    } finally { setSelecting(false); }
  }

  async function preview() {
    if (!value) return;
    setPreviewing(true); setError(null);
    try {
      const grant = await adminApiClient.request<DeliveryGrant>(`${BASE}/${encodeURIComponent(value)}/delivery-grant`, {
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
      <input value={search} onChange={(e) => setSearch(e.target.value)} maxLength={160}
        placeholder="ابحث عن اسم الملف" className="mt-1 w-full rounded-xl border p-2" />
      <select value={value ?? ''} disabled={selecting}
        onChange={(e) => void select(e.target.value)} className="mt-1 w-full rounded-xl border p-2">
        <option value="">No asset</option>
        {assets.map((asset) => <option key={asset.id} value={asset.id}>
          {asset.metadata?.originalFilename ?? asset.reference} · {asset.metadata?.mimeType ?? ''} · {asset.metadata?.byteSize ?? 0} B
        </option>)}
      </select>
    </label>
    {hasMore ? <button type="button" disabled={loading} onClick={() => void loadMore()}
      className="mt-2 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50">
      {loading ? 'جاري التحميل…' : 'تحميل المزيد'}
    </button> : null}
    {value ? <button type="button" disabled={previewing} onClick={() => void preview()}
      className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50">
      {previewing ? 'جاري إنشاء رابط آمن…' : 'معاينة مؤقتة آمنة'}
    </button> : null}
    {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
  </div>;
}
