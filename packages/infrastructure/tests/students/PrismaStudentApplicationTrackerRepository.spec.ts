import {describe,expect,it,vi} from 'vitest';
import {PrismaStudentApplicationTrackerRepository} from '../../src/students/PrismaStudentApplicationTrackerRepository';

const before={id:'t-1',studentReferenceId:'s-1',scholarshipId:'sch-1',
  version:1,status:'ACTIVE',deadlineAt:new Date('2027-02-15T00:00:00Z'),checklist:[]};
const after={...before,version:2};
function mockTransaction(tx:any){
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
