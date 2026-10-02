import { createHash } from 'node:crypto';

/** Immutable, individually reviewed legacy metadata lives outside historical SQL. */
export function validateMigrationMetadata(name, sql, manifest) {
  const exception = manifest.historicalMigrationMetadataExceptions?.[name];
  if (exception) {
    const errors = [];
    if (!/^[a-f0-9]{64}$/.test(exception.sha256 ?? '') ||
        createHash('sha256').update(sql).digest('hex') !== exception.sha256) {
      errors.push(`historical migration ${name} checksum differs from immutable metadata exception`);
    }
    const owners = new Set(['cross_context', ...Object.values(manifest.models)]);
    if (!owners.has(exception.owner) || !['owner_only', 'cross_context_approved'].includes(exception.scope) ||
        exception.decision !== 'ADR-028' || typeof exception.reason !== 'string' || !exception.reason.trim() ||
        typeof exception.reviewReference !== 'string' || !exception.reviewReference.trim()) {
      errors.push(`historical migration ${name} has invalid sidecar ownership metadata`);
    }
    return errors;
  }
  const errors = [];
  if (!/^-- MANARATAK_MIGRATION_OWNER: [^\r\n]+$/m.test(sql)) errors.push(`new migration ${name} missing MANARATAK_MIGRATION_OWNER`);
  if (!/^-- MANARATAK_MIGRATION_SCOPE: (?:owner_only|cross_context_approved)\r?$/m.test(sql)) errors.push(`new migration ${name} missing/invalid MANARATAK_MIGRATION_SCOPE`);
  if (!/^-- MANARATAK_ARCH_DECISION: ADR-028\r?$/m.test(sql)) errors.push(`new migration ${name} missing ADR-028 decision marker`);
  return errors;
}
