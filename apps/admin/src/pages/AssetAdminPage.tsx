import { FormEvent, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';
import { FolderGit2, RefreshCw, Filter, FileText } from 'lucide-react';

interface AssetDto {
  id: string;
  reference: string;
  ownerId: string;
  ownerType: string;
  lifecycleState: string;
  securityClassification: string;
  retentionCategory: string;
  metadata?: { originalFilename?: string; mimeType?: string; byteSize?: number };
  createdAt: string;
}

interface AssetPage {
  items: AssetDto[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface AssetDetails {
  id: string;
  reference: string;
  ownerId: string;
  ownerType: string;
  lifecycleState: string;
  securityClassification: string;
  retentionCategory: string;
  retentionExpiresAt?: string | null;
  metadata: { originalFilename: string; mimeType: string; fileExtension: string; byteSize: number };
  checksum?: { algorithm: string; hash: string } | null;
}

export function AssetAdminPage() {
  const [items, setItems] = useState<AssetDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usagePreview, setUsagePreview] = useState<{
    assetId: string; inUse: boolean; usages: Array<{ consumer: string; field: string }>;
  } | null>(null);
  const [usageLoadingId, setUsageLoadingId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetails | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);

  const inspectDetails = async (assetId: string) => {
    if (detailsLoadingId) return;
    setDetailsLoadingId(assetId);
    setError(null);
    try {
      const details = await adminApiClient.request<AssetDetails>(
        `/admin/assets/${encodeURIComponent(assetId)}`, { cache: 'no-store' },
      );
      setSelectedAsset(details);
    } catch (cause) {
      setSelectedAsset(null);
      setError(cause instanceof Error ? cause.message : 'تعذر تحميل تفاصيل الأصل');
    } finally {
      setDetailsLoadingId(null);
    }
  };

  const inspectUsages = async (assetId: string) => {
    if (usageLoadingId) return;
    setUsageLoadingId(assetId);
    setError(null);
    try {
      const result = await adminApiClient.request<{
        assetId: string; inUse: boolean; usages: Array<{ consumer: string; field: string }>;
      }>(`/admin/assets/${encodeURIComponent(assetId)}/usages`, { cache: 'no-store' });
      setUsagePreview(result);
    } catch (cause) {
      setUsagePreview(null);
      setError(cause instanceof Error ? cause.message : 'تعذر فحص استخدامات الأصل');
    } finally {
      setUsageLoadingId(null);
    }
  };
  const [filters, setFilters] = useState({
    q: '',
    lifecycleState: '',
    securityClassification: '',
    ownerType: '',
    ownerId: '',
    mimeTypePrefix: '',
    createdFrom: '',
    createdTo: '',
  });

  const [appliedFilters, setAppliedFilters] = useState(filters);
  const appliedRef = useRef(filters);
  const generationRef = useRef(0);
  const pagingRef = useRef(false);
  const pendingFilters = (Object.keys(filters) as Array<keyof typeof filters>)
    .some((key) => filters[key] !== appliedFilters[key]);

  const load = async (reset = true, selected = appliedRef.current) => {
    if (!reset && (pagingRef.current || pendingFilters || !cursor || !hasMore)) return;
    const generation = ++generationRef.current;
    if (!reset) pagingRef.current = true;
    setLoading(true);
    try {
      setError(null);
      const p = new URLSearchParams({ limit: '50' });
      Object.entries(selected).forEach(([k, v]) => {
        if (!v.trim()) return;
        p.set(k, k === 'createdFrom' || k === 'createdTo' ? new Date(v).toISOString() : v.trim());
      });
      if (!reset && cursor) p.set('cursor', cursor);
      const r = await adminApiClient.request<AssetPage>(`/admin/assets?${p}`, { cache: 'no-store' });
      if (generation !== generationRef.current) return;
      setItems((prev) => {
        if (reset) return r.items;
        const existing = new Set(prev.map((asset) => asset.id));
        return [...prev, ...r.items.filter((asset) => {
          if (existing.has(asset.id)) return false;
          existing.add(asset.id);
          return true;
        })];
      });
      setCursor(r.nextCursor);
      setHasMore(r.hasMore);
    } catch (e) {
      if (generation === generationRef.current) setError(e instanceof Error ? e.message : 'تعذر تحميل الأصول والملفات.');
    } finally {
      if (generation === generationRef.current) { pagingRef.current = false; setLoading(false); }
    }
  };

  useEffect(() => {
    void load(true);
  }, []);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next = { ...filters };
    appliedRef.current = next;
    setAppliedFilters(next);
    void load(true, next);
  };

  return (
    <div dir="rtl" className="mx-auto max-w-7xl space-y-6">
      <section className="relative overflow-hidden rounded-[28px] border border-[#21A7B4]/30 bg-gradient-to-l from-[#0E7C86] via-[#103E6A] to-[#142B5F] p-6 text-white shadow-[0_18px_45px_rgba(20,43,95,0.18)] sm:p-8">
        <div className="pointer-events-none absolute -left-16 -top-28 h-64 w-64 rounded-full border border-cyan-400/20" />
        <div className="pointer-events-none absolute bottom-0 right-0 h-1.5 w-48 bg-gradient-to-r from-transparent via-[#21A7B4] to-[#0E7C86] sm:w-80" />
        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs font-bold text-cyan-200 backdrop-blur-sm border border-white/15">
              <FolderGit2 className="h-4 w-4 text-[#21A7B4]" />
              <span>منظومة إدارة الملفات والأصول الرقمية</span>
            </div>
            <h1 className="text-3xl font-black leading-tight sm:text-4xl text-white tracking-tight">مركز الملفات والأصول الرقمية</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-cyan-50/90">
              حوكمة ملفات وأصول المنصة، دورة الحياة، تصنيف الأمان، الملكية، والجاهزية للتسليم النظيف.
            </p>
          </div>
          <button
            onClick={() => void load(true)}
            disabled={loading}
            className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl bg-[#21A7B4] px-5 text-sm font-black text-white shadow-md transition hover:bg-[#1A8D99] shrink-0"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> تحديث البيانات
          </button>
        </div>
      </section>

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs">
          {error}
        </div>
      )}

      <form onSubmit={submit} className="grid gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs md:grid-cols-4">
        <input
          value={filters.q}
          onChange={(e) => setFilters((v) => ({ ...v, q: e.target.value }))}
          placeholder="بحث بالمعرف / الاسم / المالك / الملف"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.lifecycleState}
          onChange={(e) => setFilters((v) => ({ ...v, lifecycleState: e.target.value }))}
          placeholder="حالة دورة الحياة (Lifecycle State)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.securityClassification}
          onChange={(e) => setFilters((v) => ({ ...v, securityClassification: e.target.value }))}
          placeholder="تصنيف الأمان (Security Classification)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.mimeTypePrefix}
          onChange={(e) => setFilters((v) => ({ ...v, mimeTypePrefix: e.target.value }))}
          placeholder="نوع الملف (MIME Prefix)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.ownerType}
          onChange={(e) => setFilters((v) => ({ ...v, ownerType: e.target.value }))}
          placeholder="نوع المالك (Owner Type)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          value={filters.ownerId}
          onChange={(e) => setFilters((v) => ({ ...v, ownerId: e.target.value }))}
          placeholder="معرف المالك (Owner ID)"
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <input
          type="datetime-local"
          value={filters.createdFrom}
          onChange={(e) => setFilters((v) => ({ ...v, createdFrom: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
          aria-label="تاريخ الإنشاء من"
        />
        <input
          type="datetime-local"
          value={filters.createdTo}
          onChange={(e) => setFilters((v) => ({ ...v, createdTo: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
          aria-label="تاريخ الإنشاء إلى"
        />
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#0E7C86] transition shadow-xs md:col-span-4"
        >
          <Filter className="h-3.5 w-3.5" /> تصفية وتطبيق البحث
        </button>
      </form>

      {selectedAsset && (
        <section className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-xs" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-[#142B5F]">
              تفاصيل الأصل: {selectedAsset.metadata.originalFilename}
            </h2>
            <button type="button" onClick={() => setSelectedAsset(null)}
              className="rounded-lg border px-3 py-1.5">إغلاق</button>
          </div>
          <dl className="mt-4 grid gap-3 md:grid-cols-3">
            <div><dt className="text-slate-500">المعرف</dt><dd className="mt-1 break-all font-mono">{selectedAsset.id}</dd></div>
            <div><dt className="text-slate-500">المرجع</dt><dd className="mt-1 break-all font-mono">{selectedAsset.reference}</dd></div>
            <div><dt className="text-slate-500">المالك</dt><dd className="mt-1">{selectedAsset.ownerType}: {selectedAsset.ownerId}</dd></div>
            <div><dt className="text-slate-500">الحالة</dt><dd className="mt-1 font-bold">{selectedAsset.lifecycleState}</dd></div>
            <div><dt className="text-slate-500">تصنيف الأمان</dt><dd className="mt-1">{selectedAsset.securityClassification}</dd></div>
            <div><dt className="text-slate-500">الاحتفاظ</dt><dd className="mt-1">{selectedAsset.retentionCategory}</dd></div>
            <div><dt className="text-slate-500">تاريخ انتهاء الاحتفاظ</dt><dd className="mt-1">{selectedAsset.retentionExpiresAt || 'غير محدد'}</dd></div>
            <div><dt className="text-slate-500">نوع الملف</dt><dd className="mt-1">{selectedAsset.metadata.mimeType}</dd></div>
            <div><dt className="text-slate-500">الحجم</dt><dd className="mt-1">{selectedAsset.metadata.byteSize.toLocaleString()} بايت</dd></div>
          </dl>
          {selectedAsset.checksum && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <div className="font-bold">بصمة المحتوى — {selectedAsset.checksum.algorithm}</div>
              <code dir="ltr" className="mt-1 block break-all text-[11px]">{selectedAsset.checksum.hash}</code>
            </div>
          )}
          <p className="mt-3 text-slate-500">
            هذه بيانات وصفية فقط؛ لا تُعرض روابط تخزين مباشرة. تحقق من ارتباطات الأصل قبل أي عملية مؤثرة.
          </p>
          <button type="button" onClick={() => void inspectUsages(selectedAsset.id)}
            disabled={usageLoadingId !== null} className="mt-3 rounded-lg border px-3 py-1.5 disabled:opacity-50">
            عرض استخدامات هذا الأصل
          </button>
        </section>
      )}

      {usagePreview && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 text-xs" aria-live="polite">
          <div className="font-bold text-[#142B5F]">تأثير الإجراءات على الأصل: {usagePreview.assetId}</div>
          <p className="mt-2">{usagePreview.inUse
            ? `مرتبط بـ ${usagePreview.usages.length} موضع استخدام — تُمنع عمليات الإزالة أثناء الارتباط.`
            : 'لم يجد سجل الاستخدام ارتباطًا حاليًا. يجب إعادة الفحص عند تنفيذ أي إجراء.'}</p>
          <ul className="mt-2 list-inside list-disc">
            {usagePreview.usages.map((usage, index) => (
              <li key={index}>{usage.consumer} — {usage.field}</li>
            ))}
          </ul>
          <button type="button" onClick={() => setUsagePreview(null)}
            className="mt-2 rounded-lg border px-3 py-1">إغلاق التفاصيل</button>
        </section>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <h2 className="text-base font-black text-[#142B5F]">سجل الأصول والملفات ({items.length})</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5 text-start">الملف / الأصل</th>
                <th className="p-3.5 text-start">المالك</th>
                <th className="p-3.5 text-start">نوع الوسائط (MIME)</th>
                <th className="p-3.5 text-start">دورة الحياة</th>
                <th className="p-3.5 text-start">تصنيف الأمان</th>
                <th className="p-3.5 text-start">سياسة الاحتفاظ</th>
                <th className="p-3.5 text-start">تأثير الاستخدام</th>
                <th className="p-3.5 text-start">التفاصيل</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-bold">
                    لا توجد أصول أو ملفات مطابقة للبحث.
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#0E7C86] shrink-0" />
                        <div>
                          <div className="font-bold text-[#142B5F]">{a.metadata?.originalFilename ?? a.reference}</div>
                          <code className="text-[10px] text-slate-400 font-mono">{a.id}</code>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {a.ownerType}:{a.ownerId}
                      </code>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">{a.metadata?.mimeType ?? '—'}</td>
                    <td className="p-3.5 font-black text-[#0E7C86]">{a.lifecycleState}</td>
                    <td className="p-3.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-600 text-[10px]">
                        {a.securityClassification}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{a.retentionCategory}</td>
                    <td className="p-3.5">
                      <button type="button" disabled={usageLoadingId !== null}
                        onClick={() => void inspectUsages(a.id)}
                        className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50">
                        {usageLoadingId === a.id ? 'جاري الفحص…' : 'عرض الارتباطات'}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <button type="button" disabled={detailsLoadingId !== null}
                        onClick={() => void inspectDetails(a.id)}
                        className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50">
                        {detailsLoadingId === a.id ? 'جاري التحميل…' : 'عرض التفاصيل'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {hasMore && (
        <div className="text-center pt-2">
          <button
            onClick={() => void load(false)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-xs font-black text-[#142B5F] hover:bg-slate-50 transition shadow-xs"
          >
            تحميل المزيد من الأصول
          </button>
        </div>
      )}
    </div>
  );
}
