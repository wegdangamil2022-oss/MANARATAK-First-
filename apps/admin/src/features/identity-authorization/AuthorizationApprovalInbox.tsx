import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
import { ADMIN_PERMISSION_CATALOG } from '@manaratak/shared';
import { OwnerPanel, useOwnerCopy } from '../services-finance/WorkspaceUI';
type Approval = {
  id: string;
  scope: string;
  requestedBy: string;
  approverId: string;
  approvedAt: string | null;
  usedAt: string | null;
  expiresAt: string;
  payload: unknown;
};
type Change = {
  method: string;
  path: string;
  body: Record<string, unknown>;
  changeTicket: string;
  binding?: {
    role?: { id: string; name: string; permissions: string[]; revision: string };
    identity?: { id: string; displayName: string };
  };
};
export function AuthorizationApprovalInbox() {
  const { c, language } = useOwnerCopy(),
    [rows, setRows] = useState<Approval[]>([]),
    [actor, setActor] = useState(''),
    [cursor, setCursor] = useState<string | null>(null),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const lock = useRef(false),
    sequence = useRef(0),
    keys = useRef(new Map<string, string>());
  const read = useCallback(
    async (next?: string) => {
      const attempt = ++sequence.current;
      setLoading(true);
      setError('');
      try {
        const result = await adminApiClient.request<{
          data: { actorId: string; items: Approval[]; nextCursor: string | null };
        }>(
          '/admin/authorization/governance/approvals?limit=25' +
            (next ? '&cursor=' + encodeURIComponent(next) : ''),
        );
        if (attempt !== sequence.current) return;
        const changes = result.data.items.filter((row) => row.scope === 'AUTHORIZATION_CHANGE');
        setActor(result.data.actorId);
        setRows((old) => (next ? [...old, ...changes] : changes));
        setCursor(result.data.nextCursor);
      } catch {
        if (attempt === sequence.current) {
          setError(language === 'ar' ? 'تعذر قراءة طلبات الاعتماد.' : 'Could not load approvals.');
          setRows([]);
        }
      } finally {
        if (attempt === sequence.current) setLoading(false);
      }
    },
    [language],
  );
  const invalidate = useCallback(() => {
    sequence.current++;
  }, []);
  useEffect(() => {
    void read();
    return invalidate;
  }, [read, invalidate]);
  const action = async (row: Approval, approve: boolean) => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setNotice('');
    const keyId = row.id + ':' + (approve ? 'approve' : 'execute');
    if (!keys.current.has(keyId)) keys.current.set(keyId, createAdminIdempotencyKey());
    try {
      if (approve) {
        await adminApiClient.request(
          '/admin/authorization/governance/approvals/' + encodeURIComponent(row.id) + '/approve',
          { method: 'POST', body: '{}', idempotencyKey: keys.current.get(keyId) },
        );
      } else {
        const target = row.payload as Change;
        if (
          !/^(POST|PATCH|DELETE)$/.test(target.method) ||
          !/^\/(roles|assignments|policies|emergency-access)(\/|$)/.test(target.path) ||
          target.path.includes('..')
        )
          throw Error('IAM_CHANGE_TARGET_INVALID');
        await adminApiClient.request('/admin/authorization' + target.path, {
          method: target.method,
          body: JSON.stringify(target.body),
          idempotencyKey: keys.current.get(keyId),
          headers: {
            'x-governance-approval-id': row.id,
            'x-second-approver-id': row.approverId,
            'x-change-ticket': target.changeTicket,
          },
        });
      }
      keys.current.delete(keyId);
      setNotice(
        approve
          ? c(
              'سُجلت موافقتك. التنفيذ متاح لصاحب الطلب بعد إعادة التحقق.',
              'Your approval is recorded; the requester can execute after revalidation.',
            )
          : c(
              'نُفذ التغيير وأُعيدت قراءة الطلبات.',
              'The change was executed and the requests were reloaded.',
            ),
      );
      await read();
    } catch (failure) {
      setError(
        c(
          'لم يكتمل الإجراء. قد يلزم اعتماد جديد إذا تغيّر الدور أو انتهت الموافقة.',
          'The action did not complete. A changed role or expired approval may require a new request.',
        ) +
          ' ' +
          (failure instanceof Error ? failure.message : ''),
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  const label = (permission: string) => {
    const item = ADMIN_PERMISSION_CATALOG.find((item) => item.key === permission);
    return item ? (language === 'ar' ? item.labelAr : item.labelEn) : permission;
  };
  return (
    <OwnerPanel
      title={c('طلبات الموافقة المستقلة', 'Independent approval requests')}
      actions={
        <button
          type="button"
          className="sf-secondary"
          disabled={busy || loading}
          onClick={() => void read()}
        >
          {c('تحديث', 'Refresh')}
        </button>
      }
    >
      <p className="sf-notice">
        {c(
          'اختيار اسم معتمد لا يعني موافقته. يُراجع الطلب من حسابه، ثم يعيد صاحب الطلب تنفيذ النسخة المعتمدة.',
          'Naming a reviewer is not approval. The reviewer acts from their own account; the requester then executes the approved version.',
        )}
      </p>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      {loading && <p role="status">{c('جارٍ التحميل…', 'Loading…')}</p>}
      {!loading && !error && !rows.length && (
        <p className="sf-empty">{c('لا توجد طلبات موافقة.', 'No approval requests.')}</p>
      )}
      <ul className="space-y-3">
        {rows.map((row) => {
          const expired = Date.parse(row.expiresAt) <= Date.now(),
            target = row.scope === 'AUTHORIZATION_CHANGE' ? (row.payload as Change) : null;
          const rolePermissions = target?.binding?.role?.permissions ?? [];
          const granting =
            target?.method === 'POST' &&
            (target.path === '/assignments' || target.path === '/emergency-access');
          const withdrawing = target?.method === 'DELETE' || target?.path.endsWith('/retire');
          const before = granting ? [] : rolePermissions,
            after = withdrawing
              ? []
              : Array.isArray(target?.body.permissions)
                ? (target.body.permissions as string[])
                : rolePermissions;
          return (
            <li className="sf-form-section" key={row.id}>
              <div className="sf-actions">
                <strong>
                  {target ? c('تغيير وصول إداري', 'Administrative access change') : row.scope}
                </strong>
                <span>
                  {row.usedAt
                    ? c('مُنفّذ', 'Executed')
                    : expired
                      ? c('منتهي', 'Expired')
                      : row.approvedAt
                        ? c('معتمد وينتظر التنفيذ', 'Approved; awaiting execution')
                        : c('بانتظار المعتمد', 'Awaiting reviewer')}
                </span>
              </div>
              {target && (
                <>
                  <p>
                    {c('العملية: ', 'Operation: ')}
                    {target.path.startsWith('/roles')
                      ? c('إدارة دور', 'Role management')
                      : target.path.startsWith('/assignments')
                        ? c('إسناد أو سحب دور', 'Role assignment or revocation')
                        : target.path.startsWith('/policies')
                          ? c('سياسة وصول', 'Access policy')
                          : c('وصول طارئ', 'Emergency access')}
                  </p>
                  <p>
                    {c('تذكرة التغيير: ', 'Change ticket: ')}
                    {target.changeTicket}
                  </p>
                  {target.body.reason && <p>{String(target.body.reason)}</p>}
                  {typeof target.body.name === 'string' && (
                    <p>
                      <strong>{target.body.name}</strong>
                    </p>
                  )}
                  {typeof target.body.description === 'string' && <p>{target.body.description}</p>}
                  {typeof target.body.durationMinutes === 'number' && (
                    <p>
                      {c('مدة الوصول بالدقائق: ', 'Access duration in minutes: ')}
                      {target.body.durationMinutes}
                    </p>
                  )}
                  {target.body.configuration && typeof target.body.configuration === 'object' && (
                    <dl className="sf-form-grid">
                      {Object.entries(target.body.configuration).map(([key, value]) => (
                        <div key={key}>
                          <dt className="font-bold">
                            {(
                              {
                                start: c('البداية', 'Start'),
                                end: c('النهاية', 'End'),
                                timezone: c('المنطقة الزمنية', 'Timezone'),
                                daysOfWeek: c('الأيام (الأحد = 0)', 'Days (Sunday = 0)'),
                                allowedIps: c('عناوين الاتصال المسموحة', 'Allowed IP addresses'),
                                courseIds: c('مراجع المقررات المشمولة', 'Scoped course references'),
                              } as Record<string, string>
                            )[key] || key}
                          </dt>
                          <dd>
                            {Array.isArray(value) ? value.join(c('، ', ', ')) : String(value)}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  )}
                  {Array.isArray(target.body.policyIds) && (
                    <p>
                      {c('عدد سياسات الدور المقترحة: ', 'Proposed role policy count: ')}
                      {target.body.policyIds.length}
                    </p>
                  )}
                  {target.binding?.identity && (
                    <p>
                      {c('الحساب المعني: ', 'Target account: ')}
                      {target.binding.identity.displayName}
                    </p>
                  )}
                  {target.binding?.role && (
                    <p>
                      {c('الدور: ', 'Role: ')}
                      {target.binding.role.name}
                    </p>
                  )}
                  <div className="sf-form-grid">
                    <div>
                      <strong>{c('صلاحيات مضافة', 'Added permissions')}</strong>
                      <ul>
                        {after
                          .filter((p) => !before.includes(p))
                          .map((p) => (
                            <li key={p}>{label(p)}</li>
                          ))}
                      </ul>
                    </div>
                    <div>
                      <strong>{c('صلاحيات مسحوبة', 'Removed permissions')}</strong>
                      <ul>
                        {before
                          .filter((p) => !after.includes(p))
                          .map((p) => (
                            <li key={p}>{label(p)}</li>
                          ))}
                      </ul>
                    </div>
                  </div>
                  <details>
                    <summary>{c('بيانات النسخة المعتمدة', 'Approved version')}</summary>
                    <pre className="overflow-auto text-xs" dir="ltr">
                      {JSON.stringify(
                        { method: target.method, path: target.path, body: target.body },
                        null,
                        2,
                      )}
                    </pre>
                    <p className="sf-reference">
                      {String(
                        target.body.name ||
                          target.body.roleId ||
                          target.binding?.role?.id ||
                          row.id,
                      )}
                    </p>
                    <p>{target.binding?.role?.revision}</p>
                    <p>
                      {c('ينتهي في: ', 'Expires: ')}
                      {new Date(row.expiresAt).toLocaleString(language)}
                    </p>
                  </details>
                </>
              )}
              <div className="sf-actions">
                {!expired && !row.usedAt && !row.approvedAt && row.approverId === actor && (
                  <button
                    className="sf-primary"
                    disabled={busy}
                    onClick={() => void action(row, true)}
                  >
                    {c('الموافقة على هذه النسخة', 'Approve this version')}
                  </button>
                )}
                {target &&
                  !expired &&
                  !row.usedAt &&
                  !!row.approvedAt &&
                  row.requestedBy === actor && (
                    <button
                      className="sf-primary"
                      disabled={busy}
                      onClick={() => void action(row, false)}
                    >
                      {c('تنفيذ التغيير المعتمد', 'Execute approved change')}
                    </button>
                  )}
              </div>
            </li>
          );
        })}
      </ul>
      {cursor && (
        <button
          className="sf-secondary"
          disabled={busy || loading}
          onClick={() => void read(cursor)}
        >
          {c('تحميل المزيد', 'Load more')}
        </button>
      )}
    </OwnerPanel>
  );
}
