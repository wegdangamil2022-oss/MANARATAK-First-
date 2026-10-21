import {randomUUID,randomBytes,scryptSync} from 'node:crypto';import {PrismaClient} from './r07-filtered/node_modules/@prisma/client/default.js';import fs from 'node:fs';import path from 'node:path';import net from 'node:net';import https from 'node:https';import {spawn} from 'node:child_process';
import {verifyReleaseManifest} from './r07-filtered/scripts/release/lib/ReleaseContracts.mjs';import {verifyRuntimeLayer} from './r07-filtered/scripts/release/lib/RuntimeLayerPolicy.mjs';
import {preflightTargets} from './r07-filtered/scripts/database/post28-isolation.mjs';import {readDatabaseIdentity} from './r07-filtered/scripts/database/post28-preflight.mjs';
const run=path.resolve(process.argv[2]),lab=path.resolve(process.argv[3]),manifest=JSON.parse(fs.readFileSync(path.join(run,'artifacts/release-manifest.json'))),sha=manifest.sourceSha;
verifyReleaseManifest(path.join(run,'artifacts'),sha);const apiRoot=path.join(run,'api-boot-root');verifyRuntimeLayer(apiRoot,manifest,JSON.parse(fs.readFileSync(path.join(apiRoot,'runtime-layer.json'))));
const env=Object.fromEntries(fs.readFileSync(path.join(lab,'lab.env'),'utf8').trim().split(/\r?\n/).map(s=>{const i=s.indexOf('=');return[s.slice(0,i),s.slice(i+1)];}));
const identity=await preflightTargets(JSON.parse(fs.readFileSync(path.join(lab,'targets.json'))),[{label:'DB-T',url:env.DATABASE_URL}],env,sha,readDatabaseIdentity);
const freePort=()=>new Promise(resolve=>{const s=net.createServer();s.listen(0,'127.0.0.1',()=>{const port=s.address().port;s.close(()=>resolve(port));});});
const apiPort=await freePort(),gatewayPort=await freePort(),origin=`https://127.0.0.1:${gatewayPort}`,apiOrigin=`http://127.0.0.1:${apiPort}`;
const cert=path.resolve('work/r07-20261019-tls.crt'),key=path.resolve('work/r07-20261019-tls.key'),ca=fs.readFileSync(cert),children=[];
function start(name,cwd,args,extra){const child=spawn(process.execPath,args,{cwd,env:{SystemRoot:process.env.SystemRoot,PATH:path.dirname(process.execPath),...extra},windowsHide:true,stdio:['ignore','pipe','pipe']});const row={name,child,log:'',exit:null};child.stdout.on('data',d=>row.log+=d);child.stderr.on('data',d=>row.log+=d);row.ended=new Promise(resolve=>child.once('exit',(code,signal)=>{row.exit={code,signal};resolve();}));children.push(row);return row;}
const request=(route,{method='GET',headers={},body}={})=>new Promise((resolve,reject)=>{const req=https.request(origin+route,{method,ca,headers,timeout:5000},res=>{let text='';res.on('data',d=>{text+=d;if(text.length>2000000)req.destroy(Error('BODY_LIMIT'));});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,text}));});req.on('timeout',()=>req.destroy(Error('TIMEOUT')));req.on('error',reject);req.end(body);});
const observations=[];let failure=null;
const fixtureId=randomUUID(),email=fixtureId+'@example.invalid',password=randomBytes(24).toString('base64url'),salt=randomBytes(16),hash=scryptSync(password,salt,64);
const setup=new PrismaClient({datasources:{db:{url:env.POST28_TRANSACTION_SETUP_URL}}});
await setup.$executeRawUnsafe('GRANT INSERT,UPDATE,DELETE ON TABLE public."SessionRecord" TO post28_app');
await setup.$executeRawUnsafe('GRANT INSERT ON TABLE public."AuditRecord" TO post28_app');
await setup.identityRecord.create({data:{id:fixtureId,type:'Human',status:'ACTIVE',createdBy:'R07_SYNTHETIC_SESSION_FIXTURE',user:{create:{displayName:'Synthetic session user',primaryEmail:email,isEmailVerified:true}},account:{create:{accessState:'Active'}},credentials:{create:{type:'password',passwordHash:'scrypt:16384:8:1:'+salt.toString('hex')+':'+hash.toString('hex')}}}});
let sessionFacts=null;
try{
 const api=start('api',apiRoot,['apps/api/dist/server.cjs'],{NODE_ENV:'test',PORT:String(apiPort),DATABASE_URL:env.DATABASE_URL,DIRECT_URL:env.DATABASE_URL,DATABASE_REQUIRED:'true',RELEASE_SOURCE_SHA:sha,HEALTH_DEPLOYMENT_REVISION:sha,CORS_ORIGIN:origin,PUBLIC_WEB_URL:origin,ADMIN_WEB_URL:origin+'/admin',TRUST_PROXY_HOPS:'1',SECURE_COOKIE:'true',BACKGROUND_WORKER_ENABLED:'false',STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED:'false',OWNER_DOMAIN_OUTBOX_WORKER_ENABLED:'false',CERTIFICATE_COMPLETION_WORKER_ENABLED:'false'});
 let ready=false;for(let i=0;i<50&&!api.exit;i++){try{const r=await fetch(apiOrigin+'/api/v1/monitoring/health/readiness',{signal:AbortSignal.timeout(1000)});if(r.status===200){ready=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,200));}if(!ready)throw Error('API_BOOT_FAILED');
 const gateway=start('gateway',path.join(run,'unpacked-web'),['scripts/release/serve-artifact-gateway.mjs'],{PORT:String(gatewayPort),RELEASE_SOURCE_SHA:sha,ARTIFACT_API_ORIGIN:apiOrigin,ARTIFACT_WEB_ROOT:path.join(run,'unpacked-web/apps/web/dist'),ARTIFACT_ADMIN_ROOT:path.join(run,'unpacked-admin/apps/admin/dist'),TLS_CERT_FILE:cert,TLS_KEY_FILE:key});
 let online=false;for(let i=0;i<40&&!gateway.exit;i++){try{if((await request('/health/build')).status===200){online=true;break;}}catch{}await new Promise(resolve=>setTimeout(resolve,150));}if(!online)throw Error('GATEWAY_BOOT_FAILED');
 for(const [route,status,type] of [['/health/build',200,'application/json'],['/admin/health/build',200,'application/json'],['/',200,'text/html'],['/admin/',200,'text/html'],['/api/v1/monitoring/health/readiness',200,'application/json'],['/api/v1/auth/me',401,'application/problem+json'],['/api/v1/auth/csrf-token',401,'application/problem+json'],['/api/v1/public/courses',200,'application/json'],['/assets/definitely-missing.js',404,'application/json']]){
  const r=await request(route);if(r.status!==status||!r.headers['content-type']?.startsWith(type))throw Error('ROUTE_FAILED:'+route+':'+r.status);
  if(route.includes('health')){if(r.headers['x-manaratak-source-sha']!==sha)throw Error('REVISION_MISMATCH');const body=JSON.parse(r.text);if(route.includes('readiness')&&(body.protocolVersion!==2||body.code!=='AVAILABLE'||body.status!=='UP'||Math.abs(Date.now()-Date.parse(body.timestamp))>60000))throw Error('READINESS_INVALID');}
  observations.push({route,status:r.status,contentType:r.headers['content-type'],revision:r.headers['x-manaratak-source-sha']??null});
 }
 const jar=new Map();
 const cookie=()=>[...jar].map(([name,value])=>name+'='+value).join('; ');
 const absorb=response=>{for(const line of response.headers['set-cookie']??[]){const first=line.split(';')[0],i=first.indexOf('='),name=first.slice(0,i),value=first.slice(i+1);if(value)jar.set(name,value);else jar.delete(name);}};
 const expectStatus=(response,status,step)=>{if(response.status!==status){let code;try{const b=JSON.parse(response.text);code=b.code??b.error?.code;}catch{}throw Error(step+':'+response.status+':'+code);}observations.push({kind:step,status});};
 const post=(route,body,extra={})=>request('/api/v1/auth/'+route,{method:'POST',headers:{origin,'content-type':'application/json',cookie:cookie(),...extra},body:JSON.stringify(body)});
 const bad=await post('login',{email,password:'wrong-synthetic-password'});expectStatus(bad,401,'LOGIN_WRONG_PASSWORD_DENIED');
 const login=await post('login',{email,password});expectStatus(login,200,'REAL_PASSWORD_LOGIN');
 for(const name of ['manaratak_access','manaratak_refresh']){const line=login.headers['set-cookie']?.find(v=>v.startsWith(name+'='));if(!line||!line.includes('HttpOnly')||!line.includes('Secure')||!line.includes('SameSite=Strict'))throw Error('COOKIE_FLAGS_INVALID:'+name);}
 absorb(login);const oldCookie=cookie();
 const me=await request('/api/v1/auth/me',{headers:{cookie:cookie()}});expectStatus(me,200,'AUTHENTICATED_ME');
 let csrfResponse=await request('/api/v1/auth/csrf-token',{headers:{cookie:cookie()}});expectStatus(csrfResponse,200,'SESSION_BOUND_CSRF');
 let csrf=JSON.parse(csrfResponse.text).data.csrfToken;if(!csrf)throw Error('MISSING_CSRF_TOKEN');
 const beforeMissing=await setup.sessionRecord.count({where:{identityId:fixtureId}});
 expectStatus(await post('refresh',{}),403,'REFRESH_WITHOUT_CSRF_DENIED');
 if(await setup.sessionRecord.count({where:{identityId:fixtureId}})!==beforeMissing)throw Error('CSRF_DENIAL_CHANGED_SESSIONS');
 const refresh=await post('refresh',{}, {'x-csrf-token':csrf});expectStatus(refresh,200,'REFRESH_ROTATED');absorb(refresh);
 if(cookie()===oldCookie)throw Error('COOKIE_NOT_ROTATED');
 const rows=await setup.sessionRecord.findMany({where:{identityId:fixtureId},orderBy:{createdAt:'asc'}});
 if(rows.length!==2||!rows[0].revokedAt||!rows[0].rotatedAt||rows[1].revokedAt||rows[1].parentSessionId!==rows[0].id)throw Error('ROTATION_LINEAGE_INVALID');
 expectStatus(await request('/api/v1/auth/me',{headers:{cookie:oldCookie}}),401,'OLD_ACCESS_SESSION_DENIED');
 expectStatus(await request('/api/v1/auth/me',{headers:{cookie:cookie()}}),200,'ROTATED_SESSION_ME');
 csrfResponse=await request('/api/v1/auth/csrf-token',{headers:{cookie:cookie()}});expectStatus(csrfResponse,200,'ROTATED_SESSION_CSRF');csrf=JSON.parse(csrfResponse.text).data.csrfToken;
 const preLogoutCookie=cookie(),logout=await post('logout',{}, {'x-csrf-token':csrf});expectStatus(logout,200,'LOGOUT_REVOKED');absorb(logout);
 expectStatus(await request('/api/v1/auth/me',{headers:{cookie:preLogoutCookie}}),401,'LOGOUT_COOKIE_REPLAY_DENIED');
 if(await setup.sessionRecord.count({where:{identityId:fixtureId,revokedAt:null}})!==0)throw Error('ACTIVE_SESSION_AFTER_LOGOUT');
 sessionFacts={fixtureId,synthetic:true,sessionRows:2,rotationLineageVerified:true,activeAfterLogout:0,secureHttpOnlyStrictCookies:true};
 const cors=await request('/api/v1/monitoring/health/readiness',{method:'OPTIONS',headers:{origin,'access-control-request-method':'GET'}});if(cors.status!==204||cors.headers['access-control-allow-origin']!==origin||cors.headers['access-control-allow-credentials']!=='true')throw Error('CORS_ALLOW_FAILED');observations.push({kind:'CORS_ALLOW',status:cors.status});
 const denied=await request('/api/v1/monitoring/health/readiness',{method:'OPTIONS',headers:{origin:'https://hostile.example.invalid','access-control-request-method':'GET'}});if(denied.headers['access-control-allow-origin']==='https://hostile.example.invalid')throw Error('CORS_DENIAL_FAILED');observations.push({kind:'CORS_FOREIGN_ORIGIN_NOT_ALLOWED',status:denied.status});
}catch(error){failure=error.message;}finally{
 for(const row of children.reverse()){if(!row.exit){row.child.kill('SIGTERM');await row.ended;}fs.writeFileSync(path.join(run,'auth-session-'+row.name+'.log'),row.log.replaceAll(env.DATABASE_URL,'[REDACTED]').replaceAll(decodeURIComponent(new URL(env.DATABASE_URL).password),'[REDACTED]').replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]'));}
 const result={sourceSha:sha,identity,observations,failure,verified:failure===null,httpsTrustVerified:true,apiAndGatewayFromFreshUnpack:true,authenticatedSessionFlowVerified:failure===null,sessionFacts,processes:children.map(r=>({name:r.name,exit:r.exit})),R07Accepted:false,promotionAuthorized:false};fs.writeFileSync(path.join(run,'auth-session.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result));await setup.$disconnect();if(failure)process.exitCode=1;
}
