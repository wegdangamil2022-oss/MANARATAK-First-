import type { ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { statusName, errorMessage } from './notificationModel';
export function Status({ value, ar }: { value: string; ar: boolean }) {
  return (
    <span className="notification-status" data-state={value}>
      {statusName(value, ar)}
    </span>
  );
}
export function ReadError({
  error,
  retry,
  ar,
}: {
  error: unknown;
  retry: () => void;
  ar: boolean;
}) {
  return (
    <div role="alert" className="notification-error">
      <AlertTriangle size={18} />
      <span>{errorMessage(error, ar)}</span>
      <button type="button" onClick={retry}>
        <RefreshCw size={17} />
        {ar ? 'إعادة المحاولة' : 'Retry'}
      </button>
    </div>
  );
}
export function Loading({ ar }: { ar: boolean }) {
  return (
    <p role="status" className="notification-loading">
      {ar ? 'جارٍ تحميل البيانات…' : 'Loading data…'}
    </p>
  );
}
export function Panel({
  title,
  icon,
  children,
}: {
  title: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="notification-panel">
      <h2>
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}
export function Variables({
  names,
  value,
  change,
  ar,
  disabled = false,
}: {
  names: string[];
  value: Record<string, string>;
  change: (name: string, value: string) => void;
  ar: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="notification-fields">
      {names.map((name) => (
        <label key={name}>
          <span dir="ltr">{name}</span>
          <textarea
            required
            maxLength={10000}
            value={value[name] ?? ''}
            disabled={disabled}
            onChange={(event) => change(name, event.target.value)}
            aria-label={(ar ? 'قيمة المتغير ' : 'Variable value ') + name}
          />
        </label>
      ))}
    </div>
  );
}
