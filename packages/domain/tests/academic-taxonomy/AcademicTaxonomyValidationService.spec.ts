import { describe, it, expect } from 'vitest';
import {
  AcademicTaxonomyValidationService,
} from '../../src/academic-taxonomy/validation';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  AcademicStandardType,
  AcademicTaxonomyValidationSeverity,
} from '../../src/academic-taxonomy/enums';
import { UpsertAcademicTaxonomyNodeDto, AcademicTaxonomyNodeDto } from '../../src/academic-taxonomy/contracts';

describe('AcademicTaxonomyValidationService', () => {
  const service = new AcademicTaxonomyValidationService();

  it('validates a valid minimal node and allows review', () => {
    const validNode: AcademicTaxonomyNodeDto = {
      nodeId: 'node_123',
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      status: AcademicTaxonomyStatus.ACTIVE,
      standardType: AcademicStandardType.CUSTOM_NATIONAL,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const report = service.validateNode(validNode);

    expect(report.isComplete).toBe(true);
    expect(report.canBeReviewed).toBe(true);
    expect(report.missingFields).toHaveLength(0);
    expect(report.requiredFields).toEqual([
      'nodeType',
      'canonicalCode',
      'canonicalName',
      'status',
      'standardType',
    ]);
    expect(report.presentFields).toEqual([
      'nodeType',
      'canonicalCode',
      'canonicalName',
      'status',
      'standardType',
    ]);
    expect(report.deterministicKey).toBe('CUSTOM_NATIONAL:DISCIPLINE:0611');
    expect(report.issues).toHaveLength(0);
  });

  it('defaults status to DRAFT and standardType to CUSTOM_NATIONAL for Upsert DTO', () => {
    const upsertDto: UpsertAcademicTaxonomyNodeDto = {
      nodeType: AcademicTaxonomyNodeType.PROGRAM_AREA,
      canonicalCode: 'pa-201',
      canonicalName: 'Software Engineering',
    };

    const report = service.validateNode(upsertDto);

    expect(report.isComplete).toBe(true);
    expect(report.canBeReviewed).toBe(true);
    expect(report.deterministicKey).toBe('CUSTOM_NATIONAL:PROGRAM_AREA:PA-201');
    expect(report.presentFields).toContain('status');
    expect(report.presentFields).toContain('standardType');
  });

  it('marks isComplete and canBeReviewed as false when canonicalCode is missing', () => {
    const invalidDto = {
      nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
      canonicalCode: '   ',
      canonicalName: 'Education',
    } as UpsertAcademicTaxonomyNodeDto;

    const report = service.validateNode(invalidDto);

    expect(report.isComplete).toBe(false);
    expect(report.canBeReviewed).toBe(false);
    expect(report.missingFields).toContain('canonicalCode');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'canonicalCode',
        code: 'MISSING_CANONICAL_CODE',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('marks isComplete and canBeReviewed as false when canonicalName is missing', () => {
    const invalidDto = {
      nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
      canonicalCode: '01',
      canonicalName: '',
    } as UpsertAcademicTaxonomyNodeDto;

    const report = service.validateNode(invalidDto);

    expect(report.isComplete).toBe(false);
    expect(report.canBeReviewed).toBe(false);
    expect(report.missingFields).toContain('canonicalName');
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'canonicalName',
        code: 'MISSING_CANONICAL_NAME',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('produces ERROR issue when nodeType is invalid', () => {
    const invalidDto = {
      nodeType: 'INVALID_NODE_TYPE' as any,
      canonicalCode: '01',
      canonicalName: 'Test Field',
    };

    const report = service.validateNode(invalidDto);

    expect(report.canBeReviewed).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'nodeType',
        code: 'INVALID_NODE_TYPE',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('produces ERROR issue when status is invalid', () => {
    const invalidDto = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '01',
      canonicalName: 'Test Field',
      status: 'NON_EXISTENT_STATUS' as any,
    };

    const report = service.validateNode(invalidDto);

    expect(report.canBeReviewed).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'status',
        code: 'INVALID_STATUS',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('produces ERROR issue when standardType is invalid', () => {
    const invalidDto = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '01',
      canonicalName: 'Test Field',
      standardType: 'UNKNOWN_STD' as any,
    };

    const report = service.validateNode(invalidDto);

    expect(report.canBeReviewed).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'standardType',
        code: 'INVALID_STANDARD_TYPE',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('produces WARNING when ISCED node is missing standardCode but canBeReviewed remains true', () => {
    const iscedNode: UpsertAcademicTaxonomyNodeDto = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      standardType: AcademicStandardType.ISCED,
    };

    const report = service.validateNode(iscedNode);

    expect(report.isComplete).toBe(true);
    expect(report.canBeReviewed).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'standardCode',
        code: 'MISSING_STANDARD_CODE',
        severity: AcademicTaxonomyValidationSeverity.WARNING,
      })
    );
  });

  it('produces INFO issue when localizedNames lacks ar or en keys', () => {
    const node: UpsertAcademicTaxonomyNodeDto = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      localizedNames: { fr: 'Informatique' },
    };

    const report = service.validateNode(node);

    expect(report.canBeReviewed).toBe(true);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'localizedNames',
        code: 'MISSING_AR_EN_LOCALIZED_NAMES',
        severity: AcademicTaxonomyValidationSeverity.INFO,
      })
    );
  });

  it('produces ERROR and blocks canBeReviewed when metadata contains Phase 10 major keys', () => {
    const node: UpsertAcademicTaxonomyNodeDto = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      metadata: { tuition: 5000, salary: 80000 },
    };

    const report = service.validateNode(node);

    expect(report.canBeReviewed).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'metadata',
        code: 'FORBIDDEN_PHASE_10_METADATA',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('produces ERROR and blocks canBeReviewed when metadata contains raw Phase 06 evidence keys', () => {
    const node: UpsertAcademicTaxonomyNodeDto = {
      nodeType: AcademicTaxonomyNodeType.DISCIPLINE,
      canonicalCode: '0611',
      canonicalName: 'Computer Science',
      metadata: { evidenceSnippet: 'Raw text...', confidenceScore: 0.99 },
    };

    const report = service.validateNode(node);

    expect(report.canBeReviewed).toBe(false);
    expect(report.issues).toContainEqual(
      expect.objectContaining({
        fieldName: 'metadata',
        code: 'FORBIDDEN_PHASE_06_METADATA',
        severity: AcademicTaxonomyValidationSeverity.ERROR,
      })
    );
  });

  it('ensures deterministicKey is stable and uses CUSTOM_NATIONAL default', () => {
    const dto1: UpsertAcademicTaxonomyNodeDto = {
      nodeType: AcademicTaxonomyNodeType.SPECIALIZATION_CATEGORY,
      canonicalCode: 'spec-01',
      canonicalName: 'AI & ML',
    };

    const report1 = service.validateNode(dto1);

    expect(report1.deterministicKey).toBe('CUSTOM_NATIONAL:SPECIALIZATION_CATEGORY:SPEC-01');
  });

  it('includes requiredFields, presentFields, and missingFields in report', () => {
    const dto: UpsertAcademicTaxonomyNodeDto = {
      nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD,
      canonicalCode: '',
      canonicalName: 'Field Name',
    };

    const report = service.validateNode(dto);

    expect(report.requiredFields).toEqual([
      'nodeType',
      'canonicalCode',
      'canonicalName',
      'status',
      'standardType',
    ]);
    expect(report.presentFields).toContain('nodeType');
    expect(report.presentFields).toContain('canonicalName');
    expect(report.presentFields).toContain('status');
    expect(report.presentFields).toContain('standardType');
    expect(report.missingFields).toEqual(['canonicalCode']);
  });
});
