import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Plus, RefreshCw } from 'lucide-react';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { CertificateAuthorityDelegations } from '../../components/certificates/CertificateAuthorityDelegations';
import {
  CertificateIssuerHistory,
  type CertificateIssuerHistoryEntry,
} from '../../components/certificates/CertificateIssuerHistory';
import {
  CertificatePanel,
  CertificateReadState,
  CertificateBack,
  CertificateEmpty,
  CertificateNotice,
} from './CertificateControls';
import { useCertificateCopy, useCertificateRead, useCertificateCommand } from './certificateHooks';
import { StatusBadge, formatDate, Field } from './CertificateFields';
import type { CertificateIssuer } from './certificateModels';
import { CertificateIssuerEditor } from './CertificateIssuerEditor';
export function CertificateIssuers({ id, editing = false }: { id?: string; editing?: boolean }) {
  const { c, language } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    [revision, setRevision] = useState(0),
    [query, setQuery] = useState(''),
    [status, setStatus] = useState('');
  const read = useCertificateRead<{ data: CertificateIssuer[] }>(
      '/admin/certificates/issuers',
      revision,
    ),
    item = read.data?.data.find((row) => row.id === id);
  if (id === 'new' || editing) {
    if (!hasPermission('admin:certificates:issuers:manage'))
      return (
        <CertificateNotice error>
          {c('يلزم إذن إدارة جهات الإصدار.', 'Issuer management permission is required.')}
        </CertificateNotice>
      );
    if (read.loading || read.error)
      return (
        <CertificateReadState
          loading={read.loading}
          error={read.error}
          retry={() => setRevision((v) => v + 1)}
        />
      );
    return (
      <CertificateIssuerEditor
        key={id + ':' + (item?.updatedAt ?? 'new')}
        source={item}
        editing={editing}
      />
    );
  }
  if (id)
    return (
      <>
        <CertificateBack to="/certificates?section=issuers">
          {c('جهات الإصدار', 'Issuers')}
        </CertificateBack>
        <CertificateReadState
          loading={read.loading}
          error={read.error}
          retry={() => setRevision((v) => v + 1)}
        />
        {item ? (
          <IssuerDetails key={item.id} item={item} onRefresh={() => setRevision((v) => v + 1)} />
        ) : !read.loading && !read.error ? (
          <CertificateEmpty>{c('الجهة غير موجودة.', 'Issuer not found.')}</CertificateEmpty>
        ) : null}
      </>
    );
  const items =
    read.data?.data.filter(
      (row) =>
        (!status || row.status === status) &&
        [row.name, row.code].some((value) =>
          value.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
        ),
    ) ?? [];
  return (
    <CertificatePanel
      title={c('جهات الإصدار', 'Certificate issuers')}
      actions={
        <div className="certificate-actions">
          <button onClick={() => setRevision((v) => v + 1)}>
            <RefreshCw />
            {c('تحديث', 'Refresh')}
          </button>
          {hasPermission('admin:certificates:issuers:manage') ? (
            <Link to="/certificates/issuers/new" className="certificate-link certificate-primary">
              <Plus />
              {c('إضافة جهة', 'Add issuer')}
            </Link>
          ) : null}
        </div>
      }
    >
      <p>
        {c(
          'هوية الجهة واعتمادها وتفويضاتها محفوظة مع تاريخها. ظهور اسم الجهة لا يثبت اعتمادًا أكاديميًا.',
          'Issuer identity, authority and delegations retain their history. An issuer name alone does not establish academic accreditation.',
        )}
      </p>
      <div className="certificate-filters">
        <label>
          {c('بحث باسم الجهة أو رمزها', 'Search issuer name or code')}
          <input value={query} onChange={(e) => setQuery(e.target.value)} />
        </label>
        <label>
          {c('الحالة', 'Status')}
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">{c('كل الحالات', 'All statuses')}</option>
            {['PENDING_APPROVAL', 'ACTIVE', 'SUSPENDED', 'DEPRECATED'].map((value) => (
              <option key={value} value={value}>
                {
                  (
                    {
                      PENDING_APPROVAL: c('بانتظار الاعتماد', 'Pending approval'),
                      ACTIVE: c('نشطة', 'Active'),
                      SUSPENDED: c('معلقة', 'Suspended'),
                      DEPRECATED: c('متوقفة', 'Deprecated'),
                    } as Record<string, string>
                  )[value]
                }
              </option>
            ))}
          </select>
        </label>
      </div>
      <CertificateReadState
        loading={read.loading}
        error={read.error}
        retry={() => setRevision((v) => v + 1)}
      />
      <div className="certificate-grid">
        {items.map((issuer) => (
          <article key={issuer.id} className="certificate-card">
            <div className="certificate-toolbar">
              <h3>{issuer.name}</h3>
              <StatusBadge status={issuer.status} />
            </div>
            <small>
              {issuer.code} ·{' '}
              {issuer.issuerType === 'MANARATAK'
                ? c('منصة منارتك', 'MANARATAK platform')
                : issuer.issuerType === 'UNIVERSITY'
                  ? c('جامعة', 'University')
                  : c('جهة خارجية', 'External issuer')}
            </small>
            <p>
              {issuer.accreditationAuthority ||
                c('لا يوجد اعتماد خارجي مسجل.', 'No external accreditation recorded.')}
            </p>
            <small>
              {c('آخر تعديل', 'Updated')}: {formatDate(issuer.updatedAt, language)}
            </small>
            <Link className="certificate-link" to={'/certificates/issuers/' + issuer.id}>
              {c('التفاصيل والسلطة', 'Details and authority')}
            </Link>
          </article>
        ))}
      </div>
      {read.data && !items.length ? (
        <CertificateEmpty>
          {read.data.data.length
            ? c('لا توجد جهات مطابقة.', 'No matching issuers.')
            : c(
                'لا توجد جهات إصدار بعد. أضف الجهة ثم استكمل مراجعة اعتمادها.',
                'No issuers yet. Add an issuer and complete independent approval.',
              )}
        </CertificateEmpty>
      ) : null}
    </CertificatePanel>
  );
}
function IssuerDetails({ item, onRefresh }: { item: CertificateIssuer; onRefresh: () => void }) {
  const { c, language } = useCertificateCopy(),
    { hasPermission } = useAdminAuthorization(),
    [params, setParams] = useSearchParams(),
    [action, setAction] = useState<'approve' | 'suspend' | null>(null),
    [reason, setReason] = useState(''),
    [evidence, setEvidence] = useState(''),
    [authority, setAuthority] = useState(''),
    command = useCertificateCommand();
  const panel = ['overview', 'delegations', 'history'].includes(params.get('panel') ?? '')
    ? params.get('panel')!
    : 'overview';
  const [cursor, setCursor] = useState<string | undefined>(),
    [historyCursors, setHistoryCursors] = useState<Array<string | undefined>>([]);
  const canHistory = hasPermission('admin:certificates:issuers:manage');
  const history = useCertificateRead<{ data: CertificateIssuerHistoryEntry[] }>(
    panel === 'history' && canHistory
      ? `/admin/certificates/issuers/${item.id}/history${cursor ? '?cursor=' + cursor : ''}`
      : null,
  );
  async function save() {
    const result = await command.execute(
      `/admin/certificates/issuers/${item.id}${action === 'approve' ? '/approve' : ''}`,
      action === 'approve'
        ? { evidenceAssetId: evidence, authorityReference: authority, reason }
        : { status: 'SUSPENDED', reason },
      {
        method: action === 'approve' ? 'POST' : 'PATCH',
        headers: { 'If-Match': `"${item.updatedAt}"` },
      },
    );
    if (result) {
      setAction(null);
      onRefresh();
    }
  }
  return (
    <>
      <CertificatePanel title={item.name} actions={<StatusBadge status={item.status} />}>
        <nav className="certificate-subnav" aria-label={c('تفاصيل الجهة', 'Issuer details')}>
          {(['overview', 'delegations', 'history'] as const)
            .filter((key) =>
              key === 'overview' || key === 'history'
                ? key === 'overview' || canHistory
                : hasPermission('admin:certificates:issuers:manage') ||
                  hasPermission('admin:certificates:issuers:approve'),
            )
            .map((key) => (
              <button
                key={key}
                aria-pressed={panel === key}
                onClick={() => {
                  const next = new URLSearchParams(params);
                  next.set('panel', key);
                  setParams(next);
                }}
              >
                {key === 'overview'
                  ? c('الهوية والاعتماد', 'Identity and authority')
                  : key === 'delegations'
                    ? c('التفويضات والأدلة', 'Delegations and evidence')
                    : c('تاريخ السلطة', 'Authority history')}
              </button>
            ))}
        </nav>
        {panel === 'overview' ? (
          <>
            <dl className="certificate-definition">
              {[
                [c('الرمز', 'Code'), item.code],
                [c('الجهة', 'Issuer'), item.name],
                [
                  c('الاعتماد المسجل', 'Recorded accreditation'),
                  item.accreditationAuthority || c('غير مسجل', 'Not recorded'),
                ],
                [c('مرجع الاعتماد', 'Accreditation reference'), item.accreditationReference || '—'],
                [c('آخر تعديل', 'Updated'), formatDate(item.updatedAt, language)],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
              {canHistory ? (
                <div>
                  <dt>{c('مرجع التوقيع لدى المزود', 'Provider signing reference')}</dt>
                  <dd>{item.signingKeyReference || c('غير متاح', 'Unavailable')}</dd>
                </div>
              ) : null}
            </dl>
            <div className="certificate-actions">
              {canHistory && item.status !== 'ACTIVE' ? (
                <Link
                  className="certificate-link"
                  to={'/certificates/issuers/' + item.id + '/edit'}
                >
                  {c('تعديل بيانات الجهة', 'Edit issuer')}
                </Link>
              ) : null}
              {canHistory && item.status === 'ACTIVE' ? (
                <button
                  className="certificate-danger"
                  onClick={() => {
                    setReason('');
                    setAction('suspend');
                  }}
                >
                  {c('تعليق سلطة الإصدار', 'Suspend issuing authority')}
                </button>
              ) : null}
              {hasPermission('admin:certificates:issuers:approve') &&
              ['PENDING_APPROVAL', 'SUSPENDED'].includes(item.status) ? (
                <button
                  onClick={() => {
                    setReason('');
                    setAction('approve');
                  }}
                >
                  {c('مراجعة اعتماد الجهة', 'Review issuer approval')}
                </button>
              ) : null}
            </div>
            <p className="certificate-muted">
              {c(
                'الجهة النشطة لا تقبل تغيير بيانات سلطتها مباشرة. قرارات الاعتماد تعيد فحص الدليل والنسخة والمراجع المستقل.',
                'Active authority fields are immutable. Approval rechecks evidence, revision and independent reviewer.',
              )}
            </p>
          </>
        ) : null}
        {panel === 'delegations' &&
        (canHistory || hasPermission('admin:certificates:issuers:approve')) ? (
          <CertificateAuthorityDelegations
            issuerId={item.id}
            onUse={(grant) => {
              setEvidence(grant.evidenceAssetId);
              setAuthority(grant.authorityReference);
              setAction('approve');
            }}
          />
        ) : null}
        {panel === 'history' && canHistory ? (
          <>
            <CertificateReadState loading={history.loading} error={history.error} />
            {history.data ? (
              <>
                <CertificateIssuerHistory rows={history.data.data} />
                <div className="certificate-actions">
                  <button
                    disabled={!historyCursors.length}
                    onClick={() => {
                      setCursor(historyCursors.at(-1));
                      setHistoryCursors(historyCursors.slice(0, -1));
                    }}
                  >
                    {c('السابق', 'Previous')}
                  </button>
                  <button
                    disabled={history.data.data.length < 50}
                    onClick={() => {
                      setHistoryCursors([...historyCursors, cursor]);
                      setCursor(history.data!.data.at(-1)!.id);
                    }}
                  >
                    {c('التالي', 'Next')}
                  </button>
                </div>
              </>
            ) : null}
          </>
        ) : null}
      </CertificatePanel>
      {action ? (
        <CertificatePanel
          title={
            action === 'approve'
              ? c('اعتماد جهة الإصدار', 'Approve issuer')
              : c('تعليق سلطة الإصدار', 'Suspend issuer')
          }
        >
          <CertificateNotice>
            {action === 'approve'
              ? c(
                  'يلزم دليل خاص مملوك للجهة ومراجع مستقل. استخدم التفويض المعتمد لتعبئة مرجع الدليل والسلطة.',
                  'A private issuer-owned evidence asset and independent reviewer are required. An approved delegation can supply the references.',
                )
              : c(
                  'قد يمنع التعليق إصدار شهادات جديدة لهذه الجهة. لا يحذف الشهادات السابقة.',
                  'Suspension can prevent new issuance for this issuer. Existing certificates are retained.',
                )}
          </CertificateNotice>
          {command.error ? <CertificateNotice error>{command.error}</CertificateNotice> : null}
          <form
            className="certificate-form"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            {action === 'approve' ? (
              <>
                <Field
                  label={c('مرجع دليل التفويض المعتمد', 'Approved authority evidence reference')}
                  value={evidence}
                  onChange={setEvidence}
                />
                <Field
                  label={c('مرجع السلطة', 'Authority reference')}
                  value={authority}
                  onChange={setAuthority}
                />
              </>
            ) : null}
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
            <footer className="certificate-actions">
              <button disabled={command.busy || reason.trim().length < 8}>
                {c('تأكيد القرار', 'Confirm decision')}
              </button>
              <button type="button" disabled={command.busy} onClick={() => setAction(null)}>
                {c('إلغاء', 'Cancel')}
              </button>
            </footer>
          </form>
        </CertificatePanel>
      ) : null}
    </>
  );
}
