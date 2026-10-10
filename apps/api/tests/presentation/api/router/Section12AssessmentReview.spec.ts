import {describe,expect,it,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {CourseAdminRouter} from '../../../../src/presentation/api/router/CourseAdminRouter';
const submittedAt='2026-10-10T12:00:00.000Z';
function harness(error?:string){
  const reviews:any={gradeAssessment:vi.fn(async()=>{if(error)throw new Error(error);return{status:'PASSED',score:75};}),listPendingAssessments:vi.fn(async()=>[])};
  const commands:any={execute:vi.fn()};const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.authUserId='server-reviewer';next();});
  app.use('/courses',CourseAdminRouter.create({courseProgressUseCases:reviews,courseAdminCommandUseCases:commands} as any));return{app,reviews,commands};
}
const body={expectedSubmittedAt:submittedAt,questionScores:{essay:3},feedback:'Good',reason:'Rubric reviewed'};
describe('P13 admin assessment review API',()=>{
  it('grades with the authenticated actor independently of published curriculum editing',async()=>{const h=harness();const response=await request(h.app).post('/courses/c/assessment-reviews/a/grade').send(body);expect(response.status).toBe(200);expect(h.reviews.gradeAssessment.mock.calls[0]).toEqual(['c','a',body,{actorId:'server-reviewer',source:'admin-course-assessment-api',correlationId:undefined}]);expect(h.commands.execute).not.toHaveBeenCalled();});
  it('rejects caller supplied final scores or actor identity',async()=>{const h=harness();const response=await request(h.app).post('/courses/c/assessment-reviews/a/grade').send({...body,score:100,actorId:'forged'});expect(response.status).toBe(400);expect(h.reviews.gradeAssessment).not.toHaveBeenCalled();});
  it('returns 409 for a concurrent grading conflict',async()=>{const h=harness('COURSE_ASSESSMENT_REVIEW_CONFLICT');const response=await request(h.app).post('/courses/c/assessment-reviews/a/grade').send(body);expect(response.status).toBe(409);});
  it('does not return success when audit/outbox commit fails',async()=>{const h=harness('OUTBOX_FAILED');const response=await request(h.app).post('/courses/c/assessment-reviews/a/grade').send(body);expect(response.status).toBe(500);expect(response.body).toEqual({error:'COURSE_OPERATION_FAILED'});});
  it('bounds pending review pagination',async()=>{const h=harness();const response=await request(h.app).get('/courses/c/assessment-reviews?pageSize=51');expect(response.status).toBe(400);expect(h.reviews.listPendingAssessments).not.toHaveBeenCalled();});
});
