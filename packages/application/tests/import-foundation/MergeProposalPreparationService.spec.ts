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
  MatchCandidate
} from '@manaratak/domain';
import { MergeProposalPreparationService } from '../../src';

describe('MergeProposalPreparationService', () => {
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

  it('creates an ADDITION diff when existing record is missing the field', async () => {
    const candidate = createCandidate('cand-1', 'tuitionFee', '25000');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { tuitionFee: '25000' },
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'MIT' }, // tuitionFee missing in existing
      requiredFields: ['tuitionFee']
    });

    const tuitionDiff = proposal.fieldDiffs.find(d => d.fieldName === 'tuitionFee');
    expect(tuitionDiff).toBeDefined();
    expect(tuitionDiff?.diffType).toBe(FieldDiffType.ADDITION);
    expect(tuitionDiff?.proposedValue).toBe('25000');
    expect(tuitionDiff?.evidence).toBeDefined();
  });

  it('creates a NO_CHANGE diff for the same normalized value', async () => {
    const candidate = createCandidate('cand-1', 'name', '  Stanford University  ');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Stanford University' },
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'stanford university' },
      requiredFields: ['name']
    });

    const nameDiff = proposal.fieldDiffs.find(d => d.fieldName === 'name');
    expect(nameDiff).toBeDefined();
    expect(nameDiff?.diffType).toBe(FieldDiffType.NO_CHANGE);
  });

  it('creates a CONFLICT diff for different values', async () => {
    const candidate = createCandidate('cand-1', 'website', 'https://stanford.org');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { website: 'https://stanford.org' },
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { website: 'https://stanford.edu' },
      requiredFields: ['website']
    });

    const websiteDiff = proposal.fieldDiffs.find(d => d.fieldName === 'website');
    expect(websiteDiff).toBeDefined();
    expect(websiteDiff?.diffType).toBe(FieldDiffType.CONFLICT);
    expect(websiteDiff?.currentValue).toBe('https://stanford.edu');
    expect(websiteDiff?.proposedValue).toBe('https://stanford.org');
  });

  it('creates a MISSING_IN_IMPORT diff for missing required fields', async () => {
    const candidate = createCandidate('cand-1', 'name', 'Harvard University');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Harvard University' },
      candidates: [candidate], // country missing from candidates
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Harvard University', country: 'United States' },
      requiredFields: ['name', 'country']
    });

    const countryDiff = proposal.fieldDiffs.find(d => d.fieldName === 'country');
    expect(countryDiff).toBeDefined();
    expect(countryDiff?.diffType).toBe(FieldDiffType.MISSING_IN_IMPORT);
    expect(countryDiff?.currentValue).toBe('United States');
  });

  it('ensures missing import does not delete existing values', async () => {
    const candidate = createCandidate('cand-1', 'name', 'Harvard');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Harvard' },
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Harvard', country: 'United States' },
      requiredFields: ['name']
    });

    const countryDiff = proposal.fieldDiffs.find(d => d.fieldName === 'country');
    expect(countryDiff).toBeDefined();
    expect(countryDiff?.diffType).toBe(FieldDiffType.MISSING_IN_IMPORT);
    expect(countryDiff?.canDeleteExistingValue()).toBe(false);
  });

  it('forces requiresReview = true when a CONFLICT exists', async () => {
    const candidate = createCandidate('cand-1', 'name', 'New Name');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'New Name' },
      candidates: [candidate],
      createdAt: now
    });

    const matchCandidate = new MatchCandidate({
      targetDomain: ImportTargetDomain.Universities,
      strength: MatchStrength.EXACT,
      matchedRecordId: 'univ-1',
      matchReason: 'Exact ID match'
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Old Name' },
      requiredFields: ['name'],
      matchCandidate
    });

    expect(proposal.requiresReview).toBe(true);
    expect(proposal.status).toBe(MergeProposalStatus.NEEDS_REVIEW);
  });

  it('forces requiresReview = true when completeness report is incomplete', async () => {
    const candidate = createCandidate('cand-1', 'name', 'Stanford');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Stanford' },
      candidates: [candidate], // missing required field 'country'
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      requiredFields: ['name', 'country']
    });

    expect(proposal.completenessReport.isComplete).toBe(false);
    expect(proposal.requiresReview).toBe(true);
    expect(proposal.status).toBe(MergeProposalStatus.NEEDS_REVIEW);
  });

  it('forces requiresReview = true when matchCandidate strength is POSSIBLE, WEAK, or NONE', async () => {
    const candidate = createCandidate('cand-1', 'name', 'Stanford University');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Stanford University' },
      candidates: [candidate],
      createdAt: now
    });

    const possibleMatch = new MatchCandidate({
      targetDomain: ImportTargetDomain.Universities,
      strength: MatchStrength.POSSIBLE,
      matchReason: 'Possible name overlap'
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Stanford University' },
      requiredFields: ['name'],
      matchCandidate: possibleMatch
    });

    expect(proposal.requiresReview).toBe(true);
    expect(proposal.status).toBe(MergeProposalStatus.NEEDS_REVIEW);
  });

  it('sets status to READY_FOR_DOMAIN_REVIEW when proposal is complete, no conflicts, and exact match', async () => {
    const candidate = createCandidate('cand-1', 'name', 'Stanford University');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Stanford University' },
      candidates: [candidate],
      createdAt: now
    });

    const exactMatch = new MatchCandidate({
      targetDomain: ImportTargetDomain.Universities,
      strength: MatchStrength.EXACT,
      matchedRecordId: 'univ-123',
      matchReason: 'Exact ID match'
    });

    const proposal = await service.prepareProposal({
      handoff,
      existingRecordSnapshot: { name: 'Stanford University' },
      requiredFields: ['name'],
      matchCandidate: exactMatch
    });

    expect(proposal.requiresReview).toBe(false);
    expect(proposal.status).toBe(MergeProposalStatus.READY_FOR_DOMAIN_REVIEW);
  });

  it('guarantees canAutoMerge() and canAutoPublish() are false', async () => {
    const candidate = createCandidate('cand-1', 'name', 'Stanford University');
    const handoff = new DomainHandoffRequest({
      handoffId: 'handoff-1',
      targetDomain: ImportTargetDomain.Universities,
      importRecordId: 'rec-1',
      normalizedPayload: { name: 'Stanford University' },
      candidates: [candidate],
      createdAt: now
    });

    const proposal = await service.prepareProposal({
      handoff,
      requiredFields: ['name']
    });

    expect(proposal.canAutoMerge()).toBe(false);
    expect(proposal.canAutoPublish()).toBe(false);
  });
});
