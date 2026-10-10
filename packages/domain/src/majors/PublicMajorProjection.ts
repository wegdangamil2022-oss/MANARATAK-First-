import {MajorDto, MajorContentSectionDto, PublicMajorDto} from './majors';
import {MajorStatus} from './enums';

/** Public exposure is explicit at every nested boundary. Drafts/evidence/admin JSON never spread. */
export function publicMajorProjection(major:MajorDto,sections:readonly MajorContentSectionDto[]=[]):PublicMajorDto {
  const text=(value:unknown)=>typeof value==='string'?value:undefined;
  const strings=(value:unknown)=>Array.isArray(value)?value.filter((item):item is string=>typeof item==='string').slice(0,100):undefined;
  const optional={...(major as unknown as Record<string,unknown>),...(major.optionalFields ?? {})};
  const profiles=(major.profiles ?? []).filter(profile=>profile.status===MajorStatus.PUBLISHED && profile.currentPublishedVersionId).map(profile=>({
    id:profile.id,majorId:profile.majorId,level:profile.level,code:profile.code,degreeLevelId:profile.degreeLevelId,
    profileType:profile.profileType,displayName:profile.displayName,localizedNameAr:profile.localizedNameAr,localizedNameEn:profile.localizedNameEn,
    academicFieldId:profile.academicFieldId,disciplineId:profile.disciplineId,currentPublishedVersionId:profile.currentPublishedVersionId,status:MajorStatus.PUBLISHED,
  }));
  return {publicId:major.publicId,slug:major.slug,canonicalName:major.canonicalName,displayName:major.displayName,
    localizedNameAr:major.localizedNameAr,localizedNameEn:major.localizedNameEn,degreeLevel:major.degreeLevel,
    classificationCode:major.classificationCode,academicFieldId:major.academicFieldId,disciplineId:major.disciplineId,
    currentPublishedVersionId:major.currentPublishedVersionId,profiles,
    description:text(optional.description),studentFriendlySummary:text(optional.studentFriendlySummary),
    acquiredSkills:strings(optional.acquiredSkills),careerOutcomes:strings(optional.careerOutcomes),typicalCourses:strings(optional.typicalCourses),
    contentSections:sections.filter(section=>['APPROVED','PUBLISHED'].includes(section.reviewStatus ?? '')).map(section=>({sectionKey:section.sectionKey,title:section.title,content:section.content,reviewStatus:section.reviewStatus})),
  } as PublicMajorDto;
}
