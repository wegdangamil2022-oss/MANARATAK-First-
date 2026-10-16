import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {AssetStorageLocator,AssetStorageZone} from '@manaratak/domain';
import {referenceSeedPlan} from '../../scripts/database/post28-reference-seed-plan';
import {Post28SeedAssetSecurity,scannerImage} from '../../scripts/database/post28-seed-asset-security';
describe('Post28 required seed source plan',()=>{
 it('validates reviewed source hashes, counts and currency/language dependencies before country apply',async()=>{
  const plan=await referenceSeedPlan(process.cwd());
  expect(plan.map(x=>[x.type,x.records.length])).toEqual([['CURRENCY',168],['LANGUAGE',260],['COUNTRY',194]]);
  expect(plan.every(x=>/^[a-f0-9]{64}$/.test(x.sourceHash))).toBe(true);
  expect(plan[1].records.filter(x=>x.aliases.length).length).toBe(20);
 });
 it('does not make lifecycle writes from source metadata',async()=>{
  const plan=await referenceSeedPlan(process.cwd());
  expect(plan.flatMap(x=>x.records).some(x=>'isActive'in x||'lifecycleState'in x)).toBe(false);
 });
});
describe('Post28 real scanner and bounded JSON sanitizer contract',()=>{
 it('pins the malware scanner image rather than a successful noop',()=>expect(scannerImage).toMatch(/^clamav\/clamav@sha256:[a-f0-9]{64}$/));
 for(const [text,valid] of [['[]',true],['[{"code":"ar"}]',true],['{}',false],['[ ]',false],['[',false]] as const){
  it(`canonical JSON ${JSON.stringify(text)} accepted=${valid}`,async()=>{
   const root=fs.mkdtempSync(path.join(os.tmpdir(),'post28-json-'));fs.mkdirSync(path.join(root,'bucket'));fs.writeFileSync(path.join(root,'bucket','seed.json'),text);
   try{
    const work=new Post28SeedAssetSecurity(root,'bucket').sanitize(new AssetStorageLocator(AssetStorageZone.QUARANTINE,'bucket','seed.json'));
    if(valid)expect((await work).metadata.sanitizerNotes).toContain('Bytes unchanged');else await expect(work).rejects.toThrow();
   }finally{fs.rmSync(root,{recursive:true,force:true});}
  });
 }
 it('refuses a different bucket and traversal before reading source content',async()=>{
  const security=new Post28SeedAssetSecurity(os.tmpdir(),'expected');
  await expect(security.sanitize(new AssetStorageLocator(AssetStorageZone.QUARANTINE,'other','x'))).rejects.toThrow('BUCKET_MISMATCH');
  await expect(security.sanitize(new AssetStorageLocator(AssetStorageZone.QUARANTINE,'expected','../../etc/passwd'))).rejects.toThrow('PATH_INVALID');
 });
});
