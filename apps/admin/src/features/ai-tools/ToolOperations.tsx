import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import type { StudentToolTelemetry } from '@manaratak/domain';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import {
  EvidenceTime,
  ReadState,
  useWorkspaceCopy,
  useWorkspaceRead,
  WorkspaceEmpty,
  WorkspaceMetric,
  WorkspacePager,
  WorkspacePanel,
} from './Workspace';
import { toolLabel, type Page } from './studentToolModel';

type ReviewRow = {
  toolKey: string;
  nameAr: string;
  nameEn: string;
  implementationStatus: string;
  version: string;
  revision: number;
  audience: string;
  health?: string;
  readiness?: { ready: boolean; blockers: string[] };
  dependencies?: Array<{
    phase: string;
    required: boolean;
    status: string;
    capabilityKey?: string;
  }>;
  releaseApproval?: { status: string; author: string; reviewer?: string; expiresAt: string };
};
const owners: Record<string, { url: string; permission: string; ar: string; en: string }> = {
  PHASE_17: { url: '/ai/overview', permission: 'admin:ai:view', ar: 'الذكاء الاصطناعي', en: 'AI' },
  PHASE_11: {
    url: '/universities',
    permission: 'admin:universities:manage',
    ar: 'الجامعات',
    en: 'Universities',
  },
  PHASE_12: {
    url: '/scholarships',
    permission: 'admin:scholarships:manage',
    ar: 'المنح',
    en: 'Scholarships',
  },
  PHASE_07: { url: '/assets', permission: 'admin:assets:manage', ar: 'الملفات', en: 'Assets' },
};
export function ToolDependency({
  dependency,
}: {
  dependency: { phase: string; required: boolean; status: string; capabilityKey?: string | null };
}) {
  const { c, language } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const owner = owners[dependency.phase];
  return (
    <div className="ai-dependency">
      <strong>
        {owner ? c(owner.ar, owner.en) : dependency.phase} ·{' '}
        {dependency.required ? c('أساسي', 'Required') : c('اختياري', 'Optional')}
      </strong>
      <span>{toolLabel(dependency.status, language)}</span>
      {owner && hasPermission(owner.permission) && (
        <Link
          className="certificate-link"
          to={
            dependency.capabilityKey
              ? '/ai/capabilities-prompts?tab=capabilities&search=' +
                encodeURIComponent(dependency.capabilityKey)
              : owner.url
          }
        >
          {c('فتح القسم المسؤول', 'Open owner workspace')}
        </Link>
      )}
    </div>
  );
}
export function ToolReviewWorkspace({ kind }: { kind: 'releases' | 'quality' }) {
  const { c, language } = useWorkspaceCopy();
  const [params, setParams] = useSearchParams();
  const page = Number(params.get('page')) || 1;
  const query = new URLSearchParams({ page: String(page), pageSize: '25' });
  if (params.get('search')) query.set('search', params.get('search')!);
  if (kind === 'releases' && params.get('status')) query.set('status', params.get('status')!);
  const read = useWorkspaceRead<Page<ReviewRow> & { observedAt: string }>(
    `/admin/student-tools/workspace/${kind}?${query}`,
  );
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.delete('page');
    setParams(next);
  };
  return (
    <WorkspacePanel
      title={
        kind === 'releases'
          ? c('الإطلاق والمراجعات', 'Releases and reviews')
          : c('الجودة والاعتماديات', 'Quality and dependencies')
      }
      actions={
        <button disabled={read.loading} onClick={() => void read.load()}>
          {c('تحديث', 'Refresh')}
        </button>
      }
    >
      <div className="certificate-filters">
        <label>
          {c('البحث', 'Search')}
          <input
            type="search"
            maxLength={200}
            value={params.get('search') ?? ''}
            onChange={(event) => filter('search', event.target.value)}
          />
        </label>
        {kind === 'releases' && (
          <label>
            {c('حالة المراجعة', 'Review status')}
            <select
              value={params.get('status') ?? ''}
              onChange={(event) => filter('status', event.target.value)}
            >
              <option value="">{c('الكل', 'All')}</option>
              {['PENDING', 'APPROVED', 'REJECTED', 'CONSUMED'].map((value) => (
                <option key={value} value={value}>
                  {toolLabel(value, language)}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>
      <p className="certificate-notice">
        {kind === 'quality'
          ? c(
              'فحوص الإعدادات والاعتماديات لا تثبت جودة المخرجات أو جاهزية الإنتاج. الأدوات المخططة تبقى ضمن خارطة التطوير.',
              'Configuration and dependency checks do not prove output quality or production readiness. Planned tools remain roadmap items.',
            )
          : c(
              'القرار مرتبط بإصدار ومراجعة محددين. افتح الأداة لقراءة التفاصيل قبل الاعتماد؛ يمنع الخادم الموافقة الذاتية.',
              'Decisions are bound to a specific version and revision. Review tool details first; the server prevents self-approval.',
            )}
      </p>
      <ReadState state={read} />
      {read.data && (
        <>
          {!read.data.data.length && <WorkspaceEmpty />}
          <div className="certificate-grid">
            {read.data.data.map((row) => (
              <article className="certificate-card" key={row.toolKey}>
                <h3>{language === 'en' ? row.nameEn : row.nameAr}</h3>
                <small dir="ltr">
                  {row.toolKey} · {row.version}
                </small>
                <div className="ai-states">
                  <span className="ai-badge">{toolLabel(row.implementationStatus, language)}</span>
                  <span className="ai-badge">{toolLabel(row.audience, language)}</span>
                </div>
                {kind === 'releases' ? (
                  <>
                    <strong>{toolLabel(row.releaseApproval?.status ?? '', language)}</strong>
                    <small>
                      {c('انتهاء صلاحية الاعتماد', 'Approval expires')}:{' '}
                      {row.releaseApproval?.expiresAt
                        ? new Date(row.releaseApproval.expiresAt).toLocaleString(language)
                        : c('غير متاح', 'N/A')}
                    </small>
                  </>
                ) : (
                  <>
                    <strong>
                      {row.readiness?.ready
                        ? c('فحوص الإعدادات مستوفاة', 'Configuration checks passed')
                        : c('توجد عوائق', 'Blocked by checks')}
                    </strong>
                    {row.readiness?.blockers.map((reason) => (
                      <p key={reason}>{toolLabel(reason, language)}</p>
                    ))}
                    {row.dependencies?.map((dependency, index) => (
                      <ToolDependency key={index} dependency={dependency} />
                    ))}
                  </>
                )}
                <Link
                  className="certificate-link"
                  to={`/student-tools/${encodeURIComponent(row.toolKey)}?tab=${kind === 'releases' ? 'release' : 'overview'}`}
                >
                  {c('فتح التفاصيل', 'Open details')}
                </Link>
              </article>
            ))}
          </div>
          <EvidenceTime at={read.data.observedAt} />
        </>
      )}
      <WorkspacePager
        page={page}
        total={read.data?.total ?? 0}
        disabled={read.loading || read.error}
        onPage={(value) => {
          const next = new URLSearchParams(params);
          next.set('page', String(value));
          setParams(next);
        }}
      />
    </WorkspacePanel>
  );
}
export function ToolUsage() {
  const { c } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const allowed = hasPermission('admin:student-tools:view-executions');
  const read = useWorkspaceRead<{ data: StudentToolTelemetry; observedAt: string }>(
    allowed ? '/admin/student-tools/workspace/usage' : null,
  );
  const [window, setWindow] = useState<'24h' | '7d' | '30d'>('24h');
  const [traffic, setTraffic] = useState<'student' | 'test'>('student');
  const values = read.data?.data.windows?.[window]?.[traffic];
  if (!allowed)
    return (
      <p className="certificate-notice">
        {c(
          'تحتاج صلاحية عرض التنفيذ للوصول إلى تقارير الاستخدام.',
          'Execution-view permission is required for usage reports.',
        )}
      </p>
    );
  return (
    <>
      <WorkspacePanel
        title={c('الاستخدام والأداء', 'Usage and performance')}
        actions={
          <button disabled={read.loading} onClick={() => void read.load()}>
            {c('تحديث', 'Refresh')}
          </button>
        }
      >
        <div className="certificate-filters">
          <label>
            {c('الفترة', 'Window')}
            <select
              value={window}
              onChange={(event) => setWindow(event.target.value as typeof window)}
            >
              <option value="24h">{c('24 ساعة', '24 hours')}</option>
              <option value="7d">{c('7 أيام', '7 days')}</option>
              <option value="30d">{c('30 يومًا', '30 days')}</option>
            </select>
          </label>
          <label>
            {c('نوع الاستخدام', 'Traffic')}
            <select
              value={traffic}
              onChange={(event) => setTraffic(event.target.value as typeof traffic)}
            >
              <option value="student">{c('استخدام الطلاب', 'Student traffic')}</option>
              <option value="test">{c('الاختبارات الإدارية', 'Admin tests')}</option>
            </select>
          </label>
        </div>
        <ReadState state={read} />
        <div className="certificate-metrics">
          {[
            ['total', 'الطلبات المسجلة', 'Recorded requests'],
            ['completed', 'المكتمل', 'Completed'],
            ['failed', 'الفشل', 'Failed'],
            ['blocked', 'المحجوب', 'Blocked'],
            ['unknownOutcome', 'نتيجة غير مؤكدة', 'Unknown outcome'],
            ['p95LatencyMs', 'زمن P95 بالمللي ثانية', 'P95 latency in milliseconds'],
          ].map(([key, ar, en]) => (
            <WorkspaceMetric key={key} label={c(ar, en)} value={values?.[key]} />
          ))}
        </div>
        <p>
          {c(
            'نسبة النجاح التقني = المكتمل ÷ (المكتمل + الفاشل). المحجوب والجاري والنتائج غير المؤكدة خارج المقام؛ لا تقيس هذه النسبة جودة الإجابة.',
            'Technical success = completed / (completed + failed). Blocked, running and unknown outcomes are excluded; this does not measure answer quality.',
          )}{' '}
          {values?.successRate == null
            ? c('لا توجد عينة مكتملة للحساب.', 'No terminal sample available.')
            : `${(values.successRate * 100).toFixed(1)}% · n=${values.terminalDenominator}`}
        </p>
        <EvidenceTime at={read.data?.observedAt ?? null} />
      </WorkspacePanel>
      <ToolExecutions />
    </>
  );
}
type Execution = Record<string, string | number | boolean | null> & {
  executionId: string;
  toolKey: string;
  status: string;
};
export function ToolExecutions({ toolKey }: { toolKey?: string }) {
  const { c, language } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const allowed = hasPermission('admin:student-tools:view-executions');
  const [page, setPage] = useState(1),
    [trace, setTrace] = useState(''),
    [status, setStatus] = useState(''),
    [isTest, setIsTest] = useState(''),
    [selected, setSelected] = useState<Execution | null>(null);
  const [auditPage, setAuditPage] = useState(1);
  const query = new URLSearchParams({
    page: String(page),
    pageSize: '25',
    ...(trace ? { correlationId: trace } : {}),
    ...(status ? { status } : {}),
    ...(isTest ? { isTest } : {}),
  });
  const read = useWorkspaceRead<Page<Execution>>(
    allowed
      ? `/admin/student-tools/${toolKey ? encodeURIComponent(toolKey) : 'workspace'}/executions?${query}`
      : null,
  );
  const audit = useWorkspaceRead<Page<Record<string, string>>>(
    allowed && toolKey
      ? `/admin/student-tools/${encodeURIComponent(toolKey)}/audit?page=${auditPage}&pageSize=25${trace ? '&correlationId=' + encodeURIComponent(trace) : ''}`
      : null,
  );
  const detail = useWorkspaceRead<{ data: Execution }>(
    allowed && selected
      ? `/admin/student-tools/${encodeURIComponent(selected.toolKey)}/executions/${encodeURIComponent(selected.executionId)}`
      : null,
  );
  if (!allowed)
    return (
      <p className="certificate-notice">
        {c('تحتاج صلاحية عرض التنفيذ.', 'Execution-view permission is required.')}
      </p>
    );
  return (
    <>
      <WorkspacePanel
        title={c('سجل التنفيذ', 'Execution log')}
        actions={
          <button
            disabled={read.loading}
            onClick={() => {
              setSelected(null);
              void read.load();
              void audit.load();
            }}
          >
            {c('تحديث الحالة', 'Refresh status')}
          </button>
        }
      >
        <div className="certificate-filters">
          <label>
            {c('مرجع الارتباط', 'Correlation reference')}
            <input
              maxLength={200}
              value={trace}
              onChange={(event) => {
                setTrace(event.target.value);
                setPage(1);
                setAuditPage(1);
                setSelected(null);
              }}
            />
          </label>
          <label>
            {c('الحالة', 'Status')}
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
                setSelected(null);
              }}
            >
              <option value="">{c('الكل', 'All')}</option>
              {['RUNNING', 'COMPLETED', 'FAILED', 'BLOCKED', 'UNKNOWN_OUTCOME'].map((value) => (
                <option key={value} value={value}>
                  {toolLabel(value, language)}
                </option>
              ))}
            </select>
          </label>
          <label>
            {c('نوع الاستخدام', 'Traffic')}
            <select
              value={isTest}
              onChange={(event) => {
                setIsTest(event.target.value);
                setPage(1);
                setSelected(null);
              }}
            >
              <option value="">{c('الكل', 'All')}</option>
              <option value="false">{c('الطلاب', 'Students')}</option>
              <option value="true">{c('الاختبارات', 'Tests')}</option>
            </select>
          </label>
        </div>
        <ReadState state={read} />
        {read.data && (
          <>
            <div className="certificate-table-scroll">
              <table className="certificate-table">
                <thead>
                  <tr>
                    {[
                      c('العملية والأداة', 'Execution and tool'),
                      c('الحالة', 'Status'),
                      c('الجمهور', 'Audience'),
                      c('المدة', 'Duration'),
                      c('الارتباط', 'Correlation'),
                      c('التاريخ', 'Date'),
                      c('التفاصيل', 'Details'),
                    ].map((title) => (
                      <th key={title}>{title}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {read.data.data.map((row) => (
                    <tr key={row.executionId}>
                      <td>
                        {row.executionId}
                        <small>
                          {row.toolKey} · {row.toolVersion}
                        </small>
                      </td>
                      <td>{toolLabel(row.status, language)}</td>
                      <td>{toolLabel(String(row.consumerType ?? ''), language)}</td>
                      <td>{row.durationMs == null ? '—' : `${row.durationMs} ms`}</td>
                      <td>{row.correlationId}</td>
                      <td>{String(row.startedAt ?? '')}</td>
                      <td>
                        <button onClick={() => setSelected(row)}>{c('عرض', 'View')}</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!read.data.data.length && <WorkspaceEmpty />}
          </>
        )}
        <WorkspacePager
          page={page}
          total={read.data?.total ?? 0}
          disabled={read.loading || read.error}
          onPage={(value) => {
            setPage(value);
            setSelected(null);
          }}
        />
      </WorkspacePanel>
      {selected && (
        <WorkspacePanel
          title={c('تفاصيل آمنة للعملية', 'Sanitized execution details')}
          actions={<button onClick={() => setSelected(null)}>{c('إغلاق', 'Close')}</button>}
        >
          <ReadState state={detail} />
          {detail.data && (
            <dl className="ai-definition">
              {Object.entries(detail.data.data)
                .filter(([, value]) => value != null)
                .map(([key, value]) => (
                  <div key={key}>
                    <dt>{key}</dt>
                    <dd>{String(value)}</dd>
                  </div>
                ))}
            </dl>
          )}
          <p>
            {c(
              'لا تُعرض مدخلات الطالب أو نتائجه الخاصة. عند غموض النتيجة تحقق من الحالة قبل إعادة التنفيذ.',
              'Student inputs and private results are not displayed. Check unknown outcomes before retrying.',
            )}
          </p>
        </WorkspacePanel>
      )}
      {toolKey && (
        <WorkspacePanel title={c('سجل التدقيق', 'Audit log')}>
          <ReadState state={audit} />
          {audit.data && (
            <>
              {!audit.data.data.length && <WorkspaceEmpty />}
              {audit.data.data.map((row, index) => (
                <div key={index} className="ai-dependency">
                  <strong>{row.action}</strong>
                  <span>{row.timestamp}</span>
                  <small>{row.correlationId}</small>
                </div>
              ))}
            </>
          )}
          <WorkspacePager
            page={auditPage}
            total={audit.data?.total ?? 0}
            disabled={audit.loading || audit.error}
            onPage={(value) => setAuditPage(value)}
          />
        </WorkspacePanel>
      )}
    </>
  );
}
