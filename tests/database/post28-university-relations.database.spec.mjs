import {syntheticUniversityCountry} from './fixtures/synthetic-university-country.mjs';
import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaUniversityProgramReadPort} from '../../packages/infrastructure/src/universities/PrismaUniversityProgramReadPort.ts';
const fresh=()=> 'post28-rel-'+randomUUID();
let db,port;
async function fixture(){
 const university=fresh(),major=fresh(),degree=fresh(),profile=fresh(),version=fresh(),program=fresh();
 const owner=id=>({id,publicId:id,slug:id,canonicalName:id,canonicalDedupKey:id,displayName:'Synthetic owner',status:'PUBLISHED',completenessStatus:'COMPLETE'});
 await db.university.create({data:{...owner(university),countryReferenceId:await syntheticUniversityCountry(db)}});await db.major.create({data:owner(major)});
 await db.degreeLevel.create({data:{id:degree,canonicalCode:degree,nameEn:'Synthetic degree',nameAr:'درجة تجريبية'}});
 await db.majorLevelProfile.create({data:{id:profile,majorId:major,degreeLevelId:degree,level:'BACHELOR',code:profile,status:'PUBLISHED',completenessStatus:'COMPLETE'}});
 await db.majorVersion.create({data:{id:version,majorId:major,profileId:profile,versionNumber:1,status:'PUBLISHED',publishedAt:new Date()}});
 await db.majorLevelProfile.update({where:{id:profile},data:{currentPublishedVersionId:version}});
 await db.universityAcademicProgram.create({data:{id:program,universityId:university,majorId:major,degreeLevelId:degree,sourceProgramName:'Synthetic program',normalizedName:'synthetic program',majorMappingState:'CANONICALLY_MAPPED',status:'ACTIVE'}});
 return {university,major,degree,profile,version,program};
}
describe('Post28 real university program owner reference relations',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='university-relations'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw new Error('POST28_DB_T_RUNNER_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();port=new PrismaUniversityProgramReadPort(db);const [identity]=await db.$queryRaw`SELECT current_user AS role`;expect(identity.role).toBe('post28_app');
 });
 afterAll(async()=>{await db?.$disconnect();});
 it('resolves a published program only through its matching degree profile and actual owner relations',async()=>{
  const c=await fixture();const rows=await port.findPublished({universityId:c.university,degreeLevelId:c.degree});expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({id:c.program,universityId:c.university,majorId:c.major,degreeLevelId:c.degree,publiclyEligible:true});
  expect(await db.majorVersion.findUnique({where:{id:c.version}})).toMatchObject({majorId:c.major,profileId:c.profile,status:'PUBLISHED'});
 });
 it('enforces exact university program and degree scope without returning a foreign owner',async()=>{
  const a=await fixture(),b=await fixture();expect(await port.findPublished({universityId:a.university,academicProgramId:b.program})).toEqual([]);expect(await port.findPublished({universityId:a.university,degreeLevelId:b.degree})).toEqual([]);expect((await port.findByIds([a.program,a.program])).map(x=>x.id)).toEqual([a.program]);
 });
 it('stops public eligibility immediately when either university or major is unpublished',async()=>{
  const c=await fixture();await db.university.update({where:{id:c.university},data:{status:'DRAFT'}});expect(await port.findPublished({academicProgramId:c.program})).toEqual([]);expect((await port.findByIds([c.program]))[0].publiclyEligible).toBe(false);
  await db.university.update({where:{id:c.university},data:{status:'PUBLISHED'}});await db.major.update({where:{id:c.major},data:{status:'DRAFT'}});expect(await port.findPublished({academicProgramId:c.program})).toEqual([]);
 });
 it('refuses a different degree profile and a missing published version pointer',async()=>{
  const c=await fixture(),other=await fixture();await db.majorLevelProfile.update({where:{id:c.profile},data:{degreeLevelId:other.degree}});expect(await port.findPublished({academicProgramId:c.program})).toEqual([]);
  await db.majorLevelProfile.update({where:{id:c.profile},data:{degreeLevelId:c.degree,currentPublishedVersionId:null}});expect(await port.findPublished({academicProgramId:c.program})).toEqual([]);
 });
 it('excludes archived and unmapped programs even with valid foreign keys',async()=>{
  const c=await fixture();await db.universityAcademicProgram.update({where:{id:c.program},data:{status:'ARCHIVED'}});expect(await port.findPublished({academicProgramId:c.program})).toEqual([]);
  await db.universityAcademicProgram.update({where:{id:c.program},data:{status:'ACTIVE',majorMappingState:'UNMAPPED'}});expect(await port.findPublished({academicProgramId:c.program})).toEqual([]);
 });
 it('enforces university major and degree foreign keys on real PostgreSQL without leaving an invalid update',async()=>{
  const c=await fixture();for(const field of ['universityId','majorId','degreeLevelId'])await expect(db.universityAcademicProgram.update({where:{id:c.program},data:{[field]:fresh()}})).rejects.toMatchObject({code:'P2003'});
  expect(await db.universityAcademicProgram.findUnique({where:{id:c.program}})).toMatchObject({universityId:c.university,majorId:c.major,degreeLevelId:c.degree});
 });
 it('reads owner publication inside the actual transaction and rolls an unpublished state back',async()=>{
  const c=await fixture();await expect(db.$transaction(async tx=>{
   await tx.university.update({where:{id:c.university},data:{status:'DRAFT'}});const scoped=port.withTransaction({boundaryId:fresh(),transactionClient:tx});expect(await scoped.findPublished({academicProgramId:c.program})).toEqual([]);throw new Error('POST28_RELATION_ROLLBACK');
  })).rejects.toThrow('POST28_RELATION_ROLLBACK');expect(await port.findPublished({academicProgramId:c.program})).toHaveLength(1);
 });
});
