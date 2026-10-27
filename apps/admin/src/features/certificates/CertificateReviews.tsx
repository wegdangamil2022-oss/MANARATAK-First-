import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import {
  CertificatePanel,
  CertificateReadState,
  CertificateNotice,
  CertificateEmpty,
  CertificatePager,
} from './CertificateControls';
import { useCertificateCopy, useCertificateRead } from './certificateHooks';
import { StatusBadge, formatDate } from './CertificateFields';
export type CertificateReviewPage = {
  data: Array<{ id: string; title: string; status: string; updatedAt: string; path: string }>;
  total: number;
  page: number;
  pageSize: number;
};
export function CertificateReviews({ recovery = false }: { recovery?: boolean }) {
  const { c, language } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    [params, setParams] = useSearchParams(),
    [revision, setRevision] = useState(0);
  const kinds = [
    {
      key: 'templates',
      label: c('القوالب', 'Templates'),
      permission: 'admin:certificates:templates:approve',
    },
    {
      key: 'issuers',
      label: c('الجهات', 'Issuers'),
      permission: 'admin:certificates:issuers:approve',
    },
    {
      key: 'delegations',
      label: c('التفويضات', 'Delegations'),
      permission: 'admin:certificates:issuers:approve',
    },
    {
      key: 'corrections',
      label: c('تصحيح الأسماء', 'Name corrections'),
      permission: 'admin:certificates:lifecycle:approve',
    },
    {
      key: 'revalidation',
      label: c('إعادة التحقق المطلوبة', 'Revalidation required'),
      permission: 'admin:certificates:lifecycle:approve',
    },
  ].filter((kind) => hasPermission(kind.permission));
  const selected = recovery
    ? 'recovery'
    : kinds.some((kind) => kind.key === params.get('kind'))
      ? params.get('kind')!
      : kinds[0]?.key;
  const permitted = recovery
    ? hasPermission('admin:certificates:lifecycle:manage')
    : Boolean(selected);
  const page = Math.min(
    100000,
    Math.max(1, Number(params.get(recovery ? 'recoveryPage' : 'reviewPage')) || 1),
  );
  const read = useCertificateRead<CertificateReviewPage>(
    permitted ? `/admin/certificates/workspace?kind=${selected}&page=${page}&pageSize=25` : null,
    revision,
  );
  const update = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    next.set(key, value);
    if (key === 'kind') next.delete('reviewPage');
    setParams(next);
  };
  return (
    <CertificatePanel
      title={
        recovery
          ? c('ملفات تحتاج استئناف التجهيز', 'Artifact recovery required')
          : c('المراجعات والاعتمادات', 'Reviews and approvals')
      }
      actions={
        <button onClick={() => setRevision((v) => v + 1)}>
          <RefreshCw />
          {c('تحديث', 'Refresh')}
        </button>
      }
    >
      {recovery ? (
        <p>
          {c(
            'الحالات المسجلة لدى مالك الشهادة. افتح التفاصيل لفحص أهلية الاستئناف والنسخة؛ لا تعني القائمة أن كل حالة قابلة للاستئناف الآن.',
            'Owner-recorded recovery cases. Open a certificate to check retry eligibility and revision; listed cases are not necessarily eligible for retry.',
          )}
        </p>
      ) : (
        <>
          <CertificateNotice>
            {c(
              'قراءة مباشرة من مالك الشهادات، وليست نسخة من قائمة المراجعة العامة. القرار داخل تفاصيل العنصر وبصلاحياته الأصلية.',
              'A direct certificate-owner projection, separate from the general review workspace coverage. Decisions remain on canonical item details.',
            )}
          </CertificateNotice>
          <div className="certificate-subnav">
            {kinds.map((kind) => (
              <button
                key={kind.key}
                aria-pressed={selected === kind.key}
                onClick={() => update('kind', kind.key)}
              >
                {kind.label}
              </button>
            ))}
          </div>
          {selected === 'revalidation' ? (
            <p>
              {c(
                'شهادات نشطة تتطلب إعادة تحقق غير معتمدة أو انتهت مدتها؛ هذه قائمة احتياج وليست طلبات مقدمة من الطلاب.',
                'Current certificates with missing or expired revalidation approval. This is an eligibility worklist, not student-submitted requests.',
              )}
            </p>
          ) : null}
        </>
      )}
      {!permitted ? (
        <CertificateNotice>
          {c(
            'لا تملك صلاحية قراءة أنواع المراجعة في هذه المساحة.',
            'You do not have permission to read this worklist.',
          )}
        </CertificateNotice>
      ) : (
        <CertificateReadState
          loading={read.loading}
          error={read.error}
          retry={() => setRevision((v) => v + 1)}
        />
      )}
      {read.data ? (
        <>
          <div className="certificate-table-scroll">
            <table className="certificate-table">
              <thead>
                <tr>
                  {[
                    c('العنصر', 'Item'),
                    c('الحالة', 'State'),
                    c('آخر تحديث', 'Updated'),
                    c('الإجراء', 'Action'),
                  ].map((label) => (
                    <th scope="col" key={label}>
                      {label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {read.data.data.map((row) => (
                  <tr key={row.id}>
                    <td>{row.title}</td>
                    <td>
                      <StatusBadge status={row.status} />
                    </td>
                    <td>{formatDate(row.updatedAt, language)}</td>
                    <td>
                      <Link className="certificate-link" to={row.path}>
                        {recovery
                          ? c('فتح الشهادة', 'Open certificate')
                          : c('فتح للمراجعة', 'Open for review')}
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {!read.data.data.length ? (
            <CertificateEmpty>
              {c('لا توجد عناصر في هذه الصفحة لهذا النوع.', 'No items of this type on this page.')}
            </CertificateEmpty>
          ) : null}
          <CertificatePager
            page={read.data.page}
            pageSize={read.data.pageSize}
            total={read.data.total}
            onPage={(value) => update(recovery ? 'recoveryPage' : 'reviewPage', String(value))}
          />
        </>
      ) : null}
    </CertificatePanel>
  );
}
