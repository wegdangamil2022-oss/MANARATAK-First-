import { randomUUID } from 'node:crypto';
import { StudentSupportCursorCodec } from './StudentSupportCursorCodec';
import { Prisma, PrismaClient } from '@prisma/client';
import {
  IStudentWorkspaceRepository,
  SaveStudentItemDto,
  StudentCollectionType,
  StudentDashboardSummaryDto,
  StudentRecentActivityDto,
  StudentRecentlyViewedDto,
  StudentSavedCollectionDto,
  StudentSavedItemDto,
  StudentTimelineEntryDto,
  StudentPersonalStatisticsDto,
  StudentPrivacyConsentDecisionDto,
  UpdateStudentPrivacyConsentDto,
  StudentWorkspaceDto,
  StudentWorkspaceIntegrationEventDto,
  StudentWorkspaceSnapshotDto,
  StudentSupportWorkspacePageDto,
  StudentSupportWorkspaceDetailDto,
  StudentWorkspaceStatus,
  UpsertStudentWorkspaceDto,
} from '@manaratak/domain';

const json = (value: unknown): Prisma.InputJsonValue | undefined =>
  value === undefined ? undefined : (JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue);

const DEFAULT_LAYOUT = {
  desktop: ['LEARNING_PROGRESS', 'QUICK_ACTIONS', 'CERTIFICATES', 'SAVED_ITEMS', 'TIMELINE'],
  mobile: ['QUICK_ACTIONS', 'LEARNING_PROGRESS', 'CERTIFICATES', 'SAVED_ITEMS', 'TIMELINE'],
};
const DEFAULT_NOTIFICATIONS = {
  inApp: true,
  email: true,
  push: false,
  learning: true,
  certificates: true,
  scholarships: true,
  payments: true,
};
const DEFAULT_PRIVACY = {
  retainSearchHistory: false,
  allowPersonalization: false,
  allowProductAnalytics: false,
  publicProfileEnabled: false,
};
const DEFAULT_ACCESSIBILITY = {
  textScale: 'DEFAULT',
  reduceMotion: false,
  highContrast: false,
};

interface StudentAuditActor {
  actorId: string;
  actorType: 'USER' | 'SYSTEM';
  source: string;
  sourceEventId?: string | null;
  reason?: string;
  correlationId?: string;
}

const WIDGET_REGISTRY = [
  { key: 'CONTINUE_LEARNING', labelAr: 'متابعة التعلم', labelEn: 'Continue learning', descriptionAr: 'الدورات النشطة من إسقاط منصة التعلم', supportedDevices: ['DESKTOP', 'TABLET', 'MOBILE'], defaultVisible: true, capability: 'courseEnrollments', minColumnSpan: 1, maxColumnSpan: 2 },
  { key: 'RECENT_CERTIFICATES', labelAr: 'الشهادات الحديثة', labelEn: 'Recent certificates', descriptionAr: 'الشهادات الصادرة من إسقاط منصة الشهادات', supportedDevices: ['DESKTOP', 'TABLET', 'MOBILE'], defaultVisible: true, capability: 'certificates', minColumnSpan: 1, maxColumnSpan: 2 },
  { key: 'SAVED_OPPORTUNITIES', labelAr: 'الفرص المحفوظة', labelEn: 'Saved opportunities', descriptionAr: 'مراجع محفوظة دون نسخ البيانات الأصلية', supportedDevices: ['DESKTOP', 'TABLET', 'MOBILE'], defaultVisible: true, capability: 'savedItems', minColumnSpan: 1, maxColumnSpan: 2 },
  { key: 'RECENT_ACTIVITY', labelAr: 'النشاط الحديث', labelEn: 'Recent activity', descriptionAr: 'آخر نشاطات مساحة العمل', supportedDevices: ['DESKTOP', 'TABLET', 'MOBILE'], defaultVisible: true, capability: 'recentActivity', minColumnSpan: 1, maxColumnSpan: 2 },
  { key: 'PERSONAL_TIMELINE_SUMMARY', labelAr: 'ملخص رحلتي', labelEn: 'Journey summary', descriptionAr: 'أحداث الرحلة غير القابلة للتعديل', supportedDevices: ['DESKTOP', 'TABLET', 'MOBILE'], defaultVisible: true, capability: 'timeline', minColumnSpan: 1, maxColumnSpan: 2 },
  { key: 'RECOMMENDATIONS', labelAr: 'التوصيات', labelEn: 'Recommendations', descriptionAr: 'توصيات Phase 17 عند تفعيل الموافقة', supportedDevices: ['DESKTOP', 'TABLET', 'MOBILE'], defaultVisible: false, capability: 'recommendations', minColumnSpan: 1, maxColumnSpan: 2 },
] as const;

export class PrismaStudentWorkspaceRepository implements IStudentWorkspaceRepository {
  public constructor(private readonly prisma: PrismaClient, private readonly cursorSigningSecret?:string) {}

  private get db(): any {
    return this.prisma as any;
  }

  public async listSupportWorkspaces(input: { query?: string; status?: StudentWorkspaceStatus; limit?: number; cursor?: string }): Promise<StudentSupportWorkspacePageDto> {
    const limit = Math.min(100, Math.max(1, Math.trunc(input.limit ?? 30)));
    const query = input.query?.trim().slice(0, 120) ?? '';
    const scope = JSON.stringify({domain:'workspace',query,status:input.status ?? null,limit});
    const codec = new StudentSupportCursorCodec(this.cursorSigningSecret);
    const anchor = input.cursor ? codec.decode(input.cursor,scope) : null;
    const cursorUpdatedAt = anchor?.updatedAt ?? null;
    const cursorId = anchor?.id ?? null;
    const baseWhere = {
      ...(input.status ? {status:input.status} : {}),
      ...(query ? {OR:[{studentReferenceId:{contains:query,mode:'insensitive'}},{displayName:{contains:query,mode:'insensitive'}}]} : {}),
    };
    const total = await this.db.studentWorkspace.count({where:baseWhere});
    const rows = await this.db.studentWorkspace.findMany({
      where: {
        AND:[baseWhere,...(cursorUpdatedAt && cursorId ? [{OR:[{updatedAt:{lt:new Date(cursorUpdatedAt)}},{updatedAt:new Date(cursorUpdatedAt),id:{lt:cursorId}}]}] : [])],
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
      select: { id: true, studentReferenceId: true, status: true, version: true, displayName: true, preferredLanguage: true, timezone: true, lastActiveAt: true, updatedAt: true },
    });
    const hasMore = rows.length > limit;
    const selected = rows.slice(0, limit);
    const items = selected.map((row: any) => ({ studentReferenceId: row.studentReferenceId, status: row.status, version: row.version, displayName: row.displayName, preferredLanguage: row.preferredLanguage, timezone: row.timezone, lastActiveAt: row.lastActiveAt, updatedAt: row.updatedAt }));
    const last = selected[selected.length - 1];
    return { items, total, hasMore, nextCursor: hasMore && last ? codec.encode(last,scope) : null };
  }

  public async getSupportWorkspaceDetail(studentReferenceId: string): Promise<StudentSupportWorkspaceDetailDto | null> {
    const row = await this.db.studentWorkspace.findUnique({
      where: { studentReferenceId },
      select: {
        studentReferenceId: true, status: true, version: true, displayName: true, preferredLanguage: true, timezone: true,
        lastActiveAt: true, updatedAt: true,
      },
    });
    if (!row) return null;
    const [inbox, lastConsent, activeCourseCount, certificateCount, unreadNotificationCount] = await Promise.all([
      this.db.studentWorkspaceEventInbox.findMany({
        where: { studentReferenceId },
        orderBy: { receivedAt: 'desc' },
        take: 1,
        select: { receivedAt: true },
      }),
      this.db.studentPrivacyConsentDecision.findFirst({
        where: { studentReferenceId },
        orderBy: { decidedAt: 'desc' },
        select: { decidedAt: true },
      }),
      this.db.studentLearningProjection.count({ where: { studentReferenceId, status: { in: ['ACTIVE', 'ENROLLED', 'IN_PROGRESS'] } } }),
      this.db.studentCertificateReadProjection.count({ where: { studentReferenceId } }),
      this.db.studentNotificationProjection.count({ where: { studentReferenceId, readAt: null } }),
    ]);
    const [pendingEventCount, failedEventCount, lastFailure, savedGroups, activeApplicationCount] = await Promise.all([
      this.db.studentWorkspaceEventInbox.count({where:{studentReferenceId,processedAt:null,failureCode:null}}),
      this.db.studentWorkspaceEventInbox.count({where:{studentReferenceId,processedAt:null,failureCode:{not:null}}}),
      this.db.studentWorkspaceEventInbox.findFirst({where:{studentReferenceId,processedAt:null,failureCode:{not:null}},orderBy:{receivedAt:'desc'},select:{failureCode:true}}),
      this.db.studentSavedItem.groupBy({by:['entityType'],where:{studentReferenceId},_count:{_all:true}}),
      this.db.studentApplicationTracker.count({where:{studentReferenceId,status:'ACTIVE'}}),
    ]);
    return {
      ...row,
      provisioningHealth: {
        state: failedEventCount > 0 ? 'FAILED' : pendingEventCount > 0 || row.status === StudentWorkspaceStatus.INITIALIZING ? 'PENDING' : 'HEALTHY',
        pendingEventCount,
        failedEventCount,
        lastEventAt: inbox[0]?.receivedAt ?? null,
        lastFailureCode: /^WORKSPACE_SYNC_BLOCKED_(SUSPENDED|ARCHIVED|INITIALIZING)$/.test(String(lastFailure?.failureCode ?? ''))
          ? lastFailure.failureCode : lastFailure?.failureCode ? 'STUDENT_SYNC_FAILURE' : null,
      },
      consentAudit: { hasDecision: Boolean(lastConsent), lastDecidedAt: lastConsent?.decidedAt ?? null },
      linkedSummaries: { activeCourseCount, certificateCount, unreadNotificationCount },
      savedSummary: savedGroups.map((group:{entityType:string;_count:{_all:number}})=>({entityType:group.entityType,count:group._count._all})),
      activeApplicationCount,
    };
  }

  public async findWorkspace(studentReferenceId: string): Promise<StudentWorkspaceDto | null> {
    const row = await this.db.studentWorkspace.findUnique({ where: { studentReferenceId } });
    return row ? this.workspace(row) : null;
  }

  public async upsertWorkspace(data: UpsertStudentWorkspaceDto): Promise<StudentWorkspaceDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.studentWorkspace.findUnique({
        where: { studentReferenceId: data.studentReferenceId },
      });
      if (!current) throw new Error('STUDENT_WORKSPACE_PROVISIONING_PENDING');
      if (current.status === StudentWorkspaceStatus.SUSPENDED) throw new Error('STUDENT_WORKSPACE_SUSPENDED');
      if (current.status === StudentWorkspaceStatus.ARCHIVED) throw new Error('STUDENT_WORKSPACE_ARCHIVED');
      if (current.status === StudentWorkspaceStatus.INITIALIZING) throw new Error('STUDENT_WORKSPACE_INITIALIZING');
      if (data.status !== undefined && data.status !== current.status) throw new Error('STUDENT_WORKSPACE_LIFECYCLE_EVENT_REQUIRED');
      if (data.privacyPreferences !== undefined) throw new Error('STUDENT_PRIVACY_CONSENT_COMMAND_REQUIRED');
      if (!Number.isSafeInteger(data.expectedVersion) || (data.expectedVersion ?? 0) <= 0)
        throw new Error('STUDENT_WORKSPACE_VERSION_REQUIRED');
      if (current.version !== data.expectedVersion)
        throw new Error('STUDENT_WORKSPACE_VERSION_CONFLICT');

      const { studentReferenceId: _reference, expectedVersion: _version, ...values } = data;
      const status = values.status ?? current.status;
      const row = await this.casWorkspaceUpdate(tx, current, {
        data: {
          ...values,
          layoutPreferences: json(values.layoutPreferences),
          notificationMatrix: json(values.notificationMatrix),
          accessibilityPreferences: json(values.accessibilityPreferences),
          metadata: json(values.metadata),
          version: { increment: 1 },
          lastActiveAt: new Date(),
          suspendedAt:
            status === StudentWorkspaceStatus.SUSPENDED
              ? (current.suspendedAt ?? new Date())
              : null,
          archivedAt:
            status === StudentWorkspaceStatus.ARCHIVED ? (current.archivedAt ?? new Date()) : null,
        },
      });
      await this.appendOutbox(tx, row.id, 'StudentWorkspaceUpdated', {
        studentReferenceId: row.studentReferenceId,
        version: row.version,
        status: row.status,
      });
      return this.workspace(row);
    });
  }

  public async updatePrivacyConsent(data: UpdateStudentPrivacyConsentDto): Promise<StudentPrivacyConsentDecisionDto> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, data.studentReferenceId);
      if (workspace.status === StudentWorkspaceStatus.INITIALIZING) throw new Error('STUDENT_WORKSPACE_INITIALIZING');
      if (workspace.version !== data.expectedVersion) throw new Error('STUDENT_WORKSPACE_VERSION_CONFLICT');
      const before = { ...DEFAULT_PRIVACY, ...(workspace.privacyPreferences ?? {}) };
      const after = { ...data.privacyPreferences };
      const changedFields = Object.keys(after).filter((key) => before[key as keyof typeof before] !== after[key as keyof typeof after]);
      const decisionId = randomUUID();
      const row = await this.casWorkspaceUpdate(tx, workspace, {
        data: { privacyPreferences: json(after), version: { increment: 1 }, lastActiveAt: new Date() },
      });
      const decidedAt = new Date();
      await tx.studentPrivacyConsentDecision.create({ data: {
        id: decisionId, studentReferenceId: data.studentReferenceId, workspaceVersion: row.version,
        actorId: data.actorId, actorType: data.actorType ?? 'USER', purpose: data.purpose,
        source: data.source ?? 'student-workspace-api', beforePreferences: json(before),
        afterPreferences: json(after), changedFields: json(changedFields), correlationId: data.correlationId ?? null, decidedAt,
      }});
      await this.appendOutbox(tx, workspace.id, 'StudentPrivacyConsentDecided', {
        studentReferenceId: data.studentReferenceId, decisionId, workspaceVersion: row.version, purpose: data.purpose,
        changedFields, correlationId: data.correlationId ?? null,
      }, { actorId: data.actorId, actorType: data.actorType ?? 'USER', source: data.source ?? 'student-workspace-api' });
      return { id: decisionId, studentReferenceId: data.studentReferenceId, workspaceVersion: row.version, actorId: data.actorId,
        actorType: data.actorType ?? 'USER', purpose: data.purpose, source: data.source ?? 'student-workspace-api',
        beforePreferences: before, afterPreferences: after, changedFields, decidedAt };
    });
  }

  public async getDashboardSummary(
    studentReferenceId: string,
  ): Promise<StudentDashboardSummaryDto | null> {
    const workspace = await this.db.studentWorkspace.findUnique({ where: { studentReferenceId } });
    if (!workspace) return null;
    if (workspace.status === StudentWorkspaceStatus.INITIALIZING) throw new Error('STUDENT_WORKSPACE_INITIALIZING');
    if (workspace.status === StudentWorkspaceStatus.ARCHIVED) throw new Error('STUDENT_WORKSPACE_ARCHIVED');
    const queries = await Promise.allSettled([
      this.db.studentSavedItem.findMany({
        where: { studentReferenceId },
        orderBy: { savedAt: 'desc' },
        take: 12,
      }),
      this.db.studentSavedCollection.findMany({
        where: { studentReferenceId },
        include: { _count: { select: { items: true } } },
        orderBy: { updatedAt: 'desc' },
      }),
      this.db.studentTimelineEntry.findMany({
        where: { studentReferenceId },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
      this.db.studentRecentActivity.findMany({
        where: { studentReferenceId },
        orderBy: { occurredAt: 'desc' },
        take: 12,
      }),
      this.db.studentLearningProjection.findMany({
        where: { studentReferenceId },
        orderBy: [{ lastAccessedAt: 'desc' }, { enrolledAt: 'desc' }],
        take: 20,
      }),
      this.db.studentCertificateReadProjection.findMany({
        where: { studentReferenceId },
        orderBy: { issuedAt: 'desc' },
        take: 12,
      }),
      this.db.studentNotificationProjection.findMany({
        where: { studentReferenceId },
        orderBy: { occurredAt: 'desc' },
        take: 20,
      }),
      this.db.studentRecentlyViewed.findMany({
        where: { studentReferenceId },
        orderBy: { viewedAt: 'desc' },
        take: 30,
      }),
      this.db.studentPersonalStatistics.findUnique({ where: { studentReferenceId } }),
    ]);

    const failures: string[] = [];
    const value = <T>(index: number, capability: string): T[] => {
      const result = queries[index];
      if (result.status === 'fulfilled') return result.value as T[];
      failures.push(capability);
      return [];
    };
    const savedItems = value<any>(0, 'savedItems');
    const collections = value<any>(1, 'collections');
    const timeline = value<any>(2, 'timeline');
    const recentActivity = value<any>(3, 'recentActivity');
    const enrollments = value<any>(4, 'courseEnrollments');
    const certificates = value<any>(5, 'certificates');
    const notifications = value<any>(6, 'notifications');
    const recentlyViewed = value<any>(7, 'recentlyViewed');
    const statsResult = queries[8];
    let statistics: StudentPersonalStatisticsDto;
    if (statsResult.status === 'fulfilled' && statsResult.value) {
      statistics = this.statistics(statsResult.value);
    } else {
      if (statsResult.status === 'rejected') failures.push('personalStatistics');
      statistics = await this.calculatePersonalStatistics(this.db, studentReferenceId);
    }
    const savedItemCount = statistics.savedItems;
    const activeCourseCount = statistics.activeCourses;
    const completedCourseCount = statistics.completedCourses;
    const certificateCount = statistics.certificates;
    const activeDisplayCourses = enrollments.filter((entry) => ['ACTIVE', 'IN_PROGRESS'].includes(entry.status));

    return {
      workspace: this.workspace(workspace),
      savedItems: savedItems.map((row) => this.savedItem(row)),
      collections: collections.map((row) => this.collection(row)),
      timeline,
      recentActivity,
      recentlyViewed,
      widgetRegistry: WIDGET_REGISTRY.map((entry) => ({ ...entry, supportedDevices: [...entry.supportedDevices] })),
      courseEnrollments: enrollments.map((row) => ({ ...row, enrollmentId: row.enrollmentId })),
      certificates,
      notifications,
      quickActions: this.quickActions(activeDisplayCourses, certificates, savedItemCount),
      statistics,
      certificateCount,
      activeCourseEnrollmentCount: activeCourseCount,
      completedCourseEnrollmentCount: completedCourseCount,
      capabilityStatus: {
        workspace: 'AVAILABLE',
        savedItems: failures.includes('savedItems') ? 'DEGRADED' : 'AVAILABLE',
        collections: failures.includes('collections') ? 'DEGRADED' : 'AVAILABLE',
        timeline: failures.includes('timeline') ? 'DEGRADED' : 'AVAILABLE',
        recentActivity: failures.includes('recentActivity') ? 'DEGRADED' : 'AVAILABLE',
        recentlyViewed: failures.includes('recentlyViewed') ? 'DEGRADED' : 'AVAILABLE',
        courseEnrollments: failures.includes('courseEnrollments') ? 'DEGRADED' : 'AVAILABLE',
        certificates: failures.includes('certificates') ? 'DEGRADED' : 'AVAILABLE',
        notifications: failures.includes('notifications') ? 'DEGRADED' : 'AVAILABLE',
        personalStatistics: failures.includes('personalStatistics') ? 'DEGRADED' : 'AVAILABLE',
        recommendations: 'NOT_CONFIGURED',
      },
      partialFailures: failures,
    };
  }

  public async saveItem(data: SaveStudentItemDto): Promise<StudentSavedItemDto> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, data.studentReferenceId);
      if (data.collectionId) {
        const collection = await tx.studentSavedCollection.findFirst({
          where: { id: data.collectionId, studentReferenceId: data.studentReferenceId },
        });
        if (!collection) throw new Error('STUDENT_COLLECTION_NOT_FOUND');
      }
      const row = await tx.studentSavedItem.upsert({
        where: {
          studentReferenceId_entityType_entityId: {
            studentReferenceId: data.studentReferenceId,
            entityType: data.entityType,
            entityId: data.entityId,
          },
        },
        create: { id: randomUUID(), ...data, metadata: json(data.metadata) },
        update: {
          collectionId: data.collectionId,
          entitySlug: data.entitySlug,
          displayName: data.displayName,
          notes: data.notes,
          metadata: json(data.metadata),
        },
      });
      await this.refreshPersonalStatistics(tx, data.studentReferenceId);
      await this.appendOutbox(tx, workspace.id, 'StudentSavedItemUpserted', {
        studentReferenceId: data.studentReferenceId,
        entityType: data.entityType,
        entityId: data.entityId,
      });
      return this.savedItem(row);
    });
  }

  public async removeSavedItem(
    studentReferenceId: string,
    entityType: any,
    entityId: string,
  ): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      await tx.studentSavedItem.deleteMany({ where: { studentReferenceId, entityType, entityId } });
      await this.refreshPersonalStatistics(tx, studentReferenceId);
      await this.appendOutbox(tx, workspace.id, 'StudentSavedItemRemoved', {
        studentReferenceId,
        entityType,
        entityId,
      });
    });
  }

  public async listSavedItems(studentReferenceId: string): Promise<StudentSavedItemDto[]> {
    return (
      await this.db.studentSavedItem.findMany({
        where: { studentReferenceId },
        orderBy: { savedAt: 'desc' },
      })
    ).map((row: any) => this.savedItem(row));
  }

  public async createCollection(data: {
    studentReferenceId: string;
    name: string;
    description?: string | null;
    color?: string | null;
    icon?: string | null;
  }): Promise<StudentSavedCollectionDto> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, data.studentReferenceId);
      const row = await tx.studentSavedCollection.create({
        data: { id: randomUUID(), ...data, type: StudentCollectionType.PERSONAL },
        include: { _count: { select: { items: true } } },
      });
      await this.appendOutbox(tx, workspace.id, 'StudentSavedCollectionCreated', {
        studentReferenceId: data.studentReferenceId,
        collectionId: row.id,
      });
      return this.collection(row);
    });
  }

  public async listCollections(studentReferenceId: string): Promise<StudentSavedCollectionDto[]> {
    return (
      await this.db.studentSavedCollection.findMany({
        where: { studentReferenceId },
        include: { _count: { select: { items: true } } },
        orderBy: { updatedAt: 'desc' },
      })
    ).map((row: any) => this.collection(row));
  }

  public async updateCollection(
    studentReferenceId: string,
    collectionId: string,
    data: { name?: string; description?: string | null; color?: string | null; icon?: string | null },
  ): Promise<StudentSavedCollectionDto> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      const current = await tx.studentSavedCollection.findFirst({ where: { id: collectionId, studentReferenceId } });
      if (!current) throw new Error('STUDENT_COLLECTION_NOT_FOUND');
      const row = await tx.studentSavedCollection.update({
        where: { id: collectionId }, data, include: { _count: { select: { items: true } } },
      });
      await this.appendOutbox(tx, workspace.id, 'StudentSavedCollectionUpdated', { studentReferenceId, collectionId });
      return this.collection(row);
    });
  }

  public async deleteCollection(studentReferenceId: string, collectionId: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      const collection = await tx.studentSavedCollection.findFirst({ where: { id: collectionId, studentReferenceId } });
      if (!collection) throw new Error('STUDENT_COLLECTION_NOT_FOUND');
      if (collection.type === StudentCollectionType.FAVORITES) throw new Error('STUDENT_FAVORITES_COLLECTION_IMMUTABLE');
      const favorite = await tx.studentSavedCollection.findFirst({ where: { studentReferenceId, type: StudentCollectionType.FAVORITES } });
      await tx.studentSavedItem.updateMany({ where: { collectionId }, data: { collectionId: favorite?.id ?? null } });
      await tx.studentSavedCollection.delete({ where: { id: collectionId } });
      await this.appendOutbox(tx, workspace.id, 'StudentSavedCollectionDeleted', { studentReferenceId, collectionId, movedToCollectionId: favorite?.id ?? null });
    });
  }

  public async moveSavedItem(
    studentReferenceId: string,
    itemId: string,
    collectionId: string | null,
  ): Promise<StudentSavedItemDto> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      const item = await tx.studentSavedItem.findFirst({ where: { id: itemId, studentReferenceId } });
      if (!item) throw new Error('STUDENT_SAVED_ITEM_NOT_FOUND');
      if (collectionId) {
        const target = await tx.studentSavedCollection.findFirst({ where: { id: collectionId, studentReferenceId } });
        if (!target) throw new Error('STUDENT_COLLECTION_NOT_FOUND');
      }
      const row = await tx.studentSavedItem.update({ where: { id: itemId }, data: { collectionId } });
      await this.appendOutbox(tx, workspace.id, 'StudentSavedItemMoved', { studentReferenceId, itemId, collectionId });
      return this.savedItem(row);
    });
  }

  public async appendActivity(
    data: Omit<StudentRecentActivityDto, 'id' | 'occurredAt'>,
  ): Promise<StudentRecentActivityDto> {
    return this.db.$transaction(async (tx: any) => {
      await this.requireWritable(tx, data.studentReferenceId);
      const row = await tx.studentRecentActivity.create({
        data: { id: randomUUID(), ...data, metadata: json(data.metadata) },
      });
      const overflow = await tx.studentRecentActivity.findMany({
        where: { studentReferenceId: data.studentReferenceId },
        orderBy: { occurredAt: 'desc' },
        skip: 50,
        select: { id: true },
      });
      if (overflow.length) {
        await tx.studentRecentActivity.deleteMany({
          where: { id: { in: overflow.map((entry: any) => entry.id) } },
        });
      }
      return row;
    });
  }

  public async appendTimeline(
    data: Omit<StudentTimelineEntryDto, 'id' | 'occurredAt'>,
  ): Promise<StudentTimelineEntryDto> {
    return this.db.$transaction(async (tx: any) => {
      await this.requireWritable(tx, data.studentReferenceId);
      return tx.studentTimelineEntry.create({ data: { id: randomUUID(), ...data, metadata: json(data.metadata) } });
    });
  }

  public async recordSearch(studentReferenceId: string, query: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      const privacy = (workspace.privacyPreferences ?? DEFAULT_PRIVACY) as typeof DEFAULT_PRIVACY;
      if (!privacy.retainSearchHistory) return;
      await tx.studentSearchHistory.create({
        data: {
          id: randomUUID(),
          studentReferenceId,
          query,
          normalizedQuery: query.trim().toLocaleLowerCase('ar'),
        },
      });
      const overflow = await tx.studentSearchHistory.findMany({
        where: { studentReferenceId },
        orderBy: { searchedAt: 'desc' },
        skip: 25,
        select: { id: true },
      });
      if (overflow.length) {
        await tx.studentSearchHistory.deleteMany({
          where: { id: { in: overflow.map((entry: any) => entry.id) } },
        });
      }
    });
  }

  public async clearSearchHistory(studentReferenceId: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      await tx.studentSearchHistory.deleteMany({ where: { studentReferenceId } });
      await this.appendOutbox(tx, workspace.id, 'StudentSearchHistoryCleared', { studentReferenceId });
    });
  }

  public async recordRecentlyViewed(data: {
    studentReferenceId: string;
    entityType: any;
    entityId: string;
    entitySlug?: string | null;
  }): Promise<StudentRecentlyViewedDto | null> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, data.studentReferenceId);
      const privacy = (workspace.privacyPreferences ?? DEFAULT_PRIVACY) as typeof DEFAULT_PRIVACY;
      if (!privacy.allowProductAnalytics) return null;
      const row = await tx.studentRecentlyViewed.upsert({
        where: { studentReferenceId_entityType_entityId: { studentReferenceId: data.studentReferenceId, entityType: data.entityType, entityId: data.entityId } },
        create: { id: randomUUID(), ...data }, update: { entitySlug: data.entitySlug, viewedAt: new Date() },
      });
      const overflow = await tx.studentRecentlyViewed.findMany({ where: { studentReferenceId: data.studentReferenceId }, orderBy: { viewedAt: 'desc' }, skip: 30, select: { id: true } });
      if (overflow.length) await tx.studentRecentlyViewed.deleteMany({ where: { id: { in: overflow.map((entry: any) => entry.id) } } });
      return row;
    });
  }

  public async listRecentlyViewed(studentReferenceId: string): Promise<StudentRecentlyViewedDto[]> {
    return this.db.studentRecentlyViewed.findMany({ where: { studentReferenceId }, orderBy: { viewedAt: 'desc' }, take: 30 });
  }

  public async clearRecentlyViewed(studentReferenceId: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      await tx.studentRecentlyViewed.deleteMany({ where: { studentReferenceId } });
      await this.appendOutbox(tx, workspace.id, 'StudentRecentlyViewedCleared', { studentReferenceId });
    });
  }

  public async createSnapshot(
    studentReferenceId: string,
    label?: string | null,
  ): Promise<{ id: string; createdAt: Date }> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      if (workspace.status === StudentWorkspaceStatus.INITIALIZING) throw new Error('STUDENT_WORKSPACE_INITIALIZING');
      const row = await tx.studentWorkspaceSnapshot.create({
        data: {
          id: randomUUID(), studentReferenceId, label, workspaceVersion: workspace.version,
          configuration: json({
            layoutPreferences: workspace.layoutPreferences, notificationMatrix: workspace.notificationMatrix,
            accessibilityPreferences: workspace.accessibilityPreferences, theme: workspace.theme,
            preferredLanguage: workspace.preferredLanguage, timezone: workspace.timezone,
          })!,
        },
      });
      await this.appendOutbox(tx, workspace.id, 'StudentWorkspaceSnapshotCreated', { studentReferenceId, snapshotId: row.id, workspaceVersion: workspace.version });
      return { id: row.id, createdAt: row.createdAt };
    });
  }

  public async listSnapshots(studentReferenceId: string): Promise<StudentWorkspaceSnapshotDto[]> {
    return this.db.studentWorkspaceSnapshot.findMany({
      where: { studentReferenceId }, select: { id: true, studentReferenceId: true, label: true, workspaceVersion: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 30,
    });
  }

  public async restoreSnapshot(studentReferenceId: string, snapshotId: string, expectedVersion: number): Promise<StudentWorkspaceDto> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      if (workspace.version !== expectedVersion) throw new Error('STUDENT_WORKSPACE_VERSION_CONFLICT');
      const snapshot = await tx.studentWorkspaceSnapshot.findFirst({ where: { id: snapshotId, studentReferenceId } });
      if (!snapshot) throw new Error('STUDENT_SNAPSHOT_NOT_FOUND');
      const configuration = snapshot.configuration as Record<string, unknown>;
      const row = await this.casWorkspaceUpdate(tx, workspace, {
        data: {
          layoutPreferences: configuration.layoutPreferences === undefined ? undefined : json(configuration.layoutPreferences),
          notificationMatrix: configuration.notificationMatrix === undefined ? undefined : json(configuration.notificationMatrix),
          accessibilityPreferences: configuration.accessibilityPreferences === undefined ? undefined : json(configuration.accessibilityPreferences),
          theme: typeof configuration.theme === 'string' ? configuration.theme : undefined,
          preferredLanguage: typeof configuration.preferredLanguage === 'string' ? configuration.preferredLanguage : undefined,
          timezone: typeof configuration.timezone === 'string' ? configuration.timezone : undefined,
          version: { increment: 1 },
        },
      });
      await this.appendOutbox(tx, workspace.id, 'StudentWorkspaceSnapshotRestored', { studentReferenceId, snapshotId, version: row.version });
      return this.workspace(row);
    });
  }

  public async resetLayout(studentReferenceId: string, expectedVersion: number, supportActor?: { actorId: string; reason: string; correlationId?: string }): Promise<StudentWorkspaceDto> {
    return this.db.$transaction(async (tx: any) => {
      const workspace = await this.requireWritable(tx, studentReferenceId);
      if (workspace.version !== expectedVersion) throw new Error('STUDENT_WORKSPACE_VERSION_CONFLICT');
      const row = await this.casWorkspaceUpdate(tx, workspace, { data: { layoutPreferences: json(DEFAULT_LAYOUT), version: { increment: 1 } } });
      await this.appendOutbox(tx, workspace.id, 'StudentDashboardLayoutReset', { studentReferenceId, version: row.version },
        supportActor ? { actorId: supportActor.actorId, actorType: 'USER', source: 'admin-student-support', reason: supportActor.reason, correlationId: supportActor.correlationId } : undefined);
      return this.workspace(row);
    });
  }

  public async ingestIntegrationEvent(
    event: StudentWorkspaceIntegrationEventDto,
  ): Promise<boolean> {
    return this.db.$transaction(async (tx: any) => {
      const duplicate = await tx.studentWorkspaceEventInbox.findUnique({ where: { eventId: event.eventId } });
      if (duplicate) return false;
      let workspace = await tx.studentWorkspace.findUnique({ where: { studentReferenceId: event.studentReferenceId } });
      const systemActor: StudentAuditActor = { actorId: `event:${event.sourceDomain}`, actorType: 'SYSTEM', source: event.sourceDomain, sourceEventId: event.eventId };

      if (!workspace && event.eventType === 'StudentIdentityCreated') {
        workspace = await tx.studentWorkspace.create({ data: {
          studentReferenceId: event.studentReferenceId, status: StudentWorkspaceStatus.INITIALIZING,
          preferredLanguage: 'ar', timezone: 'Asia/Aden', theme: 'SYSTEM',
          layoutPreferences: json(DEFAULT_LAYOUT), notificationMatrix: json(DEFAULT_NOTIFICATIONS),
          privacyPreferences: json(DEFAULT_PRIVACY), accessibilityPreferences: json(DEFAULT_ACCESSIBILITY),
        }});
        await tx.studentSavedCollection.create({ data: { id: randomUUID(), studentReferenceId: event.studentReferenceId, name: 'المفضلة', description: 'العناصر التي تريد الرجوع إليها بسرعة', type: StudentCollectionType.FAVORITES, color: '#087A55', icon: 'bookmark' }});
        await tx.studentPersonalStatistics.create({ data: { studentReferenceId: event.studentReferenceId } });
        await this.appendOutbox(tx, workspace.id, 'StudentWorkspaceInitializing', { studentReferenceId: event.studentReferenceId, sourceEventId: event.eventId, status: StudentWorkspaceStatus.INITIALIZING }, systemActor);
        workspace = await tx.studentWorkspace.update({ where: { id: workspace.id }, data: { status: StudentWorkspaceStatus.ACTIVE, version: { increment: 1 }, lastActiveAt: new Date() } });
        await this.appendOutbox(tx, workspace.id, 'StudentWorkspaceActivated', { studentReferenceId: event.studentReferenceId, sourceEventId: event.eventId, status: StudentWorkspaceStatus.ACTIVE, initializedFromEventId: event.eventId }, systemActor);
      }
      if (!workspace) throw new Error('STUDENT_WORKSPACE_NOT_FOUND');

      if (event.eventType === 'StudentIdentityActivated' && workspace.status === StudentWorkspaceStatus.SUSPENDED) {
        workspace = await tx.studentWorkspace.update({ where: { id: workspace.id }, data: {
          status: StudentWorkspaceStatus.ACTIVE, suspendedAt: null, version: { increment: 1 },
        } });
        await this.appendOutbox(tx, workspace.id, 'StudentWorkspaceActivated',
          { studentReferenceId: event.studentReferenceId, sourceEventId: event.eventId }, systemActor);
      }

      if (event.eventType === 'StudentIdentitySuspended' || event.eventType === 'StudentIdentityArchived') {
        const nextStatus = event.eventType === 'StudentIdentitySuspended' ? StudentWorkspaceStatus.SUSPENDED : StudentWorkspaceStatus.ARCHIVED;
        if (workspace.status !== StudentWorkspaceStatus.ARCHIVED && workspace.status !== nextStatus) {
          workspace = await tx.studentWorkspace.update({ where: { id: workspace.id }, data: {
            status: nextStatus, version: { increment: 1 },
            suspendedAt: nextStatus === StudentWorkspaceStatus.SUSPENDED ? (workspace.suspendedAt ?? event.occurredAt) : workspace.suspendedAt,
            archivedAt: nextStatus === StudentWorkspaceStatus.ARCHIVED ? (workspace.archivedAt ?? event.occurredAt) : null,
          }});
          await this.appendOutbox(tx, workspace.id, event.eventType === 'StudentIdentitySuspended' ? 'StudentWorkspaceSuspended' : 'StudentWorkspaceArchived',
            { studentReferenceId: event.studentReferenceId, sourceEventId: event.eventId, status: nextStatus }, systemActor);
        }
      }

      const inboxId = randomUUID();
      const syncBlocked = !['StudentIdentityCreated', 'StudentIdentityActivated', 'StudentIdentitySuspended', 'StudentIdentityArchived'].includes(event.eventType) &&
        (workspace.status === StudentWorkspaceStatus.SUSPENDED || workspace.status === StudentWorkspaceStatus.ARCHIVED || workspace.status === StudentWorkspaceStatus.INITIALIZING);
      await tx.studentWorkspaceEventInbox.create({ data: {
        id: inboxId, eventId: event.eventId, studentReferenceId: event.studentReferenceId, sourceDomain: event.sourceDomain,
        eventType: event.eventType, payload: json(event),
        processedAt: syncBlocked ? (workspace.status === StudentWorkspaceStatus.ARCHIVED ? new Date() : null) : new Date(),
        failureCode: syncBlocked ? `WORKSPACE_SYNC_BLOCKED_${workspace.status}` : null,
      }});
      if (syncBlocked) return false;

      await this.projectStudentEvent(tx, event);
      return true;
    });
  }

  private async projectStudentEvent(tx:any,event:StudentWorkspaceIntegrationEventDto):Promise<void> {
    await tx.studentTimelineEntry.create({data:{
      id:randomUUID(),studentReferenceId:event.studentReferenceId,eventType:event.eventType,title:event.title,
      description:event.description,sourceDomain:event.sourceDomain,sourceReferenceId:event.sourceReferenceId,
      metadata:json({...event.metadata,sourceEventId:event.eventId}),occurredAt:event.occurredAt,
    }});
    if (['StudentIdentityCreated','StudentIdentityActivated','StudentIdentitySuspended','StudentIdentityArchived'].includes(event.eventType)) return;
    await this.projectIntegrationEvent(tx,event);
    if (event.notification) {
      await tx.studentNotificationProjection.upsert({
        where:{sourceEventId:event.eventId},
        create:{id:randomUUID(),studentReferenceId:event.studentReferenceId,
          category:event.notification.category,title:event.notification.title,message:event.notification.message,
          actionUrl:event.notification.actionUrl,sourceEventId:event.eventId,occurredAt:event.occurredAt},
        update:{category:event.notification.category,title:event.notification.title,message:event.notification.message,
          actionUrl:event.notification.actionUrl},
      });
    }
    await this.refreshPersonalStatistics(tx,event.studentReferenceId);
  }

  public async replayParkedEvents(limit = 25): Promise<{processed:number;failed:number}> {
    const batchSize = Math.min(25, Math.max(1, Math.trunc(limit)));
    const parked = await this.db.studentWorkspaceEventInbox.findMany({
      where: {
        processedAt: null,
        failureCode: 'WORKSPACE_SYNC_BLOCKED_SUSPENDED',
        workspace: { status: StudentWorkspaceStatus.ACTIVE },
      },
      orderBy: [{receivedAt:'asc'},{id:'asc'}],
      take: batchSize,
      select: {id:true,eventId:true,studentReferenceId:true,sourceDomain:true,eventType:true,payload:true},
    });
    let processed = 0;
    let failed = 0;
    for (const row of parked) {
      try {
        const changed = await this.db.$transaction(async (tx:any) => {
          // A scoped CAS lease inside the transaction prevents duplicate timeline creation
          // when two recovery workers select the same parked event.
          const claimed = await tx.studentWorkspaceEventInbox.updateMany({
            where: { id: row.id, processedAt: null, failureCode: 'WORKSPACE_SYNC_BLOCKED_SUSPENDED' },
            data: { processedAt: new Date(), failureCode: null },
          });
          if (claimed.count !== 1) return false;
          const workspace = await tx.studentWorkspace.findUnique({
            where: { studentReferenceId: row.studentReferenceId }, select: { status: true },
          });
          if (workspace?.status !== StudentWorkspaceStatus.ACTIVE) throw new Error('STUDENT_REPLAY_WORKSPACE_NOT_ACTIVE');
          const payload = row.payload as Record<string,unknown>;
          const occurredAt = new Date(String(payload?.occurredAt ?? ''));
          const supported:Record<string,readonly string[]> = {
            COURSES:['CourseEnrolled','CourseProgressUpdated','CourseCompleted'],
            CERTIFICATES:['CertificateIssued','CertificateRevoked','CertificateReissued','CertificateRenewed','CertificateExpired','CertificateArtifactsRendered'],
          };
          if (payload?.eventId !== row.eventId || payload.studentReferenceId !== row.studentReferenceId ||
              payload.sourceDomain !== row.sourceDomain || payload.eventType !== row.eventType ||
              !supported[row.sourceDomain]?.includes(row.eventType) || !Number.isFinite(occurredAt.getTime()))
            throw new Error('STUDENT_REPLAY_ENVELOPE_INVALID');
          const event = { ...payload, occurredAt } as unknown as StudentWorkspaceIntegrationEventDto;
          await this.projectStudentEvent(tx, event);
          return true;
        });
        if (changed) processed += 1;
      } catch {
        // Do not leak raw event payload or retry a poison event forever.
        // Preserve the parked row for authorized operator reconciliation.
        failed += 1;
        await this.db.studentWorkspaceEventInbox.updateMany({
          where: { id: row.id, processedAt: null, failureCode: 'WORKSPACE_SYNC_BLOCKED_SUSPENDED' },
          data: { failureCode: 'WORKSPACE_REPLAY_FAILED' },
        });
      }
    }
    return {processed,failed};
  }

  public async markNotificationRead(studentReferenceId: string, notificationId: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      await this.requireWritable(tx, studentReferenceId);
      const notification = await tx.studentNotificationProjection.findFirst({ where: { id: notificationId, studentReferenceId } });
      if (!notification) throw new Error('STUDENT_NOTIFICATION_NOT_FOUND');
      await tx.studentNotificationProjection.updateMany({ where: { id: notificationId, studentReferenceId, readAt: null }, data: { readAt: new Date() } });
      await this.refreshPersonalStatistics(tx, studentReferenceId);
    });
  }

  private async casWorkspaceUpdate(tx: any, workspace: any, input: { data: Record<string, unknown> }): Promise<any> {
    // The predicate is evaluated by the database under the same transaction as audit/outbox.
    const result = await tx.studentWorkspace.updateMany({
      where: { id: workspace.id, version: workspace.version, status: workspace.status },
      data: input.data,
    });
    if (result.count !== 1) throw new Error('STUDENT_WORKSPACE_VERSION_CONFLICT');
    return tx.studentWorkspace.findUnique({ where: { id: workspace.id } });
  }

  private async requireWritable(tx: any, studentReferenceId: string): Promise<any> {
    const workspace = await tx.studentWorkspace.findUnique({ where: { studentReferenceId } });
    if (!workspace) throw new Error('STUDENT_WORKSPACE_NOT_FOUND');
    if (workspace.status === StudentWorkspaceStatus.SUSPENDED)
      throw new Error('STUDENT_WORKSPACE_SUSPENDED');
    if (workspace.status === StudentWorkspaceStatus.ARCHIVED)
      throw new Error('STUDENT_WORKSPACE_ARCHIVED');
    return workspace;
  }

  private async appendOutbox(
    tx: any, workspaceId: string, eventType: string, payload: Record<string, unknown>, actor?: StudentAuditActor,
  ): Promise<void> {
    const principal: StudentAuditActor = actor ?? {
      actorId: String(payload.studentReferenceId ?? 'system'), actorType: 'USER', source: 'student-workspace-command',
    };
    const auditId = randomUUID();
    const enrichedPayload = { ...payload, auditActorType: principal.actorType, auditSource: principal.source, sourceEventId: principal.sourceEventId ?? payload.sourceEventId ?? null };
    await tx.auditRecord.create({ data: {
      id: auditId, reference: `student-audit-${auditId}`, action: eventType, category: 'STUDENT_WORKSPACE',
      severity: eventType.includes('Archived') || eventType.includes('Suspended') ? 'HIGH' : 'INFO', actorId: principal.actorId, actorType: principal.actorType,
      targetId: workspaceId, targetType: 'StudentWorkspace', source: principal.source, timestamp: new Date(), contextMetadata: json({ ...enrichedPayload, ...(principal.reason ? { supportReason: principal.reason } : {}), ...(principal.correlationId ? { correlationId: principal.correlationId } : {}) }),
    }});
    await tx.transactionalOutboxRecord.create({ data: {
      id: randomUUID(), eventType, domain: 'STUDENT_WORKSPACE', aggregateType: 'StudentWorkspace', aggregateId: workspaceId,
      payload: json(enrichedPayload), metadata: json({ sourcePhase: 'Phase15', schemaVersion: '2.0', actorType: principal.actorType, source: principal.source }),
    }});
  }

  private async projectIntegrationEvent(tx: any, event: StudentWorkspaceIntegrationEventDto): Promise<void> {
    const metadata = event.metadata ?? {};
    if (['CourseEnrolled', 'CourseProgressUpdated', 'CourseCompleted'].includes(event.eventType)) {
      const enrollmentId = String(metadata.enrollmentId ?? event.sourceReferenceId ?? '');
      const courseId = String(metadata.courseId ?? '');
      if (enrollmentId && courseId) {
        await tx.studentLearningProjection.upsert({
          where: { studentReferenceId_enrollmentId: { studentReferenceId: event.studentReferenceId, enrollmentId } },
          create: {
            id: randomUUID(), studentReferenceId: event.studentReferenceId, enrollmentId, courseId,
            courseSlug: String(metadata.courseSlug ?? courseId), courseName: String(metadata.courseName ?? event.title),
            status: String(metadata.status ?? (event.eventType === 'CourseCompleted' ? 'COMPLETED' : 'ACTIVE')),
            progressPercentage: Number(metadata.progressPercentage ?? (event.eventType === 'CourseCompleted' ? 100 : 0)),
            enrolledAt: new Date(String(metadata.enrolledAt ?? event.occurredAt)),
            lastAccessedAt: metadata.lastAccessedAt ? new Date(String(metadata.lastAccessedAt)) : null,
            completedAt: event.eventType === 'CourseCompleted' ? event.occurredAt : null,
            sourceEventId: event.eventId,
          },
          update: {
            courseSlug: String(metadata.courseSlug ?? courseId), courseName: String(metadata.courseName ?? event.title),
            status: String(metadata.status ?? (event.eventType === 'CourseCompleted' ? 'COMPLETED' : 'ACTIVE')),
            progressPercentage: Number(metadata.progressPercentage ?? (event.eventType === 'CourseCompleted' ? 100 : 0)),
            lastAccessedAt: metadata.lastAccessedAt ? new Date(String(metadata.lastAccessedAt)) : undefined,
            completedAt: event.eventType === 'CourseCompleted' ? event.occurredAt : undefined, sourceEventId: event.eventId,
          },
        });
      }
    }
    if (['CertificateIssued', 'CertificateRevoked', 'CertificateReissued', 'CertificateRenewed', 'CertificateExpired', 'CertificateArtifactsRendered'].includes(event.eventType)) {
      const certificateId = String(metadata.certificateId ?? event.sourceReferenceId ?? '');
      if (!certificateId) throw new Error('STUDENT_CERTIFICATE_REFERENCE_REQUIRED');
      const key = { studentReferenceId: event.studentReferenceId, certificateId };
      const current = await tx.studentCertificateReadProjection.findUnique({
        where: { studentReferenceId_certificateId: key },
      });
      // An artifact event is not a lifecycle statement. Do not construct a phantom
      // certificate projection if its issued event has not arrived yet.
      if (event.eventType === 'CertificateArtifactsRendered' && !current)
        throw new Error('STUDENT_CERTIFICATE_PROJECTION_PENDING');
      // Ordering derives from the original owner event stored in the idempotent inbox,
      // not from the local projection update timestamp. A late issued event may not revive a revoked certificate.
      if (current) {
        const previous = await tx.studentWorkspaceEventInbox.findUnique({ where: { eventId: current.sourceEventId } });
        const priorOccurredAt = new Date(String((previous?.payload as any)?.occurredAt ?? current.updatedAt));
        const incoming = event.occurredAt.getTime();
        const prior = priorOccurredAt.getTime();
        const rank = (kind: string) => kind === 'CertificateRevoked' ? 4 :
          kind === 'CertificateReissued' || kind === 'CertificateExpired' ? 3 :
          kind === 'CertificateArtifactsRendered' ? 2 :
          kind === 'CertificateRenewed' ? 1 : 0;
        if (Number.isFinite(prior) && (incoming < prior ||
          (incoming === prior && rank(event.eventType) < rank(String(previous?.eventType ?? ''))))) return;
      }
      if (event.eventType === 'CertificateArtifactsRendered') {
        await tx.studentCertificateReadProjection.updateMany({
          where: { ...key },
          data: {
            ...(metadata.certificatePdfAssetId ? { certificatePdfAssetId: String(metadata.certificatePdfAssetId) } : {}),
            ...(metadata.previewImageAssetId ? { previewImageAssetId: String(metadata.previewImageAssetId) } : {}),
            sourceEventId: event.eventId,
          },
        });
        return;
      }
      const status = event.eventType === 'CertificateRevoked' ? 'REVOKED' :
        event.eventType === 'CertificateExpired' ? 'EXPIRED' :
        event.eventType === 'CertificateRenewed' ? 'ACTIVE' :
        String(metadata.status ?? 'ACTIVE');
      if (!['ACTIVE', 'ISSUED', 'REVOKED', 'EXPIRED', 'REISSUED', 'PENDING', 'SUSPENDED'].includes(status))
        throw new Error('STUDENT_CERTIFICATE_STATUS_INVALID');
      await tx.studentCertificateReadProjection.upsert({
        where: { studentReferenceId_certificateId: key },
        create: {
          id: randomUUID(), ...key,
          publicId: String(metadata.publicId ?? certificateId),
          serialNumber: String(metadata.serialNumber ?? certificateId),
          verificationCode: String(metadata.verificationCode ?? ''),
          status,
          courseDisplayName: String(metadata.courseDisplayName ?? 'شهادة'),
          issuedAt: new Date(String(metadata.issuedAt ?? event.occurredAt)),
          expiresAt: metadata.expiresAt ? new Date(String(metadata.expiresAt)) : null,
          certificatePdfAssetId: metadata.certificatePdfAssetId ? String(metadata.certificatePdfAssetId) : null,
          previewImageAssetId: metadata.previewImageAssetId ? String(metadata.previewImageAssetId) : null,
          sourceEventId: event.eventId,
        },
        update: {
          status, sourceEventId: event.eventId,
          ...(metadata.certificatePdfAssetId ? { certificatePdfAssetId: String(metadata.certificatePdfAssetId) } : {}),
          ...(metadata.previewImageAssetId ? { previewImageAssetId: String(metadata.previewImageAssetId) } : {}),
        },
      });
      if (event.eventType === 'CertificateReissued' && metadata.replacesCertificateId) {
        await tx.studentCertificateReadProjection.updateMany({
          where: { studentReferenceId: event.studentReferenceId, certificateId: String(metadata.replacesCertificateId) },
          data: { status: 'REISSUED', sourceEventId: event.eventId },
        });
      }
    }
  }

  private async calculatePersonalStatistics(tx: any, studentReferenceId: string): Promise<StudentPersonalStatisticsDto> {
    const [savedItems, activeCourses, completedCourses, average, certificates, unreadNotifications] = await Promise.all([
      tx.studentSavedItem.count({ where: { studentReferenceId } }),
      tx.studentLearningProjection.count({ where: { studentReferenceId, status: { in: ['ACTIVE', 'IN_PROGRESS'] } } }),
      tx.studentLearningProjection.count({ where: { studentReferenceId, status: 'COMPLETED' } }),
      tx.studentLearningProjection.aggregate({ where: { studentReferenceId }, _avg: { progressPercentage: true } }),
      tx.studentCertificateReadProjection.count({ where: { studentReferenceId } }),
      tx.studentNotificationProjection.count({ where: { studentReferenceId, readAt: null } }),
    ]);
    return { savedItems, activeCourses, completedCourses, averageCourseProgress: Math.round(average?._avg?.progressPercentage ?? 0), certificates, unreadNotifications };
  }

  private async refreshPersonalStatistics(tx: any, studentReferenceId: string): Promise<StudentPersonalStatisticsDto> {
    const statistics = await this.calculatePersonalStatistics(tx, studentReferenceId);
    await tx.studentPersonalStatistics.upsert({ where: { studentReferenceId }, create: { studentReferenceId, ...statistics }, update: statistics });
    return statistics;
  }

  private statistics(row: any): StudentPersonalStatisticsDto {
    return { savedItems: row.savedItems, activeCourses: row.activeCourses, completedCourses: row.completedCourses,
      averageCourseProgress: row.averageCourseProgress, certificates: row.certificates, unreadNotifications: row.unreadNotifications };
  }

  private quickActions(enrollments: any[], certificates: any[], savedItemCount: number): any[] {
    const actions: any[] = [];
    const nextCourse = enrollments[0];
    if (nextCourse) {
      actions.push({
        id: `continue-${nextCourse.enrollmentId ?? nextCourse.id}`,
        label: 'متابعة التعلم',
        description: `أكمل ${nextCourse.courseName}`,
        href: `/courses/${nextCourse.courseSlug}`,
        priority: 100,
        kind: 'LEARNING',
      });
    }
    if (certificates.length) {
      actions.push({
        id: 'view-certificates',
        label: 'عرض شهاداتي',
        description: `لديك ${certificates.length} شهادة في خزنتك`,
        href: '/student?tab=vault#certificates',
        priority: 80,
        kind: 'CERTIFICATE',
      });
    }
    actions.push({
      id: 'discover-scholarships',
      label: 'استكشف المنح',
      description: savedItemCount ? 'أضف فرصًا جديدة إلى محفوظاتك' : 'ابدأ ببناء قائمة فرصك',
      href: '/scholarships',
      priority: 60,
      kind: 'DISCOVERY',
    });
    return actions;
  }

  private workspace(row: any): StudentWorkspaceDto {
    return {
      ...row,
      status: row.status as StudentWorkspaceStatus,
      layoutPreferences: row.layoutPreferences as Record<string, unknown> | null,
      notificationMatrix: row.notificationMatrix,
      privacyPreferences: row.privacyPreferences,
      accessibilityPreferences: row.accessibilityPreferences,
      metadata: row.metadata as Record<string, unknown> | null,
    };
  }

  private savedItem(row: any): StudentSavedItemDto {
    return { ...row, metadata: row.metadata as Record<string, unknown> | null };
  }

  private collection(row: any): StudentSavedCollectionDto {
    const { _count, ...collection } = row;
    return { ...collection, itemCount: _count?.items ?? 0 };
  }
}
