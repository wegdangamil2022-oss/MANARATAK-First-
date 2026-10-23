import { ChevronDown, type LucideIcon } from 'lucide-react';

/** Native summary keeps keyboard activation and expanded-state semantics on details. */
export function AdminDisclosureHeading({ title, description, icon: Icon, language, headingId }: {
  title: string; description?: string; icon: LucideIcon; language: string; headingId?: string;
}) {
  const ar = language === 'ar';
  return <summary id={headingId} className="admin-disclosure-heading">
    <span className="admin-disclosure-heading-icon"><Icon aria-hidden="true" /></span>
    <span className="admin-disclosure-labels">
      <strong className="admin-disclosure-title">{title}</strong>
      <span className="admin-disclosure-description">{description ?? (ar ? 'اضغط لعرض التفاصيل' : 'Select to view details')}</span>
    </span>
    <span className="admin-disclosure-toggle" aria-hidden="true"><ChevronDown /></span>
  </summary>;
}
