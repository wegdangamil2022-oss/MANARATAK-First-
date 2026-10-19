import type { Express } from 'express';
import type { PrismaClient } from '@prisma/client';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { asValue } from '@absheer-vendor/awilix-core';
import { createApiApp } from '../../../src/app';
import { container } from '../../../src/infrastructure/di/container';
import { PrismaSearchRequestRepository } from '@absheer/infrastructure';
import { SearchResult } from '@absheer/domain';

describe('B01 real API mount with isolated persistence and credentials',()=>{
 let app:Express;
 const rows=new Map<string,Record<string, unknown>>();
 const findMany=vi.fn(async({where}:{where:Record<string,unknown>})=>[...rows.values()].filter(row=>Object.entries(where).every(([key,value])=>row[key]===value)));
 const db={
  $disconnect:vi.fn().mockResolvedValue(undefined),
  $queryRaw:vi.fn().mockRejectedValue(new Error('No database access in B01 source gate')),
  apiSearchRequestRecord:{
   upsert:vi.fn(async({where,create,update}:{where:{id:string};create:Record<string,unknown>;update:Record<string,unknown>})=>{rows.set(where.id,rows.has(where.id)?{...rows.get(where.id),...update}:{...create});}),
   findMany,
  },
 };
 const searchPublic=vi.fn().mockResolvedValue({items:[],hasMore:false,nextCursor:null});
 const evaluatePermission=vi.fn(async(actor:string,permission:string)=>({isGranted:actor!=='no-permissions'&&['admin:search:execute','admin:search:history:read'].includes(permission)}));
 beforeAll(async()=>{
  app=await createApiApp({resetCache:true,connectExternalServices:false,databaseClient:db,env:{NODE_ENV:'development',LOG_LEVEL:'error'}});
  // Replace only external credential/persistence boundaries, keeping the actual
  // app mount, lazy DI router, auth/permission guards, use case and Prisma adapter.
  container.register({
   tokenProvider:asValue({verifyAccessToken:async(token:string)=>{
    if(!['actor-a','actor-b','no-permissions'].includes(token))throw new Error('invalid token');
    return {userId:token,sessionId:`session-${token}`};
   }}),
   sessionManager:asValue({isSessionActive:async()=>true,revokeAllSessions:async()=>{}}),
   principalAccessValidator:asValue({isAuthenticationAllowed:async()=>true}),
   mfaUseCases:asValue({sessionAuthenticated:async()=>true,assertFresh:async()=>{}}),
   authEvaluatorService:asValue({evaluatePermission}),
   searchRequestRepo:asValue(new PrismaSearchRequestRepository(db as unknown as PrismaClient)),
   searchEngineGateway:asValue({searchPublic,execute:async()=>new SearchResult(0,1)}),
  });
 },15000);
 afterAll(async()=>{await app?.locals.runtimeResourceRegistry?.closeAll();});
 it('keeps anonymous public search available at the actual /api/v1 mount',async()=>{
  const response=await request(app).get('/api/v1/search/public?q=study&locale=en');
  expect(response.status).toBe(200);expect(searchPublic).toHaveBeenCalledWith(expect.objectContaining({query:'study',locale:'en'}));
 });
 it('blocks anonymous execution and history before persistence on the actual mount',async()=>{
  const beforeWrites=db.apiSearchRequestRecord.upsert.mock.calls.length;
  const beforeReads=findMany.mock.calls.length;
  expect((await request(app).post('/api/v1/search').send({scope:'PUBLIC_CATALOG',criteria:{query:'private search'},pagination:{page:1,limit:10}})).status).toBe(401);
  expect((await request(app).get('/api/v1/search/history/guessed-reference')).status).toBe(401);
  expect(db.apiSearchRequestRecord.upsert).toHaveBeenCalledTimes(beforeWrites);expect(findMany).toHaveBeenCalledTimes(beforeReads);
 });
 it('does not let an authenticated user without search capability use either private route',async()=>{
  expect((await request(app).post('/api/v1/search').set('Authorization','Bearer no-permissions').send({scope:'PUBLIC_CATALOG',criteria:{query:'study'},pagination:{page:1,limit:10}})).status).toBe(403);
  expect((await request(app).get('/api/v1/search/history/guessed-reference').set('Authorization','Bearer no-permissions')).status).toBe(403);
 });
 it('creates and reads only attributable own history, never another actor’s reference',async()=>{
  const created=await request(app).post('/api/v1/search').set('Authorization','Bearer actor-a').send({scope:'PUBLIC_CATALOG',criteria:{query:'private test search'},pagination:{page:1,limit:10}});
  expect(created.status).toBe(200);const reference=created.body.reference;expect(reference).toMatch(/^search-ref-/);
  const own=await request(app).get(`/api/v1/search/history/${reference}`).set('Authorization','Bearer actor-a');
  expect(own.status).toBe(200);expect(own.body).toHaveLength(1);expect(own.body[0].criteria.query).toBe('private test search');
  const other=await request(app).get(`/api/v1/search/history/${reference}?actorReferenceId=actor-a`).set('Authorization','Bearer actor-b');
  expect(other.status).toBe(200);expect(other.body).toEqual([]);
  expect(findMany).toHaveBeenLastCalledWith(expect.objectContaining({where:{reference,actorReferenceId:'actor-b',scope:'PUBLIC_CATALOG'},take:100}));
 });
 it('no longer exposes cross-user traffic or allocates the removed global diagnostic buffer',async()=>{
  const response=await request(app).get('/api/v1/diagnostic-rate-limit').set('X-Forwarded-For','192.0.2.99');
  expect(response.status).toBe(404);expect(response.body).not.toHaveProperty('diagnosticsList');expect(response.body).not.toHaveProperty('env');
  expect((globalThis as typeof globalThis & {diagnosticsList?: unknown}).diagnosticsList).toBeUndefined();
 });
});
