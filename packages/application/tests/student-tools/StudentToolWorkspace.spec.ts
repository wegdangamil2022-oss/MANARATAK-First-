import { describe, expect, it } from 'vitest';
import { OFFICIAL_STUDENT_TOOLS } from '../../src/student-tools/OfficialStudentToolRegistry';
import { studentToolAdminExecution } from '../../src/student-tools/StudentToolAdminProjection';
import { StudentToolPublicAccessPolicy } from '@manaratak/domain';

describe('student tool audience boundaries', () => {
  it.each([
    'scholarship-name-cleaner', 'scholarship-duplicate-detector',
    'university-duplicate-detector', 'scholarship-import-completeness-checker',
    'university-import-completeness-checker', 'major-import-completeness-checker',
    'course-import-completeness-checker', 'imported-record-deduplication-reviewer',
    'missing-data-fetch-assistant', 'source-trust-score-reviewer',
  ])('keeps %s internal independently of its display category', (key) => {
    const tool = OFFICIAL_STUDENT_TOOLS.find(item => item.toolKey === key)!;
    expect(tool.executionType).toBe('ADMIN_INTERNAL');
    expect(tool.availability.adminOnly).toBe(true);
    expect(tool.availability.publicEnabled).toBe(false);
    expect(tool.visibility).toBe('HIDDEN_ADMIN_ONLY');
  });
  it('does not label source implementation as production approval', () => {
    expect(OFFICIAL_STUDENT_TOOLS.some(tool => /production-ready/i.test(tool.descriptionEn))).toBe(false);
    expect(OFFICIAL_STUDENT_TOOLS).toHaveLength(83);
    expect(OFFICIAL_STUDENT_TOOLS.filter(tool => tool.implementationStatus === 'IMPLEMENTED')).toHaveLength(4);
  });
  it('blocks persisted internal identities even with incorrectly permissive flags', () => {
    const tool = structuredClone(OFFICIAL_STUDENT_TOOLS.find(item => item.toolKey === 'gpa-calculator')!);
    tool.toolKey = 'scholarship-name-cleaner';
    expect(StudentToolPublicAccessPolicy.isDiscoverable(tool)).toBe(false);
  });
  it('strips identity hashes, private payloads and arbitrary metadata from execution reads', () => {
    const record = { executionId: 'stx_one', toolKey: 'gpa-calculator', status: 'FAILED', studentReferenceHash: 'private', resultDigest: 'private', input: 'private', protectedResult: { ciphertext: 'private' }, safeUsageMetadata: { untrusted: 'private' } };
    const projected = studentToolAdminExecution(record as never);
    expect(projected.executionId).toBe('stx_one');
    expect(JSON.stringify(projected)).not.toContain('private');
    expect(projected).not.toHaveProperty('safeUsageMetadata');
  });
});
