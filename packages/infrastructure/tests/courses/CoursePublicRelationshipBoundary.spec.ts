import { describe, expect, it, vi } from 'vitest';
import type { PrismaClient } from '@prisma/client';
import { PrismaCourseRelationshipRepository } from '../../src/courses/PrismaCourseRelationshipRepository';

function harness() {
  const course = { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0) };
  return { course, repository: new PrismaCourseRelationshipRepository({ course } as unknown as PrismaClient, true) };
}

describe('public related-course persistence boundary', () => {
  it('requires a visible owner-matched published test version before pagination and count', async () => {
    const { course, repository } = harness();
    await repository.listPublishedCoursesForInternationalTest('toefl-id', { limit: 5 });
    const query = course.findMany.mock.calls.find(([input]) => input.take === 6)![0];
    const relationship = query.where.AND[1].internationalTestRelationships.some;
    expect(relationship.reviewState).toBe('APPROVED');
    expect(relationship.internationalTestId).toBe('toefl-id');
    expect(relationship.internationalTest.is).toEqual({
      isPubliclyVisible: true, status: { notIn: ['ARCHIVED', 'REJECTED'] },
      currentPublishedVersion: { is: { status: 'PUBLISHED', testId: 'toefl-id' } },
    });
    expect(course.count).toHaveBeenCalledWith({ where: query.where });
  });

  it('does not retain a public taxonomy edge after its node is archived', async () => {
    const { course, repository } = harness();
    await repository.listPublishedRelatedCourses({ taxonomyNodeId: 'archived-node', limit: 5 });
    const query = course.findMany.mock.calls.find(([input]) => input.take === 6)![0];
    expect(query.where.AND[1].academicTaxonomyLinks.some).toEqual({
      taxonomyNodeId: 'archived-node', reviewState: 'APPROVED', taxonomyNode: { is: { status: 'ACTIVE' } },
    });
    expect(course.count).toHaveBeenCalledWith({ where: query.where });
  });
});
