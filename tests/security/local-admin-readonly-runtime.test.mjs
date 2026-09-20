import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const ts=require('typescript');
const src=fs.readFileSync(new URL('../../apps/admin/src/security/LocalAdminReadOnlyPolicy.ts', import.meta.url),'utf8');
const out=ts.transpileModule(src,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
const sandbox={module:{exports:{}},exports:{},console}; sandbox.exports=sandbox.module.exports; vm.runInNewContext(out,sandbox);
const p=sandbox.module.exports;
test('read-only transport rejects every unsafe method but permits safe reads',()=>{
  for (const method of ['POST','PUT','PATCH','DELETE']) assert.throws(()=>p.assertLocalReadOnlyRequestAllowed(method,true),/READ_ONLY_PREVIEW/);
  for (const method of ['GET','HEAD','OPTIONS']) assert.doesNotThrow(()=>p.assertLocalReadOnlyRequestAllowed(method,true));
});
test('production and staging builds reject the auth-bypass preview flag',()=>{
  assert.throws(()=>p.assertLocalReadOnlyBuildAllowed({mode:'production',localReadOnly:'true'}),/forbidden/);
  assert.throws(()=>p.assertLocalReadOnlyBuildAllowed({mode:'staging',localReadOnly:'true'}),/forbidden/);
  assert.doesNotThrow(()=>p.assertLocalReadOnlyBuildAllowed({mode:'development',localReadOnly:'true'}));
});
