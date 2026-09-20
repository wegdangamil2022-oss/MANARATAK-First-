import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const evaluator = read('packages/infrastructure/src/authorization/DefaultPolicyEvaluator.ts');
const authorizationEvaluator = read('packages/domain/src/authorization/services/AuthorizationEvaluatorService.ts');
check('P5-AUTH-001 evaluator no longer unconditional allow', !/evaluate\([^)]*\)[\s\S]{0,200}return AccessDecision\.granted\('Policy rule satisfied'\)/.test(evaluator));
check('P5-AUTH-001 supports TIME policy', evaluator.includes("case 'TIME':"));
check('P5-AUTH-001 supports IP policy', evaluator.includes("case 'IP':"));
check('P5-AUTH-001 unknown rules fail closed', evaluator.includes('Unsupported policy rule type'));
check('P5-AUTH-001 dangling policy references fail closed', authorizationEvaluator.includes('Referenced policy not found'));

const middleware = read('apps/api/src/presentation/security/SecurityMiddlewareFactory.ts');
check('P5-AUTH-001 request IP enters policy context', middleware.includes("ip: req.ip || req.socket?.remoteAddress || undefined"));

const app = read('apps/api/src/app.ts');
for (const route of ['/authorization', '/settings', '/files', '/notifications', '/cache', '/background-jobs', '/workflows', '/api-services', '/shared-components', '/enterprise-events']) {
  const escaped = route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  check(`P5-SEC-002 ${route} protected`, new RegExp(`v1Router\\.use\\('${escaped}', \\.\\.\\.protectControlPlane`).test(app));
}
check('P5-SEC-002 control-plane mutation audit enabled', app.includes("new MutationAuditMiddleware(auditRecordRepository, 'CONTROL_PLANE').generate()"));

for (const dir of ['packages/application/src', 'packages/infrastructure/src']) {
  const stack = [path.join(root, dir)];
  let directEnv = false;
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else if (/\.(ts|tsx|js|mjs)$/.test(entry.name) && /process\.env|import\.meta\.env/.test(fs.readFileSync(full, 'utf8'))) directEnv = true;
    }
  }
  check(`P3-CONFIG-001 no direct env reads under ${dir}`, !directEnv);
}

const settingsService = read('packages/domain/src/settings/services/ConfigurationResolutionService.ts');
const container = read('apps/api/src/infrastructure/di/container.ts');
check('P5-SET-003 settings repositories are required', !settingsService.includes('definitionRepo?:') && !settingsService.includes('assignmentRepo?:'));
check('P5-SET-003 explicit factory wiring', container.includes('new ConfigurationResolutionService(settingDefinitionRepo, settingAssignmentRepo)'));

check('P3-AUTH-001 Application JWT implementation removed', !exists('packages/application/src/auth/JwtTokenProvider.ts'));
check('P3-AUTH-001 Infrastructure JWT implementation exists', exists('packages/infrastructure/src/auth/JwtTokenProvider.ts'));
check('P3-AUTH-001 API imports JWT from Infrastructure', container.includes('JwtTokenProvider') && container.includes("from '@manaratak/infrastructure'"));

const jwtProvider = read('packages/infrastructure/src/auth/JwtTokenProvider.ts');
const appConfig = read('packages/config/src/AppConfig.ts');
const readiness = read('packages/config/src/ProductionReadinessValidator.ts');
const envExample = read('.env.example');
const authRouter = read('apps/api/src/presentation/api/router/AuthRouter.ts');
const authService = read('packages/application/src/auth/AuthService.ts');
const sessionManager = read('packages/infrastructure/src/auth/PrismaSessionManager.ts');
const sessionSchema = read('packages/infrastructure/prisma/schema.prisma');

check('MNT-AUD-0105 access JWT uses RS256', jwtProvider.includes("alg: 'RS256'") && jwtProvider.includes("crypto.sign('RSA-SHA256'") && jwtProvider.includes("crypto.verify('RSA-SHA256'"));
check('MNT-AUD-0105 HS256 removed from canonical provider', !jwtProvider.includes('HS256') && !jwtProvider.includes('createHmac'));
check('MNT-AUD-0105 opaque refresh uses CSPRNG', jwtProvider.includes('randomBytes(REFRESH_TOKEN_BYTES)') && jwtProvider.includes('REFRESH_TOKEN_PREFIX'));
check('MNT-AUD-0105 access TTL capped at 900', jwtProvider.includes('ACCESS_TOKEN_MAX_TTL_SECONDS = 15 * 60') && /max\(900\)\.default\(900\)/.test(appConfig));
check('MNT-AUD-0105 production asymmetric key custody enforced', readiness.includes('auth.jwt_private_key_required') && readiness.includes('auth.jwt_public_key_required') && readiness.includes('auth.access_token_ttl_invalid'));
check('MNT-AUD-0105 DI no longer reads JWT_SECRET', !container.includes('JWT_SECRET') && container.includes('JWT_PRIVATE_KEY_PEM') && container.includes('JWT_PUBLIC_KEY_PEM'));
check('MNT-AUD-0105 canonical env no JWT_SECRET', !/^JWT_SECRET=/m.test(envExample) && envExample.includes('JWT_ACTIVE_KEY_ID=') && envExample.includes('ACCESS_TOKEN_TTL_SECONDS=900'));
check('MNT-AUD-0105 JWKS endpoint published', authRouter.includes("router.get('/jwks.json'") && authRouter.includes('tokenProvider.getJwks'));
check('MNT-AUD-0105 key rotation runbook exists', exists('docs/operations/AUTH_TOKEN_KEY_ROTATION.md'));

check('MNT-AUD-0071 AuthService uses atomic rotation primitive', authService.includes('consumeAndRotateRefreshSession') && !authService.includes('isValidSession('));
check('MNT-AUD-0071 persistence rotation is transactional', sessionManager.includes('this.prisma.$transaction') && sessionManager.includes('consumed.count !== 1'));
check('MNT-AUD-0071 replay revokes session family', sessionManager.includes('familyId: parent.familyId') && sessionManager.includes('parent.rotatedAt'));
check('MNT-AUD-0071 schema has session lineage', /familyId\s+String/.test(sessionSchema) && /parentSessionId\s+String\?/.test(sessionSchema) && /rotatedAt\s+DateTime\?/.test(sessionSchema));
check('MNT-AUD-0071 migration authored', exists('packages/infrastructure/prisma/migrations/20260906194500_session_refresh_rotation_lineage/migration.sql'));

try {
  const authSourceTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/auth-token-remediation-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0105/0071 native source contract tests execute', /# fail 0/.test(authSourceTest));
} catch (error) {
  check('MNT-AUD-0105/0071 native source contract tests execute', false);
}


const suspendIdentity = read('packages/application/src/identity/SuspendIdentityUseCase.ts');
const archiveIdentity = read('packages/application/src/identity/ArchiveIdentityUseCase.ts');
const purgeIdentity = read('packages/application/src/identity/PurgeIdentityUseCase.ts');
const userAuthMiddleware = read('apps/api/src/presentation/middleware/AuthMiddleware.ts');
check('MNT-AUD-0076 suspend revokes sessions', suspendIdentity.includes('sessionManager.revokeAllSessions(input.identityId)'));
check('MNT-AUD-0076 archive revokes sessions', archiveIdentity.includes('sessionManager.revokeAllSessions(input.identityId)'));
check('MNT-AUD-0076 purge revokes sessions', purgeIdentity.includes('sessionManager.revokeAllSessions(input.identityId)'));
check('MNT-AUD-0076 refresh revalidates lifecycle', authService.includes('principalAccessValidator.isAuthenticationAllowed(currentSession.userId)') && authService.includes('principalAccessValidator.isAuthenticationAllowed(rotated.userId)'));
check('MNT-AUD-0076 learner auth revalidates lifecycle', userAuthMiddleware.includes('principalAccessValidator.isAuthenticationAllowed(payload.userId)') && userAuthMiddleware.includes('sessionManager.revokeAllSessions(payload.userId)'));
check('MNT-AUD-0065 control plane passes session and lifecycle dependencies', app.includes("createAdminGuard({ mode: adminAuthMode, tokenProvider: adminTokenProvider, sessionManager: adminSessionManager, principalAccessValidator })"));
check('MNT-AUD-0062 legacy AI route uses strict control-plane wrapper', app.includes("v1Router.use('/ai', ...protectControlPlane('admin:ai:manage', 'aiGatewayRouter'))"));
check('MNT-AUD-0062 canonical AI operator route inherits /admin boundary', app.includes("v1Router.use('/admin/ai/operator', requireAdminPermission('admin:ai:manage'), lazyRouter('aiGatewayRouter'))"));

try {
  const lifecycleSourceTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/auth-lifecycle-remediation-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0076/0065/0062 native source contract tests execute', /# fail 0/.test(lifecycleSourceTest));
} catch (error) {
  check('MNT-AUD-0076/0065/0062 native source contract tests execute', false);
}


const auditRouter = read('apps/api/src/presentation/api/router/AuditRouter.ts');
const auditRepository = read('packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts');
const auditHelper = read('apps/api/src/presentation/audit/AuditHelper.ts');
const mutationAudit = read('apps/api/src/presentation/audit/MutationAuditMiddleware.ts');
const authorizationAdminRouter = read('apps/api/src/presentation/api/router/AuthorizationAdminRouter.ts');
check('MNT-AUD-0110 audit HTTP surface is query-only', auditRouter.includes("router.get('/records'") && !auditRouter.includes("router.post('/records'"));
check('MNT-AUD-0110 Prisma audit persistence is insert-only', auditRepository.includes('auditRecord.create({ data })') && !auditRepository.includes('auditRecord.upsert'));
check('MNT-AUD-0110 duplicate evidence is rejected', auditRepository.includes('AUDIT_APPEND_ONLY_DUPLICATE'));
check('MNT-AUD-0106 AuditHelper uses canonical authenticated principal', auditHelper.includes('getAuthenticatedPrincipal(req)') && auditHelper.includes('AUDIT_AUTHENTICATED_PRINCIPAL_REQUIRED') && !auditHelper.includes('(req as any).user'));
check('MNT-AUD-0106 authorization mutation context requires authenticated principal', authorizationAdminRouter.includes('requireAuthenticatedPrincipal(req)') && !authorizationAdminRouter.includes("|| 'SYSTEM'"));
check('MNT-AUD-0084 Admin mutation policy defaults to audited', mutationAudit.includes("return 'STANDARD_AUDIT_REQUIRED';") && mutationAudit.includes("'/admin/cms'") && mutationAudit.includes("'/admin/finance'") && mutationAudit.includes("'/admin/services'"));

try {
  const auditSourceTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/audit-integrity-remediation-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0110/0106/0084 native source contract tests execute', /# fail 0/.test(auditSourceTest));
} catch (error) {
  check('MNT-AUD-0110/0106/0084 native source contract tests execute', false);
}

const strictSchemas = read('apps/api/src/presentation/validation/StrictControlPlaneSchemas.ts');
const studentToolsAdmin = read('apps/api/src/presentation/api/router/StudentToolsAdminRouter.ts');
const strictLegacyRouters = [
  'WorkflowRouter.ts',
  'ApiFoundationRouter.ts',
  'SharedComponentRouter.ts',
  'NotificationRouter.ts',
  'CacheRouter.ts',
  'BackgroundJobRouter.ts',
  'FileManagementRouter.ts',
];
check('MNT-AUD-0111 orphan central DTO bootstrap retired', !app.includes('new DtoValidationMiddleware') && app.includes('previously orphaned DtoValidationMiddleware bootstrap was retired'));
check('MNT-AUD-0111 strict parser maps validation to canonical error', strictSchemas.includes('ValidationException') && strictSchemas.includes('Transport validation failed'));
check('MNT-AUD-0111 legacy privileged routers use approved strict parser', strictLegacyRouters.every(name => {
  const source = read(`apps/api/src/presentation/api/router/${name}`);
  return source.includes('StrictControlPlaneSchemas') && source.includes('parseStrict(');
}));
check('MNT-AUD-0111 Student Tools admin test no raw body forwarding', studentToolsAdmin.includes('parseStrict(studentToolAdminTestSchema, req.body)') && !studentToolsAdmin.includes('input: req.body.input') && !studentToolsAdmin.includes('locale: req.body.locale'));
check('MNT-AUD-0111 bounded nested payload validation exists', strictSchemas.includes('100KB validation limit') && strictSchemas.includes('studentToolAdminTestSchema'));
const internationalTestAdminRouter = read('apps/api/src/presentation/api/router/InternationalTestAdminRouter.ts');
const referenceDataAdminRouter = read('apps/api/src/presentation/api/router/ReferenceDataAdminRouter.ts');
check('MNT-AUD-0111 orphan DTO middleware file removed', !exists('apps/api/src/presentation/validation/DtoValidationMiddleware.ts'));
check('MNT-AUD-0111 privileged schemas prohibit passthrough', !strictSchemas.includes('.passthrough()') && !internationalTestAdminRouter.includes('.passthrough()'));
check('MNT-AUD-0111 International Test child mutations no raw body forwarding', !/upsert(?:Variant|Section|ScoreScale|FeeMetadata|OfficialLink|Availability|PreparationMaterial)\(req\.params\.id, req\.body/.test(internationalTestAdminRouter));
check('MNT-AUD-0111 Reference Data path identifier is server authoritative', !referenceDataAdminRouter.includes('parse({ ...req.body,') && referenceDataAdminRouter.includes('countryUpdateBodySchema.parse(req.body)'));
check('MNT-AUD-0111 active Phase 4 baseline rebaselined', read('docs/phases/phase-04-architecture-governance/baselines/phase-04-11-refined-report.md').includes('route-local Zod schemas'));


try {
  const strictValidationTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/strict-edge-validation-remediation-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0111 native source contract tests execute', /# fail 0/.test(strictValidationTest));
} catch (error) {
  check('MNT-AUD-0111 native source contract tests execute', false);
}

const frontendSecurityPolicy = read('apps/frontend-security/ViteFrontendSecurityHeaders.ts');
const webVite = read('apps/web/vite.config.ts');
const adminVite = read('apps/admin/vite.config.ts');
const webInlineStyleCount = (execFileSync('bash', ['-lc', "rg -n 'style=\\{\\{' apps/web/src --glob '*.{ts,tsx}' | wc -l"], { encoding: 'utf8', cwd: root }).trim() || '0');
const adminInlineStyleCount = (execFileSync('bash', ['-lc', "rg -n 'style=\\{\\{' apps/admin/src --glob '*.{ts,tsx}' | wc -l"], { encoding: 'utf8', cwd: root }).trim() || '0');
check('MNT-AUD-0101 Web/Admin compose canonical frontend security policy', webVite.includes('frontendSecurityHeadersPlugin()') && adminVite.includes('frontendSecurityHeadersPlugin()'));
check('MNT-AUD-0101 canonical frontend policy denies framing', frontendSecurityPolicy.includes("frame-ancestors 'none'") && frontendSecurityPolicy.includes("'X-Frame-Options': 'DENY'"));
check('MNT-AUD-0101 script/style element policies do not permit unsafe-inline', !/script-src[^\n]*unsafe-inline/.test(frontendSecurityPolicy) && !/style-src 'self' 'unsafe-inline'/.test(frontendSecurityPolicy));
check('MNT-AUD-0101 API defense CSP denies framing and inline style elements', middleware.includes('frameAncestors: ["\'none\'"]') && middleware.includes('styleSrc: ["\'self\'"]'));
check('MNT-AUD-0101 build policy emits _headers artifact', frontendSecurityPolicy.includes("fileName: '_headers'") && exists('scripts/security/verify-frontend-security-headers.mjs'));
check('MNT-AUD-0114 inline-style remediation is explicitly registered', exists('docs/remediation/MNT-AUD-0114-INLINE-STYLE-CSP-COMPATIBILITY.md') && frontendSecurityPolicy.includes("style-src-attr 'none'") && !frontendSecurityPolicy.includes('unsafe-inline'));
check('MNT-AUD-0114 Web/Admin inline style inventory is zero', Number(webInlineStyleCount) === 0 && Number(adminInlineStyleCount) === 0);

try {
  const frontendSecurityTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/frontend-security-headers-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0101/0114 native source contract tests execute', /# fail 0/.test(frontendSecurityTest));
} catch (error) {
  check('MNT-AUD-0101/0114 native source contract tests execute', false);
}


const apiEnvExample = read('apps/api/.env.example');
const apiServer = read('apps/api/src/server.ts');
const envContractDoc = read('docs/remediation/MNT-AUD-0115-BOOLEAN-ENV-COERCION.md');
check('MNT-AUD-0043 canonical production config inventory exists', appConfig.includes('PRODUCTION_REQUIRED_CONFIG_KEYS') && appConfig.includes("'ADMIN_WEB_URL'") && appConfig.includes("'CERTIFICATE_COMPLETION_WORKER_ENABLED'"));
check('MNT-AUD-0043 Redis is required in both environment templates', !/REDIS[^\n]*OPTIONAL|in-memory rate limiting/i.test(envExample + '\n' + apiEnvExample));
check('MNT-AUD-0043 startup-blocking vars are mirrored in both environment templates', ['JWT_ISSUER','JWT_AUDIENCE','SECURE_COOKIE','TRUST_PROXY_HOPS','PUBLIC_WEB_URL','ADMIN_WEB_URL','SECURITY_CSP_ENABLED','CERTIFICATE_COMPLETION_WORKER_ENABLED','CERTIFICATE_COMPLETION_WORKER_INTERVAL_MS'].every(key => new RegExp(`^${key}=`, 'm').test(envExample) && new RegExp(`^${key}=`, 'm').test(apiEnvExample)));
check('MNT-AUD-0043 readiness consumes normalized runtime contract', readiness.includes('loadAppConfig(process.env)') && app.includes('ProductionReadinessValidator.validate(normalizedRuntimeConfig)'));
check('MNT-AUD-0043 certificate worker consumes typed config', apiServer.includes("config.getOptional<boolean>('CERTIFICATE_COMPLETION_WORKER_ENABLED')") && !apiServer.includes('process.env.CERTIFICATE_COMPLETION_WORKER_'));
check('MNT-AUD-0115 truthiness boolean coercion removed', !appConfig.includes('z.coerce.boolean()') && appConfig.includes("normalized === 'false' || normalized === '0'") && appConfig.includes("normalized === 'true' || normalized === '1'"));
check('MNT-AUD-0115 registered with closure evidence', envContractDoc.includes('MNT-AUD-0115') && envContractDoc.includes('SOURCE_VERIFIED / RUNTIME_PENDING'));

try {
  const envVerifier = execFileSync(process.execPath, [path.join(root, 'scripts/config/verify-environment-contract.mjs')], { encoding: 'utf8', cwd: root });
  check('MNT-AUD-0043 mechanical environment-contract verifier executes', /ENVIRONMENT_CONTRACT_VERIFIER=PASS/.test(envVerifier));
} catch (error) {
  check('MNT-AUD-0043 mechanical environment-contract verifier executes', false);
}
try {
  const envSourceTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/config/production-environment-contract-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0043/0115 native source contract tests execute', /# fail 0/.test(envSourceTest));
} catch (error) {
  check('MNT-AUD-0043/0115 native source contract tests execute', false);
}

const runtimeRegistry = read('apps/api/src/infrastructure/runtime/RuntimeResourceRegistry.ts');
const apiServerLifecycle = read('apps/api/src/server.ts');
const infrastructureIndex = read('packages/infrastructure/src/index.ts');
check('MNT-AUD-0040 one canonical Prisma constructor remains', runtimeRegistry.includes('new PrismaClient') && !app.includes('PrismaConnection') && !container.includes('new PrismaClient') && !infrastructureIndex.includes('new PrismaClient'));
check('MNT-AUD-0040 one canonical Redis client is injected across runtime', runtimeRegistry.includes('RedisClientFactory.createClient') && !container.includes('RedisClientFactory.createClient') && app.includes("container.resolve<any>('redisClient')"));
check('MNT-AUD-0040 DI uses process-owned resource registry', container.includes('runtimeResourceRegistry: asValue(runtimeResources)') && app.includes('registerDependencies(currentEnv, config, runtimeResources)'));
check('MNT-AUD-0040 readiness goes down before shutdown', app.includes("name: 'runtime-lifecycle'") && app.includes('RUNTIME_SHUTTING_DOWN') && apiServerLifecycle.includes('runtimeResources?.beginShutdown()'));
check('MNT-AUD-0040 SIGTERM/SIGINT graceful shutdown drains work and closes shared resources', apiServerLifecycle.includes("process.once('SIGTERM'") && apiServerLifecycle.includes("process.once('SIGINT'") && apiServerLifecycle.includes('server.closeIdleConnections?.()') && apiServerLifecycle.includes('server.close(') && apiServerLifecycle.includes('certificateWorkerTask ?? Promise.resolve()') && apiServerLifecycle.includes('Promise.race([') && apiServerLifecycle.includes('server.closeAllConnections?.()') && apiServerLifecycle.includes('runtimeResources?.closeAll()') && runtimeRegistry.includes('await prisma.$disconnect()') && runtimeRegistry.includes('await redis.quit()'));
check('MNT-AUD-0040 lifecycle runbook exists', exists('docs/operations/RUNTIME_RESOURCE_LIFECYCLE.md'));
try {
  const lifecycleTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/runtime/runtime-resource-lifecycle-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0040 native lifecycle source tests execute', /# fail 0/.test(lifecycleTest));
} catch (error) {
  check('MNT-AUD-0040 native lifecycle source tests execute', false);
}
try {
  const lifecycleRuntimeTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/runtime/runtime-resource-lifecycle-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0040 runtime lifecycle behavior executes', /# fail 0/.test(lifecycleRuntimeTest));
} catch {
  check('MNT-AUD-0040 runtime lifecycle behavior executes', false);
}

const monitoringServiceSource = read('packages/infrastructure/src/monitoring/MonitoringService.ts');
check('MNT-AUD-0063 readiness respects explicit indicator criticality', monitoringServiceSource.includes('indicator.isOptional === true') && !monitoringServiceSource.includes("name === 'redis'") && !monitoringServiceSource.includes("name === 'cache'"));
check('MNT-AUD-0063 production Redis is required in composition', app.includes("name: 'redis'") && app.includes('isOptional: !isProductionOrStaging'));
check('MNT-AUD-0063 health closure report is rebaselined', read('docs/HEALTH_READINESS_FINAL_CLOSURE_2026-09-05.md').includes('MNT-AUD-0063'));
try {
  const monitoringRuntimeTest = execFileSync(process.execPath, ['--test', path.join(root, 'tests/runtime/monitoring-required-dependency-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0063 required dependency runtime semantics execute', /# fail 0/.test(monitoringRuntimeTest));
} catch {
  check('MNT-AUD-0063 required dependency runtime semantics execute', false);
}



// W1 P2 security/configuration closure.
const passwordHasher = read('packages/infrastructure/src/auth/PasswordHasher.ts');
const credentialVerifier = read('packages/infrastructure/src/auth/PrismaCredentialVerifier.ts');
check('MNT-AUD-0072 password KDF is asynchronous', passwordHasher.includes("import { scrypt") && !passwordHasher.includes('scryptSync') && passwordHasher.includes('private static derive(') && passwordHasher.includes('scrypt(password, salt, keyLength, params'));
check('MNT-AUD-0072 unknown-account path executes dummy KDF', authRouter.includes('credentialVerifier?.verifyDummy?.(password)') && credentialVerifier.includes('public async verifyDummy(credentialValue'));
try {
  const loginKdfRuntime = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/login-kdf-remediation-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0072 async/dummy KDF runtime tests execute', /# fail 0/.test(loginKdfRuntime));
} catch {
  check('MNT-AUD-0072 async/dummy KDF runtime tests execute', false);
}

const cookiePolicy = read('apps/api/src/presentation/security/HttpOnlyAuthCookies.ts');
const securityServiceSource = read('packages/infrastructure/src/security/SecurityService.ts');
check('MNT-AUD-0102 browser cookies use SameSite Strict', cookiePolicy.includes("sameSite: 'strict'"));
check('MNT-AUD-0102 CSRF uses server-owned HMAC key plus session binding', securityServiceSource.includes('csrfSigningSecret') && securityServiceSource.includes("createHash('sha256').update(sessionBinding)") && securityServiceSource.includes("createHmac('sha256', this.csrfSigningSecret)"));
check('MNT-AUD-0102 API injects active CSRF_SECRET', app.includes("signingSecret: config.getOptional<string>('CSRF_SECRET') || currentEnv.CSRF_SECRET"));
check('MNT-AUD-0102 unused SESSION_SECRET readiness claim removed', !appConfig.includes("'SESSION_SECRET'") && !readiness.includes('session_secret') && !/^SESSION_SECRET=/m.test(envExample));
check('MNT-AUD-0102 CSRF secret remains production-blocking', appConfig.includes("'CSRF_SECRET'") && readiness.includes('auth.csrf_secret_weak'));
try {
  const csrfRuntime = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/cookie-csrf-contract-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0102 cookie/CSRF runtime contract tests execute', /# fail 0/.test(csrfRuntime));
} catch {
  check('MNT-AUD-0102 cookie/CSRF runtime contract tests execute', false);
}

const corsPolicy = read('apps/api/src/presentation/security/CanonicalApiCorsPolicy.ts');
check('MNT-AUD-0103 canonical CORS header contract includes mutation/correlation headers', ['Idempotency-Key','X-Correlation-ID','X-Request-ID','X-CSRF-Token'].every(header => corsPolicy.includes(`'${header}'`)));
check('MNT-AUD-0103 security middleware consumes canonical CORS contract', middleware.includes('CANONICAL_API_REQUEST_HEADERS') && middleware.includes('CANONICAL_API_EXPOSED_HEADERS'));
check('MNT-AUD-0103 public and Admin origins compose into CORS policy', app.includes('buildCanonicalCorsOrigins') && app.includes('publicWebUrl:') && app.includes('adminWebUrl:'));
try {
  const corsRuntime = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/cors-contract-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0103 CORS contract runtime tests execute', /# fail 0/.test(corsRuntime));
} catch {
  check('MNT-AUD-0103 CORS contract runtime tests execute', false);
}

const compose = read('docker-compose.yml');
const composeWrapper = read('scripts/dev/compose-safe.mjs');
check('MNT-AUD-0104 local dependency ports bind loopback only', compose.includes('127.0.0.1:${POSTGRES_PORT:-5432}:5432') && compose.includes('127.0.0.1:${REDIS_PORT:-6379}:6379'));
check('MNT-AUD-0104 tracked compose has no root/password credentials', !compose.includes('POSTGRES_USER: root') && !compose.includes('POSTGRES_PASSWORD: password'));
check('MNT-AUD-0104 Redis requires authentication', compose.includes('--requirepass') && compose.includes('REDIS_PASSWORD'));
check('MNT-AUD-0104 compose is development-profile gated', (compose.match(/profiles: \["development"\]/g) || []).length >= 3 && compose.includes('development-safety-gate'));
check('MNT-AUD-0104 wrapper rejects production/staging', composeWrapper.includes("runtime === 'production'") && composeWrapper.includes("runtime === 'staging'") && exists('.env.compose.example'));
try {
  const composeSource = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/local-compose-safety-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0104 local compose safety tests execute', /# fail 0/.test(composeSource));
} catch {
  check('MNT-AUD-0104 local compose safety tests execute', false);
}

const adminReadOnlyPolicy = read('apps/admin/src/security/LocalAdminReadOnlyPolicy.ts');
const adminApiClient = read('apps/admin/src/api/client.ts');
check('MNT-AUD-0067 canonical Admin client blocks unsafe methods before network', adminApiClient.includes('assertLocalReadOnlyRequestAllowed(options.method') && adminReadOnlyPolicy.includes("throw new Error('READ_ONLY_PREVIEW')"));
check('MNT-AUD-0067 Admin Vite bridge returns 423 for unsafe preview writes', adminVite.includes('localAdminReadOnlyGuardPlugin') && adminVite.includes('res.statusCode = 423'));
check('MNT-AUD-0067 production/staging builds reject auth-bypass flag', adminVite.includes('assertLocalReadOnlyBuildAllowed') && adminReadOnlyPolicy.includes('forbidden in production/staging builds'));
try {
  const adminReadOnlyRuntime = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/local-admin-readonly-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0067 local Admin read-only runtime tests execute', /# fail 0/.test(adminReadOnlyRuntime));
} catch {
  check('MNT-AUD-0067 local Admin read-only runtime tests execute', false);
}

const publicDataModePolicy = read('apps/web/src/config/PublicDataModePolicy.ts');
const publicLiveData = read('apps/web/src/features/public-template/usePublicLiveData.ts');
const publicTemplateApp = read('apps/web/src/features/public-template/PublicTemplateApp.tsx');
check('MNT-AUD-0070 production/staging builds reject prototype mode', publicDataModePolicy.includes('VITE_PUBLIC_TEMPLATE_DATA_MODE=prototype is forbidden in production/staging builds') && webVite.includes('assertPublicBuildDataMode'));
check('MNT-AUD-0070 production bundle has compile-time prototype capability gate', webVite.includes('__MANARATAK_PROTOTYPE_DATA_ENABLED__') && publicLiveData.includes('requestedMode === \'prototype\' && __MANARATAK_PROTOTYPE_DATA_ENABLED__'));
check('MNT-AUD-0070 prototype mode has unmistakable visible indicator', publicTemplateApp.includes('وضع تجريبي محلي') && publicTemplateApp.includes('غير إنتاجية'));
try {
  const prototypeRuntime = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/public-prototype-build-guard-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0070 public prototype build-guard tests execute', /# fail 0/.test(prototypeRuntime));
} catch {
  check('MNT-AUD-0070 public prototype build-guard tests execute', false);
}

const fileManagementRouter = read('apps/api/src/presentation/api/router/FileManagementRouter.ts');
check('MNT-AUD-0108 activation body schema excludes fileId', /fileActivateSchema = z\.object\(\{[\s\S]*?checksumAlgorithm[\s\S]*?checksumHash[\s\S]*?\}\)\.strict\(\)/.test(strictSchemas) && !/fileActivateSchema = z\.object\(\{[\s\S]*?fileId/.test(strictSchemas));
check('MNT-AUD-0108 path fileId is applied after validated body', fileManagementRouter.includes('await useCase.activateFile({ ...payload, fileId });') && !fileManagementRouter.includes('{ fileId, ...req.body }'));

const studentToolGateways = read('packages/infrastructure/src/student-tools/StudentToolGateways.ts');
const studentToolsPublicRouter = read('apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts');
const studentToolsAdminRouterSource = read('apps/api/src/presentation/api/router/StudentToolsAdminRouter.ts');
check('MNT-AUD-0113 production Student Tools uses shared Redis limiter', container.includes('new RedisRateLimiter(redisClient, `${namespace}student-tools:quota:`)') && container.includes('runtimeResources.getRedisClient()'));
check('MNT-AUD-0113 local limiter is restricted to non-production', container.includes('if (!productionLike) return new DefaultRateLimiter()'));
check('MNT-AUD-0113 quota-store failure is fail-closed with stable 503', studentToolGateways.includes('STUDENT_TOOL_QUOTA_STORE_UNAVAILABLE') && studentToolsPublicRouter.includes("code.includes('QUOTA_STORE_UNAVAILABLE')") && studentToolsPublicRouter.includes('? 503') && studentToolsAdminRouterSource.includes("code.includes('QUOTA_STORE_UNAVAILABLE') ? 503"));
check('MNT-AUD-0113 quota capability is a required production health indicator', app.includes("name: 'student-tools-quota'") && app.includes('STUDENT_TOOL_QUOTA_STORE_NOT_DISTRIBUTED'));
try {
  const studentQuotaSource = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/student-tools-distributed-quota-source.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0113 distributed quota source tests execute', /# fail 0/.test(studentQuotaSource));
} catch {
  check('MNT-AUD-0113 distributed quota source tests execute', false);
}
try {
  const studentQuotaRuntime = execFileSync(process.execPath, ['--test', path.join(root, 'tests/security/student-tools-distributed-quota-runtime.test.mjs')], { encoding: 'utf8' });
  check('MNT-AUD-0113 two-instance shared-store runtime tests execute', /# fail 0/.test(studentQuotaRuntime));
} catch {
  check('MNT-AUD-0113 two-instance shared-store runtime tests execute', false);
}

const redisLimiter = read('packages/infrastructure/src/security/RedisRateLimiter.ts');
check('P4-SEC-001 distributed limiter is production capable', redisLimiter.includes('isProductionReady = true') && redisLimiter.includes("kind = 'real'"));
check('P4-SEC-001 Redis atomic script present', redisLimiter.includes("redis.call('INCR'") && redisLimiter.includes("redis.call('PEXPIRE'"));
check('P4-SEC-001 app selects runtime limiter factory', app.includes('createRateLimiterForRuntime(currentEnv, logger, undefined, sharedRedisClient)'));

check('P6-DI-001 safe HTTP transport uses explicit factory', container.includes('safeSourceHttpTransport: asFunction(() => new NodeSafeSourceHttpTransport()).singleton()'));
check('P6-DI-001 raw snapshot store uses explicit factory', container.includes("importRawSnapshotStore: asFunction(() => createImportRawSnapshotStoreForRuntime(effectiveEnvironment, readConfig<string>('IMPORT_RAW_SNAPSHOT_DIR'))).singleton()"));
check('P6-DI-001 acquisition limiter uses explicit factory', container.includes('sourceAcquisitionLimiter: asFunction(() => new SourceAcquisitionLimiter()).singleton()'));

const failed = checks.filter((item) => !item.ok);
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`W1_SOURCE_VERIFIER=${failed.length === 0 ? 'PASS' : 'FAIL'} ${checks.length - failed.length}/${checks.length}`);
if (failed.length) process.exit(1);
