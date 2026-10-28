export const settingsViews = [
  'overview',
  'catalog',
  'assignments',
  'flags',
  'governance',
  'resolution',
] as const;
export type SettingsView = (typeof settingsViews)[number];
export function settingsView(value: string | null): SettingsView {
  return settingsViews.includes(value as SettingsView) ? (value as SettingsView) : 'overview';
}
export function parseSettingsValue(type: string, raw: string): unknown {
  if (type === 'String') return raw;
  if (type === 'Boolean') {
    if (!['true', 'false'].includes(raw)) throw Error('SETTINGS_BOOLEAN_REQUIRED');
    return raw === 'true';
  }
  if (type === 'Number') {
    if (!raw.trim() || !Number.isFinite(Number(raw))) throw Error('SETTINGS_NUMBER_REQUIRED');
    return Number(raw);
  }
  const value: unknown = JSON.parse(raw);
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('SETTINGS_JSON_OBJECT_REQUIRED');
  return value;
}
export function settingsOperationError(cause: unknown, ar: boolean): string {
  const message = cause instanceof Error ? cause.message : '';
  if (/CONFLICT|VERSION_CHANGED|\[409\]/.test(message))
    return ar
      ? 'تغيّرت النسخة المحفوظة. أعد تحميلها وراجع التعديل قبل الحفظ.'
      : 'The saved version changed. Reload and review before saving.';
  if (/\[40[13]\]|FORBIDDEN|AUTH_GUARD/.test(message))
    return ar
      ? 'تعذر اعتماد الصلاحية الحالية. تحقق من تسجيل الدخول والصلاحيات.'
      : 'Current access could not be verified. Check your session and permissions.';
  if (/SETTINGS_BOOLEAN_REQUIRED/.test(message))
    return ar ? 'اختر مفعّل أو معطل.' : 'Choose enabled or disabled.';
  if (/SETTINGS_NUMBER_REQUIRED/.test(message))
    return ar ? 'أدخل رقمًا صالحًا.' : 'Enter a valid number.';
  if (/JSON|Unexpected token|Expected property/.test(message))
    return ar ? 'اكتب كائن JSON صالحًا.' : 'Enter a valid JSON object.';
  if (/\[400\]|REJECTED/.test(message))
    return ar
      ? 'لم يُقبل التغيير. راجع نوع القيمة والقيود والنطاق وسبب التغيير.'
      : 'Change rejected. Review the value type, constraints, scope and reason.';
  return ar
    ? 'تعذر تأكيد العملية. احتفظ بالإدخال وأعد المحاولة بنفس الطلب.'
    : 'The outcome could not be confirmed. Keep the input and retry the same request.';
}
export function settingsProposalStatus(
  row: { consumedAt: string | null; approvedAt: string | null; expiresAt: string },
  now = Date.now(),
) {
  if (row.consumedAt) return 'COMMITTED';
  const expiry = Date.parse(row.expiresAt);
  if (!Number.isFinite(expiry) || expiry <= now) return 'EXPIRED';
  return row.approvedAt ? 'APPROVED' : 'PENDING';
}
