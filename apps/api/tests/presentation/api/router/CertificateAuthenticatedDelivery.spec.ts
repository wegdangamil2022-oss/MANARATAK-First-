import express from 'express';import request from 'supertest';import {describe,expect,it,vi} from 'vitest';
import {CertificateAdminRouter} from '../../../../src/presentation/api/router/CertificateAdminRouter';
function setup(allowed=true,revokeDuringRead=false){
 const evaluator={evaluatePermission:vi.fn(async()=>({isGranted:allowed}))},reader={readAuthenticatedDelivery:vi.fn(async()=>{if(revokeDuringRead)allowed=false;return{bytes:Buffer.from('%PDF-industrial'),mimeType:'application/pdf',checksumSha256:'a'.repeat(64)};})},certificates={deliveryArtifact:vi.fn(async()=> 'artifact')};
 const app=express();app.use(express.json());app.use((req:any,_res,next)=>{req.authUserId='admin';next();});app.use('/certificates',CertificateAdminRouter.create({certificateUseCases:certificates as never,authEvaluatorService:evaluator as never,processAssetLifecycleUseCase:reader}));return{app,reader,certificates};
}
describe('admin authenticated certificate content',()=>{
 it('returns private bytes with no cache or provider URL',async()=>{const f=setup(),r=await request(f.app).get('/certificates/id/artifacts/pdf/content');expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');expect(r.headers['x-content-type-options']).toBe('nosniff');expect(Buffer.from(r.body).toString()).toBe('%PDF-industrial');});
 it('denies missing permission before storage access',async()=>{const f=setup(false),r=await request(f.app).get('/certificates/id/artifacts/pdf/content');expect(r.status).toBe(403);expect(f.reader.readAuthenticatedDelivery).not.toHaveBeenCalled();});
 it('denies bytes if permission is removed while storage is reading',async()=>{const f=setup(true,true),r=await request(f.app).get('/certificates/id/artifacts/pdf/content');expect(r.status).toBe(403);expect(r.body.error).toBe('CERTIFICATE_PERMISSION_DENIED');});
 it('retires direct provider grants with a clear authorized response',async()=>{const f=setup(),r=await request(f.app).post('/certificates/id/artifacts/pdf/delivery-grant').send({});expect(r.status).toBe(410);expect(r.body).toEqual({error:'CERTIFICATE_AUTHENTICATED_DELIVERY_REQUIRED'});expect(f.reader.readAuthenticatedDelivery).not.toHaveBeenCalled();});
});
