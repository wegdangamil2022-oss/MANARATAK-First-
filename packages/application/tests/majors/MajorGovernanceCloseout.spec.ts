import {describe,it,expect,vi} from 'vitest';
import {AdminMajorUseCases} from '../../src/majors/use-cases/AdminMajorUseCases';
import {AtomicDomainMutationCoordinator} from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {AtomicAuditedOutboxMutationExecutor} from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
function harness(){const state:any={revision:4,graph:[],decisions:[],audits:0,events:0};let fail=false;
 const candidate:any={candidateKey:'NMC-1',sourceDigest:'a'.repeat(64),sourceCount:1,degreeLevelIds:[],degreeLevelCodes:[],officialSourceUrls:[],sources:[]};
 const repo:any={findById:async()=>({id:'major',status:'READY_TO_REVIEW'}),withTransaction:()=>repo,lockForRevision:vi.fn(async(_id,expected)=>{if(expected!==state.revision)throw new Error('MAJOR_STALE_REVISION');}),advanceRevision:async()=>++state.revision,reviewGraph:vi.fn(async(_id,_kind,input)=>{state.graph.push(input);})};
 const candidates:any={withTransaction:()=>candidates,acquireReviewLock:vi.fn(),findByKey:async()=>candidate,recordDecision:vi.fn(async input=>state.decisions.push(input))};
 const uow:any={execute:async(fn:any)=>{const before=structuredClone(state);try{return await fn({boundaryId:'p10',transactionClient:{}});}catch(error){Object.assign(state,before);throw error;}}};
 const audit:any={saveInTransaction:async()=>state.audits++};const outbox:any={appendInTransaction:async()=>{state.events++;if(fail)throw new Error('OUTBOX_FAILED');}};
 const coordinator=new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(uow,audit,outbox));
 return {state,repo,candidate,candidates,uc:new AdminMajorUseCases(repo,undefined,undefined,undefined,coordinator,undefined,candidates),fail:()=>fail=true};}
const context={actorId:'reviewer',expectedRevision:4,reason:'Reviewed source evidence',expectedSourceDigest:'a'.repeat(64)};
describe('P10 audited decisions and stale-editor protection',()=>{
 it('rejects an unaudited mutation instead of writing directly',async()=>{const repo:any={reviewGraph:vi.fn()};await expect(new AdminMajorUseCases(repo).reviewGraph('major','ALIAS',{},context)).rejects.toThrow('AUDITED_REVIEW_CONTEXT_REQUIRED');expect(repo.reviewGraph).not.toHaveBeenCalled();});
 it('requires a caller revision before graph mutation',async()=>{const h=harness();await expect(h.uc.reviewGraph('major','ALIAS',{}, {actorId:'reviewer',reason:'Source'})).rejects.toThrow('EXPECTED_REVISION_REQUIRED');expect(h.repo.reviewGraph).not.toHaveBeenCalled();});
 it('rejects stale editors before business, audit or outbox writes',async()=>{const h=harness();await expect(h.uc.reviewGraph('major','ALIAS',{}, {...context,expectedRevision:3})).rejects.toThrow('STALE_REVISION');expect(h.state).toMatchObject({revision:4,graph:[],audits:0,events:0});});
 it('commits graph, revision, audit and outbox together',async()=>{const h=harness();await h.uc.reviewGraph('major','ALIAS',{alias:'Computing'},context);expect(h.state).toMatchObject({revision:5,graph:[{alias:'Computing'}],audits:1,events:1});});
 it('rolls the graph and revision back on outbox persistence failure',async()=>{const h=harness();h.fail();await expect(h.uc.reviewGraph('major','ALIAS',{alias:'Computing'},context)).rejects.toThrow('OUTBOX_FAILED');expect(h.state).toMatchObject({revision:4,graph:[],audits:0,events:0});});
 it('records a rejection without creating a canonical major',async()=>{const h=harness();await h.uc.rejectNewMajorCandidate('NMC-1',context);expect(h.state.decisions[0]).toMatchObject({decision:'REJECTED',actorId:'reviewer',reason:context.reason,sourceDigest:context.expectedSourceDigest});expect(h.state.audits).toBe(1);});
 it('does not reject newly changed evidence using an old review snapshot',async()=>{const h=harness();h.candidate.sourceDigest='b'.repeat(64);await expect(h.uc.rejectNewMajorCandidate('NMC-1',context)).rejects.toThrow('STALE_SOURCE');expect(h.state.decisions).toEqual([]);});
 it('rejects lifecycle or publication-pointer injection through generic update',async()=>{const h=harness();await expect(h.uc.updateMajor('major',{currentPublishedVersionId:'forged'},context)).rejects.toThrow('EXPLICIT_LIFECYCLE');});
});
