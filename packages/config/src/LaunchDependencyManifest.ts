/** Deployment scope policy; optionality never grants access or disables owner routes. */
export const launchDependencyManifestVersion = 1;
export const operationalProbeIds = [
  'database',
  'redis',
  'asset-platform',
  'import-foundation',
  'admin-auth',
  'ai-providers',
  'payment-gateway',
  'notifications',
  'background-jobs',
  'student-tools-quota',
  'database-schema',
  'public-web',
  'runtime-lifecycle',
  'telemetry-exporter',
  'polling-workers',
  'asset-reference-integrity',
] as const;
export function launchDependencyManifest(config: Record<string, unknown>) {
  const production = ['production', 'staging'].includes(String(config.NODE_ENV));
  return operationalProbeIds.map((id) => ({
    id,
    version: launchDependencyManifestVersion,
    requirement:
      id === 'ai-providers'
        ? 'OPTIONAL'
        : id === 'database' ||
            id === 'runtime-lifecycle' ||
            id === 'asset-reference-integrity' ||
            production
          ? 'REQUIRED'
          : 'OPTIONAL',
    evidenceRequired:
      id === 'database-schema' ? 'APPLIED_MIGRATION_HISTORY_ONLY' : 'FRESH_OWNER_OPERATION',
  }));
}
