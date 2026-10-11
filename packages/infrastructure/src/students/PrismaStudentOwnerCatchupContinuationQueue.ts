import {createHash} from 'node:crypto';
import type {PrismaClient} from '@prisma/client';
import type {IStudentOwnerCatchupContinuationQueue,StudentOwnerCatchupContinuation} from '@manaratak/application';

/** Durable per-page continuation: no new schema, one deterministic outbox ID per cursor. */
export class PrismaStudentOwnerCatchupContinuationQueue implements IStudentOwnerCatchupContinuationQueue {
  constructor(private readonly prisma:PrismaClient){}
  async enqueueContinuation(input:StudentOwnerCatchupContinuation):Promise<void>{
    if(!input.roleEventId||!input.studentReferenceId||!input.cursor||
      !['COURSES','CERTIFICATES'].includes(input.domain) ||
      !Number.isFinite(input.roleAssignedAt.getTime()))
      throw new Error('STUDENT_OWNER_CATCHUP_CONTINUATION_INVALID');
    const hex=createHash('sha256').update(JSON.stringify({
      roleEventId:input.roleEventId,studentReferenceId:input.studentReferenceId,
      domain:input.domain,cursor:input.cursor,
    })).digest('hex');
    const id=`${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20,32)}`;
    try{
      await this.prisma.transactionalOutboxRecord.create({data:{
        id,domain:'STUDENT_WORKSPACE_CATCHUP',
        eventType:'StudentOwnerCatchupContinuationRequested',
        aggregateType:'StudentWorkspace',aggregateId:input.studentReferenceId,
        payload:{
          roleEventId:input.roleEventId,studentReferenceId:input.studentReferenceId,
          ownerDomain:input.domain,cursor:input.cursor,
          roleAssignedAt:input.roleAssignedAt.toISOString(),
        },
        metadata:{sourcePhase:'Phase15',schemaVersion:'1.0'},
      }});
    }catch(error){
      // Retry of the same source page is idempotent; DB and other uniqueness
      // errors must still propagate to outbox retry/backoff.
      if(error&&typeof error==='object'&&'code' in error&&(error as {code?:string}).code==='P2002'){
        const existing=await this.prisma.transactionalOutboxRecord.findUnique({
          where:{id},select:{id:true,domain:true,eventType:true,payload:true,state:true},
        });
        if(existing?.domain==='STUDENT_WORKSPACE_CATCHUP'&&
          existing.eventType==='StudentOwnerCatchupContinuationRequested'&&
          !['EXHAUSTED','DEAD_LETTER','FAILED_PERMANENT'].includes(existing.state)&&
          (existing.payload as Record<string,unknown>)?.roleEventId===input.roleEventId&&
          (existing.payload as Record<string,unknown>)?.studentReferenceId===input.studentReferenceId&&
          (existing.payload as Record<string,unknown>)?.ownerDomain===input.domain&&
          (existing.payload as Record<string,unknown>)?.cursor===input.cursor)return;
      }
      throw error;
    }
  }
}
