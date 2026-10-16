import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {verifyRuntimeLayer} from '../../scripts/release/lib/RuntimeLayerPolicy.mjs';
const digest=value=>createHash('sha256').update(value).digest('hex');
for(const mutation of ['valid','source','os','architecture','lock','schema','engine','missing-engine','external-fallback'])test('runtime layer policy: '+mutation,()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-layer-'));
  try {
    const client=path.join(root,'node_modules/.prisma/client');fs.mkdirSync(client,{recursive:true});
    fs.writeFileSync(path.join(root,'package-lock.json'),'lock');fs.writeFileSync(path.join(client,'schema.prisma'),'schema');fs.writeFileSync(path.join(client,'test.node'),'native-fixture');
    const manifest={sourceSha:'a'.repeat(40),runtimeRequirements:{lockSha256:digest('lock'),externalModules:[]}};
    const identity={sourceSha:manifest.sourceSha,os:process.platform,architecture:process.arch,nodeMajor:22,engineFile:'test.node',engineSha256:digest('native-fixture'),generatedSchemaSha256:digest('schema')};
    if(mutation==='source')identity.sourceSha='b'.repeat(40);
    if(mutation==='os')identity.os='wrong';
    if(mutation==='architecture')identity.architecture='wrong';
    if(mutation==='lock')fs.writeFileSync(path.join(root,'package-lock.json'),'changed');
    if(mutation==='schema')fs.writeFileSync(path.join(client,'schema.prisma'),'changed');
    if(mutation==='engine')fs.writeFileSync(path.join(client,'test.node'),'changed');
    if(mutation==='missing-engine')fs.rmSync(path.join(client,'test.node'));
    if(mutation==='external-fallback')manifest.runtimeRequirements.externalModules=['not-installed-r07-module'];
    const run=()=>verifyRuntimeLayer(root,manifest,identity,{load:()=>{}});
    if(mutation==='valid')assert.equal(run().stageAccepted,false);else assert.throws(run);
  }finally{fs.rmSync(root,{recursive:true,force:true});}
});
