// No URL argument: accepts only a signed/attested disposable local lab directory.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { randomUUID, createHash } from 'node:crypto';
import { pathToFileURL } from 'node:url';
assert.equal(process.argv.length, 4, 'LAB_AND_EVIDENCE_DIRECTORIES_REQUIRED');
const root = process.cwd(),
  dir = path.resolve(process.argv[2]),
  evidence = path.resolve(process.argv[3]);
assert.ok(fs.statSync(evidence).isDirectory());
const state = JSON.parse(fs.readFileSync(path.join(dir, 'lab-state.json'), 'utf8')),
  contract = JSON.parse(fs.readFileSync(path.join(dir, 'targets.json'), 'utf8'));
const { assertNativeLabState } = await import('./post28-native-lab-policy.mjs');
assertNativeLabState(state, contract, state.sourceSha, dir);
const bindings = Object.fromEntries(
  fs
    .readFileSync(path.join(dir, 'lab.env'), 'utf8')
    .trim()
    .split(/\r?\n/)
    .map((line) => {
      const i = line.indexOf('=');
      return [line.slice(0, i), line.slice(i + 1)];
    }),
);
for (const key of ['DATABASE_URL', 'POST28_TRANSACTION_SETUP_URL']) {
  const u = new URL(bindings[key]);
  assert.equal(u.hostname, '127.0.0.1');
  assert.equal(u.port, '60157');
}
const { preflightTargets } = await import('./post28-isolation.mjs'),
  { readDatabaseIdentity } = await import('./post28-preflight.mjs');
await preflightTargets(
  contract,
  [{ label: 'DB-T', url: bindings.DATABASE_URL }],
  { ...process.env, ...bindings },
  contract.sourceSha,
  readDatabaseIdentity,
  { requireValidatedCatalog: true },
);
const require = createRequire(path.join(root, 'package.json')),
  { PrismaClient } = require('@prisma/client');
const setup = new PrismaClient({
    datasources: { db: { url: bindings.POST28_TRANSACTION_SETUP_URL } },
    errorFormat: 'minimal',
    log: [],
  }),
  app = new PrismaClient({
    datasources: { db: { url: bindings.DATABASE_URL } },
    errorFormat: 'minimal',
    log: [],
  });

const names=['20261028000100_staff_draft_organization','20261028000300_staff_lifecycle'];
const tables=['StaffGrantSourceRecord','StaffAdminAccessRecord','StaffChangeRequestRecord','StaffInvitationRecord','StaffLifecycleEventRecord','StaffMembershipRecord','StaffJobTitleRecord','StaffDepartmentRecord'];
const ident=s=>'"'+s.replaceAll('"','""')+'"';
const fromRoot=async p=>import(pathToFileURL(path.join(root,p)));
const {PrismaStaffLifecycleRepository}=await fromRoot('packages/infrastructure/src/identity/PrismaStaffLifecycleRepository.ts');
const {StaffLifecycleUseCases}=await fromRoot('packages/application/src/identity/StaffLifecycleUseCases.ts');
const {AtomicDomainMutationCoordinator}=await fromRoot('packages/application/src/event-foundation/use-cases/AtomicDomainMutationCoordinator.ts');
const {AtomicAuditedOutboxMutationExecutor}=await fromRoot('packages/application/src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor.ts');
const {PrismaAuditRecordRepository}=await fromRoot('packages/infrastructure/src/audit/PrismaAuditRecordRepository.ts');
const {PrismaTransactionalOutboxStore}=await fromRoot('packages/infrastructure/src/event-foundation/PrismaTransactionalOutboxStore.ts');
const baseline=async db=>({identities:await db.identityRecord.count(),users:await db.userRecord.count(),credentials:await db.credentialRecord.count(),roles:await db.roleAssignmentRecord.count(),audit:await db.auditRecord.count(),outbox:await db.transactionalOutboxRecord.count()});
let installed=false,checks=0;
try{
 const before=await baseline(setup);
 for(const table of tables){const rows=await setup.$queryRawUnsafe('SELECT to_regclass($1)::text AS relation','public.'+ident(table));assert.equal(rows[0].relation,null,'LAB_STAFF_TABLE_ALREADY_PRESENT');}
 assert.equal((await new PrismaStaffLifecycleRepository(app,async()=>true).readiness()).ready,false);checks++;
 await setup.$transaction(async tx=>{for(const name of names){const sql=fs.readFileSync(path.join(root,'packages/infrastructure/prisma/migrations',name,'migration.sql'),'utf8');for(const statement of sql.replace(/^\s*--[^\n]*(?:\n|$)/gm,'').split(';').map(s=>s.trim()).filter(Boolean)){assert.ok(/^(CREATE TABLE|CREATE (?:UNIQUE )?INDEX|ALTER TABLE)/.test(statement));await tx.$executeRawUnsafe(statement);}}});installed=true;
 await setup.$executeRawUnsafe('GRANT SELECT,INSERT,UPDATE ON '+tables.filter(t=>t!=='StaffLifecycleEventRecord').map(ident).join(',')+' TO post28_app');
 await setup.$executeRawUnsafe('GRANT SELECT,INSERT ON "StaffLifecycleEventRecord" TO post28_app');
 assert.equal((await new PrismaStaffLifecycleRepository(app,async()=>true).readiness()).ready,true);checks++;
 const rollback='STAFF_LIFECYCLE_LAB_ROLLBACK_'+randomUUID();
 try{await app.$transaction(async tx=>{
  await tx.$executeRawUnsafe("SET LOCAL lock_timeout='5s'");
  const boundary={boundaryId:randomUUID(),transactionClient:tx};
  const runner={execute:async work=>{await tx.$executeRawUnsafe('SAVEPOINT staff_command');try{const result=await work(boundary);await tx.$executeRawUnsafe('RELEASE SAVEPOINT staff_command');return result;}catch(error){await tx.$executeRawUnsafe('ROLLBACK TO SAVEPOINT staff_command');await tx.$executeRawUnsafe('RELEASE SAVEPOINT staff_command');throw error;}}};
  const repo=new PrismaStaffLifecycleRepository(tx,async()=>true),atomic=new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(runner,new PrismaAuditRecordRepository(app),new PrismaTransactionalOutboxStore(app))),owner=new StaffLifecycleUseCases(repo,atomic,'isolated-staff-token-service-key-long-enough');
  const maker=randomUUID(),reviewer=randomUUID(),employee=randomUUID(),stranger=randomUUID();
  for(const id of [maker,reviewer,employee,stranger])await tx.identityRecord.create({data:{id,type:'Human',status:'ACTIVE',createdBy:'isolated-staff-lifecycle',user:{create:{displayName:'Lab account',primaryEmail:id+'@example.test',isEmailVerified:true}},account:{create:{accessState:'ACTIVE'}},credentials:{create:[{type:'password',passwordHash:'isolated-never-authenticate'},{type:'TOTP',passwordHash:JSON.stringify({confirmed:true})}]}}});
  const studentRole=randomUUID(),workRole=randomUUID(),adminRole=randomUUID();
  for(const [id,permissions] of [[studentRole,['student:workspace:access']],[workRole,['admin:audit:cases:view']],[adminRole,['admin:*']]])await tx.roleRecord.create({data:{id,name:'Isolated role',description:'Rollback-only lifecycle verification',permissions,policyIds:[]}});
  const studentGrant=randomUUID();await tx.roleAssignmentRecord.create({data:{id:studentGrant,identityId:employee,roleId:studentRole}});await tx.roleAssignmentRecord.create({data:{id:randomUUID(),identityId:reviewer,roleId:adminRole}});
  const membershipId=randomUUID();await tx.staffMembershipRecord.create({data:{id:membershipId,publicId:'EMP-LAB-'+randomUUID(),identityId:employee,kind:'EMPLOYEE',reason:'Isolated draft',createdBy:maker}});
  const ctx=actorId=>({actorId,source:'isolated-staff-lifecycle'}),inviteId=randomUUID(),inviteInput={id:inviteId,membershipId,version:1,reason:'Reviewed isolated invitation'};
  const first=await owner.invite(inviteInput,ctx(maker)),retry=await owner.invite(inviteInput,ctx(maker));assert.equal(first.token,retry.token);assert.equal(await tx.auditRecord.count({where:{action:'STAFF_INVITATION_ISSUED',targetId:membershipId}}),1);checks++;
  const stored=(await tx.$queryRawUnsafe('SELECT "tokenHash" FROM "StaffInvitationRecord" WHERE id=$1',inviteId))[0];assert.notEqual(stored.tokenHash,first.token);assert.match(stored.tokenHash,/^[a-f0-9]{64}$/);checks++;
  await assert.rejects(owner.accept({id:inviteId,token:first.token,confirm:true},ctx(stranger)),/INVITATION_DENIED/);assert.equal((await repo.snapshot(membershipId)).member.status,'DRAFT');checks++;
  await assert.rejects(owner.accept({id:inviteId,token:'x'.repeat(43),confirm:true},ctx(employee)),/INVITATION_DENIED/);checks++;
  const accepted=await owner.accept({id:inviteId,token:first.token,confirm:true},ctx(employee));assert.equal(accepted.activated,false);assert.equal((await repo.snapshot(membershipId)).accepted,true);assert.equal(await tx.roleAssignmentRecord.count({where:{identityId:employee}}),1);checks++;
  await assert.rejects(owner.accept({id:inviteId,token:first.token,confirm:true},ctx(employee)),/INVITATION_DENIED/);checks++;
  const reqId=randomUUID(),activation=await owner.request({id:reqId,membershipId,version:2,action:'ACTIVATE',payload:{},reason:'Reviewed activation'},ctx(maker));
  await assert.rejects(owner.approve(reqId,1,ctx(maker)),/APPROVAL_DENIED/);checks++;
  await owner.approve(reqId,activation.version,ctx(reviewer));await owner.apply(reqId,2,ctx(maker));assert.equal((await repo.snapshot(membershipId)).member.status,'ACTIVE');assert.equal(await repo.adminAccessAllowed(employee),true);assert.equal(await tx.roleAssignmentRecord.count({where:{identityId:employee}}),1);checks++;
  await assert.rejects(owner.apply(reqId,2,ctx(maker)),/APPROVAL_REQUIRED/);checks++;
  const grant=randomUUID();await tx.roleAssignmentRecord.create({data:{id:grant,identityId:employee,roleId:workRole}});await repo.recordGrant(grant,membershipId,boundary);assert.equal((await repo.snapshot(membershipId)).ownedGrants,1);checks++;
  const offId=randomUUID(),current=(await repo.snapshot(membershipId)).member;await owner.request({id:offId,membershipId,version:current.version,action:'OFFBOARD',payload:{},reason:'Reviewed offboarding'},ctx(maker));await owner.approve(offId,1,ctx(reviewer));
  // Mandatory audit failure must roll back the business change, access fence and approval consumption.
  const broken=new StaffLifecycleUseCases(repo,new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(runner,{saveInTransaction:async()=>{throw Error('LAB_AUDIT_UNAVAILABLE');}},new PrismaTransactionalOutboxStore(app))),'isolated-staff-token-service-key-long-enough');
  await assert.rejects(broken.apply(offId,2,ctx(maker)),/LAB_AUDIT_UNAVAILABLE/);assert.equal((await repo.snapshot(membershipId)).member.status,'ACTIVE');assert.equal((await repo.request(offId,boundary)).usedAt,null);assert.equal(await tx.roleAssignmentRecord.count({where:{id:grant}}),1);checks++;
  await owner.apply(offId,2,ctx(maker));assert.equal((await repo.snapshot(membershipId)).member.status,'ENDED');assert.equal(await repo.adminAccessAllowed(employee),false);checks++;
  assert.equal(await tx.roleAssignmentRecord.count({where:{id:grant}}),0);assert.equal(await tx.roleAssignmentRecord.count({where:{id:studentGrant}}),1);const account=await tx.identityRecord.findUnique({where:{id:employee},include:{account:true,user:true,credentials:true}});assert.equal(account.status,'ACTIVE');assert.equal(account.account.accessState,'ACTIVE');assert.equal(account.user.isEmailVerified,true);assert.equal(account.credentials.length,2);assert.ok(account.credentials.every(c=>!c.disabled));checks++;
  assert.equal(await repo.adminAccessAllowed(stranger),true);checks++;
  await assert.rejects(repo.recordGrant(studentGrant,membershipId,boundary),/GRANT_SOURCE_DENIED/);checks++;
  const sensitive=JSON.stringify(await tx.auditRecord.findMany({where:{targetId:{in:[membershipId,inviteId]}}}))+JSON.stringify(await tx.transactionalOutboxRecord.findMany({where:{aggregateId:{in:[membershipId,inviteId]}}}));assert.ok(!sensitive.includes(first.token));assert.ok(!sensitive.includes(employee+'@example.test'));checks++;
  await tx.roleAssignmentRecord.deleteMany({where:{identityId:reviewer}});await assert.rejects(repo.assertRecoveryAdmin(employee,boundary),/LAST_RECOVERY_ADMIN/);checks++;
  throw Error(rollback);
 },{timeout:90000,maxWait:30000});}catch(error){if(error.message!==rollback)throw error;}
 assert.deepEqual(await baseline(setup),before);checks++;
 const result={pass:true,checks,profile:'ATTESTED_DISPOSABLE_LOCAL_LAB',migrations:names.map(name=>({name,checksum:createHash('sha256').update(fs.readFileSync(path.join(root,'packages/infrastructure/prisma/migrations',name,'migration.sql'))).digest('hex')})),transactionRollbackVerified:true,originalWrites:0,at:new Date().toISOString()};fs.writeFileSync(path.join(evidence,'staff-lifecycle-lab.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));
}finally{if(installed)await setup.$transaction(async tx=>{for(const table of tables)await tx.$executeRawUnsafe('DROP TABLE '+ident(table));});await app.$disconnect();await setup.$disconnect();}
