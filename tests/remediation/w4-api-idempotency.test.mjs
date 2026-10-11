import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

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
  const adminMount = adminIdempotencyMount(app);
  assert.match(adminMount, /createCanonicalIdempotencyMiddleware\(\{ store: apiIdempotencyStore, requireKey: true \}\)/);
  assert.match(app, /protectControlPlane[\s\S]*createCanonicalIdempotencyMiddleware/);
  assert.match(workspace, /AuthMiddleware[\s\S]*createCanonicalIdempotencyMiddleware/);
  assert.match(learner, /AuthMiddleware[\s\S]*createCanonicalIdempotencyMiddleware/);
});

function adminIdempotencyMount(app) {
  const source = ts.createSourceFile('app.ts', app, ts.ScriptTarget.Latest, true);
  const callbacks = [];
  function visit(node) {
    if (ts.isCallExpression(node) && node.expression.getText(source) === 'v1Router.use'
      && ts.isStringLiteral(node.arguments[0]) && node.arguments[0].text === '/admin'
      && node.arguments[1] && ts.isArrowFunction(node.arguments[1])
      && node.arguments[1].getText(source).includes('createCanonicalIdempotencyMiddleware')) {
      callbacks.push(node.arguments[1].getText(source));
    }
    ts.forEachChild(node, visit);
  }
  visit(source);
  assert.equal(callbacks.length, 1, 'Admin mutations must have one mounted idempotency boundary');
  return callbacks[0];
}

test('only exact student-tool test routes bypass generic plaintext replay custody', () => {
  const callback = adminIdempotencyMount(read('apps/api/src/app.ts'));
  const store = {};
  let canonicalCalls = 0;
  const middleware = runInNewContext(ts.transpileModule(`(${callback})`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
  }).outputText, {
    apiIdempotencyStore: store,
    createCanonicalIdempotencyMiddleware(input) {
      assert.equal(input.store, store);
      assert.equal(input.requireKey, true);
      return (_req, _res, next) => { canonicalCalls += 1; next(); };
    },
  });
  for (const [path, usesCanonical] of [
    ['/student-tools/gpa/test', false],
    ['/student-tools/gpa/test/', false],
    ['/student-tools/gpa', true],
    ['/student-tools/gpa/release', true],
    ['/student-tools/gpa/test/extra', true],
    ['/student-tools/gpa/testing', true],
    ['/student-tools/nested/gpa/test', true],
    ['/settings/test', true],
  ]) {
    canonicalCalls = 0;
    let nextCalls = 0;
    middleware({ path }, {}, () => { nextCalls += 1; });
    assert.equal(canonicalCalls, Number(usesCanonical), path);
    assert.equal(nextCalls, 1, path);
  }
});
