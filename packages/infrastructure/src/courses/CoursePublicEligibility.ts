import type { Prisma } from '@prisma/client';
import { publicCourseLanguageProof } from './CoursePublicLanguageProof';

/** Shared current owner proof for public detail, search/count, relations and CMS. */
export function publicCourseEligibility(): Prisma.CourseWhereInput {
  return {
    status: 'PUBLISHED',
    completenessStatus: 'COMPLETE',
    AND: [{ OR: [
      { originType: { not: 'EXTERNAL_LINKED_COURSE' } },
      {
        originType: 'EXTERNAL_LINKED_COURSE',
        accessType: { in: ['FREE_STUDY', 'FREE_STUDY_AND_CERTIFICATE'] },
        isStudyFree: true,
        externalProvider: { is: { status: 'APPROVED' } },
      },
    ] }, publicCourseLanguageProof()],
  };
}
