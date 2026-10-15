import { randomUUID } from 'node:crypto';
import {Prisma,type PrismaClient} from '@prisma/client';
import { StudentSupportCursorCodec } from './StudentSupportCursorCodec';
import {
  CreateStudentApplicationTrackerDto,
  IStudentApplicationTrackerRepository,
  StudentApplicationTrackerDto,
  UpdateStudentApplicationTrackerDto,
  StudentSupportApplicationTrackerPage,
  StudentSupportTrackerHistoryPage,
} from '@manaratak/domain';

export class PrismaStudentApplicationTrackerRepository implements IStudentApplicationTrackerRepository {
  constructor(
    private readonly prisma: PrismaClient,
    private readonly cursorSigningSecret?: string,
  ) {}
  private get db(): any {
    return this.prisma as any;
  }
  private include = { checklist: { orderBy: { position: 'asc' } } } as const;

  async create(data: CreateStudentApplicationTrackerDto): Promise<StudentApplicationTrackerDto> {
    const labels = (data.checklistLabels ?? [])
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 25);
    try {
      return await this.db.$transaction(async (tx: any) => {
        if (!data.cycleReferenceId || data.cycleReferenceId === 'LEGACY' || !data.ownerSnapshot)
          throw new Error('STUDENT_CANONICAL_CYCLE_REQUIRED');
        const key = {
          studentReferenceId: data.studentReferenceId,
          scholarshipId: data.scholarshipId,
          cycleReferenceId: data.cycleReferenceId,
        };
        const existing = await tx.studentApplicationTracker.findUnique({
          where: { studentReferenceId_scholarshipId_cycleReferenceId: key },
        });
        if (existing)
          return this.dto(
            await tx.studentApplicationTracker.findUnique({
              where: { id: existing.id },
              include: this.include,
            }),
          );
        const row = await tx.studentApplicationTracker.create({
          data: {
            ...key,
            ownerSnapshot: data.ownerSnapshot,
            scholarshipSlug: data.scholarshipSlug ?? null,
            stage: data.stage ?? 'PREPARING_DOCUMENTS',
            notes: data.notes ?? null,
            deadlineAt: data.deadlineAt ?? null,
            checklist: { create: labels.map((label, position) => ({ label, position })) },
          },
          include: this.include,
        });
        await this.queueReminder(tx, row, null);
        return this.dto(row);
      });
    } catch (error) {
      if ((error as { code?: string }).code !== 'P2002') throw error;
      const replay = await this.db.studentApplicationTracker.findUnique({
        where: {
          studentReferenceId_scholarshipId_cycleReferenceId: {
            studentReferenceId: data.studentReferenceId,
            scholarshipId: data.scholarshipId,
            cycleReferenceId: data.cycleReferenceId,
          },
        },
        include: this.include,
      });
      if (!replay) throw error;
      return this.dto(replay);
    }
  }
  async purgeExpiredDocumentBindings(limit = 50): Promise<number> {
    const rows = await this.db.studentApplicationDocumentBinding.findMany({
      where: { retentionUntil: { lte: new Date() } },
      orderBy: [{ retentionUntil: 'asc' }, { id: 'asc' }],
      take: Math.min(100, Math.max(1, Math.trunc(limit))),
      select: { id: true },
    });
    if (!rows.length) return 0;
    const result = await this.db.studentApplicationDocumentBinding.deleteMany({
      where: {
        id: { in: rows.map((row: { id: string }) => row.id) },
        retentionUntil: { lte: new Date() },
      },
    });
    return result.count;
  }
  async removeDocumentBinding(
    studentReferenceId: string,
    trackerId: string,
    requirementId: string,
    expectedVersion: number,
  ): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const tracker = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
      });
      if (!tracker) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
      if (tracker.version !== expectedVersion)
        throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      const changed = await tx.studentApplicationTracker.updateMany({
        where: {
          id: trackerId,
          studentReferenceId,
          version: expectedVersion,
          status: tracker.status,
        },
        data: { version: { increment: 1 } },
      });
      if (changed.count !== 1) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      await tx.studentApplicationDocumentBinding.deleteMany({
        where: { trackerId, requirementId },
      });
      const fresh = await tx.studentApplicationTracker.findUnique({
        where: { id: trackerId },
        include: this.include,
      });
      await this.queueReminder(
        tx,
        fresh,
        tracker.version,
        undefined,
        'StudentApplicationDocumentUnlinked',
      );
    });
  }
  async setDocumentReviewConsent(studentReferenceId:string,trackerId:string,requirementId:string,expectedVersion:number,granted:boolean){
    return this.db.$transaction(async(tx:any)=>{
      const tracker=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId},include:{workspace:{select:{status:true}}}});
      const binding=tracker?await tx.studentApplicationDocumentBinding.findUnique({where:{trackerId_requirementId:{trackerId,requirementId}}}):null;
      if(!tracker||!binding||(granted&&(tracker.status!=='ACTIVE'||tracker.workspace.status!=='ACTIVE'||binding.retentionUntil<=new Date())))throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
      const changed=await tx.studentApplicationTracker.updateMany({where:{id:trackerId,studentReferenceId,version:expectedVersion,status:tracker.status},data:{version:{increment:1}}});
      if(changed.count!==1)throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      await tx.studentApplicationDocumentBinding.update({where:{id:binding.id},data:{reviewConsentGrantedAt:granted?new Date():null,reviewConsentUntil:granted?new Date(Math.min(binding.retentionUntil.getTime(),Date.now()+7*86400000)):null,attestation:Prisma.DbNull}});
      const fresh=await tx.studentApplicationTracker.findUnique({where:{id:trackerId},include:this.include});await this.queueReminder(tx,fresh,tracker.version,undefined,granted?'StudentDocumentReviewRequested':'StudentDocumentReviewWithdrawn');
    });
  }
  async listPendingDocumentReviews(after?:string){
    const rows=await this.db.studentApplicationDocumentBinding.findMany({where:{reviewConsentUntil:{gt:new Date()},retentionUntil:{gt:new Date()},attestation:{equals:Prisma.DbNull},tracker:{status:'ACTIVE',workspace:{status:'ACTIVE'}},...(after?{id:{gt:after}}:{})},orderBy:{id:'asc'},take:21});
    return {items:rows.slice(0,20).map((row:any)=>({id:row.id,requirementName:String(row.requirementSnapshot?.displayName??'Document'),consentUntil:row.reviewConsentUntil})),hasMore:rows.length>20,nextCursor:rows.length>20?rows[19].id:null};
  }
  async findDocumentReview(bindingId:string){
    const row=await this.db.studentApplicationDocumentBinding.findUnique({where:{id:bindingId},include:{tracker:{include:{...this.include,workspace:{select:{status:true}}}}}});
    if(!row||row.tracker.workspace.status!=='ACTIVE')return null;
    const {tracker,...binding}=row;return {binding,tracker:this.dto(tracker)};
  }
  private async documentReviewAudit(tx:any,bindingId:string,expectedVersion:number,actorId:string,action:string,reason:string,mutateTracker=true){
    const row=await tx.studentApplicationDocumentBinding.findUnique({where:{id:bindingId},include:{tracker:{include:{workspace:{select:{status:true}}}}}});
    if(!row||row.tracker.status!=='ACTIVE'||row.tracker.workspace.status!=='ACTIVE'||row.tracker.studentReferenceId===actorId||!row.reviewConsentGrantedAt||row.reviewConsentUntil<=new Date()||row.retentionUntil<=new Date()||(row.expiresAt&&row.expiresAt<=new Date()))throw new Error('STUDENT_DOCUMENT_REVIEW_UNAVAILABLE');
    if(row.tracker.version!==expectedVersion)throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
    if(mutateTracker)await this.cas(tx,row.tracker,{});
    else{const locked=await tx.$queryRaw(Prisma.sql`SELECT id FROM "StudentApplicationTracker" WHERE id=${row.trackerId} AND version=${expectedVersion} AND status='ACTIVE' FOR UPDATE`);if(locked.length!==1)throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');}
    const id=randomUUID();await tx.auditRecord.create({data:{id,reference:`student-document-review-${id}`,action,category:'STUDENT_DOCUMENT_REVIEW',severity:'INFO',actorId,actorType:'USER',targetId:bindingId,targetType:'StudentApplicationDocumentBinding',source:'student-document-review',timestamp:new Date(),contextMetadata:{reason,trackerVersion:expectedVersion}}});
    return row;
  }
  async recordDocumentReviewAccess(bindingId:string,expectedVersion:number,actorId:string){await this.db.$transaction(async(tx:any)=>{await this.documentReviewAudit(tx,bindingId,expectedVersion,actorId,'StudentDocumentReviewAccess','CONSENTED_REVIEW',false);});}
  async saveDocumentAttestation(bindingId:string,expectedVersion:number,attestation:import('@manaratak/domain').StudentDocumentAttestation,reason:string){
    await this.db.$transaction(async(tx:any)=>{
      const row=await this.documentReviewAudit(tx,bindingId,expectedVersion,attestation.reviewedBy,'StudentDocumentAttested',reason);
      if(row.assetId!==attestation.assetId||row.ownerVersionId!==attestation.ownerVersionId||row.tracker.cycleReferenceId!==attestation.cycleId||new Date(attestation.validUntil)>row.retentionUntil)throw new Error('STUDENT_DOCUMENT_REVIEW_STALE');
      await tx.studentApplicationDocumentBinding.update({where:{id:bindingId},data:{attestation}});
      const fresh=await tx.studentApplicationTracker.findUnique({where:{id:row.trackerId},include:this.include});await this.queueReminder(tx,fresh,row.tracker.version,undefined,'StudentDocumentAttested',attestation.reviewedBy);
    });
  }
  async listDocumentBindings(studentReferenceId: string, trackerId: string) {
    const owned = await this.db.studentApplicationTracker.findFirst({
      where: { id: trackerId, studentReferenceId },
    });
    if (!owned) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    return this.db.studentApplicationDocumentBinding.findMany({
      where: { trackerId },
      orderBy: { requirementId: 'asc' },
      take: 50,
    });
  }
  async saveDocumentBinding(
    studentReferenceId: string,
    trackerId: string,
    expectedVersion: number,
    binding: any,
  ) {
    return this.db.$transaction(async (tx: any) => {
      const tracker = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId, status: 'ACTIVE' },
      });
      if (!tracker) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
      if (tracker.cycleReferenceId === 'LEGACY' || tracker.version !== expectedVersion)
        throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      const existing = await tx.studentApplicationDocumentBinding.findUnique({
        where: { trackerId_requirementId: { trackerId, requirementId: binding.requirementId } },
      });
      if (
        !existing &&
        (await tx.studentApplicationDocumentBinding.count({ where: { trackerId } })) >= 50
      )
        throw new Error('STUDENT_DOCUMENT_BINDING_LIMIT');
      await this.cas(tx, tracker, {});
      const saved = await tx.studentApplicationDocumentBinding.upsert({
        where: { trackerId_requirementId: { trackerId, requirementId: binding.requirementId } },
        create: { id: randomUUID(), trackerId, ...binding },
        update: {...binding,reviewConsentGrantedAt:null,reviewConsentUntil:null,attestation:Prisma.DbNull},
      });
      const fresh = await tx.studentApplicationTracker.findUnique({
        where: { id: trackerId },
        include: this.include,
      });
      await this.queueReminder(
        tx,
        fresh,
        tracker.version,
        undefined,
        'StudentApplicationDocumentLinked',
      );
      return saved;
    });
  }
  async listSupportPage(
    studentReferenceId: string,
    input: { limit?: number; cursor?: string },
  ): Promise<StudentSupportApplicationTrackerPage> {
    const limit = Math.min(50, Math.max(1, input.limit ?? 20));
    const codec = new StudentSupportCursorCodec(this.cursorSigningSecret);
    const scope = JSON.stringify({ domain: 'tracker', studentReferenceId, limit });
    const anchor = input.cursor ? codec.decode(input.cursor, scope) : null;
    const cursorAt = anchor?.updatedAt ?? null;
    const cursorId = anchor?.id ?? null;
    const where = { studentReferenceId };
    const selected = await this.db.studentApplicationTracker.findMany({
      where: {
        AND: [
          where,
          ...(cursorAt && cursorId
            ? [
                {
                  OR: [
                    { updatedAt: { lt: cursorAt } },
                    { updatedAt: cursorAt, id: { lt: cursorId } },
                  ],
                },
              ]
            : []),
        ],
      },
      select: {
        id: true,
        scholarshipId: true,
        stage: true,
        status: true,
        deadlineAt: true,
        updatedAt: true,
      },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const total = await this.db.studentApplicationTracker.count({ where });
    const hasMore = selected.length > limit;
    const items = selected.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items,
      total,
      hasMore,
      nextCursor: hasMore && last ? codec.encode(last, scope) : null,
    };
  }

  async listSupportHistory(
    studentReferenceId: string,
    trackerId: string,
    limit = 20,
    cursor?: string,
  ): Promise<StudentSupportTrackerHistoryPage> {
    const take = Math.min(30, Math.max(1, Math.trunc(limit)));
    const scope = JSON.stringify({
      domain: 'tracker-history',
      studentReferenceId,
      trackerId,
      limit: take,
    });
    const codec = new StudentSupportCursorCodec(this.cursorSigningSecret);
    const anchor = cursor ? codec.decode(cursor, scope) : null;
    const owned = await this.db.studentApplicationTracker.findFirst({
      where: { id: trackerId, studentReferenceId },
      select: { id: true },
    });
    // Once a tracker is deleted its append-only timeline still belongs to the
    // same student. Require a prior P15 event to guard orphan/foreign IDs.
    if (!owned) {
      const archivedEvidence = await this.db.studentTimelineEntry.findFirst({
        where: {
          studentReferenceId,
          sourceDomain: 'STUDENT_APPLICATIONS',
          sourceReferenceId: trackerId,
        },
        select: { id: true },
      });
      if (!archivedEvidence) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    }
    const rows = await this.db.studentTimelineEntry.findMany({
      where: {
        studentReferenceId,
        sourceDomain: 'STUDENT_APPLICATIONS',
        sourceReferenceId: trackerId,
        ...(anchor
          ? {
              OR: [
                { occurredAt: { lt: new Date(anchor.updatedAt) } },
                { occurredAt: new Date(anchor.updatedAt), id: { lt: anchor.id } },
              ],
            }
          : {}),
      },
      orderBy: [{ occurredAt: 'desc' }, { id: 'desc' }],
      take: take + 1,
      select: { id: true, eventType: true, occurredAt: true, metadata: true },
    });
    const selected = rows.slice(0, take);
    const last = selected[selected.length - 1];
    return {
      items: selected.map((row: any) => ({
        eventType: row.eventType,
        occurredAt: row.occurredAt,
        version: Number(row.metadata?.version ?? 0),
        status: String(row.metadata?.status ?? 'UNKNOWN'),
      })),
      hasMore: rows.length > take,
      nextCursor:
        rows.length > take && last
          ? codec.encode({ id: last.id, updatedAt: last.occurredAt }, scope)
          : null,
    };
  }

  async listOwnerReconciliationPage(cursor?: string, limit = 50) {
    const take = Math.min(50, Math.max(1, Math.trunc(limit)));
    const rows = await this.db.studentApplicationTracker.findMany({
      where: { status: 'ACTIVE', ...(cursor ? { id: { gt: cursor } } : {}) },
      orderBy: { id: 'asc' },
      take: take + 1,
      select: {
        id: true,
        studentReferenceId: true,
        scholarshipId: true,
        version: true,
        cycleReferenceId: true,
      },
    });
    const items = rows.slice(0, take);
    return { items, nextCursor: rows.length > take ? items.at(-1).id : null };
  }
  async reconcileOwnerFacts(
    studentReferenceId: string,
    trackerId: string,
    expectedVersion: number,
    owner: { scholarshipId: string; slug: string | null; deadlineAt: Date | null },
  ): Promise<boolean> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId, status: 'ACTIVE' },
      });
      if (!current) return false;
      if (current.scholarshipId !== owner.scholarshipId)
        throw new Error('STUDENT_TRACKER_OWNER_RECONCILIATION_MISMATCH');
      if (
        (current.deadlineAt?.toISOString() ?? null) === (owner.deadlineAt?.toISOString() ?? null) &&
        current.scholarshipSlug === owner.slug
      )
        return false;
      if (current.version !== expectedVersion)
        throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      await this.cas(tx, current, { deadlineAt: owner.deadlineAt, scholarshipSlug: owner.slug });
      const row = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
        include: this.include,
      });
      await this.queueReminder(tx, row, current.version, {
        previousDeadlineAt: current.deadlineAt?.toISOString() ?? null,
        previousScholarshipSlug: current.scholarshipSlug ?? null,
      });
      return true;
    });
  }

  async list(studentReferenceId: string): Promise<StudentApplicationTrackerDto[]> {
    return (
      await this.db.studentApplicationTracker.findMany({
        where: { studentReferenceId },
        orderBy: { updatedAt: 'desc' },
        include: this.include,
      })
    ).map((r: any) => this.dto(r));
  }
  async findById(
    studentReferenceId: string,
    trackerId: string,
  ): Promise<StudentApplicationTrackerDto | null> {
    const row = await this.db.studentApplicationTracker.findFirst({
      where: { id: trackerId, studentReferenceId },
      include: this.include,
    });
    return row ? this.dto(row) : null;
  }
  async update(
    studentReferenceId: string,
    trackerId: string,
    data: UpdateStudentApplicationTrackerDto,
  ): Promise<StudentApplicationTrackerDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
      });
      if (!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
      if (current.version !== data.expectedVersion)
        throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      if (current.status !== 'ACTIVE') throw new Error('STUDENT_APPLICATION_TRACKER_NOT_ACTIVE');
      await this.cas(tx, current, {
        ...(data.stage !== undefined ? { stage: data.stage } : {}),
        ...(data.notes !== undefined ? { notes: data.notes } : {}),
        ...(data.deadlineAt !== undefined ? { deadlineAt: data.deadlineAt } : {}),
      });
      const row = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
        include: this.include,
      });
      await this.queueReminder(tx, row, current.version);
      return this.dto(row);
    });
  }
  async setChecklistItem(
    studentReferenceId: string,
    trackerId: string,
    itemId: string,
    completed: boolean,
    expectedVersion: number,
  ): Promise<StudentApplicationTrackerDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
      });
      if (!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
      if (current.version !== expectedVersion)
        throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      if (current.status !== 'ACTIVE') throw new Error('STUDENT_APPLICATION_TRACKER_NOT_ACTIVE');
      const item = await tx.studentApplicationChecklistItem.findFirst({
        where: { id: itemId, trackerId },
      });
      if (!item) throw new Error('STUDENT_APPLICATION_CHECKLIST_ITEM_NOT_FOUND');
      await this.cas(tx, current, {});
      await tx.studentApplicationChecklistItem.updateMany({
        where: { id: itemId, trackerId },
        data: { completed, completedAt: completed ? new Date() : null },
      });
      const row = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
        include: this.include,
      });
      await this.queueReminder(tx, row, current.version);
      return this.dto(row);
    });
  }
  async archive(
    studentReferenceId: string,
    trackerId: string,
    expectedVersion: number,
  ): Promise<StudentApplicationTrackerDto> {
    return this.db.$transaction(async (tx: any) => {
      const current = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
      });
      if (!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
      if (current.version !== expectedVersion)
        throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      if (current.status !== 'ACTIVE') throw new Error('STUDENT_APPLICATION_TRACKER_NOT_ACTIVE');
      await this.cas(tx, current, { status: 'ARCHIVED', archivedAt: new Date() });
      const row = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
        include: this.include,
      });
      await this.queueReminder(tx, row, current.version);
      return this.dto(row);
    });
  }
  async remove(studentReferenceId: string, trackerId: string): Promise<void> {
    await this.db.$transaction(async (tx: any) => {
      const current = await tx.studentApplicationTracker.findFirst({
        where: { id: trackerId, studentReferenceId },
      });
      if (!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
      const result = await tx.studentApplicationTracker.deleteMany({
        where: { id: trackerId, studentReferenceId, version: current.version },
      });
      if (result.count !== 1) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      await this.queueReminder(tx, { ...current, status: 'DELETED' }, current.version);
    });
  }
  private async cas(tx: any, current: any, data: Record<string, unknown>): Promise<void> {
    const result = await tx.studentApplicationTracker.updateMany({
      where: {
        id: current.id,
        studentReferenceId: current.studentReferenceId,
        version: current.version,
        status: 'ACTIVE',
      },
      data: { ...data, version: { increment: 1 } },
    });
    if (result.count !== 1) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
  }
  private async queueReminder(
    tx: any,
    row: any,
    previousVersion: number | null,
    ownerHistory?: { previousDeadlineAt: string | null; previousScholarshipSlug: string | null },
    documentEvent?: 'StudentApplicationDocumentLinked' | 'StudentApplicationDocumentUnlinked'|'StudentDocumentReviewRequested'|'StudentDocumentReviewWithdrawn'|'StudentDocumentAttested',
    documentActorId?:string,
  ): Promise<void> {
    const eventType =
      documentEvent ??
      (row.status === 'DELETED'
        ? 'StudentApplicationTrackerDeleted'
        : row.status === 'ARCHIVED'
          ? 'StudentApplicationTrackerArchived'
          : previousVersion === null
            ? 'StudentApplicationTrackerCreated'
            : 'StudentApplicationTrackerUpdated');
    const eventMetadata = {
      studentReferenceId: row.studentReferenceId,
      scholarshipId: row.scholarshipId,
      version: row.version,
      status: row.status,
    };
    const auditId = randomUUID();
    await tx.auditRecord.create({
      data: {
        id: auditId,
        reference: `student-tracker-audit-${auditId}`,
        action: eventType,
        category: 'STUDENT_APPLICATION',
        severity: 'INFO',
        actorId: documentActorId??row.studentReferenceId,
        actorType: 'USER',
        targetId: row.id,
        targetType: 'StudentApplicationTracker',
        source: 'student-application-tracker',
        timestamp: new Date(),
        contextMetadata: eventMetadata,
      },
    });
    await tx.studentTimelineEntry.create({
      data: {
        id: randomUUID(),
        studentReferenceId: row.studentReferenceId,
        eventType,
        title: 'تغيرت حالة متابعة التقديم',
        sourceDomain: 'STUDENT_APPLICATIONS',
        sourceReferenceId: row.id,
        metadata: {
          version: row.version,
          status: row.status,
          ...(ownerHistory
            ? {
                ownerReconciliation: {
                  ...ownerHistory,
                  deadlineAt: row.deadlineAt?.toISOString() ?? null,
                  scholarshipSlug: row.scholarshipSlug ?? null,
                },
              }
            : {}),
        },
        occurredAt: new Date(),
      },
    });
    await tx.transactionalOutboxRecord.create({
      data: {
        id: randomUUID(),
        domain: 'STUDENT_APPLICATIONS',
        eventType: 'StudentApplicationReminderReconcileRequested',
        aggregateType: 'StudentApplicationTracker',
        aggregateId: row.id,
        payload: {
          trackerId: row.id,
          studentReferenceId: row.studentReferenceId,
          scholarshipId: row.scholarshipId,
          trackerVersion: row.version,
          previousVersion,
          status: row.status,
          deadlineAt: row.deadlineAt ? new Date(row.deadlineAt).toISOString() : null,
        },
        metadata: { sourcePhase: 'Phase15', schemaVersion: '1.0' },
        correlationId: null,
      },
    });
  }
  private dto(row: any): StudentApplicationTrackerDto {
    return {
      ...row,
      checklist: (row.checklist ?? []).map((i: any) => ({ ...i })),
    } as StudentApplicationTrackerDto;
  }
}
