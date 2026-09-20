import { describe, it, expect } from 'vitest';
import {
  ExtractorType,
  FieldValidationStatus,
  ExtractionCandidateStatus,
  FieldValidationResult,
  ConfidenceScore,
  FieldEvidence,
  ExtractionCandidate
} from '../../../src';

describe('Field Evidence & Extraction Candidate Value Objects', () => {
  describe('ConfidenceScore', () => {
    it('rejects values below 0 or above 1', () => {
      expect(() => new ConfidenceScore({ value: -0.1, explanation: 'Valid explanation' }))
        .toThrow('Confidence value must be between 0 and 1 inclusive');

      expect(() => new ConfidenceScore({ value: 1.05, explanation: 'Valid explanation' }))
        .toThrow('Confidence value must be between 0 and 1 inclusive');
    });

    it('requires explanation', () => {
      expect(() => new ConfidenceScore({ value: 0.9, explanation: '' }))
        .toThrow('explanation is required');

      expect(() => new ConfidenceScore({ value: 0.9, explanation: '   ' }))
        .toThrow('explanation is required');
    });

    it('canAutoPublish() always returns false', () => {
      const score = new ConfidenceScore({ value: 1.0, explanation: 'Perfect match' });
      expect(score.canAutoPublish()).toBe(false);
    });

    it('creates a valid ConfidenceScore for valid parameters', () => {
      const score = new ConfidenceScore({ value: 0.85, explanation: 'High probability rule match' });
      expect(score.value).toBe(0.85);
      expect(score.explanation).toBe('High probability rule match');
    });
  });

  describe('FieldValidationResult', () => {
    it('requires ruleId and status', () => {
      expect(() => new FieldValidationResult({ ruleId: '', status: FieldValidationStatus.PASSED }))
        .toThrow('ruleId is required');

      expect(() => new FieldValidationResult({ ruleId: 'rule-1', status: undefined as any }))
        .toThrow('status is required');
    });

    it('creates valid FieldValidationResult', () => {
      const vr = new FieldValidationResult({
        ruleId: 'valid-range-check',
        status: FieldValidationStatus.PASSED,
        message: 'Value within normal limits'
      });
      expect(vr.ruleId).toBe('valid-range-check');
      expect(vr.status).toBe(FieldValidationStatus.PASSED);
      expect(vr.message).toBe('Value within normal limits');
    });
  });

  describe('FieldEvidence', () => {
    const validConfidence = new ConfidenceScore({ value: 0.9, explanation: 'Deterministic' });
    const now = new Date();

    it('requires evidenceSnippet', () => {
      expect(() => new FieldEvidence({
        fieldName: 'tuitionFee',
        extractedValue: 15000,
        sourceId: 'src-1',
        retrievedAt: now,
        contentHash: 'hash123',
        connectorVersion: '1.0.0',
        extractorType: ExtractorType.RULE_BASED,
        schemaVersion: '1.0',
        evidenceSnippet: '',
        confidenceScore: validConfidence
      })).toThrow('evidenceSnippet is required');
    });

    it('rejects evidenceSnippet > 1000 chars', () => {
      const longSnippet = 'a'.repeat(1001);
      expect(() => new FieldEvidence({
        fieldName: 'tuitionFee',
        extractedValue: 15000,
        sourceId: 'src-1',
        retrievedAt: now,
        contentHash: 'hash123',
        connectorVersion: '1.0.0',
        extractorType: ExtractorType.RULE_BASED,
        schemaVersion: '1.0',
        evidenceSnippet: longSnippet,
        confidenceScore: validConfidence
      })).toThrow('evidenceSnippet exceeds maximum length of 1000 characters');
    });

    it('requires modelName and promptVersion for AI_ASSISTED extractorType', () => {
      expect(() => new FieldEvidence({
        fieldName: 'tuitionFee',
        extractedValue: 15000,
        sourceId: 'src-1',
        retrievedAt: now,
        contentHash: 'hash123',
        connectorVersion: '1.0.0',
        extractorType: ExtractorType.AI_ASSISTED,
        schemaVersion: '1.0',
        evidenceSnippet: 'Tuition is $15000',
        confidenceScore: validConfidence
      })).toThrow('modelName is required for AI_ASSISTED extractorType');

      expect(() => new FieldEvidence({
        fieldName: 'tuitionFee',
        extractedValue: 15000,
        sourceId: 'src-1',
        retrievedAt: now,
        contentHash: 'hash123',
        connectorVersion: '1.0.0',
        extractorType: ExtractorType.AI_ASSISTED,
        modelName: 'gemini-1.5-flash',
        schemaVersion: '1.0',
        evidenceSnippet: 'Tuition is $15000',
        confidenceScore: validConfidence
      })).toThrow('promptVersion is required for AI_ASSISTED extractorType');
    });

    it('accepts rule-based evidence without modelName', () => {
      const evidence = new FieldEvidence({
        fieldName: 'tuitionFee',
        extractedValue: 15000,
        sourceId: 'src-1',
        retrievedAt: now,
        contentHash: 'hash123',
        connectorVersion: '1.0.0',
        extractorType: ExtractorType.RULE_BASED,
        schemaVersion: '1.0',
        evidenceSnippet: 'Tuition is $15000',
        confidenceScore: validConfidence
      });

      expect(evidence.extractorType).toBe(ExtractorType.RULE_BASED);
      expect(evidence.modelName).toBeUndefined();
      expect(evidence.promptVersion).toBeUndefined();
    });

    it('rejects obvious sensitive snippet words', () => {
      const sensitiveWords = ['password', 'token', 'secret', 'apiKey'];

      for (const word of sensitiveWords) {
        expect(() => new FieldEvidence({
          fieldName: 'authData',
          extractedValue: 'data',
          sourceId: 'src-1',
          retrievedAt: now,
          contentHash: 'hash123',
          connectorVersion: '1.0.0',
          extractorType: ExtractorType.RULE_BASED,
          schemaVersion: '1.0',
          evidenceSnippet: `User logged in with ${word}=12345`,
          confidenceScore: validConfidence
        })).toThrow('contains sensitive information');
      }
    });

    it('accepts valid AI-assisted evidence', () => {
      const evidence = new FieldEvidence({
        fieldName: 'universityName',
        extractedValue: 'Oxford University',
        sourceId: 'src-1',
        retrievedAt: now,
        contentHash: 'hash123',
        connectorVersion: '1.0.0',
        extractorType: ExtractorType.AI_ASSISTED,
        modelName: 'gemini-1.5-flash',
        promptVersion: 'v1.2',
        schemaVersion: '1.0',
        evidenceSnippet: 'Welcome to Oxford University admissions page',
        confidenceScore: validConfidence
      });

      expect(evidence.modelName).toBe('gemini-1.5-flash');
      expect(evidence.promptVersion).toBe('v1.2');
      expect(evidence.evidenceSnippet).toContain('Oxford University');
    });
  });

  describe('ExtractionCandidate', () => {
    const validConfidence = new ConfidenceScore({ value: 0.9, explanation: 'Rule match' });
    const now = new Date();
    const validEvidence = new FieldEvidence({
      fieldName: 'universityName',
      extractedValue: 'Harvard',
      sourceId: 'src-1',
      retrievedAt: now,
      contentHash: 'hash123',
      connectorVersion: '1.0.0',
      extractorType: ExtractorType.RULE_BASED,
      schemaVersion: '1.0',
      evidenceSnippet: 'Harvard University homepage',
      confidenceScore: validConfidence
    });

    it('requires evidence', () => {
      expect(() => new ExtractionCandidate({
        candidateId: 'cand-1',
        targetFieldName: 'universityName',
        value: 'Harvard',
        evidence: undefined as any,
        status: ExtractionCandidateStatus.CANDIDATE,
        createdAt: now
      })).toThrow('evidence is required');
    });

    it('canPublish() always returns false', () => {
      const candidate = new ExtractionCandidate({
        candidateId: 'cand-1',
        targetFieldName: 'universityName',
        value: 'Harvard',
        evidence: validEvidence,
        status: ExtractionCandidateStatus.ACCEPTED_FOR_STAGING,
        createdAt: now
      });

      expect(candidate.canPublish()).toBe(false);
    });

    it('requiresReview() behavior', () => {
      const candidateStatusCandidate = new ExtractionCandidate({
        candidateId: 'cand-1',
        targetFieldName: 'universityName',
        value: 'Harvard',
        evidence: validEvidence,
        status: ExtractionCandidateStatus.CANDIDATE,
        createdAt: now
      });
      expect(candidateStatusCandidate.requiresReview()).toBe(true);

      const candidateStatusNeedsReview = new ExtractionCandidate({
        candidateId: 'cand-2',
        targetFieldName: 'universityName',
        value: 'Harvard',
        evidence: validEvidence,
        status: ExtractionCandidateStatus.NEEDS_REVIEW,
        createdAt: now
      });
      expect(candidateStatusNeedsReview.requiresReview()).toBe(true);

      const candidateStatusRejected = new ExtractionCandidate({
        candidateId: 'cand-3',
        targetFieldName: 'universityName',
        value: 'Harvard',
        evidence: validEvidence,
        status: ExtractionCandidateStatus.REJECTED,
        createdAt: now
      });
      expect(candidateStatusRejected.requiresReview()).toBe(false);

      const candidateStatusStaging = new ExtractionCandidate({
        candidateId: 'cand-4',
        targetFieldName: 'universityName',
        value: 'Harvard',
        evidence: validEvidence,
        status: ExtractionCandidateStatus.ACCEPTED_FOR_STAGING,
        createdAt: now
      });
      expect(candidateStatusStaging.requiresReview()).toBe(false);
    });
  });
});
