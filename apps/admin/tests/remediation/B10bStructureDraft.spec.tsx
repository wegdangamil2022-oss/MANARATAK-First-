import {describe,it,expect} from 'vitest';
import {hydrateUniversityStructureRows} from '../../src/components/UniversitySectionsEditor';
describe('B10b structural editing references',()=>{
 it('hydrates saved owner IDs without changing canonical IDs or metadata',()=>{const source={id:'unit',campusId:'campus',parentOrganizationUnitId:'parent',metadata:{source:'import'}};expect(hydrateUniversityStructureRows('organizationUnits',[source])[0]).toEqual({...source,campusSourceReferenceId:'campus',parentSourceReferenceId:'parent'});expect(source).not.toHaveProperty('campusSourceReferenceId');});
 it('retains explicit references for newly authored rows and standalone roots',()=>{expect(hydrateUniversityStructureRows('organizationUnits',[{sourceReferenceId:'new',campusSourceReferenceId:'new-campus'},{id:'root'}])).toEqual([{sourceReferenceId:'new',campusSourceReferenceId:'new-campus',parentSourceReferenceId:null},{id:'root',campusSourceReferenceId:null,parentSourceReferenceId:null}]);});
});
