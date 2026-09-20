import { describe, it, expect } from 'vitest';
import { ExtractorType, ExtractionCandidateStatus } from '@manaratak/domain';
import {
  RuleBasedFieldExtractionGateway,
  ExtractFieldsCommand,
  ExtractionSourceContext
} from '../../src';

describe('GoldenDatasetExtraction', () => {
  const gateway = new RuleBasedFieldExtractionGateway();

  const mockContext: ExtractionSourceContext = {
    sourceId: 'src-golden-123',
    sourceUrl: 'https://goldendataset.edu/admissions',
    retrievedAt: new Date('2026-07-30T10:00:00Z'),
    contentHash: 'golden_hash_999_xyz',
    connectorVersion: '2.1.0',
    schemaVersion: '1.2.0'
  };

  it('correctly processes case 1: valid university fields', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'GoldenUniversitySchema',
      sourceText: [
        'universityName: Massachusetts Institute of Technology',
        'tuitionFee - $55,000',
        'applicationDeadline = 2026-12-15'
      ].join('\n'),
      sourceContext: mockContext,
      allowedFields: ['universityName', 'tuitionFee', 'applicationDeadline']
    };

    const result = await gateway.extractFields(command);

    // Assert expected fields are extracted
    expect(result.candidates.length).toBe(3);

    const nameCand = result.candidates.find(c => c.targetFieldName === 'universityName');
    const feeCand = result.candidates.find(c => c.targetFieldName === 'tuitionFee');
    const deadlineCand = result.candidates.find(c => c.targetFieldName === 'applicationDeadline');

    expect(nameCand).toBeDefined();
    expect(nameCand!.value).toBe('Massachusetts Institute of Technology');

    expect(feeCand).toBeDefined();
    expect(feeCand!.value).toBe('$55,000');

    expect(deadlineCand).toBeDefined();
    expect(deadlineCand!.value).toBe('2026-12-15');

    // Assert evidence and confidence properties for every candidate
    for (const candidate of result.candidates) {
      expect(candidate.evidence).toBeDefined();
      const evidence = candidate.evidence;

      // Evidence details must be propagated exactly
      expect(evidence.fieldName).toBe(candidate.targetFieldName);
      expect(evidence.extractedValue).toBe(candidate.value);
      expect(evidence.sourceId).toBe(mockContext.sourceId);
      expect(evidence.contentHash).toBe(mockContext.contentHash);
      expect(evidence.connectorVersion).toBe(mockContext.connectorVersion);
      expect(evidence.schemaVersion).toBe(mockContext.schemaVersion);
      expect(evidence.sourceUrl).toBe(mockContext.sourceUrl);
      expect(evidence.extractorType).toBe(ExtractorType.RULE_BASED);
      expect(evidence.evidenceSnippet).toContain(candidate.targetFieldName);

      // Confidence score checks
      expect(evidence.confidenceScore).toBeDefined();
      expect(typeof evidence.confidenceScore.value).toBe('number');
      expect(evidence.confidenceScore.value).toBeGreaterThan(0);
      expect(evidence.confidenceScore.value).toBeLessThanOrEqual(1.0);
      expect(evidence.confidenceScore.explanation).toBeTruthy();

      // Regression assertions
      expect(candidate.canPublish()).toBe(false);
      expect(candidate.status).toBe(ExtractionCandidateStatus.CANDIDATE);
      expect(evidence.confidenceScore.canAutoPublish()).toBe(false);
    }
  });

  it('correctly processes case 2: missing allowed fields', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'GoldenUniversitySchema',
      sourceText: [
        'unrelatedField: SomeValue',
        'anotherHeader - AnotherValue'
      ].join('\n'),
      sourceContext: mockContext,
      allowedFields: ['universityName', 'tuitionFee']
    };

    const result = await gateway.extractFields(command);

    // Assert candidates are empty or partial
    expect(result.candidates.length).toBe(0);

    // Assert warnings are present
    expect(result.warnings).toBeDefined();
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings).toContain('No allowed fields found in source text');
  });

  it('correctly processes case 3: sensitive source line rejection', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'GoldenAuthSchema',
      sourceText: [
        'universityName: Harvard University',
        'secretToken: super_secret_pass_123',
        'apiKey = api_key_xyz_999'
      ].join('\n'),
      sourceContext: mockContext,
      allowedFields: ['universityName', 'secretToken', 'apiKey']
    };

    const result = await gateway.extractFields(command);

    // Assert sensitive values are not candidates
    const sensitiveCandToken = result.candidates.find(c => c.targetFieldName === 'secretToken');
    const sensitiveCandApiKey = result.candidates.find(c => c.targetFieldName === 'apiKey');
    expect(sensitiveCandToken).toBeUndefined();
    expect(sensitiveCandApiKey).toBeUndefined();

    // Verify only the non-sensitive field became a candidate
    const validCand = result.candidates.find(c => c.targetFieldName === 'universityName');
    expect(validCand).toBeDefined();
    expect(validCand!.value).toBe('Harvard University');

    // Assert rejected fields details
    expect(result.rejectedFields.length).toBe(2);

    for (const rejected of result.rejectedFields) {
      expect(rejected.fieldName).toBeDefined();
      expect(['secretToken', 'apiKey']).toContain(rejected.fieldName);
      expect(rejected.reason).toContain('sensitive');
      expect(rejected.evidenceSnippet).toBe('[REDACTED]');
    }
  });

  it('runs regression assertions across all generated candidates', async () => {
    // Collect candidates from a mixed scenario to run final regression sweep
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'MixedSchema',
      sourceText: [
        'universityName: Stanford University',
        'tuitionFee - $60,000'
      ].join('\n'),
      sourceContext: mockContext,
      allowedFields: ['universityName', 'tuitionFee']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBeGreaterThan(0);

    for (const cand of result.candidates) {
      // 1. no extracted candidate may have missing evidence.
      expect(cand.evidence).toBeDefined();
      expect(cand.evidence).not.toBeNull();

      // 2. no candidate may have confidenceScore.canAutoPublish() true.
      expect(cand.evidence.confidenceScore.canAutoPublish()).toBe(false);
    }
  });
});
