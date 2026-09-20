import { CourseImportPayload } from '../value-objects/CourseImportPayload';
import { CourseNamingService } from './CourseNamingService';

export class CourseDeduplicationService {
  public static generateKey(payload: Partial<CourseImportPayload>): string {
    const canonicalName = CourseNamingService.normalize(payload.courseName || '').toLowerCase();
    const provider = (payload.platformName || payload.providerName || '').trim().toLowerCase();
    const directUrl = (payload.directCourseUrl || '').trim().toLowerCase();
    const accessType = (payload.accessType || '').toString().trim().toLowerCase();

    return `${canonicalName}|${provider}|${directUrl}|${accessType}`;
  }
}
