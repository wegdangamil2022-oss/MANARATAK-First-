import { describe,it,expect } from 'vitest';
import { assertReferenceRetirementPolicy } from '../../src/reference-data/governance/ReferenceRetirementPolicy';
import { ReferenceLifecycleState as State } from '../../src/reference-data/governance/ReferenceGovernance';
const impact:any = {knownTotal:0,coverage:'PARTIAL',terminalSafe:false,unobservedConsumers:'unknown'};
describe('non-destructive owner retirement policy',()=>{
 it('permits deprecation while preserving existing reference relationships',()=>{expect(()=>assertReferenceRetirementPolicy(State.DEPRECATED,{...impact,knownTotal:12})).not.toThrow();});
 it('requires explicit historical-reference acknowledgement for every terminal state',()=>{for(const state of [State.ARCHIVED,State.MERGED,State.SUPERSEDED]) expect(()=>assertReferenceRetirementPolicy(state,impact)).toThrow('ACKNOWLEDGEMENT_REQUIRED');});
 it('blocks archive when observed FK or scalar-code consumers exist',()=>{expect(()=>assertReferenceRetirementPolicy(State.ARCHIVED,{...impact,knownTotal:1},true)).toThrow('ARCHIVE_HAS_DEPENDENCIES');});
 it('preserves existing references through explicit replacement without automatic reassignment',()=>{expect(()=>assertReferenceRetirementPolicy(State.MERGED,{...impact,knownTotal:3},true)).not.toThrow();});
 it('fails closed on unavailable counts',()=>{expect(()=>assertReferenceRetirementPolicy(State.ARCHIVED,{...impact,knownTotal:NaN},true)).toThrow('IMPACT_UNAVAILABLE');});
});
