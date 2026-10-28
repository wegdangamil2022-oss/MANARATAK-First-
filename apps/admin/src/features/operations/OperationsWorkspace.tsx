import type { ReactNode } from 'react';
import type { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import './operations.css';

export function OperationsHeading({
  title,
  description,
  icon: Icon,
  actions,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  actions?: ReactNode;
}) {
  return (
    <header className="operations-heading">
      <div>
        <h1>
          <Icon aria-hidden="true" />
          {title}
        </h1>
        <p>{description}</p>
      </div>
      {actions && <div className="operations-actions">{actions}</div>}
    </header>
  );
}

export function OperationsNavigation({
  items,
  active,
  label,
}: {
  items: Array<{ id: string; label: string; description: string; to: string; icon: LucideIcon }>;
  active: string;
  label: string;
}) {
  return (
    <nav className="operations-navigation admin-section-navigation" aria-label={label}>
      {items.map(({ id, label, description, to, icon: Icon }) => (
        <Link key={id} to={to} aria-current={active === id ? 'page' : undefined}>
          <Icon aria-hidden="true" />
          <span>
            <strong>{label}</strong>
            <small>{description}</small>
          </span>
        </Link>
      ))}
    </nav>
  );
}

export function OperationsNotice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <p
      className={error ? 'operations-notice operations-error' : 'operations-notice'}
      role={error ? 'alert' : 'status'}
    >
      {children}
    </p>
  );
}
