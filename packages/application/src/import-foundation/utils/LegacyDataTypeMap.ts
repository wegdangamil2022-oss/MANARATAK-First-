import { ImportTargetDomain } from '@manaratak/domain';

export const LEGACY_DATATYPE_MAP: Record<string, ImportTargetDomain> = {
  SCHOLARSHIP: ImportTargetDomain.Scholarships,
  UNIVERSITY: ImportTargetDomain.Universities,
  MAJOR: ImportTargetDomain.Majors,
  COURSE: ImportTargetDomain.Courses,
  TEST: ImportTargetDomain.Tests,
  INTERNATIONAL_TESTS: ImportTargetDomain.Tests,
};
