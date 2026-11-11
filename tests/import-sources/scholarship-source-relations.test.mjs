import {test} from 'node:test';import assert from 'node:assert/strict';
import {scholarshipSourceRelationPort} from '../../scripts/import/scholarship-source-relations.mjs';
const tables={major:[{id:'cs',displayName:'علوم الحاسوب'},{id:'eng',displayName:'الهندسة'},{id:'ce',displayName:'هندسة الحاسوب'}],majorAlias:[],majorLevelProfile:[],degreeLevel:[{id:'master',nameAr:'ماجستير'},{id:'phd',nameAr:'دكتوراه'}],referenceCountry:[{id:'us',nameAr:'الولايات المتحدة الأمريكية',isActive:true}],referenceLanguage:[{id:'en',nameAr:'الإنجليزية'}],university:[{id:'u',displayName:'جامعة واحدة'}],internationalTest:[{id:'ielts',displayName:'IELTS Academic',abbreviation:'IELTS'},{id:'sat1',abbreviation:'SAT'},{id:'sat2',abbreviation:'SAT'}]};
test('links explicit source names despite terminal punctuation, without expanding general fields or changing criteria',async()=>{
 const data={degreeTargets:[],majorTargets:[],universityLinks:[],eligibilityItems:[{itemKey:'1',valueText:'IELTS Academic 7.'}],requiredDocumentItems:[],metadata:{rawSourceBlock:'original'}};
 const source={studyCountry:'الولايات المتحدة الأمريكية.',studyLanguage:'الإنجليزية.',degreeLevel:'ماجستير ودكتوراه',providerName:'جامعة واحدة.',eligibleMajorsOrFields:['علوم الحاسوب.','جميع التخصصات باستثناء الهندسة.'],metadata:{rawSourceSections:{'المستندات المطلوبة':'SAT'}}};
 const result=await scholarshipSourceRelationPort(tables).link(data,source);
 assert.equal(result.countryReferenceId,'us');assert.equal(result.studyLanguageReferenceId,'en');assert.equal(result.sponsorUniversityId,'u');
 assert.deepEqual(result.degreeTargets.map(row=>row.degreeLevelId),['master','phd']);assert.deepEqual(result.majorTargets.filter(row=>row.majorId).map(row=>row.majorId),['cs']);
 assert.equal(result.eligibilityItems.length,1);assert.equal(result.eligibilityItems[0].valueText,'IELTS Academic 7.');assert.equal(result.eligibilityItems[0].internationalTestId,'ielts');
 assert.deepEqual(result.metadata.sourceRelationships.testIds,['ielts']);assert.equal(result.metadata.rawSourceBlock,'original');
});
test('keeps ambiguous major identities and conditional study languages unlinked',async()=>{
 const catalog={...tables,major:[{id:'cs1',displayName:'علوم الحاسوب'},{id:'cs2',displayName:'علوم الحاسوب'}]};
 const result=await scholarshipSourceRelationPort(catalog).link({majorTargets:[],metadata:{}},{eligibleMajorsOrFields:['علوم الحاسوب.'],studyLanguage:'الإنجليزية أو الفرنسية بحسب البرنامج.'});
 assert.equal(result.majorTargets[0].majorId,null);assert.equal(result.studyLanguageReferenceId,undefined);
});
test('uses unique institution domains for bilingual aliases and source test acronyms without a stored abbreviation',async()=>{
 const catalog={...tables,university:[{id:'uni',displayName:'Example University',officialWebsite:'https://www.example.edu'}],internationalTest:[{id:'ielts',canonicalName:'International English Language Testing System',displayName:'اختبار الآيلتس IELTS'}]};
 const reviewed={providerName:'جامعة المثال.',officialSourceUrl:'https://funding.example.edu/award'};
 const port=scholarshipSourceRelationPort(catalog,[reviewed]);
 const result=await port.link({universityLinks:[{linkKey:'u',sourceLabel:'جامعة المثال'}],eligibilityItems:[],metadata:{}},{...reviewed,studyLanguage:'IELTS 7.0'});
 assert.equal(result.sponsorUniversityId,'uni');assert.equal(result.universityLinks[0].universityId,'uni');assert.deepEqual(result.metadata.sourceRelationships.testIds,['ielts']);
});
