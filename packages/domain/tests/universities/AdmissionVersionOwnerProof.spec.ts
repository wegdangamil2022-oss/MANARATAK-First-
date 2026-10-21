import {describe,it,expect} from 'vitest';
import {isPublicAdmissionRequirement} from '../../src/public-boundaries/PublicOwnerPolicy';
describe('implicit admission published version ownership',()=>{
 it('rejects a published pointer belonging to a different test',()=>{
  expect(isPublicAdmissionRequirement({status:'ACTIVE',internationalTestId:'test-a',internationalTest:{status:'PUBLISHED',isPubliclyVisible:true,currentPublishedVersion:{id:'version-b',testId:'test-b',status:'PUBLISHED'}}})).toBe(false);
 });
});
