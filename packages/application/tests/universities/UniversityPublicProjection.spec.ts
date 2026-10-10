import { describe, expect, it } from 'vitest';
import {
  UniversityImportCompletenessState,
  UniversityStatus,
  type UniversityDto,
} from '@manaratak/domain';
import { projectPublicUniversity } from '../../src/universities/use-cases/UniversityPublicProjection';

const university = (): UniversityDto => ({
  id: 'private-owner-1',
  publicId: 'INS-KOR-0001',
  slug: 'ins-kor-0001',
  canonicalName: 'Example University',
  canonicalDedupKey: 'private-dedup',
  displayName: 'Example University',
  status: UniversityStatus.PUBLISHED,
  completenessStatus: UniversityImportCompletenessState.COMPLETE,
  countryReferenceId: 'country-1',
  officialSourceUrl: 'https://example.edu',
  sourceImportRecordId: 'private-import',
  metadata: { privateNote: 'SECRET' },
  optionalFields: {
    privateNote: 'SECRET',
    internationalAdmissions: { applicationPortalUrl: 'https://example.edu/apply' },
  },
  accreditations: [
    { name: 'Recognized', organization: 'Authority', officialUrl: 'https://authority.example',
      reviewStatus: 'APPROVED' },
    { name: 'Unverified', organization: 'Claim', officialUrl: 'https://claim.example',
      reviewStatus: 'NEEDS_REVIEW' },
  ],
  campuses: [
    { id: 'campus-1', name: 'Main', status: 'ACTIVE', metadata: { private: 'SECRET' } },
    { id: 'campus-2', name: 'Internal', status: 'INACTIVE' },
  ],
  academicPrograms: [
    {
      id: 'program-1', universityId: 'private-owner-1', sourceProgramName: 'Physics',
      normalizedName: 'physics', degreeLevelId: 'degree-1',
      majorId: 'major-1', major: { status: 'PUBLISHED', levelProfiles: [
        { degreeLevelId: 'degree-1', status: 'PUBLISHED', currentPublishedVersionId: 'version-1' },
      ] },
      majorMappingState: 'CANONICALLY_MAPPED', status: 'ACTIVE',
      campusIds: ['campus-1'],
      admissionRequirements: [
        { id: 'internal-req-1', academicProgramId: 'program-1', internationalTestId: 'test-1',
          internationalTest: { displayName: 'Test', canonicalName: 'Test', slug: 'test', status: 'PUBLISHED' },
          status: 'ACTIVE', minimumScore: 6.5 },
        { id: 'internal-req-2', academicProgramId: 'program-1', internationalTestId: 'test-2',
          internationalTest: { displayName: 'Unpublished', canonicalName: 'Unpublished', slug: 'draft', status: 'READY_TO_REVIEW' },
          status: 'ACTIVE' },
      ],
      metadata: { private: 'SECRET' },
    },
    {
      id: 'program-2', universityId: 'private-owner-1', sourceProgramName: 'Unmapped',
      normalizedName: 'unmapped', majorId: null, majorMappingState: 'UNMAPPED',
      status: 'ACTIVE', campusIds: [], admissionRequirements: [],
    },
  ],
});

describe('University public projection — allowlist and canonical relationships', () => {
  it('excludes internal identity, raw metadata and non-reviewed content', () => {
    const output = projectPublicUniversity(university());
    const json = JSON.stringify(output);
    expect(output.publicId).toBe('INS-KOR-0001');
    expect(json).not.toContain('private-owner-1');
    expect(json).not.toContain('private-dedup');
    expect(json).not.toContain('private-import');
    expect(json).not.toContain('SECRET');
    expect(json).not.toContain('Unverified');
    expect(json).not.toContain('Internal');
    expect(json).not.toContain('Unmapped');
    expect(output.accreditations).toHaveLength(1);
  });

  it('only exposes published-mapped programs and published tests', () => {
    const output = projectPublicUniversity(university());
    expect(output.academicPrograms).toHaveLength(1);
    expect(output.academicPrograms?.[0].sourceProgramName).toBe('Physics');
    expect(output.academicPrograms?.[0].admissionRequirements).toHaveLength(1);
    expect(output.academicPrograms?.[0].admissionRequirements[0].internationalTestId).toBe('test-1');
  });

  it('excludes an unapproved Major even when the program falsely claims a canonical mapping', () => {
    const input = university();
    input.academicPrograms![0].major = { status: 'READY_TO_REVIEW', levelProfiles: [] };
    expect(projectPublicUniversity(input).academicPrograms).toEqual([]);
  });
});
