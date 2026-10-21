import express from 'express';
import request from 'supertest';
import {createHmac} from 'node:crypto';
import {describe,it,expect,vi,afterEach} from 'vitest';
import {AuthRouter} from '../../../src/presentation/api/router/AuthRouter';
import {SecurityMiddlewareFactory} from '../../../src/presentation/security/SecurityMiddlewareFactory';
import {SecurityService} from '@manaratak/infrastructure';
import {CsrfClientManager} from '@manaratak/shared';
import type {IRateLimiter} from '@manaratak/core';

function fixture() {
 const consume=vi.fn<IRateLimiter['consume']>(async()=>({allowed:true,remaining:5,resetTime:Date.now()+60_000}));
 const security=new SecurityService({consume} as never,{signingSecret:'b02-synthetic-csrf-material-e7c4b0a2d6f8e1c3b5a7d9f0'});
 let refresh='session-one';
 const tokens=()=>({accessToken:'test-access',refreshToken:refresh});
 const authService={login:vi.fn(async()=>tokens()),refreshTokens:vi.fn(async()=>{refresh='session-two';return tokens();}),logoutCurrentSession:vi.fn(async()=>{})};
 const register=vi.fn().mockResolvedValue({identityId:'private-id',email:'person@example.test'});
 const deps={
  authService,identityRepository:{findByEmail:vi.fn().mockResolvedValue({id:{toString:()=> 'user-a'}})},securityService:security,
  tokenProvider:{validateRefreshToken:vi.fn(async(value:string)=>{if(value!==refresh)throw new Error('Invalid refresh');})},
  sessionManager:{findRefreshSession:vi.fn(async()=>({userId:'user-a',sessionId:'session-a',familyId:'family-a'})),isSessionActive:vi.fn(async()=>true),revokeAllSessions:vi.fn()},
  principalAccessValidator:{isAuthenticationAllowed:vi.fn(async()=>true)},
  forgotPasswordUseCase:{execute:vi.fn()},resetPasswordUseCase:{execute:vi.fn().mockResolvedValue({message:'Reset complete'})},
  registerUserUseCase:{execute:register},verifyEmailUseCase:{execute:vi.fn().mockResolvedValue({isEmailVerified:true})},resendVerificationUseCase:{execute:vi.fn().mockResolvedValue({success:true})},
  authRateLimitKey:(value:string)=>createHmac('sha256','synthetic-b02-rate-key').update(value).digest('hex'),
 };
 const app=express();app.use(express.json());
 app.use(SecurityMiddlewareFactory.createCsrfGuard(security,{allowedOrigins:['https://web.example.test','https://admin.example.test']}));
 app.use('/api/v1/auth',AuthRouter.create(deps as unknown as Parameters<typeof AuthRouter.create>[0]));
 app.get('/api/v1/session-resource',(_req,res)=>res.status(refresh==='session-two'?200:401).json({ready:refresh==='session-two'}));
 app.post('/api/v1/private/action',(_req,res)=>res.json({saved:true}));
 app.post('/api/v1/private/auth/login/change',(_req,res)=>res.json({saved:true}));
 return {app,deps,consume,security,register,authService};
}
describe('B02 session and CSRF contract',()=>{
 it.each(['https://web.example.test','https://admin.example.test'])('supports login, bootstrap, mutation, rotation, bootstrap and logout for %s',async origin=>{
  const {app}=fixture();const agent=request.agent(app);
  expect((await agent.post('/api/v1/auth/login').set('Origin',origin).send({email:'person@example.test',password:'test-password'})).status).toBe(200);
  const bootstrap=await agent.get('/api/v1/auth/csrf-token');expect(bootstrap.status).toBe(200);const token=bootstrap.body.data.csrfToken;
  expect((await agent.post('/api/v1/private/action').set('Origin',origin).set('X-CSRF-Token',token)).status).toBe(200);
  expect((await agent.post('/api/v1/auth/refresh').set('Origin',origin).set('X-CSRF-Token',token)).status).toBe(200);
  expect((await agent.post('/api/v1/private/action').set('X-CSRF-Token',token)).status).toBe(403);
  const next=(await agent.get('/api/v1/auth/csrf-token')).body.data.csrfToken;
  expect((await agent.post('/api/v1/auth/logout').set('Origin',origin).set('X-CSRF-Token',next)).status).toBe(200);
  expect((await agent.get('/api/v1/auth/csrf-token')).status).toBe(401);
 });
 it.each(['/api/v1/auth/refresh','/api/v1/private/auth/login/change','/api/v1/auth/login-extra'])('does not exempt a refresh or substring/prefix path: %s',async path=>{
  const {app,authService}=fixture();const response=await request(app).post(path).set('Cookie','manaratak_refresh=session-one');
  expect(response.status).toBe(403);expect(authService.refreshTokens).not.toHaveBeenCalled();
 });
 it.each(['manaratak_access=access-only','manaratak_refresh=session-one; manaratak_access=access'])('does not let a Bearer string exempt an ambient credential: %s',async cookie=>{
  const {app}=fixture();const response=await request(app).post('/api/v1/private/action').set('Cookie',cookie).set('Authorization','Bearer forged-header');
  expect(response.status).toBe(403);
 });
 it('rejects a token issued for another session',async()=>{
  const {app,security}=fixture();const response=await request(app).post('/api/v1/auth/refresh').set('Cookie','manaratak_refresh=session-one').set('X-CSRF-Token',security.generateCsrfToken('other-session'));
  expect(response.status).toBe(403);
 });
 it.each(['/api/v1/auth/login','/api/v1/auth/register','/api/v1/auth/refresh'])('rejects a foreign origin before an auth operation: %s',async path=>{
  const {app,authService,register}=fixture();const response=await request(app).post(path).set('Origin','https://attacker.example.test').send({});
  expect(response.status).toBe(403);expect(response.body.error.code).toBe('CSRF_ORIGIN_DENIED');expect(authService.login).not.toHaveBeenCalled();expect(register).not.toHaveBeenCalled();
 });
 it('honors exemptBearerAuth:false for a cookie-free bearer client',async()=>{
  const {security}=fixture();const app=express();app.use(SecurityMiddlewareFactory.createCsrfGuard(security,{exemptBearerAuth:false}));app.post('/mutate',(_req,res)=>res.sendStatus(204));
  expect((await request(app).post('/mutate').set('Authorization','Bearer test-token')).status).toBe(403);
 });
 it('cannot mint a CSRF token for an inactive server session',async()=>{
  const {app,deps}=fixture();deps.sessionManager.isSessionActive.mockResolvedValue(false);
  expect((await request(app).get('/api/v1/auth/csrf-token').set('Cookie','manaratak_refresh=session-one')).status).toBe(401);
 });
 it('requires explicit reset/forgot dependencies rather than constructing infrastructure',()=>{
  const {deps}=fixture();expect(()=>AuthRouter.create({...deps,resetPasswordUseCase:undefined} as never)).toThrow('AUTH_DEPENDENCIES_REQUIRED');
 });
 it('gives the same accepted registration response for new and existing email addresses',async()=>{
  const {app,register}=fixture();const body={displayName:'Test',primaryEmail:'person@example.test',password:'test-password'};
  const created=await request(app).post('/api/v1/auth/register').send(body);
  register.mockRejectedValueOnce(Object.assign(new Error('duplicate'),{code:'EMAIL_ALREADY_EXISTS'}));
  const duplicate=await request(app).post('/api/v1/auth/register').send(body);
  expect(created.status).toBe(202);expect(duplicate.status).toBe(202);expect(created.body.data).toEqual(duplicate.body.data);expect(created.body.data).not.toHaveProperty('identityId');
 });
 it.each([
  ['/api/v1/auth/register',{displayName:'Test',primaryEmail:'person@example.test',password:'test-password'},'registerUserUseCase'],
  ['/api/v1/auth/verify-email',{token:'synthetic-token'},'verifyEmailUseCase'],
  ['/api/v1/auth/resend-verification',{email:'person@example.test'},'resendVerificationUseCase'],
  ['/api/v1/auth/reset-password',{token:'synthetic-token',newPassword:'test-password'},'resetPasswordUseCase'],
 ] as const)('applies independent keyed account/IP budgets before %s',async(path,body,key)=>{
  const {app,deps,consume}=fixture();consume.mockResolvedValue({allowed:false,remaining:0,resetTime:Date.now()+60_000});
  const response=await request(app).post(path).send(body);expect(response.status).toBe(429);expect(Number(response.headers['retry-after'])).toBeGreaterThan(0);expect(deps[key].execute).not.toHaveBeenCalled();
  const keys=consume.mock.calls.map(call=>String(call[0]));expect(keys.some(value=>value.includes(':account:'))).toBe(true);expect(keys.join(' ')).not.toContain('person@example.test');expect(keys.join(' ')).not.toContain('synthetic-token');
 });
 it('does not silently allow authentication when the rate store fails',async()=>{
  const {app,consume,register}=fixture();consume.mockRejectedValueOnce(new Error('store unavailable'));
  expect((await request(app).post('/api/v1/auth/register').send({displayName:'Test',primaryEmail:'person@example.test',password:'test-password'})).status).toBe(503);expect(register).not.toHaveBeenCalled();
 });
});

afterEach(()=>{vi.unstubAllGlobals();CsrfClientManager.getInstance().clearToken();});
describe('Actual browser client wrappers against the guarded API with an isolated cookie jar',()=>{
 it.each(['web','admin'])('keeps %s login, silent refresh and the next write working after rotation',async client=>{
  const {app}=fixture();const agent=request.agent(app);const origin=client==='web'?'https://web.example.test':'https://admin.example.test';
  const bridge=async(input:RequestInfo|URL,init:RequestInit={})=>{
   const url=new URL(String(input),'http://api.example.test');
   const method=(init.method??'GET').toLowerCase() as 'get'|'post'|'put'|'patch'|'delete';
   let pending=agent[method](url.pathname+url.search).set('Origin',origin);
   new Headers(init.headers).forEach((value,key)=>{pending=pending.set(key,value);});
   if(typeof init.body==='string')pending=pending.send(init.body);
   const response=await pending;const headers=new Headers();
   for(const [key,value] of Object.entries(response.headers))if(typeof value==='string')headers.set(key,value);
   return new Response(JSON.stringify(response.body),{status:response.status,headers});
  };
  vi.stubGlobal('fetch',bridge);
  vi.stubGlobal('window',{fetch:bridge,location:{pathname:'/ar'},localStorage:{removeItem:vi.fn()},sessionStorage:{removeItem:vi.fn()},dispatchEvent:vi.fn()});
  CsrfClientManager.getInstance('/api/v1').clearToken();
  if(client==='web'){
   const {ApiClient,apiFetch}=await import('../../../../web/src/api/client');
   await ApiClient.login('person@example.test','test-password');
   expect((await apiFetch('/api/v1/session-resource')).status).toBe(200);
   expect((await apiFetch('/api/v1/private/action',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).status).toBe(200);
  }else{
   const {adminApiClient}=await import('../../../../admin/src/api/client');
   await adminApiClient.request('/auth/login',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:'person@example.test',password:'test-password'})});
   adminApiClient.setAdminAuthStatus('AUTHORIZED');
   await expect(adminApiClient.request('/session-resource')).resolves.toEqual({ready:true});
   await expect(adminApiClient.request('/private/action',{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'})).resolves.toEqual({saved:true});
  }
 });
});

import {container,registerDependencies} from '../../../src/infrastructure/di/container';
import {RuntimeResourceRegistry} from '../../../src/infrastructure/runtime/RuntimeResourceRegistry';
import {asValue} from '@manaratak-vendor/awilix-core';
describe('Production-like auth composition fails closed',()=>{
 it.each([
  {NODE_ENV:'production'},
  {NODE_ENV:'staging'},
  {NODE_ENV:'development',MANARATAK_RUNTIME_PROFILE:'production'},
 ])('does not resolve local reset/email repositories, captured delivery or a default rate key: %j',env=>{
  const settings={...env,CSRF_SECRET:'dev-csrf-secret-at-least-32-chars-long',EMAIL_DELIVERY_PROVIDER:'captured'};
  registerDependencies(settings,null,new RuntimeResourceRegistry(settings,null,undefined,false));
  container.register({prisma:asValue(null)});
  expect(()=>container.resolve('passwordResetTokenRepository')).toThrow('AUTH_PERSISTENCE_REQUIRED');
  expect(()=>container.resolve('emailVerificationTokenRepository')).toThrow('AUTH_PERSISTENCE_REQUIRED');
  expect(()=>container.resolve('emailDeliveryGateway')).toThrow('not configured');
  expect(()=>container.resolve('authRateLimitKey')).toThrow('AUTH_RATE_LIMIT_SECRET_REQUIRED');
 });
});
it('does not expose captured auth tokens from a diagnostic route',async()=>{
 const {app}=fixture();expect((await request(app).get('/api/v1/auth/diagnostic/captured-emails')).status).toBe(404);
});
