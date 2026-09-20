import { PrismaClient } from '@prisma/client';
import { afterAll, describe, expect, it } from 'vitest';
import { CourseRelationshipResolutionService } from '@manaratak/application';
import { PrismaCourseRelationshipRepository } from '../../src/courses/PrismaCourseRelationshipRepository';
import { destructiveDatabaseTestsEnabled } from './disposableDatabaseGuard';

const runDatabaseTests =
  destructiveDatabaseTestsEnabled();

const describeDatabase = runDatabaseTests ? describe : describe.skip;

describeDatabase('WP-IC-06 disposable PostgreSQL relationships', () => {
  const prisma = new PrismaClient();

  it('exposes a published Course to a Major only after both relationship reviews', async () => {
    const suffix = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const country = await prisma.referenceCountry.create({
      data: {
        iso2Code: `X${suffix.slice(-1)}`.toUpperCase(),
        iso3Code: `X${suffix.slice(-2)}`.toUpperCase().padEnd(3, 'Z').slice(0, 3),
        name: `Test Country ${suffix}`,
        isActive: true,
      },
    });
    const language = await prisma.referenceLanguage.create({
      data: {
        isoCode: `zz-${suffix}`,
        name: `Test Language ${suffix}`,
        direction: 'LTR',
        isActive: true,
      },
    });
    const taxonomy = await prisma.academicTaxonomyNode.create({
      data: {
        deterministicKey: `DISCIPLINE|TEST-${suffix}|CUSTOM_NATIONAL`,
        nodeType: 'DISCIPLINE',
        canonicalCode: `TEST-${suffix}`,
        canonicalName: `Test Topic ${suffix}`,
        status: 'ACTIVE',
        standardType: 'CUSTOM_NATIONAL',
      },
    });
    const major = await prisma.major.create({
      data: {
        publicId: `major-public-${suffix}`,
        slug: `major-${suffix}`,
        canonicalName: `Major ${suffix}`,
        canonicalDedupKey: `major-key-${suffix}`,
        displayName: `Major ${suffix}`,
        status: 'PUBLISHED',
        completenessStatus: 'COMPLETE',
      },
    });
    const mapping = await prisma.majorClassificationMapping.create({
      data: {
        majorId: major.id,
        taxonomyNodeId: taxonomy.id,
        relationshipType: 'RELATED',
        confidence: 0.9,
      },
    });
    const provider = await prisma.externalCourseProvider.create({
      data: {
        publicId: `provider-${suffix}`,
        slug: `provider-${suffix}`,
        canonicalName: `Provider ${suffix}`,
        normalizedCanonicalName: `provider ${suffix}`,
        displayName: `Provider ${suffix}`,
        status: 'APPROVED',
        sourceTrustLevel: 'OFFICIAL',
        importStrategy: 'FILE',
        headquartersCountryReferenceId: country.id,
      },
    });
    const course = await prisma.course.create({
      data: {
        publicId: `course-public-${suffix}`,
        slug: `course-${suffix}`,
        canonicalName: `Course ${suffix}`,
        canonicalDedupKey: `course-key-${suffix}`,
        displayName: `Course ${suffix}`,
        accessType: 'FREE_STUDY',
        originType: 'EXTERNAL_LINKED_COURSE',
        directCourseUrl: `https://example.invalid/${suffix}`,
        status: 'PUBLISHED',
        completenessStatus: 'COMPLETE',
        externalProviderId: provider.id,
        learningLanguageRaw: language.name,
        shortCourseTopicsRaw: taxonomy.canonicalName,
      },
    });

    try {
      const repository = new PrismaCourseRelationshipRepository(prisma);
      const service = new CourseRelationshipResolutionService(repository);

      const analyzed = await service.analyzeCourse(course.id);
      expect(analyzed.language.referenceId).toBe(language.id);
      expect(analyzed.geography.providerHeadquartersCountryReferenceId).toBe(country.id);
      expect(analyzed.geography.studyCountryReferenceIds).toEqual([]);

      const [taxonomyLink] = await repository.listTaxonomyLinks(course.id, 'PROPOSED');
      expect(taxonomyLink.taxonomyNodeId).toBe(taxonomy.id);

      expect((await repository.listPublishedCoursesForMajor(major.id)).total).toBe(0);

      await service.approveTaxonomyLink(course.id, taxonomyLink.id, 'test-reviewer');
      const [projection] = await service.projectMajors(course.id);
      expect(projection.projectionState).toBe('PROPOSED');
      expect(projection.sourceMajorClassificationMappingId).toBe(mapping.id);

      expect((await repository.listPublishedCoursesForMajor(major.id)).total).toBe(0);

      await service.approveMajorProjection(course.id, projection.id, 'test-reviewer');
      const related = await repository.listPublishedCoursesForMajor(major.id);

      expect(related.total).toBe(1);
      expect(related.data[0].publicId).toBe(course.publicId);

      // Re-analysis is idempotent with respect to explicit human review.
      await service.analyzeCourse(course.id);
      await service.projectMajors(course.id);
      const [stillApprovedLink] = await repository.listTaxonomyLinks(course.id, 'APPROVED');
      const [stillApprovedProjection] = await repository.listMajorProjections(course.id, 'APPROVED');
      expect(stillApprovedLink.id).toBe(taxonomyLink.id);
      expect(stillApprovedProjection.id).toBe(projection.id);
    } finally {
      await prisma.courseMajorProjection.deleteMany({ where: { courseId: course.id } });
      await prisma.courseAcademicTaxonomyLink.deleteMany({ where: { courseId: course.id } });
      await prisma.courseTaxonomyResolution.deleteMany({ where: { courseId: course.id } });
      await prisma.course.delete({ where: { id: course.id } });
      await prisma.externalCourseProvider.delete({ where: { id: provider.id } });
      await prisma.majorClassificationMapping.delete({ where: { id: mapping.id } });
      await prisma.major.delete({ where: { id: major.id } });
      await prisma.academicTaxonomyNode.delete({ where: { id: taxonomy.id } });
      await prisma.referenceLanguage.delete({ where: { id: language.id } });
      await prisma.referenceCountry.delete({ where: { id: country.id } });
    }
  }, 60_000);

  afterAll(async () => {
    await prisma.$disconnect();
  });
});
