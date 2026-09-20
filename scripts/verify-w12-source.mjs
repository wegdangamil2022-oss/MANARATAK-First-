import { existsSync, readFileSync } from 'node:fs';

const files = {
  domain: 'packages/domain/src/ai-platform/entities/AIPlatform.ts',
  contract: 'packages/domain/src/ai-platform/contracts/IAIPlatformRepository.ts',
  app: 'packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts',
  repo: 'packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts',
  schema: 'packages/infrastructure/prisma/schema.prisma',
  di: 'apps/api/src/infrastructure/di/container.ts',
  migration: 'packages/infrastructure/prisma/migrations/20260826045000_w12_ai_governance_execution_safety/migration.sql',
};
const failures = [];
for (const [name, file] of Object.entries(files)) if (!existsSync(file)) failures.push(`missing:${name}:${file}`);
if (failures.length) fail();
const src = Object.fromEntries(Object.entries(files).map(([k, f]) => [k, readFileSync(f, 'utf8')]));
const check = (name, ok) => { if (!ok) failures.push(name); };

// 120 P17-PROMPT-012
check('P17-PROMPT-012:unique-capability-binding', /model AICapabilityPromptBindingRecord[\s\S]*capabilityKey\s+String\s+@unique/.test(src.schema));
check('P17-PROMPT-012:explicit-resolution', /resolvePromptForCapability\(request\.capabilityKey\)/.test(src.app) && /aICapabilityPromptBindingRecord\.findUnique/.test(src.repo));
check('P17-PROMPT-012:migration-collision-gate', /W12_PROMPT_CAPABILITY_BINDING_COLLISION/.test(src.migration));

// 121 P17-EVAL-001
check('P17-EVAL-001:exact-evidence', /findLatestEvaluationRun\(evaluation\.key,\s*\{[\s\S]*type:\s*'PROMPT'[\s\S]*checksum:\s*versionRecord\.checksum/.test(src.app));
check('P17-EVAL-001:exact-prompt-version-execution', /executePromptVersionForEvaluation[\s\S]*promptVersion:\s*request\.promptVersion/.test(src.app) && /options\.promptVersion \?\? prompt\.activeVersion!/.test(src.app));
check('P17-EVAL-001:persist-target-evidence', /targetChecksum/.test(src.domain) && /targetEvidence/.test(src.schema));

// 122 P17-EVAL-002
for (const type of ['EXACT_MATCH','JSON_SCHEMA','REGEX','LATENCY','COST','HUMAN']) check(`P17-EVAL-002:${type}`, new RegExp(`case '${type}'`).test(src.app));
check('P17-EVAL-002:unsupported-fail-closed', /AI_EVALUATOR_UNSUPPORTED/.test(src.app));

// 123 P17-EVAL-003
for (const type of ['PROMPT','MODEL','ROUTING','WORKFLOW']) check(`P17-EVAL-003:${type}`, new RegExp(`run\\.targetType === '${type}'`).test(src.app));
check('P17-EVAL-003:target-evidence-change-guard', /AI_EVALUATION_TARGET_EVIDENCE_CHANGED/.test(src.app));
check('P17-EVAL-003:knowledge-not-falsely-executed', /AI_EVALUATION_KNOWLEDGE_TARGET_NOT_SUPPORTED/.test(src.app));

// 124 P17-WORKFLOW-009
check('P17-WORKFLOW-009:immutable-version-store', /model AIWorkflowVersionRecord/.test(src.schema) && /AI_WORKFLOW_VERSION_IMMUTABLE/.test(src.repo));
check('P17-WORKFLOW-009:run-bound-version', /findWorkflowVersion\(run\.workflowKey, run\.workflowVersion\)/.test(src.app));

// 125 P17-WORKFLOW-008
check('P17-WORKFLOW-008:depends-on', /step\.dependsOn/.test(src.app) && /topologicalSteps/.test(src.app));
check('P17-WORKFLOW-008:retry-limit', /step\.retryLimit/.test(src.app) && /maxAttempts/.test(src.app));
check('P17-WORKFLOW-008:step-attempt-persistence', /createWorkflowStepRun/.test(src.app) && /AIWorkflowStepRunRecord/.test(src.schema));

// 126 P17-HUMAN-010
check('P17-HUMAN-010:policy-enforced', /consumer\.requireHumanReview \|\| capability\.requiresHumanReview/.test(src.app));
check('P17-HUMAN-010:activation-fail-closed', /AI_HUMAN_REVIEW_WORKFLOW_NOT_CONFIGURED/.test(src.app));

// 127 P17-SCHEMA-011
check('P17-SCHEMA-011:dialect-policy', /AI_JSON_SCHEMA_UNSUPPORTED_DIALECT/.test(src.app));
check('P17-SCHEMA-011:recursive-schema', /additionalProperties/.test(src.app) && /anyOf/.test(src.app) && /oneOf/.test(src.app) && /allOf/.test(src.app) && /itemValidator/.test(src.app));
check('P17-SCHEMA-011:unsupported-keyword-fail-closed', /AI_JSON_SCHEMA_UNSUPPORTED_KEYWORD/.test(src.app));

// 128 P17-GUARD-007
check('P17-GUARD-007:governance-compile', /resource === 'guardrails'\) validateGuardrailDefinition/.test(src.app));
check('P17-GUARD-007:safe-regex', /MAX_GOVERNED_REGEX_LENGTH/.test(src.app) && /AI_GUARDRAIL_REGEX_UNSAFE/.test(src.app) && /AI_GUARDRAIL_REGEX_INVALID/.test(src.app));

// 129 P17-QUOTA-005
check('P17-QUOTA-005:atomic-reservation', /createExecutionWithQuota/.test(src.contract) && /isolationLevel:\s*'Serializable'/.test(src.repo));
check('P17-QUOTA-005:pre-provider-reservation', src.app.indexOf('createExecutionWithQuota') < src.app.indexOf('adapter.invoke'));
check('P17-QUOTA-005:pending-reservations', /status:\s*'RESERVED'/.test(src.repo) && /pendingReservations/.test(src.repo));

// 130 P17-COST-006
check('P17-COST-006:currency-grouped-overview', /costMonthToDateByCurrency/.test(src.repo) && /MULTI/.test(src.repo));
check('P17-COST-006:currency-budget-guard', /AI_COST_CURRENCY_MISMATCH/.test(src.app) && /AI_COST_CURRENCY_MISMATCH/.test(src.repo));

// 131 P17-ASYNC-004
check('P17-ASYNC-004:lease', /leaseExpiresAt/.test(src.schema) && /staleRunning/.test(src.repo));
check('P17-ASYNC-004:serializable-reclaim', /claimAsyncJob[\s\S]*serializableRetry/.test(src.repo));
check('P17-ASYNC-004:reclaim-evidence', /AI_ASYNC_JOB_STALE_LEASE_RECLAIMED/.test(src.repo));

// 132 P17-IDEMP-013
check('P17-IDEMP-013:race-replay', /isUniqueConflict\(error\)[\s\S]*findExecutionByIdempotency/.test(src.repo));
check('P17-IDEMP-013:atomic-recheck', /createExecutionWithQuota[\s\S]*consumerKey_idempotencyKeyHash/.test(src.repo));

// 133 P17-RESIL-014
check('P17-RESIL-014:jitter', /jitteredBackoffMs/.test(src.app) && /Math\.random/.test(src.app));
check('P17-RESIL-014:shared-circuit', /model AIProviderCircuitRecord/.test(src.schema) && /providerCircuitCanAttempt/.test(src.repo) && /aIProviderCircuitRecord/.test(src.repo));

// Integration / migration / wiring guards.
check('W12:workflow-evaluation-wired', /AIEvaluationUseCases\(aiPlatformRepository, aiExecutionUseCases, aiWorkflowUseCases\)/.test(src.di));
check('W12:migration-source-only', /PENDING_GOOGLE_STUDIO/.test(src.migration));
check('W12:legacy-evaluation-expand-safe', /targetType\s+String\?/.test(src.schema) && /targetKey\s+String\?/.test(src.schema));
check('W12:no-workflow-version-fk-backfill-assumption', !/versionRecord\s+AIWorkflowVersionRecord/.test(src.schema));

if (failures.length) fail();
console.log('W12_SOURCE_REMEDIATION=PASS');
console.log('W12_FINDINGS=14/14');
console.log('W12_GUARDS=4/4');
console.log('W12_RUNTIME_DB_PROOF=PENDING_GOOGLE_STUDIO');

function fail() {
  console.error('W12_SOURCE_REMEDIATION=FAIL');
  for (const failure of failures) console.error(failure);
  process.exit(1);
}
