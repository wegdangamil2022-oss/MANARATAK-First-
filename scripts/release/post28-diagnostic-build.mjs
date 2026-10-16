#!/usr/bin/env node
// Diagnostic build/package inspection only. Never starts services, migrates or deploys.
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {verifyReleaseManifest} from './lib/ReleaseContracts.mjs';
import {inspectStaticBuild} from './lib/StaticBuildPolicy.mjs';
import {npmInvocation} from './lib/DiagnosticProcess.mjs';
const hash=file=>createHash('sha256').update(fs.readFileSync(file)).digest('hex');
let directory;
try {
  if(process.argv.length!==3||Number(process.versions.node.split('.')[0])!==22)throw new Error('POST28_DIAGNOSTIC_BUILD_INPUT_INVALID');
  const root=fs.realpathSync(process.cwd()),sha=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
  const clean=()=>{if(execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()||execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim()!==sha)throw new Error('POST28_DIAGNOSTIC_CLEAN_SOURCE_REQUIRED');};clean();
  const out=process.argv[2];if(!path.isAbsolute(out))throw new Error('POST28_DIAGNOSTIC_ABSOLUTE_OUTPUT_REQUIRED');
  const parent=fs.realpathSync(path.dirname(out));
  if(parent===root||parent.startsWith(root+path.sep))throw new Error('POST28_DIAGNOSTIC_OUTPUT_OUTSIDE_CHECKOUT_REQUIRED');
  directory=path.join(parent,path.basename(out));fs.mkdirSync(directory,{mode:0o700});
  const checks=[];
  const run=(name,command,args,env={})=>{
    if(command==='npm')({command,args}=npmInvocation(args));
    const log=path.join(directory,name+'.log'),startedAt=new Date().toISOString();
    const fd=fs.openSync(log,'wx',0o600);
    let result;try{result=spawnSync(command,args,{env:{...process.env,...env},stdio:['ignore',fd,fd]});}finally{fs.closeSync(fd);}
    checks.push({name,command:[command,...args],startedAt,finishedAt:new Date().toISOString(),exitCode:result.status,spawnError:result.error?.code??null,logSha256:hash(log)});
    fs.writeFileSync(path.join(directory,'checks.json'),JSON.stringify({sourceSha:sha,checks},null,2)+'\n');
    if(result.status!==0||result.error)throw new Error('POST28_DIAGNOSTIC_BUILD_STEP_FAILED');
  };
  run('prisma-generate','npm',['run','db:generate']);
  for(const unit of ['api','web','admin'])run(unit+'-build','npm',['run','build','--workspace','@manaratak/'+unit]);clean();
  const artifacts=path.join(directory,'artifacts');
  run('package',process.execPath,['scripts/release/build-immutable-artifacts.mjs'],{SOURCE_SHA:sha,RELEASE_ARTIFACT_OUTPUT_DIR:artifacts});
  const manifest=verifyReleaseManifest(artifacts,sha);
  const units=[];
  for(const row of manifest.artifacts) {
    const archive=path.join(artifacts,row.file);
    const names=execFileSync('tar',['--force-local','-tf',archive],{encoding:'utf8',maxBuffer:8*1024*1024}).trim().split('\n');
    const listing=execFileSync('tar',['--force-local','-tvf',archive],{encoding:'utf8',maxBuffer:16*1024*1024}).trim().split('\n');
    if(names.some(name=>name.startsWith('/')||name.includes('\\')||name.split('/').includes('..'))||listing.some(line=>!/^[-d]/.test(line)))
      throw new Error('POST28_DIAGNOSTIC_ARCHIVE_PATH_OR_TYPE_INVALID');
    const unpack=path.join(directory,'unpacked-'+row.unit);fs.mkdirSync(unpack,{mode:0o700});
    execFileSync('tar',['--force-local','-xf',archive,'-C',unpack],{stdio:'pipe'});
    if(row.unit!=='api'&&inspectStaticBuild(path.join(unpack,'apps',row.unit,'dist'),row.unit,sha).status!=='BUILT')throw new Error('POST28_DIAGNOSTIC_STATIC_UNPACK_INVALID');
    if(row.unit==='api'&&!fs.statSync(path.join(unpack,'apps/api/dist/server.cjs')).isFile())throw new Error('POST28_DIAGNOSTIC_API_ENTRY_MISSING');
    if(fs.existsSync(path.join(unpack,'node_modules'))||fs.existsSync(path.join(unpack,'.git')))throw new Error('POST28_DIAGNOSTIC_UNPACK_CONTAMINATED');
    units.push({unit:row.unit,artifactSha256:row.sha256,bytes:row.size,freshUnpackInspected:true,processBooted:false});
  }
  clean();
  const report={version:1,kind:'POST28_R07_DIAGNOSTIC_BUILD',sourceSha:sha,nodeVersion:process.version,lockSha256:hash('package-lock.json'),
    schemaSha256:hash('packages/infrastructure/prisma/schema.prisma'),generatedClientSchemaSha256:hash('node_modules/.prisma/client/schema.prisma'),
    manifestSha256:hash(path.join(artifacts,'release-manifest.json')),sbomSha256:manifest.sbom.sha256,units,
    runtimeBootVerified:false,databaseConnected:false,stageAccepted:false,promotionAuthorized:false};
  fs.writeFileSync(path.join(directory,'summary.json'),JSON.stringify(report,null,2)+'\n',{flag:'wx',mode:0o600});
  console.log(JSON.stringify({sourceSha:sha,output:directory,units:units.length,runtimeBootVerified:false,stageAccepted:false}));
}catch(error){console.error(error.message?.match(/^POST28_[A-Z_]+$/)?.[0]??'POST28_DIAGNOSTIC_BUILD_FAILED');if(directory)console.error('POST28_DIAGNOSTIC_OUTPUT='+directory);process.exitCode=1;}
