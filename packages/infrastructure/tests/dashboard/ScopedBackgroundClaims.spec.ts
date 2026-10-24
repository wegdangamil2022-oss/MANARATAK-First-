import {describe,it,expect,vi} from 'vitest';
import {PrismaBackgroundJobExecutionGateway} from '../../src/background-jobs/PrismaBackgroundJobExecutionGateway';

describe('scoped durable worker claims',()=>{
  it.each([[],[''],['analytics.retention.sweep; DELETE'],['UPPERCASE']].map(scope=>({scope})))('rejects an invalid scope before touching the database: %j',({scope})=>{
    expect(()=>new PrismaBackgroundJobExecutionGateway({} as never,scope)).toThrow('BACKGROUND_JOB_CLAIM_SCOPE_INVALID');
  });
  it('binds an immutable type scope inside the locked candidate query',async()=>{
    const query=vi.fn().mockResolvedValue([]),db={$transaction:vi.fn(async(work:(tx:unknown)=>Promise<unknown>)=>work({$queryRaw:query}))};
    const types=['analytics.retention.sweep'],queue=new PrismaBackgroundJobExecutionGateway(db as never,types);
    types[0]='notification.delivery';
    await queue.claimDue({workerId:'retention-test',batchSize:1,leaseDurationMs:60000,now:new Date()});
    expect(query.mock.calls[0][0].sql).toContain('"jobType" IN (?)');
    expect(query.mock.calls[0][0].sql).toContain('FOR UPDATE SKIP LOCKED');
    expect(query.mock.calls[0][0].values).toContain('analytics.retention.sweep');
    expect(query.mock.calls[0][0].values).not.toContain('notification.delivery');
  });
  it('preserves unrestricted existing workers when no scope is configured',async()=>{
    const query=vi.fn().mockResolvedValue([]),db={$transaction:vi.fn(async(work:(tx:unknown)=>Promise<unknown>)=>work({$queryRaw:query}))};
    await new PrismaBackgroundJobExecutionGateway(db as never).claimDue({workerId:'existing-worker',batchSize:10,leaseDurationMs:60000,now:new Date()});
    expect(query.mock.calls[0][0].sql).not.toContain('"jobType" IN');
  });
});
