import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { isInternalStudentTool } from '@manaratak/domain';
import {
  ClipboardList,
  FileText,
  LayoutDashboard,
  Rocket,
  ShieldCheck,
  TestTube2,
} from 'lucide-react';
import { adminApiClient } from '../../api/client';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { TestDiscoveryEditor } from '../integration/TestDiscoveryEditor';
import {
  EvidenceTime,
  ReadState,
  useWorkspaceCopy,
  useWorkspaceRead,
  WorkspacePanel,
} from './Workspace';
import {
  nextToolVersion,
  TOOL_CATEGORIES,
  TOOL_TABS,
  toolLabel,
  type Page,
  type Tool,
  type ToolDetail,
} from './studentToolModel';
import { ToolDependency, ToolExecutions } from './ToolOperations';
import { ToolTestPanel } from './ToolTestPanel';

const tabIcons = {
  overview: LayoutDashboard,
  content: FileText,
  access: ShieldCheck,
  release: Rocket,
  quality: TestTube2,
  executions: ClipboardList,
};

export function StudentToolDetails({
  toolKey,
  onState,
}: {
  toolKey: string;
  onState: (state: { dirty: boolean; busy: boolean; discard: () => void }) => void;
}) {
  const { c, language } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const [params] = useSearchParams();
  const tab = TOOL_TABS.some(([key]) => key === params.get('tab'))
    ? params.get('tab')!
    : 'overview';
  const base = '/admin/student-tools/' + encodeURIComponent(toolKey);
  const read = useWorkspaceRead<{ data: ToolDetail }>(base);
  const [detail, setDetail] = useState<ToolDetail | null>(null),
    [draft, setDraft] = useState<Tool | null>(null);
  const [reason, setReason] = useState(''),
    [version, setVersion] = useState(''),
    [busy, setBusy] = useState(false),
    [uncertain, setUncertain] = useState(false),
    [message, setMessage] = useState(''),
    [error, setError] = useState('');
  const lock = useRef(false),
    mounted = useRef(true);
  const [testBusy, setTestBusy] = useState(false);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);
  useEffect(() => {
    if (read.data) {
      setDetail(read.data.data);
      setDraft(structuredClone(read.data.data.tool));
      setVersion(nextToolVersion(read.data.data.tool.currentVersion.semanticVersion));
      setUncertain(false);
    }
  }, [read.data]);
  const dirty = Boolean(detail && draft && JSON.stringify(detail.tool) !== JSON.stringify(draft));
  useEffect(() => {
    onState({
      dirty,
      busy: busy || testBusy,
      discard: () => {
        if (detail) setDraft(structuredClone(detail.tool));
      },
    });
    return () => onState({ dirty: false, busy: false, discard: () => {} });
  }, [dirty, busy, testBusy, detail, onState]);
  useEffect(() => {
    if (!dirty && !busy && !testBusy) return;
    const listener = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', listener);
    return () => window.removeEventListener('beforeunload', listener);
  }, [dirty, busy, testBusy]);
  const mutate = async (path: string, method: string, body: Record<string, unknown>) => {
    if (!detail || lock.current || uncertain) return;
    if (path !== '/metadata' && path !== '/access-policy' && dirty) {
      setError(
        c(
          'احفظ التعديلات أو تجاهلها قبل قرار الإطلاق.',
          'Save or discard edits before a release decision.',
        ),
      );
      return;
    }
    if (!window.confirm(c('تأكيد حفظ هذا التغيير الموثق؟', 'Confirm this audited change?'))) return;
    lock.current = true;
    setBusy(true);
    setError('');
    setMessage('');
    let written = false;
    try {
      await adminApiClient.request(base + path, {
        method,
        body: JSON.stringify({ expectedRevision: detail.tool.revision, ...body }),
      });
      written = true;
      const fresh = await adminApiClient.request<{ data: ToolDetail }>(base);
      if (!mounted.current) return;
      setDetail(fresh.data);
      setDraft(structuredClone(fresh.data.tool));
      setVersion(nextToolVersion(fresh.data.tool.currentVersion.semanticVersion));
      setReason('');
      setMessage(
        c(
          'تم الحفظ وأُعيدت قراءة الحالة من الخادم.',
          'Saved and confirmed by reading the server state.',
        ),
      );
    } catch {
      if (!mounted.current) return;
      setUncertain(true);
      setError(
        written
          ? c(
              'وصلت استجابة الحفظ، لكن تعذر تأكيد الحالة. أعد تحميل السجل قبل إجراء آخر.',
              'Write acknowledged, but state could not be confirmed. Reload before another change.',
            )
          : c(
              'لم تُؤكد العملية. قد يوجد تعارض إصدار أو قيد صلاحيات أو اعتماد؛ أعد تحميل السجل للتحقق.',
              'The operation was not confirmed. Check revision conflicts, permissions and approval requirements by reloading.',
            ),
      );
    } finally {
      lock.current = false;
      if (mounted.current) setBusy(false);
    }
  };
  if (!detail || !draft) return <ReadState state={read} />;
  const can = (action: string) => hasPermission('admin:student-tools:' + action);
  const saved = detail.tool;
  const edit = (patch: Partial<Tool>) => setDraft({ ...draft, ...patch });
  const refresh = () => {
    if (
      busy ||
      (dirty && !window.confirm(c('تجاهل التعديلات وإعادة التحميل؟', 'Discard edits and reload?')))
    )
      return;
    void read.load();
  };
  return (
    <div className="ai-content">
      <div className="certificate-toolbar">
        <Link className="certificate-link" to="/student-tools">
          {c('العودة إلى المكتبة', 'Back to library')}
        </Link>
        <button disabled={busy || testBusy || read.loading} onClick={refresh}>
          {c('إعادة تحميل السجل', 'Reload record')}
        </button>
      </div>
      <WorkspacePanel title={language === 'en' ? saved.nameEn : saved.nameAr}>
        <small dir="ltr">
          {toolKey} · v{saved.currentVersion.semanticVersion} · r{saved.revision}
        </small>
        <div className="ai-states">
          <span className="ai-badge">{toolLabel(saved.implementationStatus, language)}</span>
          <span className="ai-badge">{toolLabel(saved.lifecycle, language)}</span>
          <span className="ai-badge">
            {isInternalStudentTool(saved)
              ? c('إداري داخلي', 'Internal admin')
              : c('للطلاب', 'Students')}
          </span>
        </div>
        <EvidenceTime at={read.observedAt} />
      </WorkspacePanel>
      <nav className="certificate-subnav admin-section-navigation" aria-label={c('تفاصيل الأداة', 'Tool details')}>
        {TOOL_TABS.filter(([key]) => key !== 'executions' || can('view-executions')).map(
          ([key, ar, en]) => {
            const Icon = tabIcons[key];
            return (
              <Link
                key={key}
                to={`/student-tools/${encodeURIComponent(toolKey)}?tab=${key}`}
                aria-current={key === tab ? 'page' : undefined}
              >
                <Icon aria-hidden="true" />
                {c(ar, en)}
              </Link>
            );
          },
        )}
      </nav>
      <ReadState state={read} />
      {error && (
        <p role="alert" className="certificate-notice certificate-error">
          {error}
        </p>
      )}
      {message && (
        <p role="status" className="certificate-notice">
          {message}
        </p>
      )}
      {dirty && (
        <p className="certificate-notice">
          {c('تعديلات غير محفوظة', 'Unsaved changes')}
          <button disabled={busy} onClick={() => setDraft(structuredClone(saved))}>
            {c('تجاهل التعديلات', 'Discard edits')}
          </button>
        </p>
      )}
      {['content', 'access', 'release'].includes(tab) && (
        <label>
          {c('سبب التغيير أو قرار المراجعة', 'Change or review reason')}
          <textarea
            maxLength={2000}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            disabled={busy}
          />
        </label>
      )}
      {tab === 'overview' && (
        <WorkspacePanel title={c('ملخص الأداة والجاهزية', 'Tool overview and readiness')}>
          <p>{language === 'en' ? saved.descriptionEn : saved.descriptionAr}</p>
          <dl className="ai-definition">
            <div>
              <dt>{c('الفئة', 'Category')}</dt>
              <dd>{toolLabel(saved.category, language)}</dd>
            </div>
            <div>
              <dt>{c('طريقة التنفيذ', 'Execution type')}</dt>
              <dd>
                {saved.implementationStatus === 'PLANNED' && !isInternalStudentTool(saved)
                  ? c('تصميم لم يُعتمد بعد', 'Design not approved yet')
                  : toolLabel(saved.executionType, language)}
              </dd>
            </div>
            <div>
              <dt>{c('مالك الأداة', 'Tool owner')}</dt>
              <dd>{saved.owner}</dd>
            </div>
            <div>
              <dt>{c('فحص الإعدادات', 'Configuration checks')}</dt>
              <dd>
                {detail.readiness.ready
                  ? c('مستوفى — لا يثبت جودة النتائج', 'Passed — does not prove output quality')
                  : c('توجد عوائق', 'Blockers found')}
              </dd>
            </div>
          </dl>
          {detail.readiness.blockers.map((blocker) => (
            <p className="certificate-notice" key={blocker}>
              {toolLabel(blocker, language)}
            </p>
          ))}
          <div className="certificate-grid">
            {detail.dependencies?.map((dependency, index) => (
              <ToolDependency key={index} dependency={dependency} />
            ))}
          </div>
          {saved.aiCapabilityKey && canAI(hasPermission) && (
            <Link
              className="certificate-link"
              to={
                '/ai/capabilities-prompts?tab=capabilities&search=' +
                encodeURIComponent(saved.aiCapabilityKey)
              }
            >
              {c('إدارة قدرة AI المرتبطة', 'Manage linked AI capability')}
            </Link>
          )}
          <ToolEligibility toolKey={toolKey} />
        </WorkspacePanel>
      )}
      {tab === 'content' && (
        <>
          <WorkspacePanel title={c('المحتوى والظهور', 'Content and discovery')}>
            <form
              className="ai-form"
              onSubmit={(event) => {
                event.preventDefault();
                const {
                  nameAr,
                  nameEn,
                  descriptionAr,
                  descriptionEn,
                  category,
                  tags,
                  estimatedMinutes,
                  iconAssetId,
                  implementationPriority,
                  desiredLaunchVisibility,
                } = draft;
                void mutate('/metadata', 'PATCH', {
                  nameAr,
                  nameEn,
                  descriptionAr,
                  descriptionEn,
                  category,
                  tags,
                  estimatedMinutes,
                  iconAssetId: iconAssetId ?? null,
                  implementationPriority,
                  desiredLaunchVisibility,
                  reason,
                });
              }}
            >
              <fieldset disabled={busy || uncertain || !can('edit-metadata')}>
                {(['nameAr', 'nameEn', 'descriptionAr', 'descriptionEn'] as const).map(
                  (key, index) => (
                    <label key={key}>
                      {c(
                        [
                          'الاسم بالعربية',
                          'الاسم بالإنجليزية',
                          'الوصف بالعربية',
                          'الوصف بالإنجليزية',
                        ][index],
                        [
                          'Arabic name',
                          'English name',
                          'Arabic description',
                          'English description',
                        ][index],
                      )}
                      <textarea
                        required
                        value={draft[key]}
                        onChange={(event) => edit({ [key]: event.target.value })}
                      />
                    </label>
                  ),
                )}
                <label>
                  {c('الفئة', 'Category')}
                  <select
                    value={draft.category}
                    onChange={(event) => edit({ category: event.target.value })}
                  >
                    {Array.from(new Set([...TOOL_CATEGORIES, draft.category])).map((value) => (
                      <option key={value} value={value}>
                        {toolLabel(value, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {c('الوسوم — وسم في كل سطر', 'Tags — one per line')}
                  <textarea
                    value={draft.tags.join('\n')}
                    onChange={(event) =>
                      edit({ tags: event.target.value.split('\n').filter(Boolean) })
                    }
                  />
                </label>
                <label>
                  {c('الوقت المتوقع بالدقائق', 'Estimated minutes')}
                  <input
                    type="number"
                    min={0}
                    max={100000}
                    value={draft.estimatedMinutes}
                    onChange={(event) => edit({ estimatedMinutes: Number(event.target.value) })}
                  />
                </label>
                <label>
                  {c('مرجع ملف الأيقونة المعتمد', 'Approved icon asset reference')}
                  <input
                    value={draft.iconAssetId ?? ''}
                    onChange={(event) => edit({ iconAssetId: event.target.value || null })}
                  />
                </label>
                <label>
                  {c('أولوية التنفيذ', 'Implementation priority')}
                  <select
                    value={draft.implementationPriority}
                    onChange={(event) =>
                      edit({
                        implementationPriority: event.target
                          .value as Tool['implementationPriority'],
                      })
                    }
                  >
                    {['P1_CORE_LAUNCH', 'P2_EXPANSION', 'P3_LATER'].map((value, index) => (
                      <option key={value} value={value}>
                        {c(
                          ['الإطلاق الأساسي', 'التوسع', 'لاحقًا'][index],
                          ['Core launch', 'Expansion', 'Later'][index],
                        )}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  {c(
                    'الظهور المستهدف — لا يغيّر الإتاحة الفعلية',
                    'Desired visibility — does not change actual access',
                  )}
                  <select
                    value={draft.desiredLaunchVisibility}
                    onChange={(event) =>
                      edit({
                        desiredLaunchVisibility: event.target
                          .value as Tool['desiredLaunchVisibility'],
                      })
                    }
                  >
                    {[
                      'ACTIVE',
                      'COMING_SOON',
                      'UNDER_DEVELOPMENT',
                      'HIDDEN_ADMIN_ONLY',
                      'DISABLED',
                      'RETIRED',
                    ].map((value) => (
                      <option key={value} value={value}>
                        {toolLabel(value, language)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  className="certificate-primary"
                  disabled={!dirty || reason.trim().length < 3}
                >
                  {c('حفظ المحتوى', 'Save content')}
                </button>
              </fieldset>
            </form>
          </WorkspacePanel>
          <TestDiscoveryEditor ownerType="STUDENT_TOOLS" ownerKey={toolKey} />
        </>
      )}
      {tab === 'access' && (
        <WorkspacePanel title={c('الإتاحة والحدود', 'Access and limits')}>
          <form
            className="ai-form"
            onSubmit={(event) => {
              event.preventDefault();
              void mutate('/access-policy', 'PATCH', {
                availability: draft.availability,
                featureFlags: draft.featureFlags,
                rateLimitPolicy: draft.rateLimitPolicy,
                semanticVersion: version,
                changeNote: reason,
              });
            }}
          >
            <fieldset disabled={busy || uncertain || !can('manage-availability')}>
              <p className="certificate-notice">
                {c(
                  'الحفظ ينشئ إصدارًا جديدًا في حالة الاختبار ويخفيه حتى استيفاء المراجعة والتفعيل. الإتاحة والحدود تُحفظ معًا.',
                  'Saving creates a new testing version, hidden until review and activation. Access and limits are saved atomically.',
                )}
              </p>
              <label className="ai-check">
                <input
                  type="checkbox"
                  checked={draft.featureFlags.globallyEnabled}
                  onChange={(event) =>
                    edit({
                      featureFlags: {
                        ...draft.featureFlags,
                        globallyEnabled: event.target.checked,
                      },
                    })
                  }
                />
                {c('تمكين تشغيل الأداة', 'Enable tool execution')}
              </label>
              <label className="ai-check">
                <input
                  type="checkbox"
                  disabled={isInternalStudentTool(saved)}
                  checked={draft.availability.publicEnabled}
                  onChange={(event) =>
                    edit({
                      availability: {
                        ...draft.availability,
                        publicEnabled: event.target.checked,
                        ...(!event.target.checked ? { anonymousEnabled: false } : {}),
                      },
                      featureFlags: {
                        ...draft.featureFlags,
                        ...(!event.target.checked ? { anonymousEnabled: false } : {}),
                      },
                    })
                  }
                />
                {c('السماح بالظهور العام بعد التفعيل', 'Allow public discovery after activation')}
              </label>
              {(['anonymousEnabled', 'authenticatedEnabled'] as const).map((key, index) => (
                <label key={key} className="ai-check">
                  <input
                    type="checkbox"
                    disabled={
                      isInternalStudentTool(saved) ||
                      (key === 'anonymousEnabled' && !draft.availability.publicEnabled)
                    }
                    checked={draft.availability[key] && draft.featureFlags[key]}
                    onChange={(event) =>
                      edit({
                        availability: { ...draft.availability, [key]: event.target.checked },
                        featureFlags: { ...draft.featureFlags, [key]: event.target.checked },
                      })
                    }
                  />
                  {index ? c('الطلاب المسجلون', 'Signed-in students') : c('الزوار', 'Visitors')}
                </label>
              ))}
              <label className="ai-check">
                <input
                  type="checkbox"
                  checked={draft.availability.maintenanceMode || draft.featureFlags.maintenanceMode}
                  onChange={(event) =>
                    edit({
                      availability: {
                        ...draft.availability,
                        maintenanceMode: event.target.checked,
                      },
                      featureFlags: {
                        ...draft.featureFlags,
                        maintenanceMode: event.target.checked,
                      },
                    })
                  }
                />
                {c('وضع الصيانة', 'Maintenance mode')}
              </label>
              <label>
                {c('اللغات المسموحة — ar,en', 'Allowed locales — ar,en')}
                <input
                  value={draft.availability.allowedLocales.join(',')}
                  onChange={(event) =>
                    edit({
                      availability: {
                        ...draft.availability,
                        allowedLocales: event.target.value
                          .split(',')
                          .map((value) => value.trim())
                          .filter(Boolean),
                      },
                    })
                  }
                />
              </label>
              {(
                [
                  'anonymousRequestsPerMinute',
                  'authenticatedRequestsPerMinute',
                  'adminTestRequestsPerMinute',
                ] as const
              ).map((key, index) => (
                <label key={key}>
                  {c(
                    [
                      'طلبات الزائر في الدقيقة',
                      'طلبات الطالب في الدقيقة',
                      'طلبات الاختبار في الدقيقة',
                    ][index],
                    [
                      'Visitor requests per minute',
                      'Student requests per minute',
                      'Test requests per minute',
                    ][index],
                  )}
                  <input
                    type="number"
                    required
                    min={1}
                    max={index === 2 ? 1000 : 10000}
                    value={draft.rateLimitPolicy?.[key] ?? ''}
                    onChange={(event) =>
                      edit({
                        rateLimitPolicy: {
                          ...draft.rateLimitPolicy,
                          [key]: Number(event.target.value),
                        },
                      })
                    }
                  />
                </label>
              ))}
              <label>
                {c('رقم الإصدار الجديد', 'New semantic version')}
                <input
                  required
                  pattern="[0-9]+\.[0-9]+\.[0-9]+"
                  value={version}
                  onChange={(event) => setVersion(event.target.value)}
                />
              </label>
              <p>
                {c(
                  'قيود المناطق غير مدعومة حاليًا. لن تُحذف القيم الموجودة أو تتغير ضمنيًا.',
                  'Regional restrictions are unsupported. Existing values are preserved, never silently cleared.',
                )}
              </p>
              {draft.availability.allowedRegions.length > 0 && (
                <p role="alert">
                  {c(
                    'السجل يحتوي قيود مناطق؛ يلزم قرار متوافق قبل حفظ سياسة جديدة.',
                    'This record contains regional restrictions; a compatible policy decision is required before saving.',
                  )}
                </p>
              )}
              <button
                className="certificate-primary"
                disabled={
                  !dirty || reason.trim().length < 3 || draft.availability.allowedRegions.length > 0
                }
              >
                {c('حفظ سياسة بإصدار جديد', 'Save policy as new version')}
              </button>
            </fieldset>
          </form>
        </WorkspacePanel>
      )}
      {tab === 'release' && (
        <>
          <WorkspacePanel title={c('الجاهزية والإطلاق', 'Readiness and release')}>
            <strong>
              {saved.releaseApproval
                ? toolLabel(saved.releaseApproval.status, language)
                : c('لا يوجد اعتماد لهذا التعديل', 'No approval for this revision')}
            </strong>
            {saved.releaseApproval && (
              <small>
                {c('صلاحية المراجعة حتى', 'Review expires at')}:{' '}
                {new Date(saved.releaseApproval.expiresAt).toLocaleString(language)}
              </small>
            )}
            {detail.readiness.blockers.map((blocker) => (
              <p key={blocker}>{toolLabel(blocker, language)}</p>
            ))}
            <div className="certificate-actions">
              {(['PROPOSE', 'APPROVE', 'REJECT', 'ACTIVATE'] as const).map((action, index) => (
                <button
                  key={action}
                  disabled={
                    busy ||
                    uncertain ||
                    dirty ||
                    reason.trim().length < 3 ||
                    !can(action === 'PROPOSE' ? 'manage-availability' : 'approve-release') ||
                    (action !== 'PROPOSE' &&
                      (!saved.releaseApproval ||
                        Date.parse(saved.releaseApproval.expiresAt) <= Date.now())) ||
                    (action === 'PROPOSE' && !detail.readiness.ready) ||
                    (['APPROVE', 'REJECT'].includes(action) &&
                      saved.releaseApproval?.status !== 'PENDING') ||
                    (action === 'ACTIVATE' &&
                      (!detail.readiness.ready || saved.releaseApproval?.status !== 'APPROVED'))
                  }
                  onClick={() => void mutate('/release/' + action, 'POST', { reason })}
                >
                  {c(
                    ['طلب المراجعة', 'اعتماد', 'رفض', 'تفعيل الإصدار'][index],
                    ['Request review', 'Approve', 'Reject', 'Activate version'][index],
                  )}
                </button>
              ))}
            </div>
            <div className="certificate-actions">
              {(['testing', 'deprecate', 'retire'] as const).map((action, index) => (
                <button
                  key={action}
                  disabled={
                    busy ||
                    uncertain ||
                    dirty ||
                    reason.trim().length < 3 ||
                    !can('manage-availability')
                  }
                  onClick={() => void mutate('/lifecycle/' + action, 'POST', { reason })}
                >
                  {c(
                    ['إعادة للاختبار', 'إيقاف تدريجي', 'تقاعد'][index],
                    ['Return to testing', 'Deprecate', 'Retire'][index],
                  )}
                </button>
              ))}
            </div>
            <p>
              {c(
                'الاعتماد مرتبط بمراجعة وبصمة إصدار وتاريخ صلاحية. إعادة الفحص لا تشغّل نموذج AI مدفوعًا.',
                'Approval binds a revision, snapshot hash and expiry. Readiness checks do not run paid inference.',
              )}
            </p>
          </WorkspacePanel>
          <ToolVersions toolKey={toolKey} />
        </>
      )}
      {tab === 'quality' && (
        <>
          <ToolTestPanel
            key={saved.currentVersion.semanticVersion}
            tool={saved}
            onBusy={setTestBusy}
          />
          <WorkspacePanel title={c('عقود المدخلات والنتائج', 'Input and output contracts')}>
            <details>
              <summary>{c('عرض العقود التقنية', 'View technical contracts')}</summary>
              <pre className="ai-code" dir="ltr">
                {JSON.stringify({ input: saved.inputSchema, output: saved.outputSchema }, null, 2)}
              </pre>
            </details>
          </WorkspacePanel>
        </>
      )}
      {tab === 'executions' && <ToolExecutions toolKey={toolKey} />}
    </div>
  );
}
function canAI(hasPermission: (permission: string) => boolean) {
  return hasPermission('admin:ai:view');
}
function ToolVersions({ toolKey }: { toolKey: string }) {
  const { c } = useWorkspaceCopy();
  const [page, setPage] = useState(1);
  const read = useWorkspaceRead<
    Page<{
      semanticVersion: string;
      releaseDate: string;
      changeNote: string;
      snapshotHash?: string;
    }>
  >(`/admin/student-tools/${encodeURIComponent(toolKey)}/versions?page=${page}&pageSize=25`);
  return (
    <WorkspacePanel title={c('سجل الإصدارات', 'Version history')}>
      <ReadState state={read} />
      {read.data?.data.map((version) => (
        <div key={version.semanticVersion} className="ai-dependency">
          <strong>{version.semanticVersion}</strong>
          <span>{version.changeNote}</span>
          <small>{version.releaseDate}</small>
          <small dir="ltr">{version.snapshotHash}</small>
        </div>
      ))}
      <div className="certificate-actions">
        <button disabled={page <= 1} onClick={() => setPage(page - 1)}>
          {c('السابق', 'Previous')}
        </button>
        <span>
          {page} · {read.data?.total ?? '—'}
        </span>
        <button
          disabled={!read.data || page * 25 >= read.data.total}
          onClick={() => setPage(page + 1)}
        >
          {c('التالي', 'Next')}
        </button>
      </div>
    </WorkspacePanel>
  );
}
function ToolEligibility({ toolKey }: { toolKey: string }) {
  const { c, language } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const [consumer, setConsumer] = useState('ANONYMOUS'),
    [busy, setBusy] = useState(false),
    [result, setResult] = useState<{ status: string; reasons?: string[] } | null>(null),
    [error, setError] = useState(false);
  const generation = useRef(0),
    lock = useRef(false);
  useEffect(() => {
    ++generation.current;
    setResult(null);
    setError(false);
    return () => {
      ++generation.current;
    };
  }, [consumer, language]);
  const evaluate = async () => {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setResult(null);
    setError(false);
    const id = ++generation.current;
    try {
      const value = await adminApiClient.request<{ data: { status: string; reasons?: string[] } }>(
        `/admin/student-tools/${encodeURIComponent(toolKey)}/eligibility`,
        { method: 'POST', body: JSON.stringify({ consumerType: consumer, locale: language }) },
      );
      if (id === generation.current) setResult(value.data);
    } catch {
      if (id === generation.current) setError(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  };
  return (
    <section className="ai-form">
      <h3>{c('معاينة الإتاحة دون تنفيذ', 'Preview access without execution')}</h3>
      <label>
        {c('الجمهور', 'Audience')}
        <select value={consumer} onChange={(event) => setConsumer(event.target.value)}>
          <option value="ANONYMOUS">{c('زائر', 'Visitor')}</option>
          <option value="AUTHENTICATED_STUDENT">{c('طالب مسجل', 'Signed-in student')}</option>
        </select>
      </label>
      <button
        disabled={busy || !hasPermission('admin:student-tools:manage-availability')}
        onClick={() => void evaluate()}
      >
        {c('فحص الإتاحة', 'Check access')}
      </button>
      {error && <p role="alert">{c('تعذر فحص الإتاحة.', 'Access check failed.')}</p>}
      {result && (
        <div role="status">
          <strong>
            {result.status === 'WOULD_ALLOW'
              ? c('يسمح بحسب الفحص الحالي', 'Allowed by current checks')
              : c('غير متاح لهذا الجمهور', 'Unavailable for this audience')}
          </strong>
          {result.reasons?.map((reason) => (
            <p key={reason}>{toolLabel(reason, language)}</p>
          ))}
        </div>
      )}
      <small>
        {c(
          'لا ينتحل هذا الفحص حساب طالب، ولا ينفذ طلبًا أو يستهلك حصته.',
          'This check does not impersonate a student, execute a request or consume quota.',
        )}
      </small>
    </section>
  );
}
