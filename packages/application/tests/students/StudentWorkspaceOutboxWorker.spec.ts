import {describe,expect,it,vi} from 'vitest';
import {StudentWorkspaceOutboxWorker} from '../../src/students/use-cases/StudentWorkspaceOutboxWorker';

describe('StudentWorkspaceOutboxWorker parked event recovery',()=>{
  it('uses a bounded source recovery batch, distinct from outbox delivery',async()=>{
    const dispatcher={dispatchBatch:vi.fn()};
    const recovery={replayParkedEvents:vi.fn().mockResolvedValue({processed:3,failed:0})};
    const worker=new StudentWorkspaceOutboxWorker(dispatcher as any,{batchSize:100},recovery as any);
    expect(await worker.runReplayOnce('student-worker')).toEqual({processed:3,failed:0});
    expect(recovery.replayParkedEvents).toHaveBeenCalledWith(25);
    expect(dispatcher.dispatchBatch).not.toHaveBeenCalled();
  });
  it('claims only P15 reminder events from its own outbox dispatcher',async()=>{
    const primary={dispatchBatch:vi.fn()};
    const recovery={replayParkedEvents:vi.fn()};
    const reminder={dispatchBatch:vi.fn().mockResolvedValue({claimed:1,processed:1,failed:0,exhausted:0,leaseLost:0})};
    const worker=new StudentWorkspaceOutboxWorker(primary as any,{batchSize:5},recovery as any,reminder as any);
    await worker.runRemindersOnce('reminder-worker');
    expect(primary.dispatchBatch).not.toHaveBeenCalled();
    expect(reminder.dispatchBatch).toHaveBeenCalledWith(expect.objectContaining({
      domain:'STUDENT_APPLICATIONS',eventTypes:['StudentApplicationReminderReconcileRequested'],
      workerId:'reminder-worker',batchSize:5,
    }));
  });

  it('claims only P15 catchup continuation records',async()=>{
    const dispatcher={dispatchBatch:vi.fn().mockResolvedValue({claimed:0,processed:0,failed:0,exhausted:0,leaseLost:0})};
    const worker=new StudentWorkspaceOutboxWorker(dispatcher as any);
    await worker.runCatchupOnce('catchup-worker');
    expect(dispatcher.dispatchBatch).toHaveBeenCalledWith(expect.objectContaining({
      domain:'STUDENT_WORKSPACE_CATCHUP',
      eventTypes:['StudentOwnerCatchupContinuationRequested'],
    }));
  });
  it('rejects unscoped worker identities and safely no-ops without recovery',async()=>{
    const worker=new StudentWorkspaceOutboxWorker({dispatchBatch:vi.fn()} as any);
    await expect(worker.runReplayOnce('')).rejects.toThrow('STUDENT_WORKSPACE_REPLAY_WORKER_ID_REQUIRED');
    expect(await worker.runReplayOnce('valid-worker')).toEqual({processed:0,failed:0});
  });
});
