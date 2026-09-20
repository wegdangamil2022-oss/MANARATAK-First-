import { describe, expect, it } from 'vitest';
import { GOLDEN_ARTICLES } from './data/articleData';
import { INITIAL_SCHOLARSHIPS, MOCK_COUNTRIES, GOLDEN_IMPORTED_COURSES, MOCK_EXAMS, MOCK_MAJORS, MOCK_UNIVERSITIES } from './data/mockData';
import { PUBLIC_SERVICES } from './data/serviceData';
import { STUDENT_TOOLS_PREVIEW } from './data/studentToolsData';
import { buildGlobalSearchDocuments, normalizeSearchText, rankGlobalSearchDocuments } from './globalSearchIndex';

const documents = buildGlobalSearchDocuments({
  scholarships: INITIAL_SCHOLARSHIPS,
  universities: MOCK_UNIVERSITIES,
  majors: MOCK_MAJORS,
  countries: MOCK_COUNTRIES,
  importedCourses: GOLDEN_IMPORTED_COURSES,
  exams: MOCK_EXAMS,
  articles: GOLDEN_ARTICLES,
  services: PUBLIC_SERVICES,
  tools: STUDENT_TOOLS_PREVIEW,
  careers: [],
});

function first(query: string) {
  return rankGlobalSearchDocuments(documents, query)[0];
}

describe('typed public global search', () => {
  it('normalizes Arabic spelling variants without mutating content', () => {
    expect(normalizeSearchText('إختِبار الـآيلتس')).toBe(normalizeSearchText('اختبار الايلتس'));
    expect(normalizeSearchText('جامعة أكسفورد')).toContain('جامعه اكسفورد');
  });

  it('ranks the exact Arabic Oxford university first', () => {
    const result = first('جامعة أكسفورد');
    expect(result.kind).toBe('universities');
    expect(result.category).toBe('الجامعات');
    expect(result.targetId).toBe('oxford');
    expect(result.anchor).toBeUndefined();
    expect(result.matchedBy).toBe('title-exact');
    expect(result.score).toBeGreaterThan(0);
  });

  it('ranks Oxford by its English name before incidental mentions', () => {
    const result = first('Oxford');
    expect(result.kind).toBe('universities');
    expect(result.category).toBe('الجامعات');
    expect(result.targetId).toBe('oxford');
    expect(result.anchor).toBeUndefined();
    expect(result.matchedSection).toBeUndefined();
    expect(result.matchedBy).toBe('alias');
    expect(result.score).toBeGreaterThan(0);
  });

  it('opens the Chinese Government Scholarship entity itself', () => {
    const result = first('منحة الحكومة الصينية');
    expect(result.kind).toBe('scholarships');
    expect(result.category).toBe('المنح');
    expect(result.targetId).toBe('csc-china');
    expect(result.score).toBeGreaterThan(0);
  });

  it('opens Software Engineering as a major, not a category page', () => {
    const result = first('هندسة البرمجيات');
    expect(result.kind).toBe('majors');
    expect(result.category).toBe('التخصصات');
    expect(result.targetId).toBe('mjr-demo-software-engineering');
    expect(result.score).toBeGreaterThan(0);
  });

  it('returns the exact language requirements section anchor', () => {
    const results = rankGlobalSearchDocuments(documents, 'متطلبات اللغة');
    const oxford = results.find((item) => item.kind === 'universities' && item.targetId === 'oxford');
    expect(oxford?.category).toBe('الجامعات');
    expect(oxford?.anchor).toBe('language-requirements');
    expect(oxford?.matchedSection).toBe('متطلبات اللغة');
    expect(oxford?.score).toBeGreaterThan(0);
  });

  it('returns fully funded scholarships at their funding section', () => {
    const results = rankGlobalSearchDocuments(documents, 'التمويل الكامل');
    const csc = results.find((item) => item.kind === 'scholarships' && item.targetId === 'csc-china');
    expect(csc?.category).toBe('المنح');
    expect(csc?.anchor).toBe('scholarship-funding');
    expect(csc?.matchedSection).toBe('المميزات والتمويل');
    expect(csc?.score).toBeGreaterThan(0);
  });
});
