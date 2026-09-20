import { databaseTargetIdentity } from './database-mutation-gate.mjs';

const LOOPBACK_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

export function inspectDisposableDatabaseTarget(operation, env = process.env) {
  const errors = [];
  const runtimeEnvironment = (env.NODE_ENV || 'development').toLowerCase();
  if (runtimeEnvironment === 'production' || runtimeEnvironment === 'staging') {
    errors.push(`NODE_ENV=${runtimeEnvironment} is forbidden for disposable Prisma mutations`);
  }
  if (env.DATABASE_TARGET_CLASS !== 'DISPOSABLE') errors.push('DATABASE_TARGET_CLASS must equal DISPOSABLE');
  if (env.ALLOW_DISPOSABLE_DB_MUTATIONS !== 'YES') errors.push('ALLOW_DISPOSABLE_DB_MUTATIONS must equal YES');

  let target = null;
  let hostname = null;
  try {
    target = databaseTargetIdentity(env.DATABASE_URL);
    hostname = new URL(env.DATABASE_URL).hostname.toLowerCase();
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  const remoteCiApproved = env.CI === 'true' && env.DATABASE_DISPOSABLE_REMOTE_APPROVED === 'YES';
  if (hostname && !LOOPBACK_HOSTS.has(hostname) && !remoteCiApproved) {
    errors.push(`Disposable Prisma mutations require loopback target unless explicit CI remote approval is present (${hostname})`);
  }
  if (!env.DATABASE_DISPOSABLE_CONFIRM_TARGET) {
    errors.push('DATABASE_DISPOSABLE_CONFIRM_TARGET is required');
  } else if (target && env.DATABASE_DISPOSABLE_CONFIRM_TARGET !== target) {
    errors.push(`DATABASE_DISPOSABLE_CONFIRM_TARGET does not match DATABASE_URL target (${target})`);
  }

  return { ok: errors.length === 0, operation, environment: runtimeEnvironment, target, errors };
}

export function requireDisposableDatabaseTarget(operation, env = process.env) {
  const result = inspectDisposableDatabaseTarget(operation, env);
  if (!result.ok) throw new Error(`DISPOSABLE_DATABASE_MUTATION_BLOCKED: ${operation}: ${result.errors.join('; ')}`);
  return result;
}
