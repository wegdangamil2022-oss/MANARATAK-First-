# MANARATAK 2.0: Phase 15 (Enterprise Student Platform) Enterprise Domain

### Navigation
- **Previous:** [Phase 14 — Enterprise Certificates Platform](../phase-14-enterprise-certificates-platform/phase-14-01-enterprise-architecture-specification.md)
- **Next:** [Phase 16 — Enterprise CMS](../phase-16-enterprise-cms/phase-16-01-enterprise-architecture-specification.md)

> **Note:** This phase references the [Enterprise Shared Contracts Specification](../../architecture/shared-contracts/03-enterprise-shared-contracts-specification.md) as the canonical architectural source for shared foundation contracts.

> **Note:** This phase references the [Enterprise Lifecycle Framework Specification](../../architecture/lifecycle-framework/03-enterprise-lifecycle-framework-specification.md) as the canonical architectural source for all state, status, and lifecycle governance.

## Part B — Enterprise Domain Contracts

### 15.B.1 Workspace Contracts

**Architectural Commentary**
The workspace contracts establish the core identity, initialization, and lifecycle of a student's personal portal. These interfaces ensure that the workspace acts as a strictly governed container for all personalized configurations, navigation history, and contextual shortcuts.

```typescript

export interface IReferenceEntity {
    id: string;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export interface IEnterpriseDomainEvent {
    eventId: string;
    occurredAt: Date | string;
    correlationId: string;
}

/**
 * The root aggregate representing the lifecycle and active state of a student's personal portal.
 */
export interface IStudentWorkspace extends IReferenceEntity {
    workspaceId: string;
    studentId: string;
    status: 'Initializing' | 'Active' | 'Suspended' | 'Archived';
    createdAt: Date | string;
    lastAccessedAt?: Date | string | null;
    dashboard: IDashboardLayout;
    preferences: IStudentPreference;
}

/**
 * An immutable point-in-time capture of the dashboard layout and presentation settings.
 */
export interface IWorkspaceSnapshot extends IReferenceEntity {
    snapshotId: string;
    workspaceId: string;
    capturedAt: Date | string;
    layoutState: DashboardConfiguration;
}

/**
 * A short-lived ledger tracking immediate navigational history.
 */
export interface IRecentActivity extends IReferenceEntity {
    activityId: string;
    workspaceId: string;
    items: readonly RecentItem[];
}

/**
 * A dynamically generated, context-aware shortcut accelerating frequent or urgent workflows.
 */
export interface IQuickAction extends IReferenceEntity {
    actionId: string;
    workspaceId: string;
    definition: QuickActionDefinition;
}

export interface QuickActionDefinition {
    label: string;
    destinationUrl: string;
    priorityScore: number;
    contextIcon: string;
}

export interface RecentItem {
    itemType: string;
    referenceId: string;
    interactedAt: Date | string;
}

```

### 15.B.2 Dashboard Contracts

**Architectural Commentary**
Dashboard contracts govern the structural arrangement and visibility of widgets within the workspace. They define how external read models (e.g., Courses, Scholarships) are projected into visual cards without leaking presentation logic into upstream domains.

```typescript

/**
 * Governs the structural arrangement and visibility of widgets within the workspace.
 */
export interface IDashboardLayout extends IReferenceEntity {
    layoutId: string;
    workspaceId: string;
    activeConfiguration: DashboardConfiguration;
    widgets: readonly IDashboardWidget[];
}

/**
 * Represents a distinct modular component within the dashboard.
 */
export interface IDashboardWidget extends IReferenceEntity {
    widgetId: string;
    widgetType: string;
    status: 'Installed' | 'Enabled' | 'Hidden' | 'Disabled';
    position: WidgetPosition;
    configuration: WidgetConfiguration;
    cards: readonly IDashboardCard[];
}

/**
 * An atomic visual element rendered within a widget, typically representing a projected entity.
 */
export interface IDashboardCard extends IReferenceEntity {
    cardId: string;
    widgetId: string;
    entityType: 'Course' | 'Scholarship' | 'University' | 'Certificate' | 'ExternalWorkflowReference' | 'Article' | 'Service';
    referenceId: string;
}

export interface WorkspaceLayout {
    deviceType: 'Desktop' | 'Tablet' | 'Mobile';
    columns: number;
}

export interface WidgetConfiguration {
    isExpanded: boolean;
    properties: Record<string, string>;
}

export interface DashboardConfiguration {
    layout: WorkspaceLayout;
    positions: readonly WidgetPosition[];
}

export interface WidgetPosition {
    widgetId: string;
    rowIndex: number;
    columnIndex: number;
}

```

### 15.B.3 Saved Items Contracts

**Architectural Commentary**
These contracts define the polymorphic bookmarking engine. They allow the student to organize external entities (courses, articles, scholarships) into custom or smart collections, strictly persisting only reference pointers to maintain the enterprise Single Source of Truth.

```typescript

/**
 * A polymorphic reference to an external entity bookmarked by the student.
 */
export interface ISavedItem extends IReferenceEntity {
    itemId: string;
    workspaceId: string;
    collectionId: string;
    reference: SavedReference;
    savedAt: Date | string;
}

/**
 * A user-defined or system-generated folder grouping multiple saved items.
 */
export interface ISavedCollection extends IReferenceEntity {
    collectionId: string;
    workspaceId: string;
    collectionType: 'Personal' | 'Smart' | 'Favorite';
    metadata: CollectionMetadata;
    items: readonly ISavedItem[];
}

export interface SavedReference {
    domainType: string;
    entityId: string;
}

export interface CollectionMetadata {
    name: string;
    colorHex: string;
    iconName: string;
}

```

### 15.B.4 Timeline Contracts

**Architectural Commentary**
Timeline contracts establish an append-only historical ledger of the student's journey. They decouple tracking telemetry from upstream systems, providing a centralized audit trail of educational achievements and interactions.

```typescript

/**
 * An append-only historical ledger of the student's journey across the ecosystem.
 */
export interface IPersonalTimeline extends IReferenceEntity {
    timelineId: string;
    workspaceId: string;
    entries: readonly TimelineEntry[];
}

export interface TimelineEntry {
    entryId: string;
    timestamp: Date | string;
    category: string;
    description: string;
    sourceDomain: string;
}

```

### 15.B.5 Personalization Contracts

**Architectural Commentary**
These contracts define the root aggregate for all user-configurable parameters affecting presentation, behavior, privacy, and notifications. They guarantee that user preferences are centrally managed and globally respected.

```typescript
/**
 * The root aggregate for all user-configurable parameters affecting presentation and behavior.
 */
export interface IStudentPreference extends IReferenceEntity {
  preferenceId: string;
  workspaceId: string;
  language: LanguagePreference;
  theme: ThemePreference;
  accessibility: AccessibilityPreference;
  notification: INotificationPreference;
  privacy: IPrivacyPreference;
}

/**
 * Defines the student's opt-in/opt-out matrices for specific notification categories.
 */
export interface INotificationPreference extends IReferenceEntity {
  preferenceId: string;
  settings: NotificationSettings;
}

/**
 * Governs data visibility and consent for telemetry and recommendations.
 */
export interface IPrivacyPreference extends IReferenceEntity {
  preferenceId: string;
  settings: PrivacySettings;
}

export interface PrivacySettings {
  allowTelemetry: boolean;
  allowAIRecommendations: boolean;
  publicProfileEnabled: boolean;
}

export interface NotificationSettings {
  emailEnabled: boolean;
  pushEnabled: boolean;
  inAppEnabled: boolean;
}

export interface LanguagePreference {
  locale: string;
  timezone: string;
}

export interface ThemePreference {
  mode: string; // Light, Dark, System
}

export interface AccessibilityPreference {
  typographyScale: string;
  reduceMotion: boolean;
}
```

### 15.B.6 Analytics Contracts

**Architectural Commentary**
Analytics contracts define aggregated, private metrics evaluating the student's engagement and progress. They expose read-only statistical views decoupled from the transactional datastores.

```typescript

/**
 * Aggregated, private metrics evaluating the student's engagement and progress.
 */
export interface IPersonalStatistics extends IReferenceEntity {
    statisticsId: string;
    workspaceId: string;
    summary: StatisticsSummary;
    lastCalculatedAt: Date | string;
}

export interface StatisticsSummary {
    totalLearningHours: number;
    completedCourses: number;
    activeExternalWorkflowReferences: number;
    earnedCertificates: number;
}

```

### 15.B.7 Search Contracts

**Architectural Commentary**
These contracts define the boundaries for internal workspace search queries and rolling indexes of recently viewed external entities, facilitating quick discovery and contextual navigation.

```typescript

/**
 * A private, localized log of internal workspace search queries.
 */
export interface ISearchHistory extends IReferenceEntity {
    historyId: string;
    workspaceId: string;
    records: readonly SearchRecord[];
}

/**
 * A rolling index of specific external entities the student has recently accessed.
 */
export interface IRecentlyViewed extends IReferenceEntity {
    viewedId: string;
    workspaceId: string;
    references: readonly SavedReference[];
}

export interface SearchRecord {
    queryString: string;
    searchedAt: Date | string;
}

```

### 15.B.8 Repository Contracts

**Architectural Commentary**
Repository contracts define data access abstractions, ensuring the domain remains completely decoupled from Prisma ORM implementation details. They provide read and write access to the underlying Workspace state.

```typescript

export interface IStudentWorkspaceRepository {
    getByStudentId(studentId: string, cancellationToken?: any): Promise<IStudentWorkspace | null>;
    add(workspace: IStudentWorkspace, cancellationToken?: any): Promise<void>;
    updateStatus(workspaceId: string, status: string, cancellationToken?: any): Promise<void>;
}

export interface IDashboardRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<IDashboardLayout | null>;
    saveLayout(layout: IDashboardLayout, cancellationToken?: any): Promise<void>;
}

export interface ISavedItemRepository {
    getByCollectionId(collectionId: string, cancellationToken?: any): Promise<readonly ISavedItem[]>;
    add(item: ISavedItem, cancellationToken?: any): Promise<void>;
    remove(itemId: string, cancellationToken?: any): Promise<void>;
}

export interface ISavedCollectionRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<readonly ISavedCollection[]>;
    add(collection: ISavedCollection, cancellationToken?: any): Promise<void>;
    remove(collectionId: string, cancellationToken?: any): Promise<void>;
}

export interface ITimelineRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<IPersonalTimeline | null>;
    appendEntry(workspaceId: string, entry: TimelineEntry, cancellationToken?: any): Promise<void>;
}

export interface IStatisticsRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<IPersonalStatistics | null>;
    update(statistics: IPersonalStatistics, cancellationToken?: any): Promise<void>;
}

export interface IWorkspaceSnapshotRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<readonly IWorkspaceSnapshot[]>;
    add(snapshot: IWorkspaceSnapshot, cancellationToken?: any): Promise<void>;
}

export interface IQuickActionRepository {
    getActiveActions(workspaceId: string, cancellationToken?: any): Promise<readonly IQuickAction[]>;
    saveActions(workspaceId: string, actions: readonly IQuickAction[], cancellationToken?: any): Promise<void>;
}

export interface IRecentActivityRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<IRecentActivity | null>;
    recordActivity(workspaceId: string, item: RecentItem, cancellationToken?: any): Promise<void>;
}

export interface IPreferencesRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<IStudentPreference | null>;
    update(preference: IStudentPreference, cancellationToken?: any): Promise<void>;
}

export interface ISearchHistoryRepository {
    getByWorkspaceId(workspaceId: string, cancellationToken?: any): Promise<ISearchHistory | null>;
    appendSearch(workspaceId: string, record: SearchRecord, cancellationToken?: any): Promise<void>;
}

```

### 15.B.9 Integration Contracts

**Architectural Commentary**
Integration contracts define the Read Models (Projections) exposed to consumers and the immutable integration interfaces used to communicate with external enterprise platforms without forming hard dependencies.

```typescript

export interface ILearningProgressProjection {
    courseId: string;
    completionPercentage: number;
    nextLessonId: string;
}

export interface ICertificateProjection {
    certificateId: string;
    verificationStatus: string;
    issuedAt: Date | string;
}

export interface IScholarshipProjection {
    scholarshipId: string;
    applicationDeadline: Date | string;
    status: string;
}

export interface IUniversityProjection {
    universityId: string;
    displayName: string;
    ranking: string;
}

export interface IExternalWorkflowStatusProjection {
    workflowId: string;
    workflowType: string; // e.g. 'ScholarshipRegistration', 'Visa'
    status: string;
    lastUpdatedAt: Date | string;
}

export interface ICountryProjection {
    countryCode: string;
    region: string;
}

export interface IAIRecommendationProjection {
    recommendationId: string;
    targetReferenceId: string;
    matchScore: number;
}

export interface INotificationProjection {
    notificationId: string;
    isRead: boolean;
    priority: string;
}

export interface IMediaProjection {
    assetId: string;
    thumbnailUri: string;
}

export interface IIdentityPlatformIntegration {}

export interface ILearningPlatformIntegration {}

export interface ICertificatesPlatformIntegration {}

export interface IScholarshipPlatformIntegration {}

export interface IUniversityPlatformIntegration {}

export interface IExternalWorkflowStatusIntegration {}

export interface ICountryPlatformIntegration {}

export interface IAIPlatformIntegration {
    publishBehavioralTelemetry(workspaceId: string, payload: object, cancellationToken?: any): Promise<void>;
}

export interface ISearchPlatformIntegration {
    executeGlobalSearch(query: string, cancellationToken?: any): Promise<void>;
}

export interface INotificationPlatformIntegration {
    dispatchNotificationIntent(studentId: string, payload: object, cancellationToken?: any): Promise<void>;
}

export interface IAnalyticsPlatformIntegration {
    publishEngagementMetrics(workspaceId: string, metrics: object, cancellationToken?: any): Promise<void>;
}

export interface IMediaPlatformIntegration {}

```

### 15.B.10 Event Contracts

**Architectural Commentary**
These contracts define the standard immutable domain events emitted by the Student Workspace. They follow the enterprise pattern of capturing significant state changes and decoupling core transactional operations from downstream analytical and search consumers.

```typescript
export interface IStudentWorkspaceCreated extends IEnterpriseDomainEvent {
  workspaceId: string;
  studentId: string;
}

export interface IStudentWorkspaceActivated extends IEnterpriseDomainEvent {
  workspaceId: string;
}

export interface IStudentWorkspaceSuspended extends IEnterpriseDomainEvent {
  workspaceId: string;
}

export interface IStudentWorkspaceArchived extends IEnterpriseDomainEvent {
  workspaceId: string;
}

export interface IDashboardUpdated extends IEnterpriseDomainEvent {
  workspaceId: string;
  layoutId: string;
}

export interface IDashboardLayoutChanged extends IEnterpriseDomainEvent {
  layoutId: string;
}

export interface IWidgetAdded extends IEnterpriseDomainEvent {
  widgetId: string;
  layoutId: string;
}

export interface IWidgetRemoved extends IEnterpriseDomainEvent {
  widgetId: string;
}

export interface IWidgetHidden extends IEnterpriseDomainEvent {
  widgetId: string;
}

export interface IWidgetEnabled extends IEnterpriseDomainEvent {
  widgetId: string;
}

export interface ISavedItemAdded extends IEnterpriseDomainEvent {
  itemId: string;
  collectionId: string;
}

export interface ISavedItemRemoved extends IEnterpriseDomainEvent {
  itemId: string;
}

export interface ISavedCollectionCreated extends IEnterpriseDomainEvent {
  collectionId: string;
}

export interface ISavedCollectionDeleted extends IEnterpriseDomainEvent {
  collectionId: string;
}

export interface IQuickActionGenerated extends IEnterpriseDomainEvent {
  actionId: string;
}

export interface IPreferenceUpdated extends IEnterpriseDomainEvent {
  preferenceId: string;
}

export interface IPrivacyChanged extends IEnterpriseDomainEvent {
  preferenceId: string;
  isTelemetryAllowed: boolean;
}

export interface INotificationPreferenceChanged extends IEnterpriseDomainEvent {
  preferenceId: string;
}

export interface ITimelineEntryCreated extends IEnterpriseDomainEvent {
  timelineId: string;
  entryId: string;
}

export interface IStatisticsUpdated extends IEnterpriseDomainEvent {
  statisticsId: string;
}

export interface IWorkspaceSnapshotCreated extends IEnterpriseDomainEvent {
  snapshotId: string;
}

export interface IWorkspaceRestored extends IEnterpriseDomainEvent {
  workspaceId: string;
  snapshotId: string;
}

export interface ISearchPerformed extends IEnterpriseDomainEvent {
  workspaceId: string;
  queryString: string;
}

export interface IRecentItemAdded extends IEnterpriseDomainEvent {
  workspaceId: string;
  referenceId: string;
}

export interface IRecommendationViewed extends IEnterpriseDomainEvent {
  workspaceId: string;
  recommendationId: string;
}

export interface IRecommendationDismissed extends IEnterpriseDomainEvent {
  workspaceId: string;
  recommendationId: string;
}

export interface IRecentActivityRecorded extends IEnterpriseDomainEvent {
  workspaceId: string;
  activityId: string;
}
```

### 15.B.11 Contracts Review

**Formal Review Conclusion**

- **Single Source of Truth (SSoT):** Validated. Phase 15 acts exclusively as the Personal Experience Layer, orchestrating read models and projecting data from upstream systems (like Courses, Certificates, and Scholarships) without duplicating enterprise master data.
- **Clean Architecture:** Validated. Domain logic is encapsulated via strictly typed pure TypeScript interfaces reflecting true bounded context isolation. Zero implementation details or Application Layer/ORM leakage exist in the domain layer.
- **Event-Driven Architecture (EDA):** Validated. Adherence to `IEnterpriseDomainEvent` ensures proper integration across the enterprise event bus. Cross-platform notifications rely purely on ID-based domain events.
- **Domain Focus:** Validated. All application-level constructs (Commands, Queries, Services, Validation logic) have been strictly expelled from the Domain Contracts, ensuring pure structural domain representation consistent with the enterprise standard.

**Status:** BASELINED / SOURCE_COMPLETE — RUNTIME_EVIDENCE_PENDING
