import { useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import {
  Users,
  Mail,
  Building2,
  ArrowRightLeft,
  RefreshCw,
  Plus,
  ShieldCheck,
  Search,
} from 'lucide-react';
import type {
  StaffReadiness,
  StaffMember,
  StaffDepartment,
  StaffJobTitle,
  StaffEvent,
} from '@manaratak/domain';
import { useStaffCommand, useStaffRead } from './staffHooks';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { IdentityAdminPage } from '../../pages/IdentityAdminPage';
import {
  OwnerHeading,
  OwnerNavigation,
  OwnerPanel,
  useOwnerCopy,
} from '../services-finance/WorkspaceUI';
import { StaffDraftForm, StaffOrganization } from './StaffWorkspaceForms';
import './workspace.css';

export function StaffIdentityWorkspace() {
  const { c, dir } = useOwnerCopy(),
    { hasPermission } = useAdminAuthorization(),
    [params, setParams] = useSearchParams(),
    { identityId } = useParams<{ identityId: string }>();
  const [dirty, setDirty] = useState(false),
    [creating, setCreating] = useState(false),
    [notice, setNotice] = useState('');
  const readiness = useStaffRead<StaffReadiness>('/admin/staff/readiness');
  const groups = [
    {
      id: 'employees',
      label: c('الموظفون', 'Employees'),
      description: c('السجل الوظيفي', 'Staff directory'),
      icon: Users,
    },
    {
      id: 'invitations',
      label: c('الدعوات والانضمام', 'Invitations & onboarding'),
      description: c('القبول وجاهزية الوصول', 'Acceptance & access readiness'),
      icon: Mail,
    },
    {
      id: 'organization',
      label: c('الهيكل الوظيفي', 'Organization'),
      description: c('الأقسام والمسميات', 'Departments & job titles'),
      icon: Building2,
    },
    {
      id: 'changes',
      label: c('التغييرات والمغادرة', 'Changes & offboarding'),
      description: c('السجل وتسليم المهام', 'History & handover'),
      icon: ArrowRightLeft,
    },
  ];
  const raw = params.get('tab'),
    tab = identityId
      ? 'directory'
      : raw === 'directory' || (!raw && (params.has('search') || params.has('type')))
        ? 'directory'
        : groups.some((row) => row.id === raw)
          ? raw!
          : 'employees';
  const change = (next: string) => {
    if (
      dirty &&
      !window.confirm(c('لديك تغييرات غير محفوظة. هل تريد تركها؟', 'Discard unsaved changes?'))
    )
      return;
    setDirty(false);
    setCreating(false);
    setParams({ tab: next });
  };
  const ready = readiness.value?.ready === true;
  return (
    <section dir={dir} className="sf-workspace iam-workspace mx-auto max-w-7xl">
      <OwnerHeading
        title={c('الموظفون والهويات', 'Employees & identities')}
        description={c(
          'العلاقة الوظيفية مستقلة عن الهوية وصلاحيات الوصول. الحفظ لا يفعّل حسابًا أو يمنح دورًا.',
          'Staff membership is separate from identity and access. Saving never activates an account or grants a role.',
        )}
        actions={
          <>
            <button type="button" onClick={readiness.reload} disabled={readiness.loading}>
              <RefreshCw size={16} />
              {c('تحديث', 'Refresh')}
            </button>
            {hasPermission('admin:authorization:manage') && (
              <Link to="/authorization">
                <ShieldCheck size={16} />
                {c('الأدوار والصلاحيات', 'Roles & authorization')}
              </Link>
            )}
          </>
        }
      />
      <OwnerNavigation
        items={groups}
        active={tab === 'directory' ? 'employees' : tab}
        onChange={change}
        label={c('مجموعات الموظفين', 'Staff groups')}
      />
      {(tab === 'employees' || tab === 'directory') && (
        <OwnerNavigation
          secondary
          items={[
            { id: 'employees', label: c('سجل الموظفين', 'Staff directory'), icon: Users },
            {
              id: 'directory',
              label: c('دليل الهويات العام', 'General identity directory'),
              icon: Search,
            },
          ]}
          active={tab}
          onChange={change}
          label={c('دليل الأشخاص', 'People directories')}
        />
      )}
      {notice && <p role="status">{notice}</p>}
      {tab === 'directory' ? (
        <IdentityAdminPage key={identityId || 'directory'} embedded onDirtyChange={setDirty} />
      ) : (
        <>
          {readiness.loading && (
            <p role="status">
              {c('جارٍ فحص تهيئة سجل الموظفين…', 'Checking staff storage readiness…')}
            </p>
          )}
          {readiness.error && (
            <p role="alert">
              {c(
                'تعذر فحص التهيئة. أعد المحاولة؛ لم يُعرض عدد موظفين افتراضي.',
                'Could not check readiness. Retry; no placeholder staff count is shown.',
              )}{' '}
              {readiness.error}
            </p>
          )}
          {readiness.value && !ready && (
            <OwnerPanel title={c('تهيئة سجل الموظفين مطلوبة', 'Staff storage requires setup')}>
              <p className="sf-notice">
                {c(
                  'سجل الموظفين غير مهيأ للاستخدام في هذه القاعدة. راجع تهيئة الجداول وصلاحيات التخزين قبل الحفظ. يظل دليل الهويات العام متاحًا من التبويب المجاور.',
                  'Staff storage is not ready in this database. Review the storage tables and application database privileges before saving. The general identity directory remains available in the adjacent tab.',
                )}
              </p>
              <details>
                <summary>{c('تفاصيل التهيئة', 'Setup details')}</summary>
                <ul>
                  {readiness.value.missingTables.map((name) => (
                    <li className="sf-reference" key={name}>
                      {name}
                    </li>
                  ))}
                  {readiness.value.missingPrivileges?.map((name) => (
                    <li className="sf-reference" key={name}>
                      {name} · {c('صلاحيات التخزين مطلوبة', 'Storage privileges required')}
                    </li>
                  ))}
                </ul>
              </details>
            </OwnerPanel>
          )}
          {tab === 'employees' && ready && (
            <OwnerPanel
              title={c('سجل الموظفين', 'Staff directory')}
              actions={
                <button
                  className="sf-primary"
                  type="button"
                  onClick={() => {
                    if (!dirty || window.confirm(c('ترك التغييرات؟', 'Discard changes?'))) {
                      setCreating((value) => !value);
                      setDirty(false);
                    }
                  }}
                >
                  <Plus size={16} />
                  {creating
                    ? c('إغلاق النموذج', 'Close form')
                    : c('إضافة موظف', 'Add staff member')}
                </button>
              }
            >
              {creating ? (
                <StaffDraftForm
                  onDirtyChange={setDirty}
                  onSaved={(id) => {
                    setCreating(false);
                    setDirty(false);
                    setNotice(
                      c(
                        'حُفظت مسودة الموظف. لم يُمنح وصول إداري.',
                        'Staff draft saved. No administrative access was granted.',
                      ),
                    );
                    setParams({ tab: 'employees', member: id });
                  }}
                />
              ) : (
                <StaffDirectory />
              )}
            </OwnerPanel>
          )}
          {tab === 'organization' && ready && <StaffOrganization onDirtyChange={setDirty} />}
          {tab === 'invitations' && (
            <OwnerPanel title={c('الدعوات وجاهزية الانضمام', 'Invitations & onboarding readiness')}>
              <p className="sf-notice">
                {c(
                  'إرسال الدعوات وقبولها وتفعيل العضوية غير مفعّل. يلزم اعتماد تخزين الدعوة الآمن، وإثبات ملكية البريد، ومنع ربط حساب قائم تلقائيًا. لم يُشغّل مزود إرسال خارجي.',
                  'Invitation delivery, acceptance and membership activation are disabled pending secure invitation storage, email ownership proof and existing-account protection. External delivery remains disabled.',
                )}
              </p>
              <ol className="iam-steps">
                {[
                  c('حفظ مسودة موظف', 'Save a staff draft'),
                  c(
                    'دعوة آمنة وقبول صريح من صاحب الحساب',
                    'Secure invitation and explicit account-holder acceptance',
                  ),
                  c(
                    'اعتماد إسناد الوصول والتحقق من MFA',
                    'Approve access assignments and verify MFA',
                  ),
                  c(
                    'تفعيل العضوية بعد اجتياز متطلبات المالك',
                    'Activate membership after owner prerequisites pass',
                  ),
                ].map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </OwnerPanel>
          )}
          {tab === 'changes' && (
            <OwnerPanel title={c('التغييرات والمغادرة', 'Changes & offboarding')}>
              <p className="sf-notice">
                {c(
                  'المغادرة والنقل غير مفعّلين حتى اعتماد مصادر منح الأدوار وحاجز منع الإدارة المستقل. لا نستخدم تعليق الهوية لإيقاف العمل؛ فقد يحتفظ الشخص بحساب طالب.',
                  'Offboarding and transfers are disabled pending role-grant provenance and an independent admin-access fence. Global identity suspension is not staff offboarding; the person may retain student access.',
                )}
              </p>
              {ready && <StaffHistory />}
            </OwnerPanel>
          )}
        </>
      )}
    </section>
  );
}
function StaffDirectory() {
  const { c } = useOwnerCopy(),
    [params, setParams] = useSearchParams(),
    [search, setSearch] = useState(params.get('staffSearch') || ''),
    [status, setStatus] = useState(params.get('staffStatus') || '');
  const selected = params.get('member'),
    query = new URLSearchParams({
      limit: '20',
      ...(params.get('staffSearch') ? { search: params.get('staffSearch')! } : {}),
      ...(params.get('staffStatus') ? { status: params.get('staffStatus')! } : {}),
      ...(params.get('staffCursor') ? { cursor: params.get('staffCursor')! } : {}),
    });
  const read = useStaffRead<{ items: StaffMember[]; nextCursor: string | null }>(
    '/admin/staff/members?' + query.toString(),
  );
  const detail = useStaffRead<StaffMember>(
    selected ? '/admin/staff/members/' + encodeURIComponent(selected) : null,
  );
  const org = useStaffRead<{ departments: StaffDepartment[]; titles: StaffJobTitle[] }>(
    '/admin/staff/organization',
  );
  const command = useStaffCommand(() => {
      detail.reload();
      read.reload();
    }),
    [reason, setReason] = useState('');
  const update = (key: string, value: string) =>
    setParams((previous) => {
      const next = new URLSearchParams(previous);
      value ? next.set(key, value) : next.delete(key);
      return next;
    });
  if (selected)
    return (
      <div className="space-y-3">
        <button className="sf-secondary" onClick={() => update('member', '')}>
          {c('رجوع إلى السجل', 'Back to directory')}
        </button>
        {detail.loading && <p role="status">{c('جارٍ التحميل…', 'Loading…')}</p>}
        {detail.error && <p role="alert">{detail.error}</p>}
        {detail.value && (
          <>
            <h3>{detail.value.displayName}</h3>
            <p>{detail.value.email}</p>
            <p className="sf-reference">{detail.value.publicId}</p>
            <div className="sf-form-grid">
              <p>
                {c('حالة العمل: ', 'Employment status: ')}
                {detail.value.status === 'DRAFT'
                  ? c('مسودة — بلا وصول وظيفي', 'Draft — no staff access')
                  : detail.value.status === 'CANCELLED'
                    ? c('مسودة ملغاة', 'Cancelled draft')
                    : detail.value.status}
              </p>
              <p>
                {c('حالة الهوية: ', 'Identity status: ')}
                {detail.value.identityStatus || c('غير مرتبطة', 'Not linked')}
              </p>
              <p>
                {c('القسم: ', 'Department: ')}
                {org.value?.departments.find((row) => row.id === detail.value!.departmentId)
                  ?.name || '—'}
              </p>
              <p>
                {c('المسمى: ', 'Title: ')}
                {org.value?.titles.find((row) => row.id === detail.value!.jobTitleId)?.name || '—'}
              </p>
            </div>
            {detail.value.identityId && (
              <Link
                className="sf-secondary"
                to={'/identities/' + encodeURIComponent(detail.value.identityId) + '?tab=directory'}
              >
                {c('تفاصيل الهوية لدى مالك الحساب', 'Account owner identity details')}
              </Link>
            )}
            <p className="sf-notice">
              {c(
                'الخطوة التالية: اعتماد مخطط الدعوة والقبول ومصادر الوصول قبل التفعيل. لم يُمنح أي دور بحفظ هذه المسودة.',
                'Next: approve invitation, acceptance and grant-provenance contracts before activation. Saving this draft granted no roles.',
              )}
            </p>
            {detail.value.status === 'DRAFT' && (
              <form
                onSubmit={(event) => {
                  event.preventDefault();
                  if (
                    window.confirm(
                      c(
                        'إلغاء هذه المسودة دون تغيير الحساب؟',
                        'Cancel this draft without changing the account?',
                      ),
                    )
                  )
                    void command.run(
                      '/admin/staff/members/' + encodeURIComponent(detail.value!.id) + '/cancel',
                      { version: detail.value!.version, reason },
                    );
                }}
              >
                <label className="sf-field">
                  {c('سبب إلغاء المسودة', 'Draft cancellation reason')}
                  <input
                    required
                    minLength={3}
                    maxLength={1000}
                    value={reason}
                    onChange={(event) => setReason(event.target.value)}
                  />
                </label>
                <button
                  className="sf-secondary"
                  disabled={command.busy || reason.trim().length < 3}
                >
                  {c('إلغاء المسودة فقط', 'Cancel draft only')}
                </button>
                {command.error && <p role="alert">{command.error}</p>}
              </form>
            )}
            <StaffHistory membershipId={detail.value.id} />
          </>
        )}
      </div>
    );
  return (
    <>
      <form
        className="sf-filter-row"
        onSubmit={(event) => {
          event.preventDefault();
          setParams((previous) => {
            const next = new URLSearchParams(previous);
            next.delete('staffCursor');
            search.trim() ? next.set('staffSearch', search.trim()) : next.delete('staffSearch');
            status ? next.set('staffStatus', status) : next.delete('staffStatus');
            return next;
          });
        }}
      >
        <label className="sf-field">
          {c('بحث', 'Search')}
          <input
            value={search}
            maxLength={240}
            onChange={(event) => setSearch(event.target.value)}
          />
        </label>
        <label className="sf-field">
          {c('الحالة', 'Status')}
          <select value={status} onChange={(event) => setStatus(event.target.value)}>
            <option value="">{c('الكل', 'All')}</option>
            <option value="DRAFT">{c('مسودة', 'Draft')}</option>
            <option value="CANCELLED">{c('ملغاة', 'Cancelled')}</option>
          </select>
        </label>
        <button className="sf-secondary">{c('تطبيق', 'Apply')}</button>
        <button
          className="sf-secondary"
          type="button"
          onClick={() => {
            setSearch('');
            setStatus('');
            setParams({ tab: 'employees' });
          }}
        >
          {c('مسح الفلاتر', 'Clear filters')}
        </button>
        <button type="button" className="sf-secondary" onClick={read.reload}>
          {c('تحديث', 'Refresh')}
        </button>
      </form>
      {read.loading && <p role="status">{c('جارٍ قراءة السجل…', 'Loading staff…')}</p>}
      {read.error && <p role="alert">{read.error}</p>}
      {!read.loading && !read.error && read.value && !read.value.items.length && (
        <p className="sf-empty">
          {c(
            'لا توجد عضويات وظيفية مطابقة. الهويات العامة لا تُعد موظفين تلقائيًا.',
            'No matching staff memberships. General identities are not automatically staff.',
          )}
        </p>
      )}
      {!!read.value?.items.length && (
        <div className="sf-table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  c('الموظف', 'Staff member'),
                  c('النوع', 'Kind'),
                  c('حالة العمل', 'Employment'),
                  c('القسم', 'Department'),
                  c('الإجراء', 'Action'),
                ].map((label) => (
                  <th key={label}>{label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {read.value.items.map((row) => (
                <tr key={row.id}>
                  <td>
                    <strong>{row.displayName}</strong>
                    <small className="block">{row.email}</small>
                    <small className="sf-reference">{row.publicId}</small>
                  </td>
                  <td>
                    {
                      {
                        EMPLOYEE: c('موظف', 'Employee'),
                        CONTRACTOR: c('متعاقد', 'Contractor'),
                        VOLUNTEER: c('متطوع', 'Volunteer'),
                        SERVICE: c('خدمة', 'Service'),
                      }[row.kind]
                    }
                  </td>
                  <td>
                    {row.status === 'DRAFT'
                      ? c('مسودة', 'Draft')
                      : row.status === 'CANCELLED'
                        ? c('ملغاة', 'Cancelled')
                        : row.status}
                  </td>
                  <td>
                    {org.value?.departments.find((item) => item.id === row.departmentId)?.name ||
                      '—'}
                  </td>
                  <td>
                    <button className="sf-secondary" onClick={() => update('member', row.id)}>
                      {c('تفاصيل', 'Details')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div className="sf-actions">
        {params.has('staffCursor') && (
          <button className="sf-secondary" onClick={() => update('staffCursor', '')}>
            {c('أول السجل', 'First page')}
          </button>
        )}
        {read.value?.nextCursor && (
          <button
            className="sf-secondary"
            onClick={() => update('staffCursor', read.value!.nextCursor!)}
          >
            {c('التالي', 'Next')}
          </button>
        )}
      </div>
    </>
  );
}
function StaffHistory({ membershipId }: { membershipId?: string }) {
  const { c, language } = useOwnerCopy(),
    [cursor, setCursor] = useState('');
  const result = useStaffRead<{ items: StaffEvent[]; nextCursor: string | null }>(
    '/admin/staff/events?' +
      new URLSearchParams({
        limit: '20',
        ...(membershipId ? { membershipId } : {}),
        ...(cursor ? { cursor } : {}),
      }),
  );
  return (
    <div className="space-y-3">
      <h3>{c('سجل التغييرات الوظيفية', 'Staff change history')}</h3>
      {result.loading && <p role="status">{c('جارٍ التحميل…', 'Loading…')}</p>}
      {result.error && <p role="alert">{result.error}</p>}
      {!result.loading && !result.error && result.value && !result.value.items.length && (
        <p className="sf-empty">{c('لا توجد أحداث مسجلة.', 'No recorded events.')}</p>
      )}
      <ul>
        {result.value?.items.map((row) => (
          <li className="sf-form-section" key={row.id}>
            <strong>
              {row.eventType === 'DRAFT_CREATED'
                ? c('حفظ مسودة', 'Draft saved')
                : row.eventType === 'DRAFT_CANCELLED'
                  ? c('إلغاء مسودة', 'Draft cancelled')
                  : row.eventType}
            </strong>
            <p>{row.reason}</p>
            <time dateTime={row.createdAt}>{new Date(row.createdAt).toLocaleString(language)}</time>
            <details>
              <summary>{c('مراجع الحدث', 'Event references')}</summary>
              <p className="sf-reference">
                {row.membershipId} · {row.actorId}
              </p>
            </details>
          </li>
        ))}
      </ul>
      <div className="sf-actions">
        {cursor && (
          <button className="sf-secondary" onClick={() => setCursor('')}>
            {c('الأول', 'First')}
          </button>
        )}
        {result.value?.nextCursor && (
          <button className="sf-secondary" onClick={() => setCursor(result.value!.nextCursor!)}>
            {c('التالي', 'Next')}
          </button>
        )}
      </div>
    </div>
  );
}
