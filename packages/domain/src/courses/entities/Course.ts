import { CourseAccessType } from '../enums/CourseAccessType';
import { CourseImportCompletenessState } from '../enums/CourseImportCompletenessState';
import { CourseOriginType } from '../enums/CourseOriginType';
import { CourseStatus } from '../enums/CourseStatus';

export interface CreateCourseDto {
  publicId: string;
  slug: string;
  canonicalName: string;
  canonicalDedupKey: string;
  displayName: string;
  accessType: CourseAccessType;
  originType: CourseOriginType;
  directCourseUrl: string;
  status: CourseStatus;
  completenessStatus: CourseImportCompletenessState;

  externalProviderId?: string;
  originalSourceTitle?: string;
  isStudyFree?: boolean;
  isFreeCertificate?: boolean;
  certificateType?: string;
  learningLanguageRaw?: string;
  studyLevelRaw?: string;
  studyDurationRaw?: string;
  shortCourseTopicsRaw?: string;

  platformName?: string;
  providerName?: string;
  learningLanguage?: string;
  studyDuration?: string;
  certificateAvailable?: boolean;
  category?: string;
  difficultyLevel?: string;
  sourceUrl?: string;
  officialSourceUrl?: string;
  thumbnailAssetId?: string;

  sourceImportRecordId?: string;
  optionalFields?: Record<string, unknown>;
}

export interface CourseDto extends CreateCourseDto {
  id: string;
  /** Canonical P7 ReferenceLanguage relation; owner-reviewed, not a generic write field. */
  learningLanguageReferenceId?: string;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}
