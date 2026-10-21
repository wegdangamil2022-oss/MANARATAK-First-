import {describe,expect,it,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {AssetRecord,AssetId,AssetReference,AssetOwnerReference,AssetStorageLocator,AssetStorageZone,AssetMetadata,AssetChecksum,AssetSanitizationMetadata,AssetRetentionMetadata,AssetRetentionCategory,AssetSecurityClassification,AssetLifecycleState} from '@manaratak/domain';
import {ProcessAssetLifecycleUseCase} from '../../src/asset-platform/use-cases/ProcessAssetLifecycleUseCase';
function setup(consumer:string|undefined){
 const bytes=Buffer.from('%PDF-1.4\nindustrial\n%%EOF'),hash=createHash('sha256').update(bytes).digest('hex'),quarantine='quarantine://fixture/document.pdf',stamp=new Date();
 const asset=new AssetRecord({id:new AssetId('certificate-artifact'),reference:new AssetReference('certificate-artifact-ref'),owner:new AssetOwnerReference('certificate','Certificate'),locator:new AssetStorageLocator(AssetStorageZone.CLEAN,'fixture','document.pdf'),metadata:new AssetMetadata('document.pdf','application/pdf','pdf',bytes.length),retention:new AssetRetentionMetadata(AssetRetentionCategory.TEMPORARY,new Date(Date.now()+600000)),classification:AssetSecurityClassification.INTERNAL,state:AssetLifecycleState.ACTIVE,checksum:new AssetChecksum('sha256',hash),sanitization:new AssetSanitizationMetadata(true,stamp),malwareScan:{status:'PASSED',locator:quarantine,scannedAt:stamp.toISOString()},uploadVerification:{locator:quarantine,byteSize:bytes.length,verifiedMimeType:'application/pdf',checksumSha256:hash,verifiedAt:stamp.toISOString(),signatureVerified:true}});
 const storage={generateDeliveryGrant:vi.fn(async()=>({url:'https://provider.example.invalid/capability',headers:{},expiresAt:new Date(Date.now()+300000)}))};
 const usage={findUsages:vi.fn(async()=>consumer?[{consumer,field:'artifact'}]:[])};
 return{storage,usage,service:new ProcessAssetLifecycleUseCase({findById:async()=>asset} as never,storage as never,usage as never)};
}
describe('private certificate provider capabilities',()=>{
 for(const consumer of ['CERTIFICATE_PDF','CERTIFICATE_PREVIEW','STUDENT_CERTIFICATE_PDF','STUDENT_CERTIFICATE_PREVIEW']){
  it('refuses provider URL for '+consumer+' before contacting storage',async()=>{const f=setup(consumer);await expect(f.service.requestDeliveryGrant({assetId:'certificate-artifact'})).rejects.toThrow('CERTIFICATE_AUTHENTICATED_DELIVERY_REQUIRED');expect(f.storage.generateDeliveryGrant).not.toHaveBeenCalled();});
 }
 it('preserves non-artifact certificate evidence grants',async()=>{const f=setup('CERTIFICATE_AUTHORITY_EVIDENCE');expect((await f.service.requestDeliveryGrant({assetId:'certificate-artifact'})).url).toMatch(/^https:/);});
 it('fails closed if certificate usage lookup is unavailable',async()=>{const f=setup(undefined);f.usage.findUsages.mockRejectedValue(Error('LOOKUP_UNAVAILABLE'));await expect(f.service.requestDeliveryGrant({assetId:'certificate-artifact'})).rejects.toThrow('LOOKUP_UNAVAILABLE');expect(f.storage.generateDeliveryGrant).not.toHaveBeenCalled();});
});
