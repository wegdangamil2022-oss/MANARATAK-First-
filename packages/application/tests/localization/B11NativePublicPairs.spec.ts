import {describe,it,expect,vi} from 'vitest';
import {PublicServiceCatalogUseCases} from '../../src/services-platform/use-cases/PublicServiceCatalogUseCases';
import {CareerPublicUseCases} from '../../src/career-alumni/use-cases/CareerPublicUseCases';
import {TRANSLATION_OWNER_CAPABILITIES} from '@absheer/shared';
describe('B11 native service and career snapshot language',()=>{
 it.each([true,false])('keeps service title and description on the same published snapshot (complete pair %s)',async complete=>{
  const snapshot:any={id:'service',status:'PUBLISHED',displayName:'Published source',serviceDescription:'Published description',version:3,localizedContent:{en:{displayName:'Published EN',...(complete?{serviceDescription:'Description EN'}:{})}}};
  const row:any={...snapshot,status:'DRAFT',displayName:'Private edit',serviceDescription:'Private description',localizedContent:{en:{displayName:'Private EN',serviceDescription:'Private EN description'}},publishedSnapshot:snapshot};
  const result=await new PublicServiceCatalogUseCases({findBySlug:async()=>row} as any).getService('service','en');
  expect(result.displayName).toBe(complete?'Published EN':'Published source');expect(result.serviceDescription).toBe(complete?'Description EN':'Published description');expect(JSON.stringify(result)).not.toContain('Private');
 });
 it.each([true,false])('keeps career title and description in one sealed owner version (complete pair %s)',async complete=>{
  const snapshot:any={id:'job',status:'PUBLISHED',title:'Published job',description:'Published job description',metadata:{localizedContent:{en:{title:'Reviewed EN',...(complete?{description:'Reviewed EN description'}:{})}}}};
  const row:any={...snapshot,title:'Private draft',description:'Private draft description',metadata:{_career:{publishedSnapshot:snapshot},localizedContent:{en:{title:'Private EN',description:'Private EN description'}}}};
  const uc:any=new CareerPublicUseCases({} as any,{displayGeography:vi.fn()} as any);
  const result=await uc.project(row,'en');expect(result.title).toBe(complete?'Reviewed EN':'Published job');expect(result.description).toBe(complete?'Reviewed EN description':'Published job description');expect(JSON.stringify(result)).not.toContain('Private');
 });
 it('does not backfill missing historical service localized content from a private draft',async()=>{
  const row:any={id:'service',status:'DRAFT',localizedContent:{en:{displayName:'Private EN',serviceDescription:'Private EN description'}},publishedSnapshot:{id:'service',status:'PUBLISHED',displayName:'Source',serviceDescription:'Published description'}};
  const result=await new PublicServiceCatalogUseCases({findBySlug:async()=>row} as any).getService('service','en');expect(result).toMatchObject({displayName:'Source',serviceDescription:'Published description'});expect(JSON.stringify(result)).not.toContain('Private');
 });
 it('does not inherit draft career metadata when the historical snapshot lacks it',async()=>{
  const row:any={id:'job',metadata:{localizedContent:{en:{title:'Private EN',description:'Private description'}},_career:{publishedSnapshot:{id:'job',status:'PUBLISHED',title:'Published job',description:'Published description'}}}};
  const uc:any=new CareerPublicUseCases({} as any,{} as any);const result=await uc.project(row,'en');expect(result).toMatchObject({title:'Published job',description:'Published description'});expect(JSON.stringify(result)).not.toContain('Private');
 });
 it('advertises native description contracts separately from central import/editor support',()=>{for(const key of ['INTERNATIONAL_TEST','SCHOLARSHIP','COURSE','STUDY_DESTINATION','SERVICE','CAREER_JOB'] as const){const owner=TRANSLATION_OWNER_CAPABILITIES[key];expect(owner.supportsDescriptions).toBe(true);expect(owner.descriptionFields.length).toBeGreaterThan(0);expect(owner.centralDescriptionEditor).toBe(false);expect(owner.importSupported).toBe(false);}});
});
