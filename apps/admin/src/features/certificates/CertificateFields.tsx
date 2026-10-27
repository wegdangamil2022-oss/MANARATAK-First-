import { certificateCopy, certificateStatusCopy } from '@manaratak/shared';
import { useTranslation } from '../../i18n/I18nProvider';
import type { TemplateStatus } from './certificateModels';
export function StatusBadge({ status }: { status: string }) {
  const { language } = useTranslation();
  const style =
    status === 'ACTIVE'
      ? 'bg-emerald-100 text-emerald-800'
      : status === 'REVOKED'
        ? 'bg-rose-100 text-rose-800'
        : status === 'EXPIRED'
          ? 'bg-amber-100 text-amber-800'
          : status === 'APPROVED'
            ? 'bg-blue-100 text-blue-800'
            : 'bg-slate-100 text-slate-700';
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-[10px] font-black ${style}`}>
      {status === 'RECOVERY_REQUIRED'
        ? language === 'ar'
          ? 'تحتاج استئنافًا'
          : 'Recovery required'
        : status === 'REVALIDATION_REQUIRED'
          ? language === 'ar'
            ? 'تحتاج إعادة تحقق'
            : 'Revalidation required'
          : certificateStatusCopy(language, status)}
    </span>
  );
}
export function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b pb-2 last:border-0">
      <dt className="text-[10px] text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-all font-bold text-slate-700">{value}</dd>
    </div>
  );
}
export function Field({
  label,
  value,
  onChange,
  disabled,
  optional,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  optional?: boolean;
}) {
  const { language } = useTranslation();
  const copy = (value: string) => certificateCopy(language, value);
  return (
    <label className="block">
      <span className="text-xs font-bold">
        {label}
        {optional ? copy('— اختياري') : ''}
      </span>
      <input
        required={!optional}
        disabled={disabled}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm disabled:bg-slate-100"
      />
    </label>
  );
}
export function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number | null;
  onChange: (value: number | null) => void;
}) {
  return (
    <label className="block">
      <span className="text-xs font-bold">{label}</span>
      <input
        type="number"
        min={1}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
      />
    </label>
  );
}
export function TextArea({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label>
      <span className="text-xs font-bold">{label}</span>
      <textarea
        required
        rows={4}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-xl border px-3 py-2 text-sm"
      />
    </label>
  );
}
export function formatDate(value: string, language: 'ar' | 'en' = 'ar') {
  if (!Number.isFinite(Date.parse(value))) return certificateCopy(language, 'غير متاح');
  return new Intl.DateTimeFormat(language, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
  }).format(new Date(value));
}
export function bumpPatch(version: string) {
  const parts = version.split('.').map(Number);
  if (parts.length !== 3 || parts.some(Number.isNaN)) return '1.0.1';
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}
export function nextTemplateStatus(status: TemplateStatus): TemplateStatus | null {
  if (status === 'DRAFT') return 'PENDING_APPROVAL';
  if (status === 'PENDING_APPROVAL') return 'APPROVED';
  if (status === 'APPROVED') return 'ACTIVE';
  if (status === 'ACTIVE') return 'DEPRECATED';
  if (status === 'DEPRECATED') return 'ARCHIVED';
  return null;
}
export function transitionLabel(status: TemplateStatus, language: 'ar' | 'en') {
  const copy = (value: string) => certificateCopy(language, value);
  return status === 'DRAFT'
    ? copy('إرسال للمراجعة')
    : status === 'PENDING_APPROVAL'
      ? copy('اعتماد')
      : status === 'APPROVED'
        ? copy('تفعيل')
        : status === 'ACTIVE'
          ? copy('إيقاف تدريجي')
          : status === 'DEPRECATED'
            ? copy('أرشفة')
            : copy('تغيير الحالة');
}
