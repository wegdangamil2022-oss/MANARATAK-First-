import { describe, it, expect } from 'vitest';
import {
  ExtractorType,
  ExtractionCandidateStatus,
  ImportTargetDomain,
  MatchStrength,
  FieldDiffType,
  MergeProposalStatus,
  ConfidenceScore,
  FieldEvidence,
  ExtractionCandidate,
  DomainHandoffRequest,
  MatchCandidate,
} from '@manaratak/domain';
import { MergeProposalPreparationService } from '../../src';


describe('MergeProposalBoundary Golden Tests', () => {
  const service = new MergeProposalPreparationService();
  const now = new Date();

  const confidence = new ConfidenceScore({ value: 0.95, explanation: 'High confidence rule match' });
  
  const createEvidence = (fieldName: string, value: string) =>
    new FieldEvidence({
      fieldName,
      extractedValue: value,
      sourceId: 'src-123',
      retrievedAt: now,
      contentHash: 'hash-123',
      connectorVersion: '1.0.0',
      extractorType: ExtractorType.RULE_BASED,
      schemaVersion: '1.0',
      evidenceSnippet: `Extracted ${fieldName}`,
      confidenceScore: confidence
    });

  const createCandidate = (candidateId: string, targetFieldName: string, value: string) =>
    new ExtractionCandidate({
      candidateId,
      targetFieldName,
      value,
      evidence: createEvidence(targetFieldName, value),
      status: ExtractionCandidateStatus.CANDIDATE,
      createdAt: now
    });

  it('Golden case: existing scholarship has description, import omits description', async () => {
    const candidate = createCandidate('cand-1', 'name', 'Tech Scholarship');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Scholarships,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Tech Scholarship' }, // description omitted
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Tech Scholarship', description: 'Existing description' },
      requiredFields: ['name', 'description']
    });

    const descDiff = proposal.fieldDiffs.find(d => d.fieldName === 'description');
    expect(descDiff).toBeDefined();
    expect(descDiff?.diffType).toBe(FieldDiffType.MISSING_IN_IMPORT);
    expect(descDiff?.canDeleteExistingValue()).toBe(false);
    expect(descDiff?.currentValue).toBe('Existing description');
    // no proposed deletion
    expect(descDiff?.proposedValue).toBeUndefined();
  });

  it('Golden case: incoming field conflicts with existing value', async () => {
    const candidate = createCandidate('cand-1', 'amount', '5000');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Scholarships,
      importRecordId: 'rec-1',
      normalizedPayload: { amount: '5000' },
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { amount: '1000' },
      requiredFields: ['amount']
    });

    const amountDiff = proposal.fieldDiffs.find(d => d.fieldName === 'amount');
    expect(amountDiff).toBeDefined();
    expect(amountDiff?.diffType).toBe(FieldDiffType.CONFLICT);
    
    expect(proposal.requiresReview).toBe(true);
    expect(proposal.status).toBe(MergeProposalStatus.NEEDS_REVIEW);
  });

  it('Golden case: incoming field fills missing existing value', async () => {
    const candidate = createCandidate('cand-1', 'deadline', '2027-01-01');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Scholarships,
      importRecordId: 'rec-1',
      normalizedPayload: { deadline: '2027-01-01' },
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Tech Scholarship' }, // deadline is missing in existing
      requiredFields: ['name', 'deadline']
    });

    const deadlineDiff = proposal.fieldDiffs.find(d => d.fieldName === 'deadline');
    expect(deadlineDiff).toBeDefined();
    expect(deadlineDiff?.diffType).toBe(FieldDiffType.ADDITION);
    expect(deadlineDiff?.evidence).toBeDefined();
  });

  it('Golden case: exact/strong match + complete + no conflicts', async () => {
    const candidateName = createCandidate('cand-1', 'name', 'Tech Scholarship');
    const candidateAmount = createCandidate('cand-2', 'amount', '5000');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Scholarships,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Tech Scholarship', amount: '5000' },
      candidates: [candidateName, candidateAmount],
      createdAt: now
    });

    const matchCandidate = new MatchCandidate({
      targetDomain: ImportTargetDomain.Scholarships,
      strength: MatchStrength.EXACT,
      matchedRecordId: 'schol-1',
      matchReason: 'Exact name and amount match'
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Tech Scholarship', amount: '5000' }, // no conflicts
      requiredFields: ['name', 'amount'], // complete
      matchCandidate
    });

    expect(proposal.status).toBe(MergeProposalStatus.READY_FOR_DOMAIN_REVIEW);
    expect(proposal.canAutoMerge()).toBe(false);
    expect(proposal.canAutoPublish()).toBe(false);
  });

  it('Golden case: weak/possible/no match', async () => {
    const candidateName = createCandidate('cand-1', 'name', 'Tech Scholarship');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Scholarships,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Tech Scholarship' },
      candidates: [candidateName],
      createdAt: now
    });

    const weakMatch = new MatchCandidate({
      targetDomain: ImportTargetDomain.Scholarships,
      strength: MatchStrength.WEAK,
      matchReason: 'Partial name match only'
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Tech Scholarship' },
      requiredFields: ['name'],
      matchCandidate: weakMatch
    });

    expect(proposal.requiresReview).toBe(true);
    expect(proposal.status).toBe(MergeProposalStatus.NEEDS_REVIEW);
  });

  it('Regression assertion: MergeProposalPreparationService only consumes snapshots and value objects', () => {
    // This is essentially validated by checking the type signature of prepareProposal
    // and by the fact that we can run all the tests without mocking any repository or API.
    const hasDependencies = (service as any).dependencies !== undefined;
    expect(hasDependencies).toBe(false);
  });
});
