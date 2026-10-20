// Synthetic review only: new owned PG16, non-root image, real HTTPS browser flow.
import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import https from 'node:https';
import assert from 'node:assert/strict';
import {spawn, spawnSync, execFileSync} from 'node:child_process';
import {randomUUID, randomBytes, scryptSync, createHash, X509Certificate} from 'node:crypto';
import {PrismaClient} from '@prisma/client';
import {chromium} from 'playwright';
import {verifyReleaseManifest} from './lib/ReleaseContracts.mjs';
import {createLoopbackForwarder} from '../database/post28-local-forwarder.mjs';
import {preflightTargets} from '../database/post28-isolation.mjs';
import {readDatabaseIdentity} from '../database/post28-preflight.mjs';
import {R08CombinedRuntime} from './lib/R08CombinedRuntime.mjs';
import {seedR09LearnerFixture,exerciseR09Learner} from './lib/R09LearnerRuntime.mjs';
import {seedR09PublicFixture,exerciseR09Public} from './lib/R09PublicRuntime.mjs';
import {dockerResourceSample,runLinuxStudentContention} from '../performance/LinuxStudentContention.mjs';

const repo=fs.realpathSync(process.cwd()), run=fs.realpathSync(process.argv[2]);
const r08Combined=process.argv[3]==='--r08-combined';
const r09Learner=process.argv[3]==='--r09-learner';
const r09Public=process.argv[3]==='--r09-public';
const r11Diagnostic=process.argv[4]==='--r11-contention';
if(process.argv.length>5||(process.argv[4]&&!r11Diagnostic)||(r11Diagnostic&&!r09Public)||(process.argv[3]&&!r08Combined&&!r09Learner&&!r09Public))throw Error('POST28_RUNTIME_ARGUMENT_INVALID');
if(process.platform!=='linux'||process.arch!=='x64'||Number(process.versions.node.split('.')[0])!==22||process.env.POST28_LINUX_RUNTIME_REVIEW!=='YES')throw Error('POST28_LINUX_RUNTIME_REVIEW_NOT_AUTHORIZED');
const sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim())throw Error('POST28_CLEAN_SOURCE_REQUIRED');
if(run===repo||run.startsWith(repo+path.sep))throw Error('POST28_RUNTIME_OUTSIDE_CHECKOUT_REQUIRED');
const manifest=verifyReleaseManifest(path.join(run,'artifacts'),sha);
for(const unit of ['web','admin']){
  const destination=path.join(run,'unpacked-'+unit);fs.mkdirSync(destination);
  execFileSync('tar',['-xf',path.join(run,'artifacts',manifest.artifacts.find(artifact=>artifact.unit===unit).file),'-C',destination],{stdio:'pipe'});
}
const image=JSON.parse(fs.readFileSync(path.join(run,'linux-image-probe.json'),'utf8'));
if(image.sourceSha!==sha||!/^sha256:[a-f0-9]{64}$/.test(image.imageId))throw Error('POST28_REVIEW_IMAGE_REQUIRED');
const proof=path.join(run,'linux-runtime-proof');fs.mkdirSync(proof,{mode:0o700});
const hash=value=>createHash('sha256').update(value).digest('hex');
const dockerEnv={...process.env};for(const key of ['DOCKER_HOST','DOCKER_CONTEXT','DOCKER_TLS','DOCKER_TLS_VERIFY','DOCKER_CERT_PATH'])delete dockerEnv[key];
const docker=args=>execFileSync('docker',['--host=unix:///var/run/docker.sock',...args],{env:dockerEnv,encoding:'utf8',timeout:45000,maxBuffer:4*1024*1024}).trim();
const baseEnv={PATH:process.env.PATH,HOME:process.env.HOME,NODE_ENV:'test',POST28_LOCAL_LAB_CREATE:'YES',POST28_LOCAL_LAB_PROFILE:'transactions',POST28_LOCAL_LAB_STORAGE:'tmpfs',POST28_LAB_ROOT:path.join(run,'private-labs')};
let state,env={},db,apiId,browser,gateway,forwarder,combined,failure=null;
const secrets=[],observations=[],network=[],pageErrors=[],consoleErrors=[],children=[];
const redact=value=>secrets.reduce((text,secret)=>text.replaceAll(secret,'[REDACTED]'),String(value)).replace(/postgres(?:ql)?:\/\/[^\s'"<>]+/g,'[REDACTED_POSTGRES_URL]');
const report={kind:'POST28_R07_LINUX_ARTIFACT_RUNTIME',sourceSha:sha,imageId:image.imageId,node:process.version,environment:'DISPOSABLE',providerMode:'NO_EXTERNAL_EGRESS',observations,network,pageErrors,consoleErrors,productionAcceptance:false,formalR07Acceptance:false,promotionAuthorized:false};
const execute=(args,extra,log)=>{
  const result=spawnSync(process.execPath,args,{cwd:repo,env:{...baseEnv,...extra},encoding:'utf8',timeout:240000,maxBuffer:4*1024*1024});
  fs.writeFileSync(path.join(proof,log),redact((result.stdout??'')+(result.stderr??'')),{flag:'wx'});
  if(result.status!==0)throw Error('POST28_REVIEW_HELPER_FAILED_'+path.basename(args[0]));
  return result.stdout.trim();
};
const freePort=()=>new Promise((resolve,reject)=>{const server=net.createServer();server.on('error',reject);server.listen(0,'127.0.0.1',()=>{const port=server.address().port;server.close(()=>resolve(port));});});
const bounded=async(test,label)=>{for(let i=0;i<100;i++){if(await test())return;await new Promise(resolve=>setTimeout(resolve,200));}throw Error(label);};
try{
  // The creator's write-once state also allows safe cleanup after partial setup.
  try{state=JSON.parse(execute(['scripts/database/create-post28-lab.mjs'],{},'create.log'));}
  finally{if(!state&&fs.existsSync(baseEnv.POST28_LAB_ROOT)){const dirs=fs.readdirSync(baseEnv.POST28_LAB_ROOT);if(dirs.length===1){const file=path.join(baseEnv.POST28_LAB_ROOT,dirs[0],'lab-state.json');if(fs.existsSync(file))state=JSON.parse(fs.readFileSync(file,'utf8'));}}}
  assert.equal(state.sourceSha,sha);assert.equal(state.storage,'tmpfs');
  env=Object.fromEntries(fs.readFileSync(state.envFile,'utf8').trim().split(/\r?\n/).map(line=>{const i=line.indexOf('=');return[line.slice(0,i),line.slice(i+1)];}));
  secrets.push(env.DATABASE_URL,env.POST28_TRANSACTION_SETUP_URL,...[env.DATABASE_URL,env.POST28_TRANSACTION_SETUP_URL].map(value=>decodeURIComponent(new URL(value).password)));
  execute(['scripts/database/initialize-post28-transactions.mjs',...(r09Learner?['--r09-learner-fixtures']:[])],env,'initialize.log');
  const contract=JSON.parse(fs.readFileSync(state.contractFile,'utf8'));
  report.databaseIdentity=await preflightTargets(contract,[{label:'DB-T',url:env.DATABASE_URL}],env,sha,readDatabaseIdentity,{requireValidatedCatalog:true});
  const setup=new PrismaClient({datasources:{db:{url:env.POST28_TRANSACTION_SETUP_URL}},log:[],errorFormat:'minimal'});
  const fixtureId=randomUUID(),email=fixtureId+'@example.invalid',password=randomBytes(24).toString('base64url'),salt=randomBytes(16),passwordHash=scryptSync(password,salt,64);
  secrets.push(password);
  let r09Fixture;
  try{
    await setup.roleRecord.create({data:{id:'student',name:'Student',description:'Synthetic Linux review student',permissions:[],policyIds:[]}});
    await setup.identityRecord.create({data:{id:fixtureId,type:'Human',status:'ACTIVE',createdBy:'R07_LINUX_SYNTHETIC_FIXTURE',user:{create:{displayName:'R07 Linux learner',primaryEmail:email,isEmailVerified:true}},account:{create:{accessState:'Active'}},credentials:{create:{type:'password',passwordHash:'scrypt:16384:8:1:'+salt.toString('hex')+':'+passwordHash.toString('hex')}},roleAssignments:{create:{id:randomUUID(),roleId:'student'}}}});
    await setup.studentWorkspace.create({data:{studentReferenceId:fixtureId,status:'ACTIVE',displayName:'R07 Linux learner'}});
    if(r09Learner)r09Fixture=await seedR09LearnerFixture(setup,'scrypt:16384:8:1:'+salt.toString('hex')+':'+passwordHash.toString('hex'));
    if(r09Public)r09Fixture=await seedR09PublicFixture(setup);
  }finally{await setup.$disconnect();}
  db=new PrismaClient({datasources:{db:{url:env.DATABASE_URL}},log:[],errorFormat:'minimal'});
  const roles=await db.$queryRaw`SELECT current_user AS role, rolsuper, rolcreatedb, rolcreaterole, rolreplication, rolbypassrls FROM pg_roles WHERE rolname=current_user`;
  assert.equal(roles[0].role,'post28_app');for(const key of ['rolsuper','rolcreatedb','rolcreaterole','rolreplication','rolbypassrls'])assert.equal(roles[0][key],false);
  const privileges=await db.$queryRaw`SELECT has_schema_privilege(current_user,'public','CREATE') AS ddl, has_table_privilege(current_user,'public._prisma_migrations','UPDATE') AS ledger`;
  assert.equal(privileges[0].ddl,false);assert.equal(privileges[0].ledger,false);report.applicationRole={...roles[0],...privileges[0]};
  if(r09Learner){
    const [rights]=await db.$queryRaw`SELECT has_table_privilege(current_user,'public."CourseLessonProgress"','INSERT') AS insert, has_table_privilege(current_user,'public."CourseLessonProgress"','UPDATE') AS update, has_table_privilege(current_user,'public."CourseLessonProgress"','DELETE') AS delete`;
    assert.equal(rights.insert,true);assert.equal(rights.update,true);assert.equal(rights.delete,false);report.learnerProgressPrivileges=rights;
  }
  const gatewayPort=await freePort(),origin='https://127.0.0.1:'+gatewayPort;
  const url=new URL(env.DATABASE_URL);url.hostname=state.containerName;url.port='5432';
  const apiEnv={NODE_ENV:'test',PORT:'3000',DATABASE_URL:url.href,DIRECT_URL:url.href,DATABASE_REQUIRED:'true',RELEASE_SOURCE_SHA:sha,HEALTH_DEPLOYMENT_REVISION:sha,CORS_ORIGIN:origin,PUBLIC_WEB_URL:origin,ADMIN_WEB_URL:origin+'/admin',TRUST_PROXY_HOPS:'1',SECURE_COOKIE:'true',BACKGROUND_WORKER_ENABLED:'false',STUDENT_WORKSPACE_OUTBOX_WORKER_ENABLED:'false',OWNER_DOMAIN_OUTBOX_WORKER_ENABLED:'false',CERTIFICATE_COMPLETION_WORKER_ENABLED:'false'};
  if(r08Combined){combined=new R08CombinedRuntime({docker,state,imageId:image.imageId,secrets});Object.assign(apiEnv,combined.prepare());report.kind='POST28_R08_COMBINED_ARTIFACT_RUNTIME';}
  secrets.push(url.href);const apiEnvFile=path.join(state.directory,'api.env');fs.writeFileSync(apiEnvFile,Object.entries(apiEnv).map(([key,value])=>key+'='+value).join('\n')+'\n',{mode:0o600,flag:'wx'});
  apiId=docker(['run','-d','--label','codex.post28.run='+state.runId,'--network',state.network,'--read-only','--cap-drop=ALL','--security-opt=no-new-privileges','--memory=768m','--pids-limit=128','--tmpfs','/opt/manaratak/storage:rw,uid=1000,gid=1000,mode=0700,size=67108864','--tmpfs','/tmp:rw,nosuid,noexec,size=16777216','--env-file',apiEnvFile,image.imageId]);
  assert.match(apiId,/^[a-f0-9]{64}$/);
  const apiIdentity=JSON.parse(docker(['inspect',apiId]))[0];assert.equal(apiIdentity.Config.Labels['codex.post28.run'],state.runId);assert.equal(apiIdentity.Image,image.imageId);assert.equal(apiIdentity.HostConfig.ReadonlyRootfs,true);assert.equal(apiIdentity.Config.User,'node');
  const address=apiIdentity.NetworkSettings.Networks[state.network].IPAddress;assert.equal(net.isIP(address),4);
  let apiPort;
  if(combined)apiPort=await combined.route(address,apiEnvFile);
  else{apiPort=await freePort();forwarder=createLoopbackForwarder({host:address,port:3000},apiPort);await forwarder.listen();}
  const apiOrigin='http://127.0.0.1:'+apiPort;
  await bounded(async()=>{try{return(await fetch(apiOrigin+'/api/v1/monitoring/health/readiness',{signal:AbortSignal.timeout(1000)})).status===200;}catch{return false;}},'POST28_LINUX_API_NOT_READY');
  const cert=path.join(state.directory,'tls.crt'),key=path.join(state.directory,'tls.key');
  execFileSync('openssl',['req','-x509','-newkey','rsa:2048','-nodes','-days','1','-subj','/CN=127.0.0.1','-addext','subjectAltName=IP:127.0.0.1','-keyout',key,'-out',cert],{stdio:'pipe'});fs.chmodSync(key,0o600);
  const ca=fs.readFileSync(cert),spki=hash(new X509Certificate(ca).publicKey.export({type:'spki',format:'der'}));
  gateway=spawn(process.execPath,['scripts/release/serve-artifact-gateway.mjs'],{cwd:path.join(run,'unpacked-web'),env:{PATH:path.dirname(process.execPath),PORT:String(gatewayPort),RELEASE_SOURCE_SHA:sha,ARTIFACT_API_ORIGIN:apiOrigin,ARTIFACT_WEB_ROOT:path.join(run,'unpacked-web/apps/web/dist'),ARTIFACT_ADMIN_ROOT:path.join(run,'unpacked-admin/apps/admin/dist'),TLS_CERT_FILE:cert,TLS_KEY_FILE:key},stdio:['ignore','pipe','pipe']});
  let gatewayLog='';gateway.stdout.on('data',value=>gatewayLog+=value);gateway.stderr.on('data',value=>gatewayLog+=value);children.push({child:gateway,log:()=>gatewayLog});
  const request=route=>new Promise((resolve,reject)=>{const req=https.get(origin+route,{ca,timeout:3000},res=>{let body='';res.on('data',value=>body+=value);res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body}));});req.on('timeout',()=>req.destroy(Error('TIMEOUT')));req.on('error',reject);});
  await bounded(async()=>{try{return(await request('/health/build')).status===200;}catch{return false;}},'POST28_LINUX_GATEWAY_NOT_READY');
  for(const route of ['/health/build','/admin/health/build','/api/v1/monitoring/health/readiness']){const response=await request(route);assert.equal(response.status,200);assert.equal(response.headers['x-manaratak-source-sha'],sha);const body=JSON.parse(response.body);if(route.includes('readiness')){assert.equal(body.protocolVersion,2);assert.equal(body.code,'AVAILABLE');assert.equal(body.status,'UP');assert(Math.abs(Date.now()-Date.parse(body.timestamp))<60000);}observations.push({step:'REVISION_READINESS',route,status:response.status,sourceSha:sha});}
  browser=await chromium.launch({headless:true,args:['--disable-background-networking','--ignore-certificate-errors-spki-list='+Buffer.from(spki,'hex').toString('base64')]});report.browserVersion=browser.version();
  const context=await browser.newContext({ignoreHTTPSErrors:false,viewport:{width:1440,height:1000}});
  const blocked=new Set();await context.route('**/*',route=>{const target=new URL(route.request().url());if(target.origin===origin||['data:','blob:'].includes(target.protocol))return route.continue();blocked.add(target.origin);return route.abort();});
  const page=await context.newPage();page.on('pageerror',error=>pageErrors.push(redact(error.message)));page.on('console',message=>{if(message.type()==='error')consoleErrors.push(redact(message.text()).slice(0,400));});page.on('response',response=>{const target=new URL(response.url());if(target.origin===origin)network.push({method:response.request().method(),path:target.pathname,status:response.status(),resource:response.request().resourceType()});});
  if(combined){
    report.combinedAuth=await combined.exercise({page,origin,email,password,db,fixtureId});
    observations.push({step:'TWO_BUILT_APIS_SHARED_PG_REDIS_TLS_AUTH',passed:true});report.redisConfigured=true;
    assert(network.filter(row=>row.status>=500).every(row=>row.path==='/api/v1/auth/login'&&row.status===500));
  }else if(r09Public){
    report.kind='POST28_R09_PUBLIC_ARTIFACT_RUNTIME';report.formalR09Acceptance=false;
    report.publicJourney=await exerciseR09Public({page,origin,db,fixture:r09Fixture,proof});
    observations.push({step:'R09_PUBLIC_OWNER_PAGINATION_AND_UNPUBLISHED_DENIAL',passed:true});report.redisConfigured=false;
    assert.equal(network.filter(row=>row.status>=500).length,0);
  }else if(r09Learner){
    report.kind='POST28_R09_LEARNER_ARTIFACT_RUNTIME';report.formalR09Acceptance=false;
    report.learnerJourney=await exerciseR09Learner({page,origin,email,password,db,fixtureId,fixture:r09Fixture,proof,pageErrors});
    observations.push({step:'R09_LOCALIZED_LEARNER_PROGRESS_AND_ADMIN_BOUNDARIES',passed:true});report.redisConfigured=false;
    assert.equal(network.filter(row=>row.status>=500).length,0);
  }else{
  await page.goto(origin+'/admin/login');await page.getByRole('heading',{name:'دخول الإدارة',exact:true}).waitFor();observations.push({step:'ADMIN_BUNDLE_LOGIN_RENDERED',passed:true});
  await page.goto(origin+'/login');await page.locator('#account-email').fill(email);await page.locator('#account-password').fill(password);
  const login=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/auth/login'&&response.request().method()==='POST');await page.locator('form button[type=submit]').click();assert.equal((await login).status(),200);
  await page.waitForURL('**/student');await page.getByRole('button',{name:'ملخصي',exact:true}).waitFor();await page.getByText('R07 Linux learner',{exact:false}).first().waitFor();
  assert(network.some(row=>row.path==='/api/v1/student/dashboard'&&row.status===200));assert.equal(await db.sessionRecord.count({where:{identityId:fixtureId,revokedAt:null}}),1);
  const cookies=await context.cookies(),authCookies=cookies.filter(cookie=>['manaratak_access','manaratak_refresh'].includes(cookie.name));assert.equal(authCookies.length,2);assert(authCookies.every(cookie=>cookie.httpOnly&&cookie.secure&&cookie.sameSite==='Strict'));
  observations.push({step:'FORM_LOGIN_PERSISTED_DASHBOARD_STRICT_COOKIES',passed:true});await page.screenshot({path:path.join(proof,'student-dashboard.png'),fullPage:true});
  assert.equal(await page.evaluate(async()=>{const response=await fetch('/api/v1/admin/courses',{credentials:'include'});return response.status;}),403);observations.push({step:'STUDENT_ADMIN_ACCESS_DENIED',status:403});
  const foreign=await page.evaluate(async()=>{const response=await fetch('/api/v1/student/00000000-0000-4000-8000-000000000000/dashboard',{credentials:'include'});return response.status;});assert([403,404].includes(foreign));observations.push({step:'FOREIGN_STUDENT_DENIED',status:foreign});
  const logout=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/v1/auth/logout'&&response.request().method()==='POST');await page.locator('button[title="تسجيل الخروج من الحساب"]').first().click();assert.equal((await logout).status(),200);await page.waitForURL(origin+'/');
  assert.equal(await db.sessionRecord.count({where:{identityId:fixtureId,revokedAt:null}}),0);assert.equal(await page.evaluate(async()=>{const response=await fetch('/api/v1/auth/me',{credentials:'include'});return response.status;}),401);observations.push({step:'UI_LOGOUT_PERSISTENT_SESSION_REVOKED',status:401});
  assert.equal(network.filter(row=>row.status>=500).length,0);report.redisConfigured=false;
  }
  if(r11Diagnostic){
    await page.goto(origin+'/login');
    const request=input=>page.evaluate(async input=>{
      const headers={'content-type':'application/json',...(input.csrf?{'x-csrf-token':input.csrf}:{}),...(input.key?{'idempotency-key':input.key}:{})};
      const response=await fetch(input.path,{method:input.method,headers,credentials:'include',redirect:'error',signal:AbortSignal.timeout(2000),...(input.body?{body:JSON.stringify(input.body)}:{})});
      return {status:response.status,body:await response.json(),csrf:response.headers.get('x-csrf-token'),sourceSha:response.headers.get('x-manaratak-source-sha')};
    },input);
    const sampleResources=async()=>{
      for(const id of [apiId,state.containerId])assert.equal(JSON.parse(docker(['inspect',id]))[0].Config.Labels['codex.post28.run'],state.runId);
      const rows=docker(['stats','--no-stream','--format','{{json .}}',apiId,state.containerId]).split('\n').map(line=>JSON.parse(line));
      const find=id=>{const row=rows.find(r=>id.startsWith(r.ID));assert(row);return dockerResourceSample(row);};
      const [connections]=await db.$queryRaw`SELECT count(*)::int AS n FROM pg_stat_activity WHERE datname=current_database() AND usename=current_user`;
      return {api:find(apiId),postgres:find(state.containerId),applicationConnections:connections.n};
    };
    report.r11Diagnostic=await runLinuxStudentContention({origin,sourceSha:sha,fixtureId,email,password,request,db,sampleResources,
      record:value=>fs.writeFileSync(path.join(proof,'r11-contention.json'),JSON.stringify(value,null,2)+'\n',{flag:'wx'})});
    observations.push({step:'R11_TWO_CONCURRENT_WRITES_ONE_PERSISTED_WINNER_AND_REPLAY',passed:true});
  }
  assert.equal(pageErrors.length,0);report.blockedExternalOrigins=[...blocked];report.tls={certificateSha256:hash(ca),hostnameVerified:true,exactCertificateSpkiPinned:true,ignoreHTTPSErrors:false};report.freshUnpackedThreeUnits=true;report.apiBootedInImage=true;report.databaseConnected=true;report.workersEnabled=false;
}catch(error){failure=redact(error.message);process.exitCode=1;}
finally{
  await browser?.close().catch(()=>{});await db?.$disconnect().catch(()=>{});
  for(const item of children){if(item.child.exitCode===null&&item.child.signalCode===null){const exit=new Promise(resolve=>item.child.once('exit',resolve));item.child.kill('SIGTERM');await exit;}fs.writeFileSync(path.join(proof,'gateway.log'),redact(item.log()),{flag:'wx'});}
  forwarder?.close();
  const cleanup={ownedContainerStopped:false,ownedContainerRemoved:false,postgresStopped:false,postgresRemoved:false,networkRemoved:false,existingDatabasesTouched:false};
  const cleanupErrors=[];
  const clean=work=>{try{work();}catch(error){cleanupErrors.push(redact(error.message));failure??='POST28_REVIEW_CLEANUP_FAILED';process.exitCode=1;}};
  if(apiId)clean(()=>{
    const identity=JSON.parse(docker(['inspect',apiId]))[0];assert.equal(identity.Config.Labels['codex.post28.run'],state.runId);
    const start=Date.now();docker(['stop','--time','20',apiId]);const stopped=JSON.parse(docker(['inspect',apiId]))[0];cleanup.apiExitCode=stopped.State.ExitCode;cleanup.drainMilliseconds=Date.now()-start;cleanup.ownedContainerStopped=!stopped.State.Running;
    fs.writeFileSync(path.join(proof,'api.log'),redact(docker(['logs',apiId])),{flag:'wx'});docker(['rm',apiId]);cleanup.ownedContainerRemoved=true;
    if(report.apiBootedInImage)assert.equal(cleanup.apiExitCode,0);
  });
  if(combined)cleanup.combined=combined.cleanup(clean,proof,redact);
  if(state){
    if(state.forwarderPid)clean(()=>{const command=fs.readFileSync('/proc/'+state.forwarderPid+'/cmdline','utf8');assert(command.includes('post28-local-forwarder.mjs')&&command.includes(path.join(state.directory,'forwarder.json')));process.kill(state.forwarderPid,'SIGTERM');});
    clean(()=>{const identity=JSON.parse(docker(['inspect',state.containerId]))[0];assert.equal(identity.Config.Labels['codex.post28.run'],state.runId);assert.equal(identity.Config.Labels['codex.post28.scope'],'DISPOSABLE');docker(['stop','--time','10',state.containerId]);cleanup.postgresStopped=true;docker(['rm',state.containerId]);cleanup.postgresRemoved=true;});
    clean(()=>{const owned=JSON.parse(docker(['network','inspect',state.network]))[0];assert.equal(owned.Labels['codex.post28.run'],state.runId);assert.equal(owned.Internal,true);docker(['network','rm',state.network]);cleanup.networkRemoved=true;});
  }
  if(cleanupErrors.length)cleanup.errors=cleanupErrors;
  report.cleanup=cleanup;report.failure=failure;report.passed=failure===null;report.completedAt=new Date().toISOString();fs.writeFileSync(path.join(proof,'result.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});console.log(JSON.stringify(report));
}
