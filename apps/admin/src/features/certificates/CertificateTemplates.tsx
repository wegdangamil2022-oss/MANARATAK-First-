import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw, Copy, Eye } from 'lucide-react';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { AdminLink } from '../../components/AdminLink';
import { CertificatePreview } from '../../components/certificates/CertificatePreview';
import {
  CertificateTemplateReview,
  type CertificateTemplateReviewSnapshot,
} from '../../components/certificates/CertificateTemplateReview';
import {
  CertificatePanel,
  CertificateReadState,
  CertificateEmpty,
  CertificateBack,
  CertificateNotice,
  CertificatePager,
} from './CertificateControls';
import { StatusBadge, formatDate } from './CertificateFields';
import { useCertificateCopy, useCertificateRead, useCertificateCommand } from './certificateHooks';
import type { CertificateTemplate, CertificateIssuer, TemplateStatus } from './certificateModels';
import { CertificateTemplateEditor } from './CertificateTemplateEditor';
type TemplateWithHistory = CertificateTemplate & {
  versions?: Array<{
    id: string;
    versionNumber: string;
    status: string;
    createdAt: string;
    createdBy: string;
  }>;
};
export function CertificateTemplates({ id, editing = false }: { id?: string; editing?: boolean }) {
  const { c, ar } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    [revision, setRevision] = useState(0),
    [params] = useSearchParams();
  const rows = useCertificateRead<{ data: TemplateWithHistory[] }>(
    '/admin/certificates/templates',
    revision,
  );
  const issuers = useCertificateRead<{ data: CertificateIssuer[] }>(
    id === 'new' || editing ? '/admin/certificates/issuers' : null,
    revision,
  );
  const [query, setQuery] = useState(''),
    [status, setStatus] = useState('');
  const template = rows.data?.data.find((item) => item.id === id);
  if (id === 'new' || editing) {
    if (!hasPermission('admin:certificates:templates:author'))
      return (
        <CertificateNotice error>
          {c('يلزم إذن تأليف القوالب.', 'Template author permission is required.')}
        </CertificateNotice>
      );
    if (rows.loading || issuers.loading || rows.error || issuers.error)
      return (
        <CertificateReadState
          loading={rows.loading || issuers.loading}
          error={rows.error || issuers.error}
          retry={() => setRevision((v) => v + 1)}
        />
      );
    const source =
      id === 'new' ? rows.data?.data.find((item) => item.id === params.get('clone')) : template;
    if (id === 'new' && params.get('clone') && !source)
      return (
        <CertificateNotice error>
          {c(
            'القالب المطلوب نسخه غير موجود أو لم يعد متاحًا. ارجع إلى مكتبة القوالب.',
            'The source template is missing or no longer available. Return to the template library.',
          )}
        </CertificateNotice>
      );
    return (
      <CertificateTemplateEditor
        key={id + ':' + (source?.currentVersionId ?? 'new')}
        source={source}
        editing={editing}
        issuers={issuers.data?.data ?? []}
      />
    );
  }
  if (id) {
    return (
      <>
        <CertificateBack to="/certificates?section=templates">
          {c('مكتبة القوالب', 'Template library')}
        </CertificateBack>
        <CertificateReadState
          loading={rows.loading}
          error={rows.error}
          retry={() => setRevision((v) => v + 1)}
        />
        {template ? (
          <TemplateDetails
            key={template.id}
            item={template}
            onRefresh={() => setRevision((v) => v + 1)}
          />
        ) : !rows.loading && !rows.error ? (
          <CertificateEmpty>{c('القالب غير موجود.', 'Template not found.')}</CertificateEmpty>
        ) : null}
      </>
    );
  }
  const filtered =
    rows.data?.data.filter(
      (item) =>
        (!status || item.status === status) &&
        [item.name, item.nameAr, item.nameEn, item.code].some((value) =>
          value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        ),
    ) ?? [];
  return (
    <CertificatePanel
      title={c('قوالب الشهادات', 'Certificate templates')}
      actions={
        <div className="certificate-actions">
          <button onClick={() => setRevision((v) => v + 1)}>
            <RefreshCw />
            {c('تحديث', 'Refresh')}
          </button>
          {hasPermission('admin:certificates:templates:author') ? (
            <Link className="certificate-link certificate-primary" to="/certificates/templates/new">
              <Plus />
              {c('قالب جديد', 'New template')}
            </Link>
          ) : null}
        </div>
      }
    >
      <p className="certificate-muted">
        {c(
          'القالب يمر بالمراجعة والاعتماد قبل التفعيل. تعديل التصميم لا يغير الشهادات الصادرة.',
          'Templates are reviewed and approved before activation. Issued certificates retain their historical design.',
        )}
      </p>
      <div className="certificate-filters">
        <label>
          {c('البحث في القوالب', 'Search templates')}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {c('الحالة', 'Status')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{c('كل الحالات', 'All statuses')}</option>
            {[
              'DRAFT',
              'PENDING_APPROVAL',
              'APPROVED',
              'ACTIVE',
              'DEPRECATED',
              'ARCHIVED',
              'RETIRED',
            ].map((value) => (
              <option key={value} value={value}>
                {
                  (
                    {
                      DRAFT: c('مسودة', 'Draft'),
                      PENDING_APPROVAL: c('بانتظار الاعتماد', 'Pending approval'),
                      APPROVED: c('معتمد', 'Approved'),
                      ACTIVE: c('نشط', 'Active'),
                      DEPRECATED: c('موقوف للاستخدام الجديد', 'Deprecated'),
                      ARCHIVED: c('مؤرشف', 'Archived'),
                      RETIRED: c('متقاعد', 'Retired'),
                    } as Record<string, string>
                  )[value]
                }
              </option>
            ))}
          </select>
        </label>
      </div>
      <CertificateReadState
        loading={rows.loading}
        error={rows.error}
        retry={() => setRevision((v) => v + 1)}
      />
      <div className="certificate-grid">
        {filtered.map((item) => (
          <article className="certificate-card" key={item.id}>
            <div className="certificate-toolbar">
              <h3>{ar ? item.nameAr : item.nameEn}</h3>
              <StatusBadge status={item.status} />
            </div>
            <small>
              {item.code} · v{item.templateVersion} ·{' '}
              {item.issuerName || c('اسم الجهة غير متاح', 'Issuer name unavailable')}
            </small>
            <div className="certificate-preview-frame">
              <CertificatePreview compact template={item} />
            </div>
            <Link className="certificate-link" to={'/certificates/templates/' + item.id}>
              <Eye />
              {c('التفاصيل والمعاينة', 'Details and preview')}
            </Link>
          </article>
        ))}
      </div>
      {rows.data && !filtered.length ? (
        <CertificateEmpty>
          {rows.data.data.length
            ? c('لا توجد قوالب مطابقة.', 'No matching templates.')
            : c(
                'لا توجد قوالب بعد. ابدأ بقالب جديد أو القالب الرسمي.',
                'No templates yet. Start with a new or official template.',
              )}
        </CertificateEmpty>
      ) : null}
      {rows.data &&
      !rows.data.data.some((item) => item.code === 'MNR-SIGNATURE') &&
      hasPermission('admin:certificates:templates:author') ? (
        <BootstrapTemplate onDone={() => setRevision((v) => v + 1)} />
      ) : null}
    </CertificatePanel>
  );
}
function BootstrapTemplate({ onDone }: { onDone: () => void }) {
  const { c } = useCertificateCopy(),
    issuers = useCertificateRead<{ data: CertificateIssuer[] }>('/admin/certificates/issuers'),
    command = useCertificateCommand();
  const issuer = issuers.data?.data.find(
    (item) => item.code === 'MANARATAK' && item.status === 'ACTIVE',
  );
  return (
    <div className="certificate-notice">
      <p>
        {c(
          'القالب الرسمي يستخدم جهة MANARATAK النشطة ويحفظ كمسودة للمراجعة.',
          'The official design uses the active MANARATAK issuer and is saved as a reviewable draft.',
        )}
      </p>
      <button
        disabled={!issuer || command.busy}
        onClick={() =>
          void command
            .execute('/admin/certificates/templates/bootstrap-default', { issuerId: issuer?.id })
            .then((result) => {
              if (result) onDone();
            })
        }
      >
        {c('إنشاء القالب الرسمي', 'Create official template')}
      </button>
      {!issuer ? (
        <small>
          {c('يلزم أولًا اعتماد جهة منارتك.', 'An active MANARATAK issuer is required.')}
        </small>
      ) : null}
      {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
    </div>
  );
}
function TemplateDetails({
  item,
  onRefresh,
}: {
  item: TemplateWithHistory;
  onRefresh: () => void;
}) {
  const { c, ar } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    command = useCertificateCommand(),
    [target, setTarget] = useState<TemplateStatus | null>(null),
    [reason, setReason] = useState('');
  const reviewer = target && ['APPROVED', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'].includes(target);
  const review = useCertificateRead<CertificateTemplateReviewSnapshot>(
    reviewer ? `/admin/certificates/templates/${item.id}/review` : null,
  );
  const options: TemplateStatus[] =
    item.status === 'DRAFT'
      ? ['PENDING_APPROVAL']
      : item.status === 'PENDING_APPROVAL'
        ? ['APPROVED', 'DRAFT']
        : item.status === 'APPROVED'
          ? ['ACTIVE', 'DRAFT']
          : item.status === 'ACTIVE'
            ? ['DEPRECATED']
            : item.status === 'DEPRECATED'
              ? ['ARCHIVED']
              : [];
  async function transition(value: string) {
    const result = await command.execute(
      `/admin/certificates/templates/${item.id}/transition`,
      { status: target, reason: value },
      { headers: { 'If-Match': `"${item.currentVersionId}:${item.status}"` } },
    );
    if (result) {
      setTarget(null);
      onRefresh();
    }
  }
  return (
    <>
      <CertificatePanel
        title={ar ? item.nameAr : item.nameEn}
        actions={<StatusBadge status={item.status} />}
      >
        <div className="certificate-actions">
          {hasPermission('admin:certificates:templates:author') ? (
            <>
              {item.status === 'DRAFT' ? (
                <Link
                  className="certificate-link"
                  to={'/certificates/templates/' + item.id + '/edit'}
                >
                  {c('إنشاء نسخة تعديل', 'Edit draft version')}
                </Link>
              ) : null}
              <Link
                className="certificate-link"
                to={'/certificates/templates/new?clone=' + item.id}
              >
                <Copy />
                {c('نسخ كقالب مستقل', 'Copy as independent template')}
              </Link>
            </>
          ) : null}
          {options
            .filter((status) =>
              hasPermission(
                ['APPROVED', 'ACTIVE', 'DEPRECATED', 'ARCHIVED'].includes(status)
                  ? 'admin:certificates:templates:approve'
                  : 'admin:certificates:templates:author',
              ),
            )
            .map((status) => (
              <button
                key={status}
                onClick={() => {
                  setReason('');
                  setTarget(status);
                }}
              >
                {
                  (
                    {
                      DRAFT: c('إرجاع للمسودة', 'Return to draft'),
                      PENDING_APPROVAL: c('إرسال للمراجعة', 'Submit for review'),
                      APPROVED: c('مراجعة واعتماد', 'Review and approve'),
                      ACTIVE: c('تفعيل القالب', 'Activate template'),
                      DEPRECATED: c('إيقاف الاستخدام الجديد', 'Deprecate'),
                      ARCHIVED: c('أرشفة', 'Archive'),
                    } as Record<string, string>
                  )[status]
                }
              </button>
            ))}
        </div>
        <div className="certificate-preview-frame">
          <CertificatePreview template={item} />
        </div>
        <dl className="certificate-definition">
          <div>
            <dt>{c('الكود والإصدار', 'Code and version')}</dt>
            <dd dir="ltr">
              {item.code} · {item.templateVersion}
            </dd>
          </div>
          <div>
            <dt>{c('جهة الإصدار', 'Issuer')}</dt>
            <dd>{item.issuerName || c('غير متاح', 'Unavailable')}</dd>
          </div>
          <div>
            <dt>{c('اللغة', 'Language')}</dt>
            <dd>
              {item.language === 'BILINGUAL'
                ? c('عربي وإنجليزي', 'Arabic and English')
                : item.language === 'ARABIC'
                  ? c('العربية', 'Arabic')
                  : c('الإنجليزية', 'English')}
            </dd>
          </div>
          <div>
            <dt>{c('سياسة الصلاحية', 'Validity policy')}</dt>
            <dd>
              {item.validityPolicy === 'PERMANENT'
                ? c('دائمة', 'Permanent')
                : item.validityPolicy === 'RENEWABLE'
                  ? c('قابلة للتجديد', 'Renewable')
                  : c('محددة المدة', 'Expiring')}
            </dd>
          </div>
        </dl>
        <CertificateNotice>
          {c(
            'نسخة القالب جزء من ربط الدورة. لا يُحدّث الربط تلقائيًا عند تغيير النسخة أو نسخ القالب؛ راجع ربط الدورات قبل تفعيل أو إيقاف قالب مستخدم.',
            'Course bindings pin a template version. Version changes and copies do not automatically update courses; review bindings before activation or deprecation.',
          )}
          <AdminLink className="certificate-link" to="/courses">
            {c('فتح الدورات', 'Open courses')}
          </AdminLink>
        </CertificateNotice>
      </CertificatePanel>
      {target ? (
        <CertificatePanel title={c('مراجعة انتقال القالب', 'Review template transition')}>
          <p>
            {c('الإجراء المطلوب', 'Requested state')}: <StatusBadge status={target} />
          </p>
          {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
          {reviewer ? (
            <>
              <CertificateReadState loading={review.loading} error={review.error} />
              {review.data &&
              review.data.currentVersionId === item.currentVersionId &&
              review.data.status === item.status ? (
                <CertificateTemplateReview
                  snapshot={review.data}
                  busy={command.busy}
                  onConfirm={transition}
                />
              ) : review.data ? (
                <CertificateNotice error>
                  {c(
                    'تغيّرت النسخة. حدّث القالب قبل القرار.',
                    'The version changed. Refresh before deciding.',
                  )}
                </CertificateNotice>
              ) : null}
            </>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void transition(reason);
              }}
            >
              <label>
                {c('سبب القرار', 'Decision reason')}
                <textarea
                  minLength={8}
                  maxLength={2000}
                  required
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                />
              </label>
              <button disabled={command.busy || reason.trim().length < 8}>
                {c('تأكيد الإجراء', 'Confirm action')}
              </button>
            </form>
          )}
          <button disabled={command.busy} onClick={() => setTarget(null)}>
            {c('إلغاء', 'Cancel')}
          </button>
        </CertificatePanel>
      ) : null}
      <TemplateVersionHistory id={item.id} />
    </>
  );
}
function TemplateVersionHistory({ id }: { id: string }) {
  const { c, language } = useCertificateCopy(),
    [page, setPage] = useState(1),
    [revision, setRevision] = useState(0),
    read = useCertificateRead<{
      data: Array<{ id: string; versionNumber: string; status: string; createdAt: string }>;
      total: number;
      page: number;
      pageSize: number;
    }>(`/admin/certificates/templates/${id}/versions?page=${page}&pageSize=25`, revision);
  return (
    <CertificatePanel title={c('الإصدارات المحفوظة', 'Saved versions')}>
      <CertificateReadState
        loading={read.loading}
        error={read.error}
        retry={() => setRevision((v) => v + 1)}
      />
      {read.data ? (
        <>
          <div className="certificate-table-scroll">
            <table className="certificate-table">
              <thead>
                <tr>
                  <th>{c('الإصدار', 'Version')}</th>
                  <th>{c('الحالة', 'Status')}</th>
                  <th>{c('تاريخ الإنشاء', 'Created')}</th>
                  <th>{c('المعاينة', 'Preview')}</th>
                </tr>
              </thead>
              <tbody>
                {read.data.data.map((version) => (
                  <tr key={version.id}>
                    <td>{version.versionNumber}</td>
                    <td>
                      <StatusBadge status={version.status} />
                    </td>
                    <td>{formatDate(version.createdAt, language)}</td>
                    <td>
                      <HistoricalPreview id={version.id} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <CertificatePager
            page={read.data.page}
            pageSize={read.data.pageSize}
            total={read.data.total}
            onPage={setPage}
          />
        </>
      ) : null}
    </CertificatePanel>
  );
}
function HistoricalPreview({ id }: { id: string }) {
  const { c } = useCertificateCopy(),
    [open, setOpen] = useState(false),
    read = useCertificateRead<CertificateTemplate>(
      open ? '/admin/certificates/template-versions/' + id : null,
    );
  return (
    <>
      <button aria-expanded={open} onClick={() => setOpen((v) => !v)}>
        {c('عرض النسخة', 'View version')}
      </button>
      {open ? (
        <>
          <CertificateReadState loading={read.loading} error={read.error} />
          {read.data ? (
            <div className="certificate-preview-frame">
              <CertificatePreview template={read.data} />
            </div>
          ) : null}
        </>
      ) : null}
    </>
  );
}
