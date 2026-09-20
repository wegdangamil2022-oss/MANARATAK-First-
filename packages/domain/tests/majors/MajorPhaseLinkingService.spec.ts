import { describe, expect, it } from 'vitest';
import { MajorPhaseLinkingService, MajorStatus, MajorImportCompletenessState, MajorDto } from '../../src';

describe('MajorPhaseLinkingService', () => {
  it('builds downstream phase links from a published major identity and level profile', () => {
    const major: MajorDto = {
      id: 'major-1',
      publicId: 'MJR-0001',
      slug: 'computer-science',
      canonicalName: 'Computer Science',
      canonicalDedupKey: 'computer-science',
      displayName: 'Computer Science',
      degreeLevel: 'Bachelor',
      sourceClassificationSystem: 'MANARATAK',
      academicFieldOrDiscipline: 'Computing',
      collegeOrFaculty: 'College of Computing',
      academicFieldId: 'field-computing',
      disciplineId: 'discipline-computer-science',
      currentPublishedVersionId: 'version-1',
      status: MajorStatus.PUBLISHED,
      completenessStatus: MajorImportCompletenessState.COMPLETE,
    };

    const links = MajorPhaseLinkingService.buildLinks(major);

    expect(links).toEqual(expect.arrayContaining([
      expect.objectContaining({
        targetType: 'TAXONOMY_NODE',
        phase: 8,
        source: 'TAXONOMY_MAPPING',
      }),
      expect.objectContaining({
        targetType: 'ACADEMIC_PROGRAM',
        phase: 11,
        source: 'MAJOR_LEVEL_PROFILE',
      }),
      expect.objectContaining({
        targetType: 'SCHOLARSHIP',
        phase: 12,
        source: 'MAJOR_LEVEL_PROFILE',
      }),
      expect.objectContaining({
        targetType: 'COURSE',
        phase: 13,
        source: 'MAJOR_IDENTITY',
      }),
      expect.objectContaining({
        targetType: 'JOB',
        phase: 21,
        source: 'MAJOR_IDENTITY',
      }),
    ]));
    expect(links.find((link) => link.targetType === 'ACADEMIC_PROGRAM')?.query).toMatchObject({
      majorId: 'major-1',
      majorPublicId: 'MJR-0001',
      majorSlug: 'computer-science',
    });
    expect(links.find((link) => link.targetType === 'ACADEMIC_PROGRAM')?.query).not.toHaveProperty('major');
    expect(links.find((link) => link.targetType === 'ACADEMIC_PROGRAM')?.query).not.toHaveProperty('degreeLevel');
    expect(links.find((link) => link.targetType === 'ACADEMIC_PROGRAM')?.href).toContain('/universities?');
    expect(links.find((link) => link.targetType === 'SCHOLARSHIP')?.href).toContain('/scholarships?');
    expect(links.find((link) => link.targetType === 'COURSE')?.href).toContain('/courses?');
  });
});
