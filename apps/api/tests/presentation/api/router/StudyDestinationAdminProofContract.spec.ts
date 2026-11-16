import express from 'express';
import request from 'supertest';
import {describe,expect,it,vi} from 'vitest';
vi.mock('../../../../src/infrastructure/di/container.js',()=>({container:{resolve:vi.fn()}}));
import {StudyDestinationAdminRouter} from '../../../../src/presentation/api/router/StudyDestinationAdminRouter';
function fixture(){
 const owner={upsertProfile:vi.fn(async()=>({saved:true})),verifySources:vi.fn(async()=>({verified:true})),publish:vi.fn(async()=>({published:true}))};
 const app=express();app.use(express.json());app.use((req,_res,next)=>{req.authUserId='server-reviewer';next();});
 app.use(StudyDestinationAdminRouter.create({studyDestinationUseCases:owner as any,crossDomainGraphReadService:{} as any},{evaluatePermission:async()=>({isGranted:true})} as any));return {app,owner};
}
const review={reason:'Independent review',expectedRevision:1,fingerprint:'a'.repeat(64),authorities:[{origin:'https://education.gov.ye',authorityName:'Education authority',evidenceUrl:'https://education.gov.ye/about'}]};
describe('Study destination administrative source-proof contracts',()=>{
 it('rejects forged evidence verification time before owner writes',async()=>{const f=fixture();const res=await request(f.app).put('/YE/profile').set('If-Match','1').set('X-Review-Reason','Review update').send({evidenceSources:[{label:'x',url:'https://education.gov.ye/facts',sourceType:'GOVERNMENT',verifiedAt:'2999-01-01T00:00:00.000Z'}]});expect(res.status).toBe(400);expect(f.owner.upsertProfile).not.toHaveBeenCalled();});
 it('binds reviewer to authenticated principal and owner revision',async()=>{const f=fixture();const res=await request(f.app).post('/YE/verify-source').send(review);expect(res.status).toBe(200);expect(f.owner.verifySources).toHaveBeenCalledWith('YE',expect.objectContaining({actorId:'server-reviewer',expectedRevision:1}),{fingerprint:review.fingerprint,authorities:review.authorities});});
 it('rejects caller reviewer identity rather than stripping it silently',async()=>{const f=fixture();const res=await request(f.app).post('/YE/verify-source').send({...review,actorId:'forged'});expect(res.status).toBe(400);expect(f.owner.verifySources).not.toHaveBeenCalled();});
 it('requires review reason for publication',async()=>{const f=fixture();const res=await request(f.app).post('/YE/publish').send({expectedRevision:1});expect(res.status).toBe(400);expect(f.owner.publish).not.toHaveBeenCalled();});
});
