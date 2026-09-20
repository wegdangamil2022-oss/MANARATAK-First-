import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const read = rel => readFileSync(join(root, rel), 'utf8');

const provisioning = read('packages/application/src/identity/ProvisionIdentityUseCase.ts');
const mapper = read('packages/application/src/identity/mapper.ts');
const dtos = read('packages/application/src/identity/dtos.ts');
const router = read('apps/api/src/presentation/api/router/IdentityRouter.ts');
const schemas = read('apps/api/src/presentation/validation/StrictControlPlaneSchemas.ts');

test('identity provisioning and mapper participate in TypeScript verification', () => {
  for (const source of [provisioning, mapper]) {
    assert.doesNotMatch(source, /@ts-nocheck|@ts-ignore/);
    assert.doesNotMatch(source, /\bas any\b|:\s*any\b|<any>/);
  }
  assert.match(provisioning, /catch \(error: unknown\)/);
  assert.match(mapper, /IdentityDto\['technicalMetadata'\]/);
});

test('identity provisioning actor metadata is server-owned', () => {
  const provisionInput = dtos.match(/export interface ProvisionIdentityInput \{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(provisionInput, /createdBy:\s*string/);
  assert.doesNotMatch(provisionInput, /technicalMetadata/);
  const provisionSchema = schemas.match(/export const identityProvisionSchema = z\.object\(\{([\s\S]*?)\}\)\.strict\(\);/)?.[1] ?? '';
  assert.ok(provisionSchema.length > 0, 'identityProvisionSchema must remain explicit and strict');
  assert.doesNotMatch(provisionSchema, /createdBy|technicalMetadata/);
  assert.match(router, /if \(!req\.authUserId\) throw new Error\('AUTHENTICATED_ADMIN_ACTOR_REQUIRED'\)/);
  assert.match(router, /execute\(\{ \.\.\.body, createdBy: req\.authUserId \}\)/);
});

test('identity mapper exhaustively maps human profile/contact and serializes metadata dates', () => {
  assert.match(mapper, /identity\.type === IdentityType\.Human && identity\.user/);
  assert.match(mapper, /contactRegistry:/);
  assert.match(mapper, /createdAt\.toISOString\(\)/);
  assert.match(mapper, /updatedAt\.toISOString\(\)/);
  assert.match(mapper, /deletedAt\.toISOString\(\)/);
  assert.doesNotMatch(router, /\(val as any\)/);
});
