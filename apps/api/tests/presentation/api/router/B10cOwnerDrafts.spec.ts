import {describe,it,expect,vi} from 'vitest';
import express from 'express';import request from 'supertest';
vi.mock('../../../../src/presentation/security/SecurityMiddlewareFactory.js',()=>({SecurityMiddlewareFactory:{createAdminPermissionGuard:(permission:string)=>(req:any,res:any,next:any)=>{if(!req.authUserId)return res.status(401).json({error:'AUTH_REQUIRED'});if(req.get('X-Deny')===permission)return res.status(403).json({error:'DENIED'});next();}}}));
import {ScholarshipAdminRouter} from '../../../../src/presentation/api/router/ScholarshipAdminRouter';
import {MajorAdminRouter} from '../../../../src/presentation/api/router/MajorAdminRouter';
import {UniversityAdminRouter} from '../../../../src/presentation/api/router/UniversityAdminRouter';
const base={displayName:'Example',sourceUri:'https://example.org/source',sourceHash:'a'.repeat(64),reason:'Reviewed'};
function harness(owner:'majors'|'universities') {const uc:any={createDraft:vi.fn(async()=>({id:'created',status:'READY_TO_REVIEW'}))};const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.authUserId=req.get('X-Actor');next();});app.use('/owner',owner==='majors'?MajorAdminRouter.create({adminMajorUseCases:uc}):UniversityAdminRouter.create({adminUniversityUseCases:uc}));return {app,uc};}
describe('B10c creation route authority',()=>{
 it.each(['majors','universities'] as const)('%s refuses anonymous and forbidden creation',async owner=>{const h=harness(owner);expect((await request(h.app).post('/owner').send({})).status).toBe(401);expect((await request(h.app).post('/owner').set('X-Actor','editor').set('X-Deny',`admin:${owner}:manage`).send({})).status).toBe(403);expect(h.uc.createDraft).not.toHaveBeenCalled();});
 it.each(['majors','universities'] as const)('%s creates private draft with server actor and rejects lifecycle injection',async owner=>{const h=harness(owner);const body=owner==='majors'?{...base,level:'BACHELOR',degreeLevelId:'11111111-1111-4111-8111-111111111111',academicFieldId:'22222222-2222-4222-8222-222222222222'}:{...base,officialWebsite:'https://example.org'};expect((await request(h.app).post('/owner').set('X-Actor','editor').send(body)).status).toBe(201);expect(h.uc.createDraft).toHaveBeenCalledWith(body,expect.objectContaining({actorId:'editor',reason:'Reviewed'}));expect((await request(h.app).post('/owner').set('X-Actor','editor').send({...body,status:'PUBLISHED'})).status).toBe(400);expect((await request(h.app).post('/owner').set('X-Actor','editor').send({...body,actorId:'forged'})).status).toBe(400);});
});

describe('B10c scholarship creation contract',()=>{
 it('requires manage permission and refuses publication/actor injection',async()=>{const uc:any={createScholarship:vi.fn(async()=>({id:'draft',publicationStatus:'DRAFT'}))};const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.authUserId=req.get('X-Actor');next();});app.use('/owner',ScholarshipAdminRouter.create({adminScholarshipUseCases:uc}));const body={displayName:'Award',degreeLevel:'Master',fundingCoverage:'Tuition',officialSourceUrl:base.sourceUri,reason:'Reviewed'};
 expect((await request(app).post('/owner').send(body)).status).toBe(401);
 expect((await request(app).post('/owner').set('X-Actor','editor').set('X-Deny','admin:scholarships:manage').send(body)).status).toBe(403);
 expect((await request(app).post('/owner').set('X-Actor','editor').send({...body,publicationStatus:'PUBLISHED'})).status).toBe(400);
 const response=await request(app).post('/owner').set('X-Actor','editor').send(body);expect(response.status).toBe(201);expect(response.body.publicationStatus).toBe('DRAFT');expect(uc.createScholarship).toHaveBeenCalledWith(expect.objectContaining({displayName:'Award'}),expect.objectContaining({actorId:'editor',reason:'Reviewed'}));
 });
});
