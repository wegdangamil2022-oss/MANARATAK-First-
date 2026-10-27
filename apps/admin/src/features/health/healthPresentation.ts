import type { HealthComponent, HealthOverview, HealthFinding } from './HealthOverviewContract';
import type { History } from './HealthHistoryContract';
export type HealthView = 'overview' | 'services' | 'issues' | 'release' | 'reports';
export type Freshness = 'FRESH' | 'STALE' | 'UNAVAILABLE';
export function healthView(value: string | null): HealthView {
  const key = value?.toLowerCase();
  if (key === 'incidents') return 'issues';
  if (key === 'components') return 'services';
  if (['coverage', 'history', 'report'].includes(key ?? '')) return 'reports';
  return ['services', 'issues', 'release', 'reports'].includes(key ?? '')
    ? (key as HealthView)
    : 'overview';
}
export function healthFreshness(at: string | undefined, now: number, failed = false): Freshness {
  const age = now - Date.parse(at ?? '');
  if (!Number.isFinite(age) || age < -1000) return 'UNAVAILABLE';
  return failed || age > 30_000 ? 'STALE' : 'FRESH';
}
const groups: Record<string, string[]> = {
  data: ['database', 'database-schema', 'redis', 'asset-platform', 'asset-reference-integrity'],
  web: ['public-web', 'student-tools-quota'],
  operations: ['background-jobs', 'polling-workers', 'runtime-lifecycle', 'telemetry-exporter'],
  security: ['admin-auth'],
  integrations: ['notifications', 'payment-gateway', 'ai-providers', 'import-foundation'],
};
export const groupNames = {
  data: ['البيانات والتخزين', 'Data and storage'],
  web: ['الويب والطلاب', 'Web and students'],
  operations: ['التشغيل والمهام', 'Operations and jobs'],
  security: ['المصادقة والأمان', 'Authentication and security'],
  integrations: ['الخدمات المتكاملة', 'Integrations'],
  other: ['أخرى', 'Other'],
} as const;
export function serviceGroup(id: string): keyof typeof groupNames {
  return (Object.keys(groups).find((key) => groups[key].includes(id)) ??
    'other') as keyof typeof groupNames;
}
export const healthOwners: Record<string, { href: string; permission: string }> = {
  'asset-platform': { href: '/assets', permission: 'admin:assets:manage' },
  'asset-reference-integrity': { href: '/assets', permission: 'admin:assets:manage' },
  'import-foundation': { href: '/imports', permission: 'admin:imports:manage' },
  'admin-auth': { href: '/authorization', permission: 'admin:authorization:manage' },
  'ai-providers': { href: '/ai', permission: 'admin:ai:view' },
  'payment-gateway': { href: '/finance', permission: 'admin:finance:manage' },
  notifications: { href: '/notifications', permission: 'admin:notifications:view' },
  'student-tools-quota': { href: '/student-tools', permission: 'admin:student-tools:view' },
};
function productionComponent(id: string): string | undefined {
  const prefix: Record<string, string> = {
    'admin.': 'admin-auth',
    'auth.': 'admin-auth',
    'database.': 'database',
    'redis.': 'redis',
    'web.': 'public-web',
    'launch.notifications.': 'notifications',
    'launch.payment-gateway.': 'payment-gateway',
  };
  return Object.entries(prefix).find(([key]) => id.startsWith(key))?.[1];
}
export type HealthIssue = {
  key: string;
  id: string;
  source: 'component' | 'production' | 'coverage';
  severity: HealthFinding['severity'];
  componentId?: string;
  message?: string;
  recommendation?: string;
  checkedAt: string;
  kind: 'status' | 'missing' | 'unverified' | 'production';
};
export function healthIssues(overview: HealthOverview): HealthIssue[] {
  const result: HealthIssue[] = overview.components
    .filter((c) => c.status !== 'UP')
    .map((c) => ({
      key: `component:${c.id}`,
      id: c.id,
      source: 'component',
      kind: 'status',
      severity: c.optional ? 'WARNING' : 'BLOCKER',
      componentId: c.id,
      checkedAt: c.checkedAt,
      recommendation: c.error,
    }));
  for (const f of overview.productionReadiness.findings)
    result.push({
      key: `production:${f.id}`,
      id: f.id,
      source: 'production',
      kind: 'production',
      severity: f.severity,
      componentId: productionComponent(f.id),
      message: f.message,
      recommendation: f.recommendation,
      checkedAt: overview.productionReadiness.checkedAt,
    });
  for (const [kind, ids] of [
    ['missing', overview.coverage.missingProbes],
    ['unverified', overview.coverage.requiredUnverified],
  ] as const)
    for (const id of ids)
      result.push({
        key: `coverage:${kind}:${id}`,
        id: `${kind}:${id}`,
        source: 'coverage',
        kind,
        severity: 'BLOCKER',
        componentId: id,
        checkedAt: overview.checkedAt,
      });
  const rank = { BLOCKER: 0, WARNING: 1, INFO: 2 };
  return [...new Map(result.map((i) => [i.key, i])).values()].sort(
    (a, b) => rank[a.severity] - rank[b.severity] || a.key.localeCompare(b.key),
  );
}
export function sortServices(components: HealthComponent[]) {
  const rank = (c: HealthComponent) =>
    !c.optional && c.status === 'DOWN'
      ? 0
      : !c.optional && (c.status === 'UNKNOWN' || !c.operational)
        ? 1
        : c.status === 'DEGRADED'
          ? 2
          : c.status !== 'UP'
            ? 3
            : 4;
  return [...components].sort((a, b) => rank(a) - rank(b) || a.id.localeCompare(b.id));
}
export function mergeHealthHistory(previous: History | null, next: History, append: boolean) {
  if (!append || !previous) return { history: next, reset: false };
  // A process-local cursor cannot establish that another replica owns the same samples.
  if (
    !previous.startedAt ||
    previous.startedAt !== next.startedAt ||
    previous.window !== next.window
  )
    return { history: next, reset: true };
  const samples = [
    ...new Map([...previous.samples, ...next.samples].map((s) => [s.checkedAt, s])).values(),
  ]
    .sort((a, b) => b.checkedAt.localeCompare(a.checkedAt))
    .slice(0, 1000);
  return { history: { ...next, samples }, reset: false };
}
export function healthExport(s: HealthOverview, freshness: Freshness, now = Date.now()) {
  return {
    protocolVersion: s.protocolVersion,
    checkedAt: s.checkedAt,
    runtimeMode: s.runtimeMode,
    runtimeStatus: s.runtimeStatus,
    decisionScope: s.decisionScope,
    releaseReady: s.releaseReady,
    releaseGate: {
      environmentEligible: s.releaseGate.environmentEligible,
      configurationReady: s.releaseGate.configurationReady,
      runtimeReady: s.releaseGate.runtimeReady,
      monitoringComplete: s.releaseGate.monitoringComplete,
    },
    diagnosticAggregationDurationMs: s.diagnosticAggregationDurationMs,
    api: {
      status: s.api.status,
      livenessDurationMs: s.api.livenessDurationMs,
      uptimeSeconds: s.api.uptimeSeconds,
    },
    components: s.components.map((c) => ({
      id: c.id,
      status: c.status,
      optional: c.optional,
      checkedAt: c.checkedAt,
      evidenceKind: c.evidenceKind,
      probeVersion: c.probeVersion,
      operational: c.operational,
      latencyMs: c.latencyMs,
      capabilityStatus: c.capabilityStatus,
      error: c.error,
      details: c.details,
    })),
    coverage: {
      expected: s.coverage.expected,
      monitored: s.coverage.monitored,
      missingProbes: s.coverage.missingProbes,
      extraProbes: s.coverage.extraProbes,
      requiredUnverified: s.coverage.requiredUnverified,
      expectedCount: s.coverage.expectedCount,
      matchedCount: s.coverage.matchedCount,
      extraCount: s.coverage.extraCount,
      missingCount: s.coverage.missingCount,
      operationalCount: s.coverage.operationalCount,
      testedCoverage: s.coverage.testedCoverage,
    },
    productionReadiness: {
      ready: s.productionReadiness.ready,
      blockerCount: s.productionReadiness.blockerCount,
      warningCount: s.productionReadiness.warningCount,
      checkedAt: s.productionReadiness.checkedAt,
      findings: s.productionReadiness.findings.map((f) => ({
        id: f.id,
        severity: f.severity,
        area: f.area,
        message: f.message,
        recommendation: f.recommendation,
      })),
    },
    observationStale: freshness !== 'FRESH',
    evidenceFreshness: freshness,
    exportedAt: new Date(now).toISOString(),
    limits:
      'Snapshot diagnostics only; no continuous monitoring, user-impact measurement, SLO or deployment approval.',
  };
}
