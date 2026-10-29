import express from 'express';
import request from 'supertest';
import {describe,expect,it,vi} from 'vitest';
import {createExecutiveDashboardRouter,catalogPermissions} from '../../../../src/presentation/api/router/ExecutiveDashboardRouter';

function fixture(authenticated=true) {
  const readers=Object.fromEntries(Object.keys(catalogPermissions).map(key=>[key,vi.fn(async()=>({total:7,data:[{private:'owner-only'}]}))]));
  const evaluator={evaluatePermission:vi.fn(),evaluatePermissions:vi.fn(async(_id:string,permissions:string[])=>permissions.map(permission=>({isGranted:permission!=='admin:cms:view'})))};
  const app=express();app.use((req,_res,next)=>{if(authenticated)req.authUserId='staff';next();});
  app.use(createExecutiveDashboardRouter({} as never,evaluator as never,readers as never));
  return {app,readers,evaluator};
}
describe('Dashboard catalog batch',()=>{
  it('checks every current permission in one batch and returns only aggregate counts',async()=>{
    const s=fixture(),r=await request(s.app).get('/catalogs?keys=majors,universities,cms');
    expect(r.status).toBe(200);expect(r.headers['cache-control']).toBe('no-store');
    expect(s.evaluator.evaluatePermissions).toHaveBeenCalledTimes(1);
    expect(r.body.sources).toEqual({majors:{state:'available',total:7},universities:{state:'available',total:7},cms:{state:'forbidden'}});
    expect(s.readers.cms).not.toHaveBeenCalled();expect(JSON.stringify(r.body)).not.toContain('owner-only');
  });
  it('does not reuse a grant on the next request and isolates an owner failure',async()=>{
    const s=fixture();s.readers.majors.mockRejectedValueOnce(new Error('private storage detail'));
    const r=await request(s.app).get('/catalogs?keys=majors,universities');
    expect(r.body.sources).toEqual({majors:{state:'unavailable'},universities:{state:'available',total:7}});
    s.evaluator.evaluatePermissions.mockResolvedValueOnce([{isGranted:false},{isGranted:false}]);
    const revoked=await request(s.app).get('/catalogs?keys=majors,universities');
    expect(revoked.body.sources.majors.state).toBe('forbidden');expect(s.readers.majors).toHaveBeenCalledTimes(1);
  });
  it('rejects unauthenticated or arbitrary reader selections',async()=>{
    expect((await request(fixture(false).app).get('/catalogs?keys=majors')).status).toBe(401);
    const s=fixture();for(const query of ['keys=secrets','keys=','keys=majors&actor=other'])expect((await request(s.app).get('/catalogs?'+query)).status).toBe(400);
    expect(s.evaluator.evaluatePermissions).not.toHaveBeenCalled();
  });
});
