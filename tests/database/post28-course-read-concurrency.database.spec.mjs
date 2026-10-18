import {randomUUID as fresh} from 'node:crypto';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {PrismaCourseRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRepository.ts';
import {PrismaCourseRelationshipRepository} from '../../packages/infrastructure/src/courses/PrismaCourseRelationshipRepository.ts';
let db,other;
async function fixture(){
 const id=fresh(),provider=fresh(),language=fresh();
 await db.externalCourseProvider.create({data:{id:provider,publicId:provider,slug:provider,canonicalName:provider,normalizedCanonicalName:provider,displayName:'Synthetic provider',status:'APPROVED',sourceTrustLevel:'OFFICIAL',importStrategy:'FILE'}});
 await db.referenceLanguage.create({data:{id:language,isoCode:language,name:'Synthetic language',direction:'LTR'}});
 // Synthetic historical published fixture: this does not attest a fresh owner review or network verification.
 await db.course.create({data:{id,publicId:id,slug:id,canonicalName:id,canonicalDedupKey:id,displayName:'Synthetic course',platformName:id,status:'PUBLISHED',completenessStatus:'COMPLETE',originType:'EXTERNAL_LINKED_COURSE',accessType:'FREE_STUDY',isStudyFree:true,directCourseUrl:'https://example.invalid/'+id,externalProviderId:provider,learningLanguageRaw:'Synthetic language',learningLanguageReferenceId:language,learningLanguageResolutionState:'RESOLVED'}});
 return {id,provider,language};
}
function race(client,withdraw){
 let release,changed=false;const selected=new Promise(resolve=>{release=resolve;});
 const wrap=inner=>new Proxy(inner,{get(target,key){
  if(key==='$transaction')return (work,options)=>target.$transaction(tx=>work(wrap(tx)),options);
  if(key==='course')return new Proxy(target.course,{get(model,operation){
   const value=Reflect.get(model,operation);
   if(operation==='count')return async(...args)=>{await selected;return value.apply(model,args);};
   if(operation==='findMany')return async(...args)=>{try{const rows=await value.apply(model,args);if(!changed){changed=true;await withdraw();}return rows;}finally{release();}};
   return typeof value==='function'?value.bind(model):value;
  }});
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value;
 }});
 return {client:wrap(client),changed:()=>changed};
}
describe('CD040 actual two-connection Course public read snapshots',()=>{
 beforeAll(async()=>{
  if(process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_DATABASE_SUITE!=='course-read-concurrency'||process.env.RUN_DATABASE_INTEGRATION_TESTS!=='true'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');
  db=new PrismaClient({log:[],errorFormat:'minimal'});other=new PrismaClient({log:[],errorFormat:'minimal'});await Promise.all([db.$connect(),other.$connect()]);
  const [[a],[b]]=await Promise.all([db.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`,other.$queryRaw`SELECT pg_backend_pid() AS pid,current_user AS role`]);expect(a.role).toBe('post28_app');expect(b.role).toBe('post28_app');expect(a.pid).not.toBe(b.pid);
 });
 afterAll(async()=>{await Promise.all([db?.$disconnect(),other?.$disconnect()]);});
 for(const adapter of ['owner','relationships'])for(const target of ['provider','language'])it(`keeps ${adapter} public card and count coherent when ${target} withdraws after selection`,async()=>{
  const c=await fixture(),r=race(db,()=>target==='provider'?other.externalCourseProvider.update({where:{id:c.provider},data:{status:'SUSPENDED'}}):other.referenceLanguage.update({where:{id:c.language},data:{lifecycleState:'DEPRECATED'}}));
  const filters={platformName:c.id},read=client=>adapter==='owner'?new PrismaCourseRepository(client).listPublished(filters):new PrismaCourseRelationshipRepository(client).listPublishedRelatedCourses(filters);
  const page=await read(r.client);
  expect(r.changed()).toBe(true);expect(page.data.map(x=>adapter==='owner'?x.id:x.ownerId)).toEqual([c.id]);expect(page.total).toBe(1);
  const later=await read(db);expect(later.data).toEqual([]);expect(later.total).toBe(0);
 });
});
