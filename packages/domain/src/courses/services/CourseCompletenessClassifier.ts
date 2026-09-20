import { CourseAccessType } from '../enums/CourseAccessType';
import { CourseImportCompletenessState } from '../enums/CourseImportCompletenessState';
import { CourseOriginType } from '../enums/CourseOriginType';
import { CourseImportPayload } from '../value-objects/CourseImportPayload';

export interface CourseCompletenessClassificationResult {
  state: CourseImportCompletenessState;
  missingRequiredFields: string[];
  missingTrustFields: string[];
  flags: string[];
}

export class CourseCompletenessClassifier {
  public static classify(payload: Partial<CourseImportPayload>): CourseCompletenessClassificationResult {
    const missingRequiredFields: string[] = [];
    const missingTrustFields: string[] = [];
    const flags: string[] = [];

    if (!payload.courseName || payload.courseName.trim() === '') missingRequiredFields.push('courseName');
    if (!payload.accessType) missingRequiredFields.push('accessType');
    if (!payload.directCourseUrl || payload.directCourseUrl.trim() === '') missingRequiredFields.push('directCourseUrl');

    if (payload.accessType === CourseAccessType.PAID) {
      flags.push('PAID_COURSE_EXCLUDED: Paid courses are not allowed in the global free course import path.');
      return {
        state: CourseImportCompletenessState.REJECTED,
        missingRequiredFields,
        missingTrustFields,
        flags
      };
    }

    if (payload.originType && payload.originType !== CourseOriginType.EXTERNAL_LINKED_COURSE) {
      flags.push('NON_EXTERNAL_ORIGIN_REVIEW: Global import path is intended for external linked courses.');
      missingTrustFields.push('originType');
    }

    if (!payload.platformName && !payload.providerName) {
      missingTrustFields.push('platformName');
      flags.push('MISSING_PROVIDER_CONTEXT: Course platform or provider name is absent.');
    }

    if (!payload.sourceUrl && !payload.officialSourceUrl) {
      missingTrustFields.push('sourceUrl');
      flags.push('MISSING_SOURCE_PROOF: Trusted source URL is absent.');
    }

    let state = CourseImportCompletenessState.IMPORTED;

    if (missingRequiredFields.length > 0) {
      state = CourseImportCompletenessState.INCOMPLETE;
    } else if (missingTrustFields.length > 0) {
      state = CourseImportCompletenessState.NEEDS_REVIEW;
    } else {
      state = CourseImportCompletenessState.COMPLETE;
    }

    return {
      state,
      missingRequiredFields,
      missingTrustFields,
      flags
    };
  }
}
