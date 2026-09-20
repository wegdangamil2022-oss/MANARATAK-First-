export const __APPLICATION_LAYER__ = true;
export * from './auth/AuthService';
export * from './authorization/AuthorizationService';

// Identity Application layer exports
export type { IdentityDto, ProvisionIdentityInput, UpdateProfileInput, UpdateContactInput } from './identity/dtos';
export { IdentityDtoMapper } from './identity/mapper';
export { ProvisionIdentityUseCase } from './identity/ProvisionIdentityUseCase';
export { ActivateIdentityUseCase } from './identity/ActivateIdentityUseCase';
export { SuspendIdentityUseCase } from './identity/SuspendIdentityUseCase';
export { ArchiveIdentityUseCase } from './identity/ArchiveIdentityUseCase';
export { PurgeIdentityUseCase } from './identity/PurgeIdentityUseCase';
export { UpdateProfileUseCase } from './identity/UpdateProfileUseCase';
export { UpdateContactUseCase } from './identity/UpdateContactUseCase';
export { GetIdentityUseCase } from './identity/GetIdentityUseCase';
export { ListIdentitiesUseCase } from './identity/ListIdentitiesUseCase';
export type { ListIdentitiesInput, ListIdentitiesOutput } from './identity/ListIdentitiesUseCase';

// Authorization Application layer exports
export * from './authorization/dtos/AuthorizationDtos';
export * from './authorization/use-cases/ManageRolesUseCase';
export * from './authorization/use-cases/AssignRoleUseCase';
export * from './authorization/use-cases/EvaluateAccessUseCase';
export * from './authorization/use-cases/ManageEmergencyAccessUseCase';

// Settings Exports
export * from './settings/dtos/SettingsDtos';
export * from './settings/use-cases/ManageSettingsUseCase';
export * from './settings/use-cases/ResolveConfigurationUseCase';

// File Management Exports
export * from './file-management/dtos/FileManagementDtos';
export * from './file-management/use-cases/ManageFilesUseCase';

// Asset Platform Exports
export * from './asset-platform';

// Notification Use Cases
export * from './notification/dtos/NotificationDtos';
export * from './notification/use-cases/ManageNotificationIntentsUseCase';
export * from './notification/use-cases/ManageNotificationTemplatesUseCase';
export * from './notification/use-cases/NotificationOutboxDeliveryGateway';

// Audit Use Cases
export * from './audit/dtos/AuditDtos';
export * from './audit/use-cases/ManageAuditRecordsUseCase';
export * from './audit/use-cases/AtomicAuditedMutationExecutor';

// Search Use Cases
export * from './search/dtos/SearchDtos';
export * from './search/gateways/ISearchEngineGateway';
export * from './search/use-cases/ManageSearchUseCase';

// Cache Use Cases
export * from './cache/dtos/CacheDtos';
export * from './cache/gateways/ICacheExecutionGateway';
export * from './cache/use-cases/ManageCacheUseCase';



// Background Jobs Use Cases
export * from './background-jobs/dtos/BackgroundJobsDtos';
export * from './background-jobs/gateways/IBackgroundJobExecutionGateway';
export * from './background-jobs/use-cases/ManageBackgroundJobsUseCase';
export * from './background-jobs/services/CronScheduleCalculator';
export * from './background-jobs/workers/DurableBackgroundJobContracts';
export * from './background-jobs/workers/BackgroundJobHandlerRegistry';
export * from './background-jobs/workers/DurableBackgroundWorker';
export * from './background-jobs/handlers/RetentionBackgroundJobHandler';
export * from './background-jobs/handlers/CmsScheduledPublishingBackgroundJobHandler';
export * from './background-jobs/handlers/ImportQueueBackgroundJobHandler';
export * from './background-jobs/handlers/AIAsyncBackgroundJobHandler';
export * from './background-jobs/handlers/FinanceReconciliationBackgroundJobHandler';

// Event Foundation Use Cases
export * from './event-foundation/dtos/EventFoundationDtos';
export * from './event-foundation/gateways/IEventPublishingGateway';
export * from './event-foundation/gateways/IAtomicPersistenceUnitOfWork';
export * from './event-foundation/use-cases/ManageEnterpriseEventsUseCase';
export * from './event-foundation/use-cases/TransactionalOutboxDispatcher';
export * from './event-foundation/use-cases/FanoutOutboxDeliveryGateway';
export * from './event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
export * from './event-foundation/use-cases/AtomicDomainMutationCoordinator';
export * from './event-foundation/use-cases/EnterpriseEventOutboxProjectionGateway';
export * from './event-foundation/use-cases/OwnerDomainOutboxWorker';
export * from './event-foundation/use-cases/PollingWorkerRuntimeRegistry';


// Workflow
export * from './workflow/dtos/WorkflowDtos';
export * from './workflow/gateways/IWorkflowExecutionGateway';
export * from './workflow/use-cases/ManageWorkflowsUseCase';

// API Foundation
export * from './api-foundation/dtos/ApiServiceDtos';
export * from './api-foundation/gateways/IApiExposureGateway';
export * from './api-foundation/use-cases/ManageApiServicesUseCase';

// Shared Components Context
export * from './shared-components/dtos/SharedComponentDtos';
export * from './shared-components/gateways/IComponentRenderingGateway';
export * from './shared-components/use-cases/ManageSharedComponentsUseCase';

// MNT-AUD-0109: legacy registry-style foundation orchestrators are formally deferred.
// Their typed DTO/gateway contracts remain available internally, but no deferred use case is
// exported from the canonical application barrel or registered in production DI.

// Logging Context
export * from './logging/dtos/LogDtos';
export * from './logging/gateways/ILogExecutionGateway';

// Security Foundation Context
export * from './security/dtos/SecurityDtos';
export * from './security/gateways/ISecurityEnforcementGateway';

// Configuration Context
export * from './configuration/dtos/ConfigurationDtos';
export * from './configuration/gateways/IConfigurationResolutionGateway';

// Integration Context
export * from './integration/dtos/IntegrationDtos';
export * from './integration/gateways/IIntegrationExecutionGateway';

// Localization Context
export * from './localization/dtos/LocalizationDtos';
export * from './localization/gateways/ILocalizationExecutionGateway';

// Monitoring Context
export * from './monitoring/dtos/MonitorDtos';
export * from './monitoring/gateways/IMonitoringExecutionGateway';

export * from './scholarships';
export * from './import-foundation/use-cases/ImportAdminUseCases';
export * from './majors/use-cases/MajorImportStagingUseCase';
export * from './import-foundation/use-cases/ProcessImportJobUseCase';
export * from './import-foundation/use-cases/ImportWorkerProtocol';
export * from './import-foundation/dtos/ImportQueueDtos';
export * from './import-foundation/gateways/IImportQueueGateway';
export * from './universities';
export * from './majors';
export * from './courses';
export * from './certificates';
export * from './students';
export * from './cms';
export * from './student-tools';
export * from './reference-data';
export * from './read-models';
export * from './services-platform';
export * from './finance-platform';
export * from './career-alumni';
export * from './tests-platform';
export * from './ai-platform';

export * from './import-foundation/parsers/IImportStreamParser';
export * from './import-foundation/parsers/ImportParserRegistry';
export * from './import-foundation/parsers/NdjsonImportStreamParser';
export * from './import-foundation/parsers/CsvImportStreamParser';
export * from './import-foundation/contracts/ISourceRegistryGateway';
export * from './import-foundation/contracts/ISourceConnector';
export * from './import-foundation/contracts/IImportRawSnapshotStore';
export * from './import-foundation/services/SourceConnectorRegistry';
export * from './import-foundation/use-cases/AcquireImportSourceUseCase';
export * from './scholarships/import-center/ScholarshipImportNewUseCase';
export * from './scholarships/import-center/ScholarshipImportCenterContracts';
export * from './scholarships/import-center/ScholarshipImportCenterUseCases';
export * from './scholarships/import-center/ScholarshipImportDecisionUseCases';
export * from './import-foundation/contracts/IDriftDetectionService';
export * from './import-foundation/services/DriftDetectionService';
export * from './import-foundation/dtos/ExtractionDtos';
export * from './import-foundation/contracts/IFieldExtractionGateway';
export * from './import-foundation/contracts/IExtractionValidationService';
export * from './import-foundation/contracts/IGoldenDatasetRunner';
export * from './import-foundation/services/RuleBasedFieldExtractionGateway';
export * from './import-foundation/services/MergeProposalPreparationService';
export * from './import-foundation/dtos/ImportOperationsDtos';
export * from './import-foundation/contracts/IImportOperationsReadService';
export * from './import-foundation/services/ImportOperationsReadService';
export * from './import-foundation/services/ImportSourceIdentity';
export * from './import-foundation/services/ImportHandoffDispatcher';

// Academic Taxonomy Exports
export * from './academic-taxonomy';
export * from './degree-level';

export * from './translation-import';

export * from './study-destinations';
export { IdentityPrincipalAccessValidator } from './auth/IdentityPrincipalAccessValidator';

export * from './canonicalization/UnicodeCanonicalization';
export * from './canonicalization/OwnerDomainIdentityPolicies';
export * from './retention/RetentionSweepUseCase';
export * from './students/use-cases/StudentWorkspaceOutboxDeliveryGateway';
export * from './students/use-cases/StudentWorkspaceOutboxWorker';
export * from './background-jobs/handlers/NotificationDeliveryBackgroundJobHandler';
