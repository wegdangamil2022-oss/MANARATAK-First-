const ALLOWED_PURPOSES = new Set([
  'provision',
  'migrate',
  'seed',
  'import',
  'backfill',
  'maintenance',
]);

const ALLOWED_ENVIRONMENTS = new Set(['development', 'test', 'staging', 'production']);

/**
 * Return the non-secret identity operators must confirm before a database mutation.
 * Example: postgresql://user:secret@db.internal:5432/manaratak -> db.internal:5432/manaratak
 */
export function databaseTargetIdentity(databaseUrl) {
  if (!databaseUrl || typeof databaseUrl !== 'string') {
    throw new Error('DATABASE_URL_NOT_CONFIGURED');
  }

  let parsed;
  try {
    parsed = new URL(databaseUrl);
  } catch {
    throw new Error('DATABASE_URL_INVALID');
  }

  if (parsed.protocol !== 'postgresql:' && parsed.protocol !== 'postgres:') {
    throw new Error('DATABASE_URL_MUST_BE_POSTGRESQL');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, '')).trim();
  if (!parsed.hostname || !databaseName) {
    throw new Error('DATABASE_URL_MISSING_TARGET_IDENTITY');
  }

  const port = parsed.port || '5432';
  return `${parsed.hostname.toLowerCase()}:${port}/${databaseName}`;
}

export function inspectDatabaseMutationGate(operation, options = {}, env = process.env) {
  const errors = [];
  const expectedPurposes = new Set(options.allowedPurposes ?? []);
  const runtimeEnvironment = env.NODE_ENV || 'development';
  const declaredEnvironment = env.DATABASE_MUTATION_ENVIRONMENT || '';
  const declaredPurpose = env.DATABASE_MUTATION_PURPOSE || '';

  if (env.DATABASE_PROVISIONING_GATE !== 'APPROVED') {
    errors.push('DATABASE_PROVISIONING_GATE must equal APPROVED');
  }
  if (env.ALLOW_DATABASE_MUTATIONS !== 'YES') {
    errors.push('ALLOW_DATABASE_MUTATIONS must equal YES');
  }

  if (!ALLOWED_ENVIRONMENTS.has(declaredEnvironment)) {
    errors.push('DATABASE_MUTATION_ENVIRONMENT must be one of development|test|staging|production');
  }
  if (!ALLOWED_ENVIRONMENTS.has(runtimeEnvironment)) {
    errors.push(`NODE_ENV ${runtimeEnvironment || '(empty)'} is not a supported mutation environment`);
  }
  if (declaredEnvironment && declaredEnvironment !== runtimeEnvironment) {
    errors.push(`DATABASE_MUTATION_ENVIRONMENT=${declaredEnvironment} does not match NODE_ENV=${runtimeEnvironment}`);
  }

  if (!ALLOWED_PURPOSES.has(declaredPurpose)) {
    errors.push('DATABASE_MUTATION_PURPOSE must be one of provision|migrate|seed|import|backfill|maintenance');
  } else if (expectedPurposes.size > 0 && !expectedPurposes.has(declaredPurpose)) {
    errors.push(`DATABASE_MUTATION_PURPOSE=${declaredPurpose} is not allowed for ${operation}`);
  }

  let actualTarget = null;
  try {
    actualTarget = databaseTargetIdentity(env.DATABASE_URL);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
  }

  if (!env.DATABASE_MUTATION_TARGET) {
    errors.push('DATABASE_MUTATION_TARGET is required and must confirm host:port/database');
  } else if (actualTarget && env.DATABASE_MUTATION_TARGET !== actualTarget) {
    errors.push(`DATABASE_MUTATION_TARGET does not match DATABASE_URL target (${actualTarget})`);
  }

  const productionLike = declaredEnvironment === 'production' || declaredEnvironment === 'staging';
  if (productionLike && actualTarget && /^(localhost|127\.0\.0\.1|::1):/i.test(actualTarget)) {
    errors.push('production/staging database mutations cannot target a loopback database');
  }

  if (declaredEnvironment === 'production') {
    if (env.ALLOW_PRODUCTION_DATABASE_MUTATIONS !== 'YES') {
      errors.push('ALLOW_PRODUCTION_DATABASE_MUTATIONS=YES is required for production mutations');
    }
    if (!env.DATABASE_PRODUCTION_CHANGE_ID?.trim()) {
      errors.push('DATABASE_PRODUCTION_CHANGE_ID is required for production mutations');
    }
  }

  return {
    ok: errors.length === 0,
    operation,
    purpose: declaredPurpose || null,
    environment: declaredEnvironment || null,
    target: actualTarget,
    errors,
  };
}

export function requireDatabaseMutationGate(operation, options = {}, env = process.env) {
  const result = inspectDatabaseMutationGate(operation, options, env);
  if (!result.ok) {
    throw new Error(`DATABASE_MUTATION_BLOCKED: ${operation}: ${result.errors.join('; ')}`);
  }
  return result;
}
