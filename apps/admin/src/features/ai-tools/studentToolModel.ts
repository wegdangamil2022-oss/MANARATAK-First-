import type { StudentToolDefinition } from '@manaratak/domain';
export type Tool = StudentToolDefinition;
export type ToolDetail = {
  tool: Tool;
  readiness: { ready: boolean; blockers: string[] };
  health: string;
  dependencies: Array<Tool['dependencies'][number] & { status: string }>;
};
export type Page<T> = { data: T[]; total: number; page: number; pageSize: number };
export const TOOL_TABS = [
  ['overview', 'الملخص', 'Overview'],
  ['content', 'المحتوى والظهور', 'Content and discovery'],
  ['access', 'الإتاحة والحدود', 'Access and limits'],
  ['release', 'الجاهزية والإطلاق', 'Readiness and release'],
  ['quality', 'الاختبار والجودة', 'Testing and quality'],
  ['executions', 'التنفيذ والتدقيق', 'Executions and audit'],
] as const;
export const TOOL_WORKSPACES = [
  ['library', 'مكتبة الأدوات', 'Tool library'],
  ['releases', 'الإطلاق والمراجعات', 'Releases and reviews'],
  ['usage', 'الاستخدام والأداء', 'Usage and performance'],
  ['quality', 'الجودة والاعتماديات', 'Quality and dependencies'],
] as const;
const labels: Record<string, [string, string]> = {
  PLANNED: ['مخطط', 'Planned'],
  IN_DEVELOPMENT: ['قيد التطوير', 'In development'],
  IMPLEMENTED: ['منفذ في المصدر', 'Source implemented'],
  RUNTIME_BLOCKED: ['تعثر التشغيل', 'Runtime blocked'],
  DRAFT: ['مسودة', 'Draft'],
  TESTING: ['قيد الاختبار', 'Testing'],
  ACTIVE: ['نشط في السجل', 'Active in registry'],
  DEPRECATED: ['قيد الإيقاف', 'Deprecated'],
  RETIRED: ['متقاعد', 'Retired'],
  PENDING: ['بانتظار المراجعة', 'Pending review'],
  APPROVED: ['معتمد', 'Approved'],
  REJECTED: ['مرفوض', 'Rejected'],
  CONSUMED: ['تم تفعيل الاعتماد', 'Approval consumed'],
  RUNNING: ['قيد التنفيذ', 'Running'],
  COMPLETED: ['مكتمل', 'Completed'],
  FAILED: ['فشل', 'Failed'],
  BLOCKED: ['محجوب', 'Blocked'],
  UNKNOWN_OUTCOME: ['نتيجة غير مؤكدة', 'Unknown outcome'],
  HEALTHY: ['الفحص سليم', 'Checks healthy'],
  READY: ['الفحص مستوفى', 'Checks ready'],
  NOT_CONFIGURED: ['غير مهيأ', 'Not configured'],
  DEGRADED: ['متدهور', 'Degraded'],
  MAINTENANCE: ['صيانة', 'Maintenance'],
  OFFLINE: ['غير متصل', 'Offline'],
  UNAVAILABLE: ['غير متاح', 'Unavailable'],
  DETERMINISTIC: ['حسابات وقواعد', 'Deterministic'],
  AI_DELEGATED: ['ذكاء اصطناعي', 'AI delegated'],
  HYBRID: ['هجين', 'Hybrid'],
  ADMIN_INTERNAL: ['إداري داخلي', 'Internal admin'],
  STUDENT: ['للطلاب', 'Students'],
  ANONYMOUS: ['زائر', 'Visitor'],
  AUTHENTICATED_STUDENT: ['طالب مسجل', 'Signed-in student'],
  ADMIN_TEST: ['اختبار إداري', 'Admin test'],
  ACADEMIC_CALCULATORS: ['الحسابات الأكاديمية', 'Academic calculators'],
  UNIVERSITIES: ['الجامعات', 'Universities'],
  SCHOLARSHIPS: ['المنح', 'Scholarships'],
  DOCUMENTS_AND_WRITING: ['المستندات والكتابة', 'Documents and writing'],
  FINANCIAL_PLANNING: ['التخطيط المالي', 'Financial planning'],
  ADMIN_DATA_QUALITY: ['جودة البيانات الإدارية', 'Admin data quality'],
  STUDENT_PLANNING: ['التخطيط الدراسي', 'Student planning'],
  COMING_SOON: ['قريبًا', 'Coming soon'],
  UNDER_DEVELOPMENT: ['قيد التطوير', 'Under development'],
  HIDDEN_ADMIN_ONLY: ['مخفي للإدارة', 'Hidden — admin only'],
  DISABLED: ['معطل', 'Disabled'],
  FLAG_OR_LIFECYCLE_DISABLED: [
    'الإتاحة أو حالة الإصدار تمنع الاستخدام',
    'Access policy or lifecycle blocks use',
  ],
  FLAG_DISABLED: ['الجمهور غير مفعّل', 'Audience is disabled'],
  LOCALE_DENIED: ['اللغة غير متاحة', 'Locale unavailable'],
  TOOL_NOT_IMPLEMENTED: ['لم تُنفذ الأداة بعد', 'Tool not implemented'],
  MISSING_IMPLEMENTATION_HANDLER: ['معالج التنفيذ غير موجود', 'Implementation handler missing'],
  INVALID_TOOL_SCHEMA: ['عقد المدخلات أو النتائج غير مكتمل', 'Input or output contract incomplete'],
  TOOL_HANDLER_SCHEMA_MISMATCH: [
    'عقد الأداة لا يطابق المعالج',
    'Tool contract differs from handler',
  ],
  TOOL_GLOBALLY_DISABLED: ['تشغيل الأداة معطل', 'Tool execution disabled'],
  TOOL_RESULT_PROTECTION_NOT_CONFIGURED: [
    'حماية النتائج غير مهيأة',
    'Result protection not configured',
  ],
  REGION_POLICY_UNAVAILABLE: [
    'قيود المناطق غير مدعومة حاليًا',
    'Regional restrictions are unsupported',
  ],
};
export function toolLabel(value: string, language: string) {
  return labels[value]?.[language === 'en' ? 1 : 0] ?? value;
}
export const TOOL_CATEGORIES = [
  'ACADEMIC_CALCULATORS',
  'UNIVERSITIES',
  'SCHOLARSHIPS',
  'DOCUMENTS_AND_WRITING',
  'FINANCIAL_PLANNING',
  'STUDENT_PLANNING',
  'ADMIN_DATA_QUALITY',
];
export function nextToolVersion(version: string) {
  const parts = version.split('.').map(Number);
  return `${parts[0]}.${parts[1]}.${parts[2] + 1}`;
}
