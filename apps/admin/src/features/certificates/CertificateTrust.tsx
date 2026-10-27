import { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { AdminLink } from '../../components/AdminLink';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CertificatePanel, CertificateNotice, CertificateReadState } from './CertificateControls';
import { useCertificateCopy, useCertificateRead } from './certificateHooks';
import { CertificateReviews } from './CertificateReviews';
import type { Analytics, CertificateReadiness } from './certificateModels';
export function CertificateTrust() {
  const { c, language } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    [revision, setRevision] = useState(0),
    read = useCertificateRead<CertificateReadiness>('/admin/certificates/readiness', revision),
    policy = useCertificateRead<{
      retentionDays: number | null;
      ipPerMinute: number;
      codePerMinute: number;
    }>('/admin/certificates/verification-policy', revision),
    metrics = useCertificateRead<Analytics>('/admin/certificates/analytics', revision);
  const items: [[string, boolean | undefined, string], ...[string, boolean | undefined, string][]] =
    [
      [
        c('قالب نشط مرتبط بجهة نشطة', 'Active template bound to an active issuer'),
        read.data?.activeTemplate,
        '/certificates?section=templates',
      ],
      [
        c('جهة إصدار نشطة', 'Active issuer'),
        read.data?.activeIssuer,
        '/certificates?section=issuers',
      ],
      [
        c('مسار إصدار الإكمال الموثوق', 'Trusted completion issuance'),
        read.data?.trustedCompletionIssuanceReady,
        '/courses',
      ],
      [
        c('مزود توقيع متحقق', 'Verified signing provider'),
        read.data
          ? Boolean(read.data.signingProviderConfigured && read.data.signingProviderVerified)
          : undefined,
        '/health-readiness',
      ],
      [
        c('عنوان التحقق العام مهيأ', 'Public verification URL configured'),
        read.data?.publicVerificationBaseUrlConfigured,
        '/settings',
      ],
      [
        c('تجهيز ملفات EAP متحقق', 'Verified EAP artifact runtime'),
        read.data?.artifactRendererRuntimeReady,
        '/health-readiness',
      ],
    ];
  return (
    <>
      <CertificatePanel
        title={c('الجاهزية والتحقق', 'Readiness and verification')}
        actions={
          <button onClick={() => setRevision((v) => v + 1)}>
            <RefreshCw />
            {c('فحص الجاهزية', 'Check readiness')}
          </button>
        }
      >
        <CertificateReadState
          loading={read.loading}
          error={read.error}
          retry={() => setRevision((v) => v + 1)}
        />
        <div className="certificate-grid">
          {items.map(([label, ready, path]) => (
            <article className="certificate-card" key={label}>
              <h3>{label}</h3>
              <strong>
                {ready === undefined
                  ? c('غير متاح', 'Unavailable')
                  : ready
                    ? c('متحقق لهذا المتطلب', 'Verified for this requirement')
                    : c('غير جاهز', 'Not ready')}
              </strong>
              <AdminLink className="certificate-link" to={path}>
                {c('فتح المساحة المختصة', 'Open owner workspace')}
              </AdminLink>
            </article>
          ))}
        </div>
        <CertificateNotice>
          {c(
            'هذه قراءات المتطلبات الحالية، ولا تمثل اعتمادًا شاملًا للإنتاج. إعداد رابط أو وجود شعار توقيع لا يثبت تشغيل التوقيع الرقمي أو تجهيز الملفات.',
            'These are current requirement observations, not an overall production certification. URL configuration or a signature image does not prove digital signing or artifact delivery.',
          )}
        </CertificateNotice>
      </CertificatePanel>
      <CertificatePanel title={c('سياسة التحقق العام', 'Public verification policy')}>
        <CertificateReadState
          loading={policy.loading}
          error={policy.error}
          retry={() => setRevision((v) => v + 1)}
        />
        {policy.data ? (
          <dl className="certificate-definition">
            {[
              [
                c('الاحتفاظ بسجلات التحقق', 'Verification log retention'),
                policy.data.retentionDays === null
                  ? c('الحذف التلقائي متوقف', 'Automatic deletion disabled')
                  : policy.data.retentionDays.toLocaleString(language) + ' ' + c('يومًا', 'days'),
              ],
              [
                c('الطلبات لكل عنوان في الدقيقة', 'Requests per IP per minute'),
                policy.data.ipPerMinute.toLocaleString(language),
              ],
              [
                c('الطلبات لكل رمز في الدقيقة', 'Requests per code per minute'),
                policy.data.codePerMinute.toLocaleString(language),
              ],
            ].map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
        <AdminLink className="certificate-link" to="/settings">
          {c('تعديل السياسة من إعدادات النظام', 'Edit policy in system settings')}
        </AdminLink>
        <p className="certificate-muted">
          {c('سجلات التحقق المتاحة حاليًا', 'Currently retained verification records')}:{' '}
          {metrics.data
            ? metrics.data.verifications.toLocaleString(language)
            : c('غير متاح', 'Unavailable')}{' '}
          · {c('القوالب النشطة', 'Active templates')}:{' '}
          {metrics.data
            ? metrics.data.templates.toLocaleString(language)
            : c('غير متاح', 'Unavailable')}
        </p>
      </CertificatePanel>
      {hasPermission('admin:certificates:lifecycle:manage') ? (
        <CertificateReviews recovery />
      ) : null}
      <CertificatePanel title={c('مبادئ الشهادة', 'Certificate principles')}>
        <ul>
          <li>
            {c(
              'شهادة إتمام مرتبطة بإكمال تعليمي موثوق.',
              'A certificate of completion backed by trusted learning completion.',
            )}
          </li>
          <li>
            {c(
              'النسخة التاريخية موقعة ومحفوظة؛ التصحيح والتجديد عبر المسارات المعتمدة.',
              'Signed historical snapshots are retained; corrections and renewal follow canonical workflows.',
            )}
          </li>
          <li>
            {c(
              'QR يفتح صفحة تحقق عامة محدودة البيانات.',
              'The QR opens a public verification page with limited information.',
            )}
          </li>
        </ul>
      </CertificatePanel>
    </>
  );
}
