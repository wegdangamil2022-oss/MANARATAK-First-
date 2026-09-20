import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');

test('canonical API idempotency persists a request fingerprint and fenced terminal response', () => {
  const store = read('packages/infrastructure/src/api-foundation/PrismaApiIdempotencyStore.ts');
  assert.match(store, /requestFingerprint/);
  assert.match(store, /state: 'PROCESSING'/);
  assert.match(store, /state === 'COMPLETED'/);
  assert.match(store, /leaseToken/);
  assert.match(store, /updateMany/);
  assert.match(store, /API_IDEMPOTENCY_STALE_LEASE_COMPLETION_REJECTED/);
});

test('same-key replay and different-payload conflict are explicit terminal decisions', () => {
  const middleware = read('apps/api/src/presentation/middleware/CanonicalIdempotencyMiddleware.ts');
  assert.match(middleware, /decision\.kind === 'REPLAY'/);
  assert.match(middleware, /Idempotency-Replayed/);
  assert.match(middleware, /decision\.kind === 'CONFLICT'/);
  assert.match(middleware, /IDEMPOTENCY_KEY_PAYLOAD_CONFLICT/);
  assert.match(middleware, /decision\.kind === 'IN_PROGRESS'/);
});

test('principal-scoped command identity covers admin, control-plane and student mutation surfaces', () => {
  const app = read('apps/api/src/app.ts');
  const workspace = read('apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts');
  const learner = read('apps/api/src/presentation/api/router/CourseLearnerRouter.ts');
  assert.match(app, /v1Router\.use\('\/admin', createCanonicalIdempotencyMiddleware/);
  assert.match(app, /protectControlPlane[\s\S]*createCanonicalIdempotencyMiddleware/);
  assert.match(workspace, /AuthMiddleware[\s\S]*createCanonicalIdempotencyMiddleware/);
  assert.match(learner, /AuthMiddleware[\s\S]*createCanonicalIdempotencyMiddleware/);
});
