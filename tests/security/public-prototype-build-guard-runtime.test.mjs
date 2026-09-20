import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require=createRequire(import.meta.url); const ts=require('typescript');
const src=fs.readFileSync(new URL('../../apps/web/src/config/PublicDataModePolicy.ts',import.meta.url),'utf8');
const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={module:{exports:{}},exports:{},console}; sandbox.exports=sandbox.module.exports; vm.runInNewContext(out,sandbox); const p=sandbox.module.exports;
test('prototype data is forbidden for production/staging builds',()=>{
  for(const mode of ['production','staging']) assert.throws(()=>p.assertPublicBuildDataMode({mode,dataMode:'prototype'}),/forbidden/);
  assert.doesNotThrow(()=>p.assertPublicBuildDataMode({mode:'development',dataMode:'prototype'}));
});
test('compile capability is disabled for production-like tiers',()=>{ assert.equal(p.prototypeCapabilityEnabled('production'),false); assert.equal(p.prototypeCapabilityEnabled('staging'),false); assert.equal(p.prototypeCapabilityEnabled('development'),true); });
