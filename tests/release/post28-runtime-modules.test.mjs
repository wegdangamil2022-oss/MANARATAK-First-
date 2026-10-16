import test from 'node:test';
import assert from 'node:assert/strict';
import {build} from 'esbuild';
import {runtimeExternalModules} from '../../scripts/release/lib/RuntimeModules.mjs';
test('runtime imports follow real esbuild output, excluding builtins and unused declarations',async()=>{
  const result=await build({stdin:{contents:'import fs from "node:fs"; import prisma from "@prisma/client"; console.log(fs,prisma);'},bundle:true,platform:'node',format:'cjs',outfile:'server.cjs',write:false,metafile:true,external:['@prisma/client','bcrypt','jsonwebtoken']});
  assert.deepEqual(runtimeExternalModules(result.metafile),['@prisma/client']);
});
test('missing API output or required Prisma import fails the runtime contract',()=>{
  assert.throws(()=>runtimeExternalModules({outputs:{}}),/METAFILE_INVALID/);
  assert.throws(()=>runtimeExternalModules({outputs:{'server.cjs':{imports:[]}}}),/RUNTIME_MODULES_INVALID/);
});
