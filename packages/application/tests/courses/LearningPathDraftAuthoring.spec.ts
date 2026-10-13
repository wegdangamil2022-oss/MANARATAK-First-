import {describe,expect,it,vi} from 'vitest';
import {LearningPathUseCases} from '../../src/courses/use-cases/LearningPathUseCases';
function fixture(status='DRAFT'){const repo:any={findById:async()=>({id:'p',status}),updateDraft:vi.fn(async(id,input)=>({id,...input,version:2}))};const courses:any={findById:async(id:string)=>({id,originType:'NATIVE_MANARATAK_COURSE'})};return {repo,service:new LearningPathUseCases(repo,courses,{} as any)};}
const input={title:'Path',completionLogic:'ALL' as const,courses:[{courseId:'a',position:1,required:true,prerequisiteCourseIds:[]},{courseId:'b',position:2,required:true,prerequisiteCourseIds:['a']}]};
describe('Learning path owner draft authoring',()=>{
 it('preserves canonical course IDs/prerequisites in a new draft version',async()=>{const f=fixture();const result=await f.service.updateDraft('p',input);expect(result.courses).toEqual(input.courses);expect(result.version).toBe(2);});
 it('blocks structure editing after publication',async()=>{const f=fixture('PUBLISHED');await expect(f.service.updateDraft('p',input)).rejects.toThrow('DRAFT_REQUIRED');expect(f.repo.updateDraft).not.toHaveBeenCalled();});
 it('rejects cycles before persistence',async()=>{const f=fixture();await expect(f.service.updateDraft('p',{...input,courses:input.courses.map(row=>({...row,prerequisiteCourseIds:[row.courseId==='a'?'b':'a']}))})).rejects.toThrow('CYCLE');expect(f.repo.updateDraft).not.toHaveBeenCalled();});
 it('rejects duplicate sequence positions',async()=>{const f=fixture();await expect(f.service.updateDraft('p',{...input,courses:input.courses.map(row=>({...row,position:1}))})).rejects.toThrow('DUPLICATE_POSITION');});
 it('requires native course owner facts',async()=>{const repo:any={findById:async()=>({status:'DRAFT'}),updateDraft:vi.fn()};const service=new LearningPathUseCases(repo,{findById:async()=>({originType:'EXTERNAL_IMPORTED_COURSE'})} as any,{} as any);await expect(service.updateDraft('p',input)).rejects.toThrow('NATIVE_COURSE_REQUIRED');});
});
