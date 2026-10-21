import {randomUUID} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {assertAdmissionNullIdentity} from '../../scripts/database/post28-admission-null-identity.mjs';
let db;
const id=()=>randomUUID();
async function fixture(){
 const university=id(),test=id(),degree=id(),program=id(),variant=id(),version=id();
 const owner=key=>({id:key,publicId:key,slug:key,canonicalName:key,canonicalDedupKey:key,displayName:'Synthetic post111 owner',status:'READY_TO_REVIEW',completenessStatus:'COMPLETE'});
 await db.university.create({data:owner(university)});
 await db.degreeLevel.create({data:{id:degree,canonicalCode:degree,nameEn:'Synthetic degree',nameAr:'Synthetic degree'}});
 await db.universityAcademicProgram.create({data:{id:program,universityId:university,degreeLevelId:degree,sourceProgramName:'Synthetic program',normalizedName:program,majorMappingState:'UNMAPPED'}});
 await db.internationalTest.create({data:owner(test)});
 await db.internationalTestVariant.create({data:{id:variant,testId:test,variantName:'Synthetic variant',deliveryMode:'ONLINE',isActive:true}});
 await db.internationalTestVersion.create({data:{id:version,testId:test,versionNumber:1,status:'DRAFT'}});
 return {university,test,program,variant,version};
}
describe('Post28 actual111 admission identity enforcement',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_DATABASE_SUITE!=='admission-null-identity'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();
  const [role]=await db.$queryRaw`SELECT current_user AS name`;expect(role.name).toBe('post28_app');
  await assertAdmissionNullIdentity(db);
 });
 afterAll(async()=>{await db?.$disconnect();});
 for(const [variantPresent,versionPresent] of [[false,false],[true,false],[false,true],[true,true]])it(`rejects duplicate and rolls back a colliding update for variant=${variantPresent} version=${versionPresent}`,async()=>{
  const c=await fixture(),key={academicProgramId:c.program,internationalTestId:c.test,testVariantId:variantPresent?c.variant:null,testVersionId:versionPresent?c.version:null};
  const first=await db.universityProgramAdmissionRequirement.create({data:key});
  await expect(db.universityProgramAdmissionRequirement.create({data:{...key,status:'INACTIVE'}})).rejects.toMatchObject({code:'P2002'});
  // A different program is a legitimate distinct identity, before an attempted collision.
  const alternate=await db.universityAcademicProgram.create({data:{universityId:c.university,degreeLevelId:(await db.universityAcademicProgram.findUnique({where:{id:c.program}})).degreeLevelId,sourceProgramName:'Second synthetic program',normalizedName:id(),majorMappingState:'UNMAPPED'}});
  const distinct=await db.universityProgramAdmissionRequirement.create({data:{...key,academicProgramId:alternate.id}});
  const before=await db.university.findUnique({where:{id:c.university}});
  await expect(db.$transaction(async tx=>{
   await tx.university.update({where:{id:c.university},data:{displayName:'Must roll back'}});
   await tx.universityProgramAdmissionRequirement.update({where:{id:distinct.id},data:{academicProgramId:c.program}});
  })).rejects.toMatchObject({code:'P2002'});
  expect(await db.university.findUnique({where:{id:c.university}})).toEqual(before);
  expect(await db.universityProgramAdmissionRequirement.findUnique({where:{id:first.id}})).toEqual(first);
  expect(await db.universityProgramAdmissionRequirement.findUnique({where:{id:distinct.id}})).toEqual(distinct);
 });
 it('rejects FK SET NULL collision without deleting the variant or either requirement',async()=>{
  const c=await fixture(),base={academicProgramId:c.program,internationalTestId:c.test};
  const rows=await Promise.all([db.universityProgramAdmissionRequirement.create({data:base}),db.universityProgramAdmissionRequirement.create({data:{...base,testVariantId:c.variant}})]);
  const before=await db.internationalTestVariant.findUnique({where:{id:c.variant}});
  await expect(db.internationalTestVariant.delete({where:{id:c.variant}})).rejects.toMatchObject({code:'P2002'});
  expect(await db.internationalTestVariant.findUnique({where:{id:c.variant}})).toEqual(before);
  for(const row of rows)expect(await db.universityProgramAdmissionRequirement.findUnique({where:{id:row.id}})).toEqual(row);
 });
});
