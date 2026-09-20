import * as crypto from 'node:crypto';


import {
  HierarchyValidationService,
  AcademicTaxonomyValidationService,
  ReferenceDataValidationService,
  ConfigurationResolutionService,
  ImportRetryPolicy
} from '@manaratak/domain';

import { createContainer, InjectionMode, asClass, asValue, asFunction } from 'awilix';
import { Router } from 'express';
import { ConfigurationRegistry } from '@manaratak/config';
import { RuntimeResourceRegistry } from '../runtime/RuntimeResourceRegistry.js';
import { createAssetMalwareScannerGatewayForRuntime, createAssetSanitizationGatewayForRuntime, createAssetStorageGatewayForRuntime, createImportRawSnapshotStoreForRuntime } from './RuntimeDependencyPolicy.js';

// Repositories & Gateways
import {
  PrismaIdentityRepository,
  InMemoryIdentityRepository,
  InMemoryRoleRepository,
  InMemoryPolicyRepository,
  InMemoryRoleAssignmentRepository,
  DefaultPolicyEvaluator,
  InMemoryEnterpriseEventRepository,
  InMemoryEventPublishingGateway,
  PrismaEnterpriseEventRepository,
  PrismaEventPublishingGateway,
  PrismaScholarshipRepository,
  PrismaUniversityRepository,
  PrismaCourseRepository,
  PrismaCourseRelationshipRepository,
  PrismaCourseCurriculumRepository,
  PrismaCourseProgressRepository,
  PrismaCourseEnrollmentPolicyRepository,
  Phase19CourseFinancialClearanceGateway,
  PrismaLearningPathRepository,
  PrismaCertificateRepository,
  ProviderNeutralCertificateRenderingService,
  EapCertificateArtifactStore,
  PrismaExternalCourseProviderRepository,
  PrismaCourseImportAnalysisRepository,
  PrismaCourseImportTransferGateway,
  PrismaImportedCourseOperationsRepository,
  SafeImportedCourseLinkChecker,
  PrismaMajorRepository,
  PrismaNewMajorCandidateRepository,
  Phase10CatalogRepository,
  PrismaStudentWorkspaceRepository,
  PrismaStudentApplicationTrackerRepository,
  ScholarshipStudentApplicationTrackerGateway,
  PrismaStudentToolRegistryRepository,
  Phase17StudentToolsAIConsumerGateway,
  CanonicalUniversityComparisonGateway,
  CanonicalScholarshipRecommendationGateway,
  StudentToolRateLimitGateway,
  Phase15StudentToolSaveGateway,
  Phase15StudentContextGateway,
  EnterpriseStudentToolDependencyHealthGateway,
  EnvironmentStudentToolResultProtector,
  DefaultRateLimiter,
  RedisRateLimiter,
  PrismaCmsRepository,
  MajorStudentSavedItemHydrationGateway,
  UniversityStudentSavedItemHydrationGateway,
  ScholarshipStudentSavedItemHydrationGateway,
  CmsStudentSavedItemHydrationGateway,
  ServiceStudentSavedItemHydrationGateway,
  CourseStudentSavedItemHydrationGateway,
  CourseStudentDashboardReadGateway,
  CertificateStudentDashboardReadGateway,
  PrismaServicePlatformRepository,
  CanonicalServiceReferenceGateway,
  Phase19ServiceFinanceGateway,
  PrismaCareerRepository,
  CanonicalCareerReferenceGateway,
  RedisStudentWorkspaceDeliveryCache,
  RedisCmsDeliveryCache,
  PrismaReferenceDataRepository,
  PrismaStudyDestinationRepository,
  PrismaFinanceRepository,
  PrismaFinanceCurrencyReferenceGateway,
  FinancePaymentGatewayRegistry,
  FinanceBankTransferGatewayRegistry,
  EnvironmentPaymentGatewayAdapter,
  EnvironmentFxRateProviderAdapter,
  EnvironmentBankTransferGatewayAdapter,
  PrismaInternationalTestRepository,
  PrismaImportRepository,
  InMemoryImportQueueGateway,
  PrismaImportQueueGateway,
  PrismaAssetRecordRepository,
  PrismaAssetUsageRegistryGateway,
  PrismaWorkflowRepository,
  PrismaWorkflowExecutionGateway,
  PrismaApiServiceRepository,
  PrismaApiExposureGateway,
  PrismaSharedComponentRepository,
  PrismaComponentRenderingGateway,
  createUnavailableCapability,
  PrismaSettingDefinitionRepository,
  PrismaSettingAssignmentRepository,
  PrismaRoleRepository,
  PrismaPolicyRepository,
  PrismaRoleAssignmentRepository,
  PrismaEmergencyAccessRepository,
  InMemoryEmergencyAccessRepository,
  AdminBootstrapVerifier,
  PrismaAuditRecordRepository,
  PrismaApiIdempotencyStore,
  PrismaSearchRequestRepository,
  PrismaPublicSearchEngineGateway,
  PrismaTransactionalOutboxStore,
  PrismaBackgroundJobRepository,
  PrismaBackgroundJobExecutionGateway,
  InMemoryBackgroundJobRepository,
  InMemoryBackgroundJobExecutionGateway,
  PrismaRetentionDecisionRepository,
  PrismaImportRetentionGateway,
  PrismaAuditRetentionGateway,
  PrismaAssetRetentionGateway,
  PrismaAtomicPersistenceUnitOfWork,
  PrismaAcademicTaxonomyRepository,
  DegreeLevelRepository,
  PrismaScholarshipCanonicalLookupGateway,
  NodeSafeSourceHttpTransport, SourceAcquisitionLimiter,
  StaticHtmlSourceConnector, SitemapSourceConnector, OfficialFeedSourceConnector, OfficialApiSourceConnector, ManualUploadSourceConnector, InMemorySourceRegistryGateway, PrismaSourceRegistryGateway, PrismaScholarshipImportVerificationDecisionPort, PrismaScholarshipImportCanonicalResolutionDecisionPort, InMemoryScholarshipImportVerificationDecisionPort, InMemoryScholarshipImportCanonicalResolutionDecisionPort
, PrismaSessionManager, PrismaCredentialVerifier, PrismaAIPlatformRepository, createDefaultAIProviderRegistry, EnvironmentAIAsyncPayloadProtector, JwtTokenProvider, generateEphemeralJwtKeySet, PrismaNotificationIntentRepository, PrismaNotificationTemplateRepository, PrismaStudentNotificationPreferenceGateway, ProviderNotificationDeliveryGateway} from '@manaratak/infrastructure';

// UseCases
import {
  ProvisionIdentityUseCase,
  ActivateIdentityUseCase,
  SuspendIdentityUseCase,
  ArchiveIdentityUseCase,
  PurgeIdentityUseCase,
  UpdateProfileUseCase,
  UpdateContactUseCase,
  GetIdentityUseCase,
  ListIdentitiesUseCase,
  IdentityPrincipalAccessValidator,
  ManageRolesUseCase,
  AssignRoleUseCase,
  ManageEmergencyAccessUseCase,
  EvaluateAccessUseCase,
  ManageSettingsUseCase,
  ResolveConfigurationUseCase,
  ManageFilesUseCase,
  ManageSearchUseCase,
  ManageCacheUseCase,
  ManageBackgroundJobsUseCase,
  ManageEnterpriseEventsUseCase,
  ManageWorkflowsUseCase,
  ManageApiServicesUseCase,
  ManageSharedComponentsUseCase,
  AdminScholarshipUseCases,
  PublicScholarshipUseCases,
  ScholarshipCanonicalResolutionService,
  ScholarshipHandoffCanonicalScreeningService,
  ScholarshipImportHandoffService,
  ScholarshipRepositoryDuplicateLookup,
  ImportHandoffDispatcher,
  AdminUniversityUseCases,
  UniversityImportHandoffService,
  InternationalTestImportHandoffService,
  AdminMajorUseCases,
  CanonicalMajorReferenceService,
  MajorImportStagingUseCase,
  AdminCourseUseCases,
  ImportedCourseAdminUseCases,
  CourseImportArtifactUseCase,
  CourseImportIdentityDiffUseCase,
  CourseImportCoordinator,
  CourseImportOperationsUseCases,
  PublicCourseUseCases,
  CourseRelationshipQueryService,
  CourseRelationshipResolutionService,
  CrossDomainGraphReadService,
  CourseCurriculumUseCases,
  CourseProgressUseCases,
  CourseEnrollmentPolicyUseCases,
  LearningPathUseCases,
  CoursePublicationService,
  NativeCourseUseCases,
  CertificateUseCases,
  CertificateArtifactRenderUseCase,
  CertificateCompletionEventConsumer,
  CertificateCompletionOutboxDeliveryGateway,
  CertificateCompletionOutboxWorker,
  CertificateReadModelService,
  TransactionalOutboxDispatcher,
  FanoutOutboxDeliveryGateway,
  StudentWorkspaceUseCases,
  StudentApplicationTrackerUseCases,
  StudentApplicationReminderNotificationGateway,
  StudentWorkspaceOutboxDeliveryGateway,
  StudentWorkspaceOutboxWorker,
  StudentSavedItemHydrationService,
  StudentDashboardHydrationService,
  AdminCmsUseCases,
  PublicCmsUseCases,
  StudentToolRegistryUseCases,
  StudentToolExecutionUseCases,
  StudentToolAnonymousSessionService,
  GpaCalculatorHandler,
  UniversityComparisonHandler,
  MotivationLetterGeneratorHandler,
  ScholarshipRecommendationHandler,
  ReferenceDataUseCases,
  StudyDestinationUseCases,
  AtomicAuditedOutboxMutationExecutor,
  AtomicDomainMutationCoordinator,
  ReferenceResolverService,
  DegreeLevelUseCases,
  AdminServiceCatalogUseCases,
  PublicServiceCatalogUseCases,
  StudentServiceRequestUseCases,
  AdminServiceFulfillmentUseCases,
  FinanceAdminUseCases,
  FinancePlatformUseCases,
  FinanceStudentUseCases,
  CareerAdminUseCases,
  CareerPublicUseCases,
  InternationalTestAdminUseCases,
  AIExecutionOrchestrator,
  AIPlatformAdminUseCases,
  AIWorkflowUseCases,
  AIEvaluationUseCases,
  AIKnowledgeUseCases,
  ImportAdminUseCases,
  ImportWorkerProtocol,
  IngestAssetUseCase,
  ProcessAssetLifecycleUseCase,
  AssetReferencePolicy,
  AdminAcademicTaxonomyUseCases,
  RetentionSweepUseCase,
  RetentionBackgroundJobHandler,
  CmsScheduledPublishingBackgroundJobHandler,
  ImportQueueBackgroundJobHandler,
  AIAsyncBackgroundJobHandler,
  FinanceReconciliationBackgroundJobHandler,
  NotificationDeliveryBackgroundJobHandler,
  EnterpriseEventOutboxProjectionGateway,
  NotificationOutboxDeliveryGateway,
  OwnerDomainOutboxWorker,
  PollingWorkerRuntimeRegistry,
  BackgroundJobHandlerRegistry,
  DurableBackgroundWorker,
  BackgroundWorkerRuntimeState,
} from '@manaratak/application';

// These are directly from src instead of index for some reason
import { ManageNotificationTemplatesUseCase } from '@manaratak/application';
import { SourceConnectorRegistry, AcquireImportSourceUseCase, ScholarshipSourceRegistryService, ScholarshipAcquisitionPlanner, ScholarshipImportNewUseCase, ScholarshipImportDecisionUseCases } from '@manaratak/application';
import { ManageNotificationIntentsUseCase } from '@manaratak/application';
import { ManageAuditRecordsUseCase } from '@manaratak/application';

// Domain Services
import {
  AuthorizationEvaluatorService,
  ConfigurationValidationService,
  FileIntegrityValidationService,
  StudentToolHandlerRegistry,
  StudentToolActivationReadinessService,
  StudentToolHealthService
} from '@manaratak/domain';

// Routers
import { IdentityRouter } from '../../presentation/api/router/IdentityRouter.js';
import { AuthRouter } from '../../presentation/api/router/AuthRouter.js';
import { AuthService } from '@manaratak/application';
import { AuthorizationAdminRouter } from '../../presentation/api/router/AuthorizationAdminRouter.js';
import { AuthorizationRuntimeRouter } from '../../presentation/api/router/AuthorizationRuntimeRouter.js';
import { SettingsAdminRouter } from '../../presentation/api/router/SettingsAdminRouter.js';
import { SettingsRuntimeRouter } from '../../presentation/api/router/SettingsRuntimeRouter.js';
import { FileManagementRouter } from '../../presentation/api/router/FileManagementRouter.js';
import { NotificationRouter } from '../../presentation/api/router/NotificationRouter.js';
import { AuditRouter } from '../../presentation/api/router/AuditRouter.js';
import { SearchRouter } from '../../presentation/api/router/SearchRouter.js';
import { CacheRouter } from '../../presentation/api/router/CacheRouter.js';
import { BackgroundJobRouter } from '../../presentation/api/router/BackgroundJobRouter.js';
import { EnterpriseEventRouter } from '../../presentation/api/router/EnterpriseEventRouter.js';
import { WorkflowRouter } from '../../presentation/api/router/WorkflowRouter.js';
import { ApiFoundationRouter } from '../../presentation/api/router/ApiFoundationRouter.js';
import { SharedComponentRouter } from '../../presentation/api/router/SharedComponentRouter.js';
import { ScholarshipAdminRouter } from '../../presentation/api/router/ScholarshipAdminRouter.js';
import { ImportAdminRouter } from '../../presentation/api/router/ImportAdminRouter.js';
import { CourseImportOperationsRouter } from '../../presentation/api/router/CourseImportOperationsRouter.js';
import { ScholarshipPublicRouter } from '../../presentation/api/router/ScholarshipPublicRouter.js';
import { UniversityAdminRouter } from '../../presentation/api/router/UniversityAdminRouter.js';
import { UniversityPublicRouter } from '../../presentation/api/router/UniversityPublicRouter.js';
import { MajorAdminRouter } from '../../presentation/api/router/MajorAdminRouter.js';
import { MajorPublicRouter } from '../../presentation/api/router/MajorPublicRouter.js';
import { CourseAdminRouter } from '../../presentation/api/router/CourseAdminRouter.js';
import { CourseLearnerRouter } from '../../presentation/api/router/CourseLearnerRouter.js';
import { ImportedCourseAdminRouter } from '../../presentation/api/router/ImportedCourseAdminRouter.js';
import { CoursePublicRouter } from '../../presentation/api/router/CoursePublicRouter.js';
import { CrossDomainReadModelRouter } from '../../presentation/api/router/CrossDomainReadModelRouter.js';
import { CertificateAdminRouter } from '../../presentation/api/router/CertificateAdminRouter.js';
import { CertificatePublicRouter } from '../../presentation/api/router/CertificatePublicRouter.js';
import { StudentWorkspaceRouter } from '../../presentation/api/router/StudentWorkspaceRouter.js';
import { StudentSupportAdminRouter } from '../../presentation/api/router/StudentSupportAdminRouter.js';
import { CmsAdminRouter } from '../../presentation/api/router/CmsAdminRouter.js';
import { CmsPublicRouter } from '../../presentation/api/router/CmsPublicRouter.js';
import { StudentToolsAdminRouter } from '../../presentation/api/router/StudentToolsAdminRouter.js';
import { StudentToolsPublicRouter } from '../../presentation/api/router/StudentToolsPublicRouter.js';
import { ReferenceDataPublicRouter } from '../../presentation/api/router/ReferenceDataPublicRouter.js';
import { ReferenceDataAdminRouter } from '../../presentation/api/router/ReferenceDataAdminRouter.js';
import { StudyDestinationAdminRouter } from '../../presentation/api/router/StudyDestinationAdminRouter.js';
import { StudyDestinationPublicRouter } from '../../presentation/api/router/StudyDestinationPublicRouter.js';
import { ServiceAdminRouter } from '../../presentation/api/router/ServiceAdminRouter.js';
import { ServicePublicRouter } from '../../presentation/api/router/ServicePublicRouter.js';
import { FinanceAdminRouter } from '../../presentation/api/router/FinanceAdminRouter.js';
import { CareerAdminRouter } from '../../presentation/api/router/CareerAdminRouter.js';
import { CareerPublicRouter } from '../../presentation/api/router/CareerPublicRouter.js';
import { InternationalTestAdminRouter } from '../../presentation/api/router/InternationalTestAdminRouter.js';
import { InternationalTestPublicRouter } from '../../presentation/api/router/InternationalTestPublicRouter.js';
import { AIGatewayRouter } from '../../presentation/api/router/AIGatewayRouter.js';
import { AIAdminRouter } from '../../presentation/api/router/AIAdminRouter.js';
import { AssetPlatformRouter } from '../../presentation/api/router/AssetPlatformRouter.js';
import { AcademicTaxonomyPublicRouter } from '../../presentation/api/router/AcademicTaxonomyPublicRouter.js';
import { AcademicTaxonomyAdminRouter } from '../../presentation/api/router/AcademicTaxonomyAdminRouter.js';

const container = createContainer({
  injectionMode: InjectionMode.PROXY
});

// MNT-AUD-0109: the obsolete in-memory Prisma shadow runtime was removed.
// Production composition has one database authority: RuntimeResourceRegistry/PrismaClient.

export function registerDependencies(
  runtimeEnvironment: Readonly<Record<string, string | undefined>> = process.env,
  runtimeConfiguration: { getOptional?<T = string>(key: string): T | undefined } | null = ConfigurationRegistry.getOptionalInstance(),
  suppliedRuntimeResources?: RuntimeResourceRegistry,
) {
  const effectiveEnvironment: Record<string, string | undefined> = { ...runtimeEnvironment };
  let url = effectiveEnvironment.DATABASE_URL;
  if (!url || url.includes('postgres-host') || url.includes('placeholder')) {
    const { SQL_USER, SQL_PASSWORD, SQL_HOST, SQL_DB_NAME } = effectiveEnvironment;
    if (SQL_USER && SQL_PASSWORD && SQL_HOST && SQL_DB_NAME) {
      const encodedPassword = encodeURIComponent(SQL_PASSWORD);
      url = `postgresql://${SQL_USER}:${encodedPassword}@localhost/${SQL_DB_NAME}?host=${SQL_HOST}`;
      effectiveEnvironment.DATABASE_URL = url;
    }
  }

  const productionLike = effectiveEnvironment.NODE_ENV === 'production' || effectiveEnvironment.NODE_ENV === 'staging';
  const readConfig = <T = string>(key: string): T | undefined =>
    runtimeConfiguration?.getOptional?.<T>(key) ?? (effectiveEnvironment[key] as T | undefined);
  const databaseUrl = readConfig<string>('DATABASE_URL')?.trim();
  const isPrisma = Boolean(databaseUrl);
  const assetProviderRuntimeEnvironment: Record<string, string | undefined> = { ...effectiveEnvironment };
  for (const key of [
    'MANARATAK_ASSET_PROVIDER_BASE_URL',
    'MANARATAK_ASSET_PROVIDER_API_KEY',
    'MANARATAK_ASSET_PROVIDER_SIGNING_SECRET',
    'MANARATAK_ASSET_PROVIDER_TIMEOUT_MS',
    'MANARATAK_ASSET_PROVIDER_MAX_RESPONSE_BYTES',
    'MANARATAK_ASSET_PROVIDER_ALLOW_INSECURE_HTTP',
    'MANARATAK_IMPORT_RAW_RETENTION_DAYS',
  ]) {
    const configured = readConfig<string>(key);
    if (configured !== undefined) assetProviderRuntimeEnvironment[key] = configured;
  }
  const financeProviderOptions = () => {
    const baseUrl = readConfig<string>('FINANCE_PROVIDER_BASE_URL')?.trim();
    const apiKey = readConfig<string>('FINANCE_PROVIDER_API_KEY')?.trim();
    const signingSecret = readConfig<string>('FINANCE_PROVIDER_SIGNING_SECRET');
    const supplied = Boolean(baseUrl || apiKey || signingSecret);
    if (supplied && !(baseUrl && apiKey && signingSecret)) throw new Error('FINANCE_PROVIDER_CONFIGURATION_INCOMPLETE');
    if (!(baseUrl && apiKey && signingSecret)) return null;
    const timeoutRaw = readConfig<string>('FINANCE_PROVIDER_TIMEOUT_MS')?.trim();
    const attemptsRaw = readConfig<string>('FINANCE_PROVIDER_MAX_ATTEMPTS')?.trim();
    const timeoutMs = timeoutRaw ? Number(timeoutRaw) : 10_000;
    const maxAttempts = attemptsRaw ? Number(attemptsRaw) : 3;
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) throw new Error('FINANCE_PROVIDER_TIMEOUT_MS_INVALID');
    if (!Number.isSafeInteger(maxAttempts) || maxAttempts < 1 || maxAttempts > 5) throw new Error('FINANCE_PROVIDER_MAX_ATTEMPTS_INVALID');
    return {
      baseUrl,
      apiKey,
      signingSecret,
      timeoutMs,
      maxAttempts,
      allowInsecureHttp: !productionLike && readConfig<string>('FINANCE_PROVIDER_ALLOW_INSECURE_HTTP') === 'true',
    };
  };
  const notificationProviderOptions = () => {
    const baseUrl = readConfig<string>('NOTIFICATION_PROVIDER_BASE_URL')?.trim();
    const apiKey = readConfig<string>('NOTIFICATION_PROVIDER_API_KEY')?.trim();
    const signingSecret = readConfig<string>('NOTIFICATION_PROVIDER_SIGNING_SECRET');
    const supplied = Boolean(baseUrl || apiKey || signingSecret);
    if (supplied && !(baseUrl && apiKey && signingSecret)) throw new Error('NOTIFICATION_PROVIDER_CONFIGURATION_INCOMPLETE');
    if (!(baseUrl && apiKey && signingSecret)) return null;
    const timeoutMs = Number(readConfig<string>('NOTIFICATION_PROVIDER_TIMEOUT_MS') ?? 10_000);
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 120_000) throw new Error('NOTIFICATION_PROVIDER_TIMEOUT_MS_INVALID');
    return { baseUrl, apiKey, signingSecret, timeoutMs, allowInsecureHttp: !productionLike && readConfig<string>('NOTIFICATION_PROVIDER_ALLOW_INSECURE_HTTP') === 'true' };
  };

  const runtimeResources = suppliedRuntimeResources ?? new RuntimeResourceRegistry(effectiveEnvironment, runtimeConfiguration);

  container.register({
    runtimeResourceRegistry: asValue(runtimeResources),
    prisma: asFunction(() => {
      if (!isPrisma) return createUnavailableCapability('database');
      const prisma = runtimeResources.getPrismaClient();
      if (!prisma) throw new Error('DATABASE_URL is required to create the canonical Prisma runtime client.');
      return prisma;
    }).singleton(),
    redisClient: asFunction(() => runtimeResources.getRedisClient()).singleton(),
    // --- Repositories ---
    scholarshipRepository: asFunction(({ prisma }) => new PrismaScholarshipRepository(prisma)).singleton(),
    scholarshipCanonicalLookupGateway: asFunction(({ prisma }) => new PrismaScholarshipCanonicalLookupGateway(prisma)).singleton(),
    universityRepository: asFunction(({ prisma }) => new PrismaUniversityRepository(prisma, readConfig<string>('MANARATAK_UNIVERSITY_LEGACY_COUNTRY_FILTERS') === 'true')).singleton(),
    majorRepository: asFunction(({ prisma }) => new PrismaMajorRepository(prisma, readConfig<string>('MANARATAK_MAJOR_LEGACY_OPTIONAL_FILTERS') === 'true')).singleton(),
    newMajorCandidateRepository: asFunction(({ prisma }) => new PrismaNewMajorCandidateRepository(prisma)).singleton(),
    phase10CatalogRepository: asFunction(({ prisma }) => new Phase10CatalogRepository(prisma, { catalogPath: readConfig<string>('MANARATAK_PHASE10_CATALOG_PATH'), productionLike })).singleton(),
    courseRepository: asFunction(({ prisma }) => new PrismaCourseRepository(prisma)).singleton(),
    courseRelationshipRepository: asFunction(({ prisma }) => new PrismaCourseRelationshipRepository(prisma)).singleton(),
    externalCourseProviderRepository: asFunction(({ prisma }) => new PrismaExternalCourseProviderRepository(prisma)).singleton(),
    courseImportAnalysisRepository: asFunction(({ prisma }) => new PrismaCourseImportAnalysisRepository(prisma)).singleton(),
    courseImportTransferGateway: asFunction(({ prisma }) => new PrismaCourseImportTransferGateway(prisma)).singleton(),
    importedCourseOperationsRepository: asFunction(({ prisma }) => new PrismaImportedCourseOperationsRepository(prisma)).singleton(),
    importedCourseLinkChecker: asClass(SafeImportedCourseLinkChecker).singleton(),
    courseCurriculumRepository: asFunction(({ prisma }) => new PrismaCourseCurriculumRepository(prisma)).singleton(),
    courseProgressRepository: asFunction(({ prisma }) => new PrismaCourseProgressRepository(prisma)).singleton(),
    courseEnrollmentPolicyRepository: asFunction(({ prisma }) => new PrismaCourseEnrollmentPolicyRepository(prisma)).singleton(),
    courseFinancialClearanceGateway: asFunction(({ financePlatformUseCases }) => new Phase19CourseFinancialClearanceGateway(financePlatformUseCases)).singleton(),
    learningPathRepository: asFunction(({ prisma }) => new PrismaLearningPathRepository(prisma)).singleton(),
    certificateRepository: asFunction(({ prisma }) => new PrismaCertificateRepository(prisma)).singleton(),
    studentWorkspaceRepository: asFunction(({ prisma }) => new PrismaStudentWorkspaceRepository(prisma)).singleton(),
    studentApplicationTrackerRepository: asFunction(({ prisma }) => new PrismaStudentApplicationTrackerRepository(prisma)).scoped(),
    studentApplicationScholarshipGateway: asFunction(({ scholarshipRepository }) => new ScholarshipStudentApplicationTrackerGateway(scholarshipRepository)).scoped(),
    studentWorkspaceDeliveryCache: asFunction(({ redisClient }) =>
      redisClient ? new RedisStudentWorkspaceDeliveryCache(redisClient) : null,
    ).singleton(),
    cmsDeliveryCache: asFunction(({ redisClient }) =>
      redisClient ? new RedisCmsDeliveryCache(redisClient) : null,
    ).singleton(),
    cmsRepository: asFunction(({ prisma }) => new PrismaCmsRepository(prisma)).singleton(),
    studentToolRegistryRepository: asFunction(({ prisma }) => new PrismaStudentToolRegistryRepository(prisma)).singleton(),
    studentToolResultProtector: asFunction(() => new EnvironmentStudentToolResultProtector('STUDENT_TOOL_RESULT_KEY', { ...effectiveEnvironment, STUDENT_TOOL_RESULT_KEY: readConfig<string>('STUDENT_TOOL_RESULT_KEY') })).singleton(),
    studentToolAnonymousSessionService: asFunction(() => new StudentToolAnonymousSessionService(readConfig<string>('STUDENT_TOOL_ANONYMOUS_SESSION_SECRET'))).singleton(),
    studentToolsAIConsumerGateway: asFunction(({ aiExecutionUseCases }) => new Phase17StudentToolsAIConsumerGateway(aiExecutionUseCases)).scoped(),
    universityComparisonGateway: asFunction(({ universityRepository }) => new CanonicalUniversityComparisonGateway(universityRepository)).singleton(),
    scholarshipRecommendationGateway: asFunction(({ scholarshipRepository, referenceResolver, degreeLevelRepository }) => new CanonicalScholarshipRecommendationGateway(scholarshipRepository, referenceResolver, degreeLevelRepository)).singleton(),
    studentToolRateLimiter: asFunction(() => {
      const productionLike = effectiveEnvironment.NODE_ENV === 'production' || effectiveEnvironment.NODE_ENV === 'staging';
      if (!productionLike) return new DefaultRateLimiter();
      const redisClient = runtimeResources.getRedisClient();
      if (!redisClient) throw new Error('STUDENT_TOOL_QUOTA_STORE_UNAVAILABLE');
      const namespace = readConfig<string>('REDIS_NAMESPACE')?.trim() || 'manaratak:';
      return new RedisRateLimiter(redisClient, `${namespace}student-tools:quota:`);
    }).singleton(),
    studentToolRateLimitGateway: asFunction(({ studentToolRateLimiter }) => new StudentToolRateLimitGateway(studentToolRateLimiter)).singleton(),
    studentToolSaveGateway: asFunction(({ studentWorkspaceRepository }) => new Phase15StudentToolSaveGateway(studentWorkspaceRepository)).singleton(),
    studentContextGateway: asFunction(({ studentWorkspaceRepository }) => new Phase15StudentContextGateway(studentWorkspaceRepository)).singleton(),
    studentToolDependencyHealthGateway: asFunction(({ aiExecutionUseCases, universityRepository, scholarshipRepository }) => new EnterpriseStudentToolDependencyHealthGateway(aiExecutionUseCases, universityRepository, scholarshipRepository)).scoped(),
    studentToolHandlerRegistry: asFunction(({ universityComparisonGateway, scholarshipRecommendationGateway, studentToolsAIConsumerGateway, studentContextGateway }) => new StudentToolHandlerRegistry([
      new GpaCalculatorHandler(),
      new UniversityComparisonHandler(universityComparisonGateway),
      new MotivationLetterGeneratorHandler(studentToolsAIConsumerGateway),
      new ScholarshipRecommendationHandler(scholarshipRecommendationGateway, studentToolsAIConsumerGateway, studentContextGateway),
    ])).singleton(),
    studentToolActivationReadinessService: asFunction(({ studentToolHandlerRegistry, studentToolDependencyHealthGateway, studentToolResultProtector }) => new StudentToolActivationReadinessService(studentToolHandlerRegistry, studentToolDependencyHealthGateway, studentToolResultProtector)).scoped(),
    studentToolHealthService: asFunction(({ studentToolHandlerRegistry, studentToolDependencyHealthGateway, studentToolResultProtector }) => new StudentToolHealthService(studentToolHandlerRegistry, studentToolDependencyHealthGateway, studentToolResultProtector)).scoped(),
    referenceDataRepository: asFunction(({ prisma }) => new PrismaReferenceDataRepository(prisma)).singleton(),
    studyDestinationRepository: asFunction(({ prisma }) => new PrismaStudyDestinationRepository(prisma)).singleton(),
    servicePlatformRepository: asFunction(({ prisma }) => new PrismaServicePlatformRepository(prisma)).singleton(),
    serviceCatalogRepository: asFunction(({ servicePlatformRepository }) => servicePlatformRepository).singleton(),
    serviceRequestRepository: asFunction(({ servicePlatformRepository }) => servicePlatformRepository).singleton(),
    financeRepository: asFunction(({ prisma }) => new PrismaFinanceRepository(prisma)).singleton(),
    financeCurrencyReferenceGateway: asFunction(({ prisma }) => new PrismaFinanceCurrencyReferenceGateway(prisma)).singleton(),
    financePaymentGatewayRegistry: asFunction(() => {
      const providerKey = readConfig<string>('FINANCE_PAYMENT_PROVIDER_KEY')?.trim() || 'PRIMARY_PAYMENT';
      return new FinancePaymentGatewayRegistry([
        new EnvironmentPaymentGatewayAdapter(providerKey, financeProviderOptions()),
      ]);
    }).singleton(),
    financeFxRateProvider: asFunction(() => {
      const providerKey = readConfig<string>('FINANCE_FX_PROVIDER_KEY')?.trim() || 'PRIMARY_FX';
      return new EnvironmentFxRateProviderAdapter(providerKey, financeProviderOptions());
    }).singleton(),
    financeBankTransferGatewayRegistry: asFunction(() => {
      const providerKey = readConfig<string>('FINANCE_BANK_PROVIDER_KEY')?.trim() || 'PRIMARY_BANK';
      return new FinanceBankTransferGatewayRegistry([
        new EnvironmentBankTransferGatewayAdapter(providerKey, financeProviderOptions()),
      ]);
    }).singleton(),
    financeTransferFeePolicy: asFunction(() => {
      const raw = readConfig<string>('FINANCE_TRANSFER_FEE_BPS')?.trim();
      const basisPoints = raw ? Number(raw) : 0;
      if (!Number.isInteger(basisPoints) || basisPoints < 0 || basisPoints > 10_000)
        throw new Error('FINANCE_TRANSFER_FEE_BPS must be an integer between 0 and 10000');
      return {
        policyReference: readConfig<string>('FINANCE_TRANSFER_FEE_POLICY_REFERENCE')?.trim() || (basisPoints === 0 ? 'NO_TRANSFER_FEE_V1' : 'CONFIGURED_TRANSFER_FEE_V1'),
        basisPoints,
      };
    }).singleton(),
    careerRepository: asFunction(({ prisma }) => new PrismaCareerRepository(prisma)).singleton(),
    internationalTestRepository: asFunction(({ prisma }) => new PrismaInternationalTestRepository(prisma)).singleton(),
    aiPlatformRepository: asFunction(({ prisma }) => new PrismaAIPlatformRepository(prisma)).singleton(),
    aiAsyncPayloadProtector: asFunction(() => new EnvironmentAIAsyncPayloadProtector('AI_ASYNC_PAYLOAD_KEY', effectiveEnvironment)).singleton(),
    importRepository: asFunction(({ prisma }) => new PrismaImportRepository(prisma)).singleton(),
    academicTaxonomyRepository: asFunction(({ prisma }) => new PrismaAcademicTaxonomyRepository(prisma)).singleton(),
    degreeLevelRepository: asFunction(({ prisma }) => new DegreeLevelRepository(prisma)).singleton(),
    canonicalMajorReferenceService: asFunction(({ academicTaxonomyRepository, degreeLevelRepository }) =>
      new CanonicalMajorReferenceService(academicTaxonomyRepository, degreeLevelRepository)).scoped(),
    degreeLevelUseCases: asFunction(({ degreeLevelRepository }) => new DegreeLevelUseCases(degreeLevelRepository)).scoped(),
    importHandoffDispatcher: asFunction(({ scholarshipImportHandoffConsumer, universityImportHandoffConsumer, internationalTestImportHandoffConsumer }) => new ImportHandoffDispatcher({
      SCHOLARSHIPS: scholarshipImportHandoffConsumer,
      SCHOLARSHIP: scholarshipImportHandoffConsumer,
      UNIVERSITIES: universityImportHandoffConsumer,
      UNIVERSITY: universityImportHandoffConsumer,
      TESTS: internationalTestImportHandoffConsumer,
      INTERNATIONAL_TESTS: internationalTestImportHandoffConsumer,
    })).scoped(),
    importQueueGateway: asFunction(({ prisma }) => isPrisma
      ? new PrismaImportQueueGateway(prisma)
      : new InMemoryImportQueueGateway()).singleton(),
    importWorkerRetryPolicy: asFunction(() => ImportRetryPolicy.create({
      maxAttempts: 5,
      dlqAfterAttempts: 5,
      backoffStrategy: 'exponential',
      initialDelayMs: 1_000,
      maxDelayMs: 60_000,
      retryableErrorCodes: [
        'SOURCE_REQUEST_TIMEOUT',
        'SOURCE_UPSTREAM_UNAVAILABLE',
        'IMPORT_TRANSIENT_FAILURE',
      ],
    })).singleton(),
    importWorkerProtocol: asFunction(({ importQueueGateway, importWorkerRetryPolicy }) =>
      new ImportWorkerProtocol(importQueueGateway, importWorkerRetryPolicy, 30_000)).singleton(),
    safeSourceHttpTransport: asFunction(() => new NodeSafeSourceHttpTransport()).singleton(),
    staticHtmlSourceConnector: asFunction(({ safeSourceHttpTransport }) => new StaticHtmlSourceConnector(safeSourceHttpTransport)).singleton(),
    sitemapSourceConnector: asFunction(({ safeSourceHttpTransport }) => new SitemapSourceConnector(safeSourceHttpTransport)).singleton(),
    officialFeedSourceConnector: asFunction(({ safeSourceHttpTransport }) => new OfficialFeedSourceConnector(safeSourceHttpTransport)).singleton(),
    officialApiSourceConnector: asFunction(({ safeSourceHttpTransport }) => new OfficialApiSourceConnector(safeSourceHttpTransport)).singleton(),
    manualUploadSourceConnector: asClass(ManualUploadSourceConnector).singleton(),
    sourceConnectorRegistry: asFunction(({ staticHtmlSourceConnector, sitemapSourceConnector, officialFeedSourceConnector, officialApiSourceConnector, manualUploadSourceConnector }) =>
      new SourceConnectorRegistry([staticHtmlSourceConnector, sitemapSourceConnector, officialFeedSourceConnector, officialApiSourceConnector, manualUploadSourceConnector])).singleton(),
    importRawSnapshotStore: asFunction(() => createImportRawSnapshotStoreForRuntime(effectiveEnvironment, readConfig<string>('IMPORT_RAW_SNAPSHOT_DIR'))).singleton(),
    sourceAcquisitionLimiter: asFunction(() => new SourceAcquisitionLimiter()).singleton(),
    acquireImportSourceUseCase: asFunction(({ sourceConnectorRegistry, importRawSnapshotStore, sourceAcquisitionLimiter }) =>
      new AcquireImportSourceUseCase(sourceConnectorRegistry, importRawSnapshotStore, sourceAcquisitionLimiter)).scoped(),
    sourceRegistryGateway: asFunction(({ prisma }) => isPrisma ? new PrismaSourceRegistryGateway(prisma) : new InMemorySourceRegistryGateway()).singleton(),
    scholarshipSourceRegistryService: asFunction(({ sourceRegistryGateway }) => new ScholarshipSourceRegistryService(sourceRegistryGateway)).singleton(),
    scholarshipAcquisitionPlanner: asFunction(({ scholarshipSourceRegistryService }) => new ScholarshipAcquisitionPlanner(scholarshipSourceRegistryService)).singleton(),
    scholarshipImportNewUseCase: asFunction(({ sourceRegistryGateway, scholarshipAcquisitionPlanner, acquireImportSourceUseCase, importAdminUseCases }) =>
      new ScholarshipImportNewUseCase(sourceRegistryGateway, scholarshipAcquisitionPlanner, acquireImportSourceUseCase, importAdminUseCases)).scoped(),
    scholarshipImportVerificationDecisionPort: asFunction(({ prisma }) => isPrisma ? new PrismaScholarshipImportVerificationDecisionPort(prisma) : new InMemoryScholarshipImportVerificationDecisionPort()).singleton(),
    scholarshipImportCanonicalResolutionDecisionPort: asFunction(({ prisma }) => isPrisma ? new PrismaScholarshipImportCanonicalResolutionDecisionPort(prisma) : new InMemoryScholarshipImportCanonicalResolutionDecisionPort()).singleton(),
    scholarshipImportDecisionUseCases: asFunction(({ importRepository, scholarshipImportVerificationDecisionPort, scholarshipImportCanonicalResolutionDecisionPort, scholarshipCanonicalResolutionService }) => new ScholarshipImportDecisionUseCases(importRepository, scholarshipImportVerificationDecisionPort, scholarshipImportCanonicalResolutionDecisionPort, scholarshipCanonicalResolutionService)).scoped(),
    assetRecordRepository: asFunction(({ prisma }) => new PrismaAssetRecordRepository(prisma)).singleton(),
    assetReferencePolicy: asFunction(({ assetRecordRepository }) => new AssetReferencePolicy(assetRecordRepository)).singleton(),
    assetStorageGateway: asFunction(() => createAssetStorageGatewayForRuntime(assetProviderRuntimeEnvironment)).singleton(),
    assetMalwareScannerGateway: asFunction(() => createAssetMalwareScannerGatewayForRuntime(assetProviderRuntimeEnvironment)).singleton(),
    assetSanitizationGateway: asFunction(() => createAssetSanitizationGatewayForRuntime(assetProviderRuntimeEnvironment)).singleton(),
    assetUsageRegistryGateway: asFunction(({ prisma }) => new PrismaAssetUsageRegistryGateway(prisma)).singleton(),
    retentionDecisionRepository: asFunction(({ prisma }) => isPrisma ? new PrismaRetentionDecisionRepository(prisma) : createUnavailableCapability('retentionDecisionPersistence')).singleton(),
    importRetentionGateway: asFunction(({ prisma }) => isPrisma ? new PrismaImportRetentionGateway(prisma) : createUnavailableCapability('importRetentionGateway')).singleton(),
    auditRetentionGateway: asFunction(({ prisma }) => isPrisma ? new PrismaAuditRetentionGateway(prisma) : createUnavailableCapability('auditRetentionGateway')).singleton(),

    hierarchyValidationService: asClass(HierarchyValidationService).singleton(),
    referenceDataValidationService: asClass(ReferenceDataValidationService).singleton(),
    academicTaxonomyValidationService: asFunction(({ hierarchyValidationService }) =>
      new AcademicTaxonomyValidationService(hierarchyValidationService)).singleton(),
    configurationResolutionService: asFunction(({ settingDefinitionRepo, settingAssignmentRepo }) => new ConfigurationResolutionService(settingDefinitionRepo, settingAssignmentRepo)).singleton(),

    identityRepository: asFunction((cradle: any) => isPrisma ? new PrismaIdentityRepository(cradle.prisma) : new InMemoryIdentityRepository()).singleton(),
    roleRepository: asFunction(({ prisma }) => isPrisma ? new PrismaRoleRepository(prisma) : new InMemoryRoleRepository()).singleton(),
    policyRepository: asFunction(({ prisma }) => isPrisma ? new PrismaPolicyRepository(prisma) : new InMemoryPolicyRepository()).singleton(),
    roleAssignmentRepository: asFunction(({ prisma }) => isPrisma ? new PrismaRoleAssignmentRepository(prisma) : new InMemoryRoleAssignmentRepository()).singleton(),
    emergencyAccessRepository: asFunction(({ prisma }) => isPrisma ? new PrismaEmergencyAccessRepository(prisma) : new InMemoryEmergencyAccessRepository()).singleton(),
    settingDefinitionRepo: asFunction(({ prisma }) => new PrismaSettingDefinitionRepository(prisma)).singleton(),
    settingAssignmentRepo: asFunction(({ prisma }) => new PrismaSettingAssignmentRepository(prisma)).singleton(),
    fileRepo: asFunction(() => createUnavailableCapability('fileRecordPersistence')).singleton(),
    notificationIntentRepo: asFunction(({ prisma }) => new PrismaNotificationIntentRepository(prisma)).singleton(),
    notificationDeliveryRepo: asFunction(({ notificationIntentRepo }) => notificationIntentRepo).singleton(),
    notificationTemplateRepo: asFunction(({ prisma }) => new PrismaNotificationTemplateRepository(prisma)).singleton(),
    auditRecordRepo: asFunction(({ prisma }) => new PrismaAuditRecordRepository(prisma)).singleton(),
    apiIdempotencyStore: asFunction(({ prisma }) => new PrismaApiIdempotencyStore(prisma)).singleton(),
    transactionalOutboxStore: asFunction(({ prisma }) => new PrismaTransactionalOutboxStore(prisma)).singleton(),
    atomicPersistenceUnitOfWork: asFunction(({ prisma }) => new PrismaAtomicPersistenceUnitOfWork(prisma)).singleton(),
    atomicAuditedOutboxMutationExecutor: asFunction(({ atomicPersistenceUnitOfWork, auditRecordRepo, transactionalOutboxStore }) =>
      new AtomicAuditedOutboxMutationExecutor(atomicPersistenceUnitOfWork, auditRecordRepo, transactionalOutboxStore)).singleton(),
    atomicDomainMutationCoordinator: asFunction(({ atomicAuditedOutboxMutationExecutor }) =>
      new AtomicDomainMutationCoordinator(atomicAuditedOutboxMutationExecutor)).singleton(),
    searchRequestRepo: asFunction(({ prisma }) => new PrismaSearchRequestRepository(prisma)).singleton(),
    cacheEntryRepo: asFunction(() => createUnavailableCapability('cachePersistence')).singleton(),
    bgJobRepo: asFunction(({ prisma }) => {
      if (isPrisma) return new PrismaBackgroundJobRepository(prisma);
      if (productionLike) return createUnavailableCapability('backgroundJobPersistence');
      return new InMemoryBackgroundJobRepository();
    }).singleton(),
    enterpriseEventRepo: asFunction(({ prisma }) => {
      if (isPrisma) return new PrismaEnterpriseEventRepository(prisma);
      if (productionLike) return createUnavailableCapability('enterpriseEventPersistence');
      return new InMemoryEnterpriseEventRepository();
    }).singleton(),
    workflowRepo: asFunction(({ prisma }) => new PrismaWorkflowRepository(prisma)).singleton(),
    apiServiceRepo: asFunction(({ prisma }) => new PrismaApiServiceRepository(prisma)).singleton(),
    sharedComponentRepo: asFunction(({ prisma }) => new PrismaSharedComponentRepository(prisma)).singleton(),
    

    // --- Gateways & Providers ---
    storageGateway: asFunction(() => createUnavailableCapability('fileStorage')).singleton(),
    notificationPrefGateway: asFunction(({ prisma }) => new PrismaStudentNotificationPreferenceGateway(prisma)).singleton(),
    notificationDeliveryGateway: asFunction(() => {
      const options = notificationProviderOptions();
      if (!options) return createUnavailableCapability('notificationDeliveryProvider');
      return new ProviderNotificationDeliveryGateway(options);
    }).singleton(),
    searchEngineGateway: asFunction(({ prisma }) => new PrismaPublicSearchEngineGateway(prisma)).singleton(),
    cacheExecutionGateway: asFunction(() => createUnavailableCapability('cacheExecution')).singleton(),
    bgJobGateway: asFunction(({ prisma }) => {
      if (isPrisma) return new PrismaBackgroundJobExecutionGateway(prisma);
      if (productionLike) return createUnavailableCapability('backgroundJobExecution');
      return new InMemoryBackgroundJobExecutionGateway();
    }).singleton(),
    durableBackgroundJobQueue: asFunction(({ bgJobGateway }) => {
      if (typeof bgJobGateway?.claimDue !== 'function') return createUnavailableCapability('durableBackgroundJobQueue');
      return bgJobGateway;
    }).singleton(),
    backgroundWorkerRuntimeState: asClass(BackgroundWorkerRuntimeState).singleton(),
    eventPublishingGateway: asFunction(({ prisma }) => {
      if (isPrisma) return new PrismaEventPublishingGateway(prisma);
      if (productionLike) return createUnavailableCapability('enterpriseEventPublishing');
      return new InMemoryEventPublishingGateway();
    }).singleton(),
    workflowExecutionGateway: asFunction(({ prisma }) => new PrismaWorkflowExecutionGateway(prisma)).singleton(),
    apiExposureGateway: asFunction(({ prisma }) => new PrismaApiExposureGateway(prisma)).singleton(),
    renderingGateway: asFunction(({ prisma }) => new PrismaComponentRenderingGateway(prisma)).singleton(),
    aiProviderRegistry: asFunction(() => createDefaultAIProviderRegistry({ readSecret: (reference) => readConfig<string>(reference) })).singleton(),

    // --- Domain Services ---
    policyEvaluator: asClass(DefaultPolicyEvaluator).singleton(),
    authEvaluatorService: asFunction(({ roleRepository, policyRepository, roleAssignmentRepository, policyEvaluator, emergencyAccessRepository }) => 
      new AuthorizationEvaluatorService(roleRepository, policyRepository, roleAssignmentRepository, policyEvaluator, emergencyAccessRepository)).singleton(),
    configurationValidationService: asClass(ConfigurationValidationService).singleton(),
    fileIntegrityValidationService: asClass(FileIntegrityValidationService).singleton(),

    // --- UseCases ---
    adminScholarshipUseCases: asFunction(({ scholarshipRepository, atomicDomainMutationCoordinator, scholarshipCanonicalLookupGateway }) =>
      new AdminScholarshipUseCases(scholarshipRepository, atomicDomainMutationCoordinator, scholarshipCanonicalLookupGateway)).scoped(),
    publicScholarshipUseCases: asFunction(({ scholarshipRepository }) => new PublicScholarshipUseCases(scholarshipRepository)).scoped(),
    // WP12-3/4: Phase 12 owns the semantic consumer; Phase 6 supplies only UniversalImportHandoff data.
    scholarshipCanonicalResolutionService: asFunction(({ scholarshipCanonicalLookupGateway }) =>
      new ScholarshipCanonicalResolutionService(scholarshipCanonicalLookupGateway)).singleton(),
    scholarshipHandoffCanonicalScreeningService: asFunction(({ scholarshipCanonicalResolutionService }) =>
      new ScholarshipHandoffCanonicalScreeningService(scholarshipCanonicalResolutionService)).singleton(),
    scholarshipDuplicateLookup: asFunction(({ scholarshipRepository }) =>
      new ScholarshipRepositoryDuplicateLookup(scholarshipRepository)).scoped(),
    scholarshipImportHandoffConsumer: asFunction(({ scholarshipHandoffCanonicalScreeningService, scholarshipDuplicateLookup }) =>
      new ScholarshipImportHandoffService(scholarshipHandoffCanonicalScreeningService, scholarshipDuplicateLookup)).scoped(),
    adminUniversityUseCases: asFunction(({ universityRepository, atomicDomainMutationCoordinator, assetReferencePolicy }) =>
      new AdminUniversityUseCases(universityRepository, atomicDomainMutationCoordinator, undefined, undefined, assetReferencePolicy)).scoped(),
    universityImportHandoffConsumer: asFunction(({ universityRepository }) =>
      new UniversityImportHandoffService(universityRepository)).scoped(),
    internationalTestImportHandoffConsumer: asFunction(({ internationalTestRepository }) =>
      new InternationalTestImportHandoffService(internationalTestRepository)).scoped(),
    adminMajorUseCases: asFunction(({ majorRepository, phase10CatalogRepository, atomicDomainMutationCoordinator, canonicalMajorReferenceService, newMajorCandidateRepository }) =>
      new AdminMajorUseCases(majorRepository, phase10CatalogRepository, undefined, undefined, atomicDomainMutationCoordinator, canonicalMajorReferenceService, newMajorCandidateRepository)).scoped(),
    coursePublicationService: asFunction(({ courseRepository, importedCourseOperationsRepository, atomicDomainMutationCoordinator, courseRelationshipRepository }) =>
      new CoursePublicationService(courseRepository, importedCourseOperationsRepository, atomicDomainMutationCoordinator, courseRelationshipRepository)).scoped(),
    adminCourseUseCases: asFunction(({ courseRepository, coursePublicationService, assetReferencePolicy }) => new AdminCourseUseCases(courseRepository, coursePublicationService, assetReferencePolicy)).scoped(),
    courseImportArtifactUseCase: asFunction(({ assetRecordRepository, assetStorageGateway, externalCourseProviderRepository, importAdminUseCases }) =>
      new CourseImportArtifactUseCase(assetRecordRepository, assetStorageGateway, externalCourseProviderRepository, importAdminUseCases)).scoped(),
    courseImportIdentityDiffUseCase: asFunction(({ importRepository, externalCourseProviderRepository, courseImportAnalysisRepository }) =>
      new CourseImportIdentityDiffUseCase(importRepository, externalCourseProviderRepository, courseImportAnalysisRepository)).scoped(),
    courseImportCoordinator: asFunction(({ courseImportTransferGateway, courseRepository, atomicDomainMutationCoordinator }) =>
      new CourseImportCoordinator(courseImportTransferGateway, courseRepository, atomicDomainMutationCoordinator)).scoped(),
    importedCourseAdminUseCases: asFunction(({ importedCourseOperationsRepository, externalCourseProviderRepository, adminCourseUseCases, importedCourseLinkChecker }) =>
      new ImportedCourseAdminUseCases(importedCourseOperationsRepository, externalCourseProviderRepository, adminCourseUseCases, importedCourseLinkChecker)).scoped(),
    courseImportOperationsUseCases: asFunction(({ importedCourseOperationsRepository, importRepository, courseImportCoordinator, courseImportIdentityDiffUseCase }) =>
      new CourseImportOperationsUseCases(importedCourseOperationsRepository, importRepository, courseImportCoordinator, courseImportIdentityDiffUseCase)).scoped(),
    publicCourseUseCases: asFunction(({ courseRepository }) => new PublicCourseUseCases(courseRepository)).scoped(),
    courseRelationshipQueryService: asFunction(({ courseRelationshipRepository }) => new CourseRelationshipQueryService(courseRelationshipRepository)).scoped(),
    courseRelationshipResolutionService: asFunction(({ courseRelationshipRepository }) => new CourseRelationshipResolutionService(courseRelationshipRepository)).scoped(),
    crossDomainGraphReadService: asFunction(({ majorRepository, universityRepository, scholarshipRepository, internationalTestRepository, courseRelationshipRepository, referenceDataRepository, cmsRepository, serviceCatalogRepository, careerRepository }) =>
      new CrossDomainGraphReadService(majorRepository, universityRepository, scholarshipRepository, internationalTestRepository, courseRelationshipRepository, referenceDataRepository, cmsRepository, serviceCatalogRepository, careerRepository)).scoped(),
    courseCurriculumUseCases: asFunction(({ courseRepository, courseCurriculumRepository, assetRecordRepository }) => new CourseCurriculumUseCases(courseRepository, courseCurriculumRepository, assetRecordRepository)).scoped(),
    courseEnrollmentPolicyUseCases: asFunction(({ courseRepository, courseEnrollmentPolicyRepository }) =>
      new CourseEnrollmentPolicyUseCases(courseRepository, courseEnrollmentPolicyRepository)).scoped(),
    courseProgressUseCases: asFunction(({ courseRepository, courseCurriculumRepository, courseProgressRepository, courseEnrollmentPolicyRepository, courseFinancialClearanceGateway, atomicDomainMutationCoordinator }) =>
      new CourseProgressUseCases(courseRepository, courseCurriculumRepository, courseProgressRepository, courseEnrollmentPolicyRepository, courseFinancialClearanceGateway, atomicDomainMutationCoordinator)).scoped(),
    learningPathUseCases: asFunction(({ learningPathRepository, courseRepository, courseProgressRepository, atomicDomainMutationCoordinator }) =>
      new LearningPathUseCases(learningPathRepository, courseRepository, courseProgressRepository, atomicDomainMutationCoordinator)).scoped(),
    nativeCourseUseCases: asFunction(({ courseRepository, courseCurriculumRepository, assetRecordRepository, coursePublicationService, courseRelationshipRepository, courseEnrollmentPolicyRepository }) =>
      new NativeCourseUseCases(courseRepository, courseCurriculumRepository, assetRecordRepository, coursePublicationService, courseRelationshipRepository, courseEnrollmentPolicyRepository)).scoped(),
    certificateUseCases: asFunction(({ certificateRepository, courseRepository, assetRecordRepository, learningPathRepository, identityRepository }) => new CertificateUseCases(certificateRepository, courseRepository, assetRecordRepository, { signingKeyReference: readConfig<string>('CERTIFICATE_SIGNING_KEY_REFERENCE'), signingSecret: readConfig<string>('CERTIFICATE_SIGNING_SECRET'), publicVerificationBaseUrl: readConfig<string>('CERTIFICATE_PUBLIC_VERIFICATION_BASE_URL'), productionLike }, learningPathRepository, identityRepository)).scoped(),
    certificateRenderingService: asClass(ProviderNeutralCertificateRenderingService).singleton(),
    certificateArtifactStore: asFunction(({ assetRecordRepository, ingestAssetUseCase, processAssetLifecycleUseCase }) => new EapCertificateArtifactStore(assetRecordRepository, ingestAssetUseCase, processAssetLifecycleUseCase)).scoped(),
    certificateArtifactRenderUseCase: asFunction(({ certificateRepository, certificateRenderingService, certificateArtifactStore }) => new CertificateArtifactRenderUseCase(certificateRepository, certificateRenderingService, certificateArtifactStore)).scoped(),
    certificateCompletionEventConsumer: asFunction(({ certificateUseCases, certificateArtifactRenderUseCase }) => new CertificateCompletionEventConsumer(certificateUseCases, certificateArtifactRenderUseCase)).scoped(),
    certificateCompletionOutboxDeliveryGateway: asFunction(({ certificateCompletionEventConsumer }) => new CertificateCompletionOutboxDeliveryGateway(certificateCompletionEventConsumer)).scoped(),
    enterpriseEventOutboxProjectionGateway: asFunction(({ enterpriseEventRepo }) => new EnterpriseEventOutboxProjectionGateway(enterpriseEventRepo)).scoped(),
    notificationOutboxDeliveryGateway: asFunction(({ intentsUseCase, notificationTemplateRepo }) => new NotificationOutboxDeliveryGateway(intentsUseCase, notificationTemplateRepo)).scoped(),
    certificateCompletionFanoutDeliveryGateway: asFunction(({ certificateCompletionOutboxDeliveryGateway, studentWorkspaceOutboxDeliveryGateway, enterpriseEventOutboxProjectionGateway, notificationOutboxDeliveryGateway }) => new FanoutOutboxDeliveryGateway([certificateCompletionOutboxDeliveryGateway, studentWorkspaceOutboxDeliveryGateway, enterpriseEventOutboxProjectionGateway, notificationOutboxDeliveryGateway])).scoped(),
    certificateCompletionOutboxDispatcher: asFunction(({ transactionalOutboxStore, certificateCompletionFanoutDeliveryGateway }) => new TransactionalOutboxDispatcher(transactionalOutboxStore, certificateCompletionFanoutDeliveryGateway)).scoped(),
    certificateCompletionOutboxWorker: asFunction(({ certificateCompletionOutboxDispatcher }) => new CertificateCompletionOutboxWorker(certificateCompletionOutboxDispatcher)).scoped(),
    certificateReadModelService: asFunction(({ certificateRepository, certificateUseCases }) => new CertificateReadModelService(certificateRepository, certificateUseCases)).scoped(),
    studentWorkspaceUseCases: asFunction(({ studentWorkspaceRepository, studentWorkspaceDeliveryCache, assetReferencePolicy }) => new StudentWorkspaceUseCases(studentWorkspaceRepository, studentWorkspaceDeliveryCache, assetReferencePolicy)).scoped(),
    studentApplicationReminderGateway: asFunction(({ intentsUseCase, templatesUseCase }) => new StudentApplicationReminderNotificationGateway(intentsUseCase, templatesUseCase)).scoped(),
    studentApplicationTrackerUseCases: asFunction(({ studentApplicationTrackerRepository, studentApplicationScholarshipGateway, studentApplicationReminderGateway }) => new StudentApplicationTrackerUseCases(studentApplicationTrackerRepository, studentApplicationScholarshipGateway, studentApplicationReminderGateway)).scoped(),
    studentWorkspaceOutboxDeliveryGateway: asFunction(({ studentWorkspaceUseCases }) => new StudentWorkspaceOutboxDeliveryGateway(studentWorkspaceUseCases)).scoped(),
    studentWorkspaceFanoutOutboxDeliveryGateway: asFunction(({ studentWorkspaceOutboxDeliveryGateway, enterpriseEventOutboxProjectionGateway, notificationOutboxDeliveryGateway }) => new FanoutOutboxDeliveryGateway([studentWorkspaceOutboxDeliveryGateway, enterpriseEventOutboxProjectionGateway, notificationOutboxDeliveryGateway])).scoped(),
    studentWorkspaceOutboxDispatcher: asFunction(({ transactionalOutboxStore, studentWorkspaceFanoutOutboxDeliveryGateway }) => new TransactionalOutboxDispatcher(transactionalOutboxStore, studentWorkspaceFanoutOutboxDeliveryGateway)).scoped(),
    studentWorkspaceOutboxWorker: asFunction(({ studentWorkspaceOutboxDispatcher }) => new StudentWorkspaceOutboxWorker(studentWorkspaceOutboxDispatcher)).scoped(),
    ownerDomainProjectionDispatcher: asFunction(({ transactionalOutboxStore, enterpriseEventOutboxProjectionGateway }) => new TransactionalOutboxDispatcher(transactionalOutboxStore, enterpriseEventOutboxProjectionGateway)).scoped(),
    ownerDomainServicesDeliveryGateway: asFunction(({ enterpriseEventOutboxProjectionGateway, notificationOutboxDeliveryGateway }) => new FanoutOutboxDeliveryGateway([enterpriseEventOutboxProjectionGateway, notificationOutboxDeliveryGateway])).scoped(),
    ownerDomainServicesDispatcher: asFunction(({ transactionalOutboxStore, ownerDomainServicesDeliveryGateway }) => new TransactionalOutboxDispatcher(transactionalOutboxStore, ownerDomainServicesDeliveryGateway)).scoped(),
    ownerDomainOutboxWorker: asFunction(({ ownerDomainProjectionDispatcher, ownerDomainServicesDispatcher }) => new OwnerDomainOutboxWorker(ownerDomainProjectionDispatcher, ownerDomainServicesDispatcher)).scoped(),
    pollingWorkerRuntimeRegistry: asClass(PollingWorkerRuntimeRegistry).singleton(),
    majorStudentSavedItemHydrationGateway: asFunction(({ majorRepository }) => new MajorStudentSavedItemHydrationGateway(majorRepository)).scoped(),
    universityStudentSavedItemHydrationGateway: asFunction(({ universityRepository }) => new UniversityStudentSavedItemHydrationGateway(universityRepository)).scoped(),
    scholarshipStudentSavedItemHydrationGateway: asFunction(({ scholarshipRepository }) => new ScholarshipStudentSavedItemHydrationGateway(scholarshipRepository)).scoped(),
    cmsStudentSavedItemHydrationGateway: asFunction(({ cmsRepository }) => new CmsStudentSavedItemHydrationGateway(cmsRepository)).scoped(),
    serviceStudentSavedItemHydrationGateway: asFunction(({ serviceCatalogRepository }) => new ServiceStudentSavedItemHydrationGateway(serviceCatalogRepository)).scoped(),
    courseStudentSavedItemHydrationGateway: asFunction(({ courseRepository }) => new CourseStudentSavedItemHydrationGateway(courseRepository)).scoped(),
    studentSavedItemHydrationService: asFunction(({ studentWorkspaceRepository, majorStudentSavedItemHydrationGateway, universityStudentSavedItemHydrationGateway, scholarshipStudentSavedItemHydrationGateway, cmsStudentSavedItemHydrationGateway, serviceStudentSavedItemHydrationGateway, courseStudentSavedItemHydrationGateway }) => new StudentSavedItemHydrationService(studentWorkspaceRepository, [majorStudentSavedItemHydrationGateway, universityStudentSavedItemHydrationGateway, scholarshipStudentSavedItemHydrationGateway, cmsStudentSavedItemHydrationGateway, serviceStudentSavedItemHydrationGateway, courseStudentSavedItemHydrationGateway])).scoped(),
    courseStudentDashboardReadGateway: asFunction(({ courseProgressRepository, courseRepository }) => new CourseStudentDashboardReadGateway(courseProgressRepository, courseRepository)).scoped(),
    certificateStudentDashboardReadGateway: asFunction(({ certificateReadModelService }) => new CertificateStudentDashboardReadGateway(certificateReadModelService)).scoped(),
    studentDashboardHydrationService: asFunction(({ studentWorkspaceUseCases, courseStudentDashboardReadGateway, certificateStudentDashboardReadGateway }) => new StudentDashboardHydrationService(studentWorkspaceUseCases, courseStudentDashboardReadGateway, certificateStudentDashboardReadGateway)).scoped(),
    adminCmsUseCases: asFunction(({ cmsRepository, cmsDeliveryCache, assetReferencePolicy }) => new AdminCmsUseCases(cmsRepository, cmsDeliveryCache, assetReferencePolicy)).scoped(),
    publicCmsUseCases: asFunction(({ cmsRepository, cmsDeliveryCache }) => new PublicCmsUseCases(cmsRepository, cmsDeliveryCache)).scoped(),
    studentToolRegistryUseCases: asFunction(({ studentToolRegistryRepository, studentToolActivationReadinessService, studentToolHealthService, studentToolDependencyHealthGateway, assetReferencePolicy }) => new StudentToolRegistryUseCases(studentToolRegistryRepository, studentToolActivationReadinessService, studentToolHealthService, studentToolDependencyHealthGateway, assetReferencePolicy)).scoped(),
    studentToolExecutionUseCases: asFunction(({ studentToolRegistryRepository, studentToolHandlerRegistry, studentToolRateLimitGateway, studentToolDependencyHealthGateway, studentToolResultProtector, studentToolSaveGateway }) => new StudentToolExecutionUseCases(studentToolRegistryRepository, studentToolHandlerRegistry, studentToolRateLimitGateway, studentToolDependencyHealthGateway, studentToolResultProtector, studentToolSaveGateway)).scoped(),
    referenceDataUseCases: asFunction(({ referenceDataRepository, atomicAuditedOutboxMutationExecutor, referenceDataValidationService, assetReferencePolicy }) =>
      new ReferenceDataUseCases(referenceDataRepository, undefined, undefined, atomicAuditedOutboxMutationExecutor, referenceDataValidationService, assetReferencePolicy)).scoped(),
    studyDestinationUseCases: asFunction(({ studyDestinationRepository, referenceDataRepository, assetReferencePolicy }) =>
      new StudyDestinationUseCases(studyDestinationRepository, referenceDataRepository, referenceDataRepository, undefined, assetReferencePolicy)).scoped(),
    referenceResolver: asFunction(({ referenceDataRepository }) => new ReferenceResolverService(referenceDataRepository)).scoped(),
    serviceReferenceGateway: asFunction(({ referenceResolver }) => new CanonicalServiceReferenceGateway(referenceResolver)).scoped(),
    adminServiceCatalogUseCases: asFunction(({ serviceCatalogRepository, serviceReferenceGateway, assetReferencePolicy }) => new AdminServiceCatalogUseCases(serviceCatalogRepository, serviceReferenceGateway, assetReferencePolicy)).scoped(),
    publicServiceCatalogUseCases: asFunction(({ serviceCatalogRepository }) => new PublicServiceCatalogUseCases(serviceCatalogRepository)).scoped(),
    studentServiceRequestUseCases: asFunction(({ serviceCatalogRepository, serviceRequestRepository }) => new StudentServiceRequestUseCases(serviceCatalogRepository, serviceRequestRepository)).scoped(),
    financeAdminUseCases: asFunction(({ financeRepository }) => new FinanceAdminUseCases(financeRepository)).scoped(),
    financePlatformUseCases: asFunction(({ financeRepository, financeCurrencyReferenceGateway, financePaymentGatewayRegistry, financeBankTransferGatewayRegistry, financeFxRateProvider, financeTransferFeePolicy }) =>
      new FinancePlatformUseCases(financeRepository, {
        currencyReference: financeCurrencyReferenceGateway,
        paymentGateways: financePaymentGatewayRegistry,
        bankTransferGateways: financeBankTransferGatewayRegistry,
        fxRateProvider: financeFxRateProvider,
        transferFeePolicy: financeTransferFeePolicy,
      })).scoped(),
    financeStudentUseCases: asFunction(({ financeRepository }) => new FinanceStudentUseCases(financeRepository)).scoped(),
    serviceFinanceGateway: asFunction(({ financePlatformUseCases }) => new Phase19ServiceFinanceGateway(financePlatformUseCases)).scoped(),
    adminServiceFulfillmentUseCases: asFunction(({ serviceCatalogRepository, serviceRequestRepository, serviceFinanceGateway }) => new AdminServiceFulfillmentUseCases(serviceCatalogRepository, serviceRequestRepository, serviceFinanceGateway)).scoped(),
    careerReferenceGateway: asFunction(({ referenceResolver, referenceDataRepository }) => new CanonicalCareerReferenceGateway(referenceResolver, referenceDataRepository)).scoped(),
    careerAdminUseCases: asFunction(({ careerRepository, careerReferenceGateway, assetReferencePolicy }) => new CareerAdminUseCases(careerRepository, careerReferenceGateway, assetReferencePolicy)).scoped(),
    careerPublicUseCases: asFunction(({ careerRepository, careerReferenceGateway }) => new CareerPublicUseCases(careerRepository, careerReferenceGateway)).scoped(),
    internationalTestAdminUseCases: asFunction(({ internationalTestRepository, referenceResolver, degreeLevelRepository, academicTaxonomyRepository, atomicDomainMutationCoordinator, assetReferencePolicy }) =>
      new InternationalTestAdminUseCases(
        internationalTestRepository,
        undefined,
        undefined,
        undefined,
        referenceResolver,
        degreeLevelRepository,
        atomicDomainMutationCoordinator,
        academicTaxonomyRepository,
        assetReferencePolicy
      )
    ).scoped(),
    aiExecutionUseCases: asFunction(({ aiPlatformRepository, aiProviderRegistry, aiAsyncPayloadProtector }) => new AIExecutionOrchestrator(aiPlatformRepository, aiProviderRegistry, aiAsyncPayloadProtector)).scoped(),
    aiPlatformAdminUseCases: asFunction(({ aiPlatformRepository, aiProviderRegistry }) => new AIPlatformAdminUseCases(aiPlatformRepository, aiProviderRegistry)).scoped(),
    aiWorkflowUseCases: asFunction(({ aiPlatformRepository, aiExecutionUseCases }) => new AIWorkflowUseCases(aiPlatformRepository, aiExecutionUseCases)).scoped(),
    aiEvaluationUseCases: asFunction(({ aiPlatformRepository, aiExecutionUseCases, aiWorkflowUseCases }) => new AIEvaluationUseCases(aiPlatformRepository, aiExecutionUseCases, aiWorkflowUseCases)).scoped(),
    aiKnowledgeUseCases: asFunction(({ aiPlatformRepository, aiProviderRegistry }) => new AIKnowledgeUseCases(aiPlatformRepository, aiProviderRegistry)).scoped(),
    importAdminUseCases: asFunction(({ importRepository, importQueueGateway, importHandoffDispatcher, importWorkerProtocol }) => new ImportAdminUseCases(importRepository, importQueueGateway, importHandoffDispatcher, importWorkerProtocol)).scoped(),
    majorImportStagingUseCase: asFunction(({ importAdminUseCases }) => new MajorImportStagingUseCase(importAdminUseCases)).scoped(),
    ingestAssetUseCase: asFunction(({ assetRecordRepository, assetStorageGateway }) => new IngestAssetUseCase(assetRecordRepository, assetStorageGateway)).scoped(),
    processAssetLifecycleUseCase: asFunction(({ assetRecordRepository, assetStorageGateway, assetUsageRegistryGateway, assetMalwareScannerGateway, assetSanitizationGateway }) => new ProcessAssetLifecycleUseCase(assetRecordRepository, assetStorageGateway, assetUsageRegistryGateway, assetMalwareScannerGateway, assetSanitizationGateway)).scoped(),
    assetRetentionGateway: asFunction(({ prisma, processAssetLifecycleUseCase }) => isPrisma ? new PrismaAssetRetentionGateway(prisma, processAssetLifecycleUseCase) : createUnavailableCapability('assetRetentionGateway')).scoped(),
    retentionSweepUseCase: asFunction(({ importRetentionGateway, auditRetentionGateway, assetRetentionGateway, retentionDecisionRepository }) =>
      new RetentionSweepUseCase([importRetentionGateway, auditRetentionGateway, assetRetentionGateway], retentionDecisionRepository)).scoped(),
    retentionBackgroundJobHandler: asFunction(({ retentionSweepUseCase }) => new RetentionBackgroundJobHandler(retentionSweepUseCase)).scoped(),
    cmsScheduledPublishingBackgroundJobHandler: asFunction(({ adminCmsUseCases }) => new CmsScheduledPublishingBackgroundJobHandler(adminCmsUseCases)).scoped(),
    importQueueBackgroundJobHandler: asFunction(({ importAdminUseCases }) => new ImportQueueBackgroundJobHandler(importAdminUseCases)).scoped(),
    aiAsyncBackgroundJobHandler: asFunction(({ aiExecutionUseCases }) => new AIAsyncBackgroundJobHandler(aiExecutionUseCases)).scoped(),
    financeReconciliationBackgroundJobHandler: asFunction(({ financePlatformUseCases }) => new FinanceReconciliationBackgroundJobHandler(financePlatformUseCases)).scoped(),
    notificationDeliveryBackgroundJobHandler: asFunction(({ notificationDeliveryRepo, notificationDeliveryGateway, notificationPrefGateway }) => new NotificationDeliveryBackgroundJobHandler(notificationDeliveryRepo, notificationDeliveryGateway, notificationPrefGateway)).scoped(),
    backgroundJobHandlerRegistry: asFunction(({ retentionBackgroundJobHandler, cmsScheduledPublishingBackgroundJobHandler, importQueueBackgroundJobHandler, aiAsyncBackgroundJobHandler, financeReconciliationBackgroundJobHandler, notificationDeliveryBackgroundJobHandler }) => new BackgroundJobHandlerRegistry([
      retentionBackgroundJobHandler,
      cmsScheduledPublishingBackgroundJobHandler,
      importQueueBackgroundJobHandler,
      aiAsyncBackgroundJobHandler,
      financeReconciliationBackgroundJobHandler,
      notificationDeliveryBackgroundJobHandler,
    ])).scoped(),
    durableBackgroundWorker: asFunction(({ durableBackgroundJobQueue, backgroundJobHandlerRegistry, backgroundWorkerRuntimeState }) =>
      new DurableBackgroundWorker(durableBackgroundJobQueue, backgroundJobHandlerRegistry, backgroundWorkerRuntimeState)).scoped(),
    adminAcademicTaxonomyUseCases: asFunction(({ academicTaxonomyRepository, academicTaxonomyValidationService }) => new AdminAcademicTaxonomyUseCases(academicTaxonomyRepository, academicTaxonomyValidationService)).scoped(),
    // Identity
    provisionIdentityUseCase: asFunction(({ identityRepository }) => new ProvisionIdentityUseCase(identityRepository)).scoped(),
    activateIdentityUseCase: asFunction(({ identityRepository }) => new ActivateIdentityUseCase(identityRepository)).scoped(),
    suspendIdentityUseCase: asFunction(({ identityRepository, sessionManager }) => new SuspendIdentityUseCase(identityRepository, sessionManager)).scoped(),
    archiveIdentityUseCase: asFunction(({ identityRepository, sessionManager }) => new ArchiveIdentityUseCase(identityRepository, sessionManager)).scoped(),
    purgeIdentityUseCase: asFunction(({ identityRepository, sessionManager }) => new PurgeIdentityUseCase(identityRepository, sessionManager)).scoped(),
    updateProfileUseCase: asFunction(({ identityRepository }) => new UpdateProfileUseCase(identityRepository)).scoped(),
    updateContactUseCase: asFunction(({ identityRepository }) => new UpdateContactUseCase(identityRepository)).scoped(),
    getIdentityUseCase: asFunction(({ identityRepository }) => new GetIdentityUseCase(identityRepository)).scoped(),
    listIdentitiesUseCase: asFunction(({ identityRepository }) => new ListIdentitiesUseCase(identityRepository)).scoped(),

    // Authorization
    manageRolesUseCase: asFunction(({ roleRepository, atomicDomainMutationCoordinator }) =>
      new ManageRolesUseCase(roleRepository, atomicDomainMutationCoordinator)).scoped(),
    assignRoleUseCase: asFunction(({ roleAssignmentRepository, atomicDomainMutationCoordinator }) =>
      new AssignRoleUseCase(roleAssignmentRepository, atomicDomainMutationCoordinator)).scoped(),
    manageEmergencyAccessUseCase: asFunction(({ emergencyAccessRepository }) =>
      new ManageEmergencyAccessUseCase(emergencyAccessRepository)).scoped(),
    evaluateAccessUseCase: asFunction(({ authEvaluatorService }) => new EvaluateAccessUseCase(authEvaluatorService)).scoped(),
    adminBootstrapVerifier: asFunction(({ prisma }) => new AdminBootstrapVerifier(prisma)).scoped(),

    // Settings
    manageSettingsUseCase: asFunction(({ settingDefinitionRepo, settingAssignmentRepo, configurationValidationService }) => new ManageSettingsUseCase(settingDefinitionRepo, settingAssignmentRepo, configurationValidationService)).scoped(),
    resolveConfigurationUseCase: asFunction(({ configurationResolutionService }) => new ResolveConfigurationUseCase(configurationResolutionService)).scoped(),

    // Files
    manageFilesUseCase: asFunction(({ fileRepo, storageGateway, fileIntegrityValidationService }) => new ManageFilesUseCase(fileRepo, storageGateway, fileIntegrityValidationService)).scoped(),

    // Notification
    templatesUseCase: asFunction(({ notificationTemplateRepo }) => new ManageNotificationTemplatesUseCase(notificationTemplateRepo)).scoped(),
    intentsUseCase: asFunction(({ notificationIntentRepo, notificationPrefGateway, notificationTemplateRepo }) => new ManageNotificationIntentsUseCase(notificationIntentRepo, notificationPrefGateway, notificationTemplateRepo)).scoped(),

    // Others
    manageAuditRecordsUseCase: asFunction(({ auditRecordRepo }) => new ManageAuditRecordsUseCase(auditRecordRepo)).scoped(),
    manageSearchUseCase: asFunction(({ searchRequestRepo, searchEngineGateway }) => new ManageSearchUseCase(searchRequestRepo, searchEngineGateway)).scoped(),
    manageCacheUseCase: asFunction(({ cacheEntryRepo, cacheExecutionGateway }) => new ManageCacheUseCase(cacheEntryRepo, cacheExecutionGateway)).scoped(),
    manageBackgroundJobsUseCase: asFunction(({ bgJobRepo, bgJobGateway }) => new ManageBackgroundJobsUseCase(bgJobRepo, bgJobGateway)).scoped(),
    manageEnterpriseEventsUseCase: asFunction(({ enterpriseEventRepo, eventPublishingGateway }) => new ManageEnterpriseEventsUseCase(enterpriseEventRepo, eventPublishingGateway)).scoped(),
    manageWorkflowsUseCase: asFunction(({ workflowRepo, workflowExecutionGateway }) => new ManageWorkflowsUseCase(workflowRepo, workflowExecutionGateway)).scoped(),
    manageApiServicesUseCase: asFunction(({ apiServiceRepo, apiExposureGateway }) => new ManageApiServicesUseCase(apiServiceRepo, apiExposureGateway)).scoped(),
    manageSharedComponentsUseCase: asFunction(({ sharedComponentRepo, renderingGateway }) => new ManageSharedComponentsUseCase(sharedComponentRepo, renderingGateway)).scoped(),
    

    // --- Routers ---
    scholarshipAdminRouter: asFunction((cradle) => ScholarshipAdminRouter.create(cradle)).singleton(),
    importAdminRouter: asFunction((cradle) => ImportAdminRouter.create(cradle)).singleton(),
    courseImportOperationsRouter: asFunction((cradle) => CourseImportOperationsRouter.create(cradle)).singleton(),
    scholarshipPublicRouter: asFunction((cradle) => ScholarshipPublicRouter.create(cradle)).singleton(),
    universityAdminRouter: asFunction((cradle) => UniversityAdminRouter.create(cradle)).singleton(),
    universityPublicRouter: asFunction((cradle) => UniversityPublicRouter.create(cradle)).singleton(),
    majorAdminRouter: asFunction((cradle) => MajorAdminRouter.create(cradle)).scoped(),
    majorPublicRouter: asFunction((cradle) => MajorPublicRouter.create(cradle)).singleton(),
    courseAdminRouter: asFunction((cradle) => CourseAdminRouter.create(cradle)).singleton(),
    courseLearnerRouter: asFunction((cradle) => CourseLearnerRouter.create(cradle)).singleton(),
    importedCourseAdminRouter: asFunction((cradle) => ImportedCourseAdminRouter.create(cradle)).singleton(),
    coursePublicRouter: asFunction((cradle) => CoursePublicRouter.create(cradle)).singleton(),
    crossDomainReadModelRouter: asFunction((cradle) => CrossDomainReadModelRouter.create(cradle)).singleton(),
    certificateAdminRouter: asFunction((cradle) => CertificateAdminRouter.create(cradle)).singleton(),
    certificatePublicRouter: asFunction((cradle) => CertificatePublicRouter.create(cradle)).singleton(),
    studentWorkspaceRouter: asFunction((cradle) => StudentWorkspaceRouter.create(cradle)).singleton(),
    studentSupportAdminRouter: asFunction((cradle) => StudentSupportAdminRouter.create(cradle)).singleton(),
    cmsAdminRouter: asFunction((cradle) => CmsAdminRouter.create(cradle)).singleton(),
    cmsPublicRouter: asFunction((cradle) => CmsPublicRouter.create(cradle)).singleton(),
    studentToolsAdminRouter: asFunction((cradle) => StudentToolsAdminRouter.create(cradle)).singleton(),
    studentToolsPublicRouter: asFunction((cradle) => StudentToolsPublicRouter.create(cradle)).singleton(),
    referenceDataPublicRouter: asFunction((cradle) => ReferenceDataPublicRouter.create(cradle)).singleton(),
    referenceDataAdminRouter: asFunction((cradle) => ReferenceDataAdminRouter.create(cradle)).singleton(),
    studyDestinationAdminRouter: asFunction((cradle) => StudyDestinationAdminRouter.create(cradle)).singleton(),
    studyDestinationPublicRouter: asFunction((cradle) => StudyDestinationPublicRouter.create(cradle)).singleton(),
    serviceAdminRouter: asFunction((cradle) => ServiceAdminRouter.create(cradle)).singleton(),
    servicePublicRouter: asFunction((cradle) => ServicePublicRouter.create(cradle)).singleton(),
    financeAdminRouter: asFunction((cradle) => FinanceAdminRouter.create(cradle)).singleton(),
    careerAdminRouter: asFunction((cradle) => CareerAdminRouter.create(cradle)).singleton(),
    careerPublicRouter: asFunction((cradle) => CareerPublicRouter.create(cradle)).singleton(),
    internationalTestAdminRouter: asFunction((cradle) => InternationalTestAdminRouter.create(cradle)).singleton(),
    internationalTestPublicRouter: asFunction((cradle) => InternationalTestPublicRouter.create(cradle)).singleton(),
    aiGatewayRouter: asFunction((cradle) => AIGatewayRouter.create(cradle)).singleton(),
    aiAdminRouter: asFunction((cradle) => AIAdminRouter.create(cradle)).singleton(),
    assetPlatformRouter: asFunction((cradle) => AssetPlatformRouter.create(cradle)).singleton(),
    identityRouter: asFunction((cradle) => IdentityRouter.create(cradle)).singleton(),
    tokenProvider: asFunction(() => {
      const nodeEnv = readConfig<string>('NODE_ENV') || 'development';
      const activeKeyId = readConfig<string>('JWT_ACTIVE_KEY_ID') || 'dev-ephemeral';
      const normalizePem = (value?: string): string | undefined => value?.replace(/\\n/g, '\n').trim() || undefined;
      let privateKeyPem = normalizePem(readConfig<string>('JWT_PRIVATE_KEY_PEM'));
      let publicKeyPem = normalizePem(readConfig<string>('JWT_PUBLIC_KEY_PEM'));
      let publicKeys: Record<string, string> = {};

      const previousKeysRaw = readConfig<string>('JWT_PREVIOUS_PUBLIC_KEYS_JSON');
      if (previousKeysRaw) {
        let parsed: unknown;
        try {
          parsed = JSON.parse(previousKeysRaw);
        } catch {
          throw new Error('JWT_PREVIOUS_PUBLIC_KEYS_JSON must be a JSON object keyed by kid.');
        }
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('JWT_PREVIOUS_PUBLIC_KEYS_JSON must be a JSON object keyed by kid.');
        }
        publicKeys = Object.fromEntries(Object.entries(parsed as Record<string, unknown>).map(([kid, value]) => {
          if (typeof value !== 'string' || !normalizePem(value)) throw new Error(`JWT previous public key '${kid}' is invalid.`);
          return [kid, normalizePem(value)!];
        }));
      }

      if (!privateKeyPem || !publicKeyPem) {
        if (nodeEnv === 'production' || nodeEnv === 'staging') {
          throw new Error('JWT_PRIVATE_KEY_PEM and JWT_PUBLIC_KEY_PEM are required in production/staging.');
        }
        const ephemeral = generateEphemeralJwtKeySet(activeKeyId);
        privateKeyPem = ephemeral.privateKeyPem;
        publicKeyPem = ephemeral.publicKeys[activeKeyId];
      }

      publicKeys[activeKeyId] = publicKeyPem;
      const accessTokenTtl = Number(readConfig<number | string>('ACCESS_TOKEN_TTL_SECONDS') ?? 900);
      return new JwtTokenProvider({ activeKeyId, privateKeyPem, publicKeys }, {
        accessTokenTtl,
        issuer: readConfig<string>('JWT_ISSUER') || 'manaratak-api',
        audience: readConfig<string>('JWT_AUDIENCE') || 'manaratak-browser',
      });
    }).singleton(),
    sessionManager: asFunction(({ prisma }) => {
      const ttl = Number(readConfig<number | string>('SESSION_TTL_SECONDS') ?? 604800);
      return new PrismaSessionManager(prisma, ttl);
    }).singleton(),
    principalAccessValidator: asFunction(({ identityRepository }) => new IdentityPrincipalAccessValidator(identityRepository)).singleton(),
    authService: asFunction(({ tokenProvider, sessionManager, credentialVerifier, principalAccessValidator }) => new AuthService(tokenProvider, sessionManager, principalAccessValidator, credentialVerifier)).singleton(),
    credentialVerifier: asFunction(({ prisma }) => new PrismaCredentialVerifier(prisma)).singleton(),
    authRouter: asFunction((cradle) => AuthRouter.create(cradle)).singleton(),
    authorizationAdminRouter: asFunction((cradle) => AuthorizationAdminRouter.create(cradle)).singleton(),
    authorizationRuntimeRouter: asFunction((cradle) => AuthorizationRuntimeRouter.create(cradle)).singleton(),
    settingsAdminRouter: asFunction((cradle) => SettingsAdminRouter.create(cradle)).singleton(),
    settingsRuntimeRouter: asFunction((cradle) => SettingsRuntimeRouter.create(cradle)).singleton(),
    fileManagementRouter: asFunction((cradle) => FileManagementRouter.create(cradle)).singleton(),
    notificationRouter: asFunction((cradle) => NotificationRouter.create(cradle)).singleton(),
    auditRouter: asFunction((cradle) => AuditRouter.create(cradle)).singleton(),
    searchRouter: asFunction((cradle) => SearchRouter.create(cradle)).singleton(),
    cacheRouter: asFunction((cradle) => CacheRouter.create(cradle)).singleton(),
    backgroundJobRouter: asFunction((cradle) => BackgroundJobRouter.create(cradle)).singleton(),
    enterpriseEventRouter: asFunction((cradle) => EnterpriseEventRouter.create(cradle)).singleton(),
    workflowRouter: asFunction((cradle) => WorkflowRouter.create(cradle)).singleton(),
    apiFoundationRouter: asFunction((cradle) => ApiFoundationRouter.create(cradle)).singleton(),
    sharedComponentRouter: asFunction((cradle) => SharedComponentRouter.create(cradle)).singleton(),
    academicTaxonomyAdminRouter: asFunction((cradle) => AcademicTaxonomyAdminRouter.create(cradle)).singleton(),
    academicTaxonomyPublicRouter: asFunction((cradle) => AcademicTaxonomyPublicRouter.create(cradle)).singleton(),
  });
}

export { container };
