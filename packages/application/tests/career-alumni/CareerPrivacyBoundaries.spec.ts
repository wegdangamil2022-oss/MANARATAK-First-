import { describe, expect, it, vi } from 'vitest';
import { safeCareerUrl } from '../../src/career-alumni/CareerPolicy';
import { CareerEngagementUseCases } from '../../src/career-alumni/use-cases/CareerEngagementUseCases';
describe('Career external destinations', () => {
  it.each([
    'https://localhost./cv',
    'https://host.internal./cv',
    'https://host.local./cv',
    'https://127.0.0.1/cv',
    'https://2130706433/cv',
    'https://user:secret@employer.example/cv',
    'http://employer.example/cv',
  ])('denies unsafe destination %s', (url) =>
    expect(() => safeCareerUrl(url)).toThrow('CAREER_URL_INVALID'),
  );
  it('normalizes a safe trailing-dot destination', () =>
    expect(safeCareerUrl('https://employer.example./cv')).toBe('https://employer.example/cv'));
});
function harness() {
  const row: any = {
    id: 'app',
    studentReferenceId: 'owner',
    status: 'UNDER_REVIEW',
    cvAssetId: 'cv',
    jobSnapshot: { cvConsentAt: new Date().toISOString(), consentActorStudentReferenceId: 'owner' },
  };
  const asset = { assertUsable: vi.fn().mockResolvedValue({ id: 'cv' }) };
  const students = { assertActiveStudent: vi.fn() };
  const uc = new CareerEngagementUseCases(
    {} as never,
    { findApplication: vi.fn().mockResolvedValue(row) } as never,
    students,
    asset as never,
  );
  return { row, asset, students, uc };
}
describe('Career CV custody before delivery grants', () => {
  it.each(['withdrawn', 'missing-consent', 'foreign-consent', 'future-consent', 'blank-asset'])(
    'denies %s before EAP custody access',
    async (mode) => {
      const h = harness();
      if (mode === 'withdrawn') h.row.status = 'WITHDRAWN';
      if (mode === 'missing-consent') h.row.jobSnapshot = {};
      if (mode === 'foreign-consent') h.row.jobSnapshot.consentActorStudentReferenceId = 'foreign';
      if (mode === 'future-consent')
        h.row.jobSnapshot.cvConsentAt = new Date(Date.now() + 86400000).toISOString();
      if (mode === 'blank-asset') h.row.cvAssetId = '';
      await expect(h.uc.assertCvForReview('app')).rejects.toThrow();
      expect(h.asset.assertUsable).not.toHaveBeenCalled();
    },
  );
  it('denies a suspended owner before EAP access', async () => {
    const h = harness();
    h.students.assertActiveStudent.mockRejectedValue(new Error('CAREER_STUDENT_NOT_ACTIVE'));
    await expect(h.uc.assertCvForReview('app')).rejects.toThrow('NOT_ACTIVE');
    expect(h.asset.assertUsable).not.toHaveBeenCalled();
  });
  it('passes current owner consent to the owner-bound PDF policy', async () => {
    const h = harness();
    await expect(h.uc.assertCvForReview('app')).resolves.toBe('cv');
    expect(h.asset.assertUsable).toHaveBeenCalledWith(
      'cv',
      expect.objectContaining({
        expectedOwnerId: 'owner',
        allowedMimeTypePrefixes: ['application/pdf'],
      }),
    );
  });
});
