# MNT-AUD-0095 — Generated Dummy Migration Inventory

**Status:** SOURCE_REMEDIATED / TYPECHECK_RUNTIME_PENDING
**Historical authority:** `packages/domain/src/generated/dummy.ts` (removed from production source).
**Canonical replacement:** `packages/domain/src/foundation-contracts/` plus existing owner-domain contracts.

## Classification summary

| Classification | Count | Decision |
|---|---:|---|
| REQUIRED_NOW | 173 | Replaced by typed canonical contracts; no `any`, no `DUMMY`, no variadic stub constructors. |
| HISTORICAL_COMPATIBILITY / already canonical | 8 | Scholarship symbols remain owned by `packages/domain/src/scholarships/contracts.ts`. |
| FORMALLY_DEFERRED | 12 | Organization/membership foundation remains deferred and is not exported as a fake production contract. |
| REMOVE | 2 | Application-layer AI DTO/use-case placeholders are not domain authority and were removed with the dummy file. |
| **Total historical symbols** | **195** | Every historical symbol classified. |

## REQUIRED_NOW symbols

```text
ComponentCompatibilityService
ComponentLifecycleService
ComponentLifecycleState
ComponentMetadata
ComponentVersion
ComponentVersionPublishedEvent
ExpirationMetadata
FilterComparison
IIntegrationRepository
ILocalizationRepository
ILogEntryRepository
IMonitorRepository
INotificationIntentRepository
INotificationPreferenceGateway
INotificationTemplateRepository
ISearchRequestRepository
ISecurityPolicyRepository
ISharedComponentRepository
IWorkflowRepository
ImportRecordDto
ImportRecordStatus
Integration
IntegrationActivatedEvent
IntegrationArchivedEvent
IntegrationCapabilityDefinition
IntegrationCategory
IntegrationClassification
IntegrationCreatedEvent
IntegrationDefinition
IntegrationDeprecatedEvent
IntegrationFoundationLifecycleService
IntegrationFoundationValidationService
IntegrationId
IntegrationIntent
IntegrationLifecycleState
IntegrationMetadata
IntegrationOwnerReference
IntegrationReference
IntegrationReferenceSpecification
IntegrationScopeType
IntegrationVersion
IntegrationVersionPublishedEvent
LocaleDefinition
Localization
LocalizationActivatedEvent
LocalizationArchivedEvent
LocalizationClassification
LocalizationCreatedEvent
LocalizationDefinition
LocalizationDeprecatedEvent
LocalizationId
LocalizationIntent
LocalizationLifecycleService
LocalizationLifecycleState
LocalizationMetadata
LocalizationOwnerReference
LocalizationReference
LocalizationReferenceSpecification
LocalizationScopeType
LocalizationValidationService
LocalizationVersion
LocalizationVersionPublishedEvent
LogClassification
LogDefinition
LogEntry
LogEntryActivatedEvent
LogEntryArchivedEvent
LogEntryCreatedEvent
LogEntryDeprecatedEvent
LogEntryId
LogLifecycleService
LogLifecycleState
LogMetadata
LogOwnerReference
LogReference
LogReferenceSpecification
LogSeverity
LogValidationService
LogVersion
LogVersionPublishedEvent
LoggingIntent
LogicalOperator
Monitor
MonitorActivatedEvent
MonitorArchivedEvent
MonitorCreatedEvent
MonitorDefinition
MonitorDeprecatedEvent
MonitorId
MonitorLifecycleService
MonitorLifecycleState
MonitorMetadata
MonitorOwnerReference
MonitorReference
MonitorReferenceSpecification
MonitorStateChangedEvent
MonitorStateDefinition
MonitorValidationService
MonitorVersion
MonitoringIntent
NotificationChannel
NotificationId
NotificationIntent
NotificationLocaleReference
NotificationRecipientReference
NotificationReference
NotificationTemplate
PaginatedResult
RenderingIntent
RetryMetadata
SchedulingMetadata
SearchCriteria
SearchFilter
SearchPagination
SearchReference
SearchRequest
SearchRequestId
SearchRequestSpecification
SearchResult
SearchScope
SearchSorting
SecurityIntent
SecurityLifecycleService
SecurityLifecycleState
SecurityMetadata
SecurityOwnerReference
SecurityPolicy
SecurityPolicyActivatedEvent
SecurityPolicyArchivedEvent
SecurityPolicyClassification
SecurityPolicyCreatedEvent
SecurityPolicyDefinition
SecurityPolicyDeprecatedEvent
SecurityPolicyId
SecurityPolicyReference
SecurityPolicyReferenceSpecification
SecurityPolicyValidationService
SecurityRuleDefinition
SecuritySensitivity
SecurityVersion
SecurityVersionPublishedEvent
SharedComponent
SharedComponentActivatedEvent
SharedComponentArchivedEvent
SharedComponentCompatibilityMetadata
SharedComponentCreatedEvent
SharedComponentDefinition
SharedComponentDeprecatedEvent
SharedComponentId
SharedComponentOwnerReference
SharedComponentReference
SharedComponentReferenceSpecification
SortDirection
TemplateId
TemplateVariable
TranslationDefinition
Workflow
WorkflowActivatedEvent
WorkflowArchivedEvent
WorkflowCompletedEvent
WorkflowCreatedEvent
WorkflowDefinition
WorkflowExecutionIntent
WorkflowId
WorkflowMetadata
WorkflowOwnerReference
WorkflowReference
WorkflowSpecification
WorkflowStateChangedEvent
WorkflowStateDefinition
WorkflowTransitionDefinition
WorkflowTransitionValidator
WorkflowVersion
```

## Already canonical scholarship symbols

```text
IScholarshipRepository
PublicScholarshipDto
PublicScholarshipFilters
ScholarshipCompletenessState
ScholarshipDto
ScholarshipFilters
ScholarshipStatus
UpdateScholarshipDto
```

## Formally deferred organization/membership symbols

```text
IMembershipRepository
IMembershipSpecification
IOrganizationRepository
IOrganizationSpecification
IOrganizationTypeProvider
Membership
MembershipStatus
Organization
OrganizationStatus
OrganizationTypeDefinition
Position
TimeSpan
```

## Removed misplaced symbols

```text
AIExecutionResponseDto
AIExecutionUseCases
```

## Closure evidence

- Production `@manaratak/domain` barrel no longer exports `generated/dummy`.
- Repository source guard rejects runtime imports/exports of `generated/dummy`, `DUMMY` lifecycle markers, permissive `any` replacement contracts, and `@ts-nocheck` in active source.
- Runtime contract tests compile the replacement foundation contracts with TypeScript `strict: true` and execute representative lifecycle, transition, search, notification and compatibility behavior.
- Full workspace typecheck remains W6 evidence because the supplied dependency tree is incomplete.
