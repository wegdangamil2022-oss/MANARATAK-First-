import {createHash} from 'node:crypto';
import {CourseSourceIdentityPolicy} from '../../packages/application/src/courses/services/CourseSourceIdentityPolicy';
import {prepareOwnerDescription,approvedOwnerDescriptions} from '../../packages/application/src/localization/OwnerLocalizedDescription';
import type {CourseTranslationRow} from '../../packages/application/src/courses/parsers/CourseTranslationArtifactParser';
export const translationHash=(value:unknown):string=>createHash('sha256').update(JSON.stringify(value,(_key,item)=>item&&typeof item==='object'&&!Array.isArray(item)?Object.fromEntries(Object.entries(item).sort(([a],[b])=>a.localeCompare(b))):item)).digest('hex');
export function groupCourseTranslations(rows:CourseTranslationRow[]) {
  const groups=new Map<string,CourseTranslationRow[]>();
  for(const row of rows){const key=CourseSourceIdentityPolicy.normalizeUrl(row.url);groups.set(key,[...(groups.get(key)??[]),row]);}
  return groups;
}
export function prepareCourseTranslation(owner:any,rows:CourseTranslationRow[],source:{file:string;sha256:string}) {
  if(owner.originType!=='EXTERNAL_LINKED_COURSE'||owner.status!=='IMPORTED')throw Error('COURSE_TRANSLATION_OWNER_STATE_CHANGED');
  const previous=owner.optionalFields?.ownerLocalizedDescriptions?.ar;
  // Legacy import used an empty description and unrecognized `fields`, so no
  // current reader can approve it. Preserve that evidence while repairing it.
  if(previous && (approvedOwnerDescriptions('COURSE',owner).ar || previous.locale!=='ar' || previous.ownerId!==owner.id || previous.description!=='' || !previous.fields || typeof previous.fields!=='object'))throw Error('COURSE_TRANSLATION_EXISTING_ARABIC_REQUIRES_RECONCILIATION');
  const url=CourseSourceIdentityPolicy.normalizeUrl(owner.directCourseUrl);
  if(!rows.length||rows.some(row=>CourseSourceIdentityPolicy.normalizeUrl(row.url)!==url))throw Error('COURSE_TRANSLATION_IDENTITY_MISMATCH');
  const sorted=[...rows].sort((a,b)=>a.sourceRow-b.sourceRow),row=sorted[0];
  const optionalFields=prepareOwnerDescription('COURSE',owner,{locale:'ar',displayName:row.titleAr,description:row.topicsAr,displayFields:{platformName:row.providerLabel,studyDuration:row.durationAr,difficultyLevel:row.studyLevelAr,certificateType:row.certificateTypeAr,learningLanguageLabel:row.learningLanguageLabelAr,shortTopics:row.topicsAr}});
  optionalFields.metadata={...optionalFields.metadata,courseTranslationImport:{...source,locale:'ar',importKind:'OWNER_SUPPLIED_TRANSLATION',preferredSourceRow:row.sourceRow,duplicateRule:'EARLIEST_SOURCE_ROW',sourceRows:sorted,...(previous?{previousTranslationEvidence:previous}:{}),topicsVerification:'OWNER_SUPPLIED_MAY_INCLUDE_TITLE_INFERRED_TOPICS',publication:'UNCHANGED'}};
  if(!approvedOwnerDescriptions('COURSE',{...owner,optionalFields}).ar)throw Error('COURSE_TRANSLATION_EVIDENCE_INVALID');
  return optionalFields;
}
