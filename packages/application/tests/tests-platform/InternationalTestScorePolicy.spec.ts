import { AtomicDomainMutationCoordinator } from '../../src/event-foundation/use-cases/AtomicDomainMutationCoordinator';
import { AtomicAuditedOutboxMutationExecutor } from '../../src/event-foundation/use-cases/AtomicAuditedOutboxMutationExecutor';
const atomic = new AtomicDomainMutationCoordinator(new AtomicAuditedOutboxMutationExecutor(
{execute: async operation => operation({boundaryId: 'source-test'})},
{saveInTransaction: async () => undefined} as never, {appendInTransaction: async () => undefined} as never));
const mutationContext = {actorId: 'reviewer-1', reason: 'Reviewed official source', expectedRevision: 1};
import { describe, expect, it, vi } from 'vitest';
import { InternationalTestAdminUseCases } from '../../src/tests-platform/use-cases/InternationalTestUseCases';
import { InternationalTestPublicationReadinessPolicy, type IInternationalTestRepository, type InternationalTestDto } from '@manaratak/domain';

describe('M10-15 score policy negative cases', () => {
  const fixture = () => {
    const repository = { withTransaction(){return this;}, acquireSourceReviewLock: vi.fn(), getRevision: vi.fn().mockResolvedValue(1), advanceRevision: vi.fn(), findById: vi.fn().mockResolvedValue({ id: 'test-owner', status: 'DRAFT' }), upsertScoreScale: vi.fn().mockImplementation(async (_id, data) => ({ id: 'scale', ...data })), upsertSection: vi.fn().mockImplementation(async (_id, data) => ({ id: 'section', ...data })) };
    return { repository, useCases: new InternationalTestAdminUseCases(repository as unknown as IInternationalTestRepository, undefined, undefined, undefined, undefined, undefined, atomic) };
  };
  it.each([
    { overallMinimum: NaN, overallMaximum: 9 },
    { overallMinimum: 0, overallMaximum: Infinity },
    { overallMinimum: 10, overallMaximum: 9 },
    { overallMinimum: 0, overallMaximum: 9, scoreIncrement: 0 },
    { overallMinimum: 0, overallMaximum: 9, scoreIncrement: -0.5 },
    { overallMinimum: 0, overallMaximum: 9, scoreIncrement: NaN },
    { overallMinimum: 0, overallMaximum: 9, resultValidityDurationMonths: 1.5 },
  ])('rejects invalid score policy before persistence: %j', async data => {
    const f = fixture(); await expect(f.useCases.upsertScoreScale('test-owner', data)).rejects.toThrow('Invalid score scale:');
    expect(f.repository.upsertScoreScale).not.toHaveBeenCalled();
  });
  it.each([{ scoreMinimum: NaN }, { scoreMaximum: Infinity }, { scoreMinimum: 9, scoreMaximum: 0 }])('rejects invalid section bounds before persistence: %j', async bounds => {
    const f = fixture(); await expect(f.useCases.upsertSection('test-owner', { sectionName: 'Section', sectionType: 'CUSTOM', order: 1, ...bounds })).rejects.toThrow('Invalid section scores:');
    expect(f.repository.upsertSection).not.toHaveBeenCalled();
  });
  it('preserves reviewed policy text, finite fractional increments and owner identity', async () => {
    const f = fixture(); const data = { overallMinimum: 0, overallMaximum: 9, scoreIncrement: 0.5, passFailRules: 'No inferred admission threshold', resultValidityDurationMonths: 24 };
    await expect(f.useCases.upsertScoreScale('test-owner', data, mutationContext)).resolves.toMatchObject(data);
    expect(f.repository.upsertScoreScale).toHaveBeenCalledWith('test-owner', data);
  });
  it('blocks existing invalid score increments and sections at the publication boundary', () => {
    const policy = new InternationalTestPublicationReadinessPolicy();
    const entity = { id: 'test-owner', status: 'READY_TO_PUBLISH', canonicalName: 'Test', providerName: 'Provider', providerId: 'provider', testCategory: 'LANGUAGE_PROFICIENCY', localizedNameAr: 'اختبار', localizedNameEn: 'Test', isSourceVerified: true, scoreScale: { overallMinimum: 0, overallMaximum: 9, scoreIncrement: 0 }, sections: [{ scoreMinimum: NaN, scoreMaximum: 9 }], officialLinks: [{ linkType: 'REGISTRATION', url: 'https://provider.example/register' }] } as unknown as InternationalTestDto;
    const codes = policy.evaluate(entity).blockingIssues.map(issue => issue.code);
    expect(codes).toContain('INTERNATIONAL_TEST_SCORE_POLICY_INVALID');
    expect(codes).toContain('INTERNATIONAL_TEST_SECTION_SCORE_POLICY_INVALID');
    expect(policy.evaluate({ ...entity, scoreScale: { ...entity.scoreScale!, id: 'scale', scoreIncrement: 0.5 }, sections: [] }).blockingIssues).toEqual([]);
  });
});
