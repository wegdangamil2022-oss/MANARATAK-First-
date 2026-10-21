import {describe,expect,it,vi} from 'vitest';
import {readCertificateArtifact} from '../../src/certificates/services/CertificateArtifactDelivery';
const content={bytes:new Uint8Array([37,80,68,70,45]),mimeType:'application/pdf',checksumSha256:'a'.repeat(64)};
describe('authenticated certificate bytes',()=>{
 it('returns verified bytes after current authorization on both sides of storage IO',async()=>{const authorize=vi.fn(async()=> 'asset'),read=vi.fn(async()=>content);expect(await readCertificateArtifact('pdf',authorize,{readAuthenticatedDelivery:read})).toEqual(content);expect(authorize).toHaveBeenCalledTimes(2);});
 it('rejects a revoked certificate before storage access',async()=>{const read=vi.fn(async()=>content);await expect(readCertificateArtifact('pdf',async()=>{throw Error('CERTIFICATE_ARTIFACT_STATE_INVALID');},{readAuthenticatedDelivery:read})).rejects.toThrow('STATE_INVALID');expect(read).not.toHaveBeenCalled();});
 it('rejects bytes if the certificate is revoked during storage IO',async()=>{let revoked=false;const authorize=async()=>{if(revoked)throw Error('CERTIFICATE_ARTIFACT_STATE_INVALID');return'asset';};await expect(readCertificateArtifact('pdf',authorize,{readAuthenticatedDelivery:async()=>{revoked=true;return content;}})).rejects.toThrow('STATE_INVALID');});
 it('rejects an artifact replacement during storage IO',async()=>{let id='old';await expect(readCertificateArtifact('pdf',async()=>id,{readAuthenticatedDelivery:async()=>{id='new';return content;}})).rejects.toThrow('CERTIFICATE_ARTIFACT_CHANGED');});
 it('rejects a provider MIME that does not match the requested artifact kind',async()=>{await expect(readCertificateArtifact('pdf',async()=> 'asset',{readAuthenticatedDelivery:async()=>({...content,mimeType:'image/svg+xml'})})).rejects.toThrow('MIME_INVALID');});
 it('fails closed when authenticated storage reads are unavailable',async()=>{await expect(readCertificateArtifact('pdf',async()=> 'asset',undefined)).rejects.toThrow('NOT_CONFIGURED');});
});
