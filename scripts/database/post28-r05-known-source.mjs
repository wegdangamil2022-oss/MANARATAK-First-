import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {digest} from './post28-migration-inventory.mjs';

// A new synthetic incident, never provenance for the original rejected fixture.
export function syntheticHistoricalPdf(){
 const text='NEW SYNTHETIC POST28 R05 CASE - NOT THE ORIGINAL MISSING FILE';
 const stream=`BT /F1 10 Tf 20 100 Td (${text}) Tj ET\n`;
 const objects=['<< /Type /Catalog /Pages 2 0 R >>','<< /Type /Pages /Kids [3 0 R] /Count 1 >>','<< /Type /Page /Parent 2 0 R /MediaBox [0 0 600 200] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>','<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}endstream`];
 let pdf='%PDF-1.4\n';const offsets=[0];
 objects.forEach((value,index)=>{offsets.push(Buffer.byteLength(pdf));pdf+=`${index+1} 0 obj\n${value}\nendobj\n`;});
 const xref=Buffer.byteLength(pdf);pdf+='xref\n0 6\n0000000000 65535 f \n'+offsets.slice(1).map(n=>String(n).padStart(10,'0')+' 00000 n \n').join('');
 pdf+=`trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;return Buffer.from(pdf);
}
export function prepareKnownSourcePacket(directory,{checkoutRoot,sourceSha,runId,assetId,bindingId,ownerId,assetOwner,documentOwner}){
 if(!/^[0-9a-f]{40}$/.test(sourceSha)||![runId,assetId,bindingId,ownerId].every(x=>/^[0-9a-f-]{36}$/.test(x))||!assetOwner||!documentOwner)throw new Error('POST28_KNOWN_SOURCE_IDENTITY_REQUIRED');
 const root=fs.realpathSync(checkoutRoot),parent=fs.realpathSync(path.dirname(directory));
 if(parent===root||parent.startsWith(root+path.sep))throw new Error('POST28_SOURCE_PACKET_OUTSIDE_CHECKOUT_REQUIRED');
 fs.mkdirSync(directory,{mode:0o700});
 if(process.platform==='win32'){
  const account=execFileSync('whoami',[],{encoding:'utf8',windowsHide:true}).trim();
  execFileSync('icacls',[directory,'/inheritance:r','/grant:r',account+':(OI)(CI)F'],{stdio:'pipe',windowsHide:true});
 }
 const bytes=syntheticHistoricalPdf(),filename='new-synthetic-historical-document.pdf';
 fs.writeFileSync(path.join(directory,filename),bytes,{mode:0o600,flag:'wx'});
 const packet={version:1,kind:'POST28_NEW_SYNTHETIC_KNOWN_SOURCE_CASE',sourceSha,runId,source:{filename,mimeType:'application/pdf',byteSize:bytes.length,sha256:digest(bytes),createdAt:new Date().toISOString(),createdForThisNewCase:true},bindingId,assetId,owner:{ownerId,ownerType:'STUDENT'},requiredReviews:{assetOwner,documentOwner,status:'AWAITING_TECHNICAL_OWNER_REVIEW',approvals:[]},remediationContract:{ingest:'IngestAssetUseCase',lifecycle:'ProcessAssetLifecycleUseCase',directAssetInsertForbidden:true,consentOrBindingReassignmentForbidden:true,realMalwareAndSanitizationEvidenceRequired:true,retentionDecision:'PENDING_TECHNICAL_OWNER_REVIEW'},claims:{originalMissingFileRecovered:false,priorRejectedEvidenceModified:false,assetCreated:false,activeCleanEvidence:false,ownerApproval:false,R05Accepted:false}};
 fs.writeFileSync(path.join(directory,'source-packet.json'),JSON.stringify(packet,null,2)+'\n',{mode:0o600,flag:'wx'});
 return packet;
}
export function manifestWithKnownSource(original,packet){
 if(packet.kind!=='POST28_NEW_SYNTHETIC_KNOWN_SOURCE_CASE'||packet.assetId!==original.orphan.missingAssetId||packet.bindingId!==original.orphan.bindingId)throw new Error('POST28_SOURCE_PACKET_BINDING_MISMATCH');
 const row=original.rows.find(r=>r.id===packet.bindingId&&r.model==='StudentApplicationDocumentBinding');
 const tracker=original.rows.find(r=>r.id===row?.data.trackerId&&r.model==='StudentApplicationTracker');
 if(!row||tracker?.data.studentReferenceId!==packet.owner.ownerId)throw new Error('POST28_SOURCE_PACKET_OWNER_MISMATCH');
 return {...original,version:2,kind:'POST28_R05_NEW_KNOWN_SOURCE_HISTORICAL_MANIFEST',sourcePacket:packet,orphan:{...original.orphan,disposition:'BLOCK_UPGRADE_UNTIL_OWNER_REVIEW_AND_REAL_LIFECYCLE',sourceEvidence:{synthetic:true,creationStage:108,action:'NEW_CASE_SOURCE_RETAINED_ASSET_OMITTED_FROM_LOAD_PACKAGE',sourceSha256:packet.source.sha256,sourcePacketSha256:digest(JSON.stringify(packet)),bindingRetained:true}},claims:{...original.claims,originalRejectedScenarioModified:false,knownSyntheticSourcePresent:true,ownerReviewApproved:false,assetRemediationExecuted:false}};
}
