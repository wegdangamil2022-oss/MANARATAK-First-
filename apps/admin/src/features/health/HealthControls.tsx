import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle2,
  CircleHelp,
  AlertTriangle,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { useTranslation } from '../../i18n/I18nProvider';
import { healthText, healthComponentLabel, type HealthMessageKey } from '../../i18n/healthText';
import { useAdminAuthorization } from '../../security/AdminAuthorizationContext';
import { healthOwners, type Freshness, type HealthView } from './healthPresentation';
export function useHealthCopy() {
  const { language, dir } = useTranslation();
  return {
    language,
    dir,
    ar: language !== 'en',
    c: (ar: string, en: string) => (language === 'en' ? en : ar),
    t: (key: HealthMessageKey) => healthText(language, key),
    label: (id: string) => healthComponentLabel(language, id),
    time: (at: string) =>
      Number.isFinite(Date.parse(at))
        ? new Date(at).toLocaleString(language === 'en' ? 'en' : 'ar', { timeZoneName: 'short' })
        : '—',
  };
}
export function healthHref(view: HealthView, fields: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams({ view });
  for (const [key, value] of Object.entries(fields))
    if (
      value &&
      [
        'component',
        'issue',
        'section',
        'status',
        'group',
        'importance',
        'evidence',
        'q',
        'window',
        'owner',
        'freshness',
      ].includes(key)
    )
      params.set(key, value);
  return '/health-readiness?' + params.toString();
}
export function HealthPanel({
  title,
  children,
  actions,
  id,
}: {
  title: string;
  children: ReactNode;
  actions?: ReactNode;
  id?: string;
}) {
  return (
    <section className="reference-content-card" id={id}>
      <header>
        <h2>{title}</h2>
        {actions && <div className="health-actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
export function HealthNotice({
  children,
  error = false,
}: {
  children: ReactNode;
  error?: boolean;
}) {
  return (
    <div
      className={'health-notice' + (error ? ' health-notice-error' : '')}
      role={error ? 'alert' : 'status'}
    >
      <AlertCircle aria-hidden="true" />
      <div>{children}</div>
    </div>
  );
}
export function HealthBadge({
  status,
  historical = false,
}: {
  status: string;
  historical?: boolean;
}) {
  const { t, c } = useHealthCopy();
  const labels: Record<string, string> = {
    UP: t('UP'),
    DOWN: t('DOWN'),
    DEGRADED: t('DEGRADED'),
    UNKNOWN: t('UNKNOWN'),
    FRESH: c('حديثة', 'Fresh'),
    STALE: c('قديمة', 'Stale'),
    UNAVAILABLE: c('غير متاح', 'Unavailable'),
    BLOCKER: c('مانع', 'Blocker'),
    WARNING: c('تحذير', 'Warning'),
    INFO: c('معلومة', 'Information'),
  };
  const good = ['UP', 'FRESH'].includes(status),
    bad = ['DOWN', 'BLOCKER'].includes(status),
    unknown = ['UNKNOWN', 'UNAVAILABLE'].includes(status);
  const Icon =
    historical || unknown ? CircleHelp : good ? CheckCircle2 : bad ? AlertCircle : AlertTriangle;
  return (
    <span
      className={`health-badge ${historical ? 'health-muted-badge' : good ? 'health-good' : bad ? 'health-bad' : unknown ? 'health-muted-badge' : 'health-warn'}`}
    >
      <Icon aria-hidden="true" />
      {labels[status] ?? status}
    </span>
  );
}
export function EvidenceBadge({ operational, kind }: { operational: boolean; kind: string }) {
  const { c } = useHealthCopy();
  return (
    <span className="health-evidence">
      {operational
        ? c('دليل تشغيلي', 'Operational evidence')
        : kind === 'CONFIGURATION_ONLY'
          ? c('تهيئة فقط؛ التشغيل غير مثبت', 'Configuration only; operation unverified')
          : c('التشغيل غير مثبت', 'Operation unverified')}
    </span>
  );
}
export function HealthOwnerLink({ id }: { id?: string }) {
  const { hasPermission } = useAdminAuthorization(),
    { c } = useHealthCopy();
  const owner = id ? healthOwners[id] : undefined;
  return owner && hasPermission(owner.permission) ? (
    <Link className="health-link" to={owner.href}>
      <ExternalLink aria-hidden="true" />
      {c('فتح القسم المسؤول', 'Open owner workspace')}
    </Link>
  ) : (
    <small>
      {owner
        ? c('يتطلب صلاحية القسم المسؤول', 'Owner permission required')
        : c('لا يوجد مسار معالجة داخل الإدارة', 'No remediation route in this admin')}
    </small>
  );
}
export function HealthCopyButton({ text, label }: { text: string; label?: string }) {
  const { c } = useHealthCopy(),
    [result, setResult] = useState<'success' | 'error' | null>(null);
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setResult('success');
    } catch {
      setResult('error');
    }
  }
  return (
    <span className="health-copy">
      <button type="button" onClick={() => void copy()}>
        <Copy aria-hidden="true" />
        {label ?? c('نسخ المرجع', 'Copy reference')}
      </button>
      <span role="status">
        {result === 'success'
          ? c('تم النسخ', 'Copied')
          : result === 'error'
            ? c('تعذر النسخ؛ حاول مجددًا.', 'Copy failed; try again.')
            : ''}
      </span>
    </span>
  );
}
export function FreshnessNote({ freshness }: { freshness: Freshness }) {
  const { c } = useHealthCopy();
  return freshness !== 'FRESH' ? (
    <HealthNotice>
      {c(
        'هذه بيانات سابقة أو غير صالحة زمنيًا؛ لا يمكن تأكيد الوضع الحالي أو اجتياز بوابة الإطلاق منها.',
        'These are past or time-invalid observations. Current health and release passage cannot be confirmed from them.',
      )}
    </HealthNotice>
  ) : null;
}
