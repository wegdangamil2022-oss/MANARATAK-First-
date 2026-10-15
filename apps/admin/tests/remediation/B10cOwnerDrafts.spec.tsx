import React from 'react';
import {act,create} from 'react-test-renderer';
import {MemoryRouter} from 'react-router-dom';
import {describe,it,expect,vi,afterEach} from 'vitest';
const mocks=vi.hoisted(()=>({can:true,request:vi.fn()}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({hasPermission:()=>mocks.can})}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:mocks.request}}));
import {OwnerDraftCreateForm} from '../../src/components/OwnerDraftCreateForm';
let tree:ReturnType<typeof create>;
(globalThis as any).IS_REACT_ACT_ENVIRONMENT=true;
afterEach(async()=>{if(tree)await act(async()=>tree.unmount());mocks.can=true;mocks.request.mockReset();});
describe('B10c admin creation UI',()=>{
 it('hides creation without the owner permission',async()=>{mocks.can=false;await act(async()=>{tree=create(<MemoryRouter><OwnerDraftCreateForm owner="universities"/></MemoryRouter>);});expect(tree.toJSON()).toBeNull();});
 it('submits a university draft to its owner and links the returned ID without a publication action',async()=>{mocks.request.mockResolvedValue({id:'returned-owner'});await act(async()=>{tree=create(<MemoryRouter><OwnerDraftCreateForm owner="universities"/></MemoryRouter>);});const inputs=tree.root.findAllByType('input');const values=['Example','https://example.org/source','a'.repeat(64),'https://example.org','Source country'];await act(async()=>{inputs.forEach((node,index)=>node.props.onChange({target:{value:values[index]}}));tree.root.findByType('textarea').props.onChange({target:{value:'Documented reason'}});});await act(async()=>{tree.root.findByType('form').props.onSubmit({preventDefault:()=>{}});});expect(mocks.request).toHaveBeenCalledWith('/admin/universities',expect.objectContaining({method:'POST'}));const body=JSON.parse(mocks.request.mock.calls[0][1].body);expect(body).toMatchObject({displayName:'Example',sourceHash:'a'.repeat(64),country:'Source country'});expect(body).not.toHaveProperty('status');expect(tree.root.findByType('a').props.href).toBe('/universities/returned-owner');expect(mocks.request).toHaveBeenCalledTimes(1);});
});
