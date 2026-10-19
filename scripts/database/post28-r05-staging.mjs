// Isolated synthetic R05 orchestration only; never registered as a runtime repository.
// Intermediate states live in the existing append-only Audit contract. The historical
// Asset ID becomes visible only through the final Asset + Audit owner transaction.
import {createHash, randomUUID} from 'node:crypto';
import {
 AssetRecord, AssetId, AssetReference, AssetOwnerReference, AssetStorageLocator,
 AssetMetadata, AssetRetentionMetadata, AssetChecksum, AssetSanitizationMetadata,
 AuditRecord, AuditId, AuditReference, AuditAction, AuditCategory, AuditSeverity,
 ActorReference, TargetReference, SourceReference, AuditTimestamp, ContextMetadata,
 CorrelationReference,
} from '@manaratak/domain';
import {AuditSecretSanitizer} from '../../packages/infrastructure/src/audit/AuditSecretSanitizer.ts';

const clone=value=>JSON.parse(JSON.stringify(value));
// PostgreSQL JSONB reorders object keys. Hash semantic JSON, never insertion order.
const ordered=value=>Array.isArray(value)?value.map(ordered):value!==null&&typeof value==='object'?Object.fromEntries(Object.keys(value).sort().map(key=>[key,ordered(value[key])])):value;
export const snapshotDigest=value=>createHash('sha256').update(JSON.stringify(ordered(clone(value)))).digest('hex');
const fail=code=>{throw Error('POST28_R05_'+code);};
function locator(value){
 const match=/^(quarantine|clean):\/\/([^/]+)\/(.+)$/.exec(value??'');
 if(!match)fail('STAGE_LOCATOR_INVALID');
 return new AssetStorageLocator(match[1].toUpperCase(),match[2],match[3]);
}
export function snapshotAsset(asset){
 // pathKey is intentionally encoded as a complete locator: Audit correctly redacts
 // keys ending in "key". Never disable the sanitizer to persist staging evidence.
 if(asset.versionChain||asset.archiveOperation||asset.restoreOperation||asset.retentionBeforeLifecycle)fail('UNSUPPORTED_HISTORICAL_STAGE');
 const snapshot=clone({
  id:asset.id.value,reference:asset.reference.value,locator:asset.locator.value,
  ownerId:asset.owner.ownerId,ownerType:asset.owner.ownerType,state:asset.state,
  classification:asset.classification,retentionCategory:asset.retention.category,
  expiresAt:asset.retention.expiresAt?.toISOString()??null,metadata:asset.metadata,
  checksum:asset.checksum,sanitization:asset.sanitization,malwareScan:asset.malwareScan,
  uploadVerification:asset.uploadVerification,activationOperation:asset.activationOperation,
 });
 if(snapshotDigest(AuditSecretSanitizer.sanitize(snapshot))!==snapshotDigest(snapshot))fail('STAGE_CONTAINS_REDACTED_FIELDS');
 return snapshot;
}
export function restoreAsset(s){
 const m=s.metadata;
 return new AssetRecord({id:new AssetId(s.id),reference:new AssetReference(s.reference),
  owner:new AssetOwnerReference(s.ownerId,s.ownerType),locator:locator(s.locator),
  metadata:new AssetMetadata(m.originalFilename,m.mimeType,m.fileExtension,m.byteSize,m.width,m.height,m.duration,m.extraMetadata),
  retention:new AssetRetentionMetadata(s.retentionCategory,s.expiresAt?new Date(s.expiresAt):null),
  classification:s.classification,state:s.state,
  checksum:s.checksum?new AssetChecksum(s.checksum.algorithm,s.checksum.hash):undefined,
  sanitization:s.sanitization?new AssetSanitizationMetadata(s.sanitization.exifStripped,s.sanitization.sanitizedAt?new Date(s.sanitization.sanitizedAt):null,s.sanitization.sanitizerNotes):undefined,
  malwareScan:s.malwareScan,uploadVerification:s.uploadVerification,activationOperation:s.activationOperation,
 });
}
export function stagedAssetRow(s){
 return {
  id:s.id,reference:s.reference,ownerId:s.ownerId,ownerType:s.ownerType,
  lifecycleState:s.state,securityClassification:s.classification,
  retentionCategory:s.retentionCategory,retentionExpiresAt:s.expiresAt,legalHoldUntil:null,
  cleanStorageLocator:s.locator.startsWith('clean://')?s.locator:null,
  quarantineStorageLocator:s.locator.startsWith('quarantine://')?s.locator:null,
  checksumAlgorithm:s.checksum?.algorithm??null,checksumHash:s.checksum?.hash??null,
  metadata:s.metadata,sanitizationMetadata:s.sanitization??null,
  malwareScanStatus:{...s.malwareScan,uploadVerification:s.uploadVerification??null,activationOperation:s.activationOperation??null,restoreOperation:null,archiveOperation:null},
 };
}
export function fixedKnownSourceDecision(packet,documentDeadline){
 const anchor=Date.parse(packet?.source?.createdAt),deadline=documentDeadline==null?Infinity:Date.parse(documentDeadline);
 if(!Number.isFinite(anchor)||Number.isNaN(deadline)||anchor>Date.now())fail('SOURCE_CREATION_ANCHOR_REQUIRED');
 const expiry=Math.min(anchor+180*86400000,deadline);
 if(expiry<=Date.now())fail('SOURCE_RETENTION_EXPIRED');
 return {classification:'CONFIDENTIAL',retentionCategory:'TEMPORARY',sourceCreatedAt:new Date(anchor).toISOString(),expiresAt:new Date(expiry).toISOString(),legalHoldUntil:null};
}
export class R05AuditStagingRepository {
 constructor({client,auditRepository,operationId,assetId,ownerId,manifestSha256,decision}){
  if(!/^[0-9a-f-]{36}$/.test(operationId)||!assetId||!ownerId||!/^[0-9a-f]{64}$/.test(manifestSha256))fail('STAGE_IDENTITY_REQUIRED');
  this.client=client;this.audit=auditRepository;this.operationId=operationId;
  this.assetId=assetId;this.ownerId=ownerId;this.manifestSha256=manifestSha256;this.decision=clone(decision);
  this.observed=new WeakMap();
 }
 async latest(client=this.client){
  const rows=await client.auditRecord.findMany({where:{source:'POST28_R05_REMEDIATION',correlationReference:this.operationId},orderBy:[{timestamp:'desc'},{id:'desc'}],take:1});
  if(!rows.length)return null;
  const context=rows[0].contextMetadata;
  if(context.manifestSha256!==this.manifestSha256||context.assetId!==this.assetId||context.ownerId!==this.ownerId||snapshotDigest(context.decision)!==snapshotDigest(this.decision)||!Number.isSafeInteger(context.sequence)||context.sequence<1||snapshotDigest(context.snapshot)!==context.snapshotSha256)fail('STAGE_IDENTITY_MISMATCH');
  return {...context,at:rows[0].timestamp};
 }
 async lock(tx){
  await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`POST28_R05:${this.operationId}`},0))::text AS locked`;
 }
 validate(snapshot){
  if(snapshot.id!==this.assetId||snapshot.ownerId!==this.ownerId||snapshot.ownerType!=='STUDENT')fail('STAGE_OWNER_MISMATCH');
  if(snapshot.classification!==this.decision.classification||snapshot.retentionCategory!==this.decision.retentionCategory||snapshot.expiresAt!==this.decision.expiresAt||Date.parse(snapshot.expiresAt)<=Date.now())fail('STAGE_RETENTION_MISMATCH');
 }
 record(snapshot,previous,action){
  const sequence=(previous?.sequence??0)+1;
  const at=new Date(Math.max(Date.now(),new Date(previous?.at??0).getTime()+1));
  const context={operationId:this.operationId,assetId:this.assetId,ownerId:this.ownerId,manifestSha256:this.manifestSha256,decision:this.decision,sequence,previousSnapshotSha256:previous?.snapshotSha256??null,snapshotSha256:snapshotDigest(snapshot),snapshot,action};
  return AuditRecord.create(AuditId.create(randomUUID()),AuditReference.create(`POST28-R05:${this.operationId}:${sequence}`),AuditAction.create(action),AuditCategory.create('ASSET_REMEDIATION'),AuditSeverity.create('INFO'),ActorReference.create('DELEGATED_SYNTHETIC_LAB_EXECUTOR','SYSTEM'),TargetReference.create(this.assetId,'ASSET'),SourceReference.create('POST28_R05_REMEDIATION'),AuditTimestamp.create(at),ContextMetadata.create(context),undefined,CorrelationReference.create(this.operationId));
 }
 async findById(id){
  if(id.value!==this.assetId)fail('STAGE_SCOPE_MISMATCH');
  const current=await this.latest();if(!current)return null;
  this.validate(current.snapshot);const asset=restoreAsset(current.snapshot);
  this.observed.set(asset,current.sequence);return asset;
 }
 async findByReference(reference){
  const current=await this.latest();
  return current?.snapshot.reference===reference.value?this.findById(new AssetId(this.assetId)):null;
 }
 async save(asset){
  const snapshot=snapshotAsset(asset);this.validate(snapshot);
  await this.client.$transaction(async tx=>{
   await this.lock(tx);const previous=await this.latest(tx);
   if(previous?.action==='R05_REMEDIATION_COMPLETED')fail('STAGE_ALREADY_COMPLETED');
   if((previous?.sequence??null)!==(this.observed.get(asset)??null))fail('STAGE_CONCURRENT_MODIFICATION');
   const context={boundaryId:this.operationId,transactionClient:tx};
   await this.audit.saveInTransaction(this.record(snapshot,previous,'R05_PROCESSING_STAGE'),context);
  });
  // Like the canonical repository, another mutation must rehydrate first.
 }
 async complete({assetRepository,verifyWithinTransaction}){
  // The verifier MUST re-read protected historical rows and actual storage bytes.
  // It runs again on replay; a completed marker alone never authorizes delivery.
  if(typeof verifyWithinTransaction!=='function')fail('COMPLETION_VERIFIER_REQUIRED');
  return this.client.$transaction(async tx=>{
   await this.lock(tx);const previous=await this.latest(tx);
   if(!previous)fail('STAGE_REQUIRED');this.validate(previous.snapshot);
   if(previous.snapshot.state!=='ACTIVE'||previous.snapshot.activationOperation?.phase!=='COMPLETED')fail('STAGE_NOT_ACTIVE');
   const existing=await tx.assetRecord.findUnique({where:{id:this.assetId}});
   await verifyWithinTransaction(tx,previous.snapshot,existing);
   if(previous.action==='R05_REMEDIATION_COMPLETED'){
    if(!existing)fail('COMPLETED_ASSET_MISSING');
    return {replayed:true,snapshotSha256:previous.snapshotSha256};
   }
   if(existing)fail('TARGET_ASSET_ALREADY_EXISTS');
   const context={boundaryId:this.operationId,transactionClient:tx};
   // Fresh object on every attempt: repository CAS snapshots cannot survive rollback.
   await assetRepository.saveInTransaction(restoreAsset(previous.snapshot),context);
   await this.audit.saveInTransaction(this.record(previous.snapshot,previous,'R05_REMEDIATION_COMPLETED'),context);
   return {replayed:false,snapshotSha256:previous.snapshotSha256};
  },{isolationLevel:'Serializable',timeout:30000});
 }
}
