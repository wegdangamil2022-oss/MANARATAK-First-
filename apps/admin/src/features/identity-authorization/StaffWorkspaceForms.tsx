import { useEffect, useState } from 'react';
import type { StaffDepartment, StaffJobTitle, StaffKind } from '@manaratak/domain';
import { createAdminIdempotencyKey } from '../../api/client';
import { OwnerPanel, useOwnerCopy } from '../services-finance/WorkspaceUI';
import { useStaffCommand, useStaffRead } from './staffHooks';

function useDraftGuard(dirty: boolean, onDirtyChange: (value: boolean) => void) {
  const { c } = useOwnerCopy();
  useEffect(() => {
    onDirtyChange(dirty);
    return () => onDirtyChange(false);
  }, [dirty, onDirtyChange]);
  useEffect(() => {
    if (!dirty) return;
    const before = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    const click = (event: MouseEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest('a[href]') &&
        !window.confirm(c('ترك التغييرات غير المحفوظة؟', 'Discard unsaved changes?'))
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
    window.addEventListener('beforeunload', before);
    document.addEventListener('click', click, true);
    return () => {
      window.removeEventListener('beforeunload', before);
      document.removeEventListener('click', click, true);
    };
  }, [dirty, c]);
}
type Organization = { departments: StaffDepartment[]; titles: StaffJobTitle[] };
type IdentityChoice = {
  id: string;
  status: string;
  user?: { profile: { displayName: string }; contactRegistry: { primaryEmail: string } };
};
export function StaffDraftForm({
  onSaved,
  onDirtyChange,
}: {
  onSaved: (id: string) => void;
  onDirtyChange: (dirty: boolean) => void;
}) {
  const { c } = useOwnerCopy(),
    [id] = useState(createAdminIdempotencyKey);
  const [mode, setMode] = useState('new'),
    [name, setName] = useState(''),
    [email, setEmail] = useState(''),
    [kind, setKind] = useState<StaffKind>('EMPLOYEE'),
    [department, setDepartment] = useState(''),
    [title, setTitle] = useState(''),
    [starts, setStarts] = useState(''),
    [ends, setEnds] = useState(''),
    [reason, setReason] = useState('');
  const [search, setSearch] = useState(''),
    [appliedSearch, setAppliedSearch] = useState(''),
    [identity, setIdentity] = useState<IdentityChoice | null>(null);
  const structure = useStaffRead<Organization>('/admin/staff/organization'),
    choices = useStaffRead<{ items: IdentityChoice[] }>(
      appliedSearch
        ? '/admin/identities?' +
            new URLSearchParams({ type: 'Human', limit: '20', search: appliedSearch })
        : null,
    );
  const command = useStaffCommand(() => onSaved(id)),
    dirty =
      !!(name || email || department || title || starts || ends || reason || identity) ||
      kind !== 'EMPLOYEE';
  useDraftGuard(dirty, onDirtyChange);
  const incomplete = mode === 'new' ? !name.trim() || !email.trim() : !identity;
  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault();
        if (incomplete || command.busy) return;
        void command.run('/admin/staff/members', {
          id,
          kind,
          reason: reason.trim(),
          ...(mode === 'existing'
            ? { identityId: identity!.id }
            : { displayName: name.trim(), email: email.trim() }),
          ...(department ? { departmentId: department } : {}),
          ...(title ? { jobTitleId: title } : {}),
          ...(starts ? { startsAt: new Date(starts).toISOString() } : {}),
          ...(ends ? { endsAt: new Date(ends).toISOString() } : {}),
        });
      }}
    >
      <p className="sf-notice">
        {c(
          'هذه مسودة عمل محفوظة لدى Staff؛ لا تنشئ حسابًا، ولا توثق بريدًا، ولا ترسل دعوة، ولا تمنح وصولًا.',
          'This is a stored Staff draft. It does not create an account, verify email, send an invitation or grant access.',
        )}
      </p>
      {command.error && <p role="alert">{command.error}</p>}
      {structure.error && <p role="alert">{structure.error}</p>}
      <fieldset disabled={command.busy} className="space-y-3">
        <legend className="font-bold">
          {c('الشخص والعلاقة الوظيفية', 'Person & staff relationship')}
        </legend>
        <label className="sf-field">
          {c('مصدر الهوية', 'Identity source')}
          <select
            value={mode}
            onChange={(event) => {
              setMode(event.target.value);
              setIdentity(null);
              setName('');
              setEmail('');
            }}
          >
            <option value="new">
              {c('شخص جديد — بيانات مقترحة في المسودة', 'New person — proposed draft details')}
            </option>
            <option value="existing">{c('اختيار هوية موجودة', 'Choose existing identity')}</option>
          </select>
        </label>
        {mode === 'new' ? (
          <div className="sf-form-grid">
            <label className="sf-field">
              {c('الاسم', 'Name')}
              <input
                required
                maxLength={240}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="sf-field">
              {c('البريد المقترح', 'Proposed email')}
              <input
                required
                type="email"
                maxLength={320}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
          </div>
        ) : (
          <div className="sf-form-section space-y-2">
            <label className="sf-field">
              {c('ابحث في الهويات بالاسم أو البريد', 'Find an identity by name or email')}
              <input
                maxLength={240}
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </label>
            <button
              type="button"
              className="sf-secondary"
              disabled={search.trim().length < 2 || choices.loading}
              onClick={() => setAppliedSearch(search.trim())}
            >
              {c('بحث', 'Search')}
            </button>
            {choices.loading && <p role="status">{c('جارٍ البحث…', 'Searching…')}</p>}
            {choices.error && <p role="alert">{choices.error}</p>}
            {choices.value && (
              <label className="sf-field">
                {c(
                  'اختيار هوية — لا يثبت القبول أو الملكية',
                  'Choose identity — does not prove acceptance or ownership',
                )}
                <select
                  required
                  value={identity?.id || ''}
                  onChange={(event) =>
                    setIdentity(
                      choices.value!.items.find((row) => row.id === event.target.value) || null,
                    )
                  }
                >
                  <option value="">{c('اختر هوية', 'Select identity')}</option>
                  {choices.value.items
                    .filter((row) => row.user && !['ARCHIVED', 'PURGED'].includes(row.status))
                    .map((row) => (
                      <option key={row.id} value={row.id}>
                        {row.user!.profile.displayName} · {row.user!.contactRegistry.primaryEmail}
                      </option>
                    ))}
                </select>
              </label>
            )}
            {choices.value && !choices.value.items.length && (
              <p className="sf-empty">
                {c('لا توجد نتائج؛ ضيّق البحث أو عدّل الاسم.', 'No results; refine your search.')}
              </p>
            )}
          </div>
        )}
        <div className="sf-form-grid">
          <label className="sf-field">
            {c('نوع العلاقة', 'Relationship type')}
            <select value={kind} onChange={(event) => setKind(event.target.value as StaffKind)}>
              <option value="EMPLOYEE">{c('موظف', 'Employee')}</option>
              <option value="CONTRACTOR">{c('متعاقد', 'Contractor')}</option>
              <option value="VOLUNTEER">{c('متطوع', 'Volunteer')}</option>
              <option value="SERVICE">
                {c('خدمة — مراجعة قبل التفعيل', 'Service — review before activation')}
              </option>
            </select>
          </label>
          <label className="sf-field">
            {c('القسم', 'Department')}
            <select
              value={department}
              disabled={!structure.value}
              onChange={(event) => {
                setDepartment(event.target.value);
                setTitle('');
              }}
            >
              <option value="">{c('غير محدد', 'Not specified')}</option>
              {structure.value?.departments
                .filter((row) => row.status === 'ACTIVE')
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="sf-field">
            {c('المسمى الوظيفي', 'Job title')}
            <select
              value={title}
              disabled={!structure.value}
              onChange={(event) => setTitle(event.target.value)}
            >
              <option value="">{c('غير محدد', 'Not specified')}</option>
              {structure.value?.titles
                .filter(
                  (row) =>
                    row.status === 'ACTIVE' &&
                    (!row.departmentId || row.departmentId === department),
                )
                .map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="sf-field">
            {c('بداية متوقعة بتوقيت جهازك', 'Expected start in your device timezone')}
            <input
              required={!!ends}
              type="datetime-local"
              value={starts}
              onChange={(event) => setStarts(event.target.value)}
            />
          </label>
          <label className="sf-field">
            {c('نهاية متوقعة', 'Expected end')}
            <input
              type="datetime-local"
              min={starts || undefined}
              value={ends}
              required={!!ends}
              onChange={(event) => setEnds(event.target.value)}
            />
          </label>
        </div>
        <label className="sf-field">
          {c('سبب إنشاء المسودة', 'Draft reason')}
          <textarea
            required
            minLength={3}
            maxLength={1000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        <button
          className="sf-primary"
          disabled={
            incomplete ||
            command.busy ||
            reason.trim().length < 3 ||
            !!structure.error ||
            structure.loading
          }
        >
          {command.busy ? c('جارٍ الحفظ…', 'Saving…') : c('حفظ مسودة الموظف', 'Save staff draft')}
        </button>
      </fieldset>
    </form>
  );
}
export function StaffOrganization({ onDirtyChange }: { onDirtyChange: (dirty: boolean) => void }) {
  const { c } = useOwnerCopy(),
    structure = useStaffRead<Organization>('/admin/staff/organization'),
    [section, setSection] = useState<'departments' | 'titles'>('departments'),
    [editing, setEditing] = useState<StaffDepartment | StaffJobTitle | null>(null),
    [open, setOpen] = useState(false),
    [name, setName] = useState(''),
    [description, setDescription] = useState(''),
    [parent, setParent] = useState(''),
    [reason, setReason] = useState(''),
    [id, setId] = useState(createAdminIdempotencyKey);
  const dirty =
    open &&
    (name !== (editing?.name || '') ||
      description !== (editing && 'description' in editing ? editing.description : '') ||
      parent !==
        (editing && 'parentId' in editing
          ? editing.parentId || ''
          : editing && 'departmentId' in editing
            ? editing.departmentId || ''
            : '') ||
      !!reason);
  useDraftGuard(dirty, onDirtyChange);
  const reset = () => {
    setOpen(false);
    setEditing(null);
    setName('');
    setDescription('');
    setParent('');
    setReason('');
    setId(createAdminIdempotencyKey());
  };
  const command = useStaffCommand(() => {
    reset();
    structure.reload();
  });
  const discard = () => !dirty || window.confirm(c('ترك التغييرات؟', 'Discard changes?'));
  return (
    <OwnerPanel
      title={c('الهيكل الوظيفي', 'Organization')}
      actions={
        <button
          className="sf-primary"
          onClick={() => {
            if (discard()) {
              reset();
              setOpen(true);
            }
          }}
        >
          {section === 'departments'
            ? c('إضافة قسم', 'Add department')
            : c('إضافة مسمى', 'Add job title')}
        </button>
      }
    >
      <div className="sf-actions">
        <button
          className="sf-secondary"
          aria-pressed={section === 'departments'}
          onClick={() => {
            if (discard()) {
              reset();
              setSection('departments');
            }
          }}
        >
          {c('الأقسام', 'Departments')}
        </button>
        <button
          className="sf-secondary"
          aria-pressed={section === 'titles'}
          onClick={() => {
            if (discard()) {
              reset();
              setSection('titles');
            }
          }}
        >
          {c('المسميات الوظيفية', 'Job titles')}
        </button>
      </div>
      {structure.loading && <p role="status">{c('جارٍ التحميل…', 'Loading…')}</p>}
      {structure.error && <p role="alert">{structure.error}</p>}
      {command.error && <p role="alert">{command.error}</p>}
      {command.notice && (
        <p role="status">{c('حُفظ الهيكل وأُعيد تحميله.', 'Organization saved and reloaded.')}</p>
      )}
      {open && (
        <form
          className="sf-form-section space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            void command.run('/admin/staff/' + section, {
              id: editing?.id || id,
              name: name.trim(),
              reason: reason.trim(),
              ...(editing ? { version: editing.version } : {}),
              ...(section === 'departments'
                ? parent
                  ? { parentId: parent }
                  : {}
                : { description: description.trim(), ...(parent ? { departmentId: parent } : {}) }),
            });
          }}
        >
          <fieldset disabled={command.busy} className="sf-form-grid">
            <label className="sf-field">
              {c('الاسم', 'Name')}
              <input
                required
                maxLength={240}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="sf-field">
              {section === 'departments'
                ? c('القسم الأعلى', 'Parent department')
                : c('القسم المرتبط', 'Department')}
              <select value={parent} onChange={(event) => setParent(event.target.value)}>
                <option value="">{c('بلا ارتباط', 'None')}</option>
                {structure.value?.departments
                  .filter((row) => row.id !== editing?.id && row.status === 'ACTIVE')
                  .map((row) => (
                    <option value={row.id} key={row.id}>
                      {row.name}
                    </option>
                  ))}
              </select>
            </label>
            {section === 'titles' && (
              <label className="sf-field">
                {c('وصف المسمى', 'Job title description')}
                <textarea
                  required
                  minLength={3}
                  maxLength={1000}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </label>
            )}
            <label className="sf-field">
              {c('سبب التغيير', 'Change reason')}
              <input
                required
                minLength={3}
                maxLength={1000}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              />
            </label>
            <div className="sf-actions">
              <button className="sf-primary" disabled={command.busy || reason.trim().length < 3}>
                {c('حفظ', 'Save')}
              </button>
              <button
                className="sf-secondary"
                type="button"
                disabled={command.busy}
                onClick={() => {
                  if (discard()) reset();
                }}
              >
                {c('إلغاء', 'Cancel')}
              </button>
            </div>
          </fieldset>
        </form>
      )}
      {structure.value && !structure.value[section].length && (
        <p className="sf-empty">{c('لم تُضف سجلات بعد.', 'No records yet.')}</p>
      )}
      <div className="sf-table-wrap">
        <table>
          <thead>
            <tr>
              <th>{c('الاسم', 'Name')}</th>
              <th>{c('الارتباط', 'Relationship')}</th>
              <th>{c('الإجراء', 'Action')}</th>
            </tr>
          </thead>
          <tbody>
            {structure.value?.[section].map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>
                  {structure.value!.departments.find(
                    (department) =>
                      department.id === ('parentId' in row ? row.parentId : row.departmentId),
                  )?.name || '—'}
                </td>
                <td>
                  <button
                    className="sf-secondary"
                    disabled={command.busy}
                    onClick={() => {
                      if (discard()) {
                        setEditing(row);
                        setName(row.name);
                        setDescription('description' in row ? row.description : '');
                        setParent(('parentId' in row ? row.parentId : row.departmentId) || '');
                        setReason('');
                        setOpen(true);
                      }
                    }}
                  >
                    {c('تعديل', 'Edit')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </OwnerPanel>
  );
}
