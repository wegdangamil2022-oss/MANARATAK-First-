import React from 'react';
import {act,create} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const state=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:state.request}}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:'en',dir:'ltr'})}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({hasPermission:()=>false})}));
import {AdminHealthReadinessPage} from '../../src/pages/AdminHealthReadinessPage';
let tree:ReturnType<typeof create>;
function snapshot(){const checkedAt=new Date().toISOString();return{protocolVersion:2,checkedAt,runtimeMode:'production',runtimeStatus:'UP',decisionScope:'LAST-GOOD-SNAPSHOT',releaseReady:true,releaseGate:{environmentEligible:true,configurationReady:true,runtimeReady:true,monitoringComplete:true},diagnosticAggregationDurationMs:1,api:{status:'UP',livenessDurationMs:0,uptimeSeconds:1},summary:{up:1,degraded:0,down:0,unknown:0,productionBlockers:0,productionWarnings:0,monitoredComponents:1,missingProbes:0},components:[{id:'database',status:'UP',optional:false,checkedAt,evidenceKind:'READ_ONLY_OPERATION',probeVersion:1,operational:true,details:{}}],coverage:{expected:['database'],monitored:['database'],missingProbes:[],extraProbes:[],requiredUnverified:[],expectedCount:1,matchedCount:1,extraCount:0,missingCount:0,operationalCount:1,testedCoverage:'NOT_ATTESTED'},productionReadiness:{ready:true,blockerCount:0,warningCount:0,checkedAt,findings:[]}};}
beforeEach(()=>{(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;state.request.mockReset().mockResolvedValue(snapshot());});
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());});
async function mount(){await act(async()=>{tree=create(<MemoryRouter><AdminHealthReadinessPage/></MemoryRouter>);});}
function refresh(){return tree.root.findAllByType('button').find(n=>n.children.includes('Refresh'))!;}
describe('Health last-good snapshot access boundaries',()=>{
 it('clears diagnostics on session loss',async()=>{await mount();expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-SNAPSHOT');state.request.mockRejectedValue(new Error('[401] expired'));await act(async()=>refresh().props.onClick());expect(JSON.stringify(tree.toJSON())).not.toContain('LAST-GOOD-SNAPSHOT');expect(JSON.stringify(tree.toJSON())).toContain('Unable to load diagnostics.');});
 it('preserves explicitly stale diagnostics on an ordinary availability failure',async()=>{await mount();state.request.mockRejectedValue(new Error('offline'));await act(async()=>refresh().props.onClick());expect(JSON.stringify(tree.toJSON())).toContain('LAST-GOOD-SNAPSHOT');expect(JSON.stringify(tree.toJSON())).toContain('Snapshot is stale; refresh before relying on it.');});
});
