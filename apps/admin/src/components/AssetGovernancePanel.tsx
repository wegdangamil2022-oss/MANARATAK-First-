import { AssetRightsRenditionsPanel } from './AssetRightsRenditionsPanel';
import { useTranslation } from '../i18n/I18nProvider';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AssetActionSnapshot } from './AssetLifecycleActions';

export interface AssetGovernanceSnapshot extends AssetActionSnapshot {
  id: string;
  reference: string;
  revision?:string;
  rights?: {rightsSource:string;attribution:string;usageScope:string;publicationPolicy:string;expiresAt?:string}|null;
  rightsHistory?: Array<{actorId:string;reason:string;at:string;rights:{rightsSource:string;attribution:string;usageScope:string;publicationPolicy:string;expiresAt?:string}}>;
  ownerId: string;
  ownerType: string;
  metadata: { width?: number; height?: number; duration?: number };
  governance?: {
    createdAt: string; updatedAt: string; archivedAt: string | null;
    deletedAt: string | null; purgedAt: string | null; legalHoldUntil: string | null;
  };
  securityEvidence?: NonNullable<AssetActionSnapshot['securityEvidence']> & {
    uploadVerifiedAt?: string | null; scannedAt?: string | null; sanitizedAt?: string | null;
  };
  archiveOperation?: { operationId: string; phase: string; preparedAt: string; updatedAt: string } | null;
  restoreOperation?: { operationId: string; phase: string; preparedAt: string; updatedAt: string } | null;
  activationOperation?: {
    operationId: string; phase: string; preparedAt: string; completedAt: string | null;
  } | null;
  versions?: Array<{ versionNumber: number; createdAt: string; checksum: { algorithm: string; hash: string } | null }>;
}


export function AssetGovernancePanel({ asset }: { asset: AssetGovernanceSnapshot }) {
  const { t, language } = useTranslation();
  function readableDate(value?: string | null): string {
  if (!value) return t('asset_text_077');
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString(language) : t('asset_text_100');
}

  const [copyStatus, setCopyStatus] = useState('');
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus(t('asset_text_101'));
    } catch {
      setCopyStatus(t('asset_text_102'));
    }
  };
  // Only actual Admin owner routes are supported; unknown owner types stay explicit text.
  const ownerPath = asset.ownerType === 'COURSE' ? `/courses/${encodeURIComponent(asset.ownerId)}`
    : asset.ownerType === 'UNIVERSITY' ? `/universities/${encodeURIComponent(asset.ownerId)}` : null;
  const timeline = [
    [t('asset_text_103'), asset.governance?.createdAt],
    [t('asset_text_104'), asset.securityEvidence?.uploadVerifiedAt],
    [t('asset_text_105'), asset.securityEvidence?.scannedAt],
    [t('asset_text_106'), asset.securityEvidence?.sanitizedAt],
    [t('asset_text_107'), asset.activationOperation?.preparedAt],
    [t('asset_text_108'), asset.activationOperation?.completedAt],
    [t('asset_text_109'), asset.governance?.updatedAt],
    [t('asset_text_110'), asset.governance?.archivedAt],
    [t('asset_text_111'), asset.governance?.deletedAt],
    [t('asset_text_112'), asset.governance?.purgedAt],
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  timeline.sort((a, b) => Date.parse(a[1]) - Date.parse(b[1]));
  return <div className="mt-4 space-y-4 border-t pt-4">
    {asset.revision && <AssetRightsRenditionsPanel asset={asset} />}
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded-lg border px-3 py-2" onClick={() => void copy(asset.id)}>{t('asset_text_113')}{' '}</button>
      <button type="button" className="rounded-lg border px-3 py-2" onClick={() => void copy(asset.reference)}>{t('asset_text_114')}{' '}</button>
      {ownerPath ? <Link className="rounded-lg border px-3 py-2" to={ownerPath}>{t('asset_text_115')}{' '}</Link>
        : <span className="p-2 text-slate-500">{t('asset_text_116')}{' '}</span>}
    </div>
    <p role="status">{copyStatus}</p>
    <dl className="grid gap-3 md:grid-cols-3">
      <div><dt>{t('asset_text_117')}{' '}</dt><dd>{asset.metadata.width != null && asset.metadata.height != null
        ? `${asset.metadata.width} × ${asset.metadata.height}` : t('asset_text_118')}</dd></div>
      <div><dt>{t('asset_text_119')}{' '}</dt><dd>{asset.metadata.duration ?? t('asset_text_118')}</dd></div>
      <div><dt>{t('asset_text_120')}{' '}</dt><dd>{asset.governance
        ? (asset.governance.legalHoldUntil ? readableDate(asset.governance.legalHoldUntil) : t('asset_text_121'))
        : t('asset_text_122')}</dd></div>
    </dl>
    {asset.archiveOperation && asset.archiveOperation.phase !== 'COMPLETED' && <p role="status">
      {t('asset_text_123')}{' '}{' · '}{readableDate(asset.archiveOperation.updatedAt)}
    </p>}
    {asset.restoreOperation && <p role="status">
      {['COMPLETED', 'CANCELLED'].includes(asset.restoreOperation.phase)
        ? t('asset_text_124') : t('asset_text_125')}
      {' · '}{readableDate(asset.restoreOperation.updatedAt)}
    </p>}
    {asset.activationOperation && <p>{t('asset_text_126')}{' '}<code>{asset.activationOperation.operationId}</code> — {asset.activationOperation.phase}</p>}
    <section aria-label={t('asset_text_127')}>
      <h3 className="font-bold">{t('asset_text_127')}{' '}</h3>
      <p className="my-2 text-slate-500">{t('asset_text_128')}{' '}</p>
      {timeline.length ? <ol className="list-inside list-decimal space-y-1">
        {timeline.map(([label, date]) => <li key={label}>{label}: <time dateTime={date}>{readableDate(date)}</time></li>)}
      </ol> : <p>{t('asset_text_129')}{' '}</p>}
    </section>
    <section aria-label={t('asset_text_130')}>
      <h3 className="font-bold">{t('asset_text_130')}{' '}</h3>
      {asset.versions?.length ? <ul className="mt-2 space-y-2">
        {asset.versions.map(version => <li key={version.versionNumber} className="rounded-lg bg-slate-50 p-2">
          {t('asset_text_131')}{' '}{version.versionNumber} — {readableDate(version.createdAt)}
          {version.checksum ? <code dir="ltr" className="block break-all">{version.checksum.algorithm}: {version.checksum.hash}</code>
            : <span> {t('asset_text_132')}{' '}</span>}
        </li>)}
      </ul> : <p className="mt-2">{t('asset_text_133')}{' '}</p>}
    </section>
  </div>;
}
