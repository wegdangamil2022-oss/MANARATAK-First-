import type { PrismaClient } from '@prisma/client';
import { CreateStudentApplicationTrackerDto, IStudentApplicationTrackerRepository, StudentApplicationTrackerDto, UpdateStudentApplicationTrackerDto } from '@manaratak/domain';

export class PrismaStudentApplicationTrackerRepository implements IStudentApplicationTrackerRepository {
  constructor(private readonly prisma: PrismaClient) {}
  private get db(): any { return this.prisma as any; }
  private include = { checklist: { orderBy: { position: 'asc' } } } as const;

  async create(data: CreateStudentApplicationTrackerDto): Promise<StudentApplicationTrackerDto> {
    const labels=(data.checklistLabels ?? []).map(x=>x.trim()).filter(Boolean).slice(0,25);
    const row=await this.db.studentApplicationTracker.upsert({
      where:{ studentReferenceId_scholarshipId:{ studentReferenceId:data.studentReferenceId, scholarshipId:data.scholarshipId } },
      create:{ studentReferenceId:data.studentReferenceId, scholarshipId:data.scholarshipId, scholarshipSlug:data.scholarshipSlug ?? null, stage:data.stage ?? 'PREPARING_DOCUMENTS', notes:data.notes ?? null, deadlineAt:data.deadlineAt ?? null, checklist:{ create:labels.map((label,position)=>({label,position})) } },
      update:{ status:'ACTIVE', archivedAt:null }, include:this.include,
    });
    return this.dto(row);
  }
  async list(studentReferenceId:string):Promise<StudentApplicationTrackerDto[]> { return (await this.db.studentApplicationTracker.findMany({where:{studentReferenceId},orderBy:{updatedAt:'desc'},include:this.include})).map((r:any)=>this.dto(r)); }
  async findById(studentReferenceId:string,trackerId:string):Promise<StudentApplicationTrackerDto|null>{ const row=await this.db.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId},include:this.include}); return row?this.dto(row):null; }
  async update(studentReferenceId:string,trackerId:string,data:UpdateStudentApplicationTrackerDto):Promise<StudentApplicationTrackerDto>{
    return this.db.$transaction(async(tx:any)=>{ const current=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId}}); if(!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); if(current.version!==data.expectedVersion) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT'); if(current.status!=='ACTIVE') throw new Error('STUDENT_APPLICATION_TRACKER_NOT_ACTIVE'); const row=await tx.studentApplicationTracker.update({where:{id:trackerId},data:{...(data.stage!==undefined?{stage:data.stage}:{}),...(data.notes!==undefined?{notes:data.notes}:{}),...(data.deadlineAt!==undefined?{deadlineAt:data.deadlineAt}:{}),version:{increment:1}},include:this.include}); return this.dto(row); });
  }
  async setChecklistItem(studentReferenceId:string,trackerId:string,itemId:string,completed:boolean,expectedVersion:number):Promise<StudentApplicationTrackerDto>{
    return this.db.$transaction(async(tx:any)=>{ const current=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId}}); if(!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); if(current.version!==expectedVersion) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT'); const item=await tx.studentApplicationChecklistItem.findFirst({where:{id:itemId,trackerId}}); if(!item) throw new Error('STUDENT_APPLICATION_CHECKLIST_ITEM_NOT_FOUND'); await tx.studentApplicationChecklistItem.update({where:{id:itemId},data:{completed,completedAt:completed?new Date():null}}); const row=await tx.studentApplicationTracker.update({where:{id:trackerId},data:{version:{increment:1}},include:this.include}); return this.dto(row); });
  }
  async archive(studentReferenceId:string,trackerId:string,expectedVersion:number):Promise<StudentApplicationTrackerDto>{ return this.db.$transaction(async(tx:any)=>{ const current=await tx.studentApplicationTracker.findFirst({where:{id:trackerId,studentReferenceId}}); if(!current) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); if(current.version!==expectedVersion) throw new Error('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT'); const row=await tx.studentApplicationTracker.update({where:{id:trackerId},data:{status:'ARCHIVED',archivedAt:new Date(),version:{increment:1}},include:this.include}); return this.dto(row); }); }
  async remove(studentReferenceId:string,trackerId:string):Promise<void>{ const result=await this.db.studentApplicationTracker.deleteMany({where:{id:trackerId,studentReferenceId}}); if(result.count!==1) throw new Error('STUDENT_APPLICATION_TRACKER_NOT_FOUND'); }
  private dto(row:any):StudentApplicationTrackerDto{return {...row,checklist:(row.checklist??[]).map((i:any)=>({...i}))} as StudentApplicationTrackerDto;}
}
