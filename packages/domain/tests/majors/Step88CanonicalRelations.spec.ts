import { describe, expect, it } from 'vitest';
import {
  MajorDto,
  MajorFilters,
  MajorLevelProfileDto,
  MajorImportCompletenessState,
  MajorStatus,
} from '@manaratak/domain';
import {
  AcademicTaxonomyResolver,
  TaxonomyResolutionOutcome,
} from '../../../application/src/majors/services/AcademicTaxonomyResolver';

describe('Step 8.8 Canonical Relationships & Free-Text Dependency Reduction', () => {
  describe('Centralized Classification Status Logic', () => {
    it('returns EXACT_MATCH when academicFieldId is present', () => {
      const major = {
        academicFieldId: 'some-field-id',
        disciplineId: null,
        optionalFields: {},
      };
      const status = AcademicTaxonomyResolver.getClassificationStatus(major);
      expect(status).toBe(TaxonomyResolutionOutcome.EXACT_MATCH);
    });

    it('returns EXACT_MATCH when disciplineId is present', () => {
      const major = {
        academicFieldId: null,
        disciplineId: 'some-discipline-id',
        optionalFields: {},
      };
      const status = AcademicTaxonomyResolver.getClassificationStatus(major);
      expect(status).toBe(TaxonomyResolutionOutcome.EXACT_MATCH);
    });

    it('returns AMBIGUOUS when explicitly flagged in optional fields', () => {
      const major = {
        academicFieldId: null,
        disciplineId: null,
        optionalFields: {
          taxonomyResolutionOutcome: 'AMBIGUOUS',
        },
      };
      const status = AcademicTaxonomyResolver.getClassificationStatus(major);
      expect(status).toBe(TaxonomyResolutionOutcome.AMBIGUOUS);
    });

    it('returns TRUE_TAXONOMY_GAP when explicitly flagged in optional fields', () => {
      const major = {
        academicFieldId: null,
        disciplineId: null,
        optionalFields: {
          taxonomyResolutionOutcome: 'TRUE_TAXONOMY_GAP',
        },
      };
      const status = AcademicTaxonomyResolver.getClassificationStatus(major);
      expect(status).toBe(TaxonomyResolutionOutcome.TRUE_TAXONOMY_GAP);
    });

    it('returns RESOLVER_GAP when no taxonomy markers exist', () => {
      const major = {
        academicFieldId: null,
        disciplineId: null,
        optionalFields: {},
      };
      const status = AcademicTaxonomyResolver.getClassificationStatus(major);
      expect(status).toBe(TaxonomyResolutionOutcome.RESOLVER_GAP);
    });
  });

  describe('DTO Structure Preservation', () => {
    it('MajorDto can hold full canonical AcademicTaxonomyNode objects alongside IDs', () => {
      const major: MajorDto = {
        id: 'major-1',
        publicId: 'MJR-001',
        slug: 'test-slug',
        canonicalName: 'Test Major',
        canonicalDedupKey: 'test-key',
        displayName: 'Test Major Display',
        status: MajorStatus.IMPORTED,
        completenessStatus: MajorImportCompletenessState.COMPLETE,
        academicFieldId: 'field-123',
        disciplineId: 'discipline-456',
        academicField: {
          nodeId: 'field-123',
          nodeType: 'ACADEMIC_FIELD',
          canonicalCode: '06',
          canonicalName: 'Information and Communication Technologies (ICTs)',
          status: 'PUBLISHED' as any,
          standardType: 'ISCED' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        discipline: {
          nodeId: 'discipline-456',
          nodeType: 'DISCIPLINE',
          canonicalCode: '0613',
          canonicalName: 'Software and applications development and analysis',
          status: 'PUBLISHED' as any,
          standardType: 'ISCED' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(major.academicFieldId).toBe('field-123');
      expect(major.academicField?.nodeId).toBe('field-123');
      expect(major.academicField?.canonicalCode).toBe('06');
      expect(major.discipline?.canonicalCode).toBe('0613');
    });

    it('MajorLevelProfileDto can hold degreeLevelId and full DegreeLevelDto objects', () => {
      const profile: MajorLevelProfileDto = {
        id: 'profile-1',
        level: 'BACHELOR',
        degreeLevelId: 'dl-789',
        degreeLevel: {
          id: 'dl-789',
          canonicalCode: 'BCH',
          nameEn: 'Bachelor',
          nameAr: 'بكالوريوس',
          displayRank: 1,
          status: 'ACTIVE' as any,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      expect(profile.level).toBe('BACHELOR');
      expect(profile.degreeLevelId).toBe('dl-789');
      expect(profile.degreeLevel?.canonicalCode).toBe('BCH');
    });
  });
});
