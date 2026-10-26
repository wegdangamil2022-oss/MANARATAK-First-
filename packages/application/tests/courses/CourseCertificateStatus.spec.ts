import {describe,it,expect,vi} from 'vitest';
import {CertificateReadModelService} from '../../src/certificates/use-cases/CertificateReadModelService';
const row={id:'cert',studentReferenceId:'student',achievementType:'COURSE',achievementId:'course',status:'ACTIVE',certificatePdfAssetId:'pdf',expiresAt:null};
const service=(certificate:unknown)=>{const repository={findBySourceCompletionId:vi.fn().mockResolvedValue(certificate)};return{repository,read:new CertificateReadModelService(repository as never,{} as never)};};
describe('course completion certificate status is owned by Certificates',()=>{
 it('does not call a missing certificate issued or pending',async()=>{const {read}=service(null);expect(await read.courseCompletionStatus('student','course','completion')).toEqual({status:'NOT_ISSUED',certificateId:null,pdfAvailable:false});});
 it('reads by persisted completion identity and exposes only safe owner state',async()=>{const {read,repository}=service(row);expect(await read.courseCompletionStatus('student','course','completion')).toEqual({status:'ACTIVE',certificateId:'cert',pdfAvailable:true});expect(repository.findBySourceCompletionId).toHaveBeenCalledWith('completion');});
 it('reports issued but missing artifacts honestly',async()=>{const {read}=service({...row,certificatePdfAssetId:null});expect(await read.courseCompletionStatus('student','course','completion')).toMatchObject({status:'ACTIVE',pdfAvailable:false});});
 it('does not expose another student certificate',async()=>{const {read}=service(row);await expect(read.courseCompletionStatus('foreign','course','completion')).rejects.toThrow('OWNER_MISMATCH');});
 it('does not attach a different achievement certificate',async()=>{const {read}=service({...row,achievementId:'other'});await expect(read.courseCompletionStatus('student','course','completion')).rejects.toThrow('OWNER_MISMATCH');});
 it('reflects expiration and revocation without an active download',async()=>{expect(await service({...row,expiresAt:new Date(0)}).read.courseCompletionStatus('student','course','completion')).toMatchObject({status:'EXPIRED',pdfAvailable:false});expect(await service({...row,status:'REVOKED'}).read.courseCompletionStatus('student','course','completion')).toMatchObject({status:'REVOKED',pdfAvailable:false});});
});
