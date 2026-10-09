import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { AssetActionSnapshot } from './AssetLifecycleActions';

export interface AssetGovernanceSnapshot extends AssetActionSnapshot {
  id: string;
  reference: string;
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
  activationOperation?: {
    operationId: string; phase: string; preparedAt: string; completedAt: string | null;
  } | null;
  versions?: Array<{ versionNumber: number; createdAt: string; checksum: { algorithm: string; hash: string } | null }>;
}

function readableDate(value?: string | null): string {
  if (!value) return 'غير مسجل';
  const date = new Date(value);
  return Number.isFinite(date.getTime()) ? date.toLocaleString('ar') : 'تاريخ غير صالح';
}

export function AssetGovernancePanel({ asset }: { asset: AssetGovernanceSnapshot }) {
  const [copyStatus, setCopyStatus] = useState('');
  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopyStatus('تم النسخ');
    } catch {
      setCopyStatus('تعذر النسخ؛ يمكنك تحديد المعرف أو المرجع ونسخه يدويًا.');
    }
  };
  // Only actual Admin owner routes are supported; unknown owner types stay explicit text.
  const ownerPath = asset.ownerType === 'COURSE' ? `/courses/${encodeURIComponent(asset.ownerId)}`
    : asset.ownerType === 'UNIVERSITY' ? `/universities/${encodeURIComponent(asset.ownerId)}` : null;
  const timeline = [
    ['إنشاء السجل', asset.governance?.createdAt],
    ['التحقق من الرفع', asset.securityEvidence?.uploadVerifiedAt],
    ['آخر فحص للملف', asset.securityEvidence?.scannedAt],
    ['التنظيف المسجل', asset.securityEvidence?.sanitizedAt],
    ['بدء محاولة التفعيل', asset.activationOperation?.preparedAt],
    ['اكتمال محاولة التفعيل', asset.activationOperation?.completedAt],
    ['آخر تحديث للسجل', asset.governance?.updatedAt],
    ['الأرشفة المسجلة', asset.governance?.archivedAt],
    ['الحذف المنطقي المسجل', asset.governance?.deletedAt],
    ['التطهير المسجل', asset.governance?.purgedAt],
  ].filter((entry): entry is [string, string] => typeof entry[1] === 'string');
  timeline.sort((a, b) => Date.parse(a[1]) - Date.parse(b[1]));
  return <div className="mt-4 space-y-4 border-t pt-4">
    <div className="flex flex-wrap gap-2">
      <button type="button" className="rounded-lg border px-3 py-2" onClick={() => void copy(asset.id)}>نسخ معرف الأصل</button>
      <button type="button" className="rounded-lg border px-3 py-2" onClick={() => void copy(asset.reference)}>نسخ مرجع الأصل</button>
      {ownerPath ? <Link className="rounded-lg border px-3 py-2" to={ownerPath}>فتح سجل المالك</Link>
        : <span className="p-2 text-slate-500">مسار المالك غير متاح لهذا النوع</span>}
    </div>
    <p role="status">{copyStatus}</p>
    <dl className="grid gap-3 md:grid-cols-3">
      <div><dt>الأبعاد</dt><dd>{asset.metadata.width != null && asset.metadata.height != null
        ? `${asset.metadata.width} × ${asset.metadata.height}` : 'غير مسجلة'}</dd></div>
      <div><dt>المدة بالثواني</dt><dd>{asset.metadata.duration ?? 'غير مسجلة'}</dd></div>
      <div><dt>الحجز القانوني حتى</dt><dd>{asset.governance
        ? (asset.governance.legalHoldUntil ? readableDate(asset.governance.legalHoldUntil) : 'لا يوجد حجز مؤرخ مسجل')
        : 'تعذر تحديد حالة الحجز'}</dd></div>
    </dl>
    {asset.activationOperation && <p>محاولة التفعيل: <code>{asset.activationOperation.operationId}</code> — {asset.activationOperation.phase}</p>}
    <section aria-label="أدلة المعالجة المسجلة">
      <h3 className="font-bold">أدلة المعالجة المسجلة</h3>
      <p className="my-2 text-slate-500">هذه آخر الأدلة المحفوظة، وليست سجل تدقيق كاملًا لجميع المحاولات.</p>
      {timeline.length ? <ol className="list-inside list-decimal space-y-1">
        {timeline.map(([label, date]) => <li key={label}>{label}: <time dateTime={date}>{readableDate(date)}</time></li>)}
      </ol> : <p>لا توجد تواريخ أدلة مسجلة.</p>}
    </section>
    <section aria-label="سجل نسخ الأصل">
      <h3 className="font-bold">سجل نسخ الأصل</h3>
      {asset.versions?.length ? <ul className="mt-2 space-y-2">
        {asset.versions.map(version => <li key={version.versionNumber} className="rounded-lg bg-slate-50 p-2">
          نسخة {version.versionNumber} — {readableDate(version.createdAt)}
          {version.checksum ? <code dir="ltr" className="block break-all">{version.checksum.algorithm}: {version.checksum.hash}</code>
            : <span> — لا توجد بصمة مسجلة لهذه النسخة</span>}
        </li>)}
      </ul> : <p className="mt-2">لا يوجد سجل نسخ محفوظ؛ لا يتم إنشاء نسخ أو روابط تنزيل ضمن هذا العرض.</p>}
    </section>
  </div>;
}
