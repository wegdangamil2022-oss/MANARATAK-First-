import {
  ICourseRelationshipRepository,
  CourseRelationshipPublicFilters,
  PublicCourseFilters,
} from '@manaratak/domain';

export class CourseRelationshipQueryService {
  public constructor(private readonly repository: ICourseRelationshipRepository) {}

  public listPublishedRelatedCourses(filters: CourseRelationshipPublicFilters = {}) {
    return this.repository.listPublishedRelatedCourses(filters);
  }

  public listPublishedCoursesForMajor(
    majorId: string,
    filters: PublicCourseFilters = {},
  ) {
    if (!majorId.trim()) throw new Error('MAJOR_ID_REQUIRED');
    return this.repository.listPublishedCoursesForMajor(majorId, filters);
  }

  public listPublishedCoursesForInternationalTest(
    internationalTestId: string,
    filters: PublicCourseFilters = {},
  ) {
    if (!internationalTestId.trim()) throw new Error('INTERNATIONAL_TEST_ID_REQUIRED');
    return this.repository.listPublishedCoursesForInternationalTest(internationalTestId, filters);
  }

  public getCourseGeography(courseId: string) {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    return this.repository.getGeographySemantics(courseId);
  }

  public listApprovedMajorProjections(courseId: string) {
    if (!courseId.trim()) throw new Error('COURSE_ID_REQUIRED');
    return this.repository.listMajorProjections(courseId, 'APPROVED');
  }
}
