import {expect,it,vi} from 'vitest';
import express from 'express';
import request from 'supertest';
vi.mock('../../../src/infrastructure/di/container.js',()=>({container:{resolve:vi.fn()}}));
import {SecurityMiddlewareFactory} from '../../../src/presentation/security/SecurityMiddlewareFactory';
import {AuthRouter} from '../../../src/presentation/api/router/AuthRouter';
import {IdentityPrincipalAccessValidator} from '../../../../../packages/application/src/auth/IdentityPrincipalAccessValidator';
import {LifeStatus,AccountAccessState} from '@manaratak/domain';

it.each(['identity','credential'])('propagates %s storage unavailability without reporting account suspension',async failure=>{
  const identity={status:LifeStatus.ACTIVE,account:{accessState:AccountAccessState.ACTIVE},user:{contactRegistry:{isEmailVerified:true}}};
  const validator=new IdentityPrincipalAccessValidator({findById:failure==='identity'?vi.fn().mockRejectedValue(new Error('PRIVATE_DB_DETAIL')):vi.fn().mockResolvedValue(identity)} as any,{find:vi.fn().mockRejectedValue(new Error('PRIVATE_DB_DETAIL'))} as any);
  await expect(validator.isAuthenticationAllowed('existing-admin')).rejects.toThrow('AUTHENTICATION_STATE_UNAVAILABLE');
});

it.each(['admin-session','admin-lifecycle','me-session','me-lifecycle'])('returns 503 for %s failure without revoking valid sessions',async scenario=>{
  const sessions={isSessionActive:scenario.endsWith('session')?vi.fn().mockRejectedValue(new Error('PRIVATE_DB_DETAIL')):vi.fn().mockResolvedValue(true),revokeAllSessions:vi.fn()};
  const validator={isAuthenticationAllowed:vi.fn().mockRejectedValue(new Error('AUTHENTICATION_STATE_UNAVAILABLE'))};
  const tokenProvider={verifyAccessTokenSync:()=>({userId:'existing-admin',sessionId:'session-1'})};
  const app=express();
  if(scenario.startsWith('admin')){
    app.use(SecurityMiddlewareFactory.createAdminGuard({mode:'strict',tokenProvider:tokenProvider as any,sessionManager:sessions as any,principalAccessValidator:validator}));
    app.get('/protected',(_req,res)=>res.status(200).json({private:true}));
  }else{
    app.use(AuthRouter.create({authService:{} as any,identityRepository:{} as any,securityService:{} as any,tokenProvider:tokenProvider as any,sessionManager:sessions as any,principalAccessValidator:validator,forgotPasswordUseCase:{} as any,resetPasswordUseCase:{} as any,authRateLimitKey:value=>value}));
  }
  const response=await request(app).get(scenario.startsWith('admin')?'/protected':'/me').set('Cookie','manaratak_access=synthetic-token');
  expect(response.status).toBe(503);expect(sessions.revokeAllSessions).not.toHaveBeenCalled();
  expect(JSON.stringify(response.body)).not.toContain('PRIVATE_DB_DETAIL');expect(response.body.private).toBeUndefined();
});

it('preserves a genuine inactive-account denial',async()=>{
  const validator=new IdentityPrincipalAccessValidator({findById:vi.fn().mockResolvedValue({status:LifeStatus.ACTIVE,account:{accessState:AccountAccessState.ACTIVE},user:{contactRegistry:{isEmailVerified:true}}})} as any,{find:vi.fn().mockResolvedValue({disabled:true})} as any);
  await expect(validator.isAuthenticationAllowed('existing-admin')).resolves.toBe(false);
});

it('does not repeat current-user lifecycle reads and rejects a subsequent inactive request',async()=>{
  let allowed=true;
  const validator={isAuthenticationAllowed:vi.fn(async()=>allowed)};
  const sessions={isSessionActive:vi.fn().mockResolvedValue(true)};
  const app=express();
  app.use('/auth',AuthRouter.create({
    authService:{} as any,identityRepository:{findById:vi.fn().mockResolvedValue({})} as any,
    securityService:{} as any,tokenProvider:{verifyAccessTokenSync:()=>({userId:'existing-admin',sessionId:'session-1'})} as any,
    sessionManager:sessions as any,principalAccessValidator:validator,
    forgotPasswordUseCase:{} as any,resetPasswordUseCase:{} as any,authRateLimitKey:value=>value,
  }));
  expect((await request(app).get('/auth/me').set('Cookie','manaratak_access=synthetic-token')).status).toBe(200);
  expect(validator.isAuthenticationAllowed).toHaveBeenCalledTimes(1);
  allowed=false;
  expect((await request(app).get('/auth/me').set('Cookie','manaratak_access=synthetic-token')).status).toBe(401);
  expect(validator.isAuthenticationAllowed).toHaveBeenCalledTimes(2);
  expect(sessions.isSessionActive).toHaveBeenCalledTimes(2);
});

it('checks lifecycle once per authenticated request and rechecks it on the next request',async()=>{
  let allowed=true;
  const validator={isAuthenticationAllowed:vi.fn(async()=>allowed)};
  const sessionManager={isSessionActive:vi.fn().mockResolvedValue(true)};
  const guard=SecurityMiddlewareFactory.createAdminGuard({mode:'strict',tokenProvider:{verifyAccessTokenSync:()=>({userId:'existing-admin',sessionId:'session-1'})} as any,sessionManager:sessionManager as any,principalAccessValidator:validator});
  const invoke=async()=>{
    const response={statusCode:200,status(code:number){this.statusCode=code;return this;},json(){return this;},locals:{},setHeader:vi.fn()};
    const next=vi.fn();
    await guard({headers:{authorization:'Bearer synthetic-token'},method:'GET'} as any,response as any,next);
    return {response,next};
  };
  const first=await invoke();
  expect(first.next).toHaveBeenCalledOnce();expect(validator.isAuthenticationAllowed).toHaveBeenCalledTimes(1);
  allowed=false;
  const second=await invoke();
  expect(second.next).not.toHaveBeenCalled();expect(second.response.statusCode).toBe(401);
  expect(validator.isAuthenticationAllowed).toHaveBeenCalledTimes(2);
  expect(sessionManager.isSessionActive).toHaveBeenCalledTimes(2);
});

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
