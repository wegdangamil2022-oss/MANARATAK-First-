import {
  BookOpen,
  GitBranch,
  GraduationCap,
  Upload,
  ShieldCheck,
  RefreshCw,
  Link2,
  Tags,
  Activity,
  Info,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useEffect, useRef, type ReactNode } from 'react';
import '../../features/reference-data/reference-data.css';
import './academic-taxonomy.css';

export function TaxonomyDialogFrame({
  children,
  title,
  busy,
  close,
  isAr,
}: {
  children: ReactNode;
  title: string;
  busy: boolean;
  close: () => void;
  isAr: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const current = useRef({ busy, close });
  current.current = { busy, close };
  useEffect(() => {
    if (typeof document === 'undefined') return;
    const previous = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    ref.current?.focus();
    const keydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !current.current.busy) {
        event.preventDefault();
        current.current.close();
      }
      if (event.key !== 'Tab') return;
      const nodes = ref.current?.querySelectorAll<HTMLElement>(
        'button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[tabindex="0"]',
      );
      if (!nodes?.length) {
        event.preventDefault();
        return;
      }
      const first = nodes[0],
        last = nodes[nodes.length - 1];
      if (
        event.shiftKey &&
        (document.activeElement === first || document.activeElement === ref.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', keydown);
    return () => {
      document.removeEventListener('keydown', keydown);
      document.body.style.overflow = overflow;
      previous?.focus();
    };
  }, []);
  return (
    <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-busy={busy}
        aria-label={title}
        tabIndex={-1}
        dir={isAr ? 'rtl' : 'ltr'}
        className="taxonomy-dialog"
      >
        {children}
      </div>
    </div>
  );
}

const icons: Record<string, LucideIcon> = {
  taxonomy: BookOpen,
  degrees: GraduationCap,
  governance: GitBranch,
  imports: Upload,
  overview: Info,
  hierarchy: GitBranch,
  aliases: Tags,
  mappings: Link2,
  majors: GraduationCap,
  usage: ShieldCheck,
  validation: Activity,
  tree: GitBranch,
  diagnostics: ShieldCheck,
  crosswalk: Link2,
  review: BookOpen,
};
export function TaxonomyNavigation({
  items,
  active,
  onChange,
  label,
  secondary = false,
  disabled = false,
}: {
  items: Array<{ id: string; label: string; description?: string }>;
  active: string;
  onChange: (id: string) => void;
  label: string;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <nav className={secondary ? 'taxonomy-subnav' : 'taxonomy-nav'} aria-label={label}>
      {items.map((item) => {
        const Icon = icons[item.id] ?? BookOpen;
        return (
          <button
            type="button"
            key={item.id}
            disabled={disabled}
            aria-pressed={active === item.id}
            onClick={() => onChange(item.id)}
          >
            <Icon aria-hidden="true" size={18} />
            <span>
              <strong>{item.label}</strong>
              {item.description && <small>{item.description}</small>}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
export function TaxonomyRefresh({
  onClick,
  disabled,
  isAr,
}: {
  onClick: () => void;
  disabled?: boolean;
  isAr: boolean;
}) {
  return (
    <button type="button" className="taxonomy-refresh" disabled={disabled} onClick={onClick}>
      <RefreshCw aria-hidden="true" size={15} />
      {isAr ? 'تحديث البيانات' : 'Refresh data'}
    </button>
  );
}
export function TaxonomyGuide({ isAr }: { isAr: boolean }) {
  return (
    <details className="taxonomy-guide">
      <summary>
        {isAr ? 'دليل التصنيف وربطه بالتخصصات' : 'Classification and major relationships guide'}
      </summary>
      <div className="taxonomy-guide-grid">
        <p>
          {isAr
            ? 'المجال يصف موضوع الدراسة، والدرجة تصف المستوى الدراسي. يُربط كل منهما بالتخصص أو ملف مستواه بصورة مستقلة؛ تغيير الاسم لا ينشئ تخصصًا جديدًا.'
            : 'Fields describe the subject; degrees describe the study level. Both link independently to majors or their profiles. Renaming does not create a new major.'}
        </p>
        <p>
          {isAr
            ? 'الشجرة تحدد الآباء والأبناء والمسار الرئيسي. المطابقة بين ISCED وCIP والمعيار الوطني علاقة مراجعة مستقلة؛ تشابه الاسم أو الرمز لا يعني التكافؤ.'
            : 'Hierarchy records parents, children and the primary path. ISCED, CIP and national crosswalks require separate review; similar names or codes do not establish equivalence.'}
        </p>
        <p>
          {isAr
            ? 'المسودة ← جاهز للمراجعة ← نشط. الأرشفة تُبقي المعرّفات والروابط التاريخية. قبل تغيير الحالة، راجع أثرها على التخصصات والجهات المستفيدة.'
            : 'Draft → ready for review → active. Archiving retains IDs and historic references. Review usage before changing status.'}
        </p>
      </div>
    </details>
  );
}
