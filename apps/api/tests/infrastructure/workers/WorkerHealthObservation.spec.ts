import {describe,it,expect,vi} from 'vitest';
import {WorkerHealthObservation} from '../../../src/infrastructure/runtime/WorkerHealthObservation';
import {freshWorkerEvidence} from '../../../src/presentation/monitoring/RuntimeHealthPolicy';

const scope={environment:'test',apiOrigin:'https://api.example.invalid',revision:'r08'};
function redisFixture(){const values=new Map<string,string>();return {get:vi.fn(async(key:string)=>values.get(key)??null),set:vi.fn(async(key:string,value:string,_options?:unknown)=>{values.set(key,value);})};}
describe('R08 worker health Redis boundary',()=>{
  it('R08 replaces healthy evidence with a failed observation and a real Redis expiry option',async()=>{
    const redis=redisFixture(),health=new WorkerHealthObservation(redis,scope);
    await health.publish('owner',{state:'RUNNING',lastSuccessAt:new Date().toISOString()});
    await health.publish('owner',{state:'DEGRADED',lastFailureAt:new Date().toISOString()});
    const result=await health.read('owner');expect(result.state).toBe('DEGRADED');expect(freshWorkerEvidence(result,15000)).toBe(false);
    expect(redis.set.mock.calls.at(-1)?.[2]).toEqual({PX:3600000});
  });
  it('R08 does not drop a failure while a prior success write is still pending',async()=>{
    const values=new Map<string,string>();let release!:()=>void;
    const blocked=new Promise<void>(resolve=>{release=resolve;});let writes=0;
    const redis={get:async(key:string)=>values.get(key)??null,set:async(key:string,value:string)=>{if(++writes===1)await blocked;values.set(key,value);}};
    const health=new WorkerHealthObservation(redis,scope),success=health.publish('owner',{state:'RUNNING',lastSuccessAt:new Date().toISOString()});
    await Promise.resolve();const failure=health.publish('owner',{state:'DEGRADED',lastFailureAt:new Date().toISOString()});release();await Promise.all([success,failure]);
    expect((await health.read('owner')).state).toBe('DEGRADED');
  });
  it('R08 persists a stopped worker without leaving a fresh healthy record',async()=>{
    const redis=redisFixture(),health=new WorkerHealthObservation(redis,scope);
    await health.publish('owner',{state:'RUNNING',lastSuccessAt:new Date().toISOString()});
    await health.publish('owner',{state:'STOPPED',lastStoppedAt:new Date().toISOString()});
    const result=await health.read('owner');expect(result.state).toBe('STOPPED');expect(freshWorkerEvidence(result,15000)).toBe(false);
  });
  it('does not reuse another Redis namespace observation at the same deployment revision',async()=>{
    const redis=redisFixture(),a=new WorkerHealthObservation(redis,{...scope,namespace:'r08:a'}),b=new WorkerHealthObservation(redis,{...scope,namespace:'r08:b'});
    await a.publish('background-jobs',{state:'IDLE',lastPollAt:new Date().toISOString()});
    expect((await a.read('background-jobs')).state).toBe('IDLE');
    expect((await b.read('background-jobs')).state).toBe('NOT_STARTED');
    expect(redis.set.mock.calls[0][0]).toMatch(/^r08:a:health:workers:/);
  });
  it('separates deployment revisions and health reads cannot refresh stale evidence',async()=>{
    const redis=redisFixture(),a=new WorkerHealthObservation(redis,scope),b=new WorkerHealthObservation(redis,{...scope,revision:'other'});
    const now=Date.now();await a.publish('owner-domain-outbox',{state:'RUNNING',lastSuccessAt:new Date(now-16000).toISOString()});
    expect(freshWorkerEvidence(await a.read('owner-domain-outbox'),15000,now)).toBe(false);
    expect((await b.read('owner-domain-outbox')).state).toBe('NOT_STARTED');
    expect(redis.set).toHaveBeenCalledOnce();
  });
  it('propagates Redis outages instead of manufacturing a healthy observation',async()=>{
    const observations=new WorkerHealthObservation({get:async()=>{throw Error('SYNTHETIC_REDIS_DOWN');}},scope);
    await expect(observations.read('background-jobs')).rejects.toThrow('SYNTHETIC_REDIS_DOWN');
  });
});
