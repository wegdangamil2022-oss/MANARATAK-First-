import {describe,expect,it,vi} from 'vitest';
import {PrismaStudentApplicationTrackerRepository} from '../../src/students/PrismaStudentApplicationTrackerRepository';

const before={id:'t-1',studentReferenceId:'s-1',scholarshipId:'sch-1',
  version:1,status:'ACTIVE',deadlineAt:new Date('2027-02-15T00:00:00Z'),checklist:[]};
const after={...before,version:2};
function mockTransaction(tx:any){
  tx.auditRecord??={create:vi.fn().mockResolvedValue({})};
  tx.studentTimelineEntry??={create:vi.fn().mockResolvedValue({})};
  return {$transaction:vi.fn().mockImplementation((fn:(transaction:any)=>unknown)=>fn(tx))};
}
describe('PrismaStudentApplicationTrackerRepository atomic notification outbox',()=>{
  it('places tracker creation and reminder fact in the very same transaction',async()=>{
    const tx={
      studentApplicationTracker:{
        findUnique:vi.fn().mockResolvedValue(null),
        create:vi.fn().mockResolvedValue(before),
      },
      transactionalOutboxRecord:{create:vi.fn().mockResolvedValue({})},
    };
    const db=mockTransaction(tx);
    const repo=new PrismaStudentApplicationTrackerRepository(db as any);
    await repo.create({studentReferenceId:'s-1',scholarshipId:'sch-1'});
    expect(db.$transaction).toHaveBeenCalledOnce();
    expect(tx.studentApplicationTracker.create).toHaveBeenCalledOnce();
    expect(tx.auditRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({
        category:'STUDENT_APPLICATION',targetType:'StudentApplicationTracker',
        contextMetadata:expect.not.objectContaining({notes:expect.anything()}),
      }),
    }));
    expect(tx.studentTimelineEntry.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({sourceDomain:'STUDENT_APPLICATIONS',sourceReferenceId:'t-1'}),
    }));
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({
        domain:'STUDENT_APPLICATIONS',eventType:'StudentApplicationReminderReconcileRequested',
        payload:expect.objectContaining({trackerId:'t-1',trackerVersion:1,previousVersion:null,status:'ACTIVE'}),
      }),
    }));
  });
  it('does not report a successful tracker create if atomic outbox insertion fails',async()=>{
    const tx={
      studentApplicationTracker:{findUnique:vi.fn().mockResolvedValue(null),create:vi.fn().mockResolvedValue(before)},
      transactionalOutboxRecord:{create:vi.fn().mockRejectedValue(new Error('OUTBOX_DB_FAILED'))},
    };
    const repo=new PrismaStudentApplicationTrackerRepository(mockTransaction(tx) as any);
    await expect(repo.create({studentReferenceId:'s-1',scholarshipId:'sch-1'}))
      .rejects.toThrow('OUTBOX_DB_FAILED');
  });
  it('does not emit reminders for a failed CAS version update',async()=>{
    const tx={
      studentApplicationTracker:{
        findFirst:vi.fn().mockResolvedValue(before),
        updateMany:vi.fn().mockResolvedValue({count:0}),
      },
      transactionalOutboxRecord:{create:vi.fn()},
    };
    const repo=new PrismaStudentApplicationTrackerRepository(mockTransaction(tx) as any);
    await expect(repo.update('s-1','t-1',{expectedVersion:1,stage:'APPLIED'}))
      .rejects.toThrow('STUDENT_APPLICATION_TRACKER_VERSION_CONFLICT');
    expect(tx.transactionalOutboxRecord.create).not.toHaveBeenCalled();
  });
  it('emits versioned notification reconciliation for every checklist change',async()=>{
    const tx={
      studentApplicationTracker:{
        findFirst:vi.fn().mockResolvedValueOnce(before).mockResolvedValueOnce(after),
        updateMany:vi.fn().mockResolvedValue({count:1}),
      },
      studentApplicationChecklistItem:{
        findFirst:vi.fn().mockResolvedValue({id:'item-1',trackerId:'t-1'}),
        updateMany:vi.fn().mockResolvedValue({count:1}),
      },
      transactionalOutboxRecord:{create:vi.fn().mockResolvedValue({})},
    };
    const repo=new PrismaStudentApplicationTrackerRepository(mockTransaction(tx) as any);
    await repo.setChecklistItem('s-1','t-1','item-1',true,1);
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({
        payload:expect.objectContaining({trackerVersion:2,previousVersion:1,status:'ACTIVE'}),
      }),
    }));
  });
  it('limits tracker history to the identified student and excludes free-form notes',async()=>{
    const records=Array.from({length:3},(_,i)=>({
      eventType:'StudentApplicationTrackerUpdated',
      occurredAt:new Date('2026-10-10T00:00:00Z'),metadata:{version:i+1,status:'ACTIVE',notes:'private'},
    }));
    const client={
      studentApplicationTracker:{findFirst:vi.fn().mockResolvedValue({id:'t-1'})},
      studentTimelineEntry:{findMany:vi.fn().mockResolvedValue(records)},
    };
    const repo=new PrismaStudentApplicationTrackerRepository(client as any);
    const result=await repo.listSupportHistory('s-1','t-1',2);
    expect(result.hasMore).toBe(true);
    expect(result.items).toHaveLength(2);
    expect(JSON.stringify(result)).not.toContain('private');
    expect(client.studentApplicationTracker.findFirst).toHaveBeenCalledWith({
      where:{id:'t-1',studentReferenceId:'s-1'},select:{id:true},
    });
  });
  it('prevents IDOR in tracker history before querying any timeline events',async()=>{
    const client={
      studentApplicationTracker:{findFirst:vi.fn().mockResolvedValue(null)},
      studentTimelineEntry:{findMany:vi.fn()},
    };
    const repo=new PrismaStudentApplicationTrackerRepository(client as any);
    await expect(repo.listSupportHistory('other-student','t-1')).rejects.toThrow('STUDENT_APPLICATION_TRACKER_NOT_FOUND');
    expect(client.studentTimelineEntry.findMany).not.toHaveBeenCalled();
  });

  it('deletes and atomically enqueues cancellation in the same transaction',async()=>{
    const tx={
      studentApplicationTracker:{
        findFirst:vi.fn().mockResolvedValue(before),
        deleteMany:vi.fn().mockResolvedValue({count:1}),
      },
      transactionalOutboxRecord:{create:vi.fn().mockResolvedValue({})},
    };
    const db=mockTransaction(tx);
    const repo=new PrismaStudentApplicationTrackerRepository(db as any);
    await repo.remove('s-1','t-1');
    expect(tx.studentApplicationTracker.deleteMany).toHaveBeenCalledWith({
      where:{id:'t-1',studentReferenceId:'s-1',version:1},
    });
    expect(tx.transactionalOutboxRecord.create).toHaveBeenCalledWith(expect.objectContaining({
      data:expect.objectContaining({payload:expect.objectContaining({status:'DELETED',previousVersion:1})}),
    }));
  });
});
