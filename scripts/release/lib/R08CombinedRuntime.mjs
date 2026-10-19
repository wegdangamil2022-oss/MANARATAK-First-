import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import net from 'node:net';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {randomBytes,generateKeyPairSync,createHash} from 'node:crypto';

// Owned synthetic resources only. No deployment settings or external providers.
export class R08CombinedRuntime {
  constructor({docker,state,imageId,secrets}) { Object.assign(this,{docker,state,imageId,secrets});this.backend='A'; }
  prepare() {
    const {docker,state,secrets}=this;
    this.namespace='post28:r08:combined:'+state.runId+':';this.redisName='post28-r08-redis-'+state.runId;
    const password=randomBytes(32).toString('hex'),digest=createHash('sha256').update(password).digest('hex');
    secrets.push(password,digest);
    const config=path.join(state.directory,'r08-redis.conf');
    fs.writeFileSync(config,`bind 0.0.0.0\nport 6379\nprotected-mode yes\nsave ""\nappendonly no\nuser default off\nuser post28 on #${digest} ~${this.namespace}* +ping +get +set +eval +incr +pexpire +pttl +quit +hello +client|setinfo +client|setname\n`,{mode:0o444,flag:'wx'});
    docker(['pull','redis:7-alpine']);const [image]=JSON.parse(docker(['image','inspect','redis:7-alpine']));
    assert.equal(image.Os,'linux');assert.equal(image.Architecture,'amd64');
    this.redisImageDigest=image.RepoDigests.find(value=>/^redis@sha256:[a-f0-9]{64}$/.test(value));assert(this.redisImageDigest);
    this.redisId=docker(['run','-d','--name',this.redisName,'--label','codex.post28.run='+state.runId,'--network',state.network,'--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--user','redis','--tmpfs','/data:rw,noexec,nosuid,size=16m','-v',config+':/usr/local/etc/redis/redis.conf:ro',this.redisImageDigest,'redis-server','/usr/local/etc/redis/redis.conf']);
    const keys=generateKeyPairSync('rsa',{modulusLength:2048}),pem=key=>key.export({type:key===keys.privateKey?'pkcs8':'spki',format:'pem'}).toString();
    const privateKey=pem(keys.privateKey),publicKey=pem(keys.publicKey),csrf=randomBytes(32).toString('hex');
    const redisUrl=`redis://post28:${password}@${this.redisName}:6379`;
    secrets.push(privateKey,privateKey.replaceAll('\n','\\n'),csrf,redisUrl);
    return {REDIS_URL:redisUrl,REDIS_NAMESPACE:this.namespace,CSRF_SECRET:csrf,JWT_ACTIVE_KEY_ID:'post28-combined',JWT_PRIVATE_KEY_PEM:privateKey.replaceAll('\n','\\n'),JWT_PUBLIC_KEY_PEM:publicKey.replaceAll('\n','\\n')};
  }
  inspectOwned(id) {
    const [item]=JSON.parse(this.docker(['inspect',id]));assert.equal(item.Config.Labels['codex.post28.run'],this.state.runId);return item;
  }
  async route(primaryAddress,envFile) {
    this.replicaId=this.docker(['run','-d','--label','codex.post28.run='+this.state.runId,'--network',this.state.network,'--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--memory=768m','--pids-limit=128','--tmpfs','/opt/manaratak/storage:rw,uid=1000,gid=1000,mode=0700,size=67108864','--tmpfs','/tmp:rw,nosuid,noexec,size=16777216','--env-file',envFile,this.imageId]);
    const replica=this.inspectOwned(this.replicaId);assert.equal(replica.Image,this.imageId);assert.equal(replica.Config.User,'node');assert.equal(replica.HostConfig.ReadonlyRootfs,true);
    const secondary=replica.NetworkSettings.Networks[this.state.network].IPAddress;assert.equal(net.isIP(secondary),4);
    this.addresses={A:primaryAddress,B:secondary};
    this.router=http.createServer((req,res)=>{
      const backend=this.backend;
      const upstream=http.request({hostname:this.addresses[backend],port:3000,path:req.url,method:req.method,headers:req.headers,timeout:10000},reply=>{res.writeHead(reply.statusCode??502,{...reply.headers,'x-post28-review-backend':backend});reply.pipe(res);});
      upstream.on('timeout',()=>upstream.destroy());upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
    });
    this.router.listen(0,'127.0.0.1');await once(this.router,'listening');return this.router.address().port;
  }
  async exercise({page,origin,email,password,db,fixtureId}) {
    const call=(route,method='GET',body,csrf)=>page.evaluate(async({route,method,body,csrf})=>{
      const response=await fetch('/api/v1'+route,{method,credentials:'include',headers:{...(body?{'Content-Type':'application/json'}:{}),...(csrf?{'X-CSRF-Token':csrf}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
      return {status:response.status,backend:response.headers.get('x-post28-review-backend'),body:await response.json().catch(()=>({}))};
    },{route,method,body,csrf});
    // Both real images must be ready before sending any identity data.
    await page.goto(origin+'/login');
    for(const backend of ['A','B']){
      this.backend=backend;let ready=false;
      for(let n=0;n<100;n++){const response=await call('/monitoring/health/readiness');if(response.status===200){ready=true;break;}await new Promise(resolve=>setTimeout(resolve,200));}
      assert(ready,'R08_REPLICA_NOT_READY_'+backend);
    }
    this.backend='A';await page.goto(origin+'/login');await page.locator('#account-email').fill(email);await page.locator('#account-password').fill(password);
    const login=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/auth/login'&&response.request().method()==='POST');await page.locator('form button[type=submit]').click();assert.equal((await login).status(),200);await page.waitForURL('**/student');
    const cookies=await page.context().cookies();assert.equal(cookies.filter(c=>['manaratak_access','manaratak_refresh'].includes(c.name)&&c.httpOnly&&c.secure&&c.sameSite==='Strict').length,2);
    this.backend='B';let response=await call('/auth/me');assert.equal(response.status,200);assert.equal(response.backend,'B');
    let csrf=(await call('/auth/csrf-token')).body.data.csrfToken;
    assert.equal((await call('/auth/refresh','POST',undefined,csrf)).status,200);
    assert.equal(await db.sessionRecord.count({where:{identityId:fixtureId,revokedAt:null}}),1);
    this.backend='A';assert.equal((await call('/auth/me')).status,200);
    assert.equal((await call('/auth/refresh','POST')).status,403);
    this.backend='B';csrf=(await call('/auth/csrf-token')).body.data.csrfToken;assert.equal((await call('/auth/logout','POST',undefined,csrf)).status,200);
    this.backend='A';assert.equal((await call('/auth/me')).status,401);assert.equal(await db.sessionRecord.count({where:{identityId:fixtureId,revokedAt:null}}),0);
    const statuses=[],backends=[];
    for(let n=0;n<9;n++){this.backend=n%2?'B':'A';response=await call('/auth/login','POST',{email:'rate-'+fixtureId+'@example.invalid',password:'synthetic-invalid-password'});statuses.push(response.status);backends.push(response.backend);}
    assert.deepEqual(statuses,[401,401,401,401,401,401,401,401,429]);assert(backends.includes('A')&&backends.includes('B'));
    this.inspectOwned(this.redisId);this.docker(['stop','--time','2',this.redisId]);
    response=await call('/auth/login','POST',{email,password});assert.equal(response.status,500); // Fail closed: no local fallback and no new session.
    assert.equal(await db.sessionRecord.count({where:{identityId:fixtureId,revokedAt:null}}),0);
    return {apiProcesses:2,sameBuiltImage:true,persistedSessionsShared:true,refreshAcrossProcesses:true,csrfEnforced:true,logoutAcrossProcesses:true,secureHttpOnlyStrictCookies:true,distributedLogin:{requests:9,statuses,backends},redisOutageDenied:true,namespace:this.namespace,redisImageDigest:this.redisImageDigest,externalProvidersEnabled:false,fullR08Acceptance:false};
  }
  cleanup(clean,proof,redact) {
    this.router?.closeAllConnections();this.router?.close();
    const result={replicaRemoved:false,redisRemoved:false};
    if(this.replicaId)clean(()=>{this.inspectOwned(this.replicaId);this.docker(['stop','--time','20',this.replicaId]);const replica=this.inspectOwned(this.replicaId);result.replicaExitCode=replica.State.ExitCode;fs.writeFileSync(path.join(proof,'replica.log'),redact(this.docker(['logs',this.replicaId])),{flag:'wx'});this.docker(['rm',this.replicaId]);result.replicaRemoved=true;assert.equal(result.replicaExitCode,0);});
    if(this.redisId)clean(()=>{this.inspectOwned(this.redisId);this.docker(['rm','-f',this.redisId]);result.redisRemoved=true;});
    return result;
  }
}
