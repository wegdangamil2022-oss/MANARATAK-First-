import fs from 'node:fs';
import path from 'node:path';
const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const exists = (file) => fs.existsSync(path.join(root, file));

const repo = read('packages/infrastructure/src/student-tools/PrismaStudentToolRegistryRepository.ts');
const contracts = read('packages/domain/src/student-tools/contracts.ts');
const types = read('packages/domain/src/student-tools/types.ts');
const services = read('packages/domain/src/student-tools/services.ts');
const execution = read('packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts');
const registry = read('packages/application/src/student-tools/use-cases/StudentToolRegistryUseCases.ts');
const router = read('apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts');
const adminRouter = read('apps/api/src/presentation/api/router/StudentToolsAdminRouter.ts');
const strictSchemas = read('apps/api/src/presentation/validation/StrictControlPlaneSchemas.ts');
const gateways = read('packages/infrastructure/src/student-tools/StudentToolGateways.ts');
const ai = read('packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const session = read('packages/application/src/student-tools/services/StudentToolAnonymousSessionService.ts');
const protector = read('packages/infrastructure/src/student-tools/EnvironmentStudentToolResultProtector.ts');
const migrationPath = 'packages/infrastructure/prisma/migrations/20260826183000_w13_student_tools_integrity/migration.sql';
const migration = exists(migrationPath) ? read(migrationPath) : '';

const checks = {
  'P18-VERSION-004':
    /definitionSnapshot\s+Json/.test(schema) &&
    /snapshotHash\s+String/.test(schema) &&
    /versionId\s+String/.test(schema) &&
    /version\s+StudentToolVersionRecord\s+@relation/.test(schema) &&
    /versionSnapshot\(definition\)/.test(repo) &&
    /IMMUTABLE_TOOL_VERSION/.test(repo) &&
    /TOOL_VERSION_INCREMENT_REQUIRED/.test(repo) &&
    /stableStringify\(comparableSnapshot\(existingVersion\.definitionSnapshot\)\)/.test(repo),

  'P18-PUBLIC-005':
    /class StudentToolPublicAccessPolicy/.test(services) &&
    /implementationStatus === StudentToolImplementationStatus\.IMPLEMENTED/.test(services) &&
    /lifecycle === StudentToolLifecycleStatus\.ACTIVE/.test(services) &&
    /visibility === StudentToolVisibilityStatus\.ACTIVE/.test(services) &&
    /StudentToolPublicAccessPolicy\.isDiscoverable/.test(repo) &&
    /findPublicTool/.test(registry) &&
    /StudentToolPublicAccessPolicy\.assertDiscoverable/.test(execution) &&
    /findPublicTool\(req\.params\.toolKey\)/.test(router),

  'P18-HEALTH-008':
    /async capabilityReadiness\(/.test(ai) &&
    /this\.route\(/.test(ai) &&
    /model\.capabilities\.includes\(capability\.kind\)/.test(ai) &&
    /consumer\.allowedModels/.test(ai) &&
    /classificationAllowed/.test(ai) &&
    /this\.aiExecution\.capabilityReadiness/.test(gateways),

  'P18-RATE-001':
    /createHmac\('sha256'/.test(session) &&
    /timingSafeEqual/.test(session) &&
    /networkHash/.test(session) &&
    /studentToolAnonymousSessionService\.resolve/.test(router) &&
    /trustedNetworkReference/.test(router) &&
    /:network:/.test(execution) &&
    !/String\(req\.header\('x-student-tools-session'\) \?\? req\.ip/.test(router),

  // Section 19 replaces whole-catalog scanning with canonical filters and bounded candidates.
  'P18-RECO-002':
    /resolveCountries\(filters\.countries\)/.test(gateways) &&
    /resolveDegreeLevel\(filters\.targetDegree\)/.test(gateways) &&
    /resolveLanguage\(filters\.studyLanguage\)/.test(gateways) &&
    /batches\.slice\(0, 10\)/.test(gateways) &&
    /if \(unique\.size >= 25\) break/.test(gateways) &&
    /studyLanguageReferenceId: languageReferenceId/.test(gateways) &&
    /countryReferenceId,\s*degreeLevelId,/.test(gateways) &&
    /fundingType:[\s\S]*?filters\.fundingPreference/.test(gateways) &&
    /limit: 25/.test(gateways) &&
    /return \[\.\.\.unique\.values\(\)\]\.slice\(0, 25\)/.test(gateways) &&
    !/listAllPublished/.test(gateways),

  'P18-SAVE-003':
    !/z\.object\(\{ result: z\.unknown\(\) \}\)/.test(router) &&
    /recoverResult\(record\)/.test(execution) &&
    /resultReference: `\$\{record\.executionId\}:\$\{record\.resultDigest\}`/.test(execution) &&
    /TOOL_RESULT_PROVENANCE_MISMATCH/.test(execution) &&
    /resultDigest/.test(schema),

  'P18-IDEMP-007':
    /recordExecutionOrReplay/.test(contracts) &&
    /recordExecutionOrReplay\(record/.test(repo) &&
    /P2002/.test(repo) &&
    /idempotencyKeyHash/.test(repo) &&
    /created: false/.test(repo),

  'P18-IDEMP-006':
    /resultCiphertext/.test(schema) &&
    /resultExpiresAt/.test(schema) &&
    /EnvironmentStudentToolResultProtector/.test(protector) &&
    /aes-256-gcm/.test(protector) &&
    /IDEMPOTENT_REPLAY/.test(execution) &&
    /loadTransientResult/.test(execution) &&
    /TOOL_IDEMPOTENT_RESULT_EXPIRED/.test(execution),

  'GUARD-MIGRATION-EXPAND-FAIL-CLOSED':
    exists(migrationPath) &&
    /LEGACY_RECONSTRUCTED_AT_W13_MIGRATION/.test(migration) &&
    /RAISE EXCEPTION/.test(migration) &&
    /StudentToolExecutionRecord_versionId_fkey/.test(migration),

  'GUARD-PROTECTED-RESULT-NOT-MAPPED':
    /function mapExecution/.test(repo) &&
    !/resultCiphertext:\s*row\.resultCiphertext/.test(repo) &&
    !/resultAuthTag:\s*row\.resultAuthTag/.test(repo),

  'GUARD-RESULT-TTL-CLEANUP':
    /pruneExpiredTransientResults/.test(contracts) &&
    /resultExpiresAt: \{ lte: now \}/.test(repo) &&
    /clearTransientResult/.test(repo),

  'GUARD-ADMIN-VERSIONED-AVAILABILITY':
    /studentToolAvailabilitySchema/.test(adminRouter) &&
    /parseStrict\(studentToolAvailabilitySchema, req\.body\)/.test(adminRouter) &&
    /semanticVersion:\s*z\s*\.string\(\)\s*\.trim\(\)\s*\.regex/.test(strictSchemas) &&
    /changeNote: z\.string\(\)\.trim\(\)\.min\(3\)/.test(strictSchemas) &&
    /updateVersionedConfiguration/.test(adminRouter) &&
    /compareSemver\(version\.semanticVersion, current\.currentVersion\.semanticVersion\) <= 0/.test(registry),

  'GUARD-IG-H-PHASE17-SAME-ROUTER':
    /capabilityReadiness/.test(ai) &&
    /providerCircuitCanAttempt/.test(ai) &&
    /isProviderExecutable\(adapter\.status\(\)\)/.test(ai) &&
    /phase18-student-tools/.test(gateways),
};

for (const [name, ok] of Object.entries(checks)) console.log(`${name}=${ok ? 'PASS' : 'FAIL'}`);
if (Object.values(checks).some((ok) => !ok)) process.exit(1);
console.log(`W13_SOURCE_VERIFIER=PASS ${Object.keys(checks).length}/${Object.keys(checks).length}`);
