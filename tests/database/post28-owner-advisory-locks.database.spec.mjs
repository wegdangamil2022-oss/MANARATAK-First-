import {randomUUID as fresh} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaMajorImportReviewGateway} from '../../packages/infrastructure/src/majors/PrismaMajorImportReviewGateway.ts';
import {CanonicalMajorReferenceService} from '../../packages/application/src/majors/services/CanonicalMajorReferenceService.ts';
import {DegreeLevelRepository} from '../../packages/infrastructure/src/degree-level/DegreeLevelRepository.ts';
import {PrismaAcademicTaxonomyRepository} from '../../packages/infrastructure/src/academic-taxonomy/PrismaAcademicTaxonomyRepository.ts';
import {PrismaAcademicTaxonomyImportGateway} from '../../packages/infrastructure/src/academic-taxonomy/PrismaAcademicTaxonomyImportGateway.ts';
import {PrismaImportGovernanceGateway} from '../../packages/infrastructure/src/import-foundation/PrismaImportGovernanceGateway.ts';
import {assertImportReviewLease} from '../../packages/infrastructure/src/import-foundation/ImportReviewLeaseGuard.ts';
import {PrismaSourceAcquisitionLimiter} from '../../packages/infrastructure/src/import-foundation/PrismaSourceAcquisitionLimiter.ts';
import {PrismaImportSourceObservationGateway} from '../../packages/infrastructure/src/import-foundation/PrismaImportSourceObservationGateway.ts';
import {PrismaStudyDestinationRepository} from '../../packages/infrastructure/src/study-destinations/PrismaStudyDestinationRepository.ts';
let db,other;
const context=transactionClient=>({boundaryId:fresh(),transactionClient});
function major(client){return new PrismaMajorImportReviewGateway(client,new CanonicalMajorReferenceService(new PrismaAcademicTaxonomyRepository(client),new DegreeLevelRepository(client)));}
describe('Post28 actual owner import and source advisory lock contracts',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='owner-advisory-locks'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});await Promise.all([db.$connect(),other.$connect()]);
  const [[a],[b]]=await Promise.all([db.$queryRaw`SELECT current_user AS role,pg_backend_pid() AS pid`,other.$queryRaw`SELECT current_user AS role,pg_backend_pid() AS pid`]);expect(a.role).toBe('post28_app');expect(b.role).toBe('post28_app');expect(a.pid).not.toBe(b.pid);
 });
 afterAll(async()=>{await Promise.all([db?.$disconnect(),other?.$disconnect()]);});
 it('holds major owner review lock through commit and rejects unbound use',async()=>{
  await expect(major(db).lock()).rejects.toThrow('MAJOR_IMPORT_TRANSACTION_REQUIRED');
  await db.$transaction(async tx=>{await major(tx).withTransaction(context(tx)).lock();const [row]=await other.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${'major-import:owner-review'},0)) AS won`;expect(row.won).toBe(false);});
  const [released]=await other.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${'major-import:owner-review'},0)) AS won`;expect(released.won).toBe(true);
 });
 it('executes major identity inspection under canonical reference service and dedup lock',async()=>{
  await db.$transaction(async tx=>{const result=await major(tx).withTransaction(context(tx)).inspect({canonicalMajorName:'Synthetic unique '+fresh(),academicFieldOrDiscipline:'Synthetic discipline'});expect(result).toEqual({targetId:null,targetRevision:null});});
 });
 it('executes taxonomy import lock in its real owner transaction',async()=>{
  const id=fresh();await db.$transaction(async tx=>{await new PrismaAcademicTaxonomyImportGateway(tx).withTransaction(context(tx)).lock(id);const [row]=await other.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${`taxonomy-import:${id}`},0)) AS won`;expect(row.won).toBe(false);});
 });
 it('runs actual serializable taxonomy boundary with graph governance lock held',async()=>{
  expect(await new PrismaAcademicTaxonomyRepository(db).executeSerializable(async()=>{const [row]=await other.$queryRaw`SELECT pg_try_advisory_xact_lock(hashtextextended(${'academic-taxonomy:governance'},0)) AS won`;expect(row.won).toBe(false);return 'EXECUTED';})).toBe('EXECUTED');
 });
 it('reads historical unassigned import lease only after its owner lock is acquired',async()=>{
  await db.$transaction(async tx=>{await expect(assertImportReviewLease(tx,fresh(),'POST28_SYNTHETIC_REVIEWER')).resolves.toBeUndefined();});
 });
 it('reaches actual mapping source conflict instead of failing its lock result',async()=>{
  const gateway=new PrismaImportGovernanceGateway(db);await db.$transaction(async tx=>{await expect(gateway.withTransaction(context(tx)).createProfile({sourceId:fresh(),ownerDomain:'GENERIC',sourceRevision:new Date().toISOString(),expectedVersion:0,definition:{},definitionHash:'a'.repeat(64),actorId:'POST28_SYNTHETIC_AUTHOR',reason:'Synthetic absent-source boundary'})).rejects.toThrow('IMPORT_MAPPING_PROFILE_CONFLICT');});
 });
 it('refuses remembered snapshot for an absent current source after its observation lock',async()=>{
  await expect(new PrismaImportSourceObservationGateway(db).remember({sourceId:fresh(),updatedAt:new Date()},{artifactId:fresh(),contentHash:'a'.repeat(64),byteSize:12})).rejects.toThrow('IMPORT_SOURCE_STATUS_CONFLICT');
 });
 it('refuses shape observation without a source baseline after its observation lock',async()=>{
  await expect(new PrismaImportSourceObservationGateway(db).observeShape({sourceId:fresh(),updatedAt:new Date()},{course:['title','url']})).rejects.toThrow('IMPORT_SOURCE_STATUS_CONFLICT');
 });
 it('reaches study destination canonical missing country gate while retaining transaction requirement',async()=>{
  await expect(new PrismaStudyDestinationRepository(db).lockCountry(fresh())).rejects.toThrow('STUDY_DESTINATION_TRANSACTION_REQUIRED');
  await db.$transaction(async tx=>{await expect(new PrismaStudyDestinationRepository(db).withTransaction(context(tx)).lockCountry(fresh())).rejects.toThrow('STUDY_DESTINATION_COUNTRY_NOT_FOUND');});
 });
 it('serializes actual distributed fleet origin and source budget reservations across two connections',async()=>{
  const started=Date.now(),source={sourceId:'POST28_'+fresh(),baseUrl:'https://source.example.invalid',rateLimitPerMinute:60};
  await Promise.all([new PrismaSourceAcquisitionLimiter(db,undefined,60000).wait(source),new PrismaSourceAcquisitionLimiter(other,undefined,60000).wait(source)]);
  const rows=await db.importRateBudget.findMany({where:{budgetKey:{in:['FLEET','ORIGIN:https://source.example.invalid','SOURCE:'+source.sourceId]}}});expect(rows).toHaveLength(3);expect(rows.every(row=>row.nextAvailableAt instanceof Date)).toBe(true);expect((await db.importRateBudget.findUnique({where:{budgetKey:'SOURCE:'+source.sourceId}})).nextAvailableAt.getTime()).toBeGreaterThanOrEqual(started+2000);
 });
});
