import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiClient } from '../../api/client';
import {
  loadPublishedScholarships,
  mapPublicScholarshipDto,
  resolvePublicTemplateDataMode,
} from './publicScholarshipDataSource';

describe('public scholarship data source', () => {
  it('does not restore legacy degree or major values after the funded pairs are withdrawn', () => {
    const mapped = mapPublicScholarshipDto({publicId:'withdrawn',slug:'withdrawn',displayName:'Withdrawn',canonicalName:'Withdrawn',fundingCoverage:'',coverageDetails:'',degreeLevel:'Bachelor',eligibleMajorsOrFields:['Legacy medicine'],fundedProgramPairs:[],updatedAt:'2026-10-18T00:00:00.000Z'});
    expect(mapped.degreeLevel).toEqual([]);
    expect(mapped.field).toBe('');
  });
  afterEach(() => vi.restoreAllMocks());

  it('defaults to live API and requires an explicit prototype request', () => {
    expect(resolvePublicTemplateDataMode(undefined)).toBe('api');
    expect(resolvePublicTemplateDataMode('invalid')).toBe('api');
    expect(resolvePublicTemplateDataMode('prototype')).toBe('prototype');
    expect(resolvePublicTemplateDataMode('api')).toBe('api');
  });

  it('maps the canonical public projection without inventing featured state', () => {
    const mapped = mapPublicScholarshipDto(
      {
        publicId: 'scholarship-1',
        slug: 'published-scholarship',
        displayName: 'منحة منشورة',
        canonicalName: 'Published Scholarship',
        fundingCoverage: 'ممولة بالكامل',
        coverageDetails: 'الرسوم، السكن',
        eligibleMajorsOrFields: ['الهندسة', 'الطب'],
        degreeLevel: 'Bachelor, Master',
        studyCountry: 'المملكة المتحدة',
        targetUniversities: ['جامعة أكسفورد', 'جامعة كامبريدج'],
        applicationDeadline: '2027-01-31T00:00:00.000Z',
        applicationLink: 'https://example.edu/apply',
        eligibilityCriteria: 'كشف الدرجات، خطاب الدافع',
        updatedAt: '2026-08-31T00:00:00.000Z',
      },
      new Date('2026-08-31T00:00:00.000Z'),
    );

    expect(mapped.id).toBe('published-scholarship');
    expect(mapped.publicId).toBe('scholarship-1');
    expect(mapped.degreeLevel).toEqual(['بكالوريوس', 'ماجستير']);
    expect(mapped.financialCoverage).toEqual(['الرسوم', 'السكن']);
    expect(mapped.participatingUniversities).toEqual([]);
    expect(mapped.applicationUrl).toBe('https://example.edu/apply');
    expect(mapped.featured).toBe(false);
  });

  it('fails closed instead of returning prototype records when the API is unavailable', async () => {
    vi.spyOn(ApiClient, 'getScholarships').mockRejectedValue(new Error('unavailable'));

    await expect(loadPublishedScholarships()).rejects.toThrow('unavailable');
  });

  it('retains canonical required tests while keeping optional evidence out of the required summary', () => {
    const mapped = mapPublicScholarshipDto({
      publicId: 's', slug: 's', canonicalName: 'S', displayName: 'S', updatedAt: '',
      fundingCoverage: '', coverageDetails: '', degreeLevel: '', eligibleMajorsOrFields: [],
      eligibilityItems: [{ itemKey: 'score', itemTypeCode: 'TEST', internationalTestId: 'toefl', valueText: 'TOEFL 90', isRequired: true }],
      requiredDocumentItems: [
        { documentKey: 'optional', displayName: 'Optional IELTS', internationalTestId: 'ielts', isRequired: false },
        { documentKey: 'certificate', displayName: 'TOEFL certificate', internationalTestId: 'toefl' },
        { documentKey: 'unresolved', displayName: 'Some test label' },
      ],
    });
    expect(mapped.requiredExams?.map(item => item.id)).toEqual(['toefl']);
    expect(mapped.publishedData?.requiredDocumentItems).toHaveLength(3);
  });
});
