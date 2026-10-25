import type { Prisma } from '@prisma/client';
import type { CourseFilters } from '@manaratak/domain';

const external = { originType: 'EXTERNAL_LINKED_COURSE' };
const native = { originType: 'NATIVE_MANARATAK_COURSE' };
const freeCertificateAccess = { in: ['FREE_CERTIFICATE', 'FREE_STUDY_AND_CERTIFICATE'] };

export function courseCertificateWhere(state: NonNullable<CourseFilters['certificateState']>): Prisma.CourseWhereInput {
  if (state === 'UNAVAILABLE') return { certificateAvailable: false };
  if (state === 'FREE') return { AND: [
    { OR: [{ certificateAvailable: true }, { certificateAvailable: null }] },
    { OR: [{ isFreeCertificate: true }, { ...native, certificateAvailable: true, isFreeCertificate: null, accessType: freeCertificateAccess }] },
  ] };
  if (state === 'NON_FREE') return { certificateAvailable: true, isFreeCertificate: false };
  // NULL has three-valued SQL semantics: express unknown states explicitly, not NOT(free).
  return { OR: [
    { certificateAvailable: null, OR: [{ isFreeCertificate: null }, { isFreeCertificate: false }] },
    { certificateAvailable: true, isFreeCertificate: null, originType: { not: 'NATIVE_MANARATAK_COURSE' } },
    { ...native, certificateAvailable: true, isFreeCertificate: null, accessType: { notIn: freeCertificateAccess.in } },
  ] };
}

export function courseStudyWhere(state: NonNullable<CourseFilters['studyAccess']>): Prisma.CourseWhereInput {
  if (state === 'UNKNOWN') return { isStudyFree: null, OR: [
    external, { ...native, accessType: 'FREE_CERTIFICATE' }, { originType: 'PAID_COURSE' },
  ] };
  return { OR: [
    { isStudyFree: state === 'FREE' },
    { ...native, isStudyFree: null, accessType: state === 'FREE' ? { in: ['FREE_STUDY', 'FREE_STUDY_AND_CERTIFICATE'] } : 'PAID' },
  ] };
}

export function courseCatalogWhere(filters: CourseFilters): Prisma.CourseWhereInput {
  const where: Prisma.CourseWhereInput = {};
  if (filters.courseId) where.id = filters.courseId;
  if (filters.status) where.status = filters.status;
  if (filters.completenessStatus) where.completenessStatus = filters.completenessStatus;
  if (filters.accessType) where.accessType = filters.accessType;
  if (filters.originType) where.originType = filters.originType;
  if (filters.platformName) where.platformName = { contains: filters.platformName, mode: 'insensitive' };
  if (filters.externalProviderId) where.externalProviderId = filters.externalProviderId;
  if (filters.category) where.category = { contains: filters.category, mode: 'insensitive' };
  if (filters.majorId) where.majorProjections = { some: { majorId: filters.majorId, projectionState: 'APPROVED' } };
  const and: Prisma.CourseWhereInput[] = [];
  if (filters.learningLanguage) and.push({ OR: [
    { learningLanguage: { contains: filters.learningLanguage, mode: 'insensitive' } },
    { ...external, learningLanguageRaw: { contains: filters.learningLanguage, mode: 'insensitive' } },
  ] });
  if (filters.difficultyLevel) and.push({ OR: [
    { difficultyLevel: { contains: filters.difficultyLevel, mode: 'insensitive' } },
    { ...external, studyLevelRaw: { contains: filters.difficultyLevel, mode: 'insensitive' } },
  ] });
  if (filters.linkHealth) and.push(courseLinkHealthWhere(filters.linkHealth));
  // Preserve the pre-existing boolean filter for older consumers. The catalog uses the richer fact filter.
  if (filters.isFreeCertificate !== undefined) and.push({ OR: [
    { ...external, isFreeCertificate: filters.isFreeCertificate },
    filters.isFreeCertificate ? { ...native, certificateAvailable: true, accessType: freeCertificateAccess }
      : { ...native, NOT: { certificateAvailable: true, accessType: freeCertificateAccess } },
  ] });
  if (filters.studyAccess) and.push(courseStudyWhere(filters.studyAccess));
  if (filters.certificateState) and.push(courseCertificateWhere(filters.certificateState));
  if (filters.search) and.push({ OR: [
    ...['displayName', 'canonicalName', 'publicId', 'platformName', 'providerName', 'originalSourceTitle', 'shortCourseTopicsRaw']
      .map(key => ({ [key]: { contains: filters.search, mode: 'insensitive' as const } })),
    { externalProvider: { is: { OR: [
      { displayName: { contains: filters.search, mode: 'insensitive' } },
      { canonicalName: { contains: filters.search, mode: 'insensitive' } },
    ] } } },
    { ...native, optionalFields: { path: ['instructor'], string_contains: filters.search } },
    { majorProjections: { some: { projectionState: 'APPROVED', major: { displayName: { contains: filters.search, mode: 'insensitive' } } } } },
  ] });
  if (filters.instructor) and.push({ ...native, optionalFields: { path: ['instructor'], string_contains: filters.instructor } });
  if (filters.hasEnrollments !== undefined) and.push({ enrollments: { [filters.hasEnrollments ? 'some' : 'none']: {
    ...(filters.cohortFrom || filters.cohortTo ? { enrolledAt: {
      ...(filters.cohortFrom ? { gte: new Date(filters.cohortFrom) } : {}), ...(filters.cohortTo ? { lt: new Date(filters.cohortTo) } : {}),
    } } : {}),
  } } });
  if (and.length) where.AND = and;
  return where;
}

/** Recorded current-source link outcomes, never a claim that an old check is fresh. */
export function courseLinkHealthWhere(state: NonNullable<CourseFilters['linkHealth']>): Prisma.CourseWhereInput {
  const current = { status: 'ACTIVE', urlHistory: { some: { isCurrent: true } } };
  if (state === 'UNKNOWN') return { ...external, sourceIdentities: { none: current } };
  if (state === 'NEEDS_REVIEW') return { ...external, OR: [
    { sourceIdentities: { none: current } },
    { sourceIdentities: { some: { status: 'ACTIVE', urlHistory: { some: { isCurrent: true, verificationState: 'UNVERIFIED' } } } } },
  ] };
  const values = state === 'VERIFIED' ? ['VERIFIED', 'REDIRECTED'] : state === 'BROKEN' ? ['BROKEN', 'REJECTED'] : ['UNVERIFIED'];
  return { ...external, sourceIdentities: { some: { status: 'ACTIVE', urlHistory: { some: { isCurrent: true, verificationState: { in: values } } } } } };
}

export function courseCatalogOrder(sort?: CourseFilters['sort']): Prisma.CourseOrderByWithRelationInput[] {
  const orders: Record<NonNullable<CourseFilters['sort']>, Prisma.CourseOrderByWithRelationInput> = {
    UPDATED_DESC: { updatedAt: 'desc' }, UPDATED_ASC: { updatedAt: 'asc' },
    NAME_ASC: { displayName: 'asc' }, NAME_DESC: { displayName: 'desc' }, STATUS_ASC: { status: 'asc' },
  };
  return [sort ? orders[sort] : { createdAt: 'desc' }, { id: 'asc' }];
}
