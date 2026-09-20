import { readFileSync } from 'node:fs';

const read = (p) => readFileSync(p, 'utf8');
const optional = read('apps/api/src/presentation/middleware/OptionalAuthMiddleware.ts');
const app = read('apps/api/src/app.ts');
const router = read('apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts');
const useCases = read('packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts');
const principal = read('apps/api/src/presentation/security/AuthenticatedPrincipal.ts');

const checks = [
  ['W5-0107-OPTIONAL-AUTH-BOUNDARY', optional.includes('export class OptionalAuthMiddleware') && optional.includes('if (!token) return next()')],
  ['W5-0107-FAIL-CLOSED-PRESENTED-CREDENTIAL', optional.includes("AUTHENTICATION_INVALID") && optional.includes('verifyAccessToken(token)')],
  ['W5-0107-SESSION-LIFECYCLE', optional.includes('isSessionActive(payload.userId, payload.sessionId)') && optional.includes('isAuthenticationAllowed(payload.userId)')],
  ['W5-0107-REVOCATION-ON-DENIED-PRINCIPAL', optional.includes('revokeAllSessions(payload.userId)')],
  ['W5-0107-COMPOSITION', app.includes("'/public/student-tools',") && app.includes('new OptionalAuthMiddleware(adminTokenProvider, adminSessionManager, principalAccessValidator).generate()')],
  ['W5-0107-TYPED-PRINCIPAL-CONTRACT', principal.includes('getAuthenticatedPrincipal') && principal.includes('req.authUserId?.trim()')],
  ['W5-0107-AUTHENTICATED-EXECUTION', router.includes("consumerType: authenticated ? 'AUTHENTICATED_STUDENT' : 'ANONYMOUS'")],
  ['W5-0107-AUTHENTICATED-SAVE', router.includes('saveExecutionForStudent') && router.includes('if (!req.authUserId)')],
  ['W5-0107-EXPLICIT-CLAIM-ROUTE', router.includes("'/executions/:executionId/claim'") && router.includes('x-student-tools-session')],
  ['W5-0107-CLAIM-VERIFIES-ANON-SESSION', router.includes('studentToolAnonymousSessionService.resolve') && router.includes('claimAnonymousExecutionForStudent')],
  ['W5-0107-PROVENANCE-PRESERVED', useCases.includes('The original execution remains classified as ANONYMOUS') && useCases.includes("fromConsumerType: 'ANONYMOUS' as const")],
  ['W5-0107-CROSS-REQUESTER-DENIAL', useCases.includes('record.consumerType !== requester.consumerType') && useCases.includes('actual === expected ? record : null')],
];
let passed = 0;
for (const [id, ok] of checks) { console.log(`${ok ? 'PASS' : 'FAIL'} ${id}`); if (ok) passed++; }
console.log(`W5_0107_SOURCE=${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
process.exitCode = passed === checks.length ? 0 : 1;
