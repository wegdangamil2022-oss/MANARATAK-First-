import assert from 'node:assert/strict';
import test from 'node:test';
import {
  databaseTargetIdentity,
  inspectDatabaseMutationGate,
  requireDatabaseMutationGate,
} from '../../scripts/lib/database-mutation-gate.mjs';

const baseEnv = {
  NODE_ENV: 'development',
  DATABASE_URL: 'postgresql://operator:secret@localhost:5432/manaratak_dev',
  DATABASE_PROVISIONING_GATE: 'APPROVED',
  ALLOW_DATABASE_MUTATIONS: 'YES',
  DATABASE_MUTATION_ENVIRONMENT: 'development',
  DATABASE_MUTATION_PURPOSE: 'seed',
  DATABASE_MUTATION_TARGET: 'localhost:5432/manaratak_dev',
};

test('derives a non-secret target identity from PostgreSQL URLs', () => {
  assert.equal(
    databaseTargetIdentity('postgresql://user:secret@DB.EXAMPLE:6432/manaratak?sslmode=require'),
    'db.example:6432/manaratak',
  );
});

test('fails closed without provisioning approval', () => {
  const result = inspectDatabaseMutationGate('seed-taxonomy', { allowedPurposes: ['seed'] }, {
    ...baseEnv,
    DATABASE_PROVISIONING_GATE: 'PENDING',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /DATABASE_PROVISIONING_GATE/);
});

test('fails closed when the declared target does not match DATABASE_URL', () => {
  const result = inspectDatabaseMutationGate('seed-taxonomy', { allowedPurposes: ['seed'] }, {
    ...baseEnv,
    DATABASE_MUTATION_TARGET: 'db.example:5432/other',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /does not match DATABASE_URL target/);
});

test('separates provisioning/migration from seed operations', () => {
  const result = inspectDatabaseMutationGate('db-remediation-deploy', { allowedPurposes: ['provision', 'migrate'] }, {
    ...baseEnv,
    DATABASE_MUTATION_PURPOSE: 'seed',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /not allowed/);
});

test('permits an explicitly confirmed development mutation', () => {
  assert.doesNotThrow(() => requireDatabaseMutationGate('seed-taxonomy', { allowedPurposes: ['seed'] }, baseEnv));
});

test('production mutations require a separate production authorization and change id', () => {
  const productionEnv = {
    ...baseEnv,
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://operator:secret@db.prod.internal:5432/manaratak',
    DATABASE_MUTATION_ENVIRONMENT: 'production',
    DATABASE_MUTATION_PURPOSE: 'migrate',
    DATABASE_MUTATION_TARGET: 'db.prod.internal:5432/manaratak',
  };
  const blocked = inspectDatabaseMutationGate('db-remediation-deploy', { allowedPurposes: ['migrate'] }, productionEnv);
  assert.equal(blocked.ok, false);
  assert.match(blocked.errors.join(' '), /ALLOW_PRODUCTION_DATABASE_MUTATIONS/);
  assert.match(blocked.errors.join(' '), /DATABASE_PRODUCTION_CHANGE_ID/);

  const allowed = inspectDatabaseMutationGate('db-remediation-deploy', { allowedPurposes: ['migrate'] }, {
    ...productionEnv,
    ALLOW_PRODUCTION_DATABASE_MUTATIONS: 'YES',
    DATABASE_PRODUCTION_CHANGE_ID: 'CHG-2026-0001',
  });
  assert.equal(allowed.ok, true);
});

test('production/staging cannot point mutation approval at loopback', () => {
  const result = inspectDatabaseMutationGate('db-remediation-deploy', { allowedPurposes: ['migrate'] }, {
    ...baseEnv,
    NODE_ENV: 'staging',
    DATABASE_MUTATION_ENVIRONMENT: 'staging',
    DATABASE_MUTATION_PURPOSE: 'migrate',
  });
  assert.equal(result.ok, false);
  assert.match(result.errors.join(' '), /loopback/);
});
