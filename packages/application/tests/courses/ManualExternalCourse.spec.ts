import { describe, it, expect, vi } from 'vitest';
import { ImportedCourseAdminUseCases } from '../../src/courses/use-cases/ImportedCourseAdminUseCases';

function setup() {
  const provider = { id: 'provider', publicId: 'ecp-example', displayName: 'Reviewed provider', status: 'APPROVED', allowedDomains: ['example.org'] };
  const operations = { createManualCourse: vi.fn(async (plan: { course: object }) => ({ id: 'manual-id', ...plan.course, version: 1 })) };
  const providers = { findById: vi.fn().mockResolvedValue(provider), isDomainApproved: vi.fn().mockResolvedValue(true) };
  const service = new ImportedCourseAdminUseCases(operations as never, providers as never, {} as never, {} as never);
  const input = { originalSourceTitle: ' Evidence based learning ', externalProviderId: 'provider', directCourseUrl: 'https://example.org/course/1?utm_source=x', evidenceUrl: 'https://example.org/course/1', evidenceObservedAt: '2026-01-01T00:00:00.000Z', learningLanguageRaw: 'English', isStudyFree: true, isFreeCertificate: null };
  return { provider, operations, providers, service, input };
}
describe('manual external draft boundary', () => {
  it('uses the existing external identity, preserves unknown certificate and never publishes or invents an import batch', async () => {
    const f = setup(); const result = await f.service.createManual(f.input, 'owner');
    expect(result).toMatchObject({ originType: 'EXTERNAL_LINKED_COURSE', status: 'DRAFT', completenessStatus: 'NEEDS_REVIEW' });
    const plan = f.operations.createManualCourse.mock.calls[0][0] as Record<string, unknown>;
    expect(plan).toMatchObject({ identity: { languageVersionKey: 'en', identityStrategy: 'PROVISIONAL_TITLE_LANGUAGE' }, normalizedUrl: 'https://example.org/course/1' });
    expect(result).not.toHaveProperty('sourceImportRecordId');
    expect(result.optionalFields).toMatchObject({ creationOrigin: 'MANUAL', manualEvidence: { actorId: 'owner', observedAt: f.input.evidenceObservedAt } });
    expect(result.isFreeCertificate).toBeUndefined();
  });
  it('rejects unapproved providers, unapproved domains and credentials in source URLs before persisting', async () => {
    const f = setup(); f.provider.status = 'DRAFT';
    await expect(f.service.createManual(f.input, 'owner')).rejects.toThrow('PROVIDER_NOT_APPROVED');
    f.provider.status = 'APPROVED'; f.providers.isDomainApproved.mockResolvedValue(false);
    await expect(f.service.createManual(f.input, 'owner')).rejects.toThrow('DOMAIN_NOT_APPROVED');
    f.providers.isDomainApproved.mockResolvedValue(true);
    await expect(f.service.createManual({ ...f.input, directCourseUrl: 'https://secret:password@example.org/course/1' }, 'owner')).rejects.toThrow('URL_CREDENTIALS_FORBIDDEN');
    expect(f.operations.createManualCourse).not.toHaveBeenCalled();
  });
  it('rejects certificate contradictions and evidence from the future; derives different language identities', async () => {
    const f = setup();
    await expect(f.service.createManual({ ...f.input, certificateAvailable: false, isFreeCertificate: true }, 'owner')).rejects.toThrow('CERTIFICATE_FACTS_CONFLICT');
    await expect(f.service.createManual({ ...f.input, evidenceObservedAt: '2099-01-01T00:00:00Z' }, 'owner')).rejects.toThrow('EVIDENCE_DATE_INVALID');
    await f.service.createManual(f.input, 'owner');
    await f.service.createManual({ ...f.input, learningLanguageRaw: 'Arabic' }, 'owner');
    const plans = f.operations.createManualCourse.mock.calls.map(row => row[0] as { course: { canonicalDedupKey: string } });
    expect(plans[0].course.canonicalDedupKey).not.toBe(plans[1].course.canonicalDedupKey);
  });
});
