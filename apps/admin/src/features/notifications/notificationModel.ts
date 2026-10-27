export type Template = {
  id: string;
  active?: boolean;
  version?: number;
  usageCount?: number;
  updatedAt?: string;
  channels: string[];
  requiredVariables: string[];
  localizations: string[];
  contents?: Record<string, { subject: string; body: string }>;
};
export type Intent = {
  id: string;
  reference?: string;
  templateId: string;
  recipientReference: string;
  state?: string;
  deliveryState: string;
  attempts: number;
  manualRetryCount?: number;
  nextAttemptAt?: string | null;
  deliveredAt?: string | null;
  lastErrorCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
  scheduledAt?: string | null;
  expiresAt?: string | null;
  payloadErasedAt?: string | null;
  channels?: string[];
};
export type Receipt = {
  channel: string;
  status: string;
  attempts: number;
  updatedAt: string;
  errorCode?: string | null;
};
export type Page<T> = { items: T[]; nextCursor?: string | null };
export type Preview = { title: string; message: string; locale: string; fallback?: boolean };
export type Summary = {
  from: string;
  to: string;
  counts: Record<string, number>;
  channels?: { channel: string; status: string; count: number }[];
  errors?: { code: string; count: number }[];
  oldestPendingAt?: string | null;
};
export const deliveryStates = [
  'PENDING',
  'PROCESSING',
  'ACCEPTED',
  'DELIVERED',
  'FAILED',
  'DEAD_LETTER',
  'SUPPRESSED',
  'CANCELLED',
  'EXPIRED',
];
export const channels = ['IN_APP', 'EMAIL', 'PUSH'];
export const protectedTemplate = (id: string) =>
  id.startsWith('system.') || id.startsWith('student-application-');
export const nextAttempt = (intent: Intent) =>
  ['PENDING', 'PROCESSING', 'FAILED', 'ACCEPTED'].includes(intent.deliveryState)
    ? intent.nextAttemptAt
    : null;
export function statusName(value: string, ar: boolean) {
  const labels: Record<string, string> = {
    PENDING: 'قيد الانتظار',
    PROCESSING: 'جارٍ المعالجة',
    ACCEPTED: 'قبله المزوّد — الوصول غير مؤكد',
    DELIVERED: 'تم التسليم — لا يعني القراءة',
    FAILED: 'فشل',
    DEAD_LETTER: 'فشل نهائي',
    SUPPRESSED: 'محجوب بالتفضيلات أو السياسة',
    CANCELLED: 'أُلغيت القنوات المتبقية',
    EXPIRED: 'انتهت الصلاحية',
  };
  const en: Record<string, string> = {
    ACCEPTED: 'Provider accepted — arrival unconfirmed',
    DELIVERED: 'Delivered — not a read receipt',
    DEAD_LETTER: 'Dead letter',
    SUPPRESSED: 'Suppressed by policy or preferences',
    CANCELLED: 'Remaining channels cancelled',
  };
  return ar ? (labels[value] ?? value) : (en[value] ?? value.replaceAll('_', ' '));
}
export function date(value?: string | null, ar = true) {
  return value && Number.isFinite(Date.parse(value))
    ? new Date(value).toLocaleString(ar ? 'ar' : 'en', { timeZone: 'UTC' }) + ' UTC'
    : '—';
}
export function safeReturn(value: string | null, fallback = '/notifications') {
  if (!value) return fallback;
  const [path, search] = value.split('?');
  if (path !== '/notifications' || value.includes('#')) return fallback;
  const params = new URLSearchParams(search),
    clean = new URLSearchParams();
  for (const key of [
    'tab',
    'q',
    'state',
    'template',
    'period',
    'from',
    'to',
    'recipient',
    'cursor',
    'previous',
    'channel',
    'locale',
    'active',
  ]) {
    const item = params.get(key);
    if (item !== null && item.length <= 5000) clean.set(key, item);
  }
  return path + (clean.size ? '?' + clean : '');
}
export function dateWindow(period: string, from: string, to: string, now = Date.now()) {
  if (period === 'custom') {
    const start = Date.parse(from + 'T00:00:00.000Z'),
      end = Date.parse(to + 'T00:00:00.000Z') + 86400000;
    if (
      !Number.isFinite(start) ||
      !Number.isFinite(end) ||
      new Date(start).toISOString().slice(0, 10) !== from ||
      new Date(end - 86400000).toISOString().slice(0, 10) !== to ||
      end <= start ||
      end - start > 31 * 86400000
    )
      return null;
    return { from: new Date(start).toISOString(), to: new Date(end).toISOString() };
  }
  return {
    from: new Date(now - (period === '7d' ? 7 : 1) * 86400000).toISOString(),
    to: new Date(now).toISOString(),
  };
}
export function errorMessage(error: unknown, ar: boolean) {
  const raw = error instanceof Error ? error.message : '';
  const known: Array<[RegExp, string, string]> = [
    [
      /NOTIFICATION_TEMPLATE_IN_USE/,
      'القالب مرتبط بإشعارات نشطة؛ لا يمكن تعطيله الآن.',
      'Template has active intents and cannot be deactivated.',
    ],
    [
      /CONFLICT|\b409\b/,
      'تغيّرت البيانات أو المعرّف مستخدم. حدّث السجل قبل المحاولة.',
      'Data changed or the ID is in use. Refresh before retrying.',
    ],
    [
      /OWNER_.*RESERVED/,
      'هذا القالب تابع للنظام ومحمي من الإجراء اليدوي.',
      'This system-owned template is protected from this command.',
    ],
    [
      /NOT_FOUND|\b404\b/,
      'السجل غير موجود أو القالب غير متاح.',
      'Record not found or template unavailable.',
    ],
    [
      /403|ACCESS_DENIED|MFA_/,
      'لم يُسمح بالإجراء. تحقق من الصلاحيات والمصادقة الإضافية.',
      'Permission or additional authentication is required.',
    ],
    [
      /NOT_RETRYABLE|NOT_CANCELLABLE/,
      'حالة الإشعار لا تسمح بهذا الإجراء. حدّث التفاصيل.',
      'This action is not allowed in the current state. Refresh details.',
    ],
    [
      /PAYLOAD_PROTECTION/,
      'حماية محتوى الإشعارات غير مجهزة في هذه البيئة.',
      'Notification payload protection is not configured in this environment.',
    ],
    [
      /INPUT_INVALID|CONTENT_INVALID|VARIABLE|HTML|EXPIR|TIME_WINDOW|CHANNEL|LOCALE/,
      'تحقق من الحقول والمتغيرات والتوقيت وفق شروط القالب.',
      'Check fields, variables and dates against the template requirements.',
    ],
  ];
  const match = known.find(([pattern]) => pattern.test(raw));
  return match
    ? match[ar ? 1 : 2]
    : ar
      ? 'تعذر إتمام الطلب. أعد المحاولة؛ لن تُعاد العملية تلقائيًا.'
      : 'Request could not be confirmed. Retry explicitly; it will not run automatically.';
}
export function validateTemplate(value: {
  id: string;
  channels: string[];
  variables: string[];
  contents: Record<string, { subject: string; body: string }>;
}) {
  if (
    !value.id.trim() ||
    value.id.length > 160 ||
    protectedTemplate(value.id) ||
    !value.channels.length ||
    value.channels.some((channel) => !channels.includes(channel))
  )
    return false;
  if (
    value.variables.length > 40 ||
    new Set(value.variables).size !== value.variables.length ||
    value.variables.some(
      (name) =>
        !/^[a-zA-Z][a-zA-Z0-9_]{0,119}$/.test(name) ||
        /password|token|secret|authorization|email|phone/i.test(name),
    )
  )
    return false;
  return ['ar', 'en'].every((locale) => {
    const item = value.contents[locale];
    if (
      !item?.subject.trim() ||
      !item.body.trim() ||
      item.subject.length > 240 ||
      item.body.length > 10000 ||
      /[<>]/.test(item.subject + item.body)
    )
      return false;
    const text = item.subject + item.body;
    return (
      [...text.matchAll(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g)].every((match) =>
        value.variables.includes(match[1]),
      ) && !/\{\{|\}\}/.test(text.replace(/\{\{([a-zA-Z][a-zA-Z0-9_]*)\}\}/g, ''))
    );
  });
}
