export type HealthStatus = 'UP' | 'DEGRADED' | 'DOWN' | 'UNKNOWN';
export type HealthComponent = {
  id: string;
  status: HealthStatus;
  optional: boolean;
  checkedAt: string;
  evidenceKind: string;
  probeVersion: number;
  operational: boolean;
  latencyMs?: number;
  capabilityStatus?: string;
  error?: string;
  details: Record<string, unknown>;
};
export type HealthFinding = {
  id: string;
  severity: 'BLOCKER' | 'WARNING' | 'INFO';
  area: string;
  message: string;
  recommendation: string;
};
export interface HealthOverview {
  protocolVersion: 2;
  checkedAt: string;
  runtimeMode: string;
  runtimeStatus: HealthStatus;
  decisionScope: string;
  releaseReady: boolean;
  releaseGate: {
    environmentEligible: boolean;
    configurationReady: boolean;
    runtimeReady: boolean;
    monitoringComplete: boolean;
  };
  diagnosticAggregationDurationMs: number;
  api: { status: HealthStatus; livenessDurationMs: number; uptimeSeconds: number };
  summary: {
    up: number;
    degraded: number;
    down: number;
    unknown: number;
    productionBlockers: number;
    productionWarnings: number;
    monitoredComponents: number;
    missingProbes: number;
  };
  components: HealthComponent[];
  coverage: {
    expected: string[];
    monitored: string[];
    missingProbes: string[];
    extraProbes: string[];
    requiredUnverified: string[];
    expectedCount: number;
    matchedCount: number;
    extraCount: number;
    missingCount: number;
    operationalCount: number;
    testedCoverage: string;
  };
  productionReadiness: {
    ready: boolean;
    blockerCount: number;
    warningCount: number;
    checkedAt: string;
    findings: HealthFinding[];
  };
}
const object = (x: unknown): x is Record<string, unknown> =>
  Boolean(x && typeof x === 'object' && !Array.isArray(x));
const status = (x: unknown) => ['UP', 'DOWN', 'DEGRADED', 'UNKNOWN'].includes(String(x));
const time = (x: unknown) => typeof x === 'string' && Number.isFinite(Date.parse(x));
const number = (x: unknown) => typeof x === 'number' && Number.isFinite(x) && x >= 0;
const strings = (x: unknown): x is string[] =>
  Array.isArray(x) && x.length <= 100 && x.every((v) => typeof v === 'string' && v.length <= 128);
/** Additive-safe v2 parser: unknown probes are allowed, incomplete/skewed contracts are rejected. */
export function parseHealthOverview(value: unknown): HealthOverview {
  const fail = (): never => {
    throw new Error('SCHEMA_MISMATCH');
  };
  if (
    !object(value) ||
    value.protocolVersion !== 2 ||
    !time(value.checkedAt) ||
    !status(value.runtimeStatus) ||
    typeof value.runtimeMode !== 'string' ||
    typeof value.decisionScope !== 'string' ||
    typeof value.releaseReady !== 'boolean' ||
    !number(value.diagnosticAggregationDurationMs)
  )
    return fail();
  const { releaseGate, api, coverage, summary, components, productionReadiness: report } = value;
  if (
    !object(releaseGate) ||
    !['environmentEligible', 'configurationReady', 'runtimeReady', 'monitoringComplete'].every(
      (k) => typeof releaseGate[k] === 'boolean',
    )
  )
    return fail();
  if (
    !object(api) ||
    !status(api.status) ||
    !number(api.livenessDurationMs) ||
    !number(api.uptimeSeconds)
  )
    return fail();
  if (
    !object(summary) ||
    ![
      'up',
      'degraded',
      'down',
      'unknown',
      'productionBlockers',
      'productionWarnings',
      'monitoredComponents',
      'missingProbes',
    ].every((k) => number(summary[k]))
  )
    return fail();
  if (
    !object(coverage) ||
    !['expected', 'monitored', 'missingProbes', 'extraProbes', 'requiredUnverified'].every((k) =>
      strings(coverage[k]),
    ) ||
    !['expectedCount', 'matchedCount', 'extraCount', 'missingCount', 'operationalCount'].every(
      (k) => number(coverage[k]),
    ) ||
    typeof coverage.testedCoverage !== 'string'
  )
    return fail();
  if (
    !Array.isArray(components) ||
    components.length > 100 ||
    !components.every(
      (c) =>
        object(c) &&
        typeof c.id === 'string' &&
        c.id.length <= 128 &&
        status(c.status) &&
        typeof c.optional === 'boolean' &&
        time(c.checkedAt) &&
        typeof c.operational === 'boolean' &&
        typeof c.evidenceKind === 'string' &&
        number(c.probeVersion) &&
        object(c.details) &&
        (c.error === undefined || typeof c.error === 'string') &&
        (c.latencyMs === undefined || number(c.latencyMs)),
    )
  )
    return fail();
  if (new Set(components.map((c) => c.id)).size !== components.length) return fail();
  if (
    !object(report) ||
    typeof report.ready !== 'boolean' ||
    !time(report.checkedAt) ||
    !number(report.blockerCount) ||
    !number(report.warningCount) ||
    !Array.isArray(report.findings) ||
    report.findings.length > 100 ||
    !report.findings.every(
      (f) =>
        object(f) &&
        ['BLOCKER', 'WARNING', 'INFO'].includes(String(f.severity)) &&
        ['id', 'area', 'message', 'recommendation'].every((k) => typeof f[k] === 'string'),
    )
  )
    return fail();
  const expected = coverage.expected as string[],
    monitored = coverage.monitored as string[];
  const missing = expected.filter((id) => !monitored.includes(id));
  const extra = monitored.filter((id) => !expected.includes(id));
  const sameIds = (a: string[], b: string[]) =>
    a.length === b.length && a.every((id) => b.includes(id));
  if (
    !['expected', 'monitored', 'missingProbes', 'extraProbes', 'requiredUnverified'].every(
      (key) => {
        const ids = coverage[key] as string[];
        return new Set(ids).size === ids.length;
      },
    ) ||
    !sameIds(
      monitored,
      components.map((c) => c.id),
    ) ||
    !sameIds(coverage.missingProbes as string[], missing) ||
    !sameIds(coverage.extraProbes as string[], extra) ||
    !sameIds(
      coverage.requiredUnverified as string[],
      components.filter((c) => !c.optional && !c.operational).map((c) => c.id),
    ) ||
    coverage.expectedCount !== expected.length ||
    coverage.matchedCount !== monitored.length - extra.length ||
    coverage.extraCount !== extra.length ||
    coverage.missingCount !== missing.length ||
    coverage.operationalCount !== components.filter((c) => c.operational).length ||
    summary.monitoredComponents !== coverage.matchedCount ||
    summary.missingProbes !== missing.length
  )
    return fail();
  if (
    value.releaseReady &&
    (!Object.values(releaseGate).every((v) => v === true) ||
      report.ready !== true ||
      report.blockerCount !== 0 ||
      report.findings.some((f) => f.severity === 'BLOCKER') ||
      coverage.missingCount !== 0 ||
      (coverage.missingProbes as string[]).length !== 0 ||
      (coverage.requiredUnverified as string[]).length !== 0 ||
      coverage.matchedCount !== coverage.expectedCount ||
      value.runtimeMode !== 'production' ||
      value.runtimeStatus !== 'UP' ||
      components.some((c) => !c.optional && (c.status !== 'UP' || !c.operational)))
  )
    return fail();
  return value as unknown as HealthOverview;
}
