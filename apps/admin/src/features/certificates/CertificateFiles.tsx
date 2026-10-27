import { useEffect, useRef, useState } from 'react';
import { adminApiClient } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CertificatePanel, CertificateNotice } from './CertificateControls';
import { useCertificateCopy, useCertificateCommand, useCertificateDirty } from './certificateHooks';
import { useAdministrationDraftGuard } from '../reference-data/useAdministrationDraftGuard';
import type { Certificate } from './certificateDetailModels';
export type CertificateVerification = {
  integrityVerified: boolean;
  isValid: boolean;
  checkedAt: string;
  lifecycleStatus?: string;
  temporalStatus?: string;
  verificationFailure?: string;
};
export function CertificateFiles({
  item,
  verification,
  onRefresh,
  onDirtyChange,
}: {
  item: Certificate;
  verification: CertificateVerification | null;
  onRefresh: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const { c, ar } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [reason, setReason] = useState(''),
    command = useCertificateCommand(),
    [pdf, setPdf] = useState<string | null>(null),
    url = useRef<string | null>(null),
    generation = useRef(0);
  useCertificateDirty(Boolean(reason) || command.busy || command.uncertain, onDirtyChange);
  useAdministrationDraftGuard(Boolean(reason) || command.busy || command.uncertain, ar);
  useEffect(() => {
    const currentGeneration = ++generation.current;
    return () => {
      generation.current = currentGeneration + 1;
      if (url.current) URL.revokeObjectURL(url.current);
    };
  }, [item.id, item.updatedAt]);
  const job = item.metadata?.renderJob as { state?: string; fingerprint?: string } | undefined;
  const eligible =
    hasPermission('admin:certificates:download') &&
    verification?.isValid === true &&
    Boolean(item.certificatePdfAssetId);
  async function artifact(kind: 'pdf' | 'preview', preview = false) {
    const version = generation.current;
    setBusy(true);
    setError('');
    try {
      const blob = await adminApiClient.requestBlob(
        `/admin/certificates/${item.id}/artifacts/${kind}/content`,
      );
      if (generation.current !== version) return;
      if (kind === 'pdf' && blob.type !== 'application/pdf') throw Error('INVALID_CONTENT');
      const file = URL.createObjectURL(blob);
      if (preview) {
        if (url.current) URL.revokeObjectURL(url.current);
        url.current = file;
        setPdf(file);
      } else {
        const anchor = document.createElement('a');
        anchor.href = file;
        anchor.download = kind === 'pdf' ? 'certificate.pdf' : 'certificate-preview';
        anchor.click();
        setTimeout(() => URL.revokeObjectURL(file), 30000);
      }
    } catch {
      if (generation.current === version)
        setError(
          c(
            'تعذر تسليم الملف. يُعاد التحقق من صلاحية الشهادة والإذن عند كل طلب.',
            'Artifact delivery failed. Certificate validity and permission are rechecked for every request.',
          ),
        );
    } finally {
      if (generation.current === version) setBusy(false);
    }
  }
  return (
    <>
      <CertificatePanel title={c('التحقق والملفات', 'Verification and files')}>
        <dl className="certificate-definition">
          {[
            [c('ملف PDF', 'PDF artifact'), item.certificatePdfAssetId],
            [c('صورة المعاينة', 'Preview artifact'), item.previewImageAssetId],
            [c('رمز QR', 'QR artifact'), item.verificationQrAssetId],
          ].map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>
                {value
                  ? c('مسجل لدى منصة الملفات', 'Recorded by the asset platform')
                  : c('لم يجهز الملف بعد', 'Not ready yet')}
              </dd>
            </div>
          ))}
        </dl>
        <p>
          {c(
            'وجود مرجع ملف لا يكفي للتنزيل؛ تُفحص صلاحيته وملكيته والتوقيع عبر المسار المحمي.',
            'An artifact reference alone does not authorize delivery. Validity, ownership and signature are checked by the protected endpoint.',
          )}
        </p>
        {!eligible ? (
          <CertificateNotice>
            {!hasPermission('admin:certificates:download')
              ? c('يلزم إذن تنزيل الشهادات.', 'Certificate download permission is required.')
              : !verification?.isValid
                ? c(
                    'التنزيل يتطلب نتيجة تحقق ناجحة للشهادة الحالية.',
                    'A successful current certificate verification is required.',
                  )
                : c('ملف PDF غير جاهز.', 'The PDF artifact is not ready.')}
          </CertificateNotice>
        ) : null}
        <div className="certificate-actions">
          <button disabled={!eligible || busy} onClick={() => void artifact('pdf', true)}>
            {c('عرض ملف PDF', 'View PDF')}
          </button>
          <button disabled={!eligible || busy} onClick={() => void artifact('pdf')}>
            {c('تنزيل PDF', 'Download PDF')}
          </button>
          {item.previewImageAssetId ? (
            <button
              disabled={
                !hasPermission('admin:certificates:download') ||
                verification?.isValid !== true ||
                busy
              }
              onClick={() => void artifact('preview')}
            >
              {c('تنزيل صورة المعاينة', 'Download preview image')}
            </button>
          ) : null}
        </div>
        {error ? <CertificateNotice error>{error}</CertificateNotice> : null}
        {pdf ? (
          <a className="certificate-link" href={pdf} target="_blank" rel="noreferrer">
            {c('فتح ملف PDF الذي تم التحقق منه', 'Open the verified PDF in a new tab')}
          </a>
        ) : null}
      </CertificatePanel>
      {job?.state === 'RECOVERY_REQUIRED' ? (
        <CertificatePanel title={c('استئناف تجهيز الملفات', 'Resume artifact preparation')}>
          <CertificateNotice>
            {c(
              'تعثر تجهيز الملفات. الاستئناف مقيد بهذه الشهادة وبصمة المهمة ونسخة السجل الحالية.',
              'Artifact preparation needs recovery. Retrying is scoped to this certificate, task fingerprint and current revision.',
            )}
          </CertificateNotice>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!job.fingerprint) return;
              void command
                .execute(`/admin/certificates/${item.id}/render-retry`, {
                  expectedFingerprint: job.fingerprint,
                  expectedUpdatedAt: item.updatedAt,
                  reason,
                })
                .then((result) => {
                  if (result) {
                    setReason('');
                    onRefresh();
                  }
                });
            }}
          >
            <label>
              {c('سبب الاستئناف', 'Retry reason')}
              <textarea
                required
                minLength={8}
                maxLength={2000}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </label>
            <button
              disabled={
                !hasPermission('admin:certificates:lifecycle:manage') ||
                !job.fingerprint ||
                item.status !== 'ACTIVE' ||
                verification?.isValid !== true ||
                reason.trim().length < 8 ||
                command.busy
              }
            >
              {c('استئناف هذه المهمة', 'Resume this task')}
            </button>
            {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
          </form>
        </CertificatePanel>
      ) : null}
    </>
  );
}
