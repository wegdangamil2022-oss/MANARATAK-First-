import {describe,it,expect,vi} from 'vitest';
import {CertificateUseCases} from '../../src/certificates/use-cases/CertificateUseCases';
import {CertificateTrustPolicy} from '../../src/certificates/services/CertificateTrustPolicy';
import {CertificateArtifactRenderUseCase} from '../../src/certificates/use-cases/CertificateArtifactRenderUseCase';
import {PrismaCertificateRepository} from '../../../infrastructure/src/certificates/PrismaCertificateRepository';
function harness(){
 const course:any={id:'c',version:3,displayName:'Original course',originType:'NATIVE_MANARATAK_COURSE',certificateAvailable:true};
 const issuer:any={id:'issuer',publicId:'issuer-public',code:'MNR',name:'MANARATAK',issuerType:'MANARATAK',status:'ACTIVE',issuerLogoAssetId:'logo',signingKeyReference:'key'};
 const version:any={id:'tv',templateId:'t',versionNumber:'1.0.0',status:'ACTIVE',issuerId:'issuer'};
 const template:any={id:'t',status:'ACTIVE',templateVersion:'1.0.0',issuerId:'issuer',currentVersionId:'tv',currentVersion:version,validityPolicy:'PERMANENT',requiresRevalidation:false};
 let stored:any;
 const repo:any={findBySourceEventId:vi.fn(async()=>null),findBySourceCompletionId:vi.fn(async()=>null),findActiveTemplateByName:async()=>template,findIssuerById:async()=>issuer,
  issue:vi.fn(async(data:any)=>{stored={id:'cert',...data};return stored;}),findByVerificationCode:async()=>stored,recordVerification:vi.fn(),findById:async()=>stored,attachArtifacts:vi.fn()};
 const versions:any={getLearningVersion:vi.fn(async()=>({course,curriculum:{}}))};
 const uc=new CertificateUseCases(repo,{findById:async()=>({...course,displayName:'New course',certificateAvailable:false})} as any,undefined,{signingKeyReference:'key',signingSecret:'unit-test-secret',publicVerificationBaseUrl:'https://example.org'},undefined,undefined,versions);
 const event:any={eventId:'event',eventType:'CourseCompleted',eventVersion:'1.0.0',sourceDomain:'COURSES',occurredAt:'2026-10-10T00:00:00Z',payload:{courseId:'c',courseVersion:3,studentReferenceId:'student',completionId:'completion',completedAt:'2026-10-01T00:00:00Z',eligibleForCertificate:true,sourcePhase:'Phase 13 - Learning Platform',certificateOwnerPhase:'Phase 14 - Enterprise Certificates Platform'}};
 return{uc,repo,versions,event,stored:()=>stored,issue:()=>uc.consumeCompletionEvent(event)};
}
describe('P14 source event and signed identity',()=>{
 it('issues from the completed course version even when current course changes or disables certificates',async()=>{const h=harness();const c=await h.issue();expect(c.achievementDisplayName).toBe('Original course');expect(h.versions.getLearningVersion).toHaveBeenCalledWith('c',3,new Date(h.event.payload.completedAt));});
 it('verifies a newly signed certificate and binds serial and verification code',async()=>{const h=harness();const c=await h.issue();const result=await h.uc.verifyByCode(c.verificationCode);expect(result.isValid).toBe(true);expect(c.metadata?.signedEnvelope).toMatchObject({serialNumber:c.serialNumber,verificationCode:c.verificationCode});});
 it('rejects repeated event IDs with changed payloads',async()=>{const h=harness();const c=await h.issue();h.repo.findBySourceEventId.mockResolvedValue(c);h.event.payload.studentReferenceId='intruder';await expect(h.issue()).rejects.toThrow('EVENT_ID_COLLISION');expect(h.repo.issue).toHaveBeenCalledTimes(1);});
 it('replays the identical event without another issuance',async()=>{const h=harness();const c=await h.issue();h.repo.findBySourceEventId.mockResolvedValue(c);expect(await h.issue()).toBe(c);expect(h.repo.issue).toHaveBeenCalledTimes(1);});
 it('rejects reused completion identity belonging to another student',async()=>{const h=harness();h.repo.findBySourceCompletionId.mockResolvedValue({studentReferenceId:'other',achievementId:'c'});await expect(h.issue()).rejects.toThrow('COMPLETION_COLLISION');});
 it('requires a course version on the authoritative completion',async()=>{const h=harness();delete h.event.payload.courseVersion;await expect(h.issue()).rejects.toThrow('PAYLOAD_INVALID');expect(h.repo.issue).not.toHaveBeenCalled();});
 it('rejects invalid completion dates before accessing issuance persistence',async()=>{const h=harness();h.event.payload.completedAt=null;await expect(h.issue()).rejects.toThrow('PAYLOAD_INVALID');expect(h.repo.findBySourceEventId).not.toHaveBeenCalled();});
 for(const field of ['serialNumber','recipientDisplayName','achievementDisplayName','templateVersion','issuerName']){
  it(`invalidates a certificate when persisted ${field} changes`,async()=>{const h=harness();const c=await h.issue();(c as any)[field]='tampered';expect((await h.uc.verifyByCode(c.verificationCode)).integrityVerified).toBe(false);});
 }
 it('preserves revocation status even when sealed expiry is in the past',async()=>{const h=harness();const c=await h.issue();c.status='REVOKED' as any;(c.metadata?.signedEnvelope as any).validity.expiresAt='2000-01-01T00:00:00Z';const result=await h.uc.verifyByCode(c.verificationCode);expect(result.status).toBe('REVOKED');expect(result.isValid).toBe(false);});
 it('treats malformed signed dates as invalid without crashing verification',async()=>{const h=harness();const c=await h.issue();(c.metadata?.signedEnvelope as any).issuedAt='invalid';expect((await h.uc.verifyByCode(c.verificationCode)).isValid).toBe(false);});
});
describe('P14 signing and URL configuration',()=>{
 it('uses safe signature comparison and rejects malformed signatures',()=>{const policy=new CertificateTrustPolicy({signingSecret:'test'});const signed=policy.signHash('hash','key');expect(policy.verifyHash('hash',signed,'key')).toBe(true);expect(policy.verifyHash('hash','short','key')).toBe(false);expect(policy.verifyHash('changed',signed,'key')).toBe(false);});
 it('rejects insecure production verification origins',()=>{const policy=new CertificateTrustPolicy({productionLike:true,publicVerificationBaseUrl:'http://example.org'});expect(()=>policy.createPublicVerificationUrl('code')).toThrow('BASE_URL_INVALID');});
 it('rejects credentials in verification origins',()=>{const policy=new CertificateTrustPolicy({publicVerificationBaseUrl:'https://user:password@example.org'});expect(()=>policy.createPublicVerificationUrl('code')).toThrow('BASE_URL_INVALID');});
});
describe('P14 persistence locks and immutable artifacts',()=>{
 it('locks an already archived certificate and returns it without another audit/event',async()=>{const tx:any={$queryRaw:vi.fn(async()=>[]),certificate:{findUnique:async()=>({id:'c',status:'ARCHIVED'}),update:vi.fn()}};const repo=new PrismaCertificateRepository({$transaction:async(fn:any)=>fn(tx)} as any);await repo.archive('c','reviewer','Archive reviewed');expect(tx.$queryRaw).toHaveBeenCalledTimes(1);expect(tx.certificate.update).not.toHaveBeenCalled();});
 it('blocks artifact replacement after acquiring the certificate lock',async()=>{const tx:any={$queryRaw:vi.fn(async()=>[]),certificate:{findUnique:async()=>({id:'c',status:'ACTIVE',certificatePdfAssetId:'old'}),update:vi.fn()}};const repo=new PrismaCertificateRepository({$transaction:async(fn:any)=>fn(tx)} as any);await expect(repo.attachArtifacts({certificateId:'c',actorId:'renderer',certificatePdfAssetId:'new'})).rejects.toThrow('ARTIFACT_IMMUTABLE');expect(tx.certificate.update).not.toHaveBeenCalled();});
 it('locks both event/completion identities before detecting an inbox collision',async()=>{const tx:any={$queryRaw:vi.fn(async()=>[]),certificateIssuanceInbox:{findUnique:async()=>({payloadHash:'different'})}};const repo=new PrismaCertificateRepository({$transaction:async(fn:any)=>fn(tx)} as any);await expect(repo.issue({sourceEventId:'e',sourceCompletionId:'completion',sourceEventPayloadHash:'hash'} as any)).rejects.toThrow('EVENT_ID_COLLISION');expect(tx.$queryRaw).toHaveBeenCalledTimes(2);});
});
describe('P14 rendering validation',()=>{
 function renderHarness(){const certificate:any={id:'c',status:'ACTIVE',templateId:'t',templateVersionId:'tv',templateVersion:'1.0.0'};const repo:any={findById:async()=>certificate,findTemplateVersionById:async()=>({id:'tv',templateId:'t',versionNumber:'1.0.0'}),attachArtifacts:vi.fn()};const result:any={templateVersionId:'tv',templateVersionNumber:'1.0.0',renderFingerprint:'hash',rendererVersion:'1',artifacts:[{kind:'PDF',mimeType:'application/pdf',bytes:new Uint8Array([1])},{kind:'PREVIEW',mimeType:'image/png',bytes:new Uint8Array([1])},{kind:'QR',mimeType:'image/png',bytes:new Uint8Array([1])}]};const store:any={store:vi.fn(async()=> 'asset')};return{certificate,result,store,uc:new CertificateArtifactRenderUseCase(repo,{render:async()=>result},store,{assertRenderable:vi.fn()})};}
 it('rejects renderer template-version drift before storing artifacts',async()=>{const h=renderHarness();h.result.templateVersionNumber='2.0.0';await expect(h.uc.renderCertificate('c')).rejects.toThrow('RENDER_IDENTITY_INVALID');expect(h.store.store).not.toHaveBeenCalled();});
 it('rejects duplicate artifact kinds',async()=>{const h=renderHarness();h.result.artifacts[2].kind='PDF';await expect(h.uc.renderCertificate('c')).rejects.toThrow('ARTIFACT_SET_INVALID');expect(h.store.store).not.toHaveBeenCalled();});
 it('rejects a PDF returned with an executable MIME type',async()=>{const h=renderHarness();h.result.artifacts[0].mimeType='text/html';await expect(h.uc.renderCertificate('c')).rejects.toThrow('ARTIFACT_MIME_INVALID');});
 it('does not create fresh documents for revoked certificates',async()=>{const h=renderHarness();h.certificate.status='REVOKED';await expect(h.uc.renderCertificate('c')).rejects.toThrow('ARTIFACT_STATE_INVALID');expect(h.store.store).not.toHaveBeenCalled();});
});
