import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const checks = [];
const check = (name, condition) => checks.push({ name, ok: Boolean(condition) });

const schema = read('packages/infrastructure/prisma/schema.prisma');
const backgroundContracts = read('packages/application/src/background-jobs/workers/DurableBackgroundJobContracts.ts');
const backgroundWorker = read('packages/application/src/background-jobs/workers/DurableBackgroundWorker.ts');
const backgroundRegistry = read('packages/application/src/background-jobs/workers/BackgroundJobHandlerRegistry.ts');
const backgroundGateway = read('packages/infrastructure/src/background-jobs/PrismaBackgroundJobExecutionGateway.ts');
const backgroundRouter = read('apps/api/src/presentation/api/router/BackgroundJobRouter.ts');
const apiContainer = read('apps/api/src/infrastructure/di/container.ts');
const apiServer = read('apps/api/src/server.ts');
const apiApp = read('apps/api/src/app.ts');
const appConfig = read('packages/config/src/AppConfig.ts');
const retentionHandler = read('packages/application/src/background-jobs/handlers/RetentionBackgroundJobHandler.ts');
const backgroundMigration = read('packages/infrastructure/prisma/migrations/20260907010000_w3_durable_background_jobs/migration.sql');
const backgroundDbSpec = read('packages/infrastructure/tests/background-jobs/PrismaBackgroundJobLease.database.spec.ts');
const outboxStore = read('packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts');
const outboxDispatcher = read('packages/application/src/event-foundation/use-cases/TransactionalOutboxDispatcher.ts');
const outboxContract = read('packages/domain/src/event-foundation/outbox/TransactionalOutbox.ts');
const outboxMigration = read('packages/infrastructure/prisma/migrations/20260907011000_w3_outbox_lease_fencing/migration.sql');
const outboxDbSpec = read('packages/infrastructure/tests/event-foundation/PrismaTransactionalOutboxLease.database.spec.ts');
const adr029 = read('docs/architecture/adr/ADR-029-PostgreSQL-Durable-Background-Worker-Foundation.md');
const adr025 = read('docs/architecture/adr/ADR-025-Canonical-Technology-Stack.md');
const workerRunbook = read('docs/operations/BACKGROUND_WORKER_RUNTIME.md');
const persistenceOwnership = JSON.parse(read('docs/architecture/persistence/persistence-ownership.manifest.json'));
const databaseBaseline = JSON.parse(read('scripts/database/database-baseline.manifest.json'));
const migrationRecovery = JSON.parse(read('scripts/database/migration-recovery.manifest.json'));
const assetStorageContract = read('packages/domain/src/asset-platform/gateways/IAssetStorageGateway.ts');
const signedProviderClient = read('packages/infrastructure/src/provider-http/SignedProviderHttpClient.ts');
const assetProviderGateways = read('packages/infrastructure/src/asset-platform/HttpAssetSecurityGateways.ts');
const runtimeDependencyPolicy = read('apps/api/src/infrastructure/di/RuntimeDependencyPolicy.ts');
const assetLifecycle = read('packages/application/src/asset-platform/use-cases/ProcessAssetLifecycleUseCase.ts');
const assetIngest = read('packages/application/src/asset-platform/use-cases/IngestAssetUseCase.ts');
const assetRouter = read('apps/api/src/presentation/api/router/AssetPlatformRouter.ts');
const assetProviderSpec = read('packages/infrastructure/tests/asset-platform/HttpAssetSecurityGateways.spec.ts');
const assetRunbook = read('docs/operations/ASSET_PROVIDER_RUNTIME.md');
const importRawContract = read('packages/application/src/import-foundation/contracts/IImportRawSnapshotStore.ts');
const importRawProvider = read('packages/infrastructure/src/import-foundation/HttpImportRawSnapshotStore.ts');
const importRawRuntimeSpec = read('apps/api/tests/infrastructure/di/RuntimeDependencyPolicy.spec.ts');
const importRawRuntimeTest = read('tests/remediation/w3-import-raw-provider.test.mjs');
const importRawRunbook = read('docs/operations/IMPORT_RAW_SNAPSHOT_PROVIDER_RUNTIME.md');
const financeProvider = read('packages/infrastructure/src/finance-platform/ProviderNeutralFinanceGateways.ts');
const financeUseCases = read('packages/application/src/finance-platform/use-cases/FinancePlatformUseCases.ts');
const financeRunbook = read('docs/operations/FINANCE_PROVIDER_RUNTIME.md');
const envExample = read('.env.example');
const aggregateRoot = read('packages/core/src/domain/AggregateRoot.ts');
const identityRepo = read('packages/infrastructure/src/identity/PrismaIdentityRepository.ts');
const settingDefinitionRepo = read('packages/infrastructure/src/settings/PrismaSettingDefinitionRepository.ts');
const settingAssignmentRepo = read('packages/infrastructure/src/settings/PrismaSettingAssignmentRepository.ts');
const servicesRepo = read('packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts');
const careerRepo = read('packages/infrastructure/src/career-alumni/PrismaCareerRepository.ts');
const courseProgress = read('packages/application/src/courses/use-cases/CourseProgressUseCases.ts');
const studentOutboxGateway = read('packages/application/src/students/use-cases/StudentWorkspaceOutboxDeliveryGateway.ts');
const studentOutboxWorker = read('packages/application/src/students/use-cases/StudentWorkspaceOutboxWorker.ts');
const ownerOutboxWorker = read('packages/application/src/event-foundation/use-cases/OwnerDomainOutboxWorker.ts');
const cmsHandler = read('packages/application/src/background-jobs/handlers/CmsScheduledPublishingBackgroundJobHandler.ts');
const aiHandler = read('packages/application/src/background-jobs/handlers/AIAsyncBackgroundJobHandler.ts');
const importHandler = read('packages/application/src/background-jobs/handlers/ImportQueueBackgroundJobHandler.ts');
const financeHandler = read('packages/application/src/background-jobs/handlers/FinanceReconciliationBackgroundJobHandler.ts');
const notificationHandler = read('packages/application/src/background-jobs/handlers/NotificationDeliveryBackgroundJobHandler.ts');
const notificationRepo = read('packages/infrastructure/src/notification/PrismaNotificationRepositories.ts');
const notificationProvider = read('packages/infrastructure/src/notification/ProviderNotificationDeliveryGateway.ts');
const notificationOutbox = read('packages/application/src/notification/use-cases/NotificationOutboxDeliveryGateway.ts');
const notificationRouter = read('apps/api/src/presentation/api/router/NotificationRouter.ts');
const notificationAdmin = read('apps/admin/src/pages/NotificationOperationsPage.tsx');
const notificationMigration = read('packages/infrastructure/prisma/migrations/20260907013000_w3_notification_delivery/migration.sql');
const pollingRegistry = read('packages/application/src/event-foundation/use-cases/PollingWorkerRuntimeRegistry.ts');
const certificateWorker = read('packages/application/src/certificates/use-cases/CertificateCompletionOutboxWorker.ts');
const eventCatalog = read('docs/architecture/models/Enterprise-Event-Catalog-v1.0.md');
const phase14Runbook = read('docs/implementation-status/MANARATAK-2.0-Phase14-Source-Closure-and-Google-Studio-Runbook.md');
const notificationRunbook = read('docs/operations/NOTIFICATION_RUNTIME.md');
const w3Completion = read('docs/remediation/W3_SOURCE_COMPLETION_2026-09-07.md');
const w3Closure = read('docs/remediation/W3_CLOSED_2026-09-07.md');

check('MNT-AUD-0007 ADR formally supersedes mandatory BullMQ with PostgreSQL durable worker authority',
  adr029.includes('supersedes only the BullMQ-specific task-queue line in ADR-025') &&
  adr025.includes('ADR-029') && adr025.includes('BullMQ is no longer mandatory'));
check('MNT-AUD-0007 durable queue contract includes claim, heartbeat, terminal CAS and operational snapshot',
  backgroundContracts.includes('claimDue(') && backgroundContracts.includes('heartbeat(') &&
  backgroundContracts.includes('complete(') && backgroundContracts.includes('fail(') &&
  backgroundContracts.includes('getOperationalSnapshot'));
check('MNT-AUD-0007 PostgreSQL claim path uses SKIP LOCKED plus opaque lease fencing and abandoned-job reclaim',
  backgroundGateway.includes('FOR UPDATE SKIP LOCKED') && backgroundGateway.includes('leaseToken = randomUUID()') &&
  backgroundGateway.includes("status: { in: ['SCHEDULED', 'STARTED'] }") &&
  backgroundGateway.includes("outcome: 'LEASE_EXPIRED'"));
check('MNT-AUD-0007 terminal worker transitions require live worker/token ownership',
  backgroundGateway.includes('leasedBy: mutation.workerId') && backgroundGateway.includes('leaseToken: mutation.leaseToken') &&
  backgroundGateway.includes('leaseUntil: { gt: mutation.now }') && backgroundGateway.includes('lockOwnedRow'));
check('MNT-AUD-0007 retry/DLQ/execution evidence and recurring-cycle reset are durable',
  schema.includes('model BackgroundJobExecutionRecord {') && schema.includes('model BackgroundJobDeadLetterRecord {') &&
  backgroundGateway.includes('backgroundJobDeadLetterRecord.upsert') && backgroundGateway.includes('attempt: 0') &&
  !schema.includes('@@unique([jobReference, attempt])'));
check('MNT-AUD-0007 worker runtime has heartbeat, timeout, handler registry and graceful drain',
  backgroundWorker.includes('setInterval') && backgroundWorker.includes('AbortController') &&
  backgroundWorker.includes('queue.heartbeat') && backgroundWorker.includes('beginDrain') && backgroundWorker.includes('drain()') &&
  backgroundRegistry.includes('resolve(jobType'));
check('MNT-AUD-0007 control-plane cannot forge start/complete/fail worker transitions',
  !/router\.(?:post|put|patch)\(['"]\/(?:start|complete|fail)/.test(backgroundRouter) &&
  backgroundRouter.includes("router.post('/',") && backgroundRouter.includes("router.delete('/:jobReference'"));
check('MNT-AUD-0007 production DI composes Prisma persistence, generic worker and Retention as a real handler',
  apiContainer.includes('new PrismaBackgroundJobRepository(prisma)') && apiContainer.includes('new PrismaBackgroundJobExecutionGateway(prisma)') &&
  apiContainer.includes('durableBackgroundWorker:') && apiContainer.includes('retentionBackgroundJobHandler:') &&
  retentionHandler.includes('platform.retention.sweep'));
check('MNT-AUD-0007 server lifecycle registers recurring Retention, polls durable worker and drains on shutdown',
  apiServer.includes("stableReference: 'system.retention.sweep'") && apiServer.includes('backgroundWorker.runOnce') &&
  apiServer.includes('BACKGROUND_WORKER_HEARTBEAT_MS') && apiServer.includes('backgroundWorker?.drain?.()'));
check('MNT-AUD-0007 production configuration/readiness fail closed when worker durability is unavailable',
  appConfig.includes("'BACKGROUND_WORKER_ENABLED'") && appConfig.includes('BACKGROUND_WORKER_HEARTBEAT_MS') &&
  apiApp.includes("'background-jobs'") && apiApp.includes('getOperationalSnapshot') && apiApp.includes('HealthStatus.DOWN'));
check('MNT-AUD-0007 persistence ownership/baseline/recovery governance includes worker models and migration',
  ['BackgroundJobRecord','BackgroundJobExecutionRecord','BackgroundJobDeadLetterRecord'].every((model) => persistenceOwnership.models[model] === 'background_jobs' && databaseBaseline.models[model]?.required === true) &&
  migrationRecovery.migrations['20260907010000_w3_durable_background_jobs']?.recoveryClass === 'BACKUP_RESTORE_REQUIRED' &&
  backgroundMigration.includes('MANARATAK_MIGRATION_OWNER: background_jobs'));
check('MNT-AUD-0007 disposable PostgreSQL concurrency proof is authored but safety-gated',
  backgroundDbSpec.includes('destructiveDatabaseTestsEnabled') && backgroundDbSpec.includes('Promise.all') &&
  backgroundDbSpec.includes('expect(stale).toBe(false)') && workerRunbook.includes('DB_RUNTIME_PENDING'));

check('MNT-AUD-0068 outbox contract requires lease renewal and ownership-aware terminal transitions',
  outboxContract.includes('OutboxLeaseOwnership') && outboxContract.includes('renewLease(') &&
  /markProcessed\(id: string, ownership: OutboxLeaseOwnership/.test(outboxContract) &&
  /markFailed\(id: string, ownership: OutboxLeaseOwnership/.test(outboxContract));
check('MNT-AUD-0068 expired PROCESSING outbox rows are reclaimable with fresh claim tokens',
  outboxStore.includes("WHERE \"state\" IN ('PENDING', 'FAILED', 'PROCESSING')") &&
  outboxStore.includes('claimToken = randomUUID()') &&
  outboxStore.includes('OutboxProcessingState.PROCESSING]'));
check('MNT-AUD-0068 stale outbox owners cannot overwrite final state',
  outboxStore.includes('claimedBy: ownership.workerId') && outboxStore.includes('claimToken: ownership.leaseToken') &&
  outboxStore.includes('claimUntil: { gt: processedAt }') && outboxStore.includes('claimUntil: { gt: failure.failedAt }'));
check('MNT-AUD-0068 dispatcher heartbeats leases and records lease loss instead of false terminal success',
  outboxDispatcher.includes('heartbeatActive') && outboxDispatcher.includes('store.renewLease') &&
  outboxDispatcher.includes('leaseLost += 1') && outboxDispatcher.includes('if (!applied)'));
check('MNT-AUD-0068 migration/recovery governance and disposable PostgreSQL stale-worker test are authored',
  schema.includes('claimToken    String?') && outboxMigration.includes('MANARATAK_MIGRATION_OWNER: events') &&
  migrationRecovery.migrations['20260907011000_w3_outbox_lease_fencing']?.recoveryClass === 'BACKUP_RESTORE_REQUIRED' &&
  outboxDbSpec.includes('expired PROCESSING row') && outboxDbSpec.includes('expect(staleProcessed).toBe(false)'));


check('MNT-AUD-0011 source contains production-capable signed storage, malware and sanitization adapters',
  assetProviderGateways.includes('class HttpAssetStorageGateway') && assetProviderGateways.includes("capabilityStatus = 'PRODUCTION_CAPABLE'") &&
  assetProviderGateways.includes('class HttpAssetMalwareScannerGateway') && assetProviderGateways.includes('class HttpAssetSanitizationGateway'));
check('MNT-AUD-0011 signed transport is HTTPS-only in production semantics with HMAC body binding, nonce, timeout and bounded responses',
  signedProviderClient.includes('PROVIDER_HTTPS_REQUIRED') && signedProviderClient.includes("createHmac('sha256'") &&
  signedProviderClient.includes("createHash('sha256'") && signedProviderClient.includes('randomUUID()') &&
  signedProviderClient.includes('AbortController') && signedProviderClient.includes('PROVIDER_RESPONSE_TOO_LARGE'));
check('MNT-AUD-0011 secure upload/delivery contracts exist and grants are constrained to HTTPS temporary URLs',
  assetStorageContract.includes('AssetUploadGrant') && assetStorageContract.includes('AssetDeliveryGrant') &&
  assetProviderGateways.includes('ASSET_UPLOAD_MUST_TARGET_QUARANTINE') && assetProviderGateways.includes('ASSET_DELIVERY_CLEAN_LOCATOR_REQUIRED') &&
  assetProviderGateways.includes('ASSET_PROVIDER_GRANT_TTL_EXCESSIVE') && assetProviderGateways.includes('ASSET_PROVIDER_GRANT_SECRET_HEADER_FORBIDDEN'));
check('MNT-AUD-0011 production/staging DI composes configured provider adapters and fails closed when missing',
  runtimeDependencyPolicy.includes('createAssetMalwareScannerGatewayForRuntime') && runtimeDependencyPolicy.includes('createAssetSanitizationGatewayForRuntime') &&
  runtimeDependencyPolicy.includes('ASSET_PROVIDER_CONFIGURATION_INCOMPLETE') && runtimeDependencyPolicy.includes("createUnavailableCapability('assetStorageGateway')") &&
  apiContainer.includes('createAssetMalwareScannerGatewayForRuntime(assetProviderRuntimeEnvironment)') && apiContainer.includes('createAssetSanitizationGatewayForRuntime(assetProviderRuntimeEnvironment)'));
check('MNT-AUD-0011 sanitizer output becomes canonical quarantine locator before provider-owned activation',
  assetLifecycle.includes('completeSanitization(result.metadata, result.sanitizedLocator)') &&
  assetLifecycle.includes('storageGateway.moveToCleanZone(record.locator)') && !assetLifecycle.includes('dto.cleanBucketName') && !assetLifecycle.includes('dto.cleanPathKey'));
check('MNT-AUD-0011 client cannot forge sanitizer metadata or clean storage locator and secure delivery route exists',
  assetRouter.includes('const sanitizeAssetSchema = z.object({}).strict()') && assetRouter.includes('const activateAssetSchema = z.object({}).strict()') &&
  assetRouter.includes("router.post('/:assetId/delivery-grant'") && assetLifecycle.includes('ASSET_DELIVERY_REQUIRES_ACTIVE_CLEAN_ASSET'));
check('MNT-AUD-0011 upload ingestion returns provider-issued upload grant when production storage supports it',
  assetIngest.includes('storageGateway.generateUploadGrant') && assetIngest.includes('uploadGrant: uploadGrant ?'));
check('MNT-AUD-0011 provider contract/security tests and runtime pending runbook are authored',
  assetProviderSpec.includes('rejects HTTP grants') && assetProviderSpec.includes('requires explicit threat evidence') &&
  assetRunbook.includes('PROVIDER_RUNTIME_PENDING') && assetRunbook.includes('EICAR'));


check('MNT-AUD-0012 raw snapshot contract exposes durable metadata plus verified byte retrieval',
  importRawContract.includes('retentionExpiresAt?: Date') && importRawContract.includes('read(artifactId: string)'));
check('MNT-AUD-0012 provider adapter is durable, production-capable and provenance-scopes immutable identity',
  importRawProvider.includes("persistenceClassification = 'DURABLE'") && importRawProvider.includes("capabilityStatus = 'PRODUCTION_CAPABLE'") &&
  importRawProvider.includes("identityHash = createHash('sha256')") && importRawProvider.includes('connectorVersion: acquisition.connectorVersion'));
check('MNT-AUD-0012 write path binds exact bytes, content hash, idempotency and explicit retention policy',
  importRawProvider.includes("rawBase64: Buffer.from(acquisition.rawBytes).toString('base64')") &&
  importRawProvider.includes("idempotencyKey: `import-raw:${identityHash}`") && importRawProvider.includes("retentionClass: 'IMPORT_RAW_PROVENANCE'") &&
  importRawProvider.includes('IMPORT_RAW_PROVIDER_RETENTION_MISMATCH'));
check('MNT-AUD-0012 retrieval fail-closes on corrupt bytes and non-durable provider references',
  importRawProvider.includes('IMPORT_RAW_PROVIDER_READ_HASH_MISMATCH') && importRawProvider.includes('IMPORT_RAW_PROVIDER_READ_BASE64_INVALID') &&
  importRawProvider.includes('IMPORT_RAW_PROVIDER_REFERENCE_NOT_DURABLE'));
check('MNT-AUD-0012 production DI uses configured provider adapter and startup fail-closes without it',
  runtimeDependencyPolicy.includes('new HttpImportRawSnapshotStore') && runtimeDependencyPolicy.includes('assertImportRawSnapshotStoreForRuntime') &&
  apiApp.includes("assertImportRawSnapshotStoreForRuntime(currentEnv, container.resolve<any>('importRawSnapshotStore'))"));
check('MNT-AUD-0012 config/readiness makes provider and raw retention explicit in production',
  appConfig.includes("'MANARATAK_IMPORT_RAW_RETENTION_DAYS'") && appConfig.includes('MANARATAK_ASSET_PROVIDER_SIGNING_SECRET') &&
  apiApp.includes("name: 'import-foundation'"));
check('MNT-AUD-0012 tests prove provenance separation, retention binding and read corruption rejection',
  importRawRuntimeTest.includes('same bytes from a different provenance') && importRawRuntimeTest.includes('retention-bound') &&
  importRawRuntimeTest.includes('rejects corruption') && importRawRuntimeSpec.includes('composes durable provider storage in production'));
check('MNT-AUD-0012 provider runtime evidence remains explicitly pending',
  importRawRunbook.includes('SOURCE_VERIFIED / PROVIDER_RUNTIME_PENDING') && importRawRunbook.includes('overwrite attempt') && importRawRunbook.includes('retention expiry/tombstone behavior'));



check('MNT-AUD-0018 signed provider transports execute payment, FX and bank operations with idempotent bounded retries',
  financeProvider.includes('SignedProviderHttpClient') && financeProvider.includes('/v1/finance/payments/authorize') &&
  financeProvider.includes('/v1/finance/fx/rate') && financeProvider.includes('/v1/finance/bank-transfers/submit') &&
  financeProvider.includes('maxAttempts') && !financeProvider.toLowerCase().includes('runtime transport is pending'));
check('MNT-AUD-0018 finance responses, failures and telemetry are strict/redacted',
  financeProvider.includes('SENSITIVE_METADATA_KEY') && financeProvider.includes('FINANCE_PROVIDER_PAYMENT_RESPONSE_INVALID') &&
  financeProvider.includes('FINANCE_PROVIDER_BANK_RESPONSE_INVALID') && financeProvider.includes('failureCategory'));
check('MNT-AUD-0018 webhook verification is HMAC body-bound, time-bounded and replay fenced in Redis',
  financeProvider.includes('FinanceProviderWebhookVerifier') && financeProvider.includes('timingSafeEqual') &&
  financeProvider.includes('FINANCE_WEBHOOK_REPLAY_DETECTED') && financeProvider.includes('RedisFinanceWebhookReplayStore'));
check('MNT-AUD-0018 automatic FX and provider reconciliation are wired into application runtime',
  financeUseCases.includes('refreshAutomaticExchangeRate') && financeUseCases.includes('fxRateProvider.fetchRate') &&
  financeUseCases.includes('reconcileProviderStates') && financeUseCases.includes('recordReconciledCapturedPaymentAtomic'));
check('MNT-AUD-0018 production configuration is explicit, HTTPS-only and provider runtime remains pending',
  ['FINANCE_PROVIDER_BASE_URL','FINANCE_PROVIDER_API_KEY','FINANCE_PROVIDER_SIGNING_SECRET','FINANCE_PAYMENT_PROVIDER_KEY','FINANCE_FX_PROVIDER_KEY','FINANCE_BANK_PROVIDER_KEY'].every((key) => appConfig.includes(key) && envExample.includes(`${key}=`)) &&
  appConfig.includes('FINANCE_PROVIDER_BASE_URL must be HTTPS') && financeRunbook.includes('SOURCE_VERIFIED / PROVIDER_RUNTIME_PENDING'));



check('MNT-AUD-0080 Identity and Settings persist canonical versioned owner events through the transactional outbox',
  identityRepo.includes('IdentityCreated.v1') && identityRepo.includes('IdentityActivated.v1') &&
  identityRepo.includes('IdentityStatusChanged.v1') && identityRepo.includes('IdentityContactUpdated.v1') &&
  identityRepo.includes('$transaction') && settingDefinitionRepo.includes('SettingDefinitionCreated.v1') &&
  settingDefinitionRepo.includes('$transaction') && settingAssignmentRepo.includes('SettingValueAssigned.v1') &&
  settingAssignmentRepo.includes('SettingValueUpdated.v1') && settingAssignmentRepo.includes('SettingValueRolledBack.v1'));
check('MNT-AUD-0080 legacy process-local DomainEvents publication is quarantined from AggregateRoot production paths',
  aggregateRoot.includes('durable transactional outbox') && !aggregateRoot.includes('DomainEvents.markAggregateForDispatch'));
check('MNT-AUD-0080 owner event documentation rejects the historical UserRegistered production label',
  eventCatalog.includes('IdentityCreated.v1') && eventCatalog.includes('historical `UserRegistered` label is not a canonical production event'));

check('MNT-AUD-0060 P20 Services mutations publish atomic versioned owner events and have an autonomous outbox runtime caller',
  servicesRepo.includes('atomicEvent') && servicesRepo.includes('ServiceCatalogCreated.v1') && servicesRepo.includes('ServiceRequested.v1') &&
  ownerOutboxWorker.includes("runServicesOnce") && apiServer.includes('OWNER_DOMAIN_OUTBOX_WORKER_ENABLED') && apiServer.includes('runServicesOnce'));
check('MNT-AUD-0089 P21 Career employer/job lifecycle publishes atomic events including JobPosted/JobClosed',
  careerRepo.includes('atomicEvent') && careerRepo.includes('CareerEmployerCreated.v1') && careerRepo.includes('JobPosted.v1') && careerRepo.includes('JobClosed.v1') &&
  ownerOutboxWorker.includes('runCareerOnce'));

check('MNT-AUD-0093 Course enrollment/progress mutations emit atomic owner events consumed by P15',
  courseProgress.includes('COURSE_ENROLLED_EVENT_TYPE') && courseProgress.includes('COURSE_PROGRESS_UPDATED_EVENT_TYPE') &&
  courseProgress.includes('atomicMutations.execute') && studentOutboxWorker.includes("['CourseEnrolled', 'CourseProgressUpdated']"));
check('MNT-AUD-0016 Identity to StudentWorkspace bridge is idempotent on outbox identity and runtime-wired',
  studentOutboxGateway.includes('context.idempotencyKey !== entry.id') && studentOutboxGateway.includes('StudentIdentityCreated') &&
  studentOutboxWorker.includes("['IdentityCreated.v1', 'IdentityStatusChanged.v1']") && apiServer.includes('STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED'));

check('MNT-AUD-0017 CMS due schedules execute through a recurring durable background job',
  cmsHandler.includes('processDueSchedules') && apiServer.includes('CMS_SCHEDULED_PUBLISH_JOB_TYPE') && appConfig.includes('BACKGROUND_CMS_CRON'));
check('MNT-AUD-0054 AI queued/stale async jobs execute through a recurring durable background job',
  aiHandler.includes('processDueAsyncJobs') && apiServer.includes('AI_ASYNC_SWEEP_JOB_TYPE') && appConfig.includes('BACKGROUND_AI_CRON'));
check('MNT-AUD-0086 import due/reclaimable queue work executes through a recurring durable background job',
  importHandler.includes('processNextQueuedBatch') && apiServer.includes('IMPORT_QUEUE_SWEEP_JOB_TYPE') && appConfig.includes('BACKGROUND_IMPORT_CRON'));

check('MNT-AUD-0077 finance reconciliation autonomously covers payments, transfers and PROCESSING refunds',
  financeHandler.includes('reconcileProviderStates') && apiServer.includes('FINANCE_RECONCILIATION_JOB_TYPE') &&
  financeUseCases.includes("refund.status === 'PROCESSING'") && financeUseCases.includes('getRefundStatus') &&
  financeProvider.includes('/v1/finance/payments/refund-status') && financeProvider.includes('refundReference'));
check('MNT-AUD-0077 payment health reports the real provider runtime capability instead of stale transport-pending text',
  apiApp.includes('provider.runtimeStatus') && apiApp.includes('PAYMENT_PROVIDER_RUNTIME_NOT_READY') && !apiApp.includes('PAYMENT_RUNTIME_TRANSPORT_PENDING'));

check('MNT-AUD-0034 notification foundation is durable, provider-capable and uses the canonical background handler contract',
  schema.includes('NotificationIntentRecord') && notificationRepo.includes('class PrismaNotificationIntentRepository') &&
  notificationProvider.includes("capabilityStatus = 'PRODUCTION_CAPABLE'") && notificationHandler.includes('IBackgroundJobHandler') &&
  notificationHandler.includes('async handle(') && notificationHandler.includes('NOTIFICATION_DELIVERY_LEASE_LOST') && notificationHandler.includes('markSuppressed') && notificationHandler.includes('hasOptedOut') && notificationHandler.includes('DELIVERY_CONCURRENCY'));
check('MNT-AUD-0034 approved owner events create notification intents and P23 exposes governed operations',
  notificationOutbox.includes('context.idempotencyKey !== entry.id') && notificationOutbox.includes("entry.domain === 'SERVICES'") &&
  notificationRouter.includes("router.get('/templates'") && notificationRouter.includes("router.get('/intents'") && notificationRouter.includes("/:id/retry") &&
  notificationAdmin.includes('عمليات الإشعارات') && apiApp.includes("v1Router.use('/notifications', ...protectControlPlane('admin:platform:manage'"));
check('MNT-AUD-0034 notification migration/config/runbook are governed and runtime evidence remains pending',
  notificationMigration.includes('MANARATAK_MIGRATION_OWNER: notifications') &&
  migrationRecovery.migrations['20260907013000_w3_notification_delivery']?.recoveryClass === 'BACKUP_RESTORE_REQUIRED' &&
  appConfig.includes('NOTIFICATION_PROVIDER_BASE_URL') && appConfig.includes('BACKGROUND_NOTIFICATION_CRON') && appConfig.includes('NOTIFICATION_RECIPIENT_MAX_DELIVERIES_PER_HOUR') && notificationRepo.includes("INTERVAL '1 hour'") &&
  notificationRunbook.includes('SOURCE_VERIFIED / DB_PROVIDER_RUNTIME_PENDING'));

check('MNT-AUD-0032 certificate worker flags are canonical, production-required, health-visible and documented',
  appConfig.includes('CERTIFICATE_COMPLETION_WORKER_ENABLED must be true in production/staging') &&
  envExample.includes('CERTIFICATE_COMPLETION_WORKER_ENABLED=true') && certificateWorker.includes('runOnce') &&
  pollingRegistry.includes('lastSuccessAt') && pollingRegistry.includes('lastFailureAt') && apiApp.includes("name: 'polling-workers'") &&
  phase14Runbook.includes('W3 certificate completion worker reconciliation'));
check('W3 runtime-sensitive evidence is explicitly pending and MNT-AUD-0029 is deferred to its canonical W4/W5 repair ownership',
  w3Completion.includes('W3_CLOSED_SOURCE / RUNTIME_EVIDENCE_PENDING_NON_BLOCKING') &&
  w3Completion.includes('MNT-AUD-0029') && w3Completion.includes('DEFERRED_BY_CANONICAL_REPAIR_WAVE') &&
  w3Completion.includes('Repair Wave: W1 / W4 / W5') &&
  w3Closure.includes('W3 is CLOSED at the source/remediation-wave boundary') &&
  w3Closure.includes('DB_PROVIDER_RUNTIME_PENDING') && w3Closure.includes('W4/W5 SOURCE WORK PENDING'));

const passed = checks.filter((item) => item.ok).length;
for (const item of checks) console.log(`${item.ok ? 'PASS' : 'FAIL'} ${item.name}`);
console.log(`W3_SOURCE_VERIFIER = ${passed === checks.length ? 'PASS' : 'FAIL'} ${passed}/${checks.length}`);
if (passed !== checks.length) process.exit(1);
