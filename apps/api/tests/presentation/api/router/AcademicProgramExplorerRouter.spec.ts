import express from 'express';import request from 'supertest';import {describe,it,expect,vi}from'vitest';
import {AcademicProgramExplorerRouter}from'../../../../src/presentation/api/router/AcademicProgramExplorerRouter';
function setup(){const query=vi.fn().mockResolvedValue({items:[],total:0});const app=express();app.use('/explorer',AcademicProgramExplorerRouter.create({academicProgramExplorerUseCases:{query}as never,authEvaluatorService:{}as never}));return{app,query};}
describe('country program owner filter forwarding',()=>{
 it('combines country, university, degree and text in one bounded owner query',async()=>{const f=setup();const response=await request(f.app).get('/explorer?countryReferenceId=country-1&universityId=university-1&degreeLevelId=degree-1&search=Engineering&limit=20');expect(response.status).toBe(200);expect(f.query).toHaveBeenCalledWith(expect.objectContaining({countryReferenceId:'country-1',universityId:'university-1',degreeLevelId:'degree-1',search:'Engineering',limit:20}),true);});
 it('rejects private visibility on the public endpoint and excessive search input',async()=>{const f=setup();expect((await request(f.app).get('/explorer?visibility=ADMIN_ALL')).status).toBe(400);expect((await request(f.app).get('/explorer?search='+'a'.repeat(201))).status).toBe(400);expect(f.query).not.toHaveBeenCalled();});
});
