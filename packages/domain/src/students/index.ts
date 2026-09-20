export enum StudentWorkspaceStatus {
  INITIALIZING = 'INITIALIZING',
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum StudentSavedItemType {
  COURSE = 'COURSE',
  SCHOLARSHIP = 'SCHOLARSHIP',
  UNIVERSITY = 'UNIVERSITY',
  MAJOR = 'MAJOR',
  CERTIFICATE = 'CERTIFICATE',
  STUDENT_TOOL = 'STUDENT_TOOL',
  CMS_CONTENT = 'CMS_CONTENT',
  SERVICE = 'SERVICE',
}

export enum StudentCollectionType {
  PERSONAL = 'PERSONAL',
  SMART = 'SMART',
  FAVORITES = 'FAVORITES',
}

export type StudentWorkspaceDevice = 'DESKTOP' | 'TABLET' | 'MOBILE';

export interface StudentPrivacyPreferences {
  retainSearchHistory: boolean;
  allowPersonalization: boolean;
  allowProductAnalytics: boolean;
  publicProfileEnabled: boolean;
}


export interface StudentPrivacyConsentDecisionDto {
  id: string;
  studentReferenceId: string;
  workspaceVersion: number;
  actorId: string;
  actorType: 'USER' | 'SYSTEM';
  purpose: string;
  source: string;
  beforePreferences: StudentPrivacyPreferences;
  afterPreferences: StudentPrivacyPreferences;
  changedFields: string[];
  decidedAt: Date;
}

export interface UpdateStudentPrivacyConsentDto {
  studentReferenceId: string;
  expectedVersion: number;
  privacyPreferences: StudentPrivacyPreferences;
  actorId: string;
  actorType?: 'USER' | 'SYSTEM';
  purpose: string;
  source?: string;
  correlationId?: string | null;
}

export interface StudentAccessibilityPreferences {
  textScale: 'SMALL' | 'DEFAULT' | 'LARGE';
  reduceMotion: boolean;
  highContrast: boolean;
}

export interface StudentNotificationPreferences {
  inApp: boolean;
  email: boolean;
  push: boolean;
  learning: boolean;
  certificates: boolean;
  scholarships: boolean;
  payments: boolean;
}

export interface StudentWorkspaceDto {
  id: string;
  studentReferenceId: string;
  status: StudentWorkspaceStatus;
  version: number;
  displayName?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  theme?: string | null;
  avatarAssetId?: string | null;
  layoutPreferences?: Record<string, unknown> | null;
  notificationMatrix?: StudentNotificationPreferences | null;
  privacyPreferences?: StudentPrivacyPreferences | null;
  accessibilityPreferences?: StudentAccessibilityPreferences | null;
  metadata?: Record<string, unknown> | null;
  lastActiveAt?: Date | null;
  suspendedAt?: Date | null;
  archivedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UpsertStudentWorkspaceDto {
  studentReferenceId: string;
  expectedVersion?: number;
  status?: StudentWorkspaceStatus;
  displayName?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  theme?: string | null;
  avatarAssetId?: string | null;
  layoutPreferences?: Record<string, unknown> | null;
  notificationMatrix?: StudentNotificationPreferences | null;
  privacyPreferences?: StudentPrivacyPreferences | null;
  accessibilityPreferences?: StudentAccessibilityPreferences | null;
  metadata?: Record<string, unknown> | null;
}

export interface StudentSavedItemDto {
  id: string;
  studentReferenceId: string;
  collectionId?: string | null;
  entityType: StudentSavedItemType;
  entityId: string;
  entitySlug?: string | null;
  displayName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
  savedAt: Date;
  updatedAt: Date;
}

export interface SaveStudentItemDto {
  studentReferenceId: string;
  collectionId?: string | null;
  entityType: StudentSavedItemType;
  entityId: string;
  entitySlug?: string | null;
  displayName?: string | null;
  notes?: string | null;
  metadata?: Record<string, unknown> | null;
}

export interface StudentSavedCollectionDto {
  id: string;
  studentReferenceId: string;
  name: string;
  description?: string | null;
  type: StudentCollectionType;
  color?: string | null;
  icon?: string | null;
  itemCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StudentTimelineEntryDto {
  id: string;
  studentReferenceId: string;
  eventType: string;
  title: string;
  description?: string | null;
  sourceDomain: string;
  sourceReferenceId?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date;
}

export interface StudentRecentActivityDto {
  id: string;
  studentReferenceId: string;
  activityType: string;
  title: string;
  entityType?: string | null;
  entityId?: string | null;
  entitySlug?: string | null;
  metadata?: Record<string, unknown> | null;
  occurredAt: Date;
}

export interface StudentRecentlyViewedDto {
  id: string;
  studentReferenceId: string;
  entityType: StudentSavedItemType;
  entityId: string;
  entitySlug?: string | null;
  viewedAt: Date;
}

export interface StudentWorkspaceSnapshotDto {
  id: string;
  studentReferenceId: string;
  label?: string | null;
  workspaceVersion: number;
  createdAt: Date;
}

export interface StudentWidgetDefinitionDto {
  key: string;
  labelAr: string;
  labelEn: string;
  descriptionAr: string;
  supportedDevices: StudentWorkspaceDevice[];
  defaultVisible: boolean;
  capability?: string;
  minColumnSpan: number;
  maxColumnSpan: number;
}

export interface IStudentWorkspaceDeliveryCache {
  getDashboard(studentReferenceId: string): Promise<StudentDashboardSummaryDto | null>;
  setDashboard(studentReferenceId: string, dashboard: StudentDashboardSummaryDto): Promise<void>;
  invalidate(studentReferenceId: string, reason: string): Promise<void>;
}

export interface StudentCourseProgressDto {
  enrollmentId: string;
  courseId: string;
  courseSlug: string;
  courseName: string;
  status: string;
  progressPercentage: number;
  enrolledAt: Date;
  lastAccessedAt?: Date | null;
  completedAt?: Date | null;
}

export interface StudentCertificateProjectionDto {
  id: string;
  publicId: string;
  serialNumber: string;
  verificationCode: string;
  status: string;
  courseDisplayName: string;
  issuedAt: Date;
  expiresAt?: Date | null;
  certificatePdfAssetId?: string | null;
  previewImageAssetId?: string | null;
}

export interface StudentNotificationProjectionDto {
  id: string;
  category: string;
  title: string;
  message: string;
  actionUrl?: string | null;
  readAt?: Date | null;
  occurredAt: Date;
}

export interface StudentWorkspaceIntegrationEventDto {
  eventId: string;
  studentReferenceId: string;
  eventType: string;
  sourceDomain: string;
  sourceReferenceId?: string | null;
  title: string;
  description?: string | null;
  occurredAt: Date;
  metadata?: Record<string, unknown> | null;
  notification?: {
    category: string;
    title: string;
    message: string;
    actionUrl?: string | null;
  } | null;
}

export interface StudentQuickActionDto {
  id: string;
  label: string;
  description: string;
  href: string;
  priority: number;
  kind: 'LEARNING' | 'CERTIFICATE' | 'DISCOVERY' | 'PAYMENT' | 'PROFILE';
}

export interface StudentPersonalStatisticsDto {
  savedItems: number;
  activeCourses: number;
  completedCourses: number;
  averageCourseProgress: number;
  certificates: number;
  unreadNotifications: number;
}

export type StudentCapabilityState = 'AVAILABLE' | 'DEGRADED' | 'NOT_CONFIGURED';

export interface StudentDashboardSummaryDto {
  workspace: StudentWorkspaceDto;
  savedItems: StudentSavedItemDto[];
  collections: StudentSavedCollectionDto[];
  timeline: StudentTimelineEntryDto[];
  recentActivity: StudentRecentActivityDto[];
  recentlyViewed: StudentRecentlyViewedDto[];
  widgetRegistry: StudentWidgetDefinitionDto[];
  courseEnrollments: StudentCourseProgressDto[];
  certificates: StudentCertificateProjectionDto[];
  notifications: StudentNotificationProjectionDto[];
  quickActions: StudentQuickActionDto[];
  statistics: StudentPersonalStatisticsDto;
  certificateCount: number;
  activeCourseEnrollmentCount: number;
  completedCourseEnrollmentCount: number;
  capabilityStatus: Record<string, StudentCapabilityState>;
  partialFailures: string[];
}

export interface StudentSupportWorkspaceSummaryDto {
  studentReferenceId: string;
  status: StudentWorkspaceStatus;
  version: number;
  displayName?: string | null;
  preferredLanguage?: string | null;
  timezone?: string | null;
  lastActiveAt?: Date | null;
  updatedAt: Date;
}

export interface StudentSupportWorkspacePageDto {
  items: StudentSupportWorkspaceSummaryDto[];
  nextCursor: string | null;
  hasMore: boolean;
}

export interface StudentSupportWorkspaceDetailDto extends StudentSupportWorkspaceSummaryDto {
  provisioningHealth: {
    state: 'HEALTHY' | 'PENDING' | 'FAILED';
    pendingEventCount: number;
    failedEventCount: number;
    lastEventAt?: Date | null;
    lastFailureCode?: string | null;
  };
  consentAudit: {
    hasDecision: boolean;
    lastDecidedAt?: Date | null;
  };
  linkedSummaries: {
    activeCourseCount: number;
    certificateCount: number;
    unreadNotificationCount: number;
  };
}

export type StudentApplicationTrackerStatus = 'ACTIVE' | 'ARCHIVED';

export interface StudentApplicationChecklistItemDto {
  id: string; trackerId: string; label: string; completed: boolean; position: number; completedAt?: Date | null; createdAt: Date; updatedAt: Date;
}

export interface StudentApplicationTrackerDto {
  id: string; studentReferenceId: string; scholarshipId: string; scholarshipSlug?: string | null;
  stage: string; notes?: string | null; deadlineAt?: Date | null; status: StudentApplicationTrackerStatus; version: number;
  checklist: StudentApplicationChecklistItemDto[]; createdAt: Date; updatedAt: Date; archivedAt?: Date | null;
}

export interface CreateStudentApplicationTrackerDto {
  studentReferenceId: string; scholarshipId: string; scholarshipSlug?: string | null; stage?: string; notes?: string | null; deadlineAt?: Date | null; checklistLabels?: string[];
}
export interface UpdateStudentApplicationTrackerDto {
  expectedVersion: number; stage?: string; notes?: string | null; deadlineAt?: Date | null;
}

export interface IStudentApplicationTrackerRepository {
  create(data: CreateStudentApplicationTrackerDto): Promise<StudentApplicationTrackerDto>;
  list(studentReferenceId: string): Promise<StudentApplicationTrackerDto[]>;
  findById(studentReferenceId: string, trackerId: string): Promise<StudentApplicationTrackerDto | null>;
  update(studentReferenceId: string, trackerId: string, data: UpdateStudentApplicationTrackerDto): Promise<StudentApplicationTrackerDto>;
  setChecklistItem(studentReferenceId: string, trackerId: string, itemId: string, completed: boolean, expectedVersion: number): Promise<StudentApplicationTrackerDto>;
  archive(studentReferenceId: string, trackerId: string, expectedVersion: number): Promise<StudentApplicationTrackerDto>;
  remove(studentReferenceId: string, trackerId: string): Promise<void>;
}

export interface StudentApplicationScholarshipOwnerDto {
  id: string; slug?: string | null; displayName: string; country?: string | null; deadlineAt?: Date | null; lifecycleStatus?: string | null; available: boolean;
}
export interface IStudentApplicationScholarshipGateway { resolve(scholarshipId: string): Promise<StudentApplicationScholarshipOwnerDto | null>; }
export interface IStudentApplicationReminderGateway {
  schedule(input: { trackerId: string; trackerVersion: number; studentReferenceId: string; scholarshipId: string; deadlineAt: Date }): Promise<void>;
  cancel(trackerId: string, trackerVersion: number): Promise<void>;
}

export interface IStudentWorkspaceRepository {
  findWorkspace(studentReferenceId: string): Promise<StudentWorkspaceDto | null>;
  listSupportWorkspaces(input: { query?: string; status?: StudentWorkspaceStatus; limit?: number; cursor?: string }): Promise<StudentSupportWorkspacePageDto>;
  getSupportWorkspaceDetail(studentReferenceId: string): Promise<StudentSupportWorkspaceDetailDto | null>;
  upsertWorkspace(data: UpsertStudentWorkspaceDto): Promise<StudentWorkspaceDto>;
  updatePrivacyConsent(data: UpdateStudentPrivacyConsentDto): Promise<StudentPrivacyConsentDecisionDto>;
  getDashboardSummary(studentReferenceId: string): Promise<StudentDashboardSummaryDto | null>;
  saveItem(data: SaveStudentItemDto): Promise<StudentSavedItemDto>;
  removeSavedItem(
    studentReferenceId: string,
    entityType: StudentSavedItemType,
    entityId: string,
  ): Promise<void>;
  listSavedItems(studentReferenceId: string): Promise<StudentSavedItemDto[]>;
  createCollection(data: {
    studentReferenceId: string;
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  }): Promise<StudentSavedCollectionDto>;
  listCollections(studentReferenceId: string): Promise<StudentSavedCollectionDto[]>;
  updateCollection(
    studentReferenceId: string,
    collectionId: string,
    data: { name?: string; description?: string | null; color?: string | null; icon?: string | null },
  ): Promise<StudentSavedCollectionDto>;
  deleteCollection(studentReferenceId: string, collectionId: string): Promise<void>;
  moveSavedItem(
    studentReferenceId: string,
    itemId: string,
    collectionId: string | null,
  ): Promise<StudentSavedItemDto>;
  appendActivity(
    data: Omit<StudentRecentActivityDto, 'id' | 'occurredAt'>,
  ): Promise<StudentRecentActivityDto>;
  appendTimeline(
    data: Omit<StudentTimelineEntryDto, 'id' | 'occurredAt'>,
  ): Promise<StudentTimelineEntryDto>;
  recordSearch(studentReferenceId: string, query: string): Promise<void>;
  clearSearchHistory(studentReferenceId: string): Promise<void>;
  recordRecentlyViewed(data: {
    studentReferenceId: string;
    entityType: StudentSavedItemType;
    entityId: string;
    entitySlug?: string | null;
  }): Promise<StudentRecentlyViewedDto | null>;
  listRecentlyViewed(studentReferenceId: string): Promise<StudentRecentlyViewedDto[]>;
  clearRecentlyViewed(studentReferenceId: string): Promise<void>;
  createSnapshot(
    studentReferenceId: string,
    label?: string | null,
  ): Promise<{ id: string; createdAt: Date }>;
  listSnapshots(studentReferenceId: string): Promise<StudentWorkspaceSnapshotDto[]>;
  restoreSnapshot(
    studentReferenceId: string,
    snapshotId: string,
    expectedVersion: number,
  ): Promise<StudentWorkspaceDto>;
  resetLayout(studentReferenceId: string, expectedVersion: number): Promise<StudentWorkspaceDto>;
  ingestIntegrationEvent(event: StudentWorkspaceIntegrationEventDto): Promise<boolean>;
}

/** P8 cross-domain read contract: Phase 15 stores only references; owner domains hydrate display truth. */
export interface StudentSavedItemOwnerReadModel {
  ownerType: StudentSavedItemType;
  ownerId: string;
  publicId?: string;
  slug?: string;
  displayName?: string;
  lifecycleStatus?: string;
  available: boolean;
}
export interface HydratedStudentSavedItemDto {
  savedItem: StudentSavedItemDto;
  owner: StudentSavedItemOwnerReadModel | null;
}
export interface IStudentSavedItemHydrationGateway {
  supports(entityType: StudentSavedItemType): boolean;
  hydrate(item: StudentSavedItemDto): Promise<StudentSavedItemOwnerReadModel | null>;
}

/** P7/P13 owner-read contracts: P15 composes learning/certificate truth but does not own it. */
export interface IStudentLearningReadGateway {
  listForStudent(studentReferenceId: string): Promise<StudentCourseProgressDto[]>;
}

export interface IStudentCertificateReadGateway {
  listForStudent(studentReferenceId: string): Promise<StudentCertificateProjectionDto[]>;
}
