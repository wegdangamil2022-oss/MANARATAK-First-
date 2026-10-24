import { describe, it, expect, vi } from 'vitest';
import { AdminUniversityUseCases } from '../../src/universities/use-cases/AdminUniversityUseCases';
const base = {
  id: 'u1',
  publicId: 'INS-EU-1',
  revision: 1,
  status: 'READY_TO_REVIEW',
  displayName: 'Existing',
  metadata: { preserved: true },
  internationalAdmissions: { undergradAdmissionUrl: 'https://example.org/undergrad' },
};
function setup(record = base) {
  const repo = {
    findById: vi.fn().mockResolvedValue(record),
    findPublishedBySlug: vi.fn(),
    readStageGeography: vi.fn().mockResolvedValue({ region: 'Europe' }),
  };
  const service = new AdminUniversityUseCases(repo as never);
  return { service, repo };
}
describe('University source card owner boundary', () => {
  it('rejects immutable raw source fields and unknown cards', async () => {
    const { service } = setup();
    await expect(
      service.saveStageCard(
        'u1',
        'enrichment-match',
        { 'University Reference ID': 'fake' },
        { sourceUrl: 'https://example.org', verifiedAt: new Date().toISOString() },
      ),
    ).rejects.toThrow('FIELDS_INVALID');
    await expect(
      service.saveStageCard(
        'u1',
        'unknown',
        { displayName: 'fake' },
        { sourceUrl: 'https://example.org', verifiedAt: new Date().toISOString() },
      ),
    ).rejects.toThrow('FIELDS_INVALID');
  });
  it('preserves existing admission fields and provenance when editing one canonical card', async () => {
    const { service } = setup();
    const update = vi.spyOn(service, 'updateUniversity').mockResolvedValue(base as never);
    await service.saveStageCard(
      'u1',
      'academic-admissions',
      { 'internationalAdmissions.acceptsInternationalStudents': false },
      { sourceUrl: 'https://example.org/source', verifiedAt: new Date().toISOString() },
    );
    expect(update).toHaveBeenCalledWith(
      'u1',
      expect.objectContaining({
        optionalFields: expect.objectContaining({
          internationalAdmissions: {
            undergradAdmissionUrl: 'https://example.org/undergrad',
            acceptsInternationalStudents: false,
          },
          metadata: expect.objectContaining({ preserved: true }),
        }),
      }),
      undefined,
    );
  });
  it('requires evidence and does not treat a source-field save as import completion', async () => {
    const { service } = setup();
    await expect(
      service.saveStageCard(
        'u1',
        'enrichment-identity',
        { displayName: 'Safe' },
        { sourceUrl: 'javascript:alert(1)', verifiedAt: new Date().toISOString() },
      ),
    ).rejects.toThrow('EVIDENCE_INVALID');
    const update = vi.spyOn(service, 'updateUniversity').mockResolvedValue(base as never);
    await service.saveStageCard(
      'u1',
      'enrichment-identity',
      { foundedYear: 1200 },
      { sourceUrl: 'https://example.org/source', verifiedAt: new Date().toISOString() },
    );
    const payload = update.mock.calls[0][1];
    expect(payload).not.toHaveProperty('status');
    expect(payload).not.toHaveProperty('sourceRecords');
  });
  it('does not restore a live record or publish it automatically', async () => {
    const { service } = setup();
    await expect(service.restore('u1')).rejects.toThrow('RESTORE_STATE_INVALID');
  });
});
