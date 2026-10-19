import {randomUUID,randomBytes} from 'node:crypto';
import {spawn} from 'node:child_process';
import {beforeAll,afterAll,describe,it,expect} from 'vitest';
import {PrismaClient} from '@prisma/client';
import {generateEphemeralJwtKeySet} from '../../packages/infrastructure/src/auth/JwtTokenProvider.ts';
import {PasswordHasher} from '../../packages/infrastructure/src/auth/PasswordHasher.ts';
let db,a,b;const servers=[];
async function start(config){
  const child=spawn(process.execPath,['--import','tsx','tests/database/fixtures/post28-r08-session-server.mjs'],{env:{...process.env,NODE_ENV:'test',CORS_ORIGIN:'https://web.example.invalid'},windowsHide:true,stdio:['ignore','pipe','pipe','ipc']});child.stdout.resume();child.stderr.resume();
  let exited=false;const done=new Promise(resolve=>{child.once('exit',(code,signal)=>{exited=true;resolve({code,signal});});child.once('error',error=>resolve({error:error.code}));});
  const handle={child,done,async stop(){if(!exited){child.send('STOP');let timer;try{await Promise.race([done,new Promise(resolve=>{timer=setTimeout(()=>{child.kill('SIGKILL');resolve();},5000);})]);}finally{clearTimeout(timer);}}await done;}};servers.push(handle);
  const events=new Map(),failures=[];
  child.on('message',m=>{if(m.point==='TRANSACTION_FAILURE')failures.push(m.code);events.get(m.point)?.();});
  const next=point=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('R08_SESSION_EVENT_TIMEOUT:'+point)),5000);events.set(point,()=>{clearTimeout(timer);events.delete(point);resolve();});});
  const readyMessage=new Promise(resolve=>child.on('message',m=>{if(m.point==='WAITING_CONFIG')child.send(config);if(m.point==='READY')resolve(m);}));
  let timer;try{const ready=await Promise.race([readyMessage,done.then(()=>{throw Error('R08_SESSION_CHILD_EXIT');}),new Promise((_,reject)=>{timer=setTimeout(()=>reject(Error('R08_SESSION_CHILD_TIMEOUT')),15000);})]);return {...handle,url:'http://127.0.0.1:'+ready.port,next,failures};}finally{clearTimeout(timer);}
}
async function call(server,path,jar={},method='GET',body,csrf,origin='https://web.example.invalid'){
  const headers={Origin:origin,Cookie:Object.entries(jar).map(([k,v])=>k+'='+v).join(';')};if(body)headers['Content-Type']='application/json';if(csrf)headers['X-CSRF-Token']=csrf;
  const r=await fetch(server.url+'/api/v1'+path,{method,headers,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)}),next={...jar};
  for(const value of r.headers.getSetCookie()){expect(value.toLowerCase()).toContain('httponly');expect(value.toLowerCase()).toContain('samesite=strict');expect(value.toLowerCase()).not.toContain('partitioned');const pair=value.split(';')[0],at=pair.indexOf('=');if(pair.slice(at+1))next[pair.slice(0,at)]=pair.slice(at+1);else delete next[pair.slice(0,at)];}
  return {status:r.status,body:await r.json(),jar:next};
}
async function login(){const id='post28-r08-session-'+randomUUID(),password=randomBytes(24).toString('hex'),email=id+'@example.invalid';await db.identityRecord.create({data:{id,type:'Human',status:'ACTIVE',createdBy:'post28-synthetic',user:{create:{displayName:'Synthetic session',primaryEmail:email,isEmailVerified:true}},account:{create:{accessState:'Active'}},credentials:{create:{type:'password',passwordHash:await PasswordHasher.hash(password)}}}});const r=await call(a,'/auth/login',{},'POST',{email,password});expect(r.status).toBe(200);return {id,jar:r.jar};}
const csrf=async(server,jar)=>{const r=await call(server,'/auth/csrf-token',jar);expect(r.status).toBe(200);return r.body.data.csrfToken;};
const active=id=>db.sessionRecord.count({where:{identityId:id,revokedAt:null}});
describe('R08 two real HTTP auth processes with persistent shared sessions',()=>{
  beforeAll(async()=>{if(process.env.POST28_DATABASE_SUITE!=='r08-session-processes'||process.env.POST28_TARGET_LABEL!=='DB-T'||process.env.POST28_TRANSACTION_SETUP_URL)throw Error('POST28_DB_T_RUNNER_REQUIRED');db=new PrismaClient({log:[],errorFormat:'minimal'});await db.$connect();expect((await db.$queryRaw`SELECT current_user AS role`)[0].role).toBe('post28_app');const config={keys:generateEphemeralJwtKeySet(),csrf:randomBytes(32).toString('hex')};
    // Bootstrap material is sent only over IPC, never argv, files or test reports.
    a=await start(config);b=await start(config);
  });
  afterAll(async()=>{await Promise.all(servers.map(s=>s.stop()));await db?.$disconnect();});
  it('logs in on A, rotates on B and revokes the shared session on logout from A',async()=>{const c=await login();expect((await call(b,'/private',c.jar)).status).toBe(200);const r=await call(b,'/auth/refresh',c.jar,'POST',undefined,await csrf(a,c.jar));expect(r.status).toBe(200);expect((await call(a,'/private',c.jar)).status).toBe(401);expect((await call(a,'/private',r.jar)).status).toBe(200);expect((await call(a,'/auth/logout',r.jar,'POST',undefined,await csrf(b,r.jar))).status).toBe(200);expect((await call(b,'/private',r.jar)).status).toBe(401);expect(await active(c.id)).toBe(0);const rows=await db.sessionRecord.findMany({where:{identityId:c.id}});expect(rows).toHaveLength(2);for(const row of rows){expect(row.refreshTokenHash).toMatch(/^[a-f0-9]{64}$/);expect(row.refreshTokenHash).not.toBe(c.jar.manaratak_refresh);}});
  it('replayed parent on another process revokes its already rotated descendant',async()=>{const c=await login(),token=await csrf(a,c.jar),r=await call(a,'/auth/refresh',c.jar,'POST',undefined,token);expect(r.status).toBe(200);expect((await call(b,'/auth/refresh',c.jar,'POST',undefined,token)).status).toBe(401);expect((await call(a,'/private',r.jar)).status).toBe(401);expect(await active(c.id)).toBe(0);});
  it('suspension is observed across processes and stale CSRF bootstrap cannot restore access',async()=>{const c=await login();await db.identityRecord.update({where:{id:c.id},data:{status:'SUSPENDED'}});expect((await call(b,'/private',c.jar)).status).toBe(401);expect((await call(a,'/auth/csrf-token',c.jar)).status).toBe(401);expect(await active(c.id)).toBe(0);});
  it('rejects missing CSRF and foreign origin without rotating or revoking a valid session',async()=>{const c=await login(),before=await db.sessionRecord.findMany({where:{identityId:c.id}});expect((await call(b,'/auth/refresh',c.jar,'POST')).status).toBe(403);expect((await call(b,'/auth/refresh',c.jar,'POST',undefined,await csrf(a,c.jar),'https://foreign.example.invalid')).status).toBe(403);expect(await db.sessionRecord.findMany({where:{identityId:c.id}})).toEqual(before);expect((await call(a,'/private',c.jar)).status).toBe(200);});
  it('revokes the committed descendant after a deterministically concurrent refresh serialization conflict',async()=>{
    const c=await login(),token=await csrf(a,c.jar);
    const armedA=a.next('ARMED'),armedB=b.next('ARMED');a.child.send('ARM_ROTATION_BARRIER');b.child.send('ARM_ROTATION_BARRIER');await Promise.all([armedA,armedB]);
    const readA=a.next('ROTATION_READ'),readB=b.next('ROTATION_READ');
    const pendingA=call(a,'/auth/refresh',c.jar,'POST',undefined,token),pendingB=call(b,'/auth/refresh',c.jar,'POST',undefined,token);
    await Promise.all([readA,readB]);a.child.send('RELEASE_ROTATION');const first=await pendingA;expect(first.status).toBe(200);
    b.child.send('RELEASE_ROTATION');const second=await pendingB;expect(second.status).toBe(401);expect(b.failures).toContain('P2034');
    expect(await active(c.id)).toBe(0);expect((await call(a,'/private',first.jar)).status).toBe(401);
  });
});
