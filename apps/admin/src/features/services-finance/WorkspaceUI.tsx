import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';
import './workspace.css';

export type WorkspaceItem = { id: string; label: string; description?: string; icon: LucideIcon };
export function OwnerNavigation({
  items,
  active,
  onChange,
  label,
  secondary = false,
  disabled = false,
}: {
  items: WorkspaceItem[];
  active: string;
  onChange: (id: string) => void;
  label: string;
  secondary?: boolean;
  disabled?: boolean;
}) {
  return (
    <nav className={secondary ? 'sf-subnav' : 'sf-navigation'} aria-label={label}>
      {items.map(({ id, label, description, icon: Icon }) => (
        <button
          key={id}
          type="button"
          aria-pressed={active === id}
          disabled={disabled}
          onClick={() => onChange(id)}
        >
          <Icon size={18} aria-hidden="true" />
          <span>
            <strong>{label}</strong>
            {description && <small>{description}</small>}
          </span>
        </button>
      ))}
    </nav>
  );
}
export function OwnerHeading({
  title,
  description,
  actions,
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="sf-heading">
      <div>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="sf-actions">{actions}</div>}
    </header>
  );
}
export function OwnerPanel({
  title,
  children,
  actions,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <section className="sf-panel">
      <div className="sf-panel-heading">
        <h2>{title}</h2>
        {actions}
      </div>
      {children}
    </section>
  );
}
export function useOwnerCopy() {
  const { language, dir } = useTranslation();
  return { language, dir, c: (ar: string, en: string) => (language === 'ar' ? ar : en) };
}
