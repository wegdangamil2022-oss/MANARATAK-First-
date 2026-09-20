import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const read = (file) => fs.readFileSync(file, 'utf8');
const exists = (file) => fs.existsSync(file);
const app = read('apps/api/src/app.ts');
const taxonomyPublicRouter = read('apps/api/src/presentation/api/router/AcademicTaxonomyPublicRouter.ts');
const taxonomyAdminRouter = read('apps/api/src/presentation/api/router/AcademicTaxonomyAdminRouter.ts');
const taxonomyPublic = read('packages/application/src/academic-taxonomy/use-cases/PublicAcademicTaxonomyUseCases.ts');
const taxonomyLocalized = read('packages/application/src/academic-taxonomy/use-cases/LocalizedPublicAcademicTaxonomyUseCases.ts');
const taxonomyAdminPage = read('apps/admin/src/pages/AcademicTaxonomyAdminPage.tsx');
const taxonomyDetailPage = read('apps/admin/src/pages/AcademicTaxonomyDetailPage.tsx');
const settingsDefinition = read('packages/domain/src/settings/entities/SettingDefinition.ts');
const settingsAssignment = read('packages/domain/src/settings/entities/SettingAssignment.ts');
const settingsVersion = read('packages/domain/src/settings/value-objects/SettingVersion.ts');
const settingsResolution = read('packages/domain/src/settings/services/ConfigurationResolutionService.ts');
const settingsDefinitionRepoContract = read('packages/domain/src/settings/repositories/ISettingDefinitionRepository.ts');
const settingsDefinitionRepo = read('packages/infrastructure/src/settings/PrismaSettingDefinitionRepository.ts');
const settingsAssignmentRepo = read('packages/infrastructure/src/settings/PrismaSettingAssignmentRepository.ts');
const settingsUseCase = read('packages/application/src/settings/use-cases/ManageSettingsUseCase.ts');
const settingsAdminRouter = read('apps/api/src/presentation/api/router/SettingsAdminRouter.ts');
const settingsRuntimeRouter = read('apps/api/src/presentation/api/router/SettingsRuntimeRouter.ts');
const settingsAdminPage = read('apps/admin/src/pages/SettingsAdminPage.tsx');
const settingsLegacyPreviewPath = 'apps/web/src/features/admin-preview/AdminSettingsPreviewPage.tsx';
const settingsLegacyPreview = exists(settingsLegacyPreviewPath) ? read(settingsLegacyPreviewPath) : '';
const webRouter = read('apps/web/src/router/index.tsx');
const taxonomyLegacyPreviewPath = 'apps/web/src/features/admin-preview/AdminAcademicTaxonomyPages.tsx';
const taxonomyLegacyPreview = exists(taxonomyLegacyPreviewPath) ? read(taxonomyLegacyPreviewPath) : '';
const adminRoutes = read('apps/admin/src/App.tsx');
const phase23Arch = read('docs/phases/phase-23-enterprise-administration-portal/phase-23-01-enterprise-administration-portal-architecture-specification.md');
const phase23Workflow = read('docs/phases/phase-23-enterprise-administration-portal/phase-23-03-enterprise-administration-portal-workflows-operational-experience.md');
const settingsHistoryDoc = read('docs/implementation-status/MANARATAK-2.0-Settings-Access-Admin-Workspace-Phase23-Alignment-Report.md');
const closureDoc = read('docs/implementation-status/MANARATAK-ACADEMIC-TAXONOMY-SETTINGS-SOURCE-CLOSURE-2026-09-05.md');

const checks = {
  taxonomy_domain_surface_present: exists('packages/domain/src/academic-taxonomy'),
  taxonomy_admin_api_present: exists('apps/api/src/presentation/api/router/AcademicTaxonomyAdminRouter.ts'),
  taxonomy_public_api_present: exists('apps/api/src/presentation/api/router/AcademicTaxonomyPublicRouter.ts'),
  taxonomy_admin_ui_present: exists('apps/admin/src/pages/AcademicTaxonomyAdminPage.tsx'),
  taxonomy_detail_ui_present: exists('apps/admin/src/pages/AcademicTaxonomyDetailPage.tsx'),
  taxonomy_admin_rbac: app.includes("'/admin/academic-taxonomy', requireAdminPermission('admin:academic-taxonomy:manage')"),
  taxonomy_public_separate_route: app.includes("'/academic-taxonomy', container.resolve<Router>('academicTaxonomyPublicRouter')"),
  taxonomy_public_router_has_no_status_filter: !/status:\s*statusSchema/.test(taxonomyPublicRouter),
  taxonomy_public_list_forces_active: /status: AcademicTaxonomyStatus\.ACTIVE/.test(taxonomyPublic),
  taxonomy_localized_list_forces_active: /status: AcademicTaxonomyStatus\.ACTIVE/.test(taxonomyLocalized),
  taxonomy_public_direct_read_active_only: /node\?\.status === AcademicTaxonomyStatus\.ACTIVE/.test(taxonomyPublic),
  taxonomy_localized_direct_read_active_only: /record\?\.status === AcademicTaxonomyStatus\.ACTIVE/.test(taxonomyLocalized),
  taxonomy_public_children_parent_guard: /parent\?\.status !== AcademicTaxonomyStatus\.ACTIVE/.test(taxonomyPublic),
  taxonomy_public_parents_child_guard: /child\?\.status !== AcademicTaxonomyStatus\.ACTIVE/.test(taxonomyPublic),
  taxonomy_localized_children_filtered: /records\.filter\(\(record\) => record\.status === AcademicTaxonomyStatus\.ACTIVE\)/.test(taxonomyLocalized),
  taxonomy_localized_names_not_raw_public: /localizedNames: undefined/.test(taxonomyLocalized),
  taxonomy_admin_actor_required: /AUTHENTICATED_ADMIN_ACTOR_REQUIRED/.test(taxonomyAdminRouter),
  taxonomy_admin_audit_helper: /AuditHelper\.recordMutation/.test(taxonomyAdminRouter),
  taxonomy_node_mutation_audited: /UPSERT_ACADEMIC_TAXONOMY_NODE/.test(taxonomyAdminRouter),
  taxonomy_edge_mutation_audited: /ADD_ACADEMIC_TAXONOMY_EDGE/.test(taxonomyAdminRouter) && /REMOVE_ACADEMIC_TAXONOMY_EDGE/.test(taxonomyAdminRouter),
  taxonomy_alias_mutation_audited: /ADD_ACADEMIC_TAXONOMY_ALIAS/.test(taxonomyAdminRouter) && /REMOVE_ACADEMIC_TAXONOMY_ALIAS/.test(taxonomyAdminRouter),
  taxonomy_mapping_mutation_audited: /ADD_ACADEMIC_STANDARD_MAPPING/.test(taxonomyAdminRouter),
  taxonomy_mapping_confidence_bounded: /confidence: z\.number\(\)\.min\(0\)\.max\(1\)/.test(taxonomyAdminRouter),
  taxonomy_source_url_validated: /sourceUrl: z\.string\(\)\.url\(\)/.test(taxonomyAdminRouter),
  taxonomy_degree_level_mutation_audited: /UPDATE_DEGREE_LEVEL/.test(taxonomyAdminRouter),
  taxonomy_major_boundary_deep_read: /adminMajorUseCases\.listByTaxonomyNode/.test(taxonomyAdminRouter),
  taxonomy_admin_pagination: /pageSize = 50/.test(taxonomyAdminPage) && /setPage\(1\)/.test(taxonomyAdminPage),
  taxonomy_admin_brand_primary: /#142B5F/.test(taxonomyAdminPage) && /#0E7C86/.test(taxonomyAdminPage),
  taxonomy_detail_brand_primary: /#142B5F/.test(taxonomyDetailPage) && /#0E7C86/.test(taxonomyDetailPage),
  taxonomy_legacy_preview_redirect_only: (!exists(taxonomyLegacyPreviewPath) && /path: 'admin\/\*'/.test(webRouter) && /CanonicalAdminRedirect/.test(webRouter)) || (/window\.location\.replace/.test(taxonomyLegacyPreview) && !/mock|demo|fake/i.test(taxonomyLegacyPreview)),

  settings_domain_present: exists('packages/domain/src/settings'),
  settings_definition_repo_lists_real_data: /findAll\(\): Promise<SettingDefinition\[\]>/.test(settingsDefinitionRepoContract) && /settingDefinitionRecord\.findMany/.test(settingsDefinitionRepo),
  settings_admin_rbac: app.includes("'/admin/settings', requireAdminPermission('admin:settings:manage')"),
  settings_runtime_rbac: app.includes("v1Router.use('/settings', ...protectControlPlane('admin:settings:manage', 'settingsRuntimeRouter'))"),
  settings_secret_default_rejected_domain: /Secret setting definitions cannot persist a default value/.test(settingsDefinition),
  settings_secret_default_rejected_application: /Secret settings cannot persist default values/.test(settingsUseCase),
  settings_secret_write_rejected: /Secret values cannot be written through the Settings API/.test(settingsUseCase),
  settings_secret_rollback_rejected: /Secret values cannot be rolled back through the Settings API/.test(settingsUseCase),
  settings_secret_admin_view_redacted: /definition\.isSecret \? undefined/.test(settingsUseCase) && /redact \? '\*\*\*\*\*\*\*\*'/.test(settingsUseCase),
  settings_version_ids_unique_domain: /version ids must be unique and immutable/.test(settingsAssignment),
  settings_version_reuse_rejected_domain: /already exists and cannot be mutated/.test(settingsAssignment),
  settings_rollback_lineage_domain: /rollbackOfVersionId/.test(settingsVersion) && /previousVersionId\)/.test(settingsAssignment),
  settings_repo_honors_current_version_id: /row\.currentVersionId/.test(settingsAssignmentRepo) && /versions\.push\(currentVersion\)/.test(settingsAssignmentRepo),
  settings_repo_transactional_save: /this\.prisma\.\$transaction/.test(settingsAssignmentRepo),
  settings_repo_version_collision_preflight: /cannot be mutated or reassigned/.test(settingsAssignmentRepo) && /versionsToCreate/.test(settingsAssignmentRepo),
  settings_repo_assignment_identity_collision_guard: /already belongs to another key or scope and cannot be reused/.test(settingsAssignmentRepo),
  settings_repo_scope_owner_collision_guard: /already belongs to .* and cannot be reassigned/.test(settingsAssignmentRepo),
  settings_repo_historical_pointer_guard: /rollback must create a new immutable version/.test(settingsAssignmentRepo),
  settings_repo_no_historical_update: !/settingVersionRecord\.upsert/.test(settingsAssignmentRepo),
  settings_repo_persists_rollback_lineage: /rollbackOfVersionId/.test(settingsAssignmentRepo),
  settings_resolution_explicit_context: /identityId\?: string/.test(settingsResolution) && /tenantId\?: string/.test(settingsResolution) && /domainId\?: string/.test(settingsResolution),
  settings_resolution_precedence_identity_first: settingsResolution.indexOf('identityAssignment') < settingsResolution.indexOf('tenantAssignment'),
  settings_resolution_precedence_tenant_before_domain: settingsResolution.indexOf('tenantAssignment') < settingsResolution.indexOf('domainAssignment'),
  settings_resolution_global_fallback: /ScopeLevel\.GLOBAL/.test(settingsResolution) && /definition\.defaultValue \?\? null/.test(settingsResolution),
  settings_resolution_never_returns_db_secret: /options\?\.allowSecrets \? null : '\*\*\*\*\*\*\*\*'/.test(settingsResolution),
  settings_runtime_no_organization_alias: !/organizationId|scopeId/.test(settingsRuntimeRouter),
  settings_runtime_explicit_scope_query: /identityId/.test(settingsRuntimeRouter) && /tenantId/.test(settingsRuntimeRouter) && /domainId/.test(settingsRuntimeRouter),
  settings_admin_read_definitions: /router\.get\('\/definitions'/.test(settingsAdminRouter),
  settings_admin_read_assignments: /router\.get\('\/assignments'/.test(settingsAdminRouter),
  settings_admin_actor_required: /AUTHENTICATED_ADMIN_ACTOR_REQUIRED/.test(settingsAdminRouter),
  settings_admin_server_author: /authorId: actor\(req\)/.test(settingsAdminRouter),
  settings_admin_scope_validation: /scopeId is required/.test(settingsAdminRouter) && /scopeId must be omitted for GLOBAL/.test(settingsAdminRouter),
  settings_admin_mutations_audited: /CREATE_SETTING_DEFINITION/.test(settingsAdminRouter) && /ASSIGN_SETTING_VALUE/.test(settingsAdminRouter) && /ROLLBACK_SETTING_VALUE/.test(settingsAdminRouter),
  settings_ui_api_backed: /\/admin\/settings\/definitions/.test(settingsAdminPage) && /\/admin\/settings\/assignments/.test(settingsAdminPage),
  settings_ui_has_real_history: /selectedHistory/.test(settingsAdminPage) && /rollback\(selectedHistory, version\)/.test(settingsAdminPage),
  settings_ui_rbac_boundary_visible: /IAM\/Authorization/.test(settingsAdminPage),
  settings_ui_secret_boundary_visible: /Secret Provider\/Environment/.test(settingsAdminPage),
  settings_ui_reference_data_deep_link: /to="\/settings\/reference-data"/.test(settingsAdminPage) && /path="\/settings\/reference-data"/.test(adminRoutes),
  settings_ui_brand: /#142B5F/.test(settingsAdminPage) && /#0E7C86/.test(settingsAdminPage) && /#D6A43B/.test(settingsAdminPage),
  settings_ui_error_state: /role="alert"/.test(settingsAdminPage),
  settings_legacy_preview_redirect_only: (!exists(settingsLegacyPreviewPath) && /path: 'admin\/\*'/.test(webRouter) && /CanonicalAdminRedirect/.test(webRouter)) || (/window\.location\.replace/.test(settingsLegacyPreview) && !/Active admin users|Root Super Admin|Pending invitations|Security compliance/.test(settingsLegacyPreview)),
  settings_docs_superseded_old_preview: /HISTORICAL \/ SUPERSEDED/.test(settingsHistoryDoc),
  settings_docs_correct_owner_boundaries: /IAM\/RBAC Separation/.test(phase23Arch) && /Secrets Separation/.test(phase23Arch),
  settings_docs_remove_fake_workflow: /hardcoded admin-user counts/.test(phase23Workflow),
  closure_doc_present: /Academic Taxonomy \+ Settings Source Closure/.test(closureDoc),
  closure_doc_source_only: /Database executions, migration executions, and backfill executions for this closure are zero/.test(closureDoc),
};

function childPass(script) {
  try { execFileSync(process.execPath, [script], { stdio: 'pipe' }); return true; } catch { return false; }
}
checks.taxonomy_degree_regression = childPass('scripts/verify-taxonomy-degree-source.mjs');
checks.architecture_regression = childPass('scripts/architecture/verify-source-architecture-guards.mjs');
checks.source_quality_regression = childPass('scripts/quality/verify-source-quality.mjs');

let passed = 0;
for (const [name, ok] of Object.entries(checks)) {
  console.log(`${name}=${ok ? 'PASS' : 'FAIL'}`);
  if (ok) passed += 1;
}
const total = Object.keys(checks).length;
console.log(`ACADEMIC_SETTINGS_SOURCE_CLOSURE=${passed}/${total} ${passed === total ? 'PASS' : 'FAIL'}`);
if (passed !== total) process.exit(1);
