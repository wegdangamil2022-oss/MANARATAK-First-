import {randomUUID} from 'node:crypto';
import express from 'express';
import request from 'supertest';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaScholarshipRepository} from '../../packages/infrastructure/src/scholarships/PrismaScholarshipRepository.ts';
import {PublicScholarshipUseCases} from '../../packages/application/src/scholarships/use-cases/PublicScholarshipUseCases.ts';
import {ScholarshipPublicRouter} from '../../apps/api/src/presentation/api/router/ScholarshipPublicRouter.ts';
let db,reads,app,countries;
const fresh=()=>randomUUID();
// Synthetic historical published snapshots, not evidence of source review or publish approval.
async function fixture({destination=true}={}){
 const id=fresh();
 await db.scholarship.create({data:{id,publicId:id,slug:id,canonicalName:id,canonicalDedupKey:id,displayName:'Synthetic country separation',status:'PUBLISHED',publicationStatus:'PUBLISHED',verificationStatus:'VERIFIED',completenessStatus:'COMPLETE',countryReferenceId:destination?countries[0]:null,providerName:id,
  versions:{create:{versionNumber:1,status:'PUBLISHED',snapshot:{syntheticHistorical:true}}},
  sponsorContext:{create:{displayName:'Synthetic sponsor',source:'synthetic-only',metadata:{fundingCountryReferenceId:countries[2],privateSentinel:'DO_NOT_PROJECT'}}},
  eligibilityItems:{create:[{itemKey:'nationality-a',itemTypeCode:'NATIONALITY',operatorCode:'IN',countryReferenceId:countries[1],resolutionStatus:'RESOLVED'},{itemKey:'nationality-b',itemTypeCode:'NATIONALITY',operatorCode:'IN',countryReferenceId:countries[3],resolutionStatus:'RESOLVED'}]},
 }});return id;
}
async function exact(id,country){return reads.listPublished({ownerId:id,countryReferenceId:country,limit:10});}
describe('CD-009 dedicated partial country separation on real PostgreSQL and HTTP',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='scholarship-country-semantics'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');
  countries=[];for(const [iso2Code,iso3Code] of [['XA','XAA'],['XB','XBB'],['XC','XCC'],['XD','XDD']]){const c=await db.referenceCountry.upsert({where:{iso2Code},create:{id:fresh(),iso2Code,iso3Code,name:'Synthetic '+iso2Code},update:{}});countries.push(c.id);}
  reads=new PrismaScholarshipRepository(db);app=express();app.use('/scholarships',ScholarshipPublicRouter.create({publicScholarshipUseCases:new PublicScholarshipUseCases(reads)}));
 });
 afterAll(async()=>{await db?.$disconnect();});
 it('uses the restricted application principal without schema or migration-ledger writes',async()=>{
  const [p]=await db.$queryRaw`SELECT has_schema_privilege(current_user,'public','CREATE') AS ddl, has_table_privilege(current_user,'public._prisma_migrations','UPDATE') AS ledger`;
  expect(p).toEqual({ddl:false,ledger:false});
 });
 it('destination filters and counts never match applicant nationality or funding provenance',async()=>{
  const id=await fixture();expect((await exact(id,countries[0])).data.map(x=>x.id)).toEqual([id]);
  for(const country of countries.slice(1)){const page=await exact(id,country);expect(page.total).toBe(0);expect(page.data).toEqual([]);}
 });
 it('keeps two evidenced nationality conditions separate from a single destination in HTTP details',async()=>{
  const id=await fixture(),r=await request(app).get('/scholarships/'+id);expect(r.status).toBe(200);expect(r.body.countryReferenceId).toBe(countries[0]);
  expect(r.body.eligibilityItems.map(x=>x.countryReferenceId).sort()).toEqual([countries[1],countries[3]].sort());
  expect(JSON.stringify(r.body)).not.toContain('DO_NOT_PROJECT');expect(r.body.sponsorContext).toBeUndefined();
 });
 it('funding-context changes preserve destination and original nationality rows',async()=>{
  const id=await fixture(),before=await db.scholarshipEligibilityItem.findMany({where:{scholarshipId:id},orderBy:{id:'asc'}});
  await db.scholarshipSponsorContext.update({where:{scholarshipId:id},data:{metadata:{fundingCountryReferenceId:countries[3]}}});
  expect((await exact(id,countries[0])).total).toBe(1);expect((await exact(id,countries[3])).total).toBe(0);
  expect(await db.scholarshipEligibilityItem.findMany({where:{scholarshipId:id},orderBy:{id:'asc'}})).toEqual(before);
 });
 it('destination changes do not rewrite nationality conditions or sponsor source',async()=>{
  const id=await fixture(),before=await db.scholarshipEligibilityItem.findMany({where:{scholarshipId:id},orderBy:{id:'asc'}}),sponsor=await db.scholarshipSponsorContext.findUnique({where:{scholarshipId:id}});
  await db.scholarship.update({where:{id},data:{countryReferenceId:countries[2]}});
  expect((await exact(id,countries[0])).total).toBe(0);expect((await exact(id,countries[2])).total).toBe(1);
  expect(await db.scholarshipEligibilityItem.findMany({where:{scholarshipId:id},orderBy:{id:'asc'}})).toEqual(before);expect(await db.scholarshipSponsorContext.findUnique({where:{scholarshipId:id}})).toEqual(sponsor);
 });
 it('does not infer missing study destination from applicant or sponsor countries',async()=>{
  const id=await fixture({destination:false});for(const country of countries)expect((await exact(id,country)).total).toBe(0);
  const r=await request(app).get('/scholarships/'+id);expect(r.status).toBe(200);expect(r.body.countryReferenceId).toBeNull();expect(r.body.studyCountry).toBeUndefined();
 });
 it('rejects unsupported nationality and funding-country filters rather than reinterpreting them as destination',async()=>{
  for(const key of ['nationalityCountryReferenceId','fundingCountryReferenceId']){const r=await request(app).get('/scholarships').query({[key]:countries[1]});expect(r.status).toBe(400);}
  const id=await fixture(),r=await request(app).get('/scholarships').query({search:id,countryReferenceId:countries[1]});expect(r.status).toBe(200);expect(r.body.total).toBe(0);expect(r.body.data).toEqual([]);
 });
});
