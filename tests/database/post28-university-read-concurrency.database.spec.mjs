import {randomUUID as fresh} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaUniversityRepository} from '../../packages/infrastructure/src/universities/PrismaUniversityRepository.ts';
import {PublicUniversityUseCases} from '../../packages/application/src/universities/use-cases/PublicUniversityUseCases.ts';
import {syntheticUniversityCountry} from './fixtures/synthetic-university-country.mjs';

let db,other;
async function fixture(){
  // Synthetic historical published records, not an owner approval workflow.
  const id=fresh(),major=fresh(),degree=fresh(),profile=fresh(),version=fresh(),program=fresh(),country=await syntheticUniversityCountry(db);
  const owner=id=>({id,publicId:id,slug:id,canonicalName:id,canonicalDedupKey:id,displayName:id,status:'PUBLISHED',completenessStatus:'COMPLETE'});
  await db.university.create({data:{...owner(id),countryReferenceId:country}});
  await db.degreeLevel.create({data:{id:degree,canonicalCode:degree,nameEn:'Synthetic',nameAr:'Synthetic'}});
  await db.major.create({data:owner(major)});
  await db.majorLevelProfile.create({data:{id:profile,majorId:major,degreeLevelId:degree,level:'BACHELOR',code:profile,status:'PUBLISHED',completenessStatus:'COMPLETE'}});
  await db.majorVersion.create({data:{id:version,majorId:major,profileId:profile,versionNumber:1,status:'PUBLISHED'}});
  await db.majorLevelProfile.update({where:{id:profile},data:{currentPublishedVersionId:version}});
  await db.universityAcademicProgram.create({data:{id:program,universityId:id,majorId:major,degreeLevelId:degree,status:'ACTIVE',majorMappingState:'CANONICALLY_MAPPED',sourceProgramName:'Synthetic snapshot program',normalizedName:program}});
  return {id,major,degree,profile,version,program,country};
}

function race(client,withdraw){
  let release,changed=false;
  const selected=new Promise(resolve=>{release=resolve;});
  async function observe(kind,run){
    if(kind==='count')await selected;
    let rows;
    try{rows=await run();}catch(error){release();throw error;}
    if(kind==='select'&&!changed){changed=true;try{await withdraw();}finally{release();}}
    return rows;
  }
  const wrap=inner=>new Proxy(inner,{get(target,key){
    if(key==='$transaction')return (work,options)=>target.$transaction(tx=>work(wrap(tx)),options);
    if(key==='university')return new Proxy(target.university,{get(model,operation){const value=Reflect.get(model,operation);if(['findMany','count'].includes(operation))return (...args)=>observe(operation==='count'?'count':'select',()=>value.apply(model,args));return typeof value==='function'?value.bind(model):value;}});
    if(key==='$queryRaw')return (...args)=>{const sql=(args[0]?.strings??args[0]).join('');return observe(/\bcount\(/i.test(sql)?'count':'select',()=>target.$queryRaw(...args));};
    const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
  }});
  return {client:wrap(client),changed:()=>changed};
}

describe('CD040 actual two-connection University public read snapshots',()=>{
  beforeAll(async()=>{
    if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='university-read-concurrency'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
    db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});await Promise.all([db.$connect(),other.$connect()]);
    const [[a],[b]]=await Promise.all([db.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`,other.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`]);expect(a.role).toBe('post28_app');expect(b.role).toBe('post28_app');expect(a.pid).not.toBe(b.pid);
  });
  afterAll(async()=>{await Promise.all([db?.$disconnect(),other?.$disconnect()]);});
  it('keeps basic public card and count coherent when country withdraws after selection',async()=>{
    const c=await fixture(),r=race(db,()=>other.referenceCountry.update({where:{id:c.country},data:{isActive:false}}));
    const page=await new PublicUniversityUseCases(new PrismaUniversityRepository(r.client)).listUniversities({search:c.id});
    expect(r.changed()).toBe(true);expect(page.data.map(x=>x.slug)).toEqual([c.id]);expect(page.total).toBe(1);expect((await new PrismaUniversityRepository(db).listPublished({search:c.id})).total).toBe(0);
  });
  it('keeps filtered public program card count and hydration coherent when its current version withdraws',async()=>{
    const c=await fixture(),r=race(db,()=>other.majorVersion.update({where:{id:c.version},data:{status:'ARCHIVED'}}));
    const page=await new PublicUniversityUseCases(new PrismaUniversityRepository(r.client)).listUniversities({majorId:c.major});
    expect(r.changed()).toBe(true);expect(page.total).toBe(1);expect(page.data.map(x=>x.slug)).toEqual([c.id]);expect(page.data[0].academicPrograms.map(x=>x.id)).toEqual([c.program]);expect((await new PrismaUniversityRepository(db).listPublished({majorId:c.major})).total).toBe(0);
  });
  it('keeps program graph rows and count coherent during independent Major withdrawal',async()=>{
    const c=await fixture(),r=race(db,()=>other.major.update({where:{id:c.major},data:{status:'READY_TO_REVIEW'}}));
    const page=await new PrismaUniversityRepository(r.client).listPublishedProgramGraph({universityId:c.id});
    expect(r.changed()).toBe(true);expect(page.data.map(x=>x.ownerId)).toEqual([c.program]);expect(page.total).toBe(1);expect(page.majorTotal).toBe(1);expect((await new PrismaUniversityRepository(db).listPublishedProgramGraph({universityId:c.id})).total).toBe(0);
  });
  it('keeps Major graph rows and count coherent during independent country withdrawal',async()=>{
    const c=await fixture(),r=race(db,()=>other.referenceCountry.update({where:{id:c.country},data:{isActive:false}}));
    const page=await new PrismaUniversityRepository(r.client).listPublishedMajorGraph({countryReferenceId:c.country});
    expect(r.changed()).toBe(true);expect(page.data.map(x=>x.ownerId)).toEqual([c.major]);expect(page.total).toBe(1);expect((await new PrismaUniversityRepository(db).listPublishedMajorGraph({countryReferenceId:c.country})).total).toBe(0);
  });
});
