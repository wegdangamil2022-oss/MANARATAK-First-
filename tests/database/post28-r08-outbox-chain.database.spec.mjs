import {randomUUID} from 'node:crypto';
import {spawn} from 'node:child_process';
import {PrismaClient} from '@prisma/client';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
let db;
const fresh=()=> 'post28-r08-'+randomUUID();
async function fixture(){
  const identity=fresh(),assignment=fresh(),event=fresh();
  await db.identityRecord.create({data:{id:identity,type:'Human',status:'ACTIVE',createdBy:'post28-synthetic',user:{create:{displayName:'Synthetic R08',primaryEmail:identity+'@example.invalid',isEmailVerified:true}},account:{create:{accessState:'Active'}}}});
  await db.roleRecord.upsert({where:{id:'student'},update:{},create:{id:'student',name:'Synthetic student',description:'Isolated fixture',permissions:[],policyIds:[]}});
  await db.roleAssignmentRecord.create({data:{id:assignment,identityId:identity,roleId:'student'}});
  await db.transactionalOutboxRecord.create({data:{id:event,eventType:'RoleAssignmentCreated',domain:'AUTHORIZATION',aggregateType:'ROLE_ASSIGNMENT',aggregateId:assignment,payload:{assignmentId:assignment,identityId:identity,roleId:'student'},metadata:{schemaVersion:'1.0.0'},availableAt:new Date(Date.now()-1000)}});
  return {identity,event};
}
function worker(c,mode='NORMAL'){
  const child=spawn(process.execPath,['--import','tsx','tests/database/fixtures/post28-r08-outbox-worker.mjs',c.event,mode],{env:{...process.env},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});
  let output='',result;const points=new Set(),waiters=new Map();
  child.stdout.on('data',b=>output+=b);child.stderr.on('data',b=>output+=b);
  child.on('message',m=>{points.add(m.point);if(m.result)result=m.result;waiters.get(m.point)?.();});
  const done=new Promise(resolve=>{child.once('exit',(code,signal)=>resolve({code,signal}));child.once('error',error=>resolve({error}));});
  return {child,done,async wait(point){if(points.has(point))return;let timer;try{await Promise.race([new Promise(resolve=>waiters.set(point,resolve)),done.then(()=>{throw Error('WORKER_EXIT_BEFORE_'+point+':'+output.slice(-1000));}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('WORKER_BARRIER_TIMEOUT:'+point)),15000);})]);}finally{clearTimeout(timer);waiters.delete(point);}},async finish(){const exit=await Promise.race([done,new Promise(resolve=>{const t=setTimeout(()=>{child.kill('SIGKILL');resolve({timeout:true});},20000);t.unref();})]);expect(exit).toEqual({code:0,signal:null});return result;},async kill(){child.kill('SIGKILL');await done;}};
}
async function facts(c){return {outbox:await db.transactionalOutboxRecord.findUniqueOrThrow({where:{id:c.event}}),inbox:await db.studentWorkspaceEventInbox.findMany({where:{studentReferenceId:c.identity},orderBy:{eventId:'asc'}}),workspace:await db.studentWorkspace.findUnique({where:{studentReferenceId:c.identity}}),audits:await db.auditRecord.findMany({where:{targetId:c.identity},orderBy:{id:'asc'}})};}
async function waitExpiry(c){const row=await db.transactionalOutboxRecord.findUniqueOrThrow({where:{id:c.event}});const ms=Math.max(0,row.claimUntil.getTime()-Date.now()+75);expect(ms).toBeLessThan(5000);await new Promise(resolve=>setTimeout(resolve,ms));}
describe('R08 actual outbox processes to student inbox',()=>{
  beforeAll(async()=>{if(process.env.POST28_DATABASE_SUITE!=='r08-outbox-chain'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');});
  afterAll(async()=>{await db?.$disconnect();});
  it('excludes a second real process while the first owns a live lease',async()=>{
    const c=await fixture(),a=worker(c,'BEFORE_EFFECT');try{await a.wait('BEFORE_EFFECT');const b=worker(c);expect((await b.finish()).claimed).toBe(0);a.child.send('CONTINUE');expect((await a.finish()).processed).toBe(1);const f=await facts(c);expect(f.workspace.status).toBe('ACTIVE');expect(f.inbox.map(r=>r.eventId)).toEqual([c.event,c.event+':role-active']);expect(f.outbox.state).toBe('PROCESSED');}finally{await a.kill();}
  });
  for(const mode of ['BEFORE_EFFECT','AFTER_EFFECT'])it('recovers an actual killed '+mode+' worker after natural lease expiry',async()=>{
    const c=await fixture(),a=worker(c,mode);try{await a.wait(mode);}finally{await a.kill();}
    const before=await facts(c);expect(before.outbox.state).toBe('PROCESSING');expect(before.inbox).toHaveLength(mode==='AFTER_EFFECT'?2:0);
    await waitExpiry(c);expect((await worker(c).finish()).processed).toBe(1);const after=await facts(c);expect(after.inbox).toHaveLength(2);expect(after.workspace.status).toBe('ACTIVE');expect(after.outbox.claimToken).toBeNull();
    if(mode==='AFTER_EFFECT'){expect(after.inbox).toEqual(before.inbox);expect(after.workspace).toEqual(before.workspace);expect(after.audits).toEqual(before.audits);}
    expect((await worker(c).finish()).claimed).toBe(0);
  });
  it('retries a failed delivery then parks exhausted work without projecting an effect',async()=>{
    const c=await fixture();expect(await worker(c,'FAIL').finish()).toMatchObject({failed:1,exhausted:0});let row=(await facts(c)).outbox;expect(row.attempts).toBe(1);await new Promise(resolve=>setTimeout(resolve,Math.max(0,row.availableAt.getTime()-Date.now()+25)));expect(await worker(c,'FAIL').finish()).toMatchObject({failed:1,exhausted:1});const f=await facts(c);expect(f.outbox.attempts).toBe(2);expect(f.outbox.availableAt.getUTCFullYear()).toBe(9999);expect(f.inbox).toHaveLength(0);expect(f.workspace).toBeNull();expect((await worker(c).finish()).claimed).toBe(0);
  });
});
