import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ts=require('typescript');
const root=path.resolve(import.meta.dirname,'../..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
function load(rel){const js=ts.transpileModule(read(rel),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText; const m={exports:{}}; vm.runInThisContext(`(function(require,exports,module){${js}\n})`,{filename:rel})((id)=>{throw new Error('UNEXPECTED_REQUIRE:'+id)},m.exports,m); return m.exports;}
test('MNT-AUD-0057 canonical generator emits cryptographic UUIDs without fallback randomness',()=>{
  const {generateOpaqueIdentifier}=load('packages/core/src/domain/IdentifierGenerator.ts');
  const ids=new Set(Array.from({length:5000},()=>generateOpaqueIdentifier()));
  assert.equal(ids.size,5000);
  for(const id of [...ids].slice(0,20)) assert.match(id,/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
  assert.doesNotMatch(read('packages/core/src/domain/IdentifierGenerator.ts'),/Math\.random/);
});
test('MNT-AUD-0057 persisted/public identifier sources no longer use Math.random',()=>{
  const files=[
    'packages/core/src/domain/Entity.ts','packages/domain/src/aggregates/Identity.ts',
    'packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts',
    'packages/application/src/import-foundation/services/MergeProposalPreparationService.ts',
    'packages/infrastructure/src/asset-platform/LocalAssetStorageGateway.ts',
    'apps/api/src/infrastructure/di/container.ts',
    'apps/admin/src/pages/UniversityRelationshipEditorPage.tsx','apps/admin/src/pages/ScholarshipRelationshipEditorPage.tsx',
  ];
  for(const file of files) assert.doesNotMatch(read(file),/Math\.random\(/,file);
  assert.match(read('packages/core/src/domain/Entity.ts'),/generateOpaqueIdentifier/);
  assert.match(read('packages/domain/src/aggregates/Identity.ts'),/generateOpaqueIdentifier/);
  assert.match(read('packages/application/src/scholarships/use-cases/AdminScholarshipUseCases.ts'),/sch_\$\{generateOpaqueIdentifier\(\)\}/);
});
test('MNT-AUD-0057 Math.random remains only in non-identifier retry jitter among runtime packages',()=>{
  const hits=[];
  const roots=['packages','apps'];
  const walk=(dir)=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name); if(e.isDirectory()){if(['node_modules','dist','coverage'].includes(e.name))continue;walk(p);}else if(/\.(ts|tsx|js|mjs)$/.test(e.name)&&!e.name.includes('.test.')&&!e.name.includes('.spec.')){const s=fs.readFileSync(p,'utf8');if(s.includes('Math.random('))hits.push(path.relative(root,p));}}};
  roots.forEach(r=>walk(path.join(root,r)));
  assert.deepEqual(hits,['packages/application/src/ai-platform/use-cases/AIPlatformUseCases.ts']);
  assert.match(read(hits[0]),/jitteredBackoffMs/);
});
