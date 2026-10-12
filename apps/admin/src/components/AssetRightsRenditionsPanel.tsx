import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { AssetPicker } from './AssetPicker';
interface Rights {
  rightsSource: string;
  attribution: string;
  usageScope: string;
  publicationPolicy: string;
  expiresAt?: string;
}
interface Rendition {
  id: string;
  variantKey: string;
  version: number;
  status: string;
  generatedAssetId: string | null;
  evidence?: {
    width: number;
    height: number;
    byteSize: number;
    mimeType: string;
    checksumSha256: string;
  } | null;
}
interface Details {
  id: string;
  revision?: string;
  rights?: Rights | null;
  rightsHistory?: Array<{ actorId: string; reason: string; at: string; rights: Rights }>;
}
export function AssetRightsRenditionsPanel({ asset }: { asset: Details }) {
  const { t, language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const [current, setCurrent] = useState(asset),
    [rows, setRows] = useState<Rendition[]>([]),
    [source, setSource] = useState(asset.rights?.rightsSource ?? ''),
    [attribution, setAttribution] = useState(asset.rights?.attribution ?? ''),
    [scope, setScope] = useState(asset.rights?.usageScope ?? 'INTERNAL'),
    [policy, setPolicy] = useState(asset.rights?.publicationPolicy ?? 'ADVISORY'),
    [expires, setExpires] = useState(asset.rights?.expiresAt?.slice(0, 16) ?? ''),
    [reason, setReason] = useState('');
  const [variant, setVariant] = useState('thumbnail'),
    [child, setChild] = useState(''),
    [status, setStatus] = useState('MISSING'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const attempt = useRef<{ signature: string; key: string } | null>(null),
    preview = useRef<{ url: string; revoke: boolean } | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const root = '/admin/assets/' + encodeURIComponent(asset.id);
  const reload = async () => {
    const [details, renditions] = await Promise.all([
      adminApiClient.request<Details>(root),
      adminApiClient.request<{ data: Rendition[] }>(root + '/renditions'),
    ]);
    setCurrent(details);
    setRows(renditions.data);
  };
  useEffect(() => {
    let active = true;
    adminApiClient
      .request<{ data: Rendition[] }>(root + '/renditions')
      .then((result) => {
        if (active) setRows(result.data);
      })
      .catch(() => {
        if (active) setError(t('asset_rights_failed'));
      });
    return () => {
      active = false;
      if (preview.current?.revoke) URL.revokeObjectURL(preview.current.url);
    };
  }, [root]);
  const mutate = async (path: string, payload: unknown, method = 'PUT') => {
    if (busy) return;
    setBusy(true);
    setError('');
    const signature = JSON.stringify([path, payload, method]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, key: createAdminIdempotencyKey() };
    try {
      await adminApiClient.request(root + path, {
        method,
        body: JSON.stringify(payload),
        idempotencyKey: attempt.current.key,
      });
      attempt.current = null;
      await reload();
    } catch {
      setError(t('asset_rights_failed'));
    } finally {
      setBusy(false);
    }
  };
  const input = (
    label: Parameters<typeof t>[0],
    value: string,
    set: (v: string) => void,
    type = 'text',
  ) => (
    <label className="block">
      {t(label)}
      <input
        className="block w-full rounded border p-2"
        type={type}
        value={value}
        maxLength={2000}
        onChange={(e) => set(e.target.value)}
      />
    </label>
  );
  return (
    <section className="space-y-4 rounded-lg border p-4">
      <h3 className="font-bold">{t('asset_rights_title')}</h3>
      {!current.rights && <p>{t('asset_rights_unspecified')}</p>}
      {error && <p role="alert">{error}</p>}
      <fieldset disabled={busy || !current.revision} className="space-y-3">
        {input('asset_rights_source', source, setSource)}
        {input('asset_rights_attribution', attribution, setAttribution)}
        <label>
          {t('asset_rights_scope')}
          <select value={scope} onChange={(e) => setScope(e.target.value)}>
            <option value="PUBLIC">{t('asset_rights_public')}</option>
            <option value="INTERNAL">{t('asset_rights_internal')}</option>
          </select>
        </label>
        <label>
          {t('asset_rights_policy')}
          <select value={policy} onChange={(e) => setPolicy(e.target.value)}>
            <option value="ADVISORY">{t('asset_rights_advisory')}</option>
            <option value="MANDATORY">{t('asset_rights_mandatory')}</option>
          </select>
        </label>
        {input('asset_rights_expires', expires, setExpires, 'datetime-local')}
        {input('asset_rights_reason', reason, setReason)}
        <button
          type="button"
          disabled={!source.trim() || reason.trim().length < 6}
          onClick={() => {
            void mutate('/rights', {
              expectedRevision: current.revision,
              reason,
              rights: {
                rightsSource: source,
                attribution,
                usageScope: scope,
                publicationPolicy: policy,
                ...(expires ? { expiresAt: new Date(expires + 'Z').toISOString() } : {}),
              },
            });
          }}
        >
          {t('asset_rights_save')}
        </button>
      </fieldset>
      <details>
        <summary>{t('asset_rights_history')}</summary>
        <ul>
          {current.rightsHistory?.map((item, index) => (
            <li key={index}>
              {item.actorId} — {new Date(item.at).toLocaleString(language)} — {item.reason}
              <p>{item.rights.attribution}</p>
            </li>
          ))}
        </ul>
      </details>
      <h3 className="font-bold">{t('asset_renditions_title')}</h3>
      <p>{t('asset_renditions_help')}</p>
      <ul>
        {rows.map((row) => (
          <li key={row.id}>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                void mutate(
                  '/renditions/' + encodeURIComponent(row.variantKey),
                  { expectedVersion: row.version },
                  'DELETE',
                )
              }
            >
              {t('asset_renditions_unlink')}
            </button>
            <button
              type="button"
              onClick={() => {
                setVariant(row.variantKey);
                setChild(row.generatedAssetId ?? '');
                setStatus(row.status);
              }}
            >
              {row.variantKey} —{' '}
              {t(('asset_renditions_' + row.status.toLowerCase()) as Parameters<typeof t>[0])}
            </button>
            {row.status === 'READY' && row.evidence && (
              <>
                <p>
                  {row.evidence.width}×{row.evidence.height} —{' '}
                  {row.evidence.byteSize.toLocaleString(language)} — {row.evidence.mimeType}
                </p>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const result = await adminApiClient.request<{
                        data: { url: string; headers: Record<string, string>; expiresAt: string };
                      }>(root + '/renditions/' + encodeURIComponent(row.variantKey) + '/delivery');
                      if (preview.current?.revoke) URL.revokeObjectURL(preview.current.url);
                      const grant = result.data;
                      let url = grant.url,
                        revoke = false;
                      if (Object.keys(grant.headers ?? {}).length) {
                        const response = await fetch(grant.url, { headers: grant.headers });
                        if (!response.ok) throw new Error('PREVIEW_FAILED');
                        url = URL.createObjectURL(await response.blob());
                        revoke = true;
                      }
                      preview.current = { url, revoke };
                      setPreviewUrl(url);
                    } catch {
                      setError(t('asset_rights_failed'));
                    }
                  }}
                >
                  {t('asset_renditions_preview')}
                </button>
              </>
            )}
          </li>
        ))}
      </ul>
      {previewUrl && (
        <img src={previewUrl} alt={t('asset_renditions_preview')} className="max-h-64 max-w-full" />
      )}
      <fieldset disabled={busy} className="space-y-3">
        {input('asset_renditions_key', variant, setVariant)}
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          {['MISSING', 'READY', 'FAILED'].map((value) => (
            <option key={value} value={value}>
              {t(('asset_renditions_' + value.toLowerCase()) as Parameters<typeof t>[0])}
            </option>
          ))}
        </select>
        {status === 'READY' && hasPermission('admin:assets:reuse') && (
          <AssetPicker
            purpose="ASSET_RENDITION"
            mimeTypePrefix="image/"
            value={child}
            onChange={setChild}
            label={t('asset_renditions_child')}
          />
        )}{' '}
        {status === 'READY' &&
          !hasPermission('admin:assets:reuse') &&
          input('asset_renditions_child', child, setChild)}
        <button
          type="button"
          disabled={!/^[a-z0-9_-]{1,60}$/.test(variant) || (status === 'READY' && !child)}
          onClick={() =>
            void mutate('/renditions/' + encodeURIComponent(variant), {
              expectedVersion: rows.find((row) => row.variantKey === variant)?.version ?? 0,
              status,
              ...(status === 'READY' ? { generatedAssetId: child } : {}),
            })
          }
        >
          {t('asset_renditions_save')}
        </button>
      </fieldset>
    </section>
  );
}
