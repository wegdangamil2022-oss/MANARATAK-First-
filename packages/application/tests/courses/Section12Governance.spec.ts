import {describe,it,expect,vi} from 'vitest';
import {CourseAdminCommandUseCases} from '../../src/courses/use-cases/CourseAdminCommandUseCases';
import {LearningPathUseCases} from '../../src/courses/use-cases/LearningPathUseCases';
import {AtomicDomainMutationCoordinator} from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import {AtomicAuditedOutboxMutationExecutor} from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
const context={actorId:'reviewer',reason:'Reviewed lesson corrections',expectedVersion:3};
function harness(){
 const state={version:3,lessons:[] as string[],audits:0,events:0,status:'READY_TO_REVIEW'};let fail=false;
 const repo:any={withTransaction:()=>repo,assertCurrentVersion:async(_id:string,version:number)=>{if(version!==state.version)throw new Error('COURSE_STALE_VERSION');},
  findById:async()=>({id:'c1',version:state.version,status:state.status}),update:async()=>({id:'c1',version:++state.version,status:state.status})};
 const paths:any={withTransaction:()=>paths};
 const uow:any={execute:async(fn:any)=>{const before=structuredClone(state);try{return await fn({boundaryId:'course-tx',transactionClient:{}});}catch(error){Object.assign(state,before);throw error;}}};
 const atomic=new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(uow,{saveInTransaction:async()=>state.audits++} as any,{appendInTransaction:async()=>{state.events++;if(fail)throw new Error('OUTBOX_FAILED');}} as any));
 const scope:any={write:async()=>state.lessons.push('lesson')};
 return {state,uc:new CourseAdminCommandUseCases(repo,paths,atomic,()=>scope),fail:()=>fail=true};
}
describe('P13 admin command transaction',()=>{
 it('rejects a stale editor before any child/audit/outbox write',async()=>{const h=harness();await expect(h.uc.execute('COURSE','c1','LESSON_EDIT',{...context,expectedVersion:2},s=>(s as any).write())).rejects.toThrow('COURSE_STALE_VERSION');expect(h.state).toMatchObject({version:3,lessons:[],audits:0,events:0});});
 it('commits lesson, version, audit and event together',async()=>{const h=harness();const result=await h.uc.execute('COURSE','c1','LESSON_EDIT',context,s=>(s as any).write());expect(result.version).toBe(4);expect(h.state).toMatchObject({lessons:['lesson'],audits:1,events:1});});
 it('rolls child edits and version back when outbox persistence fails',async()=>{const h=harness();h.fail();await expect(h.uc.execute('COURSE','c1','LESSON_EDIT',context,s=>(s as any).write())).rejects.toThrow('OUTBOX_FAILED');expect(h.state).toMatchObject({version:3,lessons:[],audits:0,events:0});});
 it('blocks child edits on a published owner',async()=>{const h=harness();h.state.status='PUBLISHED';await expect(h.uc.execute('COURSE','c1','LESSON_EDIT',context,s=>(s as any).write())).rejects.toThrow('COURSE_PUBLISHED_STRUCTURE_IMMUTABLE');expect(h.state.lessons).toEqual([]);});
 it('requires the authenticated reviewer and an explicit reason',async()=>{const h=harness();await expect(h.uc.execute('COURSE','c1','LESSON_EDIT',{...context,actorId:''},s=>(s as any).write())).rejects.toThrow('COURSE_REVIEW_CONTEXT_REQUIRED');});
});
describe('P13 learning path dependencies',()=>{
 it('rejects multi-course prerequisite cycles before persisting',async()=>{const repo:any={create:vi.fn()};const uc=new LearningPathUseCases(repo,{} as any,{} as any);await expect(uc.create({title:'Path',courses:[{courseId:'a',position:1,required:true,prerequisiteCourseIds:['b']},{courseId:'b',position:2,required:true,prerequisiteCourseIds:['a']}]})).rejects.toThrow('LEARNING_PATH_PREREQUISITE_CYCLE');expect(repo.create).not.toHaveBeenCalled();});
 it('requires enrollment before disclosing available courses',async()=>{const repo:any={findEnrollment:async()=>null};await expect(new LearningPathUseCases(repo,{} as any,{} as any).availableCourses('path','student')).rejects.toThrow('LEARNING_PATH_ACTIVE_ENROLLMENT_REQUIRED');});
 it('uses the enrollment version instead of the latest edited path',async()=>{const repo:any={findEnrollment:async()=>({status:'ACTIVE',learningPathVersion:2}),findByVersion:vi.fn(async()=>({isStrictlyOrdered:false,courses:[{courseId:'old',position:1,required:true,prerequisiteCourseIds:[]}]}))};const uc=new LearningPathUseCases(repo,{} as any,{findCompletion:async()=>null} as any);expect(await uc.availableCourses('path','student')).toEqual(['old']);expect(repo.findByVersion).toHaveBeenCalledWith('path',2);});
});
