import {describe,it,expect,vi} from 'vitest';
import {PrismaCourseCurriculumRepository} from '../../../infrastructure/src/courses/PrismaCourseCurriculumRepository';
import {CourseProgressUseCases} from '../../src/courses/use-cases/CourseProgressUseCases';
import {CourseCurriculumUseCases} from '../../src/courses/use-cases/CourseCurriculumUseCases';
import {CourseAdminCommandUseCases} from '../../src/courses/use-cases/CourseAdminCommandUseCases';
describe('P13 follow-up integrity',()=>{
 it('does not start a nested Prisma transaction on an already bound curriculum repository',async()=>{
  const tx:any={courseModule:{findMany:async()=>[{id:'m1'}],update:vi.fn(async()=>({}))}};
  const repo=new PrismaCourseCurriculumRepository({} as any).withTransaction({boundaryId:'tx',transactionClient:tx} as any);
  await repo.reorderModules('c1',[{id:'m1',position:1}]);expect(tx.courseModule.update).toHaveBeenCalledTimes(2);
 });
 it('rejects duplicate reorder IDs before changing positions',async()=>{
  const courses:any={findById:async()=>({id:'c1',originType:'NATIVE_MANARATAK_COURSE',status:'DRAFT'})};
  const curriculum:any={getCurriculumSnapshot:async()=>({modules:[{id:'m1'}]}),reorderModules:vi.fn()};
  await expect(new CourseCurriculumUseCases(courses,curriculum).reorderModules('c1',[{id:'m1',position:1},{id:'m1',position:2}])).rejects.toThrow('COURSE_MODULE_REORDER_MUST_INCLUDE_ALL_MODULES');expect(curriculum.reorderModules).not.toHaveBeenCalled();
 });
 it('does not count a student-forged COMPLETED label at 10 percent',async()=>{
  let stored:any;const courses:any={findById:async()=>({id:'c1',originType:'NATIVE_MANARATAK_COURSE',status:'PUBLISHED'})};
  const curriculum:any={getCurriculumSnapshot:async()=>({modules:[{id:'m1',status:'PUBLISHED'}],lessons:[{id:'l1',moduleId:'m1',lessonType:'VIDEO',status:'PUBLISHED'}]})};
  const progress:any={findEnrollment:async()=>({id:'enrollment',status:'ACTIVE',progressPercentage:0}),withTransaction:()=>progress,
    upsertLessonProgress:async(data:any)=>{stored=data;},listLessonProgress:async()=>[stored],updateEnrollmentProgress:vi.fn(async()=>({status:'ACTIVE'})),getStudentProgressSnapshot:async()=>({})};
  const atomic:any={execute:async(_def:any,fn:any)=>fn({boundaryId:'tx',transactionClient:{}})};
  await new CourseProgressUseCases(courses,curriculum,progress,undefined,undefined,atomic).markLessonProgress({courseId:'c1',lessonId:'l1',studentReferenceId:'s1',status:'COMPLETED',progressPercentage:10} as any);
  expect(stored.status).toBe('IN_PROGRESS');expect(progress.updateEnrollmentProgress).toHaveBeenCalledWith('c1','s1',0);
 });
 it('keeps actual created identity in audit metadata and outbox payload',async()=>{
  const repo:any={withTransaction:()=>repo};let definition:any;
  const atomic:any={execute:async(def:any,fn:any)=>{definition=def;return fn({boundaryId:'tx',transactionClient:{}});}};
  const uc=new CourseAdminCommandUseCases(repo,repo,atomic,()=>({} as any));
  await uc.execute('COURSE',undefined,'CREATE',{actorId:'reviewer',reason:'Create approved draft'},async()=>({id:'actual-course'}));
  expect(definition.auditMetadata.entityReference.id).toBe('actual-course');expect(definition.outbox.payload.entityId).toBe('actual-course');
 });
});
