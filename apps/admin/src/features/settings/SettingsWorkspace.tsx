import { useEffect, useRef, type ReactNode } from 'react';
import {
  BookOpen,
  Flag,
  GitPullRequest,
  LayoutDashboard,
  SearchCheck,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import { OwnerNavigation } from '../services-finance/WorkspaceUI';
import type { SettingsView } from './settingsModel';
import './settings.css';

export function SettingsNavigation({
  view,
  ar,
  disabled,
  onChange,
}: {
  view: SettingsView;
  ar: boolean;
  disabled: boolean;
  onChange: (view: SettingsView) => void;
}) {
  return (
    <OwnerNavigation
      active={view}
      disabled={disabled}
      label={ar ? 'أقسام الإعدادات' : 'Settings workspaces'}
      onChange={(id) => onChange(id as SettingsView)}
      items={[
        {
          id: 'overview',
          label: ar ? 'نظرة عامة' : 'Overview',
          description: ar ? 'نقطة البداية والارتباطات' : 'Start here and connected sections',
          icon: LayoutDashboard,
        },
        {
          id: 'catalog',
          label: ar ? 'دليل الإعدادات' : 'Setting catalog',
          description: ar ? 'التعريفات والقيود' : 'Definitions and constraints',
          icon: BookOpen,
        },
        {
          id: 'assignments',
          label: ar ? 'القيم والنطاقات' : 'Values and scopes',
          description: ar ? 'التعيينات وسجل النسخ' : 'Assignments and version history',
          icon: SlidersHorizontal,
        },
        {
          id: 'flags',
          label: ar ? 'مفاتيح الميزات' : 'Feature flags',
          description: ar ? 'قيم التفعيل حسب النطاق' : 'Scoped activation values',
          icon: Flag,
        },
        {
          id: 'governance',
          label: ar ? 'التغييرات والاعتمادات' : 'Changes and approvals',
          description: ar
            ? 'المعاينة والموافقة وقواعد الاعتماد'
            : 'Preview, approval and dependencies',
          icon: GitPullRequest,
        },
        {
          id: 'resolution',
          label: ar ? 'فحص القيمة الفعالة' : 'Effective value',
          description: ar ? 'مصدر القيمة وسلسلة الوراثة' : 'Value source and inheritance',
          icon: SearchCheck,
        },
      ]}
    />
  );
}

export function SettingsDialog({
  title,
  children,
  onClose,
  busy = false,
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  busy?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  const latest = useRef({ onClose, busy });
  latest.current = { onClose, busy };
  useEffect(() => {
    const previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    panel.current?.focus();
    const key = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        if (!latest.current.busy) latest.current.onClose();
      }
      if (event.key !== 'Tab') return;
      const nodes = Array.from(
        panel.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),a[href],[tabindex="0"]',
        ) ?? [],
      );
      if (!nodes.length) {
        event.preventDefault();
        panel.current?.focus();
        return;
      }
      const first = nodes[0],
        last = nodes.at(-1);
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        last?.focus();
      } else if (
        !event.shiftKey &&
        (document.activeElement === last || document.activeElement === panel.current)
      ) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', key, true);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener('keydown', key, true);
      previous?.focus();
    };
  }, []);
  return (
    <div
      className="settings-dialog-backdrop"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="settings-dialog"
      >
        <header>
          <h2>{title}</h2>
          <button type="button" onClick={onClose} disabled={busy} aria-label={title + ' · ×'}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export function SettingsOverview({
  ar,
  onChange,
  children,
}: {
  ar: boolean;
  onChange: (view: SettingsView) => void;
  children: ReactNode;
}) {
  return (
    <section className="settings-overview">
      <div className="settings-panel">
        <h2>{ar ? 'إدارة واضحة للتغيير' : 'A clear change workflow'}</h2>
        <ol className="settings-steps">
          <li>
            <strong>{ar ? 'عرّف الإعداد' : 'Define'}</strong>
            <span>
              {ar
                ? 'حدّد النوع والقيمة الافتراضية والقيود والمجال المستهلك.'
                : 'Choose its type, default, constraints and consumer domain.'}
            </span>
          </li>
          <li>
            <strong>{ar ? 'راجع النطاق' : 'Check scope'}</strong>
            <span>
              {ar
                ? 'اختر قيمة عامة أو لمجال أو لهوية من الدليل.'
                : 'Choose global, domain or directory identity values.'}
            </span>
          </li>
          <li>
            <strong>{ar ? 'عاين واعتمد' : 'Preview and approve'}</strong>
            <span>
              {ar
                ? 'استخدم مجموعة تغيير للتعديلات المترابطة والموافقة المستقلة.'
                : 'Use a change set for related values and independent approval.'}
            </span>
          </li>
          <li>
            <strong>{ar ? 'تحقق واستعد' : 'Inspect and restore'}</strong>
            <span>
              {ar
                ? 'افحص مصدر القيمة، واستعد نسخة قديمة دون محو التاريخ.'
                : 'Inspect the source and restore a version without erasing history.'}
            </span>
          </li>
        </ol>
        <div className="settings-actions">
          <button type="button" className="settings-primary" onClick={() => onChange('catalog')}>
            {ar ? 'فتح دليل الإعدادات' : 'Open setting catalog'}
          </button>
          <button type="button" onClick={() => onChange('governance')}>
            {ar ? 'معاينة مجموعة تغيير' : 'Preview a change set'}
          </button>
        </div>
      </div>
      <div className="settings-panel">
        <h2>{ar ? 'الأقسام المرتبطة' : 'Connected sections'}</h2>
        <div className="settings-owner-links">{children}</div>
        <p>
          {ar
            ? 'مفاتيح الاتصال وكلمات المرور لا تُعرض هنا. تعريف متطلب سر لا يعني أن مزوّده جاهز.'
            : 'Connection credentials are not displayed here. Secret requirement metadata does not confirm provider readiness.'}
        </p>
      </div>
    </section>
  );
}
