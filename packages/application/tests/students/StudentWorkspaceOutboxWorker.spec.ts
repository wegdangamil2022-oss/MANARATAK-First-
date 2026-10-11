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
  it('rejects unscoped worker identities and safely no-ops without recovery',async()=>{
    const worker=new StudentWorkspaceOutboxWorker({dispatchBatch:vi.fn()} as any);
    await expect(worker.runReplayOnce('')).rejects.toThrow('STUDENT_WORKSPACE_REPLAY_WORKER_ID_REQUIRED');
    expect(await worker.runReplayOnce('valid-worker')).toEqual({processed:0,failed:0});
  });
});
