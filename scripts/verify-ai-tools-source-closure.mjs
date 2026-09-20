import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const aiDomain = read('packages/domain/src/ai-platform/entities/AIPlatform.ts');
const aiUseCases = read('packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts');
const adapters = read('packages/infrastructure/src/ai-platform/ProviderAdapters.ts');
const aiRepo = read('packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts');
const app = read('apps/api/src/app.ts');
const toolRegistry = read('packages/application/src/student-tools/OfficialStudentToolRegistry.ts');
const toolExecution = read('packages/application/src/student-tools/use-cases/StudentToolExecutionUseCases.ts');
const toolServices = read('packages/domain/src/student-tools/services.ts');
const toolPublicRouter = read('apps/api/src/presentation/api/router/StudentToolsPublicRouter.ts');
const toolGateways = read('packages/infrastructure/src/student-tools/StudentToolGateways.ts');
const cors = read('apps/api/src/presentation/security/CanonicalApiCorsPolicy.ts');
const webClient = read('apps/web/src/api/client.ts');
const webRouter = read('apps/web/src/router/index.tsx');
const publicApp = read('apps/web/src/features/public-template/PublicTemplateApp.tsx');
const toolsPage = read('apps/web/src/features/public-template/components/AIToolsPage.tsx');
const banner = read('apps/web/src/features/public-template/components/AIToolsBanner.tsx');
const liveSource = read('apps/web/src/features/public-template/publicLiveDataSource.ts');
const executionPage = read('apps/web/src/features/student-tools/StudentToolPage.tsx');
const aiAdmin = read('apps/admin/src/pages/AIGovernancePage.tsx');
const toolsAdmin = read('apps/admin/src/pages/StudentToolsAdminPage.tsx');
const container = read('apps/api/src/infrastructure/di/container.ts');

const checks = {
  ai_domain_present: exists('packages/domain/src/ai-platform/entities/AIPlatform.ts'),
  ai_orchestrator_present: exists('packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts'),
  provider_registry_present: exists('packages/infrastructure/src/ai-platform/ProviderAdapters.ts'),
  ai_repository_present: exists('packages/infrastructure/src/ai-platform/PrismaAIPlatformRepository.ts'),
  ai_admin_present: exists('apps/admin/src/pages/AIGovernancePage.tsx'),
  provider_runtime_pending_status: /'RUNTIME_PENDING'/.test(aiDomain),
  env_secret_not_fake_ready: /this\.secret\(\) \? \(this\.runtimeVerified \? 'READY' : 'RUNTIME_PENDING'\)/.test(adapters),
  provider_ready_requires_runtime_success: /markRuntimeVerified/.test(adapters) && /runtimeVerified = true/.test(adapters),
  pending_provider_can_be_attempted: /status === 'READY' \|\| status === 'RUNTIME_PENDING'/.test(aiUseCases),
  ai_health_reports_runtime_pending: /AI_PROVIDER_RUNTIME_PENDING/.test(app) && /runtimePending/.test(app),
  ai_overview_reports_runtime_pending: /counts\.RUNTIME_PENDING/.test(aiRepo) && /'RUNTIME_PENDING'/.test(aiRepo),
  ai_admin_overview_uses_live_adapter_status: /for \(const adapter of this\.providers\.list\(\)\) counts\[adapter\.status\(\)\] \+= 1/.test(aiUseCases) && /else overallStatus = 'RUNTIME_PENDING'/.test(aiUseCases),
  ai_idempotency_requester_scoped: /consumerKey}:\$\{requesterScope}:\$\{request\.idempotencyKey}/.test(aiUseCases),
  ai_request_fingerprint: /const requestFingerprint = sha256\(stableStringify/.test(aiUseCases),
  ai_idempotency_reuse_rejected: /AI_IDEMPOTENCY_KEY_REUSED/.test(aiUseCases),
  ai_fingerprint_persisted: /requestFingerprint \}\),/.test(aiUseCases),
  ai_structured_output_validation: /validateStructuredOutput/.test(aiUseCases),
  ai_prompt_injection_control: /PROMPT_INJECTION/.test(aiUseCases),
  ai_pii_redaction: /PII_REDACTED/.test(aiUseCases),
  ai_secret_reference_only: /secretReference/.test(aiDomain) && !/apiKey\?:|secretValue\?:/.test(aiDomain),
  ai_async_payload_protection: exists('packages/infrastructure/src/ai-platform/EnvironmentAIAsyncPayloadProtector.ts'),

  official_tool_registry: /OFFICIAL_STUDENT_TOOL_COUNT = 83/.test(toolRegistry),
  only_four_launch_tools: ['gpa-calculator','university-comparison','motivation-letter-generator','scholarship-recommendation'].every((key) => toolRegistry.includes(`'${key}'`)),
  public_access_policy_used: /StudentToolPublicAccessPolicy\.assertDiscoverable/.test(toolExecution),
  tool_result_protection_enforced: /TOOL_RESULT_PROTECTION_NOT_CONFIGURED/.test(toolExecution),
  tool_readiness_includes_result_protection: /TOOL_RESULT_PROTECTION_NOT_CONFIGURED/.test(toolServices),
  tool_result_protector_injected: /StudentToolActivationReadinessService\(studentToolHandlerRegistry, studentToolDependencyHealthGateway, studentToolResultProtector\)/.test(container),
  tool_idempotency_request_fingerprint: /const requestFingerprint = resultDigest/.test(toolExecution),
  tool_idempotency_reuse_rejected: /TOOL_IDEMPOTENCY_KEY_REUSED/.test(toolExecution),
  tool_fingerprint_persisted: /safeUsageMetadata: \{ locale: context\.locale, requestFingerprint \}/.test(toolExecution),
  anonymous_session_server_signed: /studentToolAnonymousSessionService\.resolve/.test(toolPublicRouter),
  anonymous_session_request_header_allowed: /X-Student-Tools-Session/.test(cors) && /CANONICAL_API_REQUEST_HEADERS/.test(cors),
  anonymous_session_response_header_exposed: /CANONICAL_API_EXPOSED_HEADERS/.test(cors) && /X-Student-Tools-Session-Expires-At/.test(cors),
  anonymous_session_browser_persisted: /STUDENT_TOOLS_SESSION_STORAGE_KEY/.test(webClient) && /sessionStorage\.setItem/.test(webClient),
  browser_execution_idempotency: /idempotencyKey: crypto\.randomUUID\(\)/.test(webClient),
  save_does_not_submit_result: /saveStudentToolExecution\(executionId: string\)/.test(webClient) && !/saveStudentToolExecution\(executionId: string, result/.test(webClient),
  server_save_recovers_protected_result: /const result = await this\.recoverResult\(record\)/.test(toolExecution),
  live_tool_execution_route: /path: 'tools\/:toolKey'[\s\S]*element: <StudentToolPage/.test(webRouter),
  shadow_gemini_modal_removed: !exists('apps/web/src/features/public-template/components/AIToolsModal.tsx'),
  shadow_gemini_endpoints_removed: !/\/api\/gemini\//.test(publicApp + toolsPage + banner + executionPage),
  dead_student_tools_list_removed: !exists('apps/web/src/features/student-tools/StudentToolsList.tsx'),
  official_registry_category_keys: /DOCUMENTS_AND_WRITING/.test(liveSource) && /UNIVERSITIES/.test(liveSource) && /SCHOLARSHIPS/.test(liveSource) && /STUDENT_PLANNING/.test(liveSource),
  tool_details_from_registry_schema: /dto\.inputSchema\?\.fields/.test(liveSource) && /dto\.outputSchema\?\.fields/.test(liveSource),
  tool_detail_real_launch_cta: /فتح الأداة/.test(toolsPage) && /\/tools\/\$\{encodeURIComponent\(tool\.toolKey\)\}/.test(toolsPage),
  banner_direct_tool_launch: /onOpenAiTools\(tool\.id\)/.test(banner) && /motivation-letter-generator/.test(banner),
  public_ai_entry_uses_phase18: /openStudentTools\('motivation-letter-generator'\)/.test(publicApp),
  canonical_university_gateway: /CanonicalUniversityComparisonGateway/.test(toolGateways),
  canonical_scholarship_gateway: /CanonicalScholarshipRecommendationGateway/.test(toolGateways),
  phase18_ai_boundary: /Phase17StudentToolsAIConsumerGateway/.test(toolGateways),
  university_result_deep_link: /to=\{`\/universities\//.test(executionPage),
  scholarship_result_deep_link: /to=\{`\/scholarships\//.test(executionPage),
  university_deep_link_owner_hydration: /ApiClient\.getUniversityBySlug/.test(publicApp),

  canonical_ai_admin_redirect: /path: 'admin\/\*'/.test(webRouter) && /<CanonicalAdminRedirect legacyPath=\{window\.location\.pathname\}/.test(webRouter),
  canonical_tools_admin_redirect: /path: 'admin\/\*'/.test(webRouter) && /targetPath = normalizedLegacyPath\.replace\(\/\^\\\/admin\//.test(webRouter),
  duplicate_ai_admin_removed: !exists('apps/web/src/features/admin-preview/AdminAiGovernancePreviewPage.tsx'),
  ai_admin_brand_identity: /#142B5F/.test(aiAdmin) && /#0E7C86/.test(aiAdmin),
  tools_admin_brand_identity: /#142B5F/.test(toolsAdmin) && /#0E7C86/.test(toolsAdmin),
  ai_admin_runtime_pending_semantics: /RUNTIME_PENDING/.test(aiAdmin),
  execution_page_brand_identity: /var\(--mn-primary\)/.test(executionPage) && /var\(--mn-secondary\)/.test(executionPage) && /var\(--mn-border-gold\)/.test(executionPage),
  no_fake_success_ui_copy: !/fake success|simulated execution|mock health/i.test(aiAdmin + toolsAdmin + executionPage),
};

function childPass(script) {
  try { execFileSync(process.execPath, [script], { stdio: 'pipe' }); return true; } catch { return false; }
}
checks.phase17_regression = childPass('scripts/verify-phase17-source.mjs');
checks.phase18_regression = childPass('scripts/verify-phase18-source.mjs');
checks.architecture_regression = childPass('scripts/architecture/verify-source-architecture-guards.mjs');
checks.source_quality_regression = childPass('scripts/quality/verify-source-quality.mjs');

let passed = 0;
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${name}=${ok ? 'PASS' : 'FAIL'}`);
  if (ok) passed += 1;
}
const total = Object.keys(checks).length;
console.log(`AI_TOOLS_SOURCE_CLOSURE=${passed}/${total} ${passed === total ? 'PASS' : 'FAIL'}`);
if (passed !== total) process.exit(1);
