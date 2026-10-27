import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { useAdministrationDraftGuard } from '../reference-data/useAdministrationDraftGuard';
import { CertificatePanel, CertificateNotice } from './CertificateControls';
import { useCertificateCopy, useCertificateCommand, useCertificateDirty } from './certificateHooks';
import type { Certificate, Action } from './certificateDetailModels';
export function canRenewCertificate(item: Pick<Certificate, 'status' | 'validityPolicy'>) {
  return ['ACTIVE', 'EXPIRED'].includes(item.status) && item.validityPolicy === 'RENEWABLE';
}
export function CertificateLifecycle({
  item,
  onRefresh,
  onDirtyChange,
}: {
  item: Certificate;
  onRefresh: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { c, ar } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    navigate = useNavigate(),
    command = useCertificateCommand(),
    [action, setAction] = useState<Action | null>(null),
    [reason, setReason] = useState(''),
    [name, setName] = useState(item.recipientDisplayName ?? '');
  const dirty =
    Boolean(action && (reason || name !== (item.recipientDisplayName ?? ''))) ||
    command.busy ||
    command.uncertain;
  useAdministrationDraftGuard(dirty, ar);
  useCertificateDirty(dirty, onDirtyChange);
  const options: [Action, string, boolean][] = [
    [
      'revoke',
      c('إلغاء رسمي', 'Revoke'),
      !['REVOKED', 'REISSUED', 'ARCHIVED'].includes(item.status),
    ],
    ['reissue', c('إعادة إصدار', 'Reissue'), item.status === 'REVOKED'],
    ['renew', c('تجديد', 'Renew'), canRenewCertificate(item)],
    ['archive', c('أرشفة', 'Archive'), item.status !== 'ARCHIVED'],
  ];
  async function execute() {
    const result = await command.execute<Certificate>(`/admin/certificates/${item.id}/${action}`, {
      reason,
      ...(action === 'reissue' && name.trim() !== item.recipientDisplayName
        ? { recipientDisplayName: name.trim() }
        : {}),
    });
    if (result) {
      setAction(null);
      setReason('');
      if (action === 'renew' || action === 'reissue') navigate('/certificates/' + result.id);
      else onRefresh();
    }
  }
  return (
    <CertificatePanel title={c('إدارة دورة الحياة', 'Lifecycle management')}>
      <p>
        {c(
          'اختر العملية ثم راجع أثرها وسببها قبل التأكيد. الحذف النهائي غير متاح والسجل السابق محفوظ دائمًا.',
          'Choose an action, review its effect and provide a reason. Historical records are retained.',
        )}
      </p>
      <div className="certificate-actions">
        {hasPermission('admin:certificates:lifecycle:manage') ? (
          options
            .filter(([, , allowed]) => allowed)
            .map(([key, label]) => (
              <button
                key={key}
                className={key === 'revoke' ? 'certificate-danger' : ''}
                disabled={command.busy}
                onClick={() => {
                  setReason('');
                  setAction(key);
                }}
              >
                {label}
              </button>
            ))
        ) : (
          <CertificateNotice>
            {c(
              'عرض فقط؛ لا تملك إذن إدارة دورة الحياة.',
              'Read only: lifecycle management permission is required.',
            )}
          </CertificateNotice>
        )}
      </div>
      {item.validityPolicy === 'RENEWABLE' && !canRenewCertificate(item) ? (
        <p className="certificate-muted">
          {c(
            'التجديد متاح للشهادة النشطة أو المنتهية فقط، ويعيد الخادم فحص القالب والجهة وشروط الإصدار.',
            'Renewal requires an active or expired certificate. The server rechecks the template, issuer and issuance requirements.',
          )}
        </p>
      ) : null}
      {action ? (
        <form
          className="certificate-form"
          onSubmit={(e) => {
            e.preventDefault();
            void execute();
          }}
        >
          <CertificateNotice>
            {action === 'revoke'
              ? c(
                  'سيُسجل إلغاء الشهادة، ولن تكون صالحة للتنزيل أو التحقق الناجح.',
                  'Revocation invalidates the certificate for download and successful verification.',
                )
              : action === 'archive'
                ? c(
                    'ستؤرشف الشهادة مع الاحتفاظ بسجلها.',
                    'The certificate will be archived with its history retained.',
                  )
                : c(
                    'ستنشأ شهادة بديلة وفق القالب النشط، مع رابط إلى الشهادة السابقة؛ لن يُستبدل الملف القديم.',
                    'A replacement is issued under the active template and linked to the original. The historical artifact is retained.',
                  )}{' '}
            · <b dir="ltr">{item.serialNumber}</b>
          </CertificateNotice>
          {action === 'reissue' ? (
            <label>
              {c('الاسم على النسخة البديلة', 'Replacement recipient name')}
              <input required value={name} onChange={(e) => setName(e.target.value)} />
              <small>
                {c(
                  'تغيير الاسم يتطلب تصحيحًا معتمدًا ومطابقة ملف الهوية.',
                  'A changed name requires approved correction and canonical identity agreement.',
                )}
              </small>
            </label>
          ) : null}
          <label className="certificate-full">
            {c('سبب العملية', 'Action reason')}
            <textarea
              minLength={8}
              maxLength={2000}
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
          <footer className="certificate-actions">
            <button
              disabled={command.busy || reason.trim().length < 8}
              className="certificate-primary"
            >
              {c('تأكيد العملية', 'Confirm action')}
            </button>
            <button
              type="button"
              disabled={command.busy}
              onClick={() => {
                setAction(null);
                setReason('');
              }}
            >
              {c('إلغاء', 'Cancel')}
            </button>
          </footer>
        </form>
      ) : null}
    </CertificatePanel>
  );
}
export function CertificateCorrectionReview({
  item,
  onRefresh,
  onDirtyChange,
}: {
  item: Certificate;
  onRefresh: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { c, ar } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    command = useCertificateCommand();
  const request = item.metadata?.recipientCorrection as
    { state?: string; name?: string; evidenceAssetId?: string; createdBy?: string } | undefined;
  const [kind, setKind] = useState<'request' | 'approve' | 'revalidation' | null>(null),
    [name, setName] = useState(''),
    [evidence, setEvidence] = useState(''),
    [until, setUntil] = useState(''),
    [reason, setReason] = useState('');
  useAdministrationDraftGuard(
    Boolean(kind && (name || evidence || until || reason)) || command.uncertain,
    ar,
  );
  useCertificateDirty(
    Boolean(kind && (name || evidence || until || reason)) || command.busy || command.uncertain,
    onDirtyChange,
  );
  const canRequest =
      hasPermission('admin:certificates:lifecycle:manage') && item.status === 'REVOKED' && request?.state !== 'PENDING_APPROVAL',
    canApprove =
      hasPermission('admin:certificates:lifecycle:approve') &&
      item.status === 'REVOKED' &&
      request?.state === 'PENDING_APPROVAL',
    canRevalidate =
      hasPermission('admin:certificates:lifecycle:approve') &&
      item.status === 'ACTIVE' &&
      (item as Certificate & { requiresRevalidation?: boolean }).requiresRevalidation;
  async function submit() {
    const endpoint =
      kind === 'request'
        ? 'recipient-correction'
        : kind === 'approve'
          ? 'recipient-correction/approve'
          : 'revalidation';
    const result = await command.execute(`/admin/certificates/${item.id}/${endpoint}`, {
      expectedUpdatedAt: item.updatedAt,
      reason,
      evidenceAssetId: kind === 'approve' ? request?.evidenceAssetId : evidence,
      ...(kind === 'revalidation'
        ? { validUntil: new Date(until).toISOString() }
        : { name: kind === 'approve' ? request?.name : name }),
    });
    if (result) {
      setKind(null);
      setName('');
      setEvidence('');
      setReason('');
      setUntil('');
      onRefresh();
    }
  }
  return (
    <CertificatePanel title={c('تصحيح الاسم وإعادة التحقق', 'Name correction and revalidation')}>
      <p>
        {c(
          'التصحيح يمر بطلب ثم اعتماد مستقل، ولا يغير النسخة الموقعة القديمة.',
          'Name correction requires a request and independent approval; the signed historical snapshot is retained.',
        )}
      </p>
      {request ? (
        <p>
          {c('حالة تصحيح الاسم', 'Name correction state')}:{' '}
          {request.state === 'APPROVED'
            ? c('معتمد', 'Approved')
            : c('بانتظار المراجعة', 'Pending review')}
        </p>
      ) : null}
      <div className="certificate-actions">
        {canRequest ? (
          <button onClick={() => setKind('request')}>
            {c('طلب تصحيح الاسم', 'Request name correction')}
          </button>
        ) : null}
        {canApprove ? (
          <button onClick={() => setKind('approve')}>
            {c('مراجعة طلب التصحيح', 'Review correction request')}
          </button>
        ) : null}
        {canRevalidate ? (
          <button onClick={() => setKind('revalidation')}>
            {c('اعتماد إعادة التحقق', 'Approve revalidation')}
          </button>
        ) : null}
      </div>
      {!canRequest && !canApprove && !canRevalidate ? (
        <small>
          {c(
            'لا توجد عملية متاحة للحالة والصلاحيات الحالية. طلب تصحيح الاسم يبدأ بعد الإلغاء الرسمي.',
            'No action is available for the current state and permissions. Name correction starts after formal revocation.',
          )}
        </small>
      ) : null}
      {kind ? (
        <form
          className="certificate-form"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          {kind === 'approve' ? (
            <CertificateNotice>
              {c('اعتماد الاسم المقترح', 'Approve proposed name')}: <b>{request?.name}</b>
              <small>
                {c(
                  'يتحقق الخادم من استقلال المراجع ومطابقة الدليل والاسم المعتمد في الهوية.',
                  'The server checks independent review, evidence and canonical identity.',
                )}
              </small>
            </CertificateNotice>
          ) : (
            <>
              <label>
                {kind === 'request'
                  ? c('الاسم الصحيح وفق ملف الهوية', 'Correct name from canonical identity')
                  : c('صالح حتى', 'Valid until')}
                <input
                  type={kind === 'request' ? 'text' : 'datetime-local'}
                  required
                  value={kind === 'request' ? name : until}
                  onChange={(e) =>
                    kind === 'request' ? setName(e.target.value) : setUntil(e.target.value)
                  }
                />
              </label>
              <label>
                {c(
                  'مرجع الدليل الخاص المملوك لهذه الشهادة',
                  'Private evidence reference owned by this certificate',
                )}
                <input required value={evidence} onChange={(e) => setEvidence(e.target.value)} />
              </label>
            </>
          )}
          <label className="certificate-full">
            {c('سبب القرار', 'Decision reason')}
            <textarea
              required
              minLength={8}
              maxLength={2000}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
          <footer className="certificate-actions">
            <button disabled={command.busy || reason.trim().length < 8}>
              {c('تأكيد القرار', 'Confirm decision')}
            </button>
            <button
              type="button"
              disabled={command.busy}
              onClick={() => {
                setKind(null);
                setName('');
                setEvidence('');
                setReason('');
                setUntil('');
              }}
            >
              {c('إلغاء', 'Cancel')}
            </button>
          </footer>
        </form>
      ) : null}
    </CertificatePanel>
  );
}
