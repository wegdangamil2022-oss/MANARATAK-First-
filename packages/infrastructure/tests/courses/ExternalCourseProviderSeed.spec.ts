import { describe, expect, it } from 'vitest';
import {
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderStatus,
  IMPORTED_COURSE_MASTER_COLUMNS,
  normalizeExternalCourseProviderDomain,
  normalizeExternalCourseProviderName,
} from '@manaratak/domain';
import { EXTERNAL_COURSE_PROVIDER_SEED } from '../../src/courses/ExternalCourseProviderSeed';

describe('WP-IC-02 external course provider seed contract', () => {
  it('defines exactly the 18 reviewed master providers with unique identities', () => {
    expect(EXTERNAL_COURSE_PROVIDER_SEED).toHaveLength(18);
    expect(new Set(EXTERNAL_COURSE_PROVIDER_SEED.map((item) => item.publicId)).size).toBe(18);
    expect(new Set(EXTERNAL_COURSE_PROVIDER_SEED.map((item) => item.slug)).size).toBe(18);
    expect(
      new Set(EXTERNAL_COURSE_PROVIDER_SEED.map((item) => normalizeExternalCourseProviderName(item.canonicalName))).size,
    ).toBe(18);
  });

  it('keeps seed countries unresolved instead of fabricating provider geography', () => {
    for (const item of EXTERNAL_COURSE_PROVIDER_SEED) {
      expect(item.headquartersCountryReferenceId).toBeNull();
      expect(item.status).toBe(ExternalCourseProviderStatus.APPROVED);
      expect(item.importStrategy).toBe(ExternalCourseProviderImportStrategy.FILE);
      expect(item.allowedDomains?.length).toBeGreaterThan(0);
    }
  });

  it('normalizes the approved OpenLearn aliases deterministically', () => {
    const provider = EXTERNAL_COURSE_PROVIDER_SEED[0];
    expect(provider.canonicalName).toBe('The Open University — OpenLearn');
    expect(provider.aliases?.map((item) => normalizeExternalCourseProviderName(item.alias))).toContain('openlearn');
    expect(normalizeExternalCourseProviderName('Open University OpenLearn')).toBe('open university openlearn');
  });

  it('ships the exact 11-column master contract', () => {
    expect(IMPORTED_COURSE_MASTER_COLUMNS).toEqual([
      'No.',
      'Platform / University',
      'Course Name',
      'Direct Course URL',
      'Study Free',
      'Free Certificate',
      'Certificate Type',
      'Language',
      'Study Level',
      'Course Duration',
      'Short Course Topics (4)',
    ]);
  });

  it('normalizes provider domains without weakening them into arbitrary URLs', () => {
    expect(normalizeExternalCourseProviderDomain('https://courses.mooc.fi/path?q=1')).toBe('courses.mooc.fi');
    expect(normalizeExternalCourseProviderDomain('NETACAD.COM')).toBe('netacad.com');
  });

  it('does not treat a shared publishing host as freeCodeCamp provenance', () => {
    const freeCodeCamp = EXTERNAL_COURSE_PROVIDER_SEED.find((item) => item.publicId === 'ecp-freecodecamp');
    expect(freeCodeCamp?.allowedDomains).toEqual(['freecodecamp.org']);
    expect(freeCodeCamp?.allowedDomains).not.toContain('youtube.com');
  });
});
