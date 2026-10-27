import { useState, useCallback, useRef } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Award, RefreshCw, ExternalLink, Copy } from 'lucide-react';
import { CertificatePreview } from '../components/certificates/CertificatePreview';
import { AdminLink } from '../components/AdminLink';
import {
  CertificatePanel,
  CertificateNotice,
  CertificateReadState,
  CertificateBack,
} from '../features/certificates/CertificateControls';
import { StatusBadge, formatDate } from '../features/certificates/CertificateFields';
import { useCertificateCopy, useCertificateRead } from '../features/certificates/certificateHooks';
import { safeCertificateReturn } from '../features/certificates/CertificateRegistry';
import {
  CertificateLifecycle,
  CertificateCorrectionReview,
} from '../features/certificates/CertificateLifecycle';
import {
  CertificateFiles,
  type CertificateVerification,
} from '../features/certificates/CertificateFiles';
import type {
  Certificate,
  Template,
  Ledger,
} from '../features/certificates/certificateDetailModels';
import '../features/reference-data/reference-data.css';
import '../features/certificates/certificates.css';
export function CertificateDetailPage() {
  const drafts = useRef<Record<string, boolean>>({});
  const lifecycleDirty = useCallback((dirty: boolean) => {
    drafts.current.lifecycle = dirty;
  }, []);
  const correctionDirty = useCallback((dirty: boolean) => {
    drafts.current.correction = dirty;
  }, []);
  const filesDirty = useCallback((dirty: boolean) => {
    drafts.current.files = dirty;
  }, []);
  const { id = '' } = useParams(),
    { c, dir, language } = useCertificateCopy(),
    [params, setParams] = useSearchParams(),
    [revision, setRevision] = useState(0),
    [copyMessage, setCopyMessage] = useState('');
  const panel = ['overview', 'files', 'lifecycle', 'history'].includes(params.get('panel') ?? '')
    ? params.get('panel')!
    : 'overview';
  const page = Math.min(100000, Math.max(1, Number(params.get('ledgerPage')) || 1));
  const item = useCertificateRead<Certificate>(
    '/admin/certificates/' + encodeURIComponent(id),
    revision,
  );
  const verification = useCertificateRead<CertificateVerification>(
    panel !== 'history' ? `/admin/certificates/${id}/verification` : null,
    revision,
  );
  const template = useCertificateRead<Template>(
    panel === 'overview' && item.data?.templateVersionId
      ? '/admin/certificates/template-versions/' + item.data.templateVersionId
      : null,
    revision,
  );
  const ledger = useCertificateRead<{ data: Ledger[] }>(
    panel === 'history' ? `/admin/certificates/${id}/ledger?page=${page}` : null,
    revision,
  );
  const certificate = item.data;
  const mayDiscard = () =>
    !Object.values(drafts.current).some(Boolean) ||
    window.confirm(
      c(
        'لديك تغييرات غير محفوظة أو عملية قيد التنفيذ. هل تريد المتابعة؟',
        'There are unsaved changes or a pending command. Continue?',
      ),
    );
  const sourceUrl = certificate?.verificationUrl;
  const publicUrl =
    sourceUrl && (/^(https?:\/\/)/.test(sourceUrl) || /^\/certificates\//.test(sourceUrl))
      ? sourceUrl
      : certificate
        ? '/certificates/verify?code=' + encodeURIComponent(certificate.verificationCode)
        : null;
  async function copy(value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(c('تم النسخ.', 'Copied.'));
    } catch {
      setCopyMessage(
        c('تعذر النسخ. يمكنك تحديد الرقم ونسخه.', 'Copy failed. Select and copy the number.'),
      );
    }
  }
  return (
    <div className="reference-workspace certificate-workspace" dir={dir}>
      <CertificateBack to={safeCertificateReturn(params.get('returnTo'))}>
        {c('العودة إلى نتائج السجل', 'Back to registry results')}
      </CertificateBack>
      <header className="reference-hero">
        <div>
          <span>
            <Award />
            {c('تفاصيل الشهادة', 'Certificate details')}
          </span>
          <h1>{certificate?.achievementDisplayName || c('الشهادة', 'Certificate')}</h1>
          {certificate ? <p dir="ltr">{certificate.serialNumber}</p> : null}
        </div>
        <button
          onClick={() => {
            if (mayDiscard()) setRevision((v) => v + 1);
          }}
        >
          <RefreshCw />
          {c('تحديث', 'Refresh')}
        </button>
      </header>
      <CertificateReadState
        loading={item.loading}
        error={item.error}
        retry={() => setRevision((v) => v + 1)}
      />
      {certificate ? (
        <>
          <div className="certificate-toolbar">
            <StatusBadge status={certificate.status} />
            <div className="certificate-actions">
              <button onClick={() => void copy(certificate.serialNumber)}>
                <Copy />
                {c('نسخ الرقم', 'Copy serial')}
              </button>
              <button onClick={() => void copy(certificate.verificationCode)}>
                {c('نسخ رمز التحقق', 'Copy verification code')}
              </button>
              {publicUrl ? (
                <a className="certificate-link" href={publicUrl} target="_blank" rel="noreferrer">
                  <ExternalLink />
                  {c('صفحة التحقق العامة', 'Public verification page')}
                </a>
              ) : null}
            </div>
          </div>
          {copyMessage ? <CertificateNotice>{copyMessage}</CertificateNotice> : null}
          <nav
            className="certificate-subnav"
            aria-label={c('تفاصيل الشهادة', 'Certificate detail sections')}
          >
            {(['overview', 'files', 'lifecycle', 'history'] as const).map((key) => (
              <button
                key={key}
                aria-pressed={panel === key}
                onClick={() => {
                  if (!mayDiscard()) return;
                  const next = new URLSearchParams(params);
                  next.set('panel', key);
                  setParams(next);
                }}
              >
                {
                  {
                    overview: c('النظرة العامة', 'Overview'),
                    files: c('التحقق والملفات', 'Verification and files'),
                    lifecycle: c('دورة الحياة والتصحيحات', 'Lifecycle and corrections'),
                    history: c('السجل والتدقيق', 'History and audit'),
                  }[key]
                }
              </button>
            ))}
          </nav>
          {panel !== 'history' ? (
            <>
              <CertificateReadState
                loading={verification.loading}
                error={verification.error}
                retry={() => setRevision((v) => v + 1)}
              />
              {verification.data ? (
                <CertificateNotice error={!verification.data.isValid}>
                  <b>
                    {verification.data.isValid
                      ? c('الشهادة صالحة وفق آخر فحص', 'Certificate valid at last check')
                      : c('الشهادة غير صالحة وفق آخر فحص', 'Certificate invalid at last check')}
                  </b>
                  <span>
                    {verification.data.integrityVerified
                      ? c('التوقيع مطابق', 'Signature verified')
                      : c('لم تثبت سلامة التوقيع', 'Signature integrity not established')}
                  </span>
                  <small>
                    {c('آخر فحص', 'Last check')}:{' '}
                    {new Date(verification.data.checkedAt).toLocaleString(language)}
                  </small>
                  {verification.data.verificationFailure === 'REVALIDATION_REQUIRED' ? (
                    <span>
                      {c('تحتاج إعادة تحقق معتمدة.', 'Approved revalidation is required.')}
                    </span>
                  ) : null}
                </CertificateNotice>
              ) : null}
            </>
          ) : null}
          {panel === 'overview' ? (
            <>
              <CertificatePanel title={c('معاينة التصميم التاريخي', 'Historical design preview')}>
                <p className="certificate-muted">
                  {c(
                    'معاينة من نسخة القالب المحفوظة؛ ملف PDF الفعلي يُعرض من تبويب الملفات بعد التسليم المحمي.',
                    'A preview of the saved historical template. The actual PDF is available through protected delivery on the files tab.',
                  )}
                </p>
                <CertificateReadState loading={template.loading} error={template.error} />
                {template.data ? (
                  <div className="certificate-preview-frame">
                    <CertificatePreview template={template.data} certificate={certificate} />
                  </div>
                ) : null}
              </CertificatePanel>
              <CertificatePanel title={c('المستفيد والإنجاز', 'Recipient and achievement')}>
                <dl className="certificate-definition">
                  {[
                    [
                      c('المستفيد', 'Recipient'),
                      certificate.recipientDisplayName || c('الاسم غير متاح', 'Name unavailable'),
                    ],
                    [c('الإنجاز', 'Achievement'), certificate.achievementDisplayName],
                    [c('جهة الإصدار', 'Issuer'), certificate.issuerName],
                    [
                      c('تاريخ الإكمال', 'Completed'),
                      formatDate(certificate.completedAt, language),
                    ],
                    [c('تاريخ الإصدار', 'Issued'), formatDate(certificate.issuedAt, language)],
                    [
                      c('انتهاء الصلاحية', 'Expires'),
                      certificate.expiresAt
                        ? formatDate(certificate.expiresAt, language)
                        : c('دائمة', 'Permanent'),
                    ],
                    [c('نسخة القالب', 'Template version'), certificate.templateVersion],
                    [
                      c('الدرجة', 'Score'),
                      certificate.score != null
                        ? certificate.score + '%'
                        : certificate.grade || '—',
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || '—'}</dd>
                    </div>
                  ))}
                </dl>
                {certificate.skills.length ? (
                  <p>
                    {c('المهارات', 'Skills')}: {certificate.skills.join(' · ')}
                  </p>
                ) : null}
                <div className="certificate-actions">
                  {certificate.courseId ? (
                    <AdminLink className="certificate-link" to={'/courses/' + certificate.courseId}>
                      {c('مصدر الدورة', 'Source course')}
                    </AdminLink>
                  ) : null}
                  {certificate.learningPathId ? (
                    <AdminLink className="certificate-link" to="/courses/learning-paths">
                      {c('المسارات التعليمية', 'Learning paths')}
                    </AdminLink>
                  ) : null}
                  <Link
                    className="certificate-link"
                    to={'/certificates/templates/' + certificate.templateId}
                  >
                    {c('القالب الحالي', 'Current template')}
                  </Link>
                  <Link
                    className="certificate-link"
                    to={'/certificates/issuers/' + certificate.issuerId}
                  >
                    {c('جهة الإصدار', 'Issuer details')}
                  </Link>
                </div>
              </CertificatePanel>
              {certificate.replacesCertificateId || certificate.replacedByCertificateId ? (
                <CertificatePanel title={c('الشهادات المرتبطة', 'Related certificate versions')}>
                  <div className="certificate-actions">
                    {certificate.replacesCertificateId ? (
                      <Link
                        className="certificate-link"
                        to={'/certificates/' + certificate.replacesCertificateId}
                      >
                        {c('الشهادة السابقة', 'Previous certificate')}
                      </Link>
                    ) : null}
                    {certificate.replacedByCertificateId ? (
                      <Link
                        className="certificate-link"
                        to={'/certificates/' + certificate.replacedByCertificateId}
                      >
                        {c('الشهادة البديلة', 'Replacement certificate')}
                      </Link>
                    ) : null}
                  </div>
                </CertificatePanel>
              ) : null}
            </>
          ) : null}
          {panel === 'files' ? (
            <CertificateFiles
              onDirtyChange={filesDirty}
              key={certificate.id + certificate.updatedAt}
              item={certificate}
              verification={verification.data}
              onRefresh={() => setRevision((v) => v + 1)}
            />
          ) : null}
          {panel === 'lifecycle' ? (
            <>
              <CertificateLifecycle
                onDirtyChange={lifecycleDirty}
                key={'lifecycle' + certificate.id + certificate.updatedAt}
                item={certificate}
                onRefresh={() => setRevision((v) => v + 1)}
              />
              <CertificateCorrectionReview
                onDirtyChange={correctionDirty}
                key={'correction' + certificate.id + certificate.updatedAt}
                item={certificate}
                onRefresh={() => setRevision((v) => v + 1)}
              />
            </>
          ) : null}
          {panel === 'history' ? (
            <CertificatePanel title={c('سجل التدقيق', 'Audit history')}>
              <CertificateReadState
                loading={ledger.loading}
                error={ledger.error}
                retry={() => setRevision((v) => v + 1)}
              />
              {ledger.data ? (
                <>
                  <div className="certificate-table-scroll">
                    <table className="certificate-table">
                      <thead>
                        <tr>
                          {[
                            c('الحدث', 'Event'),
                            c('المنفذ', 'Actor'),
                            c('السبب', 'Reason'),
                            c('التاريخ', 'Date'),
                          ].map((label) => (
                            <th key={label}>{label}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {ledger.data.data.map((row) => (
                          <tr key={row.id}>
                            <td>{row.action}</td>
                            <td>{row.actorId}</td>
                            <td>{row.reason || '—'}</td>
                            <td>{formatDate(row.occurredAt, language)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!ledger.data.data.length ? (
                    <p>{c('لا توجد أحداث في هذه الصفحة.', 'No events on this page.')}</p>
                  ) : null}
                  <div className="certificate-pagination">
                    <button
                      disabled={page <= 1}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('ledgerPage', String(page - 1));
                        setParams(next);
                      }}
                    >
                      {c('السابق', 'Previous')}
                    </button>
                    <span>{page}</span>
                    <button
                      disabled={ledger.data.data.length < 50}
                      onClick={() => {
                        const next = new URLSearchParams(params);
                        next.set('ledgerPage', String(page + 1));
                        setParams(next);
                      }}
                    >
                      {c('التالي', 'Next')}
                    </button>
                  </div>
                </>
              ) : null}
            </CertificatePanel>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
