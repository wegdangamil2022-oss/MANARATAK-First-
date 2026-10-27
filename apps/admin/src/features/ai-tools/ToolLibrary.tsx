import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import { isInternalStudentTool } from '@manaratak/domain';
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
import { TOOL_CATEGORIES, toolLabel, type Page, type Tool } from './studentToolModel';

export function ToolLibrary() {
  const { c, language } = useWorkspaceCopy();
  const [params, setParams] = useSearchParams();
  const filters = new URLSearchParams();
  for (const key of [
    'page',
    'search',
    'category',
    'audience',
    'implementationStatus',
    'executionType',
    'lifecycle',
    'sort',
  ])
    if (params.get(key)) filters.set(key, params.get(key)!);
  const list = useWorkspaceRead<Page<Tool>>('/admin/student-tools?' + filters);
  const summary = useWorkspaceRead<{ data: Record<string, number> }>(
    '/admin/student-tools/overview',
  );
  const filter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    value ? next.set(key, value) : next.delete(key);
    next.set('page', '1');
    setParams(next);
  };
  return (
    <>
      <div className="certificate-metrics">
        {[
          ['total', 'أدوات السجل', 'Registry tools'],
          ['implemented', 'منفذ في المصدر', 'Source implemented'],
          ['planned', 'ضمن خطة التطوير', 'Planned'],
        ].map(([key, ar, en]) => (
          <WorkspaceMetric
            key={key}
            label={c(ar, en)}
            value={summary.error ? null : summary.data?.data[key]}
          />
        ))}
      </div>
      {summary.error && <ReadState state={summary} />}
      <WorkspacePanel
        title={c('مكتبة الأدوات', 'Tool library')}
        actions={
          <button
            disabled={list.loading}
            onClick={() => {
              void list.load();
              void summary.load();
            }}
          >
            <RefreshCw />
            {c('تحديث', 'Refresh')}
          </button>
        }
      >
        <div className="certificate-filters">
          <label>
            {c('بحث بالاسم أو المفتاح', 'Search name or key')}
            <input
              type="search"
              value={params.get('search') ?? ''}
              maxLength={240}
              onChange={(event) => filter('search', event.target.value)}
            />
          </label>
          {(
            [
              ['category', c('الفئة', 'Category'), TOOL_CATEGORIES],
              ['audience', c('الجمهور', 'Audience'), ['STUDENT', 'ADMIN_INTERNAL']],
              [
                'implementationStatus',
                c('حالة التنفيذ', 'Implementation'),
                ['IMPLEMENTED', 'IN_DEVELOPMENT', 'PLANNED', 'RUNTIME_BLOCKED'],
              ],
              [
                'lifecycle',
                c('دورة الحياة', 'Lifecycle'),
                ['DRAFT', 'TESTING', 'ACTIVE', 'DEPRECATED', 'RETIRED'],
              ],
              [
                'executionType',
                c('طريقة التنفيذ المسجلة', 'Registered execution type'),
                ['DETERMINISTIC', 'AI_DELEGATED', 'HYBRID', 'ADMIN_INTERNAL'],
              ],
            ] as const
          ).map(([key, title, options]) => (
            <label key={key}>
              {title}
              <select
                value={params.get(key) ?? ''}
                onChange={(event) => filter(key, event.target.value)}
              >
                <option value="">{c('الكل', 'All')}</option>
                {options.map((value) => (
                  <option key={value} value={value}>
                    {toolLabel(value, language)}
                  </option>
                ))}
              </select>
            </label>
          ))}
          <label>
            {c('الترتيب', 'Sort')}
            <select
              value={params.get('sort') ?? 'LAUNCH_ORDER'}
              onChange={(event) => filter('sort', event.target.value)}
            >
              <option value="LAUNCH_ORDER">{c('ترتيب الإطلاق', 'Launch order')}</option>
              <option value="UPDATED_DESC">{c('الأحدث تعديلًا', 'Recently updated')}</option>
            </select>
          </label>
        </div>
        <div className="certificate-actions">
          <button onClick={() => setParams({})}>{c('مسح المرشحات', 'Clear filters')}</button>
          <EvidenceTime at={list.observedAt} />
        </div>
        <ReadState state={list} />
        {list.data && (
          <>
            <div className="certificate-table-scroll">
              <table className="certificate-table">
                <thead>
                  <tr>
                    {[
                      c('الأداة', 'Tool'),
                      c('الفئة والجمهور', 'Category and audience'),
                      c('التنفيذ', 'Implementation'),
                      c('طريقة التشغيل', 'Execution type'),
                      c('الإصدار', 'Version'),
                      c('دورة الحياة', 'Lifecycle'),
                      c('الإجراء', 'Action'),
                    ].map((label) => (
                      <th key={label}>{label}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {list.data.data.map((tool) => (
                    <tr key={tool.toolKey}>
                      <td>
                        <strong>{language === 'en' ? tool.nameEn : tool.nameAr}</strong>
                        <small dir="ltr">{tool.toolKey}</small>
                      </td>
                      <td>
                        {toolLabel(tool.category, language)}
                        <small>
                          {isInternalStudentTool(tool)
                            ? c('إداري داخلي', 'Internal admin')
                            : c('للطلاب', 'Students')}
                        </small>
                      </td>
                      <td>
                        <span className="ai-badge">
                          {toolLabel(tool.implementationStatus, language)}
                        </span>
                      </td>
                      <td>
                        {tool.implementationStatus === 'PLANNED' && !isInternalStudentTool(tool)
                          ? c('لم يُعتمد التصميم بعد', 'Design not approved yet')
                          : toolLabel(tool.executionType, language)}
                      </td>
                      <td>{tool.currentVersion.semanticVersion}</td>
                      <td>{toolLabel(tool.lifecycle, language)}</td>
                      <td>
                        <Link
                          className="certificate-link"
                          to={'/student-tools/' + encodeURIComponent(tool.toolKey)}
                        >
                          {c('إدارة الأداة', 'Manage tool')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!list.data.data.length && <WorkspaceEmpty />}
          </>
        )}
        <WorkspacePager
          page={list.data?.page ?? Number(params.get('page') || 1)}
          total={list.data?.total ?? 0}
          disabled={list.loading || list.error}
          onPage={(page) => {
            const next = new URLSearchParams(params);
            next.set('page', String(page));
            setParams(next);
          }}
        />
      </WorkspacePanel>
    </>
  );
}
