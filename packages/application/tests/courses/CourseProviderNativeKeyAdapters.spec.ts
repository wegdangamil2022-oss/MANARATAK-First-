import { describe, expect, it } from 'vitest';
import {
  ExternalCourseProviderImportStrategy,
  ExternalCourseProviderStatus,
} from '@manaratak/domain';
import { CourseProviderNativeKeyAdapters } from '../../src/courses/services/CourseProviderNativeKeyAdapters';

const provider = {
  id: 'provider-saylor',
  publicId: 'ecp-saylor-university',
  slug: 'saylor-university',
  canonicalName: 'Saylor University',
  normalizedCanonicalName: 'saylor university',
  displayName: 'Saylor University',
  status: ExternalCourseProviderStatus.APPROVED,
  sourceTrustLevel: 'TEST',
  importStrategy: ExternalCourseProviderImportStrategy.FILE,
  allowedDomains: ['learn.saylor.org'],
  aliases: [],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe('CourseProviderNativeKeyAdapters', () => {
  it('uses a stable decoded provider-native ID independent of query order and tracking parameters', () => {
    const adapters = new CourseProviderNativeKeyAdapters();
    const first = adapters.resolve(provider, 'https://learn.saylor.org/course/view.php?id=Course%201&utm_source=mail');
    const second = adapters.resolve(provider, 'https://learn.saylor.org/course/view.php?gclid=click&id=course%201');
    expect(first).toEqual({ key: 'moodle-course:course 1', adapter: 'ecp-saylor-university' });
    expect(second).toEqual(first);
  });

  it('uses an explicit provider-native field in preference to URL structure', () => {
    const result = new CourseProviderNativeKeyAdapters().resolve(
      provider,
      'https://learn.saylor.org/course/view.php?id=1',
      { providerNativeCourseId: 'Stable-ID-42' },
    );
    expect(result).toEqual({ key: 'explicit:stable-id-42', adapter: 'explicit-field:providerNativeCourseId' });
  });
});
