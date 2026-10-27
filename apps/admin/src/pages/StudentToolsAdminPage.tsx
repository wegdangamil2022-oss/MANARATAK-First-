import { Link, useParams, useSearchParams } from 'react-router-dom';
import { Library, ClipboardCheck, ChartNoAxesCombined, ShieldCheck, Wrench } from 'lucide-react';
import { useAdminAuthorization } from '../security/AdminAuthorizationContext';
import { useWorkspaceCopy } from '../features/ai-tools/Workspace';
import { TOOL_WORKSPACES } from '../features/ai-tools/studentToolModel';
import { ToolLibrary } from '../features/ai-tools/ToolLibrary';
import { ToolReviewWorkspace, ToolUsage } from '../features/ai-tools/ToolOperations';
import { StudentToolDetails } from '../features/ai-tools/StudentToolDetails';
import { useCallback, useEffect, useRef } from 'react';

export function StudentToolsAdminPage() {
  const { toolKey } = useParams();
  const [query] = useSearchParams();
  const { c, dir } = useWorkspaceCopy();
  const { hasPermission } = useAdminAuthorization();
  const guard = useRef({ dirty: false, busy: false, discard: () => {} });
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const protect = (event: MouseEvent) => {
      const target = event.target;
      if (
        !(target instanceof Element) ||
        root.current?.contains(target) ||
        !target.closest('a[href]')
      )
        return;
      if (!guard.current.dirty && !guard.current.busy) return;
      if (
        guard.current.busy ||
        !window.confirm(
          c('تجاهل التعديلات غير المحفوظة ومغادرة الصفحة؟', 'Discard unsaved edits and leave?'),
        )
      ) {
        event.preventDefault();
        event.stopImmediatePropagation();
      } else guard.current.discard();
    };
    if (typeof document === 'undefined') return;
    document.addEventListener('click', protect, true);
    return () => document.removeEventListener('click', protect, true);
  }, [c]);
  const onState = useCallback((value: typeof guard.current) => {
    guard.current = value;
  }, []);
  const workspace =
    TOOL_WORKSPACES.find(([key]) => key === toolKey || key === query.get('view'))?.[0] ?? 'library';
  const detailKey = toolKey && !TOOL_WORKSPACES.some(([key]) => key === toolKey) ? toolKey : null;
  const icons = [Library, ClipboardCheck, ChartNoAxesCombined, ShieldCheck];
  return (
    <div
      ref={root}
      className="reference-workspace certificate-workspace ai-tools-workspace"
      dir={dir}
      onClickCapture={(event) => {
        if (
          !(event.target as HTMLElement).closest('a[href]') ||
          (!guard.current.dirty && !guard.current.busy)
        )
          return;
        if (
          guard.current.busy ||
          !window.confirm(
            c('تجاهل التعديلات غير المحفوظة ومغادرة الصفحة؟', 'Discard unsaved edits and leave?'),
          )
        ) {
          event.preventDefault();
          event.stopPropagation();
        } else guard.current.discard();
      }}
    >
      <header className="reference-hero">
        <div>
          <span>
            <Wrench />
            {c('مركز أدوات منارتك', 'MANARATAK tools center')}
          </span>
          <h1>{c('أدوات الطلاب', 'Student tools')}</h1>
          <p>
            {c(
              'إدارة المكتبة والإتاحة والإصدارات والجودة والاستخدام.',
              'Manage the library, access, releases, quality and usage.',
            )}
          </p>
        </div>
      </header>
      <nav
        className="certificate-main-nav"
        aria-label={c('مساحات أدوات الطلاب', 'Student tool workspaces')}
      >
        {TOOL_WORKSPACES.filter(
          ([key]) => key !== 'usage' || hasPermission('admin:student-tools:view-executions'),
        ).map(([key, ar, en]) => {
          const Icon = icons[TOOL_WORKSPACES.findIndex(([value]) => value === key)];
          return (
            <Link
              key={key}
              to={key === 'library' ? '/student-tools' : '/student-tools/' + key}
              aria-current={(detailKey ? 'library' : workspace) === key ? 'page' : undefined}
            >
              <Icon />
              {c(ar, en)}
            </Link>
          );
        })}
      </nav>
      <main className="ai-content">
        {detailKey ? (
          <StudentToolDetails key={detailKey} toolKey={detailKey} onState={onState} />
        ) : workspace === 'library' ? (
          <ToolLibrary />
        ) : workspace === 'usage' ? (
          <ToolUsage />
        ) : (
          <ToolReviewWorkspace key={workspace} kind={workspace} />
        )}
      </main>
    </div>
  );
}
