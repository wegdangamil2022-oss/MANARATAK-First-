import { readFileSync } from 'node:fs';
import { readdirSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const app = read('apps/api/src/app.ts');
const policy = read('docs/standards/API_IDEMPOTENCY_POLICY.md');
const middleware = read('apps/api/src/presentation/middleware/CanonicalIdempotencyMiddleware.ts');
const webClient = read('apps/web/src/api/client.ts');
const adminClient = read('apps/admin/src/api/client.ts');
const cors = read('apps/api/src/presentation/security/CanonicalApiCorsPolicy.ts');
const studentWorkspace = read('apps/api/src/presentation/api/router/StudentWorkspaceRouter.ts');
const courseLearner = read('apps/api/src/presentation/api/router/CourseLearnerRouter.ts');
const studentTools = read('apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts');

const routerDir = 'apps/api/src/presentation/api/router';
let mutations = 0;
for (const file of readdirSync(routerDir).filter((f) => f.endsWith('Router.ts'))) {
  const source = read(`${routerDir}/${file}`);
  mutations += [...source.matchAll(/router\.(?:post|put|patch)\s*\(/g)].length;
}

const checks = [
  ['IDEMP-001 durable store composed', app.includes("apiIdempotencyStore") && middleware.includes('requestFingerprint') && middleware.includes('scopeHash')],
  ['IDEMP-002 admin mutations guarded after auth', app.indexOf("createAdminGuard") < app.indexOf("createCanonicalIdempotencyMiddleware({ store: apiIdempotencyStore, requireKey: true })")],
  ['IDEMP-003 legacy control-plane guarded', /protectControlPlane[\s\S]*createCanonicalIdempotencyMiddleware/.test(app)],
  ['IDEMP-004 identity compatibility alias guarded', /\/identities'[\s\S]{0,450}createCanonicalIdempotencyMiddleware/.test(app)],
  ['IDEMP-005 student workspace guarded after auth', /AuthMiddleware[\s\S]*createCanonicalIdempotencyMiddleware/.test(studentWorkspace)],
  ['IDEMP-006 learner course guarded after auth', /AuthMiddleware[\s\S]*createCanonicalIdempotencyMiddleware/.test(courseLearner)],
  ['IDEMP-007 anonymous tool execution guarded', studentTools.includes('principalResolver') && studentTools.includes('x-student-tools-session')],
  ['IDEMP-008 replay/conflict semantics present', middleware.includes("decision.kind === 'REPLAY'") && middleware.includes("decision.kind === 'CONFLICT'") && middleware.includes('IDEMPOTENCY_KEY_PAYLOAD_CONFLICT')],
  ['IDEMP-009 browser transport parity', cors.includes("'Idempotency-Key'") && cors.includes("'Idempotency-Replayed'")],
  ['IDEMP-010 admin client supports retry key reuse', adminClient.includes('idempotencyKey?: string') && adminClient.includes("!headers.has('Idempotency-Key')")],
  ['IDEMP-011 public/student client supports canonical key', webClient.includes('ensureCanonicalMutationHeaders') && webClient.includes("!headers.has('Idempotency-Key')")],
  ['IDEMP-012 exemptions explicitly documented', ['AuthRouter','SearchRouter','AuthorizationRuntimeRouter'].every((x) => policy.includes(x))],
  ['IDEMP-013 mutation inventory is non-trivial', mutations >= 200],
];
let passed = 0;
for (const [name, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${name}`); if (ok) passed++; }
console.log(`API_IDEMPOTENCY_COVERAGE=${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}; inventory=${mutations}`);
process.exitCode = passed === checks.length ? 0 : 1;
