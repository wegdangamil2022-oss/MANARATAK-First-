import { Link } from 'react-router-dom';
import type { LucideIcon } from 'lucide-react';
export function ExecutiveKpi({
  title,
  value,
  icon: Icon,
  tone,
  href,
  status,
  note,
  language,
}: {
  title: string;
  value: number | null;
  icon: LucideIcon;
  tone: string;
  href?: string;
  status?: string;
  note?: string;
  language: string;
}) {
  const content = (
    <>
      <span className={`executive-icon ${tone}`}>
        <Icon aria-hidden="true" />
      </span>
      <div className="executive-kpi-content">
        <h3>{title}</h3>
        <output>{value === null ? '—' : new Intl.NumberFormat(language).format(value)}</output>
        {status && <span className="executive-state">{status}</span>}
        {note && <span className="executive-caption">{note}</span>}
      </div>
    </>
  );
  return href ? (
    <Link className="executive-kpi" to={href}>
      {content}
    </Link>
  ) : (
    <article className="executive-kpi">{content}</article>
  );
}
