import { useState, useRef, useEffect } from 'react';
import { adminApiClient } from '../api/client';
import { useTranslation } from '../i18n/I18nProvider';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useOwnerOperationScope } from '../security/useOwnerOperationScope';

export function AIConfigurationOperations({
  resource,
  record,
  candidate,
}: {
  resource: string;
  record: { key: string; updatedAt?: unknown };
  candidate: string;
}) {
  const { language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const text = (ar: string, en: string) => (language === 'en' ? en : ar);
  const [revision, setRevision] = useState('');
  const [reason, setReason] = useState('');
  const [incident, setIncident] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const owner = useOwnerOperationScope(`${resource}:${record.key}`);
  useEffect(() => {
    lock.current = false;
    setBusy(false);
    setResult(null);
    setRevision('');
    setError('');
    setReason('');
    setIncident('');
  }, [owner]);
  if (
    !['guardrails', 'routingPolicies', 'consumers', 'evaluations', 'platformSettings'].includes(
      resource,
    )
  )
    return null;
  const authorPermission =
    resource === 'guardrails' || resource === 'platformSettings'
      ? 'admin:ai:safety:manage'
      : resource === 'consumers'
        ? 'admin:ai:cost:manage'
        : 'admin:ai:configure';
  async function act(action: 'STAGE' | 'APPROVE' | 'ACTIVATE' | 'ROLLBACK') {
    if (lock.current || !owner.isCurrent() || !reason.trim()) return;
    const permission =
      action === 'APPROVE'
        ? 'admin:ai:prompt:review'
        : action === 'ACTIVATE'
          ? 'admin:ai:deploy'
          : authorPermission;
    if (!hasPermission(permission)) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const response = await adminApiClient.request<Record<string, unknown>>(
        `/admin/ai/configuration/${resource}/${encodeURIComponent(record.key)}/${action}`,
        {
          method: 'POST',
          body: JSON.stringify({
            reason,
            ...(incident ? { incidentReference: incident } : {}),
            ...(action === 'STAGE'
              ? { configuration: JSON.parse(candidate) }
              : { revisionKey: revision }),
            ...(record.updatedAt ? { expectedUpdatedAt: record.updatedAt } : {}),
          }),
        },
      );
      if (!owner.isCurrent()) return;
      setResult(response);
      setRevision(String(response.revisionKey));
    } catch (cause) {
      if (!owner.isCurrent()) return;
      setError(
        cause instanceof Error
          ? cause.message
          : text('تعذر إكمال العملية.', 'The operation failed.'),
      );
    } finally {
      if (owner.isCurrent()) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  async function load() {
    if (lock.current || !owner.isCurrent()) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await adminApiClient.request(
        `/admin/ai/configuration/${resource}/${encodeURIComponent(record.key)}/revisions`,
      );
      if (owner.isCurrent()) setResult(result);
    } catch (cause) {
      if (!owner.isCurrent()) return;
      setError(
        cause instanceof Error
          ? cause.message
          : text('تعذر تحميل المراجعات.', 'Could not load revisions.'),
      );
    } finally {
      if (owner.isCurrent()) {
        lock.current = false;
        setBusy(false);
      }
    }
  }
  return (
    <section className="mt-5 space-y-3 rounded-xl border p-4">
      <h5 className="font-bold">
        {text('تجهيز ومراجعة وتفعيل السياسة', 'Stage, review and activate policy')}
      </h5>
      <p className="text-xs">
        {text(
          'تبقى النسخة النشطة أثناء المراجعة. المؤلف والمراجع والمنفذ أشخاص مختلفون. الاستعادة تنشئ مراجعة جديدة.',
          'The active version remains live during review. Author, reviewer and deployer must differ. Rollback creates a new review.',
        )}
      </p>
      <label className="block">
        {text('سبب التغيير', 'Change reason')}
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={1000}
        />
      </label>
      <label className="block">
        {text('معرف المراجعة', 'Revision ID')}
        <input className="input" value={revision} onChange={(e) => setRevision(e.target.value)} />
      </label>
      {hasPermission('admin:ai:break-glass') && (
        <label className="block">
          {text('مرجع حادثة طارئة (اختياري)', 'Emergency incident reference (optional)')}
          <input className="input" value={incident} onChange={(e) => setIncident(e.target.value)} />
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="action-secondary"
          disabled={busy}
          onClick={() => void load()}
        >
          {text('عرض المراجعات', 'View revisions')}
        </button>
        {(['STAGE', 'APPROVE', 'ACTIVATE', 'ROLLBACK'] as const).map((action) => (
          <button
            type="button"
            key={action}
            className="action-secondary"
            disabled={
              busy ||
              reason.trim().length < 3 ||
              (action !== 'STAGE' && !revision) ||
              !hasPermission(
                action === 'APPROVE'
                  ? 'admin:ai:prompt:review'
                  : action === 'ACTIVATE'
                    ? 'admin:ai:deploy'
                    : authorPermission,
              )
            }
            onClick={() => void act(action)}
          >
            {action === 'STAGE'
              ? text('تجهيز', 'Stage')
              : action === 'APPROVE'
                ? text('اعتماد', 'Approve')
                : action === 'ACTIVATE'
                  ? text('تفعيل', 'Activate')
                  : text('تجهيز استعادة', 'Stage rollback')}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {result != null && (
        <pre dir="ltr" className="max-h-64 overflow-auto text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}

export function AICostReconciliation({ publicId }: { publicId: string }) {
  const { language } = useTranslation();
  const { hasPermission } = useAdminAuthorization();
  const text = (ar: string, en: string) => (language === 'en' ? en : ar);
  const [evidence, setEvidence] = useState({
    tokens: 0,
    cost: 0,
    currency: 'USD',
    reference: '',
    reason: '',
  });
  const [revision, setRevision] = useState('');
  const [result, setResult] = useState<unknown>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  if (!hasPermission('admin:ai:cost:manage')) return null;
  async function act(action: 'LOAD' | 'PROPOSE' | 'APPROVE') {
    if (lock.current || !hasPermission('admin:ai:cost:manage')) return;
    lock.current = true;
    setBusy(true);
    setError('');
    try {
      const base = `/admin/ai/executions/${encodeURIComponent(publicId)}/reconciliation`;
      const response = await adminApiClient.request<Record<string, unknown>>(
        action === 'LOAD' ? base : `${base}/${action}`,
        action === 'LOAD'
          ? undefined
          : { method: 'POST', body: JSON.stringify({ ...evidence, expectedUpdatedAt: revision }) },
      );
      setResult(response);
      setRevision(String(response.updatedAt));
      if (action === 'LOAD' && response.proposal) {
        const proposal = response.proposal as typeof evidence;
        setEvidence({
          tokens: proposal.tokens,
          cost: proposal.cost,
          currency: proposal.currency,
          reference: proposal.reference,
          reason: proposal.reason,
        });
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : text('تعذرت التسوية.', 'Reconciliation failed.'),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="mt-4 space-y-3 rounded-xl border p-4">
      <h5 className="font-bold">{text('تسوية التكلفة المجهولة', 'Reconcile unknown cost')}</h5>
      <p className="text-xs">
        {text(
          'تبقى الميزانية محجوزة حتى تقديم دليل واعتماده من شخص مستقل. إلغاء الطلب لا يثبت توقف الفوترة.',
          'Budget stays reserved until evidence receives independent approval. Cancellation does not prove billing stopped.',
        )}
      </p>
      {(['tokens', 'cost', 'currency', 'reference', 'reason'] as const).map((field) => (
        <label key={field} className="block">
          {text(
            {
              tokens: 'التوكنات',
              cost: 'التكلفة',
              currency: 'العملة',
              reference: 'مرجع دليل المزوّد',
              reason: 'السبب',
            }[field],
            {
              tokens: 'Tokens',
              cost: 'Cost',
              currency: 'Currency',
              reference: 'Provider evidence reference',
              reason: 'Reason',
            }[field],
          )}
          <input
            className="input"
            type={field === 'tokens' || field === 'cost' ? 'number' : 'text'}
            min="0"
            step={field === 'cost' ? 'any' : '1'}
            value={evidence[field]}
            onChange={(e) =>
              setEvidence({
                ...evidence,
                [field]:
                  field === 'tokens' || field === 'cost' ? Number(e.target.value) : e.target.value,
              })
            }
          />
        </label>
      ))}
      <div className="flex gap-2">
        {(['LOAD', 'PROPOSE', 'APPROVE'] as const).map((action) => (
          <button
            key={action}
            type="button"
            className="action-secondary"
            disabled={
              busy || (action !== 'LOAD' && (!revision || !evidence.reference || !evidence.reason))
            }
            onClick={() => void act(action)}
          >
            {action === 'LOAD'
              ? text('تحميل الدليل', 'Load evidence')
              : action === 'PROPOSE'
                ? text('اقتراح تسوية', 'Propose settlement')
                : text('اعتماد مستقل', 'Independent approval')}
          </button>
        ))}
      </div>
      {error && <p role="alert">{error}</p>}
      {result != null && (
        <pre dir="ltr" className="max-h-64 overflow-auto text-xs">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </section>
  );
}
