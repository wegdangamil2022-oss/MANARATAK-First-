// Semantic source/security regressions with synthetic owners/providers; no live runtime proof.
import { spawnSync } from 'node:child_process';
const result = spawnSync(
  process.execPath,
  [
    'node_modules/vitest/vitest.mjs',
    'run',
    '--config', 'vitest.health.config.ts',
    'tests/monitoring/section25.spec.ts',
  'packages/config/tests/ProductionReadinessValidator.spec.ts',
    'apps/api/tests/presentation/api/router/MonitoringRouter.spec.ts',
    'apps/api/tests/presentation/monitoring/HealthMonitoring.spec.ts',
  ],
  { stdio: 'inherit' },
);
if (result.error) {
  console.error('HEALTH_SOURCE_CHECK_START_FAILED');
  process.exit(1);
}
process.exit(result.status ?? 1);
