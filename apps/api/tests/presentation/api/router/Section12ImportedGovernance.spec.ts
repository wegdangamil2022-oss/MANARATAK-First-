import {describe,it,expect,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
import {ImportedCourseAdminRouter} from '../../../../src/presentation/api/router/ImportedCourseAdminRouter';
function app(){
 const scoped:any={importedCourseAdminUseCases:{update:vi.fn(async()=>({id:'c1'}))}};
 const uc:any={execute:vi.fn(async(_kind:any,_id:any,_action:any,_context:any,fn:any)=>({value:await fn(scoped),version:4}))};
 const server=express();server.use(express.json());server.use((req:any,_res,next)=>{req.authUserId='actual-reviewer';next();});server.use('/imported',ImportedCourseAdminRouter.create({courseAdminCommandUseCases:uc} as any));return{server,uc,scoped};
}
describe('P13 imported owner commands',()=>{
 it('requires conditional version before imported course updates',async()=>{const h=app();const response=await request(h.server).patch('/imported/c1').set('X-Review-Reason','Reviewed').send({displayName:'Updated'});expect(response.status).toBe(428);expect(h.uc.execute).not.toHaveBeenCalled();});
 it('uses transactional imported scope and returns its committed owner version',async()=>{const h=app();const response=await request(h.server).patch('/imported/c1').set('If-Match','"3"').set('X-Review-Reason','Reviewed').send({displayName:'Updated'});expect(response.status).toBe(200);expect(response.headers['x-entity-version']).toBe('4');expect(h.scoped.importedCourseAdminUseCases.update).toHaveBeenCalledWith('c1',{displayName:'Updated'});});
});
