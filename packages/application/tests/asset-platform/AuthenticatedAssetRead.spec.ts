import {describe,it,expect,vi} from 'vitest';
import {createHash} from 'node:crypto';
import {ProcessAssetLifecycleUseCase} from '../../src/asset-platform/use-cases/ProcessAssetLifecycleUseCase';

const bytes=new Uint8Array([37,80,68,70,45]);
function fixture(options:{tamper?:boolean;revoke?:boolean}={}){
 const hash=createHash('sha256').update(bytes).digest('hex');
 const record={assertCanDeliver:vi.fn(),classification:'CONFIDENTIAL',locator:{value:'clean://fixture/file'},metadata:{byteSize:bytes.length,mimeType:'application/pdf'},checksum:{algorithm:'SHA256',hash}};
 let reads=0;
 const repository={findById:vi.fn(async()=>{reads++;if(options.revoke&&reads>1)return {...record,assertCanDeliver:()=>{throw Error('REVOKED');}};return record;})};
 const storage={read:vi.fn(async()=>options.tamper?new Uint8Array([1,2,3,4,5]):bytes)};
 const service=new ProcessAssetLifecycleUseCase(repository as never,storage as never,{} as never);
 return {service,storage};
}
describe('bounded authenticated asset reads',()=>{
 it('returns only size and SHA256 verified bytes after a final lifecycle check',async()=>{const f=fixture();expect(Array.from((await f.service.readAuthenticatedDelivery('asset')).bytes)).toEqual(Array.from(bytes));});
 it('rejects substituted bytes before returning them',async()=>{const f=fixture({tamper:true});await expect(f.service.readAuthenticatedDelivery('asset')).rejects.toThrow('ASSET_DELIVERY_CHECKSUM_MISMATCH');});
 it('rejects lifecycle withdrawal during storage IO',async()=>{const f=fixture({revoke:true});await expect(f.service.readAuthenticatedDelivery('asset')).rejects.toThrow('REVOKED');});
 it('fails closed without a bounded storage read capability',async()=>{const service=new ProcessAssetLifecycleUseCase({} as never,{} as never,{} as never);expect(()=>service.assertAuthenticatedDeliveryConfigured()).toThrow('ASSET_AUTHENTICATED_READ_NOT_CONFIGURED');});
});
