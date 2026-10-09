import { useState } from 'react';
import { adminApiClient } from '../api/client';

const allowed: Record<string, Array<{ action: string; label: string; destructive?: boolean }>> = {
  INITIATED: [{ action: 'finalize-upload', label: 'تأكيد وصول الملف' }],
  QUARANTINED: [{ action: 'validate', label: 'فحص الملف أمنيًا' }],
  VALIDATING: [{ action: 'sanitize', label: 'تنظيف الملف وإعادة فحصه' }],
  SANITIZING: [{ action: 'activate', label: 'تفعيل الملف بعد إثبات الأمان' }],
  ACTIVE: [{ action: 'archive', label: 'أرشفة الأصل', destructive: true }],
  ARCHIVED: [{ action: 'archive', label: 'إعادة محاولة نقل الأرشيف' }],
  DELETED: [{ action: 'restore', label: 'استعادة الأصل' }],
};

export function AssetLifecycleActions({
  assetId, state, onUpdated,
}: { assetId: string; state: string; onUpdated: () => Promise<void> }) {
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function execute(action: string, destructive: boolean) {
    if (pending) return;
    setPending(action); setError(null);
    try {
      if (destructive) {
        const impact = await adminApiClient.request<{ inUse: boolean; usages: unknown[] }>(
          `/admin/assets/${encodeURIComponent(assetId)}/usages`, { cache: 'no-store' },
        );
        if (impact.inUse) throw new Error('الأصل مستخدم في أقسام أخرى؛ الأرشفة ممنوعة.');
        if (!window.confirm('تأكيد أرشفة هذا الملف بعد فحص الارتباطات؟')) return;
      }
      await adminApiClient.request(`/admin/assets/${encodeURIComponent(assetId)}/${action}`, {
        method: 'POST', body: JSON.stringify({}),
      });
      await onUpdated();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذّر تنفيذ الإجراء');
    } finally {
      setPending(null);
    }
  }

  return <div className="mt-4 flex flex-wrap items-center gap-2">
    {(allowed[state] ?? []).map((entry) => (
      <button type="button" key={entry.action} disabled={pending !== null}
        onClick={() => void execute(entry.action, Boolean(entry.destructive))}
        className="rounded-lg border px-3 py-2 text-xs font-bold disabled:opacity-50">
        {pending === entry.action ? 'جارٍ التنفيذ…' : entry.label}
      </button>
    ))}
    {!allowed[state] && <span className="text-xs text-slate-500">لا توجد إجراءات متاحة لهذه الحالة.</span>}
    {error && <p role="alert" className="w-full text-xs text-red-700">{error}</p>}
  </div>;
}
