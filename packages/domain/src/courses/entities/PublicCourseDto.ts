import { CourseAccessType } from '../enums/CourseAccessType';
import { CourseOriginType } from '../enums/CourseOriginType';

export interface PublicCourseDto {
  /** Canonical P13 owner identity; never derived from display text. */
  ownerId: string;
  publicId: string;
  slug: string;
  displayName: string;
  canonicalName: string;
  accessType: CourseAccessType;
  originType: CourseOriginType;
  directCourseUrl: string;
  externalProviderId?: string | null;
  isStudyFree?: boolean | null;
  isFreeCertificate?: boolean | null;
  certificateType?: string | null;
  learningLanguageReferenceId?: string | null;

  platformName?: string | null;
  providerName?: string | null;
  learningLanguage?: string | null;
  studyDuration?: string | null;
  certificateAvailable?: boolean | null;
  category?: string | null;
  difficultyLevel?: string | null;
  sourceUrl?: string | null;
  officialSourceUrl?: string | null;
  thumbnailAssetId?: string | null;

  description?: string;
  instructor?: string;
  prerequisites?: string[];
  targetAudience?: string[];
  learningOutcomes?: string[];
  titleEn?: string;
  relatedMajors?: Array<{id:string;name:string}>;
  curriculumModules?: Array<{title:string;description:string}>;
  lessonsCount?: number;
  shortCourseTopicsRaw?: string | null;
  studyLevelRaw?: string | null;
  studyDurationRaw?: string | null;
  learningLanguageRaw?: string | null;
  courseContent?: string;
  relatedMajorsOrFields?: string | string[];
  acquiredSkills?: string[];
  localizedNames?: Record<string, string>;
  metadata?: Record<string, unknown>;

  updatedAt: Date;
}
