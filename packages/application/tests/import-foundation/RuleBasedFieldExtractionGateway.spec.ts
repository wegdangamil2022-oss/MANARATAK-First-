import { describe, it, expect } from 'vitest';
import { ExtractorType, ExtractionCandidateStatus } from '@manaratak/domain';
import {
  RuleBasedFieldExtractionGateway,
  ExtractFieldsCommand,
  ExtractionSourceContext
} from '../../src';

describe('RuleBasedFieldExtractionGateway', () => {
  const gateway = new RuleBasedFieldExtractionGateway();

  const mockContext: ExtractionSourceContext = {
    sourceId: 'src-123',
    sourceUrl: 'https://university.edu/admission',
    retrievedAt: new Date(),
    contentHash: 'hash999',
    connectorVersion: '1.0.0',
    schemaVersion: '1.0.0'
  };

  it('extracts exact values for separators without whitespace or s/\\s artifacts', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName: MIT\nuniversityName - Stanford\nuniversityName = Harvard',
      sourceContext: mockContext,
      allowedFields: ['universityName']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(3);

    expect(result.candidates[0].value).toBe('MIT');
    expect(result.candidates[0].value.startsWith('s')).toBe(false);
    expect(result.candidates[0].value.startsWith('\\s')).toBe(false);

    expect(result.candidates[1].value).toBe('Stanford');
    expect(result.candidates[1].value.startsWith('s')).toBe(false);
    expect(result.candidates[1].value.startsWith('\\s')).toBe(false);

    expect(result.candidates[2].value).toBe('Harvard');
    expect(result.candidates[2].value.startsWith('s')).toBe(false);
    expect(result.candidates[2].value.startsWith('\\s')).toBe(false);
  });

  it('extracts fields formatted as fieldName: value', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName: MIT\ntuitionFee: $50000',
      sourceContext: mockContext,
      allowedFields: ['universityName', 'tuitionFee']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].targetFieldName).toBe('universityName');
    expect(result.candidates[0].value).toBe('MIT');
    expect(result.candidates[1].targetFieldName).toBe('tuitionFee');
    expect(result.candidates[1].value).toBe('$50000');
  });

  it('extracts fields formatted as fieldName - value', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName - Stanford University\napplicationDeadline - 2026-12-01',
      sourceContext: mockContext,
      allowedFields: ['universityName', 'applicationDeadline']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].targetFieldName).toBe('universityName');
    expect(result.candidates[0].value).toBe('Stanford University');
    expect(result.candidates[1].targetFieldName).toBe('applicationDeadline');
    expect(result.candidates[1].value).toBe('2026-12-01');
  });

  it('extracts fields formatted as fieldName = value', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName = Harvard\ncountry = USA',
      sourceContext: mockContext,
      allowedFields: ['universityName', 'country']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(2);
    expect(result.candidates[0].targetFieldName).toBe('universityName');
    expect(result.candidates[0].value).toBe('Harvard');
    expect(result.candidates[1].targetFieldName).toBe('country');
    expect(result.candidates[1].value).toBe('USA');
  });

  it('ignores fields not listed in allowedFields', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName: Oxford\nunrelatedField: IgnoreMe\ncountry: UK',
      sourceContext: mockContext,
      allowedFields: ['universityName']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].targetFieldName).toBe('universityName');
    expect(result.candidates[0].value).toBe('Oxford');
  });

  it('creates FieldEvidence for every candidate with correct properties', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName: Cambridge',
      sourceContext: mockContext,
      allowedFields: ['universityName']
    };

    const result = await gateway.extractFields(command);
    expect(result.candidates.length).toBe(1);

    const cand = result.candidates[0];
    expect(cand.evidence).toBeDefined();
    expect(cand.evidence.fieldName).toBe('universityName');
    expect(cand.evidence.extractedValue).toBe('Cambridge');
    expect(cand.evidence.sourceId).toBe('src-123');
    expect(cand.evidence.extractorType).toBe(ExtractorType.RULE_BASED);
    expect(cand.evidence.evidenceSnippet).toBe('universityName: Cambridge');
    expect(cand.evidence.confidenceScore.value).toBe(0.9);
    expect(cand.evidence.confidenceScore.explanation).toBe('Exact case rule match');
  });

  it('case-insensitive match uses lower confidence score (0.8 vs 0.9)', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'UNIVERSITYNAME: Yale\ntuitionfee: $55000',
      sourceContext: mockContext,
      allowedFields: ['universityName', 'tuitionFee']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(2);

    expect(result.candidates[0].evidence.confidenceScore.value).toBe(0.8);
    expect(result.candidates[0].evidence.confidenceScore.explanation).toBe('Case-insensitive rule match');

    expect(result.candidates[1].evidence.confidenceScore.value).toBe(0.8);
    expect(result.candidates[1].evidence.confidenceScore.explanation).toBe('Case-insensitive rule match');
  });

  it('rejects sensitive snippets, replaces evidenceSnippet with [REDACTED], and does not expose sensitive values', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'AuthSchema',
      sourceText: 'universityName: Oxford\nsecretToken: password123\napiKey: secret_key_abc',
      sourceContext: mockContext,
      allowedFields: ['universityName', 'secretToken', 'apiKey']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].targetFieldName).toBe('universityName');

    expect(result.rejectedFields.length).toBe(2);
    expect(result.rejectedFields[0].reason).toContain('sensitive');
    expect(result.rejectedFields[0].evidenceSnippet).toBe('[REDACTED]');
    expect(result.rejectedFields[0].evidenceSnippet).not.toContain('password');
    expect(result.rejectedFields[0].evidenceSnippet).not.toContain('password123');

    expect(result.rejectedFields[1].reason).toContain('sensitive');
    expect(result.rejectedFields[1].evidenceSnippet).toBe('[REDACTED]');
    expect(result.rejectedFields[1].evidenceSnippet).not.toContain('apiKey');
    expect(result.rejectedFields[1].evidenceSnippet).not.toContain('secret_key_abc');
  });

  it('returns warning when no allowed fields are found', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'someRandomHeader: SomeValue\nanotherHeader - AnotherValue',
      sourceContext: mockContext,
      allowedFields: ['universityName', 'tuitionFee']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(0);
    expect(result.warnings).toContain('No allowed fields found in source text');
  });

  it('guarantees candidate.canPublish() is always false', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName: Princeton',
      sourceContext: mockContext,
      allowedFields: ['universityName']
    };

    const result = await gateway.extractFields(command);

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0].canPublish()).toBe(false);
    expect(result.candidates[0].status).toBe(ExtractionCandidateStatus.CANDIDATE);
  });

  it('does not incorrectly extract value when literal backslash t is present', async () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'universityName:\\tMIT',
      sourceContext: mockContext,
      allowedFields: ['universityName']
    };
    const result = await gateway.extractFields(command);
    if (result.candidates.length > 0) {
      expect(result.candidates[0].value).not.toBe('MIT');
    }
  });
});
