import type { Prisma } from '@prisma/client';

/** Missing source labels convey no language claim; any claimed language needs current canonical proof. */
export function publicCourseLanguageProof(): Prisma.CourseWhereInput {
  return { OR: [
    { learningLanguageReferenceId: null, AND: [
      { OR: [{ learningLanguageRaw: null }, { learningLanguageRaw: '' }] },
      { OR: [{ learningLanguage: null }, { learningLanguage: '' }] },
    ] },
    { learningLanguageResolutionState: 'RESOLVED', learningLanguageReference: { is: { isActive: true, lifecycleState: 'ACTIVE' } } },
  ] };
}
