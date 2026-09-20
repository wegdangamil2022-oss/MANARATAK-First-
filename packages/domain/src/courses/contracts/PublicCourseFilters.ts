import { CourseAccessType } from '../enums/CourseAccessType';
import { CourseOriginType } from '../enums/CourseOriginType';

export interface PublicCourseFilters {
  accessType?: CourseAccessType;
  originType?: CourseOriginType;
  platformName?: string;
  category?: string;
  learningLanguage?: string;
  cursor?: string;
  limit?: number;
}
