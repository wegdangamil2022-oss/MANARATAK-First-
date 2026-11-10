import { describe, expect, it, vi } from 'vitest';
import { PrismaClient } from '@prisma/client';
import { PrismaCourseRelationshipRepository } from '../../src/courses/PrismaCourseRelationshipRepository';

describe('reviewed course academic evidence', () => {
  it('invalidates every major link anchored to rejected evidence while keeping independent reviews', async () => {
    const projections = [
      { courseId: 'course-1', sourceCourseTaxonomyLinkId: 'field-1', sourceType: 'DIRECT_REVIEWED', projectionState: 'APPROVED' },
      { courseId: 'course-1', sourceCourseTaxonomyLinkId: 'field-1', sourceType: 'TAXONOMY_MAPPING', projectionState: 'APPROVED' },
      { courseId: 'course-1', sourceCourseTaxonomyLinkId: null, sourceType: 'DIRECT_REVIEWED', projectionState: 'APPROVED' },
      { courseId: 'course-2', sourceCourseTaxonomyLinkId: 'other-field', sourceType: 'DIRECT_REVIEWED', projectionState: 'APPROVED' },
    ];
    const link = { id: 'field-1', courseId: 'course-1', sourceResolutionId: null, reviewState: 'APPROVED' };
    const client = {
      courseAcademicTaxonomyLink: {
        findFirst: vi.fn(async () => link),
        update: vi.fn(async ({ data }) => Object.assign(link, data)),
        findUniqueOrThrow: vi.fn(async () => link),
      },
      courseMajorProjection: {
        updateMany: vi.fn(async ({ where, data }) => {
          const matches = projections.filter(row => Object.entries(where).every(([key, value]) => row[key as keyof typeof row] === value));
          matches.forEach(row => Object.assign(row, data));
          return { count: matches.length };
        }),
      },
    };
    const repository = new PrismaCourseRelationshipRepository(client as unknown as PrismaClient, true);
    await repository.reviewTaxonomyLink({ courseId: 'course-1', linkId: 'field-1', actorId: 'reviewer', decision: 'REJECTED' });
    expect(projections.map(row => row.projectionState)).toEqual(['REVIEW_REQUIRED', 'REVIEW_REQUIRED', 'APPROVED', 'APPROVED']);
  });
});
