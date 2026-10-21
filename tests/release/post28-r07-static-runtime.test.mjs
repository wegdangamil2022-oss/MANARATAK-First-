import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {inspectStaticBuild} from '../../scripts/release/lib/StaticBuildPolicy.mjs';
import {runSmoke} from '../../scripts/release/lib/SmokeContracts.mjs';
const sha='a'.repeat(40);
function fixture() {
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-static-'));
  fs.mkdirSync(path.join(root,'assets'));fs.writeFileSync(path.join(root,'assets/app.js'),'export {};');
  fs.writeFileSync(path.join(root,'index.html'),`<meta name="manaratak-build-sha" content="${sha}"><div id="root"></div><script src="/assets/app.js"></script>`);
  fs.writeFileSync(path.join(root,'manaratak-build.json'),JSON.stringify({version:1,unit:'web',sourceSha:sha}));return root;
}
for(const mutation of ['missing','empty','symlink-file','symlink-parent','traversal','external','metadata-symlink'])test(`static build refuses ${mutation}`,()=>{
  const root=fixture();
  try {
    const script=path.join(root,'assets/app.js');
    if(mutation==='missing')fs.rmSync(script);
    if(mutation==='empty')fs.writeFileSync(script,'');
    if(mutation==='symlink-file'){fs.rmSync(script);fs.symlinkSync(path.join(root,'index.html'),script);}
    if(mutation==='symlink-parent'){fs.renameSync(path.join(root,'assets'),path.join(root,'renamed'));fs.symlinkSync(path.join(root,'renamed'),path.join(root,'assets'));}
    if(['traversal','external'].includes(mutation))fs.writeFileSync(path.join(root,'index.html'),`<meta name="manaratak-build-sha" content="${sha}"><script src="${mutation==='external'?'https://remote.example/a.js':'/assets/%2e%2e/a.js'}"></script>`);
    if(mutation==='metadata-symlink'){fs.renameSync(path.join(root,'manaratak-build.json'),path.join(root,'metadata.json'));fs.symlinkSync(path.join(root,'metadata.json'),path.join(root,'manaratak-build.json'));}
    assert.equal(inspectStaticBuild(root,'web',sha).status,'UNBUILT');
  } finally {fs.rmSync(root,{recursive:true,force:true});}
});
test('valid same-unit JS entry is BUILT',()=>{const root=fixture();try{assert.equal(inspectStaticBuild(root,'web',sha).status,'BUILT');}finally{fs.rmSync(root,{recursive:true,force:true});}});
const options={api:'https://api.example',web:'https://web.example',admin:'https://admin.example',sha};
function fetcher(script={}) {return async url=>{
  if(url.includes('/monitoring/'))return new Response(JSON.stringify({protocolVersion:2,status:'UP',code:'AVAILABLE',timestamp:new Date().toISOString()}),{headers:{'content-type':'application/json','x-manaratak-source-sha':sha}});
  if(url.endsWith('/health/build'))return new Response(JSON.stringify({version:1,status:'BUILT',unit:url.includes('admin')?'admin':'web',sourceSha:sha}),{headers:{'content-type':'application/json'}});
  if(url.endsWith('.js'))return new Response(script.body??'export {};',{status:script.status??200,headers:{'content-type':script.type??'application/javascript'}});
  return new Response(`<meta name="manaratak-build-sha" content="${sha}"><div id="root"></div><script src="/assets/app.js"></script>`,{headers:{'content-type':'text/html'}});
};}
for(const [name,response] of [['SPA fallback',{body:'<!doctype html><html></html>',type:'text/html'}],['HTML mislabeled as JS',{body:' <html></html>'}],['empty JS',{body:''}],['missing JS',{status:404}],['redirect',{status:302}]])
  test(`smoke refuses ${name}`,async()=>assert.rejects(()=>runSmoke(options,fetcher(response))));
test('smoke requests actual scripts for both built units',async()=>{let scripts=0;const base=fetcher();const result=await runSmoke(options,async url=>{if(url.endsWith('.js'))scripts++;return base(url);});assert.equal(result.status,'PASS');assert.equal(scripts,2);});

test('artifact input inspection rejects symlinks before tar packaging',async()=>{
  const {assertRegularArtifactInputs}=await import('../../scripts/release/lib/ArtifactInputPolicy.mjs');const root=fixture();
  try{assert.doesNotThrow(()=>assertRegularArtifactInputs(root,['assets']));fs.symlinkSync(path.join(root,'index.html'),path.join(root,'assets/link'));assert.throws(()=>assertRegularArtifactInputs(root,['assets']),/SYMLINK/);assert.throws(()=>assertRegularArtifactInputs(root,['../outside']),/PATH_INVALID/);}finally{fs.rmSync(root,{recursive:true,force:true});}
});

test('packager rejects dirty source or existing output before altering static inputs',async()=>{
  const {spawnSync,execFileSync}=await import('node:child_process');
  const builder=path.resolve('scripts/release/build-immutable-artifacts.mjs');
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-packager-'));
  try {
    const git=(...args)=>execFileSync('git',args,{cwd:root,encoding:'utf8',stdio:['ignore','pipe','pipe']}).trim();
    git('init','-q');fs.writeFileSync(path.join(root,'tracked'),'source');git('add','tracked');git('-c','user.name=Fixture','-c','user.email=fixture@example.invalid','commit','-qm','fixture');
    const head=git('rev-parse','HEAD'),output=path.join(root,'release-artifacts');fs.mkdirSync(output);
    const run=()=>spawnSync(process.execPath,[builder],{cwd:root,encoding:'utf8',env:{...process.env,SOURCE_SHA:head,GITHUB_SHA:head,RELEASE_ARTIFACT_OUTPUT_DIR:output}});
    const existing=run();assert.notEqual(existing.status,0);assert.match(existing.stderr,/RELEASE_FRESH_OUTPUT_REQUIRED/);
    fs.rmSync(output,{recursive:true});fs.writeFileSync(path.join(root,'untracked'),'unreviewed');
    const dirty=run();assert.notEqual(dirty.status,0);assert.match(dirty.stderr,/RELEASE_CLEAN_SOURCE_REQUIRED/);assert.equal(fs.existsSync(output),false);
    assert.equal(fs.readFileSync(path.join(root,'tracked'),'utf8'),'source');
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
test('R06-R09 inventory identifies 26 mandatory R06 cases without claiming runtime coverage',async()=>{
  const {spawnSync}=await import('node:child_process');const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-runtime-plan-'));
  try{
    const file=path.join(root,'plan.json'),args=['scripts/database/prepare-post28-r06-r09.mjs',file];
    assert.equal(spawnSync(process.execPath,args,{encoding:'utf8'}).status,0);
    const report=JSON.parse(fs.readFileSync(file,'utf8'));assert.equal(report.R06.caseRequirements.length,26);
    assert.equal(report.R06.accepted,false);assert.equal(report.R07.accepted,false);assert.equal(report.R09.relationships,77);
    assert.ok(report.R06.caseRequirements.every(row=>row.ownerRuntimeCommand===null&&!row.measuredExecution));
    assert.notEqual(spawnSync(process.execPath,args,{encoding:'utf8'}).status,0);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
