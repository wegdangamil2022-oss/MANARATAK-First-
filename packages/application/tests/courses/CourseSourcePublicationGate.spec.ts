import { describe, expect, it, vi } from 'vitest';
import { CourseAccessType, CourseImportCompletenessState, CourseOriginType, CourseStatus, type CourseDto, type ICourseRepository, type ICourseRelationshipRepository, type IImportedCourseOperationsRepository } from '@manaratak/domain';
import { CoursePublicationService } from '../../src/courses/services/CoursePublicationService';

describe('M10-14 course source publication gate', () => {
  const course = { id: 'course', originType: CourseOriginType.EXTERNAL_LINKED_COURSE, status: CourseStatus.READY_TO_PUBLISH, completenessStatus: CourseImportCompletenessState.COMPLETE, accessType: CourseAccessType.FREE_STUDY_AND_CERTIFICATE, isStudyFree: true, isFreeCertificate: true, learningLanguage: 'English', shortCourseTopicsRaw: 'Computing | Health' } as CourseDto;
  const fixture = () => {
    const source = { learningLanguageRaw: 'English', learningLanguageReferenceId: 'language-en', learningLanguageResolutionState: 'RESOLVED', shortCourseTopicsRaw: 'Computing | Health' };
    const links = [{ reviewState: 'APPROVED', sourceTerm: 'Computing' }, { reviewState: 'APPROVED', sourceTerm: 'Health' }];
    const relationships = { getRelationshipSource: vi.fn().mockResolvedValue(source), listTaxonomyLinks: vi.fn().mockResolvedValue(links), listTaxonomyResolutions: vi.fn().mockResolvedValue([]), listMajorProjections: vi.fn().mockResolvedValue([]), listInternationalTestRelationships: vi.fn().mockResolvedValue([]) };
    const operations = { getImportedCourseById: vi.fn().mockResolvedValue({ sourceVerified: true, linkHealth: 'VERIFIED_DIRECT' }) };
    const repository = { updateStatus: vi.fn() };
    const service = new CoursePublicationService(repository as unknown as ICourseRepository, operations as unknown as IImportedCourseOperationsRepository, undefined, relationships as unknown as ICourseRelationshipRepository);
    return { service, source, links, relationships, operations, repository };
  };
  it('blocks an unresolved second source term despite another approved link', async () => {
    const f = fixture(); f.relationships.listTaxonomyLinks.mockResolvedValue([f.links[0]]);
    f.relationships.listTaxonomyResolutions.mockResolvedValue([{ normalizedTerm: 'Health', status: 'AMBIGUOUS' }]);
    await expect(f.service.publish(course)).rejects.toThrow('COURSE_PUBLICATION_SOURCE_TERM_REVIEW_REQUIRED');
    expect(f.repository.updateStatus).not.toHaveBeenCalled();
    expect(f.operations.getImportedCourseById).not.toHaveBeenCalled();
  });
  it('blocks a proposed language even when a language ID was stored', async () => {
    const f = fixture(); f.source.learningLanguageResolutionState = 'PROPOSED';
    await expect(f.service.assertPublicationReady(course)).rejects.toThrow('COURSE_PUBLICATION_CANONICAL_LANGUAGE_REQUIRED');
  });
  it('blocks raw root topics when the relationship source is missing', async () => {
    const f = fixture(); f.relationships.getRelationshipSource.mockResolvedValue(null); f.relationships.listTaxonomyLinks.mockResolvedValue([]);
    await expect(f.service.assertPublicationReady({ ...course, learningLanguage: undefined })).rejects.toThrow('COURSE_PUBLICATION_SOURCE_TERM_REVIEW_REQUIRED');
  });
  it('accepts reviewed terms and checks official source/link evidence', async () => {
    const f = fixture(); await expect(f.service.assertPublicationReady(course)).resolves.toBeUndefined();
    f.operations.getImportedCourseById.mockResolvedValue({ sourceVerified: true, linkHealth: 'BROKEN' });
    await expect(f.service.assertPublicationReady(course)).rejects.toThrow('IMPORTED_COURSE_DIRECT_LINK_VERIFICATION_REQUIRED:BROKEN');
    f.operations.getImportedCourseById.mockResolvedValue({ sourceVerified: false, linkHealth: 'VERIFIED_DIRECT' });
    await expect(f.service.assertPublicationReady(course)).rejects.toThrow('IMPORTED_COURSE_SOURCE_VERIFICATION_REQUIRED');
  });
  it('honors an explicit rejected term while leaving the remaining approved taxonomy in place', async () => {
    const f = fixture(); f.relationships.listTaxonomyLinks.mockResolvedValue([f.links[0]]);
    f.relationships.listTaxonomyResolutions.mockResolvedValue([{ normalizedTerm: 'Health', status: 'REJECTED' }]);
    await expect(f.service.assertPublicationReady(course)).resolves.toBeUndefined();
  });
  it('fails closed for an imported course without configured relationship evidence', async () => {
    await expect(new CoursePublicationService({} as ICourseRepository).assertPublicationReady(course)).rejects.toThrow('IMPORTED_COURSE_RELATIONSHIP_EVIDENCE_NOT_CONFIGURED');
  });
  it('keeps Native and Paid courses separate from the imported free certificate rule', async () => {
    for (const originType of [CourseOriginType.NATIVE_MANARATAK_COURSE, CourseOriginType.PAID_COURSE]) {
      await expect(new CoursePublicationService({} as ICourseRepository).assertPublicationReady({ ...course, originType, accessType: CourseAccessType.PAID, isStudyFree: false, isFreeCertificate: false })).resolves.toBeUndefined();
    }
    const f = fixture();
    await expect(f.service.assertPublicationReady({ ...course, isFreeCertificate: false })).rejects.toThrow('IMPORTED_COURSE_FREE_STUDY_AND_CERTIFICATE_REQUIRED');
  });
});
