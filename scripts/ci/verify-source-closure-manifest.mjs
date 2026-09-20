#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd();
const manifest=JSON.parse(fs.readFileSync(path.join(root,'scripts/ci/source-closure-manifest.json'),'utf8'));
const failures=[];
if (manifest.version !== 1 || manifest.kind !== 'MANARATAK_SOURCE_CLOSURE_MANIFEST') failures.push('manifest identity/version invalid');
const ids=new Set();
for (const gate of manifest.gates ?? []) {
  if (!gate.id || ids.has(gate.id)) failures.push(`duplicate/missing gate id ${gate.id}`); ids.add(gate.id);
  if (gate.classification === 'RUNTIME' && gate.status !== 'PENDING_NON_BLOCKING') failures.push(`${gate.id}: runtime gate must be explicit PENDING_NON_BLOCKING at source closure`);
  if (!['SOURCE','RUNTIME'].includes(gate.classification)) failures.push(`${gate.id}: invalid classification`);
}
const registered=new Set(manifest.registeredVerifierFiles ?? []);
function walk(dir){const out=[]; for(const e of fs.readdirSync(dir,{withFileTypes:true})){const f=path.join(dir,e.name); if(e.isDirectory()){if(!['archive','legacy','node_modules'].includes(e.name)) out.push(...walk(f));} else out.push(f);} return out;}
const active=walk(path.join(root,'scripts')).filter((f)=>/^verify-.*\.(mjs|ts)$/.test(path.basename(f)) && (path.basename(f).includes('-source') || path.basename(f).includes('source-closure'))).map((f)=>path.relative(root,f).replaceAll('\\','/')).sort();
for(const f of active) if(!registered.has(f)) failures.push(`unregistered active source verifier: ${f}`);
for(const f of registered) if(!fs.existsSync(path.join(root,f))) failures.push(`registered verifier missing: ${f}`);
if(failures.length){console.error('SOURCE_CLOSURE_MANIFEST=FAIL'); failures.forEach(x=>console.error(`FAIL: ${x}`)); process.exit(1);}
console.log(`SOURCE_CLOSURE_MANIFEST=PASS gates=${manifest.gates.length} verifiers=${registered.size}`);
