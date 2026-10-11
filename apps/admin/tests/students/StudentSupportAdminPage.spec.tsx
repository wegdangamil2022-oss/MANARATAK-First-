import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {MemoryRouter} from 'react-router-dom';
import {describe,expect,it,vi} from 'vitest';
import {ar} from '../../src/i18n/ar';
import {en} from '../../src/i18n/en';
const state=vi.hoisted(()=>({language:'en'}));
vi.mock('../../src/api/client',()=>({adminApiClient:{request:vi.fn()}}));
vi.mock('../../src/security/AdminAuthorizationContext',()=>({useAdminAuthorization:()=>({hasPermission:()=>false})}));
vi.mock('../../src/i18n/I18nProvider',()=>({useTranslation:()=>({language:state.language,dir:state.language==='en'?'ltr':'rtl',
  t:(key:keyof typeof en)=>(state.language==='en'?en:ar)[key]})}));
import {StudentSupportAdminPage} from '../../src/pages/StudentSupportAdminPage';
describe('Student support bilingual initial and missing-workspace view',()=>{
  it('renders English support, triage and exact-identity diagnostic without Arabic fallback',()=>{
    state.language='en';
    const html=renderToStaticMarkup(<MemoryRouter><StudentSupportAdminPage/></MemoryRouter>);
    expect(html).toContain('dir="ltr"');
    expect(html).toContain(en.stu_support_heading);
    expect(html).toContain(en.stu_support_identity_id);
    expect(html).toContain(en.stu_support_diagnosis_missing_notice);
    expect(html).not.toMatch(/[\u0600-\u06ff]/);
    expect(html).not.toContain('Service requests awaiting payment');
  });
  it('preserves Arabic support and RTL while exposing read-only lookup without a selected workspace',()=>{
    state.language='ar';
    const html=renderToStaticMarkup(<MemoryRouter><StudentSupportAdminPage/></MemoryRouter>);
    expect(html).toContain('dir="rtl"');
    expect(html).toContain(ar.stu_support_heading);
    expect(html).toContain(ar.stu_support_identity_id);
    expect(html).toContain(ar.stu_support_diagnosis_missing_notice);
  });
});
