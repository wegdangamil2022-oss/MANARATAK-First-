import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AssetRecord,AssetId,AssetReference,AssetStorageLocator,AssetOwnerReference,AssetMetadata,AssetRetentionMetadata} from '@manaratak/domain';
import {snapshotAsset,restoreAsset,fixedKnownSourceDecision,R05AuditStagingRepository,snapshotDigest} from '../../scripts/database/post28-r05-staging.mjs';
import {PrismaAssetRecordRepository} from '../../packages/infrastructure/src/asset-platform/PrismaAssetRecordRepository.ts';

const packet={source:{createdAt:new Date(Date.now()-86400000).toISOString()}};
const decision=fixedKnownSourceDecision(packet);
test('snapshot digest survives JSONB object-key reordering without hiding changed array order or values',()=>{
 assert.equal(snapshotDigest({b:{z:1,a:2},a:[{d:4,c:3}]}),snapshotDigest({a:[{c:3,d:4}],b:{a:2,z:1}}));
 assert.notEqual(snapshotDigest({a:[1,2]}),snapshotDigest({a:[2,1]}));
 assert.notEqual(snapshotDigest({a:1}),snapshotDigest({a:'1'}));
});
function asset(){return new AssetRecord({id:new AssetId(randomUUID()),reference:new AssetReference('SYNTHETIC-R05'),locator:new AssetStorageLocator('QUARANTINE','synthetic','uploads/example.pdf'),owner:new AssetOwnerReference('synthetic-student','STUDENT'),metadata:new AssetMetadata('new.pdf','application/pdf','pdf',636),retention:new AssetRetentionMetadata('TEMPORARY',new Date(decision.expiresAt)),classification:'CONFIDENTIAL',state:'INITIATED'});}
test('expiry is anchored to source creation, bounded by an earlier document deadline, and unchanged on retry',()=>{
 assert.equal(Date.parse(decision.expiresAt)-Date.parse(packet.source.createdAt),180*86400000);
 assert.deepEqual(fixedKnownSourceDecision(packet),decision);
 const deadline=new Date(Date.now()+86400000).toISOString();assert.equal(fixedKnownSourceDecision(packet,deadline).expiresAt,deadline);
 assert.throws(()=>fixedKnownSourceDecision({source:{}}),/ANCHOR_REQUIRED/);
 assert.throws(()=>fixedKnownSourceDecision(packet,new Date(Date.now()-1).toISOString()),/RETENTION_EXPIRED/);
});
test('Audit-safe snapshot round trips quarantine locator and lifecycle evidence without redaction',()=>{
 const original=asset(),snapshot=snapshotAsset(original);
 assert.deepEqual(snapshotAsset(restoreAsset(snapshot)),snapshot);
 assert.equal(snapshot.locator,original.locator.value);assert.equal(snapshot.ownerId,original.owner.ownerId);
});
test('snapshot refuses sensitive metadata instead of weakening the Audit sanitizer',()=>{
 const original=asset();original.metadata.extraMetadata={accessToken:'never-persist'};
 assert.throws(()=>snapshotAsset(original),/REDACTED_FIELDS/);
});
test('canonical Asset transaction persistence rejects an unowned context before any write',async()=>{
 const repo=new PrismaAssetRecordRepository({assetRecord:{create(){throw Error('ROOT_CLIENT_MUST_NOT_WRITE');}}});
 await assert.rejects(repo.saveInTransaction(asset(),{boundaryId:'unowned'}),/ATOMIC_TRANSACTION_CONTEXT_REQUIRED/);
});
test('canonical Asset transaction persistence writes only through the supplied transaction',async()=>{
 const calls=[],repo=new PrismaAssetRecordRepository({assetRecord:{create(){throw Error('ROOT_CLIENT_MUST_NOT_WRITE');}}});
 await repo.saveInTransaction(asset(),{boundaryId:randomUUID(),transactionClient:{assetRecord:{async create({data}){calls.push(data);return {...data,updatedAt:new Date()};}}}});
 assert.equal(calls.length,1);assert.equal(calls[0].ownerId,'synthetic-student');
});
function stageFixture(){
 const value=asset(),rows=[];
 const client={auditRecord:{async findMany(){return rows.length?[rows.at(-1)]:[];}},async $transaction(fn){return fn({...client,async $queryRaw(){return [];}});}};
 const audit={async saveInTransaction(record){rows.push({contextMetadata:record.getContextMetadata().getData(),timestamp:record.getTimestamp().getValue()});}};
 const repo=new R05AuditStagingRepository({client,auditRepository:audit,operationId:randomUUID(),assetId:value.id.value,ownerId:value.owner.ownerId,manifestSha256:'a'.repeat(64),decision});
 return {repo,rows,value};
}
test('durable staging rejects stale writers and rehydrates a fresh aggregate',async()=>{
 const {repo,rows,value}=stageFixture();await repo.save(value);
 assert.equal(rows.length,1);assert.equal(rows[0].contextMetadata.sequence,1);
 await assert.rejects(repo.save(value),/CONCURRENT_MODIFICATION/);
 const fresh=await repo.findById(value.id);assert.notEqual(fresh,value);
 await repo.save(fresh);assert.equal(rows[1].contextMetadata.sequence,2);
 assert.equal(rows[1].contextMetadata.previousSnapshotSha256,snapshotDigest(snapshotAsset(value)));
});
test('durable staging refuses changed owner or expiry and a different manifest on resume',async()=>{
 const {repo,rows,value}=stageFixture();await repo.save(value);
 rows[0].contextMetadata.manifestSha256='b'.repeat(64);
 await assert.rejects(repo.findById(value.id),/IDENTITY_MISMATCH/);
 const other=stageFixture();other.repo.decision.expiresAt=new Date(Date.now()+86400000).toISOString();
 await assert.rejects(other.repo.save(other.value),/RETENTION_MISMATCH/);
});
test('completion rejects an intermediate state before calling Asset persistence or a verifier',async()=>{
 const {repo,value}=stageFixture();await repo.save(value);
 await assert.rejects(repo.complete({assetRepository:{saveInTransaction(){throw Error('MUST_NOT_WRITE');}},verifyWithinTransaction(){throw Error('MUST_NOT_VERIFY_INACTIVE');}}),/STAGE_NOT_ACTIVE/);
});
