import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(root, p));
const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const prismaQueue = read('packages/infrastructure/src/import-foundation/PrismaImportQueueGateway.ts');
const memoryQueue = read('packages/infrastructure/src/import-foundation/InMemoryImportQueueGateway.ts');
const adminImport = read('packages/application/src/import-foundation/use-cases/ImportAdminUseCases.ts');
const worker = read('packages/application/src/import-foundation/use-cases/ImportWorkerProtocol.ts');
const networkPolicy = read('packages/infrastructure/src/import-foundation/network/SourceNetworkSecurityPolicy.ts');
const transport = read('packages/infrastructure/src/import-foundation/network/NodeSafeSourceHttpTransport.ts');
const rawStore = read('packages/infrastructure/src/import-foundation/LocalImportRawSnapshotStore.ts');
const runtimePolicy = read('apps/api/src/infrastructure/di/RuntimeDependencyPolicy.ts');
const container = read('apps/api/src/infrastructure/di/container.ts');
const infraIndex = read('packages/infrastructure/src/index.ts');
const eventRepo = read('packages/infrastructure/src/event-foundation/PrismaEnterpriseEventRepository.ts');
const eventPublisher = read('packages/infrastructure/src/event-foundation/PrismaEventPublishingGateway.ts');
const schema = read('packages/infrastructure/prisma/schema.prisma');
const migration = read('packages/infrastructure/prisma/migrations/20260825180000_w2_enterprise_event_durability/migration.sql');
const phase4Storage = read('docs/phases/phase-04-architecture-governance/baselines/phase-04-12-report.md');

check('P6-SEC-005 path prefixes are segment bounded',
  networkPolicy.includes("pathname === prefix || pathname.startsWith(`${prefix}/`)") &&
  !networkPolicy.includes('url.pathname.startsWith(prefix)'));

check('P6-RES-006 response size has a hard cap',
  transport.includes('hardMaxResponseBytes') && transport.includes('Math.min(value, hardMax)'));
check('P6-RES-006 timeout has a hard cap',
  transport.includes('hardMaxTimeoutMs') && transport.includes('SOURCE_TIMEOUT_INVALID'));
check('P6-RES-006 redirects remain hard bounded',
  transport.includes('hardMaxRedirects: 5'));

check('P6-QUEUE-002 Prisma queue reclaims expired RUNNING jobs',
  prismaQueue.includes('batchStatus: ImportJobStatus.RUNNING') &&
  prismaQueue.includes('claimUntil: { lt: now }') &&
  prismaQueue.includes('Worker-crash recovery'));
check('P6-QUEUE-002 in-memory queue mirrors expired RUNNING recovery',
  memoryQueue.includes('abandonedRunning') && memoryQueue.includes('this.leases.delete(candidate.batchId)'));
check('P6-QUEUE-002 completion rejects expired leases',
  /completeClaimedJob[\s\S]*?claimUntil:\s*\{\s*gte:\s*now\s*\}/.test(prismaQueue));
check('P6-QUEUE-002 failure rejects expired leases',
  /failClaimedJob[\s\S]*?claimUntil:\s*\{\s*gte:\s*now\s*\}/.test(prismaQueue));

check('P6-REPLAY-007 fresh replay clears durable checkpoints',
  prismaQueue.includes("status: 'CHECKPOINT'") && prismaQueue.includes('deleteMany'));
check('P6-REPLAY-007 fresh replay clears lease/error/attempt state',
  prismaQueue.includes('claimedBy: null') && prismaQueue.includes('claimUntil: null') &&
  prismaQueue.includes('lastError: null') && prismaQueue.includes('attemptCount: 0'));

check('P6-QUEUE-003 live staging persists CREATED before queue ownership',
  adminImport.includes('batchStatus: durableWorkerPath ? ImportJobStatus.CREATED') &&
  adminImport.includes('_phase6HandoffEnvelope'));
check('P6-QUEUE-003 live staging enqueues before worker processing',
  adminImport.indexOf('enqueueImportJob({') > 0 &&
  adminImport.indexOf('enqueueImportJob({') < adminImport.indexOf('importWorkerProtocol!.runOne'));
check('P6-QUEUE-003 worker supports targeted claims',
  worker.includes('batchId?: string') && worker.includes('batchId,'));
check('P6-QUEUE-003 composition wires worker protocol into ImportAdminUseCases',
  container.includes('importWorkerProtocol: asFunction') &&
  container.includes('new ImportAdminUseCases(importRepository, importQueueGateway, importHandoffDispatcher, importWorkerProtocol)'));

check('P6-DUR-004 local raw snapshot storage is development-only',
  rawStore.includes("persistenceClassification = 'DEVELOPMENT_ONLY'"));
check('P6-DUR-004 production raw snapshots fail closed without durable provider',
  runtimePolicy.includes("createUnavailableCapability('durableImportRawSnapshotStore')") &&
  container.includes('createImportRawSnapshotStoreForRuntime'));
check('P6-DUR-004 active composition no longer constructs LocalImportRawSnapshotStore directly',
  !container.includes('new LocalImportRawSnapshotStore('));

check('P5-EVT-004 enterprise events have durable Prisma repository',
  eventRepo.includes("persistenceClassification = 'DURABLE'") && schema.includes('model EnterpriseEventRecord'));
check('P5-EVT-004 publishing atomically updates event and appends outbox',
  eventPublisher.includes('this.prisma.$transaction') &&
  eventPublisher.includes('enterpriseEventRecord') &&
  eventPublisher.includes('transactionalOutboxRecord') &&
  eventPublisher.includes('OutboxProcessingState.PENDING'));
check('P5-EVT-004 production composition does not use process-local event adapters',
  container.includes('new PrismaEnterpriseEventRepository(prisma)') &&
  container.includes('new PrismaEventPublishingGateway(prisma)') &&
  container.includes("createUnavailableCapability('enterpriseEventPersistence')"));
check('P5-EVT-004 migration source exists for durable event record',
  migration.includes('CREATE TABLE "EnterpriseEventRecord"') && migration.includes('reference_key'));

const misleadingNoopNames = [
  'InMemoryMonitorRepository','InMemoryMonitoringExecutionGateway','InMemorySecurityEnforcementGateway',
  'InMemoryConfigurationResolutionGateway','InMemoryLocalizationExecutionGateway','InMemoryLoggingExecutionGateway',
  'InMemorySharedComponentRenderingGateway','InMemoryApiExposureGateway','InMemoryCacheExecutionGateway',
  'InMemoryIntegrationExecutionGateway','InMemorySearchEngineGateway','InMemoryWorkflowExecutionGateway',
  'PrismaServiceCatalogRepository','PrismaCareerPathRepository','PrismaAlumniRepository','InMemorySettingsRepository',
  'InMemoryAuthService','InMemoryFileRepository','PrismaConfigurationRepository','PrismaSettingsRepository',
  'PrismaNotificationIntentRepository','PrismaNotificationTemplateRepository','JwtTokenService','BcryptPasswordHashingService',
  'MemoryFileRepository','S3FileRepository','PostgresFileRepository','FileIntegrityService','LocalDiskFileRepository',
  'InMemorySettingDefinitionRepository','InMemorySettingAssignmentRepository','InMemoryFileRecordRepository',
  'MockStorageProviderGateway','InMemoryNotificationIntentRepository','InMemoryNotificationTemplateRepository',
  'MockNotificationPreferenceGateway','InMemorySearchRequestRepository','InMemoryCacheEntryRepository',
  'InMemoryWorkflowRepository','InMemoryApiServiceRepository','InMemorySharedComponentRepository',
  'InMemoryComponentRenderingGateway','InMemoryLogEntryRepository','InMemoryLogExecutionGateway',
  'InMemorySecurityPolicyRepository','InMemoryConfigurationRepository','InMemoryIntegrationRepository',
  'InMemoryLocalizationRepository','PrismaCareerRepository','LocalStorageProvider','StorageService','DefaultMonitoringProvider',
];
check('P3-INFRA-001 misleading empty implementation exports removed',
  misleadingNoopNames.every((name) => !new RegExp(`export class ${name}\\b`).test(infraIndex)));
check('P4-STORAGE-001 storage baseline explicitly records W2 compatibility cleanup',
  phase4Storage.includes('W2 compatibility cleanup') && phase4Storage.includes('DEVELOPMENT_ONLY'));



// MNT-AUD-0095 / MNT-AUD-0056 — canonical domain/type-safety remediation.
const domainBarrel = read('packages/domain/src/index.ts');
const dummyInventory = read('docs/remediation/MNT-AUD-0095-GENERATED-DUMMY-MIGRATION-INVENTORY.md');
const identityProvisioning = read('packages/application/src/identity/ProvisionIdentityUseCase.ts');
const identityMapper = read('packages/application/src/identity/mapper.ts');
const identityDtos = read('packages/application/src/identity/dtos.ts');
const identityRouter = read('apps/api/src/presentation/api/router/IdentityRouter.ts');
const strictSchemas = read('apps/api/src/presentation/validation/StrictControlPlaneSchemas.ts');
const foundationContractDir = path.join(root, 'packages/domain/src/foundation-contracts');
const foundationSources = fs.readdirSync(foundationContractDir)
  .filter((name) => name.endsWith('.ts'))
  .map((name) => fs.readFileSync(path.join(foundationContractDir, name), 'utf8'))
  .join('\n');

check('MNT-AUD-0095 production domain barrel does not export generated dummy',
  domainBarrel.includes("export * from './foundation-contracts';") &&
  !domainBarrel.includes('generated/dummy') &&
  !fs.existsSync(path.join(root, 'packages/domain/src/generated/dummy.ts')));
check('MNT-AUD-0095 replacement foundation contracts reject permissive dummy signatures',
  !/\bany\b/.test(foundationSources) && !/\bDUMMY\b/.test(foundationSources) && !/constructor\s*\(\.\.\./.test(foundationSources));
check('MNT-AUD-0095 historical dummy export inventory is explicitly classified',
  dummyInventory.includes('195') && dummyInventory.includes('173') &&
  dummyInventory.includes('FORMALLY_DEFERRED') && dummyInventory.includes('Scholarship'));
check('MNT-AUD-0056 identity provisioning/mapper no longer suppress TypeScript',
  !/@ts-nocheck|@ts-ignore/.test(identityProvisioning + identityMapper) &&
  !/\bas any\b|:\s*any\b|<any>/.test(identityProvisioning + identityMapper));
check('MNT-AUD-0056 provisioning actor is server-owned and absent from client schema',
  /createdBy:\s*string/.test(identityDtos) &&
  !/technicalMetadata/.test(identityDtos.match(/export interface ProvisionIdentityInput \{([\s\S]*?)\n\}/)?.[1] ?? '') &&
  /createdBy: req\.authUserId/.test(identityRouter) &&
  !/createdBy|technicalMetadata/.test(strictSchemas.match(/export const identityProvisionSchema = z\.object\(\{([\s\S]*?)\}\)\.strict\(\);/)?.[1] ?? ''));


const persistenceAdr = read('docs/architecture/adr/ADR-028-Shared-Relational-Persistence-Boundary.md');
const persistenceManifest = JSON.parse(read('docs/architecture/persistence/persistence-ownership.manifest.json'));
const persistenceVerifier = read('scripts/architecture/verify-persistence-boundaries.mjs');
const phase2Boundaries = read('docs/phases/phase-02-solution-architecture/phase-02-04-bounded-context-design.md');
const phase2Physical = read('docs/phases/phase-02-solution-architecture/phase-02-06-database-physical-design.md');
check('MNT-AUD-0088 ADR-028 formally selects shared relational ownership strategy',
  persistenceAdr.includes('Select remediation option **(b)**') &&
  persistenceAdr.includes('Direct ORM mutation of another Domain owner') &&
  persistenceAdr.includes('independent review'));
check('MNT-AUD-0088 persistence ownership manifest covers every Prisma model',
  Object.keys(persistenceManifest.models).length === [...schema.matchAll(/^model\s+(\w+)\s*\{/gm)].length &&
  persistenceManifest.strategy === 'SHARED_POSTGRESQL_SINGLE_SCHEMA_WITH_ENFORCED_DOMAIN_OWNERSHIP');
check('MNT-AUD-0088 source guard enforces zero cross-context mutations and approved reads',
  persistenceVerifier.includes('forbidden cross-context mutation') &&
  persistenceVerifier.includes('unapproved cross-context read') &&
  persistenceVerifier.includes('MANARATAK_MIGRATION_OWNER'));
check('MNT-AUD-0088 Phase 02 active authority reconciles schema-isolation drift',
  phase2Boundaries.includes('ADR-028 persistence supersession') &&
  phase2Physical.includes('Canonical persistence override — ADR-028'));


const greenfieldParity = read('scripts/database/verify-greenfield-migration-parity.sh');
const greenfieldParityRunbook = read('docs/operations/GREENFIELD_MIGRATION_PARITY_VERIFICATION.md');
check('MNT-AUD-0041 source contains authoritative greenfield migration replay + parity diff',
  greenfieldParity.includes('migrate deploy') &&
  greenfieldParity.includes('--from-url') && greenfieldParity.includes('--from-migrations') &&
  greenfieldParity.includes('--to-schema-datamodel') && greenfieldParity.includes('--shadow-database-url') &&
  greenfieldParity.includes('--exit-code'));
check('MNT-AUD-0041 verifier fails closed on unsafe targets and catalog anomalies',
  greenfieldParity.includes('GREENFIELD_DATABASE_IS_DISPOSABLE') &&
  greenfieldParity.includes('TARGET_AND_SHADOW_MUST_DIFFER') &&
  greenfieldParity.includes('Invalid indexes detected') &&
  greenfieldParity.includes('Unvalidated constraints detected'));
check('MNT-AUD-0041 runbook separates source proof from disposable-DB runtime evidence',
  greenfieldParityRunbook.includes('Source verification alone does not claim database parity') &&
  greenfieldParityRunbook.includes('db push` is not an acceptable staging/production provisioning mechanism'));


const databaseBaselineSource = read('scripts/db-remediation-gate.ts');
const databaseBaselineManifest = JSON.parse(read('scripts/database/database-baseline.manifest.json'));
const databaseBaselineComparator = read('scripts/database/compare-database-baselines.mjs');
check('MNT-AUD-0083 migration ledger and required counters fail closed',
  databaseBaselineSource.includes('BASELINE_REQUIRED_COUNTER_UNAVAILABLE') &&
  databaseBaselineSource.includes('MIGRATION_LEDGER_INVALID') &&
  !databaseBaselineSource.includes('.catch(() => [])') &&
  !databaseBaselineSource.includes("number | 'UNAVAILABLE'") &&
  !databaseBaselineSource.includes("return [name, 'UNAVAILABLE']"));
check('MNT-AUD-0083 baseline manifest covers all persistence-owned models',
  Object.keys(databaseBaselineManifest.models).length === Object.keys(persistenceManifest.models).length &&
  Object.values(databaseBaselineManifest.models).every((item) => item.required === true && Boolean(item.owner)));
check('MNT-AUD-0083 artifacts include identity and source fingerprints',
  databaseBaselineSource.includes('databaseTargetIdentity') &&
  databaseBaselineSource.includes('schemaSha256') && databaseBaselineSource.includes('migrationChainSha256') &&
  databaseBaselineSource.includes('commandVersion') && databaseBaselineSource.includes('capturedAt'));
check('MNT-AUD-0083 before/after comparison requires declared count tolerances',
  databaseBaselineComparator.includes('outside declared tolerance') &&
  databaseBaselineComparator.includes('allowSchemaHashChange') &&
  databaseBaselineComparator.includes('allowMigrationChainChange'));


const seedManifest = JSON.parse(read('scripts/database/greenfield-seed.manifest.json'));
const seedOrchestrator = read('scripts/database/seed-orchestrator.mjs');
const seedReconciliation = read('scripts/database/verify-seed-reconciliation.ts');
const packageJson = JSON.parse(read('package.json'));
check('MNT-AUD-0035 canonical ordered seed manifest and fail-closed orchestrator exist',
  seedManifest.authority === 'MNT-AUD-0035' &&
  seedManifest.policy.abortBeforeFirstMutationWhenBlocked === true &&
  seedOrchestrator.includes('SEED_PRECONDITION_BLOCKED') &&
  seedOrchestrator.indexOf('inspection.blockers.length') < seedOrchestrator.indexOf("requireDatabaseMutationGate('greenfield-db-seed'"));
check('MNT-AUD-0035 mandatory seed versions/provenance/reconciliation contracts are explicit',
  seedManifest.steps.filter((step) => step.required).every((step) => Boolean(step.owner) && Boolean(step.provenance) && Boolean(step.expected)) &&
  seedReconciliation.includes('SEED_RECONCILIATION_EXACT_MISMATCH') &&
  seedReconciliation.includes('SEED_RECONCILIATION_MINIMUM_MISMATCH'));
check('MNT-AUD-0035 current P7 dataset blockers are explicit rather than silently seeded',
  seedManifest.steps.find((step) => step.id === 'reference-countries')?.state === 'BLOCKED_SOURCE_REVIEW' &&
  seedManifest.steps.find((step) => step.id === 'reference-currencies')?.state === 'BLOCKED_SOURCE_DATASET_MISSING' &&
  seedManifest.steps.find((step) => step.id === 'reference-languages')?.state === 'BLOCKED_SOURCE_DATASET_MISSING');
check('MNT-AUD-0035 root DB commands distinguish production provisioning from development mutations',
  Boolean(packageJson.scripts['db:migrate:deploy']) && Boolean(packageJson.scripts['db:seed']) &&
  Boolean(packageJson.scripts['db:provision']) && Boolean(packageJson.scripts['db:provision:verify']) &&
  Boolean(packageJson.scripts['db:dev:push']) && Boolean(packageJson.scripts['db:dev:migrate']) &&
  !packageJson.scripts['db:push'] && !packageJson.scripts['db:migrate']);


const referenceGovernance = read('packages/domain/src/reference-data/governance/ReferenceGovernance.ts');
const referenceContracts = read('packages/domain/src/reference-data/dto/ReferenceDataContracts.ts');
const referenceRepository = read('packages/infrastructure/src/reference-data/PrismaReferenceDataRepository.ts');
const referenceRouter = read('apps/api/src/presentation/api/router/ReferenceDataAdminRouter.ts');
const referenceMigration = read('packages/infrastructure/prisma/migrations/20260906204000_reference_governance_lifecycle/migration.sql');
check('MNT-AUD-0013 typed canonical lifecycle and terminal transition rules are source-enforced',
  referenceGovernance.includes("ARCHIVED = 'ARCHIVED'") &&
  referenceGovernance.includes("SUPERSEDED = 'SUPERSEDED'") &&
  referenceGovernance.includes("MERGED = 'MERGED'") &&
  referenceGovernance.includes('REFERENCE_LIFECYCLE_TERMINAL_STATE') &&
  referenceGovernance.includes('REFERENCE_LIFECYCLE_TARGET_REQUIRED'));
check('MNT-AUD-0013 DTO authority exposes lifecycle/version/effective history instead of isActive-only state',
  referenceContracts.includes('lifecycleState: ReferenceLifecycleState') &&
  referenceContracts.includes('versionNumber: number') &&
  referenceContracts.includes('effectiveFrom: Date') &&
  referenceContracts.includes('ReferenceAliasInput') &&
  referenceContracts.includes('ReferenceProviderMappingInput'));
check('MNT-AUD-0013 alias/provider resolution uses explicit governed stores, not metadata JSON',
  referenceRepository.includes('FROM "ReferenceAliasRecord"') &&
  referenceRepository.includes('FROM "ReferenceProviderMappingRecord"') &&
  !/jsonb_array_elements[\s\S]{0,300}metadata/.test(referenceRepository));
check('MNT-AUD-0013 immutable versions and supersession/merge relationship persistence are authored',
  referenceMigration.includes('CREATE TABLE "ReferenceVersionRecord"') &&
  referenceMigration.includes('CREATE TABLE "ReferenceRelationshipRecord"') &&
  referenceMigration.includes('MNT-AUD-0013_BASELINE') &&
  referenceMigration.includes('ReferenceRelationshipRecord_no_self_check'));
check('MNT-AUD-0013 Admin lifecycle authority is a dedicated audited command surface',
  referenceRouter.includes('/governance/:entityType/:referenceId/lifecycle') &&
  referenceRouter.includes('/governance/:entityType/:referenceId/history') &&
  referenceRouter.includes('/governance/:entityType/:referenceId/relationships') &&
  !referenceRouter.includes('isActive: z.boolean().optional()') &&
  referenceRepository.includes('transitionReferenceLifecycleInTransaction'));



const assetReferencePolicy = read('packages/application/src/asset-platform/AssetReferencePolicy.ts');
const assetUsageRegistry = read('packages/infrastructure/src/asset-platform/PrismaAssetUsageRegistryGateway.ts');
const assetUsageContract = read('packages/domain/src/asset-platform/gateways/IAssetUsageRegistryGateway.ts');
const assetLifecycleUseCase = read('packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts');
const assetReferenceManifest = JSON.parse(read('docs/architecture/persistence/asset-reference-ownership.manifest.json'));
const assetIntegrityVerifier = read('scripts/architecture/verify-asset-reference-integrity.mjs');
const studentWorkspaceAssets = read('packages/application/src/students/use-cases/StudentWorkspaceUseCases.ts');
const cmsAssets = read('packages/application/src/cms/use-cases/CmsUseCases.ts');
const universityAssets = read('packages/application/src/universities/use-cases/AdminUniversityUseCases.ts');
const internationalTestAssets = read('packages/application/src/tests-platform/use-cases/InternationalTestUseCases.ts');
const referenceAssets = read('packages/application/src/reference-data/use-cases/ReferenceDataUseCases.ts');
const destinationAssets = read('packages/application/src/study-destinations/StudyDestinationUseCases.ts');
const studentToolAssets = read('packages/application/src/student-tools/use-cases/StudentToolRegistryUseCases.ts');
const serviceAssets = read('packages/application/src/services-platform/use-cases/AdminServiceCatalogUseCases.ts');
const careerAssets = read('packages/application/src/career-alumni/use-cases/CareerAdminUseCases.ts');
const courseAssets = read('packages/application/src/courses/use-cases/AdminCourseUseCases.ts');
check('MNT-AUD-0030 canonical AssetReferencePolicy enforces existence/state/classification/owner boundaries',
  assetReferencePolicy.includes('ASSET_NOT_FOUND') &&
  assetReferencePolicy.includes('ASSET_STATE_NOT_ALLOWED') &&
  assetReferencePolicy.includes('ASSET_CLASSIFICATION_NOT_ALLOWED') &&
  assetReferencePolicy.includes('ASSET_OWNER_MISMATCH') &&
  assetReferencePolicy.includes('RAW_ASSET_REFERENCE_FORBIDDEN') &&
  assetReferencePolicy.includes('ASSET_REFERENCE_POLICY_REQUIRED'));
check('MNT-AUD-0030 weak consumer domains compose the P05 asset policy before persistence',
  [studentWorkspaceAssets, cmsAssets, universityAssets, internationalTestAssets, referenceAssets, destinationAssets, studentToolAssets, serviceAssets, careerAssets, courseAssets]
    .every((source) => source.includes('AssetReferencePolicy') &&
      (source.includes('assertAssetReferenceUsable') || source.includes('assertAssetReferencesUsable')) &&
      !/assetReferences\?\.assert(?:Usable|AllUsable)/.test(source)));
check('MNT-AUD-0030 asset reference manifest covers direct Prisma AssetId fields and JSON-owned CMS references',
  assetReferenceManifest.authority === 'MNT-AUD-0030/MNT-AUD-0050' &&
  assetReferenceManifest.directReferences.length === [...schema.matchAll(/^\s*(\w*(?:AssetId|assetId))\s+String\??/gm)].length &&
  assetReferenceManifest.jsonReferences.some((item) => item.field === 'seoMetadata.openGraphAssetId') &&
  assetReferenceManifest.jsonReferences.some((item) => item.field === 'attachmentAssetIds') &&
  assetIntegrityVerifier.includes('ASSET_REFERENCE_MANIFEST_DRIFT'));
check('MNT-AUD-0050 production composition uses derived Prisma asset usage authority instead of UNAVAILABLE',
  container.includes('new PrismaAssetUsageRegistryGateway(prisma)') &&
  !container.includes("createUnavailableCapability('assetUsageRegistry')") &&
  assetUsageRegistry.includes('ASSET_USAGE_REGISTRY_IS_DERIVED_READ_ONLY'));
check('MNT-AUD-0050 purge fail-closes with concrete usage evidence',
  assetUsageContract.includes('findUsages?') &&
  assetLifecycleUseCase.includes('usageRegistry.findUsages') &&
  assetLifecycleUseCase.includes('Cannot purge asset') &&
  assetUsageRegistry.includes('cmsPublishedContent') &&
  assetUsageRegistry.includes('seoMetadata') &&
  assetUsageRegistry.includes('attachmentAssetIds'));



const workflowPersistence = read('packages/infrastructure/src/workflow/PrismaWorkflowRepository.ts');
const apiServicePersistence = read('packages/infrastructure/src/api-foundation/PrismaApiServiceRepository.ts');
const componentPersistence = read('packages/infrastructure/src/shared-components/PrismaSharedComponentRepository.ts');
const workflowExecutionProjection = read('packages/infrastructure/src/workflow/PrismaWorkflowExecutionGateway.ts');
const apiExposureProjection = read('packages/infrastructure/src/api-foundation/PrismaApiExposureGateway.ts');
const componentRenderingProjection = read('packages/infrastructure/src/shared-components/PrismaComponentRenderingGateway.ts');
const foundationMigration = read('packages/infrastructure/prisma/migrations/20260906223000_foundation_control_plane_persistence/migration.sql');
check('MNT-AUD-0049 mounted Foundation control-plane repositories are durable Prisma adapters',
  container.includes('new PrismaWorkflowRepository(prisma)') && container.includes('new PrismaApiServiceRepository(prisma)') && container.includes('new PrismaSharedComponentRepository(prisma)') &&
  !container.includes("createUnavailableCapability('workflowPersistence')") && !container.includes("createUnavailableCapability('apiServicePersistence')") && !container.includes("createUnavailableCapability('sharedComponentPersistence')") &&
  workflowPersistence.includes('workflowControlRecord.upsert') && apiServicePersistence.includes('apiServiceControlRecord.upsert') && componentPersistence.includes('sharedComponentControlRecord.upsert'));
check('MNT-AUD-0049 execution/exposure/rendering dependencies are operational durable projections',
  container.includes('new PrismaWorkflowExecutionGateway(prisma)') && container.includes('new PrismaApiExposureGateway(prisma)') && container.includes('new PrismaComponentRenderingGateway(prisma)') &&
  workflowExecutionProjection.includes('workflowExecutionProjection.upsert') && apiExposureProjection.includes('apiServiceExposureProjection.upsert') && componentRenderingProjection.includes('sharedComponentRenderingProjection.upsert'));
check('MNT-AUD-0049 Prisma schema and migration author all Foundation control-plane persistence',
  ['WorkflowControlRecord','ApiServiceControlRecord','SharedComponentControlRecord','WorkflowExecutionProjection','ApiServiceExposureProjection','SharedComponentRenderingProjection'].every((model) => schema.includes(`model ${model}`)) &&
  foundationMigration.includes('-- MANARATAK_MIGRATION_OWNER: foundation_control_plane') && foundationMigration.includes('-- MANARATAK_ARCH_DECISION: ADR-028') &&
  foundationMigration.includes('CREATE TABLE "WorkflowControlRecord"') && foundationMigration.includes('CREATE TABLE "ApiServiceControlRecord"') && foundationMigration.includes('CREATE TABLE "SharedComponentControlRecord"'));





const serviceOperationsDomain = read('packages/domain/src/services-platform/operations.ts');
const serviceOperationsUseCases = read('packages/application/src/services-platform/use-cases/ServiceOperationsUseCases.ts');
const serviceOperationsRepository = read('packages/infrastructure/src/services-platform/PrismaServiceOperationsRepository.ts');
const serviceOperationsMigration = read('packages/infrastructure/prisma/migrations/20260906231000_phase20_service_operations_owner_scope/migration.sql');
check('MNT-AUD-0058 Phase 20 retained owner scope has first-class typed contracts and governed use cases',
  ['ServiceProviderDto','ServicePackageDto','ServicePricingDto','ServiceDiscountDto','ServicePromotionDto','ServiceAvailabilitySlotDto','ServiceBookingDto','ServiceWorkflowDefinitionDto','ServiceWorkflowExecutionDto','ServiceDeliveryArtifactDto','IServiceOperationsRepository']
    .every((symbol) => serviceOperationsDomain.includes(symbol)) &&
  ['registerProvider','createPackage','createPricing','createDiscount','createPromotion','createAvailabilitySlot','createBooking','createWorkflowDefinition','startWorkflow','addDeliveryArtifact']
    .every((method) => serviceOperationsUseCases.includes(`async ${method}`)) &&
  serviceOperationsUseCases.includes('SERVICE_PROVIDER_NOT_QUALIFIED') && serviceOperationsUseCases.includes('SERVICE_TIMEZONE_INVALID'));
check('MNT-AUD-0058 booking/pricing/capacity/delivery invariants are enforced at owner persistence boundary',
  serviceOperationsRepository.includes("isolationLevel: 'Serializable'") &&
  serviceOperationsRepository.includes('SERVICE_BOOKING_CAPACITY_EXHAUSTED') &&
  serviceOperationsRepository.includes('SERVICE_PROVIDER_CONCURRENT_CAPACITY_EXHAUSTED') &&
  serviceOperationsRepository.includes('SERVICE_BOOKING_PRICING_SNAPSHOT_STALE') &&
  serviceOperationsRepository.includes('SERVICE_DISCOUNT_ATOMIC_REDEMPTION_CONFLICT') &&
  serviceOperationsRepository.includes('redemptionCount: discount.redemptionCount') &&
  serviceOperationsRepository.includes('SERVICE_DISCOUNT_REDEMPTION_LIMIT_REACHED') &&
  serviceOperationsUseCases.includes('pricingFingerprint: pricing.immutableFingerprint') &&
  serviceOperationsUseCases.includes("purpose: 'SERVICE_DELIVERY_ARTIFACT'"));
check('MNT-AUD-0058 Prisma owner scope is real and later-wave runtime composition is explicitly deferred',
  ['ServiceProviderRecord','ServicePackageRecord','ServicePricingRecord','ServiceDiscountRecord','ServicePromotionRecord','ServiceAvailabilitySlotRecord','ServiceBookingRecord','ServiceWorkflowDefinitionRecord','ServiceWorkflowExecutionRecord','ServiceDeliveryArtifactRecord']
    .every((model) => schema.includes(`model ${model}`)) &&
  serviceOperationsMigration.includes('-- MANARATAK_MIGRATION_OWNER: services') && serviceOperationsMigration.includes('-- MANARATAK_ARCH_DECISION: ADR-028') &&
  !container.includes('serviceOperationsUseCases:') && !container.includes('serviceOperationsRepository:'));

const careerEngagementContract = read('packages/domain/src/career-alumni/contracts/ICareerEngagementRepository.ts');
const careerEngagementEntities = read('packages/domain/src/career-alumni/entities/CareerEngagement.ts');
const careerEngagementUseCases = read('packages/application/src/career-alumni/use-cases/CareerEngagementUseCases.ts');
const careerEngagementRepository = read('packages/infrastructure/src/career-alumni/PrismaCareerEngagementRepository.ts');
const careerOwnershipGateway = read('packages/application/src/career-alumni/gateways/Phase15CareerStudentOwnershipGateway.ts');
const careerEngagementMigration = read('packages/infrastructure/prisma/migrations/20260906234000_phase21_career_engagement_owner_scope/migration.sql');
check('MNT-AUD-0055 Career owner scope implements profiles, applications/CV and alumni contracts',
  careerEngagementContract.includes('ICareerEngagementRepository') && careerEngagementContract.includes('ICareerStudentOwnershipGateway') &&
  ['CareerProfileDto','CareerApplicationDto','CareerAlumniProfileDto'].every((symbol) => careerEngagementEntities.includes(symbol)) &&
  ['upsertCareerProfile','submitApplication','withdrawApplication','reviewApplication','upsertAlumniProfile'].every((method) => careerEngagementUseCases.includes(`async ${method}`)));
check('MNT-AUD-0055 application ownership, snapshot, AssetId, consent and optimistic concurrency fail closed',
  careerEngagementUseCases.includes('assertActiveStudent') &&
  careerEngagementUseCases.includes("purpose: 'CAREER_APPLICATION_CV'") && careerEngagementUseCases.includes('expectedOwnerId: input.studentReferenceId') &&
  careerEngagementUseCases.includes('jobSnapshot: {') && careerEngagementUseCases.includes('CAREER_ALUMNI_PUBLIC_VISIBILITY_REQUIRES_CONSENT') &&
  careerEngagementUseCases.includes('CAREER_ALUMNI_CONSENT_ACTOR_MISMATCH') && careerEngagementUseCases.includes('consentActorStudentReferenceId !== input.studentReferenceId') &&
  careerEngagementEntities.includes('consentGrantedBy') && careerEngagementEntities.includes('consentRevokedBy') &&
  careerEngagementRepository.includes('CAREER_APPLICATION_VERSION_CONFLICT') && careerEngagementRepository.includes('CAREER_PROFILE_VERSION_CONFLICT') && careerEngagementRepository.includes('CAREER_ALUMNI_VERSION_CONFLICT') &&
  careerOwnershipGateway.includes('StudentWorkspaceStatus.ACTIVE'));
check('MNT-AUD-0055 Prisma owner scope is real and later-wave runtime composition is explicitly deferred',
  ['CareerProfileRecord','CareerApplicationRecord','CareerAlumniProfileRecord'].every((model) => schema.includes(`model ${model}`)) &&
  careerEngagementMigration.includes('-- MANARATAK_MIGRATION_OWNER: career') && careerEngagementMigration.includes('-- MANARATAK_ARCH_DECISION: ADR-028') &&
  careerEngagementMigration.includes('"jobSnapshot" JSONB NOT NULL') &&
  !container.includes('careerEngagementUseCases:') && !container.includes('careerEngagementRepository:') && !container.includes('careerStudentOwnershipGateway:'));


const disposableDbGuard = read('scripts/lib/disposable-database-target-guard.mjs');
const disposableDbRunner = read('scripts/database/run-disposable-prisma-mutation.mjs');
check('MNT-AUD-0075 direct root Prisma mutations are removed and disposable dev commands are guarded',
  !packageJson.scripts['db:push'] && !packageJson.scripts['db:migrate'] &&
  packageJson.scripts['db:dev:push'] === 'node scripts/database/run-disposable-prisma-mutation.mjs push' &&
  packageJson.scripts['db:dev:migrate'] === 'node scripts/database/run-disposable-prisma-mutation.mjs migrate-dev' &&
  disposableDbGuard.includes("DATABASE_TARGET_CLASS must equal DISPOSABLE") &&
  disposableDbGuard.includes('ALLOW_DISPOSABLE_DB_MUTATIONS must equal YES') &&
  disposableDbGuard.includes('forbidden for disposable Prisma mutations') &&
  disposableDbRunner.includes('requireDisposableDatabaseTarget'));

const recoveryManifest = JSON.parse(read('scripts/database/migration-recovery.manifest.json'));
const recoveryPolicy = read('docs/operations/DATABASE_MIGRATION_RECOVERY_POLICY.md');
const dbRemediationGate = read('scripts/db-remediation-gate.ts');
const migrationDirs = fs.readdirSync(path.join(root, 'packages/infrastructure/prisma/migrations'), { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
check('MNT-AUD-0079 every migration has fail-closed recovery classification and artifact authority',
  recoveryManifest.authority === 'MNT-AUD-0079' &&
  Object.keys(recoveryManifest.migrations).length === migrationDirs.length &&
  migrationDirs.every((id) => {
    const rule = recoveryManifest.migrations[id];
    return rule && ['ROLLBACK_SQL','BACKUP_RESTORE_REQUIRED','FORWARD_FIX_ONLY'].includes(rule.recoveryClass) && rule.artifact && rule.decision;
  }) &&
  recoveryPolicy.includes('DATABASE_RECOVERY_EVIDENCE_FILE') &&
  dbRemediationGate.includes('validateRecoveryPlanSource') &&
  !dbRemediationGate.includes("item.id.includes('transactional_outbox')") &&
  dbRemediationGate.includes('DATABASE_RECOVERY_EVIDENCE_FILE_REQUIRED') &&
  dbRemediationGate.includes("'migrate', 'diff'"));

const identifierGenerator = read('packages/core/src/domain/IdentifierGenerator.ts');
const coreEntity = read('packages/core/src/domain/Entity.ts');
const identityAggregate = read('packages/domain/src/aggregates/Identity.ts');
const scholarshipAuthoring = read('packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts');
const mergeProposal = read('packages/application/src/import-foundation/services/MergeProposalPreparationService.ts');
const localAssetStorage = read('packages/infrastructure/src/asset-platform/LocalAssetStorageGateway.ts');
check('MNT-AUD-0057 canonical persisted identifier generator is cryptographic and fail-closed',
  identifierGenerator.includes('CryptographicIdentifierGenerator') && identifierGenerator.includes('globalThis.crypto') && identifierGenerator.includes('randomUUID') &&
  identifierGenerator.includes('CRYPTO_RANDOM_UUID_UNAVAILABLE') && !identifierGenerator.includes('Math.random'));
check('MNT-AUD-0057 persisted/public identity paths no longer use Math.random',
  [coreEntity, identityAggregate, scholarshipAuthoring, mergeProposal, localAssetStorage, container].every((source) => !source.includes('Math.random(')) &&
  coreEntity.includes('generateOpaqueIdentifier') && identityAggregate.includes('generateOpaqueIdentifier') && scholarshipAuthoring.includes('generateOpaqueIdentifier') && mergeProposal.includes('generateOpaqueIdentifier'));

const servicePlatformDomain = read('packages/domain/src/services-platform/index.ts');
const servicePlatformRepository = read('packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts');
const serviceCatalogUseCases = read('packages/application/src/services-platform/use-cases/AdminServiceCatalogUseCases.ts');
const serviceRequestUseCases = read('packages/application/src/services-platform/use-cases/ServiceRequestUseCases.ts');
const serviceAdminRouter = read('apps/api/src/presentation/api/router/ServiceAdminRouter.ts');
const careerEmployerDomain = read('packages/domain/src/career-alumni/entities/CareerEmployer.ts');
const careerJobDomain = read('packages/domain/src/career-alumni/entities/CareerJobPosting.ts');
const careerRepository = read('packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts');
const careerAdminUseCases = read('packages/application/src/career-alumni/use-cases/CareerAdminUseCases.ts');
const careerAdminRouter = read('apps/api/src/presentation/api/router/CareerAdminRouter.ts');
const optimisticConcurrencyMigration = read('packages/infrastructure/prisma/migrations/20260906235500_phase20_phase21_optimistic_concurrency/migration.sql');
const servicesAdminPage = read('apps/admin/src/pages/ServicesAdminPage.tsx');
const careerAdminPage = read('apps/admin/src/pages/CareerAdminPage.tsx');
check('MNT-AUD-0096 late-domain mutable records expose monotonic versions in schema and DTOs',
  ['ServiceCatalogRecord','ServiceRequestRecord','CareerEmployerRecord','CareerJobPostingRecord'].every((model) => {
    const match = schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`));
    return Boolean(match && /version\s+Int\s+@default\(1\)/.test(match[1]) && /@@unique\(\[id, version\]\)/.test(match[1]));
  }) &&
  /version: number;/.test(servicePlatformDomain) && /version: number;/.test(careerEmployerDomain) && /version: number;/.test(careerJobDomain));
check('MNT-AUD-0096 repositories fence every core Service/Career mutation with id+expectedVersion and increment',
  servicePlatformRepository.includes('id_version: { id, version: expectedVersion }') &&
  servicePlatformRepository.includes("SERVICE_CATALOG_VERSION_CONFLICT") && servicePlatformRepository.includes("SERVICE_REQUEST_VERSION_CONFLICT") &&
  careerRepository.includes('id_version: { id, version: expectedVersion }') &&
  careerRepository.includes("CAREER_EMPLOYER_VERSION_CONFLICT") && careerRepository.includes("CAREER_JOB_VERSION_CONFLICT") &&
  [servicePlatformRepository, careerRepository].every((source) => source.includes('version: { increment: 1 }')));
check('MNT-AUD-0096 application and HTTP mutation boundaries require expectedVersion',
  serviceCatalogUseCases.includes('SERVICE_EXPECTED_VERSION_REQUIRED') && serviceRequestUseCases.includes('SERVICE_REQUEST_EXPECTED_VERSION_REQUIRED') &&
  careerAdminUseCases.includes('CAREER_EXPECTED_VERSION_REQUIRED') &&
  serviceAdminRouter.includes('expectedVersion: z.number().int().positive()') && careerAdminRouter.includes('expectedVersionSchema') &&
  servicesAdminPage.includes('expectedVersion: service.version') && careerAdminPage.includes('expectedVersion: employer.version') && careerAdminPage.includes('expectedVersion: job.version'));
check('MNT-AUD-0096 controlled migration adds version fences for all four legacy late-domain aggregates',
  optimisticConcurrencyMigration.includes('-- MNT-AUD-0096:') &&
  ['ServiceCatalogRecord','ServiceRequestRecord','CareerEmployerRecord','CareerJobPostingRecord'].every((model) =>
    optimisticConcurrencyMigration.includes(`ALTER TABLE "${model}" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;`) &&
    optimisticConcurrencyMigration.includes(`CREATE UNIQUE INDEX "${model}_id_version_key"`)));

const retentionDomain = read('packages/domain/src/retention/index.ts');
const retentionSweepUseCase = read('packages/application/src/retention/RetentionSweepUseCase.ts');
const retentionDecisionRepository = read('packages/infrastructure/src/retention/PrismaRetentionDecisionRepository.ts');
const importRetentionGateway = read('packages/infrastructure/src/retention/PrismaImportRetentionGateway.ts');
const auditRetentionGateway = read('packages/infrastructure/src/retention/PrismaAuditRetentionGateway.ts');
const assetRetentionGateway = read('packages/infrastructure/src/retention/PrismaAssetRetentionGateway.ts');
const retentionMigration = read('packages/infrastructure/prisma/migrations/20260907001500_retention_policy_enforcement/migration.sql');
const retentionRunbook = read('docs/operations/RETENTION_LIFECYCLE_POLICY.md');
check('MNT-AUD-0081 canonical policy distinguishes owner disposition and legal hold',
  retentionDomain.includes("PURGE = 'PURGE'") && retentionDomain.includes("ARCHIVE = 'ARCHIVE'") && retentionDomain.includes("KEEP = 'KEEP'") &&
  retentionDomain.includes('LEGAL_HOLD_ACTIVE') && retentionDomain.includes('AUDIT_EVIDENCE_ARCHIVE') && retentionDomain.includes('IMPORT_RAW_PAYLOAD_EXPIRED') && retentionDomain.includes('ASSET_PERMANENT_POLICY'));
check('MNT-AUD-0081 durable sweeper is retryable/idempotent and only terminal decisions suppress retry',
  retentionSweepUseCase.includes('hasTerminalDecision') && retentionSweepUseCase.includes("result: 'FAILED'") &&
  retentionDecisionRepository.includes("result: { in: ['APPLIED', 'SKIPPED'] }") && retentionDecisionRepository.includes("input.result === 'FAILED' ? null : input.decisionKey"));
check('MNT-AUD-0081 owner gateways claim before mutation and preserve owner-specific retention semantics',
  [importRetentionGateway,auditRetentionGateway,assetRetentionGateway].every((source)=>source.includes('retentionClaimToken') && source.includes('retentionClaimUntil')) &&
  importRetentionGateway.includes('retentionPurged: true') && importRetentionGateway.includes("retentionState: 'RAW_PURGED'") &&
  auditRetentionGateway.includes("lifecycleState:'ARCHIVED'") &&
  assetRetentionGateway.includes('softDeleteAsset') && assetRetentionGateway.includes('purgeAsset'));
check('MNT-AUD-0081 schema/migration authors legal hold, claims, processed state and append-only decision evidence',
  ['ImportRecord','AuditRecord','AssetRecord'].every((model)=>{const match=schema.match(new RegExp(`model ${model} \\{([\\s\\S]*?)\\n\\}`)); return Boolean(match&&match[1].includes('legalHoldUntil')&&match[1].includes('retentionProcessedAt')&&match[1].includes('retentionClaimUntil')&&match[1].includes('retentionClaimToken'));}) &&
  schema.includes('model RetentionDecisionRecord {') && retentionMigration.includes('-- MNT-AUD-0081:'));
check('MNT-AUD-0081 owner executors remain valid when W3 durable scheduling/composition advances',
  importRetentionGateway.includes('class PrismaImportRetentionGateway') && auditRetentionGateway.includes('class PrismaAuditRetentionGateway') && assetRetentionGateway.includes('class PrismaAssetRetentionGateway') &&
  retentionSweepUseCase.includes('class RetentionSweepUseCase') &&
  (( !container.includes('retentionSweepUseCase:') && !container.includes('importRetentionGateway:') && !container.includes('auditRetentionGateway:') && !container.includes('assetRetentionGateway:') ) ||
   (container.includes('retentionSweepUseCase:') && container.includes('retentionBackgroundJobHandler:') && container.includes('durableBackgroundWorker:'))) &&
  retentionRunbook.includes('MNT-AUD-0007'));


const diReachabilityManifest = JSON.parse(read('docs/remediation/DI_RUNTIME_REACHABILITY_MANIFEST.json'));
const diReachabilityVerifier = read('scripts/architecture/verify-di-reachability.mjs');
const applicationBarrel = read('packages/application/src/index.ts');
check('MNT-AUD-0109 production DI has no orphan registrations or shadow Prisma authority',
  diReachabilityManifest.registrationCount === diReachabilityManifest.reachableCount &&
  diReachabilityManifest.unreachable.length === 0 &&
  diReachabilityManifest.registrations.every((entry) => entry.classification === 'RUNTIME_REACHABLE') &&
  !container.includes('createInMemoryPrismaClient'));
check('MNT-AUD-0109 legacy foundation orchestrators are outside canonical production exports and DI',
  ['ManageMonitorsUseCase','ManageLogsUseCase','ManageSecurityPoliciesUseCase','ManageConfigurationsUseCase','ManageIntegrationsUseCase','ManageLocalizationsUseCase']
    .every((name) => !applicationBarrel.includes(`/use-cases/${name}`)) &&
  ['manageMonitorsUseCase:','manageLogsUseCase:','manageSecurityPoliciesUseCase:','manageConfigurationsUseCase:','manageIntegrationsUseCase:','manageLocalizationsUseCase:']
    .every((name) => !container.includes(name)));
check('MNT-AUD-0109 deferred later-wave source is explicitly classified while completed W3 retention wiring is reachable',
  ['serviceOperationsUseCases','careerEngagementUseCases','monitoringRouter']
    .every((name) => diReachabilityManifest.deferredOrRemovedSource.some((entry) => entry.registration === name && entry.classification === 'FORMALLY_DEFERRED') && !container.includes(`${name}:`)) &&
  diReachabilityManifest.registrations.some((entry) => entry.name === 'retentionSweepUseCase' && entry.classification === 'RUNTIME_REACHABLE') &&
  container.includes('retentionSweepUseCase:'));
check('MNT-AUD-0109 dead diagnostic source is removed and reachability guard is executable',
  !exists('scripts/inspect_legacy.ts') &&
  diReachabilityManifest.deferredOrRemovedSource.some((entry) => entry.registration === 'inspect_legacy' && entry.classification === 'REMOVE') &&
  diReachabilityVerifier.includes('DI_REACHABILITY_VERIFY=PASS') && diReachabilityVerifier.includes('Deferred registration leaked back into production DI'));

const unicodeCanonicalization = read('packages/application/src/canonicalization/UnicodeCanonicalization.ts');
const ownerIdentityPolicies = read('packages/application/src/canonicalization/OwnerDomainIdentityPolicies.ts');
const serviceCanonicalization = read('packages/application/src/services-platform/use-cases/AdminServiceCatalogUseCases.ts');
const careerCanonicalization = read('packages/application/src/career-alumni/use-cases/CareerAdminUseCases.ts');
const serviceCanonicalizationTests = read('packages/application/tests/services-platform/AdminServiceCatalogUseCases.spec.ts');
const careerCanonicalizationTests = read('packages/application/tests/career-alumni/CareerAdminUseCases.spec.ts');
const canonicalizationBackfill = read('scripts/backfill-service-career-unicode-canonicalization.ts');
const canonicalizationGuard = read('scripts/architecture/verify-unicode-owner-canonicalization.mjs');
check('MNT-AUD-0091 shared identity authority is Unicode-aware with explicit Arabic rules',
  unicodeCanonicalization.includes("normalize('NFKC')") &&
  unicodeCanonicalization.includes('\\p{L}') && unicodeCanonicalization.includes('\\p{N}') &&
  unicodeCanonicalization.includes('[أإآٱ]') && unicodeCanonicalization.includes(".replace(/ى/gu, 'ي')") &&
  unicodeCanonicalization.includes('ARABIC_DIACRITICS') && unicodeCanonicalization.includes('ARABIC_TATWEEL'));
check('MNT-AUD-0091 Services/Careers use one canonical identity policy and Unicode slug policy',
  ownerIdentityPolicies.includes('canonicalizeServiceIdentityName') && ownerIdentityPolicies.includes('canonicalizeCareerIdentityText') &&
  serviceCanonicalization.includes('canonicalizeServiceIdentityName') && serviceCanonicalization.includes('unicodeSlugSegment') &&
  careerCanonicalization.includes('canonicalizeCareerIdentityText') && careerCanonicalization.includes('unicodeSlugSegment') &&
  !/replace\(\/\[\^a-z0-9/i.test(serviceCanonicalization + careerCanonicalization));
check('MNT-AUD-0091 Arabic create/update/dedup regression tests are authored for both owner domains',
  /خِدمةُ التأشيرات|خدمة التأشيرات/u.test(serviceCanonicalizationTests) && serviceCanonicalizationTests.includes('distinct Arabic service names') &&
  /شركةُ البُراق|مُهندس برمجيات/u.test(careerCanonicalizationTests) && careerCanonicalizationTests.includes('distinct Arabic job titles') &&
  serviceCanonicalizationTests.includes('Arabic display-name update') && careerCanonicalizationTests.includes('Arabic canonical title during update'));
check('MNT-AUD-0091 existing-data remediation is dry-run-first, collision-safe and mutation-gated',
  canonicalizationBackfill.includes("mode: apply ? 'APPLY' : 'DRY_RUN'") &&
  canonicalizationBackfill.includes('CANONICAL_DEDUP_COLLISION') && canonicalizationBackfill.includes('SLUG_COLLISION') &&
  canonicalizationBackfill.includes('__mntaud0091__') && canonicalizationBackfill.includes('Two-phase re-keying') &&
  canonicalizationBackfill.includes("allowedPurposes: ['backfill']"));
check('MNT-AUD-0091 source guard forbids regression to ASCII-only owner identity normalizers',
  canonicalizationGuard.includes('forbidden ASCII-only identity normalizer') &&
  canonicalizationGuard.includes('packages/application/src/services-platform') &&
  canonicalizationGuard.includes('packages/application/src/career-alumni'));

const passed = checks.filter((c) => c.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`W2_SOURCE_VERIFIER = ${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
