import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaServicePlatformRepository} from '../../packages/infrastructure/src/services-platform/PrismaServicePlatformRepository.ts';
let db;
describe('Public service category facets on PostgreSQL',()=>{
 beforeAll(async()=>{if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='service-public-facets'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');db=new PrismaClient({errorFormat:'minimal'});expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');});
 afterAll(async()=>{await db?.$disconnect();});
 it('returns an empty catalog and groups current reviewed categories without exposing draft categories',async()=>{
  const key=randomUUID(),repo=new PrismaServicePlatformRepository(db);
  expect(await repo.listPublished({search:key,limit:20})).toMatchObject({total:0,data:[],facets:{}});
  for(const draft of [false,true]){const id=randomUUID();await db.serviceCatalogRecord.create({data:{id,publicId:id,slug:id,canonicalName:id,canonicalDedupKey:id,displayName:key,status:draft?'DRAFT':'PUBLISHED',completenessStatus:'COMPLETE',serviceCategory:draft?'GENERAL_SERVICES':'STUDENT_SERVICES',fulfillmentType:'CONSULTATION',serviceDescription:'Synthetic reviewed service',serviceAvailabilityStatus:'AVAILABLE',requiredInputsOrDocuments:[],deliveryMode:'ONLINE',responsibleServiceOwnerType:'STUDENT',...(draft?{publishedSnapshot:{id,status:'PUBLISHED',displayName:key,serviceCategory:'STUDENT_SERVICES',serviceDescription:'Reviewed synthetic description',slug:id}}:{})}});}
  const page=await repo.listPublished({search:key,limit:20});expect(page.total).toBe(2);expect(page.data).toHaveLength(2);expect(page.facets).toEqual({STUDENT_SERVICES:2});
  const filtered=await repo.listPublished({search:key,serviceCategory:'GENERAL_SERVICES',limit:20});expect(filtered).toMatchObject({total:0,data:[],facets:{}});
 });
});
