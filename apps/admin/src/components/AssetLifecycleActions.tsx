import { useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../api/client';

export interface AssetActionSnapshot {
  id: string;
  lifecycleState: string;
  securityEvidence?: {
    uploadConfirmed: boolean;
    malwareStatus: 'PASSED' | 'FAILED' | null;
    sanitized: boolean;
    activationPhase?: 'PREPARED' | 'COMPLETED' | null;
  };
}
type Action = 'finalize-upload' | 'validate' | 'sanitize' | 'activate' | 'archive' | 'delete' | 'restore';
const labels: Record<Action, string> = {
  'finalize-upload': 'التحقق من اكتمال الرفع', validate: 'فحص الملف', sanitize: 'تنظيف الملف',
  activate: 'تفعيل الملف المتحقق منه', archive: 'أرشفة الملف', delete: 'حذف منطقي', restore: 'استعادة الملف',
};
export function availableAssetActions(asset: AssetActionSnapshot): Action[] {
  const evidence = asset.securityEvidence;
  switch (asset.lifecycleState) {
    case 'INITIATED': return ['finalize-upload', 'delete'];
    case 'QUARANTINED': return [evidence?.uploadConfirmed ? 'validate' : 'finalize-upload', 'delete'];
    case 'VALIDATING': return evidence?.malwareStatus === 'PASSED' ? ['sanitize', 'delete'] : ['delete'];
    case 'SANITIZING': if (evidence?.activationPhase === 'PREPARED') return ['activate'];
      return evidence?.uploadConfirmed && evidence.malwareStatus === 'PASSED' && evidence.sanitized ? ['activate', 'delete'] : ['delete'];
    case 'ACTIVE': return ['archive', 'delete'];
    case 'ARCHIVED': return ['archive', 'delete']; // Retry interrupted provider archival; never imply restore is supported here.
    case 'MALWARE_SCAN_FAILED': return ['delete'];
    case 'DELETED': return ['restore'];
    default: return [];
  }
}
export function shouldStartNewAssetAttempt(error: unknown): boolean {
  // Canonical middleware durably caches terminal HTTP failures. A new explicit
  // recovery attempt gets a fresh HTTP key; ambiguous transport retries keep it.
  return error instanceof Error && /^\[[45]\d{2}\]/.test(error.message) &&
    !error.message.includes('IDEMPOTENCY_REQUEST_IN_PROGRESS');
}
export async function executeAssetAction(assetId: string, action: Action, key: string) {
  return adminApiClient.request(`/admin/assets/${encodeURIComponent(assetId)}${action === 'delete' ? '' : '/' + action}`, {
    method: action === 'delete' ? 'DELETE' : 'POST', body: JSON.stringify({}), idempotencyKey: key,
  });
}
export function AssetLifecycleActions({ asset, onChanged }: { asset: AssetActionSnapshot; onChanged: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [confirmation, setConfirmation] = useState<{ action: 'archive' | 'delete'; count: number } | null>(null);
  const running = useRef(false);
  const retryKeys = useRef(new Map<Action, string>());
  async function execute(action: Action) {
    if (running.current) return;
    running.current = true; setBusy(true); setError('');
    const key = retryKeys.current.get(action) ?? createAdminIdempotencyKey();
    retryKeys.current.set(action, key);
    try {
      await executeAssetAction(asset.id, action, key);
      retryKeys.current.delete(action);
      setConfirmation(null);
      await onChanged();
    } catch (failure) {
      if (shouldStartNewAssetAttempt(failure)) retryKeys.current.delete(action);
      setError('تعذر إتمام الإجراء أو تحديث حالته. حدّث التفاصيل قبل إعادة المحاولة؛ قد يكون الإجراء محفوظًا.');
      try { await onChanged(); } catch { /* Keep the command failure visible if refresh also fails. */ }
    }
    finally { running.current = false; setBusy(false); }
  }
  async function prepare(action: Action) {
    if (action !== 'archive' && action !== 'delete') return execute(action);
    if (running.current) return;
    running.current = true; setBusy(true); setError(''); setConfirmation(null);
    try {
      const impact = await adminApiClient.request<{ assetId: string; inUse: boolean; usages: unknown[] }>(
        `/admin/assets/${encodeURIComponent(asset.id)}/usages`, { cache: 'no-store' });
      if (impact.assetId !== asset.id || !Array.isArray(impact.usages) || typeof impact.inUse !== 'boolean') {
        throw new Error('INVALID_USAGE_RESPONSE');
      }
      if (impact.inUse || impact.usages.length > 0) { setError('الأصل مرتبط بمحتوى؛ لا يمكن أرشفته أو حذفه.'); return; }
      setConfirmation({ action, count: impact.usages.length });
    } catch { setError('تعذر التحقق من الاستخدامات؛ لم يُنفّذ الإجراء.'); }
    finally { running.current = false; setBusy(false); }
  }
  return <div className="mt-4 rounded-lg border p-3">
    <h3 className="font-bold">إجراءات دورة الحياة</h3>
    <p className="my-2 text-slate-500">يتحقق الخادم من الحالة والصلاحيات والأدلة عند كل إجراء. الحذف هنا منطقي؛ لا يوجد حذف نهائي في هذه الواجهة.</p>
    <div className="flex flex-wrap gap-2">{availableAssetActions(asset).map(action =>
      <button key={action} type="button" disabled={busy || confirmation !== null}
        className="rounded-lg border px-3 py-2 disabled:opacity-50" onClick={() => void prepare(action)}>
        {labels[action]}
      </button>)}</div>
    {confirmation && <div role="group" aria-label="تأكيد الإجراء" className="mt-3">
      <p>لم تُرصد استخدامات ({confirmation.count}). سيعيد الخادم فحصها عند التنفيذ. تأكيد {labels[confirmation.action]}؟</p>
      <button type="button" disabled={busy} onClick={() => void execute(confirmation.action)} className="mt-2 rounded border px-3 py-2">تأكيد الإجراء</button>
      <button type="button" disabled={busy} onClick={() => setConfirmation(null)} className="mr-2 rounded border px-3 py-2">إلغاء</button>
    </div>}
    {busy && <p role="status">جارٍ التحقق والتنفيذ…</p>}
    {error && <p role="alert" className="mt-2 text-red-700">{error}</p>}
  </div>;
}
