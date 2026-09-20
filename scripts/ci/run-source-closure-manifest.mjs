#!/usr/bin/env node
import childProcess from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const sourceOnly=process.argv.includes('--source-only');
const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/ci/source-closure-manifest.json'),'utf8'));
childProcess.execFileSync(process.execPath,['scripts/ci/verify-source-closure-manifest.mjs'],{stdio:'inherit'});
for(const gate of manifest.gates){
  if(gate.classification==='RUNTIME' && sourceOnly){console.log(`SKIP ${gate.id}=PENDING_NON_BLOCKING`); continue;}
  if(gate.classification==='RUNTIME' && gate.status==='PENDING_NON_BLOCKING' && !process.argv.includes('--include-runtime')){console.log(`SKIP ${gate.id}=PENDING_NON_BLOCKING`); continue;}
  console.log(`RUN ${gate.id}: ${gate.command}`);
  childProcess.execSync(gate.command,{cwd:root,stdio:'inherit',shell:true,env:{...process.env,DATABASE_MUTATIONS_ALLOWED:process.env.DATABASE_MUTATIONS_ALLOWED??'false',DATABASE_ENVIRONMENT:process.env.DATABASE_ENVIRONMENT??'source'}});
}
console.log('SOURCE_CLOSURE_MANIFEST_RUN=PASS');
