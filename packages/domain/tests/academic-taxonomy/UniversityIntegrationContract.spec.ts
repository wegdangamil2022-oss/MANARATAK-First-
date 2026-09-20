import { describe, it, expect } from 'vitest';
import {
  UniversityIntegrationContract,
  ProgramIntegrationStatus,
  AcademicProgramIntegrationDto,
  UniversityIntegrationPayload
} from '../../src/universities/universities';

describe('Step 8.10 University Integration Contract Tests', () => {
  // A. DegreeLevel canonicalCode is accepted as stable boundary reference
  it('Rule A: accepts valid DegreeLevel canonicalCode as stable boundary reference', () => {
    expect(UniversityIntegrationContract.validateDegreeLevelCode('BACHELOR')).toBe(true);
    expect(UniversityIntegrationContract.validateDegreeLevelCode('MASTER')).toBe(true);
    expect(UniversityIntegrationContract.validateDegreeLevelCode('DOCTORATE')).toBe(true);
    expect(UniversityIntegrationContract.validateDegreeLevelCode('INVALID_CODE')).toBe(false);
  });

  // B. canonical Major reference is preferred over Major text
  it('Rule B: prefers canonical Major reference over Major text for MATCHED status', () => {
    const validProgram: AcademicProgramIntegrationDto = {
      universityRefId: 'uni-manaratak-001',
      sourceProgramName: 'BSc in Software Engineering',
      degreeLevelCanonicalCode: 'BACHELOR',
      majorId: 'maj-cs-001',
      status: ProgramIntegrationStatus.MATCHED
    };

    const invalidProgram: AcademicProgramIntegrationDto = {
      universityRefId: 'uni-manaratak-001',
      sourceProgramName: 'BSc in Software Engineering',
      degreeLevelCanonicalCode: 'BACHELOR',
      status: ProgramIntegrationStatus.MATCHED
      // missing majorId for MATCHED
    };

    expect(UniversityIntegrationContract.validateMajorLinkage(validProgram).valid).toBe(true);
    expect(UniversityIntegrationContract.validateMajorLinkage(invalidProgram).valid).toBe(false);
    expect(UniversityIntegrationContract.validateMajorLinkage(invalidProgram).message).toContain('Canonical Major reference');
  });

  // C. university reference ID is preserved
  it('Rule C: preserves original stable source university reference ID', () => {
    const payload: UniversityIntegrationPayload = {
      universityRefId: 'uni-manaratak-100',
      displayName: 'Manaratak University of Excellence'
    };

    const result = UniversityIntegrationContract.resolveUniversityIdentity(payload, []);
    expect(result.isPreserved).toBe(true);
    expect(result.canonicalId).toBe('uni-manaratak-100');
  });

  // D. repeated same university reference resolves to same canonical identity contract
  it('Rule D: resolves repeated same university reference ID to the same canonical identity', () => {
    const payload: UniversityIntegrationPayload = {
      universityRefId: 'uni-manaratak-200',
      displayName: 'Manaratak Technical University'
    };

    const existingDb = [
      { id: 'uuid-manaratak-200', publicId: 'uni-manaratak-200' }
    ];

    const result = UniversityIntegrationContract.resolveUniversityIdentity(payload, existingDb);
    expect(result.canonicalId).toBe('uuid-manaratak-200');
    expect(result.isPreserved).toBe(true);
  });

  // E. faculty name does not create taxonomy identity
  it('Rule E: ensures faculty name does not create a taxonomy identity', () => {
    const context = UniversityIntegrationContract.processFacultyContext('College of Engineering');
    expect(context.isTaxonomyNode).toBe(false);
    expect(context.isOrganizationalContext).toBe(true);
  });

  // F. unresolved program remains valid
  it('Rule F: ensures unresolved programs remain valid for later review', () => {
    const program: AcademicProgramIntegrationDto = {
      universityRefId: 'uni-manaratak-001',
      sourceProgramName: 'Interdisciplinary Future Tech',
      degreeLevelCanonicalCode: 'BACHELOR',
      status: ProgramIntegrationStatus.UNMAPPED
    };

    const result = UniversityIntegrationContract.handleUnresolvedProgram(program);
    expect(result.isValid).toBe(true);
  });

  // G. no fake Major is automatically created
  it('Rule G: ensures no fake Major is automatically created for unresolved programs', () => {
    const program: AcademicProgramIntegrationDto = {
      universityRefId: 'uni-manaratak-001',
      sourceProgramName: 'Unknown Specialization X',
      degreeLevelCanonicalCode: 'MASTER',
      status: ProgramIntegrationStatus.MAJOR_REVIEW_REQUIRED
    };

    const result = UniversityIntegrationContract.handleUnresolvedProgram(program);
    expect(result.createdFakeMajor).toBe(false);
  });

  // H. no fake taxonomy node is automatically created
  it('Rule H: ensures no fake taxonomy node is automatically created for unresolved programs', () => {
    const program: AcademicProgramIntegrationDto = {
      universityRefId: 'uni-manaratak-001',
      sourceProgramName: 'Unknown Specialization Y',
      degreeLevelCanonicalCode: 'MASTER',
      status: ProgramIntegrationStatus.MAJOR_REVIEW_REQUIRED
    };

    const result = UniversityIntegrationContract.handleUnresolvedProgram(program);
    expect(result.createdFakeTaxonomyNode).toBe(false);
  });

  // I. University integration can represent optional campus/faculty/department
  it('Rule I: ensures optionality of campus, faculty, and department in the hierarchy is respected', () => {
    const minimalProgram: AcademicProgramIntegrationDto = {
      universityRefId: 'uni-manaratak-001',
      sourceProgramName: 'BSc in Chemistry',
      degreeLevelCanonicalCode: 'BACHELOR',
      status: ProgramIntegrationStatus.UNMAPPED
      // facultyName, departmentName, and campusIds omitted
    };

    const flexibility = UniversityIntegrationContract.validateHierarchyFlexibility(minimalProgram);
    expect(flexibility.hasOptionalHierarchy).toBe(true);
  });

  // J. multi-campus requirement is not structurally blocked
  it('Rule J: ensures multi-campus mapping is supported and not structurally blocked', () => {
    const multiCampusProgram: AcademicProgramIntegrationDto = {
      universityRefId: 'uni-manaratak-001',
      sourceProgramName: 'MBA',
      degreeLevelCanonicalCode: 'MASTER',
      campusIds: ['campus-main', 'campus-north', 'campus-south'],
      status: ProgramIntegrationStatus.MATCHED,
      majorId: 'maj-bus-101'
    };

    const flexibility = UniversityIntegrationContract.validateHierarchyFlexibility(multiCampusProgram);
    expect(flexibility.supportsMultiCampus).toBe(true);
    expect(multiCampusProgram.campusIds).toHaveLength(3);
  });
});
