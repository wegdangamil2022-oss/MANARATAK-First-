// Runs only against an attested disposable local PostgreSQL lab. Never accepts a database URL.
// Usage: node --import tsx scripts/database/verify-staff-draft-storage.mjs LAB_DIRECTORY EVIDENCE_DIRECTORY
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
assert.equal(process.argv.length,4,'LAB_AND_EVIDENCE_DIRECTORIES_REQUIRED');
const root=process.cwd(),task=path.resolve(process.argv[3]);
assert.ok(fs.statSync(task).isDirectory());
const require=createRequire(path.join(root,'package.json')),{PrismaClient}=require('@prisma/client');
const name='20261028000100_staff_draft_organization';
const sql=fs.readFileSync(path.join(root,'packages/infrastructure/prisma/migrations',name,'migration.sql'),'utf8');
const checksum=createHash('sha256').update(sql).digest('hex');
const statements=sql.replace(/^\s*--[^\n]*(?:\n|$)/gm,'').split(';').map(s=>s.trim()).filter(Boolean);
assert.ok(statements.length>20);
assert.ok(statements.every(s=>/^(CREATE TABLE|CREATE (?:UNIQUE )?INDEX|ALTER TABLE)/.test(s)));
const tables=['StaffDepartmentRecord','StaffJobTitleRecord','StaffMembershipRecord','StaffLifecycleEventRecord'];
const ident=s=>'"'+s.replaceAll('"','""')+'"';
const client=url=>new PrismaClient({datasources:{db:{url}},errorFormat:'minimal',log:[]});

const report=(file,data)=>fs.writeFileSync(path.join(task,file),JSON.stringify({...data,at:new Date().toISOString()},null,2));
async function presence(db){return db.$queryRawUnsafe(`SELECT name,to_regclass(format('public.%I',name))::text AS relation FROM unnest(ARRAY['StaffDepartmentRecord','StaffJobTitleRecord','StaffMembershipRecord','StaffLifecycleEventRecord']) AS name`);}
async function permissions(db,role){return db.$queryRawUnsafe(`SELECT name,has_table_privilege($1,format('public.%I',name),'SELECT') AS read,has_table_privilege($1,format('public.%I',name),'INSERT') AS insert,has_table_privilege($1,format('public.%I',name),'UPDATE') AS update,has_table_privilege($1,format('public.%I',name),'DELETE') AS delete,has_table_privilege($1,format('public.%I',name),'TRUNCATE') AS truncate FROM unnest(ARRAY['StaffDepartmentRecord','StaffJobTitleRecord','StaffMembershipRecord','StaffLifecycleEventRecord']) AS name`,role);}
async function grant(db,role){
  await db.$executeRawUnsafe(`GRANT SELECT,INSERT,UPDATE ON "StaffDepartmentRecord","StaffJobTitleRecord","StaffMembershipRecord" TO ${ident(role)}`);
  await db.$executeRawUnsafe(`GRANT SELECT,INSERT ON "StaffLifecycleEventRecord" TO ${ident(role)}`);
  const rows=await permissions(db,role);
  for(const row of rows){assert.equal(row.read,true);assert.equal(row.insert,true);assert.equal(row.update,row.name!=='StaffLifecycleEventRecord');assert.equal(row.delete,false);assert.equal(row.truncate,false);}
  return rows;
}
async function lab(){
  const dir=path.resolve(process.argv[2]);
  const state=JSON.parse(fs.readFileSync(path.join(dir,'lab-state.json'),'utf8'));
  const contract=JSON.parse(fs.readFileSync(path.join(dir,'targets.json'),'utf8'));
  const {assertNativeLabState}=await import(pathToFileURL(path.join(root,'scripts/database/post28-native-lab-policy.mjs')));
  assertNativeLabState(state,contract,state.sourceSha,dir);
  const bindings=Object.fromEntries(fs.readFileSync(path.join(dir,'lab.env'),'utf8').trim().split(/\r?\n/).map(row=>{const i=row.indexOf('=');return[row.slice(0,i),row.slice(i+1)];}));
  for(const key of ['DATABASE_URL','POST28_TRANSACTION_SETUP_URL']){const url=new URL(bindings[key]);assert.equal(url.hostname,'127.0.0.1');assert.equal(url.port,'60157');}
  const {preflightTargets}=await import(pathToFileURL(path.join(root,'scripts/database/post28-isolation.mjs')));
  const {readDatabaseIdentity}=await import(pathToFileURL(path.join(root,'scripts/database/post28-preflight.mjs')));
  await preflightTargets(contract,[{label:'DB-T',url:bindings.DATABASE_URL}],{...process.env,...bindings},contract.sourceSha,readDatabaseIdentity,{requireValidatedCatalog:true});
  const setup=client(bindings.POST28_TRANSACTION_SETUP_URL),app=client(bindings.DATABASE_URL);let checks=0,created=false;
  const {PrismaStaffWorkspaceRepository}=await import(pathToFileURL(path.join(root,'packages/infrastructure/src/identity/PrismaStaffWorkspaceRepository.ts')));
  const {StaffWorkspaceUseCases}=await import(pathToFileURL(path.join(root,'packages/application/src/identity/StaffWorkspaceUseCases.ts')));
  const {AtomicDomainMutationCoordinator}=await import(pathToFileURL(path.join(root,'packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts')));
  const {AtomicAuditedOutboxMutationExecutor}=await import(pathToFileURL(path.join(root,'packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts')));
  const {PrismaAuditRecordRepository}=await import(pathToFileURL(path.join(root,'packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts')));
  const {PrismaTransactionalOutboxStore}=await import(pathToFileURL(path.join(root,'packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts')));
  try{
    const before=await presence(setup);assert.ok(before.every(r=>r.relation===null));
    await setup.$transaction(async tx=>{for(const statement of statements)await tx.$executeRawUnsafe(statement);await grant(tx,'post28_app');},{timeout:60000,maxWait:30000});created=true;
    try{
      await app.$transaction(async tx=>{
        await tx.$executeRawUnsafe("SET LOCAL lock_timeout='5s'");
        const privileges=await permissions(tx,'post28_app');assert.ok(privileges.every(p=>p.read&&p.insert&&!p.delete&&!p.truncate));checks++;
        const boundary={boundaryId:randomUUID(),transactionClient:tx};
        const repository=new PrismaStaffWorkspaceRepository(tx);
        const executor=new AtomicAuditedOutboxMutationExecutor({execute:work=>work(boundary)},new PrismaAuditRecordRepository(app),new PrismaTransactionalOutboxStore(app));
        const owner=new StaffWorkspaceUseCases(repository,new AtomicDomainMutationCoordinator(executor));
        const context={actorId:randomUUID(),source:'isolated-staff-acceptance'},depId=randomUUID(),titleId=randomUUID(),draftId=randomUUID();
        await owner.department({id:depId,name:'Isolated audited department'},'Isolated acceptance only',context);
        await owner.title({id:titleId,name:'Isolated audited title',description:'Only isolated acceptance',departmentId:depId},'Isolated acceptance only',context);
        const audited=await owner.createDraft({id:draftId,displayName:'Isolated audited staff',email:'audited@example.test',kind:'EMPLOYEE',departmentId:depId,jobTitleId:titleId,reason:'Isolated acceptance only'},context);
        assert.equal(audited.status,'DRAFT');assert.equal((await repository.events({limit:20,membershipId:draftId})).items.length,1);
        assert.equal(await tx.auditRecord.count({where:{targetId:draftId}}),1);assert.equal(await tx.transactionalOutboxRecord.count({where:{aggregateId:draftId}}),1);checks++;
        await owner.cancelDraft(draftId,1,'Isolated cancellation',context);
        assert.equal((await repository.get(draftId)).status,'CANCELLED');assert.equal((await repository.events({limit:20,membershipId:draftId})).items.length,2);
        assert.equal(await tx.auditRecord.count({where:{targetId:draftId}}),2);assert.equal(await tx.transactionalOutboxRecord.count({where:{aggregateId:draftId}}),2);checks++;
        const department=randomUUID(),title=randomUUID(),member=randomUUID();
        await tx.staffDepartmentRecord.create({data:{id:department,name:'Isolated test department'}});
        await tx.staffJobTitleRecord.create({data:{id:title,name:'Isolated test title',description:'Only in rolled-back local lab transaction',departmentId:department}});
        await tx.staffMembershipRecord.create({data:{id:member,publicId:'EMP-LAB-'+randomUUID(),kind:'EMPLOYEE',draftName:'Isolated draft',draftEmail:'isolated@example.test',departmentId:department,jobTitleId:title,reason:'Isolated acceptance',createdBy:'isolated'}});
        await tx.staffLifecycleEventRecord.create({data:{membershipId:member,eventType:'DRAFT_CREATED',actorId:'isolated',reason:'Isolated acceptance'}});
        const row=await tx.staffMembershipRecord.findUnique({where:{id:member},include:{department:true,jobTitle:true,events:true}});
        assert.equal(row.status,'DRAFT');assert.equal(row.identityId,null);assert.equal(row.events.length,1);assert.equal(row.jobTitle.departmentId,department);checks++;
        await tx.staffMembershipRecord.update({where:{id:member},data:{status:'CANCELLED',version:{increment:1}}});checks++;
        const rejects=async(label,fn)=>{await tx.$executeRawUnsafe('SAVEPOINT staff_negative');let rejected=false;try{await fn();}catch{rejected=true;}await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT staff_negative');await tx.$executeRawUnsafe('RELEASE SAVEPOINT staff_negative');assert.ok(rejected,label);checks++;};
        await rejects('immutable lifecycle log',()=>tx.$executeRawUnsafe('UPDATE "StaffLifecycleEventRecord" SET reason=$1 WHERE "membershipId"=$2','tampered',member));
        await rejects('delete forbidden',()=>tx.$executeRawUnsafe('DELETE FROM "StaffMembershipRecord" WHERE id=$1',member));
        await rejects('invalid identity rejected',()=>tx.staffMembershipRecord.create({data:{id:randomUUID(),publicId:'EMP-LAB-'+randomUUID(),identityId:randomUUID(),kind:'EMPLOYEE',reason:'isolated',createdBy:'isolated'}}));
        await rejects('missing draft source rejected',()=>tx.staffMembershipRecord.create({data:{id:randomUUID(),publicId:'EMP-LAB-'+randomUUID(),kind:'EMPLOYEE',reason:'isolated',createdBy:'isolated'}}));
        await rejects('invalid date range rejected',()=>tx.staffMembershipRecord.create({data:{id:randomUUID(),publicId:'EMP-LAB-'+randomUUID(),draftName:'isolated',draftEmail:'date@example.test',kind:'EMPLOYEE',startsAt:new Date('2026-10-28'),endsAt:new Date('2026-10-27'),reason:'isolated',createdBy:'isolated'}}));
        const draft={id:randomUUID(),publicId:'EMP-LAB-'+randomUUID(),draftName:'isolated',draftEmail:'duplicate@example.test',kind:'EMPLOYEE',reason:'isolated',createdBy:'isolated'};
        await tx.staffMembershipRecord.create({data:draft});
        await rejects('case insensitive duplicate rejected',()=>tx.staffMembershipRecord.create({data:{...draft,id:randomUUID(),publicId:'EMP-LAB-'+randomUUID(),draftEmail:'DUPLICATE@example.test'}}));
        throw Error('EXPECTED_STAFF_LAB_ROLLBACK');
      },{timeout:60000,maxWait:30000});
    }catch(error){if(error.message!=='EXPECTED_STAFF_LAB_ROLLBACK')throw error;}
    await setup.$transaction(async tx=>{for(const table of [...tables].reverse())await tx.$executeRawUnsafe(`DROP TABLE ${ident(table)}`);});created=false;
    assert.deepEqual(await presence(setup),before);checks++;
    const result={pass:true,scope:'ISOLATED_LOCAL_POSTGRES16_ONLY',checks,rollbackVerified:true,checksum,originalWrites:0};report('schema-lab-verified.json',result);console.log(JSON.stringify(result));
  }finally{if(created){await setup.$transaction(async tx=>{for(const table of [...tables].reverse())await tx.$executeRawUnsafe(`DROP TABLE ${ident(table)}`);});}await setup.$disconnect();await app.$disconnect();}
}

try { await lab(); } catch(error) { console.error(JSON.stringify({pass:false,code:error.code??'STAFF_LAB_FAILED',reason:String(error.message??error).replace(/postgres(?:ql)?:\/\/[^\s"']+/g,'[PRIVATE_DATABASE_URL]').slice(0,650)}));process.exitCode=1; }