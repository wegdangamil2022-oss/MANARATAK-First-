import {describe,it,expect,vi} from 'vitest';
import {InternationalTestAdminUseCases} from '../../src/tests-platform/use-cases/InternationalTestUseCases';
import {AtomicDomainMutationCoordinator} from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {AtomicAuditedOutboxMutationExecutor} from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
function harness() {
 const state:any={revision:1,owner:{id:'test',status:'NEEDS_REVIEW',canonicalName:'Exam',providerName:'Provider',testCategory:'OTHER'},audits:0,events:0};let fail=false;
 const repo:any={withTransaction:()=>repo,acquireSourceReviewLock:vi.fn(),findById:async()=>({...state.owner}),getRevision:async()=>state.revision,advanceRevision:async(_id:string,expected:number)=>{if(expected!==state.revision)throw new Error('REVISION_CONFLICT');state.revision++;},update:vi.fn(async(_id,data)=>{Object.assign(state.owner,data);return {...state.owner};}),govern:vi.fn(async()=>({versionId:'snapshot'})),listImportVersions:async()=>[]};
 const uow:any={execute:async(fn:any)=>{const before=structuredClone(state);try{return await fn({boundaryId:'p9',transactionClient:{}});}catch(err){Object.assign(state,before);throw err;}}};
 const audit:any={saveInTransaction:async()=>{state.audits++;}};const outbox:any={appendInTransaction:async()=>{state.events++;if(fail)throw new Error('OUTBOX_FAILURE');}};
 const coordinator=new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(uow,audit,outbox));
 return {state,repo,uc:new InternationalTestAdminUseCases(repo,undefined,undefined,undefined,undefined,undefined,coordinator),fail:()=>{fail=true;}};
}
const context={actorId:'reviewer',expectedRevision:1,reason:'Reviewed candidate'};
describe('P9 atomic application controls',()=>{
 it('refuses a stale editor before the business write',async()=>{const h=harness();await expect(h.uc.manualNames('test',{localizedNameAr:'اختبار',localizedNameEn:'Exam',reason:'Verified names'},{...context,expectedRevision:0})).rejects.toThrow('REVISION_CONFLICT');expect(h.repo.update).not.toHaveBeenCalled();expect(h.state.audits).toBe(0);});
 it('refuses missing revision instead of silently using current server state',async()=>{const h=harness();await expect(h.uc.manualNames('test',{localizedNameAr:'اختبار',localizedNameEn:'Exam',reason:'Verified names'},{actorId:'editor'})).rejects.toThrow('EXPECTED_REVISION_REQUIRED');});
 it('persists names, revision, audit and outbox in one owner transaction',async()=>{const h=harness();const result=await h.uc.manualNames('test',{localizedNameAr:'اختبار',localizedNameEn:'Exam',reason:'Verified names'},context);expect(h.state.revision).toBe(2);expect(h.state.audits).toBe(1);expect(h.state.events).toBe(1);expect(result.revision).toBe(2);});
 it('rolls back content and revision when outbox cannot persist',async()=>{const h=harness();h.fail();await expect(h.uc.manualNames('test',{localizedNameAr:'اختبار',localizedNameEn:'Exam',reason:'Verified names'},context)).rejects.toThrow('OUTBOX_FAILURE');expect(h.state.owner.localizedNameEn).toBeUndefined();expect(h.state.revision).toBe(1);expect(h.state.audits).toBe(0);});
 it('blocks direct create with PUBLISHED lifecycle',async()=>{const h=harness();await expect(h.uc.createTest({canonicalName:'Exam',providerName:'Provider',testCategory:'OTHER',status:'PUBLISHED'} as any,context)).rejects.toThrow('CREATE_STATUS_INVALID');});
 it('does not allow manual naming to override a source-bound imported record',async()=>{const h=harness();h.repo.listImportVersions=async()=>[{sourceHash:'hash'}];await expect(h.uc.manualNames('test',{localizedNameAr:'اختبار',localizedNameEn:'Exam',reason:'Verified names'},context)).rejects.toThrow('IMPORTED_NAME_REVIEW_REQUIRED');});
 it('checks approval in the locked transaction and binds the actual snapshot pointer',async()=>{const h=harness();h.state.owner.status='READY_TO_PUBLISH';await h.uc.publish('test',context);expect(h.repo.govern).toHaveBeenCalledWith('test','PUBLISH',{reason:context.reason},context.actorId);expect(h.state.owner.currentPublishedVersionId).toBe('snapshot');expect(h.state.owner.isPubliclyVisible).toBe(true);});
});
