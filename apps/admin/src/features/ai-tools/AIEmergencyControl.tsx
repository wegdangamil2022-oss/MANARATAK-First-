import { useRef, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { ReadState, useWorkspaceCopy, useWorkspaceRead, WorkspacePanel } from './Workspace';
export function AIEmergencyControl() {
  const { c } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const allowed = hasPermission('admin:ai:safety:manage');
  const read = useWorkspaceRead<{ globalEnabled: boolean; updatedAt: string }>(
    allowed ? '/admin/ai/platformSettings/runtime' : null,
  );
  const [reason, setReason] = useState(''),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState(false);
  const lock = useRef(false);
  if (!allowed) return null;
  const stop = async () => {
    if (lock.current || !read.data || !read.data.globalEnabled || reason.trim().length < 3) return;
    if (
      !window.confirm(
        c(
          'سيُمنع بدء طلبات AI الجديدة. الطلبات الجارية قد تستمر وتُحسب تكلفتها، والأدوات المستقلة عن AI لا تتوقف. تأكيد الإيقاف؟',
          'New AI requests will be blocked. Running requests may continue and incur costs. Non-AI tools remain independent. Confirm stop?',
        ),
      )
    )
      return;
    lock.current = true;
    setBusy(true);
    setError(false);
    setMessage('');
    try {
      await adminApiClient.request('/admin/ai/runtime/emergency-disable', {
        method: 'POST',
        body: JSON.stringify({ expectedUpdatedAt: read.data.updatedAt, reason }),
      });
      const fresh = await adminApiClient.request<{ globalEnabled: boolean }>(
        '/admin/ai/platformSettings/runtime',
      );
      if (fresh.globalEnabled !== false) throw new Error('UNCONFIRMED');
      setMessage(
        c(
          'تأكد إيقاف الطلبات الجديدة. إعادة التفعيل من مسار الاعتماد.',
          'New requests are confirmed disabled. Re-enable through governed approval.',
        ),
      );
      setReason('');
      await read.load();
    } catch {
      setError(true);
      await read.load();
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <WorkspacePanel title={c('التحكم في الطوارئ', 'Emergency control')}>
      <ReadState state={read} />
      <p>
        {c(
          'إيقاف موثق لطلبات AI الجديدة؛ لا يعيد تفعيل الخدمة ولا يلغي الطلبات الجارية ضمنيًا.',
          'Audited stop for new AI requests; it neither re-enables service nor implicitly cancels running requests.',
        )}
      </p>
      {read.data && (
        <p>
          {read.data.globalEnabled
            ? c(
                'استقبال طلبات AI مفعّل بحسب الإعدادات.',
                'AI request admission is enabled in configuration.',
              )
            : c('استقبال طلبات AI متوقف.', 'AI request admission is disabled.')}
        </p>
      )}
      <label>
        {c('سبب الإيقاف', 'Stop reason')}
        <input
          value={reason}
          maxLength={1000}
          disabled={busy}
          onChange={(event) => setReason(event.target.value)}
        />
      </label>
      <button
        className="certificate-danger"
        disabled={busy || !read.data?.globalEnabled || reason.trim().length < 3}
        onClick={() => void stop()}
      >
        <ShieldAlert />
        {c('إيقاف AI للطوارئ', 'Emergency AI stop')}
      </button>
      {message && (
        <p role="status" className="certificate-notice">
          {message}
        </p>
      )}
      {error && (
        <p role="alert" className="certificate-notice certificate-error">
          {c(
            'لم يتأكد الإيقاف. تحقق من الحالة بعد التحديث.',
            'Stop could not be confirmed. Check refreshed state.',
          )}
        </p>
      )}
    </WorkspacePanel>
  );
}
