import {describe,it,expect,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {CourseAdminRouter} from '../../../../src/presentation/api/router/CourseAdminRouter';
function app(fail=false){
 const scoped:any={courseCurriculumUseCases:{createModule:vi.fn(async()=>({id:'module'}))}};
 const uc:any={execute:vi.fn(async(_kind:any,_id:any,_action:any,_context:any,fn:any)=>{const value=await fn(scoped);if(fail)throw new Error('OUTBOX_FAILED');return{value,version:4};})};
 const server=express();server.use(express.json());server.use((req:any,_res,next)=>{req.authUserId='actual-reviewer';next();});server.use('/courses',CourseAdminRouter.create({courseAdminCommandUseCases:uc} as any));
 return {server,uc,scoped};
}
describe('P13 API conditional commands and commit response',()=>{
 it('requires a version before mutating curriculum',async()=>{const h=app();const response=await request(h.server).post('/courses/c1/modules').set('X-Review-Reason','Reviewed').send({title:'Unit',position:1});expect(response.status).toBe(428);expect(h.uc.execute).not.toHaveBeenCalled();});
 it('uses the authenticated actor and returns committed version',async()=>{const h=app();const response=await request(h.server).post('/courses/c1/modules').set('If-Match','"3"').set('X-Review-Reason','Reviewed').send({title:'Unit',position:1,actorId:'forged'});expect(response.status).toBe(201);expect(response.headers['x-entity-version']).toBe('4');expect(h.uc.execute.mock.calls[0][3].actorId).toBe('actual-reviewer');expect(h.scoped.courseCurriculumUseCases.createModule).toHaveBeenCalled();});
 it('does not send a success body when the transaction fails after child writes',async()=>{const h=app(true);const response=await request(h.server).post('/courses/c1/modules').set('If-Match','"3"').set('X-Review-Reason','Reviewed').send({title:'Unit',position:1});expect(response.status).not.toBe(201);expect(response.body).not.toEqual({id:'module'});});
});
