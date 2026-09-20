#!/usr/bin/env node
import childProcess from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(), out=path.join(root,'release-artifacts'); fs.rmSync(out,{recursive:true,force:true}); fs.mkdirSync(out,{recursive:true});
const sourceSha=process.env.GITHUB_SHA || (()=>{try{return childProcess.execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();}catch{return 'SOURCE_SHA_UNAVAILABLE';}})();
const units=[['api',['apps/api/dist','packages/infrastructure/prisma/schema.prisma','packages/infrastructure/prisma/migrations','package.json','package-lock.json']],['web',['apps/web/dist']],['admin',['apps/admin/dist']]];
const sha=(f)=>crypto.createHash('sha256').update(fs.readFileSync(f)).digest('hex');
const artifacts=[];
for(const [name,items] of units){for(const i of items) if(!fs.existsSync(path.join(root,i))) throw new Error(`RELEASE_INPUT_MISSING:${i}`); const target=path.join(out,`manaratak-${name}-${sourceSha}.tar`); childProcess.execFileSync('tar',['--sort=name','--mtime=UTC 1970-01-01','--owner=0','--group=0','--numeric-owner','-cf',target,...items],{cwd:root,stdio:'inherit'}); artifacts.push({unit:name,file:path.basename(target),sha256:sha(target),size:fs.statSync(target).size});}
const lock=JSON.parse(fs.readFileSync('package-lock.json','utf8')); const components=Object.entries(lock.packages??{}).filter(([k,v])=>k&&v?.version).map(([k,v])=>({type:'library',name:k.replace(/^node_modules\//,''),version:v.version,purl:`pkg:npm/${encodeURIComponent(k.replace(/^node_modules\//,''))}@${v.version}`}));
const sbom={bomFormat:'CycloneDX',specVersion:'1.5',version:1,metadata:{timestamp:new Date().toISOString(),component:{type:'application',name:'MANARATAK',version:sourceSha}},components}; fs.writeFileSync(path.join(out,'release-sbom.cdx.json'),JSON.stringify(sbom,null,2)+'\n');
const manifest={version:1,kind:'MANARATAK_IMMUTABLE_RELEASE',sourceSha,nodeVersion:process.version,createdAt:new Date().toISOString(),artifacts,sbom:{file:'release-sbom.cdx.json',sha256:sha(path.join(out,'release-sbom.cdx.json'))},provenance:{builder:'github-actions/Enterprise CI Pipeline',runId:process.env.GITHUB_RUN_ID??null,runAttempt:process.env.GITHUB_RUN_ATTEMPT??null}}; fs.writeFileSync(path.join(out,'release-manifest.json'),JSON.stringify(manifest,null,2)+'\n'); fs.writeFileSync(path.join(out,'SHA256SUMS'),[...artifacts.map(a=>`${a.sha256}  ${a.file}`),`${manifest.sbom.sha256}  ${manifest.sbom.file}`].join('\n')+'\n'); console.log(`RELEASE_ARTIFACTS=BUILT sourceSha=${sourceSha} units=${artifacts.length}`);
