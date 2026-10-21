import { describe, expect, it } from 'vitest';
import { projectPublishedScholarship } from '../../src/scholarships/use-cases/ScholarshipPublicProjection';
import type { ScholarshipDto } from '@manaratak/domain';

const publishedTest = {
  id: 'toefl', status: 'PUBLISHED', isPubliclyVisible: true, currentPublishedVersionId: 'v1',
  currentPublishedVersion: { id: 'v1', testId: 'toefl', status: 'PUBLISHED' },
};

function source(test = publishedTest): ScholarshipDto {
  return {
    publicId: 's', slug: 's', canonicalName: 'S',
    requiredDocumentItems: [{ documentKey: 'proof', displayName: 'TOEFL result', internationalTestId: 'toefl', resolutionStatus: 'RESOLVED', internationalTest: test }],
  } as unknown as ScholarshipDto;
}

describe('public scholarship requirement availability', () => {
  it('keeps the canonical link when its matching owner version remains published', () => {
    const dto = projectPublishedScholarship(source(), 'S');
    expect(dto.hasUnavailableRequirements).toBe(false);
    expect(dto.requiredDocumentItems?.[0].internationalTestId).toBe('toefl');
  });

  it.each([
    { ...publishedTest, status: 'ARCHIVED' },
    { ...publishedTest, isPubliclyVisible: false },
    { ...publishedTest, currentPublishedVersion: { id: 'v1', testId: 'different-test', status: 'PUBLISHED' } },
  ])('marks incomplete requirements without exposing an unavailable target', test => {
    const dto = projectPublishedScholarship(source(test), 'S');
    expect(dto.hasUnavailableRequirements).toBe(true);
    expect(dto.requiredDocumentItems).toEqual([]);
    expect(JSON.stringify(dto)).not.toContain('toefl');
    expect(JSON.stringify(dto)).not.toContain('different-test');
  });
});
