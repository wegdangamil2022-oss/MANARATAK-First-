import {describe,it,expect} from 'vitest';
import {parseCourseTranslationMatrix,COURSE_TRANSLATION_HEADERS} from '../../src/courses/parsers/CourseTranslationArtifactParser';
import {groupCourseTranslations,prepareCourseTranslation} from '../../../../scripts/import/CourseTranslationImport';
import {approvedOwnerDescriptions,prepareOwnerDescription,courseTranslationSummary} from '../../src/localization/OwnerLocalizedDescription';
const values=['1','جامعة','اسم عربي','https://example.com/course?id=1','نعم','لا','شهادة','الإنجليزية','مبتدئ','ساعتان','موضوعات الدورة'];
const rows=()=>parseCourseTranslationMatrix([[...COURSE_TRANSLATION_HEADERS],values]);
const owner=()=>({id:'course-1',publicId:'C-1',canonicalName:'Source',displayName:'English source',directCourseUrl:values[3],originType:'EXTERNAL_LINKED_COURSE',status:'IMPORTED',version:2,learningLanguageRaw:'English',learningLanguageReferenceId:'lang-en',optionalFields:{description:'Source content'}});
const source={file:'source.xlsx',sha256:'a'.repeat(64)};
describe('owner supplied course translations',()=>{
 it('requires exact headers, rejects formulas/invalid rows and unsafe URLs',()=>{
  expect(()=>parseCourseTranslationMatrix([['wrong'],values])).toThrow('HEADERS');
  expect(()=>parseCourseTranslationMatrix([[...COURSE_TRANSLATION_HEADERS],[...values.slice(0,3),'http://example.com',...values.slice(4)]])).toThrow('URL');
  expect(()=>parseCourseTranslationMatrix([[...COURSE_TRANSLATION_HEADERS],values,values])).toThrow('ORDER');
 });
 it('groups duplicate URLs without title matching and preserves all source rows',()=>{
  const a=rows()[0],b={...a,sourceRow:3,sourceOrder:'2',titleAr:'عنوان بديل',url:a.url+'&utm_source=x'};
  const groups=groupCourseTranslations([b,a]);expect(groups.size).toBe(1);
  const optional=prepareCourseTranslation(owner(),[b,a],source);
  expect(optional.metadata.courseTranslationImport.sourceRows).toHaveLength(2);
  expect(optional.ownerLocalizedDescriptions.ar.displayName).toBe(a.titleAr);
 });
 it('preserves canonical identity, language and source, and binds translated labels to current source',()=>{
  const original=owner(),optionalFields=prepareCourseTranslation(original,rows(),source),translated={...original,optionalFields};
  expect(original.learningLanguageRaw).toBe('English');expect(original.displayName).toBe('English source');
  const pair=approvedOwnerDescriptions('COURSE',translated).ar!;expect(pair.displayName).toBe('اسم عربي');expect(pair.displayFields?.learningLanguageLabel).toBe('الإنجليزية');
  expect(courseTranslationSummary(translated).state).toBe('TRANSLATED');
  expect(courseTranslationSummary({...translated,displayName:'Changed source'}).state).toBe('SOURCE_CHANGED');
  expect(approvedOwnerDescriptions('COURSE',{...translated,directCourseUrl:'https://other.test/'}).ar).toBeUndefined();
 });
 it('preserves display fields on title/description edits and rejects forged fields',()=>{
  const original=owner(),optionalFields=prepareCourseTranslation(original,rows(),source),translated={...original,optionalFields};
  const edited=prepareOwnerDescription('COURSE',translated,{locale:'ar',displayName:'تعديل',description:'وصف جديد'});
  expect(approvedOwnerDescriptions('COURSE',{...original,optionalFields:edited}).ar?.displayFields?.studyDuration).toBe('ساعتان');
  expect(()=>prepareOwnerDescription('COURSE',translated,{locale:'ar',displayName:'اسم',description:'وصف',displayFields:{learningLanguageReferenceId:'ar'}})).toThrow('DISPLAY_FIELDS');
 });
 it('rejects ambiguous changes and preserves broken legacy evidence when repaired',()=>{
  const original=owner();expect(()=>prepareCourseTranslation({...original,status:'PUBLISHED'},rows(),source)).toThrow('STATE');
  expect(()=>prepareCourseTranslation({...original,directCourseUrl:'https://other.test/'},rows(),source)).toThrow('IDENTITY');
  const optionalFields=prepareCourseTranslation(original,rows(),source);
  expect(()=>prepareCourseTranslation({...original,optionalFields},rows(),source)).toThrow('RECONCILIATION');
  const legacy={ownerId:original.id,locale:'ar',description:'',displayName:'قديم',fields:{providerName:'جامعة'}};
  const fixed=prepareCourseTranslation({...original,optionalFields:{ownerLocalizedDescriptions:{ar:legacy}}},rows(),source);
  expect(fixed.metadata.courseTranslationImport.previousTranslationEvidence).toEqual(legacy);
 });
});
