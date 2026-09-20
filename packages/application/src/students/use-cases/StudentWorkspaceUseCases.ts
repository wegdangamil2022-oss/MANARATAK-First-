import { AssetReferencePolicy, assertAssetReferenceUsable } from '../../asset-platform/AssetReferencePolicy';
import {
  IStudentWorkspaceDeliveryCache,
  IStudentWorkspaceRepository,
  SaveStudentItemDto,
  StudentDashboardSummaryDto,
  StudentRecentActivityDto,
  StudentRecentlyViewedDto,
  StudentSavedCollectionDto,
  StudentSavedItemDto,
  StudentSavedItemType,
  StudentTimelineEntryDto,
  StudentPrivacyConsentDecisionDto,
  UpdateStudentPrivacyConsentDto,
  StudentWorkspaceDto,
  StudentWorkspaceIntegrationEventDto,
  StudentSupportWorkspacePageDto,
  StudentSupportWorkspaceDetailDto,
  StudentWorkspaceSnapshotDto,
  StudentWorkspaceStatus,
  UpsertStudentWorkspaceDto,
} from '@manaratak/domain';

export class StudentWorkspaceUseCases {
  constructor(
    private readonly repository: IStudentWorkspaceRepository,
    private readonly deliveryCache?: IStudentWorkspaceDeliveryCache | null,
    private readonly assetReferences?: AssetReferencePolicy,
  ) {}

  public async upsertWorkspace(data: UpsertStudentWorkspaceDto): Promise<StudentWorkspaceDto> {
    this.ensureStudentReference(data.studentReferenceId);
    await assertAssetReferenceUsable(this.assetReferences, data.avatarAssetId, { purpose: 'STUDENT_AVATAR', expectedOwnerId: data.studentReferenceId, allowedOwnerTypes: ['STUDENT'], allowedMimeTypePrefixes: ['image/'] });
    const current = await this.requireReadableWorkspace(data.studentReferenceId);
    if (current.status === StudentWorkspaceStatus.SUSPENDED) throw new Error('STUDENT_WORKSPACE_SUSPENDED');
    if (data.status !== undefined && data.status !== current.status) throw new Error('STUDENT_WORKSPACE_LIFECYCLE_EVENT_REQUIRED');
    if (data.privacyPreferences !== undefined) throw new Error('STUDENT_PRIVACY_CONSENT_COMMAND_REQUIRED');
    return this.mutate(data.studentReferenceId, 'workspace-updated', () => this.repository.upsertWorkspace(data));
  }

  /** P15-owned privacy-minimized support read model. It deliberately excludes privacy preferences, metadata and contact data. */
  public async listSupportWorkspaces(input: { query?: string; status?: StudentWorkspaceStatus; limit?: number; cursor?: string }): Promise<StudentSupportWorkspacePageDto> {
    return this.repository.listSupportWorkspaces(input);
  }

  public async getSupportWorkspaceDetail(studentReferenceId: string): Promise<StudentSupportWorkspaceDetailDto> {
    this.ensureStudentReference(studentReferenceId);
    const detail = await this.repository.getSupportWorkspaceDetail(studentReferenceId);
    if (!detail) throw new Error('STUDENT_WORKSPACE_NOT_FOUND');
    return detail;
  }

  public async getWorkspace(studentReferenceId: string): Promise<StudentWorkspaceDto> {
    this.ensureStudentReference(studentReferenceId);
    return this.requireReadableWorkspace(studentReferenceId);
  }

  public async getDashboard(studentReferenceId: string): Promise<StudentDashboardSummaryDto> {
    await this.requireReadableWorkspace(studentReferenceId);
    const cached = await this.deliveryCache?.getDashboard(studentReferenceId);
    if (cached) return cached;
    const summary = await this.repository.getDashboardSummary(studentReferenceId);
    if (!summary) {
      throw new Error('Student dashboard could not be loaded');
    }
    await this.deliveryCache?.setDashboard(studentReferenceId, summary);
    return summary;
  }

  public async updatePrivacyConsent(data: UpdateStudentPrivacyConsentDto): Promise<StudentPrivacyConsentDecisionDto> {
    this.ensureStudentReference(data.studentReferenceId);
    if (data.actorType && data.actorType !== 'USER') throw new Error('STUDENT_PRIVACY_CONSENT_ACTOR_INVALID');
    if (data.actorId !== data.studentReferenceId) throw new Error('STUDENT_PRIVACY_CONSENT_ACTOR_MISMATCH');
    if (!data.purpose.trim()) throw new Error('STUDENT_PRIVACY_CONSENT_PURPOSE_REQUIRED');
    await this.requireReadableWorkspace(data.studentReferenceId);
    return this.mutate(data.studentReferenceId, 'privacy-consent-updated', () => this.repository.updatePrivacyConsent({ ...data, actorType: 'USER', source: data.source ?? 'student-workspace-api' }));
  }

  public async saveItem(data: SaveStudentItemDto): Promise<StudentSavedItemDto> {
    this.ensureStudentReference(data.studentReferenceId);
    if (!Object.values(StudentSavedItemType).includes(data.entityType)) {
      throw new Error('Unsupported saved item type');
    }
    if (!data.entityId.trim()) throw new Error('entityId is required');
    return this.mutate(data.studentReferenceId, 'saved-item-updated', () => this.repository.saveItem(data));
  }

  public async removeSavedItem(
    studentReferenceId: string,
    entityType: StudentSavedItemType,
    entityId: string,
  ): Promise<void> {
    this.ensureStudentReference(studentReferenceId);
    await this.mutate(studentReferenceId, 'saved-item-removed', () => this.repository.removeSavedItem(studentReferenceId, entityType, entityId));
  }

  public async listSavedItems(studentReferenceId: string): Promise<StudentSavedItemDto[]> {
    this.ensureStudentReference(studentReferenceId);
    await this.requireReadableWorkspace(studentReferenceId);
    return this.repository.listSavedItems(studentReferenceId);
  }

  public async createCollection(data: {
    studentReferenceId: string;
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  }): Promise<StudentSavedCollectionDto> {
    this.ensureStudentReference(data.studentReferenceId);
    if (!data.name.trim()) throw new Error('Collection name is required');
    return this.mutate(data.studentReferenceId, 'collection-created', () => this.repository.createCollection({ ...data, name: data.name.trim() }));
  }

  public async listCollections(studentReferenceId: string): Promise<StudentSavedCollectionDto[]> {
    this.ensureStudentReference(studentReferenceId);
    await this.requireReadableWorkspace(studentReferenceId);
    return this.repository.listCollections(studentReferenceId);
  }

  public async updateCollection(
    studentReferenceId: string,
    collectionId: string,
    data: { name?: string; description?: string | null; color?: string | null; icon?: string | null },
  ): Promise<StudentSavedCollectionDto> {
    this.ensureStudentReference(studentReferenceId);
    if (data.name !== undefined && !data.name.trim()) throw new Error('Collection name is required');
    return this.mutate(studentReferenceId, 'collection-updated', () => this.repository.updateCollection(studentReferenceId, collectionId, {
      ...data,
      name: data.name?.trim(),
    }));
  }

  public async deleteCollection(studentReferenceId: string, collectionId: string): Promise<void> {
    this.ensureStudentReference(studentReferenceId);
    await this.mutate(studentReferenceId, 'collection-deleted', () => this.repository.deleteCollection(studentReferenceId, collectionId));
  }

  public async moveSavedItem(
    studentReferenceId: string,
    itemId: string,
    collectionId: string | null,
  ): Promise<StudentSavedItemDto> {
    this.ensureStudentReference(studentReferenceId);
    return this.mutate(studentReferenceId, 'saved-item-moved', () => this.repository.moveSavedItem(studentReferenceId, itemId, collectionId));
  }

  public async recordActivity(
    data: Omit<StudentRecentActivityDto, 'id' | 'occurredAt'>,
  ): Promise<StudentRecentActivityDto> {
    this.ensureStudentReference(data.studentReferenceId);
    if (!data.title.trim()) throw new Error('Activity title is required');
    return this.mutate(data.studentReferenceId, 'activity-recorded', () => this.repository.appendActivity(data));
  }

  public async appendTimeline(
    data: Omit<StudentTimelineEntryDto, 'id' | 'occurredAt'>,
  ): Promise<StudentTimelineEntryDto> {
    this.ensureStudentReference(data.studentReferenceId);
    return this.mutate(data.studentReferenceId, 'timeline-updated', () => this.repository.appendTimeline(data));
  }

  public async recordSearch(studentReferenceId: string, query: string): Promise<void> {
    this.ensureStudentReference(studentReferenceId);
    const normalized = query.trim().slice(0, 160);
    if (!normalized) return;
    await this.mutate(studentReferenceId, 'search-recorded', () => this.repository.recordSearch(studentReferenceId, normalized));
  }

  public async clearSearchHistory(studentReferenceId: string): Promise<void> {
    this.ensureStudentReference(studentReferenceId);
    await this.mutate(studentReferenceId, 'search-cleared', () => this.repository.clearSearchHistory(studentReferenceId));
  }

  public async recordRecentlyViewed(data: {
    studentReferenceId: string;
    entityType: StudentSavedItemType;
    entityId: string;
    entitySlug?: string | null;
  }): Promise<StudentRecentlyViewedDto | null> {
    this.ensureStudentReference(data.studentReferenceId);
    if (!data.entityId.trim()) throw new Error('entityId is required');
    return this.mutate(data.studentReferenceId, 'recently-viewed-updated', () => this.repository.recordRecentlyViewed(data));
  }

  public async listRecentlyViewed(studentReferenceId: string): Promise<StudentRecentlyViewedDto[]> {
    this.ensureStudentReference(studentReferenceId);
    await this.requireReadableWorkspace(studentReferenceId);
    return this.repository.listRecentlyViewed(studentReferenceId);
  }

  public async clearRecentlyViewed(studentReferenceId: string): Promise<void> {
    this.ensureStudentReference(studentReferenceId);
    await this.mutate(studentReferenceId, 'recently-viewed-cleared', () => this.repository.clearRecentlyViewed(studentReferenceId));
  }

  public async createSnapshot(
    studentReferenceId: string,
    label?: string | null,
  ): Promise<{ id: string; createdAt: Date }> {
    this.ensureStudentReference(studentReferenceId);
    return this.repository.createSnapshot(studentReferenceId, label?.trim().slice(0, 80));
  }

  public async listSnapshots(studentReferenceId: string): Promise<StudentWorkspaceSnapshotDto[]> {
    this.ensureStudentReference(studentReferenceId);
    await this.requireReadableWorkspace(studentReferenceId);
    return this.repository.listSnapshots(studentReferenceId);
  }

  public async restoreSnapshot(
    studentReferenceId: string,
    snapshotId: string,
    expectedVersion: number,
  ): Promise<StudentWorkspaceDto> {
    this.ensureStudentReference(studentReferenceId);
    return this.mutate(studentReferenceId, 'snapshot-restored', () => this.repository.restoreSnapshot(studentReferenceId, snapshotId, expectedVersion));
  }

  public async resetLayout(
    studentReferenceId: string,
    expectedVersion: number,
  ): Promise<StudentWorkspaceDto> {
    this.ensureStudentReference(studentReferenceId);
    return this.mutate(studentReferenceId, 'layout-reset', () => this.repository.resetLayout(studentReferenceId, expectedVersion));
  }

  public async consumeIntegrationEvent(
    event: StudentWorkspaceIntegrationEventDto,
  ): Promise<boolean> {
    this.ensureStudentReference(event.studentReferenceId);
    if (!event.eventId.trim()) throw new Error('eventId is required');
    if (!event.sourceDomain.trim()) throw new Error('sourceDomain is required');
    return this.mutate(event.studentReferenceId, 'integration-event-projected', () => this.repository.ingestIntegrationEvent(event));
  }

  private ensureStudentReference(studentReferenceId: string): void {
    if (!studentReferenceId.trim()) {
      throw new Error('studentReferenceId is required');
    }
  }

  private async mutate<T>(studentReferenceId: string, reason: string, operation: () => Promise<T>): Promise<T> {
    const result = await operation();
    await this.deliveryCache?.invalidate(studentReferenceId, reason);
    return result;
  }

  private async requireReadableWorkspace(studentReferenceId: string): Promise<StudentWorkspaceDto> {
    const workspace = await this.repository.findWorkspace(studentReferenceId);
    if (!workspace) throw new Error('STUDENT_WORKSPACE_PROVISIONING_PENDING');
    if (workspace.status === StudentWorkspaceStatus.INITIALIZING) throw new Error('STUDENT_WORKSPACE_INITIALIZING');
    if (workspace.status === StudentWorkspaceStatus.ARCHIVED) throw new Error('STUDENT_WORKSPACE_ARCHIVED');
    return workspace;
  }
}
