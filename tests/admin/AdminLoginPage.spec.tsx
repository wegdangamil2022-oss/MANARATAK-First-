import {act,create,type ReactTestRenderer} from 'react-test-renderer';
import {afterEach,beforeEach,expect,it,vi} from 'vitest';
import {AdminLoginPage} from '../../apps/admin/src/pages/AdminLoginPage';
const api=vi.hoisted(()=>({request:vi.fn()}));
vi.mock('../../apps/admin/src/api/client',()=>({adminApiClient:api}));
vi.mock('../../apps/admin/src/i18n/I18nProvider',()=>({useTranslation:()=>({t:(key:string)=>key})}));
vi.mock('@manaratak/shared',()=>({canAccessAdminPath:()=>false,firstAllowedAdminPath:()=>'/cms'}));
let tree:ReactTestRenderer|undefined;
beforeEach(()=>{api.request.mockReset();(globalThis as typeof globalThis & {IS_REACT_ACT_ENVIRONMENT:boolean}).IS_REACT_ACT_ENVIRONMENT=true;});
afterEach(async()=>{if(tree)await act(async()=>tree!.unmount());tree=undefined;});

it('blocks submission while initial session verification can cancel pending requests',async()=>{
  const verifySession=vi.fn();
  await act(async()=>{tree=create(<AdminLoginPage session={{kind:'loading'}} verifySession={verifySession}/>);});
  expect(tree!.root.findByProps({type:'submit'}).props.disabled).toBe(true);
  await act(async()=>tree!.root.findByType('form').props.onSubmit({preventDefault:vi.fn()}));
  expect(api.request).not.toHaveBeenCalled();
  await act(async()=>tree!.update(<AdminLoginPage session={{kind:'unauthorized'}} verifySession={verifySession}/>));
  expect(tree!.root.findByProps({type:'submit'}).props.disabled).toBe(false);
});

it('sends the entered MFA code after bootstrap and displays the actual MFA rejection',async()=>{
  const verifySession=vi.fn();api.request.mockRejectedValue(new Error('[401] MFA_REQUIRED'));
  await act(async()=>{tree=create(<AdminLoginPage session={{kind:'unauthorized'}} verifySession={verifySession}/>);});
  for(const [id,value] of [['admin-email','synthetic@example.invalid'],['admin-password','synthetic password'],['admin-mfa-code','123456']])
    await act(async()=>tree!.root.findByProps({id}).props.onChange({target:{value}}));
  await act(async()=>tree!.root.findByType('form').props.onSubmit({preventDefault:vi.fn()}));
  expect(api.request).toHaveBeenCalledOnce();
  expect(JSON.parse(api.request.mock.calls[0][1].body)).toEqual({email:'synthetic@example.invalid',password:'synthetic password',rememberMe:false,mfaCode:'123456'});
  expect(verifySession).not.toHaveBeenCalled();
  expect(tree!.root.findByProps({role:'status'}).children.join('')).toContain('mfa_required');
});
