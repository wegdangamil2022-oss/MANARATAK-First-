// Real HTTPS diagnostics against fresh unpacked artifacts; never API acceptance.
import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import {spawn} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyReleaseManifest} from './lib/ReleaseContracts.mjs';
import {staticScriptEntries} from './lib/StaticScriptPolicy.mjs';

const [runDirectory,certificate,key]=process.argv.slice(2).map(value=>path.resolve(value));
const manifest=JSON.parse(fs.readFileSync(path.join(runDirectory,'artifacts/release-manifest.json')));
verifyReleaseManifest(path.join(runDirectory,'artifacts'),manifest.sourceSha);
const ca=fs.readFileSync(certificate),observations=[],processes=[];
const hash=value=>createHash('sha256').update(value).digest('hex');
const request=url=>new Promise((resolve,reject)=>{
  const req=https.get(url,{ca,timeout:5000},res=>{const chunks=[];let size=0;res.on('data',chunk=>{size+=chunk.length;if(size>16_000_000)req.destroy(new Error('BODY_LIMIT'));else chunks.push(chunk);});res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));});
  req.on('timeout',()=>req.destroy(new Error('TIMEOUT')));req.on('error',reject);
});
const checked=async(url,status,type)=>{
  const result=await request(url);
  if(result.status!==status||result.headers.location||!result.headers['content-type']?.startsWith(type)||result.headers['x-manaratak-source-sha']!==manifest.sourceSha)throw new Error('POST28_STATIC_HTTP_INVALID');
  observations.push({url,status:result.status,contentType:result.headers['content-type'],sourceSha:result.headers['x-manaratak-source-sha'],bodySha256:hash(result.body)});
  return result.body.toString('utf8');
};
let failure=null;
try {
  for(const unit of ['web','admin']) {
    const cwd=path.join(runDirectory,'unpacked-'+unit);
    if(fs.existsSync(path.join(cwd,'.git'))||fs.existsSync(path.join(cwd,'node_modules')))throw new Error('POST28_STATIC_CHECKOUT_CONTAMINATED');
    const child=spawn(process.execPath,['scripts/release/serve-static-artifact.mjs',unit],{cwd,env:{SystemRoot:process.env.SystemRoot,PATH:path.dirname(process.execPath),RELEASE_SOURCE_SHA:manifest.sourceSha,TLS_CERT_FILE:certificate,TLS_KEY_FILE:key,PORT:'0'},stdio:['ignore','pipe','pipe']});
    let log='';child.stdout.on('data',data=>{log+=data;});child.stderr.on('data',data=>{log+=data;});
    let address;
    try {
      address=await new Promise((resolve,reject)=>{
        const timeout=setTimeout(()=>reject(new Error('POST28_STATIC_BOOT_TIMEOUT')),10000);
        child.once('error',error=>{clearTimeout(timeout);reject(error);});child.once('exit',()=>{clearTimeout(timeout);reject(new Error('POST28_STATIC_BOOT_FAILED'));});
        child.stdout.on('data',()=>{try{const value=JSON.parse(log.trim());clearTimeout(timeout);resolve(value);}catch{ /* wait for a complete descriptor */ }});
      });
      const origin=`https://127.0.0.1:${address.port}`,base=origin+(unit==='admin'?'/admin':'');
      const descriptor=JSON.parse(await checked(base+'/health/build',200,'application/json'));
      if(descriptor.status!=='BUILT'||descriptor.unit!==unit||descriptor.sourceSha!==manifest.sourceSha)throw new Error('POST28_STATIC_REVISION_INVALID');
      const html=await checked(base+'/',200,'text/html');
      if(!html.includes(`<meta name="manaratak-build-sha" content="${manifest.sourceSha}">`)||!/id=["']root["']/.test(html))throw new Error('POST28_STATIC_HTML_INVALID');
      for(const file of staticScriptEntries(html)) {
        const url=new URL(file,base+'/');if(url.origin!==origin)throw new Error('POST28_STATIC_EXTERNAL_SCRIPT');
        const body=await checked(url.href,200,'application/javascript');if(!body.trim()||/^\s*</.test(body))throw new Error('POST28_STATIC_SCRIPT_INVALID');
      }
      for(const match of html.matchAll(/<link\b[^>]*href=["']([^"']+\.css)["']/g))await checked(new URL(match[1],base+'/').href,200,'text/css');
      for(const font of ['cairo-0.woff2','cairo-1.woff2','cairo-2.woff2'])await checked(base+'/fonts/'+font,200,'font/woff2');
      await checked(base+'/assets/definitely-missing.js',404,'application/json');
      const unavailable=JSON.parse(await checked(origin+'/api/v1/monitoring/health/readiness',503,'application/json'));
      if(unavailable.error!=='API_SERVICE_UNAVAILABLE')throw new Error('POST28_STATIC_API_FALLBACK');
    }finally {
      const exit=child.exitCode===null?new Promise(resolve=>child.once('exit',(code,signal)=>resolve({code,signal}))):Promise.resolve({code:child.exitCode});
      child.kill('SIGTERM');const terminated=await exit;
      fs.writeFileSync(path.join(runDirectory,unit+'-static-boot.log'),log);
      let portClosed=true;if(address)try{await request(`https://127.0.0.1:${address.port}/`);portClosed=false;}catch{}
      processes.push({unit,pid:child.pid,terminated,portClosed,logSha256:hash(log),checkoutPresent:false,inheritedNodeModules:false});
      if(!portClosed)throw new Error('POST28_STATIC_PROCESS_NOT_CLOSED');
    }
  }
}catch(error){failure=error.code??error.message;process.exitCode=1;}
const report={kind:'POST28_R07_STATIC_ARTIFACT_HTTPS_DIAGNOSTIC',sourceSha:manifest.sourceSha,measuredAt:new Date().toISOString(),node:process.version,os:process.platform,architecture:process.arch,certificateSha256:hash(ca),observations,processes,outcome:failure?'FAIL':'STATIC_HTTP_VALIDATED',failure,apiReadinessVerified:false,stageAccepted:false,promotionAuthorized:false};
fs.writeFileSync(path.join(runDirectory,'static-boot.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx'});
console.log(JSON.stringify(report));
