import {expect,it,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
vi.mock('../../../src/infrastructure/di/container.js',()=>({container:{resolve:vi.fn()}}));
import {SecurityMiddlewareFactory} from '../../../src/presentation/security/SecurityMiddlewareFactory';

it.each(['lookup','revocation'])('handles %s storage failure without rejecting or granting access',async failure=>{
  const storageError=new Error('SYNTHETIC_PRIVATE_STORAGE_FAILURE');
  const guard=SecurityMiddlewareFactory.createAdminGuard({mode:'strict',principalAccessValidator:{isAuthenticationAllowed:failure==='lookup'?vi.fn().mockRejectedValue(storageError):vi.fn().mockResolvedValue(false)} as any,sessionManager:{revokeAllSessions:vi.fn().mockRejectedValue(storageError)} as any});
  const response={statusCode:200,payload:undefined as unknown,status(code:number){this.statusCode=code;return this;},json(value:unknown){this.payload=value;return this;}};
  const next=vi.fn();
  await expect(guard({authUserId:'existing-admin',headers:{}} as any,response as any,next)).resolves.toBeUndefined();
  expect(next).not.toHaveBeenCalled();expect(response.statusCode).toBe(503);expect(response.payload).toMatchObject({error:{code:'ADMIN_AUTH_UNAVAILABLE'}});expect(JSON.stringify(response.payload)).not.toContain(storageError.message);
});

it('keeps liveness available after a failed authenticated request and preserves inactive-account rejection',async()=>{
  const app=express();app.get('/health',(_req,res)=>res.sendStatus(204));
  const revoke=vi.fn().mockRejectedValueOnce(new Error('SYNTHETIC_DATABASE_TIMEOUT')).mockResolvedValue(undefined);
  app.use((req,_res,next)=>{req.authUserId='existing-admin';next();});
  app.use(SecurityMiddlewareFactory.createAdminGuard({mode:'strict',principalAccessValidator:{isAuthenticationAllowed:vi.fn().mockResolvedValue(false)} as any,sessionManager:{revokeAllSessions:revoke} as any}));
  const protectedHandler=vi.fn((_req,res)=>res.sendStatus(204));app.get('/protected',protectedHandler);
  expect((await request(app).get('/protected')).status).toBe(503);
  expect((await request(app).get('/health')).status).toBe(204);
  expect((await request(app).get('/protected')).status).toBe(401);
  expect(protectedHandler).not.toHaveBeenCalled();expect(revoke).toHaveBeenCalledWith('existing-admin');
});
