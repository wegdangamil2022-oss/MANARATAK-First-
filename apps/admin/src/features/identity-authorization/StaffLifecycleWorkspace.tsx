import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import type {
  StaffMember,
  StaffLifecycleReadiness,
  StaffLifecycleSnapshot,
  StaffInvitationSummary,
  StaffChangeRequest,
  StaffChangeAction,
  StaffDepartment,
  StaffJobTitle,
} from '@manaratak/domain';
import { adminApiClient, createAdminIdempotencyKey } from '../../api/client';
import { OwnerPanel, useOwnerCopy } from '../services-finance/WorkspaceUI';
import { useStaffRead, useStaffCommand } from './staffHooks';

const handover: Record<string, { to: string; ar: string; en: string }> = {
  directReports: { to: '/identities?tab=employees', ar: 'المرؤوسون', en: 'Direct reports' },
  review: { to: '/review-queue', ar: 'المراجعات', en: 'Reviews' },
  imports: { to: '/imports', ar: 'الاستيراد', en: 'Imports' },
  audit: { to: '/audit?tab=cases', ar: 'قضايا التدقيق', en: 'Audit cases' },
  support: { to: '/students/support?tab=inbox', ar: 'تذاكر الدعم', en: 'Support cases' },
};
const actions: Record<StaffChangeAction, [string, string]> = {
  ACTIVATE: ['تفعيل العضوية', 'Activate membership'],
  SUSPEND: ['إيقاف العمل مؤقتًا', 'Suspend staff access'],
  RESUME: ['استئناف العمل', 'Resume staff access'],
  OFFBOARD: ['إنهاء العضوية الوظيفية', 'Offboard staff'],
  TRANSFER: ['نقل وظيفي', 'Transfer staff'],
};
export function StaffLifecycleWorkspace({ mode }: { mode: 'invitations' | 'changes' }) {
  const { c } = useOwnerCopy();
  const health = useStaffRead<StaffLifecycleReadiness>('/admin/staff/lifecycle/readiness');
  const ready = health.value?.ready === true && health.value.tokenService;
  return (
    <OwnerPanel
      title={
        mode === 'invitations'
          ? c('الدعوات والانضمام', 'Invitations & onboarding')
          : c('التغييرات والمغادرة', 'Changes & offboarding')
      }
    >
      {health.loading && <p role="status">{c('جارٍ فحص الجاهزية…', 'Checking readiness…')}</p>}
      {health.error && (
        <p role="alert">
          {c('تعذر فحص جاهزية الرحلة.', 'Lifecycle readiness could not be checked.')}
        </p>
      )}
      {health.value && !ready && (
        <p className="sf-notice">
          {c(
            'المصدر جاهز، والتشغيل يتطلب اعتماد إضافة تخزين رحلة الموظف وصلاحياتها على هذه القاعدة. لا يكفي وجود جداول المسودات، ولم يُفعّل مزود إرسال خارجي.',
            'Lifecycle storage and grants need operator approval on this database. Draft tables alone are insufficient. External delivery remains disabled.',
          )}
        </p>
      )}
      {ready && <LifecycleContent mode={mode} />}
      <button className="sf-secondary" type="button" onClick={health.reload}>
        {c('إعادة فحص الجاهزية', 'Recheck readiness')}
      </button>
    </OwnerPanel>
  );
}
function LifecycleContent({ mode }: { mode: 'invitations' | 'changes' }) {
  const { c } = useOwnerCopy();
  const [cursor, setCursor] = useState(''),
    [membersCursor, setMembersCursor] = useState(''),
    [memberId, setMemberId] = useState(''),
    [reason, setReason] = useState(''),
    [action, setAction] = useState<StaffChangeAction>('ACTIVATE'),
    [link, setLink] = useState(''),
    [issueError, setIssueError] = useState(''),
    [issuing, setIssuing] = useState(false),
    [department, setDepartment] = useState(''),
    [title, setTitle] = useState(''),
    [manager, setManager] = useState('');
  const health = useStaffRead<StaffLifecycleSnapshot>(
    memberId
      ? '/admin/staff/lifecycle/members/' + encodeURIComponent(memberId) + '/readiness'
      : null,
  );
  const members = useStaffRead<{ items: StaffMember[]; nextCursor: string | null }>(
    '/admin/staff/members?limit=50' +
      (membersCursor ? '&cursor=' + encodeURIComponent(membersCursor) : ''),
  );
  const org = useStaffRead<{ departments: StaffDepartment[]; titles: StaffJobTitle[] }>(
    '/admin/staff/organization',
  );
  const list = useStaffRead<{
    items: Array<StaffInvitationSummary | StaffChangeRequest>;
    nextCursor: string | null;
    actorId: string;
  }>(
    '/admin/staff/lifecycle/' +
      (mode === 'invitations' ? 'invitations' : 'changes') +
      '?limit=20' +
      (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''),
  );
  const command = useStaffCommand(() => {
      list.reload();
      health.reload();
      members.reload();
      setReason('');
    }),
    attempt = useRef<{ id: string; signature: string } | null>(null);
  useEffect(() => {
    const m = health.value?.member;
    if (m) {
      setDepartment(m.departmentId ?? '');
      setTitle(m.jobTitleId ?? '');
      setManager(m.managerId ?? '');
    }
  }, [health.value]);
  const selected = health.value?.member,
    available: StaffChangeAction[] =
      selected?.status === 'DRAFT'
        ? ['ACTIVATE']
        : selected?.status === 'SUSPENDED'
          ? ['RESUME', 'OFFBOARD']
          : selected?.status === 'ACTIVE'
            ? ['SUSPEND', 'OFFBOARD', 'TRANSFER']
            : [];
  useEffect(() => {
    if (available.length && !available.includes(action)) setAction(available[0]);
  }, [selected?.status]);
  const issue = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const signature = JSON.stringify([selected.id, selected.version, reason]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: createAdminIdempotencyKey() };
    setIssuing(true);
    setIssueError('');
    setLink('');
    try {
      const result = await adminApiClient.request<{ data: { id: string; token: string } }>(
        '/admin/staff/lifecycle/invitations',
        {
          method: 'POST',
          body: JSON.stringify({
            id: attempt.current.id,
            membershipId: selected.id,
            version: selected.version,
            reason,
          }),
          idempotencyKey: attempt.current.id,
        },
      );
      setLink(
        window.location.origin +
          '/ar/staff-invitation#' +
          new URLSearchParams({ id: result.data.id, token: result.data.token }),
      );
      attempt.current = null;
      list.reload();
    } catch {
      setIssueError(
        c(
          'تعذر إنشاء الدعوة. أعد المحاولة بنفس الطلب أو حدّث حالة العضوية؛ لم يُرسل بريد.',
          'Invitation creation failed. Retry the same command or refresh membership state; no email was sent.',
        ),
      );
    } finally {
      setIssuing(false);
    }
  };
  const requestChange = async (e: FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const payload =
      action === 'TRANSFER'
        ? {
            departmentId: department || null,
            jobTitleId: title || null,
            managerId: manager || null,
          }
        : {};
    const signature = JSON.stringify([selected.id, selected.version, action, payload, reason]);
    if (attempt.current?.signature !== signature)
      attempt.current = { signature, id: createAdminIdempotencyKey() };
    if (
      await command.run('/admin/staff/lifecycle/changes', {
        id: attempt.current.id,
        membershipId: selected.id,
        version: selected.version,
        action,
        payload,
        reason,
      })
    )
      attempt.current = null;
  };
  return (
    <>
      <p className="sf-notice">
        {mode === 'invitations'
          ? c(
              'الدعوة تُسلَّم يدويًا عبر قناة موثوقة. يلزم تسجيل الدخول بالحساب صاحب البريد الموثق وقبول صريح؛ فتح الرابط لا يستهلك الدعوة ولا يمنح دورًا.',
              'Use a trusted channel for manual handoff. Acceptance requires the authenticated verified email owner. Opening a link does not consume it or grant a role.',
            )
          : c(
              'كل تغيير يحتاج طلبًا ثم اعتماد مسؤول آخر ثم تنفيذ صاحبه. تسليم المهام يسبق المغادرة، وتُحفظ صلاحيات الطالب والإسنادات غير المرتبطة بالعمل.',
              'A requester, independent approver and explicit execution are required. Handover precedes offboarding; student access and unrelated assignments are preserved.',
            )}
      </p>
      <form className="grid gap-3" onSubmit={mode === 'invitations' ? issue : requestChange}>
        <label className="sf-field">
          {c('الموظف', 'Staff member')}
          <select
            required
            value={memberId}
            onChange={(e) => {
              setMemberId(e.target.value);
              setLink('');
            }}
          >
            <option value="">{c('اختر من سجل الموظفين', 'Choose from staff directory')}</option>
            {members.value?.items
              .filter((m) => mode !== 'invitations' || m.status === 'DRAFT')
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.displayName} — {m.publicId} — {m.status}
                </option>
              ))}
          </select>
        </label>
        <div className="sf-filter-row">
          <button
            type="button"
            className="sf-secondary"
            disabled={!members.value?.nextCursor}
            onClick={() => setMembersCursor(members.value!.nextCursor!)}
          >
            {c('الصفحة التالية من الموظفين', 'Next staff page')}
          </button>
          {membersCursor && (
            <button type="button" className="sf-secondary" onClick={() => setMembersCursor('')}>
              {c('أول صفحة', 'First page')}
            </button>
          )}
        </div>
        {health.error && (
          <p role="alert">{c('تعذر قراءة جاهزية الموظف.', 'Staff readiness could not be read.')}</p>
        )}
        {health.value && (
          <div className="sf-notice">
            <p>
              {c('قبول الدعوة', 'Invitation acceptance')}:{' '}
              {health.value.accepted ? c('مقبولة', 'Accepted') : c('لم تُقبل', 'Not accepted')} ·{' '}
              {c('الهوية مؤهلة', 'Identity eligible')}:{' '}
              {health.value.identityEligible ? c('نعم', 'Yes') : c('لا', 'No')} · MFA:{' '}
              {health.value.mfaEnrolled ? c('مسجّل', 'Enrolled') : c('غير مسجّل', 'Not enrolled')}
            </p>
            <p>
              {c('الإسنادات الوظيفية المعروفة', 'Known staff grants')}: {health.value.ownedGrants} ·{' '}
              {c('إسنادات أخرى محفوظة', 'Other preserved grants')}: {health.value.otherGrants}
            </p>
            {Object.entries(health.value.pending)
              .filter(([, n]) => n > 0)
              .map(([owner, n]) => (
                <p key={owner}>
                  {c('مهام تحتاج تسليمًا لدى', 'Handover required for')}{' '}
                  {handover[owner] ? (
                    <Link to={handover[owner].to}>{c(handover[owner].ar, handover[owner].en)}</Link>
                  ) : (
                    owner
                  )}
                  : {n}
                </p>
              ))}
            <Link to={'/identities?tab=employees&member=' + encodeURIComponent(memberId)}>
              {c('تفاصيل الموظف وسجله', 'Staff details & history')}
            </Link>
          </div>
        )}
        {mode === 'changes' && (
          <>
            <label className="sf-field">
              {c('التغيير المطلوب', 'Requested change')}
              <select
                value={action}
                onChange={(e) => setAction(e.target.value as StaffChangeAction)}
              >
                {available.map((a) => (
                  <option key={a} value={a}>
                    {c(...actions[a])}
                  </option>
                ))}
              </select>
            </label>
            {action === 'TRANSFER' && (
              <div className="sf-filter-row">
                <label className="sf-field">
                  {c('القسم', 'Department')}
                  <select value={department} onChange={(e) => setDepartment(e.target.value)}>
                    <option value="">—</option>
                    {org.value?.departments
                      .filter((d) => d.status === 'ACTIVE')
                      .map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="sf-field">
                  {c('المسمى', 'Job title')}
                  <select value={title} onChange={(e) => setTitle(e.target.value)}>
                    <option value="">—</option>
                    {org.value?.titles
                      .filter(
                        (t) =>
                          t.status === 'ACTIVE' &&
                          (!t.departmentId || t.departmentId === department),
                      )
                      .map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="sf-field">
                  {c('المسؤول المباشر', 'Manager')}
                  <select value={manager} onChange={(e) => setManager(e.target.value)}>
                    <option value="">—</option>
                    {manager && !members.value?.items.some((m) => m.id === manager) && (
                      <option value={manager}>
                        {c('المسؤول الحالي', 'Current manager')} — {manager}
                      </option>
                    )}
                    {members.value?.items
                      .filter((m) => m.status === 'ACTIVE' && m.id !== memberId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.displayName}
                        </option>
                      ))}
                  </select>
                </label>
              </div>
            )}
          </>
        )}
        <label className="sf-field">
          {c('المبرر', 'Reason')}
          <input
            required
            minLength={3}
            maxLength={1000}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
          />
        </label>
        <button
          className="sf-primary"
          disabled={
            issuing ||
            command.busy ||
            !selected ||
            reason.trim().length < 3 ||
            (mode === 'changes' && !available.length)
          }
        >
          {mode === 'invitations'
            ? c('إنشاء دعوة آمنة — تسليم يدوي', 'Create secure invitation — manual handoff')
            : c('طلب اعتماد التغيير', 'Request independent approval')}
        </button>
      </form>
      {issueError && <p role="alert">{issueError}</p>}
      {command.error && (
        <p role="alert">
          {c(
            'لم تُنفذ العملية: تحقق من النسخة، الاعتماد، جاهزية الحساب وتسليم المهام.',
            'Operation was not completed. Check version, approval, account readiness and handover.',
          )}{' '}
          {command.error}
        </p>
      )}
      {link && (
        <div className="sf-notice">
          <p>
            {c(
              'رابط سري للتسليم اليدوي؛ لا ترسله في سجل التدقيق أو محادثة عامة.',
              'Secret manual handoff link; keep it out of audit records and public conversations.',
            )}
          </p>
          <input
            readOnly
            type="password"
            value={link}
            aria-label={c('رابط الدعوة السري', 'Secret invitation link')}
          />
          <button
            className="sf-secondary"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(link);
                setIssueError(c('نُسخ الرابط للتسليم الآمن.', 'Link copied for secure handoff.'));
              } catch {
                setIssueError(
                  c('تعذر النسخ؛ تحقق من إذن الحافظة.', 'Clipboard access unavailable.'),
                );
              }
            }}
          >
            {c('نسخ الرابط السري', 'Copy secret link')}
          </button>
          <button className="sf-secondary" onClick={() => setLink('')}>
            {c('إخفاء الرابط', 'Dismiss link')}
          </button>
        </div>
      )}
      <div className="sf-filter-row">
        <button className="sf-secondary" onClick={list.reload}>
          {c('تحديث السجل', 'Refresh records')}
        </button>
        {cursor && (
          <button className="sf-secondary" onClick={() => setCursor('')}>
            {c('أول صفحة', 'First page')}
          </button>
        )}
      </div>
      {list.loading && <p role="status">{c('جارٍ التحميل…', 'Loading…')}</p>}
      {list.error && <p role="alert">{c('تعذر تحميل السجل.', 'Records could not be loaded.')}</p>}
      {list.value?.items.map((row) => (
        <div className="sf-panel" key={row.id}>
          {'email' in row ? (
            <>
              <p>
                {row.email} ·{' '}
                {row.acceptedAt
                  ? c('مقبولة؛ التفعيل مستقل', 'Accepted; activation is separate')
                  : row.revokedAt
                    ? c('ملغاة', 'Revoked')
                    : Date.parse(row.expiresAt) <= Date.now()
                      ? c('منتهية', 'Expired')
                      : c('بانتظار القبول', 'Awaiting acceptance')}
              </p>
              <p>
                {c('تنتهي', 'Expires')}: {new Date(row.expiresAt).toLocaleString()}
              </p>
              {!row.acceptedAt && !row.revokedAt && (
                <button
                  className="sf-secondary"
                  disabled={command.busy}
                  onClick={() => {
                    const why = window.prompt(c('سبب إلغاء الدعوة', 'Reason to revoke invitation'));
                    if (why && why.trim().length >= 3)
                      void command.run('/admin/staff/lifecycle/invitations/' + row.id + '/revoke', {
                        version: row.version,
                        reason: why,
                      });
                  }}
                >
                  {c('إلغاء الدعوة', 'Revoke invitation')}
                </button>
              )}
            </>
          ) : (
            <>
              <p>
                {c(...actions[row.action])} ·{' '}
                {row.usedAt
                  ? c('منفذ', 'Applied')
                  : Date.parse(row.expiresAt) <= Date.now()
                    ? c('انتهت الموافقة؛ اطلب نسخة جديدة', 'Expired; request a fresh change')
                    : row.approvedAt
                      ? c('معتمد — بانتظار التنفيذ', 'Approved — awaiting execution')
                      : c('بانتظار اعتماد مستقل', 'Awaiting independent approval')}
              </p>
              <p>{row.reason}</p>
              <p>
                {c('صاحب الطلب', 'Requester')}: {row.requestedBy}
              </p>
              {!row.usedAt &&
                Date.parse(row.expiresAt) > Date.now() &&
                (!row.approvedAt && row.requestedBy !== list.value?.actorId ? (
                  <button
                    className="sf-secondary"
                    disabled={command.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          c('اعتماد هذه النسخة من التغيير؟', 'Approve this exact change?'),
                        )
                      )
                        void command.run('/admin/staff/lifecycle/changes/' + row.id + '/approve', {
                          version: row.version,
                        });
                    }}
                  >
                    {c('اعتماد من حسابي', 'Approve from my account')}
                  </button>
                ) : row.approvedAt && row.requestedBy === list.value?.actorId ? (
                  <button
                    className="sf-primary"
                    disabled={command.busy}
                    onClick={() => {
                      if (
                        window.confirm(
                          c(
                            'تنفيذ التغيير المعتمد؟ ستُفحص الجاهزية مجددًا.',
                            'Apply approved change? Readiness will be rechecked.',
                          ),
                        )
                      )
                        void command.run('/admin/staff/lifecycle/changes/' + row.id + '/apply', {
                          version: row.version,
                        });
                    }}
                  >
                    {c('تنفيذ النسخة المعتمدة', 'Apply approved change')}
                  </button>
                ) : null)}
            </>
          )}
          <Link to={'/identities?tab=employees&member=' + row.membershipId}>
            {c('فتح سجل الموظف', 'Open staff record')}
          </Link>
        </div>
      ))}
      {!list.loading && list.value?.items.length === 0 && (
        <p className="sf-notice">{c('لا توجد سجلات في هذه الصفحة.', 'No records on this page.')}</p>
      )}
      {list.value?.nextCursor && (
        <button className="sf-secondary" onClick={() => setCursor(list.value!.nextCursor!)}>
          {c('الصفحة التالية', 'Next page')}
        </button>
      )}
    </>
  );
}
