import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { courseSourceRelationshipReviewRequired } from '../../src/courses/services/CourseSourceRelationshipReadiness';

const reviewedExclusion = {
  id: 'synthetic-resolution', courseId: 'synthetic-course', sourceTerm: 'DATA–SCIENCE',
  normalizedTerm: 'data-science', status: 'REJECTED' as const, candidateTaxonomyNodeIds: [],
  createdAt: new Date(0), updatedAt: new Date(0),
};

describe('course source relationship term parsing', () => {
  it('preserves Unicode normalization, all delimiters and unresolved-term denial', () => {
    expect(courseSourceRelationshipReviewRequired('\tＤＡＴＡ–ＳＣＩＥＮＣＥ • DATA-SCIENCE |;\r\n', [], [reviewedExclusion])).toBe(false);
    expect(courseSourceRelationshipReviewRequired('data-science | unknown', [], [reviewedExclusion])).toBe(true);
    expect(courseSourceRelationshipReviewRequired('data-science', [], [{ ...reviewedExclusion, status: 'REVIEW_REQUIRED' }])).toBe(true);
  });

  it('bounds whitespace with no delimiter in a killable child process', () => {
    const child = spawnSync(process.execPath, ['--import', 'tsx', '--input-type=module', '-e', `
      import assert from 'node:assert/strict';
      import { courseSourceRelationshipReviewRequired as review } from './packages/application/src/courses/services/CourseSourceRelationshipReadiness.ts';
      assert.equal(review('\\t'.repeat(250000), [], []), false);
      assert.equal(review('\\t'.repeat(125000)+'unknown'+'\\t'.repeat(125000), [], []), true);
    `], { timeout: 8000, encoding: 'utf8', windowsHide: true });
    expect(child.error, child.stderr).toBeUndefined();
    expect(child.status, child.stderr).toBe(0);
  }, 10000);
});
