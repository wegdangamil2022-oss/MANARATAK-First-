import { useTranslation } from '../i18n/I18nProvider';
import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../api/client';

interface AssetUsageRights {
  rightsSource: string;
  attribution: string;
  usageScope: 'PUBLIC' | 'INTERNAL';
  publicationPolicy: 'ADVISORY' | 'MANDATORY';
  expiresAt?: string;
}
interface AssetOption {
  id: string;
  reference: string;
  lifecycleState?: string;
  metadata?: {
    originalFilename?: string;
    mimeType?: string;
    byteSize?: number;
    rights?: AssetUsageRights | null;
  };
}
interface AssetPage {
  items: AssetOption[];
  nextCursor: string | null;
  hasMore: boolean;
}
interface DeliveryGrant {
  url: string;
  headers?: Record<string, string>;
  expiresAt: string;
}
const BASE = '/admin/asset-reuse';

export function AssetPicker({
  value,
  onChange,
  mimeTypePrefix,
  label,
  purpose,
}: {
  value?: string;
  onChange: (id: string) => void;
  mimeTypePrefix?: string;
  label?: string;
  purpose: string;
}) {
  const { t } = useTranslation();
  const loadFailed = t('asset_text_165');
  const [assets, setAssets] = useState<AssetOption[]>([]);
  const [search, setSearch] = useState('');
  const [cursor, setCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selecting, setSelecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewing, setPreviewing] = useState(false);
  const [selectedOption, setSelectedOption] = useState<AssetOption | null>(null);
  const [rights, setRights] = useState<AssetUsageRights | null>(null);
  const [rightsLoading, setRightsLoading] = useState(false);
  const [rightsFailed, setRightsFailed] = useState(false);
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
      adminApiClient
        .request<AssetPage>(`${BASE}?${query}`, { cache: 'no-store' })
        .then((page) => {
          if (cancelled || generation !== queryGeneration.current) return;
          setAssets(page.items);
          setCursor(page.nextCursor);
          setHasMore(page.hasMore);
        })
        .catch((cause) => {
          if (!cancelled && generation === queryGeneration.current)
            setError(cause instanceof Error ? cause.message : loadFailed);
        })
        .finally(() => {
          if (!cancelled && generation === queryGeneration.current) setLoading(false);
        });
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(delay);
    };
  }, [mimeTypePrefix, search, loadFailed]);

  // Always read selected rights from the owner: list rows intentionally contain only minimal metadata.
  useEffect(() => {
    let cancelled = false;
    setRights(null);
    setSelectedOption(null);
    setRightsFailed(false);
    setRightsLoading(Boolean(value));
    if (value)
      adminApiClient
        .request<AssetOption>(`${BASE}/${encodeURIComponent(value)}`, { cache: 'no-store' })
        .then((asset) => {
          if (!cancelled) {
            setSelectedOption(asset);
            setRights(asset.metadata?.rights ?? null);
          }
        })
        .catch(() => {
          if (!cancelled) setRightsFailed(true);
        })
        .finally(() => {
          if (!cancelled) setRightsLoading(false);
        });
    return () => {
      cancelled = true;
    };
  }, [value]);

  async function loadMore() {
    if (loading || !hasMore || !cursor) return;
    const generation = queryGeneration.current;
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams({ limit: '30', cursor });
      if (mimeTypePrefix) query.set('mimeTypePrefix', mimeTypePrefix);
      if (search.trim()) query.set('q', search.trim());
      const page = await adminApiClient.request<AssetPage>(`${BASE}?${query}`, {
        cache: 'no-store',
      });
      if (generation !== queryGeneration.current) return;
      setAssets((prev) => [
        ...prev,
        ...page.items.filter((asset) => !prev.some((old) => old.id === asset.id)),
      ]);
      setCursor(page.nextCursor);
      setHasMore(page.hasMore);
    } catch (cause) {
      if (generation === queryGeneration.current)
        setError(cause instanceof Error ? cause.message : t('asset_text_166'));
    } finally {
      if (generation === queryGeneration.current) setLoading(false);
    }
  }

  async function select(id: string) {
    if (!id) {
      onChange('');
      return;
    }
    if (selecting) return;
    setSelecting(true);
    setError(null);
    try {
      // The server authorizes reuse and records the selection before changing the form state.
      await adminApiClient.request(`${BASE}/${encodeURIComponent(id)}/selection-audit`, {
        method: 'POST',
        body: JSON.stringify({ purpose }),
      });
      onChange(id);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t('asset_text_167'));
    } finally {
      setSelecting(false);
    }
  }

  async function preview() {
    if (!value) return;
    if (
      !selectedOption ||
      !['application/pdf', 'image/png', 'image/jpeg', 'image/webp'].includes(
        selectedOption.metadata?.mimeType ?? '',
      )
    ) {
      setError(t('asset_text_168'));
      return;
    }
    setPreviewing(true);
    setError(null);
    try {
      const grant = await adminApiClient.request<DeliveryGrant>(
        `${BASE}/${encodeURIComponent(value)}/delivery-grant`,
        {
          method: 'POST',
          body: JSON.stringify({ expiresInSeconds: 300 }),
        },
      );
      const url = new URL(grant.url);
      if (
        url.username ||
        url.password ||
        (url.protocol !== 'https:' &&
          !(
            import.meta.env.DEV &&
            url.protocol === 'http:' &&
            ['localhost', '127.0.0.1'].includes(url.hostname)
          ))
      ) {
        throw new Error('ASSET_PREVIEW_URL_INVALID');
      }
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
      setError(cause instanceof Error ? cause.message : t('asset_text_168'));
    } finally {
      setPreviewing(false);
    }
  }

  return (
    <div className="block text-sm">
      <label className="block">
        <span className="font-bold">{label ?? t('asset_default_label')}</span>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          maxLength={160}
          placeholder={t('asset_text_169')}
          className="mt-1 w-full rounded-xl border p-2"
        />
        <select
          value={value ?? ''}
          disabled={selecting}
          onChange={(e) => void select(e.target.value)}
          className="mt-1 w-full rounded-xl border p-2"
        >
          <option value="">{t('asset_none')}</option>
          {[
            ...(selectedOption && !assets.some((asset) => asset.id === selectedOption.id)
              ? [selectedOption]
              : []),
            ...assets,
          ].map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.metadata?.originalFilename ?? asset.reference} ·{' '}
              {asset.metadata?.mimeType ?? ''} · {asset.metadata?.byteSize ?? 0} B
            </option>
          ))}
        </select>
      </label>
      {hasMore ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void loadMore()}
          className="mt-2 rounded-lg border px-3 py-1.5 text-xs disabled:opacity-50"
        >
          {loading ? t('asset_text_092') : t('asset_text_170')}
        </button>
      ) : null}
      {value ? (
        <button
          type="button"
          disabled={previewing}
          onClick={() => void preview()}
          className="mt-2 rounded-lg border px-3 py-1.5 text-xs font-bold disabled:opacity-50"
        >
          {previewing ? t('asset_text_171') : t('asset_text_172')}
        </button>
      ) : null}
      {value && (
        <section
          className="mt-2 rounded-lg border p-3 text-xs"
          aria-label={t('asset_picker_rights')}
        >
          <h3 className="font-bold">{t('asset_picker_rights')}</h3>
          {rightsLoading ? (
            <p role="status">{t('asset_picker_rights_loading')}</p>
          ) : rightsFailed ? (
            <p role="alert">{t('asset_picker_rights_failed')}</p>
          ) : !rights ? (
            <p>{t('asset_rights_unspecified')}</p>
          ) : (
            <dl>
              <dt>{t('asset_rights_source')}</dt>
              <dd>{rights.rightsSource}</dd>
              <dt>{t('asset_rights_attribution')}</dt>
              <dd>{rights.attribution || '—'}</dd>
              <dt>{t('asset_rights_scope')}</dt>
              <dd>
                {t(
                  rights.usageScope === 'PUBLIC' ? 'asset_rights_public' : 'asset_rights_internal',
                )}
              </dd>
              <dt>{t('asset_rights_policy')}</dt>
              <dd>
                {t(
                  rights.publicationPolicy === 'MANDATORY'
                    ? 'asset_rights_mandatory'
                    : 'asset_rights_advisory',
                )}
              </dd>
              {rights.expiresAt && (
                <>
                  <dt>{t('asset_rights_expires')}</dt>
                  <dd>
                    <time dateTime={rights.expiresAt}>{rights.expiresAt}</time>
                  </dd>
                </>
              )}
              <dd>
                {t(
                  rights.expiresAt && Date.parse(rights.expiresAt) <= Date.now()
                    ? 'asset_picker_rights_expired'
                    : 'asset_picker_rights_current',
                )}
              </dd>
            </dl>
          )}
        </section>
      )}
      {error ? <span className="mt-1 block text-xs text-red-600">{error}</span> : null}
    </div>
  );
}
