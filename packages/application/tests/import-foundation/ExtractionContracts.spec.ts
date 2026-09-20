import { describe, it, expect } from 'vitest';
import {
  ExtractorType,
  ExtractionCandidateStatus,
  ConfidenceScore,
  FieldEvidence,
  ExtractionCandidate
} from '@manaratak/domain';
import {
  ExtractionSourceContext,
  ExtractFieldsCommand,
  ExtractFieldsResult,
  GoldenDatasetCase,
  IFieldExtractionGateway,
  IExtractionValidationService,
  IGoldenDatasetRunner,
  GoldenDatasetRunResult
} from '../../src';

describe('Extraction Application Contracts & DTOs', () => {
  const sampleContext: ExtractionSourceContext = {
    sourceId: 'src-100',
    sourceUrl: 'https://example.com/admissions',
    retrievedAt: new Date(),
    contentHash: 'abc123hash',
    connectorVersion: '1.0.0',
    schemaVersion: '1.0.0',
    languageHint: 'en',
    metadata: { env: 'test' }
  };

  const sampleEvidence = new FieldEvidence({
    fieldName: 'universityName',
    extractedValue: 'Stanford University',
    sourceId: 'src-100',
    retrievedAt: new Date(),
    contentHash: 'abc123hash',
    connectorVersion: '1.0.0',
    extractorType: ExtractorType.RULE_BASED,
    schemaVersion: '1.0.0',
    evidenceSnippet: 'Welcome to Stanford University',
    confidenceScore: new ConfidenceScore({ value: 0.95, explanation: 'Exact match' })
  });

  const sampleCandidate = new ExtractionCandidate({
    candidateId: 'cand-1',
    targetFieldName: 'universityName',
    value: 'Stanford University',
    evidence: sampleEvidence,
    status: ExtractionCandidateStatus.CANDIDATE,
    createdAt: new Date()
  });

  it('ExtractFieldsCommand and ExtractionSourceContext hold proper references', () => {
    const command: ExtractFieldsCommand = {
      targetSchemaName: 'UniversitySchema',
      sourceText: 'Welcome to Stanford University',
      sourceContext: sampleContext,
      allowedFields: ['universityName', 'tuitionFee'],
      extractorTypeHint: ExtractorType.RULE_BASED
    };

    expect(command.targetSchemaName).toBe('UniversitySchema');
    expect(command.sourceContext.sourceId).toBe('src-100');
    expect(command.allowedFields).toContain('universityName');
    expect(command.extractorTypeHint).toBe(ExtractorType.RULE_BASED);
  });

  it('ExtractFieldsResult returns candidates array and rejected fields, never domain entities', () => {
    const result: ExtractFieldsResult = {
      candidates: [sampleCandidate],
      rejectedFields: [{ fieldName: 'invalidField', reason: 'Not in schema' }],
      warnings: ['Unknown section header']
    };

    expect(result.candidates.length).toBe(1);
    expect(result.candidates[0]).toBeInstanceOf(ExtractionCandidate);
    expect(result.candidates[0].canPublish()).toBe(false);
    expect(result.rejectedFields[0].reason).toBe('Not in schema');
  });

  it('IFieldExtractionGateway contract implementation returns ExtractFieldsResult with candidates', async () => {
    class MockExtractionGateway implements IFieldExtractionGateway {
      async extractFields(command: ExtractFieldsCommand): Promise<ExtractFieldsResult> {
        return {
          candidates: [sampleCandidate],
          rejectedFields: [],
          warnings: []
        };
      }
    }

    const gateway = new MockExtractionGateway();
    const result = await gateway.extractFields({
      targetSchemaName: 'UniversitySchema',
      sourceText: 'Welcome to Stanford University',
      sourceContext: sampleContext,
      allowedFields: ['universityName']
    });

    expect(result.candidates[0].value).toBe('Stanford University');
    expect(result.candidates[0].canPublish()).toBe(false);
  });

  it('IExtractionValidationService contract implementation transforms candidates status without publishing', async () => {
    class MockValidationService implements IExtractionValidationService {
      async validateCandidate(candidate: ExtractionCandidate): Promise<ExtractionCandidate> {
        return new ExtractionCandidate({
          candidateId: candidate.candidateId,
          targetFieldName: candidate.targetFieldName,
          value: candidate.value,
          evidence: candidate.evidence,
          status: ExtractionCandidateStatus.NEEDS_REVIEW,
          createdAt: candidate.createdAt
        });
      }

      async validateCandidates(candidates: ExtractionCandidate[]): Promise<ExtractionCandidate[]> {
        return Promise.all(candidates.map(c => this.validateCandidate(c)));
      }
    }

    const service = new MockValidationService();
    const validated = await service.validateCandidate(sampleCandidate);

    expect(validated.status).toBe(ExtractionCandidateStatus.NEEDS_REVIEW);
    expect(validated.canPublish()).toBe(false);
  });

  it('IGoldenDatasetRunner contract implementation runs test case correctly', async () => {
    const goldenCase: GoldenDatasetCase = {
      caseId: 'case-001',
      targetSchemaName: 'UniversitySchema',
      sourceText: 'Stanford University tuition is $50,000',
      expectedFields: { universityName: 'Stanford University', tuitionFee: 50000 },
      expectedMissingFields: [],
      expectedRejectedReasons: []
    };

    class MockGoldenDatasetRunner implements IGoldenDatasetRunner {
      async runCase(testCase: GoldenDatasetCase): Promise<GoldenDatasetRunResult> {
        return {
          caseId: testCase.caseId,
          passed: true,
          failures: []
        };
      }
    }

    const runner = new MockGoldenDatasetRunner();
    const runResult = await runner.runCase(goldenCase);

    expect(runResult.caseId).toBe('case-001');
    expect(runResult.passed).toBe(true);
    expect(runResult.failures).toEqual([]);
  });
});
