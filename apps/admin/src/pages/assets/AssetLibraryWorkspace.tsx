import { useSearchParams } from 'react-router-dom';
import { useTranslation } from '../../i18n/I18nProvider';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useOwnerOperationScope } from '../../security/useOwnerOperationScope';
import { AssetLifecycleActions } from '../../components/AssetLifecycleActions';
import {
  AssetLifecycleState,
  AssetSecurityClassification,
  AssetRetentionCategory,
} from '@manaratak/domain';
import {
  AssetGovernancePanel,
  type AssetGovernanceSnapshot,
} from '../../components/AssetGovernancePanel';
import { AssetUploadWizard } from '../../components/AssetUploadWizard';
import { RefreshCw, Filter, FileText } from 'lucide-react';

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

interface AssetDetails extends AssetGovernanceSnapshot {
  id: string;
  reference: string;
  ownerId: string;
  ownerType: string;
  lifecycleState: string;
  securityClassification: string;
  retentionCategory: string;
  retentionExpiresAt?: string | null;
  metadata: {
    originalFilename: string;
    mimeType: string;
    fileExtension: string;
    byteSize: number;
    width?: number;
    height?: number;
    duration?: number;
  };
  checksum?: { algorithm: string; hash: string } | null;
}

export function AssetLibraryWorkspace({
  view = 'library',
}: {
  view?: 'library' | 'processing' | 'relationships' | 'rights' | 'security';
}) {
  const [params, setParams] = useSearchParams();
  const scope = useOwnerOperationScope(`${view}:${params.toString()}`);
  const { t, dir } = useTranslation();
  const [items, setItems] = useState<AssetDto[]>([]);
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [usagePreview, setUsagePreview] = useState<{
    assetId: string;
    inUse: boolean;
    usages: Array<{ consumer: string; field: string }>;
  } | null>(null);
  const [usageLoadingId, setUsageLoadingId] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<AssetDetails | null>(null);
  const [detailsLoadingId, setDetailsLoadingId] = useState<string | null>(null);
  const detailsGenerationRef = useRef(0);

  const inspectDetails = async (assetId: string) => {
    if (detailsLoadingId || !scope.isCurrent()) return;
    const generation = ++detailsGenerationRef.current;
    setDetailsLoadingId(assetId);
    setError(null);
    try {
      const details = await adminApiClient.request<AssetDetails>(
        `/admin/assets/${encodeURIComponent(assetId)}`,
        { cache: 'no-store' },
      );
      if (!scope.isCurrent() || generation !== detailsGenerationRef.current) return;
      if (details.id !== assetId) throw Error('ASSET_IDENTITY_MISMATCH');
      setSelectedAsset(details);
    } catch (cause) {
      if (scope.isCurrent() && generation === detailsGenerationRef.current) {
        setSelectedAsset(null);
        setError(cause instanceof Error ? cause.message : t('asset_text_000'));
      }
    } finally {
      if (scope.isCurrent() && generation === detailsGenerationRef.current)
        setDetailsLoadingId(null);
    }
  };

  const previewAsset = async (assetId: string, mimeType: string) => {
    if (!scope.isCurrent()) return;
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(mimeType)) {
      setError(t('asset_text_001'));
      return;
    }
    setError(null);
    try {
      const grant = await adminApiClient.request<{ url: string; headers?: Record<string, string> }>(
        `/admin/assets/${encodeURIComponent(assetId)}/delivery-grant`,
        { method: 'POST', body: JSON.stringify({ expiresInSeconds: 120 }) },
      );
      if (!scope.isCurrent()) return;
      if (grant.headers && Object.keys(grant.headers).length > 0) {
        throw new Error('ASSET_PREVIEW_REQUIRES_SECURE_PROXY');
      }
      const link = new URL(grant.url);
      if (
        link.username ||
        link.password ||
        (link.protocol !== 'https:' &&
          !(
            import.meta.env.DEV &&
            link.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(link.hostname)
          ))
      ) {
        throw new Error('ASSET_PREVIEW_URL_INVALID');
      }
      window.open(link.toString(), '_blank', 'noopener,noreferrer');
    } catch (cause) {
      if (scope.isCurrent()) setError(cause instanceof Error ? cause.message : t('asset_text_002'));
    }
  };

  const inspectUsages = async (assetId: string) => {
    if (usageLoadingId || !scope.isCurrent()) return;
    setUsageLoadingId(assetId);
    setError(null);
    try {
      const result = await adminApiClient.request<{
        assetId: string;
        inUse: boolean;
        usages: Array<{ consumer: string; field: string }>;
      }>(`/admin/assets/${encodeURIComponent(assetId)}/usages`, { cache: 'no-store' });
      if (!scope.isCurrent()) return;
      if (result.assetId !== assetId) throw Error('ASSET_USAGE_IDENTITY_MISMATCH');
      setUsagePreview(result);
    } catch (cause) {
      if (!scope.isCurrent()) return;
      setUsagePreview(null);
      setError(cause instanceof Error ? cause.message : t('asset_text_003'));
    } finally {
      if (scope.isCurrent()) setUsageLoadingId(null);
    }
  };
  const emptyFilters = {
    q: '',
    lifecycleState: '',
    securityClassification: '',
    ownerType: '',
    ownerId: '',
    mimeTypePrefix: '',
    retentionCategory: '',
    checksumPresence: '',
    usageStatus: '',
    malwareStatus: '',
    fileFamily: '',
    processingQueue: '',
    createdFrom: '',
    createdTo: '',
  };
  const readFilters = () =>
    Object.fromEntries(
      Object.entries(emptyFilters).map(([key, value]) => [
        key,
        params.get(key) ??
          (key === 'processingQueue' && view === 'processing' ? 'QUARANTINE' : value),
      ]),
    ) as typeof emptyFilters;
  const [filters, setFilters] = useState(readFilters);

  const [appliedFilters, setAppliedFilters] = useState(filters);
  const appliedRef = useRef(filters);
  const generationRef = useRef(0);
  const pagingRef = useRef(false);
  const pendingFilters = (Object.keys(filters) as Array<keyof typeof filters>).some(
    (key) => filters[key] !== appliedFilters[key],
  );

  const load = async (reset = true, selected = appliedRef.current) => {
    if (!scope.isCurrent()) return;
    if (!reset && (pagingRef.current || pendingFilters || !cursor || !hasMore)) return;
    const generation = ++generationRef.current;
    pagingRef.current = !reset;
    setLoading(true);
    if (reset) {
      setItems([]);
      setCursor(null);
      setHasMore(false);
    }
    try {
      setError(null);
      const p = new URLSearchParams({ limit: '50' });
      Object.entries(selected).forEach(([k, v]) => {
        if (!v.trim()) return;
        p.set(k, k === 'createdFrom' || k === 'createdTo' ? new Date(v).toISOString() : v.trim());
      });
      if (!reset && cursor) p.set('cursor', cursor);
      const r = await adminApiClient.request<AssetPage>(`/admin/assets?${p}`, {
        cache: 'no-store',
      });
      if (!scope.isCurrent() || generation !== generationRef.current) return;
      setItems((prev) => {
        if (reset) return r.items;
        const existing = new Set(prev.map((asset) => asset.id));
        return [
          ...prev,
          ...r.items.filter((asset) => {
            if (existing.has(asset.id)) return false;
            existing.add(asset.id);
            return true;
          }),
        ];
      });
      setCursor(r.nextCursor);
      setHasMore(r.hasMore);
    } catch (e) {
      if (scope.isCurrent() && generation === generationRef.current)
        setError(e instanceof Error ? e.message : t('asset_text_004'));
    } finally {
      if (scope.isCurrent() && generation === generationRef.current) {
        pagingRef.current = false;
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    setSelectedAsset(null);
    setUsagePreview(null);
    setDetailsLoadingId(null);
    setUsageLoadingId(null);
    const next = readFilters();
    setFilters(next);
    setAppliedFilters(next);
    appliedRef.current = next;
    void load(true, next);
    return () => {
      generationRef.current++;
      detailsGenerationRef.current++;
    };
  }, [params.toString(), view]);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (
      filters.createdFrom &&
      filters.createdTo &&
      new Date(filters.createdFrom) > new Date(filters.createdTo)
    ) {
      setError(t('asset_text_005'));
      return;
    }
    const next = { ...filters };
    appliedRef.current = next;
    setAppliedFilters(next);
    const query = new URLSearchParams({ tab: view });
    Object.entries(next).forEach(([key, value]) => {
      if (value) query.set(key, value);
    });
    setParams(query);
  };

  const resetFilters = () => {
    const empty = Object.fromEntries(
      Object.keys(filters).map((key) => [key, '']),
    ) as typeof filters;
    setFilters(empty);
    setAppliedFilters(empty);
    appliedRef.current = empty;
    setParams({ tab: view });
  };

  return (
    <div dir={dir} className="space-y-3">
      <div className="operations-actions">
        <button className="operations-button" disabled={loading} onClick={() => void load(true)}>
          <RefreshCw size={15} />
          {t('asset_text_009')}
        </button>
      </div>
      {loading && <p role="status">{t('asset_text_010')} </p>}
      {pendingFilters && <p role="status">{t('asset_text_011')} </p>}
      {error && (
        <div
          role="alert"
          className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs font-bold text-red-700 shadow-xs"
        >
          {error}
        </div>
      )}

      <form
        onSubmit={submit}
        className="grid gap-3 rounded-3xl border border-slate-200/90 bg-white p-5 shadow-xs md:grid-cols-4"
      >
        <input
          value={filters.q}
          onChange={(e) => setFilters((v) => ({ ...v, q: e.target.value }))}
          placeholder={t('asset_text_012')}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
        />
        <select
          aria-label={t('asset_text_013')}
          value={filters.lifecycleState}
          onChange={(e) => setFilters((v) => ({ ...v, lifecycleState: e.target.value }))}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
        >
          <option value="">{t('asset_text_014')} </option>
          {Object.values(AssetLifecycleState).map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <details className="md:col-span-4">
          <summary>
            {dir === 'rtl'
              ? 'مرشحات متقدمة: النطاق والمالك والمعالجة والحقوق'
              : 'Advanced filters: scope, owner, processing and rights'}
          </summary>
          <div className="operations-filters mt-3">
            <select
              aria-label={t('asset_text_015')}
              value={filters.securityClassification}
              onChange={(e) =>
                setFilters((v) => ({ ...v, securityClassification: e.target.value }))
              }
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="">{t('asset_text_016')} </option>
              {Object.values(AssetSecurityClassification).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              aria-label={t('asset_text_017')}
              value={filters.retentionCategory}
              onChange={(e) => setFilters((v) => ({ ...v, retentionCategory: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="">{t('asset_text_018')} </option>
              {Object.values(AssetRetentionCategory).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </select>
            <select
              aria-label={t('asset_text_019')}
              value={filters.checksumPresence}
              onChange={(e) => setFilters((v) => ({ ...v, checksumPresence: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs"
            >
              <option value="">{t('asset_text_020')} </option>
              <option value="PRESENT">{t('asset_text_021')} </option>
              <option value="MISSING">{t('asset_text_022')} </option>
            </select>
            <select
              aria-label={t('asset_text_023')}
              value={filters.usageStatus}
              onChange={(e) => setFilters((v) => ({ ...v, usageStatus: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            >
              <option value="">{t('asset_text_024')} </option>
              <option value="IN_USE">{t('asset_text_025')} </option>
              <option value="UNUSED">{t('asset_text_026')} </option>
            </select>
            <select
              aria-label={t('asset_text_027')}
              value={filters.malwareStatus}
              onChange={(e) => setFilters((v) => ({ ...v, malwareStatus: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            >
              <option value="">{t('asset_text_028')} </option>
              <option value="PASSED">{t('asset_text_029')} </option>
              <option value="FAILED">{t('asset_text_030')} </option>
            </select>
            <select
              aria-label={t('asset_text_031')}
              value={filters.fileFamily}
              onChange={(e) => setFilters((v) => ({ ...v, fileFamily: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            >
              <option value="">{t('asset_text_032')} </option>
              <option value="IMAGE">{t('asset_text_033')} </option>
              <option value="VIDEO">{t('asset_text_034')} </option>
              <option value="AUDIO">{t('asset_text_035')} </option>
              <option value="PDF">PDF</option>
            </select>
            <select
              aria-label={t('asset_text_036')}
              value={filters.processingQueue}
              onChange={(e) => setFilters((v) => ({ ...v, processingQueue: e.target.value }))}
              className="rounded-xl border border-slate-200 px-3 py-2 text-xs"
            >
              <option value="">{t('asset_text_037')} </option>
              <option value="AWAITING_UPLOAD">{t('asset_text_038')} </option>
              <option value="QUARANTINE">{t('asset_text_039')} </option>
              <option value="PROCESSING">{t('asset_text_040')} </option>
              <option value="FAILED">{t('asset_text_041')} </option>
              <option value="ARCHIVE_RECOVERY">{t('asset_text_042')} </option>
              <option value="RESTORE_RECOVERY">{t('asset_text_043')} </option>
              <option value="ACTIVATION_RECOVERY">{t('asset_text_044')} </option>
            </select>
            <input
              value={filters.mimeTypePrefix}
              onChange={(e) => setFilters((v) => ({ ...v, mimeTypePrefix: e.target.value }))}
              placeholder={t('asset_text_045')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
            />
            <input
              aria-label={t('asset_text_046')}
              list="asset-owner-types"
              value={filters.ownerType}
              onChange={(e) => setFilters((v) => ({ ...v, ownerType: e.target.value }))}
              placeholder={t('asset_text_047')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
            />
            <datalist id="asset-owner-types">
              <option value="COURSE">{t('asset_text_048')} </option>
              <option value="UNIVERSITY">{t('asset_text_049')} </option>
              <option value="STUDENT">{t('asset_text_050')} </option>
            </datalist>
            <input
              aria-label={t('asset_text_051')}
              value={filters.ownerId}
              onChange={(e) => setFilters((v) => ({ ...v, ownerId: e.target.value }))}
              placeholder={t('asset_text_052')}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
            />
            <input
              type="datetime-local"
              value={filters.createdFrom}
              onChange={(e) => setFilters((v) => ({ ...v, createdFrom: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
              aria-label={t('asset_text_053')}
            />
            <input
              type="datetime-local"
              value={filters.createdTo}
              onChange={(e) => setFilters((v) => ({ ...v, createdTo: e.target.value }))}
              className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium outline-none focus:border-[#21A7B4]"
              aria-label={t('asset_text_054')}
            />
          </div>
        </details>
        <button
          type="submit"
          className="inline-flex min-h-[40px] items-center justify-center gap-2 rounded-xl bg-[#142B5F] px-4 text-xs font-black text-white hover:bg-[#0E7C86] transition shadow-xs md:col-span-4"
        >
          <Filter className="h-3.5 w-3.5" /> {t('asset_text_055')}{' '}
        </button>
        <button
          type="button"
          onClick={resetFilters}
          className="rounded-xl border px-4 py-2 text-xs"
        >
          {t('asset_text_056')}{' '}
        </button>
      </form>

      {appliedFilters.usageStatus && (
        <p role="status" className="text-xs text-slate-600">
          {t('asset_text_057')}{' '}
        </p>
      )}
      {view === 'processing' && (
        <AssetUploadWizard onUploaded={() => void load(true, appliedRef.current)} />
      )}
      {selectedAsset && (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-5 text-xs shadow-xs"
          aria-live="polite"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-black text-[#142B5F]">
              {t('asset_text_058')} {selectedAsset.metadata.originalFilename}
            </h2>
            <button
              type="button"
              onClick={() => {
                detailsGenerationRef.current++;
                setDetailsLoadingId(null);
                setSelectedAsset(null);
              }}
              className="rounded-lg border px-3 py-1.5"
            >
              {t('asset_text_059')}{' '}
            </button>
          </div>
          <dl className="mt-4 grid gap-3 md:grid-cols-3">
            <div>
              <dt className="text-slate-500">{t('asset_text_060')} </dt>
              <dd className="mt-1 break-all font-mono">{selectedAsset.id}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_061')} </dt>
              <dd className="mt-1 break-all font-mono">{selectedAsset.reference}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_062')} </dt>
              <dd className="mt-1">
                {selectedAsset.ownerType}: {selectedAsset.ownerId}
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_063')} </dt>
              <dd className="mt-1 font-bold">{selectedAsset.lifecycleState}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_015')} </dt>
              <dd className="mt-1">{selectedAsset.securityClassification}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_064')} </dt>
              <dd className="mt-1">{selectedAsset.retentionCategory}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_065')} </dt>
              <dd className="mt-1">{selectedAsset.retentionExpiresAt || t('asset_text_066')}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_067')} </dt>
              <dd className="mt-1">{selectedAsset.metadata.mimeType}</dd>
            </div>
            <div>
              <dt className="text-slate-500">{t('asset_text_068')} </dt>
              <dd className="mt-1">
                {selectedAsset.metadata.byteSize.toLocaleString()} {t('asset_text_069')}{' '}
              </dd>
            </div>
          </dl>
          <p className="mt-3">
            {t('asset_text_070')}{' '}
            {selectedAsset.securityEvidence?.uploadConfirmed
              ? t('asset_text_071')
              : t('asset_text_072')}{' '}
            {t('asset_text_073')}{' '}
            {selectedAsset.securityEvidence?.malwareStatus ?? t('asset_text_074')}{' '}
            {t('asset_text_075')}{' '}
            {selectedAsset.securityEvidence?.sanitized ? t('asset_text_076') : t('asset_text_077')}
          </p>
          {selectedAsset.checksum && (
            <div className="mt-4 rounded-lg bg-slate-50 p-3">
              <div className="font-bold">
                {t('asset_text_078')} {selectedAsset.checksum.algorithm}
              </div>
              <code dir="ltr" className="mt-1 block break-all text-[11px]">
                {selectedAsset.checksum.hash}
              </code>
            </div>
          )}
          <p className="mt-3 text-slate-500">{t('asset_text_079')} </p>
          <button
            type="button"
            className="mt-3 rounded-lg border px-3 py-1.5"
            onClick={() => {
              const next = {
                ...appliedRef.current,
                ownerId: selectedAsset.ownerId,
                ownerType: selectedAsset.ownerType,
              };
              setFilters(next);
              setAppliedFilters(next);
              appliedRef.current = next;
              void load(true, next);
            }}
          >
            {t('asset_text_080')}{' '}
          </button>
          {view === 'rights' && (
            <AssetGovernancePanel key={selectedAsset.id} asset={selectedAsset} />
          )}
          {(view === 'processing' || view === 'security') && (
            <AssetLifecycleActions
              key={selectedAsset.id + ':' + selectedAsset.lifecycleState}
              asset={selectedAsset}
              onChanged={async () => {
                await inspectDetails(selectedAsset.id);
                await load(true, appliedRef.current);
              }}
            />
          )}
          <button
            type="button"
            onClick={() => void inspectUsages(selectedAsset.id)}
            disabled={usageLoadingId !== null}
            className="mt-3 rounded-lg border px-3 py-1.5 disabled:opacity-50"
          >
            {t('asset_text_081')}{' '}
          </button>
          <button
            type="button"
            disabled={selectedAsset.lifecycleState !== 'ACTIVE'}
            onClick={() => void previewAsset(selectedAsset.id, selectedAsset.metadata.mimeType)}
            className="mt-3 mr-2 rounded-lg border px-3 py-1.5 disabled:opacity-50"
          >
            {t('asset_text_082')}{' '}
          </button>
        </section>
      )}

      {usagePreview && (
        <section
          className="rounded-2xl border border-slate-200 bg-white p-4 text-xs"
          aria-live="polite"
        >
          <div className="font-bold text-[#142B5F]">
            {t('asset_text_083')} {usagePreview.assetId}
          </div>
          <p className="mt-2">
            {usagePreview.inUse
              ? t('asset_usage_count').replace('{count}', String(usagePreview.usages.length))
              : t('asset_text_084')}
          </p>
          <ul className="mt-2 list-inside list-disc">
            {usagePreview.usages.map((usage, index) => (
              <li key={index}>
                {usage.consumer} — {usage.field}
              </li>
            ))}
          </ul>
          <button
            type="button"
            onClick={() => setUsagePreview(null)}
            className="mt-2 rounded-lg border px-3 py-1"
          >
            {t('asset_text_085')}{' '}
          </button>
        </section>
      )}

      <div className="overflow-hidden rounded-3xl border border-slate-200/90 bg-white shadow-xs">
        <div className="border-b border-slate-100 bg-slate-50/70 px-5 py-4">
          <h2 className="text-base font-black text-[#142B5F]">
            {t('asset_text_086')} {items.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-start text-xs">
            <thead className="bg-slate-50/90 text-slate-500 font-bold border-b border-slate-100">
              <tr>
                <th className="p-3.5 text-start">{t('asset_text_087')} </th>
                <th className="p-3.5 text-start">{t('asset_text_062')} </th>
                <th className="p-3.5 text-start">{t('asset_text_088')} </th>
                <th className="p-3.5 text-start">{t('asset_text_089')} </th>
                <th className="p-3.5 text-start">{t('asset_text_015')} </th>
                <th className="p-3.5 text-start">{t('asset_text_017')} </th>
                <th className="p-3.5 text-start">{t('asset_text_090')} </th>
                <th className="p-3.5 text-start">{t('asset_text_091')} </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {items.length === 0 ? (
                <tr>
                  <td colSpan={8} className="operations-empty">
                    {loading
                      ? t('asset_text_092')
                      : error
                        ? t('asset_text_093')
                        : hasMore
                          ? t('asset_text_094')
                          : t('asset_text_095')}
                  </td>
                </tr>
              ) : (
                items.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/60 transition">
                    <td className="p-3.5">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-[#0E7C86] shrink-0" />
                        <div>
                          <div className="font-bold text-[#142B5F]">
                            {a.metadata?.originalFilename ?? a.reference}
                          </div>
                          <code className="text-[10px] text-slate-400 font-mono">{a.id}</code>
                        </div>
                      </div>
                    </td>
                    <td className="p-3.5">
                      <code className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                        {a.ownerType}:{a.ownerId}
                      </code>
                    </td>
                    <td className="p-3.5 font-mono text-[11px] text-slate-600">
                      {a.metadata?.mimeType ?? '—'}
                    </td>
                    <td className="p-3.5 font-black text-[#0E7C86]">{a.lifecycleState}</td>
                    <td className="p-3.5">
                      <span className="rounded-full bg-slate-100 px-2.5 py-0.5 font-bold text-slate-600 text-[10px]">
                        {a.securityClassification}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-600 font-medium">{a.retentionCategory}</td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        disabled={usageLoadingId !== null}
                        onClick={() => void inspectUsages(a.id)}
                        className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50"
                      >
                        {usageLoadingId === a.id ? t('asset_text_096') : t('asset_text_097')}
                      </button>
                    </td>
                    <td className="p-3.5">
                      <button
                        type="button"
                        disabled={detailsLoadingId !== null}
                        onClick={() => void inspectDetails(a.id)}
                        className="rounded-lg border px-3 py-1 text-xs disabled:opacity-50"
                      >
                        {detailsLoadingId === a.id ? t('asset_text_092') : t('asset_text_098')}
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
            disabled={loading || pendingFilters}
            onClick={() => void load(false, appliedRef.current)}
            className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 text-xs font-black text-[#142B5F] hover:bg-slate-50 transition shadow-xs"
          >
            {t('asset_text_099')}{' '}
          </button>
        </div>
      )}
    </div>
  );
}
