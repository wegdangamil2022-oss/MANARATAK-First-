import { reviewSources } from '../review-queue/ReviewSources';
export type DashboardSource = {
  key: string;
  domain: string;
  endpoint: string;
  permissions: string[];
  kind:
    | 'total'
    | 'identity'
    | 'scholarships'
    | 'courses'
    | 'imports'
    | 'finance'
    | 'health'
    | 'activity';
  params: Record<string, string>;
  metrics: string[];
  ttlMs: number;
  href: string;
  unit:
    | 'records'
    | 'identities'
    | 'major_profiles'
    | 'content_roots'
    | 'jobs'
    | 'finance_signals'
    | 'import_records'
    | 'runtime'
    | 'events';
};
const ownerCatalogs = [
  ['universities', '/admin/universities', '/universities', 'admin:universities:manage'],
  ['scholarships', '/admin/scholarships', '/scholarships', 'admin:scholarships:manage'],
  ['majors', '/admin/majors', '/majors', 'admin:majors:manage'],
  ['courses', '/admin/courses', '/courses', 'admin:courses:manage'],
  [
    'tests',
    '/admin/international-tests',
    '/international-tests',
    'admin:international-tests:manage',
  ],
  ['cms', '/admin/cms/content', '/cms', 'admin:cms:view'],
  ['careers', '/admin/careers/jobs', '/careers', 'admin:careers:manage'],
  ['services', '/admin/services', '/services', 'admin:services:manage'],
] as const;
function queueHref(domain: string, reason: string) {
  return `/review-queue?${new URLSearchParams({ domain, reason })}`;
}
export const dashboardSources: DashboardSource[] = ownerCatalogs.flatMap(
  ([domain, endpoint, path, permission]) => {
    const predicates: Array<[string, string | null]> = [
      ['total', null],
      ['published', 'PUBLISHED'],
      ['review', domain === 'cms' ? 'IN_REVIEW' : 'READY_TO_REVIEW'],
      ['ready', 'READY_TO_PUBLISH'],
    ];
    if (domain === 'tests') predicates.push(['needs_review', 'NEEDS_REVIEW']);
    return predicates.map(([metric, status]) => ({
      key: `${domain}:${metric}`,
      domain,
      endpoint,
      permissions: [permission],
      kind: 'total',
      params: {
        ...(domain === 'majors' ? { catalog: 'false' } : {}),
        ...(status ? { status } : {}),
        page: '1',
        pageSize: '1',
      },
      metrics: [metric],
      ttlMs: 300000,
      href:
        metric === 'review' || metric === 'needs_review'
          ? queueHref(domain, 'workflow_review')
          : metric === 'ready'
            ? queueHref(domain, 'ready_to_publish')
            : path,
      unit:
        domain === 'majors'
          ? 'major_profiles'
          : domain === 'cms'
            ? 'content_roots'
            : domain === 'careers'
              ? 'jobs'
              : 'records',
    }));
  },
);
dashboardSources.push(
  {
    key: 'identities',
    domain: 'identities',
    endpoint: '/admin/identities',
    permissions: ['admin:identities:manage'],
    kind: 'identity',
    params: { type: 'Human', limit: '1', offset: '0' },
    metrics: ['humans'],
    ttlMs: 300000,
    href: '/identities?type=Human',
    unit: 'identities',
  },
  {
    key: 'scholarships:quality',
    domain: 'scholarships',
    endpoint: '/admin/scholarships/summary',
    permissions: ['admin:scholarships:manage'],
    kind: 'scholarships',
    params: {},
    metrics: ['imported', 'missingFields', 'needsVerification', 'needsTranslation'],
    ttlMs: 300000,
    href: '/scholarships',
    unit: 'records',
  },
  {
    key: 'courses:imported',
    domain: 'courses',
    endpoint: '/admin/courses/imported',
    permissions: ['admin:courses:manage'],
    kind: 'courses',
    params: { page: '1', pageSize: '1' },
    metrics: [
      'imported_total',
      'imported_review',
      'imported_incomplete',
      'imported_broken',
      'imported_needsVerification',
    ],
    ttlMs: 300000,
    href: '/courses',
    unit: 'records',
  },
  {
    key: 'imports',
    domain: 'imports',
    endpoint: '/admin/imports/overview',
    permissions: ['admin:imports:manage'],
    kind: 'imports',
    params: {},
    metrics: ['batches', 'records', 'NEEDS_REVIEW', 'INCOMPLETE', 'FAILED', 'DLQ', 'PROMOTED'],
    ttlMs: 60000,
    href: '/imports',
    unit: 'import_records',
  },
  {
    key: 'finance',
    domain: 'finance',
    endpoint: '/admin/finance/overview',
    permissions: ['admin:finance:manage'],
    kind: 'finance',
    params: {},
    metrics: ['pendingPayments', 'pendingTransfers', 'pendingApprovals'],
    ttlMs: 60000,
    href: '/finance',
    unit: 'finance_signals',
  },
  {
    key: 'health',
    domain: 'health',
    endpoint: '/admin/monitoring/overview',
    permissions: ['admin:platform:manage'],
    kind: 'health',
    params: {},
    metrics: [],
    ttlMs: 30000,
    href: '/health-readiness',
    unit: 'runtime',
  },
  {
    key: 'activity',
    domain: 'audit',
    endpoint: '/admin/audit/dashboard-activity',
    permissions: ['admin:platform:manage', 'admin:audit:manage'],
    kind: 'activity',
    params: {},
    metrics: [],
    ttlMs: 30000,
    href: '/audit',
    unit: 'events',
  },
);
export const unmeasuredCoverage = [
  'certificate_issuance_failures',
  'service_request_backlog',
  'notification_dead_letters',
  'student_support_alerts',
  'analytics_funnel',
] as const;
export const analyticsContract = {
  state: 'NOT_MEASURED',
  metrics: ['consented_sessions', 'search_events', 'result_opens', 'target_actions', 'conversions'],
  requiredEvidence: [
    'owner_and_store',
    'consent_and_retention',
    'attribution_window',
    'user_vs_event_unit',
    'timezone',
    'bot_filtering',
    'quality_thresholds',
  ],
} as const;
export function dashboardAllowed(
  source: DashboardSource,
  hasPermission: (permission: string) => boolean,
): boolean {
  return source.permissions.every(hasPermission);
}
export function dashboardMetricHref(source: DashboardSource, metric: string): string {
  if (source.kind === 'scholarships' && metric === 'needsVerification')
    return queueHref('scholarships', 'source_verification');
  if (source.kind === 'scholarships' && metric === 'needsTranslation')
    return queueHref('scholarships', 'needs_translation');
  if (source.kind === 'courses' && metric === 'imported_broken')
    return queueHref('courses', 'broken_link');
  if (source.kind === 'courses' && metric === 'imported_needsVerification')
    return queueHref('courses', 'source_verification');
  return source.href;
}
// Queue links use only registered owner reasons. Generic list handoffs are labeled as such.
export function isDashboardQueueLinkSupported(path: string): boolean {
  if (!path.startsWith('/review-queue?')) return true;
  const params = new URLSearchParams(path.slice(path.indexOf('?') + 1));
  return reviewSources.some(
    (source) => source.domain === params.get('domain') && source.reason === params.get('reason'),
  );
}
