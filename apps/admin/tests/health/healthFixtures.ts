import type { HealthOverview } from '../../src/features/health/HealthOverviewContract';
export function healthSnapshot(): HealthOverview {
  const checkedAt = new Date().toISOString();
  return {
    protocolVersion: 2,
    checkedAt,
    runtimeMode: 'production',
    runtimeStatus: 'UP',
    decisionScope: 'LAST-GOOD-SNAPSHOT',
    releaseReady: true,
    releaseGate: {
      environmentEligible: true,
      configurationReady: true,
      runtimeReady: true,
      monitoringComplete: true,
    },
    diagnosticAggregationDurationMs: 1,
    api: { status: 'UP', livenessDurationMs: 0, uptimeSeconds: 1 },
    summary: {
      up: 1,
      degraded: 0,
      down: 0,
      unknown: 0,
      productionBlockers: 0,
      productionWarnings: 0,
      monitoredComponents: 1,
      missingProbes: 0,
    },
    components: [
      {
        id: 'database',
        status: 'UP',
        optional: false,
        checkedAt,
        evidenceKind: 'READ_ONLY_OPERATION',
        probeVersion: 1,
        operational: true,
        details: {},
      },
    ],
    coverage: {
      expected: ['database'],
      monitored: ['database'],
      missingProbes: [],
      extraProbes: [],
      requiredUnverified: [],
      expectedCount: 1,
      matchedCount: 1,
      extraCount: 0,
      missingCount: 0,
      operationalCount: 1,
      testedCoverage: 'NOT_ATTESTED',
    },
    productionReadiness: { ready: true, blockerCount: 0, warningCount: 0, checkedAt, findings: [] },
  };
}
