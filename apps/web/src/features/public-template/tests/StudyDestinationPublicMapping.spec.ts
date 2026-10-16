import { describe, it, expect, vi } from 'vitest';
vi.mock('@manaratak/ui', () => ({ mapInternationalTestToExam: vi.fn() }));
import {
  mapCountry,
  loadPublishedCountries,
  searchPublishedCountries,
} from '../publicLiveDataSource';
import { ApiClient } from '../../../api/client';
const dto: any = {
  publicId: 'std-YE',
  slug: 'ye',
  isFeatured: true,
  country: {
    id: 'country',
    iso2Code: 'YE',
    iso3Code: 'YEM',
    name: 'Yemen',
    nameAr: 'اليمن',
    region: 'Asia',
  },
  overviewAr: 'نظرة',
  overviewEn: 'Overview',
  studySystemSummaryAr: 'نظام',
  studySystemSummaryEn: 'System',
  visaSummaryAr: 'تأشيرة',
  visaSummaryEn: 'Visa',
  livingCostTier: 'LOW',
  averageMonthlyLivingCostMin: 100,
  averageMonthlyLivingCostMax: 200,
  livingCostCurrency: { id: 'currency', isoCode: 'EUR' },
  studyLanguages: [{ name: 'English', nameAr: 'الإنجليزية' }],
  admissionHighlightsAr: ['قبول'],
  admissionHighlightsEn: ['Admission'],
  visaRequirementsAr: ['جواز'],
  visaRequirementsEn: ['Passport'],
  costHighlightsAr: [],
  costHighlightsEn: [],
  studentLifeHighlightsAr: [],
  studentLifeHighlightsEn: [],
  officialLinks: [{ labelAr: 'الجهة', labelEn: 'Authority', url: 'https://education.gov.ye' }],
  image: { url: 'https://images.gov.ye/signed' },
  cities: [{ id: 'city', name: 'Sanaa', nameAr: 'صنعاء' }],
  lastReviewedAt: new Date().toISOString(),
  referenceWarnings: [],
};
describe('Live country mapping and bounded discovery', () => {
  it('preserves currency/period, approved imagery, city identities and authored English content', () => {
    const country = mapCountry(dto, 'en');
    expect(country.monthlyLivingCostRange).toEqual({
      min: 100,
      max: 200,
      currencyReferenceId: 'currency',
      currencyCode: 'EUR',
      period: 'MONTH',
    });
    expect(country.monthlyLivingCostLabel).toBe('100–200 EUR');
    expect(country).not.toHaveProperty('averageLivingCostUsd');
    expect(country.cityReferences).toEqual([{ id: 'city', name: 'Sanaa' }]);
    expect(country.imageUrl).toContain('/signed');
    expect(country.description).toBe('Overview');
    expect(country.admissionHighlights).toEqual(['Admission']);
    expect(country.scholarshipsCount).toBeNull();
    expect(mapCountry(dto, 'ar').popularCities).toEqual(['صنعاء']);
  });
  it('loads a single 20-item discovery page and forwards search filters to the owner', async () => {
    const spy = vi
      .spyOn(ApiClient, 'getStudyDestinations')
      .mockResolvedValue({
        data: [dto],
        total: 200,
        page: 1,
        pageSize: 20,
        totalPages: 10,
        hasMore: true,
        nextCursor: null,
      });
    await loadPublishedCountries('en');
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenCalledWith({ page: 1, pageSize: 20 });
    expect(spy).toHaveBeenCalledWith({ page: 1, pageSize: 8, isFeatured: true });
    await searchPublishedCountries({ page: 3, q: 'Yemen', region: 'Asia' }, 'en');
    expect(spy).toHaveBeenLastCalledWith({ page: 3, q: 'Yemen', region: 'Asia', pageSize: 20 });
    spy.mockRestore();
  });
});
