import {describe,expect,it,vi} from 'vitest';
import {CanonicalMajorReferenceService} from '@manaratak/application';
import {PrismaMajorImportReviewGateway} from '../../src/majors/PrismaMajorImportReviewGateway';

const payload={canonicalMajorName:'Computer Science',degreeLevel:'BACHELOR',degreeLevelId:'11111111-1111-4111-8111-111111111111'};
function fixture(code='BACHELOR') {
 const tx:any={$queryRaw:vi.fn(async()=>[]),degreeLevel:{findUnique:vi.fn(async()=>({id:payload.degreeLevelId,canonicalCode:code,status:'ACTIVE'}))},major:{findUnique:vi.fn(async()=>null)}};
 const outer:any={};
 const refs=new CanonicalMajorReferenceService({} as any,{getDegreeLevelById:vi.fn(async()=>({id:payload.degreeLevelId,canonicalCode:code,status:'ACTIVE'}))} as any);
 const gateway=new PrismaMajorImportReviewGateway(outer,refs).withTransaction({boundaryId:'owner-tx',transactionClient:tx} as any);
 return {gateway,tx,refs};
}
describe('major import canonical degree inside the owner transaction',()=>{
 it('rejects an active MASTER id paired with BACHELOR before inspecting a target',async()=>{
  const f=fixture('MASTER');await expect(f.gateway.inspect(payload)).rejects.toThrow('NEW_MAJOR_DEGREE_REFERENCE_MISMATCH');
  expect(f.tx.major.findUnique).not.toHaveBeenCalled();
 });
 it('uses the transaction client for canonical reference reads',async()=>{
  const f=fixture();vi.spyOn(f.refs,'assertPayloadReferencesActive').mockRejectedValue(Error('OUTER_CLIENT_MUST_NOT_BE_USED'));
  await expect(f.gateway.inspect(payload)).resolves.toEqual({targetId:null,targetRevision:null});
  expect(f.tx.degreeLevel.findUnique).toHaveBeenCalled();
  expect(f.refs.assertPayloadReferencesActive).not.toHaveBeenCalled();
 });
});
