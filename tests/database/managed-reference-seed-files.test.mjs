import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { resolveManagedSeedAsset, validateManagedSeedJson, writeSeedEvidence } from '../../scripts/database/managed-reference-seed-files.mjs';
test('initial run checkpoint is exclusive and cannot overwrite another operator state',()=>{
  const root=fs.mkdtempSync(path.join(os.tmpdir(),'managed-seed-state-')),filename=path.join(root,'state.json');
  try{
    writeSeedEvidence(filename,{applied:25},{exclusive:true});
    assert.throws(()=>writeSeedEvidence(filename,{applied:0},{exclusive:true}),{code:'EEXIST'});
    assert.deepEqual(JSON.parse(fs.readFileSync(filename,'utf8')),{applied:25});
  }finally{fs.unlinkSync(filename);fs.rmdirSync(root);}
});
test('reference sanitizer accepts only bounded canonical UTF8 JSON arrays',()=>{
  validateManagedSeedJson(Buffer.from('[{"isoCode":"USD"}]'));
  for(const text of ['{}','[ ]','[',JSON.stringify(Array(1001).fill(0))])assert.throws(()=>validateManagedSeedJson(Buffer.from(text)));
  assert.throws(()=>validateManagedSeedJson(Buffer.from([0xff])));
});
test('scanner cannot escape its bucket, traverse, or follow a junction to another directory',()=>{
  const root=fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(),'managed-seed-')));
  const bucket='expected';fs.mkdirSync(path.join(root,bucket));fs.mkdirSync(path.join(root,'other'));
  fs.writeFileSync(path.join(root,bucket,'seed.json'),'[]');fs.writeFileSync(path.join(root,'other','seed.json'),'[]');
  try{
    assert.equal(resolveManagedSeedAsset(root,bucket,{bucketName:bucket,pathKey:'seed.json'}),path.join(root,bucket,'seed.json'));
    assert.throws(()=>resolveManagedSeedAsset(root,bucket,{bucketName:'other',pathKey:'seed.json'}));
    assert.throws(()=>resolveManagedSeedAsset(root,bucket,{bucketName:bucket,pathKey:'../other/seed.json'}));
    const link=path.join(root,bucket,'linked');fs.symlinkSync(path.join(root,'other'),link,process.platform==='win32'?'junction':'dir');
    assert.throws(()=>resolveManagedSeedAsset(root,bucket,{bucketName:bucket,pathKey:'linked/seed.json'}));
    fs.unlinkSync(link);
  }finally{
    // Remove only this test's known files/directories; never recursively follow a link.
    for(const child of [bucket,'other']){fs.unlinkSync(path.join(root,child,'seed.json'));fs.rmdirSync(path.join(root,child));}fs.rmdirSync(root);
  }
});
