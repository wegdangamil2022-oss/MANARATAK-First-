import {describe,it,expect,vi} from 'vitest';
vi.mock('@manaratak/shared',async original=>({...await original<any>(),assertTranslationContentAuthoringEnabled:vi.fn()}));
import {PrismaTranslationImportGateway} from '../../src/translation-import/PrismaTranslationImportGateway';
import {governanceApprovalDigest} from '../../../application/src/authorization/use-cases/GovernanceApprovalUseCases';
function fixture(){
 const major:any={id:'major',publicId:'MJR-0001',displayName:'Source',updatedAt:new Date('2026-10-15')};
 const profile:any={id:'profile',majorId:'major',level:'FELLOWSHIP',status:'READY_TO_PUBLISH',currentPublishedVersionId:'old-live'};
 const version:any={id:'version',majorId:'major',profileId:'profile',profile,status:'NEEDS_REVIEW',sourceHash:'a'.repeat(64),updatedAt:new Date('2026-10-15'),metadata:{}};
 const receipts=new Map<string,unknown>();let decision:any;
 const tx:any={$executeRaw:vi.fn(async()=>1),$queryRaw:vi.fn(async()=>[]),major:{findUnique:async()=>major,update:vi.fn()},majorLevelProfile:{findUnique:async()=>profile,update:vi.fn(async({data}:any)=>Object.assign(profile,data))},majorVersion:{findUnique:async()=>version,findUniqueOrThrow:async()=>version,findFirst:async()=>version,update:vi.fn(async({data}:any)=>Object.assign(version,data))},majorContentSection:{findMany:async()=>[]},policyRecord:{findUnique:async()=>({ruleType:'GOVERNANCE_APPROVAL',ruleConfiguration:JSON.stringify(decision)}),update:vi.fn()},ownerTranslationTransferReceipt:{findUnique:async({where}:any)=>receipts.get(where.id)??null,create:vi.fn(async({data}:any)=>{receipts.set(data.id,data);})},auditRecord:{create:vi.fn()},transactionalOutboxRecord:{create:vi.fn()}};
 const db:any={...tx,$transaction:async(run:any)=>run(tx)};const gateway=new PrismaTranslationImportGateway(db,{evaluatePermission:async()=>({isGranted:true})} as any);
 const locator:any={entityKind:'MAJOR',entityPublicId:'MJR-0001',locale:'en',fieldKind:'DISPLAY_NAME',fieldKey:'displayName',sectionOwner:{profileId:'profile',versionId:'version'}};
 const approve=(scope:string,payload:any,actor='maker')=>{decision={scope,requestedBy:actor,approverId:'checker',digest:governanceApprovalDigest(scope as any,payload),expiresAt:new Date(Date.now()+60000).toISOString(),approvedAt:new Date().toISOString(),usedAt:null};};
 return {tx,gateway,locator,version,approve};
}
describe('B11 receipt to native major working version',()=>{
 it('replays a scoped import once, then hands over without modifying root names or claiming public publication',async()=>{
  const h=fixture();const target=await h.gateway.resolveExact(h.locator);const candidate:any={target,translatedValue:'Reviewed English name',expectedCurrentValue:null,reviewStatus:'APPROVED',evidence:{handoffId:'handoff',execution:{dryRun:false},artifact:{artifactId:'artifact'},provenance:{}}};
  const transferApproval:any={decision:'APPLY',actorId:'maker',reviewedBy:'checker',approvalId:'transfer'};
  h.approve('TRANSLATION_TRANSFER',{target,translatedValue:candidate.translatedValue,handoffId:'handoff'});await h.gateway.applyApproved(candidate,transferApproval);await h.gateway.applyApproved(candidate,transferApproval);
  expect(h.tx.ownerTranslationTransferReceipt.create).toHaveBeenCalledOnce();expect(h.tx.$executeRaw).toHaveBeenCalledOnce();expect(h.tx.$executeRaw.mock.calls[0][0].join('')).toContain('GREATEST');expect(h.tx.majorVersion.update).toHaveBeenCalledOnce();expect(h.tx.major.update).not.toHaveBeenCalled();
  const publicationTarget=await h.gateway.resolveExact(h.locator);h.approve('TRANSLATION_PUBLICATION',{target:publicationTarget},'publisher');
  const result=await h.gateway.publishApproved(publicationTarget!,{decision:'APPLY',actorId:'publisher',reviewedBy:'checker',approvalId:'publication'});
  expect(result).toMatchObject({approved:true,published:false,publicEligible:false,publicationStage:'OWNER_REVIEW_REQUIRED'});
  expect(h.version.metadata.translationNames.en.value).toBe('Reviewed English name');expect(h.version.metadata.reviewApproval).toBeNull();expect(h.version.status).toBe('NEEDS_REVIEW');expect(h.tx.major.update).not.toHaveBeenCalled();expect(h.tx.majorLevelProfile.update).toHaveBeenCalledWith({where:{id:'profile'},data:{status:'READY_TO_REVIEW',completenessStatus:'NEEDS_REVIEW'}});expect(h.version.profile.currentPublishedVersionId).toBe('old-live');expect(h.tx.transactionalOutboxRecord.create.mock.calls.at(-1)[0].data.eventType).toBe('OwnerTranslationReadyForReview');
 });
 it('refuses an unscoped name lookup instead of mutating root translation fields',async()=>{const h=fixture();delete h.locator.sectionOwner;await expect(h.gateway.resolveExact(h.locator)).rejects.toThrow('SECTION_OWNER_REQUIRED');expect(h.tx.major.update).not.toHaveBeenCalled();});
 it('blocks historical version transfer before a candidate write',async()=>{const h=fixture();h.version.status='PUBLISHED';const target=await h.gateway.resolveExact(h.locator);const candidate:any={target,translatedValue:'New name',expectedCurrentValue:null,reviewStatus:'APPROVED',evidence:{handoffId:'h',execution:{dryRun:false},artifact:{},provenance:{}}};h.approve('TRANSLATION_TRANSFER',{target,translatedValue:'New name',handoffId:'h'});await expect(h.gateway.applyApproved(candidate,{decision:'APPLY',actorId:'maker',reviewedBy:'checker',approvalId:'approval'})).rejects.toThrow('WORKING_VERSION_REQUIRED');expect(h.tx.majorVersion.update).not.toHaveBeenCalled();expect(h.tx.ownerTranslationTransferReceipt.create).not.toHaveBeenCalled();});
});
