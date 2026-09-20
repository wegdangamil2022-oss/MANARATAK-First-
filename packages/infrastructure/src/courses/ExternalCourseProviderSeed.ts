import {
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderStatus,
  IExternalCourseProviderRepository,
  UpsertExternalCourseProviderSeedInput,
} from '@manaratak/domain';

const verifiedAt = new Date('2026-08-21T00:00:00.000Z');
const seed = (
  input: Omit<UpsertExternalCourseProviderSeedInput, 'status' | 'sourceTrustLevel' | 'importStrategy' | 'lastVerifiedAt'>,
): UpsertExternalCourseProviderSeedInput => ({
  ...input,
  status: ExternalCourseProviderStatus.APPROVED,
  sourceTrustLevel: 'REVIEWED_SEED',
  importStrategy: ExternalCourseProviderImportStrategy.FILE,
  lastVerifiedAt: verifiedAt,
  headquartersCountryReferenceId: null,
});

/**
 * Initial provider inventory verified from the 3,663-row MANARATAK course master.
 * This is seed data, not the permanent universe of supported providers.
 * Domains are restricted to provider-controlled hosts. A shared publishing host
 * is not enough evidence that a course belongs to the named provider.
 */
export const EXTERNAL_COURSE_PROVIDER_SEED: readonly UpsertExternalCourseProviderSeedInput[] = [
  seed({
    publicId: 'ecp-openlearn',
    slug: 'openlearn',
    canonicalName: 'The Open University — OpenLearn',
    displayName: 'The Open University — OpenLearn',
    aliases: [
      { alias: 'OpenLearn', source: 'WP-IC-02 seed' },
      { alias: 'Open University OpenLearn', source: 'WP-IC-02 seed' },
    ],
    allowedDomains: ['open.edu'],
  }),
  seed({
    publicId: 'ecp-freecodecamp',
    slug: 'freecodecamp',
    canonicalName: 'freeCodeCamp',
    displayName: 'freeCodeCamp',
    allowedDomains: ['freecodecamp.org'],
  }),
  seed({
    publicId: 'ecp-fao-elearning-academy',
    slug: 'fao-elearning-academy',
    canonicalName: 'FAO eLearning Academy',
    displayName: 'FAO eLearning Academy',
    allowedDomains: ['elearning.fao.org'],
  }),
  seed({
    publicId: 'ecp-ibm-skillsbuild',
    slug: 'ibm-skillsbuild',
    canonicalName: 'IBM SkillsBuild',
    displayName: 'IBM SkillsBuild',
    allowedDomains: ['skills.yourlearning.ibm.com', 'ibm.biz', 'skillsbuild.org'],
  }),
  seed({
    publicId: 'ecp-hubspot-academy',
    slug: 'hubspot-academy',
    canonicalName: 'HubSpot Academy',
    displayName: 'HubSpot Academy',
    allowedDomains: ['academy.hubspot.com', 'academy.hubspot.fr', 'academy.hubspot.de', 'academy.hubspot.jp'],
  }),
  seed({
    publicId: 'ecp-saylor-university',
    slug: 'saylor-university',
    canonicalName: 'Saylor University',
    displayName: 'Saylor University',
    allowedDomains: ['learn.saylor.org'],
  }),
  seed({
    publicId: 'ecp-nextgenu',
    slug: 'nextgenu',
    canonicalName: 'NextGenU',
    displayName: 'NextGenU',
    allowedDomains: ['courses.nextgenu.org'],
  }),
  seed({
    publicId: 'ecp-openhpi',
    slug: 'openhpi',
    canonicalName: 'openHPI — Hasso Plattner Institute',
    displayName: 'openHPI — Hasso Plattner Institute',
    aliases: [{ alias: 'openHPI', source: 'WP-IC-02 seed' }],
    allowedDomains: ['open.hpi.de'],
  }),
  seed({
    publicId: 'ecp-global-health-learning-center',
    slug: 'global-health-learning-center',
    canonicalName: 'Global Health Learning Center',
    displayName: 'Global Health Learning Center',
    allowedDomains: ['globalhealthlearning.frank-foundation.org'],
  }),
  seed({
    publicId: 'ecp-semrush-academy',
    slug: 'semrush-academy',
    canonicalName: 'Semrush Academy',
    displayName: 'Semrush Academy',
    allowedDomains: [
      'semrush.com', 'es.semrush.com', 'fr.semrush.com', 'de.semrush.com',
      'it.semrush.com', 'pt.semrush.com', 'ja.semrush.com',
    ],
  }),
  seed({
    publicId: 'ecp-cisco-networking-academy',
    slug: 'cisco-networking-academy',
    canonicalName: 'Cisco Networking Academy',
    displayName: 'Cisco Networking Academy',
    allowedDomains: ['netacad.com'],
  }),
  seed({
    publicId: 'ecp-jmooc',
    slug: 'jmooc',
    canonicalName: 'JMOOC',
    displayName: 'JMOOC',
    allowedDomains: ['platjam.jmooc.jp', 'lms.gacco.org'],
  }),
  seed({
    publicId: 'ecp-wipo-academy',
    slug: 'wipo-academy',
    canonicalName: 'WIPO Academy',
    displayName: 'WIPO Academy',
    allowedDomains: ['welc.wipo.int', 'wipo.int'],
  }),
  seed({
    publicId: 'ecp-undp-learning-for-nature',
    slug: 'undp-learning-for-nature',
    canonicalName: 'UNDP Learning for Nature',
    displayName: 'UNDP Learning for Nature',
    aliases: [{ alias: 'Learning for Nature', source: 'WP-IC-02 seed' }],
    allowedDomains: ['learningfornature.org'],
  }),
  seed({
    publicId: 'ecp-hp-life',
    slug: 'hp-life',
    canonicalName: 'HP LIFE',
    displayName: 'HP LIFE',
    allowedDomains: ['life-global.org'],
  }),
  seed({
    publicId: 'ecp-google-skillshop',
    slug: 'google-skillshop',
    canonicalName: 'Google Skillshop',
    displayName: 'Google Skillshop',
    allowedDomains: ['skillshop.docebosaas.com', 'skillshop.exceedlms.com'],
  }),
  seed({
    publicId: 'ecp-university-helsinki-mooc',
    slug: 'university-helsinki-mooc',
    canonicalName: 'University of Helsinki — MOOC.fi',
    displayName: 'University of Helsinki — MOOC.fi',
    aliases: [{ alias: 'MOOC.fi', source: 'WP-IC-02 seed' }],
    allowedDomains: [
      'courses.mooc.fi', 'cybersecuritybase.mooc.fi', 'programming-26.mooc.fi',
      'java-programming.mooc.fi', 'ethics-of-ai.mooc.fi', 'fullstackopen.com',
      'course.elementsofai.com', 'tdd.mooc.fi',
    ],
  }),
  seed({
    publicId: 'ecp-harvard-cs50',
    slug: 'harvard-cs50',
    canonicalName: 'Harvard University — CS50',
    displayName: 'Harvard University — CS50',
    aliases: [{ alias: 'CS50', source: 'WP-IC-02 seed' }],
    allowedDomains: ['cs50.harvard.edu'],
  }),
] as const;

export async function seedExternalCourseProviders(
  repository: IExternalCourseProviderRepository,
) {
  const results = [];
  for (const definition of EXTERNAL_COURSE_PROVIDER_SEED) {
    results.push(await repository.upsertSeedProvider(definition));
  }
  return results;
}
