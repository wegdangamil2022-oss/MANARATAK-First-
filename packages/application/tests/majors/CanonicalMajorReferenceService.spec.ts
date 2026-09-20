import { describe, expect, it, vi } from 'vitest';
import {
  AcademicTaxonomyNodeType,
  AcademicTaxonomyStatus,
  DegreeLevelStatus,
  IAcademicTaxonomyRepository,
  IDegreeLevelRepository,
  MajorImportCompletenessState,
  MajorStatus,
} from '@manaratak/domain';
import { CanonicalMajorReferenceService } from '../../src/majors/services/CanonicalMajorReferenceService';

const date = new Date('2026-08-25T00:00:00.000Z');

function createService() {
  const taxonomy = {
    listNodes: vi.fn().mockResolvedValue([
      { nodeId: 'field-06', nodeType: AcademicTaxonomyNodeType.ACADEMIC_FIELD, canonicalCode: '06', canonicalName: 'ICT', status: AcademicTaxonomyStatus.ACTIVE, createdAt: date, updatedAt: date },
      { nodeId: 'discipline-061', nodeType: AcademicTaxonomyNodeType.DISCIPLINE, canonicalCode: '061', canonicalName: 'ICT', status: AcademicTaxonomyStatus.ACTIVE, createdAt: date, updatedAt: date },
    ]),
    getNode: vi.fn(),
  } as unknown as IAcademicTaxonomyRepository;
  const degrees = {
    getDegreeLevelById: vi.fn().mockResolvedValue({ id: 'degree-bachelor', canonicalCode: 'BACHELOR', nameEn: 'Bachelor', nameAr: 'بكالوريوس', displayRank: 1, status: DegreeLevelStatus.ACTIVE, createdAt: date, updatedAt: date }),
  } as unknown as IDegreeLevelRepository;
  return { service: new CanonicalMajorReferenceService(taxonomy, degrees), taxonomy, degrees };
}

describe('CanonicalMajorReferenceService', () => {
  it('resolves semantic taxonomy matches to active canonical database IDs', async () => {
    const { service } = createService();
    const result = await service.resolve({ canonicalMajorName: 'Computer Science', classificationCode: '061', degreeLevelId: 'degree-bachelor' });
    expect(result.academicFieldId).toBe('field-06');
    expect(result.disciplineId).toBe('discipline-061');
  });

  it('fails closed when an explicit taxonomy reference is missing or inactive', async () => {
    const { service, taxonomy } = createService();
    vi.mocked(taxonomy.getNode).mockResolvedValue(null);
    await expect(service.resolve({ canonicalMajorName: 'Computer Science', academicFieldId: 'missing' }))
      .rejects.toThrow('MAJOR_CANONICAL_TAXONOMY_REFERENCE_NOT_ACTIVE');
  });

  it('reports inactive canonical entities as publication blockers', async () => {
    const { service, taxonomy, degrees } = createService();
    vi.mocked(taxonomy.getNode).mockResolvedValue(null);
    vi.mocked(degrees.getDegreeLevelById).mockResolvedValue(null);
    const issues = await service.publicationIssues({
      id: 'major-1', publicId: 'MJR-1', slug: 'computer-science', canonicalName: 'Computer Science',
      canonicalDedupKey: 'computer-science|computing|unknown', displayName: 'Computer Science',
      status: MajorStatus.READY_TO_PUBLISH, completenessStatus: MajorImportCompletenessState.COMPLETE,
      profiles: [{ id: 'profile-1', level: 'BACHELOR', degreeLevelId: 'degree-bachelor', academicFieldId: 'field-06' }],
    });
    expect(issues.map(issue => issue.code)).toEqual(expect.arrayContaining([
      'MAJOR_CANONICAL_DEGREE_REFERENCE_NOT_ACTIVE',
      'MAJOR_CANONICAL_TAXONOMY_REFERENCE_NOT_ACTIVE',
    ]));
  });
});
