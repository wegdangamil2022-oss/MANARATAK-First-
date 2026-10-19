import {createHash} from 'node:crypto';
const digest=value=>createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>{throw Error('POST28_R05_'+code);};
// Trust validation is deliberately separate from owner authorization and FK existence.
// Passing this pure check does not authorize remediation or migration execution.
export function requireKnownSourceTrust({asset,packet,decision,providerProof,historicalBefore,historicalAfter,at=new Date()}){
 if(packet?.kind!=='POST28_NEW_SYNTHETIC_KNOWN_SOURCE_CASE'||packet.claims?.originalMissingFileRecovered!==false||!packet.source?.createdForThisNewCase||!/^[a-f0-9]{64}$/.test(packet.source.sha256??'')||!Number.isSafeInteger(packet.source.byteSize)||packet.source.byteSize<=0||packet.source.byteSize>10*1024*1024)fail('NEW_CASE_PROVENANCE_REQUIRED');
 if(!asset||asset.id!==packet.assetId||asset.ownerId!==packet.owner?.ownerId||asset.ownerType!=='STUDENT')fail('ASSET_OWNER_IDENTITY_MISMATCH');
 if(asset.lifecycleState!=='ACTIVE'||!asset.cleanStorageLocator?.startsWith('clean://')||asset.quarantineStorageLocator!=null)fail('ACTIVE_CLEAN_REQUIRED');
 if(decision?.classification!=='CONFIDENTIAL'||decision.retentionCategory!=='TEMPORARY'||asset.securityClassification!==decision.classification||asset.retentionCategory!==decision.retentionCategory)fail('CLASSIFICATION_RETENTION_REQUIRED');
 const anchor=Date.parse(decision.sourceCreatedAt),expiry=Date.parse(decision.expiresAt),now=at.getTime();
 if(!Number.isFinite(anchor)||!Number.isFinite(expiry)||!Number.isFinite(now)||anchor>now||expiry<=anchor||expiry<=now||expiry>anchor+180*86400000||new Date(asset.retentionExpiresAt).getTime()!==expiry)fail('FIXED_EXPIRY_REQUIRED');
 if((asset.legalHoldUntil??null)!==(decision.legalHoldUntil??null))fail('LEGAL_HOLD_DECISION_MISMATCH');
 const evidence=asset.malwareScanStatus,verified=evidence?.uploadVerification;
 if(!Number.isSafeInteger(verified?.byteSize)||verified.byteSize<=0||verified.byteSize>10*1024*1024)fail('VERIFIED_PDF_SIZE_REQUIRED');
 if(evidence?.status!=='PASSED'||verified?.signatureVerified!==true||verified.locator!==evidence.locator||!/^quarantine:\/\//.test(verified.locator??'')||asset.checksumAlgorithm?.toLowerCase()!=='sha256'||!/^[a-f0-9]{64}$/.test(asset.checksumHash??'')||asset.checksumHash!==verified.checksumSha256||verified.verifiedMimeType!=='application/pdf'||asset.metadata?.mimeType!=='application/pdf'||asset.metadata?.byteSize!==verified.byteSize||verified.byteSize<=0||!Number.isFinite(Date.parse(verified.verifiedAt))||!Number.isFinite(Date.parse(evidence.scannedAt))||!Number.isFinite(Date.parse(asset.sanitizationMetadata?.sanitizedAt)))fail('DIGEST_BOUND_TRUST_EVIDENCE_REQUIRED');
 const activation=evidence.activationOperation;
 if(activation?.phase!=='COMPLETED'||activation.version!==1||activation.sourceLocator!==verified.locator||activation.expectedSha256!==asset.checksumHash||!Number.isFinite(Date.parse(activation.preparedAt))||!Number.isFinite(Date.parse(activation.completedAt)))fail('ACTIVATION_NOT_COMPLETED');
 if(providerProof?.sourceSha256!==packet.source.sha256||providerProof.sourceBytes!==packet.source.byteSize||providerProof.sanitizedSha256!==asset.checksumHash||providerProof.originalObjectsCopied!==0||providerProof.pixelsMatched!==true||providerProof.preScan?.clean!==true||providerProof.postScan?.clean!==true||providerProof.preScan.sha256!==packet.source.sha256||providerProof.postScan.sha256!==asset.checksumHash||providerProof.preScan.digestUnchanged!==true||providerProof.postScan.digestUnchanged!==true||providerProof.storageReadbackSha256!==asset.checksumHash)fail('REAL_PROVIDER_PROOF_REQUIRED');
 if(!historicalBefore||!historicalAfter||digest(historicalBefore)!==digest(historicalAfter))fail('HISTORICAL_ROWS_CHANGED');
 return {trustChecksPassed:true,ownerAuthorizationVerified:false,upgradeAuthorized:false,sourceSha256:packet.source.sha256,sanitizedSha256:asset.checksumHash,historicalSnapshotSha256:digest(historicalBefore)};
}
