import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const required = [
  'packages/domain/src/ai-platform/entities/AIPlatform.ts',
  'packages/domain/src/ai-platform/contracts/IAIPlatformRepository.ts',
  'packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts',
  'packages/infrastructure/src/ai-platform/ProviderAdapters.ts',
  'packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts',
  'packages/infrastructure/src/ai-platform/EnvironmentAIAsyncPayloadProtector.ts',
  'apps/api/src/presentation/api/router/AIAdminRouter.ts',
  'apps/admin/src/pages/AIGovernancePage.tsx',
  'packages/infrastructure/prisma/migrations/20260824170000_phase17_enterprise_ai_platform/migration.sql',
];
const failures = [];
for (const file of required) if (!existsSync(file)) failures.push(`missing:${file}`);

const schema = readFileSync('packages/infrastructure/prisma/schema.prisma', 'utf8');
for (const model of ['AIRegistryRecord', 'AIPromptVersionRecord', 'AIExecutionRecord', 'AIAsyncJobRecord', 'AIExecutionSpanRecord', 'AIUsageRecord', 'AIWorkflowRunRecord', 'AIEvaluationRunRecord', 'AIKnowledgeSourceRecord', 'AIEmbeddingRecord', 'AIIndexingRunRecord', 'AIIncidentEventRecord']) {
  if (!schema.includes(`model ${model}`)) failures.push(`schema:${model}`);
}
if (/apiKey\s+String|secretValue\s+String|accessToken\s+String/i.test(schema.match(/\/\/ --- Phase 17[\s\S]*/)?.[0] ?? '')) failures.push('provider-secret-persisted');

function walkSourceFiles(root) {
  const out = [];
  if (!existsSync(root)) return out;
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = `${root}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walkSourceFiles(path));
    else if (/\.(?:ts|tsx|js|mjs|cjs)$/.test(path)) out.push(path);
  }
  return out;
}
let tracked = [];
try {
  tracked = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim().split(/\r?\n/);
} catch {
  tracked = [...walkSourceFiles('apps'), ...walkSourceFiles('packages')];
}
tracked = tracked.filter((file) => {
  const normalized = file.replaceAll('\\', '/');
  return existsSync(file)
    && /\.(?:ts|tsx|js|mjs|cjs)$/.test(file)
    && /^(?:apps|packages)\/[^/]+\/src\//.test(normalized);
});
const approved = ['packages/infrastructure/src/ai-platform/'];
const directImport = /(?:from\s+['"](?:openai|@anthropic-ai\/sdk|@google\/genai)['"]|require\(['"](?:openai|@anthropic-ai\/sdk|@google\/genai)['"]\))/;
for (const file of tracked) if (!approved.some((prefix) => file.replaceAll('\\', '/').startsWith(prefix)) && directImport.test(readFileSync(file, 'utf8'))) failures.push(`direct-provider-import:${file}`);

const ui = readFileSync('apps/admin/src/pages/AIGovernancePage.tsx', 'utf8');
if (/mock provider|fake success|demo execution/i.test(ui)) failures.push('fake-admin-data');
if (!ui.includes('NOT_CONFIGURED') || !ui.includes('/admin/ai/')) failures.push('admin-not-runtime-bound');

const orchestrator = readFileSync('packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts', 'utf8');
const publicGateway = readFileSync('apps/api/src/presentation/api/router/AIGatewayRouter.ts', 'utf8');
const repository = readFileSync('packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts', 'utf8');
const adapters = readFileSync('packages/infrastructure/src/ai-platform/ProviderAdapters.ts', 'utf8');
const requiredControls = [
  ['hashed-idempotency', /idempotencyKeyHash/],
  ['data-classification', /AIDataClassification/],
  ['production-approval', /productionApproved/],
  ['global-kill-switch', /AI_PLATFORM_EMERGENCY_DISABLED/],
  ['price-snapshot', /priceSnapshotKey/],
  ['execution-spans', /appendSpan/],
  ['structured-output', /validateStructuredOutput/],
  ['prompt-approval', /approvePromptVersion/],
  ['explicit-circuit-state', /HALF_OPEN/],
  ['durable-async-retry-dead-letter', /processAsync[\s\S]*DEAD_LETTER/],
];
for (const [name, pattern] of requiredControls)
  if (!pattern.test(orchestrator + repository)) failures.push(`control:${name}`);
if (/promptKey|providerKey|modelKey|consumerKey/.test(publicGateway.match(/const executeSchema[\s\S]*?;/)?.[0] ?? ''))
  failures.push('public-governance-bypass-fields');
if (/queuedPayload|rawPayload/.test(orchestrator + (schema.match(/\/\/ --- Phase 17[\s\S]*?\/\/ --- Phase 18/)?.[0] ?? ''))) failures.push('raw-async-payload');
if (/idempotencyKey\s+String/.test(schema.match(/model AIExecutionRecord[\s\S]*?\n}/)?.[0] ?? '')) failures.push('raw-idempotency-key');
if (/key=\$\{|api_key=\$\{/i.test(adapters)) failures.push('provider-secret-in-url');
if (existsSync('packages/application/src/ai-platform/use-cases/AIExecutionUseCases.ts')) failures.push('legacy-ai-execution-path');
if (existsSync('packages/domain/src/ai-platform/services/PromptRegistryService.ts')) failures.push('hardcoded-prompt-registry');
const asyncProtector = readFileSync('packages/infrastructure/src/ai-platform/EnvironmentAIAsyncPayloadProtector.ts', 'utf8');
if (!/aes-256-gcm/.test(asyncProtector) || !/AI_ASYNC_PAYLOAD_KEY/.test(asyncProtector)) failures.push('async-payload-not-encrypted');
const asyncWorker = readFileSync('packages/application/src/background-jobs/handlers/AIAsyncBackgroundJobHandler.ts', 'utf8');
const apiServer = readFileSync('apps/api/src/server.ts', 'utf8');
const appConfig = readFileSync('packages/config/src/AppConfig.ts', 'utf8');
if (!/processDueAsyncJobs/.test(asyncWorker) || !/AI_ASYNC_SWEEP_JOB_TYPE/.test(apiServer)) failures.push('async-runtime-worker-not-wired');
if (!/BACKGROUND_AI_CRON/.test(appConfig) || !/BACKGROUND_WORKER_ENABLED/.test(appConfig)) failures.push('async-runtime-worker-config-missing');

if (failures.length) {
  console.error(`PHASE17_SOURCE_READY=NO\n${failures.join('\n')}`);
  process.exit(1);
}
console.log('PHASE17_SOURCE_READY=YES');
console.log('LIVE_AI_PROVIDER_CALLS=0');
console.log('LIVE_PAID_INFERENCE=0');
console.log('PROVIDER_SECRETS_CONFIGURED=NO');
console.log('PHASE17_RUNTIME_PROOF=PENDING_GOOGLE_STUDIO');
