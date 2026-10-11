import {describe,expect,it,vi} from 'vitest';
import {PrismaStudentOwnerCatchupContinuationQueue} from '../../src/students/PrismaStudentOwnerCatchupContinuationQueue';

const payload={
  roleEventId:'role-event-1',studentReferenceId:'student-1',
  roleAssignedAt:new Date('2026-10-10T00:00:00Z'),
  domain:'COURSES' as const,cursor:'page-end-200',
};

describe('P15 durable role catchup continuation',()=>{
  it('persists a limited Phase15 event without copying source data or student PII',async()=>{
    const db={transactionalOutboxRecord:{
      create:vi.fn().mockResolvedValue({}),
      findUnique:vi.fn(),
    }};
    const queue=new PrismaStudentOwnerCatchupContinuationQueue(db as any);
    await queue.enqueueContinuation(payload);
    const created=db.transactionalOutboxRecord.create.mock.calls[0][0].data;
    expect(created).toMatchObject({
      eventType:'StudentOwnerCatchupContinuationRequested',
      domain:'STUDENT_WORKSPACE_CATCHUP',
      aggregateType:'StudentWorkspace',aggregateId:'student-1',
      metadata:{sourcePhase:'Phase15',schemaVersion:'1.0'},
      payload:{
        roleEventId:'role-event-1',studentReferenceId:'student-1',
        ownerDomain:'COURSES',cursor:'page-end-200',
        roleAssignedAt:'2026-10-10T00:00:00.000Z',
      },
    });
    expect(created.id).toMatch(/^[a-f0-9-]{36}$/);
    expect(JSON.stringify(created)).not.toContain('courseName');
    expect(db.transactionalOutboxRecord.findUnique).not.toHaveBeenCalled();
  });

  it('acknowledges duplicate deterministic ID only if a matching continuation is already durable',async()=>{
    let prior:string|undefined;
    const db={transactionalOutboxRecord:{
      create:vi.fn().mockImplementation(async({data}:any)=>{
        if(prior&&prior!==data.id)throw Error('id changed');
        prior=data.id;throw Object.assign(new Error('unique'),{code:'P2002'});
      }),
      findUnique:vi.fn().mockResolvedValue({domain:'STUDENT_WORKSPACE_CATCHUP',
        eventType:'StudentOwnerCatchupContinuationRequested',
        payload:{cursor:'page-end-200'}}),
    }};
    const queue=new PrismaStudentOwnerCatchupContinuationQueue(db as any);
    await expect(queue.enqueueContinuation(payload)).resolves.toBeUndefined();
    await expect(queue.enqueueContinuation(payload)).resolves.toBeUndefined();
    expect(db.transactionalOutboxRecord.create).toHaveBeenCalledTimes(2);
    expect(db.transactionalOutboxRecord.findUnique).toHaveBeenCalledTimes(2);
  });

  it('surfaces database outages rather than claiming a safe checkpoint',async()=>{
    const db={transactionalOutboxRecord:{
      create:vi.fn().mockRejectedValue(new Error('DB_OFFLINE')),
      findUnique:vi.fn(),
    }};
    const queue=new PrismaStudentOwnerCatchupContinuationQueue(db as any);
    await expect(queue.enqueueContinuation(payload)).rejects.toThrow('DB_OFFLINE');
  });
});
