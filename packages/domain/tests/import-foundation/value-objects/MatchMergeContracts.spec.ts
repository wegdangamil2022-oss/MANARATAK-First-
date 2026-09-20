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
  FieldDiff,
  CompletenessReport,
  MergeProposal
} from '../../../src';

describe('Domain Handoff, Match, Diff & Merge Proposal Contracts', () => {
  const now = new Date();
  const validConfidence = new ConfidenceScore({ value: 0.9, explanation: 'Rule match' });
  const validEvidence = new FieldEvidence({
    fieldName: 'universityName',
    extractedValue: 'Stanford University',
    sourceId: 'src-abc',
    retrievedAt: now,
    contentHash: 'hash-abc',
    connectorVersion: '1.0.0',
    extractorType: ExtractorType.RULE_BASED,
    schemaVersion: '1.0',
    evidenceSnippet: 'Stanford University website homepage',
    confidenceScore: validConfidence
  });

  const validCandidate = new ExtractionCandidate({
    candidateId: 'cand-1',
    targetFieldName: 'universityName',
    value: 'Stanford University',
    evidence: validEvidence,
    status: ExtractionCandidateStatus.CANDIDATE,
    createdAt: now
  });

  describe('DomainHandoffRequest', () => {
    it('canWriteToDomain() must return false', () => {
      const request = new DomainHandoffRequest({
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        importRecordId: 'rec-123',
        normalizedPayload: { name: 'Stanford University' },
        candidates: [validCandidate],
        createdAt: now
      });

      expect(request.canWriteToDomain()).toBe(false);
    });

    it('rejects candidates without evidence', () => {
      const invalidCandidate = {
        candidateId: 'cand-invalid',
        targetFieldName: 'universityName',
        value: 'Stanford',
        status: ExtractionCandidateStatus.CANDIDATE,
        createdAt: now
      } as any;

      expect(() => new DomainHandoffRequest({
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        importRecordId: 'rec-123',
        normalizedPayload: { name: 'Stanford' },
        candidates: [invalidCandidate],
        createdAt: now
      })).toThrow('All candidates must have evidence');
    });

    it('creates a valid DomainHandoffRequest for valid parameters', () => {
      const request = new DomainHandoffRequest({
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        importRecordId: 'rec-123',
        normalizedPayload: { name: 'Stanford University' },
        candidates: [validCandidate],
        createdAt: now
      });

      expect(request.handoffId).toBe('handoff-1');
      expect(request.targetDomain).toBe(ImportTargetDomain.Universities);
      expect(request.importRecordId).toBe('rec-123');
      expect(request.normalizedPayload).toEqual({ name: 'Stanford University' });
      expect(request.candidates).toHaveLength(1);
    });
  });

  describe('MatchCandidate', () => {
    it('requires matchedRecordId or deterministicKey for EXACT or STRONG match strength', () => {
      expect(() => new MatchCandidate({
        targetDomain: ImportTargetDomain.Universities,
        strength: MatchStrength.EXACT,
        matchReason: 'Exact match found'
      })).toThrow('matchedRecordId or deterministicKey is required for EXACT or STRONG match strength');

      expect(() => new MatchCandidate({
        targetDomain: ImportTargetDomain.Universities,
        strength: MatchStrength.STRONG,
        matchReason: 'Strong overlap detected'
      })).toThrow('matchedRecordId or deterministicKey is required for EXACT or STRONG match strength');
    });

    it('accepts missing IDs/keys for POSSIBLE, WEAK, or NONE match strength', () => {
      const possibleMatch = new MatchCandidate({
        targetDomain: ImportTargetDomain.Universities,
        strength: MatchStrength.POSSIBLE,
        matchReason: 'Possible name overlap'
      });
      expect(possibleMatch.strength).toBe(MatchStrength.POSSIBLE);
      expect(possibleMatch.matchedRecordId).toBeUndefined();
      expect(possibleMatch.deterministicKey).toBeUndefined();

      const weakMatch = new MatchCandidate({
        targetDomain: ImportTargetDomain.Universities,
        strength: MatchStrength.WEAK,
        matchReason: 'Weak match'
      });
      expect(weakMatch.strength).toBe(MatchStrength.WEAK);

      const noMatch = new MatchCandidate({
        targetDomain: ImportTargetDomain.Universities,
        strength: MatchStrength.NONE,
        matchReason: 'No match'
      });
      expect(noMatch.strength).toBe(MatchStrength.NONE);
    });

    it('creates valid MatchCandidate for EXACT/STRONG when key/ID is provided', () => {
      const exactMatch = new MatchCandidate({
        targetDomain: ImportTargetDomain.Universities,
        strength: MatchStrength.EXACT,
        matchReason: 'Deterministic matched key',
        matchedRecordId: 'univ-123'
      });
      expect(exactMatch.strength).toBe(MatchStrength.EXACT);
      expect(exactMatch.matchedRecordId).toBe('univ-123');

      const strongMatch = new MatchCandidate({
        targetDomain: ImportTargetDomain.Universities,
        strength: MatchStrength.STRONG,
        matchReason: 'Deterministic match key match',
        deterministicKey: 'key-univ-456'
      });
      expect(strongMatch.strength).toBe(MatchStrength.STRONG);
      expect(strongMatch.deterministicKey).toBe('key-univ-456');
    });
  });

  describe('FieldDiff', () => {
    it('requires evidence for ADDITION, MODIFICATION, and CONFLICT diff types', () => {
      expect(() => new FieldDiff({
        fieldName: 'tuitionFee',
        proposedValue: 20000,
        diffType: FieldDiffType.ADDITION
      })).toThrow('evidence is required for ADDITION diff type');

      expect(() => new FieldDiff({
        fieldName: 'tuitionFee',
        currentValue: 15000,
        proposedValue: 20000,
        diffType: FieldDiffType.MODIFICATION
      })).toThrow('evidence is required for MODIFICATION diff type');

      expect(() => new FieldDiff({
        fieldName: 'tuitionFee',
        currentValue: 15000,
        proposedValue: 20000,
        diffType: FieldDiffType.CONFLICT
      })).toThrow('evidence is required for CONFLICT diff type');
    });

    it('does not require evidence for NO_CHANGE or MISSING_IN_IMPORT', () => {
      const noChangeDiff = new FieldDiff({
        fieldName: 'tuitionFee',
        currentValue: 15000,
        proposedValue: 15000,
        diffType: FieldDiffType.NO_CHANGE
      });
      expect(noChangeDiff.diffType).toBe(FieldDiffType.NO_CHANGE);

      const missingDiff = new FieldDiff({
        fieldName: 'tuitionFee',
        currentValue: 15000,
        diffType: FieldDiffType.MISSING_IN_IMPORT
      });
      expect(missingDiff.diffType).toBe(FieldDiffType.MISSING_IN_IMPORT);
    });

    it('canDeleteExistingValue() must return false for MISSING_IN_IMPORT', () => {
      const missingDiff = new FieldDiff({
        fieldName: 'tuitionFee',
        currentValue: 15000,
        diffType: FieldDiffType.MISSING_IN_IMPORT
      });

      expect(missingDiff.canDeleteExistingValue()).toBe(false);
    });
  });

  describe('CompletenessReport', () => {
    it('identifies missing fields consistently and fails if missing fields list is inconsistent', () => {
      expect(() => new CompletenessReport({
        targetDomain: ImportTargetDomain.Universities,
        requiredFields: ['name', 'country', 'website'],
        presentFields: ['name'],
        missingFields: ['country'], // Inconsistent! 'website' is required but not present and not listed in missingFields
        warnings: [],
        isComplete: false
      })).toThrow('CompletenessReport inconsistency: field \'website\' is required and not present, but not listed in missingFields');
    });

    it('creates a valid CompletenessReport when missing fields are consistent', () => {
      const report = new CompletenessReport({
        targetDomain: ImportTargetDomain.Universities,
        requiredFields: ['name', 'country', 'website'],
        presentFields: ['name'],
        missingFields: ['country', 'website'],
        warnings: [],
        isComplete: false
      });

      expect(report.isComplete).toBe(false);
      expect(report.missingFields).toContain('country');
      expect(report.missingFields).toContain('website');
    });
  });

  describe('MergeProposal', () => {
    const validReport = new CompletenessReport({
      targetDomain: ImportTargetDomain.Universities,
      requiredFields: ['name'],
      presentFields: ['name'],
      missingFields: [],
      warnings: [],
      isComplete: true
    });

    const nonConflictDiff = new FieldDiff({
      fieldName: 'name',
      currentValue: 'Stanford University',
      proposedValue: 'Stanford University',
      diffType: FieldDiffType.NO_CHANGE
    });

    const conflictDiff = new FieldDiff({
      fieldName: 'website',
      currentValue: 'stanford.edu',
      proposedValue: 'stanford.org',
      diffType: FieldDiffType.CONFLICT,
      evidence: validEvidence
    });

    it('requires requiresReview to be true when conflicts exist', () => {
      expect(() => new MergeProposal({
        proposalId: 'prop-123',
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        fieldDiffs: [nonConflictDiff, conflictDiff],
        completenessReport: validReport,
        status: MergeProposalStatus.NEEDS_REVIEW,
        requiresReview: false, // Inconsistent with CONFLICT fieldDiff!
        createdAt: now
      })).toThrow('requiresReview must be true if any FieldDiff has a conflict');
    });

    it('canAutoMerge() always returns false', () => {
      const proposal = new MergeProposal({
        proposalId: 'prop-123',
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        fieldDiffs: [nonConflictDiff],
        completenessReport: validReport,
        status: MergeProposalStatus.DRAFT,
        requiresReview: false,
        createdAt: now
      });

      expect(proposal.canAutoMerge()).toBe(false);
    });

    it('canAutoPublish() always returns false', () => {
      const proposal = new MergeProposal({
        proposalId: 'prop-123',
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        fieldDiffs: [nonConflictDiff],
        completenessReport: validReport,
        status: MergeProposalStatus.DRAFT,
        requiresReview: false,
        createdAt: now
      });

      expect(proposal.canAutoPublish()).toBe(false);
    });

    it('hasConflicts() returns true if any FieldDiff has a conflict', () => {
      const proposalWithConflict = new MergeProposal({
        proposalId: 'prop-123',
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        fieldDiffs: [nonConflictDiff, conflictDiff],
        completenessReport: validReport,
        status: MergeProposalStatus.NEEDS_REVIEW,
        requiresReview: true,
        createdAt: now
      });

      expect(proposalWithConflict.hasConflicts()).toBe(true);

      const proposalWithoutConflict = new MergeProposal({
        proposalId: 'prop-123',
        handoffId: 'handoff-1',
        targetDomain: ImportTargetDomain.Universities,
        fieldDiffs: [nonConflictDiff],
        completenessReport: validReport,
        status: MergeProposalStatus.DRAFT,
        requiresReview: false,
        createdAt: now
      });

      expect(proposalWithoutConflict.hasConflicts()).toBe(false);
    });
  });
});
