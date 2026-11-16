import { courseSourceFactAuthorQuery } from './CourseSourceFactAuthorQuery';
import { createHash } from 'node:crypto';
import { Prisma, PrismaClient } from '@prisma/client';
import { courseSourceFacts, type AtomicPersistenceContext } from '@manaratak/domain';
import type { CourseSourceReviewGateway } from '@manaratak/application';
import { PrismaCourseRepository } from './PrismaCourseRepository';
export class PrismaCourseSourceReviewGateway implements CourseSourceReviewGateway {
  constructor(private readonly prisma: PrismaClient) {}
  async history(courseId: string) {
    return this.prisma.courseSourceApproval.findMany({
      where: { courseId },
      orderBy: [{ reviewedAt: 'desc' }, { id: 'asc' }],
      take: 50,
      select: {
        id: true,
        courseVersion: true,
        reviewedBy: true,
        reviewedAt: true,
        reason: true,
        evidenceUrls: true,
        factsHash: true,
        providerRevision: true,
      },
    });
  }
  async approve(
    courseId: string,
    expectedVersion: number,
    actorId: string,
    reason: string,
    evidenceUrls: string[],
    validUntil: string | null,
    persistence: AtomicPersistenceContext,
  ) {
    const tx = (
      persistence as AtomicPersistenceContext & { transactionClient?: Prisma.TransactionClient }
    ).transactionClient;
    if (!persistence.boundaryId || !tx)
      throw new Error('COURSE_ATOMIC_TRANSACTION_CONTEXT_REQUIRED');
    await tx.$queryRaw`SELECT id FROM "Course" WHERE id=${courseId} FOR UPDATE`;
    const courses = new PrismaCourseRepository(tx as PrismaClient, true);
    const course = await courses.findById(courseId);
    if (!course) throw new Error('COURSE_NOT_FOUND');
    if (course.version !== expectedVersion) throw new Error('COURSE_STALE_VERSION');
    if (
      course.originType !== 'EXTERNAL_LINKED_COURSE' ||
      ['PUBLISHED', 'ARCHIVED', 'REJECTED'].includes(course.status)
    )
      throw new Error('COURSE_SOURCE_REVIEW_STATE_CONFLICT');
    const version = await tx.courseVersion.findUnique({
      where: { courseId_versionNumber: { courseId, versionNumber: course.version } },
    });
    const snapshot = version?.snapshot as { course?: unknown } | undefined;
    if (
      !snapshot?.course ||
      JSON.stringify(courseSourceFacts(snapshot.course as typeof course)) !==
        JSON.stringify(courseSourceFacts(course))
    )
      throw new Error('COURSE_SOURCE_VERSION_SNAPSHOT_MISMATCH');
    const makers = await tx.$queryRaw<Array<{ createdBy: string | null; versionNumber: number }>>(
      courseSourceFactAuthorQuery(courseId, course.version, courseSourceFacts(course)),
    );
    const maker = makers[0];
    if (!maker?.createdBy || !version?.createdBy)
      throw new Error('COURSE_SOURCE_AUTHOR_IDENTITY_REQUIRED');
    if (maker.createdBy === actorId || version.createdBy === actorId)
      throw new Error('COURSE_SOURCE_INDEPENDENT_REVIEW_REQUIRED');
    if (!course.externalProviderId) throw new Error('COURSE_SOURCE_PROVIDER_REQUIRED');
    await tx.$queryRaw`SELECT id FROM "ExternalCourseProvider" WHERE id=${course.externalProviderId} FOR SHARE`;
    const provider = await tx.externalCourseProvider.findUnique({
      where: { id: course.externalProviderId },
      include: { allowedDomains: true },
    });
    const url = new URL(course.directCourseUrl);
    if (
      url.protocol !== 'https:' ||
      url.username ||
      url.password ||
      provider?.status !== 'APPROVED' ||
      !provider.allowedDomains.some(
        (domain) =>
          url.hostname === domain.normalizedDomain ||
          url.hostname.endsWith('.' + domain.normalizedDomain),
      )
    )
      throw new Error('COURSE_SOURCE_PROVIDER_DOMAIN_NOT_APPROVED');
    const checked = await tx.courseSourceUrlHistory.findFirst({
      where: {
        url: course.directCourseUrl,
        isCurrent: true,
        verificationState: 'VERIFIED',
        checkedAt: { not: null },
        sourceIdentity: { courseId, providerId: provider.id, currentUrl: course.directCourseUrl },
      },
    });
    if (!checked) throw new Error('COURSE_SOURCE_DIRECT_LINK_VERIFICATION_REQUIRED');
    for (const evidence of evidenceUrls) {
      const host = new URL(evidence).hostname;
      if (
        !provider.allowedDomains.some(
          (domain) =>
            host === domain.normalizedDomain || host.endsWith('.' + domain.normalizedDomain),
        )
      )
        throw new Error('COURSE_SOURCE_EVIDENCE_DOMAIN_NOT_APPROVED');
    }
    const facts = courseSourceFacts(course);
    const factsHash = createHash('sha256').update(JSON.stringify(facts)).digest('hex');
    const approval = await tx.courseSourceApproval.create({
      data: {
        courseId,
        courseVersion: course.version,
        providerId: provider.id,
        providerRevision: provider.updatedAt,
        reviewedBy: actorId,
        reason,
        facts: {
          ...facts,
          validUntil,
          sourceAuthorId: maker.createdBy,
          sourceAuthorVersion: maker.versionNumber,
        } as Prisma.InputJsonValue,
        factsHash,
        evidenceUrls,
      },
    });
    return {
      id: approval.id,
      courseVersion: approval.courseVersion,
      reviewedBy: actorId,
      reviewedAt: approval.reviewedAt,
      verified: true,
      validUntil,
    };
  }
}
