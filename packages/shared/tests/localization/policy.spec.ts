import { describe, expect, it } from 'vitest';
import {
  TRANSLATION_CONTENT_MODE,
  TRANSLATION_DOMAIN_POLICIES,
  canAuthorDomainTranslations,
  isTranslationContentAuthoringEnabled,
  assertNoTranslationPayloadFields,
  assertTranslationContentAuthoringEnabled,
} from '../../src/localization/policy';

describe('translation infrastructure policy', () => {
  it('keeps the current project cycle infrastructure-only', () => {
    expect(TRANSLATION_CONTENT_MODE).toBe('INFRASTRUCTURE_ONLY');
    expect(isTranslationContentAuthoringEnabled()).toBe(false);
  });

  it('opens owner-authorized course translations only', () => {
    expect(Object.keys(TRANSLATION_DOMAIN_POLICIES).sort()).toEqual([
      'CMS',
      'COURSE',
      'INTERNATIONAL_TEST',
      'MAJOR',
      'REFERENCE_DATA',
      'SCHOLARSHIP',
      'UNIVERSITY',
      'WEBSITE_UI',
    ]);

    for (const [domain, policy] of Object.entries(TRANSLATION_DOMAIN_POLICIES)) {
      expect(policy.canonicalIdentityImmutable).toBe(true);
      expect(policy.supportedLocales).toEqual(['ar', 'en']);
      expect(policy.contentAuthoringAllowed).toBe(domain==='COURSE');
      expect(canAuthorDomainTranslations(domain as keyof typeof TRANSLATION_DOMAIN_POLICIES)).toBe(domain==='COURSE');
      expect(canAuthorDomainTranslations(domain as keyof typeof TRANSLATION_DOMAIN_POLICIES,'INFRASTRUCTURE_ONLY')).toBe(false);
    }
  });


  it('fails closed for direct or embedded translation write payloads', () => {
    expect(() => assertTranslationContentAuthoringEnabled('UNIVERSITY')).toThrow(
      'TRANSLATION_CONTENT_AUTHORING_DISABLED:UNIVERSITY',
    );
    expect(() =>
      assertNoTranslationPayloadFields('COURSE', { displayName: 'Canonical title' }, ['localizedNames', 'titleEn']),
    ).not.toThrow();
    expect(() =>
      assertNoTranslationPayloadFields('SCHOLARSHIP', { localizedNames: { en: 'Deferred' } }, ['localizedNames']),
    ).toThrow('TRANSLATION_CONTENT_AUTHORING_DISABLED:SCHOLARSHIP');
  });

  it('rejects unversioned course translation payloads',()=>{expect(()=>assertNoTranslationPayloadFields('COURSE',{localizedNames:{ar:'عنوان'}},['localizedNames'])).toThrow('TRANSLATION_OWNER_DESCRIPTION_COMMAND_REQUIRED');});

  it('preserves domain ownership and storage boundaries', () => {
    expect(TRANSLATION_DOMAIN_POLICIES.UNIVERSITY.storage).toBe('NORMALIZED');
    expect(TRANSLATION_DOMAIN_POLICIES.SCHOLARSHIP.storage).toBe('COMPATIBILITY_OVERLAY');
    expect(TRANSLATION_DOMAIN_POLICIES.COURSE.storage).toBe('COMPATIBILITY_OVERLAY');
    expect(TRANSLATION_DOMAIN_POLICIES.CMS.storage).toBe('OWNER_WORKSPACE');
    expect(TRANSLATION_DOMAIN_POLICIES.WEBSITE_UI.storage).toBe('SOURCE_DICTIONARY');
  });
});
