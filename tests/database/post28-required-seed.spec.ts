import {describe,it,expect} from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {AssetStorageLocator,AssetStorageZone} from '@manaratak/domain';
import {referenceSeedPlan,referenceSeedPayload} from '../../scripts/database/post28-reference-seed-plan';
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

describe('Prisma-compatible P7 advisory locks',()=>{
 it('casts the real owner lock return value without changing lock identity',async()=>{
  const {PrismaReferenceOwnerReviewGateway}=await import('../../packages/infrastructure/src/reference-data/PrismaReferenceOwnerReviewGateway');
  const queries:string[]=[];
  const gateway=new PrismaReferenceOwnerReviewGateway({$queryRaw:async(strings:TemplateStringsArray)=>{queries.push(strings.join(''));return [];}} as never,true);
  await gateway.lock('review-id');
  expect(queries).toHaveLength(2);
  expect(queries.every(sql=>sql.includes('pg_advisory_xact_lock')&&sql.endsWith('::text'))).toBe(true);
 });
 it('casts dispatcher receipt lock before screening and preserving the transaction',async()=>{
  const {PrismaImportScreeningReceiptStore}=await import('../../packages/infrastructure/src/import-foundation/PrismaImportScreeningReceiptStore');
  const queries:string[]=[];
  const tx={$queryRaw:async(strings:TemplateStringsArray)=>{queries.push(strings.join(''));return [];},importScreeningReceipt:{findUnique:async()=>({requestHash:'conflict',result:{}})}};
  const store=new PrismaImportScreeningReceiptStore({$transaction:async(work:(value:typeof tx)=>unknown)=>work(tx)} as never);
  await expect(store.accept({ownerDomain:'REFERENCE_DATA',handoffId:'row',execution:{executionId:'run',attempt:1}} as never,async()=>({}))).rejects.toThrow('CONTENT_CONFLICT');
  expect(queries[0]).toContain('::text');
 });
});

describe('all required reference rows satisfy the real P6 wire contract',()=>{
 it('screens every one of 622 JSON payloads without skipping or weakening owner validation',async()=>{
  const {ReferenceDataScreeningHandoffConsumer}=await import('../../packages/application/src/reference-data/services/ReferenceDataScreeningHandoffConsumer');
  const consumer=new ReferenceDataScreeningHandoffConsumer();let count=0;
  for(const input of await referenceSeedPlan(process.cwd()))for(const [index,record] of input.records.entries()){
   const payload=referenceSeedPayload(input,record);
   const decision=await consumer.accept({handoffId:input.id+index,ownerDomain:'REFERENCE_DATA',artifact:{sourceId:input.id,artifactId:'unit-shape-only'},normalizedPayload:payload,provenance:{sourceSystem:'unit-source-shape',contentHash:'a'.repeat(64)},validation:{state:'VALID',issues:[]},execution:{executionId:'unit',attempt:1,dryRun:true,idempotencyKey:String(index)},referenceMetadata:{referenceEntityType:input.type}});
   expect(decision.issues,`${input.id}:${index}`).toEqual([]);expect(decision.state).toBe('NEEDS_OWNER_REVIEW');count++;
  }
  expect(count).toBe(622);
 });
});
