import { randomUUID } from 'node:crypto';
import type { PrismaClient } from '@prisma/client';
import { StudentSupportCursorCodec } from './StudentSupportCursorCodec';
import { CreateStudentApplicationTrackerDto, IStudentApplicationTrackerRepository, StudentApplicationTrackerDto, UpdateStudentApplicationTrackerDto, StudentSupportApplicationTrackerPage, StudentSupportTrackerHistoryPage } from '@manaratak/domain';

export class PrismaStudentApplicationTrackerRepository implements IStudentApplicationTrackerRepository {
  constructor(private readonly prisma: PrismaClient, private readonly cursorSigningSecret?:string) {}
  private get db(): any { return this.prisma as any; }
  private include = { checklist: { orderBy: { position: 'asc' } } } as const;

  async create(data:CreateStudentApplicationTrackerDto):Promise<StudentApplicationTrackerDto>{
    const labels=(data.checklistLabels??[]).map(x=>x.trim()).filter(Boolean).slice(0,25);
    return this.db.$transaction(async(tx:any)=>{
      const key={studentReferenceId:data.studentReferenceId,scholarshipId:data.scholarshipId};
      const existing=await tx.studentApplicationTracker.findUnique({where:{studentReferenceId_scholarshipId:key}});
      if(existing?.status==='ACTIVE'){
        return this.dto(await tx.studentApplicationTracker.findUnique({where:{id:existing.id},include:this.include}));
      }
      if(existing){
        const changed=await tx.studentApplicationTracker.updateMany({
          where:{id:existing.id,studentReferenceId:data.studentReferenceId,version:existing.version,status:'ARCHIVED'},
          data:{status:'ACTIVE',archivedAt:null,version:{increment:1}},
        });
        if(changed.count!==1)throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
        const row=await tx.studentApplicationTracker.findUnique({where:{id:existing.id},include:this.include});
        await this.queueReminder(tx,row,existing.version);
        return this.dto(row);
      }
      const row=await tx.studentApplicationTracker.create({data:{
        ...key,scholarshipSlug:data.scholarshipSlug??null,
        stage:data.stage??'PREPARING_DOCUMENTS',notes:data.notes??null,deadlineAt:data.deadlineAt??null,
        checklist:{create:labels.map((label,position)=>({label,position}))},
      },include:this.include});
      await this.queueReminder(tx,row,null);
      return this.dto(row);
    });
  }
  async listSupportPage(studentReferenceId: string, input: { limit?: number; cursor?: string }): Promise<StudentSupportApplicationTrackerPage> {
    const limit = Math.min(50, Math.max(1, input.limit ?? 20));
    const codec = new StudentSupportCursorCodec(this.cursorSigningSecret);
    const scope = JSON.stringify({domain:'tracker',studentReferenceId,limit});
    const anchor = input.cursor ? codec.decode(input.cursor,scope) : null;
    const cursorAt = anchor?.updatedAt ?? null;
    const cursorId = anchor?.id ?? null;
    const where = { studentReferenceId };
    const selected = await this.db.studentApplicationTracker.findMany({
      where: { AND: [where, ...(cursorAt && cursorId ? [{
        OR: [{updatedAt: {lt: cursorAt}}, {updatedAt: cursorAt, id: {lt: cursorId}}],
      }] : [])] },
      select: { id: true, scholarshipId: true, stage: true, status: true, deadlineAt: true, updatedAt: true },
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      take: limit + 1,
    });
    const total = await this.db.studentApplicationTracker.count({ where });
    const hasMore = selected.length > limit;
    const items = selected.slice(0, limit);
    const last = items[items.length - 1];
    return {
      items, total, hasMore,
      nextCursor: hasMore && last ? codec.encode(last,scope) : null,
    };
  }

  async listSupportHistory(
    studentReferenceId:string,trackerId:string,limit=20,cursor?:string,
  ):Promise<StudentSupportTrackerHistoryPage>{
    const take=Math.min(30,Math.max(1,Math.trunc(limit)));
    const scope=JSON.stringify({domain:'tracker-history',studentReferenceId,trackerId,limit:take});
    const codec=new StudentSupportCursorCodec(this.cursorSigningSecret);
    const anchor=cursor?codec.decode(cursor,scope):null;
    const owned=await this.db.studentApplicationTracker.findFirst({
      where:{id:trackerId,studentReferenceId},select:{id:true},
    });
    // Once a tracker is deleted its append-only timeline still belongs to the
    // same student. Require a prior P15 event to guard orphan/foreign IDs.
    if(!owned){
      const archivedEvidence=await this.db.studentTimelineEntry.findFirst({
        where:{studentReferenceId,sourceDomain:'STUDENT_APPLICATIONS',sourceReferenceId:trackerId},
        select:{id:true},
      });
      if(!archivedEvidence)throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    }
    const rows=await this.db.studentTimelineEntry.findMany({
      where:{
        studentReferenceId,sourceDomain:'STUDENT_APPLICATIONS',sourceReferenceId:trackerId,
        ...(anchor?{OR:[
          {occurredAt:{lt:new Date(anchor.updatedAt)}},
          {occurredAt:new Date(anchor.updatedAt),id:{lt:anchor.id}},
        ]}:{}),
      },
      orderBy:[{occurredAt:'desc'},{id:'desc'}],take:take+1,
      select:{id:true,eventType:true,occurredAt:true,metadata:true},
    });
    const selected=rows.slice(0,take);
    const last=selected[selected.length-1];
    return {
      items:selected.map((row:any)=>({
        eventType:row.eventType,occurredAt:row.occurredAt,
        version:Number(row.metadata?.version??0),
        status:String(row.metadata?.status??'UNKNOWN'),
      })),
      hasMore:rows.length>take,
      nextCursor:rows.length>take && last
        ?codec.encode({id:last.id,updatedAt:last.occurredAt},scope):null,
    };
  }

  async list(studentReferenceId:string):Promise<StudentApplicationTrackerDto[]> { return (await this.db.studentApplicationTracker.findMany({where:{studentReferenceId},orderBy:{updatedAt:'desc'},include:this.include})).map((r:any)=>this.dto(r)); }
  async findById(studentReferenceId:string,trackerId:string):Promise<StudentApplicationTrackerDto|null>{ const row=await this.db.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId},include:this.include}); return row?this.dto(row):null; }
  async update(studentReferenceId:string,trackerId:string,data:UpdateStudentApplicationTrackerDto):Promise<StudentApplicationTrackerDto>{
    return this.db.$transaction(async(tx:any)=>{ const current=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId}}); if(!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); if(current.version!==data.expectedVersion) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT'); if(current.status!=='ACTIVE') throw new Error('STUDENT_APPLICATION_TRACKER_NOT_ACTIVE'); await this.cas(tx,current,{...(data.stage!==undefined?{stage:data.stage}:{}),...(data.notes!==undefined?{notes:data.notes}:{}),...(data.deadlineAt!==undefined?{deadlineAt:data.deadlineAt}:{})}); const row=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId},include:this.include}); await this.queueReminder(tx,row,current.version); return this.dto(row); });
  }
  async setChecklistItem(studentReferenceId:string,trackerId:string,itemId:string,completed:boolean,expectedVersion:number):Promise<StudentApplicationTrackerDto>{
    return this.db.$transaction(async(tx:any)=>{ const current=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId}}); if(!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); if(current.version!==expectedVersion) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT'); if(current.status!=='ACTIVE') throw new Error('STUDENT_APPLICATION_TRACKER_NOT_ACTIVE'); const item=await tx.studentApplicationChecklistItem.findFirst({where:{id:itemId,trackerId}}); if(!item) throw new Error('STUDENT_APPLICATION_CHECKLIST_ITEM_NOT_FOUND'); await this.cas(tx,current,{}); await tx.studentApplicationChecklistItem.updateMany({where:{id:itemId,trackerId},data:{completed,completedAt:completed?new Date():null}}); const row=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId},include:this.include}); await this.queueReminder(tx,row,current.version); return this.dto(row); });
  }
  async archive(studentReferenceId:string,trackerId:string,expectedVersion:number):Promise<StudentApplicationTrackerDto>{ return this.db.$transaction(async(tx:any)=>{ const current=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId}}); if(!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); if(current.version!==expectedVersion) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT'); if(current.status!=='ACTIVE') throw new Error('STUDENT_APPLICATION_TRACKER_NOT_ACTIVE'); await this.cas(tx,current,{status:'ARCHIVED',archivedAt:new Date()}); const row=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId},include:this.include}); await this.queueReminder(tx,row,current.version); return this.dto(row); }); }
  async remove(studentReferenceId:string,trackerId:string):Promise<void>{
    await this.db.$transaction(async(tx:any)=>{
      const current=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId}});
      if(!current)throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
      const result=await tx.studentApplicationTracker.deleteMany({where:{id:trackerId,studentReferenceId,version:current.version}});
      if(result.count!==1)throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
      await this.queueReminder(tx,{...current,status:'DELETED'},current.version);
    });
  }
  private async cas(tx:any,current:any,data:Record<string,unknown>):Promise<void>{ const result=await tx.studentApplicationTracker.updateMany({where:{id:current.id,studentReferenceId:current.studentReferenceId,version:current.version,status:'ACTIVE'},data:{...data,version:{increment:1}}}); if(result.count!==1) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT'); }
  private async queueReminder(tx:any,row:any,previousVersion:number|null):Promise<void>{
    const eventType=row.status==='DELETED'?'StudentApplicationTrackerDeleted':
      row.status==='ARCHIVED'?'StudentApplicationTrackerArchived':
      previousVersion===null?'StudentApplicationTrackerCreated':'StudentApplicationTrackerUpdated';
    const eventMetadata={
      studentReferenceId:row.studentReferenceId,scholarshipId:row.scholarshipId,
      version:row.version,status:row.status,
    };
    const auditId=randomUUID();
    await tx.auditRecord.create({data:{
      id:auditId,reference:`student-tracker-audit-${auditId}`,
      action:eventType,category:'STUDENT_APPLICATION',severity:'INFO',
      actorId:row.studentReferenceId,actorType:'USER',
      targetId:row.id,targetType:'StudentApplicationTracker',
      source:'student-application-tracker',timestamp:new Date(),
      contextMetadata:eventMetadata,
    }});
    await tx.studentTimelineEntry.create({data:{
      id:randomUUID(),studentReferenceId:row.studentReferenceId,
      eventType,title:'تغيرت حالة متابعة التقديم',
      sourceDomain:'STUDENT_APPLICATIONS',sourceReferenceId:row.id,
      metadata:{version:row.version,status:row.status},
      occurredAt:new Date(),
    }});
    await tx.transactionalOutboxRecord.create({data:{
      id:randomUUID(),domain:'STUDENT_APPLICATIONS',eventType:'StudentApplicationReminderReconcileRequested',
      aggregateType:'StudentApplicationTracker',aggregateId:row.id,
      payload:{trackerId:row.id,studentReferenceId:row.studentReferenceId,
        scholarshipId:row.scholarshipId,trackerVersion:row.version,previousVersion,
        status:row.status,deadlineAt:row.deadlineAt?new Date(row.deadlineAt).toISOString():null},
      metadata:{sourcePhase:'Phase15',schemaVersion:'1.0'},correlationId:null,
    }});
  }
  private dto(row:any):StudentApplicationTrackerDto{return {...row,checklist:(row.checklist??[]).map((i:any)=>({...i}))} as StudentApplicationTrackerDto;}
}
